/**
 * Concrescence Monitor - Potentials Becoming Actualities
 *
 * Philosophy: Whitehead's "concrescence" - the process by which
 * multiple potentials "grow together" into a single actuality.
 * Every actual entity is a decision that excludes alternatives.
 *
 * Key concepts:
 * - Concrescence: Growing together of potentials into unity
 * - Potentiality: Real possibilities that could actualize
 * - Actuality: Definite, determined, no longer potential
 * - Decision: The "cutting off" (de-caedere) of alternatives
 * - Satisfaction: The final unity achieved
 *
 * In CYNIC: Track how options narrow to decisions, how
 * possibilities become implementations, the cost of exclusion.
 *
 * @module concrescence-monitor
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
const CONCRESCENCE_DIR = path.join(CYNIC_DIR, 'concrescence');
const STATE_FILE = path.join(CONCRESCENCE_DIR, 'state.json');
const HISTORY_FILE = path.join(CONCRESCENCE_DIR, 'history.jsonl');

// Constants
const MAX_CONCRESCENCES = Math.round(PHI * 30);  // ~49
const DECISION_THRESHOLD = PHI_INV;               // When potentials narrow enough

/**
 * Concrescence phases
 */
const CONCRESCENCE_PHASES = {
  initial: {
    name: 'Initial Phase',
    description: 'Many potentials coexist',
    symbol: '◇',
    narrowingRequired: 0,
  },
  responsive: {
    name: 'Responsive Phase',
    description: 'Feeling initial data',
    symbol: '◈',
    narrowingRequired: PHI_INV_3,
  },
  supplemental: {
    name: 'Supplemental Phase',
    description: 'Adding subjective forms',
    symbol: '◆',
    narrowingRequired: PHI_INV_2,
  },
  decision: {
    name: 'Decision Phase',
    description: 'Cutting off alternatives',
    symbol: '●',
    narrowingRequired: PHI_INV,
  },
  satisfaction: {
    name: 'Satisfaction',
    description: 'Unity achieved, actuality born',
    symbol: '★',
    narrowingRequired: 1.0,
  },
};

/**
 * Potential states
 */
const POTENTIAL_STATES = {
  active: {
    name: 'Active',
    description: 'Still viable, could actualize',
    symbol: '○',
  },
  weakening: {
    name: 'Weakening',
    description: 'Losing relevance',
    symbol: '◔',
  },
  excluded: {
    name: 'Excluded',
    description: 'Cut off by decision',
    symbol: '✕',
  },
  actualized: {
    name: 'Actualized',
    description: 'Became the actuality',
    symbol: '●',
  },
};

/**
 * Decision types
 */
const DECISION_TYPES = {
  elimination: {
    name: 'Elimination',
    description: 'Remove option entirely',
    strength: 1.0,
  },
  preference: {
    name: 'Preference',
    description: 'Favor one over others',
    strength: PHI_INV,
  },
  synthesis: {
    name: 'Synthesis',
    description: 'Combine multiple potentials',
    strength: PHI_INV_2,
  },
  deferral: {
    name: 'Deferral',
    description: 'Postpone decision',
    strength: 0,
  },
};

// In-memory state
let state = {
  concrescences: {},     // Active concrescence processes
  actualities: [],       // Completed concrescences
  decisionHistory: [],   // History of decisions
  exclusionCosts: [],    // What was lost in decisions
  stats: {
    concrescencesStarted: 0,
    actualitiesCreated: 0,
    decisionsRecorded: 0,
    potentialsExcluded: 0,
  },
};

/**
 * Initialize the concrescence monitor
 */
function init() {
  if (!fs.existsSync(CONCRESCENCE_DIR)) {
    fs.mkdirSync(CONCRESCENCE_DIR, { recursive: true });
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
 * Start a concrescence (process of becoming)
 *
 * @param {string} subject - What is becoming
 * @param {array} potentials - Initial possibilities
 * @returns {object} New concrescence
 */
function startConcrescence(subject, potentials = []) {
  // Prune if needed
  if (Object.keys(state.concrescences).length >= MAX_CONCRESCENCES) {
    pruneOldConcrescences();
  }

  const id = `con-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Initialize potentials
  const initialPotentials = potentials.map((p, index) => ({
    id: `pot-${id}-${index}`,
    content: typeof p === 'string' ? p : p.content,
    weight: typeof p === 'object' ? (p.weight || 1.0) : 1.0,
    state: 'active',
    stateInfo: POTENTIAL_STATES.active,
    addedAt: Date.now(),
    excludedAt: null,
    excludedBy: null,
  }));

  const concrescence = {
    id,
    subject,
    potentials: initialPotentials,
    phase: 'initial',
    phaseInfo: CONCRESCENCE_PHASES.initial,
    decisions: [],
    narrowing: 0,  // 0 = wide open, 1 = fully decided
    actuality: null,
    createdAt: Date.now(),
    satisfiedAt: null,
  };

  state.concrescences[id] = concrescence;
  state.stats.concrescencesStarted++;

  logHistory({
    type: 'concrescence_started',
    id,
    subject,
    potentialCount: initialPotentials.length,
  });

  saveState();

  return concrescence;
}

/**
 * Prune old concrescences
 */
function pruneOldConcrescences() {
  const sorted = Object.entries(state.concrescences)
    .filter(([, c]) => !c.satisfiedAt)
    .sort((a, b) => a[1].createdAt - b[1].createdAt);

  const toRemove = sorted.slice(0, Math.round(MAX_CONCRESCENCES * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.concrescences[id];
  }
}

/**
 * Add a potential to an existing concrescence
 *
 * @param {string} concrescenceId - Concrescence ID
 * @param {object|string} potential - New potential
 * @returns {object} Updated concrescence
 */
function addPotential(concrescenceId, potential) {
  const concrescence = state.concrescences[concrescenceId];
  if (!concrescence) return { error: 'Concrescence not found' };

  if (concrescence.satisfiedAt) {
    return { error: 'Concrescence already satisfied' };
  }

  const newPotential = {
    id: `pot-${concrescenceId}-${concrescence.potentials.length}`,
    content: typeof potential === 'string' ? potential : potential.content,
    weight: typeof potential === 'object' ? (potential.weight || 1.0) : 1.0,
    state: 'active',
    stateInfo: POTENTIAL_STATES.active,
    addedAt: Date.now(),
    excludedAt: null,
    excludedBy: null,
  };

  concrescence.potentials.push(newPotential);

  // Adding potentials widens narrowing slightly
  concrescence.narrowing = Math.max(0, concrescence.narrowing - PHI_INV_3);
  updatePhase(concrescence);

  saveState();

  return {
    concrescence,
    added: newPotential,
    totalPotentials: concrescence.potentials.length,
    activePotentials: concrescence.potentials.filter(p => p.state === 'active').length,
  };
}

/**
 * Make a decision (narrow potentials)
 *
 * @param {string} concrescenceId - Concrescence ID
 * @param {object} decision - Decision details
 * @returns {object} Decision result
 */
function decide(concrescenceId, decision) {
  const concrescence = state.concrescences[concrescenceId];
  if (!concrescence) return { error: 'Concrescence not found' };

  if (concrescence.satisfiedAt) {
    return { error: 'Concrescence already satisfied' };
  }

  const decisionType = DECISION_TYPES[decision.type] || DECISION_TYPES.preference;

  const decisionRecord = {
    id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: decision.type || 'preference',
    typeInfo: decisionType,
    reason: decision.reason || '',
    affected: [],
    madeAt: Date.now(),
  };

  // Apply decision to potentials
  const excluded = [];
  let favored = null;

  if (decision.exclude) {
    // Exclude specific potentials
    for (const potId of decision.exclude) {
      const potential = concrescence.potentials.find(p => p.id === potId || p.content === potId);
      if (potential && potential.state === 'active') {
        potential.state = 'excluded';
        potential.stateInfo = POTENTIAL_STATES.excluded;
        potential.excludedAt = Date.now();
        potential.excludedBy = decisionRecord.id;
        excluded.push(potential);
        decisionRecord.affected.push({ id: potential.id, action: 'excluded' });
        state.stats.potentialsExcluded++;

        // Record exclusion cost
        state.exclusionCosts.push({
          potentialId: potential.id,
          content: potential.content,
          weight: potential.weight,
          reason: decision.reason,
          timestamp: Date.now(),
        });
      }
    }
  }

  if (decision.favor) {
    // Favor a potential (increase its weight)
    const potential = concrescence.potentials.find(
      p => p.id === decision.favor || p.content === decision.favor
    );
    if (potential && potential.state === 'active') {
      potential.weight = Math.min(2, potential.weight * PHI);
      favored = potential;
      decisionRecord.affected.push({ id: potential.id, action: 'favored' });
    }
  }

  concrescence.decisions.push(decisionRecord);
  state.decisionHistory.push(decisionRecord);
  state.stats.decisionsRecorded++;

  // Update narrowing
  updateNarrowing(concrescence);
  updatePhase(concrescence);

  // Keep decision history bounded
  if (state.decisionHistory.length > Math.round(PHI * 100)) {
    state.decisionHistory = state.decisionHistory.slice(-Math.round(PHI * 80));
  }
  if (state.exclusionCosts.length > Math.round(PHI * 50)) {
    state.exclusionCosts = state.exclusionCosts.slice(-Math.round(PHI * 40));
  }

  logHistory({
    type: 'decision_made',
    concrescenceId,
    decisionId: decisionRecord.id,
    excluded: excluded.length,
    favored: favored ? favored.id : null,
  });

  saveState();

  return {
    decision: decisionRecord,
    excluded: excluded.map(p => p.content),
    favored: favored ? favored.content : null,
    narrowing: Math.round(concrescence.narrowing * 100),
    phase: concrescence.phase,
    readyForSatisfaction: concrescence.narrowing >= DECISION_THRESHOLD,
  };
}

/**
 * Update narrowing based on active potentials
 */
function updateNarrowing(concrescence) {
  const active = concrescence.potentials.filter(p => p.state === 'active');
  const total = concrescence.potentials.length;

  if (total === 0) {
    concrescence.narrowing = 0;
    return;
  }

  // Narrowing = 1 - (active / total), with weight consideration
  const activeWeight = active.reduce((sum, p) => sum + p.weight, 0);
  const totalWeight = concrescence.potentials.reduce((sum, p) => sum + p.weight, 0);

  // More excluded = more narrowed
  const excludedRatio = 1 - (active.length / total);
  const weightRatio = totalWeight > 0 ? 1 - (activeWeight / totalWeight) : 0;

  concrescence.narrowing = (excludedRatio * PHI_INV + weightRatio * PHI_INV_2);

  // Single potential = fully narrowed
  if (active.length === 1) {
    concrescence.narrowing = 1;
  }
}

/**
 * Update phase based on narrowing
 */
function updatePhase(concrescence) {
  for (const [phase, config] of Object.entries(CONCRESCENCE_PHASES).reverse()) {
    if (concrescence.narrowing >= config.narrowingRequired) {
      concrescence.phase = phase;
      concrescence.phaseInfo = config;
      break;
    }
  }
}

/**
 * Satisfy concrescence (achieve actuality)
 *
 * @param {string} concrescenceId - Concrescence ID
 * @param {string} actualityContent - What became actual (if not auto-determined)
 * @returns {object} Satisfaction result
 */
function satisfy(concrescenceId, actualityContent = null) {
  const concrescence = state.concrescences[concrescenceId];
  if (!concrescence) return { error: 'Concrescence not found' };

  if (concrescence.satisfiedAt) {
    return { error: 'Already satisfied' };
  }

  const active = concrescence.potentials.filter(p => p.state === 'active');

  // Determine actuality
  let actuality;
  if (actualityContent) {
    actuality = actualityContent;
  } else if (active.length === 1) {
    actuality = active[0].content;
    active[0].state = 'actualized';
    active[0].stateInfo = POTENTIAL_STATES.actualized;
  } else if (active.length > 1) {
    // Pick highest weight
    const best = active.sort((a, b) => b.weight - a.weight)[0];
    actuality = best.content;
    best.state = 'actualized';
    best.stateInfo = POTENTIAL_STATES.actualized;
    // Exclude others
    for (const p of active) {
      if (p.state === 'active') {
        p.state = 'excluded';
        p.stateInfo = POTENTIAL_STATES.excluded;
        p.excludedAt = Date.now();
        p.excludedBy = 'satisfaction';
      }
    }
  } else {
    return { error: 'No active potentials to actualize' };
  }

  concrescence.actuality = {
    content: actuality,
    achievedAt: Date.now(),
  };
  concrescence.satisfiedAt = Date.now();
  concrescence.phase = 'satisfaction';
  concrescence.phaseInfo = CONCRESCENCE_PHASES.satisfaction;
  concrescence.narrowing = 1;

  // Record as completed actuality
  state.actualities.push({
    concrescenceId,
    subject: concrescence.subject,
    actuality,
    potentialsConsidered: concrescence.potentials.length,
    decisionsRequired: concrescence.decisions.length,
    duration: concrescence.satisfiedAt - concrescence.createdAt,
    timestamp: Date.now(),
  });

  state.stats.actualitiesCreated++;

  // Keep actualities bounded
  if (state.actualities.length > Math.round(PHI * 50)) {
    state.actualities = state.actualities.slice(-Math.round(PHI * 40));
  }

  logHistory({
    type: 'concrescence_satisfied',
    concrescenceId,
    actuality,
    potentials: concrescence.potentials.length,
    decisions: concrescence.decisions.length,
  });

  saveState();

  return {
    concrescence,
    actuality,
    excludedCount: concrescence.potentials.filter(p => p.state === 'excluded').length,
    decisionsRequired: concrescence.decisions.length,
    message: `*nod* Concrescence satisfied. "${actuality}" became actual.`,
  };
}

/**
 * Get exclusion cost analysis
 */
function getExclusionCosts(concrescenceId = null) {
  let costs = state.exclusionCosts;

  if (concrescenceId) {
    const concrescence = state.concrescences[concrescenceId];
    if (!concrescence) return { error: 'Concrescence not found' };

    costs = concrescence.potentials
      .filter(p => p.state === 'excluded')
      .map(p => ({
        content: p.content,
        weight: p.weight,
        excludedBy: p.excludedBy,
      }));
  }

  const totalWeight = costs.reduce((sum, c) => sum + (c.weight || 1), 0);

  return {
    excluded: costs.length,
    totalWeight,
    averageWeight: costs.length > 0 ? totalWeight / costs.length : 0,
    items: costs.slice(-10),  // Most recent
    message: costs.length > 0
      ? `${costs.length} possibilities were excluded. Weight lost: ${totalWeight.toFixed(2)}`
      : 'No exclusions yet.',
  };
}

/**
 * Get statistics
 */
function getStats() {
  const activeConcrescences = Object.values(state.concrescences)
    .filter(c => !c.satisfiedAt);

  return {
    ...state.stats,
    activeConcrescences: activeConcrescences.length,
    actualities: state.actualities.length,
    avgDecisionsPerActuality: state.stats.actualitiesCreated > 0
      ? (state.stats.decisionsRecorded / state.stats.actualitiesCreated).toFixed(1)
      : 0,
    avgExclusionsPerActuality: state.stats.actualitiesCreated > 0
      ? (state.stats.potentialsExcluded / state.stats.actualitiesCreated).toFixed(1)
      : 0,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `★ Concrescence Monitor\n`;
  status += `  Active processes: ${stats.activeConcrescences}\n`;
  status += `  Actualities created: ${stats.actualitiesCreated}\n`;
  status += `  Decisions recorded: ${stats.decisionsRecorded}\n`;
  status += `  Potentials excluded: ${stats.potentialsExcluded}\n`;
  status += `  Avg decisions/actuality: ${stats.avgDecisionsPerActuality}\n`;

  return status;
}

module.exports = {
  init,
  startConcrescence,
  addPotential,
  decide,
  satisfy,
  getExclusionCosts,
  getStats,
  formatStatus,
  CONCRESCENCE_PHASES,
  POTENTIAL_STATES,
  DECISION_TYPES,
};
