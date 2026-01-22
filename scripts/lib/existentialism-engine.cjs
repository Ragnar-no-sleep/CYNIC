#!/usr/bin/env node

/**
 * Existentialism Engine - Phase 38B
 * 
 * Existentialist philosophy:
 * - Sartre: freedom, bad faith, being-for-itself
 * - Camus: absurdism, revolt, Sisyphus
 * - Beauvoir: ethics, feminism
 * - Kierkegaard, Nietzsche (precursors)
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
  themes: new Map(),
  analyses: [],
  stats: {
    philosophersRegistered: 0,
    conceptsRegistered: 0,
    themesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'existentialism-engine');

/**
 * Initialize existentialism engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '38B' };
  }
  
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  registerPhilosophers();
  registerConcepts();
  registerThemes();
  
  state.initialized = true;
  return { status: 'initialized', phase: '38B', engine: 'existentialism' };
}

/**
 * Register existentialist philosophers
 */
function registerPhilosophers() {
  state.philosophers.set('sartre', {
    name: 'Jean-Paul Sartre',
    dates: '1905-1980',
    role: 'Central figure of French existentialism',
    keyWorks: ['Being and Nothingness', 'Existentialism is a Humanism', 'Nausea', 'No Exit'],
    centralIdeas: [
      'Existence precedes essence',
      'Radical freedom and responsibility',
      'Bad faith (mauvaise foi)',
      'Being-for-itself vs being-in-itself',
      'The Look (le regard) and Others',
      'Condemned to be free'
    ],
    quotes: [
      'Existence precedes essence',
      'Man is condemned to be free',
      'Hell is other people'
    ],
    strength: PHI_INV
  });
  
  state.philosophers.set('camus', {
    name: 'Albert Camus',
    dates: '1913-1960',
    role: 'Absurdist philosopher and novelist',
    keyWorks: ['The Myth of Sisyphus', 'The Stranger', 'The Plague', 'The Rebel'],
    centralIdeas: [
      'The Absurd (conflict between human need for meaning and silent universe)',
      'Revolt against absurdity',
      'One must imagine Sisyphus happy',
      'Rejection of philosophical suicide',
      'Living without appeal'
    ],
    distinction: 'Rejected existentialist label; called himself absurdist',
    quotes: [
      'One must imagine Sisyphus happy',
      'The absurd is born of the confrontation between human need and the unreasonable silence of the world'
    ],
    strength: PHI_INV
  });
  
  state.philosophers.set('beauvoir', {
    name: 'Simone de Beauvoir',
    dates: '1908-1986',
    role: 'Existentialist and feminist philosopher',
    keyWorks: ['The Second Sex', 'The Ethics of Ambiguity', 'She Came to Stay'],
    centralIdeas: [
      'One is not born, but rather becomes, a woman',
      'Ethics of ambiguity',
      'Situated freedom',
      'Woman as Other',
      'Bad faith in gender roles'
    ],
    contribution: 'Applied existentialism to feminism and ethics',
    strength: PHI_INV
  });
  
  state.philosophers.set('kierkegaard', {
    name: 'Søren Kierkegaard',
    dates: '1813-1855',
    role: 'Precursor of existentialism',
    keyWorks: ['Either/Or', 'Fear and Trembling', 'The Sickness Unto Death'],
    centralIdeas: [
      'Subjectivity is truth',
      'Leap of faith',
      'Three stages: aesthetic, ethical, religious',
      'Anxiety (Angst) before freedom',
      'Despair and the self'
    ],
    contribution: 'Founded existentialist themes; religious existentialism',
    strength: PHI_INV
  });
  
  state.philosophers.set('nietzsche', {
    name: 'Friedrich Nietzsche',
    dates: '1844-1900',
    role: 'Precursor of existentialism',
    keyWorks: ['Thus Spoke Zarathustra', 'Beyond Good and Evil', 'The Gay Science'],
    centralIdeas: [
      'God is dead',
      'Will to power',
      'Eternal recurrence',
      'Übermensch (overman)',
      'Master and slave morality',
      'Perspectivism'
    ],
    influence: 'Profound impact on existentialism, postmodernism',
    strength: PHI_INV
  });
  
  state.stats.philosophersRegistered = state.philosophers.size;
}

/**
 * Register existentialist concepts
 */
function registerConcepts() {
  state.concepts.set('existence-essence', {
    name: 'Existence Precedes Essence',
    philosopher: 'Sartre',
    meaning: 'Humans exist first, then define themselves through choices',
    contrast: 'For objects, essence (purpose) precedes existence',
    implications: [
      'No fixed human nature',
      'We create ourselves through choices',
      'No excuses: we are what we do',
      'Total responsibility'
    ],
    quote: 'Man is nothing else but what he makes of himself',
    strength: PHI_INV
  });
  
  state.concepts.set('bad-faith', {
    name: 'Bad Faith',
    french: 'Mauvaise foi',
    philosopher: 'Sartre',
    meaning: 'Self-deception about one\'s freedom',
    forms: [
      'Denying freedom (I had no choice)',
      'Denying facticity (I can be anything)',
      'Identifying with social role (I am just a waiter)',
      'Blaming others or circumstances'
    ],
    examples: {
      waiter: 'Playing the role of waiter too perfectly, denying freedom',
      woman: 'Ignoring the hand on her knee, denying situation'
    },
    opposite: 'Authenticity: acknowledging freedom and facticity',
    strength: PHI_INV
  });
  
  state.concepts.set('absurd', {
    name: 'The Absurd',
    philosopher: 'Camus',
    meaning: 'Conflict between human need for meaning and universe\'s silence',
    sources: [
      'Human desire for clarity and meaning',
      'World\'s indifference and irrationality',
      'Death making all ultimately futile'
    ],
    responses: {
      suicide: 'Rejected by Camus as giving up',
      philosophicalSuicide: 'Religious leap rejected as dishonest',
      revolt: 'Camus\'s answer: live in defiance of absurdity'
    },
    sisyphus: 'The absurd hero who creates meaning through struggle',
    strength: PHI_INV
  });
  
  state.concepts.set('freedom', {
    name: 'Radical Freedom',
    philosopher: 'Sartre',
    meaning: 'Humans are absolutely free and responsible',
    aspects: [
      'No determinism (not even unconscious)',
      'We choose even not to choose',
      'Responsibility cannot be transferred',
      'Anguish accompanies freedom'
    ],
    limits: 'Facticity (situation) but not determination',
    condemned: 'We are condemned to be free - no escape from choosing',
    strength: PHI_INV
  });
  
  state.concepts.set('angst', {
    name: 'Angst/Anxiety',
    german: 'Angst',
    philosophers: 'Kierkegaard, Heidegger, Sartre',
    meaning: 'Anxiety before freedom and nothingness',
    distinction: 'Fear is of something; anxiety is of nothing/freedom',
    kierkegaard: 'Dizziness of freedom',
    heidegger: 'Reveals our thrownness and mortality',
    sartre: 'Awareness of our radical freedom',
    strength: PHI_INV
  });
  
  state.concepts.set('the-other', {
    name: 'The Other',
    philosopher: 'Sartre, Beauvoir, Levinas',
    sartre: {
      look: 'The Other\'s gaze objectifies me',
      conflict: 'Relations with others are fundamentally conflictual',
      quote: 'Hell is other people'
    },
    beauvoir: {
      woman: 'Woman as Other to man\'s Subject',
      implication: 'Othering as source of oppression'
    },
    strength: PHI_INV
  });
  
  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register existentialist themes
 */
function registerThemes() {
  state.themes.set('meaning', {
    name: 'Meaning of Life',
    positions: {
      sartre: 'We create our own meaning through choices',
      camus: 'No given meaning; create through revolt against absurd',
      kierkegaard: 'Meaning through religious faith',
      nietzsche: 'Create values; become who you are'
    },
    consensus: 'Meaning is not given but made',
    strength: PHI_INV
  });
  
  state.themes.set('authenticity', {
    name: 'Authenticity',
    description: 'Living truly as oneself',
    philosophers: {
      heidegger: 'Owning one\'s existence, facing death',
      sartre: 'Acknowledging freedom, avoiding bad faith',
      kierkegaard: 'Becoming an individual, not lost in crowd',
      beauvoir: 'Genuine ethical engagement'
    },
    obstacles: ['Bad faith', 'The They (das Man)', 'Social roles'],
    strength: PHI_INV
  });
  
  state.themes.set('death', {
    name: 'Death and Mortality',
    significance: 'Central to existentialist thought',
    heidegger: {
      concept: 'Being-toward-death',
      meaning: 'Death is Dasein\'s ownmost possibility',
      authentic: 'Anticipatory resoluteness in face of death'
    },
    sartre: 'Death is absurd; cuts off possibilities',
    camus: 'Death makes life absurd; respond with revolt',
    strength: PHI_INV
  });
  
  state.themes.set('responsibility', {
    name: 'Responsibility',
    description: 'Absolute responsibility for choices',
    sartre: {
      individual: 'Responsible for what we are',
      universal: 'In choosing, we choose for all humanity',
      noExcuses: 'Cannot blame circumstances or others'
    },
    beauvoir: 'Responsibility extends to others\' freedom',
    weight: 'Source of anguish',
    strength: PHI_INV
  });
  
  state.stats.themesRegistered = state.themes.size;
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
 * Get a theme
 */
function getTheme(themeId) {
  return state.themes.get(themeId) || null;
}

/**
 * List all philosophers
 */
function listPhilosophers() {
  return Array.from(state.philosophers.entries()).map(([id, p]) => ({ id, ...p }));
}

/**
 * Analyze existential situation
 */
function analyzeExistentialSituation(situation) {
  state.stats.analysesPerformed++;
  
  return {
    situation,
    sartrean: {
      freedom: 'What choices do you have? (More than you think)',
      badFaith: 'Are you denying your freedom or facticity?',
      responsibility: 'What are you responsible for here?',
      project: 'What are you making of yourself?'
    },
    camusian: {
      absurd: 'Does this reveal the gap between desire and reality?',
      revolt: 'How can you revolt against the absurd here?',
      sisyphus: 'Can you find meaning in the struggle itself?'
    },
    kierkegaardian: {
      anxiety: 'What does your anxiety reveal about your freedom?',
      stages: 'Is this aesthetic, ethical, or religious?',
      leap: 'What leap might be required?'
    },
    guidance: {
      acknowledge: 'Acknowledge both freedom and situation',
      choose: 'Choose authentically, without bad faith',
      own: 'Own your choice and its consequences',
      create: 'Create meaning through your response'
    },
    cynicNote: '*sniff* Existence precedes essence. You choose who you become.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  EXISTENTIALISM ENGINE                   Phase 38B     │
├─────────────────────────────────────────────────────────┤
│  Philosophers: ${String(state.stats.philosophersRegistered).padStart(3)}                                 │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                      │
│  Themes: ${String(state.stats.themesRegistered).padStart(3)}                                        │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Key Figures:                                           │
│    - Sartre (freedom, bad faith)                        │
│    - Camus (absurd, revolt)                             │
│    - Beauvoir (ethics, feminism)                        │
│    - Kierkegaard, Nietzsche (precursors)                │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *head tilt* Condemned to be free                       │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    philosophers: state.stats.philosophersRegistered,
    concepts: state.stats.conceptsRegistered,
    themes: state.stats.themesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getPhilosopher,
  getConcept,
  getTheme,
  listPhilosophers,
  analyzeExistentialSituation,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
