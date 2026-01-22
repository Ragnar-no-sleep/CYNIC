/**
 * CYNIC Elenchus Engine - Socratic Questioning (Phase 6B)
 *
 * "Ἔλεγχος - l'art de questionner pour révéler la vérité" - κυνικός
 *
 * Implements the Socratic method of elenchus:
 * - Systematic refutation through questioning
 * - Contradiction detection
 * - Definition tracking
 * - Maieutic guidance (help user discover truth)
 *
 * @module cynic/lib/elenchus-engine
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI_INV, PHI_INV_2, PHI_INV_3 } = phiMath;

// =============================================================================
// CONSTANTS (φ-derived)
// =============================================================================

/** Maximum questions before synthesis - φ⁻¹ × 8 ≈ 5 */
const MAX_QUESTIONS = Math.round(PHI_INV * 8);

/** Minimum questions before synthesis */
const MIN_QUESTIONS = 2;

/** Question cooldown in seconds - φ⁻² × 100 ≈ 38s */
const QUESTION_COOLDOWN_SEC = Math.round(PHI_INV_2 * 100);

/** Definition drift threshold - φ⁻³ */
const DEFINITION_DRIFT_THRESHOLD = PHI_INV_3;

/** Confidence threshold for contradiction - φ⁻¹ */
const CONTRADICTION_THRESHOLD = PHI_INV;

// =============================================================================
// STORAGE
// =============================================================================

const ELENCHUS_DIR = path.join(os.homedir(), '.cynic', 'elenchus');
const STATE_FILE = path.join(ELENCHUS_DIR, 'state.json');
const DEFINITIONS_FILE = path.join(ELENCHUS_DIR, 'definitions.json');
const HISTORY_FILE = path.join(ELENCHUS_DIR, 'history.jsonl');

// =============================================================================
// STATE
// =============================================================================

const elenchusState = {
  currentDialogue: {
    topic: null,
    assertions: [],       // User's assertions
    questions: [],        // Questions asked
    questionsRemaining: MAX_QUESTIONS,
    startTime: null,
    definitions: {},      // Definitions in this dialogue
  },
  globalDefinitions: {},  // Cross-session definitions
  stats: {
    dialogues: 0,
    contradictionsFound: 0,
    insightsGenerated: 0,
    definitionDrifts: 0,
  },
  lastQuestionTime: null,
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(ELENCHUS_DIR)) {
    fs.mkdirSync(ELENCHUS_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveState() {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    stats: elenchusState.stats,
    globalDefinitions: elenchusState.globalDefinitions,
    lastQuestionTime: elenchusState.lastQuestionTime,
  }, null, 2));
}

function loadDefinitions() {
  ensureDir();
  if (!fs.existsSync(DEFINITIONS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DEFINITIONS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveDefinitions() {
  ensureDir();
  fs.writeFileSync(DEFINITIONS_FILE, JSON.stringify(elenchusState.globalDefinitions, null, 2));
}

function appendToHistory(entry) {
  ensureDir();
  const line = JSON.stringify({ ...entry, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(HISTORY_FILE, line);
}

// =============================================================================
// QUESTION GENERATION
// =============================================================================

/**
 * Question templates for different assertion types
 */
const QUESTION_TEMPLATES = {
  // When user makes a claim
  claim: [
    'Si {assertion} est vrai, quelles seraient les conséquences?',
    'Qu\'est-ce qui vous fait penser que {assertion}?',
    'Y a-t-il des cas où {assertion} ne serait pas vrai?',
    'Comment définissez-vous {key_term}?',
    'Que signifierait le contraire de {assertion}?',
  ],

  // When user makes a decision
  decision: [
    'Quelles alternatives avez-vous considérées?',
    'Quels seraient les risques de cette approche?',
    'Comment saurez-vous si cette décision était bonne?',
    'Qui d\'autre serait affecté par {assertion}?',
    'Que feriez-vous si cela échouait?',
  ],

  // When user defines something
  definition: [
    'Cette définition couvre-t-elle tous les cas?',
    'Qu\'est-ce qui distingue {term} de {similar_term}?',
    'Un exemple qui ne correspond pas à cette définition?',
    'Cette définition est-elle la même qu\'avant?',
  ],

  // When contradiction detected
  contradiction: [
    'Plus tôt, vous avez dit {previous}. Comment réconcilier?',
    'Ces deux positions sont-elles compatibles?',
    'Laquelle de ces vues reflète mieux votre pensée?',
  ],

  // Maieutic (helping birth understanding)
  maieutic: [
    'Qu\'est-ce que cela implique?',
    'Où cela mène-t-il?',
    'Qu\'avez-vous appris de cela?',
    'Comment cette réalisation change-t-elle votre approche?',
  ],
};

/**
 * Detect assertion type from text
 * @param {string} text - User's assertion
 * @returns {string} Assertion type
 */
function detectAssertionType(text) {
  const lower = text.toLowerCase();

  // Decision patterns
  if (/^(je vais|on va|faisons|let'?s|I'?ll|we should|décidons)/.test(lower)) {
    return 'decision';
  }

  // Definition patterns
  if (/^(c'est|c'est-à-dire|means|is defined as|signifie)/.test(lower) ||
      /^([a-z]+) (est|is|=|:=)/.test(lower)) {
    return 'definition';
  }

  // Default to claim
  return 'claim';
}

/**
 * Extract key terms from assertion
 * @param {string} text - User's assertion
 * @returns {string[]} Key terms
 */
function extractKeyTerms(text) {
  // Simple extraction: words > 4 chars, not common words
  const commonWords = new Set([
    'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should',
    'which', 'there', 'their', 'about', 'these', 'those', 'being', 'where',
    'pour', 'dans', 'avec', 'cette', 'sont', 'nous', 'vous', 'elles', 'mais',
    'faire', 'comme', 'plus', 'tout', 'bien', 'peut', 'entre', 'autre',
  ]);

  const words = text.match(/\b[a-zA-ZÀ-ÿ]{4,}\b/g) || [];
  return words
    .filter(w => !commonWords.has(w.toLowerCase()))
    .slice(0, 5);
}

/**
 * Generate a Socratic question for an assertion
 * @param {string} assertion - User's assertion
 * @param {Object} context - Dialogue context
 * @returns {Object} Question with metadata
 */
function generateQuestion(assertion, context = {}) {
  const type = detectAssertionType(assertion);
  const keyTerms = extractKeyTerms(assertion);
  const templates = QUESTION_TEMPLATES[type] || QUESTION_TEMPLATES.claim;

  // Check for contradictions first
  const contradiction = detectContradiction(assertion, context.previousAssertions || []);
  if (contradiction && contradiction.confidence >= CONTRADICTION_THRESHOLD) {
    const contradictionTemplates = QUESTION_TEMPLATES.contradiction;
    const template = contradictionTemplates[Math.floor(Math.random() * contradictionTemplates.length)];
    return {
      question: template
        .replace('{previous}', contradiction.previous.slice(0, 50))
        .replace('{assertion}', assertion.slice(0, 50)),
      type: 'contradiction',
      confidence: contradiction.confidence,
      metadata: { contradiction },
    };
  }

  // Check for definition drift
  const drift = detectDefinitionDrift(assertion, keyTerms, context.definitions || {});
  if (drift && drift.confidence >= DEFINITION_DRIFT_THRESHOLD) {
    return {
      question: `Votre définition de "${drift.term}" a changé. Avant: "${drift.previous}". Maintenant?`,
      type: 'definition_drift',
      confidence: drift.confidence,
      metadata: { drift },
    };
  }

  // Regular question
  const template = templates[Math.floor(Math.random() * templates.length)];
  const keyTerm = keyTerms[0] || 'cela';

  return {
    question: template
      .replace('{assertion}', assertion.slice(0, 50))
      .replace('{key_term}', keyTerm)
      .replace('{term}', keyTerm)
      .replace('{similar_term}', 'un concept proche'),
    type,
    confidence: PHI_INV_2, // Moderate confidence
    metadata: { keyTerms },
  };
}

// =============================================================================
// CONTRADICTION DETECTION
// =============================================================================

/**
 * Simple contradiction detection using semantic similarity
 * @param {string} current - Current assertion
 * @param {string[]} previous - Previous assertions
 * @returns {Object|null} Contradiction if found
 */
function detectContradiction(current, previous) {
  if (!previous || previous.length === 0) return null;

  const currentLower = current.toLowerCase();

  // Simple negation patterns
  const negationPairs = [
    [/\btoujours\b/, /\bjamais\b/],
    [/\btout\b/, /\brien\b/],
    [/\bdoit\b/, /\bne.*pas\b/],
    [/\bmeilleur\b/, /\bpire\b/],
    [/\bvrai\b/, /\bfaux\b/],
    [/\byes\b/, /\bno\b/],
    [/\balways\b/, /\bnever\b/],
    [/\ball\b/, /\bnone\b/],
    [/\bmust\b/, /\bshould not\b/],
    [/\bbetter\b/, /\bworse\b/],
    [/\btrue\b/, /\bfalse\b/],
  ];

  for (const prev of previous) {
    const prevLower = prev.toLowerCase();

    for (const [pattern1, pattern2] of negationPairs) {
      if ((pattern1.test(currentLower) && pattern2.test(prevLower)) ||
          (pattern2.test(currentLower) && pattern1.test(prevLower))) {
        return {
          previous: prev,
          current,
          confidence: PHI_INV,
          type: 'negation',
        };
      }
    }
  }

  return null;
}

/**
 * Detect if a definition has changed (drift)
 * @param {string} assertion - Current assertion
 * @param {string[]} keyTerms - Key terms in assertion
 * @param {Object} definitions - Known definitions
 * @returns {Object|null} Drift if found
 */
function detectDefinitionDrift(assertion, keyTerms, definitions) {
  for (const term of keyTerms) {
    const termLower = term.toLowerCase();
    if (definitions[termLower]) {
      const previousDef = definitions[termLower];
      // Check if assertion contains a new definition
      if (assertion.includes('est') || assertion.includes('is') ||
          assertion.includes('=') || assertion.includes('signifie')) {
        return {
          term,
          previous: previousDef,
          confidence: PHI_INV_2,
        };
      }
    }
  }
  return null;
}

// =============================================================================
// DIALOGUE MANAGEMENT
// =============================================================================

/**
 * Start a new Socratic dialogue
 * @param {string} topic - Dialogue topic
 */
function startDialogue(topic) {
  elenchusState.currentDialogue = {
    topic,
    assertions: [],
    questions: [],
    questionsRemaining: MAX_QUESTIONS,
    startTime: Date.now(),
    definitions: { ...elenchusState.globalDefinitions },
  };

  appendToHistory({
    type: 'dialogue_start',
    topic,
  });
}

/**
 * Process a user assertion
 * @param {string} assertion - User's assertion
 * @returns {Object} Response with optional question
 */
function processAssertion(assertion) {
  const dialogue = elenchusState.currentDialogue;

  // Auto-start dialogue if needed
  if (!dialogue.topic) {
    startDialogue(extractKeyTerms(assertion)[0] || 'discussion');
  }

  // Record assertion
  dialogue.assertions.push({
    text: assertion,
    timestamp: Date.now(),
    type: detectAssertionType(assertion),
  });

  // Check cooldown
  const now = Date.now();
  const cooldownMs = QUESTION_COOLDOWN_SEC * 1000;
  if (elenchusState.lastQuestionTime &&
      (now - elenchusState.lastQuestionTime) < cooldownMs) {
    return {
      shouldAsk: false,
      reason: 'cooldown',
      nextQuestionIn: Math.ceil((cooldownMs - (now - elenchusState.lastQuestionTime)) / 1000),
    };
  }

  // Check question budget
  if (dialogue.questionsRemaining <= 0) {
    return {
      shouldAsk: false,
      reason: 'budget_exhausted',
      synthesis: generateSynthesis(),
    };
  }

  // Generate question
  const question = generateQuestion(assertion, {
    previousAssertions: dialogue.assertions.slice(0, -1).map(a => a.text),
    definitions: dialogue.definitions,
  });

  // Record question
  dialogue.questions.push({
    ...question,
    forAssertion: assertion,
    timestamp: now,
  });

  dialogue.questionsRemaining--;
  elenchusState.lastQuestionTime = now;

  // Track stats
  if (question.type === 'contradiction') {
    elenchusState.stats.contradictionsFound++;
  }
  if (question.type === 'definition_drift') {
    elenchusState.stats.definitionDrifts++;
  }

  saveState();

  return {
    shouldAsk: true,
    question: question.question,
    type: question.type,
    confidence: question.confidence,
    questionsRemaining: dialogue.questionsRemaining,
    metadata: question.metadata,
  };
}

/**
 * Record a definition from user
 * @param {string} term - Term being defined
 * @param {string} definition - Definition
 */
function recordDefinition(term, definition) {
  const termLower = term.toLowerCase();

  elenchusState.currentDialogue.definitions[termLower] = definition;
  elenchusState.globalDefinitions[termLower] = definition;

  saveDefinitions();

  appendToHistory({
    type: 'definition',
    term,
    definition,
  });
}

/**
 * Generate a synthesis of the dialogue
 * @returns {Object} Synthesis
 */
function generateSynthesis() {
  const dialogue = elenchusState.currentDialogue;

  const synthesis = {
    topic: dialogue.topic,
    assertions: dialogue.assertions.length,
    questions: dialogue.questions.length,
    contradictions: dialogue.questions.filter(q => q.type === 'contradiction').length,
    drifts: dialogue.questions.filter(q => q.type === 'definition_drift').length,
    definitions: Object.keys(dialogue.definitions).length,
    durationMinutes: Math.round((Date.now() - dialogue.startTime) / 60000),
    insight: generateInsight(dialogue),
  };

  elenchusState.stats.dialogues++;
  if (synthesis.insight) {
    elenchusState.stats.insightsGenerated++;
  }

  appendToHistory({
    type: 'synthesis',
    ...synthesis,
  });

  saveState();

  return synthesis;
}

/**
 * Generate an insight from the dialogue
 * @param {Object} dialogue - Dialogue state
 * @returns {string|null} Insight
 */
function generateInsight(dialogue) {
  // If contradictions found, insight about reconciliation
  if (dialogue.questions.some(q => q.type === 'contradiction')) {
    return 'Positions contradictoires détectées - la vérité est peut-être entre les deux.';
  }

  // If definitions drifted, insight about clarity
  if (dialogue.questions.some(q => q.type === 'definition_drift')) {
    return 'Les définitions ont évolué - la clarté requiert stabilité conceptuelle.';
  }

  // If many questions without resistance
  if (dialogue.questions.length >= MIN_QUESTIONS) {
    return 'Le questionnement a approfondi la compréhension.';
  }

  return null;
}

// =============================================================================
// MAIEUTIC MODE
// =============================================================================

/**
 * Check if we should use maieutic mode (questions only, no answers)
 * @param {string} topic - Current topic
 * @returns {boolean} Whether to use maieutic mode
 */
function shouldUseMaieutics(topic) {
  // Maieutics for learning moments
  const learningPatterns = [
    /\?$/,                    // User is already questioning
    /pourquoi|why/i,          // Asking why
    /comment|how/i,           // Asking how
    /comprendre|understand/i, // Wanting to understand
  ];

  return learningPatterns.some(p => p.test(topic));
}

/**
 * Generate a maieutic response (question to guide discovery)
 * @param {string} context - Context for the question
 * @returns {string} Maieutic question
 */
function generateMaieuticQuestion(context) {
  const templates = QUESTION_TEMPLATES.maieutic;
  return templates[Math.floor(Math.random() * templates.length)];
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize the Elenchus engine
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    elenchusState.stats = saved.stats || elenchusState.stats;
    elenchusState.globalDefinitions = saved.globalDefinitions || {};
    elenchusState.lastQuestionTime = saved.lastQuestionTime;
  }
  elenchusState.globalDefinitions = {
    ...loadDefinitions(),
    ...elenchusState.globalDefinitions,
  };
}

/**
 * Get current dialogue state
 * @returns {Object} Dialogue state
 */
function getDialogueState() {
  return {
    ...elenchusState.currentDialogue,
    stats: elenchusState.stats,
  };
}

/**
 * Get statistics
 * @returns {Object} Stats
 */
function getStats() {
  return {
    ...elenchusState.stats,
    definitionsTracked: Object.keys(elenchusState.globalDefinitions).length,
  };
}

/**
 * End current dialogue and get synthesis
 * @returns {Object} Synthesis
 */
function endDialogue() {
  const synthesis = generateSynthesis();
  elenchusState.currentDialogue = {
    topic: null,
    assertions: [],
    questions: [],
    questionsRemaining: MAX_QUESTIONS,
    startTime: null,
    definitions: {},
  };
  return synthesis;
}

/**
 * Format a question for display
 * @param {Object} questionResult - Result from processAssertion
 * @returns {string} Formatted question
 */
function formatQuestion(questionResult) {
  if (!questionResult.shouldAsk) {
    return '';
  }

  const emoji = questionResult.type === 'contradiction' ? '⚡' :
                questionResult.type === 'definition_drift' ? '📖' :
                questionResult.type === 'maieutic' ? '💡' : '❓';

  return `${emoji} ${questionResult.question}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  QUESTION_COOLDOWN_SEC,

  // Core functions
  init,
  getDialogueState,
  getStats,

  // Dialogue management
  startDialogue,
  processAssertion,
  recordDefinition,
  endDialogue,

  // Question generation
  generateQuestion,
  generateMaieuticQuestion,
  formatQuestion,

  // Detection
  detectContradiction,
  detectDefinitionDrift,
  detectAssertionType,
  shouldUseMaieutics,

  // Synthesis
  generateSynthesis,
};
