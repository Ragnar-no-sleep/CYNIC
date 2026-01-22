#!/usr/bin/env node

/**
 * Phase 34 Integration Test - Philosophy of Religion
 *
 * Tests:
 * - 34A: Theism Engine (ontological, cosmological, teleological arguments)
 * - 34B: Problem of Evil Engine (theodicy, defenses)
 * - 34C: Faith & Reason Engine (evidentialism, fideism, reformed epistemology)
 */

const theismEngine = require('./lib/theism-engine.cjs');
const evilEngine = require('./lib/evil-engine.cjs');
const faithReasonEngine = require('./lib/faith-reason-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 34: PHILOSOPHY OF RELIGION');
console.log('  *sniff* Testing theism, evil, faith & reason...');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const theismInit = theismEngine.init();
console.log('Theism Engine: ' + theismInit.status);

const evilInit = evilEngine.init();
console.log('Evil Engine: ' + evilInit.status);

const faithInit = faithReasonEngine.init();
console.log('Faith & Reason Engine: ' + faithInit.status);

// ═══════════════════════════════════════════════════════════════════
// 34A: THEISM ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  34A: THEISM ENGINE (Arguments for God)');
console.log('═══════════════════════════════════════════════════════════\n');

// List ontological arguments
console.log('── Ontological Arguments ──────────────────────────────────\n');

const ontologicalArgs = theismEngine.listArguments('ontological');
ontologicalArgs.forEach(arg => {
  console.log(arg.name + ' (' + arg.philosopher + ')');
  console.log('  Key move: ' + arg.keyMove);
  console.log('  Strength: ' + (arg.strength * 100).toFixed(1) + '%');
});

// Examine Kalam
console.log('\n── Kalam Cosmological Argument ────────────────────────────\n');

const kalam = theismEngine.getArgument('cosmological-kalam');
console.log(kalam.name);
console.log('Premises:');
kalam.premises.forEach((p, i) => console.log('  ' + (i+1) + '. ' + p));
console.log('Key move: ' + kalam.keyMove);
console.log('Main objection: ' + kalam.objections[0].name);

// Evaluate fine-tuning
console.log('\n── Fine-Tuning Argument Evaluation ────────────────────────\n');

const ftEval = theismEngine.evaluateArgument('teleological-finetuning', {
  premisesAccepted: [0, 1, 2], // Accept first 3 premises
  premisesRejected: [3], // Reject "not due to chance"
  objectionsMet: ['Unknown Necessity']
});

console.log('Argument: ' + ftEval.argumentName);
console.log('Premises accepted: ' + ftEval.evaluation.premisesAccepted + '/' + ftEval.evaluation.totalPremises);
console.log('Objections addressed: ' + ftEval.evaluation.objectionsMet + '/' + ftEval.evaluation.totalObjections);
console.log('Verdict: ' + ftEval.verdict);
console.log('Confidence: ' + (ftEval.confidence * 100).toFixed(1) + '%');

// Theism-atheism debate
console.log('\n── Theism-Atheism Debate ──────────────────────────────────\n');

const debate = theismEngine.analyzeDebate();
console.log('Theism strength: ' + (debate.positions.theism.strength * 100).toFixed(1) + '%');
console.log('Atheism strength: ' + (debate.positions.atheism.strength * 100).toFixed(1) + '%');
console.log('Agnosticism strength: ' + (debate.positions.agnosticism.strength * 100).toFixed(1) + '%');
console.log('CYNIC: ' + debate.cynicObservation);

// ═══════════════════════════════════════════════════════════════════
// 34B: PROBLEM OF EVIL ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  34B: PROBLEM OF EVIL ENGINE (Theodicy)');
console.log('═══════════════════════════════════════════════════════════\n');

// List problems
console.log('── Problems of Evil ───────────────────────────────────────\n');

const problems = evilEngine.listProblems();
problems.forEach(p => {
  console.log(p.name + ' (' + p.type + ')');
  console.log('  Status: ' + p.status);
  console.log('  Strength: ' + (p.strength * 100).toFixed(1) + '%');
});

// Examine evidential problem
console.log('\n── Evidential Problem (Rowe) ──────────────────────────────\n');

const evidential = evilEngine.getProblem('evidential');
console.log('Philosopher: ' + evidential.philosopher + ' (' + evidential.year + ')');
console.log('Key example: ' + evidential.argument.keyExample);
console.log('Question: ' + evidential.argument.question);
console.log('Responses: ' + evidential.responses.join(', '));

// Compare theodicies
console.log('\n── Theodicy Comparison ────────────────────────────────────\n');

const theodicyComparison = evilEngine.compareTheodicies();
console.log('Ranking:');
theodicyComparison.ranking.forEach((name, i) => {
  console.log('  ' + (i+1) + '. ' + name);
});
console.log('Recommendation: ' + theodicyComparison.recommendation);

// Analyze natural evil
console.log('\n── Natural Evil Analysis ──────────────────────────────────\n');

const naturalEvil = evilEngine.analyzeEvil({
  type: 'natural',
  intensity: 'severe',
  gratuitous: true
});

console.log('Type: ' + naturalEvil.evilType);
console.log('Challenge strength: ' + (naturalEvil.challengeStrength * 100).toFixed(1) + '%');
console.log('Best response: ' + naturalEvil.bestResponse.response);
console.log('Assessment: ' + naturalEvil.overallAssessment);

// ═══════════════════════════════════════════════════════════════════
// 34C: FAITH & REASON ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  34C: FAITH & REASON ENGINE');
console.log('═══════════════════════════════════════════════════════════\n');

// List positions
console.log('── Epistemological Positions ──────────────────────────────\n');

const positions = faithReasonEngine.listPositions();
positions.forEach(p => {
  console.log(p.name);
  console.log('  ' + p.claim);
  console.log('  Strength: ' + (p.strength * 100).toFixed(1) + '%');
});

// Reformed epistemology
console.log('\n── Reformed Epistemology (Plantinga) ──────────────────────\n');

const reformed = faithReasonEngine.getPosition('reformed-epistemology');
console.log('Claim: ' + reformed.claim);
console.log('Key argument: ' + reformed.keyArgument.name);
console.log('  ' + reformed.keyArgument.claim);
console.log('Main objection: ' + reformed.objections[0]);

// Pascal's Wager
console.log('\n── Pascal\'s Wager Analysis ────────────────────────────────\n');

const wager = faithReasonEngine.analyzePascalsWager();
console.log('Argument structure:');
console.log('  ' + wager.structure.premise1);
console.log('  ' + wager.structure.conclusion);
console.log('Key objection: ' + wager.objections.manyGods.name);
console.log('  ' + wager.objections.manyGods.claim);
console.log('CYNIC: ' + wager.cynicVerdict);

// Faith-reason debate
console.log('\n── Faith-Reason Debate ────────────────────────────────────\n');

const frDebate = faithReasonEngine.analyzeDebate();
console.log('Central question: ' + frDebate.centralQuestion);
console.log('Main positions:');
frDebate.mainPositions.forEach(p => {
  console.log('  - ' + p.name + ': ' + p.answer);
});
console.log('CYNIC: ' + frDebate.cynicObservation);

// Compare models
console.log('\n── Faith-Reason Models ────────────────────────────────────\n');

const models = faithReasonEngine.compareModels();
console.log('Conflict model: ' + models.conflictModel.assessment);
console.log('Compatibility model: ' + models.compatibilityModel.assessment);
console.log('Independence model: ' + models.independenceModel.assessment);
console.log('Recommendation: ' + models.cynicRecommendation);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(theismEngine.formatStatus());
console.log('\n');
console.log(evilEngine.formatStatus());
console.log('\n');
console.log(faithReasonEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 34 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const theismStats = theismEngine.getStats();
const evilStats = evilEngine.getStats();
const faithStats = faithReasonEngine.getStats();

console.log('34A Theism Engine:');
console.log('  Arguments: ' + theismStats.arguments);
console.log('  Evaluations: ' + theismStats.evaluations);
console.log('  Debates: ' + theismStats.debates);

console.log('\n34B Problem of Evil Engine:');
console.log('  Problems: ' + evilStats.problems);
console.log('  Theodicies: ' + evilStats.theodicies);
console.log('  Defenses: ' + evilStats.defenses);
console.log('  Analyses: ' + evilStats.analyses);

console.log('\n34C Faith & Reason Engine:');
console.log('  Positions: ' + faithStats.positions);
console.log('  Analyses: ' + faithStats.analyses);
console.log('  Debates: ' + faithStats.debates);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  *tail wag* PHASE 34 COMPLETE');
console.log('  Philosophy of Religion operational.');
console.log('  φ-bounded confidence: max 61.8%');
console.log('═══════════════════════════════════════════════════════════\n');
