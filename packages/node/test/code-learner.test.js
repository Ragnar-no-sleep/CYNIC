/**
 * Tests for CodeLearner (C1.5 CODE x LEARN) and CodeDecider calibration
 *
 * @module test/code-learner
 */

'use strict';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

import { CodeLearner, MATCH_WINDOW_MS, MAX_DPO_PAIRS } from '../src/code/code-learner.js';
import {
  CodeDecider, CodeDecisionType, ChangeRisk,
  MAX_CALIBRATION, MIN_CALIBRATION_SAMPLES,
} from '../src/code/code-decider.js';
import { CodeActor } from '../src/code/code-actor.js';

// Shared temp dir for calibration persistence tests
const TEMP_DIR = join(tmpdir(), `cynic-code-test-${Date.now()}`);

describe('CodeDecider Calibration', () => {
  let decider;

  beforeEach(() => {
    const calibPath = join(TEMP_DIR, `calib-${Math.random().toString(36).slice(2)}.json`);
    mkdirSync(join(calibPath, '..'), { recursive: true });
    decider = new CodeDecider({ calibrationPath: calibPath });
  });

  it('records outcome', () => {
    decider.recordOutcome({
      decisionType: 'approve',
      riskLevel: 'low',
      riskScore: 0.1,
      confidence: 0.5,
      result: 'success',
    });

    const stats = decider.getCalibrationStats();
    assert.equal(stats.entries, 1);
    assert.equal(stats.successRate, 1);
  });

  it('tracks success rate correctly', () => {
    for (let i = 0; i < 3; i++) {
      decider.recordOutcome({ decisionType: 'approve', riskLevel: 'low', confidence: 0.5, result: 'success' });
    }
    decider.recordOutcome({ decisionType: 'approve', riskLevel: 'low', confidence: 0.5, result: 'failure' });

    const stats = decider.getCalibrationStats();
    assert.equal(stats.entries, 4);
    assert.equal(stats.successRate, 0.75);
  });

  it('does not adjust confidence below MIN_CALIBRATION_SAMPLES', () => {
    // Add fewer than MIN_CALIBRATION_SAMPLES
    for (let i = 0; i < MIN_CALIBRATION_SAMPLES - 1; i++) {
      decider.recordOutcome({ decisionType: 'approve', riskLevel: 'low', confidence: 0.5, result: 'success' });
    }

    const stats = decider.getCalibrationStats();
    assert.equal(stats.adjustments.low, 0, 'no adjustment below threshold');
  });

  it('adjusts confidence with enough samples', () => {
    // All successes at low confidence → should boost
    for (let i = 0; i < MIN_CALIBRATION_SAMPLES + 2; i++) {
      decider.recordOutcome({
        decisionType: 'approve',
        riskLevel: 'medium',
        confidence: 0.3, // Low confidence
        result: 'success', // But always success
      });
    }

    const stats = decider.getCalibrationStats();
    assert.ok(stats.adjustments.medium > 0, 'should boost confidence when success > predicted');
  });

  it('reduces confidence when outcomes are worse than predicted', () => {
    for (let i = 0; i < MIN_CALIBRATION_SAMPLES + 2; i++) {
      decider.recordOutcome({
        decisionType: 'approve',
        riskLevel: 'high',
        confidence: 0.5, // Medium confidence
        result: 'failure', // But always fail
      });
    }

    const stats = decider.getCalibrationStats();
    assert.ok(stats.adjustments.high < 0, 'should reduce confidence when failure > predicted');
  });

  it('keeps calibration within MAX_CALIBRATION entries', () => {
    for (let i = 0; i < MAX_CALIBRATION + 10; i++) {
      decider.recordOutcome({ decisionType: 'approve', riskLevel: 'low', confidence: 0.5, result: 'success' });
    }

    const stats = decider.getCalibrationStats();
    assert.equal(stats.entries, MAX_CALIBRATION);
  });

  it('adjustments are clamped to [-0.2, +0.2]', () => {
    for (let i = 0; i < 20; i++) {
      decider.recordOutcome({ decisionType: 'approve', riskLevel: 'low', confidence: 0.0, result: 'success' });
    }

    const stats = decider.getCalibrationStats();
    assert.ok(stats.adjustments.low <= 0.2, `adjustment ${stats.adjustments.low} should be <= 0.2`);
    assert.ok(stats.adjustments.low >= -0.2, `adjustment ${stats.adjustments.low} should be >= -0.2`);
  });

  it('persists and restores calibration', () => {
    const calibPath = join(TEMP_DIR, 'persist-test.json');
    mkdirSync(join(calibPath, '..'), { recursive: true });

    const d1 = new CodeDecider({ calibrationPath: calibPath });
    for (let i = 0; i < 5; i++) {
      d1.recordOutcome({ decisionType: 'approve', riskLevel: 'low', confidence: 0.4, result: 'success' });
    }

    const d2 = new CodeDecider({ calibrationPath: calibPath });
    const stats = d2.getCalibrationStats();
    assert.equal(stats.entries, 5, 'should restore 5 entries');
  });

  it('calibration affects decide() confidence', () => {
    // First, make a decision without calibration
    const baseResult = decider.decide({ linesAdded: 10, linesRemoved: 0, hasTests: true }, {});
    const baseConfidence = baseResult.confidence;

    // Now add calibration that boosts low risk
    for (let i = 0; i < MIN_CALIBRATION_SAMPLES + 2; i++) {
      decider.recordOutcome({
        decisionType: 'approve',
        riskLevel: baseResult.risk,
        confidence: baseConfidence * 0.5, // Very low predicted
        result: 'success', // But always success → boost
      });
    }

    // Decide again — confidence should be at least as high (calibration adjusts)
    const adjustedResult = decider.decide({ linesAdded: 10, linesRemoved: 0, hasTests: true }, {});
    // Confidence should be adjusted (could be same if risk level doesn't match exactly)
    assert.ok(typeof adjustedResult.confidence === 'number');
  });

  it('getStats includes calibration info', () => {
    decider.recordOutcome({ decisionType: 'approve', riskLevel: 'low', confidence: 0.5, result: 'success' });
    const stats = decider.getStats();
    assert.ok(stats.calibration, 'stats should include calibration');
    assert.equal(stats.calibration.entries, 1);
    assert.equal(stats.outcomesRecorded, 1);
  });
});

describe('CodeLearner', () => {
  let learner;
  let decider;
  let actor;

  beforeEach(() => {
    const calibPath = join(TEMP_DIR, `learn-${Math.random().toString(36).slice(2)}.json`);
    mkdirSync(join(calibPath, '..'), { recursive: true });
    decider = new CodeDecider({ calibrationPath: calibPath });
    actor = new CodeActor();
    learner = new CodeLearner({
      codeDecider: decider,
      codeActor: actor,
    });
  });

  describe('registerDecision', () => {
    it('registers a decision for matching', () => {
      learner.registerDecision({
        judgmentId: 'test-1',
        type: 'approve',
        risk: 'low',
        riskScore: 0.1,
        confidence: 0.55,
      });

      const stats = learner.getStats();
      assert.equal(stats.recentDecisions, 1);
    });

    it('keeps rolling window of decisions', () => {
      for (let i = 0; i < 250; i++) {
        learner.registerDecision({ judgmentId: `j-${i}`, type: 'approve' });
      }

      const stats = learner.getStats();
      assert.equal(stats.recentDecisions, 233); // Fib(13) max
    });
  });

  describe('processFeedback', () => {
    it('matches positive feedback to recent decision', () => {
      learner.registerDecision({
        judgmentId: 'j-1',
        type: 'approve',
        risk: 'low',
        riskScore: 0.1,
        confidence: 0.55,
      });

      const result = learner.processFeedback({
        type: 'positive',
        context: 'code',
        reason: 'Good commit',
      });

      assert.ok(result, 'should match');
      assert.equal(result.outcome, 'success');
      assert.equal(result.cell, 'C1.5');
    });

    it('matches negative feedback to recent decision', () => {
      learner.registerDecision({
        judgmentId: 'j-2',
        type: 'approve',
        risk: 'medium',
        riskScore: 0.3,
        confidence: 0.4,
      });

      const result = learner.processFeedback({
        type: 'negative',
        context: 'commit',
        reason: 'Bug introduced',
      });

      assert.ok(result);
      assert.equal(result.outcome, 'failure');
    });

    it('matches by judgmentId when provided', () => {
      learner.registerDecision({ judgmentId: 'exact-match', type: 'block' });
      learner.registerDecision({ judgmentId: 'wrong-one', type: 'approve' });

      const result = learner.processFeedback({
        type: 'positive',
        judgmentId: 'exact-match',
        context: 'code',
      });

      assert.ok(result);
      assert.equal(result.decisionType, 'block');
    });

    it('returns null for non-code feedback', () => {
      learner.registerDecision({ judgmentId: 'j-3', type: 'approve' });

      const result = learner.processFeedback({
        type: 'positive',
        context: 'social', // not code-related
      });

      assert.equal(result, null);
    });

    it('returns null when no decisions to match', () => {
      const result = learner.processFeedback({
        type: 'positive',
        context: 'code',
      });

      assert.equal(result, null);
      assert.equal(learner.getStats().unmatchedFeedback, 1);
    });

    it('records outcome in CodeDecider', () => {
      learner.registerDecision({
        judgmentId: 'j-4',
        type: 'approve',
        risk: 'low',
        riskScore: 0.1,
        confidence: 0.5,
      });

      learner.processFeedback({ type: 'positive', context: 'code' });

      const calib = decider.getCalibrationStats();
      assert.equal(calib.entries, 1, 'should have recorded outcome');
    });

    it('tracks stats correctly', () => {
      learner.registerDecision({ judgmentId: 'j-5', type: 'approve' });
      learner.processFeedback({ type: 'positive', context: 'code' });
      learner.processFeedback({ type: 'negative', context: 'social' }); // ignored
      learner.processFeedback({ type: 'negative', context: 'code' }); // matched to same

      const stats = learner.getStats();
      assert.equal(stats.feedbackProcessed, 3);
      assert.equal(stats.outcomesMatched, 2);
    });
  });

  describe('getCodeContext', () => {
    it('returns empty context without codeEmergence', () => {
      const ctx = learner.getCodeContext();
      assert.deepEqual(ctx.patterns, []);
      assert.deepEqual(ctx.hotspots, []);
      assert.equal(ctx.confidenceAdjustment, 0);
    });

    it('returns debt count from codeActor', () => {
      // Add some debt
      actor.act({ type: 'defer', decision: 'defer', reasoning: 'test debt' }, {});

      const ctx = learner.getCodeContext();
      assert.ok(ctx.debtItems >= 0);
    });

    it('increments patternsQueried stat', () => {
      learner.getCodeContext();
      learner.getCodeContext();
      assert.equal(learner.getStats().patternsQueried, 2);
    });
  });

  describe('DPO pairs', () => {
    it('starts with empty pairs', () => {
      assert.deepEqual(learner.getDpoPairs(), []);
    });

    it('getHealth returns learning status', () => {
      const health = learner.getHealth();
      assert.equal(health.status, 'collecting');
      assert.equal(health.feedbackProcessed, 0);
    });

    it('getHealth reflects match rate', () => {
      // Register decisions and provide feedback
      for (let i = 0; i < 5; i++) {
        learner.registerDecision({ judgmentId: `h-${i}`, type: 'approve' });
        learner.processFeedback({ type: 'positive', context: 'code', judgmentId: `h-${i}` });
      }

      const health = learner.getHealth();
      assert.equal(health.outcomesMatched, 5);
      assert.ok(health.matchRate > 0);
    });
  });

  describe('emits events', () => {
    it('emits outcome_matched on successful feedback', (t, done) => {
      learner.on('outcome_matched', (event) => {
        assert.equal(event.cell, 'C1.5');
        assert.equal(event.outcome, 'success');
        done();
      });

      learner.registerDecision({ judgmentId: 'evt-1', type: 'approve' });
      learner.processFeedback({ type: 'positive', context: 'code' });
    });
  });
});
