/**
 * Agency Engine - CYNIC Philosophy Integration
 *
 * Implements intentions, plans, and hierarchical desire theory
 * following Bratman, Frankfurt, and action theory.
 *
 * "Freedom of the will is the ability to will what you want to will"
 *   - Frankfurt
 *
 * @module agency-engine
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
  'agency'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_INTENTIONS = 50;
const MAX_PLANS = 30;
const MAX_ACTIONS = 200;

/**
 * Intention Types (Bratman's planning theory)
 */
const INTENTION_TYPES = {
  future_directed: {
    name: 'Future-Directed Intention',
    description: 'Intention to do something at a future time',
    symbol: '→',
    timeFrame: 'future',
    weight: PHI_INV,
  },
  present_directed: {
    name: 'Present-Directed Intention',
    description: 'Intention-in-action, guiding current behavior',
    symbol: '⊸',
    timeFrame: 'present',
    weight: PHI_INV + PHI_INV_3,
  },
  conditional: {
    name: 'Conditional Intention',
    description: 'Intention contingent on conditions',
    symbol: '⊃',
    timeFrame: 'conditional',
    weight: PHI_INV_2,
  },
};

/**
 * Desire Orders (Frankfurt's hierarchical model)
 *
 * First-order: desires for things
 * Second-order: desires about first-order desires
 * Second-order volitions: wanting first-order desires to be effective
 */
const DESIRE_ORDERS = {
  first: {
    order: 1,
    name: 'First-Order Desire',
    description: 'Direct desire for some state of affairs',
    symbol: 'D¹',
    example: 'I want chocolate',
  },
  second: {
    order: 2,
    name: 'Second-Order Desire',
    description: 'Desire about a first-order desire',
    symbol: 'D²',
    example: 'I want to want to exercise',
  },
  second_volition: {
    order: 2.5,
    name: 'Second-Order Volition',
    description: 'Wanting a first-order desire to be one\'s will',
    symbol: 'V²',
    example: 'I want my desire to exercise to move me to action',
  },
  third: {
    order: 3,
    name: 'Third-Order Desire',
    description: 'Desire about second-order desires',
    symbol: 'D³',
    example: 'I want to want to want to be healthy',
  },
};

/**
 * Action Types
 */
const ACTION_TYPES = {
  basic: {
    name: 'Basic Action',
    description: 'Action not done by doing something else',
    symbol: '•',
    examples: ['raising arm', 'moving finger'],
  },
  non_basic: {
    name: 'Non-Basic Action',
    description: 'Action done by doing something else',
    symbol: '◦',
    examples: ['voting', 'signaling', 'greeting'],
  },
  mental: {
    name: 'Mental Action',
    description: 'Action in thought',
    symbol: '○',
    examples: ['calculating', 'imagining', 'deciding'],
  },
  omission: {
    name: 'Omission',
    description: 'Intentional not-doing',
    symbol: '∅',
    examples: ['refraining', 'abstaining', 'allowing'],
  },
};

/**
 * Agency Conditions (for attributing agency)
 */
const AGENCY_CONDITIONS = {
  causal: {
    name: 'Causal History',
    description: 'Action caused by agent\'s mental states',
    required: true,
  },
  guidance: {
    name: 'Guidance Control',
    description: 'Agent guides action via reasons-responsiveness',
    required: true,
  },
  ownership: {
    name: 'Ownership',
    description: 'Agent identifies with the motivating desire',
    required: false, // Debated
  },
  mesh: {
    name: 'Hierarchical Mesh',
    description: 'First and higher-order desires align',
    required: false,
  },
};

/**
 * Plan Structure (Bratman)
 */
const PLAN_ELEMENTS = {
  goal: {
    name: 'Goal',
    description: 'What the plan aims to achieve',
    required: true,
  },
  subplans: {
    name: 'Sub-Plans',
    description: 'Component plans serving the goal',
    required: false,
  },
  means: {
    name: 'Means',
    description: 'How to achieve steps',
    required: true,
  },
  filter: {
    name: 'Filter on Options',
    description: 'Constraints from other intentions',
    required: false,
  },
};

// State
let state = {
  agents: {},           // Agents with agency
  intentions: {},       // Active intentions
  plans: {},            // Active plans
  actions: [],          // Action history
  desires: {},          // Hierarchical desires by agent
  stats: {
    intentionsFormed: 0,
    plansCreated: 0,
    actionsPerformed: 0,
    volitionalConflicts: 0,
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
    console.error('Agency engine init error:', err.message);
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
    console.error('Agency engine save error:', err.message);
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
    state.agents[agentId] = {
      id: agentId,
      intentions: [],
      plans: [],
      actionCount: 0,
      createdAt: Date.now(),
    };
    state.desires[agentId] = {
      first: [],
      second: [],
      volitions: [],
    };
  }
  return state.agents[agentId];
}

/**
 * Form an intention
 *
 * @param {string} agentId - The agent forming the intention
 * @param {string} content - What is intended
 * @param {string} type - Intention type
 * @param {object} config - Configuration
 * @returns {object} Formed intention
 */
function formIntention(agentId, content, type = 'future_directed', config = {}) {
  const agent = ensureAgent(agentId);

  if (Object.keys(state.intentions).length >= MAX_INTENTIONS) {
    // Prune completed intentions
    for (const [id, int] of Object.entries(state.intentions)) {
      if (int.status === 'executed' || int.status === 'abandoned') {
        delete state.intentions[id];
      }
    }
  }

  const intType = INTENTION_TYPES[type] || INTENTION_TYPES.future_directed;
  const id = `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const intention = {
    id,
    agentId,
    content,
    type,
    typeInfo: intType,
    // Commitment properties (Bratman)
    isCommitment: true,      // Intentions are commitments
    resistsReconsideration: true,  // Don't easily reopen
    constrainsDeliberation: true,  // Filters future options
    // Status
    status: 'active',
    // Conditions
    conditions: config.conditions || null,
    deadline: config.deadline || null,
    // Means-end coherence
    meansPlanned: false,
    linkedPlan: null,
    // Metadata
    reason: config.reason || null,
    formedAt: Date.now(),
    executedAt: null,
  };

  state.intentions[id] = intention;
  agent.intentions.push(id);
  state.stats.intentionsFormed++;

  logHistory({
    type: 'intention_formed',
    id,
    agentId,
    content: content.slice(0, 50),
    intentionType: type,
  });

  saveState();

  return {
    intention,
    message: `${intType.symbol} Intention formed: "${content.slice(0, 40)}..."`,
  };
}

/**
 * Create a plan to achieve an intention
 *
 * @param {string} agentId - The planning agent
 * @param {string} intentionId - Intention this plan serves
 * @param {array} steps - Plan steps
 * @param {object} config - Configuration
 * @returns {object} Created plan
 */
function createPlan(agentId, intentionId, steps, config = {}) {
  const agent = ensureAgent(agentId);
  const intention = state.intentions[intentionId];

  if (!intention) return { error: 'Intention not found' };

  if (Object.keys(state.plans).length >= MAX_PLANS) {
    // Prune completed plans
    for (const [id, plan] of Object.entries(state.plans)) {
      if (plan.status === 'completed' || plan.status === 'abandoned') {
        delete state.plans[id];
      }
    }
  }

  const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const plan = {
    id,
    agentId,
    intentionId,
    goal: intention.content,
    steps: steps.map((step, index) => ({
      index,
      content: step,
      status: 'pending',
      executedAt: null,
    })),
    // Bratman's plan properties
    isPartial: config.isPartial !== false, // Plans are typically partial
    allowsSubplans: true,
    // Status
    status: 'active',
    currentStep: 0,
    // Constraints from other intentions
    constraints: config.constraints || [],
    createdAt: Date.now(),
    completedAt: null,
  };

  state.plans[id] = plan;
  agent.plans.push(id);

  // Link plan to intention
  intention.meansPlanned = true;
  intention.linkedPlan = id;

  state.stats.plansCreated++;

  logHistory({
    type: 'plan_created',
    id,
    agentId,
    intentionId,
    stepCount: steps.length,
  });

  saveState();

  return {
    plan,
    message: `Plan created: ${steps.length} steps to achieve "${intention.content.slice(0, 30)}..."`,
  };
}

/**
 * Perform an action
 *
 * @param {string} agentId - The acting agent
 * @param {string} content - Action description
 * @param {string} type - Action type
 * @param {object} config - Configuration
 * @returns {object} Performed action
 */
function performAction(agentId, content, type = 'basic', config = {}) {
  const agent = ensureAgent(agentId);

  if (state.actions.length >= MAX_ACTIONS) {
    state.actions = state.actions.slice(-Math.floor(MAX_ACTIONS * PHI_INV));
  }

  const actionType = ACTION_TYPES[type] || ACTION_TYPES.basic;
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const action = {
    id,
    agentId,
    content,
    type,
    typeInfo: actionType,
    // Causal history
    intention: config.intentionId || null,
    plan: config.planId || null,
    // Agency conditions met
    agencyConditions: {
      causal: true, // Assumed if action is being attributed
      guidance: config.wasGuided !== false,
      ownership: config.owned !== false,
    },
    // Result
    successful: config.successful !== false,
    performedAt: Date.now(),
  };

  state.actions.push(action);
  agent.actionCount++;
  state.stats.actionsPerformed++;

  // Update plan progress if linked
  if (config.planId && state.plans[config.planId]) {
    updatePlanProgress(config.planId);
  }

  // Update intention if this executes it
  if (config.intentionId && state.intentions[config.intentionId]) {
    const intention = state.intentions[config.intentionId];
    if (config.completesIntention) {
      intention.status = 'executed';
      intention.executedAt = Date.now();
    }
  }

  logHistory({
    type: 'action_performed',
    id,
    agentId,
    actionType: type,
    content: content.slice(0, 50),
  });

  saveState();

  return {
    action,
    message: `${actionType.symbol} Action: "${content.slice(0, 40)}..."`,
  };
}

/**
 * Update plan progress
 */
function updatePlanProgress(planId) {
  const plan = state.plans[planId];
  if (!plan) return;

  // Mark current step as done and advance
  if (plan.currentStep < plan.steps.length) {
    plan.steps[plan.currentStep].status = 'completed';
    plan.steps[plan.currentStep].executedAt = Date.now();
    plan.currentStep++;
  }

  // Check if plan is complete
  if (plan.currentStep >= plan.steps.length) {
    plan.status = 'completed';
    plan.completedAt = Date.now();
  }

  saveState();
}

/**
 * Register a hierarchical desire (Frankfurt)
 *
 * @param {string} agentId - The agent with the desire
 * @param {string} content - Desire content
 * @param {number} order - Desire order (1, 2, or 3)
 * @param {object} config - Configuration
 * @returns {object} Registered desire
 */
function registerDesire(agentId, content, order = 1, config = {}) {
  ensureAgent(agentId);

  const orderInfo = order === 1 ? DESIRE_ORDERS.first
    : order === 2 ? (config.isVolition ? DESIRE_ORDERS.second_volition : DESIRE_ORDERS.second)
      : DESIRE_ORDERS.third;

  const id = `des-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const desire = {
    id,
    agentId,
    content,
    order,
    orderInfo,
    isVolition: config.isVolition || false,
    // For higher-order: what first-order desire it's about
    targetDesire: config.targetDesire || null,
    // Strength
    strength: config.strength || PHI_INV,
    // Is this desire effective (moving to action)?
    isEffective: config.isEffective || false,
    registeredAt: Date.now(),
  };

  // Store by order
  const key = config.isVolition ? 'volitions' : order === 1 ? 'first' : 'second';
  state.desires[agentId][key].push(desire);

  // Check for volitional conflict
  if (order >= 2 && config.targetDesire) {
    checkVolitionalHarmony(agentId, desire);
  }

  logHistory({
    type: 'desire_registered',
    id,
    agentId,
    order,
    content: content.slice(0, 50),
  });

  saveState();

  return {
    desire,
    message: `${orderInfo.symbol} ${orderInfo.name}: "${content.slice(0, 40)}..."`,
  };
}

/**
 * Check for volitional harmony or conflict (Frankfurt)
 */
function checkVolitionalHarmony(agentId, higherOrderDesire) {
  const desires = state.desires[agentId];
  if (!desires) return;

  // Find target first-order desire
  const targetId = higherOrderDesire.targetDesire;
  const target = desires.first.find(d => d.id === targetId);

  if (!target) return;

  // Check if volition and first-order align
  const aligned = higherOrderDesire.content.toLowerCase().includes('want to') &&
                 target.isEffective;

  if (!aligned && higherOrderDesire.isVolition) {
    // Volitional conflict - willing desires are unwilling
    state.stats.volitionalConflicts++;

    logHistory({
      type: 'volitional_conflict',
      agentId,
      higherOrder: higherOrderDesire.id,
      firstOrder: targetId,
    });
  }
}

/**
 * Check if agent is free in Frankfurt's sense
 * Free will = second-order volitions align with effective first-order desires
 *
 * @param {string} agentId - The agent to check
 * @returns {object} Freedom analysis
 */
function checkFreedom(agentId) {
  const desires = state.desires[agentId];
  if (!desires) return { error: 'Agent not found' };

  const volitions = desires.volitions || [];
  const firstOrder = desires.first || [];

  if (volitions.length === 0) {
    return {
      agentId,
      isFree: null,
      status: 'wanton',
      message: 'No second-order volitions - agent is a "wanton" (Frankfurt)',
      note: 'Wantons have desires but no preferences about which desires move them',
    };
  }

  // Check each volition
  const volitionStatuses = volitions.map(vol => {
    const target = firstOrder.find(d => d.id === vol.targetDesire);
    if (!target) return { volition: vol.id, satisfied: false, reason: 'target not found' };

    const satisfied = target.isEffective;
    return {
      volition: vol.id,
      target: target.id,
      satisfied,
      reason: satisfied ? 'first-order desire is effective' : 'first-order desire is not effective',
    };
  });

  const allSatisfied = volitionStatuses.every(v => v.satisfied);
  const someSatisfied = volitionStatuses.some(v => v.satisfied);

  return {
    agentId,
    isFree: allSatisfied,
    status: allSatisfied ? 'free' : someSatisfied ? 'partly_free' : 'unfree',
    volitionStatuses,
    message: allSatisfied
      ? '✓ Agent is free - volitions align with effective desires'
      : someSatisfied
        ? '~ Agent is partly free - some volitional conflict'
        : '✗ Agent is unfree - volitions frustrated',
  };
}

/**
 * Attribute agency to an action
 *
 * @param {string} actionId - Action to evaluate
 * @returns {object} Agency attribution
 */
function attributeAgency(actionId) {
  const action = state.actions.find(a => a.id === actionId);
  if (!action) return { error: 'Action not found' };

  const conditions = action.agencyConditions;

  // Check required conditions
  const requiredMet = Object.entries(AGENCY_CONDITIONS)
    .filter(([, cond]) => cond.required)
    .every(([key]) => conditions[key]);

  const allMet = Object.keys(conditions).every(k => conditions[k]);

  return {
    actionId,
    action: action.content,
    agentId: action.agentId,
    conditionsMet: conditions,
    isAgentive: requiredMet,
    isFullyAgentive: allMet,
    message: requiredMet
      ? `✓ Action is agentive: ${action.content.slice(0, 30)}...`
      : `? Action may not be fully agentive - missing conditions`,
  };
}

/**
 * Get agent's intentions
 */
function getIntentions(agentId, statusFilter = null) {
  const agent = state.agents[agentId];
  if (!agent) return [];

  return agent.intentions
    .map(id => state.intentions[id])
    .filter(i => i && (!statusFilter || i.status === statusFilter));
}

/**
 * Get agent's plans
 */
function getPlans(agentId, statusFilter = null) {
  const agent = state.agents[agentId];
  if (!agent) return [];

  return agent.plans
    .map(id => state.plans[id])
    .filter(p => p && (!statusFilter || p.status === statusFilter));
}

/**
 * Get agent's desires by order
 */
function getDesires(agentId, order = null) {
  const desires = state.desires[agentId];
  if (!desires) return [];

  if (order === 1) return desires.first;
  if (order === 2) return [...desires.second, ...desires.volitions];
  return [...desires.first, ...desires.second, ...desires.volitions];
}

/**
 * Abandon an intention
 */
function abandonIntention(intentionId, reason = '') {
  const intention = state.intentions[intentionId];
  if (!intention) return { error: 'Intention not found' };

  intention.status = 'abandoned';
  intention.abandonReason = reason;

  // Also abandon linked plan
  if (intention.linkedPlan && state.plans[intention.linkedPlan]) {
    state.plans[intention.linkedPlan].status = 'abandoned';
  }

  logHistory({
    type: 'intention_abandoned',
    id: intentionId,
    reason,
  });

  saveState();

  return {
    intention,
    message: `Intention abandoned: "${intention.content.slice(0, 30)}..."`,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const activeIntentions = Object.values(state.intentions).filter(i => i.status === 'active').length;
  const activePlans = Object.values(state.plans).filter(p => p.status === 'active').length;

  return `⊸ Agency Engine (Bratman/Frankfurt)
  Agents: ${Object.keys(state.agents).length}
  Intentions: ${state.stats.intentionsFormed} (${activeIntentions} active)
  Plans: ${state.stats.plansCreated} (${activePlans} active)
  Actions: ${state.stats.actionsPerformed}
  Volitional conflicts: ${state.stats.volitionalConflicts}`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    agentCount: Object.keys(state.agents).length,
    activeIntentions: Object.values(state.intentions).filter(i => i.status === 'active').length,
    activePlans: Object.values(state.plans).filter(p => p.status === 'active').length,
  };
}

module.exports = {
  init,
  formIntention,
  createPlan,
  performAction,
  registerDesire,
  checkFreedom,
  attributeAgency,
  getIntentions,
  getPlans,
  getDesires,
  abandonIntention,
  formatStatus,
  getStats,
  INTENTION_TYPES,
  DESIRE_ORDERS,
  ACTION_TYPES,
  AGENCY_CONDITIONS,
  PLAN_ELEMENTS,
};
