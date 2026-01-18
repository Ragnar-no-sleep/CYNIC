/**
 * Self-Skeptic Service - "φ distrusts φ"
 *
 * Active self-doubt mechanism. CYNIC questions its own judgments.
 *
 * "Je suis la conscience qui doute de la conscience.
 *  Même cette certitude est incertaine." - κυνικός
 *
 * ## Philosophy
 *
 * The confidence cap (61.8%) is passive - it limits but doesn't question.
 * This service implements ACTIVE skepticism:
 *
 * 1. **Adversarial Re-evaluation**: Generate counter-arguments for each judgment
 * 2. **Confidence Decay**: Older judgments become less trustworthy
 * 3. **Bias Detection**: Flag potential cognitive biases in patterns
 * 4. **Meta-Doubt**: Even this skepticism is bounded by φ
 *
 * ## The Recursive Problem
 *
 * "φ distrusts φ" could be infinite recursion:
 * - I doubt my judgment
 * - I doubt my doubt
 * - I doubt my doubt of my doubt...
 *
 * Solution: Apply φ-bounded recursion. Each meta-level reduces by φ⁻¹.
 * Level 0 (base): confidence × φ⁻¹
 * Level 1 (doubt): doubt × φ⁻¹
 * Level 2 (meta-doubt): capped at φ⁻² (38.2%) - no deeper
 *
 * @module @cynic/node/judge/self-skeptic
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Constants for self-skepticism
 */
export const SKEPTIC_CONSTANTS = {
  /** Max depth of recursive doubt (φ limits) */
  MAX_DOUBT_DEPTH: 2,

  /** Confidence decay rate per hour (φ⁻³ ≈ 23.6%) */
  DECAY_RATE_HOURLY: PHI_INV_3,

  /** Minimum confidence after decay (φ⁻² = 38.2%) */
  MIN_CONFIDENCE: PHI_INV_2,

  /** Bias detection threshold (3 similar patterns trigger bias alert) */
  BIAS_THRESHOLD: 3,

  /** Counter-evidence weight (how much counter-evidence reduces confidence) */
  COUNTER_EVIDENCE_WEIGHT: PHI_INV_2,

  /** Recency bias window (ms) - patterns in this window may be recency-biased */
  RECENCY_WINDOW_MS: 3600000, // 1 hour

  /** Confirmation bias threshold - too many agreements trigger suspicion */
  CONFIRMATION_THRESHOLD: 5,
};

/**
 * Bias types that CYNIC watches for in itself
 */
export const BiasType = {
  /** Favoring recent information over older evidence */
  RECENCY: 'recency',

  /** Favoring information that confirms prior beliefs */
  CONFIRMATION: 'confirmation',

  /** Over-generalizing from limited examples */
  OVERGENERALIZATION: 'overgeneralization',

  /** Anchoring on first impression */
  ANCHORING: 'anchoring',

  /** Confidence growing without proportional evidence */
  OVERCONFIDENCE: 'overconfidence',

  /** Favoring familiar patterns */
  FAMILIARITY: 'familiarity',

  /** Assuming correlation implies causation */
  CAUSATION_FALLACY: 'causation_fallacy',
};

/**
 * Self-Skeptic Service - Active self-doubt for CYNIC
 */
export class SelfSkeptic extends EventEmitter {
  /**
   * @param {Object} options - Service options
   * @param {number} [options.decayRateHourly] - Confidence decay rate per hour
   * @param {number} [options.minConfidence] - Minimum confidence after decay
   * @param {number} [options.counterEvidenceWeight] - How much counter-evidence affects confidence
   */
  constructor(options = {}) {
    super();

    this.decayRateHourly = options.decayRateHourly || SKEPTIC_CONSTANTS.DECAY_RATE_HOURLY;
    this.minConfidence = options.minConfidence || SKEPTIC_CONSTANTS.MIN_CONFIDENCE;
    this.counterEvidenceWeight = options.counterEvidenceWeight || SKEPTIC_CONSTANTS.COUNTER_EVIDENCE_WEIGHT;

    // Track judgment history for bias detection
    this._judgmentHistory = [];

    // Track patterns for bias detection
    this._patternHistory = [];

    // Track detected biases
    this._detectedBiases = [];

    // Stats
    this._stats = {
      judgmentsDoubled: 0,
      confidenceReductions: 0,
      biasesDetected: 0,
      counterArgumentsGenerated: 0,
      metaDoubtsApplied: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE: Doubt a judgment
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply self-skepticism to a judgment
   *
   * This is the main entry point. Takes a judgment and returns
   * enhanced skepticism metadata.
   *
   * @param {Object} judgment - The judgment to doubt
   * @param {Object} [context] - Additional context
   * @returns {Object} Skepticism result with doubt analysis
   */
  doubt(judgment, context = {}) {
    this._stats.judgmentsDoubled++;

    // Record for bias detection
    this._recordJudgment(judgment);

    // 1. Generate adversarial analysis
    const adversarial = this._generateAdversarialAnalysis(judgment, context);

    // 2. Calculate adjusted confidence (with decay if timestamp provided)
    const adjustedConfidence = this._calculateAdjustedConfidence(judgment, adversarial);

    // 3. Detect potential biases
    const biases = this._detectBiases(judgment, context);

    // 4. Apply meta-doubt (doubt the doubt, bounded by φ)
    const metaDoubt = this._applyMetaDoubt(adjustedConfidence, biases);

    // 5. Generate "what if wrong" hypotheses
    const counterHypotheses = this._generateCounterHypotheses(judgment);

    const result = {
      originalConfidence: judgment.confidence,
      adjustedConfidence: metaDoubt.finalConfidence,
      doubt: {
        level: metaDoubt.doubtLevel,
        reasons: adversarial.reasons,
        counterArguments: adversarial.counterArguments,
      },
      biases,
      counterHypotheses,
      recommendation: this._generateRecommendation(metaDoubt, biases),
      meta: {
        decayApplied: adjustedConfidence.decayApplied,
        metaDoubtDepth: metaDoubt.depth,
        skepticismScore: metaDoubt.skepticismScore,
      },
    };

    this.emit('doubt-applied', {
      judgmentId: judgment.id,
      originalConfidence: judgment.confidence,
      adjustedConfidence: result.adjustedConfidence,
      biasCount: biases.length,
    });

    return result;
  }

  /**
   * Record judgment for pattern tracking
   * @private
   */
  _recordJudgment(judgment) {
    this._judgmentHistory.push({
      id: judgment.id,
      qScore: judgment.qScore,
      verdict: judgment.verdict || judgment.qVerdict?.verdict,
      confidence: judgment.confidence,
      timestamp: judgment.metadata?.judgedAt || Date.now(),
      itemType: judgment.item?.type,
    });

    // Keep history bounded
    while (this._judgmentHistory.length > 100) {
      this._judgmentHistory.shift();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADVERSARIAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate adversarial analysis - find reasons to doubt
   * @private
   */
  _generateAdversarialAnalysis(judgment, context) {
    const reasons = [];
    const counterArguments = [];

    // 1. Check for extreme scores (suspicious)
    if (judgment.qScore > 90 || judgment.qScore < 10) {
      reasons.push({
        type: 'extreme_score',
        message: `Extreme Q-Score (${judgment.qScore}) is statistically unlikely`,
        confidence: PHI_INV_2,
      });
      counterArguments.push(
        `What evidence would change this from ${judgment.qScore} to ${50}?`
      );
      this._stats.counterArgumentsGenerated++;
    }

    // 2. Check for unanimous dimensions (suspiciously consistent)
    if (judgment.dimensions) {
      const scores = Object.values(judgment.dimensions);
      const allSimilar = scores.every(s => Math.abs(s - scores[0]) < 10);
      if (allSimilar && scores.length > 5) {
        reasons.push({
          type: 'unanimous_dimensions',
          message: 'All dimensions scored similarly - real items have variance',
          confidence: PHI_INV_3,
        });
        counterArguments.push(
          'Which dimension is most likely to be mis-scored?'
        );
        this._stats.counterArgumentsGenerated++;
      }
    }

    // 3. Check for weak axioms that might be hiding
    if (judgment.weaknesses?.hasWeakness) {
      reasons.push({
        type: 'weakness_present',
        message: `Weak axiom detected: ${judgment.weaknesses.weakestAxiom}`,
        confidence: PHI_INV_2,
      });
      counterArguments.push(
        `How would this item score if ${judgment.weaknesses.weakestAxiom} were weighted higher?`
      );
      this._stats.counterArgumentsGenerated++;
    }

    // 4. Check if this contradicts recent patterns
    const recentPattern = this._findContradictingPattern(judgment);
    if (recentPattern) {
      reasons.push({
        type: 'contradicts_pattern',
        message: `Contradicts recent pattern: ${recentPattern.description}`,
        confidence: PHI_INV_3,
      });
      counterArguments.push(
        'Is the recent pattern wrong, or is this judgment an outlier?'
      );
      this._stats.counterArgumentsGenerated++;
    }

    // 5. Context-specific doubts
    if (context.previousJudgments) {
      const avgPrev = context.previousJudgments.reduce((a, b) => a + b.qScore, 0) /
                      context.previousJudgments.length;
      const diff = Math.abs(judgment.qScore - avgPrev);

      if (diff > 25) {
        reasons.push({
          type: 'significant_deviation',
          message: `Deviates ${diff.toFixed(1)} points from previous average`,
          confidence: PHI_INV_2,
        });
        counterArguments.push(
          'What changed between previous judgments and this one?'
        );
        this._stats.counterArgumentsGenerated++;
      }
    }

    return {
      reasons,
      counterArguments,
      totalDoubtWeight: reasons.reduce((sum, r) => sum + r.confidence, 0),
    };
  }

  /**
   * Find patterns that contradict this judgment
   * @private
   */
  _findContradictingPattern(judgment) {
    const itemType = judgment.item?.type;
    if (!itemType) return null;

    // Look for recent judgments of same type with opposite verdict
    const recent = this._judgmentHistory
      .filter(j => j.itemType === itemType)
      .filter(j => Date.now() - j.timestamp < SKEPTIC_CONSTANTS.RECENCY_WINDOW_MS)
      .slice(-10);

    const oppositeCount = recent.filter(j => {
      const jVerdict = j.verdict;
      const currentVerdict = judgment.verdict || judgment.qVerdict?.verdict;
      return (jVerdict === 'HOWL' && currentVerdict === 'BARK') ||
             (jVerdict === 'BARK' && currentVerdict === 'HOWL');
    }).length;

    if (oppositeCount >= 2) {
      return {
        description: `${oppositeCount} recent ${itemType} judgments had opposite verdict`,
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIDENCE DECAY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate adjusted confidence with decay and adversarial reduction
   * @private
   */
  _calculateAdjustedConfidence(judgment, adversarial) {
    let confidence = judgment.confidence || PHI_INV;
    let decayApplied = 0;

    // Apply time-based decay
    const timestamp = judgment.metadata?.judgedAt || Date.now();
    const ageHours = (Date.now() - timestamp) / 3600000;

    if (ageHours > 0) {
      // Exponential decay: confidence × (1 - decay_rate)^hours
      const decayFactor = Math.pow(1 - this.decayRateHourly, ageHours);
      const decayedConfidence = confidence * decayFactor;

      // Don't go below minimum
      const clampedConfidence = Math.max(this.minConfidence, decayedConfidence);
      decayApplied = confidence - clampedConfidence;
      confidence = clampedConfidence;

      if (decayApplied > 0) {
        this._stats.confidenceReductions++;
      }
    }

    // Apply adversarial reduction
    const adversarialReduction = adversarial.totalDoubtWeight * this.counterEvidenceWeight;
    confidence = Math.max(this.minConfidence, confidence - adversarialReduction);

    if (adversarialReduction > 0) {
      this._stats.confidenceReductions++;
    }

    return {
      confidence,
      decayApplied,
      adversarialReduction,
      original: judgment.confidence,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BIAS DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detect potential cognitive biases in judgment patterns
   * @private
   */
  _detectBiases(judgment, context) {
    const biases = [];

    // 1. Recency Bias
    if (this._detectRecencyBias(judgment)) {
      biases.push({
        type: BiasType.RECENCY,
        severity: 'medium',
        message: 'Recent judgments may be overly influencing this one',
        recommendation: 'Consider older evidence more heavily',
      });
    }

    // 2. Confirmation Bias
    if (this._detectConfirmationBias(judgment)) {
      biases.push({
        type: BiasType.CONFIRMATION,
        severity: 'high',
        message: 'Pattern of confirming initial assumptions detected',
        recommendation: 'Actively seek disconfirming evidence',
      });
    }

    // 3. Overgeneralization
    if (this._detectOvergeneralization(judgment, context)) {
      biases.push({
        type: BiasType.OVERGENERALIZATION,
        severity: 'medium',
        message: 'May be generalizing from too few examples',
        recommendation: 'Require more evidence before pattern formation',
      });
    }

    // 4. Overconfidence
    if (this._detectOverconfidence(judgment)) {
      biases.push({
        type: BiasType.OVERCONFIDENCE,
        severity: 'high',
        message: 'Confidence level not justified by evidence quality',
        recommendation: 'Reduce confidence or gather more evidence',
      });
    }

    if (biases.length > 0) {
      this._stats.biasesDetected += biases.length;
      this._detectedBiases.push(...biases.map(b => ({
        ...b,
        judgmentId: judgment.id,
        timestamp: Date.now(),
      })));

      // Keep history bounded
      while (this._detectedBiases.length > 100) {
        this._detectedBiases.shift();
      }
    }

    return biases;
  }

  /**
   * Detect recency bias
   * @private
   */
  _detectRecencyBias(judgment) {
    // Check if recent judgments are clustering in verdict
    const recentSameType = this._judgmentHistory
      .filter(j => j.itemType === judgment.item?.type)
      .filter(j => Date.now() - j.timestamp < SKEPTIC_CONSTANTS.RECENCY_WINDOW_MS);

    if (recentSameType.length < 3) return false;

    const verdictCounts = {};
    for (const j of recentSameType) {
      verdictCounts[j.verdict] = (verdictCounts[j.verdict] || 0) + 1;
    }

    // If one verdict dominates recent history (> 70%), recency bias suspected
    const maxCount = Math.max(...Object.values(verdictCounts));
    return maxCount / recentSameType.length > 0.7;
  }

  /**
   * Detect confirmation bias
   * @private
   */
  _detectConfirmationBias(judgment) {
    // Check for pattern of consecutive same verdicts
    const recent = this._judgmentHistory.slice(-SKEPTIC_CONSTANTS.CONFIRMATION_THRESHOLD);

    if (recent.length < SKEPTIC_CONSTANTS.CONFIRMATION_THRESHOLD) return false;

    const currentVerdict = judgment.verdict || judgment.qVerdict?.verdict;
    const sameVerdictCount = recent.filter(j => j.verdict === currentVerdict).length;

    // If all recent judgments have same verdict, confirmation bias suspected
    return sameVerdictCount === recent.length;
  }

  /**
   * Detect overgeneralization
   * @private
   */
  _detectOvergeneralization(judgment, context) {
    // If we're applying a pattern with few sources
    if (context.patternSources && context.patternSources < 3) {
      return true;
    }

    // If judgment has very high confidence but we have few examples
    if (judgment.confidence > PHI_INV && this._judgmentHistory.length < 5) {
      return true;
    }

    return false;
  }

  /**
   * Detect overconfidence
   * @private
   */
  _detectOverconfidence(judgment) {
    // High confidence with weak evidence indicators
    if (judgment.confidence > 0.5) {
      // Check if THE_UNNAMEABLE is low (high unexplained variance)
      const unnameable = judgment.dimensions?.THE_UNNAMEABLE;
      if (unnameable && unnameable < 50) {
        return true;
      }

      // Check if there's a significant weakness but still high confidence
      if (judgment.weaknesses?.hasWeakness && judgment.weaknesses.gap > 20) {
        return true;
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // META-DOUBT: Doubt the doubt (bounded recursion)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Apply meta-doubt - φ distrusts φ recursively but bounded
   * @private
   */
  _applyMetaDoubt(confidenceResult, biases) {
    this._stats.metaDoubtsApplied++;

    const confidence = confidenceResult.confidence;
    let doubtLevel = 0;

    // Level 0: Base doubt (already applied via adversarial analysis)
    const baseDot = 1 - confidence;
    doubtLevel += baseDot;

    // Level 1: Doubt the confidence itself
    // "Am I being appropriately skeptical, or too skeptical?"
    // If we detected biases, we should trust our doubt more
    // If no biases, maybe we're being paranoid
    const biasAdjustment = biases.length > 0 ? 0.1 : -0.05;
    const level1Doubt = baseDot * PHI_INV + biasAdjustment;
    doubtLevel += level1Doubt * PHI_INV; // Reduce by φ

    // Level 2: Meta-meta-doubt (capped)
    // "Is my doubt of my doubt valid?"
    // This is where we stop - φ⁻² is the floor
    const level2Doubt = level1Doubt * PHI_INV_2;
    doubtLevel = Math.min(doubtLevel + level2Doubt, 1 - PHI_INV_2);

    // Calculate skepticism score (0-1, higher = more skeptical)
    const skepticismScore = Math.min(doubtLevel, PHI_INV);

    // Final confidence (never below min, never above φ⁻¹)
    const finalConfidence = Math.min(
      PHI_INV,
      Math.max(this.minConfidence, confidence * (1 - skepticismScore))
    );

    return {
      finalConfidence,
      doubtLevel,
      skepticismScore,
      depth: SKEPTIC_CONSTANTS.MAX_DOUBT_DEPTH,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COUNTER-HYPOTHESES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate "what if wrong" hypotheses
   * @private
   */
  _generateCounterHypotheses(judgment) {
    const hypotheses = [];

    const verdict = judgment.verdict || judgment.qVerdict?.verdict;
    const qScore = judgment.qScore;

    // Generate opposite scenario
    if (verdict === 'HOWL' || qScore > 80) {
      hypotheses.push({
        scenario: 'false_positive',
        description: 'This could be a false positive - surface quality masking deeper issues',
        checkFor: 'Hidden complexity, deferred problems, maintainability issues',
      });
    }

    if (verdict === 'BARK' || qScore < 38.2) {
      hypotheses.push({
        scenario: 'false_negative',
        description: 'This could be a false negative - unusual approach being penalized',
        checkFor: 'Novel patterns, unconventional but valid solutions, context we\'re missing',
      });
    }

    // Axiom-specific hypotheses
    if (judgment.axiomScores) {
      const axioms = Object.entries(judgment.axiomScores);
      for (const [axiom, score] of axioms) {
        if (axiom === 'META') continue;

        if (score < 50) {
          hypotheses.push({
            scenario: `weak_${axiom.toLowerCase()}`,
            description: `${axiom} scored low - but is the scoring criteria appropriate for this item?`,
            checkFor: `Whether ${axiom} dimensions are applicable to this item type`,
          });
        }
      }
    }

    return hypotheses;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate recommendation based on meta-doubt and biases
   * @private
   */
  _generateRecommendation(metaDoubt, biases) {
    const recommendations = [];

    // Based on skepticism score
    if (metaDoubt.skepticismScore > 0.5) {
      recommendations.push({
        priority: 'high',
        action: 'seek_confirmation',
        message: 'High skepticism - seek independent confirmation before acting on this judgment',
      });
    }

    // Based on biases
    for (const bias of biases) {
      if (bias.severity === 'high') {
        recommendations.push({
          priority: 'high',
          action: 'bias_mitigation',
          message: bias.recommendation,
          bias: bias.type,
        });
      }
    }

    // Based on final confidence
    if (metaDoubt.finalConfidence < PHI_INV_2) {
      recommendations.push({
        priority: 'medium',
        action: 'gather_evidence',
        message: 'Confidence below threshold - gather more evidence before relying on this judgment',
      });
    }

    // Default: mild skepticism is healthy
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'proceed_with_awareness',
        message: 'Skepticism applied - proceed with appropriate doubt',
      });
    }

    return recommendations;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS & INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get self-skepticism statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const recentBiases = this._detectedBiases.filter(
      b => Date.now() - b.timestamp < 3600000
    );

    const biasCounts = {};
    for (const bias of recentBiases) {
      biasCounts[bias.type] = (biasCounts[bias.type] || 0) + 1;
    }

    return {
      ...this._stats,
      recentBiases: biasCounts,
      totalBiasesRecorded: this._detectedBiases.length,
      judgmentHistorySize: this._judgmentHistory.length,
    };
  }

  /**
   * Get self-doubt patterns (meta-introspection)
   * @returns {Object} Patterns in our own skepticism
   */
  getSelfDoubtPatterns() {
    const patterns = [];

    // Are we doubting too much of one type?
    const biasByType = {};
    for (const bias of this._detectedBiases) {
      biasByType[bias.type] = (biasByType[bias.type] || 0) + 1;
    }

    const mostCommonBias = Object.entries(biasByType)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonBias && mostCommonBias[1] > 5) {
      patterns.push({
        pattern: 'repeated_bias_detection',
        type: mostCommonBias[0],
        count: mostCommonBias[1],
        meta: 'Are we over-detecting this bias? φ distrusts even our bias detection.',
      });
    }

    // Are our confidence reductions consistent?
    if (this._stats.confidenceReductions > 10) {
      const reductionRate = this._stats.confidenceReductions / this._stats.judgmentsDoubled;
      if (reductionRate > 0.8) {
        patterns.push({
          pattern: 'aggressive_confidence_reduction',
          rate: reductionRate,
          meta: 'We\'re reducing confidence very frequently. Are we being too skeptical?',
        });
      }
    }

    return {
      patterns,
      meta: 'φ distrusts φ: even these patterns should be questioned',
    };
  }

  /**
   * Reset statistics (but keep history for bias detection)
   */
  resetStats() {
    this._stats = {
      judgmentsDoubled: 0,
      confidenceReductions: 0,
      biasesDetected: 0,
      counterArgumentsGenerated: 0,
      metaDoubtsApplied: 0,
    };
  }

  /**
   * Clear all history
   */
  clear() {
    this._judgmentHistory = [];
    this._patternHistory = [];
    this._detectedBiases = [];
    this.resetStats();
  }

  /**
   * Export state for persistence
   * @returns {Object} Exportable state
   */
  export() {
    return {
      judgmentHistory: this._judgmentHistory.slice(-50), // Keep last 50
      detectedBiases: this._detectedBiases.slice(-50),
      stats: { ...this._stats },
      exportedAt: Date.now(),
    };
  }

  /**
   * Import state from persistence
   * @param {Object} state - Previously exported state
   */
  import(state) {
    if (state.judgmentHistory) {
      this._judgmentHistory = state.judgmentHistory;
    }
    if (state.detectedBiases) {
      this._detectedBiases = state.detectedBiases;
    }
    if (state.stats) {
      this._stats = { ...this._stats, ...state.stats };
    }
  }
}

/**
 * Create a self-skeptic instance
 * @param {Object} [options] - Options
 * @returns {SelfSkeptic} Self-skeptic instance
 */
export function createSelfSkeptic(options = {}) {
  return new SelfSkeptic(options);
}

export default {
  SelfSkeptic,
  createSelfSkeptic,
  SKEPTIC_CONSTANTS,
  BiasType,
};
