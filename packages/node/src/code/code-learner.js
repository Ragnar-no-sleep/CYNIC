/**
 * CYNIC Code Learner - C1.5 (CODE x LEARN)
 *
 * Closes the learning loop for code decisions:
 *   Decision (C1.3) -> Action (C1.4) -> [outcome] -> Learn (C1.5) -> adjust C1.3
 *
 * Responsibilities:
 * - Match USER_FEEDBACK to recent code decisions
 * - Feed outcomes to CodeDecider.recordOutcome() for calibration
 * - Query CodeEmergence patterns for Router awareness
 * - Generate code-specific DPO pairs for routing weight updates
 *
 * "Le chien apprend de ses erreurs, pas de ses certitudes" - kunikos
 *
 * @module @cynic/node/code/code-learner
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, createLogger, globalEventBus } from '@cynic/core';

const log = createLogger('CodeLearner');

/** Max recent decisions to search for feedback matching */
const MATCH_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/** Max DPO pairs to retain */
const MAX_DPO_PAIRS = 89; // Fib(11)

/**
 * CodeLearner - The C1.5 cell of the 7x7 matrix.
 * Bridges code decision outcomes back to calibration and routing.
 */
export class CodeLearner extends EventEmitter {
  constructor(options = {}) {
    super();

    /** @type {import('./code-decider.js').CodeDecider|null} */
    this._codeDecider = options.codeDecider || null;

    /** @type {import('../emergence/code-emergence.js').CodeEmergence|null} */
    this._codeEmergence = options.codeEmergence || null;

    /** @type {import('./code-actor.js').CodeActor|null} */
    this._codeActor = options.codeActor || null;

    // Recent decisions buffer for feedback matching
    this._recentDecisions = []; // [{ id, type, riskLevel, riskScore, confidence, riskFactors, ts }]
    this._maxRecentDecisions = 233; // Fib(13)

    // DPO pairs: code-specific preference pairs for routing weight training
    this._dpoPairs = []; // [{ preferred, rejected, context, ts }]

    // Learning stats
    this._stats = {
      feedbackProcessed: 0,
      outcomesMatched: 0,
      dpoPairsGenerated: 0,
      patternsQueried: 0,
      unmatchedFeedback: 0,
    };
  }

  /**
   * Register a code decision for later outcome matching.
   * Called by event-listeners when CODE_DECISION fires.
   *
   * @param {Object} decision - From CodeDecider.decide()
   */
  registerDecision(decision) {
    this._recentDecisions.push({
      id: decision.judgmentId || `cd_${Date.now()}`,
      type: decision.type || decision.decision,
      riskLevel: decision.risk || decision.riskLevel,
      riskScore: decision.riskScore || 0,
      confidence: decision.confidence || 0,
      riskFactors: decision.riskFactors || [],
      ts: Date.now(),
    });

    while (this._recentDecisions.length > this._maxRecentDecisions) {
      this._recentDecisions.shift();
    }
  }

  /**
   * Process feedback that may relate to a code decision.
   * Attempts to match the feedback to a recent decision and record the outcome.
   *
   * @param {Object} feedback
   * @param {string} feedback.type - 'positive', 'negative', 'correction'
   * @param {string} [feedback.judgmentId] - Direct match to judgment
   * @param {string} [feedback.context] - 'code', 'commit', 'review', etc.
   * @param {string} [feedback.reason] - Why the feedback was given
   * @returns {Object|null} Matched outcome or null
   */
  processFeedback(feedback) {
    this._stats.feedbackProcessed++;

    // Only process code-related feedback
    const codeContexts = ['code', 'commit', 'review', 'deploy', 'refactor'];
    if (feedback.context && !codeContexts.includes(feedback.context)) return null;

    // Try to match to a recent decision
    const match = this._findMatchingDecision(feedback);
    if (!match) {
      this._stats.unmatchedFeedback++;
      return null;
    }

    // Determine outcome
    const result = feedback.type === 'positive' ? 'success' : 'failure';

    // Record outcome in CodeDecider for calibration
    if (this._codeDecider) {
      this._codeDecider.recordOutcome({
        decisionType: match.type,
        riskLevel: match.riskLevel,
        riskScore: match.riskScore,
        confidence: match.confidence,
        result,
        reason: feedback.reason,
      });
    }

    this._stats.outcomesMatched++;

    const outcomeEvent = {
      cell: 'C1.5',
      dimension: 'CODE',
      analysis: 'LEARN',
      decisionId: match.id,
      decisionType: match.type,
      outcome: result,
      riskLevel: match.riskLevel,
      confidence: match.confidence,
      feedback: feedback.type,
      ts: Date.now(),
    };

    this.emit('outcome_matched', outcomeEvent);
    globalEventBus.emit('code:learning', outcomeEvent);

    log.debug('Feedback matched to decision', {
      decision: match.type, outcome: result, risk: match.riskLevel,
    });

    // Try to generate a DPO pair from contrasting decisions
    this._tryGenerateDpoPair(match, result);

    return outcomeEvent;
  }

  /**
   * Find a recent decision matching the feedback.
   *
   * @param {Object} feedback
   * @returns {Object|null}
   */
  _findMatchingDecision(feedback) {
    const now = Date.now();
    const candidates = this._recentDecisions.filter(d =>
      (now - d.ts) < MATCH_WINDOW_MS
    );

    // Direct match by judgmentId
    if (feedback.judgmentId) {
      return candidates.find(d => d.id === feedback.judgmentId) || null;
    }

    // Heuristic: match the most recent decision
    // (since feedback typically follows the last code decision)
    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  }

  /**
   * Try to generate a DPO pair from contrasting decisions at the same risk level.
   * A DPO pair = (preferred decision, rejected decision) for routing training.
   *
   * @param {Object} matchedDecision - The decision that got feedback
   * @param {string} outcome - 'success' or 'failure'
   */
  _tryGenerateDpoPair(matchedDecision, outcome) {
    // Find a contrasting decision at the same risk level with opposite outcome
    // We look at previously matched decisions stored in CodeDecider calibration
    if (!this._codeDecider) return;

    const calibration = this._codeDecider.getCalibrationStats();
    if (calibration.entries < 10) return; // Need enough data

    // Simple approach: if current = success, it's preferred over recent failures at same risk
    // If current = failure, recent successes at same risk are preferred
    const recent = this._recentDecisions.filter(d =>
      d.riskLevel === matchedDecision.riskLevel &&
      d.id !== matchedDecision.id
    );

    if (recent.length === 0) return;

    const pair = {
      preferred: outcome === 'success' ? matchedDecision : recent[recent.length - 1],
      rejected: outcome === 'success' ? recent[recent.length - 1] : matchedDecision,
      context: 'code_decision',
      riskLevel: matchedDecision.riskLevel,
      ts: Date.now(),
    };

    this._dpoPairs.push(pair);
    while (this._dpoPairs.length > MAX_DPO_PAIRS) this._dpoPairs.shift();
    this._stats.dpoPairsGenerated++;

    this.emit('dpo_pair', pair);
    log.debug('DPO pair generated', { risk: pair.riskLevel, preferred: pair.preferred.type, rejected: pair.rejected.type });
  }

  /**
   * Query code patterns from CodeEmergence for routing awareness.
   * Returns patterns that should influence routing decisions.
   *
   * @param {Object} [options]
   * @param {string} [options.filePath] - Filter to specific file
   * @param {string} [options.patternType] - Filter to pattern type
   * @returns {Object} Code context for routing
   */
  getCodeContext(options = {}) {
    this._stats.patternsQueried++;

    if (!this._codeEmergence) {
      return { patterns: [], hotspots: [], debtItems: 0, confidenceAdjustment: 0 };
    }

    let patterns = this._codeEmergence.getPatterns();

    if (options.patternType) {
      patterns = patterns.filter(p => p.type === options.patternType);
    }

    // Extract hotspots
    const hotspots = patterns
      .filter(p => p.type === 'hotspot')
      .map(p => p.filePath || p.data?.filePath)
      .filter(Boolean);

    // Check if requested file is a hotspot
    const isHotspot = options.filePath && hotspots.some(h =>
      options.filePath.includes(h) || h.includes(options.filePath)
    );

    // Compute confidence adjustment based on patterns
    let confidenceAdjustment = 0;
    if (isHotspot) confidenceAdjustment -= 0.15; // Hotspot = more cautious
    const complexityCreep = patterns.some(p => p.type === 'complexity_creep');
    if (complexityCreep) confidenceAdjustment -= 0.1;
    const simplificationTrend = patterns.some(p => p.type === 'simplification_trend');
    if (simplificationTrend) confidenceAdjustment += 0.05;

    // Clamp
    confidenceAdjustment = Math.max(-PHI_INV_2, Math.min(PHI_INV_2, confidenceAdjustment));

    // Debt items from CodeActor
    let debtItems = 0;
    if (this._codeActor) {
      debtItems = this._codeActor.getDebtLog().length;
    }

    return {
      patterns: patterns.slice(0, 21), // Fib(8) limit
      hotspots,
      isHotspot: !!isHotspot,
      debtItems,
      confidenceAdjustment,
      complexityCreep,
      simplificationTrend: !!simplificationTrend,
    };
  }

  /**
   * Get DPO pairs for routing weight training.
   *
   * @param {number} [limit=21]
   * @returns {Object[]}
   */
  getDpoPairs(limit = 21) {
    return this._dpoPairs.slice(-limit);
  }

  getStats() {
    return {
      ...this._stats,
      recentDecisions: this._recentDecisions.length,
      dpoPairs: this._dpoPairs.length,
    };
  }

  getHealth() {
    const matchRate = this._stats.feedbackProcessed > 0
      ? this._stats.outcomesMatched / this._stats.feedbackProcessed
      : 0;

    return {
      status: matchRate >= PHI_INV_2 ? 'learning' : 'collecting',
      score: Math.min(PHI_INV, matchRate),
      feedbackProcessed: this._stats.feedbackProcessed,
      outcomesMatched: this._stats.outcomesMatched,
      dpoPairsGenerated: this._stats.dpoPairsGenerated,
      matchRate,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let _instance = null;

export function getCodeLearner(options = {}) {
  if (!_instance) _instance = new CodeLearner(options);
  return _instance;
}

export function resetCodeLearner() {
  if (_instance) _instance.removeAllListeners();
  _instance = null;
}

export { MATCH_WINDOW_MS, MAX_DPO_PAIRS };

export default { CodeLearner, getCodeLearner, resetCodeLearner, MATCH_WINDOW_MS, MAX_DPO_PAIRS };
