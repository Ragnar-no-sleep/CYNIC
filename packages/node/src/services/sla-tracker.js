/**
 * CYNIC SLA Tracker
 *
 * Tracks Service Level Agreement compliance for 99.9% uptime target.
 * Integrates with HeartbeatService and AlertManager.
 *
 * "φ mesure tout" - CYNIC measures everything
 *
 * @module @cynic/node/services/sla-tracker
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

/**
 * SLA Targets (φ-aligned where possible)
 */
export const SLA_TARGETS = {
  // Overall system uptime
  SYSTEM_UPTIME: 0.999,         // 99.9% uptime target

  // Component-specific targets
  POSTGRESQL_UPTIME: 0.9995,    // 99.95% database uptime
  MCP_RESPONSE_P99: 500,        // <500ms response time (p99)
  JUDGE_RESPONSE_P95: 3000,     // <3s for judgment (p95)

  // Rolling window thresholds
  ROLLING_1H_MIN: 0.95,         // Alert if 1h uptime < 95%
  ROLLING_24H_MIN: 0.99,        // Alert if 24h uptime < 99%

  // φ-aligned confidence
  CONFIDENCE_THRESHOLD: PHI_INV_2,  // 38.2% - minimum data confidence
};

/**
 * SLA Status
 */
export const SLAStatus = {
  COMPLIANT: 'compliant',
  AT_RISK: 'at_risk',
  BREACHED: 'breached',
  UNKNOWN: 'unknown',
};

/**
 * SLA Tracker - Monitors SLA compliance
 */
export class SLATracker extends EventEmitter {
  /**
   * @param {Object} options
   * @param {HeartbeatService} [options.heartbeat] - HeartbeatService instance
   * @param {Object} [options.alertManager] - AlertManager for notifications
   * @param {Object} [options.targets] - Custom SLA targets
   */
  constructor(options = {}) {
    super();
    this.heartbeat = options.heartbeat || null;
    this.alertManager = options.alertManager || null;
    this.targets = { ...SLA_TARGETS, ...options.targets };

    // State
    this._violations = [];       // Historical violations
    this._currentStatus = {};    // Current status per target
    this._lastCheck = null;

    // Wire to heartbeat if provided
    if (this.heartbeat) {
      this.heartbeat.on('heartbeat', (data) => this._onHeartbeat(data));
    }
  }

  /**
   * Set heartbeat service
   */
  setHeartbeat(heartbeat) {
    if (this.heartbeat) {
      this.heartbeat.off('heartbeat', this._onHeartbeat.bind(this));
    }
    this.heartbeat = heartbeat;
    this.heartbeat.on('heartbeat', (data) => this._onHeartbeat(data));
  }

  /**
   * Handle heartbeat event
   * @private
   */
  _onHeartbeat(data) {
    this._lastCheck = Date.now();
    const violations = [];

    // Check system uptime
    const systemUptime = data.metrics.systemUptime;
    if (systemUptime < this.targets.SYSTEM_UPTIME) {
      violations.push({
        target: 'SYSTEM_UPTIME',
        expected: this.targets.SYSTEM_UPTIME,
        actual: systemUptime,
        severity: systemUptime < this.targets.ROLLING_24H_MIN ? 'critical' : 'warning',
      });
    }

    // Check rolling 1h uptime
    const uptime1h = data.metrics.systemUptime1h;
    if (uptime1h !== undefined && uptime1h < this.targets.ROLLING_1H_MIN) {
      violations.push({
        target: 'ROLLING_1H_MIN',
        expected: this.targets.ROLLING_1H_MIN,
        actual: uptime1h,
        severity: 'critical',
      });
    }

    // Check rolling 24h uptime
    const uptime24h = data.metrics.systemUptime24h;
    if (uptime24h !== undefined && uptime24h < this.targets.ROLLING_24H_MIN) {
      violations.push({
        target: 'ROLLING_24H_MIN',
        expected: this.targets.ROLLING_24H_MIN,
        actual: uptime24h,
        severity: 'warning',
      });
    }

    // Check individual components
    for (const [name, result] of Object.entries(data.results)) {
      // PostgreSQL specific check
      if (name === 'postgresql' && !result.healthy) {
        violations.push({
          target: 'POSTGRESQL_UPTIME',
          expected: this.targets.POSTGRESQL_UPTIME,
          actual: 0,
          severity: 'critical',
          component: name,
        });
      }

      // MCP response time check
      if (name === 'mcp' && result.latencyMs > this.targets.MCP_RESPONSE_P99) {
        violations.push({
          target: 'MCP_RESPONSE_P99',
          expected: this.targets.MCP_RESPONSE_P99,
          actual: result.latencyMs,
          severity: 'warning',
          component: name,
        });
      }
    }

    // Update status
    this._updateStatus(violations, data);

    // Emit violations
    if (violations.length > 0) {
      for (const v of violations) {
        this._recordViolation(v);
        this.emit('violation', v);
      }

      // Alert if configured
      if (this.alertManager) {
        const critical = violations.filter(v => v.severity === 'critical');
        if (critical.length > 0) {
          this.alertManager.critical?.('SLA Breach', {
            violations: critical,
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  /**
   * Record a violation
   * @private
   */
  _recordViolation(violation) {
    this._violations.push({
      ...violation,
      timestamp: Date.now(),
    });

    // Keep last 1000 violations
    if (this._violations.length > 1000) {
      this._violations.shift();
    }
  }

  /**
   * Update current status
   * @private
   */
  _updateStatus(violations, data) {
    const hasViolations = violations.length > 0;
    const hasCritical = violations.some(v => v.severity === 'critical');

    this._currentStatus = {
      status: hasCritical ? SLAStatus.BREACHED :
              hasViolations ? SLAStatus.AT_RISK :
              SLAStatus.COMPLIANT,
      systemUptime: data.metrics.systemUptime,
      uptime1h: data.metrics.systemUptime1h,
      uptime24h: data.metrics.systemUptime24h,
      violations: violations.length,
      lastCheck: Date.now(),
    };
  }

  /**
   * Check if SLA is currently being met
   */
  isCompliant() {
    return this._currentStatus.status === SLAStatus.COMPLIANT;
  }

  /**
   * Get current SLA status
   */
  getStatus() {
    return {
      ...this._currentStatus,
      targets: this.targets,
      recentViolations: this._violations.slice(-10),
      violationCount24h: this._getViolationCount(24 * 60 * 60 * 1000),
    };
  }

  /**
   * Get violation count in time period
   * @private
   */
  _getViolationCount(periodMs) {
    const cutoff = Date.now() - periodMs;
    return this._violations.filter(v => v.timestamp >= cutoff).length;
  }

  /**
   * Get SLA report for time period
   * @param {number} periodMs - Time period in milliseconds
   */
  getReport(periodMs = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - periodMs;
    const violations = this._violations.filter(v => v.timestamp >= cutoff);

    // Group by target
    const byTarget = {};
    for (const v of violations) {
      if (!byTarget[v.target]) {
        byTarget[v.target] = [];
      }
      byTarget[v.target].push(v);
    }

    // Calculate compliance percentage
    const totalChecks = this.heartbeat?.metrics?.totalPings || 1;
    const compliance = Math.max(0, 1 - (violations.length / totalChecks));

    return {
      period: periodMs,
      periodHours: Math.round(periodMs / (60 * 60 * 1000)),
      compliance: Math.round(compliance * 1000) / 10, // One decimal
      compliant: compliance >= this.targets.SYSTEM_UPTIME,
      totalViolations: violations.length,
      violationsByTarget: Object.fromEntries(
        Object.entries(byTarget).map(([k, v]) => [k, v.length])
      ),
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      targets: this.targets,
    };
  }
}

/**
 * Create an SLATracker instance
 */
export function createSLATracker(options = {}) {
  return new SLATracker(options);
}

// Singleton
let _tracker = null;

/**
 * Get the global SLATracker instance
 */
export function getSLATracker(options) {
  if (!_tracker) {
    _tracker = createSLATracker(options);
  }
  return _tracker;
}

export default {
  SLATracker,
  SLAStatus,
  SLA_TARGETS,
  createSLATracker,
  getSLATracker,
};
