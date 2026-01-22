/**
 * CYNIC Monitoring Dashboard
 *
 * Real-time monitoring of all data CYNIC processes:
 * - Observations stream
 * - Session metrics
 * - Contributor activity
 * - Ecosystem health
 * - Alerts (GROWL/WAG/BARK)
 *
 * "Watch everything, trust nothing" - κυνικός
 *
 * @module @cynic/scripts/monitoring
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// GROWL alerting integration (lazy-loaded to avoid circular deps)
let alerting = null;
function getAlerting() {
  if (!alerting) {
    try {
      alerting = require('./alerting.cjs');
      alerting.init();
    } catch (e) {
      // Alerting not available
      alerting = null;
    }
  }
  return alerting;
}

// φ Constants
const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI; // 0.618

// Paths
const CYNIC_DIR = path.join(os.homedir(), '.cynic');
const LEARNING_DIR = path.join(CYNIC_DIR, 'learning');

// ═══════════════════════════════════════════════════════════════════════════
// DATA LOADERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load JSONL file (observations, feedback)
 */
function loadJsonl(filename) {
  const filepath = path.join(LEARNING_DIR, filename);
  if (!fs.existsSync(filepath)) return [];

  const content = fs.readFileSync(filepath, 'utf8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Load JSON file
 */
function loadJson(filename) {
  const filepath = path.join(LEARNING_DIR, filename);
  if (!fs.existsSync(filepath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Load all monitoring data
 */
function loadAllData() {
  return {
    observations: loadJsonl('observations.jsonl'),
    feedback: loadJsonl('feedback.jsonl'),
    stats: loadJson('stats.json'),
    thresholds: loadJson('thresholds.json'),
    contributors: loadJson('contributors.json'),
    userProfile: loadJson('user-profile.json'),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// METRICS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate observation metrics
 */
function calculateObservationMetrics(observations) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const metrics = {
    total: observations.length,
    lastHour: 0,
    lastDay: 0,
    byType: {},
    byContext: {},
    trend: 'stable',
  };

  for (const obs of observations) {
    const age = now - obs.timestamp;

    if (age < hour) metrics.lastHour++;
    if (age < day) metrics.lastDay++;

    // Count by type
    metrics.byType[obs.type] = (metrics.byType[obs.type] || 0) + 1;

    // Count by context
    if (obs.context) {
      metrics.byContext[obs.context] = (metrics.byContext[obs.context] || 0) + 1;
    }
  }

  // Calculate trend (last hour vs previous hour)
  const lastHourObs = observations.filter(o => now - o.timestamp < hour);
  const prevHourObs = observations.filter(o => {
    const age = now - o.timestamp;
    return age >= hour && age < 2 * hour;
  });

  if (lastHourObs.length > prevHourObs.length * 1.5) {
    metrics.trend = 'increasing';
  } else if (lastHourObs.length < prevHourObs.length * 0.5) {
    metrics.trend = 'decreasing';
  }

  return metrics;
}

/**
 * Calculate alert levels based on thresholds
 */
function calculateAlerts(observations, thresholds) {
  const alerts = [];
  const now = Date.now();
  const window = 10 * 60 * 1000; // 10 minutes

  // Recent observations
  const recent = observations.filter(o => now - o.timestamp < window);

  // Count errors
  const errors = recent.filter(o => o.type === 'error');
  const errorThreshold = thresholds?.error?.threshold || 3;

  if (errors.length >= errorThreshold) {
    alerts.push({
      level: 'GROWL',
      type: 'error_spike',
      message: `${errors.length} errors in last 10 minutes (threshold: ${errorThreshold})`,
      count: errors.length,
      threshold: errorThreshold,
    });
  }

  // Count rapid code changes
  const codeChanges = recent.filter(o => o.type === 'codeChange');
  const codeThreshold = thresholds?.codeChange?.threshold || 5;

  if (codeChanges.length >= codeThreshold) {
    alerts.push({
      level: 'BARK',
      type: 'rapid_changes',
      message: `${codeChanges.length} code changes in 10 minutes (threshold: ${codeThreshold})`,
      count: codeChanges.length,
      threshold: codeThreshold,
    });
  }

  // Success rate check
  const successes = recent.filter(o => o.type === 'success');
  const total = recent.length;
  const successRate = total > 0 ? successes.length / total : 1;

  if (successRate < PHI_INV && total >= 5) {
    alerts.push({
      level: 'GROWL',
      type: 'low_success_rate',
      message: `Success rate ${(successRate * 100).toFixed(1)}% < ${(PHI_INV * 100).toFixed(1)}% (φ⁻¹)`,
      rate: successRate,
      threshold: PHI_INV,
    });
  }

  return alerts;
}

/**
 * Calculate contributor metrics
 */
function calculateContributorMetrics(contributors) {
  if (!contributors?.contributors) return null;

  const entries = Object.entries(contributors.contributors);
  const metrics = {
    total: entries.length,
    humans: 0,
    bots: 0,
    topContributors: [],
    totalCommits: 0,
    reposCovered: new Set(),
  };

  for (const [email, info] of entries) {
    if (email.includes('[bot]')) {
      metrics.bots++;
    } else {
      metrics.humans++;
    }

    metrics.totalCommits += info.totalCommits || 0;

    for (const repo of Object.keys(info.repos || {})) {
      metrics.reposCovered.add(repo);
    }

    metrics.topContributors.push({
      email,
      name: info.primaryName || email.split('@')[0],
      commits: info.totalCommits || 0,
      isBot: email.includes('[bot]'),
    });
  }

  metrics.topContributors.sort((a, b) => b.commits - a.commits);
  metrics.topContributors = metrics.topContributors.slice(0, 5);
  metrics.reposCovered = metrics.reposCovered.size;

  return metrics;
}

/**
 * Calculate session health
 */
function calculateSessionHealth(data) {
  const health = {
    score: 100,
    status: 'healthy',
    issues: [],
  };

  // Check observation freshness
  if (data.observations.length > 0) {
    const lastObs = data.observations[data.observations.length - 1];
    const age = Date.now() - lastObs.timestamp;
    const maxAge = 30 * 60 * 1000; // 30 minutes

    if (age > maxAge) {
      health.score -= 20;
      health.issues.push('No recent observations (>30min)');
    }
  } else {
    health.score -= 30;
    health.issues.push('No observations recorded');
  }

  // Check for errors
  const recentErrors = data.observations.filter(o => {
    return o.type === 'error' && Date.now() - o.timestamp < 60 * 60 * 1000;
  });

  if (recentErrors.length > 5) {
    health.score -= 30;
    health.issues.push(`High error count: ${recentErrors.length}/hour`);
  } else if (recentErrors.length > 2) {
    health.score -= 10;
    health.issues.push(`Elevated errors: ${recentErrors.length}/hour`);
  }

  // Check thresholds adaptation
  if (data.stats?.lastBurn) {
    const burnAge = Date.now() - data.stats.lastBurn.timestamp;
    const maxBurnAge = 24 * 60 * 60 * 1000; // 24 hours

    if (burnAge > maxBurnAge) {
      health.score -= 10;
      health.issues.push('Data not burned recently (>24h)');
    }
  }

  // Determine status
  if (health.score >= 80) {
    health.status = 'healthy';
  } else if (health.score >= 60) {
    health.status = 'degraded';
  } else if (health.score >= 40) {
    health.status = 'warning';
  } else {
    health.status = 'critical';
  }

  return health;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD OUTPUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format timestamp for display
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Format relative time
 */
function formatRelative(timestamp) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'warning': return '🟡';
    case 'critical': return '🔴';
    default: return '❓';
  }
}

/**
 * Get alert icon
 */
function getAlertIcon(level) {
  switch (level) {
    case 'GROWL': return '🔴';
    case 'BARK': return '🟡';
    case 'WAG': return '✅';
    default: return '📢';
  }
}

/**
 * Get trend icon
 */
function getTrendIcon(trend) {
  switch (trend) {
    case 'increasing': return '📈';
    case 'decreasing': return '📉';
    default: return '➡️';
  }
}

/**
 * Print dashboard
 */
function printDashboard() {
  const data = loadAllData();

  const obsMetrics = calculateObservationMetrics(data.observations);
  const alerts = calculateAlerts(data.observations, data.thresholds);
  const contribMetrics = calculateContributorMetrics(data.contributors);
  const health = calculateSessionHealth(data);

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('🐕 CYNIC MONITORING DASHBOARD');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Health status
  console.log(`${getStatusIcon(health.status)} SYSTEM HEALTH: ${health.status.toUpperCase()} (${health.score}/100)`);
  if (health.issues.length > 0) {
    for (const issue of health.issues) {
      console.log(`   └─ ⚠️ ${issue}`);
    }
  }

  // Alerts
  console.log('\n────────────────────────────────────────────────────────────────────────────────');
  console.log('📢 ALERTS');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  if (alerts.length === 0) {
    console.log('   *tail wag* No active alerts');
  } else {
    for (const alert of alerts) {
      console.log(`   ${getAlertIcon(alert.level)} [${alert.level}] ${alert.message}`);
    }
  }

  // Observations
  console.log('\n────────────────────────────────────────────────────────────────────────────────');
  console.log(`📊 OBSERVATIONS ${getTrendIcon(obsMetrics.trend)}`);
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(`   Total: ${obsMetrics.total} | Last hour: ${obsMetrics.lastHour} | Last day: ${obsMetrics.lastDay}`);
  console.log('   By type:');
  for (const [type, count] of Object.entries(obsMetrics.byType).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.min(20, Math.ceil(count / obsMetrics.total * 20)));
    console.log(`      ${type.padEnd(12)} ${bar} ${count}`);
  }

  // Recent observations
  console.log('\n   Recent:');
  const recentObs = data.observations.slice(-5).reverse();
  for (const obs of recentObs) {
    const icon = obs.type === 'error' ? '❌' : obs.type === 'success' ? '✅' : '📝';
    console.log(`      ${icon} [${formatRelative(obs.timestamp)}] ${obs.type}: ${obs.context || 'N/A'}`);
  }

  // Thresholds
  console.log('\n────────────────────────────────────────────────────────────────────────────────');
  console.log('📐 ADAPTIVE THRESHOLDS (φ-based)');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  if (data.thresholds) {
    for (const [key, value] of Object.entries(data.thresholds)) {
      if (typeof value === 'object' && value.threshold !== undefined) {
        console.log(`   ${key.padEnd(15)} threshold: ${value.threshold} (mean: ${value.mean?.toFixed(2) || 'N/A'})`);
      }
    }
  }

  // Contributors
  if (contribMetrics) {
    console.log('\n────────────────────────────────────────────────────────────────────────────────');
    console.log('👥 CONTRIBUTORS');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    console.log(`   Total: ${contribMetrics.total} (${contribMetrics.humans} humans, ${contribMetrics.bots} bots)`);
    console.log(`   Commits: ${contribMetrics.totalCommits} | Repos: ${contribMetrics.reposCovered}`);
    console.log('   Top:');
    for (const c of contribMetrics.topContributors) {
      const icon = c.isBot ? '🤖' : '👤';
      console.log(`      ${icon} ${c.name.padEnd(20)} ${String(c.commits).padStart(5)} commits`);
    }
  }

  // Last update
  console.log('\n────────────────────────────────────────────────────────────────────────────────');
  if (data.stats?.updatedAt) {
    console.log(`🕐 Last update: ${new Date(data.stats.updatedAt).toLocaleString('fr-FR')}`);
  }
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  return {
    health,
    alerts,
    obsMetrics,
    contribMetrics,
  };
}

/**
 * Print compact status line
 */
function printStatusLine() {
  const data = loadAllData();
  const health = calculateSessionHealth(data);
  const alerts = calculateAlerts(data.observations, data.thresholds);
  const obsMetrics = calculateObservationMetrics(data.observations);

  const icon = getStatusIcon(health.status);
  const alertCount = alerts.length;
  const alertStr = alertCount > 0 ? `🔔${alertCount}` : '';

  console.log(`${icon} CYNIC | Health: ${health.score}/100 | Obs: ${obsMetrics.lastHour}/h ${getTrendIcon(obsMetrics.trend)} ${alertStr}`);
}

/**
 * Export metrics as JSON (for external dashboards)
 */
function exportMetrics() {
  const data = loadAllData();

  return {
    timestamp: Date.now(),
    health: calculateSessionHealth(data),
    alerts: calculateAlerts(data.observations, data.thresholds),
    observations: calculateObservationMetrics(data.observations),
    contributors: calculateContributorMetrics(data.contributors),
    thresholds: data.thresholds,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GROWL INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

// Track previous state for change detection
let previousHealth = null;

/**
 * Trigger GROWL alerts based on monitoring state
 */
function triggerGrowlAlerts(currentHealth, alerts) {
  const growl = getAlerting();
  if (!growl) return;

  // Check for health status changes
  if (previousHealth && previousHealth.status !== currentHealth.status) {
    if (currentHealth.status === 'critical') {
      growl.growlHealth(
        'System Health Critical',
        `Health dropped from ${previousHealth.status} to ${currentHealth.status} (${currentHealth.score}/100)`,
        { previousScore: previousHealth.score, currentScore: currentHealth.score, issues: currentHealth.issues }
      );
    } else if (currentHealth.status === 'warning' && previousHealth.status === 'healthy') {
      growl.growlHealth(
        'System Health Warning',
        `Health degraded to ${currentHealth.status} (${currentHealth.score}/100)`,
        { issues: currentHealth.issues }
      );
    } else if (currentHealth.status === 'healthy' && previousHealth.status !== 'healthy') {
      // Recovery notification (INFO level)
      growl.sendAlert({
        severity: 'INFO',
        category: 'HEALTH',
        title: 'System Health Recovered',
        message: `Health restored to ${currentHealth.status} (${currentHealth.score}/100)`,
        tags: ['recovery', 'health'],
      });
    }
  }

  // Trigger alerts for high-severity items
  for (const alert of alerts) {
    if (alert.level === 'GROWL') {
      growl.growlHealth(alert.message, `Alert triggered: ${alert.message}`, { context: alert.context });
    }
  }

  // Update previous state
  previousHealth = { ...currentHealth };
}

// ═══════════════════════════════════════════════════════════════════════════
// WATCH MODE (Continuous monitoring)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Watch mode - refresh dashboard periodically
 *
 * @param {number} intervalMs - Refresh interval in milliseconds
 * @param {boolean} enableGrowl - Enable GROWL alerts on state changes
 */
function watch(intervalMs = 5000, enableGrowl = true) {
  console.clear();
  const result = printDashboard();

  // Trigger initial GROWL check
  if (enableGrowl) {
    triggerGrowlAlerts(result.health, result.alerts);
  }

  const interval = setInterval(() => {
    console.clear();
    const result = printDashboard();

    // Check for state changes and trigger GROWL
    if (enableGrowl) {
      triggerGrowlAlerts(result.health, result.alerts);
    }
  }, intervalMs);

  // Handle exit
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n*yawn* Monitoring stopped.');
    process.exit(0);
  });

  const growlStatus = enableGrowl ? '(GROWL enabled)' : '';
  console.log(`\n🔄 Watching... (refresh every ${intervalMs / 1000}s, Ctrl+C to stop) ${growlStatus}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Data loading
  loadAllData,
  loadJson,
  loadJsonl,

  // Metrics
  calculateObservationMetrics,
  calculateAlerts,
  calculateContributorMetrics,
  calculateSessionHealth,

  // Display
  printDashboard,
  printStatusLine,
  exportMetrics,

  // Watch mode
  watch,

  // GROWL integration
  triggerGrowlAlerts,
  getAlerting,

  // Constants
  PHI,
  PHI_INV,
  CYNIC_DIR,
  LEARNING_DIR,
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--watch') || args.includes('-w')) {
    const interval = parseInt(args.find(a => /^\d+$/.test(a)) || '5000', 10);
    const enableGrowl = !args.includes('--no-growl');
    watch(interval, enableGrowl);
  } else if (args.includes('--status') || args.includes('-s')) {
    printStatusLine();
  } else if (args.includes('--json') || args.includes('-j')) {
    console.log(JSON.stringify(exportMetrics(), null, 2));
  } else {
    printDashboard();
  }
}
