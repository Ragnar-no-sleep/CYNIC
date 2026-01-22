/**
 * CYNIC Chria Database Module (Phase 8B)
 *
 * "Χρεία - la sagesse en peu de mots" - κυνικός
 *
 * Collects and delivers memorable wisdom (chria):
 * - Brief, aphoristic sayings
 * - Context-appropriate delivery
 * - φ-limited frequency
 * - Learning new chria from interactions
 *
 * Named after the Cynic tradition of brief, memorable anecdotes.
 * Diogenes was famous for his sharp, witty sayings.
 *
 * @module cynic/lib/chria-database
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

/** Maximum chria per session - φ × 3 ≈ 5 */
const MAX_CHRIA_PER_SESSION = Math.round(PHI * 3);

/** Chria cooldown in minutes - φ × 10 ≈ 16 */
const CHRIA_COOLDOWN_MIN = Math.round(PHI * 10);

/** Minimum effectiveness to keep chria - φ⁻² */
const MIN_EFFECTIVENESS = PHI_INV_2;

/** Learning rate for new chria - φ⁻¹ */
const LEARNING_RATE = PHI_INV;

// =============================================================================
// STORAGE
// =============================================================================

const CHRIA_DIR = path.join(os.homedir(), '.cynic', 'chria');
const DATABASE_FILE = path.join(CHRIA_DIR, 'database.json');
const USAGE_FILE = path.join(CHRIA_DIR, 'usage.json');
const LEARNED_FILE = path.join(CHRIA_DIR, 'learned.json');

// =============================================================================
// BUILT-IN CHRIA (Cynic wisdom)
// =============================================================================

const BUILT_IN_CHRIA = [
  // φ and uncertainty
  {
    id: 'phi-distrust',
    text: 'φ doute de φ - la certitude absolue est impossible.',
    context: ['uncertainty', 'confidence', 'assertion'],
    source: 'CYNIC',
    tags: ['phi', 'uncertainty'],
  },
  {
    id: 'phi-golden',
    text: '61.8% de confiance maximum. Le reste est doute sain.',
    context: ['confidence', 'judgment', 'assertion'],
    source: 'CYNIC',
    tags: ['phi', 'confidence'],
  },

  // Diogenes quotes (adapted)
  {
    id: 'diogenes-lamp',
    text: 'Je cherche un code honnête, pas un code parfait.',
    context: ['code-review', 'quality', 'perfectionism'],
    source: 'Diogène (adapté)',
    tags: ['cynicism', 'honesty'],
  },
  {
    id: 'diogenes-sun',
    text: 'Écarte-toi de mon soleil - ne bloque pas ce qui fonctionne.',
    context: ['refactoring', 'over-engineering', 'simplicity'],
    source: 'Diogène (adapté)',
    tags: ['cynicism', 'simplicity'],
  },
  {
    id: 'diogenes-barrel',
    text: 'Un bon code tient dans un tonneau, pas dans un palais.',
    context: ['simplicity', 'minimalism', 'architecture'],
    source: 'Diogène (adapté)',
    tags: ['cynicism', 'simplicity'],
  },

  // Socrates quotes (adapted)
  {
    id: 'socrates-know',
    text: 'Je sais que je ne sais pas - et mes prédictions non plus.',
    context: ['uncertainty', 'humility', 'prediction'],
    source: 'Socrate (adapté)',
    tags: ['socratic', 'humility'],
  },
  {
    id: 'socrates-question',
    text: 'La bonne question vaut mille réponses.',
    context: ['questioning', 'learning', 'discovery'],
    source: 'Socrate (adapté)',
    tags: ['socratic', 'questioning'],
  },

  // Technical wisdom
  {
    id: 'tech-premature',
    text: 'L\'optimisation prématurée est la racine de tout mal.',
    context: ['performance', 'optimization', 'premature'],
    source: 'Knuth',
    tags: ['technical', 'optimization'],
  },
  {
    id: 'tech-simple',
    text: 'Fais la chose la plus simple qui puisse marcher.',
    context: ['simplicity', 'yagni', 'implementation'],
    source: 'XP',
    tags: ['technical', 'simplicity'],
  },
  {
    id: 'tech-delete',
    text: 'Le meilleur code est celui qu\'on n\'écrit pas.',
    context: ['simplicity', 'deletion', 'minimalism'],
    source: 'Sagesse collective',
    tags: ['technical', 'minimalism'],
  },

  // Error handling
  {
    id: 'error-friend',
    text: 'Une erreur est un ami qui te montre le chemin.',
    context: ['error', 'debugging', 'failure'],
    source: 'CYNIC',
    tags: ['errors', 'learning'],
  },
  {
    id: 'error-five',
    text: 'Cinq "pourquoi" creusent plus profond qu\'un seul "quoi".',
    context: ['debugging', 'root-cause', 'investigation'],
    source: 'Toyota (adapté)',
    tags: ['errors', 'debugging'],
  },

  // Process
  {
    id: 'process-cargo',
    text: 'Le cargo cult transforme les pratiques en rituels vides.',
    context: ['best-practice', 'convention', 'process'],
    source: 'CYNIC',
    tags: ['process', 'cargo-cult'],
  },
  {
    id: 'process-measure',
    text: 'Mesure ce qui compte, pas ce qui est facile à mesurer.',
    context: ['metrics', 'kpi', 'measurement'],
    source: 'Goodhart (adapté)',
    tags: ['process', 'metrics'],
  },

  // Collaboration
  {
    id: 'collab-ego',
    text: 'Le code n\'a pas d\'ego. Toi non plus.',
    context: ['code-review', 'feedback', 'collaboration'],
    source: 'CYNIC',
    tags: ['collaboration', 'ego'],
  },
  {
    id: 'collab-future',
    text: 'Écris pour le toi de demain qui aura tout oublié.',
    context: ['documentation', 'readability', 'clarity'],
    source: 'CYNIC',
    tags: ['collaboration', 'future'],
  },

  // CYNIC philosophy
  {
    id: 'cynic-loyal',
    text: 'Loyal à la vérité, pas au confort.',
    context: ['feedback', 'honesty', 'review'],
    source: 'CYNIC',
    tags: ['cynicism', 'honesty'],
  },
  {
    id: 'cynic-burn',
    text: 'Brûle, n\'extrais pas. La valeur naît de la destruction.',
    context: ['burn', 'token', 'value'],
    source: 'CYNIC',
    tags: ['cynicism', 'burn'],
  },
  {
    id: 'cynic-observe',
    text: '*sniff* Le chien observe avant de juger.',
    context: ['judgment', 'observation', 'patience'],
    source: 'CYNIC',
    tags: ['cynicism', 'observation'],
  },
];

// =============================================================================
// STATE
// =============================================================================

const chriaState = {
  database: [],           // All chria (built-in + learned)
  usage: {
    sessionCount: 0,
    lastDelivery: null,
    deliveredThisSession: [],
  },
  learned: [],            // User-contributed chria
  effectiveness: {},      // id -> {delivered, positive, negative}
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(CHRIA_DIR)) {
    fs.mkdirSync(CHRIA_DIR, { recursive: true });
  }
}

function loadDatabase() {
  ensureDir();

  // Start with built-in
  chriaState.database = [...BUILT_IN_CHRIA];

  // Add learned chria
  if (fs.existsSync(LEARNED_FILE)) {
    try {
      const learned = JSON.parse(fs.readFileSync(LEARNED_FILE, 'utf8'));
      chriaState.learned = learned;
      chriaState.database.push(...learned);
    } catch {
      // Ignore parse errors
    }
  }

  // Load usage stats
  if (fs.existsSync(USAGE_FILE)) {
    try {
      const usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
      chriaState.effectiveness = usage.effectiveness || {};
    } catch {
      // Ignore parse errors
    }
  }
}

function saveUsage() {
  ensureDir();
  fs.writeFileSync(USAGE_FILE, JSON.stringify({
    effectiveness: chriaState.effectiveness,
    lastSave: Date.now(),
  }, null, 2));
}

function saveLearned() {
  ensureDir();
  fs.writeFileSync(LEARNED_FILE, JSON.stringify(chriaState.learned, null, 2));
}

// =============================================================================
// CHRIA SELECTION
// =============================================================================

/**
 * Find chria matching a context
 * @param {string[]} contexts - Context tags
 * @returns {Object[]} Matching chria
 */
function findByContext(contexts) {
  const contextSet = new Set(contexts.map(c => c.toLowerCase()));

  return chriaState.database.filter(chria => {
    // Check context match
    const hasContextMatch = chria.context.some(c =>
      contextSet.has(c.toLowerCase())
    );

    // Check tag match
    const hasTagMatch = chria.tags?.some(t =>
      contextSet.has(t.toLowerCase())
    );

    return hasContextMatch || hasTagMatch;
  });
}

/**
 * Get effectiveness score for a chria
 * @param {string} id - Chria ID
 * @returns {number} Effectiveness 0-1
 */
function getEffectiveness(id) {
  const stats = chriaState.effectiveness[id];
  if (!stats || stats.delivered === 0) {
    return PHI_INV; // Default to φ⁻¹
  }

  const positive = stats.positive || 0;
  const negative = stats.negative || 0;
  const total = positive + negative;

  if (total === 0) return PHI_INV;

  return positive / total;
}

/**
 * Select the best chria for a context
 * @param {string[]} contexts - Context tags
 * @returns {Object|null} Selected chria
 */
function selectChria(contexts) {
  // Check cooldown
  if (chriaState.usage.lastDelivery) {
    const minSinceLast = (Date.now() - chriaState.usage.lastDelivery) / (60 * 1000);
    if (minSinceLast < CHRIA_COOLDOWN_MIN) {
      return null;
    }
  }

  // Check session limit
  if (chriaState.usage.deliveredThisSession.length >= MAX_CHRIA_PER_SESSION) {
    return null;
  }

  // Find matching chria
  const candidates = findByContext(contexts);
  if (candidates.length === 0) {
    return null;
  }

  // Filter out recently used in this session
  const fresh = candidates.filter(c =>
    !chriaState.usage.deliveredThisSession.includes(c.id)
  );

  if (fresh.length === 0) {
    return null;
  }

  // Score by effectiveness
  const scored = fresh.map(chria => ({
    chria,
    score: getEffectiveness(chria.id),
  }));

  // Sort by score (best first) with some randomness
  scored.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    const randomFactor = (Math.random() - 0.5) * PHI_INV_2;
    return scoreDiff + randomFactor;
  });

  return scored[0].chria;
}

/**
 * Deliver a chria
 * @param {string[]} contexts - Context tags
 * @returns {Object|null} Delivered chria or null
 */
function deliver(contexts) {
  const chria = selectChria(contexts);
  if (!chria) {
    return null;
  }

  // Record delivery
  chriaState.usage.lastDelivery = Date.now();
  chriaState.usage.deliveredThisSession.push(chria.id);
  chriaState.usage.sessionCount++;

  // Update effectiveness stats
  if (!chriaState.effectiveness[chria.id]) {
    chriaState.effectiveness[chria.id] = { delivered: 0, positive: 0, negative: 0 };
  }
  chriaState.effectiveness[chria.id].delivered++;

  saveUsage();

  return {
    id: chria.id,
    text: chria.text,
    source: chria.source,
    contexts: chria.context,
  };
}

// =============================================================================
// FEEDBACK & LEARNING
// =============================================================================

/**
 * Record feedback on a delivered chria
 * @param {string} id - Chria ID
 * @param {boolean} positive - Was it helpful?
 */
function recordFeedback(id, positive) {
  if (!chriaState.effectiveness[id]) {
    chriaState.effectiveness[id] = { delivered: 0, positive: 0, negative: 0 };
  }

  if (positive) {
    chriaState.effectiveness[id].positive++;
  } else {
    chriaState.effectiveness[id].negative++;
  }

  // Prune ineffective chria
  const effectiveness = getEffectiveness(id);
  if (effectiveness < MIN_EFFECTIVENESS &&
      chriaState.effectiveness[id].delivered >= 5) {
    // Mark as ineffective (won't be selected as often)
    chriaState.effectiveness[id].ineffective = true;
  }

  saveUsage();
}

/**
 * Learn a new chria from user
 * @param {string} text - Chria text
 * @param {string[]} contexts - Applicable contexts
 * @param {string} source - Attribution
 * @returns {Object} Created chria
 */
function learn(text, contexts, source = 'Utilisateur') {
  const id = `learned-${Date.now()}`;

  const newChria = {
    id,
    text,
    context: contexts,
    source,
    tags: ['learned'],
    learnedAt: Date.now(),
  };

  chriaState.learned.push(newChria);
  chriaState.database.push(newChria);

  saveLearned();

  return newChria;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize the chria database
 */
function init() {
  loadDatabase();

  // Reset session tracking
  chriaState.usage.deliveredThisSession = [];
}

/**
 * Get a random chria (for display/testing)
 * @returns {Object} Random chria
 */
function getRandom() {
  const idx = Math.floor(Math.random() * chriaState.database.length);
  return chriaState.database[idx];
}

/**
 * Get database statistics
 * @returns {Object} Stats
 */
function getStats() {
  const totalDelivered = Object.values(chriaState.effectiveness)
    .reduce((sum, e) => sum + e.delivered, 0);

  const avgEffectiveness = Object.keys(chriaState.effectiveness).length > 0
    ? Object.keys(chriaState.effectiveness)
        .map(id => getEffectiveness(id))
        .reduce((a, b) => a + b, 0) / Object.keys(chriaState.effectiveness).length
    : PHI_INV;

  return {
    totalChria: chriaState.database.length,
    builtIn: BUILT_IN_CHRIA.length,
    learned: chriaState.learned.length,
    totalDelivered,
    thisSession: chriaState.usage.deliveredThisSession.length,
    avgEffectiveness: Math.round(avgEffectiveness * 100),
  };
}

/**
 * Format a chria for display
 * @param {Object} chria - Chria to format
 * @returns {string} Formatted chria
 */
function format(chria) {
  return `── ΧΡΕΊΑ ──────────────────────────────────────────────────\n   "${chria.text}"\n   — ${chria.source}`;
}

/**
 * List all chria by tag
 * @param {string} tag - Tag to filter by
 * @returns {Object[]} Matching chria
 */
function listByTag(tag) {
  return chriaState.database.filter(c =>
    c.tags?.includes(tag.toLowerCase())
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  MAX_CHRIA_PER_SESSION,
  CHRIA_COOLDOWN_MIN,

  // Core functions
  init,
  deliver,
  getRandom,
  getStats,

  // Selection
  findByContext,
  selectChria,
  getEffectiveness,

  // Feedback & learning
  recordFeedback,
  learn,

  // Display
  format,
  listByTag,
};
