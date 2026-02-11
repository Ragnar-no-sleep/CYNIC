/**
 * CosmosJudge Config — C7.2 (COSMOS × JUDGE)
 *
 * Domain-specific configuration for the Cosmos Judge.
 * Template logic lives in create-judge.js.
 *
 * @module @cynic/node/cycle/configs/cosmos-judge.config
 */

'use strict';

import { PHI_INV_2 } from '@cynic/core';

export const CosmosJudgmentType = {
  ECOSYSTEM_HEALTH: 'ecosystem_health',
  REPO_DISTRIBUTION: 'repo_distribution',
  CROSS_REPO_PATTERN: 'cross_repo_pattern',
  ACTIVITY_CONCENTRATION: 'activity_concentration',
  EMERGENCE_SIGNAL: 'emergence_signal',
};

export const cosmosJudgeConfig = {
  name: 'CosmosJudge',
  cell: 'C7.2',
  dimension: 'COSMOS',
  eventPrefix: 'cosmos',
  judgmentTypes: CosmosJudgmentType,
  maxHistory: 89, // Fib(11)

  verdictLevels: {
    HOWL: 80,
    WAG: 50,
    GROWL: PHI_INV_2 * 100, // 38.2
  },

  score(type, data) {
    switch (type) {
      case CosmosJudgmentType.ECOSYSTEM_HEALTH:
        return scoreHealth(data);
      case CosmosJudgmentType.REPO_DISTRIBUTION:
        return scoreDistribution(data);
      case CosmosJudgmentType.CROSS_REPO_PATTERN:
        return scoreCrossRepo(data);
      case CosmosJudgmentType.ACTIVITY_CONCENTRATION:
        return scoreConcentration(data);
      case CosmosJudgmentType.EMERGENCE_SIGNAL:
        return scoreEmergence(data);
      default:
        return { coherence: 50, utility: 50, sustainability: 50 };
    }
  },

  // Geometric mean (default aggregate) — no override needed

  healthCheck(stats) {
    const total = stats.totalJudgments;
    const barkRate = total > 0 ? stats.verdicts.BARK / total : 0;

    return {
      status: barkRate < PHI_INV_2 ? 'healthy' : 'ecosystem_concern',
      score: Math.min(0.618, stats.avgScore / 100),
      totalJudgments: total,
      barkRate,
      avgScore: stats.avgScore,
    };
  },
};

// =============================================================================
// Scoring functions (extracted from original CosmosJudge)
// =============================================================================

function scoreHealth(data) {
  const health = data.avgHealth || data.health || 0.5;
  const repoCount = data.repoCount || data.repos || 1;
  const issues = data.totalIssues || data.issues || 0;
  const stalePRs = data.stalePRs || 0;

  const healthScore = health * 100;
  const diversityBonus = Math.min(repoCount * 5, 20);
  const issuePenalty = Math.min(issues * 2, 30);
  const stalePenalty = Math.min(stalePRs * 3, 20);

  return {
    coherence: Math.max(0, Math.min(100, healthScore + diversityBonus)),
    utility: Math.max(0, Math.min(100, healthScore - issuePenalty)),
    sustainability: Math.max(0, Math.min(100, healthScore - stalePenalty)),
  };
}

function scoreDistribution(data) {
  const distribution = data.distribution || {};
  const values = Object.values(distribution);
  if (values.length === 0) return { coherence: 50, utility: 50, sustainability: 50 };

  const total = values.reduce((s, v) => s + v, 0);
  const max = Math.max(...values);
  const concentration = total > 0 ? max / total : 1;
  const distributionScore = (1 - concentration) * 100;

  return {
    coherence: distributionScore,
    utility: Math.min(100, values.length * 15),
    sustainability: distributionScore * 0.8 + 20,
  };
}

function scoreCrossRepo(data) {
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

function scoreConcentration(data) {
  const concentration = data.concentration || 0;
  const score = (1 - concentration) * 100;

  return {
    coherence: score,
    utility: score * 0.8 + 10,
    sustainability: score * 0.9,
  };
}

function scoreEmergence(data) {
  const significance = data.significance || 0.5;
  const confidence = data.confidence || 0.5;

  return {
    coherence: significance * 100,
    utility: confidence * 100,
    sustainability: (significance + confidence) / 2 * 80 + 10,
  };
}
