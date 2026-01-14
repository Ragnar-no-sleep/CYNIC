#!/usr/bin/env node
/**
 * φ-BFT Consensus Test Suite
 *
 * Runs all consensus tests and reports results:
 * 1. Three-node finality
 * 2. Late-join sync
 * 3. Leader rotation
 * 4. Byzantine fault tolerance
 * 5. Network partition recovery
 * 6. Stress test (7 validators)
 * 7. Byzantine stress (10 validators, 2 Byzantine)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TESTS = [
  { name: 'Three-Node Finality', file: 'three-node-finality-test.js' },
  { name: 'Late-Join Sync', file: 'late-join-sync-test.js' },
  { name: 'Leader Rotation', file: 'leader-rotation-test.js' },
  { name: 'Byzantine Fault Tolerance', file: 'byzantine-test.js' },
  { name: 'Partition Recovery', file: 'partition-recovery-test.js' },
  { name: 'Stress Test (7 nodes)', file: 'stress-test.js' },
  { name: 'Byzantine Stress (10 nodes)', file: 'byzantine-stress-test.js' },
];

function runTest(testFile) {
  return new Promise((resolve) => {
    const testPath = join(__dirname, testFile);
    const proc = spawn('node', [testPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: __dirname,
    });

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      const passed = output.includes('✅') && !output.includes('❌ TEST FAILED');
      resolve({
        code,
        passed,
        output,
        errorOutput,
      });
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        code: -1,
        passed: false,
        output,
        errorOutput: 'Test timed out',
      });
    }, 120000);
  });
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         CYNIC φ-BFT Consensus Test Suite                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    const testNum = i + 1;

    console.log(`─────────────────────────────────────────────────────────────`);
    console.log(`[${testNum}/${TESTS.length}] ${test.name}`);
    console.log(`─────────────────────────────────────────────────────────────`);

    const testStart = Date.now();
    const result = await runTest(test.file);
    const duration = ((Date.now() - testStart) / 1000).toFixed(1);

    results.push({
      name: test.name,
      file: test.file,
      passed: result.passed,
      duration,
      code: result.code,
    });

    if (result.passed) {
      console.log(`\n✅ PASSED (${duration}s)\n`);
    } else {
      console.log(`\n❌ FAILED (${duration}s)`);
      if (result.errorOutput) {
        console.log(`Error: ${result.errorOutput.slice(0, 200)}`);
      }
      console.log();
    }
  }

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║                    TEST SUITE RESULTS                     ║`);
  console.log(`╠═══════════════════════════════════════════════════════════╣`);

  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const name = r.name.padEnd(30);
    const time = `${r.duration}s`.padStart(7);
    console.log(`║ ${status} │ ${name} │ ${time} ║`);
  }

  console.log(`╠═══════════════════════════════════════════════════════════╣`);
  console.log(`║ Total: ${passed} passed, ${failed} failed`.padEnd(42) + `│ ${totalTime}s`.padStart(8) + ' ║');
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);

  if (failed === 0) {
    console.log('🎉 All consensus tests passed!\n');
    console.log('φ-BFT Implementation Verified:');
    console.log('  • Multi-node consensus with φ⁻¹ (61.8%) threshold');
    console.log('  • State sync for late-joining nodes');
    console.log('  • Weighted leader rotation');
    console.log('  • Byzantine fault tolerance (equivocation, double-voting)');
    console.log('  • Network partition recovery');
    console.log('  • Scale testing (7-10 validators)');
    console.log();
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} test(s) failed. See details above.\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Suite error:', err);
  process.exit(1);
});
