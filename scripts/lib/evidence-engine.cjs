/**
 * CYNIC Evidence Engine
 *
 * "Bayesian reasoning and confirmation theory"
 *
 * Philosophical foundations:
 * - Bayes: Prior/posterior probability
 * - Carnap: Confirmation functions
 * - Hempel: Hypothetico-deductive confirmation
 * - Howson & Urbach: Bayesian epistemology
 *
 * φ guides all ratios: 61.8% confidence max
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─────────────────────────────────────────────────────────────
// φ CONSTANTS
// ─────────────────────────────────────────────────────────────

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2% - uncertainty threshold
const PHI_INV_3 = 0.236067977499790;    // 23.6% - minimum threshold

// ─────────────────────────────────────────────────────────────
// EVIDENCE TYPES
// ─────────────────────────────────────────────────────────────

const EVIDENCE_TYPES = {
  direct: {
    name: 'Direct Evidence',
    description: 'Directly tests hypothesis',
    weight: PHI_INV
  },
  indirect: {
    name: 'Indirect Evidence',
    description: 'Bears on hypothesis through auxiliary assumptions',
    weight: PHI_INV_2
  },
  circumstantial: {
    name: 'Circumstantial Evidence',
    description: 'Supports through inference',
    weight: PHI_INV_2
  },
  testimonial: {
    name: 'Testimonial Evidence',
    description: 'Based on testimony/reports',
    weight: PHI_INV_3
  },
  statistical: {
    name: 'Statistical Evidence',
    description: 'Probabilistic/aggregate data',
    weight: PHI_INV
  },
  analogical: {
    name: 'Analogical Evidence',
    description: 'Based on similar cases',
    weight: PHI_INV_3
  }
};

// ─────────────────────────────────────────────────────────────
// CONFIRMATION RELATIONS (Hempel)
// ─────────────────────────────────────────────────────────────

const CONFIRMATION_RELATIONS = {
  confirms: {
    name: 'Confirms',
    description: 'Evidence raises probability of hypothesis',
    direction: 1
  },
  disconfirms: {
    name: 'Disconfirms',
    description: 'Evidence lowers probability of hypothesis',
    direction: -1
  },
  neutral: {
    name: 'Neutral',
    description: 'Evidence does not affect probability',
    direction: 0
  }
};

// ─────────────────────────────────────────────────────────────
// LIKELIHOOD RATIOS
// ─────────────────────────────────────────────────────────────

const LIKELIHOOD_STRENGTH = {
  decisive: {
    name: 'Decisive',
    ratio: 100,      // >100:1
    description: 'Overwhelming evidence'
  },
  strong: {
    name: 'Strong',
    ratio: 10,       // 10:1 to 100:1
    description: 'Strong evidence'
  },
  moderate: {
    name: 'Moderate',
    ratio: PHI,      // φ:1 to 10:1
    description: 'Moderate evidence'
  },
  weak: {
    name: 'Weak',
    ratio: 1.1,      // 1.1:1 to φ:1
    description: 'Weak evidence'
  },
  negligible: {
    name: 'Negligible',
    ratio: 1,        // ~1:1
    description: 'No evidential value'
  }
};

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────

const state = {
  hypotheses: new Map(),        // Tracked hypotheses
  evidence: [],                 // Evidence records
  updates: [],                  // Bayesian updates
  confirmations: [],            // Confirmation assessments
  likelihoods: new Map(),       // Stored likelihoods
  stats: {
    hypothesesTracked: 0,
    evidenceRecorded: 0,
    updatesPerformed: 0,
    confirmationsAssessed: 0
  }
};

// Storage
const STORAGE_DIR = path.join(os.homedir(), '.cynic', 'evidence-engine');
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

// ─────────────────────────────────────────────────────────────
// CORE BAYESIAN FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Register a hypothesis for tracking
 */
function registerHypothesis(id, spec) {
  const hypothesis = {
    id,
    description: spec.description || id,
    domain: spec.domain || 'general',

    // Prior probability
    prior: Math.min(spec.prior || PHI_INV_2, PHI_INV),

    // Current probability (will be updated)
    posterior: Math.min(spec.prior || PHI_INV_2, PHI_INV),

    // Update history
    updates: [],

    // Evidence collected
    evidence: [],

    // Competitors (alternative hypotheses)
    competitors: spec.competitors || [],

    created: Date.now()
  };

  state.hypotheses.set(id, hypothesis);
  state.stats.hypothesesTracked++;

  appendHistory({
    type: 'hypothesis_registered',
    hypothesisId: id,
    prior: hypothesis.prior,
    timestamp: Date.now()
  });

  return hypothesis;
}

/**
 * Record evidence
 */
function recordEvidence(evidenceSpec) {
  const evidence = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: evidenceSpec.description,
    type: evidenceSpec.type || 'direct',
    typeInfo: EVIDENCE_TYPES[evidenceSpec.type || 'direct'],

    // Reliability/quality of evidence
    reliability: Math.min(evidenceSpec.reliability || PHI_INV_2, PHI_INV),

    // Raw data or observation
    observation: evidenceSpec.observation,

    // Source
    source: evidenceSpec.source || 'unspecified',

    timestamp: Date.now()
  };

  state.evidence.push(evidence);
  state.stats.evidenceRecorded++;

  appendHistory({
    type: 'evidence_recorded',
    evidence,
    timestamp: Date.now()
  });

  return evidence;
}

/**
 * Calculate Bayes factor (likelihood ratio)
 *
 * BF = P(E|H) / P(E|¬H)
 *
 * @param {number} likelihoodH - P(E|H): probability of evidence given hypothesis
 * @param {number} likelihoodNotH - P(E|¬H): probability of evidence given not-hypothesis
 * @returns {object} Bayes factor analysis
 */
function calculateBayesFactor(likelihoodH, likelihoodNotH) {
  // Avoid division by zero
  if (likelihoodNotH === 0) {
    return {
      factor: Infinity,
      strength: 'decisive',
      interpretation: 'Evidence impossible without hypothesis',
      confidence: PHI_INV_3 // Low confidence in extreme cases
    };
  }

  const factor = likelihoodH / likelihoodNotH;

  // Determine strength
  let strength = 'negligible';
  if (factor >= 100) strength = 'decisive';
  else if (factor >= 10) strength = 'strong';
  else if (factor >= PHI) strength = 'moderate';
  else if (factor >= 1.1) strength = 'weak';

  // For disconfirming evidence (factor < 1)
  if (factor < 1) {
    const inverseFactor = 1 / factor;
    if (inverseFactor >= 100) strength = 'decisive (against)';
    else if (inverseFactor >= 10) strength = 'strong (against)';
    else if (inverseFactor >= PHI) strength = 'moderate (against)';
    else if (inverseFactor >= 1.1) strength = 'weak (against)';
  }

  return {
    factor,
    strength,
    strengthInfo: LIKELIHOOD_STRENGTH[strength.split(' ')[0]] || LIKELIHOOD_STRENGTH.negligible,
    interpretation: factor >= 1
      ? `Evidence ${factor.toFixed(2)}x more likely under hypothesis`
      : `Evidence ${(1/factor).toFixed(2)}x more likely without hypothesis`,
    confidence: Math.min(
      factor >= 1 ? Math.log10(factor) / 2 : Math.log10(1/factor) / 2,
      PHI_INV
    )
  };
}

/**
 * Perform Bayesian update
 *
 * P(H|E) = P(E|H) * P(H) / P(E)
 *
 * Using odds form: posterior_odds = BF * prior_odds
 *
 * @param {string} hypothesisId - Hypothesis to update
 * @param {string} evidenceId - Evidence to condition on
 * @param {number} likelihoodH - P(E|H)
 * @param {number} likelihoodNotH - P(E|¬H)
 */
function bayesianUpdate(hypothesisId, evidenceId, likelihoodH, likelihoodNotH) {
  const hypothesis = state.hypotheses.get(hypothesisId);
  const evidence = state.evidence.find(e => e.id === evidenceId);

  if (!hypothesis) return null;

  const prior = hypothesis.posterior; // Use current posterior as new prior
  const bf = calculateBayesFactor(likelihoodH, likelihoodNotH);

  // Convert to odds, apply Bayes factor, convert back
  const priorOdds = prior / (1 - prior);
  const posteriorOdds = priorOdds * bf.factor;
  let posterior = posteriorOdds / (1 + posteriorOdds);

  // Cap at φ⁻¹ (61.8%)
  posterior = Math.min(Math.max(posterior, PHI_INV_3), PHI_INV);

  const update = {
    id: `upd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    hypothesisId,
    evidenceId,

    prior,
    posterior,
    change: posterior - prior,

    bayesFactor: bf.factor,
    likelihoodH,
    likelihoodNotH,

    strength: bf.strength,
    relation: bf.factor > 1 ? 'confirms' : bf.factor < 1 ? 'disconfirms' : 'neutral',

    timestamp: Date.now()
  };

  // Update hypothesis
  hypothesis.posterior = posterior;
  hypothesis.updates.push(update);
  if (evidence) {
    hypothesis.evidence.push(evidenceId);
  }

  state.updates.push(update);
  state.stats.updatesPerformed++;

  appendHistory({
    type: 'bayesian_update',
    update,
    timestamp: Date.now()
  });

  return update;
}

/**
 * Calculate P(E) - probability of evidence
 * Using law of total probability:
 * P(E) = P(E|H)P(H) + P(E|¬H)P(¬H)
 */
function calculateEvidenceProbability(hypothesisId, likelihoodH, likelihoodNotH) {
  const hypothesis = state.hypotheses.get(hypothesisId);
  if (!hypothesis) return null;

  const pH = hypothesis.posterior;
  const pNotH = 1 - pH;

  const pE = (likelihoodH * pH) + (likelihoodNotH * pNotH);

  return {
    probability: pE,
    components: {
      'P(E|H)P(H)': likelihoodH * pH,
      'P(E|¬H)P(¬H)': likelihoodNotH * pNotH
    },
    interpretation: pE > PHI_INV
      ? 'Evidence was expected'
      : pE < PHI_INV_2
        ? 'Evidence was surprising'
        : 'Evidence was moderately expected'
  };
}

/**
 * Assess confirmation (Hempel-style)
 */
function assessConfirmation(hypothesisId, evidenceId, likelihoodH, likelihoodNotH) {
  const hypothesis = state.hypotheses.get(hypothesisId);
  const evidence = state.evidence.find(e => e.id === evidenceId);

  if (!hypothesis) return null;

  const bf = calculateBayesFactor(likelihoodH, likelihoodNotH);

  let relation = 'neutral';
  if (bf.factor > 1) relation = 'confirms';
  if (bf.factor < 1) relation = 'disconfirms';

  const confirmation = {
    id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    hypothesisId,
    evidenceId,

    relation,
    relationInfo: CONFIRMATION_RELATIONS[relation],

    degree: Math.abs(Math.log10(bf.factor)) / 2, // Degree of confirmation
    bayesFactor: bf,

    // Qualitative assessment
    assessment: bf.strength,

    timestamp: Date.now()
  };

  state.confirmations.push(confirmation);
  state.stats.confirmationsAssessed++;

  appendHistory({
    type: 'confirmation_assessed',
    confirmation,
    timestamp: Date.now()
  });

  return confirmation;
}

/**
 * Calculate expected value of information
 * How much would we learn from getting this evidence?
 */
function expectedInformationValue(hypothesisId, possibleOutcomes) {
  const hypothesis = state.hypotheses.get(hypothesisId);
  if (!hypothesis) return null;

  const prior = hypothesis.posterior;
  let expectedChange = 0;

  for (const outcome of possibleOutcomes) {
    const { probability, likelihoodH, likelihoodNotH } = outcome;

    // What would posterior be given this outcome?
    const bf = calculateBayesFactor(likelihoodH, likelihoodNotH);
    const priorOdds = prior / (1 - prior);
    const posteriorOdds = priorOdds * bf.factor;
    const posterior = Math.min(posteriorOdds / (1 + posteriorOdds), PHI_INV);

    // Weight by probability of this outcome
    expectedChange += probability * Math.abs(posterior - prior);
  }

  return {
    hypothesisId,
    expectedChange,
    informationValue: expectedChange / PHI_INV, // Normalized
    worth: expectedChange > PHI_INV_3
      ? 'Worth investigating'
      : 'Low information value',
    confidence: PHI_INV_2
  };
}

/**
 * Compare hypotheses given evidence
 */
function compareHypotheses(h1Id, h2Id, evidenceId, l1H, l1NotH, l2H, l2NotH) {
  const h1 = state.hypotheses.get(h1Id);
  const h2 = state.hypotheses.get(h2Id);

  if (!h1 || !h2) return null;

  // Bayes factors for each
  const bf1 = calculateBayesFactor(l1H, l1NotH);
  const bf2 = calculateBayesFactor(l2H, l2NotH);

  // Compare: which hypothesis better explains evidence?
  const ratio = bf1.factor / bf2.factor;

  let winner = null;
  let confidence = PHI_INV_3;

  if (ratio > PHI) {
    winner = h1Id;
    confidence = Math.min(Math.log10(ratio) * PHI_INV_2, PHI_INV);
  } else if (ratio < 1/PHI) {
    winner = h2Id;
    confidence = Math.min(Math.log10(1/ratio) * PHI_INV_2, PHI_INV);
  }

  return {
    hypotheses: [h1Id, h2Id],
    evidenceId,
    bayesFactors: {
      [h1Id]: bf1.factor,
      [h2Id]: bf2.factor
    },
    ratio,
    winner,
    interpretation: winner
      ? `${winner} better explains evidence by factor of ${Math.max(ratio, 1/ratio).toFixed(2)}`
      : 'Neither hypothesis clearly favored',
    confidence
  };
}

/**
 * Weight evidence by reliability and type
 */
function weightEvidence(evidenceId) {
  const evidence = state.evidence.find(e => e.id === evidenceId);
  if (!evidence) return null;

  const typeWeight = evidence.typeInfo?.weight || PHI_INV_2;
  const reliability = evidence.reliability;

  const effectiveWeight = typeWeight * reliability;

  return {
    evidenceId,
    typeWeight,
    reliability,
    effectiveWeight,
    interpretation: effectiveWeight >= PHI_INV_2
      ? 'High-quality evidence'
      : effectiveWeight >= PHI_INV_3
        ? 'Moderate-quality evidence'
        : 'Low-quality evidence'
  };
}

/**
 * Calculate cumulative evidence for hypothesis
 */
function cumulativeEvidence(hypothesisId) {
  const hypothesis = state.hypotheses.get(hypothesisId);
  if (!hypothesis) return null;

  const updates = hypothesis.updates;

  if (updates.length === 0) {
    return {
      hypothesisId,
      prior: hypothesis.prior,
      posterior: hypothesis.posterior,
      totalEvidence: 0,
      cumulativeBayesFactor: 1,
      verdict: 'No evidence accumulated'
    };
  }

  // Cumulative Bayes factor is product of individual BFs
  const cumulativeBF = updates.reduce((acc, u) => acc * u.bayesFactor, 1);

  const confirming = updates.filter(u => u.relation === 'confirms').length;
  const disconfirming = updates.filter(u => u.relation === 'disconfirms').length;

  return {
    hypothesisId,
    prior: hypothesis.prior,
    posterior: hypothesis.posterior,
    totalEvidence: updates.length,
    confirmingPieces: confirming,
    disconfirmingPieces: disconfirming,
    cumulativeBayesFactor: cumulativeBF,
    totalChange: hypothesis.posterior - hypothesis.prior,
    verdict: hypothesis.posterior > hypothesis.prior
      ? `Hypothesis strengthened (${((hypothesis.posterior - hypothesis.prior) * 100).toFixed(1)}% increase)`
      : hypothesis.posterior < hypothesis.prior
        ? `Hypothesis weakened (${((hypothesis.prior - hypothesis.posterior) * 100).toFixed(1)}% decrease)`
        : 'Hypothesis unchanged',
    confidence: PHI_INV
  };
}

// ─────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function saveState() {
  ensureStorageDir();

  const serializable = {
    hypotheses: Array.from(state.hypotheses.entries()),
    evidence: state.evidence.slice(-100),
    updates: state.updates.slice(-100),
    confirmations: state.confirmations.slice(-50),
    likelihoods: Array.from(state.likelihoods.entries()),
    stats: state.stats
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(serializable, null, 2));
}

function loadState() {
  ensureStorageDir();

  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state.hypotheses = new Map(data.hypotheses || []);
      state.evidence = data.evidence || [];
      state.updates = data.updates || [];
      state.confirmations = data.confirmations || [];
      state.likelihoods = new Map(data.likelihoods || []);
      state.stats = data.stats || state.stats;
    } catch (e) {
      console.error('Failed to load evidence engine state:', e.message);
    }
  }
}

function appendHistory(entry) {
  ensureStorageDir();
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');
}

// ─────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────

function formatStatus() {
  const lines = [
    '── EVIDENCE ENGINE ────────────────────────────────────────',
    ''
  ];

  lines.push(`   Hypotheses: ${state.hypotheses.size} | Evidence: ${state.stats.evidenceRecorded}`);
  lines.push(`   Updates: ${state.stats.updatesPerformed} | Confirmations: ${state.stats.confirmationsAssessed}`);
  lines.push('');

  // Top hypotheses by posterior
  if (state.hypotheses.size > 0) {
    lines.push('   Hypotheses:');
    const sorted = Array.from(state.hypotheses.values())
      .sort((a, b) => b.posterior - a.posterior)
      .slice(0, 3);

    for (const h of sorted) {
      const change = h.posterior - h.prior;
      const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
      lines.push(`   └─ ${h.id}: ${(h.posterior * 100).toFixed(1)}% ${arrow}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function getStats() {
  return {
    ...state.stats,
    hypothesesCount: state.hypotheses.size,
    evidenceCount: state.evidence.length,
    recentUpdates: state.updates.slice(-5)
  };
}

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

function init() {
  loadState();

  // Auto-save periodically
  setInterval(() => saveState(), 60000);

  return {
    initialized: true,
    hypotheses: state.hypotheses.size
  };
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3,

  // Type definitions
  EVIDENCE_TYPES,
  CONFIRMATION_RELATIONS,
  LIKELIHOOD_STRENGTH,

  // Core functions
  registerHypothesis,
  recordEvidence,
  calculateBayesFactor,
  bayesianUpdate,
  calculateEvidenceProbability,
  assessConfirmation,
  expectedInformationValue,
  compareHypotheses,
  weightEvidence,
  cumulativeEvidence,

  // State access
  getHypothesis: (id) => state.hypotheses.get(id),
  getEvidence: () => [...state.evidence],
  getUpdates: (hId) => state.updates.filter(u => u.hypothesisId === hId),

  // Persistence
  saveState,
  loadState,

  // Formatting
  formatStatus,
  getStats,
  init
};
