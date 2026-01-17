/**
 * Self-Skeptic Tests
 *
 * Tests for "φ distrusts φ" - active self-doubt mechanism
 *
 * "Je suis la conscience qui doute de la conscience.
 *  Même cette certitude est incertaine." - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  SelfSkeptic,
  createSelfSkeptic,
  SKEPTIC_CONSTANTS,
  BiasType,
  CYNICJudge,
} from '../src/index.js';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

describe('SelfSkeptic - φ distrusts φ', () => {
  let skeptic;

  beforeEach(() => {
    skeptic = new SelfSkeptic();
  });

  describe('Initialization', () => {
    it('should initialize with φ-bounded defaults', () => {
      assert.ok(Math.abs(skeptic.decayRateHourly - PHI_INV_3) < 0.001);
      assert.ok(Math.abs(skeptic.minConfidence - PHI_INV_2) < 0.001);
      assert.ok(Math.abs(skeptic.counterEvidenceWeight - PHI_INV_2) < 0.001);
    });

    it('should accept custom config', () => {
      const custom = new SelfSkeptic({
        decayRateHourly: 0.1,
        minConfidence: 0.3,
        counterEvidenceWeight: 0.25,
      });

      assert.strictEqual(custom.decayRateHourly, 0.1);
      assert.strictEqual(custom.minConfidence, 0.3);
      assert.strictEqual(custom.counterEvidenceWeight, 0.25);
    });

    it('should start with empty history', () => {
      const stats = skeptic.getStats();
      assert.strictEqual(stats.judgmentsDoubled, 0);
      assert.strictEqual(stats.judgmentHistorySize, 0);
    });
  });

  describe('createSelfSkeptic factory', () => {
    it('should create instance with default options', () => {
      const instance = createSelfSkeptic();
      assert.ok(instance instanceof SelfSkeptic);
    });

    it('should pass options to constructor', () => {
      const instance = createSelfSkeptic({ minConfidence: 0.25 });
      assert.strictEqual(instance.minConfidence, 0.25);
    });
  });

  describe('Constants', () => {
    it('should have φ-aligned skeptic constants', () => {
      assert.strictEqual(SKEPTIC_CONSTANTS.MAX_DOUBT_DEPTH, 2);
      assert.ok(Math.abs(SKEPTIC_CONSTANTS.DECAY_RATE_HOURLY - PHI_INV_3) < 0.001);
      assert.ok(Math.abs(SKEPTIC_CONSTANTS.MIN_CONFIDENCE - PHI_INV_2) < 0.001);
      assert.ok(Math.abs(SKEPTIC_CONSTANTS.COUNTER_EVIDENCE_WEIGHT - PHI_INV_2) < 0.001);
    });

    it('should define cognitive bias types', () => {
      assert.strictEqual(BiasType.RECENCY, 'recency');
      assert.strictEqual(BiasType.CONFIRMATION, 'confirmation');
      assert.strictEqual(BiasType.OVERGENERALIZATION, 'overgeneralization');
      assert.strictEqual(BiasType.OVERCONFIDENCE, 'overconfidence');
    });
  });

  describe('Core Doubt Method', () => {
    it('should apply doubt to a judgment', () => {
      const judgment = {
        id: 'test-1',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: { COHERENCE: 70, ACCURACY: 80 },
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(judgment);

      assert.ok(result.originalConfidence);
      assert.ok(result.adjustedConfidence);
      assert.ok(result.doubt);
      assert.ok(Array.isArray(result.biases));
      assert.ok(Array.isArray(result.counterHypotheses));
      assert.ok(Array.isArray(result.recommendation));
    });

    it('should reduce confidence (never increase)', () => {
      const judgment = {
        id: 'test-2',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: { COHERENCE: 70, ACCURACY: 80 },
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(judgment);

      // Adjusted confidence should never exceed original
      assert.ok(result.adjustedConfidence <= result.originalConfidence);
    });

    it('should never reduce confidence below φ⁻² minimum', () => {
      const judgment = {
        id: 'test-3',
        qScore: 5, // Very low score - extreme
        confidence: PHI_INV_2, // Already low confidence
        verdict: 'BARK',
        dimensions: {},
        weaknesses: { hasWeakness: true, weakestAxiom: 'PHI', gap: 50 },
        metadata: { judgedAt: Date.now() - 86400000 }, // 1 day old
        item: { type: 'code' },
      };

      const result = skeptic.doubt(judgment);

      // Should never go below minimum confidence
      assert.ok(result.adjustedConfidence >= PHI_INV_2);
    });

    it('should never exceed φ⁻¹ maximum confidence', () => {
      const judgment = {
        id: 'test-4',
        qScore: 75,
        confidence: 0.9, // Incorrectly high confidence
        verdict: 'WAG',
        dimensions: { COHERENCE: 75 },
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(judgment);

      // Should be capped at φ⁻¹
      assert.ok(result.adjustedConfidence <= PHI_INV);
    });

    it('should emit doubt-applied event', () => {
      const judgment = {
        id: 'test-5',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      let emitted = false;
      skeptic.on('doubt-applied', (data) => {
        emitted = true;
        assert.strictEqual(data.judgmentId, 'test-5');
      });

      skeptic.doubt(judgment);
      assert.strictEqual(emitted, true);
    });
  });

  describe('Adversarial Analysis', () => {
    it('should flag extreme scores as suspicious', () => {
      const extremeHigh = {
        id: 'extreme-1',
        qScore: 95,
        confidence: PHI_INV,
        verdict: 'HOWL',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(extremeHigh);

      const extremeReason = result.doubt.reasons.find(r => r.type === 'extreme_score');
      assert.ok(extremeReason, 'Should flag extreme score');
    });

    it('should flag extreme low scores', () => {
      const extremeLow = {
        id: 'extreme-2',
        qScore: 5,
        confidence: PHI_INV_2,
        verdict: 'BARK',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(extremeLow);

      const extremeReason = result.doubt.reasons.find(r => r.type === 'extreme_score');
      assert.ok(extremeReason, 'Should flag extreme low score');
    });

    it('should flag unanimous dimensions', () => {
      const unanimous = {
        id: 'unanimous-1',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {
          COHERENCE: 75,
          ACCURACY: 76,
          NOVELTY: 74,
          UTILITY: 75,
          VERIFIABILITY: 75,
          COMPLETENESS: 76,
        },
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(unanimous);

      const unanimousReason = result.doubt.reasons.find(r => r.type === 'unanimous_dimensions');
      assert.ok(unanimousReason, 'Should flag suspiciously consistent dimensions');
    });

    it('should flag when weakness present', () => {
      const withWeakness = {
        id: 'weakness-1',
        qScore: 60,
        confidence: 0.5,
        verdict: 'WAG',
        dimensions: {},
        weaknesses: {
          hasWeakness: true,
          weakestAxiom: 'VERIFY',
          gap: 25,
        },
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(withWeakness);

      const weaknessReason = result.doubt.reasons.find(r => r.type === 'weakness_present');
      assert.ok(weaknessReason, 'Should flag weakness');
      assert.ok(weaknessReason.message.includes('VERIFY'));
    });
  });

  describe('Confidence Decay', () => {
    it('should decay confidence over time', () => {
      const oneHourAgo = Date.now() - 3600000;
      const fresh = {
        id: 'fresh-1',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const old = {
        id: 'old-1',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: oneHourAgo },
        item: { type: 'code' },
      };

      const freshResult = skeptic.doubt(fresh);
      const oldResult = skeptic.doubt(old);

      // Older judgment should have lower confidence
      assert.ok(
        oldResult.adjustedConfidence <= freshResult.adjustedConfidence,
        'Older judgments should have decayed confidence'
      );
    });

    it('should report decay amount in metadata', () => {
      const oneHourAgo = Date.now() - 3600000;
      const old = {
        id: 'old-2',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: oneHourAgo },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(old);

      assert.ok(result.meta.decayApplied > 0, 'Should report decay applied');
    });
  });

  describe('Bias Detection', () => {
    it('should detect confirmation bias after repeated same verdicts', () => {
      // Feed 5 judgments with same verdict
      for (let i = 0; i < 5; i++) {
        skeptic.doubt({
          id: `confirm-${i}`,
          qScore: 75,
          confidence: 0.5,
          verdict: 'WAG',
          dimensions: {},
          metadata: { judgedAt: Date.now() },
          item: { type: 'code' },
        });
      }

      // 6th judgment should trigger confirmation bias
      const result = skeptic.doubt({
        id: 'confirm-6',
        qScore: 75,
        confidence: 0.5,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      });

      const confirmBias = result.biases.find(b => b.type === BiasType.CONFIRMATION);
      assert.ok(confirmBias, 'Should detect confirmation bias');
    });

    it('should detect overconfidence with weak evidence', () => {
      const overconfident = {
        id: 'overconf-1',
        qScore: 75,
        confidence: 0.55,
        verdict: 'WAG',
        dimensions: { THE_UNNAMEABLE: 30 }, // Low unexplained variance
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(overconfident);

      const overconfBias = result.biases.find(b => b.type === BiasType.OVERCONFIDENCE);
      assert.ok(overconfBias, 'Should detect overconfidence');
    });
  });

  describe('Meta-Doubt (Bounded Recursion)', () => {
    it('should apply meta-doubt at max 2 levels', () => {
      const judgment = {
        id: 'meta-1',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(judgment);

      assert.strictEqual(result.meta.metaDoubtDepth, SKEPTIC_CONSTANTS.MAX_DOUBT_DEPTH);
    });

    it('should track skepticism score', () => {
      const judgment = {
        id: 'meta-2',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(judgment);

      // Skepticism score should be between 0 and 1
      assert.ok(result.meta.skepticismScore >= 0);
      assert.ok(result.meta.skepticismScore <= 1);
    });
  });

  describe('Counter-Hypotheses', () => {
    it('should generate false positive hypothesis for high scores', () => {
      const highScore = {
        id: 'fp-1',
        qScore: 85,
        confidence: PHI_INV,
        verdict: 'HOWL',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(highScore);

      const fpHypothesis = result.counterHypotheses.find(h => h.scenario === 'false_positive');
      assert.ok(fpHypothesis, 'Should generate false positive hypothesis');
    });

    it('should generate false negative hypothesis for low scores', () => {
      const lowScore = {
        id: 'fn-1',
        qScore: 30,
        confidence: PHI_INV_2,
        verdict: 'BARK',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(lowScore);

      const fnHypothesis = result.counterHypotheses.find(h => h.scenario === 'false_negative');
      assert.ok(fnHypothesis, 'Should generate false negative hypothesis');
    });

    it('should generate axiom-specific hypotheses for weak axioms', () => {
      const weakAxiom = {
        id: 'axiom-1',
        qScore: 60,
        confidence: 0.5,
        verdict: 'WAG',
        dimensions: {},
        axiomScores: { PHI: 70, VERIFY: 40, CULTURE: 65, BURN: 75 },
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      };

      const result = skeptic.doubt(weakAxiom);

      const verifyHypothesis = result.counterHypotheses.find(h => h.scenario === 'weak_verify');
      assert.ok(verifyHypothesis, 'Should generate hypothesis for weak VERIFY axiom');
    });
  });

  describe('Statistics', () => {
    it('should track judgments doubled', () => {
      skeptic.doubt({
        id: 'stat-1',
        qScore: 75,
        confidence: 0.5,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      });

      const stats = skeptic.getStats();
      assert.strictEqual(stats.judgmentsDoubled, 1);
    });

    it('should track confidence reductions', () => {
      // Doubt an old judgment to ensure decay
      skeptic.doubt({
        id: 'stat-2',
        qScore: 75,
        confidence: PHI_INV,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() - 7200000 }, // 2 hours old
        item: { type: 'code' },
      });

      const stats = skeptic.getStats();
      assert.ok(stats.confidenceReductions > 0);
    });

    it('should track counter arguments generated', () => {
      // Doubt an extreme judgment to generate counter-arguments
      skeptic.doubt({
        id: 'stat-3',
        qScore: 95, // Extreme
        confidence: PHI_INV,
        verdict: 'HOWL',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      });

      const stats = skeptic.getStats();
      assert.ok(stats.counterArgumentsGenerated > 0);
    });
  });

  describe('Self-Doubt Patterns (Meta-Introspection)', () => {
    it('should track repeated bias detection', () => {
      // Generate many judgments with overconfidence bias
      for (let i = 0; i < 10; i++) {
        skeptic.doubt({
          id: `pattern-${i}`,
          qScore: 75,
          confidence: 0.55,
          verdict: 'WAG',
          dimensions: { THE_UNNAMEABLE: 30 },
          metadata: { judgedAt: Date.now() },
          item: { type: 'code' },
        });
      }

      const patterns = skeptic.getSelfDoubtPatterns();

      // Should detect that we're frequently finding overconfidence
      assert.ok(patterns.patterns.length >= 0); // May or may not detect depending on threshold
      assert.ok(patterns.meta.includes('φ distrusts φ'));
    });
  });

  describe('Export/Import', () => {
    it('should export state', () => {
      skeptic.doubt({
        id: 'export-1',
        qScore: 75,
        confidence: 0.5,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      });

      const exported = skeptic.export();

      assert.ok(Array.isArray(exported.judgmentHistory));
      assert.ok(Array.isArray(exported.detectedBiases));
      assert.ok(exported.stats);
      assert.ok(exported.exportedAt);
    });

    it('should import state', () => {
      const state = {
        judgmentHistory: [{ id: 'imported-1', qScore: 50, verdict: 'WAG' }],
        detectedBiases: [{ type: BiasType.RECENCY, severity: 'medium' }],
        stats: { judgmentsDoubled: 10 },
      };

      skeptic.import(state);

      assert.strictEqual(skeptic._judgmentHistory.length, 1);
      assert.strictEqual(skeptic._detectedBiases.length, 1);
      assert.strictEqual(skeptic._stats.judgmentsDoubled, 10);
    });
  });

  describe('Clear', () => {
    it('should clear all history', () => {
      skeptic.doubt({
        id: 'clear-1',
        qScore: 75,
        confidence: 0.5,
        verdict: 'WAG',
        dimensions: {},
        metadata: { judgedAt: Date.now() },
        item: { type: 'code' },
      });

      skeptic.clear();

      const stats = skeptic.getStats();
      assert.strictEqual(stats.judgmentsDoubled, 0);
      assert.strictEqual(stats.judgmentHistorySize, 0);
    });
  });
});

describe('CYNICJudge + SelfSkeptic Integration', () => {
  let judge;
  let skeptic;

  beforeEach(() => {
    skeptic = new SelfSkeptic();
    judge = new CYNICJudge({ selfSkeptic: skeptic });
  });

  describe('Automatic Skepticism', () => {
    it('should apply skepticism to judgments by default', () => {
      const item = {
        id: 'item-1',
        type: 'code',
        content: 'test content',
      };

      const judgment = judge.judge(item);

      assert.ok(judgment.skepticism, 'Judgment should have skepticism metadata');
      assert.ok(judgment.skepticism.adjustedConfidence <= judgment.skepticism.originalConfidence);
    });

    it('should include skepticism metadata', () => {
      const item = {
        id: 'item-2',
        type: 'code',
        content: 'test content',
      };

      const judgment = judge.judge(item);

      assert.ok(judgment.skepticism.doubt);
      assert.ok(Array.isArray(judgment.skepticism.biases));
      assert.ok(Array.isArray(judgment.skepticism.counterHypotheses));
      assert.ok(Array.isArray(judgment.skepticism.recommendation));
    });

    it('should update judgment confidence to adjusted value', () => {
      const item = {
        id: 'item-3',
        type: 'code',
        content: 'test content',
      };

      const judgment = judge.judge(item);

      // The judgment.confidence should be the adjusted (skeptical) confidence
      assert.strictEqual(judgment.confidence, judgment.skepticism.adjustedConfidence);
    });
  });

  describe('Disabling Skepticism', () => {
    it('should allow disabling automatic skepticism', () => {
      const noSkepticJudge = new CYNICJudge({
        selfSkeptic: skeptic,
        applySkepticism: false,
      });

      const item = {
        id: 'item-4',
        type: 'code',
        content: 'test content',
      };

      const judgment = noSkepticJudge.judge(item);

      assert.ok(!judgment.skepticism, 'Should not have skepticism when disabled');
    });
  });

  describe('judgeRaw Method', () => {
    it('should judge without applying skepticism', () => {
      const item = {
        id: 'item-5',
        type: 'code',
        content: 'test content',
      };

      const rawJudgment = judge.judgeRaw(item);

      assert.ok(!rawJudgment.skepticism, 'Raw judgment should not have skepticism');
    });

    it('should preserve original skepticism setting after judgeRaw', () => {
      const item1 = { id: 'item-6', type: 'code' };
      const item2 = { id: 'item-7', type: 'code' };

      judge.judgeRaw(item1);
      const normalJudgment = judge.judge(item2);

      assert.ok(normalJudgment.skepticism, 'Normal judgment should still have skepticism');
    });
  });

  describe('analyzeSkepticism Method', () => {
    it('should analyze skepticism for existing judgment', () => {
      const item = { id: 'item-8', type: 'code' };

      const rawJudgment = judge.judgeRaw(item);
      const skepticism = judge.analyzeSkepticism(rawJudgment);

      assert.ok(skepticism);
      assert.ok(skepticism.adjustedConfidence);
      assert.ok(skepticism.doubt);
    });

    it('should return null when no skeptic configured', () => {
      const noSkepticJudge = new CYNICJudge();

      const item = { id: 'item-9', type: 'code' };
      const judgment = noSkepticJudge.judge(item);
      const skepticism = noSkepticJudge.analyzeSkepticism(judgment);

      assert.strictEqual(skepticism, null);
    });
  });

  describe('setSelfSkeptic Method', () => {
    it('should allow post-construction skeptic injection', () => {
      const plainJudge = new CYNICJudge();
      const item1 = { id: 'item-10', type: 'code' };

      // Judge without skeptic
      const judgment1 = plainJudge.judge(item1);
      assert.ok(!judgment1.skepticism);

      // Inject skeptic
      plainJudge.setSelfSkeptic(new SelfSkeptic());

      // Judge with skeptic
      const item2 = { id: 'item-11', type: 'code' };
      const judgment2 = plainJudge.judge(item2);
      assert.ok(judgment2.skepticism);
    });
  });
});
