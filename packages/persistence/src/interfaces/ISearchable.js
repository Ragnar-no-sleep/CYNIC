/**
 * Searchable Interface
 *
 * Defines standard search operations for repositories that support
 * full-text or semantic search.
 *
 * LSP Compliance: All searchable repositories MUST implement search()
 * with the standard signature: search(query, options)
 *
 * Repositories that have domain-specific search (like DiscoveryRepository)
 * should adapt their internal methods to match this signature.
 *
 * @module @cynic/persistence/interfaces/ISearchable
 */

'use strict';

/**
 * @typedef {Object} SearchOptions
 * @property {number} [limit=10] - Maximum results
 * @property {number} [offset=0] - Results to skip
 * @property {string} [userId] - Filter by user
 * @property {string} [sessionId] - Filter by session
 * @property {string} [type] - Filter by type/category
 * @property {Object} [filter] - Additional filters
 * @property {string} [orderBy] - Field to order by
 * @property {string} [order='DESC'] - Order direction
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} id - Record ID
 * @property {number} [score] - Search relevance score (0-1)
 * @property {number} [rank] - Search rank position
 * @property {Object} data - Full record data
 */

/**
 * Searchable mixin/interface
 *
 * Repositories that support search should implement this interface.
 * Can be used as a mixin with BaseRepository.
 *
 * @mixin
 */
export const Searchable = {
  /**
   * Search records by query
   *
   * Standard signature for LSP compliance. All searchable repositories
   * MUST accept (query, options) and return Promise<SearchResult[]>.
   *
   * @param {string} query - Search query string
   * @param {SearchOptions} [options={}] - Search options
   * @returns {Promise<SearchResult[]>} Search results
   */
  async search(query, options = {}) {
    throw new Error('search() must be implemented');
  },

  /**
   * Check if repository supports full-text search
   * @returns {boolean} True if FTS supported
   */
  supportsFTS() {
    return false;
  },

  /**
   * Check if repository supports semantic/vector search
   * @returns {boolean} True if vector search supported
   */
  supportsVectorSearch() {
    return false;
  },
};

/**
 * Apply Searchable interface to a repository class
 *
 * Usage:
 *   class MyRepository extends makeSearchable(BaseRepository) { ... }
 *
 * @param {Function} Base - Base class to extend
 * @returns {Function} Extended class with Searchable methods
 */
export function makeSearchable(Base) {
  return class SearchableRepository extends Base {
    /**
     * Search records by query
     * @param {string} query - Search query
     * @param {SearchOptions} [options={}] - Search options
     * @returns {Promise<SearchResult[]>} Results
     */
    async search(query, options = {}) {
      // Default implementation - override in subclass
      throw new Error('search() must be implemented in subclass');
    }

    /**
     * @returns {boolean}
     */
    supportsFTS() {
      return false;
    }

    /**
     * @returns {boolean}
     */
    supportsVectorSearch() {
      return false;
    }
  };
}

export default Searchable;
