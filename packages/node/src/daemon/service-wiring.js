/**
 * CYNIC Daemon — Service Wiring
 *
 * Force-initializes daemon-essential singletons at boot time.
 * No lazy loading — the daemon wakes warm.
 *
 * Wires:
 *   - ModelIntelligence (Thompson Sampling)
 *   - CostLedger (budget tracking)
 *   - cost:update → ModelIntelligence budget awareness
 *   - Periodic state persistence (5 min, .unref())
 *
 * "Le chien se réchauffe avant la chasse" — CYNIC
 *
 * @module @cynic/node/daemon/service-wiring
 */

'use strict';

import { createLogger, globalEventBus } from '@cynic/core';
import { getModelIntelligence } from '../learning/model-intelligence.js';
import { getCostLedger } from '../accounting/cost-ledger.js';

const log = createLogger('ServiceWiring');

/** Persist interval: 5 min (φ × 3 ≈ 4.85, rounded to 5) */
const PERSIST_INTERVAL_MS = 5 * 60 * 1000;

let _persistTimer = null;
let _costListener = null;
let _wired = false;

/**
 * Wire daemon-essential services at boot.
 *
 * Force-initializes singletons so they're warm for hook requests.
 * Wires cross-service events and periodic persistence.
 *
 * @returns {{ modelIntelligence: Object, costLedger: Object }}
 */
export function wireDaemonServices() {
  if (_wired) {
    log.debug('Services already wired — skipping');
    return {
      modelIntelligence: getModelIntelligence(),
      costLedger: getCostLedger(),
    };
  }

  // 1. Force-initialize singletons (warm, not lazy)
  const mi = getModelIntelligence();
  const costLedger = getCostLedger();

  log.info('Singletons warm', {
    modelIntelligence: !!mi,
    costLedger: !!costLedger,
    thompsonMaturity: mi.getStats().samplerMaturity,
  });

  // 2. Wire cost:update → ModelIntelligence budget awareness
  _costListener = (data) => {
    try {
      const budget = data?.budget;
      if (budget && budget.level) {
        // Emit model recommendation when budget changes
        const rec = costLedger.recommendModel({
          taskType: 'moderate',
          needsReasoning: false,
        });
        globalEventBus.emit('model:recommendation', {
          model: rec.model,
          reason: rec.reason,
          budgetLevel: budget.level,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      log.debug('cost:update handler error', { error: err.message });
    }
  };

  globalEventBus.on('cost:update', _costListener);

  // 3. Periodic state persistence (.unref() so it doesn't block exit)
  _persistTimer = setInterval(() => {
    try {
      mi.persist();
      costLedger.persist();
      log.debug('Periodic persist completed');
    } catch (err) {
      log.debug('Periodic persist failed', { error: err.message });
    }
  }, PERSIST_INTERVAL_MS);
  _persistTimer.unref();

  _wired = true;

  log.info('Daemon services wired');
  return { modelIntelligence: mi, costLedger };
}

/**
 * Cleanup wired services for graceful shutdown.
 *
 * Persists final state and removes event listeners.
 */
export function cleanupDaemonServices() {
  if (!_wired) return;

  // Stop periodic persist
  if (_persistTimer) {
    clearInterval(_persistTimer);
    _persistTimer = null;
  }

  // Remove event listener
  if (_costListener) {
    globalEventBus.removeListener('cost:update', _costListener);
    _costListener = null;
  }

  // Final persist
  try {
    getModelIntelligence().persist();
    getCostLedger().persist();
    log.info('Final persist completed');
  } catch (err) {
    log.debug('Final persist failed', { error: err.message });
  }

  _wired = false;
  log.info('Daemon services cleaned up');
}

/**
 * Check if services are wired.
 * @returns {boolean}
 */
export function isWired() {
  return _wired;
}

/**
 * Reset for testing — clears all state without persisting.
 */
export function _resetForTesting() {
  if (_persistTimer) {
    clearInterval(_persistTimer);
    _persistTimer = null;
  }
  if (_costListener) {
    globalEventBus.removeListener('cost:update', _costListener);
    _costListener = null;
  }
  _wired = false;
}
