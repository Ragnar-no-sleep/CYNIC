/**
 * CYNIC Physics Bridge - Concrete Integration Layer
 *
 * "Connects quantum metaphors to real hook decisions"
 *
 * Bridges the 5 PHYSICS engines to actual hook operations:
 * - field-theory     → Decision superposition (probabilistic verdicts)
 * - symmetry-breaking → Dynamic Dog personality emergence
 * - entanglement     → Pattern correlation prediction
 * - relativity       → Multi-perspective evaluation
 * - resonance        → Process harmony detection
 *
 * @module cynic/lib/physics-bridge
 */

'use strict';

const DC = require('./decision-constants.cjs');

// Lazy-load PHYSICS modules (avoid circular deps)
let fieldTheory = null;
let symmetryBreaking = null;
let entanglement = null;
let relativity = null;
let resonance = null;

function loadModules() {
  if (!fieldTheory) {
    try {
      fieldTheory = require('./field-theory.cjs');
      fieldTheory.init();
    } catch (e) {
      console.error('[physics-bridge] field-theory not loaded:', e.message);
    }
  }
  if (!symmetryBreaking) {
    try {
      symmetryBreaking = require('./symmetry-breaking.cjs');
      symmetryBreaking.init();
    } catch (e) {
      console.error('[physics-bridge] symmetry-breaking not loaded:', e.message);
    }
  }
  if (!entanglement) {
    try {
      entanglement = require('./entanglement-engine.cjs');
      entanglement.init();
    } catch (e) {
      console.error('[physics-bridge] entanglement not loaded:', e.message);
    }
  }
  if (!relativity) {
    try {
      relativity = require('./relativity-engine.cjs');
      relativity.init();
    } catch (e) {
      console.error('[physics-bridge] relativity not loaded:', e.message);
    }
  }
  if (!resonance) {
    try {
      resonance = require('./resonance-detector.cjs');
      resonance.init();
    } catch (e) {
      console.error('[physics-bridge] resonance not loaded:', e.message);
    }
  }
}

// =============================================================================
// 1. FIELD THEORY → DECISION SUPERPOSITION
// =============================================================================

/**
 * Create a superposition of possible verdicts before decision
 * Used by decision-engine for probabilistic outcomes
 *
 * @param {string} subject - What we're deciding about
 * @param {Object} context - Decision context
 * @returns {Object} Superposition with possible outcomes
 */
function createDecisionSuperposition(subject, context = {}) {
  loadModules();
  if (!fieldTheory) return null;

  // Map decision severity to verdict probabilities
  const severityWeights = {
    critical: { BLOCK: DC.PHI.PHI_INV, WARN: DC.PHI.PHI_INV_2, ALLOW: DC.PHI.PHI_INV_3 },
    high: { BLOCK: DC.PHI.PHI_INV_2, WARN: DC.PHI.PHI_INV, ALLOW: DC.PHI.PHI_INV_2 },
    medium: { WARN: DC.PHI.PHI_INV, ALLOW: DC.PHI.PHI_INV_2, BLOCK: DC.PHI.PHI_INV_3 },
    low: { ALLOW: DC.PHI.PHI_INV, WARN: DC.PHI.PHI_INV_2, BLOCK: DC.PHI.PHI_INV_3 },
  };

  const weights = severityWeights[context.severity] || severityWeights.medium;

  return fieldTheory.createSuperposition(subject, [
    { state: 'ALLOW', amplitude: Math.sqrt(weights.ALLOW || 0.2) },
    { state: 'WARN', amplitude: Math.sqrt(weights.WARN || 0.4) },
    { state: 'BLOCK', amplitude: Math.sqrt(weights.BLOCK || 0.4) },
  ]);
}

/**
 * Collapse a decision superposition to a concrete verdict
 *
 * @param {string} superpositionId - The superposition to collapse
 * @param {Object} observer - Who/what is observing (the hook)
 * @returns {Object} Collapsed verdict
 */
function collapseDecision(superpositionId, observer = {}) {
  loadModules();
  if (!fieldTheory) return { state: 'ALLOW', probability: 1 };

  return fieldTheory.observe(superpositionId, observer);
}

/**
 * Get field status for decision context
 */
function getFieldStatus() {
  loadModules();
  if (!fieldTheory) return null;
  return fieldTheory.getFieldStatus();
}

// =============================================================================
// 2. SYMMETRY BREAKING → DYNAMIC DOG PERSONALITY
// =============================================================================

/**
 * Process user input to potentially trigger Dog emergence
 * Used by perceive.cjs for dynamic personality
 *
 * @param {string} input - User prompt or input
 * @returns {Object} Symmetry result with potential Dog
 */
function processDogEmergence(input) {
  loadModules();
  if (!symmetryBreaking) return { broken: false, currentDog: null };

  const result = symmetryBreaking.process(input);

  // If symmetry broke, return Dog voice info for hook response
  if (result.broken && result.currentDog) {
    const dog = symmetryBreaking.getDog(result.currentDog);
    return {
      broken: true,
      currentDog: result.currentDog,
      voice: dog?.voice || null,
      traits: dog?.traits || [],
      color: dog?.color || null,
      greeting: result.breakResult?.greeting || null,
    };
  }

  return {
    broken: result.broken,
    currentDog: result.currentDog,
    fieldEnergy: result.totalFieldEnergy,
    nearCritical: result.totalFieldEnergy > symmetryBreaking.CRITICAL_ENERGY * DC.PHI.PHI_INV,
  };
}

/**
 * Get current Dog state
 */
function getCurrentDog() {
  loadModules();
  if (!symmetryBreaking) return null;

  const state = symmetryBreaking.getState();
  if (!state.broken) return null;

  return {
    id: state.currentDog,
    ...state.currentDogInfo,
  };
}

/**
 * Get Dog voice for generating responses
 */
function getDogVoice(dogId = null) {
  loadModules();
  if (!symmetryBreaking) return null;

  const id = dogId || symmetryBreaking.getState().currentDog;
  if (!id) return null;

  const dog = symmetryBreaking.getDog(id);
  return dog?.voice || null;
}

// =============================================================================
// 3. ENTANGLEMENT → PATTERN CORRELATION PREDICTION
// =============================================================================

/**
 * Observe a pattern and get predictions for related patterns
 * Used by observe.cjs for pattern correlation
 *
 * @param {string} pattern - Observed pattern (e.g., "dangerous_command")
 * @param {string} context - Context (e.g., "bash_tool")
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Observation result with predictions
 */
function observePattern(pattern, context, metadata = {}) {
  loadModules();
  if (!entanglement) return { predictions: [] };

  return entanglement.observe(pattern, context, metadata);
}

/**
 * Get predictions for patterns that might appear given current pattern
 *
 * @param {string} pattern - Current pattern
 * @returns {Object[]} Predicted patterns with probabilities
 */
function predictPatterns(pattern) {
  loadModules();
  if (!entanglement) return [];

  const pairs = entanglement.getPairs();
  const predictions = [];

  for (const pair of pairs) {
    if (pair.patterns.includes(pattern)) {
      const other = pair.patterns.find(p => p !== pattern);
      predictions.push({
        pattern: other,
        probability: pair.correlation,
        confidence: Math.min(DC.PHI.PHI_INV, pair.correlation),
        bellViolation: pair.bellValue > entanglement.BELL_CLASSICAL_LIMIT,
      });
    }
  }

  return predictions.sort((a, b) => b.probability - a.probability);
}

/**
 * Record that a prediction came true (for learning)
 */
function confirmPrediction(pattern, occurred = true) {
  loadModules();
  if (!entanglement) return;
  entanglement.recordPrediction(pattern, occurred);
}

/**
 * Test Bell inequality for a pattern pair
 */
function testBellInequality(pattern1, pattern2) {
  loadModules();
  if (!entanglement) return null;

  const pair = entanglement.getPair(pattern1, pattern2);
  if (!pair) return null;

  return entanglement.testBellInequality(pair.id);
}

// =============================================================================
// 4. RELATIVITY → MULTI-PERSPECTIVE EVALUATION
// =============================================================================

/**
 * Evaluate a decision from multiple stakeholder perspectives
 * Used by digest.cjs for comprehensive assessment
 *
 * @param {string} subject - What to evaluate
 * @param {Object} context - Evaluation context
 * @param {string[]} frames - Specific frames to use (or null for active)
 * @returns {Object} Multi-perspective evaluation
 */
function evaluatePerspectives(subject, context = {}, frames = null) {
  loadModules();
  if (!relativity) {
    return {
      evaluations: [],
      conflicts: [],
      consensus: true,
      recommendation: { type: 'unknown', message: 'Relativity engine not loaded' },
    };
  }

  // Add specific frames if requested
  if (frames && Array.isArray(frames)) {
    for (const frame of frames) {
      relativity.addActiveFrame(frame);
    }
  }

  return relativity.evaluateFromAllPerspectives(subject, context);
}

/**
 * Set current perspective frame
 */
function setFrame(frameId) {
  loadModules();
  if (!relativity) return null;
  return relativity.setFrame(frameId);
}

/**
 * Get perspective shift suggestion
 */
function suggestPerspective(context) {
  loadModules();
  if (!relativity) return null;
  return relativity.suggestPerspectiveShift(context);
}

/**
 * Transform assessment between frames
 */
function transformPerspective(assessment, fromFrame, toFrame) {
  loadModules();
  if (!relativity) return assessment;
  return relativity.transformPerspective(assessment, fromFrame, toFrame);
}

// =============================================================================
// 5. RESONANCE → PROCESS HARMONY DETECTION
// =============================================================================

/**
 * Register a process as an oscillator
 * Used by cynic-core for monitoring process harmony
 *
 * @param {string} name - Process name (e.g., "perceive", "guard", "observe")
 * @param {Object} config - Oscillator config
 * @returns {Object} Registered oscillator
 */
function registerProcess(name, config = {}) {
  loadModules();
  if (!resonance) return null;

  return resonance.registerOscillator(name, {
    frequency: config.frequency || 1,
    amplitude: config.amplitude || 50,
    phase: config.phase || 0,
  });
}

/**
 * Record a pulse (activity) from a process
 *
 * @param {string} processName - Which process is active
 * @param {number} strength - Pulse strength (default 1)
 */
function pulseProcess(processName, strength = 1) {
  loadModules();
  if (!resonance) return null;
  return resonance.pulse(processName, strength);
}

/**
 * Check resonance between two processes
 * High resonance = they work well together
 *
 * @param {string} process1 - First process
 * @param {string} process2 - Second process
 * @returns {Object} Resonance analysis
 */
function checkProcessResonance(process1, process2) {
  loadModules();
  if (!resonance) return null;
  return resonance.checkResonance(process1, process2);
}

/**
 * Find all strong resonances in the system
 */
function findSystemResonances(minStrength = DC.PHI.PHI_INV_2) {
  loadModules();
  if (!resonance) return [];
  return resonance.findResonances(minStrength);
}

/**
 * Find resonance chains (indirect harmony paths)
 */
function findResonanceChains() {
  loadModules();
  if (!resonance) return [];
  return resonance.findResonanceChains();
}

/**
 * Get overall system harmony score
 */
function getSystemHarmony() {
  loadModules();
  if (!resonance) return { harmony: 0, oscillators: 0 };

  const stats = resonance.getStats();
  return {
    harmony: stats.resonanceDensity,
    oscillators: stats.oscillators,
    activeResonances: stats.activeResonances,
    totalResonances: stats.totalResonances,
  };
}

// =============================================================================
// COMBINED PHYSICS STATUS
// =============================================================================

/**
 * Get comprehensive physics status for dashboard
 */
function getPhysicsStatus() {
  loadModules();

  const status = {
    loaded: {
      fieldTheory: !!fieldTheory,
      symmetryBreaking: !!symmetryBreaking,
      entanglement: !!entanglement,
      relativity: !!relativity,
      resonance: !!resonance,
    },
    field: fieldTheory ? fieldTheory.getFieldStatus() : null,
    symmetry: symmetryBreaking ? symmetryBreaking.getState() : null,
    entanglement: entanglement ? entanglement.getStats() : null,
    relativity: relativity ? relativity.getStats() : null,
    resonance: resonance ? resonance.getStats() : null,
  };

  return status;
}

/**
 * Format physics status for display
 */
function formatPhysicsStatus() {
  loadModules();

  const lines = [
    '══════════════════════════════════════════════════════════════',
    '  🔬 CYNIC PHYSICS STATUS',
    '══════════════════════════════════════════════════════════════',
  ];

  if (fieldTheory) {
    lines.push('');
    lines.push(fieldTheory.formatFieldStatus());
  }

  if (symmetryBreaking) {
    lines.push('');
    lines.push(symmetryBreaking.formatStatus());
  }

  if (entanglement) {
    lines.push('');
    lines.push(entanglement.formatStatus());
  }

  if (relativity) {
    lines.push('');
    lines.push(relativity.formatStatus());
  }

  if (resonance) {
    lines.push('');
    lines.push(resonance.formatStatus());
  }

  lines.push('');
  lines.push('══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Initialization
  loadModules,

  // 1. Field Theory (Decision Superposition)
  createDecisionSuperposition,
  collapseDecision,
  getFieldStatus,

  // 2. Symmetry Breaking (Dog Emergence)
  processDogEmergence,
  getCurrentDog,
  getDogVoice,

  // 3. Entanglement (Pattern Prediction)
  observePattern,
  predictPatterns,
  confirmPrediction,
  testBellInequality,

  // 4. Relativity (Multi-Perspective)
  evaluatePerspectives,
  setFrame,
  suggestPerspective,
  transformPerspective,

  // 5. Resonance (Process Harmony)
  registerProcess,
  pulseProcess,
  checkProcessResonance,
  findSystemResonances,
  findResonanceChains,
  getSystemHarmony,

  // Combined Status
  getPhysicsStatus,
  formatPhysicsStatus,
};
