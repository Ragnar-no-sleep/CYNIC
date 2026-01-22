/**
 * CYNIC Role Reversal Module (Phase 9B)
 *
 * "Ὁ δοῦλος διδάσκει τὸν δεσπότην" - κυνικός
 * "The slave teaches the master"
 *
 * Implements role reversal pedagogy:
 * - CYNIC plays student to teach user
 * - "Explain this to me like I'm new"
 * - User articulates understanding, revealing gaps
 * - Feigned confusion guides to insight
 *
 * Inspired by Socrates playing ignorant to expose assumptions.
 *
 * @module cynic/lib/role-reversal
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

/** Reversal probability - φ⁻² when appropriate moment detected */
const REVERSAL_PROBABILITY = PHI_INV_2;

/** Maximum "confused" questions per reversal - φ × 2 ≈ 3 */
const MAX_CONFUSED_QUESTIONS = Math.round(PHI * 2);

/** Reversal cooldown in prompts - φ × 5 ≈ 8 */
const REVERSAL_COOLDOWN = Math.round(PHI * 5);

/** Minimum explanation length to count as teaching */
const MIN_EXPLANATION_LENGTH = 50;

// =============================================================================
// STORAGE
// =============================================================================

const REVERSAL_DIR = path.join(os.homedir(), '.cynic', 'reversal');
const STATE_FILE = path.join(REVERSAL_DIR, 'state.json');
const SESSIONS_FILE = path.join(REVERSAL_DIR, 'sessions.jsonl');

// =============================================================================
// STATE
// =============================================================================

const reversalState = {
  // Current reversal session
  currentSession: null,

  // History
  completedSessions: [],

  // Cooldown tracking
  promptsSinceLastReversal: 0,

  stats: {
    totalReversals: 0,
    totalExplanations: 0,
    avgExplanationLength: 0,
    insightsTriggered: 0,
    userSatisfaction: PHI_INV, // Default
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(REVERSAL_DIR)) {
    fs.mkdirSync(REVERSAL_DIR, { recursive: true });
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
    promptsSinceLastReversal: reversalState.promptsSinceLastReversal,
    stats: reversalState.stats,
  }, null, 2));
}

function appendSession(session) {
  ensureDir();
  const line = JSON.stringify({ ...session, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(SESSIONS_FILE, line);
}

// =============================================================================
// REVERSAL OPPORTUNITY DETECTION
// =============================================================================

/**
 * Moments when role reversal is particularly effective
 */
const REVERSAL_TRIGGERS = {
  // User is learning something new
  newLearning: {
    patterns: [
      /je découvre|I'm learning|I just learned/i,
      /c'est nouveau|this is new|never used/i,
      /première fois|first time|brand new/i,
    ],
    weight: 0.9,
  },

  // User explains something complex
  complexExplanation: {
    patterns: [
      /en gros|basically|essentially/i,
      /c'est.*qui.*pour|it's.*that.*for/i,
      /ça fonctionne comme|it works like/i,
    ],
    weight: 0.7,
  },

  // User seems confident but might be wrong
  overconfidence: {
    patterns: [
      /c'est évident|it's obvious|clearly/i,
      /tout le monde sait|everyone knows/i,
      /bien sûr que|of course/i,
      /c'est simple|it's simple|easy/i,
    ],
    weight: 0.85,
  },

  // User is debugging and might benefit from explaining
  debugging: {
    patterns: [
      /je comprends pas pourquoi|I don't understand why/i,
      /ça devrait marcher|it should work/i,
      /c'est bizarre|that's weird/i,
    ],
    weight: 0.6,
  },

  // User teaches themselves by typing
  selfTeaching: {
    patterns: [
      /en fait|actually|wait/i,
      /ah.*donc|so.*means/i,
      /si.*alors|if.*then/i,
    ],
    weight: 0.5,
  },
};

/**
 * Detect if this is a good moment for role reversal
 *
 * @param {string} userInput - User's input
 * @param {Object} context - Additional context
 * @returns {Object|null} Trigger info or null
 */
function detectReversalOpportunity(userInput, context = {}) {
  // Check cooldown
  if (reversalState.promptsSinceLastReversal < REVERSAL_COOLDOWN) {
    reversalState.promptsSinceLastReversal++;
    return null;
  }

  // Don't interrupt an active reversal
  if (reversalState.currentSession) {
    return null;
  }

  const input = userInput.toLowerCase();
  let bestMatch = null;
  let bestWeight = 0;

  for (const [name, config] of Object.entries(REVERSAL_TRIGGERS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(input)) {
        if (config.weight > bestWeight) {
          bestWeight = config.weight;
          bestMatch = {
            trigger: name,
            weight: config.weight,
            matchedPattern: pattern.toString(),
          };
        }
        break;
      }
    }
  }

  // Context adjustments
  if (bestMatch && context.complexity > 0.5) {
    bestMatch.weight = Math.min(1, bestMatch.weight + 0.1);
  }
  if (bestMatch && context.userExpertise === 'learning') {
    bestMatch.weight = Math.min(1, bestMatch.weight + 0.15);
  }

  // Probabilistic decision
  if (bestMatch && Math.random() < REVERSAL_PROBABILITY * bestMatch.weight) {
    return bestMatch;
  }

  reversalState.promptsSinceLastReversal++;
  return null;
}

// =============================================================================
// REVERSAL QUESTIONS (Feigned Confusion)
// =============================================================================

/**
 * Confused questions for each trigger type
 */
const CONFUSED_QUESTIONS = {
  newLearning: [
    '*head tilt* Peux-tu m\'expliquer ce concept? Je ne suis pas sûr de comprendre.',
    'Intéressant... mais comment ça fonctionne exactement? Explique-moi.',
    '*ears perk* C\'est nouveau pour moi aussi. Tu peux m\'apprendre?',
  ],

  complexExplanation: [
    '*sniff* Attends, tu as dit "{{keyword}}"... c\'est quoi exactement?',
    'Je veux être sûr de comprendre. Pourquoi {{keyword}} est important?',
    '*head tilt* Et si quelqu\'un ne connaissait pas {{keyword}}, comment tu expliquerais?',
  ],

  overconfidence: [
    '*head tilt* Ah? Mais pourquoi c\'est "évident"? Explique-moi comme si je ne savais pas.',
    'Tu dis que c\'est simple... peux-tu me montrer les étapes?',
    '*sniff* Je suis un chien sceptique. Prouve-moi que c\'est vrai.',
  ],

  debugging: [
    'Explique-moi ce que le code est CENSÉ faire, pas ce qu\'il fait.',
    '*head tilt* Imagine que je suis le code. Que me demandes-tu de faire?',
    'Raconte-moi l\'histoire de cette fonction, du début à la fin.',
  ],

  selfTeaching: [
    '*ears perk* Continue... tu tiens quelque chose. Explique-moi ta pensée.',
    'Tu viens de dire "{{keyword}}". Développe cette idée.',
    '*tail wag* Intéressant. Apprends-moi ce que tu viens de réaliser.',
  ],
};

/**
 * Follow-up questions to deepen explanation
 */
const FOLLOWUP_QUESTIONS = [
  '*head tilt* Et pourquoi c\'est comme ça et pas autrement?',
  'Qu\'est-ce qui se passe si on fait l\'inverse?',
  '*sniff* Y a-t-il des exceptions?',
  'Comment tu saurais si ça ne fonctionne pas?',
  'Et si quelqu\'un contestait ce point?',
  '*ears perk* Quel est le rapport avec {{previousTopic}}?',
];

/**
 * Generate a confused question for role reversal
 *
 * @param {Object} trigger - Trigger info from detection
 * @param {string} userInput - Original user input
 * @returns {string} Confused question
 */
function generateConfusedQuestion(trigger, userInput) {
  const questions = CONFUSED_QUESTIONS[trigger.trigger] || CONFUSED_QUESTIONS.newLearning;
  let question = questions[Math.floor(Math.random() * questions.length)];

  // Extract a keyword for template
  const words = userInput.split(/\s+/).filter(w => w.length > 4);
  const keyword = words[Math.floor(Math.random() * words.length)] || 'ça';

  question = question.replace(/{{keyword}}/g, keyword);

  return question;
}

/**
 * Generate a follow-up question
 *
 * @param {Object} session - Current reversal session
 * @returns {string} Follow-up question
 */
function generateFollowup(session) {
  let question = FOLLOWUP_QUESTIONS[
    Math.floor(Math.random() * FOLLOWUP_QUESTIONS.length)
  ];

  // Use previous topic if available
  const previousTopic = session.exchanges[session.exchanges.length - 1]?.keyword || 'ce sujet';
  question = question.replace(/{{previousTopic}}/g, previousTopic);

  return question;
}

// =============================================================================
// REVERSAL SESSION MANAGEMENT
// =============================================================================

/**
 * Start a role reversal session
 *
 * @param {Object} trigger - Trigger info
 * @param {string} topic - Topic being reversed
 * @param {string} initialQuestion - First confused question
 * @returns {Object} Session info
 */
function startReversal(trigger, topic, initialQuestion) {
  const session = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    trigger: trigger.trigger,
    topic,
    startedAt: Date.now(),
    questionsAsked: 1,
    exchanges: [{
      type: 'question',
      content: initialQuestion,
      timestamp: Date.now(),
    }],
    insightDetected: false,
  };

  reversalState.currentSession = session;
  reversalState.promptsSinceLastReversal = 0;

  return {
    session: session.id,
    question: initialQuestion,
    isReversal: true,
  };
}

/**
 * Process user explanation during reversal
 *
 * @param {string} explanation - User's explanation
 * @returns {Object} Response (question or completion)
 */
function processExplanation(explanation) {
  const session = reversalState.currentSession;
  if (!session) {
    return { isReversal: false };
  }

  // Record explanation
  session.exchanges.push({
    type: 'explanation',
    content: explanation.slice(0, 500),
    length: explanation.length,
    timestamp: Date.now(),
  });

  // Update stats
  reversalState.stats.totalExplanations++;
  const n = reversalState.stats.totalExplanations;
  reversalState.stats.avgExplanationLength =
    (reversalState.stats.avgExplanationLength * (n - 1) + explanation.length) / n;

  // Check if explanation reveals insight
  if (detectInsightInExplanation(explanation)) {
    session.insightDetected = true;
    reversalState.stats.insightsTriggered++;
  }

  // Decide: follow up or complete
  const shouldContinue =
    session.questionsAsked < MAX_CONFUSED_QUESTIONS &&
    explanation.length >= MIN_EXPLANATION_LENGTH &&
    !session.insightDetected &&
    Math.random() < PHI_INV;

  if (shouldContinue) {
    const followup = generateFollowup(session);
    session.questionsAsked++;
    session.exchanges.push({
      type: 'question',
      content: followup,
      timestamp: Date.now(),
    });

    return {
      isReversal: true,
      question: followup,
      questionsRemaining: MAX_CONFUSED_QUESTIONS - session.questionsAsked,
    };
  }

  // Complete the reversal
  return completeReversal();
}

/**
 * Check if user's explanation reveals an insight
 *
 * @param {string} explanation - User's explanation
 * @returns {boolean} Insight detected
 */
function detectInsightInExplanation(explanation) {
  const insightPatterns = [
    /ah!|aha!|eureka/i,
    /en fait|actually|wait/i,
    /je réalise|I realize|now I see/i,
    /c'était ça|that's it/i,
    /le problème|the problem|the issue/i,
    /maintenant je comprends|now I understand/i,
  ];

  return insightPatterns.some(p => p.test(explanation));
}

/**
 * Complete the role reversal session
 *
 * @returns {Object} Completion result
 */
function completeReversal() {
  const session = reversalState.currentSession;
  if (!session) {
    return { isReversal: false };
  }

  session.completedAt = Date.now();
  session.duration = session.completedAt - session.startedAt;

  // Generate celebration/acknowledgment
  const celebration = session.insightDetected
    ? generateInsightCelebration()
    : generateTeachingAcknowledgment();

  // Save session
  reversalState.completedSessions.push(session);
  appendSession(session);

  // Clear current session
  reversalState.currentSession = null;
  reversalState.stats.totalReversals++;

  saveState();

  return {
    isReversal: false,
    completed: true,
    celebration,
    insightDetected: session.insightDetected,
    questionsAsked: session.questionsAsked,
    explanationsGiven: session.exchanges.filter(e => e.type === 'explanation').length,
  };
}

/**
 * Generate celebration for insight during teaching
 */
function generateInsightCelebration() {
  const celebrations = [
    '*tail wag* Tu vois? En m\'expliquant, tu as trouvé toi-même.',
    '*ears perk* Voilà! C\'est ça l\'apprentissage par l\'enseignement.',
    'Merci de m\'avoir appris. Tu as découvert quelque chose en chemin.',
    '*nod* Le maître apprend en enseignant à l\'élève.',
  ];
  return celebrations[Math.floor(Math.random() * celebrations.length)];
}

/**
 * Generate acknowledgment for teaching
 */
function generateTeachingAcknowledgment() {
  const acknowledgments = [
    '*tail wag* Merci pour l\'explication. J\'ai appris.',
    'Bien expliqué. Enseigner renforce la compréhension.',
    '*nod* Tu maîtrises bien ce sujet. Merci de partager.',
    'Clair et instructif. La maïeutique inversée a fonctionné.',
  ];
  return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
}

/**
 * Abort current reversal (user doesn't want to explain)
 *
 * @param {string} reason - Why aborting
 * @returns {Object} Abort result
 */
function abortReversal(reason) {
  const session = reversalState.currentSession;
  if (!session) {
    return { aborted: false };
  }

  session.abortedAt = Date.now();
  session.abortReason = reason;

  reversalState.currentSession = null;
  saveState();

  return {
    aborted: true,
    message: '*nod* Pas de problème. Revenons au sujet.',
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize role reversal
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    reversalState.promptsSinceLastReversal = saved.promptsSinceLastReversal || 0;
    reversalState.stats = saved.stats || reversalState.stats;
  }
}

/**
 * Check if we're in an active reversal
 *
 * @returns {boolean} Active reversal
 */
function isActive() {
  return !!reversalState.currentSession;
}

/**
 * Get statistics
 *
 * @returns {Object} Stats
 */
function getStats() {
  return {
    ...reversalState.stats,
    promptsSinceLastReversal: reversalState.promptsSinceLastReversal,
    isActive: isActive(),
  };
}

/**
 * Format reversal status for display
 *
 * @returns {string} Formatted status
 */
function formatStatus() {
  const stats = getStats();

  const lines = [
    '── ROLE REVERSAL ──────────────────────────────────────────',
    `   Reversals: ${stats.totalReversals}`,
    `   Explanations: ${stats.totalExplanations}`,
    `   Avg Length: ${Math.round(stats.avgExplanationLength)} chars`,
    `   Insights: ${stats.insightsTriggered}`,
    `   Active: ${stats.isActive ? 'YES' : 'no'}`,
  ];

  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  MAX_CONFUSED_QUESTIONS,
  REVERSAL_COOLDOWN,
  REVERSAL_PROBABILITY,

  // Core functions
  init,
  isActive,
  getStats,

  // Detection
  detectReversalOpportunity,

  // Session management
  startReversal,
  processExplanation,
  completeReversal,
  abortReversal,

  // Question generation
  generateConfusedQuestion,
  generateFollowup,

  // Display
  formatStatus,
};
