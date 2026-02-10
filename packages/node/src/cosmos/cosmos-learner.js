/**
 * Cosmos Learner - C7.5 (COSMOS × LEARN)
 *
 * Learns from ecosystem patterns, judgments, and outcomes.
 * Builds predictive models for health trajectories and convergence.
 *
 * "Le chien apprend des étoiles" - κυνικός
 *
 * @module @cynic/node/cosmos/cosmos-learner
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3, createLogger, globalEventBus } from '@cynic/core';

const log = createLogger('CosmosLearner');

export const CosmosLearningCategory = {
  HEALTH_PREDICTION: 'health_prediction',
  CONCENTRATION_RISK: 'concentration_risk',
  CROSS_REPO_CONVERGENCE: 'cross_repo_convergence',
  PATTERN_LIFECYCLE: 'pattern_lifecycle',
  DECISION_CALIBRATION: 'decision_calibration',
};

const MIN_OBSERVATIONS = 5;
const LEARNING_RATE = PHI_INV_2; // 38.2% — gradual updates

export class CosmosLearner extends EventEmitter {
  constructor(options = {}) {
    super();

    // Rolling histories per category
    this._healthHistory = [];       // { score, verdict, timestamp }
    this._concentrationHistory = []; // { level, wasRisky, timestamp }
    this._convergenceHistory = [];   // { domains, strength, timestamp }
    this._patternHistory = [];       // { type, duration, resolved, timestamp }
    this._decisionHistory = [];      // { decision, outcome, timestamp }

    this._maxHistory = 500;

    // Learned models (simple statistical baselines)
    this._models = {
      health: { baseline: 50, volatility: 10, trend: 'stable', samples: 0 },
      concentration: { riskThreshold: PHI_INV, avgSpreadTime: 0, samples: 0 },
      convergence: { commonPairs: {}, leadDomain: null, samples: 0 },
      patterns: { avgLifecycle: 0, resolutionRate: 0, samples: 0 },
      decisions: { accuracy: 0, totalPredictions: 0, correctPredictions: 0 },
    };

    this._stats = {
      totalOutcomes: 0,
      byCategory: {},
      predictionsAttempted: 0,
      predictionsCorrect: 0,
      lastLearning: null,
    };

    for (const cat of Object.values(CosmosLearningCategory)) {
      this._stats.byCategory[cat] = 0;
    }
  }

  /**
   * Record an outcome to learn from
   *
   * @param {Object} outcome - Learning data
   * @param {string} outcome.category - CosmosLearningCategory
   * @param {Object} outcome.data - Category-specific data
   * @returns {Object} Learning result
   */
  recordOutcome(outcome) {
    const category = outcome.category || CosmosLearningCategory.HEALTH_PREDICTION;
    const data = outcome.data || outcome;

    switch (category) {
      case CosmosLearningCategory.HEALTH_PREDICTION:
        this._learnHealth(data);
        break;
      case CosmosLearningCategory.CONCENTRATION_RISK:
        this._learnConcentration(data);
        break;
      case CosmosLearningCategory.CROSS_REPO_CONVERGENCE:
        this._learnConvergence(data);
        break;
      case CosmosLearningCategory.PATTERN_LIFECYCLE:
        this._learnPatternLifecycle(data);
        break;
      case CosmosLearningCategory.DECISION_CALIBRATION:
        this._learnDecisionCalibration(data);
        break;
    }

    this._stats.totalOutcomes++;
    this._stats.byCategory[category] = (this._stats.byCategory[category] || 0) + 1;
    this._stats.lastLearning = Date.now();

    const result = {
      category,
      modelsUpdated: true,
      totalSamples: this._getTotalSamples(),
      timestamp: Date.now(),
    };

    this.emit('learned', result);

    return result;
  }

  /**
   * Predict ecosystem health for next period
   */
  predictHealth() {
    const m = this._models.health;
    if (m.samples < MIN_OBSERVATIONS) {
      return { prediction: null, confidence: 0, reason: 'Insufficient data' };
    }

    // Simple trend-based prediction
    const trendAdjust = m.trend === 'rising' ? m.volatility * 0.5
      : m.trend === 'falling' ? -m.volatility * 0.5
      : 0;

    const prediction = Math.max(0, Math.min(100, m.baseline + trendAdjust));
    const confidence = Math.min(PHI_INV, m.samples / (m.samples + 10));

    this._stats.predictionsAttempted++;

    return {
      prediction: Math.round(prediction * 10) / 10,
      confidence,
      trend: m.trend,
      volatility: m.volatility,
      samples: m.samples,
    };
  }

  /**
   * Predict concentration risk for a domain
   */
  predictConcentrationRisk(level) {
    const m = this._models.concentration;
    if (m.samples < MIN_OBSERVATIONS) {
      return { isRisky: level > PHI_INV, confidence: PHI_INV_3, reason: 'Using φ⁻¹ default threshold' };
    }

    const isRisky = level > m.riskThreshold;
    const confidence = Math.min(PHI_INV, m.samples / (m.samples + 8));

    this._stats.predictionsAttempted++;

    return {
      isRisky,
      confidence,
      threshold: m.riskThreshold,
      level,
      samples: m.samples,
    };
  }

  /**
   * Record whether a prediction was correct
   */
  recordPredictionOutcome(wasCorrect) {
    this._models.decisions.totalPredictions++;
    if (wasCorrect) {
      this._models.decisions.correctPredictions++;
      this._stats.predictionsCorrect++;
    }
    this._models.decisions.accuracy = this._models.decisions.totalPredictions > 0
      ? this._models.decisions.correctPredictions / this._models.decisions.totalPredictions
      : 0;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INTERNAL LEARNING
  // ═══════════════════════════════════════════════════════════════════════

  _learnHealth(data) {
    const score = data.score || data.health || 50;

    this._healthHistory.push({ score, verdict: data.verdict, timestamp: Date.now() });
    while (this._healthHistory.length > this._maxHistory) this._healthHistory.shift();

    const m = this._models.health;
    m.samples++;

    // Update baseline with learning rate
    m.baseline = m.baseline * (1 - LEARNING_RATE) + score * LEARNING_RATE;

    // Update volatility
    if (this._healthHistory.length >= 3) {
      const recent = this._healthHistory.slice(-10);
      const scores = recent.map(h => h.score);
      const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
      const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
      m.volatility = m.volatility * (1 - LEARNING_RATE) + Math.sqrt(variance) * LEARNING_RATE;
    }

    // Update trend
    if (this._healthHistory.length >= 5) {
      const recent5 = this._healthHistory.slice(-5).map(h => h.score);
      const older5 = this._healthHistory.slice(-10, -5).map(h => h.score);
      if (older5.length >= 3) {
        const recentAvg = recent5.reduce((s, v) => s + v, 0) / recent5.length;
        const olderAvg = older5.reduce((s, v) => s + v, 0) / older5.length;
        const delta = recentAvg - olderAvg;
        m.trend = delta > 3 ? 'rising' : delta < -3 ? 'falling' : 'stable';
      }
    }
  }

  _learnConcentration(data) {
    const level = data.concentration || data.level || 0;
    const wasRisky = data.wasRisky || data.hadIssue || false;

    this._concentrationHistory.push({ level, wasRisky, timestamp: Date.now() });
    while (this._concentrationHistory.length > this._maxHistory) this._concentrationHistory.shift();

    const m = this._models.concentration;
    m.samples++;

    // Learn risk threshold: adjust toward observed risk boundary
    if (wasRisky && level < m.riskThreshold) {
      m.riskThreshold = m.riskThreshold * (1 - LEARNING_RATE) + level * LEARNING_RATE;
    } else if (!wasRisky && level > m.riskThreshold) {
      m.riskThreshold = m.riskThreshold * (1 - LEARNING_RATE) + level * LEARNING_RATE;
    }
  }

  _learnConvergence(data) {
    const domains = data.domains || data.repos || [];
    const strength = data.strength || data.convergence || 0;

    this._convergenceHistory.push({ domains, strength, timestamp: Date.now() });
    while (this._convergenceHistory.length > this._maxHistory) this._convergenceHistory.shift();

    const m = this._models.convergence;
    m.samples++;

    // Track common domain pairs
    if (domains.length >= 2) {
      const pairKey = domains.slice(0, 2).sort().join(':');
      m.commonPairs[pairKey] = (m.commonPairs[pairKey] || 0) + 1;
    }

    // Identify lead domain (most frequent first in convergences)
    if (domains.length > 0) {
      const domainCounts = {};
      for (const h of this._convergenceHistory.slice(-50)) {
        const d = h.domains[0];
        if (d) domainCounts[d] = (domainCounts[d] || 0) + 1;
      }
      const sorted = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
      m.leadDomain = sorted[0]?.[0] || null;
    }
  }

  _learnPatternLifecycle(data) {
    const duration = data.duration || 0; // ms
    const resolved = data.resolved !== false;

    this._patternHistory.push({ type: data.type, duration, resolved, timestamp: Date.now() });
    while (this._patternHistory.length > this._maxHistory) this._patternHistory.shift();

    const m = this._models.patterns;
    m.samples++;

    // Update average lifecycle
    if (duration > 0) {
      m.avgLifecycle = m.avgLifecycle * (1 - LEARNING_RATE) + duration * LEARNING_RATE;
    }

    // Update resolution rate
    const recent = this._patternHistory.slice(-20);
    const resolvedCount = recent.filter(p => p.resolved).length;
    m.resolutionRate = recent.length > 0 ? resolvedCount / recent.length : 0;
  }

  _learnDecisionCalibration(data) {
    const decision = data.decision || 'unknown';
    const wasGood = data.wasGood || data.outcome === 'positive';

    this._decisionHistory.push({ decision, wasGood, timestamp: Date.now() });
    while (this._decisionHistory.length > this._maxHistory) this._decisionHistory.shift();

    this.recordPredictionOutcome(wasGood);
  }

  _getTotalSamples() {
    return this._models.health.samples
      + this._models.concentration.samples
      + this._models.convergence.samples
      + this._models.patterns.samples;
  }

  getStats() { return { ...this._stats, models: { ...this._models } }; }

  getHealth() {
    const accuracy = this._models.decisions.accuracy;
    const total = this._stats.totalOutcomes;

    return {
      status: total >= MIN_OBSERVATIONS ? 'learning' : 'warming_up',
      score: Math.min(PHI_INV, accuracy || 0.3),
      totalOutcomes: total,
      predictionAccuracy: accuracy,
      healthTrend: this._models.health.trend,
      healthBaseline: this._models.health.baseline,
    };
  }

  clear() {
    this._healthHistory = [];
    this._concentrationHistory = [];
    this._convergenceHistory = [];
    this._patternHistory = [];
    this._decisionHistory = [];
    this._models = {
      health: { baseline: 50, volatility: 10, trend: 'stable', samples: 0 },
      concentration: { riskThreshold: PHI_INV, avgSpreadTime: 0, samples: 0 },
      convergence: { commonPairs: {}, leadDomain: null, samples: 0 },
      patterns: { avgLifecycle: 0, resolutionRate: 0, samples: 0 },
      decisions: { accuracy: 0, totalPredictions: 0, correctPredictions: 0 },
    };
    this._stats.totalOutcomes = 0;
    this._stats.predictionsAttempted = 0;
    this._stats.predictionsCorrect = 0;
    this._stats.lastLearning = null;
    for (const k of Object.keys(this._stats.byCategory)) this._stats.byCategory[k] = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

export function getCosmosLearner(options = {}) {
  if (!_instance) _instance = new CosmosLearner(options);
  return _instance;
}

export function resetCosmosLearner() {
  if (_instance) _instance.removeAllListeners();
  _instance = null;
}

export default { CosmosLearner, CosmosLearningCategory, getCosmosLearner, resetCosmosLearner };
