#!/usr/bin/env node

/**
 * Phase 33 Integration Test - Metaphysics II
 *
 * Tests:
 * - 33A: Identity Engine (Leibniz, Ship of Theseus)
 * - 33B: Causation Engine (Hume, counterfactual)
 * - 33C: Time Engine (A-theory, B-theory, McTaggart)
 */

const identityEngine = require('./lib/identity-engine.cjs');
const causationEngine = require('./lib/causation-metaphysics-engine.cjs');
const timeEngine = require('./lib/time-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 33: METAPHYSICS II');
console.log('  *tail wag* Testing identity, causation, time...');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const identityInit = identityEngine.init();
console.log('Identity Engine: ' + identityInit.status);

const causationInit = causationEngine.init();
console.log('Causation Engine: ' + causationInit.status);

const timeInit = timeEngine.init();
console.log('Time Engine: ' + timeInit.status);

// ═══════════════════════════════════════════════════════════════════
// 33A: IDENTITY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  33A: IDENTITY ENGINE (Leibniz, Ship of Theseus)');
console.log('═══════════════════════════════════════════════════════════\n');

// Register entities
console.log('── Registering Entities ───────────────────────────────────\n');

const ship1 = identityEngine.registerEntity('ship-original', {
  name: 'Ship of Theseus (Original)',
  type: 'artifact',
  properties: ['wooden', 'seaworthy', '100-planks', 'athenian'],
  matter: 'original-planks'
});

console.log('Registered: ' + ship1.name);
console.log('  Properties: ' + ship1.properties.join(', '));

// Record changes
identityEngine.recordChange('ship-original', {
  type: 'gradual-replacement',
  description: 'Replaced all planks over time',
  removed: ['original-material'],
  added: ['new-material'],
  matterChanged: true,
  percentChanged: 100
});

// Apply Leibniz's Law
console.log('\n── Leibniz\'s Law ──────────────────────────────────────────\n');

const ship2 = identityEngine.registerEntity('ship-repaired', {
  name: 'Repaired Ship',
  properties: ['wooden', 'seaworthy', '100-planks', 'athenian', 'new-material']
});

const leibnizResult = identityEngine.applyLeibnizLaw('ship-original', 'ship-repaired');
console.log('Comparing: ' + leibnizResult.entities.join(' vs '));
console.log('  Qualitatively identical: ' + leibnizResult.qualitativelyIdentical);
console.log('  Numerically identical: ' + leibnizResult.numericallyIdentical);

// Ship of Theseus analysis
console.log('\n── Ship of Theseus Analysis ───────────────────────────────\n');

const shipAnalysis = identityEngine.analyzeShipOfTheseus({
  originalPlanks: 100,
  planksReplaced: 100,
  percentReplaced: 100,
  reassembled: true
});

console.log('Scenario: ' + shipAnalysis.scenario);
console.log('  Question: ' + shipAnalysis.question);
console.log('  Continuity view: ' + shipAnalysis.positions.spatiotemporalContinuity.answer);
console.log('  Material view: ' + shipAnalysis.positions.materialContinuity.answer);
console.log('  CYNIC: ' + shipAnalysis.cynicVerdict);

// Personal identity
console.log('\n── Personal Identity Analysis ─────────────────────────────\n');

const personalId = identityEngine.analyzePersonalIdentity({
  description: 'Teleportation case',
  memoryConnection: true,
  personalityContinuity: true,
  sameBrain: false,
  sameBody: false,
  coherentNarrative: true
});

console.log('Scenario: ' + personalId.scenario);
console.log('  Psychological: ' + personalId.psychological.verdict);
console.log('  Biological: ' + personalId.biological.verdict);
console.log('  Conflict: ' + (personalId.conflict || 'None'));

// ═══════════════════════════════════════════════════════════════════
// 33B: CAUSATION ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  33B: CAUSATION ENGINE (Hume, Counterfactual)');
console.log('═══════════════════════════════════════════════════════════\n');

// Register causal claim
console.log('── Registering Causal Claim ───────────────────────────────\n');

const claim = causationEngine.registerCausalClaim('fire-heat', {
  cause: 'Fire',
  effect: 'Heat',
  description: 'Fire causes heat',
  constantConjunction: true,
  temporalPriority: true,
  contiguity: true,
  counterfactual: true
});

console.log('Registered: ' + claim.cause + ' → ' + claim.effect);

// Humean analysis
console.log('\n── Humean Analysis ────────────────────────────────────────\n');

const humeanResult = causationEngine.analyzeHumean('fire-heat');
console.log('Theory: ' + humeanResult.theory);
console.log('  Temporal priority: ' + humeanResult.conditions.temporalPriority.satisfied);
console.log('  Contiguity: ' + humeanResult.conditions.contiguity.satisfied);
console.log('  Constant conjunction: ' + humeanResult.conditions.constantConjunction.satisfied);
console.log('  Verdict: ' + humeanResult.humeanVerdict);

// Counterfactual analysis
console.log('\n── Counterfactual Analysis (Lewis) ────────────────────────\n');

const cfResult = causationEngine.analyzeCounterfactual('fire-heat', {
  counterfactualHolds: true,
  backupCause: false
});

console.log('Theory: ' + cfResult.theory);
console.log('  Counterfactual: If no fire, would there be heat? NO');
console.log('  Verdict: ' + cfResult.lewisVerdict);

// Compare theories
console.log('\n── Theory Comparison ──────────────────────────────────────\n');

const comparison = causationEngine.compareTheories();
console.log('Theories:');
console.log('  Humean: ' + comparison.humean.core);
console.log('  Counterfactual: ' + comparison.counterfactual.core);
console.log('  Powers: ' + comparison.powers.core);
console.log('  CYNIC: ' + comparison.cynicSynthesis.recommendation);

// ═══════════════════════════════════════════════════════════════════
// 33C: TIME ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  33C: TIME ENGINE (A-theory, B-theory, McTaggart)');
console.log('═══════════════════════════════════════════════════════════\n');

// McTaggart evaluation
console.log('── McTaggart\'s Argument ───────────────────────────────────\n');

const mctaggart = timeEngine.evaluateMcTaggart('bTheorist');
console.log('Argument: ' + mctaggart.argument);
console.log('  Key move: ' + mctaggart.keyMove.claim);
console.log('  Conclusion: ' + mctaggart.mctaggartConclusion);
console.log('  Most philosophers: ' + mctaggart.mostAccept);

// A vs B theory comparison
console.log('\n── A-Theory vs B-Theory ───────────────────────────────────\n');

const abComparison = timeEngine.compareAAndB();
console.log('Debate: ' + abComparison.debate);
console.log('\nA-Theory:');
console.log('  Core: ' + abComparison.aTheory.core);
console.log('  Variants: ' + abComparison.aTheory.variants.join(', '));

console.log('\nB-Theory:');
console.log('  Core: ' + abComparison.bTheory.core);
console.log('  Variant: ' + abComparison.bTheory.variant);

console.log('\nKey disagreement: Is temporal passage real?');
console.log('  A-Theory: ' + abComparison.keyDisagreements[0].aTheory);
console.log('  B-Theory: ' + abComparison.keyDisagreements[0].bTheory);

// Analyze passage
console.log('\n── Temporal Passage Analysis ──────────────────────────────\n');

const passageAnalysis = timeEngine.analyzePassage({
  experiencePassage: true
});

console.log('Question: ' + passageAnalysis.question);
console.log('  For passage: We experience time flowing');
console.log('  Against: Rate problem, Relativity, Block universe');
console.log('  CYNIC confidence: ' + (passageAnalysis.confidence * 100).toFixed(1) + '%');

// Time summary
console.log('\n── Time Summary ───────────────────────────────────────────\n');

const timeSummary = timeEngine.getTimeSummary();
console.log('Central questions:');
timeSummary.centralQuestions.slice(0, 2).forEach(q => {
  console.log('  - ' + q);
});
console.log('CYNIC advice: ' + timeSummary.cynicAdvice.observation);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(identityEngine.formatStatus());
console.log('\n');
console.log(causationEngine.formatStatus());
console.log('\n');
console.log(timeEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 33 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const identityStats = identityEngine.getStats();
const causationStats = causationEngine.getStats();
const timeStats = timeEngine.getStats();

console.log('33A Identity Engine:');
console.log('  Entities: ' + identityStats.entities);
console.log('  Identity claims: ' + identityStats.identityClaims);
console.log('  Puzzle analyses: ' + identityStats.puzzleAnalyses);

console.log('\n33B Causation Engine:');
console.log('  Causal claims: ' + causationStats.claims);
console.log('  Analyses: ' + causationStats.analyses);

console.log('\n33C Time Engine:');
console.log('  Temporal claims: ' + timeStats.temporalClaims);
console.log('  Analyses: ' + timeStats.analyses);
console.log('  Theory comparisons: ' + timeStats.theoryComparisons);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  *tail wag* PHASE 33 COMPLETE');
console.log('  Metaphysics II operational.');
console.log('  φ-bounded confidence: max 61.8%');
console.log('═══════════════════════════════════════════════════════════\n');
