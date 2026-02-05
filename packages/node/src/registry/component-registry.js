/**
 * ComponentRegistry - Auto-discovery and auto-wiring system
 *
 * "Le chien connecte tout" - κυνικός
 *
 * CYNIC auto-wires components by design:
 * 1. Auto-discover new modules via glob patterns
 * 2. Auto-register in central registry
 * 3. Auto-wire dependencies between components
 * 4. Auto-test after registration
 *
 * @module @cynic/node/registry/component-registry
 */

'use strict';

import { PHI_INV } from '@cynic/core';
import { EventEmitter } from 'events';

/**
 * Component categories with their discovery patterns
 */
export const ComponentCategory = {
  INFERENCE: 'inference',      // Math modules (Bayes, Poisson, Gaussian)
  ORGANISM: 'organism',        // Life metrics (Metabolism, Vitality, etc.)
  AGENT: 'agent',              // Collective Dogs
  MEMORY: 'memory',            // SharedMemory, etc.
  JUDGE: 'judge',              // Judgment system
  PERCEPTION: 'perception',    // Input processing
  LEARNING: 'learning',        // Learning pipeline
  SERVICE: 'service',          // External services
};

/**
 * Component metadata schema
 */
export const ComponentMetadata = {
  /**
   * Create metadata for a component
   * @param {Object} config - Component config
   * @returns {Object} Metadata
   */
  create(config) {
    return {
      name: config.name,
      category: config.category || ComponentCategory.SERVICE,
      version: config.version || '1.0.0',
      dependencies: config.dependencies || [],
      provides: config.provides || [],
      singleton: config.singleton ?? true,
      autoWire: config.autoWire ?? true,
      testFile: config.testFile || null,
      registeredAt: Date.now(),
    };
  },
};

/**
 * Dependency injection container
 */
class DIContainer {
  constructor() {
    this.instances = new Map();
    this.factories = new Map();
  }

  /**
   * Register a factory function
   */
  registerFactory(name, factory, singleton = true) {
    this.factories.set(name, { factory, singleton });
  }

  /**
   * Get or create an instance
   */
  resolve(name) {
    // Return cached singleton if exists
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    const entry = this.factories.get(name);
    if (!entry) {
      throw new Error(`[DIContainer] Unknown component: ${name}`);
    }

    const instance = entry.factory(this);

    if (entry.singleton) {
      this.instances.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if component is registered
   */
  has(name) {
    return this.factories.has(name) || this.instances.has(name);
  }

  /**
   * Clear all instances (for testing)
   */
  clear() {
    this.instances.clear();
  }
}

/**
 * ComponentRegistry - Central registry for all CYNIC components
 */
export class ComponentRegistry extends EventEmitter {
  constructor() {
    super();

    // Component storage by category
    this.components = new Map();
    for (const category of Object.values(ComponentCategory)) {
      this.components.set(category, new Map());
    }

    // Dependency injection container
    this.container = new DIContainer();

    // Discovery patterns (relative to src/)
    this.patterns = {
      [ComponentCategory.INFERENCE]: 'inference/*.js',
      [ComponentCategory.ORGANISM]: 'organism/*.js',
      [ComponentCategory.AGENT]: 'agents/collective/*.js',
      [ComponentCategory.MEMORY]: 'memory/*.js',
      [ComponentCategory.JUDGE]: 'judge/*.js',
      [ComponentCategory.PERCEPTION]: 'perception/*.js',
      [ComponentCategory.LEARNING]: 'learning/*.js',
      [ComponentCategory.SERVICE]: 'services/*.js',
    };

    // Wiring rules: category -> [categories it should wire to]
    this.wiringRules = {
      [ComponentCategory.JUDGE]: [ComponentCategory.INFERENCE, ComponentCategory.ORGANISM],
      [ComponentCategory.AGENT]: [ComponentCategory.INFERENCE, ComponentCategory.ORGANISM, ComponentCategory.MEMORY],
      [ComponentCategory.MEMORY]: [ComponentCategory.INFERENCE],
      [ComponentCategory.LEARNING]: [ComponentCategory.INFERENCE, ComponentCategory.ORGANISM],
    };

    // Test mapping
    this.testPatterns = {
      [ComponentCategory.INFERENCE]: 'test/*.test.js',
      [ComponentCategory.ORGANISM]: 'test/organism.test.js',
      [ComponentCategory.AGENT]: 'test/collective-*.test.js',
      [ComponentCategory.MEMORY]: 'test/shared-memory.test.js',
      [ComponentCategory.JUDGE]: 'test/judge.test.js',
    };

    // Stats
    this.stats = {
      registered: 0,
      wired: 0,
      discovered: 0,
      testsPassed: 0,
      testsFailed: 0,
    };

    // Initialization flag
    this.initialized = false;
  }

  /**
   * Register a component
   * @param {Object} component - Component class or factory
   * @param {Object} metadata - Component metadata
   * @returns {string} Component ID
   */
  register(component, metadata) {
    const meta = ComponentMetadata.create(metadata);
    const id = `${meta.category}:${meta.name}`;

    // Store in category map
    const categoryMap = this.components.get(meta.category);
    if (!categoryMap) {
      throw new Error(`[Registry] Unknown category: ${meta.category}`);
    }

    categoryMap.set(meta.name, {
      component,
      metadata: meta,
      wired: false,
      wireTargets: [],
    });

    // Register factory in DI container
    this.container.registerFactory(id, (container) => {
      // Resolve dependencies first
      const deps = {};
      for (const depName of meta.dependencies) {
        if (container.has(depName)) {
          deps[depName] = container.resolve(depName);
        }
      }

      // Create instance
      if (typeof component === 'function') {
        // Class or factory function
        try {
          return new component(deps);
        } catch {
          return component(deps);
        }
      }
      return component;
    }, meta.singleton);

    this.stats.registered++;
    this.emit('registered', { id, metadata: meta });

    // Auto-wire if enabled
    if (meta.autoWire) {
      this._autoWire(id, meta);
    }

    return id;
  }

  /**
   * Get a component instance
   * @param {string} category - Component category
   * @param {string} name - Component name
   * @returns {Object} Component instance
   */
  get(category, name) {
    const id = `${category}:${name}`;
    return this.container.resolve(id);
  }

  /**
   * Get all components in a category
   * @param {string} category - Category name
   * @returns {Map} Components map
   */
  getCategory(category) {
    return this.components.get(category) || new Map();
  }

  /**
   * Check if component exists
   * @param {string} category - Category
   * @param {string} name - Name
   * @returns {boolean}
   */
  has(category, name) {
    const categoryMap = this.components.get(category);
    return categoryMap?.has(name) || false;
  }

  /**
   * Auto-wire a component based on wiring rules
   * @private
   */
  _autoWire(id, metadata) {
    const rules = this.wiringRules[metadata.category];
    if (!rules) return;

    const entry = this._getEntry(id);
    if (!entry) return;

    for (const targetCategory of rules) {
      const targetComponents = this.components.get(targetCategory);
      if (!targetComponents) continue;

      for (const [name, target] of targetComponents) {
        const targetId = `${targetCategory}:${name}`;

        // Check if target provides something we need
        const needed = metadata.dependencies.some(
          dep => target.metadata.provides.includes(dep)
        );

        if (needed || target.metadata.provides.length > 0) {
          entry.wireTargets.push(targetId);
          this.stats.wired++;
        }
      }
    }

    if (entry.wireTargets.length > 0) {
      entry.wired = true;
      this.emit('wired', { id, targets: entry.wireTargets });
    }
  }

  /**
   * Get registry entry by ID
   * @private
   */
  _getEntry(id) {
    const [category, name] = id.split(':');
    const categoryMap = this.components.get(category);
    return categoryMap?.get(name);
  }

  /**
   * Discover and register components from file system
   * @param {string} basePath - Base path for discovery
   * @returns {Promise<Object>} Discovery results
   */
  async discover(basePath) {
    const results = {
      discovered: [],
      errors: [],
    };

    // Dynamic import for glob (ESM)
    const { glob } = await import('glob');
    const path = await import('path');
    const { pathToFileURL } = await import('url');

    for (const [category, pattern] of Object.entries(this.patterns)) {
      const fullPattern = path.join(basePath, pattern).replace(/\\/g, '/');

      try {
        const files = await glob(fullPattern);

        for (const file of files) {
          // Skip index files and test files
          if (file.endsWith('index.js') || file.includes('.test.')) continue;

          try {
            const fileUrl = pathToFileURL(file).href;
            const module = await import(fileUrl);

            // Find exportable components (classes or factories)
            for (const [exportName, exported] of Object.entries(module)) {
              if (exportName === 'default') continue;

              // Check if it's a class or has CYNIC_COMPONENT marker
              const isComponent =
                typeof exported === 'function' &&
                (exported.prototype?.constructor ||
                 exported.CYNIC_COMPONENT ||
                 exportName.endsWith('Tracker') ||
                 exportName.endsWith('Distribution') ||
                 exportName.endsWith('Agent') ||
                 exportName.endsWith('Memory'));

              if (isComponent) {
                const componentName = exportName;
                const provides = this._inferProvides(exportName, module);

                // Don't re-register existing components
                if (this.has(category, componentName)) continue;

                this.register(exported, {
                  name: componentName,
                  category,
                  provides,
                  dependencies: this._inferDependencies(category),
                  testFile: this.testPatterns[category],
                });

                results.discovered.push({
                  name: componentName,
                  category,
                  file,
                });

                this.stats.discovered++;
              }
            }
          } catch (err) {
            results.errors.push({ file, error: err.message });
          }
        }
      } catch (err) {
        results.errors.push({ pattern: fullPattern, error: err.message });
      }
    }

    this.emit('discovered', results);
    return results;
  }

  /**
   * Infer what a component provides based on its name
   * @private
   */
  _inferProvides(name, module) {
    const provides = [];

    // Check for common patterns
    if (name.includes('Gaussian') || name.includes('gaussian')) {
      provides.push('gaussian', 'computeStats', 'zScore', 'GaussianDistribution');
    }
    if (name.includes('Poisson') || name.includes('poisson')) {
      provides.push('poisson', 'detectAnomaly', 'estimateRate');
    }
    if (name.includes('Bayes') || name.includes('bayes')) {
      provides.push('bayes', 'updateBelief', 'BetaDistribution');
    }
    if (name.includes('Tracker')) {
      provides.push(name.toLowerCase().replace('tracker', ''));
    }

    // Check module exports
    const exports = Object.keys(module).filter(k => k !== 'default');
    provides.push(...exports.slice(0, 5)); // Top 5 exports

    return [...new Set(provides)];
  }

  /**
   * Infer dependencies based on category
   * @private
   */
  _inferDependencies(category) {
    const deps = [];

    switch (category) {
      case ComponentCategory.JUDGE:
        deps.push('inference:bayes', 'organism:metabolism');
        break;
      case ComponentCategory.AGENT:
        deps.push('inference:poisson', 'inference:gaussian', 'organism:homeostasis');
        break;
      case ComponentCategory.MEMORY:
        deps.push('inference:bayes', 'inference:gaussian');
        break;
      case ComponentCategory.LEARNING:
        deps.push('inference:bayes', 'organism:growth');
        break;
    }

    return deps;
  }

  /**
   * Run tests for affected components
   * @param {string[]} componentIds - Component IDs to test
   * @returns {Promise<Object>} Test results
   */
  async runTests(componentIds = []) {
    const { spawn } = await import('child_process');
    const path = await import('path');

    // Determine test files to run
    const testFiles = new Set();
    for (const id of componentIds) {
      const entry = this._getEntry(id);
      if (entry?.metadata?.testFile) {
        testFiles.add(entry.metadata.testFile);
      }
    }

    if (testFiles.size === 0) {
      return { skipped: true, reason: 'No test files mapped' };
    }

    // Run tests
    const results = {
      passed: 0,
      failed: 0,
      files: [],
    };

    for (const testFile of testFiles) {
      try {
        const exitCode = await new Promise((resolve) => {
          const proc = spawn('node', ['--test', testFile], {
            cwd: path.dirname(path.dirname(__dirname)),
            stdio: 'pipe',
          });

          let output = '';
          proc.stdout?.on('data', (d) => { output += d; });
          proc.stderr?.on('data', (d) => { output += d; });

          proc.on('close', (code) => {
            results.files.push({ file: testFile, passed: code === 0, output });
            resolve(code);
          });
        });

        if (exitCode === 0) {
          results.passed++;
          this.stats.testsPassed++;
        } else {
          results.failed++;
          this.stats.testsFailed++;
        }
      } catch (err) {
        results.files.push({ file: testFile, passed: false, error: err.message });
        results.failed++;
      }
    }

    this.emit('tested', results);
    return results;
  }

  /**
   * Get wiring report
   * @returns {Object} Wiring status
   */
  getWiringReport() {
    const report = {
      categories: {},
      totalComponents: 0,
      totalWired: 0,
      unwired: [],
      connections: [],
    };

    for (const [category, components] of this.components) {
      const categoryReport = {
        count: components.size,
        wired: 0,
        components: [],
      };

      for (const [name, entry] of components) {
        const id = `${category}:${name}`;
        categoryReport.components.push({
          name,
          wired: entry.wired,
          wireTargets: entry.wireTargets,
          provides: entry.metadata.provides,
          dependencies: entry.metadata.dependencies,
        });

        if (entry.wired) {
          categoryReport.wired++;
          report.totalWired++;
          for (const target of entry.wireTargets) {
            report.connections.push({ from: id, to: target });
          }
        } else if (entry.metadata.dependencies.length > 0) {
          report.unwired.push(id);
        }

        report.totalComponents++;
      }

      report.categories[category] = categoryReport;
    }

    return report;
  }

  /**
   * Get registry stats
   */
  getStats() {
    return {
      ...this.stats,
      categories: Object.fromEntries(
        [...this.components.entries()].map(([k, v]) => [k, v.size])
      ),
      wiringHealth: this.stats.registered > 0
        ? Math.min(PHI_INV, this.stats.wired / this.stats.registered)
        : 0,
    };
  }

  /**
   * Reset registry (for testing)
   */
  reset() {
    for (const category of this.components.values()) {
      category.clear();
    }
    this.container.clear();
    this.stats = {
      registered: 0,
      wired: 0,
      discovered: 0,
      testsPassed: 0,
      testsFailed: 0,
    };
    this.initialized = false;
  }
}

// Singleton instance
let registryInstance = null;

/**
 * Get the global registry instance
 * @returns {ComponentRegistry}
 */
export function getRegistry() {
  if (!registryInstance) {
    registryInstance = new ComponentRegistry();
  }
  return registryInstance;
}

/**
 * Component decorator/marker for auto-registration
 * Use: MyClass.CYNIC_COMPONENT = createComponentMarker({...})
 */
export function createComponentMarker(config) {
  return {
    CYNIC_COMPONENT: true,
    ...ComponentMetadata.create(config),
  };
}

export default ComponentRegistry;
