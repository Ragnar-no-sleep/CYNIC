/**
 * Time Engine - A-theory, B-theory, McTaggart
 *
 * "Time is unreal."
 * — J.M.E. McTaggart
 *
 * Implements:
 * - McTaggart's argument
 * - A-theory (tensed, dynamic time)
 * - B-theory (tenseless, static time)
 * - Temporal passage and the moving spotlight
 *
 * φ guides confidence in temporal assessments.
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2%
const PHI_INV_3 = 0.236067977499790;    // 23.6%

// Storage
const STORAGE_DIR = path.join(require('os').homedir(), '.cynic', 'time');

// McTaggart's Argument
const MCTAGGART = {
  twoSeries: {
    aSeries: {
      name: 'A-Series',
      description: 'Events ordered by past, present, future',
      positions: ['Past', 'Present', 'Future'],
      characteristic: 'Positions are dynamic - they change',
      example: 'The battle is past (was future, then present)'
    },
    bSeries: {
      name: 'B-Series',
      description: 'Events ordered by earlier than, later than, simultaneous',
      relations: ['Earlier than', 'Later than', 'Simultaneous with'],
      characteristic: 'Relations are permanent - they do not change',
      example: 'The battle is always earlier than this moment'
    }
  },
  argument: {
    name: 'McTaggart\'s Argument for the Unreality of Time',
    steps: [
      '1. Time requires change',
      '2. The B-series alone cannot ground change (relations are permanent)',
      '3. Therefore time requires the A-series',
      '4. But the A-series is contradictory',
      '5. Therefore time is unreal'
    ],
    contradiction: {
      claim: 'Every event has all three A-properties',
      problem: 'Past, present, future are mutually exclusive',
      response: 'Not simultaneously - but this uses temporal notions (circular)'
    },
    quote: 'Past, present, and future are incompatible determinations'
  },
  responses: {
    aTheorists: 'A-series is coherent; McTaggart\'s argument fails',
    bTheorists: 'B-series is sufficient for time; A-series eliminable',
    presentists: 'Only present exists; no contradiction'
  }
};

// A-Theory (Tensed Theory)
const A_THEORY = {
  name: 'A-Theory / Tensed Theory of Time',
  aka: 'Dynamic theory, Temporal becoming',

  core: {
    thesis: 'Temporal passage is real',
    aSeries: 'The A-series is fundamental',
    change: 'Events genuinely change from future to present to past',
    now: 'There is an objective present moment'
  },

  variants: {
    presentism: {
      name: 'Presentism',
      thesis: 'Only present things exist',
      past: 'Past things no longer exist',
      future: 'Future things do not yet exist',
      advantages: ['Matches common sense', 'Explains passage'],
      problems: ['Cross-temporal relations?', 'Truth about past?', 'Relativity?']
    },
    growingBlock: {
      name: 'Growing Block',
      thesis: 'Past and present exist; future does not',
      block: 'Block of reality grows as time passes',
      advantages: ['Past is real (explains truths about past)'],
      problems: ['Why is edge of block special?', 'Still faces relativity problem']
    },
    movingSpotlight: {
      name: 'Moving Spotlight',
      thesis: 'All times exist, but NOW moves along them',
      spotlight: 'Objective NOW illuminates successive times',
      advantages: ['B-series events exist; A-properties are real'],
      problems: ['What is the spotlight?', 'What moves it?']
    }
  },

  forATheory: [
    'Experience of passage seems real',
    'Common sense treats now as special',
    'Agency requires open future'
  ],

  againstATheory: [
    'Relativity of simultaneity',
    'McTaggart\'s contradiction',
    'Rate of time passing?'
  ]
};

// B-Theory (Tenseless Theory)
const B_THEORY = {
  name: 'B-Theory / Tenseless Theory of Time',
  aka: 'Static theory, Eternalism, Block universe',

  core: {
    thesis: 'All times are equally real',
    bSeries: 'Only B-relations (earlier/later) are fundamental',
    noPassage: 'Temporal passage is illusion',
    noObjectiveNow: 'No privileged present moment'
  },

  eternalism: {
    name: 'Eternalism',
    thesis: 'Past, present, and future all exist',
    blockUniverse: 'Spacetime is a 4D block',
    tenselessTruth: 'Event E occurs (tenselessly) at time t',
    noChange: 'Change is just difference between times, not becoming'
  },

  forBTheory: [
    'Fits with relativity (no absolute simultaneity)',
    'Avoids McTaggart\'s contradiction',
    'Scientifically respectable'
  ],

  againstBTheory: [
    'Ignores experience of passage',
    'Makes future seem fated',
    'Removes significance of present'
  ],

  reductionOfTense: {
    method: 'Translate tensed to tenseless',
    example: {
      tensed: 'The battle is past',
      tenseless: 'The battle is earlier than this utterance'
    },
    claim: 'All temporal truths expressible tenselessly'
  }
};

// Temporal Passage
const TEMPORAL_PASSAGE = {
  question: 'Does time really pass?',

  passageReal: {
    view: 'Yes - there is genuine becoming',
    experience: 'We directly experience time passing',
    agency: 'Future is open; past is fixed',
    versions: ['Presentism', 'Growing block', 'Moving spotlight']
  },

  passageIllusory: {
    view: 'No - passage is psychological illusion',
    blockUniverse: 'All times equally exist',
    experience: 'Explained by memory and anticipation',
    versions: ['B-theory', 'Eternalism']
  },

  rateOfPassage: {
    problem: 'How fast does time pass?',
    answer: 'One second per second?',
    objection: 'This is either trivial or requires meta-time',
    bTheoristResponse: 'Shows passage is incoherent'
  },

  relativityProblem: {
    description: 'Special relativity undermines absolute simultaneity',
    implication: 'No privileged present moment',
    aTheoristResponse: 'Adopt preferred frame (controversial)',
    bTheoristClaim: 'Supports eternalism'
  }
};

// State
const state = {
  temporalClaims: [],
  analyses: [],
  theoryComparisons: []
};

/**
 * Initialize the time engine
 */
function init() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const statePath = path.join(STORAGE_DIR, 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (saved.temporalClaims) state.temporalClaims = saved.temporalClaims;
      if (saved.analyses) state.analyses = saved.analyses;
      if (saved.theoryComparisons) state.theoryComparisons = saved.theoryComparisons;
    } catch {
      // Start fresh
    }
  }

  return { status: 'initialized', claims: state.temporalClaims.length };
}

/**
 * Save state
 */
function saveState() {
  const statePath = path.join(STORAGE_DIR, 'state.json');
  const toSave = {
    temporalClaims: state.temporalClaims,
    analyses: state.analyses,
    theoryComparisons: state.theoryComparisons
  };
  fs.writeFileSync(statePath, JSON.stringify(toSave, null, 2));
}

/**
 * Analyze a temporal claim
 */
function analyzeTemporalClaim(claim) {
  const analysis = {
    claim: claim.statement || claim.description,
    type: claim.type || 'unknown',  // 'tensed', 'tenseless', 'about-passage'

    // A-series analysis
    aSeriesAnalysis: {
      usesAPredicate: false,
      pastPresentFuture: null,
      presupposesPassage: false
    },

    // B-series analysis
    bSeriesAnalysis: {
      usesBRelation: false,
      earlierLater: null,
      tenselessTranslation: null
    },

    // Theory implications
    implications: {
      aTheoryCompatible: null,
      bTheoryCompatible: null,
      neutral: null
    },

    confidence: PHI_INV_2,
    timestamp: Date.now()
  };

  // Check for A-predicates
  const aPredicates = ['past', 'present', 'future', 'was', 'will be', 'now'];
  const lowerClaim = analysis.claim.toLowerCase();

  for (const pred of aPredicates) {
    if (lowerClaim.includes(pred)) {
      analysis.aSeriesAnalysis.usesAPredicate = true;
      break;
    }
  }

  // Check for B-relations
  const bRelations = ['earlier', 'later', 'before', 'after', 'simultaneous'];
  for (const rel of bRelations) {
    if (lowerClaim.includes(rel)) {
      analysis.bSeriesAnalysis.usesBRelation = true;
      break;
    }
  }

  // Determine implications
  if (analysis.aSeriesAnalysis.usesAPredicate && !analysis.bSeriesAnalysis.usesBRelation) {
    analysis.implications.aTheoryCompatible = true;
    analysis.implications.bTheoryCompatible = 'requires translation';
    analysis.bSeriesAnalysis.tenselessTranslation = 'Can be translated to B-series (B-theorist claims)';
  } else if (analysis.bSeriesAnalysis.usesBRelation && !analysis.aSeriesAnalysis.usesAPredicate) {
    analysis.implications.aTheoryCompatible = true;
    analysis.implications.bTheoryCompatible = true;
    analysis.implications.neutral = true;
  } else {
    analysis.implications.aTheoryCompatible = true;
    analysis.implications.bTheoryCompatible = 'with translation';
  }

  state.temporalClaims.push(analysis);
  saveState();

  return analysis;
}

/**
 * Evaluate McTaggart's argument
 */
function evaluateMcTaggart(response = 'neutral') {
  const evaluation = {
    argument: 'McTaggart\'s Argument for the Unreality of Time',

    // Steps
    steps: MCTAGGART.argument.steps,

    // Key move
    keyMove: {
      claim: 'A-series is contradictory',
      reasoning: MCTAGGART.argument.contradiction.claim,
      problem: MCTAGGART.argument.contradiction.problem
    },

    // Responses
    possibleResponses: {
      aTheorist: {
        response: 'A-series is coherent',
        move: 'Deny that contradiction really arises',
        strategy: 'Events have A-properties successively, not simultaneously'
      },
      bTheorist: {
        response: 'B-series is sufficient',
        move: 'Accept that A-series is eliminable',
        strategy: 'Time is real via B-relations alone'
      },
      presentist: {
        response: 'Only present exists',
        move: 'No contradiction in what exists',
        strategy: 'Past and future do not exist to bear properties'
      }
    },

    // User\'s chosen response
    chosenResponse: response,

    // Evaluation
    argumentValid: 'Disputed - depends on responses',
    mctaggartConclusion: 'Time is unreal',
    mostAccept: 'Most philosophers reject the conclusion',

    confidence: PHI_INV_3,
    timestamp: Date.now()
  };

  state.analyses.push(evaluation);
  saveState();

  return evaluation;
}

/**
 * Compare A-theory and B-theory
 */
function compareAAndB() {
  const comparison = {
    debate: 'A-Theory vs B-Theory of Time',

    aTheory: {
      name: A_THEORY.name,
      core: A_THEORY.core.thesis,
      keyFeatures: [
        'Temporal passage is real',
        'Present is objectively special',
        'A-series is fundamental'
      ],
      variants: Object.keys(A_THEORY.variants),
      strengths: A_THEORY.forATheory,
      weaknesses: A_THEORY.againstATheory
    },

    bTheory: {
      name: B_THEORY.name,
      core: B_THEORY.core.thesis,
      keyFeatures: [
        'All times equally real',
        'No objective now',
        'B-relations fundamental'
      ],
      variant: 'Eternalism / Block Universe',
      strengths: B_THEORY.forBTheory,
      weaknesses: B_THEORY.againstBTheory
    },

    keyDisagreements: [
      {
        topic: 'Is temporal passage real?',
        aTheory: 'Yes - genuine becoming',
        bTheory: 'No - illusion'
      },
      {
        topic: 'Is there an objective present?',
        aTheory: 'Yes - NOW is special',
        bTheory: 'No - all times on par'
      },
      {
        topic: 'What does physics say?',
        aTheory: 'Relativity is challenge but not fatal',
        bTheory: 'Relativity supports eternalism'
      }
    ],

    // CYNIC assessment
    cynicAssessment: {
      observation: 'Both views have serious arguments',
      recommendation: 'Consider which problems you can live with',
      phi: 'Maximum confidence 61.8% - deep uncertainty appropriate'
    },

    confidence: PHI_INV,
    timestamp: Date.now()
  };

  state.theoryComparisons.push(comparison);
  saveState();

  return comparison;
}

/**
 * Analyze passage of time
 */
function analyzePassage(spec = {}) {
  const analysis = {
    question: 'Is temporal passage real?',

    // Evidence for passage
    forPassage: {
      experience: spec.experiencePassage !== false,
      phenomenology: 'We seem to experience time flowing',
      agency: 'Future seems open, past fixed',
      commonSense: 'Everyone talks as if time passes'
    },

    // Against passage
    againstPassage: {
      rateProblems: {
        question: 'How fast does time pass?',
        problem: 'One second per second is trivial or requires meta-time',
        seriousness: 'moderate'
      },
      relativity: {
        problem: 'No absolute simultaneity in special relativity',
        implication: 'No privileged NOW for spotlight to illuminate',
        seriousness: 'serious'
      },
      blockUniverse: {
        argument: 'Physics suggests 4D block',
        implication: 'All times equally exist',
        seriousness: 'serious'
      }
    },

    // Possible positions
    positions: {
      passageReal: {
        view: 'Passage is objective feature of reality',
        theories: ['Presentism', 'Growing Block', 'Moving Spotlight'],
        challenge: 'Reconcile with physics'
      },
      passageIllusory: {
        view: 'Passage is psychological illusion',
        theories: ['B-theory', 'Eternalism'],
        challenge: 'Explain away experience'
      },
      passageReducible: {
        view: 'Passage reduces to B-relations plus psychology',
        theories: ['Reductive B-theory'],
        challenge: 'Is reduction successful?'
      }
    },

    // Assessment
    assessment: spec.passageView || 'undecided',

    confidence: PHI_INV_3,
    timestamp: Date.now()
  };

  state.analyses.push(analysis);
  saveState();

  return analysis;
}

/**
 * Get philosophy of time summary
 */
function getTimeSummary() {
  return {
    centralQuestions: [
      'Is time real? (McTaggart says no)',
      'Does time pass? (A-theory yes, B-theory no)',
      'Is the present special? (Presentism vs Eternalism)',
      'How does time relate to physics?'
    ],

    mainPositions: {
      aTheory: 'Passage is real; present is special',
      bTheory: 'All times equally real; passage is illusion',
      presentism: 'Only present exists',
      eternalism: 'Past, present, future all exist'
    },

    keyArguments: {
      mctaggart: 'A-series contradictory → time unreal',
      relativity: 'No absolute simultaneity → no objective now',
      experience: 'We experience passage → it is real (or: it merely seems so)'
    },

    cynicAdvice: {
      observation: 'Time is philosophically treacherous',
      recommendation: 'Hold positions with appropriate uncertainty',
      phi: 'φ⁻¹ = 61.8% maximum confidence'
    },

    confidence: PHI_INV,
    timestamp: Date.now()
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '⏰ TIME ENGINE - McTaggart, A-theory, B-theory',
    '═══════════════════════════════════════════════════════════',
    '',
    '── MCTAGGART ──────────────────────────────────────────────',
    '   A-series: Past/Present/Future (dynamic)',
    '   B-series: Earlier/Later (static)',
    '   Argument: A-series contradictory → Time unreal',
    '',
    '── A-THEORY ───────────────────────────────────────────────',
    '   Passage is real; present is special',
    '   Variants: Presentism, Growing Block, Moving Spotlight',
    '',
    '── B-THEORY ───────────────────────────────────────────────',
    '   All times equally real; passage is illusion',
    '   Block Universe / Eternalism',
    '',
    '── STATISTICS ─────────────────────────────────────────────',
    '   Temporal claims: ' + state.temporalClaims.length,
    '   Analyses: ' + state.analyses.length,
    '   Theory comparisons: ' + state.theoryComparisons.length,
    '',
    '═══════════════════════════════════════════════════════════',
    '*sniff* Time is treacherous territory.',
    '═══════════════════════════════════════════════════════════'
  ];

  return lines.join('\n');
}

/**
 * Get statistics
 */
function getStats() {
  return {
    temporalClaims: state.temporalClaims.length,
    analyses: state.analyses.length,
    theoryComparisons: state.theoryComparisons.length
  };
}

module.exports = {
  // Core
  init,
  formatStatus,
  getStats,

  // Analysis
  analyzeTemporalClaim,
  evaluateMcTaggart,
  compareAAndB,
  analyzePassage,
  getTimeSummary,

  // Theory
  MCTAGGART,
  A_THEORY,
  B_THEORY,
  TEMPORAL_PASSAGE,

  // Constants
  PHI,
  PHI_INV
};
