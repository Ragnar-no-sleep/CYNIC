/**
 * Knowledge Repository
 *
 * Digested knowledge storage.
 * Extracted insights from conversations, code, and documents.
 *
 * @module @cynic/persistence/repositories/knowledge
 */

'use strict';

import crypto from 'crypto';
import { getPool } from '../client.js';

/**
 * Generate short knowledge ID
 */
function generateKnowledgeId() {
  return 'kno_' + crypto.randomBytes(8).toString('hex');
}

export class KnowledgeRepository {
  constructor(db = null) {
    this.db = db || getPool();
  }

  /**
   * Create knowledge entry
   */
  async create(knowledge) {
    const knowledgeId = generateKnowledgeId();

    const { rows } = await this.db.query(`
      INSERT INTO knowledge (
        knowledge_id, source_type, source_ref,
        summary, insights, patterns,
        category, tags, q_score, confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      knowledgeId,
      knowledge.sourceType,
      knowledge.sourceRef || null,
      knowledge.summary,
      JSON.stringify(knowledge.insights || []),
      JSON.stringify(knowledge.patterns || []),
      knowledge.category || null,
      knowledge.tags || [],
      knowledge.qScore || null,
      knowledge.confidence || null,
    ]);
    return rows[0];
  }

  /**
   * Find knowledge by ID
   */
  async findById(knowledgeId) {
    const { rows } = await this.db.query(
      'SELECT * FROM knowledge WHERE knowledge_id = $1',
      [knowledgeId]
    );
    return rows[0] || null;
  }

  /**
   * Search knowledge
   */
  async search(query, options = {}) {
    const { sourceType, category, tags, limit = 10 } = options;

    let sql = `
      SELECT * FROM knowledge
      WHERE (summary ILIKE $1 OR insights::text ILIKE $1)
    `;
    const params = [`%${query}%`];
    let paramIndex = 2;

    if (sourceType) {
      sql += ` AND source_type = $${paramIndex++}`;
      params.push(sourceType);
    }

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (tags && tags.length > 0) {
      sql += ` AND tags && $${paramIndex++}`;
      params.push(tags);
    }

    sql += ` ORDER BY q_score DESC NULLS LAST, created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await this.db.query(sql, params);
    return rows;
  }

  /**
   * Find by source type
   */
  async findBySourceType(sourceType, limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM knowledge
      WHERE source_type = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [sourceType, limit]);
    return rows;
  }

  /**
   * Find by category
   */
  async findByCategory(category, limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM knowledge
      WHERE category = $1
      ORDER BY q_score DESC NULLS LAST
      LIMIT $2
    `, [category, limit]);
    return rows;
  }

  /**
   * Find by tags
   */
  async findByTags(tags, limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM knowledge
      WHERE tags && $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [tags, limit]);
    return rows;
  }

  /**
   * Get recent knowledge entries
   */
  async findRecent(limit = 10) {
    const { rows } = await this.db.query(`
      SELECT * FROM knowledge
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Get knowledge statistics
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT source_type) as source_types,
        COUNT(DISTINCT category) as categories,
        AVG(q_score) FILTER (WHERE q_score IS NOT NULL) as avg_score
      FROM knowledge
    `);

    const stats = rows[0];
    return {
      total: parseInt(stats.total),
      sourceTypes: parseInt(stats.source_types),
      categories: parseInt(stats.categories),
      avgScore: parseFloat(stats.avg_score) || 0,
    };
  }

  /**
   * Get all categories
   */
  async getCategories() {
    const { rows } = await this.db.query(`
      SELECT category, COUNT(*) as count
      FROM knowledge
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);
    return rows;
  }
}

export default KnowledgeRepository;
