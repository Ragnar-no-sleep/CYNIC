#!/usr/bin/env node
/**
 * TIKKUN - Complete Repair
 *
 * "Repair of the world"
 *
 * Unified system for auditing and testing CYNIC.
 * Combines Da'at (knowledge) and Gevurah (discipline).
 *
 * Usage:
 *   node scripts/tikkun/tikkun.mjs           # Full audit + tests
 *   node scripts/tikkun/tikkun.mjs audit     # Da'at only
 *   node scripts/tikkun/tikkun.mjs test      # Gevurah only
 *   node scripts/tikkun/tikkun.mjs --watch   # Continuous monitoring
 *
 * @module tikkun
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { spawn, execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CYNIC_ROOT = join(__dirname, '..', '..');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;

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
// BANNER
// ═══════════════════════════════════════════════════════════════════════════

function printBanner() {
  console.log(`
${C.magenta}${C.bold}
  ████████╗██╗██╗  ██╗██╗  ██╗██╗   ██╗███╗   ██╗
  ╚══██╔══╝██║██║ ██╔╝██║ ██╔╝██║   ██║████╗  ██║
     ██║   ██║█████╔╝ █████╔╝ ██║   ██║██╔██╗ ██║
     ██║   ██║██╔═██╗ ██╔═██╗ ██║   ██║██║╚██╗██║
     ██║   ██║██║  ██╗██║  ██╗╚██████╔╝██║ ╚████║
     ╚═╝   ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
${C.reset}
${C.dim}  "Repair of the World" - CYNIC Validation System${C.reset}

${C.white}  ┌─────────────────────────────────────────────────────┐
  │  ${C.cyan}DA'AT${C.white}    → Knowledge of system state (Audit)        │
  │  ${C.red}GEVURAH${C.white}  → Discipline and validation (Tests)       │
  │  ${C.green}TIFERET${C.white}  → Balance and beauty (Report)             │
  └─────────────────────────────────────────────────────┘${C.reset}
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNNERS
// ═══════════════════════════════════════════════════════════════════════════

async function runDaat() {
  return new Promise((resolve) => {
    const daatPath = join(__dirname, 'daat.mjs');

    if (!existsSync(daatPath)) {
      console.log(`${C.red}Da'at not found at ${daatPath}${C.reset}`);
      resolve({ summary: { score: 0 }, error: 'File not found' });
      return;
    }

    // Run WITH save so we can read results
    const child = spawn('node', [daatPath], {
      stdio: 'inherit',
      cwd: CYNIC_ROOT,
    });

    child.on('close', (code) => {
      // Read results
      const resultsPath = join(__dirname, 'daat-results.json');
      if (existsSync(resultsPath)) {
        try {
          const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
          resolve(results);
          return;
        } catch (e) {
          // ignore
        }
      }
      resolve({ summary: { score: code === 0 ? 100 : 50 } });
    });
  });
}

async function runGevurah() {
  return new Promise((resolve) => {
    const gevurahPath = join(__dirname, 'gevurah.mjs');

    if (!existsSync(gevurahPath)) {
      console.log(`${C.red}Gevurah not found at ${gevurahPath}${C.reset}`);
      resolve({ summary: { score: 0 }, error: 'File not found' });
      return;
    }

    // Run WITH save so we can read results
    const child = spawn('node', [gevurahPath], {
      stdio: 'inherit',
      cwd: CYNIC_ROOT,
    });

    child.on('close', (code) => {
      // Read results
      const resultsPath = join(__dirname, 'gevurah-results.json');
      if (existsSync(resultsPath)) {
        try {
          const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
          resolve(results);
          return;
        } catch (e) {
          // ignore
        }
      }
      resolve({ summary: { score: code === 0 ? 100 : 50 } });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateReport(daatResults, gevurahResults) {
  const timestamp = new Date().toISOString();

  // Calculate combined score (weighted)
  const daatScore = daatResults?.summary?.score || 0;
  const gevurahScore = gevurahResults?.summary?.score || 0;

  // Weight: Da'at 40%, Gevurah 60% (discipline is more important)
  const combinedScore = Math.round(daatScore * 0.4 + gevurahScore * 0.6);

  const report = {
    timestamp,
    version: '1.0.0',

    // Sefirot mapping
    sefirot: {
      daat: {
        name: "Da'at",
        description: 'Knowledge of system state',
        score: daatScore,
        status: daatScore >= PHI_INV * 100 ? 'healthy' : daatScore >= PHI_INV_2 * 100 ? 'warning' : 'critical',
      },
      gevurah: {
        name: 'Gevurah',
        description: 'Discipline and validation',
        score: gevurahScore,
        status: gevurahScore >= PHI_INV * 100 ? 'healthy' : gevurahScore >= PHI_INV_2 * 100 ? 'warning' : 'critical',
      },
      tiferet: {
        name: 'Tiferet',
        description: 'Balance (combined score)',
        score: combinedScore,
        status: combinedScore >= PHI_INV * 100 ? 'healthy' : combinedScore >= PHI_INV_2 * 100 ? 'warning' : 'critical',
      },
    },

    // Summary
    summary: {
      combinedScore,
      phiThreshold: Math.round(PHI_INV * 100),
      meetsThreshold: combinedScore >= PHI_INV * 100,
      daat: daatResults?.summary,
      gevurah: gevurahResults?.summary,
    },

    // Detailed results
    details: {
      daat: daatResults?.categories,
      gevurah: gevurahResults?.suites,
    },

    // Recommendations
    recommendations: generateRecommendations(daatResults, gevurahResults),
  };

  return report;
}

function generateRecommendations(daatResults, gevurahResults) {
  const recommendations = [];

  // Analyze Da'at failures
  if (daatResults?.categories) {
    for (const [catId, cat] of Object.entries(daatResults.categories)) {
      if (cat.failed > 0) {
        const failedChecks = cat.checks?.filter(c => !c.ok && !c.optional) || [];
        for (const check of failedChecks) {
          recommendations.push({
            severity: 'high',
            category: cat.name,
            issue: check.name,
            message: check.message,
            sefirah: cat.sefirah,
          });
        }
      }
    }
  }

  // Analyze Gevurah failures
  if (gevurahResults?.suites) {
    for (const suite of gevurahResults.suites) {
      if (suite.failed > 0) {
        const failedAssertions = suite.assertions?.filter(a => !a.pass) || [];
        for (const assertion of failedAssertions) {
          recommendations.push({
            severity: 'medium',
            category: suite.name,
            issue: assertion.name,
            message: assertion.error || 'Test failed',
            sefirah: 'Gevurah',
          });
        }
      }
    }
  }

  // Sort by severity
  recommendations.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] || 99) - (order[b.severity] || 99);
  });

  return recommendations.slice(0, 10); // Top 10
}

function printReport(report) {
  console.log(`\n${C.green}${C.bold}═══════════════════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}${C.bold}  TIFERET - Balance Report${C.reset}`);
  console.log(`${C.green}${C.bold}═══════════════════════════════════════════════════════════════════════════${C.reset}\n`);

  // Sefirot Summary
  console.log(`${C.white}  ┌──────────────────────────────────────────────────────────────────┐${C.reset}`);
  console.log(`${C.white}  │                        SEFIROT STATUS                           │${C.reset}`);
  console.log(`${C.white}  ├──────────────────────────────────────────────────────────────────┤${C.reset}`);

  for (const [id, sef] of Object.entries(report.sefirot)) {
    const statusColor = sef.status === 'healthy' ? C.green : sef.status === 'warning' ? C.yellow : C.red;
    const statusIcon = sef.status === 'healthy' ? '✓' : sef.status === 'warning' ? '⚠' : '✗';
    const bar = makeBar(sef.score, 20);

    console.log(`${C.white}  │  ${statusColor}${statusIcon}${C.reset} ${sef.name.padEnd(10)} [${bar}] ${String(sef.score).padStart(3)}%  │${C.reset}`);
  }

  console.log(`${C.white}  └──────────────────────────────────────────────────────────────────┘${C.reset}`);

  // Combined Score
  const score = report.summary.combinedScore;
  const scoreColor = score >= PHI_INV * 100 ? C.green : score >= PHI_INV_2 * 100 ? C.yellow : C.red;

  console.log(`\n   ${C.bold}Combined Score: ${scoreColor}${score}%${C.reset} ${report.summary.meetsThreshold ? `${C.green}(meets φ⁻¹)${C.reset}` : `${C.red}(below φ⁻¹)${C.reset}`}`);

  // Large progress bar
  const bigBar = makeBar(score, 50, true);
  console.log(`   [${bigBar}]`);

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log(`\n${C.yellow}── Recommendations ──${C.reset}\n`);

    for (const rec of report.recommendations.slice(0, 5)) {
      const sevColor = rec.severity === 'high' ? C.red : rec.severity === 'medium' ? C.yellow : C.dim;
      console.log(`   ${sevColor}[${rec.severity.toUpperCase()}]${C.reset} ${rec.issue}`);
      console.log(`   ${C.dim}└─ ${rec.message}${C.reset}\n`);
    }
  }

  // Final verdict
  console.log(`\n${C.green}═══════════════════════════════════════════════════════════════════════════${C.reset}`);

  if (report.summary.meetsThreshold) {
    console.log(`\n   ${C.green}${C.bold}*tail wag* Tikkun complet. L'arbre est en équilibre.${C.reset}`);
    console.log(`   ${C.dim}CYNIC se connaît et se valide. Da'at et Gevurah sont forts.${C.reset}\n`);
  } else if (score >= PHI_INV_2 * 100) {
    console.log(`\n   ${C.yellow}${C.bold}*sniff* Tikkun partiel. Des branches doivent être renforcées.${C.reset}`);
    console.log(`   ${C.dim}Voir les recommandations ci-dessus.${C.reset}\n`);
  } else {
    console.log(`\n   ${C.red}${C.bold}*GROWL* Tikkun urgent. L'arbre est déséquilibré.${C.reset}`);
    console.log(`   ${C.dim}Trop de création (Chesed) sans validation (Gevurah).${C.reset}\n`);
  }

  console.log(`${C.green}═══════════════════════════════════════════════════════════════════════════${C.reset}\n`);
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

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main(options = {}) {
  printBanner();

  const results = {
    daat: null,
    gevurah: null,
  };

  if (options.mode === 'audit' || !options.mode) {
    console.log(`\n${C.cyan}${C.bold}▶ Running Da'at (Audit)...${C.reset}\n`);
    results.daat = await runDaat();
  }

  if (options.mode === 'test' || !options.mode) {
    console.log(`\n${C.red}${C.bold}▶ Running Gevurah (Tests)...${C.reset}\n`);
    results.gevurah = await runGevurah();
  }

  // Generate and print combined report
  if (!options.mode) {
    const report = generateReport(results.daat, results.gevurah);
    printReport(report);

    // Save report
    const reportPath = join(__dirname, 'tikkun-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`${C.dim}Full report saved to: ${reportPath}${C.reset}\n`);

    return report.summary.meetsThreshold ? 0 : 1;
  }

  return 0;
}

// CLI parsing
const args = process.argv.slice(2);
const options = {
  mode: args.find(a => ['audit', 'test'].includes(a)),
  watch: args.includes('--watch'),
  json: args.includes('--json'),
};

main(options)
  .then(exitCode => process.exit(exitCode))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
