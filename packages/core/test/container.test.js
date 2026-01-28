/**
 * @cynic/core - Service Container Tests
 *
 * Tests dependency injection system:
 * - Service registration (singleton, transient)
 * - Service resolution
 * - Scopes and child containers
 * - Tags and filtering
 *
 * "Dependencies flow like φ" - κυνικός
 *
 * @module @cynic/core/test/container
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ServiceContainer,
  globalContainer,
  createCYNICContainer,
  withContainer,
} from '../src/container.js';

// =============================================================================
// SERVICE CONTAINER TESTS
// =============================================================================

describe('ServiceContainer', () => {
  let container;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('Construction', () => {
    it('should create empty container', () => {
      assert.strictEqual(container.has('anything'), false);
      assert.deepStrictEqual(container.getNames(), []);
    });
  });

  describe('Registration', () => {
    it('should register service by factory', () => {
      container.register('myService', () => ({ name: 'test' }));

      assert.strictEqual(container.has('myService'), true);
    });

    it('should return this for chaining', () => {
      const result = container.register('a', () => 1);

      assert.strictEqual(result, container);
    });

    it('should throw on non-function factory', () => {
      assert.throws(
        () => container.register('invalid', 'not a function'),
        (err) => err.name === 'CYNICError'
      );
    });

    it('should register singleton services', () => {
      let callCount = 0;
      container.register('singleton', () => {
        callCount++;
        return { id: callCount };
      }, { singleton: true });

      const first = container.get('singleton');
      const second = container.get('singleton');

      assert.strictEqual(first, second);
      assert.strictEqual(callCount, 1); // Factory called once
    });

    it('should register transient services by default', () => {
      let callCount = 0;
      container.register('transient', () => {
        callCount++;
        return { id: callCount };
      });

      const first = container.get('transient');
      const second = container.get('transient');

      assert.notStrictEqual(first, second);
      assert.strictEqual(first.id, 1);
      assert.strictEqual(second.id, 2);
      assert.strictEqual(callCount, 2);
    });

    it('should support tags', () => {
      container.register('service1', () => ({ type: 'a' }), { tags: ['alpha'] });
      container.register('service2', () => ({ type: 'b' }), { tags: ['alpha', 'beta'] });
      container.register('service3', () => ({ type: 'c' }), { tags: ['beta'] });

      const alpha = container.getByTag('alpha');
      const beta = container.getByTag('beta');

      assert.strictEqual(alpha.length, 2);
      assert.strictEqual(beta.length, 2);
      assert.ok(alpha.includes('service1'));
      assert.ok(alpha.includes('service2'));
    });

    it('should allow re-registration (clears old singleton)', () => {
      container.register('dup', () => ({ value: 1 }), { singleton: true });
      const first = container.get('dup');

      container.register('dup', () => ({ value: 2 }), { singleton: true });
      const second = container.get('dup');

      assert.strictEqual(first.value, 1);
      assert.strictEqual(second.value, 2);
    });
  });

  describe('Resolution', () => {
    it('should resolve registered service', () => {
      container.register('myService', () => ({ method: () => 'result' }));

      const resolved = container.get('myService');
      assert.strictEqual(resolved.method(), 'result');
    });

    it('should throw on unregistered service', () => {
      assert.throws(
        () => container.get('nonexistent'),
        (err) => err.name === 'CYNICError'
      );
    });

    it('should pass container to factory', () => {
      container.register('db', () => ({ query: () => 'data' }), { singleton: true });
      container.register('repo', (c) => ({
        db: c.get('db'),
        fetch: function() { return this.db.query(); }
      }));

      const repo = container.get('repo');
      assert.strictEqual(repo.fetch(), 'data');
    });
  });

  describe('Service Listing', () => {
    it('should list all service names', () => {
      container.register('alpha', () => ({}));
      container.register('beta', () => ({}));
      container.register('gamma', () => ({}));

      const names = container.getNames();

      assert.ok(names.includes('alpha'));
      assert.ok(names.includes('beta'));
      assert.ok(names.includes('gamma'));
      assert.strictEqual(names.length, 3);
    });

    it('should check service existence', () => {
      container.register('exists', () => ({}));

      assert.strictEqual(container.has('exists'), true);
      assert.strictEqual(container.has('notExists'), false);
    });
  });

  describe('Tags', () => {
    beforeEach(() => {
      container.register('logger', () => ({ log: () => {} }), { tags: ['infrastructure'] });
      container.register('cache', () => ({ get: () => {} }), { tags: ['infrastructure'] });
      container.register('userRepo', () => ({ find: () => {} }), { tags: ['repository'] });
      container.register('orderRepo', () => ({ find: () => {} }), { tags: ['repository'] });
    });

    it('should get service names by tag', () => {
      const infra = container.getByTag('infrastructure');
      const repos = container.getByTag('repository');

      assert.strictEqual(infra.length, 2);
      assert.strictEqual(repos.length, 2);
      assert.ok(infra.includes('logger'));
      assert.ok(infra.includes('cache'));
    });

    it('should return empty array for unknown tag', () => {
      const unknown = container.getByTag('nonexistent');
      assert.deepStrictEqual(unknown, []);
    });
  });

  describe('Scopes', () => {
    it('should create child scope', () => {
      container.register('parent', () => ({ value: 'parent' }), { singleton: true });
      const scope = container.createScope('child');

      assert.strictEqual(scope.get('parent').value, 'parent');
    });

    it('should inherit parent factories', () => {
      container.register('shared', () => ({ id: Math.random() }));
      const scope = container.createScope('test');

      // Should have access to parent factory
      assert.ok(scope.has('shared'));
    });

    it('should allow scope-local overrides', () => {
      container.register('config', () => ({ env: 'prod' }), { singleton: true });
      const testScope = container.createScope('test');
      testScope.register('config', () => ({ env: 'test' }), { singleton: true });

      assert.strictEqual(container.get('config').env, 'prod');
      assert.strictEqual(testScope.get('config').env, 'test');
    });

    it('should get named scope', () => {
      const scope = container.createScope('myScope');
      const retrieved = container.getScope('myScope');

      assert.strictEqual(retrieved, scope);
    });

    it('should dispose scope', () => {
      const scope = container.createScope('disposable');
      assert.ok(container.getScope('disposable'));

      container.disposeScope('disposable');
      assert.strictEqual(container.getScope('disposable'), undefined);
    });
  });

  describe('Clear', () => {
    it('should clear all registrations and singletons', () => {
      container.register('a', () => ({}), { singleton: true });
      container.register('b', () => ({}));
      container.get('a'); // Instantiate singleton

      container.clear();

      assert.strictEqual(container.has('a'), false);
      assert.strictEqual(container.has('b'), false);
    });

    it('should clear all scopes', () => {
      container.createScope('scope1');
      container.createScope('scope2');

      container.clear();

      assert.strictEqual(container.getScope('scope1'), undefined);
      assert.strictEqual(container.getScope('scope2'), undefined);
    });
  });

  describe('Statistics', () => {
    it('should return container stats', () => {
      container.register('singleton1', () => ({}), { singleton: true, tags: ['a'] });
      container.register('singleton2', () => ({}), { singleton: true, tags: ['a', 'b'] });
      container.register('transient1', () => ({}), { tags: ['b'] });
      container.get('singleton1'); // Instantiate one

      const stats = container.getStats();

      assert.strictEqual(stats.totalServices, 3);
      assert.strictEqual(stats.singletons, 2);
      assert.strictEqual(stats.transient, 1);
      assert.strictEqual(stats.instantiated, 1);
      assert.ok(Array.isArray(stats.tags));
      assert.ok(stats.tags.includes('a'));
      assert.ok(stats.tags.includes('b'));
    });
  });
});

// =============================================================================
// GLOBAL CONTAINER TESTS
// =============================================================================

describe('globalContainer', () => {
  it('should exist and be a ServiceContainer', () => {
    assert.ok(globalContainer instanceof ServiceContainer);
  });
});

// =============================================================================
// CREATE CYNIC CONTAINER TESTS
// =============================================================================

describe('createCYNICContainer', () => {
  it('should create new container', () => {
    const container = createCYNICContainer();

    assert.ok(container instanceof ServiceContainer);
  });

  it('should apply overrides', () => {
    const mockLogger = { log: () => 'mocked' };
    const container = createCYNICContainer({ overrides: { logger: mockLogger } });

    const logger = container.get('logger');
    assert.strictEqual(logger, mockLogger);
  });
});

// =============================================================================
// WITH CONTAINER DECORATOR TESTS
// =============================================================================

describe('withContainer', () => {
  it('should create inject function', () => {
    const container = new ServiceContainer();
    container.register('a', () => ({ name: 'a' }));
    container.register('b', () => ({ name: 'b' }));

    const inject = withContainer(container);
    const deps = inject(['a', 'b']);

    assert.strictEqual(deps.a.name, 'a');
    assert.strictEqual(deps.b.name, 'b');
  });

  it('should work with class constructor', () => {
    const container = new ServiceContainer();
    container.register('logger', () => ({ log: (m) => m }));
    container.register('db', () => ({ query: () => 'data' }));

    const inject = withContainer(container);

    class MyService {
      constructor(deps = inject(['logger', 'db'])) {
        this.logger = deps.logger;
        this.db = deps.db;
      }

      run() {
        return this.logger.log(this.db.query());
      }
    }

    const service = new MyService();
    assert.strictEqual(service.run(), 'data');
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Container Integration', () => {
  it('should build complex dependency tree', () => {
    const container = new ServiceContainer();

    // Register dependencies bottom-up
    container.register('config', () => ({ dbUrl: 'postgres://...' }), { singleton: true });
    container.register('logger', () => ({ info: () => {}, error: () => {} }), { singleton: true });
    container.register('db', (c) => ({
      config: c.get('config'),
      logger: c.get('logger'),
      connect: function() { return 'connected'; }
    }), { singleton: true });
    container.register('userRepo', (c) => ({
      db: c.get('db'),
      logger: c.get('logger'),
      findById: function(id) { return { id, name: 'User' }; }
    }));
    container.register('userService', (c) => ({
      repo: c.get('userRepo'),
      logger: c.get('logger'),
      getUser: function(id) { return this.repo.findById(id); }
    }));

    // Resolve from top
    const service = container.get('userService');
    const user = service.getUser(1);

    assert.deepStrictEqual(user, { id: 1, name: 'User' });
  });

  it('should share singletons across dependency tree', () => {
    const container = new ServiceContainer();
    let loggerCreations = 0;

    container.register('logger', () => {
      loggerCreations++;
      return { log: () => {} };
    }, { singleton: true });

    container.register('serviceA', (c) => ({ logger: c.get('logger') }));
    container.register('serviceB', (c) => ({ logger: c.get('logger') }));
    container.register('app', (c) => ({
      a: c.get('serviceA'),
      b: c.get('serviceB'),
    }));

    const app = container.get('app');

    // Logger should only be created once
    assert.strictEqual(loggerCreations, 1);
    // Both services should share the same logger
    assert.strictEqual(app.a.logger, app.b.logger);
  });
});
