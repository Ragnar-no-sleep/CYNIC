/**
 * @cynic/agent - Learner Module
 *
 * Learns from outcomes via UnifiedSignal pipeline.
 * "Le chien se souvient" - κυνικός
 *
 * @module @cynic/agent/learner
 */

'use strict';

import { EventEmitter } from 'eventemitter3';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { PHI_INV, PHI_INV_2, createLogger, globalEventBus, EventType } from '@cynic/core';

const log = createLogger('Learner');

// Persistence file for cross-restart learning
const CYNIC_DIR = join(homedir(), '.cynic');
const LEARNER_STATE_FILE = join(CYNIC_DIR, 'learner-state.json');

// Lazy-load UnifiedSignalStore to avoid circular deps
let _signalStore = null;
async function getSignalStore() {
  if (_signalStore) return _signalStore;
  try {
    const { getUnifiedSignalStore } = await import('@cynic/node');
    _signalStore = getUnifiedSignalStore();
    return _signalStore;
  } catch (e) {
    log.debug('UnifiedSignalStore not available', { error: e.message });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  // Outcome evaluation delay
  evaluationDelay: 30000, // 30s

  // Learning rate (how fast we adapt)
  learningRate: PHI_INV_2, // 38.2%

  // Minimum samples before adjusting
  minSamples: 5,

  // Persistence: always persist — CYNIC remembers everything
  persistSignals: process.env.PERSIST_SIGNALS !== 'false',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Outcome Types
// ═══════════════════════════════════════════════════════════════════════════════

export const OutcomeType = {
  PROFITABLE: 'profitable',     // Made money
  BREAKEVEN: 'breakeven',       // ~0% return
  LOSS: 'loss',                 // Lost money
  MISSED_OPPORTUNITY: 'missed', // Should have acted but didn't
  AVOIDED_LOSS: 'avoided_loss', // Correctly didn't act
};

// ═══════════════════════════════════════════════════════════════════════════════
// Learner Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Learner - Learns from trading outcomes
 *
 * Integrates with CYNIC's UnifiedSignal system for:
 * - RLHF-style feedback on judgments
 * - DPO pairing (correct vs incorrect decisions)
 * - Q-learning episodes for strategy refinement
 */
export class Learner extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = { ...DEFAULT_CONFIG, ...options };

    // Action records pending evaluation
    this.pendingActions = new Map();

    // Learning state
    this.lessons = [];
    this.maxLessons = 200;

    // Dimension adjustments from learning
    this.dimensionAdjustments = {};

    // Pattern recognition
    this.patterns = new Map();

    // Metrics
    this.metrics = {
      actionsRecorded: 0,
      outcomesEvaluated: 0,
      lessonsLearned: 0,
      patternsDetected: 0,
      totalPnL: 0,
      winRate: 0,
      wins: 0,
      losses: 0,
    };

    // Action outcome tracking for Thompson Sampling (Beta distribution)
    this.actionOutcomes = {
      BUY: { successes: 1, failures: 1 },   // Beta(1,1) = uniform prior
      SELL: { successes: 1, failures: 1 },
      HOLD: { successes: 1, failures: 1 },
    };

    // Load persisted state from previous sessions
    this._loadPersistedState();
  }

  /**
   * Record an action for later evaluation
   *
   * @param {Object} actionData - Action data including opportunity, judgment, decision, result
   */
  recordAction(actionData) {
    const { opportunity, judgment, decision, result } = actionData;

    const record = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      opportunity,
      judgment,
      decision,
      result,
      outcome: null, // To be filled by evaluateOutcome
    };

    this.pendingActions.set(record.id, record);
    this.metrics.actionsRecorded++;

    log.debug('Action recorded', {
      id: record.id,
      action: decision.action,
      qScore: judgment.qScore,
    });

    return record;
  }

  /**
   * Evaluate the outcome of an action
   *
   * @param {Object} actionResult - The action result to evaluate
   * @returns {Object} Outcome evaluation
   */
  async evaluateOutcome(actionResult) {
    this.metrics.outcomesEvaluated++;

    // Find pending action record
    let record = null;
    for (const [id, rec] of this.pendingActions) {
      if (rec.result?.id === actionResult.id) {
        record = rec;
        this.pendingActions.delete(id);
        break;
      }
    }

    if (!record) {
      // Create minimal record for standalone evaluation
      record = {
        id: `eval_${Date.now()}`,
        timestamp: Date.now(),
        result: actionResult,
      };
    }

    // Calculate P&L (simplified for simulation)
    let pnl = 0;
    let outcomeType = OutcomeType.BREAKEVEN;

    if (actionResult.simulated) {
      // Use simulated P&L
      pnl = actionResult.simulatedPnL || 0;
    } else {
      // In production, would check actual token price change
      pnl = 0; // Would fetch from chain
    }

    // Determine outcome type
    if (pnl > 0.01) {
      outcomeType = OutcomeType.PROFITABLE;
      this.metrics.wins++;
    } else if (pnl < -0.01) {
      outcomeType = OutcomeType.LOSS;
      this.metrics.losses++;
    } else {
      outcomeType = OutcomeType.BREAKEVEN;
    }

    this.metrics.totalPnL += pnl;
    this.metrics.winRate = this.metrics.wins / (this.metrics.wins + this.metrics.losses) || 0;

    // Create outcome
    const outcome = {
      id: `out_${Date.now()}`,
      recordId: record.id,
      timestamp: Date.now(),
      outcomeType,
      pnl,
      pnlPercent: pnl * 100,
      success: actionResult.success,
    };

    record.outcome = outcome;

    // Extract lesson
    const lesson = await this._extractLesson(record, outcome);
    if (lesson) {
      this._recordLesson(lesson);
      this.emit('lesson', lesson);
    }

    // Create UnifiedSignal for learning pipeline
    const signal = this._createUnifiedSignal(record, outcome);

    // Persist if enabled
    if (this.config.persistSignals) {
      await this._persistSignal(signal);
    }

    // Update Thompson Sampling (Beta distribution) for action taken
    const action = record.decision?.action;
    if (action && this.actionOutcomes[action]) {
      if (outcomeType === OutcomeType.PROFITABLE) {
        this.actionOutcomes[action].successes++;
      } else if (outcomeType === OutcomeType.LOSS) {
        this.actionOutcomes[action].failures++;
      }
    }

    // Emit to globalEventBus for collective learning
    globalEventBus.emit(EventType.USER_FEEDBACK, {
      id: outcome.id,
      payload: {
        source: 'cynic-agent',
        outcomeType,
        pnl,
        success: actionResult.success,
        winRate: this.metrics.winRate,
      },
    });

    log.info('Outcome evaluated', {
      outcomeType,
      pnl: (pnl * 100).toFixed(2) + '%',
      winRate: (this.metrics.winRate * 100).toFixed(1) + '%',
    });

    return outcome;
  }

  /**
   * Extract a lesson from the record and outcome
   * @private
   */
  async _extractLesson(record, outcome) {
    if (!record.judgment) return null;

    const { judgment, decision, result } = record;
    const { outcomeType, pnl } = outcome;

    // Determine if we should learn from this
    const isSignificant = Math.abs(pnl) > 0.02 || !result.success;

    if (!isSignificant) return null;

    // Find which dimensions contributed to the outcome
    const contributingDimensions = this._findContributingDimensions(judgment.scores, outcomeType);

    const lesson = {
      id: `les_${Date.now()}`,
      timestamp: Date.now(),
      outcomeType,
      pnl,
      qScore: judgment.qScore,
      confidence: judgment.confidence,
      verdict: judgment.verdict,
      action: decision.action,

      // What we learned
      contributingDimensions,
      recommendation: this._generateRecommendation(outcomeType, contributingDimensions),

      // For DPO pairing
      isPositive: outcomeType === OutcomeType.PROFITABLE,
      isNegative: outcomeType === OutcomeType.LOSS,
    };

    return lesson;
  }

  /**
   * Find dimensions that contributed to outcome
   * @private
   */
  _findContributingDimensions(scores, outcomeType) {
    const contributing = [];

    for (const [dim, score] of Object.entries(scores)) {
      // High scores on losses = dimension failed us
      if (outcomeType === OutcomeType.LOSS && score > 0.6) {
        contributing.push({ dimension: dim, score, contribution: 'false_positive' });
      }

      // Low scores on wins = dimension was overcautious
      if (outcomeType === OutcomeType.PROFITABLE && score < 0.4) {
        contributing.push({ dimension: dim, score, contribution: 'false_negative' });
      }
    }

    return contributing.slice(0, 5); // Top 5 contributors
  }

  /**
   * Generate recommendation from lesson
   * @private
   */
  _generateRecommendation(outcomeType, contributingDimensions) {
    if (contributingDimensions.length === 0) {
      return 'No clear pattern detected';
    }

    const dim = contributingDimensions[0];

    if (dim.contribution === 'false_positive') {
      return `Reduce weight on "${dim.dimension}" - scored ${(dim.score * 100).toFixed(0)}% but led to loss`;
    }

    if (dim.contribution === 'false_negative') {
      return `Increase weight on "${dim.dimension}" - scored ${(dim.score * 100).toFixed(0)}% but outcome was positive`;
    }

    return 'Continue monitoring pattern';
  }

  /**
   * Create UnifiedSignal for learning pipeline
   * @private
   */
  _createUnifiedSignal(record, outcome) {
    return {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      source: 'AGENT_EXECUTION',
      sessionId: record.id,

      // Input (what we saw)
      input: {
        itemType: 'trading_opportunity',
        itemHash: record.opportunity?.id,
        tool: 'cynic-agent',
        dog: 'Oracle', // Primary dog for trading
        taskType: 'trade_evaluation',
      },

      // Judgment (what we decided)
      judgment: record.judgment ? {
        qScore: record.judgment.qScore,
        confidence: record.judgment.confidence,
        verdict: record.judgment.verdict,
        judgmentId: record.judgment.id,
      } : null,

      // Outcome (ground truth)
      outcome: {
        status: outcome.success ? 'CORRECT' : 'INCORRECT',
        actualScore: outcome.pnl > 0 ? 75 : outcome.pnl < 0 ? 25 : 50,
        reason: outcome.outcomeType,
      },

      // Learning
      learning: {
        reward: outcome.pnl,
        scoreDelta: record.judgment
          ? (outcome.pnl > 0 ? 75 : 25) - record.judgment.qScore
          : 0,
        feedbackType: outcome.outcomeType === OutcomeType.PROFITABLE
          ? 'POSITIVE'
          : outcome.outcomeType === OutcomeType.LOSS
            ? 'NEGATIVE'
            : 'NEUTRAL',
        canPair: outcome.outcomeType !== OutcomeType.BREAKEVEN,
        isChosen: outcome.outcomeType === OutcomeType.PROFITABLE,
      },
    };
  }

  /**
   * Persist signal to UnifiedSignalStore
   * @private
   */
  async _persistSignal(signal) {
    try {
      const store = await getSignalStore();
      if (!store) {
        log.debug('Signal store not available, skipping persistence', { id: signal.id });
        return;
      }

      await store.record(signal);
      log.debug('Signal persisted to UnifiedSignalStore', { id: signal.id });
    } catch (e) {
      log.warn('Failed to persist signal', { id: signal.id, error: e.message });
    }
  }

  /**
   * Record lesson to history
   * @private
   */
  _recordLesson(lesson) {
    this.lessons.push(lesson);
    this.metrics.lessonsLearned++;

    while (this.lessons.length > this.maxLessons) {
      this.lessons.shift();
    }

    // Update dimension adjustments
    for (const contrib of lesson.contributingDimensions) {
      const current = this.dimensionAdjustments[contrib.dimension] || 0;

      if (contrib.contribution === 'false_positive') {
        // Reduce weight
        this.dimensionAdjustments[contrib.dimension] = current - this.config.learningRate * 0.1;
      } else if (contrib.contribution === 'false_negative') {
        // Increase weight
        this.dimensionAdjustments[contrib.dimension] = current + this.config.learningRate * 0.1;
      }
    }

    log.info('Lesson learned', {
      outcomeType: lesson.outcomeType,
      recommendation: lesson.recommendation,
    });

    // Persist state after each lesson
    this._persistState();
  }

  /**
   * Get dimension weight adjustments
   *
   * @returns {Object} Map of dimension → adjustment
   */
  getDimensionAdjustments() {
    return { ...this.dimensionAdjustments };
  }

  /**
   * Get recent lessons
   */
  getLessons(limit = 20) {
    return this.lessons.slice(-limit);
  }

  /**
   * Get Thompson Sampling scores for each action.
   * Samples from Beta(successes, failures) for each action.
   *
   * @returns {Object} Map of action → sampled probability
   */
  getActionScores() {
    const scores = {};
    for (const [action, { successes, failures }] of Object.entries(this.actionOutcomes)) {
      // Beta distribution mean: α / (α + β)
      // Using mean instead of random sample for deterministic decisions
      scores[action] = successes / (successes + failures);
    }
    return scores;
  }

  /**
   * Get adaptive confidence threshold based on win rate.
   * High win rate → slightly lower threshold (more aggressive).
   * Low win rate → higher threshold (more cautious).
   * Always φ-bounded.
   *
   * @returns {number} Adaptive minConfidenceToAct
   */
  getAdaptiveThreshold() {
    const { wins, losses } = this.metrics;
    const total = wins + losses;

    if (total < this.config.minSamples) {
      return PHI_INV_2; // Default until we have enough data
    }

    const winRate = this.metrics.winRate;

    // Interpolate between cautious (PHI_INV_2 = 38.2%) and aggressive (PHI_INV_3 = 23.6%)
    // winRate 0% → PHI_INV_2 (38.2%), winRate 61.8% → PHI_INV_2 * 0.75 (28.6%)
    // Never go below PHI_INV_3 (23.6%) - always maintain minimum skepticism
    const PHI_INV_3 = 0.236;
    const threshold = PHI_INV_2 - (winRate * (PHI_INV_2 - PHI_INV_3));
    return Math.max(PHI_INV_3, Math.min(PHI_INV_2, threshold));
  }

  /**
   * Persist learning state to disk (survives restarts)
   * @private
   */
  _persistState() {
    try {
      if (!existsSync(CYNIC_DIR)) {
        mkdirSync(CYNIC_DIR, { recursive: true });
      }

      const state = {
        version: 1,
        updatedAt: Date.now(),
        dimensionAdjustments: this.dimensionAdjustments,
        actionOutcomes: this.actionOutcomes,
        metrics: {
          wins: this.metrics.wins,
          losses: this.metrics.losses,
          winRate: this.metrics.winRate,
          totalPnL: this.metrics.totalPnL,
          lessonsLearned: this.metrics.lessonsLearned,
        },
      };

      writeFileSync(LEARNER_STATE_FILE, JSON.stringify(state, null, 2));
      log.debug('Learner state persisted', { file: LEARNER_STATE_FILE });
    } catch (e) {
      log.warn('Failed to persist learner state', { error: e.message });
    }
  }

  /**
   * Load persisted state from disk
   * @private
   */
  _loadPersistedState() {
    try {
      if (!existsSync(LEARNER_STATE_FILE)) return;

      const data = JSON.parse(readFileSync(LEARNER_STATE_FILE, 'utf8'));

      // Only load if version matches and data is recent (< 30 days)
      if (data.version !== 1) return;
      if (data.updatedAt && (Date.now() - data.updatedAt) > 30 * 24 * 60 * 60 * 1000) {
        log.info('Persisted learner state too old, starting fresh');
        return;
      }

      if (data.dimensionAdjustments) {
        this.dimensionAdjustments = data.dimensionAdjustments;
      }

      if (data.actionOutcomes) {
        this.actionOutcomes = { ...this.actionOutcomes, ...data.actionOutcomes };
      }

      if (data.metrics) {
        this.metrics.wins = data.metrics.wins || 0;
        this.metrics.losses = data.metrics.losses || 0;
        this.metrics.winRate = data.metrics.winRate || 0;
        this.metrics.totalPnL = data.metrics.totalPnL || 0;
        this.metrics.lessonsLearned = data.metrics.lessonsLearned || 0;
      }

      log.info('Learner state restored from disk', {
        adjustments: Object.keys(this.dimensionAdjustments).length,
        winRate: (this.metrics.winRate * 100).toFixed(1) + '%',
        lessons: this.metrics.lessonsLearned,
      });
    } catch (e) {
      log.debug('No persisted learner state found', { error: e.message });
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      metrics: { ...this.metrics },
      pendingActions: this.pendingActions.size,
      lessonsCount: this.lessons.length,
      dimensionAdjustments: Object.keys(this.dimensionAdjustments).length,
      actionOutcomes: { ...this.actionOutcomes },
      adaptiveThreshold: this.getAdaptiveThreshold(),
      winRate: this.metrics.winRate,
      totalPnL: this.metrics.totalPnL,
    };
  }
}

export default Learner;
