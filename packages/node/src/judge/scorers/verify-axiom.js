/**
 * VERIFY Axiom Scorers - Verification & Trust
 *
 * Dimensions: ACCURACY, VERIFIABILITY, TRANSPARENCY, REPRODUCIBILITY, PROVENANCE, INTEGRITY
 *
 * @module @cynic/node/judge/scorers/verify-axiom
 */

'use strict';

import {
  extractText,
  hasCodePatterns,
  detectRiskPenalty,
  normalize,
} from './utils.js';

/**
 * Score ACCURACY - Factual correctness
 */
export function scoreAccuracy(item, context = {}) {
  let score = 50;

  // Has sources
  if (item.sources && Array.isArray(item.sources)) {
    score += Math.min(item.sources.length * 5, 20);
  }

  // Has verification
  if (item.verified === true) {
    score += 20;
  }

  // Has references
  if (item.references && Array.isArray(item.references)) {
    score += Math.min(item.references.length * 3, 15);
  }

  // Hash/signature for data integrity
  if (item.hash) score += 5;
  if (item.signature) score += 10;

  return normalize(score);
}

/**
 * Score VERIFIABILITY - Can be independently verified
 */
export function scoreVerifiability(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has proof
  if (item.proof) score += 25;

  // Has signature
  if (item.signature) score += 15;

  // Has hash
  if (item.hash) score += 10;

  // Has public source
  if (item.url || item.sourceUrl) score += 10;

  // Has checksum
  if (item.checksum) score += 10;

  // Has testable claims
  if (/can be verified|reproducible|testable|audited/i.test(text)) score += 10;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  // Unverifiable claims
  if (/trust me|just believe|no proof needed/i.test(text)) score -= 15;

  return normalize(score);
}

/**
 * Score TRANSPARENCY - Clear reasoning visible
 */
export function scoreTransparency(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has explicit reasoning
  if (item.reasoning || item.rationale) score += 15;

  // Shows methodology
  if (item.methodology || item.method) score += 15;

  // Text explains why
  if (/because|therefore|reason|explains|due to/i.test(text)) score += 10;

  // Code has comments
  if (hasCodePatterns(text)) {
    const commentMatches = text.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
    score += Math.min(commentMatches.length * 3, 15);
  }

  // Has visible decision process
  if (item.decisions || item.steps) score += 10;

  return normalize(score);
}

/**
 * Score REPRODUCIBILITY - Results can be reproduced
 */
export function scoreReproducibility(item, context = {}) {
  let score = 45;

  // Has version info
  if (item.version) score += 10;

  // Has dependencies listed
  if (item.dependencies) score += 10;

  // Has environment info
  if (item.environment || item.env) score += 10;

  // Has seed/config for randomness
  if (item.seed || item.config) score += 10;

  // Has steps to reproduce
  if (item.steps || item.instructions) score += 15;

  return normalize(score);
}

/**
 * Score PROVENANCE - Source is traceable
 */
export function scoreProvenance(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has author
  if (item.author || item.creator || item.operator) score += 15;

  // Has timestamp
  if (item.timestamp || item.createdAt) score += 10;

  // Has origin
  if (item.origin || item.source) score += 15;

  // Has chain of custody
  if (item.history || item.audit || item.chain) score += 15;

  // Has signature
  if (item.signature) score += 10;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  // Anonymous = untraceable provenance
  if (/anonymous|unknown\s*(team|dev|creator)/i.test(text)) score -= 20;

  return normalize(score);
}

/**
 * Score INTEGRITY - Has not been tampered with
 */
export function scoreIntegrity(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has hash
  if (item.hash) score += 20;

  // Has signature
  if (item.signature) score += 20;

  // Has checksum
  if (item.checksum) score += 10;

  // Immutable fields present
  if (item.id && item.createdAt) score += 5;

  // Has merkle proof
  if (item.merkleProof || item.proof) score += 10;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * VERIFY Axiom scorer map
 */
export const VerifyScorers = {
  ACCURACY: scoreAccuracy,
  VERIFIABILITY: scoreVerifiability,
  TRANSPARENCY: scoreTransparency,
  REPRODUCIBILITY: scoreReproducibility,
  PROVENANCE: scoreProvenance,
  INTEGRITY: scoreIntegrity,
};
