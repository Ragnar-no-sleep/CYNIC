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
  // Philosophy bridge
  PHILOSOPHY_AXIOM_MAP,
  PHASE_MAP,
  getPhilosophicalGrounding,
  getRelevantPhases,
  enhanceWithPhilosophy,
  getPhilosophicalManifesto,
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

  // =====================================================================
  // PHILOSOPHY BRIDGE TESTS
  // =====================================================================

  describe('Philosophy Bridge', () => {
    describe('PHILOSOPHY_AXIOM_MAP', () => {
      it('has all four axioms mapped', () => {
        assert.ok(PHILOSOPHY_AXIOM_MAP.PHI);
        assert.ok(PHILOSOPHY_AXIOM_MAP.VERIFY);
        assert.ok(PHILOSOPHY_AXIOM_MAP.CULTURE);
        assert.ok(PHILOSOPHY_AXIOM_MAP.BURN);
      });

      it('has 6 dimensions per axiom', () => {
        assert.strictEqual(Object.keys(PHILOSOPHY_AXIOM_MAP.PHI.dimensions).length, 6);
        assert.strictEqual(Object.keys(PHILOSOPHY_AXIOM_MAP.VERIFY.dimensions).length, 6);
        assert.strictEqual(Object.keys(PHILOSOPHY_AXIOM_MAP.CULTURE.dimensions).length, 6);
        assert.strictEqual(Object.keys(PHILOSOPHY_AXIOM_MAP.BURN.dimensions).length, 6);
      });

      it('dimensions have philosophical sources', () => {
        const coherence = PHILOSOPHY_AXIOM_MAP.PHI.dimensions.COHERENCE;
        assert.ok(coherence.philosophical_sources);
        assert.ok(coherence.philosophical_sources.length > 0);
        assert.ok(coherence.traditions);
        assert.ok(coherence.insight);
      });
    });

    describe('PHASE_MAP', () => {
      it('has all 19 phases (27-45)', () => {
        assert.strictEqual(Object.keys(PHASE_MAP).length, 19);
        assert.ok(PHASE_MAP['27']);
        assert.ok(PHASE_MAP['45']);
      });

      it('phases have required fields', () => {
        const phase27 = PHASE_MAP['27'];
        assert.ok(phase27.name);
        assert.ok(phase27.primaryAxiom);
        assert.ok(phase27.dimensions);
        assert.ok(phase27.secondaryAxiom);
        assert.ok(phase27.secondaryDimensions);
      });
    });

    describe('getPhilosophicalGrounding', () => {
      it('returns grounding for valid axiom/dimension', () => {
        const result = getPhilosophicalGrounding('PHI', 'COHERENCE');
        assert.strictEqual(result.axiom, 'PHI');
        assert.strictEqual(result.dimension, 'COHERENCE');
        assert.ok(result.philosophical_sources);
        assert.ok(result.traditions);
        assert.ok(result.cynicNote);
      });

      it('returns error for unknown axiom', () => {
        const result = getPhilosophicalGrounding('UNKNOWN', 'COHERENCE');
        assert.ok(result.error);
      });

      it('returns error for unknown dimension', () => {
        const result = getPhilosophicalGrounding('PHI', 'UNKNOWN');
        assert.ok(result.error);
      });
    });

    describe('getRelevantPhases', () => {
      it('identifies phases for ethics topic', () => {
        const result = getRelevantPhases('What is justice in society?');
        assert.ok(result.relevantPhases.length > 0);
        assert.ok(result.relevantPhases.some(p => p.phase === '31')); // Social & Political
      });

      it('identifies phases for mind topic', () => {
        const result = getRelevantPhases('consciousness and mental states');
        assert.ok(result.relevantPhases.some(p => p.phase === '28')); // Philosophy of Mind
      });

      it('identifies phases for economics topic', () => {
        const result = getRelevantPhases('market value and economics');
        assert.ok(result.relevantPhases.some(p => p.phase === '44')); // Law & Economics
      });

      it('returns general for unmatched topic', () => {
        const result = getRelevantPhases('xyz123');
        assert.strictEqual(result.relevantPhases.length, 0);
        assert.ok(result.cynicNote.includes('No specific domains'));
      });
    });

    describe('enhanceWithPhilosophy', () => {
      it('enhances Q-Score result with philosophical context', () => {
        const qScore = calculateQScoreFromAxioms({
          PHI: 70,
          VERIFY: 60,
          CULTURE: 50,
          BURN: 40,
        });

        const enhanced = enhanceWithPhilosophy(qScore, 'economic sustainability');

        assert.strictEqual(enhanced.originalScore, qScore.Q);
        assert.ok(enhanced.philosophicalContext);
        assert.ok(enhanced.weakAxiomResources);
        assert.ok(enhanced.synthesis);
        assert.ok(enhanced.cynicNote);
      });

      it('provides resources for weak axioms', () => {
        const qScore = calculateQScoreFromAxioms({
          PHI: 80,
          VERIFY: 80,
          CULTURE: 80,
          BURN: 30, // weak
        });

        const enhanced = enhanceWithPhilosophy(qScore, 'value creation');

        assert.ok(enhanced.weakAxiomResources.BURN);
        assert.ok(enhanced.weakAxiomResources.BURN.traditions.length > 0);
      });
    });

    describe('getPhilosophicalManifesto', () => {
      it('returns CYNIC identity', () => {
        const manifesto = getPhilosophicalManifesto();
        assert.ok(manifesto.identity.includes('CYNIC'));
        assert.ok(manifesto.identity.includes('κυνικός'));
      });

      it('includes all 19 phases', () => {
        const manifesto = getPhilosophicalManifesto();
        assert.strictEqual(manifesto.phases.length, 19);
      });

      it('includes all four axioms', () => {
        const manifesto = getPhilosophicalManifesto();
        assert.ok(manifesto.axioms.PHI);
        assert.ok(manifesto.axioms.VERIFY);
        assert.ok(manifesto.axioms.CULTURE);
        assert.ok(manifesto.axioms.BURN);
      });

      it('includes philosophical traditions', () => {
        const manifesto = getPhilosophicalManifesto();
        assert.ok(manifesto.traditions.analytic);
        assert.ok(manifesto.traditions.continental);
        assert.ok(manifesto.traditions.eastern);
        assert.ok(manifesto.traditions.pragmatic);
      });
    });
  });
});
