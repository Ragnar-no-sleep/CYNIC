#!/usr/bin/env node
/**
 * Scout Benchmark
 *
 * Tests Scout's codebase exploration capabilities.
 */

import { createCollectivePack, SharedMemory } from '@cynic/node';

// Create collective pack with Scout
const sharedMemory = new SharedMemory();
const pack = createCollectivePack({ sharedMemory });
const scout = pack.scout;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  SCOUT BENCHMARK');
console.log('  Claim: Finds entry points and detects architecture patterns');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Entry Point Detection
// =============================================================================

console.log('── TEST 1: Entry Point Detection ───────────────────────────────');
console.log('   Should find index.js, main.js, app.js, server.js, cli.js');
console.log('');

const filesWithEntryPoints = [
  { name: 'index.js', path: '/project/index.js' },
  { name: 'main.js', path: '/project/src/main.js' },
  { name: 'server.js', path: '/project/server.js' },
  { name: 'utils.js', path: '/project/utils.js' },
  { name: 'helpers.js', path: '/project/helpers.js' },
  { name: 'cli.js', path: '/project/bin/cli.js' },
  { name: 'app.js', path: '/project/app.js' },
];

const entryPointDiscoveries = scout._findEntryPoints(filesWithEntryPoints);
const expectedEntryPoints = ['index.js', 'main.js', 'server.js', 'cli.js', 'app.js'];
const foundEntryPoints = entryPointDiscoveries.map(d => d.details.name);

const test1Pass = expectedEntryPoints.every(ep => foundEntryPoints.includes(ep));

console.log(`   Expected: ${expectedEntryPoints.join(', ')}`);
console.log(`   Found: ${foundEntryPoints.join(', ')}`);
console.log(`   All found: ${test1Pass ? '✅ YES' : '❌ NO'}`);
console.log(`   Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Architecture Pattern - Monorepo
// =============================================================================

console.log('── TEST 2: Architecture Pattern - Monorepo ─────────────────────');
console.log('   Should detect monorepo when packages/ exists');
console.log('');

const monorepoFiles = [
  { name: 'packages', path: '/project/packages' },
  { name: 'src', path: '/project/src' },
  { name: 'package.json', path: '/project/package.json' },
];

const monorepoPattern = scout._detectArchitecturePattern(monorepoFiles);
const test2Pass = monorepoPattern?.pattern === 'monorepo';

console.log(`   Pattern detected: ${monorepoPattern?.pattern || 'none'}`);
console.log(`   Description: ${monorepoPattern?.description || 'N/A'}`);
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: Architecture Pattern - Library
// =============================================================================

console.log('── TEST 3: Architecture Pattern - Library ──────────────────────');
console.log('   Should detect library when src/ and lib/ exist');
console.log('');

const libraryFiles = [
  { name: 'src', path: '/project/src' },
  { name: 'lib', path: '/project/lib' },
  { name: 'package.json', path: '/project/package.json' },
];

const libraryPattern = scout._detectArchitecturePattern(libraryFiles);
const test3Pass = libraryPattern?.pattern === 'library';

console.log(`   Pattern detected: ${libraryPattern?.pattern || 'none'}`);
console.log(`   Description: ${libraryPattern?.description || 'N/A'}`);
console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: Architecture Pattern - Application
// =============================================================================

console.log('── TEST 4: Architecture Pattern - Application ──────────────────');
console.log('   Should detect application when app/ and src/ exist');
console.log('');

const appFiles = [
  { name: 'app', path: '/project/app' },
  { name: 'src', path: '/project/src' },
  { name: 'package.json', path: '/project/package.json' },
];

const appPattern = scout._detectArchitecturePattern(appFiles);
const test4Pass = appPattern?.pattern === 'application';

console.log(`   Pattern detected: ${appPattern?.pattern || 'none'}`);
console.log(`   Description: ${appPattern?.description || 'N/A'}`);
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: Entry Point Purpose Inference
// =============================================================================

console.log('── TEST 5: Entry Point Purpose Inference ───────────────────────');
console.log('   Should infer purpose from filename');
console.log('');

const purposes = {
  'index.js': 'Main module export',
  'main.js': 'Application entry point',
  'server.js': 'Server initialization',
  'cli.js': 'Command-line interface',
};

let purposeMatches = 0;
for (const [file, expected] of Object.entries(purposes)) {
  const inferred = scout._inferPurpose(file);
  const match = inferred === expected;
  console.log(`   ${file}: ${match ? '✅' : '❌'} "${inferred}"`);
  if (match) purposeMatches++;
}

const test5Pass = purposeMatches === Object.keys(purposes).length;
console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: No False Positives on Random Files
// =============================================================================

console.log('── TEST 6: No False Positives on Random Files ──────────────────');
console.log('   Non-entry files should not be flagged');
console.log('');

const randomFiles = [
  { name: 'utils.js', path: '/project/utils.js' },
  { name: 'helpers.js', path: '/project/helpers.js' },
  { name: 'config.json', path: '/project/config.json' },
  { name: 'README.md', path: '/project/README.md' },
  { name: 'test.spec.js', path: '/project/test.spec.js' },
];

const randomDiscoveries = scout._findEntryPoints(randomFiles);
const test6Pass = randomDiscoveries.length === 0;

console.log(`   Entry points found in random files: ${randomDiscoveries.length}`);
console.log(`   Result: ${test6Pass ? '✅ PASS (0 false positives)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const tests = [
  { name: 'Entry Point Detection', pass: test1Pass },
  { name: 'Monorepo Pattern', pass: test2Pass },
  { name: 'Library Pattern', pass: test3Pass },
  { name: 'Application Pattern', pass: test4Pass },
  { name: 'Purpose Inference', pass: test5Pass },
  { name: 'No False Positives', pass: test6Pass },
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
  entryPointDetection: test1Pass,
  architectureDetection: test2Pass && test3Pass && test4Pass,
  purposeInference: test5Pass,
  noFalsePositives: test6Pass,
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.entryPointDetection ? '✅' : '❌'} Entry point detection works`);
console.log(`  ${killCriteria.architectureDetection ? '✅' : '❌'} Architecture pattern detection works`);
console.log(`  ${killCriteria.purposeInference ? '✅' : '❌'} Purpose inference works`);
console.log(`  ${killCriteria.noFalsePositives ? '✅' : '❌'} No false positives`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ SCOUT VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ SCOUT NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
