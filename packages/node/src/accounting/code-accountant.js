/**
 * Code Accountant - C1.6 (CODE × ACCOUNT)
 *
 * Tracks economic value of code changes in the 7×7 Fractal Matrix.
 * Part of the ACCOUNT column activation.
 *
 * "Le chien compte ce qui compte" - CYNIC tracks real value
 *
 * @module @cynic/node/accounting/code-accountant
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Complexity metrics weights (φ-aligned)
 */
const COMPLEXITY_WEIGHTS = {
  linesAdded: 1.0,
  linesRemoved: PHI_INV,      // 0.618 - removal is valuable
  cyclomaticDelta: PHI_INV_2, // 0.382 - complexity change matters
  dependenciesAdded: 1.5,     // Dependencies are expensive
  dependenciesRemoved: PHI_INV * 1.5, // Removing deps is very valuable
};

/**
 * Risk categories
 */
export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * CodeAccountant - Track economic value of code changes
 */
export class CodeAccountant extends EventEmitter {
  constructor(options = {}) {
    super();

    this.telemetry = options.telemetry || null;
    this.factsRepo = options.factsRepo || null;

    // Accumulated metrics for session
    this._sessionMetrics = {
      totalChanges: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      totalComplexityDelta: 0,
      totalRiskScore: 0,
      totalValueScore: 0,
      changesByFile: new Map(),
      startTime: Date.now(),
    };

    // Historical tracking
    this._history = [];
    this._maxHistory = 1000;
  }

  /**
   * Track a code change
   *
   * @param {Object} change - The change to track
   * @param {string} change.filePath - Path to changed file
   * @param {number} change.linesAdded - Lines added
   * @param {number} change.linesRemoved - Lines removed
   * @param {string[]} [change.dependenciesAdded] - New dependencies
   * @param {string[]} [change.dependenciesRemoved] - Removed dependencies
   * @param {Object} [metadata] - Additional metadata
   * @returns {Object} Change accounting result
   */
  trackChange(change, metadata = {}) {
    const {
      filePath,
      linesAdded = 0,
      linesRemoved = 0,
      dependenciesAdded = [],
      dependenciesRemoved = [],
    } = change;

    const timestamp = Date.now();
    const duration = metadata.duration || 0;

    // Calculate complexity delta
    const complexityDelta = this._calculateComplexityDelta(change);

    // Assess risk
    const riskAssessment = this._assessRisk(change, metadata);

    // Calculate value score (φ-bounded)
    const valueScore = this._calculateValueScore(change, riskAssessment, duration);

    // Build result
    const result = {
      filePath,
      timestamp,
      metrics: {
        linesAdded,
        linesRemoved,
        netLines: linesAdded - linesRemoved,
        dependenciesAdded: dependenciesAdded.length,
        dependenciesRemoved: dependenciesRemoved.length,
        netDependencies: dependenciesAdded.length - dependenciesRemoved.length,
      },
      complexityDelta,
      risk: riskAssessment,
      valueScore,
      duration,
      efficiency: duration > 0 ? valueScore / (duration / 1000) : 0, // value per second
    };

    // Update session metrics
    this._updateSessionMetrics(result);

    // Store in history
    this._addToHistory(result);

    // Emit for listeners
    this.emit('change_tracked', result);

    // Store as fact if repo available
    if (this.factsRepo) {
      this._storeFact(result, metadata).catch(() => {});
    }

    return result;
  }

  /**
   * Calculate complexity delta
   * @private
   */
  _calculateComplexityDelta(change) {
    const {
      linesAdded = 0,
      linesRemoved = 0,
      dependenciesAdded = [],
      dependenciesRemoved = [],
      cyclomaticDelta = 0,
    } = change;

    // Weighted complexity calculation
    const addedComplexity =
      (linesAdded * COMPLEXITY_WEIGHTS.linesAdded) +
      (dependenciesAdded.length * COMPLEXITY_WEIGHTS.dependenciesAdded);

    const removedComplexity =
      (linesRemoved * COMPLEXITY_WEIGHTS.linesRemoved) +
      (dependenciesRemoved.length * COMPLEXITY_WEIGHTS.dependenciesRemoved);

    const cyclomaticContribution = cyclomaticDelta * COMPLEXITY_WEIGHTS.cyclomaticDelta;

    return {
      added: addedComplexity,
      removed: removedComplexity,
      net: addedComplexity - removedComplexity + cyclomaticContribution,
      // Positive = more complex, Negative = simpler (good for BURN axiom)
      trend: addedComplexity > removedComplexity ? 'increasing' : 'decreasing',
    };
  }

  /**
   * Assess risk of change
   * @private
   */
  _assessRisk(change, metadata = {}) {
    const {
      filePath = '',
      linesAdded = 0,
      linesRemoved = 0,
      dependenciesAdded = [],
    } = change;

    let riskScore = 0;
    const factors = [];

    // Large changes are risky
    const totalLines = linesAdded + linesRemoved;
    if (totalLines > 500) {
      riskScore += 0.3;
      factors.push('large_change');
    } else if (totalLines > 100) {
      riskScore += 0.15;
      factors.push('medium_change');
    }

    // New dependencies are risky
    if (dependenciesAdded.length > 3) {
      riskScore += 0.2;
      factors.push('many_new_deps');
    } else if (dependenciesAdded.length > 0) {
      riskScore += 0.1;
      factors.push('new_deps');
    }

    // Critical file paths
    const criticalPaths = [
      /security/i, /auth/i, /credential/i, /secret/i,
      /payment/i, /wallet/i, /key/i, /token/i,
      /migration/i, /schema/i, /database/i,
    ];

    if (criticalPaths.some(p => p.test(filePath))) {
      riskScore += 0.25;
      factors.push('critical_path');
    }

    // Core infrastructure
    if (filePath.includes('packages/core') || filePath.includes('packages/protocol')) {
      riskScore += 0.15;
      factors.push('core_infra');
    }

    // Deletion-heavy changes need review
    if (linesRemoved > linesAdded * 2 && linesRemoved > 50) {
      riskScore += 0.1;
      factors.push('heavy_deletion');
    }

    // Test coverage context
    if (metadata.hasTests === false && totalLines > 50) {
      riskScore += 0.15;
      factors.push('no_tests');
    }

    // Cap at 1.0
    riskScore = Math.min(1.0, riskScore);

    // Determine level
    let level = RiskLevel.LOW;
    if (riskScore > PHI_INV) level = RiskLevel.CRITICAL;      // > 61.8%
    else if (riskScore > PHI_INV_2) level = RiskLevel.HIGH;   // > 38.2%
    else if (riskScore > PHI_INV_3) level = RiskLevel.MEDIUM; // > 23.6%

    return {
      score: riskScore,
      level,
      factors,
      requiresReview: level === RiskLevel.HIGH || level === RiskLevel.CRITICAL,
    };
  }

  /**
   * Calculate value score (φ-bounded)
   * @private
   */
  _calculateValueScore(change, riskAssessment, duration) {
    const { linesAdded = 0, linesRemoved = 0 } = change;

    // Base value from BURN axiom: removal is valuable
    let value = 0;

    // Net negative lines = simplification = high value
    const netLines = linesAdded - linesRemoved;
    if (netLines < 0) {
      value += Math.abs(netLines) * 0.01; // 0.01 value per line removed
    } else {
      value += netLines * 0.005; // Half value for additions
    }

    // Risk penalty
    value *= (1 - riskAssessment.score * 0.5);

    // Time efficiency bonus (quick valuable changes are better)
    if (duration > 0 && duration < 60000) { // Under 1 minute
      value *= 1.2;
    }

    // φ-bounded maximum
    value = Math.min(value, PHI_INV);

    return Math.round(value * 1000) / 1000; // 3 decimal precision
  }

  /**
   * Update session metrics
   * @private
   */
  _updateSessionMetrics(result) {
    this._sessionMetrics.totalChanges++;
    this._sessionMetrics.totalLinesAdded += result.metrics.linesAdded;
    this._sessionMetrics.totalLinesRemoved += result.metrics.linesRemoved;
    this._sessionMetrics.totalComplexityDelta += result.complexityDelta.net;
    this._sessionMetrics.totalRiskScore += result.risk.score;
    this._sessionMetrics.totalValueScore += result.valueScore;

    // Per-file tracking
    const fileMetrics = this._sessionMetrics.changesByFile.get(result.filePath) || {
      changes: 0,
      linesAdded: 0,
      linesRemoved: 0,
    };
    fileMetrics.changes++;
    fileMetrics.linesAdded += result.metrics.linesAdded;
    fileMetrics.linesRemoved += result.metrics.linesRemoved;
    this._sessionMetrics.changesByFile.set(result.filePath, fileMetrics);
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
      factType: 'code_change_accounting',
      subject: result.filePath,
      content: JSON.stringify({
        metrics: result.metrics,
        complexity: result.complexityDelta,
        risk: result.risk.level,
        value: result.valueScore,
      }),
      confidence: PHI_INV_2, // 38.2% - accounting data confidence
      source: 'code-accountant',
      context: {
        riskFactors: result.risk.factors,
        duration: result.duration,
      },
    });
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this._sessionMetrics.startTime;
    const avgRisk = this._sessionMetrics.totalChanges > 0
      ? this._sessionMetrics.totalRiskScore / this._sessionMetrics.totalChanges
      : 0;

    return {
      duration,
      totalChanges: this._sessionMetrics.totalChanges,
      lines: {
        added: this._sessionMetrics.totalLinesAdded,
        removed: this._sessionMetrics.totalLinesRemoved,
        net: this._sessionMetrics.totalLinesAdded - this._sessionMetrics.totalLinesRemoved,
      },
      complexity: {
        totalDelta: this._sessionMetrics.totalComplexityDelta,
        trend: this._sessionMetrics.totalComplexityDelta > 0 ? 'increasing' : 'decreasing',
      },
      risk: {
        averageScore: avgRisk,
        level: avgRisk > PHI_INV_2 ? 'elevated' : 'normal',
      },
      value: {
        total: this._sessionMetrics.totalValueScore,
        perChange: this._sessionMetrics.totalChanges > 0
          ? this._sessionMetrics.totalValueScore / this._sessionMetrics.totalChanges
          : 0,
        efficiency: duration > 0
          ? this._sessionMetrics.totalValueScore / (duration / 1000)
          : 0,
      },
      filesChanged: this._sessionMetrics.changesByFile.size,
      hotFiles: this._getHotFiles(5),
    };
  }

  /**
   * Get most frequently changed files
   * @private
   */
  _getHotFiles(limit = 5) {
    return Array.from(this._sessionMetrics.changesByFile.entries())
      .sort((a, b) => b[1].changes - a[1].changes)
      .slice(0, limit)
      .map(([path, metrics]) => ({ path, ...metrics }));
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

    const recentAvgRisk = recent.reduce((s, r) => s + r.risk.score, 0) / recent.length;
    const olderAvgRisk = older.reduce((s, r) => s + r.risk.score, 0) / older.length;

    return {
      value: {
        current: recentAvgValue,
        previous: olderAvgValue,
        trend: recentAvgValue > olderAvgValue ? 'improving' : 'declining',
        delta: recentAvgValue - olderAvgValue,
      },
      risk: {
        current: recentAvgRisk,
        previous: olderAvgRisk,
        trend: recentAvgRisk < olderAvgRisk ? 'improving' : 'increasing',
        delta: recentAvgRisk - olderAvgRisk,
      },
    };
  }

  /**
   * Reset session metrics
   */
  resetSession() {
    this._sessionMetrics = {
      totalChanges: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      totalComplexityDelta: 0,
      totalRiskScore: 0,
      totalValueScore: 0,
      changesByFile: new Map(),
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
 * Get or create the CodeAccountant singleton
 */
export function getCodeAccountant(options = {}) {
  if (!_instance) {
    _instance = new CodeAccountant(options);
  }
  return _instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetCodeAccountant() {
  if (_instance) {
    _instance.removeAllListeners();
  }
  _instance = null;
}

export default {
  CodeAccountant,
  RiskLevel,
  getCodeAccountant,
  resetCodeAccountant,
};
