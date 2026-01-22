#!/usr/bin/env node

/**
 * Phase 43 Integration Test - Global Philosophy
 *
 * Tests:
 * - 43A: African Philosophy Engine (Ubuntu, Sage, Negritude)
 * - 43B: Islamic Philosophy Engine (Kalam, Falsafa, Ishraq)
 * - 43C: Latin American Philosophy Engine (Liberation, Identity)
 *
 * φ-bounded: max 61.8% confidence
 */

const africanEngine = require('./lib/african-philosophy-engine.cjs');
const islamicEngine = require('./lib/islamic-philosophy-engine.cjs');
const latinAmericanEngine = require('./lib/latin-american-philosophy-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 43: GLOBAL PHILOSOPHY');
console.log('  *ears perk* Many traditions, many wisdoms...');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const africanInit = africanEngine.init();
console.log('African Philosophy Engine: ' + africanInit.status);

const islamicInit = islamicEngine.init();
console.log('Islamic Philosophy Engine: ' + islamicInit.status);

const latinAmericanInit = latinAmericanEngine.init();
console.log('Latin American Philosophy Engine: ' + latinAmericanInit.status);

// ═══════════════════════════════════════════════════════════════════
// 43A: AFRICAN PHILOSOPHY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  43A: AFRICAN PHILOSOPHY');
console.log('═══════════════════════════════════════════════════════════\n');

// Traditions
console.log('── African Philosophical Traditions ───────────────────────\n');

const traditions = africanEngine.listTraditions();
traditions.forEach(t => {
  console.log(t.name + ':');
  console.log('  ' + (t.core || t.thesis || t.definition));
});

// Ubuntu
console.log('\n── Ubuntu Philosophy ──────────────────────────────────────\n');

const ubuntu = africanEngine.getTradition('ubuntu');
console.log('Meaning: ' + ubuntu.meaning);
console.log('Principles:');
ubuntu.principles.slice(0, 3).forEach(p => console.log('  - ' + p));
console.log('Tutu: ' + ubuntu.tutu);

// Sage Philosophy
console.log('\n── Sage Philosophy ────────────────────────────────────────\n');

const sage = africanEngine.getTradition('sage-philosophy');
console.log('Founder: ' + sage.founder);
console.log('Method:');
console.log('  Interviews: ' + sage.method.interviews);
console.log('  Distinction: ' + sage.method.distinction);
console.log('Significance: ' + sage.significance);

// Key Thinkers
console.log('\n── Key African Philosophers ───────────────────────────────\n');

const wiredu = africanEngine.getThinker('wiredu');
console.log(wiredu.name + ' (' + wiredu.dates + '):');
console.log('  Decolonization: ' + wiredu.keyIdeas.decolonization);

const hountondji = africanEngine.getThinker('hountondji');
console.log('\n' + hountondji.name + ':');
console.log('  Thesis: ' + hountondji.position.thesis);

// Concepts
console.log('\n── Key Concepts ───────────────────────────────────────────\n');

const ubuntuConcept = africanEngine.getConcept('ubuntu-concept');
console.log(ubuntuConcept.name + ':');
console.log('  Formula: ' + ubuntuConcept.formula);
console.log('  Contrast:');
console.log('    Western: ' + ubuntuConcept.contrast.western);
console.log('    Ubuntu: ' + ubuntuConcept.contrast.ubuntu);

// African Analysis
console.log('\n── African Philosophy Analysis ────────────────────────────\n');

const africanAnalysis = africanEngine.analyzeAfrican('human rights');
console.log('Topic: ' + africanAnalysis.topic);
console.log('Ubuntu analysis:');
Object.entries(africanAnalysis.ubuntuAnalysis).slice(0, 2).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + africanAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 43B: ISLAMIC PHILOSOPHY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  43B: ISLAMIC PHILOSOPHY');
console.log('═══════════════════════════════════════════════════════════\n');

// Traditions
console.log('── Islamic Philosophical Traditions ───────────────────────\n');

const islamicTraditions = islamicEngine.listTraditions();
islamicTraditions.forEach(t => {
  console.log(t.name + ':');
  console.log('  ' + (t.meaning || t.thesis));
});

// Falsafa
console.log('\n── Falsafa (Peripatetic Philosophy) ───────────────────────\n');

const falsafa = islamicEngine.getTradition('falsafa');
console.log('Meaning: ' + falsafa.meaning);
console.log('Key figures: ' + falsafa.keyFigures.join(', '));
console.log('Transmission: ' + falsafa.transmission);

// Key Thinkers
console.log('\n── Key Islamic Philosophers ───────────────────────────────\n');

const ibnSina = islamicEngine.getThinker('ibn-sina');
console.log(ibnSina.name + ' (' + ibnSina.dates + '):');
console.log('  Title: ' + ibnSina.title);
console.log('  Necessary Being: ' + ibnSina.philosophy.necessaryBeing);

const ghazali = islamicEngine.getThinker('al-ghazali');
console.log('\n' + ghazali.name + ' (' + ghazali.dates + '):');
console.log('  Title: ' + ghazali.title);
console.log('  Occasionalism: ' + ghazali.position.occasionalism);

const ibnRushd = islamicEngine.getThinker('ibn-rushd');
console.log('\n' + ibnRushd.name + ' (' + ibnRushd.dates + '):');
console.log('  Title: ' + ibnRushd.title);
console.log('  Response: ' + ibnRushd.philosophy.response);

// Concepts
console.log('\n── Key Concepts ───────────────────────────────────────────\n');

const wujud = islamicEngine.getConcept('wujud');
console.log(wujud.name + ':');
console.log('  Ibn Sina: ' + wujud.ibnSina.distinction);
console.log('  Mulla Sadra: ' + wujud.mullaSadra.primacy);

const necessaryBeing = islamicEngine.getConcept('necessary-being');
console.log('\n' + necessaryBeing.name + ':');
console.log('  Argument:');
necessaryBeing.argument.premise1 && console.log('    1. ' + necessaryBeing.argument.premise1);
console.log('  Conclusion: ' + necessaryBeing.argument.conclusion);

// Debates
console.log('\n── Key Debates ────────────────────────────────────────────\n');

const eternityDebate = islamicEngine.getDebate('eternity-creation');
console.log(eternityDebate.name + ':');
console.log('  Philosophers: ' + eternityDebate.positions.philosophers);
console.log('  Theologians: ' + eternityDebate.positions.theologians);

// Islamic Analysis
console.log('\n── Islamic Philosophy Analysis ────────────────────────────\n');

const islamicAnalysis = islamicEngine.analyzeIslamic('free will');
console.log('Topic: ' + islamicAnalysis.topic);
console.log('Perspectives:');
Object.entries(islamicAnalysis.perspectives).slice(0, 2).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + islamicAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 43C: LATIN AMERICAN PHILOSOPHY ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  43C: LATIN AMERICAN PHILOSOPHY');
console.log('═══════════════════════════════════════════════════════════\n');

// Movements
console.log('── Latin American Philosophical Movements ─────────────────\n');

const laMovements = latinAmericanEngine.listMovements();
laMovements.forEach(m => {
  console.log(m.name + ' (' + m.period + '):');
  console.log('  ' + (m.thesis || m.question));
});

// Liberation Philosophy
console.log('\n── Philosophy of Liberation ───────────────────────────────\n');

const liberation = latinAmericanEngine.getMovement('liberation');
console.log('Thesis: ' + liberation.thesis);
console.log('Characteristics:');
liberation.characteristics.slice(0, 3).forEach(c => console.log('  - ' + c));
console.log('Dussel: ' + liberation.dussel);

// Decolonial Thought
console.log('\n── Decolonial Thought ─────────────────────────────────────\n');

const decolonial = latinAmericanEngine.getMovement('decolonial');
console.log('Key Ideas:');
Object.entries(decolonial.keyIdeas).slice(0, 3).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('Goal: ' + decolonial.goal);

// Key Thinkers
console.log('\n── Key Latin American Philosophers ────────────────────────\n');

const dussel = latinAmericanEngine.getThinker('dussel');
console.log(dussel.name + ':');
console.log('  Role: ' + dussel.role);
console.log('  Exteriority: ' + dussel.philosophy.exteriority);
console.log('  Transmodernity: ' + dussel.philosophy.transmodernity);

const freire = latinAmericanEngine.getThinker('freire');
console.log('\n' + freire.name + ':');
console.log('  Banking model: ' + freire.philosophy.banking);
console.log('  Conscientization: ' + freire.philosophy.conscientization);

// Concepts
console.log('\n── Key Concepts ───────────────────────────────────────────\n');

const exteriority = latinAmericanEngine.getConcept('exteriority');
console.log(exteriority.name + ':');
console.log('  Definition: ' + exteriority.definition);
console.log('  Ethical: ' + exteriority.ethical);

const coloniality = latinAmericanEngine.getConcept('coloniality');
console.log('\n' + coloniality.name + ':');
console.log('  Definition: ' + coloniality.definition);
console.log('  Implication: ' + coloniality.implication);

// Debates
console.log('\n── Key Debates ────────────────────────────────────────────\n');

const authenticityDebate = latinAmericanEngine.getDebate('authenticity-debate');
console.log(authenticityDebate.name + ':');
console.log('  Question: ' + authenticityDebate.question);
console.log('  Resolution: ' + authenticityDebate.resolution);

// Latin American Analysis
console.log('\n── Latin American Philosophy Analysis ─────────────────────\n');

const laAnalysis = latinAmericanEngine.analyzeLatinAmerican('technology');
console.log('Topic: ' + laAnalysis.topic);
console.log('Critical questions:');
Object.entries(laAnalysis.criticalQuestions).slice(0, 2).forEach(([k, v]) => {
  console.log('  ' + k + ': ' + v);
});
console.log('CYNIC: ' + laAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(africanEngine.formatStatus());
console.log('\n');
console.log(islamicEngine.formatStatus());
console.log('\n');
console.log(latinAmericanEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 43 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const africanStats = africanEngine.getStats();
const islamicStats = islamicEngine.getStats();
const laStats = latinAmericanEngine.getStats();

console.log('43A African Philosophy Engine:');
console.log('  Traditions: ' + africanStats.traditions);
console.log('  Thinkers: ' + africanStats.thinkers);
console.log('  Concepts: ' + africanStats.concepts);
console.log('  Debates: ' + africanStats.debates);

console.log('\n43B Islamic Philosophy Engine:');
console.log('  Traditions: ' + islamicStats.traditions);
console.log('  Thinkers: ' + islamicStats.thinkers);
console.log('  Concepts: ' + islamicStats.concepts);
console.log('  Debates: ' + islamicStats.debates);

console.log('\n43C Latin American Philosophy Engine:');
console.log('  Movements: ' + laStats.movements);
console.log('  Thinkers: ' + laStats.thinkers);
console.log('  Concepts: ' + laStats.concepts);
console.log('  Debates: ' + laStats.debates);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('');
console.log('   ╔═══════════════════════════════════════════════════╗');
console.log('   ║                                                   ║');
console.log('   ║            *ears perk*                            ║');
console.log('   ║                                                   ║');
console.log('   ║      PHASE 43 COMPLETE - GLOBAL PHILOSOPHY        ║');
console.log('   ║                                                   ║');
console.log('   ║      African: Ubuntu, Sage Philosophy             ║');
console.log('   ║      Islamic: Falsafa, Ishraq, Kalam              ║');
console.log('   ║      Latin American: Liberation, Decolonial       ║');
console.log('   ║                                                   ║');
console.log('   ║      Many traditions, many wisdoms.               ║');
console.log('   ║      φ-bounded at 61.8% max confidence.           ║');
console.log('   ║                                                   ║');
console.log('   ║      *tail wag* I am because we are.              ║');
console.log('   ║      Exteriority speaks truth to power.           ║');
console.log('   ║                                                   ║');
console.log('   ╚═══════════════════════════════════════════════════╝');
console.log('');
console.log('═══════════════════════════════════════════════════════════\n');
