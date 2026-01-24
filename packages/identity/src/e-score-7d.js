/**
 * E-Score 7D - Seven-Dimension Ecosystem Score Calculator
 *
 * "φ distrusts φ. Trust is earned through sacrifice." - κυνικός
 *
 * Symmetric φ-aligned scoring system:
 *
 *   E = Σ(dimension_i × weight_i) / Σ(weight_i) × 100
 *
 * 7 Dimensions (symmetric around RUN = 1):
 *
 *   BURN   φ³  = 4.236   Sacrifice (tokens burned) - HIGHEST
 *   BUILD  φ²  = 2.618   Creation (git-signed code)
 *   JUDGE  φ   = 1.618   Validation (PoJ consensus + content quality)
 *   RUN    1   = 1.000   Operation (node uptime) - CENTER
 *   SOCIAL φ⁻¹ = 0.618   Content quality (AI-judged)
 *   GRAPH  φ⁻² = 0.382   Network position (trust received)
 *   HOLD   φ⁻³ = 0.236   Stake (passive holding) - LOWEST
 *
 * Total Weight = 3√5 + 4 ≈ 10.708
 *
 * Symmetry:
 *   BURN ↔ HOLD   (φ³ ↔ φ⁻³)  Sacrifice vs Passive
 *   BUILD ↔ GRAPH (φ² ↔ φ⁻²)  Create vs Receive trust
 *   JUDGE ↔ SOCIAL(φ ↔ φ⁻¹)   Validate vs Contribute
 *   RUN = CENTER  (1)         Operation as neutral point
 *
 * Philosophy: Active contribution > passive holding
 * All dimensions are verifiable (on-chain, git, PoJ, AI-judged, ReputationGraph)
 *
 * @module @cynic/identity/escore-7d
 */

'use strict';

import { PHI, PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * φ powers for dimension weights (symmetric around 1)
 *
 * Mathematical identities:
 *   φ + φ⁻¹ = √5
 *   φ² + φ⁻² = 3
 *   φ³ + φ⁻³ = 2√5
 */
export const PHI_POWERS = {
  PHI_3: Math.pow(PHI, 3),        // 4.236 - BURN (sacrifice)
  PHI_2: Math.pow(PHI, 2),        // 2.618 - BUILD (create)
  PHI_1: PHI,                     // 1.618 - JUDGE (validate)
  PHI_0: 1,                       // 1.000 - RUN (operate) - CENTER
  PHI_NEG_1: PHI_INV,             // 0.618 - SOCIAL (content quality)
  PHI_NEG_2: Math.pow(PHI_INV, 2), // 0.382 - GRAPH (network position)
  PHI_NEG_3: Math.pow(PHI_INV, 3), // 0.236 - HOLD (passive)
};

/**
 * Seven dimensions with φ-aligned weights (symmetric around RUN)
 *
 * Total weight = φ³ + φ² + φ + 1 + φ⁻¹ + φ⁻² + φ⁻³
 *              = (φ³ + φ⁻³) + (φ² + φ⁻²) + (φ + φ⁻¹) + 1
 *              = 2√5 + 3 + √5 + 1
 *              = 3√5 + 4 ≈ 10.708
 */
export const DIMENSIONS = {
  BURN: {
    key: 'burn',
    weight: PHI_POWERS.PHI_3,  // φ³ = 4.236 (HIGHEST - sacrifice)
    description: 'Token burns (sacrifice for weight)',
    dbColumn: 'burn_score',
    verifiable: 'on-chain',
  },
  BUILD: {
    key: 'build',
    weight: PHI_POWERS.PHI_2,  // φ² = 2.618 (create value)
    description: 'Code contributions (commits, PRs, issues)',
    dbColumn: 'build_score',
    verifiable: 'git-signed',
  },
  JUDGE: {
    key: 'judge',
    weight: PHI_POWERS.PHI_1,  // φ = 1.618 (validate)
    description: 'Judgment accuracy (PoJ consensus + content quality)',
    dbColumn: 'judge_score',
    verifiable: 'PoJ',
  },
  RUN: {
    key: 'run',
    weight: PHI_POWERS.PHI_0,  // 1 = 1.000 (CENTER - operate)
    description: 'Node operation (uptime, blocks processed)',
    dbColumn: 'run_score',
    verifiable: 'heartbeats',
  },
  SOCIAL: {
    key: 'social',
    weight: PHI_POWERS.PHI_NEG_1,  // φ⁻¹ = 0.618 (content quality)
    description: 'Social content quality (AI-judged tweets, posts)',
    dbColumn: 'social_score',
    verifiable: 'AI-judged',
  },
  GRAPH: {
    key: 'graph',
    weight: PHI_POWERS.PHI_NEG_2,  // φ⁻² = 0.382 (network position)
    description: 'Network position (trust received in ReputationGraph)',
    dbColumn: 'graph_score',
    verifiable: 'ReputationGraph',
  },
  HOLD: {
    key: 'hold',
    weight: PHI_POWERS.PHI_NEG_3,  // φ⁻³ = 0.236 (LOWEST - passive)
    description: 'Token holding patterns (passive stake)',
    dbColumn: 'hold_score',
    verifiable: 'on-chain',
  },
};

/**
 * Total weight for normalization = 3√5 + 4
 */
export const TOTAL_WEIGHT = Object.values(DIMENSIONS)
  .reduce((sum, dim) => sum + dim.weight, 0);

/**
 * E-Score thresholds (φ-aligned)
 */
export const THRESHOLDS = {
  GUARDIAN: PHI_INV * 100,       // 61.8% - Guardian level
  STEWARD: PHI_INV ** 2 * 100,   // 38.2% - Steward level
  BUILDER: 30,                    // Builder level
  CONTRIBUTOR: 15,                // Contributor level
  OBSERVER: 0,                    // New participant
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
 * Normalize BURN dimension (token sacrifice)
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
 * Normalize BUILD dimension (code contributions)
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

  if (weighted <= 0) return 0;

  // Log scale - 100 weighted contributions = 0.5, 1000 = ~0.75
  return Math.min(1, Math.log10(weighted + 1) / 3);
}

/**
 * Normalize JUDGE dimension (validation accuracy + content quality)
 *
 * @param {Object} params
 * @param {number} params.agreementCount - Judgments matching consensus
 * @param {number} params.totalJudgments - Total judgments made
 * @param {number} [params.contentQualityScore=0] - Quality of judged content [0,1]
 * @param {number} [params.minJudgments=10] - Minimum for meaningful score
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeJudge({
  agreementCount = 0,
  totalJudgments = 0,
  contentQualityScore = 0,
  minJudgments = 10,
}) {
  let judgmentAccuracy = 0;

  if (totalJudgments < minJudgments) {
    // Not enough data - scale linearly with participation
    judgmentAccuracy = 0.5 * (totalJudgments / minJudgments);
  } else {
    judgmentAccuracy = agreementCount / totalJudgments;
  }

  // 80% weight on judgment accuracy, 20% on content quality
  const score = judgmentAccuracy * 0.8 + contentQualityScore * 0.2;

  return Math.min(1, Math.max(0, score));
}

/**
 * Normalize RUN dimension (node operation) - CENTER dimension
 *
 * @param {Object} params
 * @param {number} params.uptimeSeconds - Actual uptime
 * @param {number} params.expectedUptimeSeconds - Expected uptime
 * @param {number} [params.blocksProcessed=0] - Blocks processed
 * @param {number} [params.expectedBlocks=0] - Expected blocks
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeRun({
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
 * Normalize SOCIAL dimension (AI-judged content quality)
 *
 * Based on AI analysis of social content (tweets, posts, replies):
 * - Quality score from CYNIC judgment
 * - Engagement authenticity
 * - Ecosystem relevance
 *
 * @param {Object} params
 * @param {number} [params.qualityScore=0] - AI-judged quality score [0,1]
 * @param {number} [params.contentCount=0] - Number of pieces analyzed
 * @param {number} [params.relevanceScore=0] - Ecosystem relevance [0,1]
 * @param {number} [params.minContent=5] - Minimum content for meaningful score
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeSocial({
  qualityScore = 0,
  contentCount = 0,
  relevanceScore = 0,
  minContent = 5,
}) {
  if (contentCount < minContent) {
    // Not enough data - scale linearly
    return qualityScore * 0.5 * (contentCount / minContent);
  }

  // 70% quality, 30% relevance
  return Math.min(1, Math.max(0, qualityScore * 0.7 + relevanceScore * 0.3));
}

/**
 * Normalize GRAPH dimension (network position in ReputationGraph)
 *
 * Based on:
 * - Trust received from other nodes
 * - Network centrality
 * - Transitive trust score
 *
 * @param {Object} params
 * @param {number} [params.trustReceived=0] - Direct trust score received [0,1]
 * @param {number} [params.transitiveScore=0] - Transitive trust score [0,1]
 * @param {number} [params.trustedByCount=0] - Number of nodes that trust you
 * @param {number} [params.networkSize=1] - Total network size
 * @returns {number} Normalized score [0, 1]
 */
export function normalizeGraph({
  trustReceived = 0,
  transitiveScore = 0,
  trustedByCount = 0,
  networkSize = 1,
}) {
  // Direct trust (40% weight)
  const directScore = trustReceived * 0.4;

  // Transitive trust (40% weight)
  const transitScore = transitiveScore * 0.4;

  // Network coverage (20% weight) - what % of network trusts you
  const coverageRatio = networkSize > 0 ? trustedByCount / networkSize : 0;
  const coverageScore = Math.min(0.2, coverageRatio * 0.2);

  return Math.min(1, Math.max(0, directScore + transitScore + coverageScore));
}

/**
 * Normalize HOLD dimension (passive token holding) - LOWEST weight
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
 * Calculate full 7-dimension E-Score (symmetric model)
 *
 * @param {Object} params - Input parameters for all dimensions
 * @param {Object} [params.burn] - BURN dimension params (sacrifice)
 * @param {Object} [params.build] - BUILD dimension params (create)
 * @param {Object} [params.judge] - JUDGE dimension params (validate)
 * @param {Object} [params.run] - RUN dimension params (operate)
 * @param {Object} [params.social] - SOCIAL dimension params (content quality)
 * @param {Object} [params.graph] - GRAPH dimension params (network position)
 * @param {Object} [params.hold] - HOLD dimension params (passive)
 * @returns {Object} E-Score result with breakdown
 */
export function calculateEScore7D(params = {}) {
  // Normalize each dimension
  const normalized = {
    burn: normalizeBurn(params.burn || {}),
    build: normalizeBuild(params.build || {}),
    judge: normalizeJudge(params.judge || {}),
    run: normalizeRun(params.run || {}),
    social: normalizeSocial(params.social || {}),
    graph: normalizeGraph(params.graph || {}),
    hold: normalizeHold(params.hold || {}),
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
      burn: Math.round(normalized.burn * 100),
      build: Math.round(normalized.build * 100),
      judge: Math.round(normalized.judge * 100),
      run: Math.round(normalized.run * 100),
      social: Math.round(normalized.social * 100),
      graph: Math.round(normalized.graph * 100),
      hold: Math.round(normalized.hold * 100),
    },
    formula: 'E = Σ(dim × φ^weight) / (3√5 + 4) × 100',
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
    burn: breakdown.burn,
    build: breakdown.build,
    judge: breakdown.judge,
    run: breakdown.run,
    social: breakdown.social,
    graph: breakdown.graph,
    hold: breakdown.hold,
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
    // BURN state (φ³)
    this.totalBurned = 0;
    this.burnHistory = [];

    // BUILD state (φ²)
    this.commits = 0;
    this.prs = 0;
    this.issues = 0;

    // JUDGE state (φ)
    this.agreementCount = 0;
    this.totalJudgments = 0;
    this.contentQualityScore = 0;

    // RUN state (1) - CENTER
    this.startTime = Date.now();
    this.totalUptimeMs = 0;
    this.lastHeartbeat = Date.now();
    this.isOnline = true;
    this.blocksProcessed = 0;

    // SOCIAL state (φ⁻¹)
    this.socialQualityScore = 0;
    this.socialContentCount = 0;
    this.socialRelevanceScore = 0;

    // GRAPH state (φ⁻²)
    this.trustReceived = 0;
    this.transitiveScore = 0;
    this.trustedByCount = 0;
    this.networkSize = 1;

    // HOLD state (φ⁻³)
    this.holdings = 0;
    this.circulatingSupply = 1e12;
    this.holdingStartDate = null;
    this.walletCount = 1;

    // Metadata
    this.firstActivityDate = Date.now();

    // Cache
    this._cachedScore = null;
    this._cacheTime = 0;
    this._cacheTtl = 60000;
  }

  // --- BURN Recording (φ³) ---

  recordBurn(amount, txSignature = null) {
    this.totalBurned += amount;
    this.burnHistory.push({ amount, txSignature, timestamp: Date.now() });
    this._invalidateCache();
  }

  // --- BUILD Recording (φ²) ---

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

  // --- JUDGE Recording (φ) ---

  recordJudgment(matchedConsensus) {
    this.totalJudgments++;
    if (matchedConsensus) this.agreementCount++;
    this._invalidateCache();
  }

  setContentQualityScore(score) {
    this.contentQualityScore = Math.min(1, Math.max(0, score));
    this._invalidateCache();
  }

  // --- RUN Recording (1) - CENTER ---

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

  // --- SOCIAL Recording (φ⁻¹) ---

  recordSocialContent(qualityScore, relevanceScore = 0) {
    this.socialContentCount++;
    // Running average for quality
    this.socialQualityScore = (
      (this.socialQualityScore * (this.socialContentCount - 1) + qualityScore) /
      this.socialContentCount
    );
    // Running average for relevance
    this.socialRelevanceScore = (
      (this.socialRelevanceScore * (this.socialContentCount - 1) + relevanceScore) /
      this.socialContentCount
    );
    this._invalidateCache();
  }

  // --- GRAPH Recording (φ⁻²) ---

  updateGraphPosition({ trustReceived, transitiveScore, trustedByCount, networkSize }) {
    if (trustReceived !== undefined) this.trustReceived = trustReceived;
    if (transitiveScore !== undefined) this.transitiveScore = transitiveScore;
    if (trustedByCount !== undefined) this.trustedByCount = trustedByCount;
    if (networkSize !== undefined) this.networkSize = networkSize;
    this._invalidateCache();
  }

  // --- HOLD Recording (φ⁻³) ---

  recordHoldings(amount, circulatingSupply = null) {
    this.holdings = amount;
    if (circulatingSupply) this.circulatingSupply = circulatingSupply;
    if (!this.holdingStartDate) this.holdingStartDate = Date.now();
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

    const result = calculateEScore7D({
      burn: {
        totalBurned: this.totalBurned,
      },
      build: {
        commits: this.commits,
        prs: this.prs,
        issues: this.issues,
      },
      judge: {
        agreementCount: this.agreementCount,
        totalJudgments: this.totalJudgments,
        contentQualityScore: this.contentQualityScore,
      },
      run: {
        uptimeSeconds: actualUptime,
        expectedUptimeSeconds: expectedUptime,
        blocksProcessed: this.blocksProcessed,
      },
      social: {
        qualityScore: this.socialQualityScore,
        contentCount: this.socialContentCount,
        relevanceScore: this.socialRelevanceScore,
      },
      graph: {
        trustReceived: this.trustReceived,
        transitiveScore: this.transitiveScore,
        trustedByCount: this.trustedByCount,
        networkSize: this.networkSize,
      },
      hold: {
        holdings: this.holdings,
        circulatingSupply: this.circulatingSupply,
        holdingDurationDays: holdingDays,
        walletCount: this.walletCount,
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
      // BURN (φ³)
      totalBurned: this.totalBurned,
      burnHistory: this.burnHistory,
      // BUILD (φ²)
      commits: this.commits,
      prs: this.prs,
      issues: this.issues,
      // JUDGE (φ)
      agreementCount: this.agreementCount,
      totalJudgments: this.totalJudgments,
      contentQualityScore: this.contentQualityScore,
      // RUN (1)
      startTime: this.startTime,
      totalUptimeMs: this.totalUptimeMs,
      lastHeartbeat: this.lastHeartbeat,
      isOnline: this.isOnline,
      blocksProcessed: this.blocksProcessed,
      // SOCIAL (φ⁻¹)
      socialQualityScore: this.socialQualityScore,
      socialContentCount: this.socialContentCount,
      socialRelevanceScore: this.socialRelevanceScore,
      // GRAPH (φ⁻²)
      trustReceived: this.trustReceived,
      transitiveScore: this.transitiveScore,
      trustedByCount: this.trustedByCount,
      networkSize: this.networkSize,
      // HOLD (φ⁻³)
      holdings: this.holdings,
      circulatingSupply: this.circulatingSupply,
      holdingStartDate: this.holdingStartDate,
      walletCount: this.walletCount,
      // Metadata
      firstActivityDate: this.firstActivityDate,
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

  // Normalization (in φ-weight order)
  normalizeBurn,    // φ³
  normalizeBuild,   // φ²
  normalizeJudge,   // φ
  normalizeRun,     // 1
  normalizeSocial,  // φ⁻¹
  normalizeGraph,   // φ⁻²
  normalizeHold,    // φ⁻³

  // Calculation
  calculateEScore7D,
  getTrustLevel,
  toDbFormat,

  // Class
  EScore7DCalculator,
  createEScore7DCalculator,
};
