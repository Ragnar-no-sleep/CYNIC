/**
 * Inference Engine - Formal Logic & Reasoning
 *
 * Philosophy: From Aristotle's syllogisms to Frege's predicate logic,
 * valid inference is the backbone of rational thought. Truth-preserving
 * transformations that carry certainty from premises to conclusions.
 *
 * Key concepts:
 * - Validity: Conclusion follows necessarily from premises (structure)
 * - Soundness: Valid argument with true premises
 * - Deduction: Certainty-preserving inference
 * - Induction: Probability-enhancing inference
 * - Abduction: Inference to best explanation
 *
 * In CYNIC: Track reasoning patterns, validate inferences,
 * measure argument strength, distinguish valid from sound.
 *
 * @module inference-engine
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
const INFERENCE_DIR = path.join(CYNIC_DIR, 'inference');
const STATE_FILE = path.join(INFERENCE_DIR, 'state.json');
const HISTORY_FILE = path.join(INFERENCE_DIR, 'history.jsonl');

// Constants
const MAX_ARGUMENTS = Math.round(PHI * 50);      // ~81
const MAX_INFERENCES = Math.round(PHI * 200);    // ~324
const VALIDITY_THRESHOLD = PHI_INV;              // 0.618

/**
 * Inference types
 */
const INFERENCE_TYPES = {
  deductive: {
    name: 'Deductive',
    description: 'Certainty-preserving: if premises true, conclusion must be true',
    symbol: '⊢',
    strengthMultiplier: 1.0,  // Perfect transfer
  },
  inductive: {
    name: 'Inductive',
    description: 'Probability-enhancing: premises support but don\'t guarantee',
    symbol: '⊨',
    strengthMultiplier: PHI_INV,  // Partial transfer
  },
  abductive: {
    name: 'Abductive',
    description: 'Inference to best explanation',
    symbol: '∴',
    strengthMultiplier: PHI_INV_2,  // Weaker transfer
  },
  analogical: {
    name: 'Analogical',
    description: 'Inference from similarity',
    symbol: '≈',
    strengthMultiplier: PHI_INV_3,  // Weakest transfer
  },
};

/**
 * Valid inference patterns (deductive rules)
 */
const INFERENCE_PATTERNS = {
  modus_ponens: {
    name: 'Modus Ponens',
    description: 'P → Q, P ⊢ Q',
    symbol: 'MP',
    premises: ['P → Q', 'P'],
    conclusion: 'Q',
    validity: 1.0,
  },
  modus_tollens: {
    name: 'Modus Tollens',
    description: 'P → Q, ¬Q ⊢ ¬P',
    symbol: 'MT',
    premises: ['P → Q', '¬Q'],
    conclusion: '¬P',
    validity: 1.0,
  },
  hypothetical_syllogism: {
    name: 'Hypothetical Syllogism',
    description: 'P → Q, Q → R ⊢ P → R',
    symbol: 'HS',
    premises: ['P → Q', 'Q → R'],
    conclusion: 'P → R',
    validity: 1.0,
  },
  disjunctive_syllogism: {
    name: 'Disjunctive Syllogism',
    description: 'P ∨ Q, ¬P ⊢ Q',
    symbol: 'DS',
    premises: ['P ∨ Q', '¬P'],
    conclusion: 'Q',
    validity: 1.0,
  },
  constructive_dilemma: {
    name: 'Constructive Dilemma',
    description: '(P → Q), (R → S), (P ∨ R) ⊢ (Q ∨ S)',
    symbol: 'CD',
    premises: ['P → Q', 'R → S', 'P ∨ R'],
    conclusion: 'Q ∨ S',
    validity: 1.0,
  },
  conjunction: {
    name: 'Conjunction',
    description: 'P, Q ⊢ P ∧ Q',
    symbol: '∧I',
    premises: ['P', 'Q'],
    conclusion: 'P ∧ Q',
    validity: 1.0,
  },
  simplification: {
    name: 'Simplification',
    description: 'P ∧ Q ⊢ P',
    symbol: '∧E',
    premises: ['P ∧ Q'],
    conclusion: 'P',
    validity: 1.0,
  },
  addition: {
    name: 'Addition',
    description: 'P ⊢ P ∨ Q',
    symbol: '∨I',
    premises: ['P'],
    conclusion: 'P ∨ Q',
    validity: 1.0,
  },
};

/**
 * Argument strength levels
 */
const STRENGTH_LEVELS = {
  invalid: {
    threshold: 0,
    name: 'Invalid',
    description: 'Conclusion does not follow',
    symbol: '✕',
  },
  weak: {
    threshold: PHI_INV_3,
    name: 'Weak',
    description: 'Some support, not compelling',
    symbol: '◔',
  },
  moderate: {
    threshold: PHI_INV_2,
    name: 'Moderate',
    description: 'Reasonable support',
    symbol: '◑',
  },
  strong: {
    threshold: PHI_INV,
    name: 'Strong',
    description: 'Compelling support',
    symbol: '◕',
  },
  valid: {
    threshold: 1.0 - PHI_INV_3,
    name: 'Valid',
    description: 'Logically necessary',
    symbol: '●',
  },
};

// In-memory state
let state = {
  arguments: {},      // Constructed arguments
  inferences: [],     // Inference history
  patterns: {},       // Pattern usage tracking
  stats: {
    argumentsConstructed: 0,
    inferencesDrawn: 0,
    validInferences: 0,
    soundInferences: 0,
    patternsUsed: {},
  },
};

/**
 * Initialize the inference engine
 */
function init() {
  if (!fs.existsSync(INFERENCE_DIR)) {
    fs.mkdirSync(INFERENCE_DIR, { recursive: true });
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
 * Construct an argument
 *
 * @param {array} premises - Premise statements
 * @param {string} conclusion - Conclusion statement
 * @param {object} config - Configuration
 * @returns {object} Constructed argument
 */
function constructArgument(premises, conclusion, config = {}) {
  // Prune if needed
  if (Object.keys(state.arguments).length >= MAX_ARGUMENTS) {
    pruneOldArguments();
  }

  const id = `arg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const argument = {
    id,
    premises: premises.map((p, i) => ({
      id: `p${i + 1}`,
      content: p.content || p,
      truth: p.truth !== undefined ? p.truth : null,  // null = unknown
      confidence: p.confidence || PHI_INV_2,
    })),
    conclusion: {
      content: conclusion.content || conclusion,
      truth: null,  // Determined by inference
      confidence: 0,
    },
    inferenceType: config.type || 'deductive',
    inferenceTypeInfo: INFERENCE_TYPES[config.type] || INFERENCE_TYPES.deductive,
    pattern: config.pattern || null,
    patternInfo: config.pattern ? INFERENCE_PATTERNS[config.pattern] : null,
    // Evaluation
    validity: null,
    soundness: null,
    strength: null,
    strengthLevel: null,
    constructedAt: Date.now(),
    evaluatedAt: null,
  };

  state.arguments[id] = argument;
  state.stats.argumentsConstructed++;

  logHistory({
    type: 'argument_constructed',
    id,
    premiseCount: premises.length,
    inferenceType: argument.inferenceType,
  });

  saveState();

  return argument;
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
 * Evaluate argument validity
 * (Does the conclusion follow from the premises, regardless of truth?)
 *
 * @param {string} argumentId - Argument ID
 * @returns {object} Validity evaluation
 */
function evaluateValidity(argumentId) {
  const argument = state.arguments[argumentId];
  if (!argument) return { error: 'Argument not found' };

  let validity = 0;

  // If using a known valid pattern, validity is 1.0
  if (argument.patternInfo && argument.patternInfo.validity === 1.0) {
    validity = 1.0;
  } else if (argument.inferenceType === 'deductive') {
    // For deductive without known pattern, assume weaker validity
    validity = PHI_INV;
  } else {
    // Non-deductive inferences have inherent validity limits
    validity = argument.inferenceTypeInfo.strengthMultiplier;
  }

  argument.validity = validity;
  argument.evaluatedAt = Date.now();

  // Determine strength level
  argument.strengthLevel = getStrengthLevel(validity);

  // Track pattern usage
  if (argument.pattern) {
    if (!state.stats.patternsUsed[argument.pattern]) {
      state.stats.patternsUsed[argument.pattern] = 0;
    }
    state.stats.patternsUsed[argument.pattern]++;
  }

  if (validity >= VALIDITY_THRESHOLD) {
    state.stats.validInferences++;
  }

  saveState();

  return {
    argument,
    validity: Math.round(validity * 100),
    isValid: validity >= VALIDITY_THRESHOLD,
    level: argument.strengthLevel,
    pattern: argument.patternInfo?.name || 'Custom',
  };
}

/**
 * Evaluate argument soundness
 * (Valid + all premises true)
 *
 * @param {string} argumentId - Argument ID
 * @returns {object} Soundness evaluation
 */
function evaluateSoundness(argumentId) {
  const argument = state.arguments[argumentId];
  if (!argument) return { error: 'Argument not found' };

  // First ensure validity is evaluated
  if (argument.validity === null) {
    evaluateValidity(argumentId);
  }

  // Check premise truth
  const premisesTruth = argument.premises.map(p => p.truth);
  const allPremisesTrue = premisesTruth.every(t => t === true);
  const anyPremiseFalse = premisesTruth.some(t => t === false);
  const anyPremiseUnknown = premisesTruth.some(t => t === null);

  let soundness = 0;
  let soundnessStatus = 'unsound';

  if (argument.validity >= VALIDITY_THRESHOLD && allPremisesTrue) {
    soundness = argument.validity;
    soundnessStatus = 'sound';
    state.stats.soundInferences++;
  } else if (argument.validity >= VALIDITY_THRESHOLD && anyPremiseUnknown && !anyPremiseFalse) {
    // Valid but premises uncertain
    const knownTrueCount = premisesTruth.filter(t => t === true).length;
    soundness = argument.validity * (knownTrueCount / premisesTruth.length);
    soundnessStatus = 'potentially_sound';
  } else if (anyPremiseFalse) {
    soundness = 0;
    soundnessStatus = 'unsound_false_premise';
  } else {
    soundness = 0;
    soundnessStatus = 'invalid';
  }

  argument.soundness = soundness;

  // If sound, conclusion inherits truth
  if (soundnessStatus === 'sound' && argument.inferenceType === 'deductive') {
    argument.conclusion.truth = true;
    argument.conclusion.confidence = Math.min(
      PHI_INV,
      Math.min(...argument.premises.map(p => p.confidence))
    );
  }

  saveState();

  return {
    argument,
    soundness: Math.round(soundness * 100),
    status: soundnessStatus,
    validity: Math.round(argument.validity * 100),
    premiseTruth: premisesTruth,
    conclusionTruth: argument.conclusion.truth,
  };
}

/**
 * Draw an inference using a pattern
 *
 * @param {string} patternName - Inference pattern name
 * @param {object} bindings - Variable bindings
 * @returns {object} Inference result
 */
function infer(patternName, bindings) {
  const pattern = INFERENCE_PATTERNS[patternName];
  if (!pattern) {
    return { error: `Unknown inference pattern: ${patternName}` };
  }

  // Prune inferences if needed
  if (state.inferences.length >= MAX_INFERENCES) {
    state.inferences = state.inferences.slice(-Math.round(MAX_INFERENCES * PHI_INV));
  }

  const inference = {
    id: `inf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pattern: patternName,
    patternInfo: pattern,
    bindings,
    premises: pattern.premises.map(p => substituteBindings(p, bindings)),
    conclusion: substituteBindings(pattern.conclusion, bindings),
    validity: pattern.validity,
    timestamp: Date.now(),
  };

  state.inferences.push(inference);
  state.stats.inferencesDrawn++;

  if (inference.validity >= VALIDITY_THRESHOLD) {
    state.stats.validInferences++;
  }

  // Track pattern usage
  if (!state.stats.patternsUsed[patternName]) {
    state.stats.patternsUsed[patternName] = 0;
  }
  state.stats.patternsUsed[patternName]++;

  logHistory({
    type: 'inference_drawn',
    id: inference.id,
    pattern: patternName,
    conclusion: inference.conclusion,
  });

  saveState();

  return {
    inference,
    pattern: pattern.name,
    symbol: pattern.symbol,
    premises: inference.premises,
    conclusion: inference.conclusion,
    validity: Math.round(inference.validity * 100),
  };
}

/**
 * Substitute bindings into a formula
 */
function substituteBindings(formula, bindings) {
  let result = formula;
  for (const [variable, value] of Object.entries(bindings)) {
    result = result.replace(new RegExp(variable, 'g'), value);
  }
  return result;
}

/**
 * Get strength level from validity score
 */
function getStrengthLevel(validity) {
  for (const [name, config] of Object.entries(STRENGTH_LEVELS).reverse()) {
    if (validity >= config.threshold) {
      return { name, ...config };
    }
  }
  return STRENGTH_LEVELS.invalid;
}

/**
 * Check if an argument commits a formal fallacy
 *
 * @param {string} argumentId - Argument ID
 * @returns {object} Fallacy check result
 */
function checkFormalFallacy(argumentId) {
  const argument = state.arguments[argumentId];
  if (!argument) return { error: 'Argument not found' };

  const fallacies = [];

  // Check for affirming the consequent: P → Q, Q ⊢ P (INVALID)
  // Check for denying the antecedent: P → Q, ¬P ⊢ ¬Q (INVALID)
  // These require pattern matching on premise structure

  // For now, flag arguments with low validity that claim to be deductive
  if (argument.inferenceType === 'deductive' &&
      argument.validity !== null &&
      argument.validity < VALIDITY_THRESHOLD &&
      !argument.patternInfo) {
    fallacies.push({
      type: 'invalid_deduction',
      description: 'Claims deductive validity but structure does not guarantee it',
    });
  }

  return {
    argument,
    hasFallacy: fallacies.length > 0,
    fallacies,
    message: fallacies.length > 0
      ? `*sniff* Detected ${fallacies.length} formal fallacy issue(s)`
      : '*nod* No formal fallacies detected',
  };
}

/**
 * Calculate argument strength (for non-deductive)
 *
 * @param {string} argumentId - Argument ID
 * @returns {object} Strength calculation
 */
function calculateStrength(argumentId) {
  const argument = state.arguments[argumentId];
  if (!argument) return { error: 'Argument not found' };

  // For deductive, strength = validity
  if (argument.inferenceType === 'deductive') {
    argument.strength = argument.validity || 0;
  } else {
    // For inductive/abductive, factor in premise confidence
    const avgPremiseConfidence = argument.premises.reduce(
      (sum, p) => sum + p.confidence, 0
    ) / argument.premises.length;

    const typeMultiplier = argument.inferenceTypeInfo.strengthMultiplier;
    argument.strength = avgPremiseConfidence * typeMultiplier;
  }

  argument.strengthLevel = getStrengthLevel(argument.strength);

  saveState();

  return {
    argument,
    strength: Math.round(argument.strength * 100),
    level: argument.strengthLevel,
    type: argument.inferenceType,
    message: `${argument.strengthLevel.symbol} ${argument.strengthLevel.name} argument`,
  };
}

/**
 * Get pattern statistics
 */
function getPatternStats() {
  return Object.entries(state.stats.patternsUsed)
    .map(([pattern, count]) => ({
      pattern,
      name: INFERENCE_PATTERNS[pattern]?.name || pattern,
      count,
      symbol: INFERENCE_PATTERNS[pattern]?.symbol || '?',
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get statistics
 */
function getStats() {
  const validRate = state.stats.inferencesDrawn > 0
    ? state.stats.validInferences / state.stats.inferencesDrawn
    : 0;

  return {
    ...state.stats,
    totalArguments: Object.keys(state.arguments).length,
    totalInferences: state.inferences.length,
    validityRate: Math.round(validRate * 100),
    topPatterns: getPatternStats().slice(0, 3),
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `⊢ Inference Engine (Aristotle/Frege)\n`;
  status += `  Arguments: ${stats.totalArguments}\n`;
  status += `  Inferences: ${stats.totalInferences}\n`;
  status += `  Validity rate: ${stats.validityRate}%\n`;
  status += `  Sound inferences: ${stats.soundInferences}\n`;

  if (stats.topPatterns.length > 0) {
    status += `  Top patterns:\n`;
    for (const p of stats.topPatterns) {
      status += `    ${p.symbol} ${p.name}: ${p.count}x\n`;
    }
  }

  return status;
}

module.exports = {
  init,
  constructArgument,
  evaluateValidity,
  evaluateSoundness,
  infer,
  checkFormalFallacy,
  calculateStrength,
  getPatternStats,
  getStats,
  formatStatus,
  INFERENCE_TYPES,
  INFERENCE_PATTERNS,
  STRENGTH_LEVELS,
};
