#!/usr/bin/env node

/**
 * Phase 42 Integration Test - Pragmatism & Process
 *
 * Tests:
 * - 42A: Pragmatism Engine (Peirce, James, Dewey)
 * - 42B: Process Philosophy Engine (Whitehead, Bergson)
 * - 42C: American Philosophy Engine (broader tradition)
 *
 * φ-bounded: max 61.8% confidence
 */

const pragmatismEngine = require('./lib/pragmatism-engine.cjs');
const processEngine = require('./lib/process-philosophy-engine.cjs');
const americanEngine = require('./lib/american-philosophy-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 42: PRAGMATISM & PROCESS');
console.log('  *tail wag* What practical difference does it make?');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const pragmatismInit = pragmatismEngine.init();
console.log('Pragmatism Engine: ' + pragmatismInit.status);

const processInit = processEngine.init();
console.log('Process Philosophy Engine: ' + processInit.status);

const americanInit = americanEngine.init();
console.log('American Philosophy Engine: ' + americanInit.status);

// ═══════════════════════════════════════════════════════════════════
// 42A: PRAGMATISM ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  42A: PRAGMATISM');
console.log('═══════════════════════════════════════════════════════════\n');

// Thinkers
console.log('── Classical Pragmatists ──────────────────────────────────\n');

const thinkers = pragmatismEngine.listThinkers();
thinkers.slice(0, 3).forEach(t => {
  console.log(t.name + ' (' + t.dates + '):');
  console.log('  Role: ' + t.role);
});

// Peirce Detail
console.log('\n── Charles Sanders Peirce ─────────────────────────────────\n');

const peirce = pragmatismEngine.getThinker('peirce');
console.log('Pragmatic Maxim:');
console.log('  "' + peirce.pragmaticMaxim.slice(0, 100) + '..."');
console.log('\nCategories:');
Object.entries(peirce.categories).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('\nOn Truth: ' + peirce.onTruth);

// James Detail
console.log('\n── William James ──────────────────────────────────────────\n');

const james = pragmatismEngine.getThinker('james');
console.log('On Truth: ' + james.onTruth);
console.log('\nWill to Believe:');
console.log('  Thesis: ' + james.willToBelieve.thesis);
console.log('  Conditions: ' + james.willToBelieve.conditions.join(', '));
console.log('\nPluralism: ' + james.pluralism);

// Dewey Detail
console.log('\n── John Dewey ─────────────────────────────────────────────\n');

const dewey = pragmatismEngine.getThinker('dewey');
console.log('Instrumentalism: ' + dewey.instrumentalism);
console.log('\nInquiry:');
console.log('  Definition: ' + dewey.inquiry.definition);
console.log('  Pattern: ' + dewey.inquiry.pattern.join(' → '));
console.log('\nEducation: ' + dewey.education.progressive);

// Maxims
console.log('\n── Pragmatic Maxims ───────────────────────────────────────\n');

const maxims = pragmatismEngine.listMaxims();
maxims.forEach(m => {
  console.log(m.name + ' (' + m.author + '):');
  console.log('  ' + m.statement.slice(0, 80) + '...');
});

// Concepts
console.log('\n── Key Concepts ───────────────────────────────────────────\n');

const truth = pragmatismEngine.getConcept('truth');
console.log(truth.name + ':');
console.log('  Peirce: ' + truth.views.peirce);
console.log('  James: ' + truth.views.james);
console.log('  Dewey: ' + truth.views.dewey);

const inquiry = pragmatismEngine.getConcept('inquiry');
console.log('\n' + inquiry.name + ':');
console.log('  ' + inquiry.definition);

// Critiques
console.log('\n── Critiques of Pragmatism ────────────────────────────────\n');

const relativism = pragmatismEngine.getCritique('relativism');
console.log(relativism.name + ':');
console.log('  Charge: ' + relativism.charge);
console.log('  Peirce response: ' + relativism.pragmatistResponse.peirce);

// Pragmatic Analysis
console.log('\n── Pragmatic Analysis ─────────────────────────────────────\n');

const pragAnalysis = pragmatismEngine.analyzePragmatically('Free will exists');
console.log('Claim: ' + pragAnalysis.claim);
console.log('Pragmatic questions:');
Object.entries(pragAnalysis.pragmaticQuestions).slice(0, 2).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + pragAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 42B: PROCESS PHILOSOPHY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  42B: PROCESS PHILOSOPHY');
console.log('═══════════════════════════════════════════════════════════\n');

// Thinkers
console.log('── Process Philosophers ───────────────────────────────────\n');

const whitehead = processEngine.getThinker('whitehead');
console.log(whitehead.name + ' (' + whitehead.dates + '):');
console.log('  Role: ' + whitehead.role);
console.log('  Central thesis: ' + whitehead.centralThesis);
console.log('  Key works: ' + whitehead.keyWorks.slice(0, 2).join(', '));

const bergson = processEngine.getThinker('bergson');
console.log('\n' + bergson.name + ' (' + bergson.dates + '):');
console.log('  Central thesis: ' + bergson.centralThesis);
console.log('  Key concepts:');
Object.entries(bergson.concepts).forEach(([k, v]) => {
  console.log('    ' + k + ': ' + v);
});

// Concepts
console.log('\n── Whiteheadian Concepts ──────────────────────────────────\n');

const concepts = processEngine.listConcepts();
concepts.slice(0, 4).forEach(c => {
  console.log(c.name + ':');
  console.log('  ' + c.definition);
});

// Actual Occasion Detail
console.log('\n── Actual Occasion ────────────────────────────────────────\n');

const actualOccasion = processEngine.getConcept('actual-occasion');
console.log('Definition: ' + actualOccasion.definition);
console.log('Characteristics:');
actualOccasion.characteristics.forEach(c => console.log('  - ' + c));
console.log('Contrast: ' + actualOccasion.contrastSubstance);

// Prehension
console.log('\n── Prehension ─────────────────────────────────────────────\n');

const prehension = processEngine.getConcept('prehension');
console.log('Definition: ' + prehension.definition);
console.log('Types:');
console.log('  Positive: ' + prehension.types.positive);
console.log('  Negative: ' + prehension.types.negative);

// Categories
console.log('\n── Whitehead\'s Categories ─────────────────────────────────\n');

const ultimate = processEngine.getCategory('ultimate');
console.log(ultimate.name + ':');
console.log('  Elements: ' + ultimate.elements.join(', '));
console.log('  Principle: ' + ultimate.principle);

const god = processEngine.getCategory('god');
console.log('\n' + god.name + ':');
console.log('  Primordial: ' + god.whitehead.primordial);
console.log('  Consequent: ' + god.whitehead.consequent);
console.log('  Not omnipotent: ' + god.notOmnipotent);

// Applications
console.log('\n── Applications ───────────────────────────────────────────\n');

const applications = processEngine.listApplications();
applications.forEach(a => {
  console.log(a.name + ':');
  console.log('  ' + a.thesis);
});

// Process Analysis
console.log('\n── Process Analysis ───────────────────────────────────────\n');

const processAnalysis = processEngine.analyzeProcess('consciousness');
console.log('Subject: ' + processAnalysis.subject);
console.log('Process questions:');
Object.entries(processAnalysis.processQuestions).slice(0, 2).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + processAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 42C: AMERICAN PHILOSOPHY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  42C: AMERICAN PHILOSOPHY');
console.log('═══════════════════════════════════════════════════════════\n');

// Movements
console.log('── Philosophical Movements ────────────────────────────────\n');

const movements = americanEngine.listMovements();
movements.forEach(m => {
  console.log(m.name + ' (' + m.period + '):');
  if (m.figures) console.log('  Figures: ' + m.figures.slice(0, 3).join(', '));
});

// Transcendentalism
console.log('\n── Transcendentalism ──────────────────────────────────────\n');

const transcendentalism = americanEngine.getMovement('transcendentalism');
console.log('Period: ' + transcendentalism.period);
console.log('Location: ' + transcendentalism.location);
console.log('Key ideas:');
transcendentalism.keyIdeas.slice(0, 3).forEach(i => console.log('  - ' + i));
console.log('Legacy: ' + transcendentalism.legacy);

// Emerson
console.log('\n── Ralph Waldo Emerson ────────────────────────────────────\n');

const emerson = americanEngine.getThinker('emerson');
console.log(emerson.name + ' (' + emerson.dates + ')');
console.log('Key works: ' + emerson.keyWorks.join(', '));
console.log('Ideas:');
console.log('  Self-Reliance: ' + emerson.ideas.selfReliance);
console.log('  Over-Soul: ' + emerson.ideas.overSoul);
console.log('Quote: "' + emerson.quote + '"');

// Thoreau
console.log('\n── Henry David Thoreau ────────────────────────────────────\n');

const thoreau = americanEngine.getThinker('thoreau');
console.log(thoreau.name + ' (' + thoreau.dates + ')');
console.log('Ideas:');
console.log('  Simplicity: ' + thoreau.ideas.simplicity);
console.log('  Civil Disobedience: ' + thoreau.ideas.civilDisobedience);
console.log('Influence: ' + thoreau.influence);

// Quine
console.log('\n── W.V.O. Quine ────────────────────────────────────────────\n');

const quine = americanEngine.getThinker('quine');
console.log(quine.name + ' (' + quine.dates + ')');
console.log('Key ideas:');
console.log('  Two Dogmas: ' + quine.ideas.twoDogmas);
console.log('  Holism: ' + quine.ideas.holism);
console.log('  Naturalized: ' + quine.ideas.naturalized);

// Themes
console.log('\n── American Philosophical Themes ───────────────────────────\n');

const themes = americanEngine.listThemes();
themes.forEach(t => {
  console.log(t.name + ': ' + t.description);
});

// Debates
console.log('\n── Key Debates ────────────────────────────────────────────\n');

const pragAnalytic = americanEngine.getDebate('pragmatism-analytic');
console.log(pragAnalytic.name + ':');
console.log('  Tension: ' + pragAnalytic.tension);
console.log('  Positions:');
Object.entries(pragAnalytic.positions).forEach(([k, v]) => {
  console.log('    ' + k + ': ' + v);
});

// American Analysis
console.log('\n── American Philosophy Analysis ───────────────────────────\n');

const amAnalysis = americanEngine.analyzeAmerican('artificial intelligence');
console.log('Topic: ' + amAnalysis.topic);
console.log('Perspectives:');
Object.entries(amAnalysis.perspectives).slice(0, 2).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + amAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(pragmatismEngine.formatStatus());
console.log('\n');
console.log(processEngine.formatStatus());
console.log('\n');
console.log(americanEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 42 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const pragmatismStats = pragmatismEngine.getStats();
const processStats = processEngine.getStats();
const americanStats = americanEngine.getStats();

console.log('42A Pragmatism Engine:');
console.log('  Thinkers: ' + pragmatismStats.thinkers);
console.log('  Maxims: ' + pragmatismStats.maxims);
console.log('  Concepts: ' + pragmatismStats.concepts);
console.log('  Critiques: ' + pragmatismStats.critiques);

console.log('\n42B Process Philosophy Engine:');
console.log('  Thinkers: ' + processStats.thinkers);
console.log('  Concepts: ' + processStats.concepts);
console.log('  Categories: ' + processStats.categories);
console.log('  Applications: ' + processStats.applications);

console.log('\n42C American Philosophy Engine:');
console.log('  Movements: ' + americanStats.movements);
console.log('  Thinkers: ' + americanStats.thinkers);
console.log('  Themes: ' + americanStats.themes);
console.log('  Debates: ' + americanStats.debates);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('');
console.log('   ╔═══════════════════════════════════════════════════╗');
console.log('   ║                                                   ║');
console.log('   ║            *tail wag*                             ║');
console.log('   ║                                                   ║');
console.log('   ║      PHASE 42 COMPLETE - PRAGMATISM & PROCESS     ║');
console.log('   ║                                                   ║');
console.log('   ║      Pragmatism: Peirce, James, Dewey             ║');
console.log('   ║      Process: Whitehead, Bergson                  ║');
console.log('   ║      American: Emerson to Rorty                   ║');
console.log('   ║                                                   ║');
console.log('   ║      "What practical difference does it make?"    ║');
console.log('   ║      φ-bounded at 61.8% max confidence.           ║');
console.log('   ║                                                   ║');
console.log('   ║      *sniff* Reality flows. Ideas are tools.      ║');
console.log('   ║      Trust thyself.                               ║');
console.log('   ║                                                   ║');
console.log('   ╚═══════════════════════════════════════════════════╝');
console.log('');
console.log('═══════════════════════════════════════════════════════════\n');
