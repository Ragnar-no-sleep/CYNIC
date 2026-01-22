/**
 * CYNIC Cognitive Biases Detection Module
 *
 * "Le chien voit ce que l'humain refuse de voir" - κυνικός
 *
 * Detects cognitive biases from behavioral patterns.
 * Never claims certainty - all detections are probabilistic.
 *
 * Tracked biases:
 *   - Sunk cost: Persisting on failing approach
 *   - Confirmation: Ignoring contradictory signals
 *   - Anchoring: Fixating on first solution
 *   - Overconfidence: Acting without verification
 *   - Analysis paralysis: Research without action
 *   - Recency: Over-weighting recent events
 *
 * @module cynic/lib/cognitive-biases
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI, PHI_INV, PHI_INV_2, PHI_INV_3 } = phiMath;

// =============================================================================
// CONSTANTS (φ-derived)
// =============================================================================

/** Detection confidence threshold - must exceed to report */
const DETECTION_THRESHOLD = PHI_INV_2; // ~38.2%

/** High confidence threshold */
const HIGH_CONFIDENCE = PHI_INV; // ~61.8%

/** Failure streak for sunk cost detection */
const SUNK_COST_FAILURES = Math.round(PHI * 3); // 5 failures

/** Same file edits for anchoring detection */
const ANCHORING_EDITS = Math.round(PHI * 4); // 6 edits

/** Read-only actions for analysis paralysis */
const PARALYSIS_READS = Math.round(PHI * 6); // 10 reads without action

/** Recency window in minutes */
const RECENCY_WINDOW_MIN = PHI_INV * 10; // ~6.2 minutes

/** Pattern decay rate per hour */
const PATTERN_DECAY = PHI_INV_3; // ~23.6%

// =============================================================================
// STORAGE
// =============================================================================

const BIASES_DIR = path.join(os.homedir(), '.cynic', 'biases');
const PATTERNS_FILE = path.join(BIASES_DIR, 'patterns.json');
const DETECTIONS_FILE = path.join(BIASES_DIR, 'detections.jsonl');

// =============================================================================
// STATE
// =============================================================================

const biasState = {
  // Action history for pattern detection
  actionHistory: [],

  // File edit tracking (for anchoring)
  fileEdits: {},

  // Error tracking (for sunk cost)
  errorsByApproach: {},
  currentApproach: null,

  // Read vs write tracking (for analysis paralysis)
  recentReads: 0,
  recentWrites: 0,
  lastWriteTime: null,

  // Active detections
  activeDetections: [],

  // Stats
  stats: {
    totalDetections: 0,
    byBias: {},
    acknowledged: 0,
    ignored: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(BIASES_DIR)) {
    fs.mkdirSync(BIASES_DIR, { recursive: true });
  }
}

function loadPatterns() {
  ensureDir();
  if (!fs.existsSync(PATTERNS_FILE)) {
    return { actionHistory: [], fileEdits: {}, errorsByApproach: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
  } catch {
    return { actionHistory: [], fileEdits: {}, errorsByApproach: {} };
  }
}

function savePatterns() {
  ensureDir();
  fs.writeFileSync(PATTERNS_FILE, JSON.stringify({
    actionHistory: biasState.actionHistory.slice(-100), // Keep last 100
    fileEdits: biasState.fileEdits,
    errorsByApproach: biasState.errorsByApproach,
    stats: biasState.stats,
    updatedAt: Date.now(),
  }, null, 2));
}

function appendDetection(detection) {
  ensureDir();
  const line = JSON.stringify({ ...detection, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(DETECTIONS_FILE, line);
}

// =============================================================================
// BIAS DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect sunk cost fallacy
 * Pattern: Repeated failures on same approach without changing strategy
 * @returns {Object|null} Detection result or null
 */
function detectSunkCost() {
  const approach = biasState.currentApproach;
  if (!approach) return null;

  const errors = biasState.errorsByApproach[approach] || [];
  const recentErrors = errors.filter(e =>
    Date.now() - e.timestamp < 30 * 60 * 1000 // Last 30 min
  );

  if (recentErrors.length >= SUNK_COST_FAILURES) {
    // Check if errors are similar (same type)
    const errorTypes = recentErrors.map(e => e.type);
    const uniqueTypes = new Set(errorTypes);

    // If mostly same error type, higher confidence
    const dominantType = [...uniqueTypes].sort((a, b) =>
      errorTypes.filter(t => t === b).length - errorTypes.filter(t => t === a).length
    )[0];

    const sameTypeCount = errorTypes.filter(t => t === dominantType).length;
    const sameTypeRatio = sameTypeCount / recentErrors.length;

    const confidence = Math.min(HIGH_CONFIDENCE,
      DETECTION_THRESHOLD + (sameTypeRatio * PHI_INV_2)
    );

    if (confidence >= DETECTION_THRESHOLD) {
      return {
        bias: 'sunk_cost',
        confidence,
        evidence: {
          approach,
          failureCount: recentErrors.length,
          dominantError: dominantType,
          sameTypeRatio,
        },
        suggestion: 'Consider stepping back and trying a different approach.',
      };
    }
  }

  return null;
}

/**
 * Detect anchoring bias
 * Pattern: Repeatedly editing same file without exploring alternatives
 * @returns {Object|null} Detection result or null
 */
function detectAnchoring() {
  // Find most edited file
  let maxEdits = 0;
  let anchorFile = null;

  for (const [file, edits] of Object.entries(biasState.fileEdits)) {
    const recentEdits = edits.filter(e =>
      Date.now() - e.timestamp < 60 * 60 * 1000 // Last hour
    );
    if (recentEdits.length > maxEdits) {
      maxEdits = recentEdits.length;
      anchorFile = file;
    }
  }

  if (maxEdits >= ANCHORING_EDITS) {
    // Check if other files were explored
    const totalFiles = Object.keys(biasState.fileEdits).length;
    const focusRatio = maxEdits / Math.max(1, biasState.actionHistory.length);

    const confidence = Math.min(HIGH_CONFIDENCE,
      DETECTION_THRESHOLD + (focusRatio * PHI_INV)
    );

    if (confidence >= DETECTION_THRESHOLD && totalFiles <= 2) {
      return {
        bias: 'anchoring',
        confidence,
        evidence: {
          file: anchorFile,
          editCount: maxEdits,
          totalFiles,
          focusRatio,
        },
        suggestion: `Consider if ${path.basename(anchorFile)} is really the right place. Maybe the issue is elsewhere?`,
      };
    }
  }

  return null;
}

/**
 * Detect analysis paralysis
 * Pattern: Many reads without any writes/actions
 * @returns {Object|null} Detection result or null
 */
function detectAnalysisParalysis() {
  // Only trigger if no write in a while
  const timeSinceWrite = biasState.lastWriteTime
    ? Date.now() - biasState.lastWriteTime
    : Infinity;

  const minSinceWrite = timeSinceWrite / (1000 * 60);

  if (biasState.recentReads >= PARALYSIS_READS &&
      biasState.recentWrites === 0 &&
      minSinceWrite > RECENCY_WINDOW_MIN) {

    const readWriteRatio = biasState.recentReads / Math.max(1, biasState.recentWrites);

    const confidence = Math.min(HIGH_CONFIDENCE,
      DETECTION_THRESHOLD + (Math.min(readWriteRatio / 20, 1) * PHI_INV_2)
    );

    if (confidence >= DETECTION_THRESHOLD) {
      return {
        bias: 'analysis_paralysis',
        confidence,
        evidence: {
          reads: biasState.recentReads,
          writes: biasState.recentWrites,
          minutesSinceWrite: Math.round(minSinceWrite),
        },
        suggestion: 'Beaucoup de lecture, peu d\'action. Prêt à commencer?',
      };
    }
  }

  return null;
}

/**
 * Detect overconfidence
 * Pattern: Making changes without reading/understanding first
 * @returns {Object|null} Detection result or null
 */
function detectOverconfidence() {
  // Look at recent actions
  const recent = biasState.actionHistory.slice(-10);
  if (recent.length < 5) return null;

  // Count writes without prior reads of same file
  let blindWrites = 0;
  const readFiles = new Set();

  for (const action of recent) {
    if (action.type === 'read') {
      readFiles.add(action.file);
    } else if (action.type === 'write' && !readFiles.has(action.file)) {
      blindWrites++;
    }
  }

  const blindRatio = blindWrites / Math.max(1, recent.filter(a => a.type === 'write').length);

  if (blindRatio > PHI_INV && blindWrites >= 3) {
    const confidence = Math.min(HIGH_CONFIDENCE,
      DETECTION_THRESHOLD + (blindRatio * PHI_INV_2)
    );

    if (confidence >= DETECTION_THRESHOLD) {
      return {
        bias: 'overconfidence',
        confidence,
        evidence: {
          blindWrites,
          totalWrites: recent.filter(a => a.type === 'write').length,
          blindRatio,
        },
        suggestion: 'Writing without reading first. Are you sure you understand the context?',
      };
    }
  }

  return null;
}

/**
 * Detect recency bias
 * Pattern: Over-reacting to recent events, ignoring history
 * @returns {Object|null} Detection result or null
 */
function detectRecencyBias() {
  // Need enough history
  if (biasState.actionHistory.length < 20) return null;

  const now = Date.now();
  const recencyMs = RECENCY_WINDOW_MIN * 60 * 1000;

  // Split into recent vs older
  const recent = biasState.actionHistory.filter(a => now - a.timestamp < recencyMs);
  const older = biasState.actionHistory.filter(a => now - a.timestamp >= recencyMs);

  if (recent.length < 3 || older.length < 5) return null;

  // Check if recent behavior is drastically different
  const recentErrorRate = recent.filter(a => a.error).length / recent.length;
  const olderErrorRate = older.filter(a => a.error).length / older.length;

  // If recent has much higher error rate but user isn't changing approach
  if (recentErrorRate > olderErrorRate * PHI && recentErrorRate > PHI_INV_2) {
    const confidence = Math.min(HIGH_CONFIDENCE,
      DETECTION_THRESHOLD + ((recentErrorRate - olderErrorRate) * PHI_INV)
    );

    if (confidence >= DETECTION_THRESHOLD) {
      return {
        bias: 'recency',
        confidence,
        evidence: {
          recentErrorRate: Math.round(recentErrorRate * 100),
          olderErrorRate: Math.round(olderErrorRate * 100),
          recentCount: recent.length,
        },
        suggestion: 'Recent errors spiking. Take a breath - the approach was working before.',
      };
    }
  }

  return null;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize the bias detector
 */
function init() {
  ensureDir();
  const saved = loadPatterns();
  biasState.actionHistory = saved.actionHistory || [];
  biasState.fileEdits = saved.fileEdits || {};
  biasState.errorsByApproach = saved.errorsByApproach || {};
  biasState.stats = saved.stats || { totalDetections: 0, byBias: {}, acknowledged: 0, ignored: 0 };
}

/**
 * Record an action for bias analysis
 * @param {string} type - Action type (read, write, bash, etc.)
 * @param {Object} data - Action data
 */
function recordAction(type, data = {}) {
  const action = {
    type,
    timestamp: Date.now(),
    file: data.file || null,
    error: data.error || false,
    errorType: data.errorType || null,
  };

  biasState.actionHistory.push(action);

  // Keep history bounded
  if (biasState.actionHistory.length > 200) {
    biasState.actionHistory = biasState.actionHistory.slice(-100);
  }

  // Update specific trackers
  if (type === 'read' || type === 'Read' || type === 'Glob' || type === 'Grep') {
    biasState.recentReads++;
  } else if (type === 'write' || type === 'Write' || type === 'Edit') {
    biasState.recentWrites++;
    biasState.lastWriteTime = Date.now();

    // Track file edits
    if (data.file) {
      if (!biasState.fileEdits[data.file]) {
        biasState.fileEdits[data.file] = [];
      }
      biasState.fileEdits[data.file].push({ timestamp: Date.now() });
    }
  }

  // Track errors by approach
  if (data.error && biasState.currentApproach) {
    if (!biasState.errorsByApproach[biasState.currentApproach]) {
      biasState.errorsByApproach[biasState.currentApproach] = [];
    }
    biasState.errorsByApproach[biasState.currentApproach].push({
      timestamp: Date.now(),
      type: data.errorType,
    });
  }

  // Periodic save
  if (biasState.actionHistory.length % 10 === 0) {
    savePatterns();
  }
}

/**
 * Set current approach context
 * @param {string} approach - Description of current approach
 */
function setApproach(approach) {
  if (approach !== biasState.currentApproach) {
    // New approach - reset counters
    biasState.recentReads = 0;
    biasState.recentWrites = 0;
  }
  biasState.currentApproach = approach;
}

/**
 * Run all bias detectors
 * @returns {Array} Active detections
 */
function detectBiases() {
  const detections = [];

  const checks = [
    detectSunkCost,
    detectAnchoring,
    detectAnalysisParalysis,
    detectOverconfidence,
    detectRecencyBias,
  ];

  for (const check of checks) {
    try {
      const result = check();
      if (result && result.confidence >= DETECTION_THRESHOLD) {
        detections.push(result);

        // Update stats
        biasState.stats.totalDetections++;
        biasState.stats.byBias[result.bias] =
          (biasState.stats.byBias[result.bias] || 0) + 1;

        // Log detection
        appendDetection(result);
      }
    } catch {
      // Individual detector failure shouldn't stop others
    }
  }

  biasState.activeDetections = detections;
  return detections;
}

/**
 * Acknowledge a bias detection (user saw it)
 * @param {string} bias - Bias type
 */
function acknowledgeBias(bias) {
  biasState.stats.acknowledged++;
  biasState.activeDetections = biasState.activeDetections.filter(d => d.bias !== bias);
  savePatterns();
}

/**
 * Format a detection for display
 * @param {Object} detection - Detection object
 * @returns {string} Formatted message
 */
function formatDetection(detection) {
  const confidenceStr = Math.round(detection.confidence * 100);
  const emoji = detection.confidence >= HIGH_CONFIDENCE ? '*GROWL*' : '*sniff*';

  const biasNames = {
    sunk_cost: 'Sunk Cost Fallacy',
    anchoring: 'Anchoring Bias',
    analysis_paralysis: 'Analysis Paralysis',
    overconfidence: 'Overconfidence',
    recency: 'Recency Bias',
  };

  return `${emoji} ${biasNames[detection.bias] || detection.bias} (${confidenceStr}% φ-confidence)
   ${detection.suggestion}`;
}

/**
 * Get current stats
 * @returns {Object} Bias detection stats
 */
function getStats() {
  return {
    ...biasState.stats,
    activeDetections: biasState.activeDetections.length,
    actionHistorySize: biasState.actionHistory.length,
    trackedFiles: Object.keys(biasState.fileEdits).length,
  };
}

/**
 * Reset session state (keep stats)
 */
function resetSession() {
  biasState.recentReads = 0;
  biasState.recentWrites = 0;
  biasState.activeDetections = [];
  biasState.currentApproach = null;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  DETECTION_THRESHOLD,
  HIGH_CONFIDENCE,
  SUNK_COST_FAILURES,
  ANCHORING_EDITS,
  PARALYSIS_READS,

  // Core functions
  init,
  recordAction,
  setApproach,
  detectBiases,
  acknowledgeBias,
  formatDetection,
  getStats,
  resetSession,

  // Individual detectors (for testing)
  detectSunkCost,
  detectAnchoring,
  detectAnalysisParalysis,
  detectOverconfidence,
  detectRecencyBias,
};
