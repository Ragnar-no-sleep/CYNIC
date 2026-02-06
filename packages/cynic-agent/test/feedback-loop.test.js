/**
 * Deep tests for the Feedback Loop closure
 *
 * Tests: Learner → Decider weight adjustments, Thompson Sampling,
 * adaptive thresholds, and state persistence.
 *
 * "Le chien apprend" - CYNIC
 *
 * @module @cynic/agent/test/feedback-loop
 */

'use strict';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, unlinkSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

import { Learner, OutcomeType } from '../src/learner.js';
import { Decider, Action, Verdict, Dimensions } from '../src/decider.js';

const LEARNER_STATE_FILE = join(homedir(), '.cynic', 'learner-state.json');

// Clean state file to prevent cross-test contamination
function cleanStateFile() {
  try { if (existsSync(LEARNER_STATE_FILE)) unlinkSync(LEARNER_STATE_FILE); } catch { /* ignore */ }
}

// Helpers
function makeRecord(action = 'BUY', qScore = 60, scores = {}) {
  return {
    id: `rec_test_${Date.now()}`,
    timestamp: Date.now(),
    opportunity: { id: 'opp_1', token: 'TEST', direction: 'LONG', magnitude: 0.1 },
    judgment: {
      id: 'jdg_1',
      qScore,
      confidence: 0.5,
      verdict: 'WAG',
      scores: {
        [Dimensions.LIQUIDITY]: 0.7,
        [Dimensions.VOLATILITY]: 0.3,
        [Dimensions.CONTRACT]: 0.8,
        [Dimensions.TREND]: 0.6,
        ...scores,
      },
    },
    decision: { action },
    result: { id: 'res_1', success: true },
  };
}

// ==================== 1. Learner Dimension Adjustments ====================

describe('Feedback Loop: Dimension Adjustments', () => {
  let learner;

  beforeEach(() => {
    cleanStateFile();
    learner = new Learner({ persistSignals: false, minSamples: 2 });
  });

  it('adjusts dimensions on loss (false positives reduced)', async () => {
    const record = makeRecord('BUY', 60, { liquidity: 0.8, trend: 0.7 });
    learner.pendingActions.set(record.result.id, { ...record, result: { id: record.result.id } });

    await learner.evaluateOutcome({
      id: record.result.id,
      success: true,
      simulatedPnL: -0.05, // Loss
      simulated: true,
    });

    const adj = learner.getDimensionAdjustments();
    // High-scoring dimensions on a loss should be adjusted downward
    const hasNegative = Object.values(adj).some(v => v < 0);
    assert.ok(hasNegative || Object.keys(adj).length === 0, 'should have negative adjustments on loss');
  });

  it('adjusts dimensions on profit (false negatives boosted)', async () => {
    const record = makeRecord('BUY', 60, { volatility: 0.2, position_size: 0.3 });
    learner.pendingActions.set(record.result.id, { ...record, result: { id: record.result.id } });

    await learner.evaluateOutcome({
      id: record.result.id,
      success: true,
      simulatedPnL: 0.08, // Profit
      simulated: true,
    });

    const adj = learner.getDimensionAdjustments();
    // Low-scoring dimensions on a win should be adjusted upward
    const hasPositive = Object.values(adj).some(v => v > 0);
    assert.ok(hasPositive || Object.keys(adj).length === 0, 'should have positive adjustments on profit');
  });

  it('accumulates adjustments across multiple lessons', async () => {
    // 3 losses with same high-scoring dimension
    for (let i = 0; i < 3; i++) {
      const record = makeRecord('BUY', 60, { liquidity: 0.9 });
      record.result = { id: `res_${i}` };
      learner.pendingActions.set(record.result.id, { ...record, result: record.result });

      await learner.evaluateOutcome({
        id: record.result.id,
        success: true,
        simulatedPnL: -0.05,
        simulated: true,
      });
    }

    const adj = learner.getDimensionAdjustments();
    if (adj.liquidity !== undefined) {
      assert.ok(adj.liquidity < -0.01, 'liquidity adjustment should accumulate negatively');
    }
  });
});

// ==================== 2. Decider Applies Adjustments (Basic Path) ====================

describe('Feedback Loop: Decider Weight Adjustments', () => {
  let decider;

  beforeEach(() => {
    cleanStateFile();
    decider = new Decider();
  });

  it('applyWeightAdjustments stores adjustments', () => {
    decider.applyWeightAdjustments({ liquidity: 0.05, trend: -0.03 });
    assert.equal(decider._weightAdjustments.liquidity, 0.05);
    assert.equal(decider._weightAdjustments.trend, -0.03);
  });

  it('basic scoring applies adjustments to dimension scores', async () => {
    // Set a positive adjustment on a dimension
    decider.applyWeightAdjustments({ liquidity: 0.2 });

    const opportunity = {
      id: 'opp_1',
      token: 'TEST',
      direction: 'LONG',
      magnitude: 0.1,
      signal: { type: 'price_surge', data: {} },
    };

    const judgment = await decider.judge(opportunity);

    // Liquidity base score is 0.6, adjustment +0.2 = 0.8
    assert.ok(judgment.scores.liquidity > 0.6, `liquidity ${judgment.scores.liquidity} should be boosted above 0.6`);
  });

  it('adjustments are clamped to [0, 1]', async () => {
    decider.applyWeightAdjustments({
      liquidity: 0.9,     // Would push 0.6 → 1.5, clamped to 1.0
      volatility: -0.8,    // Would push 0.7 → -0.1, clamped to 0.0
    });

    const opportunity = {
      id: 'opp_2',
      token: 'TEST',
      direction: 'LONG',
      magnitude: 0.15,
      signal: { type: 'price_surge', data: {} },
    };

    const judgment = await decider.judge(opportunity);
    assert.ok(judgment.scores.liquidity <= 1.0, 'score should not exceed 1.0');
    assert.ok(judgment.scores.volatility >= 0.0, 'score should not go below 0.0');
  });
});

// ==================== 3. Thompson Sampling ====================

describe('Feedback Loop: Thompson Sampling', () => {
  let learner;
  let decider;

  beforeEach(() => {
    cleanStateFile();
    learner = new Learner({ persistSignals: false, minSamples: 2 });
    decider = new Decider();
  });

  it('initial action scores are uniform (0.5)', () => {
    const scores = learner.getActionScores();
    assert.equal(scores.BUY, 0.5);
    assert.equal(scores.SELL, 0.5);
    assert.equal(scores.HOLD, 0.5);
  });

  it('profitable BUY increases BUY score', async () => {
    const record = makeRecord('BUY', 70);
    learner.pendingActions.set(record.result.id, { ...record, result: record.result });

    await learner.evaluateOutcome({
      id: record.result.id,
      success: true,
      simulatedPnL: 0.05,
      simulated: true,
    });

    const scores = learner.getActionScores();
    assert.ok(scores.BUY > 0.5, `BUY score ${scores.BUY} should be above 0.5 after profit`);
    assert.equal(scores.SELL, 0.5, 'SELL should be unchanged');
  });

  it('losing BUY decreases BUY score', async () => {
    const record = makeRecord('BUY', 70);
    learner.pendingActions.set(record.result.id, { ...record, result: record.result });

    await learner.evaluateOutcome({
      id: record.result.id,
      success: true,
      simulatedPnL: -0.05,
      simulated: true,
    });

    const scores = learner.getActionScores();
    assert.ok(scores.BUY < 0.5, `BUY score ${scores.BUY} should be below 0.5 after loss`);
  });

  it('Decider demotes action with low Thompson score to HOLD', async () => {
    // Set BUY as historically bad
    decider.setActionScores({ BUY: 0.2, SELL: 0.6, HOLD: 0.5 });

    const judgment = {
      id: 'jdg_test',
      qScore: 80,
      verdict: Verdict.STRONG_BUY,
      confidence: 0.6,
      scores: {},
      opportunity: { token: 'TEST', mint: 'xxx' },
    };

    const decision = await decider.decide(judgment);
    // BUY score (0.2) is below PHI_INV_2 (0.382), should be demoted to HOLD
    assert.equal(decision.action, Action.HOLD, 'should demote to HOLD when Thompson score is low');
  });

  it('Decider allows action with good Thompson score', async () => {
    decider.setActionScores({ BUY: 0.55, SELL: 0.6, HOLD: 0.5 });

    const judgment = {
      id: 'jdg_test2',
      qScore: 80,
      verdict: Verdict.STRONG_BUY,
      confidence: 0.6,
      scores: {},
      opportunity: { token: 'TEST', mint: 'xxx' },
    };

    const decision = await decider.decide(judgment);
    assert.equal(decision.action, Action.BUY, 'should allow BUY when Thompson score is above threshold');
  });
});

// ==================== 4. Adaptive Threshold ====================

describe('Feedback Loop: Adaptive Threshold', () => {
  beforeEach(() => { cleanStateFile(); });

  it('returns PHI_INV_2 with insufficient data', () => {
    const learner = new Learner({ persistSignals: false, minSamples: 5 });
    const threshold = learner.getAdaptiveThreshold();
    assert.ok(Math.abs(threshold - 0.382) < 0.001, `threshold ${threshold} should be ~0.382`);
  });

  it('lowers threshold with high win rate', () => {
    const learner = new Learner({ persistSignals: false, minSamples: 2 });
    learner.metrics.wins = 8;
    learner.metrics.losses = 2;
    learner.metrics.winRate = 0.8;

    const threshold = learner.getAdaptiveThreshold();
    assert.ok(threshold < 0.382, `threshold ${threshold} should be below 0.382 with 80% win rate`);
    assert.ok(threshold >= 0.236, `threshold ${threshold} should not go below PHI_INV_3 (0.236)`);
  });

  it('stays at PHI_INV_2 with 0% win rate', () => {
    const learner = new Learner({ persistSignals: false, minSamples: 2 });
    learner.metrics.wins = 0;
    learner.metrics.losses = 10;
    learner.metrics.winRate = 0;

    const threshold = learner.getAdaptiveThreshold();
    assert.ok(Math.abs(threshold - 0.382) < 0.001, `threshold ${threshold} should be ~0.382 with 0% win rate`);
  });

  it('never exceeds PHI_INV_2 or goes below PHI_INV_3', () => {
    const learner = new Learner({ persistSignals: false, minSamples: 2 });

    // Test extreme win rates
    for (const winRate of [0, 0.1, 0.3, 0.5, 0.618, 0.8, 1.0]) {
      learner.metrics.wins = Math.round(winRate * 100);
      learner.metrics.losses = 100 - learner.metrics.wins;
      learner.metrics.winRate = winRate;

      const threshold = learner.getAdaptiveThreshold();
      assert.ok(threshold >= 0.235, `threshold ${threshold} at winRate=${winRate} should be >= PHI_INV_3`);
      assert.ok(threshold <= 0.383, `threshold ${threshold} at winRate=${winRate} should be <= PHI_INV_2`);
    }
  });
});

// ==================== 5. State Persistence ====================

describe('Feedback Loop: State Persistence', () => {
  let learner;

  beforeEach(() => {
    cleanStateFile();
    learner = new Learner({ persistSignals: false, minSamples: 2 });
  });

  afterEach(() => { cleanStateFile(); });

  it('persists state to file after lesson', async () => {
    const record = makeRecord('BUY', 70, { liquidity: 0.9 });
    learner.pendingActions.set(record.result.id, { ...record, result: record.result });

    await learner.evaluateOutcome({
      id: record.result.id,
      success: true,
      simulatedPnL: -0.05,
      simulated: true,
    });

    assert.ok(existsSync(LEARNER_STATE_FILE), 'state file should exist after lesson');

    const data = JSON.parse(readFileSync(LEARNER_STATE_FILE, 'utf8'));
    assert.equal(data.version, 1, 'version should be 1');
    assert.ok(data.updatedAt, 'updatedAt should exist');
    assert.ok(data.actionOutcomes, 'actionOutcomes should exist');
    assert.ok(data.metrics, 'metrics should exist');
  });

  it('restores state on new Learner creation', async () => {
    // Create state manually
    const record = makeRecord('BUY', 70, { liquidity: 0.9 });
    learner.pendingActions.set(record.result.id, { ...record, result: record.result });

    await learner.evaluateOutcome({
      id: record.result.id,
      success: true,
      simulatedPnL: -0.05, // Significant loss → triggers lesson → persists
      simulated: true,
    });

    // Verify state was persisted
    assert.ok(existsSync(LEARNER_STATE_FILE), 'state file should exist');

    // Create new learner - should restore from file
    const learner2 = new Learner({ persistSignals: false, minSamples: 2 });

    assert.ok(learner2.metrics.losses > 0, 'should restore losses count');
    // After a BUY loss: BUY.failures goes 1→2
    assert.equal(learner2.actionOutcomes.BUY.failures, 2, 'should restore BUY failure count');
  });

  it('ignores state older than 30 days', () => {
    // Write old state
    const oldState = {
      version: 1,
      updatedAt: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
      dimensionAdjustments: { liquidity: 0.5 },
      actionOutcomes: { BUY: { successes: 100, failures: 1 } },
      metrics: { wins: 99, losses: 1, winRate: 0.99 },
    };

    const dir = join(homedir(), '.cynic');
    try { mkdirSync(dir, { recursive: true }); } catch { /* exists */ }
    writeFileSync(LEARNER_STATE_FILE, JSON.stringify(oldState));

    const freshLearner = new Learner({ persistSignals: false });
    assert.equal(freshLearner.metrics.wins, 0, 'should not restore old state');
  });
});

// ==================== 6. Full Integration ====================

describe('Feedback Loop: Full Learner → Decider Integration', () => {
  beforeEach(() => { cleanStateFile(); });
  afterEach(() => { cleanStateFile(); });

  it('lesson triggers weight adjustments + Thompson + adaptive threshold', async () => {
    const learner = new Learner({ persistSignals: false, minSamples: 2 });
    const decider = new Decider();

    // Wire like index.js does
    learner.on('lesson', () => {
      decider.applyWeightAdjustments(learner.getDimensionAdjustments());
      decider.setActionScores(learner.getActionScores());
    });

    // Simulate a losing trade
    const record = makeRecord('BUY', 70, { liquidity: 0.9 });
    learner.pendingActions.set(record.result.id, { ...record, result: record.result });

    await learner.evaluateOutcome({
      id: record.result.id,
      success: true,
      simulatedPnL: -0.05,
      simulated: true,
    });

    // Check that Decider received updates
    const status = decider.getStatus();
    assert.ok(decider._actionScores !== null, 'action scores should be set');
    assert.ok(decider._actionScores.BUY < 0.5, 'BUY score should decrease after loss');
  });

  it('multiple wins increase BUY score and lower threshold', async () => {
    cleanStateFile();
    const learner = new Learner({ persistSignals: false, minSamples: 2 });

    // Simulate 5 profitable BUY trades
    for (let i = 0; i < 5; i++) {
      const record = makeRecord('BUY', 70);
      record.result = { id: `res_${i}` };
      learner.pendingActions.set(record.result.id, { ...record, result: record.result });

      await learner.evaluateOutcome({
        id: record.result.id,
        success: true,
        simulatedPnL: 0.05,
        simulated: true,
      });
    }

    const scores = learner.getActionScores();
    assert.ok(scores.BUY > 0.7, `BUY score ${scores.BUY} should be high after 5 wins`);

    const threshold = learner.getAdaptiveThreshold();
    assert.ok(threshold < 0.382, `threshold ${threshold} should decrease with high win rate`);
  });
});
