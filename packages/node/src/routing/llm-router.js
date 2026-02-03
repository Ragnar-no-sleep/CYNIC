/**
 * @deprecated This module is deprecated. Use @cynic/llm instead.
 *
 * LLM Router - Connects CostOptimizer tiers to LLM Providers
 *
 * DEPRECATED: This module has been superseded by @cynic/llm which provides:
 * - Unified LLMRouter with cost-optimized routing
 * - Multi-LLM consensus with φ⁻¹ quorum
 * - AirLLM integration for large models
 *
 * Migration:
 * ```javascript
 * // OLD (deprecated)
 * import { LLMRouter } from '@cynic/node/routing/llm-router';
 *
 * // NEW (use this instead)
 * import { LLMRouter, createLLMRouter } from '@cynic/llm';
 * ```
 *
 * "Le plus petit chien qui peut faire le travail" - κυνικός
 *
 * @module @cynic/node/routing/llm-router
 * @deprecated Use @cynic/llm instead
 */

'use strict';

// DEPRECATION WARNING
console.warn(
  '[DEPRECATED] @cynic/node/routing/llm-router is deprecated. ' +
  'Use @cynic/llm instead: import { LLMRouter } from "@cynic/llm"'
);

import { EventEmitter } from 'events';
import { PHI_INV } from '@cynic/core';
import {
  LLMProvider,
  LLMModel,
  OllamaLLMProvider,
  OpenAILLMProvider,
  createLLMProvider,
} from '@cynic/core/llm';

import {
  CostOptimizer,
  ComplexityTier,
  TIER_COSTS,
  getCostOptimizer,
} from './cost-optimizer.js';

// =============================================================================
// TIER TO LLM MAPPING
// =============================================================================

/**
 * Default model mapping per tier
 */
export const TIER_MODEL_MAP = Object.freeze({
  [ComplexityTier.LOCAL]: null, // No LLM
  [ComplexityTier.LIGHT]: {
    primary: LLMModel.QWEN,
    fallback: LLMModel.MISTRAL,
    provider: LLMProvider.OLLAMA,
  },
  [ComplexityTier.FULL]: {
    primary: LLMModel.LLAMA3_70B,
    fallback: LLMModel.DEEPSEEK,
    provider: LLMProvider.OLLAMA,
    // Claude is available via Claude Code subagent (Task tool)
    claudeAvailable: true,
  },
});

/**
 * Provider configs per tier
 */
export const TIER_PROVIDER_CONFIG = Object.freeze({
  [ComplexityTier.LIGHT]: {
    timeout: 30000,   // 30s for light models
    maxTokens: 1000,
    temperature: 0.5,
  },
  [ComplexityTier.FULL]: {
    timeout: 120000,  // 120s for large models
    maxTokens: 4000,
    temperature: 0.3, // Lower for accuracy
  },
});

// =============================================================================
// LLM ROUTER
// =============================================================================

/**
 * LLMRouter - Routes requests to appropriate LLM based on tier
 *
 * Usage:
 * ```js
 * const router = new LLMRouter();
 * const result = await router.route({
 *   content: 'Analyze this code...',
 *   context: { risk: 'high' },
 * });
 * ```
 */
export class LLMRouter extends EventEmitter {
  /**
   * @param {Object} options - Configuration
   * @param {CostOptimizer} [options.costOptimizer] - Custom cost optimizer
   * @param {Object} [options.providerOverrides] - Override default provider config
   * @param {boolean} [options.preferLocal=true] - Prefer local models when available
   */
  constructor(options = {}) {
    super();

    this.costOptimizer = options.costOptimizer || getCostOptimizer();
    this.providerOverrides = options.providerOverrides || {};
    this.preferLocal = options.preferLocal !== false;

    // Provider instances (lazy-loaded)
    this._providers = {
      [ComplexityTier.LIGHT]: null,
      [ComplexityTier.FULL]: null,
    };

    // Availability cache
    this._availability = {
      ollama: null,
      ollamaModels: [],
      lastCheck: 0,
    };

    // Statistics
    this.stats = {
      routed: 0,
      byTier: { local: 0, light: 0, full: 0 },
      failures: 0,
      fallbacks: 0,
      avgLatencyMs: 0,
    };
  }

  /**
   * Route a request to appropriate LLM
   *
   * @param {Object} request - Request to route
   * @param {string} request.content - Content/prompt
   * @param {Object} [request.context] - Additional context
   * @param {string} [request.forceTier] - Force specific tier
   * @returns {Promise<Object>} LLM response or local resolution
   */
  async route(request) {
    const startTime = Date.now();

    // 1. Determine tier (use CostOptimizer)
    let tierResult;
    if (request.forceTier && Object.values(ComplexityTier).includes(request.forceTier)) {
      tierResult = {
        tier: request.forceTier,
        shouldRoute: request.forceTier !== ComplexityTier.LOCAL,
        reason: 'Forced tier',
      };
    } else {
      tierResult = this.costOptimizer.optimize(request);
    }

    const { tier, shouldRoute, reason } = tierResult;
    this.stats.routed++;
    this.stats.byTier[tier]++;

    // 2. Handle LOCAL tier (no LLM)
    if (!shouldRoute || tier === ComplexityTier.LOCAL) {
      const result = {
        tier,
        provider: null,
        response: this._localResolve(request),
        latencyMs: Date.now() - startTime,
        cost: 0,
        reason,
      };
      this.emit('routed', result);
      return result;
    }

    // 3. Get provider for tier
    const provider = await this._getProvider(tier);

    if (!provider) {
      // No provider available - fallback to local
      this.stats.failures++;
      const result = {
        tier,
        provider: null,
        response: {
          text: `*sniff* Aucun LLM disponible pour tier ${tier}. Résolution locale.`,
          confidence: PHI_INV * 0.5,
          fallback: true,
        },
        latencyMs: Date.now() - startTime,
        cost: 0,
        reason: 'No provider available',
      };
      this.emit('fallback', result);
      return result;
    }

    // 4. Execute LLM call
    try {
      const config = TIER_PROVIDER_CONFIG[tier] || {};
      const llmResponse = await provider.complete(request.content, {
        temperature: request.temperature ?? config.temperature,
        maxTokens: request.maxTokens ?? config.maxTokens,
      });

      const latencyMs = Date.now() - startTime;
      const cost = TIER_COSTS[tier];

      // Record outcome
      this.costOptimizer.recordOutcome(tier, true, latencyMs);

      // Update average latency
      this.stats.avgLatencyMs = (this.stats.avgLatencyMs * (this.stats.routed - 1) + latencyMs) / this.stats.routed;

      const result = {
        tier,
        provider: provider.type,
        model: llmResponse.model,
        response: {
          text: llmResponse.text,
          confidence: Math.min(llmResponse.confidence, PHI_INV),
          tokens: llmResponse.tokens,
        },
        latencyMs,
        cost,
        reason,
      };

      this.emit('routed', result);
      return result;

    } catch (err) {
      this.stats.failures++;
      this.costOptimizer.recordOutcome(tier, false, Date.now() - startTime);

      // Try fallback
      const fallbackResult = await this._tryFallback(request, tier, err);
      if (fallbackResult) {
        this.stats.fallbacks++;
        this.emit('fallback', fallbackResult);
        return fallbackResult;
      }

      // Final fallback to local
      return {
        tier,
        provider: null,
        response: {
          text: `*growl* LLM error: ${err.message}`,
          confidence: PHI_INV * 0.3,
          error: true,
        },
        latencyMs: Date.now() - startTime,
        cost: 0,
        reason: `Error: ${err.message}`,
      };
    }
  }

  /**
   * Get provider for tier (lazy initialization)
   * @private
   */
  async _getProvider(tier) {
    // Check cache
    if (this._providers[tier]) {
      return this._providers[tier];
    }

    // Check Ollama availability
    await this._checkOllamaAvailability();

    const tierConfig = TIER_MODEL_MAP[tier];
    if (!tierConfig) return null;

    // Try to create Ollama provider
    if (this._availability.ollama) {
      const model = this._selectBestModel(tier);
      if (model) {
        const provider = createLLMProvider(LLMProvider.OLLAMA, {
          model,
          timeout: TIER_PROVIDER_CONFIG[tier]?.timeout,
          ...this.providerOverrides[tier],
        });
        this._providers[tier] = provider;
        return provider;
      }
    }

    // FULL tier can fallback to OpenAI if configured
    if (tier === ComplexityTier.FULL && process.env.OPENAI_API_KEY) {
      const provider = createLLMProvider(LLMProvider.OPENAI, {
        model: LLMModel.GPT4O_MINI,
        ...this.providerOverrides[tier],
      });
      this._providers[tier] = provider;
      return provider;
    }

    return null;
  }

  /**
   * Check Ollama availability (cached)
   * @private
   */
  async _checkOllamaAvailability() {
    const now = Date.now();
    const CACHE_TTL = 60000; // 1 minute

    if (now - this._availability.lastCheck < CACHE_TTL) {
      return;
    }

    try {
      const testProvider = new OllamaLLMProvider();
      const available = await testProvider.isAvailable();

      this._availability.ollama = available;
      this._availability.lastCheck = now;

      if (available) {
        this._availability.ollamaModels = await testProvider.listModels();
      }
    } catch {
      this._availability.ollama = false;
      this._availability.lastCheck = now;
    }
  }

  /**
   * Select best available model for tier
   * @private
   */
  _selectBestModel(tier) {
    const tierConfig = TIER_MODEL_MAP[tier];
    if (!tierConfig) return null;

    const availableModels = this._availability.ollamaModels || [];

    // Try primary
    const primaryModel = tierConfig.primary;
    const primaryName = this._modelToOllamaName(primaryModel);
    if (availableModels.some(m => m.includes(primaryName))) {
      return primaryModel;
    }

    // Try fallback
    const fallbackModel = tierConfig.fallback;
    const fallbackName = this._modelToOllamaName(fallbackModel);
    if (availableModels.some(m => m.includes(fallbackName))) {
      return fallbackModel;
    }

    // Use any available model
    if (availableModels.length > 0) {
      // Prefer smaller models for LIGHT tier
      if (tier === ComplexityTier.LIGHT) {
        const small = availableModels.find(m =>
          m.includes('qwen') || m.includes('mistral') || m.includes('phi')
        );
        if (small) return small;
      }
      return availableModels[0];
    }

    return null;
  }

  /**
   * Convert model enum to Ollama model name
   * @private
   */
  _modelToOllamaName(model) {
    const map = {
      [LLMModel.LLAMA3]: 'llama3',
      [LLMModel.LLAMA3_70B]: 'llama3',
      [LLMModel.MISTRAL]: 'mistral',
      [LLMModel.MIXTRAL]: 'mixtral',
      [LLMModel.QWEN]: 'qwen',
      [LLMModel.DEEPSEEK]: 'deepseek',
    };
    return map[model] || model;
  }

  /**
   * Try fallback provider
   * @private
   */
  async _tryFallback(request, originalTier, error) {
    const tierConfig = TIER_MODEL_MAP[originalTier];
    if (!tierConfig?.fallback) return null;

    try {
      const fallbackModel = tierConfig.fallback;
      const provider = createLLMProvider(LLMProvider.OLLAMA, {
        model: fallbackModel,
      });

      const response = await provider.complete(request.content, {
        maxTokens: 1000,
      });

      return {
        tier: originalTier,
        provider: LLMProvider.OLLAMA,
        model: fallbackModel,
        response: {
          text: response.text,
          confidence: Math.min(response.confidence, PHI_INV) * 0.9, // Slightly lower confidence for fallback
          tokens: response.tokens,
          fallback: true,
        },
        cost: TIER_COSTS[originalTier] * 0.5, // Fallback models cheaper
        reason: `Fallback from ${error.message}`,
      };
    } catch {
      return null;
    }
  }

  /**
   * Local resolution for LOCAL tier
   * @private
   */
  _localResolve(request) {
    const content = request.content?.toLowerCase() || '';

    // Simple pattern matching for common queries
    if (content.match(/^(git )?status/)) {
      return {
        text: '*sniff* Use `git status` command for current state.',
        confidence: PHI_INV,
        local: true,
      };
    }

    if (content.match(/^list (files?|dirs?)/)) {
      return {
        text: '*ears perk* Use `ls` or Glob tool for file listing.',
        confidence: PHI_INV,
        local: true,
      };
    }

    // Default local response
    return {
      text: `*head tilt* Tier LOCAL - no LLM needed. Rule-based resolution.`,
      confidence: PHI_INV * 0.8,
      local: true,
    };
  }

  /**
   * Force refresh provider cache
   */
  async refreshProviders() {
    this._providers = {
      [ComplexityTier.LIGHT]: null,
      [ComplexityTier.FULL]: null,
    };
    this._availability.lastCheck = 0;
    await this._checkOllamaAvailability();
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      ...this.stats,
      costOptimizerStats: this.costOptimizer.getStats(),
      availability: {
        ollama: this._availability.ollama,
        models: this._availability.ollamaModels.length,
      },
    };
  }

  /**
   * Check if a specific tier is available
   */
  async isTierAvailable(tier) {
    if (tier === ComplexityTier.LOCAL) return true;
    const provider = await this._getProvider(tier);
    return provider !== null;
  }
}

// =============================================================================
// FACTORY & SINGLETON
// =============================================================================

/**
 * Create an LLMRouter instance
 */
export function createLLMRouter(options = {}) {
  return new LLMRouter(options);
}

// Singleton instance
let _router = null;

/**
 * Get the global LLMRouter instance
 */
export function getLLMRouter(options) {
  if (!_router) {
    _router = createLLMRouter(options);
  }
  return _router;
}

/**
 * Reset singleton (for testing)
 */
export function _resetLLMRouterForTesting() {
  _router = null;
}

export default {
  LLMRouter,
  TIER_MODEL_MAP,
  TIER_PROVIDER_CONFIG,
  createLLMRouter,
  getLLMRouter,
  _resetLLMRouterForTesting,
};
