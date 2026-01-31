/**
 * CYNIC Behavior Modifier
 *
 * Connects feedback to actual behavior changes.
 * Feedback doesn't just get stored - it modifies how CYNIC operates.
 *
 * "Le feedback modifie le comportement" - Feedback shapes behavior
 *
 * @module @cynic/node/learning/behavior-modifier
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// =============================================================================
// CONFIGURATION
// =============================================================================

export const BEHAVIOR_CONFIG = {
  // Minimum feedback count before making changes
  minFeedbackCount: 3,

  // Maximum behavior adjustment per update
  maxAdjustment: 0.2,

  // Decay rate for behavior adjustments
  decayRate: 0.95,

  // Thresholds for behavior change
  thresholds: {
    confidence: PHI_INV,          // 61.8% - adjust confidence scaling
    routing: PHI_INV,             // 61.8% - adjust routing preferences
    judgment: PHI_INV_2,          // 38.2% - adjust judgment weights
  },

  // Feedback weighting
  feedbackWeights: {
    explicit: 1.0,                // User explicitly said correct/incorrect
    implicit_success: 0.5,        // Inferred from successful outcome
    implicit_failure: 0.3,        // Inferred from failure
    system: 0.2,                  // System-generated feedback
  },
};

// =============================================================================
// BEHAVIOR ADJUSTMENTS
// =============================================================================

/**
 * Types of behavior adjustments
 */
export const AdjustmentType = {
  CONFIDENCE: 'confidence',       // Adjust confidence calibration
  ROUTING: 'routing',             // Adjust dog routing preferences
  JUDGMENT: 'judgment',           // Adjust judgment dimension weights
  PATTERN: 'pattern',             // Adjust pattern recognition
  THRESHOLD: 'threshold',         // Adjust decision thresholds
};

/**
 * Single behavior adjustment record
 */
export class BehaviorAdjustment {
  constructor(data = {}) {
    this.id = data.id || `adj_${Date.now().toString(36)}`;
    this.type = data.type || AdjustmentType.CONFIDENCE;
    this.target = data.target || 'global';         // What is being adjusted
    this.delta = data.delta || 0;                  // Change amount
    this.reason = data.reason || '';               // Why adjustment was made
    this.feedbackIds = data.feedbackIds || [];     // Feedback that triggered this
    this.createdAt = data.createdAt || Date.now();
    this.appliedAt = data.appliedAt || null;
    this.reverted = data.reverted || false;
  }

  toJSON() {
    return { ...this };
  }
}

// =============================================================================
// BEHAVIOR MODIFIER
// =============================================================================

/**
 * BehaviorModifier - Connects feedback to behavior changes
 */
export class BehaviorModifier {
  /**
   * @param {Object} options
   * @param {Object} [options.qRouter] - Q-Learning router to modify
   * @param {Object} [options.judgeWeights] - Judgment dimension weights
   * @param {Object} [options.patternRecognizer] - Pattern recognizer to modify
   * @param {Object} [options.config] - Custom configuration
   */
  constructor(options = {}) {
    this.qRouter = options.qRouter || null;
    this.judgeWeights = options.judgeWeights || this._defaultJudgeWeights();
    this.patternRecognizer = options.patternRecognizer || null;
    this.config = { ...BEHAVIOR_CONFIG, ...options.config };

    // Feedback accumulator
    this.feedbackBuffer = [];

    // Behavior state
    this.behaviorState = {
      // Confidence calibration multiplier (1.0 = no adjustment)
      confidenceScale: 1.0,

      // Per-dog routing adjustments
      routingAdjustments: {},

      // Per-dimension judgment adjustments
      judgmentAdjustments: {},

      // Pattern recognition adjustments
      patternThresholds: {},

      // Decision thresholds
      decisionThresholds: {
        block: 0.3,               // Score below this = block
        warn: 0.5,                // Score below this = warn
        approve: 0.7,             // Score above this = approve
      },
    };

    // Adjustment history
    this.adjustments = [];

    // Stats
    this.stats = {
      feedbackProcessed: 0,
      adjustmentsMade: 0,
      adjustmentsReverted: 0,
      lastAdjustment: null,
    };
  }

  /**
   * Default judgment dimension weights
   * @private
   */
  _defaultJudgeWeights() {
    return {
      PHI: 1.0,
      VERIFY: 1.0,
      CULTURE: 1.0,
      BURN: 1.0,
    };
  }

  // ===========================================================================
  // FEEDBACK PROCESSING
  // ===========================================================================

  /**
   * Process feedback and potentially modify behavior
   */
  processFeedback(feedback) {
    // Validate feedback
    if (!feedback || typeof feedback !== 'object') return null;

    // Normalize feedback
    const normalizedFeedback = this._normalizeFeedback(feedback);

    // Add to buffer
    this.feedbackBuffer.push(normalizedFeedback);
    this.stats.feedbackProcessed++;

    // Check if we have enough feedback to make adjustments
    if (this.feedbackBuffer.length >= this.config.minFeedbackCount) {
      return this._processBufferedFeedback();
    }

    return null;
  }

  /**
   * Normalize feedback to standard format
   * @private
   */
  _normalizeFeedback(feedback) {
    return {
      id: feedback.id || `fb_${Date.now().toString(36)}`,
      type: feedback.type || 'explicit',
      outcome: feedback.outcome || feedback.correct ? 'correct' : 'incorrect',
      context: {
        dog: feedback.dog || feedback.context?.dog,
        dimension: feedback.dimension || feedback.context?.dimension,
        taskType: feedback.taskType || feedback.context?.taskType,
        score: feedback.score || feedback.context?.score,
      },
      weight: this.config.feedbackWeights[feedback.type] || 0.5,
      timestamp: feedback.timestamp || Date.now(),
    };
  }

  /**
   * Process buffered feedback and make adjustments
   * @private
   */
  _processBufferedFeedback() {
    const adjustments = [];

    // Analyze feedback patterns
    const analysis = this._analyzeFeedback(this.feedbackBuffer);

    // Make confidence adjustments
    if (analysis.confidenceCalibration !== 0) {
      const adj = this._makeConfidenceAdjustment(analysis);
      if (adj) adjustments.push(adj);
    }

    // Make routing adjustments
    if (Object.keys(analysis.dogPerformance).length > 0) {
      const routingAdjs = this._makeRoutingAdjustments(analysis);
      adjustments.push(...routingAdjs);
    }

    // Make judgment adjustments
    if (Object.keys(analysis.dimensionPerformance).length > 0) {
      const judgmentAdjs = this._makeJudgmentAdjustments(analysis);
      adjustments.push(...judgmentAdjs);
    }

    // Clear buffer (keep last few for continuity)
    this.feedbackBuffer = this.feedbackBuffer.slice(-2);

    return adjustments;
  }

  /**
   * Analyze feedback for patterns
   * @private
   */
  _analyzeFeedback(feedbackList) {
    const analysis = {
      correctCount: 0,
      incorrectCount: 0,
      confidenceCalibration: 0,
      dogPerformance: {},
      dimensionPerformance: {},
      taskTypePerformance: {},
    };

    for (const fb of feedbackList) {
      // Count outcomes
      if (fb.outcome === 'correct') {
        analysis.correctCount++;
      } else {
        analysis.incorrectCount++;
      }

      // Track dog performance
      if (fb.context.dog) {
        if (!analysis.dogPerformance[fb.context.dog]) {
          analysis.dogPerformance[fb.context.dog] = { correct: 0, incorrect: 0 };
        }
        if (fb.outcome === 'correct') {
          analysis.dogPerformance[fb.context.dog].correct++;
        } else {
          analysis.dogPerformance[fb.context.dog].incorrect++;
        }
      }

      // Track dimension performance
      if (fb.context.dimension) {
        if (!analysis.dimensionPerformance[fb.context.dimension]) {
          analysis.dimensionPerformance[fb.context.dimension] = { correct: 0, incorrect: 0 };
        }
        if (fb.outcome === 'correct') {
          analysis.dimensionPerformance[fb.context.dimension].correct++;
        } else {
          analysis.dimensionPerformance[fb.context.dimension].incorrect++;
        }
      }

      // Track task type performance
      if (fb.context.taskType) {
        if (!analysis.taskTypePerformance[fb.context.taskType]) {
          analysis.taskTypePerformance[fb.context.taskType] = { correct: 0, incorrect: 0 };
        }
        if (fb.outcome === 'correct') {
          analysis.taskTypePerformance[fb.context.taskType].correct++;
        } else {
          analysis.taskTypePerformance[fb.context.taskType].incorrect++;
        }
      }
    }

    // Calculate confidence calibration needed
    const total = analysis.correctCount + analysis.incorrectCount;
    if (total > 0) {
      const accuracy = analysis.correctCount / total;
      // If accuracy is low, we're overconfident → reduce confidence
      // If accuracy is high, we might be underconfident → increase slightly
      if (accuracy < PHI_INV_2) {
        analysis.confidenceCalibration = -0.1; // Reduce confidence
      } else if (accuracy > PHI_INV) {
        analysis.confidenceCalibration = 0.05; // Slight increase
      }
    }

    return analysis;
  }

  // ===========================================================================
  // ADJUSTMENT MAKERS
  // ===========================================================================

  /**
   * Make confidence calibration adjustment
   * @private
   */
  _makeConfidenceAdjustment(analysis) {
    const delta = Math.max(-this.config.maxAdjustment,
                  Math.min(this.config.maxAdjustment, analysis.confidenceCalibration));

    if (Math.abs(delta) < 0.01) return null;

    const adjustment = new BehaviorAdjustment({
      type: AdjustmentType.CONFIDENCE,
      target: 'global',
      delta,
      reason: `Accuracy ${analysis.correctCount}/${analysis.correctCount + analysis.incorrectCount}`,
      feedbackIds: this.feedbackBuffer.map(f => f.id),
    });

    // Apply adjustment
    this.behaviorState.confidenceScale = Math.max(0.5,
      Math.min(1.5, this.behaviorState.confidenceScale + delta));
    adjustment.appliedAt = Date.now();

    this.adjustments.push(adjustment);
    this.stats.adjustmentsMade++;
    this.stats.lastAdjustment = Date.now();

    return adjustment;
  }

  /**
   * Make routing adjustments based on dog performance
   * @private
   */
  _makeRoutingAdjustments(analysis) {
    const adjustments = [];

    for (const [dog, performance] of Object.entries(analysis.dogPerformance)) {
      const total = performance.correct + performance.incorrect;
      if (total < 2) continue; // Need at least 2 data points

      const accuracy = performance.correct / total;
      let delta = 0;

      if (accuracy < PHI_INV_2) {
        delta = -0.1; // Reduce routing to this dog
      } else if (accuracy > PHI_INV) {
        delta = 0.05; // Increase routing to this dog
      }

      if (Math.abs(delta) < 0.01) continue;

      const adjustment = new BehaviorAdjustment({
        type: AdjustmentType.ROUTING,
        target: dog,
        delta,
        reason: `Dog ${dog} accuracy: ${Math.round(accuracy * 100)}%`,
        feedbackIds: this.feedbackBuffer.filter(f => f.context.dog === dog).map(f => f.id),
      });

      // Apply adjustment
      this.behaviorState.routingAdjustments[dog] =
        (this.behaviorState.routingAdjustments[dog] || 0) + delta;

      // Also update Q-router if available
      if (this.qRouter) {
        // Provide feedback to Q-router
        // This is a simplified version - real implementation would track episode IDs
        this.qRouter.stats.correctPredictions += performance.correct;
        this.qRouter.stats.totalFeedback += total;
      }

      adjustment.appliedAt = Date.now();
      this.adjustments.push(adjustment);
      this.stats.adjustmentsMade++;

      adjustments.push(adjustment);
    }

    this.stats.lastAdjustment = Date.now();
    return adjustments;
  }

  /**
   * Make judgment dimension adjustments
   * @private
   */
  _makeJudgmentAdjustments(analysis) {
    const adjustments = [];

    for (const [dim, performance] of Object.entries(analysis.dimensionPerformance)) {
      const total = performance.correct + performance.incorrect;
      if (total < 2) continue;

      const accuracy = performance.correct / total;
      let delta = 0;

      if (accuracy < PHI_INV_2) {
        delta = -0.05; // Reduce weight of this dimension
      } else if (accuracy > PHI_INV) {
        delta = 0.02; // Slightly increase weight
      }

      if (Math.abs(delta) < 0.01) continue;

      const adjustment = new BehaviorAdjustment({
        type: AdjustmentType.JUDGMENT,
        target: dim,
        delta,
        reason: `Dimension ${dim} accuracy: ${Math.round(accuracy * 100)}%`,
        feedbackIds: this.feedbackBuffer.filter(f => f.context.dimension === dim).map(f => f.id),
      });

      // Apply adjustment
      this.behaviorState.judgmentAdjustments[dim] =
        (this.behaviorState.judgmentAdjustments[dim] || 0) + delta;

      // Update actual judge weights
      if (this.judgeWeights[dim] !== undefined) {
        this.judgeWeights[dim] = Math.max(0.5,
          Math.min(1.5, this.judgeWeights[dim] + delta));
      }

      adjustment.appliedAt = Date.now();
      this.adjustments.push(adjustment);
      this.stats.adjustmentsMade++;

      adjustments.push(adjustment);
    }

    this.stats.lastAdjustment = Date.now();
    return adjustments;
  }

  // ===========================================================================
  // BEHAVIOR APPLICATION
  // ===========================================================================

  /**
   * Apply behavior modifications to a confidence value
   */
  applyConfidenceScale(rawConfidence) {
    return Math.min(PHI_INV, rawConfidence * this.behaviorState.confidenceScale);
  }

  /**
   * Get routing adjustment for a dog
   */
  getRoutingAdjustment(dog) {
    return this.behaviorState.routingAdjustments[dog] || 0;
  }

  /**
   * Get judgment weight for a dimension
   */
  getJudgmentWeight(dimension) {
    const baseWeight = this.judgeWeights[dimension] || 1.0;
    const adjustment = this.behaviorState.judgmentAdjustments[dimension] || 0;
    return Math.max(0.5, Math.min(1.5, baseWeight + adjustment));
  }

  /**
   * Get decision threshold
   */
  getThreshold(type) {
    return this.behaviorState.decisionThresholds[type] ||
           this.config.thresholds[type] || 0.5;
  }

  // ===========================================================================
  // REVERSION & DECAY
  // ===========================================================================

  /**
   * Revert a specific adjustment
   */
  revert(adjustmentId) {
    const adjustment = this.adjustments.find(a => a.id === adjustmentId);
    if (!adjustment || adjustment.reverted) return false;

    // Undo the adjustment
    switch (adjustment.type) {
      case AdjustmentType.CONFIDENCE:
        this.behaviorState.confidenceScale -= adjustment.delta;
        break;
      case AdjustmentType.ROUTING:
        this.behaviorState.routingAdjustments[adjustment.target] =
          (this.behaviorState.routingAdjustments[adjustment.target] || 0) - adjustment.delta;
        break;
      case AdjustmentType.JUDGMENT:
        this.behaviorState.judgmentAdjustments[adjustment.target] =
          (this.behaviorState.judgmentAdjustments[adjustment.target] || 0) - adjustment.delta;
        if (this.judgeWeights[adjustment.target] !== undefined) {
          this.judgeWeights[adjustment.target] -= adjustment.delta;
        }
        break;
    }

    adjustment.reverted = true;
    this.stats.adjustmentsReverted++;
    return true;
  }

  /**
   * Apply decay to all adjustments
   */
  applyDecay() {
    const decayRate = this.config.decayRate;

    // Decay confidence scale toward 1.0
    this.behaviorState.confidenceScale =
      1.0 + (this.behaviorState.confidenceScale - 1.0) * decayRate;

    // Decay routing adjustments toward 0
    for (const dog of Object.keys(this.behaviorState.routingAdjustments)) {
      this.behaviorState.routingAdjustments[dog] *= decayRate;
    }

    // Decay judgment adjustments toward 0
    for (const dim of Object.keys(this.behaviorState.judgmentAdjustments)) {
      this.behaviorState.judgmentAdjustments[dim] *= decayRate;
    }
  }

  // ===========================================================================
  // STATS
  // ===========================================================================

  getStats() {
    return {
      ...this.stats,
      feedbackBufferSize: this.feedbackBuffer.length,
      totalAdjustments: this.adjustments.length,
      behaviorState: {
        confidenceScale: Math.round(this.behaviorState.confidenceScale * 100) / 100,
        routingAdjustments: Object.fromEntries(
          Object.entries(this.behaviorState.routingAdjustments)
            .map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        judgmentAdjustments: Object.fromEntries(
          Object.entries(this.behaviorState.judgmentAdjustments)
            .map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
      },
    };
  }

  /**
   * Get current behavior state for context injection
   */
  getBehaviorContext() {
    return {
      confidenceScale: this.behaviorState.confidenceScale,
      adjustedWeights: Object.fromEntries(
        Object.keys(this.judgeWeights).map(dim => [
          dim,
          this.getJudgmentWeight(dim),
        ])
      ),
      routingPreferences: this.behaviorState.routingAdjustments,
      thresholds: this.behaviorState.decisionThresholds,
      recentAdjustments: this.adjustments.slice(-5).map(a => ({
        type: a.type,
        target: a.target,
        delta: a.delta,
        reason: a.reason,
      })),
    };
  }
}

/**
 * Create a BehaviorModifier instance
 */
export function createBehaviorModifier(options = {}) {
  return new BehaviorModifier(options);
}

export default {
  BehaviorModifier,
  BehaviorAdjustment,
  AdjustmentType,
  BEHAVIOR_CONFIG,
  createBehaviorModifier,
};
