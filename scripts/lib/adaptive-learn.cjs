/**
 * CYNIC Adaptive Learning System
 *
 * "BURN: Don't extract, burn" - Continuous learning with φ-decay
 *
 * Replaces magic numbers with learned, adaptive thresholds.
 * Old patterns decay and burn away. New patterns strengthen.
 *
 * Core principles:
 * - Thresholds adapt from observed data, not hardcoded
 * - Patterns decay by φ^(-age) - recent = strong, old = weak
 * - Feedback calibrates detection accuracy
 * - False positives/negatives auto-adjust weights
 *
 * @module cynic/lib/adaptive-learn
 */

'use strict';

const fs = require('fs');
const path = require('path');

// =============================================================================
// φ CONSTANTS - The only "magic numbers" allowed
// =============================================================================

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8%
const PHI_INV_2 = 0.381966011250105;    // 38.2%
const PHI_INV_3 = 0.236067977499790;    // 23.6%

// Decay half-life in days (φ-aligned)
const DECAY_HALF_LIFE_DAYS = PHI * 10;  // ~16.18 days

// Minimum observations before adapting
const MIN_OBSERVATIONS = 5;

// Learning rate (how fast we adapt)
const LEARNING_RATE = PHI_INV_2;        // 38.2% - cautious learning

// =============================================================================
// PATHS
// =============================================================================

function getLearnDir() {
  const home = process.env.HOME || '/root';
  const dir = path.join(home, '.cynic', 'learning');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getThresholdsPath() {
  return path.join(getLearnDir(), 'thresholds.json');
}

function getObservationsPath() {
  return path.join(getLearnDir(), 'observations.jsonl');
}

function getFeedbackPath() {
  return path.join(getLearnDir(), 'feedback.jsonl');
}

function getStatsPath() {
  return path.join(getLearnDir(), 'stats.json');
}

// =============================================================================
// OBSERVATION STORAGE (Append-only with decay awareness)
// =============================================================================

/**
 * Record an observation for learning
 * @param {Object} obs - Observation data
 * @param {string} obs.type - Type: 'error', 'success', 'security', 'loop', etc.
 * @param {string} obs.context - Context identifier
 * @param {number} [obs.value] - Numeric value if applicable
 * @param {Object} [obs.metadata] - Additional data
 */
function recordObservation(obs) {
  const record = {
    id: `obs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    type: obs.type,
    context: obs.context || 'global',
    value: obs.value ?? 1,
    metadata: obs.metadata || {},
  };

  // Append to observations log
  const line = JSON.stringify(record) + '\n';
  fs.appendFileSync(getObservationsPath(), line);

  // Trigger threshold recalculation if enough observations
  maybeRecalculateThresholds(obs.type);

  return record;
}

/**
 * Get observations with φ-decay weighting
 * @param {string} type - Observation type filter
 * @param {number} [maxAgeDays] - Maximum age to consider
 * @returns {Array} Weighted observations
 */
function getWeightedObservations(type, maxAgeDays = 30) {
  const obsPath = getObservationsPath();
  if (!fs.existsSync(obsPath)) return [];

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const observations = [];

  // Read and parse observations
  const lines = fs.readFileSync(obsPath, 'utf-8').split('\n').filter(l => l);

  for (const line of lines) {
    try {
      const obs = JSON.parse(line);

      // Filter by type
      if (type && obs.type !== type) continue;

      // Filter by age
      const ageMs = now - obs.timestamp;
      if (ageMs > maxAgeMs) continue;

      // Calculate φ-decay weight
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      const decayFactor = Math.pow(PHI_INV, ageDays / DECAY_HALF_LIFE_DAYS);

      observations.push({
        ...obs,
        weight: decayFactor,
        ageDays,
      });
    } catch (e) {
      // Skip malformed lines
    }
  }

  return observations;
}

// =============================================================================
// ADAPTIVE THRESHOLDS
// =============================================================================

/**
 * Default thresholds (fallback before learning)
 */
const DEFAULT_THRESHOLDS = {
  error: {
    count: 3,           // Errors before judgment
    windowMs: 300000,   // 5 minute window
    confidence: 0.5,
  },
  success: {
    count: 5,           // Successes before judgment
    windowMs: 300000,
    confidence: 0.5,
  },
  loop: {
    identical: 3,       // Identical calls before block
    similar: 5,         // Similar calls before block
    polling: 2,         // Polling calls before block (stricter)
    similarity: PHI_INV, // 61.8% similarity threshold
    windowMs: 60000,
  },
  codeChange: {
    rapidCount: 3,      // Rapid changes to same file before warning
    windowMs: 300000,   // 5 minute window
    largeChange: 100,   // Lines changed considered "large"
  },
  security: {
    criticalBlock: true,
    highBlock: true,
    mediumWarn: true,
    lowIgnore: false,
  },
  completion: {
    minimum: PHI_INV_2,   // 38.2% can stop with warning
    satisfactory: PHI_INV, // 61.8% clean stop
    excellent: 0.854,      // φ⁻¹ + φ⁻³
  },
};

/**
 * Load current thresholds (learned or default)
 * @returns {Object} Current thresholds
 */
function loadThresholds() {
  const threshPath = getThresholdsPath();
  if (fs.existsSync(threshPath)) {
    try {
      const learned = JSON.parse(fs.readFileSync(threshPath, 'utf-8'));
      // Merge with defaults (learned overrides defaults)
      return deepMerge(DEFAULT_THRESHOLDS, learned.thresholds || {});
    } catch (e) {
      return { ...DEFAULT_THRESHOLDS };
    }
  }
  return { ...DEFAULT_THRESHOLDS };
}

/**
 * Save learned thresholds
 */
function saveThresholds(thresholds, stats = {}) {
  const data = {
    version: 1,
    updatedAt: new Date().toISOString(),
    thresholds,
    stats,
  };
  fs.writeFileSync(getThresholdsPath(), JSON.stringify(data, null, 2));
}

/**
 * Get a specific threshold value
 * @param {string} category - Category (error, success, loop, etc.)
 * @param {string} key - Threshold key
 * @returns {number|boolean} Threshold value
 */
function getThreshold(category, key) {
  const thresholds = loadThresholds();
  return thresholds[category]?.[key] ?? DEFAULT_THRESHOLDS[category]?.[key];
}

// =============================================================================
// THRESHOLD RECALCULATION (The BURN learning)
// =============================================================================

/**
 * Maybe recalculate thresholds if we have enough data
 */
function maybeRecalculateThresholds(type) {
  const observations = getWeightedObservations(type, 30);

  if (observations.length < MIN_OBSERVATIONS) {
    return; // Not enough data yet
  }

  // Only recalculate occasionally (not every observation)
  const stats = loadStats();
  const lastCalc = stats.lastCalculation?.[type] || 0;
  const timeSinceCalc = Date.now() - lastCalc;

  // Recalculate at most once per hour
  if (timeSinceCalc < 3600000) return;

  recalculateThreshold(type, observations);
}

/**
 * Recalculate threshold for a specific type
 */
function recalculateThreshold(type, observations) {
  if (!observations || observations.length < MIN_OBSERVATIONS) return;

  const thresholds = loadThresholds();
  const stats = loadStats();

  switch (type) {
    case 'error':
      recalculateErrorThreshold(thresholds, observations, stats);
      break;
    case 'success':
      recalculateSuccessThreshold(thresholds, observations, stats);
      break;
    case 'loop':
      recalculateLoopThreshold(thresholds, observations, stats);
      break;
    case 'codeChange':
      recalculateCodeChangeThreshold(thresholds, observations, stats);
      break;
  }

  // Update calculation timestamp
  stats.lastCalculation = stats.lastCalculation || {};
  stats.lastCalculation[type] = Date.now();

  saveThresholds(thresholds, stats);
  saveStats(stats);
}

/**
 * Recalculate error threshold based on observed error patterns
 */
function recalculateErrorThreshold(thresholds, observations, stats) {
  // Calculate weighted statistics
  const values = observations.map(o => o.value * o.weight);
  const weights = observations.map(o => o.weight);

  const weightedMean = weightedAverage(values, weights);
  const weightedStd = weightedStdDev(values, weights, weightedMean);

  // New threshold = mean + φ × stddev (catches outliers)
  // But bounded by reasonable limits
  let newThreshold = Math.round(weightedMean + PHI * weightedStd);
  newThreshold = Math.max(2, Math.min(10, newThreshold)); // Bounded [2, 10]

  // Apply learning rate (don't jump too fast)
  const current = thresholds.error?.count || DEFAULT_THRESHOLDS.error.count;
  const adjusted = current + LEARNING_RATE * (newThreshold - current);

  thresholds.error = thresholds.error || {};
  thresholds.error.count = Math.round(adjusted);

  // Track learning
  stats.errorLearning = stats.errorLearning || [];
  stats.errorLearning.push({
    timestamp: Date.now(),
    observations: observations.length,
    weightedMean,
    weightedStd,
    oldThreshold: current,
    newThreshold: thresholds.error.count,
  });

  // BURN: Keep only last 100 learning records
  if (stats.errorLearning.length > 100) {
    stats.errorLearning = stats.errorLearning.slice(-100);
  }
}

/**
 * Recalculate success streak threshold
 */
function recalculateSuccessThreshold(thresholds, observations, stats) {
  // Success streaks should adapt to user's typical success rate
  const values = observations.map(o => o.value * o.weight);
  const weights = observations.map(o => o.weight);

  const weightedMean = weightedAverage(values, weights);
  const weightedStd = weightedStdDev(values, weights, weightedMean);

  // Threshold = mean × φ (celebrate when above typical)
  let newThreshold = Math.round(weightedMean * PHI);
  newThreshold = Math.max(3, Math.min(15, newThreshold)); // Bounded [3, 15]

  const current = thresholds.success?.count || DEFAULT_THRESHOLDS.success.count;
  const adjusted = current + LEARNING_RATE * (newThreshold - current);

  thresholds.success = thresholds.success || {};
  thresholds.success.count = Math.round(adjusted);
}

/**
 * Recalculate loop detection threshold
 */
function recalculateLoopThreshold(thresholds, observations, stats) {
  // Analyze false positive rate from feedback
  const feedback = loadFeedback('loop');
  const falsePositives = feedback.filter(f => f.correct === false).length;
  const total = feedback.length;

  if (total < MIN_OBSERVATIONS) return;

  const fpRate = falsePositives / total;

  // If high false positive rate, increase threshold (less sensitive)
  // If low false positive rate, we could decrease (more sensitive)
  const current = thresholds.loop?.identical || DEFAULT_THRESHOLDS.loop.identical;

  let adjustment = 0;
  if (fpRate > PHI_INV_2) {
    // Too many false positives - increase threshold
    adjustment = 1;
  } else if (fpRate < PHI_INV_3 && total > 20) {
    // Very few false positives with good sample - could decrease
    adjustment = -0.5;
  }

  const newThreshold = Math.round(current + LEARNING_RATE * adjustment);
  thresholds.loop = thresholds.loop || {};
  thresholds.loop.identical = Math.max(2, Math.min(10, newThreshold));
}

/**
 * Recalculate code change threshold (rapid changes warning)
 */
function recalculateCodeChangeThreshold(thresholds, observations, stats) {
  // Analyze how many rapid changes typically occur in normal work
  const values = observations.map(o => o.value * o.weight);
  const weights = observations.map(o => o.weight);

  if (values.length < MIN_OBSERVATIONS) return;

  const weightedMean = weightedAverage(values, weights);
  const weightedStd = weightedStdDev(values, weights, weightedMean);

  // Threshold = mean + φ × stddev (warn only on outliers)
  let newThreshold = Math.round(weightedMean + PHI * weightedStd);
  newThreshold = Math.max(2, Math.min(10, newThreshold)); // Bounded [2, 10]

  const current = thresholds.codeChange?.rapidCount || DEFAULT_THRESHOLDS.codeChange.rapidCount;
  const adjusted = current + LEARNING_RATE * (newThreshold - current);

  thresholds.codeChange = thresholds.codeChange || {};
  thresholds.codeChange.rapidCount = Math.round(adjusted);

  // Track learning
  stats.codeChangeLearning = stats.codeChangeLearning || [];
  stats.codeChangeLearning.push({
    timestamp: Date.now(),
    observations: observations.length,
    weightedMean,
    weightedStd,
    oldThreshold: current,
    newThreshold: thresholds.codeChange.rapidCount,
  });

  // BURN: Keep only last 100 learning records
  if (stats.codeChangeLearning.length > 100) {
    stats.codeChangeLearning = stats.codeChangeLearning.slice(-100);
  }
}

// =============================================================================
// FEEDBACK LOOP (Calibration from user corrections)
// =============================================================================

/**
 * Record feedback on a detection/judgment
 * @param {Object} feedback - Feedback data
 * @param {string} feedback.type - Detection type (error, loop, security, etc.)
 * @param {string} feedback.detectionId - ID of the detection being judged
 * @param {boolean} feedback.correct - Was the detection correct?
 * @param {string} [feedback.correction] - What should have happened?
 */
function recordFeedback(feedback) {
  const record = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    type: feedback.type,
    detectionId: feedback.detectionId,
    correct: feedback.correct,
    correction: feedback.correction,
  };

  const line = JSON.stringify(record) + '\n';
  fs.appendFileSync(getFeedbackPath(), line);

  // Trigger recalibration
  recalculateThreshold(feedback.type, getWeightedObservations(feedback.type));

  return record;
}

/**
 * Load feedback for a specific type
 */
function loadFeedback(type, maxAgeDays = 30) {
  const fbPath = getFeedbackPath();
  if (!fs.existsSync(fbPath)) return [];

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const feedback = [];

  const lines = fs.readFileSync(fbPath, 'utf-8').split('\n').filter(l => l);

  for (const line of lines) {
    try {
      const fb = JSON.parse(line);
      if (type && fb.type !== type) continue;
      if (now - fb.timestamp > maxAgeMs) continue;
      feedback.push(fb);
    } catch (e) {
      // Skip malformed
    }
  }

  return feedback;
}

/**
 * Get calibration stats (accuracy metrics)
 */
function getCalibrationStats() {
  const feedback = loadFeedback(null, 30);

  const byType = {};
  for (const fb of feedback) {
    byType[fb.type] = byType[fb.type] || { correct: 0, incorrect: 0, total: 0 };
    byType[fb.type].total++;
    if (fb.correct) byType[fb.type].correct++;
    else byType[fb.type].incorrect++;
  }

  // Calculate accuracy per type
  for (const type of Object.keys(byType)) {
    const t = byType[type];
    t.accuracy = t.total > 0 ? t.correct / t.total : null;
    t.falsePositiveRate = t.total > 0 ? t.incorrect / t.total : null;
  }

  return {
    byType,
    totalFeedback: feedback.length,
    overallAccuracy: feedback.length > 0
      ? feedback.filter(f => f.correct).length / feedback.length
      : null,
  };
}

// =============================================================================
// PATTERN BURN (Decay and cleanup old data)
// =============================================================================

/**
 * BURN old observations that have decayed below threshold
 * This keeps the learning data lean and relevant
 */
function burnOldObservations(maxAgeDays = 60) {
  const obsPath = getObservationsPath();
  if (!fs.existsSync(obsPath)) return { burned: 0 };

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const burnThreshold = PHI_INV_3; // 23.6% - patterns below this weight are burned

  const kept = [];
  let burned = 0;

  const lines = fs.readFileSync(obsPath, 'utf-8').split('\n').filter(l => l);

  for (const line of lines) {
    try {
      const obs = JSON.parse(line);
      const ageMs = now - obs.timestamp;

      // Check age limit
      if (ageMs > maxAgeMs) {
        burned++;
        continue;
      }

      // Check decay weight
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      const weight = Math.pow(PHI_INV, ageDays / DECAY_HALF_LIFE_DAYS);

      if (weight < burnThreshold) {
        burned++;
        continue;
      }

      kept.push(line);
    } catch (e) {
      // Skip malformed
    }
  }

  // Rewrite file with only kept observations
  fs.writeFileSync(obsPath, kept.join('\n') + (kept.length > 0 ? '\n' : ''));

  return { burned, kept: kept.length };
}

/**
 * BURN old feedback that's no longer relevant
 */
function burnOldFeedback(maxAgeDays = 90) {
  const fbPath = getFeedbackPath();
  if (!fs.existsSync(fbPath)) return { burned: 0 };

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const kept = [];
  let burned = 0;

  const lines = fs.readFileSync(fbPath, 'utf-8').split('\n').filter(l => l);

  for (const line of lines) {
    try {
      const fb = JSON.parse(line);
      if (now - fb.timestamp > maxAgeMs) {
        burned++;
      } else {
        kept.push(line);
      }
    } catch (e) {
      // Skip
    }
  }

  fs.writeFileSync(fbPath, kept.join('\n') + (kept.length > 0 ? '\n' : ''));

  return { burned, kept: kept.length };
}

/**
 * Full BURN cycle - cleanup all old data
 */
function burnCycle() {
  const obsResult = burnOldObservations();
  const fbResult = burnOldFeedback();

  const stats = loadStats();
  stats.lastBurn = {
    timestamp: Date.now(),
    observationsBurned: obsResult.burned,
    feedbackBurned: fbResult.burned,
  };
  saveStats(stats);

  return {
    observations: obsResult,
    feedback: fbResult,
  };
}

// =============================================================================
// STATS
// =============================================================================

function loadStats() {
  const statsPath = getStatsPath();
  if (fs.existsSync(statsPath)) {
    try {
      return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveStats(stats) {
  stats.updatedAt = new Date().toISOString();
  fs.writeFileSync(getStatsPath(), JSON.stringify(stats, null, 2));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function weightedAverage(values, weights) {
  if (values.length === 0) return 0;
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
    weightSum += weights[i];
  }
  return weightSum > 0 ? sum / weightSum : 0;
}

function weightedStdDev(values, weights, mean) {
  if (values.length < 2) return 0;
  let sumSq = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i++) {
    sumSq += weights[i] * Math.pow(values[i] - mean, 2);
    weightSum += weights[i];
  }
  return weightSum > 0 ? Math.sqrt(sumSq / weightSum) : 0;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants (the ONLY magic numbers)
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3,
  DECAY_HALF_LIFE_DAYS,
  LEARNING_RATE,

  // Observation recording
  recordObservation,
  getWeightedObservations,

  // Adaptive thresholds
  loadThresholds,
  getThreshold,
  DEFAULT_THRESHOLDS,

  // Feedback loop
  recordFeedback,
  loadFeedback,
  getCalibrationStats,

  // BURN mechanism
  burnOldObservations,
  burnOldFeedback,
  burnCycle,

  // Stats
  loadStats,
  saveStats,

  // Paths
  getLearnDir,
};
