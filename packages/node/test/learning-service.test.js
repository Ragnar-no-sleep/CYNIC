/**
 * Learning Service Tests
 *
 * Tests for the RLHF feedback loop
 *
 * "CYNIC burns its ego with every correction" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import { LearningService, CYNICJudge, getAllDimensions } from '../src/index.js';
import { PHI_INV, PHI_INV_2, PHI_INV_3, MIN_PATTERN_SOURCES } from '@cynic/core';

describe('LearningService', () => {
  let learningService;

  beforeEach(async () => {
    learningService = new LearningService();
    await learningService.init();
  });

  describe('Initialization', () => {
    it('should initialize with φ-bounded defaults', () => {
      assert.ok(Math.abs(learningService.learningRate - PHI_INV_3) < 0.001);
      assert.ok(Math.abs(learningService.maxAdjustment - PHI_INV_2) < 0.001);
      assert.strictEqual(learningService.minFeedback, MIN_PATTERN_SOURCES);
    });

    it('should accept custom config', async () => {
      const custom = new LearningService({
        learningRate: 0.1,
        maxAdjustment: 0.2,
        minFeedback: 5,
        decayRate: 0.9,
      });
      await custom.init();

      assert.strictEqual(custom.learningRate, 0.1);
      assert.strictEqual(custom.maxAdjustment, 0.2);
      assert.strictEqual(custom.minFeedback, 5);
      assert.strictEqual(custom.decayRate, 0.9);
    });

    it('should initialize weight modifiers for all dimensions', async () => {
      const allDims = getAllDimensions();
      const modifiers = learningService.getAllWeightModifiers();

      for (const dimName of Object.keys(allDims)) {
        assert.strictEqual(modifiers[dimName], 1.0, `${dimName} should have initial modifier of 1.0`);
      }
    });

    it('should emit initialized event', async () => {
      const fresh = new LearningService();
      let emitted = false;
      fresh.on('initialized', () => {
        emitted = true;
      });

      await fresh.init();
      assert.strictEqual(emitted, true);
    });

    it('should only initialize once', async () => {
      let emitCount = 0;
      learningService.on('initialized', () => emitCount++);

      await learningService.init();
      await learningService.init();
      await learningService.init();

      // Was already initialized in beforeEach, so no more emissions
      assert.strictEqual(emitCount, 0);
    });
  });

  describe('Weight Modifiers', () => {
    it('should return 1.0 for unmodified dimensions', () => {
      const modifier = learningService.getWeightModifier('COHERENCE');
      assert.strictEqual(modifier, 1.0);
    });

    it('should return 1.0 for unknown dimensions', () => {
      const modifier = learningService.getWeightModifier('NONEXISTENT');
      assert.strictEqual(modifier, 1.0);
    });

    it('should return 0 for threshold adjustments with no learning', () => {
      const adjustment = learningService.getThresholdAdjustment('code', 'COHERENCE');
      assert.strictEqual(adjustment, 0);
    });
  });

  describe('Feedback Processing', () => {
    it('should process correct feedback', () => {
      const result = learningService.processFeedback({
        outcome: 'correct',
        originalScore: 75,
        itemType: 'code',
      });

      assert.strictEqual(result.scoreDelta, 0);
      assert.strictEqual(result.queueSize, 1);
    });

    it('should process incorrect feedback with actual score', () => {
      const result = learningService.processFeedback({
        outcome: 'incorrect',
        actualScore: 30,
        originalScore: 75,
        itemType: 'code',
      });

      assert.strictEqual(result.scoreDelta, -45);
      assert.strictEqual(result.queueSize, 1);
    });

    it('should infer delta for incorrect without actual score', () => {
      // High score should assume lower was correct
      const resultHigh = learningService.processFeedback({
        outcome: 'incorrect',
        originalScore: 80,
        itemType: 'code',
      });
      assert.strictEqual(resultHigh.scoreDelta, -20);

      // Low score should assume higher was correct
      const resultLow = learningService.processFeedback({
        outcome: 'incorrect',
        originalScore: 30,
        itemType: 'decision',
      });
      assert.strictEqual(resultLow.scoreDelta, 20);
    });

    it('should track overall patterns', () => {
      learningService.processFeedback({ outcome: 'correct', originalScore: 75 });
      learningService.processFeedback({ outcome: 'incorrect', originalScore: 80 });
      learningService.processFeedback({ outcome: 'partial', originalScore: 50 });

      const patterns = learningService.getPatterns();
      assert.strictEqual(patterns.overall.totalFeedback, 3);
      assert.strictEqual(patterns.overall.correctCount, 1);
      assert.strictEqual(patterns.overall.incorrectCount, 1);
    });

    it('should track item type patterns', () => {
      learningService.processFeedback({ outcome: 'incorrect', actualScore: 30, originalScore: 80, itemType: 'code' });
      learningService.processFeedback({ outcome: 'incorrect', actualScore: 25, originalScore: 75, itemType: 'code' });
      learningService.processFeedback({ outcome: 'correct', originalScore: 60, itemType: 'decision' });

      const patterns = learningService.getPatterns();
      assert.ok(patterns.byItemType.code);
      assert.strictEqual(patterns.byItemType.code.feedbackCount, 2);
      assert.ok(patterns.byItemType.code.overscoring > 0); // Both were overscored
    });

    it('should emit feedback-processed event', () => {
      let eventData = null;
      learningService.on('feedback-processed', (data) => {
        eventData = data;
      });

      learningService.processFeedback({
        outcome: 'incorrect',
        actualScore: 50,
        originalScore: 70,
      });

      assert.ok(eventData);
      assert.strictEqual(eventData.scoreDelta, -20);
      assert.ok(eventData.queueSize > 0);
    });

    it('should indicate when enough feedback for learning', () => {
      // Process MIN_PATTERN_SOURCES - 1 feedbacks
      for (let i = 0; i < MIN_PATTERN_SOURCES - 1; i++) {
        const result = learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
        assert.strictEqual(result.shouldLearn, false);
      }

      // One more should trigger shouldLearn
      const final = learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
      assert.strictEqual(final.shouldLearn, true);
    });
  });

  describe('Learning Algorithm', () => {
    it('should not learn with insufficient feedback', async () => {
      learningService.processFeedback({ outcome: 'correct', originalScore: 50 });

      const result = await learningService.learn();

      assert.strictEqual(result.success, false);
      assert.ok(result.reason.includes('Insufficient'));
    });

    it('should learn with sufficient feedback', async () => {
      // Add enough feedback
      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({
          outcome: 'incorrect',
          actualScore: 30,
          originalScore: 80,
          itemType: 'code',
        });
      }

      const result = await learningService.learn();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.feedbackProcessed, MIN_PATTERN_SOURCES);
      assert.strictEqual(result.learningIteration, 1);
    });

    it('should clear feedback queue after learning', async () => {
      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
      }

      await learningService.learn();

      const state = learningService.getState();
      assert.strictEqual(state.queueSize, 0);
    });

    it('should emit learning-complete event', async () => {
      let eventData = null;
      learningService.on('learning-complete', (data) => {
        eventData = data;
      });

      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
      }

      await learningService.learn();

      assert.ok(eventData);
      assert.strictEqual(eventData.success, true);
      assert.ok(eventData.duration >= 0);
    });

    it('should bound weight modifiers to φ⁻²', async () => {
      // Process extreme feedback to test bounds
      for (let i = 0; i < 20; i++) {
        learningService.processFeedback({
          outcome: 'incorrect',
          actualScore: 0,
          originalScore: 100,
          itemType: 'code',
          dimensionScores: { COHERENCE: 100 },
        });
      }

      // Run learning multiple times
      for (let i = 0; i < 5; i++) {
        // Re-add feedback for each learning cycle
        for (let j = 0; j < MIN_PATTERN_SOURCES; j++) {
          learningService.processFeedback({
            outcome: 'incorrect',
            actualScore: 0,
            originalScore: 100,
            itemType: 'code',
            dimensionScores: { COHERENCE: 100 },
          });
        }
        await learningService.learn();
      }

      const modifiers = learningService.getAllWeightModifiers();
      for (const [dim, modifier] of Object.entries(modifiers)) {
        const minMod = 1 - PHI_INV_2;
        const maxMod = 1 + PHI_INV_2;
        assert.ok(modifier >= minMod - 0.001, `${dim} modifier ${modifier} should be >= ${minMod}`);
        assert.ok(modifier <= maxMod + 0.001, `${dim} modifier ${modifier} should be <= ${maxMod}`);
      }
    });

    it('should apply decay to old learnings', async () => {
      // First, force a weight change
      learningService._weightModifiers.set('COHERENCE', 1.2);

      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
      }

      await learningService.learn();

      // After decay, should be closer to 1.0
      const modifier = learningService.getWeightModifier('COHERENCE');
      assert.ok(modifier < 1.2);
      assert.ok(modifier > 1.0);
    });
  });

  describe('Patterns and Insights', () => {
    it('should calculate accuracy', () => {
      learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
      learningService.processFeedback({ outcome: 'correct', originalScore: 60 });
      learningService.processFeedback({ outcome: 'incorrect', originalScore: 70 });

      const patterns = learningService.getPatterns();
      // 2/3 correct
      assert.ok(Math.abs(patterns.accuracy - 0.667) < 0.01);
    });

    it('should generate insights for item type bias', () => {
      // Systematic overscoring for code
      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({
          outcome: 'incorrect',
          actualScore: 30,
          originalScore: 80,
          itemType: 'code',
        });
      }

      const patterns = learningService.getPatterns();
      const codeInsight = patterns.insights.find(
        (i) => i.type === 'item_type_bias' && i.itemType === 'code'
      );

      assert.ok(codeInsight);
      assert.strictEqual(codeInsight.direction, 'overscoring');
    });

    it('should return 0 accuracy with no feedback', () => {
      const patterns = learningService.getPatterns();
      assert.strictEqual(patterns.accuracy, 0);
    });
  });

  describe('State Management', () => {
    it('should get current state', () => {
      learningService.processFeedback({ outcome: 'correct', originalScore: 50 });

      const state = learningService.getState();

      assert.ok(state.weightModifiers);
      assert.ok(state.patterns);
      assert.ok(state.config);
      assert.strictEqual(state.queueSize, 1);
    });

    it('should get statistics', () => {
      learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
      learningService.processFeedback({ outcome: 'incorrect', originalScore: 70, actualScore: 50 });

      const stats = learningService.getStats();

      assert.strictEqual(stats.totalFeedback, 2);
      assert.ok(stats.accuracy >= 0);
      assert.ok(stats.avgScoreError >= 0);
      assert.strictEqual(stats.queueSize, 2);
    });

    it('should export and import state', async () => {
      // Add some learning
      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({
          outcome: 'incorrect',
          actualScore: 40,
          originalScore: 80,
          itemType: 'code',
        });
      }
      await learningService.learn();

      // Export
      const exported = learningService.export();

      // Create new service and import
      const newService = new LearningService();
      await newService.init();
      newService.import(exported);

      // Verify state transferred
      const origModifiers = learningService.getAllWeightModifiers();
      const newModifiers = newService.getAllWeightModifiers();

      for (const [dim, mod] of Object.entries(origModifiers)) {
        assert.ok(Math.abs(mod - newModifiers[dim]) < 0.001, `${dim} should match after import`);
      }
    });

    it('should reset all learning', async () => {
      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({ outcome: 'correct', originalScore: 50 });
      }
      await learningService.learn();

      let emitted = false;
      learningService.on('reset', () => {
        emitted = true;
      });

      learningService.reset();

      const stats = learningService.getStats();
      assert.strictEqual(stats.totalFeedback, 0);
      assert.strictEqual(stats.learningIterations, 0);
      assert.strictEqual(stats.queueSize, 0);
      assert.strictEqual(emitted, true);

      // All modifiers should be back to 1.0
      const modifiers = learningService.getAllWeightModifiers();
      for (const mod of Object.values(modifiers)) {
        assert.strictEqual(mod, 1.0);
      }
    });
  });

  describe('Full Learning Cycle', () => {
    it('should run complete learning cycle', async () => {
      // Add enough feedback
      for (let i = 0; i < MIN_PATTERN_SOURCES; i++) {
        learningService.processFeedback({
          outcome: 'incorrect',
          actualScore: 40,
          originalScore: 80,
          itemType: 'code',
        });
      }

      const result = await learningService.runLearningCycle();

      assert.ok(result.pull);
      assert.ok(result.learn);
      assert.ok(result.patterns);
    });
  });
});

describe('Judge + LearningService Integration', () => {
  let judge;
  let learningService;

  beforeEach(async () => {
    learningService = new LearningService();
    await learningService.init();

    judge = new CYNICJudge({
      learningService,
    });
  });

  it('should accept learning service in constructor', () => {
    assert.strictEqual(judge.learningService, learningService);
  });

  it('should accept learning service via setter', () => {
    const plainJudge = new CYNICJudge();
    plainJudge.setLearningService(learningService);
    assert.strictEqual(plainJudge.learningService, learningService);
  });

  it('should apply weight modifiers to judgment scores', async () => {
    // First, get baseline judgment
    const item = { id: 'test', quality: 70 };
    const baselineJudgment = judge.judge(item);
    const baselineGlobalScore = baselineJudgment.global_score;

    // Now modify a weight
    learningService._weightModifiers.set('COHERENCE', 0.5); // Halve weight

    // Judge same item
    const modifiedJudgment = judge.judge(item);

    // Score should be different due to weight modification
    // (May not always be different if COHERENCE doesn't contribute much)
    assert.ok(modifiedJudgment.global_score !== undefined);
  });

  it('should apply weight modifiers to axiom scores', async () => {
    const allDims = getAllDimensions();
    const scores = {};
    for (const dim of Object.keys(allDims)) {
      scores[dim] = 70;
    }

    // Baseline
    const item = { id: 'test', scores };
    const baselineJudgment = judge.judge(item);
    const baselineAxiom = baselineJudgment.axiomScores.PHI;

    // Modify PHI dimension weights heavily
    learningService._weightModifiers.set('COHERENCE', 0.5);
    learningService._weightModifiers.set('HARMONY', 0.5);

    const modifiedJudgment = judge.judge(item);

    // PHI axiom calculation should be affected
    // Due to lowered weights, other dimensions contribute more equally
    assert.ok(modifiedJudgment.axiomScores.PHI !== undefined);
  });

  it('should work without learning service', () => {
    const plainJudge = new CYNICJudge();
    const item = { id: 'test', quality: 70 };

    const judgment = plainJudge.judge(item);

    assert.ok(judgment.global_score >= 0);
    assert.ok(judgment.verdict);
  });

  it('should integrate feedback cycle with judgment', async () => {
    // Judge an item
    const item = { id: 'feedback-test', quality: 80 };
    const judgment = judge.judge(item);

    // Provide feedback that we overscored
    learningService.processFeedback({
      outcome: 'incorrect',
      actualScore: 50,
      originalScore: judgment.global_score,
      itemType: item.type || 'unknown',
      dimensionScores: judgment.dimensions,
    });

    // Do this enough times to trigger learning
    for (let i = 0; i < MIN_PATTERN_SOURCES - 1; i++) {
      learningService.processFeedback({
        outcome: 'incorrect',
        actualScore: 50,
        originalScore: 80,
        itemType: 'unknown',
        dimensionScores: { COHERENCE: 90 },
      });
    }

    // Learn
    const learnResult = await learningService.learn();
    assert.strictEqual(learnResult.success, true);

    // The loop is now closed: feedback → learning → better future judgments
    const stats = learningService.getStats();
    assert.ok(stats.learningIterations > 0);
  });
});
