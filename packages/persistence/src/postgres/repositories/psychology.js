/**
 * Psychology Repository
 *
 * Cross-session persistence for human psychology state and learning loop.
 * "Comprendre l'humain pour mieux l'aider" - κυνικός
 *
 * Persists:
 *   - Psychological state (dimensions, emotions, composites)
 *   - Learning loop calibration (accuracy, patterns)
 *   - Intervention history (effectiveness tracking)
 *
 * @module @cynic/persistence/repositories/psychology
 */

'use strict';

import { getPool } from '../client.js';

export class PsychologyRepository {
  constructor(db = null) {
    this.db = db || getPool();
  }

  /**
   * Sync psychology state from local to database
   * Called at session end via sleep.cjs
   *
   * @param {string} userId - User ID
   * @param {Object} data - Psychology data
   * @param {Object} data.dimensions - Psychological dimensions
   * @param {Object} data.emotions - Emotional spectrum
   * @param {Object} data.temporal - Temporal tracking
   * @param {Object} data.calibration - Learning loop calibration
   * @param {Object} data.userPatterns - Learned user patterns
   * @param {Object} data.interventionStats - Intervention statistics
   * @returns {Promise<Object>} Synced result
   */
  async syncPsychology(userId, data) {
    const userIdUUID = await this._ensureUserExists(userId);

    const { rows } = await this.db.query(`
      INSERT INTO user_psychology (
        user_id,
        dimensions,
        emotions,
        temporal,
        calibration,
        user_patterns,
        intervention_stats,
        session_count,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        dimensions = COALESCE(
          jsonb_deep_merge(user_psychology.dimensions, $2),
          $2
        ),
        emotions = COALESCE(
          jsonb_deep_merge(user_psychology.emotions, $3),
          $3
        ),
        temporal = $4,
        calibration = jsonb_deep_merge(user_psychology.calibration, $5),
        user_patterns = jsonb_deep_merge(user_psychology.user_patterns, $6),
        intervention_stats = jsonb_deep_merge(user_psychology.intervention_stats, $7),
        session_count = user_psychology.session_count + 1,
        updated_at = NOW()
      RETURNING *
    `, [
      userIdUUID,
      JSON.stringify(data.dimensions || {}),
      JSON.stringify(data.emotions || {}),
      JSON.stringify(data.temporal || {}),
      JSON.stringify(data.calibration || {}),
      JSON.stringify(data.userPatterns || {}),
      JSON.stringify(data.interventionStats || {}),
    ]);

    return rows[0] || null;
  }

  /**
   * Load psychology state from database
   * Called at session start via awaken.cjs
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Psychology data or null
   */
  async loadPsychology(userId) {
    const userIdUUID = await this._findUserUUID(userId);
    if (!userIdUUID) return null;

    const { rows } = await this.db.query(`
      SELECT
        dimensions,
        emotions,
        temporal,
        calibration,
        user_patterns,
        intervention_stats,
        session_count,
        updated_at
      FROM user_psychology
      WHERE user_id = $1
    `, [userIdUUID]);

    if (!rows[0]) return null;

    const row = rows[0];
    return {
      dimensions: row.dimensions,
      emotions: row.emotions,
      temporal: row.temporal,
      calibration: row.calibration,
      userPatterns: row.user_patterns,
      interventionStats: row.intervention_stats,
      sessionCount: row.session_count,
      lastUpdated: row.updated_at,
    };
  }

  /**
   * Record intervention outcome for learning
   *
   * @param {string} userId - User ID
   * @param {Object} intervention - Intervention data
   */
  async recordIntervention(userId, intervention) {
    const userIdUUID = await this._ensureUserExists(userId);

    await this.db.query(`
      INSERT INTO psychology_interventions (
        user_id,
        intervention_type,
        intensity,
        message,
        response,
        was_effective,
        context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userIdUUID,
      intervention.type,
      intervention.intensity,
      intervention.message,
      intervention.response,
      intervention.wasEffective,
      JSON.stringify(intervention.context || {}),
    ]);
  }

  /**
   * Get intervention effectiveness stats
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Effectiveness stats
   */
  async getInterventionEffectiveness(userId) {
    const userIdUUID = await this._findUserUUID(userId);
    if (!userIdUUID) return null;

    const { rows } = await this.db.query(`
      SELECT
        intervention_type,
        COUNT(*) as total,
        SUM(CASE WHEN was_effective THEN 1 ELSE 0 END) as effective,
        AVG(CASE WHEN was_effective THEN 1 ELSE 0 END) as effectiveness_rate
      FROM psychology_interventions
      WHERE user_id = $1
      GROUP BY intervention_type
    `, [userIdUUID]);

    const byType = {};
    for (const row of rows) {
      byType[row.intervention_type] = {
        total: parseInt(row.total),
        effective: parseInt(row.effective),
        rate: parseFloat(row.effectiveness_rate),
      };
    }

    return byType;
  }

  /**
   * Record learning observation
   *
   * @param {string} userId - User ID
   * @param {Object} observation - Learning observation
   */
  async recordLearningObservation(userId, observation) {
    const userIdUUID = await this._ensureUserExists(userId);

    await this.db.query(`
      INSERT INTO psychology_observations (
        user_id,
        module,
        prediction,
        actual,
        correct,
        context
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      userIdUUID,
      observation.module,
      observation.prediction,
      observation.actual,
      observation.correct,
      JSON.stringify(observation.context || {}),
    ]);
  }

  /**
   * Get learning calibration from observations
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Calibration stats by module
   */
  async getCalibrationStats(userId) {
    const userIdUUID = await this._findUserUUID(userId);
    if (!userIdUUID) return null;

    const { rows } = await this.db.query(`
      SELECT
        module,
        COUNT(*) as total,
        SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct_count,
        AVG(CASE WHEN correct THEN 1 ELSE 0 END) as accuracy
      FROM psychology_observations
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY module
    `, [userIdUUID]);

    const byModule = {};
    for (const row of rows) {
      byModule[row.module] = {
        total: parseInt(row.total),
        correct: parseInt(row.correct_count),
        accuracy: parseFloat(row.accuracy),
      };
    }

    return byModule;
  }

  /**
   * Get aggregate psychology stats across all users
   *
   * @returns {Promise<Object>} Aggregate stats
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total_users,
        SUM(session_count) as total_sessions,
        AVG(
          (calibration->'overall'->>'accuracy')::float
        ) as avg_accuracy,
        MAX(updated_at) as last_activity
      FROM user_psychology
    `);

    const stats = rows[0];
    return {
      totalUsers: parseInt(stats.total_users) || 0,
      totalSessions: parseInt(stats.total_sessions) || 0,
      avgAccuracy: parseFloat(stats.avg_accuracy) || 0,
      lastActivity: stats.last_activity,
    };
  }

  /**
   * Get top performers (high calibration accuracy)
   *
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Top users
   */
  async getTopPerformers(limit = 10) {
    const { rows } = await this.db.query(`
      SELECT
        p.user_id,
        u.username,
        p.session_count,
        p.calibration->'overall'->>'accuracy' as accuracy,
        p.updated_at
      FROM user_psychology p
      JOIN users u ON u.id = p.user_id
      WHERE (p.calibration->'overall'->>'accuracy')::float > 0
      ORDER BY (p.calibration->'overall'->>'accuracy')::float DESC
      LIMIT $1
    `, [limit]);

    return rows;
  }

  /**
   * Ensure user exists in users table
   * @private
   */
  async _ensureUserExists(hookUserId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(hookUserId)) {
      return hookUserId;
    }

    const { rows: existing } = await this.db.query(
      'SELECT id FROM users WHERE username = $1',
      [hookUserId]
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

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
}

export default PsychologyRepository;
