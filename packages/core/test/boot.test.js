/**
 * Boot System Tests
 *
 * Tests for CYNIC's unified boot system including:
 * - Lifecycle management
 * - Dependency resolution
 * - Engine integration
 * - Health checks
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  BootManager,
  BootState,
  BootEvent,
  Lifecycle,
  LifecycleState,
  HealthStatus,
  createLifecycle,
} from '@cynic/core/boot';

import { createEnginesProvider } from '@cynic/core/boot/providers';

describe('Lifecycle', () => {
  test('should transition through states correctly', async () => {
    const lifecycle = createLifecycle({
      name: 'test',
      initialize: async () => {},
      start: async () => {},
      stop: async () => {},
    });

    assert.strictEqual(lifecycle.state, LifecycleState.UNINITIALIZED);

    await lifecycle.initialize();
    assert.strictEqual(lifecycle.state, LifecycleState.INITIALIZED);

    await lifecycle.start();
    assert.strictEqual(lifecycle.state, LifecycleState.RUNNING);

    await lifecycle.stop();
    assert.strictEqual(lifecycle.state, LifecycleState.STOPPED);
  });

  test('should handle initialization failure', async () => {
    const lifecycle = createLifecycle({
      name: 'failing',
      initialize: async () => {
        throw new Error('Init failed');
      },
    });

    await assert.rejects(
      () => lifecycle.initialize(),
      { message: 'Init failed' }
    );

    assert.strictEqual(lifecycle.state, LifecycleState.FAILED);
  });

  test('should report health status', async () => {
    const lifecycle = createLifecycle({
      name: 'healthy-test',
      health: async () => ({ status: HealthStatus.HEALTHY, custom: true }),
    });

    await lifecycle.initialize();
    await lifecycle.start();

    const health = await lifecycle.health();
    assert.strictEqual(health.status, HealthStatus.HEALTHY);
    assert.strictEqual(health.custom, true);
    assert.strictEqual(health.name, 'healthy-test');
  });
});

describe('BootManager', () => {
  let boot;

  beforeEach(() => {
    boot = new BootManager();
  });

  afterEach(async () => {
    if (boot.state === BootState.RUNNING) {
      await boot.shutdown();
    }
  });

  test('should register components', () => {
    const comp = createLifecycle({ name: 'test' });
    boot.register(comp);

    assert.strictEqual(boot.has('test'), true);
    assert.strictEqual(boot.get('test'), comp);
  });

  test('should not allow duplicate registration', () => {
    const comp1 = createLifecycle({ name: 'dup' });
    const comp2 = createLifecycle({ name: 'dup' });

    boot.register(comp1);

    assert.throws(
      () => boot.register(comp2),
      /E6002|already registered|DUPLICATE/
    );
  });

  test('should boot components in dependency order', async () => {
    const order = [];

    const a = createLifecycle({
      name: 'a',
      dependencies: [],
      initialize: async () => order.push('a'),
    });

    const b = createLifecycle({
      name: 'b',
      dependencies: ['a'],
      initialize: async () => order.push('b'),
    });

    const c = createLifecycle({
      name: 'c',
      dependencies: ['b'],
      initialize: async () => order.push('c'),
    });

    // Register out of order
    boot.register(c);
    boot.register(a);
    boot.register(b);

    const result = await boot.boot();

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(order, ['a', 'b', 'c']);
    assert.deepStrictEqual(result.components, ['a', 'b', 'c']);
  });

  test('should detect circular dependencies', async () => {
    const a = createLifecycle({
      name: 'a',
      dependencies: ['b'],
    });

    const b = createLifecycle({
      name: 'b',
      dependencies: ['a'],
    });

    boot.register(a);
    boot.register(b);

    // Should throw an error (could be CIRCULAR_DEPENDENCY error code or message)
    await assert.rejects(
      () => boot.boot()
    );
  });

  test('should shutdown in reverse order', async () => {
    const order = [];

    const a = createLifecycle({
      name: 'a',
      dependencies: [],
      stop: async () => order.push('a'),
    });

    const b = createLifecycle({
      name: 'b',
      dependencies: ['a'],
      stop: async () => order.push('b'),
    });

    const c = createLifecycle({
      name: 'c',
      dependencies: ['b'],
      stop: async () => order.push('c'),
    });

    boot.register(a);
    boot.register(b);
    boot.register(c);

    await boot.boot();
    const result = await boot.shutdown();

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(order, ['c', 'b', 'a']);
  });

  test('should emit events during boot', async () => {
    const events = [];

    boot.on(BootEvent.COMPONENT_INITIALIZING, (e) => events.push(`init:${e.name}`));
    boot.on(BootEvent.COMPONENT_STARTED, (e) => events.push(`start:${e.name}`));
    boot.on(BootEvent.BOOT_COMPLETED, () => events.push('boot:done'));

    const comp = createLifecycle({ name: 'evented' });
    boot.register(comp);

    await boot.boot();

    assert.ok(events.includes('init:evented'));
    assert.ok(events.includes('start:evented'));
    assert.ok(events.includes('boot:done'));
  });

  test('should aggregate health from all components', async () => {
    const healthy = createLifecycle({
      name: 'healthy',
      health: async () => ({ status: HealthStatus.HEALTHY }),
    });

    const degraded = createLifecycle({
      name: 'degraded',
      health: async () => ({ status: HealthStatus.DEGRADED }),
    });

    boot.register(healthy);
    boot.register(degraded);

    await boot.boot();
    const health = await boot.health();

    assert.strictEqual(health.status, HealthStatus.DEGRADED);
    assert.strictEqual(health.summary.total, 2);
    assert.strictEqual(health.summary.healthy, 1);
    assert.strictEqual(health.summary.degraded, 1);
  });
});

describe('Engine Provider', () => {
  let boot;

  beforeEach(() => {
    boot = new BootManager();
  });

  afterEach(async () => {
    if (boot.state === BootState.RUNNING) {
      await boot.shutdown();
    }
  });

  test('should boot and load all 73 engines', async () => {
    const engines = createEnginesProvider({ silent: true });
    boot.register(engines);

    const result = await boot.boot();
    assert.strictEqual(result.success, true);

    const health = await boot.health();
    assert.strictEqual(health.components.engines.engines.total, 73);
    assert.strictEqual(health.components.engines.engines.failed, 0);
  });

  test('should provide working registry after boot', async () => {
    const engines = createEnginesProvider({ silent: true });
    boot.register(engines);

    await boot.boot();

    // Query engines
    const ethics = engines.registry.getByDomain('ethics');
    assert.ok(ethics.length > 0, 'Should find ethics engines');

    const logic = engines.registry.getByDomain('logic');
    assert.ok(logic.length > 0, 'Should find logic engines');
  });

  test('should provide working orchestrator after boot', async () => {
    const engines = createEnginesProvider({ silent: true });
    boot.register(engines);

    await boot.boot();

    assert.ok(engines.orchestrator, 'Should have orchestrator');
  });

  test('should filter by domain', async () => {
    const engines = createEnginesProvider({
      silent: true,
      domains: ['ethics'],
    });
    boot.register(engines);

    await boot.boot();

    // Should only have ethics engines
    const stats = engines.registry.getStats();
    assert.ok(stats.totalEngines < 73, 'Should have fewer than 73 engines');

    const ethics = engines.registry.getByDomain('ethics');
    assert.ok(ethics.length > 0, 'Should have ethics engines');
  });
});
