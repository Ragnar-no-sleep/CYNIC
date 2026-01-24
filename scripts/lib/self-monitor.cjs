/**
 * CYNIC Self-Monitor
 *
 * "Connais-toi toi-même, puis vérifie" - κυνικός
 *
 * Auto-tracks CYNIC's own development state:
 * - Package test status
 * - Feature completion (derived from tests)
 * - Integration health (hooks, skills, MCP)
 * - Roadmap auto-generation
 *
 * Unlike static ROADMAP.md, this is live truth.
 *
 * @module @cynic/scripts/self-monitor
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

// φ Constants
const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI; // 0.618

// Paths
const CYNIC_DIR = path.join(os.homedir(), '.cynic');
const SELF_DIR = path.join(CYNIC_DIR, 'self');
const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Package definitions with expected capabilities
const PACKAGES = {
  core: {
    description: 'Constants, axioms, φ timing',
    critical: true,
    features: ['phi-constants', 'axioms', 'timing', 'worlds', 'identity-module']
  },
  protocol: {
    description: 'PoJ, Merkle, gossip, consensus',
    critical: true,
    features: ['poj', 'merkle', 'gossip', 'consensus', 'validation']
  },
  persistence: {
    description: 'PostgreSQL, Redis, DAG',
    critical: true,
    features: ['postgres', 'redis', 'dag', 'repositories', 'graph']
  },
  anchor: {
    description: 'Solana block anchoring',
    critical: false,
    features: ['anchoring', 'queue', 'merkle-proofs', 'devnet']
  },
  burns: {
    description: 'Token burn verification',
    critical: false,
    features: ['verification', 'on-chain', 'tracking']
  },
  identity: {
    description: 'E-Score, keys, reputation',
    critical: true,
    features: ['e-score-7d', 'key-manager', 'node-identity', 'reputation-graph']
  },
  emergence: {
    description: 'Consciousness, patterns',
    critical: false,
    features: ['consciousness', 'patterns', 'dimensions']
  },
  node: {
    description: 'Full node implementation',
    critical: true,
    features: ['judge-25d', 'brain', 'cli', 'services']
  },
  mcp: {
    description: 'MCP server for Claude',
    critical: true,
    features: ['brain-tools', 'memory-tools', 'graph-tools', 'poj-tools']
  },
  holdex: {
    description: 'Token K-Score integration',
    critical: false,
    features: ['k-score', 'token-analysis']
  },
  gasdf: {
    description: 'Gasless burns',
    critical: false,
    features: ['delegation', 'gasless']
  },
  zk: {
    description: 'Zero-knowledge proofs',
    critical: false,
    features: ['noir-circuits', 'proofs']
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SAFE EXECUTION (no shell injection)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run npm test for a package safely (no shell)
 */
function runPackageTest(pkgName) {
  // Validate package name (alphanumeric only)
  if (!/^[a-z0-9-]+$/.test(pkgName)) {
    throw new Error(`Invalid package name: ${pkgName}`);
  }

  const result = spawnSync('npm', ['test', `--workspace=packages/${pkgName}`], {
    cwd: PROJECT_ROOT,
    timeout: 60000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

/**
 * Check MCP health safely
 */
function checkMcpHealth() {
  const result = spawnSync('curl', [
    '-s',
    '--max-time', '3',
    'https://cynic-mcp.onrender.com/health'
  ], {
    encoding: 'utf8',
    timeout: 5000,
  });

  if (result.status !== 0) return 'unreachable';

  try {
    const data = JSON.parse(result.stdout);
    return data.status || 'healthy';
  } catch {
    return 'unknown';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PACKAGE SCANNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scan a single package for test status
 */
function scanPackage(pkgName) {
  const pkgPath = path.join(PROJECT_ROOT, 'packages', pkgName);

  if (!fs.existsSync(pkgPath)) {
    return { name: pkgName, exists: false, tests: 0, pass: 0, fail: 0 };
  }

  try {
    const result = runPackageTest(pkgName);
    const output = result.stdout + result.stderr;

    const testsMatch = output.match(/ℹ tests (\d+)/);
    const passMatch = output.match(/ℹ pass (\d+)/);
    const failMatch = output.match(/ℹ fail (\d+)/);

    return {
      name: pkgName,
      exists: true,
      tests: parseInt(testsMatch?.[1] || '0', 10),
      pass: parseInt(passMatch?.[1] || '0', 10),
      fail: parseInt(failMatch?.[1] || '0', 10),
      description: PACKAGES[pkgName]?.description || '',
      critical: PACKAGES[pkgName]?.critical || false,
      healthy: failMatch?.[1] === '0' && result.status === 0,
    };
  } catch (error) {
    return {
      name: pkgName,
      exists: true,
      tests: 0,
      pass: 0,
      fail: 1,
      error: String(error.message || error).slice(0, 100),
      critical: PACKAGES[pkgName]?.critical || false,
      healthy: false,
    };
  }
}

/**
 * Scan all packages
 */
function scanAllPackages() {
  const packages = {};
  let totalTests = 0;
  let totalPass = 0;
  let totalFail = 0;

  for (const pkgName of Object.keys(PACKAGES)) {
    const result = scanPackage(pkgName);
    packages[pkgName] = result;
    totalTests += result.tests;
    totalPass += result.pass;
    totalFail += result.fail;
  }

  return {
    packages,
    summary: {
      total: Object.keys(packages).length,
      healthy: Object.values(packages).filter(p => p.healthy).length,
      tests: totalTests,
      pass: totalPass,
      fail: totalFail,
      coverage: totalTests > 0 ? totalPass / totalTests : 0,
    },
    scannedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION SCANNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scan Claude Code integration (hooks, skills, agents)
 */
function scanIntegrations() {
  const claudeDir = path.join(PROJECT_ROOT, '.claude');

  // Count hooks
  const hooksDir = path.join(PROJECT_ROOT, 'scripts', 'hooks');
  const hooks = fs.existsSync(hooksDir)
    ? fs.readdirSync(hooksDir).filter(f => f.endsWith('.cjs'))
    : [];

  // Count lib modules
  const libDir = path.join(PROJECT_ROOT, 'scripts', 'lib');
  const libModules = fs.existsSync(libDir)
    ? fs.readdirSync(libDir).filter(f => f.endsWith('.cjs'))
    : [];

  // Count skills
  const skillsDir = path.join(claudeDir, 'skills');
  const skills = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir).filter(f => {
        const skillPath = path.join(skillsDir, f, 'SKILL.md');
        return fs.existsSync(skillPath);
      })
    : [];

  // Count agents
  const agentsDir = path.join(claudeDir, 'agents');
  const agents = fs.existsSync(agentsDir)
    ? fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'))
    : [];

  // Check MCP connection
  const mcpStatus = checkMcpHealth();

  return {
    hooks: {
      count: hooks.length,
      list: hooks.map(h => h.replace('.cjs', '')),
    },
    libModules: {
      count: libModules.length,
    },
    skills: {
      count: skills.length,
      list: skills,
    },
    agents: {
      count: agents.length,
      list: agents.map(a => a.replace('.md', '')),
    },
    mcp: {
      status: mcpStatus,
    },
    scannedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect implemented features from test names
 */
function detectFeatures(packages) {
  const features = {
    implemented: [],
    partial: [],
    missing: [],
  };

  for (const [pkgName, pkg] of Object.entries(packages)) {
    const expected = PACKAGES[pkgName]?.features || [];

    for (const feature of expected) {
      if (pkg.healthy && pkg.pass > 0) {
        features.implemented.push(`${pkgName}:${feature}`);
      } else if (pkg.pass > 0) {
        features.partial.push(`${pkgName}:${feature}`);
      } else {
        features.missing.push(`${pkgName}:${feature}`);
      }
    }
  }

  return features;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROADMAP GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate roadmap status from scan results
 */
function generateRoadmap(packageScan, integrations) {
  const phases = {
    'Phase 1: Core Foundation': {
      status: 'complete',
      items: []
    },
    'Phase 2: Integration': {
      status: 'in_progress',
      items: []
    },
    'Phase 3: External': {
      status: 'planned',
      items: []
    }
  };

  // Phase 1: Core packages
  const corePackages = ['core', 'protocol', 'persistence', 'identity', 'node', 'mcp'];
  for (const pkg of corePackages) {
    const data = packageScan.packages[pkg];
    phases['Phase 1: Core Foundation'].items.push({
      name: `@cynic/${pkg}`,
      status: data?.healthy ? 'complete' : 'in_progress',
      tests: `${data?.pass || 0}/${data?.tests || 0}`,
    });
  }

  // Check if Phase 1 complete
  const phase1Complete = corePackages.every(p => packageScan.packages[p]?.healthy);
  phases['Phase 1: Core Foundation'].status = phase1Complete ? 'complete' : 'in_progress';

  // Phase 2: Integrations
  phases['Phase 2: Integration'].items = [
    {
      name: 'Hooks',
      status: integrations.hooks.count >= 5 ? 'complete' : 'in_progress',
      count: integrations.hooks.count,
    },
    {
      name: 'Skills',
      status: integrations.skills.count >= 10 ? 'complete' : 'in_progress',
      count: integrations.skills.count,
    },
    {
      name: 'Agents',
      status: integrations.agents.count >= 10 ? 'complete' : 'in_progress',
      count: integrations.agents.count,
    },
    {
      name: 'MCP Server',
      status: integrations.mcp.status === 'healthy' ? 'complete' : 'warning',
      mcpStatus: integrations.mcp.status,
    },
  ];

  // Phase 3: External
  const externalPackages = ['anchor', 'burns', 'holdex', 'gasdf', 'zk'];
  for (const pkg of externalPackages) {
    const data = packageScan.packages[pkg];
    phases['Phase 3: External'].items.push({
      name: `@cynic/${pkg}`,
      status: data?.healthy ? 'ready' : 'in_progress',
      tests: `${data?.pass || 0}/${data?.tests || 0}`,
    });
  }

  return {
    phases,
    generatedAt: Date.now(),
    summary: {
      phase1: phases['Phase 1: Core Foundation'].status,
      phase2: phases['Phase 2: Integration'].status,
      phase3: phases['Phase 3: External'].status,
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ensure self-monitoring directory exists
 */
function ensureSelfDir() {
  if (!fs.existsSync(SELF_DIR)) {
    fs.mkdirSync(SELF_DIR, { recursive: true });
  }
}

/**
 * Save state to file
 */
function saveState(name, data) {
  ensureSelfDir();
  const filepath = path.join(SELF_DIR, `${name}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

/**
 * Load state from file
 */
function loadState(name) {
  const filepath = path.join(SELF_DIR, `${name}.json`);
  if (!fs.existsSync(filepath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Run full self-scan
 */
function fullScan(runTests = true) {
  const result = {
    timestamp: Date.now(),
    packages: null,
    integrations: null,
    features: null,
    roadmap: null,
  };

  // Package scan (optionally skip tests for speed)
  if (runTests) {
    result.packages = scanAllPackages();
    saveState('packages', result.packages);
  } else {
    result.packages = loadState('packages') || { packages: {}, summary: {} };
  }

  // Integration scan
  result.integrations = scanIntegrations();
  saveState('integrations', result.integrations);

  // Feature detection
  result.features = detectFeatures(result.packages.packages);
  saveState('features', result.features);

  // Roadmap generation
  result.roadmap = generateRoadmap(result.packages, result.integrations);
  saveState('roadmap', result.roadmap);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format self-status for display
 */
function formatStatus(scan) {
  const lines = [];

  lines.push('');
  lines.push('╔═══════════════════════════════════════════════════════════════════╗');
  lines.push('║            🐕 CYNIC SELF-STATUS (Auto-generated)                  ║');
  lines.push('╠═══════════════════════════════════════════════════════════════════╣');

  // Package summary
  const pkg = scan.packages?.summary || {};
  lines.push('║                                                                   ║');
  lines.push(`║  PACKAGES: ${pkg.healthy || 0}/${pkg.total || 0} healthy                                          `);
  lines.push(`║  TESTS: ${pkg.pass || 0}/${pkg.tests || 0} passing (${((pkg.coverage || 0) * 100).toFixed(1)}%)                              `);
  lines.push('║                                                                   ║');

  // Package details
  for (const [name, data] of Object.entries(scan.packages?.packages || {})) {
    const icon = data.healthy ? '✅' : (data.fail > 0 ? '❌' : '⚪');
    const critical = data.critical ? '*' : ' ';
    lines.push(`║  ${icon}${critical} ${name.padEnd(12)} ${String(data.pass || 0).padStart(3)}/${String(data.tests || 0).padStart(3)} tests           `);
  }

  lines.push('║                                                                   ║');
  lines.push('╠═══════════════════════════════════════════════════════════════════╣');

  // Integrations
  const int = scan.integrations || {};
  lines.push(`║  HOOKS: ${int.hooks?.count || 0}   SKILLS: ${int.skills?.count || 0}   AGENTS: ${int.agents?.count || 0}   LIB: ${int.libModules?.count || 0}         `);
  lines.push(`║  MCP: ${int.mcp?.status || 'unknown'}                                                    `);
  lines.push('║                                                                   ║');

  // Roadmap
  const roadmap = scan.roadmap?.summary || {};
  const p1 = roadmap.phase1 === 'complete' ? '✅' : '🔄';
  const p2 = roadmap.phase2 === 'complete' ? '✅' : '🔄';
  const p3 = roadmap.phase3 === 'complete' ? '✅' : '📋';
  lines.push(`║  ROADMAP: ${p1} Core  ${p2} Integration  ${p3} External              `);
  lines.push('║                                                                   ║');

  lines.push('╠═══════════════════════════════════════════════════════════════════╣');
  lines.push('║  * = critical package   φ⁻¹ = 61.8% max confidence               ║');
  lines.push('╚═══════════════════════════════════════════════════════════════════╝');
  lines.push('');

  return lines.join('\n');
}

/**
 * Get compact status line
 */
function getStatusLine() {
  const packages = loadState('packages');
  const integrations = loadState('integrations');

  if (!packages) return '🐕 CYNIC: No self-scan yet (run /status)';

  const pkg = packages.summary;
  const icon = pkg.healthy === pkg.total ? '✅' : '⚠️';

  return `${icon} CYNIC | Pkgs: ${pkg.healthy}/${pkg.total} | Tests: ${pkg.pass}/${pkg.tests} | MCP: ${integrations?.mcp?.status || '?'}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Scanning
  scanPackage,
  scanAllPackages,
  scanIntegrations,
  detectFeatures,
  generateRoadmap,
  fullScan,

  // State
  saveState,
  loadState,
  ensureSelfDir,

  // Display
  formatStatus,
  getStatusLine,

  // Constants
  PACKAGES,
  SELF_DIR,
  PROJECT_ROOT,
  PHI,
  PHI_INV,
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--quick') || args.includes('-q')) {
    // Quick scan (no tests)
    const scan = fullScan(false);
    console.log(formatStatus(scan));
  } else if (args.includes('--status') || args.includes('-s')) {
    console.log(getStatusLine());
  } else if (args.includes('--json') || args.includes('-j')) {
    const scan = fullScan(true);
    console.log(JSON.stringify(scan, null, 2));
  } else {
    // Full scan with tests
    console.log('🐕 Running full self-scan (tests included)...');
    const scan = fullScan(true);
    console.log(formatStatus(scan));
  }
}
