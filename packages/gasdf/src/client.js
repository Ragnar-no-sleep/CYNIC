/**
 * @cynic/gasdf - GASdf Client
 *
 * Client for interacting with GASdf gasless transaction service.
 *
 * "Don't Extract, Burn" - κυνικός
 *
 * @module @cynic/gasdf/client
 */

'use strict';

import { PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default GASdf configuration
 */
const DEFAULT_CONFIG = {
  endpoint: process.env.GASDF_ENDPOINT || 'https://gasdf.asdfasdfa.tech',
  apiKey: process.env.GASDF_API_KEY || null,
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
};

/**
 * φ-aligned fee constants
 */
export const FEE_CONSTANTS = Object.freeze({
  /** Treasury rate: φ⁻³ ≈ 23.6% */
  TREASURY_RATE: 0.236067977499790,

  /** Burn rate: 1 - φ⁻³ ≈ 76.4% */
  BURN_RATE: 0.763932022500210,

  /** Max holder discount */
  MAX_DISCOUNT: 0.95,

  /** Ecosystem burn max: φ⁻² ≈ 38.2% */
  MAX_ECOSYSTEM_BURN: 0.381966011250105,
});

// ═══════════════════════════════════════════════════════════════════════════════
// GASdf Client
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GASdf API Client
 *
 * Submits gasless transactions through GASdf service.
 */
export class GASdfClient {
  /**
   * @param {Object} [options] - Configuration options
   * @param {string} [options.endpoint] - GASdf API endpoint
   * @param {string} [options.apiKey] - API key for authentication
   * @param {number} [options.timeout] - Request timeout in ms
   * @param {number} [options.retries] - Number of retries
   */
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.cache = new Map();
    this.cacheExpiry = 60 * 1000; // 1 minute for quotes

    this.stats = {
      quotes: 0,
      submissions: 0,
      errors: 0,
      totalBurned: 0n,
    };
  }

  /**
   * Make authenticated request to GASdf
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
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : null,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(`GASdf ${response.status}: ${error.error || error.message}`);
        }

        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.name === 'AbortError') {
          lastError = new Error(`GASdf request timeout (${this.config.timeout}ms)`);
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
   * Get a fee quote for a gasless transaction
   *
   * @param {Object} params - Quote parameters
   * @param {string} params.paymentToken - Token mint to pay fees with
   * @param {string} params.userPubkey - User's wallet public key
   * @param {number} [params.estimatedComputeUnits] - Estimated CU (default: 200000)
   * @returns {Promise<Object>} Quote data
   */
  async getQuote(params) {
    const { paymentToken, userPubkey, estimatedComputeUnits = 200000 } = params;

    this.stats.quotes++;

    const result = await this._request('POST', '/v1/quote', {
      paymentToken,
      userPubkey,
      estimatedComputeUnits,
    });

    return {
      quoteId: result.quoteId,
      feePayer: result.feePayer,
      feeAmount: result.feeAmount,
      feeToken: result.feeToken || paymentToken,
      discount: result.discount || 0,
      tier: result.tier,
      expiresAt: result.expiresAt,
      burnAmount: result.burnAmount,
      treasuryAmount: result.treasuryAmount,
    };
  }

  /**
   * Submit a signed transaction
   *
   * @param {Object} params - Submit parameters
   * @param {string} params.quoteId - Quote ID from getQuote
   * @param {string} params.signedTransaction - Base64 encoded signed transaction
   * @returns {Promise<Object>} Submission result
   */
  async submitTransaction(params) {
    const { quoteId, signedTransaction } = params;

    this.stats.submissions++;

    const result = await this._request('POST', '/v1/submit', {
      quoteId,
      signedTransaction,
    });

    // Track burns
    if (result.burnAmount) {
      this.stats.totalBurned += BigInt(result.burnAmount);
    }

    return {
      success: result.success,
      signature: result.signature,
      slot: result.slot,
      burnAmount: result.burnAmount,
      burnSignature: result.burnSignature,
      confirmations: result.confirmations,
    };
  }

  /**
   * Get list of accepted payment tokens
   *
   * @returns {Promise<Array>} Accepted tokens
   */
  async getAcceptedTokens() {
    const result = await this._request('GET', '/v1/tokens');

    return result.tokens || result;
  }

  /**
   * Get burn statistics
   *
   * @returns {Promise<Object>} Burn stats
   */
  async getStats() {
    const result = await this._request('GET', '/v1/stats');

    return {
      totalBurned: result.totalBurned,
      burnCount: result.burnCount,
      last24h: result.last24h,
      averageBurn: result.averageBurn,
    };
  }

  /**
   * Check GASdf health
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
   * @returns {Object} Client stats
   */
  getClientStats() {
    return {
      ...this.stats,
      totalBurned: this.stats.totalBurned.toString(),
      successRate: this.stats.submissions > 0
        ? (this.stats.submissions - this.stats.errors) / this.stats.submissions
        : 1,
    };
  }
}

/**
 * Create GASdf client instance
 *
 * @param {Object} [options] - Configuration
 * @returns {GASdfClient}
 */
export function createGASdfClient(options = {}) {
  return new GASdfClient(options);
}

export default {
  GASdfClient,
  createGASdfClient,
  FEE_CONSTANTS,
};
