#!/usr/bin/env node

/**
 * Mathematical Practice Engine - Phase 41C
 *
 * Philosophy of mathematical practice:
 * - Nature of proof
 * - Mathematical discovery and creativity
 * - Beauty and elegance in mathematics
 * - Mathematical explanation
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
  concepts: new Map(),
  proofTypes: new Map(),
  beautyAspects: new Map(),
  practices: new Map(),
  analyses: [],
  stats: {
    conceptsRegistered: 0,
    proofTypesRegistered: 0,
    beautyAspectsRegistered: 0,
    practicesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'math-practice-engine');

/**
 * Initialize mathematical practice engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '41C' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerConcepts();
  registerProofTypes();
  registerBeautyAspects();
  registerPractices();

  state.initialized = true;
  return { status: 'initialized', phase: '41C', engine: 'math-practice' };
}

/**
 * Register core concepts
 */
function registerConcepts() {
  state.concepts.set('proof', {
    name: 'Mathematical Proof',
    nature: 'Rigorous demonstration that a statement follows from axioms',
    functions: [
      'Verification: establishing truth',
      'Explanation: showing why something is true',
      'Systematization: organizing knowledge',
      'Discovery: revealing new truths',
      'Communication: sharing knowledge'
    ],
    types: ['Direct', 'Indirect', 'Constructive', 'Probabilistic'],
    debate: {
      formal: 'Proof is derivation in formal system',
      social: 'Proof is what mathematicians accept',
      cognitive: 'Proof produces understanding'
    },
    lakatos: 'Proofs and Refutations: proofs are tentative, subject to revision',
    strength: PHI_INV
  });

  state.concepts.set('understanding', {
    name: 'Mathematical Understanding',
    question: 'What is it to understand a mathematical fact?',
    aspects: [
      'Grasping why, not just that',
      'Seeing connections to other facts',
      'Being able to use in new contexts',
      'Explaining to others'
    ],
    proofRole: 'Good proofs produce understanding, not just conviction',
    explanation: 'Understanding involves grasping explanatory structure',
    strength: PHI_INV
  });

  state.concepts.set('discovery', {
    name: 'Mathematical Discovery',
    question: 'How do mathematicians discover new truths?',
    methods: {
      conjecture: 'Formulating hypotheses',
      analogy: 'Drawing parallels between domains',
      generalization: 'Extending known results',
      specialization: 'Examining special cases',
      visualization: 'Geometric intuition'
    },
    polya: 'How to Solve It: heuristics for discovery',
    lakatos: 'Proofs and refutations as method',
    platonistView: 'Discovery of pre-existing truths',
    constructivistView: 'Invention through construction',
    strength: PHI_INV
  });

  state.concepts.set('explanation', {
    name: 'Mathematical Explanation',
    question: 'Can proofs explain why mathematical facts hold?',
    debate: {
      yes: 'Some proofs are explanatory, others merely verify',
      no: 'Math is about logical relations, not causation'
    },
    examples: {
      explanatory: 'Proofs that reveal underlying structure',
      nonExplanatory: 'Proofs by exhaustive case checking'
    },
    steiner: 'Explanatory proofs make use of characterizing properties',
    lange: 'Explanatory proofs show necessity',
    strength: PHI_INV
  });

  state.concepts.set('intuition', {
    name: 'Mathematical Intuition',
    question: 'What role does intuition play in mathematics?',
    types: {
      geometric: 'Spatial visualization',
      algebraic: 'Pattern recognition in symbols',
      conceptual: 'Grasping abstract relationships'
    },
    reliability: {
      successes: 'Guides discovery, suggests conjectures',
      failures: 'Can be misleading (e.g., Weierstrass function)'
    },
    kant: 'Mathematics grounded in pure intuition',
    godelView: 'Mathematical intuition accesses abstract reality',
    strength: PHI_INV
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register proof types
 */
function registerProofTypes() {
  state.proofTypes.set('direct', {
    name: 'Direct Proof',
    method: 'Start from premises, derive conclusion by valid steps',
    structure: 'Assume P; derive Q; conclude P → Q',
    advantage: 'Often most illuminating',
    example: 'Proving sum of two evens is even',
    strength: PHI_INV
  });

  state.proofTypes.set('contradiction', {
    name: 'Proof by Contradiction',
    method: 'Assume negation of conclusion; derive contradiction',
    structure: 'Assume ¬Q; derive contradiction; conclude Q',
    classical: 'Uses law of excluded middle',
    intuitionist: 'Rejected for positive existence claims',
    example: 'Irrationality of √2',
    strength: PHI_INV
  });

  state.proofTypes.set('induction', {
    name: 'Mathematical Induction',
    method: 'Prove base case and inductive step',
    structure: 'P(0) and ∀n(P(n) → P(n+1)) imply ∀nP(n)',
    variants: {
      strong: 'Assume all cases below n',
      structural: 'On recursively defined structures',
      transfinite: 'Over ordinals'
    },
    justification: 'Depends on well-ordering of natural numbers',
    strength: PHI_INV
  });

  state.proofTypes.set('constructive', {
    name: 'Constructive Proof',
    method: 'Explicitly construct the claimed object',
    feature: 'Provides algorithm or witness',
    intuitionism: 'Only acceptable proof of existence',
    advantage: 'Computationally meaningful',
    example: 'Constructing a root of a polynomial',
    strength: PHI_INV
  });

  state.proofTypes.set('probabilistic', {
    name: 'Probabilistic Proof',
    method: 'Use randomness to establish high probability of truth',
    example: 'Primality testing (Miller-Rabin)',
    debate: {
      proponents: 'Practically certain; error probability negligible',
      critics: 'Not genuine proof; doesn\'t establish certainty'
    },
    computerProof: 'Related debates about computer-assisted proofs',
    strength: PHI_INV_2
  });

  state.proofTypes.set('visual', {
    name: 'Visual/Diagrammatic Proof',
    method: 'Use diagrams or pictures as essential proof element',
    examples: ['Pythagorean theorem diagrams', 'Proof of 1+2+...+n formula'],
    debate: {
      skeptics: 'Diagrams are merely heuristic',
      proponents: 'Diagrams can be rigorous'
    },
    modern: 'Growing interest in formal diagrammatic reasoning',
    strength: PHI_INV_2
  });

  state.stats.proofTypesRegistered = state.proofTypes.size;
}

/**
 * Register beauty aspects
 */
function registerBeautyAspects() {
  state.beautyAspects.set('elegance', {
    name: 'Elegance',
    description: 'Achieving much with minimal means',
    characteristics: [
      'Brevity without obscurity',
      'Surprising economy',
      'Deep insight with simple tools'
    ],
    examples: ['Euclid\'s proof of infinite primes', 'One-line proofs'],
    hardy: 'Beauty is the first test; there is no permanent place for ugly mathematics',
    strength: PHI_INV
  });

  state.beautyAspects.set('surprise', {
    name: 'Surprise',
    description: 'Unexpected connections or results',
    characteristics: [
      'Connecting seemingly unrelated domains',
      'Counterintuitive results',
      'Unexpected simplicity'
    ],
    examples: ['e^(iπ) + 1 = 0', 'Quadratic reciprocity', 'Monster group and j-function'],
    role: 'Surprise indicates depth',
    strength: PHI_INV
  });

  state.beautyAspects.set('depth', {
    name: 'Depth',
    description: 'Revealing fundamental structure',
    characteristics: [
      'Connects to many other results',
      'Reveals underlying patterns',
      'Has far-reaching consequences'
    ],
    examples: ['Fundamental theorem of calculus', 'Galois theory'],
    contrast: 'Shallow results are isolated, deep results connect',
    strength: PHI_INV
  });

  state.beautyAspects.set('inevitability', {
    name: 'Inevitability',
    description: 'Feeling that it couldn\'t be otherwise',
    characteristics: [
      'Each step feels necessary',
      'The conclusion seems forced',
      'Natural, not contrived'
    ],
    explanation: 'Good proofs make result seem inevitable',
    rota: 'Enlightenment: the moment when proof becomes obvious',
    strength: PHI_INV
  });

  state.beautyAspects.set('unity', {
    name: 'Unity',
    description: 'Bringing together diverse phenomena',
    characteristics: [
      'Unification of disparate areas',
      'Common framework for different problems',
      'Revealing hidden connections'
    ],
    examples: ['Langlands program', 'Category theory unification'],
    value: 'Unity suggests deep mathematical truth',
    strength: PHI_INV
  });

  state.stats.beautyAspectsRegistered = state.beautyAspects.size;
}

/**
 * Register mathematical practices
 */
function registerPractices() {
  state.practices.set('conjecture', {
    name: 'Conjecture Formation',
    description: 'Formulating hypotheses for investigation',
    methods: [
      'Pattern recognition',
      'Analogy with known results',
      'Computational exploration',
      'Generalization from examples'
    ],
    famous: ['Riemann Hypothesis', 'Goldbach Conjecture', 'P vs NP'],
    lakatos: 'Conjectures drive mathematical progress',
    strength: PHI_INV
  });

  state.practices.set('refutation', {
    name: 'Refutation and Counterexample',
    description: 'Disproving conjectures',
    methods: [
      'Finding counterexamples',
      'Identifying hidden assumptions',
      'Boundary cases'
    ],
    lakatos: 'Proofs and Refutations: math progresses through refutation',
    value: 'Failure teaches as much as success',
    strength: PHI_INV
  });

  state.practices.set('generalization', {
    name: 'Generalization',
    description: 'Extending results to broader contexts',
    methods: [
      'Removing unnecessary hypotheses',
      'Abstracting common structure',
      'Finding the "right" level of generality'
    ],
    examples: ['Linear algebra generalizing Euclidean geometry', 'Category theory'],
    balance: 'Too general may lose content; too specific may miss patterns',
    strength: PHI_INV
  });

  state.practices.set('definition', {
    name: 'Definition Crafting',
    description: 'Formulating precise mathematical concepts',
    criteria: [
      'Captures intended phenomena',
      'Enables useful theorems',
      'Neither too broad nor too narrow'
    ],
    examples: ['Definition of continuity', 'Limit concept', 'Group axioms'],
    lakatos: 'Definitions are refined through proofs and counterexamples',
    strength: PHI_INV
  });

  state.practices.set('collaboration', {
    name: 'Mathematical Collaboration',
    description: 'Working together on mathematical problems',
    modes: [
      'Co-authorship',
      'Building on others\' work',
      'Refereeing and verification',
      'Open problems and challenges'
    ],
    erdos: 'Erdős number measures collaboration distance',
    polymath: 'Polymath projects: massive online collaboration',
    social: 'Mathematics as social practice',
    strength: PHI_INV_2
  });

  state.stats.practicesRegistered = state.practices.size;
}

/**
 * Get a concept
 */
function getConcept(conceptId) {
  return state.concepts.get(conceptId) || null;
}

/**
 * Get a proof type
 */
function getProofType(proofTypeId) {
  return state.proofTypes.get(proofTypeId) || null;
}

/**
 * Get a beauty aspect
 */
function getBeautyAspect(aspectId) {
  return state.beautyAspects.get(aspectId) || null;
}

/**
 * Get a practice
 */
function getPractice(practiceId) {
  return state.practices.get(practiceId) || null;
}

/**
 * List all proof types
 */
function listProofTypes() {
  return Array.from(state.proofTypes.entries()).map(([id, p]) => ({ id, ...p }));
}

/**
 * List all beauty aspects
 */
function listBeautyAspects() {
  return Array.from(state.beautyAspects.entries()).map(([id, b]) => ({ id, ...b }));
}

/**
 * Analyze proof
 */
function analyzeProof(description) {
  state.stats.analysesPerformed++;

  return {
    description,
    questions: {
      type: 'What type of proof is this?',
      validity: 'Is every step justified?',
      explanation: 'Does it explain why the result holds?',
      beauty: 'Is it elegant, surprising, or deep?'
    },
    evaluation: {
      verification: 'Does it establish truth with certainty?',
      understanding: 'Does it produce understanding?',
      generalizability: 'Can the method be extended?'
    },
    beautyCheck: {
      elegance: 'Is it economical?',
      surprise: 'Are there unexpected connections?',
      depth: 'Does it reveal structure?',
      inevitability: 'Does conclusion feel necessary?'
    },
    cynicNote: '*head tilt* Good proofs don\'t just convince; they illuminate. φ-beauty is economy.',
    confidence: PHI_INV_2
  };
}

/**
 * Evaluate mathematical beauty
 */
function evaluateBeauty(item) {
  state.stats.analysesPerformed++;

  return {
    item,
    dimensions: {
      elegance: { question: 'Does it achieve much with little?', weight: PHI_INV },
      surprise: { question: 'Are there unexpected connections?', weight: PHI_INV_2 },
      depth: { question: 'Does it reveal fundamental structure?', weight: PHI_INV },
      unity: { question: 'Does it connect disparate areas?', weight: PHI_INV_2 },
      inevitability: { question: 'Does it seem necessary?', weight: PHI_INV_2 }
    },
    hardy: '"Beauty is the first test"',
    euler: 'e^(iπ) + 1 = 0 — the most beautiful equation?',
    subjectivity: 'Beauty judgments vary among mathematicians',
    cynicNote: '*ears perk* Mathematical beauty: unity in diversity, simplicity in complexity.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  MATHEMATICAL PRACTICE ENGINE            Phase 41C      │
├─────────────────────────────────────────────────────────┤
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                      │
│  Proof Types: ${String(state.stats.proofTypesRegistered).padStart(3)}                                   │
│  Beauty Aspects: ${String(state.stats.beautyAspectsRegistered).padStart(3)}                                │
│  Practices: ${String(state.stats.practicesRegistered).padStart(3)}                                     │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Key Topics:                                            │
│    - Proof (verification, explanation)                  │
│    - Beauty (elegance, surprise, depth)                 │
│    - Discovery (conjecture, refutation)                 │
│    - Understanding (why, not just that)                 │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *tail wag* Beauty is the first test (Hardy)            │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    concepts: state.stats.conceptsRegistered,
    proofTypes: state.stats.proofTypesRegistered,
    beautyAspects: state.stats.beautyAspectsRegistered,
    practices: state.stats.practicesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getConcept,
  getProofType,
  getBeautyAspect,
  getPractice,
  listProofTypes,
  listBeautyAspects,
  analyzeProof,
  evaluateBeauty,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
