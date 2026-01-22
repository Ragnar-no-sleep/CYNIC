/**
 * Deontic Logic - CYNIC Philosophy Integration
 *
 * Implements the logic of obligations, permissions, and prohibitions
 * following Von Wright's deontic logic and extensions.
 *
 * "Ought implies can" - Kant
 *
 * @module deontic-logic
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
  'deontic-logic'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_NORMS = 100;
const MAX_CONFLICTS = 50;

/**
 * Deontic Operators (Von Wright)
 * O = Obligatory, P = Permitted, F = Forbidden
 */
const DEONTIC_OPERATORS = {
  O: {
    name: 'Obligatory',
    description: 'Must be done (duty)',
    symbol: 'O',
    fullSymbol: '⊙',
    strength: PHI_INV + PHI_INV_2, // Strongest
  },
  P: {
    name: 'Permitted',
    description: 'May be done (allowed)',
    symbol: 'P',
    fullSymbol: '◎',
    strength: PHI_INV,
  },
  F: {
    name: 'Forbidden',
    description: 'Must not be done (prohibited)',
    symbol: 'F',
    fullSymbol: '⊘',
    strength: PHI_INV + PHI_INV_2,
  },
  I: {
    name: 'Indifferent',
    description: 'Neither obligatory nor forbidden',
    symbol: 'I',
    fullSymbol: '○',
    strength: PHI_INV_3,
  },
};

/**
 * Deontic Relations (Square of Opposition)
 *
 *        O(p) ←contraries→ F(p)
 *         ↓                  ↓
 *     subaltern          subaltern
 *         ↓                  ↓
 *        P(p) ←subcontraries→ P(¬p)
 *
 * Key relations:
 * - O(p) → P(p)  (obligatory implies permitted)
 * - F(p) → P(¬p) (forbidden implies permitted to not do)
 * - O(p) ↔ F(¬p) (obligatory iff forbidden to not)
 * - F(p) ↔ O(¬p) (forbidden iff obligatory to not)
 */
const DEONTIC_RELATIONS = {
  implies: {
    name: 'Implies',
    description: 'Deontic entailment',
    symbol: '→',
  },
  contraries: {
    name: 'Contraries',
    description: 'Cannot both be true, can both be false',
    symbol: '⊥⊥',
  },
  subcontraries: {
    name: 'Subcontraries',
    description: 'Can both be true, cannot both be false',
    symbol: '⊤⊤',
  },
  contradictories: {
    name: 'Contradictories',
    description: 'Exactly one must be true',
    symbol: '⊕',
  },
  subaltern: {
    name: 'Subaltern',
    description: 'Truth flows down',
    symbol: '↓',
  },
};

/**
 * Norm Types
 */
const NORM_TYPES = {
  prescriptive: {
    name: 'Prescriptive',
    description: 'Commands or prohibitions',
    weight: PHI_INV + PHI_INV_2,
  },
  permissive: {
    name: 'Permissive',
    description: 'Authorizations',
    weight: PHI_INV,
  },
  constitutive: {
    name: 'Constitutive',
    description: 'Creates normative status',
    weight: PHI_INV_2,
  },
  power_conferring: {
    name: 'Power-Conferring',
    description: 'Grants normative abilities',
    weight: PHI_INV,
  },
};

/**
 * Conflict Types
 */
const CONFLICT_TYPES = {
  direct: {
    name: 'Direct Conflict',
    description: 'O(p) and F(p) for same action',
    severity: 1.0,
    symbol: '⚡',
  },
  contrary_to_duty: {
    name: 'Contrary-to-Duty',
    description: 'What ought to be done when duty is violated',
    severity: PHI_INV,
    symbol: '⟳',
    // E.g., "Don't lie, but if you lie, apologize"
  },
  prima_facie: {
    name: 'Prima Facie Conflict',
    description: 'Apparent conflict resolvable by weighing',
    severity: PHI_INV_2,
    symbol: '~',
  },
  dilemma: {
    name: 'Moral Dilemma',
    description: 'Genuine irresolvable conflict',
    severity: 1.0,
    symbol: '⚔',
  },
};

// State
let state = {
  norms: {},            // Registered norms
  agents: {},           // Agents with obligations
  conflicts: [],        // Detected conflicts
  derivations: [],      // Derived obligations
  stats: {
    normsRegistered: 0,
    obligationsAssigned: 0,
    conflictsDetected: 0,
    derivationsMade: 0,
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
    console.error('Deontic logic init error:', err.message);
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
    console.error('Deontic logic save error:', err.message);
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
 * Register a norm
 *
 * @param {string} action - The action in question
 * @param {string} operator - Deontic operator (O, P, F, I)
 * @param {object} config - Configuration
 * @returns {object} Registered norm
 */
function registerNorm(action, operator, config = {}) {
  if (Object.keys(state.norms).length >= MAX_NORMS) {
    return { error: 'Maximum norms reached' };
  }

  const op = DEONTIC_OPERATORS[operator] || DEONTIC_OPERATORS.P;
  const normType = NORM_TYPES[config.type] || NORM_TYPES.prescriptive;
  const id = `${operator.toLowerCase()}_${action.toLowerCase().replace(/\s+/g, '_')}`;

  // Check for immediate contradiction
  const negatedOp = operator === 'O' ? 'F' : operator === 'F' ? 'O' : null;
  if (negatedOp) {
    const contradictId = `${negatedOp.toLowerCase()}_${action.toLowerCase().replace(/\s+/g, '_')}`;
    if (state.norms[contradictId]) {
      return {
        error: 'Contradictory norm exists',
        conflict: {
          new: id,
          existing: contradictId,
          type: 'direct',
        },
      };
    }
  }

  const norm = {
    id,
    action,
    operator,
    operatorInfo: op,
    type: config.type || 'prescriptive',
    typeInfo: normType,
    // Scope
    agent: config.agent || '*',        // Who is bound
    condition: config.condition || null, // When applicable
    source: config.source || 'declared', // Where it comes from
    // Strength and priority
    strength: op.strength * normType.weight,
    priority: config.priority || 0,
    // Metadata
    registeredAt: Date.now(),
  };

  state.norms[id] = norm;
  state.stats.normsRegistered++;

  // Auto-derive related norms
  autoDerive(norm);

  logHistory({
    type: 'norm_registered',
    id,
    operator,
    action,
  });

  saveState();

  return {
    norm,
    message: `${op.fullSymbol} ${op.name}(${action})`,
  };
}

/**
 * Auto-derive related norms from deontic square
 */
function autoDerive(norm) {
  const { action, operator } = norm;

  // O(p) → P(p): Obligatory implies permitted
  if (operator === 'O') {
    const permittedId = `p_${action.toLowerCase().replace(/\s+/g, '_')}`;
    if (!state.norms[permittedId]) {
      state.derivations.push({
        from: norm.id,
        to: permittedId,
        rule: 'O(p) → P(p)',
        derivedAt: Date.now(),
      });
    }
  }

  // F(p) → O(¬p): Forbidden implies obligatory to not do
  if (operator === 'F') {
    state.derivations.push({
      from: norm.id,
      rule: 'F(p) ↔ O(¬p)',
      note: `Not doing "${action}" is obligatory`,
      derivedAt: Date.now(),
    });
  }

  state.stats.derivationsMade += 1;
}

/**
 * Assign obligation to an agent
 *
 * @param {string} agentId - Agent identifier
 * @param {string} normId - Norm to assign
 * @returns {object} Assignment result
 */
function assignToAgent(agentId, normId) {
  const norm = state.norms[normId];
  if (!norm) return { error: 'Norm not found' };

  if (!state.agents[agentId]) {
    state.agents[agentId] = {
      id: agentId,
      obligations: [],
      permissions: [],
      prohibitions: [],
      createdAt: Date.now(),
    };
  }

  const agent = state.agents[agentId];

  // Add to appropriate list based on operator
  switch (norm.operator) {
    case 'O':
      if (!agent.obligations.includes(normId)) {
        agent.obligations.push(normId);
      }
      break;
    case 'P':
      if (!agent.permissions.includes(normId)) {
        agent.permissions.push(normId);
      }
      break;
    case 'F':
      if (!agent.prohibitions.includes(normId)) {
        agent.prohibitions.push(normId);
      }
      break;
  }

  state.stats.obligationsAssigned++;

  // Check for conflicts with existing assignments
  const conflicts = checkAgentConflicts(agentId);

  saveState();

  return {
    agent: agentId,
    norm: normId,
    conflicts: conflicts.length > 0 ? conflicts : null,
    message: `${norm.operatorInfo.fullSymbol} ${agent.id} now has ${norm.operatorInfo.name.toLowerCase()} "${norm.action}"`,
  };
}

/**
 * Check for conflicts in agent's normative status
 */
function checkAgentConflicts(agentId) {
  const agent = state.agents[agentId];
  if (!agent) return [];

  const conflicts = [];

  // Check O vs F conflicts
  for (const oblId of agent.obligations) {
    const obl = state.norms[oblId];
    if (!obl) continue;

    for (const forbId of agent.prohibitions) {
      const forb = state.norms[forbId];
      if (!forb) continue;

      // Same action - direct conflict
      if (obl.action.toLowerCase() === forb.action.toLowerCase()) {
        const conflict = {
          id: `conf-${Date.now()}`,
          type: 'direct',
          typeInfo: CONFLICT_TYPES.direct,
          normA: oblId,
          normB: forbId,
          agent: agentId,
          detectedAt: Date.now(),
        };
        conflicts.push(conflict);
        state.conflicts.push(conflict);
        state.stats.conflictsDetected++;
      }
    }
  }

  return conflicts;
}

/**
 * Evaluate deontic status of an action for an agent
 *
 * @param {string} agentId - Agent identifier
 * @param {string} action - Action to evaluate
 * @returns {object} Deontic status
 */
function evaluateStatus(agentId, action) {
  const agent = state.agents[agentId];
  if (!agent) {
    // No agent record - check general norms
    return evaluateGeneralStatus(action);
  }

  const actionLower = action.toLowerCase().replace(/\s+/g, '_');

  // Check agent's specific norms
  const obligated = agent.obligations.some(id => {
    const n = state.norms[id];
    return n && n.action.toLowerCase().replace(/\s+/g, '_') === actionLower;
  });

  const forbidden = agent.prohibitions.some(id => {
    const n = state.norms[id];
    return n && n.action.toLowerCase().replace(/\s+/g, '_') === actionLower;
  });

  const permitted = agent.permissions.some(id => {
    const n = state.norms[id];
    return n && n.action.toLowerCase().replace(/\s+/g, '_') === actionLower;
  });

  // Determine status
  let status;
  if (obligated && forbidden) {
    status = 'conflict';
  } else if (obligated) {
    status = 'obligatory';
  } else if (forbidden) {
    status = 'forbidden';
  } else if (permitted) {
    status = 'permitted';
  } else {
    status = 'indifferent';
  }

  const op = status === 'obligatory' ? DEONTIC_OPERATORS.O
    : status === 'forbidden' ? DEONTIC_OPERATORS.F
      : status === 'permitted' ? DEONTIC_OPERATORS.P
        : DEONTIC_OPERATORS.I;

  return {
    agent: agentId,
    action,
    status,
    operator: op.symbol,
    operatorInfo: op,
    isConflicted: status === 'conflict',
    message: `${op.fullSymbol} "${action}" is ${status} for ${agentId}`,
  };
}

/**
 * Evaluate general deontic status (no specific agent)
 */
function evaluateGeneralStatus(action) {
  const actionLower = action.toLowerCase().replace(/\s+/g, '_');

  // Find applicable norms
  const applicable = Object.values(state.norms).filter(n =>
    n.action.toLowerCase().replace(/\s+/g, '_') === actionLower &&
    (n.agent === '*' || !n.agent)
  );

  if (applicable.length === 0) {
    return {
      action,
      status: 'indifferent',
      operator: 'I',
      operatorInfo: DEONTIC_OPERATORS.I,
      message: `${DEONTIC_OPERATORS.I.fullSymbol} "${action}" has no applicable norms`,
    };
  }

  // Highest strength norm wins
  applicable.sort((a, b) => b.strength - a.strength);
  const primary = applicable[0];

  return {
    action,
    status: primary.operator === 'O' ? 'obligatory'
      : primary.operator === 'F' ? 'forbidden'
        : primary.operator === 'P' ? 'permitted' : 'indifferent',
    operator: primary.operator,
    operatorInfo: primary.operatorInfo,
    normCount: applicable.length,
    message: `${primary.operatorInfo.fullSymbol} "${action}" is ${primary.operatorInfo.name.toLowerCase()}`,
  };
}

/**
 * Register a contrary-to-duty norm
 *
 * @param {string} primaryAction - The primary duty
 * @param {string} secondaryAction - What to do if primary is violated
 * @param {string} secondaryOperator - Operator for secondary (usually O)
 * @returns {object} CTD norm pair
 */
function registerCTD(primaryAction, secondaryAction, secondaryOperator = 'O') {
  // Register primary obligation
  const primary = registerNorm(primaryAction, 'O', {
    type: 'prescriptive',
    source: 'ctd_primary',
  });

  if (primary.error) return primary;

  // Register secondary (contrary-to-duty)
  const secondary = registerNorm(secondaryAction, secondaryOperator, {
    type: 'prescriptive',
    source: 'ctd_secondary',
    condition: `violated(${primaryAction})`,
  });

  if (secondary.error) return secondary;

  // Link them
  const ctd = {
    primary: primary.norm.id,
    secondary: secondary.norm.id,
    pattern: `O(${primaryAction}), but if ¬${primaryAction}, then ${secondaryOperator}(${secondaryAction})`,
  };

  logHistory({
    type: 'ctd_registered',
    primary: primaryAction,
    secondary: secondaryAction,
  });

  return {
    ctd,
    primaryNorm: primary.norm,
    secondaryNorm: secondary.norm,
    message: `⟳ CTD: O(${primaryAction}), violation → ${secondaryOperator}(${secondaryAction})`,
  };
}

/**
 * Resolve a conflict using priority or strength
 *
 * @param {string} conflictId - Conflict to resolve
 * @returns {object} Resolution
 */
function resolveConflict(conflictId) {
  const conflict = state.conflicts.find(c => c.id === conflictId);
  if (!conflict) return { error: 'Conflict not found' };

  const normA = state.norms[conflict.normA];
  const normB = state.norms[conflict.normB];

  if (!normA || !normB) return { error: 'Norm not found' };

  // Resolution by priority first, then strength
  let winner;
  let method;

  if (normA.priority !== normB.priority) {
    winner = normA.priority > normB.priority ? normA : normB;
    method = 'priority';
  } else if (normA.strength !== normB.strength) {
    winner = normA.strength > normB.strength ? normA : normB;
    method = 'strength';
  } else {
    // True dilemma - cannot resolve
    return {
      resolved: false,
      conflict,
      type: 'dilemma',
      message: `⚔ Dilemma: ${normA.action} vs ${normB.action} - no clear resolution`,
    };
  }

  // Mark conflict as resolved
  conflict.resolved = true;
  conflict.winner = winner.id;
  conflict.method = method;
  conflict.resolvedAt = Date.now();

  saveState();

  return {
    resolved: true,
    conflict,
    winner: winner.id,
    method,
    message: `Conflict resolved by ${method}: ${winner.operatorInfo.fullSymbol} ${winner.action} prevails`,
  };
}

/**
 * Check if "ought implies can"
 *
 * @param {string} action - Action that is obligatory
 * @param {boolean} canDo - Whether agent can do it
 * @returns {object} Analysis
 */
function checkOughtImpliesCan(action, canDo) {
  const status = evaluateGeneralStatus(action);

  if (status.operator !== 'O') {
    return {
      applicable: false,
      message: `"${action}" is not obligatory - ought implies can not applicable`,
    };
  }

  if (canDo) {
    return {
      valid: true,
      message: `✓ "${action}" is obligatory and agent can do it - consistent`,
    };
  }

  return {
    valid: false,
    problem: 'ought_without_can',
    message: `⚠ "${action}" is obligatory but agent cannot do it - violates "ought implies can"`,
    implication: 'Either the obligation is invalid, or ability must be provided',
  };
}

/**
 * Get all norms for an agent
 */
function getAgentNorms(agentId) {
  const agent = state.agents[agentId];
  if (!agent) return { error: 'Agent not found' };

  return {
    agent: agentId,
    obligations: agent.obligations.map(id => state.norms[id]).filter(Boolean),
    permissions: agent.permissions.map(id => state.norms[id]).filter(Boolean),
    prohibitions: agent.prohibitions.map(id => state.norms[id]).filter(Boolean),
  };
}

/**
 * Get norm by ID
 */
function getNorm(normId) {
  return state.norms[normId] || null;
}

/**
 * Get all norms
 */
function getNorms() {
  return Object.values(state.norms);
}

/**
 * Get conflicts
 */
function getConflicts() {
  return state.conflicts;
}

/**
 * Format status for display
 */
function formatStatus() {
  const obligations = Object.values(state.norms).filter(n => n.operator === 'O').length;
  const permissions = Object.values(state.norms).filter(n => n.operator === 'P').length;
  const prohibitions = Object.values(state.norms).filter(n => n.operator === 'F').length;
  const unresolvedConflicts = state.conflicts.filter(c => !c.resolved).length;

  return `⊙ Deontic Logic (Von Wright)
  Norms: ${Object.keys(state.norms).length} (O:${obligations} P:${permissions} F:${prohibitions})
  Agents: ${Object.keys(state.agents).length}
  Conflicts: ${state.stats.conflictsDetected} (${unresolvedConflicts} unresolved)
  Derivations: ${state.stats.derivationsMade}`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    normCount: Object.keys(state.norms).length,
    agentCount: Object.keys(state.agents).length,
    unresolvedConflicts: state.conflicts.filter(c => !c.resolved).length,
  };
}

module.exports = {
  init,
  registerNorm,
  assignToAgent,
  evaluateStatus,
  registerCTD,
  resolveConflict,
  checkOughtImpliesCan,
  getAgentNorms,
  getNorm,
  getNorms,
  getConflicts,
  formatStatus,
  getStats,
  DEONTIC_OPERATORS,
  DEONTIC_RELATIONS,
  NORM_TYPES,
  CONFLICT_TYPES,
};
