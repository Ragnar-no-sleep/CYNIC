#!/usr/bin/env node
/**
 * CYNIC Circuit Breaker - Loop Detection & Prevention
 *
 * "φ distrusts φ" - Even CYNIC's own behavior must be questioned
 *
 * Detects and prevents pathological loop patterns:
 * - Infinite polling (checking same thing repeatedly)
 * - Retry storms (same failing command)
 * - Busy waiting (sleep + check loops)
 *
 * Now integrated with adaptive-learn.cjs for BURN-based threshold learning.
 *
 * @module @cynic/circuit-breaker
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Load adaptive learning system
const adaptiveLearnPath = path.join(__dirname, 'adaptive-learn.cjs');
let adaptiveLearn = null;
try {
  adaptiveLearn = require(adaptiveLearnPath);
} catch (e) {
  // Adaptive learning not available - will use static thresholds
}

// =============================================================================
// CONSTANTS (φ-aligned)
// =============================================================================

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895; // 61.8%

// Static fallback thresholds (used when adaptive learning unavailable)
const STATIC_MAX_IDENTICAL = 3;
const STATIC_MAX_SIMILAR = 5;
const STATIC_POLLING_THRESHOLD = 2;
const LOOP_WINDOW_MS = 60000;            // 1 minute window
const SIMILARITY_THRESHOLD = PHI_INV;    // 61.8% similarity triggers detection

/**
 * Get adaptive threshold or fall back to static
 */
function getAdaptiveThreshold(key, fallback) {
  if (adaptiveLearn) {
    const adaptive = adaptiveLearn.getThreshold('loop', key);
    if (adaptive !== undefined && adaptive !== null) {
      return adaptive;
    }
  }
  return fallback;
}

// Adaptive threshold getters
function getMaxIdenticalCalls() {
  return getAdaptiveThreshold('identical', STATIC_MAX_IDENTICAL);
}

function getMaxSimilarCalls() {
  return getAdaptiveThreshold('similar', STATIC_MAX_SIMILAR);
}

function getPollingThreshold() {
  return getAdaptiveThreshold('polling', STATIC_POLLING_THRESHOLD);
}

/**
 * Feed observation to adaptive learning system
 */
function feedAdaptiveLearning(loopType, count) {
  if (!adaptiveLearn) return;

  try {
    adaptiveLearn.recordObservation({
      type: 'loop',
      context: loopType,
      value: count,
      metadata: {
        source: 'circuit-breaker',
      },
    });
  } catch (e) {
    // Silently ignore - learning is optional
  }
}

// Patterns that suggest polling/waiting behavior
const POLLING_PATTERNS = [
  /gh\s+run\s+(list|view|watch)/i,       // GitHub CI polling
  /kubectl\s+get.*--watch/i,              // K8s watching
  /docker\s+(logs|ps|stats)/i,            // Docker monitoring
  /tail\s+-f/i,                           // Log tailing
  /while.*sleep/i,                        // Sleep loops
  /curl.*retry/i,                         // HTTP retries
  /ping\s/i,                              // Network pinging
];

// State file for persistence across hook invocations
const STATE_DIR = path.join(os.homedir(), '.cynic');
const STATE_FILE = path.join(STATE_DIR, 'circuit-breaker.json');

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function loadState() {
  ensureStateDir();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    // Ignore errors, start fresh
  }
  return {
    calls: [],           // Recent tool calls
    loops: [],           // Detected loop patterns
    tripCount: 0,        // Total circuit trips
    lastTrip: null,      // Last trip timestamp
  };
}

function saveState(state) {
  ensureStateDir();
  try {
    // Prune old entries before saving
    const cutoff = Date.now() - LOOP_WINDOW_MS;
    state.calls = state.calls.filter(c => c.timestamp > cutoff);
    state.loops = state.loops.slice(-100); // Keep last 100 loops

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    // Ignore write errors
  }
}

// =============================================================================
// SIMILARITY DETECTION
// =============================================================================

/**
 * Calculate similarity between two strings (Jaccard-like)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  // Tokenize
  const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/));

  // Intersection
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;

  // Union
  const union = new Set([...tokens1, ...tokens2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Normalize tool input for comparison
 */
function normalizeInput(toolName, toolInput) {
  if (toolName === 'Bash') {
    // For bash, use the command
    return toolInput.command || '';
  } else if (toolName === 'Read') {
    return `read:${toolInput.file_path || ''}`;
  } else if (toolName === 'Grep') {
    return `grep:${toolInput.pattern || ''}:${toolInput.path || ''}`;
  } else if (toolName === 'WebFetch') {
    return `fetch:${toolInput.url || ''}`;
  }
  // Default: stringify the input
  return JSON.stringify(toolInput);
}

/**
 * Check if a command matches polling patterns
 */
function isPollingCommand(command) {
  return POLLING_PATTERNS.some(pattern => pattern.test(command));
}

// =============================================================================
// CIRCUIT BREAKER LOGIC
// =============================================================================

/**
 * Record a tool call and check for loops
 * @param {string} toolName - Name of the tool
 * @param {Object} toolInput - Tool input parameters
 * @returns {Object} { shouldBlock, reason, loopType, suggestion }
 */
function checkAndRecord(toolName, toolInput) {
  const state = loadState();
  const now = Date.now();
  const normalized = normalizeInput(toolName, toolInput);

  // Record this call
  const call = {
    toolName,
    normalized,
    timestamp: now,
    isPolling: toolName === 'Bash' && isPollingCommand(toolInput.command || ''),
  };

  // Filter to recent calls only
  const recentCalls = state.calls.filter(c => c.timestamp > now - LOOP_WINDOW_MS);

  // === CHECK 1: Identical calls ===
  const identicalCalls = recentCalls.filter(c =>
    c.toolName === toolName && c.normalized === normalized
  );

  const maxIdentical = getMaxIdenticalCalls();
  if (identicalCalls.length >= maxIdentical) {
    // Feed adaptive learning
    feedAdaptiveLearning('identical', identicalCalls.length + 1);

    const loop = {
      type: 'identical',
      toolName,
      pattern: normalized.slice(0, 100),
      count: identicalCalls.length + 1,
      threshold: maxIdentical,
      timestamp: now,
    };
    state.loops.push(loop);
    state.tripCount++;
    state.lastTrip = now;
    state.calls.push(call);
    saveState(state);

    return {
      shouldBlock: true,
      reason: `Boucle identique détectée: ${identicalCalls.length + 1}x en ${Math.round(LOOP_WINDOW_MS/1000)}s (seuil: ${maxIdentical})`,
      loopType: 'identical',
      suggestion: getSuggestion('identical', toolName, toolInput),
      adaptiveThreshold: maxIdentical,
    };
  }

  // === CHECK 2: Similar calls (same tool, similar input) ===
  const similarCalls = recentCalls.filter(c => {
    if (c.toolName !== toolName) return false;
    const similarity = calculateSimilarity(c.normalized, normalized);
    return similarity >= SIMILARITY_THRESHOLD;
  });

  const maxSimilar = getMaxSimilarCalls();
  if (similarCalls.length >= maxSimilar) {
    // Feed adaptive learning
    feedAdaptiveLearning('similar', similarCalls.length + 1);

    const loop = {
      type: 'similar',
      toolName,
      pattern: normalized.slice(0, 100),
      count: similarCalls.length + 1,
      similarity: SIMILARITY_THRESHOLD,
      threshold: maxSimilar,
      timestamp: now,
    };
    state.loops.push(loop);
    state.tripCount++;
    state.lastTrip = now;
    state.calls.push(call);
    saveState(state);

    return {
      shouldBlock: true,
      reason: `Boucle similaire détectée: ${similarCalls.length + 1}x appels ${toolName} similaires (seuil: ${maxSimilar})`,
      loopType: 'similar',
      suggestion: getSuggestion('similar', toolName, toolInput),
      adaptiveThreshold: maxSimilar,
    };
  }

  // === CHECK 3: Polling pattern with no progress ===
  if (call.isPolling) {
    const pollingCalls = recentCalls.filter(c => c.isPolling && c.toolName === toolName);
    const pollingThreshold = getPollingThreshold();

    if (pollingCalls.length >= pollingThreshold) {
      // Feed adaptive learning
      feedAdaptiveLearning('polling', pollingCalls.length + 1);

      const loop = {
        type: 'polling',
        toolName,
        pattern: normalized.slice(0, 100),
        count: pollingCalls.length + 1,
        threshold: pollingThreshold,
        timestamp: now,
      };
      state.loops.push(loop);
      state.tripCount++;
      state.lastTrip = now;
      state.calls.push(call);
      saveState(state);

      return {
        shouldBlock: true,
        reason: `Polling répétitif détecté: ${pollingCalls.length + 1}x vérifications (seuil: ${pollingThreshold})`,
        loopType: 'polling',
        suggestion: getSuggestion('polling', toolName, toolInput),
        adaptiveThreshold: pollingThreshold,
      };
    }
  }

  // No loop detected - record and continue
  state.calls.push(call);
  saveState(state);

  return { shouldBlock: false };
}

/**
 * Get contextual suggestion for breaking the loop
 */
function getSuggestion(loopType, toolName, toolInput) {
  if (loopType === 'polling') {
    if (toolInput.command?.includes('gh run')) {
      return 'Lancer en background: `gh run watch <id> &` ou vérifier manuellement plus tard';
    }
    return 'Éviter le polling actif. Utiliser webhooks, callbacks, ou vérifier manuellement';
  }

  if (loopType === 'identical') {
    return 'Cette commande a déjà été exécutée. Résultat probablement identique. Passer à autre chose?';
  }

  if (loopType === 'similar') {
    return 'Plusieurs tentatives similaires. Revoir l\'approche ou demander de l\'aide?';
  }

  return 'Comportement en boucle détecté. Reconsidérer l\'approche.';
}

/**
 * Reset the circuit breaker (clear state)
 */
function reset() {
  ensureStateDir();
  const state = {
    calls: [],
    loops: [],
    tripCount: 0,
    lastTrip: null,
  };
  saveState(state);
  return { success: true, message: 'Circuit breaker reset' };
}

/**
 * Get circuit breaker statistics
 */
function getStats() {
  const state = loadState();
  const now = Date.now();
  const recentCalls = state.calls.filter(c => c.timestamp > now - LOOP_WINDOW_MS);

  // Group by tool
  const byTool = {};
  for (const call of recentCalls) {
    byTool[call.toolName] = (byTool[call.toolName] || 0) + 1;
  }

  return {
    recentCalls: recentCalls.length,
    callsByTool: byTool,
    totalTrips: state.tripCount,
    lastTrip: state.lastTrip,
    recentLoops: state.loops.slice(-5),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Provide feedback on a circuit breaker decision
 * @param {string} loopType - Type of loop (identical, similar, polling)
 * @param {boolean} wasCorrect - Was blocking correct?
 */
function provideFeedback(loopType, wasCorrect) {
  if (!adaptiveLearn) {
    return { success: false, reason: 'Adaptive learning not available' };
  }

  try {
    adaptiveLearn.recordFeedback({
      type: 'loop',
      detectionId: `loop_${loopType}_${Date.now()}`,
      correct: wasCorrect,
    });
    return { success: true };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}

/**
 * Get current adaptive thresholds
 */
function getAdaptiveStats() {
  return {
    maxIdentical: getMaxIdenticalCalls(),
    maxSimilar: getMaxSimilarCalls(),
    polling: getPollingThreshold(),
    adaptive: adaptiveLearn !== null,
  };
}

module.exports = {
  checkAndRecord,
  reset,
  getStats,
  provideFeedback,
  getAdaptiveStats,
  getMaxIdenticalCalls,
  getMaxSimilarCalls,
  getPollingThreshold,
  // Constants (deprecated - use get* functions)
  MAX_IDENTICAL_CALLS: STATIC_MAX_IDENTICAL,
  MAX_SIMILAR_CALLS: STATIC_MAX_SIMILAR,
  LOOP_WINDOW_MS,
  SIMILARITY_THRESHOLD,
};
