#!/usr/bin/env node

/**
 * Phase 39 Integration Test - Formal Philosophy
 *
 * Tests:
 * - 39A: Modal Logic Engine (necessity, possibility)
 * - 39B: Decision Theory Engine (utility, rationality)
 * - 39C: Game Theory Engine (Nash, cooperation)
 */

const modalLogicEngine = require('./lib/modal-logic-engine.cjs');
const decisionTheoryEngine = require('./lib/decision-theory-engine.cjs');
const gameTheoryEngine = require('./lib/game-theory-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 39: FORMAL PHILOSOPHY');
console.log('  *ears perk* Logic, decision, and strategy...');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const modalInit = modalLogicEngine.init();
console.log('Modal Logic Engine: ' + modalInit.status);

const decisionInit = decisionTheoryEngine.init();
console.log('Decision Theory Engine: ' + decisionInit.status);

const gameInit = gameTheoryEngine.init();
console.log('Game Theory Engine: ' + gameInit.status);

// ═══════════════════════════════════════════════════════════════════
// 39A: MODAL LOGIC ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  39A: MODAL LOGIC ENGINE (Necessity, Possibility)');
console.log('═══════════════════════════════════════════════════════════\n');

// Operators
console.log('── Modal Operators ────────────────────────────────────────\n');

const necessity = modalLogicEngine.getOperator('necessity');
console.log(necessity.symbol + ' (Necessity): ' + necessity.reading);
console.log('  Alethic: ' + necessity.alethic);
console.log('  Dual: ' + necessity.dual);

const possibility = modalLogicEngine.getOperator('possibility');
console.log('\n' + possibility.symbol + ' (Possibility): ' + possibility.reading);
console.log('  Alethic: ' + possibility.alethic);

// Systems
console.log('\n── Modal Systems ──────────────────────────────────────────\n');

const systemK = modalLogicEngine.getSystem('K');
console.log('System K: ' + systemK.description);
console.log('  Axiom: ' + systemK.axiom);

const systemS5 = modalLogicEngine.getSystem('S5');
console.log('\nSystem S5: ' + systemS5.description);
console.log('  Accessibility: ' + systemS5.accessibility);
console.log('  Significance: ' + systemS5.significance);

// Semantics
console.log('\n── Possible Worlds Semantics ──────────────────────────────\n');

const kripke = modalLogicEngine.getSemantics('kripke');
console.log('Kripke Semantics:');
console.log('  W: ' + kripke.components.W);
console.log('  R: ' + kripke.components.R);
console.log('  □p: ' + kripke.truthConditions.necessity);

const rigid = modalLogicEngine.getSemantics('rigid-designation');
console.log('\nRigid Designation: ' + rigid.definition);

// Philosophers
console.log('\n── Modal Logicians ────────────────────────────────────────\n');

const kripkePhil = modalLogicEngine.getPhilosopher('kripke');
console.log(kripkePhil.name + ' (' + kripkePhil.dates + ')');
kripkePhil.contributions.slice(0, 2).forEach(c => console.log('  - ' + c));

// Analysis
console.log('\n── Modal Claim Analysis ───────────────────────────────────\n');

const modalAnalysis = modalLogicEngine.analyzeModalClaim('Water is necessarily H2O');
console.log('Claim: ' + modalAnalysis.claim);
console.log('Type question: ' + modalAnalysis.questions.type);
console.log('System choice for metaphysics: ' + modalAnalysis.systemChoice.S5);
console.log('CYNIC: ' + modalAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 39B: DECISION THEORY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  39B: DECISION THEORY ENGINE (Utility, Rationality)');
console.log('═══════════════════════════════════════════════════════════\n');

// Principles
console.log('── Decision Principles ────────────────────────────────────\n');

const expectedUtility = decisionTheoryEngine.getPrinciple('expected-utility');
console.log('Expected Utility Maximization:');
console.log('  Formula: ' + expectedUtility.formula);
console.log('  Status: ' + expectedUtility.status);

const bayesian = decisionTheoryEngine.getPrinciple('bayesian-updating');
console.log('\nBayesian Updating:');
console.log('  Formula: ' + bayesian.formula);

// Paradoxes
console.log('\n── Decision Paradoxes ─────────────────────────────────────\n');

const allais = decisionTheoryEngine.getParadox('allais');
console.log('Allais Paradox (' + allais.year + '):');
console.log('  Problem: ' + allais.problem);
console.log('  Explanation: ' + allais.explanation);

const newcomb = decisionTheoryEngine.getParadox('newcomb');
console.log('\nNewcomb\'s Problem:');
console.log('  One-box: ' + newcomb.positions.onebox);
console.log('  Two-box: ' + newcomb.positions.twobox);
console.log('  Unresolved: ' + newcomb.unresolved);

// Frameworks
console.log('\n── Decision Frameworks ────────────────────────────────────\n');

const boundedRat = decisionTheoryEngine.getFramework('bounded-rationality');
console.log('Bounded Rationality (' + boundedRat.author + '):');
console.log('  Thesis: ' + boundedRat.thesis);
console.log('  Satisficing: ' + boundedRat.concepts.satisficing);

const prospect = decisionTheoryEngine.getFramework('prospect-theory');
console.log('\nProspect Theory (' + prospect.authors + '):');
console.log('  Loss aversion: ' + prospect.features.lossAversion);

// Analysis
console.log('\n── Decision Analysis ──────────────────────────────────────\n');

const decisionAnalysis = decisionTheoryEngine.analyzeDecision('Choosing between job offers');
console.log('Framework: ' + decisionAnalysis.framework.expectedUtility);
console.log('Bias check: ' + decisionAnalysis.biases.statusQuoBias);
console.log('CYNIC: ' + decisionAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 39C: GAME THEORY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  39C: GAME THEORY ENGINE (Nash, Cooperation)');
console.log('═══════════════════════════════════════════════════════════\n');

// Concepts
console.log('── Game Theory Concepts ───────────────────────────────────\n');

const nash = gameTheoryEngine.getConcept('nash-equilibrium');
console.log('Nash Equilibrium:');
console.log('  Definition: ' + nash.definition);
console.log('  Intuition: ' + nash.intuition);

const pareto = gameTheoryEngine.getConcept('pareto-efficiency');
console.log('\nPareto Efficiency: ' + pareto.definition);
console.log('  Problem: ' + pareto.problem);

// Classic Games
console.log('\n── Classic Games ──────────────────────────────────────────\n');

const pd = gameTheoryEngine.getGame('prisoners-dilemma');
console.log('Prisoner\'s Dilemma:');
console.log('  Nash: ' + pd.nashEquilibrium);
console.log('  Pareto: ' + pd.paretoOptimal);
console.log('  Paradox: ' + pd.paradox);

const stagHunt = gameTheoryEngine.getGame('stag-hunt');
console.log('\nStag Hunt:');
console.log('  Nash equilibria: ' + stagHunt.nashEquilibria.join(', '));
console.log('  Theme: ' + stagHunt.theme);

const chicken = gameTheoryEngine.getGame('chicken');
console.log('\nChicken (Hawk-Dove):');
console.log('  Nash equilibria: ' + chicken.nashEquilibria.join(', '));

// Strategies
console.log('\n── Strategies ─────────────────────────────────────────────\n');

const titForTat = gameTheoryEngine.getStrategy('tit-for-tat');
console.log('Tit for Tat (' + titForTat.author + '):');
console.log('  Rule: ' + titForTat.rule);
console.log('  Properties: ' + Object.keys(titForTat.properties).join(', '));
console.log('  Axelrod: ' + titForTat.axelrod);

// Thinkers
console.log('\n── Game Theorists ─────────────────────────────────────────\n');

const nashThinker = gameTheoryEngine.getThinker('nash');
console.log(nashThinker.name + ' (Nobel ' + nashThinker.nobelPrize + ')');
nashThinker.contributions.forEach(c => console.log('  - ' + c));

// Analysis
console.log('\n── Strategic Analysis ─────────────────────────────────────\n');

const strategicAnalysis = gameTheoryEngine.analyzeStrategicSituation('Price competition between firms');
console.log('Questions: ' + strategicAnalysis.questions.payoffs);
console.log('Game type check: ' + strategicAnalysis.gameType.prisonersDilemma);
console.log('CYNIC: ' + strategicAnalysis.cynicNote);

// Cooperation analysis
console.log('\n── Cooperation Analysis ───────────────────────────────────\n');

const coopAnalysis = gameTheoryEngine.analyzeCooperation('Open source collaboration');
console.log('Repeated interaction: ' + coopAnalysis.conditions.repeated);
console.log('Mechanism - reciprocity: ' + coopAnalysis.mechanisms.reciprocity);
console.log('CYNIC: ' + coopAnalysis.cynicObservation);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(modalLogicEngine.formatStatus());
console.log('\n');
console.log(decisionTheoryEngine.formatStatus());
console.log('\n');
console.log(gameTheoryEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 39 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const modalStats = modalLogicEngine.getStats();
const decisionStats = decisionTheoryEngine.getStats();
const gameStats = gameTheoryEngine.getStats();

console.log('39A Modal Logic Engine:');
console.log('  Operators: ' + modalStats.operators);
console.log('  Systems: ' + modalStats.systems);
console.log('  Semantics: ' + modalStats.semantics);
console.log('  Philosophers: ' + modalStats.philosophers);

console.log('\n39B Decision Theory Engine:');
console.log('  Principles: ' + decisionStats.principles);
console.log('  Paradoxes: ' + decisionStats.paradoxes);
console.log('  Frameworks: ' + decisionStats.frameworks);
console.log('  Thinkers: ' + decisionStats.thinkers);

console.log('\n39C Game Theory Engine:');
console.log('  Concepts: ' + gameStats.concepts);
console.log('  Games: ' + gameStats.games);
console.log('  Strategies: ' + gameStats.strategies);
console.log('  Thinkers: ' + gameStats.thinkers);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  *tail wag* PHASE 39 COMPLETE');
console.log('  Formal Philosophy operational.');
console.log('  Modal logic, decision theory, game theory unified.');
console.log('  φ-bounded confidence: max 61.8%');
console.log('═══════════════════════════════════════════════════════════\n');
