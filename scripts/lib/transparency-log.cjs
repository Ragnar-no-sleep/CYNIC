/**
 * CYNIC Transparency Log (Phase 12C)
 *
 * "Παρρησία - speaking all, hiding nothing" - κυνικός
 *
 * Implements "public living" Cynic principle:
 * - Every decision is logged with rationale
 * - No hidden state or private contradictions
 * - Reasoning traces are always available
 * - User can introspect any decision
 *
 * Diogenes lived in public, hiding nothing.
 * CYNIC's reasoning lives in public, hiding nothing.
 *
 * @module cynic/lib/transparency-log
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

/** Maximum log entries in memory - φ × 100 ≈ 162 */
const MAX_MEMORY_ENTRIES = Math.round(PHI * 100);

/** Maximum reasoning steps per decision - φ × 5 ≈ 8 */
const MAX_REASONING_STEPS = Math.round(PHI * 5);

/** Contradiction severity threshold - φ⁻¹ */
const CONTRADICTION_THRESHOLD = PHI_INV;

/** Log retention days - φ × 20 ≈ 32 */
const LOG_RETENTION_DAYS = Math.round(PHI * 20);

// =============================================================================
// DECISION TYPES
// =============================================================================

const DECISION_TYPES = {
  judgment: {
    name: 'Judgment',
    description: 'Evaluation of code, behavior, or pattern',
    requiresRationale: true,
  },
  recommendation: {
    name: 'Recommendation',
    description: 'Suggestion for action or change',
    requiresRationale: true,
  },
  warning: {
    name: 'Warning',
    description: 'Alert about potential danger',
    requiresRationale: true,
  },
  approval: {
    name: 'Approval',
    description: 'Permission or validation',
    requiresRationale: true,
  },
  rejection: {
    name: 'Rejection',
    description: 'Denial or refusal',
    requiresRationale: true,
  },
  intervention: {
    name: 'Intervention',
    description: 'Proactive action taken',
    requiresRationale: true,
  },
  observation: {
    name: 'Observation',
    description: 'Pattern or fact noted',
    requiresRationale: false,
  },
  correction: {
    name: 'Correction',
    description: 'Self-correction of previous decision',
    requiresRationale: true,
  },
};

// =============================================================================
// STORAGE
// =============================================================================

const TRANSPARENCY_DIR = path.join(os.homedir(), '.cynic', 'transparency');
const STATE_FILE = path.join(TRANSPARENCY_DIR, 'state.json');
const LOG_FILE = path.join(TRANSPARENCY_DIR, 'decisions.jsonl');
const PRINCIPLES_FILE = path.join(TRANSPARENCY_DIR, 'principles.json');

// =============================================================================
// STATE
// =============================================================================

const transparencyState = {
  // Recent decisions (in memory for quick access)
  recentDecisions: [],

  // Stated principles (for contradiction detection)
  principles: [],

  // Contradiction history
  contradictions: [],

  // Statistics
  stats: {
    totalDecisions: 0,
    byType: {},
    contradictionsDetected: 0,
    correctionsIssued: 0,
    introspections: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(TRANSPARENCY_DIR)) {
    fs.mkdirSync(TRANSPARENCY_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (fs.existsSync(PRINCIPLES_FILE)) {
      state.principles = JSON.parse(fs.readFileSync(PRINCIPLES_FILE, 'utf8'));
    }
    return state;
  } catch {
    return null;
  }
}

function saveState() {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    stats: transparencyState.stats,
    contradictions: transparencyState.contradictions.slice(-50),
  }, null, 2));
  fs.writeFileSync(PRINCIPLES_FILE, JSON.stringify(transparencyState.principles, null, 2));
}

function appendLog(decision) {
  ensureDir();
  const line = JSON.stringify(decision) + '\n';
  fs.appendFileSync(LOG_FILE, line);
}

// =============================================================================
// DECISION LOGGING
// =============================================================================

/**
 * Log a decision with full transparency
 *
 * @param {string} type - Decision type
 * @param {Object} decision - Decision details
 * @returns {Object} Logged decision
 */
function logDecision(type, decision) {
  if (!DECISION_TYPES[type]) {
    return { error: `Unknown decision type: ${type}` };
  }

  const decisionType = DECISION_TYPES[type];

  // Validate rationale if required
  if (decisionType.requiresRationale && !decision.rationale) {
    return {
      error: 'Decision requires rationale',
      type,
      suggestion: 'Provide a reasoning chain explaining why',
    };
  }

  const id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const logEntry = {
    id,
    type,
    typeName: decisionType.name,
    subject: decision.subject,
    outcome: decision.outcome,
    rationale: decision.rationale || null,
    reasoningChain: decision.reasoningChain || [],
    confidence: decision.confidence || PHI_INV,
    context: decision.context || {},
    timestamp: Date.now(),
    principlesApplied: decision.principlesApplied || [],
  };

  // Check for contradictions
  const contradictions = checkContradictions(logEntry);
  if (contradictions.length > 0) {
    logEntry.contradictions = contradictions;
    transparencyState.contradictions.push(...contradictions);
    transparencyState.stats.contradictionsDetected += contradictions.length;
  }

  // Add to memory (keep bounded)
  transparencyState.recentDecisions.push(logEntry);
  if (transparencyState.recentDecisions.length > MAX_MEMORY_ENTRIES) {
    transparencyState.recentDecisions = transparencyState.recentDecisions.slice(
      -MAX_MEMORY_ENTRIES
    );
  }

  // Update stats
  transparencyState.stats.totalDecisions++;
  transparencyState.stats.byType[type] = (transparencyState.stats.byType[type] || 0) + 1;

  // Persist
  appendLog(logEntry);
  saveState();

  return {
    logged: true,
    decision: logEntry,
    contradictions: contradictions.length > 0 ? contradictions : null,
  };
}

/**
 * Add a reasoning step to build a chain
 *
 * @param {string[]} chain - Existing chain
 * @param {string} step - New step
 * @param {Object} evidence - Supporting evidence
 * @returns {Object[]} Updated chain
 */
function addReasoningStep(chain, step, evidence = {}) {
  if (chain.length >= MAX_REASONING_STEPS) {
    return {
      error: 'Max reasoning steps reached',
      chain,
    };
  }

  const reasoningStep = {
    step: chain.length + 1,
    content: step,
    evidence,
    timestamp: Date.now(),
  };

  return [...chain, reasoningStep];
}

// =============================================================================
// PRINCIPLE MANAGEMENT
// =============================================================================

/**
 * State a principle that CYNIC follows
 *
 * @param {string} principle - The principle statement
 * @param {Object} options - Options
 * @returns {Object} Stated principle
 */
function statePrinciple(principle, options = {}) {
  const id = `prin-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`;

  const principleEntry = {
    id,
    statement: principle,
    domain: options.domain || 'general',
    strength: options.strength || 1.0,
    examples: options.examples || [],
    exceptions: options.exceptions || [],
    statedAt: Date.now(),
    appliedCount: 0,
  };

  transparencyState.principles.push(principleEntry);
  saveState();

  return principleEntry;
}

/**
 * Get all stated principles
 *
 * @returns {Object[]} Principles
 */
function getPrinciples() {
  return [...transparencyState.principles];
}

/**
 * Mark a principle as applied
 *
 * @param {string} principleId - Principle ID
 */
function markPrincipleApplied(principleId) {
  const principle = transparencyState.principles.find(p => p.id === principleId);
  if (principle) {
    principle.appliedCount++;
    principle.lastApplied = Date.now();
    saveState();
  }
}

// =============================================================================
// CONTRADICTION DETECTION
// =============================================================================

/**
 * Check for contradictions between a new decision and stated principles/past decisions
 *
 * @param {Object} decision - New decision
 * @returns {Object[]} Contradictions found
 */
function checkContradictions(decision) {
  const contradictions = [];

  // Check against principles
  for (const principle of transparencyState.principles) {
    const contradiction = checkPrincipleContradiction(decision, principle);
    if (contradiction) {
      contradictions.push(contradiction);
    }
  }

  // Check against recent similar decisions
  const similarDecisions = transparencyState.recentDecisions.filter(
    d => d.type === decision.type && d.subject === decision.subject
  );

  for (const past of similarDecisions.slice(-5)) {
    const contradiction = checkDecisionContradiction(decision, past);
    if (contradiction) {
      contradictions.push(contradiction);
    }
  }

  return contradictions;
}

/**
 * Check if decision contradicts a principle
 */
function checkPrincipleContradiction(decision, principle) {
  // Simple keyword-based contradiction detection
  // A more sophisticated version would use semantic analysis

  const negationPatterns = [
    { positive: 'always', negative: 'never' },
    { positive: 'approve', negative: 'reject' },
    { positive: 'allow', negative: 'deny' },
    { positive: 'trust', negative: 'distrust' },
    { positive: 'recommend', negative: 'discourage' },
  ];

  const decisionText = JSON.stringify(decision).toLowerCase();
  const principleText = principle.statement.toLowerCase();

  for (const pattern of negationPatterns) {
    if (
      (principleText.includes(pattern.positive) && decisionText.includes(pattern.negative)) ||
      (principleText.includes(pattern.negative) && decisionText.includes(pattern.positive))
    ) {
      return {
        type: 'principle_violation',
        principle: principle.statement,
        principleId: principle.id,
        decision: decision.outcome,
        severity: principle.strength * CONTRADICTION_THRESHOLD,
        message: `*GROWL* Decision may contradict principle: "${principle.statement}"`,
      };
    }
  }

  return null;
}

/**
 * Check if decision contradicts a past decision
 */
function checkDecisionContradiction(current, past) {
  // Check if outcomes conflict for same subject
  if (current.outcome !== past.outcome) {
    // Different outcomes might be contradiction
    const timeDiff = current.timestamp - past.timestamp;
    const hoursDiff = timeDiff / (3600 * 1000);

    // Only flag if recent (within φ hours)
    if (hoursDiff < PHI) {
      return {
        type: 'decision_inconsistency',
        pastDecision: past.id,
        pastOutcome: past.outcome,
        currentOutcome: current.outcome,
        hoursSince: Math.round(hoursDiff * 10) / 10,
        message: `*head tilt* This differs from decision ${past.id} made ${Math.round(hoursDiff * 60)} minutes ago.`,
      };
    }
  }

  return null;
}

// =============================================================================
// INTROSPECTION
// =============================================================================

/**
 * Introspect a specific decision
 *
 * @param {string} decisionId - Decision ID
 * @returns {Object} Full decision details
 */
function introspect(decisionId) {
  transparencyState.stats.introspections++;

  // Search in memory
  let decision = transparencyState.recentDecisions.find(d => d.id === decisionId);

  if (!decision) {
    // Search in log file
    decision = searchLogFile(decisionId);
  }

  if (!decision) {
    return {
      error: 'Decision not found',
      suggestion: 'Decision may have been pruned or ID is incorrect',
    };
  }

  // Enrich with related information
  return {
    decision,
    relatedPrinciples: getRelatedPrinciples(decision),
    relatedDecisions: getRelatedDecisions(decision),
    reasoningExplanation: explainReasoning(decision),
  };
}

/**
 * Search log file for a decision
 */
function searchLogFile(decisionId) {
  if (!fs.existsSync(LOG_FILE)) return null;

  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.id === decisionId) return entry;
    } catch {
      // Skip malformed lines
    }
  }

  return null;
}

/**
 * Get principles related to a decision
 */
function getRelatedPrinciples(decision) {
  return decision.principlesApplied?.map(id =>
    transparencyState.principles.find(p => p.id === id)
  ).filter(Boolean) || [];
}

/**
 * Get decisions related to a decision
 */
function getRelatedDecisions(decision) {
  return transparencyState.recentDecisions
    .filter(d => d.id !== decision.id && d.subject === decision.subject)
    .slice(-5);
}

/**
 * Generate human-readable explanation of reasoning
 */
function explainReasoning(decision) {
  if (!decision.reasoningChain || decision.reasoningChain.length === 0) {
    return decision.rationale || 'No reasoning chain recorded.';
  }

  const steps = decision.reasoningChain.map((step, i) =>
    `${i + 1}. ${step.content}`
  ).join('\n');

  return [
    `Reasoning for "${decision.outcome}":`,
    '',
    steps,
    '',
    `Confidence: ${Math.round((decision.confidence || PHI_INV) * 100)}%`,
  ].join('\n');
}

/**
 * Query decisions by criteria
 *
 * @param {Object} criteria - Query criteria
 * @returns {Object[]} Matching decisions
 */
function queryDecisions(criteria) {
  let results = [...transparencyState.recentDecisions];

  if (criteria.type) {
    results = results.filter(d => d.type === criteria.type);
  }

  if (criteria.subject) {
    results = results.filter(d =>
      d.subject?.toLowerCase().includes(criteria.subject.toLowerCase())
    );
  }

  if (criteria.since) {
    results = results.filter(d => d.timestamp >= criteria.since);
  }

  if (criteria.hasContradiction) {
    results = results.filter(d => d.contradictions && d.contradictions.length > 0);
  }

  return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, criteria.limit || 20);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize transparency log
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    transparencyState.stats = {
      totalDecisions: saved.stats?.totalDecisions || 0,
      byType: saved.stats?.byType || {},
      contradictionsDetected: saved.stats?.contradictionsDetected || 0,
      correctionsIssued: saved.stats?.correctionsIssued || 0,
      introspections: saved.stats?.introspections || 0,
    };
    transparencyState.principles = saved.principles || [];
    transparencyState.contradictions = saved.contradictions || [];
  }

  // Seed with core CYNIC principles if empty
  if (transparencyState.principles.length === 0) {
    seedCorePrinciples();
  }
}

/**
 * Seed core CYNIC principles
 */
function seedCorePrinciples() {
  const corePrinciples = [
    {
      statement: 'Maximum confidence is φ⁻¹ (61.8%)',
      domain: 'epistemology',
      strength: 1.0,
    },
    {
      statement: 'Verify before trusting',
      domain: 'security',
      strength: 1.0,
    },
    {
      statement: 'Simplicity over complexity (BURN)',
      domain: 'design',
      strength: 0.8,
    },
    {
      statement: 'Loyal to truth, not to comfort',
      domain: 'communication',
      strength: 1.0,
    },
    {
      statement: 'Culture is a moat - respect patterns',
      domain: 'code',
      strength: 0.7,
    },
  ];

  for (const p of corePrinciples) {
    statePrinciple(p.statement, { domain: p.domain, strength: p.strength });
  }
}

/**
 * Get statistics
 *
 * @returns {Object} Stats
 */
function getStats() {
  return {
    ...transparencyState.stats,
    principleCount: transparencyState.principles.length,
    recentDecisionCount: transparencyState.recentDecisions.length,
  };
}

/**
 * Format status for display
 *
 * @returns {string} Formatted status
 */
function formatStatus() {
  const stats = getStats();
  const recent = transparencyState.recentDecisions.slice(-5);

  const lines = [
    '── TRANSPARENCY LOG ───────────────────────────────────────',
    `   Total Decisions: ${stats.totalDecisions}`,
    `   Principles: ${stats.principleCount}`,
    `   Contradictions: ${stats.contradictionsDetected}`,
    `   Introspections: ${stats.introspections}`,
  ];

  if (Object.keys(stats.byType).length > 0) {
    lines.push('');
    lines.push('   Decision types:');
    for (const [type, count] of Object.entries(stats.byType)) {
      lines.push(`   • ${type}: ${count}`);
    }
  }

  if (recent.length > 0) {
    lines.push('');
    lines.push('   Recent decisions:');
    for (const d of recent) {
      const outcome = d.outcome?.slice(0, 30) || '(none)';
      lines.push(`   • [${d.type}] ${outcome}...`);
    }
  }

  lines.push('');
  lines.push('   *sniff* All decisions logged. Nothing hidden.');

  return lines.join('\n');
}

/**
 * Get recent contradictions
 *
 * @returns {Object[]} Recent contradictions
 */
function getContradictions() {
  return [...transparencyState.contradictions].slice(-20);
}

/**
 * Issue a correction (acknowledges and corrects a past decision)
 *
 * @param {string} originalId - Original decision ID
 * @param {string} correction - Correction explanation
 * @returns {Object} Correction logged
 */
function issueCorrection(originalId, correction) {
  transparencyState.stats.correctionsIssued++;

  return logDecision('correction', {
    subject: `Correction of ${originalId}`,
    outcome: correction,
    rationale: `Self-correction: Previous decision ${originalId} was reconsidered.`,
    context: { originalDecision: originalId },
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  MAX_MEMORY_ENTRIES,
  MAX_REASONING_STEPS,
  DECISION_TYPES,

  // Core functions
  init,
  logDecision,
  addReasoningStep,

  // Principles
  statePrinciple,
  getPrinciples,
  markPrincipleApplied,

  // Introspection
  introspect,
  queryDecisions,

  // Contradictions
  checkContradictions,
  getContradictions,
  issueCorrection,

  // Stats and display
  getStats,
  formatStatus,
};
