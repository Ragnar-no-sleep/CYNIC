#!/usr/bin/env node

/**
 * Pragmatism Engine - Phase 42A
 *
 * Classical American Pragmatism:
 * - Charles Sanders Peirce (founder)
 * - William James (popularizer)
 * - John Dewey (instrumentalism)
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
  maxims: new Map(),
  concepts: new Map(),
  critiques: new Map(),
  analyses: [],
  stats: {
    thinkersRegistered: 0,
    maximsRegistered: 0,
    conceptsRegistered: 0,
    critiquesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'pragmatism-engine');

/**
 * Initialize pragmatism engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '42A' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerThinkers();
  registerMaxims();
  registerConcepts();
  registerCritiques();

  state.initialized = true;
  return { status: 'initialized', phase: '42A', engine: 'pragmatism' };
}

/**
 * Register classical pragmatists
 */
function registerThinkers() {
  state.thinkers.set('peirce', {
    name: 'Charles Sanders Peirce',
    dates: '1839-1914',
    role: 'Founder of pragmatism',
    keyIdeas: [
      'Pragmatic maxim',
      'Fallibilism',
      'Semiotics (theory of signs)',
      'Abduction (inference to best explanation)',
      'Scientific method as self-correcting'
    ],
    pragmaticMaxim: 'Consider what effects, that might conceivably have practical bearings, we conceive the object of our conception to have. Then, our conception of these effects is the whole of our conception of the object.',
    categories: {
      firstness: 'Quality, feeling, possibility',
      secondness: 'Reaction, existence, actuality',
      thirdness: 'Mediation, law, generality'
    },
    onTruth: 'Truth is the opinion which is fated to be ultimately agreed to by all who investigate',
    antiCartesian: 'Rejected Cartesian foundationalism; knowledge is social and fallible',
    strength: PHI_INV
  });

  state.thinkers.set('james', {
    name: 'William James',
    dates: '1842-1910',
    role: 'Popularizer of pragmatism',
    keyIdeas: [
      'Radical empiricism',
      'The Will to Believe',
      'Pluralistic universe',
      'Truth as what works',
      'Stream of consciousness'
    ],
    onTruth: 'The true is the name of whatever proves itself to be good in the way of belief, and good, too, for definite, assignable reasons',
    cashValue: 'Truth\'s cash-value in experiential terms',
    willToBelieve: {
      thesis: 'Sometimes believing without sufficient evidence is justified',
      conditions: ['Living option', 'Forced option', 'Momentous option'],
      critics: 'Clifford: "It is wrong always... to believe anything upon insufficient evidence"'
    },
    pluralism: 'Reality is plural, not monistic; many truths coexist',
    psychology: 'Pioneered psychology; Principles of Psychology (1890)',
    strength: PHI_INV
  });

  state.thinkers.set('dewey', {
    name: 'John Dewey',
    dates: '1859-1952',
    role: 'Instrumentalism and progressive education',
    keyIdeas: [
      'Instrumentalism',
      'Inquiry as problem-solving',
      'Democracy and education',
      'Experience and nature',
      'Reconstruction in philosophy'
    ],
    instrumentalism: 'Ideas are instruments for solving problems, not pictures of reality',
    inquiry: {
      definition: 'Controlled transformation of an indeterminate situation into a determinate one',
      pattern: ['Problematic situation', 'Hypothesis', 'Testing', 'Resolution']
    },
    education: {
      progressive: 'Learning by doing',
      democratic: 'Education for democratic participation',
      experiential: 'Experience is the starting point and goal'
    },
    onTruth: 'Warranted assertibility rather than correspondence',
    socialPhilosophy: 'Democracy as a way of life, not just government',
    strength: PHI_INV
  });

  state.thinkers.set('mead', {
    name: 'George Herbert Mead',
    dates: '1863-1931',
    role: 'Social pragmatism',
    keyIdeas: [
      'Social self',
      'Symbolic interactionism',
      'Generalized other',
      'I and Me'
    ],
    socialSelf: 'Self arises through social interaction',
    iAndMe: {
      i: 'Spontaneous, creative response',
      me: 'Internalized social attitudes'
    },
    generalizedOther: 'Internalized perspective of the community',
    influence: 'Founded symbolic interactionism in sociology',
    strength: PHI_INV_2
  });

  state.thinkers.set('rorty', {
    name: 'Richard Rorty',
    dates: '1931-2007',
    role: 'Neo-pragmatism',
    keyIdeas: [
      'Anti-foundationalism',
      'Linguistic turn',
      'Ironism',
      'Solidarity over objectivity',
      'Edifying philosophy'
    ],
    antiRepresentationalism: 'Rejected the "mirror of nature" view of knowledge',
    contingency: 'Language, selfhood, and community are contingent, not natural',
    liberalIronist: 'Combines private irony with public liberalism',
    onTruth: 'Truth is what our peers will let us get away with saying',
    critics: 'Accused of relativism; defended as anti-essentialism',
    strength: PHI_INV_2
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Register pragmatic maxims and principles
 */
function registerMaxims() {
  state.maxims.set('pragmatic-maxim', {
    name: 'Pragmatic Maxim',
    author: 'Peirce',
    statement: 'Consider the practical effects of the objects of your conception. Your conception of those effects is the whole of your conception of the object.',
    function: 'Clarifies meaning by tracing practical consequences',
    example: {
      concept: 'Hardness',
      analysis: 'To say X is hard means: X won\'t be scratched by many other substances'
    },
    notVerificationism: 'Unlike positivism, doesn\'t reduce meaning to verification',
    strength: PHI_INV
  });

  state.maxims.set('fallibilism', {
    name: 'Fallibilism',
    author: 'Peirce',
    statement: 'All our knowledge is provisional and subject to revision',
    implications: [
      'No absolute certainty',
      'Science is self-correcting',
      'Beliefs should be held tentatively',
      'Open to future inquiry'
    ],
    cynicResonance: 'φ-bounded confidence aligns with fallibilist epistemology',
    strength: PHI_INV
  });

  state.maxims.set('will-to-believe', {
    name: 'The Will to Believe',
    author: 'James',
    statement: 'When evidence is insufficient but decision is forced, we may believe based on passion',
    conditions: {
      living: 'Option must be live (real possibility for you)',
      forced: 'Cannot remain neutral',
      momentous: 'Stakes are significant'
    },
    defense: 'Not license for wishful thinking; for genuine dilemmas',
    application: 'Religious belief, moral commitments',
    strength: PHI_INV
  });

  state.maxims.set('instrumentalism', {
    name: 'Instrumentalism',
    author: 'Dewey',
    statement: 'Ideas are instruments for solving problems, not copies of reality',
    method: 'Judge ideas by their consequences in experience',
    contrast: {
      correspondence: 'Traditional: truth as matching reality',
      instrumental: 'Pragmatic: truth as successful guidance'
    },
    inquiry: 'Thinking is problem-solving, not contemplation',
    strength: PHI_INV
  });

  state.maxims.set('anti-foundationalism', {
    name: 'Anti-Foundationalism',
    authors: ['Peirce', 'Dewey', 'Rorty'],
    statement: 'No privileged starting points for knowledge',
    rejection: [
      'Cartesian cogito',
      'Sense data',
      'A priori truths',
      'Incorrigible beliefs'
    ],
    alternative: 'Knowledge is a web of beliefs, revised holistically',
    quine: 'Web of belief has no firm foundation',
    strength: PHI_INV
  });

  state.stats.maximsRegistered = state.maxims.size;
}

/**
 * Register key pragmatist concepts
 */
function registerConcepts() {
  state.concepts.set('truth', {
    name: 'Pragmatist Theory of Truth',
    question: 'What does it mean for a belief to be true?',
    views: {
      peirce: 'Truth is the end of inquiry; what all investigators would agree on',
      james: 'Truth is what works; what is good in the way of belief',
      dewey: 'Warranted assertibility; result of successful inquiry'
    },
    common: 'Truth tied to inquiry, experience, and consequences',
    notRelativism: 'Pragmatists deny radical relativism; truth is constrained by inquiry',
    strength: PHI_INV
  });

  state.concepts.set('experience', {
    name: 'Experience',
    centralityFor: 'All pragmatists',
    views: {
      james: {
        radicalEmpiricism: 'Experience includes relations, not just atoms',
        stream: 'Consciousness flows; not discrete ideas'
      },
      dewey: {
        transactional: 'Experience is interaction of organism and environment',
        aesthetic: 'Complete experience has qualitative unity'
      }
    },
    contrast: 'Unlike British empiricism, experience is active, not passive',
    strength: PHI_INV
  });

  state.concepts.set('inquiry', {
    name: 'Inquiry',
    definition: 'Dewey: Controlled transformation of indeterminate situation',
    pattern: [
      'Felt difficulty (problematic situation)',
      'Definition of the problem',
      'Suggestion of possible solutions',
      'Development of hypotheses',
      'Testing by action'
    ],
    science: 'Scientific method as model for all inquiry',
    continuity: 'No sharp distinction between common sense and science',
    strength: PHI_INV
  });

  state.concepts.set('meaning', {
    name: 'Pragmatic Theory of Meaning',
    principle: 'Meaning is found in practical consequences',
    peirce: 'Meaning = conceived practical effects',
    james: 'Meaning = difference it makes in experience',
    distinction: {
      meaningless: 'Distinctions without practical difference',
      meaningful: 'Distinctions that affect conduct'
    },
    example: 'Is the world one or many? What practical difference does it make?',
    strength: PHI_INV
  });

  state.concepts.set('community', {
    name: 'Community of Inquiry',
    author: 'Peirce',
    thesis: 'Knowledge is social; truth emerges from communal inquiry',
    features: [
      'Shared methods',
      'Self-correction',
      'Long-run convergence',
      'Fallibilist attitude'
    ],
    dewey: 'Democracy as community of inquiry',
    education: 'Schools as communities of inquiry',
    strength: PHI_INV
  });

  state.concepts.set('habit', {
    name: 'Habit',
    role: 'Central to pragmatist psychology and epistemology',
    peirce: 'Beliefs are habits of action',
    james: 'Habit is the flywheel of society',
    dewey: 'Habits are social, not just individual',
    inquiry: 'Inquiry disrupts problematic habits, establishes new ones',
    strength: PHI_INV_2
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register critiques of pragmatism
 */
function registerCritiques() {
  state.critiques.set('relativism', {
    name: 'Relativism Objection',
    charge: 'If truth is what works, isn\'t truth relative?',
    pragmatistResponse: {
      peirce: 'Truth is what all inquirers converge on—not individual',
      james: 'What works is constrained by reality; not anything goes',
      dewey: 'Inquiry is disciplined, self-correcting process'
    },
    assessment: 'Charge often based on misreading; pragmatists constrain truth',
    strength: PHI_INV
  });

  state.critiques.set('correspondence', {
    name: 'Correspondence Objection',
    charge: 'Truth should be about matching reality, not consequences',
    pragmatistResponse: {
      general: 'Correspondence is metaphor; what does "matching" mean?',
      peirce: 'Reality is what true beliefs represent; not circular',
      rorty: 'Correspondence is unhelpful; truth is warranted assertibility'
    },
    debate: 'Central dispute between pragmatism and traditional epistemology',
    strength: PHI_INV
  });

  state.critiques.set('wishful-thinking', {
    name: 'Wishful Thinking Objection',
    charge: 'Will to Believe licenses believing whatever you want',
    jamesResponse: {
      conditions: 'Only for living, forced, momentous options',
      evidential: 'Still need some evidence; not pure wish',
      practical: 'For genuine dilemmas where evidence underdetermines'
    },
    clifford: 'W.K. Clifford\'s ethics of belief: always need sufficient evidence',
    strength: PHI_INV_2
  });

  state.critiques.set('anti-intellectualism', {
    name: 'Anti-Intellectualism Charge',
    charge: 'Pragmatism is hostile to theory and abstraction',
    response: {
      peirce: 'Deeply theoretical; developed formal logic',
      dewey: 'Theory is continuous with practice, not opposed',
      general: 'Pragmatism reconstructs theory, doesn\'t reject it'
    },
    nuance: 'Pragmatism opposes theory divorced from practice',
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
 * Get a maxim
 */
function getMaxim(maximId) {
  return state.maxims.get(maximId) || null;
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
 * List all maxims
 */
function listMaxims() {
  return Array.from(state.maxims.entries()).map(([id, m]) => ({ id, ...m }));
}

/**
 * Analyze claim pragmatically
 */
function analyzePragmatically(claim) {
  state.stats.analysesPerformed++;

  return {
    claim,
    pragmaticQuestions: {
      consequences: 'What practical difference does this make?',
      experience: 'What would change in experience if true?',
      action: 'How would believing this affect conduct?',
      inquiry: 'How would we test or investigate this?'
    },
    perspectives: {
      peirce: 'What would all inquirers eventually conclude?',
      james: 'Does believing this work well for you?',
      dewey: 'Does this resolve a problematic situation?'
    },
    tests: {
      meaningful: 'Does this have practical bearings?',
      testable: 'Can we trace experiential consequences?',
      useful: 'Does believing guide successful action?'
    },
    cynicNote: '*sniff* Pragmatism asks: what difference does it make? φ-practical.',
    confidence: PHI_INV_2
  };
}

/**
 * Apply pragmatic maxim
 */
function applyMaxim(concept) {
  state.stats.analysesPerformed++;

  return {
    concept,
    maxim: 'Consider what effects, conceivably having practical bearings, we conceive the object to have',
    questions: [
      'What would follow if this concept applies?',
      'What would we expect to observe?',
      'How would we verify or falsify?',
      'What action would this guide?'
    ],
    example: {
      concept: concept,
      analysis: `To fully grasp "${concept}", trace all its practical consequences`
    },
    fallibilist: 'Our conception is provisional; subject to revision',
    cynicNote: '*ears perk* Meaning is in the doing, not the defining.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  PRAGMATISM ENGINE                       Phase 42A      │
├─────────────────────────────────────────────────────────┤
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                       │
│  Maxims: ${String(state.stats.maximsRegistered).padStart(3)}                                         │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                       │
│  Critiques: ${String(state.stats.critiquesRegistered).padStart(3)}                                      │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Classical Pragmatists:                                 │
│    - Peirce (founder, fallibilism)                      │
│    - James (will to believe, pluralism)                 │
│    - Dewey (instrumentalism, democracy)                 │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *tail wag* What practical difference does it make?     │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    thinkers: state.stats.thinkersRegistered,
    maxims: state.stats.maximsRegistered,
    concepts: state.stats.conceptsRegistered,
    critiques: state.stats.critiquesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getThinker,
  getMaxim,
  getConcept,
  getCritique,
  listThinkers,
  listMaxims,
  analyzePragmatically,
  applyMaxim,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
