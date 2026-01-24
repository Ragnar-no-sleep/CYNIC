/**
 * Scorer Utility Functions
 *
 * Shared utilities for all dimension scorers.
 *
 * @module @cynic/node/judge/scorers/utils
 */

'use strict';

/**
 * Extract text content from item
 * @param {Object} item - Item to extract from
 * @returns {string} Extracted text
 */
export function extractText(item) {
  if (typeof item === 'string') return item;
  if (typeof item.content === 'string') return item.content;
  if (typeof item.body === 'string') return item.body;
  if (typeof item.text === 'string') return item.text;
  if (typeof item.data === 'string') return item.data;
  if (typeof item.description === 'string') return item.description;
  return '';
}

/**
 * Count words in text
 * @param {string} text
 * @returns {number}
 */
export function wordCount(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Count sentences in text
 * @param {string} text
 * @returns {number}
 */
export function sentenceCount(text) {
  if (!text) return 0;
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
}

/**
 * Calculate average word length
 * @param {string} text
 * @returns {number}
 */
export function avgWordLength(text) {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  return words.reduce((sum, w) => sum + w.length, 0) / words.length;
}

/**
 * Check if text has code patterns
 * @param {string} text
 * @returns {boolean}
 */
export function hasCodePatterns(text) {
  if (!text) return false;
  const codeIndicators = [
    /function\s+\w+/,
    /class\s+\w+/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /import\s+.*from/,
    /export\s+(default\s+)?/,
    /def\s+\w+\(/,
    /=>\s*[{(]/,
    /\{\s*\n/,
  ];
  return codeIndicators.some(p => p.test(text));
}

/**
 * Detect risk level from item (for universal penalty application)
 * @param {Object} item - Item to analyze
 * @param {string} text - Extracted text
 * @returns {number} Risk penalty (0-60)
 */
export function detectRiskPenalty(item, text) {
  let penalty = 0;

  // Risk tags from enricher
  if (item.tags && Array.isArray(item.tags)) {
    const riskTags = item.tags.filter(t => t.startsWith('risk:'));
    penalty += riskTags.length * 10;
  }

  // Direct scam indicators in text
  const scamPatterns = [
    /scam|fraud|rug\s*pull|honeypot|ponzi/i,
    /anonymous\s*(team|dev)/i,
    /fake\s*(liquidity|volume|audit|team)/i,
    /100%\s*(tax|fee|slippage)/i,
    /copy[\s-]*paste\s*code/i,
    /zero\s*audit|no\s*audit|unaudited/i,
  ];
  penalty += scamPatterns.filter(p => p.test(text)).length * 12;

  // Extractive/exploitative patterns
  const extractivePatterns = [
    /guaranteed.*return|guaranteed.*profit/i,
    /\d{3,}x\s*(return|profit|gain)/i, // 100x+ claims
    /get rich|make millions/i,
  ];
  penalty += extractivePatterns.filter(p => p.test(text)).length * 8;

  return Math.min(penalty, 60); // Cap at 60 to not instantly zero everything
}

/**
 * Check for contradictions (simple heuristic)
 * @param {string} text
 * @returns {number} Number of potential contradictions
 */
export function detectContradictions(text) {
  if (!text) return 0;
  const contradictionPatterns = [
    /but\s+also\s+not/i,
    /however.*but.*however/i,
    /is\s+not.*is\s+/i,
    /always.*never/i,
    /never.*always/i,
  ];
  return contradictionPatterns.filter(p => p.test(text)).length;
}

/**
 * Calculate text complexity score
 * @param {string} text
 * @returns {number} 0-100
 */
export function calculateComplexity(text) {
  if (!text) return 50;

  const words = wordCount(text);
  const sentences = sentenceCount(text);
  const avgLen = avgWordLength(text);

  // Flesch-Kincaid approximation
  const wordsPerSentence = sentences > 0 ? words / sentences : words;

  // Technical words (longer words suggest more complexity)
  const techScore = Math.min(avgLen / 8, 1) * 30;

  // Sentence complexity
  const sentenceScore = Math.min(wordsPerSentence / 25, 1) * 30;

  // Code detection adds complexity
  const codeScore = hasCodePatterns(text) ? 20 : 0;

  return Math.min(techScore + sentenceScore + codeScore + 20, 100);
}

/**
 * Normalize score to 0-100
 * @param {number} score - Raw score
 * @returns {number} Normalized score
 */
export function normalize(score) {
  return Math.min(Math.max(Math.round(score * 10) / 10, 0), 100);
}
