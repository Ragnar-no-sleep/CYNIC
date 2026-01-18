/**
 * @cynic/holdex - HolDex Client
 *
 * Client for interacting with HolDex API to fetch token data and K-Scores.
 *
 * "φ distrusts φ" - κυνικός
 *
 * @module @cynic/holdex/client
 */

'use strict';

import { PHI_INV } from '@cynic/core';
import { calculateKScore, getKScoreTier, isHealthyKScore } from './harmony.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default HolDex configuration
 */
const DEFAULT_CONFIG = {
  endpoint: process.env.HOLDEX_ENDPOINT || 'https://holdex.io/api',
  apiKey: process.env.HOLDEX_API_KEY || null,
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HolDex Client
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HolDex API Client
 *
 * Fetches token data and K-Scores from HolDex.
 */
export class HolDexClient {
  /**
   * @param {Object} [options] - Configuration options
   * @param {string} [options.endpoint] - HolDex API endpoint
   * @param {string} [options.apiKey] - API key for authentication
   * @param {number} [options.timeout] - Request timeout in ms
   * @param {number} [options.retries] - Number of retries
   */
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes

    this.stats = {
      requests: 0,
      cacheHits: 0,
      errors: 0,
    };
  }

  /**
   * Make authenticated request to HolDex
   * @private
   */
  async _request(method, path, body = null) {
    const url = `${this.config.endpoint}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CYNIC/1.0',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    let lastError;
    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        this.stats.requests++;

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : null,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`HolDex ${response.status}: ${error}`);
        }

        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.name === 'AbortError') {
          lastError = new Error(`HolDex request timeout (${this.config.timeout}ms)`);
        }

        // Wait before retry
        if (attempt < this.config.retries - 1) {
          await new Promise(r => setTimeout(r, this.config.retryDelay * (attempt + 1)));
        }
      }
    }

    this.stats.errors++;
    throw lastError;
  }

  /**
   * Get from cache if valid
   * @private
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      this.stats.cacheHits++;
      return cached.data;
    }
    return null;
  }

  /**
   * Set cache entry
   * @private
   */
  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get token information
   *
   * @param {string} mint - Token mint address
   * @returns {Promise<Object>} Token data
   */
  async getToken(mint) {
    const cacheKey = `token:${mint}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this._request('GET', `/tokens/${mint}`);
    this._setCache(cacheKey, result);
    return result;
  }

  /**
   * Get K-Score for a token
   *
   * @param {string} mint - Token mint address
   * @returns {Promise<Object>} K-Score data with components
   */
  async getKScore(mint) {
    const cacheKey = `kscore:${mint}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const result = await this._request('GET', `/tokens/${mint}/kscore`);
      this._setCache(cacheKey, result);
      return result;
    } catch (err) {
      // If HolDex unavailable, return null (caller should handle)
      console.warn(`[HolDex] K-Score fetch failed for ${mint}: ${err.message}`);
      return null;
    }
  }

  /**
   * Get token holders
   *
   * @param {string} mint - Token mint address
   * @param {Object} [options] - Query options
   * @param {number} [options.limit] - Max holders to return
   * @param {string} [options.sortBy] - Sort field
   * @returns {Promise<Object>} Holders data
   */
  async getHolders(mint, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.sortBy) params.set('sortBy', options.sortBy);

    const queryString = params.toString();
    const path = `/tokens/${mint}/holders${queryString ? '?' + queryString : ''}`;

    return this._request('GET', path);
  }

  /**
   * Get K-Score history for a token
   *
   * @param {string} mint - Token mint address
   * @param {string} [period] - Time period (e.g., '7d', '30d')
   * @returns {Promise<Object>} Historical K-Score data
   */
  async getKScoreHistory(mint, period = '30d') {
    return this._request('GET', `/tokens/${mint}/kscore/history?period=${period}`);
  }

  /**
   * Search tokens by query
   *
   * @param {string} query - Search query (name or symbol)
   * @param {Object} [options] - Search options
   * @returns {Promise<Array>} Matching tokens
   */
  async searchTokens(query, options = {}) {
    const params = new URLSearchParams({ q: query });
    if (options.limit) params.set('limit', options.limit);
    if (options.minKScore) params.set('minKScore', options.minKScore);

    return this._request('GET', `/tokens/search?${params.toString()}`);
  }

  /**
   * Get top tokens by K-Score
   *
   * @param {number} [limit=50] - Number of tokens
   * @returns {Promise<Array>} Top tokens
   */
  async getTopTokens(limit = 50) {
    return this._request('GET', `/tokens/top?limit=${limit}`);
  }

  /**
   * Get new tokens
   *
   * @param {number} [limit=50] - Number of tokens
   * @param {number} [hours=24] - Hours to look back
   * @returns {Promise<Array>} New tokens
   */
  async getNewTokens(limit = 50, hours = 24) {
    return this._request('GET', `/tokens/new?limit=${limit}&hours=${hours}`);
  }

  /**
   * Analyze a token for CYNIC judgment
   *
   * Fetches token data and K-Score, then formats for CYNIC judgment.
   *
   * @param {string} mint - Token mint address
   * @returns {Promise<Object>} Analysis result for CYNIC
   */
  async analyzeForCYNIC(mint) {
    const [tokenData, kScoreData] = await Promise.all([
      this.getToken(mint).catch(() => null),
      this.getKScore(mint),
    ]);

    if (!kScoreData) {
      return {
        mint,
        available: false,
        error: 'K-Score data not available',
      };
    }

    const { D, O, L } = kScoreData.components || {};
    const kScore = kScoreData.score || calculateKScore(D || 0, O || 0, L || 0);
    const tier = getKScoreTier(kScore);

    return {
      mint,
      available: true,
      token: {
        name: tokenData?.name || 'Unknown',
        symbol: tokenData?.symbol || 'UNKNOWN',
        supply: tokenData?.supply,
        holders: tokenData?.holders,
      },
      kScore: {
        score: kScore,
        components: { D, O, L },
        tier: tier.name,
        verdict: tier.verdict,
        healthy: isHealthyKScore(kScore),
      },
      // Format for CYNIC judgment
      judgmentItem: {
        type: 'token',
        content: {
          mint,
          name: tokenData?.name,
          symbol: tokenData?.symbol,
          kScore,
          components: { D, O, L },
        },
      },
      // Confidence limited by φ⁻¹
      confidence: Math.min(PHI_INV, kScoreData.confidence || PHI_INV),
    };
  }

  /**
   * Batch analyze tokens
   *
   * @param {string[]} mints - Array of mint addresses
   * @returns {Promise<Map>} Map of mint to analysis
   */
  async batchAnalyze(mints) {
    const results = new Map();

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < mints.length; i += batchSize) {
      const batch = mints.slice(i, i + batchSize);
      const analyses = await Promise.all(
        batch.map(mint => this.analyzeForCYNIC(mint))
      );

      for (const analysis of analyses) {
        results.set(analysis.mint, analysis);
      }
    }

    return results;
  }

  /**
   * Check HolDex health
   *
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const result = await this._request('GET', '/health');
      return {
        healthy: result.status === 'ok' || result.status === 'healthy',
        ...result,
      };
    } catch (err) {
      return {
        healthy: false,
        error: err.message,
      };
    }
  }

  /**
   * Get client statistics
   *
   * @returns {Object} Stats
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.requests > 0
        ? this.stats.cacheHits / this.stats.requests
        : 0,
      errorRate: this.stats.requests > 0
        ? this.stats.errors / this.stats.requests
        : 0,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Create HolDex client instance
 *
 * @param {Object} [options] - Configuration
 * @returns {HolDexClient}
 */
export function createHolDexClient(options = {}) {
  return new HolDexClient(options);
}

export default {
  HolDexClient,
  createHolDexClient,
};
