/**
 * @cynic/core - Learning Loop Tests
 *
 * Tests learning system:
 * - Feedback analysis and tracking
 * - Weight calibration based on feedback
 * - Bias detection
 * - Learning loop orchestration
 *
 * "φ distrusts φ" - Testing the self-doubt mechanism
 *
 * @module @cynic/core/test/learning
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  LEARNING_CONSTANTS,
  FeedbackOutcome,
  BiasType,
  FeedbackAnalyzer,
  WeightCalibrator,
  BiasDetector,
  LearningLoop,
} from '../src/learning/index.js';

import { PHI_INV_2 } from '../src/axioms/constants.js';

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe('LEARNING_CONSTANTS', () => {
  it('should have Fibonacci-aligned min samples', () => {
    assert.strictEqual(LEARNING_CONSTANTS.MIN_SAMPLES, 21);
  });

  it('should have phi-inverse-squared learning rate', () => {
    assert.strictEqual(LEARNING_CONSTANTS.LEARNING_RATE, PHI_INV_2);
  });

  it('should have weight decay factor', () => {
    assert.strictEqual(LEARNING_CONSTANTS.WEIGHT_DECAY, 0.99);
  });

  it('should have max weight deviation', () => {
    assert.strictEqual(LEARNING_CONSTANTS.MAX_WEIGHT_DEVIATION, PHI_INV_2);
  });

  it('should have Fibonacci calibration window', () => {
    assert.strictEqual(LEARNING_CONSTANTS.CALIBRATION_WINDOW, 13);
  });

  it('should have Fibonacci max learnings', () => {
    assert.strictEqual(LEARNING_CONSTANTS.MAX_LEARNINGS, 55);
  });
});

describe('FeedbackOutcome', () => {
  it('should define outcomes', () => {
    assert.strictEqual(FeedbackOutcome.CORRECT, 'correct');
    assert.strictEqual(FeedbackOutcome.INCORRECT, 'incorrect');
    assert.strictEqual(FeedbackOutcome.PARTIAL, 'partial');
  });
});

describe('BiasType', () => {
  it('should define bias types', () => {
    assert.strictEqual(BiasType.OVERCONFIDENT, 'overconfident');
    assert.strictEqual(BiasType.UNDERCONFIDENT, 'underconfident');
    assert.strictEqual(BiasType.AXIOM_SKEW, 'axiom_skew');
    assert.strictEqual(BiasType.VERDICT_BIAS, 'verdict_bias');
    assert.strictEqual(BiasType.SOURCE_BIAS, 'source_bias');
  });
});

// =============================================================================
// FEEDBACK ANALYZER TESTS
// =============================================================================

describe('FeedbackAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new FeedbackAnalyzer();
  });

  describe('Construction', () => {
    it('should initialize with empty state', () => {
      assert.deepStrictEqual(analyzer.samples, []);
      assert.strictEqual(analyzer.stats.total, 0);
      assert.strictEqual(analyzer.stats.correct, 0);
      assert.strictEqual(analyzer.stats.incorrect, 0);
      assert.strictEqual(analyzer.stats.partial, 0);
    });
  });

  describe('addSample', () => {
    it('should add feedback sample', () => {
      const feedback = {
        judgment: { Q: 70 },
        outcome: FeedbackOutcome.CORRECT,
      };

      const sample = analyzer.addSample(feedback);

      assert.strictEqual(analyzer.samples.length, 1);
      assert.ok(sample.timestamp);
    });

    it('should calculate score error', () => {
      const feedback = {
        judgment: { Q: 70 },
        outcome: FeedbackOutcome.INCORRECT,
        actualScore: 80,
      };

      const sample = analyzer.addSample(feedback);

      assert.strictEqual(sample.scoreError, 10);
    });

    it('should update stats for correct', () => {
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });

      assert.strictEqual(analyzer.stats.correct, 1);
      assert.strictEqual(analyzer.stats.total, 1);
    });

    it('should update stats for incorrect', () => {
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.INCORRECT });

      assert.strictEqual(analyzer.stats.incorrect, 1);
    });

    it('should update stats for partial', () => {
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.PARTIAL });

      assert.strictEqual(analyzer.stats.partial, 1);
    });

    it('should trim old samples', () => {
      // Add more than MAX_LEARNINGS samples
      for (let i = 0; i < LEARNING_CONSTANTS.MAX_LEARNINGS + 10; i++) {
        analyzer.addSample({ judgment: { Q: 50 }, outcome: FeedbackOutcome.CORRECT });
      }

      assert.strictEqual(analyzer.samples.length, LEARNING_CONSTANTS.MAX_LEARNINGS);
    });

    it('should update average score error', () => {
      analyzer.addSample({ judgment: { Q: 70 }, outcome: FeedbackOutcome.INCORRECT, actualScore: 80 });
      analyzer.addSample({ judgment: { Q: 60 }, outcome: FeedbackOutcome.INCORRECT, actualScore: 80 });

      // Average of 10 and 20 = 15
      assert.strictEqual(analyzer.stats.avgScoreError, 15);
    });
  });

  describe('getAccuracy', () => {
    it('should return 0 with no samples', () => {
      assert.strictEqual(analyzer.getAccuracy(), 0);
    });

    it('should calculate accuracy for correct samples', () => {
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });

      assert.strictEqual(analyzer.getAccuracy(), 1);
    });

    it('should weight partial as 0.5', () => {
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.PARTIAL });

      // (1 + 0.5) / 2 = 0.75
      assert.strictEqual(analyzer.getAccuracy(), 0.75);
    });

    it('should calculate mixed accuracy', () => {
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.INCORRECT });

      assert.strictEqual(analyzer.getAccuracy(), 0.5);
    });
  });

  describe('getRecentSamples', () => {
    it('should return last N samples', () => {
      for (let i = 0; i < 20; i++) {
        analyzer.addSample({ judgment: { id: i }, outcome: FeedbackOutcome.CORRECT });
      }

      const recent = analyzer.getRecentSamples(5);

      assert.strictEqual(recent.length, 5);
      // Should be the last 5
      assert.strictEqual(recent[0].judgment.id, 15);
    });
  });

  describe('getStats', () => {
    it('should return stats with accuracy', () => {
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });
      analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.INCORRECT });

      const stats = analyzer.getStats();

      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.accuracy, 0.5);
      assert.strictEqual(stats.sampleCount, 2);
    });
  });

  describe('export/import', () => {
    it('should export state', () => {
      analyzer.addSample({ judgment: { Q: 70 }, outcome: FeedbackOutcome.CORRECT });

      const exported = analyzer.export();

      assert.ok(exported.samples);
      assert.ok(exported.stats);
    });

    it('should import state', () => {
      const state = {
        samples: [{ judgment: {}, outcome: 'correct', timestamp: Date.now() }],
        stats: { total: 1, correct: 1, incorrect: 0, partial: 0, avgScoreError: 0, axiomErrors: {} },
      };

      analyzer.import(state);

      assert.strictEqual(analyzer.samples.length, 1);
      assert.strictEqual(analyzer.stats.total, 1);
    });
  });
});

// =============================================================================
// WEIGHT CALIBRATOR TESTS
// =============================================================================

describe('WeightCalibrator', () => {
  let calibrator;

  beforeEach(() => {
    calibrator = new WeightCalibrator();
  });

  describe('Construction', () => {
    it('should initialize with neutral weights', () => {
      const weights = calibrator.getWeights();

      assert.strictEqual(weights.PHI, 1.0);
      assert.strictEqual(weights.VERIFY, 1.0);
      assert.strictEqual(weights.CULTURE, 1.0);
      assert.strictEqual(weights.BURN, 1.0);
    });

    it('should have empty history', () => {
      assert.deepStrictEqual(calibrator.history, []);
      assert.strictEqual(calibrator.iterations, 0);
    });
  });

  describe('calibrate', () => {
    it('should require minimum samples', () => {
      const batch = [{ judgment: {}, actualScore: 80 }];
      const result = calibrator.calibrate(batch);

      assert.strictEqual(result.updated, false);
      assert.ok(result.reason.includes('Need'));
    });

    it('should require breakdown in judgments', () => {
      const batch = [];
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        batch.push({ judgment: { Q: 70 }, actualScore: 75 });
      }

      const result = calibrator.calibrate(batch);

      assert.strictEqual(result.updated, false);
      assert.ok(result.reason.includes('valid samples'));
    });

    it('should update weights with valid batch', () => {
      const batch = [];
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        batch.push({
          judgment: {
            Q: 70,
            breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
          },
          actualScore: 80, // Underscored by 10
        });
      }

      const result = calibrator.calibrate(batch);

      assert.strictEqual(result.updated, true);
      assert.ok(result.weights);
      assert.ok(result.adjustments);
      assert.strictEqual(result.iteration, 1);
    });

    it('should clamp weights within bounds', () => {
      // Create extreme batch to push weights
      const batch = [];
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        batch.push({
          judgment: {
            Q: 20,
            breakdown: { PHI: 20, VERIFY: 20, CULTURE: 20, BURN: 20 },
          },
          actualScore: 100, // Huge error
        });
      }

      // Run many calibrations
      for (let i = 0; i < 100; i++) {
        calibrator.calibrate(batch);
      }

      const weights = calibrator.getWeights();
      const maxDev = LEARNING_CONSTANTS.MAX_WEIGHT_DEVIATION;

      for (const w of Object.values(weights)) {
        assert.ok(w >= 1 - maxDev);
        assert.ok(w <= 1 + maxDev);
      }
    });

    it('should track history', () => {
      const batch = [];
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        batch.push({
          judgment: {
            Q: 70,
            breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
          },
          actualScore: 75,
        });
      }

      calibrator.calibrate(batch);

      assert.strictEqual(calibrator.history.length, 1);
      assert.ok(calibrator.history[0].timestamp);
      assert.ok(calibrator.history[0].weights);
    });
  });

  describe('applyWeights', () => {
    it('should multiply scores by weights', () => {
      // Manually set weights
      calibrator.weights = { PHI: 1.1, VERIFY: 0.9, CULTURE: 1.0, BURN: 1.0 };

      const breakdown = { PHI: 70, VERIFY: 80, CULTURE: 60, BURN: 50 };
      const weighted = calibrator.applyWeights(breakdown);

      assert.strictEqual(weighted.PHI, 77); // 70 * 1.1
      assert.strictEqual(weighted.VERIFY, 72); // 80 * 0.9
      assert.strictEqual(weighted.CULTURE, 60);
      assert.strictEqual(weighted.BURN, 50);
    });

    it('should handle missing axioms', () => {
      const breakdown = { PHI: 70 };
      const weighted = calibrator.applyWeights(breakdown);

      assert.strictEqual(weighted.PHI, 70);
    });
  });

  describe('reset', () => {
    it('should reset to neutral state', () => {
      calibrator.weights.PHI = 1.2;
      calibrator.history.push({ test: true });
      calibrator.iterations = 5;

      calibrator.reset();

      assert.strictEqual(calibrator.weights.PHI, 1.0);
      assert.deepStrictEqual(calibrator.history, []);
      assert.strictEqual(calibrator.iterations, 0);
    });
  });

  describe('export/import', () => {
    it('should export state', () => {
      calibrator.weights.PHI = 1.1;
      calibrator.iterations = 3;

      const exported = calibrator.export();

      assert.strictEqual(exported.weights.PHI, 1.1);
      assert.strictEqual(exported.iterations, 3);
    });

    it('should import state', () => {
      const state = {
        weights: { PHI: 1.2, VERIFY: 0.9, CULTURE: 1.0, BURN: 1.1 },
        history: [{ test: true }],
        iterations: 5,
      };

      calibrator.import(state);

      assert.strictEqual(calibrator.weights.PHI, 1.2);
      assert.strictEqual(calibrator.iterations, 5);
    });
  });
});

// =============================================================================
// BIAS DETECTOR TESTS
// =============================================================================

describe('BiasDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new BiasDetector();
  });

  describe('Construction', () => {
    it('should initialize with empty biases', () => {
      assert.deepStrictEqual(detector.biases, []);
    });

    it('should initialize tracking', () => {
      assert.deepStrictEqual(detector.tracking.confidenceErrors, []);
      assert.ok(detector.tracking.verdictDistribution);
      assert.ok(detector.tracking.axiomErrors);
      assert.ok(detector.tracking.sourcePerformance);
    });
  });

  describe('analyze', () => {
    it('should detect overconfidence', () => {
      const batch = [];
      // High confidence but low accuracy
      for (let i = 0; i < LEARNING_CONSTANTS.CALIBRATION_WINDOW; i++) {
        batch.push({
          judgment: { confidence: 0.8 },
          outcome: FeedbackOutcome.INCORRECT,
        });
      }

      const result = detector.analyze(batch);

      assert.ok(result.biases.some(b => b.type === BiasType.OVERCONFIDENT));
    });

    it('should detect underconfidence', () => {
      const batch = [];
      // Low confidence but high accuracy
      for (let i = 0; i < LEARNING_CONSTANTS.CALIBRATION_WINDOW; i++) {
        batch.push({
          judgment: { confidence: 0.2 },
          outcome: FeedbackOutcome.CORRECT,
        });
      }

      const result = detector.analyze(batch);

      assert.ok(result.biases.some(b => b.type === BiasType.UNDERCONFIDENT));
    });

    it('should detect verdict bias', () => {
      // Skew toward one verdict
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        detector.tracking.verdictDistribution.HOWL++;
      }

      const result = detector.analyze([]);

      assert.ok(result.biases.some(b => b.type === BiasType.VERDICT_BIAS));
    });

    it('should detect axiom skew', () => {
      // Add consistent errors for one axiom
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        detector.tracking.axiomErrors.PHI.push(20); // Consistently off by 20
      }

      const result = detector.analyze([]);

      assert.ok(result.biases.some(b => b.type === BiasType.AXIOM_SKEW));
    });

    it('should detect source bias', () => {
      // Add poor performance for a source
      detector.tracking.sourcePerformance['bad_source'] = { correct: 1, total: 10 };

      const result = detector.analyze([]);

      assert.ok(result.biases.some(b => b.type === BiasType.SOURCE_BIAS));
    });

    it('should return severity', () => {
      const result = detector.analyze([]);

      assert.ok(['none', 'low', 'medium', 'high'].includes(result.severity));
    });

    it('should return recommendations', () => {
      // Add a bias
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        detector.tracking.axiomErrors.PHI.push(20);
      }

      const result = detector.analyze([]);

      assert.ok(result.recommendations.length > 0);
    });
  });

  describe('reset', () => {
    it('should clear all tracking data', () => {
      detector.biases.push({ type: 'test' });
      detector.tracking.confidenceErrors.push({ test: true });

      detector.reset();

      assert.deepStrictEqual(detector.biases, []);
      assert.deepStrictEqual(detector.tracking.confidenceErrors, []);
    });
  });

  describe('export/import', () => {
    it('should export state', () => {
      detector.biases.push({ type: BiasType.OVERCONFIDENT });

      const exported = detector.export();

      assert.strictEqual(exported.biases.length, 1);
      assert.ok(exported.tracking);
    });

    it('should import state', () => {
      const state = {
        biases: [{ type: BiasType.UNDERCONFIDENT }],
        tracking: { confidenceErrors: [{ test: true }] },
      };

      detector.import(state);

      assert.strictEqual(detector.biases.length, 1);
    });
  });
});

// =============================================================================
// LEARNING LOOP TESTS
// =============================================================================

describe('LearningLoop', () => {
  let loop;

  beforeEach(() => {
    loop = new LearningLoop();
  });

  describe('Construction', () => {
    it('should create with default components', () => {
      assert.ok(loop.analyzer instanceof FeedbackAnalyzer);
      assert.ok(loop.calibrator instanceof WeightCalibrator);
      assert.ok(loop.biasDetector instanceof BiasDetector);
    });

    it('should accept custom components', () => {
      const customAnalyzer = new FeedbackAnalyzer();
      const customLoop = new LearningLoop({ analyzer: customAnalyzer });

      assert.strictEqual(customLoop.analyzer, customAnalyzer);
    });

    it('should have default config', () => {
      assert.strictEqual(loop.config.autoCalibrate, true);
      assert.strictEqual(loop.config.calibrateThreshold, LEARNING_CONSTANTS.MIN_SAMPLES);
      assert.strictEqual(loop.config.detectBiases, true);
    });
  });

  describe('processFeedback', () => {
    it('should add to analyzer', () => {
      loop.processFeedback({
        judgment: { Q: 70 },
        outcome: FeedbackOutcome.CORRECT,
      });

      assert.strictEqual(loop.analyzer.samples.length, 1);
    });

    it('should add to pending batch', () => {
      loop.processFeedback({
        judgment: { Q: 70 },
        outcome: FeedbackOutcome.CORRECT,
      });

      assert.strictEqual(loop.pendingFeedback.length, 1);
    });

    it('should return stats', () => {
      const result = loop.processFeedback({
        judgment: { Q: 70 },
        outcome: FeedbackOutcome.CORRECT,
      });

      assert.ok(result.sample);
      assert.ok(result.stats);
    });

    it('should auto-calibrate at threshold', () => {
      // Fill to threshold
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        loop.processFeedback({
          judgment: { Q: 70, breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 } },
          outcome: FeedbackOutcome.CORRECT,
          actualScore: 75,
        });
      }

      // Pending should be cleared after calibration
      assert.strictEqual(loop.pendingFeedback.length, 0);
    });
  });

  describe('calibrate', () => {
    it('should call calibrator', () => {
      // Add samples
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        loop.analyzer.addSample({
          judgment: { Q: 70, breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 } },
          actualScore: 75,
        });
      }

      const result = loop.calibrate();

      assert.ok(result);
    });

    it('should record in learning history', () => {
      // Add enough valid samples
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        loop.analyzer.addSample({
          judgment: { Q: 70, breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 } },
          actualScore: 75,
        });
      }

      loop.calibrate();

      assert.ok(loop.learningHistory.some(h => h.type === 'calibration'));
    });
  });

  describe('detectBiases', () => {
    it('should call bias detector', () => {
      const result = loop.detectBiases();

      assert.ok(result.biases !== undefined);
      assert.ok(result.severity);
    });

    it('should record biases in history', () => {
      // Create a bias condition
      for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
        loop.biasDetector.tracking.axiomErrors.PHI.push(30);
      }

      loop.detectBiases();

      assert.ok(loop.learningHistory.some(h => h.type === 'bias_detection'));
    });
  });

  describe('applyLearning', () => {
    it('should apply calibrator weights', () => {
      loop.calibrator.weights.PHI = 1.1;

      const breakdown = { PHI: 70, VERIFY: 80, CULTURE: 60, BURN: 50 };
      const weighted = loop.applyLearning(breakdown);

      assert.strictEqual(weighted.PHI, 77);
    });
  });

  describe('getState', () => {
    it('should return complete state', () => {
      const state = loop.getState();

      assert.ok(state.analyzer);
      assert.ok(state.weights);
      assert.ok(state.biases !== undefined);
      assert.strictEqual(state.pendingFeedback, 0);
    });
  });

  describe('getSummary', () => {
    it('should return summary', () => {
      loop.analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });

      const summary = loop.getSummary();

      assert.strictEqual(summary.totalFeedback, 1);
      assert.ok(summary.accuracy !== undefined);
      assert.ok(summary.activeWeights);
    });
  });

  describe('reset', () => {
    it('should reset all components', () => {
      loop.analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });
      loop.pendingFeedback.push({});
      loop.learningHistory.push({ test: true });

      loop.reset();

      assert.strictEqual(loop.analyzer.samples.length, 0);
      assert.deepStrictEqual(loop.pendingFeedback, []);
      assert.deepStrictEqual(loop.learningHistory, []);
    });
  });

  describe('export/import', () => {
    it('should export full state', () => {
      loop.analyzer.addSample({ judgment: {}, outcome: FeedbackOutcome.CORRECT });

      const exported = loop.export();

      assert.ok(exported.analyzer);
      assert.ok(exported.calibrator);
      assert.ok(exported.biasDetector);
      assert.ok(exported.config);
    });

    it('should import full state', () => {
      const state = {
        analyzer: { samples: [], stats: { total: 5, correct: 3, incorrect: 2, partial: 0, avgScoreError: 0, axiomErrors: {} } },
        calibrator: { weights: { PHI: 1.1, VERIFY: 1.0, CULTURE: 1.0, BURN: 1.0 }, history: [], iterations: 2 },
        learningHistory: [{ type: 'test' }],
        config: { autoCalibrate: false },
      };

      loop.import(state);

      assert.strictEqual(loop.analyzer.stats.total, 5);
      assert.strictEqual(loop.calibrator.weights.PHI, 1.1);
      assert.strictEqual(loop.config.autoCalibrate, false);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Learning Loop Integration', () => {
  it('should complete full learning cycle', () => {
    const loop = new LearningLoop({ autoCalibrate: false });

    // 1. Collect feedback
    for (let i = 0; i < LEARNING_CONSTANTS.MIN_SAMPLES; i++) {
      loop.processFeedback({
        judgment: {
          Q: 65,
          breakdown: { PHI: 60, VERIFY: 70, CULTURE: 65, BURN: 65 },
          confidence: 0.5,
          verdict: 'WAG',
        },
        outcome: i % 3 === 0 ? FeedbackOutcome.INCORRECT : FeedbackOutcome.CORRECT,
        actualScore: 70,
      });
    }

    // 2. Manually calibrate
    const calibration = loop.calibrate();
    assert.ok(calibration.updated);

    // 3. Detect biases
    const biases = loop.detectBiases();
    assert.ok(biases.severity);

    // 4. Check state
    const state = loop.getState();
    assert.ok(state.analyzer.sampleCount >= LEARNING_CONSTANTS.MIN_SAMPLES);

    // 5. Apply learning
    const original = { PHI: 60, VERIFY: 70, CULTURE: 65, BURN: 65 };
    const weighted = loop.applyLearning(original);
    assert.ok(weighted.PHI !== 60 || weighted.VERIFY !== 70); // Some weight applied
  });

  it('should persist and restore state', () => {
    const loop1 = new LearningLoop();

    // Add data
    for (let i = 0; i < 10; i++) {
      loop1.processFeedback({
        judgment: { Q: 70, breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 } },
        outcome: FeedbackOutcome.CORRECT,
      });
    }
    loop1.calibrator.weights.PHI = 1.15;

    // Export
    const exported = loop1.export();

    // Create new loop and import
    const loop2 = new LearningLoop();
    loop2.import(exported);

    // Verify state restored
    assert.strictEqual(loop2.analyzer.samples.length, 10);
    assert.strictEqual(loop2.calibrator.weights.PHI, 1.15);
  });
});
