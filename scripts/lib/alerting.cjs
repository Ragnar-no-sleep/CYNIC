/**
 * GROWL Alerting System
 *
 * Multi-channel alert system with φ-based severity thresholds.
 * "A dog's bark warns before danger strikes" - κυνικός
 *
 * @module @cynic/scripts/alerting
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// φ Constants for severity thresholds
const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;         // 0.618 - warning threshold
const PHI_INV_2 = 1 / (PHI * PHI); // 0.382 - critical threshold

// ═══════════════════════════════════════════════════════════════════════════
// ALERT SEVERITY LEVELS
// ═══════════════════════════════════════════════════════════════════════════

const SEVERITY = {
  INFO: {
    level: 0,
    name: 'INFO',
    emoji: 'ℹ️',
    color: 0x3498db, // Blue
    sound: 'whine',   // Soft whine
  },
  WARNING: {
    level: 1,
    name: 'WARNING',
    emoji: '⚠️',
    color: 0xf39c12, // Orange
    sound: 'bark',    // Single bark
  },
  CRITICAL: {
    level: 2,
    name: 'CRITICAL',
    emoji: '🚨',
    color: 0xe74c3c, // Red
    sound: 'growl',   // Deep growl
  },
  EMERGENCY: {
    level: 3,
    name: 'EMERGENCY',
    emoji: '💀',
    color: 0x9b59b6, // Purple
    sound: 'howl',    // Full howl
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ALERT CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIES = {
  SECURITY: {
    name: 'security',
    emoji: '🔒',
    description: 'Security-related alerts',
  },
  HEALTH: {
    name: 'health',
    emoji: '💓',
    description: 'System health alerts',
  },
  ECOSYSTEM: {
    name: 'ecosystem',
    emoji: '🌐',
    description: 'Ecosystem changes',
  },
  SCORE: {
    name: 'score',
    emoji: '📊',
    description: 'Score threshold alerts (K-Score, E-Score, Q-Score)',
  },
  GOVERNANCE: {
    name: 'governance',
    emoji: '🏛️',
    description: 'Governance and protocol alerts',
  },
  ANOMALY: {
    name: 'anomaly',
    emoji: '🔍',
    description: 'Unusual pattern detected',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ALERT STORAGE
// ═══════════════════════════════════════════════════════════════════════════

const ALERT_DIR = path.join(os.homedir(), '.cynic/alerts');
const ALERT_LOG = path.join(ALERT_DIR, 'alerts.jsonl');
const CONFIG_FILE = path.join(ALERT_DIR, 'config.json');

// In-memory alert buffer (last 100 alerts)
const alertBuffer = [];
const MAX_BUFFER_SIZE = 100;

// Default configuration
let config = {
  channels: {
    console: { enabled: true, minSeverity: 'INFO' },
    file: { enabled: true, minSeverity: 'INFO' },
    webhook: { enabled: false, url: null, minSeverity: 'WARNING' },
    discord: { enabled: false, webhookUrl: null, minSeverity: 'WARNING' },
  },
  cooldown: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxAlerts: 10,   // Max alerts per window
  },
  filters: {
    categories: [], // Empty = all categories
    minSeverity: 'INFO',
  },
};

// Cooldown tracking
const cooldownTracker = {
  windowStart: Date.now(),
  count: 0,
};

// ═══════════════════════════════════════════════════════════════════════════
// ALERT CLASS
// ═══════════════════════════════════════════════════════════════════════════

class Alert {
  constructor({
    severity = 'INFO',
    category = 'HEALTH',
    title,
    message,
    source = 'CYNIC',
    data = {},
    tags = [],
  }) {
    this.id = `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.timestamp = Date.now();
    this.severity = SEVERITY[severity] || SEVERITY.INFO;
    this.category = CATEGORIES[category] || CATEGORIES.HEALTH;
    this.title = title;
    this.message = message;
    this.source = source;
    this.data = data;
    this.tags = tags;
    this.acknowledged = false;
    this.acknowledgedAt = null;
    this.acknowledgedBy = null;
  }

  get severityLevel() {
    return this.severity.level;
  }

  acknowledge(by = 'system') {
    this.acknowledged = true;
    this.acknowledgedAt = Date.now();
    this.acknowledgedBy = by;
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      severity: this.severity.name,
      category: this.category.name,
      title: this.title,
      message: this.message,
      source: this.source,
      data: this.data,
      tags: this.tags,
      acknowledged: this.acknowledged,
      acknowledgedAt: this.acknowledgedAt,
      acknowledgedBy: this.acknowledgedBy,
    };
  }

  toConsoleString() {
    const time = new Date(this.timestamp).toISOString().slice(11, 19);
    return `${this.severity.emoji} [${time}] ${this.category.emoji} ${this.title}: ${this.message}`;
  }

  toDiscordEmbed() {
    return {
      title: `${this.severity.emoji} ${this.title}`,
      description: this.message,
      color: this.severity.color,
      fields: [
        { name: 'Category', value: `${this.category.emoji} ${this.category.name}`, inline: true },
        { name: 'Severity', value: this.severity.name, inline: true },
        { name: 'Source', value: this.source, inline: true },
      ],
      timestamp: new Date(this.timestamp).toISOString(),
      footer: { text: 'CYNIC Alerting - κυνικός' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize alerting system
 */
function init() {
  // Create directories
  if (!fs.existsSync(ALERT_DIR)) {
    fs.mkdirSync(ALERT_DIR, { recursive: true });
  }

  // Load config
  loadConfig();
}

/**
 * Load configuration
 */
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...config, ...loaded };
    } catch (e) {
      // Use defaults
    }
  }
}

/**
 * Save configuration
 */
function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION CHANNELS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send to console
 */
function sendToConsole(alert) {
  const channelConfig = config.channels.console;
  if (!channelConfig.enabled) return;
  if (alert.severityLevel < SEVERITY[channelConfig.minSeverity].level) return;

  console.log(alert.toConsoleString());
}

/**
 * Append to log file
 */
function sendToFile(alert) {
  const channelConfig = config.channels.file;
  if (!channelConfig.enabled) return;
  if (alert.severityLevel < SEVERITY[channelConfig.minSeverity].level) return;

  fs.appendFileSync(ALERT_LOG, JSON.stringify(alert.toJSON()) + '\n');
}

/**
 * Send to generic webhook
 */
function sendToWebhook(alert) {
  const channelConfig = config.channels.webhook;
  if (!channelConfig.enabled || !channelConfig.url) return;
  if (alert.severityLevel < SEVERITY[channelConfig.minSeverity].level) return;

  try {
    const url = new URL(channelConfig.url);
    const protocol = url.protocol === 'https:' ? https : http;

    const payload = JSON.stringify(alert.toJSON());

    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'User-Agent': 'CYNIC-Alerting/1.0',
        },
      },
      res => {
        // Silent - fire and forget
      }
    );

    req.on('error', () => {
      // Silent failure - don't recurse alerts
    });

    req.write(payload);
    req.end();
  } catch (e) {
    // Silent failure
  }
}

/**
 * Send to Discord webhook
 */
function sendToDiscord(alert) {
  const channelConfig = config.channels.discord;
  if (!channelConfig.enabled || !channelConfig.webhookUrl) return;
  if (alert.severityLevel < SEVERITY[channelConfig.minSeverity].level) return;

  try {
    const url = new URL(channelConfig.webhookUrl);

    const payload = JSON.stringify({
      username: 'CYNIC',
      avatar_url: 'https://raw.githubusercontent.com/jeanterre/assets/main/cynic-avatar.png',
      embeds: [alert.toDiscordEmbed()],
    });

    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      res => {
        // Silent
      }
    );

    req.on('error', () => {
      // Silent
    });

    req.write(payload);
    req.end();
  } catch (e) {
    // Silent failure
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ALERT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if alert should be filtered/throttled
 */
function shouldSendAlert(alert) {
  // Category filter
  if (config.filters.categories.length > 0) {
    if (!config.filters.categories.includes(alert.category.name)) {
      return false;
    }
  }

  // Minimum severity filter
  if (alert.severityLevel < SEVERITY[config.filters.minSeverity].level) {
    return false;
  }

  // Cooldown check
  if (config.cooldown.enabled) {
    const now = Date.now();

    // Reset window if expired
    if (now - cooldownTracker.windowStart > config.cooldown.windowMs) {
      cooldownTracker.windowStart = now;
      cooldownTracker.count = 0;
    }

    // Check rate limit (but always allow EMERGENCY)
    if (alert.severity.name !== 'EMERGENCY') {
      if (cooldownTracker.count >= config.cooldown.maxAlerts) {
        return false;
      }
    }

    cooldownTracker.count++;
  }

  return true;
}

/**
 * Send an alert through all configured channels
 */
function sendAlert(alertOrParams) {
  const alert = alertOrParams instanceof Alert ? alertOrParams : new Alert(alertOrParams);

  // Add to buffer
  alertBuffer.push(alert);
  if (alertBuffer.length > MAX_BUFFER_SIZE) {
    alertBuffer.shift();
  }

  // Check filters/throttling
  if (!shouldSendAlert(alert)) {
    return alert;
  }

  // Send to all channels
  sendToConsole(alert);
  sendToFile(alert);
  sendToWebhook(alert);
  sendToDiscord(alert);

  return alert;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE ALERT FUNCTIONS (GROWL variants)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GROWL - Security warning
 */
function growlSecurity(title, message, data = {}) {
  return sendAlert({
    severity: 'CRITICAL',
    category: 'SECURITY',
    title,
    message,
    data,
    tags: ['security', 'growl'],
  });
}

/**
 * GROWL - Health warning
 */
function growlHealth(title, message, data = {}) {
  return sendAlert({
    severity: 'WARNING',
    category: 'HEALTH',
    title,
    message,
    data,
    tags: ['health', 'growl'],
  });
}

/**
 * GROWL - Score threshold crossed
 */
function growlScore(scoreType, oldValue, newValue, threshold, data = {}) {
  const crossed = newValue < threshold ? 'below' : 'above';
  const direction = newValue < oldValue ? '↓' : '↑';

  return sendAlert({
    severity: crossed === 'below' ? 'WARNING' : 'INFO',
    category: 'SCORE',
    title: `${scoreType} Threshold ${direction}`,
    message: `${scoreType} moved ${direction} from ${oldValue.toFixed(1)} to ${newValue.toFixed(1)} (threshold: ${threshold.toFixed(1)})`,
    data: { scoreType, oldValue, newValue, threshold, ...data },
    tags: ['score', scoreType.toLowerCase(), 'growl'],
  });
}

/**
 * GROWL - Ecosystem change
 */
function growlEcosystem(title, message, data = {}) {
  return sendAlert({
    severity: 'INFO',
    category: 'ECOSYSTEM',
    title,
    message,
    data,
    tags: ['ecosystem', 'growl'],
  });
}

/**
 * GROWL - Anomaly detected
 */
function growlAnomaly(title, message, confidence = 0.5, data = {}) {
  // Severity based on confidence (φ-scaled)
  let severity = 'INFO';
  if (confidence >= PHI_INV) severity = 'WARNING';
  if (confidence >= PHI_INV + PHI_INV_2) severity = 'CRITICAL';

  return sendAlert({
    severity,
    category: 'ANOMALY',
    title,
    message,
    data: { confidence, ...data },
    tags: ['anomaly', 'growl'],
  });
}

/**
 * HOWL - Emergency (highest priority)
 */
function howl(title, message, data = {}) {
  return sendAlert({
    severity: 'EMERGENCY',
    category: 'SECURITY',
    title: `🐕 HOWL: ${title}`,
    message,
    data,
    tags: ['emergency', 'howl'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MONITORING INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check monitoring data and generate appropriate alerts
 */
function checkMonitoringAlerts(monitoringData) {
  const alerts = [];

  // Health score check
  if (monitoringData.health) {
    const health = monitoringData.health;

    if (health.score < PHI_INV_2 * 100) { // < 38.2%
      alerts.push(sendAlert({
        severity: 'CRITICAL',
        category: 'HEALTH',
        title: 'System Health Critical',
        message: `Health score dropped to ${health.score.toFixed(1)}%`,
        data: { score: health.score, issues: health.issues },
      }));
    } else if (health.score < PHI_INV * 100) { // < 61.8%
      alerts.push(sendAlert({
        severity: 'WARNING',
        category: 'HEALTH',
        title: 'System Health Degraded',
        message: `Health score at ${health.score.toFixed(1)}%`,
        data: { score: health.score, issues: health.issues },
      }));
    }
  }

  // Error rate check
  if (monitoringData.observations) {
    const errorRate = monitoringData.observations.errorRate || 0;

    if (errorRate > PHI_INV * 100) { // > 61.8% errors
      alerts.push(sendAlert({
        severity: 'CRITICAL',
        category: 'HEALTH',
        title: 'High Error Rate',
        message: `Error rate at ${errorRate.toFixed(1)}% - above φ⁻¹ threshold`,
        data: { errorRate },
      }));
    } else if (errorRate > PHI_INV_2 * 100) { // > 38.2% errors
      alerts.push(sendAlert({
        severity: 'WARNING',
        category: 'HEALTH',
        title: 'Elevated Error Rate',
        message: `Error rate at ${errorRate.toFixed(1)}%`,
        data: { errorRate },
      }));
    }
  }

  return alerts;
}

/**
 * Check graph data for alerts (E-Score tier changes, etc)
 */
function checkGraphAlerts(previousScores, currentScores) {
  const alerts = [];

  if (!previousScores || !currentScores) return alerts;

  // Check for tier changes
  for (const current of currentScores) {
    const previous = previousScores.find(p => p.userId === current.userId);
    if (!previous) continue;

    // Tier change detection
    if (previous.tier !== current.tier) {
      const direction = current.normalizedScore > previous.normalizedScore ? 'promoted' : 'demoted';

      alerts.push(sendAlert({
        severity: direction === 'demoted' ? 'WARNING' : 'INFO',
        category: 'SCORE',
        title: `E-Score Tier Change`,
        message: `${current.userName} ${direction}: ${previous.tier} → ${current.tier} (${previous.normalizedScore} → ${current.normalizedScore})`,
        data: {
          userId: current.userId,
          userName: current.userName,
          previousTier: previous.tier,
          currentTier: current.tier,
          previousScore: previous.normalizedScore,
          currentScore: current.normalizedScore,
        },
        tags: ['e-score', 'tier-change'],
      }));
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get recent alerts from buffer
 */
function getRecentAlerts(count = 10, severity = null, category = null) {
  let alerts = [...alertBuffer];

  if (severity) {
    alerts = alerts.filter(a => a.severity.name === severity);
  }

  if (category) {
    alerts = alerts.filter(a => a.category.name === category);
  }

  return alerts.slice(-count).reverse();
}

/**
 * Get unacknowledged alerts
 */
function getUnacknowledgedAlerts() {
  return alertBuffer.filter(a => !a.acknowledged);
}

/**
 * Acknowledge an alert by ID
 */
function acknowledgeAlert(alertId, by = 'user') {
  const alert = alertBuffer.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledge(by);
    return true;
  }
  return false;
}

/**
 * Acknowledge all alerts
 */
function acknowledgeAll(by = 'user') {
  for (const alert of alertBuffer) {
    if (!alert.acknowledged) {
      alert.acknowledge(by);
    }
  }
}

/**
 * Configure a channel
 */
function configureChannel(channelName, channelConfig) {
  if (config.channels[channelName]) {
    config.channels[channelName] = { ...config.channels[channelName], ...channelConfig };
    saveConfig();
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Print alert summary
 */
function printSummary() {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('🐕 CYNIC GROWL ALERTING SYSTEM');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  console.log('CHANNELS:');
  for (const [name, cfg] of Object.entries(config.channels)) {
    const status = cfg.enabled ? '✓ enabled' : '✗ disabled';
    console.log(`   ${name.padEnd(12)} ${status} (min: ${cfg.minSeverity})`);
  }

  console.log('\nSEVERITY LEVELS:');
  for (const [name, info] of Object.entries(SEVERITY)) {
    console.log(`   ${info.emoji} ${name.padEnd(12)} (${info.sound})`);
  }

  console.log('\nCATEGORIES:');
  for (const [name, info] of Object.entries(CATEGORIES)) {
    console.log(`   ${info.emoji} ${name.padEnd(12)} ${info.description}`);
  }

  const unack = getUnacknowledgedAlerts();
  console.log(`\nBUFFER: ${alertBuffer.length} alerts (${unack.length} unacknowledged)`);

  if (unack.length > 0) {
    console.log('\nUNACKNOWLEDGED ALERTS:');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    for (const alert of unack.slice(-5)) {
      console.log(`   ${alert.toConsoleString()}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Initialization
  init,
  loadConfig,
  saveConfig,

  // Core classes
  Alert,
  SEVERITY,
  CATEGORIES,

  // Alert functions
  sendAlert,

  // GROWL convenience functions
  growlSecurity,
  growlHealth,
  growlScore,
  growlEcosystem,
  growlAnomaly,
  howl,

  // Monitoring integration
  checkMonitoringAlerts,
  checkGraphAlerts,

  // Query & management
  getRecentAlerts,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  acknowledgeAll,
  configureChannel,

  // Display
  printSummary,

  // Constants
  PHI,
  PHI_INV,
  PHI_INV_2,

  // Config access
  getConfig: () => config,
};

// CLI execution
if (require.main === module) {
  init();

  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    // Test alerts
    console.log('Testing alerting system...\n');

    sendAlert({ severity: 'INFO', category: 'HEALTH', title: 'Test Info', message: 'This is an info alert' });
    sendAlert({ severity: 'WARNING', category: 'SCORE', title: 'Test Warning', message: 'This is a warning alert' });
    growlSecurity('Test Security', 'Testing security growl');
    growlAnomaly('Test Anomaly', 'Unusual pattern detected', 0.75);

    console.log('\n');
  }

  if (args.includes('--config')) {
    console.log(JSON.stringify(config, null, 2));
  } else {
    printSummary();
  }
}
