#!/usr/bin/env node
/**
 * Cartographer Benchmark
 *
 * Tests Cartographer's ecosystem mapping and issue detection capabilities.
 */

import { createCollectivePack, SharedMemory } from '@cynic/node';

// Create collective pack with Cartographer
const sharedMemory = new SharedMemory();
const pack = createCollectivePack({ sharedMemory });
const cartographer = pack.cartographer;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CARTOGRAPHER BENCHMARK');
console.log('  Claim: Maps repositories and detects ecosystem issues');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Repo Classification
// =============================================================================

console.log('── TEST 1: Repo Classification ────────────────────────────────');
console.log('   Should classify repos by type based on name patterns');
console.log('');

const testRepos = [
  { name: 'CYNIC-core', expected: 'core' },
  { name: 'cynic-brain', expected: 'core' },
  { name: 'gasdf-deploy', expected: 'infra' },
  { name: 'deploy-tools', expected: 'infra' },
  { name: 'holdex-oracle', expected: 'intel' },
  { name: 'token-intel', expected: 'intel' },
  { name: 'util-tools', expected: 'tool' },
  { name: 'mem-cache', expected: 'tool' },
  { name: 'some-external', fork: false, expected: 'external' },
  { name: 'forked-repo', fork: true, expected: 'fork' },
];

let classificationCorrect = 0;
for (const test of testRepos) {
  const result = cartographer._classifyRepo(test);
  const match = result === test.expected;
  if (match) classificationCorrect++;
  console.log(`   ${match ? '✅' : '❌'} ${test.name} → ${result} (expected: ${test.expected})`);
}

const test1Pass = classificationCorrect >= 8; // Allow 2 misses
console.log(`   Classification accuracy: ${classificationCorrect}/${testRepos.length}`);
console.log(`   Result: ${test1Pass ? '✅ PASS (>= 80%)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Connection Types Exist
// =============================================================================

console.log('── TEST 2: Connection Types ───────────────────────────────────');
console.log('   Should define 6+ connection types');
console.log('');

// Connection types are defined internally - check via strength calculation
const expectedTypes = ['fork', 'dependency', 'import', 'upstream', 'downstream', 'shared_code'];
const foundTypes = [];
for (const type of expectedTypes) {
  const strength = cartographer._calculateConnectionStrength({ type });
  if (strength > 0) foundTypes.push(type.toUpperCase());
}

console.log(`   Defined types: ${foundTypes.join(', ')}`);
const test2Pass = foundTypes.length >= 6;
console.log(`   All expected types found: ${test2Pass ? '✅ YES' : '❌ NO'}`);
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: Circular Dependency Detection
// =============================================================================

console.log('── TEST 3: Circular Dependency Detection ──────────────────────');
console.log('   Should detect circular dependencies');
console.log('');

// Set up circular dependency: A -> B -> C -> A
cartographer.map.repos.clear();
cartographer.map.connections = [];

cartographer.map.repos.set('a/repoA', { name: 'repoA', full_name: 'a/repoA', type: 'core' });
cartographer.map.repos.set('a/repoB', { name: 'repoB', full_name: 'a/repoB', type: 'core' });
cartographer.map.repos.set('a/repoC', { name: 'repoC', full_name: 'a/repoC', type: 'core' });

cartographer.map.connections = [
  { source: 'a/repoA', target: 'a/repoB', type: 'dependency' },
  { source: 'a/repoB', target: 'a/repoC', type: 'dependency' },
  { source: 'a/repoC', target: 'a/repoA', type: 'dependency' }, // Cycle!
];

const cycles = cartographer._findCycles();
const test3Pass = cycles.length > 0;

console.log(`   Injected cycle: A → B → C → A`);
console.log(`   Cycles detected: ${cycles.length}`);
if (cycles.length > 0) {
  console.log(`   Cycle path: ${cycles[0].join(' → ')}`);
}
console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: Orphan Repo Detection
// =============================================================================

console.log('── TEST 4: Orphan Repo Detection ──────────────────────────────');
console.log('   Should detect repos with no connections');
console.log('');

// Clear and set up: A connected, B orphaned
cartographer.map.repos.clear();
cartographer.map.connections = [];
cartographer.issues = [];

cartographer.map.repos.set('a/connected', { name: 'connected', full_name: 'a/connected', type: 'core' });
cartographer.map.repos.set('a/orphan', { name: 'orphan', full_name: 'a/orphan', type: 'core' });

cartographer.map.connections = [
  { source: 'a/connected', target: 'npm/external', type: 'dependency' },
];

// Run issue detection
const issues4 = await cartographer.detectIssues();
const orphanIssues = issues4.filter(i => i.type === 'orphaned_repo');
const test4Pass = orphanIssues.some(i => i.repo === 'a/orphan');

console.log(`   Connected repo: a/connected (has 1 connection)`);
console.log(`   Orphan repo: a/orphan (has 0 connections)`);
console.log(`   Orphan issues detected: ${orphanIssues.length}`);
if (orphanIssues.length > 0) {
  console.log(`   Orphan found: ${orphanIssues[0].repo}`);
}
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: Stale Fork Detection
// =============================================================================

console.log('── TEST 5: Stale Fork Detection ───────────────────────────────');
console.log('   Should detect forks not updated in 233+ days');
console.log('');

// Clear and set up a stale fork
cartographer.map.repos.clear();
cartographer.map.connections = [];
cartographer.issues = [];

const now = Date.now();
const staleDays = 300; // > 233 threshold
const staleDate = new Date(now - (staleDays * 24 * 60 * 60 * 1000)).toISOString();
const freshDate = new Date(now - (10 * 24 * 60 * 60 * 1000)).toISOString();

cartographer.map.repos.set('a/stale-fork', {
  name: 'stale-fork',
  full_name: 'a/stale-fork',
  type: 'fork',
  updated_at: staleDate,
});
cartographer.map.repos.set('a/fresh-fork', {
  name: 'fresh-fork',
  full_name: 'a/fresh-fork',
  type: 'fork',
  updated_at: freshDate,
});

const staleForks = await cartographer._findStaleForks();
const test5Pass = staleForks.some(i => i.repo === 'a/stale-fork') &&
                  !staleForks.some(i => i.repo === 'a/fresh-fork');

console.log(`   Stale fork: a/stale-fork (${staleDays} days old)`);
console.log(`   Fresh fork: a/fresh-fork (10 days old)`);
console.log(`   Stale forks detected: ${staleForks.length}`);
console.log(`   Stale correctly identified: ${staleForks.some(i => i.repo === 'a/stale-fork') ? '✅' : '❌'}`);
console.log(`   Fresh not flagged: ${!staleForks.some(i => i.repo === 'a/fresh-fork') ? '✅' : '❌'}`);
console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: Mermaid Diagram Generation
// =============================================================================

console.log('── TEST 6: Mermaid Diagram Generation ─────────────────────────');
console.log('   Should generate valid Mermaid syntax');
console.log('');

// Set up sample map
cartographer.map.repos.clear();
cartographer.map.connections = [];

cartographer.map.repos.set('a/core-repo', { name: 'core-repo', full_name: 'a/core-repo', type: 'core' });
cartographer.map.repos.set('a/tool-repo', { name: 'tool-repo', full_name: 'a/tool-repo', type: 'tool' });
cartographer.map.connections = [
  { source: 'a/core-repo', target: 'a/tool-repo', type: 'dependency' },
];

const mermaid = cartographer.toMermaid();
const hasDiagramHeader = mermaid.includes('graph TD');
const hasNodes = mermaid.includes('core_repo') && mermaid.includes('tool_repo');
const hasEdges = mermaid.includes('-->');
const hasStyles = mermaid.includes('classDef');

const test6Pass = hasDiagramHeader && hasNodes && hasEdges && hasStyles;

console.log(`   Has 'graph TD' header: ${hasDiagramHeader ? '✅' : '❌'}`);
console.log(`   Has node definitions: ${hasNodes ? '✅' : '❌'}`);
console.log(`   Has edge connections: ${hasEdges ? '✅' : '❌'}`);
console.log(`   Has style classes: ${hasStyles ? '✅' : '❌'}`);
console.log(`   Result: ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 7: Connection Strength Calculation
// =============================================================================

console.log('── TEST 7: Connection Strength Calculation ────────────────────');
console.log('   Dependency connections should be stronger than forks');
console.log('');

const depStrength = cartographer._calculateConnectionStrength({ type: 'dependency' });
const forkStrength = cartographer._calculateConnectionStrength({ type: 'fork' });
const importStrength = cartographer._calculateConnectionStrength({ type: 'import' });

const test7Pass = depStrength > forkStrength && depStrength > 0.5;

console.log(`   Dependency strength: ${depStrength}`);
console.log(`   Fork strength: ${forkStrength}`);
console.log(`   Import strength: ${importStrength}`);
console.log(`   Dependency > Fork: ${depStrength > forkStrength ? '✅' : '❌'}`);
console.log(`   Result: ${test7Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const tests = [
  { name: 'Repo Classification', pass: test1Pass },
  { name: 'Connection Types', pass: test2Pass },
  { name: 'Circular Dependency Detection', pass: test3Pass },
  { name: 'Orphan Repo Detection', pass: test4Pass },
  { name: 'Stale Fork Detection', pass: test5Pass },
  { name: 'Mermaid Diagram Generation', pass: test6Pass },
  { name: 'Connection Strength', pass: test7Pass },
];

let passed = 0;
for (const test of tests) {
  console.log(`  ${test.pass ? '✅' : '❌'} ${test.name}`);
  if (test.pass) passed++;
}

console.log('');
console.log('  ───────────────────────────────────────────────────────────');
console.log(`  Passed: ${passed}/${tests.length} (${((passed/tests.length)*100).toFixed(0)}%)`);
console.log('');

// Kill criteria
const killCriteria = {
  repoClassification: test1Pass,              // >= 80% accuracy
  connectionTypes: test2Pass,                 // All 6 types defined
  circularDetection: test3Pass,               // Detects cycles
  orphanDetection: test4Pass,                 // Detects orphans
  issueDetection: test5Pass,                  // Detects stale forks
  mermaidOutput: test6Pass,                   // Valid Mermaid syntax
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.repoClassification ? '✅' : '❌'} Repo classification >= 80%`);
console.log(`  ${killCriteria.connectionTypes ? '✅' : '❌'} All connection types defined`);
console.log(`  ${killCriteria.circularDetection ? '✅' : '❌'} Circular dependency detection`);
console.log(`  ${killCriteria.orphanDetection ? '✅' : '❌'} Orphan repo detection`);
console.log(`  ${killCriteria.issueDetection ? '✅' : '❌'} Stale fork detection`);
console.log(`  ${killCriteria.mermaidOutput ? '✅' : '❌'} Valid Mermaid output`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ CARTOGRAPHER VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ CARTOGRAPHER NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
