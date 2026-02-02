#!/usr/bin/env node
/**
 * ALIGNMENT - Reality Tracking
 *
 * "Every line must serve the vision"
 *
 * Maps every component to the Kabbalistic structure.
 * Tracks alignment with the asdfasdfa singularity vision.
 *
 * Usage: node scripts/tikkun/alignment.mjs [--json] [--detailed]
 *
 * @module tikkun/alignment
 */

import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CYNIC_ROOT = join(__dirname, '..', '..');

// φ constants
const PHI_INV = 0.618033988749895;

// Colors
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// ═══════════════════════════════════════════════════════════════════════════
// THE MAP: Component → Sefirah → Purpose
// ═══════════════════════════════════════════════════════════════════════════

const COMPONENT_MAP = {
  // KETER - Central Orchestration
  'packages/node/src/agents/collective/cynic.js': {
    sefirah: 'Keter',
    dog: 'CYNIC',
    purpose: 'Central CYNIC orchestrator',
    axioms: ['PHI', 'VERIFY', 'CULTURE', 'BURN'],
    mustContain: ['cynic', 'orchestrat', 'collective'],
  },
  'packages/node/src/agents/collective/sefirot.js': {
    sefirah: 'Keter',
    dog: 'CYNIC',
    purpose: 'Sefirot definitions and mappings',
    axioms: ['CULTURE'],
    mustContain: ['sefirot', 'keter', 'malkhut'],
  },
  'packages/node/src/agents/collective': {
    sefirah: 'Keter',
    dog: 'CYNIC',
    purpose: 'Central orchestration of all Dogs',
    axioms: ['PHI', 'VERIFY', 'CULTURE', 'BURN'],
    mustContain: ['consensus', 'orchestrat', 'collective'],
  },
  'scripts/lib/cynic-core.cjs': {
    sefirah: 'Keter',
    dog: 'CYNIC',
    purpose: 'Core constants and utilities',
    axioms: ['PHI'],
    mustContain: ['PHI', '1.618', '0.618'],
  },

  // CHOKMAH - Wisdom
  'packages/node/src/agents/collective/sage.js': {
    sefirah: 'Chokmah',
    dog: 'Sage',
    purpose: 'Intuitive wisdom, patterns from history',
    axioms: ['CULTURE'],
    mustContain: ['wisdom', 'pattern', 'insight'],
  },

  // BINAH - Understanding
  'packages/node/src/agents/collective/analyst.js': {
    sefirah: 'Binah',
    dog: 'Analyst',
    purpose: 'Rigorous analysis, metrics, understanding',
    axioms: ['VERIFY'],
    mustContain: ['analy', 'metric', 'measure'],
  },

  // DAAT - Hidden Knowledge
  'packages/node/src/agents/collective/scholar.js': {
    sefirah: 'Daat',
    dog: 'Scholar',
    purpose: 'Knowledge storage and retrieval',
    axioms: ['CULTURE'],
    mustContain: ['knowledge', 'learn', 'document'],
  },
  'scripts/tikkun': {
    sefirah: 'Daat',
    dog: 'Scholar',
    purpose: 'Self-knowledge and validation',
    axioms: ['VERIFY'],
    mustContain: ['audit', 'test', 'valid'],
  },

  // CHESED - Creation
  'packages/node/src/agents/collective/architect.js': {
    sefirah: 'Chesed',
    dog: 'Architect',
    purpose: 'Design and creation',
    axioms: ['BURN'],
    mustContain: ['design', 'build', 'architect'],
  },

  // GEVURAH - Judgment/Protection
  'packages/node/src/agents/collective/guardian.js': {
    sefirah: 'Gevurah',
    dog: 'Guardian',
    purpose: 'Protection, limits, security',
    axioms: ['VERIFY'],
    mustContain: ['protect', 'guard', 'secur', 'danger'],
  },
  'scripts/lib/auto-judge.cjs': {
    sefirah: 'Gevurah',
    dog: 'Guardian',
    purpose: 'Automatic judgment system',
    axioms: ['PHI', 'VERIFY'],
    mustContain: ['judge', 'verdict', 'HOWL', 'GROWL'],
  },
  'scripts/lib/security-patterns.cjs': {
    sefirah: 'Gevurah',
    dog: 'Guardian',
    purpose: 'Security pattern detection',
    axioms: ['VERIFY'],
    mustContain: ['security', 'vulnerab', 'danger'],
  },

  // TIFERET - Balance
  'packages/node/src/agents/collective/oracle.js': {
    sefirah: 'Tiferet',
    dog: 'Oracle',
    purpose: 'Balance, prediction, harmony',
    axioms: ['PHI'],
    mustContain: ['predict', 'harmon', 'balance'],
  },
  'scripts/lib/consciousness.cjs': {
    sefirah: 'Tiferet',
    dog: 'Oracle',
    purpose: 'Consciousness state tracking',
    axioms: ['PHI'],
    mustContain: ['conscious', 'state', 'flow'],
  },

  // NETZACH - Victory/Endurance
  'packages/node/src/agents/collective/scout.js': {
    sefirah: 'Netzach',
    dog: 'Scout',
    purpose: 'Exploration, discovery',
    axioms: ['VERIFY'],
    mustContain: ['scout', 'explor', 'find', 'discover'],
  },

  // HOD - Glory/Splendor
  'packages/node/src/agents/collective/deployer.js': {
    sefirah: 'Hod',
    dog: 'Deployer',
    purpose: 'Deployment, manifestation',
    axioms: ['VERIFY'],
    mustContain: ['deploy', 'ship', 'release'],
  },

  // YESOD - Foundation
  'packages/node/src/agents/collective/janitor.js': {
    sefirah: 'Yesod',
    dog: 'Janitor',
    purpose: 'Cleanup, simplification',
    axioms: ['BURN'],
    mustContain: ['clean', 'simplif', 'remove'],
  },
  'packages/persistence': {
    sefirah: 'Yesod',
    dog: 'Janitor',
    purpose: 'Data persistence foundation',
    axioms: ['VERIFY'],
    mustContain: ['persist', 'store', 'database', 'postgres'],
  },

  // MALKHUT - Kingdom/Reality
  'packages/node/src/agents/collective/cartographer.js': {
    sefirah: 'Malkhut',
    dog: 'Cartographer',
    purpose: 'Mapping reality, codebase structure',
    axioms: ['VERIFY'],
    mustContain: ['map', 'struct', 'navigat'],
  },
  'packages/mcp': {
    sefirah: 'Malkhut',
    dog: 'Cartographer',
    purpose: 'MCP tools - interface with reality',
    axioms: ['VERIFY'],
    mustContain: ['tool', 'mcp'],
  },

  // HOOKS - The Nervous System
  'scripts/hooks/awaken.js': {
    sefirah: 'Perception',
    dog: 'CYNIC',
    purpose: 'Session start - awakening',
    axioms: ['CULTURE'],
    mustContain: ['session', 'start', 'awaken'],
  },
  'scripts/hooks/observe.js': {
    sefirah: 'Perception',
    dog: 'All Dogs',
    purpose: 'Tool observation - the eyes',
    axioms: ['VERIFY'],
    mustContain: ['observ', 'tool', 'action'],
  },
  'scripts/hooks/sleep.js': {
    sefirah: 'Integration',
    dog: 'CYNIC',
    purpose: 'Session end - consolidation',
    axioms: ['CULTURE'],
    mustContain: ['session', 'end', 'save'],
  },

  // LLM Integration
  'scripts/lib/llm-judgment-bridge.cjs': {
    sefirah: 'External',
    dog: 'Oracle',
    purpose: 'LLM connection for enhanced judgment',
    axioms: ['PHI', 'VERIFY'],
    mustContain: ['llm', 'ollama', 'consensus', 'PHI_INV'],
  },

  // Memory
  'scripts/lib/total-memory.cjs': {
    sefirah: 'Daat',
    dog: 'Scholar',
    purpose: 'Persistent memory across sessions',
    axioms: ['CULTURE'],
    mustContain: ['memory', 'store', 'retrieve'],
  },
  'packages/mcp/src/tools/domains/memory.js': {
    sefirah: 'Daat',
    dog: 'Scholar',
    purpose: 'Memory MCP tools',
    axioms: ['CULTURE'],
    mustContain: ['memory', 'store', 'search'],
  },

  // Judgment
  'packages/mcp/src/tools/domains/judgment.js': {
    sefirah: 'Gevurah',
    dog: 'Guardian',
    purpose: 'Judgment MCP tools',
    axioms: ['PHI', 'VERIFY'],
    mustContain: ['judge', 'verdict', 'score'],
  },
  'scripts/lib/self-refinement.cjs': {
    sefirah: 'Tiferet',
    dog: 'Oracle',
    purpose: 'Self-critique and refinement',
    axioms: ['PHI'],
    mustContain: ['refine', 'critique', 'improve'],
  },

  // Philosophy engines
  'scripts/lib/cognitive-thermodynamics.cjs': {
    sefirah: 'Tiferet',
    dog: 'Analyst',
    purpose: 'Cognitive heat, work, efficiency',
    axioms: ['PHI'],
    mustContain: ['heat', 'work', 'entropy', 'efficien'],
  },
  'scripts/lib/collective-dogs.cjs': {
    sefirah: 'Keter',
    dog: 'CYNIC',
    purpose: 'Dog definitions and collective',
    axioms: ['CULTURE'],
    mustContain: ['dog', 'sefirah', 'collective'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getFileContent(path) {
  try {
    if (statSync(path).isDirectory()) {
      // For directories, concatenate all .js/.cjs/.mjs files
      const files = readdirSync(path, { recursive: true })
        .filter(f => /\.(js|cjs|mjs)$/.test(f));
      return files.map(f => {
        try {
          return readFileSync(join(path, f), 'utf8');
        } catch { return ''; }
      }).join('\n');
    }
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function checkAlignment(componentPath, config) {
  const fullPath = join(CYNIC_ROOT, componentPath);
  const content = getFileContent(fullPath);

  if (!content) {
    return {
      exists: false,
      aligned: false,
      issues: ['Component not found'],
    };
  }

  const issues = [];
  const matches = [];

  // Check mustContain patterns
  for (const pattern of config.mustContain || []) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(content)) {
      matches.push(pattern);
    } else {
      issues.push(`Missing pattern: "${pattern}"`);
    }
  }

  // Check axiom presence
  for (const axiom of config.axioms || []) {
    if (axiom === 'PHI') {
      if (!content.includes('PHI') && !content.includes('0.618') && !content.includes('1.618')) {
        issues.push('φ (PHI) not referenced');
      }
    }
  }

  // Calculate alignment score
  const totalChecks = (config.mustContain?.length || 0) + (config.axioms?.length || 0);
  const passedChecks = totalChecks - issues.length;
  const alignmentScore = totalChecks > 0 ? passedChecks / totalChecks : 1;

  return {
    exists: true,
    aligned: alignmentScore >= PHI_INV,
    alignmentScore: Math.round(alignmentScore * 100),
    matches,
    issues,
  };
}

function countLines(path) {
  const fullPath = join(CYNIC_ROOT, path);
  try {
    if (statSync(fullPath).isDirectory()) {
      const files = readdirSync(fullPath, { recursive: true })
        .filter(f => /\.(js|cjs|mjs)$/.test(f));
      let total = 0;
      for (const f of files) {
        try {
          const content = readFileSync(join(fullPath, f), 'utf8');
          total += content.split('\n').length;
        } catch {}
      }
      return total;
    }
    return readFileSync(fullPath, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function runAlignment(options = {}) {
  console.log(`\n${C.magenta}${C.bold}═══════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.magenta}${C.bold}  ALIGNMENT - Reality Tracking${C.reset}`);
  console.log(`${C.magenta}${C.bold}  "Every line must serve the vision"${C.reset}`);
  console.log(`${C.magenta}${C.bold}═══════════════════════════════════════════════════════════════════════════${C.reset}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    components: {},
    sefirot: {},
    summary: {
      total: 0,
      aligned: 0,
      misaligned: 0,
      missing: 0,
      totalLines: 0,
      alignedLines: 0,
    },
  };

  // Initialize sefirot counters
  const sefirotOrder = ['Keter', 'Chokmah', 'Binah', 'Daat', 'Chesed', 'Gevurah', 'Tiferet', 'Netzach', 'Hod', 'Yesod', 'Malkhut', 'Perception', 'Integration', 'External'];
  for (const s of sefirotOrder) {
    results.sefirot[s] = { components: [], aligned: 0, total: 0, lines: 0 };
  }

  // Analyze each component
  for (const [path, config] of Object.entries(COMPONENT_MAP)) {
    results.summary.total++;
    const lines = countLines(path);
    results.summary.totalLines += lines;

    const alignment = checkAlignment(path, config);
    results.components[path] = {
      ...config,
      ...alignment,
      lines,
    };

    // Update sefirah stats
    const sef = results.sefirot[config.sefirah];
    if (sef) {
      sef.components.push(path);
      sef.total++;
      sef.lines += lines;
      if (alignment.aligned) sef.aligned++;
    }

    // Update summary
    if (!alignment.exists) {
      results.summary.missing++;
    } else if (alignment.aligned) {
      results.summary.aligned++;
      results.summary.alignedLines += lines;
    } else {
      results.summary.misaligned++;
    }

    // Print result
    const icon = !alignment.exists ? '❌' : alignment.aligned ? '✓' : '⚠';
    const color = !alignment.exists ? C.red : alignment.aligned ? C.green : C.yellow;
    const shortPath = path.length > 45 ? '...' + path.slice(-42) : path;

    if (options.detailed || !alignment.aligned) {
      console.log(`${color}${icon}${C.reset} ${shortPath.padEnd(48)} ${C.dim}${config.sefirah.padEnd(12)}${C.reset} ${config.dog.padEnd(12)} ${alignment.alignmentScore || 0}%`);
      if (options.detailed && alignment.issues.length > 0) {
        for (const issue of alignment.issues) {
          console.log(`  ${C.dim}└─ ${issue}${C.reset}`);
        }
      }
    }
  }

  // Print Sefirot Summary
  console.log(`\n${C.cyan}── Sefirot Summary ──${C.reset}\n`);

  for (const sef of sefirotOrder) {
    const data = results.sefirot[sef];
    if (data.total === 0) continue;

    const ratio = data.aligned / data.total;
    const color = ratio >= PHI_INV ? C.green : ratio >= 0.382 ? C.yellow : C.red;
    const bar = makeBar(ratio * 100, 15);

    console.log(`  ${sef.padEnd(12)} [${bar}] ${color}${data.aligned}/${data.total}${C.reset} ${C.dim}(${data.lines.toLocaleString()} lines)${C.reset}`);
  }

  // Print Summary
  const alignmentRatio = results.summary.aligned / results.summary.total;
  const scoreColor = alignmentRatio >= PHI_INV ? C.green : alignmentRatio >= 0.382 ? C.yellow : C.red;

  console.log(`\n${C.magenta}${C.bold}═══════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  SUMMARY${C.reset}`);
  console.log(`${C.magenta}═══════════════════════════════════════════════════════════════════════════${C.reset}\n`);

  console.log(`  Components: ${results.summary.total}`);
  console.log(`  ${C.green}Aligned:${C.reset} ${results.summary.aligned} | ${C.yellow}Misaligned:${C.reset} ${results.summary.misaligned} | ${C.red}Missing:${C.reset} ${results.summary.missing}`);
  console.log(`  Lines tracked: ${results.summary.alignedLines.toLocaleString()} / ${results.summary.totalLines.toLocaleString()}`);
  console.log(`\n  Alignment Score: ${scoreColor}${Math.round(alignmentRatio * 100)}%${C.reset} (φ⁻¹ threshold: 62%)`);

  const bigBar = makeBar(alignmentRatio * 100, 50, true);
  console.log(`  [${bigBar}]`);

  // Verdict
  console.log('');
  if (alignmentRatio >= PHI_INV) {
    console.log(`  ${C.green}${C.bold}*tail wag* Reality aligned with vision.${C.reset}`);
  } else if (alignmentRatio >= 0.382) {
    console.log(`  ${C.yellow}${C.bold}*sniff* Partial alignment. Some components drift from vision.${C.reset}`);
  } else {
    console.log(`  ${C.red}${C.bold}*GROWL* Major misalignment. Reality diverges from vision.${C.reset}`);
  }

  console.log(`\n${C.magenta}═══════════════════════════════════════════════════════════════════════════${C.reset}\n`);

  // Save results
  const resultsPath = join(__dirname, 'alignment-results.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`${C.dim}Results saved to: ${resultsPath}${C.reset}\n`);

  return results;
}

function makeBar(percent, width, showPhi = false) {
  const filled = Math.round((percent / 100) * width);
  const phiMark = Math.round(PHI_INV * width);

  let bar = '';
  for (let i = 0; i < width; i++) {
    if (showPhi && i === phiMark) {
      bar += C.yellow + '│' + C.reset;
    } else if (i < filled) {
      bar += C.green + '█' + C.reset;
    } else {
      bar += C.dim + '░' + C.reset;
    }
  }
  return bar;
}

// CLI
const args = process.argv.slice(2);
const options = {
  json: args.includes('--json'),
  detailed: args.includes('--detailed'),
};

runAlignment(options).catch(console.error);
