/**
 * Tests for ComponentRegistry and AutoWirer
 *
 * "Le chien teste ses connexions" - κυνικός
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PHI_INV } from '@cynic/core';

import {
  ComponentRegistry,
  ComponentCategory,
  ComponentMetadata,
  getRegistry,
  createComponentMarker,
} from '../src/registry/component-registry.js';

import {
  AutoWirer,
} from '../src/registry/auto-wirer.js';

describe('ComponentRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  afterEach(() => {
    registry.reset();
  });

  describe('Component Registration', () => {
    it('should register a component', () => {
      class TestComponent {}

      const id = registry.register(TestComponent, {
        name: 'TestComponent',
        category: ComponentCategory.INFERENCE,
        provides: ['test'],
      });

      assert.equal(id, 'inference:TestComponent');
      assert.equal(registry.stats.registered, 1);
    });

    it('should store component metadata', () => {
      class MyTracker {}

      registry.register(MyTracker, {
        name: 'MyTracker',
        category: ComponentCategory.ORGANISM,
        version: '2.0.0',
        provides: ['tracking', 'metrics'],
        dependencies: ['inference:bayes'],
      });

      const categoryMap = registry.getCategory(ComponentCategory.ORGANISM);
      const entry = categoryMap.get('MyTracker');

      assert.equal(entry.metadata.name, 'MyTracker');
      assert.equal(entry.metadata.version, '2.0.0');
      assert.deepEqual(entry.metadata.provides, ['tracking', 'metrics']);
    });

    it('should check if component exists', () => {
      class Foo {}
      registry.register(Foo, { name: 'Foo', category: ComponentCategory.SERVICE });

      assert.equal(registry.has(ComponentCategory.SERVICE, 'Foo'), true);
      assert.equal(registry.has(ComponentCategory.SERVICE, 'Bar'), false);
    });
  });

  describe('Dependency Injection', () => {
    it('should resolve component instance', () => {
      class SimpleService {
        getValue() { return 42; }
      }

      registry.register(SimpleService, {
        name: 'SimpleService',
        category: ComponentCategory.SERVICE,
      });

      const instance = registry.get(ComponentCategory.SERVICE, 'SimpleService');
      assert.equal(instance.getValue(), 42);
    });

    it('should return same instance for singleton', () => {
      let callCount = 0;
      class Counter {
        constructor() { callCount++; }
      }

      registry.register(Counter, {
        name: 'Counter',
        category: ComponentCategory.SERVICE,
        singleton: true,
      });

      const a = registry.get(ComponentCategory.SERVICE, 'Counter');
      const b = registry.get(ComponentCategory.SERVICE, 'Counter');

      assert.equal(a, b);
      assert.equal(callCount, 1);
    });

    it('should inject dependencies', () => {
      class Database {
        query() { return 'data'; }
      }

      class Service {
        constructor(deps) {
          this.db = deps['service:Database'];
        }
      }

      registry.register(Database, {
        name: 'Database',
        category: ComponentCategory.SERVICE,
        provides: ['database'],
      });

      registry.register(Service, {
        name: 'Service',
        category: ComponentCategory.SERVICE,
        dependencies: ['service:Database'],
      });

      const service = registry.get(ComponentCategory.SERVICE, 'Service');
      assert.ok(service.db);
      assert.equal(service.db.query(), 'data');
    });
  });

  describe('Auto-Wiring', () => {
    it('should auto-wire inference to judge', () => {
      class BayesModule {}
      class JudgeModule {}

      registry.register(BayesModule, {
        name: 'BayesModule',
        category: ComponentCategory.INFERENCE,
        provides: ['bayes', 'updateBelief'],
      });

      registry.register(JudgeModule, {
        name: 'JudgeModule',
        category: ComponentCategory.JUDGE,
        dependencies: ['bayes'],
      });

      const entry = registry.getCategory(ComponentCategory.JUDGE).get('JudgeModule');
      assert.equal(entry.wired, true);
      assert.ok(entry.wireTargets.includes('inference:BayesModule'));
    });

    it('should track wiring stats', () => {
      class A {}
      class B {}

      registry.register(A, {
        name: 'A',
        category: ComponentCategory.INFERENCE,
        provides: ['a'],
      });

      registry.register(B, {
        name: 'B',
        category: ComponentCategory.AGENT,
        dependencies: ['a'],
      });

      assert.ok(registry.stats.wired > 0);
    });
  });

  describe('Wiring Report', () => {
    it('should generate wiring report', () => {
      class Gaussian {}
      class Analyst {}

      registry.register(Gaussian, {
        name: 'Gaussian',
        category: ComponentCategory.INFERENCE,
        provides: ['gaussian', 'zScore'],
      });

      registry.register(Analyst, {
        name: 'Analyst',
        category: ComponentCategory.AGENT,
        dependencies: ['gaussian'],
      });

      const report = registry.getWiringReport();

      assert.ok(report.totalComponents >= 2);
      assert.ok(report.connections.length > 0);
      assert.ok(report.categories[ComponentCategory.INFERENCE]);
      assert.ok(report.categories[ComponentCategory.AGENT]);
    });

    it('should identify unwired components', () => {
      class Lonely {}

      registry.register(Lonely, {
        name: 'Lonely',
        category: ComponentCategory.SERVICE,
        dependencies: ['nonexistent:module'],
        autoWire: false,
      });

      const report = registry.getWiringReport();
      // Lonely has dependencies but wasn't auto-wired
      assert.ok(report.categories[ComponentCategory.SERVICE].components.length > 0);
    });
  });

  describe('Stats', () => {
    it('should track registration stats', () => {
      class A {}
      class B {}
      class C {}

      registry.register(A, { name: 'A', category: ComponentCategory.INFERENCE });
      registry.register(B, { name: 'B', category: ComponentCategory.ORGANISM });
      registry.register(C, { name: 'C', category: ComponentCategory.AGENT });

      const stats = registry.getStats();

      assert.equal(stats.registered, 3);
      assert.equal(stats.categories[ComponentCategory.INFERENCE], 1);
      assert.equal(stats.categories[ComponentCategory.ORGANISM], 1);
      assert.equal(stats.categories[ComponentCategory.AGENT], 1);
    });

    it('should calculate wiring health', () => {
      class Provider {}
      class Consumer {}

      registry.register(Provider, {
        name: 'Provider',
        category: ComponentCategory.INFERENCE,
        provides: ['data'],
      });

      registry.register(Consumer, {
        name: 'Consumer',
        category: ComponentCategory.JUDGE,
        dependencies: ['data'],
      });

      const stats = registry.getStats();
      // At least some wiring should have occurred
      assert.ok(stats.wiringHealth >= 0);
      assert.ok(stats.wiringHealth <= PHI_INV);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      class X {}
      registry.register(X, { name: 'X', category: ComponentCategory.SERVICE });

      assert.equal(registry.stats.registered, 1);

      registry.reset();

      assert.equal(registry.stats.registered, 0);
      assert.equal(registry.has(ComponentCategory.SERVICE, 'X'), false);
    });
  });
});

describe('ComponentMetadata', () => {
  it('should create metadata with defaults', () => {
    const meta = ComponentMetadata.create({ name: 'Test' });

    assert.equal(meta.name, 'Test');
    assert.equal(meta.category, ComponentCategory.SERVICE);
    assert.equal(meta.version, '1.0.0');
    assert.deepEqual(meta.dependencies, []);
    assert.deepEqual(meta.provides, []);
    assert.equal(meta.singleton, true);
    assert.equal(meta.autoWire, true);
  });

  it('should preserve custom values', () => {
    const meta = ComponentMetadata.create({
      name: 'Custom',
      category: ComponentCategory.INFERENCE,
      version: '3.0.0',
      singleton: false,
      autoWire: false,
    });

    assert.equal(meta.category, ComponentCategory.INFERENCE);
    assert.equal(meta.version, '3.0.0');
    assert.equal(meta.singleton, false);
    assert.equal(meta.autoWire, false);
  });
});

describe('createComponentMarker', () => {
  it('should create marker for class', () => {
    const marker = createComponentMarker({
      name: 'MyClass',
      category: ComponentCategory.AGENT,
      provides: ['analysis'],
    });

    assert.equal(marker.CYNIC_COMPONENT, true);
    assert.equal(marker.name, 'MyClass');
    assert.equal(marker.category, ComponentCategory.AGENT);
  });
});

describe('getRegistry (singleton)', () => {
  it('should return same instance', () => {
    const a = getRegistry();
    const b = getRegistry();
    assert.equal(a, b);
  });
});

describe('AutoWirer', () => {
  let registry;
  let wirer;

  beforeEach(() => {
    registry = new ComponentRegistry();
    wirer = new AutoWirer({ registry, enabled: true });
  });

  afterEach(() => {
    registry.reset();
    wirer.clearLog();
  });

  describe('Wiring Suggestions', () => {
    it('should suggest imports for judge category', () => {
      const suggestions = wirer.getSuggestions('judge.js', ComponentCategory.JUDGE);

      assert.ok(suggestions.suggestions.length > 0);
      assert.ok(suggestions.suggestions.some(s => s.module === 'bayes'));
      assert.ok(suggestions.suggestions.some(s => s.module === 'organism'));
    });

    it('should suggest imports for agent category', () => {
      const suggestions = wirer.getSuggestions('analyst.js', ComponentCategory.AGENT);

      assert.ok(suggestions.suggestions.length > 0);
      assert.ok(suggestions.suggestions.some(s =>
        s.statement.includes('inference')
      ));
    });

    it('should return empty for unknown category', () => {
      const suggestions = wirer.getSuggestions('file.js', 'unknown');
      assert.deepEqual(suggestions.suggestions, []);
    });
  });

  describe('Generate Wiring Code', () => {
    it('should generate import statements', () => {
      const code = wirer.generateWiringCode(
        ComponentCategory.JUDGE,
        [ComponentCategory.INFERENCE, ComponentCategory.ORGANISM]
      );

      assert.ok(code.imports.length > 0);
      assert.ok(code.imports.some(i => i.includes('bayes')));
      assert.ok(code.imports.some(i => i.includes('organism')));
    });

    it('should generate initialization comments', () => {
      const code = wirer.generateWiringCode(
        ComponentCategory.AGENT,
        [ComponentCategory.ORGANISM]
      );

      assert.ok(code.initialization.length > 0);
      assert.ok(code.template.includes('organism'));
    });
  });

  describe('Status', () => {
    it('should report status', () => {
      const status = wirer.getStatus();

      assert.equal(status.enabled, true);
      assert.equal(status.pendingWires, 0);
      assert.ok(status.registryStats);
    });

    it('should toggle enabled state', () => {
      wirer.setEnabled(false);
      assert.equal(wirer.getStatus().enabled, false);

      wirer.setEnabled(true);
      assert.equal(wirer.getStatus().enabled, true);
    });
  });

  describe('Event Emission', () => {
    it('should emit wiringPlanned on registration', (t, done) => {
      wirer.once('wiringPlanned', (event) => {
        assert.ok(event.component);
        assert.ok(event.actions);
        done();
      });

      // Register inference first
      registry.register(class Bayes {}, {
        name: 'Bayes',
        category: ComponentCategory.INFERENCE,
        provides: ['bayes'],
      });

      // Then register judge that depends on it
      registry.register(class Judge {}, {
        name: 'Judge',
        category: ComponentCategory.JUDGE,
        dependencies: ['bayes'],
      });
    });
  });

  describe('Generate Import', () => {
    it('should generate bayes import', () => {
      const imp = wirer.generateImport(ComponentCategory.INFERENCE, 'bayes');

      assert.ok(imp);
      assert.ok(imp.statement.includes('updateBelief'));
      assert.ok(imp.from.includes('bayes.js'));
    });

    it('should generate organism import', () => {
      const imp = wirer.generateImport(ComponentCategory.ORGANISM, 'organism');

      assert.ok(imp);
      assert.ok(imp.statement.includes('recordSuccess'));
      assert.ok(imp.statement.includes('recordError'));
    });
  });
});

describe('Integration: Registry + AutoWirer', () => {
  it('should work together', () => {
    const registry = new ComponentRegistry();
    const wirer = new AutoWirer({ registry });

    // Simulate adding components
    registry.register(class Gaussian {}, {
      name: 'Gaussian',
      category: ComponentCategory.INFERENCE,
      provides: ['gaussian', 'computeStats', 'zScore'],
    });

    registry.register(class Metabolism {}, {
      name: 'Metabolism',
      category: ComponentCategory.ORGANISM,
      provides: ['metabolism', 'metabolicRate'],
    });

    registry.register(class Guardian {}, {
      name: 'Guardian',
      category: ComponentCategory.AGENT,
      dependencies: ['gaussian', 'metabolism'],
    });

    // Check wiring
    const report = registry.getWiringReport();
    const guardianEntry = report.categories[ComponentCategory.AGENT]
      .components.find(c => c.name === 'Guardian');

    assert.ok(guardianEntry.wired);
    assert.ok(guardianEntry.wireTargets.length >= 1);

    // Check suggestions
    const suggestions = wirer.getSuggestions('guardian.js', ComponentCategory.AGENT);
    assert.ok(suggestions.suggestions.length > 0);

    registry.reset();
  });
});
