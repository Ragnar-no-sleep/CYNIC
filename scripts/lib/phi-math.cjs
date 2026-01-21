/**
 * CYNIC φ-Mathematics Library
 *
 * "φ guides all ratios" - κυνικός
 *
 * Harmonic calculations based on the Golden Ratio.
 *
 * @module cynic/lib/phi-math
 */

'use strict';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Golden Ratio */
const PHI = 1.618033988749895;

/** φ⁻¹ = 0.618... */
const PHI_INV = 1 / PHI;

/** φ⁻² = 0.382... */
const PHI_INV_2 = PHI_INV * PHI_INV;

/** φ⁻³ = 0.236... */
const PHI_INV_3 = PHI_INV_2 * PHI_INV;

/** Fibonacci sequence (first 20) */
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

// =============================================================================
// COMPLETION THRESHOLDS
// =============================================================================

const THRESHOLDS = {
  MINIMUM_VIABLE: PHI_INV_2,  // 38.2% - Can stop with warning
  SATISFACTORY: PHI_INV,       // 61.8% - Clean stop allowed
  EXCELLENT: PHI_INV + PHI_INV_3, // 85.4% - Bonus recognition
  PERFECT: 1.0,
};

// =============================================================================
// EFFORT MAPPING (Fibonacci)
// =============================================================================

const EFFORT_MAP = {
  trivial: 1,   // F(1)
  small: 2,     // F(3)
  medium: 3,    // F(4)
  large: 5,     // F(5)
  xl: 8,        // F(6)
  epic: 13,     // F(7)
};

/**
 * Get effort points from label
 * @param {string} label - Effort label (trivial, small, medium, large, xl, epic)
 * @returns {number} Fibonacci effort points
 */
function getEffort(label) {
  return EFFORT_MAP[label?.toLowerCase()] || 3; // Default to medium
}

/**
 * Get closest Fibonacci number
 * @param {number} n - Input number
 * @returns {number} Closest Fibonacci number
 */
function nearestFibonacci(n) {
  let closest = FIBONACCI[0];
  let minDiff = Math.abs(n - closest);

  for (const fib of FIBONACCI) {
    const diff = Math.abs(n - fib);
    if (diff < minDiff) {
      minDiff = diff;
      closest = fib;
    }
    if (fib > n * 2) break; // Optimization
  }

  return closest;
}

// =============================================================================
// PRIORITY CALCULATION (Harmonic)
// =============================================================================

/**
 * Calculate harmonic priority score
 *
 * Priority = (Urgency^φ × Impact^φ⁻¹ × Dependency^φ⁻²) ^ (1/3)
 *
 * @param {Object} params - Priority parameters
 * @param {number} params.urgency - Time sensitivity (0-100)
 * @param {number} params.impact - Effect on ecosystem (0-100)
 * @param {number} params.dependency - How many tasks depend on this (0-100)
 * @returns {number} Priority score (0-100)
 */
function calculatePriority({ urgency = 50, impact = 50, dependency = 0 }) {
  // Normalize inputs to 0-1
  const u = Math.max(0, Math.min(100, urgency)) / 100;
  const i = Math.max(0, Math.min(100, impact)) / 100;
  const d = Math.max(0, Math.min(100, dependency)) / 100;

  // Apply φ weights
  const weightedU = Math.pow(u + 0.01, PHI);       // +0.01 to avoid 0^x
  const weightedI = Math.pow(i + 0.01, PHI_INV);
  const weightedD = Math.pow(d + 0.01, PHI_INV_2);

  // Geometric mean
  const priority = Math.pow(weightedU * weightedI * weightedD, 1/3);

  // Scale back to 0-100
  return Math.round(priority * 100);
}

/**
 * Calculate priority from GitHub issue
 * @param {Object} issue - GitHub issue
 * @returns {number} Priority score (0-100)
 */
function calculateIssuePriority(issue) {
  const labels = issue.labels?.map(l => l.name || l) || [];

  // Extract urgency from labels
  let urgency = 50;
  if (labels.includes('priority:critical') || labels.includes('P0')) urgency = 100;
  else if (labels.includes('priority:high') || labels.includes('P1')) urgency = 80;
  else if (labels.includes('priority:medium') || labels.includes('P2')) urgency = 50;
  else if (labels.includes('priority:low') || labels.includes('P3')) urgency = 20;

  // Extract impact from labels
  let impact = 50;
  if (labels.includes('impact:critical')) impact = 100;
  else if (labels.includes('impact:high')) impact = 80;
  else if (labels.includes('impact:medium')) impact = 50;
  else if (labels.includes('impact:low')) impact = 20;

  // Dependency count (estimate from linked issues/PRs)
  const dependency = (issue.linked_issues?.length || 0) * 10;

  return calculatePriority({ urgency, impact, dependency });
}

// =============================================================================
// HARMONY CALCULATION
// =============================================================================

/**
 * Calculate task harmony score
 *
 * Measures how close the completion ratio is to φ⁻¹ (61.8%)
 * Perfect harmony = 1.0 when ratio = 61.8%
 *
 * @param {Object} params - Harmony parameters
 * @param {number} params.completed - Number of completed tasks
 * @param {number} params.total - Total number of tasks
 * @returns {number} Harmony score (0-1)
 */
function calculateHarmony({ completed, total }) {
  if (total === 0) return 1; // No tasks = perfect harmony

  const ratio = completed / total;

  // Distance from φ⁻¹
  const distance = Math.abs(ratio - PHI_INV);

  // Harmony decreases with distance from φ⁻¹
  // Max distance is max(PHI_INV, 1 - PHI_INV) ≈ 0.618
  const maxDistance = Math.max(PHI_INV, 1 - PHI_INV);
  const harmony = 1 - (distance / maxDistance);

  return Math.max(0, Math.min(1, harmony));
}

/**
 * Get harmony interpretation
 * @param {number} harmony - Harmony score (0-1)
 * @returns {Object} Interpretation with emoji and message
 */
function interpretHarmony(harmony) {
  if (harmony >= 0.95) {
    return {
      level: 'excellent',
      emoji: '*tail wag*',
      message: 'Perfect harmony achieved! You\'re working at φ efficiency.',
    };
  }
  if (harmony >= 0.8) {
    return {
      level: 'good',
      emoji: '*ears perk*',
      message: 'Good balance. Tasks are well-distributed.',
    };
  }
  if (harmony >= 0.6) {
    return {
      level: 'moderate',
      emoji: '*sniff*',
      message: 'Moderate harmony. Consider rebalancing priorities.',
    };
  }
  if (harmony >= 0.4) {
    return {
      level: 'poor',
      emoji: '*head tilt*',
      message: 'Task distribution is unbalanced. Review your backlog.',
    };
  }
  return {
    level: 'critical',
    emoji: '*GROWL*',
    message: 'Severe imbalance! Immediate attention needed.',
  };
}

// =============================================================================
// COMPLETION ANALYSIS
// =============================================================================

/**
 * Analyze completion status
 * @param {number} completionRate - Completion rate (0-1)
 * @returns {Object} Analysis with level, can_stop, and message
 */
function analyzeCompletion(completionRate) {
  if (completionRate >= THRESHOLDS.PERFECT) {
    return {
      level: 'perfect',
      can_stop: true,
      emoji: '*tail wag*',
      message: 'All tasks completed! Perfect session.',
    };
  }
  if (completionRate >= THRESHOLDS.EXCELLENT) {
    return {
      level: 'excellent',
      can_stop: true,
      emoji: '*tail wag*',
      message: `Excellent progress (${Math.round(completionRate * 100)}%). Clean stop approved.`,
    };
  }
  if (completionRate >= THRESHOLDS.SATISFACTORY) {
    return {
      level: 'satisfactory',
      can_stop: true,
      emoji: '*sniff*',
      message: `φ-threshold reached (${Math.round(completionRate * 100)}% >= 61.8%). Stop allowed.`,
    };
  }
  if (completionRate >= THRESHOLDS.MINIMUM_VIABLE) {
    return {
      level: 'minimum',
      can_stop: true,
      emoji: '*head tilt*',
      message: `Minimum viable (${Math.round(completionRate * 100)}%). Stopping with warning.`,
      warning: 'Some important tasks may remain incomplete.',
    };
  }
  return {
    level: 'insufficient',
    can_stop: false,
    emoji: '*GROWL*',
    message: `Insufficient progress (${Math.round(completionRate * 100)}% < 38.2%). Continue working.`,
  };
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

/**
 * Generate φ-based recommendations for tasks
 * @param {Array} tasks - Array of task objects with priority and status
 * @returns {Object} Recommendations
 */
function generateRecommendations(tasks) {
  if (!tasks || tasks.length === 0) {
    return {
      immediate: null,
      next: [],
      backlog: [],
      harmony: 1,
      advice: '*tail wag* No tasks pending. Ready for new challenges.',
    };
  }

  // Separate by status
  const pending = tasks.filter(t => t.status !== 'completed');
  const completed = tasks.filter(t => t.status === 'completed');

  // Sort pending by priority
  const sorted = [...pending].sort((a, b) =>
    (b.priority || 50) - (a.priority || 50)
  );

  // Get top φ⁻¹ fraction for focus
  const focusCount = Math.max(1, Math.ceil(sorted.length * PHI_INV));
  const focus = sorted.slice(0, focusCount);
  const backlog = sorted.slice(focusCount);

  // Calculate harmony
  const harmony = calculateHarmony({
    completed: completed.length,
    total: tasks.length,
  });

  const harmonyInfo = interpretHarmony(harmony);

  // Generate advice
  let advice;
  if (focus.length === 0) {
    advice = `${harmonyInfo.emoji} All tasks completed!`;
  } else if (harmony >= 0.9) {
    advice = `${harmonyInfo.emoji} Focus on "${focus[0]?.content || 'top task'}" for maximum impact.`;
  } else if (harmony < 0.5) {
    const toClose = Math.ceil(pending.length * (1 - PHI_INV));
    advice = `${harmonyInfo.emoji} Consider closing ${toClose} low-priority items to restore balance.`;
  } else {
    advice = `${harmonyInfo.emoji} ${harmonyInfo.message}`;
  }

  return {
    immediate: focus[0] || null,
    next: focus.slice(1, 3),
    backlog,
    harmony,
    harmonyLevel: harmonyInfo.level,
    completionRate: completed.length / tasks.length,
    advice,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3,
  FIBONACCI,
  THRESHOLDS,
  EFFORT_MAP,

  // Effort
  getEffort,
  nearestFibonacci,

  // Priority
  calculatePriority,
  calculateIssuePriority,

  // Harmony
  calculateHarmony,
  interpretHarmony,

  // Completion
  analyzeCompletion,

  // Recommendations
  generateRecommendations,
};
