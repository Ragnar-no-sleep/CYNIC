/**
 * CosmosLearner Config — C7.5 (COSMOS × LEARN)
 *
 * Domain-specific configuration for the Cosmos Learner.
 * Template logic lives in create-learner.js.
 *
 * @module @cynic/node/cycle/configs/cosmos-learner.config
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

export const CosmosLearningCategory = {
  HEALTH_PREDICTION: 'health_prediction',
  CONCENTRATION_RISK: 'concentration_risk',
  CROSS_REPO_CONVERGENCE: 'cross_repo_convergence',
  PATTERN_LIFECYCLE: 'pattern_lifecycle',
  DECISION_CALIBRATION: 'decision_calibration',
};

export const cosmosLearnerConfig = {
  name: 'CosmosLearner',
  cell: 'C7.5',
  dimension: 'COSMOS',
  eventPrefix: 'cosmos',
  categories: CosmosLearningCategory,
  minObservations: 5,
  learningRate: PHI_INV_2, // 38.2%
  maxHistory: 500,

  initModels() {
    return {
      health: { baseline: 50, volatility: 10, trend: 'stable', samples: 0 },
      concentration: { riskThreshold: PHI_INV, avgSpreadTime: 0, samples: 0 },
      convergence: { commonPairs: {}, leadDomain: null, samples: 0 },
      patterns: { avgLifecycle: 0, resolutionRate: 0, samples: 0 },
      decisions: { accuracy: 0, totalPredictions: 0, correctPredictions: 0 },
    };
  },

  learn(category, data, models, histories, { learningRate, maxHistory }) {
    switch (category) {
      case CosmosLearningCategory.HEALTH_PREDICTION:
        learnHealth(data, models, histories, learningRate, maxHistory);
        break;
      case CosmosLearningCategory.CONCENTRATION_RISK:
        learnConcentration(data, models, histories, learningRate, maxHistory);
        break;
      case CosmosLearningCategory.CROSS_REPO_CONVERGENCE:
        learnConvergence(data, models, histories, maxHistory);
        break;
      case CosmosLearningCategory.PATTERN_LIFECYCLE:
        learnPatternLifecycle(data, models, histories, learningRate, maxHistory);
        break;
      case CosmosLearningCategory.DECISION_CALIBRATION:
        learnDecisionCalibration(data, models, histories, maxHistory);
        break;
    }
  },

  predictions: {
    predictHealth(models, stats) {
      const m = models.health;
      if (m.samples < 5) {
        return { prediction: null, confidence: 0, reason: 'Insufficient data' };
      }

      const trendAdjust = m.trend === 'rising' ? m.volatility * 0.5
        : m.trend === 'falling' ? -m.volatility * 0.5
        : 0;

      const prediction = Math.max(0, Math.min(100, m.baseline + trendAdjust));
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

    predictConcentrationRisk(models, stats, level) {
      const m = models.concentration;
      if (m.samples < 5) {
        return { isRisky: level > PHI_INV, confidence: PHI_INV_3, reason: 'Using φ⁻¹ default threshold' };
      }

      const isRisky = level > m.riskThreshold;
      const confidence = Math.min(PHI_INV, m.samples / (m.samples + 8));

      stats.predictionsAttempted++;

      return {
        isRisky,
        confidence,
        threshold: m.riskThreshold,
        level,
        samples: m.samples,
      };
    },
  },

  healthCheck(stats, models) {
    const accuracy = models.decisions.accuracy;
    const total = stats.totalOutcomes;

    return {
      status: total >= 5 ? 'learning' : 'warming_up',
      score: Math.min(PHI_INV, accuracy || 0.3),
      totalOutcomes: total,
      predictionAccuracy: accuracy,
      healthTrend: models.health.trend,
      healthBaseline: models.health.baseline,
    };
  },
};

// =============================================================================
// Learning functions (extracted from original CosmosLearner)
// =============================================================================

function learnHealth(data, models, histories, learningRate, maxHistory) {
  const cat = CosmosLearningCategory.HEALTH_PREDICTION;
  const score = data.score || data.health || 50;
  const hist = histories[cat];

  hist.push({ score, verdict: data.verdict, timestamp: Date.now() });

  const m = models.health;
  m.samples++;

  // Update baseline with learning rate
  m.baseline = m.baseline * (1 - learningRate) + score * learningRate;

  // Update volatility
  if (hist.length >= 3) {
    const recent = hist.slice(-10);
    const scores = recent.map(h => h.score);
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
    m.volatility = m.volatility * (1 - learningRate) + Math.sqrt(variance) * learningRate;
  }

  // Update trend
  if (hist.length >= 5) {
    const recent5 = hist.slice(-5).map(h => h.score);
    const older5 = hist.slice(-10, -5).map(h => h.score);
    if (older5.length >= 3) {
      const recentAvg = recent5.reduce((s, v) => s + v, 0) / recent5.length;
      const olderAvg = older5.reduce((s, v) => s + v, 0) / older5.length;
      const delta = recentAvg - olderAvg;
      m.trend = delta > 3 ? 'rising' : delta < -3 ? 'falling' : 'stable';
    }
  }
}

function learnConcentration(data, models, histories, learningRate, maxHistory) {
  const cat = CosmosLearningCategory.CONCENTRATION_RISK;
  const level = data.concentration || data.level || 0;
  const wasRisky = data.wasRisky || data.hadIssue || false;

  histories[cat].push({ level, wasRisky, timestamp: Date.now() });

  const m = models.concentration;
  m.samples++;

  // Learn risk threshold
  if (wasRisky && level < m.riskThreshold) {
    m.riskThreshold = m.riskThreshold * (1 - learningRate) + level * learningRate;
  } else if (!wasRisky && level > m.riskThreshold) {
    m.riskThreshold = m.riskThreshold * (1 - learningRate) + level * learningRate;
  }
}

function learnConvergence(data, models, histories, maxHistory) {
  const cat = CosmosLearningCategory.CROSS_REPO_CONVERGENCE;
  const domains = data.domains || data.repos || [];
  const strength = data.strength || data.convergence || 0;

  histories[cat].push({ domains, strength, timestamp: Date.now() });

  const m = models.convergence;
  m.samples++;

  // Track common domain pairs
  if (domains.length >= 2) {
    const pairKey = domains.slice(0, 2).sort().join(':');
    m.commonPairs[pairKey] = (m.commonPairs[pairKey] || 0) + 1;
  }

  // Identify lead domain
  if (domains.length > 0) {
    const domainCounts = {};
    const recent = histories[cat].slice(-50);
    for (const h of recent) {
      const d = h.domains[0];
      if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
    const sorted = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
    m.leadDomain = sorted[0]?.[0] || null;
  }
}

function learnPatternLifecycle(data, models, histories, learningRate, maxHistory) {
  const cat = CosmosLearningCategory.PATTERN_LIFECYCLE;
  const duration = data.duration || 0;
  const resolved = data.resolved !== false;

  histories[cat].push({ type: data.type, duration, resolved, timestamp: Date.now() });

  const m = models.patterns;
  m.samples++;

  if (duration > 0) {
    m.avgLifecycle = m.avgLifecycle * (1 - learningRate) + duration * learningRate;
  }

  const recent = histories[cat].slice(-20);
  const resolvedCount = recent.filter(p => p.resolved).length;
  m.resolutionRate = recent.length > 0 ? resolvedCount / recent.length : 0;
}

function learnDecisionCalibration(data, models, histories, maxHistory) {
  const cat = CosmosLearningCategory.DECISION_CALIBRATION;
  const decision = data.decision || 'unknown';
  const wasGood = data.wasGood || data.outcome === 'positive';

  histories[cat].push({ decision, wasGood, timestamp: Date.now() });

  const m = models.decisions;
  m.totalPredictions++;
  if (wasGood) m.correctPredictions++;
  m.accuracy = m.totalPredictions > 0
    ? m.correctPredictions / m.totalPredictions
    : 0;
}
