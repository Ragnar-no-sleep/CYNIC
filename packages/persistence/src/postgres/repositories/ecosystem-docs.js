/**
 * Ecosystem Docs Repository
 *
 * Stores and retrieves pre-loaded ecosystem documentation.
 *
 * "The pack remembers all territories" - κυνικός
 *
 * Implements: BaseRepository, Searchable
 *
 * @module @cynic/persistence/repositories/ecosystem-docs
 */

'use strict';

import crypto from 'crypto';
import { getPool } from '../client.js';
import { BaseRepository } from '../../interfaces/IRepository.js';

/**
 * Hash content using SHA-256
 * @param {string} content - Content to hash
 * @returns {string} Hex-encoded hash
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Ecosystem Docs Repository
 *
 * LSP compliant - implements standard repository interface.
 *
 * @extends BaseRepository
 */
export class EcosystemDocsRepository extends BaseRepository {
  /**
   * @param {import('pg').Pool} [pool] - PostgreSQL pool
   */
  constructor(pool = null) {
    super(pool || getPool());
    // Alias for backward compatibility
    this.pool = this.db;
  }

  /**
   * Supports full-text search via ILIKE
   * @returns {boolean}
   */
  supportsFTS() {
    return true;
  }

  /**
   * Upsert an ecosystem document
   * @param {Object} doc - Document data
   * @returns {Promise<Object>} Stored document
   */
  async upsert(doc) {
    const { project, docType, filePath, content, digest = null, metadata = {} } = doc;

    const contentHash = hashContent(content);

    const result = await this.pool.query(
      `INSERT INTO ecosystem_docs (project, doc_type, file_path, content, content_hash, digest, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (project, doc_type) DO UPDATE SET
         file_path = EXCLUDED.file_path,
         content = EXCLUDED.content,
         content_hash = EXCLUDED.content_hash,
         digest = COALESCE(EXCLUDED.digest, ecosystem_docs.digest),
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING id, project, doc_type, file_path, content_hash, created_at, updated_at`,
      [project, docType, filePath, content, contentHash, digest, metadata]
    );

    return result.rows[0];
  }

  /**
   * Get document by project and type
   * @param {string} project - Project name
   * @param {string} docType - Document type
   * @returns {Promise<Object|null>} Document or null
   */
  async get(project, docType) {
    const result = await this.pool.query(
      `SELECT * FROM ecosystem_docs WHERE project = $1 AND doc_type = $2`,
      [project, docType]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all documents for a project
   * @param {string} project - Project name
   * @returns {Promise<Object[]>} Documents
   */
  async getByProject(project) {
    const result = await this.pool.query(
      `SELECT * FROM ecosystem_docs WHERE project = $1 ORDER BY doc_type`,
      [project]
    );

    return result.rows;
  }

  /**
   * Get all documents
   * @returns {Promise<Object[]>} All documents
   */
  async getAll() {
    const result = await this.pool.query(
      `SELECT id, project, doc_type, file_path, content_hash,
              length(content) as content_length, digest IS NOT NULL as has_digest,
              created_at, updated_at
       FROM ecosystem_docs
       ORDER BY project, doc_type`
    );

    return result.rows;
  }

  /**
   * Check if content has changed
   * @param {string} project - Project name
   * @param {string} docType - Document type
   * @param {string} content - New content to compare
   * @returns {Promise<boolean>} True if content changed or doesn't exist
   */
  async hasChanged(project, docType, content) {
    const newHash = hashContent(content);

    const result = await this.pool.query(
      `SELECT content_hash FROM ecosystem_docs WHERE project = $1 AND doc_type = $2`,
      [project, docType]
    );

    if (result.rows.length === 0) return true;
    return result.rows[0].content_hash !== newHash;
  }

  /**
   * Search documents using full-text search
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Object[]>} Matching documents
   */
  async search(query, options = {}) {
    const { project, limit = 10 } = options;

    let sql = `
      SELECT id, project, doc_type, file_path,
             ts_headline('english', content, plainto_tsquery('english', $1),
                         'StartSel=**, StopSel=**, MaxWords=50, MinWords=20') as snippet,
             ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as rank
      FROM ecosystem_docs
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
    `;

    const params = [query];

    if (project) {
      sql += ` AND project = $${params.length + 1}`;
      params.push(project);
    }

    sql += ` ORDER BY rank DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Update digest for a document
   * @param {string} project - Project name
   * @param {string} docType - Document type
   * @param {string} digest - AI-generated digest
   * @returns {Promise<boolean>} Success
   */
  async updateDigest(project, docType, digest) {
    const result = await this.pool.query(
      `UPDATE ecosystem_docs SET digest = $3, updated_at = NOW()
       WHERE project = $1 AND doc_type = $2`,
      [project, docType, digest]
    );

    return result.rowCount > 0;
  }

  /**
   * Delete a document
   * @param {string} project - Project name
   * @param {string} docType - Document type
   * @returns {Promise<boolean>} Success
   */
  async delete(project, docType) {
    const result = await this.pool.query(
      `DELETE FROM ecosystem_docs WHERE project = $1 AND doc_type = $2`,
      [project, docType]
    );

    return result.rowCount > 0;
  }

  /**
   * Get statistics
   * @returns {Promise<Object>} Stats
   */
  async getStats() {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_docs,
        COUNT(DISTINCT project) as projects,
        COUNT(DISTINCT doc_type) as doc_types,
        SUM(length(content)) as total_bytes,
        COUNT(digest) as docs_with_digest
      FROM ecosystem_docs
    `);

    return result.rows[0];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BaseRepository Interface Methods (LSP compliance)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a document (alias for upsert)
   * @param {Object} data - Document data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return this.upsert(data);
  }

  /**
   * Find document by ID
   * @param {string|number} id - Document ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const result = await this.pool.query(
      `SELECT * FROM ecosystem_docs WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * List documents with pagination
   * @param {Object} [options={}] - Query options
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const { limit = 10, offset = 0, project, docType } = options;

    let sql = `
      SELECT id, project, doc_type, file_path, content_hash,
             length(content) as content_length, digest IS NOT NULL as has_digest,
             created_at, updated_at
      FROM ecosystem_docs
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (project) {
      sql += ` AND project = $${paramIndex++}`;
      params.push(project);
    }

    if (docType) {
      sql += ` AND doc_type = $${paramIndex++}`;
      params.push(docType);
    }

    sql += ` ORDER BY project, doc_type LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Update document by ID
   * @param {string|number} id - Document ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;

    // Merge and upsert
    const merged = {
      project: data.project || existing.project,
      docType: data.docType || existing.doc_type,
      filePath: data.filePath || existing.file_path,
      content: data.content || existing.content,
      digest: data.digest || existing.digest,
      metadata: data.metadata || existing.metadata,
    };

    return this.upsert(merged);
  }

  /**
   * Delete document by ID
   * @param {string|number} id - Document ID
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    const result = await this.pool.query(
      `DELETE FROM ecosystem_docs WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }
}

export default EcosystemDocsRepository;
