/**
 * CYNIC Dashboard - Knowledge Graph Data Model
 *
 * Data structures and management for the knowledge graph visualization.
 * Handles nodes (judgments, patterns, blocks, sessions) and edges (relationships).
 *
 * "phi distrusts phi" - kynikos
 */

/**
 * Node types for the knowledge graph
 */
export const KGNodeType = {
  JUDGMENT: 'judgment',
  PATTERN: 'pattern',
  BLOCK: 'block',
  SESSION: 'session',
};

/**
 * Edge types for relationships
 */
export const KGEdgeType = {
  ANCHORED_IN: 'anchored_in',     // Judgment -> Block
  DERIVED_FROM: 'derived_from',   // Pattern -> Judgment
  REFERENCES: 'references',        // Judgment -> Pattern
  CONTAINS: 'contains',            // Session -> Judgment
};

/**
 * Knowledge Graph Node
 */
export class KGNode {
  constructor(id, type, data = {}) {
    this.id = id;
    this.type = type;
    this.data = data;

    // Position in 3D space (updated by force simulation)
    this.position = { x: 0, y: 0, z: 0 };

    // Velocity for physics simulation
    this.velocity = { x: 0, y: 0, z: 0 };

    // Fixed position (if pinned)
    this.fixed = false;

    // Timestamp for age-based effects
    this.createdAt = Date.now();

    // Visual properties derived from data
    this._computeVisualProperties();
  }

  /**
   * Compute visual properties based on node type and data
   */
  _computeVisualProperties() {
    switch (this.type) {
      case KGNodeType.JUDGMENT:
        this.color = this._getJudgmentColor();
        this.size = this._getJudgmentSize();
        this.shape = 'sphere';
        break;
      case KGNodeType.PATTERN:
        this.color = 0x00ff88; // Green
        this.size = 0.4;
        this.shape = 'octahedron';
        break;
      case KGNodeType.BLOCK:
        this.color = 0xffd93d; // Gold
        this.size = this._getBlockSize();
        this.shape = 'box';
        break;
      case KGNodeType.SESSION:
        this.color = 0xaa00d4; // Purple
        this.size = 0.3;
        this.shape = 'torus';
        break;
      default:
        this.color = 0x888888;
        this.size = 0.3;
        this.shape = 'sphere';
    }
  }

  /**
   * Get color for judgment based on Q-score (blue gradient)
   */
  _getJudgmentColor() {
    const qScore = this.data.Q ?? this.data.qScore ?? this.data.score ?? 50;
    // Blue gradient: darker for low Q, brighter for high Q
    const intensity = Math.min(255, Math.floor((qScore / 100) * 200 + 55));
    return (intensity << 16) | (intensity << 8) | 255; // RGB with blue dominant
  }

  /**
   * Get size for judgment based on Q-score
   * size = log(Q + 10) * 0.1
   */
  _getJudgmentSize() {
    const qScore = this.data.Q ?? this.data.qScore ?? this.data.score ?? 50;
    return Math.log(qScore + 10) * 0.1;
  }

  /**
   * Get size for block based on judgment count
   */
  _getBlockSize() {
    const count = this.data.judgmentCount ?? this.data.judgments?.length ?? 1;
    return 0.3 + Math.log(count + 1) * 0.1;
  }

  /**
   * Update node data and recompute visuals
   */
  updateData(data) {
    this.data = { ...this.data, ...data };
    this._computeVisualProperties();
  }

  /**
   * Get the label for this node
   */
  getLabel() {
    switch (this.type) {
      case KGNodeType.JUDGMENT:
        return this.data.verdict || this.id.slice(0, 8);
      case KGNodeType.PATTERN:
        return this.data.category || 'Pattern';
      case KGNodeType.BLOCK:
        return `#${this.data.slot ?? this.data.blockNumber ?? '?'}`;
      case KGNodeType.SESSION:
        return this.data.userId?.slice(0, 8) || 'Session';
      default:
        return this.id.slice(0, 8);
    }
  }

  /**
   * Check if this is a high-Q judgment (for bloom effect)
   */
  isHighQ() {
    if (this.type !== KGNodeType.JUDGMENT) return false;
    const qScore = this.data.Q ?? this.data.qScore ?? this.data.score ?? 0;
    return qScore > 80;
  }
}

/**
 * Knowledge Graph Edge
 */
export class KGEdge {
  constructor(sourceId, targetId, type) {
    this.id = `${sourceId}->${targetId}:${type}`;
    this.source = sourceId;
    this.target = targetId;
    this.type = type;
    this.createdAt = Date.now();

    // Visual properties
    this._computeVisualProperties();
  }

  _computeVisualProperties() {
    switch (this.type) {
      case KGEdgeType.ANCHORED_IN:
        this.color = 0xffd93d; // Gold (to block)
        this.style = 'solid';
        this.width = 2;
        break;
      case KGEdgeType.DERIVED_FROM:
        this.color = 0x00ff88; // Green (pattern origin)
        this.style = 'dashed';
        this.width = 1;
        break;
      case KGEdgeType.REFERENCES:
        this.color = 0x00aad4; // Blue
        this.style = 'dotted';
        this.width = 1;
        break;
      case KGEdgeType.CONTAINS:
        this.color = 0xaa00d4; // Purple (session)
        this.style = 'solid';
        this.width = 1;
        break;
      default:
        this.color = 0x444444;
        this.style = 'solid';
        this.width = 1;
    }
  }
}

/**
 * Knowledge Graph Data Manager
 * Manages nodes, edges, and provides query/filter methods
 */
export class KnowledgeGraphData {
  constructor() {
    /** @type {Map<string, KGNode>} */
    this.nodes = new Map();

    /** @type {Map<string, KGEdge>} */
    this.edges = new Map();

    /** @type {Map<string, Set<string>>} */
    this.adjacency = new Map(); // nodeId -> Set of connected nodeIds

    /** @type {Set<Function>} */
    this.listeners = new Set();

    // Stats
    this.stats = {
      judgments: 0,
      patterns: 0,
      blocks: 0,
      sessions: 0,
      edges: 0,
    };
  }

  /**
   * Add a node to the graph
   */
  addNode(id, type, data = {}) {
    if (this.nodes.has(id)) {
      // Update existing node
      this.nodes.get(id).updateData(data);
      this._emit('nodeUpdated', { id, type, data });
      return this.nodes.get(id);
    }

    const node = new KGNode(id, type, data);

    // Randomize initial position
    node.position = {
      x: (Math.random() - 0.5) * 10,
      y: this._getInitialY(type),
      z: (Math.random() - 0.5) * 10,
    };

    this.nodes.set(id, node);
    this.adjacency.set(id, new Set());

    // Update stats
    this._updateStats();

    this._emit('nodeAdded', { node });
    return node;
  }

  /**
   * Get initial Y position based on type (layering)
   */
  _getInitialY(type) {
    switch (type) {
      case KGNodeType.BLOCK:
        return -2 + Math.random() * 0.5; // Bottom layer
      case KGNodeType.JUDGMENT:
        return 0 + Math.random() * 2;    // Middle layer
      case KGNodeType.PATTERN:
        return 3 + Math.random() * 1;    // Top layer
      case KGNodeType.SESSION:
        return 1 + Math.random() * 1;    // Mid-upper layer
      default:
        return Math.random() * 4 - 2;
    }
  }

  /**
   * Remove a node and its edges
   */
  removeNode(id) {
    if (!this.nodes.has(id)) return false;

    // Remove all edges connected to this node
    const connected = this.adjacency.get(id) || new Set();
    for (const otherId of connected) {
      this._removeEdgeBetween(id, otherId);
    }

    this.nodes.delete(id);
    this.adjacency.delete(id);

    this._updateStats();
    this._emit('nodeRemoved', { id });
    return true;
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(sourceId, targetId, type) {
    // Ensure both nodes exist
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      console.warn(`Cannot add edge: nodes ${sourceId} or ${targetId} not found`);
      return null;
    }

    const edge = new KGEdge(sourceId, targetId, type);

    if (this.edges.has(edge.id)) {
      return this.edges.get(edge.id);
    }

    this.edges.set(edge.id, edge);

    // Update adjacency
    this.adjacency.get(sourceId)?.add(targetId);
    this.adjacency.get(targetId)?.add(sourceId);

    this._updateStats();
    this._emit('edgeAdded', { edge });
    return edge;
  }

  /**
   * Remove an edge
   */
  removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;

    this.edges.delete(edgeId);
    this.adjacency.get(edge.source)?.delete(edge.target);
    this.adjacency.get(edge.target)?.delete(edge.source);

    this._updateStats();
    this._emit('edgeRemoved', { edgeId });
    return true;
  }

  /**
   * Remove edge between two nodes (all types)
   */
  _removeEdgeBetween(id1, id2) {
    const toRemove = [];
    for (const [edgeId, edge] of this.edges) {
      if ((edge.source === id1 && edge.target === id2) ||
          (edge.source === id2 && edge.target === id1)) {
        toRemove.push(edgeId);
      }
    }
    toRemove.forEach(id => this.edges.delete(id));
  }

  /**
   * Get a node by ID
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type) {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  /**
   * Get edges connected to a node
   */
  getEdgesForNode(nodeId) {
    return Array.from(this.edges.values()).filter(
      e => e.source === nodeId || e.target === nodeId
    );
  }

  /**
   * Get connected nodes
   */
  getConnectedNodes(nodeId) {
    const connectedIds = this.adjacency.get(nodeId) || new Set();
    return Array.from(connectedIds).map(id => this.nodes.get(id)).filter(Boolean);
  }

  /**
   * Filter nodes
   */
  filterNodes(predicate) {
    return Array.from(this.nodes.values()).filter(predicate);
  }

  /**
   * Get all nodes as array
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges as array
   */
  getAllEdges() {
    return Array.from(this.edges.values());
  }

  /**
   * Update stats
   */
  _updateStats() {
    this.stats = {
      judgments: this.getNodesByType(KGNodeType.JUDGMENT).length,
      patterns: this.getNodesByType(KGNodeType.PATTERN).length,
      blocks: this.getNodesByType(KGNodeType.BLOCK).length,
      sessions: this.getNodesByType(KGNodeType.SESSION).length,
      edges: this.edges.size,
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this._updateStats();
    this._emit('cleared', {});
  }

  /**
   * Event management
   */
  on(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _emit(event, data) {
    for (const listener of this.listeners) {
      try {
        listener({ event, ...data });
      } catch (err) {
        console.error('KnowledgeGraphData listener error:', err);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HIGH-LEVEL ADD METHODS (for SSE integration)
  // ═══════════════════════════════════════════════════════════

  /**
   * Add a judgment from SSE event
   */
  addJudgment(judgment) {
    const id = judgment.id || judgment.judgmentId || `jdg_${Date.now()}`;
    const node = this.addNode(id, KGNodeType.JUDGMENT, judgment);

    // Link to block if blockSlot is present
    if (judgment.blockSlot !== undefined) {
      const blockId = `block_${judgment.blockSlot}`;
      if (this.nodes.has(blockId)) {
        this.addEdge(id, blockId, KGEdgeType.ANCHORED_IN);
      }
    }

    // Link to session if sessionId is present
    if (judgment.sessionId) {
      if (this.nodes.has(judgment.sessionId)) {
        this.addEdge(judgment.sessionId, id, KGEdgeType.CONTAINS);
      }
    }

    return node;
  }

  /**
   * Add a pattern from SSE event
   */
  addPattern(pattern) {
    const id = pattern.id || `pat_${Date.now()}`;
    const node = this.addNode(id, KGNodeType.PATTERN, pattern);

    // Link to source judgments if present
    if (pattern.sourceJudgments) {
      for (const jdgId of pattern.sourceJudgments) {
        if (this.nodes.has(jdgId)) {
          this.addEdge(id, jdgId, KGEdgeType.DERIVED_FROM);
        }
      }
    }

    return node;
  }

  /**
   * Add a block from SSE event
   */
  addBlock(block) {
    const slot = block.slot ?? block.blockNumber ?? block.height;
    const id = `block_${slot}`;
    const node = this.addNode(id, KGNodeType.BLOCK, block);

    // Link judgments to this block
    if (block.judgments) {
      for (const jdgId of block.judgments) {
        if (this.nodes.has(jdgId)) {
          this.addEdge(jdgId, id, KGEdgeType.ANCHORED_IN);
        }
      }
    }

    return node;
  }

  /**
   * Add a session
   */
  addSession(session) {
    const id = session.sessionId || `sess_${Date.now()}`;
    return this.addNode(id, KGNodeType.SESSION, session);
  }

  // ═══════════════════════════════════════════════════════════
  // SERIALIZATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Export to JSON
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        type: node.type,
        data: node.data,
        position: node.position,
      })),
      edges: Array.from(this.edges.entries()).map(([id, edge]) => ({
        id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
      })),
    };
  }

  /**
   * Import from JSON
   */
  fromJSON(json) {
    this.clear();

    // Add nodes
    for (const n of json.nodes || []) {
      const node = this.addNode(n.id, n.type, n.data);
      if (n.position) {
        node.position = n.position;
      }
    }

    // Add edges
    for (const e of json.edges || []) {
      this.addEdge(e.source, e.target, e.type);
    }

    return this;
  }
}

// Export singleton for convenience
export const knowledgeGraphData = new KnowledgeGraphData();

// Export to window
window.CYNICKnowledgeGraphData = KnowledgeGraphData;
