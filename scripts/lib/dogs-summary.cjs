#!/usr/bin/env node
/**
 * CYNIC Dogs Summary
 *
 * "Le Collectif observe - chaque Chien a son rôle"
 *
 * Displays activity summary of all 11 Dogs (Sefirot).
 *
 * @module @cynic/scripts/dogs-summary
 */

'use strict';

const dogs = require('./collective-dogs.cjs');

function generateDashboard(useColor = true) {
  const lines = [];
  const { ANSI, DOG_COLORS, colorize } = dogs;

  // Helper for conditional coloring
  const c = (color, text) => useColor ? `${color}${text}${ANSI.reset}` : text;

  const header = '═══════════════════════════════════════════════════════════';
  const title = '🐕 COLLECTIVE DOGS - "Le Collectif observe"';

  lines.push(c(ANSI.cyan, header));
  lines.push(c(ANSI.bold + ANSI.brightYellow, title));
  lines.push(c(ANSI.cyan, header));
  lines.push('');

  // Session Activity
  const summary = dogs.getSessionSummary();

  lines.push(c(ANSI.white, '── SESSION ACTIVITY ───────────────────────────────────────'));
  lines.push(`   Duration: ${c(ANSI.brightCyan, summary.duration + ' min')} │ Actions: ${c(ANSI.brightGreen, summary.totalActions)}`);
  lines.push('');

  if (summary.dogs.length > 0) {
    for (const { name, count, dog } of summary.dogs.slice(0, 5)) {
      const icon = dog?.icon || '🐕';
      const pct = Math.round(count / summary.totalActions * 100);
      const barLen = Math.min(10, Math.round(pct / 10));
      const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
      const color = DOG_COLORS[name] || ANSI.white;

      lines.push(`   ${c(color, icon + ' ' + name.padEnd(12))} [${c(ANSI.brightGreen, bar)}] ${count} (${pct}%)`);
    }

    if (summary.topDog) {
      const top = summary.topDog;
      const greeting = dogs.getDogGreeting(top.dog);
      const color = DOG_COLORS[top.name] || ANSI.white;
      lines.push('');
      lines.push(`   ${c(ANSI.dim, 'MVP:')} ${c(color, top.dog?.icon + ' ' + top.name)} - "${c(ANSI.italic, greeting)}"`);
    }
  } else {
    lines.push(`   ${c(ANSI.dim, 'No activity yet. The pack rests.')}`);
  }
  lines.push('');

  // Sefirot Tree with colors
  lines.push(c(ANSI.white, '── SEFIROT TREE ───────────────────────────────────────────'));
  const tree = [
    `               ${c(DOG_COLORS.CYNIC, '🧠 CYNIC')} (Keter)`,
    '          ╱          │          ╲',
    `    ${c(DOG_COLORS.ANALYST, '📊 Analyst')}   ${c(DOG_COLORS.SCHOLAR, '📚 Scholar')}   ${c(DOG_COLORS.SAGE, '🦉 Sage')}`,
    '          ╲          │          ╱',
    `    ${c(DOG_COLORS.GUARDIAN, '🛡️ Guardian')}  ${c(DOG_COLORS.ORACLE, '🔮 Oracle')}   ${c(DOG_COLORS.ARCHITECT, '🏗️ Architect')}`,
    '          ╲          │          ╱',
    `    ${c(DOG_COLORS.DEPLOYER, '🚀 Deployer')}  ${c(DOG_COLORS.JANITOR, '🧹 Janitor')}  ${c(DOG_COLORS.SCOUT, '🔍 Scout')}`,
    '               ╲     │     ╱',
    `               ${c(DOG_COLORS.CARTOGRAPHER, '🗺️ Cartographer')}`,
  ];
  lines.push(tree.join('\n'));
  lines.push('');

  // All-Time Stats
  const totalStats = dogs.getTotalStats();
  if (totalStats.length > 0) {
    lines.push(c(ANSI.white, '── ALL-TIME STATS ─────────────────────────────────────────'));
    const total = totalStats.reduce((sum, d) => sum + d.count, 0);

    for (const { name, count, dog } of totalStats.slice(0, 5)) {
      const icon = dog?.icon || '🐕';
      const barLen = Math.min(10, Math.round(count / total * 10));
      const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
      const color = DOG_COLORS[name] || ANSI.white;

      lines.push(`   ${c(color, icon + ' ' + name.padEnd(12))} [${c(ANSI.cyan, bar)}] ${count}`);
    }
    lines.push(`   ${c(ANSI.dim, 'Total:')} ${c(ANSI.brightWhite, total)}`);
    lines.push('');
  }

  // Dog Voices Preview
  lines.push(c(ANSI.white, '── DOG VOICES ─────────────────────────────────────────────'));
  const previewDogs = ['SCOUT', 'GUARDIAN', 'ARCHITECT'];
  for (const name of previewDogs) {
    const dog = dogs.COLLECTIVE_DOGS[name];
    const greeting = dogs.getDogGreeting(dog);
    const quirk = dogs.getDogQuirk(dog);
    const color = DOG_COLORS[name] || ANSI.white;

    lines.push(`   ${c(color, dog.icon + ' ' + dog.name)}: ${c(ANSI.dim, quirk)} "${greeting}"`);
  }
  lines.push('');

  // Footer
  lines.push(c(ANSI.cyan, header));
  lines.push(c(ANSI.dim, '*ears perk*') + ' φ guides all. The Collective watches.');
  lines.push(c(ANSI.cyan, header));

  return lines.join('\n');
}

// CLI execution
if (require.main === module) {
  // Check for --no-color flag
  const useColor = !process.argv.includes('--no-color');
  console.log(generateDashboard(useColor));
}

module.exports = { generateDashboard };
