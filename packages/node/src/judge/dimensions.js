/**
 * CYNIC Dimensions
 *
 * 36 Dimensions total:
 * - 5 Axioms × 7 Dimensions = 35 named dimensions
 * - 1 META dimension: THE_UNNAMEABLE
 *
 * φ generates all numbers:
 *   5 = F(5) axioms, 7 = L(4) dimensions, 11 = L(5) dogs
 *   5 × 7 + 1 = 36 = 6² = 36 Tzadikim
 *
 * Universal weight template per axiom:
 *   Position:  FOUND  GEN    POWER  PIVOT  EXPR   VISION RECUR
 *   Weight:    φ      φ⁻¹    1.0    φ      φ⁻²    φ⁻¹    φ⁻¹
 *
 * THE_UNNAMEABLE = "explained variance" - how well the 35 dimensions
 * capture the item's quality. High score = low residual = well understood.
 *
 * "φ qui se méfie de φ" - κυνικός
 *
 * @module @cynic/node/judge/dimensions
 */

'use strict';

import { PHI, PHI_INV, PHI_INV_2, AXIOMS } from '@cynic/core';

/**
 * Base dimensions organized by axiom
 *
 * 5 Axioms × 7 Dimensions = 35 named + 1 META = 36 total
 * Dimensions per axiom follow the universal φ weight template:
 *   φ, φ⁻¹, 1.0, φ, φ⁻², φ⁻¹, φ⁻¹
 */
export const Dimensions = {
  // PHI Axiom - All ratios derive from 1.618... (Earth/Atzilut/Cube)
  PHI: {
    COHERENCE: {
      weight: PHI,
      threshold: 50,
      description: 'Internal logical consistency',
    },
    ELEGANCE: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Simplicity that generates beauty',
    },
    STRUCTURE: {
      weight: 1.0,
      threshold: 50,
      description: 'Organizational clarity',
    },
    HARMONY: {
      weight: PHI,
      threshold: 50,
      description: 'Balance and proportion (φ-alignment)',
    },
    PRECISION: {
      weight: PHI_INV_2,
      threshold: 50,
      description: 'Accuracy and exactness of expression',
    },
    COMPLETENESS: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Wholeness of vision',
    },
    PROPORTION: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Ratio of parts to whole at every scale (φ seeing φ)',
    },
  },

  // VERIFY Axiom - Don't trust, verify (Metal/Beriah/Octahedron)
  VERIFY: {
    ACCURACY: {
      weight: PHI,
      threshold: 60,
      description: 'Factual correctness',
    },
    PROVENANCE: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Source is traceable',
    },
    INTEGRITY: {
      weight: 1.0,
      threshold: 60,
      description: 'Has not been tampered with',
    },
    VERIFIABILITY: {
      weight: PHI,
      threshold: 60,
      description: 'Can be independently verified',
    },
    TRANSPARENCY: {
      weight: PHI_INV_2,
      threshold: 50,
      description: 'Clear reasoning visible',
    },
    REPRODUCIBILITY: {
      weight: PHI_INV,
      threshold: 55,
      description: 'Results can be reproduced (pattern-stable)',
    },
    CONSENSUS: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Collectively witnessed truth (verification verifying itself)',
    },
  },

  // CULTURE Axiom - Culture is a moat (Wood/Yetzirah/Icosahedron)
  CULTURE: {
    AUTHENTICITY: {
      weight: PHI,
      threshold: 50,
      description: 'Genuine and original',
    },
    RESONANCE: {
      weight: PHI_INV,
      threshold: 45,
      description: 'Memetic propagation — connects emotionally',
    },
    NOVELTY: {
      weight: 1.0,
      threshold: 40,
      description: 'New or unique contribution (pattern-breaking)',
    },
    ALIGNMENT: {
      weight: PHI,
      threshold: 50,
      description: 'Harmony with cultural DNA',
    },
    RELEVANCE: {
      weight: PHI_INV_2,
      threshold: 50,
      description: 'Pertinent to context',
    },
    IMPACT: {
      weight: PHI_INV,
      threshold: 45,
      description: 'Foresight of consequence — meaningful effect',
    },
    LINEAGE: {
      weight: PHI_INV,
      threshold: 45,
      description: 'Chain of transmission — memory remembering its own chain',
    },
  },

  // BURN Axiom - Don't extract, burn (Fire/Assiah/Tetrahedron)
  BURN: {
    UTILITY: {
      weight: PHI,
      threshold: 50,
      description: 'Practical usefulness',
    },
    SUSTAINABILITY: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Long-term viability (self-renewal)',
    },
    EFFICIENCY: {
      weight: 1.0,
      threshold: 50,
      description: 'Work-to-heat ratio (η) — resource optimization',
    },
    VALUE_CREATION: {
      weight: PHI,
      threshold: 50,
      description: 'Creates more than consumes (net positive)',
    },
    SACRIFICE: {
      weight: PHI_INV_2,
      threshold: 60,
      description: 'Genuine cost borne — skin in the game',
    },
    CONTRIBUTION: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Gives back to ecosystem',
    },
    IRREVERSIBILITY: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Finality of commitment — entropy\'s arrow (2nd law)',
    },
  },

  // FIDELITY Axiom - Loyal to truth, not to comfort (Water/Adam Kadmon/Dodecahedron)
  FIDELITY: {
    COMMITMENT: {
      weight: PHI,
      threshold: 50,
      description: 'Loyalty to declared purpose in behavior (askesis)',
    },
    ATTUNEMENT: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Responsiveness to own signals (De/wu-wei)',
    },
    CANDOR: {
      weight: 1.0,
      threshold: 50,
      description: 'Willingness to tell hard truths (parrhesia)',
    },
    CONGRUENCE: {
      weight: PHI,
      threshold: 50,
      description: 'Inside matches outside — the center holds (Tiferet)',
    },
    ACCOUNTABILITY: {
      weight: PHI_INV_2,
      threshold: 50,
      description: 'Standing behind judgments — traceable provenance',
    },
    VIGILANCE: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Ongoing self-observation for drift (zanshin)',
    },
    KENOSIS: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Capacity for self-emptying — the door THE_UNNAMEABLE needs (Tzimtzum)',
    },
  },

  // META - The 36th dimension (transcends axioms)
  META: {
    THE_UNNAMEABLE: {
      weight: PHI,
      threshold: PHI_INV_2 * 100, // 38.2% - same as anomaly threshold
      description: 'Explained variance - what the 35 dimensions capture',
      meta: true,
      formula: '100 - (residual × 100)', // High when residual is low
    },
  },
};

/**
 * Backward compatibility: NON_EXTRACTIVE → SACRIFICE alias
 * Old code referencing NON_EXTRACTIVE will still find it
 */
export const DIMENSION_ALIASES = {
  NON_EXTRACTIVE: 'SACRIFICE',
};

/**
 * Get all dimensions flat
 * @returns {Object} All dimensions
 */
export function getAllDimensions() {
  const all = {};
  for (const [axiom, dims] of Object.entries(Dimensions)) {
    for (const [name, config] of Object.entries(dims)) {
      all[name] = { ...config, axiom };
    }
  }
  return all;
}

/**
 * Get dimensions for axiom
 * @param {string} axiom - Axiom name
 * @returns {Object} Dimensions for axiom
 */
export function getDimensionsForAxiom(axiom) {
  return Dimensions[axiom] || {};
}

/**
 * Get dimension config (supports aliases)
 * @param {string} name - Dimension name
 * @returns {Object|null} Dimension config
 */
export function getDimension(name) {
  // Check alias first
  const resolvedName = DIMENSION_ALIASES[name] || name;

  for (const [axiom, dims] of Object.entries(Dimensions)) {
    if (dims[resolvedName]) {
      return { ...dims[resolvedName], axiom };
    }
  }
  return null;
}

/**
 * Context-aware axiom weight multipliers
 *
 * Maps queryType → { axiom → multiplier }
 * Used by Judge._calculateAxiomScores() to weight axioms differently
 * based on the task being judged. Security tasks boost VERIFY,
 * design tasks boost PHI, social tasks boost CULTURE.
 *
 * Multipliers are φ-bounded: range [0.7, 1.4] (within φ⁻¹ deviation)
 */
export const QUERY_CONTEXT_WEIGHTS = {
  // Security: VERIFY and FIDELITY matter most
  PreToolUse:  { PHI: 1.0, VERIFY: 1.4, CULTURE: 0.7, BURN: 0.8, FIDELITY: 1.3 },
  protection:  { PHI: 1.0, VERIFY: 1.4, CULTURE: 0.7, BURN: 0.8, FIDELITY: 1.3 },
  // Code quality: PHI and VERIFY
  PostToolUse: { PHI: 1.3, VERIFY: 1.3, CULTURE: 0.8, BURN: 1.0, FIDELITY: 0.9 },
  code:        { PHI: 1.3, VERIFY: 1.3, CULTURE: 0.8, BURN: 1.0, FIDELITY: 0.9 },
  // Design: PHI and CULTURE
  design:      { PHI: 1.4, VERIFY: 0.9, CULTURE: 1.3, BURN: 1.0, FIDELITY: 0.8 },
  // Social: CULTURE and FIDELITY
  social:      { PHI: 0.9, VERIFY: 1.0, CULTURE: 1.4, BURN: 0.8, FIDELITY: 1.2 },
  // Market/utility: BURN and VERIFY
  market:      { PHI: 0.9, VERIFY: 1.2, CULTURE: 0.8, BURN: 1.4, FIDELITY: 1.0 },
  // Exploration: slight CULTURE bias
  exploration: { PHI: 1.0, VERIFY: 1.0, CULTURE: 1.2, BURN: 1.0, FIDELITY: 1.0 },
  // Wisdom: FIDELITY and CULTURE
  wisdom:      { PHI: 1.1, VERIFY: 0.9, CULTURE: 1.3, BURN: 0.8, FIDELITY: 1.3 },
};

/**
 * Get axiom weight multipliers for a query type
 * @param {string} queryType - Task/query type
 * @returns {Object|null} { axiom → multiplier } or null if no special weighting
 */
export function getContextAxiomWeights(queryType) {
  return QUERY_CONTEXT_WEIGHTS[queryType] || null;
}

/**
 * Dog ↔ Dimension affinity map
 *
 * Maps each dog to the dimensions it specializes in.
 * Used by KabbalisticRouter to translate SONA dimension insights
 * into dog-level weight adjustments.
 *
 * When SONA discovers "ACCURACY has high correlation with success",
 * dogs with ACCURACY affinity (analyst, cartographer) get boosted.
 */
export const DOG_DIMENSION_AFFINITY = {
  guardian:     ['INTEGRITY', 'VERIFIABILITY', 'ACCOUNTABILITY', 'VIGILANCE', 'SACRIFICE'],
  analyst:      ['ACCURACY', 'COHERENCE', 'PRECISION', 'REPRODUCIBILITY', 'TRANSPARENCY'],
  architect:    ['STRUCTURE', 'ELEGANCE', 'HARMONY', 'PROPORTION', 'COMPLETENESS'],
  sage:         ['RESONANCE', 'LINEAGE', 'KENOSIS', 'CANDOR', 'ATTUNEMENT'],
  scholar:      ['PROVENANCE', 'VERIFIABILITY', 'CONSENSUS', 'RELEVANCE', 'AUTHENTICITY'],
  oracle:       ['CONGRUENCE', 'HARMONY', 'NOVELTY', 'IMPACT', 'ALIGNMENT'],
  scout:        ['RELEVANCE', 'NOVELTY', 'EFFICIENCY', 'UTILITY', 'CONTRIBUTION'],
  janitor:      ['EFFICIENCY', 'SUSTAINABILITY', 'UTILITY', 'STRUCTURE', 'REPRODUCIBILITY'],
  deployer:     ['IRREVERSIBILITY', 'INTEGRITY', 'VERIFIABILITY', 'EFFICIENCY', 'COMMITMENT'],
  cartographer: ['COMPLETENESS', 'ACCURACY', 'STRUCTURE', 'PROPORTION', 'TRANSPARENCY'],
  cynic:        ['CANDOR', 'CONGRUENCE', 'VIGILANCE', 'KENOSIS', 'COMMITMENT'],
};

/**
 * Calculate total weight for axiom
 * @param {string} axiom - Axiom name
 * @returns {number} Total weight
 */
export function getAxiomTotalWeight(axiom) {
  const dims = Dimensions[axiom];
  if (!dims) return 0;
  return Object.values(dims).reduce((sum, d) => sum + d.weight, 0);
}

/**
 * Calculate global total weight
 * @returns {number} Total weight across all dimensions
 */
export function getTotalWeight() {
  return Object.keys(Dimensions).reduce(
    (sum, axiom) => sum + getAxiomTotalWeight(axiom),
    0
  );
}

/**
 * Custom dimension registry for discovered dimensions
 */
class DimensionRegistry {
  constructor() {
    this.custom = {};
  }

  /**
   * Register a new dimension (discovered via ResidualDetector)
   * @param {string} name - Dimension name
   * @param {string} axiom - Associated axiom
   * @param {Object} config - Dimension config
   */
  register(name, axiom, config) {
    if (!AXIOMS[axiom]) {
      throw new Error(`Invalid axiom: ${axiom}`);
    }

    this.custom[name] = {
      ...config,
      axiom,
      discovered: true,
      discoveredAt: Date.now(),
    };
  }

  /**
   * Get custom dimension
   * @param {string} name - Dimension name
   * @returns {Object|null} Dimension config
   */
  get(name) {
    return this.custom[name] || null;
  }

  /**
   * Get all custom dimensions
   * @returns {Object} All custom dimensions
   */
  getAll() {
    return { ...this.custom };
  }

  /**
   * Export registry
   * @returns {Object} Exportable registry
   */
  export() {
    return { custom: this.custom };
  }

  /**
   * Import registry
   * @param {Object} data - Saved registry
   */
  import(data) {
    if (data.custom) {
      this.custom = { ...data.custom };
    }
  }
}

export const dimensionRegistry = new DimensionRegistry();

export default {
  Dimensions,
  DIMENSION_ALIASES,
  getAllDimensions,
  getDimensionsForAxiom,
  getDimension,
  getAxiomTotalWeight,
  getTotalWeight,
  dimensionRegistry,
};
