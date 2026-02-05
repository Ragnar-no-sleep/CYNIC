/**
 * Auto-Wire Hook Library
 *
 * Triggers auto-discovery and wiring when new components are added
 *
 * "Le chien connecte automatiquement" - κυνικός
 */

'use strict';

import path from 'path';

/**
 * Patterns that indicate a new component file
 */
export const COMPONENT_PATTERNS = {
  inference: /packages\/node\/src\/inference\/[\w-]+\.js$/,
  organism: /packages\/node\/src\/organism\/[\w-]+\.js$/,
  agent: /packages\/node\/src\/agents\/collective\/[\w-]+\.js$/,
  memory: /packages\/node\/src\/memory\/[\w-]+\.js$/,
  judge: /packages\/node\/src\/judge\/[\w-]+\.js$/,
  perception: /packages\/node\/src\/perception\/[\w-]+\.js$/,
  learning: /packages\/node\/src\/learning\/[\w-]+\.js$/,
};

/**
 * Wiring suggestions for each category
 */
export const WIRING_SUGGESTIONS = {
  inference: {
    injectInto: ['judge', 'agent', 'memory'],
    imports: [],
  },
  organism: {
    injectInto: ['judge', 'agent'],
    imports: [],
  },
  agent: {
    injectInto: [],
    imports: [
      "import { detectAnomaly, estimateRate } from '../../inference/poisson.js';",
      "import { computeStats, zScore } from '../../inference/gaussian.js';",
      "import { recordSuccess, recordError, recordGrowth } from '../../organism/index.js';",
    ],
  },
  judge: {
    injectInto: [],
    imports: [
      "import { updateBelief, BetaDistribution } from '../inference/bayes.js';",
      "import { recordSuccess, recordError, updateHomeostasis } from '../organism/index.js';",
    ],
  },
  memory: {
    injectInto: [],
    imports: [
      "import { updateBelief, likelihoodRatio } from '../inference/bayes.js';",
      "import { computeStats, zScore, GaussianDistribution } from '../inference/gaussian.js';",
    ],
  },
};

/**
 * Detect component category from file path
 * @param {string} filePath - File path
 * @returns {string|null} Category or null
 */
export function detectCategory(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  for (const [category, pattern] of Object.entries(COMPONENT_PATTERNS)) {
    if (pattern.test(normalized)) {
      return category;
    }
  }

  return null;
}

/**
 * Check if file is an index file (skip these)
 * @param {string} filePath - File path
 * @returns {boolean}
 */
export function isIndexFile(filePath) {
  return filePath.endsWith('index.js') || filePath.includes('.test.');
}

/**
 * Generate wiring suggestions for a new component
 * @param {string} filePath - File path
 * @param {string} category - Component category
 * @returns {Object} Suggestions
 */
export function generateWiringSuggestions(filePath, category) {
  const suggestions = WIRING_SUGGESTIONS[category];
  if (!suggestions) {
    return { filePath, category, suggestions: [] };
  }

  const result = {
    filePath,
    category,
    shouldWire: suggestions.imports.length > 0 || suggestions.injectInto.length > 0,
    imports: suggestions.imports,
    injectInto: suggestions.injectInto,
    message: null,
  };

  if (suggestions.imports.length > 0) {
    result.message = `*sniff* New ${category} component detected. Consider adding:\n\n${suggestions.imports.join('\n')}`;
  } else if (suggestions.injectInto.length > 0) {
    result.message = `*ears perk* New ${category} module! Wire into: ${suggestions.injectInto.join(', ')}`;
  }

  return result;
}

/**
 * Check if content looks like a component class/factory
 * @param {string} content - File content
 * @returns {boolean}
 */
export function looksLikeComponent(content) {
  const patterns = [
    /export\s+class\s+\w+/,           // export class Foo
    /export\s+function\s+\w+/,        // export function foo
    /export\s+const\s+\w+\s*=/,       // export const foo =
    /\.CYNIC_COMPONENT\s*=/,          // .CYNIC_COMPONENT = marker
  ];

  return patterns.some(p => p.test(content));
}

/**
 * Analyze a Write/Edit operation for auto-wiring
 * @param {Object} toolInput - Tool input
 * @param {Object} toolResult - Tool result (if available)
 * @returns {Object|null} Analysis result
 */
export function analyzeForWiring(toolInput, toolResult) {
  const filePath = toolInput.file_path || toolInput.path;
  if (!filePath) return null;

  // Skip index and test files
  if (isIndexFile(filePath)) return null;

  // Detect category
  const category = detectCategory(filePath);
  if (!category) return null;

  // Check if content looks like a component
  const content = toolInput.content || toolInput.new_string || '';
  if (!looksLikeComponent(content)) return null;

  // Generate suggestions
  return generateWiringSuggestions(filePath, category);
}

/**
 * Format wiring notification for display
 * @param {Object} analysis - Analysis result
 * @returns {string} Formatted message
 */
export function formatWiringNotification(analysis) {
  if (!analysis || !analysis.shouldWire) return null;

  const lines = [
    `┌─────────────────────────────────────────────────────────┐`,
    `│ 🔌 AUTO-WIRE: New ${analysis.category.toUpperCase()} component detected`,
    `├─────────────────────────────────────────────────────────┤`,
  ];

  if (analysis.imports.length > 0) {
    lines.push(`│ Suggested imports:`);
    for (const imp of analysis.imports) {
      lines.push(`│   ${imp.substring(0, 55)}...`);
    }
  }

  if (analysis.injectInto.length > 0) {
    lines.push(`│ Should be wired into: ${analysis.injectInto.join(', ')}`);
  }

  lines.push(`└─────────────────────────────────────────────────────────┘`);

  return lines.join('\n');
}
