/**
 * CYNIC Transparent State Module (Phase 8C)
 *
 * "Βίος δημόσιος - vivre publiquement" - κυνικός
 *
 * Implements Cynic public living - no hidden state:
 * - All decisions logged with reasoning
 * - Full introspection available
 * - No hidden calculations
 * - Audit trail for all actions
 *
 * The Cynics lived publicly, rejecting privacy for transparency.
 * CYNIC follows this by making all reasoning visible.
 *
 * @module cynic/lib/transparent-state
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI_INV, PHI_INV_2 } = phiMath;

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum decisions to keep in memory */
const MAX_DECISIONS_MEMORY = 100;

/** Maximum decisions in audit log file */
const MAX_DECISIONS_FILE = 1000;

/** Transparency levels */
const TRANSPARENCY_LEVELS = {
  FULL: 'full',           // Everything visible
  REASONING: 'reasoning', // Reasoning visible, intermediate steps hidden
  SUMMARY: 'summary',     // Only summary visible
};

// =============================================================================
// STORAGE
// =============================================================================

const TRANSPARENCY_DIR = path.join(os.homedir(), '.cynic', 'transparency');
const DECISIONS_FILE = path.join(TRANSPARENCY_DIR, 'decisions.jsonl');
const STATE_FILE = path.join(TRANSPARENCY_DIR, 'state.json');
const INTROSPECTION_FILE = path.join(TRANSPARENCY_DIR, 'introspection.json');

// =============================================================================
// STATE
// =============================================================================

const transparentState = {
  decisions: [],          // Recent decisions
  currentReasoning: null, // Current reasoning chain
  stats: {
    totalDecisions: 0,
    avgConfidence: 0,
    reasoningDepth: 0,
  },
  config: {
    level: TRANSPARENCY_LEVELS.FULL,
    logToFile: true,
    maxReasoningDepth: 10,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(TRANSPARENCY_DIR)) {
    fs.mkdirSync(TRANSPARENCY_DIR, { recursive: true });
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
    stats: transparentState.stats,
    config: transparentState.config,
  }, null, 2));
}

function appendDecision(decision) {
  ensureDir();
  const line = JSON.stringify(decision) + '\n';
  fs.appendFileSync(DECISIONS_FILE, line);

  // Rotate if too large
  try {
    const stats = fs.statSync(DECISIONS_FILE);
    const lines = fs.readFileSync(DECISIONS_FILE, 'utf8').split('\n').filter(Boolean);
    if (lines.length > MAX_DECISIONS_FILE) {
      // Keep last MAX_DECISIONS_FILE entries
      const kept = lines.slice(-MAX_DECISIONS_FILE);
      fs.writeFileSync(DECISIONS_FILE, kept.join('\n') + '\n');
    }
  } catch {
    // Ignore rotation errors
  }
}

function saveIntrospection() {
  ensureDir();
  const introspection = generateIntrospection();
  fs.writeFileSync(INTROSPECTION_FILE, JSON.stringify(introspection, null, 2));
}

// =============================================================================
// DECISION LOGGING
// =============================================================================

/**
 * Log a decision with full reasoning
 * @param {Object} decision - Decision details
 * @returns {Object} Logged decision
 */
function logDecision(decision) {
  const logged = {
    id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    type: decision.type || 'unknown',
    input: decision.input,
    output: decision.output,
    reasoning: decision.reasoning || [],
    confidence: decision.confidence || PHI_INV,
    factors: decision.factors || {},
    alternatives: decision.alternatives || [],
    chosen: decision.chosen,
    rejected: decision.rejected || [],
  };

  // Add to memory
  transparentState.decisions.push(logged);
  if (transparentState.decisions.length > MAX_DECISIONS_MEMORY) {
    transparentState.decisions.shift();
  }

  // Update stats
  transparentState.stats.totalDecisions++;
  const n = transparentState.stats.totalDecisions;
  transparentState.stats.avgConfidence =
    (transparentState.stats.avgConfidence * (n - 1) + logged.confidence) / n;
  transparentState.stats.reasoningDepth =
    (transparentState.stats.reasoningDepth * (n - 1) + logged.reasoning.length) / n;

  // Log to file
  if (transparentState.config.logToFile) {
    appendDecision(logged);
  }

  saveState();
  saveIntrospection();

  return logged;
}

/**
 * Start a reasoning chain
 * @param {string} topic - What we're reasoning about
 * @returns {Object} Reasoning chain handle
 */
function startReasoning(topic) {
  transparentState.currentReasoning = {
    topic,
    startTime: Date.now(),
    steps: [],
    factors: {},
    conclusion: null,
  };

  return {
    addStep: (step, confidence = PHI_INV_2) => addReasoningStep(step, confidence),
    addFactor: (name, value, weight) => addReasoningFactor(name, value, weight),
    conclude: (conclusion, confidence) => concludeReasoning(conclusion, confidence),
    abort: (reason) => abortReasoning(reason),
  };
}

/**
 * Add a step to current reasoning
 * @param {string} step - Reasoning step
 * @param {number} confidence - Step confidence
 */
function addReasoningStep(step, confidence = PHI_INV_2) {
  if (!transparentState.currentReasoning) {
    return;
  }

  if (transparentState.currentReasoning.steps.length >= transparentState.config.maxReasoningDepth) {
    // Max depth reached - auto-conclude
    concludeReasoning('Max reasoning depth reached', PHI_INV_2);
    return;
  }

  transparentState.currentReasoning.steps.push({
    step,
    confidence,
    timestamp: Date.now(),
  });
}

/**
 * Add a factor to current reasoning
 * @param {string} name - Factor name
 * @param {*} value - Factor value
 * @param {number} weight - Factor weight
 */
function addReasoningFactor(name, value, weight = 1) {
  if (!transparentState.currentReasoning) {
    return;
  }

  transparentState.currentReasoning.factors[name] = {
    value,
    weight,
    addedAt: Date.now(),
  };
}

/**
 * Conclude current reasoning
 * @param {string} conclusion - Final conclusion
 * @param {number} confidence - Conclusion confidence
 * @returns {Object} Completed reasoning
 */
function concludeReasoning(conclusion, confidence = PHI_INV) {
  if (!transparentState.currentReasoning) {
    return null;
  }

  const completed = {
    ...transparentState.currentReasoning,
    conclusion,
    confidence,
    endTime: Date.now(),
    duration: Date.now() - transparentState.currentReasoning.startTime,
  };

  transparentState.currentReasoning = null;

  return completed;
}

/**
 * Abort current reasoning
 * @param {string} reason - Abort reason
 */
function abortReasoning(reason) {
  if (!transparentState.currentReasoning) {
    return;
  }

  transparentState.currentReasoning.steps.push({
    step: `ABORTED: ${reason}`,
    confidence: 0,
    timestamp: Date.now(),
  });

  transparentState.currentReasoning = null;
}

// =============================================================================
// INTROSPECTION
// =============================================================================

/**
 * Generate introspection report
 * @returns {Object} Introspection data
 */
function generateIntrospection() {
  const recentDecisions = transparentState.decisions.slice(-10);

  // Calculate decision patterns
  const typeCount = {};
  const confidenceByType = {};

  for (const d of transparentState.decisions) {
    typeCount[d.type] = (typeCount[d.type] || 0) + 1;
    if (!confidenceByType[d.type]) {
      confidenceByType[d.type] = [];
    }
    confidenceByType[d.type].push(d.confidence);
  }

  // Average confidence by type
  const avgConfidenceByType = {};
  for (const [type, confidences] of Object.entries(confidenceByType)) {
    avgConfidenceByType[type] = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  return {
    generatedAt: Date.now(),
    stats: transparentState.stats,
    currentReasoning: transparentState.currentReasoning
      ? {
          topic: transparentState.currentReasoning.topic,
          stepsCount: transparentState.currentReasoning.steps.length,
          factorsCount: Object.keys(transparentState.currentReasoning.factors).length,
        }
      : null,
    patterns: {
      decisionTypes: typeCount,
      avgConfidenceByType,
      mostCommonType: Object.entries(typeCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    },
    recentDecisions: recentDecisions.map(d => ({
      id: d.id,
      type: d.type,
      confidence: d.confidence,
      reasoningSteps: d.reasoning.length,
      timestamp: d.timestamp,
    })),
  };
}

/**
 * Get full decision details
 * @param {string} id - Decision ID
 * @returns {Object|null} Decision details
 */
function getDecision(id) {
  return transparentState.decisions.find(d => d.id === id) || null;
}

/**
 * Query decisions
 * @param {Object} query - Query parameters
 * @returns {Object[]} Matching decisions
 */
function queryDecisions(query = {}) {
  let results = [...transparentState.decisions];

  if (query.type) {
    results = results.filter(d => d.type === query.type);
  }

  if (query.minConfidence) {
    results = results.filter(d => d.confidence >= query.minConfidence);
  }

  if (query.since) {
    results = results.filter(d => d.timestamp >= query.since);
  }

  if (query.limit) {
    results = results.slice(-query.limit);
  }

  return results;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize transparent state
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    transparentState.stats = saved.stats || transparentState.stats;
    transparentState.config = { ...transparentState.config, ...saved.config };
  }
}

/**
 * Get current state summary
 * @returns {Object} State summary
 */
function getSummary() {
  return {
    totalDecisions: transparentState.stats.totalDecisions,
    avgConfidence: Math.round(transparentState.stats.avgConfidence * 100),
    avgReasoningDepth: Math.round(transparentState.stats.reasoningDepth * 10) / 10,
    currentlyReasoning: !!transparentState.currentReasoning,
    recentDecisionsCount: transparentState.decisions.length,
    transparencyLevel: transparentState.config.level,
  };
}

/**
 * Format decision for display
 * @param {Object} decision - Decision to format
 * @returns {string} Formatted decision
 */
function formatDecision(decision) {
  const lines = [
    '── DÉCISION TRANSPARENTE ──────────────────────────────────',
    `   ID: ${decision.id}`,
    `   Type: ${decision.type}`,
    `   Confiance: ${Math.round(decision.confidence * 100)}%`,
    '',
    '   Raisonnement:',
  ];

  for (let i = 0; i < decision.reasoning.length; i++) {
    const step = decision.reasoning[i];
    lines.push(`   ${i + 1}. ${step.step} (${Math.round(step.confidence * 100)}%)`);
  }

  if (Object.keys(decision.factors).length > 0) {
    lines.push('');
    lines.push('   Facteurs:');
    for (const [name, factor] of Object.entries(decision.factors)) {
      lines.push(`   • ${name}: ${factor.value} (poids: ${factor.weight})`);
    }
  }

  if (decision.alternatives?.length > 0) {
    lines.push('');
    lines.push('   Alternatives rejetées:');
    for (const alt of decision.alternatives) {
      lines.push(`   ✗ ${alt}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format introspection for display
 * @returns {string} Formatted introspection
 */
function formatIntrospection() {
  const intro = generateIntrospection();

  const lines = [
    '── INTROSPECTION ──────────────────────────────────────────',
    `   Décisions totales: ${intro.stats.totalDecisions}`,
    `   Confiance moyenne: ${Math.round(intro.stats.avgConfidence * 100)}%`,
    `   Profondeur moyenne: ${Math.round(intro.stats.reasoningDepth * 10) / 10} étapes`,
    '',
  ];

  if (intro.currentReasoning) {
    lines.push('   En cours de raisonnement:');
    lines.push(`   • Topic: ${intro.currentReasoning.topic}`);
    lines.push(`   • Étapes: ${intro.currentReasoning.stepsCount}`);
    lines.push('');
  }

  if (intro.patterns.mostCommonType) {
    lines.push('   Type le plus commun:');
    lines.push(`   • ${intro.patterns.mostCommonType}`);
  }

  return lines.join('\n');
}

/**
 * Set transparency level
 * @param {string} level - Transparency level
 */
function setLevel(level) {
  if (Object.values(TRANSPARENCY_LEVELS).includes(level)) {
    transparentState.config.level = level;
    saveState();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  TRANSPARENCY_LEVELS,
  MAX_DECISIONS_MEMORY,

  // Core functions
  init,
  getSummary,

  // Decision logging
  logDecision,
  startReasoning,
  addReasoningStep,
  addReasoningFactor,
  concludeReasoning,
  abortReasoning,

  // Introspection
  generateIntrospection,
  getDecision,
  queryDecisions,

  // Display
  formatDecision,
  formatIntrospection,

  // Configuration
  setLevel,
};
