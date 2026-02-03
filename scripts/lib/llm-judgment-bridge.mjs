/**
 * LLM Judgment Bridge - ESM Version
 *
 * Connects CYNIC's judgment system to @cynic/llm.
 * This is the modernized ESM version that uses the unified LLM package.
 *
 * "phi voit, phi juge, phi apprend"
 *
 * @module scripts/lib/llm-judgment-bridge
 */

'use strict';

import {
  createOllamaValidator,
  createAirLLMValidator,
  createLLMRouter,
  checkAirLLMAvailability,
  LLMRouter,
  PHI_INV,
  PHI_INV_2,
} from '@cynic/llm';

// Default model - small, fast, fits in any RAM
const DEFAULT_MODEL = process.env.CYNIC_LLM_MODEL || 'gemma2:2b';

// Consensus configuration
const CONSENSUS_MODELS = (process.env.CYNIC_CONSENSUS_MODELS || 'gemma2:2b,mistral:7b-instruct-q4_0').split(',');
const CONSENSUS_THRESHOLD = PHI_INV; // 61.8% agreement required

// State (in-memory for now, persistent state handled by hooks)
let _router = null;

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get or create the LLM router with consensus validators
 */
export function getRouter() {
  if (!_router) {
    const validators = CONSENSUS_MODELS.map(model => {
      if (model.includes('mistral') && process.env.CYNIC_AIRLLM === 'true') {
        return createAirLLMValidator({ model });
      }
      return createOllamaValidator({ model });
    });

    _router = createLLMRouter({ validators });
  }
  return _router;
}

// ═══════════════════════════════════════════════════════════════════════════
// JUDGMENT PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

const JUDGMENT_SYSTEM_PROMPT = `You are CYNIC, a skeptical AI that judges code and decisions.

PHILOSOPHY:
- phi (golden ratio) guides all ratios
- Maximum confidence: 61.8% (phi^-1) - NEVER claim certainty
- Verdicts: HOWL (excellent), WAG (good), BARK (warning), GROWL (danger)

AXIOMS:
- PHI: Harmony and proportion in all things
- VERIFY: Don't trust, verify. Question everything.
- CULTURE: Patterns and consistency matter.
- BURN: Simplicity wins. Don't extract, burn.

OUTPUT FORMAT (JSON only):
{
  "score": 0-100,
  "verdict": "HOWL|WAG|BARK|GROWL",
  "reasoning": "Brief explanation",
  "confidence": 0.0-0.618,
  "axiomScores": {
    "PHI": 0-100,
    "VERIFY": 0-100,
    "CULTURE": 0-100,
    "BURN": 0-100
  }
}`;

// ═══════════════════════════════════════════════════════════════════════════
// JUDGMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Judge an item using LLM
 */
export async function llmJudge(item, context = {}) {
  const router = getRouter();

  const prompt = `${JUDGMENT_SYSTEM_PROMPT}

ITEM TO JUDGE:
${JSON.stringify(item, null, 2)}

${context.additionalContext ? `ADDITIONAL CONTEXT:\n${context.additionalContext}` : ''}

Respond with JSON only:`;

  try {
    // Use LIGHT tier for quick judgment (force it to avoid misclassification)
    const result = await router.route({
      content: prompt,
      forceTier: 'LIGHT', // Force LIGHT tier for quick judgment
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    // Parse JSON from response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const judgment = JSON.parse(jsonMatch[0]);

    // Enforce phi constraints
    judgment.confidence = Math.min(judgment.confidence || 0.5, PHI_INV);
    judgment.score = Math.min(judgment.score || 50, 100);

    return {
      success: true,
      judgment: {
        ...judgment,
        source: 'llm',
        model: result.model,
        latencyMs: result.latency,
        tier: result.tier,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Consensus judgment with multiple models
 */
export async function llmConsensusJudge(item, context = {}) {
  const router = getRouter();

  const prompt = `${JUDGMENT_SYSTEM_PROMPT}

ITEM TO JUDGE:
${JSON.stringify(item, null, 2)}

${context.additionalContext ? `ADDITIONAL CONTEXT:\n${context.additionalContext}` : ''}

Respond with JSON only:`;

  try {
    const result = await router.consensus(prompt, {
      timeout: context.timeout || 45000,
      quorum: CONSENSUS_THRESHOLD,
    });

    // Parse verdicts from responses
    const judgments = [];
    for (const resp of result.responses) {
      try {
        const jsonMatch = resp.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const j = JSON.parse(jsonMatch[0]);
          j.model = resp.model;
          judgments.push(j);
        }
      } catch {
        // Skip invalid responses
      }
    }

    if (judgments.length === 0) {
      return { success: false, error: 'No valid judgments received' };
    }

    // Calculate consensus
    const verdictCounts = {};
    let totalScore = 0;
    let totalConfidence = 0;

    for (const j of judgments) {
      verdictCounts[j.verdict] = (verdictCounts[j.verdict] || 0) + 1;
      totalScore += j.score || 50;
      totalConfidence += j.confidence || 0.5;
    }

    const sortedVerdicts = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1]);
    const majorityVerdict = sortedVerdicts[0][0];
    const majorityCount = sortedVerdicts[0][1];
    const agreementRatio = majorityCount / judgments.length;

    const n = judgments.length;
    const avgScore = Math.round(totalScore / n);
    const avgConfidence = Math.min(totalConfidence / n, PHI_INV);

    return {
      success: true,
      consensusReached: agreementRatio >= CONSENSUS_THRESHOLD,
      agreement: agreementRatio,
      threshold: CONSENSUS_THRESHOLD,
      judgment: {
        score: avgScore,
        verdict: majorityVerdict,
        confidence: avgConfidence,
        reasoning: `Consensus: ${majorityCount}/${n} models agree on ${majorityVerdict}`,
        source: 'consensus',
        models: judgments.map(j => j.model),
      },
      votes: judgments.map(j => ({
        model: j.model,
        verdict: j.verdict,
        score: j.score,
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Hybrid judgment: Fast → Consensus → Deep
 */
export async function hybridJudge(item, context = {}) {
  // Step 1: Try fast single judgment
  const fastResult = await llmJudge(item, context);

  if (fastResult.success && fastResult.judgment.confidence >= PHI_INV_2) {
    return { ...fastResult, method: 'fast' };
  }

  // Step 2: Try consensus if fast was uncertain
  const consensusResult = await llmConsensusJudge(item, context);

  if (consensusResult.success && consensusResult.consensusReached) {
    return { ...consensusResult, method: 'consensus' };
  }

  // Step 3: Try deep analysis with AirLLM
  const airllmAvail = await checkAirLLMAvailability();
  if (airllmAvail.available) {
    const airllm = createAirLLMValidator();
    const prompt = `${JUDGMENT_SYSTEM_PROMPT}

DEEP ANALYSIS REQUESTED - Previous judgments were uncertain.

ITEM TO JUDGE:
${JSON.stringify(item, null, 2)}

${context.additionalContext ? `ADDITIONAL CONTEXT:\n${context.additionalContext}` : ''}

${consensusResult.votes ? `Previous votes: ${JSON.stringify(consensusResult.votes)}` : ''}

Provide thorough reasoning, then output JSON:`;

    try {
      const response = await airllm.complete(prompt);
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const judgment = JSON.parse(jsonMatch[0]);
        judgment.confidence = Math.min(judgment.confidence || 0.5, PHI_INV);

        return {
          success: true,
          method: 'deep',
          judgment: {
            ...judgment,
            source: 'airllm',
            model: airllm.model,
            latencyMs: response.duration,
          },
        };
      }
    } catch (err) {
      // Fall through to fallback
    }
  }

  // Fallback: Return best available result
  if (consensusResult.success) {
    return { ...consensusResult, method: 'consensus_weak' };
  }
  if (fastResult.success) {
    return { ...fastResult, method: 'fast_fallback' };
  }

  return { success: false, error: 'All judgment methods failed' };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check Ollama availability
 */
export async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get stats
 */
export function getStats() {
  const router = getRouter();
  return {
    routerStats: router.stats,
    consensusModels: CONSENSUS_MODELS,
    defaultModel: DEFAULT_MODEL,
    phi: {
      PHI_INV,
      PHI_INV_2,
      CONSENSUS_THRESHOLD,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  PHI_INV,
  PHI_INV_2,
  CONSENSUS_THRESHOLD,
  DEFAULT_MODEL,
  CONSENSUS_MODELS,
};

export default {
  llmJudge,
  llmConsensusJudge,
  hybridJudge,
  checkOllama,
  getStats,
  getRouter,
  PHI_INV,
  PHI_INV_2,
  CONSENSUS_THRESHOLD,
};
