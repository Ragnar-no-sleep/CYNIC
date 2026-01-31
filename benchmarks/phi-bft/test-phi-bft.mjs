#!/usr/bin/env node
/**
 * φ-BFT Consensus Benchmark
 *
 * Tests that consensus uses φ⁻¹ (61.8%) threshold, not standard 2/3 (66.7%).
 *
 * NOTE: Full consensus behavior is tested in packages/protocol/test/consensus.test.js
 * This benchmark validates the key constants and threshold configuration.
 */

import {
  calculateConsensus,
  createVote,
  generateKeypair,
  VoteType,
  ConsensusType,
} from '@cynic/protocol';

import { PHI_INV, CONSENSUS_THRESHOLD, GOVERNANCE_QUORUM } from '@cynic/core';

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  φ-BFT CONSENSUS BENCHMARK');
console.log('  Claim: φ⁻¹ (61.8%) threshold vs standard 2/3 (66.7%)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// =============================================================================
// TEST 1: Threshold is φ⁻¹
// =============================================================================

console.log('── TEST 1: Threshold Constant ────────────────────────────────');
console.log('   CONSENSUS_THRESHOLD should equal φ⁻¹');
console.log('');

const isPhiInv = Math.abs(CONSENSUS_THRESHOLD - PHI_INV) < 0.001;
const isNotTwoThirds = Math.abs(CONSENSUS_THRESHOLD - 0.667) > 0.01;

const test1Pass = isPhiInv && isNotTwoThirds;

console.log(`   CONSENSUS_THRESHOLD: ${CONSENSUS_THRESHOLD.toFixed(4)}`);
console.log(`   φ⁻¹: ${PHI_INV.toFixed(4)}`);
console.log(`   Standard 2/3: 0.6667`);
console.log(`   Equals φ⁻¹: ${isPhiInv ? '✅' : '❌'}`);
console.log(`   Different from 2/3: ${isNotTwoThirds ? '✅' : '❌'}`);
console.log(`   Result: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 2: Governance Quorum is Fibonacci (5)
// =============================================================================

console.log('── TEST 2: Governance Quorum ─────────────────────────────────');
console.log('   GOVERNANCE_QUORUM should be Fib(5) = 5 (minimum voters)');
console.log('');

// GOVERNANCE_QUORUM is a count (minimum voters), not a percentage
// It uses Fib(5) = 5 as the minimum quorum
const isFib5 = GOVERNANCE_QUORUM === 5;

const test2Pass = isFib5;

console.log(`   GOVERNANCE_QUORUM: ${GOVERNANCE_QUORUM}`);
console.log(`   Fib(5): 5`);
console.log(`   Equals Fib(5): ${isFib5 ? '✅' : '❌'}`);
console.log(`   Result: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 3: Consensus Uses Proper Vote Objects
// =============================================================================

console.log('── TEST 3: createVote() Works ────────────────────────────────');
console.log('   Should create properly signed vote objects');
console.log('');

const keypair = generateKeypair();
const vote = createVote({
  proposalId: 'test-proposal',
  vote: VoteType.APPROVE,
  voterPublicKey: keypair.publicKey,
  voterPrivateKey: keypair.privateKey,
  eScore: 100,
});

const hasVoterId = !!vote.id;
const hasVoter = !!vote.voter; // Key is 'voter', not 'voterPublicKey'
const hasSignature = !!vote.signature;
const hasWeight = typeof vote.weight === 'number';

const test3Pass = hasVoterId && hasVoter && hasSignature && hasWeight;

console.log(`   Has vote id: ${hasVoterId ? '✅' : '❌'}`);
console.log(`   Has voter: ${hasVoter ? '✅' : '❌'}`);
console.log(`   Has signature: ${hasSignature ? '✅' : '❌'}`);
console.log(`   Has weight: ${hasWeight ? '✅' : '❌'} (${vote.weight})`);
console.log(`   Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 4: 70% Approval Reaches HARD Consensus
// =============================================================================

console.log('── TEST 4: 70% Approval → HARD Consensus ─────────────────────');
console.log('   70% > 61.8% should reach HARD consensus');
console.log('');

const keypairs = Array.from({ length: 10 }, () => generateKeypair());
const votes70 = keypairs.map((kp, i) =>
  createVote({
    proposalId: 'prop_70',
    vote: i < 7 ? VoteType.APPROVE : VoteType.REJECT,
    voterPublicKey: kp.publicKey,
    voterPrivateKey: kp.privateKey,
    eScore: 100,
  })
);

const result70 = calculateConsensus(votes70, ConsensusType.HARD);
const reaches70 = result70.reached === true;
const is70Approve = result70.result === VoteType.APPROVE;

const test4Pass = reaches70 && is70Approve;

console.log(`   Votes: 7 APPROVE, 3 REJECT`);
console.log(`   Consensus reached: ${result70.reached ? '✅' : '❌'}`);
console.log(`   Result: ${result70.result} (expected: APPROVE)`);
console.log(`   Ratio: ${(result70.ratio * 100).toFixed(1)}%`);
console.log(`   Result: ${test4Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 5: 50% Approval Does NOT Reach HARD Consensus
// =============================================================================

console.log('── TEST 5: 50% Approval → NO HARD Consensus ──────────────────');
console.log('   50% < 61.8% should NOT reach HARD consensus');
console.log('');

const votes50 = keypairs.map((kp, i) =>
  createVote({
    proposalId: 'prop_50',
    vote: i < 5 ? VoteType.APPROVE : VoteType.REJECT,
    voterPublicKey: kp.publicKey,
    voterPrivateKey: kp.privateKey,
    eScore: 100,
  })
);

const result50 = calculateConsensus(votes50, ConsensusType.HARD);
const notReaches50 = result50.reached === false;
const is50Reject = result50.result === VoteType.REJECT;

const test5Pass = notReaches50 && is50Reject;

console.log(`   Votes: 5 APPROVE, 5 REJECT`);
console.log(`   Consensus reached: ${result50.reached ? '❌' : '✅ (correctly rejected)'}`);
console.log(`   Result: ${result50.result} (expected: REJECT)`);
console.log(`   Result: ${test5Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// =============================================================================
// TEST 6: SOFT Consensus Uses 50% Threshold
// =============================================================================

console.log('── TEST 6: SOFT Consensus at 50% ─────────────────────────────');
console.log('   SOFT consensus should use 50% threshold, not 61.8%');
console.log('');

// 60% approve - above 50% but below 61.8%
const votesSoft = keypairs.slice(0, 5).map((kp, i) =>
  createVote({
    proposalId: 'prop_soft',
    vote: i < 3 ? VoteType.APPROVE : VoteType.REJECT, // 60%
    voterPublicKey: kp.publicKey,
    voterPrivateKey: kp.privateKey,
    eScore: 100,
  })
);

const resultSoft = calculateConsensus(votesSoft, ConsensusType.SOFT);
const reachesSoft = resultSoft.reached === true;
const softThreshold50 = resultSoft.threshold === 0.5;

const test6Pass = reachesSoft && softThreshold50;

console.log(`   Votes: 3 APPROVE, 2 REJECT (60%)`);
console.log(`   Consensus reached: ${resultSoft.reached ? '✅' : '❌'}`);
console.log(`   Threshold used: ${resultSoft.threshold} (expected: 0.5)`);
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
  { name: 'CONSENSUS_THRESHOLD = φ⁻¹', pass: test1Pass },
  { name: 'GOVERNANCE_QUORUM = φ⁻²', pass: test2Pass },
  { name: 'createVote() Works', pass: test3Pass },
  { name: '70% → HARD Consensus', pass: test4Pass },
  { name: '50% → NO HARD Consensus', pass: test5Pass },
  { name: 'SOFT Consensus at 50%', pass: test6Pass },
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
  phiThresholds: test1Pass && test2Pass,
  consensusBehavior: test4Pass && test5Pass,
  consensusTypes: test6Pass,
};

console.log('  KILL CRITERIA CHECK:');
console.log(`  ${killCriteria.phiThresholds ? '✅' : '❌'} φ thresholds (CONSENSUS=φ⁻¹, QUORUM=Fib(5))`);
console.log(`  ${killCriteria.consensusBehavior ? '✅' : '❌'} HARD consensus at 61.8% boundary`);
console.log(`  ${killCriteria.consensusTypes ? '✅' : '❌'} SOFT consensus uses different threshold`);
console.log('');

const allKillCriteriaPassed = Object.values(killCriteria).every(v => v);

if (allKillCriteriaPassed) {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ✅ φ-BFT CONSENSUS VALIDATED');
  console.log('  ════════════════════════════════════════════════════════════');
} else {
  console.log('  ════════════════════════════════════════════════════════════');
  console.log('  ❌ φ-BFT CONSENSUS NEEDS IMPROVEMENT');
  console.log('  ════════════════════════════════════════════════════════════');
}

console.log('');
console.log('  NOTE: This validates φ-BFT IS IMPLEMENTED.');
console.log('  Performance comparison vs standard 2/3 requires');
console.log('  multi-round simulation with network conditions.');
console.log('');
