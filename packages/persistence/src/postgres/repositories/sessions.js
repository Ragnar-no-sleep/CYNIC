/**
 * Sessions Repository
 *
 * Persistent session storage (backup to Redis ephemeral).
 *
 * @module @cynic/persistence/repositories/sessions
 */

'use strict';

import { getPool } from '../client.js';

export class SessionRepository {
  constructor(db = null) {
    this.db = db || getPool();
  }

  /**
   * Create a new session record
   */
  async create(session) {
    const { rows } = await this.db.query(`
      INSERT INTO sessions (
        session_id, user_id, judgment_count, digest_count, feedback_count, context
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      session.sessionId,
      session.userId || null,
      session.judgmentCount || 0,
      session.digestCount || 0,
      session.feedbackCount || 0,
      JSON.stringify(session.context || {}),
    ]);
    return rows[0];
  }

  /**
   * Find session by ID
   */
  async findById(sessionId) {
    const { rows } = await this.db.query(
      'SELECT * FROM sessions WHERE session_id = $1',
      [sessionId]
    );
    return rows[0] || null;
  }

  /**
   * Update session
   */
  async update(sessionId, updates) {
    const fields = ['last_active_at = NOW()'];
    const params = [sessionId];
    let paramIndex = 2;

    if (updates.judgmentCount !== undefined) {
      fields.push(`judgment_count = $${paramIndex++}`);
      params.push(updates.judgmentCount);
    }

    if (updates.digestCount !== undefined) {
      fields.push(`digest_count = $${paramIndex++}`);
      params.push(updates.digestCount);
    }

    if (updates.feedbackCount !== undefined) {
      fields.push(`feedback_count = $${paramIndex++}`);
      params.push(updates.feedbackCount);
    }

    if (updates.context !== undefined) {
      fields.push(`context = $${paramIndex++}`);
      params.push(JSON.stringify(updates.context));
    }

    const { rows } = await this.db.query(`
      UPDATE sessions SET ${fields.join(', ')}
      WHERE session_id = $1
      RETURNING *
    `, params);
    return rows[0];
  }

  /**
   * Increment session counter
   */
  async increment(sessionId, field) {
    const validFields = ['judgment_count', 'digest_count', 'feedback_count'];
    if (!validFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    const { rows } = await this.db.query(`
      UPDATE sessions SET
        ${field} = ${field} + 1,
        last_active_at = NOW()
      WHERE session_id = $1
      RETURNING *
    `, [sessionId]);
    return rows[0];
  }

  /**
   * Get sessions for a user
   */
  async findByUser(userId, limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM sessions
      WHERE user_id = $1
      ORDER BY last_active_at DESC
      LIMIT $2
    `, [userId, limit]);
    return rows;
  }

  /**
   * Get active sessions (not expired)
   */
  async findActive(limit = 100) {
    const { rows } = await this.db.query(`
      SELECT * FROM sessions
      WHERE expires_at > NOW()
      ORDER BY last_active_at DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Cleanup expired sessions
   */
  async cleanup() {
    const { rowCount } = await this.db.query(
      'DELETE FROM sessions WHERE expires_at < NOW()'
    );
    return rowCount;
  }

  /**
   * Get session statistics
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
        SUM(judgment_count) as total_judgments,
        SUM(digest_count) as total_digests,
        SUM(feedback_count) as total_feedback
      FROM sessions
    `);

    const stats = rows[0];
    return {
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      totalJudgments: parseInt(stats.total_judgments) || 0,
      totalDigests: parseInt(stats.total_digests) || 0,
      totalFeedback: parseInt(stats.total_feedback) || 0,
    };
  }
}

export default SessionRepository;
