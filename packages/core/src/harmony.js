/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HARMONY MODULE v2.0 - CYNIC ECOSYSTEM ECONOMIC ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * "Don't Trust, Verify. Don't Extract, Burn."
 *
 * Adopted from HolDex via cross-project pattern mining.
 * This is the SINGLE SOURCE OF TRUTH for all φ-based calculations across
 * the entire ecosystem: CYNIC, HolDex, GASdf, and future projects.
 *
 * DESIGN PRINCIPLES:
 *   1. PURE - No side effects, no external dependencies
 *   2. IMMUTABLE - All constants are frozen
 *   3. UNIVERSAL - Works in Node.js, browser, and edge
 *   4. DOCUMENTED - Every formula has mathematical explanation
 *
 * MATHEMATICAL FOUNDATION:
 *   φ (Golden Ratio) = (1 + √5) / 2 ≈ 1.618033988749895
 *
 *   Properties:
 *   - φ² = φ + 1 (self-similarity)
 *   - 1/φ = φ - 1 (reciprocal beauty)
 *   - φⁿ = φⁿ⁻¹ + φⁿ⁻² (Fibonacci connection)
 *
 * SEFIROT MAPPING:
 *   Keter (Crown)     → CYNIC Collective
 *   Daat (Knowledge)  → AI Superlayer
 *   Hod (Splendor)    → K-Score Analytics (HolDex)
 *   Yesod (Foundation)→ Infrastructure (GASdf)
 *   Malkhuth (Kingdom)→ The Token ($asdfasdfa)
 *
 * @module @cynic/core/harmony
 * @version 2.0.0
 * @license MIT
 * @origin HolDex (cross-project pattern adoption)
 */

'use strict';

import { PHI, PHI_INV, PHI_INV_2, PHI_INV_3 } from './axioms/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: EXTENDED PHI POWERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-calculated powers of φ for efficiency and precision
 * Extends @cynic/core constants with additional powers
 */
export const PHI_POWERS = Object.freeze({
  PHI,                                    // φ = 1.618033988749895
  PHI_SQ: PHI * PHI,                      // φ² = 2.618033988749895
  PHI_CUBED: PHI * PHI * PHI,             // φ³ = 4.236067977499790
  PHI_INV,                                // φ⁻¹ = 0.618033988749895
  PHI_INV_SQ: PHI_INV_2,                  // φ⁻² = 0.381966011250105
  PHI_INV_CUBED: PHI_INV_3,               // φ⁻³ = 0.236067977499790
  PHI_INV_4: 1 / (PHI ** 4),              // φ⁻⁴ = 0.145898033750315
  PHI_INV_5: 1 / (PHI ** 5),              // φ⁻⁵ = 0.090169943749474
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: FEE DISTRIBUTION RATIOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fee Distribution Ratios
 *
 * When fees are collected, they are split according to φ:
 *
 *   BURN (38.2%)     = φ⁻² → Permanent deflation, rewards all holders
 *   REWARDS (38.2%)  = φ⁻² → Distribution to E-Score participants
 *   TREASURY (23.6%) = φ⁻³ → Operational costs, development
 *
 * Mathematical elegance: BURN + REWARDS + TREASURY = 1.0
 */
export const FEE_RATIOS = Object.freeze({
  BURN: PHI_INV_2,        // 38.2% - Deflation
  REWARDS: PHI_INV_2,     // 38.2% - Distribution
  TREASURY: PHI_INV_3,    // 23.6% - Operations
});

/**
 * Reward Pool Distribution (within the 38.2% REWARDS)
 *
 *   NODES (61.8%) = φ⁻¹ → Infrastructure operators
 *   USERS (23.6%) = φ⁻³ → E-Score participants
 *   DEVS (14.6%)  = remainder → Developers
 */
export const REWARD_SPLITS = Object.freeze({
  NODES: PHI_INV,                         // 61.8% of rewards
  USERS: PHI_INV_3,                       // 23.6% of rewards
  DEVS: 1 - PHI_INV - PHI_INV_3,          // ~14.6%
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: E-SCORE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * E-Score Dimension Multipliers
 *
 * Each dimension has a multiplier based on its value to the ecosystem:
 *
 *   HOLD (1.0)   → Capital at risk, but temporary
 *   BURN (φ)    → Permanent commitment, irreversible
 *   USE (1.0)   → Activity, but no skin in game
 *   BUILD (φ²)  → Creating value, highest contribution
 *   RUN (φ²)    → Infrastructure, highest contribution
 *   REFER (φ)   → Growth, organic expansion
 *   TIME (1.0)  → Loyalty, but passive
 */
export const MULTIPLIERS = Object.freeze({
  HOLD: 1.0,                              // Temporary capital
  BURN: PHI,                              // 1.618 - Permanent commitment
  USE: 1.0,                               // Activity
  BUILD: PHI_POWERS.PHI_SQ,               // 2.618 - Value creation
  RUN: PHI_POWERS.PHI_SQ,                 // 2.618 - Infrastructure
  REFER: PHI,                             // 1.618 - Growth
  TIME: 1.0,                              // Loyalty
});

/**
 * E-Score Tiers
 *
 * Progression follows φ-based thresholds for natural growth
 */
export const TIERS = Object.freeze([
  { name: 'Observer', threshold: 0, icon: '👁️', color: '#888888' },
  { name: 'Seedling', threshold: 0.1, icon: '🌱', color: '#90EE90' },
  { name: 'Sprout', threshold: 1, icon: '🌿', color: '#32CD32' },
  { name: 'Sapling', threshold: 5, icon: '🌳', color: '#228B22' },
  { name: 'Tree', threshold: 15, icon: '🌲', color: '#006400' },
  { name: 'Grove', threshold: 30, icon: '🌴', color: '#2E8B57' },
  { name: 'Forest', threshold: 50, icon: '🌲🌳🌲', color: '#1B4D3E' },
  { name: 'Ecosystem', threshold: 75, icon: '🏔️🌲🌳', color: '#0D2818' },
]);

/**
 * E-Score PHI Unit for discount calculation
 * At E = 25 → discount = 38.2%, At E = 50 → 61.8%, At E = 75 → 76.4%
 */
export const E_SCORE_PHI_UNIT = 25;

/**
 * Maximum discount cap (φ-based safety limit)
 * Even with infinite E-Score, discount cannot exceed 1 - φ⁻⁵
 */
export const MAX_DISCOUNT_CAP = 1 - PHI_POWERS.PHI_INV_5; // ≈ 0.90983

/**
 * Safety margin for efficiency floor (φ-based)
 * minFee = actualCost × 1.236
 */
export const SAFETY_MARGIN = 1 + PHI_INV_3; // ≈ 1.236

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: K-SCORE SYSTEM (Token Quality)
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
});

/**
 * K-Score Consensus Rules
 * Consensus is reached when φ⁻¹ (61.8%) of nodes agree
 */
export const CONSENSUS_RULES = Object.freeze({
  MIN_VERIFICATIONS: 2,
  AGREEMENT_THRESHOLD: PHI_INV, // 61.8%
  KSCORE_TOLERANCE: 5,          // Fibonacci number
  CONSENSUS_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours

  getRequiredApprovals(totalNodes) {
    return Math.max(2, Math.ceil(totalNodes * PHI_INV));
  },

  isConsensusReached(agreeing, total) {
    if (total < 2) return false;
    return agreeing / total >= PHI_INV;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: I-SCORE SYSTEM (Infrastructure Integrity)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * I-Score Formula: I = 100 × ∛(D × O × L)
 * For infrastructure tokens (SOL, USDC, etc.)
 */
export const I_SCORE = Object.freeze({
  FORMULA: 'I_infra = 100 × ∛(D_liquidity × O_oracle × L_reliability)',

  THRESHOLDS: Object.freeze({
    CRITICAL: PHI_INV_2 * 100,  // < 38.2%
    WARNING: PHI_INV * 100,     // < 61.8%
    HEALTHY: PHI_INV * 100,     // >= 61.8%
  }),

  WEIGHTS: Object.freeze({
    SOL: PHI_POWERS.PHI_SQ,     // 2.618 - Foundation
    USDC: PHI,                   // 1.618 - Primary stable
    USDT: 1.0,                   // Secondary stable
    wSOL: PHI,                   // 1.618 - Wrapped native
    JitoSOL: 1.0,                // LST
    mSOL: 1.0,                   // LST
    bSOL: 1.0,                   // LST
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: Φ-SCORE SYSTEM (Meta Score)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Φ-Score: The unified meta-score combining K, E, and I
 * Formula: Φ = 100 × ∛(K̄^φ × Ē^1 × Ī^φ²)
 */
export const PHI_SCORE = Object.freeze({
  FORMULA: 'Φ = 100 × ∛(K̄^φ × Ē^1 × Ī^φ²)',
  WEIGHTS: Object.freeze({
    K: PHI,                      // Token quality
    E: 1.0,                      // Participation
    I: PHI_POWERS.PHI_SQ,        // Infrastructure
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate E-Score from contributions
 *
 * @param {Object} contributions - Raw contribution data
 * @returns {Object} { score, breakdown, activeDimensions, diversityBonus }
 */
export function calculateEScore(contributions) {
  const {
    holdings = 0,
    burned = 0,
    apiCalls30d = 0,
    appsLive = 0,
    nodesActive = 0,
    referralsActive = 0,
    daysActive = 0,
  } = contributions;

  // Normalize each dimension to 0-100 range with log scaling
  const normalize = (value, scale) => {
    if (value <= 0) return 0;
    return Math.min(100, Math.log10(1 + value / scale) * 100);
  };

  // Calculate each dimension score
  const dimensions = {
    hold: normalize(holdings, 1000000),
    burn: normalize(burned, 100000),
    use: normalize(apiCalls30d, 1000),
    build: normalize(appsLive, 1),
    run: normalize(nodesActive, 1),
    refer: normalize(referralsActive, 10),
    time: normalize(daysActive, 365),
  };

  // Apply multipliers
  const weighted = {
    hold: dimensions.hold * MULTIPLIERS.HOLD,
    burn: dimensions.burn * MULTIPLIERS.BURN,
    use: dimensions.use * MULTIPLIERS.USE,
    build: dimensions.build * MULTIPLIERS.BUILD,
    run: dimensions.run * MULTIPLIERS.RUN,
    refer: dimensions.refer * MULTIPLIERS.REFER,
    time: dimensions.time * MULTIPLIERS.TIME,
  };

  // Count active dimensions (for diversity bonus)
  const activeDimensions = Object.values(dimensions).filter(v => v > 0).length;

  // Diversity bonus: φ^(active-1) / φ^6
  const diversityBonus = activeDimensions > 1
    ? Math.pow(PHI, activeDimensions - 1) / Math.pow(PHI, 6)
    : 0;

  // Calculate weighted sum
  const totalWeight = Object.values(MULTIPLIERS).reduce((a, b) => a + b, 0);
  const weightedSum = Object.values(weighted).reduce((a, b) => a + b, 0);

  // Base score (0-100)
  const baseScore = (weightedSum / totalWeight) * (1 + diversityBonus);
  const score = Math.min(100, Math.round(baseScore * 100) / 100);

  return {
    score,
    breakdown: weighted,
    rawDimensions: dimensions,
    activeDimensions,
    diversityBonus: Math.round(diversityBonus * 1000) / 1000,
  };
}

/**
 * Get tier for an E-Score
 */
export function getTier(score) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].threshold) {
      return { ...TIERS[i] };
    }
  }
  return { ...TIERS[0] };
}

/**
 * Calculate progress to next tier
 */
export function getProgressToNextTier(score) {
  const currentTier = getTier(score);
  const currentIndex = TIERS.findIndex(t => t.name === currentTier.name);
  const nextTier = TIERS[currentIndex + 1];

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      progress: 1,
      remaining: 0,
      isMaxTier: true,
    };
  }

  const rangeSize = nextTier.threshold - currentTier.threshold;
  const progress = (score - currentTier.threshold) / rangeSize;
  const remaining = nextTier.threshold - score;

  return {
    currentTier,
    nextTier,
    progress: Math.round(progress * 1000) / 1000,
    remaining: Math.round(remaining * 100) / 100,
    isMaxTier: false,
  };
}

/**
 * Calculate discount from E-Score
 * Uses golden ratio curve: discount = 1 - φ^(-E/25)
 */
export function calculateDiscount(eScore) {
  if (!eScore || eScore <= 0) return 0;
  const discount = 1 - Math.pow(PHI, -eScore / E_SCORE_PHI_UNIT);
  return Math.min(MAX_DISCOUNT_CAP, Math.max(0, discount));
}

/**
 * Calculate benefits for an E-Score
 */
export function calculateBenefits(eScore) {
  const discount = calculateDiscount(eScore);
  const tier = getTier(eScore);
  const tierIndex = TIERS.findIndex(t => t.name === tier.name);
  const tierMultiplier = 1 + (tierIndex * PHI_INV_2);

  return {
    benefits: {
      theoreticalDiscount: discount,
      freeCalls: Math.floor(tierIndex * 10 * tierMultiplier),
      rateLimit: Math.floor(100 * tierMultiplier),
      priority: tierIndex,
    },
    display: {
      discount: `${(discount * 100).toFixed(1)}%`,
      tier: tier.name,
      icon: tier.icon,
    },
  };
}

/**
 * Calculate minimum fee (efficiency floor)
 */
export function calculateMinimumFee(actualCost) {
  return actualCost * SAFETY_MARGIN;
}

/**
 * Calculate maximum possible discount
 */
export function calculateMaxDiscount(baseFee, actualCost) {
  const minFee = calculateMinimumFee(actualCost);
  if (baseFee <= minFee) return 0;
  return (baseFee - minFee) / baseFee;
}

/**
 * Calculate final fee with efficiency floor
 */
export function calculateFinalFee(eScore, baseFee, actualCost) {
  const theoreticalDiscount = calculateDiscount(eScore);
  const maxDiscount = calculateMaxDiscount(baseFee, actualCost);
  const effectiveDiscount = Math.min(theoreticalDiscount, maxDiscount);
  const minFee = calculateMinimumFee(actualCost);

  const discountedFee = baseFee * (1 - effectiveDiscount);
  const finalFee = Math.max(minFee, discountedFee);

  return {
    baseFee,
    actualCost,
    minFee,
    eScore,
    discounts: {
      theoretical: Math.round(theoreticalDiscount * 10000) / 100,
      max: Math.round(maxDiscount * 10000) / 100,
      effective: Math.round(effectiveDiscount * 10000) / 100,
      limited: effectiveDiscount < theoreticalDiscount,
    },
    finalFee: Math.round(finalFee * 100) / 100,
    savings: Math.round((baseFee - finalFee) * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: FEE DISTRIBUTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Distribute a fee according to φ ratios
 */
export function distributeFee(totalFee) {
  const burn = Math.floor(totalFee * FEE_RATIOS.BURN);
  const rewards = Math.floor(totalFee * FEE_RATIOS.REWARDS);
  const treasury = totalFee - burn - rewards;

  return {
    total: totalFee,
    burn,
    rewards,
    treasury,
    ratios: FEE_RATIOS,
  };
}

/**
 * Split rewards pool among recipient types
 */
export function splitRewardsPool(rewardsPool) {
  const nodes = Math.floor(rewardsPool * REWARD_SPLITS.NODES);
  const users = Math.floor(rewardsPool * REWARD_SPLITS.USERS);
  const devs = rewardsPool - nodes - users;

  return {
    total: rewardsPool,
    nodes,
    users,
    devs,
    ratios: REWARD_SPLITS,
  };
}

/**
 * Calculate individual reward share
 */
export function calculateRewardShare(participantScore, totalScore, pool) {
  if (totalScore <= 0 || participantScore <= 0) return 0;
  return (participantScore / totalScore) * pool;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: K-SCORE / I-SCORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate K-Score from components
 * K = 100 × ∛(D × O × L)
 */
export function calculateKScore(d, o, l) {
  const D = Math.min(1, Math.max(0, d));
  const O = Math.min(1, Math.max(0, o));
  const L = Math.min(1, Math.max(0, l));
  return Math.round(100 * Math.cbrt(D * O * L));
}

/**
 * Calculate I-Score for infrastructure token
 */
export function calculateIScore(liquidity, oracle, reliability) {
  const D = Math.min(1, Math.max(0, liquidity));
  const O = Math.min(1, Math.max(0, oracle));
  const L = Math.min(1, Math.max(0, reliability));
  const score = 100 * Math.cbrt(D * O * L);

  return {
    score: Math.round(score * 100) / 100,
    components: { D, O, L },
    health: score >= I_SCORE.THRESHOLDS.HEALTHY ? 'healthy' :
      score >= I_SCORE.THRESHOLDS.CRITICAL ? 'warning' : 'critical',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a number with φ-based notation
 */
export function formatPhiNumber(value) {
  if (Math.abs(value - PHI) < 1e-10) return 'φ';
  if (Math.abs(value - PHI_POWERS.PHI_SQ) < 1e-10) return 'φ²';
  if (Math.abs(value - PHI_INV) < 1e-10) return 'φ⁻¹';
  if (Math.abs(value - PHI_INV_2) < 1e-10) return 'φ⁻²';
  if (Math.abs(value - PHI_INV_3) < 1e-10) return 'φ⁻³';
  return value.toFixed(4);
}

/**
 * Verify φ relationships (for testing/validation)
 */
export function verifyPhiRelationships() {
  const checks = {
    phiSquaredIdentity: Math.abs(PHI_POWERS.PHI_SQ - (PHI + 1)) < 1e-10,
    phiInverseIdentity: Math.abs(PHI_INV - (PHI - 1)) < 1e-10,
    phiProduct: Math.abs(PHI * PHI_INV - 1) < 1e-10,
    feeRatioSum: Math.abs(
      FEE_RATIOS.BURN + FEE_RATIOS.REWARDS + FEE_RATIOS.TREASURY - 1
    ) < 1e-10,
    rewardSplitSum: Math.abs(
      REWARD_SPLITS.NODES + REWARD_SPLITS.USERS + REWARD_SPLITS.DEVS - 1
    ) < 1e-10,
  };

  return {
    allValid: Object.values(checks).every(v => v),
    checks,
  };
}

// Legacy alias
export const RATIOS = FEE_RATIOS;
