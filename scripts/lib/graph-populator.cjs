/**
 * Graph Populator & E-Score Calculator
 *
 * Populates the Graph Overlay with ecosystem data and calculates
 * E-Score dynamically from graph edges.
 *
 * "Relationships define truth" - κυνικός
 *
 * @module @cynic/scripts/graph-populator
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// φ Constants
const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;
const PHI_2 = PHI * PHI;
const PHI_3 = PHI * PHI * PHI;

// Import ecosystem discovery
const ecosystemDiscovery = require('./ecosystem-discovery.cjs');
const ecosystemSchema = require('./ecosystem-schema.cjs');

// Graph storage path
const GRAPH_DIR = path.join(os.homedir(), '.cynic/graph');
const GRAPH_FILE = path.join(GRAPH_DIR, 'ecosystem-graph.json');

// ═══════════════════════════════════════════════════════════════════════════
// E-SCORE DIMENSIONS (φ-weighted)
// ═══════════════════════════════════════════════════════════════════════════

const E_SCORE_DIMENSIONS = {
  HOLD: { weight: 1.0, description: 'Token holdings', edgeType: 'HOLDS' },
  BURN: { weight: PHI, description: 'Tokens burned', edgeType: 'BURNED' },
  USE: { weight: 1.0, description: 'API/service usage', edgeType: 'USES' },
  BUILD: { weight: PHI_2, description: 'Apps built', edgeType: 'BUILDS' },
  RUN: { weight: PHI_2, description: 'Nodes operated', edgeType: 'OPERATES' },
  REFER: { weight: PHI, description: 'Referrals', edgeType: 'REFERRED' },
  TIME: { weight: PHI_INV, description: 'Time in ecosystem', edgeType: null }, // Calculated from first edge
};

// E-Score tiers
const E_SCORE_TIERS = {
  ALPHA: { min: 90, label: 'Alpha', color: '💎' },
  BETA: { min: 70, label: 'Beta', color: '🥇' },
  GAMMA: { min: 50, label: 'Gamma', color: '🥈' },
  DELTA: { min: 30, label: 'Delta', color: '🥉' },
  EPSILON: { min: 0, label: 'Epsilon', color: '🆕' },
};

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * In-memory graph structure
 */
let graph = {
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  nodes: new Map(),
  edges: new Map(),
  indices: {
    byType: new Map(),
    byIdentifier: new Map(),
    edgesBySource: new Map(),
    edgesByTarget: new Map(),
  },
};

/**
 * Node class
 */
class GraphNode {
  constructor({ id, type, identifier, attributes = {}, metadata = {} }) {
    this.id = id || `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = type;
    this.identifier = identifier;
    this.attributes = attributes;
    this.metadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...metadata,
    };
  }

  get key() {
    return `${this.type}:${this.identifier}`;
  }

  update(attributes) {
    this.attributes = { ...this.attributes, ...attributes };
    this.metadata.updatedAt = Date.now();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      identifier: this.identifier,
      key: this.key,
      attributes: this.attributes,
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    return new GraphNode(json);
  }
}

/**
 * Edge class
 */
class GraphEdge {
  constructor({ id, type, sourceId, targetId, weight = 1.0, attributes = {}, metadata = {} }) {
    this.id = id || `${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = type;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.weight = weight;
    this.attributes = attributes;
    this.metadata = {
      createdAt: Date.now(),
      ...metadata,
    };
  }

  get key() {
    return `${this.type}:${this.sourceId}:${this.targetId}`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      sourceId: this.sourceId,
      targetId: this.targetId,
      key: this.key,
      weight: this.weight,
      attributes: this.attributes,
      metadata: this.metadata,
    };
  }

  static fromJSON(json) {
    return new GraphEdge(json);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add a node to the graph
 */
function addNode(node) {
  if (!(node instanceof GraphNode)) {
    node = new GraphNode(node);
  }

  graph.nodes.set(node.id, node);

  // Update indices
  if (!graph.indices.byType.has(node.type)) {
    graph.indices.byType.set(node.type, new Set());
  }
  graph.indices.byType.get(node.type).add(node.id);
  graph.indices.byIdentifier.set(node.key, node.id);

  graph.updatedAt = Date.now();
  return node;
}

/**
 * Add an edge to the graph
 */
function addEdge(edge) {
  if (!(edge instanceof GraphEdge)) {
    edge = new GraphEdge(edge);
  }

  graph.edges.set(edge.id, edge);

  // Update indices
  if (!graph.indices.edgesBySource.has(edge.sourceId)) {
    graph.indices.edgesBySource.set(edge.sourceId, new Set());
  }
  graph.indices.edgesBySource.get(edge.sourceId).add(edge.id);

  if (!graph.indices.edgesByTarget.has(edge.targetId)) {
    graph.indices.edgesByTarget.set(edge.targetId, new Set());
  }
  graph.indices.edgesByTarget.get(edge.targetId).add(edge.id);

  graph.updatedAt = Date.now();
  return edge;
}

/**
 * Get node by ID
 */
function getNode(nodeId) {
  return graph.nodes.get(nodeId);
}

/**
 * Get node by type and identifier
 */
function getNodeByKey(type, identifier) {
  const key = `${type}:${identifier}`;
  const nodeId = graph.indices.byIdentifier.get(key);
  return nodeId ? graph.nodes.get(nodeId) : null;
}

/**
 * Get nodes by type
 */
function getNodesByType(type) {
  const nodeIds = graph.indices.byType.get(type) || new Set();
  return Array.from(nodeIds).map(id => graph.nodes.get(id)).filter(Boolean);
}

/**
 * Get edges from a node
 */
function getOutEdges(nodeId, edgeType = null) {
  const edgeIds = graph.indices.edgesBySource.get(nodeId) || new Set();
  let edges = Array.from(edgeIds).map(id => graph.edges.get(id)).filter(Boolean);

  if (edgeType) {
    edges = edges.filter(e => e.type === edgeType);
  }

  return edges;
}

/**
 * Get edges to a node
 */
function getInEdges(nodeId, edgeType = null) {
  const edgeIds = graph.indices.edgesByTarget.get(nodeId) || new Set();
  let edges = Array.from(edgeIds).map(id => graph.edges.get(id)).filter(Boolean);

  if (edgeType) {
    edges = edges.filter(e => e.type === edgeType);
  }

  return edges;
}

/**
 * Get all edges for a node (in + out)
 */
function getAllEdges(nodeId, edgeType = null) {
  return [...getOutEdges(nodeId, edgeType), ...getInEdges(nodeId, edgeType)];
}

// ═══════════════════════════════════════════════════════════════════════════
// POPULATE FROM ECOSYSTEM DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Populate graph from ecosystem discovery
 */
function populateFromEcosystem(workspacePath = '/workspaces') {
  const ecosystem = ecosystemDiscovery.discoverEcosystem(workspacePath, true);
  const { nodes, edges } = ecosystemDiscovery.buildDiscoveredGraph(ecosystem);

  let nodesAdded = 0;
  let edgesAdded = 0;

  // Add nodes
  for (const nodeData of nodes) {
    // Check if node already exists
    const existing = getNodeByKey(nodeData.type, nodeData.identifier);
    if (existing) {
      existing.update(nodeData.attributes);
    } else {
      addNode(new GraphNode(nodeData));
      nodesAdded++;
    }
  }

  // Add edges
  for (const edgeData of edges) {
    // Check if edge already exists (by key)
    const existingEdge = Array.from(graph.edges.values()).find(e => e.key === `${edgeData.type}:${edgeData.sourceId}:${edgeData.targetId}`);

    if (!existingEdge) {
      addEdge(new GraphEdge(edgeData));
      edgesAdded++;
    }
  }

  // Save graph
  saveGraph();

  return {
    nodesAdded,
    edgesAdded,
    totalNodes: graph.nodes.size,
    totalEdges: graph.edges.size,
  };
}

/**
 * Add contribution edges from git history
 */
function populateContributions(contributorsData) {
  if (!contributorsData?.contributors) return { added: 0 };

  let added = 0;

  for (const [email, info] of Object.entries(contributorsData.contributors)) {
    // Create or update user node
    let userNode = getNodeByKey('user', email);
    if (!userNode) {
      userNode = addNode(new GraphNode({
        type: 'user',
        identifier: email,
        attributes: {
          email,
          name: info.primaryName || email.split('@')[0],
          isBot: email.includes('[bot]'),
          totalCommits: info.totalCommits,
        },
      }));
    }

    // Add contribution edges to repos
    for (const [repo, commits] of Object.entries(info.repos || {})) {
      let repoNode = getNodeByKey('project', repo);

      // Only add edges to ecosystem repos
      if (!repoNode) continue;

      // Check if edge exists
      const existingEdge = getOutEdges(userNode.id, 'CONTRIBUTES')
        .find(e => e.targetId === repoNode.id);

      if (!existingEdge) {
        addEdge(new GraphEdge({
          type: 'CONTRIBUTES',
          sourceId: userNode.id,
          targetId: repoNode.id,
          weight: PHI,
          attributes: {
            commits,
            firstSeen: info.firstSeen,
            lastSeen: info.lastSeen,
          },
        }));
        added++;
      } else {
        // Update commit count
        existingEdge.attributes.commits = commits;
      }
    }
  }

  saveGraph();
  return { added };
}

// ═══════════════════════════════════════════════════════════════════════════
// E-SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate E-Score for a user from their graph edges
 *
 * E-Score = Σ(dimension × φ_weight) normalized to 0-100
 */
function calculateEScore(userNodeId) {
  const userNode = graph.nodes.get(userNodeId);
  if (!userNode || userNode.type !== 'user') {
    return null;
  }

  const dimensions = {};
  let totalScore = 0;

  // Get all outgoing edges
  const edges = getOutEdges(userNodeId);

  // HOLD: Token holdings (not implemented yet - would come from wallet edges)
  dimensions.HOLD = { value: 0, weighted: 0 };

  // BURN: Tokens burned (not implemented yet)
  dimensions.BURN = { value: 0, weighted: 0 };

  // USE: API usage (count of USES edges)
  const usesEdges = edges.filter(e => e.type === 'USES');
  dimensions.USE = {
    value: usesEdges.length,
    weighted: usesEdges.length * E_SCORE_DIMENSIONS.USE.weight,
  };
  totalScore += dimensions.USE.weighted;

  // BUILD: Apps built (count of BUILDS/DEVELOPS edges)
  const buildEdges = edges.filter(e => e.type === 'BUILDS' || e.type === 'DEVELOPS');
  dimensions.BUILD = {
    value: buildEdges.length,
    weighted: buildEdges.length * E_SCORE_DIMENSIONS.BUILD.weight,
  };
  totalScore += dimensions.BUILD.weighted;

  // RUN: Nodes operated (count of OPERATES edges)
  const operatesEdges = edges.filter(e => e.type === 'OPERATES');
  dimensions.RUN = {
    value: operatesEdges.length,
    weighted: operatesEdges.length * E_SCORE_DIMENSIONS.RUN.weight,
  };
  totalScore += dimensions.RUN.weighted;

  // REFER: Referrals (count of REFERRED edges)
  const referEdges = edges.filter(e => e.type === 'REFERRED');
  dimensions.REFER = {
    value: referEdges.length,
    weighted: referEdges.length * E_SCORE_DIMENSIONS.REFER.weight,
  };
  totalScore += dimensions.REFER.weighted;

  // CONTRIBUTE: Code contributions (special - high weight for ecosystem)
  const contributeEdges = edges.filter(e => e.type === 'CONTRIBUTES');
  const totalCommits = contributeEdges.reduce((sum, e) => sum + (e.attributes.commits || 0), 0);

  // Contribution bonus: sqrt(commits) * φ² (diminishing returns)
  const contributionScore = Math.sqrt(totalCommits) * PHI_2;
  dimensions.CONTRIBUTE = {
    value: totalCommits,
    repos: contributeEdges.length,
    weighted: contributionScore,
  };
  totalScore += contributionScore;

  // TIME: Time in ecosystem (days since first edge)
  const allEdges = [...edges, ...getInEdges(userNodeId)];

  // Guard against empty edges - user has no history yet
  let daysSinceFirst = 0;
  let timeScore = 0;

  if (allEdges.length > 0) {
    const edgeTimes = allEdges.map(e => e.metadata.createdAt || Date.now());
    const firstEdgeTime = Math.min(...edgeTimes);
    daysSinceFirst = (Date.now() - firstEdgeTime) / (24 * 60 * 60 * 1000);
    // Time bonus: log(days + 1) * φ⁻¹ (slow growth)
    timeScore = Math.log(daysSinceFirst + 1) * E_SCORE_DIMENSIONS.TIME.weight;
  }

  dimensions.TIME = {
    value: Math.round(daysSinceFirst),
    weighted: timeScore,
  };
  totalScore += timeScore;

  // Normalize to 0-100 using sigmoid-like function
  // E-Score = 100 * (1 - e^(-totalScore/50))
  const normalizedScore = 100 * (1 - Math.exp(-totalScore / 50));

  // Determine tier
  let tier = 'EPSILON';
  for (const [name, config] of Object.entries(E_SCORE_TIERS)) {
    if (normalizedScore >= config.min) {
      tier = name;
      break;
    }
  }

  return {
    userId: userNodeId,
    userName: userNode.attributes.name,
    rawScore: totalScore,
    normalizedScore: Math.round(normalizedScore * 10) / 10,
    tier,
    tierInfo: E_SCORE_TIERS[tier],
    dimensions,
    edgeCount: edges.length,
    calculatedAt: Date.now(),
  };
}

/**
 * Calculate E-Score for all users
 */
function calculateAllEScores() {
  const users = getNodesByType('user');
  const scores = [];

  for (const user of users) {
    const score = calculateEScore(user.id);
    if (score) {
      scores.push(score);
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.normalizedScore - a.normalizedScore);

  return scores;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save graph to disk
 */
function saveGraph() {
  if (!fs.existsSync(GRAPH_DIR)) {
    fs.mkdirSync(GRAPH_DIR, { recursive: true });
  }

  const data = {
    version: graph.version,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
    nodes: Array.from(graph.nodes.values()).map(n => n.toJSON()),
    edges: Array.from(graph.edges.values()).map(e => e.toJSON()),
  };

  fs.writeFileSync(GRAPH_FILE, JSON.stringify(data, null, 2));
}

/**
 * Load graph from disk
 */
function loadGraph() {
  if (!fs.existsSync(GRAPH_FILE)) {
    return false;
  }

  try {
    const data = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));

    // Clear current graph
    graph.nodes.clear();
    graph.edges.clear();
    graph.indices.byType.clear();
    graph.indices.byIdentifier.clear();
    graph.indices.edgesBySource.clear();
    graph.indices.edgesByTarget.clear();

    // Load metadata
    graph.version = data.version || 1;
    graph.createdAt = data.createdAt || Date.now();
    graph.updatedAt = data.updatedAt || Date.now();

    // Load nodes
    for (const nodeData of data.nodes || []) {
      addNode(GraphNode.fromJSON(nodeData));
    }

    // Load edges
    for (const edgeData of data.edges || []) {
      addEdge(GraphEdge.fromJSON(edgeData));
    }

    return true;
  } catch (e) {
    console.error('Failed to load graph:', e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS & DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get graph statistics
 */
function getStats() {
  const nodesByType = {};
  for (const [type, ids] of graph.indices.byType) {
    nodesByType[type] = ids.size;
  }

  const edgesByType = {};
  for (const edge of graph.edges.values()) {
    edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
  }

  return {
    totalNodes: graph.nodes.size,
    totalEdges: graph.edges.size,
    nodesByType,
    edgesByType,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
  };
}

/**
 * Print graph summary
 */
function printSummary() {
  const stats = getStats();
  const eScores = calculateAllEScores();

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('🐕 CYNIC GRAPH OVERLAY');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  console.log('NODES:');
  for (const [type, count] of Object.entries(stats.nodesByType).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type.padEnd(12)} ${count}`);
  }
  console.log(`   ${'TOTAL'.padEnd(12)} ${stats.totalNodes}`);

  console.log('\nEDGES:');
  for (const [type, count] of Object.entries(stats.edgesByType).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${type.padEnd(12)} ${count}`);
  }
  console.log(`   ${'TOTAL'.padEnd(12)} ${stats.totalEdges}`);

  console.log('\nE-SCORES (Graph-Native):');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  for (const score of eScores.slice(0, 10)) {
    const tierInfo = E_SCORE_TIERS[score.tier];
    console.log(`   ${tierInfo.color} ${score.userName.padEnd(20)} E-Score: ${String(score.normalizedScore).padStart(5)} (${score.tier})`);
    console.log(`      └─ Commits: ${score.dimensions.CONTRIBUTE?.value || 0} | Repos: ${score.dimensions.CONTRIBUTE?.repos || 0} | Days: ${score.dimensions.TIME?.value || 0}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize graph (load or populate)
 */
function init(workspacePath = '/workspaces') {
  // Try to load existing graph
  const loaded = loadGraph();

  if (!loaded) {
    // Populate fresh graph
    populateFromEcosystem(workspacePath);
  }

  // Load contributors and add contribution edges
  const contributorsFile = path.join(os.homedir(), '.cynic/learning/contributors.json');
  if (fs.existsSync(contributorsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(contributorsFile, 'utf8'));
      populateContributions(data);
    } catch (e) {
      // Ignore
    }
  }

  return getStats();
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Initialization
  init,
  loadGraph,
  saveGraph,

  // Node operations
  addNode,
  getNode,
  getNodeByKey,
  getNodesByType,
  GraphNode,

  // Edge operations
  addEdge,
  getOutEdges,
  getInEdges,
  getAllEdges,
  GraphEdge,

  // Populate
  populateFromEcosystem,
  populateContributions,

  // E-Score
  calculateEScore,
  calculateAllEScores,
  E_SCORE_DIMENSIONS,
  E_SCORE_TIERS,

  // Stats
  getStats,
  printSummary,

  // Constants
  PHI,
  PHI_INV,
  PHI_2,
  PHI_3,

  // Graph access (for advanced use)
  getGraph: () => graph,
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--init') || args.includes('-i')) {
    console.log('Initializing graph...');
    const stats = init();
    console.log('Done:', stats);
  } else if (args.includes('--populate') || args.includes('-p')) {
    console.log('Populating from ecosystem...');
    loadGraph();
    const result = populateFromEcosystem();
    console.log('Done:', result);
  } else if (args.includes('--stats') || args.includes('-s')) {
    loadGraph();
    console.log(JSON.stringify(getStats(), null, 2));
  } else if (args.includes('--escores') || args.includes('-e')) {
    loadGraph();
    const scores = calculateAllEScores();
    console.log(JSON.stringify(scores, null, 2));
  } else {
    init();
    printSummary();
  }
}
