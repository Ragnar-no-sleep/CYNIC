/**
 * E-Score 7D - Seven-Dimension Ecosystem Score Calculator
 *
 * "Trust is earned through seven paths" - κυνικός
 *
 * Full E-Score calculation with 7 φ-weighted dimensions:
 *
 *   E = Σ(dimension_i × φ^weight_i) / Σ(φ^weight_i) × 100
 *
 * Dimensions (from highest to lowest weight):
 *   1. HOLD  (φ⁶) - Token holding patterns
 *   2. BUILD (φ⁵) - Code contributions
 *   3. JUDGE (φ⁴) - Judgment accuracy
 *   4. BURN  (φ³) - Token burns
 *   5. STAKE (φ²) - Node operation
 *   6. SHARE (φ¹) - Knowledge sharing
 *   7. TRUST (φ⁰) - Community trust
 *
 * @module @cynic/identity/escore-7d
 */

'use strict';

import { PHI, PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * φ powers for dimension weights
 */
export const PHI_POWERS = {
  PHI_6: Math.pow(PHI, 6),  // 17.944
  PHI_5: Math.pow(PHI, 5),  // 11.090
  PHI_4: Math.pow(PHI, 4),  // 6.854
  PHI_3: Math.pow(PHI, 3),  // 4.236
  PHI_2: Math.pow(PHI, 2),  // 2.618
  PHI_1: PHI,               // 1.618
  PHI_0: 1,                 // 1.000
};

/**
 * Seven dimensions with φ-aligned weights
 *
 * Total weight = φ⁶ + φ⁵ + φ⁴ + φ³ + φ² + φ¹ + φ⁰ ≈ 45.36
 */
export const DIMENSIONS = {
  HOLD: {
    key: 'hold',
    weight: PHI_POWERS.PHI_6,
    description: 'Token holding patterns',
    dbColumn: 'hold_score',
  },
  BUILD: {
    key: 'build',
    weight: PHI_POWERS.PHI_5,
    description: 'Code contributions (commits, PRs, issues)',
    dbColumn: 'build_score',
  },
  JUDGE: {
    key: 'judge',
    weight: PHI_POWERS.PHI_4,
    description: 'Judgment accuracy (consensus agreement)',
    dbColumn: 'use_score',  // Maps to "use" in DB schema
  },
  BURN: {
    key: 'burn',
    weight: PHI_POWERS.PHI_3,
    description: 'Token burns (sacrifice for weight)',
    dbColumn: 'burn_score',
  },
  STAKE: {
    key: 'stake',
    weight: PHI_POWERS.PHI_2,
    description: 'Node operation (uptime, blocks processed)',
    dbColumn: 'run_score',  // Maps to "run" in DB schema
  },
  SHARE: {
    key: 'share',
    weight: PHI_POWERS.PHI_1,
    description: 'Knowledge sharing (docs, tutorials, referrals)',
    dbColumn: 'refer_score',  // Maps to "refer" in DB schema
  },
  TRUST: {
    key: 'trust',
    weight: PHI_POWERS.PHI_0,
    description: 'Community trust (vouches, time in ecosystem)',
    dbColumn: 'time_score',  // Maps to "time" in DB schema
  },
};

/**
 * Total weight for normalization
 */
export const TOTAL_WEIGHT = Object.values(DIMENSIONS)
  .reduce((sum, dim) => sum + dim.weight, 0);

/**
 * E-Score thresholds (φ-aligned)
 */
export const THRESHOLDS = {
  GUARDIAN: PHI_INV * 100,     // 61.8% - Guardian level
  STEWARD: PHI_INV ** 2 * 100, // 38.2% - Steward level
  BUILDER: 30,                  // Builder level
  CONTRIBUTOR: 15,              // Contributor level
  OBSERVER: 0,                  // New participant
};

/**
 * Trust levels from E-Score
 */
export const TRUST_LEVELS = {
  GUARDIAN: 4,    // E-Score ≥ 61.8%
  STEWARD: 3,     // E-Score ≥ 38.2%
  BUILDER: 2,     // E-Score ≥ 30
  CONTRIBUTOR: 1, // E-Score ≥ 15
  OBSERVER: 0,    // E-Score < 15
};

// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize HOLD dimension (token holding)
 *
 * Based on:
 * - Total holdings relative to circulating supply
 * - Diamond hands factor (holding duration)
 * - Distribution (not concentrated in one wallet)
 *
 * @param {Object} params
 * @param {number} params.holdings - Total token holdings
 * @param {number} params.circulatingSupply - Total circulating supply
 * @param {number} [params.holdingDurationDays=0] - Days holding
 * @param {number} [params.walletCount=1] - Number of wallets
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeHold({
  holdings = 0,
  circulatingSupply = 1e12,
  holdingDurationDays = 0,
  walletCount = 1,
}) {
  if (holdings <= 0) return 0;

  // Percentage of supply (log scale)
  const supplyRatio = holdings / circulatingSupply;
  const holdingScore = Math.min(1, Math.log10(supplyRatio * 1000 + 1) / 3);

  // Diamond hands bonus (φ-decay for longer holding)
  const diamondBonus = Math.min(0.3, holdingDurationDays / 365 * 0.3);

  // Distribution bonus (multiple wallets = better distribution)
  const distBonus = Math.min(0.1, Math.log2(walletCount) / 10);

  return Math.min(1, Math.max(0, holdingScore + diamondBonus + distBonus));
}

/**
 * Normalize BUILD dimension (code contributions)
 *
 * Based on:
 * - Commits
 * - Pull requests (merged)
 * - Issues opened/closed
 *
 * @param {Object} params
 * @param {number} [params.commits=0] - Number of commits
 * @param {number} [params.prs=0] - Number of merged PRs
 * @param {number} [params.issues=0] - Number of issues
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeBuild({
  commits = 0,
  prs = 0,
  issues = 0,
}) {
  // Weight: commits = 1, PRs = 5, issues = 2
  const weighted = commits + (prs * 5) + (issues * 2);

  // Log scale - 100 weighted contributions = 0.5, 1000 = ~0.75
  if (weighted <= 0) return 0;

  return Math.min(1, Math.log10(weighted + 1) / 3);
}

/**
 * Normalize JUDGE dimension (judgment accuracy)
 *
 * @param {Object} params
 * @param {number} params.agreementCount - Judgments matching consensus
 * @param {number} params.totalJudgments - Total judgments made
 * @param {number} [params.minJudgments=10] - Minimum for meaningful score
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeJudge({
  agreementCount = 0,
  totalJudgments = 0,
  minJudgments = 10,
}) {
  if (totalJudgments < minJudgments) {
    // Not enough data - scale linearly with participation
    return 0.5 * (totalJudgments / minJudgments);
  }

  return Math.min(1, Math.max(0, agreementCount / totalJudgments));
}

/**
 * Normalize BURN dimension (token burns)
 *
 * @param {Object} params
 * @param {number} params.totalBurned - Total tokens burned
 * @param {number} [params.scale=1e9] - Scale for normalization (1B default)
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeBurn({
  totalBurned = 0,
  scale = 1e9,
}) {
  if (totalBurned <= 0) return 0;

  // Log scale with φ base for harmonic scaling
  const normalized = Math.log(1 + totalBurned / scale) / Math.log(PHI + totalBurned / scale);

  return Math.min(1, Math.max(0, normalized));
}

/**
 * Normalize STAKE dimension (node operation)
 *
 * @param {Object} params
 * @param {number} params.uptimeSeconds - Actual uptime
 * @param {number} params.expectedUptimeSeconds - Expected uptime
 * @param {number} [params.blocksProcessed=0] - Blocks processed
 * @param {number} [params.expectedBlocks=0] - Expected blocks
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeStake({
  uptimeSeconds = 0,
  expectedUptimeSeconds = 0,
  blocksProcessed = 0,
  expectedBlocks = 0,
}) {
  if (expectedUptimeSeconds <= 0) return 0;

  // Uptime ratio (70% weight)
  const uptimeRatio = Math.min(1, uptimeSeconds / expectedUptimeSeconds);

  // Block processing ratio (30% weight)
  let blockRatio = 0;
  if (expectedBlocks > 0) {
    blockRatio = Math.min(1, blocksProcessed / expectedBlocks);
  }

  return uptimeRatio * 0.7 + blockRatio * 0.3;
}

/**
 * Normalize SHARE dimension (knowledge sharing)
 *
 * @param {Object} params
 * @param {number} [params.docsWritten=0] - Documentation contributions
 * @param {number} [params.tutorialsCreated=0] - Tutorials created
 * @param {number} [params.questionsAnswered=0] - Community questions answered
 * @param {number} [params.referrals=0] - Successful referrals
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeShare({
  docsWritten = 0,
  tutorialsCreated = 0,
  questionsAnswered = 0,
  referrals = 0,
}) {
  // Weight: docs = 3, tutorials = 5, answers = 1, referrals = 2
  const weighted = (docsWritten * 3) + (tutorialsCreated * 5) +
                   questionsAnswered + (referrals * 2);

  if (weighted <= 0) return 0;

  return Math.min(1, Math.log10(weighted + 1) / 2);
}

/**
 * Normalize TRUST dimension (community trust)
 *
 * Based on:
 * - Vouches from other users
 * - Time in ecosystem
 * - Reputation graph trust score
 *
 * @param {Object} params
 * @param {number} [params.vouches=0] - Number of vouches received
 * @param {number} [params.daysInEcosystem=0] - Days since first activity
 * @param {number} [params.reputationScore=0] - From ReputationGraph [0, 1]
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeTrust({
  vouches = 0,
  daysInEcosystem = 0,
  reputationScore = 0,
}) {
  // Vouches (40% weight) - log scale
  const vouchScore = vouches > 0 ? Math.min(0.4, Math.log10(vouches + 1) / 2.5) : 0;

  // Time factor (30% weight) - max at 2 years
  const timeScore = Math.min(0.3, daysInEcosystem / 730 * 0.3);

  // Reputation (30% weight)
  const repScore = reputationScore * 0.3;

  return Math.min(1, vouchScore + timeScore + repScore);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get trust level from E-Score
 *
 * @param {number} score - E-Score (0-100)
 * @returns {string} Trust level name
 */
export function getTrustLevel(score) {
  if (score >= THRESHOLDS.GUARDIAN) return 'GUARDIAN';
  if (score >= THRESHOLDS.STEWARD) return 'STEWARD';
  if (score >= THRESHOLDS.BUILDER) return 'BUILDER';
  if (score >= THRESHOLDS.CONTRIBUTOR) return 'CONTRIBUTOR';
  return 'OBSERVER';
}

/**
 * Calculate full 7-dimension E-Score
 *
 * @param {Object} params - Input parameters for all dimensions
 * @param {Object} [params.hold] - HOLD dimension params
 * @param {Object} [params.build] - BUILD dimension params
 * @param {Object} [params.judge] - JUDGE dimension params
 * @param {Object} [params.burn] - BURN dimension params
 * @param {Object} [params.stake] - STAKE dimension params
 * @param {Object} [params.share] - SHARE dimension params
 * @param {Object} [params.trust] - TRUST dimension params
 * @returns {Object} E-Score result with breakdown
 */
export function calculateEScore7D(params = {}) {
  // Normalize each dimension
  const normalized = {
    hold: normalizeHold(params.hold || {}),
    build: normalizeBuild(params.build || {}),
    judge: normalizeJudge(params.judge || {}),
    burn: normalizeBurn(params.burn || {}),
    stake: normalizeStake(params.stake || {}),
    share: normalizeShare(params.share || {}),
    trust: normalizeTrust(params.trust || {}),
  };

  // Calculate weighted sum
  let weightedSum = 0;
  const contributions = {};

  for (const [key, dim] of Object.entries(DIMENSIONS)) {
    const dimKey = dim.key;
    const value = normalized[dimKey];
    const contribution = value * dim.weight;

    weightedSum += contribution;
    contributions[dimKey] = {
      normalized: value,
      weight: dim.weight,
      contribution,
      percentage: (contribution / TOTAL_WEIGHT * 100).toFixed(2) + '%',
    };
  }

  // Final score normalized to 0-100
  const rawScore = (weightedSum / TOTAL_WEIGHT) * 100;
  const score = Math.round(rawScore * 10) / 10;

  return {
    score: Math.min(100, Math.max(0, score)),
    trustLevel: getTrustLevel(score),
    trustLevelValue: TRUST_LEVELS[getTrustLevel(score)],
    dimensions: contributions,
    breakdown: {
      hold: Math.round(normalized.hold * 100),
      build: Math.round(normalized.build * 100),
      judge: Math.round(normalized.judge * 100),
      burn: Math.round(normalized.burn * 100),
      stake: Math.round(normalized.stake * 100),
      share: Math.round(normalized.share * 100),
      trust: Math.round(normalized.trust * 100),
    },
    formula: 'E = Σ(dim × φ^weight) / Σ(φ^weight) × 100',
    totalWeight: TOTAL_WEIGHT,
    timestamp: Date.now(),
  };
}

/**
 * Map 7D breakdown to database column format
 *
 * @param {Object} breakdown - From calculateEScore7D().breakdown
 * @returns {Object} Database-compatible format
 */
export function toDbFormat(breakdown) {
  return {
    hold: breakdown.hold,
    burn: breakdown.burn,
    use: breakdown.judge,   // JUDGE → use
    build: breakdown.build,
    run: breakdown.stake,   // STAKE → run
    refer: breakdown.share, // SHARE → refer
    time: breakdown.trust,  // TRUST → time
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// E-SCORE 7D CALCULATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * E-Score 7D Calculator with state tracking
 */
export class EScore7DCalculator {
  constructor() {
    // HOLD state
    this.holdings = 0;
    this.circulatingSupply = 1e12;
    this.holdingStartDate = null;
    this.walletCount = 1;

    // BUILD state
    this.commits = 0;
    this.prs = 0;
    this.issues = 0;

    // JUDGE state
    this.agreementCount = 0;
    this.totalJudgments = 0;

    // BURN state
    this.totalBurned = 0;
    this.burnHistory = [];

    // STAKE state
    this.startTime = Date.now();
    this.totalUptimeMs = 0;
    this.lastHeartbeat = Date.now();
    this.isOnline = true;
    this.blocksProcessed = 0;

    // SHARE state
    this.docsWritten = 0;
    this.tutorialsCreated = 0;
    this.questionsAnswered = 0;
    this.referrals = 0;

    // TRUST state
    this.vouches = 0;
    this.firstActivityDate = Date.now();
    this.reputationScore = 0;

    // Cache
    this._cachedScore = null;
    this._cacheTime = 0;
    this._cacheTtl = 60000;
  }

  // --- Recording Methods ---

  recordHoldings(amount, circulatingSupply = null) {
    this.holdings = amount;
    if (circulatingSupply) this.circulatingSupply = circulatingSupply;
    if (!this.holdingStartDate) this.holdingStartDate = Date.now();
    this._invalidateCache();
  }

  recordCommit() {
    this.commits++;
    this._invalidateCache();
  }

  recordPR() {
    this.prs++;
    this._invalidateCache();
  }

  recordIssue() {
    this.issues++;
    this._invalidateCache();
  }

  recordJudgment(matchedConsensus) {
    this.totalJudgments++;
    if (matchedConsensus) this.agreementCount++;
    this._invalidateCache();
  }

  recordBurn(amount, txSignature = null) {
    this.totalBurned += amount;
    this.burnHistory.push({ amount, txSignature, timestamp: Date.now() });
    this._invalidateCache();
  }

  heartbeat() {
    const now = Date.now();
    if (this.isOnline) {
      this.totalUptimeMs += now - this.lastHeartbeat;
    }
    this.lastHeartbeat = now;
    this.isOnline = true;
  }

  recordBlock() {
    this.blocksProcessed++;
    this._invalidateCache();
  }

  recordDoc() {
    this.docsWritten++;
    this._invalidateCache();
  }

  recordTutorial() {
    this.tutorialsCreated++;
    this._invalidateCache();
  }

  recordAnswer() {
    this.questionsAnswered++;
    this._invalidateCache();
  }

  recordReferral() {
    this.referrals++;
    this._invalidateCache();
  }

  recordVouch() {
    this.vouches++;
    this._invalidateCache();
  }

  setReputationScore(score) {
    this.reputationScore = Math.min(1, Math.max(0, score));
    this._invalidateCache();
  }

  // --- Calculation ---

  calculate(skipCache = false) {
    if (!skipCache && this._cachedScore && Date.now() - this._cacheTime < this._cacheTtl) {
      return this._cachedScore;
    }

    const now = Date.now();
    const expectedUptime = (now - this.startTime) / 1000;
    const actualUptime = this.isOnline
      ? (this.totalUptimeMs + (now - this.lastHeartbeat)) / 1000
      : this.totalUptimeMs / 1000;

    const holdingDays = this.holdingStartDate
      ? (now - this.holdingStartDate) / (1000 * 60 * 60 * 24)
      : 0;

    const daysInEcosystem = (now - this.firstActivityDate) / (1000 * 60 * 60 * 24);

    const result = calculateEScore7D({
      hold: {
        holdings: this.holdings,
        circulatingSupply: this.circulatingSupply,
        holdingDurationDays: holdingDays,
        walletCount: this.walletCount,
      },
      build: {
        commits: this.commits,
        prs: this.prs,
        issues: this.issues,
      },
      judge: {
        agreementCount: this.agreementCount,
        totalJudgments: this.totalJudgments,
      },
      burn: {
        totalBurned: this.totalBurned,
      },
      stake: {
        uptimeSeconds: actualUptime,
        expectedUptimeSeconds: expectedUptime,
        blocksProcessed: this.blocksProcessed,
      },
      share: {
        docsWritten: this.docsWritten,
        tutorialsCreated: this.tutorialsCreated,
        questionsAnswered: this.questionsAnswered,
        referrals: this.referrals,
      },
      trust: {
        vouches: this.vouches,
        daysInEcosystem,
        reputationScore: this.reputationScore,
      },
    });

    this._cachedScore = result;
    this._cacheTime = Date.now();

    return result;
  }

  _invalidateCache() {
    this._cachedScore = null;
  }

  // --- Export/Import ---

  export() {
    return {
      holdings: this.holdings,
      circulatingSupply: this.circulatingSupply,
      holdingStartDate: this.holdingStartDate,
      walletCount: this.walletCount,
      commits: this.commits,
      prs: this.prs,
      issues: this.issues,
      agreementCount: this.agreementCount,
      totalJudgments: this.totalJudgments,
      totalBurned: this.totalBurned,
      burnHistory: this.burnHistory,
      startTime: this.startTime,
      totalUptimeMs: this.totalUptimeMs,
      lastHeartbeat: this.lastHeartbeat,
      isOnline: this.isOnline,
      blocksProcessed: this.blocksProcessed,
      docsWritten: this.docsWritten,
      tutorialsCreated: this.tutorialsCreated,
      questionsAnswered: this.questionsAnswered,
      referrals: this.referrals,
      vouches: this.vouches,
      firstActivityDate: this.firstActivityDate,
      reputationScore: this.reputationScore,
    };
  }

  import(state) {
    Object.assign(this, state);
    this._invalidateCache();
  }

  getStats() {
    return {
      score: this.calculate(),
      state: this.export(),
    };
  }
}

/**
 * Create an E-Score 7D calculator
 *
 * @returns {EScore7DCalculator}
 */
export function createEScore7DCalculator() {
  return new EScore7DCalculator();
}

export default {
  // Constants
  DIMENSIONS,
  THRESHOLDS,
  TRUST_LEVELS,
  TOTAL_WEIGHT,
  PHI_POWERS,

  // Normalization
  normalizeHold,
  normalizeBuild,
  normalizeJudge,
  normalizeBurn,
  normalizeStake,
  normalizeShare,
  normalizeTrust,

  // Calculation
  calculateEScore7D,
  getTrustLevel,
  toDbFormat,

  // Class
  EScore7DCalculator,
  createEScore7DCalculator,
};
