/**
 * Cosmos Decider - C7.3 (COSMOS × DECIDE)
 *
 * Decides ecosystem-level actions based on CosmosJudge judgments.
 * Advisory: recommends focus shifts, resource rebalancing, interventions.
 *
 * "Le chien décide pour les étoiles" - κυνικός
 *
 * @module @cynic/node/cosmos/cosmos-decider
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3, createLogger, globalEventBus } from '@cynic/core';

const log = createLogger('CosmosDecider');

export const CosmosDecisionType = {
  ACCELERATE: 'accelerate',     // Increase activity/resourcing
  MAINTAIN: 'maintain',         // Hold current pace
  DECELERATE: 'decelerate',     // Reduce activity
  FOCUS: 'focus',               // Concentrate on key areas
  DIVERSIFY: 'diversify',       // Expand to underserved repos
  INTERVENE: 'intervene',       // Signal alert, need human attention
  WAIT: 'wait',                 // Hold decision pending more data
};

const DECISION_THRESHOLDS = {
  accelerate: 75,  // HOWL territory — ecosystem thriving
  maintain: 55,    // WAG territory — healthy baseline
  decelerate: 40,  // Above GROWL — needs slowing
  intervene: 30,   // Below GROWL — needs attention
};

export class CosmosDecider extends EventEmitter {
  constructor(options = {}) {
    super();

    this._history = [];
    this._maxHistory = 89; // Fib(11)

    this._stats = {
      totalDecisions: 0,
      byType: {},
      lastDecision: null,
    };

    for (const type of Object.values(CosmosDecisionType)) {
      this._stats.byType[type] = 0;
    }
  }

  /**
   * Decide based on a cosmos judgment
   *
   * @param {Object} judgment - From CosmosJudge.judge()
   * @param {Object} [context] - Additional context
   * @returns {Object} Decision result
   */
  decide(judgment, context = {}) {
    const score = judgment.score || 0;
    const verdict = judgment.verdict || 'BARK';
    const type = judgment.type || 'unknown';

    // Extract factors
    const factors = this._extractFactors(judgment, context);

    // Calculate confidence
    const confidence = this._calculateConfidence(factors);

    // Make decision
    const decision = this._makeDecision(score, verdict, factors);

    const result = {
      decision: decision.type,
      reason: decision.reason,
      confidence,
      score,
      verdict,
      factors,
      judgmentType: type,
      cell: 'C7.3',
      dimension: 'COSMOS',
      analysis: 'DECIDE',
      timestamp: Date.now(),
    };

    this._updateStats(result);
    this._history.push(result);
    while (this._history.length > this._maxHistory) this._history.shift();

    this.emit('decision', result);
    globalEventBus.publish('cosmos:decision', {
      decision: result,
      judgment,
    }, { source: 'CosmosDecider' });

    log.debug('Cosmos decision', { decision: decision.type, score, confidence });

    return result;
  }

  /**
   * Extract decision factors from judgment
   * @private
   */
  _extractFactors(judgment, context) {
    const scores = judgment.scores || {};

    return {
      coherence: scores.coherence || 50,
      utility: scores.utility || 50,
      sustainability: scores.sustainability || 50,
      observationCount: context.observationCount || 0,
      recentTrend: context.trend || 'stable', // rising/stable/falling
      consensusLevel: context.consensus || PHI_INV_2,
    };
  }

  /**
   * Calculate decision confidence
   * @private
   */
  _calculateConfidence(factors) {
    let confidence = PHI_INV; // Start at max

    // Low observation count → lower confidence
    if (factors.observationCount < 5) confidence *= 0.6;
    else if (factors.observationCount < 13) confidence *= 0.8;

    // Low consensus → lower confidence
    if (factors.consensusLevel < PHI_INV_3) confidence *= 0.7;

    // Falling trend → slightly lower confidence (things changing)
    if (factors.recentTrend === 'falling') confidence *= 0.9;

    return Math.min(PHI_INV, Math.round(confidence * 1000) / 1000);
  }

  /**
   * Make the actual decision
   * @private
   */
  _makeDecision(score, verdict, factors) {
    // Not enough data — wait
    if (factors.observationCount < 3) {
      return {
        type: CosmosDecisionType.WAIT,
        reason: 'Insufficient data — fewer than 3 observations.',
      };
    }

    // Very low coherence with falling trend — intervene
    if (score < DECISION_THRESHOLDS.intervene && factors.recentTrend === 'falling') {
      return {
        type: CosmosDecisionType.INTERVENE,
        reason: `Ecosystem score ${score} with falling trend. Human attention needed.`,
      };
    }

    // BARK — decide between decelerate and intervene
    if (verdict === 'BARK') {
      return {
        type: CosmosDecisionType.DECELERATE,
        reason: `Low ecosystem health (${score}). Reduce activity and stabilize.`,
      };
    }

    // GROWL — low sustainability → focus, low utility → diversify
    if (verdict === 'GROWL') {
      if (factors.sustainability < factors.utility) {
        return {
          type: CosmosDecisionType.FOCUS,
          reason: `Sustainability (${factors.sustainability}) below utility (${factors.utility}). Focus on key repos.`,
        };
      }
      return {
        type: CosmosDecisionType.DIVERSIFY,
        reason: `Utility (${factors.utility}) below sustainability (${factors.sustainability}). Expand to underserved areas.`,
      };
    }

    // WAG — maintain
    if (verdict === 'WAG') {
      return {
        type: CosmosDecisionType.MAINTAIN,
        reason: `Ecosystem healthy (${score}). Maintain current pace.`,
      };
    }

    // HOWL — accelerate
    return {
      type: CosmosDecisionType.ACCELERATE,
      reason: `Ecosystem thriving (${score}). Conditions favorable for acceleration.`,
    };
  }

  _updateStats(result) {
    this._stats.totalDecisions++;
    this._stats.byType[result.decision] = (this._stats.byType[result.decision] || 0) + 1;
    this._stats.lastDecision = Date.now();
  }

  getStats() { return { ...this._stats }; }

  getHistory(limit = 21) {
    return this._history.slice(-limit);
  }

  getHealth() {
    const total = this._stats.totalDecisions;
    const interventionRate = total > 0
      ? (this._stats.byType[CosmosDecisionType.INTERVENE] || 0) / total
      : 0;

    return {
      status: interventionRate < PHI_INV_3 ? 'healthy' : 'high_intervention',
      score: Math.min(PHI_INV, 1 - interventionRate),
      totalDecisions: total,
      interventionRate,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

export function getCosmosDecider(options = {}) {
  if (!_instance) _instance = new CosmosDecider(options);
  return _instance;
}

export function resetCosmosDecider() {
  if (_instance) _instance.removeAllListeners();
  _instance = null;
}

export default { CosmosDecider, CosmosDecisionType, getCosmosDecider, resetCosmosDecider };
