/**
 * WorkerPool Tests (O4.2)
 *
 * @module @cynic/node/test/worker-pool
 */

'use strict';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  WorkerPool,
  WorkerTask,
  TaskStatus,
  WORKER_CONFIG,
  createWorkerPool,
  getWorkerPool,
  resetWorkerPool,
  registerBuiltinHandlers,
  BUILTIN_TASK_TYPES,
} from '../src/workers/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// WorkerTask Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('WorkerTask', () => {
  it('should create task with defaults', () => {
    const task = new WorkerTask({ type: 'test' });

    assert.ok(task.id.startsWith('task-'));
    assert.strictEqual(task.type, 'test');
    assert.strictEqual(task.status, TaskStatus.PENDING);
    assert.strictEqual(task.progress, 0);
    assert.strictEqual(task.priority, 50);
    assert.ok(task.createdAt instanceof Date);
  });

  it('should update progress within bounds', () => {
    const task = new WorkerTask({ type: 'test' });

    task.updateProgress(50, 'Half done');
    assert.strictEqual(task.progress, 50);
    assert.strictEqual(task.progressMessage, 'Half done');

    task.updateProgress(150, 'Over limit');
    assert.strictEqual(task.progress, 100);

    task.updateProgress(-10, 'Under limit');
    assert.strictEqual(task.progress, 0);
  });

  it('should serialize to JSON', () => {
    const task = new WorkerTask({
      type: 'test',
      payload: { foo: 'bar' },
      priority: 75,
    });

    const json = task.toJSON();
    assert.strictEqual(json.type, 'test');
    assert.deepStrictEqual(json.payload, { foo: 'bar' });
    assert.strictEqual(json.priority, 75);
    assert.strictEqual(json.status, TaskStatus.PENDING);
  });

  it('should support cancellation', () => {
    const task = new WorkerTask({ type: 'test' });

    assert.ok(task.canCancel());
    assert.strictEqual(task.signal.aborted, false);

    task.requestCancel();
    assert.strictEqual(task.signal.aborted, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WorkerPool Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('WorkerPool', () => {
  let pool;

  beforeEach(() => {
    resetWorkerPool();
    pool = createWorkerPool({ autoStart: false });
  });

  afterEach(async () => {
    if (pool) {
      await pool.stop(true);
    }
  });

  it('should create pool with default config', () => {
    assert.strictEqual(pool.config.maxConcurrent, WORKER_CONFIG.maxConcurrent);
    assert.strictEqual(pool._running, false);
    assert.strictEqual(pool._active.size, 0);
  });

  it('should register and check handlers', () => {
    assert.strictEqual(pool.hasHandler('test'), false);

    pool.registerHandler('test', async () => 'result');
    assert.strictEqual(pool.hasHandler('test'), true);
  });

  it('should throw when registering non-function handler', () => {
    assert.throws(() => {
      pool.registerHandler('test', 'not a function');
    }, /must be a function/);
  });

  it('should start and stop', async () => {
    assert.strictEqual(pool._running, false);

    pool.start();
    assert.strictEqual(pool._running, true);

    await pool.stop();
    assert.strictEqual(pool._running, false);
  });

  it('should submit tasks with priority ordering', () => {
    pool.registerHandler('test', async () => {});

    const task1 = pool.submit({ type: 'test', priority: 30 });
    const task2 = pool.submit({ type: 'test', priority: 80 });
    const task3 = pool.submit({ type: 'test', priority: 50 });

    const queued = pool.getQueuedTasks();
    assert.strictEqual(queued[0].priority, 80);
    assert.strictEqual(queued[1].priority, 50);
    assert.strictEqual(queued[2].priority, 30);
  });

  it('should throw when submitting to unregistered handler', () => {
    assert.throws(() => {
      pool.submit({ type: 'unknown' });
    }, /No handler registered/);
  });

  it('should throw when queue is full', () => {
    pool = createWorkerPool({ maxQueueSize: 2 });
    pool.registerHandler('test', async () => {});

    pool.submit({ type: 'test' });
    pool.submit({ type: 'test' });

    assert.throws(() => {
      pool.submit({ type: 'test' });
    }, /Queue full/);
  });

  it('should execute tasks', async () => {
    let executed = false;
    pool.registerHandler('test', async (payload, context) => {
      context.updateProgress(50, 'Working...');
      executed = true;
      return { success: true };
    });

    pool.start();
    const task = pool.submit({ type: 'test' });

    const result = await pool.waitFor(task.id, 5000);
    assert.strictEqual(executed, true);
    assert.deepStrictEqual(result, { success: true });
  });

  it('should handle task failure', async () => {
    pool.registerHandler('test', async () => {
      throw new Error('Task failed intentionally');
    });

    pool.start();
    const task = pool.submit({ type: 'test' });

    await assert.rejects(
      () => pool.waitFor(task.id, 5000),
      /Task failed intentionally/
    );

    assert.strictEqual(pool.stats.tasksFailed, 1);
  });

  it('should cancel tasks', () => {
    pool.registerHandler('test', async () => {});

    const task = pool.submit({ type: 'test' });
    assert.strictEqual(pool.cancel(task.id), true);
    assert.strictEqual(task.status, TaskStatus.CANCELLED);
    assert.strictEqual(pool.stats.tasksCancelled, 1);
  });

  it('should get pool status', () => {
    pool.registerHandler('test', async () => {});
    pool.submit({ type: 'test' });

    const status = pool.getStatus();
    assert.strictEqual(status.running, false);
    assert.strictEqual(status.activeWorkers, 0);
    assert.strictEqual(status.queuedTasks, 1);
    assert.deepStrictEqual(status.registeredHandlers, ['test']);
  });

  it('should respect max concurrent workers', async () => {
    pool = createWorkerPool({ maxConcurrent: 2, autoStart: false });

    let concurrent = 0;
    let maxConcurrent = 0;

    pool.registerHandler('test', async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(resolve => setTimeout(resolve, 100));
      concurrent--;
      return {};
    });

    pool.start();

    // Submit 5 tasks
    const tasks = [];
    for (let i = 0; i < 5; i++) {
      tasks.push(pool.submit({ type: 'test' }));
    }

    // Wait for all to complete
    await Promise.all(tasks.map(t => pool.waitFor(t.id, 10000)));

    // Max concurrent should not exceed 2
    assert.ok(maxConcurrent <= 2, `Max concurrent was ${maxConcurrent}, expected <= 2`);
    assert.strictEqual(pool.stats.tasksCompleted, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('WorkerPool Singleton', () => {
  beforeEach(() => {
    resetWorkerPool();
  });

  afterEach(() => {
    resetWorkerPool();
  });

  it('should return same instance', () => {
    const pool1 = getWorkerPool();
    const pool2 = getWorkerPool();
    assert.strictEqual(pool1, pool2);
  });

  it('should reset singleton', () => {
    const pool1 = getWorkerPool();
    resetWorkerPool();
    const pool2 = getWorkerPool();
    assert.notStrictEqual(pool1, pool2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Built-in Handlers Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Built-in Handlers', () => {
  let pool;

  beforeEach(() => {
    resetWorkerPool();
    pool = createWorkerPool({ autoStart: false });
    registerBuiltinHandlers(pool);
  });

  afterEach(async () => {
    if (pool) {
      await pool.stop(true);
    }
  });

  it('should register all built-in handlers', () => {
    const types = Object.values(BUILTIN_TASK_TYPES);
    for (const type of types) {
      assert.ok(pool.hasHandler(type), `Missing handler for ${type}`);
    }
  });

  it('should execute analyze_patterns', async () => {
    pool.start();

    const task = pool.submit({
      type: BUILTIN_TASK_TYPES.ANALYZE_PATTERNS,
      payload: { content: 'test content' },
    });

    const result = await pool.waitFor(task.id, 5000);
    assert.ok(result.analyzedAt);
    assert.ok(Array.isArray(result.patterns));
  });

  it('should execute cleanup', async () => {
    pool.start();

    const task = pool.submit({
      type: BUILTIN_TASK_TYPES.CLEANUP,
      payload: { maxAge: 7 },
    });

    const result = await pool.waitFor(task.id, 5000);
    assert.ok(result.cleanedAt);
    assert.strictEqual(typeof result.deleted, 'number');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Auto-Dispatch Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Auto-Dispatch', () => {
  let pool;

  beforeEach(() => {
    resetWorkerPool();
    pool = createWorkerPool({
      autoStart: true,
      longTaskThresholdMs: 100, // Short threshold for testing
    });
  });

  afterEach(async () => {
    if (pool) {
      await pool.stop(true);
    }
  });

  it('should execute fast functions directly', async () => {
    pool.registerHandler('fast', async (payload) => payload.value * 2);

    const fastFn = pool.autoDispatch('fast', async (x) => x * 2);
    const result = await fastFn(21);

    assert.strictEqual(result, 42);
    assert.strictEqual(pool.stats.tasksQueued, 0); // Not dispatched
  });

  it('should dispatch slow functions to pool', async () => {
    pool.registerHandler('slow', async (payload) => {
      const { args } = payload;
      return args[0] * 2;
    });

    const slowFn = pool.autoDispatch('slow', async (x) => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Exceeds threshold
      return x * 2;
    });

    const result = await slowFn(21);
    assert.strictEqual(result, 42);
    assert.strictEqual(pool.stats.tasksQueued, 1); // Dispatched to pool
  });
});
