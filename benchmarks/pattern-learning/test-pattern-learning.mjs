#!/usr/bin/env node
/**
 * Pattern Learning Benchmark
 *
 * Tests that pattern learning infrastructure exists and uses φ-derived thresholds.
 *
 * NOTE: Full "learning improves over time" validation requires longitudinal study
 * across multiple sessions. This benchmark validates the infrastructure.
 */

import {
  PatternLearning,
  createPatternLearning,
  DEFAULT_PATTERN_CONFIG,
} from '@cynic/persistence';

const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  PATTERN LEARNING BENCHMARK');
console.log('  Claim: System learns from past judgments and improves');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Default Config Uses φ Thresholds
// =============================================================================

console.log('── TEST 1: φ-derived Thresholds ──────────────────────────────');
console.log('   Config should use φ-aligned values');
console.log('');

const extractionIsPhiInv = Math.abs(DEFAULT_PATTERN_CONFIG.extractionThreshold - PHI_INV) < 0.001;
const similarityIsPhiInv = Math.abs(DEFAULT_PATTERN_CONFIG.similarityThreshold - PHI_INV) < 0.001;
const minConfidenceIsPhiInv3 = Math.abs(DEFAULT_PATTERN_CONFIG.minConfidence - PHI_INV_3) < 0.001;
const decayIsPhiInvOver10 = Math.abs(DEFAULT_PATTERN_CONFIG.confidenceDecay - PHI_INV/10) < 0.001;

const test1Pass = extractionIsPhiInv && similarityIsPhiInv && minConfidenceIsPhiInv3 && decayIsPhiInvOver10;

console.log(`   extractionThreshold: ${DEFAULT_PATTERN_CONFIG.extractionThreshold.toFixed(4)} (expected: φ⁻¹ = ${PHI_INV.toFixed(4)})`);
console.log(`   similarityThreshold: ${DEFAULT_PATTERN_CONFIG.similarityThreshold.toFixed(4)} (expected: φ⁻¹)`);
console.log(`   minConfidence: ${DEFAULT_PATTERN_CONFIG.minConfidence.toFixed(4)} (expected: φ⁻³ = ${PHI_INV_3.toFixed(4)})`);
console.log(`   confidenceDecay: ${DEFAULT_PATTERN_CONFIG.confidenceDecay.toFixed(4)} (expected: φ⁻¹/10 = ${(PHI_INV/10).toFixed(4)})`);
console.log(`   Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Fibonacci Limits
// =============================================================================

console.log('── TEST 2: Fibonacci Limits ──────────────────────────────────');
console.log('   Batch sizes should be Fibonacci numbers');
console.log('');

const fibNumbers = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
const maxPatternsIsFib = fibNumbers.includes(DEFAULT_PATTERN_CONFIG.maxPatternsPerCategory);
const decayPeriodIsFib = fibNumbers.includes(DEFAULT_PATTERN_CONFIG.decayPeriodDays);
const batchSizeIsFib = fibNumbers.includes(DEFAULT_PATTERN_CONFIG.batchSize);

const test2Pass = maxPatternsIsFib && decayPeriodIsFib && batchSizeIsFib;

console.log(`   maxPatternsPerCategory: ${DEFAULT_PATTERN_CONFIG.maxPatternsPerCategory} (Fib: ${maxPatternsIsFib ? '✅' : '❌'})`);
console.log(`   decayPeriodDays: ${DEFAULT_PATTERN_CONFIG.decayPeriodDays} (Fib: ${decayPeriodIsFib ? '✅' : '❌'})`);
console.log(`   batchSize: ${DEFAULT_PATTERN_CONFIG.batchSize} (Fib: ${batchSizeIsFib ? '✅' : '❌'})`);
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: Config is Frozen
// =============================================================================

console.log('── TEST 3: Config Immutability ───────────────────────────────');
console.log('   Default config should be frozen');
console.log('');

const isFrozen = Object.isFrozen(DEFAULT_PATTERN_CONFIG);

const test3Pass = isFrozen;

console.log(`   Object.isFrozen(): ${isFrozen ? '✅' : '❌'}`);
console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: PatternLearning Class Exists
// =============================================================================

console.log('── TEST 4: PatternLearning Class ─────────────────────────────');
console.log('   Should have required methods');
console.log('');

// Can't instantiate without pool, but can check class exists
const hasClass = typeof PatternLearning === 'function';
const hasCreateFunction = typeof createPatternLearning === 'function';

// Check prototype for methods
const proto = PatternLearning.prototype;
const hasExtractMethod = typeof proto.extractFromJudgments === 'function';
const hasDecayMethod = typeof proto.applyConfidenceDecay === 'function';
const hasClusterMethod = typeof proto.clusterPatterns === 'function';
const hasReinforceMethod = typeof proto.reinforcePattern === 'function';
const hasWeakenMethod = typeof proto.weakenPattern === 'function';
const hasRunCycleMethod = typeof proto.runCycle === 'function';
const hasGetStatsMethod = typeof proto.getStats === 'function';

const test4Pass = hasClass && hasCreateFunction && hasExtractMethod && hasDecayMethod && hasClusterMethod;

console.log(`   PatternLearning class: ${hasClass ? '✅' : '❌'}`);
console.log(`   createPatternLearning(): ${hasCreateFunction ? '✅' : '❌'}`);
console.log(`   extractFromJudgments(): ${hasExtractMethod ? '✅' : '❌'}`);
console.log(`   applyConfidenceDecay(): ${hasDecayMethod ? '✅' : '❌'}`);
console.log(`   clusterPatterns(): ${hasClusterMethod ? '✅' : '❌'}`);
console.log(`   reinforcePattern(): ${hasReinforceMethod ? '✅' : '❌'}`);
console.log(`   weakenPattern(): ${hasWeakenMethod ? '✅' : '❌'}`);
console.log(`   runCycle(): ${hasRunCycleMethod ? '✅' : '❌'}`);
console.log(`   getStats(): ${hasGetStatsMethod ? '✅' : '❌'}`);
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: Learning Feedback Loop
// =============================================================================

console.log('── TEST 5: Feedback Loop Methods ─────────────────────────────');
console.log('   Should have reinforce/weaken for feedback');
console.log('');

const hasFeedbackLoop = hasReinforceMethod && hasWeakenMethod;

const test5Pass = hasFeedbackLoop;

console.log(`   reinforcePattern() for positive feedback: ${hasReinforceMethod ? '✅' : '❌'}`);
console.log(`   weakenPattern() for negative feedback: ${hasWeakenMethod ? '✅' : '❌'}`);
console.log(`   Feedback loop exists: ${hasFeedbackLoop ? '✅' : '❌'}`);
console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// SUMMARY
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const tests = [
  { name: 'φ-derived Thresholds', pass: test1Pass },
  { name: 'Fibonacci Limits', pass: test2Pass },
  { name: 'Config Immutability', pass: test3Pass },
  { name: 'PatternLearning Class', pass: test4Pass },
  { name: 'Feedback Loop', pass: test5Pass },
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
  phiConfig: test1Pass && test2Pass,
  infrastructure: test3Pass && test4Pass,
  feedbackMechanism: test5Pass,
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.phiConfig ? '✅' : '❌'} φ-aligned config (thresholds, limits)`);
console.log(`  ${killCriteria.infrastructure ? '✅' : '❌'} Learning infrastructure (extract, decay, cluster)`);
console.log(`  ${killCriteria.feedbackMechanism ? '✅' : '❌'} Feedback mechanism (reinforce/weaken)`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ PATTERN LEARNING INFRASTRUCTURE VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ PATTERN LEARNING NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
console.log('  NOTE: This validates the INFRASTRUCTURE for pattern learning.');
console.log('  Full "improves over time" validation requires longitudinal');
console.log('  study across 10+ sessions with controlled inputs.');
console.log('');
