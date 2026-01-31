/**
 * ReasoningBank - Store and replay successful reasoning trajectories
 *
 * "Le chien se souvient des chemins réussis" - CYNIC remembers successful paths
 *
 * Stores state → action → outcome → reward sequences for trajectory learning.
 * Enables replay of good strategies for similar problems.
 *
 * Inspired by SAFLA's ReasoningBank architecture.
 *
 * @module @cynic/node/learning/reasoning-bank
 */

'use strict';

import { PHI_INV } from '@cynic/core';

/**
 * Trajectory types
 */
export const TrajectoryType = {
  JUDGMENT: 'judgment',           // Successful judgment reasoning
  PROBLEM_SOLVING: 'problem',     // Problem → solution path
  CODE_CHANGE: 'code',            // Code modification trajectory
  SECURITY_CHECK: 'security',     // Security validation path
  ERROR_RECOVERY: 'recovery',     // Error → fix trajectory
  DEPLOYMENT: 'deployment',       // Deployment decision path
};

/**
 * Outcome types for reward calculation
 */
export const OutcomeType = {
  SUCCESS: 'success',             // Positive outcome (+reward)
  FAILURE: 'failure',             // Negative outcome (-reward)
  PARTIAL: 'partial',             // Mixed outcome (partial reward)
  UNKNOWN: 'unknown',             // No feedback yet (neutral)
};

/**
 * Default configuration
 */
export const REASONING_BANK_CONFIG = {
  maxTrajectories: 1000,          // Max trajectories to store
  minConfidence: 0.5,             // Min confidence to store
  decayRate: 0.95,                // Reward decay per access (forgetting)
  similarityThreshold: 0.6,       // Min similarity for replay suggestion
  maxReplayAge: 30 * 24 * 3600000, // 30 days max age for replay
  compressionThreshold: 0.8,      // Compress similar trajectories above this
};

/**
 * Single state in a trajectory
 */
export class TrajectoryState {
  constructor(data = {}) {
    this.id = data.id || `state_${Date.now().toString(36)}`;
    this.type = data.type || 'generic';
    this.content = data.content || {};
    this.timestamp = data.timestamp || Date.now();
    this.features = data.features || [];    // For similarity matching
    this.metadata = data.metadata || {};
  }

  /**
   * Extract features for similarity comparison
   */
  extractFeatures() {
    const features = [];

    // Type feature
    features.push(`type:${this.type}`);

    // Content-based features
    if (this.content.tool) features.push(`tool:${this.content.tool}`);
    if (this.content.error) features.push(`error:${this.content.error.substring(0, 50)}`);
    if (this.content.file) features.push(`file:${this.content.file.split('/').pop()}`);
    if (this.content.language) features.push(`lang:${this.content.language}`);
    if (this.content.intent) features.push(`intent:${this.content.intent}`);

    this.features = features;
    return features;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      timestamp: this.timestamp,
      features: this.features,
      metadata: this.metadata,
    };
  }
}

/**
 * Single action in a trajectory
 */
export class TrajectoryAction {
  constructor(data = {}) {
    this.id = data.id || `action_${Date.now().toString(36)}`;
    this.type = data.type || 'generic';
    this.tool = data.tool || null;
    this.input = data.input || {};
    this.dog = data.dog || null;            // Which dog suggested/executed
    this.confidence = data.confidence || 0.5;
    this.timestamp = data.timestamp || Date.now();
    this.metadata = data.metadata || {};
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      tool: this.tool,
      input: this.input,
      dog: this.dog,
      confidence: this.confidence,
      timestamp: this.timestamp,
      metadata: this.metadata,
    };
  }
}

/**
 * Trajectory outcome
 */
export class TrajectoryOutcome {
  constructor(data = {}) {
    this.type = data.type || OutcomeType.UNKNOWN;
    this.success = data.success ?? null;
    this.error = data.error || null;
    this.feedback = data.feedback || null;
    this.metrics = data.metrics || {};      // Custom success metrics
    this.timestamp = data.timestamp || Date.now();
  }

  /**
   * Calculate reward from outcome
   * @returns {number} Reward value (-1 to 1)
   */
  calculateReward() {
    switch (this.type) {
      case OutcomeType.SUCCESS:
        return 1.0;
      case OutcomeType.FAILURE:
        return -1.0;
      case OutcomeType.PARTIAL:
        // Use metrics if available
        if (this.metrics.successRate) {
          return this.metrics.successRate * 2 - 1; // Map 0-1 to -1 to 1
        }
        return 0.0;
      default:
        return 0.0;
    }
  }

  toJSON() {
    return {
      type: this.type,
      success: this.success,
      error: this.error,
      feedback: this.feedback,
      metrics: this.metrics,
      timestamp: this.timestamp,
      reward: this.calculateReward(),
    };
  }
}

/**
 * Complete trajectory: state → action → outcome → reward
 */
export class Trajectory {
  constructor(data = {}) {
    this.id = data.id || `traj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = data.type || TrajectoryType.JUDGMENT;
    this.states = (data.states || []).map(s => s instanceof TrajectoryState ? s : new TrajectoryState(s));
    this.actions = (data.actions || []).map(a => a instanceof TrajectoryAction ? a : new TrajectoryAction(a));
    this.outcome = data.outcome ? (data.outcome instanceof TrajectoryOutcome ? data.outcome : new TrajectoryOutcome(data.outcome)) : null;

    this.createdAt = data.createdAt || Date.now();
    this.lastAccessed = data.lastAccessed || Date.now();
    this.accessCount = data.accessCount || 0;

    // Computed values
    this.reward = data.reward ?? (this.outcome?.calculateReward() || 0);
    this.confidence = data.confidence || PHI_INV;
    this.compressed = data.compressed || false;

    // Similarity features (cached)
    this._features = data._features || null;

    // Metadata
    this.metadata = data.metadata || {};
    this.userId = data.userId || null;
    this.projectId = data.projectId || null;
  }

  /**
   * Add a state to the trajectory
   */
  addState(state) {
    const s = state instanceof TrajectoryState ? state : new TrajectoryState(state);
    s.extractFeatures();
    this.states.push(s);
    this._features = null; // Invalidate cache
    return s;
  }

  /**
   * Add an action to the trajectory
   */
  addAction(action) {
    const a = action instanceof TrajectoryAction ? action : new TrajectoryAction(action);
    this.actions.push(a);
    return a;
  }

  /**
   * Set the outcome and calculate reward
   */
  setOutcome(outcome) {
    this.outcome = outcome instanceof TrajectoryOutcome ? outcome : new TrajectoryOutcome(outcome);
    this.reward = this.outcome.calculateReward();
    return this.outcome;
  }

  /**
   * Get trajectory features for similarity matching
   */
  getFeatures() {
    if (this._features) return this._features;

    const features = new Set();

    // Type feature
    features.add(`type:${this.type}`);

    // State features
    for (const state of this.states) {
      for (const f of state.features || state.extractFeatures()) {
        features.add(f);
      }
    }

    // Action features
    for (const action of this.actions) {
      if (action.tool) features.add(`action:${action.tool}`);
      if (action.dog) features.add(`dog:${action.dog}`);
    }

    this._features = Array.from(features);
    return this._features;
  }

  /**
   * Calculate similarity to another trajectory
   * @returns {number} Similarity score (0-1)
   */
  similarityTo(other) {
    const myFeatures = new Set(this.getFeatures());
    const otherFeatures = new Set(other.getFeatures());

    // Jaccard similarity
    const intersection = new Set([...myFeatures].filter(f => otherFeatures.has(f)));
    const union = new Set([...myFeatures, ...otherFeatures]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Check if trajectory is still fresh enough for replay
   */
  isFresh(maxAge = REASONING_BANK_CONFIG.maxReplayAge) {
    return Date.now() - this.createdAt < maxAge;
  }

  /**
   * Record an access (for decay calculation)
   */
  recordAccess() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  /**
   * Apply decay to reward
   */
  applyDecay(decayRate = REASONING_BANK_CONFIG.decayRate) {
    this.reward *= decayRate;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      states: this.states.map(s => s.toJSON()),
      actions: this.actions.map(a => a.toJSON()),
      outcome: this.outcome?.toJSON() || null,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      accessCount: this.accessCount,
      reward: this.reward,
      confidence: this.confidence,
      compressed: this.compressed,
      _features: this._features,
      metadata: this.metadata,
      userId: this.userId,
      projectId: this.projectId,
    };
  }

  static fromJSON(json) {
    return new Trajectory(json);
  }
}

/**
 * ReasoningBank - Store and retrieve successful reasoning trajectories
 */
export class ReasoningBank {
  /**
   * @param {Object} options
   * @param {Object} [options.persistence] - Persistence layer (PostgresClient)
   * @param {Object} [options.config] - Custom configuration
   */
  constructor(options = {}) {
    this.persistence = options.persistence || null;
    this.config = { ...REASONING_BANK_CONFIG, ...options.config };

    // In-memory trajectory storage
    this.trajectories = new Map();

    // Index by type for faster lookup
    this.byType = new Map();
    for (const type of Object.values(TrajectoryType)) {
      this.byType.set(type, new Set());
    }

    // Stats
    this.stats = {
      stored: 0,
      retrieved: 0,
      replayed: 0,
      compressed: 0,
      decayed: 0,
    };
  }

  /**
   * Start a new trajectory
   * @param {string} type - Trajectory type
   * @param {Object} initialState - Initial state data
   * @returns {Trajectory}
   */
  startTrajectory(type, initialState = {}) {
    const trajectory = new Trajectory({ type });
    trajectory.addState({
      type: 'initial',
      content: initialState,
    });
    return trajectory;
  }

  /**
   * Store a trajectory
   * @param {Trajectory} trajectory
   * @returns {boolean} Success
   */
  async store(trajectory) {
    // Check minimum confidence
    if (trajectory.confidence < this.config.minConfidence) {
      return false;
    }

    // Check capacity and compress if needed
    if (this.trajectories.size >= this.config.maxTrajectories) {
      await this._compress();
    }

    // Store in memory
    this.trajectories.set(trajectory.id, trajectory);
    this.byType.get(trajectory.type)?.add(trajectory.id);
    this.stats.stored++;

    // Persist if available
    if (this.persistence) {
      try {
        await this._persistTrajectory(trajectory);
      } catch (e) {
        // Continue without persistence
      }
    }

    return true;
  }

  /**
   * Find similar trajectories for a given state
   * @param {Object} state - Current state to match
   * @param {Object} options
   * @returns {Array<{trajectory: Trajectory, similarity: number}>}
   */
  findSimilar(state, options = {}) {
    const {
      type = null,
      limit = 5,
      minSimilarity = this.config.similarityThreshold,
      minReward = 0,
      freshOnly = true,
    } = options;

    const stateObj = state instanceof TrajectoryState ? state : new TrajectoryState(state);
    stateObj.extractFeatures();

    // Create temporary trajectory for comparison
    const tempTraj = new Trajectory({ type: type || TrajectoryType.JUDGMENT });
    tempTraj.addState(stateObj);

    // Find candidates
    let candidates = [];
    const searchSet = type ? this.byType.get(type) : new Set(this.trajectories.keys());

    for (const id of searchSet || []) {
      const traj = this.trajectories.get(id);
      if (!traj) continue;

      // Filter by freshness
      if (freshOnly && !traj.isFresh()) continue;

      // Filter by reward
      if (traj.reward < minReward) continue;

      // Calculate similarity
      const similarity = traj.similarityTo(tempTraj);
      if (similarity >= minSimilarity) {
        candidates.push({ trajectory: traj, similarity });
      }
    }

    // Sort by similarity * reward (prefer high similarity AND high reward)
    candidates.sort((a, b) => {
      const scoreA = a.similarity * (1 + a.trajectory.reward) / 2;
      const scoreB = b.similarity * (1 + b.trajectory.reward) / 2;
      return scoreB - scoreA;
    });

    this.stats.retrieved += Math.min(candidates.length, limit);
    return candidates.slice(0, limit);
  }

  /**
   * Get replay suggestions for current problem
   * @param {Object} currentState - Current problem state
   * @param {Object} options
   * @returns {Array<{trajectory: Trajectory, suggestion: Object}>}
   */
  getSuggestions(currentState, options = {}) {
    const similar = this.findSimilar(currentState, {
      ...options,
      minReward: 0.3, // Only suggest from successful trajectories
    });

    const suggestions = similar.map(({ trajectory, similarity }) => {
      // Record access for decay
      trajectory.recordAccess();
      this.stats.replayed++;

      // Extract suggestion from trajectory
      const suggestion = {
        trajectoryId: trajectory.id,
        similarity,
        reward: trajectory.reward,
        actions: trajectory.actions.map(a => ({
          type: a.type,
          tool: a.tool,
          dog: a.dog,
          confidence: a.confidence * similarity, // Adjust confidence by similarity
        })),
        outcome: trajectory.outcome?.type,
        message: this._formatSuggestion(trajectory, similarity),
      };

      return { trajectory, suggestion };
    });

    return suggestions;
  }

  /**
   * Format suggestion message
   * @private
   */
  _formatSuggestion(trajectory, similarity) {
    const successRate = Math.round((1 + trajectory.reward) / 2 * 100);
    const actionCount = trajectory.actions.length;
    const dogs = [...new Set(trajectory.actions.map(a => a.dog).filter(Boolean))];

    let message = `Similar problem solved (${Math.round(similarity * 100)}% match, ${successRate}% success rate).`;

    if (dogs.length > 0) {
      message += ` Used: ${dogs.join(', ')}.`;
    }

    if (actionCount > 0) {
      const tools = [...new Set(trajectory.actions.map(a => a.tool).filter(Boolean))];
      if (tools.length > 0) {
        message += ` Tools: ${tools.slice(0, 3).join(', ')}.`;
      }
    }

    return message;
  }

  /**
   * Record feedback for a trajectory
   * @param {string} trajectoryId
   * @param {string} outcome - 'success' | 'failure' | 'partial'
   * @param {Object} details
   */
  async recordFeedback(trajectoryId, outcome, details = {}) {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory) return false;

    trajectory.setOutcome({
      type: outcome === 'success' ? OutcomeType.SUCCESS :
            outcome === 'failure' ? OutcomeType.FAILURE :
            OutcomeType.PARTIAL,
      success: outcome === 'success',
      feedback: details.feedback,
      metrics: details.metrics,
    });

    // Re-persist
    if (this.persistence) {
      try {
        await this._persistTrajectory(trajectory);
      } catch (e) {
        // Continue without persistence
      }
    }

    return true;
  }

  /**
   * Compress similar trajectories to save space
   * @private
   */
  async _compress() {
    const threshold = this.config.compressionThreshold;
    const toRemove = [];
    const trajectoryList = Array.from(this.trajectories.values());

    // Find and mark similar low-reward trajectories for removal
    for (let i = 0; i < trajectoryList.length; i++) {
      const traj = trajectoryList[i];
      if (toRemove.includes(traj.id)) continue;

      for (let j = i + 1; j < trajectoryList.length; j++) {
        const other = trajectoryList[j];
        if (toRemove.includes(other.id)) continue;

        const similarity = traj.similarityTo(other);
        if (similarity >= threshold) {
          // Keep the one with higher reward
          if (traj.reward >= other.reward) {
            toRemove.push(other.id);
          } else {
            toRemove.push(traj.id);
            break;
          }
        }
      }
    }

    // Remove compressed trajectories
    for (const id of toRemove) {
      const traj = this.trajectories.get(id);
      if (traj) {
        this.trajectories.delete(id);
        this.byType.get(traj.type)?.delete(id);
        this.stats.compressed++;
      }
    }

    // Also remove old low-reward trajectories
    const now = Date.now();
    for (const [id, traj] of this.trajectories) {
      if (!traj.isFresh() && traj.reward < 0.3) {
        this.trajectories.delete(id);
        this.byType.get(traj.type)?.delete(id);
        this.stats.decayed++;
      }
    }
  }

  /**
   * Apply decay to all trajectories
   */
  applyDecay() {
    for (const traj of this.trajectories.values()) {
      traj.applyDecay(this.config.decayRate);
    }
    this.stats.decayed++;
  }

  /**
   * Persist trajectory to database
   * @private
   */
  async _persistTrajectory(trajectory) {
    if (!this.persistence?.query) return;

    // Store in reasoning_trajectories table (create if not exists)
    await this.persistence.query(`
      INSERT INTO reasoning_trajectories (id, type, data, reward, confidence, created_at, user_id, project_id)
      VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        data = $3,
        reward = $4,
        confidence = $5,
        updated_at = NOW()
    `, [
      trajectory.id,
      trajectory.type,
      JSON.stringify(trajectory.toJSON()),
      trajectory.reward,
      trajectory.confidence,
      trajectory.createdAt,
      trajectory.userId,
      trajectory.projectId,
    ]).catch(() => {
      // Table might not exist yet - that's ok
    });
  }

  /**
   * Load trajectories from database
   */
  async load(options = {}) {
    if (!this.persistence?.query) return 0;

    const { userId, projectId, type, limit = 100 } = options;

    try {
      let query = 'SELECT data FROM reasoning_trajectories WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(userId);
      }
      if (projectId) {
        query += ` AND project_id = $${paramIndex++}`;
        params.push(projectId);
      }
      if (type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(type);
      }

      query += ` ORDER BY reward DESC, created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.persistence.query(query, params);

      for (const row of result.rows || []) {
        const trajectory = Trajectory.fromJSON(row.data);
        this.trajectories.set(trajectory.id, trajectory);
        this.byType.get(trajectory.type)?.add(trajectory.id);
      }

      return result.rows?.length || 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Get bank statistics
   */
  getStats() {
    const byType = {};
    for (const [type, ids] of this.byType) {
      byType[type] = ids.size;
    }

    const rewards = Array.from(this.trajectories.values()).map(t => t.reward);
    const avgReward = rewards.length > 0
      ? rewards.reduce((a, b) => a + b, 0) / rewards.length
      : 0;

    return {
      ...this.stats,
      totalTrajectories: this.trajectories.size,
      byType,
      averageReward: avgReward,
      capacity: `${this.trajectories.size}/${this.config.maxTrajectories}`,
    };
  }
}

/**
 * Create a ReasoningBank instance
 */
export function createReasoningBank(options = {}) {
  return new ReasoningBank(options);
}

export default {
  ReasoningBank,
  Trajectory,
  TrajectoryState,
  TrajectoryAction,
  TrajectoryOutcome,
  TrajectoryType,
  OutcomeType,
  REASONING_BANK_CONFIG,
  createReasoningBank,
};
