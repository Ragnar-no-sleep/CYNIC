#!/usr/bin/env node
/**
 * CYNIC Cockpit Daemon
 *
 * "Le chien veille toujours" - The dog always watches
 *
 * Background process for continuous ecosystem monitoring.
 * Runs independently of Claude sessions, keeping cockpit data fresh.
 *
 * Features:
 * - φ-aligned scan intervals (61.8 seconds)
 * - Proactive alert generation
 * - Dependency graph updates
 * - Optional webhook notifications
 *
 * Usage:
 *   node cockpit-daemon.cjs start   # Start daemon
 *   node cockpit-daemon.cjs stop    # Stop daemon
 *   node cockpit-daemon.cjs status  # Check status
 *   node cockpit-daemon.cjs once    # Single scan (no daemon)
 *
 * @module cynic/daemon/cockpit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load cockpit library
const cockpitPath = path.join(__dirname, '..', 'lib', 'cockpit.cjs');
const cockpit = require(cockpitPath);

// =============================================================================
// CONSTANTS
// =============================================================================

const PHI_INV = 0.618033988749895;
const SCAN_INTERVAL_MS = Math.round(PHI_INV * 100 * 1000); // 61.8 seconds
const DAEMON_NAME = 'cynic-cockpit';

// Paths
const DAEMON_DIR = path.join(process.env.HOME || '/root', '.cynic', 'daemon');
const PID_FILE = path.join(DAEMON_DIR, 'cockpit.pid');
const LOG_FILE = path.join(DAEMON_DIR, 'cockpit.log');
const CONFIG_FILE = path.join(DAEMON_DIR, 'cockpit.config.json');

// Ensure daemon directory exists
if (!fs.existsSync(DAEMON_DIR)) {
  fs.mkdirSync(DAEMON_DIR, { recursive: true });
}

// =============================================================================
// LOGGING
// =============================================================================

function log(level, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

  // Write to log file
  fs.appendFileSync(LOG_FILE, line);

  // Also console if not daemonized
  if (!process.env.CYNIC_DAEMONIZED) {
    process.stdout.write(line);
  }
}

function logInfo(message) { log('info', message); }
function logWarn(message) { log('warn', message); }
function logError(message) { log('error', message); }

// =============================================================================
// CONFIG
// =============================================================================

function loadConfig() {
  const defaults = {
    scanInterval: SCAN_INTERVAL_MS,
    webhookUrl: null,
    webhookOnAlertOnly: true,
    maxAlerts: 100,
    alertTtlMs: 3600000,
    notifyOnCritical: true,
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const custom = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...defaults, ...custom };
    } catch (e) {
      logWarn(`Failed to load config: ${e.message}, using defaults`);
    }
  }

  return defaults;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// =============================================================================
// DAEMON CONTROL
// =============================================================================

function isRunning() {
  if (!fs.existsSync(PID_FILE)) return false;

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
    // Check if process exists
    process.kill(pid, 0);
    return pid;
  } catch (e) {
    // Process doesn't exist, clean up stale PID file
    try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
    return false;
  }
}

function writePid() {
  fs.writeFileSync(PID_FILE, process.pid.toString());
}

function removePid() {
  try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
}

function startDaemon() {
  const running = isRunning();
  if (running) {
    console.log(`Daemon already running (PID: ${running})`);
    process.exit(0);
  }

  console.log('Starting CYNIC Cockpit Daemon...');

  // Fork the process
  const child = spawn(process.execPath, [__filename, 'run'], {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, CYNIC_DAEMONIZED: '1' }
  });

  child.unref();

  // Wait a moment and check if it started
  setTimeout(() => {
    const pid = isRunning();
    if (pid) {
      console.log(`Daemon started (PID: ${pid})`);
      console.log(`Scan interval: ${SCAN_INTERVAL_MS}ms (φ-aligned)`);
      console.log(`Log file: ${LOG_FILE}`);
    } else {
      console.error('Failed to start daemon. Check log file.');
      process.exit(1);
    }
  }, 500);
}

function stopDaemon() {
  const pid = isRunning();
  if (!pid) {
    console.log('Daemon is not running');
    process.exit(0);
  }

  console.log(`Stopping daemon (PID: ${pid})...`);

  try {
    process.kill(pid, 'SIGTERM');

    // Wait for graceful shutdown
    let attempts = 0;
    const checkInterval = setInterval(() => {
      if (!isRunning()) {
        clearInterval(checkInterval);
        console.log('Daemon stopped');
        process.exit(0);
      }
      attempts++;
      if (attempts > 10) {
        clearInterval(checkInterval);
        // Force kill
        try { process.kill(pid, 'SIGKILL'); } catch { /* ignore */ }
        removePid();
        console.log('Daemon force killed');
        process.exit(0);
      }
    }, 500);
  } catch (e) {
    console.error(`Failed to stop daemon: ${e.message}`);
    removePid();
    process.exit(1);
  }
}

function showStatus() {
  const pid = isRunning();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              CYNIC COCKPIT DAEMON STATUS                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (pid) {
    console.log(`║  Status: 🟢 RUNNING (PID: ${pid})`.padEnd(65) + '║');
  } else {
    console.log('║  Status: 🔴 STOPPED'.padEnd(65) + '║');
  }

  console.log(`║  Scan interval: ${SCAN_INTERVAL_MS}ms (φ-aligned)`.padEnd(65) + '║');
  console.log(`║  Log file: ${LOG_FILE.slice(-40)}`.padEnd(65) + '║');

  // Show last scan info
  const state = cockpit.getCockpitState();
  if (state.status) {
    const lastScan = new Date(state.status.timestamp).toLocaleString();
    console.log(`║  Last scan: ${lastScan}`.padEnd(65) + '║');
    console.log(`║  Repos: ${state.status.summary.total} │ ✅ ${state.status.summary.healthy} │ ⚠️ ${state.status.summary.warnings} │ 🔴 ${state.status.summary.critical}`.padEnd(65) + '║');
  }

  // Show alerts count
  const alerts = cockpit.loadAlerts();
  const activeAlerts = (alerts.alerts || []).filter(a => !a.acknowledged);
  console.log(`║  Active alerts: ${activeAlerts.length}`.padEnd(65) + '║');

  console.log('╚══════════════════════════════════════════════════════════════╝');
}

// =============================================================================
// MAIN LOOP
// =============================================================================

let scanCount = 0;
let lastAlertCount = 0;

async function runScan() {
  scanCount++;
  logInfo(`Starting scan #${scanCount}...`);

  try {
    const startTime = Date.now();
    const state = cockpit.fullScan();
    const duration = Date.now() - startTime;

    const summary = state.status?.summary || {};
    const alertCount = state.alerts?.alerts?.length || 0;
    const newAlerts = alertCount - lastAlertCount;

    logInfo(`Scan #${scanCount} completed in ${duration}ms: ${summary.total} repos, ${summary.healthy} healthy, ${summary.warnings} warnings, ${summary.critical} critical`);

    if (newAlerts > 0) {
      logInfo(`${newAlerts} new alert(s) generated`);

      // Check for critical alerts that need notification
      const config = loadConfig();
      if (config.notifyOnCritical) {
        const criticalAlerts = (state.alerts?.alerts || [])
          .filter(a => a.severity === 'critical' && !a.acknowledged);

        if (criticalAlerts.length > 0) {
          logWarn(`CRITICAL ALERT: ${criticalAlerts[0].message}`);
          await sendWebhook(config, criticalAlerts);
        }
      }
    }

    lastAlertCount = alertCount;

  } catch (error) {
    logError(`Scan failed: ${error.message}`);
  }
}

async function sendWebhook(config, alerts) {
  if (!config.webhookUrl) return;

  try {
    const https = require('https');
    const http = require('http');
    const url = new URL(config.webhookUrl);
    const transport = url.protocol === 'https:' ? https : http;

    const body = JSON.stringify({
      source: 'cynic-cockpit',
      timestamp: new Date().toISOString(),
      alerts: alerts.map(a => ({
        type: a.type,
        severity: a.severity,
        message: a.message,
        repo: a.repo,
      })),
    });

    return new Promise((resolve) => {
      const req = transport.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 5000,
      }, (res) => {
        logInfo(`Webhook sent: ${res.statusCode}`);
        resolve();
      });

      req.on('error', (e) => {
        logError(`Webhook failed: ${e.message}`);
        resolve();
      });

      req.write(body);
      req.end();
    });
  } catch (e) {
    logError(`Webhook error: ${e.message}`);
  }
}

function runDaemon() {
  // Write PID file
  writePid();

  logInfo('═══════════════════════════════════════════════════════════');
  logInfo('CYNIC Cockpit Daemon starting...');
  logInfo(`PID: ${process.pid}`);
  logInfo(`Scan interval: ${SCAN_INTERVAL_MS}ms (φ-aligned)`);
  logInfo('═══════════════════════════════════════════════════════════');

  // Handle shutdown signals
  const shutdown = (signal) => {
    logInfo(`Received ${signal}, shutting down...`);
    removePid();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  // Initial scan
  runScan();

  // Schedule periodic scans
  setInterval(runScan, SCAN_INTERVAL_MS);

  logInfo('Daemon running. Press Ctrl+C to stop (if not daemonized).');
}

// =============================================================================
// CLI
// =============================================================================

const command = process.argv[2] || 'status';

switch (command) {
  case 'start':
    startDaemon();
    break;

  case 'stop':
    stopDaemon();
    break;

  case 'status':
    showStatus();
    break;

  case 'run':
    // Internal: actual daemon process
    runDaemon();
    break;

  case 'once':
    // Single scan, no daemon
    console.log('Running single scan...');
    runScan().then(() => {
      const state = cockpit.getCockpitState();
      console.log(cockpit.formatCockpitStatus(state));
    });
    break;

  case 'logs':
    // Show recent logs
    if (fs.existsSync(LOG_FILE)) {
      const logs = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = logs.split('\n').slice(-50);
      console.log(lines.join('\n'));
    } else {
      console.log('No logs found');
    }
    break;

  case 'config': {
    // Show/edit config
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
    break;
  }

  default:
    console.log(`
CYNIC Cockpit Daemon - "Le chien veille toujours"

Usage:
  node cockpit-daemon.cjs <command>

Commands:
  start   Start the daemon in background
  stop    Stop the running daemon
  status  Show daemon status
  once    Run a single scan (no daemon)
  logs    Show recent log entries
  config  Show current configuration

The daemon scans the ecosystem every ${SCAN_INTERVAL_MS}ms (φ-aligned)
and keeps cockpit data fresh for Claude sessions.
`);
}
