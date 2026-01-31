/**
 * Sleep Hook Tests
 *
 * Tests for the SessionEnd hook that finalizes CYNIC sessions.
 *
 * @module scripts/hooks/test/sleep
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { runHook, createSessionContext } from './fixtures/mock-stdin.js';

// =============================================================================
// OUTPUT STRUCTURE
// =============================================================================

describe('sleep hook - output structure', () => {
  it('should return valid JSON', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output, 'Should return JSON output');
    assert.ok(typeof result.output === 'object', 'Should be an object');
  });

  it('should include type field', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.strictEqual(result.output.type, 'SessionEnd');
  });

  it('should include timestamp', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(result.output.timestamp, 'Should have timestamp');
  });

  it('should include user info', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(result.output.user, 'Should have user object');
    assert.ok(result.output.user.id, 'User should have id');
  });
});

// =============================================================================
// SESSION SUMMARY
// =============================================================================

describe('sleep hook - session summary', () => {
  it('should include session object', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(result.output.session, 'Should have session object');
  });

  it('should calculate session duration', () => {
    const startTime = Date.now() - 120000; // 2 minutes ago
    const input = createSessionContext({ sessionStartTime: startTime });
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(result.output.session.duration, 'Should have duration');
    assert.ok(result.output.session.duration >= 0, 'Duration should be non-negative');
  });

  it('should include duration in minutes', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(typeof result.output.session.durationMinutes === 'number', 'Should have durationMinutes');
  });
});

// =============================================================================
// STATISTICS
// =============================================================================

describe('sleep hook - statistics', () => {
  it('should include stats object', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(result.output.stats, 'Should have stats object');
  });

  it('should track tools used', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(typeof result.output.stats.toolsUsed === 'number', 'Should have toolsUsed count');
  });

  it('should track errors encountered', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(typeof result.output.stats.errorsEncountered === 'number', 'Should have errorsEncountered count');
  });

  it('should track danger blocked', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(typeof result.output.stats.dangerBlocked === 'number', 'Should have dangerBlocked count');
  });
});

// =============================================================================
// TOP TOOLS
// =============================================================================

describe('sleep hook - top tools', () => {
  it('should include topTools array', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(Array.isArray(result.output.topTools), 'topTools should be array');
  });

  it('should format top tools with count', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    if (result.output.topTools.length > 0) {
      const tool = result.output.topTools[0];
      assert.ok(tool.tool, 'Should have tool name');
      assert.ok(typeof tool.count === 'number', 'Should have count');
    }
  });
});

// =============================================================================
// SYNC STATUS
// =============================================================================

describe('sleep hook - sync status', () => {
  it('should include syncStatus object', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(result.output.syncStatus, 'Should have syncStatus');
    assert.ok(Array.isArray(result.output.syncStatus.failures), 'Should have failures array');
  });

  it('should attempt profile sync', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    // Profile sync status should be reported
    assert.ok(
      result.output.syncStatus.profile !== undefined ||
      result.output.syncStatus.failures.some(f => f.type === 'profile'),
      'Should report profile sync attempt'
    );
  });
});

// =============================================================================
// THERMODYNAMICS
// =============================================================================

describe('sleep hook - thermodynamics', () => {
  it('should include thermodynamics if available', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    // Thermodynamics is optional
    if (result.output.thermodynamics) {
      assert.ok(typeof result.output.thermodynamics.heat === 'number', 'Should have heat');
      assert.ok(typeof result.output.thermodynamics.work === 'number', 'Should have work');
      assert.ok(typeof result.output.thermodynamics.efficiency === 'number', 'Should have efficiency');
    }
  });
});

// =============================================================================
// DOGS ACTIVITY
// =============================================================================

describe('sleep hook - dogs activity', () => {
  it('should include dogsActivity array', () => {
    const input = createSessionContext();
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    assert.ok(Array.isArray(result.output.dogsActivity), 'dogsActivity should be array');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('sleep hook - edge cases', () => {
  it('should handle empty input', () => {
    const result = runHook('sleep', {}, { timeout: 30000 });

    assert.ok(result.output);
    assert.strictEqual(result.output.type, 'SessionEnd');
  });

  it('should handle missing sessionStartTime', () => {
    const input = { sessionId: 'test-123' };
    const result = runHook('sleep', input, { timeout: 30000 });

    assert.ok(result.output);
    // Should still complete without error
    assert.strictEqual(result.output.type, 'SessionEnd');
  });
});
