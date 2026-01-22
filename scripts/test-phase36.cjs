#!/usr/bin/env node

/**
 * Phase 36 Integration Test - Applied Ethics
 *
 * Tests:
 * - 36A: Bioethics Engine (life, death, enhancement)
 * - 36B: Environmental Ethics Engine (nature, animals)
 * - 36C: Tech Ethics Engine (AI, privacy, autonomy)
 */

const bioethicsEngine = require('./lib/bioethics-engine.cjs');
const envEthicsEngine = require('./lib/environmental-ethics-engine.cjs');
const techEthicsEngine = require('./lib/tech-ethics-engine.cjs');

console.log('═══════════════════════════════════════════════════════════');
console.log('  PHASE 36: APPLIED ETHICS');
console.log('  *sniff* Where philosophy meets the real world...');
console.log('═══════════════════════════════════════════════════════════\n');

// Initialize all engines
console.log('── INITIALIZATION ─────────────────────────────────────────\n');

const bioInit = bioethicsEngine.init();
console.log('Bioethics Engine: ' + bioInit.status);

const envInit = envEthicsEngine.init();
console.log('Environmental Ethics Engine: ' + envInit.status);

const techInit = techEthicsEngine.init();
console.log('Tech Ethics Engine: ' + techInit.status);

// ═══════════════════════════════════════════════════════════════════
// 36A: BIOETHICS ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  36A: BIOETHICS ENGINE (Life, Death, Enhancement)');
console.log('═══════════════════════════════════════════════════════════\n');

// List principles
console.log('── Bioethical Principles ──────────────────────────────────\n');

const principles = bioethicsEngine.listPrinciples();
principles.slice(0, 4).forEach(p => {
  console.log(p.name);
  console.log('  ' + p.description);
});

// Euthanasia issue
console.log('\n── Euthanasia Issue ───────────────────────────────────────\n');

const euthanasia = bioethicsEngine.getIssue('euthanasia');
console.log('Question: ' + euthanasia.question);
console.log('Distinctions:');
console.log('  Active: ' + euthanasia.distinctions.active);
console.log('  Passive: ' + euthanasia.distinctions.passive);
console.log('  Voluntary: ' + euthanasia.distinctions.voluntary);
console.log('Doctrine of Double Effect: ' + euthanasia.doctrineDoubleEffect.claim);

// Enhancement positions
console.log('\n── Genetic Enhancement ────────────────────────────────────\n');

const enhancement = bioethicsEngine.comparePositions('genetic-enhancement');
console.log('Question: ' + enhancement.question);
enhancement.positions.forEach(p => {
  console.log('  ' + p.name + ': ' + p.claim);
});
console.log('Consensus: ' + enhancement.consensus);

// Case analysis
console.log('\n── Case Analysis ──────────────────────────────────────────\n');

const caseAnalysis = bioethicsEngine.analyzeCase('Patient refuses life-saving treatment due to religious beliefs');
console.log('Case: ' + caseAnalysis.case);
console.log('Relevant principles: ' + caseAnalysis.relevantPrinciples.map(p => p.name).join(', '));
if (caseAnalysis.tensions.length > 0) {
  console.log('Tension: ' + caseAnalysis.tensions[0].issue);
}
console.log('CYNIC: ' + caseAnalysis.cynicNote);

// ═══════════════════════════════════════════════════════════════════
// 36B: ENVIRONMENTAL ETHICS ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  36B: ENVIRONMENTAL ETHICS ENGINE (Nature, Animals)');
console.log('═══════════════════════════════════════════════════════════\n');

// Meta-ethical positions
console.log('── Meta-Ethical Positions ─────────────────────────────────\n');

const envPositions = envEthicsEngine.listPositions();
envPositions.forEach(p => {
  console.log(p.name + ': ' + p.claim);
  console.log('  Strength: ' + (p.strength * 100).toFixed(1) + '%');
});

// Animal rights
console.log('\n── Animal Rights ──────────────────────────────────────────\n');

const animalRights = envEthicsEngine.getIssue('animal-rights');
console.log('Question: ' + animalRights.question);
Object.entries(animalRights.positions).forEach(([key, pos]) => {
  console.log('  ' + pos.name + ' (' + pos.philosopher + '): ' + pos.claim);
});

// Climate ethics
console.log('\n── Climate Ethics ─────────────────────────────────────────\n');

const climate = envEthicsEngine.getIssue('climate-ethics');
console.log('Question: ' + climate.question);
console.log('Key dimensions:');
console.log('  Responsibility: ' + climate.dimensions.responsibility.question);
console.log('  Distribution: ' + climate.dimensions.distribution.question);
console.log('  Future generations: ' + climate.dimensions.futureGenerations.question);

// Moral status analysis
console.log('\n── Moral Status Analysis ──────────────────────────────────\n');

const dogStatus = envEthicsEngine.analyzeMoralStatus('dog');
console.log('Entity: ' + dogStatus.entity);
console.log('Status by position:');
dogStatus.statusByPosition.forEach(s => {
  const status = s.grants ? 'YES' : 'NO';
  console.log('  ' + s.position + ': ' + status);
});
console.log('Consensus: ' + dogStatus.consensus);

// ═══════════════════════════════════════════════════════════════════
// 36C: TECH ETHICS ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  36C: TECH ETHICS ENGINE (AI, Privacy, Autonomy)');
console.log('═══════════════════════════════════════════════════════════\n');

// Principles
console.log('── Tech Ethics Principles ─────────────────────────────────\n');

const techPrinciples = techEthicsEngine.listPrinciples();
techPrinciples.slice(0, 4).forEach(p => {
  console.log(p.name + ': ' + p.description);
});

// AI Alignment
console.log('\n── AI Alignment ───────────────────────────────────────────\n');

const alignment = techEthicsEngine.getIssue('ai-alignment');
console.log('Question: ' + alignment.question);
console.log('Problems:');
Object.entries(alignment.problems).forEach(([key, desc]) => {
  console.log('  - ' + key + ': ' + desc);
});
console.log('Consensus: ' + alignment.consensus);

// Algorithmic bias
console.log('\n── Algorithmic Bias ───────────────────────────────────────\n');

const bias = techEthicsEngine.getIssue('algorithmic-bias');
console.log('Fairness definitions (and their tension):');
console.log('  ' + bias.fairnessDefinitions.demographicParity);
console.log('  ' + bias.fairnessDefinitions.equalizedOdds);
console.log('  ' + bias.fairnessDefinitions.individualFairness);
console.log('  Problem: ' + bias.fairnessDefinitions.tension);

// Technology analysis
console.log('\n── Technology Analysis ────────────────────────────────────\n');

const techAnalysis = techEthicsEngine.analyzeTechnology('AI recommendation system collecting user data');
console.log('Technology: ' + techAnalysis.technology);
console.log('Relevant principles: ' + techAnalysis.relevantPrinciples.map(p => p.name).join(', '));
console.log('Concerns: ' + techAnalysis.concerns.join(', '));
console.log('CYNIC: ' + techAnalysis.cynicNote);

// AI scenario
console.log('\n── AI Scenario Analysis ───────────────────────────────────\n');

const aiScenario = techEthicsEngine.analyzeAIScenario('Deploying facial recognition in public spaces');
console.log('Key questions:');
aiScenario.keyQuestions.slice(0, 3).forEach(q => console.log('  - ' + q));
console.log('Red flags to watch:');
aiScenario.redFlags.slice(0, 2).forEach(r => console.log('  - ' + r));
console.log('CYNIC: ' + aiScenario.cynicAdvice);

// ═══════════════════════════════════════════════════════════════════
// STATUS DISPLAYS
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENGINE STATUS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(bioethicsEngine.formatStatus());
console.log('\n');
console.log(envEthicsEngine.formatStatus());
console.log('\n');
console.log(techEthicsEngine.formatStatus());

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  PHASE 36 SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');

const bioStats = bioethicsEngine.getStats();
const envStats = envEthicsEngine.getStats();
const techStats = techEthicsEngine.getStats();

console.log('36A Bioethics Engine:');
console.log('  Issues: ' + bioStats.issues);
console.log('  Principles: ' + bioStats.principles);
console.log('  Analyses: ' + bioStats.analyses);

console.log('\n36B Environmental Ethics Engine:');
console.log('  Positions: ' + envStats.positions);
console.log('  Issues: ' + envStats.issues);
console.log('  Analyses: ' + envStats.analyses);

console.log('\n36C Tech Ethics Engine:');
console.log('  Issues: ' + techStats.issues);
console.log('  Principles: ' + techStats.principles);
console.log('  Analyses: ' + techStats.analyses);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  *tail wag* PHASE 36 COMPLETE');
console.log('  Applied Ethics operational.');
console.log('  Real-world dilemmas, φ-bounded guidance.');
console.log('  φ-bounded confidence: max 61.8%');
console.log('═══════════════════════════════════════════════════════════\n');
