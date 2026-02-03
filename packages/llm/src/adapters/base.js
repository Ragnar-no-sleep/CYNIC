/**
 * CYNIC LLM Base Adapter
 *
 * Abstract base class for all LLM adapters.
 *
 * @module @cynic/llm/adapters/base
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV } from '@cynic/core';
import { LLMResponse } from '../types.js';

/**
 * Abstract LLM Adapter Interface
 *
 * All LLM adapters must implement this interface.
 * Provides common functionality for statistics, events, and response handling.
 */
export class LLMAdapter extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} options.provider - Provider name (ollama, claude-code, etc.)
   * @param {string} [options.model] - Model name
   */
  constructor(options = {}) {
    super();
    this.provider = options.provider || 'abstract';
    this.model = options.model || 'unknown';
    this.enabled = false;

    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalTokens: 0,
      avgLatency: 0,
    };
  }

  /**
   * Complete a prompt
   *
   * @param {string} prompt - Prompt to complete
   * @param {Object} [options] - Options
   * @returns {Promise<LLMResponse>}
   */
  async complete(prompt, options = {}) {
    throw new Error('complete() must be implemented by subclass');
  }

  /**
   * Check if adapter is available
   *
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return this.enabled;
  }

  /**
   * Get adapter info
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.model,
      enabled: this.enabled,
      stats: this.stats,
    };
  }

  /**
   * Update average latency
   * @protected
   */
  _updateLatency(duration) {
    const count = this.stats.requests;
    if (count > 0) {
      this.stats.avgLatency = ((this.stats.avgLatency * (count - 1)) + duration) / count;
    }
  }

  /**
   * Estimate tokens (rough approximation: ~4 chars per token)
   * @protected
   */
  _estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
  }

  /**
   * Create a standardized response
   * @protected
   */
  _createResponse(data) {
    return new LLMResponse({
      provider: this.provider,
      model: this.model,
      ...data,
    });
  }
}

export default LLMAdapter;
