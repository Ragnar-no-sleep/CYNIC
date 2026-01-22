/**
 * Possible Worlds - World Semantics & Similarity
 *
 * Philosophy: David Lewis's modal realism treats possible worlds as
 * concrete realities. Less radically, we use possible worlds as
 * abstract models for evaluating modal claims and counterfactuals.
 *
 * Key concepts:
 * - Possible world: A complete way things could be
 * - Actual world: The world we inhabit
 * - Similarity: How close one world is to another
 * - Counterpart: The "version" of an individual in another world
 * - Natural laws: Constraints that define world coherence
 *
 * In CYNIC: Construct worlds for reasoning, measure similarity,
 * support counterfactual analysis, track what varies vs what's fixed.
 *
 * @module possible-worlds
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
const WORLDS_DIR = path.join(CYNIC_DIR, 'worlds');
const STATE_FILE = path.join(WORLDS_DIR, 'state.json');
const HISTORY_FILE = path.join(WORLDS_DIR, 'history.jsonl');

// Constants
const MAX_WORLDS = Math.round(PHI * 30);          // ~49
const MAX_FACTS = Math.round(PHI * 100);          // ~162
const SIMILARITY_THRESHOLD = PHI_INV;             // 0.618

/**
 * World types
 */
const WORLD_TYPES = {
  actual: {
    name: 'Actual',
    description: 'The world as it is',
    symbol: '@',
    isActual: true,
  },
  possible: {
    name: 'Possible',
    description: 'A coherent way things could be',
    symbol: '◇',
    isActual: false,
  },
  impossible: {
    name: 'Impossible',
    description: 'Contains contradictions (for analysis)',
    symbol: '⊗',
    isActual: false,
  },
  fictional: {
    name: 'Fictional',
    description: 'Stipulated for reasoning purposes',
    symbol: '∿',
    isActual: false,
  },
  counterfactual: {
    name: 'Counterfactual',
    description: 'How things would be if...',
    symbol: '⟳',
    isActual: false,
  },
};

/**
 * Fact types (what makes up a world)
 */
const FACT_TYPES = {
  particular: {
    name: 'Particular Fact',
    description: 'Specific state of affairs',
    weight: PHI_INV_2,
    essential: false,
  },
  law: {
    name: 'Natural Law',
    description: 'Regularity governing the world',
    weight: PHI_INV + PHI_INV_2,
    essential: true,
  },
  logical: {
    name: 'Logical Truth',
    description: 'True in all possible worlds',
    weight: 1.0,
    essential: true,
  },
  mathematical: {
    name: 'Mathematical Truth',
    description: 'Necessary truths of mathematics',
    weight: 1.0,
    essential: true,
  },
  initial: {
    name: 'Initial Condition',
    description: 'Starting state of the world',
    weight: PHI_INV,
    essential: false,
  },
};

/**
 * Similarity dimensions (Lewis's weighted spheres)
 */
const SIMILARITY_DIMENSIONS = {
  laws: {
    name: 'Natural Laws',
    description: 'Same physical/causal laws',
    weight: PHI_INV + PHI_INV_2,  // Most important
  },
  history: {
    name: 'History',
    description: 'Same past events',
    weight: PHI_INV,
  },
  particulars: {
    name: 'Particular Facts',
    description: 'Same individual facts',
    weight: PHI_INV_2,
  },
  individuals: {
    name: 'Same Individuals',
    description: 'Same entities exist',
    weight: PHI_INV_2,
  },
  future: {
    name: 'Future Convergence',
    description: 'Similar future trajectory',
    weight: PHI_INV_3,
  },
};

// In-memory state
let state = {
  worlds: {},          // All worlds
  actualWorldId: null, // ID of actual world
  facts: {},           // Global fact registry
  counterparts: [],    // Counterpart relations
  stats: {
    worldsCreated: 0,
    factsAdded: 0,
    similarityChecks: 0,
    counterpartsLinked: 0,
  },
};

/**
 * Initialize the possible worlds module
 */
function init() {
  if (!fs.existsSync(WORLDS_DIR)) {
    fs.mkdirSync(WORLDS_DIR, { recursive: true });
  }

  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      // Start fresh
    }
  }

  // Ensure actual world exists
  if (!state.actualWorldId) {
    const actual = createWorld('Actual World', {
      type: 'actual',
      description: 'The world as it is - our reference point',
    });
    state.actualWorldId = actual.id;
    saveState();
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
 * Create a possible world
 *
 * @param {string} name - World name
 * @param {object} config - Configuration
 * @returns {object} Created world
 */
function createWorld(name, config = {}) {
  // Prune if needed
  if (Object.keys(state.worlds).length >= MAX_WORLDS) {
    pruneWorlds();
  }

  const id = `world-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const worldType = WORLD_TYPES[config.type] || WORLD_TYPES.possible;

  const world = {
    id,
    name,
    type: config.type || 'possible',
    typeInfo: worldType,
    description: config.description || '',
    // Facts that define this world
    facts: {},
    // Facts inherited from actual world (unless overridden)
    inheritsFrom: config.inheritsFrom || state.actualWorldId,
    // Computed similarity to actual world
    similarityToActual: worldType.isActual ? 1.0 : 0,
    // Divergence point (for counterfactuals)
    divergencePoint: config.divergencePoint || null,
    // Individuals that exist in this world
    individuals: config.individuals || [],
    createdAt: Date.now(),
  };

  state.worlds[id] = world;
  state.stats.worldsCreated++;

  // If not actual, calculate initial similarity
  if (!worldType.isActual && state.actualWorldId) {
    updateSimilarity(id);
  }

  logHistory({
    type: 'world_created',
    id,
    name,
    worldType: config.type,
  });

  saveState();

  return world;
}

/**
 * Prune distant worlds
 */
function pruneWorlds() {
  const sorted = Object.entries(state.worlds)
    .filter(([id]) => id !== state.actualWorldId)  // Keep actual
    .sort((a, b) => a[1].similarityToActual - b[1].similarityToActual);

  const toRemove = sorted.slice(0, Math.round(MAX_WORLDS * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.worlds[id];
    // Remove counterpart relations
    state.counterparts = state.counterparts.filter(
      c => c.worldA !== id && c.worldB !== id
    );
  }
}

/**
 * Add a fact to a world
 *
 * @param {string} worldId - World ID
 * @param {string} content - Fact content
 * @param {object} config - Fact configuration
 * @returns {object} Added fact
 */
function addFact(worldId, content, config = {}) {
  const world = state.worlds[worldId];
  if (!world) return { error: 'World not found' };

  const factId = `fact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const factType = FACT_TYPES[config.type] || FACT_TYPES.particular;

  const fact = {
    id: factId,
    content,
    type: config.type || 'particular',
    typeInfo: factType,
    truthValue: config.truth !== undefined ? config.truth : true,
    // For counterfactual worlds, is this the changed fact?
    isDeviation: config.isDeviation || false,
    addedAt: Date.now(),
  };

  // Store in global registry
  state.facts[factId] = fact;

  // Store in world
  world.facts[factId] = fact.truthValue;

  state.stats.factsAdded++;

  // Recalculate similarity
  if (worldId !== state.actualWorldId) {
    updateSimilarity(worldId);
  }

  saveState();

  return {
    fact,
    world: worldId,
    message: `Added ${factType.name}: "${content.slice(0, 50)}"`,
  };
}

/**
 * Update similarity of world to actual world
 */
function updateSimilarity(worldId) {
  const world = state.worlds[worldId];
  const actual = state.worlds[state.actualWorldId];

  if (!world || !actual) return;

  let similarityScore = 0;
  let totalWeight = 0;

  // Compare facts by type
  const factsByType = {
    laws: { matching: 0, total: 0 },
    particulars: { matching: 0, total: 0 },
  };

  // Get all facts from actual world
  for (const [factId, truthInActual] of Object.entries(actual.facts)) {
    const fact = state.facts[factId];
    if (!fact) continue;

    const dimension = fact.type === 'law' ? 'laws' : 'particulars';
    factsByType[dimension].total++;

    // Check if same in target world
    const truthInWorld = world.facts[factId];
    if (truthInWorld === truthInActual) {
      factsByType[dimension].matching++;
    }
  }

  // Calculate weighted similarity
  for (const [dimKey, dimConfig] of Object.entries(SIMILARITY_DIMENSIONS)) {
    const factDim = dimKey === 'laws' ? 'laws' : 'particulars';
    if (factsByType[factDim] && factsByType[factDim].total > 0) {
      const dimScore = factsByType[factDim].matching / factsByType[factDim].total;
      similarityScore += dimScore * dimConfig.weight;
      totalWeight += dimConfig.weight;
    }
  }

  world.similarityToActual = totalWeight > 0 ? similarityScore / totalWeight : PHI_INV;
  state.stats.similarityChecks++;
}

/**
 * Calculate similarity between two worlds
 *
 * @param {string} worldA - First world ID
 * @param {string} worldB - Second world ID
 * @returns {object} Similarity analysis
 */
function compareSimilarity(worldA, worldB) {
  const wA = state.worlds[worldA];
  const wB = state.worlds[worldB];

  if (!wA || !wB) return { error: 'World not found' };

  // Find facts in common
  const allFactIds = new Set([
    ...Object.keys(wA.facts),
    ...Object.keys(wB.facts),
  ]);

  let matchingFacts = 0;
  let differentFacts = 0;
  const differences = [];

  for (const factId of allFactIds) {
    const truthA = wA.facts[factId];
    const truthB = wB.facts[factId];

    if (truthA === truthB) {
      matchingFacts++;
    } else {
      differentFacts++;
      const fact = state.facts[factId];
      if (fact) {
        differences.push({
          fact: fact.content.slice(0, 50),
          inA: truthA,
          inB: truthB,
        });
      }
    }
  }

  const similarity = allFactIds.size > 0
    ? matchingFacts / allFactIds.size
    : PHI_INV;

  state.stats.similarityChecks++;
  saveState();

  return {
    worldA: wA.name,
    worldB: wB.name,
    similarity: Math.round(similarity * 100),
    matchingFacts,
    differentFacts,
    differences: differences.slice(0, 5),
    areClose: similarity >= SIMILARITY_THRESHOLD,
  };
}

/**
 * Link counterparts across worlds
 *
 * @param {string} individualA - Individual in world A
 * @param {string} worldA - World A ID
 * @param {string} individualB - Individual in world B
 * @param {string} worldB - World B ID
 * @returns {object} Counterpart link
 */
function linkCounterparts(individualA, worldA, individualB, worldB) {
  const wA = state.worlds[worldA];
  const wB = state.worlds[worldB];

  if (!wA || !wB) return { error: 'World not found' };

  const link = {
    id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    individualA,
    worldA,
    individualB,
    worldB,
    linkedAt: Date.now(),
  };

  state.counterparts.push(link);
  state.stats.counterpartsLinked++;

  // Add individuals to worlds if not present
  if (!wA.individuals.includes(individualA)) {
    wA.individuals.push(individualA);
  }
  if (!wB.individuals.includes(individualB)) {
    wB.individuals.push(individualB);
  }

  logHistory({
    type: 'counterparts_linked',
    individualA,
    worldA,
    individualB,
    worldB,
  });

  saveState();

  return {
    link,
    message: `${individualA} in ${wA.name} ↔ ${individualB} in ${wB.name}`,
  };
}

/**
 * Find counterpart of individual in another world
 *
 * @param {string} individual - Individual name
 * @param {string} fromWorld - Source world ID
 * @param {string} toWorld - Target world ID
 * @returns {object} Counterpart info
 */
function findCounterpart(individual, fromWorld, toWorld) {
  const link = state.counterparts.find(
    c => (c.individualA === individual && c.worldA === fromWorld && c.worldB === toWorld) ||
         (c.individualB === individual && c.worldB === fromWorld && c.worldA === toWorld)
  );

  if (!link) {
    return { found: false, message: `No counterpart found for ${individual}` };
  }

  const counterpart = link.worldA === fromWorld ? link.individualB : link.individualA;
  const targetWorld = state.worlds[toWorld];

  return {
    found: true,
    individual,
    counterpart,
    world: targetWorld?.name,
    message: `${individual}'s counterpart in ${targetWorld?.name} is ${counterpart}`,
  };
}

/**
 * Find closest world to actual where condition holds
 *
 * @param {string} condition - Condition to satisfy
 * @returns {object} Closest world
 */
function findClosestWorld(condition) {
  // Find worlds where this condition might be explicitly stated
  const candidates = Object.values(state.worlds)
    .filter(w => !w.typeInfo.isActual)
    .filter(w => {
      // Check if any fact content matches condition
      for (const factId of Object.keys(w.facts)) {
        const fact = state.facts[factId];
        if (fact && fact.content.toLowerCase().includes(condition.toLowerCase())) {
          return true;
        }
      }
      return false;
    })
    .sort((a, b) => b.similarityToActual - a.similarityToActual);

  if (candidates.length === 0) {
    return {
      found: false,
      message: `No world found satisfying: ${condition}`,
      suggestion: 'Create a counterfactual world with this condition',
    };
  }

  const closest = candidates[0];

  return {
    found: true,
    world: closest,
    similarity: Math.round(closest.similarityToActual * 100),
    message: `Closest world: ${closest.name} (${Math.round(closest.similarityToActual * 100)}% similar)`,
  };
}

/**
 * Get the actual world
 */
function getActualWorld() {
  return state.worlds[state.actualWorldId];
}

/**
 * List all worlds
 */
function listWorlds() {
  return Object.values(state.worlds).map(w => ({
    id: w.id,
    name: w.name,
    type: w.type,
    symbol: w.typeInfo.symbol,
    factCount: Object.keys(w.facts).length,
    similarity: Math.round(w.similarityToActual * 100),
    isActual: w.typeInfo.isActual,
  }));
}

/**
 * Get statistics
 */
function getStats() {
  const worlds = listWorlds();
  const avgSimilarity = worlds.filter(w => !w.isActual).length > 0
    ? worlds.filter(w => !w.isActual).reduce((sum, w) => sum + w.similarity, 0) /
      worlds.filter(w => !w.isActual).length
    : 0;

  return {
    ...state.stats,
    totalWorlds: worlds.length,
    totalFacts: Object.keys(state.facts).length,
    totalCounterparts: state.counterparts.length,
    avgSimilarity: Math.round(avgSimilarity),
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `◇ Possible Worlds (Lewis)\n`;
  status += `  Worlds: ${stats.totalWorlds}\n`;
  status += `  Facts: ${stats.totalFacts}\n`;
  status += `  Counterparts: ${stats.totalCounterparts}\n`;
  status += `  Avg similarity: ${stats.avgSimilarity}%\n`;
  status += `  Similarity checks: ${stats.similarityChecks}\n`;

  return status;
}

module.exports = {
  init,
  createWorld,
  addFact,
  compareSimilarity,
  linkCounterparts,
  findCounterpart,
  findClosestWorld,
  getActualWorld,
  listWorlds,
  getStats,
  formatStatus,
  WORLD_TYPES,
  FACT_TYPES,
  SIMILARITY_DIMENSIONS,
};
