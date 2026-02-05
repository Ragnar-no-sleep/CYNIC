/**
 * @cynic/agent - Decider Module
 *
 * Judges opportunities and decides actions using CYNIC 25-dimension system.
 * "Le doute est la sagesse du chien" - κυνικός
 *
 * @module @cynic/agent/decider
 */

'use strict';

import { EventEmitter } from 'eventemitter3';
import { PHI_INV, PHI_INV_2, PHI_INV_3, createLogger } from '@cynic/core';

const log = createLogger('Decider');

// ═══════════════════════════════════════════════════════════════════════════════
// Decision Types
// ═══════════════════════════════════════════════════════════════════════════════

export const Action = {
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD',
};

export const Verdict = {
  STRONG_BUY: 'STRONG_BUY',   // High confidence long
  BUY: 'BUY',                 // Moderate confidence long
  HOLD: 'HOLD',               // No action
  SELL: 'SELL',               // Moderate confidence short/exit
  STRONG_SELL: 'STRONG_SELL', // High confidence short/exit
};

// ═══════════════════════════════════════════════════════════════════════════════
// 25 Judgment Dimensions (from CYNIC ontology)
// ═══════════════════════════════════════════════════════════════════════════════

export const Dimensions = {
  // Reality Perception
  AUTHENTICITY: 'authenticity',       // Is the signal real or manipulated?
  TIMING: 'timing',                   // Is timing favorable?
  LIQUIDITY: 'liquidity',             // Can we enter/exit without slippage?
  VOLATILITY: 'volatility',           // Risk from price swings?

  // Token Quality
  TOKEN_QUALITY: 'token_quality',     // Overall token fundamentals
  TEAM: 'team',                       // Team credibility
  CONTRACT: 'contract',               // Contract safety (rug risk)
  COMMUNITY: 'community',             // Community strength

  // Market Context
  TREND: 'trend',                     // Market trend alignment
  SENTIMENT: 'sentiment',             // Social sentiment
  MOMENTUM: 'momentum',               // Price momentum
  VOLUME: 'volume',                   // Volume confirmation

  // Risk Assessment
  RISK_REWARD: 'risk_reward',         // R:R ratio
  POSITION_SIZE: 'position_size',     // Appropriate size?
  CORRELATION: 'correlation',         // Portfolio correlation
  DRAWDOWN: 'drawdown',               // Max drawdown risk

  // Technical Signals
  SUPPORT_RESISTANCE: 'support_resistance',
  BREAKOUT: 'breakout',
  DIVERGENCE: 'divergence',
  PATTERN: 'pattern',

  // Meta
  CONFIDENCE: 'confidence',           // Self-assessed confidence
  NOVELTY: 'novelty',                 // How new is this pattern?
  HISTORY: 'history',                 // Past performance on similar
  ALIGNMENT: 'alignment',             // Strategy alignment

  // The Unnameable (residual)
  THE_UNNAMEABLE: 'the_unnameable',   // Unknown unknowns
};

// ═══════════════════════════════════════════════════════════════════════════════
// Decider Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decider - Judges opportunities and decides actions
 */
export class Decider extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = options;

    // Dimension weights (φ-aligned)
    this.weights = this._initWeights();

    // Metrics
    this.metrics = {
      judgments: 0,
      decisions: 0,
      buys: 0,
      sells: 0,
      holds: 0,
    };

    // History for learning
    this.history = [];
    this.maxHistory = 100;
  }

  /**
   * Initialize dimension weights
   * @private
   */
  _initWeights() {
    const weights = {};

    // Critical dimensions get φ⁻¹ weight
    const critical = [
      Dimensions.CONTRACT,
      Dimensions.LIQUIDITY,
      Dimensions.RISK_REWARD,
    ];

    // Important dimensions get φ⁻² weight
    const important = [
      Dimensions.AUTHENTICITY,
      Dimensions.TOKEN_QUALITY,
      Dimensions.TREND,
      Dimensions.VOLUME,
    ];

    // All others get φ⁻³ weight
    for (const dim of Object.values(Dimensions)) {
      if (critical.includes(dim)) {
        weights[dim] = PHI_INV;
      } else if (important.includes(dim)) {
        weights[dim] = PHI_INV_2;
      } else {
        weights[dim] = PHI_INV_3;
      }
    }

    return weights;
  }

  /**
   * Judge an opportunity across 25 dimensions
   *
   * @param {Object} opportunity - The opportunity to judge
   * @returns {Object} Judgment with scores and verdict
   */
  async judge(opportunity) {
    this.metrics.judgments++;

    const scores = {};
    let totalWeight = 0;
    let weightedSum = 0;

    // Score each dimension
    for (const [dim, weight] of Object.entries(this.weights)) {
      const score = await this._scoreDimension(dim, opportunity);
      scores[dim] = score;

      weightedSum += score * weight;
      totalWeight += weight;
    }

    // Calculate Q-Score (0-100)
    const qScore = Math.round((weightedSum / totalWeight) * 100);

    // Determine verdict
    const verdict = this._determineVerdict(qScore, scores);

    // Calculate confidence (capped at φ⁻¹)
    const rawConfidence = this._calculateConfidence(scores);
    const confidence = Math.min(rawConfidence, PHI_INV);

    const judgment = {
      id: `jdg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      opportunityId: opportunity.id,
      timestamp: Date.now(),
      qScore,
      verdict,
      confidence,
      scores,
      opportunity,
    };

    // Record for learning
    this._recordJudgment(judgment);

    this.emit('judgment', judgment);
    log.info('Judgment complete', { qScore, verdict, confidence: confidence.toFixed(3) });

    return judgment;
  }

  /**
   * Score a single dimension
   * @private
   */
  async _scoreDimension(dimension, opportunity) {
    // In production, each dimension would have specialized logic
    // For hackathon, use simplified scoring

    const { signal, magnitude, direction } = opportunity;

    switch (dimension) {
      case Dimensions.AUTHENTICITY:
        // Higher magnitude = potentially manipulated
        return magnitude > 0.3 ? 0.4 : 0.7;

      case Dimensions.TIMING:
        // Simple time-based heuristic
        const hour = new Date().getUTCHours();
        return (hour >= 13 && hour <= 21) ? 0.7 : 0.5; // US market hours

      case Dimensions.LIQUIDITY:
        // Would check DEX liquidity in production
        return 0.6;

      case Dimensions.VOLATILITY:
        // High volatility = lower score (more risk)
        return magnitude > 0.2 ? 0.4 : 0.7;

      case Dimensions.TOKEN_QUALITY:
        // Would use K-Score from HolDex
        return 0.5;

      case Dimensions.CONTRACT:
        // Would check for rug risk indicators
        return 0.5;

      case Dimensions.TREND:
        // Align with signal direction
        return direction === 'LONG' ? 0.6 : 0.4;

      case Dimensions.VOLUME:
        // Volume confirmation
        return signal?.data?.currentVolume > signal?.data?.previousVolume ? 0.7 : 0.4;

      case Dimensions.RISK_REWARD:
        // Simplified R:R estimation
        return magnitude > 0.1 ? 0.6 : 0.4;

      case Dimensions.THE_UNNAMEABLE:
        // Always uncertain
        return 0.5;

      default:
        // Default neutral score
        return 0.5;
    }
  }

  /**
   * Determine verdict from Q-Score and dimensions
   * @private
   */
  _determineVerdict(qScore, scores) {
    // Red flags that override Q-Score
    if (scores[Dimensions.CONTRACT] < 0.3) return Verdict.STRONG_SELL;
    if (scores[Dimensions.LIQUIDITY] < 0.2) return Verdict.HOLD;

    // Q-Score based verdict
    if (qScore >= 75) return Verdict.STRONG_BUY;
    if (qScore >= 60) return Verdict.BUY;
    if (qScore >= 40) return Verdict.HOLD;
    if (qScore >= 25) return Verdict.SELL;
    return Verdict.STRONG_SELL;
  }

  /**
   * Calculate confidence from score variance
   * @private
   */
  _calculateConfidence(scores) {
    const values = Object.values(scores);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Lower variance = higher confidence
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // High stdDev = low confidence
    const confidence = 1 - stdDev;
    return Math.max(0.1, Math.min(PHI_INV, confidence));
  }

  /**
   * Decide action from judgment
   *
   * @param {Object} judgment - The judgment
   * @param {Object} options - Decision options
   * @returns {Object} Decision with action and parameters
   */
  async decide(judgment, options = {}) {
    const {
      maxConfidence = PHI_INV,
      minConfidence = PHI_INV_2,
    } = options;

    this.metrics.decisions++;

    // Cap confidence
    const confidence = Math.min(judgment.confidence, maxConfidence);

    // Determine action
    let action = Action.HOLD;
    let size = 0;

    if (confidence >= minConfidence) {
      switch (judgment.verdict) {
        case Verdict.STRONG_BUY:
        case Verdict.BUY:
          action = Action.BUY;
          size = this._calculatePositionSize(confidence, judgment.qScore);
          this.metrics.buys++;
          break;

        case Verdict.STRONG_SELL:
        case Verdict.SELL:
          action = Action.SELL;
          size = this._calculatePositionSize(confidence, judgment.qScore);
          this.metrics.sells++;
          break;

        default:
          this.metrics.holds++;
      }
    } else {
      this.metrics.holds++;
    }

    const decision = {
      id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      judgmentId: judgment.id,
      timestamp: Date.now(),
      action,
      confidence,
      verdict: judgment.verdict,
      qScore: judgment.qScore,
      size,
      token: judgment.opportunity.token,
      mint: judgment.opportunity.mint,
      reason: this._generateReason(judgment, action),
    };

    this.emit('decision', decision);
    log.info('Decision made', { action, confidence: confidence.toFixed(3), size });

    return decision;
  }

  /**
   * Calculate position size from confidence
   * @private
   */
  _calculatePositionSize(confidence, qScore) {
    // φ-aligned sizing: confidence determines fraction of max
    // Max position = 10%, min = 1%
    const maxPosition = 0.10;
    const minPosition = 0.01;

    // Scale by confidence and Q-Score
    const scaleFactor = (confidence / PHI_INV) * (qScore / 100);
    const size = minPosition + (maxPosition - minPosition) * scaleFactor;

    return Math.round(size * 1000) / 1000; // 3 decimal precision
  }

  /**
   * Generate human-readable reason
   * @private
   */
  _generateReason(judgment, action) {
    const { qScore, confidence, scores } = judgment;

    if (action === Action.HOLD) {
      if (confidence < PHI_INV_2) {
        return `Confidence too low (${(confidence * 100).toFixed(1)}% < ${(PHI_INV_2 * 100).toFixed(1)}%)`;
      }
      return `Q-Score neutral (${qScore}/100)`;
    }

    // Find strongest contributing dimensions
    const sorted = Object.entries(scores)
      .filter(([k]) => k !== Dimensions.THE_UNNAMEABLE)
      .sort((a, b) => b[1] - a[1]);

    const top3 = sorted.slice(0, 3).map(([k]) => k);

    return `${action} signal: Q=${qScore}, conf=${(confidence * 100).toFixed(1)}%. Top factors: ${top3.join(', ')}`;
  }

  /**
   * Record judgment for history
   * @private
   */
  _recordJudgment(judgment) {
    this.history.push({
      id: judgment.id,
      timestamp: judgment.timestamp,
      qScore: judgment.qScore,
      verdict: judgment.verdict,
      confidence: judgment.confidence,
    });

    while (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      metrics: { ...this.metrics },
      historySize: this.history.length,
      weights: Object.keys(this.weights).length,
    };
  }
}

export default Decider;
