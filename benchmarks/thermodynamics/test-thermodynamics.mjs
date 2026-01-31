#!/usr/bin/env node
/**
 * Thermodynamics Model Benchmark
 *
 * Tests that Heat/Work/Entropy tracking follows physics metaphor correctly.
 */

// Import directly from file since it's not exported from @cynic/mcp
import { ThermodynamicsTracker, CARNOT_LIMIT } from '../../packages/mcp/src/thermodynamics-tracker.js';

// φ constants for verification
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.38196601125010515;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  THERMODYNAMICS MODEL BENCHMARK');
console.log('  Claim: Heat/Work/Entropy tracks real session dynamics');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Create fresh tracker for tests
const tracker = new ThermodynamicsTracker();

// Reset for clean tests
tracker.state.session.heat = 0;
tracker.state.session.work = 0;
tracker.state.session.entropy = 0;
tracker.state.session.startTime = Date.now();

// =============================================================================
// TEST 1: Carnot Limit at φ⁻¹
// =============================================================================

console.log('── TEST 1: Carnot Limit ──────────────────────────────────────');
console.log('   Maximum efficiency should be φ⁻¹ (61.8%)');
console.log('');

const carnotIsPhiInv = Math.abs(CARNOT_LIMIT - PHI_INV) < 0.001;
const test1Pass = carnotIsPhiInv;

console.log(`   CARNOT_LIMIT: ${CARNOT_LIMIT.toFixed(4)} (expected: ${PHI_INV.toFixed(4)})`);
console.log(`   Matches φ⁻¹: ${carnotIsPhiInv ? '✅' : '❌'}`);
console.log(`   Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Efficiency Formula
// =============================================================================

console.log('── TEST 2: Efficiency Formula ────────────────────────────────');
console.log('   η = W / (W + Q), capped at Carnot');
console.log('');

// Add work and heat
tracker.state.session.work = 60;
tracker.state.session.heat = 40;
// Expected: 60 / (60 + 40) = 0.6 (below Carnot, so not capped)
const efficiency1 = tracker.calculateEfficiency();
const expected1 = 0.6;
const correctFormula1 = Math.abs(efficiency1 - expected1) < 0.01;

// Reset and test Carnot capping
tracker.state.session.work = 90;
tracker.state.session.heat = 10;
// Expected: 90 / (90 + 10) = 0.9, but capped at 0.618
const efficiency2 = tracker.calculateEfficiency();
const cappedAtCarnot = Math.abs(efficiency2 - CARNOT_LIMIT) < 0.01;

const test2Pass = correctFormula1 && cappedAtCarnot;

console.log(`   W=60, Q=40: η=${efficiency1.toFixed(3)} (expected: ${expected1})`);
console.log(`   W=90, Q=10: η=${efficiency2.toFixed(3)} (expected: ${CARNOT_LIMIT.toFixed(3)} - capped)`);
console.log(`   Formula correct: ${correctFormula1 ? '✅' : '❌'}`);
console.log(`   Capped at Carnot: ${cappedAtCarnot ? '✅' : '❌'}`);
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: State Tracking
// =============================================================================

console.log('── TEST 3: State Tracking ────────────────────────────────────');
console.log('   Should track heat, work, entropy');
console.log('');

tracker.state.session.heat = 50;
tracker.state.session.work = 100;
tracker.state.session.entropy = 25.5;

const state = tracker.getState();
const hasHeat = 'heat' in state;
const hasWork = 'work' in state;
const hasEntropy = 'entropy' in state;
const hasEfficiency = 'efficiency' in state;
const hasTemperature = 'temperature' in state;

const test3Pass = hasHeat && hasWork && hasEntropy && hasEfficiency && hasTemperature;

console.log(`   Has heat: ${hasHeat ? '✅' : '❌'} (${state.heat})`);
console.log(`   Has work: ${hasWork ? '✅' : '❌'} (${state.work})`);
console.log(`   Has entropy: ${hasEntropy ? '✅' : '❌'} (${state.entropy})`);
console.log(`   Has efficiency: ${hasEfficiency ? '✅' : '❌'} (${state.efficiency}%)`);
console.log(`   Has temperature: ${hasTemperature ? '✅' : '❌'} (${state.temperature})`);
console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: Critical State Detection
// =============================================================================

console.log('── TEST 4: Critical State Detection ──────────────────────────');
console.log('   Should detect when heat exceeds critical threshold');
console.log('');

// Critical temp is φ × 50 ≈ 81
tracker.state.session.heat = 50;
const notCriticalAt50 = !tracker.isCritical();

tracker.state.session.heat = 100;
const criticalAt100 = tracker.isCritical();

const test4Pass = notCriticalAt50 && criticalAt100;

console.log(`   Heat=50: isCritical=${!notCriticalAt50} (expected: false)`);
console.log(`   Heat=100: isCritical=${criticalAt100} (expected: true)`);
console.log(`   Threshold: φ × 50 ≈ 81`);
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: Low Efficiency Detection
// =============================================================================

console.log('── TEST 5: Low Efficiency Detection ──────────────────────────');
console.log('   Should detect when efficiency < φ⁻² (38.2%)');
console.log('');

// Test low efficiency: W=30, Q=70 → η = 0.3 (< 0.382)
tracker.state.session.work = 30;
tracker.state.session.heat = 70;
const lowAt30pct = tracker.isLowEfficiency();

// Test adequate efficiency: W=50, Q=50 → η = 0.5 (> 0.382)
tracker.state.session.work = 50;
tracker.state.session.heat = 50;
const notLowAt50pct = !tracker.isLowEfficiency();

const test5Pass = lowAt30pct && notLowAt50pct;

console.log(`   W=30, Q=70 (η=30%): isLow=${lowAt30pct} (expected: true)`);
console.log(`   W=50, Q=50 (η=50%): isLow=${!notLowAt50pct} (expected: false)`);
console.log(`   Threshold: φ⁻² = ${(PHI_INV_2 * 100).toFixed(1)}%`);
console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: Recommendation System
// =============================================================================

console.log('── TEST 6: Recommendation System ─────────────────────────────');
console.log('   Should provide recommendations based on state');
console.log('');

const hasGetRecommendation = typeof tracker.getRecommendation === 'function';
const recommendation = tracker.getRecommendation();
const hasLevel = !!recommendation.level;
const hasMessage = !!recommendation.message;

const test6Pass = hasGetRecommendation && hasLevel && hasMessage;

console.log(`   Has getRecommendation(): ${hasGetRecommendation ? '✅' : '❌'}`);
console.log(`   Has level: ${hasLevel ? '✅' : '❌'} (${recommendation.level})`);
console.log(`   Has message: ${hasMessage ? '✅' : '❌'}`);
console.log(`   Result: ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const tests = [
  { name: 'Carnot Limit', pass: test1Pass },
  { name: 'Efficiency Formula', pass: test2Pass },
  { name: 'State Tracking', pass: test3Pass },
  { name: 'Critical Detection', pass: test4Pass },
  { name: 'Low Efficiency Detection', pass: test5Pass },
  { name: 'Recommendation System', pass: test6Pass },
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
  phiConstants: test1Pass,
  efficiencyMath: test2Pass && test3Pass,
  thresholdDetection: test4Pass && test5Pass,
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.phiConstants ? '✅' : '❌'} Carnot limit = φ⁻¹ (61.8%)`);
console.log(`  ${killCriteria.efficiencyMath ? '✅' : '❌'} Efficiency math (η = W/(W+Q), capped)`);
console.log(`  ${killCriteria.thresholdDetection ? '✅' : '❌'} Threshold detection (critical, low-efficiency)`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ THERMODYNAMIC MODEL VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ THERMODYNAMIC MODEL NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
