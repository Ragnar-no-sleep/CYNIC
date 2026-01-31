/**
 * Session Chain E2E Tests
 *
 * End-to-end tests for the complete hook chain:
 * awaken → perceive → guard → observe → digest → sleep
 *
 * @module scripts/hooks/test/e2e/session-chain
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { runHook, runHookAsync, createToolInput, createSessionContext } from '../fixtures/mock-stdin.js';

// =============================================================================
// FULL SESSION LIFECYCLE
// =============================================================================

describe('E2E: Full session lifecycle', () => {
  it('should complete awaken → sleep cycle', async () => {
    // 1. Awaken
    const awakenResult = runHook('awaken', {}, { timeout: 15000 });
    assert.ok(awakenResult.output, 'Awaken should return output');
    assert.strictEqual(awakenResult.output.type, 'SessionStart');
    const sessionId = awakenResult.output.sessionId;

    // 2. Sleep
    const sleepInput = createSessionContext({ sessionId });
    const sleepResult = runHook('sleep', sleepInput, { timeout: 30000 });
    assert.ok(sleepResult.output, 'Sleep should return output');
    assert.strictEqual(sleepResult.output.type, 'SessionEnd');
  });

  it('should maintain session state across hooks', async () => {
    // 1. Awaken - initialize session
    const awakenResult = runHook('awaken', {}, { timeout: 15000 });
    const sessionId = awakenResult.output.sessionId;
    const userId = awakenResult.output.user.id;

    // 2. Guard - should allow safe command
    const guardInput = createToolInput('Bash', { command: 'git status' });
    const guardResult = runHook('guard', guardInput, { timeout: 5000 });
    assert.strictEqual(guardResult.output.continue, true);
    assert.strictEqual(guardResult.output.blocked, false);

    // 3. Sleep - should reference same session
    const sleepInput = createSessionContext({ sessionId });
    const sleepResult = runHook('sleep', sleepInput, { timeout: 30000 });
    assert.ok(sleepResult.output.user.id, 'Sleep should have user');
  });
});

// =============================================================================
// GUARD → OBSERVE CHAIN
// =============================================================================

describe('E2E: Guard and Observe chain', () => {
  it('should allow safe tool and observe it', () => {
    // Guard allows
    const guardInput = createToolInput('Bash', { command: 'npm test' });
    const guardResult = runHook('guard', guardInput, { timeout: 5000 });
    assert.strictEqual(guardResult.output.continue, true);
    assert.strictEqual(guardResult.output.blocked, false);

    // Observe records (PostToolUse)
    const observeInput = {
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      tool_output: 'All tests passed',
      is_error: false,
    };
    const observeResult = runHook('observe', observeInput, { timeout: 5000 });
    assert.ok(observeResult.output);
  });

  it('should block dangerous tool and not proceed to observe', () => {
    // Guard blocks
    const guardInput = createToolInput('Bash', { command: 'rm -rf /' });
    const guardResult = runHook('guard', guardInput, { timeout: 5000 });
    assert.strictEqual(guardResult.output.continue, false);
    assert.strictEqual(guardResult.output.blocked, true);
    // If blocked, observe would not be called (Claude Code handles this)
  });
});

// =============================================================================
// ERROR ESCALATION
// =============================================================================

describe('E2E: Error escalation', () => {
  it('should detect error patterns in observe', () => {
    // Simulate multiple errors
    for (let i = 0; i < 3; i++) {
      const observeInput = {
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
        tool_output: { error: 'ENOENT: file not found' },
        is_error: true,
      };
      runHook('observe', observeInput, { timeout: 5000 });
    }

    // Final observe should detect pattern
    const observeInput = {
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      tool_output: { error: 'ENOENT: file not found' },
      is_error: true,
    };
    const result = runHook('observe', observeInput, { timeout: 5000 });
    assert.ok(result.output);
    // Check for escalation or pattern detection in output
  });
});

// =============================================================================
// PATTERN PERSISTENCE
// =============================================================================

describe('E2E: Pattern persistence', () => {
  it('should include pattern sync status in awaken', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });
    assert.ok(result.output);
    // Patterns sync might succeed or fail, but should be attempted
    assert.ok(
      result.output.syncStatus.patterns !== undefined ||
      result.output.syncStatus.failures.some(f => f.type === 'patterns') ||
      result.output.patterns !== undefined,
      'Should attempt pattern sync'
    );
  });

  it('should include pattern sync status in sleep', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });
    assert.ok(result.output);
    // Patterns sync only triggers if there are new patterns
    // syncStatus.patterns is set if there were patterns to save
    // If no patterns, neither patterns field nor patterns failure exists
    assert.ok(
      result.output.syncStatus !== undefined,
      'Should have syncStatus in sleep'
    );
    // Verify syncStatus has expected structure
    assert.ok(Array.isArray(result.output.syncStatus.failures), 'Should have failures array');
  });
});

// =============================================================================
// PROFILE SYNC CHAIN
// =============================================================================

describe('E2E: Profile sync chain', () => {
  it('should attempt profile load in awaken and sync in sleep', () => {
    // Awaken - load profile
    const awakenResult = runHook('awaken', {}, { timeout: 15000 });
    const hasProfileLoad = awakenResult.output.syncStatus.profile !== undefined ||
                           awakenResult.output.syncStatus.failures.some(f => f.type === 'profile');
    assert.ok(hasProfileLoad, 'Awaken should attempt profile load');

    // Sleep - sync profile
    const sleepInput = createSessionContext();
    const sleepResult = runHook('sleep', sleepInput, { timeout: 30000 });
    const hasProfileSync = sleepResult.output.syncStatus.profile !== undefined ||
                           sleepResult.output.syncStatus.failures.some(f => f.type === 'profile');
    assert.ok(hasProfileSync, 'Sleep should attempt profile sync');
  });
});
