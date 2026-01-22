#!/usr/bin/env node

/**
 * Phase 44 Integration Test - Philosophy of Law & Economics
 *
 * Tests:
 * - 44A: Philosophy of Law Engine (jurisprudence, positivism, natural law)
 * - 44B: Philosophy of Economics Engine (value, markets, justice)
 * - 44C: Law-Economics Integration Engine (Coase, efficiency, regulation)
 *
 * φ-bounded: max 61.8% confidence
 */

const lawEngine = require('./lib/philosophy-of-law-engine.cjs');
const econEngine = require('./lib/philosophy-of-economics-engine.cjs');
const lawEconEngine = require('./lib/law-economics-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 44: PHILOSOPHY OF LAW & ECONOMICS');
console.log('  *sniff* Where rules meet incentives...');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const lawInit = lawEngine.init();
console.log('Philosophy of Law Engine: ' + lawInit.status);

const econInit = econEngine.init();
console.log('Philosophy of Economics Engine: ' + econInit.status);

const lawEconInit = lawEconEngine.init();
console.log('Law-Economics Integration Engine: ' + lawEconInit.status);

// ═══════════════════════════════════════════════════════════════════
// 44A: PHILOSOPHY OF LAW ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  44A: PHILOSOPHY OF LAW');
console.log('═══════════════════════════════════════════════════════════\n');

// Theories
console.log('── Legal Theories ─────────────────────────────────────────\n');

const theories = lawEngine.listTheories();
theories.forEach(t => {
  console.log(t.name + ':');
  console.log('  ' + t.thesis);
});

// Natural Law
console.log('\n── Natural Law Theory ─────────────────────────────────────\n');

const naturalLaw = lawEngine.getTheory('natural-law');
console.log('Thesis: ' + naturalLaw.thesis);
console.log('Slogan: ' + naturalLaw.slogan);
console.log('Aquinas: ' + naturalLaw.aquinas.naturalLaw);

// Legal Positivism
console.log('\n── Legal Positivism ───────────────────────────────────────\n');

const positivism = lawEngine.getTheory('legal-positivism');
console.log('Thesis: ' + positivism.thesis);
console.log('Slogan: ' + positivism.slogan);
console.log('Separation Thesis: ' + positivism.separationThesis);

// Key Thinkers
console.log('\n── Key Legal Philosophers ─────────────────────────────────\n');

const hart = lawEngine.getThinker('hart');
console.log(hart.name + ' (' + hart.dates + '):');
console.log('  Work: ' + hart.work);
console.log('  Rule of Recognition: ' + hart.contribution.ruleOfRecognition);

const dworkin = lawEngine.getThinker('dworkin');
console.log('\n' + dworkin.name + ' (' + dworkin.dates + '):');
console.log('  Principles: ' + dworkin.contribution.principles);
console.log('  Integrity: ' + dworkin.contribution.integrity);

// Concepts
console.log('\n── Key Concepts ───────────────────────────────────────────\n');

const validity = lawEngine.getConcept('validity');
console.log(validity.name + ':');
Object.entries(validity.positions).slice(0, 3).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});

const ruleOfLaw = lawEngine.getConcept('rule-of-law');
console.log('\n' + ruleOfLaw.name + ':');
console.log('  Definition: ' + ruleOfLaw.definition);
console.log('  Values:');
ruleOfLaw.values.slice(0, 4).forEach(c => console.log('    - ' + c));

// Debates
console.log('\n── Key Debates ────────────────────────────────────────────\n');

const hartDworkin = lawEngine.getDebate('hart-dworkin');
console.log(hartDworkin.name + ':');
console.log('  Question: ' + hartDworkin.question);
console.log('  Hart: ' + hartDworkin.hart.rules);
console.log('  Dworkin: ' + hartDworkin.dworkin.principles);

// Legal Analysis
console.log('\n── Legal Philosophy Analysis ──────────────────────────────\n');

const legalAnalysis = lawEngine.analyzeLegal('civil disobedience');
console.log('Question: ' + legalAnalysis.question);
console.log('Perspectives:');
Object.entries(legalAnalysis.perspectives).slice(0, 3).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + legalAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 44B: PHILOSOPHY OF ECONOMICS ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  44B: PHILOSOPHY OF ECONOMICS');
console.log('═══════════════════════════════════════════════════════════\n');

// Theories
console.log('── Economic Theories ──────────────────────────────────────\n');

const econTheories = econEngine.listTheories();
econTheories.forEach(t => {
  console.log(t.name + ' (' + t.period + '):');
  console.log('  ' + t.thesis);
});

// Classical Economics
console.log('\n── Classical Economics ────────────────────────────────────\n');

const classical = econEngine.getTheory('classical');
console.log('Founders: ' + classical.founders.join(', '));
console.log('Key Ideas:');
Object.entries(classical.keyIdeas).slice(0, 3).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('Smith: ' + classical.smithQuote);

// Austrian Economics
console.log('\n── Austrian Economics ─────────────────────────────────────\n');

const austrian = econEngine.getTheory('austrian');
console.log('Founders: ' + austrian.founders.join(', '));
console.log('Key Ideas:');
Object.entries(austrian.keyIdeas).slice(0, 3).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('Hayek: ' + austrian.hayekQuote);

// Key Thinkers
console.log('\n── Key Economic Philosophers ──────────────────────────────\n');

const smith = econEngine.getThinker('smith');
console.log(smith.name + ' (' + smith.dates + '):');
console.log('  Invisible Hand: ' + smith.keyIdeas.invisibleHand);
console.log('  Often Misread: ' + smith.oftenMisread);

const sen = econEngine.getThinker('sen');
console.log('\n' + sen.name + ' (' + sen.dates + '):');
console.log('  Capabilities: ' + sen.keyIdeas.capabilities);
console.log('  Sen\'s insight: ' + sen.pluralism);

// Concepts
console.log('\n── Key Concepts ───────────────────────────────────────────\n');

const value = econEngine.getConcept('value');
console.log(value.name + ':');
Object.entries(value.theories).slice(0, 3).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('  Paradox: ' + value.paradox);

const rationality = econEngine.getConcept('rationality');
console.log('\n' + rationality.name + ':');
console.log('  Models:');
Object.entries(rationality.models).slice(0, 3).forEach(([k, v]) => {
  console.log('    ' + k + ': ' + v);
});

// Debates
console.log('\n── Key Debates ────────────────────────────────────────────\n');

const calculation = econEngine.getDebate('socialism-calculation');
console.log(calculation.name + ':');
console.log('  Question: ' + calculation.question);
console.log('  Mises: ' + calculation.positions.mises);
console.log('  Hayek: ' + calculation.positions.hayek);
console.log('  Resolution: ' + calculation.resolution);

// Economic Analysis
console.log('\n── Economic Philosophy Analysis ───────────────────────────\n');

const econAnalysis = econEngine.analyzeEconomic('inequality');
console.log('Topic: ' + econAnalysis.topic);
console.log('Perspectives:');
Object.entries(econAnalysis.perspectives).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + econAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 44C: LAW-ECONOMICS INTEGRATION ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  44C: LAW-ECONOMICS INTEGRATION');
console.log('═══════════════════════════════════════════════════════════\n');

// Movements
console.log('── Law & Economics Movements ──────────────────────────────\n');

const movements = lawEconEngine.listMovements();
movements.forEach(m => {
  console.log(m.name + ' (' + m.period + '):');
  console.log('  ' + m.thesis);
});

// Chicago School
console.log('\n── Chicago School ─────────────────────────────────────────\n');

const chicago = lawEconEngine.getMovement('chicago-school');
console.log('Founders: ' + chicago.founders.join(', '));
console.log('Methodology:');
Object.entries(chicago.methodology).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});

// Key Thinkers
console.log('\n── Key Law & Economics Thinkers ───────────────────────────\n');

const coase = lawEconEngine.getThinker('coase');
console.log(coase.name + ' (' + coase.dates + '):');
console.log('  Contributions:');
Object.entries(coase.contributions).slice(0, 2).forEach(([k, v]) => {
  console.log('    ' + k + ': ' + v);
});
console.log('  Influence: ' + coase.influence);

const posner = lawEconEngine.getThinker('posner');
console.log('\n' + posner.name + ' (' + posner.dates + '):');
console.log('  Wealth Max: ' + posner.contributions.wealthMax);
console.log('  Controversial: ' + posner.controversial);

// Concepts
console.log('\n── Key Concepts ───────────────────────────────────────────\n');

const coaseTheorem = lawEconEngine.getConcept('coase-theorem');
console.log(coaseTheorem.name + ':');
console.log('  Statement: ' + coaseTheorem.statement);
console.log('  Versions:');
console.log('    Strong: ' + coaseTheorem.versions.strong);
console.log('    Weak: ' + coaseTheorem.versions.weak);

const propLiab = lawEconEngine.getConcept('property-rules-liability');
console.log('\n' + propLiab.name + ':');
console.log('  Property Rule: ' + propLiab.propertyRule.definition);
console.log('  Liability Rule: ' + propLiab.liabilityRule.definition);

const handFormula = lawEconEngine.getConcept('hand-formula');
console.log('\n' + handFormula.name + ':');
console.log('  Formula: ' + handFormula.formula);
console.log('  Meaning: ' + handFormula.meaning);

// Domains
console.log('\n── Legal-Economic Domains ─────────────────────────────────\n');

const domains = lawEconEngine.listDomains();
domains.forEach(d => {
  console.log(d.name + ':');
  console.log('  ' + d.questions);
});

// Critiques
console.log('\n── Critiques of Law & Economics ───────────────────────────\n');

const distributive = lawEconEngine.getCritique('distributive');
console.log(distributive.name + ':');
console.log('  Claim: ' + distributive.claim);
console.log('  Response: ' + distributive.response);
console.log('  Counter: ' + distributive.counterResponse);

// Coase Analysis
console.log('\n── Coase Theorem Analysis ─────────────────────────────────\n');

const coaseAnalysis = lawEconEngine.coaseAnalysis('factory pollution affecting neighboring homes');
console.log('Situation: ' + coaseAnalysis.situation);
console.log('Coase Theorem:');
console.log('  Zero TC: ' + coaseAnalysis.coaseTheorem.zeroTC);
console.log('  Positive TC: ' + coaseAnalysis.coaseTheorem.positiveTC);
console.log('Recommendation: ' + coaseAnalysis.recommendation);
console.log('CYNIC: ' + coaseAnalysis.cynicNote);

// Legal-Economic Analysis
console.log('\n── Legal-Economic Analysis ────────────────────────────────\n');

const leAnalysis = lawEconEngine.analyzeLegalEconomic('product liability');
console.log('Problem: ' + leAnalysis.problem);
console.log('Approaches:');
Object.entries(leAnalysis.approaches).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + leAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(lawEngine.formatStatus());
console.log('\n');
console.log(econEngine.formatStatus());
console.log('\n');
console.log(lawEconEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 44 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const lawStats = lawEngine.getStats();
const econStats = econEngine.getStats();
const leStats = lawEconEngine.getStats();

console.log('44A Philosophy of Law Engine:');
console.log('  Theories: ' + lawStats.theories);
console.log('  Thinkers: ' + lawStats.thinkers);
console.log('  Concepts: ' + lawStats.concepts);
console.log('  Debates: ' + lawStats.debates);

console.log('\n44B Philosophy of Economics Engine:');
console.log('  Theories: ' + econStats.theories);
console.log('  Thinkers: ' + econStats.thinkers);
console.log('  Concepts: ' + econStats.concepts);
console.log('  Debates: ' + econStats.debates);
console.log('  Methodologies: ' + econStats.methodologies);

console.log('\n44C Law-Economics Integration Engine:');
console.log('  Movements: ' + leStats.movements);
console.log('  Thinkers: ' + leStats.thinkers);
console.log('  Concepts: ' + leStats.concepts);
console.log('  Domains: ' + leStats.domains);
console.log('  Critiques: ' + leStats.critiques);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('');
console.log('   ╔═══════════════════════════════════════════════════╗');
console.log('   ║                                                   ║');
console.log('   ║            *ears perk*                            ║');
console.log('   ║                                                   ║');
console.log('   ║   PHASE 44 COMPLETE - LAW & ECONOMICS             ║');
console.log('   ║                                                   ║');
console.log('   ║   Law: Natural law, positivism, interpretation    ║');
console.log('   ║   Economics: Value, markets, rationality          ║');
console.log('   ║   Integration: Coase, efficiency, regulation      ║');
console.log('   ║                                                   ║');
console.log('   ║   φ-bounded at 61.8% max confidence.              ║');
console.log('   ║                                                   ║');
console.log('   ║   *sniff* Law claims justice.                     ║');
console.log('   ║   Economics claims efficiency.                    ║');
console.log('   ║   CYNIC asks: cui bono?                           ║');
console.log('   ║                                                   ║');
console.log('   ╚═══════════════════════════════════════════════════╝');
console.log('');
console.log('═══════════════════════════════════════════════════════════\n');
