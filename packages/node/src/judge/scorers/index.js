/**
 * CYNIC Dimension Scorers - Registry & Exports
 *
 * Real scoring logic for all 36 dimensions (5 axioms x 7 + THE_UNNAMEABLE).
 * Replaces mock scoring with intelligent content analysis.
 *
 * "phi distrusts phi" - kynikós
 *
 * @module @cynic/node/judge/scorers
 */

'use strict';

// VERSION MARKER: v2.0 - Negative scoring enabled (2026-01-20)
// Use stderr to avoid breaking JSON hook output
if (process.env.DEBUG || process.env.CYNIC_DEBUG) {
  console.warn('[SCORERS] v2.0 loaded - Negative scoring active');
}

import { PHI_INV } from '@cynic/core';
import { normalize } from './utils.js';

// Import axiom scorers
import {
  PhiScorers,
  scoreCoherence,
  scoreHarmony,
  scoreStructure,
  scoreElegance,
  scoreCompleteness,
  scorePrecision,
  scoreProportion,
} from './phi-axiom.js';

import {
  VerifyScorers,
  scoreAccuracy,
  scoreVerifiability,
  scoreTransparency,
  scoreReproducibility,
  scoreProvenance,
  scoreIntegrity,
  scoreConsensus,
} from './verify-axiom.js';

import {
  CultureScorers,
  scoreAuthenticity,
  scoreRelevance,
  scoreNovelty,
  scoreAlignment,
  scoreImpact,
  scoreResonance,
  scoreLineage,
} from './culture-axiom.js';

import {
  BurnScorers,
  scoreUtility,
  scoreSustainability,
  scoreEfficiency,
  scoreValueCreation,
  scoreSacrifice,
  scoreNonExtractive,
  scoreContribution,
  scoreIrreversibility,
} from './burn-axiom.js';

import {
  FidelityScorers,
  scoreCommitment,
  scoreAttunement,
  scoreCandor,
  scoreCongruence,
  scoreAccountability,
  scoreVigilance,
  scoreKenosis,
} from './fidelity-axiom.js';

/**
 * Map of dimension names to scorer functions
 */
export const Scorers = {
  // PHI Axiom (7 dims)
  ...PhiScorers,
  // VERIFY Axiom (7 dims)
  ...VerifyScorers,
  // CULTURE Axiom (7 dims)
  ...CultureScorers,
  // BURN Axiom (7 dims)
  ...BurnScorers,
  // FIDELITY Axiom (7 dims)
  ...FidelityScorers,
};

/**
 * Score a dimension by name
 * @param {string} name - Dimension name
 * @param {Object} item - Item to score
 * @param {Object} [context] - Context
 * @returns {number} Score (0-100)
 */
export function scoreDimension(name, item, context = {}) {
  // Check if item has explicit scores first (for testing/overrides)
  if (item && item.scores && typeof item.scores[name] === 'number') {
    return item.scores[name];
  }

  // Check for derived scores from enrichment (boost or starting point)
  const hintKey = `${name.toLowerCase()}Hint`;
  const derivedHint = item?.derivedScores?.[hintKey];

  const scorer = Scorers[name];
  if (scorer) {
    const baseScore = scorer(item, context);

    // If we have a derived hint, blend it with the scored value
    // This helps when enrichment detected something the scorer might miss
    if (typeof derivedHint === 'number') {
      // Weighted average: 70% scorer, 30% hint
      return normalize(baseScore * 0.7 + derivedHint * 0.3);
    }

    return baseScore;
  }

  // Fallback: use derived hint if available
  if (typeof derivedHint === 'number') {
    return derivedHint;
  }

  // Fallback for unknown dimensions
  return 50;
}

/**
 * Create a composite scorer function for the judge
 * @returns {Function} Scorer function compatible with CYNICJudge
 */
export function createRealScorer() {
  return (name, item, context) => {
    return scoreDimension(name, item, context);
  };
}

// Re-export individual scorers for direct use
export {
  // PHI Axiom (7)
  scoreCoherence,
  scoreHarmony,
  scoreStructure,
  scoreElegance,
  scoreCompleteness,
  scorePrecision,
  scoreProportion,
  // VERIFY Axiom (7)
  scoreAccuracy,
  scoreVerifiability,
  scoreTransparency,
  scoreReproducibility,
  scoreProvenance,
  scoreIntegrity,
  scoreConsensus,
  // CULTURE Axiom (7)
  scoreAuthenticity,
  scoreRelevance,
  scoreNovelty,
  scoreAlignment,
  scoreImpact,
  scoreResonance,
  scoreLineage,
  // BURN Axiom (7)
  scoreUtility,
  scoreSustainability,
  scoreEfficiency,
  scoreValueCreation,
  scoreSacrifice,
  scoreNonExtractive, // backward compat alias for scoreSacrifice
  scoreContribution,
  scoreIrreversibility,
  // FIDELITY Axiom (7)
  scoreCommitment,
  scoreAttunement,
  scoreCandor,
  scoreCongruence,
  scoreAccountability,
  scoreVigilance,
  scoreKenosis,
};

// Re-export axiom groups
export { PhiScorers, VerifyScorers, CultureScorers, BurnScorers, FidelityScorers };

// Re-export utilities
export * from './utils.js';

export default {
  Scorers,
  scoreDimension,
  createRealScorer,
  // PHI (7)
  scoreCoherence, scoreHarmony, scoreStructure, scoreElegance,
  scoreCompleteness, scorePrecision, scoreProportion,
  // VERIFY (7)
  scoreAccuracy, scoreVerifiability, scoreTransparency, scoreReproducibility,
  scoreProvenance, scoreIntegrity, scoreConsensus,
  // CULTURE (7)
  scoreAuthenticity, scoreRelevance, scoreNovelty, scoreAlignment,
  scoreImpact, scoreResonance, scoreLineage,
  // BURN (7)
  scoreUtility, scoreSustainability, scoreEfficiency, scoreValueCreation,
  scoreSacrifice, scoreNonExtractive, scoreContribution, scoreIrreversibility,
  // FIDELITY (7)
  scoreCommitment, scoreAttunement, scoreCandor, scoreCongruence,
  scoreAccountability, scoreVigilance, scoreKenosis,
};
