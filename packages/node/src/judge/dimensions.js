/**
 * CYNIC Dimensions
 *
 * 4 Axioms × N Dimensions (∞ possible, discovered via ResidualDetector)
 *
 * Current snapshot: 24+1 dimensions
 * THE UNNAMEABLE = what exists before being named
 *
 * @module @cynic/node/judge/dimensions
 */

'use strict';

import { PHI, PHI_INV, PHI_INV_2, AXIOMS } from '@cynic/core';

/**
 * Base dimensions organized by axiom
 *
 * 4 Axioms = FIXED
 * Dimensions per axiom = N (infinite, discovered via ResidualDetector)
 */
export const Dimensions = {
  // PHI Axiom - All ratios derive from 1.618...
  PHI: {
    COHERENCE: {
      weight: PHI,
      threshold: 50,
      description: 'Internal logical consistency',
    },
    HARMONY: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Balance and proportion (φ-alignment)',
    },
    STRUCTURE: {
      weight: 1.0,
      threshold: 50,
      description: 'Organizational clarity',
    },
    ELEGANCE: {
      weight: PHI_INV_2,
      threshold: 50,
      description: 'Simplicity and beauty',
    },
    COMPLETENESS: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Wholeness of solution',
    },
    PRECISION: {
      weight: 1.0,
      threshold: 50,
      description: 'Accuracy and exactness',
    },
  },

  // VERIFY Axiom - Don't trust, verify
  VERIFY: {
    ACCURACY: {
      weight: PHI,
      threshold: 60,
      description: 'Factual correctness',
    },
    VERIFIABILITY: {
      weight: PHI,
      threshold: 60,
      description: 'Can be independently verified',
    },
    TRANSPARENCY: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Clear reasoning visible',
    },
    REPRODUCIBILITY: {
      weight: 1.0,
      threshold: 55,
      description: 'Results can be reproduced',
    },
    PROVENANCE: {
      weight: PHI_INV_2,
      threshold: 50,
      description: 'Source is traceable',
    },
    INTEGRITY: {
      weight: PHI_INV,
      threshold: 60,
      description: 'Has not been tampered with',
    },
  },

  // CULTURE Axiom - Culture is a moat
  CULTURE: {
    AUTHENTICITY: {
      weight: PHI,
      threshold: 50,
      description: 'Genuine and original',
    },
    RELEVANCE: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Pertinent to context',
    },
    NOVELTY: {
      weight: 1.0,
      threshold: 40,
      description: 'New or unique contribution',
    },
    ALIGNMENT: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Fits cultural values',
    },
    IMPACT: {
      weight: PHI_INV_2,
      threshold: 45,
      description: 'Meaningful effect',
    },
    RESONANCE: {
      weight: PHI_INV_2,
      threshold: 45,
      description: 'Connects emotionally',
    },
  },

  // BURN Axiom - Don't extract, burn
  BURN: {
    UTILITY: {
      weight: PHI,
      threshold: 50,
      description: 'Practical usefulness',
    },
    SUSTAINABILITY: {
      weight: PHI_INV,
      threshold: 50,
      description: 'Long-term viability',
    },
    EFFICIENCY: {
      weight: 1.0,
      threshold: 50,
      description: 'Resource optimization',
    },
    VALUE_CREATION: {
      weight: PHI,
      threshold: 50,
      description: 'Creates more than consumes',
    },
    NON_EXTRACTIVE: {
      weight: PHI_INV,
      threshold: 60,
      description: 'Does not extract value unfairly',
    },
    CONTRIBUTION: {
      weight: PHI_INV_2,
      threshold: 50,
      description: 'Gives back to ecosystem',
    },
  },
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
 * Get dimension config
 * @param {string} name - Dimension name
 * @returns {Object|null} Dimension config
 */
export function getDimension(name) {
  for (const [axiom, dims] of Object.entries(Dimensions)) {
    if (dims[name]) {
      return { ...dims[name], axiom };
    }
  }
  return null;
}

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
  getAllDimensions,
  getDimensionsForAxiom,
  getDimension,
  getAxiomTotalWeight,
  getTotalWeight,
  dimensionRegistry,
};
