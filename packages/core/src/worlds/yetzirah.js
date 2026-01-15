/**
 * YETZIRAH (יצירה) - World of Formation
 *
 * The world of formation, associated with the CULTURE axiom.
 * "Does it respect culture?"
 *
 * @module @cynic/core/worlds/yetzirah
 */

'use strict';

import { World } from './base.js';
import { PHI_INV, PHI_INV_2 } from '../axioms/constants.js';

/**
 * Yetzirah - World of Cultural Moat
 */
export class Yetzirah extends World {
  constructor() {
    super({
      name: 'YETZIRAH',
      axiom: 'CULTURE',
      hebrew: 'יצירה',
      meaning: 'Formation',
      question: 'Does it respect culture?',
      dimensions: ['AUTHENTICITY', 'RELEVANCE', 'NOVELTY', 'ALIGNMENT', 'IMPACT', 'RESONANCE'],
    });

    // Cultural values to check against
    this.culturalValues = new Set([
      'honesty',
      'skepticism',
      'verification',
      'simplicity',
      'burning',
      'decentralization',
      'transparency',
      'loyalty_to_truth',
    ]);
  }

  /**
   * Check if something respects culture
   *
   * @param {Object} item - Item to check
   * @returns {Object} Cultural respect result
   */
  respectsCulture(item) {
    if (!item) {
      return {
        respects: false,
        reason: 'No item provided',
      };
    }

    const checks = {
      isAuthentic: this._checkAuthenticity(item),
      isRelevant: this._checkRelevance(item),
      alignsWithValues: this._checkValueAlignment(item),
      hasPositiveImpact: this._checkImpact(item),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    const respects = passedCount >= 3;

    return {
      respects,
      checks,
      passedCount,
      totalChecks: 4,
      confidence: (passedCount / 4) * PHI_INV * 100,
      message: respects
        ? '⛩ Respects cultural moat'
        : '⚠️ May not align with cultural values',
    };
  }

  /**
   * Evaluate cultural alignment score
   *
   * @param {Object} item - Item to evaluate
   * @param {string[]} [values] - Specific values to check
   * @returns {Object} Alignment score
   */
  evaluateCulturalAlignment(item, values = null) {
    const valuesToCheck = values || [...this.culturalValues];
    const alignments = {};
    let totalScore = 0;

    for (const value of valuesToCheck) {
      const aligned = this._checkValuePresence(item, value);
      alignments[value] = aligned;
      if (aligned) totalScore += 1;
    }

    const score = (totalScore / valuesToCheck.length) * 100;

    return {
      score: Math.round(score * 10) / 10,
      alignments,
      alignedCount: totalScore,
      totalValues: valuesToCheck.length,
      verdict: score >= PHI_INV * 100 ? 'strong' : score >= PHI_INV_2 * 100 ? 'partial' : 'weak',
    };
  }

  /**
   * Add cultural value
   *
   * @param {string} value - Value to add
   */
  addCulturalValue(value) {
    this.culturalValues.add(value.toLowerCase());
  }

  /**
   * Get cultural values
   *
   * @returns {string[]} Cultural values
   */
  getCulturalValues() {
    return [...this.culturalValues];
  }

  /**
   * Check authenticity
   * @private
   */
  _checkAuthenticity(item) {
    // Check for signs of authenticity
    return !!(
      item.original ||
      item.authentic ||
      item.creator ||
      item.author ||
      item.signature
    );
  }

  /**
   * Check relevance
   * @private
   */
  _checkRelevance(item) {
    // Check for relevance indicators
    return !!(
      item.relevant ||
      item.context ||
      item.purpose ||
      item.useCase
    );
  }

  /**
   * Check value alignment
   * @private
   */
  _checkValueAlignment(item) {
    // Check if item aligns with any cultural values
    const itemValues = item.values || item.principles || [];
    if (Array.isArray(itemValues)) {
      return itemValues.some(v => this.culturalValues.has(v.toLowerCase()));
    }
    return false;
  }

  /**
   * Check impact
   * @private
   */
  _checkImpact(item) {
    // Check for positive impact indicators
    return !!(
      item.impact === 'positive' ||
      item.constructive ||
      item.beneficial ||
      item.helpful
    );
  }

  /**
   * Check if item contains a specific value
   * @private
   */
  _checkValuePresence(item, value) {
    const valueLower = value.toLowerCase();

    // Check various properties
    if (item.values?.includes?.(valueLower)) return true;
    if (item.principles?.includes?.(valueLower)) return true;
    if (item[valueLower]) return true;

    // Check in text content
    const text = JSON.stringify(item).toLowerCase();
    return text.includes(valueLower);
  }
}

// Singleton instance
export const yetzirah = new Yetzirah();

export default { Yetzirah, yetzirah };
