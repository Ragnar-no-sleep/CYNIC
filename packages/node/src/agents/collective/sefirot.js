/**
 * @cynic/node - Sefirot Template
 *
 * Kabbalistic Tree of Life geometry for agent relationships.
 * Uses φ-aligned weights based on pillar and level positions.
 *
 * "φ doute de φ" - even this template should be questioned.
 *
 * @module @cynic/node/agents/collective/sefirot
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

/**
 * Sefirot relationships - CYNIC's initial intuition, subject to learning
 *
 * φ-aligned relationship weights based on Tree of Life geometry:
 *
 *                    Keter (CYNIC)
 *                        │
 *         ┌──────────────┼──────────────┐
 *         │              │              │
 *      Binah          (Daat)        Chochmah
 *    (Analyst)       (Scholar)       (Sage)
 *         │              │              │
 *         └──────────────┼──────────────┘
 *                        │
 *         ┌──────────────┼──────────────┐
 *         │              │              │
 *      Gevurah       Tiferet        Chesed
 *    (Guardian)      (Oracle)     (Architect)
 *         │              │              │
 *         └──────────────┼──────────────┘
 *                        │
 *         ┌──────────────┼──────────────┐
 *         │              │              │
 *        Hod          Yesod         Netzach
 *    (Deployer)      (Janitor)       (Scout)
 *         │              │              │
 *         └──────────────┴──────────────┘
 *                        │
 *                    Malkhut
 *                 (Cartographer)
 *
 * Weight system (φ-aligned):
 * - φ⁻¹ = 0.618: Direct vertical connections (same pillar)
 * - φ⁻² = 0.382: Horizontal connections (same level, adjacent)
 * - φ⁻³ = 0.236: Diagonal connections (different pillar, adjacent level)
 * - φ⁻⁴ = 0.146: Indirect connections (skip level or far pillar)
 *
 * "φ doute de φ" - even this template should be questioned.
 */
export const SEFIROT_TEMPLATE = {
  // φ ratio weights
  weights: {
    DIRECT: PHI_INV,       // φ⁻¹ = 0.618 - Direct vertical connection
    HORIZONTAL: PHI_INV_2, // φ⁻² = 0.382 - Same level, adjacent pillar
    DIAGONAL: PHI_INV_2 * PHI_INV,  // φ⁻³ ≈ 0.236 - Diagonal connection
    INDIRECT: PHI_INV_2 * PHI_INV_2, // φ⁻⁴ ≈ 0.146 - Distant connection
  },

  // Pillar assignments (for geometric reasoning)
  pillars: {
    left: ['analyst', 'guardian', 'deployer'],    // Binah, Gevurah, Hod
    middle: ['scholar', 'oracle', 'janitor', 'cartographer'], // Daat, Tiferet, Yesod, Malkhut
    right: ['sage', 'architect', 'scout'],        // Chochmah, Chesed, Netzach
  },

  // Level assignments (0 = top, 3 = bottom)
  levels: {
    cynic: 0,       // Keter
    analyst: 1, sage: 1, scholar: 1,  // Level 1
    guardian: 2, oracle: 2, architect: 2,  // Level 2
    deployer: 3, janitor: 3, scout: 3,  // Level 3
    cartographer: 4,  // Malkhut
  },

  // Sefirah mappings (agent -> Sefirah)
  mappings: {
    cynic: { sefira: 'Keter', meaning: 'Crown', role: 'Meta-consciousness', pillar: 'middle', level: 0 },
    analyst: { sefira: 'Binah', meaning: 'Understanding', role: 'Analysis', pillar: 'left', level: 1 },
    sage: { sefira: 'Chochmah', meaning: 'Wisdom', role: 'Guidance', pillar: 'right', level: 1 },
    scholar: { sefira: 'Daat', meaning: 'Knowledge', role: 'Knowledge extraction', pillar: 'middle', level: 1 },
    guardian: { sefira: 'Gevurah', meaning: 'Strength', role: 'Protection', pillar: 'left', level: 2 },
    oracle: { sefira: 'Tiferet', meaning: 'Beauty', role: 'Visualization', pillar: 'middle', level: 2 },
    architect: { sefira: 'Chesed', meaning: 'Kindness', role: 'Design', pillar: 'right', level: 2 },
    deployer: { sefira: 'Hod', meaning: 'Splendor', role: 'Deployment', pillar: 'left', level: 3 },
    janitor: { sefira: 'Yesod', meaning: 'Foundation', role: 'Code hygiene', pillar: 'middle', level: 3 },
    scout: { sefira: 'Netzach', meaning: 'Victory', role: 'Discovery', pillar: 'right', level: 3 },
    cartographer: { sefira: 'Malkhut', meaning: 'Kingdom', role: 'Mapping', pillar: 'middle', level: 4 },
  },

  /**
   * Calculate initial weight between two agents based on Tree geometry
   * @param {string} from - Source agent
   * @param {string} to - Target agent
   * @returns {number} φ-aligned weight
   */
  calculateWeight(from, to) {
    const fromMapping = this.mappings[from];
    const toMapping = this.mappings[to];

    if (!fromMapping || !toMapping) return 0;

    const levelDiff = Math.abs(fromMapping.level - toMapping.level);
    const samePillar = fromMapping.pillar === toMapping.pillar;
    const adjacentPillar = (
      (fromMapping.pillar === 'middle') ||
      (toMapping.pillar === 'middle') ||
      (fromMapping.pillar === 'left' && toMapping.pillar === 'right') ||
      (fromMapping.pillar === 'right' && toMapping.pillar === 'left')
    );

    // Same pillar, adjacent level -> DIRECT (φ⁻¹)
    if (samePillar && levelDiff === 1) {
      return this.weights.DIRECT;
    }

    // Same level, adjacent pillar -> HORIZONTAL (φ⁻²)
    if (levelDiff === 0 && adjacentPillar) {
      return this.weights.HORIZONTAL;
    }

    // Adjacent level, different pillar -> DIAGONAL (φ⁻³)
    if (levelDiff === 1 && !samePillar) {
      return this.weights.DIAGONAL;
    }

    // Everything else -> INDIRECT (φ⁻⁴)
    if (levelDiff <= 2) {
      return this.weights.INDIRECT;
    }

    // Very distant -> no initial connection
    return 0;
  },

  /**
   * Generate all initial affinities based on geometric rules
   * @returns {Object} Affinities map
   */
  generateAffinities() {
    const agents = Object.keys(this.mappings).filter(a => a !== 'cynic');
    const affinities = {};

    for (const from of agents) {
      affinities[from] = {};
      for (const to of agents) {
        if (from !== to) {
          const weight = this.calculateWeight(from, to);
          if (weight > 0) {
            affinities[from][to] = weight;
          }
        }
      }
    }

    return affinities;
  },
};
