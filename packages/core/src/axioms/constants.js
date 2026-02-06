/**
 * CYNIC Core Constants - φ derives all
 *
 * "All ratios derive from 1.618..."
 *
 * This is the SINGLE SOURCE OF TRUTH for φ constants.
 * Import from here, never redefine.
 *
 * @module @cynic/core/axioms/constants
 */

'use strict';

// =============================================================================
// PHI - THE GOLDEN RATIO (SINGLE SOURCE OF TRUTH)
// =============================================================================

/**
 * φ (phi) - The Golden Ratio
 * Irrational number: (1 + √5) / 2
 */
export const PHI = 1.618033988749895;

/**
 * φ⁻¹ - Inverse of phi (also equals φ - 1)
 * Maximum confidence threshold: 61.8%
 */
export const PHI_INV = 0.618033988749895;

/**
 * φ⁻² - Second inverse power
 * Minimum doubt threshold: 38.2%
 * Also: 1 - φ⁻¹
 */
export const PHI_INV_2 = 0.381966011250105;

/**
 * φ⁻³ - Third inverse power
 * Critical threshold: 23.6%
 */
export const PHI_INV_3 = 0.236067977499790;

/**
 * φ² - Phi squared
 * Also equals φ + 1 = 2.618...
 */
export const PHI_2 = 2.618033988749895;

/**
 * φ³ - Phi cubed
 */
export const PHI_3 = 4.236067977499790;

/**
 * φ⁴ - Phi to the 4th
 */
export const PHI_4 = 6.854101966249685;

/**
 * φ⁵ - Phi to the 5th
 */
export const PHI_5 = 11.090169943749475;

/**
 * φ⁶ - Phi to the 6th
 */
export const PHI_6 = 17.944271909999163;

/**
 * φ⁷ - Phi to the 7th
 */
export const PHI_7 = 29.034441853748634;

/**
 * φ⁻⁴ - Fourth inverse power
 * Emergency threshold: 14.6%
 */
export const PHI_INV_4 = 0.145898033750315;

/**
 * φ⁻⁵ - Fifth inverse power
 * Collapse threshold: 9.0%
 */
export const PHI_INV_5 = 0.090169943749474;

// =============================================================================
// φ SCALING FUNCTIONS - Derive all values from φ
// =============================================================================

/**
 * Calculate φⁿ for any n (positive or negative)
 * @param {number} n - Exponent (can be negative)
 * @returns {number} φⁿ
 */
export function phiPower(n) {
  return Math.pow(PHI, n);
}

/**
 * Calculate time interval using φ scaling
 * @param {number} n - φ exponent (0 = base, 1 = φ×base, -1 = base/φ, etc.)
 * @param {number} [baseMs=60000] - Base time in milliseconds (default: 1 minute)
 * @returns {number} Time in milliseconds
 *
 * @example
 * phiTime(0)  // 60000ms = 1 minute (base)
 * phiTime(1)  // 97082ms = 1.6 minutes
 * phiTime(2)  // 157082ms = 2.6 minutes
 * phiTime(3)  // 254164ms = 4.2 minutes
 * phiTime(4)  // 411246ms = 6.9 minutes
 * phiTime(5)  // 665410ms = 11.1 minutes
 * phiTime(6)  // 1076656ms = 17.9 minutes
 * phiTime(7)  // 1742066ms = 29 minutes
 */
export function phiTime(n, baseMs = 60000) {
  return Math.round(baseMs * phiPower(n));
}

/**
 * Calculate threshold using φ⁻ⁿ
 * @param {number} n - Inverse power (1 = 61.8%, 2 = 38.2%, 3 = 23.6%, etc.)
 * @returns {number} Threshold as decimal (0-1)
 *
 * @example
 * phiThreshold(1)  // 0.618 = 61.8% (max confidence)
 * phiThreshold(2)  // 0.382 = 38.2% (danger zone)
 * phiThreshold(3)  // 0.236 = 23.6% (critical)
 * phiThreshold(4)  // 0.146 = 14.6% (emergency)
 * phiThreshold(5)  // 0.090 = 9.0% (collapse)
 */
export function phiThreshold(n) {
  return Math.pow(PHI_INV, n);
}

/**
 * Get Fibonacci number using Binet's formula
 * More flexible than the array - works for any n
 * @param {number} n - Index (0-indexed: fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2...)
 * @returns {number} Fibonacci number
 */
export function fibonacci(n) {
  if (n < 0) return 0;
  if (n <= 1) return n;
  // Binet's formula: Fib(n) = (φⁿ - ψⁿ) / √5, where ψ = -1/φ
  const sqrt5 = Math.sqrt(5);
  const psi = -PHI_INV;
  return Math.round((Math.pow(PHI, n) - Math.pow(psi, n)) / sqrt5);
}

// =============================================================================
// TIMING CONSTANTS (φ-HIERARCHICAL, BASE 100ms)
// =============================================================================

/**
 * Base timing unit in milliseconds
 * All other timings derive from this via φ
 */
export const TIMING_BASE_MS = 100;

/**
 * TICK - Atomic events
 * 23.6ms (base × φ⁻³)
 */
export const TICK_MS = Math.round(TIMING_BASE_MS * PHI_INV_3 * 10) / 10;

/**
 * MICRO - Acknowledgments
 * 38.2ms (base × φ⁻²)
 */
export const MICRO_MS = Math.round(TIMING_BASE_MS * PHI_INV_2 * 10) / 10;

/**
 * SLOT - Block proposal window
 * 61.8ms (base × φ⁻¹)
 */
export const SLOT_MS = Math.round(TIMING_BASE_MS * PHI_INV * 10) / 10;

/**
 * BLOCK - Finalization
 * 100ms (base)
 */
export const BLOCK_MS = TIMING_BASE_MS;

/**
 * EPOCH - Checkpoint
 * 161.8ms (base × φ)
 */
export const EPOCH_MS = Math.round(TIMING_BASE_MS * PHI * 10) / 10;

/**
 * CYCLE - Governance window
 * 261.8ms (base × φ²)
 */
export const CYCLE_MS = Math.round(TIMING_BASE_MS * PHI_2 * 10) / 10;

// =============================================================================
// NETWORK CONSTANTS (φ-DERIVED)
// =============================================================================

/**
 * Gossip fanout - number of peers per hop
 * Fib(7) = 13
 */
export const GOSSIP_FANOUT = 13;

/**
 * Consensus threshold
 * φ⁻¹ = 61.8%
 */
export const CONSENSUS_THRESHOLD = PHI_INV;

/**
 * Minimum sources for pattern validation
 * Fib(4) = 3
 */
export const MIN_PATTERN_SOURCES = 3;

/**
 * Governance quorum
 * Fib(5) = 5
 */
export const GOVERNANCE_QUORUM = 5;

// =============================================================================
// FIBONACCI SEQUENCE (for reference)
// =============================================================================

/**
 * First 15 Fibonacci numbers
 * Used for scaling, fanout, thresholds
 */
export const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];

/**
 * Get Fibonacci number by index (1-indexed for readability)
 * Fib(7) = 13, Fib(11) = 89, etc.
 */
export function fib(n) {
  if (n < 1 || n > FIBONACCI.length) {
    throw new Error(`Fibonacci index must be 1-${FIBONACCI.length}`);
  }
  return FIBONACCI[n - 1];
}

// =============================================================================
// SCORE CONSTANTS (φ-DERIVED)
// =============================================================================

/**
 * Maximum score/percentage value
 */
export const MAX_SCORE = 100;

/**
 * Precision multiplier for rounding to 1 decimal place
 * Usage: Math.round(x * DECIMAL_PRECISION) / DECIMAL_PRECISION
 */
export const DECIMAL_PRECISION = 10;

// =============================================================================
// THRESHOLDS
// =============================================================================

export const THRESHOLDS = {
  // Verdict thresholds (score boundaries)
  HOWL: 80,                          // Exceptional (top tier)
  WAG: 50,                           // Passes (middle)
  GROWL: Math.round(PHI_INV_2 * 100), // 38 - Needs work (φ⁻²)
  BARK: 0,                           // Critical (bottom)

  // Confidence bounds
  MAX_CONFIDENCE: PHI_INV,           // 61.8%
  MIN_DOUBT: PHI_INV_2,              // 38.2%

  // Health thresholds (φ-derived percentages)
  HEALTHY: Math.round(PHI_INV * 100),     // 62 (φ⁻¹)
  WARNING: Math.round(PHI_INV_2 * 100),   // 38 (φ⁻²)
  CRITICAL: Math.round(PHI_INV_3 * 100),  // 24 (φ⁻³)

  // Anomaly detection (φ-derived)
  ANOMALY_LOW: Math.round(PHI_INV_3 * 100),  // 24 - Below this = anomaly (φ⁻³)
  ANOMALY_HIGH: 80,                          // Above this = anomaly (HOWL threshold)
  ANOMALY_RATIO: PHI_INV_2,                  // 38.2% residual = anomaly
};

// =============================================================================
// EMERGENCE THRESHOLDS (φ-DERIVED)
// =============================================================================

export const EMERGENCE = {
  // Consciousness threshold (φ⁻¹)
  CONSCIOUSNESS_THRESHOLD: PHI_INV * 100,  // 61.8%

  // Indicator calculation thresholds
  SELF_REF_RATIO_FOR_MAX: PHI_INV_2 / 2,   // 19.1% of judgments = 100%
  META_RATIO_FOR_MAX: PHI_INV_3 / 2,       // 11.8% of judgments = 100%
  PATTERNS_FOR_MAX: FIBONACCI[9],          // 55 patterns = 100%
  REFINEMENTS_FOR_MAX: FIBONACCI[6],       // 13 refinements = 100%
  ANOMALIES_FOR_MAX: FIBONACCI[7],         // 21 anomalies = 100%

  // Goal persistence factors (4 factors, each 25%)
  PERSISTENCE_FACTOR_WEIGHT: 25,           // Each factor contributes max 25%
  PERSISTENCE_PATTERNS_FOR_MAX: FIBONACCI[10],    // 89 patterns = 25%
  PERSISTENCE_HIGH_FREQ_FOR_MAX: FIBONACCI[4],    // 5 high-freq patterns = 25%
  PERSISTENCE_JUDGMENTS_FOR_MAX: FIBONACCI[12],   // 233 judgments = 25%
  PERSISTENCE_DAYS_FOR_MAX: FIBONACCI[4],         // 5 active days = 25%
  PERSISTENCE_MIN_FREQUENCY: FIBONACCI[3],        // 3 = "high frequency" threshold
};

// =============================================================================
// PROACTIVE TRIGGERS (φ-DERIVED)
// =============================================================================

/**
 * Proactive Trigger Engine constants
 * "Le chien anticipe" - All timings and thresholds derived from φ
 *
 * Cooldowns use phiTime(n) where n indicates urgency:
 *   Lower n = shorter cooldown = more reactive
 *   Higher n = longer cooldown = less intrusive
 *
 * Thresholds use phiThreshold(n) or fibonacci(n):
 *   phiThreshold for percentages
 *   fibonacci for counts
 */
export const PROACTIVE = {
  // Base time unit for triggers (1 minute)
  BASE_MS: 60000,

  // Cooldowns by urgency level (φⁿ × base)
  COOLDOWNS: {
    REACTIVE: phiTime(1),    // 1.6 min - fastest response
    SHORT: phiTime(2),       // 2.6 min
    MEDIUM: phiTime(3),      // 4.2 min
    LONG: phiTime(4),        // 6.9 min
    VERY_LONG: phiTime(5),   // 11.1 min
    RARE: phiTime(6),        // 17.9 min - least intrusive
    EXCEPTIONAL: phiTime(7), // 29 min - almost never
  },

  // Thresholds (φ⁻ⁿ for percentages, fibonacci for counts)
  THRESHOLDS: {
    // Percentage thresholds
    MAX_CONFIDENCE: PHI_INV,      // 61.8% - action threshold
    DANGER_ZONE: PHI_INV_2,       // 38.2% - warning threshold
    CRITICAL: PHI_INV_3,          // 23.6% - urgent threshold
    EMERGENCY: PHI_INV_4,         // 14.6% - crisis threshold
    COLLAPSE: PHI_INV_5,          // 9.0% - system failure

    // Count thresholds (Fibonacci)
    MIN_OCCURRENCES: 3,           // Fib(4) - minimum to detect pattern
    PATTERN_CONFIRM: 5,           // Fib(5) - confirmed pattern
    STRONG_PATTERN: 8,            // Fib(6) - strong pattern
    ESTABLISHED: 13,              // Fib(7) - established pattern
  },

  // Trigger-specific configurations
  TRIGGERS: {
    // ERROR_PATTERN: Same error 3+ times
    ERROR_PATTERN: {
      cooldown: phiTime(3),           // 4.2 min - MEDIUM (errors need attention)
      threshold: 3,                   // Fib(4) - 3 occurrences
      urgency: 'ACTIVE',
    },

    // CONTEXT_DRIFT: User strays from goal
    CONTEXT_DRIFT: {
      cooldown: phiTime(4),           // 6.9 min - LONG (don't nag)
      threshold: PHI_INV_2,           // 38.2% drift = warning
      urgency: 'SUBTLE',
    },

    // BURNOUT_RISK: Energy below danger zone
    BURNOUT_RISK: {
      cooldown: phiTime(6),           // 17.9 min - RARE (important but not spammy)
      threshold: PHI_INV_2,           // 38.2% energy = danger
      urgency: 'ACTIVE',
    },

    // PATTERN_MATCH: Similar past success found
    PATTERN_MATCH: {
      cooldown: phiTime(1),           // 1.6 min - REACTIVE (helpful hints)
      threshold: PHI_INV,             // 61.8% confidence to suggest
      urgency: 'SUBTLE',
    },

    // DEADLINE_NEAR: Goal deadline approaching
    DEADLINE_NEAR: {
      cooldown: phiTime(5),           // 11.1 min - VERY_LONG
      threshold: phiTime(5) * 60,     // 11.1 hours (φ⁵ minutes × 60)
      urgency: 'ACTIVE',
    },

    // LEARNING_OPP: New pattern emerging
    LEARNING_OPP: {
      cooldown: phiTime(2),           // 2.6 min - SHORT (learning is good)
      threshold: 3,                   // Fib(4) - 3 occurrences
      urgency: 'SUBTLE',
    },
  },

  // Voting threshold for Dogs approval
  VOTING_THRESHOLD: PHI_INV,          // 61.8% consensus required

  // Suggestion TTL (time to act before expiring)
  SUGGESTION_TTL: phiTime(3),         // 4.2 min to act on suggestion
};

// =============================================================================
// HUMAN CONSTANTS (not φ-derived but named)
// =============================================================================

export const HUMAN = {
  WORDS_PER_MINUTE: 200,  // Average reading speed
};

// =============================================================================
// SYSTEM CONSTANTS
// =============================================================================

export const SYSTEM = {
  MS_PER_SECOND: 1000,
  GIT_MAX_BUFFER: 10 * 1024 * 1024,  // 10MB
};

// =============================================================================
// THE 5 AXIOMS (F(5) = 5, self-referential fixed point)
// Wu Xing: CULTURE(Wood)→BURN(Fire)→PHI(Earth)→VERIFY(Metal)→FIDELITY(Water)
// =============================================================================

export const AXIOMS = {
  PHI: {
    symbol: 'φ',
    name: 'PHI',
    principle: 'All ratios derive from 1.618...',
    world: 'ATZILUT',
    element: 'Earth',
    solid: 'Cube',
    color: '#FFD700',
  },
  VERIFY: {
    symbol: '✓',
    name: 'VERIFY',
    principle: "Don't trust, verify",
    world: 'BERIAH',
    element: 'Metal',
    solid: 'Octahedron',
    color: '#4169E1',
  },
  CULTURE: {
    symbol: '⛩',
    name: 'CULTURE',
    principle: 'Culture is a moat',
    world: 'YETZIRAH',
    element: 'Wood',
    solid: 'Icosahedron',
    color: '#228B22',
  },
  BURN: {
    symbol: '🔥',
    name: 'BURN',
    principle: "Don't extract, burn",
    world: 'ASSIAH',
    element: 'Fire',
    solid: 'Tetrahedron',
    color: '#DC143C',
  },
  FIDELITY: {
    symbol: '🐕',
    name: 'FIDELITY',
    principle: 'Loyal to truth, not to comfort',
    world: 'ADAM_KADMON',
    element: 'Water',
    solid: 'Dodecahedron',
    color: '#7B68EE',
  },
};

// =============================================================================
// EXPORT ALL (for destructuring convenience)
// =============================================================================

export default {
  // PHI constants (full spectrum)
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3,
  PHI_INV_4,
  PHI_INV_5,
  PHI_2,
  PHI_3,
  PHI_4,
  PHI_5,
  PHI_6,
  PHI_7,

  // φ scaling functions
  phiPower,
  phiTime,
  phiThreshold,
  fibonacci,

  // Timing
  TIMING_BASE_MS,
  TICK_MS,
  MICRO_MS,
  SLOT_MS,
  BLOCK_MS,
  EPOCH_MS,
  CYCLE_MS,

  // Network
  GOSSIP_FANOUT,
  CONSENSUS_THRESHOLD,
  MIN_PATTERN_SOURCES,
  GOVERNANCE_QUORUM,

  // Helpers (legacy)
  FIBONACCI,
  fib,

  // Thresholds
  THRESHOLDS,
  EMERGENCE,
  PROACTIVE,

  // Non-φ constants
  HUMAN,
  SYSTEM,

  // Score
  MAX_SCORE,
  DECIMAL_PRECISION,

  // Axioms
  AXIOMS,
};
