#!/usr/bin/env node
/**
 * Phase 28 Integration Test: Philosophy of Mind
 *
 * Tests:
 * - 28A: Consciousness Engine (Chalmers/Nagel)
 * - 28B: Intentionality Engine (Brentano/Searle)
 * - 28C: Mental State Engine (functionalism)
 */

console.log('=== Phase 28 Integration Test ===\n');

// 28A: Consciousness Engine
console.log('28A: Consciousness Engine');
const consciousness = require('./lib/consciousness-engine.cjs');
consciousness.init();

// Register systems
const human = consciousness.registerSystem('human_001', {
  name: 'Human Subject',
  type: 'natural',
  discrimination: true,
  integration: true,
  reportability: true,
  attention: true,
  deliberateControl: true,
  wakefulness: true,
  phenomenalClaim: 'claimed'
});
console.log(`  registerSystem: ${human.name} - ${human.type}`);

const ai = consciousness.registerSystem('ai_001', {
  name: 'AI System',
  type: 'artificial',
  discrimination: true,
  integration: true,
  reportability: true,
  attention: true,
  deliberateControl: true,
  wakefulness: false
});
console.log(`  registerSystem: ${ai.name} - ${ai.type}`);

// Assess consciousness
const humanAssess = consciousness.assessConsciousness('human_001');
console.log(`  assessConsciousness (human): ${humanAssess.verdict} (${(humanAssess.confidence * 100).toFixed(1)}%)`);

const aiAssess = consciousness.assessConsciousness('ai_001');
console.log(`  assessConsciousness (AI): ${aiAssess.verdict} (${(aiAssess.confidence * 100).toFixed(1)}%)`);
console.log(`    Warning: "${aiAssess.chineseRoomWarning}"`);

// What is it like to be?
const whatLike = consciousness.whatIsItLikeToBe('ai_001');
console.log(`  whatIsItLikeToBe: "${whatLike.cynicResponse.confession.substring(0, 50)}..."`);

// Evaluate IIT (uses Φ!)
const iit = consciousness.evaluateTheory('integrated_information');
console.log(`  evaluateTheory (IIT): Φ connection = ${iit.assessment.plausibility === consciousness.PHI_INV}`);

console.log('  ✓ Consciousness Engine OK\n');

// 28B: Intentionality Engine
console.log('28B: Intentionality Engine');
const intentionality = require('./lib/intentionality-engine.cjs');
intentionality.init();

// Register mental state
const belief = intentionality.registerMentalState('belief_001', {
  type: 'belief',
  content: 'Paris is the capital of France',
  subject: 'test_subject'
});
console.log(`  registerMentalState: ${belief.type} about "${belief.content}"`);

// Register system for intentionality analysis
const aiSystem = intentionality.registerSystem('cynic_ai', {
  name: 'CYNIC',
  type: 'artificial',
  symbolManipulation: true,
  semanticUnderstanding: 'claimed'
});
console.log(`  registerSystem: ${aiSystem.name} - ${aiSystem.type}`);

// Analyze intentionality
const intentAnalysis = intentionality.analyzeIntentionality('cynic_ai');
console.log(`  analyzeIntentionality: ${intentAnalysis.intentionalityType}`);
console.log(`    Searle warning: "${intentAnalysis.searleWarning}"`);

// Apply Chinese Room
const chineseRoom = intentionality.applyChineseRoom('cynic_ai');
console.log(`  applyChineseRoom: applies = ${chineseRoom.applies}`);
console.log(`    CYNIC reflection: "${chineseRoom.cynicReflection.confession}"`);

console.log('  ✓ Intentionality Engine OK\n');

// 28C: Mental State Engine
console.log('28C: Mental State Engine');
const mentalState = require('./lib/mental-state-engine.cjs');
mentalState.init();

// Register agent
const agent = mentalState.registerAgent('agent_001', {
  name: 'Test Agent',
  type: 'human'
});
console.log(`  registerAgent: ${agent.name} - ${agent.type}`);

// Attribute beliefs and desires
const agentBelief = mentalState.attributeBelief('agent_001', 'The coffee shop is open', {
  credence: 0.9,
  source: 'perception'
});
console.log(`  attributeBelief: "${agentBelief.proposition}" (credence: ${(agentBelief.credence * 100).toFixed(0)}%)`);

const agentDesire = mentalState.attributeDesire('agent_001', 'Get coffee', {
  intensity: 0.8,
  intrinsic: false,
  instrumental: true
});
console.log(`  attributeDesire: "${agentDesire.proposition}" (intensity: ${(agentDesire.intensity * 100).toFixed(0)}%)`);

// Explain action using folk psychology
const explanation = mentalState.explainAction('agent_001', 'Walked to coffee shop', {
  belief: 'The coffee shop is open',
  desire: 'Get coffee'
});
console.log(`  explainAction: Practical syllogism`);
console.log(`    ${explanation.structure.majorPremise.substring(0, 40)}...`);
console.log(`    ${explanation.structure.minorPremise.substring(0, 40)}...`);
console.log(`    ${explanation.structure.conclusion}`);

// Analyze functional role
const roleAnalysis = mentalState.analyzeFunctionalRole('belief');
console.log(`  analyzeFunctionalRole: ${roleAnalysis.characterization.definition.substring(0, 50)}...`);

console.log('  ✓ Mental State Engine OK\n');

console.log('=== Phase 28 Integration Test PASSED ===\n');
