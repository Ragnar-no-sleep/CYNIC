/**
 * Complexity Classifier
 *
 * Analyzes request complexity to route to the optimal handler tier.
 * Inspired by Claude Flow's ADR-026 intelligent routing.
 *
 * Complexity Tiers (φ-aligned):
 * - Tier 1 (Local):  < φ⁻³ (23.6%) - Simple transforms, lookups
 * - Tier 2 (Light):  < φ⁻¹ (61.8%) - Medium reasoning
 * - Tier 3 (Full):   ≥ φ⁻¹ (61.8%) - Complex analysis
 *
 * "Route to the smallest dog that can do the job" - κυνικός
 *
 * @module @cynic/node/routing/complexity-classifier
 */

'use strict';

import { PHI_INV } from '@cynic/core';

/**
 * φ-aligned thresholds
 */
const PHI_INV_2 = 0.381966011250105; // φ⁻²
const PHI_INV_3 = 0.236067977499790; // φ⁻³

/**
 * Complexity tiers
 */
export const ComplexityTier = Object.freeze({
  LOCAL: 'local',   // Tier 1: Simple, no LLM needed
  LIGHT: 'light',   // Tier 2: Haiku-level
  FULL: 'full',     // Tier 3: Sonnet/Opus-level
});

/**
 * Complexity thresholds (φ-aligned)
 */
export const COMPLEXITY_THRESHOLDS = Object.freeze({
  LOCAL_MAX: PHI_INV_3,  // 0.236 - Below this = local
  LIGHT_MAX: PHI_INV,    // 0.618 - Below this = light
  // Above LIGHT_MAX = full
});

/**
 * Complexity signals and their weights
 */
const COMPLEXITY_SIGNALS = Object.freeze({
  // Content-based signals
  TOKEN_COUNT: {
    weight: 0.15,
    thresholds: { low: 50, medium: 200, high: 500 },
  },
  QUESTION_COUNT: {
    weight: 0.10,
    thresholds: { low: 1, medium: 2, high: 3 },
  },
  NESTED_DEPTH: {
    weight: 0.10,
    thresholds: { low: 1, medium: 2, high: 3 },
  },

  // Task-type signals
  REQUIRES_REASONING: { weight: 0.20, binary: true },
  REQUIRES_JUDGMENT: { weight: 0.15, binary: true },
  REQUIRES_CREATIVITY: { weight: 0.15, binary: true },
  REQUIRES_CONTEXT: { weight: 0.10, binary: true },

  // Domain signals
  IS_CODE_CHANGE: { weight: 0.05, binary: true },
});

/**
 * Simple task patterns (Tier 1 - Local)
 * These can be handled without LLM
 */
const SIMPLE_PATTERNS = [
  // Lookups
  /^(what|where) is the (file|path|location)/i,
  /^(list|show|get) (all )?(files?|dirs?|folders?)/i,
  /^(find|search for) [\w./-]+$/i,

  // Simple transforms
  /^(rename|move) .+ to .+$/i,
  /^(delete|remove) .+$/i,
  /^(create|make) (a )?(file|folder|dir)/i,

  // Status checks
  /^(check|verify|test) (if )?/i,
  /^(is|are|does|do) .+ (exist|running|active)/i,

  // Formatting
  /^(format|lint|prettify)/i,
  /^(add|remove) (import|export)/i,

  // Git simple
  /^git (status|diff|log|branch)/i,
  /^(commit|push|pull)$/i,
];

/**
 * Complex task patterns (Tier 3 - Full)
 * These definitely need full LLM
 */
const COMPLEX_PATTERNS = [
  // Architecture
  /\b(architect|design|plan)\b.*\b(system|feature|module)\b/i,
  /\b(refactor|restructure|reorganize)\b/i,

  // Analysis
  /\b(analyze|evaluate|assess|review)\b/i,
  /\b(explain|understand|clarify)\b.*\b(why|how)\b/i,

  // Multi-step
  /\b(implement|build|create)\b.*\b(feature|system|module)\b/i,
  /\b(migrate|upgrade|convert)\b/i,

  // Reasoning
  /\b(compare|contrast|trade-?off)\b/i,
  /\b(decide|choose|select)\b.*\b(between|which)\b/i,
  /\b(should|would|could)\b.*\b(we|i|you)\b/i,

  // Security
  /\b(security|vulnerability|audit)\b/i,
  /\b(auth|permission|access)\b.*\b(check|review)\b/i,
];

/**
 * Complexity Classifier
 *
 * Analyzes requests to determine optimal routing tier.
 */
export class ComplexityClassifier {
  constructor(options = {}) {
    this.thresholds = { ...COMPLEXITY_THRESHOLDS, ...options.thresholds };
    this.stats = {
      classified: 0,
      byTier: { local: 0, light: 0, full: 0 },
      avgComplexity: 0,
    };
  }

  /**
   * Classify request complexity
   *
   * @param {Object} request - Request to classify
   * @param {string} request.content - Request content/prompt
   * @param {string} [request.type] - Request type hint
   * @param {Object} [request.context] - Additional context
   * @returns {Object} Classification result
   */
  classify(request) {
    const { content, type, context = {} } = request;

    if (!content || typeof content !== 'string') {
      return this._result(0, ComplexityTier.LOCAL, 'empty_request');
    }

    // Quick pattern matching first
    const patternResult = this._checkPatterns(content);
    if (patternResult.confident) {
      // Still need to update stats via _result
      return this._result(patternResult.complexity, patternResult.tier, patternResult.reason);
    }

    // Calculate complexity score from signals
    const signals = this._extractSignals(content, type, context);
    const complexity = this._calculateComplexity(signals);

    // Determine tier
    const tier = this._determineTier(complexity);
    const reason = this._explainComplexity(signals);

    return this._result(complexity, tier, reason, signals);
  }

  /**
   * Quick pattern-based classification
   * @private
   */
  _checkPatterns(content) {
    // Check simple patterns (Tier 1)
    for (const pattern of SIMPLE_PATTERNS) {
      if (pattern.test(content)) {
        return {
          complexity: 0.1,
          tier: ComplexityTier.LOCAL,
          reason: 'simple_pattern_match',
          confident: true,
        };
      }
    }

    // Check complex patterns (Tier 3)
    for (const pattern of COMPLEX_PATTERNS) {
      if (pattern.test(content)) {
        return {
          complexity: 0.75,
          tier: ComplexityTier.FULL,
          reason: 'complex_pattern_match',
          confident: true,
        };
      }
    }

    return { confident: false };
  }

  /**
   * Extract complexity signals from content
   * @private
   */
  _extractSignals(content, type, context) {
    const signals = {};

    // Token count (rough estimate)
    const tokens = content.split(/\s+/).length;
    signals.TOKEN_COUNT = this._normalizeThreshold(
      tokens,
      COMPLEXITY_SIGNALS.TOKEN_COUNT.thresholds
    );

    // Question count
    const questions = (content.match(/\?/g) || []).length;
    signals.QUESTION_COUNT = this._normalizeThreshold(
      questions,
      COMPLEXITY_SIGNALS.QUESTION_COUNT.thresholds
    );

    // Nested structures (code blocks, lists, etc.)
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    const listItems = (content.match(/^[-*]\s/gm) || []).length;
    signals.NESTED_DEPTH = Math.min(1, (codeBlocks + listItems / 5) / 3);

    // Binary signals
    signals.REQUIRES_REASONING = this._detectReasoning(content) ? 1 : 0;
    signals.REQUIRES_JUDGMENT = this._detectJudgment(content) ? 1 : 0;
    signals.REQUIRES_CREATIVITY = this._detectCreativity(content) ? 1 : 0;
    signals.REQUIRES_CONTEXT = this._detectContextNeed(content, context) ? 1 : 0;
    signals.IS_CODE_CHANGE = this._detectCodeChange(content) ? 1 : 0;

    return signals;
  }

  /**
   * Normalize value against thresholds to 0-1 range
   * @private
   */
  _normalizeThreshold(value, thresholds) {
    if (value <= thresholds.low) return 0;
    if (value >= thresholds.high) return 1;
    if (value <= thresholds.medium) {
      return (value - thresholds.low) / (thresholds.medium - thresholds.low) * 0.5;
    }
    return 0.5 + (value - thresholds.medium) / (thresholds.high - thresholds.medium) * 0.5;
  }

  /**
   * Calculate weighted complexity score
   * @private
   */
  _calculateComplexity(signals) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [name, config] of Object.entries(COMPLEXITY_SIGNALS)) {
      const value = signals[name] || 0;
      weightedSum += value * config.weight;
      totalWeight += config.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine tier from complexity score
   * @private
   */
  _determineTier(complexity) {
    if (complexity < this.thresholds.LOCAL_MAX) {
      return ComplexityTier.LOCAL;
    }
    if (complexity < this.thresholds.LIGHT_MAX) {
      return ComplexityTier.LIGHT;
    }
    return ComplexityTier.FULL;
  }

  /**
   * Generate human-readable explanation
   * @private
   */
  _explainComplexity(signals) {
    const factors = [];

    if (signals.REQUIRES_REASONING) factors.push('reasoning');
    if (signals.REQUIRES_JUDGMENT) factors.push('judgment');
    if (signals.REQUIRES_CREATIVITY) factors.push('creativity');
    if (signals.TOKEN_COUNT > 0.5) factors.push('length');
    if (signals.NESTED_DEPTH > 0.5) factors.push('structure');

    if (factors.length === 0) return 'simple_request';
    return factors.join('+');
  }

  /**
   * Create result object and update stats
   * @private
   */
  _result(complexity, tier, reason, signals = null) {
    this.stats.classified++;
    this.stats.byTier[tier]++;
    this.stats.avgComplexity =
      (this.stats.avgComplexity * (this.stats.classified - 1) + complexity) /
      this.stats.classified;

    return {
      complexity,
      tier,
      reason,
      signals,
      thresholds: this.thresholds,
    };
  }

  // Signal detection methods

  _detectReasoning(content) {
    return /\b(why|how|explain|because|therefore|thus|hence|reason)\b/i.test(content);
  }

  _detectJudgment(content) {
    return /\b(judge|evaluate|assess|score|rate|review|quality)\b/i.test(content);
  }

  _detectCreativity(content) {
    return /\b(create|generate|design|invent|suggest|propose|idea)\b/i.test(content);
  }

  _detectContextNeed(content, context) {
    // Needs context if references "this", "the", "that" without antecedent
    const hasReferences = /\b(this|the|that|these|those)\s+\w+/i.test(content);
    const hasContext = context && Object.keys(context).length > 0;
    return hasReferences && !hasContext;
  }

  _detectCodeChange(content) {
    return /\b(edit|modify|change|update|fix|add|remove)\b.*\b(code|file|function|class)\b/i.test(content);
  }

  /**
   * Get classification statistics
   * @returns {Object} Stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      classified: 0,
      byTier: { local: 0, light: 0, full: 0 },
      avgComplexity: 0,
    };
  }
}

/**
 * Create classifier instance
 *
 * @param {Object} [options] - Options
 * @returns {ComplexityClassifier}
 */
export function createComplexityClassifier(options = {}) {
  return new ComplexityClassifier(options);
}

export default {
  ComplexityClassifier,
  createComplexityClassifier,
  ComplexityTier,
  COMPLEXITY_THRESHOLDS,
};
