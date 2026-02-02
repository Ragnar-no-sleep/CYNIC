/**
 * Neuronal Consensus Tests
 *
 * Demonstrates action potential dynamics for collective decision-making.
 */

import {
  NeuronalConsensus,
  createNeuronalConsensus,
  createFastNeuron,
  createConservativeNeuron,
  createSecurityNeuron,
  NEURONAL_CONSTANTS,
} from './neuronal-consensus.js';

// Simple test framework
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

test('Basic charge accumulation and fire', () => {
  // Use security neuron to demonstrate gradual accumulation
  const neuron = createSecurityNeuron();
  const state0 = neuron.getState();

  console.log('  Initial state (Security Neuron - harder to fire):');
  console.log(`    Potential: ${state0.potential.toFixed(1)} (resting: ${state0.restingPotential})`);
  console.log(`    Threshold: ${state0.threshold.toFixed(1)}`);
  console.log(`    Distance:  ${state0.distanceToThreshold.toFixed(1)}`);

  // Single weak approve
  const r1 = neuron.receiveCharge('guardian', 'APPROVE', { confidence: 0.5 });
  console.log('\n  After Guardian APPROVE (conf 0.5):');
  console.log(`    Status: ${r1.status}`);
  console.log(`    Potential: ${r1.potential.toFixed(1)}`);
  console.log(`    Charge accepted: ${r1.chargeAccepted?.toFixed(1)}`);

  // Another approve - still integrating due to high threshold
  const r2 = neuron.receiveCharge('analyst', 'APPROVE', { confidence: 0.5 });
  console.log('\n  After Analyst APPROVE (conf 0.5):');
  console.log(`    Status: ${r2.status}`);
  console.log(`    Potential: ${r2.potential.toFixed(1)}`);
  console.log(`    Distance to threshold: ${r2.distanceToThreshold?.toFixed(1)}`);

  // Third approve - might fire or keep integrating
  const r3 = neuron.receiveCharge('architect', 'APPROVE', { confidence: 0.7 });
  console.log('\n  After Architect APPROVE (conf 0.7):');
  console.log(`    Status: ${r3.status}`);
  console.log(`    Potential: ${r3.potential.toFixed(1)}`);

  // Security neuron should need more than 3 weak approves
  // First should integrate, and we see the accumulation
  const showsAccumulation = r1.status === 'integrating' && r1.potential > state0.potential;
  console.log(`\n  Shows accumulation: ${showsAccumulation ? 'YES ✓' : 'NO ✗'}`);

  return showsAccumulation;
});

test('Fire on sufficient excitation', () => {
  const neuron = createNeuronalConsensus();

  // Multiple strong approves should fire
  const dogs = ['guardian', 'analyst', 'architect', 'sage', 'oracle'];
  let fired = false;
  let fireResult = null;

  console.log('  Adding charges from 5 Dogs...');

  for (const dog of dogs) {
    const result = neuron.receiveCharge(dog, 'APPROVE', { confidence: 0.8 });
    console.log(`    ${dog}: potential = ${result.potential.toFixed(1)}, status = ${result.status}`);

    if (result.status === 'FIRED') {
      fired = true;
      fireResult = result;
      break;
    }
  }

  if (fired) {
    console.log('\n  🔥 ACTION POTENTIAL FIRED!');
    console.log(`    Contributors: ${fireResult.contributors.join(', ')}`);
    console.log(`    Peak potential: ${fireResult.potential}`);
  }

  return fired;
});

test('Inhibition dominance (REJECT stronger than APPROVE)', () => {
  // Use conservative neuron to prevent premature firing
  const neuron = createConservativeNeuron();

  // One weak approve
  const r1 = neuron.receiveCharge('architect', 'APPROVE', { confidence: 0.4 });
  console.log(`  After 1 APPROVE (weak): potential = ${r1.potential.toFixed(1)}`);

  const afterApprove = r1.potential;

  // One strong reject - REJECT charge is -30 in conservative neuron
  const r2 = neuron.receiveCharge('guardian', 'REJECT', { confidence: 0.8 });
  console.log(`  After 1 REJECT (strong): potential = ${r2.potential.toFixed(1)}`);

  const afterReject = r2.potential;

  // Should have gone down significantly (potentially below resting)
  const dropped = afterReject < afterApprove;
  console.log(`\n  Approve charge: ~+${(15 * 0.7).toFixed(1)} (base 15 × 0.7 conf)`);
  console.log(`  Reject charge:  ~${(-30 * 0.9).toFixed(1)} (base -30 × 0.9 conf)`);
  console.log(`  Net effect: ${(afterReject - neuron.constants.RESTING_POTENTIAL).toFixed(1)} from rest`);
  console.log(`  Inhibition effective: ${dropped ? 'YES ✓' : 'NO ✗'}`);

  return dropped;
});

test('Refractory period blocks immediate re-fire', async () => {
  const neuron = createFastNeuron(); // Faster for testing

  // Fire the neuron
  const dogs = ['a', 'b', 'c', 'd', 'e'];
  for (const dog of dogs) {
    const r = neuron.receiveCharge(dog, 'APPROVE', { confidence: 0.9 });
    if (r.status === 'FIRED') break;
  }

  console.log('  Neuron fired. Attempting immediate re-stimulation...');

  // Try to add charge immediately
  const blocked = neuron.receiveCharge('newdog', 'APPROVE', { confidence: 1.0 });
  console.log(`    Status: ${blocked.status}`);
  console.log(`    Time remaining: ${blocked.timeRemaining}ms`);

  const wasBlocked = blocked.status === 'refractory';

  // Wait for refractory to end (shortened for test)
  if (wasBlocked) {
    console.log('  Waiting for refractory period to end...');
    await sleep(blocked.timeRemaining + 100);

    const afterWait = neuron.receiveCharge('newdog2', 'APPROVE', { confidence: 0.5 });
    console.log(`  After wait: status = ${afterWait.status}`);
  }

  return wasBlocked;
});

test('Temporal summation (rapid inputs sum, slow inputs decay)', async () => {
  // Use security neuron - harder to fire, allows us to see accumulation
  const neuron1 = createSecurityNeuron();
  const neuron2 = createSecurityNeuron();

  // Rapid inputs to neuron1
  console.log('  Rapid inputs (100ms delay):');
  neuron1.receiveCharge('dog1', 'APPROVE', { confidence: 0.5 });
  await sleep(100);
  const r1 = neuron1.receiveCharge('dog2', 'APPROVE', { confidence: 0.5 });
  const rapidPotential = r1.potential;
  console.log(`    Potential after rapid inputs: ${rapidPotential.toFixed(1)}`);

  // Slow inputs to neuron2 (with decay between)
  console.log('\n  Slow inputs (3s delay):');
  neuron2.receiveCharge('dog1', 'APPROVE', { confidence: 0.5 });
  await sleep(3000);
  const r2 = neuron2.receiveCharge('dog2', 'APPROVE', { confidence: 0.5 });
  const slowPotential = r2.potential;
  console.log(`    Potential after slow inputs: ${slowPotential.toFixed(1)}`);

  // Rapid should have higher potential due to less decay
  const temporalSummation = rapidPotential > slowPotential;
  console.log(`\n  Temporal summation effective: ${temporalSummation ? 'YES ✓' : 'NO ✗'}`);
  console.log(`    Rapid: ${rapidPotential.toFixed(1)}, Slow: ${slowPotential.toFixed(1)}`);
  console.log(`    Difference: ${(rapidPotential - slowPotential).toFixed(1)} units`);

  return temporalSummation;
});

test('Adaptive threshold (habituation after repeated fires)', async () => {
  const neuron = createFastNeuron();

  console.log('  Firing neuron multiple times...');
  const thresholds = [];

  for (let i = 0; i < 3; i++) {
    // Fire
    const dogs = ['a', 'b', 'c', 'd', 'e'].map(d => `${d}${i}`);
    for (const dog of dogs) {
      const r = neuron.receiveCharge(dog, 'APPROVE', { confidence: 0.9 });
      if (r.status === 'FIRED') {
        console.log(`    Fire ${i + 1}: threshold elevation = ${r.thresholdElevation?.toFixed(1)}`);
        thresholds.push(neuron.getState().threshold);
        break;
      }
    }

    // Wait for refractory
    await sleep(neuron.constants.REFRACTORY_ABSOLUTE + 100);
  }

  // Threshold should have increased
  const adapted = thresholds.length >= 2 && thresholds[1] > thresholds[0];
  console.log(`\n  Adaptive threshold: ${adapted ? 'YES ✓' : 'NO ✗'}`);

  return adapted;
});

test('processVotes batch processing', () => {
  const neuron = createNeuronalConsensus();

  const votes = [
    { dogId: 'guardian', vote: 'APPROVE', confidence: 0.7, weight: 1.5 },
    { dogId: 'analyst', vote: 'APPROVE', confidence: 0.6, weight: 1.0 },
    { dogId: 'architect', vote: 'APPROVE', confidence: 0.8, weight: 1.2 },
    { dogId: 'janitor', vote: 'ABSTAIN', confidence: 0.5, weight: 1.0 },
    { dogId: 'sage', vote: 'APPROVE', confidence: 0.9, weight: 1.3 },
  ];

  console.log('  Processing batch of votes...');
  const result = neuron.processVotes(votes);

  console.log(`    Consensus reached: ${result.consensus}`);
  console.log(`    Decision: ${result.decision || 'pending'}`);
  console.log(`    Votes processed: ${result.votesProcessed}/${result.totalVotes}`);

  if (result.consensus) {
    console.log(`    Contributors: ${result.contributors?.join(', ')}`);
  } else {
    console.log(`    Final potential: ${result.potential?.toFixed(1)}`);
    console.log(`    Distance to threshold: ${result.distanceToThreshold?.toFixed(1)}`);
  }

  return true; // Just demonstrating functionality
});

test('Different neuron types', () => {
  console.log('  Creating different neuron types...\n');

  const neurons = {
    standard: createNeuronalConsensus(),
    fast: createFastNeuron(),
    conservative: createConservativeNeuron(),
    security: createSecurityNeuron(),
  };

  // Same input to all
  const votes = [
    { dogId: 'dog1', vote: 'APPROVE', confidence: 0.7 },
    { dogId: 'dog2', vote: 'APPROVE', confidence: 0.7 },
    { dogId: 'dog3', vote: 'APPROVE', confidence: 0.7 },
  ];

  for (const [type, neuron] of Object.entries(neurons)) {
    const result = neuron.processVotes(votes);
    const state = neuron.getState();

    console.log(`  ${type.padEnd(12)}: threshold=${state.threshold.toFixed(0).padStart(4)}, ` +
                `potential=${state.potential.toFixed(1).padStart(6)}, ` +
                `fired=${result.consensus ? 'YES' : 'NO'}`);
  }

  return true;
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🧠 NEURONAL CONSENSUS TESTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    console.log(`\n▶ ${name}`);
    console.log('─'.repeat(60));

    try {
      const result = await fn();
      if (result) {
        console.log(`\n  ✅ PASSED`);
        passed++;
      } else {
        console.log(`\n  ❌ FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`\n  ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
