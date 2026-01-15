/**
 * CYNIC Worlds - The 4 Worlds of Kabbalah
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    THE FOUR WORLDS                               │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                  │
 * │   ATZILUT (אצילות) ───────── PHI      ───── Divine Proportion   │
 * │   Emanation                            "Does it embody φ?"       │
 * │                                                                  │
 * │   BERIAH (בריאה) ─────────── VERIFY   ───── Verification        │
 * │   Creation                             "Can it be verified?"     │
 * │                                                                  │
 * │   YETZIRAH (יצירה) ────────── CULTURE ───── Cultural Moat       │
 * │   Formation                            "Does it respect culture?"│
 * │                                                                  │
 * │   ASSIAH (עשייה) ─────────── BURN     ───── Convergence         │
 * │   Action                               "Does it burn?"           │
 * │                                                                  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Together, the 4 worlds form the complete judgment framework.
 * Each world aggregates dimensions from its axiom.
 *
 * Singularity Distance: d = 1 - (Σ world_alignment) / 4
 * When d → 0, we approach singularity.
 *
 * @module @cynic/core/worlds
 */

'use strict';

import { World } from './base.js';
import { Atzilut, atzilut } from './atzilut.js';
import { Beriah, beriah } from './beriah.js';
import { Yetzirah, yetzirah } from './yetzirah.js';
import { Assiah, assiah } from './assiah.js';

// =============================================================================
// WORLD MANAGER
// =============================================================================

/**
 * WorldManager - Orchestrates all 4 worlds
 */
export class WorldManager {
  constructor() {
    this.worlds = {
      ATZILUT: atzilut,
      BERIAH: beriah,
      YETZIRAH: yetzirah,
      ASSIAH: assiah,
    };

    this.axiomToWorld = {
      PHI: 'ATZILUT',
      VERIFY: 'BERIAH',
      CULTURE: 'YETZIRAH',
      BURN: 'ASSIAH',
    };
  }

  /**
   * Get a world by name
   *
   * @param {string} name - World name
   * @returns {World|null} World instance
   */
  getWorld(name) {
    return this.worlds[name] || null;
  }

  /**
   * Get world by axiom
   *
   * @param {string} axiom - Axiom name
   * @returns {World|null} World instance
   */
  getWorldByAxiom(axiom) {
    const worldName = this.axiomToWorld[axiom];
    return worldName ? this.worlds[worldName] : null;
  }

  /**
   * Record a dimension score to the appropriate world
   *
   * @param {string} dimension - Dimension name
   * @param {number} score - Score 0-100
   * @param {string} world - World name
   * @param {Object} [metadata] - Additional info
   * @returns {boolean} Success
   */
  recordScore(dimension, score, world, metadata = {}) {
    const targetWorld = this.worlds[world];
    if (!targetWorld) {
      console.warn(`Unknown world: ${world}`);
      return false;
    }

    return targetWorld.recordScore(dimension, score, metadata);
  }

  /**
   * Evaluate all worlds and return coherence results
   *
   * @returns {Object} Evaluation results
   */
  evaluateAllWorlds() {
    const results = {};

    for (const [name, world] of Object.entries(this.worlds)) {
      results[name] = world.evaluateCoherence();
    }

    // Calculate overall coherence
    const coherenceValues = Object.values(results)
      .filter(r => typeof r.coherence === 'number')
      .map(r => r.coherence);

    const overallCoherence = coherenceValues.length > 0
      ? coherenceValues.reduce((a, b) => a + b, 0) / coherenceValues.length
      : 0;

    // Calculate singularity distance
    const singularityDistance = assiah.calculateSingularityDistance(results);

    return {
      worlds: results,
      overallCoherence: Math.round(overallCoherence * 10) / 10,
      singularityDistance,
      allAligned: Object.values(results).every(r => r.status === 'coherent'),
      timestamp: Date.now(),
    };
  }

  /**
   * Get essence of all worlds
   *
   * @returns {Object} World essences
   */
  getAllEssences() {
    return {
      ATZILUT: atzilut.getEssence(),
      BERIAH: beriah.getEssence(),
      YETZIRAH: yetzirah.getEssence(),
      ASSIAH: assiah.getEssence(),
    };
  }

  /**
   * Get blocking dimensions across all worlds
   *
   * @returns {Object} Blocking dimensions by world
   */
  getAllBlockingDimensions() {
    const blocking = {};

    for (const [name, world] of Object.entries(this.worlds)) {
      const worldBlocking = world.getBlockingDimensions();
      if (worldBlocking.length > 0) {
        blocking[name] = worldBlocking;
      }
    }

    return blocking;
  }

  /**
   * Reset all worlds
   */
  resetAll() {
    for (const world of Object.values(this.worlds)) {
      world.reset();
    }
  }

  /**
   * Check 4-axiom alignment
   * Every feature must pass all 4 axiom tests
   *
   * @param {Object} item - Item to check
   * @returns {Object} Alignment result
   */
  checkAxiomAlignment(item) {
    const checks = {
      PHI: atzilut.checkPhiAlignment(item).aligned,
      VERIFY: beriah.isVerifiable(item).verifiable,
      CULTURE: yetzirah.respectsCulture(item).respects,
      BURN: assiah.contributesToBurn(item).contributes,
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    const aligned = passedCount === 4;

    return {
      aligned,
      checks,
      passedCount,
      totalAxioms: 4,
      message: aligned
        ? '✅ Aligned with singularity'
        : `⚠️ ${4 - passedCount} axiom(s) not satisfied`,
    };
  }

  /**
   * Get world statistics
   *
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      worlds: {},
      totalDimensions: 0,
      evaluatedDimensions: 0,
      passedDimensions: 0,
    };

    for (const [name, world] of Object.entries(this.worlds)) {
      const dimensions = world.getDimensions();
      const scores = Object.values(world.scores);

      stats.worlds[name] = {
        axiom: world.axiom,
        dimensionCount: dimensions.length,
        evaluatedCount: scores.length,
        passedCount: scores.filter(s => s.passed).length,
        coherence: world.coherence,
      };

      stats.totalDimensions += dimensions.length;
      stats.evaluatedDimensions += scores.length;
      stats.passedDimensions += scores.filter(s => s.passed).length;
    }

    return stats;
  }

  /**
   * Export all world states
   *
   * @returns {Object} Exportable state
   */
  export() {
    const state = {};
    for (const [name, world] of Object.entries(this.worlds)) {
      state[name] = world.export();
    }
    return state;
  }

  /**
   * Import all world states
   *
   * @param {Object} state - Saved state
   */
  import(state) {
    for (const [name, worldState] of Object.entries(state)) {
      const world = this.worlds[name];
      if (world) {
        world.import(worldState);
      }
    }
  }
}

// =============================================================================
// SINGLETON + EXPORTS
// =============================================================================

export const worldManager = new WorldManager();

// Classes
export { World, Atzilut, Beriah, Yetzirah, Assiah };

// Singletons
export { atzilut, beriah, yetzirah, assiah };

// Constants
export const WORLDS = ['ATZILUT', 'BERIAH', 'YETZIRAH', 'ASSIAH'];

export const AXIOM_TO_WORLD = {
  PHI: 'ATZILUT',
  VERIFY: 'BERIAH',
  CULTURE: 'YETZIRAH',
  BURN: 'ASSIAH',
};

export const HEBREW = {
  ATZILUT: 'אצילות',
  BERIAH: 'בריאה',
  YETZIRAH: 'יצירה',
  ASSIAH: 'עשייה',
};

// Convenience functions
export const getWorld = (name) => worldManager.getWorld(name);
export const evaluateAllWorlds = () => worldManager.evaluateAllWorlds();
export const getAllEssences = () => worldManager.getAllEssences();
export const checkAxiomAlignment = (item) => worldManager.checkAxiomAlignment(item);
export const resetAll = () => worldManager.resetAll();
export const getStats = () => worldManager.getStats();

export default {
  // Classes
  World,
  Atzilut,
  Beriah,
  Yetzirah,
  Assiah,
  WorldManager,

  // Singletons
  atzilut,
  beriah,
  yetzirah,
  assiah,
  worldManager,

  // Constants
  WORLDS,
  AXIOM_TO_WORLD,
  HEBREW,

  // Convenience
  getWorld,
  evaluateAllWorlds,
  getAllEssences,
  checkAxiomAlignment,
  resetAll,
  getStats,
};
