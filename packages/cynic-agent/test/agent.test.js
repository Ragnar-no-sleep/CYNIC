/**
 * @cynic/agent - Basic Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

import { CynicAgent, createAgent, AgentState, AGENT_CONFIG } from '../src/index.js';
import { Perceiver } from '../src/perceiver.js';
import { Decider, Action, Verdict, Dimensions } from '../src/decider.js';
import { Executor, ExecutionStatus } from '../src/executor.js';
import { Learner, OutcomeType } from '../src/learner.js';

describe('CynicAgent', () => {
  it('should create agent with default config', () => {
    const agent = createAgent({ name: 'test-agent' });

    assert.strictEqual(agent.name, 'test-agent');
    assert.strictEqual(agent.state, AgentState.IDLE);
    assert.strictEqual(agent.isRunning, false);
  });

  it('should have φ-bounded confidence thresholds', () => {
    // Use <= PHI_INV + small epsilon for floating point comparison
    assert.ok(AGENT_CONFIG.maxConfidence <= PHI_INV + 0.001, 'Max confidence should be ≤ φ⁻¹');
    assert.ok(AGENT_CONFIG.minConfidenceToAct > 0.3, 'Min confidence should be > 30%');
  });

  it('should get correct health status', () => {
    const agent = createAgent();
    const health = agent.getHealth();

    // New agent with no actions has PHI_INV score (healthy)
    assert.ok(['healthy', 'degraded'].includes(health.status), 'Status should be healthy or degraded');
    assert.ok(health.score <= PHI_INV + 0.001, 'Health score should be φ-bounded');
  });
});

describe('Perceiver', () => {
  it('should create perceiver', () => {
    const perceiver = new Perceiver();

    assert.strictEqual(perceiver.isRunning, false);
    assert.strictEqual(perceiver.metrics.pollCount, 0);
  });

  it('should get empty status when not started', () => {
    const perceiver = new Perceiver();
    const status = perceiver.getStatus();

    assert.strictEqual(status.isRunning, false);
    assert.strictEqual(status.lastSignal, null);
  });
});

describe('Decider', () => {
  it('should have 25 dimensions', () => {
    const dimensionCount = Object.keys(Dimensions).length;
    assert.strictEqual(dimensionCount, 25, 'Should have exactly 25 judgment dimensions');
  });

  it('should create decider with φ-weighted dimensions', () => {
    const decider = new Decider();
    const status = decider.getStatus();

    assert.strictEqual(status.weights, 25);
  });

  it('should judge opportunity and return verdict', async () => {
    const decider = new Decider();

    const opportunity = {
      id: 'test_opp_1',
      signal: { type: 'volume_surge', data: { changePercent: 0.1 } },
      direction: 'LONG',
      magnitude: 0.1,
      token: 'TestToken',
      mint: 'Test111111111111111111111111111111111111111',
      confidence: 0.5,
    };

    const judgment = await decider.judge(opportunity);

    assert.ok(judgment.qScore >= 0 && judgment.qScore <= 100, 'Q-Score should be 0-100');
    assert.ok(Object.values(Verdict).includes(judgment.verdict), 'Should have valid verdict');
    assert.ok(judgment.confidence <= PHI_INV + 0.001, 'Confidence should be φ-bounded');
  });

  it('should decide action from judgment', async () => {
    const decider = new Decider();

    const mockJudgment = {
      id: 'test_jdg_1',
      qScore: 65,
      verdict: Verdict.BUY,
      confidence: 0.5,
      scores: { [Dimensions.CONTRACT]: 0.7, [Dimensions.LIQUIDITY]: 0.6 },
      opportunity: { token: 'Test', mint: 'Test111' },
    };

    const decision = await decider.decide(mockJudgment);

    assert.ok(Object.values(Action).includes(decision.action), 'Should have valid action');
    assert.ok(decision.confidence <= PHI_INV + 0.001, 'Decision confidence should be φ-bounded');
  });
});

describe('Executor', () => {
  it('should create executor in dry run mode by default', () => {
    const executor = new Executor();

    assert.strictEqual(executor.config.dryRun, true);
    assert.strictEqual(executor.isInitialized, false);
  });

  it('should get correct status', () => {
    const executor = new Executor();
    const status = executor.getStatus();

    assert.strictEqual(status.dryRun, true);
    assert.strictEqual(status.activeExecutions, 0);
  });
});

describe('Learner', () => {
  it('should create learner', () => {
    const learner = new Learner();

    assert.strictEqual(learner.metrics.actionsRecorded, 0);
    assert.strictEqual(learner.metrics.lessonsLearned, 0);
  });

  it('should record action', () => {
    const learner = new Learner();

    const record = learner.recordAction({
      opportunity: { id: 'opp_1' },
      judgment: { id: 'jdg_1', qScore: 60 },
      decision: { id: 'dec_1', action: Action.BUY },
      result: { id: 'res_1', success: true },
    });

    assert.ok(record.id.startsWith('rec_'));
    assert.strictEqual(learner.metrics.actionsRecorded, 1);
  });

  it('should evaluate outcome', async () => {
    const learner = new Learner();

    // Record an action first
    learner.recordAction({
      opportunity: { id: 'opp_1' },
      judgment: { id: 'jdg_1', qScore: 60, confidence: 0.5, verdict: Verdict.BUY, scores: {} },
      decision: { id: 'dec_1', action: Action.BUY },
      result: { id: 'res_1', success: true, simulated: true, simulatedPnL: 0.05 },
    });

    const outcome = await learner.evaluateOutcome({
      id: 'res_1',
      success: true,
      simulated: true,
      simulatedPnL: 0.05,
    });

    assert.ok(outcome.id.startsWith('out_'));
    assert.strictEqual(outcome.outcomeType, OutcomeType.PROFITABLE);
    assert.strictEqual(learner.metrics.outcomesEvaluated, 1);
  });

  it('should have correct outcome types', () => {
    assert.ok(OutcomeType.PROFITABLE);
    assert.ok(OutcomeType.LOSS);
    assert.ok(OutcomeType.BREAKEVEN);
  });
});

describe('Integration', () => {
  it('should run full perceive→judge→decide cycle', async () => {
    const decider = new Decider();

    // 1. Simulate perception
    const perception = {
      id: 'sig_test',
      type: 'volume_surge',
      token: 'IntegrationTest',
      mint: 'Int111111111111111111111111111111111111111',
      data: { changePercent: 0.08, currentVolume: 5000, previousVolume: 2000 },
    };

    // 2. Convert to opportunity
    const opportunity = {
      id: `opp_${perception.id}`,
      signal: perception,
      direction: perception.data.changePercent > 0 ? 'LONG' : 'SHORT',
      magnitude: Math.abs(perception.data.changePercent),
      token: perception.token,
      mint: perception.mint,
      confidence: Math.min(Math.abs(perception.data.changePercent) * 2, PHI_INV),
    };

    // 3. Judge
    const judgment = await decider.judge(opportunity);
    assert.ok(judgment.qScore >= 0);

    // 4. Decide
    const decision = await decider.decide(judgment);
    assert.ok(decision.action);

    // Verify φ-bounds maintained throughout
    assert.ok(judgment.confidence <= PHI_INV + 0.001, 'Judgment confidence should be φ-bounded');
    assert.ok(decision.confidence <= PHI_INV + 0.001, 'Decision confidence should be φ-bounded');
  });
});
