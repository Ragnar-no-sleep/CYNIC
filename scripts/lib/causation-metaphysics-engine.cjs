/**
 * Causation Metaphysics Engine - Hume, Counterfactual
 *
 * "We may define a cause to be an object followed by another."
 * — David Hume
 *
 * Implements:
 * - Hume's regularity theory
 * - Counterfactual theories (Lewis)
 * - Probabilistic causation
 * - Causal powers and dispositions
 *
 * φ guides confidence in causal assessments.
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2%
const PHI_INV_3 = 0.236067977499790;    // 23.6%

// Storage
const STORAGE_DIR = path.join(require('os').homedir(), '.cynic', 'causation-metaphysics');

// Hume's Analysis
const HUME = {
  regularityTheory: {
    name: 'Regularity Theory',
    definition: 'A causes B iff: (1) A precedes B, (2) A and B are contiguous, (3) Events like A are constantly conjoined with events like B',
    components: {
      temporalPriority: 'Cause precedes effect',
      contiguity: 'Cause and effect spatiotemporally connected',
      constantConjunction: 'All events of type A followed by events of type B'
    },
    skepticism: 'We never perceive necessary connection, only constant conjunction',
    quote: 'All events seem entirely loose and separate'
  },
  problemOfInduction: {
    name: 'Problem of Induction',
    description: 'No rational basis for inferring future from past',
    forCausation: 'Past conjunctions do not guarantee future ones',
    humeAnswer: 'Custom and habit, not reason'
  },
  necessaryConnection: {
    name: 'Missing Necessary Connection',
    problem: 'We do not perceive causation, only sequence',
    humeView: 'Necessary connection is projection of mental habit',
    implication: 'Causation may not be in the world but in us'
  }
};

// Counterfactual Theory (Lewis)
const COUNTERFACTUAL = {
  lewisTheory: {
    name: 'Counterfactual Dependence Theory',
    proponent: 'David Lewis',
    definition: 'C causes E iff: if C had not occurred, E would not have occurred',
    formalization: '~C □→ ~E (in closest possible worlds)',
    possibleWorlds: 'Evaluate counterfactuals by considering similar possible worlds',
    advantages: [
      'Handles singular causation',
      'Captures counterfactual reasoning',
      'No need for laws'
    ]
  },
  problems: {
    preemption: {
      name: 'Preemption',
      description: 'Backup cause would have produced effect',
      example: 'Two assassins: one shoots first, but other would have',
      problem: 'Effect still counterfactually depends on backup'
    },
    overdetermination: {
      name: 'Overdetermination',
      description: 'Two independent sufficient causes',
      example: 'Two bullets simultaneously fatal',
      problem: 'Effect does not counterfactually depend on either alone'
    },
    transitivity: {
      name: 'Transitivity Failure',
      description: 'Causal chains that seem to break',
      example: 'Boulder rolls, you duck, survive - boulder caused survival?'
    }
  },
  refinements: {
    influenceTheory: {
      name: 'Influence Theory',
      idea: 'Causation is pattern of counterfactual dependence',
      modification: 'Whether, when, and how effect occurs depends on cause'
    },
    contrastiveCounterfactuals: {
      name: 'Contrastive Causation',
      idea: 'C rather than C* caused E rather than E*'
    }
  }
};

// Probabilistic Causation
const PROBABILISTIC = {
  name: 'Probabilistic Causation',
  thesis: 'Causes raise probability of effects',
  formula: 'C causes E iff P(E|C) > P(E|~C)',
  proponents: ['Suppes', 'Eells', 'Cartwright'],
  advantages: [
    'Handles indeterministic causation',
    'Natural for statistical sciences'
  ],
  problems: {
    spuriousCorrelation: {
      name: 'Spurious Correlation',
      problem: 'Common cause raises probability without causation',
      example: 'Barometer and storm: barometer does not cause storm',
      solution: 'Screening off condition'
    },
    probabilityLowering: {
      name: 'Probability-Lowering Causes',
      problem: 'Some causes lower probability of effect',
      example: 'Birth control pill lowers pregnancy but is still cause if pregnancy occurs'
    }
  },
  screeningOff: {
    name: 'Screening Off',
    definition: 'C causes E only if P(E|C&K) > P(E|~C&K) for relevant background K',
    purpose: 'Rules out spurious correlations via common cause'
  }
};

// Causal Powers / Dispositionalism
const CAUSAL_POWERS = {
  name: 'Causal Powers Theory',
  thesis: 'Causation grounded in powers/dispositions of objects',
  proponents: ['Mumford', 'Anjum', 'Aristotelian tradition'],
  core: {
    powers: 'Objects have intrinsic causal powers',
    manifestation: 'Powers manifest when conditions are right',
    notRegularity: 'Causation is production, not mere regularity'
  },
  advantages: [
    'Explains modal force of causation',
    'Grounds laws in powers',
    'Fits scientific practice'
  ],
  dispositions: {
    fragility: 'Power to break when struck',
    solubility: 'Power to dissolve in water',
    charge: 'Power to attract/repel'
  },
  versusHume: {
    hume: 'No necessary connections in nature',
    powers: 'Necessary connections grounded in powers'
  }
};

// Process Theories
const PROCESS_THEORIES = {
  salmon: {
    name: 'Conserved Quantity Theory',
    proponent: 'Wesley Salmon / Phil Dowe',
    definition: 'Causal process transmits conserved quantity (energy, momentum)',
    advantage: 'Physical criterion for causation',
    problem: 'Negative causation (absences as causes)'
  },
  mechanistic: {
    name: 'Mechanistic Causation',
    proponents: ['Machamer', 'Darden', 'Craver'],
    definition: 'Causation via mechanisms with components and activities',
    advantage: 'Fits biological and cognitive sciences',
    structure: 'Entities with activities organized to produce effect'
  }
};

// State
const state = {
  causalClaims: new Map(),
  analyses: [],
  counterfactualTests: []
};

/**
 * Initialize the causation engine
 */
function init() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const statePath = path.join(STORAGE_DIR, 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (saved.causalClaims) state.causalClaims = new Map(Object.entries(saved.causalClaims));
      if (saved.analyses) state.analyses = saved.analyses;
      if (saved.counterfactualTests) state.counterfactualTests = saved.counterfactualTests;
    } catch {
      // Start fresh
    }
  }

  return { status: 'initialized', claims: state.causalClaims.size };
}

/**
 * Save state
 */
function saveState() {
  const statePath = path.join(STORAGE_DIR, 'state.json');
  const toSave = {
    causalClaims: Object.fromEntries(state.causalClaims),
    analyses: state.analyses,
    counterfactualTests: state.counterfactualTests
  };
  fs.writeFileSync(statePath, JSON.stringify(toSave, null, 2));
}

/**
 * Register a causal claim for analysis
 */
function registerCausalClaim(id, spec = {}) {
  const claim = {
    id,
    cause: spec.cause || null,
    effect: spec.effect || null,
    description: spec.description || id,

    // Evidence
    evidence: {
      constantConjunction: spec.constantConjunction || false,
      temporalPriority: spec.temporalPriority || false,
      contiguity: spec.contiguity || false,
      counterfactual: spec.counterfactual || null,
      probabilityRaising: spec.probabilityRaising || null,
      mechanism: spec.mechanism || null
    },

    // Analysis results
    analyses: {},

    createdAt: Date.now()
  };

  state.causalClaims.set(id, claim);
  saveState();

  return claim;
}

/**
 * Apply Humean analysis
 */
function analyzeHumean(claimId) {
  const claim = state.causalClaims.get(claimId);
  if (!claim) {
    return { error: 'Claim not found' };
  }

  const analysis = {
    claimId,
    theory: 'Humean Regularity Theory',

    // Hume's three conditions
    conditions: {
      temporalPriority: {
        name: 'Temporal Priority',
        question: 'Does cause precede effect?',
        satisfied: claim.evidence.temporalPriority,
        humeRequirement: 'The cause must be prior to the effect'
      },
      contiguity: {
        name: 'Contiguity',
        question: 'Are cause and effect spatiotemporally connected?',
        satisfied: claim.evidence.contiguity,
        humeRequirement: 'Cause and effect must be contiguous'
      },
      constantConjunction: {
        name: 'Constant Conjunction',
        question: 'Are events of these types regularly conjoined?',
        satisfied: claim.evidence.constantConjunction,
        humeRequirement: 'Events of type C always followed by events of type E'
      }
    },

    // Overall
    allConditionsMet: null,
    humeanVerdict: null,
    humeanCaveat: HUME.necessaryConnection.humeView,

    confidence: PHI_INV_2,
    timestamp: Date.now()
  };

  analysis.allConditionsMet =
    analysis.conditions.temporalPriority.satisfied &&
    analysis.conditions.contiguity.satisfied &&
    analysis.conditions.constantConjunction.satisfied;

  if (analysis.allConditionsMet) {
    analysis.humeanVerdict = 'CAUSAL (Humean) - all three conditions satisfied';
  } else {
    const missing = [];
    if (!analysis.conditions.temporalPriority.satisfied) missing.push('temporal priority');
    if (!analysis.conditions.contiguity.satisfied) missing.push('contiguity');
    if (!analysis.conditions.constantConjunction.satisfied) missing.push('constant conjunction');
    analysis.humeanVerdict = 'NOT CAUSAL (Humean) - missing: ' + missing.join(', ');
  }

  claim.analyses.humean = analysis;
  state.analyses.push(analysis);
  saveState();

  return analysis;
}

/**
 * Apply counterfactual analysis (Lewis)
 */
function analyzeCounterfactual(claimId, spec = {}) {
  const claim = state.causalClaims.get(claimId);
  if (!claim) {
    return { error: 'Claim not found' };
  }

  const analysis = {
    claimId,
    theory: 'Counterfactual Theory (Lewis)',

    // Counterfactual test
    counterfactualTest: {
      question: 'If cause had not occurred, would effect have occurred?',
      antecedent: '~' + claim.cause,
      consequent: '~' + claim.effect,
      evaluation: spec.counterfactualHolds || claim.evidence.counterfactual,
      closestWorlds: spec.closestWorlds || 'worlds where cause absent'
    },

    // Potential problems
    problemCheck: {
      preemption: {
        question: 'Was there a backup cause?',
        present: spec.backupCause || false,
        problem: spec.backupCause ? 'Preemption case - counterfactual may fail' : null
      },
      overdetermination: {
        question: 'Were there multiple sufficient causes?',
        present: spec.multipleCauses || false,
        problem: spec.multipleCauses ? 'Overdetermination - counterfactual fails' : null
      }
    },

    // Verdict
    counterfactualDependence: null,
    lewisVerdict: null,

    confidence: PHI_INV_2,
    timestamp: Date.now()
  };

  // Evaluate counterfactual
  if (analysis.counterfactualTest.evaluation === true) {
    analysis.counterfactualDependence = true;

    if (analysis.problemCheck.preemption.present || analysis.problemCheck.overdetermination.present) {
      analysis.lewisVerdict = 'CAUSAL but problematic case (preemption/overdetermination)';
    } else {
      analysis.lewisVerdict = 'CAUSAL (counterfactual dependence holds)';
    }
  } else if (analysis.counterfactualTest.evaluation === false) {
    analysis.counterfactualDependence = false;
    analysis.lewisVerdict = 'NOT CAUSAL (no counterfactual dependence)';
  } else {
    analysis.counterfactualDependence = 'unknown';
    analysis.lewisVerdict = 'INDETERMINATE (counterfactual uncertain)';
  }

  claim.analyses.counterfactual = analysis;
  state.counterfactualTests.push(analysis);
  saveState();

  return analysis;
}

/**
 * Apply probabilistic analysis
 */
function analyzeProbabilistic(claimId, spec = {}) {
  const claim = state.causalClaims.get(claimId);
  if (!claim) {
    return { error: 'Claim not found' };
  }

  const analysis = {
    claimId,
    theory: 'Probabilistic Causation',

    // Probability comparison
    probabilities: {
      pEffectGivenCause: spec.pEffectGivenCause || null,
      pEffectGivenNoCause: spec.pEffectGivenNoCause || null,
      difference: null,
      raisesProb: null
    },

    // Screening off test
    screeningOff: {
      commonCauseChecked: spec.commonCauseChecked || false,
      stillRaisesWhenControlled: spec.stillRaisesWhenControlled || null,
      spurious: null
    },

    // Verdict
    probabilisticVerdict: null,

    confidence: PHI_INV_2,
    timestamp: Date.now()
  };

  // Calculate if probability raising
  if (analysis.probabilities.pEffectGivenCause !== null &&
      analysis.probabilities.pEffectGivenNoCause !== null) {
    analysis.probabilities.difference =
      analysis.probabilities.pEffectGivenCause - analysis.probabilities.pEffectGivenNoCause;
    analysis.probabilities.raisesProb = analysis.probabilities.difference > 0;
  }

  // Screening off
  if (analysis.screeningOff.commonCauseChecked) {
    analysis.screeningOff.spurious = !analysis.screeningOff.stillRaisesWhenControlled;
  }

  // Verdict
  if (analysis.probabilities.raisesProb === true) {
    if (analysis.screeningOff.spurious === true) {
      analysis.probabilisticVerdict = 'SPURIOUS (screened off by common cause)';
    } else if (analysis.screeningOff.spurious === false) {
      analysis.probabilisticVerdict = 'CAUSAL (probability raising survives screening)';
    } else {
      analysis.probabilisticVerdict = 'POSSIBLY CAUSAL (raises probability, screening unknown)';
    }
  } else if (analysis.probabilities.raisesProb === false) {
    analysis.probabilisticVerdict = 'NOT CAUSAL (does not raise probability)';
  } else {
    analysis.probabilisticVerdict = 'INDETERMINATE (probabilities unknown)';
  }

  claim.analyses.probabilistic = analysis;
  state.analyses.push(analysis);
  saveState();

  return analysis;
}

/**
 * Compare causation theories
 */
function compareTheories() {
  return {
    comparison: 'Theories of Causation',

    humean: {
      name: HUME.regularityTheory.name,
      core: 'Constant conjunction',
      strength: 'Empiricist, no hidden powers',
      weakness: 'Cannot distinguish correlation from causation'
    },

    counterfactual: {
      name: COUNTERFACTUAL.lewisTheory.name,
      core: 'Would effect occur without cause?',
      strength: 'Handles singular causation',
      weakness: 'Preemption, overdetermination'
    },

    probabilistic: {
      name: PROBABILISTIC.name,
      core: 'Causes raise probability',
      strength: 'Fits indeterministic world',
      weakness: 'Spurious correlation, probability-lowering causes'
    },

    powers: {
      name: CAUSAL_POWERS.name,
      core: 'Intrinsic causal powers',
      strength: 'Explains modal force',
      weakness: 'Metaphysically heavy'
    },

    process: {
      name: PROCESS_THEORIES.salmon.name,
      core: 'Transmission of conserved quantities',
      strength: 'Physical criterion',
      weakness: 'Negative causation (absences)'
    },

    cynicSynthesis: {
      observation: 'Each captures something about causation',
      recommendation: 'Use multiple tests, trust none absolutely',
      phi: 'Maximum confidence φ⁻¹ = 61.8%'
    },

    confidence: PHI_INV,
    timestamp: Date.now()
  };
}

/**
 * Full causal analysis using all frameworks
 */
function fullAnalysis(claimId, spec = {}) {
  const claim = state.causalClaims.get(claimId);
  if (!claim) {
    return { error: 'Claim not found' };
  }

  // Run all analyses
  const humean = analyzeHumean(claimId);
  const counterfactual = analyzeCounterfactual(claimId, spec);

  const fullResult = {
    claimId,
    claim: claim.cause + ' causes ' + claim.effect,

    // Results
    humean: humean.humeanVerdict,
    counterfactual: counterfactual.lewisVerdict,

    // Synthesis
    theoriesAgree: null,
    consensus: null,
    conflicts: [],

    // Overall verdict
    overallVerdict: null,

    confidence: PHI_INV_3,
    timestamp: Date.now()
  };

  // Check agreement
  const humeanSays = humean.allConditionsMet;
  const counterfactualSays = counterfactual.counterfactualDependence === true;

  if (humeanSays && counterfactualSays) {
    fullResult.theoriesAgree = true;
    fullResult.consensus = 'CAUSAL (both theories agree)';
    fullResult.overallVerdict = 'STRONG CAUSAL CLAIM';
    fullResult.confidence = PHI_INV_2;
  } else if (!humeanSays && !counterfactualSays) {
    fullResult.theoriesAgree = true;
    fullResult.consensus = 'NOT CAUSAL (both theories agree)';
    fullResult.overallVerdict = 'NOT CAUSAL';
    fullResult.confidence = PHI_INV_2;
  } else {
    fullResult.theoriesAgree = false;
    fullResult.conflicts.push(humeanSays ? 'Humean: yes, Counterfactual: no' : 'Humean: no, Counterfactual: yes');
    fullResult.overallVerdict = 'CONTESTED - theories disagree';
    fullResult.confidence = PHI_INV_3;
  }

  return fullResult;
}

/**
 * Format status for display
 */
function formatStatus() {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '⚡ CAUSATION ENGINE - Hume, Lewis, Powers',
    '═══════════════════════════════════════════════════════════',
    '',
    '── HUME ───────────────────────────────────────────────────',
    '   Regularity: Temporal priority + Contiguity + Constant conjunction',
    '   Skepticism: No perceived necessary connection',
    '',
    '── LEWIS (Counterfactual) ─────────────────────────────────',
    '   If C had not occurred, would E have occurred?',
    '   Problems: Preemption, Overdetermination',
    '',
    '── PROBABILISTIC ──────────────────────────────────────────',
    '   P(E|C) > P(E|~C)? Watch for spurious correlation',
    '',
    '── POWERS ─────────────────────────────────────────────────',
    '   Intrinsic causal powers of objects',
    '',
    '── STATISTICS ─────────────────────────────────────────────',
    '   Causal claims: ' + state.causalClaims.size,
    '   Analyses: ' + state.analyses.length,
    '   Counterfactual tests: ' + state.counterfactualTests.length,
    '',
    '═══════════════════════════════════════════════════════════',
    '*sniff* Constant conjunction or necessary connection?',
    '═══════════════════════════════════════════════════════════'
  ];

  return lines.join('\n');
}

/**
 * Get statistics
 */
function getStats() {
  return {
    claims: state.causalClaims.size,
    analyses: state.analyses.length,
    counterfactualTests: state.counterfactualTests.length
  };
}

module.exports = {
  // Core
  init,
  formatStatus,
  getStats,

  // Claims
  registerCausalClaim,

  // Analyses
  analyzeHumean,
  analyzeCounterfactual,
  analyzeProbabilistic,
  fullAnalysis,

  // Comparison
  compareTheories,

  // Theory
  HUME,
  COUNTERFACTUAL,
  PROBABILISTIC,
  CAUSAL_POWERS,
  PROCESS_THEORIES,

  // Constants
  PHI,
  PHI_INV
};
