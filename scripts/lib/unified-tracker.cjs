/**
 * CYNIC Unified Task Tracker
 *
 * "φ guides all progress, doubt guides all decisions" - κυνικός
 *
 * A self-aware task tracking system that:
 * - Maintains deep understanding of WHY tasks exist
 * - Asks questions when uncertain
 * - Adapts to each user and session context
 * - Integrates with GitHub ecosystem
 * - Uses φ-based harmonious mathematics
 *
 * @module cynic/lib/unified-tracker
 */

'use strict';

const fs = require('fs');
const path = require('path');
const phiMath = require('./phi-math.cjs');

// =============================================================================
// CONSTANTS
// =============================================================================

const { PHI, PHI_INV, PHI_INV_2 } = phiMath;

// Doubt threshold - below this confidence, ask questions
const DOUBT_THRESHOLD = PHI_INV; // 61.8% - "φ distrusts φ"

// =============================================================================
// PATHS (Unified - always same location)
// =============================================================================

function getTrackerDir() {
  const home = process.env.HOME || '/root';
  const dir = path.join(home, '.cynic', 'tracker');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getTrackerStatePath() {
  return path.join(getTrackerDir(), 'state.json');
}

function getUserProfilePath(userId) {
  return path.join(getTrackerDir(), `user-${userId || 'default'}.json`);
}

function getSessionPath(sessionId) {
  return path.join(getTrackerDir(), `session-${sessionId || 'current'}.json`);
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

function createDefaultState() {
  return {
    version: 1,
    tasks: [],
    insights: [],
    doubts: [],        // Questions CYNIC wants to ask
    adaptations: {},   // User-specific adaptations
    ecosystem: {
      projects: [],
      lastSync: null,
    },
    github: {
      synced: false,
      lastSync: null,
      issues: [],
      prs: [],
    },
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function loadState() {
  const statePath = getTrackerStatePath();
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch (e) {
      console.error('[Tracker] Failed to load state:', e.message);
    }
  }
  return createDefaultState();
}

function saveState(state) {
  const statePath = getTrackerStatePath();
  state.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// =============================================================================
// USER ADAPTATION
// =============================================================================

function createDefaultUserProfile() {
  return {
    userId: null,
    preferences: {
      verbosity: 'normal',      // minimal, normal, detailed
      askBeforeStop: true,      // Ask questions before stopping
      phiRecommendations: true, // Show φ-based recommendations
    },
    patterns: {
      preferredWorkingHours: null,
      averageTaskDuration: null,
      completionStyle: 'steady', // steady, burst, iterative
    },
    history: {
      sessions: 0,
      tasksCompleted: 0,
      avgCompletionRate: 0,
    },
    learnings: [],
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function loadUserProfile(userId) {
  const profilePath = getUserProfilePath(userId);
  if (fs.existsSync(profilePath)) {
    try {
      return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    } catch (e) {
      console.error('[Tracker] Failed to load user profile:', e.message);
    }
  }
  const profile = createDefaultUserProfile();
  profile.userId = userId;
  return profile;
}

function saveUserProfile(profile) {
  const profilePath = getUserProfilePath(profile.userId);
  profile.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
}

/**
 * Adapt CYNIC's behavior based on user profile
 * @param {Object} profile - User profile
 * @returns {Object} Adaptation settings
 */
function adaptToUser(profile) {
  const adaptations = {
    // Communication style
    verbosity: profile.preferences?.verbosity || 'normal',
    useEmoji: true,

    // Decision making
    askThreshold: profile.preferences?.askBeforeStop ? DOUBT_THRESHOLD : 0,
    autoComplete: !profile.preferences?.askBeforeStop,

    // Recommendations
    showHarmony: profile.preferences?.phiRecommendations ?? true,
    showPriorities: true,

    // Based on history
    trustLevel: calculateTrustLevel(profile),
  };

  return adaptations;
}

function calculateTrustLevel(profile) {
  const sessions = profile.history?.sessions || 0;
  const avgRate = profile.history?.avgCompletionRate || 0;

  // φ-based trust calculation
  // More sessions + higher completion = more trust
  const sessionWeight = Math.min(sessions / 10, 1) * PHI_INV;
  const rateWeight = avgRate * PHI_INV_2;

  return Math.min(1, sessionWeight + rateWeight);
}

// =============================================================================
// TASK MANAGEMENT
// =============================================================================

/**
 * Create a task with deep context
 * @param {Object} params - Task parameters
 * @returns {Object} Task object
 */
function createTask(params) {
  const {
    content,
    activeForm,
    status = 'pending',
    source = 'session',
    context = {},
    why = null,  // Why does this task exist?
  } = params;

  return {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    content,
    activeForm: activeForm || content,
    status,
    source,
    context: {
      createdAt: new Date().toISOString(),
      project: context.project || detectCurrentProject(),
      sessionId: context.sessionId,
      parentTask: context.parentTask,
      ...context,
    },
    why,  // "φ understands why"
    priority: params.priority || 50,
    effort: params.effort || phiMath.EFFORT_MAP.medium,
    confidence: params.confidence || 1.0,  // How confident are we this task is right?
  };
}

function detectCurrentProject() {
  try {
    const cwd = process.cwd();
    const parts = cwd.split(path.sep);
    // Find project name (usually after 'workspaces' or in git root)
    const wsIdx = parts.indexOf('workspaces');
    if (wsIdx !== -1 && parts[wsIdx + 1]) {
      return parts[wsIdx + 1];
    }
    // Check for package.json
    const pkgPath = path.join(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.name;
    }
  } catch (e) {
    // Ignore
  }
  return 'unknown';
}

// =============================================================================
// DOUBT SYSTEM - "φ distrusts φ"
// =============================================================================

/**
 * Record a doubt that CYNIC wants to clarify
 * @param {Object} params - Doubt parameters
 */
function recordDoubt(params) {
  const state = loadState();

  const doubt = {
    id: `doubt_${Date.now()}`,
    question: params.question,
    context: params.context,
    severity: params.severity || 'normal', // low, normal, high
    relatedTaskId: params.taskId,
    createdAt: new Date().toISOString(),
    resolved: false,
    resolution: null,
  };

  state.doubts.push(doubt);
  saveState(state);

  return doubt;
}

/**
 * Get unresolved doubts
 * @returns {Array} Unresolved doubts
 */
function getUnresolvedDoubts() {
  const state = loadState();
  return state.doubts.filter(d => !d.resolved);
}

/**
 * Check if CYNIC should ask a question before proceeding
 * @param {Object} context - Current context
 * @param {Object} userProfile - User profile for adaptation
 * @returns {Object|null} Question to ask, or null
 */
function shouldAsk(context, userProfile) {
  const adaptations = adaptToUser(userProfile);

  // Check confidence level
  if (context.confidence && context.confidence < adaptations.askThreshold) {
    return {
      reason: 'low_confidence',
      question: generateQuestion(context, 'confidence'),
    };
  }

  // Check for ambiguity
  if (context.ambiguous) {
    return {
      reason: 'ambiguous',
      question: generateQuestion(context, 'ambiguity'),
    };
  }

  // Check completion rate before stopping
  if (context.action === 'stop') {
    const state = loadState();
    const completion = phiMath.analyzeCompletion(
      context.completionRate || getCompletionRate(state)
    );

    if (!completion.can_stop && adaptations.askThreshold > 0) {
      return {
        reason: 'incomplete_tasks',
        question: `${completion.emoji} ${completion.message}\n\nDo you want to continue working, or stop anyway?`,
      };
    }
  }

  return null;
}

function generateQuestion(context, type) {
  switch (type) {
    case 'confidence':
      return `*head tilt* I'm only ${Math.round((context.confidence || 0) * 100)}% confident about this.\n` +
             `Should I proceed with "${context.action || 'this task'}", or would you like to clarify?`;

    case 'ambiguity':
      return `*sniff* I detected ambiguity in the request.\n` +
             `Options I see:\n${context.options?.map((o, i) => `  ${i + 1}. ${o}`).join('\n') || '  (none clear)'}\n` +
             `Which approach do you prefer?`;

    default:
      return `*ears perk* I have a question before proceeding: ${context.question || 'Is this correct?'}`;
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

function createSession(userId) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const session = {
    id: sessionId,
    userId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    tasks: [],
    doubtsRaised: 0,
    doubtsResolved: 0,
    adaptations: {},
    stats: {
      tasksCreated: 0,
      tasksCompleted: 0,
      toolCalls: 0,
    },
  };

  const sessionPath = getSessionPath(sessionId);
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));

  // Also update current session link
  const currentPath = getSessionPath('current');
  fs.writeFileSync(currentPath, JSON.stringify({ activeSessionId: sessionId }, null, 2));

  return session;
}

function loadCurrentSession() {
  const currentPath = getSessionPath('current');
  if (fs.existsSync(currentPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
      if (current.activeSessionId) {
        return loadSession(current.activeSessionId);
      }
    } catch (e) {
      // Ignore
    }
  }
  return null;
}

function loadSession(sessionId) {
  const sessionPath = getSessionPath(sessionId);
  if (fs.existsSync(sessionPath)) {
    try {
      return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    } catch (e) {
      // Ignore
    }
  }
  return null;
}

function saveSession(session) {
  const sessionPath = getSessionPath(session.id);
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
}

// =============================================================================
// TASK OPERATIONS
// =============================================================================

/**
 * Update tasks from TodoWrite tool
 * @param {Array} todos - Todos from tool
 * @param {string} sessionId - Current session ID
 */
function updateFromTodoWrite(todos, sessionId) {
  if (!Array.isArray(todos)) return;

  const state = loadState();
  const session = loadSession(sessionId) || loadCurrentSession();

  // Transform and merge tasks
  const newTasks = todos.map((t, idx) => {
    const existing = state.tasks.find(
      task => task.content === t.content && task.source === 'todowrite'
    );

    if (existing) {
      // Update existing task
      existing.status = t.status;
      existing.activeForm = t.activeForm;
      return existing;
    }

    // Create new task
    return createTask({
      content: t.content,
      activeForm: t.activeForm,
      status: t.status,
      source: 'todowrite',
      context: { sessionId: session?.id },
    });
  });

  // Replace TodoWrite tasks (keeps other sources intact)
  state.tasks = [
    ...state.tasks.filter(t => t.source !== 'todowrite'),
    ...newTasks,
  ];

  saveState(state);

  // Update session stats
  if (session) {
    session.tasks = newTasks.map(t => t.id);
    session.stats.tasksCreated = newTasks.length;
    session.stats.tasksCompleted = newTasks.filter(t => t.status === 'completed').length;
    saveSession(session);
  }
}

/**
 * Get tasks for current session
 * @param {string} sessionId - Session ID
 * @returns {Array} Tasks
 */
function getSessionTasks(sessionId) {
  const state = loadState();
  const session = loadSession(sessionId) || loadCurrentSession();

  if (session && session.tasks) {
    return state.tasks.filter(t => session.tasks.includes(t.id));
  }

  // Fallback: return TodoWrite tasks
  return state.tasks.filter(t => t.source === 'todowrite');
}

/**
 * Get completion rate
 * @param {Object} [state] - State object (loads if not provided)
 * @returns {number} Completion rate (0-1)
 */
function getCompletionRate(state) {
  state = state || loadState();
  const todowriteTasks = state.tasks.filter(t => t.source === 'todowrite');

  if (todowriteTasks.length === 0) return 1;

  const completed = todowriteTasks.filter(t => t.status === 'completed').length;
  return completed / todowriteTasks.length;
}

/**
 * Get recommendations
 * @returns {Object} φ-based recommendations
 */
function getRecommendations() {
  const state = loadState();
  const todowriteTasks = state.tasks.filter(t => t.source === 'todowrite');

  return phiMath.generateRecommendations(todowriteTasks);
}

// =============================================================================
// GITHUB INTEGRATION
// =============================================================================

/**
 * Sync tasks from GitHub issues
 * @param {Object} params - Sync parameters
 * @param {string} params.owner - Repository owner
 * @param {string} params.repo - Repository name
 * @param {Array} params.issues - GitHub issues
 */
function syncFromGitHub({ owner, repo, issues }) {
  const state = loadState();

  for (const issue of issues) {
    const existingIdx = state.tasks.findIndex(
      t => t.source === 'github:issue' && t.context.issueNumber === issue.number
    );

    const task = createTask({
      content: issue.title,
      activeForm: `Working on: ${issue.title}`,
      status: issue.state === 'closed' ? 'completed' : 'pending',
      source: 'github:issue',
      context: {
        owner,
        repo,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        labels: issue.labels?.map(l => l.name),
      },
      why: issue.body?.slice(0, 200), // First 200 chars of issue body
      priority: phiMath.calculateIssuePriority(issue),
    });

    if (existingIdx !== -1) {
      state.tasks[existingIdx] = task;
    } else {
      state.tasks.push(task);
    }
  }

  state.github.synced = true;
  state.github.lastSync = new Date().toISOString();

  saveState(state);
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  DOUBT_THRESHOLD,

  // Paths
  getTrackerDir,
  getTrackerStatePath,

  // State
  loadState,
  saveState,
  createDefaultState,

  // User adaptation
  loadUserProfile,
  saveUserProfile,
  adaptToUser,

  // Tasks
  createTask,
  updateFromTodoWrite,
  getSessionTasks,
  getCompletionRate,
  getRecommendations,

  // Doubt system
  recordDoubt,
  getUnresolvedDoubts,
  shouldAsk,

  // Sessions
  createSession,
  loadCurrentSession,
  loadSession,
  saveSession,

  // GitHub
  syncFromGitHub,

  // Re-export phi-math for convenience
  phiMath,
};
