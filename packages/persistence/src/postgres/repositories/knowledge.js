/**
 * Knowledge Repository
 *
 * Digested knowledge storage.
 * Extracted insights from conversations, code, and documents.
 *
 * Implements: BaseRepository, Searchable
 *
 * @module @cynic/persistence/repositories/knowledge
 */

'use strict';

import crypto from 'crypto';
import { getPool } from '../client.js';
import { BaseRepository } from '../../interfaces/IRepository.js';

/**
 * Generate short knowledge ID
 */
function generateKnowledgeId() {
  return 'kno_' + crypto.randomBytes(8).toString('hex');
}

/**
 * Knowledge Repository
 *
 * LSP compliant - implements standard repository interface with FTS support.
 *
 * @extends BaseRepository
 */
export class KnowledgeRepository extends BaseRepository {
  constructor(db = null) {
    super(db || getPool());
  }

  /**
   * Supports PostgreSQL full-text search
   * @returns {boolean}
   */
  supportsFTS() {
    return true;
  }

  /**
   * Create knowledge entry
   */
  async create(knowledge) {
    const knowledgeId = generateKnowledgeId();

    const { rows } = await this.db.query(`
      INSERT INTO knowledge (
        knowledge_id, source_type, source_ref,
        summary, content, insights, patterns,
        category, tags, q_score, confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      knowledgeId,
      knowledge.sourceType,
      knowledge.sourceRef || null,
      knowledge.summary,
      knowledge.content || null,  // Full content for FTS
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
   * Search knowledge using full-text search
   */
  async search(query, options = {}) {
    const { sourceType, category, tags, limit = 10 } = options;

    // Use PostgreSQL full-text search with ranking
    let sql = `
      SELECT *,
        ts_rank(search_vector, websearch_to_tsquery('english', $1)) as rank
      FROM knowledge
      WHERE search_vector @@ websearch_to_tsquery('english', $1)
    `;
    const params = [query];
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

    // Order by rank (relevance) first, then q_score
    sql += ` ORDER BY rank DESC, q_score DESC NULLS LAST, created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await this.db.query(sql, params);
    return rows;
  }

  /**
   * Fallback search using ILIKE (for databases without FTS migration)
   */
  async searchFallback(query, options = {}) {
    const { sourceType, category, tags, limit = 10 } = options;

    let sql = `
      SELECT * FROM knowledge
      WHERE (summary ILIKE $1 OR content ILIKE $1 OR insights::text ILIKE $1)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // BaseRepository Interface Methods (LSP compliance)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List knowledge entries with pagination
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const { limit = 10, offset = 0, sourceType, category } = options;

    let sql = 'SELECT * FROM knowledge WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (sourceType) {
      sql += ` AND source_type = $${paramIndex++}`;
      params.push(sourceType);
    }

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const { rows } = await this.db.query(sql, params);
    return rows;
  }

  /**
   * Update a knowledge entry
   * @param {string} knowledgeId - Knowledge ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>}
   */
  async update(knowledgeId, data) {
    const updates = [];
    const params = [knowledgeId];
    let paramIndex = 2;

    if (data.summary !== undefined) {
      updates.push(`summary = $${paramIndex++}`);
      params.push(data.summary);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(data.content);
    }
    if (data.insights !== undefined) {
      updates.push(`insights = $${paramIndex++}`);
      params.push(JSON.stringify(data.insights));
    }
    if (data.patterns !== undefined) {
      updates.push(`patterns = $${paramIndex++}`);
      params.push(JSON.stringify(data.patterns));
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(data.category);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(data.tags);
    }
    if (data.qScore !== undefined) {
      updates.push(`q_score = $${paramIndex++}`);
      params.push(data.qScore);
    }

    if (updates.length === 0) {
      return this.findById(knowledgeId);
    }

    updates.push('updated_at = NOW()');

    const { rows } = await this.db.query(`
      UPDATE knowledge
      SET ${updates.join(', ')}
      WHERE knowledge_id = $1
      RETURNING *
    `, params);

    return rows[0] || null;
  }

  /**
   * Delete a knowledge entry
   * @param {string} knowledgeId - Knowledge ID
   * @returns {Promise<boolean>}
   */
  async delete(knowledgeId) {
    const { rowCount } = await this.db.query(
      'DELETE FROM knowledge WHERE knowledge_id = $1',
      [knowledgeId]
    );
    return rowCount > 0;
  }
}

export default KnowledgeRepository;
