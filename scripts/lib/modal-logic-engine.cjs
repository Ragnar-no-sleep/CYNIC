#!/usr/bin/env node

/**
 * Modal Logic Engine - Phase 39A
 *
 * Modal logic and possible worlds:
 * - Necessity (□) and possibility (◇)
 * - Possible worlds semantics (Kripke)
 * - Modal realism (Lewis)
 * - Accessibility relations
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
  operators: new Map(),
  systems: new Map(),
  semantics: new Map(),
  philosophers: new Map(),
  analyses: [],
  stats: {
    operatorsRegistered: 0,
    systemsRegistered: 0,
    semanticsRegistered: 0,
    philosophersRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'modal-logic-engine');

/**
 * Initialize modal logic engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '39A' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerOperators();
  registerSystems();
  registerSemantics();
  registerPhilosophers();

  state.initialized = true;
  return { status: 'initialized', phase: '39A', engine: 'modal-logic' };
}

/**
 * Register modal operators
 */
function registerOperators() {
  state.operators.set('necessity', {
    name: 'Necessity',
    symbol: '□',
    reading: 'It is necessary that',
    alethic: 'True in all possible worlds',
    deontic: 'It is obligatory that (O)',
    epistemic: 'It is known that (K)',
    temporal: 'It will always be that (G)',
    dual: '□p ≡ ¬◇¬p',
    strength: PHI_INV
  });

  state.operators.set('possibility', {
    name: 'Possibility',
    symbol: '◇',
    reading: 'It is possible that',
    alethic: 'True in at least one possible world',
    deontic: 'It is permitted that (P)',
    epistemic: 'It is compatible with what is known (M)',
    temporal: 'It will sometime be that (F)',
    dual: '◇p ≡ ¬□¬p',
    strength: PHI_INV
  });

  state.operators.set('strict-conditional', {
    name: 'Strict Conditional',
    symbol: '⥽',
    reading: 'Strictly implies',
    definition: 'p ⥽ q ≡ □(p → q)',
    meaning: 'In all possible worlds, if p then q',
    contrast: 'Stronger than material conditional',
    lewisParadoxes: 'Avoids some but creates others',
    strength: PHI_INV_2
  });

  state.operators.set('counterfactual', {
    name: 'Counterfactual Conditional',
    symbol: '□→',
    reading: 'If it were the case that... then',
    definition: 'p □→ q: in closest p-worlds, q is true',
    lewis: 'Analyzed via similarity of possible worlds',
    stalnaker: 'Unique closest world (Stalnaker)',
    examples: [
      'If I had struck the match, it would have lit',
      'If kangaroos had no tails, they would topple over'
    ],
    strength: PHI_INV
  });

  state.stats.operatorsRegistered = state.operators.size;
}

/**
 * Register modal systems
 */
function registerSystems() {
  state.systems.set('K', {
    name: 'System K',
    namedAfter: 'Kripke',
    axiom: '□(p → q) → (□p → □q)',
    axiomName: 'Distribution axiom',
    rule: 'Necessitation: from ⊢p infer ⊢□p',
    accessibility: 'No constraints',
    description: 'Minimal normal modal logic',
    strength: PHI_INV
  });

  state.systems.set('T', {
    name: 'System T',
    axioms: ['K', '□p → p'],
    additionalAxiom: 'Truth axiom (T): □p → p',
    meaning: 'What is necessary is true',
    accessibility: 'Reflexive',
    description: 'If something is necessary, it is actual',
    strength: PHI_INV
  });

  state.systems.set('S4', {
    name: 'System S4',
    axioms: ['T', '□p → □□p'],
    additionalAxiom: 'Positive introspection (4): □p → □□p',
    meaning: 'What is necessary is necessarily necessary',
    accessibility: 'Reflexive and transitive',
    description: 'Iterated modalities collapse',
    strength: PHI_INV
  });

  state.systems.set('S5', {
    name: 'System S5',
    axioms: ['S4', '◇p → □◇p'],
    additionalAxiom: 'Negative introspection (5): ◇p → □◇p',
    meaning: 'What is possible is necessarily possible',
    accessibility: 'Reflexive, transitive, symmetric (equivalence)',
    description: 'All worlds accessible from all worlds',
    significance: 'Standard logic for metaphysical necessity',
    strength: PHI_INV
  });

  state.systems.set('D', {
    name: 'System D',
    axioms: ['K', '□p → ◇p'],
    additionalAxiom: 'Deontic axiom (D): □p → ◇p',
    meaning: 'If obligatory, then permitted',
    accessibility: 'Serial (every world accesses some world)',
    application: 'Deontic logic (obligations, permissions)',
    strength: PHI_INV_2
  });

  state.stats.systemsRegistered = state.systems.size;
}

/**
 * Register modal semantics
 */
function registerSemantics() {
  state.semantics.set('kripke', {
    name: 'Kripke Semantics',
    developer: 'Saul Kripke',
    components: {
      W: 'Set of possible worlds',
      R: 'Accessibility relation on W',
      V: 'Valuation function'
    },
    truthConditions: {
      necessity: '□p is true at w iff p is true at all w\' where wRw\'',
      possibility: '◇p is true at w iff p is true at some w\' where wRw\''
    },
    significance: 'Provided semantics for modal logic; proved completeness',
    strength: PHI_INV
  });

  state.semantics.set('possible-worlds', {
    name: 'Possible Worlds',
    question: 'What are possible worlds?',
    positions: {
      realism: 'Concrete existing worlds (Lewis)',
      ersatzism: 'Abstract representations (propositions, states)',
      fictionalism: 'Useful fictions for semantics'
    },
    lewisRealism: {
      thesis: 'Possible worlds are concrete like our world',
      indexical: 'Actual just means our world (indexical)',
      isolation: 'No causal or spatiotemporal relations between worlds'
    },
    strength: PHI_INV
  });

  state.semantics.set('accessibility', {
    name: 'Accessibility Relations',
    meaning: 'Which worlds are accessible from which',
    properties: {
      reflexive: 'wRw (every world accesses itself)',
      symmetric: 'if wRw\' then w\'Rw',
      transitive: 'if wRw\' and w\'Rw\'\' then wRw\'\'',
      serial: 'for all w, there exists w\' such that wRw\''
    },
    correspondence: {
      T: 'Reflexive',
      '4': 'Transitive',
      '5': 'Euclidean',
      D: 'Serial',
      S5: 'Equivalence relation'
    },
    strength: PHI_INV
  });

  state.semantics.set('rigid-designation', {
    name: 'Rigid Designation',
    developer: 'Kripke',
    definition: 'A term that refers to the same object in all possible worlds',
    examples: {
      rigid: 'Proper names (Aristotle), natural kind terms (water)',
      nonRigid: 'Definite descriptions (the teacher of Alexander)'
    },
    necessaryAPosteriori: {
      example: 'Water is H2O',
      explanation: 'Necessary (same in all worlds) but known empirically'
    },
    contingentAPriori: {
      example: 'The standard meter is one meter long',
      explanation: 'Known a priori but contingent'
    },
    strength: PHI_INV
  });

  state.stats.semanticsRegistered = state.semantics.size;
}

/**
 * Register modal logicians/philosophers
 */
function registerPhilosophers() {
  state.philosophers.set('kripke', {
    name: 'Saul Kripke',
    dates: '1940-2022',
    contributions: [
      'Kripke semantics for modal logic',
      'Rigid designation',
      'Necessary a posteriori truths',
      'Naming and Necessity'
    ],
    keyIdeas: [
      'Possible worlds as stipulated scenarios',
      'Names are rigid designators',
      'Necessity is metaphysical, not epistemic'
    ],
    influence: 'Revolutionized modal logic and philosophy of language',
    strength: PHI_INV
  });

  state.philosophers.set('lewis', {
    name: 'David Lewis',
    dates: '1941-2001',
    contributions: [
      'Modal realism',
      'Counterfactual conditionals',
      'Possible worlds analysis of modality'
    ],
    keyIdeas: [
      'Possible worlds are concrete realities',
      'Actuality is indexical',
      'Counterpart theory (no transworld identity)'
    ],
    works: ['On the Plurality of Worlds', 'Counterfactuals'],
    strength: PHI_INV
  });

  state.philosophers.set('plantinga', {
    name: 'Alvin Plantinga',
    dates: '1932-present',
    contributions: [
      'Modal ontological argument',
      'Transworld depravity',
      'Actualism about possible worlds'
    ],
    keyIdeas: [
      'Possible worlds as maximal states of affairs',
      'Individual essences',
      'Serious actualism'
    ],
    strength: PHI_INV_2
  });

  state.stats.philosophersRegistered = state.philosophers.size;
}

/**
 * Get an operator
 */
function getOperator(operatorId) {
  return state.operators.get(operatorId) || null;
}

/**
 * Get a system
 */
function getSystem(systemId) {
  return state.systems.get(systemId) || null;
}

/**
 * Get semantics
 */
function getSemantics(semanticsId) {
  return state.semantics.get(semanticsId) || null;
}

/**
 * Get a philosopher
 */
function getPhilosopher(philosopherId) {
  return state.philosophers.get(philosopherId) || null;
}

/**
 * List all systems
 */
function listSystems() {
  return Array.from(state.systems.entries()).map(([id, s]) => ({ id, ...s }));
}

/**
 * Analyze modal claim
 */
function analyzeModalClaim(claim) {
  state.stats.analysesPerformed++;

  return {
    claim,
    questions: {
      type: 'Is this alethic, epistemic, deontic, or temporal necessity?',
      scope: 'What is the scope of the modal operator?',
      deReDicto: 'Is this de re (about the thing) or de dicto (about the saying)?'
    },
    analysis: {
      kripkean: 'In which possible worlds is this true?',
      lewisian: 'How close are the nearest worlds where this is true/false?',
      accessibility: 'What accessibility relation is assumed?'
    },
    systemChoice: {
      S5: 'Use for metaphysical necessity',
      S4: 'Use for provability or knowledge',
      D: 'Use for deontic (obligation)',
      T: 'Use when necessity implies truth'
    },
    cynicNote: '*head tilt* Necessity in all possible worlds? How many is that? φ says: uncertain.',
    confidence: PHI_INV_2
  };
}

/**
 * Compare modal systems
 */
function compareSystems(sys1, sys2) {
  const s1 = state.systems.get(sys1);
  const s2 = state.systems.get(sys2);

  if (!s1 || !s2) return { error: 'System not found' };

  return {
    systems: [s1.name, s2.name],
    comparison: {
      s1: { accessibility: s1.accessibility, description: s1.description },
      s2: { accessibility: s2.accessibility, description: s2.description }
    },
    relationship: 'Stronger systems have more axioms, weaker accessibility',
    cynicObservation: '*sniff* More axioms means fewer worlds are possible. Trade-offs everywhere.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  MODAL LOGIC ENGINE                      Phase 39A      │
├─────────────────────────────────────────────────────────┤
│  Operators: ${String(state.stats.operatorsRegistered).padStart(3)}                                      │
│  Systems: ${String(state.stats.systemsRegistered).padStart(3)}                                        │
│  Semantics: ${String(state.stats.semanticsRegistered).padStart(3)}                                      │
│  Philosophers: ${String(state.stats.philosophersRegistered).padStart(3)}                                   │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Key Elements:                                          │
│    - □ (necessity) and ◇ (possibility)                  │
│    - Kripke semantics and possible worlds               │
│    - Systems: K, T, S4, S5, D                           │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *ears perk* Necessarily possible, possibly necessary   │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    operators: state.stats.operatorsRegistered,
    systems: state.stats.systemsRegistered,
    semantics: state.stats.semanticsRegistered,
    philosophers: state.stats.philosophersRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getOperator,
  getSystem,
  getSemantics,
  getPhilosopher,
  listSystems,
  analyzeModalClaim,
  compareSystems,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
