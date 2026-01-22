/**
 * CYNIC Definition Tracker (Phase 12B)
 *
 * "Ὅρος - the boundary of meaning" - κυνικός
 *
 * Socratic definition tracking:
 * - Track how user defines terms
 * - Notice definition drift over time
 * - Genus + Differentia structure
 * - Progressive narrowing through questions
 *
 * "The beginning of wisdom is the definition of terms." - Socrates
 *
 * @module cynic/lib/definition-tracker
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

/** Maximum tracked terms - φ × 50 ≈ 81 */
const MAX_TRACKED_TERMS = Math.round(PHI * 50);

/** Definition similarity threshold for drift detection - φ⁻¹ */
const DRIFT_THRESHOLD = PHI_INV;

/** Max definition history per term - φ × 5 ≈ 8 */
const MAX_DEFINITION_HISTORY = Math.round(PHI * 5);

/** Questions before suggesting definition - φ × 2 ≈ 3 */
const QUESTIONS_BEFORE_SUGGEST = Math.round(PHI * 2);

// =============================================================================
// STORAGE
// =============================================================================

const DEFINITION_DIR = path.join(os.homedir(), '.cynic', 'definitions');
const STATE_FILE = path.join(DEFINITION_DIR, 'state.json');
const TERMS_FILE = path.join(DEFINITION_DIR, 'terms.json');
const HISTORY_FILE = path.join(DEFINITION_DIR, 'history.jsonl');

// =============================================================================
// STATE
// =============================================================================

const definitionState = {
  // Tracked terms and their definitions
  terms: {},

  // Session vocabulary (terms used this session)
  sessionVocabulary: new Set(),

  // Ambiguous terms (flagged for clarification)
  ambiguous: new Set(),

  // Statistics
  stats: {
    totalTerms: 0,
    definitionsRecorded: 0,
    driftsDetected: 0,
    clarificationsAsked: 0,
    narrowingsAchieved: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(DEFINITION_DIR)) {
    fs.mkdirSync(DEFINITION_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (fs.existsSync(TERMS_FILE)) {
      state.terms = JSON.parse(fs.readFileSync(TERMS_FILE, 'utf8'));
    }
    return state;
  } catch {
    return null;
  }
}

function saveState() {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    stats: definitionState.stats,
  }, null, 2));
  fs.writeFileSync(TERMS_FILE, JSON.stringify(definitionState.terms, null, 2));
}

function appendHistory(event) {
  ensureDir();
  const line = JSON.stringify({ ...event, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(HISTORY_FILE, line);
}

// =============================================================================
// TERM MANAGEMENT
// =============================================================================

/**
 * Record a definition for a term
 *
 * @param {string} term - The term being defined
 * @param {string} definition - The definition
 * @param {Object} structure - Optional: genus/differentia structure
 * @returns {Object} Recording result
 */
function recordDefinition(term, definition, structure = {}) {
  const termLower = term.toLowerCase();

  // Check capacity
  if (!definitionState.terms[termLower] &&
      Object.keys(definitionState.terms).length >= MAX_TRACKED_TERMS) {
    pruneOldestTerms();
  }

  // Initialize or update term
  if (!definitionState.terms[termLower]) {
    definitionState.terms[termLower] = {
      term: termLower,
      canonical: term,
      definitions: [],
      currentDefinition: null,
      genus: null,
      differentia: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    definitionState.stats.totalTerms++;
  }

  const termEntry = definitionState.terms[termLower];

  // Check for drift
  const drift = termEntry.currentDefinition
    ? detectDrift(termEntry.currentDefinition, definition)
    : null;

  // Add to history
  const defRecord = {
    definition,
    genus: structure.genus || extractGenus(definition),
    differentia: structure.differentia || extractDifferentia(definition),
    timestamp: Date.now(),
    drift: drift?.score || 0,
  };

  termEntry.definitions.push(defRecord);
  if (termEntry.definitions.length > MAX_DEFINITION_HISTORY) {
    termEntry.definitions = termEntry.definitions.slice(-MAX_DEFINITION_HISTORY);
  }

  termEntry.currentDefinition = definition;
  termEntry.genus = defRecord.genus;
  termEntry.differentia = defRecord.differentia;
  termEntry.lastUpdated = Date.now();

  definitionState.stats.definitionsRecorded++;
  definitionState.sessionVocabulary.add(termLower);

  appendHistory({
    type: 'definition_recorded',
    term: termLower,
    definition,
    drift: drift?.score,
  });

  saveState();

  return {
    term: termLower,
    recorded: true,
    drift,
    structure: {
      genus: defRecord.genus,
      differentia: defRecord.differentia,
    },
  };
}

/**
 * Prune oldest terms to make room
 */
function pruneOldestTerms() {
  const sorted = Object.entries(definitionState.terms)
    .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

  const toRemove = sorted.slice(0, Math.round(MAX_TRACKED_TERMS * PHI_INV_3));
  for (const [key] of toRemove) {
    delete definitionState.terms[key];
  }
}

// =============================================================================
// DRIFT DETECTION
// =============================================================================

/**
 * Detect definition drift between two definitions
 *
 * @param {string} old - Previous definition
 * @param {string} current - New definition
 * @returns {Object|null} Drift analysis
 */
function detectDrift(old, current) {
  if (!old || !current) return null;

  const oldWords = new Set(old.toLowerCase().split(/\s+/));
  const newWords = new Set(current.toLowerCase().split(/\s+/));

  // Calculate Jaccard similarity
  const intersection = new Set([...oldWords].filter(x => newWords.has(x)));
  const union = new Set([...oldWords, ...newWords]);

  const similarity = intersection.size / union.size;
  const driftScore = 1 - similarity;

  if (driftScore > DRIFT_THRESHOLD) {
    definitionState.stats.driftsDetected++;

    return {
      detected: true,
      score: Math.round(driftScore * 100) / 100,
      similarity: Math.round(similarity * 100) / 100,
      addedConcepts: [...newWords].filter(x => !oldWords.has(x)).slice(0, 5),
      removedConcepts: [...oldWords].filter(x => !newWords.has(x)).slice(0, 5),
      message: generateDriftMessage(old, current, driftScore),
    };
  }

  return {
    detected: false,
    score: Math.round(driftScore * 100) / 100,
    similarity: Math.round(similarity * 100) / 100,
  };
}

/**
 * Generate drift warning message
 */
function generateDriftMessage(old, current, score) {
  const messages = [
    `*head tilt* Definition has drifted ${Math.round(score * 100)}%.`,
    `Earlier: "${old.slice(0, 50)}..."`,
    `Now: "${current.slice(0, 50)}..."`,
    'Intentional refinement or accidental shift?',
  ];
  return messages.join('\n');
}

// =============================================================================
// GENUS & DIFFERENTIA EXTRACTION
// =============================================================================

/**
 * Extract genus (type/category) from a definition
 * "X is a Y that..." → Y is the genus
 *
 * @param {string} definition - The definition
 * @returns {string|null} Genus
 */
function extractGenus(definition) {
  // Patterns for genus extraction
  const patterns = [
    /is\s+(?:a|an)\s+(\w+(?:\s+\w+)?)\s+(?:that|which|where)/i,
    /is\s+(?:a|an)\s+(?:type|kind|form)\s+of\s+(\w+(?:\s+\w+)?)/i,
    /is\s+(?:a|an)\s+(\w+(?:\s+\w+)?)\s+for/i,
    /is\s+(?:a|an)\s+(\w+(?:\s+\w+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = definition.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Extract differentia (distinguishing characteristics)
 * "X is a Y that does Z" → Z is differentia
 *
 * @param {string} definition - The definition
 * @returns {string[]} Differentia
 */
function extractDifferentia(definition) {
  const differentia = [];

  // Patterns for differentia
  const patterns = [
    /that\s+(.+?)(?:\.|$)/i,
    /which\s+(.+?)(?:\.|$)/i,
    /where\s+(.+?)(?:\.|$)/i,
    /by\s+(.+?)(?:\.|$)/i,
    /for\s+(.+?)(?:\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = definition.match(pattern);
    if (match) {
      differentia.push(match[1].trim().toLowerCase());
    }
  }

  return differentia;
}

// =============================================================================
// SOCRATIC QUESTIONING
// =============================================================================

/**
 * Generate clarification question for ambiguous term
 *
 * @param {string} term - Term to clarify
 * @param {string} context - Context where term was used
 * @returns {Object} Question
 */
function askClarification(term, context = '') {
  const termLower = term.toLowerCase();
  const existing = definitionState.terms[termLower];

  definitionState.stats.clarificationsAsked++;
  definitionState.ambiguous.add(termLower);

  const questions = [];

  if (!existing) {
    // No prior definition
    questions.push({
      type: 'initial',
      question: `*head tilt* What do you mean by "${term}"?`,
      followUp: 'Can you give an example?',
    });
  } else if (existing.genus && existing.differentia.length === 0) {
    // Has genus but no differentia
    questions.push({
      type: 'differentia',
      question: `*sniff* You said "${term}" is a ${existing.genus}. What makes it different from other ${existing.genus}s?`,
      current: existing.currentDefinition,
    });
  } else if (!existing.genus) {
    // No genus
    questions.push({
      type: 'genus',
      question: `*ears perk* What TYPE of thing is "${term}"? What category does it belong to?`,
      current: existing.currentDefinition,
    });
  } else {
    // Has both - check for specificity
    questions.push({
      type: 'refinement',
      question: `*head tilt* You defined "${term}" as: "${existing.currentDefinition}". Is this still accurate?`,
      current: existing.currentDefinition,
    });
  }

  return {
    term: termLower,
    questions,
    existingDefinition: existing?.currentDefinition || null,
    structure: existing ? {
      genus: existing.genus,
      differentia: existing.differentia,
    } : null,
  };
}

/**
 * Generate progressive narrowing questions
 *
 * @param {string} term - Term to narrow
 * @returns {Object[]} Series of narrowing questions
 */
function generateNarrowingQuestions(term) {
  const termLower = term.toLowerCase();
  const existing = definitionState.terms[termLower];

  const questions = [
    {
      level: 1,
      type: 'existence',
      question: `Does "${term}" actually exist, or is it a convenient abstraction?`,
    },
    {
      level: 2,
      type: 'genus',
      question: `What is "${term}" a type/kind of?`,
    },
    {
      level: 3,
      type: 'differentia',
      question: `What makes "${term}" different from others in its category?`,
    },
    {
      level: 4,
      type: 'boundary',
      question: `What is NOT "${term}"? What are its boundaries?`,
    },
    {
      level: 5,
      type: 'essence',
      question: `If you removed everything non-essential, what would "${term}" be?`,
    },
  ];

  return {
    term: termLower,
    currentDefinition: existing?.currentDefinition || null,
    questions,
    message: `*head tilt* Let us examine "${term}" more closely. Ti esti?`,
  };
}

/**
 * Validate a definition structure
 *
 * @param {string} term - Term
 * @param {string} definition - Definition to validate
 * @returns {Object} Validation result
 */
function validateDefinition(term, definition) {
  const issues = [];
  const suggestions = [];

  const genus = extractGenus(definition);
  const differentia = extractDifferentia(definition);

  // Check for genus
  if (!genus) {
    issues.push('No clear genus (category/type)');
    suggestions.push(`Try: "${term} is a [type] that [distinguishing feature]"`);
  }

  // Check for differentia
  if (differentia.length === 0) {
    issues.push('No clear differentia (distinguishing features)');
    suggestions.push('Add what makes this different from similar things');
  }

  // Check for circular definition
  if (definition.toLowerCase().includes(term.toLowerCase())) {
    issues.push('Circular definition (uses the term being defined)');
    suggestions.push('Remove the term from its own definition');
  }

  // Check for vagueness
  const vagueTerms = ['thing', 'stuff', 'something', 'whatever', 'etc'];
  for (const vague of vagueTerms) {
    if (definition.toLowerCase().includes(vague)) {
      issues.push(`Contains vague term: "${vague}"`);
      suggestions.push(`Replace "${vague}" with a specific term`);
    }
  }

  const score = 100 - (issues.length * 25);

  return {
    term: term.toLowerCase(),
    definition,
    valid: issues.length === 0,
    score: Math.max(0, score),
    genus,
    differentia,
    issues,
    suggestions,
    message: issues.length === 0
      ? '*tail wag* Clear definition with genus and differentia.'
      : `*sniff* Definition could be sharper. ${issues.length} issues found.`,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize definition tracker
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    definitionState.stats = saved.stats || definitionState.stats;
    definitionState.terms = saved.terms || {};
  }
}

/**
 * Get a term's definition
 *
 * @param {string} term - Term to look up
 * @returns {Object|null} Term entry
 */
function getTerm(term) {
  return definitionState.terms[term.toLowerCase()] || null;
}

/**
 * Get all tracked terms
 *
 * @returns {Object} All terms
 */
function getAllTerms() {
  return { ...definitionState.terms };
}

/**
 * Get session vocabulary
 *
 * @returns {string[]} Terms used this session
 */
function getSessionVocabulary() {
  return Array.from(definitionState.sessionVocabulary);
}

/**
 * Mark term as used (without full definition)
 *
 * @param {string} term - Term used
 */
function markUsed(term) {
  definitionState.sessionVocabulary.add(term.toLowerCase());
}

/**
 * Get statistics
 *
 * @returns {Object} Stats
 */
function getStats() {
  return {
    ...definitionState.stats,
    activeTerms: Object.keys(definitionState.terms).length,
    sessionTerms: definitionState.sessionVocabulary.size,
    ambiguousTerms: definitionState.ambiguous.size,
  };
}

/**
 * Format status for display
 *
 * @returns {string} Formatted status
 */
function formatStatus() {
  const stats = getStats();
  const terms = Object.values(definitionState.terms);

  const lines = [
    '── DEFINITION TRACKER ─────────────────────────────────────',
    `   Tracked Terms: ${stats.activeTerms}`,
    `   Definitions Recorded: ${stats.definitionsRecorded}`,
    `   Drifts Detected: ${stats.driftsDetected}`,
    `   Clarifications Asked: ${stats.clarificationsAsked}`,
  ];

  // Show recent definitions
  const recent = terms
    .sort((a, b) => b.lastUpdated - a.lastUpdated)
    .slice(0, 5);

  if (recent.length > 0) {
    lines.push('');
    lines.push('   Recent definitions:');
    for (const term of recent) {
      const def = term.currentDefinition?.slice(0, 40) || '(none)';
      const genus = term.genus ? `[${term.genus}]` : '';
      lines.push(`   • ${term.canonical}: ${def}... ${genus}`);
    }
  }

  // Show ambiguous terms
  if (definitionState.ambiguous.size > 0) {
    lines.push('');
    lines.push('   ⚠️ Ambiguous (need clarification):');
    for (const term of Array.from(definitionState.ambiguous).slice(0, 3)) {
      lines.push(`   • ${term}`);
    }
  }

  lines.push('');
  lines.push('   *sniff* "The beginning of wisdom is the definition of terms."');

  return lines.join('\n');
}

/**
 * Clear ambiguous flag for a term
 *
 * @param {string} term - Term to clear
 */
function clearAmbiguous(term) {
  definitionState.ambiguous.delete(term.toLowerCase());
}

/**
 * Start new session (clear session vocabulary)
 */
function startSession() {
  definitionState.sessionVocabulary = new Set();
  definitionState.ambiguous = new Set();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  MAX_TRACKED_TERMS,
  DRIFT_THRESHOLD,
  MAX_DEFINITION_HISTORY,

  // Core functions
  init,
  recordDefinition,
  getTerm,
  getAllTerms,
  markUsed,

  // Socratic questioning
  askClarification,
  generateNarrowingQuestions,
  validateDefinition,

  // Drift detection
  detectDrift,

  // Structure extraction
  extractGenus,
  extractDifferentia,

  // Session management
  startSession,
  getSessionVocabulary,
  clearAmbiguous,

  // Stats and display
  getStats,
  formatStatus,
};
