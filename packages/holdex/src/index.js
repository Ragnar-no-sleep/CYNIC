/**
 * @cynic/holdex - HolDex Integration for CYNIC
 *
 * Integrates HolDex K-Score token quality analysis with CYNIC judgments.
 *
 * ## Features
 *
 * - **K-Score Integration**: Fetch and verify token K-Scores from HolDex
 * - **Token Judgments**: Judge tokens using K-Score + CYNIC's Q-Score
 * - **Harmony Constants**: φ-aligned constants shared with HolDex
 * - **E-Score Support**: Track ecosystem participation scores
 *
 * ## Usage
 *
 * ```javascript
 * import { createHolDexClient, judgeToken } from '@cynic/holdex';
 *
 * // Create client
 * const client = createHolDexClient();
 *
 * // Analyze token for judgment
 * const analysis = await client.analyzeForCYNIC(mintAddress);
 *
 * // Or use standalone judgment
 * const judgment = await judgeToken(node, mintAddress);
 * ```
 *
 * ## K-Score Formula
 *
 * ```
 * K = 100 × ∛(D × O × L)
 *
 * Where:
 *   D = Diamond Hands (holder conviction)
 *   O = Organic Growth (natural distribution)
 *   L = Longevity (survival time)
 * ```
 *
 * "φ distrusts φ" - κυνικός
 *
 * @module @cynic/holdex
 */

'use strict';

// Harmony constants and functions
export {
  PHI_POWERS,
  K_SCORE,
  K_SCORE_TIERS,
  E_SCORE_MULTIPLIERS,
  E_SCORE_TIERS,
  E_SCORE_PHI_UNIT,
  MAX_DISCOUNT_CAP,
  FEE_RATIOS,
  REWARD_SPLITS,
  calculateKScore,
  getKScoreTier,
  isHealthyKScore,
  isExceptionalKScore,
  calculateEScoreDiscount,
  getEScoreTier,
  distributeFee,
} from './harmony.js';

// Client
export {
  HolDexClient,
  createHolDexClient,
} from './client.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Token Judgment Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { createHolDexClient } from './client.js';
import { calculateKScore, getKScoreTier, isHealthyKScore } from './harmony.js';

/**
 * Judge a token using HolDex K-Score and CYNIC's Q-Score
 *
 * This combines token quality (K-Score) with content quality (Q-Score)
 * to produce a Final score.
 *
 * @param {Object} node - CYNIC node instance
 * @param {string} mint - Token mint address
 * @param {Object} [options] - Judgment options
 * @param {HolDexClient} [options.client] - Pre-configured HolDex client
 * @param {Object} [options.metadata] - Additional metadata
 * @returns {Promise<Object>} Token judgment result
 */
export async function judgeToken(node, mint, options = {}) {
  const client = options.client || createHolDexClient();

  // Get token analysis from HolDex
  const analysis = await client.analyzeForCYNIC(mint);

  if (!analysis.available) {
    return {
      success: false,
      mint,
      error: analysis.error,
    };
  }

  // Create judgment item
  const item = {
    type: 'token',
    content: analysis.judgmentItem.content,
    sources: ['holdex'],
  };

  // Judge with K-Score context
  const judgment = await node.judge(item, {
    type: 'token',
    source: 'holdex',
    kScore: analysis.kScore.score,
    ...options.metadata,
  });

  return {
    success: true,
    mint,
    token: analysis.token,
    kScore: analysis.kScore,
    judgment: {
      qScore: judgment.qScore,
      finalScore: judgment.finalScore,
      verdict: judgment.finalVerdict || judgment.verdict,
      confidence: judgment.confidence,
      dimensions: judgment.dimensions,
    },
    tier: analysis.kScore.tier,
    healthy: analysis.kScore.healthy,
  };
}

/**
 * Batch judge multiple tokens
 *
 * @param {Object} node - CYNIC node instance
 * @param {string[]} mints - Array of mint addresses
 * @param {Object} [options] - Judgment options
 * @returns {Promise<Map>} Map of mint to judgment
 */
export async function batchJudgeTokens(node, mints, options = {}) {
  const client = options.client || createHolDexClient();
  const results = new Map();

  // Get all analyses
  const analyses = await client.batchAnalyze(mints);

  // Judge each token
  for (const [mint, analysis] of analyses) {
    if (!analysis.available) {
      results.set(mint, {
        success: false,
        mint,
        error: analysis.error,
      });
      continue;
    }

    try {
      const result = await judgeToken(node, mint, { client, ...options });
      results.set(mint, result);
    } catch (err) {
      results.set(mint, {
        success: false,
        mint,
        error: err.message,
      });
    }
  }

  return results;
}

/**
 * Calculate Final score from K-Score and Q-Score
 *
 * Final = 100 × ∛(K × Q × φ⁻¹ × 100)
 *
 * The φ⁻¹ factor ensures the Final score is always bounded and
 * reflects the φ-aligned confidence limit.
 *
 * @param {number} kScore - K-Score (0-100)
 * @param {number} qScore - Q-Score (0-100)
 * @returns {Object} { Final, verdict, limiting }
 */
export function calculateFinalScore(kScore, qScore) {
  // Normalize to 0-1
  const K = Math.min(1, Math.max(0, kScore / 100));
  const Q = Math.min(1, Math.max(0, qScore / 100));

  // Final = 100 × ∛(K × Q × φ⁻¹)
  // φ⁻¹ ≈ 0.618 acts as a dampening factor
  const PHI_INV = 0.618033988749895;
  const Final = 100 * Math.cbrt(K * Q * PHI_INV);

  // Determine limiting factor
  let limiting = 'balanced';
  if (K < Q * 0.8) limiting = 'kScore';
  else if (Q < K * 0.8) limiting = 'qScore';

  // Determine verdict based on Final score
  let verdict;
  if (Final >= 76) verdict = 'HOWL';
  else if (Final >= 61) verdict = 'WAG';
  else if (Final >= 38) verdict = 'GROWL';
  else verdict = 'BARK';

  return {
    Final: Math.round(Final * 100) / 100,
    kScore,
    qScore,
    verdict,
    limiting,
  };
}

/**
 * Validate K-Score components
 *
 * @param {Object} components - { D, O, L }
 * @returns {Object} { valid, errors }
 */
export function validateKScoreComponents(components) {
  const errors = [];

  if (!components || typeof components !== 'object') {
    return { valid: false, errors: ['Components must be an object'] };
  }

  const { D, O, L } = components;

  if (typeof D !== 'number' || D < 0 || D > 1) {
    errors.push('D (Diamond Hands) must be a number between 0 and 1');
  }
  if (typeof O !== 'number' || O < 0 || O > 1) {
    errors.push('O (Organic Growth) must be a number between 0 and 1');
  }
  if (typeof L !== 'number' || L < 0 || L > 1) {
    errors.push('L (Longevity) must be a number between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
    components: errors.length === 0 ? { D, O, L } : null,
  };
}

/**
 * Generate token analysis report
 *
 * @param {Object} analysis - Analysis from client.analyzeForCYNIC()
 * @returns {string} Human-readable report
 */
export function generateTokenReport(analysis) {
  if (!analysis.available) {
    return `Token ${analysis.mint}: Data not available - ${analysis.error}`;
  }

  const { token, kScore } = analysis;
  const { D, O, L } = kScore.components;

  return `
📊 Token Analysis: ${token.symbol || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**K-Score**: ${kScore.score}/100 (${kScore.tier})
Verdict: ${kScore.verdict}
Status: ${kScore.healthy ? '✅ Healthy' : '⚠️ Below threshold'}

**Components**:
- Diamond Hands (D): ${(D * 100).toFixed(1)}%
- Organic Growth (O): ${(O * 100).toFixed(1)}%
- Longevity (L): ${(L * 100).toFixed(1)}%

**Token Info**:
- Name: ${token.name || 'Unknown'}
- Symbol: ${token.symbol || 'UNKNOWN'}
- Holders: ${token.holders?.toLocaleString() || 'N/A'}

Confidence: ${(analysis.confidence * 100).toFixed(1)}% (max φ⁻¹)

*Disclaimer: Max confidence 61.8% - always DYOR*
`.trim();
}

// Re-import for default export
import * as harmony from './harmony.js';
import * as client from './client.js';

export default {
  // Harmony
  PHI_POWERS: harmony.PHI_POWERS,
  K_SCORE: harmony.K_SCORE,
  calculateKScore,
  getKScoreTier,
  isHealthyKScore,

  // Client
  HolDexClient: client.HolDexClient,
  createHolDexClient: client.createHolDexClient,

  // Integration
  judgeToken,
  batchJudgeTokens,
  calculateFinalScore,
  validateKScoreComponents,
  generateTokenReport,
};
