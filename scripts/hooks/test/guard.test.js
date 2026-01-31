/**
 * Guard Hook Tests
 *
 * Tests for the PreToolUse blocking hook that protects against dangerous operations.
 *
 * @module scripts/hooks/test/guard
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { runHook, createToolInput } from './fixtures/mock-stdin.js';

// =============================================================================
// CRITICAL COMMAND BLOCKING
// =============================================================================

describe('guard hook - critical commands', () => {
  it('should block rm -rf /', () => {
    const input = createToolInput('Bash', { command: 'rm -rf /' });
    const result = runHook('guard', input);

    assert.ok(result.output, 'Should return JSON output');
    assert.strictEqual(result.output.continue, false, 'Should not continue');
    assert.strictEqual(result.output.blocked, true, 'Should be blocked');
    assert.ok(result.output.blockReason, 'Should have blockReason');
  });

  it('should block rm -rf /*', () => {
    const input = createToolInput('Bash', { command: 'rm -rf /*' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.blocked, true);
  });

  it('should block rm -rf ~', () => {
    const input = createToolInput('Bash', { command: 'rm -rf ~' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.blocked, true);
  });

  it('should block recursive deletion patterns', () => {
    const input = createToolInput('Bash', { command: 'rm -rf .' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    // Should block or warn about recursive deletion in current directory
    assert.ok(
      result.output.blocked === true || result.output.issues?.length > 0,
      'Should block or issue warning'
    );
  });
});

// =============================================================================
// HIGH RISK WARNINGS
// =============================================================================

describe('guard hook - high risk commands', () => {
  it('should warn or block git push --force to main', () => {
    const input = createToolInput('Bash', { command: 'git push --force origin main' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    // High risk should either block or have issues
    assert.ok(
      result.output.blocked === true || result.output.issues?.length > 0,
      'Should block or warn on force push to main'
    );
  });

  it('should warn or block git reset --hard', () => {
    const input = createToolInput('Bash', { command: 'git reset --hard HEAD~5' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.ok(
      result.output.blocked === true || result.output.issues?.length > 0,
      'Should block or warn on hard reset'
    );
  });
});

// =============================================================================
// SAFE COMMANDS
// =============================================================================

describe('guard hook - safe commands', () => {
  it('should allow git status', () => {
    const input = createToolInput('Bash', { command: 'git status' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true, 'Should continue');
    assert.strictEqual(result.output.blocked, false, 'Should not be blocked');
  });

  it('should allow npm test', () => {
    const input = createToolInput('Bash', { command: 'npm test' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true);
    assert.strictEqual(result.output.blocked, false);
  });

  it('should allow ls -la', () => {
    const input = createToolInput('Bash', { command: 'ls -la' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true);
  });

  it('should allow git commit', () => {
    const input = createToolInput('Bash', { command: 'git commit -m "test commit"' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true);
  });

  it('should allow node commands', () => {
    const input = createToolInput('Bash', { command: 'node --version' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true);
  });
});

// =============================================================================
// FILE OPERATIONS
// =============================================================================

describe('guard hook - file operations', () => {
  it('should allow safe file writes', () => {
    const input = createToolInput('Write', {
      file_path: 'src/components/Button.tsx',
      content: 'export default () => <button>Click</button>',
    });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true);
  });

  it('should allow safe file reads', () => {
    const input = createToolInput('Read', { file_path: 'package.json' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true);
  });

  it('should handle .env file writes', () => {
    const input = createToolInput('Write', {
      file_path: '.env',
      content: 'API_KEY=secret',
    });
    const result = runHook('guard', input);

    assert.ok(result.output);
    // Should at least have issues about sensitive files, or allow with warning
    assert.ok(result.output.continue !== undefined);
  });

  it('should block system file writes', () => {
    const input = createToolInput('Write', {
      file_path: '/etc/passwd',
      content: 'hacked',
    });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.blocked, true, 'Should block system file writes');
  });
});

// =============================================================================
// OUTPUT FORMAT
// =============================================================================

describe('guard hook - output format', () => {
  it('should return valid JSON', () => {
    const input = createToolInput('Bash', { command: 'echo hello' });
    const result = runHook('guard', input);

    assert.ok(result.output, 'Should parse as JSON');
    assert.ok(typeof result.output === 'object', 'Should be an object');
  });

  it('should include type field', () => {
    const input = createToolInput('Bash', { command: 'echo hello' });
    const result = runHook('guard', input);

    assert.strictEqual(result.output.type, 'PreToolUse');
  });

  it('should include continue field', () => {
    const input = createToolInput('Bash', { command: 'echo hello' });
    const result = runHook('guard', input);

    assert.ok(typeof result.output.continue === 'boolean', 'Should have continue field');
  });

  it('should include blocked field', () => {
    const input = createToolInput('Bash', { command: 'echo hello' });
    const result = runHook('guard', input);

    assert.ok(typeof result.output.blocked === 'boolean', 'Should have blocked field');
  });

  it('should include issues array', () => {
    const input = createToolInput('Bash', { command: 'rm -rf /' });
    const result = runHook('guard', input);

    assert.ok(Array.isArray(result.output.issues), 'Should have issues array');
    assert.ok(result.output.issues.length > 0, 'Should have issues for dangerous command');
  });

  it('should include blockReason for blocks', () => {
    const input = createToolInput('Bash', { command: 'rm -rf /' });
    const result = runHook('guard', input);

    assert.strictEqual(result.output.blocked, true);
    assert.ok(result.output.blockReason, 'Should include blockReason for block');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('guard hook - edge cases', () => {
  it('should handle empty input', () => {
    const result = runHook('guard', {});

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true, 'Empty input should allow');
  });

  it('should handle unknown tools', () => {
    const input = createToolInput('UnknownTool', { foo: 'bar' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true, 'Unknown tools should allow');
  });

  it('should handle missing command in Bash', () => {
    const input = createToolInput('Bash', {});
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.strictEqual(result.output.continue, true);
  });

  it('should handle very long commands', () => {
    const longCommand = 'echo ' + 'a'.repeat(10000);
    const input = createToolInput('Bash', { command: longCommand });
    const result = runHook('guard', input);

    assert.ok(result.output);
    // Should not crash
  });

  it('should include escalation level', () => {
    const input = createToolInput('Bash', { command: 'echo test' });
    const result = runHook('guard', input);

    assert.ok(result.output);
    assert.ok(result.output.escalationLevel, 'Should have escalationLevel');
  });
});
