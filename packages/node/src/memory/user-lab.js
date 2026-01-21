/**
 * User Lab - Per-user isolated context (Layer 4)
 *
 * Each user/node has a dedicated "lab" with:
 * - Personal preferences
 * - Project-specific patterns
 * - Judgment history
 * - Local calibration
 *
 * @module @cynic/node/memory/user-lab
 */

'use strict';

import { FileStorage, MemoryStorage } from '../state/storage.js';

/**
 * Fibonacci limits for lab storage
 */
const LIMITS = {
  MAX_JUDGMENTS: 377,       // F(14)
  MAX_PATTERNS: 89,         // F(11)
  MAX_FEEDBACK: 55,         // F(10)
};

/**
 * UserLab - Isolated context and learnings per user/node
 */
export class UserLab {
  /**
   * @param {Object} options
   * @param {string} [options.labId] - Lab identifier
   * @param {string} [options.userId] - User identifier
   * @param {string} [options.nodeId] - Node identifier
   * @param {string} [options.dataDir] - Data directory for storage
   */
  constructor(options = {}) {
    this.labId = options.labId || this._generateLabId();
    this.userId = options.userId;
    this.nodeId = options.nodeId;

    // Isolated storage per lab
    this.storage = options.dataDir
      ? new FileStorage(`${options.dataDir}/${this.labId}`)
      : new MemoryStorage();

    // Lab-specific state
    this._preferences = {};
    this._projectPatterns = [];
    this._judgmentHistory = [];
    this._feedback = [];

    // Stats
    this.stats = {
      created: Date.now(),
      judgments: 0,
      feedbackGiven: 0,
      patternsLearned: 0,
      lastActive: Date.now(),
    };

    this.initialized = false;
  }

  /**
   * Initialize lab from storage
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const saved = await this.storage.get('lab_state');
      if (saved) {
        this._preferences = saved.preferences || {};
        this._projectPatterns = saved.patterns || [];
        this._judgmentHistory = saved.judgments || [];
        this._feedback = saved.feedback || [];
        this.stats = { ...this.stats, ...saved.stats };
      }
    } catch (err) {
      console.warn(`[UserLab:${this.labId}] Failed to load:`, err.message);
    }

    this.initialized = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all preferences
   * @returns {Object} Preferences
   */
  getPreferences() {
    return { ...this._preferences };
  }

  /**
   * Get a specific preference
   * @param {string} key - Preference key
   * @param {*} [defaultValue] - Default if not set
   * @returns {*} Preference value
   */
  getPreference(key, defaultValue = null) {
    return this._preferences[key] ?? defaultValue;
  }

  /**
   * Set a preference
   * @param {string} key - Preference key
   * @param {*} value - Value to set
   */
  setPreference(key, value) {
    this._preferences[key] = value;
    this.stats.lastActive = Date.now();
  }

  /**
   * Set multiple preferences
   * @param {Object} prefs - Preferences to set
   */
  setPreferences(prefs) {
    Object.assign(this._preferences, prefs);
    this.stats.lastActive = Date.now();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get project-specific patterns
   * @returns {Object[]} Patterns
   */
  getProjectPatterns() {
    return [...this._projectPatterns];
  }

  /**
   * Add a project pattern
   * @param {Object} pattern - Pattern to add
   */
  addProjectPattern(pattern) {
    const id = pattern.id || `lpat_${Date.now().toString(36)}`;

    this._projectPatterns.push({
      ...pattern,
      id,
      addedAt: Date.now(),
      useCount: 0,
    });

    this.stats.patternsLearned++;
    this.stats.lastActive = Date.now();

    // Prune if over limit
    if (this._projectPatterns.length > LIMITS.MAX_PATTERNS) {
      // Remove oldest, least-used
      this._projectPatterns.sort((a, b) =>
        (b.useCount || 0) - (a.useCount || 0) ||
        (b.addedAt || 0) - (a.addedAt || 0)
      );
      this._projectPatterns = this._projectPatterns.slice(0, LIMITS.MAX_PATTERNS);
    }
  }

  /**
   * Find relevant project patterns
   * @param {Object} item - Item to match
   * @param {number} [limit=5] - Max patterns
   * @returns {Object[]} Matching patterns
   */
  findRelevantPatterns(item, limit = 5) {
    const itemType = item?.type || 'unknown';
    const itemTags = item?.tags || [];

    return this._projectPatterns
      .filter(p => {
        // Type match
        if (p.applicableTo && !p.applicableTo.includes(itemType) && !p.applicableTo.includes('*')) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, limit);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JUDGMENT HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record a judgment
   * @param {Object} judgment - Judgment to record
   * @param {Object} item - Original item
   */
  recordJudgment(judgment, item) {
    this._judgmentHistory.push({
      id: judgment.id,
      itemType: item?.type,
      itemIdentifier: item?.identifier || item?.name,
      globalScore: judgment.global_score,
      verdict: judgment.verdict,
      timestamp: Date.now(),
    });

    this.stats.judgments++;
    this.stats.lastActive = Date.now();

    // Prune if over limit
    if (this._judgmentHistory.length > LIMITS.MAX_JUDGMENTS) {
      this._judgmentHistory.shift(); // Remove oldest
    }
  }

  /**
   * Get recent judgments
   * @param {number} [count=10] - Number to return
   * @returns {Object[]} Recent judgments
   */
  getRecentJudgments(count = 10) {
    return this._judgmentHistory.slice(-count);
  }

  /**
   * Get judgment by ID
   * @param {string} id - Judgment ID
   * @returns {Object|null} Judgment or null
   */
  getJudgment(id) {
    return this._judgmentHistory.find(j => j.id === id) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record feedback on a judgment
   * @param {Object} feedback - Feedback data
   */
  recordFeedback(feedback) {
    this._feedback.push({
      ...feedback,
      timestamp: Date.now(),
    });

    this.stats.feedbackGiven++;
    this.stats.lastActive = Date.now();

    // Prune if over limit
    if (this._feedback.length > LIMITS.MAX_FEEDBACK) {
      this._feedback.shift();
    }
  }

  /**
   * Get recent feedback
   * @param {number} [count=10] - Number to return
   * @returns {Object[]} Recent feedback
   */
  getRecentFeedback(count = 10) {
    return this._feedback.slice(-count);
  }

  /**
   * Get feedback for a specific judgment
   * @param {string} judgmentId - Judgment ID
   * @returns {Object|null} Feedback or null
   */
  getFeedbackForJudgment(judgmentId) {
    return this._feedback.find(f => f.judgmentId === judgmentId) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE & SYNC
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save lab state
   */
  async save() {
    try {
      await this.storage.set('lab_state', {
        labId: this.labId,
        userId: this.userId,
        nodeId: this.nodeId,
        preferences: this._preferences,
        patterns: this._projectPatterns,
        judgments: this._judgmentHistory,
        feedback: this._feedback,
        stats: this.stats,
        savedAt: Date.now(),
      });
    } catch (err) {
      console.warn(`[UserLab:${this.labId}] Failed to save:`, err.message);
    }
  }

  /**
   * Export lab for sync
   * @returns {Object} Exportable state
   */
  export() {
    return {
      labId: this.labId,
      userId: this.userId,
      nodeId: this.nodeId,
      preferences: this._preferences,
      patterns: this._projectPatterns.filter(p => (p.useCount || 0) >= 2), // Only proven patterns
      stats: this.stats,
      timestamp: Date.now(),
    };
  }

  /**
   * Import state (merge)
   * @param {Object} state - State to import
   */
  import(state) {
    // Merge preferences (prefer local)
    this._preferences = {
      ...state.preferences,
      ...this._preferences,
    };

    // Merge patterns (add missing)
    const existingIds = new Set(this._projectPatterns.map(p => p.id));
    for (const pattern of (state.patterns || [])) {
      if (!existingIds.has(pattern.id)) {
        this._projectPatterns.push({ ...pattern, importedFrom: 'sync' });
      }
    }

    // Update stats
    this.stats = {
      ...this.stats,
      ...state.stats,
      lastActive: Date.now(),
    };
  }

  /**
   * Get lab stats
   * @returns {Object} Stats
   */
  getStats() {
    return {
      labId: this.labId,
      userId: this.userId,
      nodeId: this.nodeId,
      ...this.stats,
      preferenceCount: Object.keys(this._preferences).length,
      patternCount: this._projectPatterns.length,
      judgmentCount: this._judgmentHistory.length,
      feedbackCount: this._feedback.length,
      initialized: this.initialized,
    };
  }

  /**
   * Clear lab data (use with caution!)
   */
  async clear() {
    this._preferences = {};
    this._projectPatterns = [];
    this._judgmentHistory = [];
    this._feedback = [];
    this.stats = {
      created: this.stats.created,
      judgments: 0,
      feedbackGiven: 0,
      patternsLearned: 0,
      lastActive: Date.now(),
    };
    await this.storage.clear();
  }

  _generateLabId() {
    return `lab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * LabManager - Manages multiple user labs
 */
export class LabManager {
  /**
   * @param {Object} options
   * @param {string} [options.dataDir] - Base data directory
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir || '.cynic/labs';
    this.labs = new Map();
    this.defaultLab = null;
  }

  /**
   * Get or create lab for user
   * @param {string} userId - User identifier
   * @returns {Promise<UserLab>} Lab instance
   */
  async getLabForUser(userId) {
    if (this.labs.has(userId)) {
      return this.labs.get(userId);
    }

    const lab = new UserLab({
      userId,
      dataDir: this.dataDir,
      labId: `lab_${userId}`,
    });

    await lab.initialize();
    this.labs.set(userId, lab);

    return lab;
  }

  /**
   * Get or create default lab (for anonymous/system use)
   * @returns {Promise<UserLab>} Default lab
   */
  async getDefaultLab() {
    if (!this.defaultLab) {
      this.defaultLab = new UserLab({
        userId: 'default',
        dataDir: this.dataDir,
        labId: 'lab_default',
      });
      await this.defaultLab.initialize();
    }
    return this.defaultLab;
  }

  /**
   * List all labs
   * @returns {Object[]} Lab info
   */
  listLabs() {
    return Array.from(this.labs.values()).map(lab => lab.getStats());
  }

  /**
   * Save all labs
   */
  async saveAll() {
    const savePromises = [];

    for (const lab of this.labs.values()) {
      savePromises.push(lab.save());
    }

    if (this.defaultLab) {
      savePromises.push(this.defaultLab.save());
    }

    await Promise.all(savePromises);
  }

  /**
   * Get lab count
   * @returns {number} Number of labs
   */
  get labCount() {
    return this.labs.size + (this.defaultLab ? 1 : 0);
  }
}

export default { UserLab, LabManager };
