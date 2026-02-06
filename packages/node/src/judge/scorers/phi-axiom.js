/**
 * PHI Axiom Scorers - Structure & Coherence
 *
 * Dimensions: COHERENCE, ELEGANCE, STRUCTURE, HARMONY, PRECISION, COMPLETENESS, PROPORTION
 *
 * @module @cynic/node/judge/scorers/phi-axiom
 */

'use strict';

import {
  extractText,
  wordCount,
  sentenceCount,
  avgWordLength,
  hasCodePatterns,
  detectRiskPenalty,
  detectContradictions,
  normalize,
} from './utils.js';

/**
 * Score COHERENCE - Internal logical consistency
 */
export function scoreCoherence(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Structured data is more coherent
  if (typeof item === 'object' && item !== null) {
    score += 10;
  }

  // Has required fields
  if (item.id) score += 5;
  if (item.type) score += 5;

  // Has content
  if (text.length > 0) score += 10;

  // Consistent terminology (no wild variation)
  const words = text.toLowerCase().split(/\s+/);
  const uniqueRatio = new Set(words).size / Math.max(words.length, 1);
  // Good ratio is 0.3-0.7 (some repetition = consistency)
  if (uniqueRatio >= 0.3 && uniqueRatio <= 0.7) {
    score += 10;
  }

  // Apply universal risk penalty - scams lack coherence
  score -= detectRiskPenalty(item, text);

  // Check for contradictions
  const contradictions = detectContradictions(text);
  score -= contradictions * 10;

  return normalize(score);
}

/**
 * Score HARMONY - Balance and proportion (phi-alignment)
 */
export function scoreHarmony(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  if (text.length === 0) return score;

  const words = wordCount(text);
  const sentences = sentenceCount(text);

  // phi-aligned proportions
  // Ideal words per sentence: ~13-21 (Fibonacci range)
  if (sentences > 0) {
    const wps = words / sentences;
    if (wps >= 13 && wps <= 21) {
      score += 20; // Perfect phi range
    } else if (wps >= 8 && wps <= 34) {
      score += 10; // Acceptable Fibonacci range
    }
  }

  // Balanced structure (intro/body/conclusion-like)
  if (sentences >= 3) {
    score += 10;
  }

  // Not too short, not too long
  if (words >= 21 && words <= 987) { // Fibonacci bounds
    score += 10;
  }

  // Scams disrupt harmony - they are imbalanced, aggressive
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score STRUCTURE - Organizational clarity
 */
export function scoreStructure(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has clear organization
  if (typeof item === 'object') {
    const keys = Object.keys(item);
    if (keys.length >= 3 && keys.length <= 13) { // Fibonacci bounds
      score += 15;
    }
  }

  // Has sections/paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length >= 2) {
    score += 10;
  }

  // Has headers or markers
  if (/^#+\s|^\d+\.\s|^-\s/m.test(text)) {
    score += 10;
  }

  // Code has structure markers
  if (hasCodePatterns(text)) {
    if (/\{\s*\n.*\n\s*\}/s.test(text)) score += 10;
    if (/\/\*[\s\S]*?\*\/|\/\/.*$/m.test(text)) score += 5; // Comments
  }

  // Scams lack proper structure - chaotic, deceptive
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score ELEGANCE - Simplicity and beauty
 */
export function scoreElegance(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  if (text.length === 0) return score;

  const words = wordCount(text);
  const avgLen = avgWordLength(text);

  // Concise is elegant - penalize verbosity
  if (words > 0 && words < 144) { // Fib(12)
    score += 15;
  } else if (words > 987) { // Too verbose
    score -= 10;
  }

  // Clear language (not overly complex)
  if (avgLen < 6) {
    score += 10; // Simple words
  } else if (avgLen > 8) {
    score -= 5; // Overly complex
  }

  // Code elegance: short functions, clear names
  if (hasCodePatterns(text)) {
    const lines = text.split('\n').length;
    if (lines < 50) score += 10;
  }

  // Scams are ugly - no elegance in deception
  score -= detectRiskPenalty(item, text);

  // Minimal filler words
  const fillers = (text.match(/\b(very|really|just|actually|basically|literally)\b/gi) || []).length;
  score -= fillers * 3;

  return normalize(score);
}

/**
 * Score COMPLETENESS - Wholeness of solution
 */
export function scoreCompleteness(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has multiple required elements
  if (item.id) score += 5;
  if (item.type) score += 5;
  if (text.length > 0) score += 10;
  if (item.metadata || item.meta) score += 5;
  if (item.timestamp || item.createdAt) score += 5;

  // Has introduction and conclusion signals
  if (/^(first|to begin|introduction|overview)/im.test(text)) score += 5;
  if (/(in conclusion|finally|summary|to summarize)/im.test(text)) score += 5;

  // Code completeness: has imports, exports, error handling
  if (hasCodePatterns(text)) {
    if (/import\s+/m.test(text)) score += 5;
    if (/export\s+/m.test(text)) score += 5;
    if (/try\s*\{|catch\s*\(/m.test(text)) score += 5;
    if (/return\s+/m.test(text)) score += 5;
  }

  // Scams are incomplete - missing substance, missing truth
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score PRECISION - Accuracy and exactness
 */
export function scorePrecision(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has specific identifiers
  if (item.id) score += 10;
  if (item.version) score += 5;

  // Contains numbers/specifics
  const hasNumbers = /\d+/.test(text);
  if (hasNumbers) score += 10;

  // Has precise timestamps
  if (item.timestamp || item.createdAt) {
    if (typeof item.timestamp === 'number' || typeof item.createdAt === 'number') {
      score += 10;
    }
  }

  // Code precision: typed, specific variable names
  if (hasCodePatterns(text)) {
    if (/:\s*(string|number|boolean|object|array)/i.test(text)) score += 10;
  }

  // Scams lack precision - vague claims, deceptive numbers
  score -= detectRiskPenalty(item, text);

  // Avoids vague language
  const vagueWords = (text.match(/\b(some|many|few|several|various|etc|stuff|things)\b/gi) || []).length;
  score -= vagueWords * 3;

  return normalize(score);
}

/**
 * Score PROPORTION - Ratio of parts to whole at every scale (φ seeing φ)
 */
export function scoreProportion(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  if (text.length === 0) return score;

  const words = wordCount(text);
  const sentences = sentenceCount(text);

  // φ ratio in structure (intro:body ≈ 38:62)
  if (typeof item === 'object') {
    const keys = Object.keys(item);
    if (keys.length >= 5 && keys.length <= 8) score += 10; // φ-range
  }

  // Balanced paragraph lengths (self-similarity)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length >= 2) {
    const lengths = paragraphs.map(p => p.length);
    const avg = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    const variance = lengths.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / lengths.length;
    const cv = Math.sqrt(variance) / Math.max(avg, 1); // coefficient of variation
    if (cv < 0.5) score += 15; // Self-similar proportions
    else if (cv < 1.0) score += 5;
  }

  // Fibonacci-range sentence count
  if (sentences >= 3 && sentences <= 21) score += 10;

  // Scams distort proportion — overblown claims, tiny substance
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * PHI Axiom scorer map
 */
export const PhiScorers = {
  COHERENCE: scoreCoherence,
  HARMONY: scoreHarmony,
  STRUCTURE: scoreStructure,
  ELEGANCE: scoreElegance,
  COMPLETENESS: scoreCompleteness,
  PRECISION: scorePrecision,
  PROPORTION: scoreProportion,
};
