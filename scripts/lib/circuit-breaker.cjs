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
 * @module @cynic/circuit-breaker
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// =============================================================================
// CONSTANTS (φ-aligned)
// =============================================================================

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895; // 61.8%

// Circuit breaker thresholds
const MAX_IDENTICAL_CALLS = 3;           // Block after 3 identical calls
const MAX_SIMILAR_CALLS = 5;             // Block after 5 similar calls
const LOOP_WINDOW_MS = 60000;            // 1 minute window
const SIMILARITY_THRESHOLD = PHI_INV;    // 61.8% similarity triggers detection

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

  if (identicalCalls.length >= MAX_IDENTICAL_CALLS) {
    const loop = {
      type: 'identical',
      toolName,
      pattern: normalized.slice(0, 100),
      count: identicalCalls.length + 1,
      timestamp: now,
    };
    state.loops.push(loop);
    state.tripCount++;
    state.lastTrip = now;
    state.calls.push(call);
    saveState(state);

    return {
      shouldBlock: true,
      reason: `Boucle identique détectée: ${identicalCalls.length + 1}x en ${Math.round(LOOP_WINDOW_MS/1000)}s`,
      loopType: 'identical',
      suggestion: getSuggestion('identical', toolName, toolInput),
    };
  }

  // === CHECK 2: Similar calls (same tool, similar input) ===
  const similarCalls = recentCalls.filter(c => {
    if (c.toolName !== toolName) return false;
    const similarity = calculateSimilarity(c.normalized, normalized);
    return similarity >= SIMILARITY_THRESHOLD;
  });

  if (similarCalls.length >= MAX_SIMILAR_CALLS) {
    const loop = {
      type: 'similar',
      toolName,
      pattern: normalized.slice(0, 100),
      count: similarCalls.length + 1,
      similarity: SIMILARITY_THRESHOLD,
      timestamp: now,
    };
    state.loops.push(loop);
    state.tripCount++;
    state.lastTrip = now;
    state.calls.push(call);
    saveState(state);

    return {
      shouldBlock: true,
      reason: `Boucle similaire détectée: ${similarCalls.length + 1}x appels ${toolName} similaires`,
      loopType: 'similar',
      suggestion: getSuggestion('similar', toolName, toolInput),
    };
  }

  // === CHECK 3: Polling pattern with no progress ===
  if (call.isPolling) {
    const pollingCalls = recentCalls.filter(c => c.isPolling && c.toolName === toolName);

    // Lower threshold for polling (2 calls)
    if (pollingCalls.length >= 2) {
      const loop = {
        type: 'polling',
        toolName,
        pattern: normalized.slice(0, 100),
        count: pollingCalls.length + 1,
        timestamp: now,
      };
      state.loops.push(loop);
      state.tripCount++;
      state.lastTrip = now;
      state.calls.push(call);
      saveState(state);

      return {
        shouldBlock: true,
        reason: `Polling répétitif détecté: ${pollingCalls.length + 1}x vérifications`,
        loopType: 'polling',
        suggestion: getSuggestion('polling', toolName, toolInput),
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

module.exports = {
  checkAndRecord,
  reset,
  getStats,
  // Constants for testing
  MAX_IDENTICAL_CALLS,
  MAX_SIMILAR_CALLS,
  LOOP_WINDOW_MS,
  SIMILARITY_THRESHOLD,
};
