/**
 * Social Accountant - C4.6 (SOCIAL × ACCOUNT)
 *
 * Tracks economic value of social interactions in the 7×7 Fractal Matrix.
 * Measures engagement, reach, sentiment, and influence economics.
 *
 * "Le chien compte les aboiements" - CYNIC tracks social capital
 *
 * @module @cynic/node/accounting/social-accountant
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Social interaction types
 */
export const InteractionType = {
  MENTION: 'mention',
  REPLY: 'reply',
  RETWEET: 'retweet',
  LIKE: 'like',
  QUOTE: 'quote',
  FOLLOW: 'follow',
  DM: 'dm',
  POST: 'post',
};

/**
 * Engagement weights (φ-aligned)
 */
const ENGAGEMENT_WEIGHTS = {
  [InteractionType.MENTION]: 0.3,
  [InteractionType.REPLY]: PHI_INV,          // 0.618 - replies are high value
  [InteractionType.RETWEET]: PHI_INV_2,      // 0.382 - amplification
  [InteractionType.LIKE]: PHI_INV_3,         // 0.236 - low effort signal
  [InteractionType.QUOTE]: PHI_INV,          // 0.618 - quote with commentary
  [InteractionType.FOLLOW]: 0.5,
  [InteractionType.DM]: PHI_INV,             // 0.618 - direct engagement
  [InteractionType.POST]: PHI_INV_2,         // 0.382 - creating content
};

/**
 * SocialAccountant - Track economic value of social interactions
 */
export class SocialAccountant extends EventEmitter {
  constructor(options = {}) {
    super();

    this.telemetry = options.telemetry || null;
    this.factsRepo = options.factsRepo || null;

    this._sessionMetrics = {
      totalInteractions: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalSentiment: 0,
      totalInfluence: 0,
      totalValueScore: 0,
      byType: new Map(),
      startTime: Date.now(),
    };

    this._history = [];
    this._maxHistory = 1000;
  }

  /**
   * Track a social interaction
   *
   * @param {Object} interaction - The interaction to track
   * @param {string} interaction.type - InteractionType
   * @param {number} [interaction.reach] - Impression count
   * @param {number} [interaction.engagement] - Engagement count (likes, replies on post)
   * @param {number} [interaction.sentiment] - Sentiment score (-1.0 to +1.0)
   * @param {boolean} [interaction.isInfluencer] - High-reach account
   * @param {string} [interaction.platform] - Platform source (x, discord, etc.)
   * @param {Object} [metadata] - Additional metadata
   * @returns {Object} Interaction accounting result
   */
  trackInteraction(interaction, metadata = {}) {
    const {
      type = InteractionType.POST,
      reach = 0,
      engagement = 0,
      sentiment = 0,
      isInfluencer = false,
      platform = 'x',
    } = interaction;

    const timestamp = Date.now();

    // Calculate engagement value (weighted by type)
    const engagementValue = this._calculateEngagementValue(type, engagement, isInfluencer);

    // Calculate reach efficiency
    const reachEfficiency = this._calculateReachEfficiency(engagementValue, reach);

    // Calculate overall value score
    const valueScore = this._calculateValueScore(engagementValue, reachEfficiency, sentiment);

    const result = {
      timestamp,
      type,
      platform,
      metrics: {
        reach,
        engagement,
        engagementValue,
        reachEfficiency,
        sentiment,
        isInfluencer,
      },
      valueScore,
    };

    this._updateSessionMetrics(result);
    this._addToHistory(result);

    this.emit('interaction_tracked', result);

    if (this.factsRepo) {
      this._storeFact(result, metadata).catch(() => {});
    }

    return result;
  }

  /**
   * Calculate engagement value (φ-bounded)
   * @private
   */
  _calculateEngagementValue(type, engagement, isInfluencer) {
    const weight = ENGAGEMENT_WEIGHTS[type] || PHI_INV_3;
    let value = engagement * weight;

    // Influencer multiplier (capped at φ⁻¹)
    if (isInfluencer) value *= 1.5;

    return Math.min(value, PHI_INV);
  }

  /**
   * Calculate reach efficiency: engagement / (engagement + reach cost)
   * @private
   */
  _calculateReachEfficiency(engagementValue, reach) {
    const cost = reach / 1000; // normalize
    const eff = engagementValue / (engagementValue + cost + 0.01);
    return Math.min(eff, PHI_INV);
  }

  /**
   * Calculate overall value score
   * @private
   */
  _calculateValueScore(engagementValue, reachEfficiency, sentiment) {
    // Base: engagement × efficiency
    let value = engagementValue * reachEfficiency;

    // Sentiment modifier: positive sentiment amplifies, negative dampens
    const sentimentFactor = 1 + (sentiment * PHI_INV_3); // ±23.6% swing
    value *= sentimentFactor;

    return Math.min(Math.max(0, Math.round(value * 1000) / 1000), PHI_INV);
  }

  /**
   * Update session metrics
   * @private
   */
  _updateSessionMetrics(result) {
    this._sessionMetrics.totalInteractions++;
    this._sessionMetrics.totalEngagement += result.metrics.engagementValue;
    this._sessionMetrics.totalReach += result.metrics.reach;
    this._sessionMetrics.totalSentiment += result.metrics.sentiment;
    this._sessionMetrics.totalInfluence += result.metrics.isInfluencer ? 1 : 0;
    this._sessionMetrics.totalValueScore += result.valueScore;

    const typeCount = this._sessionMetrics.byType.get(result.type) || 0;
    this._sessionMetrics.byType.set(result.type, typeCount + 1);
  }

  /**
   * Add to history
   * @private
   */
  _addToHistory(result) {
    this._history.push(result);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  /**
   * Store as fact in repository
   * @private
   */
  async _storeFact(result, metadata) {
    if (!this.factsRepo) return;

    await this.factsRepo.create({
      userId: metadata.userId || 'system',
      sessionId: metadata.sessionId,
      factType: 'social_interaction_accounting',
      subject: result.type,
      content: JSON.stringify({
        metrics: result.metrics,
        value: result.valueScore,
        platform: result.platform,
      }),
      confidence: PHI_INV_2,
      source: 'social-accountant',
      context: {
        sentiment: result.metrics.sentiment,
        isInfluencer: result.metrics.isInfluencer,
      },
    });
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this._sessionMetrics.startTime;
    const total = this._sessionMetrics.totalInteractions;
    const avgSentiment = total > 0
      ? this._sessionMetrics.totalSentiment / total
      : 0;

    return {
      duration,
      totalInteractions: total,
      engagement: {
        total: this._sessionMetrics.totalEngagement,
        average: total > 0 ? this._sessionMetrics.totalEngagement / total : 0,
      },
      reach: {
        total: this._sessionMetrics.totalReach,
        average: total > 0 ? this._sessionMetrics.totalReach / total : 0,
      },
      sentiment: {
        total: this._sessionMetrics.totalSentiment,
        average: avgSentiment,
        mood: avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral',
      },
      influence: {
        influencerInteractions: this._sessionMetrics.totalInfluence,
        ratio: total > 0 ? this._sessionMetrics.totalInfluence / total : 0,
      },
      value: {
        total: this._sessionMetrics.totalValueScore,
        perInteraction: total > 0 ? this._sessionMetrics.totalValueScore / total : 0,
        efficiency: duration > 0
          ? this._sessionMetrics.totalValueScore / (duration / 1000)
          : 0,
      },
      byType: Object.fromEntries(this._sessionMetrics.byType),
    };
  }

  /**
   * Get historical trends
   */
  getTrends(windowSize = 10) {
    if (this._history.length < 2) return null;

    const recent = this._history.slice(-windowSize);
    const older = this._history.slice(-windowSize * 2, -windowSize);

    if (older.length === 0) return null;

    const recentAvgValue = recent.reduce((s, r) => s + r.valueScore, 0) / recent.length;
    const olderAvgValue = older.reduce((s, r) => s + r.valueScore, 0) / older.length;

    const recentAvgSentiment = recent.reduce((s, r) => s + r.metrics.sentiment, 0) / recent.length;
    const olderAvgSentiment = older.reduce((s, r) => s + r.metrics.sentiment, 0) / older.length;

    return {
      value: {
        current: recentAvgValue,
        previous: olderAvgValue,
        trend: recentAvgValue > olderAvgValue ? 'improving' : 'declining',
        delta: recentAvgValue - olderAvgValue,
      },
      sentiment: {
        current: recentAvgSentiment,
        previous: olderAvgSentiment,
        trend: recentAvgSentiment > olderAvgSentiment ? 'improving' : 'declining',
        delta: recentAvgSentiment - olderAvgSentiment,
      },
    };
  }

  /**
   * Reset session metrics
   */
  resetSession() {
    this._sessionMetrics = {
      totalInteractions: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalSentiment: 0,
      totalInfluence: 0,
      totalValueScore: 0,
      byType: new Map(),
      startTime: Date.now(),
    };
    this.emit('session_reset');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

export function getSocialAccountant(options = {}) {
  if (!_instance) {
    _instance = new SocialAccountant(options);
  }
  return _instance;
}

export function resetSocialAccountant() {
  if (_instance) {
    _instance.removeAllListeners();
  }
  _instance = null;
}

export default {
  SocialAccountant,
  InteractionType,
  getSocialAccountant,
  resetSocialAccountant,
};
