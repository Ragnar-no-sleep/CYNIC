/**
 * Argument Analyzer - Toulmin Model & Dialectical Structure
 *
 * Philosophy: Stephen Toulmin's model of practical reasoning goes beyond
 * formal logic to capture how arguments actually work. Claims are supported
 * by data through warrants, with qualifiers and rebuttals acknowledged.
 *
 * Key concepts:
 * - Claim: The conclusion being argued for
 * - Data/Grounds: Evidence supporting the claim
 * - Warrant: Reasoning connecting data to claim
 * - Backing: Support for the warrant itself
 * - Qualifier: Strength modifier (probably, certainly)
 * - Rebuttal: Conditions where claim doesn't hold
 *
 * Dialectical structure:
 * - Thesis and antithesis
 * - Burden of proof
 * - Counter-arguments
 *
 * In CYNIC: Analyze argument structure, evaluate completeness,
 * identify weaknesses, track dialectical exchanges.
 *
 * @module argument-analyzer
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;
const PHI_INV_2 = 0.3819660112501051;
const PHI_INV_3 = 0.2360679774997897;

// Storage
const CYNIC_DIR = path.join(process.env.HOME || '/tmp', '.cynic');
const ARGUMENT_DIR = path.join(CYNIC_DIR, 'argument');
const STATE_FILE = path.join(ARGUMENT_DIR, 'state.json');
const HISTORY_FILE = path.join(ARGUMENT_DIR, 'history.jsonl');

// Constants
const MAX_ARGUMENTS = Math.round(PHI * 60);       // ~97
const MAX_DIALECTICS = Math.round(PHI * 30);      // ~49
const COMPLETENESS_THRESHOLD = PHI_INV;           // 0.618

/**
 * Toulmin argument components
 */
const ARGUMENT_COMPONENTS = {
  claim: {
    name: 'Claim',
    description: 'The conclusion being argued for',
    symbol: '◎',
    required: true,
    weight: 1.0,
  },
  data: {
    name: 'Data/Grounds',
    description: 'Evidence supporting the claim',
    symbol: '◆',
    required: true,
    weight: PHI_INV,
  },
  warrant: {
    name: 'Warrant',
    description: 'Reasoning connecting data to claim',
    symbol: '→',
    required: true,
    weight: PHI_INV,
  },
  backing: {
    name: 'Backing',
    description: 'Support for the warrant',
    symbol: '◇',
    required: false,
    weight: PHI_INV_2,
  },
  qualifier: {
    name: 'Qualifier',
    description: 'Strength modifier (probably, certainly)',
    symbol: '~',
    required: false,
    weight: PHI_INV_3,
  },
  rebuttal: {
    name: 'Rebuttal',
    description: 'Conditions where claim doesn\'t hold',
    symbol: '⊘',
    required: false,
    weight: PHI_INV_2,
  },
};

/**
 * Qualifier types (claim strength)
 */
const QUALIFIERS = {
  certainly: {
    name: 'Certainly',
    strength: 1.0,
    symbol: '●',
    typical: ['certainly', 'definitely', 'absolutely', 'must'],
  },
  probably: {
    name: 'Probably',
    strength: PHI_INV,
    symbol: '◕',
    typical: ['probably', 'likely', 'should', 'typically'],
  },
  possibly: {
    name: 'Possibly',
    strength: PHI_INV_2,
    symbol: '◑',
    typical: ['possibly', 'might', 'could', 'perhaps'],
  },
  presumably: {
    name: 'Presumably',
    strength: PHI_INV_2,
    symbol: '◔',
    typical: ['presumably', 'apparently', 'seems'],
  },
  plausibly: {
    name: 'Plausibly',
    strength: PHI_INV_3,
    symbol: '○',
    typical: ['plausibly', 'conceivably', 'potentially'],
  },
};

/**
 * Argument types
 */
const ARGUMENT_TYPES = {
  empirical: {
    name: 'Empirical',
    description: 'Based on observation/evidence',
    warrantStrength: PHI_INV,
    symbol: '👁️',
  },
  definitional: {
    name: 'Definitional',
    description: 'Based on meaning of terms',
    warrantStrength: PHI_INV + PHI_INV_3,
    symbol: '≡',
  },
  causal: {
    name: 'Causal',
    description: 'Based on cause-effect relationships',
    warrantStrength: PHI_INV,
    symbol: '⊃',
  },
  analogical: {
    name: 'Analogical',
    description: 'Based on similarity',
    warrantStrength: PHI_INV_2,
    symbol: '≈',
  },
  authoritative: {
    name: 'Authoritative',
    description: 'Based on expert testimony',
    warrantStrength: PHI_INV_2,
    symbol: '◈',
  },
  evaluative: {
    name: 'Evaluative',
    description: 'Based on value judgments',
    warrantStrength: PHI_INV_3,
    symbol: '⚖',
  },
};

/**
 * Dialectical moves
 */
const DIALECTICAL_MOVES = {
  assert: {
    name: 'Assert',
    description: 'Make a claim',
    symbol: '▶',
  },
  challenge: {
    name: 'Challenge',
    description: 'Request justification',
    symbol: '?',
  },
  defend: {
    name: 'Defend',
    description: 'Provide justification',
    symbol: '◀',
  },
  counter: {
    name: 'Counter',
    description: 'Offer opposing argument',
    symbol: '⊗',
  },
  concede: {
    name: 'Concede',
    description: 'Accept opponent\'s point',
    symbol: '✓',
  },
  retract: {
    name: 'Retract',
    description: 'Withdraw a claim',
    symbol: '←',
  },
};

// In-memory state
let state = {
  arguments: {},       // Constructed arguments
  dialectics: [],      // Dialectical exchanges
  currentDialectic: null,
  stats: {
    argumentsConstructed: 0,
    argumentsComplete: 0,
    dialecticsStarted: 0,
    dialecticsMoves: 0,
    counterArguments: 0,
  },
};

/**
 * Initialize the argument analyzer
 */
function init() {
  if (!fs.existsSync(ARGUMENT_DIR)) {
    fs.mkdirSync(ARGUMENT_DIR, { recursive: true });
  }

  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      // Start fresh
    }
  }
}

/**
 * Save state to disk
 */
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Log to history
 */
function logHistory(event) {
  const entry = { timestamp: Date.now(), ...event };
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');
}

/**
 * Construct a Toulmin argument
 *
 * @param {object} components - Argument components
 * @returns {object} Constructed argument
 */
function construct(components) {
  // Prune if needed
  if (Object.keys(state.arguments).length >= MAX_ARGUMENTS) {
    pruneOldArguments();
  }

  const id = `arg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const argument = {
    id,
    // Required components
    claim: components.claim || null,
    data: components.data || [],
    warrant: components.warrant || null,
    // Optional components
    backing: components.backing || null,
    qualifier: components.qualifier || 'probably',
    qualifierInfo: QUALIFIERS[components.qualifier] || QUALIFIERS.probably,
    rebuttal: components.rebuttal || null,
    // Metadata
    type: components.type || 'empirical',
    typeInfo: ARGUMENT_TYPES[components.type] || ARGUMENT_TYPES.empirical,
    // Analysis
    completeness: 0,
    strength: 0,
    weaknesses: [],
    constructedAt: Date.now(),
  };

  // Analyze completeness
  argument.completeness = analyzeCompleteness(argument);
  argument.strength = calculateStrength(argument);
  argument.weaknesses = identifyWeaknesses(argument);

  // Check if complete
  if (argument.completeness >= COMPLETENESS_THRESHOLD) {
    state.stats.argumentsComplete++;
  }

  state.arguments[id] = argument;
  state.stats.argumentsConstructed++;

  logHistory({
    type: 'argument_constructed',
    id,
    completeness: argument.completeness,
    strength: argument.strength,
  });

  saveState();

  return {
    argument,
    completeness: Math.round(argument.completeness * 100),
    strength: Math.round(argument.strength * 100),
    isComplete: argument.completeness >= COMPLETENESS_THRESHOLD,
    weaknesses: argument.weaknesses,
  };
}

/**
 * Prune old arguments
 */
function pruneOldArguments() {
  const sorted = Object.entries(state.arguments)
    .sort((a, b) => (a[1].constructedAt || 0) - (b[1].constructedAt || 0));

  const toRemove = sorted.slice(0, Math.round(MAX_ARGUMENTS * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.arguments[id];
  }
}

/**
 * Analyze argument completeness
 */
function analyzeCompleteness(argument) {
  let score = 0;
  let totalWeight = 0;

  for (const [key, config] of Object.entries(ARGUMENT_COMPONENTS)) {
    if (config.required) {
      totalWeight += config.weight;
      if (argument[key] && (Array.isArray(argument[key]) ? argument[key].length > 0 : true)) {
        score += config.weight;
      }
    } else {
      // Optional components add bonus
      if (argument[key] && (Array.isArray(argument[key]) ? argument[key].length > 0 : true)) {
        score += config.weight * PHI_INV_2;  // Partial credit
        totalWeight += config.weight * PHI_INV_2;
      }
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Calculate argument strength
 */
function calculateStrength(argument) {
  // Base strength from completeness
  let strength = argument.completeness;

  // Modifier from qualifier
  strength *= argument.qualifierInfo.strength;

  // Modifier from argument type
  strength *= argument.typeInfo.warrantStrength;

  // Boost from backing
  if (argument.backing) {
    strength = Math.min(1, strength + PHI_INV_3);
  }

  // Penalty for missing warrant
  if (!argument.warrant) {
    strength *= PHI_INV_2;
  }

  // Acknowledgment of rebuttal adds credibility
  if (argument.rebuttal) {
    strength = Math.min(1, strength + PHI_INV_3);
  }

  return Math.min(1, strength);
}

/**
 * Identify argument weaknesses
 */
function identifyWeaknesses(argument) {
  const weaknesses = [];

  // Missing required components
  for (const [key, config] of Object.entries(ARGUMENT_COMPONENTS)) {
    if (config.required) {
      if (!argument[key] || (Array.isArray(argument[key]) && argument[key].length === 0)) {
        weaknesses.push({
          type: 'missing_component',
          component: key,
          name: config.name,
          message: `Missing ${config.name} - ${config.description}`,
        });
      }
    }
  }

  // Weak qualifier without backing
  if (['certainly', 'probably'].includes(argument.qualifier) && !argument.backing) {
    weaknesses.push({
      type: 'unbacked_strong_claim',
      component: 'backing',
      name: 'Unbacked Strong Claim',
      message: `Strong qualifier "${argument.qualifier}" without backing support`,
    });
  }

  // Weak argument type without strong data
  if (['analogical', 'authoritative'].includes(argument.type)) {
    if (!argument.data || argument.data.length < 2) {
      weaknesses.push({
        type: 'insufficient_data',
        component: 'data',
        name: 'Insufficient Data',
        message: `${argument.typeInfo.name} arguments need multiple data points`,
      });
    }
  }

  // No rebuttal considered
  if (!argument.rebuttal) {
    weaknesses.push({
      type: 'no_rebuttal',
      component: 'rebuttal',
      name: 'No Rebuttal Considered',
      message: 'Argument doesn\'t acknowledge exceptions or counterexamples',
    });
  }

  return weaknesses;
}

/**
 * Add a component to an existing argument
 *
 * @param {string} argumentId - Argument ID
 * @param {string} component - Component type
 * @param {any} value - Component value
 * @returns {object} Updated argument
 */
function addComponent(argumentId, component, value) {
  const argument = state.arguments[argumentId];
  if (!argument) return { error: 'Argument not found' };

  if (!ARGUMENT_COMPONENTS[component]) {
    return { error: `Unknown component: ${component}` };
  }

  // Handle array components (data)
  if (component === 'data') {
    if (!Array.isArray(argument.data)) {
      argument.data = [];
    }
    argument.data.push(value);
  } else {
    argument[component] = value;
  }

  // If adding qualifier, update info
  if (component === 'qualifier') {
    argument.qualifierInfo = QUALIFIERS[value] || QUALIFIERS.probably;
  }

  // Recalculate
  argument.completeness = analyzeCompleteness(argument);
  argument.strength = calculateStrength(argument);
  argument.weaknesses = identifyWeaknesses(argument);

  saveState();

  return {
    argument,
    component,
    completeness: Math.round(argument.completeness * 100),
    strength: Math.round(argument.strength * 100),
    message: `${ARGUMENT_COMPONENTS[component].symbol} Added ${ARGUMENT_COMPONENTS[component].name}`,
  };
}

/**
 * Start a dialectical exchange
 *
 * @param {string} thesis - Initial thesis
 * @param {object} config - Configuration
 * @returns {object} Dialectic
 */
function startDialectic(thesis, config = {}) {
  // Prune if needed
  if (state.dialectics.length >= MAX_DIALECTICS) {
    state.dialectics = state.dialectics.slice(-Math.round(MAX_DIALECTICS * PHI_INV));
  }

  const dialectic = {
    id: `dia-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    thesis,
    antithesis: null,
    synthesis: null,
    moves: [{
      type: 'assert',
      typeInfo: DIALECTICAL_MOVES.assert,
      content: thesis,
      party: config.party || 'proponent',
      timestamp: Date.now(),
    }],
    burdenOfProof: config.burdenOfProof || 'proponent',
    status: 'open',
    startedAt: Date.now(),
    resolvedAt: null,
  };

  state.dialectics.push(dialectic);
  state.currentDialectic = dialectic;
  state.stats.dialecticsStarted++;
  state.stats.dialecticsMoves++;

  logHistory({
    type: 'dialectic_started',
    id: dialectic.id,
    thesis: thesis.slice(0, 50),
  });

  saveState();

  return {
    dialectic,
    message: `▶ Dialectic opened: "${thesis.slice(0, 50)}..."`,
  };
}

/**
 * Make a dialectical move
 *
 * @param {string} moveType - Type of move
 * @param {string} content - Move content
 * @param {string} party - Which party (proponent/opponent)
 * @returns {object} Move result
 */
function makeMove(moveType, content, party = 'opponent') {
  if (!state.currentDialectic) {
    return { error: 'No active dialectic' };
  }

  const move = DIALECTICAL_MOVES[moveType];
  if (!move) {
    return { error: `Unknown move type: ${moveType}` };
  }

  const moveRecord = {
    type: moveType,
    typeInfo: move,
    content,
    party,
    timestamp: Date.now(),
  };

  state.currentDialectic.moves.push(moveRecord);
  state.stats.dialecticsMoves++;

  // Handle special moves
  if (moveType === 'counter') {
    state.currentDialectic.antithesis = content;
    state.stats.counterArguments++;
  } else if (moveType === 'concede') {
    // Check if this resolves the dialectic
    const proponentConcedes = party === 'proponent';
    const opponentConcedes = party === 'opponent';
    if (proponentConcedes || opponentConcedes) {
      state.currentDialectic.status = 'resolved';
      state.currentDialectic.resolvedAt = Date.now();
      state.currentDialectic.resolution = proponentConcedes
        ? 'opponent_prevailed'
        : 'proponent_prevailed';
    }
  } else if (moveType === 'retract') {
    state.currentDialectic.status = 'retracted';
    state.currentDialectic.resolvedAt = Date.now();
  }

  logHistory({
    type: 'dialectical_move',
    dialecticId: state.currentDialectic.id,
    moveType,
    party,
  });

  saveState();

  return {
    move: moveRecord,
    dialectic: state.currentDialectic,
    message: `${move.symbol} ${party}: ${move.name}`,
  };
}

/**
 * Synthesize a dialectic
 *
 * @param {string} synthesis - Synthesis statement
 * @returns {object} Resolution
 */
function synthesize(synthesis) {
  if (!state.currentDialectic) {
    return { error: 'No active dialectic' };
  }

  state.currentDialectic.synthesis = synthesis;
  state.currentDialectic.status = 'synthesized';
  state.currentDialectic.resolvedAt = Date.now();

  state.currentDialectic.moves.push({
    type: 'synthesize',
    typeInfo: { name: 'Synthesize', description: 'Combine thesis and antithesis', symbol: '⊕' },
    content: synthesis,
    party: 'both',
    timestamp: Date.now(),
  });

  logHistory({
    type: 'dialectic_synthesized',
    dialecticId: state.currentDialectic.id,
    synthesis: synthesis.slice(0, 50),
  });

  const resolved = state.currentDialectic;
  state.currentDialectic = null;

  saveState();

  return {
    dialectic: resolved,
    synthesis,
    message: `⊕ Dialectic synthesized`,
  };
}

/**
 * Evaluate an argument (external)
 *
 * @param {object} argument - Argument to evaluate
 * @returns {object} Evaluation
 */
function evaluate(argument) {
  // Construct internally then return analysis
  const result = construct({
    claim: argument.conclusion || argument.claim,
    data: argument.premises || argument.data || [],
    warrant: argument.warrant,
    backing: argument.backing,
    qualifier: argument.qualifier,
    rebuttal: argument.rebuttal,
    type: argument.type,
  });

  return {
    ...result,
    evaluation: {
      isStrong: result.strength >= PHI_INV * 100,
      isComplete: result.isComplete,
      mainWeakness: result.weaknesses[0]?.message || 'None identified',
      recommendation: result.isComplete
        ? '*nod* Argument structure is sound'
        : `*sniff* Consider adding: ${result.weaknesses[0]?.name}`,
    },
  };
}

/**
 * Get statistics
 */
function getStats() {
  const avgCompleteness = Object.values(state.arguments).length > 0
    ? Object.values(state.arguments).reduce((sum, a) => sum + a.completeness, 0) /
      Object.values(state.arguments).length
    : 0;

  return {
    ...state.stats,
    totalArguments: Object.keys(state.arguments).length,
    totalDialectics: state.dialectics.length,
    activeDialectic: state.currentDialectic !== null,
    avgCompleteness: Math.round(avgCompleteness * 100),
    completionRate: state.stats.argumentsConstructed > 0
      ? Math.round(state.stats.argumentsComplete / state.stats.argumentsConstructed * 100)
      : 0,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `◎ Argument Analyzer (Toulmin)\n`;
  status += `  Arguments: ${stats.totalArguments}\n`;
  status += `  Avg completeness: ${stats.avgCompleteness}%\n`;
  status += `  Completion rate: ${stats.completionRate}%\n`;
  status += `  Dialectics: ${stats.totalDialectics}\n`;
  status += `  Counter-arguments: ${stats.counterArguments}\n`;

  if (stats.activeDialectic) {
    status += `  Active dialectic: ${state.currentDialectic.id}\n`;
  }

  return status;
}

module.exports = {
  init,
  construct,
  addComponent,
  evaluate,
  startDialectic,
  makeMove,
  synthesize,
  getStats,
  formatStatus,
  ARGUMENT_COMPONENTS,
  QUALIFIERS,
  ARGUMENT_TYPES,
  DIALECTICAL_MOVES,
};
