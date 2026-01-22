#!/usr/bin/env node

/**
 * Philosophy of Law Engine - Phase 44A
 *
 * Jurisprudence and legal philosophy:
 * - Natural law theory
 * - Legal positivism
 * - Legal realism
 * - Critical legal studies
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
  theories: new Map(),
  thinkers: new Map(),
  concepts: new Map(),
  debates: new Map(),
  analyses: [],
  stats: {
    theoriesRegistered: 0,
    thinkersRegistered: 0,
    conceptsRegistered: 0,
    debatesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'philosophy-of-law-engine');

/**
 * Initialize philosophy of law engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '44A' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerTheories();
  registerThinkers();
  registerConcepts();
  registerDebates();

  state.initialized = true;
  return { status: 'initialized', phase: '44A', engine: 'philosophy-of-law' };
}

/**
 * Register legal theories
 */
function registerTheories() {
  state.theories.set('natural-law', {
    name: 'Natural Law Theory',
    thesis: 'Law derives from morality; unjust law is not true law',
    slogan: 'Lex iniusta non est lex (unjust law is not law)',
    versions: {
      classical: {
        figures: ['Aquinas', 'Aristotle', 'Cicero'],
        thesis: 'Law grounded in eternal moral order'
      },
      modern: {
        figures: ['Finnis', 'Fuller'],
        thesis: 'Law has inherent moral requirements'
      }
    },
    aquinas: {
      eternalLaw: 'Divine reason governing universe',
      naturalLaw: 'Human participation in eternal law',
      humanLaw: 'Application of natural law to particular cases'
    },
    finnis: 'Basic goods: life, knowledge, play, aesthetic experience, friendship, religion, practical reasonableness',
    strength: PHI_INV
  });

  state.theories.set('legal-positivism', {
    name: 'Legal Positivism',
    thesis: 'Law is what is posited by authorities; no necessary connection to morality',
    slogan: 'Law as it is vs. law as it ought to be',
    versions: {
      austinian: {
        figure: 'John Austin',
        thesis: 'Law is command of sovereign backed by sanction'
      },
      hartian: {
        figure: 'H.L.A. Hart',
        thesis: 'Law is system of rules including rule of recognition'
      },
      kelsenian: {
        figure: 'Hans Kelsen',
        thesis: 'Pure theory: law as system of norms'
      }
    },
    separationThesis: 'What law IS is separate from what law OUGHT to be',
    socialFacts: 'Law determined by social facts, not moral facts',
    strength: PHI_INV
  });

  state.theories.set('legal-realism', {
    name: 'Legal Realism',
    thesis: 'Law is what courts actually do, not rules on paper',
    americanRealism: {
      figures: ['Oliver Wendell Holmes', 'Karl Llewellyn', 'Jerome Frank'],
      thesis: 'Law is prediction of what courts will do',
      holmesQuote: 'The prophecies of what the courts will do in fact, and nothing more pretentious, are what I mean by the law'
    },
    scandinavianRealism: {
      figures: ['Axel Hagerstrom', 'Alf Ross'],
      thesis: 'Legal concepts are psychological phenomena'
    },
    indeterminacy: 'Legal rules underdetermine outcomes',
    strength: PHI_INV
  });

  state.theories.set('dworkin', {
    name: 'Dworkinian Interpretivism',
    figure: 'Ronald Dworkin',
    thesis: 'Law includes principles, not just rules',
    keyIdeas: {
      principles: 'Moral principles are part of law',
      integrity: 'Law as integrity: interpret to make it best',
      rightAnswer: 'Hard cases have right answers',
      hercules: 'Ideal judge who knows all law and morality'
    },
    againstPositivism: 'Rejects sharp separation of law and morality',
    lawAsInterpretation: 'Interpreting social practice to make it best it can be',
    strength: PHI_INV
  });

  state.theories.set('critical-legal-studies', {
    name: 'Critical Legal Studies',
    period: '1970s-1990s',
    figures: ['Duncan Kennedy', 'Roberto Unger', 'Mark Tushnet'],
    thesis: 'Law is politics; legal reasoning is indeterminate',
    claims: [
      'Law serves powerful interests',
      'Legal doctrine is contradictory',
      'Rights discourse legitimizes inequality',
      'Law can be transformed'
    ],
    method: 'Deconstruction of legal doctrine',
    critique: 'Accused of nihilism; what alternative?',
    strength: PHI_INV_2
  });

  state.theories.set('feminist-jurisprudence', {
    name: 'Feminist Jurisprudence',
    thesis: 'Law reflects and reinforces gender hierarchy',
    approaches: {
      liberal: 'Equal treatment under existing law',
      cultural: 'Law should recognize feminine values',
      radical: 'Law perpetuates male dominance',
      postmodern: 'Gender categories themselves are constructed'
    },
    mackinnon: 'Law is male; treats male as neutral standard',
    contributions: 'Sexual harassment law, domestic violence, reproductive rights',
    strength: PHI_INV_2
  });

  state.stats.theoriesRegistered = state.theories.size;
}

/**
 * Register legal philosophers
 */
function registerThinkers() {
  state.thinkers.set('hart', {
    name: 'H.L.A. Hart',
    dates: '1907-1992',
    work: 'The Concept of Law (1961)',
    contribution: {
      ruleOfRecognition: 'Secondary rule identifying valid primary rules',
      primarySecondary: 'Primary rules (duties) vs. secondary rules (powers)',
      internalPoint: 'Participants accept rules from internal point of view',
      openTexture: 'Rules have open texture; discretion in penumbra'
    },
    position: 'Sophisticated legal positivism',
    debate: 'Hart-Dworkin debate central to modern jurisprudence',
    strength: PHI_INV
  });

  state.thinkers.set('dworkin', {
    name: 'Ronald Dworkin',
    dates: '1931-2013',
    works: ['Taking Rights Seriously', 'Law\'s Empire'],
    contribution: {
      principles: 'Law includes principles with weight, not just rules',
      rightAnswer: 'Even hard cases have correct answers',
      integrity: 'Law as integrity: best moral interpretation',
      antiPositivism: 'Challenged Hart\'s positivism'
    },
    position: 'Liberal interpretivism',
    legacy: 'Reshaped legal philosophy debate',
    strength: PHI_INV
  });

  state.thinkers.set('kelsen', {
    name: 'Hans Kelsen',
    dates: '1881-1973',
    work: 'Pure Theory of Law',
    contribution: {
      pureTheory: 'Law as system of norms, not facts or values',
      grundnorm: 'Basic norm presupposed for validity',
      hierarchy: 'Hierarchical system of norms',
      isOught: 'Strict separation of is and ought'
    },
    position: 'Continental legal positivism',
    influence: 'Constitutional courts, international law',
    strength: PHI_INV_2
  });

  state.thinkers.set('austin', {
    name: 'John Austin',
    dates: '1790-1859',
    work: 'The Province of Jurisprudence Determined',
    contribution: {
      command: 'Law is command of sovereign backed by sanction',
      sovereign: 'Sovereign habitually obeyed, obeys no one',
      separation: 'Law as it is vs. law as it ought to be'
    },
    position: 'Classical legal positivism',
    critique: 'Too simple; ignores secondary rules (Hart)',
    strength: PHI_INV_2
  });

  state.thinkers.set('finnis', {
    name: 'John Finnis',
    dates: '1940-present',
    work: 'Natural Law and Natural Rights (1980)',
    contribution: {
      basicGoods: 'Self-evident basic goods: life, knowledge, play, etc.',
      practicalReason: 'Requirements of practical reasonableness',
      commonGood: 'Law serves common good',
      revival: 'Revived natural law theory'
    },
    position: 'New natural law theory',
    aquinas: 'Updated Thomistic natural law for modern era',
    strength: PHI_INV
  });

  state.thinkers.set('fuller', {
    name: 'Lon Fuller',
    dates: '1902-1978',
    work: 'The Morality of Law',
    contribution: {
      innerMorality: 'Law has internal morality (procedural)',
      eightDesiderata: [
        'Generality', 'Promulgation', 'Non-retroactivity', 'Clarity',
        'Non-contradiction', 'Possibility', 'Constancy', 'Congruence'
      ],
      rexExample: 'King Rex fails at every requirement'
    },
    position: 'Procedural natural law',
    debate: 'Hart-Fuller debate on Nazi law',
    strength: PHI_INV_2
  });

  state.thinkers.set('raz', {
    name: 'Joseph Raz',
    dates: '1939-2022',
    works: ['The Authority of Law', 'The Morality of Freedom'],
    contribution: {
      exclusivePositivism: 'Law identified only by sources, not morality',
      authority: 'Law claims legitimate authority',
      serviceConception: 'Authority justified by serving subjects',
      normalJustification: 'Follow authority when it helps follow reasons'
    },
    position: 'Exclusive legal positivism',
    influence: 'Major figure in legal and political philosophy',
    strength: PHI_INV
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Register legal concepts
 */
function registerConcepts() {
  state.concepts.set('validity', {
    name: 'Legal Validity',
    question: 'What makes a law valid?',
    positions: {
      positivist: 'Pedigree: enacted by proper authority',
      naturalLaw: 'Conformity with moral law',
      dworkin: 'Coherence with principles of legal system'
    },
    hartian: 'Valid if satisfies rule of recognition',
    kelsenian: 'Valid if authorized by higher norm',
    strength: PHI_INV
  });

  state.concepts.set('authority', {
    name: 'Legal Authority',
    question: 'Why should we obey the law?',
    types: {
      dejure: 'Legitimate authority (rightful)',
      defacto: 'Actual power (effective)',
      practical: 'Law gives reasons for action'
    },
    raz: 'Authority claims to provide exclusionary reasons',
    legitimacy: 'When is authority legitimate?',
    strength: PHI_INV
  });

  state.concepts.set('rights', {
    name: 'Legal Rights',
    question: 'What are rights and where do they come from?',
    hohfeldian: {
      claim: 'Correlates with duty in another',
      liberty: 'Absence of duty',
      power: 'Ability to change legal relations',
      immunity: 'Absence of liability to change'
    },
    theories: {
      will: 'Rights protect choices',
      interest: 'Rights protect interests'
    },
    dworkin: 'Rights are trumps against utility',
    strength: PHI_INV
  });

  state.concepts.set('interpretation', {
    name: 'Legal Interpretation',
    question: 'How should we interpret legal texts?',
    methods: {
      textualist: 'Plain meaning of words',
      intentionalist: 'Intent of lawmakers',
      purposive: 'Purpose of the law',
      dworkinian: 'Best moral interpretation'
    },
    statutory: 'Canons of statutory interpretation',
    constitutional: 'Originalism vs. living constitution',
    strength: PHI_INV
  });

  state.concepts.set('rule-of-law', {
    name: 'Rule of Law',
    definition: 'Government limited by law; no one above the law',
    formal: {
      fuller: 'Eight desiderata of legality',
      raz: 'Law must be capable of guiding behavior'
    },
    substantive: {
      dworkin: 'Rule of law includes rights',
      fuller: 'Some substantive content required'
    },
    values: ['Predictability', 'Equality', 'Accountability', 'Non-arbitrariness'],
    strength: PHI_INV
  });

  state.concepts.set('adjudication', {
    name: 'Adjudication',
    question: 'How do/should judges decide cases?',
    models: {
      formalist: 'Mechanical application of rules',
      realist: 'Judges make law based on preferences',
      dworkin: 'Principled interpretation (Hercules)',
      pragmatist: 'Focus on consequences'
    },
    hardCases: 'Cases where law seems to run out',
    discretion: 'When and how much judicial discretion?',
    strength: PHI_INV
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register debates in legal philosophy
 */
function registerDebates() {
  state.debates.set('law-morality', {
    name: 'Law and Morality',
    question: 'What is the relationship between law and morality?',
    positions: {
      naturalLaw: 'Necessary connection; unjust law not law',
      positivism: 'Conceptually separate; law can be immoral',
      dworkin: 'Law includes moral principles'
    },
    hartFuller: 'Debate over Nazi laws: were they law?',
    practicalImport: 'Obligation to obey unjust laws?',
    strength: PHI_INV
  });

  state.debates.set('hart-dworkin', {
    name: 'Hart-Dworkin Debate',
    question: 'What is the nature of law?',
    hart: {
      rules: 'Law is system of rules',
      recognition: 'Rule of recognition determines validity',
      discretion: 'Judges have discretion in hard cases'
    },
    dworkin: {
      principles: 'Law includes principles, not just rules',
      rightAnswer: 'Hard cases have right answers',
      noDdiscretion: 'Strong discretion thesis is false'
    },
    status: 'Foundational debate in modern jurisprudence',
    strength: PHI_INV
  });

  state.debates.set('inclusive-exclusive', {
    name: 'Inclusive vs. Exclusive Positivism',
    question: 'Can morality be part of rule of recognition?',
    inclusive: {
      figures: ['Hart (late)', 'Coleman', 'Waluchow'],
      thesis: 'Morality can be criterion of legal validity'
    },
    exclusive: {
      figures: ['Raz', 'Shapiro'],
      thesis: 'Only source-based criteria; no morality'
    },
    stakes: 'What makes positivism distinctive?',
    strength: PHI_INV_2
  });

  state.debates.set('punishment', {
    name: 'Philosophy of Punishment',
    question: 'What justifies criminal punishment?',
    theories: {
      retributivism: 'Desert; wrongdoers deserve punishment',
      consequentialism: 'Deterrence, incapacitation, rehabilitation',
      expressivism: 'Punishment expresses condemnation',
      mixed: 'Multiple justifications'
    },
    issues: ['Death penalty', 'Mass incarceration', 'Restorative justice'],
    strength: PHI_INV
  });

  state.stats.debatesRegistered = state.debates.size;
}

/**
 * Get a theory
 */
function getTheory(theoryId) {
  return state.theories.get(theoryId) || null;
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
 * Get a debate
 */
function getDebate(debateId) {
  return state.debates.get(debateId) || null;
}

/**
 * List all theories
 */
function listTheories() {
  return Array.from(state.theories.entries()).map(([id, t]) => ({ id, ...t }));
}

/**
 * List all concepts
 */
function listConcepts() {
  return Array.from(state.concepts.entries()).map(([id, c]) => ({ id, ...c }));
}

/**
 * Analyze legal question
 */
function analyzeLegal(question) {
  state.stats.analysesPerformed++;

  return {
    question,
    perspectives: {
      naturalLaw: 'What does morality require here?',
      positivist: 'What do enacted rules say?',
      realist: 'What will courts actually do?',
      dworkinian: 'What interpretation shows law in best light?'
    },
    jurisprudential: {
      validity: 'Is this valid law?',
      authority: 'Why does this law bind?',
      interpretation: 'How should this be interpreted?'
    },
    practical: {
      ruleOfLaw: 'Does this serve rule of law values?',
      rights: 'What rights are implicated?',
      justice: 'Is this just?'
    },
    cynicNote: '*head tilt* Law is or ought? Positivists separate; naturalists unite. φ-jurisprudence.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  PHILOSOPHY OF LAW ENGINE                Phase 44A      │
├─────────────────────────────────────────────────────────┤
│  Theories: ${String(state.stats.theoriesRegistered).padStart(3)}                                       │
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                       │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                       │
│  Debates: ${String(state.stats.debatesRegistered).padStart(3)}                                        │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Key Theories:                                          │
│    - Natural Law (Aquinas, Finnis)                      │
│    - Legal Positivism (Hart, Raz)                       │
│    - Interpretivism (Dworkin)                           │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *sniff* Lex iniusta non est lex? The debate continues. │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    theories: state.stats.theoriesRegistered,
    thinkers: state.stats.thinkersRegistered,
    concepts: state.stats.conceptsRegistered,
    debates: state.stats.debatesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getTheory,
  getThinker,
  getConcept,
  getDebate,
  listTheories,
  listConcepts,
  analyzeLegal,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
