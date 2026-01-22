#!/usr/bin/env node

/**
 * Decision Theory Engine - Phase 39B
 *
 * Decision theory and rationality:
 * - Expected utility theory
 * - Bayesian decision theory
 * - Paradoxes (Allais, Ellsberg, Newcomb)
 * - Bounded rationality
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
  principles: new Map(),
  paradoxes: new Map(),
  frameworks: new Map(),
  thinkers: new Map(),
  analyses: [],
  stats: {
    principlesRegistered: 0,
    paradoxesRegistered: 0,
    frameworksRegistered: 0,
    thinkersRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'decision-theory-engine');

/**
 * Initialize decision theory engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '39B' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerPrinciples();
  registerParadoxes();
  registerFrameworks();
  registerThinkers();

  state.initialized = true;
  return { status: 'initialized', phase: '39B', engine: 'decision-theory' };
}

/**
 * Register decision principles
 */
function registerPrinciples() {
  state.principles.set('expected-utility', {
    name: 'Expected Utility Maximization',
    formula: 'EU(A) = Σ P(Oi|A) × U(Oi)',
    meaning: 'Choose the action with highest expected utility',
    components: {
      probability: 'P(Oi|A): probability of outcome given action',
      utility: 'U(Oi): utility (value) of outcome',
      expectation: 'Weighted sum of utilities by probabilities'
    },
    axioms: [
      'Completeness: can compare all options',
      'Transitivity: if A > B and B > C, then A > C',
      'Independence: preferences stable under mixing',
      'Continuity: no infinite preferences'
    ],
    status: 'Standard normative theory of rational choice',
    strength: PHI_INV
  });

  state.principles.set('dominance', {
    name: 'Dominance Principle',
    types: {
      strict: 'A strictly dominates B if A is better in all states',
      weak: 'A weakly dominates B if A is at least as good in all, better in some'
    },
    rule: 'Never choose a dominated option',
    status: 'Uncontroversial principle of rationality',
    caveat: 'Requires state-act independence',
    strength: PHI_INV
  });

  state.principles.set('sure-thing', {
    name: 'Sure-Thing Principle',
    author: 'Savage',
    statement: 'If you prefer A to B given E, and prefer A to B given not-E, prefer A to B unconditionally',
    intuition: 'If A is better no matter what, choose A',
    challenge: 'Violated in Allais and Ellsberg paradoxes',
    strength: PHI_INV
  });

  state.principles.set('bayesian-updating', {
    name: 'Bayesian Updating',
    formula: 'P(H|E) = P(E|H) × P(H) / P(E)',
    meaning: 'Update beliefs by conditioning on evidence',
    components: {
      prior: 'P(H): initial probability',
      likelihood: 'P(E|H): probability of evidence given hypothesis',
      posterior: 'P(H|E): updated probability'
    },
    normative: 'Rational agents update beliefs via Bayes\' rule',
    strength: PHI_INV
  });

  state.principles.set('minimax', {
    name: 'Minimax/Maximin',
    rule: 'Choose the action whose worst outcome is best',
    formula: 'Choose A where min(outcomes of A) is maximized',
    context: 'Decision under uncertainty (unknown probabilities)',
    critique: 'Too pessimistic; ignores probabilities',
    rawls: 'Used in Rawls\' veil of ignorance argument',
    strength: PHI_INV_2
  });

  state.stats.principlesRegistered = state.principles.size;
}

/**
 * Register decision paradoxes
 */
function registerParadoxes() {
  state.paradoxes.set('allais', {
    name: 'Allais Paradox',
    author: 'Maurice Allais',
    year: 1953,
    setup: {
      choice1: {
        A: '100% chance of $1 million',
        B: '89% $1M, 10% $5M, 1% nothing'
      },
      choice2: {
        C: '11% $1M, 89% nothing',
        D: '10% $5M, 90% nothing'
      }
    },
    commonChoice: 'Most choose A over B, but D over C',
    problem: 'Violates independence axiom and expected utility',
    explanation: 'Certainty effect: overweight certain outcomes',
    strength: PHI_INV
  });

  state.paradoxes.set('ellsberg', {
    name: 'Ellsberg Paradox',
    author: 'Daniel Ellsberg',
    year: 1961,
    setup: {
      urn: '30 red balls, 60 balls black or yellow (unknown ratio)',
      choice1: {
        A: 'Win $100 if red',
        B: 'Win $100 if black'
      },
      choice2: {
        C: 'Win $100 if red or yellow',
        D: 'Win $100 if black or yellow'
      }
    },
    commonChoice: 'Most choose A over B, but D over C',
    problem: 'Violates sure-thing principle',
    explanation: 'Ambiguity aversion: dislike unknown probabilities',
    strength: PHI_INV
  });

  state.paradoxes.set('newcomb', {
    name: 'Newcomb\'s Problem',
    author: 'William Newcomb',
    setup: {
      predictor: 'Near-perfect predictor of your choices',
      boxes: 'Box A: $1000, Box B: $1M or $0',
      rule: 'If predictor predicted you take both, Box B is empty',
      choice: 'Take both boxes or just Box B?'
    },
    positions: {
      onebox: 'Take only B (evidential decision theory)',
      twobox: 'Take both (causal decision theory)'
    },
    significance: 'Splits evidential and causal decision theory',
    unresolved: 'No consensus on correct answer',
    strength: PHI_INV
  });

  state.paradoxes.set('st-petersburg', {
    name: 'St. Petersburg Paradox',
    author: 'Daniel Bernoulli',
    year: 1738,
    setup: {
      game: 'Flip coin until heads; pay $2^n where n is number of flips',
      expectedValue: '1 + 1 + 1 + ... = ∞',
      question: 'How much would you pay to play?'
    },
    problem: 'Expected value is infinite, but few would pay much',
    solutions: {
      diminishingUtility: 'Utility of money is logarithmic (Bernoulli)',
      boundedUtility: 'Utility function is bounded',
      riskAversion: 'People are risk averse'
    },
    strength: PHI_INV
  });

  state.paradoxes.set('toxin', {
    name: 'Toxin Puzzle',
    author: 'Gregory Kavka',
    setup: {
      offer: '$1 million if you intend tonight to drink a toxin tomorrow',
      toxin: 'Causes one day of illness, no lasting harm',
      catch: 'You must intend tonight; drinking is optional tomorrow'
    },
    problem: 'Can you intend to do what you know you won\'t do?',
    significance: 'Challenges connection between intention and action',
    strength: PHI_INV_2
  });

  state.stats.paradoxesRegistered = state.paradoxes.size;
}

/**
 * Register decision frameworks
 */
function registerFrameworks() {
  state.frameworks.set('causal-dt', {
    name: 'Causal Decision Theory',
    principle: 'Evaluate actions by their causal consequences',
    formula: 'Consider what would happen if you were to do A',
    counterfactual: 'Uses counterfactual conditionals',
    newcomb: 'Recommends two-boxing',
    advocates: 'Lewis, Gibbard, Harper',
    strength: PHI_INV
  });

  state.frameworks.set('evidential-dt', {
    name: 'Evidential Decision Theory',
    principle: 'Evaluate actions by what they indicate about outcomes',
    formula: 'Choose action with highest expected utility given you do it',
    conditional: 'Uses conditional probabilities',
    newcomb: 'Recommends one-boxing',
    advocates: 'Jeffrey',
    strength: PHI_INV
  });

  state.frameworks.set('bounded-rationality', {
    name: 'Bounded Rationality',
    author: 'Herbert Simon',
    thesis: 'Real agents have limited cognitive resources',
    concepts: {
      satisficing: 'Choose good enough option, not optimal',
      heuristics: 'Simple rules that work well in practice',
      searchCost: 'Finding optimal solution may cost more than it\'s worth'
    },
    contrast: 'Challenges idealized expected utility maximization',
    influence: 'Behavioral economics, AI',
    strength: PHI_INV
  });

  state.frameworks.set('prospect-theory', {
    name: 'Prospect Theory',
    authors: 'Kahneman and Tversky',
    year: 1979,
    features: {
      referencePoint: 'Outcomes evaluated relative to reference point',
      lossAversion: 'Losses loom larger than gains',
      diminishingSensitivity: 'Marginal impact decreases with magnitude',
      probabilityWeighting: 'Overweight small, underweight large probabilities'
    },
    sFunction: 'S-shaped value function: concave for gains, convex for losses',
    descriptive: 'How people actually decide (not normative)',
    strength: PHI_INV
  });

  state.frameworks.set('regret-theory', {
    name: 'Regret Theory',
    authors: 'Loomes and Sugden',
    principle: 'People anticipate and minimize future regret',
    mechanism: 'Compare outcome to what would have happened otherwise',
    predictions: 'Explains Allais-type choices',
    strength: PHI_INV_2
  });

  state.stats.frameworksRegistered = state.frameworks.size;
}

/**
 * Register decision theorists
 */
function registerThinkers() {
  state.thinkers.set('von-neumann', {
    name: 'John von Neumann',
    dates: '1903-1957',
    contributions: [
      'Expected utility theory (with Morgenstern)',
      'Game theory foundations',
      'Axiomatic approach to utility'
    ],
    work: 'Theory of Games and Economic Behavior (1944)',
    strength: PHI_INV
  });

  state.thinkers.set('savage', {
    name: 'Leonard Savage',
    dates: '1917-1971',
    contributions: [
      'Subjective expected utility',
      'Sure-thing principle',
      'Bayesian decision theory foundations'
    ],
    work: 'The Foundations of Statistics (1954)',
    strength: PHI_INV
  });

  state.thinkers.set('kahneman', {
    name: 'Daniel Kahneman',
    dates: '1934-2024',
    contributions: [
      'Prospect theory (with Tversky)',
      'Heuristics and biases',
      'Behavioral economics'
    ],
    nobelPrize: 2002,
    work: 'Thinking, Fast and Slow',
    strength: PHI_INV
  });

  state.thinkers.set('simon', {
    name: 'Herbert Simon',
    dates: '1916-2001',
    contributions: [
      'Bounded rationality',
      'Satisficing',
      'Administrative decision making'
    ],
    nobelPrize: 1978,
    influence: 'AI, organizational theory, economics',
    strength: PHI_INV
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Get a principle
 */
function getPrinciple(principleId) {
  return state.principles.get(principleId) || null;
}

/**
 * Get a paradox
 */
function getParadox(paradoxId) {
  return state.paradoxes.get(paradoxId) || null;
}

/**
 * Get a framework
 */
function getFramework(frameworkId) {
  return state.frameworks.get(frameworkId) || null;
}

/**
 * Get a thinker
 */
function getThinker(thinkerId) {
  return state.thinkers.get(thinkerId) || null;
}

/**
 * List all paradoxes
 */
function listParadoxes() {
  return Array.from(state.paradoxes.entries()).map(([id, p]) => ({ id, ...p }));
}

/**
 * Analyze decision situation
 */
function analyzeDecision(situation) {
  state.stats.analysesPerformed++;

  return {
    situation,
    framework: {
      expectedUtility: 'What are the outcomes, probabilities, and utilities?',
      dominance: 'Does any option dominate?',
      causalVsEvidential: 'Does the choice affect or merely indicate outcomes?'
    },
    questions: {
      options: 'What are the available actions?',
      outcomes: 'What outcomes are possible?',
      probabilities: 'What are the probabilities (or are they unknown)?',
      utilities: 'What are the values/utilities of outcomes?'
    },
    biases: {
      certaintyEffect: 'Are you overweighting certain outcomes?',
      lossAversion: 'Are you overweighting potential losses?',
      ambiguityAversion: 'Are you avoiding unknown probabilities?',
      statusQuoBias: 'Are you favoring the current state?'
    },
    cynicNote: '*sniff* Rational choice assumes you know what you want. Do you? φ doubts.',
    confidence: PHI_INV_2
  };
}

/**
 * Compare decision theories
 */
function compareTheories() {
  return {
    question: 'How should we evaluate decisions?',
    positions: {
      expectedUtility: {
        normative: 'Ideal standard of rationality',
        criterion: 'Maximize expected utility',
        problems: 'Paradoxes, unrealistic assumptions'
      },
      causalDT: {
        focus: 'Causal consequences of action',
        newcomb: 'Two-box',
        strength: 'Respects causal intuitions'
      },
      evidentialDT: {
        focus: 'What action indicates about outcomes',
        newcomb: 'One-box',
        strength: 'Simpler, more unified'
      },
      boundedRationality: {
        focus: 'Realistic cognitive constraints',
        approach: 'Satisfice, use heuristics',
        strength: 'Descriptively accurate'
      }
    },
    cynicObservation: '*head tilt* All theories have paradoxes. Maybe rationality itself is bounded.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  DECISION THEORY ENGINE                  Phase 39B      │
├─────────────────────────────────────────────────────────┤
│  Principles: ${String(state.stats.principlesRegistered).padStart(3)}                                     │
│  Paradoxes: ${String(state.stats.paradoxesRegistered).padStart(3)}                                      │
│  Frameworks: ${String(state.stats.frameworksRegistered).padStart(3)}                                     │
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                       │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Key Elements:                                          │
│    - Expected utility maximization                      │
│    - Paradoxes: Allais, Ellsberg, Newcomb               │
│    - Bounded rationality and prospect theory            │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *head tilt* Maximize expected utility? If only...      │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    principles: state.stats.principlesRegistered,
    paradoxes: state.stats.paradoxesRegistered,
    frameworks: state.stats.frameworksRegistered,
    thinkers: state.stats.thinkersRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getPrinciple,
  getParadox,
  getFramework,
  getThinker,
  listParadoxes,
  analyzeDecision,
  compareTheories,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
