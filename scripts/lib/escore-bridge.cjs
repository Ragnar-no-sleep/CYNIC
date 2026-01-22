/**
 * CYNIC E-Score Bridge Module
 *
 * "La valeur se prouve par l'action" - κυνικός
 *
 * Provides E-Score as informative metadata for CYNIC judgments.
 * E-Score is calculated by HolDex - this module bridges to it.
 *
 * E-Score dimensions (from HolDex):
 *   - HOLD: Token holding behavior
 *   - BURN: Burn participation
 *   - USE: Ecosystem utility usage
 *   - BUILD: Development contributions
 *   - RUN: Node/validator operation
 *   - REFER: Referral/onboarding
 *   - TIME: Long-term commitment
 *
 * NOTE: E-Score is INFORMATIVE only - it does NOT modify CYNIC judgments.
 * Psychology and biases are evaluated independently.
 *
 * @module cynic/lib/escore-bridge
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI, PHI_INV, PHI_INV_2, PHI_INV_3 } = phiMath;

// =============================================================================
// CONSTANTS
// =============================================================================

/** E-Score dimensions */
const DIMENSIONS = {
  HOLD: 'hold',
  BURN: 'burn',
  USE: 'use',
  BUILD: 'build',
  RUN: 'run',
  REFER: 'refer',
  TIME: 'time',
};

/** Dimension weights (φ-derived) */
const WEIGHTS = {
  [DIMENSIONS.HOLD]: PHI_INV_2,   // ~38.2% - holding is baseline
  [DIMENSIONS.BURN]: PHI_INV,    // ~61.8% - burning shows commitment
  [DIMENSIONS.USE]: PHI_INV_2,   // ~38.2% - usage is baseline
  [DIMENSIONS.BUILD]: 1.0,       // 100% - building is highest value
  [DIMENSIONS.RUN]: PHI_INV,     // ~61.8% - running nodes is valuable
  [DIMENSIONS.REFER]: PHI_INV_3, // ~23.6% - referrals are minor
  [DIMENSIONS.TIME]: PHI_INV_2,  // ~38.2% - time compounds
};

/** Cache duration in minutes */
const CACHE_DURATION_MIN = PHI_INV * 30; // ~18.5 minutes

// =============================================================================
// STORAGE
// =============================================================================

const ESCORE_DIR = path.join(os.homedir(), '.cynic', 'escore');
const CACHE_FILE = path.join(ESCORE_DIR, 'cache.json');
const HISTORY_FILE = path.join(ESCORE_DIR, 'history.jsonl');

// =============================================================================
// STATE
// =============================================================================

const escoreState = {
  // Current user's E-Score
  currentScore: null,
  dimensions: {},

  // Cache metadata
  lastFetch: null,
  cacheValid: false,

  // Contributor context (from contributor-discovery)
  contributorContext: null,
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(ESCORE_DIR)) {
    fs.mkdirSync(ESCORE_DIR, { recursive: true });
  }
}

function loadCache() {
  ensureDir();
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    // Check if cache is still valid
    const age = (Date.now() - data.fetchedAt) / (1000 * 60);
    if (age < CACHE_DURATION_MIN) {
      return data;
    }
    return null; // Cache expired
  } catch {
    return null;
  }
}

function saveCache(score, dimensions) {
  ensureDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify({
    score,
    dimensions,
    fetchedAt: Date.now(),
  }, null, 2));
}

function appendHistory(entry) {
  ensureDir();
  const line = JSON.stringify({ ...entry, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(HISTORY_FILE, line);
}

// =============================================================================
// E-SCORE CALCULATION
// =============================================================================

/**
 * Calculate E-Score from dimensions
 * Formula: weighted average with φ-derived weights
 * @param {Object} dimensions - Dimension values (0-1 each)
 * @returns {number} E-Score (0-100)
 */
function calculateEScore(dimensions) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dim, value] of Object.entries(dimensions)) {
    const weight = WEIGHTS[dim] || PHI_INV_3;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  // Normalize to 0-100
  return Math.round((weightedSum / totalWeight) * 100);
}

/**
 * Estimate BUILD dimension from contributor data
 * @param {Object} contributorData - Contributor profile data
 * @returns {number} BUILD score (0-1)
 */
function estimateBuildScore(contributorData) {
  if (!contributorData) return 0;

  const {
    totalCommits = 0,
    repos = {},
    linesOfCode = 0,
    pullRequests = 0,
  } = contributorData;

  // Normalize factors (φ-scaled thresholds)
  const commitScore = Math.min(1, totalCommits / (PHI * 100)); // ~162 commits = max
  const repoScore = Math.min(1, Object.keys(repos).length / (PHI * 5)); // ~8 repos = max
  const locScore = Math.min(1, linesOfCode / (PHI * 10000)); // ~16k LOC = max
  const prScore = Math.min(1, pullRequests / (PHI * 30)); // ~49 PRs = max

  // Weighted combination
  return (
    commitScore * PHI_INV_2 +
    repoScore * PHI_INV_3 +
    locScore * PHI_INV_2 +
    prScore * PHI_INV_3
  ) / (PHI_INV_2 * 2 + PHI_INV_3 * 2);
}

/**
 * Estimate TIME dimension from contribution history
 * @param {Object} contributorData - Contributor profile data
 * @returns {number} TIME score (0-1)
 */
function estimateTimeScore(contributorData) {
  if (!contributorData?.firstCommitDate) return 0;

  const firstCommit = new Date(contributorData.firstCommitDate);
  const now = new Date();
  const monthsActive = (now - firstCommit) / (1000 * 60 * 60 * 24 * 30);

  // φ-scaled: 12 months = ~0.618, 24 months = max
  return Math.min(1, monthsActive / (PHI * 15)); // ~24 months = max
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize E-Score bridge
 */
function init() {
  ensureDir();

  // Try to load from cache
  const cached = loadCache();
  if (cached) {
    escoreState.currentScore = cached.score;
    escoreState.dimensions = cached.dimensions;
    escoreState.lastFetch = cached.fetchedAt;
    escoreState.cacheValid = true;
  }
}

/**
 * Update E-Score from contributor context
 * Called when contributor-discovery has new data
 * @param {Object} contributorData - Contributor profile data
 */
function updateFromContributor(contributorData) {
  escoreState.contributorContext = contributorData;

  // Estimate dimensions we can calculate locally
  const dimensions = {
    [DIMENSIONS.BUILD]: estimateBuildScore(contributorData),
    [DIMENSIONS.TIME]: estimateTimeScore(contributorData),
    // Other dimensions require HolDex API or blockchain data
    [DIMENSIONS.HOLD]: escoreState.dimensions[DIMENSIONS.HOLD] || 0,
    [DIMENSIONS.BURN]: escoreState.dimensions[DIMENSIONS.BURN] || 0,
    [DIMENSIONS.USE]: escoreState.dimensions[DIMENSIONS.USE] || 0,
    [DIMENSIONS.RUN]: escoreState.dimensions[DIMENSIONS.RUN] || 0,
    [DIMENSIONS.REFER]: escoreState.dimensions[DIMENSIONS.REFER] || 0,
  };

  escoreState.dimensions = dimensions;
  escoreState.currentScore = calculateEScore(dimensions);
  escoreState.lastFetch = Date.now();

  saveCache(escoreState.currentScore, dimensions);
  appendHistory({
    event: 'score_updated',
    score: escoreState.currentScore,
    dimensions,
    source: 'contributor',
  });
}

/**
 * Update E-Score from HolDex API response
 * @param {Object} holdexData - HolDex E-Score data
 */
function updateFromHolDex(holdexData) {
  if (!holdexData) return;

  const dimensions = {
    [DIMENSIONS.HOLD]: holdexData.hold || 0,
    [DIMENSIONS.BURN]: holdexData.burn || 0,
    [DIMENSIONS.USE]: holdexData.use || 0,
    [DIMENSIONS.BUILD]: holdexData.build || escoreState.dimensions[DIMENSIONS.BUILD] || 0,
    [DIMENSIONS.RUN]: holdexData.run || 0,
    [DIMENSIONS.REFER]: holdexData.refer || 0,
    [DIMENSIONS.TIME]: holdexData.time || escoreState.dimensions[DIMENSIONS.TIME] || 0,
  };

  escoreState.dimensions = dimensions;
  escoreState.currentScore = holdexData.total || calculateEScore(dimensions);
  escoreState.lastFetch = Date.now();
  escoreState.cacheValid = true;

  saveCache(escoreState.currentScore, dimensions);
  appendHistory({
    event: 'score_updated',
    score: escoreState.currentScore,
    dimensions,
    source: 'holdex',
  });
}

/**
 * Get current E-Score
 * @returns {Object} E-Score data
 */
function getScore() {
  return {
    score: escoreState.currentScore,
    dimensions: { ...escoreState.dimensions },
    lastFetch: escoreState.lastFetch,
    cacheValid: escoreState.cacheValid,
    age: escoreState.lastFetch
      ? Math.round((Date.now() - escoreState.lastFetch) / (1000 * 60))
      : null,
  };
}

/**
 * Get E-Score context for CYNIC judgments
 * This is INFORMATIVE metadata - does not affect judgment scores
 * @returns {Object} Context for display/logging
 */
function getJudgmentContext() {
  const score = getScore();

  if (!score.score) {
    return {
      available: false,
      message: 'E-Score not available',
    };
  }

  // Determine tier based on score
  let tier;
  if (score.score >= PHI_INV * 100) {
    tier = 'φ-aligned'; // 62+
  } else if (score.score >= PHI_INV_2 * 100) {
    tier = 'contributor'; // 38-61
  } else if (score.score >= PHI_INV_3 * 100) {
    tier = 'participant'; // 24-37
  } else {
    tier = 'observer'; // <24
  }

  // Find strongest and weakest dimensions
  const sorted = Object.entries(score.dimensions)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const strongest = sorted[0]?.[0];
  const weakest = sorted[sorted.length - 1]?.[0];

  return {
    available: true,
    score: score.score,
    tier,
    strongest,
    weakest,
    buildScore: Math.round((score.dimensions[DIMENSIONS.BUILD] || 0) * 100),
    message: `E-Score: ${score.score}/100 (${tier})`,
  };
}

/**
 * Format E-Score for display
 * @returns {string} Formatted E-Score
 */
function formatScore() {
  const ctx = getJudgmentContext();

  if (!ctx.available) {
    return '*sniff* E-Score: N/A';
  }

  const bar = '█'.repeat(Math.round(ctx.score / 10)) +
              '░'.repeat(10 - Math.round(ctx.score / 10));

  return `E-Score: [${bar}] ${ctx.score}/100 (${ctx.tier})` +
         (ctx.strongest ? ` | Strongest: ${ctx.strongest.toUpperCase()}` : '');
}

/**
 * Check if E-Score is stale and needs refresh
 * @returns {boolean} True if needs refresh
 */
function needsRefresh() {
  if (!escoreState.lastFetch) return true;

  const age = (Date.now() - escoreState.lastFetch) / (1000 * 60);
  return age > CACHE_DURATION_MIN;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  DIMENSIONS,
  WEIGHTS,
  CACHE_DURATION_MIN,

  // Core functions
  init,
  updateFromContributor,
  updateFromHolDex,
  getScore,
  getJudgmentContext,
  formatScore,
  needsRefresh,

  // Helpers
  calculateEScore,
  estimateBuildScore,
  estimateTimeScore,
};
