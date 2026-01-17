/**
 * Graph Traversal Algorithms
 *
 * BFS, DFS, shortest path, and φ-weighted influence paths.
 *
 * "Every path reveals truth" - κυνικός
 *
 * @module @cynic/persistence/graph/traversal
 */

'use strict';

const PHI = 1.618033988749895;

/**
 * Traversal result with path and weight information
 */
export class TraversalResult {
  constructor() {
    this.visited = new Set();
    this.paths = new Map();     // nodeId -> { path: string[], weight: number }
    this.distances = new Map(); // nodeId -> distance from start
    this.order = [];            // Visit order
  }

  addVisit(nodeId, fromId = null, edge = null) {
    if (this.visited.has(nodeId)) return false;

    this.visited.add(nodeId);
    this.order.push(nodeId);

    if (fromId && this.paths.has(fromId)) {
      const parentPath = this.paths.get(fromId);
      this.paths.set(nodeId, {
        path: [...parentPath.path, nodeId],
        weight: parentPath.weight * (edge?.weight || 1),
      });
      this.distances.set(nodeId, this.distances.get(fromId) + 1);
    } else {
      this.paths.set(nodeId, { path: [nodeId], weight: 1 });
      this.distances.set(nodeId, 0);
    }

    return true;
  }

  getPath(nodeId) {
    return this.paths.get(nodeId)?.path || [];
  }

  getWeight(nodeId) {
    return this.paths.get(nodeId)?.weight || 0;
  }

  toJSON() {
    return {
      visited: [...this.visited],
      order: this.order,
      paths: Object.fromEntries(this.paths),
      distances: Object.fromEntries(this.distances),
    };
  }
}

/**
 * Graph Traversal - algorithms for exploring the graph
 */
export class GraphTraversal {
  /**
   * @param {GraphStore} store - Graph store
   */
  constructor(store) {
    this.store = store;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC TRAVERSAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Breadth-first search
   * @param {string} startId - Starting node ID
   * @param {Object} [options] - Traversal options
   * @returns {AsyncGenerator<{node, depth, path}>} Visited nodes
   */
  async *bfs(startId, options = {}) {
    const {
      maxDepth = Infinity,
      edgeType = null,
      direction = 'out',
      filter = null,
    } = options;

    const visited = new Set();
    const queue = [{ id: startId, depth: 0, path: [startId] }];

    while (queue.length > 0) {
      const { id, depth, path } = queue.shift();

      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const node = await this.store.getNode(id);
      if (!node) continue;

      // Apply filter
      if (filter && !filter(node, depth)) continue;

      yield { node, depth, path };

      // Get neighbors
      const neighbors = await this.store.getNeighbors(id, { direction, edgeType });

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push({
            id: neighbor.id,
            depth: depth + 1,
            path: [...path, neighbor.id],
          });
        }
      }
    }
  }

  /**
   * Depth-first search
   * @param {string} startId - Starting node ID
   * @param {Object} [options] - Traversal options
   * @returns {AsyncGenerator<{node, depth, path}>} Visited nodes
   */
  async *dfs(startId, options = {}) {
    const {
      maxDepth = Infinity,
      edgeType = null,
      direction = 'out',
      filter = null,
    } = options;

    const visited = new Set();
    const stack = [{ id: startId, depth: 0, path: [startId] }];

    while (stack.length > 0) {
      const { id, depth, path } = stack.pop();

      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const node = await this.store.getNode(id);
      if (!node) continue;

      // Apply filter
      if (filter && !filter(node, depth)) continue;

      yield { node, depth, path };

      // Get neighbors (reverse order for DFS to maintain expected order)
      const neighbors = await this.store.getNeighbors(id, { direction, edgeType });

      for (let i = neighbors.length - 1; i >= 0; i--) {
        const neighbor = neighbors[i];
        if (!visited.has(neighbor.id)) {
          stack.push({
            id: neighbor.id,
            depth: depth + 1,
            path: [...path, neighbor.id],
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH FINDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find shortest path between two nodes (unweighted)
   * @param {string} startId - Start node ID
   * @param {string} endId - End node ID
   * @param {Object} [options] - Options
   * @returns {Promise<{path: string[], length: number}|null>} Path or null
   */
  async shortestPath(startId, endId, options = {}) {
    const { edgeType = null, direction = 'both', maxDepth = 100 } = options;

    for await (const { node, path } of this.bfs(startId, { edgeType, direction, maxDepth })) {
      if (node.id === endId) {
        return { path, length: path.length - 1 };
      }
    }

    return null;
  }

  /**
   * Find φ-weighted path between two nodes
   * Uses Dijkstra's algorithm with φ-weights
   * @param {string} startId - Start node ID
   * @param {string} endId - End node ID
   * @param {Object} [options] - Options
   * @returns {Promise<{path: string[], weight: number}|null>} Path or null
   */
  async weightedPath(startId, endId, options = {}) {
    const { edgeType = null, direction = 'out', maxIterations = 1000 } = options;

    // Priority queue (simplified - use heap in production)
    const distances = new Map([[startId, 0]]);
    const previous = new Map();
    const unvisited = new Set([startId]);
    let iterations = 0;

    // Initialize with BFS to find reachable nodes
    for await (const { node } of this.bfs(startId, { direction, edgeType })) {
      if (!distances.has(node.id)) {
        distances.set(node.id, Infinity);
      }
      unvisited.add(node.id);
    }

    while (unvisited.size > 0 && iterations < maxIterations) {
      iterations++;

      // Find node with minimum distance
      let minNode = null;
      let minDist = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId);
        if (dist < minDist) {
          minDist = dist;
          minNode = nodeId;
        }
      }

      if (minNode === null || minDist === Infinity) break;
      if (minNode === endId) break;

      unvisited.delete(minNode);

      // Get edges
      const edges = direction === 'out'
        ? await this.store.getOutEdges(minNode, edgeType)
        : await this.store.getEdges(minNode, edgeType);

      for (const edge of edges) {
        const neighborId = edge.sourceId === minNode ? edge.targetId : edge.sourceId;
        if (!unvisited.has(neighborId)) continue;

        // φ-weighted distance (inverse - higher weight = shorter path)
        const edgeDistance = 1 / edge.weight;
        const alt = distances.get(minNode) + edgeDistance;

        if (alt < distances.get(neighborId)) {
          distances.set(neighborId, alt);
          previous.set(neighborId, { nodeId: minNode, edge });
        }
      }
    }

    // Reconstruct path
    if (!previous.has(endId) && startId !== endId) {
      return null;
    }

    const path = [endId];
    let weight = 1;
    let current = endId;

    while (previous.has(current)) {
      const { nodeId, edge } = previous.get(current);
      path.unshift(nodeId);
      weight *= edge.weight;
      current = nodeId;
    }

    return { path, weight };
  }

  /**
   * Find all paths between two nodes
   * @param {string} startId - Start node ID
   * @param {string} endId - End node ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array<{path: string[], weight: number}>>} All paths
   */
  async allPaths(startId, endId, options = {}) {
    const { maxDepth = 5, edgeType = null, direction = 'out', maxPaths = 100 } = options;

    const paths = [];

    const findPaths = async (currentId, path, weight, visited) => {
      if (paths.length >= maxPaths) return;
      if (path.length > maxDepth + 1) return;
      if (visited.has(currentId)) return;

      visited.add(currentId);
      path.push(currentId);

      if (currentId === endId) {
        paths.push({ path: [...path], weight });
        path.pop();
        visited.delete(currentId);
        return;
      }

      const edges = await this.store.getOutEdges(currentId, edgeType);

      for (const edge of edges) {
        await findPaths(edge.targetId, path, weight * edge.weight, visited);
      }

      path.pop();
      visited.delete(currentId);
    };

    await findPaths(startId, [], 1, new Set());

    // Sort by weight (descending - higher weight = stronger relationship)
    paths.sort((a, b) => b.weight - a.weight);

    return paths;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INFLUENCE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate influence score from one node to another
   * Uses φ-weighted path finding with decay
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @param {Object} [options] - Options
   * @returns {Promise<number>} Influence score (0-1)
   */
  async calculateInfluence(sourceId, targetId, options = {}) {
    const { maxDepth = 5, decayFactor = PHI } = options;

    const paths = await this.allPaths(sourceId, targetId, { maxDepth });
    if (paths.length === 0) return 0;

    // Combine all paths with decay
    let totalInfluence = 0;

    for (const { path, weight } of paths) {
      const depth = path.length - 1;
      const decay = Math.pow(1 / decayFactor, depth);
      totalInfluence += weight * decay;
    }

    // Normalize to 0-1 range
    return Math.min(1, totalInfluence / paths.length);
  }

  /**
   * Find most influential nodes within N hops
   * @param {string} startId - Starting node ID
   * @param {number} [hops=3] - Maximum hops
   * @returns {Promise<Array<{nodeId, influence}>>} Ranked nodes
   */
  async findInfluencers(startId, hops = 3) {
    const influences = new Map();

    for await (const { node, depth } of this.bfs(startId, { maxDepth: hops })) {
      if (node.id === startId) continue;

      const influence = await this.calculateInfluence(startId, node.id, { maxDepth: hops });
      influences.set(node.id, influence);
    }

    // Sort by influence
    const ranked = [...influences.entries()]
      .map(([nodeId, influence]) => ({ nodeId, influence }))
      .sort((a, b) => b.influence - a.influence);

    return ranked;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBGRAPH EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract subgraph around a node
   * @param {string} centerId - Center node ID
   * @param {number} [radius=2] - Radius in hops
   * @returns {Promise<{nodes: GraphNode[], edges: GraphEdge[]}>} Subgraph
   */
  async extractSubgraph(centerId, radius = 2) {
    const nodeIds = new Set();
    const edgeIds = new Set();

    // Collect nodes
    for await (const { node } of this.bfs(centerId, { maxDepth: radius, direction: 'both' })) {
      nodeIds.add(node.id);
    }

    // Collect edges between collected nodes
    for (const nodeId of nodeIds) {
      const edges = await this.store.getEdges(nodeId);

      for (const edge of edges) {
        if (nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId)) {
          edgeIds.add(edge.id);
        }
      }
    }

    // Get full objects
    const nodes = [];
    const edges = [];

    for (const id of nodeIds) {
      const node = await this.store.getNode(id);
      if (node) nodes.push(node);
    }

    for (const id of edgeIds) {
      const edge = await this.store.getEdge(id);
      if (edge) edges.push(edge);
    }

    return { nodes, edges };
  }

  /**
   * Find connected components
   * @returns {Promise<Array<Set<string>>>} Array of components (sets of node IDs)
   */
  async findConnectedComponents() {
    const visited = new Set();
    const components = [];

    // Get all node IDs from cache (simplified - should use index iteration)
    const allNodeIds = new Set();
    for (const [nodeId] of this.store._nodeCache) {
      allNodeIds.add(nodeId);
    }

    for (const nodeId of allNodeIds) {
      if (visited.has(nodeId)) continue;

      const component = new Set();

      for await (const { node } of this.bfs(nodeId, { direction: 'both' })) {
        if (!visited.has(node.id)) {
          visited.add(node.id);
          component.add(node.id);
        }
      }

      if (component.size > 0) {
        components.push(component);
      }
    }

    return components;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find cycles containing a node
   * @param {string} nodeId - Node ID
   * @param {Object} [options] - Options
   * @returns {Promise<Array<string[]>>} Cycles (arrays of node IDs)
   */
  async findCycles(nodeId, options = {}) {
    const { maxLength = 5, edgeType = null } = options;
    const cycles = [];

    const findCyclesFrom = async (currentId, path, visited) => {
      if (path.length > maxLength) return;

      const edges = await this.store.getOutEdges(currentId, edgeType);

      for (const edge of edges) {
        const nextId = edge.targetId;

        // Found a cycle back to start
        if (nextId === nodeId && path.length >= 2) {
          cycles.push([...path, nodeId]);
          continue;
        }

        // Continue exploring
        if (!visited.has(nextId)) {
          visited.add(nextId);
          path.push(nextId);
          await findCyclesFrom(nextId, path, visited);
          path.pop();
          visited.delete(nextId);
        }
      }
    };

    await findCyclesFrom(nodeId, [nodeId], new Set([nodeId]));

    return cycles;
  }

  /**
   * Find triangles (3-node cycles) containing a node
   * @param {string} nodeId - Node ID
   * @returns {Promise<Array<[string, string, string]>>} Triangles
   */
  async findTriangles(nodeId) {
    const triangles = [];
    const neighbors = await this.store.getNeighbors(nodeId, { direction: 'both' });

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const a = neighbors[i].id;
        const b = neighbors[j].id;

        // Check if a and b are connected
        const edge = await this.store.getEdgeBetween(a, b);
        const reverseEdge = await this.store.getEdgeBetween(b, a);

        if (edge || reverseEdge) {
          triangles.push([nodeId, a, b]);
        }
      }
    }

    return triangles;
  }
}

export default GraphTraversal;
