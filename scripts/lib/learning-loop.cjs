/**
 * CYNIC Learning Loop Module
 *
 * "Le chien apprend de ses erreurs" - κυνικός
 *
 * Tracks prediction accuracy and calibrates the system.
 * Enables CYNIC to learn from outcomes and improve over time.
 *
 * Learning dimensions:
 *   - Intervention effectiveness (did nudges help?)
 *   - Prediction accuracy (were state assessments correct?)
 *   - User patterns (what works for this specific human?)
 *   - Calibration (adjust confidence based on track record)
 *
 * @module cynic/lib/learning-loop
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI, PHI_INV, PHI_INV_2, PHI_INV_3 } = phiMath;

// =============================================================================
// CONSTANTS (φ-derived)
// =============================================================================

/** Initial accuracy assumption */
const INITIAL_ACCURACY = PHI_INV; // ~61.8%

/** Min samples before calibration adjusts confidence */
const MIN_SAMPLES_CALIBRATION = Math.round(PHI * 5); // 8 samples

/** Learning rate for accuracy updates */
const LEARNING_RATE = PHI_INV_3; // ~23.6%

/** Decay rate for old observations per day */
const OBSERVATION_DECAY = PHI_INV_2; // ~38.2%

/** Confidence boost from correct prediction */
const CONFIDENCE_BOOST = PHI_INV_3; // ~23.6%

/** Confidence penalty from wrong prediction */
const CONFIDENCE_PENALTY = PHI_INV_2; // ~38.2%

/** Max accuracy achievable */
const MAX_ACCURACY = PHI_INV; // 61.8% (φ distrusts φ)

/** Time window for recent observations (hours) */
const RECENT_WINDOW_HOURS = Math.round(PHI * 24); // ~39 hours

// =============================================================================
// STORAGE
// =============================================================================

const LEARNING_DIR = path.join(os.homedir(), '.cynic', 'learning');
const CALIBRATION_FILE = path.join(LEARNING_DIR, 'calibration.json');
const OBSERVATIONS_FILE = path.join(LEARNING_DIR, 'observations.jsonl');
const PATTERNS_FILE = path.join(LEARNING_DIR, 'user-patterns.json');

// =============================================================================
// STATE
// =============================================================================

const learningState = {
  // Calibration data
  calibration: {
    // Per-module accuracy tracking
    psychology: { correct: 0, total: 0, accuracy: INITIAL_ACCURACY },
    biases: { correct: 0, total: 0, accuracy: INITIAL_ACCURACY },
    topology: { correct: 0, total: 0, accuracy: INITIAL_ACCURACY },
    interventions: { correct: 0, total: 0, accuracy: INITIAL_ACCURACY },

    // Overall system accuracy
    overall: { correct: 0, total: 0, accuracy: INITIAL_ACCURACY },

    // Confidence multiplier (adjusts all confidence values)
    confidenceMultiplier: 1.0,
  },

  // User-specific patterns
  userPatterns: {
    // Time patterns
    productiveHours: [], // Hours when user is most productive
    lowEnergyHours: [], // Hours when user typically has low energy

    // Preference patterns
    preferredBreakDuration: null,
    preferredSessionLength: null,
    responseToNudges: {}, // nudge_type -> response_rate

    // Skill patterns
    strongSkills: [],
    growingSkills: [],
  },

  // Recent observations (for trend analysis)
  recentObservations: [],

  // Stats
  stats: {
    totalObservations: 0,
    totalCorrect: 0,
    calibrationUpdates: 0,
    lastCalibration: null,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(LEARNING_DIR)) {
    fs.mkdirSync(LEARNING_DIR, { recursive: true });
  }
}

function loadCalibration() {
  ensureDir();
  if (!fs.existsSync(CALIBRATION_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveCalibration() {
  ensureDir();
  fs.writeFileSync(CALIBRATION_FILE, JSON.stringify({
    calibration: learningState.calibration,
    stats: learningState.stats,
    updatedAt: Date.now(),
  }, null, 2));
}

function loadUserPatterns() {
  ensureDir();
  if (!fs.existsSync(PATTERNS_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveUserPatterns() {
  ensureDir();
  fs.writeFileSync(PATTERNS_FILE, JSON.stringify({
    userPatterns: learningState.userPatterns,
    updatedAt: Date.now(),
  }, null, 2));
}

function appendObservation(observation) {
  ensureDir();
  const line = JSON.stringify({ ...observation, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(OBSERVATIONS_FILE, line);
}

// =============================================================================
// CALIBRATION FUNCTIONS
// =============================================================================

/**
 * Update accuracy for a module based on outcome
 * @param {string} module - Module name (psychology, biases, topology, interventions)
 * @param {boolean} correct - Whether prediction/intervention was correct
 */
function updateModuleAccuracy(module, correct) {
  const cal = learningState.calibration[module];
  if (!cal) return;

  cal.total++;
  if (correct) cal.correct++;

  // Update accuracy with exponential moving average
  const newAccuracy = cal.correct / cal.total;
  cal.accuracy = cal.accuracy * (1 - LEARNING_RATE) + newAccuracy * LEARNING_RATE;

  // Cap at max
  cal.accuracy = Math.min(MAX_ACCURACY, cal.accuracy);

  // Update overall
  const overall = learningState.calibration.overall;
  overall.total++;
  if (correct) overall.correct++;
  overall.accuracy = overall.accuracy * (1 - LEARNING_RATE) +
    (overall.correct / overall.total) * LEARNING_RATE;
  overall.accuracy = Math.min(MAX_ACCURACY, overall.accuracy);

  // Update stats
  learningState.stats.totalObservations++;
  if (correct) learningState.stats.totalCorrect++;
}

/**
 * Recalibrate confidence multiplier based on track record
 */
function recalibrateConfidence() {
  const overall = learningState.calibration.overall;

  // Need enough samples
  if (overall.total < MIN_SAMPLES_CALIBRATION) return;

  // Calculate new multiplier based on accuracy
  // If accuracy > 50%, increase confidence; if < 50%, decrease
  const accuracyDelta = overall.accuracy - 0.5;

  if (accuracyDelta > 0) {
    // Good track record - slight confidence boost
    learningState.calibration.confidenceMultiplier = Math.min(
      1.0 + CONFIDENCE_BOOST,
      learningState.calibration.confidenceMultiplier + accuracyDelta * CONFIDENCE_BOOST
    );
  } else {
    // Poor track record - reduce confidence
    learningState.calibration.confidenceMultiplier = Math.max(
      PHI_INV_2, // Never go below ~38.2%
      learningState.calibration.confidenceMultiplier + accuracyDelta * CONFIDENCE_PENALTY
    );
  }

  learningState.stats.calibrationUpdates++;
  learningState.stats.lastCalibration = Date.now();

  saveCalibration();
}

/**
 * Apply calibration to a confidence value
 * @param {number} rawConfidence - Raw confidence value
 * @returns {number} Calibrated confidence
 */
function calibrateConfidence(rawConfidence) {
  return Math.min(
    MAX_ACCURACY,
    rawConfidence * learningState.calibration.confidenceMultiplier
  );
}

// =============================================================================
// PATTERN LEARNING
// =============================================================================

/**
 * Learn user productivity patterns from observations
 * @param {Object} observation - Observation data
 */
function learnProductivityPattern(observation) {
  const hour = new Date(observation.timestamp).getHours();

  if (observation.type === 'high_productivity') {
    if (!learningState.userPatterns.productiveHours.includes(hour)) {
      learningState.userPatterns.productiveHours.push(hour);
      // Keep sorted and unique
      learningState.userPatterns.productiveHours =
        [...new Set(learningState.userPatterns.productiveHours)].sort((a, b) => a - b);
    }
  } else if (observation.type === 'low_energy') {
    if (!learningState.userPatterns.lowEnergyHours.includes(hour)) {
      learningState.userPatterns.lowEnergyHours.push(hour);
      learningState.userPatterns.lowEnergyHours =
        [...new Set(learningState.userPatterns.lowEnergyHours)].sort((a, b) => a - b);
    }
  }

  saveUserPatterns();
}

/**
 * Learn user response patterns to interventions
 * @param {string} nudgeType - Type of nudge
 * @param {string} response - User response (acknowledged, ignored, dismissed)
 */
function learnNudgeResponse(nudgeType, response) {
  const responses = learningState.userPatterns.responseToNudges[nudgeType] || {
    total: 0,
    acknowledged: 0,
  };

  responses.total++;
  if (response === 'acknowledged') {
    responses.acknowledged++;
  }

  learningState.userPatterns.responseToNudges[nudgeType] = responses;
  saveUserPatterns();
}

/**
 * Get user preference for a nudge type
 * @param {string} nudgeType - Type of nudge
 * @returns {number} Preference score (0-1, higher = user responds well)
 */
function getNudgePreference(nudgeType) {
  const responses = learningState.userPatterns.responseToNudges[nudgeType];
  if (!responses || responses.total < 3) return PHI_INV; // Default neutral

  return responses.acknowledged / responses.total;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize learning loop
 */
function init() {
  ensureDir();

  const savedCalibration = loadCalibration();
  if (savedCalibration) {
    learningState.calibration = savedCalibration.calibration || learningState.calibration;
    learningState.stats = savedCalibration.stats || learningState.stats;
  }

  const savedPatterns = loadUserPatterns();
  if (savedPatterns) {
    learningState.userPatterns = savedPatterns.userPatterns || learningState.userPatterns;
  }
}

/**
 * Record an observation for learning
 * @param {Object} observation - Observation data
 */
function recordObservation(observation) {
  const {
    module,
    prediction,
    actual,
    correct = prediction === actual,
    type,
    data = {},
  } = observation;

  // Update module accuracy
  if (module) {
    updateModuleAccuracy(module, correct);
  }

  // Learn patterns
  if (type) {
    learnProductivityPattern({ type, timestamp: Date.now(), ...data });
  }

  // Track recent observations
  learningState.recentObservations.push({
    ...observation,
    timestamp: Date.now(),
    correct,
  });

  // Keep recent window bounded
  const cutoff = Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000;
  learningState.recentObservations = learningState.recentObservations.filter(
    o => o.timestamp > cutoff
  );

  // Append to log
  appendObservation({ ...observation, correct });

  // Periodic recalibration
  if (learningState.stats.totalObservations % MIN_SAMPLES_CALIBRATION === 0) {
    recalibrateConfidence();
  }

  saveCalibration();
}

/**
 * Record intervention outcome
 * @param {string} interventionType - Type of intervention
 * @param {string} response - User response
 * @param {boolean} helped - Did it actually help? (optional, inferred later)
 */
function recordInterventionOutcome(interventionType, response, helped = null) {
  // Learn response pattern
  learnNudgeResponse(interventionType, response);

  // If we know whether it helped, update accuracy
  if (helped !== null) {
    updateModuleAccuracy('interventions', helped);
    saveCalibration();
  }
}

/**
 * Record psychology prediction outcome
 * @param {string} prediction - What CYNIC predicted (e.g., 'burnout_risk')
 * @param {boolean} correct - Was it correct?
 */
function recordPsychologyOutcome(prediction, correct) {
  recordObservation({
    module: 'psychology',
    prediction,
    correct,
  });
}

/**
 * Record bias detection outcome
 * @param {string} bias - Detected bias
 * @param {boolean} correct - Was it actually a bias?
 */
function recordBiasOutcome(bias, correct) {
  recordObservation({
    module: 'biases',
    prediction: bias,
    correct,
  });
}

/**
 * Get calibration data for a module
 * @param {string} module - Module name
 * @returns {Object} Calibration data
 */
function getModuleCalibration(module) {
  return learningState.calibration[module] || {
    accuracy: INITIAL_ACCURACY,
    total: 0,
    correct: 0,
  };
}

/**
 * Get overall calibration data
 * @returns {Object} Calibration data
 */
function getCalibration() {
  return {
    ...learningState.calibration,
    confidenceMultiplier: learningState.calibration.confidenceMultiplier,
    stats: learningState.stats,
  };
}

/**
 * Get learned user patterns
 * @returns {Object} User patterns
 */
function getUserPatterns() {
  return { ...learningState.userPatterns };
}

/**
 * Check if current hour is typically productive for user
 * @returns {boolean|null} True if productive, false if low energy, null if unknown
 */
function isProductiveHour() {
  const hour = new Date().getHours();

  if (learningState.userPatterns.productiveHours.includes(hour)) {
    return true;
  }
  if (learningState.userPatterns.lowEnergyHours.includes(hour)) {
    return false;
  }
  return null;
}

/**
 * Get recent accuracy trend
 * @returns {string} 'improving' | 'declining' | 'stable'
 */
function getAccuracyTrend() {
  const recent = learningState.recentObservations;
  if (recent.length < 10) return 'stable';

  // Compare first half vs second half
  const mid = Math.floor(recent.length / 2);
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);

  const firstAccuracy = firstHalf.filter(o => o.correct).length / firstHalf.length;
  const secondAccuracy = secondHalf.filter(o => o.correct).length / secondHalf.length;

  const diff = secondAccuracy - firstAccuracy;
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}

/**
 * Export learning data for persistence
 * @returns {Object} Learning data for export
 */
function exportLearningData() {
  return {
    calibration: learningState.calibration,
    userPatterns: learningState.userPatterns,
    stats: learningState.stats,
    recentObservations: learningState.recentObservations.slice(-50),
    exportedAt: Date.now(),
  };
}

/**
 * Import learning data from persistence
 * @param {Object} data - Learning data to import
 */
function importLearningData(data) {
  if (data.calibration) {
    learningState.calibration = {
      ...learningState.calibration,
      ...data.calibration,
    };
  }
  if (data.userPatterns) {
    learningState.userPatterns = {
      ...learningState.userPatterns,
      ...data.userPatterns,
    };
  }
  if (data.stats) {
    learningState.stats = {
      ...learningState.stats,
      ...data.stats,
    };
  }

  saveCalibration();
  saveUserPatterns();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  INITIAL_ACCURACY,
  MIN_SAMPLES_CALIBRATION,
  LEARNING_RATE,
  MAX_ACCURACY,

  // Core functions
  init,
  recordObservation,
  recordInterventionOutcome,
  recordPsychologyOutcome,
  recordBiasOutcome,
  calibrateConfidence,

  // Getters
  getModuleCalibration,
  getCalibration,
  getUserPatterns,
  isProductiveHour,
  getAccuracyTrend,
  getNudgePreference,

  // Persistence
  exportLearningData,
  importLearningData,

  // For testing
  recalibrateConfidence,
  updateModuleAccuracy,
  learnProductivityPattern,
};
