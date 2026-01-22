#!/usr/bin/env node

/**
 * Problem of Evil Engine - Phase 34B
 * 
 * The problem of evil and theodicies:
 * - Logical problem of evil (Mackie)
 * - Evidential problem of evil (Rowe)
 * - Theodicies (free will, soul-making, greater good)
 * - Defenses (Plantinga's free will defense)
 * 
 * φ-bounded: max 61.8% confidence
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// State
const state = {
  initialized: false,
  problems: new Map(),
  theodicies: new Map(),
  defenses: new Map(),
  analyses: [],
  stats: {
    problemsRegistered: 0,
    theodiciesRegistered: 0,
    defensesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'evil-engine');

/**
 * Initialize evil engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '34B' };
  }
  
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  // Register problems, theodicies, and defenses
  registerProblems();
  registerTheodicies();
  registerDefenses();
  
  state.initialized = true;
  return { status: 'initialized', phase: '34B', engine: 'problem-of-evil' };
}

/**
 * Register the problems of evil
 */
function registerProblems() {
  state.problems.set('logical', {
    name: 'Logical Problem of Evil',
    philosopher: 'J.L. Mackie',
    year: 1955,
    type: 'deductive',
    argument: {
      premises: [
        'God is omnipotent (can do anything logically possible)',
        'God is omniscient (knows everything)',
        'God is omnibenevolent (perfectly good)',
        'Evil exists'
      ],
      claim: 'These four propositions are logically inconsistent',
      additionalPremises: [
        'A good being always eliminates evil as far as it can',
        'An omnipotent being can eliminate all evil',
        'An omniscient being knows how to eliminate all evil'
      ],
      conclusion: 'Therefore, God does not exist'
    },
    status: 'largely-considered-refuted',
    refutation: 'Plantinga\'s Free Will Defense shows logical consistency is possible',
    strength: PHI_INV_3 // Weakened by free will defense
  });
  
  state.problems.set('evidential', {
    name: 'Evidential Problem of Evil',
    philosopher: 'William Rowe',
    year: 1979,
    type: 'inductive',
    argument: {
      premises: [
        'There exist instances of intense suffering that an omnipotent, omniscient being could have prevented without losing some greater good',
        'An omniscient, wholly good being would prevent any such suffering',
        'Therefore, there does not exist an omnipotent, omniscient, wholly good being'
      ],
      keyExample: 'A fawn dying in agony in a forest fire, unseen by anyone',
      question: 'What possible greater good could justify this?'
    },
    status: 'still-debated',
    responses: ['Skeptical theism', 'Unknown greater goods', 'Afterlife compensation'],
    strength: PHI_INV // Still considered formidable
  });
  
  state.problems.set('hiddenness', {
    name: 'Divine Hiddenness',
    philosopher: 'J.L. Schellenberg',
    year: 1993,
    type: 'evidential',
    argument: {
      premises: [
        'If God exists, God is perfectly loving',
        'A perfectly loving God would ensure all capable persons believe in God',
        'Some capable persons do not believe in God (nonresistant nonbelievers)',
        'Therefore, God does not exist'
      ],
      keyPoint: 'Reasonable nonbelief exists, which a loving God would prevent'
    },
    status: 'actively-debated',
    responses: ['Free will requires epistemic distance', 'Divine reasons beyond our ken'],
    strength: PHI_INV_2
  });
  
  state.problems.set('natural-evil', {
    name: 'Problem of Natural Evil',
    philosopher: 'Various',
    type: 'specific',
    argument: {
      claim: 'Natural disasters, disease, and animal suffering cannot be explained by free will',
      examples: ['Earthquakes', 'Cancer', 'Predation', 'Parasites'],
      challenge: 'These evils predate humans and are not caused by human free will'
    },
    status: 'challenging',
    responses: ['Natural law theodicy', 'Soul-making', 'Fallen angels'],
    strength: PHI_INV
  });
  
  state.stats.problemsRegistered = state.problems.size;
}

/**
 * Register theodicies
 */
function registerTheodicies() {
  state.theodicies.set('free-will', {
    name: 'Free Will Theodicy',
    philosopher: 'Augustine / Plantinga',
    claim: 'God permits evil because free will is a greater good',
    argument: {
      premises: [
        'Free will is a great good',
        'Free will requires the genuine possibility of choosing evil',
        'God cannot create free beings guaranteed to always choose good',
        'The value of free will outweighs the evil it produces'
      ],
      scope: 'Explains moral evil (human-caused suffering)'
    },
    objections: [
      'Why not create beings who freely always choose good?',
      'Does not explain natural evil',
      'Is free will worth the Holocaust?'
    ],
    strength: PHI_INV
  });
  
  state.theodicies.set('soul-making', {
    name: 'Soul-Making Theodicy',
    philosopher: 'John Hick',
    year: 1966,
    claim: 'Evil exists to allow moral and spiritual development',
    argument: {
      premises: [
        'God\'s purpose is to develop mature moral agents',
        'Moral development requires challenges and suffering',
        'A world without evil would be a "hedonistic paradise" with no growth',
        'This process continues into afterlife for completion'
      ],
      scope: 'Explains both moral and natural evil'
    },
    objections: [
      'Why so much suffering? Surely less would suffice',
      'What about those who die young?',
      'Animal suffering serves no soul-making purpose'
    ],
    strength: PHI_INV_2
  });
  
  state.theodicies.set('greater-good', {
    name: 'Greater Good Theodicy',
    philosopher: 'Leibniz',
    year: 1710,
    claim: 'This is the best of all possible worlds',
    argument: {
      premises: [
        'God chose to create the best possible world',
        'Some evil may be necessary for greater goods',
        'We cannot see the full picture of how evils contribute to goods',
        'The total good outweighs the total evil'
      ],
      keyIdea: 'Interconnected goods may require apparent evils'
    },
    objections: [
      'Voltaire\'s Candide ridicule',
      'Surely a better world is conceivable',
      'Some evils seem gratuitous'
    ],
    strength: PHI_INV_3
  });
  
  state.theodicies.set('natural-law', {
    name: 'Natural Law Theodicy',
    philosopher: 'Richard Swinburne',
    claim: 'Regular natural laws are necessary for meaningful action',
    argument: {
      premises: [
        'Meaningful free action requires predictable consequences',
        'Predictable consequences require regular natural laws',
        'Regular natural laws sometimes produce suffering (earthquakes, disease)',
        'This is an acceptable cost for a world where free action is possible'
      ],
      scope: 'Addresses natural evil specifically'
    },
    objections: [
      'Could God not intervene more often?',
      'Why such destructive laws?',
      'Quantum indeterminacy suggests alternatives'
    ],
    strength: PHI_INV_2
  });
  
  state.stats.theodiciesRegistered = state.theodicies.size;
}

/**
 * Register defenses (vs theodicies)
 */
function registerDefenses() {
  state.defenses.set('free-will-defense', {
    name: 'Plantinga\'s Free Will Defense',
    philosopher: 'Alvin Plantinga',
    year: 1974,
    type: 'defense',
    purpose: 'Show logical problem of evil fails (not explain why evil exists)',
    argument: {
      keyMove: 'It is possible that God could not create a world with free creatures who never do wrong',
      concept: 'Transworld depravity - in every world, free creatures go wrong at least once',
      conclusion: 'God and evil are logically compatible',
      scope: 'Modest goal: logical consistency, not explanation'
    },
    distinction: 'Defense shows possibility; theodicy claims actuality',
    reception: 'Widely considered successful against logical problem',
    strength: PHI_INV
  });
  
  state.defenses.set('skeptical-theism', {
    name: 'Skeptical Theism',
    philosopher: 'Various (Wykstra, Bergmann)',
    type: 'defense',
    purpose: 'Undercut evidential problem by questioning our ability to assess God\'s reasons',
    argument: {
      keyMove: 'We are not in a position to judge whether evils are gratuitous',
      reasons: [
        'God\'s reasons may be beyond our cognitive grasp',
        'We cannot survey all possible goods',
        'Our sample of goods and evils is limited'
      ],
      analogy: 'A child cannot understand adult reasons'
    },
    objections: [
      'Leads to moral paralysis (we can\'t trust our moral judgments)',
      'Makes God\'s goodness meaningless',
      'Ad hoc skepticism'
    ],
    strength: PHI_INV_2
  });
  
  state.stats.defensesRegistered = state.defenses.size;
}

/**
 * Get a problem by ID
 */
function getProblem(problemId) {
  return state.problems.get(problemId) || null;
}

/**
 * Get a theodicy by ID
 */
function getTheodicy(theodicyId) {
  return state.theodicies.get(theodicyId) || null;
}

/**
 * Get a defense by ID
 */
function getDefense(defenseId) {
  return state.defenses.get(defenseId) || null;
}

/**
 * List all problems
 */
function listProblems() {
  return Array.from(state.problems.entries()).map(([id, p]) => ({ id, ...p }));
}

/**
 * List all theodicies
 */
function listTheodicies() {
  return Array.from(state.theodicies.entries()).map(([id, t]) => ({ id, ...t }));
}

/**
 * Analyze the problem of evil
 */
function analyzeEvil(options = {}) {
  state.stats.analysesPerformed++;
  
  const evilType = options.type || 'moral'; // moral, natural, or both
  const intensity = options.intensity || 'severe'; // mild, moderate, severe
  const seemsGratuitous = options.gratuitous !== false; // does it seem purposeless?
  
  // Calculate challenge strength
  let challengeStrength = PHI_INV_2;
  if (intensity === 'severe') challengeStrength += 0.1;
  if (seemsGratuitous) challengeStrength += 0.1;
  if (evilType === 'natural') challengeStrength += 0.05; // harder to explain
  challengeStrength = Math.min(challengeStrength, PHI_INV);
  
  // Find applicable responses
  const applicableResponses = [];
  
  if (evilType === 'moral' || evilType === 'both') {
    applicableResponses.push({
      response: 'Free Will Theodicy',
      effectiveness: PHI_INV_2,
      note: 'Addresses moral evil via value of free will'
    });
  }
  
  if (evilType === 'natural' || evilType === 'both') {
    applicableResponses.push({
      response: 'Natural Law Theodicy',
      effectiveness: PHI_INV_3,
      note: 'Regular laws necessary for meaningful action'
    });
  }
  
  applicableResponses.push({
    response: 'Soul-Making Theodicy',
    effectiveness: PHI_INV_2,
    note: 'Suffering enables moral growth'
  });
  
  if (seemsGratuitous) {
    applicableResponses.push({
      response: 'Skeptical Theism',
      effectiveness: PHI_INV_2,
      note: 'We cannot know if truly gratuitous'
    });
  }
  
  const analysis = {
    evilType,
    intensity,
    seemsGratuitous,
    challengeStrength,
    applicableResponses,
    bestResponse: applicableResponses.reduce((a, b) => a.effectiveness > b.effectiveness ? a : b),
    overallAssessment: challengeStrength > PHI_INV_2 ? 'Serious challenge requiring sophisticated response' : 'Manageable with available theodicies',
    confidence: PHI_INV_3,
    cynicNote: '*sniff* The problem of evil has no knock-down solution. Both sides have moves.'
  };
  
  state.analyses.push(analysis);
  return analysis;
}

/**
 * Compare theodicies
 */
function compareTheodicies() {
  const theodicies = Array.from(state.theodicies.values());
  
  return {
    comparison: theodicies.map(t => ({
      name: t.name,
      scope: t.argument?.scope || 'General',
      strength: t.strength,
      mainObjection: t.objections?.[0] || 'Various'
    })),
    ranking: theodicies.sort((a, b) => b.strength - a.strength).map(t => t.name),
    recommendation: 'Cumulative approach: combine multiple theodicies',
    cynicAdvice: 'No single theodicy is universally compelling. Epistemic humility required.',
    confidence: PHI_INV_2
  };
}

/**
 * Analyze types of evil
 */
function analyzeEvilTypes() {
  return {
    moralEvil: {
      definition: 'Evil caused by free agents',
      examples: ['Murder', 'Theft', 'Cruelty', 'Oppression'],
      primaryResponse: 'Free Will Theodicy',
      difficulty: 'Moderate'
    },
    naturalEvil: {
      definition: 'Evil caused by natural processes',
      examples: ['Earthquakes', 'Disease', 'Predation', 'Famine'],
      primaryResponse: 'Natural Law / Soul-Making Theodicy',
      difficulty: 'High'
    },
    horrendousEvil: {
      definition: 'Evil so severe it seems to destroy meaning (Marilyn Adams)',
      examples: ['Holocaust', 'Child torture', 'Genocide'],
      primaryResponse: 'Afterlife theodicy / Divine solidarity',
      difficulty: 'Very High'
    },
    distributionProblem: {
      question: 'Why do innocents suffer while wicked prosper?',
      responses: ['Afterlife justice', 'Unknown purposes', 'Soul-making'],
      difficulty: 'High'
    },
    cynicObservation: 'The varieties of evil each pose distinct challenges. One-size-fits-all theodicies struggle.'
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  PROBLEM OF EVIL ENGINE                  Phase 34B     │
├─────────────────────────────────────────────────────────┤
│  Problems Registered: ${String(state.stats.problemsRegistered).padStart(3)}                            │
│  Theodicies: ${String(state.stats.theodiciesRegistered).padStart(3)}                                    │
│  Defenses: ${String(state.stats.defensesRegistered).padStart(3)}                                      │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Key Problems:                                          │
│    - Logical (Mackie): Largely refuted                  │
│    - Evidential (Rowe): Still debated                   │
│    - Hiddenness: Active research                        │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *head tilt* Evil puzzles both theists and atheists     │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    problems: state.stats.problemsRegistered,
    theodicies: state.stats.theodiciesRegistered,
    defenses: state.stats.defensesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getProblem,
  getTheodicy,
  getDefense,
  listProblems,
  listTheodicies,
  analyzeEvil,
  compareTheodicies,
  analyzeEvilTypes,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
