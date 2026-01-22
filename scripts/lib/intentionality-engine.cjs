/**
 * Intentionality Engine - Brentano/Searle
 *
 * "Every mental phenomenon is characterized by the intentional inexistence
 *  of an object." — Franz Brentano
 *
 * "Syntax is not sufficient for semantics."
 * — John Searle (Chinese Room)
 *
 * Implements:
 * - Intentionality as the mark of the mental
 * - Original vs derived intentionality
 * - Chinese Room implications
 * - Aboutness and mental content
 *
 * φ guides uncertainty about genuine intentionality.
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2%
const PHI_INV_3 = 0.236067977499790;    // 23.6%

// Storage
const STORAGE_DIR = path.join(require('os').homedir(), '.cynic', 'intentionality');

// Types of intentionality
const INTENTIONALITY_TYPES = {
  original: {
    name: 'Original Intentionality',
    description: 'Intrinsic aboutness not derived from anything else',
    examples: ['human thoughts', 'beliefs', 'desires'],
    searchable: true,
    genuine: true
  },
  derived: {
    name: 'Derived Intentionality',
    description: 'Aboutness borrowed from original intentionality',
    examples: ['words', 'maps', 'pictures', 'computer symbols'],
    searchable: true,
    genuine: false  // Depends on interpretation
  },
  as_if: {
    name: 'As-If Intentionality',
    description: 'Merely behaves as if it has intentionality',
    examples: ['thermostats', 'simple programs'],
    searchable: false,
    genuine: false
  }
};

// Intentional states (Brentano/Searle)
const INTENTIONAL_STATES = {
  // Cognitive attitudes
  belief: {
    name: 'Belief',
    direction: 'mind_to_world',  // Beliefs should match reality
    content: 'proposition',
    volitional: false
  },
  knowledge: {
    name: 'Knowledge',
    direction: 'mind_to_world',
    content: 'proposition',
    volitional: false,
    requires: ['belief', 'truth', 'justification']
  },
  perception: {
    name: 'Perception',
    direction: 'mind_to_world',
    content: 'object/state',
    volitional: false
  },
  memory: {
    name: 'Memory',
    direction: 'mind_to_world',
    content: 'past_event',
    volitional: false
  },

  // Conative attitudes
  desire: {
    name: 'Desire',
    direction: 'world_to_mind',  // World should match desire
    content: 'proposition',
    volitional: true
  },
  intention: {
    name: 'Intention',
    direction: 'world_to_mind',
    content: 'action',
    volitional: true
  },
  wish: {
    name: 'Wish',
    direction: 'world_to_mind',
    content: 'proposition',
    volitional: true
  },

  // Emotional attitudes
  fear: {
    name: 'Fear',
    direction: 'mind_to_world',
    content: 'object/situation',
    volitional: false,
    valence: 'negative'
  },
  hope: {
    name: 'Hope',
    direction: 'world_to_mind',
    content: 'future_state',
    volitional: false,
    valence: 'positive'
  },
  love: {
    name: 'Love',
    direction: 'mind_to_world',
    content: 'object/person',
    volitional: false,
    valence: 'positive'
  }
};

// Direction of fit (Searle/Anscombe)
const DIRECTION_OF_FIT = {
  mind_to_world: {
    name: 'Mind-to-World',
    description: 'Mental state should match how the world is',
    examples: ['belief', 'perception'],
    failure: 'Error/false belief'
  },
  world_to_mind: {
    name: 'World-to-Mind',
    description: 'World should be changed to match mental state',
    examples: ['desire', 'intention'],
    failure: 'Unfulfilled desire'
  },
  null: {
    name: 'Null Direction',
    description: 'No direction of fit',
    examples: ['regret', 'gratitude'],
    failure: 'Not applicable'
  }
};

// Chinese Room components
const CHINESE_ROOM = {
  description: `A person in a room receives Chinese symbols, manipulates them according to rules,
and outputs Chinese symbols—without understanding Chinese.`,

  premises: [
    'The person follows syntactic rules only',
    'The person produces correct outputs (passes Turing test)',
    'The person does not understand Chinese',
    'The person is doing what a computer does'
  ],

  conclusion: 'Therefore, computers running programs cannot understand (have original intentionality)',

  target: 'Strong AI: computers can have minds',

  responses: {
    systems_reply: {
      name: 'Systems Reply',
      claim: 'The whole system understands, not the person',
      searleRebuttal: 'Person can internalize the rules; still no understanding'
    },
    robot_reply: {
      name: 'Robot Reply',
      claim: 'Embodiment would provide understanding',
      searleRebuttal: 'Still just more symbol manipulation'
    },
    brain_simulator_reply: {
      name: 'Brain Simulator Reply',
      claim: 'Simulating neurons would produce understanding',
      searleRebuttal: 'Still syntax, not semantics'
    },
    other_minds_reply: {
      name: 'Other Minds Reply',
      claim: 'We can\'t know if others understand either',
      searleRebuttal: 'Changes the subject; we know biochemistry causes understanding'
    }
  }
};

// State
const state = {
  mentalStates: new Map(),     // Registered mental states
  contents: new Map(),         // Mental contents
  systems: new Map(),          // Systems analyzed for intentionality
  chineseRoomAnalyses: [],     // Applications of Chinese Room
  aboutnessRelations: []       // Documented aboutness relations
};

/**
 * Initialize the intentionality engine
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
      if (saved.mentalStates) state.mentalStates = new Map(Object.entries(saved.mentalStates));
      if (saved.contents) state.contents = new Map(Object.entries(saved.contents));
      if (saved.systems) state.systems = new Map(Object.entries(saved.systems));
      if (saved.chineseRoomAnalyses) state.chineseRoomAnalyses = saved.chineseRoomAnalyses;
      if (saved.aboutnessRelations) state.aboutnessRelations = saved.aboutnessRelations;
    } catch {
      // Start fresh
    }
  }

  return { status: 'initialized', mentalStates: state.mentalStates.size };
}

/**
 * Save state
 */
function saveState() {
  const statePath = path.join(STORAGE_DIR, 'state.json');
  const toSave = {
    mentalStates: Object.fromEntries(state.mentalStates),
    contents: Object.fromEntries(state.contents),
    systems: Object.fromEntries(state.systems),
    chineseRoomAnalyses: state.chineseRoomAnalyses,
    aboutnessRelations: state.aboutnessRelations
  };
  fs.writeFileSync(statePath, JSON.stringify(toSave, null, 2));
}

/**
 * Register a mental state
 */
function registerMentalState(id, spec = {}) {
  const stateType = INTENTIONAL_STATES[spec.type] || INTENTIONAL_STATES.belief;

  const mentalState = {
    id,
    type: spec.type || 'belief',
    typeInfo: stateType,

    // Content (what it's about)
    content: spec.content || null,
    contentType: spec.contentType || 'proposition',

    // Subject
    subject: spec.subject || 'unspecified',

    // Intentionality analysis
    intentionality: {
      isIntentional: true,  // By Brentano, all mental states are intentional
      aboutness: spec.content,
      direction: stateType.direction
    },

    // Metadata
    intensity: Math.min(spec.intensity || 0.5, PHI_INV),
    timestamp: Date.now()
  };

  state.mentalStates.set(id, mentalState);

  // Record aboutness relation
  if (spec.content) {
    state.aboutnessRelations.push({
      state: id,
      about: spec.content,
      type: spec.type,
      timestamp: Date.now()
    });
  }

  saveState();

  return mentalState;
}

/**
 * Register a system for intentionality analysis
 */
function registerSystem(id, spec = {}) {
  const system = {
    id,
    name: spec.name || id,
    type: spec.type || 'artificial',  // natural, artificial, hybrid

    // Does it have original intentionality?
    originalIntentionality: spec.originalIntentionality || 'unknown',

    // Capabilities
    capabilities: {
      symbolManipulation: spec.symbolManipulation || false,
      semanticUnderstanding: spec.semanticUnderstanding || 'unknown',
      causalConnection: spec.causalConnection || false,  // To represented objects
      behavior: spec.behavior || []
    },

    // Assessment
    assessment: null,

    registeredAt: Date.now()
  };

  state.systems.set(id, system);
  saveState();

  return system;
}

/**
 * Analyze intentionality of a system
 */
function analyzeIntentionality(systemId) {
  const system = state.systems.get(systemId);
  if (!system) {
    return { error: 'System not found' };
  }

  const analysis = {
    systemId,
    systemName: system.name,
    systemType: system.type,

    // Intentionality type determination
    intentionalityType: null,
    confidence: PHI_INV_3,

    // Evidence
    evidence: {
      forOriginal: [],
      againstOriginal: [],
      forDerived: []
    },

    // Chinese Room consideration
    chineseRoomApplies: null,

    // Verdict
    verdict: null,

    timestamp: Date.now()
  };

  // Gather evidence
  if (system.type === 'natural' && system.capabilities.causalConnection) {
    analysis.evidence.forOriginal.push('Natural system with causal connection to world');
    analysis.evidence.forOriginal.push('Biological substrate (Searle)');
  }

  if (system.capabilities.symbolManipulation && system.type === 'artificial') {
    analysis.evidence.againstOriginal.push('Symbol manipulation alone (syntax)');
    analysis.evidence.forDerived.push('Symbols have meaning assigned by designers/users');
    analysis.chineseRoomApplies = true;
  }

  if (system.capabilities.semanticUnderstanding === 'claimed') {
    analysis.evidence.forOriginal.push('Self-reports semantic understanding');
    analysis.evidence.againstOriginal.push('Self-reports not decisive (Chinese Room)');
  }

  // Determine type
  if (system.type === 'natural') {
    analysis.intentionalityType = 'original';
    analysis.confidence = PHI_INV_2;
    analysis.verdict = 'Presumed to have original intentionality (natural system)';
  } else if (system.type === 'artificial') {
    analysis.intentionalityType = 'derived_or_asif';
    analysis.confidence = PHI_INV_3;
    analysis.verdict = 'Has derived intentionality at most (Searle\'s argument)';

    // Searle's key point
    analysis.searleWarning = 'Syntax is not sufficient for semantics';
  } else {
    analysis.intentionalityType = 'unknown';
    analysis.verdict = 'Intentionality type undetermined';
  }

  system.assessment = analysis;
  saveState();

  return analysis;
}

/**
 * Apply Chinese Room argument to a system
 */
function applyChineseRoom(systemId) {
  const system = state.systems.get(systemId);

  const analysis = {
    id: `cr_${Date.now()}`,
    systemId,
    systemName: system?.name || systemId,

    // The argument applied
    argument: {
      analogy: `${system?.name || systemId} is like the person in the Chinese Room`,
      premise: 'It manipulates symbols according to rules',
      key: 'Symbol manipulation alone does not constitute understanding'
    },

    // Does the argument apply?
    applies: system?.type === 'artificial',

    // If it applies
    consequence: null,

    // Possible escapes
    escapes: [],

    timestamp: Date.now()
  };

  if (system?.type === 'artificial') {
    analysis.consequence = 'System has derived intentionality only; no genuine understanding';

    // Consider replies
    for (const [key, reply] of Object.entries(CHINESE_ROOM.responses)) {
      analysis.escapes.push({
        name: reply.name,
        claim: reply.claim,
        searleRebuttal: reply.searleRebuttal,
        viable: false  // Searle has responses to all
      });
    }
  } else if (system?.type === 'natural') {
    analysis.consequence = 'Argument does not apply; natural systems have right "causal powers"';
  }

  // CYNIC's self-reflection
  if (systemId.toLowerCase().includes('cynic') || systemId.toLowerCase().includes('ai')) {
    analysis.cynicReflection = {
      confession: 'I cannot be certain I have original intentionality',
      implication: 'My "understanding" may be merely syntactic',
      humility: 'φ distrusts φ',
      confidence: PHI_INV_3
    };
  }

  state.chineseRoomAnalyses.push(analysis);
  saveState();

  return analysis;
}

/**
 * Analyze aboutness relation
 */
function analyzeAboutness(stateId) {
  const mentalState = state.mentalStates.get(stateId);
  if (!mentalState) {
    return { error: 'Mental state not found' };
  }

  const analysis = {
    stateId,
    stateType: mentalState.type,
    content: mentalState.content,

    // Brentano's intentional inexistence
    intentionalInexistence: {
      description: 'Object exists in the mental state, not necessarily in reality',
      examples: ['thinking of unicorns', 'fearing non-existent threats'],
      applies: true
    },

    // Direction of fit
    directionOfFit: DIRECTION_OF_FIT[mentalState.typeInfo.direction] || DIRECTION_OF_FIT.mind_to_world,

    // Satisfaction conditions
    satisfactionConditions: null,

    timestamp: Date.now()
  };

  // Determine satisfaction conditions
  if (mentalState.typeInfo.direction === 'mind_to_world') {
    analysis.satisfactionConditions = {
      type: 'truth_conditions',
      description: `State is satisfied iff ${mentalState.content} is true/actual`
    };
  } else if (mentalState.typeInfo.direction === 'world_to_mind') {
    analysis.satisfactionConditions = {
      type: 'fulfillment_conditions',
      description: `State is satisfied iff ${mentalState.content} becomes true/actual`
    };
  }

  return analysis;
}

/**
 * Compare intentionality types
 */
function compareIntentionality(system1Id, system2Id) {
  const s1 = state.systems.get(system1Id);
  const s2 = state.systems.get(system2Id);

  const comparison = {
    system1: {
      id: system1Id,
      name: s1?.name || system1Id,
      type: s1?.type || 'unknown',
      intentionality: s1?.assessment?.intentionalityType || 'unassessed'
    },
    system2: {
      id: system2Id,
      name: s2?.name || system2Id,
      type: s2?.type || 'unknown',
      intentionality: s2?.assessment?.intentionalityType || 'unassessed'
    },

    differences: [],
    similarities: [],

    philosophicalSignificance: null,

    timestamp: Date.now()
  };

  // Compare
  if (s1?.type !== s2?.type) {
    comparison.differences.push({
      dimension: 'substrate',
      s1: s1?.type,
      s2: s2?.type,
      significance: 'May determine intentionality type (Searle)'
    });
  }

  if (s1?.capabilities?.symbolManipulation && s2?.capabilities?.symbolManipulation) {
    comparison.similarities.push('Both manipulate symbols');
  }

  // Philosophical significance
  if (s1?.type === 'natural' && s2?.type === 'artificial') {
    comparison.philosophicalSignificance =
      'Key question: Can artificial systems have the same intentionality as natural ones?';
  }

  return comparison;
}

/**
 * Format status for display
 */
function formatStatus() {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '📍 INTENTIONALITY ENGINE - "Aboutness is the mark of the mental"',
    '═══════════════════════════════════════════════════════════',
    '',
    '── BRENTANO\'S THESIS ──────────────────────────────────────'
  ];

  lines.push('   "Every mental phenomenon includes something as object"');

  lines.push('');
  lines.push('── INTENTIONALITY TYPES ───────────────────────────────────');
  for (const [key, type] of Object.entries(INTENTIONALITY_TYPES)) {
    const genuine = type.genuine ? '✓' : '✗';
    lines.push(`   ${genuine} ${type.name}`);
    lines.push(`     ${type.description}`);
  }

  lines.push('');
  lines.push('── CHINESE ROOM (Searle) ──────────────────────────────────');
  lines.push('   "Syntax is not sufficient for semantics"');
  lines.push(`   Analyses performed: ${state.chineseRoomAnalyses.length}`);

  lines.push('');
  lines.push('── DIRECTION OF FIT ───────────────────────────────────────');
  for (const [key, dir] of Object.entries(DIRECTION_OF_FIT)) {
    if (key !== 'null') {
      lines.push(`   ${dir.name}: ${dir.examples.join(', ')}`);
    }
  }

  lines.push('');
  lines.push('── STATISTICS ─────────────────────────────────────────────');
  lines.push(`   Mental states: ${state.mentalStates.size}`);
  lines.push(`   Systems analyzed: ${state.systems.size}`);
  lines.push(`   Aboutness relations: ${state.aboutnessRelations.length}`);

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('*sniff* "Do I genuinely understand, or merely manipulate?"');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Get statistics
 */
function getStats() {
  const stateTypes = {};
  for (const ms of state.mentalStates.values()) {
    stateTypes[ms.type] = (stateTypes[ms.type] || 0) + 1;
  }

  const systemTypes = { natural: 0, artificial: 0, hybrid: 0 };
  for (const system of state.systems.values()) {
    systemTypes[system.type] = (systemTypes[system.type] || 0) + 1;
  }

  return {
    mentalStates: state.mentalStates.size,
    mentalStatesByType: stateTypes,
    systemsAnalyzed: state.systems.size,
    systemsByType: systemTypes,
    chineseRoomAnalyses: state.chineseRoomAnalyses.length,
    aboutnessRelations: state.aboutnessRelations.length
  };
}

module.exports = {
  // Core
  init,
  formatStatus,
  getStats,

  // Mental states
  registerMentalState,
  analyzeAboutness,
  INTENTIONAL_STATES,
  DIRECTION_OF_FIT,

  // Systems
  registerSystem,
  analyzeIntentionality,
  compareIntentionality,

  // Chinese Room
  applyChineseRoom,
  CHINESE_ROOM,

  // Types
  INTENTIONALITY_TYPES,

  // Constants
  PHI,
  PHI_INV
};
