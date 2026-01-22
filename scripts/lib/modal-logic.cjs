/**
 * Modal Logic - Necessity & Possibility
 *
 * Philosophy: Saul Kripke's possible worlds semantics revolutionized
 * modal logic. Necessity (□) means true in all accessible worlds.
 * Possibility (◇) means true in at least one accessible world.
 *
 * Key concepts:
 * - Necessity (□): Could not have been otherwise
 * - Possibility (◇): Could be the case
 * - Accessibility: Which worlds are "reachable" from current world
 * - Modal systems: K, T, S4, S5 (different accessibility properties)
 * - Rigid designators: Names that refer to same thing in all worlds
 *
 * In CYNIC: Track modal claims, evaluate necessity vs contingency,
 * support reasoning about what must be vs what could be.
 *
 * @module modal-logic
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
const MODAL_DIR = path.join(CYNIC_DIR, 'modal');
const STATE_FILE = path.join(MODAL_DIR, 'state.json');
const HISTORY_FILE = path.join(MODAL_DIR, 'history.jsonl');

// Constants
const MAX_PROPOSITIONS = Math.round(PHI * 80);    // ~130
const MAX_WORLDS = Math.round(PHI * 20);          // ~32
const NECESSITY_THRESHOLD = PHI_INV + PHI_INV_2;  // ~1.0 (very high)

/**
 * Modal operators
 */
const MODAL_OPERATORS = {
  necessary: {
    name: 'Necessary',
    symbol: '□',
    description: 'True in all accessible worlds',
    quantifier: 'all',
  },
  possible: {
    name: 'Possible',
    symbol: '◇',
    description: 'True in at least one accessible world',
    quantifier: 'some',
  },
  contingent: {
    name: 'Contingent',
    symbol: '○',
    description: 'True but could have been false',
    quantifier: 'some_not_all',
  },
  impossible: {
    name: 'Impossible',
    symbol: '⊗',
    description: 'True in no accessible worlds',
    quantifier: 'none',
  },
};

/**
 * Modal systems (different accessibility relations)
 */
const MODAL_SYSTEMS = {
  K: {
    name: 'System K',
    description: 'Minimal modal logic - no constraints on accessibility',
    properties: [],
    strength: PHI_INV_3,
  },
  T: {
    name: 'System T',
    description: 'Reflexive - every world accesses itself',
    properties: ['reflexive'],
    strength: PHI_INV_2,
    axiom: '□P → P (what is necessary is actual)',
  },
  S4: {
    name: 'System S4',
    description: 'Reflexive + transitive',
    properties: ['reflexive', 'transitive'],
    strength: PHI_INV,
    axiom: '□P → □□P (necessity is necessary)',
  },
  S5: {
    name: 'System S5',
    description: 'Reflexive + symmetric + transitive (equivalence)',
    properties: ['reflexive', 'symmetric', 'transitive'],
    strength: PHI_INV + PHI_INV_3,
    axiom: '◇P → □◇P (what is possible is necessarily possible)',
  },
  D: {
    name: 'System D',
    description: 'Serial - every world accesses at least one world',
    properties: ['serial'],
    strength: PHI_INV_2,
    axiom: '□P → ◇P (necessity implies possibility)',
  },
};

/**
 * Modality types
 */
const MODALITY_TYPES = {
  alethic: {
    name: 'Alethic',
    description: 'Logical/metaphysical necessity',
    example: '2+2=4 is necessarily true',
    strength: 1.0,
  },
  epistemic: {
    name: 'Epistemic',
    description: 'What is known or knowable',
    example: 'It is possible the treasure is here (for all we know)',
    strength: PHI_INV,
  },
  deontic: {
    name: 'Deontic',
    description: 'Obligation and permission',
    example: 'You must (ought to) keep promises',
    strength: PHI_INV,
  },
  temporal: {
    name: 'Temporal',
    description: 'Always/sometimes in time',
    example: 'It will always be true that 2+2=4',
    strength: PHI_INV + PHI_INV_3,
  },
  doxastic: {
    name: 'Doxastic',
    description: 'What is believed',
    example: 'She believes it is possible to succeed',
    strength: PHI_INV_2,
  },
};

// In-memory state
let state = {
  propositions: {},     // Modal propositions
  worlds: {},           // Possible worlds (simplified)
  actualWorld: 'w0',    // The actual world
  accessibility: [],    // Accessibility relations
  system: 'S5',         // Current modal system
  stats: {
    propositionsAdded: 0,
    worldsCreated: 0,
    necessityClaims: 0,
    possibilityClaims: 0,
    evaluations: 0,
  },
};

/**
 * Initialize the modal logic module
 */
function init() {
  if (!fs.existsSync(MODAL_DIR)) {
    fs.mkdirSync(MODAL_DIR, { recursive: true });
  }

  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      // Start fresh
    }
  }

  // Ensure actual world exists
  if (!state.worlds[state.actualWorld]) {
    state.worlds[state.actualWorld] = {
      id: state.actualWorld,
      name: 'Actual World',
      isActual: true,
      propositions: {},
      createdAt: Date.now(),
    };
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
 * Set the modal system
 *
 * @param {string} system - System name (K, T, S4, S5, D)
 * @returns {object} System info
 */
function setSystem(system) {
  if (!MODAL_SYSTEMS[system]) {
    return { error: `Unknown modal system: ${system}` };
  }

  state.system = system;
  saveState();

  return {
    system,
    info: MODAL_SYSTEMS[system],
    message: `Modal system set to ${system}: ${MODAL_SYSTEMS[system].description}`,
  };
}

/**
 * Create a possible world
 *
 * @param {string} name - World name
 * @param {object} config - World configuration
 * @returns {object} Created world
 */
function createWorld(name, config = {}) {
  // Prune if needed
  if (Object.keys(state.worlds).length >= MAX_WORLDS) {
    pruneWorlds();
  }

  const id = `w${Object.keys(state.worlds).length}`;

  const world = {
    id,
    name,
    isActual: false,
    description: config.description || '',
    propositions: {},  // Truth values in this world
    similarity: config.similarity || PHI_INV,  // Similarity to actual world
    createdAt: Date.now(),
  };

  state.worlds[id] = world;
  state.stats.worldsCreated++;

  // Add accessibility based on system
  ensureAccessibility(state.actualWorld, id);

  logHistory({
    type: 'world_created',
    id,
    name,
  });

  saveState();

  return world;
}

/**
 * Prune least similar worlds
 */
function pruneWorlds() {
  const sorted = Object.entries(state.worlds)
    .filter(([id]) => id !== state.actualWorld)  // Keep actual
    .sort((a, b) => a[1].similarity - b[1].similarity);

  const toRemove = sorted.slice(0, Math.round(MAX_WORLDS * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.worlds[id];
    // Remove accessibility relations
    state.accessibility = state.accessibility.filter(
      a => a.from !== id && a.to !== id
    );
  }
}

/**
 * Ensure accessibility relation exists based on current system
 */
function ensureAccessibility(fromId, toId) {
  const systemProps = MODAL_SYSTEMS[state.system].properties;

  // Add forward relation
  if (!state.accessibility.find(a => a.from === fromId && a.to === toId)) {
    state.accessibility.push({ from: fromId, to: toId });
  }

  // Reflexive: world accesses itself
  if (systemProps.includes('reflexive')) {
    if (!state.accessibility.find(a => a.from === toId && a.to === toId)) {
      state.accessibility.push({ from: toId, to: toId });
    }
  }

  // Symmetric: if A accesses B, B accesses A
  if (systemProps.includes('symmetric')) {
    if (!state.accessibility.find(a => a.from === toId && a.to === fromId)) {
      state.accessibility.push({ from: toId, to: fromId });
    }
  }

  // For S5, all worlds access all worlds
  if (state.system === 'S5') {
    for (const wId of Object.keys(state.worlds)) {
      for (const wId2 of Object.keys(state.worlds)) {
        if (!state.accessibility.find(a => a.from === wId && a.to === wId2)) {
          state.accessibility.push({ from: wId, to: wId2 });
        }
      }
    }
  }
}

/**
 * Add a modal proposition
 *
 * @param {string} content - Proposition content
 * @param {string} modality - Modal operator
 * @param {object} config - Configuration
 * @returns {object} Added proposition
 */
function addProposition(content, modality = 'contingent', config = {}) {
  // Prune if needed
  if (Object.keys(state.propositions).length >= MAX_PROPOSITIONS) {
    prunePropositions();
  }

  const id = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const operator = MODAL_OPERATORS[modality] || MODAL_OPERATORS.contingent;
  const modalityType = MODALITY_TYPES[config.type] || MODALITY_TYPES.alethic;

  const proposition = {
    id,
    content,
    modality,
    operator,
    modalityType,
    // Truth values across worlds
    worldTruth: {},
    // Computed modal status
    isNecessary: false,
    isPossible: false,
    isContingent: false,
    isImpossible: false,
    addedAt: Date.now(),
  };

  // Set initial truth value in actual world if provided
  if (config.actualTruth !== undefined) {
    proposition.worldTruth[state.actualWorld] = config.actualTruth;
  }

  state.propositions[id] = proposition;
  state.stats.propositionsAdded++;

  if (modality === 'necessary') state.stats.necessityClaims++;
  if (modality === 'possible') state.stats.possibilityClaims++;

  logHistory({
    type: 'proposition_added',
    id,
    modality,
    content: content.slice(0, 50),
  });

  saveState();

  return proposition;
}

/**
 * Prune old propositions
 */
function prunePropositions() {
  const sorted = Object.entries(state.propositions)
    .sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0));

  const toRemove = sorted.slice(0, Math.round(MAX_PROPOSITIONS * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.propositions[id];
  }
}

/**
 * Set truth value of proposition in a world
 *
 * @param {string} propId - Proposition ID
 * @param {string} worldId - World ID
 * @param {boolean} truth - Truth value
 * @returns {object} Update result
 */
function setTruth(propId, worldId, truth) {
  const proposition = state.propositions[propId];
  if (!proposition) return { error: 'Proposition not found' };

  const world = state.worlds[worldId];
  if (!world) return { error: 'World not found' };

  proposition.worldTruth[worldId] = truth;
  world.propositions[propId] = truth;

  saveState();

  return {
    proposition,
    world: worldId,
    truth,
    message: `${proposition.content} is ${truth ? 'true' : 'false'} in ${world.name}`,
  };
}

/**
 * Evaluate modal status of a proposition
 *
 * @param {string} propId - Proposition ID
 * @returns {object} Modal evaluation
 */
function evaluate(propId) {
  const proposition = state.propositions[propId];
  if (!proposition) return { error: 'Proposition not found' };

  // Get accessible worlds from actual world
  const accessibleWorlds = getAccessibleWorlds(state.actualWorld);

  // Check truth in all accessible worlds
  let trueCount = 0;
  let falseCount = 0;
  let unknownCount = 0;

  for (const worldId of accessibleWorlds) {
    const truth = proposition.worldTruth[worldId];
    if (truth === true) trueCount++;
    else if (truth === false) falseCount++;
    else unknownCount++;
  }

  const totalKnown = trueCount + falseCount;
  const total = accessibleWorlds.length;

  // Determine modal status
  proposition.isNecessary = trueCount === total && total > 0;
  proposition.isPossible = trueCount > 0;
  proposition.isImpossible = trueCount === 0 && falseCount === total && total > 0;
  proposition.isContingent = trueCount > 0 && falseCount > 0;

  // Calculate modal strength
  let modalStrength = 0;
  if (proposition.isNecessary) {
    modalStrength = 1.0;
  } else if (proposition.isPossible) {
    modalStrength = totalKnown > 0 ? trueCount / totalKnown : PHI_INV_2;
  }

  state.stats.evaluations++;
  saveState();

  return {
    proposition,
    accessibleWorlds: total,
    trueIn: trueCount,
    falseIn: falseCount,
    unknownIn: unknownCount,
    status: {
      necessary: proposition.isNecessary,
      possible: proposition.isPossible,
      contingent: proposition.isContingent,
      impossible: proposition.isImpossible,
    },
    modalStrength: Math.round(modalStrength * 100),
    symbol: proposition.isNecessary ? '□' :
            proposition.isPossible ? '◇' :
            proposition.isImpossible ? '⊗' : '○',
    message: formatModalStatus(proposition),
  };
}

/**
 * Get accessible worlds from a given world
 */
function getAccessibleWorlds(worldId) {
  return state.accessibility
    .filter(a => a.from === worldId)
    .map(a => a.to);
}

/**
 * Format modal status message
 */
function formatModalStatus(prop) {
  if (prop.isNecessary) return `□ ${prop.content} (necessarily true)`;
  if (prop.isImpossible) return `⊗ ${prop.content} (impossible)`;
  if (prop.isContingent) return `○ ${prop.content} (contingently true)`;
  if (prop.isPossible) return `◇ ${prop.content} (possibly true)`;
  return `? ${prop.content} (unknown modal status)`;
}

/**
 * Check if necessity holds: □P
 *
 * @param {string} propId - Proposition ID
 * @returns {object} Necessity check
 */
function checkNecessary(propId) {
  const result = evaluate(propId);
  if (result.error) return result;

  return {
    ...result,
    holds: result.status.necessary,
    symbol: '□',
    message: result.status.necessary
      ? `*nod* □${result.proposition.content.slice(0, 30)}... holds`
      : `*sniff* □${result.proposition.content.slice(0, 30)}... does not hold`,
  };
}

/**
 * Check if possibility holds: ◇P
 *
 * @param {string} propId - Proposition ID
 * @returns {object} Possibility check
 */
function checkPossible(propId) {
  const result = evaluate(propId);
  if (result.error) return result;

  return {
    ...result,
    holds: result.status.possible,
    symbol: '◇',
    message: result.status.possible
      ? `*nod* ◇${result.proposition.content.slice(0, 30)}... holds`
      : `*sniff* ◇${result.proposition.content.slice(0, 30)}... does not hold`,
  };
}

/**
 * Apply modal axiom
 *
 * @param {string} axiom - Axiom name
 * @param {string} propId - Proposition ID
 * @returns {object} Axiom application result
 */
function applyAxiom(axiom, propId) {
  const proposition = state.propositions[propId];
  if (!proposition) return { error: 'Proposition not found' };

  const result = evaluate(propId);

  switch (axiom) {
    case 'T': // □P → P (necessity implies actuality)
      if (result.status.necessary) {
        return {
          axiom: 'T',
          description: '□P → P',
          premise: `□${proposition.content}`,
          conclusion: proposition.content,
          valid: true,
          message: 'From necessity follows actuality',
        };
      }
      break;

    case 'D': // □P → ◇P (necessity implies possibility)
      if (result.status.necessary) {
        return {
          axiom: 'D',
          description: '□P → ◇P',
          premise: `□${proposition.content}`,
          conclusion: `◇${proposition.content}`,
          valid: true,
          message: 'From necessity follows possibility',
        };
      }
      break;

    case '4': // □P → □□P (necessity is necessary)
      if (result.status.necessary && state.system === 'S4' || state.system === 'S5') {
        return {
          axiom: '4',
          description: '□P → □□P',
          premise: `□${proposition.content}`,
          conclusion: `□□${proposition.content}`,
          valid: true,
          message: 'Necessity is itself necessary',
        };
      }
      break;

    case '5': // ◇P → □◇P (possibility is necessary)
      if (result.status.possible && state.system === 'S5') {
        return {
          axiom: '5',
          description: '◇P → □◇P',
          premise: `◇${proposition.content}`,
          conclusion: `□◇${proposition.content}`,
          valid: true,
          message: 'Possibility is necessarily possible',
        };
      }
      break;
  }

  return {
    axiom,
    valid: false,
    message: `Axiom ${axiom} does not apply in current system or proposition state`,
  };
}

/**
 * Get statistics
 */
function getStats() {
  return {
    ...state.stats,
    system: state.system,
    systemInfo: MODAL_SYSTEMS[state.system],
    totalPropositions: Object.keys(state.propositions).length,
    totalWorlds: Object.keys(state.worlds).length,
    accessibilityRelations: state.accessibility.length,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `□ Modal Logic (Kripke)\n`;
  status += `  System: ${stats.system} - ${stats.systemInfo.description}\n`;
  status += `  Propositions: ${stats.totalPropositions}\n`;
  status += `  Worlds: ${stats.totalWorlds}\n`;
  status += `  Accessibility: ${stats.accessibilityRelations} relations\n`;
  status += `  Necessity claims: ${stats.necessityClaims}\n`;
  status += `  Possibility claims: ${stats.possibilityClaims}\n`;

  return status;
}

module.exports = {
  init,
  setSystem,
  createWorld,
  addProposition,
  setTruth,
  evaluate,
  checkNecessary,
  checkPossible,
  applyAxiom,
  getAccessibleWorlds,
  getStats,
  formatStatus,
  MODAL_OPERATORS,
  MODAL_SYSTEMS,
  MODALITY_TYPES,
};
