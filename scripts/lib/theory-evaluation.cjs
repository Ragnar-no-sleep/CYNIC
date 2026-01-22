/**
 * CYNIC Theory Evaluation Engine
 *
 * "Falsifiability and theoretical virtues"
 *
 * Philosophical foundations:
 * - Popper: Falsificationism, conjectures and refutations
 * - Kuhn: Paradigms, anomalies, puzzle-solving
 * - Lakatos: Research programmes, progressive/degenerating
 * - Quine: Holism, underdetermination
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
// THEORETICAL VIRTUES (Kuhn's criteria)
// ─────────────────────────────────────────────────────────────

const THEORETICAL_VIRTUES = {
  accuracy: {
    name: 'Accuracy',
    description: 'Agreement with observations and experiments',
    weight: PHI_INV,
    popperian: true,
    kuhnian: true
  },
  consistency: {
    name: 'Consistency',
    description: 'Internal and external coherence',
    weight: PHI_INV,
    popperian: true,
    kuhnian: true
  },
  scope: {
    name: 'Scope',
    description: 'Range of phenomena explained',
    weight: PHI_INV_2,
    popperian: true,
    kuhnian: true
  },
  simplicity: {
    name: 'Simplicity',
    description: 'Parsimony, Occam\'s razor',
    weight: PHI_INV_2,
    popperian: true,
    kuhnian: true
  },
  fruitfulness: {
    name: 'Fruitfulness',
    description: 'Generates new predictions and research',
    weight: PHI_INV_2,
    popperian: true,
    kuhnian: true
  },
  falsifiability: {
    name: 'Falsifiability',
    description: 'Makes risky, testable predictions',
    weight: PHI_INV + PHI_INV_3,
    popperian: true,
    kuhnian: false
  },
  unification: {
    name: 'Unification',
    description: 'Integrates disparate phenomena',
    weight: PHI_INV_2,
    popperian: false,
    kuhnian: true
  },
  novelty: {
    name: 'Novel Predictions',
    description: 'Predicts previously unknown phenomena',
    weight: PHI_INV,
    popperian: true,
    kuhnian: false
  }
};

// ─────────────────────────────────────────────────────────────
// THEORY STATUS (Popper/Lakatos)
// ─────────────────────────────────────────────────────────────

const THEORY_STATUS = {
  corroborated: {
    name: 'Corroborated',
    description: 'Survived severe tests',
    symbol: '✓',
    score: PHI_INV
  },
  falsified: {
    name: 'Falsified',
    description: 'Failed critical test',
    symbol: '✗',
    score: PHI_INV_3
  },
  unfalsifiable: {
    name: 'Unfalsifiable',
    description: 'Not scientifically testable',
    symbol: '?',
    score: 0
  },
  ad_hoc: {
    name: 'Ad Hoc',
    description: 'Modified to avoid falsification',
    symbol: '~',
    score: PHI_INV_3
  },
  progressive: {
    name: 'Progressive',
    description: 'Making novel predictions',
    symbol: '↑',
    score: PHI_INV
  },
  degenerating: {
    name: 'Degenerating',
    description: 'Only explaining past anomalies',
    symbol: '↓',
    score: PHI_INV_2
  }
};

// ─────────────────────────────────────────────────────────────
// ANOMALY TYPES
// ─────────────────────────────────────────────────────────────

const ANOMALY_TYPES = {
  minor: {
    name: 'Minor Anomaly',
    description: 'Small deviation, potentially resolvable',
    severity: PHI_INV_3,
    threatLevel: 'low'
  },
  persistent: {
    name: 'Persistent Anomaly',
    description: 'Resists explanation within framework',
    severity: PHI_INV_2,
    threatLevel: 'medium'
  },
  crisis: {
    name: 'Crisis Anomaly',
    description: 'Threatens core assumptions',
    severity: PHI_INV,
    threatLevel: 'high'
  },
  revolutionary: {
    name: 'Revolutionary Anomaly',
    description: 'Requires paradigm change',
    severity: PHI_INV + PHI_INV_3,
    threatLevel: 'critical'
  }
};

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────

const state = {
  theories: new Map(),          // Registered theories
  tests: [],                    // Test results
  anomalies: [],                // Recorded anomalies
  comparisons: [],              // Theory comparisons
  predictions: new Map(),       // Theory predictions
  stats: {
    theoriesRegistered: 0,
    testsRecorded: 0,
    anomaliesFound: 0,
    comparisonsPerformed: 0,
    falsifications: 0,
    corroborations: 0
  }
};

// Storage
const STORAGE_DIR = path.join(os.homedir(), '.cynic', 'theory-evaluation');
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

// ─────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Register a theory for evaluation
 */
function registerTheory(id, spec) {
  const theory = {
    id,
    name: spec.name || id,
    domain: spec.domain || 'general',

    // Core content
    coreAssumptions: spec.coreAssumptions || [],
    auxiliaryHypotheses: spec.auxiliaryHypotheses || [],
    predictions: spec.predictions || [],

    // Virtues assessment
    virtues: {},

    // Status tracking
    status: 'untested',
    statusHistory: [],

    // Anomalies and tests
    anomalies: [],
    testResults: [],

    // Metadata
    created: Date.now(),
    lastEvaluated: null
  };

  // Initialize virtue scores
  for (const [key, virtue] of Object.entries(THEORETICAL_VIRTUES)) {
    theory.virtues[key] = {
      score: spec.virtues?.[key] || PHI_INV_2,
      assessments: []
    };
  }

  state.theories.set(id, theory);
  state.stats.theoriesRegistered++;

  appendHistory({
    type: 'theory_registered',
    theoryId: id,
    name: theory.name,
    timestamp: Date.now()
  });

  return theory;
}

/**
 * Add a prediction to a theory
 */
function addPrediction(theoryId, prediction) {
  const theory = state.theories.get(theoryId);
  if (!theory) return null;

  const pred = {
    id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    content: prediction.content,

    // Popperian qualities
    risky: prediction.risky || false,        // Does it risk falsification?
    novel: prediction.novel || false,        // Previously unknown?
    precise: prediction.precise || false,    // Quantitatively specific?

    // Status
    status: 'untested',
    testResult: null,

    created: Date.now()
  };

  theory.predictions.push(pred);

  if (!state.predictions.has(theoryId)) {
    state.predictions.set(theoryId, []);
  }
  state.predictions.get(theoryId).push(pred);

  return pred;
}

/**
 * Record a test result (Popperian critical test)
 */
function recordTest(theoryId, testSpec) {
  const theory = state.theories.get(theoryId);
  if (!theory) return null;

  const test = {
    id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    theoryId,

    // Test details
    description: testSpec.description,
    predictionTested: testSpec.predictionTested,

    // Results
    outcome: testSpec.outcome, // 'pass', 'fail', 'inconclusive'
    severity: testSpec.severity || 'normal', // How severe/risky was the test?

    // Implications
    falsifying: testSpec.outcome === 'fail' && testSpec.severity !== 'minor',
    corroborating: testSpec.outcome === 'pass' && testSpec.severity === 'severe',

    timestamp: Date.now()
  };

  theory.testResults.push(test);
  state.tests.push(test);
  state.stats.testsRecorded++;

  // Update theory status
  if (test.falsifying) {
    updateTheoryStatus(theoryId, 'falsified', test);
    state.stats.falsifications++;
  } else if (test.corroborating) {
    updateTheoryStatus(theoryId, 'corroborated', test);
    state.stats.corroborations++;
  }

  appendHistory({
    type: 'test_recorded',
    test,
    timestamp: Date.now()
  });

  return test;
}

/**
 * Update theory status
 */
function updateTheoryStatus(theoryId, newStatus, reason = null) {
  const theory = state.theories.get(theoryId);
  if (!theory) return null;

  const statusEntry = {
    status: newStatus,
    statusInfo: THEORY_STATUS[newStatus] || { name: newStatus },
    reason,
    timestamp: Date.now()
  };

  theory.statusHistory.push(statusEntry);
  theory.status = newStatus;
  theory.lastEvaluated = Date.now();

  return statusEntry;
}

/**
 * Record an anomaly
 */
function recordAnomaly(theoryId, anomalySpec) {
  const theory = state.theories.get(theoryId);
  if (!theory) return null;

  // Determine anomaly type based on severity
  let type = 'minor';
  if (anomalySpec.severity > PHI_INV_2) type = 'persistent';
  if (anomalySpec.severity > PHI_INV) type = 'crisis';
  if (anomalySpec.severity > PHI_INV + PHI_INV_3) type = 'revolutionary';

  const anomaly = {
    id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    theoryId,

    description: anomalySpec.description,
    observation: anomalySpec.observation,
    expectedByTheory: anomalySpec.expected,

    type,
    typeInfo: ANOMALY_TYPES[type],
    severity: anomalySpec.severity || PHI_INV_2,

    // Resolution tracking
    resolved: false,
    resolution: null,

    timestamp: Date.now()
  };

  theory.anomalies.push(anomaly);
  state.anomalies.push(anomaly);
  state.stats.anomaliesFound++;

  // Check if crisis level
  const crisisAnomalies = theory.anomalies.filter(
    a => !a.resolved && (a.type === 'crisis' || a.type === 'revolutionary')
  );

  if (crisisAnomalies.length >= 2) {
    updateTheoryStatus(theoryId, 'degenerating', {
      reason: 'Multiple unresolved crisis anomalies',
      anomalyCount: crisisAnomalies.length
    });
  }

  appendHistory({
    type: 'anomaly_recorded',
    anomaly,
    timestamp: Date.now()
  });

  return anomaly;
}

/**
 * Resolve an anomaly
 */
function resolveAnomaly(anomalyId, resolution) {
  const anomaly = state.anomalies.find(a => a.id === anomalyId);
  if (!anomaly) return null;

  anomaly.resolved = true;
  anomaly.resolution = {
    method: resolution.method, // 'explained', 'auxiliary_hypothesis', 'ad_hoc', 'paradigm_shift'
    explanation: resolution.explanation,
    adHoc: resolution.method === 'ad_hoc',
    timestamp: Date.now()
  };

  // If ad hoc, may degrade theory status
  if (resolution.method === 'ad_hoc') {
    const theory = state.theories.get(anomaly.theoryId);
    if (theory) {
      const adHocCount = theory.anomalies.filter(
        a => a.resolved && a.resolution?.adHoc
      ).length;

      if (adHocCount >= 3) {
        updateTheoryStatus(anomaly.theoryId, 'ad_hoc', {
          reason: 'Too many ad hoc modifications',
          adHocCount
        });
      }
    }
  }

  return anomaly;
}

/**
 * Assess a virtue for a theory
 */
function assessVirtue(theoryId, virtue, score, justification = '') {
  const theory = state.theories.get(theoryId);
  if (!theory || !theory.virtues[virtue]) return null;

  const assessment = {
    score: Math.min(score, PHI_INV), // Cap at φ⁻¹
    justification,
    timestamp: Date.now()
  };

  theory.virtues[virtue].assessments.push(assessment);

  // Update running score (weighted average)
  const assessments = theory.virtues[virtue].assessments;
  const totalScore = assessments.reduce((sum, a) => sum + a.score, 0);
  theory.virtues[virtue].score = totalScore / assessments.length;

  return assessment;
}

/**
 * Evaluate falsifiability (Popper's criterion)
 */
function evaluateFalsifiability(theoryId) {
  const theory = state.theories.get(theoryId);
  if (!theory) return null;

  const predictions = theory.predictions || [];

  let falsifiabilityScore = 0;
  const factors = [];

  // Check for risky predictions
  const riskyPredictions = predictions.filter(p => p.risky);
  if (riskyPredictions.length > 0) {
    falsifiabilityScore += PHI_INV_2;
    factors.push(`${riskyPredictions.length} risky predictions`);
  }

  // Check for precise predictions
  const precisePredictions = predictions.filter(p => p.precise);
  if (precisePredictions.length > 0) {
    falsifiabilityScore += PHI_INV_3;
    factors.push(`${precisePredictions.length} precise predictions`);
  }

  // Check for novel predictions
  const novelPredictions = predictions.filter(p => p.novel);
  if (novelPredictions.length > 0) {
    falsifiabilityScore += PHI_INV_3;
    factors.push(`${novelPredictions.length} novel predictions`);
  }

  // Check test history
  const tests = theory.testResults || [];
  const severeTests = tests.filter(t => t.severity === 'severe');
  if (severeTests.length > 0) {
    falsifiabilityScore += PHI_INV_3;
    factors.push(`Survived ${severeTests.length} severe tests`);
  }

  // Penalty for unfalsifiable core
  if (theory.coreAssumptions.some(a => a.unfalsifiable)) {
    falsifiabilityScore *= PHI_INV_2;
    factors.push('Contains unfalsifiable core assumptions');
  }

  const result = {
    theoryId,
    falsifiabilityScore: Math.min(falsifiabilityScore, PHI_INV),
    factors,
    popperian: falsifiabilityScore >= PHI_INV_2,
    verdict: falsifiabilityScore >= PHI_INV_2
      ? 'Scientific (falsifiable)'
      : falsifiabilityScore >= PHI_INV_3
        ? 'Weakly scientific'
        : 'Non-scientific (unfalsifiable)',
    confidence: PHI_INV
  };

  // Update virtue score
  assessVirtue(theoryId, 'falsifiability', result.falsifiabilityScore, result.verdict);

  return result;
}

/**
 * Calculate overall theory score
 */
function evaluateTheory(theoryId) {
  const theory = state.theories.get(theoryId);
  if (!theory) return null;

  let totalScore = 0;
  let totalWeight = 0;
  const breakdown = {};

  for (const [key, virtue] of Object.entries(THEORETICAL_VIRTUES)) {
    const score = theory.virtues[key]?.score || PHI_INV_2;
    const weight = virtue.weight;

    totalScore += score * weight;
    totalWeight += weight;

    breakdown[key] = {
      name: virtue.name,
      score,
      weight,
      weighted: score * weight
    };
  }

  const overallScore = totalScore / totalWeight;

  // Penalty for unresolved anomalies
  const unresolvedAnomalies = theory.anomalies.filter(a => !a.resolved);
  const anomalyPenalty = unresolvedAnomalies.length * PHI_INV_3 * 0.5;

  // Penalty for falsification
  const wasFalsified = theory.status === 'falsified';
  const falsificationPenalty = wasFalsified ? PHI_INV_2 : 0;

  const finalScore = Math.max(
    0,
    Math.min(PHI_INV, overallScore - anomalyPenalty - falsificationPenalty)
  );

  theory.lastEvaluated = Date.now();

  return {
    theoryId,
    theoryName: theory.name,
    overallScore: finalScore,
    rawScore: overallScore,
    breakdown,
    penalties: {
      anomalies: anomalyPenalty,
      falsification: falsificationPenalty
    },
    status: theory.status,
    unresolvedAnomalies: unresolvedAnomalies.length,
    confidence: PHI_INV
  };
}

/**
 * Compare two theories (crucial experiment setup)
 */
function compareTheories(theory1Id, theory2Id) {
  const t1 = state.theories.get(theory1Id);
  const t2 = state.theories.get(theory2Id);

  if (!t1 || !t2) return null;

  const eval1 = evaluateTheory(theory1Id);
  const eval2 = evaluateTheory(theory2Id);

  const comparison = {
    theories: [theory1Id, theory2Id],
    evaluations: [eval1, eval2],

    virtueComparison: {},

    winner: null,
    confidence: PHI_INV_2,

    crucialExperiment: null,

    timestamp: Date.now()
  };

  // Compare each virtue
  for (const key of Object.keys(THEORETICAL_VIRTUES)) {
    const score1 = t1.virtues[key]?.score || PHI_INV_2;
    const score2 = t2.virtues[key]?.score || PHI_INV_2;

    comparison.virtueComparison[key] = {
      [theory1Id]: score1,
      [theory2Id]: score2,
      winner: score1 > score2 ? theory1Id : score2 > score1 ? theory2Id : 'tie'
    };
  }

  // Determine overall winner
  if (eval1.overallScore > eval2.overallScore + PHI_INV_3) {
    comparison.winner = theory1Id;
    comparison.confidence = Math.min(
      (eval1.overallScore - eval2.overallScore) * PHI,
      PHI_INV
    );
  } else if (eval2.overallScore > eval1.overallScore + PHI_INV_3) {
    comparison.winner = theory2Id;
    comparison.confidence = Math.min(
      (eval2.overallScore - eval1.overallScore) * PHI,
      PHI_INV
    );
  } else {
    comparison.winner = 'underdetermined';
    comparison.confidence = PHI_INV_3;
    comparison.note = 'Quine: Theory choice is underdetermined by evidence';
  }

  // Suggest crucial experiment
  const divergentPredictions = findDivergentPredictions(t1, t2);
  if (divergentPredictions.length > 0) {
    comparison.crucialExperiment = {
      description: 'Test where theories make different predictions',
      predictions: divergentPredictions,
      potential: 'Could decisively favor one theory'
    };
  }

  state.comparisons.push(comparison);
  state.stats.comparisonsPerformed++;

  appendHistory({
    type: 'comparison',
    comparison,
    timestamp: Date.now()
  });

  return comparison;
}

/**
 * Find predictions where theories diverge
 */
function findDivergentPredictions(theory1, theory2) {
  const divergent = [];

  // Simple comparison - look for similar domains with different predictions
  const t1Preds = theory1.predictions.map(p => p.content);
  const t2Preds = theory2.predictions.map(p => p.content);

  // Find predictions unique to each
  for (const pred of theory1.predictions) {
    if (!t2Preds.some(p2 => p2.toLowerCase().includes(pred.content.toLowerCase().split(' ')[0]))) {
      divergent.push({
        theory: theory1.id,
        prediction: pred.content,
        type: 'unique'
      });
    }
  }

  for (const pred of theory2.predictions) {
    if (!t1Preds.some(p1 => p1.toLowerCase().includes(pred.content.toLowerCase().split(' ')[0]))) {
      divergent.push({
        theory: theory2.id,
        prediction: pred.content,
        type: 'unique'
      });
    }
  }

  return divergent;
}

/**
 * Check if theory is progressive or degenerating (Lakatos)
 */
function assessProgressiveness(theoryId) {
  const theory = state.theories.get(theoryId);
  if (!theory) return null;

  const predictions = theory.predictions || [];
  const anomalies = theory.anomalies || [];
  const tests = theory.testResults || [];

  // Count novel successful predictions
  const novelSuccesses = predictions.filter(
    p => p.novel && p.status === 'confirmed'
  ).length;

  // Count ad hoc modifications
  const adHocCount = anomalies.filter(
    a => a.resolved && a.resolution?.adHoc
  ).length;

  // Calculate progressiveness score
  let progressScore = PHI_INV_2; // Neutral start

  // Boost for novel predictions
  progressScore += novelSuccesses * PHI_INV_3;

  // Penalty for ad hoc modifications
  progressScore -= adHocCount * PHI_INV_3;

  // Factor in test survival
  const passedSevereTests = tests.filter(
    t => t.outcome === 'pass' && t.severity === 'severe'
  ).length;
  progressScore += passedSevereTests * PHI_INV_3;

  const isProgressive = progressScore >= PHI_INV_2;

  const result = {
    theoryId,
    progressScore: Math.min(Math.max(progressScore, 0), PHI_INV),
    isProgressive,
    status: isProgressive ? 'progressive' : 'degenerating',
    factors: {
      novelSuccesses,
      adHocModifications: adHocCount,
      severeTestsSurvived: passedSevereTests
    },
    lakatosVerdict: isProgressive
      ? 'Research programme is progressive'
      : 'Research programme is degenerating',
    confidence: PHI_INV
  };

  // Update theory status
  updateTheoryStatus(theoryId, result.status, result);

  return result;
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
    theories: Array.from(state.theories.entries()),
    tests: state.tests.slice(-100),
    anomalies: state.anomalies.slice(-100),
    comparisons: state.comparisons.slice(-50),
    predictions: Array.from(state.predictions.entries()),
    stats: state.stats
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(serializable, null, 2));
}

function loadState() {
  ensureStorageDir();

  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state.theories = new Map(data.theories || []);
      state.tests = data.tests || [];
      state.anomalies = data.anomalies || [];
      state.comparisons = data.comparisons || [];
      state.predictions = new Map(data.predictions || []);
      state.stats = data.stats || state.stats;
    } catch (e) {
      console.error('Failed to load theory evaluation state:', e.message);
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
    '── THEORY EVALUATION ──────────────────────────────────────',
    ''
  ];

  lines.push(`   Theories: ${state.theories.size} | Tests: ${state.stats.testsRecorded}`);
  lines.push(`   Anomalies: ${state.stats.anomaliesFound} | Comparisons: ${state.stats.comparisonsPerformed}`);
  lines.push(`   Falsifications: ${state.stats.falsifications} | Corroborations: ${state.stats.corroborations}`);
  lines.push('');

  // Recent theories
  if (state.theories.size > 0) {
    lines.push('   Theories:');
    const recent = Array.from(state.theories.values()).slice(-3);
    for (const theory of recent) {
      const status = THEORY_STATUS[theory.status]?.symbol || '?';
      lines.push(`   ${status} ${theory.name} (${theory.domain})`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function getStats() {
  return {
    ...state.stats,
    theoryCount: state.theories.size,
    anomalyCount: state.anomalies.length,
    recentComparisons: state.comparisons.slice(-5)
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
    theories: state.theories.size
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
  THEORETICAL_VIRTUES,
  THEORY_STATUS,
  ANOMALY_TYPES,

  // Core functions
  registerTheory,
  addPrediction,
  recordTest,
  updateTheoryStatus,
  recordAnomaly,
  resolveAnomaly,
  assessVirtue,
  evaluateFalsifiability,
  evaluateTheory,
  compareTheories,
  assessProgressiveness,

  // State access
  getTheory: (id) => state.theories.get(id),
  getAnomalies: (theoryId) => state.anomalies.filter(a => a.theoryId === theoryId),
  getTests: (theoryId) => state.tests.filter(t => t.theoryId === theoryId),

  // Persistence
  saveState,
  loadState,

  // Formatting
  formatStatus,
  getStats,
  init
};
