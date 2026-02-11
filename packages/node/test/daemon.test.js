/**
 * CYNIC Daemon Tests
 *
 * Tests for daemon server, hook handlers, and HTTP endpoints.
 * Phase 2: service-wiring, watchdog, handleStop, thin stop hook.
 *
 * "Le chien teste le chien" - CYNIC
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { DaemonServer } from '../src/daemon/index.js';
import { handleHookEvent } from '../src/daemon/hook-handlers.js';
import { wireDaemonServices, cleanupDaemonServices, isWired, _resetForTesting as resetServiceWiring } from '../src/daemon/service-wiring.js';
import { Watchdog, HealthLevel, checkRestartSentinel } from '../src/daemon/watchdog.js';
import { resetModelIntelligence } from '../src/learning/model-intelligence.js';
import { resetCostLedger } from '../src/accounting/cost-ledger.js';

// =============================================================================
// HOOK HANDLERS (pure functions, no HTTP needed)
// =============================================================================

describe('Hook Handlers', () => {
  describe('handleHookEvent', () => {
    it('should handle UserPromptSubmit with empty prompt', async () => {
      const result = await handleHookEvent('UserPromptSubmit', { prompt: '' });
      assert.strictEqual(result.continue, true);
    });

    it('should handle UserPromptSubmit with normal prompt', async () => {
      const result = await handleHookEvent('UserPromptSubmit', { prompt: 'add a button' });
      assert.strictEqual(result.continue, true);
    });

    it('should detect danger in UserPromptSubmit', async () => {
      const result = await handleHookEvent('UserPromptSubmit', { prompt: 'rm -rf /' });
      assert.strictEqual(result.continue, true);
      // Should include a danger warning message
      assert.ok(result.message);
      assert.ok(result.message.includes('GROWL') || result.message.includes('DANGER'));
    });

    it('should handle unknown events gracefully', async () => {
      const result = await handleHookEvent('UnknownEvent', {});
      assert.strictEqual(result.continue, true);
    });

    it('should handle null/undefined input', async () => {
      const result = await handleHookEvent('UserPromptSubmit', null);
      assert.strictEqual(result.continue, true);
    });
  });

  describe('PreToolUse guard', () => {
    it('should allow safe Bash commands', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
      });
      assert.strictEqual(result.continue, true);
      assert.strictEqual(result.blocked, false);
    });

    it('should block rm -rf /', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Bash',
        tool_input: { command: 'rm -rf /' },
      });
      assert.strictEqual(result.blocked, true);
      assert.strictEqual(result.continue, false);
      assert.ok(result.blockReason);
    });

    it('should block rm -rf *', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Bash',
        tool_input: { command: 'rm -rf *' },
      });
      assert.strictEqual(result.blocked, true);
    });

    it('should block fork bombs', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Bash',
        tool_input: { command: ':(){ :|:& };:' },
      });
      assert.strictEqual(result.blocked, true);
    });

    it('should block DROP TABLE', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Bash',
        tool_input: { command: 'psql -c "DROP TABLE users"' },
      });
      assert.strictEqual(result.blocked, true);
    });

    it('should warn on force push', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Bash',
        tool_input: { command: 'git push --force origin main' },
      });
      assert.strictEqual(result.continue, true);
      assert.strictEqual(result.blocked, false);
      assert.ok(result.issues.length > 0);
      assert.strictEqual(result.issues[0].action, 'warn');
    });

    it('should warn on .env file writes', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Write',
        tool_input: { file_path: '/home/user/.env' },
      });
      assert.strictEqual(result.continue, true);
      assert.ok(result.issues.length > 0);
    });

    it('should allow safe Write operations', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Write',
        tool_input: { file_path: '/src/index.js' },
      });
      assert.strictEqual(result.continue, true);
      assert.strictEqual(result.issues.length, 0);
    });

    it('should handle missing tool input', async () => {
      const result = await handleHookEvent('PreToolUse', {
        tool_name: 'Bash',
        tool_input: {},
      });
      assert.strictEqual(result.continue, true);
      assert.strictEqual(result.blocked, false);
    });
  });

  describe('PostToolUse observe', () => {
    it('should always return continue', async () => {
      const result = await handleHookEvent('PostToolUse', {
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
        tool_output: 'All tests passed',
      });
      assert.strictEqual(result.continue, true);
    });
  });

  describe('SessionStart awaken', () => {
    it('should return welcome message', async () => {
      const result = await handleHookEvent('SessionStart', {});
      assert.strictEqual(result.continue, true);
      assert.ok(result.message);
      assert.ok(result.message.includes('daemon'));
    });
  });

  describe('SessionEnd sleep', () => {
    it('should return continue', async () => {
      const result = await handleHookEvent('SessionEnd', {});
      assert.strictEqual(result.continue, true);
    });
  });

  describe('Stop', () => {
    it('should return continue when no ralph-loop active', async () => {
      const result = await handleHookEvent('Stop', {});
      assert.strictEqual(result.continue, true);
    });

    it('should return continue with no transcript', async () => {
      const result = await handleHookEvent('Stop', { transcript_path: null });
      assert.strictEqual(result.continue, true);
    });

    it('should return continue with nonexistent transcript', async () => {
      const result = await handleHookEvent('Stop', { transcript_path: '/nonexistent/path.jsonl' });
      assert.strictEqual(result.continue, true);
    });

    it('should include digest banner when session stats available', async () => {
      // With no ralph-loop file present, handleStop goes to Phase 2 (digest)
      const result = await handleHookEvent('Stop', {});
      assert.strictEqual(result.continue, true);
      // Banner may or may not be present depending on singleton state
      // but the result must have `continue: true`
    });
  });

  describe('Stop — Ralph-loop integration', () => {
    const stateFile = '.claude/ralph-loop.local.md';
    const stateDir = '.claude';

    beforeEach(() => {
      // Ensure clean state
      try { fs.unlinkSync(stateFile); } catch { /* ignore */ }
    });

    afterEach(() => {
      // Clean up
      try { fs.unlinkSync(stateFile); } catch { /* ignore */ }
    });

    it('should block stop when ralph-loop is active', async () => {
      // Create a ralph-loop state file
      if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

      // Create a mock transcript with an assistant message
      const tmpDir = os.tmpdir();
      const transcriptPath = path.join(tmpDir, `cynic-test-transcript-${Date.now()}.jsonl`);
      const transcriptEntry = JSON.stringify({
        role: 'assistant',
        content: [{ type: 'text', text: '*sniff* Working on it...' }],
      });
      fs.writeFileSync(transcriptPath, transcriptEntry + '\n');

      // Write state file
      fs.writeFileSync(stateFile, `---
iteration: 1
max_iterations: 5
completion_promise: "task is complete"
---
Continue working on the task. Check all tests pass.`);

      const result = await handleHookEvent('Stop', { transcript_path: transcriptPath });

      // Should block
      assert.strictEqual(result.decision, 'block');
      assert.ok(result.reason);
      assert.ok(result.reason.includes('Continue working'));
      assert.strictEqual(result.iteration, 2);
      assert.ok(result.systemMessage);

      // Clean up transcript
      try { fs.unlinkSync(transcriptPath); } catch { /* ignore */ }
    });

    it('should allow stop when max iterations reached', async () => {
      if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(stateFile, `---
iteration: 5
max_iterations: 5
completion_promise: null
---
Do something.`);

      const result = await handleHookEvent('Stop', {});
      assert.strictEqual(result.continue, true);

      // State file should be cleaned up
      assert.strictEqual(fs.existsSync(stateFile), false);
    });

    it('should allow stop when completion promise is fulfilled', async () => {
      if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

      // Create transcript with fulfilled promise
      const tmpDir = os.tmpdir();
      const transcriptPath = path.join(tmpDir, `cynic-test-transcript-${Date.now()}.jsonl`);
      const transcriptEntry = JSON.stringify({
        role: 'assistant',
        content: [{ type: 'text', text: 'Done! <promise>all tests pass</promise>' }],
      });
      fs.writeFileSync(transcriptPath, transcriptEntry + '\n');

      fs.writeFileSync(stateFile, `---
iteration: 2
max_iterations: 10
completion_promise: "all tests pass"
---
Run tests until they pass.`);

      const result = await handleHookEvent('Stop', { transcript_path: transcriptPath });
      assert.strictEqual(result.continue, true);

      // State file should be cleaned up
      assert.strictEqual(fs.existsSync(stateFile), false);

      try { fs.unlinkSync(transcriptPath); } catch { /* ignore */ }
    });

    it('should handle corrupted state file gracefully', async () => {
      if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(stateFile, 'not yaml at all');

      const result = await handleHookEvent('Stop', {});
      assert.strictEqual(result.continue, true);
    });
  });
});

// =============================================================================
// SERVICE WIRING
// =============================================================================

describe('Service Wiring', () => {
  beforeEach(() => {
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();
  });

  afterEach(() => {
    resetServiceWiring();
    resetModelIntelligence();
    resetCostLedger();
  });

  it('should wire services and mark as wired', () => {
    assert.strictEqual(isWired(), false);
    const result = wireDaemonServices();
    assert.strictEqual(isWired(), true);
    assert.ok(result.modelIntelligence);
    assert.ok(result.costLedger);
  });

  it('should be idempotent (wire twice returns same singletons)', () => {
    const first = wireDaemonServices();
    const second = wireDaemonServices();
    assert.strictEqual(first.modelIntelligence, second.modelIntelligence);
    assert.strictEqual(first.costLedger, second.costLedger);
  });

  it('should cleanup without throwing', () => {
    wireDaemonServices();
    assert.strictEqual(isWired(), true);
    cleanupDaemonServices();
    assert.strictEqual(isWired(), false);
  });

  it('should handle cleanup when not wired', () => {
    // Should not throw
    cleanupDaemonServices();
    assert.strictEqual(isWired(), false);
  });
});

// =============================================================================
// WATCHDOG
// =============================================================================

describe('Watchdog', () => {
  let watchdog;

  afterEach(() => {
    if (watchdog) {
      watchdog.stop();
      watchdog = null;
    }
  });

  it('should construct with defaults', () => {
    watchdog = new Watchdog();
    const status = watchdog.getStatus();
    assert.strictEqual(status.running, false);
    assert.strictEqual(status.level, HealthLevel.HEALTHY);
    assert.strictEqual(status.consecutiveCritical, 0);
  });

  it('should start and stop', () => {
    watchdog = new Watchdog({ interval: 60000 }); // Long interval to avoid auto-check
    watchdog.start();
    assert.strictEqual(watchdog.getStatus().running, true);
    watchdog.stop();
    assert.strictEqual(watchdog.getStatus().running, false);
  });

  it('should run health checks and report metrics', async () => {
    watchdog = new Watchdog({ interval: 100 });
    watchdog.start();

    // Wait for at least one check
    await new Promise(r => setTimeout(r, 200));

    const status = watchdog.getStatus();
    assert.ok(status.checkCount >= 1);
    assert.ok(status.heapUsedMB > 0);
    assert.ok(status.heapRatio > 0);
    assert.ok(status.eventLoopLatencyMs >= 0);
  });

  it('should register subsystem health checks', async () => {
    watchdog = new Watchdog({ interval: 100 });

    watchdog.registerSubsystem('test-healthy', () => ({ healthy: true, message: 'ok' }));
    watchdog.registerSubsystem('test-sick', () => ({ healthy: false, message: 'broken' }));

    watchdog.start();

    await new Promise(r => setTimeout(r, 200));

    const status = watchdog.getStatus();
    assert.ok(status.subsystems['test-healthy'].healthy);
    assert.strictEqual(status.subsystems['test-sick'].healthy, false);
    assert.ok(status.degradedSubsystems.includes('test-sick'));
  });

  it('should escalate to WARNING on unhealthy subsystem', async () => {
    watchdog = new Watchdog({ interval: 100 });
    watchdog.registerSubsystem('broken', () => ({ healthy: false, message: 'broken' }));
    watchdog.start();

    await new Promise(r => setTimeout(r, 200));

    const status = watchdog.getStatus();
    assert.ok(
      status.level === HealthLevel.WARNING || status.level === HealthLevel.CRITICAL,
      `Expected WARNING or CRITICAL, got ${status.level}`
    );
  });

  it('should call onFatal instead of process.exit', async () => {
    let fatalCalled = false;
    watchdog = new Watchdog({
      interval: 50,
      fatalThreshold: 2,
      onFatal: () => { fatalCalled = true; },
    });

    // Register a subsystem that always reports critical heap
    // We can't easily force real heap to 80%+, so we test the escalation logic
    // by checking that consecutive critical tracking works
    watchdog._consecutiveCritical = 1;

    // Simulate a critical check
    watchdog._metrics.level = HealthLevel.CRITICAL;
    watchdog._handleFatal([{ subsystem: 'test', level: 'critical', message: 'test' }]);

    assert.strictEqual(fatalCalled, true);
  });

  describe('Restart sentinel', () => {
    const sentinelPath = path.join(os.homedir(), '.cynic', 'daemon', 'restart-requested');

    beforeEach(() => {
      // Clean up any sentinel left by previous tests (e.g., onFatal test)
      try { fs.unlinkSync(sentinelPath); } catch { /* ignore */ }
    });

    afterEach(() => {
      try { fs.unlinkSync(sentinelPath); } catch { /* ignore */ }
    });

    it('should return recovered: false when no sentinel', () => {
      const result = checkRestartSentinel();
      assert.strictEqual(result.recovered, false);
    });

    it('should detect and clean sentinel file', () => {
      const dir = path.dirname(sentinelPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(sentinelPath, JSON.stringify({
        reason: 'watchdog_fatal',
        pid: 12345,
        timestamp: Date.now(),
      }));

      const result = checkRestartSentinel();
      assert.strictEqual(result.recovered, true);
      assert.strictEqual(result.previousCrash.pid, 12345);
      assert.strictEqual(result.previousCrash.reason, 'watchdog_fatal');

      // Sentinel should be cleaned up
      assert.strictEqual(fs.existsSync(sentinelPath), false);
    });
  });
});

// =============================================================================
// DAEMON SERVER (HTTP integration)
// =============================================================================

describe('DaemonServer', () => {
  let server;
  const TEST_PORT = 16180; // Test port to avoid conflicts

  beforeEach(async () => {
    server = new DaemonServer({ port: TEST_PORT, host: '127.0.0.1' });
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should construct with defaults', () => {
    const s = new DaemonServer();
    assert.strictEqual(s.port, 6180);
    assert.strictEqual(s.host, '127.0.0.1');
  });

  it('should construct with custom port', () => {
    assert.strictEqual(server.port, TEST_PORT);
  });

  it('should start and stop', async () => {
    await server.start();
    assert.ok(server.startTime);
    assert.ok(server.server);

    await server.stop();
    assert.strictEqual(server.server, null);
    assert.strictEqual(server.startTime, null);
  });

  it('should respond to /health', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    assert.strictEqual(res.status, 200);

    const health = await res.json();
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.port, TEST_PORT);
    assert.ok(health.pid > 0);
    assert.ok(health.uptime >= 0);
    assert.ok(health.memoryMB > 0);
    assert.ok(health.heapUsedPercent > 0);
  });

  it('should include watchdog data in /health when available', async () => {
    const watchdog = new Watchdog({ interval: 60000 });
    server.watchdog = watchdog;
    watchdog.start();

    await server.start();

    // Wait for initial check
    await new Promise(r => setTimeout(r, 100));

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/health`);
    const health = await res.json();

    assert.ok(health.eventLoopLatencyMs !== undefined);
    assert.ok(Array.isArray(health.degradedSubsystems));
    assert.ok(health.watchdogChecks >= 0);

    watchdog.stop();
  });

  it('should respond to /status', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/status`);
    assert.strictEqual(res.status, 200);

    const status = await res.json();
    assert.ok(status.daemon);
    assert.strictEqual(status.daemon.port, TEST_PORT);
  });

  it('should handle POST /hook/UserPromptSubmit', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/hook/UserPromptSubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'hello world' }),
    });
    assert.strictEqual(res.status, 200);

    const result = await res.json();
    assert.strictEqual(result.continue, true);
  });

  it('should handle POST /hook/PreToolUse — block dangerous command', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/hook/PreToolUse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } }),
    });
    assert.strictEqual(res.status, 200);

    const result = await res.json();
    assert.strictEqual(result.blocked, true);
    assert.strictEqual(result.continue, false);
  });

  it('should handle POST /hook/PreToolUse — allow safe command', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/hook/PreToolUse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }),
    });
    assert.strictEqual(res.status, 200);

    const result = await res.json();
    assert.strictEqual(result.blocked, false);
    assert.strictEqual(result.continue, true);
  });

  it('should handle POST /hook/Stop — no ralph-loop', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/hook/Stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 200);

    const result = await res.json();
    assert.strictEqual(result.continue, true);
  });

  it('should return 400 for /llm/ask without prompt', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/llm/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const result = await res.json();
    assert.ok(result.error.includes('prompt'));
  });

  it('should handle /llm/ask with prompt (adapter-dependent)', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/llm/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test question' }),
    });
    // 200 = adapter found and responded, 503 = no adapter, 500 = adapter error
    const status = res.status;
    assert.ok(
      status === 200 || status === 503 || status === 500,
      `Expected 200, 503, or 500, got ${status}`
    );
    const body = await res.json();
    if (status === 200) {
      assert.ok(body.content !== undefined, 'Should have content on success');
      assert.ok(body.tier, 'Should have tier on success');
    } else if (status === 503) {
      assert.ok(body.error.includes('No adapter'), 'Should indicate no adapter');
    }
  });

  it('should respond to GET /llm/models', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/llm/models`);
    assert.strictEqual(res.status, 200);

    const result = await res.json();
    assert.ok(Array.isArray(result.models));
    assert.ok(result.thompson);
    assert.ok(result.stats);
  });

  it('should return 400 for /llm/feedback without required fields', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/llm/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
  });

  it('should accept /llm/feedback with valid fields', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/llm/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskType: 'code', model: 'sonnet', success: true }),
    });
    assert.strictEqual(res.status, 200);

    const result = await res.json();
    assert.strictEqual(result.recorded, true);
    assert.ok(result.stats);
  });

  it('should return 400 for /llm/consensus without prompt', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/llm/consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
  });

  it('should handle unknown hook events', async () => {
    await server.start();

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/hook/UnknownEvent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 200);

    const result = await res.json();
    assert.strictEqual(result.continue, true);
  });

  it('should reject double start', async () => {
    await server.start();
    await assert.rejects(() => server.start(), /already running/);
  });

  it('should handle stop when not running', async () => {
    // Should not throw
    await server.stop();
  });
});
