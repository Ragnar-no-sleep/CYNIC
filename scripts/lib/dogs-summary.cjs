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

function generateDashboard() {
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('🐕 COLLECTIVE DOGS - "Le Collectif observe"');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  // Session Activity
  const sessionSummary = dogs.formatSessionSummary();
  lines.push(sessionSummary);
  lines.push('');

  // Sefirot Tree
  lines.push('── SEFIROT TREE ───────────────────────────────────────────');
  lines.push(dogs.renderSefirotTree());
  lines.push('');

  // All-Time Stats
  const totalStats = dogs.getTotalStats();
  if (totalStats.length > 0) {
    lines.push('── ALL-TIME STATS ─────────────────────────────────────────');
    const total = totalStats.reduce((sum, d) => sum + d.count, 0);

    for (const { name, count, dog } of totalStats.slice(0, 5)) {
      const icon = dog?.icon || '🐕';
      const bar = '█'.repeat(Math.min(10, Math.round(count / total * 10)));
      lines.push(`   ${icon} ${name.padEnd(12)} [${bar.padEnd(10, '░')}] ${count}`);
    }
    lines.push(`   Total actions: ${total}`);
    lines.push('');
  }

  // Dog Personalities Preview
  lines.push('── DOG VOICES ─────────────────────────────────────────────');
  const preview = ['SCOUT', 'GUARDIAN', 'ARCHITECT'].map(name => {
    const dog = dogs.COLLECTIVE_DOGS[name];
    const greeting = dogs.getDogGreeting(dog);
    const quirk = dogs.getDogQuirk(dog);
    return `   ${dog.icon} ${dog.name}: ${quirk} "${greeting}"`;
  });
  lines.push(preview.join('\n'));
  lines.push('');

  // Footer
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('*ears perk* φ guides all. The Collective watches.');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// CLI execution
if (require.main === module) {
  console.log(generateDashboard());
}

module.exports = { generateDashboard };
