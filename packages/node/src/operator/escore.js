/**
 * E-Score System
 *
 * 7-dimension φ-weighted engagement score
 *
 * E = Σ(weight_i × score_i) / Σ(weight_i)
 *
 * Dimensions:
 * - HOLD: Holding duration and amount
 * - BURN: Tokens burned (not staked!)
 * - USE: Platform usage frequency
 * - BUILD: Contributions to ecosystem
 * - RUN: Node operation
 * - REFER: Referrals brought
 * - TIME: Account age
 *
 * @module @cynic/node/operator/escore
 */

'use strict';

import { PHI, PHI_INV, PHI_INV_2 } from '@cynic/core';

/**
 * E-Score dimensions with φ-derived weights
 */
export const EScoreDimensions = {
  HOLD: { weight: PHI_INV, description: 'Holding duration and amount' },
  BURN: { weight: PHI, description: 'Tokens burned (contribution)' },
  USE: { weight: 1.0, description: 'Platform usage frequency' },
  BUILD: { weight: PHI, description: 'Ecosystem contributions' },
  RUN: { weight: PHI_INV, description: 'Node operation' },
  REFER: { weight: PHI_INV_2, description: 'Referrals brought' },
  TIME: { weight: PHI_INV_2, description: 'Account age' },
};

/**
 * Calculate total weight
 */
const TOTAL_WEIGHT = Object.values(EScoreDimensions).reduce(
  (sum, d) => sum + d.weight,
  0
);

/**
 * Create empty E-Score state
 * @returns {Object} Empty E-Score state
 */
export function createEScoreState() {
  return {
    scores: {
      HOLD: 0,
      BURN: 0,
      USE: 0,
      BUILD: 0,
      RUN: 0,
      REFER: 0,
      TIME: 0,
    },
    raw: {
      holdAmount: 0,
      holdDuration: 0,
      burnedTotal: 0,
      usageCount: 0,
      contributions: 0,
      nodeUptime: 0,
      referrals: 0,
      accountAge: 0,
    },
    composite: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate HOLD score
 * @param {number} amount - Amount held
 * @param {number} durationDays - Hold duration in days
 * @returns {number} HOLD score (0-100)
 */
export function calculateHoldScore(amount, durationDays) {
  // Logarithmic scaling for amount (diminishing returns)
  const amountScore = Math.min(Math.log10(amount + 1) * 20, 50);
  // Duration bonus (capped at 50)
  const durationScore = Math.min(durationDays / 365 * 50, 50);
  return Math.min(amountScore + durationScore, 100);
}

/**
 * Calculate BURN score
 * @param {number} burned - Total tokens burned
 * @returns {number} BURN score (0-100)
 */
export function calculateBurnScore(burned) {
  // Logarithmic with φ base - rewards burning without infinite scaling
  if (burned <= 0) return 0;
  return Math.min(Math.log(burned + 1) / Math.log(PHI) * 10, 100);
}

/**
 * Calculate USE score
 * @param {number} usageCount - Number of platform interactions
 * @param {number} periodDays - Period in days
 * @returns {number} USE score (0-100)
 */
export function calculateUseScore(usageCount, periodDays = 30) {
  const dailyAvg = usageCount / Math.max(periodDays, 1);
  // Target: ~10 interactions/day for full score
  return Math.min(dailyAvg * 10, 100);
}

/**
 * Calculate BUILD score
 * @param {number} contributions - Number of contributions (PRs, patterns, etc.)
 * @returns {number} BUILD score (0-100)
 */
export function calculateBuildScore(contributions) {
  // Each contribution worth ~5 points, capped at 100
  return Math.min(contributions * 5, 100);
}

/**
 * Calculate RUN score
 * @param {number} uptimeRatio - Uptime ratio (0-1)
 * @param {number} blocksProduced - Blocks produced
 * @returns {number} RUN score (0-100)
 */
export function calculateRunScore(uptimeRatio, blocksProduced = 0) {
  const uptimeScore = uptimeRatio * 70;
  const productionBonus = Math.min(blocksProduced / 100 * 30, 30);
  return Math.min(uptimeScore + productionBonus, 100);
}

/**
 * Calculate REFER score
 * @param {number} referrals - Number of referrals
 * @param {number} activeReferrals - Number of active referrals
 * @returns {number} REFER score (0-100)
 */
export function calculateReferScore(referrals, activeReferrals = 0) {
  // Active referrals worth more
  const baseScore = referrals * 5;
  const activeBonus = activeReferrals * 10;
  return Math.min(baseScore + activeBonus, 100);
}

/**
 * Calculate TIME score
 * @param {number} accountAgeDays - Account age in days
 * @returns {number} TIME score (0-100)
 */
export function calculateTimeScore(accountAgeDays) {
  // Logarithmic - early days worth more
  if (accountAgeDays <= 0) return 0;
  return Math.min(Math.log10(accountAgeDays + 1) * 40, 100);
}

/**
 * Calculate composite E-Score
 * @param {Object} scores - Individual dimension scores
 * @returns {number} Composite E-Score (0-100)
 */
export function calculateCompositeEScore(scores) {
  let weightedSum = 0;

  for (const [dim, config] of Object.entries(EScoreDimensions)) {
    const score = scores[dim] || 0;
    weightedSum += config.weight * score;
  }

  return Math.round(weightedSum / TOTAL_WEIGHT * 10) / 10;
}

/**
 * Update E-Score state with new raw data
 * @param {Object} state - Current E-Score state
 * @param {Object} rawData - Raw data updates
 * @returns {Object} Updated E-Score state
 */
export function updateEScoreState(state, rawData) {
  const newRaw = { ...state.raw, ...rawData };
  const now = Date.now();

  // Calculate account age from state creation or explicit value
  const accountAgeDays = rawData.accountAge ||
    Math.floor((now - (state.createdAt || now)) / (1000 * 60 * 60 * 24));

  const newScores = {
    HOLD: calculateHoldScore(newRaw.holdAmount, newRaw.holdDuration),
    BURN: calculateBurnScore(newRaw.burnedTotal),
    USE: calculateUseScore(newRaw.usageCount),
    BUILD: calculateBuildScore(newRaw.contributions),
    RUN: calculateRunScore(newRaw.nodeUptime),
    REFER: calculateReferScore(newRaw.referrals, newRaw.activeReferrals),
    TIME: calculateTimeScore(accountAgeDays),
  };

  return {
    scores: newScores,
    raw: newRaw,
    composite: calculateCompositeEScore(newScores),
    lastUpdated: now,
  };
}

/**
 * Get E-Score breakdown
 * @param {Object} state - E-Score state
 * @returns {Object} Detailed breakdown
 */
export function getEScoreBreakdown(state) {
  const breakdown = [];

  for (const [dim, config] of Object.entries(EScoreDimensions)) {
    const score = state.scores[dim] || 0;
    const weightedScore = score * config.weight;

    breakdown.push({
      dimension: dim,
      score,
      weight: config.weight,
      weightedScore: Math.round(weightedScore * 100) / 100,
      description: config.description,
    });
  }

  return {
    dimensions: breakdown,
    totalWeight: TOTAL_WEIGHT,
    composite: state.composite,
    lastUpdated: state.lastUpdated,
  };
}

export default {
  EScoreDimensions,
  createEScoreState,
  calculateHoldScore,
  calculateBurnScore,
  calculateUseScore,
  calculateBuildScore,
  calculateRunScore,
  calculateReferScore,
  calculateTimeScore,
  calculateCompositeEScore,
  updateEScoreState,
  getEScoreBreakdown,
};
