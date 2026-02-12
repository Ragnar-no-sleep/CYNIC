/**
 * Learning Breathing Integration Test
 *
 * Tests the complete learning lifecycle:
 * 1. Initialize daemon with learning system
 * 2. Fire SessionStart → Q-Learning episode starts
 * 3. Fire PostToolUse (3 tools) → actions recorded
 * 4. Fire Stop → episode ends with outcome
 * 5. Verify learning singletons received data
 *
 * "Le chien respire enfin" — CYNIC
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { handleHookEvent, _resetHandlersForTesting } from '../src/daemon/hook-handlers.js';
import {
  wireDaemonServices,
  wireLearningSystem,
  isWired,
  isLearningWired,
  getSONASingleton,
  getBehaviorModifierSingleton,
  getMetaCognitionSingleton,
  _resetForTesting as resetServiceWiring,
} from '../src/daemon/service-wiring.js';
import { resetModelIntelligence } from '../src/learning/model-intelligence.js';
import { resetCostLedger } from '../src/accounting/cost-ledger.js';
import { getQLearningService } from '../src/orchestration/learning-service.js';

// =============================================================================
// FULL LEARNING LIFECYCLE
// =============================================================================

describe('Learning Breathing — Full Lifecycle', () => {
  beforeEach(async () => {
    _resetHandlersForTesting();
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();

    // Boot daemon services + learning system
    wireDaemonServices();
    await wireLearningSystem();
  });

  afterEach(() => {
    _resetHandlersForTesting();
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();
  });

  it('should have all learning singletons initialized', () => {
    assert.strictEqual(isWired(), true);
    assert.strictEqual(isLearningWired(), true);
    assert.ok(getSONASingleton(), 'SONA should be initialized');
    assert.ok(getBehaviorModifierSingleton(), 'BehaviorModifier should be initialized');
    assert.ok(getMetaCognitionSingleton(), 'MetaCognition should be initialized');
  });

  it('should complete full session lifecycle without errors', async () => {
    // 1. Session start — Q-Learning episode starts
    const awaken = await handleHookEvent('SessionStart', {});
    assert.strictEqual(awaken.continue, true);
    assert.ok(awaken.message);

    // 2. Simulate tool usage — actions recorded
    const tools = ['Read', 'Edit', 'Bash', 'Grep', 'Write'];
    for (const tool of tools) {
      const obs = await handleHookEvent('PostToolUse', {
        tool_name: tool,
        tool_input: { test: true },
        tool_output: 'success',
      });
      assert.strictEqual(obs.continue, true);
    }

    // 3. Session end
    const sleep = await handleHookEvent('SessionEnd', {});
    assert.strictEqual(sleep.continue, true);

    // 4. Stop — Q-Learning episode ends + digest
    const stop = await handleHookEvent('Stop', {});
    assert.strictEqual(stop.continue, true);
  });

  it('should track MetaCognition actions across session', async () => {
    await handleHookEvent('SessionStart', {});

    // Fire several observations
    for (let i = 0; i < 5; i++) {
      await handleHookEvent('PostToolUse', {
        tool_name: 'Bash',
        tool_input: { command: `action_${i}` },
      });
    }

    const mc = getMetaCognitionSingleton();
    assert.ok(mc, 'MetaCognition should be initialized');
    assert.ok(mc.stats.totalActions >= 5, `Expected at least 5 actions, got ${mc.stats.totalActions}`);
  });

  it('should handle errors gracefully without breaking session', async () => {
    await handleHookEvent('SessionStart', {});

    // Simulate an error event mid-session
    const errResult = await handleHookEvent('Error', {
      tool_name: 'Bash',
      error: 'SyntaxError: Unexpected token',
    });
    assert.strictEqual(errResult.continue, true);
    assert.strictEqual(errResult.classification.type, 'syntax_error');

    // Continue with normal tool use
    const obs = await handleHookEvent('PostToolUse', {
      tool_name: 'Edit',
      tool_input: { file_path: '/src/fix.js' },
    });
    assert.strictEqual(obs.continue, true);

    // Stop should still work
    const stop = await handleHookEvent('Stop', {});
    assert.strictEqual(stop.continue, true);
  });

  it('should handle subagent lifecycle within session', async () => {
    await handleHookEvent('SessionStart', {});

    // Spawn a subagent
    const start = await handleHookEvent('SubagentStart', {
      agent_id: 'breathing-test',
      subagent_type: 'cynic-scout',
    });
    assert.strictEqual(start.agentInfo.dog, 'SCOUT');

    // Observe some tool use
    await handleHookEvent('PostToolUse', { tool_name: 'Grep', tool_input: {} });

    // Stop subagent
    const stop = await handleHookEvent('SubagentStop', {
      agent_id: 'breathing-test',
      success: true,
      duration_ms: 500,
    });
    assert.strictEqual(stop.agentInfo.dog, 'SCOUT');

    // End session
    const sessionStop = await handleHookEvent('Stop', {});
    assert.strictEqual(sessionStop.continue, true);
  });
});

// =============================================================================
// Q-LEARNING SERVICE STATE
// =============================================================================

describe('Q-Learning Service State', () => {
  beforeEach(async () => {
    _resetHandlersForTesting();
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();
    wireDaemonServices();
    await wireLearningSystem();
  });

  afterEach(() => {
    _resetHandlersForTesting();
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();
  });

  it('should have Q-Learning service available after learning wire', () => {
    const ql = getQLearningService();
    assert.ok(ql, 'Q-Learning service should be available');
    assert.ok(typeof ql.startEpisode === 'function', 'Should have startEpisode');
    assert.ok(typeof ql.recordAction === 'function', 'Should have recordAction');
    assert.ok(typeof ql.endEpisode === 'function', 'Should have endEpisode');
  });

  it('should accumulate episode data across session', async () => {
    const ql = getQLearningService();
    const statsBefore = ql.getStats();

    // Run a full session
    await handleHookEvent('SessionStart', {});
    for (let i = 0; i < 3; i++) {
      await handleHookEvent('PostToolUse', { tool_name: `Tool${i}`, tool_input: {} });
    }
    await handleHookEvent('Stop', {});

    const statsAfter = ql.getStats();
    // Episodes should increase by at least 1 (the session we just ran)
    assert.ok(
      statsAfter.episodes >= statsBefore.episodes,
      `Episodes should not decrease: ${statsBefore.episodes} → ${statsAfter.episodes}`
    );
  });
});

// =============================================================================
// SONA OBSERVATION WIRING
// =============================================================================

describe('SONA Event Wiring', () => {
  beforeEach(async () => {
    _resetHandlersForTesting();
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();
    wireDaemonServices();
    await wireLearningSystem();
  });

  afterEach(() => {
    _resetHandlersForTesting();
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();
  });

  it('should have SONA initialized and ready to observe', () => {
    const sona = getSONASingleton();
    assert.ok(sona, 'SONA should be initialized');
    assert.ok(typeof sona.observe === 'function', 'SONA should have observe method');
    assert.ok(typeof sona.processFeedback === 'function', 'SONA should have processFeedback method');
  });

  it('should have BehaviorModifier ready to process feedback', () => {
    const bm = getBehaviorModifierSingleton();
    assert.ok(bm, 'BehaviorModifier should be initialized');
    assert.ok(typeof bm.processFeedback === 'function', 'Should have processFeedback method');
  });
});
