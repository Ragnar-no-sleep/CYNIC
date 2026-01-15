/**
 * ASSIAH (עשייה) - World of Action
 *
 * The lowest world, associated with the BURN axiom.
 * "Does it burn?"
 *
 * This is the world of manifest action, where ideas become reality.
 * It is also the world of BURN - value destruction that creates value.
 *
 * @module @cynic/core/worlds/assiah
 */

'use strict';

import { World } from './base.js';
import { PHI, PHI_INV, PHI_INV_2 } from '../axioms/constants.js';

/**
 * Assiah - World of Convergent Burning
 */
export class Assiah extends World {
  constructor() {
    super({
      name: 'ASSIAH',
      axiom: 'BURN',
      hebrew: 'עשייה',
      meaning: 'Action',
      question: 'Does it burn?',
      dimensions: ['UTILITY', 'SUSTAINABILITY', 'EFFICIENCY', 'VALUE_CREATION', 'NON_EXTRACTIVE', 'CONTRIBUTION'],
    });
  }

  /**
   * Check if something contributes to burn (value creation through destruction)
   *
   * @param {Object} item - Item to check
   * @returns {Object} Burn contribution result
   */
  contributesToBurn(item) {
    if (!item) {
      return {
        contributes: false,
        reason: 'No item provided',
      };
    }

    const checks = {
      isUseful: this._checkUtility(item),
      isSustainable: this._checkSustainability(item),
      isEfficient: this._checkEfficiency(item),
      isNonExtractive: this._checkNonExtraction(item),
      createsValue: this._checkValueCreation(item),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    const contributes = passedCount >= 3;

    return {
      contributes,
      checks,
      passedCount,
      totalChecks: 5,
      burnScore: (passedCount / 5) * 100,
      message: contributes
        ? '🔥 Contributes to convergent burning'
        : '⚠️ May be extractive rather than burning',
    };
  }

  /**
   * Calculate burn ratio
   *
   * Burn Ratio = Value Created / Value Extracted
   * Target: > φ (1.618)
   *
   * @param {number} valueCreated - Value created
   * @param {number} valueExtracted - Value extracted
   * @returns {Object} Burn ratio result
   */
  calculateBurnRatio(valueCreated, valueExtracted) {
    if (valueExtracted === 0) {
      return {
        ratio: Infinity,
        verdict: 'pure_burn',
        message: '🔥 Pure burn - no extraction',
      };
    }

    const ratio = valueCreated / valueExtracted;

    let verdict;
    if (ratio >= PHI) {
      verdict = 'excellent';
    } else if (ratio >= 1) {
      verdict = 'positive';
    } else if (ratio >= PHI_INV) {
      verdict = 'neutral';
    } else {
      verdict = 'extractive';
    }

    return {
      ratio: Math.round(ratio * 1000) / 1000,
      target: PHI,
      verdict,
      message: ratio >= PHI
        ? `🔥 Excellent burn ratio (${ratio.toFixed(2)} >= φ)`
        : ratio >= 1
          ? `✅ Positive ratio (${ratio.toFixed(2)} >= 1)`
          : `⚠️ Extractive ratio (${ratio.toFixed(2)} < 1)`,
    };
  }

  /**
   * Calculate singularity distance
   *
   * Singularity = All worlds aligned = d → 0
   *
   * @param {Object} worldResults - Results from all worlds
   * @returns {number} Distance to singularity (0-1)
   */
  calculateSingularityDistance(worldResults) {
    const worlds = ['ATZILUT', 'BERIAH', 'YETZIRAH', 'ASSIAH'];
    let totalCoherence = 0;
    let count = 0;

    for (const world of worlds) {
      const result = worldResults[world];
      if (result && typeof result.coherence === 'number') {
        totalCoherence += result.coherence / 100; // Normalize to 0-1
        count++;
      }
    }

    if (count === 0) return 1; // Maximum distance

    const avgAlignment = totalCoherence / count;
    const distance = 1 - avgAlignment;

    return Math.round(distance * 1000) / 1000;
  }

  /**
   * Evaluate convergence towards singularity
   *
   * @param {Object} worldResults - Results from all worlds
   * @returns {Object} Convergence evaluation
   */
  evaluateConvergence(worldResults) {
    const distance = this.calculateSingularityDistance(worldResults);

    let status;
    if (distance < PHI_INV_2) { // < 38.2%
      status = 'approaching';
    } else if (distance < PHI_INV) { // < 61.8%
      status = 'on_path';
    } else {
      status = 'distant';
    }

    return {
      distance,
      status,
      proximity: Math.round((1 - distance) * 100),
      message: status === 'approaching'
        ? '✨ Approaching singularity - strong alignment'
        : status === 'on_path'
          ? '→ On path to singularity'
          : '⚠️ Distant from singularity - needs alignment',
    };
  }

  /**
   * Check utility
   * @private
   */
  _checkUtility(item) {
    return !!(
      item.useful ||
      item.utility ||
      item.purpose ||
      item.function ||
      item.useCase
    );
  }

  /**
   * Check sustainability
   * @private
   */
  _checkSustainability(item) {
    return !!(
      item.sustainable ||
      item.longTerm ||
      item.renewable ||
      item.durable
    );
  }

  /**
   * Check efficiency
   * @private
   */
  _checkEfficiency(item) {
    return !!(
      item.efficient ||
      item.optimized ||
      item.minimal ||
      item.lean
    );
  }

  /**
   * Check non-extraction
   * @private
   */
  _checkNonExtraction(item) {
    // Check for signs that it's not extractive
    return !(
      item.extractive ||
      item.rent_seeking ||
      item.exploitative
    ) && (
      item.burns ||
      item.contributes ||
      item.gives_back ||
      item.nonExtractive
    );
  }

  /**
   * Check value creation
   * @private
   */
  _checkValueCreation(item) {
    return !!(
      item.createsValue ||
      item.valueCreation ||
      item.productive ||
      item.generative
    );
  }
}

// Singleton instance
export const assiah = new Assiah();

export default { Assiah, assiah };
