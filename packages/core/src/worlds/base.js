/**
 * World Base Class
 *
 * Abstract base for the 4 Worlds of Kabbalah
 *
 * @module @cynic/core/worlds/base
 */

'use strict';

import { PHI, PHI_INV, PHI_INV_2, AXIOMS } from '../axioms/constants.js';

/**
 * Abstract World class
 *
 * Each world:
 * - Maps to an axiom (PHI, VERIFY, CULTURE, BURN)
 * - Has associated dimensions
 * - Can evaluate coherence
 * - Tracks dimension scores
 */
export class World {
  /**
   * @param {Object} config - World configuration
   * @param {string} config.name - World name (ATZILUT, BERIAH, YETZIRAH, ASSIAH)
   * @param {string} config.axiom - Associated axiom
   * @param {string} config.hebrew - Hebrew name
   * @param {string} config.meaning - World meaning
   * @param {string} config.question - Core question
   * @param {string[]} config.dimensions - Associated dimensions
   */
  constructor(config) {
    this.name = config.name;
    this.axiom = config.axiom;
    this.hebrew = config.hebrew;
    this.meaning = config.meaning;
    this.question = config.question;
    this.dimensions = config.dimensions || [];
    this.color = AXIOMS[config.axiom]?.color || '#808080';

    // State
    this.scores = {};
    this.coherence = 0;
    this.lastEvaluation = null;
  }

  /**
   * Get world essence
   * @returns {Object} World essence
   */
  getEssence() {
    return {
      name: this.name,
      axiom: this.axiom,
      hebrew: this.hebrew,
      meaning: this.meaning,
      question: this.question,
      color: this.color,
    };
  }

  /**
   * Get dimension names
   * @returns {string[]} Dimension names
   */
  getDimensions() {
    return [...this.dimensions];
  }

  /**
   * Record a dimension score
   *
   * @param {string} dimension - Dimension name
   * @param {number} score - Score (0-100)
   * @param {Object} [metadata] - Additional metadata
   * @returns {boolean} Success
   */
  recordScore(dimension, score, metadata = {}) {
    if (!this.dimensions.includes(dimension)) {
      console.warn(`[${this.name}] Unknown dimension: ${dimension}`);
      return false;
    }

    const normalizedScore = Math.max(0, Math.min(100, score));
    const passed = normalizedScore >= PHI_INV_2 * 100; // 38.2% threshold

    this.scores[dimension] = {
      score: normalizedScore,
      passed,
      timestamp: Date.now(),
      ...metadata,
    };

    return true;
  }

  /**
   * Get score for dimension
   *
   * @param {string} dimension - Dimension name
   * @returns {Object|null} Score info
   */
  getScore(dimension) {
    return this.scores[dimension] || null;
  }

  /**
   * Evaluate world coherence
   *
   * Coherence = geometric mean of all dimension scores
   *
   * @returns {Object} Coherence result
   */
  evaluateCoherence() {
    const dimensionScores = Object.values(this.scores).map(s => s.score);

    if (dimensionScores.length === 0) {
      return {
        coherence: 0,
        status: 'no_data',
        message: `No dimension scores recorded for ${this.name}`,
      };
    }

    // Calculate geometric mean
    const logSum = dimensionScores.reduce((sum, s) => sum + Math.log(Math.max(s, 0.001)), 0);
    const coherence = Math.exp(logSum / dimensionScores.length);

    this.coherence = coherence;
    this.lastEvaluation = Date.now();

    // Determine status
    let status;
    if (coherence >= PHI_INV * 100) {
      status = 'coherent';
    } else if (coherence >= PHI_INV_2 * 100) {
      status = 'partial';
    } else {
      status = 'incoherent';
    }

    return {
      coherence: Math.round(coherence * 10) / 10,
      status,
      evaluatedDimensions: dimensionScores.length,
      totalDimensions: this.dimensions.length,
      coverage: dimensionScores.length / this.dimensions.length,
      message: `${this.name} coherence: ${coherence.toFixed(1)}% (${status})`,
    };
  }

  /**
   * Get blocking dimensions (below threshold)
   *
   * @returns {Object[]} Blocking dimensions
   */
  getBlockingDimensions() {
    return Object.entries(this.scores)
      .filter(([, info]) => !info.passed)
      .map(([dimension, info]) => ({
        dimension,
        score: info.score,
        world: this.name,
        axiom: this.axiom,
      }));
  }

  /**
   * Reset world state
   */
  reset() {
    this.scores = {};
    this.coherence = 0;
    this.lastEvaluation = null;
  }

  /**
   * Export world state
   * @returns {Object} Exportable state
   */
  export() {
    return {
      name: this.name,
      axiom: this.axiom,
      scores: { ...this.scores },
      coherence: this.coherence,
      lastEvaluation: this.lastEvaluation,
    };
  }

  /**
   * Import world state
   * @param {Object} state - Saved state
   */
  import(state) {
    if (state.scores) {
      this.scores = { ...state.scores };
    }
    if (state.coherence !== undefined) {
      this.coherence = state.coherence;
    }
    if (state.lastEvaluation) {
      this.lastEvaluation = state.lastEvaluation;
    }
  }
}

export default World;
