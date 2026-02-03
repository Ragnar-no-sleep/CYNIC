#!/usr/bin/env node
/**
 * CYNIC Auto-Documentation Generator
 *
 * "Le code se connaît lui-même" - κυνικός
 *
 * Meta-cognitive documentation: The system introspects its own structure
 * and generates documentation from the real code, not from human memory.
 *
 * Like the subconscious programs that allow us to perceive reality,
 * this script perceives the codebase and articulates what it sees.
 *
 * @module scripts/tikkun/auto-document
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

// ═══════════════════════════════════════════════════════════════════════════════
// META-COGNITIVE EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract package metadata from package.json
 */
function extractPackageMeta(pkgPath) {
  const pkgJsonPath = path.join(pkgPath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return null;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    main: pkg.main || pkg.exports?.['.']?.import || 'src/index.js',
    dependencies: Object.keys(pkg.dependencies || {}),
    peerDependencies: Object.keys(pkg.peerDependencies || {}),
    scripts: Object.keys(pkg.scripts || {}),
  };
}

/**
 * Extract exports from index.js using regex (no AST needed)
 */
function extractExports(indexPath) {
  if (!fs.existsSync(indexPath)) return { named: [], default: null };

  const content = fs.readFileSync(indexPath, 'utf-8');
  const exports = { named: [], default: null, reExports: [] };

  // Helper to filter valid export names (no comments, valid identifiers)
  const isValidExport = (n) => n && !n.startsWith('//') && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n);

  // Named exports: export { Foo, Bar } from './module.js'
  const namedExportRe = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = namedExportRe.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
    exports.named.push(...names.filter(isValidExport));
    exports.reExports.push({ from: match[2], names: names.filter(isValidExport) });
  }

  // Direct named exports: export { Foo, Bar }
  const directExportRe = /export\s*\{([^}]+)\}(?!\s*from)/g;
  while ((match = directExportRe.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
    exports.named.push(...names.filter(isValidExport));
  }

  // Export function/class/const
  const declExportRe = /export\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)/g;
  while ((match = declExportRe.exec(content)) !== null) {
    exports.named.push(match[1]);
  }

  // Default export
  if (/export\s+default/.test(content)) {
    exports.default = true;
  }

  // Dedupe
  exports.named = [...new Set(exports.named)];

  return exports;
}

/**
 * Extract JSDoc module description from file header
 */
function extractModuleDoc(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the first JSDoc block
  const jsdocRe = /\/\*\*\s*([\s\S]*?)\s*\*\//;
  const match = content.match(jsdocRe);
  if (!match) return null;

  const doc = match[1];
  const lines = doc.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim());

  // Extract description (lines before @tags)
  const descLines = [];
  const features = [];
  let inFeatures = false;

  for (const line of lines) {
    if (line.startsWith('@')) break;
    if (line.startsWith('##') || line.startsWith('**')) {
      inFeatures = true;
    }
    if (inFeatures && line.startsWith('- ')) {
      features.push(line.slice(2));
    } else if (!inFeatures && line) {
      descLines.push(line);
    }
  }

  return {
    description: descLines.join(' ').replace(/\s+/g, ' ').trim(),
    features,
  };
}

/**
 * Count source and test files
 */
function countFiles(pkgPath) {
  const srcDir = path.join(pkgPath, 'src');
  const testDir = path.join(pkgPath, 'test');

  const countJs = (dir) => {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(path.join(d, entry.name));
        else if (entry.name.endsWith('.js')) count++;
      }
    };
    walk(dir);
    return count;
  };

  return {
    src: countJs(srcDir),
    test: countJs(testDir),
  };
}

/**
 * Detect package category from structure and dependencies
 */
function detectCategory(meta, exports) {
  if (!meta) return 'unknown';

  const deps = [...meta.dependencies, ...meta.peerDependencies];
  const name = meta.name;

  if (name.includes('mcp')) return 'mcp-server';
  if (name.includes('persistence') || deps.includes('pg')) return 'persistence';
  if (name.includes('node') || exports.named.includes('CYNICNode')) return 'runtime';
  if (name.includes('core')) return 'core';
  if (name.includes('protocol')) return 'protocol';
  if (name.includes('emergence')) return 'emergence';
  if (name.includes('llm') || deps.some(d => d.includes('ollama'))) return 'llm';
  if (name.includes('anchor') || name.includes('solana')) return 'solana';
  if (name.includes('burns') || name.includes('zk')) return 'crypto';
  if (deps.includes('fastify')) return 'service';

  return 'library';
}

/**
 * Generate φ-aligned quality badge
 */
function qualityBadge(testRatio) {
  if (testRatio >= 0.618) return '🟢 φ-aligned';
  if (testRatio >= 0.382) return '🟡 adequate';
  if (testRatio >= 0.236) return '🟠 needs tests';
  return '🔴 critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRACTAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate fractal depth - dependency layers within CYNIC ecosystem
 * Like Sefirot: each package has its place in the tree
 */
function calculateFractalDepth(meta, packagesDir) {
  if (!meta) return { depth: 0, layers: [] };

  const cynicDeps = meta.dependencies.filter(d => d.startsWith('@cynic/'));
  if (cynicDeps.length === 0) return { depth: 1, layers: ['leaf'] };

  // Recursively find max depth
  let maxDepth = 1;
  const layers = ['branch'];

  for (const dep of cynicDeps) {
    const depName = dep.replace('@cynic/', '');
    const depPath = path.join(packagesDir, depName);
    const depMeta = extractPackageMeta(depPath);
    if (depMeta) {
      const { depth } = calculateFractalDepth(depMeta, packagesDir);
      maxDepth = Math.max(maxDepth, depth + 1);
    }
  }

  if (maxDepth >= 3) layers[0] = 'root';
  else if (maxDepth === 2) layers[0] = 'branch';

  return { depth: maxDepth, layers };
}

/**
 * Analyze multi-dimensional quality aspects (simplified 25D → 5 core dimensions)
 */
function analyzeDimensions(pkgPath, meta, files, exports) {
  const dimensions = {};

  // φ (PHI) - Uncertainty/Confidence
  // Measured by: test coverage → higher = more verified
  dimensions.phi = {
    name: 'φ (Confidence)',
    score: Math.min(files.test / Math.max(files.src, 1), 1),
    bar: progressBar(files.test / Math.max(files.src, 1)),
  };

  // VERIFY - Trust through verification
  // Measured by: presence of test files, type definitions
  const hasTests = files.test > 0;
  const hasTypes = fs.existsSync(path.join(pkgPath, 'types')) ||
                   fs.existsSync(path.join(pkgPath, 'src', 'types'));
  dimensions.verify = {
    name: 'Verify',
    score: (hasTests ? 0.5 : 0) + (hasTypes ? 0.5 : 0),
    bar: progressBar((hasTests ? 0.5 : 0) + (hasTypes ? 0.5 : 0)),
  };

  // CULTURE - Pattern consistency
  // Measured by: JSDoc presence, naming conventions
  const hasJsdoc = exports.named.length > 0;
  const followsNaming = exports.named.every(n => /^[a-z]|^[A-Z][a-z]/.test(n));
  dimensions.culture = {
    name: 'Culture',
    score: (hasJsdoc ? 0.5 : 0) + (followsNaming ? 0.5 : 0),
    bar: progressBar((hasJsdoc ? 0.5 : 0) + (followsNaming ? 0.5 : 0)),
  };

  // BURN - Simplicity
  // Measured by: exports/files ratio (fewer exports per file = more focused)
  const focusRatio = Math.min(exports.named.length / Math.max(files.src * 3, 1), 1);
  dimensions.burn = {
    name: 'Burn (Simplicity)',
    score: 1 - focusRatio, // Inverse: fewer exports = simpler = better
    bar: progressBar(1 - focusRatio),
  };

  // EMERGENCE - Growth potential
  // Measured by: dependency count (more integration = more emergence)
  const depCount = meta.dependencies.length;
  const emergenceScore = Math.min(depCount / 10, 1);
  dimensions.emergence = {
    name: 'Emergence',
    score: emergenceScore,
    bar: progressBar(emergenceScore),
  };

  return dimensions;
}

/**
 * Generate ASCII progress bar (φ-capped at 62%)
 */
function progressBar(ratio, width = 10) {
  const cappedRatio = Math.min(ratio, 0.618); // φ⁻¹ cap
  const filled = Math.round(cappedRatio * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// ═══════════════════════════════════════════════════════════════════════════════
// README GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate README.md from package introspection
 */
function generateReadme(pkgPath) {
  const meta = extractPackageMeta(pkgPath);
  if (!meta) return null;

  const indexPath = path.join(pkgPath, meta.main.replace(/^\.\//, ''));
  const exports = extractExports(indexPath);
  const moduleDoc = extractModuleDoc(indexPath);
  const files = countFiles(pkgPath);
  const category = detectCategory(meta, exports);
  const testRatio = files.src > 0 ? files.test / files.src : 0;

  // Group exports by type
  const classes = exports.named.filter(n => /^[A-Z]/.test(n) && !n.includes('_'));
  const factories = exports.named.filter(n => /^create/.test(n));
  const getters = exports.named.filter(n => /^get[A-Z]/.test(n));
  const constants = exports.named.filter(n => /^[A-Z_]+$/.test(n));
  const functions = exports.named.filter(n =>
    !classes.includes(n) && !factories.includes(n) &&
    !getters.includes(n) && !constants.includes(n)
  );

  // Build README
  const lines = [];

  // Header
  lines.push(`# ${meta.name}`);
  lines.push('');
  lines.push(`> ${moduleDoc?.description || meta.description || 'CYNIC ecosystem package'}`);
  lines.push('');
  lines.push(`**Category**: ${category} | **Version**: ${meta.version} | **Quality**: ${qualityBadge(testRatio)}`);
  lines.push('');

  // Features from JSDoc
  if (moduleDoc?.features?.length > 0) {
    lines.push('## Features');
    lines.push('');
    for (const f of moduleDoc.features) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  // Installation
  lines.push('## Installation');
  lines.push('');
  lines.push('```bash');
  lines.push(`npm install ${meta.name}`);
  lines.push('```');
  lines.push('');

  // Quick Start
  lines.push('## Quick Start');
  lines.push('');
  lines.push('```javascript');
  if (classes.length > 0 || factories.length > 0) {
    const mainClass = classes[0] || factories[0]?.replace('create', '');
    const mainFactory = factories[0] || `create${classes[0]}`;
    lines.push(`import { ${mainFactory || classes[0]} } from '${meta.name}';`);
    lines.push('');
    if (factories.length > 0) {
      lines.push(`const instance = ${factories[0]}();`);
    } else if (classes.length > 0) {
      lines.push(`const instance = new ${classes[0]}();`);
    }
  } else if (functions.length > 0) {
    lines.push(`import { ${functions.slice(0, 3).join(', ')} } from '${meta.name}';`);
  } else {
    lines.push(`import * as pkg from '${meta.name}';`);
  }
  lines.push('```');
  lines.push('');

  // API Reference
  lines.push('## API Reference');
  lines.push('');

  if (classes.length > 0) {
    lines.push('### Classes');
    lines.push('');
    lines.push('| Class | Description |');
    lines.push('|-------|-------------|');
    for (const c of classes) {
      lines.push(`| \`${c}\` | ${c} implementation |`);
    }
    lines.push('');
  }

  if (factories.length > 0) {
    lines.push('### Factory Functions');
    lines.push('');
    lines.push('| Function | Description |');
    lines.push('|----------|-------------|');
    for (const f of factories) {
      const className = f.replace('create', '');
      lines.push(`| \`${f}()\` | Create ${className} instance |`);
    }
    lines.push('');
  }

  if (getters.length > 0) {
    lines.push('### Singletons');
    lines.push('');
    lines.push('| Function | Description |');
    lines.push('|----------|-------------|');
    for (const g of getters) {
      const name = g.replace('get', '');
      lines.push(`| \`${g}()\` | Get ${name} singleton |`);
    }
    lines.push('');
  }

  if (constants.length > 0) {
    lines.push('### Constants');
    lines.push('');
    lines.push(`\`${constants.slice(0, 10).join('`, `')}\`${constants.length > 10 ? ` + ${constants.length - 10} more` : ''}`);
    lines.push('');
  }

  if (functions.length > 0) {
    lines.push('### Functions');
    lines.push('');
    lines.push(`\`${functions.slice(0, 10).join('`, `')}\`${functions.length > 10 ? ` + ${functions.length - 10} more` : ''}`);
    lines.push('');
  }

  // Dependencies
  if (meta.dependencies.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    const cynicDeps = meta.dependencies.filter(d => d.startsWith('@cynic/'));
    const externalDeps = meta.dependencies.filter(d => !d.startsWith('@cynic/'));

    if (cynicDeps.length > 0) {
      lines.push(`**CYNIC**: ${cynicDeps.join(', ')}`);
    }
    if (externalDeps.length > 0) {
      lines.push(`**External**: ${externalDeps.slice(0, 5).join(', ')}${externalDeps.length > 5 ? ` + ${externalDeps.length - 5} more` : ''}`);
    }
    lines.push('');
  }

  // Stats
  lines.push('## Stats');
  lines.push('');
  lines.push(`- **Source files**: ${files.src}`);
  lines.push(`- **Test files**: ${files.test}`);
  lines.push(`- **Test ratio**: ${Math.round(testRatio * 100)}%`);
  lines.push(`- **Exports**: ${exports.named.length} named${exports.default ? ' + default' : ''}`);
  lines.push('');

  // Fractal Analysis
  const packagesDir = path.dirname(pkgPath);
  const fractal = calculateFractalDepth(meta, packagesDir);
  if (fractal.depth > 1) {
    lines.push('## Fractal Structure');
    lines.push('');
    lines.push(`- **Depth**: ${fractal.depth} (${fractal.layers[0]})`);
    const cynicDeps = meta.dependencies.filter(d => d.startsWith('@cynic/'));
    if (cynicDeps.length > 0) {
      lines.push(`- **Children**: ${cynicDeps.map(d => d.replace('@cynic/', '')).join(' → ')}`);
    }
    lines.push('');
  }

  // Multi-dimensional Analysis
  const dimensions = analyzeDimensions(pkgPath, meta, files, exports);
  lines.push('## Dimensions (4 Axioms)');
  lines.push('');
  lines.push('```');
  for (const [key, dim] of Object.entries(dimensions)) {
    const pct = Math.round(Math.min(dim.score, 0.618) * 100); // φ-capped display
    lines.push(`${dim.bar} ${pct.toString().padStart(2)}% ${dim.name}`);
  }
  lines.push('```');
  lines.push('');
  lines.push('*Max 62% (φ⁻¹) - certainty is hubris*');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Auto-generated by CYNIC meta-cognition. "φ distrusts φ" - κυνικός*');
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const packagesDir = path.join(ROOT, 'packages');

  // Get target packages
  let targets = [];
  if (args.length > 0 && args[0] !== '--all') {
    targets = args;
  } else {
    // All packages
    targets = fs.readdirSync(packagesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC Auto-Documentation Generator');
  console.log('"Le code se connaît lui-même" - κυνικός');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const results = [];

  for (const pkg of targets) {
    const pkgPath = path.join(packagesDir, pkg);
    if (!fs.existsSync(pkgPath)) {
      console.log(`⚠️  Package not found: ${pkg}`);
      continue;
    }

    const readmePath = path.join(pkgPath, 'README.md');
    const hasReadme = fs.existsSync(readmePath);

    console.log(`📦 ${pkg}`);

    const readme = generateReadme(pkgPath);
    if (!readme) {
      console.log(`   ⚠️  No package.json found`);
      continue;
    }

    // Check if --dry-run
    if (args.includes('--dry-run')) {
      console.log(`   📄 Would ${hasReadme ? 'update' : 'create'} README.md`);
      results.push({ pkg, action: 'dry-run', hasReadme });
    } else {
      fs.writeFileSync(readmePath, readme);
      console.log(`   ✅ ${hasReadme ? 'Updated' : 'Created'} README.md`);
      results.push({ pkg, action: hasReadme ? 'updated' : 'created' });
    }
  }

  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`📊 Results: ${results.filter(r => r.action === 'created').length} created, ${results.filter(r => r.action === 'updated').length} updated`);
  console.log('');
}

main().catch(console.error);
