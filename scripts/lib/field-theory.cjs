/**
 * CYNIC Field Theory Module (Phase 9A)
 *
 * "Πάντα ῥεῖ - everything flows" - κυνικός
 *
 * Implements quantum-inspired field concepts:
 * - Judgments exist as probability waves until observed
 * - Dogs are localized excitations of the CYNIC field
 * - Wave function collapse upon measurement
 * - Superposition of multiple assessments
 *
 * Inspired by quantum field theory - reality as excitations of fields.
 *
 * @module cynic/lib/field-theory
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

/** Decoherence time in ms - φ × 10000 ≈ 16180ms */
const DECOHERENCE_TIME_MS = Math.round(PHI * 10000);

/** Minimum superposition states - 2 (always at least binary) */
const MIN_SUPERPOSITION_STATES = 2;

/** Maximum superposition states - φ × 3 ≈ 5 */
const MAX_SUPERPOSITION_STATES = Math.round(PHI * 3);

/** Collapse threshold - observation probability for wave collapse */
const COLLAPSE_THRESHOLD = PHI_INV_2;

/** Field strength decay rate - φ⁻³ per observation */
const FIELD_DECAY_RATE = PHI_INV_3;

// =============================================================================
// STORAGE
// =============================================================================

const FIELD_DIR = path.join(os.homedir(), '.cynic', 'field');
const STATE_FILE = path.join(FIELD_DIR, 'state.json');
const OBSERVATIONS_FILE = path.join(FIELD_DIR, 'observations.jsonl');

// =============================================================================
// STATE
// =============================================================================

const fieldState = {
  // Active superpositions (uncollapsed judgments)
  superpositions: {},

  // The CYNIC field - where Dogs emerge
  field: {
    strength: PHI_INV,       // Current field strength
    excitations: [],         // Active Dogs
    groundState: 'OBSERVE',  // Default field mode
  },

  // Collapsed observations
  observations: [],

  stats: {
    totalSuperpositions: 0,
    totalCollapses: 0,
    averageStates: 0,
    decoherenceEvents: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(FIELD_DIR)) {
    fs.mkdirSync(FIELD_DIR, { recursive: true });
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
    field: fieldState.field,
    stats: fieldState.stats,
  }, null, 2));
}

function appendObservation(observation) {
  ensureDir();
  const line = JSON.stringify({ ...observation, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(OBSERVATIONS_FILE, line);
}

// =============================================================================
// SUPERPOSITION (Quantum Judgments)
// =============================================================================

/**
 * Create a superposition of possible judgments
 * Until observed, all states exist simultaneously
 *
 * @param {string} subject - What we're judging
 * @param {Object[]} states - Possible states with amplitudes
 * @returns {Object} Superposition
 */
function createSuperposition(subject, states) {
  // Ensure we have valid states
  if (!states || states.length < MIN_SUPERPOSITION_STATES) {
    states = [
      { state: 'POSITIVE', amplitude: PHI_INV },
      { state: 'NEGATIVE', amplitude: PHI_INV_2 },
    ];
  }

  // Limit to max states
  if (states.length > MAX_SUPERPOSITION_STATES) {
    // Keep highest amplitude states
    states.sort((a, b) => b.amplitude - a.amplitude);
    states = states.slice(0, MAX_SUPERPOSITION_STATES);
  }

  // Normalize amplitudes (must sum to 1)
  const totalAmplitude = states.reduce((sum, s) => sum + s.amplitude, 0);
  states = states.map(s => ({
    ...s,
    amplitude: s.amplitude / totalAmplitude,
    probability: (s.amplitude / totalAmplitude) ** 2, // |ψ|²
  }));

  const id = `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const superposition = {
    id,
    subject,
    states,
    createdAt: Date.now(),
    collapsed: false,
    collapsedState: null,
    decoherenceTime: Date.now() + DECOHERENCE_TIME_MS,
  };

  fieldState.superpositions[id] = superposition;
  fieldState.stats.totalSuperpositions++;

  // Update average states
  const n = fieldState.stats.totalSuperpositions;
  fieldState.stats.averageStates =
    (fieldState.stats.averageStates * (n - 1) + states.length) / n;

  saveState();

  return superposition;
}

/**
 * Observe a superposition, causing wave function collapse
 * The outcome is probabilistic based on amplitudes
 *
 * @param {string} id - Superposition ID
 * @param {Object} observer - Who/what is observing
 * @returns {Object} Collapsed state
 */
function observe(id, observer = {}) {
  const superposition = fieldState.superpositions[id];
  if (!superposition) {
    return null;
  }

  if (superposition.collapsed) {
    return {
      alreadyCollapsed: true,
      state: superposition.collapsedState,
    };
  }

  // Check for decoherence (natural collapse from environment)
  if (Date.now() > superposition.decoherenceTime) {
    return decohere(id);
  }

  // Probabilistic collapse based on |ψ|²
  const random = Math.random();
  let cumulative = 0;
  let collapsed = superposition.states[0]; // Default

  for (const state of superposition.states) {
    cumulative += state.probability;
    if (random <= cumulative) {
      collapsed = state;
      break;
    }
  }

  // Update superposition
  superposition.collapsed = true;
  superposition.collapsedState = collapsed.state;
  superposition.collapsedAt = Date.now();
  superposition.observer = observer;

  fieldState.stats.totalCollapses++;

  // Log observation
  appendObservation({
    superpositionId: id,
    subject: superposition.subject,
    collapsedTo: collapsed.state,
    probability: collapsed.probability,
    observer: observer.name || 'anonymous',
    otherStates: superposition.states
      .filter(s => s.state !== collapsed.state)
      .map(s => ({ state: s.state, probability: s.probability })),
  });

  // Decay field strength
  fieldState.field.strength = Math.max(
    PHI_INV_3,
    fieldState.field.strength * (1 - FIELD_DECAY_RATE)
  );

  saveState();

  return {
    collapsed: true,
    state: collapsed.state,
    probability: collapsed.probability,
    alternatives: superposition.states
      .filter(s => s.state !== collapsed.state)
      .map(s => s.state),
  };
}

/**
 * Natural decoherence - superposition collapses due to environment
 * Results in the highest probability state (classical limit)
 *
 * @param {string} id - Superposition ID
 * @returns {Object} Decohered state
 */
function decohere(id) {
  const superposition = fieldState.superpositions[id];
  if (!superposition || superposition.collapsed) {
    return null;
  }

  // Decoherence selects highest probability state (classical)
  const highest = superposition.states.reduce((max, s) =>
    s.probability > max.probability ? s : max
  );

  superposition.collapsed = true;
  superposition.collapsedState = highest.state;
  superposition.collapsedAt = Date.now();
  superposition.decoherence = true;

  fieldState.stats.decoherenceEvents++;
  fieldState.stats.totalCollapses++;

  appendObservation({
    superpositionId: id,
    subject: superposition.subject,
    collapsedTo: highest.state,
    probability: highest.probability,
    decoherence: true,
  });

  saveState();

  return {
    decohered: true,
    state: highest.state,
    probability: highest.probability,
  };
}

/**
 * Get current superposition state without collapsing
 * (Peek at probabilities)
 *
 * @param {string} id - Superposition ID
 * @returns {Object} Current state
 */
function peek(id) {
  const superposition = fieldState.superpositions[id];
  if (!superposition) {
    return null;
  }

  return {
    id: superposition.id,
    subject: superposition.subject,
    collapsed: superposition.collapsed,
    states: superposition.collapsed
      ? [{ state: superposition.collapsedState, probability: 1 }]
      : superposition.states.map(s => ({
          state: s.state,
          probability: s.probability,
        })),
    timeToDecoherence: superposition.collapsed
      ? 0
      : Math.max(0, superposition.decoherenceTime - Date.now()),
  };
}

// =============================================================================
// CYNIC FIELD (Dog Emergence)
// =============================================================================

/**
 * Create an excitation in the CYNIC field (spawn a Dog)
 *
 * @param {string} type - Dog type
 * @param {Object} energy - Initial energy/purpose
 * @returns {Object} Field excitation (Dog)
 */
function exciteField(type, energy = {}) {
  const excitation = {
    id: `dog-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
    type,
    energy: energy.amount || PHI_INV,
    purpose: energy.purpose || 'observe',
    createdAt: Date.now(),
    position: {
      // Position in "concept space"
      x: Math.random() * PHI,
      y: Math.random() * PHI,
    },
    momentum: {
      // Direction of attention
      dx: (Math.random() - 0.5) * PHI_INV,
      dy: (Math.random() - 0.5) * PHI_INV,
    },
    active: true,
  };

  fieldState.field.excitations.push(excitation);

  // Excitations boost field strength
  fieldState.field.strength = Math.min(
    1,
    fieldState.field.strength + PHI_INV_3
  );

  saveState();

  return excitation;
}

/**
 * Annihilate an excitation (Dog returns to field)
 *
 * @param {string} id - Excitation ID
 * @returns {Object} Annihilation result
 */
function annihilateExcitation(id) {
  const idx = fieldState.field.excitations.findIndex(e => e.id === id);
  if (idx === -1) {
    return null;
  }

  const excitation = fieldState.field.excitations[idx];
  excitation.active = false;
  excitation.annihilatedAt = Date.now();

  // Energy returns to field
  fieldState.field.strength = Math.min(
    1,
    fieldState.field.strength + excitation.energy * PHI_INV_2
  );

  // Remove from active excitations
  fieldState.field.excitations.splice(idx, 1);

  saveState();

  return {
    annihilated: true,
    energyReturned: excitation.energy * PHI_INV_2,
    fieldStrength: fieldState.field.strength,
  };
}

/**
 * Get field status
 *
 * @returns {Object} Field status
 */
function getFieldStatus() {
  // Clean up decohered superpositions
  const now = Date.now();
  for (const [id, sup] of Object.entries(fieldState.superpositions)) {
    if (!sup.collapsed && now > sup.decoherenceTime) {
      decohere(id);
    }
  }

  const activeSuperpositions = Object.values(fieldState.superpositions)
    .filter(s => !s.collapsed).length;

  return {
    strength: fieldState.field.strength,
    strengthPercent: Math.round(fieldState.field.strength * 100),
    groundState: fieldState.field.groundState,
    activeExcitations: fieldState.field.excitations.length,
    activeSuperpositions,
    stats: fieldState.stats,
  };
}

// =============================================================================
// JUDGMENT SUPERPOSITION HELPERS
// =============================================================================

/**
 * Create a judgment superposition (common use case)
 *
 * @param {string} subject - What to judge
 * @param {Object} options - Judgment options
 * @returns {Object} Superposition
 */
function createJudgmentSuperposition(subject, options = {}) {
  const verdicts = options.verdicts || ['WAG', 'HOWL', 'GROWL', 'BARK'];
  const weights = options.weights || [PHI_INV, PHI_INV_2, PHI_INV_3, PHI_INV_3];

  const states = verdicts.map((verdict, i) => ({
    state: verdict,
    amplitude: weights[i] || PHI_INV_3,
    metadata: options.metadata?.[verdict] || {},
  }));

  return createSuperposition(subject, states);
}

/**
 * Create a binary superposition (yes/no)
 *
 * @param {string} question - Binary question
 * @param {number} yesProbability - P(yes), defaults to φ⁻¹
 * @returns {Object} Superposition
 */
function createBinarySuperposition(question, yesProbability = PHI_INV) {
  return createSuperposition(question, [
    { state: 'YES', amplitude: Math.sqrt(yesProbability) },
    { state: 'NO', amplitude: Math.sqrt(1 - yesProbability) },
  ]);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize field theory
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    fieldState.field = saved.field || fieldState.field;
    fieldState.stats = saved.stats || fieldState.stats;
  }

  // Clean up old superpositions
  fieldState.superpositions = {};
}

/**
 * Format field status for display
 *
 * @returns {string} Formatted status
 */
function formatFieldStatus() {
  const status = getFieldStatus();

  const strengthBar = '█'.repeat(Math.round(status.strength * 10)) +
                      '░'.repeat(10 - Math.round(status.strength * 10));

  const lines = [
    '── CYNIC FIELD ────────────────────────────────────────────',
    `   Strength: [${strengthBar}] ${status.strengthPercent}%`,
    `   Ground State: ${status.groundState}`,
    `   Active Dogs: ${status.activeExcitations}`,
    `   Superpositions: ${status.activeSuperpositions}`,
    '',
    `   Collapses: ${status.stats.totalCollapses}`,
    `   Decoherence: ${status.stats.decoherenceEvents}`,
    `   Avg States: ${status.stats.averageStates.toFixed(1)}`,
  ];

  return lines.join('\n');
}

/**
 * Format superposition for display
 *
 * @param {Object} superposition - Superposition to format
 * @returns {string} Formatted superposition
 */
function formatSuperposition(superposition) {
  if (superposition.collapsed) {
    return `|${superposition.subject}⟩ = |${superposition.collapsedState}⟩ (collapsed)`;
  }

  const stateStr = superposition.states
    .map(s => `${Math.round(s.probability * 100)}%|${s.state}⟩`)
    .join(' + ');

  return `|${superposition.subject}⟩ = ${stateStr}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  DECOHERENCE_TIME_MS,
  MAX_SUPERPOSITION_STATES,
  COLLAPSE_THRESHOLD,

  // Core functions
  init,
  getFieldStatus,

  // Superposition
  createSuperposition,
  observe,
  decohere,
  peek,

  // Helpers
  createJudgmentSuperposition,
  createBinarySuperposition,

  // Field excitations
  exciteField,
  annihilateExcitation,

  // Display
  formatFieldStatus,
  formatSuperposition,
};
