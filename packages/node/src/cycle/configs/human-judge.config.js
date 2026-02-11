/**
 * HumanJudge Config — C5.2 (HUMAN × JUDGE)
 *
 * Domain-specific configuration for the Human Judge.
 * Template logic lives in create-judge.js.
 *
 * Judges human state: wellbeing, productivity, engagement, burnout risk.
 * Uses φ-aligned thresholds and custom verdicts (THRIVING/STEADY/STRAINED/CRITICAL).
 *
 * "Le chien juge l'état du maître, pas ses intentions" - κυνικός
 *
 * @module @cynic/node/cycle/configs/human-judge.config
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

export const HumanVerdict = {
  THRIVING: 'thriving',
  STEADY: 'steady',
  STRAINED: 'strained',
  CRITICAL: 'critical',
};

export const JudgmentDomain = {
  WELLBEING: 'wellbeing',
  PRODUCTIVITY: 'productivity',
  ENGAGEMENT: 'engagement',
  BURNOUT_RISK: 'burnout_risk',
};

export const humanJudgeConfig = {
  name: 'HumanJudge',
  cell: 'C5.2',
  dimension: 'HUMAN',
  eventPrefix: 'human',
  judgmentTypes: JudgmentDomain,
  maxHistory: 89, // Fib(11)

  // Custom verdicts (not HOWL/WAG/GROWL/BARK)
  verdictInit: HumanVerdict,

  // Verdict thresholds on 0-100 scale (φ constants × 100)
  verdictLevels: {
    HOWL: PHI_INV * 100,     // 61.8 → THRIVING
    WAG: PHI_INV_2 * 100,    // 38.2 → STEADY
    GROWL: PHI_INV_3 * 100,  // 23.6 → STRAINED
  },

  // Custom verdict mapping using Human-specific names
  getVerdict(score) {
    if (score >= PHI_INV * 100) return HumanVerdict.THRIVING;
    if (score >= PHI_INV_2 * 100) return HumanVerdict.STEADY;
    if (score >= PHI_INV_3 * 100) return HumanVerdict.STRAINED;
    return HumanVerdict.CRITICAL;
  },

  score(type, data) {
    // Data = perception from HumanPerceiver
    const p = data;
    return {
      wellbeing: scoreWellbeing(p) * 100,
      productivity: scoreProductivity(p) * 100,
      engagement: scoreEngagement(p) * 100,
      burnoutInverse: (1 - scoreBurnoutRisk(p)) * 100,
    };
  },

  // Custom φ-weighted composite aggregate
  aggregate(scores) {
    const weights = {
      wellbeing: PHI_INV,
      productivity: PHI_INV_2,
      engagement: PHI_INV_3,
      burnoutInverse: PHI_INV_3,
    };

    const totalWeight = PHI_INV + PHI_INV_2 + PHI_INV_3 + PHI_INV_3;
    let weightedSum = 0;
    for (const [key, weight] of Object.entries(weights)) {
      weightedSum += (scores[key] || 0) * weight;
    }

    return weightedSum / totalWeight;
  },

  enrichResult(result, type, data, scores) {
    // Add qScore (0-1 scale, matching original API)
    result.qScore = result.score / 100;

    // Add burnoutRisk (original field name)
    result.scores.burnoutRisk = 1 - (scores.burnoutInverse / 100);

    // Generate recommendations
    const s = {
      wellbeing: scores.wellbeing / 100,
      productivity: scores.productivity / 100,
      engagement: scores.engagement / 100,
      burnoutRisk: 1 - (scores.burnoutInverse / 100),
    };
    result.recommendations = generateRecommendations(s, result.verdict);

    // Timing
    result.judgmentTimeMs = 0; // Factory is sync, negligible
  },

  healthCheck(stats) {
    return {
      status: stats.avgScore >= PHI_INV_2 * 100 ? 'healthy' : 'concerning',
      score: Math.min(PHI_INV, stats.avgScore / 100),
      judgmentsTotal: stats.totalJudgments,
      avgScore: stats.avgScore / 100,
    };
  },
};

// =============================================================================
// Scoring functions (extracted from original HumanJudge, 0-1 range)
// =============================================================================

function scoreWellbeing(p) {
  const energyScore = p.energy || PHI_INV_2;
  const frustrationPenalty = (p.frustration || 0) * 0.5;
  return Math.min(PHI_INV, Math.max(0, energyScore - frustrationPenalty));
}

function scoreProductivity(p) {
  const focusScore = p.focus || PHI_INV_2;
  const loadPenalty = p.cognitiveLoad > 7 ? 0.2 : p.cognitiveLoad > 5 ? 0.1 : 0;
  return Math.min(PHI_INV, Math.max(0, focusScore - loadPenalty));
}

function scoreEngagement(p) {
  const sessionMinutes = p.sessionMinutes || 0;
  if (sessionMinutes < 2) return PHI_INV;
  if (sessionMinutes > 180) return PHI_INV_3;

  const decay = Math.max(PHI_INV_3, PHI_INV * Math.exp(-sessionMinutes / 120));
  return Math.min(PHI_INV, decay);
}

function scoreBurnoutRisk(p) {
  let risk = 0;
  const sessionMinutes = p.sessionMinutes || 0;

  if (sessionMinutes > 240) risk += 0.3;
  else if (sessionMinutes > 120) risk += 0.15;

  if ((p.energy || PHI_INV) < PHI_INV_3) risk += 0.3;
  else if ((p.energy || PHI_INV) < PHI_INV_2) risk += 0.15;

  if ((p.frustration || 0) > PHI_INV_2) risk += 0.2;
  if ((p.cognitiveLoad || 0) > 7) risk += 0.15;

  return Math.min(1, risk);
}

function generateRecommendations(scores, verdict) {
  const recs = [];

  if (verdict === HumanVerdict.CRITICAL) {
    recs.push({ action: 'break', urgency: 'high', reason: 'Critical state detected' });
  }

  if (scores.burnoutRisk > PHI_INV_2) {
    recs.push({ action: 'pace_down', urgency: 'medium', reason: `Burnout risk: ${(scores.burnoutRisk * 100).toFixed(0)}%` });
  }

  if (scores.wellbeing < PHI_INV_3) {
    recs.push({ action: 'hydrate_stretch', urgency: 'medium', reason: 'Low wellbeing' });
  }

  if (scores.engagement < PHI_INV_3) {
    recs.push({ action: 'refocus', urgency: 'low', reason: 'Engagement dropping' });
  }

  return recs;
}
