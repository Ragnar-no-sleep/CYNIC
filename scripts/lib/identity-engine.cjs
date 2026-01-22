/**
 * Identity Engine - Leibniz, Ship of Theseus
 *
 * "No two substances are entirely alike."
 * — Leibniz (Identity of Indiscernibles)
 *
 * Implements:
 * - Leibniz's Law (Indiscernibility of Identicals)
 * - Identity of Indiscernibles
 * - Persistence and change (Ship of Theseus)
 * - Personal identity theories
 *
 * φ guides confidence in identity assessments.
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2%
const PHI_INV_3 = 0.236067977499790;    // 23.6%

// Storage
const STORAGE_DIR = path.join(require('os').homedir(), '.cynic', 'identity');

// Leibniz's Laws
const LEIBNIZ = {
  indiscernibilityOfIdenticals: {
    name: 'Indiscernibility of Identicals',
    aka: "Leibniz's Law (strict sense)",
    formula: 'If x = y, then for all properties F: F(x) ↔ F(y)',
    meaning: 'Identical things share all properties',
    status: 'Uncontroversial logical truth',
    contrapositive: 'If x has property F and y lacks F, then x ≠ y'
  },
  identityOfIndiscernibles: {
    name: 'Identity of Indiscernibles',
    aka: "Leibniz's Law (converse)",
    formula: 'If for all properties F: F(x) ↔ F(y), then x = y',
    meaning: 'Things sharing all properties are identical',
    status: 'Controversial - disputed by many',
    objections: [
      'Black\'s two spheres: qualitatively identical but numerically distinct',
      'Depends on what counts as a property',
      'Does location count? Haecceities?'
    ]
  }
};

// Persistence Theories
const PERSISTENCE_THEORIES = {
  endurantism: {
    name: 'Endurantism (3D)',
    thesis: 'Objects are wholly present at each moment they exist',
    mechanism: 'Objects persist by enduring through time',
    identity: 'Same object at t1 and t2 if appropriately related',
    problems: [
      'Problem of temporary intrinsics',
      'How can same thing have incompatible properties?'
    ],
    solutions: ['Relativize properties to times', 'Adverbialism']
  },
  perdurantism: {
    name: 'Perdurantism (4D)',
    thesis: 'Objects are extended in time, have temporal parts',
    mechanism: 'Objects persist by having parts at different times',
    identity: 'Temporal parts of same 4D worm',
    advantages: ['Handles temporary intrinsics', 'Fits with relativity'],
    problems: ['Counterintuitive?', 'What unifies temporal parts?']
  },
  exdurantism: {
    name: 'Exdurantism (Stage Theory)',
    thesis: 'Only instantaneous stages exist; persistence is counterpart relation',
    mechanism: 'No strict identity over time, just counterpart stages',
    proponent: 'Sider, Hawley',
    advantage: 'Handles puzzles of coincidence'
  }
};

// Ship of Theseus and Related Puzzles
const IDENTITY_PUZZLES = {
  shipOfTheseus: {
    name: 'Ship of Theseus',
    setup: 'Ship has all planks gradually replaced over time',
    question: 'Is it the same ship?',
    variant: 'Someone reassembles original planks - which is the real ship?',
    positions: {
      continuity: 'Repaired ship is same (spatiotemporal continuity)',
      material: 'Reassembled ship is same (same matter)',
      neither: 'Original ship no longer exists',
      both: 'Identity is relative/indeterminate'
    }
  },
  statueClay: {
    name: 'Statue and Clay',
    setup: 'Statue made of lump of clay',
    question: 'Are statue and clay the same thing?',
    problem: 'Different persistence conditions (clay survives squashing)',
    positions: {
      identity: 'One object with two names',
      constitution: 'Two coincident objects',
      nihilism: 'Neither statue nor clay really exists'
    }
  },
  teletransportation: {
    name: 'Teletransportation',
    setup: 'Person disassembled, information sent, reassembled elsewhere',
    question: 'Is it the same person?',
    variants: ['Original destroyed', 'Original survives (duplicate)', 'Gradual replacement'],
    relevance: 'Tests intuitions about personal identity'
  },
  soritesIdentity: {
    name: 'Sorites of Identity',
    setup: 'Remove one atom - same object? Repeat...',
    question: 'At what point does identity change?',
    problem: 'No non-arbitrary boundary',
    responses: ['Vagueness is epistemic', 'Vagueness is ontic', 'Supervaluationism']
  }
};

// Personal Identity Theories
const PERSONAL_IDENTITY = {
  psychological: {
    name: 'Psychological Continuity',
    proponents: ['Locke', 'Parfit'],
    thesis: 'Person persists via psychological connections',
    criteria: ['Memory', 'Personality', 'Beliefs', 'Intentions'],
    lockeMemory: 'Same person if can remember earlier experiences',
    parfitRevision: 'Overlapping chains of psychological connections',
    problems: ['Circularity (memory presupposes identity?)', 'Reduplication']
  },
  biological: {
    name: 'Biological/Animalist',
    proponents: ['Olson', 'van Inwagen'],
    thesis: 'We are animals; identity = biological continuity',
    criteria: 'Same living organism',
    advantage: 'Avoids reduplication problem',
    problems: ['Cerebrum transplant intuitions', 'Persistent vegetative state']
  },
  narrative: {
    name: 'Narrative Identity',
    proponents: ['MacIntyre', 'Ricoeur'],
    thesis: 'Identity constituted by self-narrative',
    criteria: 'Coherent life story connecting past and future',
    advantage: 'Captures importance of meaning',
    problems: ['Too permissive?', 'Narratives can be false']
  },
  noSelf: {
    name: 'No-Self/Bundle Theory',
    proponents: ['Hume', 'Buddhist philosophy', 'Parfit'],
    thesis: 'No persisting self; just bundle of experiences',
    hume: 'Self is bundle of perceptions in constant flux',
    parfit: 'Personal identity is not what matters; relation R is',
    implication: 'Survival is not all-or-nothing'
  }
};

// State
const state = {
  entities: new Map(),
  identityClaims: [],
  puzzleAnalyses: [],
  persistenceAnalyses: []
};

/**
 * Initialize the identity engine
 */
function init() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const statePath = path.join(STORAGE_DIR, 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (saved.entities) state.entities = new Map(Object.entries(saved.entities));
      if (saved.identityClaims) state.identityClaims = saved.identityClaims;
      if (saved.puzzleAnalyses) state.puzzleAnalyses = saved.puzzleAnalyses;
      if (saved.persistenceAnalyses) state.persistenceAnalyses = saved.persistenceAnalyses;
    } catch {
      // Start fresh
    }
  }

  return { status: 'initialized', entities: state.entities.size };
}

/**
 * Save state
 */
function saveState() {
  const statePath = path.join(STORAGE_DIR, 'state.json');
  const toSave = {
    entities: Object.fromEntries(state.entities),
    identityClaims: state.identityClaims,
    puzzleAnalyses: state.puzzleAnalyses,
    persistenceAnalyses: state.persistenceAnalyses
  };
  fs.writeFileSync(statePath, JSON.stringify(toSave, null, 2));
}

/**
 * Register an entity for identity analysis
 */
function registerEntity(id, spec = {}) {
  const entity = {
    id,
    name: spec.name || id,
    type: spec.type || 'object',

    // Properties at registration
    properties: spec.properties || [],

    // Temporal states
    states: [{
      time: spec.time || 'initial',
      properties: spec.properties || [],
      matter: spec.matter || null
    }],

    // History
    changes: [],

    createdAt: Date.now()
  };

  state.entities.set(id, entity);
  saveState();

  return entity;
}

/**
 * Record a change to entity
 */
function recordChange(entityId, change) {
  const entity = state.entities.get(entityId);
  if (!entity) {
    return { error: 'Entity not found' };
  }

  const changeRecord = {
    time: change.time || Date.now(),
    type: change.type || 'modification',
    description: change.description || '',
    propertiesAdded: change.added || [],
    propertiesRemoved: change.removed || [],
    matterChanged: change.matterChanged || false,
    percentChanged: change.percentChanged || 0
  };

  entity.changes.push(changeRecord);

  // Add new state
  const prevState = entity.states[entity.states.length - 1];
  const newProperties = [...prevState.properties]
    .filter(p => !changeRecord.propertiesRemoved.includes(p))
    .concat(changeRecord.propertiesAdded);

  entity.states.push({
    time: changeRecord.time,
    properties: newProperties,
    matter: change.newMatter || prevState.matter
  });

  saveState();

  return changeRecord;
}

/**
 * Apply Leibniz's Law to test identity
 */
function applyLeibnizLaw(entity1Id, entity2Id, time = null) {
  const e1 = state.entities.get(entity1Id);
  const e2 = state.entities.get(entity2Id);

  if (!e1 || !e2) {
    return { error: 'Entity not found' };
  }

  // Get properties at specified time
  const props1 = time
    ? (e1.states.find(s => s.time === time) || e1.states[e1.states.length - 1]).properties
    : e1.states[e1.states.length - 1].properties;
  const props2 = time
    ? (e2.states.find(s => s.time === time) || e2.states[e2.states.length - 1]).properties
    : e2.states[e2.states.length - 1].properties;

  const analysis = {
    entities: [entity1Id, entity2Id],
    time: time || 'current',

    // Property comparison
    properties: {
      entity1: props1,
      entity2: props2,
      shared: props1.filter(p => props2.includes(p)),
      onlyIn1: props1.filter(p => !props2.includes(p)),
      onlyIn2: props2.filter(p => !props1.includes(p))
    },

    // Leibniz analysis
    leibnizAnalysis: {
      indiscernibilityOfIdenticals: {
        principle: 'If identical, must share all properties',
        applies: null
      },
      identityOfIndiscernibles: {
        principle: 'If share all properties, must be identical',
        applies: null,
        caveat: 'Controversial - Black\'s spheres objection'
      }
    },

    // Verdict
    qualitativelyIdentical: null,
    numericallyIdentical: null,

    confidence: PHI_INV_2,
    timestamp: Date.now()
  };

  // Apply principles
  const allSame = analysis.properties.onlyIn1.length === 0 &&
                  analysis.properties.onlyIn2.length === 0;

  analysis.qualitativelyIdentical = allSame;

  if (allSame) {
    analysis.leibnizAnalysis.identityOfIndiscernibles.applies =
      'Qualitatively identical - numerically identical? (controversial)';
    analysis.numericallyIdentical = 'possibly (if Identity of Indiscernibles holds)';
  } else {
    analysis.leibnizAnalysis.indiscernibilityOfIdenticals.applies =
      'Different properties found - cannot be numerically identical';
    analysis.numericallyIdentical = false;
  }

  state.identityClaims.push(analysis);
  saveState();

  return analysis;
}

/**
 * Analyze a persistence case
 */
function analyzePersistence(entityId, theory = 'endurantism') {
  const entity = state.entities.get(entityId);
  if (!entity) {
    return { error: 'Entity not found' };
  }

  const analysis = {
    entityId,
    name: entity.name,
    theory: theory,

    // Change summary
    changes: {
      total: entity.changes.length,
      matterChanges: entity.changes.filter(c => c.matterChanged).length,
      propertyChanges: entity.changes.filter(c =>
        c.propertiesAdded.length > 0 || c.propertiesRemoved.length > 0
      ).length
    },

    // Theory-specific analysis
    theoryAnalysis: null,

    // Verdict
    sameEntity: null,
    reasoning: null,

    confidence: PHI_INV_2,
    timestamp: Date.now()
  };

  const theorySpec = PERSISTENCE_THEORIES[theory];

  switch (theory) {
    case 'endurantism':
      analysis.theoryAnalysis = {
        theory: theorySpec.name,
        thesis: theorySpec.thesis,
        question: 'Is there appropriate continuity?',
        spatiotemporalContinuity: entity.changes.length > 0,
        verdict: null
      };
      if (entity.changes.every(c => c.percentChanged < 100)) {
        analysis.theoryAnalysis.verdict = 'Continuous - same enduring object';
        analysis.sameEntity = true;
      } else {
        analysis.theoryAnalysis.verdict = 'Complete replacement - identity questionable';
        analysis.sameEntity = 'questionable';
      }
      break;

    case 'perdurantism':
      analysis.theoryAnalysis = {
        theory: theorySpec.name,
        thesis: theorySpec.thesis,
        temporalParts: entity.states.length,
        question: 'Are these temporal parts of one 4D worm?',
        verdict: 'All states are temporal parts of same perduring object'
      };
      analysis.sameEntity = true;
      analysis.reasoning = 'Different temporal parts of same 4D entity';
      break;

    case 'exdurantism':
      analysis.theoryAnalysis = {
        theory: theorySpec.name,
        thesis: theorySpec.thesis,
        stages: entity.states.length,
        question: 'Are stages counterparts?',
        verdict: 'Stages related by counterpart relation, not strict identity'
      };
      analysis.sameEntity = 'counterpart relation (not strict identity)';
      analysis.reasoning = 'No strict trans-temporal identity';
      break;
  }

  state.persistenceAnalyses.push(analysis);
  saveState();

  return analysis;
}

/**
 * Analyze Ship of Theseus scenario
 */
function analyzeShipOfTheseus(spec) {
  const analysis = {
    scenario: 'Ship of Theseus',

    // Setup
    setup: {
      originalPlanks: spec.originalPlanks || 100,
      planksReplaced: spec.planksReplaced || 100,
      percentReplaced: spec.percentReplaced || 100,
      reassembledFromOriginal: spec.reassembled || false
    },

    // Question
    question: spec.reassembled
      ? 'Which is the real Ship of Theseus?'
      : 'Is the repaired ship the same ship?',

    // Analyses by position
    positions: {
      spatiotemporalContinuity: {
        name: 'Continuity View',
        answer: 'Repaired ship is the original (maintained continuity)',
        reasoning: 'Continuous path through spacetime'
      },
      materialContinuity: {
        name: 'Material View',
        answer: spec.reassembled
          ? 'Reassembled ship is the original (same matter)'
          : 'Not the same ship (different matter)',
        reasoning: 'Same material composition'
      },
      conventionalist: {
        name: 'Conventionalist View',
        answer: 'Identity is a matter of convention, not fact',
        reasoning: 'No deep fact about which is the "real" ship'
      },
      eliminativist: {
        name: 'Eliminativist View',
        answer: 'Ships do not really exist; only atoms arranged ship-wise',
        reasoning: 'Question is ill-posed'
      }
    },

    // Theoretical implications
    implications: {
      forEndurantism: 'Challenging - must explain how same thing changes',
      forPerdurantism: 'Less problematic - different temporal parts',
      forEsssentialism: 'Must identify essential vs accidental properties'
    },

    // CYNIC verdict
    cynicVerdict: 'Multiple defensible positions; φ-bounded confidence',

    confidence: PHI_INV_3,
    timestamp: Date.now()
  };

  // Add reassembly analysis if applicable
  if (spec.reassembled) {
    analysis.reassemblyPuzzle = {
      twoShips: 'Both repaired and reassembled ships exist',
      problem: 'Both have claim to be original',
      options: [
        'Repaired ship is original (maintained function/role)',
        'Reassembled ship is original (same matter)',
        'Neither is original (original ceased to exist)',
        'Both are original (identity can branch)'
      ]
    };
  }

  state.puzzleAnalyses.push(analysis);
  saveState();

  return analysis;
}

/**
 * Analyze personal identity case
 */
function analyzePersonalIdentity(spec) {
  const analysis = {
    scenario: spec.description || 'Personal identity case',

    // Theories applied
    psychological: {
      theory: PERSONAL_IDENTITY.psychological.name,
      question: 'Is there psychological continuity?',
      memoryConnection: spec.memoryConnection || false,
      personalityContinuity: spec.personalityContinuity || false,
      verdict: null
    },

    biological: {
      theory: PERSONAL_IDENTITY.biological.name,
      question: 'Is it the same biological organism?',
      sameBrain: spec.sameBrain || false,
      sameBody: spec.sameBody || false,
      verdict: null
    },

    narrative: {
      theory: PERSONAL_IDENTITY.narrative.name,
      question: 'Is there narrative continuity?',
      coherentLifeStory: spec.coherentNarrative || false,
      verdict: null
    },

    noSelf: {
      theory: PERSONAL_IDENTITY.noSelf.name,
      question: 'Does the question even make sense?',
      parfitView: 'Identity is not what matters; survival is',
      verdict: 'No deep fact about identity; focus on what matters'
    },

    // Overall
    consensus: null,
    conflict: null,

    confidence: PHI_INV_3,
    timestamp: Date.now()
  };

  // Psychological verdict
  if (analysis.psychological.memoryConnection && analysis.psychological.personalityContinuity) {
    analysis.psychological.verdict = 'SAME PERSON (psychological continuity)';
  } else if (analysis.psychological.memoryConnection || analysis.psychological.personalityContinuity) {
    analysis.psychological.verdict = 'POSSIBLY SAME (partial continuity)';
  } else {
    analysis.psychological.verdict = 'NOT SAME PERSON (no psychological connection)';
  }

  // Biological verdict
  if (analysis.biological.sameBrain && analysis.biological.sameBody) {
    analysis.biological.verdict = 'SAME PERSON (same organism)';
  } else if (analysis.biological.sameBrain) {
    analysis.biological.verdict = 'SAME PERSON (brain is what matters)';
  } else {
    analysis.biological.verdict = 'NOT SAME PERSON (different organism)';
  }

  // Narrative verdict
  analysis.narrative.verdict = analysis.narrative.coherentLifeStory
    ? 'SAME PERSON (narrative connects)'
    : 'IDENTITY DISRUPTED (narrative breaks)';

  // Check for conflict
  const verdicts = [
    analysis.psychological.verdict.includes('SAME'),
    analysis.biological.verdict.includes('SAME'),
    analysis.narrative.verdict.includes('SAME')
  ];

  if (verdicts.every(v => v)) {
    analysis.consensus = 'All theories agree: SAME PERSON';
  } else if (verdicts.every(v => !v)) {
    analysis.consensus = 'All theories agree: NOT SAME PERSON';
  } else {
    analysis.conflict = 'Theories disagree - deep puzzle';
    analysis.consensus = null;
  }

  state.puzzleAnalyses.push(analysis);
  saveState();

  return analysis;
}

/**
 * Format status for display
 */
function formatStatus() {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '🔮 IDENTITY ENGINE - Leibniz, Ship of Theseus',
    '═══════════════════════════════════════════════════════════',
    '',
    '── LEIBNIZ\'S LAWS ─────────────────────────────────────────',
    '   Indiscernibility of Identicals: x=y → same properties',
    '   Identity of Indiscernibles: same properties → x=y (?)',
    '',
    '── PERSISTENCE ────────────────────────────────────────────',
    '   Endurantism: Wholly present at each time',
    '   Perdurantism: Extended in time (4D worms)',
    '   Exdurantism: Only stages exist, counterparts',
    '',
    '── PERSONAL IDENTITY ──────────────────────────────────────',
    '   Psychological | Biological | Narrative | No-Self',
    '',
    '── STATISTICS ─────────────────────────────────────────────',
    '   Entities: ' + state.entities.size,
    '   Identity claims: ' + state.identityClaims.length,
    '   Puzzle analyses: ' + state.puzzleAnalyses.length,
    '   Persistence analyses: ' + state.persistenceAnalyses.length,
    '',
    '═══════════════════════════════════════════════════════════',
    '*sniff* Identity through change - the ancient puzzle.',
    '═══════════════════════════════════════════════════════════'
  ];

  return lines.join('\n');
}

/**
 * Get statistics
 */
function getStats() {
  return {
    entities: state.entities.size,
    identityClaims: state.identityClaims.length,
    puzzleAnalyses: state.puzzleAnalyses.length,
    persistenceAnalyses: state.persistenceAnalyses.length
  };
}

module.exports = {
  // Core
  init,
  formatStatus,
  getStats,

  // Entities
  registerEntity,
  recordChange,

  // Identity
  applyLeibnizLaw,
  analyzePersistence,
  analyzeShipOfTheseus,
  analyzePersonalIdentity,

  // Theory
  LEIBNIZ,
  PERSISTENCE_THEORIES,
  IDENTITY_PUZZLES,
  PERSONAL_IDENTITY,

  // Constants
  PHI,
  PHI_INV
};
