/**
 * Context Manager - CYNIC Philosophy Integration
 *
 * Implements context-dependent meaning, indexicals, and common ground
 * following Kaplan, Stalnaker, and dynamic semantics.
 *
 * "I" refers to whoever utters it - Kaplan
 *
 * @module context-manager
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
  'context'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_CONTEXTS = 50;
const MAX_COMMON_GROUND = 100;

/**
 * Kaplan's Context Parameters
 * Context provides values needed to interpret indexicals
 */
const CONTEXT_PARAMETERS = {
  agent: {
    name: 'Agent',
    description: 'The speaker/writer',
    indexicals: ['I', 'me', 'my', 'mine', 'myself'],
    symbol: 'cₐ',
  },
  time: {
    name: 'Time',
    description: 'Time of utterance',
    indexicals: ['now', 'today', 'yesterday', 'tomorrow'],
    symbol: 'cₜ',
  },
  location: {
    name: 'Location',
    description: 'Place of utterance',
    indexicals: ['here', 'there', 'this place'],
    symbol: 'cₗ',
  },
  addressee: {
    name: 'Addressee',
    description: 'The hearer/reader',
    indexicals: ['you', 'your', 'yours', 'yourself'],
    symbol: 'cₕ',
  },
  world: {
    name: 'World',
    description: 'Possible world of utterance',
    indexicals: ['actually', 'in fact'],
    symbol: 'cᵥ',
  },
};

/**
 * Indexical Types
 */
const INDEXICAL_TYPES = {
  pure: {
    name: 'Pure Indexical',
    description: 'Reference fixed by linguistic rule alone',
    examples: ['I', 'now', 'today', 'here'],
    requiresDemonstration: false,
  },
  demonstrative: {
    name: 'Demonstrative',
    description: 'Reference requires demonstration/intention',
    examples: ['this', 'that', 'he', 'she'],
    requiresDemonstration: true,
  },
};

/**
 * Context Update Operations (Dynamic Semantics)
 */
const UPDATE_OPERATIONS = {
  assertion: {
    name: 'Assertion',
    description: 'Adds proposition to common ground',
    symbol: '+',
    effect: 'common_ground := common_ground ∪ {p}',
  },
  question: {
    name: 'Question',
    description: 'Partitions context set',
    symbol: '?',
    effect: 'Raises issue to be resolved',
  },
  presupposition: {
    name: 'Presupposition',
    description: 'Requires proposition already in common ground',
    symbol: '≫',
    effect: 'Filters contexts where presupposition holds',
  },
  accommodation: {
    name: 'Accommodation',
    description: 'Silently adds presupposition to common ground',
    symbol: '↑',
    effect: 'If presupposition not in CG, add it',
  },
};

/**
 * Common Ground Status
 */
const CG_STATUS = {
  mutual_belief: {
    name: 'Mutual Belief',
    description: 'Both parties believe and believe other believes',
    strength: PHI_INV + PHI_INV_2,
  },
  presumed: {
    name: 'Presumed',
    description: 'Treated as common ground without verification',
    strength: PHI_INV,
  },
  accommodated: {
    name: 'Accommodated',
    description: 'Added via presupposition accommodation',
    strength: PHI_INV_2,
  },
  disputed: {
    name: 'Disputed',
    description: 'In common ground but contested',
    strength: PHI_INV_3,
  },
};

// State
let state = {
  contexts: {},          // Active contexts
  currentContext: null,  // Current context ID
  commonGrounds: {},     // Common ground by conversation
  resolutions: [],       // Indexical resolutions
  stats: {
    contextsCreated: 0,
    indexicalsResolved: 0,
    updatesPerformed: 0,
    accommodations: 0,
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
    console.error('Context manager init error:', err.message);
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
    console.error('Context manager save error:', err.message);
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
 * Create a context (Kaplan's context of utterance)
 *
 * @param {object} params - Context parameters
 * @returns {object} Created context
 */
function createContext(params = {}) {
  if (Object.keys(state.contexts).length >= MAX_CONTEXTS) {
    // Prune old contexts
    const ids = Object.keys(state.contexts);
    for (let i = 0; i < Math.floor(ids.length * PHI_INV_2); i++) {
      delete state.contexts[ids[i]];
    }
  }

  const id = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const context = {
    id,
    // Kaplan's context tuple
    agent: params.agent || null,      // cₐ
    time: params.time || Date.now(),  // cₜ
    location: params.location || null, // cₗ
    addressee: params.addressee || null, // cₕ
    world: params.world || 'actual',  // cᵥ
    // Additional parameters
    discourse: params.discourse || [], // Previous utterances
    salience: params.salience || {},   // Salient entities for demonstratives
    // Common ground link
    commonGroundId: params.commonGroundId || null,
    createdAt: Date.now(),
  };

  state.contexts[id] = context;
  state.currentContext = id;
  state.stats.contextsCreated++;

  // Initialize common ground if needed
  if (context.commonGroundId && !state.commonGrounds[context.commonGroundId]) {
    state.commonGrounds[context.commonGroundId] = {
      id: context.commonGroundId,
      propositions: [],
      participants: [context.agent, context.addressee].filter(Boolean),
    };
  }

  logHistory({
    type: 'context_created',
    id,
    agent: context.agent,
  });

  saveState();

  return {
    context,
    message: `Context created: agent=${context.agent || '?'}, time=${new Date(context.time).toISOString().slice(0, 19)}`,
  };
}

/**
 * Resolve an indexical expression (Kaplan's character → content)
 *
 * @param {string} expression - The indexical expression
 * @param {string} contextId - Context to use (default: current)
 * @returns {object} Resolution result
 */
function resolveIndexical(expression, contextId = null) {
  const ctx = state.contexts[contextId || state.currentContext];
  if (!ctx) return { error: 'No context available' };

  const lower = expression.toLowerCase();

  // Find which parameter this indexical uses
  let parameter = null;
  let indexicalType = INDEXICAL_TYPES.pure;

  for (const [key, param] of Object.entries(CONTEXT_PARAMETERS)) {
    if (param.indexicals.some(i => lower === i.toLowerCase())) {
      parameter = key;
      break;
    }
  }

  // Check demonstratives
  if (!parameter) {
    if (['this', 'that', 'these', 'those', 'he', 'she', 'it', 'they'].includes(lower)) {
      indexicalType = INDEXICAL_TYPES.demonstrative;
      // Demonstratives need salience
      const salientEntity = ctx.salience[lower] || ctx.salience.default;
      if (salientEntity) {
        const resolution = {
          expression,
          type: 'demonstrative',
          typeInfo: indexicalType,
          referent: salientEntity,
          context: ctx.id,
          requiresDemonstration: true,
          demonstratum: salientEntity,
          message: `"${expression}" → ${salientEntity} (demonstrative, from salience)`,
        };

        state.resolutions.push({ ...resolution, resolvedAt: Date.now() });
        state.stats.indexicalsResolved++;
        saveState();

        return resolution;
      }
      return {
        expression,
        type: 'demonstrative',
        resolved: false,
        error: 'No salient referent for demonstrative',
        message: `Cannot resolve "${expression}" - no demonstration/salience`,
      };
    }
    return {
      expression,
      resolved: false,
      error: 'Not a recognized indexical',
    };
  }

  // Pure indexical resolution
  const paramInfo = CONTEXT_PARAMETERS[parameter];
  const referent = ctx[parameter];

  const resolution = {
    expression,
    type: 'pure_indexical',
    typeInfo: indexicalType,
    parameter,
    parameterInfo: paramInfo,
    referent,
    context: ctx.id,
    character: `λc. c${paramInfo.symbol.slice(1)}`, // The character function
    content: referent, // Content relative to this context
    message: referent !== null
      ? `"${expression}" → ${referent} (${parameter} from context)`
      : `"${expression}" → unspecified (no ${parameter} in context)`,
  };

  state.resolutions.push({ ...resolution, resolvedAt: Date.now() });
  state.stats.indexicalsResolved++;
  saveState();

  return resolution;
}

/**
 * Update common ground (Stalnaker)
 *
 * @param {string} commonGroundId - Common ground to update
 * @param {string} proposition - Proposition to add
 * @param {string} operation - Update operation type
 * @returns {object} Update result
 */
function updateCommonGround(commonGroundId, proposition, operation = 'assertion') {
  if (!state.commonGrounds[commonGroundId]) {
    state.commonGrounds[commonGroundId] = {
      id: commonGroundId,
      propositions: [],
      participants: [],
    };
  }

  const cg = state.commonGrounds[commonGroundId];
  const op = UPDATE_OPERATIONS[operation] || UPDATE_OPERATIONS.assertion;

  let result;

  switch (operation) {
    case 'assertion':
      // Add to common ground
      if (!cg.propositions.find(p => p.content === proposition)) {
        cg.propositions.push({
          content: proposition,
          status: 'mutual_belief',
          statusInfo: CG_STATUS.mutual_belief,
          addedVia: 'assertion',
          addedAt: Date.now(),
        });
      }
      result = { added: true };
      break;

    case 'presupposition': {
      // Check if already in common ground
      const exists = cg.propositions.find(p => p.content === proposition);
      if (exists) {
        result = { presuppositionSatisfied: true };
      } else {
        result = {
          presuppositionSatisfied: false,
          requiresAccommodation: true,
        };
      }
      break;
    }

    case 'accommodation':
      // Add presupposition to common ground
      if (!cg.propositions.find(p => p.content === proposition)) {
        cg.propositions.push({
          content: proposition,
          status: 'accommodated',
          statusInfo: CG_STATUS.accommodated,
          addedVia: 'accommodation',
          addedAt: Date.now(),
        });
        state.stats.accommodations++;
      }
      result = { accommodated: true };
      break;

    case 'question':
      // Mark as issue
      cg.openIssues = cg.openIssues || [];
      cg.openIssues.push({
        question: proposition,
        raisedAt: Date.now(),
      });
      result = { issueRaised: true };
      break;

    default:
      result = { error: 'Unknown operation' };
  }

  state.stats.updatesPerformed++;

  logHistory({
    type: 'common_ground_update',
    commonGroundId,
    operation,
    proposition: proposition.slice(0, 50),
  });

  saveState();

  return {
    commonGroundId,
    operation,
    operationInfo: op,
    proposition,
    result,
    commonGroundSize: cg.propositions.length,
    message: `${op.symbol} CG update (${operation}): "${proposition.slice(0, 40)}..."`,
  };
}

/**
 * Check if proposition is in common ground
 *
 * @param {string} commonGroundId - Common ground to check
 * @param {string} proposition - Proposition to check
 * @returns {object} Check result
 */
function isInCommonGround(commonGroundId, proposition) {
  const cg = state.commonGrounds[commonGroundId];
  if (!cg) return { inCommonGround: false, error: 'Common ground not found' };

  const found = cg.propositions.find(p =>
    p.content.toLowerCase() === proposition.toLowerCase()
  );

  return {
    proposition,
    commonGroundId,
    inCommonGround: !!found,
    status: found?.status || null,
    message: found
      ? `✓ "${proposition.slice(0, 30)}..." is in common ground (${found.status})`
      : `○ "${proposition.slice(0, 30)}..." not in common ground`,
  };
}

/**
 * Set salient entity for demonstrative resolution
 *
 * @param {string} contextId - Context to update
 * @param {string} demonstrative - Which demonstrative
 * @param {any} entity - The salient entity
 * @returns {object} Update result
 */
function setSalience(contextId, demonstrative, entity) {
  const ctx = state.contexts[contextId || state.currentContext];
  if (!ctx) return { error: 'Context not found' };

  ctx.salience[demonstrative.toLowerCase()] = entity;
  saveState();

  return {
    contextId: ctx.id,
    demonstrative,
    entity,
    message: `Salience set: "${demonstrative}" → ${entity}`,
  };
}

/**
 * Get character of an expression (Kaplan)
 * Character: function from contexts to contents
 *
 * @param {string} expression - Expression to get character for
 * @returns {object} Character description
 */
function getCharacter(expression) {
  const lower = expression.toLowerCase();

  // Find matching indexical
  for (const [key, param] of Object.entries(CONTEXT_PARAMETERS)) {
    if (param.indexicals.some(i => lower === i.toLowerCase())) {
      return {
        expression,
        isIndexical: true,
        character: `λc. c.${key}`,
        description: `Function that takes context c and returns the ${param.name.toLowerCase()} of c`,
        parameterInfo: param,
        message: `Character of "${expression}": λc. ${param.symbol}`,
      };
    }
  }

  // Non-indexical - constant character
  return {
    expression,
    isIndexical: false,
    character: `λc. "${expression}"`,
    description: 'Constant function - same content in all contexts',
    message: `Character of "${expression}": constant (non-indexical)`,
  };
}

/**
 * Get current context
 */
function getCurrentContext() {
  return state.contexts[state.currentContext] || null;
}

/**
 * Get context by ID
 */
function getContext(contextId) {
  return state.contexts[contextId] || null;
}

/**
 * Get common ground
 */
function getCommonGround(commonGroundId) {
  return state.commonGrounds[commonGroundId] || null;
}

/**
 * Set current context
 */
function setCurrentContext(contextId) {
  if (!state.contexts[contextId]) return { error: 'Context not found' };
  state.currentContext = contextId;
  saveState();
  return { currentContext: contextId };
}

/**
 * Format status for display
 */
function formatStatus() {
  const cgSize = Object.values(state.commonGrounds)
    .reduce((sum, cg) => sum + cg.propositions.length, 0);

  return `⟨c⟩ Context Manager (Kaplan/Stalnaker)
  Contexts: ${Object.keys(state.contexts).length} (current: ${state.currentContext ? 'set' : 'none'})
  Common grounds: ${Object.keys(state.commonGrounds).length} (${cgSize} propositions)
  Indexicals resolved: ${state.stats.indexicalsResolved}
  Updates: ${state.stats.updatesPerformed}
  Accommodations: ${state.stats.accommodations}`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    contextCount: Object.keys(state.contexts).length,
    commonGroundCount: Object.keys(state.commonGrounds).length,
    hasCurrentContext: !!state.currentContext,
  };
}

module.exports = {
  init,
  createContext,
  resolveIndexical,
  updateCommonGround,
  isInCommonGround,
  setSalience,
  getCharacter,
  getCurrentContext,
  getContext,
  getCommonGround,
  setCurrentContext,
  formatStatus,
  getStats,
  CONTEXT_PARAMETERS,
  INDEXICAL_TYPES,
  UPDATE_OPERATIONS,
  CG_STATUS,
};
