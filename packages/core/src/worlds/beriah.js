/**
 * BERIAH (בריאה) - World of Creation
 *
 * The world of creation, associated with the VERIFY axiom.
 * "Can it be verified?"
 *
 * @module @cynic/core/worlds/beriah
 */

'use strict';

import { World } from './base.js';
import { PHI_INV, PHI_INV_2 } from '../axioms/constants.js';

/**
 * Beriah - World of Verification
 */
export class Beriah extends World {
  constructor() {
    super({
      name: 'BERIAH',
      axiom: 'VERIFY',
      hebrew: 'בריאה',
      meaning: 'Creation',
      question: 'Can it be verified?',
      dimensions: ['ACCURACY', 'VERIFIABILITY', 'TRANSPARENCY', 'REPRODUCIBILITY', 'PROVENANCE', 'INTEGRITY'],
    });
  }

  /**
   * Check if something is verifiable
   *
   * @param {Object} item - Item to check
   * @returns {Object} Verifiability result
   */
  isVerifiable(item) {
    if (!item) {
      return {
        verifiable: false,
        reason: 'No item provided',
      };
    }

    const checks = {
      hasSource: this._checkSource(item),
      hasEvidence: this._checkEvidence(item),
      isReproducible: this._checkReproducibility(item),
      hasIntegrity: this._checkIntegrity(item),
    };

    const passedCount = Object.values(checks).filter(Boolean).length;
    const verifiable = passedCount >= 3;

    return {
      verifiable,
      checks,
      passedCount,
      totalChecks: 4,
      confidence: (passedCount / 4) * PHI_INV * 100,
      message: verifiable
        ? '✓ Verifiable - can be independently confirmed'
        : '⚠️ Not fully verifiable - missing evidence or provenance',
    };
  }

  /**
   * Verify a claim against evidence
   *
   * @param {string} claim - The claim to verify
   * @param {Object[]} evidence - Evidence items
   * @returns {Object} Verification result
   */
  verifyClaim(claim, evidence = []) {
    if (!claim) {
      return {
        verified: false,
        reason: 'No claim provided',
      };
    }

    if (!evidence || evidence.length === 0) {
      return {
        verified: false,
        reason: 'No evidence provided',
        suggestion: 'Claims require evidence for verification',
      };
    }

    // Score evidence quality
    const evidenceScores = evidence.map(e => this._scoreEvidence(e));
    const avgScore = evidenceScores.reduce((a, b) => a + b, 0) / evidenceScores.length;

    const verified = avgScore >= PHI_INV_2 * 100;

    return {
      verified,
      evidenceCount: evidence.length,
      avgScore: Math.round(avgScore * 10) / 10,
      confidence: Math.min(avgScore / 100, PHI_INV) * 100,
      message: verified
        ? `✓ Claim verified with ${evidence.length} evidence items`
        : `⚠️ Insufficient evidence (avg score: ${avgScore.toFixed(1)})`,
    };
  }

  /**
   * Check for source
   * @private
   */
  _checkSource(item) {
    return !!(item.source || item.provenance || item.origin || item.url);
  }

  /**
   * Check for evidence
   * @private
   */
  _checkEvidence(item) {
    return !!(item.evidence || item.proof || item.data || item.references);
  }

  /**
   * Check reproducibility
   * @private
   */
  _checkReproducibility(item) {
    return !!(item.reproducible || item.steps || item.method || item.methodology);
  }

  /**
   * Check integrity
   * @private
   */
  _checkIntegrity(item) {
    return !!(item.hash || item.signature || item.checksum || item.verified);
  }

  /**
   * Score evidence quality
   * @private
   */
  _scoreEvidence(evidence) {
    let score = 50; // Base score

    if (evidence.source) score += 10;
    if (evidence.date || evidence.timestamp) score += 5;
    if (evidence.verified) score += 15;
    if (evidence.reproducible) score += 10;
    if (evidence.hash || evidence.signature) score += 10;

    return Math.min(score, 100);
  }
}

// Singleton instance
export const beriah = new Beriah();

export default { Beriah, beriah };
