#!/usr/bin/env node

/**
 * Process Philosophy Engine - Phase 42B
 *
 * Process philosophy:
 * - Alfred North Whitehead (process and reality)
 * - Henri Bergson (duration, élan vital)
 * - Process metaphysics
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
  categories: new Map(),
  applications: new Map(),
  analyses: [],
  stats: {
    thinkersRegistered: 0,
    conceptsRegistered: 0,
    categoriesRegistered: 0,
    applicationsRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'process-philosophy-engine');

/**
 * Initialize process philosophy engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '42B' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerThinkers();
  registerConcepts();
  registerCategories();
  registerApplications();

  state.initialized = true;
  return { status: 'initialized', phase: '42B', engine: 'process-philosophy' };
}

/**
 * Register process philosophers
 */
function registerThinkers() {
  state.thinkers.set('whitehead', {
    name: 'Alfred North Whitehead',
    dates: '1861-1947',
    role: 'Founder of process philosophy',
    keyWorks: [
      'Process and Reality (1929)',
      'Science and the Modern World (1925)',
      'Adventures of Ideas (1933)'
    ],
    centralThesis: 'Reality consists of processes, not substances',
    contribution: {
      metaphysics: 'Process and Reality: speculative philosophy of organism',
      mathematics: 'Principia Mathematica (with Russell)',
      physics: 'Philosophy of nature and relativity'
    },
    againstSubstance: 'Rejected Aristotelian substance metaphysics',
    motto: 'The safest general characterization of the European philosophical tradition is that it consists of a series of footnotes to Plato',
    strength: PHI_INV
  });

  state.thinkers.set('bergson', {
    name: 'Henri Bergson',
    dates: '1859-1941',
    role: 'Process philosophy, vitalism',
    keyWorks: [
      'Time and Free Will (1889)',
      'Matter and Memory (1896)',
      'Creative Evolution (1907)'
    ],
    centralThesis: 'Duration (durée) is the fundamental reality',
    concepts: {
      duree: 'Lived time, qualitative and continuous',
      elanVital: 'Creative life force driving evolution',
      intuition: 'Direct knowledge of duration, vs. intellect'
    },
    againstMechanism: 'Rejected mechanistic view of life and mind',
    nobleePrize: 'Nobel Prize in Literature (1927)',
    strength: PHI_INV
  });

  state.thinkers.set('hartshorne', {
    name: 'Charles Hartshorne',
    dates: '1897-2000',
    role: 'Process theology',
    keyIdeas: [
      'Neoclassical theism',
      'God as dipolar',
      'Panentheism',
      'Social theory of reality'
    ],
    processTheology: 'God is affected by world; grows through creation',
    dipolarGod: {
      primordial: 'Eternal, unchanging possibilities',
      consequent: 'Temporal, affected by world'
    },
    ontologicalArgument: 'Revived modal ontological argument',
    strength: PHI_INV_2
  });

  state.thinkers.set('james-process', {
    name: 'William James',
    dates: '1842-1910',
    role: 'Process elements in pragmatism',
    relevant: [
      'Radical empiricism',
      'Stream of consciousness',
      'Pluralistic universe'
    ],
    processAspect: 'Reality is in flux; experience is a stream',
    influence: 'Influenced Whitehead\'s process thought',
    strength: PHI_INV_2
  });

  state.thinkers.set('teilhard', {
    name: 'Pierre Teilhard de Chardin',
    dates: '1881-1955',
    role: 'Process cosmology and theology',
    keyIdeas: [
      'Omega Point',
      'Noosphere',
      'Cosmogenesis',
      'Christogenesis'
    ],
    vision: 'Evolution converging toward divine consciousness',
    controversial: 'Catholic Church initially suppressed his work',
    strength: PHI_INV_2
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Register process concepts
 */
function registerConcepts() {
  state.concepts.set('actual-occasion', {
    name: 'Actual Occasion',
    author: 'Whitehead',
    definition: 'The basic unit of reality; a moment of experience',
    characteristics: [
      'Atomic: basic building blocks',
      'Experiential: involves feeling',
      'Temporal: has beginning and end',
      'Relational: constituted by relations to others'
    ],
    process: 'Each occasion "becomes" through prehension of past occasions',
    perishing: 'Once complete, becomes data for future occasions',
    contrastSubstance: 'Not enduring substance but momentary event',
    strength: PHI_INV
  });

  state.concepts.set('prehension', {
    name: 'Prehension',
    author: 'Whitehead',
    definition: 'The process by which an actual occasion appropriates other entities',
    types: {
      positive: 'Feeling; incorporating data into experience',
      negative: 'Excluding; what is not taken into account'
    },
    physical: 'Prehending other actual occasions',
    conceptual: 'Prehending eternal objects (forms/universals)',
    constitution: 'Subject constituted by its prehensions',
    strength: PHI_INV
  });

  state.concepts.set('eternal-object', {
    name: 'Eternal Object',
    author: 'Whitehead',
    definition: 'Pure potential; forms that can be realized in actual occasions',
    analogies: {
      plato: 'Like Platonic forms',
      aristotle: 'Like Aristotelian universals'
    },
    role: 'Provide definiteness to actual occasions',
    ingression: 'Eternal objects "ingress" into occasions, giving them character',
    examples: 'Redness, squareness, mathematical forms',
    strength: PHI_INV
  });

  state.concepts.set('duration', {
    name: 'Duration (Durée)',
    author: 'Bergson',
    definition: 'Lived, qualitative time as opposed to spatialized clock time',
    characteristics: [
      'Continuous, not discrete',
      'Qualitative, not quantitative',
      'Heterogeneous: each moment unique',
      'Creative: genuinely novel'
    ],
    contrast: {
      scientific: 'Science spatializes time into discrete instants',
      lived: 'We experience time as continuous flow'
    },
    access: 'Known through intuition, not intellect',
    strength: PHI_INV
  });

  state.concepts.set('creativity', {
    name: 'Creativity',
    author: 'Whitehead',
    definition: 'The ultimate principle by which many become one and are increased by one',
    role: 'The category of the ultimate',
    process: 'Each actual occasion is a novel synthesis, adding to reality',
    notSubstance: 'Creativity is not a being but the principle of becoming',
    analogies: {
      aristotle: 'Like prime matter but active',
      kant: 'Like synthetic unity but metaphysical'
    },
    strength: PHI_INV
  });

  state.concepts.set('concrescence', {
    name: 'Concrescence',
    author: 'Whitehead',
    definition: 'The process by which an actual occasion comes to be',
    phases: [
      'Initial aim: derived from God\'s primordial nature',
      'Physical pole: prehension of past actual occasions',
      'Mental pole: prehension of eternal objects',
      'Satisfaction: final unity of the occasion'
    ],
    becoming: 'Process of "growing together" (con-crescere)',
    novelty: 'Each concrescence adds something genuinely new',
    strength: PHI_INV
  });

  state.concepts.set('nexus', {
    name: 'Nexus',
    author: 'Whitehead',
    definition: 'A group of actual occasions with some unity',
    types: {
      society: 'Nexus with defining characteristic inherited across occasions',
      corpuscular: 'Enduring object (like a proton)',
      living: 'Societies with novelty and complex order'
    },
    persistence: 'What we call "things" are really societies of occasions',
    personal: 'A person is a society with serial order',
    strength: PHI_INV_2
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register Whitehead's categories
 */
function registerCategories() {
  state.categories.set('ultimate', {
    name: 'Category of the Ultimate',
    elements: ['Creativity', 'Many', 'One'],
    creativity: 'The principle of novelty',
    many: 'The disjunctive diversity of the universe',
    one: 'The conjunctive unity produced',
    principle: 'Many become one, and are increased by one',
    strength: PHI_INV
  });

  state.categories.set('existence', {
    name: 'Categories of Existence',
    count: 8,
    categories: [
      'Actual entities (actual occasions)',
      'Prehensions',
      'Nexūs',
      'Subjective forms',
      'Eternal objects',
      'Propositions',
      'Multiplicities',
      'Contrasts'
    ],
    principle: 'Everything real falls under one of these categories',
    strength: PHI_INV
  });

  state.categories.set('explanation', {
    name: 'Categoreal Obligations',
    description: 'Rules governing how categories relate',
    examples: [
      'Principle of relativity: every entity is a potential for every becoming',
      'Principle of process: becoming constitutes being',
      'Ontological principle: no reason except in actual entities'
    ],
    strength: PHI_INV_2
  });

  state.categories.set('god', {
    name: 'God in Process Philosophy',
    whitehead: {
      primordial: 'God\'s conceptual valuation of eternal objects',
      consequent: 'God\'s prehension of actual occasions',
      superjective: 'God\'s influence on the world'
    },
    notOmnipotent: 'God persuades, does not coerce',
    notImmutable: 'God is affected by the world; evolves',
    panentheism: 'World is in God; God is in world',
    strength: PHI_INV
  });

  state.stats.categoriesRegistered = state.categories.size;
}

/**
 * Register applications of process philosophy
 */
function registerApplications() {
  state.applications.set('theology', {
    name: 'Process Theology',
    figures: ['Hartshorne', 'Cobb', 'Griffin'],
    keyIdeas: {
      dipolarGod: 'God has both eternal and temporal aspects',
      panentheism: 'All things in God, God in all things',
      theodicy: 'God cannot prevent evil; persuasion, not coercion'
    },
    advantage: 'Takes seriously divine responsiveness to creation',
    criticism: 'Is a limited God really God?',
    strength: PHI_INV
  });

  state.applications.set('ecology', {
    name: 'Process Ecology',
    thesis: 'Process thought supports ecological worldview',
    connections: {
      relationality: 'All things interconnected',
      intrinsicValue: 'Each occasion has value for itself',
      holism: 'Wholes are more than parts'
    },
    figures: ['John Cobb', 'David Ray Griffin'],
    practical: 'Supports environmental ethics',
    strength: PHI_INV_2
  });

  state.applications.set('physics', {
    name: 'Process Philosophy and Physics',
    whitehead: 'Developed in dialogue with Einstein and quantum physics',
    connections: {
      relativity: 'Process thought compatible with spacetime',
      quantum: 'Discrete occasions like quantum events',
      fields: 'Societies of occasions like fields'
    },
    interpretations: 'Some see process as framework for quantum mechanics',
    strength: PHI_INV_2
  });

  state.applications.set('psychology', {
    name: 'Process Psychology',
    thesis: 'Mind is process, not substance',
    connections: {
      stream: 'James\'s stream of consciousness',
      emergence: 'Mind emerges from bodily processes',
      experience: 'Experience is fundamental (panexperientialism)'
    },
    consciousness: 'Consciousness is high-grade experience, not sui generis',
    strength: PHI_INV_2
  });

  state.stats.applicationsRegistered = state.applications.size;
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
 * Get a category
 */
function getCategory(categoryId) {
  return state.categories.get(categoryId) || null;
}

/**
 * Get an application
 */
function getApplication(applicationId) {
  return state.applications.get(applicationId) || null;
}

/**
 * List all concepts
 */
function listConcepts() {
  return Array.from(state.concepts.entries()).map(([id, c]) => ({ id, ...c }));
}

/**
 * List all applications
 */
function listApplications() {
  return Array.from(state.applications.entries()).map(([id, a]) => ({ id, ...a }));
}

/**
 * Analyze from process perspective
 */
function analyzeProcess(subject) {
  state.stats.analysesPerformed++;

  return {
    subject,
    processQuestions: {
      becoming: 'How does this come to be?',
      relations: 'What does this prehend? What prehends it?',
      novelty: 'What is genuinely novel here?',
      perishing: 'How does this pass away and become data?'
    },
    whiteheadianAnalysis: {
      actualOccasion: 'What moments of experience constitute this?',
      eternalObjects: 'What forms/qualities characterize it?',
      nexus: 'What society of occasions is this?'
    },
    bergsonianAnalysis: {
      duration: 'What is the lived temporal experience?',
      intuition: 'What do we grasp directly, beyond intellect?',
      creativity: 'What novelty emerges?'
    },
    cynicNote: '*head tilt* Reality flows. Substance is abstraction. φ-process.',
    confidence: PHI_INV_2
  };
}

/**
 * Apply process categories
 */
function applyCategories(entity) {
  state.stats.analysesPerformed++;

  return {
    entity,
    categoryCheck: {
      actualEntity: 'Is this a moment of experience?',
      eternalObject: 'Is this a pure form/potential?',
      nexus: 'Is this a group of occasions?',
      prehension: 'Is this a relation of feeling?'
    },
    processAnalysis: {
      concrescence: 'How does this "grow together"?',
      satisfaction: 'What unity does it achieve?',
      objectification: 'How is it objectified for others?'
    },
    cynicNote: '*sniff* Not what things are, but how they become.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  PROCESS PHILOSOPHY ENGINE               Phase 42B      │
├─────────────────────────────────────────────────────────┤
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                       │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                       │
│  Categories: ${String(state.stats.categoriesRegistered).padStart(3)}                                     │
│  Applications: ${String(state.stats.applicationsRegistered).padStart(3)}                                   │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Key Figures:                                           │
│    - Whitehead (actual occasions, prehension)           │
│    - Bergson (duration, élan vital)                     │
│    - Hartshorne (process theology)                      │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *ears perk* Reality is process. Becoming is primary.   │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    thinkers: state.stats.thinkersRegistered,
    concepts: state.stats.conceptsRegistered,
    categories: state.stats.categoriesRegistered,
    applications: state.stats.applicationsRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getThinker,
  getConcept,
  getCategory,
  getApplication,
  listConcepts,
  listApplications,
  analyzeProcess,
  applyCategories,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
