/**
 * LLM Provider Abstraction
 *
 * Simple interface for LLM providers (Claude, Ollama, OpenAI).
 * Enables local judgment with open source models.
 *
 * "φ distrusts φ" - Max confidence 61.8% regardless of provider
 *
 * @module @cynic/core/llm
 */

'use strict';

import { PHI_INV } from '../axioms/constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const LLMProvider = {
  CLAUDE: 'claude',
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  MOCK: 'mock',
};

export const LLMModel = {
  // Claude
  HAIKU: 'haiku',
  SONNET: 'sonnet',
  OPUS: 'opus',
  // Ollama (common models)
  LLAMA3: 'llama3',
  LLAMA3_70B: 'llama3:70b',
  MISTRAL: 'mistral',
  MIXTRAL: 'mixtral',
  QWEN: 'qwen2.5',
  DEEPSEEK: 'deepseek-r1',
  // OpenAI
  GPT4: 'gpt-4',
  GPT4O: 'gpt-4o',
  GPT4O_MINI: 'gpt-4o-mini',
};

// Model mapping: abstract → concrete
const MODEL_MAP = {
  // Claude (via Claude Code - no direct API needed)
  [LLMModel.HAIKU]: { provider: LLMProvider.CLAUDE, model: 'claude-3-5-haiku-latest' },
  [LLMModel.SONNET]: { provider: LLMProvider.CLAUDE, model: 'claude-sonnet-4-20250514' },
  [LLMModel.OPUS]: { provider: LLMProvider.CLAUDE, model: 'claude-opus-4-5-20251101' },
  // Ollama
  [LLMModel.LLAMA3]: { provider: LLMProvider.OLLAMA, model: 'llama3.2' },
  [LLMModel.LLAMA3_70B]: { provider: LLMProvider.OLLAMA, model: 'llama3.3:70b' },
  [LLMModel.MISTRAL]: { provider: LLMProvider.OLLAMA, model: 'mistral' },
  [LLMModel.MIXTRAL]: { provider: LLMProvider.OLLAMA, model: 'mixtral' },
  [LLMModel.QWEN]: { provider: LLMProvider.OLLAMA, model: 'qwen2.5' },
  [LLMModel.DEEPSEEK]: { provider: LLMProvider.OLLAMA, model: 'deepseek-r1:14b' },
  // OpenAI
  [LLMModel.GPT4]: { provider: LLMProvider.OPENAI, model: 'gpt-4-turbo' },
  [LLMModel.GPT4O]: { provider: LLMProvider.OPENAI, model: 'gpt-4o' },
  [LLMModel.GPT4O_MINI]: { provider: LLMProvider.OPENAI, model: 'gpt-4o-mini' },
};

// Cost per 1M tokens (approximate, for routing decisions)
const MODEL_COSTS = {
  [LLMModel.HAIKU]: { input: 0.25, output: 1.25 },
  [LLMModel.SONNET]: { input: 3, output: 15 },
  [LLMModel.OPUS]: { input: 15, output: 75 },
  [LLMModel.LLAMA3]: { input: 0, output: 0 },      // Local = free
  [LLMModel.LLAMA3_70B]: { input: 0, output: 0 },
  [LLMModel.MISTRAL]: { input: 0, output: 0 },
  [LLMModel.MIXTRAL]: { input: 0, output: 0 },
  [LLMModel.QWEN]: { input: 0, output: 0 },
  [LLMModel.DEEPSEEK]: { input: 0, output: 0 },
  [LLMModel.GPT4]: { input: 10, output: 30 },
  [LLMModel.GPT4O]: { input: 2.5, output: 10 },
  [LLMModel.GPT4O_MINI]: { input: 0.15, output: 0.6 },
};

// ═══════════════════════════════════════════════════════════════════════════
// BASE PROVIDER CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base LLM Provider
 */
export class BaseLLMProvider {
  constructor(options = {}) {
    this.type = options.type || LLMProvider.MOCK;
    this.defaultModel = options.defaultModel || LLMModel.HAIKU;
    this.maxConfidence = PHI_INV; // φ⁻¹ = 61.8% - NEVER exceed

    // Stats
    this._stats = {
      calls: 0,
      tokens: { input: 0, output: 0 },
      errors: 0,
      latencyMs: 0,
    };
  }

  /**
   * Generate completion
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<{text: string, confidence: number, tokens: {input: number, output: number}}>}
   */
  async complete(prompt, options = {}) {
    throw new Error('complete() must be implemented by subclass');
  }

  /**
   * Judge an item using this provider
   * @param {Object} item - Item to judge
   * @param {string} systemPrompt - Judgment system prompt
   * @returns {Promise<{score: number, verdict: string, reasoning: string, confidence: number}>}
   */
  async judge(item, systemPrompt) {
    const prompt = `${systemPrompt}\n\nItem to judge:\n${JSON.stringify(item, null, 2)}`;
    const result = await this.complete(prompt, {
      temperature: 0.3, // Low for consistency
      maxTokens: 1000,
    });

    // Parse judgment from response
    return this._parseJudgment(result.text);
  }

  /**
   * Get cost estimate for a prompt
   * @param {string} prompt - Input prompt
   * @param {string} model - Model to use
   * @returns {{inputCost: number, estimatedOutputCost: number}}
   */
  getCost(prompt, model = this.defaultModel) {
    const costs = MODEL_COSTS[model] || { input: 0, output: 0 };
    const inputTokens = Math.ceil(prompt.length / 4); // Rough estimate
    const outputTokens = 500; // Estimated average

    return {
      inputCost: (inputTokens / 1_000_000) * costs.input,
      estimatedOutputCost: (outputTokens / 1_000_000) * costs.output,
      model,
      isLocal: costs.input === 0,
    };
  }

  /**
   * Get provider stats
   */
  getStats() {
    return { ...this._stats, type: this.type };
  }

  /**
   * Parse judgment from LLM response
   * @private
   */
  _parseJudgment(text) {
    // Try JSON parsing first
    try {
      const jsonMatch = text.match(/\{[\s\S]*"score"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.min(parsed.score || 50, 100 * this.maxConfidence),
          verdict: parsed.verdict || this._scoreToVerdict(parsed.score),
          reasoning: parsed.reasoning || text,
          confidence: Math.min(parsed.confidence || 0.5, this.maxConfidence),
        };
      }
    } catch (e) { /* continue to fallback */ }

    // Fallback: extract score from text
    const scoreMatch = text.match(/score[:\s]+(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

    return {
      score: Math.min(score, 100 * this.maxConfidence),
      verdict: this._scoreToVerdict(score),
      reasoning: text,
      confidence: this.maxConfidence * 0.8, // Lower confidence for fallback
    };
  }

  /**
   * Convert score to verdict
   * @private
   */
  _scoreToVerdict(score) {
    if (score >= 61.8) return 'HOWL';  // φ⁻¹ threshold
    if (score >= 50) return 'WAG';
    if (score >= 38.2) return 'BARK';  // φ⁻² threshold
    return 'GROWL';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OLLAMA PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ollama Provider - Local LLM inference
 */
export class OllamaLLMProvider extends BaseLLMProvider {
  constructor(options = {}) {
    super({ ...options, type: LLMProvider.OLLAMA });
    this.baseUrl = options.baseUrl || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.defaultModel = options.model || LLMModel.LLAMA3;
    this.timeout = options.timeout || 60000; // 60s for local inference
  }

  async complete(prompt, options = {}) {
    const model = MODEL_MAP[options.model || this.defaultModel]?.model || 'llama3.2';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 1000,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();

      this._stats.calls++;
      this._stats.tokens.input += data.prompt_eval_count || 0;
      this._stats.tokens.output += data.eval_count || 0;

      return {
        text: data.response,
        confidence: this.maxConfidence,
        tokens: {
          input: data.prompt_eval_count || 0,
          output: data.eval_count || 0,
        },
        model,
        provider: this.type,
      };

    } catch (err) {
      this._stats.errors++;
      if (err.name === 'AbortError') {
        throw new Error(`Ollama timeout after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models?.map(m => m.name) || [];
    } catch {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OPENAI PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OpenAI Provider
 */
export class OpenAILLMProvider extends BaseLLMProvider {
  constructor(options = {}) {
    super({ ...options, type: LLMProvider.OPENAI });
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = options.model || LLMModel.GPT4O_MINI;

    if (!this.apiKey) {
      console.warn('[OpenAILLMProvider] No API key - provider disabled');
    }
  }

  async complete(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key required');
    }

    const model = MODEL_MAP[options.model || this.defaultModel]?.model || 'gpt-4o-mini';

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI error: ${error.error?.message || response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    this._stats.calls++;
    this._stats.tokens.input += data.usage?.prompt_tokens || 0;
    this._stats.tokens.output += data.usage?.completion_tokens || 0;

    return {
      text: choice?.message?.content || '',
      confidence: this.maxConfidence,
      tokens: {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0,
      },
      model,
      provider: this.type,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK PROVIDER (for testing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mock Provider - For testing
 */
export class MockLLMProvider extends BaseLLMProvider {
  constructor(options = {}) {
    super({ ...options, type: LLMProvider.MOCK });
  }

  async complete(prompt, options = {}) {
    // Generate deterministic mock response
    const hash = this._hashPrompt(prompt);
    const score = 30 + (hash % 40); // 30-70 range

    this._stats.calls++;
    this._stats.tokens.input += Math.ceil(prompt.length / 4);
    this._stats.tokens.output += 100;

    return {
      text: JSON.stringify({
        score,
        verdict: this._scoreToVerdict(score),
        reasoning: `Mock judgment for prompt hash ${hash}`,
        confidence: this.maxConfidence * 0.7,
      }),
      confidence: this.maxConfidence * 0.7,
      tokens: { input: Math.ceil(prompt.length / 4), output: 100 },
      model: 'mock',
      provider: this.type,
    };
  }

  _hashPrompt(prompt) {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      hash = ((hash << 5) - hash) + prompt.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create LLM provider based on configuration
 *
 * Priority:
 * 1. Explicit CYNIC_LLM_PROVIDER env var
 * 2. Auto-detect Ollama if running locally (free)
 * 3. Fall back to Mock
 *
 * @param {Object} options - Provider options
 * @returns {BaseLLMProvider}
 */
export function createLLMProvider(options = {}) {
  const envProvider = process.env.CYNIC_LLM_PROVIDER?.toLowerCase();
  const type = options.type || envProvider;

  // Explicit type requested
  if (type) {
    switch (type) {
      case LLMProvider.OLLAMA:
      case 'ollama':
        return new OllamaLLMProvider(options);
      case LLMProvider.OPENAI:
      case 'openai':
        return new OpenAILLMProvider(options);
      case LLMProvider.MOCK:
      case 'mock':
        return new MockLLMProvider(options);
      case LLMProvider.CLAUDE:
      case 'claude':
        // Claude is handled via Claude Code, not direct API
        console.warn('[LLMProvider] Claude provider = use Claude Code subagents');
        return new MockLLMProvider(options);
    }
  }

  // Auto-detect: return lazy provider
  return new AutoDetectLLMProvider(options);
}

/**
 * Auto-detecting LLM Provider
 * Tries Ollama first (free, local), falls back to Mock
 */
export class AutoDetectLLMProvider extends BaseLLMProvider {
  constructor(options = {}) {
    super({ ...options, type: 'auto' });
    this._realProvider = null;
    this._detectPromise = null;
    this._options = options;
  }

  async _detect() {
    if (this._realProvider) return this._realProvider;
    if (this._detectPromise) return this._detectPromise;

    this._detectPromise = (async () => {
      // Try Ollama first
      const ollama = new OllamaLLMProvider(this._options);
      if (await ollama.isAvailable()) {
        console.error('[LLMProvider] ✓ Ollama detected - using local inference');
        this._realProvider = ollama;
        this.type = LLMProvider.OLLAMA;
        return ollama;
      }

      // Check OpenAI
      if (process.env.OPENAI_API_KEY) {
        console.error('[LLMProvider] ✓ OpenAI API key found');
        this._realProvider = new OpenAILLMProvider(this._options);
        this.type = LLMProvider.OPENAI;
        return this._realProvider;
      }

      // Fall back to mock
      console.error('[LLMProvider] ⚠ Using MockProvider - no LLM available');
      console.error('[LLMProvider]   For local judgment, install Ollama: https://ollama.ai');
      this._realProvider = new MockLLMProvider(this._options);
      this.type = LLMProvider.MOCK;
      return this._realProvider;
    })();

    return this._detectPromise;
  }

  async complete(prompt, options = {}) {
    const provider = await this._detect();
    return provider.complete(prompt, options);
  }

  async judge(item, systemPrompt) {
    const provider = await this._detect();
    return provider.judge(item, systemPrompt);
  }

  getStats() {
    if (this._realProvider) {
      return this._realProvider.getStats();
    }
    return super.getStats();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _llmProvider = null;

/**
 * Get or create singleton LLM provider
 */
export function getLLMProvider(options = {}) {
  if (!_llmProvider) {
    _llmProvider = createLLMProvider(options);
  }
  return _llmProvider;
}

/**
 * Reset singleton (for testing)
 */
export function resetLLMProvider() {
  _llmProvider = null;
}

export default {
  LLMProvider,
  LLMModel,
  BaseLLMProvider,
  OllamaLLMProvider,
  OpenAILLMProvider,
  MockLLMProvider,
  AutoDetectLLMProvider,
  createLLMProvider,
  getLLMProvider,
  resetLLMProvider,
};
