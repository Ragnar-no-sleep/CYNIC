/**
 * CYNIC AirLLM Adapter
 *
 * Large models via disk offloading.
 * Uses Ollama with quantized models (q4_0) for memory efficiency.
 *
 * "Mistral 7B avec 28GB RAM" - Run larger models via disk offloading
 *
 * @module @cynic/llm/adapters/airllm
 */

'use strict';

import { createLogger } from '@cynic/core';
import { OSSLLMAdapter } from './oss-llm.js';

const log = createLogger('AirLLMAdapter');

/**
 * AirLLM Adapter - Large models via disk offloading
 *
 * Extends OSSLLMAdapter with:
 * - Longer timeout (120s default)
 * - Lower temperature (0.2) for consistency
 * - More tokens (1000) for deeper reasoning
 * - Deep analysis mode
 */
export class AirLLMAdapter extends OSSLLMAdapter {
  constructor(options = {}) {
    super({
      provider: 'airllm',
      model: options.model || process.env.CYNIC_AIRLLM_MODEL || 'mistral:7b-instruct-q4_0',
      endpoint: options.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
      apiFormat: 'ollama',
      timeout: options.timeout || 120000, // 2 minutes for large models
      ...options,
    });

    this.deepAnalysis = options.deepAnalysis !== false;
  }

  /**
   * Complete with deep analysis settings
   *
   * @param {string} prompt
   * @param {Object} [options]
   * @returns {Promise<LLMResponse>}
   */
  async complete(prompt, options = {}) {
    // Override defaults for deep analysis
    const deepOptions = {
      temperature: options.temperature ?? 0.2,  // Lower for consistency
      maxTokens: options.maxTokens ?? 1000,     // More tokens for reasoning
      ...options,
    };

    const response = await super.complete(prompt, deepOptions);

    // Mark as deep analysis
    response.metadata.deepAnalysis = this.deepAnalysis;
    response.metadata.type = 'airllm';

    return response;
  }

  /**
   * Check if the AirLLM model is available
   *
   * @returns {Promise<{available: boolean, reason?: string, model?: string}>}
   */
  async checkAvailability() {
    if (!this.enabled) {
      return { available: false, reason: 'AirLLM adapter not enabled' };
    }

    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) {
        return { available: false, reason: 'Cannot list models' };
      }

      const data = await response.json();
      const models = data.models?.map(m => m.name) || [];
      const modelBase = this.model.split(':')[0];

      if (models.some(m => m.includes(modelBase))) {
        return { available: true, model: this.model };
      }

      return {
        available: false,
        reason: `Model ${this.model} not found. Run: ollama pull ${this.model}`,
        availableModels: models,
      };
    } catch (err) {
      return { available: false, reason: err.message };
    }
  }
}

/**
 * Create an AirLLM validator for deep analysis
 *
 * @param {Object} [options]
 * @param {string} [options.model=mistral:7b-instruct-q4_0] - Large quantized model
 * @param {boolean} [options.deepAnalysis=true] - Enable deep analysis mode
 * @returns {AirLLMAdapter}
 */
export function createAirLLMValidator(options = {}) {
  const adapter = new AirLLMAdapter({
    model: options.model || process.env.CYNIC_AIRLLM_MODEL || 'mistral:7b-instruct-q4_0',
    endpoint: options.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
    timeout: options.timeout || 120000,
    deepAnalysis: options.deepAnalysis !== false,
  });
  adapter.enabled = true;
  return adapter;
}

/**
 * Check if AirLLM is available and configured
 *
 * @returns {Promise<{available: boolean, reason?: string, model?: string}>}
 */
export async function checkAirLLMAvailability() {
  const enabled = process.env.CYNIC_AIRLLM === 'true';
  if (!enabled) {
    return { available: false, reason: 'AirLLM disabled (set CYNIC_AIRLLM=true)' };
  }

  const adapter = createAirLLMValidator();
  return adapter.checkAvailability();
}

export default AirLLMAdapter;
