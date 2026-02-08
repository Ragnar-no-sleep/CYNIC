#!/usr/bin/env node
/**
 * DA'AT Doc Health — Detect stale documentation
 *
 * Scans docs/ for "Last verified" or "Generated" dates.
 * Flags any doc >7 days old as STALE.
 * Flags any doc >30 days old as ROTTEN.
 *
 * Usage:
 *   node scripts/tikkun/doc-health.mjs           # Human-readable output
 *   node scripts/tikkun/doc-health.mjs --json     # JSON output
 *   node scripts/tikkun/doc-health.mjs --ci       # Exit 1 if ROTTEN docs found
 *
 * "Le chien renifle les docs mortes" - κυνικός
 *
 * @module scripts/tikkun/doc-health
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, '..', '..', '..');

const PHI_INV = 0.618;
const STALE_DAYS = 7;
const ROTTEN_DAYS = 30;

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir, files = []) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findMarkdownFiles(fullPath, files);
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  return files;
}

/**
 * Extract date from doc header patterns:
 * - "Last verified: 2026-02-08"
 * - "Generated: 2026-02-07"
 * - "Date: 2026-02-02"
 * - "Derniere analyse: 2026-02-05"
 * - "Derniere mise a jour: 2026-02-02"
 * - "Document created: 2026-02-05"
 */
function extractDate(content) {
  const patterns = [
    /Last verified:\s*(\d{4}-\d{2}-\d{2})/i,
    /Generated:\s*(\d{4}-\d{2}-\d{2})/i,
    /Date:\s*(\d{4}-\d{2}-\d{2})/i,
    /Derni[eè]re (?:analyse|mise [aà] jour):\s*(\d{4}-\d{2}-\d{2})/i,
    /Document created:\s*(\d{4}-\d{2}-\d{2})/i,
    /Updated?:\s*(\d{4}-\d{2}-\d{2})/i,
  ];

  // Prefer "Last verified" over "Generated" (more recent)
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return { date: match[1], source: pattern.source.split('\\s')[0].replace(/[\\()]/g, '') };
    }
  }
  return null;
}

/**
 * Calculate staleness level
 */
function getStatus(daysOld) {
  if (daysOld > ROTTEN_DAYS) return 'ROTTEN';
  if (daysOld > STALE_DAYS) return 'STALE';
  return 'FRESH';
}

function run(options = {}) {
  const docDirs = [
    join(ROOT, 'docs'),
    join(ROOT, '.claude', 'plans'),
  ];

  const results = [];
  const now = new Date();

  for (const dir of docDirs) {
    const files = findMarkdownFiles(dir);
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8');
        const dateInfo = extractDate(content);
        const stat = statSync(file);
        const relPath = relative(ROOT, file);

        if (dateInfo) {
          const docDate = new Date(dateInfo.date);
          const daysOld = Math.floor((now - docDate) / (1000 * 60 * 60 * 24));
          const status = getStatus(daysOld);

          results.push({
            file: relPath,
            date: dateInfo.date,
            dateSource: dateInfo.source,
            daysOld,
            status,
            mtime: stat.mtime.toISOString().split('T')[0],
          });
        } else {
          // No date header — use file mtime
          const daysOld = Math.floor((now - stat.mtime) / (1000 * 60 * 60 * 24));
          results.push({
            file: relPath,
            date: null,
            dateSource: 'mtime',
            daysOld,
            status: daysOld > STALE_DAYS ? 'NO_DATE' : 'FRESH',
            mtime: stat.mtime.toISOString().split('T')[0],
          });
        }
      } catch {
        // skip unreadable
      }
    }
  }

  // Sort: ROTTEN first, then STALE, then NO_DATE, then FRESH
  const order = { ROTTEN: 0, STALE: 1, NO_DATE: 2, FRESH: 3 };
  results.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));

  if (options.json) {
    const summary = {
      timestamp: now.toISOString(),
      total: results.length,
      rotten: results.filter(r => r.status === 'ROTTEN').length,
      stale: results.filter(r => r.status === 'STALE').length,
      noDate: results.filter(r => r.status === 'NO_DATE').length,
      fresh: results.filter(r => r.status === 'FRESH').length,
      docs: results,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  // Human output
  const rotten = results.filter(r => r.status === 'ROTTEN');
  const stale = results.filter(r => r.status === 'STALE');
  const noDate = results.filter(r => r.status === 'NO_DATE');
  const fresh = results.filter(r => r.status === 'FRESH');

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  DA\'AT Doc Health — "Le chien renifle les docs"');
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  if (rotten.length > 0) {
    console.log(`  🔴 ROTTEN (>${ROTTEN_DAYS} days):`);
    for (const r of rotten) {
      console.log(`     ${r.file} (${r.daysOld}d, ${r.dateSource}: ${r.date})`);
    }
    console.log('');
  }

  if (stale.length > 0) {
    console.log(`  ⚠️  STALE (>${STALE_DAYS} days):`);
    for (const r of stale) {
      console.log(`     ${r.file} (${r.daysOld}d, ${r.dateSource}: ${r.date})`);
    }
    console.log('');
  }

  if (noDate.length > 0) {
    console.log(`  ❓ NO DATE HEADER (using mtime, >${STALE_DAYS} days):`);
    for (const r of noDate) {
      console.log(`     ${r.file} (mtime: ${r.mtime})`);
    }
    console.log('');
  }

  console.log(`  ✅ FRESH: ${fresh.length} docs`);
  console.log('');

  const total = results.length;
  const healthyPct = total > 0 ? Math.round((fresh.length / total) * 100) : 0;
  const cappedPct = Math.min(healthyPct, Math.round(PHI_INV * 100));

  console.log(`  Score: ${cappedPct}% (${fresh.length}/${total} fresh, phi cap: 62%)`);
  console.log(`  ROTTEN: ${rotten.length} | STALE: ${stale.length} | NO_DATE: ${noDate.length} | FRESH: ${fresh.length}`);
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  // Save results
  try {
    const resultsPath = join(ROOT, 'scripts', 'tikkun', 'doc-health-results.json');
    writeFileSync(resultsPath, JSON.stringify({
      timestamp: now.toISOString(),
      total,
      rotten: rotten.length,
      stale: stale.length,
      fresh: fresh.length,
      score: cappedPct,
    }, null, 2));
  } catch {
    // ignore write errors
  }

  if (options.ci && rotten.length > 0) {
    console.log(`*GROWL* ${rotten.length} ROTTEN doc(s) detected. Fix before shipping.`);
    process.exit(1);
  }

  return { rotten: rotten.length, stale: stale.length, fresh: fresh.length };
}

// CLI
const args = process.argv.slice(2);
run({
  json: args.includes('--json'),
  ci: args.includes('--ci'),
});
