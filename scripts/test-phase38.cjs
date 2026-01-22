#!/usr/bin/env node

/**
 * Phase 38 Integration Test - Continental Philosophy
 *
 * Tests:
 * - 38A: Phenomenology Engine (Husserl, Heidegger, Merleau-Ponty)
 * - 38B: Existentialism Engine (Sartre, Camus, Beauvoir)
 * - 38C: Critical Theory Engine (Frankfurt School)
 */

const phenomenologyEngine = require('./lib/phenomenology-engine.cjs');
const existentialismEngine = require('./lib/existentialism-engine.cjs');
const criticalTheoryEngine = require('./lib/critical-theory-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 38: CONTINENTAL PHILOSOPHY');
console.log('  *ears perk* Beyond analytic philosophy...');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const phenomInit = phenomenologyEngine.init();
console.log('Phenomenology Engine: ' + phenomInit.status);

const existInit = existentialismEngine.init();
console.log('Existentialism Engine: ' + existInit.status);

const criticalInit = criticalTheoryEngine.init();
console.log('Critical Theory Engine: ' + criticalInit.status);

// ═══════════════════════════════════════════════════════════════════
// 38A: PHENOMENOLOGY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  38A: PHENOMENOLOGY ENGINE (Husserl, Heidegger, Merleau-Ponty)');
console.log('═══════════════════════════════════════════════════════════\n');

// Philosophers
console.log('── Key Phenomenologists ───────────────────────────────────\n');

const husserl = phenomenologyEngine.getPhilosopher('husserl');
console.log(husserl.name + ' (' + husserl.dates + ')');
console.log('  Role: ' + husserl.role);
console.log('  Motto: ' + husserl.motto);

const heidegger = phenomenologyEngine.getPhilosopher('heidegger');
console.log('\n' + heidegger.name + ' (' + heidegger.dates + ')');
console.log('  Role: ' + heidegger.role);
console.log('  Central: ' + heidegger.centralIdeas[0]);

// Concepts
console.log('\n── Core Concepts ──────────────────────────────────────────\n');

const intentionality = phenomenologyEngine.getConcept('intentionality');
console.log('Intentionality: ' + intentionality.definition);
console.log('  Noesis: ' + intentionality.structure.noesis);
console.log('  Noema: ' + intentionality.structure.noema);

const dasein = phenomenologyEngine.getConcept('dasein');
console.log('\nDasein: ' + dasein.meaning);
console.log('  ' + dasein.characteristics[0]);

// Methods
console.log('\n── Phenomenological Methods ───────────────────────────────\n');

const epoche = phenomenologyEngine.getMethod('epoche');
console.log('Epoché: ' + epoche.meaning);
epoche.procedure.slice(0, 2).forEach(p => console.log('  - ' + p));

// Experience analysis
console.log('\n── Experience Analysis ────────────────────────────────────\n');

const analysis = phenomenologyEngine.analyzeExperience('Seeing a sunset');
console.log('Husserlian question: ' + analysis.husserlian.question);
console.log('Heideggerian question: ' + analysis.heideggerian.dasein);
console.log('CYNIC: ' + analysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 38B: EXISTENTIALISM ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  38B: EXISTENTIALISM ENGINE (Sartre, Camus, Beauvoir)');
console.log('═══════════════════════════════════════════════════════════\n');

// Philosophers
console.log('── Key Existentialists ────────────────────────────────────\n');

const sartre = existentialismEngine.getPhilosopher('sartre');
console.log(sartre.name + ' (' + sartre.dates + ')');
console.log('  Role: ' + sartre.role);
sartre.quotes.forEach(q => console.log('  "' + q + '"'));

const camus = existentialismEngine.getPhilosopher('camus');
console.log('\n' + camus.name + ' (' + camus.dates + ')');
console.log('  Role: ' + camus.role);
console.log('  Note: ' + camus.distinction);

// Concepts
console.log('\n── Core Concepts ──────────────────────────────────────────\n');

const existenceEssence = existentialismEngine.getConcept('existence-essence');
console.log('Existence Precedes Essence:');
console.log('  ' + existenceEssence.meaning);
existenceEssence.implications.slice(0, 2).forEach(i => console.log('  - ' + i));

const badFaith = existentialismEngine.getConcept('bad-faith');
console.log('\nBad Faith (' + badFaith.french + '):');
console.log('  ' + badFaith.meaning);
badFaith.forms.slice(0, 2).forEach(f => console.log('  - ' + f));

const absurd = existentialismEngine.getConcept('absurd');
console.log('\nThe Absurd:');
console.log('  ' + absurd.meaning);
console.log('  Sisyphus: ' + absurd.sisyphus);

// Themes
console.log('\n── Existentialist Themes ──────────────────────────────────\n');

const authenticity = existentialismEngine.getTheme('authenticity');
console.log('Authenticity: ' + authenticity.description);
console.log('  Obstacles: ' + authenticity.obstacles.join(', '));

// Situation analysis
console.log('\n── Existential Situation Analysis ─────────────────────────\n');

const situation = existentialismEngine.analyzeExistentialSituation('Facing a career change');
console.log('Sartrean question: ' + situation.sartrean.freedom);
console.log('Camusian question: ' + situation.camusian.revolt);
console.log('Guidance: ' + situation.guidance.choose);
console.log('CYNIC: ' + situation.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 38C: CRITICAL THEORY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  38C: CRITICAL THEORY ENGINE (Frankfurt School)');
console.log('═══════════════════════════════════════════════════════════\n');

// Thinkers
console.log('── Frankfurt School Thinkers ──────────────────────────────\n');

const adorno = criticalTheoryEngine.getThinker('adorno');
console.log(adorno.name + ' (' + adorno.dates + ')');
console.log('  Role: ' + adorno.role);
adorno.quotes.slice(0, 2).forEach(q => console.log('  "' + q + '"'));

const habermas = criticalTheoryEngine.getThinker('habermas');
console.log('\n' + habermas.name + ' (' + habermas.dates + ')');
console.log('  Role: ' + habermas.role);
console.log('  Shift: ' + habermas.shift);

// Concepts
console.log('\n── Core Concepts ──────────────────────────────────────────\n');

const dialectic = criticalTheoryEngine.getConcept('dialectic-enlightenment');
console.log('Dialectic of Enlightenment:');
console.log('  Thesis: ' + dialectic.thesis);
console.log('  "' + dialectic.quote + '"');

const cultureIndustry = criticalTheoryEngine.getConcept('culture-industry');
console.log('\nCulture Industry:');
console.log('  ' + cultureIndustry.meaning);
cultureIndustry.characteristics.slice(0, 2).forEach(c => console.log('  - ' + c));

const oneDimensional = criticalTheoryEngine.getConcept('one-dimensional');
console.log('\nOne-Dimensional Society (Marcuse):');
console.log('  ' + oneDimensional.meaning);
console.log('  "' + oneDimensional.quote + '"');

const communicative = criticalTheoryEngine.getConcept('communicative-rationality');
console.log('\nCommunicative Rationality (Habermas):');
console.log('  ' + communicative.meaning);
communicative.characteristics.slice(0, 2).forEach(c => console.log('  - ' + c));

// Critiques
console.log('\n── Critical Theory Critiques ──────────────────────────────\n');

const capitalismCritique = criticalTheoryEngine.getCritique('capitalism');
console.log('Critique of Capitalism:');
capitalismCritique.dimensions.slice(0, 3).forEach(d => console.log('  - ' + d));

// Critical analysis
console.log('\n── Critical Analysis ──────────────────────────────────────\n');

const criticalAnalysis = criticalTheoryEngine.analyzeCritically('Social media algorithms');
console.log('Phenomenon: ' + criticalAnalysis.phenomenon);
console.log('Culture industry question: ' + criticalAnalysis.firstGeneration.cultureIndustry);
console.log('Habermas question: ' + criticalAnalysis.habermas.publicSphere);
console.log('CYNIC: ' + criticalAnalysis.cynicNote);

// Generational comparison
console.log('\n── Generational Comparison ────────────────────────────────\n');

const comparison = criticalTheoryEngine.compareGenerations();
console.log('Central question: ' + comparison.question);
console.log('First Gen: ' + comparison.firstGeneration.position);
console.log('Second Gen: ' + comparison.secondGeneration.position);
console.log('Tension: ' + comparison.tension);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(phenomenologyEngine.formatStatus());
console.log('\n');
console.log(existentialismEngine.formatStatus());
console.log('\n');
console.log(criticalTheoryEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 38 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const phenomStats = phenomenologyEngine.getStats();
const existStats = existentialismEngine.getStats();
const criticalStats = criticalTheoryEngine.getStats();

console.log('38A Phenomenology Engine:');
console.log('  Philosophers: ' + phenomStats.philosophers);
console.log('  Concepts: ' + phenomStats.concepts);
console.log('  Methods: ' + phenomStats.methods);

console.log('\n38B Existentialism Engine:');
console.log('  Philosophers: ' + existStats.philosophers);
console.log('  Concepts: ' + existStats.concepts);
console.log('  Themes: ' + existStats.themes);

console.log('\n38C Critical Theory Engine:');
console.log('  Thinkers: ' + criticalStats.thinkers);
console.log('  Concepts: ' + criticalStats.concepts);
console.log('  Critiques: ' + criticalStats.critiques);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  *tail wag* PHASE 38 COMPLETE');
console.log('  Continental Philosophy operational.');
console.log('  Phenomenology, existentialism, critical theory unified.');
console.log('  φ-bounded confidence: max 61.8%');
console.log('═══════════════════════════════════════════════════════════\n');
