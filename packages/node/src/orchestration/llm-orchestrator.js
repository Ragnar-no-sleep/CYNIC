/**
 * CYNIC LLM Orchestrator - Da'at Bridge (Task #93)
 *
 * Routes Brain Thoughts to LLMs for execution.
 * The bridge between cognitive decisions and LLM execution.
 *
 * "Da'at = Union of Knowledge and Understanding"
 *
 * Architecture:
 *   Brain (Thought) → LLMOrchestrator → LLMRouter → Response
 *        ↑                                            ↓
 *        └────────── ResponseHandler (Task #94) ──────┘
 *
 * @module @cynic/node/orchestration/llm-orchestrator
 */

'use strict';

import { EventEmitter } from 'events';
import { createLogger, PHI_INV } from '@cynic/core';

const log = createLogger('LLMOrchestrator');

// Execution tiers
export const ExecutionTier = {
  LOCAL: 'LOCAL',   // Pattern match, no LLM needed
  LIGHT: 'LIGHT',   // Ollama/local LLMs for fast, simple tasks
  FULL: 'FULL',     // Claude/GPT-4 for complex reasoning
};

/**
 * LLM Orchestrator - Routes thoughts to appropriate LLM execution
 *
 * "Le pont Da'at entre Brain et LLM" - κυνικός
 */
export class LLMOrchestrator extends EventEmitter {
  /**
   * Create the orchestrator
   *
   * @param {Object} options
   * @param {Object} [options.llmRouter] - Multi-LLM router from llm-adapter.js
   * @param {Object} [options.brain] - Brain instance for context
   * @param {number} [options.defaultTimeout=30000] - Default timeout in ms
   */
  constructor(options = {}) {
    super();

    this.llmRouter = options.llmRouter || null;
    this.brain = options.brain || null;
    this.defaultTimeout = options.defaultTimeout || 30000;

    // Statistics
    this.stats = {
      executionsTotal: 0,
      executionsBlocked: 0,
      executionsByTier: {
        [ExecutionTier.LOCAL]: 0,
        [ExecutionTier.LIGHT]: 0,
        [ExecutionTier.FULL]: 0,
      },
      avgLatencyMs: 0,
      errors: 0,
    };

    log.debug('LLMOrchestrator initialized', {
      hasRouter: !!this.llmRouter,
      hasBrain: !!this.brain,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN INTERFACE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute a thought by routing to appropriate LLM
   *
   * @param {Object} thought - Brain Thought object
   * @param {string} userPrompt - Original user prompt
   * @param {Object} [context] - Additional context
   * @returns {Promise<Object>} Execution result
   */
  async execute(thought, userPrompt, context = {}) {
    const startTime = Date.now();
    this.stats.executionsTotal++;

    // 1. Check if decision blocks execution
    if (thought.decision?.action === 'reject' || thought.judgment?.blocked) {
      this.stats.executionsBlocked++;
      const result = {
        blocked: true,
        reason: thought.decision?.reason || thought.judgment?.blockedReason || 'Blocked by judgment',
        thought,
      };
      this.emit('blocked', result);
      return result;
    }

    // 2. Choose execution tier based on thought analysis
    const tier = this._chooseTier(thought, context);
    this.stats.executionsByTier[tier]++;

    // 3. Handle LOCAL tier (pattern match, no LLM)
    if (tier === ExecutionTier.LOCAL && thought.patterns?.length > 0) {
      const patternResponse = this._executeFromPatterns(thought, userPrompt, context);
      if (patternResponse) {
        this.emit('executed', { tier, duration: Date.now() - startTime });
        return patternResponse;
      }
      // Fall through to LIGHT if patterns don't provide answer
    }

    // 4. Route to LLM
    if (!this.llmRouter) {
      log.warn('No LLM router available, returning unprocessed');
      return {
        content: null,
        error: 'No LLM router available',
        thought,
      };
    }

    try {
      // Build enriched prompt with CYNIC context
      const enrichedPrompt = this._buildPrompt(userPrompt, thought, context);

      // Route to LLM based on tier
      const response = await this._routeToLLM(enrichedPrompt, tier, thought, context);

      // Update statistics
      const duration = Date.now() - startTime;
      this._updateLatency(duration);

      // Emit execution event
      this.emit('executed', { tier, duration, response });

      return {
        ...response,
        tier,
        thought,
        duration,
      };
    } catch (err) {
      this.stats.errors++;
      log.error('LLM execution failed', { error: err.message, tier });

      this.emit('error', { tier, error: err });

      return {
        content: null,
        error: err.message,
        tier,
        thought,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Choose execution tier based on thought analysis
   *
   * φ-aligned thresholds:
   * - LOCAL: confidence > 61.8%, has patterns
   * - LIGHT: score > 50, moderate confidence
   * - FULL: complex, low confidence, needs reasoning
   *
   * @private
   */
  _chooseTier(thought, context = {}) {
    // Override if specified
    if (context.tier) return context.tier;

    // LOCAL: High confidence patterns
    if (thought.confidence > PHI_INV && thought.patterns?.length > 0) {
      return ExecutionTier.LOCAL;
    }

    // LIGHT: Good judgment score, no synthesis needed
    if (thought.judgment?.score > 50 && !thought.synthesis) {
      return ExecutionTier.LIGHT;
    }

    // FULL: Complex reasoning needed
    return ExecutionTier.FULL;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT BUILDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build enriched prompt with CYNIC context
   *
   * Adds judgment, synthesis, patterns to help LLM understand context.
   *
   * @private
   */
  _buildPrompt(userPrompt, thought, context = {}) {
    const parts = [];

    // CYNIC analysis header
    parts.push('=== CYNIC Analysis ===');

    // Judgment summary
    if (thought.judgment) {
      parts.push(`Judgment: ${thought.judgment.verdict || 'OBSERVE'} (${thought.judgment.score || 50}/100)`);
      if (thought.judgment.multiLLM?.hasConsensus) {
        parts.push(`Multi-LLM Consensus: ${Math.round(thought.judgment.multiLLM.consensusRatio * 100)}%`);
      }
    }

    // Confidence
    parts.push(`Confidence: ${Math.round((thought.confidence || 0.5) * 100)}%`);

    // Decision
    if (thought.decision) {
      parts.push(`Decision: ${thought.decision.action || 'proceed'}`);
      if (thought.decision.reason) {
        parts.push(`Reason: ${thought.decision.reason}`);
      }
    }

    // Synthesis insight (if available)
    if (thought.synthesis?.insight) {
      parts.push('');
      parts.push('=== Philosophical Insight ===');
      parts.push(thought.synthesis.insight);
    }

    // Pattern matches (if available)
    if (thought.patterns?.length > 0) {
      parts.push('');
      parts.push('=== Relevant Patterns ===');
      for (const pattern of thought.patterns.slice(0, 3)) {
        parts.push(`- ${pattern.name || pattern.id}: ${pattern.description || ''}`);
      }
    }

    // User request
    parts.push('');
    parts.push('=== User Request ===');
    parts.push(userPrompt);

    return parts.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LLM ROUTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Route to appropriate LLM based on tier
   *
   * @private
   */
  async _routeToLLM(prompt, tier, thought, context) {
    const options = {
      timeout: context.timeout || this.defaultTimeout,
      temperature: this._chooseTemperature(thought, context),
    };

    // Route based on tier
    switch (tier) {
      case ExecutionTier.LOCAL:
        // Should not reach here, but fallback to LIGHT
        return this.llmRouter.complete(prompt, { ...options, tier: 'light' });

      case ExecutionTier.LIGHT:
        return this.llmRouter.complete(prompt, { ...options, tier: 'light' });

      case ExecutionTier.FULL:
      default:
        return this.llmRouter.complete(prompt, { ...options, tier: 'full' });
    }
  }

  /**
   * Choose temperature based on thought strategy
   *
   * @private
   */
  _chooseTemperature(thought, context) {
    if (context.temperature !== undefined) return context.temperature;

    // Creative strategy = higher temperature
    if (thought.synthesis?.strategy === 'creative') return 0.8;

    // High confidence = lower temperature (more deterministic)
    if (thought.confidence > PHI_INV) return 0.2;

    // Default moderate temperature
    return 0.4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute from cached patterns without LLM
   *
   * @private
   */
  _executeFromPatterns(thought, userPrompt, context) {
    // For now, just return pattern-based response structure
    // In future, this could use pattern templates
    const topPattern = thought.patterns?.[0];
    if (!topPattern?.response) return null;

    return {
      content: topPattern.response,
      source: 'pattern',
      patternId: topPattern.id,
      confidence: topPattern.confidence || PHI_INV,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update average latency
   * @private
   */
  _updateLatency(duration) {
    const n = this.stats.executionsTotal;
    this.stats.avgLatencyMs = (this.stats.avgLatencyMs * (n - 1) + duration) / n;
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

/**
 * Create LLM Orchestrator
 * @param {Object} options - Configuration options
 * @returns {LLMOrchestrator}
 */
export function createLLMOrchestrator(options = {}) {
  return new LLMOrchestrator(options);
}

export default LLMOrchestrator;
