#!/usr/bin/env node

/**
 * Game Theory Engine - Phase 39C
 *
 * Game theory and strategic interaction:
 * - Nash equilibrium
 * - Classic games (Prisoner's Dilemma, Chicken, Stag Hunt)
 * - Cooperation and defection
 * - Evolutionary game theory
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
  games: new Map(),
  strategies: new Map(),
  thinkers: new Map(),
  analyses: [],
  stats: {
    conceptsRegistered: 0,
    gamesRegistered: 0,
    strategiesRegistered: 0,
    thinkersRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'game-theory-engine');

/**
 * Initialize game theory engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '39C' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerConcepts();
  registerGames();
  registerStrategies();
  registerThinkers();

  state.initialized = true;
  return { status: 'initialized', phase: '39C', engine: 'game-theory' };
}

/**
 * Register game theory concepts
 */
function registerConcepts() {
  state.concepts.set('nash-equilibrium', {
    name: 'Nash Equilibrium',
    definition: 'Strategy profile where no player can improve by unilaterally changing',
    formal: 'σ* is Nash iff for all i: uᵢ(σ*ᵢ, σ*₋ᵢ) ≥ uᵢ(σᵢ, σ*₋ᵢ) for all σᵢ',
    intuition: 'No one has an incentive to deviate',
    properties: {
      existence: 'Every finite game has at least one (possibly mixed)',
      uniqueness: 'Not guaranteed; games may have multiple equilibria',
      efficiency: 'Not guaranteed; may be Pareto-suboptimal'
    },
    types: {
      pure: 'Deterministic strategies',
      mixed: 'Probabilistic strategies'
    },
    significance: 'Central solution concept in non-cooperative game theory',
    strength: PHI_INV
  });

  state.concepts.set('pareto-efficiency', {
    name: 'Pareto Efficiency',
    definition: 'No one can be made better off without making someone worse off',
    formal: 'Outcome x is Pareto efficient iff no y exists where y ≥ᵢ x for all i and y >ⱼ x for some j',
    importance: 'Standard criterion for evaluating outcomes',
    problem: 'Nash equilibria may not be Pareto efficient (Prisoner\'s Dilemma)',
    strength: PHI_INV
  });

  state.concepts.set('dominant-strategy', {
    name: 'Dominant Strategy',
    definition: 'Strategy that is best regardless of what others do',
    types: {
      strictly: 'Better than all alternatives in all cases',
      weakly: 'At least as good in all cases, better in some'
    },
    equilibrium: 'If all players have dominant strategies, result is dominant strategy equilibrium',
    rarity: 'Most games don\'t have dominant strategies',
    strength: PHI_INV
  });

  state.concepts.set('common-knowledge', {
    name: 'Common Knowledge',
    definition: 'Everyone knows, everyone knows everyone knows, ad infinitum',
    formal: 'p is common knowledge iff Kᵢp, KᵢKⱼp, KᵢKⱼKₖp, ... for all i,j,k,...',
    role: 'Required for game-theoretic reasoning',
    examples: {
      coordinated: 'Common knowledge enables coordination',
      puzzles: 'Blue eyes puzzle, muddy children'
    },
    strength: PHI_INV
  });

  state.concepts.set('evolutionary-stability', {
    name: 'Evolutionarily Stable Strategy (ESS)',
    author: 'Maynard Smith',
    definition: 'Strategy that cannot be invaded by mutant strategy',
    formal: 'σ* is ESS iff for all mutants σ: u(σ*, σ*) > u(σ, σ*) or [u(σ*, σ*) = u(σ, σ*) and u(σ*, σ) > u(σ, σ)]',
    interpretation: 'Strategy that is stable under evolutionary pressure',
    relation: 'Every ESS is a Nash equilibrium, but not vice versa',
    strength: PHI_INV
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register classic games
 */
function registerGames() {
  state.games.set('prisoners-dilemma', {
    name: 'Prisoner\'s Dilemma',
    players: 2,
    story: 'Two prisoners, each can cooperate (stay silent) or defect (betray)',
    payoffs: {
      CC: [3, 3],
      CD: [0, 5],
      DC: [5, 0],
      DD: [1, 1]
    },
    payoffMeaning: 'T > R > P > S (Temptation > Reward > Punishment > Sucker)',
    nashEquilibrium: 'Both defect (DD)',
    paretoOptimal: 'Both cooperate (CC)',
    paradox: 'Rational individual choice leads to collectively suboptimal outcome',
    applications: ['Arms races', 'Climate change', 'Public goods', 'Price competition'],
    strength: PHI_INV
  });

  state.games.set('chicken', {
    name: 'Chicken (Hawk-Dove)',
    players: 2,
    story: 'Two drivers heading toward each other; each can swerve or stay',
    payoffs: {
      SS: [2, 2],
      SH: [1, 3],
      HS: [3, 1],
      HH: [0, 0]
    },
    nashEquilibria: ['SH', 'HS'],
    noSymmetric: 'No symmetric pure Nash equilibrium',
    applications: ['Nuclear brinkmanship', 'Labor negotiations', 'International conflicts'],
    antiCoordination: 'Players want to choose opposite actions',
    strength: PHI_INV
  });

  state.games.set('stag-hunt', {
    name: 'Stag Hunt',
    players: 2,
    story: 'Hunters can hunt stag (requires cooperation) or hare (individual)',
    payoffs: {
      SS: [4, 4],
      SH: [0, 3],
      HS: [3, 0],
      HH: [2, 2]
    },
    nashEquilibria: ['SS (stag)', 'HH (hare)'],
    tension: 'Payoff-dominant (SS) vs risk-dominant (HH)',
    theme: 'Trust and cooperation under uncertainty',
    rousseau: 'From Rousseau\'s parable about social cooperation',
    strength: PHI_INV
  });

  state.games.set('battle-of-sexes', {
    name: 'Battle of the Sexes',
    players: 2,
    story: 'Couple wants to meet, but prefer different venues',
    payoffs: {
      AA: [3, 2],
      AB: [0, 0],
      BA: [0, 0],
      BB: [2, 3]
    },
    nashEquilibria: ['AA', 'BB', 'mixed'],
    coordination: 'Pure coordination problem with distributional conflict',
    applications: ['Standards adoption', 'Meeting points', 'Convention formation'],
    strength: PHI_INV
  });

  state.games.set('matching-pennies', {
    name: 'Matching Pennies',
    players: 2,
    story: 'One wins if pennies match, other wins if different',
    payoffs: {
      HH: [1, -1],
      HT: [-1, 1],
      TH: [-1, 1],
      TT: [1, -1]
    },
    nashEquilibrium: 'Mixed: 50-50 each',
    zeroSum: 'Strictly competitive; one\'s gain is other\'s loss',
    noPureSolution: 'No pure strategy Nash equilibrium',
    strength: PHI_INV
  });

  state.games.set('ultimatum', {
    name: 'Ultimatum Game',
    players: 2,
    setup: 'Proposer offers split of $X; Responder accepts or rejects',
    gameTheory: 'Proposer should offer minimum; Responder should accept any positive amount',
    actualBehavior: 'Modal offer ~40%; offers <20% often rejected',
    interpretation: 'Fairness norms, spite, or reputation concerns',
    significance: 'Classic example of deviation from pure rationality',
    strength: PHI_INV
  });

  state.stats.gamesRegistered = state.games.size;
}

/**
 * Register strategies
 */
function registerStrategies() {
  state.strategies.set('tit-for-tat', {
    name: 'Tit for Tat',
    author: 'Anatol Rapoport',
    rule: 'Start by cooperating, then copy opponent\'s previous move',
    properties: {
      nice: 'Never defects first',
      retaliatory: 'Punishes defection immediately',
      forgiving: 'Returns to cooperation after punishment',
      clear: 'Easy for others to understand'
    },
    axelrod: 'Won Axelrod\'s iterated PD tournaments',
    success: 'Successful in iterated prisoner\'s dilemma',
    weakness: 'Vulnerable to noise (accidental defection cascades)',
    strength: PHI_INV
  });

  state.strategies.set('grim-trigger', {
    name: 'Grim Trigger',
    rule: 'Cooperate until opponent defects, then defect forever',
    properties: {
      nice: 'Starts cooperating',
      unforgiving: 'Never forgives defection',
      harsh: 'Maximum punishment'
    },
    effectiveness: 'Can sustain cooperation if discount factor high enough',
    weakness: 'Unforgiving; no recovery from mistakes',
    strength: PHI_INV_2
  });

  state.strategies.set('win-stay-lose-shift', {
    name: 'Win-Stay Lose-Shift',
    otherName: 'Pavlov',
    rule: 'If outcome was good, repeat; if bad, switch',
    properties: {
      simple: 'Easy to implement',
      adaptive: 'Responds to outcomes',
      exploitable: 'Can be exploited by always-defect'
    },
    robustness: 'Robust to noise in iterated games',
    strength: PHI_INV_2
  });

  state.strategies.set('mixed-strategy', {
    name: 'Mixed Strategy',
    definition: 'Randomize over pure strategies with specified probabilities',
    purpose: 'Make opponent indifferent; achieve equilibrium',
    calculation: 'Set opponent\'s expected payoffs equal across strategies',
    example: 'In matching pennies: play H and T with 50% each',
    interpretation: {
      randomization: 'Actual mixing',
      population: 'Population frequencies',
      uncertainty: 'Opponent\'s uncertainty about your choice'
    },
    strength: PHI_INV
  });

  state.stats.strategiesRegistered = state.strategies.size;
}

/**
 * Register game theorists
 */
function registerThinkers() {
  state.thinkers.set('nash', {
    name: 'John Nash',
    dates: '1928-2015',
    contributions: [
      'Nash equilibrium',
      'Bargaining theory',
      'Existence proof for equilibria'
    ],
    nobelPrize: 1994,
    significance: 'Foundational contributions to non-cooperative game theory',
    strength: PHI_INV
  });

  state.thinkers.set('von-neumann', {
    name: 'John von Neumann',
    dates: '1903-1957',
    contributions: [
      'Minimax theorem',
      'Theory of Games and Economic Behavior (with Morgenstern)',
      'Zero-sum game theory'
    ],
    significance: 'Founded game theory as a discipline',
    strength: PHI_INV
  });

  state.thinkers.set('schelling', {
    name: 'Thomas Schelling',
    dates: '1921-2016',
    contributions: [
      'Focal points (Schelling points)',
      'Commitment strategies',
      'Strategy of Conflict'
    ],
    nobelPrize: 2005,
    focalPoint: 'Salient solution that coordinates expectations',
    strength: PHI_INV
  });

  state.thinkers.set('axelrod', {
    name: 'Robert Axelrod',
    dates: '1943-present',
    contributions: [
      'Evolution of Cooperation',
      'Iterated PD tournaments',
      'Conditions for cooperation emergence'
    ],
    significance: 'Showed how cooperation can emerge among egoists',
    strength: PHI_INV
  });

  state.thinkers.set('maynard-smith', {
    name: 'John Maynard Smith',
    dates: '1920-2004',
    contributions: [
      'Evolutionarily stable strategy (ESS)',
      'Evolutionary game theory',
      'Application to biology'
    ],
    significance: 'Connected game theory to evolutionary biology',
    strength: PHI_INV
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Get a concept
 */
function getConcept(conceptId) {
  return state.concepts.get(conceptId) || null;
}

/**
 * Get a game
 */
function getGame(gameId) {
  return state.games.get(gameId) || null;
}

/**
 * Get a strategy
 */
function getStrategy(strategyId) {
  return state.strategies.get(strategyId) || null;
}

/**
 * Get a thinker
 */
function getThinker(thinkerId) {
  return state.thinkers.get(thinkerId) || null;
}

/**
 * List all games
 */
function listGames() {
  return Array.from(state.games.entries()).map(([id, g]) => ({ id, ...g }));
}

/**
 * Analyze strategic situation
 */
function analyzeStrategicSituation(situation) {
  state.stats.analysesPerformed++;

  return {
    situation,
    questions: {
      players: 'Who are the players?',
      strategies: 'What strategies are available to each?',
      payoffs: 'What are the payoffs for each outcome?',
      information: 'What does each player know?',
      timing: 'Is this simultaneous or sequential?'
    },
    analysis: {
      dominance: 'Are there dominated strategies to eliminate?',
      nashEquilibria: 'What are the Nash equilibria?',
      efficiency: 'Are equilibria Pareto efficient?',
      coordination: 'Is this a coordination problem?',
      conflict: 'Is this zero-sum or mixed-motive?'
    },
    gameType: {
      prisonersDilemma: 'Individual incentive conflicts with collective good?',
      coordination: 'Multiple equilibria, need to coordinate?',
      zeroSum: 'Strictly competitive?',
      mixed: 'Some common and some conflicting interests?'
    },
    cynicNote: '*sniff* Game theory assumes rationality. CYNIC assumes bounded rationality. φ-adjust accordingly.',
    confidence: PHI_INV_2
  };
}

/**
 * Analyze cooperation problem
 */
function analyzeCooperation(context) {
  return {
    context,
    conditions: {
      repeated: 'Is interaction repeated? Shadow of future enables cooperation',
      observable: 'Can defection be observed and punished?',
      communication: 'Can players communicate and commit?',
      reputation: 'Do reputation effects matter?'
    },
    mechanisms: {
      reciprocity: 'Tit-for-tat and conditional cooperation',
      punishment: 'Ability to punish defectors',
      commitment: 'Binding commitments if available',
      norms: 'Social norms and internalized cooperation'
    },
    axelrodConditions: [
      'Enlarge shadow of future',
      'Change payoffs (increase cost of defection)',
      'Teach reciprocity',
      'Improve recognition'
    ],
    cynicObservation: '*head tilt* Cooperation is fragile. Trust but verify.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  GAME THEORY ENGINE                      Phase 39C      │
├─────────────────────────────────────────────────────────┤
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                      │
│  Games: ${String(state.stats.gamesRegistered).padStart(3)}                                          │
│  Strategies: ${String(state.stats.strategiesRegistered).padStart(3)}                                    │
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                       │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Key Elements:                                          │
│    - Nash equilibrium and solution concepts             │
│    - Classic games: PD, Chicken, Stag Hunt              │
│    - Strategies: Tit-for-Tat, Grim Trigger              │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *GROWL* Defect once, shame on you. Defect twice...     │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    concepts: state.stats.conceptsRegistered,
    games: state.stats.gamesRegistered,
    strategies: state.stats.strategiesRegistered,
    thinkers: state.stats.thinkersRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getConcept,
  getGame,
  getStrategy,
  getThinker,
  listGames,
  analyzeStrategicSituation,
  analyzeCooperation,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
