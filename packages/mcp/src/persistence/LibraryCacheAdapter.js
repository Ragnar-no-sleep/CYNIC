/**
 * Library Cache Persistence Adapter
 *
 * ISP: Only library documentation cache operations.
 * "Le bibliothécaire garde le savoir"
 *
 * @module @cynic/mcp/persistence/LibraryCacheAdapter
 */

'use strict';

import { createLogger } from '@cynic/core';

const log = createLogger('LibraryCacheAdapter');

/**
 * @typedef {Object} LibraryDoc
 * @property {string} library_id
 * @property {string} query
 * @property {string} content
 * @property {Object} metadata
 * @property {Date} expires_at
 * @property {Date} created_at
 */

export class LibraryCacheAdapter {
  /**
   * @param {Object} repository - LibraryCacheRepository from @cynic/persistence
   */
  constructor(repository) {
    this._repo = repository;
    // No fallback - library cache requires PostgreSQL
  }

  /**
   * Get cached library documentation
   * @param {string} libraryId
   * @param {string} query
   * @returns {Promise<LibraryDoc|null>}
   */
  async get(libraryId, query) {
    if (this._repo) {
      try {
        return await this._repo.get(libraryId, query);
      } catch (err) {
        log.error('Error getting library doc', { error: err.message });
      }
    }
    return null;
  }

  /**
   * Store library documentation in cache
   * @param {string} libraryId
   * @param {string} query
   * @param {string} content
   * @param {Object} metadata
   * @param {number} ttlHours
   * @returns {Promise<LibraryDoc|null>}
   */
  async set(libraryId, query, content, metadata = {}, ttlHours = 24) {
    if (this._repo) {
      try {
        return await this._repo.set(libraryId, query, content, metadata, ttlHours);
      } catch (err) {
        log.error('Error setting library doc', { error: err.message });
      }
    }
    return null;
  }

  /**
   * Check if documentation is cached
   * @param {string} libraryId
   * @param {string} query
   * @returns {Promise<boolean>}
   */
  async isCached(libraryId, query) {
    if (this._repo) {
      try {
        return await this._repo.isCached(libraryId, query);
      } catch (err) {
        log.error('Error checking library cache', { error: err.message });
      }
    }
    return false;
  }

  /**
   * Clean expired cache entries
   * @returns {Promise<number>}
   */
  async cleanExpired() {
    if (this._repo) {
      try {
        return await this._repo.cleanExpired();
      } catch (err) {
        log.error('Error cleaning cache', { error: err.message });
      }
    }
    return 0;
  }

  /**
   * Invalidate library cache
   * @param {string} libraryId
   * @returns {Promise<number>}
   */
  async invalidate(libraryId) {
    if (this._repo) {
      try {
        return await this._repo.invalidate(libraryId);
      } catch (err) {
        log.error('Error invalidating cache', { error: err.message });
      }
    }
    return 0;
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    if (this._repo) {
      try {
        return await this._repo.getStats();
      } catch (err) {
        log.error('Error getting cache stats', { error: err.message });
      }
    }
    return { totalEntries: 0, activeEntries: 0, uniqueLibraries: 0 };
  }

  /**
   * Get top cached libraries
   * @param {number} limit
   * @returns {Promise<Object[]>}
   */
  async getTopLibraries(limit = 10) {
    if (this._repo) {
      try {
        return await this._repo.getTopLibraries(limit);
      } catch (err) {
        log.error('Error getting top libraries', { error: err.message });
      }
    }
    return [];
  }

  /**
   * Check if adapter is available
   */
  get isAvailable() {
    return !!this._repo;
  }
}
