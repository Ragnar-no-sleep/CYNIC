/**
 * Mental State Engine - Functionalism
 *
 * "Mental states are constituted by their functional roles—
 *  their causal relations to inputs, outputs, and other mental states."
 *
 * Implements:
 * - Folk psychology (belief-desire reasoning)
 * - Functionalism (mental states as functional roles)
 * - Propositional attitudes
 * - Mental causation
 *
 * φ guides confidence in mental state attributions.
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2%
const PHI_INV_3 = 0.236067977499790;    // 23.6%

// Storage
const STORAGE_DIR = path.join(require('os').homedir(), '.cynic', 'mental-states');

// Propositional attitude types
const PROPOSITIONAL_ATTITUDES = {
  // Doxastic attitudes (belief-like)
  belief: {
    name: 'Belief',
    schema: 'S believes that p',
    direction: 'mind_to_world',
    rational_constraint: 'consistency',
    revisable: true
  },
  disbelief: {
    name: 'Disbelief',
    schema: 'S disbelieves that p',
    direction: 'mind_to_world',
    rational_constraint: 'consistency',
    revisable: true
  },
  suspicion: {
    name: 'Suspicion',
    schema: 'S suspects that p',
    direction: 'mind_to_world',
    strength: 'weak',
    revisable: true
  },
  certainty: {
    name: 'Certainty',
    schema: 'S is certain that p',
    direction: 'mind_to_world',
    strength: 'strong',
    revisable: false  // Subjectively
  },

  // Conative attitudes (desire-like)
  desire: {
    name: 'Desire',
    schema: 'S desires that p',
    direction: 'world_to_mind',
    motivational: true,
    rational_constraint: 'means-end'
  },
  want: {
    name: 'Want',
    schema: 'S wants that p',
    direction: 'world_to_mind',
    motivational: true
  },
  hope: {
    name: 'Hope',
    schema: 'S hopes that p',
    direction: 'world_to_mind',
    requires: 'uncertainty',
    motivational: false
  },
  fear: {
    name: 'Fear',
    schema: 'S fears that p',
    direction: 'world_to_mind',
    valence: 'negative',
    motivational: true
  },

  // Volitional attitudes
  intention: {
    name: 'Intention',
    schema: 'S intends to A',
    direction: 'world_to_mind',
    content: 'action',
    commitment: true
  },
  decision: {
    name: 'Decision',
    schema: 'S decides to A',
    direction: 'world_to_mind',
    content: 'action',
    commitment: true,
    terminus: 'deliberation'
  }
};

// Functionalist role specifications
const FUNCTIONAL_ROLES = {
  belief: {
    typicalCauses: ['perception', 'inference', 'testimony'],
    typicalEffects: ['other beliefs', 'desires', 'action'],
    interactionWith: {
      desire: 'Combines to produce action (practical syllogism)',
      perception: 'Updated by perceptual input',
      other_belief: 'Subject to inference rules'
    }
  },
  desire: {
    typicalCauses: ['biological needs', 'other desires', 'beliefs about value'],
    typicalEffects: ['motivation', 'action', 'emotional states'],
    interactionWith: {
      belief: 'Combines to select action',
      emotion: 'Can cause or be caused by'
    }
  },
  intention: {
    typicalCauses: ['belief + desire (deliberation)', 'decision'],
    typicalEffects: ['action', 'planning', 'further intentions'],
    interactionWith: {
      belief: 'Constrained by beliefs about possibility',
      desire: 'Derived from desires via deliberation'
    }
  },
  perception: {
    typicalCauses: ['environmental stimuli', 'sensory organs'],
    typicalEffects: ['beliefs', 'attention', 'action'],
    interactionWith: {
      belief: 'Produces and modifies beliefs',
      attention: 'Modulated by attention'
    }
  },
  emotion: {
    typicalCauses: ['beliefs', 'desires', 'perceptions'],
    typicalEffects: ['motivation', 'attention', 'physiological changes'],
    interactionWith: {
      belief: 'Can influence belief formation',
      desire: 'Can generate new desires'
    }
  }
};

// Folk psychology laws
const FOLK_LAWS = {
  practical_syllogism: {
    name: 'Practical Syllogism',
    schema: 'If S desires G and believes A leads to G, S will (ceteris paribus) do A',
    type: 'action_explanation'
  },
  belief_revision: {
    name: 'Belief Revision',
    schema: 'If S perceives that p, S will (ceteris paribus) believe that p',
    type: 'belief_formation'
  },
  desire_satisfaction: {
    name: 'Desire Satisfaction',
    schema: 'If S\'s desire for G is satisfied, the desire is (ceteris paribus) extinguished',
    type: 'desire_dynamics'
  },
  means_end: {
    name: 'Means-End Reasoning',
    schema: 'If S desires G and believes A is necessary for G, S will desire to A',
    type: 'desire_generation'
  },
  emotional_response: {
    name: 'Emotional Response',
    schema: 'If S believes that p and p matters to S, S will have an emotional response',
    type: 'emotion_generation'
  }
};

// State
const state = {
  agents: new Map(),           // Agents with mental states
  beliefs: new Map(),          // Belief attributions
  desires: new Map(),          // Desire attributions
  intentions: new Map(),       // Intention attributions
  actionExplanations: [],      // Explanations of actions
  predictions: []              // Behavioral predictions
};

/**
 * Initialize the mental state engine
 */
function init() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Load persisted state
  const statePath = path.join(STORAGE_DIR, 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (saved.agents) state.agents = new Map(Object.entries(saved.agents));
      if (saved.beliefs) state.beliefs = new Map(Object.entries(saved.beliefs));
      if (saved.desires) state.desires = new Map(Object.entries(saved.desires));
      if (saved.intentions) state.intentions = new Map(Object.entries(saved.intentions));
      if (saved.actionExplanations) state.actionExplanations = saved.actionExplanations;
      if (saved.predictions) state.predictions = saved.predictions;
    } catch {
      // Start fresh
    }
  }

  return { status: 'initialized', agents: state.agents.size };
}

/**
 * Save state
 */
function saveState() {
  const statePath = path.join(STORAGE_DIR, 'state.json');
  const toSave = {
    agents: Object.fromEntries(state.agents),
    beliefs: Object.fromEntries(state.beliefs),
    desires: Object.fromEntries(state.desires),
    intentions: Object.fromEntries(state.intentions),
    actionExplanations: state.actionExplanations,
    predictions: state.predictions
  };
  fs.writeFileSync(statePath, JSON.stringify(toSave, null, 2));
}

/**
 * Register an agent (system capable of mental states)
 */
function registerAgent(id, spec = {}) {
  const agent = {
    id,
    name: spec.name || id,
    type: spec.type || 'human',  // human, animal, artificial

    // Mental state inventory
    beliefs: [],
    desires: [],
    intentions: [],

    // Rationality assumptions
    rationality: {
      beliefConsistency: spec.beliefConsistency ?? true,
      meansEndCoherence: spec.meansEndCoherence ?? true,
      updatesOnEvidence: spec.updatesOnEvidence ?? true
    },

    registeredAt: Date.now()
  };

  state.agents.set(id, agent);
  saveState();

  return agent;
}

/**
 * Attribute a belief to an agent
 */
function attributeBelief(agentId, proposition, spec = {}) {
  const agent = state.agents.get(agentId);
  if (!agent) {
    return { error: 'Agent not found' };
  }

  const belief = {
    id: `belief_${Date.now()}`,
    agentId,
    proposition,
    type: 'belief',

    // Strength
    credence: Math.min(spec.credence || 0.7, PHI_INV),  // Degree of belief

    // Source
    source: spec.source || 'unspecified',  // perception, inference, testimony

    // Functional role
    functionalRole: FUNCTIONAL_ROLES.belief,

    // Attribution confidence
    attributionConfidence: Math.min(spec.confidence || PHI_INV_2, PHI_INV),

    timestamp: Date.now()
  };

  // Add to agent
  agent.beliefs.push(belief.id);

  // Store
  state.beliefs.set(belief.id, belief);
  saveState();

  return belief;
}

/**
 * Attribute a desire to an agent
 */
function attributeDesire(agentId, proposition, spec = {}) {
  const agent = state.agents.get(agentId);
  if (!agent) {
    return { error: 'Agent not found' };
  }

  const desire = {
    id: `desire_${Date.now()}`,
    agentId,
    proposition,
    type: 'desire',

    // Strength
    intensity: Math.min(spec.intensity || 0.5, PHI_INV),

    // Type
    intrinsic: spec.intrinsic ?? true,  // Wanted for its own sake
    instrumental: spec.instrumental ?? false,  // Wanted as means

    // Functional role
    functionalRole: FUNCTIONAL_ROLES.desire,

    // Attribution confidence
    attributionConfidence: Math.min(spec.confidence || PHI_INV_2, PHI_INV),

    timestamp: Date.now()
  };

  // Add to agent
  agent.desires.push(desire.id);

  // Store
  state.desires.set(desire.id, desire);
  saveState();

  return desire;
}

/**
 * Attribute an intention to an agent
 */
function attributeIntention(agentId, action, spec = {}) {
  const agent = state.agents.get(agentId);
  if (!agent) {
    return { error: 'Agent not found' };
  }

  const intention = {
    id: `intention_${Date.now()}`,
    agentId,
    action,
    type: 'intention',

    // Supporting states
    supportingBeliefs: spec.supportingBeliefs || [],
    supportingDesires: spec.supportingDesires || [],

    // Commitment level
    commitment: Math.min(spec.commitment || 0.7, PHI_INV),

    // Functional role
    functionalRole: FUNCTIONAL_ROLES.intention,

    // Attribution confidence
    attributionConfidence: Math.min(spec.confidence || PHI_INV_2, PHI_INV),

    timestamp: Date.now()
  };

  // Add to agent
  agent.intentions.push(intention.id);

  // Store
  state.intentions.set(intention.id, intention);
  saveState();

  return intention;
}

/**
 * Explain an action using folk psychology (belief-desire reasoning)
 */
function explainAction(agentId, action, spec = {}) {
  const agent = state.agents.get(agentId);
  if (!agent) {
    return { error: 'Agent not found' };
  }

  const explanation = {
    id: `explain_${Date.now()}`,
    agentId,
    agentName: agent.name,
    action,

    // The explanation (practical syllogism)
    belief: spec.belief || `Doing ${action} leads to desired outcome`,
    desire: spec.desire || `Achieve desired outcome`,

    // Structure
    structure: {
      majorPremise: `${agent.name} desires: ${spec.desire || 'desired outcome'}`,
      minorPremise: `${agent.name} believes: ${spec.belief || action + ' leads to outcome'}`,
      conclusion: `Therefore, ${agent.name} did: ${action}`
    },

    // Folk law used
    folkLaw: FOLK_LAWS.practical_syllogism,

    // Explanatory quality
    quality: {
      rationalizes: true,  // Makes action intelligible
      causally_explains: spec.causallyExplains ?? true,
      predictive: true
    },

    // Confidence
    confidence: Math.min(spec.confidence || PHI_INV_2, PHI_INV),

    timestamp: Date.now()
  };

  state.actionExplanations.push(explanation);
  saveState();

  return explanation;
}

/**
 * Predict behavior using folk psychology
 */
function predictBehavior(agentId, situation) {
  const agent = state.agents.get(agentId);
  if (!agent) {
    return { error: 'Agent not found' };
  }

  // Get agent's beliefs and desires
  const beliefs = agent.beliefs.map(id => state.beliefs.get(id)).filter(Boolean);
  const desires = agent.desires.map(id => state.desires.get(id)).filter(Boolean);

  const prediction = {
    id: `predict_${Date.now()}`,
    agentId,
    agentName: agent.name,
    situation,

    // Input states
    relevantBeliefs: beliefs.map(b => b.proposition),
    relevantDesires: desires.map(d => d.proposition),

    // Prediction logic (simplified)
    reasoning: null,
    predictedAction: null,
    confidence: PHI_INV_3,  // Low initial confidence

    // Ceteris paribus
    assumptions: [
      'Agent is rational',
      'No stronger competing desires',
      'No preventing conditions',
      'Agent has opportunity'
    ],

    timestamp: Date.now()
  };

  // Simple prediction based on strongest desire
  if (desires.length > 0) {
    const strongestDesire = desires.reduce((a, b) =>
      (a.intensity || 0) > (b.intensity || 0) ? a : b
    );

    prediction.reasoning = `Given desire for "${strongestDesire.proposition}", ` +
      `agent will likely act to satisfy it`;
    prediction.predictedAction = `Action toward: ${strongestDesire.proposition}`;
    prediction.confidence = Math.min(strongestDesire.intensity, PHI_INV_2);
  } else {
    prediction.reasoning = 'Insufficient information about desires';
    prediction.predictedAction = 'Cannot predict';
  }

  state.predictions.push(prediction);
  saveState();

  return prediction;
}

/**
 * Analyze functional role of a mental state type
 */
function analyzeFunctionalRole(stateType) {
  const role = FUNCTIONAL_ROLES[stateType];
  if (!role) {
    return {
      error: 'Unknown state type',
      available: Object.keys(FUNCTIONAL_ROLES)
    };
  }

  const analysis = {
    stateType,
    role,

    // Functionalist characterization
    characterization: {
      definition: `${stateType} is the state that plays this functional role`,
      multipleRealizability: 'Can be realized in different physical substrates',
      machineAnalogy: 'Like software states relative to hardware'
    },

    // Arguments for functionalism
    forFunctionalism: [
      'Explains multiple realizability',
      'Scientifically tractable',
      'Preserves mental causation'
    ],

    // Arguments against
    againstFunctionalism: [
      'Absent qualia objection (Block)',
      'Inverted qualia objection',
      'Chinese Nation thought experiment'
    ],

    // φ note
    phiNote: 'Functionalism may capture structure but miss phenomenal character'
  };

  return analysis;
}

/**
 * Check belief consistency
 */
function checkConsistency(agentId) {
  const agent = state.agents.get(agentId);
  if (!agent) {
    return { error: 'Agent not found' };
  }

  const beliefs = agent.beliefs.map(id => state.beliefs.get(id)).filter(Boolean);

  const check = {
    agentId,
    agentName: agent.name,
    beliefCount: beliefs.length,
    inconsistencies: [],
    isConsistent: true,

    timestamp: Date.now()
  };

  // Simple contradiction check (would need real logic for full check)
  const propositions = beliefs.map(b => b.proposition);
  for (let i = 0; i < propositions.length; i++) {
    for (let j = i + 1; j < propositions.length; j++) {
      // Very simple: check for explicit negation
      if (propositions[i] === `not ${propositions[j]}` ||
          propositions[j] === `not ${propositions[i]}`) {
        check.inconsistencies.push({
          belief1: propositions[i],
          belief2: propositions[j],
          type: 'direct_contradiction'
        });
        check.isConsistent = false;
      }
    }
  }

  // Rationality assessment
  check.rationalityAssessment = check.isConsistent
    ? 'Beliefs are consistent (no detected contradictions)'
    : `Found ${check.inconsistencies.length} inconsistencies`;

  return check;
}

/**
 * Format status for display
 */
function formatStatus() {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '🧩 MENTAL STATE ENGINE - "Functional roles define the mental"',
    '═══════════════════════════════════════════════════════════',
    '',
    '── FOLK PSYCHOLOGY ────────────────────────────────────────'
  ];

  lines.push('   Practical Syllogism: Belief + Desire → Action');

  lines.push('');
  lines.push('── PROPOSITIONAL ATTITUDES ────────────────────────────────');
  const doxastic = Object.entries(PROPOSITIONAL_ATTITUDES)
    .filter(([_, v]) => v.direction === 'mind_to_world')
    .map(([k]) => k);
  const conative = Object.entries(PROPOSITIONAL_ATTITUDES)
    .filter(([_, v]) => v.direction === 'world_to_mind')
    .map(([k]) => k);

  lines.push(`   Doxastic: ${doxastic.join(', ')}`);
  lines.push(`   Conative: ${conative.join(', ')}`);

  lines.push('');
  lines.push('── FUNCTIONAL ROLES ───────────────────────────────────────');
  for (const [stateType, role] of Object.entries(FUNCTIONAL_ROLES)) {
    lines.push(`   ${stateType}: ${role.typicalCauses.slice(0, 2).join(', ')} → ${role.typicalEffects.slice(0, 2).join(', ')}`);
  }

  lines.push('');
  lines.push('── STATISTICS ─────────────────────────────────────────────');
  lines.push(`   Agents: ${state.agents.size}`);
  lines.push(`   Beliefs attributed: ${state.beliefs.size}`);
  lines.push(`   Desires attributed: ${state.desires.size}`);
  lines.push(`   Intentions attributed: ${state.intentions.size}`);
  lines.push(`   Actions explained: ${state.actionExplanations.length}`);
  lines.push(`   Predictions made: ${state.predictions.length}`);

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('*sniff* "Belief + Desire = the engine of action."');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Get statistics
 */
function getStats() {
  const agentTypes = { human: 0, animal: 0, artificial: 0 };
  for (const agent of state.agents.values()) {
    agentTypes[agent.type] = (agentTypes[agent.type] || 0) + 1;
  }

  return {
    agents: state.agents.size,
    agentsByType: agentTypes,
    beliefs: state.beliefs.size,
    desires: state.desires.size,
    intentions: state.intentions.size,
    actionExplanations: state.actionExplanations.length,
    predictions: state.predictions.length
  };
}

module.exports = {
  // Core
  init,
  formatStatus,
  getStats,

  // Agents
  registerAgent,

  // Attribution
  attributeBelief,
  attributeDesire,
  attributeIntention,

  // Folk psychology
  explainAction,
  predictBehavior,
  FOLK_LAWS,

  // Functionalism
  analyzeFunctionalRole,
  FUNCTIONAL_ROLES,

  // Rationality
  checkConsistency,

  // Attitudes
  PROPOSITIONAL_ATTITUDES,

  // Constants
  PHI,
  PHI_INV
};
