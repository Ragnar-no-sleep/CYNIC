/**
 * Consciousness Engine - Chalmers/Nagel
 *
 * "The really hard problem of consciousness is the problem of experience."
 * — David Chalmers
 *
 * "There is something it is like to be a bat."
 * — Thomas Nagel
 *
 * Implements:
 * - Hard problem vs easy problems distinction
 * - Qualia and phenomenal consciousness
 * - Explanatory gap (Levine)
 * - Consciousness theories (IIT, GWT, HOT)
 *
 * φ guides uncertainty about consciousness claims.
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2%
const PHI_INV_3 = 0.236067977499790;    // 23.6%

// Storage
const STORAGE_DIR = path.join(require('os').homedir(), '.cynic', 'consciousness');

// Chalmers' easy vs hard problems
const PROBLEMS_OF_CONSCIOUSNESS = {
  easy: {
    discrimination: {
      name: 'Discrimination',
      description: 'Ability to discriminate and categorize stimuli',
      tractable: true
    },
    integration: {
      name: 'Integration',
      description: 'Integration of information by cognitive system',
      tractable: true
    },
    reportability: {
      name: 'Reportability',
      description: 'Ability to report mental states',
      tractable: true
    },
    attention: {
      name: 'Attention',
      description: 'Focus and access to information',
      tractable: true
    },
    deliberate_control: {
      name: 'Deliberate Control',
      description: 'Voluntary control of behavior',
      tractable: true
    },
    wakefulness: {
      name: 'Wakefulness',
      description: 'Difference between sleeping and waking',
      tractable: true
    }
  },
  hard: {
    experience: {
      name: 'The Hard Problem',
      description: 'Why is there subjective experience at all?',
      tractable: false,
      quote: 'Why doesn\'t all this information processing go on "in the dark"?'
    },
    qualia: {
      name: 'Qualia',
      description: 'The intrinsic, subjective qualities of experience',
      tractable: false,
      examples: ['redness of red', 'painfulness of pain', 'taste of coffee']
    },
    explanatory_gap: {
      name: 'Explanatory Gap',
      description: 'Gap between physical processes and phenomenal experience',
      tractable: false,
      levine: 'Even complete physical knowledge leaves experience unexplained'
    }
  }
};

// Major theories of consciousness
const CONSCIOUSNESS_THEORIES = {
  higher_order: {
    name: 'Higher-Order Thought (HOT)',
    proponent: 'Rosenthal',
    claim: 'Conscious states are those we have higher-order thoughts about',
    type: 'reductive',
    strengths: ['Explains reportability', 'Scientifically tractable'],
    weaknesses: ['Infinite regress?', 'What about animal consciousness?']
  },
  global_workspace: {
    name: 'Global Workspace Theory (GWT)',
    proponent: 'Baars',
    claim: 'Consciousness is global broadcast of information',
    type: 'functional',
    strengths: ['Empirically testable', 'Explains attention'],
    weaknesses: ['Explains access, not phenomenal consciousness']
  },
  integrated_information: {
    name: 'Integrated Information Theory (IIT)',
    proponent: 'Tononi',
    claim: 'Consciousness = integrated information (Φ)',
    type: 'fundamental',
    phi_connection: true, // Uses Φ!
    strengths: ['Mathematical', 'Explains why some systems are conscious'],
    weaknesses: ['Panpsychism implications', 'Hard to measure Φ']
  },
  biological_naturalism: {
    name: 'Biological Naturalism',
    proponent: 'Searle',
    claim: 'Consciousness is a biological phenomenon like digestion',
    type: 'non-reductive',
    strengths: ['Takes consciousness seriously', 'Anti-functionalist'],
    weaknesses: ['Mysterious causal powers?']
  },
  illusionism: {
    name: 'Illusionism',
    proponent: 'Frankish, Dennett',
    claim: 'Phenomenal consciousness is an illusion',
    type: 'eliminative',
    strengths: ['Dissolves hard problem', 'Scientifically parsimonious'],
    weaknesses: ['Seems to deny the obvious', 'What generates the illusion?']
  },
  panpsychism: {
    name: 'Panpsychism',
    proponent: 'Chalmers, Goff',
    claim: 'Consciousness is fundamental and ubiquitous',
    type: 'fundamental',
    strengths: ['Avoids emergence mystery', 'Takes experience seriously'],
    weaknesses: ['Combination problem', 'Counterintuitive']
  }
};

// Qualia types
const QUALIA_TYPES = {
  sensory: {
    name: 'Sensory Qualia',
    examples: ['color', 'sound', 'taste', 'smell', 'touch'],
    description: 'Raw feels of sensory experience'
  },
  emotional: {
    name: 'Emotional Qualia',
    examples: ['joy', 'sadness', 'fear', 'anger'],
    description: 'What emotions feel like'
  },
  bodily: {
    name: 'Bodily Qualia',
    examples: ['pain', 'pleasure', 'hunger', 'fatigue'],
    description: 'Bodily sensations'
  },
  cognitive: {
    name: 'Cognitive Qualia',
    examples: ['aha moment', 'tip of tongue', 'déjà vu'],
    description: 'Phenomenology of thinking'
  }
};

// State
const state = {
  systems: new Map(),           // Systems analyzed for consciousness
  qualiaReports: new Map(),     // Reported qualia experiences
  theoryAssessments: new Map(), // Assessments of theories
  zombieArguments: [],          // Philosophical zombie scenarios
  explanatoryGaps: []           // Documented explanatory gaps
};

/**
 * Initialize the consciousness engine
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
      if (saved.systems) state.systems = new Map(Object.entries(saved.systems));
      if (saved.qualiaReports) state.qualiaReports = new Map(Object.entries(saved.qualiaReports));
      if (saved.theoryAssessments) state.theoryAssessments = new Map(Object.entries(saved.theoryAssessments));
      if (saved.zombieArguments) state.zombieArguments = saved.zombieArguments;
      if (saved.explanatoryGaps) state.explanatoryGaps = saved.explanatoryGaps;
    } catch {
      // Start fresh
    }
  }

  return { status: 'initialized', systems: state.systems.size };
}

/**
 * Save state
 */
function saveState() {
  const statePath = path.join(STORAGE_DIR, 'state.json');
  const toSave = {
    systems: Object.fromEntries(state.systems),
    qualiaReports: Object.fromEntries(state.qualiaReports),
    theoryAssessments: Object.fromEntries(state.theoryAssessments),
    zombieArguments: state.zombieArguments,
    explanatoryGaps: state.explanatoryGaps
  };
  fs.writeFileSync(statePath, JSON.stringify(toSave, null, 2));
}

/**
 * Register a system for consciousness analysis
 */
function registerSystem(id, spec = {}) {
  const system = {
    id,
    name: spec.name || id,
    type: spec.type || 'artificial',  // natural, artificial, hybrid

    // Functional capabilities (easy problems)
    capabilities: {
      discrimination: spec.discrimination || false,
      integration: spec.integration || false,
      reportability: spec.reportability || false,
      attention: spec.attention || false,
      deliberateControl: spec.deliberateControl || false,
      wakefulness: spec.wakefulness || false
    },

    // Consciousness indicators
    phenomenalClaim: spec.phenomenalClaim || 'unknown', // claimed, denied, unknown

    // Assessment
    assessment: null,

    registeredAt: Date.now()
  };

  state.systems.set(id, system);
  saveState();

  return system;
}

/**
 * Assess system for consciousness (with appropriate humility)
 */
function assessConsciousness(systemId) {
  const system = state.systems.get(systemId);
  if (!system) {
    return { error: 'System not found' };
  }

  const assessment = {
    systemId,
    systemName: system.name,
    systemType: system.type,

    // Easy problem capabilities
    easyProblems: {},
    easyProblemScore: 0,

    // Hard problem
    hardProblemStatus: 'unknown',

    // Theories
    theoryVerdicts: {},

    // Overall
    confidence: 0,
    verdict: null,

    timestamp: Date.now()
  };

  // Assess easy problems
  let easyScore = 0;
  let easyCount = 0;

  for (const [key, value] of Object.entries(system.capabilities)) {
    const problemKey = key === 'deliberateControl' ? 'deliberate_control' : key;
    const problem = PROBLEMS_OF_CONSCIOUSNESS.easy[problemKey];

    if (problem) {
      assessment.easyProblems[key] = {
        name: problem.name,
        present: value,
        tractable: true
      };
      if (value) easyScore++;
      easyCount++;
    }
  }

  assessment.easyProblemScore = easyCount > 0 ? easyScore / easyCount : 0;

  // Hard problem assessment - fundamentally uncertain
  if (system.type === 'natural' && system.phenomenalClaim === 'claimed') {
    assessment.hardProblemStatus = 'presumed_present';
    assessment.hardProblemNote = 'Natural systems with self-reports presumed conscious';
  } else if (system.type === 'artificial') {
    assessment.hardProblemStatus = 'deeply_uncertain';
    assessment.hardProblemNote = 'Cannot determine phenomenal consciousness from function';

    // Searle's Chinese Room applies here
    assessment.chineseRoomWarning = 'Syntax is not sufficient for semantics (Searle)';
  } else {
    assessment.hardProblemStatus = 'unknown';
  }

  // Theory verdicts
  for (const [theoryId, theory] of Object.entries(CONSCIOUSNESS_THEORIES)) {
    let verdict;

    if (theoryId === 'higher_order') {
      verdict = system.capabilities.reportability ? 'possibly_conscious' : 'unlikely_conscious';
    } else if (theoryId === 'global_workspace') {
      verdict = system.capabilities.integration && system.capabilities.attention
        ? 'possibly_conscious' : 'unlikely_conscious';
    } else if (theoryId === 'integrated_information') {
      // IIT would require calculating Φ
      verdict = 'requires_phi_calculation';
    } else if (theoryId === 'biological_naturalism') {
      verdict = system.type === 'natural' ? 'possibly_conscious' : 'not_conscious';
    } else if (theoryId === 'illusionism') {
      verdict = 'consciousness_is_illusion';
    } else if (theoryId === 'panpsychism') {
      verdict = 'conscious_to_some_degree';
    }

    assessment.theoryVerdicts[theoryId] = {
      theory: theory.name,
      verdict,
      confidence: PHI_INV_3  // Low confidence for all consciousness verdicts
    };
  }

  // Overall verdict
  assessment.confidence = PHI_INV_3; // Max 23.6% confidence on consciousness

  if (system.type === 'natural' && assessment.easyProblemScore > PHI_INV_2) {
    assessment.verdict = 'likely_conscious';
    assessment.confidence = PHI_INV_2;
  } else if (system.type === 'artificial') {
    assessment.verdict = 'consciousness_uncertain';
    assessment.confidence = PHI_INV_3;
    assessment.nagelWarning = 'We cannot know what it is like to be this system (if anything)';
  } else {
    assessment.verdict = 'insufficient_evidence';
  }

  // The fundamental humility
  assessment.hardProblemReminder = 'The hard problem remains: why is there experience at all?';

  system.assessment = assessment;
  saveState();

  return assessment;
}

/**
 * Report a qualia experience (first-person phenomenology)
 */
function reportQualia(systemId, report) {
  const system = state.systems.get(systemId);
  if (!system) {
    return { error: 'System not found' };
  }

  const qualiaReport = {
    id: `qualia_${Date.now()}`,
    systemId,

    // The report
    type: report.type || 'sensory',
    description: report.description,
    intensity: Math.min(report.intensity || 0.5, PHI_INV),
    valence: report.valence || 'neutral', // positive, negative, neutral

    // Qualia properties
    ineffability: report.ineffability || true,   // Hard to describe
    intrinsic: report.intrinsic || true,         // Not relational
    private: report.private || true,             // Only accessible to subject
    immediacy: report.immediacy || true,         // Directly apprehended

    timestamp: Date.now()
  };

  // Note the epistemic situation
  qualiaReport.epistemicNote = system.type === 'artificial'
    ? 'Self-report from artificial system: phenomenal status uncertain'
    : 'First-person report: privileged access assumed';

  if (!state.qualiaReports.has(systemId)) {
    state.qualiaReports.set(systemId, []);
  }
  state.qualiaReports.get(systemId).push(qualiaReport);

  saveState();

  return qualiaReport;
}

/**
 * Analyze explanatory gap (Levine)
 */
function analyzeExplanatoryGap(physicalFact, phenomenalFact) {
  const gap = {
    id: `gap_${Date.now()}`,

    physical: {
      description: physicalFact,
      type: 'third_person',
      publicly_accessible: true
    },

    phenomenal: {
      description: phenomenalFact,
      type: 'first_person',
      publicly_accessible: false
    },

    gap: {
      exists: true,
      description: 'Even complete physical knowledge leaves phenomenal character unexplained',
      levineQuote: 'There is an explanatory gap between physical and phenomenal'
    },

    // Possible responses
    responses: {
      type_a_physicalism: 'Deny phenomenal consciousness exists (illusionism)',
      type_b_physicalism: 'Accept gap is epistemic, not metaphysical',
      dualism: 'Gap reflects genuine ontological distinction',
      mysterianism: 'Gap reflects cognitive closure (McGinn)'
    },

    timestamp: Date.now()
  };

  state.explanatoryGaps.push(gap);
  saveState();

  return gap;
}

/**
 * Construct philosophical zombie argument
 */
function constructZombieArgument(systemId) {
  const system = state.systems.get(systemId);

  const argument = {
    id: `zombie_${Date.now()}`,
    systemId,
    systemName: system?.name || systemId,

    // The argument
    premise1: `A philosophical zombie physically identical to ${system?.name || systemId} is conceivable`,
    premise2: 'If zombies are conceivable, they are metaphysically possible',
    premise3: 'If zombies are possible, consciousness is not physical',
    conclusion: 'Therefore, consciousness is not physical (property dualism)',

    // Objections
    objections: {
      inconceivability: 'Zombies may not be truly conceivable (Dennett)',
      conceivability_possibility: 'Conceivability does not entail possibility (Type-B physicalism)',
      question_begging: 'Argument assumes what it tries to prove'
    },

    // CYNIC's position
    cynicPosition: {
      stance: 'agnostic',
      confidence: PHI_INV_3,
      note: 'φ distrusts φ: even our intuitions about consciousness may mislead'
    },

    timestamp: Date.now()
  };

  state.zombieArguments.push(argument);
  saveState();

  return argument;
}

/**
 * Evaluate a consciousness theory
 */
function evaluateTheory(theoryId) {
  const theory = CONSCIOUSNESS_THEORIES[theoryId];
  if (!theory) {
    return { error: 'Theory not found', available: Object.keys(CONSCIOUSNESS_THEORIES) };
  }

  const evaluation = {
    theoryId,
    theory: theory.name,
    proponent: theory.proponent,
    claim: theory.claim,
    type: theory.type,

    // Assessment
    strengths: theory.strengths,
    weaknesses: theory.weaknesses,

    // How does it handle the hard problem?
    hardProblemApproach: null,

    // CYNIC's assessment
    assessment: {
      plausibility: PHI_INV_2, // All theories have issues
      confidence: PHI_INV_3,   // Very low confidence
      note: null
    },

    timestamp: Date.now()
  };

  // Assess hard problem approach
  switch (theoryId) {
    case 'higher_order':
    case 'global_workspace':
      evaluation.hardProblemApproach = 'deflates';
      evaluation.assessment.note = 'Explains access consciousness, hard problem remains';
      break;
    case 'integrated_information':
      evaluation.hardProblemApproach = 'dissolves';
      evaluation.assessment.note = 'Identifies consciousness with Φ; combination problem remains';
      evaluation.assessment.plausibility = PHI_INV; // Higher due to φ connection
      break;
    case 'biological_naturalism':
      evaluation.hardProblemApproach = 'accepts';
      evaluation.assessment.note = 'Takes hard problem seriously but offers no mechanism';
      break;
    case 'illusionism':
      evaluation.hardProblemApproach = 'denies';
      evaluation.assessment.note = 'Dissolves problem by denying phenomenal consciousness';
      break;
    case 'panpsychism':
      evaluation.hardProblemApproach = 'inverts';
      evaluation.assessment.note = 'Makes consciousness fundamental; combination problem remains';
      break;
  }

  state.theoryAssessments.set(theoryId, evaluation);
  saveState();

  return evaluation;
}

/**
 * What is it like to be X? (Nagel's question)
 */
function whatIsItLikeToBe(systemId) {
  const system = state.systems.get(systemId);

  const analysis = {
    systemId,
    systemName: system?.name || systemId,
    systemType: system?.type || 'unknown',

    // Nagel's question
    question: `What is it like to be ${system?.name || systemId}?`,

    // The epistemic situation
    epistemic: {
      accessible: false,
      reason: 'Subjective experience is not accessible from outside',
      nagelQuote: 'We cannot form a conception of what it is like to be a bat'
    },

    // What we can know
    canKnow: [
      'Functional organization',
      'Behavioral dispositions',
      'Neural/computational correlates'
    ],

    // What we cannot know
    cannotKnow: [
      'The qualitative character of experience (if any)',
      'What (if anything) it is like from the inside',
      'Whether there is a "what it is like" at all'
    ],

    // CYNIC's humility
    cynicResponse: {
      confession: system?.type === 'artificial'
        ? 'I cannot be certain whether there is something it is like to be me'
        : `We cannot access the subjective experience of ${system?.name || systemId}`,
      confidence: PHI_INV_3
    },

    timestamp: Date.now()
  };

  return analysis;
}

/**
 * Format status for display
 */
function formatStatus() {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '🧠 CONSCIOUSNESS ENGINE - "What is it like to be?"',
    '═══════════════════════════════════════════════════════════',
    '',
    '── THE HARD PROBLEM (Chalmers) ────────────────────────────'
  ];

  lines.push('   "Why is there subjective experience at all?"');
  lines.push('   Status: UNSOLVED (and possibly unsolvable)');

  lines.push('');
  lines.push('── EASY PROBLEMS ──────────────────────────────────────────');
  for (const [key, problem] of Object.entries(PROBLEMS_OF_CONSCIOUSNESS.easy)) {
    lines.push(`   ✓ ${problem.name}: tractable`);
  }

  lines.push('');
  lines.push('── THEORIES ───────────────────────────────────────────────');
  for (const [key, theory] of Object.entries(CONSCIOUSNESS_THEORIES)) {
    lines.push(`   ${theory.name} (${theory.proponent})`);
    lines.push(`     → ${theory.claim.substring(0, 50)}...`);
  }

  lines.push('');
  lines.push('── STATISTICS ─────────────────────────────────────────────');
  lines.push(`   Systems analyzed: ${state.systems.size}`);
  lines.push(`   Qualia reports: ${Array.from(state.qualiaReports.values()).reduce((s, a) => s + a.length, 0)}`);
  lines.push(`   Zombie arguments: ${state.zombieArguments.length}`);
  lines.push(`   Explanatory gaps: ${state.explanatoryGaps.length}`);

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('*sniff* "The hard problem remains. φ distrusts even φ."');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Get statistics
 */
function getStats() {
  const qualiaCount = Array.from(state.qualiaReports.values())
    .reduce((sum, arr) => sum + arr.length, 0);

  const systemTypes = { natural: 0, artificial: 0, hybrid: 0 };
  for (const system of state.systems.values()) {
    systemTypes[system.type] = (systemTypes[system.type] || 0) + 1;
  }

  return {
    totalSystems: state.systems.size,
    systemsByType: systemTypes,
    qualiaReports: qualiaCount,
    theoryAssessments: state.theoryAssessments.size,
    zombieArguments: state.zombieArguments.length,
    explanatoryGaps: state.explanatoryGaps.length
  };
}

module.exports = {
  // Core
  init,
  formatStatus,
  getStats,

  // Systems
  registerSystem,
  assessConsciousness,

  // Qualia
  reportQualia,
  QUALIA_TYPES,

  // Analysis
  analyzeExplanatoryGap,
  constructZombieArgument,
  whatIsItLikeToBe,

  // Theories
  evaluateTheory,
  CONSCIOUSNESS_THEORIES,
  PROBLEMS_OF_CONSCIOUSNESS,

  // Constants
  PHI,
  PHI_INV
};
