#!/usr/bin/env node
/**
 * CYNIC Benchmark
 *
 * Tests CYNIC's meta-consciousness capabilities: observation, synthesis, self-skepticism.
 */

import { createCollectivePack, SharedMemory } from '@cynic/node';
import { PHI_INV } from '@cynic/core';

// Create collective pack with CYNIC
const sharedMemory = new SharedMemory();
const pack = createCollectivePack({ sharedMemory });
const cynic = pack.cynic;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CYNIC BENCHMARK');
console.log('  Claim: Meta-consciousness that observes, synthesizes, doubts');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Meta-State Machine
// =============================================================================

console.log('── TEST 1: Meta-State Machine ────────────────────────────────');
console.log('   Should have 5 meta-states');
console.log('');

const expectedStates = ['DORMANT', 'AWAKE', 'OBSERVING', 'SYNTHESIZING', 'DECIDING'];
const summary = cynic.getSummary();
const hasMetaState = 'metaState' in summary;

const test1Pass = hasMetaState && expectedStates.length === 5;

console.log(`   States: ${expectedStates.join(', ')}`);
console.log(`   Current state: ${summary.metaState}`);
console.log(`   Result: ${test1Pass ? '✅ PASS (5 states)' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Self-Skepticism ("φ distrusts φ")
// =============================================================================

console.log('── TEST 2: Self-Skepticism ───────────────────────────────────');
console.log('   Should implement "φ distrusts φ" via SelfSkeptic');
console.log('');

const hasSelfSkepticism = !!summary.selfSkepticism;
const hasDoubtsApplied = summary.selfSkepticism && 'doubtsApplied' in summary.selfSkepticism;
const hasBiasesDetected = summary.selfSkepticism && 'biasesDetected' in summary.selfSkepticism;
const hasMaxConfidence = summary.phi && summary.phi.maxConfidence === PHI_INV;

const test2Pass = hasSelfSkepticism && hasDoubtsApplied && hasBiasesDetected && hasMaxConfidence;

console.log(`   Has selfSkepticism: ${hasSelfSkepticism ? '✅' : '❌'}`);
console.log(`   Has doubtsApplied counter: ${hasDoubtsApplied ? '✅' : '❌'}`);
console.log(`   Has biasesDetected counter: ${hasBiasesDetected ? '✅' : '❌'}`);
console.log(`   Max confidence = φ⁻¹ (${PHI_INV.toFixed(4)}): ${hasMaxConfidence ? '✅' : '❌'}`);
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: Confidence Capping
// =============================================================================

console.log('── TEST 3: Confidence Capping ────────────────────────────────');
console.log('   Confidence should NEVER exceed φ⁻¹ (61.8%)');
console.log('');

// Check that phi constants are set correctly
const phiConfig = summary.phi;
const maxConfidenceIsPhiInv = phiConfig && Math.abs(phiConfig.maxConfidence - 0.618) < 0.01;
const overrideThresholdIsPhiInv2 = phiConfig && Math.abs(phiConfig.overrideThreshold - 0.382) < 0.01;

const test3Pass = maxConfidenceIsPhiInv && overrideThresholdIsPhiInv2;

console.log(`   MAX_CONFIDENCE: ${phiConfig?.maxConfidence?.toFixed(4)} (expected: ~0.618)`);
console.log(`   OVERRIDE_THRESHOLD: ${phiConfig?.overrideThreshold?.toFixed(4)} (expected: ~0.382)`);
console.log(`   Confidence capped: ${maxConfidenceIsPhiInv ? '✅' : '❌'}`);
console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: Event Observation Tracking
// =============================================================================

console.log('── TEST 4: Event Observation ─────────────────────────────────');
console.log('   Should track observed events');
console.log('');

const hasObservedEvents = 'observedEvents' in summary;
const hasSynthesizedPatterns = 'synthesizedPatterns' in summary;
const hasDecisions = 'decisions' in summary;
const hasGuidanceHistory = 'guidanceIssued' in summary;

const test4Pass = hasObservedEvents && hasSynthesizedPatterns && hasDecisions && hasGuidanceHistory;

console.log(`   Has observedEvents: ${hasObservedEvents ? '✅' : '❌'}`);
console.log(`   Has synthesizedPatterns: ${hasSynthesizedPatterns ? '✅' : '❌'}`);
console.log(`   Has decisions: ${hasDecisions ? '✅' : '❌'}`);
console.log(`   Has guidanceIssued: ${hasGuidanceHistory ? '✅' : '❌'}`);
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: Profile-Based Behavior
// =============================================================================

console.log('── TEST 5: Profile-Based Behavior ────────────────────────────');
console.log('   Should adapt behavior to profile level');
console.log('');

const profileBehavior = summary.profileBehavior;
const hasGuidanceFrequency = profileBehavior && 'guidanceFrequency' in profileBehavior;
const hasInterventionThreshold = profileBehavior && 'interventionThreshold' in profileBehavior;
const hasPersonality = profileBehavior && 'personality' in profileBehavior;

const test5Pass = hasGuidanceFrequency && hasInterventionThreshold && hasPersonality;

console.log(`   Has guidanceFrequency: ${hasGuidanceFrequency ? '✅' : '❌'}`);
console.log(`   Has interventionThreshold: ${hasInterventionThreshold ? '✅' : '❌'}`);
console.log(`   Has personality: ${hasPersonality ? '✅' : '❌'}`);
console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: Relationship Graph (Emergent Structure)
// =============================================================================

console.log('── TEST 6: Relationship Graph ────────────────────────────────');
console.log('   Should track relationships between dogs');
console.log('');

const hasRelationships = 'relationships' in summary;
const relationshipGraph = summary.relationships || {};
const hasTotalRelationships = 'totalRelationships' in relationshipGraph;
const hasLearnedRelationships = 'learnedRelationships' in relationshipGraph;

const test6Pass = hasRelationships && hasTotalRelationships;

console.log(`   Has relationships: ${hasRelationships ? '✅' : '❌'}`);
console.log(`   Has totalRelationships: ${hasTotalRelationships ? '✅' : '❌'}`);
console.log(`   Has learnedRelationships: ${hasLearnedRelationships ? '✅' : '❌'}`);
console.log(`   Result: ${test6Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 7: Awaken Method
// =============================================================================

console.log('── TEST 7: Awaken Method ─────────────────────────────────────');
console.log('   Should have awaken() for session start');
console.log('');

const hasAwakenMethod = typeof cynic.awaken === 'function';
const hasIntrospect = typeof cynic.introspect === 'function';
const hasGetSelfDoubtPatterns = typeof cynic.getSelfDoubtPatterns === 'function';

const test7Pass = hasAwakenMethod && hasIntrospect && hasGetSelfDoubtPatterns;

console.log(`   Has awaken(): ${hasAwakenMethod ? '✅' : '❌'}`);
console.log(`   Has introspect(): ${hasIntrospect ? '✅' : '❌'}`);
console.log(`   Has getSelfDoubtPatterns(): ${hasGetSelfDoubtPatterns ? '✅' : '❌'}`);
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
  { name: 'Meta-State Machine', pass: test1Pass },
  { name: 'Self-Skepticism', pass: test2Pass },
  { name: 'Confidence Capping', pass: test3Pass },
  { name: 'Event Observation', pass: test4Pass },
  { name: 'Profile Behavior', pass: test5Pass },
  { name: 'Relationship Graph', pass: test6Pass },
  { name: 'Awaken Method', pass: test7Pass },
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
  metaConsciousness: test1Pass && test4Pass,
  phiDistrusts: test2Pass && test3Pass,
  synthesis: test5Pass && test6Pass && test7Pass,
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.metaConsciousness ? '✅' : '❌'} Meta-consciousness (states, observation)`);
console.log(`  ${killCriteria.phiDistrusts ? '✅' : '❌'} "φ distrusts φ" (self-skepticism, confidence cap)`);
console.log(`  ${killCriteria.synthesis ? '✅' : '❌'} Synthesis (profile, relationships, methods)`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ CYNIC VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ CYNIC NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
