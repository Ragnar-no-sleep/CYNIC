/**
 * BURN Axiom Scorers - Value & Sustainability
 *
 * Dimensions: UTILITY, SUSTAINABILITY, EFFICIENCY, VALUE_CREATION, SACRIFICE, CONTRIBUTION, IRREVERSIBILITY
 *
 * @module @cynic/node/judge/scorers/burn-axiom
 */

'use strict';

import {
  extractText,
  wordCount,
  hasCodePatterns,
  detectRiskPenalty,
  normalize,
} from './utils.js';

/**
 * Score UTILITY - Practical usefulness
 */
export function scoreUtility(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has clear purpose
  if (item.purpose || item.goal) score += 15;

  // Has usage count
  if (item.usageCount && item.usageCount > 0) {
    score += Math.min(Math.log10(item.usageCount + 1) * 10, 25);
  }

  // Actionable
  if (item.actionable === true) score += 10;

  // Has instructions/how-to
  if (item.instructions || item.howTo) score += 10;

  // Solves a problem
  if (item.problem || item.solution) score += 10;

  // Scams have no utility - they destroy value
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score SUSTAINABILITY - Long-term viability
 */
export function scoreSustainability(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has long-term support
  if (item.maintained === true || item.supported === true) score += 15;

  // Has versioning
  if (item.version) score += 10;

  // Low maintenance burden
  if (item.maintenanceBurden === 'low') score += 10;

  // Has roadmap/future plans
  if (item.roadmap || item.future) score += 10;

  // Has community
  if (item.community || item.contributors) score += 10;

  // Scams are unsustainable - they collapse
  score -= detectRiskPenalty(item, text);

  // Not deprecated
  if (item.deprecated === true) score -= 30;

  return normalize(score);
}

/**
 * Score EFFICIENCY - Resource optimization
 */
export function scoreEfficiency(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Size efficiency
  const textSize = text.length;
  if (textSize > 0 && textSize < 5000) score += 10;
  else if (textSize > 50000) score -= 10;

  // Code efficiency indicators
  if (hasCodePatterns(text)) {
    // No unnecessary complexity
    const nestedDepth = (text.match(/\{[^{}]*\{[^{}]*\{/g) || []).length;
    if (nestedDepth === 0) score += 10;
    else if (nestedDepth > 5) score -= 10;

    // Reuses code (imports)
    if (/import\s+/m.test(text)) score += 5;
  }

  // Fast/performant markers
  if (item.performance || /fast|efficient|optimized/i.test(text)) score += 10;

  // Low resource usage
  if (item.resourceUsage === 'low') score += 10;

  // Scams are inefficient - waste resources through deception
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score VALUE_CREATION - Creates more than consumes
 */
export function scoreValueCreation(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Creates output
  if (item.output || item.produces) score += 15;

  // Has derivatives/children
  if (item.derivatives && item.derivatives > 0) {
    score += Math.min(item.derivatives * 5, 20);
  }

  // Enables others
  if (item.enables || item.empowers) score += 10;

  // Net positive
  if (item.netValue && item.netValue > 0) score += 15;

  // Creates vs consumes ratio
  if (item.createdValue && item.consumedValue) {
    const ratio = item.createdValue / Math.max(item.consumedValue, 1);
    score += Math.min(ratio * 10, 20);
  }

  // Scams destroy value, they don't create it
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score SACRIFICE - Genuine cost borne, skin in the game
 * (renamed from NON_EXTRACTIVE)
 */
export function scoreSacrifice(item, context = {}) {
  let score = 55;
  const text = extractText(item);

  // Explicitly non-extractive
  if (item.nonExtractive === true || item.fair === true) score += 15;

  // Open source/free
  if (item.openSource === true || item.free === true) score += 15;

  // Has fair compensation
  if (item.compensation || item.attribution) score += 10;

  // Community benefit
  if (item.communityBenefit === true) score += 10;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  // No hidden costs
  if (item.hiddenCosts === true) score -= 30;

  // Penalize extraction markers
  if (item.extractive === true) score -= 40;

  // Extractive text patterns
  const extractivePatterns = [
    /100%\s*(tax|fee|take)/i,
    /drain|extract|steal|siphon/i,
    /all\s*funds|all\s*liquidity/i,
    /exit\s*scam/i,
  ];
  const extractiveCount = extractivePatterns.filter(p => p.test(text)).length;
  score -= extractiveCount * 15;

  return normalize(score);
}

/**
 * Score CONTRIBUTION - Gives back to ecosystem
 */
export function scoreContribution(item, context = {}) {
  let score = 45;
  const text = extractText(item);

  // Has contributions
  if (item.contributions && item.contributions > 0) {
    score += Math.min(item.contributions * 3, 20);
  }

  // Open source
  if (item.openSource === true) score += 15;

  // Has documentation
  if (item.documentation || item.docs) score += 10;

  // Has examples
  if (item.examples) score += 10;

  // Has tests
  if (item.tests || item.tested === true) score += 10;

  // Community involvement
  if (item.communityInvolved === true) score += 10;

  // Scams extract, they don't contribute
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score IRREVERSIBILITY - Finality of commitment, entropy's arrow
 */
export function scoreIrreversibility(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // On-chain (immutable)
  if (item.onChain === true || item.immutable === true) score += 20;

  // Has commitment proof
  if (item.commitment || item.proof) score += 15;

  // Burns tokens (irreversible by definition)
  if (item.burned === true || item.burnAmount > 0) score += 15;

  // Time-locked
  if (item.timeLocked === true || item.lockDuration) score += 10;

  // Signed/attested
  if (item.signature || item.attestation) score += 10;

  // Scams are reversible in intent - they plan exit
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

// Backward compat alias
export const scoreNonExtractive = scoreSacrifice;

/**
 * BURN Axiom scorer map
 */
export const BurnScorers = {
  UTILITY: scoreUtility,
  SUSTAINABILITY: scoreSustainability,
  EFFICIENCY: scoreEfficiency,
  VALUE_CREATION: scoreValueCreation,
  SACRIFICE: scoreSacrifice,
  NON_EXTRACTIVE: scoreSacrifice, // backward compat alias
  CONTRIBUTION: scoreContribution,
  IRREVERSIBILITY: scoreIrreversibility,
};
