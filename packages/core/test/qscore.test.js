/**
 * Q-Score Unit Tests
 *
 * Tests for the Q-Score calculation module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  calculateQScore,
  calculateQScoreFromAxioms,
  calculateAxiomScore,
  calculateFinalScore,
  getVerdict,
  analyzeWeaknesses,
  geometricMean,
  nthRoot,
} from '../src/qscore/index.js';

describe('Q-Score', () => {
  describe('geometricMean', () => {
    it('calculates geometric mean correctly', () => {
      const result = geometricMean([1, 9]);
      assert.strictEqual(result, 3);
    });

    it('handles single value', () => {
      const result = geometricMean([25]);
      assert.ok(Math.abs(result - 25) < 0.0001);
    });

    it('handles empty array', () => {
      const result = geometricMean([]);
      assert.strictEqual(result, 0);
    });

    it('filters out zeros', () => {
      const result = geometricMean([0, 16, 0]);
      assert.ok(Math.abs(result - 16) < 0.0001);
    });
  });

  describe('nthRoot', () => {
    it('calculates cube root correctly', () => {
      const result = nthRoot(27, 3);
      assert.strictEqual(result, 3);
    });

    it('calculates fourth root correctly', () => {
      const result = nthRoot(16, 4);
      assert.strictEqual(result, 2);
    });

    it('handles zero', () => {
      const result = nthRoot(0, 4);
      assert.strictEqual(result, 0);
    });
  });

  describe('calculateAxiomScore', () => {
    it('calculates axiom score from dimension scores', () => {
      const dimensionScores = {
        COHERENCE: 80,
        HARMONY: 70,
        STRUCTURE: 60,
        ELEGANCE: 75,
        COMPLETENESS: 65,
        PRECISION: 70,
      };

      const result = calculateAxiomScore('PHI', dimensionScores);

      assert.strictEqual(result.axiom, 'PHI');
      assert.ok(result.score > 0);
      assert.strictEqual(result.missing.length, 0);
      assert.strictEqual(result.dimensions.length, 6);
    });

    it('uses neutral score for missing dimensions', () => {
      const result = calculateAxiomScore('PHI', { COHERENCE: 80 });

      assert.ok(result.missing.length > 0);
      assert.ok(result.score > 0);
    });

    it('returns error for unknown axiom', () => {
      const result = calculateAxiomScore('UNKNOWN', {});
      assert.strictEqual(result.score, 0);
      assert.ok(result.error);
    });
  });

  describe('calculateQScore', () => {
    it('calculates Q-Score from dimension scores', () => {
      const dimensionScores = {
        // PHI dimensions
        COHERENCE: 70,
        HARMONY: 70,
        STRUCTURE: 70,
        ELEGANCE: 70,
        COMPLETENESS: 70,
        PRECISION: 70,
        // VERIFY dimensions
        ACCURACY: 70,
        VERIFIABILITY: 70,
        TRANSPARENCY: 70,
        REPRODUCIBILITY: 70,
        PROVENANCE: 70,
        INTEGRITY: 70,
        // CULTURE dimensions
        AUTHENTICITY: 70,
        RELEVANCE: 70,
        NOVELTY: 70,
        ALIGNMENT: 70,
        IMPACT: 70,
        RESONANCE: 70,
        // BURN dimensions
        UTILITY: 70,
        SUSTAINABILITY: 70,
        EFFICIENCY: 70,
        VALUE_CREATION: 70,
        NON_EXTRACTIVE: 70,
        CONTRIBUTION: 70,
      };

      const result = calculateQScore(dimensionScores);

      assert.ok(result.Q > 0);
      assert.ok(result.verdict);
      assert.ok(result.breakdown);
      assert.strictEqual(result.breakdown.PHI, 70);
    });

    it('returns lower score for imbalanced dimensions', () => {
      const balanced = calculateQScore({
        COHERENCE: 70, HARMONY: 70, STRUCTURE: 70, ELEGANCE: 70, COMPLETENESS: 70, PRECISION: 70,
        ACCURACY: 70, VERIFIABILITY: 70, TRANSPARENCY: 70, REPRODUCIBILITY: 70, PROVENANCE: 70, INTEGRITY: 70,
        AUTHENTICITY: 70, RELEVANCE: 70, NOVELTY: 70, ALIGNMENT: 70, IMPACT: 70, RESONANCE: 70,
        UTILITY: 70, SUSTAINABILITY: 70, EFFICIENCY: 70, VALUE_CREATION: 70, NON_EXTRACTIVE: 70, CONTRIBUTION: 70,
      });

      const imbalanced = calculateQScore({
        COHERENCE: 90, HARMONY: 90, STRUCTURE: 90, ELEGANCE: 90, COMPLETENESS: 90, PRECISION: 90,
        ACCURACY: 90, VERIFIABILITY: 90, TRANSPARENCY: 90, REPRODUCIBILITY: 90, PROVENANCE: 90, INTEGRITY: 90,
        AUTHENTICITY: 90, RELEVANCE: 90, NOVELTY: 90, ALIGNMENT: 90, IMPACT: 90, RESONANCE: 90,
        UTILITY: 20, SUSTAINABILITY: 20, EFFICIENCY: 20, VALUE_CREATION: 20, NON_EXTRACTIVE: 20, CONTRIBUTION: 20,
      });

      // Imbalanced should have lower Q despite higher average
      assert.ok(imbalanced.Q < balanced.Q || imbalanced.Q < 70);
    });
  });

  describe('calculateQScoreFromAxioms', () => {
    it('calculates Q-Score from pre-computed axiom scores', () => {
      const result = calculateQScoreFromAxioms({
        PHI: 80,
        VERIFY: 80,
        CULTURE: 80,
        BURN: 80,
      });

      assert.strictEqual(result.Q, 80);
      assert.strictEqual(result.verdict.verdict, 'HOWL');
    });

    it('penalizes one weak axiom', () => {
      const result = calculateQScoreFromAxioms({
        PHI: 80,
        VERIFY: 80,
        CULTURE: 80,
        BURN: 20,
      });

      // Q should be much lower than 80 due to weak BURN
      assert.ok(result.Q < 60);
    });
  });

  describe('getVerdict', () => {
    it('returns HOWL for score >= 80', () => {
      const result = getVerdict(85);
      assert.strictEqual(result.verdict, 'HOWL');
    });

    it('returns WAG for score >= 50', () => {
      const result = getVerdict(65);
      assert.strictEqual(result.verdict, 'WAG');
    });

    it('returns GROWL for score >= 38.2', () => {
      const result = getVerdict(40);
      assert.strictEqual(result.verdict, 'GROWL');
    });

    it('returns BARK for score < 38.2', () => {
      const result = getVerdict(30);
      assert.strictEqual(result.verdict, 'BARK');
    });

    it('confidence never exceeds 61.8%', () => {
      const result = getVerdict(100);
      assert.ok(result.confidence <= 0.618);
    });
  });

  describe('analyzeWeaknesses', () => {
    it('identifies weakest axiom', () => {
      const qScore = calculateQScoreFromAxioms({
        PHI: 90,
        VERIFY: 80,
        CULTURE: 70,
        BURN: 40,
      });

      const analysis = analyzeWeaknesses(qScore);

      assert.strictEqual(analysis.weakestAxiom, 'BURN');
      assert.strictEqual(analysis.weakestScore, 40);
      assert.strictEqual(analysis.strongestAxiom, 'PHI');
      assert.strictEqual(analysis.strongestScore, 90);
    });
  });

  describe('calculateFinalScore', () => {
    it('calculates Final = √(K × Q)', () => {
      const result = calculateFinalScore(81, 81);
      assert.strictEqual(result.Final, 81);
    });

    it('penalizes imbalance between K and Q', () => {
      const balanced = calculateFinalScore(70, 70);
      const imbalanced = calculateFinalScore(100, 40);

      // Geometric mean: √(70×70) = 70, √(100×40) ≈ 63.2
      assert.ok(balanced.Final > imbalanced.Final);
    });

    it('identifies limiting factor', () => {
      const result = calculateFinalScore(90, 50);
      assert.strictEqual(result.limiting, 'Q-Score');
    });
  });
});
