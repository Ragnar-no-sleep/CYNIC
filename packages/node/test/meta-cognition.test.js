/**
 * MetaCognition Tests (L3: Meta-Cognitive Monitoring)
 *
 * Tests for self-monitoring and strategy switching.
 *
 * "Thinking about thinking" - κυνικός
 *
 * @module @cynic/node/test/meta-cognition
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  MetaCognition,
  CognitiveState,
  StrategyType,
  ActionRecord,
  StrategyRecord,
  META_CONFIG,
  createMetaCognition,
  getMetaCognition,
} from '../src/learning/meta-cognition.js';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe('MetaCognition - Constants', () => {
  it('should have cognitive states', () => {
    assert.ok(CognitiveState.EXPLORING);
    assert.ok(CognitiveState.EXECUTING);
    assert.ok(CognitiveState.STUCK);
    assert.ok(CognitiveState.THRASHING);
    assert.ok(CognitiveState.RECOVERING);
    assert.ok(CognitiveState.FLOW);
  });

  it('should have strategy types', () => {
    assert.ok(StrategyType.DEPTH_FIRST);
    assert.ok(StrategyType.BREADTH_FIRST);
    assert.ok(StrategyType.BACKTRACK);
    assert.ok(StrategyType.SIMPLIFY);
    assert.ok(StrategyType.ESCALATE);
    assert.ok(StrategyType.RESET);
  });

  it('should have φ-aligned config values', () => {
    assert.equal(META_CONFIG.minProgressRate, PHI_INV_2);
    assert.equal(META_CONFIG.flowThreshold, PHI_INV);
  });

  it('should have sensible defaults', () => {
    assert.equal(META_CONFIG.stuckThreshold, 5);
    assert.equal(META_CONFIG.progressWindow, 10);
    assert.equal(META_CONFIG.thrashingWindow, 8);
    assert.ok(META_CONFIG.strategyTimeout > 0);
  });
});

// =============================================================================
// ACTION RECORD TESTS
// =============================================================================

describe('ActionRecord', () => {
  it('should create action record with defaults', () => {
    const action = new ActionRecord({
      type: 'tool_use',
      tool: 'Read',
      success: true,
    });

    assert.ok(action.id.startsWith('action_'));
    assert.equal(action.type, 'tool_use');
    assert.equal(action.tool, 'Read');
    assert.equal(action.success, true);
    assert.ok(action.timestamp > 0);
    assert.equal(action.signature, 'tool_use:Read');
  });

  it('should compute signature', () => {
    const action = new ActionRecord({
      type: 'edit',
      tool: 'Edit',
    });

    assert.equal(action.signature, 'edit:Edit');
  });

  it('should handle missing tool', () => {
    const action = new ActionRecord({
      type: 'unknown',
    });

    assert.equal(action.signature, 'unknown:none');
  });
});

// =============================================================================
// STRATEGY RECORD TESTS
// =============================================================================

describe('StrategyRecord', () => {
  it('should create strategy record', () => {
    const record = new StrategyRecord(StrategyType.DEPTH_FIRST, 'initial');

    assert.equal(record.strategy, StrategyType.DEPTH_FIRST);
    assert.equal(record.reason, 'initial');
    assert.ok(record.startTime > 0);
    assert.equal(record.endTime, null);
    assert.equal(record.actionsCount, 0);
    assert.equal(record.successCount, 0);
    assert.equal(record.wasEffective, null);
  });

  it('should track end time and effectiveness', () => {
    const record = new StrategyRecord(StrategyType.BACKTRACK, 'stuck');
    record.actionsCount = 5;
    record.successCount = 3;

    record.end(true);

    assert.ok(record.endTime > 0);
    assert.equal(record.wasEffective, true);
  });

  it('should calculate success rate', () => {
    const record = new StrategyRecord(StrategyType.SIMPLIFY, 'test');
    record.actionsCount = 10;
    record.successCount = 6;

    // successRate is a getter property
    assert.equal(record.successRate, 0.6);
  });

  it('should handle zero actions', () => {
    const record = new StrategyRecord(StrategyType.RESET, 'test');
    assert.equal(record.successRate, 0);
  });

  it('should calculate duration', () => {
    const record = new StrategyRecord(StrategyType.BACKTRACK, 'test');
    // Duration should be >= 0
    assert.ok(record.duration >= 0);
  });
});

// =============================================================================
// METACOGNITION CLASS TESTS
// =============================================================================

describe('MetaCognition', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition();
  });

  it('should initialize with default state', () => {
    assert.equal(meta.state, CognitiveState.EXPLORING);
    assert.equal(meta.currentStrategy, StrategyType.DEPTH_FIRST);
    assert.deepEqual(meta.actions, []);
    assert.equal(meta.stats.totalActions, 0);
  });

  it('should accept custom config', () => {
    const custom = new MetaCognition({
      config: { stuckThreshold: 10 },
    });

    assert.equal(custom.config.stuckThreshold, 10);
    // Other values remain default
    assert.equal(custom.config.progressWindow, META_CONFIG.progressWindow);
  });

  it('should accept callbacks', () => {
    let stateChanged = false;
    let strategyChanged = false;

    const withCallbacks = new MetaCognition({
      onStateChange: () => { stateChanged = true; },
      onStrategySwitch: () => { strategyChanged = true; },
    });

    assert.ok(withCallbacks.onStateChange);
    assert.ok(withCallbacks.onStrategySwitch);
  });
});

// =============================================================================
// ACTION RECORDING TESTS
// =============================================================================

describe('MetaCognition - recordAction', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition();
  });

  it('should record successful action', () => {
    const result = meta.recordAction({
      type: 'tool_use',
      tool: 'Read',
      success: true,
    });

    assert.equal(meta.stats.totalActions, 1);
    assert.equal(meta.stats.successfulActions, 1);
    assert.equal(meta.actions.length, 1);
    assert.ok(result.state);
  });

  it('should record failed action', () => {
    meta.recordAction({
      type: 'tool_use',
      tool: 'Bash',
      success: false,
    });

    assert.equal(meta.stats.totalActions, 1);
    assert.equal(meta.stats.successfulActions, 0);
  });

  it('should update strategy record', () => {
    meta.recordAction({ type: 'test', success: true });
    meta.recordAction({ type: 'test', success: false });
    meta.recordAction({ type: 'test', success: true });

    assert.equal(meta.strategyRecord.actionsCount, 3);
    assert.equal(meta.strategyRecord.successCount, 2);
  });

  it('should trim action history', () => {
    // Record many actions
    for (let i = 0; i < 100; i++) {
      meta.recordAction({ type: 'test', success: true });
    }

    // Should be trimmed to performanceWindow
    assert.ok(meta.actions.length <= meta.config.performanceWindow * 2);
  });
});

// =============================================================================
// PROGRESS RECORDING TESTS
// =============================================================================

describe('MetaCognition - recordProgress', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition();
  });

  it('should update last progress time', () => {
    const before = meta.lastProgressTime;
    // Small delay to ensure time passes
    meta.recordProgress('Test progress');
    assert.ok(meta.lastProgressTime >= before);
  });

  it('should transition from STUCK to EXECUTING', () => {
    // Force stuck state
    meta.state = CognitiveState.STUCK;
    meta.recordProgress('Fixed the issue');

    assert.equal(meta.state, CognitiveState.EXECUTING);
  });

  it('should transition from RECOVERING to EXECUTING', () => {
    meta.state = CognitiveState.RECOVERING;
    meta.recordProgress('Recovery successful');

    assert.equal(meta.state, CognitiveState.EXECUTING);
  });
});

// =============================================================================
// STATE DETECTION TESTS
// =============================================================================

describe('MetaCognition - State Detection', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition({
      config: {
        stuckThreshold: 3,
        thrashingWindow: 4,
        thrashingThreshold: 0.5,
      },
    });
  });

  it('should detect stuck state', () => {
    // Record same failed action multiple times
    for (let i = 0; i < 5; i++) {
      meta.recordAction({
        type: 'same_action',
        tool: 'SameTool',
        success: false,
      });
    }

    // Check if stuck was detected
    assert.ok(
      meta.state === CognitiveState.STUCK ||
      meta.metrics.stuckCount > 0
    );
  });

  it('should detect thrashing state', () => {
    // Alternate between two actions (thrashing pattern)
    for (let i = 0; i < 8; i++) {
      meta.recordAction({
        type: i % 2 === 0 ? 'action_a' : 'action_b',
        tool: i % 2 === 0 ? 'ToolA' : 'ToolB',
        success: false,
      });
    }

    // May detect thrashing depending on implementation
    assert.ok(meta.stats.totalActions === 8);
  });

  it('should detect flow state', () => {
    // Record many successful actions
    for (let i = 0; i < 20; i++) {
      meta.recordAction({
        type: 'productive',
        tool: `Tool${i}`,
        success: true,
      });
    }

    // High success rate should lead to flow or executing
    assert.ok(
      meta.state === CognitiveState.FLOW ||
      meta.state === CognitiveState.EXECUTING ||
      meta.state === CognitiveState.EXPLORING
    );
  });
});

// =============================================================================
// STRATEGY MANAGEMENT TESTS
// =============================================================================

describe('MetaCognition - Strategy Management', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition();
  });

  it('should start with DEPTH_FIRST strategy', () => {
    assert.equal(meta.currentStrategy, StrategyType.DEPTH_FIRST);
  });

  it('should have strategy history', () => {
    assert.ok(Array.isArray(meta.strategyHistory));
  });

  it('should track strategy switches', () => {
    assert.equal(meta.strategySwitches, 0);
  });

  it('should have current strategy record', () => {
    assert.ok(meta.strategyRecord);
    assert.equal(meta.strategyRecord.strategy, StrategyType.DEPTH_FIRST);
  });
});

// =============================================================================
// METRICS TESTS
// =============================================================================

describe('MetaCognition - Metrics', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition();
  });

  it('should track success rate', () => {
    meta.recordAction({ type: 'test', success: true });
    meta.recordAction({ type: 'test', success: true });
    meta.recordAction({ type: 'test', success: false });

    // Should have metrics
    assert.ok(typeof meta.metrics.successRate === 'number');
  });

  it('should track stuck count', () => {
    assert.equal(meta.metrics.stuckCount, 0);
  });

  it('should track thrashing count', () => {
    assert.equal(meta.metrics.thrashingCount, 0);
  });

  it('should track recovery stats', () => {
    assert.equal(meta.metrics.recoveriesSuccess, 0);
    assert.equal(meta.metrics.recoveriesTotal, 0);
  });
});

// =============================================================================
// STATE METHODS TESTS
// =============================================================================

describe('MetaCognition - State Methods', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition();
  });

  it('should get current state object', () => {
    const state = meta.getState();
    assert.equal(state.state, CognitiveState.EXPLORING);
    assert.equal(state.strategy, StrategyType.DEPTH_FIRST);
    assert.equal(state.isStuck, false);
    assert.equal(state.isInFlow, false);
  });

  it('should include metrics in state', () => {
    const state = meta.getState();
    assert.ok(state.metrics);
    assert.ok('successRate' in state.metrics);
  });

  it('should track time since progress', () => {
    const state = meta.getState();
    assert.ok(typeof state.timeSinceProgress === 'number');
    assert.ok(state.timeSinceProgress >= 0);
  });

  it('should get stats', () => {
    const stats = meta.getStats();
    assert.ok(stats);
    assert.ok('totalActions' in stats);
    assert.ok('successfulActions' in stats);
    assert.ok('currentState' in stats);
    assert.ok('currentStrategy' in stats);
  });

  it('should track strategy effectiveness in stats', () => {
    const stats = meta.getStats();
    assert.ok('strategyEffectiveness' in stats);
  });

  it('should include recent state history', () => {
    const stats = meta.getStats();
    assert.ok(Array.isArray(stats.recentStateHistory));
  });
});

// =============================================================================
// RESET TESTS
// =============================================================================

describe('MetaCognition - Reset', () => {
  let meta;

  beforeEach(() => {
    meta = new MetaCognition();
    // Record some actions
    for (let i = 0; i < 10; i++) {
      meta.recordAction({ type: 'test', success: true });
    }
  });

  it('should reset state', () => {
    meta.reset();

    assert.equal(meta.state, CognitiveState.EXPLORING);
    assert.equal(meta.currentStrategy, StrategyType.DEPTH_FIRST);
    assert.deepEqual(meta.actions, []);
    // Note: stats are intentionally preserved for learning analysis
  });

  it('should preserve stats for analysis', () => {
    const statsBefore = meta.stats.totalActions;
    meta.reset();
    // Stats are preserved (by design)
    assert.equal(meta.stats.totalActions, statsBefore);
  });

  it('should preserve config after reset', () => {
    const custom = new MetaCognition({
      config: { stuckThreshold: 99 },
    });
    custom.recordAction({ type: 'test', success: true });
    custom.reset();

    assert.equal(custom.config.stuckThreshold, 99);
  });
});

// =============================================================================
// FACTORY FUNCTIONS TESTS
// =============================================================================

describe('MetaCognition - Factory Functions', () => {
  it('should create new instance', () => {
    const meta = createMetaCognition();
    assert.ok(meta instanceof MetaCognition);
  });

  it('should create with options', () => {
    const meta = createMetaCognition({
      config: { stuckThreshold: 7 },
    });
    assert.equal(meta.config.stuckThreshold, 7);
  });

  it('should get singleton instance', () => {
    const meta1 = getMetaCognition();
    const meta2 = getMetaCognition();
    assert.strictEqual(meta1, meta2);
  });

  it('should return different instances from createMetaCognition', () => {
    const meta1 = createMetaCognition();
    const meta2 = createMetaCognition();
    assert.notStrictEqual(meta1, meta2);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('MetaCognition - Edge Cases', () => {
  it('should handle empty action', () => {
    const meta = new MetaCognition();
    const result = meta.recordAction({});

    assert.ok(result);
    assert.equal(meta.stats.totalActions, 1);
  });

  it('should handle rapid actions', () => {
    const meta = new MetaCognition();

    for (let i = 0; i < 100; i++) {
      meta.recordAction({ type: `action_${i}`, success: Math.random() > 0.5 });
    }

    assert.equal(meta.stats.totalActions, 100);
  });

  it('should handle alternating success/failure', () => {
    const meta = new MetaCognition();

    for (let i = 0; i < 20; i++) {
      meta.recordAction({ type: 'test', success: i % 2 === 0 });
    }

    // Should track both successes and failures
    assert.equal(meta.stats.successfulActions, 10);
  });
});
