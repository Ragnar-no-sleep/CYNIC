/**
 * Mental States - CYNIC Philosophy Integration
 *
 * Implements propositional attitudes, intentionality, and mental state
 * tracking following Brentano, Searle, and Fodor.
 *
 * "Every mental phenomenon includes something as object within itself"
 *   - Brentano (intentionality thesis)
 *
 * @module mental-states
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
  'mental-states'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_STATES = 200;
const MAX_AGENTS = 20;

/**
 * Propositional Attitude Types (Searle's taxonomy)
 * Mental states with propositional content
 */
const ATTITUDE_TYPES = {
  belief: {
    name: 'Belief',
    description: 'Represents the world as being a certain way',
    symbol: 'B',
    fullSymbol: '⊢',
    direction: 'mind-to-world', // World should match belief
    strength: PHI_INV,
  },
  desire: {
    name: 'Desire',
    description: 'Represents how one wants the world to be',
    symbol: 'D',
    fullSymbol: '⊨',
    direction: 'world-to-mind', // World should change to match
    strength: PHI_INV,
  },
  intention: {
    name: 'Intention',
    description: 'Commitment to action',
    symbol: 'I',
    fullSymbol: '⊸',
    direction: 'world-to-mind', // Will act to make world match
    strength: PHI_INV + PHI_INV_3,
  },
  perception: {
    name: 'Perception',
    description: 'Sensory representation of the world',
    symbol: 'P',
    fullSymbol: '◉',
    direction: 'mind-to-world',
    strength: PHI_INV_2,
  },
  memory: {
    name: 'Memory',
    description: 'Representation of past states',
    symbol: 'M',
    fullSymbol: '◈',
    direction: 'mind-to-world',
    strength: PHI_INV_2,
  },
  imagination: {
    name: 'Imagination',
    description: 'Representation without truth commitment',
    symbol: 'Im',
    fullSymbol: '◇',
    direction: 'null', // No direction of fit
    strength: PHI_INV_3,
  },
  fear: {
    name: 'Fear',
    description: 'Aversive attitude toward possibility',
    symbol: 'F',
    fullSymbol: '⚠',
    direction: 'world-to-mind',
    strength: PHI_INV,
  },
  hope: {
    name: 'Hope',
    description: 'Positive attitude toward possibility',
    symbol: 'H',
    fullSymbol: '✧',
    direction: 'world-to-mind',
    strength: PHI_INV_2,
  },
};

/**
 * Intentionality Features (Brentano/Searle)
 */
const INTENTIONALITY_FEATURES = {
  aboutness: {
    name: 'Aboutness',
    description: 'Mental state is about something',
    required: true,
  },
  aspectual_shape: {
    name: 'Aspectual Shape',
    description: 'Object is represented under an aspect',
    required: true,
    // E.g., "morning star" vs "evening star" - same object, different aspects
  },
  conditions_of_satisfaction: {
    name: 'Conditions of Satisfaction',
    description: 'What would make the state "satisfied"',
    required: true,
  },
  network: {
    name: 'Network',
    description: 'Connected to other intentional states',
    required: false,
  },
  background: {
    name: 'Background',
    description: 'Pre-intentional capacities enabling content',
    required: false,
  },
};

/**
 * Mental State Relations
 */
const STATE_RELATIONS = {
  causes: {
    name: 'Causes',
    description: 'One state causally produces another',
    symbol: '→',
  },
  supports: {
    name: 'Supports',
    description: 'One state provides evidence for another',
    symbol: '⊃',
  },
  conflicts: {
    name: 'Conflicts',
    description: 'States are in tension',
    symbol: '⊥',
  },
  realizes: {
    name: 'Realizes',
    description: 'Action realizes intention',
    symbol: '⊨',
  },
  revises: {
    name: 'Revises',
    description: 'New state updates old',
    symbol: '↺',
  },
};

/**
 * Satisfaction Status
 */
const SATISFACTION_STATUS = {
  satisfied: {
    name: 'Satisfied',
    description: 'Conditions of satisfaction met',
    symbol: '✓',
  },
  unsatisfied: {
    name: 'Unsatisfied',
    description: 'Conditions not yet met',
    symbol: '○',
  },
  frustrated: {
    name: 'Frustrated',
    description: 'Cannot be satisfied',
    symbol: '✗',
  },
  indeterminate: {
    name: 'Indeterminate',
    description: 'Satisfaction status unclear',
    symbol: '?',
  },
};

// State
let state = {
  agents: {},           // Agents with mental states
  globalStates: [],     // Shared/collective states
  relations: [],        // Relations between states
  stats: {
    statesCreated: 0,
    beliefsFormed: 0,
    desiresFormed: 0,
    intentionsFormed: 0,
    conflictsDetected: 0,
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
    console.error('Mental states init error:', err.message);
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
    console.error('Mental states save error:', err.message);
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
 * Ensure agent exists
 */
function ensureAgent(agentId) {
  if (!state.agents[agentId]) {
    if (Object.keys(state.agents).length >= MAX_AGENTS) {
      return null;
    }
    state.agents[agentId] = {
      id: agentId,
      states: [],
      createdAt: Date.now(),
    };
  }
  return state.agents[agentId];
}

/**
 * Create a mental state (propositional attitude)
 *
 * @param {string} agentId - The agent having the state
 * @param {string} type - Attitude type (belief, desire, etc.)
 * @param {string} content - Propositional content
 * @param {object} config - Configuration
 * @returns {object} Created mental state
 */
function createState(agentId, type, content, config = {}) {
  const agent = ensureAgent(agentId);
  if (!agent) return { error: 'Maximum agents reached' };

  if (agent.states.length >= MAX_STATES) {
    // Prune oldest non-intention states
    agent.states = agent.states
      .filter(s => s.type === 'intention' || Date.now() - s.createdAt < 3600000)
      .slice(-Math.floor(MAX_STATES * PHI_INV));
  }

  const attitudeType = ATTITUDE_TYPES[type] || ATTITUDE_TYPES.belief;
  const id = `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const mentalState = {
    id,
    agentId,
    type,
    typeInfo: attitudeType,
    // Intentional content
    content,
    aspect: config.aspect || null, // How the object is represented
    object: config.object || null, // What it's about (referent)
    // Conditions of satisfaction
    satisfactionConditions: config.conditions || null,
    satisfactionStatus: 'unsatisfied',
    // Strength and confidence
    strength: config.strength || attitudeType.strength,
    confidence: Math.min(config.confidence || PHI_INV, PHI_INV), // φ⁻¹ max
    // Relations
    causedBy: config.causedBy || null,
    supports: [],
    conflictsWith: [],
    // Metadata
    createdAt: Date.now(),
    revisedAt: null,
  };

  agent.states.push(mentalState);
  state.stats.statesCreated++;

  // Update specific counters
  if (type === 'belief') state.stats.beliefsFormed++;
  else if (type === 'desire') state.stats.desiresFormed++;
  else if (type === 'intention') state.stats.intentionsFormed++;

  // Check for conflicts with existing states
  const conflicts = checkConflicts(agentId, mentalState);

  logHistory({
    type: 'state_created',
    id,
    agentId,
    stateType: type,
    content: content.slice(0, 50),
  });

  saveState();

  return {
    state: mentalState,
    conflicts: conflicts.length > 0 ? conflicts : null,
    message: `${attitudeType.fullSymbol} ${attitudeType.name}(${agentId}): "${content.slice(0, 40)}..."`,
  };
}

/**
 * Create a belief
 */
function believe(agentId, proposition, config = {}) {
  return createState(agentId, 'belief', proposition, config);
}

/**
 * Create a desire
 */
function desire(agentId, proposition, config = {}) {
  return createState(agentId, 'desire', proposition, config);
}

/**
 * Create an intention
 */
function intend(agentId, action, config = {}) {
  return createState(agentId, 'intention', action, {
    ...config,
    // Intentions are self-referential - the intention is part of its own satisfaction conditions
    conditions: config.conditions || `Agent performs: ${action}`,
  });
}

/**
 * Check for conflicts between mental states
 */
function checkConflicts(agentId, newState) {
  const agent = state.agents[agentId];
  if (!agent) return [];

  const conflicts = [];

  for (const existing of agent.states) {
    if (existing.id === newState.id) continue;

    // Same type, contradictory content
    if (existing.type === newState.type) {
      // Simple negation check
      const isNegation =
        newState.content.startsWith('not ') && newState.content.slice(4) === existing.content ||
        existing.content.startsWith('not ') && existing.content.slice(4) === newState.content;

      if (isNegation) {
        conflicts.push({
          type: 'contradiction',
          stateA: newState.id,
          stateB: existing.id,
          description: `Contradictory ${newState.type}s`,
        });
        state.stats.conflictsDetected++;
      }
    }

    // Belief-desire conflict (can be rational to desire what you don't believe possible)
    // But intention-belief conflict is irrational
    if (newState.type === 'intention' && existing.type === 'belief') {
      // Check if belief says intention is impossible
      if (existing.content.includes('impossible') &&
          existing.content.includes(newState.content.split(' ')[0])) {
        conflicts.push({
          type: 'practical_irrationality',
          stateA: newState.id,
          stateB: existing.id,
          description: 'Intending what is believed impossible',
        });
        state.stats.conflictsDetected++;
      }
    }
  }

  // Record conflicts
  for (const conflict of conflicts) {
    const stateA = agent.states.find(s => s.id === conflict.stateA);
    const stateB = agent.states.find(s => s.id === conflict.stateB);
    if (stateA && stateB) {
      if (!stateA.conflictsWith.includes(conflict.stateB)) {
        stateA.conflictsWith.push(conflict.stateB);
      }
      if (!stateB.conflictsWith.includes(conflict.stateA)) {
        stateB.conflictsWith.push(conflict.stateA);
      }
    }
  }

  return conflicts;
}

/**
 * Add a relation between states
 *
 * @param {string} fromId - Source state ID
 * @param {string} toId - Target state ID
 * @param {string} relationType - Type of relation
 * @returns {object} Relation result
 */
function addRelation(fromId, toId, relationType) {
  const relType = STATE_RELATIONS[relationType];
  if (!relType) return { error: 'Unknown relation type' };

  // Find states
  let fromState = null;
  let toState = null;

  for (const agent of Object.values(state.agents)) {
    if (!fromState) fromState = agent.states.find(s => s.id === fromId);
    if (!toState) toState = agent.states.find(s => s.id === toId);
  }

  if (!fromState || !toState) {
    return { error: 'State not found' };
  }

  const relation = {
    from: fromId,
    to: toId,
    type: relationType,
    typeInfo: relType,
    createdAt: Date.now(),
  };

  state.relations.push(relation);

  // Update state records
  if (relationType === 'supports') {
    if (!fromState.supports.includes(toId)) {
      fromState.supports.push(toId);
    }
  } else if (relationType === 'conflicts') {
    if (!fromState.conflictsWith.includes(toId)) {
      fromState.conflictsWith.push(toId);
    }
    if (!toState.conflictsWith.includes(fromId)) {
      toState.conflictsWith.push(fromId);
    }
  }

  saveState();

  return {
    relation,
    message: `${fromState.type} ${relType.symbol} ${toState.type}`,
  };
}

/**
 * Update satisfaction status of a state
 *
 * @param {string} stateId - State to update
 * @param {string} status - New satisfaction status
 * @param {string} reason - Reason for update
 * @returns {object} Update result
 */
function updateSatisfaction(stateId, status, reason = '') {
  const statusInfo = SATISFACTION_STATUS[status];
  if (!statusInfo) return { error: 'Unknown satisfaction status' };

  // Find state
  let targetState = null;
  for (const agent of Object.values(state.agents)) {
    targetState = agent.states.find(s => s.id === stateId);
    if (targetState) break;
  }

  if (!targetState) return { error: 'State not found' };

  const previousStatus = targetState.satisfactionStatus;
  targetState.satisfactionStatus = status;
  targetState.revisedAt = Date.now();

  logHistory({
    type: 'satisfaction_updated',
    stateId,
    from: previousStatus,
    to: status,
    reason,
  });

  saveState();

  return {
    stateId,
    previousStatus,
    newStatus: status,
    statusInfo,
    message: `${statusInfo.symbol} ${targetState.type} now ${status}`,
  };
}

/**
 * Revise a belief based on new evidence
 *
 * @param {string} agentId - Agent whose belief to revise
 * @param {string} oldContent - Content of belief to revise
 * @param {string} newContent - New belief content
 * @param {string} reason - Reason for revision
 * @returns {object} Revision result
 */
function reviseBelief(agentId, oldContent, newContent, reason = '') {
  const agent = state.agents[agentId];
  if (!agent) return { error: 'Agent not found' };

  // Find old belief
  const oldBelief = agent.states.find(s =>
    s.type === 'belief' && s.content === oldContent
  );

  if (!oldBelief) {
    return { error: 'Belief not found' };
  }

  // Mark old as revised
  oldBelief.satisfactionStatus = 'frustrated';
  oldBelief.revisedAt = Date.now();

  // Create new belief
  const newBelief = createState(agentId, 'belief', newContent, {
    causedBy: `revision of ${oldBelief.id}`,
    confidence: Math.min(oldBelief.confidence + PHI_INV_3, PHI_INV),
  });

  // Add revision relation
  addRelation(newBelief.state.id, oldBelief.id, 'revises');

  logHistory({
    type: 'belief_revised',
    agentId,
    oldContent: oldContent.slice(0, 30),
    newContent: newContent.slice(0, 30),
    reason,
  });

  saveState();

  return {
    oldBelief,
    newBelief: newBelief.state,
    reason,
    message: `↺ Belief revised: "${oldContent.slice(0, 20)}..." → "${newContent.slice(0, 20)}..."`,
  };
}

/**
 * Get all states for an agent
 *
 * @param {string} agentId - Agent ID
 * @param {string} type - Optional filter by type
 * @returns {array} Agent's mental states
 */
function getAgentStates(agentId, type = null) {
  const agent = state.agents[agentId];
  if (!agent) return [];

  if (type) {
    return agent.states.filter(s => s.type === type);
  }
  return agent.states;
}

/**
 * Get beliefs for an agent
 */
function getBeliefs(agentId) {
  return getAgentStates(agentId, 'belief');
}

/**
 * Get desires for an agent
 */
function getDesires(agentId) {
  return getAgentStates(agentId, 'desire');
}

/**
 * Get intentions for an agent
 */
function getIntentions(agentId) {
  return getAgentStates(agentId, 'intention');
}

/**
 * Check if agent believes proposition
 *
 * @param {string} agentId - Agent ID
 * @param {string} proposition - Proposition to check
 * @returns {object} Belief check result
 */
function doesBelieve(agentId, proposition) {
  const beliefs = getBeliefs(agentId);
  const belief = beliefs.find(b =>
    b.content === proposition ||
    b.content.toLowerCase() === proposition.toLowerCase()
  );

  return {
    believes: !!belief,
    belief,
    confidence: belief ? belief.confidence : 0,
    message: belief
      ? `${ATTITUDE_TYPES.belief.fullSymbol} ${agentId} believes: "${proposition}"`
      : `${agentId} does not believe: "${proposition}"`,
  };
}

/**
 * Get state by ID
 */
function getState(stateId) {
  for (const agent of Object.values(state.agents)) {
    const found = agent.states.find(s => s.id === stateId);
    if (found) return found;
  }
  return null;
}

/**
 * Format status for display
 */
function formatStatus() {
  let totalStates = 0;
  for (const agent of Object.values(state.agents)) {
    totalStates += agent.states.length;
  }

  return `⊢ Mental States (Brentano/Searle)
  Agents: ${Object.keys(state.agents).length}
  Total states: ${totalStates}
  Beliefs: ${state.stats.beliefsFormed}
  Desires: ${state.stats.desiresFormed}
  Intentions: ${state.stats.intentionsFormed}
  Conflicts: ${state.stats.conflictsDetected}`;
}

/**
 * Get stats
 */
function getStats() {
  let totalStates = 0;
  for (const agent of Object.values(state.agents)) {
    totalStates += agent.states.length;
  }

  return {
    ...state.stats,
    agentCount: Object.keys(state.agents).length,
    totalStates,
    relationCount: state.relations.length,
  };
}

module.exports = {
  init,
  createState,
  believe,
  desire,
  intend,
  addRelation,
  updateSatisfaction,
  reviseBelief,
  getAgentStates,
  getBeliefs,
  getDesires,
  getIntentions,
  doesBelieve,
  getState,
  formatStatus,
  getStats,
  ATTITUDE_TYPES,
  INTENTIONALITY_FEATURES,
  STATE_RELATIONS,
  SATISFACTION_STATUS,
};
