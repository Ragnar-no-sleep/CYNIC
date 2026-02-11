/**
 * Daemon Provider
 *
 * Wraps DaemonServer + observation services in the Lifecycle interface for bootCYNIC().
 * Provides HTTP server on :6180 and always-on observation.
 *
 * "Le chien ne dort jamais vraiment" - CYNIC
 *
 * @module @cynic/core/boot/providers/daemon
 */

'use strict';

import { HealthStatus } from '../lifecycle.js';
import { registerProvider } from '../discovery.js';
import { createLogger } from '../../logger.js';

const log = createLogger('DaemonProvider');

/**
 * Register daemon-specific providers with the discovery system
 *
 * Call this before bootDaemon() to enable daemon components.
 * Registers: daemon-http, daemon-loop
 *
 * @param {Object} [options]
 * @param {number} [options.port=6180] - HTTP port (φ × 3820 ≈ 6180)
 * @param {string} [options.host='127.0.0.1'] - Bind host (localhost only for security)
 */
export function registerDaemonProviders(options = {}) {
  const {
    port = parseInt(process.env.CYNIC_DAEMON_PORT || '6180', 10),
    host = process.env.CYNIC_DAEMON_HOST || '127.0.0.1',
  } = options;

  // Daemon HTTP server provider
  registerProvider('daemon-http', {
    dependencies: ['config'],
    create: () => ({ server: null, startTime: null, port, host }),
    initialize: async (state) => {
      const { DaemonServer } = await import('@cynic/node/daemon');
      state.server = new DaemonServer({ port: state.port, host: state.host });
    },
    start: async (state) => {
      if (!state.server) {
        throw new Error('Daemon server not initialized');
      }
      state.startTime = Date.now();
      await state.server.start();
    },
    stop: async (state) => {
      if (state.server && typeof state.server.stop === 'function') {
        await state.server.stop();
      }
      state.server = null;
      state.startTime = null;
    },
    health: async (state) => {
      if (!state.server) {
        return { status: HealthStatus.UNHEALTHY, error: 'Server not running' };
      }
      return {
        status: HealthStatus.HEALTHY,
        port: state.port,
        host: state.host,
        uptime: state.startTime ? Date.now() - state.startTime : 0,
      };
    },
  });

  // Daemon observation loop provider (HeartbeatService, FilesystemWatcher, etc.)
  registerProvider('daemon-loop', {
    dependencies: ['config', 'daemon-http'],
    create: () => ({ services: [], running: false }),
    initialize: async (state) => {
      // Services are lazy-started in start() — no initialization needed
      log.info('Daemon observation loop initialized');
    },
    start: async (state) => {
      state.running = true;
      // HeartbeatService, FilesystemWatcher, etc. are started by
      // collective-singleton during getCollectivePackAsync()
      // The daemon-loop provider just tracks their lifecycle
      log.info('Daemon observation loop started');
    },
    stop: async (state) => {
      state.running = false;
      state.services = [];
      log.info('Daemon observation loop stopped');
    },
    health: async (state) => ({
      status: state.running ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
      services: state.services.length,
    }),
  });
}
