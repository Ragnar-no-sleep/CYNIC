/**
 * Cosmos Judge - C7.2 (COSMOS × JUDGE)
 *
 * Evaluates ecosystem-level health and patterns using φ-bounded scoring.
 * Judges cross-repo convergence, activity distribution, health trajectories.
 *
 * "Le chien juge les étoiles" - κυνικός
 *
 * @module @cynic/node/cosmos/cosmos-judge
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3, createLogger, globalEventBus } from '@cynic/core';

const log = createLogger('CosmosJudge');

export const CosmosJudgmentType = {
  ECOSYSTEM_HEALTH: 'ecosystem_health',
  REPO_DISTRIBUTION: 'repo_distribution',
  CROSS_REPO_PATTERN: 'cross_repo_pattern',
  ACTIVITY_CONCENTRATION: 'activity_concentration',
  EMERGENCE_SIGNAL: 'emergence_signal',
};

const VERDICT_THRESHOLDS = {
  HOWL: 80,
  WAG: 50,
  GROWL: PHI_INV_2 * 100, // 38.2
};

export class CosmosJudge extends EventEmitter {
  constructor(options = {}) {
    super();

    this._history = [];
    this._maxHistory = 89; // Fib(11)

    this._stats = {
      totalJudgments: 0,
      byType: {},
      verdicts: { HOWL: 0, WAG: 0, GROWL: 0, BARK: 0 },
      avgScore: 0,
      lastJudgment: null,
    };

    for (const type of Object.values(CosmosJudgmentType)) {
      this._stats.byType[type] = 0;
    }
  }

  /**
   * Judge an ecosystem pattern or health snapshot
   *
   * @param {Object} subject - What to judge
   * @param {string} subject.type - CosmosJudgmentType
   * @param {Object} subject.data - Domain data
   * @returns {Object} Judgment result
   */
  judge(subject) {
    const type = subject.type || CosmosJudgmentType.ECOSYSTEM_HEALTH;
    const data = subject.data || subject;

    const scores = this._score(type, data);
    const judgment = this._createJudgment(type, data, scores);

    this._updateStats(type, judgment.score, judgment.verdict);
    this._history.push(judgment);
    while (this._history.length > this._maxHistory) this._history.shift();

    this.emit('judgment', judgment);
    globalEventBus.publish('cosmos:judgment', {
      type,
      judgment,
    }, { source: 'CosmosJudge' });

    log.debug('Cosmos judgment', { type, score: judgment.score, verdict: judgment.verdict });

    return judgment;
  }

  /**
   * Score based on judgment type
   * @private
   */
  _score(type, data) {
    switch (type) {
      case CosmosJudgmentType.ECOSYSTEM_HEALTH:
        return this._scoreHealth(data);
      case CosmosJudgmentType.REPO_DISTRIBUTION:
        return this._scoreDistribution(data);
      case CosmosJudgmentType.CROSS_REPO_PATTERN:
        return this._scoreCrossRepo(data);
      case CosmosJudgmentType.ACTIVITY_CONCENTRATION:
        return this._scoreConcentration(data);
      case CosmosJudgmentType.EMERGENCE_SIGNAL:
        return this._scoreEmergence(data);
      default:
        return { coherence: 50, utility: 50, sustainability: 50 };
    }
  }

  _scoreHealth(data) {
    const health = data.avgHealth || data.health || 0.5;
    const repoCount = data.repoCount || data.repos || 1;
    const issues = data.totalIssues || data.issues || 0;
    const stalePRs = data.stalePRs || 0;

    // Health score: base health × repo diversity bonus
    const healthScore = health * 100;
    const diversityBonus = Math.min(repoCount * 5, 20); // up to +20 for many repos
    const issuePenalty = Math.min(issues * 2, 30); // up to -30 for many issues
    const stalePenalty = Math.min(stalePRs * 3, 20); // up to -20 for stale PRs

    return {
      coherence: Math.max(0, Math.min(100, healthScore + diversityBonus)),
      utility: Math.max(0, Math.min(100, healthScore - issuePenalty)),
      sustainability: Math.max(0, Math.min(100, healthScore - stalePenalty)),
    };
  }

  _scoreDistribution(data) {
    const distribution = data.distribution || {};
    const values = Object.values(distribution);
    if (values.length === 0) return { coherence: 50, utility: 50, sustainability: 50 };

    const total = values.reduce((s, v) => s + v, 0);
    const max = Math.max(...values);
    const concentration = total > 0 ? max / total : 1;

    // Low concentration = good distribution = high score
    const distributionScore = (1 - concentration) * 100;

    return {
      coherence: distributionScore,
      utility: Math.min(100, values.length * 15), // more repos = more utility
      sustainability: distributionScore * 0.8 + 20, // distribution helps sustainability
    };
  }

  _scoreCrossRepo(data) {
    const repos = data.repos || [];
    const significance = data.significance || 'medium';
    const convergence = data.convergence || 0.5;

    const sigMultiplier = significance === 'critical' ? 1.0
      : significance === 'high' ? 0.8
      : significance === 'medium' ? 0.6
      : 0.4;

    return {
      coherence: convergence * 100 * sigMultiplier,
      utility: repos.length > 1 ? 70 : 40,
      sustainability: convergence * 80,
    };
  }

  _scoreConcentration(data) {
    const concentration = data.concentration || 0;
    // HIGH concentration = BAD (low score)
    const score = (1 - concentration) * 100;

    return {
      coherence: score,
      utility: score * 0.8 + 10,
      sustainability: score * 0.9,
    };
  }

  _scoreEmergence(data) {
    const significance = data.significance || 0.5;
    const confidence = data.confidence || 0.5;

    return {
      coherence: significance * 100,
      utility: confidence * 100,
      sustainability: (significance + confidence) / 2 * 80 + 10,
    };
  }

  /**
   * Create judgment from scores
   * @private
   */
  _createJudgment(type, data, scores) {
    const values = Object.values(scores);
    // Geometric mean for balanced scoring
    const product = values.reduce((p, v) => p * Math.max(0.01, v), 1);
    const geoMean = Math.pow(product, 1 / values.length);
    const score = Math.round(geoMean * 10) / 10;

    // Confidence capped at φ⁻¹
    const confidence = Math.min(PHI_INV, score / 100);

    // Verdict
    let verdict;
    if (score >= VERDICT_THRESHOLDS.HOWL) verdict = 'HOWL';
    else if (score >= VERDICT_THRESHOLDS.WAG) verdict = 'WAG';
    else if (score >= VERDICT_THRESHOLDS.GROWL) verdict = 'GROWL';
    else verdict = 'BARK';

    return {
      type,
      score,
      confidence,
      verdict,
      scores,
      cell: 'C7.2',
      dimension: 'COSMOS',
      analysis: 'JUDGE',
      timestamp: Date.now(),
    };
  }

  _updateStats(type, score, verdict) {
    this._stats.totalJudgments++;
    this._stats.byType[type] = (this._stats.byType[type] || 0) + 1;
    this._stats.verdicts[verdict] = (this._stats.verdicts[verdict] || 0) + 1;

    // Running average
    const n = this._stats.totalJudgments;
    this._stats.avgScore = ((n - 1) * this._stats.avgScore + score) / n;
    this._stats.lastJudgment = Date.now();
  }

  getStats() { return { ...this._stats }; }

  getHistory(limit = 21) {
    return this._history.slice(-limit);
  }

  getHealth() {
    const total = this._stats.totalJudgments;
    const barkRate = total > 0 ? this._stats.verdicts.BARK / total : 0;

    return {
      status: barkRate < PHI_INV_2 ? 'healthy' : 'ecosystem_concern',
      score: Math.min(PHI_INV, this._stats.avgScore / 100),
      totalJudgments: total,
      barkRate,
      avgScore: this._stats.avgScore,
    };
  }

  clear() {
    this._history = [];
    this._stats.totalJudgments = 0;
    this._stats.avgScore = 0;
    this._stats.lastJudgment = null;
    for (const k of Object.keys(this._stats.byType)) this._stats.byType[k] = 0;
    for (const k of Object.keys(this._stats.verdicts)) this._stats.verdicts[k] = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

export function getCosmosJudge(options = {}) {
  if (!_instance) _instance = new CosmosJudge(options);
  return _instance;
}

export function resetCosmosJudge() {
  if (_instance) _instance.removeAllListeners();
  _instance = null;
}

export default { CosmosJudge, CosmosJudgmentType, getCosmosJudge, resetCosmosJudge };
