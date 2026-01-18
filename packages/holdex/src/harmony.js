/**
 * @cynic/holdex - Harmony Constants
 *
 * φ-aligned constants mirrored from HolDex for compatibility.
 * This is the CYNIC view of the $asdfasdfa ecosystem harmony module.
 *
 * "φ distrusts φ" - κυνικός
 *
 * @module @cynic/holdex/harmony
 */

'use strict';

import { PHI, PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════════
// PHI Powers (Pre-calculated for efficiency)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-calculated powers of φ
 */
export const PHI_POWERS = Object.freeze({
  PHI_SQ: PHI * PHI,                    // φ² = 2.618033988749895
  PHI_CUBED: PHI * PHI * PHI,           // φ³ = 4.236067977499790
  PHI_INV: PHI_INV,                     // φ⁻¹ = 0.618033988749895
  PHI_INV_SQ: 1 / (PHI * PHI),          // φ⁻² = 0.381966011250105
  PHI_INV_CUBED: 1 / (PHI * PHI * PHI), // φ⁻³ = 0.236067977499790
  PHI_INV_4: 1 / (PHI ** 4),            // φ⁻⁴ = 0.145898033750315
  PHI_INV_5: 1 / (PHI ** 5),            // φ⁻⁵ = 0.090169943749474
});

// ═══════════════════════════════════════════════════════════════════════════════
// K-Score System
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * K-Score Formula: K = 100 × ∛(D × O × L)
 *
 *   D = Diamond Hands (conviction, holding patterns)
 *   O = Organic Growth (natural distribution, not bots)
 *   L = Longevity (survival, time-tested)
 */
export const K_SCORE = Object.freeze({
  MAX: 100,
  MIN: 0,
  FORMULA: 'K = 100 × ∛(D × O × L)',

  /** φ-based thresholds for quality tiers */
  THRESHOLDS: Object.freeze({
    EXCEPTIONAL: PHI_INV * 100,    // 61.8% - φ⁻¹
    HEALTHY: PHI_POWERS.PHI_INV_SQ * 100,  // 38.2% - φ⁻²
    WARNING: PHI_POWERS.PHI_INV_CUBED * 100, // 23.6% - φ⁻³
  }),
});

/**
 * K-Score tiers mapped to CYNIC verdicts
 */
export const K_SCORE_TIERS = Object.freeze([
  { name: 'DIAMOND', minScore: 90, verdict: 'HOWL', color: '#B9F2FF' },
  { name: 'PLATINUM', minScore: 80, verdict: 'HOWL', color: '#E5E4E2' },
  { name: 'GOLD', minScore: 70, verdict: 'WAG', color: '#FFD700' },
  { name: 'SILVER', minScore: 60, verdict: 'WAG', color: '#C0C0C0' },
  { name: 'BRONZE', minScore: 50, verdict: 'WAG', color: '#CD7F32' },
  { name: 'IRON', minScore: 38, verdict: 'GROWL', color: '#43464B' },
  { name: 'STONE', minScore: 0, verdict: 'BARK', color: '#808080' },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// E-Score System (Ecosystem Participation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * E-Score dimension multipliers
 */
export const E_SCORE_MULTIPLIERS = Object.freeze({
  HOLD: 1.0,                    // Temporary capital
  BURN: PHI,                    // 1.618 - Permanent commitment
  USE: 1.0,                     // Activity
  BUILD: PHI_POWERS.PHI_SQ,     // 2.618 - Value creation
  RUN: PHI_POWERS.PHI_SQ,       // 2.618 - Infrastructure
  REFER: PHI,                   // 1.618 - Growth
  TIME: 1.0,                    // Loyalty
});

/**
 * E-Score tiers (ecosystem participation levels)
 */
export const E_SCORE_TIERS = Object.freeze([
  { name: 'Observer', threshold: 0, icon: '👁️' },
  { name: 'Seedling', threshold: 0.1, icon: '🌱' },
  { name: 'Sprout', threshold: 1, icon: '🌿' },
  { name: 'Sapling', threshold: 5, icon: '🌳' },
  { name: 'Tree', threshold: 15, icon: '🌲' },
  { name: 'Grove', threshold: 30, icon: '🌴' },
  { name: 'Forest', threshold: 50, icon: '🌲🌳🌲' },
  { name: 'Ecosystem', threshold: 75, icon: '🏔️🌲🌳' },
]);

/**
 * E-Score PHI Unit for discount calculation
 *
 * At E = 25 → discount = 1 - φ⁻¹ = 38.2%
 * At E = 50 → discount = 1 - φ⁻² = 61.8%
 * At E = 75 → discount = 1 - φ⁻³ = 76.4%
 */
export const E_SCORE_PHI_UNIT = 25;

/**
 * Maximum discount cap
 */
export const MAX_DISCOUNT_CAP = 1 - PHI_POWERS.PHI_INV_5; // ≈ 0.90983

// ═══════════════════════════════════════════════════════════════════════════════
// Fee Distribution
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fee distribution ratios (φ-aligned)
 */
export const FEE_RATIOS = Object.freeze({
  BURN: PHI_POWERS.PHI_INV_SQ,        // 38.2% - Deflation
  REWARDS: PHI_POWERS.PHI_INV_SQ,     // 38.2% - Distribution
  TREASURY: PHI_POWERS.PHI_INV_CUBED, // 23.6% - Operations
});

/**
 * Reward pool splits
 */
export const REWARD_SPLITS = Object.freeze({
  NODES: PHI_INV,                      // 61.8% of rewards
  USERS: PHI_POWERS.PHI_INV_CUBED,    // 23.6% of rewards
  DEVS: 1 - PHI_INV - PHI_POWERS.PHI_INV_CUBED, // ~14.6%
});

// ═══════════════════════════════════════════════════════════════════════════════
// Calculation Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate K-Score from components
 *
 * K = 100 × ∛(D × O × L)
 *
 * @param {number} d - Diamond hands score (0-1)
 * @param {number} o - Organic growth score (0-1)
 * @param {number} l - Longevity score (0-1)
 * @returns {number} K-Score (0-100)
 */
export function calculateKScore(d, o, l) {
  const D = Math.min(1, Math.max(0, d));
  const O = Math.min(1, Math.max(0, o));
  const L = Math.min(1, Math.max(0, l));

  // Add epsilon to avoid zero
  const epsilon = 0.001;
  return Math.round(
    100 * Math.cbrt(
      Math.max(D, epsilon) *
      Math.max(O, epsilon) *
      Math.max(L, epsilon)
    )
  );
}

/**
 * Get K-Score tier
 *
 * @param {number} score - K-Score (0-100)
 * @returns {Object} Tier info { name, minScore, verdict, color }
 */
export function getKScoreTier(score) {
  for (const tier of K_SCORE_TIERS) {
    if (score >= tier.minScore) {
      return { ...tier };
    }
  }
  return { ...K_SCORE_TIERS[K_SCORE_TIERS.length - 1] };
}

/**
 * Check if K-Score is healthy (above φ⁻² threshold)
 *
 * @param {number} score - K-Score (0-100)
 * @returns {boolean}
 */
export function isHealthyKScore(score) {
  return score >= K_SCORE.THRESHOLDS.HEALTHY;
}

/**
 * Check if K-Score is exceptional (above φ⁻¹ threshold)
 *
 * @param {number} score - K-Score (0-100)
 * @returns {boolean}
 */
export function isExceptionalKScore(score) {
  return score >= K_SCORE.THRESHOLDS.EXCEPTIONAL;
}

/**
 * Calculate E-Score discount
 *
 * discount = 1 - φ^(-E/25)
 *
 * @param {number} eScore - E-Score (0-100)
 * @returns {number} Discount (0 to MAX_DISCOUNT_CAP)
 */
export function calculateEScoreDiscount(eScore) {
  if (!eScore || eScore <= 0) return 0;
  const discount = 1 - Math.pow(PHI, -eScore / E_SCORE_PHI_UNIT);
  return Math.min(MAX_DISCOUNT_CAP, Math.max(0, discount));
}

/**
 * Get E-Score tier
 *
 * @param {number} score - E-Score
 * @returns {Object} Tier info { name, threshold, icon }
 */
export function getEScoreTier(score) {
  for (let i = E_SCORE_TIERS.length - 1; i >= 0; i--) {
    if (score >= E_SCORE_TIERS[i].threshold) {
      return { ...E_SCORE_TIERS[i] };
    }
  }
  return { ...E_SCORE_TIERS[0] };
}

/**
 * Distribute fee according to φ ratios
 *
 * @param {number} totalFee - Total fee to distribute
 * @returns {Object} { burn, rewards, treasury }
 */
export function distributeFee(totalFee) {
  const burn = Math.floor(totalFee * FEE_RATIOS.BURN);
  const rewards = Math.floor(totalFee * FEE_RATIOS.REWARDS);
  const treasury = totalFee - burn - rewards;

  return { total: totalFee, burn, rewards, treasury };
}

export default {
  PHI_POWERS,
  K_SCORE,
  K_SCORE_TIERS,
  E_SCORE_MULTIPLIERS,
  E_SCORE_TIERS,
  E_SCORE_PHI_UNIT,
  MAX_DISCOUNT_CAP,
  FEE_RATIOS,
  REWARD_SPLITS,
  calculateKScore,
  getKScoreTier,
  isHealthyKScore,
  isExceptionalKScore,
  calculateEScoreDiscount,
  getEScoreTier,
  distributeFee,
};
