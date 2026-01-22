/**
 * Reliabilist Tracker - Process Reliability for Knowledge
 *
 * Philosophy: Alvin Goldman's reliabilism - beliefs are justified
 * if produced by reliable cognitive processes. Knowledge comes
 * from methods that tend to produce true beliefs.
 *
 * Key concepts:
 * - Process reliability: Ratio of true beliefs from a process
 * - Virtue epistemology: Intellectual virtues as reliable dispositions
 * - Calibration: Confidence matching actual reliability
 * - Track record: Historical performance of processes
 *
 * In CYNIC: Track which methods (testing, review, analysis)
 * produce reliable knowledge and calibrate confidence accordingly.
 *
 * @module reliabilist-tracker
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
const RELIABILIST_DIR = path.join(CYNIC_DIR, 'reliabilist');
const STATE_FILE = path.join(RELIABILIST_DIR, 'state.json');
const HISTORY_FILE = path.join(RELIABILIST_DIR, 'history.jsonl');

// Constants
const MAX_PROCESSES = Math.round(PHI * 30);     // ~49
const MAX_OUTCOMES = Math.round(PHI * 200);     // ~324
const RELIABILITY_THRESHOLD = PHI_INV;          // 0.618

/**
 * Process categories
 */
const PROCESS_CATEGORIES = {
  empirical: {
    name: 'Empirical',
    description: 'Observation, testing, measurement',
    baseReliability: PHI_INV,
    symbol: '👁️',
  },
  inferential: {
    name: 'Inferential',
    description: 'Logical reasoning, deduction',
    baseReliability: PHI_INV + PHI_INV_3,
    symbol: '→',
  },
  testimonial: {
    name: 'Testimonial',
    description: 'Reports from others, documentation',
    baseReliability: PHI_INV_2,
    symbol: '👤',
  },
  memorial: {
    name: 'Memorial',
    description: 'Memory, past experience',
    baseReliability: PHI_INV_2,
    symbol: '📝',
  },
  introspective: {
    name: 'Introspective',
    description: 'Self-examination, reflection',
    baseReliability: PHI_INV_3,
    symbol: '🔍',
  },
  computational: {
    name: 'Computational',
    description: 'Automated analysis, algorithms',
    baseReliability: PHI_INV + PHI_INV_2,
    symbol: '⚙️',
  },
};

/**
 * Reliability levels
 */
const RELIABILITY_LEVELS = {
  unreliable: {
    threshold: 0,
    name: 'Unreliable',
    description: 'More false than true',
    symbol: '✕',
  },
  questionable: {
    threshold: PHI_INV_3,
    name: 'Questionable',
    description: 'Inconsistent results',
    symbol: '?',
  },
  moderate: {
    threshold: PHI_INV_2,
    name: 'Moderate',
    description: 'Sometimes reliable',
    symbol: '◔',
  },
  reliable: {
    threshold: PHI_INV,
    name: 'Reliable',
    description: 'Usually produces truth',
    symbol: '◕',
  },
  highly_reliable: {
    threshold: PHI_INV + PHI_INV_2,
    name: 'Highly Reliable',
    description: 'Consistently trustworthy',
    symbol: '●',
  },
};

/**
 * Intellectual virtues
 */
const INTELLECTUAL_VIRTUES = {
  openmindedness: {
    name: 'Open-mindedness',
    description: 'Willingness to consider alternatives',
    reliabilityBonus: PHI_INV_3,
  },
  thoroughness: {
    name: 'Thoroughness',
    description: 'Comprehensive investigation',
    reliabilityBonus: PHI_INV_2,
  },
  caution: {
    name: 'Caution',
    description: 'Appropriate skepticism',
    reliabilityBonus: PHI_INV_3,
  },
  intellectual_courage: {
    name: 'Intellectual Courage',
    description: 'Willingness to challenge assumptions',
    reliabilityBonus: PHI_INV_3,
  },
  humility: {
    name: 'Humility',
    description: 'Recognizing limits of knowledge',
    reliabilityBonus: PHI_INV_2,
  },
};

// In-memory state
let state = {
  processes: {},       // Registered cognitive processes
  outcomes: [],        // Outcomes from processes
  calibration: {       // Confidence calibration
    predictions: [],
    accuracy: 0,
  },
  virtues: {},         // Tracked intellectual virtues
  stats: {
    processesRegistered: 0,
    outcomesRecorded: 0,
    calibrationChecks: 0,
    virtuesExercised: 0,
  },
};

/**
 * Initialize the reliabilist tracker
 */
function init() {
  if (!fs.existsSync(RELIABILIST_DIR)) {
    fs.mkdirSync(RELIABILIST_DIR, { recursive: true });
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
 * Register a cognitive process
 *
 * @param {string} name - Process name
 * @param {string} category - Process category
 * @param {object} config - Configuration
 * @returns {object} Registered process
 */
function registerProcess(name, category, config = {}) {
  const id = `proc-${name.toLowerCase().replace(/\s+/g, '-')}`;

  if (state.processes[id]) {
    return state.processes[id];
  }

  // Prune if needed
  if (Object.keys(state.processes).length >= MAX_PROCESSES) {
    pruneProcesses();
  }

  const categoryInfo = PROCESS_CATEGORIES[category] || PROCESS_CATEGORIES.empirical;

  const process = {
    id,
    name,
    category,
    categoryInfo,
    description: config.description || '',
    // Track record
    trackRecord: {
      total: 0,
      truths: 0,
      falses: 0,
    },
    // Calculated reliability
    reliability: categoryInfo.baseReliability,
    reliabilityLevel: getReliabilityLevel(categoryInfo.baseReliability),
    // Virtues applied to this process
    virtuesApplied: [],
    registeredAt: Date.now(),
    lastUsed: null,
  };

  state.processes[id] = process;
  state.stats.processesRegistered++;

  logHistory({
    type: 'process_registered',
    id,
    name,
    category,
  });

  saveState();

  return process;
}

/**
 * Prune least used processes
 */
function pruneProcesses() {
  const sorted = Object.entries(state.processes)
    .sort((a, b) => (a[1].lastUsed || 0) - (b[1].lastUsed || 0));

  const toRemove = sorted.slice(0, Math.round(MAX_PROCESSES * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.processes[id];
  }
}

/**
 * Record an outcome from a process
 *
 * @param {string} processId - Process ID
 * @param {object} outcome - Outcome details
 * @returns {object} Updated process
 */
function recordOutcome(processId, outcome) {
  const process = state.processes[processId];
  if (!process) return { error: 'Process not found' };

  const outcomeRecord = {
    id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    processId,
    belief: outcome.belief || '',
    predictedTrue: outcome.predicted !== undefined ? outcome.predicted : true,
    actuallyTrue: outcome.actual,
    confidence: Math.min(outcome.confidence || 0.5, PHI_INV),
    timestamp: Date.now(),
  };

  // Update track record
  process.trackRecord.total++;
  if (outcome.actual === true) {
    process.trackRecord.truths++;
  } else if (outcome.actual === false) {
    process.trackRecord.falses++;
  }

  process.lastUsed = Date.now();

  // Calculate reliability
  if (process.trackRecord.total > 0) {
    const trueRate = process.trackRecord.truths / process.trackRecord.total;
    // Blend with base reliability, weighted by experience
    const experienceWeight = Math.min(1, process.trackRecord.total / 10);
    process.reliability = process.categoryInfo.baseReliability * (1 - experienceWeight) +
                          trueRate * experienceWeight;

    // Apply virtue bonuses
    for (const virtue of process.virtuesApplied) {
      const virtueInfo = INTELLECTUAL_VIRTUES[virtue];
      if (virtueInfo) {
        process.reliability = Math.min(1, process.reliability + virtueInfo.reliabilityBonus * PHI_INV_3);
      }
    }
  }

  process.reliabilityLevel = getReliabilityLevel(process.reliability);

  // Store outcome
  state.outcomes.push(outcomeRecord);
  state.stats.outcomesRecorded++;

  // Prune outcomes if needed
  if (state.outcomes.length > MAX_OUTCOMES) {
    state.outcomes = state.outcomes.slice(-Math.round(MAX_OUTCOMES * PHI_INV));
  }

  // Update calibration
  updateCalibration(outcomeRecord);

  logHistory({
    type: 'outcome_recorded',
    processId,
    actuallyTrue: outcome.actual,
    newReliability: process.reliability,
  });

  saveState();

  return {
    process,
    outcome: outcomeRecord,
    reliability: Math.round(process.reliability * 100),
    level: process.reliabilityLevel,
    trackRecord: process.trackRecord,
  };
}

/**
 * Get reliability level from score
 */
function getReliabilityLevel(score) {
  for (const [name, config] of Object.entries(RELIABILITY_LEVELS).reverse()) {
    if (score >= config.threshold) {
      return { name, ...config };
    }
  }
  return RELIABILITY_LEVELS.unreliable;
}

/**
 * Update calibration tracking
 */
function updateCalibration(outcome) {
  state.calibration.predictions.push({
    confidence: outcome.confidence,
    correct: outcome.predictedTrue === outcome.actuallyTrue,
    timestamp: Date.now(),
  });

  // Keep bounded
  if (state.calibration.predictions.length > 100) {
    state.calibration.predictions = state.calibration.predictions.slice(-80);
  }

  // Calculate calibration accuracy
  // Good calibration: confidence matches actual success rate
  const predictions = state.calibration.predictions;
  if (predictions.length >= 10) {
    const correct = predictions.filter(p => p.correct).length;
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
    const actualRate = correct / predictions.length;

    // Calibration = 1 - |confidence - actual|
    state.calibration.accuracy = 1 - Math.abs(avgConfidence - actualRate);
  }

  state.stats.calibrationChecks++;
}

/**
 * Apply an intellectual virtue to a process
 *
 * @param {string} processId - Process ID
 * @param {string} virtue - Virtue name
 * @returns {object} Updated process
 */
function applyVirtue(processId, virtue) {
  const process = state.processes[processId];
  if (!process) return { error: 'Process not found' };

  if (!INTELLECTUAL_VIRTUES[virtue]) {
    return { error: `Unknown virtue: ${virtue}` };
  }

  if (!process.virtuesApplied.includes(virtue)) {
    process.virtuesApplied.push(virtue);
    state.stats.virtuesExercised++;

    // Apply bonus
    const virtueInfo = INTELLECTUAL_VIRTUES[virtue];
    process.reliability = Math.min(1, process.reliability + virtueInfo.reliabilityBonus);
    process.reliabilityLevel = getReliabilityLevel(process.reliability);

    // Track globally
    if (!state.virtues[virtue]) {
      state.virtues[virtue] = { count: 0, processes: [] };
    }
    state.virtues[virtue].count++;
    state.virtues[virtue].processes.push(processId);
  }

  saveState();

  return {
    process,
    virtue,
    virtueInfo: INTELLECTUAL_VIRTUES[virtue],
    newReliability: Math.round(process.reliability * 100),
  };
}

/**
 * Get calibration report
 *
 * @returns {object} Calibration analysis
 */
function getCalibrationReport() {
  const predictions = state.calibration.predictions;

  if (predictions.length < 5) {
    return {
      sufficient: false,
      message: 'Need more predictions for calibration',
      samples: predictions.length,
    };
  }

  // Group by confidence level
  const buckets = {
    low: { range: [0, PHI_INV_2], predictions: [], correct: 0 },
    medium: { range: [PHI_INV_2, PHI_INV], predictions: [], correct: 0 },
    high: { range: [PHI_INV, 1], predictions: [], correct: 0 },
  };

  for (const pred of predictions) {
    for (const [name, bucket] of Object.entries(buckets)) {
      if (pred.confidence >= bucket.range[0] && pred.confidence < bucket.range[1]) {
        bucket.predictions.push(pred);
        if (pred.correct) bucket.correct++;
        break;
      }
    }
  }

  const bucketStats = {};
  for (const [name, bucket] of Object.entries(buckets)) {
    const total = bucket.predictions.length;
    if (total > 0) {
      const avgConfidence = bucket.predictions.reduce((sum, p) => sum + p.confidence, 0) / total;
      const actualRate = bucket.correct / total;
      bucketStats[name] = {
        samples: total,
        avgConfidence: Math.round(avgConfidence * 100),
        actualRate: Math.round(actualRate * 100),
        calibrationError: Math.round(Math.abs(avgConfidence - actualRate) * 100),
      };
    }
  }

  return {
    sufficient: true,
    overallAccuracy: Math.round(state.calibration.accuracy * 100),
    totalPredictions: predictions.length,
    buckets: bucketStats,
    isWellCalibrated: state.calibration.accuracy >= PHI_INV,
    message: state.calibration.accuracy >= PHI_INV
      ? '*nod* Confidence matches reality'
      : `*sniff* Calibration off by ${Math.round((1 - state.calibration.accuracy) * 100)}%`,
  };
}

/**
 * Get process reliability ranking
 *
 * @returns {array} Processes ranked by reliability
 */
function getRanking() {
  return Object.values(state.processes)
    .filter(p => p.trackRecord.total >= 3)  // Minimum experience
    .sort((a, b) => b.reliability - a.reliability)
    .map(p => ({
      name: p.name,
      category: p.category,
      reliability: Math.round(p.reliability * 100),
      level: p.reliabilityLevel.symbol,
      trackRecord: p.trackRecord,
    }));
}

/**
 * Get statistics
 */
function getStats() {
  const allProcesses = Object.values(state.processes);
  const reliableCount = allProcesses.filter(p => p.reliability >= RELIABILITY_THRESHOLD).length;

  return {
    ...state.stats,
    totalProcesses: allProcesses.length,
    reliableProcesses: reliableCount,
    avgReliability: allProcesses.length > 0
      ? Math.round(allProcesses.reduce((sum, p) => sum + p.reliability, 0) / allProcesses.length * 100)
      : 0,
    calibrationAccuracy: Math.round(state.calibration.accuracy * 100),
    virtueTypes: Object.keys(state.virtues).length,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `◕ Reliabilist Tracker (Goldman)\n`;
  status += `  Processes: ${stats.totalProcesses} (${stats.reliableProcesses} reliable)\n`;
  status += `  Avg reliability: ${stats.avgReliability}%\n`;
  status += `  Calibration: ${stats.calibrationAccuracy}%\n`;
  status += `  Virtues applied: ${stats.virtueTypes} types\n`;

  // Top processes
  const ranking = getRanking().slice(0, 3);
  if (ranking.length > 0) {
    status += `  Top processes:\n`;
    for (const p of ranking) {
      status += `    ${p.level} ${p.name}: ${p.reliability}%\n`;
    }
  }

  return status;
}

module.exports = {
  init,
  registerProcess,
  recordOutcome,
  applyVirtue,
  getCalibrationReport,
  getRanking,
  getStats,
  formatStatus,
  PROCESS_CATEGORIES,
  RELIABILITY_LEVELS,
  INTELLECTUAL_VIRTUES,
};
