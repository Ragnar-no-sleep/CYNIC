/**
 * SocialJudge Config — C4.2 (SOCIAL × JUDGE)
 *
 * Domain-specific configuration for the Social Judge.
 * Template logic lives in create-judge.js.
 *
 * Extracted from inline code in event-listeners.js (lines 3683-3734).
 * Judges social interactions: engagement, sentiment, reach, community health.
 *
 * @module @cynic/node/cycle/configs/social-judge.config
 */

'use strict';

import { PHI_INV } from '@cynic/core';

export const SocialJudgmentType = {
  ENGAGEMENT: 'engagement',
  SENTIMENT: 'sentiment',
  REACH: 'reach',
  COMMUNITY_HEALTH: 'community_health',
};

export const socialJudgeConfig = {
  name: 'SocialJudge',
  cell: 'C4.2',
  dimension: 'SOCIAL',
  eventPrefix: 'social',
  judgmentTypes: SocialJudgmentType,
  maxHistory: 89, // Fib(11)

  verdictLevels: {
    HOWL: 50,
    WAG: 35,
    GROWL: 20,
  },

  score(type, data) {
    // Unified scoring across all social judgment types
    // Data comes from SOCIAL_CAPTURE events: { tweets, users }
    const tweets = data.tweets || [];
    const users = data.users || [];

    const totalEngagement = tweets.reduce((sum, t) =>
      sum + (t.likes || 0) + (t.retweets || 0) + (t.replies || 0), 0);
    const avgSentiment = tweets.length > 0
      ? tweets.reduce((sum, t) => sum + (t.sentiment || 0), 0) / tweets.length
      : 0;
    const totalReach = tweets.reduce((sum, t) => sum + (t.impressions || t.likes || 0), 0)
      + users.reduce((sum, u) => sum + (u.followers || 0), 0);

    // φ-bounded component scores (0-100 each, capped at φ⁻¹ * 100 in aggregate)
    const engagementScore = Math.min(totalEngagement / 100, 1) * 100;
    const sentimentScore = ((avgSentiment + 1) / 2) * 100; // normalize -1..1 → 0..100
    const reachScore = Math.min(totalReach / 10000, 1) * 100;

    return { engagement: engagementScore, sentiment: sentimentScore, reach: reachScore };
  },

  // Custom aggregate: weighted sum capped at φ⁻¹ * 100
  aggregate(scores) {
    const weighted = (scores.engagement || 0) * 0.4
      + (scores.sentiment || 0) * 0.3
      + (scores.reach || 0) * 0.3;
    return Math.min(weighted, PHI_INV * 100); // φ⁻¹ cap
  },

  enrichResult(result, type, data) {
    const tweets = data.tweets || [];
    const users = data.users || [];

    result.tweetCount = tweets.length;
    result.userCount = users.length;
    result.totalEngagement = tweets.reduce((sum, t) =>
      sum + (t.likes || 0) + (t.retweets || 0) + (t.replies || 0), 0);
    result.avgSentiment = tweets.length > 0
      ? tweets.reduce((sum, t) => sum + (t.sentiment || 0), 0) / tweets.length
      : 0;
    result.totalReach = tweets.reduce((sum, t) => sum + (t.impressions || t.likes || 0), 0)
      + users.reduce((sum, u) => sum + (u.followers || 0), 0);
  },
};
