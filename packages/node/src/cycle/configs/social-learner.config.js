/**
 * SocialLearner Config — C4.5 (SOCIAL × LEARN)
 *
 * Domain-specific configuration for the Social Learner.
 * Template logic lives in create-learner.js.
 *
 * Closes the social feedback loop: social:action outcomes → learning → predictions.
 *
 * @module @cynic/node/cycle/configs/social-learner.config
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

export const SocialLearningCategory = {
  ENGAGEMENT_TREND: 'engagement_trend',
  SENTIMENT_CALIBRATION: 'sentiment_calibration',
  REACH_PREDICTION: 'reach_prediction',
  ACTION_EFFECTIVENESS: 'action_effectiveness',
  TIMING_OPTIMIZATION: 'timing_optimization',
};

export const socialLearnerConfig = {
  name: 'SocialLearner',
  cell: 'C4.5',
  dimension: 'SOCIAL',
  eventPrefix: 'social',
  categories: SocialLearningCategory,
  minObservations: 5,
  learningRate: PHI_INV_2, // 38.2%
  maxHistory: 500,

  initModels() {
    return {
      engagement: { baseline: 0, volatility: 0, trend: 'stable', samples: 0 },
      sentiment: { baseline: 0, drift: 0, samples: 0 },
      reach: { avgReach: 0, maxReach: 0, samples: 0 },
      actions: { successRate: 0, total: 0, successful: 0, byType: {} },
      timing: { bestHour: null, hourCounts: {}, hourEngagement: {}, samples: 0 },
    };
  },

  learn(category, data, models, histories, { learningRate, maxHistory }) {
    switch (category) {
      case SocialLearningCategory.ENGAGEMENT_TREND:
        learnEngagementTrend(data, models, histories, learningRate);
        break;
      case SocialLearningCategory.SENTIMENT_CALIBRATION:
        learnSentimentCalibration(data, models, histories, learningRate);
        break;
      case SocialLearningCategory.REACH_PREDICTION:
        learnReachPrediction(data, models, histories, learningRate);
        break;
      case SocialLearningCategory.ACTION_EFFECTIVENESS:
        learnActionEffectiveness(data, models, histories);
        break;
      case SocialLearningCategory.TIMING_OPTIMIZATION:
        learnTimingOptimization(data, models, histories);
        break;
    }
  },

  predictions: {
    predictEngagement(models, stats) {
      const m = models.engagement;
      if (m.samples < 5) {
        return { prediction: null, confidence: 0, reason: 'Insufficient engagement data' };
      }

      const trendAdjust = m.trend === 'rising' ? m.volatility * 0.3
        : m.trend === 'falling' ? -m.volatility * 0.3
        : 0;

      const prediction = Math.max(0, m.baseline + trendAdjust);
      const confidence = Math.min(PHI_INV, m.samples / (m.samples + 10));

      stats.predictionsAttempted++;

      return {
        prediction: Math.round(prediction * 10) / 10,
        confidence,
        trend: m.trend,
        volatility: m.volatility,
        samples: m.samples,
      };
    },

    predictBestActionTime(models, stats) {
      const m = models.timing;
      if (m.samples < 5 || !m.bestHour) {
        return { hour: null, confidence: PHI_INV_3, reason: 'Insufficient timing data' };
      }

      const confidence = Math.min(PHI_INV, m.samples / (m.samples + 15));

      stats.predictionsAttempted++;

      return {
        hour: m.bestHour,
        confidence,
        samples: m.samples,
      };
    },
  },

  healthCheck(stats, models) {
    const total = stats.totalOutcomes;
    const actionRate = models.actions.total > 0
      ? models.actions.successRate
      : 0;

    return {
      status: total >= 5 ? 'learning' : 'warming_up',
      score: Math.min(PHI_INV, actionRate || 0.3),
      totalOutcomes: total,
      actionSuccessRate: actionRate,
      engagementTrend: models.engagement.trend,
      engagementBaseline: models.engagement.baseline,
      sentimentDrift: models.sentiment.drift,
    };
  },
};

// =============================================================================
// Learning functions
// =============================================================================

function learnEngagementTrend(data, models, histories, learningRate) {
  const cat = SocialLearningCategory.ENGAGEMENT_TREND;
  const engagement = data.totalEngagement ?? data.engagement ?? 0;

  histories[cat].push({ engagement, timestamp: Date.now() });

  const m = models.engagement;
  m.samples++;

  // Update baseline
  m.baseline = m.baseline * (1 - learningRate) + engagement * learningRate;

  // Update volatility
  const hist = histories[cat];
  if (hist.length >= 3) {
    const recent = hist.slice(-10).map(h => h.engagement);
    const mean = recent.reduce((s, v) => s + v, 0) / recent.length;
    const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
    m.volatility = m.volatility * (1 - learningRate) + Math.sqrt(variance) * learningRate;
  }

  // Update trend
  if (hist.length >= 5) {
    const recent5 = hist.slice(-5).map(h => h.engagement);
    const older5 = hist.slice(-10, -5).map(h => h.engagement);
    if (older5.length >= 3) {
      const recentAvg = recent5.reduce((s, v) => s + v, 0) / recent5.length;
      const olderAvg = older5.reduce((s, v) => s + v, 0) / older5.length;
      const delta = recentAvg - olderAvg;
      m.trend = delta > 2 ? 'rising' : delta < -2 ? 'falling' : 'stable';
    }
  }
}

function learnSentimentCalibration(data, models, histories, learningRate) {
  const cat = SocialLearningCategory.SENTIMENT_CALIBRATION;
  const sentiment = data.avgSentiment ?? data.sentiment ?? 0;

  histories[cat].push({ sentiment, timestamp: Date.now() });

  const m = models.sentiment;
  m.samples++;

  const prevBaseline = m.baseline;
  m.baseline = m.baseline * (1 - learningRate) + sentiment * learningRate;
  m.drift = m.baseline - prevBaseline;
}

function learnReachPrediction(data, models, histories, learningRate) {
  const cat = SocialLearningCategory.REACH_PREDICTION;
  const reach = data.totalReach ?? data.reach ?? 0;

  histories[cat].push({ reach, timestamp: Date.now() });

  const m = models.reach;
  m.samples++;

  m.avgReach = m.avgReach * (1 - learningRate) + reach * learningRate;
  if (reach > m.maxReach) m.maxReach = reach;
}

function learnActionEffectiveness(data, models, histories) {
  const cat = SocialLearningCategory.ACTION_EFFECTIVENESS;
  const actionType = data.actionType || data.type || 'unknown';
  const wasEffective = data.wasEffective ?? data.success ?? false;

  histories[cat].push({ actionType, wasEffective, timestamp: Date.now() });

  const m = models.actions;
  m.total++;
  if (wasEffective) m.successful++;
  m.successRate = m.total > 0 ? m.successful / m.total : 0;

  // Per-type tracking
  if (!m.byType[actionType]) m.byType[actionType] = { total: 0, successful: 0 };
  m.byType[actionType].total++;
  if (wasEffective) m.byType[actionType].successful++;
}

function learnTimingOptimization(data, models, histories) {
  const cat = SocialLearningCategory.TIMING_OPTIMIZATION;
  const hour = data.hour ?? new Date(data.timestamp || Date.now()).getHours();
  const engagement = data.engagement ?? 0;

  histories[cat].push({ hour, engagement, timestamp: Date.now() });

  const m = models.timing;
  m.samples++;

  // Track engagement by hour
  m.hourCounts[hour] = (m.hourCounts[hour] || 0) + 1;
  m.hourEngagement[hour] = (m.hourEngagement[hour] || 0) + engagement;

  // Find best hour (highest avg engagement)
  let bestHour = null;
  let bestAvg = -1;
  for (const [h, count] of Object.entries(m.hourCounts)) {
    const avg = (m.hourEngagement[h] || 0) / count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = parseInt(h, 10);
    }
  }
  m.bestHour = bestHour;
}
