/**
 * CYNIC Heartbeat Service
 *
 * Continuous health monitoring for 100% uptime awareness.
 * Pings all critical components and tracks availability metrics.
 *
 * "Le chien surveille tout" - CYNIC watches everything
 *
 * @module @cynic/node/services/heartbeat-service
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// Default configuration
const DEFAULT_CONFIG = {
  intervalMs: 30000,           // Ping every 30s
  timeoutMs: 5000,             // Component timeout
  historySize: 1000,           // Keep last 1000 pings
  alertThresholds: {
    degraded: PHI_INV,         // 61.8% - warn
    critical: PHI_INV_2,       // 38.2% - critical
  },
};

/**
 * Component health status
 */
export const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown',
};

/**
 * Heartbeat Service - Continuous health monitoring
 */
export class HeartbeatService extends EventEmitter {
  /**
   * @param {Object} options
   * @param {Object} [options.components] - Components to monitor { name: checkFn }
   * @param {Object} [options.config] - Configuration overrides
   */
  constructor(options = {}) {
    super();
    this.components = options.components || {};
    this.config = { ...DEFAULT_CONFIG, ...options.config };

    // State
    this._interval = null;
    this._running = false;
    this._history = new Map();  // componentName -> [{ timestamp, healthy, latencyMs }]
    this._lastCheck = new Map(); // componentName -> { timestamp, healthy, latencyMs, error }

    // Metrics
    this.metrics = {
      startedAt: null,
      totalPings: 0,
      totalFailures: 0,
      uptimeMs: 0,
    };
  }

  /**
   * Register a component to monitor
   * @param {string} name - Component name
   * @param {Function} checkFn - Async function returning { healthy: boolean, latencyMs?: number }
   */
  register(name, checkFn) {
    this.components[name] = checkFn;
    this._history.set(name, []);
    this._lastCheck.set(name, { timestamp: 0, healthy: null, latencyMs: 0 });
  }

  /**
   * Unregister a component
   */
  unregister(name) {
    delete this.components[name];
    this._history.delete(name);
    this._lastCheck.delete(name);
  }

  /**
   * Start the heartbeat loop
   */
  start() {
    if (this._running) return;

    this._running = true;
    this.metrics.startedAt = Date.now();

    // Initial check
    this._runChecks();

    // Schedule periodic checks
    this._interval = setInterval(() => {
      this._runChecks();
    }, this.config.intervalMs);

    this.emit('started');
  }

  /**
   * Stop the heartbeat loop
   */
  stop() {
    if (!this._running) return;

    this._running = false;
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }

    this.emit('stopped');
  }

  /**
   * Run health checks for all components
   * @private
   */
  async _runChecks() {
    const timestamp = Date.now();
    const results = {};

    for (const [name, checkFn] of Object.entries(this.components)) {
      const start = Date.now();
      let result = { healthy: false, latencyMs: 0, error: null };

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.config.timeoutMs)
        );

        const checkResult = await Promise.race([checkFn(), timeoutPromise]);
        result = {
          healthy: checkResult.healthy ?? true,
          latencyMs: checkResult.latencyMs ?? (Date.now() - start),
          error: null,
        };
      } catch (e) {
        result = {
          healthy: false,
          latencyMs: Date.now() - start,
          error: e.message,
        };
        this.metrics.totalFailures++;
      }

      result.timestamp = timestamp;
      results[name] = result;

      // Update history
      const history = this._history.get(name) || [];
      history.push({ timestamp, healthy: result.healthy, latencyMs: result.latencyMs });
      if (history.length > this.config.historySize) {
        history.shift();
      }
      this._history.set(name, history);
      this._lastCheck.set(name, result);

      this.metrics.totalPings++;
    }

    // Calculate overall status
    const overall = this._calculateOverallStatus(results);

    this.emit('heartbeat', {
      timestamp,
      results,
      overall,
      metrics: this.getMetrics(),
    });

    // Alert on status changes
    for (const [name, result] of Object.entries(results)) {
      if (!result.healthy) {
        this.emit('unhealthy', { component: name, ...result });
      }
    }

    if (overall.status !== HealthStatus.HEALTHY) {
      this.emit('alert', { status: overall.status, components: overall.unhealthy });
    }
  }

  /**
   * Calculate overall system status
   * @private
   */
  _calculateOverallStatus(results) {
    const total = Object.keys(results).length;
    const healthy = Object.values(results).filter(r => r.healthy).length;
    const ratio = total > 0 ? healthy / total : 0;

    let status = HealthStatus.HEALTHY;
    if (ratio < this.config.alertThresholds.critical) {
      status = HealthStatus.CRITICAL;
    } else if (ratio < this.config.alertThresholds.degraded) {
      status = HealthStatus.DEGRADED;
    }

    return {
      status,
      healthy,
      total,
      ratio,
      unhealthy: Object.entries(results)
        .filter(([, r]) => !r.healthy)
        .map(([name]) => name),
    };
  }

  /**
   * Get uptime percentage for a component
   * @param {string} name - Component name
   * @param {number} [periodMs] - Time period in ms (default: all history)
   */
  getUptime(name, periodMs = null) {
    const history = this._history.get(name);
    if (!history || history.length === 0) return 0;

    let entries = history;
    if (periodMs) {
      const cutoff = Date.now() - periodMs;
      entries = history.filter(h => h.timestamp >= cutoff);
    }

    if (entries.length === 0) return 0;
    const healthy = entries.filter(h => h.healthy).length;
    return healthy / entries.length;
  }

  /**
   * Get overall system uptime
   */
  getSystemUptime(periodMs = null) {
    const components = Object.keys(this.components);
    if (components.length === 0) return 0;

    const uptimes = components.map(name => this.getUptime(name, periodMs));
    return uptimes.reduce((a, b) => a + b, 0) / uptimes.length;
  }

  /**
   * Get last healthy timestamp for a component
   */
  getLastHealthy(name) {
    const history = this._history.get(name);
    if (!history) return null;

    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].healthy) {
        return history[i].timestamp;
      }
    }
    return null;
  }

  /**
   * Calculate Mean Time To Recovery (MTTR)
   * Average time to recover from failures
   */
  getMTTR(name) {
    const history = this._history.get(name);
    if (!history || history.length < 2) return 0;

    const recoveryTimes = [];
    let inFailure = false;
    let failureStart = 0;

    for (const entry of history) {
      if (!entry.healthy && !inFailure) {
        inFailure = true;
        failureStart = entry.timestamp;
      } else if (entry.healthy && inFailure) {
        inFailure = false;
        recoveryTimes.push(entry.timestamp - failureStart);
      }
    }

    if (recoveryTimes.length === 0) return 0;
    return recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
  }

  /**
   * Calculate Mean Time Between Failures (MTBF)
   */
  getMTBF(name) {
    const history = this._history.get(name);
    if (!history || history.length < 2) return 0;

    const failureTimes = [];
    let lastFailure = null;

    for (const entry of history) {
      if (!entry.healthy) {
        if (lastFailure !== null) {
          failureTimes.push(entry.timestamp - lastFailure);
        }
        lastFailure = entry.timestamp;
      }
    }

    if (failureTimes.length === 0) return Infinity; // No failures
    return failureTimes.reduce((a, b) => a + b, 0) / failureTimes.length;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    const now = Date.now();
    return {
      ...this.metrics,
      uptimeMs: this.metrics.startedAt ? now - this.metrics.startedAt : 0,
      systemUptime: this.getSystemUptime(),
      systemUptime1h: this.getSystemUptime(60 * 60 * 1000),
      systemUptime24h: this.getSystemUptime(24 * 60 * 60 * 1000),
      componentCount: Object.keys(this.components).length,
    };
  }

  /**
   * Get component status summary
   */
  getStatus() {
    const components = {};

    for (const name of Object.keys(this.components)) {
      const last = this._lastCheck.get(name);
      components[name] = {
        healthy: last?.healthy ?? null,
        latencyMs: last?.latencyMs ?? 0,
        lastCheck: last?.timestamp ?? 0,
        uptime: this.getUptime(name),
        uptime1h: this.getUptime(name, 60 * 60 * 1000),
        mttr: this.getMTTR(name),
        mtbf: this.getMTBF(name),
        error: last?.error ?? null,
      };
    }

    return {
      running: this._running,
      overall: this._calculateOverallStatus(
        Object.fromEntries(
          Object.entries(components).map(([k, v]) => [k, { healthy: v.healthy }])
        )
      ),
      components,
      metrics: this.getMetrics(),
    };
  }
}

/**
 * Create default component checks
 */
export function createDefaultChecks(options = {}) {
  const checks = {};

  // PostgreSQL check
  if (options.pool) {
    checks.postgresql = async () => {
      const start = Date.now();
      try {
        await options.pool.query('SELECT 1');
        return { healthy: true, latencyMs: Date.now() - start };
      } catch (e) {
        return { healthy: false, latencyMs: Date.now() - start, error: e.message };
      }
    };
  }

  // Redis check
  if (options.redis) {
    checks.redis = async () => {
      const start = Date.now();
      try {
        await options.redis.ping();
        return { healthy: true, latencyMs: Date.now() - start };
      } catch (e) {
        return { healthy: false, latencyMs: Date.now() - start, error: e.message };
      }
    };
  }

  // MCP Server check
  if (options.mcpUrl) {
    checks.mcp = async () => {
      const start = Date.now();
      try {
        const res = await fetch(`${options.mcpUrl}/health`, { signal: AbortSignal.timeout(5000) });
        return { healthy: res.ok, latencyMs: Date.now() - start };
      } catch (e) {
        return { healthy: false, latencyMs: Date.now() - start, error: e.message };
      }
    };
  }

  // Dogs check (via CollectivePack)
  if (options.collectivePack) {
    checks.dogs = async () => {
      const start = Date.now();
      try {
        const stats = options.collectivePack.getStats();
        return {
          healthy: stats.initialized && stats.dogCount > 0,
          latencyMs: Date.now() - start,
          dogCount: stats.dogCount,
        };
      } catch (e) {
        return { healthy: false, latencyMs: Date.now() - start, error: e.message };
      }
    };
  }

  return checks;
}

/**
 * Create a HeartbeatService instance
 */
export function createHeartbeatService(options = {}) {
  return new HeartbeatService(options);
}

// Singleton
let _heartbeat = null;

/**
 * Get the global HeartbeatService instance
 */
export function getHeartbeatService(options) {
  if (!_heartbeat) {
    _heartbeat = createHeartbeatService(options);
  }
  return _heartbeat;
}

export default {
  HeartbeatService,
  HealthStatus,
  createHeartbeatService,
  createDefaultChecks,
  getHeartbeatService,
};
