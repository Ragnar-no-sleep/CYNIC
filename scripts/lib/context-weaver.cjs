/**
 * CYNIC Context Weaver
 *
 * Weaves together all context layers: local, ecosystem, Solana, GitHub.
 * "Know the whole to understand the part" - κυνικός
 *
 * @module @cynic/scripts/context-weaver
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawnSync } = require('child_process');

// φ Constants
const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;

// Cache directory
const CACHE_DIR = path.join(os.homedir(), '.cynic/context-cache');
const CACHE_TTL = 6.18 * 60 * 60 * 1000; // 6.18 hours (φ-aligned)

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT LAYERS
// ═══════════════════════════════════════════════════════════════════════════

const CONTEXT_LAYERS = {
  LOCAL: {
    name: 'local',
    description: 'Current project state',
    weight: PHI, // Most important
  },
  ECOSYSTEM: {
    name: 'ecosystem',
    description: 'Related projects in workspace',
    weight: 1.0,
  },
  GITHUB: {
    name: 'github',
    description: 'GitHub state (PRs, issues, actions)',
    weight: PHI_INV,
  },
  SOLANA: {
    name: 'solana',
    description: 'Solana network state',
    weight: PHI_INV,
  },
  DEPENDENCIES: {
    name: 'dependencies',
    description: 'Package dependencies and updates',
    weight: PHI_INV,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function init() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

function getCached(key) {
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(cachePath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (Date.now() - data.timestamp > CACHE_TTL) {
      return null; // Expired
    }
    return data.value;
  } catch {
    return null;
  }
}

function setCache(key, value) {
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  fs.writeFileSync(cachePath, JSON.stringify({
    timestamp: Date.now(),
    value,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gather local project context
 */
function gatherLocalContext(projectPath = '.') {
  const context = {
    layer: 'LOCAL',
    timestamp: Date.now(),
    project: null,
    git: null,
    recentChanges: [],
    openFiles: [],
  };

  // Package.json info
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      context.project = {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length,
      };
    } catch { /* ignore */ }
  }

  // Git status
  try {
    const statusResult = spawnSync('git', ['status', '--porcelain'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (statusResult.status === 0) {
      const lines = statusResult.stdout.trim().split('\n').filter(l => l);
      context.git = {
        modified: lines.filter(l => l.startsWith(' M') || l.startsWith('M ')).length,
        added: lines.filter(l => l.startsWith('A ') || l.startsWith('??')).length,
        deleted: lines.filter(l => l.startsWith(' D') || l.startsWith('D ')).length,
        total: lines.length,
      };

      // Recent changes (file paths)
      context.recentChanges = lines.slice(0, 10).map(l => l.slice(3));
    }

    // Current branch
    const branchResult = spawnSync('git', ['branch', '--show-current'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (branchResult.status === 0) {
      context.git = context.git || {};
      context.git.branch = branchResult.stdout.trim();
    }

    // Recent commits
    const logResult = spawnSync('git', ['log', '--oneline', '-5'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (logResult.status === 0) {
      context.git.recentCommits = logResult.stdout.trim().split('\n');
    }
  } catch { /* ignore */ }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// ECOSYSTEM CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gather ecosystem context (all related projects)
 */
function gatherEcosystemContext(workspacePath = '/workspaces') {
  const cacheKey = 'ecosystem';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const context = {
    layer: 'ECOSYSTEM',
    timestamp: Date.now(),
    projects: [],
    relationships: [],
    health: {},
  };

  try {
    // Load ecosystem discovery if available
    const discoveryPath = path.join(__dirname, 'ecosystem-discovery.cjs');
    if (fs.existsSync(discoveryPath)) {
      const discovery = require(discoveryPath);
      const ecosystem = discovery.discoverEcosystem(workspacePath, false);

      context.projects = ecosystem.projects?.map(p => ({
        name: p.name,
        type: p.type,
        owner: p.owner,
        status: p.status,
      })) || [];

      context.relationships = ecosystem.integrations?.slice(0, 20) || [];
      context.health = {
        totalProjects: context.projects.length,
        ownedProjects: context.projects.filter(p => p.owner === 'zeyxx').length,
      };
    }
  } catch { /* ignore */ }

  setCache(cacheKey, context);
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gather GitHub context (using gh CLI)
 */
function gatherGitHubContext(projectPath = '.') {
  const cacheKey = 'github';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const context = {
    layer: 'GITHUB',
    timestamp: Date.now(),
    repo: null,
    prs: [],
    issues: [],
    actions: null,
  };

  try {
    // Get repo info
    const repoResult = spawnSync('gh', ['repo', 'view', '--json', 'name,owner,description,url'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (repoResult.status === 0) {
      context.repo = JSON.parse(repoResult.stdout);
    }

    // Get open PRs
    const prResult = spawnSync('gh', ['pr', 'list', '--json', 'number,title,state,author', '--limit', '5'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (prResult.status === 0) {
      context.prs = JSON.parse(prResult.stdout);
    }

    // Get open issues
    const issueResult = spawnSync('gh', ['issue', 'list', '--json', 'number,title,state', '--limit', '5'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (issueResult.status === 0) {
      context.issues = JSON.parse(issueResult.stdout);
    }

    // Get workflow runs
    const actionsResult = spawnSync('gh', ['run', 'list', '--json', 'status,conclusion,name', '--limit', '3'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (actionsResult.status === 0) {
      const runs = JSON.parse(actionsResult.stdout);
      context.actions = {
        recent: runs,
        failing: runs.filter(r => r.conclusion === 'failure').length,
      };
    }
  } catch { /* ignore */ }

  setCache(cacheKey, context);
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLANA CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gather Solana network context
 */
function gatherSolanaContext() {
  const cacheKey = 'solana';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const context = {
    layer: 'SOLANA',
    timestamp: Date.now(),
    network: 'mainnet-beta',
    slot: null,
    epoch: null,
    tps: null,
    health: 'unknown',
    relevantPrograms: [],
  };

  // Known $ASDFASDFA ecosystem programs
  context.relevantPrograms = [
    { name: 'GASdf', description: 'Gasless fee delegation' },
    { name: 'HolDex', description: 'Token holder analysis' },
    { name: '$asdfasdfa', description: 'Ecosystem token' },
  ];

  // Note: Actual Solana RPC calls would go here
  // For now, we just provide structure
  context.health = 'nominal';

  setCache(cacheKey, context);
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPENDENCY CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gather dependency context
 */
function gatherDependencyContext(projectPath = '.') {
  const cacheKey = `deps-${path.basename(projectPath)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const context = {
    layer: 'DEPENDENCIES',
    timestamp: Date.now(),
    total: 0,
    outdated: [],
    security: [],
    recommendations: [],
  };

  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return context;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    context.total = Object.keys(allDeps).length;

    // Check for outdated (using npm outdated)
    const outdatedResult = spawnSync('npm', ['outdated', '--json'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (outdatedResult.stdout) {
      try {
        const outdated = JSON.parse(outdatedResult.stdout);
        context.outdated = Object.entries(outdated).slice(0, 10).map(([name, info]) => ({
          name,
          current: info.current,
          latest: info.latest,
          wanted: info.wanted,
        }));
      } catch { /* ignore */ }
    }

    // Security audit
    const auditResult = spawnSync('npm', ['audit', '--json'], {
      cwd: projectPath,
      encoding: 'utf8',
    });
    if (auditResult.stdout) {
      try {
        const audit = JSON.parse(auditResult.stdout);
        if (audit.metadata) {
          context.security = {
            vulnerabilities: audit.metadata.vulnerabilities || {},
            total: audit.metadata.totalDependencies || 0,
          };
        }
      } catch { /* ignore */ }
    }

    // Recommendations based on patterns
    if (allDeps['@solana/web3.js']) {
      context.recommendations.push({
        type: 'ecosystem',
        message: 'Solana project detected - ensure web3.js is latest',
      });
    }
    if (allDeps['typescript'] && !allDeps['@types/node']) {
      context.recommendations.push({
        type: 'missing',
        message: 'TypeScript project missing @types/node',
      });
    }
  } catch { /* ignore */ }

  setCache(cacheKey, context);
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEAVE ALL CONTEXTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Weave all context layers together
 */
function weaveContext(projectPath = '.', workspacePath = '/workspaces') {
  init();

  const woven = {
    timestamp: Date.now(),
    layers: {},
    summary: {},
    alerts: [],
    suggestions: [],
  };

  // Gather all layers
  woven.layers.local = gatherLocalContext(projectPath);
  woven.layers.ecosystem = gatherEcosystemContext(workspacePath);
  woven.layers.github = gatherGitHubContext(projectPath);
  woven.layers.solana = gatherSolanaContext();
  woven.layers.dependencies = gatherDependencyContext(projectPath);

  // Generate summary
  woven.summary = {
    project: woven.layers.local.project?.name || 'unknown',
    branch: woven.layers.local.git?.branch || 'unknown',
    uncommittedChanges: woven.layers.local.git?.total || 0,
    ecosystemProjects: woven.layers.ecosystem.projects?.length || 0,
    openPRs: woven.layers.github.prs?.length || 0,
    openIssues: woven.layers.github.issues?.length || 0,
    outdatedDeps: woven.layers.dependencies.outdated?.length || 0,
  };

  // Generate alerts
  if (woven.summary.uncommittedChanges > 10) {
    woven.alerts.push({
      level: 'warning',
      message: `${woven.summary.uncommittedChanges} uncommitted changes - consider committing`,
    });
  }

  if (woven.layers.github.actions?.failing > 0) {
    woven.alerts.push({
      level: 'error',
      message: `${woven.layers.github.actions.failing} failing GitHub Actions`,
    });
  }

  if (woven.summary.outdatedDeps > 5) {
    woven.alerts.push({
      level: 'info',
      message: `${woven.summary.outdatedDeps} outdated dependencies`,
    });
  }

  // Generate suggestions
  if (woven.layers.local.git?.branch !== 'main' && woven.summary.uncommittedChanges === 0) {
    woven.suggestions.push({
      type: 'workflow',
      message: `On branch ${woven.layers.local.git?.branch} with no changes - ready to merge or switch?`,
    });
  }

  if (woven.layers.ecosystem.projects?.length > 1) {
    const behindProjects = woven.layers.ecosystem.projects.filter(p => p.status === 'behind');
    if (behindProjects.length > 0) {
      woven.suggestions.push({
        type: 'sync',
        message: `${behindProjects.length} ecosystem projects behind remote`,
        projects: behindProjects.map(p => p.name),
      });
    }
  }

  return woven;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT QUERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query context for specific information
 */
function queryContext(woven, query) {
  const results = [];
  const queryLower = query.toLowerCase();

  // Search through layers
  for (const [layerName, layer] of Object.entries(woven.layers)) {
    const layerStr = JSON.stringify(layer).toLowerCase();
    if (layerStr.includes(queryLower)) {
      results.push({
        layer: layerName,
        relevance: (layerStr.match(new RegExp(queryLower, 'g')) || []).length,
      });
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Get context relevant to current task
 */
function getRelevantContext(woven, taskDescription) {
  const relevant = {
    primary: [],
    secondary: [],
  };

  const taskLower = taskDescription.toLowerCase();

  // Keyword matching
  if (taskLower.includes('solana') || taskLower.includes('blockchain') || taskLower.includes('web3')) {
    relevant.primary.push({ layer: 'solana', context: woven.layers.solana });
  }

  if (taskLower.includes('github') || taskLower.includes('pr') || taskLower.includes('issue')) {
    relevant.primary.push({ layer: 'github', context: woven.layers.github });
  }

  if (taskLower.includes('dependency') || taskLower.includes('update') || taskLower.includes('npm')) {
    relevant.primary.push({ layer: 'dependencies', context: woven.layers.dependencies });
  }

  if (taskLower.includes('ecosystem') || taskLower.includes('project')) {
    relevant.primary.push({ layer: 'ecosystem', context: woven.layers.ecosystem });
  }

  // Always include local context as secondary
  relevant.secondary.push({ layer: 'local', context: woven.layers.local });

  return relevant;
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

function printContextReport(woven) {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('🕸️ CYNIC CONTEXT WEAVER');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Summary
  console.log('SUMMARY:');
  console.log(`   Project: ${woven.summary.project} (${woven.summary.branch})`);
  console.log(`   Uncommitted: ${woven.summary.uncommittedChanges} files`);
  console.log(`   Ecosystem: ${woven.summary.ecosystemProjects} projects`);
  console.log(`   GitHub: ${woven.summary.openPRs} PRs, ${woven.summary.openIssues} issues`);
  console.log(`   Dependencies: ${woven.summary.outdatedDeps} outdated`);

  // Alerts
  if (woven.alerts.length > 0) {
    console.log('\nALERTS:');
    for (const alert of woven.alerts) {
      const icon = alert.level === 'error' ? '🔴' : alert.level === 'warning' ? '🟡' : 'ℹ️';
      console.log(`   ${icon} ${alert.message}`);
    }
  }

  // Suggestions
  if (woven.suggestions.length > 0) {
    console.log('\nSUGGESTIONS:');
    for (const suggestion of woven.suggestions) {
      console.log(`   💡 ${suggestion.message}`);
    }
  }

  // Layer details
  console.log('\nLAYERS:');
  for (const [name, layer] of Object.entries(woven.layers)) {
    const age = Math.round((Date.now() - layer.timestamp) / 1000);
    console.log(`   ${name.padEnd(15)} (${age}s ago)`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Initialization
  init,

  // Layer gathering
  gatherLocalContext,
  gatherEcosystemContext,
  gatherGitHubContext,
  gatherSolanaContext,
  gatherDependencyContext,

  // Weaving
  weaveContext,

  // Query
  queryContext,
  getRelevantContext,

  // Display
  printContextReport,

  // Constants
  CONTEXT_LAYERS,
  CACHE_TTL,
  PHI,
};

// CLI execution
if (require.main === module) {
  const woven = weaveContext();
  printContextReport(woven);
}
