/**
 * Duration Engine - Bergson's Durée (Lived Time)
 *
 * Philosophy: Henri Bergson distinguished between:
 * - Chronos: Clock time, quantitative, spatial, measurable
 * - Durée: Lived time, qualitative, continuous, experienced
 *
 * Key concepts:
 * - Durée: Time as experienced, not measured
 * - Memory: Past accumulates in present (snowball image)
 * - Élan vital: Creative impulse driving evolution
 * - Intuition: Direct apprehension vs intellectual analysis
 * - Qualitative multiplicity: Continuous, interpenetrating moments
 *
 * In CYNIC: Track qualitative time experience - flow states,
 * perceived duration, memory accumulation, creative momentum.
 *
 * @module duration-engine
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
const DURATION_DIR = path.join(CYNIC_DIR, 'duration');
const STATE_FILE = path.join(DURATION_DIR, 'state.json');
const HISTORY_FILE = path.join(DURATION_DIR, 'history.jsonl');

// Constants
const MEMORY_DECAY = PHI_INV;              // How memory fades
const ELAN_THRESHOLD = PHI_INV;            // Creative momentum threshold
const MAX_MEMORY_LAYERS = Math.round(PHI * 10);  // ~16

/**
 * Time experience modes
 */
const TIME_MODES = {
  chronos: {
    name: 'Chronos',
    description: 'Clock time - quantitative, measured',
    symbol: '⏰',
    isQualitative: false,
  },
  duree: {
    name: 'Durée',
    description: 'Lived time - qualitative, experienced',
    symbol: '∿',
    isQualitative: true,
  },
};

/**
 * Duration qualities (how time feels)
 */
const DURATION_QUALITIES = {
  flowing: {
    name: 'Flowing',
    description: 'Time moves smoothly, immersive',
    durationMultiplier: PHI_INV,  // Feels shorter
    symbol: '≋',
  },
  crawling: {
    name: 'Crawling',
    description: 'Time drags, effortful',
    durationMultiplier: PHI,  // Feels longer
    symbol: '≡',
  },
  suspended: {
    name: 'Suspended',
    description: 'Time pauses, intense moment',
    durationMultiplier: 0.5,
    symbol: '◊',
  },
  rushing: {
    name: 'Rushing',
    description: 'Time accelerates, urgency',
    durationMultiplier: PHI_INV_2,  // Feels even shorter
    symbol: '»',
  },
  expanding: {
    name: 'Expanding',
    description: 'Rich experience, time dilates',
    durationMultiplier: 1.0 + PHI_INV_2,  // Feels fuller
    symbol: '◇',
  },
};

/**
 * Memory types (how past persists)
 */
const MEMORY_TYPES = {
  habit: {
    name: 'Habit Memory',
    description: 'Embodied, automatic, motor',
    persistence: PHI_INV_2,
    symbol: '↻',
  },
  pure: {
    name: 'Pure Memory',
    description: 'Images, recollections, virtual',
    persistence: PHI_INV,
    symbol: '◈',
  },
  working: {
    name: 'Working Memory',
    description: 'Active, present-focused',
    persistence: PHI_INV_3,
    symbol: '●',
  },
};

// In-memory state
let state = {
  // Current durée state
  currentQuality: 'flowing',
  currentMultiplier: PHI_INV,
  // Memory layers (snowball accumulation)
  memoryLayers: [],
  // Élan vital (creative momentum)
  elanVital: {
    momentum: 0.5,
    direction: 'forward',
    lastImpulse: null,
  },
  // Session tracking
  sessions: [],
  currentSession: null,
  // Stats
  stats: {
    totalDureeMs: 0,
    totalChronosMs: 0,
    durationRatio: 1.0,  // durée / chronos
    memoryLayersCreated: 0,
    elanImpulses: 0,
  },
};

/**
 * Initialize the duration engine
 */
function init() {
  if (!fs.existsSync(DURATION_DIR)) {
    fs.mkdirSync(DURATION_DIR, { recursive: true });
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
 * Start a duration session
 *
 * @param {string} quality - Initial duration quality
 * @param {object} context - Session context
 * @returns {object} Session
 */
function startSession(quality = 'flowing', context = {}) {
  const qualityConfig = DURATION_QUALITIES[quality] || DURATION_QUALITIES.flowing;

  const session = {
    id: `dur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    quality,
    qualityInfo: qualityConfig,
    context: context.description || '',
    startedAt: Date.now(),
    endedAt: null,
    // Time tracking
    chronosElapsed: 0,  // Clock time
    dureeElapsed: 0,    // Experienced time
    // Quality transitions
    qualityChanges: [],
    // Memory contributions
    memoryContributions: [],
  };

  state.currentSession = session;
  state.currentQuality = quality;
  state.currentMultiplier = qualityConfig.durationMultiplier;

  logHistory({
    type: 'session_started',
    id: session.id,
    quality,
  });

  saveState();

  return session;
}

/**
 * Update duration quality (how time feels)
 *
 * @param {string} quality - New quality
 * @param {string} reason - Reason for change
 * @returns {object} Update result
 */
function setQuality(quality, reason = '') {
  if (!DURATION_QUALITIES[quality]) {
    return { error: `Unknown duration quality: ${quality}` };
  }

  const previousQuality = state.currentQuality;
  const qualityConfig = DURATION_QUALITIES[quality];

  state.currentQuality = quality;
  state.currentMultiplier = qualityConfig.durationMultiplier;

  if (state.currentSession) {
    state.currentSession.quality = quality;
    state.currentSession.qualityInfo = qualityConfig;
    state.currentSession.qualityChanges.push({
      from: previousQuality,
      to: quality,
      reason,
      timestamp: Date.now(),
    });
  }

  logHistory({
    type: 'quality_changed',
    from: previousQuality,
    to: quality,
    reason,
  });

  saveState();

  return {
    previousQuality,
    currentQuality: quality,
    multiplier: qualityConfig.durationMultiplier,
    symbol: qualityConfig.symbol,
  };
}

/**
 * Record elapsed time in both modes
 *
 * @param {number} chronosMs - Clock time elapsed
 * @returns {object} Duration calculation
 */
function recordElapsed(chronosMs) {
  // Calculate durée based on current quality
  const dureeMs = chronosMs * state.currentMultiplier;

  state.stats.totalChronosMs += chronosMs;
  state.stats.totalDureeMs += dureeMs;
  state.stats.durationRatio = state.stats.totalDureeMs / state.stats.totalChronosMs;

  if (state.currentSession) {
    state.currentSession.chronosElapsed += chronosMs;
    state.currentSession.dureeElapsed += dureeMs;
  }

  saveState();

  return {
    chronosMs,
    dureeMs: Math.round(dureeMs),
    quality: state.currentQuality,
    multiplier: state.currentMultiplier,
    ratio: dureeMs / chronosMs,
  };
}

/**
 * End current session
 *
 * @returns {object} Session summary
 */
function endSession() {
  if (!state.currentSession) {
    return { error: 'No active session' };
  }

  const session = state.currentSession;
  session.endedAt = Date.now();

  // Calculate final chronos elapsed
  const totalChronos = session.endedAt - session.startedAt;
  session.chronosElapsed = totalChronos;

  // Create memory layer from session
  const memoryLayer = createMemoryLayer(session);

  // Store session
  state.sessions.push({
    id: session.id,
    chronosElapsed: session.chronosElapsed,
    dureeElapsed: session.dureeElapsed,
    durationRatio: session.chronosElapsed > 0
      ? session.dureeElapsed / session.chronosElapsed
      : 1,
    qualityChanges: session.qualityChanges.length,
    endedAt: session.endedAt,
  });

  // Keep sessions bounded
  if (state.sessions.length > Math.round(PHI * 30)) {
    state.sessions = state.sessions.slice(-Math.round(PHI * 25));
  }

  state.currentSession = null;

  logHistory({
    type: 'session_ended',
    id: session.id,
    chronosMs: session.chronosElapsed,
    dureeMs: session.dureeElapsed,
  });

  saveState();

  return {
    session,
    memoryLayer,
    summary: {
      chronos: formatDuration(session.chronosElapsed),
      duree: formatDuration(session.dureeElapsed),
      felt: session.dureeElapsed < session.chronosElapsed ? 'shorter' : 'longer',
    },
  };
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Create a memory layer from experience
 * (Bergson's snowball - past accumulates in present)
 *
 * @param {object} experience - The experience to remember
 * @returns {object} Memory layer
 */
function createMemoryLayer(experience) {
  // Prune old layers
  if (state.memoryLayers.length >= MAX_MEMORY_LAYERS) {
    // Oldest layers fade but leave traces
    state.memoryLayers = state.memoryLayers.slice(-Math.round(MAX_MEMORY_LAYERS * PHI_INV));
  }

  const layer = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: experience.type || 'pure',
    typeInfo: MEMORY_TYPES[experience.type] || MEMORY_TYPES.pure,
    content: experience.content || experience.context || '',
    intensity: experience.intensity || 0.5,
    // Memory persistence degrades with φ
    persistence: (MEMORY_TYPES[experience.type]?.persistence || PHI_INV) *
                 experience.intensity || 0.5,
    createdAt: Date.now(),
    depth: state.memoryLayers.length + 1,
  };

  state.memoryLayers.push(layer);
  state.stats.memoryLayersCreated++;

  if (state.currentSession) {
    state.currentSession.memoryContributions.push(layer.id);
  }

  saveState();

  return layer;
}

/**
 * Recall memories (query the snowball)
 *
 * @param {number} depth - How deep to recall
 * @returns {array} Retrieved memories
 */
function recall(depth = 5) {
  // Most recent memories first (top of snowball)
  const memories = state.memoryLayers
    .slice(-depth)
    .reverse()
    .map((layer, index) => ({
      ...layer,
      // Intensity fades with depth
      currentIntensity: layer.intensity * Math.pow(MEMORY_DECAY, index),
    }));

  return memories;
}

/**
 * Impulse élan vital (creative momentum)
 *
 * @param {object} impulse - Creative impulse
 * @returns {object} Élan state
 */
function impulseElan(impulse) {
  const now = Date.now();

  // Calculate momentum boost
  const boost = (impulse.intensity || 0.5) * PHI_INV_2;
  state.elanVital.momentum = Math.min(1, state.elanVital.momentum + boost);
  state.elanVital.direction = impulse.direction || 'forward';
  state.elanVital.lastImpulse = now;

  state.stats.elanImpulses++;

  // Élan affects duration quality
  if (state.elanVital.momentum >= ELAN_THRESHOLD && state.currentQuality !== 'flowing') {
    setQuality('flowing', 'élan vital surge');
  }

  logHistory({
    type: 'elan_impulse',
    momentum: state.elanVital.momentum,
    direction: state.elanVital.direction,
  });

  saveState();

  return {
    momentum: Math.round(state.elanVital.momentum * 100),
    direction: state.elanVital.direction,
    aboveThreshold: state.elanVital.momentum >= ELAN_THRESHOLD,
    message: state.elanVital.momentum >= ELAN_THRESHOLD
      ? '*tail wag* Élan vital flowing. Creative momentum high.'
      : `Élan vital at ${Math.round(state.elanVital.momentum * 100)}%`,
  };
}

/**
 * Decay élan over time (entropy)
 */
function decayElan() {
  if (!state.elanVital.lastImpulse) return;

  const elapsed = Date.now() - state.elanVital.lastImpulse;
  const decayFactor = Math.pow(MEMORY_DECAY, elapsed / 60000);  // Decay over minutes

  state.elanVital.momentum = Math.max(0.1, state.elanVital.momentum * decayFactor);

  saveState();

  return {
    momentum: Math.round(state.elanVital.momentum * 100),
    decayed: true,
  };
}

/**
 * Get intuition (direct knowledge vs analysis)
 * Returns qualitative understanding of current state
 */
function intuit() {
  const memories = recall(3);
  const avgIntensity = memories.length > 0
    ? memories.reduce((sum, m) => sum + m.currentIntensity, 0) / memories.length
    : 0;

  return {
    currentQuality: state.currentQuality,
    qualitySymbol: DURATION_QUALITIES[state.currentQuality]?.symbol || '?',
    elanMomentum: Math.round(state.elanVital.momentum * 100),
    memoryDepth: state.memoryLayers.length,
    memoryIntensity: Math.round(avgIntensity * 100),
    overallDurationRatio: state.stats.durationRatio.toFixed(2),
    insight: generateIntuition(),
  };
}

/**
 * Generate intuitive insight
 */
function generateIntuition() {
  const ratio = state.stats.durationRatio;
  const elan = state.elanVital.momentum;
  const quality = state.currentQuality;

  if (quality === 'flowing' && elan >= ELAN_THRESHOLD) {
    return 'Time flows with creative purpose. Durée and élan aligned.';
  }
  if (quality === 'crawling') {
    return 'Time stretches. Consider changing approach or taking break.';
  }
  if (ratio < PHI_INV) {
    return 'Time compresses. High engagement but watch for burnout.';
  }
  if (ratio > PHI) {
    return 'Time dilates. Rich experience but potentially effortful.';
  }
  return 'Time flows at natural rhythm. φ balance maintained.';
}

/**
 * Get statistics
 */
function getStats() {
  return {
    ...state.stats,
    currentQuality: state.currentQuality,
    elanMomentum: Math.round(state.elanVital.momentum * 100),
    memoryLayers: state.memoryLayers.length,
    sessionsCompleted: state.sessions.length,
    hasActiveSession: state.currentSession !== null,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();
  const qualityInfo = DURATION_QUALITIES[stats.currentQuality];

  let status = `∿ Duration Engine (Bergson)\n`;
  status += `  Quality: ${qualityInfo?.symbol || '?'} ${stats.currentQuality}\n`;
  status += `  Élan vital: ${stats.elanMomentum}%\n`;
  status += `  Memory layers: ${stats.memoryLayers}\n`;
  status += `  Duration ratio: ${stats.durationRatio.toFixed(2)}\n`;
  status += `  Active session: ${stats.hasActiveSession ? 'yes' : 'no'}\n`;

  return status;
}

module.exports = {
  init,
  startSession,
  setQuality,
  recordElapsed,
  endSession,
  createMemoryLayer,
  recall,
  impulseElan,
  decayElan,
  intuit,
  getStats,
  formatStatus,
  TIME_MODES,
  DURATION_QUALITIES,
  MEMORY_TYPES,
};
