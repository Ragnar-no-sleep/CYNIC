/**
 * Pragmatics Tracker - CYNIC Philosophy Integration
 *
 * Implements speech act theory, conversational implicature, and
 * cooperative communication following Austin, Searle, and Grice.
 *
 * "To say something is to do something" - Austin
 *
 * @module pragmatics-tracker
 */

const fs = require('fs');
const path = require('path');

// φ-derived constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// Configuration
const STORAGE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.cynic',
  'pragmatics'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_ACTS = 200;
const MAX_IMPLICATURES = 100;

/**
 * Speech Act Types (Austin/Searle)
 *
 * Locutionary: the act of saying something
 * Illocutionary: what is done in saying (the force)
 * Perlocutionary: effects on the hearer
 */
const SPEECH_ACT_LEVELS = {
  locutionary: {
    name: 'Locutionary Act',
    description: 'The act of uttering words with meaning',
    level: 1,
    symbol: 'L',
  },
  illocutionary: {
    name: 'Illocutionary Act',
    description: 'The act performed in saying something',
    level: 2,
    symbol: 'I',
    examples: ['asserting', 'promising', 'warning', 'ordering'],
  },
  perlocutionary: {
    name: 'Perlocutionary Act',
    description: 'The effect on the hearer',
    level: 3,
    symbol: 'P',
    examples: ['convincing', 'frightening', 'amusing'],
  },
};

/**
 * Illocutionary Force Types (Searle's taxonomy)
 */
const ILLOCUTIONARY_TYPES = {
  assertive: {
    name: 'Assertive',
    description: 'Commits speaker to truth of proposition',
    direction: 'word-to-world',
    symbol: '⊢',
    examples: ['assert', 'claim', 'report', 'state', 'describe'],
    sincerity: 'belief',
  },
  directive: {
    name: 'Directive',
    description: 'Attempts to get hearer to do something',
    direction: 'world-to-word',
    symbol: '!',
    examples: ['order', 'request', 'command', 'ask', 'advise'],
    sincerity: 'desire',
  },
  commissive: {
    name: 'Commissive',
    description: 'Commits speaker to future action',
    direction: 'world-to-word',
    symbol: '⊨',
    examples: ['promise', 'vow', 'pledge', 'guarantee', 'threaten'],
    sincerity: 'intention',
  },
  expressive: {
    name: 'Expressive',
    description: 'Expresses psychological state',
    direction: 'none',
    symbol: '♡',
    examples: ['thank', 'apologize', 'congratulate', 'condole'],
    sincerity: 'varies',
  },
  declarative: {
    name: 'Declarative',
    description: 'Brings about state of affairs by declaration',
    direction: 'both',
    symbol: '⚡',
    examples: ['pronounce', 'declare', 'appoint', 'fire', 'christen'],
    sincerity: 'none required',
  },
};

/**
 * Grice's Maxims (Cooperative Principle)
 */
const GRICEAN_MAXIMS = {
  quantity: {
    name: 'Quantity',
    description: 'Make your contribution as informative as required',
    submaxims: [
      'Make your contribution as informative as required',
      'Do not make your contribution more informative than required',
    ],
    violations: ['too little info', 'too much info'],
  },
  quality: {
    name: 'Quality',
    description: 'Try to make your contribution true',
    submaxims: [
      'Do not say what you believe to be false',
      'Do not say that for which you lack evidence',
    ],
    violations: ['lying', 'speculation'],
  },
  relation: {
    name: 'Relation (Relevance)',
    description: 'Be relevant',
    submaxims: ['Be relevant to the current exchange'],
    violations: ['irrelevance', 'topic change'],
  },
  manner: {
    name: 'Manner',
    description: 'Be perspicuous',
    submaxims: [
      'Avoid obscurity of expression',
      'Avoid ambiguity',
      'Be brief',
      'Be orderly',
    ],
    violations: ['obscurity', 'ambiguity', 'prolixity'],
  },
};

/**
 * Implicature Types
 */
const IMPLICATURE_TYPES = {
  conversational: {
    name: 'Conversational Implicature',
    description: 'Derived from cooperative principle',
    cancellable: true,
    calculable: true,
    symbol: '⇝',
  },
  conventional: {
    name: 'Conventional Implicature',
    description: 'Attached to linguistic form',
    cancellable: false,
    calculable: false,
    symbol: '↝',
    examples: ['"but" implies contrast', '"even" implies unexpectedness'],
  },
  scalar: {
    name: 'Scalar Implicature',
    description: 'From choice on scale (some → not all)',
    cancellable: true,
    calculable: true,
    symbol: '≤',
  },
};

/**
 * Felicity Conditions (Austin/Searle)
 */
const FELICITY_CONDITIONS = {
  propositional: {
    name: 'Propositional Content',
    description: 'Content must be appropriate for act type',
  },
  preparatory: {
    name: 'Preparatory',
    description: 'Background conditions must hold',
  },
  sincerity: {
    name: 'Sincerity',
    description: 'Speaker must have appropriate mental state',
  },
  essential: {
    name: 'Essential',
    description: 'Utterance counts as the act in question',
  },
};

// State
let state = {
  speechActs: [],         // Recorded speech acts
  implicatures: [],       // Generated implicatures
  conversations: {},      // Conversation contexts
  stats: {
    actsRecorded: 0,
    implicaturesGenerated: 0,
    maximsViolated: 0,
    felicityFailures: 0,
  },
  lastUpdated: null,
};

/**
 * Initialize module
 */
function init() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...saved };
    }
  } catch (err) {
    console.error('Pragmatics tracker init error:', err.message);
  }
}

/**
 * Save state
 */
function saveState() {
  try {
    state.lastUpdated = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Pragmatics tracker save error:', err.message);
  }
}

/**
 * Log to history
 */
function logHistory(entry) {
  try {
    const record = {
      ...entry,
      timestamp: Date.now(),
    };
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(record) + '\n');
  } catch (err) {
    // Silent fail for history
  }
}

/**
 * Analyze a speech act
 *
 * @param {string} utterance - What was said
 * @param {string} speaker - Who said it
 * @param {string} illocutionaryType - Type of illocutionary act
 * @param {object} config - Configuration
 * @returns {object} Speech act analysis
 */
function analyzeSpeechAct(utterance, speaker, illocutionaryType, config = {}) {
  if (state.speechActs.length >= MAX_ACTS) {
    state.speechActs = state.speechActs.slice(-Math.floor(MAX_ACTS * PHI_INV));
  }

  const illoType = ILLOCUTIONARY_TYPES[illocutionaryType] || ILLOCUTIONARY_TYPES.assertive;
  const id = `sa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Check felicity conditions
  const felicityCheck = checkFelicity(utterance, illocutionaryType, config);

  const speechAct = {
    id,
    utterance,
    speaker,
    hearer: config.hearer || null,
    // Three levels
    locutionary: {
      content: utterance,
      propositionalContent: config.propositionalContent || utterance,
    },
    illocutionary: {
      type: illocutionaryType,
      typeInfo: illoType,
      force: illoType.name,
    },
    perlocutionary: {
      intendedEffect: config.intendedEffect || null,
      actualEffect: config.actualEffect || null,
    },
    // Felicity
    felicity: felicityCheck,
    isSuccessful: felicityCheck.allMet,
    // Context
    context: config.context || null,
    conversationId: config.conversationId || null,
    recordedAt: Date.now(),
  };

  state.speechActs.push(speechAct);
  state.stats.actsRecorded++;

  if (!felicityCheck.allMet) {
    state.stats.felicityFailures++;
  }

  logHistory({
    type: 'speech_act_analyzed',
    id,
    illocutionaryType,
    speaker,
    isSuccessful: speechAct.isSuccessful,
  });

  saveState();

  return {
    act: speechAct,
    message: `${illoType.symbol} ${illoType.name}: "${utterance.slice(0, 40)}..." (${speechAct.isSuccessful ? 'felicitous' : 'infelicitous'})`,
  };
}

/**
 * Check felicity conditions
 */
function checkFelicity(utterance, illocutionaryType, config) {
  const conditions = {
    propositional: true,
    preparatory: config.preparatoryMet !== false,
    sincerity: config.sincere !== false,
    essential: true, // Assume essential condition met if act is being performed
  };

  // Type-specific checks
  if (illocutionaryType === 'commissive') {
    // Promise about future action
    conditions.propositional = utterance.toLowerCase().includes('will') ||
                               utterance.toLowerCase().includes('promise') ||
                               config.isFuture !== false;
  }

  if (illocutionaryType === 'directive') {
    // Can hearer do what's requested?
    conditions.preparatory = config.hearerCanDo !== false;
  }

  const allMet = Object.values(conditions).every(v => v);

  return {
    conditions,
    allMet,
    failedConditions: Object.entries(conditions)
      .filter(([, met]) => !met)
      .map(([name]) => name),
  };
}

/**
 * Generate conversational implicature (Grice)
 *
 * @param {string} utterance - What was said
 * @param {string} implied - What is implicated
 * @param {string} maxim - Which maxim is exploited
 * @param {object} config - Configuration
 * @returns {object} Implicature
 */
function generateImplicature(utterance, implied, maxim, config = {}) {
  if (state.implicatures.length >= MAX_IMPLICATURES) {
    state.implicatures = state.implicatures.slice(-Math.floor(MAX_IMPLICATURES * PHI_INV));
  }

  const maximInfo = GRICEAN_MAXIMS[maxim] || GRICEAN_MAXIMS.relation;
  const impType = IMPLICATURE_TYPES[config.type] || IMPLICATURE_TYPES.conversational;
  const id = `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const implicature = {
    id,
    utterance,
    whatIsSaid: utterance,
    whatIsImplicated: implied,
    // Type
    type: config.type || 'conversational',
    typeInfo: impType,
    // Derivation
    maxim,
    maximInfo,
    isViolation: config.isViolation || false, // Flouting vs violating
    isFlouting: config.isFlouting || true,    // Deliberate for effect
    // Properties
    cancellable: impType.cancellable,
    // Calculation showing
    calculation: config.calculation || generateCalculation(utterance, implied, maxim),
    generatedAt: Date.now(),
  };

  state.implicatures.push(implicature);
  state.stats.implicaturesGenerated++;

  if (config.isViolation) {
    state.stats.maximsViolated++;
  }

  logHistory({
    type: 'implicature_generated',
    id,
    maxim,
    implied: implied.slice(0, 50),
  });

  saveState();

  return {
    implicature,
    message: `${impType.symbol} "${utterance.slice(0, 25)}..." +> "${implied.slice(0, 25)}..." (via ${maxim})`,
  };
}

/**
 * Generate calculation for how implicature is derived
 */
function generateCalculation(utterance, implied, maxim) {
  return [
    `1. Speaker said: "${utterance}"`,
    `2. If speaker is being cooperative, they should follow ${maxim}`,
    `3. Literal meaning doesn't fully satisfy ${maxim}`,
    `4. But speaker can be assumed cooperative`,
    `5. Therefore, speaker must also mean: "${implied}"`,
  ];
}

/**
 * Check cooperative principle compliance
 *
 * @param {string} utterance - What was said
 * @param {object} context - Conversational context
 * @returns {object} Compliance check
 */
function checkCooperativePrinciple(utterance, context = {}) {
  const violations = [];
  const compliance = {};

  // Quantity
  if (context.expectedInfo && utterance.length < context.expectedInfo.length * 0.3) {
    violations.push({ maxim: 'quantity', type: 'too_little' });
    compliance.quantity = false;
  } else {
    compliance.quantity = true;
  }

  // Quality
  if (context.speakerKnowsFalse) {
    violations.push({ maxim: 'quality', type: 'lying' });
    compliance.quality = false;
  } else {
    compliance.quality = true;
  }

  // Relation
  if (context.topic && !utterance.toLowerCase().includes(context.topic.toLowerCase().slice(0, 10))) {
    violations.push({ maxim: 'relation', type: 'irrelevant' });
    compliance.relation = false;
  } else {
    compliance.relation = true;
  }

  // Manner
  if (utterance.length > 200 && !context.complexTopicJustified) {
    violations.push({ maxim: 'manner', type: 'prolixity' });
    compliance.manner = false;
  } else {
    compliance.manner = true;
  }

  const isCooperative = violations.length === 0;

  return {
    utterance,
    compliance,
    violations,
    isCooperative,
    message: isCooperative
      ? '✓ Cooperative: all maxims observed'
      : `⚠ ${violations.length} maxim(s) potentially violated: ${violations.map(v => v.maxim).join(', ')}`,
  };
}

/**
 * Perform indirect speech act analysis
 *
 * @param {string} utterance - What was said
 * @param {string} directForce - The literal force
 * @param {string} indirectForce - The intended force
 * @returns {object} Indirect speech act analysis
 */
function analyzeIndirectAct(utterance, directForce, indirectForce) {
  const directType = ILLOCUTIONARY_TYPES[directForce];
  const indirectType = ILLOCUTIONARY_TYPES[indirectForce];

  if (!directType || !indirectType) {
    return { error: 'Unknown illocutionary type' };
  }

  // Classic example: "Can you pass the salt?" is literally a question (assertive about ability)
  // but indirectly a request (directive)

  return {
    utterance,
    literal: {
      force: directForce,
      forceInfo: directType,
    },
    indirect: {
      force: indirectForce,
      forceInfo: indirectType,
    },
    derivation: [
      `Literal interpretation: ${directType.name} - ${directType.description}`,
      `But in context, functions as: ${indirectType.name}`,
      `Hearer recognizes speaker's communicative intention`,
    ],
    isConventionalized: isConventionalizedIndirect(utterance, indirectForce),
    message: `"${utterance.slice(0, 30)}...": ${directType.symbol}→${indirectType.symbol} (${directForce}→${indirectForce})`,
  };
}

/**
 * Check if indirect speech act is conventionalized
 */
function isConventionalizedIndirect(utterance, indirectForce) {
  const lower = utterance.toLowerCase();

  // Common conventionalized forms
  const patterns = {
    directive: ['can you', 'could you', 'would you mind', 'would you please'],
    assertive: ['i think', 'i believe', 'it seems'],
  };

  if (patterns[indirectForce]) {
    return patterns[indirectForce].some(p => lower.includes(p));
  }

  return false;
}

/**
 * Start or get conversation context
 *
 * @param {string} conversationId - Conversation identifier
 * @returns {object} Conversation context
 */
function getConversation(conversationId) {
  if (!state.conversations[conversationId]) {
    state.conversations[conversationId] = {
      id: conversationId,
      acts: [],
      implicatures: [],
      commonGround: [],
      startedAt: Date.now(),
    };
  }
  return state.conversations[conversationId];
}

/**
 * Add to common ground in conversation
 *
 * @param {string} conversationId - Conversation identifier
 * @param {string} proposition - Proposition to add
 * @returns {object} Updated common ground
 */
function addToCommonGround(conversationId, proposition) {
  const conv = getConversation(conversationId);

  if (!conv.commonGround.includes(proposition)) {
    conv.commonGround.push(proposition);
  }

  saveState();

  return {
    conversationId,
    added: proposition,
    commonGroundSize: conv.commonGround.length,
    message: `Common ground +: "${proposition.slice(0, 40)}..."`,
  };
}

/**
 * Get speech act by ID
 */
function getSpeechAct(actId) {
  return state.speechActs.find(a => a.id === actId) || null;
}

/**
 * Get recent speech acts
 */
function getRecentActs(limit = 10) {
  return state.speechActs.slice(-limit);
}

/**
 * Get implicatures
 */
function getImplicatures(limit = 10) {
  return state.implicatures.slice(-limit);
}

/**
 * Format status for display
 */
function formatStatus() {
  const byType = {};
  for (const act of state.speechActs) {
    const type = act.illocutionary.type;
    byType[type] = (byType[type] || 0) + 1;
  }

  const typeSummary = Object.entries(byType)
    .map(([k, v]) => `${ILLOCUTIONARY_TYPES[k]?.symbol || '?'}${v}`)
    .join(' ');

  return `⊢ Pragmatics Tracker (Grice/Austin)
  Speech acts: ${state.stats.actsRecorded} ${typeSummary ? `(${typeSummary})` : ''}
  Implicatures: ${state.stats.implicaturesGenerated}
  Maxim violations: ${state.stats.maximsViolated}
  Felicity failures: ${state.stats.felicityFailures}
  Conversations: ${Object.keys(state.conversations).length}`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    actCount: state.speechActs.length,
    implicatureCount: state.implicatures.length,
    conversationCount: Object.keys(state.conversations).length,
  };
}

module.exports = {
  init,
  analyzeSpeechAct,
  generateImplicature,
  checkCooperativePrinciple,
  analyzeIndirectAct,
  getConversation,
  addToCommonGround,
  getSpeechAct,
  getRecentActs,
  getImplicatures,
  formatStatus,
  getStats,
  SPEECH_ACT_LEVELS,
  ILLOCUTIONARY_TYPES,
  GRICEAN_MAXIMS,
  IMPLICATURE_TYPES,
  FELICITY_CONDITIONS,
};
