/**
 * Base Repository Interface
 *
 * Defines standard CRUD operations that all repositories should implement.
 * JavaScript doesn't have interfaces, so this is an abstract base class.
 *
 * LSP Compliance: All repositories MUST implement these methods with
 * compatible signatures to be substitutable.
 *
 * @module @cynic/persistence/interfaces/IRepository
 */

'use strict';

/**
 * @typedef {Object} QueryOptions
 * @property {number} [limit=10] - Maximum results to return
 * @property {number} [offset=0] - Number of results to skip
 * @property {string} [orderBy] - Field to order by
 * @property {string} [order='DESC'] - Order direction (ASC/DESC)
 */

/**
 * @typedef {Object} RepositoryStats
 * @property {number} total - Total record count
 * @property {number} [recent] - Recent record count (last 24h)
 * @property {Object} [byType] - Counts by type/category
 */

/**
 * Base Repository class
 *
 * All repositories should extend this class or implement
 * compatible method signatures.
 *
 * @abstract
 */
export class BaseRepository {
  /**
   * @param {Object} db - Database connection pool
   */
  constructor(db) {
    if (new.target === BaseRepository) {
      throw new Error('BaseRepository is abstract and cannot be instantiated directly');
    }
    this.db = db;
  }

  /**
   * Create a new record
   * @abstract
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    throw new Error('create() must be implemented');
  }

  /**
   * Find record by ID
   * @abstract
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Record or null if not found
   */
  async findById(id) {
    throw new Error('findById() must be implemented');
  }

  /**
   * Update a record
   * @abstract
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>} Updated record or null
   */
  async update(id, data) {
    throw new Error('update() must be implemented');
  }

  /**
   * Delete a record
   * @abstract
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    throw new Error('delete() must be implemented');
  }

  /**
   * Get repository statistics
   * @abstract
   * @returns {Promise<RepositoryStats>} Statistics object
   */
  async getStats() {
    throw new Error('getStats() must be implemented');
  }

  /**
   * List records with pagination
   * @param {QueryOptions} [options={}] - Query options
   * @returns {Promise<Object[]>} Array of records
   */
  async list(options = {}) {
    throw new Error('list() must be implemented');
  }
}

export default BaseRepository;
