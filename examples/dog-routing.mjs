#!/usr/bin/env node
/**
 * CYNIC Dog Routing Example
 *
 * Demonstrates the Kabbalistic routing system:
 * - 11 Dogs (Sefirot) with specialized domains
 * - Q-Learning enhanced routing
 * - Intelligent task-to-dog matching
 *
 * Run: node examples/dog-routing.mjs
 *
 * "Each Sefirah has its purpose" - κυνικός
 */

import {
  KabbalisticRouter,
  createKabbalisticRouter,
  QLearningRouter,
  getQLearningRouter,
  IntelligentRouter,
} from '@cynic/node/orchestration';
import { PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🐕 CYNIC Dog Routing Demo');
console.log('  "Each Sefirah has its purpose"');
console.log('═══════════════════════════════════════════════════════════════\n');

// Create the routers
const kabbalisticRouter = createKabbalisticRouter();
const qLearningRouter = getQLearningRouter();

// ═══════════════════════════════════════════════════════════════════════════
// DOG HIERARCHY (TREE OF LIFE)
// ═══════════════════════════════════════════════════════════════════════════

console.log('── The 11 Dogs (Sefirot) ────────────────────────────────────────\n');

const dogs = [
  { name: 'CYNIC', emoji: '🧠', sefirah: 'Keter', domain: 'Meta-consciousness, coordination' },
  { name: 'Analyst', emoji: '📊', sefirah: 'Binah', domain: 'Data analysis, patterns' },
  { name: 'Scholar', emoji: '📚', sefirah: 'Daat', domain: 'Knowledge, memory' },
  { name: 'Sage', emoji: '🦉', sefirah: 'Chochmah', domain: 'Wisdom, philosophy' },
  { name: 'Guardian', emoji: '🛡️', sefirah: 'Gevurah', domain: 'Security, protection' },
  { name: 'Oracle', emoji: '🔮', sefirah: 'Tiferet', domain: 'Balance, synthesis' },
  { name: 'Architect', emoji: '🏗️', sefirah: 'Chesed', domain: 'Design, creation' },
  { name: 'Deployer', emoji: '🚀', sefirah: 'Hod', domain: 'Deployment, infrastructure' },
  { name: 'Janitor', emoji: '🧹', sefirah: 'Yesod', domain: 'Cleanup, simplification' },
  { name: 'Scout', emoji: '🔍', sefirah: 'Netzach', domain: 'Exploration, discovery' },
  { name: 'Cartographer', emoji: '🗺️', sefirah: 'Malkhut', domain: 'Mapping, reality' },
];

console.log('            🧠 CYNIC (Keter) - Crown');
console.log('       ╱         │         ╲');
console.log('  📊 Analyst  📚 Scholar  🦉 Sage');
console.log('       ╲         │         ╱');
console.log('  🛡️ Guardian  🔮 Oracle  🏗️ Architect');
console.log('       ╲         │         ╱');
console.log('  🚀 Deployer  🧹 Janitor  🔍 Scout');
console.log('            ╲    │    ╱');
console.log('          🗺️ Cartographer (Malkhut)\n');

// ═══════════════════════════════════════════════════════════════════════════
// ROUTING EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

console.log('── Kabbalistic Routing Examples ─────────────────────────────────\n');

const tasks = [
  { content: 'analyze the code patterns in this file', expected: 'Analyst' },
  { content: 'is this command safe to run? rm -rf', expected: 'Guardian' },
  { content: 'what is the meaning of this architecture?', expected: 'Sage' },
  { content: 'deploy this to production', expected: 'Deployer' },
  { content: 'clean up unused imports', expected: 'Janitor' },
  { content: 'find all files with .test.js extension', expected: 'Scout' },
  { content: 'design a new authentication system', expected: 'Architect' },
  { content: 'what do we know about this user?', expected: 'Scholar' },
  { content: 'show me the codebase structure', expected: 'Cartographer' },
  { content: 'synthesize the wisdom from all sources', expected: 'Oracle' },
];

for (const task of tasks) {
  const result = kabbalisticRouter.route(task.content);
  const match = result.dog === task.expected ? '✅' : '⚠️';
  console.log(`  ${match} "${task.content.slice(0, 40)}..."`);
  console.log(`     → ${result.emoji || '🐕'} ${result.dog} (${result.sefirah})`);
  console.log(`     Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Q-LEARNING ROUTER
// ═══════════════════════════════════════════════════════════════════════════

console.log('── Q-Learning Router ────────────────────────────────────────────\n');

console.log('  The Q-Learning router learns from outcomes:');
console.log('  - Tracks success/failure per task type');
console.log('  - Updates Q-values based on feedback');
console.log('  - Balances exploration (10%) vs exploitation (90%)\n');

console.log('  Configuration (φ-aligned):');
console.log(`    Learning rate (α): ${(PHI_INV).toFixed(3)} (φ⁻¹)`);
console.log(`    Discount factor (γ): ${(1 - PHI_INV).toFixed(3)} (φ⁻²)`);
console.log('    Exploration rate (ε): 0.100 (10%)\n');

// Simulate Q-learning with feedback
const qTask = { content: 'analyze security vulnerabilities', type: 'security' };
const qResult = qLearningRouter.selectAction(qTask);

console.log(`  Task: "${qTask.content}"`);
console.log(`  Selected: ${qResult.action} (Q-value: ${qResult.qValue?.toFixed(3) || 'N/A'})`);
console.log(`  Mode: ${qResult.explorationMode ? 'Exploration 🎲' : 'Exploitation 🎯'}`);

// Provide feedback (simulate)
console.log('\n  Simulating positive feedback...');
qLearningRouter.update(qTask, qResult.action, 1.0); // Reward = 1.0
console.log('  Q-table updated for future routing decisions.');

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('  Routing Layers:');
console.log('    1. KabbalisticRouter - Keyword-based sefirah matching');
console.log('    2. QLearningRouter   - Learned routing from feedback');
console.log('    3. IntelligentRouter - Multi-factor decision making\n');

console.log('  Key Principles:');
console.log('    - Each dog has a specialized domain');
console.log('    - Routing confidence capped at φ⁻¹ (61.8%)');
console.log('    - Learning improves routing over time');
console.log('    - Guardian can override any routing for safety');

console.log('\n  *ears perk* Routing demo complete.');
console.log('═══════════════════════════════════════════════════════════════\n');
