/**
 * CYNIC Intervention Engine Module
 *
 * "Le chien sait quand parler et quand se taire" - κυνικός
 *
 * Decides when and how to intervene based on psychological state,
 * cognitive biases, and topology. Adapts intensity to context.
 *
 * Intensity levels (φ-scaled):
 *   0.000 - Silent observation
 *   0.236 - Subtle hint (φ⁻³)
 *   0.382 - Gentle nudge (φ⁻²)
 *   0.618 - Clear suggestion (φ⁻¹)
 *   1.000 - Strong intervention
 *
 * @module cynic/lib/intervention-engine
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

/** Intensity levels */
const INTENSITY = {
  SILENT: 0,
  HINT: PHI_INV_3,      // ~23.6%
  NUDGE: PHI_INV_2,     // ~38.2%
  SUGGEST: PHI_INV,     // ~61.8%
  STRONG: 1.0,
};

/** Min score to trigger any intervention */
const INTERVENTION_THRESHOLD = PHI_INV_3; // ~23.6%

/** Cooldown between same-type interventions (minutes) */
const INTERVENTION_COOLDOWN_MIN = PHI_INV * 10; // ~6.2 minutes

/** Max interventions per hour */
const MAX_INTERVENTIONS_HOUR = Math.round(PHI * 4); // 6

/** Effectiveness threshold for learning */
const EFFECTIVENESS_THRESHOLD = PHI_INV_2; // ~38.2%

// =============================================================================
// STORAGE
// =============================================================================

const INTERVENTION_DIR = path.join(os.homedir(), '.cynic', 'interventions');
const STATE_FILE = path.join(INTERVENTION_DIR, 'state.json');
const LOG_FILE = path.join(INTERVENTION_DIR, 'log.jsonl');

// =============================================================================
// STATE
// =============================================================================

const engineState = {
  // Recent interventions (for cooldown)
  recentInterventions: [],

  // Intervention effectiveness tracking
  effectiveness: {
    byType: {},
    overall: PHI_INV, // Start at neutral
  },

  // User preferences (learned)
  preferences: {
    preferredIntensity: PHI_INV_2, // Default to nudge level
    dislikedTypes: [],
    effectiveTypes: [],
  },

  // Stats
  stats: {
    totalInterventions: 0,
    acknowledged: 0,
    ignored: 0,
    effectivenessScore: PHI_INV,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(INTERVENTION_DIR)) {
    fs.mkdirSync(INTERVENTION_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveState() {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    recentInterventions: engineState.recentInterventions.slice(-50),
    effectiveness: engineState.effectiveness,
    preferences: engineState.preferences,
    stats: engineState.stats,
    updatedAt: Date.now(),
  }, null, 2));
}

function logIntervention(intervention) {
  ensureDir();
  const line = JSON.stringify({ ...intervention, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(LOG_FILE, line);
}

// =============================================================================
// INTERVENTION SCORING
// =============================================================================

/**
 * Calculate intervention score from multiple inputs
 * @param {Object} inputs - Module inputs
 * @returns {Object} Intervention decision
 */
function calculateIntervention(inputs) {
  const {
    psychology = null,
    biases = [],
    topology = null,
  } = inputs;

  let score = 0;
  const reasons = [];
  let primaryType = null;
  let suggestion = null;

  // Psychology-based scoring
  if (psychology) {
    // Burnout risk - high priority
    if (psychology.composites?.burnoutRisk) {
      score += PHI_INV;
      reasons.push('burnout_risk');
      if (!primaryType) {
        primaryType = 'burnout';
        suggestion = 'Tu travailles depuis longtemps. Une pause serait bénéfique.';
      }
    }

    // High frustration
    if (psychology.dimensions?.frustration?.value > PHI_INV) {
      score += PHI_INV_2;
      reasons.push('high_frustration');
      if (!primaryType) {
        primaryType = 'frustration';
        suggestion = 'Frustration élevée détectée. Peut-être essayer une autre approche?';
      }
    }

    // Low energy
    if (psychology.dimensions?.energy?.value < PHI_INV_3) {
      score += PHI_INV_3;
      reasons.push('low_energy');
      if (!primaryType) {
        primaryType = 'energy';
        suggestion = 'Énergie basse. Pause café?';
      }
    }

    // Procrastination
    if (psychology.composites?.procrastination) {
      score += PHI_INV_2;
      reasons.push('procrastination');
      if (!primaryType) {
        primaryType = 'procrastination';
        suggestion = 'Beaucoup d\'activité, peu de progrès. Quel est le prochain pas concret?';
      }
    }

    // In flow - reduce interventions
    if (psychology.composites?.flow) {
      score *= PHI_INV_3; // Drastically reduce
    }
  }

  // Bias-based scoring
  for (const bias of biases) {
    score += bias.confidence * PHI_INV_2;
    reasons.push(`bias_${bias.bias}`);
    if (!primaryType) {
      primaryType = `bias_${bias.bias}`;
      suggestion = bias.suggestion;
    }
  }

  // Topology-based scoring
  if (topology?.rabbitHole) {
    score += PHI_INV;
    reasons.push('rabbit_hole');
    if (!primaryType) {
      primaryType = 'rabbit_hole';
      suggestion = topology.rabbitHole.suggestion;
    }
  }

  // Adjust for user preferences
  if (engineState.preferences.dislikedTypes.includes(primaryType)) {
    score *= PHI_INV_2; // Reduce if user dislikes this type
  }
  if (engineState.preferences.effectiveTypes.includes(primaryType)) {
    score *= PHI; // Increase if historically effective
  }

  // Cap at 1.0
  score = Math.min(1.0, score);

  return {
    score,
    shouldIntervene: score >= INTERVENTION_THRESHOLD,
    intensity: scoreToIntensity(score),
    type: primaryType,
    suggestion,
    reasons,
  };
}

/**
 * Convert score to intensity level
 * @param {number} score - Intervention score (0-1)
 * @returns {string} Intensity level name
 */
function scoreToIntensity(score) {
  if (score < INTENSITY.HINT) return 'silent';
  if (score < INTENSITY.NUDGE) return 'hint';
  if (score < INTENSITY.SUGGEST) return 'nudge';
  if (score < INTENSITY.STRONG) return 'suggest';
  return 'strong';
}

// =============================================================================
// COOLDOWN MANAGEMENT
// =============================================================================

/**
 * Check if intervention type is on cooldown
 * @param {string} type - Intervention type
 * @returns {boolean} True if on cooldown
 */
function isOnCooldown(type) {
  const cooldownMs = INTERVENTION_COOLDOWN_MIN * 60 * 1000;
  const recent = engineState.recentInterventions.find(i =>
    i.type === type && Date.now() - i.timestamp < cooldownMs
  );
  return !!recent;
}

/**
 * Check if we've hit hourly limit
 * @returns {boolean} True if at limit
 */
function atHourlyLimit() {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recentCount = engineState.recentInterventions.filter(i =>
    i.timestamp > hourAgo
  ).length;
  return recentCount >= MAX_INTERVENTIONS_HOUR;
}

// =============================================================================
// INTERVENTION FORMATTING
// =============================================================================

/**
 * Format intervention message in CYNIC voice
 * @param {Object} decision - Intervention decision
 * @returns {string} Formatted message
 */
function formatIntervention(decision) {
  const { intensity, type, suggestion, score } = decision;

  // No intervention
  if (!decision.shouldIntervene) {
    return null;
  }

  // Select emoji/prefix based on intensity
  let prefix;
  switch (intensity) {
    case 'hint':
      prefix = '*sniff*';
      break;
    case 'nudge':
      prefix = '*ears perk*';
      break;
    case 'suggest':
      prefix = '*head tilt*';
      break;
    case 'strong':
      prefix = '*GROWL*';
      break;
    default:
      return null;
  }

  // Build message
  const confidenceStr = Math.round(score * 100);
  let message = `${prefix} ${suggestion}`;

  // Add confidence for higher intensities
  if (intensity === 'suggest' || intensity === 'strong') {
    message += ` (${confidenceStr}% φ-confidence)`;
  }

  return message;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize intervention engine
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    engineState.recentInterventions = saved.recentInterventions || [];
    engineState.effectiveness = saved.effectiveness || engineState.effectiveness;
    engineState.preferences = saved.preferences || engineState.preferences;
    engineState.stats = saved.stats || engineState.stats;
  }

  // Clean old interventions
  const hourAgo = Date.now() - 60 * 60 * 1000;
  engineState.recentInterventions = engineState.recentInterventions.filter(i =>
    i.timestamp > hourAgo
  );
}

/**
 * Evaluate and potentially trigger an intervention
 * @param {Object} inputs - Module inputs (psychology, biases, topology)
 * @returns {Object|null} Intervention or null
 */
function evaluate(inputs) {
  // Calculate intervention
  const decision = calculateIntervention(inputs);

  // Check if should intervene
  if (!decision.shouldIntervene) {
    return null;
  }

  // Check cooldowns
  if (isOnCooldown(decision.type)) {
    return null;
  }

  // Check hourly limit
  if (atHourlyLimit()) {
    return null;
  }

  // Format message
  const message = formatIntervention(decision);
  if (!message) {
    return null;
  }

  // Record intervention
  const intervention = {
    id: `int_${Date.now()}`,
    type: decision.type,
    intensity: decision.intensity,
    score: decision.score,
    reasons: decision.reasons,
    message,
    timestamp: Date.now(),
    acknowledged: false,
  };

  engineState.recentInterventions.push(intervention);
  engineState.stats.totalInterventions++;

  logIntervention(intervention);
  saveState();

  return intervention;
}

/**
 * Record user response to intervention
 * @param {string} interventionId - Intervention ID
 * @param {string} response - User response (acknowledged, ignored, dismissed)
 */
function recordResponse(interventionId, response) {
  const intervention = engineState.recentInterventions.find(i => i.id === interventionId);
  if (!intervention) return;

  intervention.response = response;
  intervention.responseTime = Date.now() - intervention.timestamp;

  // Update stats
  if (response === 'acknowledged') {
    engineState.stats.acknowledged++;
    intervention.acknowledged = true;

    // Mark type as effective
    if (!engineState.preferences.effectiveTypes.includes(intervention.type)) {
      engineState.preferences.effectiveTypes.push(intervention.type);
    }
  } else if (response === 'ignored' || response === 'dismissed') {
    engineState.stats.ignored++;

    // If repeatedly ignored, add to disliked
    const recentSameType = engineState.recentInterventions.filter(i =>
      i.type === intervention.type && i.response === 'ignored'
    );
    if (recentSameType.length >= 3) {
      if (!engineState.preferences.dislikedTypes.includes(intervention.type)) {
        engineState.preferences.dislikedTypes.push(intervention.type);
      }
    }
  }

  // Update effectiveness
  updateEffectiveness();
  saveState();
}

/**
 * Update overall effectiveness score
 */
function updateEffectiveness() {
  const recent = engineState.recentInterventions.slice(-20);
  if (recent.length === 0) return;

  const acknowledged = recent.filter(i => i.acknowledged).length;
  engineState.stats.effectivenessScore = acknowledged / recent.length;

  // Adjust preferred intensity based on effectiveness
  if (engineState.stats.effectivenessScore > EFFECTIVENESS_THRESHOLD) {
    // Effective - can use lighter touch
    engineState.preferences.preferredIntensity = Math.max(
      INTENSITY.HINT,
      engineState.preferences.preferredIntensity - PHI_INV_3
    );
  } else {
    // Not effective - may need stronger interventions
    engineState.preferences.preferredIntensity = Math.min(
      INTENSITY.SUGGEST,
      engineState.preferences.preferredIntensity + PHI_INV_3
    );
  }
}

/**
 * Get engine statistics
 * @returns {Object} Stats
 */
function getStats() {
  return {
    ...engineState.stats,
    recentCount: engineState.recentInterventions.length,
    preferredIntensity: engineState.preferences.preferredIntensity,
    effectiveTypes: engineState.preferences.effectiveTypes,
    dislikedTypes: engineState.preferences.dislikedTypes,
  };
}

/**
 * Manually adjust intervention sensitivity
 * @param {string} direction - 'increase' or 'decrease'
 */
function adjustSensitivity(direction) {
  if (direction === 'increase') {
    engineState.preferences.preferredIntensity = Math.min(
      INTENSITY.STRONG,
      engineState.preferences.preferredIntensity + PHI_INV_3
    );
  } else if (direction === 'decrease') {
    engineState.preferences.preferredIntensity = Math.max(
      INTENSITY.HINT,
      engineState.preferences.preferredIntensity - PHI_INV_3
    );
  }
  saveState();
}

/**
 * Reset intervention preferences (keep stats)
 */
function resetPreferences() {
  engineState.preferences = {
    preferredIntensity: PHI_INV_2,
    dislikedTypes: [],
    effectiveTypes: [],
  };
  saveState();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  INTENSITY,
  INTERVENTION_THRESHOLD,
  INTERVENTION_COOLDOWN_MIN,
  MAX_INTERVENTIONS_HOUR,

  // Core functions
  init,
  evaluate,
  recordResponse,
  getStats,
  adjustSensitivity,
  resetPreferences,

  // Helpers
  calculateIntervention,
  formatIntervention,
  isOnCooldown,
  atHourlyLimit,
  scoreToIntensity,
};
