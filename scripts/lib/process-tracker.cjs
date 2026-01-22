/**
 * Process Tracker - Whitehead's Process Philosophy
 *
 * Philosophy: Reality consists of "actual occasions" - momentary
 * experiential events that prehend (grasp) other occasions.
 * The world is a process of becoming, not static being.
 *
 * Key concepts from Whitehead:
 * - Actual Occasion: Basic unit of reality, a moment of experience
 * - Prehension: How occasions take account of other occasions
 * - Nexus: Connected group of actual occasions
 * - Eternal Objects: Pure potentials that can ingress into actuality
 * - Creativity: "Many become one and are increased by one"
 *
 * In CYNIC: Track events as actual occasions, their prehensions
 * (connections), and how they form nexuses (patterns).
 *
 * @module process-tracker
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
const PROCESS_DIR = path.join(CYNIC_DIR, 'process');
const STATE_FILE = path.join(PROCESS_DIR, 'state.json');
const HISTORY_FILE = path.join(PROCESS_DIR, 'history.jsonl');

// Constants
const MAX_OCCASIONS = Math.round(PHI * 100);   // ~162
const MAX_NEXUSES = Math.round(PHI * 20);      // ~32
const PREHENSION_DECAY = PHI_INV;              // How prehensions fade over time

/**
 * Prehension types (how occasions grasp others)
 */
const PREHENSION_TYPES = {
  positive: {
    name: 'Positive Prehension',
    description: 'Includes datum in constitution',
    symbol: '+',
    weight: 1.0,
  },
  negative: {
    name: 'Negative Prehension',
    description: 'Excludes datum from feeling',
    symbol: '-',
    weight: 0,
  },
  physical: {
    name: 'Physical Prehension',
    description: 'Grasps another actual occasion',
    symbol: '◆',
    weight: PHI_INV,
  },
  conceptual: {
    name: 'Conceptual Prehension',
    description: 'Grasps an eternal object (potential)',
    symbol: '◇',
    weight: PHI_INV_2,
  },
  hybrid: {
    name: 'Hybrid Prehension',
    description: 'Physical prehension of conceptual feeling',
    symbol: '◈',
    weight: PHI_INV + PHI_INV_3,
  },
};

/**
 * Occasion phases (genetic analysis)
 */
const OCCASION_PHASES = {
  conformalPhase: {
    name: 'Conformal Phase',
    description: 'Reception of data from past occasions',
    symbol: '⟵',
  },
  supplementalPhase: {
    name: 'Supplemental Phase',
    description: 'Imaginative transformation of data',
    symbol: '↻',
  },
  satisfaction: {
    name: 'Satisfaction',
    description: 'Final unity of the occasion',
    symbol: '●',
  },
};

// In-memory state
let state = {
  occasions: {},     // Actual occasions
  prehensions: [],   // Prehension relationships
  nexuses: {},       // Connected groups
  eternalObjects: {},// Pure potentials
  creativity: {
    manyBecomeOne: 0,  // Count of integrations
    increasedByOne: 0, // Novel occasions created
  },
  stats: {
    occasionsCreated: 0,
    prehensionsFormed: 0,
    nexusesIdentified: 0,
    ingressions: 0,
  },
};

/**
 * Initialize the process tracker
 */
function init() {
  if (!fs.existsSync(PROCESS_DIR)) {
    fs.mkdirSync(PROCESS_DIR, { recursive: true });
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
 * Create an actual occasion (momentary event/experience)
 *
 * @param {object} data - Occasion data
 * @returns {object} Created occasion
 */
function createOccasion(data) {
  // Prune if needed
  if (Object.keys(state.occasions).length >= MAX_OCCASIONS) {
    pruneOldOccasions();
  }

  const id = `occ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const occasion = {
    id,
    // Subjective data
    subjectiveAim: data.aim || 'satisfaction',
    subjectiveForm: data.form || 'neutral',
    // Objective data
    objectiveData: data.data || {},
    // Phase tracking
    phase: 'conformalPhase',
    phaseInfo: OCCASION_PHASES.conformalPhase,
    // Connections
    prehendedOccasions: [],  // What this occasion grasps
    prehendingOccasions: [], // What grasps this occasion
    // Eternal objects ingressed
    ingressedObjects: [],
    // Temporal
    createdAt: Date.now(),
    satisfiedAt: null,
    // Novelty - how much this adds to the world
    novelty: 0,
  };

  state.occasions[id] = occasion;
  state.stats.occasionsCreated++;
  state.creativity.increasedByOne++;

  logHistory({
    type: 'occasion_created',
    id,
    aim: occasion.subjectiveAim,
  });

  saveState();

  return occasion;
}

/**
 * Prune oldest occasions (perished occasions)
 */
function pruneOldOccasions() {
  const sorted = Object.entries(state.occasions)
    .sort((a, b) => a[1].createdAt - b[1].createdAt);

  const toRemove = sorted.slice(0, Math.round(MAX_OCCASIONS * PHI_INV_3));
  for (const [id] of toRemove) {
    // Mark as perished but keep reference for prehension
    state.occasions[id].perished = true;
    state.occasions[id].perishedAt = Date.now();
  }

  // Actually delete very old ones
  const veryOld = sorted.slice(0, Math.round(MAX_OCCASIONS * PHI_INV_3 / 2));
  for (const [id] of veryOld) {
    delete state.occasions[id];
  }
}

/**
 * Form a prehension (one occasion grasps another)
 *
 * @param {string} subjectId - The prehending occasion
 * @param {string} objectId - The prehended occasion
 * @param {string} type - Prehension type
 * @param {object} config - Additional configuration
 * @returns {object} Prehension
 */
function prehend(subjectId, objectId, type = 'physical', config = {}) {
  const subject = state.occasions[subjectId];
  const object = state.occasions[objectId];

  if (!subject) return { error: 'Subject occasion not found' };
  if (!object && type === 'physical') return { error: 'Object occasion not found' };

  if (!PREHENSION_TYPES[type]) {
    return { error: `Unknown prehension type: ${type}` };
  }

  const prehension = {
    id: `prh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    subject: subjectId,
    object: objectId,
    type,
    typeInfo: PREHENSION_TYPES[type],
    feeling: config.feeling || 'neutral',
    intensity: Math.min(config.intensity || 0.5, 1),
    formedAt: Date.now(),
  };

  // Update occasions
  subject.prehendedOccasions.push({
    occasionId: objectId,
    prehensionId: prehension.id,
    type,
  });

  if (object) {
    object.prehendingOccasions.push({
      occasionId: subjectId,
      prehensionId: prehension.id,
      type,
    });
  }

  // Track prehension
  state.prehensions.push(prehension);
  state.stats.prehensionsFormed++;
  state.creativity.manyBecomeOne++;

  // Progress subject through phases
  if (subject.phase === 'conformalPhase' && subject.prehendedOccasions.length >= 2) {
    subject.phase = 'supplementalPhase';
    subject.phaseInfo = OCCASION_PHASES.supplementalPhase;
  }

  // Keep prehensions bounded
  if (state.prehensions.length > Math.round(PHI * 200)) {
    state.prehensions = state.prehensions.slice(-Math.round(PHI * 150));
  }

  logHistory({
    type: 'prehension_formed',
    prehensionId: prehension.id,
    subject: subjectId,
    object: objectId,
    prehensionType: type,
  });

  saveState();

  return prehension;
}

/**
 * Register an eternal object (pure potential)
 *
 * @param {string} name - Object name
 * @param {object} config - Configuration
 * @returns {object} Eternal object
 */
function registerEternalObject(name, config = {}) {
  const id = `eo-${name.toLowerCase().replace(/\s+/g, '-')}`;

  if (state.eternalObjects[id]) {
    return state.eternalObjects[id];
  }

  const eternalObject = {
    id,
    name,
    category: config.category || 'general',
    description: config.description || '',
    ingressions: 0,  // How many times it has entered actuality
    createdAt: Date.now(),
  };

  state.eternalObjects[id] = eternalObject;

  saveState();

  return eternalObject;
}

/**
 * Ingress an eternal object into an actual occasion
 * (Potential becomes actual)
 *
 * @param {string} occasionId - Occasion ID
 * @param {string} eternalObjectId - Eternal object ID
 * @param {number} grade - Grade of ingression (0-1)
 * @returns {object} Ingression result
 */
function ingress(occasionId, eternalObjectId, grade = 0.5) {
  const occasion = state.occasions[occasionId];
  const eternalObject = state.eternalObjects[eternalObjectId];

  if (!occasion) return { error: 'Occasion not found' };
  if (!eternalObject) return { error: 'Eternal object not found' };

  const ingression = {
    eternalObjectId,
    name: eternalObject.name,
    grade: Math.min(grade, PHI_INV),  // φ cap on grade
    ingressedAt: Date.now(),
  };

  occasion.ingressedObjects.push(ingression);
  eternalObject.ingressions++;
  state.stats.ingressions++;

  // Calculate novelty based on ingressed objects
  occasion.novelty = calculateNovelty(occasion);

  logHistory({
    type: 'ingression',
    occasionId,
    eternalObjectId,
    name: eternalObject.name,
    grade,
  });

  saveState();

  return {
    occasion,
    ingression,
    novelty: Math.round(occasion.novelty * 100),
  };
}

/**
 * Calculate novelty of an occasion
 */
function calculateNovelty(occasion) {
  // Novelty from ingressed eternal objects
  const ingressionNovelty = occasion.ingressedObjects.reduce(
    (sum, ing) => sum + ing.grade * PHI_INV_3, 0
  );

  // Novelty from prehension diversity
  const prehensionTypes = new Set(
    occasion.prehendedOccasions.map(p => p.type)
  );
  const prehensionNovelty = prehensionTypes.size * PHI_INV_3;

  return Math.min(1, ingressionNovelty + prehensionNovelty);
}

/**
 * Satisfy an occasion (complete its becoming)
 *
 * @param {string} occasionId - Occasion ID
 * @returns {object} Satisfaction result
 */
function satisfy(occasionId) {
  const occasion = state.occasions[occasionId];
  if (!occasion) return { error: 'Occasion not found' };

  if (occasion.satisfiedAt) {
    return { error: 'Occasion already satisfied' };
  }

  occasion.phase = 'satisfaction';
  occasion.phaseInfo = OCCASION_PHASES.satisfaction;
  occasion.satisfiedAt = Date.now();

  // Calculate final novelty
  occasion.novelty = calculateNovelty(occasion);

  logHistory({
    type: 'satisfaction',
    occasionId,
    novelty: occasion.novelty,
    duration: occasion.satisfiedAt - occasion.createdAt,
  });

  saveState();

  return {
    occasion,
    novelty: Math.round(occasion.novelty * 100),
    duration: occasion.satisfiedAt - occasion.createdAt,
    prehensionCount: occasion.prehendedOccasions.length,
    message: `*nod* Occasion satisfied. Novelty: ${Math.round(occasion.novelty * 100)}%`,
  };
}

/**
 * Identify a nexus (connected group of occasions)
 *
 * @param {string} name - Nexus name
 * @param {array} occasionIds - Occasion IDs in the nexus
 * @returns {object} Identified nexus
 */
function identifyNexus(name, occasionIds) {
  if (Object.keys(state.nexuses).length >= MAX_NEXUSES) {
    // Remove oldest
    const sorted = Object.entries(state.nexuses)
      .sort((a, b) => a[1].identifiedAt - b[1].identifiedAt);
    delete state.nexuses[sorted[0][0]];
  }

  const id = `nex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Verify occasions exist
  const validOccasions = occasionIds.filter(oid => state.occasions[oid]);

  // Calculate nexus coherence (how well connected)
  const coherence = calculateNexusCoherence(validOccasions);

  const nexus = {
    id,
    name,
    occasions: validOccasions,
    coherence,
    type: coherence >= PHI_INV ? 'society' : 'aggregate',
    identifiedAt: Date.now(),
  };

  state.nexuses[id] = nexus;
  state.stats.nexusesIdentified++;

  logHistory({
    type: 'nexus_identified',
    id,
    name,
    occasionCount: validOccasions.length,
    coherence,
  });

  saveState();

  return nexus;
}

/**
 * Calculate coherence of a nexus
 */
function calculateNexusCoherence(occasionIds) {
  if (occasionIds.length < 2) return 0;

  let connections = 0;
  const maxConnections = (occasionIds.length * (occasionIds.length - 1)) / 2;

  for (let i = 0; i < occasionIds.length; i++) {
    for (let j = i + 1; j < occasionIds.length; j++) {
      const occ1 = state.occasions[occasionIds[i]];
      const occ2 = state.occasions[occasionIds[j]];

      if (!occ1 || !occ2) continue;

      // Check if connected via prehension
      const connected = occ1.prehendedOccasions.some(p => p.occasionId === occasionIds[j]) ||
                       occ2.prehendedOccasions.some(p => p.occasionId === occasionIds[i]);

      if (connected) connections++;
    }
  }

  return maxConnections > 0 ? connections / maxConnections : 0;
}

/**
 * Get creativity metrics
 */
function getCreativity() {
  return {
    manyBecomeOne: state.creativity.manyBecomeOne,
    increasedByOne: state.creativity.increasedByOne,
    ratio: state.creativity.manyBecomeOne > 0
      ? state.creativity.increasedByOne / state.creativity.manyBecomeOne
      : 0,
    description: '"The many become one and are increased by one" - Whitehead',
  };
}

/**
 * Get statistics
 */
function getStats() {
  const activeOccasions = Object.values(state.occasions)
    .filter(o => !o.perished);
  const satisfiedOccasions = activeOccasions.filter(o => o.satisfiedAt);

  return {
    ...state.stats,
    activeOccasions: activeOccasions.length,
    satisfiedOccasions: satisfiedOccasions.length,
    eternalObjects: Object.keys(state.eternalObjects).length,
    nexuses: Object.keys(state.nexuses).length,
    avgNovelty: satisfiedOccasions.length > 0
      ? satisfiedOccasions.reduce((sum, o) => sum + o.novelty, 0) / satisfiedOccasions.length
      : 0,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();
  const creativity = getCreativity();

  let status = `◆ Process Tracker (Whitehead)\n`;
  status += `  Occasions: ${stats.activeOccasions} active, ${stats.satisfiedOccasions} satisfied\n`;
  status += `  Prehensions: ${stats.prehensionsFormed}\n`;
  status += `  Eternal objects: ${stats.eternalObjects}\n`;
  status += `  Nexuses: ${stats.nexuses}\n`;
  status += `  Creativity: ${creativity.increasedByOne} → ${creativity.manyBecomeOne}\n`;
  status += `  Avg novelty: ${Math.round(stats.avgNovelty * 100)}%\n`;

  return status;
}

module.exports = {
  init,
  createOccasion,
  prehend,
  registerEternalObject,
  ingress,
  satisfy,
  identifyNexus,
  getCreativity,
  getStats,
  formatStatus,
  PREHENSION_TYPES,
  OCCASION_PHASES,
};
