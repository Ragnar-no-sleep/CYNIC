#!/usr/bin/env node

/**
 * Critical Theory Engine - Phase 38C
 *
 * Frankfurt School critical theory:
 * - Adorno & Horkheimer: Dialectic of Enlightenment
 * - Marcuse: One-Dimensional Man
 * - Habermas: Communicative Rationality
 * - Culture industry, domination, emancipation
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
  thinkers: new Map(),
  concepts: new Map(),
  critiques: new Map(),
  analyses: [],
  stats: {
    thinkersRegistered: 0,
    conceptsRegistered: 0,
    critiquesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'critical-theory-engine');

/**
 * Initialize critical theory engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '38C' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerThinkers();
  registerConcepts();
  registerCritiques();

  state.initialized = true;
  return { status: 'initialized', phase: '38C', engine: 'critical-theory' };
}

/**
 * Register Frankfurt School thinkers
 */
function registerThinkers() {
  state.thinkers.set('adorno', {
    name: 'Theodor W. Adorno',
    dates: '1903-1969',
    role: 'Co-founder of Frankfurt School critical theory',
    keyWorks: ['Dialectic of Enlightenment', 'Negative Dialectics', 'Minima Moralia', 'Aesthetic Theory'],
    centralIdeas: [
      'Dialectic of Enlightenment (with Horkheimer)',
      'Culture industry',
      'Negative dialectics',
      'Critique of identity thinking',
      'Art as refuge of truth'
    ],
    quotes: [
      'To write poetry after Auschwitz is barbaric',
      'The whole is the false',
      'Wrong life cannot be lived rightly'
    ],
    strength: PHI_INV
  });

  state.thinkers.set('horkheimer', {
    name: 'Max Horkheimer',
    dates: '1895-1973',
    role: 'Director of Institute for Social Research',
    keyWorks: ['Dialectic of Enlightenment', 'Eclipse of Reason', 'Traditional and Critical Theory'],
    centralIdeas: [
      'Critical vs traditional theory',
      'Instrumental reason',
      'Eclipse of reason',
      'Domination of nature leads to domination of humans'
    ],
    distinction: 'Distinguished traditional (descriptive) from critical (emancipatory) theory',
    strength: PHI_INV
  });

  state.thinkers.set('marcuse', {
    name: 'Herbert Marcuse',
    dates: '1898-1979',
    role: 'Critical theorist, influence on New Left',
    keyWorks: ['One-Dimensional Man', 'Eros and Civilization', 'Reason and Revolution'],
    centralIdeas: [
      'One-dimensional society',
      'Repressive tolerance',
      'Great Refusal',
      'Technological rationality as domination',
      'Liberation through Eros'
    ],
    influence: 'Major influence on 1960s student movements',
    strength: PHI_INV
  });

  state.thinkers.set('habermas', {
    name: 'Jürgen Habermas',
    dates: '1929-present',
    role: 'Second generation Frankfurt School',
    keyWorks: ['Theory of Communicative Action', 'Knowledge and Human Interests', 'Between Facts and Norms'],
    centralIdeas: [
      'Communicative rationality',
      'Ideal speech situation',
      'Lifeworld vs system',
      'Discourse ethics',
      'Public sphere'
    ],
    shift: 'Moved from critique of reason to reconstruction of reason',
    distinction: 'More optimistic than first generation',
    strength: PHI_INV
  });

  state.thinkers.set('benjamin', {
    name: 'Walter Benjamin',
    dates: '1892-1940',
    role: 'Associated with Frankfurt School',
    keyWorks: ['The Work of Art in the Age of Mechanical Reproduction', 'Theses on the Philosophy of History', 'The Arcades Project'],
    centralIdeas: [
      'Aura and mechanical reproduction',
      'Dialectical image',
      'Historical materialism and messianism',
      'Angel of history'
    ],
    quote: 'There is no document of civilization which is not at the same time a document of barbarism',
    strength: PHI_INV_2
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Register critical theory concepts
 */
function registerConcepts() {
  state.concepts.set('dialectic-enlightenment', {
    name: 'Dialectic of Enlightenment',
    authors: 'Adorno & Horkheimer',
    thesis: 'Enlightenment, meant to liberate, becomes new form of domination',
    structure: {
      myth: 'Myth was already enlightenment (attempt to control nature)',
      enlightenment: 'Enlightenment reverts to mythology (blind domination)',
      dialectic: 'Reason, in conquering nature, conquers and represses itself'
    },
    implications: [
      'Progress is not linear liberation',
      'Instrumental reason dominates inner and outer nature',
      'The administered society results',
      'Fascism is extreme form of this dialectic'
    ],
    quote: 'Myth is already enlightenment, and enlightenment reverts to mythology',
    strength: PHI_INV
  });

  state.concepts.set('culture-industry', {
    name: 'Culture Industry',
    authors: 'Adorno & Horkheimer',
    meaning: 'Mass culture as system of domination',
    characteristics: [
      'Standardization masquerading as individuality',
      'Entertainment as distraction from domination',
      'False needs created by capitalism',
      'Art reduced to commodity'
    ],
    effects: [
      'Passive consumption replaces active thought',
      'Pseudo-individualization',
      'Integration of masses into system',
      'Foreclosure of critical consciousness'
    ],
    examples: ['Hollywood films', 'Pop music', 'Advertising'],
    contrast: 'Authentic art preserves negativity and utopian promise',
    strength: PHI_INV
  });

  state.concepts.set('instrumental-reason', {
    name: 'Instrumental Reason',
    german: 'Instrumentelle Vernunft',
    meaning: 'Reason reduced to means-end calculation',
    characteristics: [
      'Focuses only on efficiency, not ends',
      'Treats everything as means, nothing as end',
      'Dominates nature and humans',
      'Eclipse of substantive reason'
    ],
    critique: 'Reason becomes unreasonable when it cannot question ends',
    horkheimer: 'Eclipse of reason: subjective reason replaces objective reason',
    strength: PHI_INV
  });

  state.concepts.set('one-dimensional', {
    name: 'One-Dimensional Society',
    author: 'Marcuse',
    meaning: 'Society that eliminates opposition and critical thought',
    mechanisms: [
      'Technological rationality',
      'Repressive tolerance',
      'False consciousness through affluence',
      'Absorption of negation'
    ],
    oneDimensionalMan: 'Individual who identifies with the system, loses critical capacity',
    resistance: 'Great Refusal: rejection of the system from margins',
    quote: 'A comfortable, smooth, reasonable, democratic unfreedom prevails',
    strength: PHI_INV
  });

  state.concepts.set('communicative-rationality', {
    name: 'Communicative Rationality',
    author: 'Habermas',
    meaning: 'Reason embedded in communication aimed at mutual understanding',
    contrast: 'Distinguished from instrumental/strategic rationality',
    characteristics: [
      'Oriented to understanding, not success',
      'Raises validity claims (truth, rightness, sincerity)',
      'Redeemable through argumentation',
      'Intersubjective, not subject-centered'
    ],
    idealSpeechSituation: {
      conditions: [
        'All affected can participate',
        'Equal voice',
        'No coercion',
        'Only force of better argument'
      ],
      status: 'Counterfactual presupposition of discourse'
    },
    strength: PHI_INV
  });

  state.concepts.set('lifeworld-system', {
    name: 'Lifeworld and System',
    author: 'Habermas',
    lifeworld: {
      definition: 'Background of shared meanings, norms, identities',
      medium: 'Communicative action',
      functions: 'Cultural reproduction, social integration, socialization'
    },
    system: {
      definition: 'Functional subsystems (economy, state)',
      media: 'Money and power',
      logic: 'Instrumental rationality'
    },
    colonization: 'System colonizes lifeworld when money/power replace communication',
    pathology: 'Loss of meaning, anomie, psychopathology',
    strength: PHI_INV
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register critical theory critiques
 */
function registerCritiques() {
  state.critiques.set('capitalism', {
    name: 'Critique of Capitalism',
    approach: 'Marxist roots, but extended beyond economics',
    dimensions: [
      'Economic exploitation',
      'Cultural domination (culture industry)',
      'Psychological repression',
      'Environmental destruction'
    ],
    firstGen: 'Capitalism produces administered society, forecloses alternatives',
    habermas: 'Capitalism colonizes lifeworld with system imperatives',
    strength: PHI_INV
  });

  state.critiques.set('positivism', {
    name: 'Critique of Positivism',
    target: 'Claim that only scientific knowledge is valid',
    arguments: [
      'Positivism is ideology masquerading as science',
      'Facts are not value-free',
      'Science serves domination when uncritical',
      'Eliminates normative questions'
    ],
    habermas: 'Knowledge-constitutive interests: technical, practical, emancipatory',
    alternative: 'Critical theory: knowledge for emancipation',
    strength: PHI_INV
  });

  state.critiques.set('mass-society', {
    name: 'Critique of Mass Society',
    concerns: [
      'Conformity and loss of individuality',
      'Manipulation through media',
      'Decline of public sphere',
      'Authoritarian potential'
    ],
    cultureIndustry: 'Mass culture produces passive, manipulable subjects',
    habermas: 'Refeudalisation of public sphere',
    strength: PHI_INV_2
  });

  state.critiques.set('technology', {
    name: 'Critique of Technology',
    position: 'Technology is not neutral but embodies social relations',
    marcuse: 'Technological rationality is political rationality',
    arguments: [
      'Technology as ideology',
      'Efficiency masks domination',
      'Alternative technologies possible',
      'Liberation requires transformation of technology'
    ],
    habermas: 'More nuanced: technology can serve lifeworld or system',
    strength: PHI_INV_2
  });

  state.stats.critiquesRegistered = state.critiques.size;
}

/**
 * Get a thinker
 */
function getThinker(thinkerId) {
  return state.thinkers.get(thinkerId) || null;
}

/**
 * Get a concept
 */
function getConcept(conceptId) {
  return state.concepts.get(conceptId) || null;
}

/**
 * Get a critique
 */
function getCritique(critiqueId) {
  return state.critiques.get(critiqueId) || null;
}

/**
 * List all thinkers
 */
function listThinkers() {
  return Array.from(state.thinkers.entries()).map(([id, t]) => ({ id, ...t }));
}

/**
 * Analyze social phenomenon critically
 */
function analyzeCritically(phenomenon) {
  state.stats.analysesPerformed++;

  return {
    phenomenon,
    firstGeneration: {
      dialectic: 'How does this embody the dialectic of enlightenment?',
      cultureIndustry: 'How does this serve domination through culture?',
      instrumental: 'Is reason here reduced to means-end calculation?',
      domination: 'Who benefits? Who is dominated?'
    },
    marcuse: {
      oneDimensional: 'Does this flatten opposition and alternatives?',
      repressiveTolerance: 'Is tolerance here used to absorb critique?',
      greatRefusal: 'What would genuine resistance look like?'
    },
    habermas: {
      communicative: 'Is this oriented to understanding or success?',
      colonization: 'Is the lifeworld being colonized here?',
      publicSphere: 'Does this enable or disable democratic discourse?'
    },
    questions: {
      ideology: 'What interests does this serve?',
      alternatives: 'What alternatives are foreclosed?',
      emancipation: 'What would emancipation from this look like?'
    },
    cynicNote: '*sniff* Critical theory asks: whose interests? What is hidden? What could be otherwise?',
    confidence: PHI_INV_2
  };
}

/**
 * Compare first and second generation
 */
function compareGenerations() {
  return {
    question: 'Can reason be redeemed?',
    firstGeneration: {
      thinkers: 'Adorno, Horkheimer, Marcuse',
      position: 'Pessimistic: reason is thoroughly compromised',
      diagnosis: 'Enlightenment is totalitarian',
      solution: 'Negative dialectics, aesthetic refuge, Great Refusal'
    },
    secondGeneration: {
      thinkers: 'Habermas',
      position: 'More optimistic: communicative reason offers hope',
      diagnosis: 'Instrumental reason is only one form of reason',
      solution: 'Reconstruct reason through communicative action'
    },
    tension: 'Is Habermas abandoning the radical critique, or saving it?',
    cynicObservation: '*head tilt* One generation sees no exit; another sees democracy. Both see domination.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  CRITICAL THEORY ENGINE                  Phase 38C      │
├─────────────────────────────────────────────────────────┤
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                      │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                      │
│  Critiques: ${String(state.stats.critiquesRegistered).padStart(3)}                                     │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Key Figures:                                           │
│    - Adorno & Horkheimer (dialectic)                    │
│    - Marcuse (one-dimensional)                          │
│    - Habermas (communicative reason)                    │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *GROWL* The whole is the false                         │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    thinkers: state.stats.thinkersRegistered,
    concepts: state.stats.conceptsRegistered,
    critiques: state.stats.critiquesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getThinker,
  getConcept,
  getCritique,
  listThinkers,
  analyzeCritically,
  compareGenerations,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
