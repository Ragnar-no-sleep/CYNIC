/**
 * Cosmos Actor - C7.4 (COSMOS × ACT)
 *
 * Executes advisory actions from CosmosDecider decisions.
 * Records what SHOULD happen at ecosystem level, queues notifications.
 *
 * "Le chien agit pour les étoiles" - κυνικός
 *
 * @module @cynic/node/cosmos/cosmos-actor
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, createLogger, globalEventBus } from '@cynic/core';

const log = createLogger('CosmosActor');

export const CosmosActionType = {
  SIGNAL_ALERT: 'signal_alert',
  DOCUMENT_PATTERN: 'document_pattern',
  ADJUST_FOCUS: 'adjust_focus',
  SCHEDULE_REVIEW: 'schedule_review',
  LOG_INSIGHT: 'log_insight',
  RECOMMEND_DIVERSIFY: 'recommend_diversify',
};

export const CosmosActionStatus = {
  QUEUED: 'queued',
  DELIVERED: 'delivered',
  ACTED_ON: 'acted_on',
  DISMISSED: 'dismissed',
  EXPIRED: 'expired',
};

// φ-aligned cooldowns (ms) — Fibonacci values
const COOLDOWNS = {
  [CosmosActionType.SIGNAL_ALERT]: 34 * 60000,          // 34 min (F9)
  [CosmosActionType.DOCUMENT_PATTERN]: 21 * 60000,      // 21 min (F8)
  [CosmosActionType.ADJUST_FOCUS]: 13 * 60000,          // 13 min (F7)
  [CosmosActionType.SCHEDULE_REVIEW]: 89 * 60000,       // 89 min (F11)
  [CosmosActionType.LOG_INSIGHT]: 8 * 60000,            // 8 min (F6)
  [CosmosActionType.RECOMMEND_DIVERSIFY]: 55 * 60000,   // 55 min (F10)
};

export class CosmosActor extends EventEmitter {
  constructor(options = {}) {
    super();

    this._lastAction = new Map(); // type -> timestamp
    this._history = [];
    this._maxHistory = 144; // Fib(12)

    this._stats = {
      actionsTotal: 0,
      byType: {},
      delivered: 0,
      alertsRaised: 0,
      insightsLogged: 0,
      lastAction: null,
    };

    for (const type of Object.values(CosmosActionType)) {
      this._stats.byType[type] = 0;
    }
  }

  /**
   * Execute an action based on a cosmos decision
   *
   * @param {Object} decision - From CosmosDecider.decide()
   * @param {Object} [context] - Additional context
   * @returns {Object|null} Action result, or null if on cooldown
   */
  act(decision, context = {}) {
    const actionType = this._mapDecisionToAction(decision);
    if (!actionType) return null;

    if (this._isOnCooldown(actionType)) {
      log.debug('Cosmos action on cooldown', { type: actionType });
      return null;
    }

    const message = this._composeMessage(actionType, decision, context);

    const result = {
      type: actionType,
      status: CosmosActionStatus.DELIVERED,
      message,
      urgency: this._assessUrgency(decision),
      cell: 'C7.4',
      dimension: 'COSMOS',
      analysis: 'ACT',
      decision: decision.decision,
      reasoning: decision.reason,
      confidence: decision.confidence,
      timestamp: Date.now(),
    };

    this._lastAction.set(actionType, Date.now());
    this._updateStats(result);
    this._history.push(result);
    while (this._history.length > this._maxHistory) this._history.shift();

    this.emit('action', result);
    globalEventBus.publish('cosmos:action', result, { source: 'CosmosActor' });

    log.debug('Cosmos action delivered', { type: actionType, urgency: result.urgency });

    return result;
  }

  recordResponse(actionType, response) {
    const lastIdx = this._history.findLastIndex(a => a.type === actionType);
    if (lastIdx >= 0) {
      this._history[lastIdx].status = response === 'dismiss'
        ? CosmosActionStatus.DISMISSED
        : CosmosActionStatus.ACTED_ON;
    }
    this.emit('response', { type: actionType, response });
  }

  _mapDecisionToAction(decision) {
    const type = decision.decision || decision.type;
    const map = {
      'intervene': CosmosActionType.SIGNAL_ALERT,
      'decelerate': CosmosActionType.SIGNAL_ALERT,
      'focus': CosmosActionType.ADJUST_FOCUS,
      'diversify': CosmosActionType.RECOMMEND_DIVERSIFY,
      'accelerate': CosmosActionType.LOG_INSIGHT,
      'maintain': CosmosActionType.LOG_INSIGHT,
      'wait': null, // No action on wait
    };
    return map[type] ?? CosmosActionType.LOG_INSIGHT;
  }

  _assessUrgency(decision) {
    const type = decision.decision || decision.type;
    if (type === 'intervene') return 'critical';
    if (type === 'decelerate' || type === 'focus') return 'high';
    if (type === 'diversify') return 'medium';
    return 'low';
  }

  _isOnCooldown(actionType) {
    const last = this._lastAction.get(actionType);
    if (!last) return false;
    const cooldown = COOLDOWNS[actionType] || 21 * 60000;
    return (Date.now() - last) < cooldown;
  }

  _composeMessage(actionType, decision, context) {
    const reason = decision.reason || '';

    switch (actionType) {
      case CosmosActionType.SIGNAL_ALERT:
        return `*GROWL* Ecosystem alert. ${reason}`;

      case CosmosActionType.DOCUMENT_PATTERN:
        return `*sniff* Ecosystem pattern documented. ${reason}`;

      case CosmosActionType.ADJUST_FOCUS:
        return `*head tilt* Recommending focus shift. ${reason}`;

      case CosmosActionType.SCHEDULE_REVIEW:
        return `*yawn* Ecosystem review recommended. ${reason}`;

      case CosmosActionType.LOG_INSIGHT:
        return `*ears perk* Ecosystem insight: ${reason}`;

      case CosmosActionType.RECOMMEND_DIVERSIFY:
        return `*tail wag* Diversification opportunity. ${reason}`;

      default:
        return `*sniff* Cosmos action: ${actionType}`;
    }
  }

  _updateStats(result) {
    this._stats.actionsTotal++;
    this._stats.byType[result.type] = (this._stats.byType[result.type] || 0) + 1;
    this._stats.delivered++;
    this._stats.lastAction = Date.now();

    if (result.type === CosmosActionType.SIGNAL_ALERT) this._stats.alertsRaised++;
    if (result.type === CosmosActionType.LOG_INSIGHT) this._stats.insightsLogged++;
  }

  getStats() { return { ...this._stats }; }

  getHistory(limit = 21) {
    return this._history.slice(-limit);
  }

  getHealth() {
    const alertRate = this._stats.actionsTotal > 0
      ? this._stats.alertsRaised / this._stats.actionsTotal
      : 0;

    return {
      status: alertRate < PHI_INV_2 ? 'healthy' : 'high_alert_ecosystem',
      score: Math.min(PHI_INV, 1 - alertRate),
      actionsTotal: this._stats.actionsTotal,
      alertRate,
      insightsLogged: this._stats.insightsLogged,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

export function getCosmosActor(options = {}) {
  if (!_instance) _instance = new CosmosActor(options);
  return _instance;
}

export function resetCosmosActor() {
  if (_instance) _instance.removeAllListeners();
  _instance = null;
}

export default { CosmosActor, CosmosActionType, CosmosActionStatus, getCosmosActor, resetCosmosActor };
