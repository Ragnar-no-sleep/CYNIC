/**
 * CYNIC Response Handler - Da'at Bridge (Task #94)
 *
 * Handles LLM responses by running them through CYNIC judgment.
 * Ensures all responses to the human are filtered through the Dog collective.
 *
 * "Le chien juge les réponses avant qu'elles n'atteignent l'humain"
 *
 * @module scripts/hooks/lib/response-handler
 */

'use strict';

import { PHI_INV } from './constants.js';

/**
 * Response judgment result
 */
export class ResponseJudgment {
  constructor(data = {}) {
    this.approved = data.approved ?? true;
    this.content = data.content || '';
    this.reason = data.reason || null;
    this.qScore = data.qScore ?? 50;
    this.confidence = data.confidence ?? PHI_INV;
    this.verdict = data.verdict || 'OBSERVE';
    this.thought = data.thought || null;
    this.metadata = data.metadata || {};
  }

  get isGood() {
    return this.qScore >= 60;
  }

  get needsReview() {
    return this.qScore >= 40 && this.qScore < 60;
  }

  get isRejected() {
    return !this.approved || this.qScore < 40;
  }
}

/**
 * Handle LLM response by sending it through CYNIC judgment
 *
 * @param {Object} response - LLM response object
 * @param {string} response.content - Response content
 * @param {string} [response.model] - Model that generated response
 * @param {Object} [response.tokens] - Token usage
 * @param {Object} [originalThought] - Original Brain thought that led to this
 * @param {Object} [context] - Additional context
 * @param {Object} [brain] - Brain instance for judgment
 * @returns {Promise<ResponseJudgment>} Judgment result
 */
export async function handleLLMResponse(response, originalThought = null, context = {}, brain = null) {
  // No brain available, approve by default
  if (!brain) {
    return new ResponseJudgment({
      approved: true,
      content: response.content,
      qScore: 50,
      confidence: 0.5,
      verdict: 'OBSERVE',
      metadata: { source: 'no_brain' },
    });
  }

  try {
    // 1. Send response to Brain for judgment
    const responseThought = await brain.judge({
      content: response.content,
      type: 'llm_response',
      context: {
        originalThought: originalThought?.id,
        originalDecision: originalThought?.decision?.action,
        model: response.model || 'unknown',
        tokens: response.tokens,
        ...context,
      },
    });

    // 2. Check if response passes CYNIC judgment
    if (responseThought.decision?.action === 'reject') {
      return new ResponseJudgment({
        approved: false,
        content: response.content,
        reason: responseThought.decision.reason || 'Rejected by CYNIC judgment',
        qScore: responseThought.judgment?.score || 0,
        confidence: responseThought.confidence || 0,
        verdict: responseThought.judgment?.verdict || 'GROWL',
        thought: responseThought,
        metadata: { source: 'rejected' },
      });
    }

    // 3. Return approved response with judgment metadata
    return new ResponseJudgment({
      approved: true,
      content: response.content,
      qScore: responseThought.judgment?.score || 50,
      confidence: responseThought.confidence || PHI_INV,
      verdict: responseThought.judgment?.verdict || 'WAG',
      thought: responseThought,
      metadata: {
        source: 'brain_judgment',
        multiLLM: responseThought.judgment?.multiLLM,
      },
    });
  } catch (err) {
    // Judgment failed, approve with low confidence
    return new ResponseJudgment({
      approved: true,
      content: response.content,
      qScore: 40,
      confidence: 0.3,
      verdict: 'OBSERVE',
      metadata: { source: 'judgment_error', error: err.message },
    });
  }
}

/**
 * Format response for user with CYNIC metadata
 *
 * Adds Q-Score and confidence indicator to response.
 *
 * @param {ResponseJudgment} judgment - Response judgment
 * @param {Object} [options] - Formatting options
 * @param {boolean} [options.showMetadata=true] - Show Q-Score line
 * @param {boolean} [options.showReason=true] - Show rejection reason
 * @returns {string} Formatted response
 */
export function formatResponseWithMetadata(judgment, options = {}) {
  const { showMetadata = true, showReason = true } = options;

  // Rejected response
  if (!judgment.approved) {
    const reason = showReason && judgment.reason ? `: ${judgment.reason}` : '';
    return `*GROWL* Response rejected${reason}`;
  }

  // No metadata requested
  if (!showMetadata) {
    return judgment.content;
  }

  // Build indicator
  const qScore = judgment.qScore;
  const confidence = Math.round(judgment.confidence * 100);
  let indicator;

  if (qScore >= 60) {
    indicator = '✅';
  } else if (qScore >= 40) {
    indicator = '⚠️';
  } else {
    indicator = '❌';
  }

  // Format verdict
  const verdictEmoji = {
    HOWL: '🌟',
    WAG: '✅',
    OBSERVE: '👁️',
    GROWL: '❌',
    BARK: '⚠️',
  };
  const verdictIcon = verdictEmoji[judgment.verdict] || '📊';

  return `${judgment.content}

${indicator} Q-Score: ${qScore}/100 | ${verdictIcon} ${judgment.verdict} | Confidence: ${confidence}%`;
}

/**
 * Quick check if response should be shown to user
 *
 * @param {ResponseJudgment} judgment - Response judgment
 * @param {number} [minQScore=30] - Minimum Q-Score to show
 * @returns {boolean} Whether to show response
 */
export function shouldShowResponse(judgment, minQScore = 30) {
  return judgment.approved && judgment.qScore >= minQScore;
}

/**
 * Get response warning level for UI
 *
 * @param {ResponseJudgment} judgment - Response judgment
 * @returns {'none'|'low'|'medium'|'high'} Warning level
 */
export function getWarningLevel(judgment) {
  if (!judgment.approved) return 'high';
  if (judgment.qScore < 40) return 'high';
  if (judgment.qScore < 55) return 'medium';
  if (judgment.qScore < 70) return 'low';
  return 'none';
}

export default {
  ResponseJudgment,
  handleLLMResponse,
  formatResponseWithMetadata,
  shouldShowResponse,
  getWarningLevel,
};
