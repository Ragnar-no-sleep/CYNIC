/**
 * Cosmos Accountant - C7.6 (COSMOS × ACCOUNT)
 *
 * Tracks economic value of ecosystem-level interactions in the 7×7 Fractal Matrix.
 * Measures cross-domain patterns, partner syncs, resource flows, and collective value.
 *
 * "Le chien compte les étoiles" - CYNIC tracks cosmic capital
 *
 * @module @cynic/node/accounting/cosmos-accountant
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Value flow types (ecosystem-level operations)
 */
export const ValueFlowType = {
  PATTERN_DETECTED: 'pattern_detected',
  CROSS_DOMAIN_SYNC: 'cross_domain_sync',
  EMERGENCE_SIGNAL: 'emergence_signal',
  ECOSYSTEM_EVENT: 'ecosystem_event',
  RESOURCE_CONSUMED: 'resource_consumed',
  RESOURCE_PRODUCED: 'resource_produced',
};

/**
 * Flow direction weights (φ-aligned)
 */
const FLOW_WEIGHTS = {
  [ValueFlowType.PATTERN_DETECTED]: PHI_INV_2,      // 0.382 - discovery
  [ValueFlowType.CROSS_DOMAIN_SYNC]: PHI_INV,       // 0.618 - integration is high value
  [ValueFlowType.EMERGENCE_SIGNAL]: PHI_INV,         // 0.618 - new patterns are valuable
  [ValueFlowType.ECOSYSTEM_EVENT]: PHI_INV_3,        // 0.236 - routine events
  [ValueFlowType.RESOURCE_CONSUMED]: 0.3,            // cost
  [ValueFlowType.RESOURCE_PRODUCED]: PHI_INV_2,      // 0.382 - production
};

/**
 * CosmosAccountant - Track economic value of ecosystem interactions
 */
export class CosmosAccountant extends EventEmitter {
  constructor(options = {}) {
    super();

    this.telemetry = options.telemetry || null;
    this.factsRepo = options.factsRepo || null;

    this._sessionMetrics = {
      totalFlows: 0,
      totalValueIn: 0,
      totalValueOut: 0,
      netValue: 0,
      patternsDetected: 0,
      crossDomainSyncs: 0,
      emergenceSignals: 0,
      totalValueScore: 0,
      byDomain: new Map(),
      startTime: Date.now(),
    };

    this._history = [];
    this._maxHistory = 1000;
  }

  /**
   * Track a value flow or ecosystem event
   *
   * @param {Object} flow - The flow to track
   * @param {string} flow.type - ValueFlowType
   * @param {string} [flow.direction] - 'in' or 'out'
   * @param {number} [flow.magnitude] - Size of the flow (0-1)
   * @param {string} [flow.domain] - Source domain (code, solana, social, etc.)
   * @param {string} [flow.targetDomain] - Target domain for cross-domain
   * @param {number} [flow.significance] - Pattern significance (0-1)
   * @param {Object} [metadata] - Additional metadata
   * @returns {Object} Flow accounting result
   */
  trackValueFlow(flow, metadata = {}) {
    const {
      type = ValueFlowType.ECOSYSTEM_EVENT,
      direction = 'in',
      magnitude = 0,
      domain = 'unknown',
      targetDomain = null,
      significance = 0,
    } = flow;

    const timestamp = Date.now();

    // Calculate flow value
    const flowValue = this._calculateFlowValue(type, magnitude, significance);

    // Calculate efficiency
    const efficiency = this._calculateEfficiency(flowValue, type);

    const result = {
      timestamp,
      type,
      direction,
      domain,
      targetDomain,
      metrics: {
        magnitude,
        significance,
        flowValue,
        efficiency,
      },
      valueScore: flowValue,
    };

    this._updateSessionMetrics(result);
    this._addToHistory(result);

    this.emit('value_flow_tracked', result);

    if (this.factsRepo) {
      this._storeFact(result, metadata).catch(() => {});
    }

    return result;
  }

  /**
   * Calculate flow value (φ-bounded)
   * @private
   */
  _calculateFlowValue(type, magnitude, significance) {
    const weight = FLOW_WEIGHTS[type] || PHI_INV_3;
    let value = (magnitude + significance) * weight;

    // Cross-domain syncs get bonus (integration is valuable)
    if (type === ValueFlowType.CROSS_DOMAIN_SYNC) {
      value *= 1.2;
    }

    // Emergence signals are rare and valuable
    if (type === ValueFlowType.EMERGENCE_SIGNAL) {
      value *= 1.3;
    }

    return Math.min(Math.round(value * 1000) / 1000, PHI_INV);
  }

  /**
   * Calculate flow efficiency
   * @private
   */
  _calculateEfficiency(flowValue, type) {
    // Resource consumption has a cost; everything else is gain
    const cost = type === ValueFlowType.RESOURCE_CONSUMED ? flowValue : 0;
    const gain = type !== ValueFlowType.RESOURCE_CONSUMED ? flowValue : 0;
    const eff = gain / (gain + cost + 0.01);
    return Math.min(eff, PHI_INV);
  }

  /**
   * Update session metrics
   * @private
   */
  _updateSessionMetrics(result) {
    this._sessionMetrics.totalFlows++;
    this._sessionMetrics.totalValueScore += result.valueScore;

    if (result.direction === 'in') {
      this._sessionMetrics.totalValueIn += result.valueScore;
    } else {
      this._sessionMetrics.totalValueOut += result.valueScore;
    }
    this._sessionMetrics.netValue =
      this._sessionMetrics.totalValueIn - this._sessionMetrics.totalValueOut;

    // Track by type
    if (result.type === ValueFlowType.PATTERN_DETECTED) this._sessionMetrics.patternsDetected++;
    if (result.type === ValueFlowType.CROSS_DOMAIN_SYNC) this._sessionMetrics.crossDomainSyncs++;
    if (result.type === ValueFlowType.EMERGENCE_SIGNAL) this._sessionMetrics.emergenceSignals++;

    // Track by domain
    const domainCount = this._sessionMetrics.byDomain.get(result.domain) || 0;
    this._sessionMetrics.byDomain.set(result.domain, domainCount + 1);
  }

  /**
   * Add to history
   * @private
   */
  _addToHistory(result) {
    this._history.push(result);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  /**
   * Store as fact in repository
   * @private
   */
  async _storeFact(result, metadata) {
    if (!this.factsRepo) return;

    await this.factsRepo.create({
      userId: metadata.userId || 'system',
      sessionId: metadata.sessionId,
      factType: 'cosmos_value_flow_accounting',
      subject: result.type,
      content: JSON.stringify({
        metrics: result.metrics,
        value: result.valueScore,
        domain: result.domain,
        targetDomain: result.targetDomain,
      }),
      confidence: PHI_INV_2,
      source: 'cosmos-accountant',
      context: {
        direction: result.direction,
        significance: result.metrics.significance,
      },
    });
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this._sessionMetrics.startTime;
    const total = this._sessionMetrics.totalFlows;

    return {
      duration,
      totalFlows: total,
      valueIn: this._sessionMetrics.totalValueIn,
      valueOut: this._sessionMetrics.totalValueOut,
      netValue: this._sessionMetrics.netValue,
      patterns: {
        detected: this._sessionMetrics.patternsDetected,
        crossDomainSyncs: this._sessionMetrics.crossDomainSyncs,
        emergenceSignals: this._sessionMetrics.emergenceSignals,
      },
      value: {
        total: this._sessionMetrics.totalValueScore,
        perFlow: total > 0 ? this._sessionMetrics.totalValueScore / total : 0,
        efficiency: duration > 0
          ? this._sessionMetrics.totalValueScore / (duration / 1000)
          : 0,
      },
      byDomain: Object.fromEntries(this._sessionMetrics.byDomain),
    };
  }

  /**
   * Get historical trends
   */
  getTrends(windowSize = 10) {
    if (this._history.length < 2) return null;

    const recent = this._history.slice(-windowSize);
    const older = this._history.slice(-windowSize * 2, -windowSize);

    if (older.length === 0) return null;

    const recentAvgValue = recent.reduce((s, r) => s + r.valueScore, 0) / recent.length;
    const olderAvgValue = older.reduce((s, r) => s + r.valueScore, 0) / older.length;

    return {
      value: {
        current: recentAvgValue,
        previous: olderAvgValue,
        trend: recentAvgValue > olderAvgValue ? 'improving' : 'declining',
        delta: recentAvgValue - olderAvgValue,
      },
    };
  }

  /**
   * Reset session metrics
   */
  resetSession() {
    this._sessionMetrics = {
      totalFlows: 0,
      totalValueIn: 0,
      totalValueOut: 0,
      netValue: 0,
      patternsDetected: 0,
      crossDomainSyncs: 0,
      emergenceSignals: 0,
      totalValueScore: 0,
      byDomain: new Map(),
      startTime: Date.now(),
    };
    this.emit('session_reset');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

export function getCosmosAccountant(options = {}) {
  if (!_instance) {
    _instance = new CosmosAccountant(options);
  }
  return _instance;
}

export function resetCosmosAccountant() {
  if (_instance) {
    _instance.removeAllListeners();
  }
  _instance = null;
}

export default {
  CosmosAccountant,
  ValueFlowType,
  getCosmosAccountant,
  resetCosmosAccountant,
};
