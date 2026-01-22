/**
 * Abduction Tracker - Inference to Best Explanation
 *
 * Philosophy: C.S. Peirce's abduction generates hypotheses to explain
 * surprising facts. Lipton's Inference to Best Explanation (IBE) selects
 * among competing hypotheses based on explanatory virtues.
 *
 * Key concepts:
 * - Abduction: Hypothesis generation from surprising observations
 * - IBE: Inference to the Best Explanation
 * - Loveliness: How well hypothesis explains (understanding)
 * - Likeliness: Probability of hypothesis being true
 * - Explanatory virtues: Simplicity, scope, mechanism, etc.
 *
 * In CYNIC: Generate hypotheses, compare explanations,
 * select best based on virtues, track hypothesis evolution.
 *
 * @module abduction-tracker
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;
const PHI_INV_2 = 0.3819660112501051;
const PHI_INV_3 = 0.2360679774997897;

// Storage
const CYNIC_DIR = path.join(process.env.HOME || '/tmp', '.cynic');
const ABDUCTION_DIR = path.join(CYNIC_DIR, 'abduction');
const STATE_FILE = path.join(ABDUCTION_DIR, 'state.json');
const HISTORY_FILE = path.join(ABDUCTION_DIR, 'history.jsonl');

// Constants
const MAX_HYPOTHESES = Math.round(PHI * 60);      // ~97
const MAX_COMPETITIONS = Math.round(PHI * 30);    // ~49
const SELECTION_THRESHOLD = PHI_INV;              // 0.618

/**
 * Hypothesis status
 */
const HYPOTHESIS_STATUS = {
  candidate: {
    name: 'Candidate',
    description: 'Under consideration',
    symbol: '?',
  },
  promising: {
    name: 'Promising',
    description: 'Shows explanatory potential',
    symbol: '◇',
  },
  leading: {
    name: 'Leading',
    description: 'Currently best explanation',
    symbol: '★',
  },
  confirmed: {
    name: 'Confirmed',
    description: 'Strongly supported by evidence',
    symbol: '●',
  },
  rejected: {
    name: 'Rejected',
    description: 'Ruled out by evidence',
    symbol: '✕',
  },
  superseded: {
    name: 'Superseded',
    description: 'Replaced by better explanation',
    symbol: '←',
  },
};

/**
 * Explanatory virtues for IBE (Lipton's list expanded)
 */
const IBE_VIRTUES = {
  loveliness: {
    name: 'Loveliness',
    description: 'Provides deep understanding',
    weight: PHI_INV,
    liptonCategory: 'understanding',
  },
  likeliness: {
    name: 'Likeliness',
    description: 'Probability of being true',
    weight: PHI_INV_2,
    liptonCategory: 'truth',
  },
  simplicity: {
    name: 'Simplicity',
    description: 'Fewer assumptions, parsimony',
    weight: PHI_INV_2,
    liptonCategory: 'understanding',
  },
  mechanism: {
    name: 'Mechanism',
    description: 'Identifies causal mechanism',
    weight: PHI_INV,
    liptonCategory: 'understanding',
  },
  unification: {
    name: 'Unification',
    description: 'Connects to other phenomena',
    weight: PHI_INV_2,
    liptonCategory: 'understanding',
  },
  precision: {
    name: 'Precision',
    description: 'Makes specific predictions',
    weight: PHI_INV_3,
    liptonCategory: 'truth',
  },
  testability: {
    name: 'Testability',
    description: 'Can be empirically tested',
    weight: PHI_INV_2,
    liptonCategory: 'truth',
  },
  consistency: {
    name: 'Consistency',
    description: 'Fits with background knowledge',
    weight: PHI_INV_2,
    liptonCategory: 'truth',
  },
  novelty: {
    name: 'Novelty',
    description: 'Predicts new phenomena',
    weight: PHI_INV_3,
    liptonCategory: 'understanding',
  },
};

/**
 * Surprise levels (Peirce's trigger for abduction)
 */
const SURPRISE_LEVELS = {
  expected: {
    threshold: 0,
    name: 'Expected',
    description: 'Consistent with expectations',
    abductionTrigger: false,
    symbol: '○',
  },
  mildly_surprising: {
    threshold: PHI_INV_3,
    name: 'Mildly Surprising',
    description: 'Somewhat unexpected',
    abductionTrigger: true,
    symbol: '◔',
  },
  surprising: {
    threshold: PHI_INV_2,
    name: 'Surprising',
    description: 'Clearly unexpected',
    abductionTrigger: true,
    symbol: '◑',
  },
  very_surprising: {
    threshold: PHI_INV,
    name: 'Very Surprising',
    description: 'Highly anomalous',
    abductionTrigger: true,
    symbol: '◕',
  },
  shocking: {
    threshold: PHI_INV + PHI_INV_2,
    name: 'Shocking',
    description: 'Contradicts expectations',
    abductionTrigger: true,
    symbol: '●',
  },
};

// In-memory state
let state = {
  hypotheses: {},      // Generated hypotheses
  observations: [],    // Surprising observations
  competitions: [],    // Hypothesis competitions
  stats: {
    hypothesesGenerated: 0,
    observationsRecorded: 0,
    competitionsRun: 0,
    selectionsFromIBE: 0,
    hypothesesRejected: 0,
  },
};

/**
 * Initialize the abduction tracker
 */
function init() {
  if (!fs.existsSync(ABDUCTION_DIR)) {
    fs.mkdirSync(ABDUCTION_DIR, { recursive: true });
  }

  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      // Start fresh
    }
  }
}

/**
 * Save state to disk
 */
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Log to history
 */
function logHistory(event) {
  const entry = { timestamp: Date.now(), ...event };
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');
}

/**
 * Record a surprising observation (trigger for abduction)
 *
 * @param {string} observation - The surprising fact
 * @param {number} surpriseLevel - How surprising (0-1)
 * @returns {object} Recorded observation
 */
function observe(observation, surpriseLevel = 0.5) {
  const level = getSurpriseLevel(surpriseLevel);

  const record = {
    id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    content: observation,
    surpriseScore: surpriseLevel,
    surpriseLevel: level,
    triggersAbduction: level.abductionTrigger,
    hypotheses: [],  // Will link generated hypotheses
    recordedAt: Date.now(),
  };

  state.observations.push(record);
  state.stats.observationsRecorded++;

  // Keep bounded
  if (state.observations.length > 100) {
    state.observations = state.observations.slice(-80);
  }

  logHistory({
    type: 'observation_recorded',
    id: record.id,
    surprise: surpriseLevel,
    triggersAbduction: record.triggersAbduction,
  });

  saveState();

  return {
    observation: record,
    message: record.triggersAbduction
      ? `${level.symbol} Surprising observation recorded - abduction triggered`
      : `${level.symbol} Observation recorded - within expectations`,
  };
}

/**
 * Get surprise level from score
 */
function getSurpriseLevel(score) {
  for (const [, config] of Object.entries(SURPRISE_LEVELS).reverse()) {
    if (score >= config.threshold) {
      return config;
    }
  }
  return SURPRISE_LEVELS.expected;
}

/**
 * Generate a hypothesis (abduction)
 *
 * @param {string} content - Hypothesis content
 * @param {string} observationId - Observation it explains
 * @param {object} config - Configuration
 * @returns {object} Generated hypothesis
 */
function hypothesize(content, observationId = null, config = {}) {
  if (Object.keys(state.hypotheses).length >= MAX_HYPOTHESES) {
    pruneHypotheses();
  }

  const id = `hyp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const hypothesis = {
    id,
    content,
    explains: observationId,
    domain: config.domain || 'general',
    status: 'candidate',
    statusInfo: HYPOTHESIS_STATUS.candidate,
    // Virtue scores
    virtues: {},
    loveliness: 0,    // Understanding quality
    likeliness: 0,    // Truth probability
    overallScore: 0,
    // Competition tracking
    competitionsEntered: 0,
    competitionsWon: 0,
    // Evidence
    supportingEvidence: [],
    contradictingEvidence: [],
    createdAt: Date.now(),
    lastEvaluated: null,
  };

  state.hypotheses[id] = hypothesis;
  state.stats.hypothesesGenerated++;

  // Link to observation
  if (observationId) {
    const obs = state.observations.find(o => o.id === observationId);
    if (obs) {
      obs.hypotheses.push(id);
    }
  }

  logHistory({
    type: 'hypothesis_generated',
    id,
    content: content.slice(0, 50),
    explains: observationId,
  });

  saveState();

  return hypothesis;
}

/**
 * Prune lowest-scored hypotheses
 */
function pruneHypotheses() {
  const sorted = Object.entries(state.hypotheses)
    .filter(([, h]) => h.status !== 'leading' && h.status !== 'confirmed')
    .sort((a, b) => a[1].overallScore - b[1].overallScore);

  const toRemove = sorted.slice(0, Math.round(MAX_HYPOTHESES * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.hypotheses[id];
  }
}

/**
 * Evaluate a hypothesis on explanatory virtues
 *
 * @param {string} hypothesisId - Hypothesis ID
 * @param {object} virtueScores - Scores for each virtue (0-1)
 * @returns {object} Evaluation result
 */
function evaluateVirtues(hypothesisId, virtueScores) {
  const hypothesis = state.hypotheses[hypothesisId];
  if (!hypothesis) return { error: 'Hypothesis not found' };

  let loveliness = 0;
  let likeliness = 0;
  let totalWeight = 0;
  let overallScore = 0;

  for (const [virtue, score] of Object.entries(virtueScores)) {
    const virtueInfo = IBE_VIRTUES[virtue];
    if (virtueInfo) {
      hypothesis.virtues[virtue] = score;
      overallScore += score * virtueInfo.weight;
      totalWeight += virtueInfo.weight;

      // Separate loveliness and likeliness (Lipton's distinction)
      if (virtueInfo.liptonCategory === 'understanding') {
        loveliness += score * virtueInfo.weight;
      } else {
        likeliness += score * virtueInfo.weight;
      }
    }
  }

  hypothesis.loveliness = loveliness / totalWeight;
  hypothesis.likeliness = likeliness / totalWeight;
  hypothesis.overallScore = totalWeight > 0 ? overallScore / totalWeight : 0;
  hypothesis.lastEvaluated = Date.now();

  // Update status based on score
  if (hypothesis.overallScore >= PHI_INV + PHI_INV_3) {
    hypothesis.status = 'promising';
    hypothesis.statusInfo = HYPOTHESIS_STATUS.promising;
  }

  saveState();

  return {
    hypothesis,
    loveliness: Math.round(hypothesis.loveliness * 100),
    likeliness: Math.round(hypothesis.likeliness * 100),
    overallScore: Math.round(hypothesis.overallScore * 100),
    virtues: hypothesis.virtues,
    message: `Evaluated: Loveliness ${Math.round(hypothesis.loveliness * 100)}% | Likeliness ${Math.round(hypothesis.likeliness * 100)}%`,
  };
}

/**
 * Run Inference to Best Explanation competition
 *
 * @param {array} hypothesisIds - IDs of competing hypotheses
 * @param {string} criterion - Selection criterion ('loveliness', 'likeliness', 'overall')
 * @returns {object} Competition result
 */
function compete(hypothesisIds, criterion = 'overall') {
  if (hypothesisIds.length < 2) {
    return { error: 'Need at least 2 hypotheses to compete' };
  }

  const competitors = hypothesisIds
    .map(id => state.hypotheses[id])
    .filter(Boolean);

  if (competitors.length < 2) {
    return { error: 'Not enough valid hypotheses' };
  }

  // Score based on criterion
  const scored = competitors.map(h => ({
    hypothesis: h,
    score: criterion === 'loveliness' ? h.loveliness :
           criterion === 'likeliness' ? h.likeliness :
           h.overallScore,
  }));

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Record competition
  const competition = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    competitors: hypothesisIds,
    criterion,
    winner: scored[0].hypothesis.id,
    runnerUp: scored.length > 1 ? scored[1].hypothesis.id : null,
    margin: scored.length > 1 ? scored[0].score - scored[1].score : scored[0].score,
    timestamp: Date.now(),
  };

  state.competitions.push(competition);
  if (state.competitions.length > MAX_COMPETITIONS) {
    state.competitions = state.competitions.slice(-Math.round(MAX_COMPETITIONS * PHI_INV));
  }

  state.stats.competitionsRun++;

  // Update hypothesis stats
  for (const h of competitors) {
    h.competitionsEntered++;
    if (h.id === competition.winner) {
      h.competitionsWon++;
      // Promote to leading if significant win
      if (competition.margin >= SELECTION_THRESHOLD * PHI_INV) {
        h.status = 'leading';
        h.statusInfo = HYPOTHESIS_STATUS.leading;
        state.stats.selectionsFromIBE++;
      }
    }
  }

  logHistory({
    type: 'competition_run',
    id: competition.id,
    winner: competition.winner,
    criterion,
    margin: competition.margin,
  });

  saveState();

  const winner = state.hypotheses[competition.winner];

  return {
    competition,
    winner: {
      id: winner.id,
      content: winner.content.slice(0, 50),
      score: Math.round(scored[0].score * 100),
    },
    ranking: scored.map((s, i) => ({
      rank: i + 1,
      id: s.hypothesis.id,
      content: s.hypothesis.content.slice(0, 30),
      score: Math.round(s.score * 100),
    })),
    message: `★ Best explanation: "${winner.content.slice(0, 40)}..." (${criterion}: ${Math.round(scored[0].score * 100)}%)`,
  };
}

/**
 * Add evidence for/against a hypothesis
 *
 * @param {string} hypothesisId - Hypothesis ID
 * @param {string} evidence - Evidence description
 * @param {boolean} supports - Whether evidence supports hypothesis
 * @returns {object} Update result
 */
function addEvidence(hypothesisId, evidence, supports) {
  const hypothesis = state.hypotheses[hypothesisId];
  if (!hypothesis) return { error: 'Hypothesis not found' };

  const record = {
    content: evidence,
    supports,
    addedAt: Date.now(),
  };

  if (supports) {
    hypothesis.supportingEvidence.push(record);
    // Boost likeliness
    hypothesis.likeliness = Math.min(1, hypothesis.likeliness + PHI_INV_3);
  } else {
    hypothesis.contradictingEvidence.push(record);
    // Reduce likeliness
    hypothesis.likeliness = Math.max(0, hypothesis.likeliness - PHI_INV_2);

    // Check for rejection
    if (hypothesis.contradictingEvidence.length >= 3 &&
        hypothesis.contradictingEvidence.length > hypothesis.supportingEvidence.length * 2) {
      hypothesis.status = 'rejected';
      hypothesis.statusInfo = HYPOTHESIS_STATUS.rejected;
      state.stats.hypothesesRejected++;
    }
  }

  // Recalculate overall
  hypothesis.overallScore = (hypothesis.loveliness + hypothesis.likeliness) / 2;

  saveState();

  return {
    hypothesis,
    evidenceType: supports ? 'supporting' : 'contradicting',
    likeliness: Math.round(hypothesis.likeliness * 100),
    status: hypothesis.status,
    message: supports
      ? `+Evidence: "${evidence.slice(0, 40)}..." supports hypothesis`
      : `-Evidence: "${evidence.slice(0, 40)}..." contradicts hypothesis`,
  };
}

/**
 * Get best current hypothesis
 *
 * @returns {object} Leading hypothesis or null
 */
function getBestHypothesis() {
  const leading = Object.values(state.hypotheses)
    .filter(h => h.status === 'leading' || h.status === 'confirmed')
    .sort((a, b) => b.overallScore - a.overallScore);

  if (leading.length === 0) {
    // Fall back to highest scored candidate
    const candidates = Object.values(state.hypotheses)
      .filter(h => h.status !== 'rejected' && h.status !== 'superseded')
      .sort((a, b) => b.overallScore - a.overallScore);

    if (candidates.length === 0) {
      return { found: false, message: 'No active hypotheses' };
    }

    return {
      found: true,
      hypothesis: candidates[0],
      isLeading: false,
      message: `Best candidate: "${candidates[0].content.slice(0, 40)}..." (not yet selected)`,
    };
  }

  return {
    found: true,
    hypothesis: leading[0],
    isLeading: true,
    message: `Leading hypothesis: "${leading[0].content.slice(0, 40)}..."`,
  };
}

/**
 * Get statistics
 */
function getStats() {
  const hypotheses = Object.values(state.hypotheses);
  const activeCount = hypotheses.filter(
    h => h.status !== 'rejected' && h.status !== 'superseded'
  ).length;

  return {
    ...state.stats,
    totalHypotheses: hypotheses.length,
    activeHypotheses: activeCount,
    recentObservations: state.observations.length,
    competitions: state.competitions.length,
    selectionRate: state.stats.competitionsRun > 0
      ? Math.round(state.stats.selectionsFromIBE / state.stats.competitionsRun * 100)
      : 0,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `★ Abduction Tracker (Peirce/Lipton)\n`;
  status += `  Hypotheses: ${stats.totalHypotheses} (${stats.activeHypotheses} active)\n`;
  status += `  Observations: ${stats.recentObservations}\n`;
  status += `  Competitions: ${stats.competitions}\n`;
  status += `  Selection rate: ${stats.selectionRate}%\n`;
  status += `  Rejected: ${stats.hypothesesRejected}\n`;

  return status;
}

module.exports = {
  init,
  observe,
  hypothesize,
  evaluateVirtues,
  compete,
  addEvidence,
  getBestHypothesis,
  getStats,
  formatStatus,
  HYPOTHESIS_STATUS,
  IBE_VIRTUES,
  SURPRISE_LEVELS,
};
