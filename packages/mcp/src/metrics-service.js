/**
 * Metrics Service
 *
 * Prometheus-format metrics for CYNIC monitoring and dashboards.
 * Collects stats from all services and exposes in standard format.
 *
 * "What gets measured gets managed" - κυνικός
 *
 * @module @cynic/mcp/metrics-service
 */

'use strict';

import { EventEmitter } from 'events';

const PHI_INV = 0.618033988749895;

/**
 * Alert severity levels
 */
const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

/**
 * Default thresholds for alerts
 */
const DEFAULT_THRESHOLDS = {
  avgQScoreMin: 30,           // Alert if avg Q-Score drops below this
  chainInvalid: true,          // Alert if chain integrity fails
  cacheHitRateMin: 0.5,        // Alert if cache hit rate below 50%
  driftsCritical: 1,           // Alert if any critical drifts
  sessionIdleHours: 24,        // Alert if session idle for 24h
};

/**
 * MetricsService
 *
 * Collects and exports metrics in Prometheus format
 */
export class MetricsService extends EventEmitter {
  /**
   * @param {Object} options - Configuration
   * @param {Object} [options.persistence] - PersistenceManager
   * @param {Object} [options.sessionManager] - SessionManager
   * @param {Object} [options.pojChainManager] - PoJChainManager
   * @param {Object} [options.librarian] - LibrarianService
   * @param {Object} [options.ecosystem] - EcosystemService
   * @param {Object} [options.integrator] - IntegratorService
   * @param {Object} [options.judge] - CYNICJudge
   * @param {Object} [options.agents] - AgentManager
   * @param {Object} [options.thresholds] - Alert thresholds
   */
  constructor(options = {}) {
    super();

    this.persistence = options.persistence || null;
    this.sessionManager = options.sessionManager || null;
    this.pojChainManager = options.pojChainManager || null;
    this.librarian = options.librarian || null;
    this.ecosystem = options.ecosystem || null;
    this.integrator = options.integrator || null;
    this.judge = options.judge || null;
    this.agents = options.agents || null;

    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };

    // Active alerts
    this._alerts = [];

    // Metrics cache (refreshed on collect)
    this._metricsCache = null;
    this._lastCollect = null;

    // Stats
    this._stats = {
      collectCount: 0,
      alertsTriggered: 0,
      lastCollectMs: 0,
    };
  }

  /**
   * Collect all metrics from services
   * @returns {Promise<Object>} Raw metrics object
   */
  async collect() {
    const startTime = Date.now();
    const metrics = {
      timestamp: startTime,
      judgments: {},
      sessions: {},
      cache: {},
      chain: {},
      ecosystem: {},
      integrator: {},
      agents: {},
      system: {},
    };

    // Judgment metrics
    if (this.persistence?.judgments) {
      try {
        const stats = await this.persistence.getJudgmentStats();
        metrics.judgments = {
          total: stats.total || 0,
          avgQScore: stats.avgScore || 0,
          avgConfidence: stats.avgConfidence || 0,
          byVerdict: stats.verdicts || {},
          last24h: stats.last24h || 0,
        };
      } catch (e) {
        metrics.judgments.error = e.message;
      }
    }

    // Also get judge in-memory stats
    if (this.judge) {
      const judgeStats = this.judge.getStats();
      metrics.judgments.memory = {
        total: judgeStats.totalJudgments || 0,
        avgScore: judgeStats.avgScore || 0,
        byVerdict: judgeStats.verdicts || {},
      };
    }

    // Session metrics
    if (this.sessionManager) {
      const sessionStats = this.sessionManager.getStats();
      metrics.sessions = {
        active: sessionStats.activeSessions || 0,
        total: sessionStats.totalSessions || 0,
        current: sessionStats.currentSession ? {
          userId: sessionStats.currentSession.userId,
          judgmentCount: sessionStats.currentSession.counters?.judgmentCount || 0,
        } : null,
      };
    }

    // Cache metrics (librarian)
    if (this.librarian) {
      try {
        const libStats = await this.librarian.getStats();
        metrics.cache.library = {
          hits: libStats.cache?.totalHits || 0,
          misses: libStats.cache?.totalMisses || 0,
          hitRate: libStats.hitRate || 0,
          activeEntries: libStats.cache?.activeEntries || 0,
          memorySize: libStats.cache?.memorySize || 0,
        };
      } catch (e) {
        metrics.cache.libraryError = e.message;
      }
    }

    // Chain metrics
    if (this.pojChainManager) {
      const chainStatus = this.pojChainManager.getStatus();
      metrics.chain = {
        height: chainStatus.headSlot || 0,
        pendingJudgments: chainStatus.pendingJudgments || 0,
        blocksCreated: chainStatus.stats?.blocksCreated || 0,
        judgmentsProcessed: chainStatus.stats?.judgmentsProcessed || 0,
        initialized: chainStatus.initialized,
      };

      // Get full chain stats from persistence
      if (this.persistence?.pojBlocks) {
        try {
          const dbStats = await this.persistence.pojBlocks.getStats();
          metrics.chain.totalBlocks = dbStats.totalBlocks || 0;
          metrics.chain.totalJudgments = dbStats.totalJudgments || 0;
        } catch (e) {
          // Ignore
        }
      }
    }

    // Ecosystem metrics
    if (this.ecosystem) {
      try {
        const ecoStats = await this.ecosystem.getStats();
        metrics.ecosystem = {
          docsLoaded: ecoStats.total_docs || ecoStats.loadCount || 0,
          searchCount: ecoStats.searchCount || 0,
          hitCount: ecoStats.hitCount || 0,
        };
      } catch (e) {
        metrics.ecosystem.error = e.message;
      }
    }

    // Integrator metrics
    if (this.integrator) {
      const intStats = this.integrator.getStats();
      const drifts = this.integrator.getDrifts();
      metrics.integrator = {
        checksPerformed: intStats.checksPerformed || 0,
        driftsDetected: intStats.driftsDetected || 0,
        currentDrifts: drifts.length,
        criticalDrifts: drifts.filter(d => d.critical).length,
        modulesTracked: intStats.modulesTracked || 0,
        projectsTracked: intStats.projectsTracked || 0,
      };
    }

    // Agents metrics
    if (this.agents) {
      const agentSummary = this.agents.getSummary();
      metrics.agents = {
        enabled: agentSummary.enabled,
        totalDecisions: agentSummary.stats?.totalDecisions || 0,
        guardian: {
          blocks: agentSummary.agents?.guardian?.decisionsBlocked || 0,
          warnings: agentSummary.agents?.guardian?.decisionsWarned || 0,
        },
        observer: {
          patterns: agentSummary.agents?.observer?.patternsDetected || 0,
          observations: agentSummary.agents?.observer?.totalObservations || 0,
        },
        digester: {
          digests: agentSummary.agents?.digester?.totalDigests || 0,
        },
        mentor: {
          wisdomShared: agentSummary.agents?.mentor?.wisdomShared || 0,
        },
      };
    }

    // System metrics
    metrics.system = {
      uptime: process.uptime(),
      memoryUsed: process.memoryUsage().heapUsed,
      memoryTotal: process.memoryUsage().heapTotal,
      phi: PHI_INV,
    };

    // Update stats
    this._stats.collectCount++;
    this._stats.lastCollectMs = Date.now() - startTime;
    this._metricsCache = metrics;
    this._lastCollect = Date.now();

    // Check alerts
    await this._checkAlerts(metrics);

    return metrics;
  }

  /**
   * Export metrics in Prometheus format
   * @param {Object} [metrics] - Pre-collected metrics (or collect fresh)
   * @returns {Promise<string>} Prometheus format string
   */
  async toPrometheus(metrics = null) {
    if (!metrics) {
      metrics = await this.collect();
    }

    const lines = [
      '# HELP cynic_judgments_total Total number of judgments by verdict',
      '# TYPE cynic_judgments_total counter',
    ];

    // Judgments by verdict
    const verdicts = metrics.judgments.byVerdict || {};
    for (const [verdict, count] of Object.entries(verdicts)) {
      lines.push(`cynic_judgments_total{verdict="${verdict}"} ${count}`);
    }

    // Average Q-Score
    lines.push('# HELP cynic_avg_q_score Average Q-Score of all judgments');
    lines.push('# TYPE cynic_avg_q_score gauge');
    lines.push(`cynic_avg_q_score ${metrics.judgments.avgQScore || 0}`);

    // Sessions
    lines.push('# HELP cynic_active_sessions Number of active sessions');
    lines.push('# TYPE cynic_active_sessions gauge');
    lines.push(`cynic_active_sessions ${metrics.sessions.active || 0}`);

    lines.push('# HELP cynic_sessions_total Total sessions created');
    lines.push('# TYPE cynic_sessions_total counter');
    lines.push(`cynic_sessions_total ${metrics.sessions.total || 0}`);

    // Cache metrics
    if (metrics.cache.library) {
      lines.push('# HELP cynic_library_cache_hits Total cache hits');
      lines.push('# TYPE cynic_library_cache_hits counter');
      lines.push(`cynic_library_cache_hits ${metrics.cache.library.hits}`);

      lines.push('# HELP cynic_library_cache_misses Total cache misses');
      lines.push('# TYPE cynic_library_cache_misses counter');
      lines.push(`cynic_library_cache_misses ${metrics.cache.library.misses}`);

      lines.push('# HELP cynic_library_cache_hit_rate Cache hit rate');
      lines.push('# TYPE cynic_library_cache_hit_rate gauge');
      lines.push(`cynic_library_cache_hit_rate ${metrics.cache.library.hitRate}`);
    }

    // Chain metrics
    lines.push('# HELP cynic_poj_chain_height Current PoJ chain height');
    lines.push('# TYPE cynic_poj_chain_height gauge');
    lines.push(`cynic_poj_chain_height ${metrics.chain.height || 0}`);

    lines.push('# HELP cynic_poj_blocks_total Total PoJ blocks');
    lines.push('# TYPE cynic_poj_blocks_total counter');
    lines.push(`cynic_poj_blocks_total ${metrics.chain.totalBlocks || metrics.chain.blocksCreated || 0}`);

    lines.push('# HELP cynic_poj_pending_judgments Pending judgments in batch');
    lines.push('# TYPE cynic_poj_pending_judgments gauge');
    lines.push(`cynic_poj_pending_judgments ${metrics.chain.pendingJudgments || 0}`);

    // Ecosystem metrics
    lines.push('# HELP cynic_ecosystem_docs_loaded Ecosystem docs loaded');
    lines.push('# TYPE cynic_ecosystem_docs_loaded gauge');
    lines.push(`cynic_ecosystem_docs_loaded ${metrics.ecosystem.docsLoaded || 0}`);

    // Integrator metrics
    lines.push('# HELP cynic_integrator_drifts_current Current detected drifts');
    lines.push('# TYPE cynic_integrator_drifts_current gauge');
    lines.push(`cynic_integrator_drifts_current ${metrics.integrator.currentDrifts || 0}`);

    lines.push('# HELP cynic_integrator_drifts_critical Critical drifts');
    lines.push('# TYPE cynic_integrator_drifts_critical gauge');
    lines.push(`cynic_integrator_drifts_critical ${metrics.integrator.criticalDrifts || 0}`);

    // Agents metrics
    lines.push('# HELP cynic_guardian_blocks Total operations blocked by Guardian');
    lines.push('# TYPE cynic_guardian_blocks counter');
    lines.push(`cynic_guardian_blocks ${metrics.agents.guardian?.blocks || 0}`);

    lines.push('# HELP cynic_guardian_warnings Total warnings from Guardian');
    lines.push('# TYPE cynic_guardian_warnings counter');
    lines.push(`cynic_guardian_warnings ${metrics.agents.guardian?.warnings || 0}`);

    lines.push('# HELP cynic_observer_patterns Patterns detected by Observer');
    lines.push('# TYPE cynic_observer_patterns counter');
    lines.push(`cynic_observer_patterns ${metrics.agents.observer?.patterns || 0}`);

    // System metrics
    lines.push('# HELP cynic_uptime_seconds Server uptime in seconds');
    lines.push('# TYPE cynic_uptime_seconds gauge');
    lines.push(`cynic_uptime_seconds ${Math.floor(metrics.system.uptime)}`);

    lines.push('# HELP cynic_memory_used_bytes Heap memory used');
    lines.push('# TYPE cynic_memory_used_bytes gauge');
    lines.push(`cynic_memory_used_bytes ${metrics.system.memoryUsed}`);

    // Alerts
    lines.push('# HELP cynic_alerts_active Number of active alerts');
    lines.push('# TYPE cynic_alerts_active gauge');
    lines.push(`cynic_alerts_active ${this._alerts.length}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Check thresholds and trigger alerts
   * @private
   */
  async _checkAlerts(metrics) {
    const newAlerts = [];

    // Check average Q-Score
    if (metrics.judgments.total > 10) {
      const avgScore = metrics.judgments.avgQScore || 0;
      if (avgScore < this.thresholds.avgQScoreMin) {
        newAlerts.push({
          level: ALERT_LEVELS.WARNING,
          type: 'low_q_score',
          message: `Average Q-Score ${avgScore.toFixed(1)} below threshold ${this.thresholds.avgQScoreMin}`,
          value: avgScore,
          threshold: this.thresholds.avgQScoreMin,
          timestamp: Date.now(),
        });
      }
    }

    // Check cache hit rate
    if (metrics.cache.library) {
      const { hits, misses } = metrics.cache.library;
      if (hits + misses > 20) {
        const hitRate = metrics.cache.library.hitRate;
        if (hitRate < this.thresholds.cacheHitRateMin) {
          newAlerts.push({
            level: ALERT_LEVELS.INFO,
            type: 'low_cache_hit_rate',
            message: `Cache hit rate ${(hitRate * 100).toFixed(1)}% below threshold ${this.thresholds.cacheHitRateMin * 100}%`,
            value: hitRate,
            threshold: this.thresholds.cacheHitRateMin,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check critical drifts
    if (metrics.integrator.criticalDrifts >= this.thresholds.driftsCritical) {
      newAlerts.push({
        level: ALERT_LEVELS.CRITICAL,
        type: 'critical_drifts',
        message: `${metrics.integrator.criticalDrifts} critical module drift(s) detected`,
        value: metrics.integrator.criticalDrifts,
        threshold: this.thresholds.driftsCritical,
        timestamp: Date.now(),
      });
    }

    // Check chain integrity (async)
    if (this.thresholds.chainInvalid && this.pojChainManager) {
      try {
        const verification = await this.pojChainManager.verifyIntegrity();
        if (!verification.valid) {
          newAlerts.push({
            level: ALERT_LEVELS.CRITICAL,
            type: 'chain_invalid',
            message: `PoJ chain integrity failure: ${verification.errors.length} errors`,
            errors: verification.errors.slice(0, 3),
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        // Ignore verification errors
      }
    }

    // Update alerts and emit events for new ones
    const oldAlertTypes = new Set(this._alerts.map(a => a.type));
    for (const alert of newAlerts) {
      if (!oldAlertTypes.has(alert.type)) {
        this._stats.alertsTriggered++;
        this.emit('alert', alert);
      }
    }

    this._alerts = newAlerts;
  }

  /**
   * Get current alerts
   * @returns {Object[]} Active alerts
   */
  getAlerts() {
    return [...this._alerts];
  }

  /**
   * Get specific alert by type
   * @param {string} type - Alert type
   * @returns {Object|null} Alert or null
   */
  getAlert(type) {
    return this._alerts.find(a => a.type === type) || null;
  }

  /**
   * Clear an alert (acknowledge)
   * @param {string} type - Alert type to clear
   * @returns {boolean} Whether alert was found and cleared
   */
  clearAlert(type) {
    const idx = this._alerts.findIndex(a => a.type === type);
    if (idx >= 0) {
      const alert = this._alerts.splice(idx, 1)[0];
      this.emit('alert_cleared', alert);
      return true;
    }
    return false;
  }

  /**
   * Get cached metrics (without fresh collect)
   * @returns {Object|null} Cached metrics or null
   */
  getCached() {
    return this._metricsCache;
  }

  /**
   * Get service stats
   * @returns {Object} Stats
   */
  getStats() {
    return {
      ...this._stats,
      alertsActive: this._alerts.length,
      lastCollect: this._lastCollect,
      thresholds: this.thresholds,
    };
  }

  /**
   * Generate a simple HTML dashboard
   * @param {Object} [metrics] - Pre-collected metrics
   * @returns {Promise<string>} HTML string
   */
  async toHTML(metrics = null) {
    if (!metrics) {
      metrics = await this.collect();
    }

    const alertsHTML = this._alerts.length > 0
      ? this._alerts.map(a => `
          <div class="alert alert-${a.level}">
            <strong>${a.level.toUpperCase()}</strong>: ${a.message}
          </div>
        `).join('')
      : '<div class="alert alert-ok">No active alerts</div>';

    return `<!DOCTYPE html>
<html>
<head>
  <title>CYNIC Dashboard</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
    }
    h1 { color: #58a6ff; margin-bottom: 20px; }
    h2 { color: #8b949e; margin: 20px 0 10px; font-size: 14px; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 15px;
    }
    .card-title { color: #8b949e; font-size: 12px; margin-bottom: 8px; }
    .card-value { color: #58a6ff; font-size: 28px; font-weight: bold; }
    .card-subtitle { color: #6e7681; font-size: 11px; margin-top: 5px; }
    .alert { padding: 10px; border-radius: 4px; margin-bottom: 10px; }
    .alert-critical { background: #f8514933; border-left: 3px solid #f85149; }
    .alert-warning { background: #d2992233; border-left: 3px solid #d29922; }
    .alert-info { background: #58a6ff33; border-left: 3px solid #58a6ff; }
    .alert-ok { background: #238636aa; border-left: 3px solid #238636; }
    .phi { color: #c9b458; font-size: 12px; }
    footer { margin-top: 30px; color: #6e7681; font-size: 11px; }
  </style>
</head>
<body>
  <h1>🐕 CYNIC Dashboard</h1>
  <p class="phi">κυνικός - "φ distrusts φ" - Max confidence: ${(PHI_INV * 100).toFixed(1)}%</p>

  <h2>Alerts</h2>
  ${alertsHTML}

  <h2>Judgments</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Total Judgments</div>
      <div class="card-value">${metrics.judgments.total || 0}</div>
      <div class="card-subtitle">All time</div>
    </div>
    <div class="card">
      <div class="card-title">Avg Q-Score</div>
      <div class="card-value">${(metrics.judgments.avgQScore || 0).toFixed(1)}</div>
      <div class="card-subtitle">Quality score</div>
    </div>
    <div class="card">
      <div class="card-title">WAG</div>
      <div class="card-value">${metrics.judgments.byVerdict?.WAG || 0}</div>
      <div class="card-subtitle">Approved</div>
    </div>
    <div class="card">
      <div class="card-title">HOWL</div>
      <div class="card-value">${metrics.judgments.byVerdict?.HOWL || 0}</div>
      <div class="card-subtitle">Excellent</div>
    </div>
  </div>

  <h2>Sessions</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Active Sessions</div>
      <div class="card-value">${metrics.sessions.active || 0}</div>
    </div>
    <div class="card">
      <div class="card-title">Total Sessions</div>
      <div class="card-value">${metrics.sessions.total || 0}</div>
    </div>
  </div>

  <h2>PoJ Chain</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Chain Height</div>
      <div class="card-value">${metrics.chain.height || 0}</div>
      <div class="card-subtitle">Current slot</div>
    </div>
    <div class="card">
      <div class="card-title">Total Blocks</div>
      <div class="card-value">${metrics.chain.totalBlocks || metrics.chain.blocksCreated || 0}</div>
    </div>
    <div class="card">
      <div class="card-title">Pending</div>
      <div class="card-value">${metrics.chain.pendingJudgments || 0}</div>
      <div class="card-subtitle">Awaiting batch</div>
    </div>
  </div>

  <h2>Cache</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Hit Rate</div>
      <div class="card-value">${((metrics.cache.library?.hitRate || 0) * 100).toFixed(1)}%</div>
    </div>
    <div class="card">
      <div class="card-title">Hits / Misses</div>
      <div class="card-value">${metrics.cache.library?.hits || 0} / ${metrics.cache.library?.misses || 0}</div>
    </div>
  </div>

  <h2>Integration</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Current Drifts</div>
      <div class="card-value">${metrics.integrator.currentDrifts || 0}</div>
      <div class="card-subtitle">${metrics.integrator.criticalDrifts || 0} critical</div>
    </div>
    <div class="card">
      <div class="card-title">Modules Tracked</div>
      <div class="card-value">${metrics.integrator.modulesTracked || 0}</div>
    </div>
  </div>

  <h2>Four Dogs</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">🛡️ Guardian</div>
      <div class="card-value">${metrics.agents.guardian?.blocks || 0}</div>
      <div class="card-subtitle">Blocked (${metrics.agents.guardian?.warnings || 0} warnings)</div>
    </div>
    <div class="card">
      <div class="card-title">👁️ Observer</div>
      <div class="card-value">${metrics.agents.observer?.patterns || 0}</div>
      <div class="card-subtitle">Patterns detected</div>
    </div>
  </div>

  <h2>System</h2>
  <div class="grid">
    <div class="card">
      <div class="card-title">Uptime</div>
      <div class="card-value">${Math.floor(metrics.system.uptime / 60)}m</div>
    </div>
    <div class="card">
      <div class="card-title">Memory</div>
      <div class="card-value">${Math.round(metrics.system.memoryUsed / 1024 / 1024)}MB</div>
      <div class="card-subtitle">of ${Math.round(metrics.system.memoryTotal / 1024 / 1024)}MB</div>
    </div>
  </div>

  <footer>
    Last updated: ${new Date(metrics.timestamp).toISOString()} |
    Collect time: ${this._stats.lastCollectMs}ms |
    φ⁻¹ = ${PHI_INV}
  </footer>
</body>
</html>`;
  }
}

export default MetricsService;
