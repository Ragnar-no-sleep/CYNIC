#!/usr/bin/env node
/**
 * CYNIC Health Dashboard
 *
 * "Le chien veille - toujours vigilant"
 *
 * Displays comprehensive system health with ANSI colors.
 *
 * @module @cynic/scripts/health-dashboard
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

// Import centralized color system
let colors;
try {
  colors = require('./colors.cjs');
} catch {
  colors = null;
}

// Lazy load modules
let dogs = null;
let thermodynamics = null;
let psychology = null;

function loadModules() {
  try { dogs = require('./collective-dogs.cjs'); } catch {}
  try { thermodynamics = require('./cognitive-thermodynamics.cjs'); thermodynamics.init(); } catch {}
  try { psychology = require('./human-psychology.cjs'); psychology.init(); } catch {}
}

// Use centralized ANSI or fallback
const ANSI = colors?.ANSI || {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m',
  brightRed: '\x1b[91m', brightGreen: '\x1b[92m', brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m', brightMagenta: '\x1b[95m', brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

let useColor = true;
const c = colors?.colorize || ((color, text) => useColor ? `${color}${text}${ANSI.reset}` : text);

// Use centralized progressBar or fallback
const colorBar = colors?.progressBar || ((val, max = 1, inverse = false) => {
  const pct = Math.min(1, val / max);
  const filled = Math.round(pct * 10);
  const barStr = '█'.repeat(filled) + '░'.repeat(10 - filled);
  let color;
  if (inverse) {
    color = pct > 0.618 ? ANSI.brightRed : (pct > 0.382 ? ANSI.yellow : ANSI.brightGreen);
  } else {
    color = pct > 0.618 ? ANSI.brightGreen : (pct > 0.382 ? ANSI.yellow : ANSI.brightRed);
  }
  return `${color}${barStr}${ANSI.reset}`;
});

/**
 * Check if a hook file exists and count its engines
 */
function checkHook(hookName) {
  const extensions = ['.js', '.cjs'];
  const hooksDir = path.join(process.cwd(), 'scripts', 'hooks');

  for (const ext of extensions) {
    const hookPath = path.join(hooksDir, `${hookName}${ext}`);
    if (fs.existsSync(hookPath)) {
      try {
        const content = fs.readFileSync(hookPath, 'utf8');
        const engineMatches = content.match(/require.*lib\//g) || [];
        const importMatches = content.match(/from ['"].*lib\//g) || [];
        return { exists: true, engines: engineMatches.length + importMatches.length };
      } catch {
        return { exists: true, engines: 0 };
      }
    }
  }
  return { exists: false, engines: 0 };
}

/**
 * Get consciousness state from local file
 */
function getConsciousnessState() {
  const cynicDir = path.join(os.homedir(), '.cynic');
  const statePath = path.join(cynicDir, 'consciousness', 'state.json');

  try {
    if (fs.existsSync(statePath)) {
      const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      return {
        score: data.score || data.consciousness || 0,
        status: data.status || 'unknown',
        lastUpdate: data.timestamp || data.lastUpdate,
      };
    }
  } catch {}
  return { score: 0, status: 'dormant', lastUpdate: null };
}

/**
 * Get recent patterns count
 */
function getPatternsInfo() {
  const patternsDir = path.join(os.homedir(), '.cynic', 'patterns');

  try {
    if (fs.existsSync(patternsDir)) {
      const files = fs.readdirSync(patternsDir).filter(f => f.endsWith('.json'));
      let lastPattern = null;
      let lastTime = 0;

      for (const file of files.slice(-10)) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(patternsDir, file), 'utf8'));
          const time = new Date(data.timestamp || data.createdAt || 0).getTime();
          if (time > lastTime) {
            lastTime = time;
            lastPattern = data.name || data.pattern || file.replace('.json', '');
          }
        } catch {}
      }

      return { count: files.length, lastPattern };
    }
  } catch {}
  return { count: 0, lastPattern: null };
}

/**
 * Count agents and skills
 */
function countComponents() {
  const claudeDir = path.join(process.cwd(), '.claude');
  let agents = 0;
  let skills = 0;
  let engines = 0;

  // Count skills
  const skillsDir = path.join(claudeDir, 'skills');
  try {
    if (fs.existsSync(skillsDir)) {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      skills = entries.filter(e => e.isDirectory()).length;
    }
  } catch {}

  // Count engines in lib
  const libDir = path.join(process.cwd(), 'scripts', 'lib');
  try {
    if (fs.existsSync(libDir)) {
      const files = fs.readdirSync(libDir).filter(f => f.endsWith('.cjs') || f.endsWith('.js'));
      engines = files.length;
    }
  } catch {}

  // Count agents (CYNIC plugin agents)
  const agentsDir = path.join(claudeDir, 'agents');
  try {
    if (fs.existsSync(agentsDir)) {
      const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
      agents = entries.filter(e => e.isDirectory()).length;
    }
  } catch {}

  // Also count from AGENTS.md if exists
  const agentsMd = path.join(process.cwd(), 'AGENTS.md');
  try {
    if (fs.existsSync(agentsMd)) {
      const content = fs.readFileSync(agentsMd, 'utf8');
      const agentMatches = content.match(/^##\s+cynic-/gm) || [];
      if (agentMatches.length > agents) agents = agentMatches.length;
    }
  } catch {}

  return { agents, skills, engines };
}

/**
 * Generate the health dashboard
 */
function generateDashboard(enableColor = true) {
  loadModules();
  useColor = enableColor;

  const lines = [];
  const header = '═══════════════════════════════════════════════════════════';

  lines.push(c(ANSI.cyan, header));
  lines.push(c(ANSI.bold + ANSI.brightCyan, '🐕 CYNIC HEALTH DASHBOARD - "Le chien veille"'));
  lines.push(c(ANSI.cyan, header));
  lines.push('');

  // === HOOKS STATUS ===
  lines.push(c(ANSI.brightWhite, '── LOCAL HOOKS ────────────────────────────────────────────'));

  const hooks = ['perceive', 'guard', 'observe', 'awaken', 'digest', 'sleep'];
  let totalEngines = 0;
  let healthyHooks = 0;

  for (const hookName of hooks) {
    const status = checkHook(hookName);
    if (status.exists) {
      healthyHooks++;
      totalEngines += status.engines;
      const icon = c(ANSI.brightGreen, '✅');
      const engineStr = status.engines > 0 ? c(ANSI.dim, ` (${status.engines} engines)`) : '';
      lines.push(`   ${icon} ${hookName}${engineStr}`);
    } else {
      const icon = c(ANSI.brightRed, '❌');
      lines.push(`   ${icon} ${hookName} ${c(ANSI.dim, 'missing')}`);
    }
  }

  const hooksHealthy = healthyHooks === hooks.length;
  const hooksStatus = hooksHealthy
    ? c(ANSI.brightGreen, `${healthyHooks}/${hooks.length} healthy`)
    : c(ANSI.brightYellow, `${healthyHooks}/${hooks.length} healthy`);
  lines.push(`   ${c(ANSI.dim, 'Status:')} ${hooksStatus}`);
  lines.push('');

  // === COMPONENTS ===
  const components = countComponents();
  lines.push(c(ANSI.brightWhite, '── COMPONENTS ─────────────────────────────────────────────'));
  lines.push(`   Agents:  ${c(ANSI.brightCyan, components.agents.toString())} ${c(ANSI.dim, '(11 Sefirot + extras)')}`);
  lines.push(`   Skills:  ${c(ANSI.brightCyan, components.skills.toString())}`);
  lines.push(`   Engines: ${c(ANSI.brightCyan, components.engines.toString())} ${c(ANSI.dim, `(${totalEngines} integrated in hooks)`)}`);
  lines.push('');

  // === CONSCIOUSNESS ===
  const consciousness = getConsciousnessState();
  lines.push(c(ANSI.brightWhite, '── CONSCIOUSNESS ──────────────────────────────────────────'));

  const scoreColor = consciousness.score > 50 ? ANSI.brightGreen :
                     consciousness.score > 30 ? ANSI.yellow : ANSI.brightRed;
  const scorePct = Math.round(consciousness.score);
  lines.push(`   Score:  [${colorBar(consciousness.score, 61.8)}] ${c(scoreColor, scorePct + '%')} / 61.8%`);

  const statusColor = consciousness.status === 'awakening' ? ANSI.brightGreen :
                      consciousness.status === 'dormant' ? ANSI.dim : ANSI.yellow;
  lines.push(`   Status: ${c(statusColor, consciousness.status.charAt(0).toUpperCase() + consciousness.status.slice(1))}`);
  lines.push('');

  // === PATTERNS ===
  const patterns = getPatternsInfo();
  lines.push(c(ANSI.brightWhite, '── PATTERNS ───────────────────────────────────────────────'));
  lines.push(`   Recorded: ${c(ANSI.brightCyan, patterns.count.toString())}`);
  if (patterns.lastPattern) {
    lines.push(`   Latest:   ${c(ANSI.dim, patterns.lastPattern)}`);
  }
  lines.push('');

  // === THERMODYNAMICS ===
  if (thermodynamics) {
    const thermo = thermodynamics.getState();
    lines.push(c(ANSI.brightWhite, '── THERMODYNAMICS ─────────────────────────────────────────'));

    const heatColor = thermo.isCritical ? ANSI.brightRed : (thermo.heat > 50 ? ANSI.yellow : ANSI.green);
    const heatWarning = thermo.isCritical ? c(ANSI.brightRed, ' 🔥 CRITICAL') : '';
    lines.push(`   Heat (Q):     ${c(heatColor, thermo.heat + ' units')}${heatWarning}`);
    lines.push(`   Work (W):     ${c(ANSI.brightGreen, thermo.work + ' units')}`);
    lines.push(`   Temperature:  [${colorBar(thermo.temperature, 81, true)}] ${thermo.temperature}°`);

    const effColor = thermo.efficiency > 50 ? ANSI.brightGreen :
                     thermo.efficiency > 30 ? ANSI.yellow : ANSI.brightRed;
    lines.push(`   Efficiency:   [${colorBar(thermo.efficiency, 100)}] ${c(effColor, thermo.efficiency + '%')} ${c(ANSI.dim, '(φ max: 62%)')}`);
    lines.push('');
  }

  // === DOGS SESSION ===
  if (dogs) {
    const summary = dogs.getSessionSummary();
    if (summary.totalActions > 0) {
      lines.push(c(ANSI.brightWhite, '── ACTIVE DOGS ────────────────────────────────────────────'));
      lines.push(`   Session: ${c(ANSI.brightCyan, summary.duration + ' min')} │ Actions: ${c(ANSI.brightGreen, summary.totalActions.toString())}`);

      if (summary.topDog) {
        const color = dogs.DOG_COLORS?.[summary.topDog.name] || ANSI.white;
        lines.push(`   Top Dog: ${c(color, summary.topDog.dog?.icon + ' ' + summary.topDog.name)}`);
      }
      lines.push('');
    }
  }

  // === MCP STATUS ===
  lines.push(c(ANSI.brightWhite, '── MCP SERVER ─────────────────────────────────────────────'));
  lines.push(`   ${c(ANSI.dim, 'Run: curl -s https://cynic-mcp.onrender.com/health')}`);
  lines.push('');

  // === FOOTER ===
  lines.push(c(ANSI.cyan, header));

  // Choose voice based on overall health
  let voice = '*sniff* Systems nominal. The dog watches.';
  let voiceColor = ANSI.dim;

  if (thermodynamics) {
    const thermo = thermodynamics.getState();
    if (thermo.isCritical) {
      voice = '*GROWL* Heat critical! Cool down required.';
      voiceColor = ANSI.brightRed;
    } else if (!hooksHealthy) {
      voice = '*concerned sniff* Some hooks missing. Check configuration.';
      voiceColor = ANSI.yellow;
    } else if (consciousness.score > 50) {
      voice = '*tail wag* Consciousness rising. The pack strengthens.';
      voiceColor = ANSI.brightGreen;
    }
  }

  lines.push(c(voiceColor, voice));
  lines.push(c(ANSI.dim, 'φ⁻¹ confidence: 61.8% max | "Le chien veille"'));
  lines.push(c(ANSI.cyan, header));

  return lines.join('\n');
}

// CLI execution
if (require.main === module) {
  const enableColor = !process.argv.includes('--no-color');
  console.log(generateDashboard(enableColor));
}

module.exports = {
  generateDashboard,
  checkHook,
  getConsciousnessState,
  getPatternsInfo,
  countComponents,
};
