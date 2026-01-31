/**
 * Awaken Hook Tests
 *
 * Tests for the SessionStart hook that initializes CYNIC's presence.
 *
 * @module scripts/hooks/test/awaken
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { runHook, createSessionContext } from './fixtures/mock-stdin.js';

// =============================================================================
// OUTPUT STRUCTURE
// =============================================================================

describe('awaken hook - output structure', () => {
  it('should return valid JSON', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output, 'Should return JSON output');
    assert.ok(typeof result.output === 'object', 'Should be an object');
  });

  it('should include type field', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.strictEqual(result.output.type, 'SessionStart');
  });

  it('should include timestamp', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.ok(result.output.timestamp, 'Should have timestamp');
    assert.ok(new Date(result.output.timestamp).getTime() > 0, 'Timestamp should be valid date');
  });

  it('should include user info', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.ok(result.output.user, 'Should have user object');
    assert.ok(result.output.user.id, 'User should have id');
  });

  it('should include sessionId', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.ok(result.output.sessionId, 'Should have sessionId');
    assert.ok(result.output.sessionId.startsWith('session-'), 'SessionId should have prefix');
  });
});

// =============================================================================
// ECOSYSTEM DETECTION
// =============================================================================

describe('awaken hook - ecosystem', () => {
  it('should detect current project', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    // Project might be null if not in a project directory
    if (result.output.project) {
      assert.ok(result.output.project.name, 'Project should have name');
      assert.ok(result.output.project.path, 'Project should have path');
    }
  });

  it('should include ecosystem array', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.ok(Array.isArray(result.output.ecosystem), 'Ecosystem should be array');
  });
});

// =============================================================================
// PSYCHOLOGY STATE
// =============================================================================

describe('awaken hook - psychology', () => {
  it('should include psychology state if available', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    // Psychology is optional
    if (result.output.psychology) {
      assert.ok(result.output.psychology.state, 'Psychology should have state');
    }
  });
});

// =============================================================================
// SYNC STATUS
// =============================================================================

describe('awaken hook - sync status', () => {
  it('should include syncStatus object', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.ok(result.output.syncStatus, 'Should have syncStatus');
    assert.ok(Array.isArray(result.output.syncStatus.failures), 'Should have failures array');
  });

  it('should report profile sync status', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    // Profile sync might succeed or fail depending on DB availability
    assert.ok(
      result.output.syncStatus.profile !== undefined ||
      result.output.syncStatus.failures.some(f => f.type === 'profile'),
      'Should report profile sync status'
    );
  });
});

// =============================================================================
// DOGS TREE
// =============================================================================

describe('awaken hook - dogs', () => {
  it('should include dogs tree', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.ok(result.output.dogs, 'Should have dogs object');
    assert.ok(Array.isArray(result.output.dogs.tree), 'Dogs should have tree array');
  });

  it('should have 11 dogs in tree (Sefirot)', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.strictEqual(result.output.dogs.tree.length, 11, 'Should have 11 dogs');
  });

  it('should include CYNIC (Keter) as first dog', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    const cynic = result.output.dogs.tree.find(d => d.id === 'cynic');
    assert.ok(cynic, 'Should have CYNIC dog');
    assert.strictEqual(cynic.sefira, 'Keter', 'CYNIC should be Keter');
  });
});

// =============================================================================
// GOALS
// =============================================================================

describe('awaken hook - goals', () => {
  it('should include goals array', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    assert.ok(Array.isArray(result.output.goals), 'Goals should be array');
  });

  it('should format goals with progress bar', () => {
    const result = runHook('awaken', {}, { timeout: 15000 });

    assert.ok(result.output);
    if (result.output.goals.length > 0) {
      const goal = result.output.goals[0];
      assert.ok(goal.id, 'Goal should have id');
      assert.ok(goal.title, 'Goal should have title');
      assert.ok(typeof goal.progress === 'number', 'Goal should have progress');
      assert.ok(goal.progressBar, 'Goal should have progressBar');
    }
  });
});
