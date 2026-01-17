/**
 * Graph Store
 *
 * Storage layer for graph nodes and edges with adjacency lists.
 * Integrates with Merkle DAG for content-addressable persistence.
 *
 * "Every node finds its neighbors" - κυνικός
 *
 * @module @cynic/persistence/graph/store
 */

'use strict';

import { EventEmitter } from 'events';
import { BlockStore } from '../dag/store.js';
import { HAMTIndex } from '../dag/hamt.js';
import { DAGNode, DAGLink, NodeType, createEntityNode, createEdgeNode } from '../dag/node.js';
import { GraphNode, GraphEdge, GraphNodeType, GraphEdgeType, EdgeSpecs } from './types.js';

/**
 * Graph Store - Storage for relationship graph
 */
export class GraphStore extends EventEmitter {
  /**
   * @param {Object} config - Store configuration
   */
  constructor(config = {}) {
    super();

    this.config = {
      basePath: config.basePath || './data/graph',
      ...config,
    };

    // Block store for DAG persistence
    this.store = new BlockStore({
      basePath: `${this.config.basePath}/blocks`,
    });

    // Indices
    this._nodeIndex = null;     // node key -> CID
    this._nodeTypeIndex = null; // type:id -> CID
    this._edgeIndex = null;     // edge key -> CID

    // Adjacency lists (in-memory, synced to DAG)
    this._outEdges = new Map();  // nodeId -> Set<edgeId>
    this._inEdges = new Map();   // nodeId -> Set<edgeId>

    // Caches
    this._nodeCache = new Map();
    this._edgeCache = new Map();

    this._initialized = false;
  }

  /**
   * Initialize the store
   */
  async init() {
    if (this._initialized) return;

    await this.store.init();

    // Initialize indices
    this._nodeIndex = new HAMTIndex(this.store);
    this._nodeTypeIndex = new HAMTIndex(this.store);
    this._edgeIndex = new HAMTIndex(this.store);

    await this._nodeIndex.init();
    await this._nodeTypeIndex.init();
    await this._edgeIndex.init();

    this._initialized = true;
    this.emit('initialized');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NODE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a node to the graph
   * @param {GraphNode} node - Node to add
   * @returns {Promise<string>} Node CID
   */
  async addNode(node) {
    await this.init();

    // Create DAG node for storage
    const dagNode = createEntityNode({
      entityType: node.type,
      identifier: node.identifier,
      name: node.attributes.name || node.identifier,
      attributes: node.attributes,
      source: 'graph',
    });

    // Store in DAG
    const cid = await this.store.putNode(dagNode);

    // Update indices
    await this._nodeIndex.set(node.id, cid);
    await this._nodeTypeIndex.set(node.key, cid);

    // Initialize adjacency lists
    if (!this._outEdges.has(node.id)) {
      this._outEdges.set(node.id, new Set());
    }
    if (!this._inEdges.has(node.id)) {
      this._inEdges.set(node.id, new Set());
    }

    // Cache
    this._nodeCache.set(node.id, { node, cid });

    this.emit('node:added', { node, cid });
    return cid;
  }

  /**
   * Get a node by ID
   * @param {string} nodeId - Node ID
   * @returns {Promise<GraphNode|null>} Node or null
   */
  async getNode(nodeId) {
    // Check cache
    if (this._nodeCache.has(nodeId)) {
      return this._nodeCache.get(nodeId).node;
    }

    const cid = await this._nodeIndex.get(nodeId);
    if (!cid) return null;

    const dagNode = await this.store.getNode(cid);
    if (!dagNode) return null;

    const node = new GraphNode({
      id: nodeId,
      type: dagNode.data.entityType,
      identifier: dagNode.data.identifier,
      attributes: dagNode.data.attributes,
      metadata: dagNode.metadata,
    });

    // Cache
    this._nodeCache.set(nodeId, { node, cid });

    return node;
  }

  /**
   * Get a node by type and identifier
   * @param {string} type - Node type
   * @param {string} identifier - Node identifier
   * @returns {Promise<GraphNode|null>} Node or null
   */
  async getNodeByKey(type, identifier) {
    const key = `${type}:${identifier}`;
    const cid = await this._nodeTypeIndex.get(key);
    if (!cid) return null;

    const dagNode = await this.store.getNode(cid);
    if (!dagNode) return null;

    // Find the node ID from our index
    for (const [nodeId, data] of this._nodeCache) {
      if (data.cid === cid) {
        return data.node;
      }
    }

    // Not in cache, create from DAG
    const node = new GraphNode({
      id: `${type}_${Date.now().toString(36)}`,
      type: dagNode.data.entityType,
      identifier: dagNode.data.identifier,
      attributes: dagNode.data.attributes,
      metadata: dagNode.metadata,
    });

    return node;
  }

  /**
   * Update a node
   * @param {string} nodeId - Node ID
   * @param {Object} updates - Attribute updates
   * @returns {Promise<GraphNode|null>} Updated node or null
   */
  async updateNode(nodeId, updates) {
    const node = await this.getNode(nodeId);
    if (!node) return null;

    node.update(updates);

    // Re-store
    const cid = await this.addNode(node);
    return node;
  }

  /**
   * Delete a node (and all its edges)
   * @param {string} nodeId - Node ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteNode(nodeId) {
    const node = await this.getNode(nodeId);
    if (!node) return false;

    // Delete all edges
    const outEdges = this._outEdges.get(nodeId) || new Set();
    const inEdges = this._inEdges.get(nodeId) || new Set();

    for (const edgeId of [...outEdges, ...inEdges]) {
      await this.deleteEdge(edgeId);
    }

    // Remove from indices
    await this._nodeIndex.delete(nodeId);
    await this._nodeTypeIndex.delete(node.key);

    // Clear adjacency
    this._outEdges.delete(nodeId);
    this._inEdges.delete(nodeId);

    // Clear cache
    this._nodeCache.delete(nodeId);

    this.emit('node:deleted', { nodeId });
    return true;
  }

  /**
   * Check if node exists
   * @param {string} nodeId - Node ID
   * @returns {Promise<boolean>} True if exists
   */
  async hasNode(nodeId) {
    return this._nodeIndex.has(nodeId);
  }

  /**
   * Get all nodes of a type
   * @param {string} type - Node type
   * @returns {Promise<GraphNode[]>} Nodes of type
   */
  async getNodesByType(type) {
    const nodes = [];

    for (const [nodeId, data] of this._nodeCache) {
      if (data.node.type === type) {
        nodes.push(data.node);
      }
    }

    return nodes;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add an edge to the graph
   * @param {GraphEdge} edge - Edge to add
   * @returns {Promise<string>} Edge CID
   */
  async addEdge(edge) {
    await this.init();

    // Get source and target CIDs
    const sourceCid = await this._nodeIndex.get(edge.sourceId);
    const targetCid = await this._nodeIndex.get(edge.targetId);

    if (!sourceCid || !targetCid) {
      throw new Error('Source or target node not found');
    }

    // Create DAG edge node
    const dagNode = createEdgeNode(
      {
        edgeType: edge.type,
        weight: edge.weight,
        attributes: edge.attributes,
        created: edge.metadata.created,
      },
      sourceCid,
      targetCid
    );

    // Store in DAG
    const cid = await this.store.putNode(dagNode);

    // Update indices
    await this._edgeIndex.set(edge.id, cid);

    // Update adjacency lists
    if (!this._outEdges.has(edge.sourceId)) {
      this._outEdges.set(edge.sourceId, new Set());
    }
    if (!this._inEdges.has(edge.targetId)) {
      this._inEdges.set(edge.targetId, new Set());
    }

    this._outEdges.get(edge.sourceId).add(edge.id);
    this._inEdges.get(edge.targetId).add(edge.id);

    // Handle bidirectional edges
    if (edge.isBidirectional) {
      if (!this._outEdges.has(edge.targetId)) {
        this._outEdges.set(edge.targetId, new Set());
      }
      if (!this._inEdges.has(edge.sourceId)) {
        this._inEdges.set(edge.sourceId, new Set());
      }
      this._outEdges.get(edge.targetId).add(edge.id);
      this._inEdges.get(edge.sourceId).add(edge.id);
    }

    // Cache
    this._edgeCache.set(edge.id, { edge, cid });

    this.emit('edge:added', { edge, cid });
    return cid;
  }

  /**
   * Get an edge by ID
   * @param {string} edgeId - Edge ID
   * @returns {Promise<GraphEdge|null>} Edge or null
   */
  async getEdge(edgeId) {
    // Check cache
    if (this._edgeCache.has(edgeId)) {
      return this._edgeCache.get(edgeId).edge;
    }

    const cid = await this._edgeIndex.get(edgeId);
    if (!cid) return null;

    const dagNode = await this.store.getNode(cid);
    if (!dagNode) return null;

    // Extract source and target from links
    const sourceLink = dagNode.links.find(l => l.name === 'source');
    const targetLink = dagNode.links.find(l => l.name === 'target');

    const edge = new GraphEdge({
      id: edgeId,
      type: dagNode.data.edgeType,
      sourceId: sourceLink?.cid || '',
      targetId: targetLink?.cid || '',
      weight: dagNode.data.weight,
      attributes: dagNode.data.attributes,
      metadata: dagNode.metadata,
    });

    // Cache
    this._edgeCache.set(edgeId, { edge, cid });

    return edge;
  }

  /**
   * Delete an edge
   * @param {string} edgeId - Edge ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteEdge(edgeId) {
    const edge = await this.getEdge(edgeId);
    if (!edge) return false;

    // Remove from adjacency
    this._outEdges.get(edge.sourceId)?.delete(edgeId);
    this._inEdges.get(edge.targetId)?.delete(edgeId);

    if (edge.isBidirectional) {
      this._outEdges.get(edge.targetId)?.delete(edgeId);
      this._inEdges.get(edge.sourceId)?.delete(edgeId);
    }

    // Remove from index
    await this._edgeIndex.delete(edgeId);

    // Clear cache
    this._edgeCache.delete(edgeId);

    this.emit('edge:deleted', { edgeId });
    return true;
  }

  /**
   * Check if edge exists
   * @param {string} edgeId - Edge ID
   * @returns {Promise<boolean>} True if exists
   */
  async hasEdge(edgeId) {
    return this._edgeIndex.has(edgeId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADJACENCY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get outgoing edges from a node
   * @param {string} nodeId - Source node ID
   * @param {string} [edgeType] - Optional edge type filter
   * @returns {Promise<GraphEdge[]>} Outgoing edges
   */
  async getOutEdges(nodeId, edgeType = null) {
    const edgeIds = this._outEdges.get(nodeId) || new Set();
    const edges = [];

    for (const edgeId of edgeIds) {
      const edge = await this.getEdge(edgeId);
      if (edge && (!edgeType || edge.type === edgeType)) {
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Get incoming edges to a node
   * @param {string} nodeId - Target node ID
   * @param {string} [edgeType] - Optional edge type filter
   * @returns {Promise<GraphEdge[]>} Incoming edges
   */
  async getInEdges(nodeId, edgeType = null) {
    const edgeIds = this._inEdges.get(nodeId) || new Set();
    const edges = [];

    for (const edgeId of edgeIds) {
      const edge = await this.getEdge(edgeId);
      if (edge && (!edgeType || edge.type === edgeType)) {
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Get all edges for a node (in and out)
   * @param {string} nodeId - Node ID
   * @param {string} [edgeType] - Optional edge type filter
   * @returns {Promise<GraphEdge[]>} All edges
   */
  async getEdges(nodeId, edgeType = null) {
    const outEdges = await this.getOutEdges(nodeId, edgeType);
    const inEdges = await this.getInEdges(nodeId, edgeType);

    // Deduplicate (for bidirectional edges)
    const seen = new Set();
    const edges = [];

    for (const edge of [...outEdges, ...inEdges]) {
      if (!seen.has(edge.id)) {
        seen.add(edge.id);
        edges.push(edge);
      }
    }

    return edges;
  }

  /**
   * Get neighbors of a node
   * @param {string} nodeId - Node ID
   * @param {Object} [options] - Options
   * @returns {Promise<GraphNode[]>} Neighbor nodes
   */
  async getNeighbors(nodeId, options = {}) {
    const { direction = 'both', edgeType = null } = options;

    const neighborIds = new Set();

    if (direction === 'out' || direction === 'both') {
      const outEdges = await this.getOutEdges(nodeId, edgeType);
      for (const edge of outEdges) {
        neighborIds.add(edge.targetId);
      }
    }

    if (direction === 'in' || direction === 'both') {
      const inEdges = await this.getInEdges(nodeId, edgeType);
      for (const edge of inEdges) {
        neighborIds.add(edge.sourceId);
      }
    }

    // Remove self if present
    neighborIds.delete(nodeId);

    // Get nodes
    const neighbors = [];
    for (const id of neighborIds) {
      const node = await this.getNode(id);
      if (node) neighbors.push(node);
    }

    return neighbors;
  }

  /**
   * Get edge between two nodes
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @param {string} [edgeType] - Optional edge type filter
   * @returns {Promise<GraphEdge|null>} Edge or null
   */
  async getEdgeBetween(sourceId, targetId, edgeType = null) {
    const outEdges = await this.getOutEdges(sourceId, edgeType);

    for (const edge of outEdges) {
      if (edge.targetId === targetId) {
        return edge;
      }
    }

    return null;
  }

  /**
   * Get degree of a node
   * @param {string} nodeId - Node ID
   * @param {string} [direction='both'] - 'in', 'out', or 'both'
   * @returns {Promise<number>} Degree
   */
  async getDegree(nodeId, direction = 'both') {
    let degree = 0;

    if (direction === 'out' || direction === 'both') {
      degree += (this._outEdges.get(nodeId)?.size || 0);
    }

    if (direction === 'in' || direction === 'both') {
      degree += (this._inEdges.get(nodeId)?.size || 0);
    }

    return degree;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get graph statistics
   * @returns {Promise<Object>} Graph stats
   */
  async getStats() {
    const nodeStats = await this._nodeIndex.stats();
    const edgeStats = await this._edgeIndex.stats();

    // Count by type
    const nodesByType = {};
    for (const type of Object.values(GraphNodeType)) {
      nodesByType[type] = 0;
    }
    for (const [, data] of this._nodeCache) {
      nodesByType[data.node.type]++;
    }

    const edgesByType = {};
    for (const type of Object.values(GraphEdgeType)) {
      edgesByType[type] = 0;
    }
    for (const [, data] of this._edgeCache) {
      edgesByType[data.edge.type]++;
    }

    return {
      nodeCount: nodeStats.totalEntries,
      edgeCount: edgeStats.totalEntries,
      nodesByType,
      edgesByType,
      cacheSize: {
        nodes: this._nodeCache.size,
        edges: this._edgeCache.size,
      },
    };
  }

  /**
   * Clear caches
   */
  clearCache() {
    this._nodeCache.clear();
    this._edgeCache.clear();
  }
}

export default GraphStore;
