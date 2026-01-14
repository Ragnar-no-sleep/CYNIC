/**
 * Operator
 *
 * CYNIC Node Operator - identity, E-Score, and BURN tracking
 *
 * "Don't extract, burn" - Operators gain weight through burning, not staking
 *
 * @module @cynic/node/operator/operator
 */

'use strict';

import { PHI } from '@cynic/core';
import { calculateVoteWeight } from '@cynic/protocol';
import { createIdentity, importIdentity, exportIdentity, getPublicIdentity } from './identity.js';
import { createEScoreState, updateEScoreState, getEScoreBreakdown } from './escore.js';

/**
 * CYNIC Operator
 */
export class Operator {
  /**
   * Create new operator
   * @param {Object} [options] - Operator options
   * @param {string} [options.name] - Operator name
   * @param {Object} [options.identity] - Existing identity to import
   */
  constructor(options = {}) {
    // Initialize identity
    if (options.identity) {
      this.identity = importIdentity(options.identity);
    } else {
      this.identity = createIdentity({ name: options.name });
    }

    // Initialize E-Score
    this.eScore = createEScoreState();
    this.eScore.createdAt = Date.now();

    // BURN tracking - "Don't extract, burn"
    this.burn = {
      totalBurned: 0,
      burnHistory: [],
      lastBurn: null,
    };

    // Operational stats
    this.stats = {
      startedAt: Date.now(),
      uptime: 0,
      blocksProduced: 0,
      judgmentsMade: 0,
      patternsContributed: 0,
    };
  }

  /**
   * Get operator ID
   * @returns {string} Operator ID
   */
  get id() {
    return this.identity.id;
  }

  /**
   * Get public key
   * @returns {string} Public key
   */
  get publicKey() {
    return this.identity.publicKey;
  }

  /**
   * Get private key
   * @returns {string} Private key
   */
  get privateKey() {
    return this.identity.privateKey;
  }

  /**
   * Get formatted public key
   * @returns {string} Formatted public key (ed25519:...)
   */
  get publicKeyFormatted() {
    return this.identity.publicKeyFormatted;
  }

  /**
   * Get current E-Score
   * @returns {number} Composite E-Score
   */
  getEScore() {
    return this.eScore.composite;
  }

  /**
   * Get current uptime ratio
   * @returns {number} Uptime (0-1)
   */
  getUptime() {
    const now = Date.now();
    const totalTime = now - this.stats.startedAt;
    return totalTime > 0 ? Math.min(this.stats.uptime / totalTime, 1) : 0;
  }

  /**
   * Get vote weight for consensus
   * @returns {number} Vote weight
   */
  getVoteWeight() {
    return calculateVoteWeight({
      eScore: this.getEScore(),
      burned: this.burn.totalBurned,
      uptime: this.getUptime(),
    });
  }

  /**
   * Record a burn
   * @param {number} amount - Amount burned
   * @param {string} [reason] - Burn reason
   * @returns {Object} Burn record
   */
  recordBurn(amount, reason = 'voluntary') {
    const record = {
      amount,
      reason,
      timestamp: Date.now(),
      totalAfter: this.burn.totalBurned + amount,
    };

    this.burn.totalBurned += amount;
    this.burn.burnHistory.push(record);
    this.burn.lastBurn = record;

    // Update E-Score
    this._updateEScore();

    return record;
  }

  /**
   * Record block production
   */
  recordBlockProduced() {
    this.stats.blocksProduced++;
    this._updateEScore();
  }

  /**
   * Record judgment made
   */
  recordJudgment() {
    this.stats.judgmentsMade++;
    this._updateEScore();
  }

  /**
   * Record pattern contribution
   */
  recordPatternContribution() {
    this.stats.patternsContributed++;
    this._updateEScore();
  }

  /**
   * Update uptime
   * @param {number} uptimeMs - Uptime in milliseconds
   */
  updateUptime(uptimeMs) {
    this.stats.uptime = uptimeMs;
    this._updateEScore();
  }

  /**
   * Update E-Score from current stats
   * @private
   */
  _updateEScore() {
    const accountAgeDays = (Date.now() - this.eScore.createdAt) / (1000 * 60 * 60 * 24);

    this.eScore = updateEScoreState(this.eScore, {
      burnedTotal: this.burn.totalBurned,
      contributions: this.stats.patternsContributed,
      nodeUptime: this.getUptime(),
      usageCount: this.stats.judgmentsMade,
      accountAge: Math.floor(accountAgeDays),
    });
  }

  /**
   * Get E-Score breakdown
   * @returns {Object} Detailed breakdown
   */
  getEScoreBreakdown() {
    return getEScoreBreakdown(this.eScore);
  }

  /**
   * Get public info (safe to share)
   * @returns {Object} Public operator info
   */
  getPublicInfo() {
    return {
      ...getPublicIdentity(this.identity),
      eScore: this.getEScore(),
      burned: this.burn.totalBurned,
      uptime: this.getUptime(),
      voteWeight: this.getVoteWeight(),
      stats: {
        blocksProduced: this.stats.blocksProduced,
        judgmentsMade: this.stats.judgmentsMade,
        patternsContributed: this.stats.patternsContributed,
      },
    };
  }

  /**
   * Export operator state for persistence
   * @param {boolean} [includePrivate=true] - Include private key
   * @returns {Object} Exportable state
   */
  export(includePrivate = true) {
    return {
      identity: exportIdentity(this.identity, includePrivate),
      eScore: this.eScore,
      burn: this.burn,
      stats: this.stats,
    };
  }

  /**
   * Import operator from saved state
   * @param {Object} state - Saved state
   * @returns {Operator} Restored operator
   */
  static import(state) {
    const operator = new Operator({
      identity: state.identity,
    });

    if (state.eScore) {
      operator.eScore = state.eScore;
    }
    if (state.burn) {
      operator.burn = state.burn;
    }
    if (state.stats) {
      operator.stats = state.stats;
    }

    return operator;
  }
}

export default { Operator };
