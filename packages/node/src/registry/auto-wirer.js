/**
 * AutoWirer - Automatic component wiring system
 *
 * "φ connects everything" - κυνικός
 *
 * Watches for new components and automatically:
 * 1. Discovers them
 * 2. Registers them in the registry
 * 3. Wires dependencies
 * 4. Runs affected tests
 *
 * @module @cynic/node/registry/auto-wirer
 */

'use strict';

import { EventEmitter } from 'events';
import { getRegistry, ComponentCategory } from './component-registry.js';

/**
 * Wiring templates - how to wire each category
 */
const WIRING_TEMPLATES = {
  [ComponentCategory.INFERENCE]: {
    // Inference modules provide functions to other components
    targetCategories: [],
    injectInto: ['judge', 'agent', 'memory'],
    injectAs: 'inference',
  },
  [ComponentCategory.ORGANISM]: {
    // Organism modules track metrics
    targetCategories: [],
    injectInto: ['judge', 'agent'],
    injectAs: 'organism',
  },
  [ComponentCategory.AGENT]: {
    // Agents use inference and organism
    targetCategories: [ComponentCategory.INFERENCE, ComponentCategory.ORGANISM],
    injectInto: [],
    injectAs: null,
  },
  [ComponentCategory.JUDGE]: {
    // Judge uses inference and organism
    targetCategories: [ComponentCategory.INFERENCE, ComponentCategory.ORGANISM],
    injectInto: [],
    injectAs: null,
  },
  [ComponentCategory.MEMORY]: {
    // Memory uses inference
    targetCategories: [ComponentCategory.INFERENCE],
    injectInto: [],
    injectAs: null,
  },
};

/**
 * Import mapping - which imports to add for each category
 */
const IMPORT_TEMPLATES = {
  [ComponentCategory.INFERENCE]: {
    bayes: {
      from: '../inference/bayes.js',
      imports: ['updateBelief', 'BetaDistribution', 'likelihoodRatio'],
    },
    poisson: {
      from: '../inference/poisson.js',
      imports: ['detectAnomaly', 'estimateRate', 'EventRateTracker'],
    },
    gaussian: {
      from: '../inference/gaussian.js',
      imports: ['computeStats', 'zScore', 'GaussianDistribution'],
    },
  },
  [ComponentCategory.ORGANISM]: {
    organism: {
      from: '../organism/index.js',
      imports: ['recordSuccess', 'recordError', 'recordGrowth', 'updateHomeostasis'],
    },
  },
};

/**
 * AutoWirer - Watches and auto-wires components
 */
export class AutoWirer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.registry = options.registry || getRegistry();
    this.basePath = options.basePath || null;
    this.enabled = options.enabled ?? true;
    this.autoTest = options.autoTest ?? false;

    // Track pending wiring operations
    this.pendingWires = [];

    // Track what's been wired
    this.wiringLog = [];

    // Subscribe to registry events
    this.registry.on('registered', this._onComponentRegistered.bind(this));
    this.registry.on('discovered', this._onDiscoveryComplete.bind(this));
  }

  /**
   * Initialize the auto-wirer with base path
   * @param {string} basePath - Base path for source files
   */
  async init(basePath) {
    this.basePath = basePath;

    // Perform initial discovery
    const results = await this.registry.discover(basePath);

    this.emit('initialized', {
      discovered: results.discovered.length,
      errors: results.errors.length,
    });

    return results;
  }

  /**
   * Handle new component registration
   * @private
   */
  _onComponentRegistered(event) {
    if (!this.enabled) return;

    const { id, metadata } = event;

    // Determine wiring actions needed
    const wiringActions = this._planWiring(id, metadata);

    if (wiringActions.length > 0) {
      this.pendingWires.push(...wiringActions);
      this.emit('wiringPlanned', { component: id, actions: wiringActions });
    }
  }

  /**
   * Handle discovery completion
   * @private
   */
  async _onDiscoveryComplete(results) {
    if (!this.enabled) return;

    // Process all pending wires
    for (const wire of this.pendingWires) {
      try {
        await this._executeWiring(wire);
        this.wiringLog.push({ ...wire, status: 'success', at: Date.now() });
      } catch (err) {
        this.wiringLog.push({ ...wire, status: 'failed', error: err.message, at: Date.now() });
      }
    }

    this.pendingWires = [];

    // Run tests if enabled
    if (this.autoTest && results.discovered.length > 0) {
      const componentIds = results.discovered.map(d => `${d.category}:${d.name}`);
      const testResults = await this.registry.runTests(componentIds);
      this.emit('tested', testResults);
    }

    this.emit('wiringComplete', {
      wired: this.wiringLog.filter(l => l.status === 'success').length,
      failed: this.wiringLog.filter(l => l.status === 'failed').length,
    });
  }

  /**
   * Plan wiring actions for a component
   * @private
   */
  _planWiring(componentId, metadata) {
    const actions = [];
    const template = WIRING_TEMPLATES[metadata.category];

    if (!template) return actions;

    // If this component should be injected into others
    if (template.injectInto.length > 0) {
      for (const targetCategory of template.injectInto) {
        const targets = this.registry.getCategory(targetCategory);
        for (const [name] of targets) {
          actions.push({
            type: 'inject',
            source: componentId,
            target: `${targetCategory}:${name}`,
            as: template.injectAs,
          });
        }
      }
    }

    // If this component needs dependencies from other categories
    if (template.targetCategories.length > 0) {
      for (const sourceCategory of template.targetCategories) {
        const sources = this.registry.getCategory(sourceCategory);
        for (const [name] of sources) {
          actions.push({
            type: 'depend',
            source: `${sourceCategory}:${name}`,
            target: componentId,
          });
        }
      }
    }

    return actions;
  }

  /**
   * Execute a wiring action
   * @private
   */
  async _executeWiring(wire) {
    // For now, wiring is declarative - actual injection happens at resolve time
    // This method could generate import statements or modify files in the future

    this.emit('wireExecuted', wire);
    return wire;
  }

  /**
   * Generate import statement for a component
   * @param {string} category - Source category
   * @param {string} componentName - Component name
   * @returns {Object} Import info
   */
  generateImport(category, componentName) {
    const templates = IMPORT_TEMPLATES[category];
    if (!templates) return null;

    const template = templates[componentName.toLowerCase()] ||
                     Object.values(templates)[0];

    if (!template) return null;

    return {
      statement: `import { ${template.imports.join(', ')} } from '${template.from}';`,
      imports: template.imports,
      from: template.from,
    };
  }

  /**
   * Generate wiring code for a target component
   * @param {string} targetCategory - Target category
   * @param {string[]} sourceCategories - Categories to wire from
   * @returns {Object} Generated code
   */
  generateWiringCode(targetCategory, sourceCategories = []) {
    const imports = [];
    const inits = [];

    for (const sourceCategory of sourceCategories) {
      const templates = IMPORT_TEMPLATES[sourceCategory];
      if (!templates) continue;

      for (const [name, template] of Object.entries(templates)) {
        imports.push(`import { ${template.imports.join(', ')} } from '${template.from}';`);

        // Generate initialization code based on category
        if (sourceCategory === ComponentCategory.ORGANISM) {
          inits.push(`// Track in organism after operations`);
          inits.push(`// recordSuccess/recordError/recordGrowth`);
        }
        if (sourceCategory === ComponentCategory.INFERENCE) {
          inits.push(`// Use ${name} for statistical analysis`);
          inits.push(`// ${template.imports.slice(0, 2).join(', ')}`);
        }
      }
    }

    return {
      imports: [...new Set(imports)],
      initialization: inits,
      template: `
// Auto-generated wiring for ${targetCategory}
${imports.join('\n')}

// Integration points:
${inits.map(i => `// ${i}`).join('\n')}
`,
    };
  }

  /**
   * Get wiring status report
   */
  getStatus() {
    return {
      enabled: this.enabled,
      autoTest: this.autoTest,
      basePath: this.basePath,
      pendingWires: this.pendingWires.length,
      completedWires: this.wiringLog.filter(l => l.status === 'success').length,
      failedWires: this.wiringLog.filter(l => l.status === 'failed').length,
      recentWiring: this.wiringLog.slice(-10),
      registryStats: this.registry.getStats(),
    };
  }

  /**
   * Get wiring suggestions for a file
   * @param {string} filePath - File path
   * @param {string} category - Component category
   * @returns {Object} Suggestions
   */
  getSuggestions(filePath, category) {
    const template = WIRING_TEMPLATES[category];
    if (!template) {
      return { suggestions: [], reason: 'Unknown category' };
    }

    const suggestions = [];

    // Suggest imports from target categories
    for (const sourceCategory of template.targetCategories) {
      const importInfo = IMPORT_TEMPLATES[sourceCategory];
      if (importInfo) {
        for (const [name, template] of Object.entries(importInfo)) {
          suggestions.push({
            type: 'import',
            module: name,
            statement: `import { ${template.imports.join(', ')} } from '${template.from}';`,
            reason: `${category} components typically use ${name} for ${
              sourceCategory === ComponentCategory.INFERENCE ? 'statistical analysis' :
              sourceCategory === ComponentCategory.ORGANISM ? 'health tracking' :
              'integration'
            }`,
          });
        }
      }
    }

    return {
      suggestions,
      filePath,
      category,
      wiringTemplate: template,
    };
  }

  /**
   * Enable/disable auto-wiring
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.emit('enabledChanged', { enabled });
  }

  /**
   * Clear wiring log
   */
  clearLog() {
    this.wiringLog = [];
  }
}

// Singleton instance
let autoWirerInstance = null;

/**
 * Initialize auto-wiring system
 * @param {string} basePath - Base path for source files
 * @param {Object} options - Options
 * @returns {Promise<AutoWirer>}
 */
export async function initAutoWiring(basePath, options = {}) {
  if (!autoWirerInstance) {
    autoWirerInstance = new AutoWirer(options);
  }

  if (basePath) {
    await autoWirerInstance.init(basePath);
  }

  return autoWirerInstance;
}

/**
 * Get the auto-wirer instance
 */
export function getAutoWirer() {
  return autoWirerInstance;
}

export default AutoWirer;
