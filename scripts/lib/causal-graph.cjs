/**
 * Causal Graph - DAGs & Interventions
 *
 * Philosophy: Judea Pearl's causal revolution distinguishes
 * correlation from causation. Causal graphs (DAGs) encode
 * our assumptions about causal structure. The do-operator
 * models interventions, not mere observations.
 *
 * Key concepts:
 * - DAG: Directed Acyclic Graph encoding causal relations
 * - D-separation: Criterion for conditional independence
 * - Confounder: Common cause creating spurious correlation
 * - Collider: Common effect that can induce correlation
 * - do(X): Intervention - setting X, not observing it
 * - Backdoor criterion: When we can identify causal effects
 *
 * In CYNIC: Model causal assumptions, identify confounders,
 * support causal inference, distinguish causes from correlates.
 *
 * @module causal-graph
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
const CAUSAL_DIR = path.join(CYNIC_DIR, 'causal');
const STATE_FILE = path.join(CAUSAL_DIR, 'state.json');
const HISTORY_FILE = path.join(CAUSAL_DIR, 'history.jsonl');

// Constants
const MAX_NODES = Math.round(PHI * 50);           // ~81
const MAX_EDGES = Math.round(PHI * 150);          // ~243
const EFFECT_THRESHOLD = PHI_INV_2;               // 0.382

/**
 * Node types (variable types in causal model)
 */
const NODE_TYPES = {
  treatment: {
    name: 'Treatment',
    description: 'Variable we might intervene on',
    symbol: 'T',
    color: 'blue',
  },
  outcome: {
    name: 'Outcome',
    description: 'Variable we want to affect',
    symbol: 'Y',
    color: 'green',
  },
  confounder: {
    name: 'Confounder',
    description: 'Common cause of treatment and outcome',
    symbol: 'U',
    color: 'red',
  },
  mediator: {
    name: 'Mediator',
    description: 'Variable on causal path from treatment to outcome',
    symbol: 'M',
    color: 'yellow',
  },
  collider: {
    name: 'Collider',
    description: 'Common effect of multiple causes',
    symbol: 'C',
    color: 'purple',
  },
  instrument: {
    name: 'Instrument',
    description: 'Affects treatment but not outcome directly',
    symbol: 'Z',
    color: 'orange',
  },
  observed: {
    name: 'Observed',
    description: 'General observed variable',
    symbol: 'X',
    color: 'gray',
  },
};

/**
 * Edge types (causal relation types)
 */
const EDGE_TYPES = {
  direct: {
    name: 'Direct Cause',
    description: 'X directly causes Y',
    symbol: '→',
    strength: PHI_INV,
  },
  indirect: {
    name: 'Indirect Cause',
    description: 'X causes Y through mediators',
    symbol: '⟶',
    strength: PHI_INV_2,
  },
  confounded: {
    name: 'Confounded',
    description: 'Apparent relation due to common cause',
    symbol: '⇢',
    strength: 0,  // Not causal
  },
  bidirectional: {
    name: 'Bidirectional',
    description: 'Indicates unmeasured confounder',
    symbol: '↔',
    strength: 0,
  },
};

/**
 * Causal effect strength levels
 */
const EFFECT_LEVELS = {
  none: {
    threshold: 0,
    name: 'No Effect',
    description: 'No causal relationship',
    symbol: '○',
  },
  weak: {
    threshold: PHI_INV_3,
    name: 'Weak Effect',
    description: 'Small causal influence',
    symbol: '◔',
  },
  moderate: {
    threshold: PHI_INV_2,
    name: 'Moderate Effect',
    description: 'Notable causal influence',
    symbol: '◑',
  },
  strong: {
    threshold: PHI_INV,
    name: 'Strong Effect',
    description: 'Substantial causal influence',
    symbol: '◕',
  },
  deterministic: {
    threshold: PHI_INV + PHI_INV_2,
    name: 'Deterministic',
    description: 'Near-certain causal influence',
    symbol: '●',
  },
};

// In-memory state
let state = {
  graphs: {},          // Named causal graphs
  currentGraph: null,  // Active graph ID
  stats: {
    graphsCreated: 0,
    nodesAdded: 0,
    edgesAdded: 0,
    interventions: 0,
    queries: 0,
  },
};

/**
 * Initialize the causal graph module
 */
function init() {
  if (!fs.existsSync(CAUSAL_DIR)) {
    fs.mkdirSync(CAUSAL_DIR, { recursive: true });
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
 * Create a new causal graph (DAG)
 *
 * @param {string} name - Graph name
 * @param {object} config - Configuration
 * @returns {object} Created graph
 */
function createGraph(name, config = {}) {
  const id = `dag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const graph = {
    id,
    name,
    description: config.description || '',
    nodes: {},
    edges: [],
    // Identified structures
    confounders: [],
    colliders: [],
    mediators: [],
    // Analysis cache
    cachedPaths: {},
    createdAt: Date.now(),
  };

  state.graphs[id] = graph;
  state.currentGraph = id;
  state.stats.graphsCreated++;

  logHistory({
    type: 'graph_created',
    id,
    name,
  });

  saveState();

  return graph;
}

/**
 * Get current graph
 */
function getCurrentGraph() {
  return state.graphs[state.currentGraph];
}

/**
 * Add a node (variable) to the graph
 *
 * @param {string} name - Variable name
 * @param {string} type - Node type
 * @param {object} config - Configuration
 * @returns {object} Added node
 */
function addNode(name, type = 'observed', config = {}) {
  const graph = getCurrentGraph();
  if (!graph) return { error: 'No active graph' };

  // Check limit
  if (Object.keys(graph.nodes).length >= MAX_NODES) {
    return { error: 'Maximum nodes reached' };
  }

  const nodeType = NODE_TYPES[type] || NODE_TYPES.observed;
  const id = name.toLowerCase().replace(/\s+/g, '_');

  const node = {
    id,
    name,
    type,
    typeInfo: nodeType,
    description: config.description || '',
    // For causal inference
    observed: config.observed !== false,
    value: config.value || null,
    // Structural info
    parents: [],
    children: [],
    addedAt: Date.now(),
  };

  graph.nodes[id] = node;
  state.stats.nodesAdded++;

  saveState();

  return {
    node,
    graphId: graph.id,
    message: `${nodeType.symbol} Added ${nodeType.name}: ${name}`,
  };
}

/**
 * Add an edge (causal relation) to the graph
 *
 * @param {string} fromId - Cause node ID
 * @param {string} toId - Effect node ID
 * @param {object} config - Configuration
 * @returns {object} Added edge
 */
function addEdge(fromId, toId, config = {}) {
  const graph = getCurrentGraph();
  if (!graph) return { error: 'No active graph' };

  const fromNode = graph.nodes[fromId];
  const toNode = graph.nodes[toId];

  if (!fromNode || !toNode) {
    return { error: 'Node not found' };
  }

  // Check for cycles (DAG constraint)
  if (wouldCreateCycle(graph, fromId, toId)) {
    return { error: 'Edge would create cycle - DAGs must be acyclic' };
  }

  // Check limit
  if (graph.edges.length >= MAX_EDGES) {
    return { error: 'Maximum edges reached' };
  }

  const edgeType = EDGE_TYPES[config.type] || EDGE_TYPES.direct;

  const edge = {
    id: `${fromId}->${toId}`,
    from: fromId,
    to: toId,
    type: config.type || 'direct',
    typeInfo: edgeType,
    strength: config.strength || edgeType.strength,
    mechanism: config.mechanism || '',
    addedAt: Date.now(),
  };

  graph.edges.push(edge);

  // Update node relationships
  if (!fromNode.children.includes(toId)) {
    fromNode.children.push(toId);
  }
  if (!toNode.parents.includes(fromId)) {
    toNode.parents.push(fromId);
  }

  state.stats.edgesAdded++;

  // Clear cached paths
  graph.cachedPaths = {};

  // Update structural analysis
  analyzeStructure(graph);

  logHistory({
    type: 'edge_added',
    graphId: graph.id,
    from: fromId,
    to: toId,
  });

  saveState();

  return {
    edge,
    message: `${fromNode.name} ${edgeType.symbol} ${toNode.name}`,
  };
}

/**
 * Check if adding edge would create cycle
 */
function wouldCreateCycle(graph, fromId, toId) {
  // If toId can reach fromId, adding fromId->toId creates cycle
  const visited = new Set();
  const queue = [toId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === fromId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const node = graph.nodes[current];
    if (node) {
      queue.push(...node.children);
    }
  }

  return false;
}

/**
 * Analyze graph structure for confounders, colliders, mediators
 */
function analyzeStructure(graph) {
  graph.confounders = [];
  graph.colliders = [];
  graph.mediators = [];

  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    // Confounder: has multiple children (common cause)
    if (node.children.length >= 2) {
      graph.confounders.push({
        nodeId,
        name: node.name,
        effects: node.children,
      });
    }

    // Collider: has multiple parents (common effect)
    if (node.parents.length >= 2) {
      graph.colliders.push({
        nodeId,
        name: node.name,
        causes: node.parents,
      });
    }

    // Mediator: has both parents and children
    if (node.parents.length > 0 && node.children.length > 0) {
      graph.mediators.push({
        nodeId,
        name: node.name,
        from: node.parents,
        to: node.children,
      });
    }
  }
}

/**
 * Perform intervention: do(X = x)
 * This models setting X to value, breaking incoming arrows
 *
 * @param {string} nodeId - Node to intervene on
 * @param {any} value - Value to set
 * @returns {object} Intervention result
 */
function doIntervention(nodeId, value) {
  const graph = getCurrentGraph();
  if (!graph) return { error: 'No active graph' };

  const node = graph.nodes[nodeId];
  if (!node) return { error: 'Node not found' };

  // Record the intervention
  const intervention = {
    nodeId,
    nodeName: node.name,
    value,
    // In do-calculus, intervention breaks incoming edges
    brokenEdges: node.parents.map(p => `${p}->${nodeId}`),
    timestamp: Date.now(),
  };

  state.stats.interventions++;

  logHistory({
    type: 'intervention',
    graphId: graph.id,
    nodeId,
    value,
  });

  saveState();

  return {
    intervention,
    message: `do(${node.name} = ${value}) - ${intervention.brokenEdges.length} incoming edges conceptually removed`,
    effect: `To estimate P(Y | do(${node.name}=${value})), we must adjust for confounders`,
  };
}

/**
 * Find all causal paths from X to Y
 *
 * @param {string} fromId - Source node
 * @param {string} toId - Target node
 * @returns {object} Paths found
 */
function findCausalPaths(fromId, toId) {
  const graph = getCurrentGraph();
  if (!graph) return { error: 'No active graph' };

  const cacheKey = `${fromId}->${toId}`;
  if (graph.cachedPaths[cacheKey]) {
    return graph.cachedPaths[cacheKey];
  }

  const paths = [];
  const visited = new Set();

  function dfs(current, path) {
    if (current === toId) {
      paths.push([...path]);
      return;
    }

    visited.add(current);
    const node = graph.nodes[current];
    if (!node) return;

    for (const childId of node.children) {
      if (!visited.has(childId)) {
        path.push(childId);
        dfs(childId, path);
        path.pop();
      }
    }
    visited.delete(current);
  }

  dfs(fromId, [fromId]);

  const result = {
    from: fromId,
    to: toId,
    paths,
    pathCount: paths.length,
    hasCausalPath: paths.length > 0,
    directPath: paths.some(p => p.length === 2),
  };

  graph.cachedPaths[cacheKey] = result;
  state.stats.queries++;
  saveState();

  return result;
}

/**
 * Check backdoor criterion for causal identification
 * A set Z satisfies backdoor if:
 * 1. Z blocks all backdoor paths from X to Y
 * 2. Z contains no descendants of X
 *
 * @param {string} treatmentId - Treatment variable
 * @param {string} outcomeId - Outcome variable
 * @param {array} adjustmentSet - Variables to adjust for
 * @returns {object} Backdoor criterion check
 */
function checkBackdoor(treatmentId, outcomeId, adjustmentSet = []) {
  const graph = getCurrentGraph();
  if (!graph) return { error: 'No active graph' };

  const treatment = graph.nodes[treatmentId];
  const outcome = graph.nodes[outcomeId];

  if (!treatment || !outcome) {
    return { error: 'Node not found' };
  }

  // Get descendants of treatment
  const descendants = getDescendants(graph, treatmentId);

  // Check condition 2: adjustment set shouldn't include descendants
  const invalidAdjustment = adjustmentSet.filter(z => descendants.has(z));
  if (invalidAdjustment.length > 0) {
    return {
      satisfied: false,
      reason: `Adjustment set includes descendants of treatment: ${invalidAdjustment.join(', ')}`,
      suggestion: `Remove ${invalidAdjustment.join(', ')} from adjustment set`,
    };
  }

  // Find confounders that need blocking
  const confoundersToBlock = graph.confounders
    .filter(c => c.effects.includes(treatmentId) && c.effects.includes(outcomeId))
    .map(c => c.nodeId);

  const blocked = confoundersToBlock.filter(c => adjustmentSet.includes(c));
  const unblocked = confoundersToBlock.filter(c => !adjustmentSet.includes(c));

  state.stats.queries++;
  saveState();

  return {
    satisfied: unblocked.length === 0,
    treatment: treatment.name,
    outcome: outcome.name,
    adjustmentSet,
    confoundersIdentified: confoundersToBlock,
    blocked,
    unblocked,
    message: unblocked.length === 0
      ? `*nod* Backdoor criterion satisfied. P(${outcome.name}|do(${treatment.name})) is identifiable.`
      : `*sniff* Unblocked confounders: ${unblocked.join(', ')}. Add to adjustment set.`,
  };
}

/**
 * Get all descendants of a node
 */
function getDescendants(graph, nodeId) {
  const descendants = new Set();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    const node = graph.nodes[current];
    if (!node) continue;

    for (const childId of node.children) {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        queue.push(childId);
      }
    }
  }

  return descendants;
}

/**
 * Estimate causal effect (simplified)
 *
 * @param {string} treatmentId - Treatment variable
 * @param {string} outcomeId - Outcome variable
 * @returns {object} Effect estimate
 */
function estimateEffect(treatmentId, outcomeId) {
  const graph = getCurrentGraph();
  if (!graph) return { error: 'No active graph' };

  const paths = findCausalPaths(treatmentId, outcomeId);

  if (!paths.hasCausalPath) {
    return {
      effect: 0,
      level: EFFECT_LEVELS.none,
      message: `No causal path from ${treatmentId} to ${outcomeId}`,
    };
  }

  // Estimate effect from path structure
  let totalEffect = 0;

  for (const pathNodes of paths.paths) {
    let pathEffect = 1.0;

    // Multiply effects along path
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const edge = graph.edges.find(
        e => e.from === pathNodes[i] && e.to === pathNodes[i + 1]
      );
      if (edge) {
        pathEffect *= edge.strength;
      }
    }

    totalEffect += pathEffect;
  }

  // Normalize
  totalEffect = Math.min(1, totalEffect);

  // Get effect level
  let level = EFFECT_LEVELS.none;
  for (const [, config] of Object.entries(EFFECT_LEVELS).reverse()) {
    if (totalEffect >= config.threshold) {
      level = config;
      break;
    }
  }

  state.stats.queries++;
  saveState();

  return {
    treatment: treatmentId,
    outcome: outcomeId,
    effect: Math.round(totalEffect * 100),
    level,
    paths: paths.pathCount,
    direct: paths.directPath,
    message: `${level.symbol} ${level.name}: ${treatmentId} → ${outcomeId} (${Math.round(totalEffect * 100)}%)`,
  };
}

/**
 * Get statistics
 */
function getStats() {
  const currentGraph = getCurrentGraph();

  return {
    ...state.stats,
    totalGraphs: Object.keys(state.graphs).length,
    currentGraphNodes: currentGraph ? Object.keys(currentGraph.nodes).length : 0,
    currentGraphEdges: currentGraph ? currentGraph.edges.length : 0,
    confounders: currentGraph ? currentGraph.confounders.length : 0,
    colliders: currentGraph ? currentGraph.colliders.length : 0,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();
  const graph = getCurrentGraph();

  let status = `→ Causal Graph (Pearl)\n`;
  status += `  Graphs: ${stats.totalGraphs}\n`;

  if (graph) {
    status += `  Current: ${graph.name}\n`;
    status += `  Nodes: ${stats.currentGraphNodes}\n`;
    status += `  Edges: ${stats.currentGraphEdges}\n`;
    status += `  Confounders: ${stats.confounders}\n`;
    status += `  Colliders: ${stats.colliders}\n`;
  }

  status += `  Interventions: ${stats.interventions}\n`;
  status += `  Queries: ${stats.queries}\n`;

  return status;
}

module.exports = {
  init,
  createGraph,
  getCurrentGraph,
  addNode,
  addEdge,
  doIntervention,
  findCausalPaths,
  checkBackdoor,
  estimateEffect,
  getStats,
  formatStatus,
  NODE_TYPES,
  EDGE_TYPES,
  EFFECT_LEVELS,
};
