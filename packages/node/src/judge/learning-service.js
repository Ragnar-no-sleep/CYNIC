/**
 * Learning Service - RLHF Loop
 *
 * Closes the feedback loop: Human corrections → Learning → Better judgments
 *
 * "CYNIC burns its ego with every correction" - κυνικός
 *
 * ## Architecture
 *
 * 1. Process unapplied feedback from FeedbackRepository
 * 2. Calculate learning deltas (prediction error)
 * 3. Update weight modifiers (bounded by φ⁻²)
 * 4. Track learning patterns for systematic bias detection
 *
 * ## φ-Bounded Learning
 *
 * - Max weight adjustment: φ⁻² = 38.2%
 * - Learning rate: φ⁻³ = 23.6%
 * - Min feedback for learning: 3 (MIN_PATTERN_SOURCES)
 *
 * @module @cynic/node/judge/learning-service
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3, MIN_PATTERN_SOURCES } from '@cynic/core';
import { getAllDimensions } from './dimensions.js';

/**
 * Learning Service - RLHF feedback loop
 */
export class LearningService extends EventEmitter {
  /**
   * @param {Object} options - Service options
   * @param {Object} [options.persistence] - PersistenceManager with feedback repository
   * @param {number} [options.learningRate] - Learning rate (default: φ⁻³ = 23.6%)
   * @param {number} [options.maxAdjustment] - Max weight adjustment (default: φ⁻² = 38.2%)
   * @param {number} [options.minFeedback] - Min feedback before learning (default: 3)
   * @param {number} [options.decayRate] - How fast old learnings decay (default: 0.95)
   */
  constructor(options = {}) {
    super();

    this.persistence = options.persistence || null;
    this.learningRate = options.learningRate || PHI_INV_3;
    this.maxAdjustment = options.maxAdjustment || PHI_INV_2;
    this.minFeedback = options.minFeedback || MIN_PATTERN_SOURCES;
    this.decayRate = options.decayRate || 0.95;

    // Weight modifiers: dimension -> adjustment multiplier
    // 1.0 = no change, 0.8 = 20% decrease, 1.2 = 20% increase
    this._weightModifiers = new Map();

    // Threshold adjustments: itemType -> { dimension -> delta }
    this._thresholdAdjustments = new Map();

    // Learning patterns: track systematic biases
    this._patterns = {
      byItemType: new Map(), // itemType -> { overscoring: count, underscoring: count }
      byDimension: new Map(), // dimension -> { avgError, feedbackCount }
      overall: {
        totalFeedback: 0,
        correctCount: 0,
        incorrectCount: 0,
        avgScoreError: 0,
        learningIterations: 0,
      },
    };

    // Feedback queue for batch processing
    this._feedbackQueue = [];

    this._initialized = false;
  }

  /**
   * Initialize the service
   */
  async init() {
    if (this._initialized) return;

    // Initialize all dimension modifiers to 1.0 (no change)
    const allDimensions = getAllDimensions();
    for (const name of Object.keys(allDimensions)) {
      this._weightModifiers.set(name, 1.0);
    }

    // Load persisted learning state if available
    if (this.persistence) {
      await this._loadState();
    }

    this._initialized = true;
    this.emit('initialized');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEIGHT MODIFIERS (for CYNICJudge to use)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get weight modifier for a dimension
   * CYNICJudge calls this when calculating scores
   *
   * @param {string} dimension - Dimension name
   * @returns {number} Modifier (1.0 = no change)
   */
  getWeightModifier(dimension) {
    return this._weightModifiers.get(dimension) || 1.0;
  }

  /**
   * Get all weight modifiers
   * @returns {Object} Dimension -> modifier map
   */
  getAllWeightModifiers() {
    return Object.fromEntries(this._weightModifiers);
  }

  /**
   * Get threshold adjustment for item type and dimension
   *
   * @param {string} itemType - Item type (code, decision, etc.)
   * @param {string} dimension - Dimension name
   * @returns {number} Threshold adjustment (0 = no change)
   */
  getThresholdAdjustment(itemType, dimension) {
    const typeAdjustments = this._thresholdAdjustments.get(itemType);
    if (!typeAdjustments) return 0;
    return typeAdjustments.get(dimension) || 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process a single feedback item
   *
   * @param {Object} feedback - Feedback data
   * @param {string} feedback.outcome - 'correct', 'incorrect', 'partial'
   * @param {number} [feedback.actualScore] - What the score should have been
   * @param {number} feedback.originalScore - What CYNIC scored it
   * @param {string} feedback.itemType - Type of item judged
   * @param {Object} [feedback.dimensionScores] - Original dimension scores
   * @returns {Object} Learning result
   */
  processFeedback(feedback) {
    const {
      outcome,
      actualScore,
      originalScore,
      itemType = 'unknown',
      dimensionScores = {},
    } = feedback;

    // Calculate learning delta
    const scoreDelta = actualScore != null
      ? actualScore - originalScore
      : this._inferDeltaFromOutcome(outcome, originalScore);

    // Track overall patterns
    this._patterns.overall.totalFeedback++;
    if (outcome === 'correct') {
      this._patterns.overall.correctCount++;
    } else if (outcome === 'incorrect') {
      this._patterns.overall.incorrectCount++;
    }

    // Update running average of score error
    const prevAvg = this._patterns.overall.avgScoreError;
    const n = this._patterns.overall.totalFeedback;
    this._patterns.overall.avgScoreError = prevAvg + (Math.abs(scoreDelta) - prevAvg) / n;

    // Track by item type
    this._trackItemTypePattern(itemType, scoreDelta);

    // Track by dimension
    this._trackDimensionPatterns(dimensionScores, scoreDelta);

    // Queue for batch learning
    this._feedbackQueue.push({
      ...feedback,
      scoreDelta,
      processedAt: Date.now(),
    });

    const result = {
      scoreDelta,
      queueSize: this._feedbackQueue.length,
      shouldLearn: this._feedbackQueue.length >= this.minFeedback,
    };

    this.emit('feedback-processed', result);
    return result;
  }

  /**
   * Infer score delta from outcome when actual score not provided
   * @private
   */
  _inferDeltaFromOutcome(outcome, originalScore) {
    switch (outcome) {
      case 'correct':
        return 0; // No change needed
      case 'incorrect':
        // Assume we were significantly wrong
        // If score was high, assume it should be lower; if low, assume higher
        return originalScore > 50 ? -20 : 20;
      case 'partial':
        // Small adjustment
        return originalScore > 50 ? -10 : 10;
      default:
        return 0;
    }
  }

  /**
   * Track pattern by item type
   * @private
   */
  _trackItemTypePattern(itemType, scoreDelta) {
    if (!this._patterns.byItemType.has(itemType)) {
      this._patterns.byItemType.set(itemType, {
        overscoring: 0,
        underscoring: 0,
        feedbackCount: 0,
        avgDelta: 0,
      });
    }

    const pattern = this._patterns.byItemType.get(itemType);
    pattern.feedbackCount++;

    if (scoreDelta < -5) {
      pattern.overscoring++;
    } else if (scoreDelta > 5) {
      pattern.underscoring++;
    }

    // Update running average
    pattern.avgDelta = pattern.avgDelta + (scoreDelta - pattern.avgDelta) / pattern.feedbackCount;
  }

  /**
   * Track patterns by dimension
   * @private
   */
  _trackDimensionPatterns(dimensionScores, scoreDelta) {
    // If we have dimension scores, try to identify which dimensions contributed to error
    for (const [dimension, score] of Object.entries(dimensionScores)) {
      if (!this._patterns.byDimension.has(dimension)) {
        this._patterns.byDimension.set(dimension, {
          avgError: 0,
          feedbackCount: 0,
          scoreSum: 0,
        });
      }

      const pattern = this._patterns.byDimension.get(dimension);
      pattern.feedbackCount++;
      pattern.scoreSum += score;

      // Dimensions with extreme scores that correlate with errors
      // are candidates for weight adjustment
      if (Math.abs(scoreDelta) > 10) {
        const contribution = (score - 50) * Math.sign(scoreDelta);
        pattern.avgError = pattern.avgError + (contribution - pattern.avgError) / pattern.feedbackCount;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING ALGORITHM
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute learning iteration
   * Processes queued feedback and updates weights
   *
   * @returns {Object} Learning results
   */
  async learn() {
    if (this._feedbackQueue.length < this.minFeedback) {
      return {
        success: false,
        reason: `Insufficient feedback (${this._feedbackQueue.length}/${this.minFeedback})`,
      };
    }

    const startTime = Date.now();
    const feedbackBatch = [...this._feedbackQueue];
    this._feedbackQueue = [];

    // Calculate adjustments from batch
    const adjustments = this._calculateAdjustments(feedbackBatch);

    // Apply adjustments with φ-bounded learning rate
    this._applyAdjustments(adjustments);

    // Apply decay to old learnings
    this._applyDecay();

    // Increment learning iteration
    this._patterns.overall.learningIterations++;

    // Persist state
    if (this.persistence) {
      await this._saveState();

      // Mark feedback as applied in DB
      for (const fb of feedbackBatch) {
        if (fb.feedbackId && this.persistence.feedback) {
          try {
            await this.persistence.feedback.markApplied(fb.feedbackId);
          } catch (e) {
            // Ignore - feedback might be in-memory only
          }
        }
      }
    }

    const result = {
      success: true,
      feedbackProcessed: feedbackBatch.length,
      adjustmentsMade: Object.keys(adjustments.weights).length,
      learningIteration: this._patterns.overall.learningIterations,
      duration: Date.now() - startTime,
    };

    this.emit('learning-complete', result);
    return result;
  }

  /**
   * Calculate weight adjustments from feedback batch
   * @private
   */
  _calculateAdjustments(feedbackBatch) {
    const weightDeltas = new Map();
    const thresholdDeltas = new Map();

    // Group feedback by item type
    const byType = new Map();
    for (const fb of feedbackBatch) {
      const type = fb.itemType || 'unknown';
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type).push(fb);
    }

    // Calculate threshold adjustments per item type
    for (const [itemType, items] of byType) {
      const avgDelta = items.reduce((sum, fb) => sum + fb.scoreDelta, 0) / items.length;

      // Only adjust if consistent bias
      if (Math.abs(avgDelta) > 5 && items.length >= 2) {
        if (!thresholdDeltas.has(itemType)) {
          thresholdDeltas.set(itemType, new Map());
        }

        // Adjust general threshold for this item type
        // Positive delta = we're underscoring, lower threshold
        // Negative delta = we're overscoring, raise threshold
        const adjustment = -avgDelta * this.learningRate;
        thresholdDeltas.get(itemType).set('_general', adjustment);
      }
    }

    // Calculate dimension weight adjustments
    for (const [dimension, pattern] of this._patterns.byDimension) {
      if (pattern.feedbackCount < this.minFeedback) continue;

      // If a dimension consistently contributes to errors, adjust its weight
      // Positive avgError = dimension scores high when we should score low
      // -> reduce weight
      if (Math.abs(pattern.avgError) > 10) {
        const currentModifier = this._weightModifiers.get(dimension) || 1.0;
        const delta = -pattern.avgError * this.learningRate * 0.01;

        weightDeltas.set(dimension, delta);
      }
    }

    return {
      weights: Object.fromEntries(weightDeltas),
      thresholds: Object.fromEntries(
        [...thresholdDeltas.entries()].map(([k, v]) => [k, Object.fromEntries(v)])
      ),
    };
  }

  /**
   * Apply adjustments with φ-bounded limits
   * @private
   */
  _applyAdjustments(adjustments) {
    // Apply weight adjustments
    for (const [dimension, delta] of Object.entries(adjustments.weights)) {
      const current = this._weightModifiers.get(dimension) || 1.0;
      let newModifier = current + delta;

      // Bound to [1 - maxAdjustment, 1 + maxAdjustment]
      const minMod = 1 - this.maxAdjustment;
      const maxMod = 1 + this.maxAdjustment;
      newModifier = Math.max(minMod, Math.min(maxMod, newModifier));

      this._weightModifiers.set(dimension, newModifier);
    }

    // Apply threshold adjustments
    for (const [itemType, dims] of Object.entries(adjustments.thresholds)) {
      if (!this._thresholdAdjustments.has(itemType)) {
        this._thresholdAdjustments.set(itemType, new Map());
      }

      for (const [dim, delta] of Object.entries(dims)) {
        const current = this._thresholdAdjustments.get(itemType).get(dim) || 0;
        let newAdjustment = current + delta;

        // Bound threshold adjustments to ±15 points
        newAdjustment = Math.max(-15, Math.min(15, newAdjustment));

        this._thresholdAdjustments.get(itemType).set(dim, newAdjustment);
      }
    }
  }

  /**
   * Apply decay to old learnings (prevents overfitting)
   * @private
   */
  _applyDecay() {
    // Decay weight modifiers toward 1.0
    for (const [dimension, modifier] of this._weightModifiers) {
      const decayed = 1.0 + (modifier - 1.0) * this.decayRate;
      this._weightModifiers.set(dimension, decayed);
    }

    // Decay threshold adjustments toward 0
    for (const [, dims] of this._thresholdAdjustments) {
      for (const [dim, adjustment] of dims) {
        dims.set(dim, adjustment * this.decayRate);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-LEARNING (Pull from persistence)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pull and process unapplied feedback from persistence
   *
   * @param {number} [limit=100] - Max feedback to process
   * @returns {Object} Pull results
   */
  async pullFeedback(limit = 100) {
    if (!this.persistence?.feedback) {
      return { success: false, reason: 'No feedback repository' };
    }

    try {
      const unapplied = await this.persistence.feedback.findUnapplied(limit);

      for (const fb of unapplied) {
        this.processFeedback({
          feedbackId: fb.id,
          outcome: fb.outcome,
          actualScore: fb.actual_score,
          originalScore: fb.q_score,
          itemType: fb.item_type,
          reason: fb.reason,
        });
      }

      return {
        success: true,
        pulled: unapplied.length,
        queueSize: this._feedbackQueue.length,
      };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  /**
   * Run full learning cycle: pull feedback -> learn -> persist
   *
   * @returns {Object} Cycle results
   */
  async runLearningCycle() {
    await this.init();

    // Pull unapplied feedback
    const pullResult = await this.pullFeedback();

    // Execute learning
    const learnResult = await this.learn();

    return {
      pull: pullResult,
      learn: learnResult,
      patterns: this.getPatterns(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INSIGHTS & STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get learned patterns and insights
   *
   * @returns {Object} Patterns and insights
   */
  getPatterns() {
    const insights = [];

    // Check for systematic biases by item type
    for (const [itemType, pattern] of this._patterns.byItemType) {
      if (pattern.feedbackCount >= this.minFeedback) {
        if (Math.abs(pattern.avgDelta) > 10) {
          const direction = pattern.avgDelta > 0 ? 'underscoring' : 'overscoring';
          insights.push({
            type: 'item_type_bias',
            itemType,
            direction,
            avgDelta: Math.round(pattern.avgDelta * 10) / 10,
            feedbackCount: pattern.feedbackCount,
            recommendation: `Consider ${direction === 'overscoring' ? 'lowering' : 'raising'} thresholds for ${itemType}`,
          });
        }
      }
    }

    // Check for dimension issues
    for (const [dimension, pattern] of this._patterns.byDimension) {
      if (pattern.feedbackCount >= this.minFeedback && Math.abs(pattern.avgError) > 15) {
        insights.push({
          type: 'dimension_bias',
          dimension,
          avgError: Math.round(pattern.avgError * 10) / 10,
          feedbackCount: pattern.feedbackCount,
          recommendation: `${dimension} weight may need adjustment`,
        });
      }
    }

    return {
      overall: { ...this._patterns.overall },
      byItemType: Object.fromEntries(this._patterns.byItemType),
      byDimension: Object.fromEntries(this._patterns.byDimension),
      insights,
      accuracy: this._patterns.overall.totalFeedback > 0
        ? this._patterns.overall.correctCount / this._patterns.overall.totalFeedback
        : 0,
    };
  }

  /**
   * Get current learning state
   *
   * @returns {Object} Learning state
   */
  getState() {
    return {
      weightModifiers: Object.fromEntries(this._weightModifiers),
      thresholdAdjustments: Object.fromEntries(
        [...this._thresholdAdjustments.entries()].map(([k, v]) => [k, Object.fromEntries(v)])
      ),
      queueSize: this._feedbackQueue.length,
      patterns: this.getPatterns(),
      config: {
        learningRate: this.learningRate,
        maxAdjustment: this.maxAdjustment,
        minFeedback: this.minFeedback,
        decayRate: this.decayRate,
      },
    };
  }

  /**
   * Get statistics summary
   *
   * @returns {Object} Statistics
   */
  getStats() {
    const patterns = this.getPatterns();
    const modifiedDimensions = [...this._weightModifiers.entries()]
      .filter(([, v]) => Math.abs(v - 1.0) > 0.01)
      .length;

    return {
      initialized: this._initialized,
      totalFeedback: patterns.overall.totalFeedback,
      accuracy: Math.round(patterns.accuracy * 1000) / 10, // percentage
      avgScoreError: Math.round(patterns.overall.avgScoreError * 10) / 10,
      learningIterations: patterns.overall.learningIterations,
      modifiedDimensions,
      itemTypesTracked: this._patterns.byItemType.size,
      insightsCount: patterns.insights.length,
      queueSize: this._feedbackQueue.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Load state from persistence
   * @private
   */
  async _loadState() {
    // Try to load from knowledge store if available
    if (this.persistence?.knowledge) {
      try {
        const results = await this.persistence.knowledge.search('learning_state', {
          category: 'system',
          limit: 1,
        });

        if (results.length > 0) {
          const saved = results[0].patterns;
          if (saved) {
            this.import(saved);
            this.emit('state-loaded', { source: 'persistence' });
          }
        }
      } catch (e) {
        // Ignore - start fresh
      }
    }
  }

  /**
   * Save state to persistence
   * @private
   */
  async _saveState() {
    if (this.persistence?.knowledge) {
      try {
        const state = this.export();
        await this.persistence.storeKnowledge({
          sourceType: 'system',
          sourceRef: 'learning_state',
          summary: `Learning state: ${this._patterns.overall.learningIterations} iterations`,
          content: JSON.stringify(state),
          category: 'system',
          patterns: state,
        });
      } catch (e) {
        // Ignore - learning still works in-memory
      }
    }
  }

  /**
   * Export learning state
   *
   * @returns {Object} Exportable state
   */
  export() {
    return {
      weightModifiers: Object.fromEntries(this._weightModifiers),
      thresholdAdjustments: Object.fromEntries(
        [...this._thresholdAdjustments.entries()].map(([k, v]) => [k, Object.fromEntries(v)])
      ),
      patterns: {
        byItemType: Object.fromEntries(this._patterns.byItemType),
        byDimension: Object.fromEntries(this._patterns.byDimension),
        overall: { ...this._patterns.overall },
      },
      exportedAt: Date.now(),
    };
  }

  /**
   * Import learning state
   *
   * @param {Object} state - Saved state
   */
  import(state) {
    if (state.weightModifiers) {
      for (const [dim, mod] of Object.entries(state.weightModifiers)) {
        this._weightModifiers.set(dim, mod);
      }
    }

    if (state.thresholdAdjustments) {
      for (const [itemType, dims] of Object.entries(state.thresholdAdjustments)) {
        this._thresholdAdjustments.set(itemType, new Map(Object.entries(dims)));
      }
    }

    if (state.patterns) {
      if (state.patterns.byItemType) {
        for (const [type, pattern] of Object.entries(state.patterns.byItemType)) {
          this._patterns.byItemType.set(type, pattern);
        }
      }
      if (state.patterns.byDimension) {
        for (const [dim, pattern] of Object.entries(state.patterns.byDimension)) {
          this._patterns.byDimension.set(dim, pattern);
        }
      }
      if (state.patterns.overall) {
        Object.assign(this._patterns.overall, state.patterns.overall);
      }
    }
  }

  /**
   * Reset all learning
   * USE WITH CAUTION - erases all learned adjustments
   */
  reset() {
    for (const dim of this._weightModifiers.keys()) {
      this._weightModifiers.set(dim, 1.0);
    }
    this._thresholdAdjustments.clear();
    this._patterns.byItemType.clear();
    this._patterns.byDimension.clear();
    this._patterns.overall = {
      totalFeedback: 0,
      correctCount: 0,
      incorrectCount: 0,
      avgScoreError: 0,
      learningIterations: 0,
    };
    this._feedbackQueue = [];

    this.emit('reset');
  }
}

export default LearningService;
