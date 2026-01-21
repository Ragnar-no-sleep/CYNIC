/**
 * CYNIC Task Awareness System
 *
 * "Le chien accompagne, l'humain pilote" - The dog guides, the human drives
 *
 * CYNIC is conscious of each task and the user's objective.
 * It provides φ-based recommendations and awareness, but the USER decides.
 *
 * Philosophy shift: From "enforcer" to "advisor"
 * - INFORMS about task status
 * - RECOMMENDS based on φ-math
 * - ADAPTS to user preferences
 * - NEVER blocks aggressively (user is in control)
 *
 * @module cynic/lib/task-enforcer
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Import unified tracker and phi-math
let unifiedTracker;
let phiMath;
try {
  unifiedTracker = require('./unified-tracker.cjs');
  phiMath = require('./phi-math.cjs');
} catch (e) {
  // Fallback if not available
  unifiedTracker = null;
  phiMath = null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PHI_INV = phiMath?.PHI_INV || 0.618033988749895; // φ⁻¹ = 61.8% completion threshold

// =============================================================================
// PATHS
// =============================================================================

function getEnforcerDir() {
  // Use HOME for consistent location regardless of cwd
  // This fixes the issue where different hooks have different working directories
  const home = process.env.HOME || '/root';
  const dir = path.join(home, '.cynic', 'tracker');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getSessionTodoPath(sessionId) {
  return path.join(getEnforcerDir(), `${sessionId || 'default'}-todos.json`);
}

function getEnforcerStatePath(sessionId) {
  return path.join(getEnforcerDir(), `${sessionId || 'default'}-state.json`);
}

// =============================================================================
// TODO TRACKING
// =============================================================================

/**
 * Load todos for a session
 * @param {string} sessionId - Session identifier
 * @returns {Array} Todo items
 */
function loadTodos(sessionId) {
  const todoPath = getSessionTodoPath(sessionId);
  if (fs.existsSync(todoPath)) {
    try {
      return JSON.parse(fs.readFileSync(todoPath, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

/**
 * Save todos for a session
 * @param {string} sessionId - Session identifier
 * @param {Array} todos - Todo items
 */
function saveTodos(sessionId, todos) {
  const todoPath = getSessionTodoPath(sessionId);
  fs.writeFileSync(todoPath, JSON.stringify(todos, null, 2));
}

/**
 * Update todos from TodoWrite tool output
 * @param {string} sessionId - Session identifier
 * @param {Array} newTodos - New todo items from tool output
 */
function updateTodosFromTool(sessionId, newTodos) {
  if (!Array.isArray(newTodos)) return;

  // Transform to our format
  const todos = newTodos.map((t, idx) => ({
    id: `todo_${idx}`,
    content: t.content,
    status: t.status, // 'pending', 'in_progress', 'completed'
    activeForm: t.activeForm,
    createdAt: new Date().toISOString(),
  }));

  saveTodos(sessionId, todos);
}

/**
 * Get incomplete todos
 * @param {string} sessionId - Session identifier
 * @returns {Array} Incomplete todo items
 */
function getIncompleteTodos(sessionId) {
  const todos = loadTodos(sessionId);
  return todos.filter(t => t.status !== 'completed');
}

/**
 * Calculate completion percentage
 * @param {string} sessionId - Session identifier
 * @returns {number} Completion percentage (0-1)
 */
function getCompletionRate(sessionId) {
  const todos = loadTodos(sessionId);
  if (todos.length === 0) return 1; // No todos = complete

  const completed = todos.filter(t => t.status === 'completed').length;
  return completed / todos.length;
}

// =============================================================================
// ENFORCER STATE
// =============================================================================

/**
 * Load enforcer state
 * @param {string} sessionId - Session identifier
 * @returns {Object} Enforcer state
 */
function loadEnforcerState(sessionId) {
  const statePath = getEnforcerStatePath(sessionId);
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch (e) {
      return createDefaultState();
    }
  }
  return createDefaultState();
}

/**
 * Save enforcer state
 * @param {string} sessionId - Session identifier
 * @param {Object} state - Enforcer state
 */
function saveEnforcerState(sessionId, state) {
  const statePath = getEnforcerStatePath(sessionId);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function createDefaultState() {
  return {
    active: true, // Advisor is active by default
    advisoryMode: true, // TRUE = advise only, FALSE = enforce (legacy)
    blockCount: 0, // How many times we've advised
    maxBlocks: 3, // Max advisories before stopping
    lastBlockReason: null,
    userObjective: null, // The user's high-level goal
    createdAt: new Date().toISOString(),
  };
}

/**
 * Set enforcer active state
 * @param {string} sessionId - Session identifier
 * @param {boolean} active - Whether enforcer is active
 */
function setEnforcerActive(sessionId, active) {
  const state = loadEnforcerState(sessionId);
  state.active = active;
  saveEnforcerState(sessionId, state);
}

/**
 * Check if enforcer is active
 * @param {string} sessionId - Session identifier
 * @returns {boolean} Whether enforcer is active
 */
function isEnforcerActive(sessionId) {
  const state = loadEnforcerState(sessionId);
  return state.active;
}

// =============================================================================
// CONTINUATION ENFORCEMENT
// =============================================================================

/**
 * Check task awareness and provide recommendations
 *
 * In ADVISORY MODE (default): Informs about status, never blocks
 * In ENFORCE MODE (legacy): Can block if completion < φ⁻¹
 *
 * @param {string} sessionId - Session identifier
 * @returns {Object} Awareness report with recommendations
 */
function shouldBlockStop(sessionId) {
  const state = loadEnforcerState(sessionId);

  // Advisor disabled
  if (!state.active) {
    return { block: false };
  }

  const incompleteTodos = getIncompleteTodos(sessionId);
  const completionRate = getCompletionRate(sessionId);

  // No incomplete todos - clean exit
  if (incompleteTodos.length === 0) {
    return {
      block: false,
      reason: '*tail wag* All tasks completed! Session was productive.',
    };
  }

  // Get φ-based analysis
  const analysis = phiMath
    ? phiMath.analyzeCompletion(completionRate)
    : {
        can_stop: completionRate >= PHI_INV,
        emoji: completionRate >= PHI_INV ? '*sniff*' : '*head tilt*',
        message: `${Math.round(completionRate * 100)}% complete`,
      };

  // Get recommendations
  const recommendations = unifiedTracker?.getRecommendations() || {};

  const todoList = incompleteTodos
    .map(t => `   • [${t.status}] ${t.content}`)
    .join('\n');

  // Build awareness report
  const report = {
    completionRate,
    incompleteTodos,
    analysis,
    recommendations,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ADVISORY MODE (default): Inform but don't block
  // ═══════════════════════════════════════════════════════════════════════════
  if (state.advisoryMode !== false) {
    // Always allow stop, but provide context
    return {
      block: false,
      reason: buildAdvisoryMessage(report),
      report,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENFORCE MODE (legacy): Can block if below threshold
  // ═══════════════════════════════════════════════════════════════════════════

  // Max blocks reached - give up gracefully
  if (state.blockCount >= state.maxBlocks) {
    return {
      block: false,
      reason: `*yawn* Advised ${state.blockCount} times. Respecting your decision.`,
      report,
    };
  }

  // Below threshold - block in enforce mode
  if (!analysis.can_stop) {
    state.blockCount++;
    state.lastBlockReason = `${incompleteTodos.length} todos incomplete`;
    saveEnforcerState(sessionId, state);

    return {
      block: true,
      reason: `${analysis.emoji} ${analysis.message}`,
      injectPrompt: buildEnforcePrompt(report, todoList),
      report,
    };
  }

  // Above threshold - allow with info
  return {
    block: false,
    reason: `${analysis.emoji} ${analysis.message}`,
    report,
  };
}

/**
 * Build advisory message (informative, not blocking)
 */
function buildAdvisoryMessage(report) {
  const { completionRate, incompleteTodos, analysis, recommendations } = report;
  const percent = Math.round(completionRate * 100);

  let msg = `${analysis.emoji} Session Summary: ${percent}% complete`;

  if (incompleteTodos.length > 0) {
    msg += `\n   ${incompleteTodos.length} task(s) remain:`;
    for (const t of incompleteTodos.slice(0, 3)) {
      msg += `\n   • ${t.content}`;
    }
    if (incompleteTodos.length > 3) {
      msg += `\n   ... and ${incompleteTodos.length - 3} more`;
    }
  }

  if (recommendations.advice) {
    msg += `\n\n${recommendations.advice}`;
  }

  return msg;
}

/**
 * Build enforce prompt (legacy blocking mode)
 */
function buildEnforcePrompt(report, todoList) {
  const { analysis, recommendations } = report;

  return `TASK AWARENESS

${analysis.emoji} ${analysis.message}

REMAINING TASKS:
${todoList}
${recommendations.immediate ? `
RECOMMENDED: "${recommendations.immediate.content}"` : ''}

The user is in control. Ask if they want to continue or stop.`;
}

/**
 * Clean up enforcer data for a session
 * @param {string} sessionId - Session identifier
 */
function cleanupSession(sessionId) {
  const todoPath = getSessionTodoPath(sessionId);
  const statePath = getEnforcerStatePath(sessionId);

  try {
    if (fs.existsSync(todoPath)) fs.unlinkSync(todoPath);
    if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  } catch (e) {
    // Ignore cleanup errors
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  PHI_INV,

  // Paths
  getEnforcerDir,
  getSessionTodoPath,

  // Todo tracking
  loadTodos,
  saveTodos,
  updateTodosFromTool,
  getIncompleteTodos,
  getCompletionRate,

  // State management
  loadEnforcerState,
  saveEnforcerState,
  setEnforcerActive,
  isEnforcerActive,

  // Enforcement
  shouldBlockStop,
  cleanupSession,
};
