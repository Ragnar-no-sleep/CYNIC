/**
 * Counterfactual Engine - What-If Reasoning
 *
 * Philosophy: Counterfactuals are conditionals about what would have
 * been the case if things had been different. Stalnaker and Lewis
 * analyze them using possible worlds: "If A, then B" is true iff
 * in the closest A-world, B is also true.
 *
 * Key concepts:
 * - Counterfactual conditional: "If A had been, B would have been"
 * - Closest world: Most similar world where antecedent holds
 * - Backtracking: Counterfactuals that change the past
 * - Causal counterfactuals: Based on causal, not mere correlational, links
 *
 * In CYNIC: Support decision-making through what-if analysis,
 * evaluate alternative scenarios, trace causal dependencies.
 *
 * @module counterfactual-engine
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
const COUNTERFACTUAL_DIR = path.join(CYNIC_DIR, 'counterfactual');
const STATE_FILE = path.join(COUNTERFACTUAL_DIR, 'state.json');
const HISTORY_FILE = path.join(COUNTERFACTUAL_DIR, 'history.jsonl');

// Constants
const MAX_SCENARIOS = Math.round(PHI * 40);       // ~65
const MAX_EVALUATIONS = Math.round(PHI * 150);    // ~243
const PLAUSIBILITY_THRESHOLD = PHI_INV;           // 0.618

/**
 * Counterfactual types
 */
const COUNTERFACTUAL_TYPES = {
  simple: {
    name: 'Simple',
    description: 'If A had been, B would have been',
    symbol: '□→',
    structure: 'A □→ B',
  },
  might: {
    name: 'Might Counterfactual',
    description: 'If A had been, B might have been',
    symbol: '◇→',
    structure: 'A ◇→ B',
  },
  causal: {
    name: 'Causal',
    description: 'Based on causal mechanism',
    symbol: '⊃',
    structure: 'A causes B',
  },
  backtracking: {
    name: 'Backtracking',
    description: 'Changes the past to support antecedent',
    symbol: '←',
    structure: 'A ← C (changed past)',
  },
  semifactual: {
    name: 'Semifactual',
    description: 'Even if A had been, B would still have been',
    symbol: '≡→',
    structure: 'A ≡→ B (B overdetermined)',
  },
};

/**
 * Evaluation strategies
 */
const EVALUATION_STRATEGIES = {
  similarity: {
    name: 'Similarity-Based',
    description: 'Lewis: Find closest world where antecedent holds',
    weight: PHI_INV,
  },
  selection: {
    name: 'Selection Function',
    description: 'Stalnaker: Unique closest world',
    weight: PHI_INV + PHI_INV_3,
  },
  causal: {
    name: 'Causal Model',
    description: 'Pearl: Intervene on causal graph',
    weight: PHI_INV,
  },
  epistemic: {
    name: 'Epistemic',
    description: 'Based on what we would believe',
    weight: PHI_INV_2,
  },
};

/**
 * Plausibility levels for counterfactual consequents
 */
const PLAUSIBILITY_LEVELS = {
  necessary: {
    threshold: PHI_INV + PHI_INV_2,
    name: 'Would Definitely',
    description: 'B would certainly follow from A',
    symbol: '●',
  },
  probable: {
    threshold: PHI_INV,
    name: 'Would Probably',
    description: 'B would likely follow from A',
    symbol: '◕',
  },
  possible: {
    threshold: PHI_INV_2,
    name: 'Might',
    description: 'B might follow from A',
    symbol: '◑',
  },
  unlikely: {
    threshold: PHI_INV_3,
    name: 'Might But Unlikely',
    description: 'B is unlikely to follow from A',
    symbol: '◔',
  },
  implausible: {
    threshold: 0,
    name: 'Would Not',
    description: 'B would not follow from A',
    symbol: '○',
  },
};

// In-memory state
let state = {
  scenarios: {},       // Counterfactual scenarios
  evaluations: [],     // Evaluation history
  causalLinks: [],     // Tracked causal relationships
  stats: {
    scenariosCreated: 0,
    evaluationsRun: 0,
    wouldClaims: 0,
    mightClaims: 0,
    causalLinksAdded: 0,
  },
};

/**
 * Initialize the counterfactual engine
 */
function init() {
  if (!fs.existsSync(COUNTERFACTUAL_DIR)) {
    fs.mkdirSync(COUNTERFACTUAL_DIR, { recursive: true });
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
 * Create a counterfactual scenario
 *
 * @param {string} antecedent - "If this had been the case..."
 * @param {string} consequent - "...then this would have been"
 * @param {object} config - Configuration
 * @returns {object} Created scenario
 */
function createScenario(antecedent, consequent, config = {}) {
  // Prune if needed
  if (Object.keys(state.scenarios).length >= MAX_SCENARIOS) {
    pruneScenarios();
  }

  const id = `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const cfType = COUNTERFACTUAL_TYPES[config.type] || COUNTERFACTUAL_TYPES.simple;

  const scenario = {
    id,
    antecedent,
    consequent,
    type: config.type || 'simple',
    typeInfo: cfType,
    // Context
    context: config.context || '',
    domain: config.domain || 'general',
    // Evaluation results
    evaluated: false,
    plausibility: null,
    plausibilityLevel: null,
    supportingFactors: [],
    underminingFactors: [],
    // Causal info
    causalMechanism: config.causalMechanism || null,
    // Metadata
    createdAt: Date.now(),
    evaluatedAt: null,
  };

  state.scenarios[id] = scenario;
  state.stats.scenariosCreated++;

  logHistory({
    type: 'scenario_created',
    id,
    antecedent: antecedent.slice(0, 50),
    consequent: consequent.slice(0, 50),
  });

  saveState();

  return scenario;
}

/**
 * Prune old scenarios
 */
function pruneScenarios() {
  const sorted = Object.entries(state.scenarios)
    .sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));

  const toRemove = sorted.slice(0, Math.round(MAX_SCENARIOS * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.scenarios[id];
  }
}

/**
 * Evaluate a counterfactual scenario
 *
 * @param {string} scenarioId - Scenario ID
 * @param {object} evidence - Supporting evidence
 * @returns {object} Evaluation result
 */
function evaluate(scenarioId, evidence = {}) {
  const scenario = state.scenarios[scenarioId];
  if (!scenario) return { error: 'Scenario not found' };

  // Prune evaluations if needed
  if (state.evaluations.length >= MAX_EVALUATIONS) {
    state.evaluations = state.evaluations.slice(-Math.round(MAX_EVALUATIONS * PHI_INV));
  }

  // Calculate plausibility based on available evidence
  let plausibility = PHI_INV_2;  // Start neutral

  // Check for causal mechanism
  if (scenario.causalMechanism || evidence.causalMechanism) {
    plausibility += PHI_INV_3;
    scenario.supportingFactors.push('Causal mechanism identified');
  }

  // Check for supporting factors
  if (evidence.supporting && Array.isArray(evidence.supporting)) {
    for (const factor of evidence.supporting) {
      plausibility += PHI_INV_3 * PHI_INV;
      scenario.supportingFactors.push(factor);
    }
  }

  // Check for undermining factors
  if (evidence.undermining && Array.isArray(evidence.undermining)) {
    for (const factor of evidence.undermining) {
      plausibility -= PHI_INV_3;
      scenario.underminingFactors.push(factor);
    }
  }

  // Check for similar historical cases
  if (evidence.precedents && evidence.precedents > 0) {
    plausibility += Math.min(PHI_INV_2, evidence.precedents * PHI_INV_3 * PHI_INV);
    scenario.supportingFactors.push(`${evidence.precedents} similar precedents`);
  }

  // Bound plausibility
  plausibility = Math.max(0, Math.min(1, plausibility));

  // Determine level
  scenario.plausibility = plausibility;
  scenario.plausibilityLevel = getPlausibilityLevel(plausibility);
  scenario.evaluated = true;
  scenario.evaluatedAt = Date.now();

  // Track claim type
  if (plausibility >= PLAUSIBILITY_THRESHOLD) {
    state.stats.wouldClaims++;
  } else if (plausibility >= PHI_INV_3) {
    state.stats.mightClaims++;
  }

  // Store evaluation
  const evaluation = {
    scenarioId,
    plausibility,
    level: scenario.plausibilityLevel.name,
    timestamp: Date.now(),
  };
  state.evaluations.push(evaluation);
  state.stats.evaluationsRun++;

  logHistory({
    type: 'scenario_evaluated',
    scenarioId,
    plausibility,
    level: scenario.plausibilityLevel.name,
  });

  saveState();

  return {
    scenario,
    plausibility: Math.round(plausibility * 100),
    level: scenario.plausibilityLevel,
    verdict: formatVerdict(scenario),
    supportingFactors: scenario.supportingFactors,
    underminingFactors: scenario.underminingFactors,
  };
}

/**
 * Get plausibility level from score
 */
function getPlausibilityLevel(score) {
  for (const [name, config] of Object.entries(PLAUSIBILITY_LEVELS).reverse()) {
    if (score >= config.threshold) {
      return { name: config.name, ...config };
    }
  }
  return PLAUSIBILITY_LEVELS.implausible;
}

/**
 * Format verdict for display
 */
function formatVerdict(scenario) {
  const level = scenario.plausibilityLevel;
  const a = scenario.antecedent.slice(0, 40);
  const c = scenario.consequent.slice(0, 40);

  if (level.name === 'Would Definitely') {
    return `${level.symbol} If ${a}... → ${c}... (certain)`;
  }
  if (level.name === 'Would Probably') {
    return `${level.symbol} If ${a}... → ${c}... (probable)`;
  }
  if (level.name === 'Might') {
    return `${level.symbol} If ${a}... ◇→ ${c}... (possible)`;
  }
  if (level.name === 'Might But Unlikely') {
    return `${level.symbol} If ${a}... ◇→ ${c}... (unlikely)`;
  }
  return `${level.symbol} If ${a}... ⊗ ${c}... (implausible)`;
}

/**
 * Add a causal link (for causal counterfactuals)
 *
 * @param {string} cause - Cause
 * @param {string} effect - Effect
 * @param {object} config - Configuration
 * @returns {object} Causal link
 */
function addCausalLink(cause, effect, config = {}) {
  const link = {
    id: `causal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    cause,
    effect,
    strength: config.strength || PHI_INV,
    mechanism: config.mechanism || '',
    domain: config.domain || 'general',
    addedAt: Date.now(),
  };

  state.causalLinks.push(link);
  state.stats.causalLinksAdded++;

  saveState();

  return {
    link,
    message: `${cause} ⊃ ${effect} (strength: ${Math.round(link.strength * 100)}%)`,
  };
}

/**
 * Query what would happen (quick evaluation)
 *
 * @param {string} antecedent - If this...
 * @param {string} consequent - Would this...?
 * @returns {object} Quick evaluation
 */
function whatIf(antecedent, consequent) {
  // Create and immediately evaluate
  const scenario = createScenario(antecedent, consequent, { type: 'simple' });

  // Check for relevant causal links
  const relevantLinks = state.causalLinks.filter(
    link => antecedent.toLowerCase().includes(link.cause.toLowerCase()) &&
            consequent.toLowerCase().includes(link.effect.toLowerCase())
  );

  const evidence = {
    causalMechanism: relevantLinks.length > 0,
    supporting: relevantLinks.map(l => l.mechanism).filter(Boolean),
    precedents: relevantLinks.length,
  };

  return evaluate(scenario.id, evidence);
}

/**
 * Contrast counterfactuals: What if A vs What if B
 *
 * @param {string} antecedentA - First antecedent
 * @param {string} antecedentB - Second antecedent
 * @param {string} consequent - Shared consequent
 * @returns {object} Contrast analysis
 */
function contrast(antecedentA, antecedentB, consequent) {
  const scenarioA = createScenario(antecedentA, consequent, { type: 'simple' });
  const scenarioB = createScenario(antecedentB, consequent, { type: 'simple' });

  const evalA = evaluate(scenarioA.id);
  const evalB = evaluate(scenarioB.id);

  const difference = evalA.plausibility - evalB.plausibility;
  const preferA = difference > 0;
  const preferB = difference < 0;

  return {
    scenarioA: {
      antecedent: antecedentA,
      plausibility: evalA.plausibility,
      level: evalA.level.name,
    },
    scenarioB: {
      antecedent: antecedentB,
      plausibility: evalB.plausibility,
      level: evalB.level.name,
    },
    consequent,
    comparison: {
      difference: Math.abs(difference),
      stronger: preferA ? 'A' : preferB ? 'B' : 'equal',
      message: preferA
        ? `"${antecedentA.slice(0, 30)}..." more likely to lead to "${consequent.slice(0, 30)}..."`
        : preferB
        ? `"${antecedentB.slice(0, 30)}..." more likely to lead to "${consequent.slice(0, 30)}..."`
        : 'Both scenarios equally plausible',
    },
  };
}

/**
 * Semifactual analysis: Even if A, still B?
 *
 * @param {string} antecedent - Even if this...
 * @param {string} consequent - Would B still hold?
 * @returns {object} Semifactual analysis
 */
function evenIf(antecedent, consequent) {
  const scenario = createScenario(antecedent, consequent, { type: 'semifactual' });

  // Semifactuals are about robustness - B would hold regardless
  // This requires B to be overdetermined or have multiple sufficient causes

  const evidence = {
    supporting: ['Consequence may be overdetermined'],
    precedents: 1,  // Conservative estimate
  };

  const result = evaluate(scenario.id, evidence);

  return {
    ...result,
    interpretation: result.plausibility >= PLAUSIBILITY_THRESHOLD
      ? `*nod* ${consequent.slice(0, 40)}... appears robust to ${antecedent.slice(0, 30)}...`
      : `*sniff* ${consequent.slice(0, 40)}... may depend on conditions incompatible with ${antecedent.slice(0, 30)}...`,
  };
}

/**
 * Get statistics
 */
function getStats() {
  const evaluated = Object.values(state.scenarios).filter(s => s.evaluated);
  const avgPlausibility = evaluated.length > 0
    ? evaluated.reduce((sum, s) => sum + (s.plausibility || 0), 0) / evaluated.length
    : 0;

  return {
    ...state.stats,
    totalScenarios: Object.keys(state.scenarios).length,
    evaluatedScenarios: evaluated.length,
    avgPlausibility: Math.round(avgPlausibility * 100),
    causalLinks: state.causalLinks.length,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `□→ Counterfactual Engine (Stalnaker/Lewis)\n`;
  status += `  Scenarios: ${stats.totalScenarios} (${stats.evaluatedScenarios} evaluated)\n`;
  status += `  Would-claims: ${stats.wouldClaims}\n`;
  status += `  Might-claims: ${stats.mightClaims}\n`;
  status += `  Causal links: ${stats.causalLinks}\n`;
  status += `  Avg plausibility: ${stats.avgPlausibility}%\n`;

  return status;
}

module.exports = {
  init,
  createScenario,
  evaluate,
  addCausalLink,
  whatIf,
  contrast,
  evenIf,
  getStats,
  formatStatus,
  COUNTERFACTUAL_TYPES,
  EVALUATION_STRATEGIES,
  PLAUSIBILITY_LEVELS,
};
