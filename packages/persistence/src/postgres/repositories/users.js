/**
 * Users Repository
 *
 * User identity and E-Score management.
 *
 * Implements: BaseRepository
 *
 * @module @cynic/persistence/repositories/users
 */

'use strict';

import { getPool } from '../client.js';
import { BaseRepository } from '../../interfaces/IRepository.js';

/**
 * Users Repository
 *
 * LSP compliant - implements standard repository interface.
 *
 * @extends BaseRepository
 */
export class UserRepository extends BaseRepository {
  constructor(db = null) {
    super(db || getPool());
  }

  /**
   * Create a new user
   */
  async create(user) {
    const { rows } = await this.db.query(`
      INSERT INTO users (wallet_address, username, e_score, e_score_data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      user.walletAddress || null,
      user.username || null,
      user.eScore || 0,
      JSON.stringify(user.eScoreData || {}),
    ]);
    return rows[0];
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const { rows } = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find user by wallet address
   */
  async findByWallet(walletAddress) {
    const { rows } = await this.db.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    return rows[0] || null;
  }

  /**
   * Get or create user by wallet
   */
  async getOrCreate(walletAddress, defaults = {}) {
    let user = await this.findByWallet(walletAddress);
    if (!user) {
      user = await this.create({ walletAddress, ...defaults });
    }
    return user;
  }

  /**
   * Update user E-Score
   */
  async updateEScore(id, eScore, eScoreData = null) {
    const updates = ['e_score = $2', 'updated_at = NOW()'];
    const params = [id, eScore];

    if (eScoreData) {
      updates.push('e_score_data = $3');
      params.push(JSON.stringify(eScoreData));
    }

    const { rows } = await this.db.query(`
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params);
    return rows[0];
  }

  /**
   * Update user profile
   */
  async update(id, updates) {
    const fields = [];
    const params = [id];
    let paramIndex = 2;

    if (updates.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      params.push(updates.username);
    }

    if (updates.walletAddress !== undefined) {
      fields.push(`wallet_address = $${paramIndex++}`);
      params.push(updates.walletAddress);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = NOW()');

    const { rows } = await this.db.query(`
      UPDATE users SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params);
    return rows[0];
  }

  /**
   * Get top users by E-Score
   */
  async getLeaderboard(limit = 10) {
    const { rows } = await this.db.query(`
      SELECT id, wallet_address, username, e_score, created_at
      FROM users
      WHERE e_score > 0
      ORDER BY e_score DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Count total users
   */
  async count() {
    const { rows } = await this.db.query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BaseRepository Interface Methods (LSP compliance)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List users with pagination
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const { limit = 10, offset = 0, orderBy = 'created_at' } = options;

    const validOrderBy = ['created_at', 'e_score', 'updated_at'];
    const sortField = validOrderBy.includes(orderBy) ? orderBy : 'created_at';

    const { rows } = await this.db.query(`
      SELECT * FROM users
      ORDER BY ${sortField} DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return rows;
  }

  /**
   * Delete a user
   * @param {string|number} id - User ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const { rowCount } = await this.db.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return rowCount > 0;
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE e_score > 0) as with_score,
        AVG(e_score) FILTER (WHERE e_score > 0) as avg_score,
        MAX(e_score) as max_score
      FROM users
    `);

    const stats = rows[0];
    return {
      total: parseInt(stats.total),
      withScore: parseInt(stats.with_score),
      avgScore: parseFloat(stats.avg_score) || 0,
      maxScore: parseFloat(stats.max_score) || 0,
    };
  }
}

export default UserRepository;
