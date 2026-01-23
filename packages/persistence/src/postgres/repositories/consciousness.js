/**
 * Consciousness Repository
 *
 * Cross-session persistence for consciousness.cjs learning data.
 * "Le chien apprend. Entre les machines, l'apprentissage persiste."
 *
 * Implements: BaseRepository
 *
 * @module @cynic/persistence/repositories/consciousness
 */

'use strict';

import { getPool } from '../client.js';
import { BaseRepository } from '../../interfaces/IRepository.js';

/**
 * Consciousness Repository
 *
 * LSP compliant - implements standard repository interface.
 *
 * @extends BaseRepository
 */
export class ConsciousnessRepository extends BaseRepository {
  constructor(db = null) {
    super(db || getPool());
  }

  /**
   * Sync consciousness data from local files to database
   * Called at session end via sleep.cjs
   *
   * @param {string} userId - User ID (hook-generated usr_xxx or UUID)
   * @param {Object} data - Consciousness data
   * @param {Object} data.humanGrowth - Human growth tracking
   * @param {Object} data.capabilityMap - Tool/skill usage map
   * @param {Array} data.insights - Recent insights
   * @param {Object} data.resonancePatterns - Flow state patterns
   * @param {number} data.observations - Total observations this session
   * @returns {Promise<Object>} Synced row
   */
  async syncConsciousness(userId, data) {
    // Ensure user exists and get UUID
    const userIdUUID = await this._ensureUserExists(userId);

    const { rows } = await this.db.query(`
      SELECT sync_consciousness($1, $2, $3, $4, $5, $6) as result
    `, [
      userIdUUID,
      JSON.stringify(data.humanGrowth || {}),
      JSON.stringify(data.capabilityMap || {}),
      JSON.stringify(data.insights || []),
      JSON.stringify(data.resonancePatterns || {}),
      data.observations || 0,
    ]);

    return rows[0]?.result || null;
  }

  /**
   * Load consciousness data from database
   * Called at session start via awaken.cjs
   *
   * @param {string} userId - User ID (hook-generated usr_xxx or UUID)
   * @returns {Promise<Object|null>} Consciousness data or null if not found
   */
  async loadConsciousness(userId) {
    const userIdUUID = await this._findUserUUID(userId);
    if (!userIdUUID) return null;

    const { rows } = await this.db.query(
      'SELECT load_consciousness($1) as consciousness',
      [userIdUUID]
    );

    return rows[0]?.consciousness || null;
  }

  /**
   * Record a single observation in real-time
   * Can be called from observe.cjs for immediate persistence
   *
   * @param {string} userId - User ID
   * @param {string} toolName - Tool that was used
   * @param {boolean} success - Whether the tool call succeeded
   * @param {number} duration - Duration in ms
   */
  async recordObservation(userId, toolName, success, duration = 0) {
    const userIdUUID = await this._ensureUserExists(userId);

    await this.db.query(`
      SELECT record_consciousness_observation($1, $2, $3, $4)
    `, [userIdUUID, toolName, success, duration]);
  }

  /**
   * Get consciousness summary for a user
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Summary or null
   */
  async getSummary(userId) {
    const userIdUUID = await this._findUserUUID(userId);
    if (!userIdUUID) return null;

    const { rows } = await this.db.query(`
      SELECT
        total_observations,
        insights_count,
        human_growth->'growth'->>'sessionsCount' as sessions,
        human_growth->'growth'->>'totalInteractions' as interactions,
        jsonb_object_keys(capability_map->'tools') as top_tools,
        updated_at
      FROM user_consciousness
      WHERE user_id = $1
    `, [userIdUUID]);

    if (!rows[0]) return null;

    const row = rows[0];
    return {
      totalObservations: row.total_observations,
      insightsCount: row.insights_count,
      sessions: parseInt(row.sessions) || 0,
      interactions: parseInt(row.interactions) || 0,
      lastUpdated: row.updated_at,
    };
  }

  /**
   * Get aggregate consciousness stats across all users
   *
   * @returns {Promise<Object>} Aggregate stats
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total_users,
        SUM(total_observations) as total_observations,
        AVG(total_observations) as avg_observations,
        SUM(insights_count) as total_insights,
        MAX(updated_at) as last_activity
      FROM user_consciousness
    `);

    const stats = rows[0];
    return {
      totalUsers: parseInt(stats.total_users) || 0,
      totalObservations: parseInt(stats.total_observations) || 0,
      avgObservations: parseFloat(stats.avg_observations) || 0,
      totalInsights: parseInt(stats.total_insights) || 0,
      lastActivity: stats.last_activity,
    };
  }

  /**
   * Get most active learners
   *
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Active users
   */
  async getMostActive(limit = 10) {
    const { rows } = await this.db.query(`
      SELECT
        c.user_id,
        u.username,
        c.total_observations,
        c.insights_count,
        c.human_growth->'growth'->>'sessionsCount' as sessions,
        c.updated_at
      FROM user_consciousness c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.total_observations DESC
      LIMIT $1
    `, [limit]);

    return rows;
  }

  /**
   * Ensure user exists in users table
   * @private
   */
  async _ensureUserExists(hookUserId) {
    // Check if already UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(hookUserId)) {
      return hookUserId;
    }

    // Check if user exists by username
    const { rows: existing } = await this.db.query(
      'SELECT id FROM users WHERE username = $1',
      [hookUserId]
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new user
    const { rows: created } = await this.db.query(`
      INSERT INTO users (username, e_score)
      VALUES ($1, 0.5)
      ON CONFLICT (username) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [hookUserId]);

    return created[0].id;
  }

  /**
   * Find UUID for a hook userId
   * @private
   */
  async _findUserUUID(hookUserId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(hookUserId)) {
      return hookUserId;
    }

    const { rows } = await this.db.query(
      'SELECT id FROM users WHERE username = $1',
      [hookUserId]
    );

    return rows[0]?.id || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BaseRepository Interface Methods (LSP compliance)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create consciousness entry (via syncConsciousness)
   * @param {Object} data - { userId, humanGrowth, capabilityMap, insights, resonancePatterns, observations }
   * @returns {Promise<Object>}
   */
  async create(data) {
    return this.syncConsciousness(data.userId, data);
  }

  /**
   * Find consciousness by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async findById(userId) {
    return this.loadConsciousness(userId);
  }

  /**
   * List consciousness entries with pagination
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const { limit = 10, offset = 0 } = options;

    const { rows } = await this.db.query(`
      SELECT
        c.*,
        u.username
      FROM user_consciousness c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.updated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return rows;
  }

  /**
   * Update consciousness entry
   * @param {string} userId - User ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>}
   */
  async update(userId, data) {
    return this.syncConsciousness(userId, data);
  }

  /**
   * Delete consciousness entry
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async delete(userId) {
    const userIdUUID = await this._findUserUUID(userId);
    if (!userIdUUID) return false;

    const { rowCount } = await this.db.query(
      'DELETE FROM user_consciousness WHERE user_id = $1',
      [userIdUUID]
    );
    return rowCount > 0;
  }
}

export default ConsciousnessRepository;
