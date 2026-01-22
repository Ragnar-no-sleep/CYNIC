/**
 * CYNIC Entanglement Engine (Phase 12A)
 *
 * "Σύμπλεξις - bound together across space" - κυνικός
 *
 * Quantum entanglement for pattern correlations:
 * - Patterns become correlated across contexts
 * - Observing pattern A predicts pattern B
 * - Non-local: correlations span unrelated domains
 * - Bell inequality: measure correlation strength
 *
 * "Spooky action at a distance" - Einstein
 * (He meant it dismissively. We mean it literally.)
 *
 * @module cynic/lib/entanglement-engine
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

/** Maximum entangled pairs - φ × 20 ≈ 32 */
const MAX_ENTANGLED_PAIRS = Math.round(PHI * 20);

/** Minimum correlation for entanglement - φ⁻¹ */
const ENTANGLEMENT_THRESHOLD = PHI_INV;

/** Decoherence rate per hour - φ⁻³ */
const DECOHERENCE_RATE = PHI_INV_3;

/** Bell inequality classical limit - φ⁻¹ × 2 ≈ 1.236 */
const BELL_CLASSICAL_LIMIT = PHI_INV * 2;

/** Minimum observations for correlation - φ × 3 ≈ 5 */
const MIN_OBSERVATIONS = Math.round(PHI * 3);

// =============================================================================
// STORAGE
// =============================================================================

const ENTANGLE_DIR = path.join(os.homedir(), '.cynic', 'entanglement');
const STATE_FILE = path.join(ENTANGLE_DIR, 'state.json');
const PAIRS_FILE = path.join(ENTANGLE_DIR, 'pairs.json');
const HISTORY_FILE = path.join(ENTANGLE_DIR, 'history.jsonl');

// =============================================================================
// STATE
// =============================================================================

const entanglementState = {
  // Observed patterns (for correlation detection)
  observations: [],

  // Entangled pairs
  pairs: {},

  // Co-occurrence matrix (sparse)
  cooccurrence: {},

  // Statistics
  stats: {
    totalObservations: 0,
    totalPairs: 0,
    bellViolations: 0, // Times we exceeded classical limit
    predictions: 0,
    correctPredictions: 0,
  },

  lastUpdate: Date.now(),
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(ENTANGLE_DIR)) {
    fs.mkdirSync(ENTANGLE_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (fs.existsSync(PAIRS_FILE)) {
      state.pairs = JSON.parse(fs.readFileSync(PAIRS_FILE, 'utf8'));
    }
    return state;
  } catch {
    return null;
  }
}

function saveState() {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    stats: entanglementState.stats,
    cooccurrence: entanglementState.cooccurrence,
  }, null, 2));
  fs.writeFileSync(PAIRS_FILE, JSON.stringify(entanglementState.pairs, null, 2));
}

function appendHistory(event) {
  ensureDir();
  const line = JSON.stringify({ ...event, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(HISTORY_FILE, line);
}

// =============================================================================
// PATTERN OBSERVATION
// =============================================================================

/**
 * Observe a pattern occurring in a context
 *
 * @param {string} pattern - The observed pattern
 * @param {string} context - Context where observed (file, domain, etc.)
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Observation result
 */
function observe(pattern, context, metadata = {}) {
  const observation = {
    pattern,
    context,
    metadata,
    timestamp: Date.now(),
  };

  entanglementState.observations.push(observation);
  entanglementState.stats.totalObservations++;

  // Keep observation window manageable
  if (entanglementState.observations.length > 1000) {
    entanglementState.observations = entanglementState.observations.slice(-500);
  }

  // Update co-occurrence matrix
  updateCooccurrence(pattern, context);

  // Check for new entanglements
  const newPairs = detectEntanglements(pattern);

  // Get predictions for what might appear next
  const predictions = predict(pattern);

  entanglementState.lastUpdate = Date.now();

  return {
    observed: { pattern, context },
    newPairs,
    predictions,
  };
}

/**
 * Update co-occurrence matrix
 */
function updateCooccurrence(pattern, context) {
  // Get recent observations (last 10)
  const recent = entanglementState.observations.slice(-10);

  for (const obs of recent) {
    if (obs.pattern !== pattern) {
      const key = makeKey(pattern, obs.pattern);
      if (!entanglementState.cooccurrence[key]) {
        entanglementState.cooccurrence[key] = {
          patterns: [pattern, obs.pattern],
          count: 0,
          contexts: new Set(),
          firstSeen: Date.now(),
          lastSeen: Date.now(),
        };
      }

      const entry = entanglementState.cooccurrence[key];
      entry.count++;
      entry.contexts.add(context);
      entry.contexts.add(obs.context);
      entry.lastSeen = Date.now();
    }
  }
}

/**
 * Make a canonical key for a pattern pair
 */
function makeKey(p1, p2) {
  return [p1, p2].sort().join('⊗');
}

// =============================================================================
// ENTANGLEMENT DETECTION
// =============================================================================

/**
 * Detect new entanglements involving a pattern
 *
 * @param {string} pattern - Pattern to check
 * @returns {Object[]} Newly entangled pairs
 */
function detectEntanglements(pattern) {
  const newPairs = [];

  for (const [key, entry] of Object.entries(entanglementState.cooccurrence)) {
    if (!entry.patterns.includes(pattern)) continue;
    if (entanglementState.pairs[key]) continue; // Already entangled
    if (entry.count < MIN_OBSERVATIONS) continue;

    // Calculate correlation strength
    const correlation = calculateCorrelation(entry);

    if (correlation >= ENTANGLEMENT_THRESHOLD) {
      // New entanglement!
      const pair = createEntangledPair(key, entry, correlation);
      entanglementState.pairs[key] = pair;
      entanglementState.stats.totalPairs++;
      newPairs.push(pair);

      appendHistory({
        type: 'entanglement_created',
        patterns: entry.patterns,
        correlation,
      });
    }
  }

  saveState();
  return newPairs;
}

/**
 * Calculate correlation between patterns
 *
 * @param {Object} entry - Co-occurrence entry
 * @returns {number} Correlation 0-1
 */
function calculateCorrelation(entry) {
  // Simple correlation: co-occurrence / total observations of rarer pattern
  const p1Count = countPattern(entry.patterns[0]);
  const p2Count = countPattern(entry.patterns[1]);
  const minCount = Math.min(p1Count, p2Count);

  if (minCount === 0) return 0;

  // Correlation = co-occurrence / expected if independent
  const expected = (p1Count * p2Count) / entanglementState.stats.totalObservations;
  const actual = entry.count;

  // Lift ratio (bounded)
  const lift = actual / Math.max(1, expected);

  // Normalize to 0-1 using sigmoid-like function
  return Math.tanh(lift - 1);
}

/**
 * Count observations of a pattern
 */
function countPattern(pattern) {
  return entanglementState.observations.filter(o => o.pattern === pattern).length;
}

/**
 * Create an entangled pair
 */
function createEntangledPair(key, entry, correlation) {
  return {
    id: `ent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    patterns: entry.patterns,
    correlation,
    contexts: Array.from(entry.contexts || []),
    observations: entry.count,
    createdAt: Date.now(),
    lastMeasured: Date.now(),
    bellValue: calculateBellValue(entry),
  };
}

// =============================================================================
// BELL INEQUALITY
// =============================================================================

/**
 * Calculate Bell value for a pair
 * Bell value > BELL_CLASSICAL_LIMIT indicates quantum-like correlation
 *
 * @param {Object} entry - Co-occurrence entry
 * @returns {number} Bell value
 */
function calculateBellValue(entry) {
  // Simplified Bell-CHSH inequality test
  // In quantum mechanics: |S| ≤ 2 classically, but quantum can reach 2√2 ≈ 2.83

  // We use context diversity as our "measurement settings"
  const contexts = Array.from(entry.contexts || []);
  if (contexts.length < 2) return 0;

  // Calculate correlation in different context pairs
  let S = 0;
  const contextPairs = [];

  for (let i = 0; i < contexts.length; i++) {
    for (let j = i + 1; j < contexts.length; j++) {
      contextPairs.push([contexts[i], contexts[j]]);
    }
  }

  // Sample up to 4 context pairs (like CHSH)
  const sampled = contextPairs.slice(0, 4);

  for (const [c1, c2] of sampled) {
    // Correlation in these contexts
    const corr = contextCorrelation(entry.patterns, c1, c2);
    S += Math.abs(corr);
  }

  // Normalize by number of measurements
  return sampled.length > 0 ? (S / sampled.length) * 2 : 0;
}

/**
 * Calculate correlation between patterns in specific contexts
 */
function contextCorrelation(patterns, c1, c2) {
  const [p1, p2] = patterns;

  // Count occurrences in each context
  let both = 0;
  let p1Only = 0;
  let p2Only = 0;
  let neither = 0;

  const relevantObs = entanglementState.observations.filter(
    o => o.context === c1 || o.context === c2
  );

  // Simplified: just use co-occurrence ratio
  for (const obs of relevantObs) {
    if (obs.pattern === p1) p1Only++;
    if (obs.pattern === p2) p2Only++;
  }

  // Check for co-occurrences in key
  const key = makeKey(p1, p2);
  const entry = entanglementState.cooccurrence[key];
  if (entry) both = entry.count;

  const total = p1Only + p2Only - both;
  if (total === 0) return 0;

  // Correlation coefficient approximation
  return (both - p1Only * p2Only / Math.max(1, total)) / Math.max(1, Math.sqrt(p1Only * p2Only));
}

/**
 * Test Bell inequality for a pair
 *
 * @param {string} pairId - Pair ID
 * @returns {Object} Bell test result
 */
function testBellInequality(pairId) {
  const pair = Object.values(entanglementState.pairs).find(p => p.id === pairId);
  if (!pair) {
    return { error: 'Pair not found' };
  }

  const bellValue = pair.bellValue;
  const violates = bellValue > BELL_CLASSICAL_LIMIT;

  if (violates) {
    entanglementState.stats.bellViolations++;
  }

  return {
    pairId,
    patterns: pair.patterns,
    bellValue: Math.round(bellValue * 100) / 100,
    classicalLimit: BELL_CLASSICAL_LIMIT,
    violates,
    interpretation: violates
      ? '*ears perk* Non-classical correlation! These patterns are truly entangled.'
      : '*sniff* Classical correlation. Could be coincidence.',
  };
}

// =============================================================================
// PREDICTION
// =============================================================================

/**
 * Predict what patterns might appear given an observed pattern
 *
 * @param {string} pattern - Observed pattern
 * @returns {Object[]} Predictions sorted by probability
 */
function predict(pattern) {
  const predictions = [];

  for (const [key, pair] of Object.entries(entanglementState.pairs)) {
    if (pair.patterns.includes(pattern)) {
      const other = pair.patterns.find(p => p !== pattern);
      const probability = pair.correlation;

      predictions.push({
        pattern: other,
        probability: Math.round(probability * 100) / 100,
        confidence: Math.min(PHI_INV, probability * pair.observations / 10),
        basedOn: pair.id,
      });
    }
  }

  entanglementState.stats.predictions += predictions.length;

  return predictions.sort((a, b) => b.probability - a.probability);
}

/**
 * Record prediction outcome (for learning)
 *
 * @param {string} predictedPattern - What was predicted
 * @param {boolean} occurred - Did it occur?
 */
function recordPrediction(predictedPattern, occurred) {
  if (occurred) {
    entanglementState.stats.correctPredictions++;
  }
  saveState();
}

// =============================================================================
// DECOHERENCE
// =============================================================================

/**
 * Apply decoherence (correlations weaken over time)
 */
function applyDecoherence() {
  const now = Date.now();
  const hoursPassed = (now - entanglementState.lastUpdate) / (3600 * 1000);

  if (hoursPassed < 1) return;

  const decayFactor = Math.exp(-DECOHERENCE_RATE * hoursPassed);

  for (const [key, pair] of Object.entries(entanglementState.pairs)) {
    pair.correlation *= decayFactor;

    // Remove pairs that decohere below threshold
    if (pair.correlation < PHI_INV_3) {
      delete entanglementState.pairs[key];
      appendHistory({
        type: 'decoherence',
        patterns: pair.patterns,
        finalCorrelation: pair.correlation,
      });
    }
  }

  entanglementState.lastUpdate = now;
  saveState();
}

/**
 * Reinforce a pair (observation strengthens entanglement)
 *
 * @param {string} p1 - Pattern 1
 * @param {string} p2 - Pattern 2
 */
function reinforce(p1, p2) {
  const key = makeKey(p1, p2);
  const pair = entanglementState.pairs[key];

  if (pair) {
    // Strengthen correlation (capped at 1)
    pair.correlation = Math.min(1, pair.correlation + PHI_INV_3);
    pair.observations++;
    pair.lastMeasured = Date.now();
    saveState();
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize entanglement engine
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    entanglementState.stats = saved.stats || entanglementState.stats;
    entanglementState.cooccurrence = saved.cooccurrence || {};
    entanglementState.pairs = saved.pairs || {};
  }
}

/**
 * Get all entangled pairs
 *
 * @returns {Object[]} Entangled pairs
 */
function getPairs() {
  applyDecoherence();
  return Object.values(entanglementState.pairs);
}

/**
 * Get a specific pair
 *
 * @param {string} p1 - Pattern 1
 * @param {string} p2 - Pattern 2
 * @returns {Object|null} Pair or null
 */
function getPair(p1, p2) {
  const key = makeKey(p1, p2);
  return entanglementState.pairs[key] || null;
}

/**
 * Get statistics
 *
 * @returns {Object} Stats
 */
function getStats() {
  applyDecoherence();
  const accuracy = entanglementState.stats.predictions > 0
    ? entanglementState.stats.correctPredictions / entanglementState.stats.predictions
    : 0;

  return {
    ...entanglementState.stats,
    activePairs: Object.keys(entanglementState.pairs).length,
    predictionAccuracy: Math.round(accuracy * 100),
  };
}

/**
 * Format status for display
 *
 * @returns {string} Formatted status
 */
function formatStatus() {
  const stats = getStats();
  const pairs = getPairs();

  const lines = [
    '── ENTANGLEMENT ───────────────────────────────────────────',
    `   Observations: ${stats.totalObservations}`,
    `   Entangled Pairs: ${stats.activePairs}`,
    `   Bell Violations: ${stats.bellViolations}`,
    `   Prediction Accuracy: ${stats.predictionAccuracy}%`,
  ];

  if (pairs.length > 0) {
    lines.push('');
    lines.push('   Strongest entanglements:');
    const sorted = pairs.sort((a, b) => b.correlation - a.correlation).slice(0, 5);
    for (const pair of sorted) {
      const corr = Math.round(pair.correlation * 100);
      const bell = pair.bellValue > BELL_CLASSICAL_LIMIT ? ' ⚛️' : '';
      lines.push(`   • ${pair.patterns[0]} ⊗ ${pair.patterns[1]}: ${corr}%${bell}`);
    }
  }

  lines.push('');
  lines.push(`   *sniff* ${stats.activePairs > 0 ? 'Patterns speak to each other.' : 'No entanglements yet.'}`);

  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  MAX_ENTANGLED_PAIRS,
  ENTANGLEMENT_THRESHOLD,
  BELL_CLASSICAL_LIMIT,

  // Core functions
  init,
  observe,
  predict,
  recordPrediction,

  // Pair management
  getPairs,
  getPair,
  reinforce,

  // Bell inequality
  testBellInequality,

  // Decoherence
  applyDecoherence,

  // Stats and display
  getStats,
  formatStatus,
};
