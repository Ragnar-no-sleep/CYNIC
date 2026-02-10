/**
 * CYNIC Code Actor - C1.4 (CODE × ACT)
 *
 * Executes advisory actions from CodeDecider (C1.3) decisions.
 * CYNIC doesn't modify code directly — Claude Code does.
 * CodeActor records what SHOULD happen, queues notifications,
 * and tracks code action history.
 *
 * "Le chien aboie, le code obéit" - κυνικός
 *
 * Actions:
 * - Approve commit (record green light)
 * - Flag review (queue code review notification)
 * - Suggest tests (queue test coverage alert)
 * - Suggest refactor (queue refactoring recommendation)
 * - Block alert (raise danger signal)
 * - Log debt (record technical debt)
 *
 * @module @cynic/node/code/code-actor
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, createLogger, globalEventBus } from '@cynic/core';

const log = createLogger('CodeActor');

export const CodeActionType = {
  APPROVE_COMMIT: 'approve_commit',
  FLAG_REVIEW: 'flag_review',
  SUGGEST_TESTS: 'suggest_tests',
  SUGGEST_REFACTOR: 'suggest_refactor',
  BLOCK_ALERT: 'block_alert',
  LOG_DEBT: 'log_debt',
};

export const CodeActionStatus = {
  QUEUED: 'queued',
  DELIVERED: 'delivered',
  ACTED_ON: 'acted_on',
  DISMISSED: 'dismissed',
  EXPIRED: 'expired',
};

// φ-aligned cooldowns (ms)
const COOLDOWNS = {
  [CodeActionType.APPROVE_COMMIT]: 0,                    // No cooldown — always record
  [CodeActionType.FLAG_REVIEW]: 5 * 60000,               // 5 min
  [CodeActionType.SUGGEST_TESTS]: 13 * 60000,            // 13 min (Fib)
  [CodeActionType.SUGGEST_REFACTOR]: 21 * 60000,         // 21 min (Fib)
  [CodeActionType.BLOCK_ALERT]: 0,                        // No cooldown — always alert
  [CodeActionType.LOG_DEBT]: 8 * 60000,                   // 8 min (Fib)
};

export class CodeActor extends EventEmitter {
  constructor(options = {}) {
    super();

    this._lastAction = new Map(); // type -> timestamp
    this._history = [];
    this._maxHistory = 233; // Fib(13)
    this._debtLog = [];     // Technical debt tracker
    this._maxDebt = 89;     // Fib(11)

    this._stats = {
      actionsTotal: 0,
      byType: {},
      delivered: 0,
      blocksRaised: 0,
      reviewsFlagged: 0,
      debtsLogged: 0,
      lastAction: null,
    };

    for (const type of Object.values(CodeActionType)) {
      this._stats.byType[type] = 0;
    }
  }

  /**
   * Execute an action based on a code decision
   *
   * @param {Object} decision - From CodeDecider.decide()
   * @param {Object} [context] - Additional context (judgmentId, qScore, etc.)
   * @returns {Object|null} Action result, or null if on cooldown
   */
  act(decision, context = {}) {
    const actionType = this._mapDecisionToAction(decision);
    if (!actionType) return null;

    // Check cooldown
    if (this._isOnCooldown(actionType)) {
      log.debug('Code action on cooldown', { type: actionType });
      return null;
    }

    const message = this._composeMessage(actionType, decision, context);

    const result = {
      type: actionType,
      status: CodeActionStatus.DELIVERED,
      message,
      urgency: this._assessUrgency(decision),
      cell: 'C1.4',
      dimension: 'CODE',
      analysis: 'ACT',
      decision: decision.type || decision.decision,
      reasoning: decision.reasoning || decision.reason,
      risk: decision.risk,
      confidence: decision.confidence,
      judgmentId: context.judgmentId,
      timestamp: Date.now(),
    };

    this._lastAction.set(actionType, Date.now());
    this._updateStats(result);
    this._history.push(result);
    while (this._history.length > this._maxHistory) this._history.shift();

    // Track technical debt separately
    if (actionType === CodeActionType.LOG_DEBT ||
        actionType === CodeActionType.SUGGEST_REFACTOR ||
        actionType === CodeActionType.SUGGEST_TESTS) {
      this._recordDebt(result, decision, context);
    }

    this.emit('action', result);
    globalEventBus.emit('code:action', result);

    log.debug('Code action delivered', { type: actionType, urgency: result.urgency });

    return result;
  }

  /**
   * Record that an action was acted upon
   */
  recordResponse(actionType, response) {
    const lastIdx = this._history.findLastIndex(a => a.type === actionType);
    if (lastIdx >= 0) {
      this._history[lastIdx].status = response === 'dismiss'
        ? CodeActionStatus.DISMISSED
        : CodeActionStatus.ACTED_ON;
    }
    this.emit('response', { type: actionType, response });
  }

  _mapDecisionToAction(decision) {
    const type = decision.type || decision.decision;
    const map = {
      'approve': CodeActionType.APPROVE_COMMIT,
      'approve_commit': CodeActionType.APPROVE_COMMIT,
      'queue_review': CodeActionType.FLAG_REVIEW,
      'require_tests': CodeActionType.SUGGEST_TESTS,
      'require_refactor': CodeActionType.SUGGEST_REFACTOR,
      'block': CodeActionType.BLOCK_ALERT,
      'defer': CodeActionType.LOG_DEBT,
    };
    return map[type] || CodeActionType.LOG_DEBT;
  }

  _assessUrgency(decision) {
    const type = decision.type || decision.decision;
    if (type === 'block') return 'critical';
    if (type === 'require_tests' || type === 'require_refactor') return 'high';
    if (type === 'queue_review') return 'medium';
    return 'low';
  }

  _isOnCooldown(actionType) {
    const last = this._lastAction.get(actionType);
    if (!last) return false;
    const cooldown = COOLDOWNS[actionType] || 5 * 60000;
    return (Date.now() - last) < cooldown;
  }

  _composeMessage(actionType, decision, context) {
    const qScore = context.qScore ? ` (Q:${context.qScore})` : '';

    switch (actionType) {
      case CodeActionType.APPROVE_COMMIT:
        return `*tail wag* Code approved${qScore}. ${decision.reasoning || 'φ permits.'}`;

      case CodeActionType.FLAG_REVIEW:
        return `*sniff* Code needs review${qScore}. ${decision.reasoning || 'Confidence below φ⁻¹.'}`;

      case CodeActionType.SUGGEST_TESTS:
        return `*ears perk* Tests needed${qScore}. ${decision.reasoning || 'Non-trivial change without coverage.'}`;

      case CodeActionType.SUGGEST_REFACTOR:
        return `*head tilt* Consider refactoring${qScore}. ${decision.reasoning || 'Complexity warrants simplification.'}`;

      case CodeActionType.BLOCK_ALERT:
        return `*GROWL* Code BLOCKED${qScore}. ${decision.reasoning || 'Risk exceeds φ threshold.'}`;

      case CodeActionType.LOG_DEBT:
        return `*sniff* Technical debt noted${qScore}. ${decision.reasoning || 'Deferred for now.'}`;

      default:
        return `*sniff* Code action: ${actionType}${qScore}`;
    }
  }

  _recordDebt(result, decision, context) {
    this._debtLog.push({
      type: result.type,
      reasoning: decision.reasoning || decision.reason,
      risk: decision.risk,
      judgmentId: context.judgmentId,
      timestamp: Date.now(),
    });
    while (this._debtLog.length > this._maxDebt) this._debtLog.shift();
    this._stats.debtsLogged++;
  }

  _updateStats(result) {
    this._stats.actionsTotal++;
    this._stats.byType[result.type] = (this._stats.byType[result.type] || 0) + 1;
    this._stats.delivered++;
    this._stats.lastAction = Date.now();

    if (result.type === CodeActionType.BLOCK_ALERT) this._stats.blocksRaised++;
    if (result.type === CodeActionType.FLAG_REVIEW) this._stats.reviewsFlagged++;
  }

  getStats() { return { ...this._stats }; }

  getDebtLog(limit = 21) {
    return this._debtLog.slice(-limit);
  }

  getHealth() {
    const blockRate = this._stats.actionsTotal > 0
      ? this._stats.blocksRaised / this._stats.actionsTotal
      : 0;

    return {
      status: blockRate < PHI_INV_2 ? 'healthy' : 'high_risk_codebase',
      score: Math.min(PHI_INV, 1 - blockRate),
      actionsTotal: this._stats.actionsTotal,
      blockRate,
      debtCount: this._debtLog.length,
      reviewsFlagged: this._stats.reviewsFlagged,
    };
  }

  getHistory(limit = 21) {
    return this._history.slice(-limit);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let _instance = null;

export function getCodeActor(options = {}) {
  if (!_instance) _instance = new CodeActor(options);
  return _instance;
}

export function resetCodeActor() {
  if (_instance) _instance.removeAllListeners();
  _instance = null;
}

export default { CodeActor, CodeActionType, CodeActionStatus, getCodeActor, resetCodeActor };
