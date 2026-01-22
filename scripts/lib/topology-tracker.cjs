/**
 * CYNIC Topology Tracker Module
 *
 * "Le chien garde le chemin" - κυνικός
 *
 * Tracks task topology and detects rabbit holes.
 * Maintains awareness of where we are in the task tree.
 *
 * Features:
 *   - Task tree with parent/child relationships
 *   - Depth tracking (φ-scaled warnings)
 *   - Relevance scoring to main goal
 *   - Rabbit hole detection
 *   - Explicit /explore mode support
 *   - Breadcrumb trail for returning
 *
 * @module cynic/lib/topology-tracker
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

/** Safe depth - no warnings */
const DEPTH_SAFE = Math.round(PHI); // 2 levels

/** Warning depth - gentle nudge */
const DEPTH_WARNING = Math.round(PHI * 2); // 3 levels

/** Critical depth - strong intervention */
const DEPTH_CRITICAL = Math.round(PHI * 3); // 5 levels

/** Max depth before forced return */
const DEPTH_MAX = Math.round(PHI * 4); // 6 levels

/** Relevance decay per depth level */
const RELEVANCE_DECAY = PHI_INV_2; // ~38.2% per level

/** Min relevance before rabbit hole warning */
const RELEVANCE_MIN = PHI_INV_3; // ~23.6%

/** Time in minutes before stale task warning */
const STALE_TASK_MIN = PHI_INV * 30; // ~18.5 minutes

/** Max explore mode duration in minutes */
const EXPLORE_MAX_MIN = PHI_INV * 60; // ~37 minutes

// =============================================================================
// STORAGE
// =============================================================================

const TOPOLOGY_DIR = path.join(os.homedir(), '.cynic', 'topology');
const TREE_FILE = path.join(TOPOLOGY_DIR, 'tree.json');
const HISTORY_FILE = path.join(TOPOLOGY_DIR, 'history.jsonl');

// =============================================================================
// DATA STRUCTURES
// =============================================================================

/**
 * Create a task node
 * @param {string} id - Unique task ID
 * @param {string} description - Task description
 * @param {string|null} parentId - Parent task ID
 * @returns {Object} Task node
 */
function createTaskNode(id, description, parentId = null) {
  return {
    id,
    description,
    parentId,
    children: [],
    depth: 0,
    relevance: 1.0,
    status: 'active', // active | completed | abandoned
    createdAt: Date.now(),
    updatedAt: Date.now(),
    timeSpent: 0,
    keywords: extractKeywords(description),
  };
}

/**
 * Extract keywords from description for relevance matching
 * @param {string} description - Task description
 * @returns {Array} Keywords
 */
function extractKeywords(description) {
  if (!description) return [];

  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !['this', 'that', 'with', 'from', 'have', 'will', 'should'].includes(w));
}

// =============================================================================
// STATE
// =============================================================================

const topologyState = {
  // Task tree
  rootTask: null,
  currentTask: null,
  tasks: new Map(),

  // Explore mode
  exploreMode: false,
  exploreStartTime: null,
  exploreReason: null,

  // Breadcrumbs for navigation
  breadcrumbs: [],

  // Stats
  stats: {
    maxDepthReached: 0,
    rabbitHolesDetected: 0,
    tasksCompleted: 0,
    tasksAbandoned: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(TOPOLOGY_DIR)) {
    fs.mkdirSync(TOPOLOGY_DIR, { recursive: true });
  }
}

function loadTree() {
  ensureDir();
  if (!fs.existsSync(TREE_FILE)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(TREE_FILE, 'utf8'));
    // Reconstruct Map from array
    if (data.tasks) {
      topologyState.tasks = new Map(data.tasks);
    }
    return data;
  } catch {
    return null;
  }
}

function saveTree() {
  ensureDir();
  fs.writeFileSync(TREE_FILE, JSON.stringify({
    rootTask: topologyState.rootTask,
    currentTask: topologyState.currentTask,
    tasks: Array.from(topologyState.tasks.entries()),
    exploreMode: topologyState.exploreMode,
    exploreStartTime: topologyState.exploreStartTime,
    exploreReason: topologyState.exploreReason,
    breadcrumbs: topologyState.breadcrumbs,
    stats: topologyState.stats,
    updatedAt: Date.now(),
  }, null, 2));
}

function appendHistory(event) {
  ensureDir();
  const line = JSON.stringify({ ...event, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(HISTORY_FILE, line);
}

// =============================================================================
// RELEVANCE CALCULATION
// =============================================================================

/**
 * Calculate relevance of current task to root goal
 * @param {Object} task - Current task
 * @returns {number} Relevance score (0-1)
 */
function calculateRelevance(task) {
  if (!task || !topologyState.rootTask) return 1.0;

  const root = topologyState.tasks.get(topologyState.rootTask);
  if (!root) return 1.0;

  // Base relevance from depth
  const depthFactor = Math.pow(1 - RELEVANCE_DECAY, task.depth);

  // Keyword overlap with root
  const rootKeywords = new Set(root.keywords);
  const taskKeywords = task.keywords;
  const overlap = taskKeywords.filter(k => rootKeywords.has(k)).length;
  const keywordFactor = taskKeywords.length > 0
    ? overlap / taskKeywords.length
    : PHI_INV; // Default if no keywords

  // Combined relevance
  return Math.max(0, Math.min(1, depthFactor * (0.5 + 0.5 * keywordFactor)));
}

/**
 * Check if current task is a rabbit hole
 * @returns {Object|null} Rabbit hole detection or null
 */
function detectRabbitHole() {
  const task = topologyState.tasks.get(topologyState.currentTask);
  if (!task) return null;

  // In explore mode - different rules
  if (topologyState.exploreMode) {
    const exploreTime = (Date.now() - topologyState.exploreStartTime) / (1000 * 60);
    if (exploreTime > EXPLORE_MAX_MIN) {
      return {
        type: 'explore_timeout',
        depth: task.depth,
        relevance: task.relevance,
        timeInExplore: Math.round(exploreTime),
        suggestion: `Exploration dépassée (${Math.round(exploreTime)} min). Temps de revenir au sujet principal.`,
      };
    }
    return null; // Explore mode - no other rabbit hole checks
  }

  // Check depth
  if (task.depth >= DEPTH_CRITICAL) {
    return {
      type: 'depth',
      depth: task.depth,
      relevance: task.relevance,
      suggestion: `Profondeur ${task.depth} atteinte. Consider returning to: ${getBreadcrumbSummary()}`,
    };
  }

  // Check relevance
  if (task.relevance < RELEVANCE_MIN) {
    return {
      type: 'relevance',
      depth: task.depth,
      relevance: task.relevance,
      suggestion: `Relevance dropped to ${Math.round(task.relevance * 100)}%. Is this still related to the main goal?`,
    };
  }

  // Check time on task
  const timeOnTask = (Date.now() - task.createdAt) / (1000 * 60);
  if (timeOnTask > STALE_TASK_MIN && task.status === 'active') {
    return {
      type: 'stale',
      depth: task.depth,
      relevance: task.relevance,
      timeOnTask: Math.round(timeOnTask),
      suggestion: `${Math.round(timeOnTask)} minutes on this subtask. Making progress?`,
    };
  }

  return null;
}

/**
 * Get breadcrumb summary for navigation help
 * @returns {string} Breadcrumb path
 */
function getBreadcrumbSummary() {
  if (topologyState.breadcrumbs.length === 0) return 'root';

  return topologyState.breadcrumbs
    .slice(-3) // Last 3 for brevity
    .map(id => {
      const task = topologyState.tasks.get(id);
      return task ? task.description.slice(0, 30) : id;
    })
    .join(' → ');
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize topology tracker
 */
function init() {
  ensureDir();
  const saved = loadTree();
  if (saved) {
    topologyState.rootTask = saved.rootTask;
    topologyState.currentTask = saved.currentTask;
    topologyState.exploreMode = saved.exploreMode || false;
    topologyState.exploreStartTime = saved.exploreStartTime;
    topologyState.exploreReason = saved.exploreReason;
    topologyState.breadcrumbs = saved.breadcrumbs || [];
    topologyState.stats = saved.stats || topologyState.stats;
  }
}

/**
 * Start a new root task (main goal)
 * @param {string} description - Task description
 * @returns {Object} Root task
 */
function startRootTask(description) {
  const id = `root_${Date.now()}`;
  const task = createTaskNode(id, description, null);

  topologyState.tasks.set(id, task);
  topologyState.rootTask = id;
  topologyState.currentTask = id;
  topologyState.breadcrumbs = [id];

  appendHistory({ event: 'root_started', taskId: id, description });
  saveTree();

  return task;
}

/**
 * Push a subtask (go deeper)
 * @param {string} description - Subtask description
 * @returns {Object} New task with depth info
 */
function pushTask(description) {
  const parentId = topologyState.currentTask;
  const parent = topologyState.tasks.get(parentId);

  const id = `task_${Date.now()}`;
  const task = createTaskNode(id, description, parentId);

  // Calculate depth and relevance
  task.depth = parent ? parent.depth + 1 : 0;
  task.relevance = calculateRelevance(task);

  // Update parent
  if (parent) {
    parent.children.push(id);
    parent.updatedAt = Date.now();
  }

  topologyState.tasks.set(id, task);
  topologyState.currentTask = id;
  topologyState.breadcrumbs.push(id);

  // Update stats
  if (task.depth > topologyState.stats.maxDepthReached) {
    topologyState.stats.maxDepthReached = task.depth;
  }

  appendHistory({ event: 'task_pushed', taskId: id, depth: task.depth, relevance: task.relevance });
  saveTree();

  // Check for rabbit hole
  const rabbitHole = detectRabbitHole();
  if (rabbitHole) {
    topologyState.stats.rabbitHolesDetected++;
  }

  return {
    task,
    depth: task.depth,
    relevance: task.relevance,
    depthStatus: task.depth <= DEPTH_SAFE ? 'safe' :
                 task.depth <= DEPTH_WARNING ? 'warning' : 'critical',
    rabbitHole,
  };
}

/**
 * Pop current task (go back up)
 * @param {string} status - Completion status (completed | abandoned)
 * @returns {Object|null} Parent task or null if at root
 */
function popTask(status = 'completed') {
  const current = topologyState.tasks.get(topologyState.currentTask);
  if (!current) return null;

  // Update current task
  current.status = status;
  current.updatedAt = Date.now();
  current.timeSpent = Date.now() - current.createdAt;

  // Update stats
  if (status === 'completed') {
    topologyState.stats.tasksCompleted++;
  } else {
    topologyState.stats.tasksAbandoned++;
  }

  // Go back to parent
  const parentId = current.parentId;
  if (!parentId) {
    // At root - can't go higher
    return null;
  }

  topologyState.currentTask = parentId;
  topologyState.breadcrumbs.pop();

  appendHistory({ event: 'task_popped', taskId: current.id, status });
  saveTree();

  return topologyState.tasks.get(parentId);
}

/**
 * Enter explore mode (intentional tangent)
 * @param {string} reason - Why exploring
 */
function enterExploreMode(reason) {
  topologyState.exploreMode = true;
  topologyState.exploreStartTime = Date.now();
  topologyState.exploreReason = reason;

  appendHistory({ event: 'explore_started', reason });
  saveTree();
}

/**
 * Exit explore mode
 */
function exitExploreMode() {
  const duration = topologyState.exploreStartTime
    ? (Date.now() - topologyState.exploreStartTime) / (1000 * 60)
    : 0;

  topologyState.exploreMode = false;
  topologyState.exploreStartTime = null;
  topologyState.exploreReason = null;

  appendHistory({ event: 'explore_ended', duration: Math.round(duration) });
  saveTree();
}

/**
 * Get current topology state
 * @returns {Object} Current state
 */
function getState() {
  const current = topologyState.tasks.get(topologyState.currentTask);
  const root = topologyState.tasks.get(topologyState.rootTask);

  return {
    rootTask: root ? { id: root.id, description: root.description } : null,
    currentTask: current ? {
      id: current.id,
      description: current.description,
      depth: current.depth,
      relevance: current.relevance,
      status: current.status,
    } : null,
    depth: current?.depth || 0,
    relevance: current?.relevance || 1.0,
    depthStatus: !current ? 'safe' :
                 current.depth <= DEPTH_SAFE ? 'safe' :
                 current.depth <= DEPTH_WARNING ? 'warning' : 'critical',
    exploreMode: topologyState.exploreMode,
    exploreReason: topologyState.exploreReason,
    breadcrumbs: getBreadcrumbSummary(),
    rabbitHole: detectRabbitHole(),
    stats: topologyState.stats,
  };
}

/**
 * Format topology for display
 * @returns {string} Formatted topology
 */
function formatTopology() {
  const state = getState();

  let status = '';

  // Depth indicator
  const depthBar = '█'.repeat(Math.min(state.depth, 6)) + '░'.repeat(6 - Math.min(state.depth, 6));
  status += `Depth: [${depthBar}] ${state.depth}/${DEPTH_MAX}`;

  // Relevance
  if (state.relevance < 1.0) {
    status += ` | Relevance: ${Math.round(state.relevance * 100)}%`;
  }

  // Explore mode
  if (state.exploreMode) {
    const exploreMin = Math.round((Date.now() - topologyState.exploreStartTime) / (1000 * 60));
    status += ` | 🔍 EXPLORE (${exploreMin}/${Math.round(EXPLORE_MAX_MIN)} min)`;
  }

  // Rabbit hole warning
  if (state.rabbitHole) {
    const emoji = state.rabbitHole.type === 'depth' ? '🐰' :
                  state.rabbitHole.type === 'relevance' ? '🌀' : '⏰';
    status += `\n   ${emoji} ${state.rabbitHole.suggestion}`;
  }

  return status;
}

/**
 * Reset topology (new session)
 */
function resetTopology() {
  topologyState.rootTask = null;
  topologyState.currentTask = null;
  topologyState.tasks.clear();
  topologyState.exploreMode = false;
  topologyState.exploreStartTime = null;
  topologyState.exploreReason = null;
  topologyState.breadcrumbs = [];

  saveTree();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  DEPTH_SAFE,
  DEPTH_WARNING,
  DEPTH_CRITICAL,
  DEPTH_MAX,
  RELEVANCE_MIN,
  EXPLORE_MAX_MIN,

  // Core functions
  init,
  startRootTask,
  pushTask,
  popTask,
  enterExploreMode,
  exitExploreMode,
  getState,
  formatTopology,
  resetTopology,

  // Helpers
  detectRabbitHole,
  getBreadcrumbSummary,
  calculateRelevance,
};
