/**
 * Session Patterns Repository
 *
 * Cross-session persistence for patterns detected by Observer and Digester hooks.
 * Enables CYNIC to remember what it learned in previous sessions.
 *
 * @module @cynic/persistence/repositories/session-patterns
 */

'use strict';

import { getPool } from '../client.js';
import { BaseRepository } from '../../interfaces/IRepository.js';

/**
 * φ⁻¹ - Maximum confidence allowed
 */
const PHI_INV = 0.618;

/**
 * Session Patterns Repository
 *
 * @extends BaseRepository
 */
export class SessionPatternsRepository extends BaseRepository {
  constructor(db = null) {
    super(db || getPool());
  }

  /**
   * Save multiple patterns from a session
   *
   * @param {string} sessionId - Session identifier
   * @param {string} userId - User UUID
   * @param {Array<Object>} patterns - Patterns to save
   * @returns {Promise<number>} Number of patterns saved
   */
  async savePatterns(sessionId, userId, patterns) {
    if (!patterns || patterns.length === 0) {
      return 0;
    }

    // Use the SQL function for bulk insert
    const { rows } = await this.db.query(
      'SELECT save_session_patterns($1, $2, $3) as count',
      [sessionId, userId, JSON.stringify(patterns)]
    );

    return rows[0]?.count || 0;
  }

  /**
   * Load recent patterns for a user (for session start)
   *
   * @param {string} userId - User UUID
   * @param {number} limit - Maximum patterns to return (default 50)
   * @returns {Promise<Array>} Recent patterns
   */
  async loadRecentPatterns(userId, limit = 50) {
    const { rows } = await this.db.query(
      'SELECT load_recent_patterns($1, $2) as patterns',
      [userId, limit]
    );

    return rows[0]?.patterns || [];
  }

  /**
   * Get pattern statistics for a user
   *
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Pattern statistics
   */
  async getStats(userId) {
    const { rows } = await this.db.query(
      'SELECT get_pattern_stats($1) as stats',
      [userId]
    );

    return rows[0]?.stats || {
      totalPatterns: 0,
      uniquePatterns: 0,
      avgConfidence: 0,
      byType: {},
      mostRecent: null,
      highConfidence: 0,
    };
  }

  /**
   * Save a single pattern
   *
   * @param {string} sessionId - Session identifier
   * @param {string} userId - User UUID
   * @param {Object} pattern - Pattern to save
   * @returns {Promise<Object>} Saved pattern
   */
  async save(sessionId, userId, pattern) {
    const { rows } = await this.db.query(`
      INSERT INTO session_patterns (
        session_id, user_id, pattern_type, pattern_name,
        confidence, occurrences, context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      sessionId,
      userId,
      pattern.type,
      pattern.name || null,
      Math.min(PHI_INV, pattern.confidence || 0.5),
      pattern.occurrences || 1,
      JSON.stringify(pattern.context || {}),
    ]);

    return this._mapRow(rows[0]);
  }

  /**
   * Find patterns by type
   *
   * @param {string} userId - User UUID
   * @param {string} patternType - Pattern type to filter
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Matching patterns
   */
  async findByType(userId, patternType, limit = 20) {
    const { rows } = await this.db.query(`
      SELECT * FROM session_patterns
      WHERE user_id = $1 AND pattern_type = $2
      ORDER BY detected_at DESC
      LIMIT $3
    `, [userId, patternType, limit]);

    return rows.map(row => this._mapRow(row));
  }

  /**
   * Find high-confidence patterns (above φ⁻²)
   *
   * @param {string} userId - User UUID
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} High-confidence patterns
   */
  async findHighConfidence(userId, limit = 20) {
    const { rows } = await this.db.query(`
      SELECT * FROM session_patterns
      WHERE user_id = $1 AND confidence >= 0.382
      ORDER BY confidence DESC, detected_at DESC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(row => this._mapRow(row));
  }

  /**
   * Count patterns for a session
   *
   * @param {string} sessionId - Session identifier
   * @returns {Promise<number>} Pattern count
   */
  async countBySession(sessionId) {
    const { rows } = await this.db.query(
      'SELECT COUNT(*) as count FROM session_patterns WHERE session_id = $1',
      [sessionId]
    );

    return parseInt(rows[0]?.count || 0, 10);
  }

  /**
   * Delete patterns for a session
   *
   * @param {string} sessionId - Session identifier
   * @returns {Promise<number>} Number deleted
   */
  async deleteBySession(sessionId) {
    const { rowCount } = await this.db.query(
      'DELETE FROM session_patterns WHERE session_id = $1',
      [sessionId]
    );

    return rowCount;
  }

  /**
   * Cleanup old patterns
   *
   * @returns {Promise<number>} Number deleted
   */
  async cleanup() {
    const { rows } = await this.db.query(
      'SELECT cleanup_old_patterns() as count'
    );

    return rows[0]?.count || 0;
  }

  /**
   * Map database row to pattern object
   *
   * @private
   */
  _mapRow(row) {
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      type: row.pattern_type,
      name: row.pattern_name,
      confidence: parseFloat(row.confidence),
      occurrences: row.occurrences,
      context: row.context,
      detectedAt: row.detected_at,
    };
  }
}

/**
 * Factory function for DI
 */
export function createSessionPatternsRepository(db = null) {
  return new SessionPatternsRepository(db);
}
