#!/usr/bin/env node
/**
 * Demo: Philosophy Bridge Integration
 */

import {
  calculateQScoreFromAxioms,
  getRelevantPhases,
  enhanceWithPhilosophy,
  getPhilosophicalGrounding
} from '../packages/core/src/qscore/index.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('  EXEMPLE: Juger "sustainable economic value creation"');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Trouver les phases pertinentes
console.log('── 1. Phases Philosophiques Pertinentes ──────────────────\n');
const phases = getRelevantPhases('sustainable economic value creation');
console.log('Topic:', phases.topic);
console.log('Phases trouvées:', phases.count);
phases.relevantPhases.forEach(p => {
  console.log('  Phase ' + p.phase + ': ' + p.name);
  console.log('    Axiom primaire: ' + p.primaryAxiom + ' → ' + p.dimensions.join(', '));
});
console.log('\n' + phases.cynicNote);

// 2. Calculer un Q-Score
console.log('\n── 2. Q-Score Brut ────────────────────────────────────────\n');
const qScore = calculateQScoreFromAxioms({
  PHI: 72,      // Structure ok
  VERIFY: 65,   // Vérifiable mais pas parfait
  CULTURE: 58,  // Alignement moyen
  BURN: 45      // Valeur faible - problème!
});
console.log('Q-Score:', qScore.Q);
console.log('Verdict:', qScore.verdict.verdict, qScore.verdict.emoji);
console.log('Breakdown:', JSON.stringify(qScore.breakdown));

// 3. Enrichir avec philosophie
console.log('\n── 3. Enrichissement Philosophique ────────────────────────\n');
const enhanced = enhanceWithPhilosophy(qScore, 'sustainable economic value creation');

console.log('Axioms faibles:', Object.keys(enhanced.weakAxiomResources).join(', ') || 'aucun');
if (enhanced.weakAxiomResources.BURN) {
  console.log('\nRessources pour améliorer BURN:');
  console.log('  Traditions:', enhanced.weakAxiomResources.BURN.traditions.slice(0,4).join(', '));
  console.log('  Sources:', enhanced.weakAxiomResources.BURN.sources.slice(0,4).join(', '));
}

console.log('\nRecommandation:', enhanced.synthesis.recommendation);
console.log('\n' + enhanced.cynicNote);

// 4. Grounding détaillé
console.log('\n── 4. Grounding: BURN.SUSTAINABILITY ──────────────────────\n');
const grounding = getPhilosophicalGrounding('BURN', 'SUSTAINABILITY');
console.log('Dimension:', grounding.dimension);
console.log('Insight:', grounding.insight);
console.log('Sources:', grounding.philosophical_sources.join(', '));
console.log('Traditions:', grounding.traditions.join(', '));
console.log('\n' + grounding.cynicNote);

console.log('\n═══════════════════════════════════════════════════════════');
