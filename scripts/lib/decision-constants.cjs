#!/usr/bin/env node
/**
 * CYNIC Decision Constants - Unified Threshold Registry
 *
 * "φ distrusts φ" - All thresholds in one place
 *
 * This file centralizes ALL decision thresholds used across CYNIC hooks and libraries.
 * NEVER hardcode magic numbers elsewhere - import from here.
 *
 * @module decision-constants
 */

'use strict';

// =============================================================================
// φ-BASED METAPHYSICAL CONSTANTS
// =============================================================================

/**
 * Golden ratio and its powers - the mathematical foundation
 */
const PHI = {
  // Primary ratios
  PHI: 1.618033988749895,           // φ - golden ratio
  PHI_INV: 0.6180339887498949,      // φ⁻¹ = 1/φ = 61.8% (max confidence)
  PHI_INV_2: 0.3819660112501051,    // φ⁻² = 1/φ² = 38.2% (min doubt)
  PHI_INV_3: 0.2360679774997897,    // φ⁻³ = 1/φ³ = 23.6%

  // Powers
  PHI_SQUARED: 2.618033988749895,   // φ² = 2.618
  PHI_CUBED: 4.23606797749979,      // φ³ = 4.236

  // Scaled
  PHI_100: 161.8033988749895,       // φ × 100 (line count threshold)
  PHI_HOURS: 6.18,                  // φ-scaled hours (scan frequency)

  // Common percentages
  PERCENT_618: 61.8,                // φ⁻¹ as percentage
  PERCENT_382: 38.2,                // φ⁻² as percentage
  PERCENT_236: 23.6,                // φ⁻³ as percentage
};

// =============================================================================
// CONFIDENCE THRESHOLDS
// =============================================================================

/**
 * Confidence levels for decision making
 * Based on φ ratios where possible
 */
const CONFIDENCE = {
  // φ-aligned thresholds
  MAX: PHI.PHI_INV,                 // 0.618 - "φ distrusts φ"
  HIGH: 0.5,                        // General high confidence
  MEDIUM: PHI.PHI_INV_2,            // 0.382 - φ⁻²
  LOW: 0.2,                         // General low confidence
  MIN: 0.1,                         // Minimum useful confidence

  // Specific use cases
  FALLACY_DETECTION: 0.5,           // observe.cjs:457, 939
  BIAS_DETECTION: 0.5,              // observe.cjs:939
  PSYCHOLOGY_DISPLAY: 0.2,          // awaken.cjs:349
  ENTROPY_WARNING: PHI.PHI_INV,     // observe.cjs:958
};

// =============================================================================
// PROBABILITY THRESHOLDS
// =============================================================================

/**
 * Random probability gates for features
 * Used for φ-aligned feature activation
 */
const PROBABILITY = {
  // φ-aligned probabilities
  HIGH: PHI.PHI_INV,                // 0.618 - 61.8% chance
  MEDIUM: PHI.PHI_INV_2,            // 0.382 - 38.2% chance
  LOW: PHI.PHI_INV_3,               // 0.236 - 23.6% chance

  // Specific feature gates
  ELENCHUS: PHI.PHI_INV_2,          // perceive.cjs:369
  CHRIA_WISDOM: PHI.PHI_INV_2,      // perceive.cjs:435
  PHYSIS_CHALLENGE: PHI.PHI_INV_2,  // guard.cjs:453
  ROLE_REVERSAL: PHI.PHI_INV_3,     // perceive.cjs:470
  DELETION_CELEBRATE: PHI.PHI_INV,  // observe.cjs:990
  DOG_HINT: PHI.PHI_INV_3,          // perceive.cjs - hint at Dog emergence
};

// =============================================================================
// TEXT LENGTH THRESHOLDS
// =============================================================================

/**
 * Minimum prompt/text lengths for feature activation
 */
const LENGTH = {
  MIN_PROMPT: 10,                   // perceive.cjs:274 - skip if shorter
  ELENCHUS_MIN: 30,                 // perceive.cjs:346
  TI_ESTI_MIN: 15,                  // perceive.cjs:382
  DEFINITION_MIN: 20,               // perceive.cjs:405
  FALLACY_MIN: 50,                  // perceive.cjs:452
  ROLE_REVERSAL_MIN: 30,            // perceive.cjs:470
  HYPOTHESIS_MIN: 40,               // perceive.cjs:485

  // Code thresholds
  OVER_ENGINEERING: Math.round(PHI.PHI_100), // 162 lines (guard.cjs:430)
  CONTRIBUTOR_PROFILE: 50,          // observe.cjs:913 - lines for enrichment
};

// =============================================================================
// FREQUENCY THRESHOLDS
// =============================================================================

/**
 * Count-based thresholds for patterns and intervals
 */
const FREQUENCY = {
  ERROR_PATTERN_MIN: 3,             // digest.cjs:106 - min occurrences
  BIAS_CHECK_INTERVAL: 5,           // observe.cjs:759 - every N actions
  HARMONY_GAP_MIN: 3,               // observe.cjs:856 - min gaps for insight

  // Time-based
  SCAN_INTERVAL_HOURS: PHI.PHI_HOURS, // awaken.cjs:450-451 - contributor scan
};

// =============================================================================
// QUALITY THRESHOLDS
// =============================================================================

/**
 * Score and quality thresholds
 */
const QUALITY = {
  Q_SCORE_REFINEMENT: 60,           // observe.cjs:1011 - trigger self-critique
  Q_SCORE_MIN: 0,
  Q_SCORE_MAX: 100,

  // Harmony thresholds
  HARMONY_VIOLATION_SEVERITY: ['high', 'medium'], // observe.cjs:841
};

// =============================================================================
// E-SCORE TRUST LEVELS
// =============================================================================

/**
 * Trust level boundaries based on E-Score
 * Derived from φ ratios
 */
const TRUST_LEVELS = {
  GUARDIAN: {
    name: 'GUARDIAN',
    min: PHI.PHI_INV,               // ≥61.8%
    max: 1.0,
    capabilities: ['suggest_agents', 'interventions', 'full_access'],
  },
  STEWARD: {
    name: 'STEWARD',
    min: PHI.PHI_INV_2,             // ≥38.2%
    max: PHI.PHI_INV,
    capabilities: ['tool_access', 'moderate_trust'],
  },
  BUILDER: {
    name: 'BUILDER',
    min: 0.30,
    max: PHI.PHI_INV_2,
    capabilities: ['basic_access', 'limited_tools'],
  },
  CONTRIBUTOR: {
    name: 'CONTRIBUTOR',
    min: 0.15,
    max: 0.30,
    capabilities: ['contribute', 'limited_access'],
  },
  OBSERVER: {
    name: 'OBSERVER',
    min: 0,
    max: 0.15,
    capabilities: ['read_only'],
  },
};

/**
 * Get trust level from E-Score
 * @param {number} eScore - E-Score (0-1)
 * @returns {object} Trust level object
 */
function getTrustLevel(eScore) {
  if (eScore >= TRUST_LEVELS.GUARDIAN.min) return TRUST_LEVELS.GUARDIAN;
  if (eScore >= TRUST_LEVELS.STEWARD.min) return TRUST_LEVELS.STEWARD;
  if (eScore >= TRUST_LEVELS.BUILDER.min) return TRUST_LEVELS.BUILDER;
  if (eScore >= TRUST_LEVELS.CONTRIBUTOR.min) return TRUST_LEVELS.CONTRIBUTOR;
  return TRUST_LEVELS.OBSERVER;
}

// =============================================================================
// RISK SEVERITY LEVELS
// =============================================================================

/**
 * Risk/severity hierarchy for decisions
 */
const SEVERITY = {
  LEVELS: ['low', 'medium', 'high', 'critical'],

  // Numeric weights for comparison
  WEIGHTS: {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  },

  // Decision levels
  DECISION_LEVELS: ['silent', 'allow', 'warn', 'block'],
};

/**
 * Compare two severity levels
 * @param {string} a - First severity
 * @param {string} b - Second severity
 * @returns {number} -1, 0, or 1
 */
function compareSeverity(a, b) {
  const wa = SEVERITY.WEIGHTS[a] || 0;
  const wb = SEVERITY.WEIGHTS[b] || 0;
  return wa - wb;
}

/**
 * Get max severity from array
 * @param {string[]} severities - Array of severity levels
 * @returns {string} Maximum severity
 */
function maxSeverity(severities) {
  return severities.reduce((max, sev) => {
    return compareSeverity(sev, max) > 0 ? sev : max;
  }, 'low');
}

// =============================================================================
// E-SCORE 7D WEIGHTS
// =============================================================================

/**
 * E-Score 7-dimension weights (symmetric around RUN)
 * Total: 3√5 + 4 ≈ 10.708
 */
const E_SCORE_7D = {
  BURN: PHI.PHI_CUBED,              // φ³ = 4.236 - token sacrifice
  BUILD: PHI.PHI_SQUARED,           // φ² = 2.618 - git-signed code
  JUDGE: PHI.PHI,                   // φ = 1.618 - PoJ consensus
  RUN: 1.0,                         // 1 = 1.000 - node uptime (center)
  SOCIAL: PHI.PHI_INV,              // φ⁻¹ = 0.618 - tweet quality
  GRAPH: PHI.PHI_INV_2,             // φ⁻² = 0.382 - trust network
  HOLD: PHI.PHI_INV_3,              // φ⁻³ = 0.236 - token holdings

  // Calculated total
  get TOTAL() {
    return this.BURN + this.BUILD + this.JUDGE + this.RUN +
           this.SOCIAL + this.GRAPH + this.HOLD;
  },
};

// =============================================================================
// ASYNC/SYNC PATTERNS
// =============================================================================

/**
 * Async behavior constants
 */
const ASYNC = {
  // Timeout defaults (ms)
  TIMEOUT_SHORT: 1000,
  TIMEOUT_MEDIUM: 5000,
  TIMEOUT_LONG: 30000,

  // Behavior patterns
  PATTERNS: {
    BLOCKING: 'blocking',           // Must wait for result
    FIRE_AND_FORGET: 'fire_forget', // Don't wait
    BEST_EFFORT: 'best_effort',     // Try, fallback if fails
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Primary constants
  PHI,
  CONFIDENCE,
  PROBABILITY,
  LENGTH,
  FREQUENCY,
  QUALITY,
  SEVERITY,
  TRUST_LEVELS,
  E_SCORE_7D,
  ASYNC,

  // Utility functions
  getTrustLevel,
  compareSeverity,
  maxSeverity,

  // Quick access to common values
  MAX_CONFIDENCE: PHI.PHI_INV,      // 0.618
  MIN_DOUBT: PHI.PHI_INV_2,         // 0.382
  GOLDEN_RATIO: PHI.PHI,            // 1.618
};
