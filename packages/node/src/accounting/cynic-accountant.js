/**
 * CYNIC Accountant - C6.6 (CYNIC × ACCOUNT)
 *
 * Tracks CYNIC's internal economics in the 7×7 Fractal Matrix.
 * Part of the ACCOUNT column activation.
 *
 * "Le chien connaît son propre coût" - CYNIC knows its own cost
 *
 * @module @cynic/node/accounting/cynic-accountant
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Operation types for tracking
 */
export const OperationType = {
  JUDGMENT: 'judgment',
  ORCHESTRATION: 'orchestration',
  ROUTING: 'routing',
  LEARNING: 'learning',
  MEMORY: 'memory',
  PERCEPTION: 'perception',
  ACTION: 'action',
};

/**
 * Dog efficiency thresholds (φ-aligned)
 */
const EFFICIENCY_THRESHOLDS = {
  excellent: PHI_INV,      // > 61.8%
  good: PHI_INV_2,         // > 38.2%
  acceptable: PHI_INV_3,   // > 23.6%
  poor: 0,                 // <= 23.6%
};

/**
 * CynicAccountant - Track CYNIC's internal economics
 */
export class CynicAccountant extends EventEmitter {
  constructor(options = {}) {
    super();

    this.telemetry = options.telemetry || null;

    // Per-dog metrics
    this._dogMetrics = new Map();

    // Operation tracking
    this._operations = [];
    this._maxOperations = 5000;

    // Session totals
    this._sessionTotals = {
      operations: 0,
      tokensUsed: 0,
      totalLatency: 0,
      accurateJudgments: 0,
      totalJudgments: 0,
      startTime: Date.now(),
    };

    // Efficiency tracking (sliding window)
    this._efficiencyWindow = [];
    this._efficiencyWindowSize = 100;
  }

  /**
   * Track an operation by a Dog
   *
   * @param {string} dogId - ID of the dog performing operation
   * @param {string} operationType - Type of operation (from OperationType)
   * @param {Object} metrics - Operation metrics
   * @param {number} [metrics.tokensUsed] - Tokens consumed
   * @param {number} [metrics.latencyMs] - Operation latency in ms
   * @param {boolean} [metrics.wasSuccessful] - Did operation succeed
   * @param {number} [metrics.confidenceProduced] - Confidence of output
   * @param {Object} [result] - Operation result for accuracy tracking
   * @returns {Object} Tracking result
   */
  trackOperation(dogId, operationType, metrics = {}, result = null) {
    const {
      tokensUsed = 0,
      latencyMs = 0,
      wasSuccessful = true,
      confidenceProduced = PHI_INV_2,
    } = metrics;

    const timestamp = Date.now();

    // Calculate useful work (φ-bounded)
    const usefulWork = this._calculateUsefulWork(metrics, result);

    // Calculate efficiency
    const efficiency = this._calculateEfficiency(usefulWork, tokensUsed, latencyMs);

    // Build operation record
    const operation = {
      dogId,
      operationType,
      timestamp,
      tokensUsed,
      latencyMs,
      wasSuccessful,
      confidenceProduced,
      usefulWork,
      efficiency,
      efficiencyRating: this._rateEfficiency(efficiency),
    };

    // Update dog metrics
    this._updateDogMetrics(dogId, operation);

    // Update session totals
    this._updateSessionTotals(operation);

    // Add to operations history
    this._addOperation(operation);

    // Update efficiency window
    this._updateEfficiencyWindow(efficiency);

    // Emit for listeners
    this.emit('operation_tracked', operation);

    // Alert on poor efficiency
    if (operation.efficiencyRating === 'poor') {
      this.emit('efficiency_alert', {
        dogId,
        operationType,
        efficiency,
        threshold: EFFICIENCY_THRESHOLDS.acceptable,
      });
    }

    return operation;
  }

  /**
   * Track feedback for accuracy calculation
   *
   * @param {string} operationId - Original operation identifier
   * @param {boolean} wasAccurate - Was the judgment/action accurate
   * @param {Object} [context] - Additional feedback context
   */
  trackFeedback(dogId, wasAccurate, context = {}) {
    // Update dog accuracy
    const dogMetrics = this._getDogMetrics(dogId);
    dogMetrics.feedbackReceived++;
    if (wasAccurate) {
      dogMetrics.accurateFeedback++;
    }
    dogMetrics.accuracy = dogMetrics.feedbackReceived > 0
      ? dogMetrics.accurateFeedback / dogMetrics.feedbackReceived
      : 0;

    // Update session accuracy for judgments
    if (context.operationType === OperationType.JUDGMENT) {
      this._sessionTotals.totalJudgments++;
      if (wasAccurate) {
        this._sessionTotals.accurateJudgments++;
      }
    }

    this.emit('feedback_tracked', { dogId, wasAccurate, context });
  }

  /**
   * Calculate useful work from operation
   * @private
   */
  _calculateUsefulWork(metrics, result) {
    let work = 0;

    // Base work from success
    if (metrics.wasSuccessful) {
      work += 0.5;
    }

    // Confidence contribution (higher confidence when accurate = more work)
    if (result?.wasAccurate !== false) {
      work += metrics.confidenceProduced * 0.3;
    }

    // Latency bonus (fast operations are valuable)
    if (metrics.latencyMs < 100) {
      work += 0.1;
    } else if (metrics.latencyMs < 500) {
      work += 0.05;
    }

    // φ-bounded
    return Math.min(work, PHI_INV);
  }

  /**
   * Calculate efficiency ratio
   * @private
   */
  _calculateEfficiency(usefulWork, tokensUsed, latencyMs) {
    // Efficiency = useful work / cost
    // Cost = normalized tokens + normalized latency

    const normalizedTokens = tokensUsed / 1000; // Normalize to ~1 for 1000 tokens
    const normalizedLatency = latencyMs / 1000;  // Normalize to ~1 for 1 second

    const totalCost = normalizedTokens + normalizedLatency;

    if (totalCost === 0) return usefulWork; // Free operation = 100% efficient on work

    const efficiency = usefulWork / (usefulWork + totalCost);

    // φ-bounded maximum efficiency
    return Math.min(efficiency, PHI_INV);
  }

  /**
   * Rate efficiency level
   * @private
   */
  _rateEfficiency(efficiency) {
    if (efficiency >= EFFICIENCY_THRESHOLDS.excellent) return 'excellent';
    if (efficiency >= EFFICIENCY_THRESHOLDS.good) return 'good';
    if (efficiency >= EFFICIENCY_THRESHOLDS.acceptable) return 'acceptable';
    return 'poor';
  }

  /**
   * Get or create dog metrics
   * @private
   */
  _getDogMetrics(dogId) {
    if (!this._dogMetrics.has(dogId)) {
      this._dogMetrics.set(dogId, {
        dogId,
        operations: 0,
        tokensUsed: 0,
        totalLatency: 0,
        totalUsefulWork: 0,
        successfulOps: 0,
        failedOps: 0,
        feedbackReceived: 0,
        accurateFeedback: 0,
        accuracy: 0,
        averageEfficiency: 0,
        efficiencySum: 0,
        byOperationType: {},
      });
    }
    return this._dogMetrics.get(dogId);
  }

  /**
   * Update dog metrics with operation
   * @private
   */
  _updateDogMetrics(dogId, operation) {
    const metrics = this._getDogMetrics(dogId);

    metrics.operations++;
    metrics.tokensUsed += operation.tokensUsed;
    metrics.totalLatency += operation.latencyMs;
    metrics.totalUsefulWork += operation.usefulWork;
    metrics.efficiencySum += operation.efficiency;
    metrics.averageEfficiency = metrics.efficiencySum / metrics.operations;

    if (operation.wasSuccessful) {
      metrics.successfulOps++;
    } else {
      metrics.failedOps++;
    }

    // By operation type
    if (!metrics.byOperationType[operation.operationType]) {
      metrics.byOperationType[operation.operationType] = {
        count: 0,
        tokens: 0,
        latency: 0,
      };
    }
    const typeMetrics = metrics.byOperationType[operation.operationType];
    typeMetrics.count++;
    typeMetrics.tokens += operation.tokensUsed;
    typeMetrics.latency += operation.latencyMs;
  }

  /**
   * Update session totals
   * @private
   */
  _updateSessionTotals(operation) {
    this._sessionTotals.operations++;
    this._sessionTotals.tokensUsed += operation.tokensUsed;
    this._sessionTotals.totalLatency += operation.latencyMs;
  }

  /**
   * Add operation to history
   * @private
   */
  _addOperation(operation) {
    this._operations.push(operation);
    if (this._operations.length > this._maxOperations) {
      this._operations.shift();
    }
  }

  /**
   * Update efficiency sliding window
   * @private
   */
  _updateEfficiencyWindow(efficiency) {
    this._efficiencyWindow.push(efficiency);
    if (this._efficiencyWindow.length > this._efficiencyWindowSize) {
      this._efficiencyWindow.shift();
    }
  }

  /**
   * Get metrics for a specific dog
   */
  getDogMetrics(dogId) {
    const metrics = this._dogMetrics.get(dogId);
    if (!metrics) return null;

    return {
      ...metrics,
      averageLatency: metrics.operations > 0
        ? metrics.totalLatency / metrics.operations
        : 0,
      successRate: metrics.operations > 0
        ? metrics.successfulOps / metrics.operations
        : 0,
      tokensPerOperation: metrics.operations > 0
        ? metrics.tokensUsed / metrics.operations
        : 0,
    };
  }

  /**
   * Get all dogs ranked by efficiency
   */
  getDogRankings() {
    return Array.from(this._dogMetrics.values())
      .map(m => ({
        dogId: m.dogId,
        operations: m.operations,
        efficiency: m.averageEfficiency,
        accuracy: m.accuracy,
        tokensUsed: m.tokensUsed,
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this._sessionTotals.startTime;
    const windowEfficiency = this._efficiencyWindow.length > 0
      ? this._efficiencyWindow.reduce((s, e) => s + e, 0) / this._efficiencyWindow.length
      : 0;

    return {
      duration,
      operations: this._sessionTotals.operations,
      tokensUsed: this._sessionTotals.tokensUsed,
      totalLatency: this._sessionTotals.totalLatency,
      averageLatency: this._sessionTotals.operations > 0
        ? this._sessionTotals.totalLatency / this._sessionTotals.operations
        : 0,
      judgmentAccuracy: this._sessionTotals.totalJudgments > 0
        ? this._sessionTotals.accurateJudgments / this._sessionTotals.totalJudgments
        : null,
      efficiency: {
        current: windowEfficiency,
        rating: this._rateEfficiency(windowEfficiency),
        maxPossible: PHI_INV, // 61.8%
        utilizationRatio: windowEfficiency / PHI_INV,
      },
      dogsActive: this._dogMetrics.size,
      topDogs: this.getDogRankings().slice(0, 3),
      cost: {
        tokensPerMinute: duration > 0
          ? this._sessionTotals.tokensUsed / (duration / 60000)
          : 0,
        opsPerMinute: duration > 0
          ? this._sessionTotals.operations / (duration / 60000)
          : 0,
      },
    };
  }

  /**
   * Get efficiency trend
   */
  getEfficiencyTrend() {
    if (this._efficiencyWindow.length < 10) return null;

    const mid = Math.floor(this._efficiencyWindow.length / 2);
    const firstHalf = this._efficiencyWindow.slice(0, mid);
    const secondHalf = this._efficiencyWindow.slice(mid);

    const firstAvg = firstHalf.reduce((s, e) => s + e, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, e) => s + e, 0) / secondHalf.length;

    return {
      previous: firstAvg,
      current: secondAvg,
      delta: secondAvg - firstAvg,
      trend: secondAvg > firstAvg ? 'improving' : 'declining',
      percentChange: firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0,
    };
  }

  /**
   * Get operations by type summary
   */
  getOperationsByType() {
    const byType = {};

    for (const op of this._operations) {
      if (!byType[op.operationType]) {
        byType[op.operationType] = {
          count: 0,
          tokens: 0,
          latency: 0,
          efficiencySum: 0,
        };
      }
      byType[op.operationType].count++;
      byType[op.operationType].tokens += op.tokensUsed;
      byType[op.operationType].latency += op.latencyMs;
      byType[op.operationType].efficiencySum += op.efficiency;
    }

    return Object.entries(byType).map(([type, data]) => ({
      type,
      count: data.count,
      totalTokens: data.tokens,
      avgTokens: data.count > 0 ? data.tokens / data.count : 0,
      avgLatency: data.count > 0 ? data.latency / data.count : 0,
      avgEfficiency: data.count > 0 ? data.efficiencySum / data.count : 0,
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Reset session metrics
   */
  resetSession() {
    this._dogMetrics.clear();
    this._operations = [];
    this._efficiencyWindow = [];
    this._sessionTotals = {
      operations: 0,
      tokensUsed: 0,
      totalLatency: 0,
      accurateJudgments: 0,
      totalJudgments: 0,
      startTime: Date.now(),
    };
    this.emit('session_reset');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

/**
 * Get or create the CynicAccountant singleton
 */
export function getCynicAccountant(options = {}) {
  if (!_instance) {
    _instance = new CynicAccountant(options);
  }
  return _instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetCynicAccountant() {
  if (_instance) {
    _instance.removeAllListeners();
  }
  _instance = null;
}

export default {
  CynicAccountant,
  OperationType,
  getCynicAccountant,
  resetCynicAccountant,
};
