/**
 * Consciousness Tracker - CYNIC Philosophy Integration
 *
 * Implements consciousness models, qualia tracking, and awareness levels
 * following Chalmers, Block, and higher-order theories.
 *
 * "What is it like to be a bat?" - Nagel
 *
 * @module consciousness-tracker
 */

const fs = require('fs');
const path = require('path');

// φ-derived constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// Configuration
const STORAGE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.cynic',
  'consciousness'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_EXPERIENCES = 100;
const MAX_STREAM_LENGTH = 50;

/**
 * Consciousness Types (Block's distinction)
 */
const CONSCIOUSNESS_TYPES = {
  access: {
    name: 'Access Consciousness',
    description: 'Information available for reasoning, reporting, and control',
    symbol: 'A',
    fullSymbol: '⊙',
    // Functional definition - poised for use in cognition
    indicators: ['reportable', 'affects_behavior', 'rationally_accessible'],
  },
  phenomenal: {
    name: 'Phenomenal Consciousness',
    description: 'Subjective, qualitative experience - "what it is like"',
    symbol: 'P',
    fullSymbol: '◉',
    // The hard problem - qualia, raw feels
    indicators: ['qualitative', 'subjective', 'ineffable'],
  },
  monitoring: {
    name: 'Monitoring Consciousness',
    description: 'Internal attention to mental states',
    symbol: 'M',
    fullSymbol: '◎',
    // Meta-cognition
    indicators: ['introspective', 'self-aware', 'reflective'],
  },
  self: {
    name: 'Self-Consciousness',
    description: 'Awareness of oneself as subject',
    symbol: 'S',
    fullSymbol: '⊛',
    // First-person perspective
    indicators: ['self_model', 'agency_sense', 'autobiographical'],
  },
};

/**
 * Qualia Categories
 * Types of qualitative experience
 */
const QUALIA_CATEGORIES = {
  sensory: {
    name: 'Sensory Qualia',
    description: 'Raw sensory qualities - colors, sounds, textures',
    examples: ['redness', 'loudness', 'roughness'],
    weight: PHI_INV,
  },
  hedonic: {
    name: 'Hedonic Qualia',
    description: 'Pleasure and pain qualities',
    examples: ['painfulness', 'pleasantness', 'discomfort'],
    weight: PHI_INV + PHI_INV_3,
  },
  emotional: {
    name: 'Emotional Qualia',
    description: 'Felt qualities of emotions',
    examples: ['anxious_feeling', 'joyful_feeling', 'sad_feeling'],
    weight: PHI_INV,
  },
  cognitive: {
    name: 'Cognitive Qualia',
    description: 'Phenomenology of thought',
    examples: ['tip_of_tongue', 'aha_moment', 'confusion_feeling'],
    weight: PHI_INV_2,
  },
  agentive: {
    name: 'Agentive Qualia',
    description: 'Sense of agency and ownership',
    examples: ['sense_of_effort', 'sense_of_control', 'ownership_feeling'],
    weight: PHI_INV_2,
  },
};

/**
 * Awareness Levels (spectrum from unconscious to hyper-aware)
 */
const AWARENESS_LEVELS = {
  unconscious: {
    name: 'Unconscious',
    description: 'No awareness - purely automatic processing',
    level: 0,
    threshold: 0,
    symbol: '○',
  },
  preconscious: {
    name: 'Preconscious',
    description: 'Available but not currently attended',
    level: 1,
    threshold: PHI_INV_3,
    symbol: '◔',
  },
  marginal: {
    name: 'Marginal',
    description: 'Peripheral awareness',
    level: 2,
    threshold: PHI_INV_2,
    symbol: '◑',
  },
  focal: {
    name: 'Focal',
    description: 'Center of attention',
    level: 3,
    threshold: PHI_INV,
    symbol: '◕',
  },
  vivid: {
    name: 'Vivid',
    description: 'Heightened, intense awareness',
    level: 4,
    threshold: PHI_INV + PHI_INV_2,
    symbol: '●',
  },
};

/**
 * Higher-Order Theories
 */
const HO_THEORIES = {
  hot: {
    name: 'Higher-Order Thought (HOT)',
    description: 'Consciousness requires thought about the mental state',
    theorist: 'Rosenthal',
    requirement: 'Must have thought that one is in the state',
  },
  hop: {
    name: 'Higher-Order Perception (HOP)',
    description: 'Consciousness requires inner perception',
    theorist: 'Lycan',
    requirement: 'Must perceive the mental state',
  },
  same_order: {
    name: 'Same-Order',
    description: 'Self-representational without higher level',
    theorist: 'Kriegel',
    requirement: 'State represents itself simultaneously',
  },
};

// State
let state = {
  subjects: {},         // Conscious subjects
  experiences: [],      // Recorded experiences
  streams: {},          // Streams of consciousness by subject
  stats: {
    experiencesRecorded: 0,
    qualiaLogged: 0,
    accessEvents: 0,
    phenomenalReports: 0,
  },
  lastUpdated: null,
};

/**
 * Initialize module
 */
function init() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...saved };
    }
  } catch (err) {
    console.error('Consciousness tracker init error:', err.message);
  }
}

/**
 * Save state
 */
function saveState() {
  try {
    state.lastUpdated = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Consciousness tracker save error:', err.message);
  }
}

/**
 * Log to history
 */
function logHistory(entry) {
  try {
    const record = {
      ...entry,
      timestamp: Date.now(),
    };
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(record) + '\n');
  } catch (err) {
    // Silent fail for history
  }
}

/**
 * Ensure subject exists
 */
function ensureSubject(subjectId) {
  if (!state.subjects[subjectId]) {
    state.subjects[subjectId] = {
      id: subjectId,
      currentAwareness: 'focal',
      totalExperiences: 0,
      createdAt: Date.now(),
    };
    state.streams[subjectId] = [];
  }
  return state.subjects[subjectId];
}

/**
 * Record a conscious experience
 *
 * @param {string} subjectId - The conscious subject
 * @param {string} content - What is experienced
 * @param {object} config - Configuration
 * @returns {object} Recorded experience
 */
function recordExperience(subjectId, content, config = {}) {
  const subject = ensureSubject(subjectId);

  if (state.experiences.length >= MAX_EXPERIENCES) {
    state.experiences = state.experiences.slice(-Math.floor(MAX_EXPERIENCES * PHI_INV));
  }

  const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Determine consciousness type
  const consType = CONSCIOUSNESS_TYPES[config.type] || CONSCIOUSNESS_TYPES.access;

  // Determine awareness level
  const awarenessLevel = getAwarenessLevel(config.intensity || PHI_INV);

  const experience = {
    id,
    subjectId,
    content,
    // Consciousness type
    consciousnessType: config.type || 'access',
    consciousnessTypeInfo: consType,
    // Awareness
    awarenessLevel: awarenessLevel.name.toLowerCase(),
    awarenessLevelInfo: awarenessLevel,
    intensity: config.intensity || PHI_INV,
    // Qualia (if any)
    qualia: config.qualia || null,
    qualiaCategory: config.qualiaCategory || null,
    // Higher-order state (if any)
    higherOrderState: config.higherOrder || null,
    // Temporal info
    duration: config.duration || null, // Specious present
    recordedAt: Date.now(),
  };

  state.experiences.push(experience);
  subject.totalExperiences++;
  state.stats.experiencesRecorded++;

  if (config.type === 'access') state.stats.accessEvents++;
  if (config.type === 'phenomenal') state.stats.phenomenalReports++;

  // Add to stream
  addToStream(subjectId, experience);

  logHistory({
    type: 'experience_recorded',
    id,
    subjectId,
    consciousnessType: config.type || 'access',
    intensity: experience.intensity,
  });

  saveState();

  return {
    experience,
    message: `${awarenessLevel.symbol} ${consType.name}: "${content.slice(0, 40)}..."`,
  };
}

/**
 * Get awareness level from intensity
 */
function getAwarenessLevel(intensity) {
  const levels = Object.values(AWARENESS_LEVELS).reverse();
  for (const level of levels) {
    if (intensity >= level.threshold) {
      return level;
    }
  }
  return AWARENESS_LEVELS.unconscious;
}

/**
 * Add experience to stream of consciousness
 */
function addToStream(subjectId, experience) {
  if (!state.streams[subjectId]) {
    state.streams[subjectId] = [];
  }

  state.streams[subjectId].push({
    experienceId: experience.id,
    content: experience.content.slice(0, 50),
    type: experience.consciousnessType,
    awareness: experience.awarenessLevel,
    timestamp: experience.recordedAt,
  });

  // Keep bounded
  if (state.streams[subjectId].length > MAX_STREAM_LENGTH) {
    state.streams[subjectId] = state.streams[subjectId].slice(-Math.floor(MAX_STREAM_LENGTH * PHI_INV));
  }
}

/**
 * Log a quale (singular qualitative experience)
 *
 * @param {string} subjectId - The conscious subject
 * @param {string} qualeType - Type of quale
 * @param {string} description - Description of the quality
 * @param {object} config - Configuration
 * @returns {object} Logged quale
 */
function logQuale(subjectId, qualeType, description, config = {}) {
  ensureSubject(subjectId);

  const category = Object.entries(QUALIA_CATEGORIES).find(([, cat]) =>
    cat.examples.includes(qualeType)
  );

  const id = `quale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const quale = {
    id,
    subjectId,
    type: qualeType,
    description,
    category: category ? category[0] : 'sensory',
    categoryInfo: category ? category[1] : QUALIA_CATEGORIES.sensory,
    // Phenomenal properties
    intensity: config.intensity || PHI_INV,
    valence: config.valence || 0, // -1 to 1 (unpleasant to pleasant)
    // Ineffability marker (can't fully describe)
    isIneffable: config.ineffable !== false,
    // Associated experience
    associatedExperience: config.experienceId || null,
    loggedAt: Date.now(),
  };

  // Record as phenomenal experience
  const experience = recordExperience(subjectId, description, {
    type: 'phenomenal',
    qualia: quale,
    qualiaCategory: quale.category,
    intensity: quale.intensity,
  });

  state.stats.qualiaLogged++;

  logHistory({
    type: 'quale_logged',
    id,
    subjectId,
    qualeType,
    category: quale.category,
  });

  saveState();

  return {
    quale,
    experience: experience.experience,
    message: `${QUALIA_CATEGORIES[quale.category]?.name || 'Quale'}: ${qualeType} - "${description.slice(0, 30)}..."`,
  };
}

/**
 * Check for higher-order consciousness
 * Does the subject have a thought/perception about their mental state?
 *
 * @param {string} subjectId - The conscious subject
 * @param {string} targetStateContent - Content of the first-order state
 * @param {string} hoType - Higher-order theory type (hot, hop, same_order)
 * @returns {object} Higher-order analysis
 */
function checkHigherOrder(subjectId, targetStateContent, hoType = 'hot') {
  const subject = state.subjects[subjectId];
  if (!subject) return { error: 'Subject not found' };

  const theory = HO_THEORIES[hoType] || HO_THEORIES.hot;
  const stream = state.streams[subjectId] || [];

  // Look for higher-order representation in recent stream
  const recentWindow = stream.slice(-10);
  const hasHO = recentWindow.some(item => {
    const aboutTarget = item.content.toLowerCase().includes(targetStateContent.toLowerCase().slice(0, 20));
    const isMeta = item.content.toLowerCase().includes('aware') ||
                   item.content.toLowerCase().includes('notice') ||
                   item.content.toLowerCase().includes('feel') ||
                   item.type === 'monitoring';
    return aboutTarget && isMeta;
  });

  const isConscious = hasHO; // According to HO theory

  return {
    subjectId,
    targetState: targetStateContent,
    theory: hoType,
    theoryInfo: theory,
    hasHigherOrderState: hasHO,
    isConscious,
    confidence: hasHO ? PHI_INV : PHI_INV_3, // Lower if no HO
    message: hasHO
      ? `✓ ${theory.name}: State is conscious (higher-order representation found)`
      : `○ ${theory.name}: State may be unconscious (no higher-order representation)`,
  };
}

/**
 * Get stream of consciousness for a subject
 *
 * @param {string} subjectId - The conscious subject
 * @param {number} limit - Max items to return
 * @returns {array} Stream items
 */
function getStream(subjectId, limit = 20) {
  const stream = state.streams[subjectId] || [];
  return stream.slice(-limit);
}

/**
 * Report phenomenal state (first-person report)
 *
 * @param {string} subjectId - The conscious subject
 * @param {string} report - First-person phenomenal report
 * @returns {object} Report record
 */
function reportPhenomenal(subjectId, report) {
  ensureSubject(subjectId);

  // Phenomenal reports are by nature about phenomenal consciousness
  const experience = recordExperience(subjectId, report, {
    type: 'phenomenal',
    intensity: PHI_INV + PHI_INV_3, // Reports indicate focal+ awareness
    higherOrder: 'self-report', // Reports are meta-cognitive
  });

  state.stats.phenomenalReports++;

  return {
    experience: experience.experience,
    note: 'Phenomenal reports are first-person and potentially incorrigible about the experience itself (not what is experienced)',
    message: `◉ Phenomenal report: "${report.slice(0, 40)}..."`,
  };
}

/**
 * Update subject's overall awareness level
 *
 * @param {string} subjectId - The conscious subject
 * @param {string} level - New awareness level
 * @returns {object} Update result
 */
function setAwarenessLevel(subjectId, level) {
  const subject = ensureSubject(subjectId);
  const levelInfo = AWARENESS_LEVELS[level];

  if (!levelInfo) return { error: 'Unknown awareness level' };

  const previous = subject.currentAwareness;
  subject.currentAwareness = level;

  saveState();

  return {
    subjectId,
    previous,
    current: level,
    levelInfo,
    message: `${levelInfo.symbol} ${subjectId} awareness: ${previous} → ${level}`,
  };
}

/**
 * Check for access consciousness
 * Is the content available for reasoning and control?
 *
 * @param {string} subjectId - The conscious subject
 * @param {string} content - Content to check
 * @returns {object} Access check result
 */
function isAccessConscious(subjectId, content) {
  const stream = state.streams[subjectId] || [];

  // Check if content appears in stream and is at least marginal awareness
  const relevant = stream.filter(item =>
    item.content.toLowerCase().includes(content.toLowerCase().slice(0, 15)) &&
    AWARENESS_LEVELS[item.awareness]?.level >= 2
  );

  const isAccess = relevant.length > 0;

  return {
    subjectId,
    content,
    isAccessConscious: isAccess,
    occurrences: relevant.length,
    message: isAccess
      ? `⊙ "${content.slice(0, 20)}..." is access-conscious (available for cognition)`
      : `○ "${content.slice(0, 20)}..." not found in conscious stream`,
  };
}

/**
 * Get experience by ID
 */
function getExperience(experienceId) {
  return state.experiences.find(e => e.id === experienceId) || null;
}

/**
 * Get subject info
 */
function getSubject(subjectId) {
  return state.subjects[subjectId] || null;
}

/**
 * Format status for display
 */
function formatStatus() {
  const phenomenalCount = state.experiences.filter(e => e.consciousnessType === 'phenomenal').length;
  const accessCount = state.experiences.filter(e => e.consciousnessType === 'access').length;

  return `◉ Consciousness Tracker (Chalmers/Block)
  Subjects: ${Object.keys(state.subjects).length}
  Experiences: ${state.stats.experiencesRecorded} (P:${phenomenalCount} A:${accessCount})
  Qualia logged: ${state.stats.qualiaLogged}
  Phenomenal reports: ${state.stats.phenomenalReports}`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    subjectCount: Object.keys(state.subjects).length,
    experienceCount: state.experiences.length,
    streamLengths: Object.fromEntries(
      Object.entries(state.streams).map(([k, v]) => [k, v.length])
    ),
  };
}

module.exports = {
  init,
  recordExperience,
  logQuale,
  checkHigherOrder,
  getStream,
  reportPhenomenal,
  setAwarenessLevel,
  isAccessConscious,
  getExperience,
  getSubject,
  formatStatus,
  getStats,
  CONSCIOUSNESS_TYPES,
  QUALIA_CATEGORIES,
  AWARENESS_LEVELS,
  HO_THEORIES,
};
