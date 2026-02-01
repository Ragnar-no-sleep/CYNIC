/**
 * ATZILUT (אצילות) - World of Emanation
 *
 * The highest world, associated with the PHI axiom.
 * "Does it embody φ?"
 *
 * @module @cynic/core/worlds/atzilut
 */

'use strict';

import { World } from './base.js';
import { PHI, PHI_INV, PHI_INV_2 } from '../axioms/constants.js';

/**
 * Atzilut - World of Divine Proportion
 */
export class Atzilut extends World {
  constructor() {
    super({
      name: 'ATZILUT',
      axiom: 'PHI',
      hebrew: 'אצילות',
      meaning: 'Emanation',
      question: 'Does it embody φ?',
      dimensions: ['COHERENCE', 'HARMONY', 'STRUCTURE', 'ELEGANCE', 'COMPLETENESS', 'PRECISION'],
    });
  }

  /**
   * Check if something aligns with φ proportions
   *
   * @param {Object} [item] - Item to check (optional, uses scores if not provided)
   * @returns {Object} Alignment result
   */
  checkPhiAlignment(item = null) {
    if (item) {
      // Check item for φ alignment
      return this._analyzePhiAlignment(item);
    }

    // Use recorded scores
    const evaluation = this.evaluateCoherence();
    const aligned = evaluation.coherence >= PHI_INV * 100;

    return {
      aligned,
      coherence: evaluation.coherence,
      message: aligned
        ? '✅ Aligned with divine proportion (φ)'
        : `⚠️ Not aligned with φ (coherence: ${evaluation.coherence}%)`,
    };
  }

  /**
   * Analyze item for φ alignment
   * @private
   */
  _analyzePhiAlignment(item) {
    // Check for φ ratios in structure
    const checks = {
      hasBalance: this._checkBalance(item),
      hasHarmony: this._checkHarmony(item),
      hasStructure: this._checkStructure(item),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    const aligned = passedCount >= 2;

    return {
      aligned,
      checks,
      passedCount,
      totalChecks: 3,
      message: aligned
        ? '✅ Item embodies φ principles'
        : '⚠️ Item lacks φ alignment',
    };
  }

  /**
   * Check for balance - proportional distribution approaching φ ratios
   * @private
   */
  _checkBalance(item) {
    if (typeof item !== 'object' || item === null) return false;

    // Check if numeric values follow φ-like proportions
    const values = this._extractNumericValues(item);
    if (values.length < 2) return true; // Single values are balanced by default

    // Sort and check if ratios approximate φ
    values.sort((a, b) => b - a);
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i + 1] === 0) continue;
      const ratio = values[i] / values[i + 1];
      // Accept ratios within 20% of φ (1.618) or its inverse (0.618)
      if (this._isNearPhi(ratio)) return true;
    }

    // Check distribution balance (61.8% / 38.2% split)
    const total = values.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const largest = values[0];
      const proportion = largest / total;
      if (Math.abs(proportion - PHI_INV) < 0.15) return true;
    }

    return values.length > 0; // Has structure = partial balance
  }

  /**
   * Check for harmony - coherent relationships between parts
   * @private
   */
  _checkHarmony(item) {
    if (typeof item !== 'object' || item === null) return false;

    const keys = Object.keys(item);
    if (keys.length === 0) return false;

    // Check for fibonacci-like key counts (1, 2, 3, 5, 8, 13, 21...)
    const fibNumbers = [1, 2, 3, 5, 8, 13, 21, 34, 55];
    const hasFibCount = fibNumbers.includes(keys.length);

    // Check for nested harmony (recursive structure)
    let nestedCount = 0;
    let leafCount = 0;
    for (const key of keys) {
      if (typeof item[key] === 'object' && item[key] !== null) {
        nestedCount++;
      } else {
        leafCount++;
      }
    }

    // Harmony: either fibonacci count, or balanced nesting
    if (hasFibCount) return true;
    if (nestedCount > 0 && leafCount > 0) {
      const ratio = Math.max(nestedCount, leafCount) / Math.min(nestedCount, leafCount);
      if (this._isNearPhi(ratio)) return true;
    }

    return keys.length >= 2; // Multiple properties = partial harmony
  }

  /**
   * Check for structure - hierarchical depth and organization
   * @private
   */
  _checkStructure(item) {
    if (typeof item !== 'object' || item === null) return false;

    // Calculate structural depth and breadth
    const analysis = this._analyzeStructure(item, 0);

    // Good structure: depth > 0 OR breadth follows φ patterns
    if (analysis.maxDepth >= 2) return true;
    if (fibNumbers.includes(analysis.totalNodes)) return true;

    // Check if breadth at each level follows φ
    const levelCounts = Object.values(analysis.nodesPerLevel);
    for (let i = 0; i < levelCounts.length - 1; i++) {
      if (levelCounts[i + 1] === 0) continue;
      const ratio = levelCounts[i] / levelCounts[i + 1];
      if (this._isNearPhi(ratio)) return true;
    }

    return analysis.totalNodes >= 3; // Minimum structure
  }

  /**
   * Check if a ratio is near φ or its powers
   * @private
   */
  _isNearPhi(ratio) {
    const tolerance = 0.25;
    const phiValues = [PHI, PHI_INV, PHI * PHI, PHI_INV_2, 1.0];
    return phiValues.some(phi => Math.abs(ratio - phi) < tolerance);
  }

  /**
   * Extract numeric values from an object
   * @private
   */
  _extractNumericValues(obj, values = []) {
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === 'number' && isFinite(val) && val > 0) {
        values.push(val);
      } else if (typeof val === 'object' && val !== null) {
        this._extractNumericValues(val, values);
      }
    }
    return values;
  }

  /**
   * Analyze structure depth and breadth
   * @private
   */
  _analyzeStructure(obj, depth, analysis = { maxDepth: 0, totalNodes: 0, nodesPerLevel: {} }) {
    if (typeof obj !== 'object' || obj === null) return analysis;

    analysis.maxDepth = Math.max(analysis.maxDepth, depth);
    analysis.nodesPerLevel[depth] = (analysis.nodesPerLevel[depth] || 0) + 1;
    analysis.totalNodes++;

    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this._analyzeStructure(obj[key], depth + 1, analysis);
      }
    }

    return analysis;
  }
}

// Fibonacci numbers for harmony checks
const fibNumbers = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// Singleton instance
export const atzilut = new Atzilut();

export default { Atzilut, atzilut };
