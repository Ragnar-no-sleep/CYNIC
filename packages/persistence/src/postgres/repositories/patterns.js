/**
 * Patterns Repository
 *
 * Storage for detected patterns across judgments.
 * Patterns are verified solutions that CYNIC learns from.
 *
 * @module @cynic/persistence/repositories/patterns
 */

'use strict';

import crypto from 'crypto';
import { getPool } from '../client.js';

/**
 * Generate short pattern ID
 */
function generatePatternId() {
  return 'pat_' + crypto.randomBytes(8).toString('hex');
}

export class PatternRepository {
  constructor(db = null) {
    this.db = db || getPool();
  }

  /**
   * Create or update a pattern
   */
  async upsert(pattern) {
    const patternId = pattern.patternId || generatePatternId();

    const { rows } = await this.db.query(`
      INSERT INTO patterns (
        pattern_id, category, name, description,
        confidence, frequency, source_judgments, source_count,
        tags, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (pattern_id) DO UPDATE SET
        confidence = EXCLUDED.confidence,
        frequency = patterns.frequency + 1,
        source_judgments = patterns.source_judgments || EXCLUDED.source_judgments,
        source_count = patterns.source_count + 1,
        updated_at = NOW()
      RETURNING *
    `, [
      patternId,
      pattern.category,
      pattern.name,
      pattern.description || null,
      pattern.confidence,
      pattern.frequency || 1,
      JSON.stringify(pattern.sourceJudgments || []),
      pattern.sourceCount || 1,
      pattern.tags || [],
      JSON.stringify(pattern.data || {}),
    ]);

    return rows[0];
  }

  /**
   * Find pattern by ID
   */
  async findById(patternId) {
    const { rows } = await this.db.query(
      'SELECT * FROM patterns WHERE pattern_id = $1',
      [patternId]
    );
    return rows[0] || null;
  }

  /**
   * Find patterns by category
   */
  async findByCategory(category, limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM patterns
      WHERE category = $1
      ORDER BY confidence DESC, frequency DESC
      LIMIT $2
    `, [category, limit]);
    return rows;
  }

  /**
   * Search patterns by name or description
   */
  async search(query, options = {}) {
    const { category, limit = 10, minConfidence = 0 } = options;

    let sql = `
      SELECT * FROM patterns
      WHERE (name ILIKE $1 OR description ILIKE $1)
      AND confidence >= $2
    `;
    const params = [`%${query}%`, minConfidence];
    let paramIndex = 3;

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ` ORDER BY confidence DESC, frequency DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await this.db.query(sql, params);
    return rows;
  }

  /**
   * Get top patterns by frequency
   */
  async getTopPatterns(limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM patterns
      ORDER BY frequency DESC, confidence DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Find patterns by tags
   */
  async findByTags(tags, limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM patterns
      WHERE tags && $1
      ORDER BY confidence DESC
      LIMIT $2
    `, [tags, limit]);
    return rows;
  }

  /**
   * Add judgment to pattern sources
   */
  async addSource(patternId, judgmentId) {
    const { rows } = await this.db.query(`
      UPDATE patterns SET
        source_judgments = source_judgments || $2::jsonb,
        source_count = source_count + 1,
        frequency = frequency + 1,
        updated_at = NOW()
      WHERE pattern_id = $1
      RETURNING *
    `, [patternId, JSON.stringify([judgmentId])]);
    return rows[0];
  }

  /**
   * Get pattern statistics
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total,
        AVG(confidence) as avg_confidence,
        SUM(frequency) as total_frequency,
        COUNT(DISTINCT category) as category_count
      FROM patterns
    `);

    const stats = rows[0];
    return {
      total: parseInt(stats.total),
      avgConfidence: parseFloat(stats.avg_confidence) || 0,
      totalFrequency: parseInt(stats.total_frequency) || 0,
      categoryCount: parseInt(stats.category_count),
    };
  }

  /**
   * List all categories
   */
  async getCategories() {
    const { rows } = await this.db.query(`
      SELECT category, COUNT(*) as count
      FROM patterns
      GROUP BY category
      ORDER BY count DESC
    `);
    return rows;
  }
}

export default PatternRepository;
