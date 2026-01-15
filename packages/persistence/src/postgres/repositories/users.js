/**
 * Users Repository
 *
 * User identity and E-Score management.
 *
 * @module @cynic/persistence/repositories/users
 */

'use strict';

import { getPool } from '../client.js';

export class UserRepository {
  constructor(db = null) {
    this.db = db || getPool();
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
}

export default UserRepository;
