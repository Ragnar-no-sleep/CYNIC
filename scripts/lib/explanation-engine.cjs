/**
 * Explanation Engine - Models of Scientific Explanation
 *
 * Philosophy: Hempel's D-N model says explanation subsumes events
 * under laws. Salmon's causal-mechanical model traces physical
 * processes. Van Fraassen emphasizes contrastive explanation:
 * "Why P rather than Q?"
 *
 * Key concepts:
 * - D-N model: Explanation via laws and initial conditions
 * - I-S model: Inductive-statistical explanation (probabilistic)
 * - Causal-mechanical: Tracing causal processes
 * - Contrastive: Why this rather than that?
 * - Functional: Purpose-based explanation
 *
 * In CYNIC: Construct and evaluate explanations, identify
 * explanatory gaps, compare explanatory power.
 *
 * @module explanation-engine
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
const EXPLANATION_DIR = path.join(CYNIC_DIR, 'explanation');
const STATE_FILE = path.join(EXPLANATION_DIR, 'state.json');
const HISTORY_FILE = path.join(EXPLANATION_DIR, 'history.jsonl');

// Constants
const MAX_EXPLANATIONS = Math.round(PHI * 80);    // ~130
const MAX_LAWS = Math.round(PHI * 30);            // ~49
const ADEQUACY_THRESHOLD = PHI_INV;               // 0.618

/**
 * Explanation types (models)
 */
const EXPLANATION_TYPES = {
  deductive_nomological: {
    name: 'Deductive-Nomological',
    description: 'Explanation via laws and initial conditions (Hempel)',
    symbol: 'DN',
    requirements: ['law', 'initial_conditions'],
    strength: PHI_INV + PHI_INV_3,
  },
  inductive_statistical: {
    name: 'Inductive-Statistical',
    description: 'Probabilistic explanation (high probability)',
    symbol: 'IS',
    requirements: ['statistical_law', 'conditions'],
    strength: PHI_INV,
  },
  causal_mechanical: {
    name: 'Causal-Mechanical',
    description: 'Tracing physical causal processes (Salmon)',
    symbol: 'CM',
    requirements: ['causal_process', 'mechanism'],
    strength: PHI_INV + PHI_INV_2,
  },
  contrastive: {
    name: 'Contrastive',
    description: 'Why P rather than Q? (Van Fraassen)',
    symbol: 'CT',
    requirements: ['fact', 'foil', 'difference_maker'],
    strength: PHI_INV,
  },
  functional: {
    name: 'Functional/Teleological',
    description: 'Explanation by purpose or function',
    symbol: 'FN',
    requirements: ['function', 'system'],
    strength: PHI_INV_2,
  },
  unification: {
    name: 'Unification',
    description: 'Explanation through pattern subsumption (Kitcher)',
    symbol: 'UN',
    requirements: ['pattern', 'instances'],
    strength: PHI_INV,
  },
};

/**
 * Explanatory virtues (what makes a good explanation)
 */
const EXPLANATORY_VIRTUES = {
  simplicity: {
    name: 'Simplicity',
    description: 'Fewer assumptions, parsimony',
    weight: PHI_INV_2,
    symbol: '○',
  },
  scope: {
    name: 'Scope',
    description: 'Explains more phenomena',
    weight: PHI_INV,
    symbol: '◎',
  },
  precision: {
    name: 'Precision',
    description: 'Makes specific predictions',
    weight: PHI_INV_2,
    symbol: '◇',
  },
  fruitfulness: {
    name: 'Fruitfulness',
    description: 'Leads to new discoveries',
    weight: PHI_INV_3,
    symbol: '✧',
  },
  mechanism: {
    name: 'Mechanism',
    description: 'Identifies causal process',
    weight: PHI_INV,
    symbol: '⚙',
  },
  coherence: {
    name: 'Coherence',
    description: 'Fits with other knowledge',
    weight: PHI_INV_2,
    symbol: '◈',
  },
};

/**
 * Explanation adequacy levels
 */
const ADEQUACY_LEVELS = {
  inadequate: {
    threshold: 0,
    name: 'Inadequate',
    description: 'Missing critical components',
    symbol: '✕',
  },
  partial: {
    threshold: PHI_INV_3,
    name: 'Partial',
    description: 'Some explanatory value',
    symbol: '◔',
  },
  moderate: {
    threshold: PHI_INV_2,
    name: 'Moderate',
    description: 'Reasonably explains',
    symbol: '◑',
  },
  adequate: {
    threshold: PHI_INV,
    name: 'Adequate',
    description: 'Good explanation',
    symbol: '◕',
  },
  excellent: {
    threshold: PHI_INV + PHI_INV_2,
    name: 'Excellent',
    description: 'Comprehensive explanation',
    symbol: '●',
  },
};

// In-memory state
let state = {
  explanations: {},    // Constructed explanations
  laws: {},            // Known laws/generalizations
  explananda: [],      // Things to be explained
  stats: {
    explanationsConstructed: 0,
    lawsRegistered: 0,
    adequateExplanations: 0,
    contrastiveQueries: 0,
  },
};

/**
 * Initialize the explanation engine
 */
function init() {
  if (!fs.existsSync(EXPLANATION_DIR)) {
    fs.mkdirSync(EXPLANATION_DIR, { recursive: true });
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
 * Register a law or generalization
 *
 * @param {string} content - Law statement
 * @param {object} config - Configuration
 * @returns {object} Registered law
 */
function registerLaw(content, config = {}) {
  if (Object.keys(state.laws).length >= MAX_LAWS) {
    // Remove oldest
    const oldest = Object.entries(state.laws)
      .sort((a, b) => a[1].registeredAt - b[1].registeredAt)[0];
    if (oldest) delete state.laws[oldest[0]];
  }

  const id = `law-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const law = {
    id,
    content,
    type: config.type || 'empirical',  // empirical, statistical, logical
    domain: config.domain || 'general',
    universality: config.universality || PHI_INV,  // How universal
    exceptions: config.exceptions || [],
    registeredAt: Date.now(),
  };

  state.laws[id] = law;
  state.stats.lawsRegistered++;

  saveState();

  return law;
}

/**
 * Construct an explanation
 *
 * @param {string} explanandum - What is being explained
 * @param {string} type - Explanation type
 * @param {object} components - Explanation components
 * @returns {object} Constructed explanation
 */
function construct(explanandum, type, components) {
  if (Object.keys(state.explanations).length >= MAX_EXPLANATIONS) {
    pruneExplanations();
  }

  const explType = EXPLANATION_TYPES[type] || EXPLANATION_TYPES.deductive_nomological;
  const id = `expl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const explanation = {
    id,
    explanandum,
    type,
    typeInfo: explType,
    // Components based on type
    components: {
      law: components.law || null,
      initial_conditions: components.initial_conditions || [],
      statistical_law: components.statistical_law || null,
      probability: components.probability || null,
      causal_process: components.causal_process || null,
      mechanism: components.mechanism || null,
      fact: components.fact || explanandum,
      foil: components.foil || null,
      difference_maker: components.difference_maker || null,
      function: components.function || null,
      system: components.system || null,
      pattern: components.pattern || null,
      instances: components.instances || [],
    },
    // Evaluation
    completeness: 0,
    adequacy: 0,
    adequacyLevel: null,
    virtues: {},
    gaps: [],
    constructedAt: Date.now(),
  };

  // Evaluate completeness
  explanation.completeness = evaluateCompleteness(explanation);
  explanation.gaps = identifyGaps(explanation);

  state.explanations[id] = explanation;
  state.stats.explanationsConstructed++;

  logHistory({
    type: 'explanation_constructed',
    id,
    explanandum: explanandum.slice(0, 50),
    explanationType: type,
  });

  saveState();

  return explanation;
}

/**
 * Prune old explanations
 */
function pruneExplanations() {
  const sorted = Object.entries(state.explanations)
    .sort((a, b) => (a[1].constructedAt || 0) - (b[1].constructedAt || 0));

  const toRemove = sorted.slice(0, Math.round(MAX_EXPLANATIONS * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.explanations[id];
  }
}

/**
 * Evaluate explanation completeness
 */
function evaluateCompleteness(explanation) {
  const required = explanation.typeInfo.requirements;
  let provided = 0;

  for (const req of required) {
    const component = explanation.components[req];
    if (component !== null && component !== undefined) {
      if (Array.isArray(component)) {
        if (component.length > 0) provided++;
      } else {
        provided++;
      }
    }
  }

  return required.length > 0 ? provided / required.length : 0;
}

/**
 * Identify gaps in explanation
 */
function identifyGaps(explanation) {
  const gaps = [];
  const required = explanation.typeInfo.requirements;

  for (const req of required) {
    const component = explanation.components[req];
    if (component === null || component === undefined ||
        (Array.isArray(component) && component.length === 0)) {
      gaps.push({
        component: req,
        message: `Missing required component: ${req.replace(/_/g, ' ')}`,
      });
    }
  }

  return gaps;
}

/**
 * Evaluate explanation adequacy
 *
 * @param {string} explanationId - Explanation ID
 * @param {object} virtueScores - Scores for explanatory virtues
 * @returns {object} Adequacy evaluation
 */
function evaluate(explanationId, virtueScores = {}) {
  const explanation = state.explanations[explanationId];
  if (!explanation) return { error: 'Explanation not found' };

  // Base adequacy from completeness and type strength
  let adequacy = explanation.completeness * explanation.typeInfo.strength;

  // Apply virtue scores
  let virtueBonus = 0;
  let virtueCount = 0;

  for (const [virtue, score] of Object.entries(virtueScores)) {
    const virtueInfo = EXPLANATORY_VIRTUES[virtue];
    if (virtueInfo) {
      explanation.virtues[virtue] = score;
      virtueBonus += score * virtueInfo.weight;
      virtueCount++;
    }
  }

  if (virtueCount > 0) {
    adequacy += virtueBonus / virtueCount;
  }

  // Normalize
  adequacy = Math.min(1, adequacy);

  explanation.adequacy = adequacy;
  explanation.adequacyLevel = getAdequacyLevel(adequacy);

  if (adequacy >= ADEQUACY_THRESHOLD) {
    state.stats.adequateExplanations++;
  }

  saveState();

  return {
    explanation,
    adequacy: Math.round(adequacy * 100),
    level: explanation.adequacyLevel,
    completeness: Math.round(explanation.completeness * 100),
    gaps: explanation.gaps,
    virtues: explanation.virtues,
    message: formatAdequacyMessage(explanation),
  };
}

/**
 * Get adequacy level from score
 */
function getAdequacyLevel(score) {
  for (const [name, config] of Object.entries(ADEQUACY_LEVELS).reverse()) {
    if (score >= config.threshold) {
      return { name, ...config };
    }
  }
  return ADEQUACY_LEVELS.inadequate;
}

/**
 * Format adequacy message
 */
function formatAdequacyMessage(explanation) {
  const level = explanation.adequacyLevel;
  const gaps = explanation.gaps;

  if (gaps.length > 0) {
    return `${level.symbol} ${level.name}: Missing ${gaps.map(g => g.component).join(', ')}`;
  }
  return `${level.symbol} ${level.name}: ${explanation.explanandum.slice(0, 40)}...`;
}

/**
 * Construct a D-N explanation
 *
 * @param {string} explanandum - What to explain
 * @param {string} lawId - Law ID to use
 * @param {array} conditions - Initial conditions
 * @returns {object} D-N explanation
 */
function explainDN(explanandum, lawId, conditions) {
  const law = state.laws[lawId];
  if (!law) return { error: 'Law not found' };

  const explanation = construct(explanandum, 'deductive_nomological', {
    law: law.content,
    initial_conditions: conditions,
  });

  return {
    explanation,
    structure: {
      premises: [law.content, ...conditions],
      conclusion: explanandum,
      form: 'If Law and Conditions, then Explanandum',
    },
    message: `DN Explanation: ${law.content} + conditions → ${explanandum.slice(0, 40)}...`,
  };
}

/**
 * Construct a contrastive explanation
 *
 * @param {string} fact - Why this?
 * @param {string} foil - Rather than this?
 * @param {string} differenceMaker - What makes the difference
 * @returns {object} Contrastive explanation
 */
function explainContrastive(fact, foil, differenceMaker) {
  const explanation = construct(fact, 'contrastive', {
    fact,
    foil,
    difference_maker: differenceMaker,
  });

  state.stats.contrastiveQueries++;
  saveState();

  return {
    explanation,
    structure: {
      question: `Why ${fact} rather than ${foil}?`,
      answer: `Because ${differenceMaker}`,
    },
    message: `CT Explanation: ${fact.slice(0, 30)}... rather than ${foil.slice(0, 30)}... because ${differenceMaker.slice(0, 30)}...`,
  };
}

/**
 * Construct a causal-mechanical explanation
 *
 * @param {string} explanandum - What to explain
 * @param {string} process - Causal process
 * @param {string} mechanism - Mechanism description
 * @returns {object} CM explanation
 */
function explainCausal(explanandum, process, mechanism) {
  const explanation = construct(explanandum, 'causal_mechanical', {
    causal_process: process,
    mechanism,
  });

  return {
    explanation,
    structure: {
      process,
      mechanism,
      outcome: explanandum,
    },
    message: `CM Explanation: ${process.slice(0, 30)}... via ${mechanism.slice(0, 30)}... → ${explanandum.slice(0, 30)}...`,
  };
}

/**
 * Compare two explanations
 *
 * @param {string} explId1 - First explanation ID
 * @param {string} explId2 - Second explanation ID
 * @returns {object} Comparison
 */
function compare(explId1, explId2) {
  const expl1 = state.explanations[explId1];
  const expl2 = state.explanations[explId2];

  if (!expl1 || !expl2) return { error: 'Explanation not found' };

  const comparison = {
    explanation1: {
      id: explId1,
      type: expl1.type,
      adequacy: Math.round(expl1.adequacy * 100),
      completeness: Math.round(expl1.completeness * 100),
    },
    explanation2: {
      id: explId2,
      type: expl2.type,
      adequacy: Math.round(expl2.adequacy * 100),
      completeness: Math.round(expl2.completeness * 100),
    },
    better: expl1.adequacy > expl2.adequacy ? 1 : expl2.adequacy > expl1.adequacy ? 2 : 0,
    difference: Math.abs(expl1.adequacy - expl2.adequacy),
  };

  return {
    comparison,
    message: comparison.better === 0
      ? 'Explanations equally adequate'
      : `Explanation ${comparison.better} is more adequate (+${Math.round(comparison.difference * 100)}%)`,
  };
}

/**
 * Get statistics
 */
function getStats() {
  const explanations = Object.values(state.explanations);
  const avgAdequacy = explanations.length > 0
    ? explanations.reduce((sum, e) => sum + (e.adequacy || 0), 0) / explanations.length
    : 0;

  return {
    ...state.stats,
    totalExplanations: explanations.length,
    totalLaws: Object.keys(state.laws).length,
    avgAdequacy: Math.round(avgAdequacy * 100),
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `⊃ Explanation Engine (Hempel/Salmon)\n`;
  status += `  Explanations: ${stats.totalExplanations}\n`;
  status += `  Laws registered: ${stats.totalLaws}\n`;
  status += `  Adequate explanations: ${stats.adequateExplanations}\n`;
  status += `  Avg adequacy: ${stats.avgAdequacy}%\n`;
  status += `  Contrastive queries: ${stats.contrastiveQueries}\n`;

  return status;
}

module.exports = {
  init,
  registerLaw,
  construct,
  evaluate,
  explainDN,
  explainContrastive,
  explainCausal,
  compare,
  getStats,
  formatStatus,
  EXPLANATION_TYPES,
  EXPLANATORY_VIRTUES,
  ADEQUACY_LEVELS,
};
