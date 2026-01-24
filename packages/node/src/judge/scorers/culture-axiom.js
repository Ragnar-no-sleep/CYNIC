/**
 * CULTURE Axiom Scorers - Cultural Fit
 *
 * Dimensions: AUTHENTICITY, RELEVANCE, NOVELTY, ALIGNMENT, IMPACT, RESONANCE
 *
 * @module @cynic/node/judge/scorers/culture-axiom
 */

'use strict';

import {
  extractText,
  wordCount,
  detectRiskPenalty,
  normalize,
} from './utils.js';

/**
 * Score AUTHENTICITY - Genuine and original
 */
export function scoreAuthenticity(item, context = {}) {
  let score = 50;
  const text = extractText(item);
  const words = item.wordCount || wordCount(text);

  // Enriched authenticity signals (from item-enricher)
  if (item.original === true) score += 15;
  if (item.authentic === true) score += 15;

  // Has author/creator (enricher adds 'CYNIC' as default)
  if (item.author || item.creator) score += 10;

  // Unique identifier
  if (item.id && typeof item.id === 'string' && item.id.length > 8) score += 5;

  // Not a copy/fork
  if (!item.forkedFrom && !item.copiedFrom) score += 10;

  // Has personal voice (I, we statements)
  if (/\b(I|we|my|our)\s+(?!==)/i.test(text)) score += 5;

  // Has enriched tags (sign of analysis)
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) score += 5;

  // Quality tags boost authenticity
  if (item.tags && Array.isArray(item.tags)) {
    const qualityTags = item.tags.filter(t => t.startsWith('quality:'));
    score += Math.min(qualityTags.length * 8, 20);
  }

  // Risk tags from enricher - NOT authentic
  if (item.tags && Array.isArray(item.tags)) {
    const riskTags = item.tags.filter(t => t.startsWith('risk:'));
    score -= riskTags.length * 15;
  }

  // Direct scam indicators destroy authenticity
  const scamPatterns = [
    /scam|fraud|rug\s*pull|honeypot|ponzi/i,
    /anonymous\s*(team|dev)/i,
    /fake/i,
  ];
  const scamCount = scamPatterns.filter(p => p.test(text)).length;
  score -= scamCount * 20;

  // Very short content - reduced penalty (items can be identifiers)
  if (words < 3) score -= 10;
  else if (words < 5) score -= 5;

  // Generic template phrases
  const genericPatterns = [
    /lorem ipsum/i,
    /click here/i,
    /buy now/i,
    /limited time/i,
    /act now/i,
    /\[insert\s+\w+\]/i,
  ];
  const genericCount = genericPatterns.filter(p => p.test(text)).length;
  score -= genericCount * 8;

  // Is a copy/fork
  if (item.forkedFrom || item.copiedFrom) score -= 15;

  return normalize(score);
}

/**
 * Score RELEVANCE - Pertinent to context
 */
export function scoreRelevance(item, context = {}) {
  let score = 50;
  const text = extractText(item);
  const words = item.wordCount || wordCount(text);

  // Has explicit relevance (from enricher)
  if (item.relevance) {
    score += typeof item.relevance === 'number' ? Math.min(item.relevance / 2, 25) : 20;
  }

  // Has tags/categories (from enricher)
  if (item.tags && Array.isArray(item.tags)) {
    score += Math.min(item.tags.length * 3, 20);
  }

  // Context match
  if (context.topic && text.toLowerCase().includes(context.topic.toLowerCase())) {
    score += 15;
  }

  // Domain relevance (crypto/blockchain)
  const domainTerms = ['token', 'crypto', 'blockchain', 'solana', 'ethereum', 'wallet', 'defi'];
  const domainMatches = domainTerms.filter(t => text.toLowerCase().includes(t)).length;
  if (domainMatches > 0) score += Math.min(domainMatches * 5, 15);

  // Recent is more relevant
  if (item.createdAt) {
    const age = Date.now() - item.createdAt;
    const dayAge = age / (1000 * 60 * 60 * 24);
    if (dayAge < 1) score += 10;
    else if (dayAge < 7) score += 5;
  }

  // Empty content - reduced penalty
  if (words < 2) score -= 15;
  else if (words < 5) score -= 5;

  // Old content loses relevance (> 90 days)
  if (item.createdAt) {
    const age = Date.now() - item.createdAt;
    const dayAge = age / (1000 * 60 * 60 * 24);
    if (dayAge > 365) score -= 15;
    else if (dayAge > 90) score -= 8;
  }

  // Generic filler content
  if (/^(test|example|sample|placeholder|untitled)/i.test(text.trim())) {
    score -= 15;
  }

  return normalize(score);
}

/**
 * Score NOVELTY - New or unique contribution
 */
export function scoreNovelty(item, context = {}) {
  let score = 50; // Start neutral, not pessimistic
  const text = extractText(item);
  const words = item.wordCount || wordCount(text);

  // New item (from enricher - items are now tagged with createdAt)
  if (item.createdAt && Date.now() - item.createdAt < 86400000) {
    score += 15;
  }

  // Marked as original/new (from enricher authenticity detection)
  if (item.original === true || item.isNew === true) {
    score += 15;
  }

  // Has unique content
  if (item.unique === true) score += 15;

  // First of its kind
  if (item.first === true || item.pioneer === true) score += 15;

  // Has hash (unique identifier from enricher)
  if (item.hash) score += 5;

  // Old content is not novel (> 30 days)
  if (item.createdAt) {
    const age = Date.now() - item.createdAt;
    const dayAge = age / (1000 * 60 * 60 * 24);
    if (dayAge > 180) score -= 15;
    else if (dayAge > 30) score -= 8;
  }

  // Copy/fork = not novel
  if (item.forkedFrom || item.copiedFrom || item.duplicate) {
    score -= 20;
  }

  // Template/boilerplate patterns
  const boilerplatePatterns = [
    /^(hello world|foo bar|test)/i,
    /lorem ipsum/i,
    /\{\{.*\}\}/,  // Mustache templates
    /<%-?.*%>/,    // EJS templates
  ];
  if (boilerplatePatterns.some(p => p.test(text))) {
    score -= 15;
  }

  // Very short - mild penalty only
  if (words < 2) score -= 10;

  return normalize(score);
}

/**
 * Score ALIGNMENT - Fits cultural values
 */
export function scoreAlignment(item, context = {}) {
  let score = 50;
  const text = extractText(item);
  const words = item.wordCount || wordCount(text);

  // phi-aligned values
  if (/φ|phi|golden\s*ratio/i.test(text)) score += 10;
  if (/verify|trust.*verify/i.test(text)) score += 10;
  if (/burn.*extract|non.*extractive/i.test(text)) score += 10;

  // Follows standards
  if (item.standards || item.compliance) score += 10;

  // Has community endorsement
  if (item.endorsed === true || item.approved === true) score += 10;

  // Ethical considerations
  if (item.ethical || /ethic|fair|equit/i.test(text)) score += 5;

  // Quality tags from enricher boost score
  if (item.tags && Array.isArray(item.tags)) {
    const qualityTags = item.tags.filter(t => t.startsWith('quality:'));
    score += Math.min(qualityTags.length * 8, 20);
  }

  // Risk tags from enricher - HEAVY penalties
  if (item.tags && Array.isArray(item.tags)) {
    const riskTags = item.tags.filter(t => t.startsWith('risk:'));
    score -= riskTags.length * 15; // Each risk tag = -15
  }

  // Direct scam/fraud indicators in text
  const scamPatterns = [
    /scam|fraud|rug\s*pull|honeypot|ponzi/i,
    /anonymous\s*(team|dev)/i,
    /fake\s*(liquidity|volume|audit)/i,
    /100%\s*(tax|fee)/i,
    /copy[\s-]*paste\s*code/i,
  ];
  const scamCount = scamPatterns.filter(p => p.test(text)).length;
  score -= scamCount * 20;

  // Anti-pattern indicators (extractive, exploitative)
  const antiPatterns = [
    /get rich quick/i,
    /guaranteed.*return/i,
    /\d+x\s*(return|profit|gain)/i,
    /pump|moon|lambo/i,
    /shill|fomo|fud/i,
    /free money/i,
    /act fast|limited offer/i,
  ];
  const antiCount = antiPatterns.filter(p => p.test(text)).length;
  score -= antiCount * 12;

  // Spam/scam patterns
  if (/\$\$\$|!!!|👉|🚀{3,}/u.test(text)) {
    score -= 15;
  }

  // No substance - mild penalty
  if (words < 3) score -= 10;

  // Rejected/flagged
  if (item.rejected === true || item.flagged === true) {
    score -= 25;
  }

  return normalize(score);
}

/**
 * Score IMPACT - Meaningful effect
 */
export function scoreImpact(item, context = {}) {
  let score = 45;
  const text = extractText(item);
  const words = wordCount(text);

  // Has explicit impact
  if (item.impact) {
    score += typeof item.impact === 'number' ? item.impact / 2 : 15;
  }

  // Has usage metrics
  if (item.usageCount && item.usageCount > 0) {
    score += Math.min(Math.log10(item.usageCount + 1) * 10, 25);
  }

  // Has citations/references
  if (item.citations && item.citations > 0) {
    score += Math.min(item.citations * 2, 20);
  }

  // Has downstream effects
  if (item.derivatives && item.derivatives > 0) score += 10;

  // No metrics at all = no measurable impact
  if (!item.usageCount && !item.citations && !item.derivatives && !item.impact) {
    score -= 15;
  }

  // Zero engagement explicitly
  if (item.views === 0 || item.downloads === 0 || item.usageCount === 0) {
    score -= 10;
  }

  // No clear purpose
  if (!item.purpose && !item.goal && words < 10) {
    score -= 10;
  }

  // Low-effort content markers
  if (words < 5) score -= 20;
  else if (words < 10) score -= 10;

  // Deprecated/archived = diminished impact
  if (item.deprecated === true || item.archived === true) {
    score -= 15;
  }

  return normalize(score);
}

/**
 * Score RESONANCE - Connects emotionally
 */
export function scoreResonance(item, context = {}) {
  let score = 45;
  const text = extractText(item);
  const words = wordCount(text);

  // Has emotional language
  const emotionalWords = (text.match(/\b(love|hate|fear|joy|hope|trust|believe|feel|passion|inspire)\b/gi) || []).length;
  score += Math.min(emotionalWords * 5, 20);

  // Has engagement metrics
  if (item.likes || item.reactions) {
    const engagement = item.likes || item.reactions;
    score += Math.min(Math.log10(engagement + 1) * 8, 20);
  }

  // Has comments/discussion
  if (item.comments && item.comments > 0) {
    score += Math.min(item.comments * 2, 15);
  }

  // Personal/relatable
  if (/\b(you|your|we|our|us)\b/i.test(text)) score += 5;

  // No emotional content at all
  if (emotionalWords === 0 && words > 20) {
    score -= 10;
  }

  // Corporate/robotic language
  const corporatePatterns = [
    /\b(leverage|synergy|stakeholder|deliverable|bandwidth)\b/i,
    /\b(circle back|move the needle|low-hanging fruit)\b/i,
    /\b(pursuant to|in accordance with|hereby)\b/i,
  ];
  const corporateCount = corporatePatterns.filter(p => p.test(text)).length;
  score -= corporateCount * 8;

  // Zero engagement
  if (item.likes === 0 && item.comments === 0 && item.reactions === 0) {
    score -= 10;
  }

  // No substance to resonate with
  if (words < 5) score -= 20;
  else if (words < 10) score -= 10;

  // Generic filler
  if (/^(ok|okay|yes|no|thanks|thank you|good|nice|cool)$/i.test(text.trim())) {
    score -= 25;
  }

  return normalize(score);
}

/**
 * CULTURE Axiom scorer map
 */
export const CultureScorers = {
  AUTHENTICITY: scoreAuthenticity,
  RELEVANCE: scoreRelevance,
  NOVELTY: scoreNovelty,
  ALIGNMENT: scoreAlignment,
  IMPACT: scoreImpact,
  RESONANCE: scoreResonance,
};
