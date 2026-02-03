/**
 * CYNIC Claude Code Adapter
 *
 * Pass-through adapter for when running inside Claude Code.
 * Note: Does NOT make API calls - just returns structured prompts
 * that the outer Claude Code will execute.
 *
 * @module @cynic/llm/adapters/claude-code
 */

'use strict';

import { PHI_INV } from '@cynic/core';
import { LLMAdapter } from './base.js';

/**
 * Claude Code Adapter
 *
 * Adapter for Claude when running inside Claude Code.
 * This is a "pass-through" adapter since Claude Code IS the LLM.
 */
export class ClaudeCodeAdapter extends LLMAdapter {
  constructor(options = {}) {
    super({
      provider: 'claude-code',
      model: options.model || 'claude-opus-4-5-20251101',
      ...options,
    });

    this.enabled = true; // Always enabled inside Claude Code
  }

  /**
   * Complete a prompt
   *
   * Since we're INSIDE Claude Code, this is a no-op that returns
   * the prompt formatted for the outer Claude to process.
   *
   * @param {string} prompt
   * @param {Object} [options]
   * @returns {Promise<LLMResponse>}
   */
  async complete(prompt, options = {}) {
    const startTime = Date.now();
    this.stats.requests++;

    // Inside Claude Code, we don't make API calls
    // We return a structured response indicating this should be processed
    // by the outer Claude

    const response = this._createResponse({
      content: prompt, // Return prompt as content for outer processing
      confidence: PHI_INV, // Claude Code is trusted
      tokens: { input: this._estimateTokens(prompt), output: 0 },
      duration: Date.now() - startTime,
      metadata: {
        type: 'pass-through',
        note: 'Prompt for outer Claude Code to process',
      },
    });

    this.stats.successes++;
    this.emit('complete', response);

    return response;
  }

  async isAvailable() {
    return true;
  }
}

export default ClaudeCodeAdapter;
