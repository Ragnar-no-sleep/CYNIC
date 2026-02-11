#!/usr/bin/env node
/**
 * CYNIC Daemon Entry Point
 *
 * Spawned by `cynic daemon start` or auto-started by thin hooks.
 * Boots collective-singleton, starts DaemonServer, runs forever.
 *
 * "Le chien se lève" - CYNIC
 *
 * @module @cynic/node/daemon/entry
 */

'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { bootDaemon } from '@cynic/core/boot';
import { DaemonServer } from './index.js';
import { processRegistry, createLogger } from '@cynic/core';

const log = createLogger('DaemonEntry');

const DAEMON_DIR = path.join(os.homedir(), '.cynic', 'daemon');
const PID_FILE = path.join(DAEMON_DIR, 'daemon.pid');
const LOG_FILE = path.join(DAEMON_DIR, 'daemon.log');

// Parse port from args or env
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : parseInt(process.env.CYNIC_DAEMON_PORT || '6180', 10);

/**
 * Append to log file (daemon has no console)
 */
function logToFile(level, message) {
  try {
    if (!fs.existsSync(DAEMON_DIR)) {
      fs.mkdirSync(DAEMON_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] [${level}] ${message}\n`);
  } catch { /* ignore */ }
}

/**
 * Main daemon boot sequence
 */
async function main() {
  logToFile('INFO', `Daemon starting (PID: ${process.pid}, port: ${port})`);

  // Write PID file
  try {
    if (!fs.existsSync(DAEMON_DIR)) {
      fs.mkdirSync(DAEMON_DIR, { recursive: true });
    }
    fs.writeFileSync(PID_FILE, process.pid.toString());
  } catch (err) {
    logToFile('ERROR', `Failed to write PID file: ${err.message}`);
  }

  let server;

  try {
    // Create and start daemon server
    server = new DaemonServer({ port, host: '127.0.0.1' });
    await server.start();
    logToFile('INFO', `Daemon server listening on 127.0.0.1:${port}`);

    // Boot CYNIC subsystems (exclude P2P, MCP, transport)
    try {
      const cynic = await bootDaemon({ silent: true });
      logToFile('INFO', `Boot completed: ${cynic.components?.length || 0} components`);
    } catch (err) {
      logToFile('WARN', `Boot partial: ${err.message}`);
      // Daemon still runs — it can serve hooks even without full boot
    }

    logToFile('INFO', 'Daemon fully operational');
  } catch (err) {
    logToFile('ERROR', `Daemon failed to start: ${err.message}`);
    cleanup();
    process.exit(1);
  }

  // Graceful shutdown handlers
  function cleanup() {
    logToFile('INFO', 'Daemon shutting down...');
    try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
    try { processRegistry.depart(); } catch { /* ignore */ }
    if (server) {
      server.stop().catch(() => {});
    }
  }

  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('uncaughtException', (err) => {
    logToFile('ERROR', `Uncaught exception: ${err.message}\n${err.stack}`);
    cleanup();
    process.exit(1);
  });
  process.on('unhandledRejection', (err) => {
    logToFile('WARN', `Unhandled rejection: ${err?.message || err}`);
  });
}

main().catch((err) => {
  logToFile('ERROR', `Fatal: ${err.message}`);
  process.exit(1);
});
