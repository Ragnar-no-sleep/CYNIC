#!/usr/bin/env node

/**
 * Method Engine - Phase 35A
 * 
 * Philosophical methodology:
 * - Conceptual analysis (ordinary language, ideal language)
 * - Intuitions and their role
 * - Thought experiments
 * - Naturalism vs armchair philosophy
 * - Experimental philosophy
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
  methods: new Map(),
  analyses: [],
  stats: {
    methodsRegistered: 0,
    analysesPerformed: 0,
    debatesAnalyzed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'method-engine');

/**
 * Initialize method engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '35A' };
  }
  
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  registerMethods();
  
  state.initialized = true;
  return { status: 'initialized', phase: '35A', engine: 'method' };
}

/**
 * Register philosophical methods
 */
function registerMethods() {
  state.methods.set('conceptual-analysis', {
    name: 'Conceptual Analysis',
    description: 'Breaking down concepts into necessary and sufficient conditions',
    tradition: 'Analytic philosophy',
    practitioners: ['Moore', 'Russell', 'Early Wittgenstein', 'Chalmers'],
    procedure: [
      'Identify target concept (e.g., knowledge, justice)',
      'Propose necessary and sufficient conditions',
      'Test against intuitions and counterexamples',
      'Revise conditions as needed',
      'Achieve reflective equilibrium'
    ],
    examples: [
      { concept: 'Knowledge', analysis: 'Justified true belief (+ Gettier conditions)' },
      { concept: 'Free will', analysis: 'Ability to do otherwise (compatibilist/libertarian)' },
      { concept: 'Personal identity', analysis: 'Psychological/biological continuity' }
    ],
    criticisms: [
      'Concepts may lack necessary/sufficient conditions (family resemblance)',
      'Intuitions are unreliable',
      'Verbal disputes masquerading as substantive',
      'Naturalist challenge: why not study concepts empirically?'
    ],
    strength: PHI_INV
  });
  
  state.methods.set('intuition-method', {
    name: 'Appeal to Intuitions',
    description: 'Using pre-theoretical judgments as evidence',
    tradition: 'Widespread in philosophy',
    procedure: [
      'Present a case (often hypothetical)',
      'Elicit intuitive judgment',
      'Use intuition as evidence for/against theories',
      'Seek reflective equilibrium between intuitions and theory'
    ],
    roleOfIntuitions: {
      evidential: 'Intuitions provide defeasible evidence',
      methodological: 'Intuitions guide theory construction',
      dialectical: 'Shared intuitions constrain debate'
    },
    problems: [
      { name: 'Reliability', issue: 'Are intuitions truth-tracking?' },
      { name: 'Diversity', issue: 'Intuitions vary across cultures and individuals' },
      { name: 'Expertise', issue: 'Do philosophers have better intuitions?' },
      { name: 'Explanation', issue: 'Why should intuitions track truth?' }
    ],
    experimentalPhilosophy: {
      finding: 'Intuitions vary with demographic factors',
      implication: 'Challenges universal reliance on intuitions'
    },
    strength: PHI_INV_2
  });
  
  state.methods.set('thought-experiments', {
    name: 'Thought Experiments',
    description: 'Hypothetical scenarios designed to test theories',
    tradition: 'Ancient to present',
    famousExamples: [
      { name: 'Trolley Problem', domain: 'Ethics', philosopher: 'Foot/Thomson' },
      { name: 'Chinese Room', domain: 'Mind', philosopher: 'Searle' },
      { name: 'Twin Earth', domain: 'Language', philosopher: 'Putnam' },
      { name: 'Veil of Ignorance', domain: 'Political', philosopher: 'Rawls' },
      { name: 'Zombie', domain: 'Consciousness', philosopher: 'Chalmers' },
      { name: 'Experience Machine', domain: 'Ethics', philosopher: 'Nozick' }
    ],
    function: [
      'Isolate relevant variables',
      'Test necessary conditions',
      'Reveal hidden assumptions',
      'Pump intuitions'
    ],
    criticisms: [
      'Scenarios may be impossible or incoherent',
      'Intuitions about bizarre cases unreliable',
      'Real-world complexity ignored',
      'Framing effects influence responses'
    ],
    strength: PHI_INV
  });
  
  state.methods.set('naturalism', {
    name: 'Philosophical Naturalism',
    description: 'Philosophy should be continuous with science',
    tradition: 'Quine, Kornblith, experimental philosophy',
    variants: {
      methodological: 'Philosophy should use scientific methods',
      substantive: 'Only natural entities exist',
      replacement: 'Science should replace philosophy'
    },
    quine: {
      claim: 'Philosophy is continuous with science',
      rejection: 'No first philosophy; no a priori knowledge',
      webOfBelief: 'All beliefs revisable in light of experience'
    },
    experimentalPhilosophy: {
      method: 'Empirical study of philosophical intuitions',
      findings: [
        'Cross-cultural variation in intuitions',
        'Order effects and framing effects',
        'Expertise does not eliminate variation'
      ],
      implications: 'Challenges armchair methodology'
    },
    criticisms: [
      'Science presupposes philosophical concepts',
      'Normative questions cannot be settled empirically',
      'Self-defeating if naturalism itself is a priori'
    ],
    strength: PHI_INV_2
  });
  
  state.methods.set('phenomenology', {
    name: 'Phenomenological Method',
    description: 'Careful description of conscious experience',
    tradition: 'Husserl, Heidegger, Merleau-Ponty',
    procedure: [
      'Epoché: Bracket natural attitude',
      'Reduction: Focus on phenomena as experienced',
      'Description: Describe essential structures',
      'Eidetic variation: Identify invariant features'
    ],
    contributions: [
      'Intentionality',
      'Embodied cognition',
      'Lifeworld',
      'Being-in-the-world'
    ],
    criticisms: [
      'Results not intersubjectively verifiable',
      'Introspection unreliable',
      'Jargon-heavy and obscure'
    ],
    strength: PHI_INV_2
  });
  
  state.methods.set('formal-methods', {
    name: 'Formal Methods',
    description: 'Using logic and mathematics in philosophy',
    tradition: 'Frege, Russell, Carnap, modal logic',
    tools: [
      'First-order logic',
      'Modal logic',
      'Probability theory',
      'Decision theory',
      'Set theory',
      'Formal semantics'
    ],
    applications: [
      { domain: 'Metaphysics', tool: 'Modal logic', example: 'Possible worlds' },
      { domain: 'Epistemology', tool: 'Bayesianism', example: 'Belief revision' },
      { domain: 'Ethics', tool: 'Decision theory', example: 'Expected utility' },
      { domain: 'Language', tool: 'Model theory', example: 'Truth conditions' }
    ],
    advantages: [
      'Precision and clarity',
      'Reveals hidden assumptions',
      'Enables rigorous proofs',
      'Facilitates progress tracking'
    ],
    limitations: [
      'Formalization may distort concepts',
      'Garbage in, garbage out',
      'Not all philosophy formalizable'
    ],
    strength: PHI_INV
  });
  
  state.stats.methodsRegistered = state.methods.size;
}

/**
 * Get a method by ID
 */
function getMethod(methodId) {
  return state.methods.get(methodId) || null;
}

/**
 * List all methods
 */
function listMethods() {
  return Array.from(state.methods.entries()).map(([id, m]) => ({ id, ...m }));
}

/**
 * Analyze a philosophical argument's methodology
 */
function analyzeMethodology(options = {}) {
  state.stats.analysesPerformed++;
  
  const usesIntuitions = options.usesIntuitions !== false;
  const usesThoughtExperiments = options.usesThoughtExperiments || false;
  const usesFormalMethods = options.usesFormalMethods || false;
  const empiricalComponent = options.empiricalComponent || false;
  
  const methodsUsed = [];
  let totalStrength = 0;
  let count = 0;
  
  if (usesIntuitions) {
    methodsUsed.push('intuition-method');
    totalStrength += state.methods.get('intuition-method').strength;
    count++;
  }
  if (usesThoughtExperiments) {
    methodsUsed.push('thought-experiments');
    totalStrength += state.methods.get('thought-experiments').strength;
    count++;
  }
  if (usesFormalMethods) {
    methodsUsed.push('formal-methods');
    totalStrength += state.methods.get('formal-methods').strength;
    count++;
  }
  if (empiricalComponent) {
    methodsUsed.push('naturalism');
    totalStrength += state.methods.get('naturalism').strength;
    count++;
  }
  
  const averageStrength = count > 0 ? totalStrength / count : PHI_INV_3;
  const confidence = Math.min(averageStrength, PHI_INV);
  
  return {
    methodsUsed,
    methodologyAssessment: {
      intuitionDependence: usesIntuitions ? 'High' : 'Low',
      formalRigor: usesFormalMethods ? 'High' : 'Low',
      empiricalGrounding: empiricalComponent ? 'Present' : 'Absent',
      thoughtExperimentUse: usesThoughtExperiments ? 'Yes' : 'No'
    },
    averageStrength,
    confidence,
    recommendations: [
      usesIntuitions && !empiricalComponent ? 'Consider experimental philosophy findings' : null,
      !usesFormalMethods ? 'Formalization could increase precision' : null,
      usesThoughtExperiments ? 'Check for framing effects' : null
    ].filter(Boolean),
    cynicNote: '*head tilt* Method choice shapes conclusions. Be explicit about methodology.'
  };
}

/**
 * Analyze the role of intuitions
 */
function analyzeIntuitions() {
  state.stats.debatesAnalyzed++;
  
  return {
    question: 'What is the epistemic status of philosophical intuitions?',
    positions: {
      evidentialist: {
        claim: 'Intuitions are evidence',
        strength: 'Defeasible, like perception',
        proponents: ['Bealer', 'Sosa', 'Pust']
      },
      deflationist: {
        claim: 'Intuitions are just beliefs',
        strength: 'No special evidential status',
        proponents: ['Williamson', 'Deutsch']
      },
      eliminativist: {
        claim: 'Intuitions should be eliminated',
        strength: 'Replace with empirical methods',
        proponents: ['Experimental philosophers (some)']
      },
      restrictionist: {
        claim: 'Only expert intuitions matter',
        strength: 'Training improves reliability',
        proponents: ['Ludwig', 'Horvath']
      }
    },
    experimentalFindings: {
      culturalVariation: 'Gettier intuitions vary cross-culturally',
      orderEffects: 'Intuitions affected by order of presentation',
      framingEffects: 'Wording influences intuitive judgments',
      expertiseQuestion: 'Philosophers show similar biases'
    },
    cynicVerdict: '*sniff* Intuitions are data, not oracles. Handle with care.',
    confidence: PHI_INV_2
  };
}

/**
 * Compare philosophical methods
 */
function compareMethods() {
  const methods = Array.from(state.methods.values());
  
  return {
    comparison: methods.map(m => ({
      name: m.name,
      tradition: m.tradition,
      strength: m.strength,
      mainCriticism: m.criticisms?.[0] || 'Various'
    })),
    ranking: methods.sort((a, b) => b.strength - a.strength).map(m => m.name),
    recommendation: 'Methodological pluralism: combine methods appropriate to the question',
    cynicAdvice: 'No silver bullet method. Each has strengths and weaknesses.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  METHOD ENGINE                           Phase 35A     │
├─────────────────────────────────────────────────────────┤
│  Methods Registered: ${String(state.stats.methodsRegistered).padStart(3)}                             │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
│  Debates Analyzed: ${String(state.stats.debatesAnalyzed).padStart(3)}                               │
├─────────────────────────────────────────────────────────┤
│  Key Methods:                                           │
│    - Conceptual Analysis                                │
│    - Intuition Method                                   │
│    - Thought Experiments                                │
│    - Formal Methods                                     │
│    - Naturalism                                         │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *sniff* Method shapes conclusion                       │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    methods: state.stats.methodsRegistered,
    analyses: state.stats.analysesPerformed,
    debates: state.stats.debatesAnalyzed
  };
}

module.exports = {
  init,
  getMethod,
  listMethods,
  analyzeMethodology,
  analyzeIntuitions,
  compareMethods,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
