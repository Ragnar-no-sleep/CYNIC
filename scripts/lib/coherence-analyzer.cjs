/**
 * Coherence Analyzer - Belief Network Coherentism
 *
 * Philosophy: Coherentism holds that beliefs are justified by
 * their coherence with other beliefs, not by foundations.
 * The web of belief (Quine) - all beliefs interconnected.
 *
 * Key concepts:
 * - Coherence: Logical consistency + mutual support
 * - Web of belief: Interconnected belief network
 * - Holism: Beliefs meaningful only in context of whole
 * - Explanatory relations: How beliefs explain each other
 * - Inferential connections: How beliefs support each other
 *
 * In CYNIC: Analyze how beliefs/assumptions relate,
 * detect inconsistencies, measure overall coherence.
 *
 * @module coherence-analyzer
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
const COHERENCE_DIR = path.join(CYNIC_DIR, 'coherence');
const STATE_FILE = path.join(COHERENCE_DIR, 'state.json');
const HISTORY_FILE = path.join(COHERENCE_DIR, 'history.jsonl');

// Constants
const MAX_BELIEFS = Math.round(PHI * 80);        // ~130
const MAX_RELATIONS = Math.round(PHI * 200);     // ~324
const COHERENCE_THRESHOLD = PHI_INV;             // 0.618

/**
 * Relation types between beliefs
 */
const RELATION_TYPES = {
  supports: {
    name: 'Supports',
    description: 'B1 provides evidence for B2',
    symbol: '→',
    weight: PHI_INV,
    bidirectional: false,
  },
  contradicts: {
    name: 'Contradicts',
    description: 'B1 and B2 cannot both be true',
    symbol: '⊗',
    weight: -1.0,
    bidirectional: true,
  },
  explains: {
    name: 'Explains',
    description: 'B1 explains why B2 is true',
    symbol: '⊃',
    weight: PHI_INV + PHI_INV_3,
    bidirectional: false,
  },
  entails: {
    name: 'Entails',
    description: 'If B1 is true, B2 must be true',
    symbol: '⊢',
    weight: 1.0,
    bidirectional: false,
  },
  analogous: {
    name: 'Analogous',
    description: 'B1 and B2 share structural similarity',
    symbol: '≈',
    weight: PHI_INV_2,
    bidirectional: true,
  },
  independent: {
    name: 'Independent',
    description: 'No direct relation',
    symbol: '·',
    weight: 0,
    bidirectional: true,
  },
};

/**
 * Coherence levels
 */
const COHERENCE_LEVELS = {
  incoherent: {
    threshold: 0,
    name: 'Incoherent',
    description: 'Major contradictions present',
    symbol: '✕',
  },
  fragmented: {
    threshold: PHI_INV_3,
    name: 'Fragmented',
    description: 'Weak connections, isolated beliefs',
    symbol: '◔',
  },
  partial: {
    threshold: PHI_INV_2,
    name: 'Partial',
    description: 'Some coherence, gaps remain',
    symbol: '◑',
  },
  coherent: {
    threshold: PHI_INV,
    name: 'Coherent',
    description: 'Well-integrated belief system',
    symbol: '◕',
  },
  unified: {
    threshold: PHI_INV + PHI_INV_2,
    name: 'Unified',
    description: 'Strong mutual support throughout',
    symbol: '●',
  },
};

// In-memory state
let state = {
  beliefs: {},        // Beliefs in the web
  relations: [],      // Relations between beliefs
  clusters: [],       // Detected belief clusters
  contradictions: [], // Tracked contradictions
  stats: {
    beliefsAdded: 0,
    relationsFormed: 0,
    contradictionsFound: 0,
    coherenceChecks: 0,
  },
};

/**
 * Initialize the coherence analyzer
 */
function init() {
  if (!fs.existsSync(COHERENCE_DIR)) {
    fs.mkdirSync(COHERENCE_DIR, { recursive: true });
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
 * Add a belief to the web
 *
 * @param {string} content - Belief content
 * @param {object} config - Configuration
 * @returns {object} Added belief
 */
function addBelief(content, config = {}) {
  // Prune if needed
  if (Object.keys(state.beliefs).length >= MAX_BELIEFS) {
    pruneOldBeliefs();
  }

  const id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const belief = {
    id,
    content,
    domain: config.domain || 'general',
    centrality: 0,     // How connected this belief is
    coherenceScore: 0, // How coherent with network
    relations: [],     // IDs of related beliefs
    addedAt: Date.now(),
    lastUpdated: Date.now(),
  };

  state.beliefs[id] = belief;
  state.stats.beliefsAdded++;

  logHistory({
    type: 'belief_added',
    id,
    content: content.slice(0, 50),
  });

  saveState();

  return belief;
}

/**
 * Prune least connected beliefs
 */
function pruneOldBeliefs() {
  const sorted = Object.entries(state.beliefs)
    .sort((a, b) => a[1].centrality - b[1].centrality);

  const toRemove = sorted.slice(0, Math.round(MAX_BELIEFS * PHI_INV_3));
  for (const [id] of toRemove) {
    // Remove associated relations
    state.relations = state.relations.filter(
      r => r.from !== id && r.to !== id
    );
    delete state.beliefs[id];
  }
}

/**
 * Form a relation between beliefs
 *
 * @param {string} fromId - Source belief ID
 * @param {string} toId - Target belief ID
 * @param {string} relationType - Type of relation
 * @param {object} config - Additional configuration
 * @returns {object} Formed relation
 */
function relate(fromId, toId, relationType, config = {}) {
  const fromBelief = state.beliefs[fromId];
  const toBelief = state.beliefs[toId];

  if (!fromBelief || !toBelief) {
    return { error: 'Belief not found' };
  }

  const relType = RELATION_TYPES[relationType] || RELATION_TYPES.supports;

  // Check for existing relation
  const existing = state.relations.find(
    r => (r.from === fromId && r.to === toId) ||
         (relType.bidirectional && r.from === toId && r.to === fromId)
  );

  if (existing) {
    // Update existing relation
    existing.type = relationType;
    existing.typeInfo = relType;
    existing.strength = config.strength || relType.weight;
    existing.updatedAt = Date.now();
    saveState();
    return existing;
  }

  // Prune relations if needed
  if (state.relations.length >= MAX_RELATIONS) {
    state.relations = state.relations.slice(-Math.round(MAX_RELATIONS * PHI_INV));
  }

  const relation = {
    id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from: fromId,
    to: toId,
    type: relationType,
    typeInfo: relType,
    strength: config.strength || relType.weight,
    reason: config.reason || '',
    bidirectional: relType.bidirectional,
    formedAt: Date.now(),
  };

  state.relations.push(relation);
  state.stats.relationsFormed++;

  // Track contradiction
  if (relationType === 'contradicts') {
    state.contradictions.push({
      beliefs: [fromId, toId],
      detectedAt: Date.now(),
      resolved: false,
    });
    state.stats.contradictionsFound++;
  }

  // Update belief relations
  fromBelief.relations.push(toId);
  toBelief.relations.push(fromId);

  // Update centrality
  updateCentrality(fromBelief);
  updateCentrality(toBelief);

  logHistory({
    type: 'relation_formed',
    relationId: relation.id,
    from: fromId,
    to: toId,
    relationType,
  });

  saveState();

  return relation;
}

/**
 * Update belief centrality (connectedness)
 */
function updateCentrality(belief) {
  const uniqueConnections = new Set(belief.relations);
  const connectionCount = uniqueConnections.size;
  const totalBeliefs = Object.keys(state.beliefs).length;

  // Centrality = connections / possible connections
  belief.centrality = totalBeliefs > 1
    ? connectionCount / (totalBeliefs - 1)
    : 0;
}

/**
 * Calculate coherence of a belief with the network
 *
 * @param {string} beliefId - Belief ID
 * @returns {object} Coherence analysis
 */
function analyzeBeliefCoherence(beliefId) {
  const belief = state.beliefs[beliefId];
  if (!belief) return { error: 'Belief not found' };

  const relatedRelations = state.relations.filter(
    r => r.from === beliefId || r.to === beliefId
  );

  let supportScore = 0;
  let contradictionScore = 0;
  let explanationScore = 0;

  for (const relation of relatedRelations) {
    if (relation.strength > 0) {
      if (relation.type === 'explains') {
        explanationScore += relation.strength;
      } else {
        supportScore += relation.strength;
      }
    } else {
      contradictionScore += Math.abs(relation.strength);
    }
  }

  // Coherence = (support + explanation - contradictions) / total relations
  const totalWeight = supportScore + explanationScore + contradictionScore;
  const coherence = totalWeight > 0
    ? Math.max(0, (supportScore + explanationScore - contradictionScore) / totalWeight)
    : 0.5;  // No relations = neutral

  belief.coherenceScore = coherence;
  belief.lastUpdated = Date.now();

  saveState();

  return {
    belief,
    coherence: Math.round(coherence * 100),
    supportScore: Math.round(supportScore * 100),
    explanationScore: Math.round(explanationScore * 100),
    contradictionScore: Math.round(contradictionScore * 100),
    relationCount: relatedRelations.length,
    level: getCoherenceLevel(coherence),
  };
}

/**
 * Get coherence level from score
 */
function getCoherenceLevel(score) {
  for (const [name, config] of Object.entries(COHERENCE_LEVELS).reverse()) {
    if (score >= config.threshold) {
      return { name, ...config };
    }
  }
  return COHERENCE_LEVELS.incoherent;
}

/**
 * Calculate overall network coherence
 *
 * @returns {object} Network coherence analysis
 */
function analyzeNetworkCoherence() {
  const beliefs = Object.values(state.beliefs);
  if (beliefs.length === 0) {
    return {
      coherence: 0,
      level: COHERENCE_LEVELS.incoherent,
      message: 'No beliefs in network',
    };
  }

  // Analyze each belief
  for (const belief of beliefs) {
    analyzeBeliefCoherence(belief.id);
  }

  // Average coherence
  const avgCoherence = beliefs.reduce((sum, b) => sum + b.coherenceScore, 0) / beliefs.length;

  // Check for contradictions
  const unresolvedContradictions = state.contradictions.filter(c => !c.resolved).length;
  const contradictionPenalty = unresolvedContradictions * PHI_INV_2 / beliefs.length;

  // Final coherence
  const networkCoherence = Math.max(0, avgCoherence - contradictionPenalty);

  // Calculate density (actual relations / possible relations)
  const possibleRelations = (beliefs.length * (beliefs.length - 1)) / 2;
  const density = possibleRelations > 0
    ? state.relations.length / possibleRelations
    : 0;

  state.stats.coherenceChecks++;

  logHistory({
    type: 'network_coherence_analyzed',
    coherence: networkCoherence,
    beliefs: beliefs.length,
    relations: state.relations.length,
    contradictions: unresolvedContradictions,
  });

  saveState();

  return {
    coherence: Math.round(networkCoherence * 100),
    level: getCoherenceLevel(networkCoherence),
    avgBeliefCoherence: Math.round(avgCoherence * 100),
    beliefCount: beliefs.length,
    relationCount: state.relations.length,
    density: Math.round(density * 100),
    unresolvedContradictions,
    meetsThreshold: networkCoherence >= COHERENCE_THRESHOLD,
  };
}

/**
 * Find contradictions in the network
 *
 * @returns {array} Contradictions found
 */
function findContradictions() {
  return state.contradictions.map(c => {
    const beliefs = c.beliefs.map(id => state.beliefs[id]).filter(Boolean);
    return {
      ...c,
      beliefs: beliefs.map(b => ({
        id: b.id,
        content: b.content,
      })),
    };
  });
}

/**
 * Resolve a contradiction
 *
 * @param {number} index - Contradiction index
 * @param {string} resolution - How it was resolved
 * @returns {object} Resolution result
 */
function resolveContradiction(index, resolution) {
  if (index >= state.contradictions.length) {
    return { error: 'Contradiction not found' };
  }

  const contradiction = state.contradictions[index];
  contradiction.resolved = true;
  contradiction.resolution = resolution;
  contradiction.resolvedAt = Date.now();

  saveState();

  return {
    resolved: true,
    contradiction,
    message: `Contradiction resolved: ${resolution}`,
  };
}

/**
 * Identify belief clusters (tightly connected subgroups)
 *
 * @returns {array} Detected clusters
 */
function identifyClusters() {
  const beliefs = Object.values(state.beliefs);
  if (beliefs.length < 2) return [];

  const visited = new Set();
  const clusters = [];

  // Simple clustering via BFS
  for (const belief of beliefs) {
    if (visited.has(belief.id)) continue;

    const cluster = [];
    const queue = [belief.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      const current = state.beliefs[currentId];
      if (!current) continue;

      cluster.push(currentId);

      // Add connected beliefs
      for (const relatedId of current.relations) {
        if (!visited.has(relatedId)) {
          queue.push(relatedId);
        }
      }
    }

    if (cluster.length > 1) {
      clusters.push({
        beliefs: cluster,
        size: cluster.length,
        avgCentrality: cluster.reduce((sum, id) =>
          sum + (state.beliefs[id]?.centrality || 0), 0) / cluster.length,
      });
    }
  }

  state.clusters = clusters;
  saveState();

  return clusters;
}

/**
 * Get statistics
 */
function getStats() {
  return {
    ...state.stats,
    totalBeliefs: Object.keys(state.beliefs).length,
    totalRelations: state.relations.length,
    unresolvedContradictions: state.contradictions.filter(c => !c.resolved).length,
    clusters: state.clusters.length,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();
  const coherence = analyzeNetworkCoherence();

  let status = `◕ Coherence Analyzer\n`;
  status += `  Beliefs: ${stats.totalBeliefs}\n`;
  status += `  Relations: ${stats.totalRelations}\n`;
  status += `  Coherence: ${coherence.coherence}% ${coherence.level.symbol}\n`;
  status += `  Contradictions: ${stats.unresolvedContradictions} unresolved\n`;
  status += `  Clusters: ${stats.clusters}\n`;

  return status;
}

module.exports = {
  init,
  addBelief,
  relate,
  analyzeBeliefCoherence,
  analyzeNetworkCoherence,
  findContradictions,
  resolveContradiction,
  identifyClusters,
  getStats,
  formatStatus,
  RELATION_TYPES,
  COHERENCE_LEVELS,
};
