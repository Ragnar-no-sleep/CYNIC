/**
 * Librarian Service
 *
 * Caches Context7 documentation to avoid re-scraping.
 * Two-tier cache: Redis (fast, ephemeral) → PostgreSQL (durable, persistent).
 *
 * "The dog fetches once, remembers forever" - κυνικός
 *
 * @module @cynic/mcp/librarian-service
 */

'use strict';

import { createLogger } from '@cynic/core';

const log = createLogger('LibrarianService');

// Essential libraries for the CYNIC ecosystem
const ECOSYSTEM_LIBRARIES = [
  // Solana ecosystem
  { id: '/solana-labs/solana-web3.js', name: '@solana/web3.js', priority: 1 },
  { id: '/helius-labs/helius-sdk', name: 'helius-sdk', priority: 1 },
  { id: '/coral-xyz/anchor', name: '@coral-xyz/anchor', priority: 2 },

  // Node.js essentials
  { id: '/redis/ioredis', name: 'ioredis', priority: 1 },
  { id: '/expressjs/express', name: 'express', priority: 2 },
  { id: '/brianc/node-postgres', name: 'pg', priority: 1 },

  // AI/LLM
  { id: '/anthropics/anthropic-sdk-typescript', name: '@anthropic-ai/sdk', priority: 1 },
  { id: '/openai/openai-node', name: 'openai', priority: 2 },

  // Testing
  { id: '/nodejs/node', name: 'node:test', priority: 2 },
  { id: '/chaijs/chai', name: 'chai', priority: 3 },
];

// Default queries for pre-loading
const DEFAULT_QUERIES = [
  'getting started',
  'installation',
  'basic usage',
  'API reference',
  'examples',
];

/**
 * Librarian Service
 *
 * Manages documentation caching with intelligent fallback.
 */
export class LibrarianService {
  /**
   * @param {Object} persistence - PersistenceManager instance
   * @param {Object} [options] - Configuration options
   */
  constructor(persistence, options = {}) {
    this.persistence = persistence;
    this.ttlHours = options.ttlHours || 24;
    this.preloadOnInit = options.preloadOnInit !== false;

    // Stats tracking
    this._stats = {
      hits: 0,
      misses: 0,
      redisHits: 0,
      postgresHits: 0,
      fetches: 0,
      errors: 0,
    };

    this._initialized = false;
  }

  /**
   * Initialize the librarian (optional preload)
   */
  async initialize() {
    if (this._initialized) return;

    // Clean expired entries on startup
    if (this.persistence?.libraryCache) {
      try {
        const cleaned = await this.persistence.cleanExpiredCache();
        if (cleaned > 0) {
          log.debug('Librarian cleaned expired entries', { count: cleaned });
        }
      } catch (err) {
        log.warn('Librarian cleanup error', { error: err.message });
      }
    }

    this._initialized = true;
    log.debug('Librarian ready');
  }

  /**
   * Get documentation for a library (with caching)
   * @param {string} libraryId - Context7 library ID
   * @param {string} query - Search query
   * @param {Function} [fetcher] - Function to fetch from Context7 if cache miss
   * @returns {Promise<Object>} Documentation result
   */
  async getDocumentation(libraryId, query, fetcher = null) {
    // Normalize inputs
    const normalizedId = libraryId.toLowerCase().trim();
    const normalizedQuery = query.toLowerCase().trim();

    // 1. Try Redis first (fastest)
    if (this.persistence?.redis) {
      try {
        const redisResult = await this.persistence.redis.getLibraryDoc(normalizedId, normalizedQuery);
        if (redisResult) {
          this._stats.hits++;
          this._stats.redisHits++;
          return {
            content: redisResult,
            source: 'redis',
            cached: true,
            libraryId: normalizedId,
            query: normalizedQuery,
          };
        }
      } catch (err) {
        // Redis error - continue to PostgreSQL
      }
    }

    // 2. Try PostgreSQL (durable cache)
    if (this.persistence?.libraryCache) {
      try {
        const pgResult = await this.persistence.getLibraryDoc(normalizedId, normalizedQuery);
        if (pgResult) {
          this._stats.hits++;
          this._stats.postgresHits++;

          // Populate Redis for next time
          if (this.persistence?.redis) {
            this.persistence.redis.setLibraryDoc(normalizedId, normalizedQuery, pgResult.content)
              .catch(() => {}); // Fire and forget
          }

          return {
            content: pgResult.content,
            metadata: pgResult.metadata,
            source: 'postgres',
            cached: true,
            hitCount: pgResult.hitCount,
            libraryId: normalizedId,
            query: normalizedQuery,
          };
        }
      } catch (err) {
        log.warn('Librarian PostgreSQL error', { error: err.message });
      }
    }

    // 3. Cache miss - fetch from source
    this._stats.misses++;

    if (!fetcher) {
      return {
        content: null,
        source: 'none',
        cached: false,
        error: 'No fetcher provided and cache miss',
        libraryId: normalizedId,
        query: normalizedQuery,
      };
    }

    // Fetch from Context7
    try {
      this._stats.fetches++;
      const fetchedContent = await fetcher(libraryId, query);

      if (fetchedContent) {
        // Store in both caches
        await this.cacheDocumentation(normalizedId, normalizedQuery, fetchedContent);

        return {
          content: fetchedContent,
          source: 'context7',
          cached: false,
          libraryId: normalizedId,
          query: normalizedQuery,
        };
      }
    } catch (err) {
      this._stats.errors++;
      log.warn('Librarian fetch error', { error: err.message });
      return {
        content: null,
        source: 'error',
        cached: false,
        error: err.message,
        libraryId: normalizedId,
        query: normalizedQuery,
      };
    }

    return {
      content: null,
      source: 'none',
      cached: false,
      libraryId: normalizedId,
      query: normalizedQuery,
    };
  }

  /**
   * Cache documentation in both Redis and PostgreSQL
   * @param {string} libraryId - Library ID
   * @param {string} query - Search query
   * @param {string} content - Documentation content
   * @param {Object} [metadata] - Additional metadata
   */
  async cacheDocumentation(libraryId, query, content, metadata = {}) {
    const promises = [];

    // Store in Redis (fast cache)
    if (this.persistence?.redis) {
      promises.push(
        this.persistence.redis.setLibraryDoc(libraryId, query, content)
          .catch(err => log.warn('Redis cache error', { error: err.message }))
      );
    }

    // Store in PostgreSQL (durable cache)
    if (this.persistence?.libraryCache) {
      promises.push(
        this.persistence.setLibraryDoc(libraryId, query, content, metadata, this.ttlHours)
          .catch(err => log.warn('PostgreSQL cache error', { error: err.message }))
      );
    }

    await Promise.all(promises);
  }

  /**
   * Pre-load essential ecosystem documentation
   * @param {Function} fetcher - Function to fetch from Context7
   * @param {Object} [options] - Pre-load options
   */
  async preloadEcosystemDocs(fetcher, options = {}) {
    const { maxPriority = 2, queries = DEFAULT_QUERIES } = options;

    const libraries = ECOSYSTEM_LIBRARIES.filter(lib => lib.priority <= maxPriority);
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    log.info('Librarian pre-loading libraries', { count: libraries.length });

    for (const lib of libraries) {
      for (const query of queries) {
        // Check if already cached
        if (this.persistence?.libraryCache) {
          const isCached = await this.persistence.isLibraryDocCached(lib.id, query);
          if (isCached) {
            results.skipped++;
            continue;
          }
        }

        // Fetch and cache
        try {
          const content = await fetcher(lib.id, query);
          if (content) {
            await this.cacheDocumentation(lib.id, query, content, {
              library: lib.name,
              preloaded: true,
            });
            results.success++;
          } else {
            results.failed++;
          }
        } catch (err) {
          results.failed++;
          results.errors.push({ library: lib.id, query, error: err.message });
        }

        // Rate limiting - small delay between requests
        await new Promise(r => setTimeout(r, 100));
      }
    }

    log.info('Librarian pre-load complete', { cached: results.success, skipped: results.skipped, failed: results.failed });
    return results;
  }

  /**
   * Invalidate cache for a library
   * @param {string} libraryId - Library ID to invalidate
   */
  async invalidate(libraryId) {
    const normalizedId = libraryId.toLowerCase().trim();

    // Can't easily invalidate Redis by prefix without SCAN
    // PostgreSQL invalidation
    if (this.persistence?.libraryCache) {
      try {
        const count = await this.persistence.invalidateLibraryCache(normalizedId);
        return { invalidated: count, libraryId: normalizedId };
      } catch (err) {
        log.warn('Librarian invalidate error', { error: err.message });
      }
    }

    return { invalidated: 0, libraryId: normalizedId };
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    let cacheStats = { totalEntries: 0, activeEntries: 0, uniqueLibraries: 0 };

    if (this.persistence?.libraryCache) {
      try {
        cacheStats = await this.persistence.getLibraryCacheStats();
      } catch (err) {
        log.warn('Librarian stats error', { error: err.message });
      }
    }

    return {
      ...this._stats,
      hitRate: this._stats.hits + this._stats.misses > 0
        ? this._stats.hits / (this._stats.hits + this._stats.misses)
        : 0,
      cache: cacheStats,
    };
  }

  /**
   * Get list of cached libraries
   * @param {number} [limit=10] - Max libraries to return
   */
  async getCachedLibraries(limit = 10) {
    if (this.persistence?.libraryCache) {
      try {
        return await this.persistence.getTopCachedLibraries(limit);
      } catch (err) {
        log.warn('Librarian libraries error', { error: err.message });
      }
    }
    return [];
  }

  /**
   * Get ecosystem library list
   */
  getEcosystemLibraries() {
    return ECOSYSTEM_LIBRARIES;
  }
}

export default LibrarianService;
