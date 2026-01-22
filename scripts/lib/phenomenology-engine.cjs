#!/usr/bin/env node

/**
 * Phenomenology Engine - Phase 38A
 * 
 * Phenomenological philosophy:
 * - Husserl: intentionality, epoché, eidetic reduction
 * - Heidegger: Dasein, Being, authenticity
 * - Merleau-Ponty: embodiment, perception
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
  philosophers: new Map(),
  concepts: new Map(),
  methods: new Map(),
  analyses: [],
  stats: {
    philosophersRegistered: 0,
    conceptsRegistered: 0,
    methodsRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'phenomenology-engine');

/**
 * Initialize phenomenology engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '38A' };
  }
  
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  registerPhilosophers();
  registerConcepts();
  registerMethods();
  
  state.initialized = true;
  return { status: 'initialized', phase: '38A', engine: 'phenomenology' };
}

/**
 * Register phenomenologists
 */
function registerPhilosophers() {
  state.philosophers.set('husserl', {
    name: 'Edmund Husserl',
    dates: '1859-1938',
    role: 'Founder of phenomenology',
    keyWorks: ['Logical Investigations', 'Ideas I', 'Cartesian Meditations', 'Crisis'],
    centralIdeas: [
      'Phenomenology as rigorous science',
      'Intentionality of consciousness',
      'Epoché and phenomenological reduction',
      'Eidetic intuition',
      'Lifeworld (Lebenswelt)'
    ],
    motto: 'To the things themselves! (Zu den Sachen selbst!)',
    influence: 'Founded phenomenological movement',
    strength: PHI_INV
  });
  
  state.philosophers.set('heidegger', {
    name: 'Martin Heidegger',
    dates: '1889-1976',
    role: 'Existential phenomenologist / Ontologist',
    keyWorks: ['Being and Time', 'Fundamental Problems of Phenomenology', 'Letter on Humanism'],
    centralIdeas: [
      'Question of Being (Seinsfrage)',
      'Dasein (being-there)',
      'Being-in-the-world',
      'Authenticity vs inauthenticity',
      'Thrownness, projection, falling',
      'Being-toward-death'
    ],
    distinction: 'Ontological (Being) vs ontic (beings)',
    controversy: 'Nazi party membership',
    influence: 'Existentialism, hermeneutics, deconstruction',
    strength: PHI_INV
  });
  
  state.philosophers.set('merleau-ponty', {
    name: 'Maurice Merleau-Ponty',
    dates: '1908-1961',
    role: 'Phenomenologist of embodiment',
    keyWorks: ['Phenomenology of Perception', 'The Visible and the Invisible'],
    centralIdeas: [
      'Embodied consciousness',
      'Primacy of perception',
      'Body-subject (not body-object)',
      'Flesh of the world',
      'Chiasm (intertwining)'
    ],
    contribution: 'Overcame mind-body dualism through embodiment',
    influence: 'Cognitive science, feminist philosophy',
    strength: PHI_INV
  });
  
  state.philosophers.set('levinas', {
    name: 'Emmanuel Levinas',
    dates: '1906-1995',
    role: 'Ethical phenomenologist',
    keyWorks: ['Totality and Infinity', 'Otherwise than Being'],
    centralIdeas: [
      'The Face of the Other',
      'Ethics as first philosophy',
      'Infinite responsibility',
      'Alterity (radical otherness)'
    ],
    contribution: 'Grounded ethics in encounter with Other',
    strength: PHI_INV_2
  });
  
  state.stats.philosophersRegistered = state.philosophers.size;
}

/**
 * Register phenomenological concepts
 */
function registerConcepts() {
  state.concepts.set('intentionality', {
    name: 'Intentionality',
    origin: 'Brentano, developed by Husserl',
    definition: 'Consciousness is always consciousness OF something',
    structure: {
      noesis: 'The act of consciousness (intending)',
      noema: 'The object as intended (the intended)'
    },
    significance: 'Consciousness is inherently relational',
    implication: 'No consciousness without object; no object without consciousness',
    strength: PHI_INV
  });
  
  state.concepts.set('dasein', {
    name: 'Dasein',
    philosopher: 'Heidegger',
    literal: 'Being-there',
    meaning: 'The kind of being that humans are',
    characteristics: [
      'Existence precedes essence',
      'Always already in a world',
      'Understands its own being',
      'Projects possibilities',
      'Is thrown into situation'
    ],
    existentialia: ['Thrownness', 'Projection', 'Falling', 'Discourse'],
    contrast: 'Not a subject or consciousness but a way of being',
    strength: PHI_INV
  });
  
  state.concepts.set('being-in-the-world', {
    name: 'Being-in-the-world',
    german: 'In-der-Welt-sein',
    philosopher: 'Heidegger',
    meaning: 'Dasein\'s fundamental way of being',
    aspects: {
      world: 'Not container but meaningful context',
      inness: 'Not spatial but existential involvement',
      being: 'Way of existing, not property'
    },
    implication: 'Subject and world are not separable',
    overcomes: 'Cartesian subject-object split',
    strength: PHI_INV
  });
  
  state.concepts.set('lifeworld', {
    name: 'Lifeworld',
    german: 'Lebenswelt',
    philosopher: 'Husserl (late)',
    meaning: 'Pre-theoretical world of everyday experience',
    characteristics: [
      'Pre-given, taken for granted',
      'Foundation for science',
      'Intersubjective',
      'Historical and cultural'
    ],
    significance: 'Science abstracts from lifeworld; must return to it',
    crisis: 'Modern science has forgotten its lifeworld origins',
    strength: PHI_INV
  });
  
  state.concepts.set('embodiment', {
    name: 'Embodiment',
    philosopher: 'Merleau-Ponty',
    meaning: 'Consciousness is essentially embodied',
    distinction: {
      bodySubject: 'The lived body (Leib)',
      bodyObject: 'The physical body (Körper)'
    },
    implications: [
      'Perception is bodily skill',
      'Meaning is incarnate',
      'Mind-body dualism overcome',
      'Motor intentionality'
    ],
    examples: ['Phantom limb', 'Skilled coping', 'Habit'],
    strength: PHI_INV
  });
  
  state.concepts.set('authenticity', {
    name: 'Authenticity',
    german: 'Eigentlichkeit',
    philosopher: 'Heidegger',
    meaning: 'Owning one\'s existence; being one\'s own',
    contrast: 'Inauthenticity: living as "the They" (das Man)',
    characteristics: [
      'Facing one\'s own death',
      'Resoluteness',
      'Owning one\'s thrownness',
      'Authentic temporality'
    ],
    note: 'Not moral judgment but ontological distinction',
    strength: PHI_INV_2
  });
  
  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register phenomenological methods
 */
function registerMethods() {
  state.methods.set('epoche', {
    name: 'Epoché',
    greek: 'Suspension',
    philosopher: 'Husserl',
    meaning: 'Bracketing the natural attitude',
    procedure: [
      'Suspend belief in the existence of the external world',
      'Focus on phenomena as they appear',
      'Describe without presuppositions'
    ],
    purpose: 'Access pure consciousness and its structures',
    notMeaning: 'Not doubt or denial, but methodological suspension',
    strength: PHI_INV
  });
  
  state.methods.set('reduction', {
    name: 'Phenomenological Reduction',
    philosopher: 'Husserl',
    types: {
      transcendental: 'Reveals pure consciousness',
      eidetic: 'Reveals essential structures',
      intersubjective: 'Reveals constitution of others'
    },
    procedure: [
      'Apply epoché',
      'Attend to how phenomena are constituted',
      'Describe intentional structures'
    ],
    goal: 'Uncover the transcendental structures of experience',
    strength: PHI_INV
  });
  
  state.methods.set('eidetic-variation', {
    name: 'Eidetic Variation',
    philosopher: 'Husserl',
    purpose: 'Discover essential features of phenomena',
    procedure: [
      'Take an example of the phenomenon',
      'Imaginatively vary its features',
      'Identify what cannot be varied without losing the phenomenon',
      'What remains is the eidos (essence)'
    ],
    example: 'Varying features of perception to find its essential structure',
    strength: PHI_INV_2
  });
  
  state.methods.set('hermeneutic-circle', {
    name: 'Hermeneutic Circle',
    philosopher: 'Heidegger, Gadamer',
    meaning: 'Understanding moves between part and whole',
    structure: [
      'To understand the whole, must understand parts',
      'To understand parts, must understand whole',
      'Understanding is circular but not vicious'
    ],
    implication: 'Interpretation always involves pre-understanding',
    application: 'Text interpretation, human sciences',
    strength: PHI_INV
  });
  
  state.stats.methodsRegistered = state.methods.size;
}

/**
 * Get a philosopher
 */
function getPhilosopher(philosopherId) {
  return state.philosophers.get(philosopherId) || null;
}

/**
 * Get a concept
 */
function getConcept(conceptId) {
  return state.concepts.get(conceptId) || null;
}

/**
 * Get a method
 */
function getMethod(methodId) {
  return state.methods.get(methodId) || null;
}

/**
 * List all philosophers
 */
function listPhilosophers() {
  return Array.from(state.philosophers.entries()).map(([id, p]) => ({ id, ...p }));
}

/**
 * List all concepts
 */
function listConcepts() {
  return Array.from(state.concepts.entries()).map(([id, c]) => ({ id, ...c }));
}

/**
 * Analyze experience phenomenologically
 */
function analyzeExperience(experience) {
  state.stats.analysesPerformed++;
  
  return {
    experience,
    husserlian: {
      epoché: 'Bracket existence claims; attend to how it appears',
      intentionality: {
        noesis: 'The act of experiencing',
        noema: 'The experienced as experienced'
      },
      question: 'What are the essential structures of this experience?'
    },
    heideggerian: {
      dasein: 'How does this experience reveal your being-in-the-world?',
      mood: 'What attunement (Stimmung) colors this experience?',
      understanding: 'What possibilities does it disclose?',
      authenticity: 'Is this owned or absorbed in "the They"?'
    },
    merleauPontian: {
      embodiment: 'How is this experience bodily?',
      perception: 'What is the motor-perceptual structure?',
      intertwining: 'How do you and world interweave here?'
    },
    cynicNote: '*head tilt* Phenomenology asks: how does this appear? Not: does it exist?',
    confidence: PHI_INV_2
  };
}

/**
 * Compare phenomenologists
 */
function comparePhilosophers(id1, id2) {
  const p1 = state.philosophers.get(id1);
  const p2 = state.philosophers.get(id2);
  
  if (!p1 || !p2) return { error: 'Philosopher not found' };
  
  const comparisons = {
    'husserl-heidegger': {
      agreement: 'Both pursue "things themselves", reject psychologism',
      difference: 'Husserl: transcendental consciousness; Heidegger: Dasein/Being',
      tension: 'Heidegger accused Husserl of remaining Cartesian'
    },
    'husserl-merleau-ponty': {
      agreement: 'Both emphasize intentionality and perception',
      difference: 'Merleau-Ponty emphasizes embodiment more than Husserl',
      tension: 'Is consciousness fundamentally embodied or transcendental?'
    },
    'heidegger-merleau-ponty': {
      agreement: 'Both reject Cartesian dualism, emphasize being-in-world',
      difference: 'Heidegger: ontological; Merleau-Ponty: perceptual/bodily',
      synthesis: 'Both contribute to overcoming subject-object split'
    }
  };
  
  const key = [id1, id2].sort().join('-');
  
  return {
    philosophers: [p1.name, p2.name],
    comparison: comparisons[key] || { note: 'Comparison not pre-registered' },
    cynicNote: '*sniff* Phenomenologists agree on method, diverge on metaphysics.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  PHENOMENOLOGY ENGINE                    Phase 38A     │
├─────────────────────────────────────────────────────────┤
│  Philosophers: ${String(state.stats.philosophersRegistered).padStart(3)}                                 │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                      │
│  Methods: ${String(state.stats.methodsRegistered).padStart(3)}                                       │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Key Figures:                                           │
│    - Husserl (intentionality, epoché)                   │
│    - Heidegger (Dasein, Being)                          │
│    - Merleau-Ponty (embodiment)                         │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *ears perk* To the things themselves!                  │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    philosophers: state.stats.philosophersRegistered,
    concepts: state.stats.conceptsRegistered,
    methods: state.stats.methodsRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getPhilosopher,
  getConcept,
  getMethod,
  listPhilosophers,
  listConcepts,
  analyzeExperience,
  comparePhilosophers,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
