/**
 * CYNIC Dashboard - Force-Directed Layout Simulation
 *
 * Barnes-Hut algorithm for O(n log n) force-directed graph layout.
 * Optimized for 1000+ nodes at 60fps.
 *
 * "phi guides all ratios" - kynikos
 */

// PHI constants for natural proportions
const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;

/**
 * Octree node for Barnes-Hut approximation
 */
class OctreeNode {
  constructor(x, y, z, size) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.size = size;

    // Accumulated mass and center of mass
    this.mass = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.centerZ = 0;

    // Children (8 octants)
    this.children = null;

    // Leaf data
    this.node = null;
  }

  /**
   * Insert a node into the octree
   */
  insert(node, mass = 1) {
    // Empty leaf -> store node
    if (this.mass === 0 && !this.children) {
      this.node = node;
      this.mass = mass;
      this.centerX = node.position.x;
      this.centerY = node.position.y;
      this.centerZ = node.position.z;
      return;
    }

    // If this is a leaf with a node, subdivide
    if (!this.children && this.node) {
      this._subdivide();
      this._insertIntoChild(this.node, this.mass);
      this.node = null;
    }

    // Insert into appropriate child
    if (this.children) {
      this._insertIntoChild(node, mass);
    }

    // Update center of mass
    const totalMass = this.mass + mass;
    this.centerX = (this.centerX * this.mass + node.position.x * mass) / totalMass;
    this.centerY = (this.centerY * this.mass + node.position.y * mass) / totalMass;
    this.centerZ = (this.centerZ * this.mass + node.position.z * mass) / totalMass;
    this.mass = totalMass;
  }

  /**
   * Subdivide into 8 octants
   */
  _subdivide() {
    const halfSize = this.size / 2;
    const offsets = [
      [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
      [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
    ];

    this.children = offsets.map(([ox, oy, oz]) => new OctreeNode(
      this.x + ox * halfSize,
      this.y + oy * halfSize,
      this.z + oz * halfSize,
      halfSize
    ));
  }

  /**
   * Get child index for a position
   */
  _getChildIndex(x, y, z) {
    const midX = this.x + this.size / 2;
    const midY = this.y + this.size / 2;
    const midZ = this.z + this.size / 2;

    return (x >= midX ? 1 : 0) +
           (y >= midY ? 2 : 0) +
           (z >= midZ ? 4 : 0);
  }

  /**
   * Insert node into appropriate child
   */
  _insertIntoChild(node, mass) {
    const idx = this._getChildIndex(
      node.position.x,
      node.position.y,
      node.position.z
    );
    this.children[idx].insert(node, mass);
  }

  /**
   * Calculate force on a node using Barnes-Hut approximation
   * @param {Object} node - Target node
   * @param {number} theta - Barnes-Hut threshold (0.5-1.0, higher = faster but less accurate)
   * @param {Object} force - Force accumulator { x, y, z }
   * @param {number} repulsion - Repulsion strength
   */
  calculateForce(node, theta, force, repulsion) {
    if (this.mass === 0) return;

    const dx = this.centerX - node.position.x;
    const dy = this.centerY - node.position.y;
    const dz = this.centerZ - node.position.z;
    const distSq = dx * dx + dy * dy + dz * dz + 0.01; // Softening
    const dist = Math.sqrt(distSq);

    // If this is a leaf or far enough away, use approximation
    if (!this.children || (this.size / dist < theta)) {
      // Repulsion force: F = -k / r^2
      const strength = -repulsion * this.mass / distSq;
      force.x += dx * strength / dist;
      force.y += dy * strength / dist;
      force.z += dz * strength / dist;
    } else {
      // Recurse into children
      for (const child of this.children) {
        child.calculateForce(node, theta, force, repulsion);
      }
    }
  }
}

/**
 * Force-Directed Layout Simulation
 */
export class ForceSimulation {
  constructor(options = {}) {
    // Configuration with PHI-based defaults
    this.config = {
      // Repulsion between all nodes
      repulsion: options.repulsion ?? 500,

      // Attraction along edges (spring constant)
      attraction: options.attraction ?? 0.01,

      // Ideal edge length
      edgeLength: options.edgeLength ?? 2 * PHI,

      // Centering force (pulls nodes toward origin)
      centering: options.centering ?? 0.005,

      // Damping (velocity decay)
      damping: options.damping ?? 0.9,

      // Velocity limit
      maxVelocity: options.maxVelocity ?? 2,

      // Barnes-Hut theta (approximation threshold)
      theta: options.theta ?? 0.8,

      // Z-layering force (keeps types at their layers)
      layerForce: options.layerForce ?? 0.1,

      // Target Y positions for layers
      layers: options.layers ?? {
        block: -3,
        judgment: 0,
        pattern: 3,
        session: 1.5,
      },

      // Alpha (simulation temperature)
      alphaMin: options.alphaMin ?? 0.001,
      alphaDecay: options.alphaDecay ?? 0.0228, // ~300 iterations to cool

      ...options,
    };

    // State
    this.nodes = [];
    this.edges = [];
    this.alpha = 1; // Current temperature
    this.running = false;

    // Animation frame
    this._animationFrame = null;

    // Callbacks
    this.onTick = null;
    this.onEnd = null;
  }

  /**
   * Set nodes to simulate
   */
  setNodes(nodes) {
    this.nodes = nodes;
    return this;
  }

  /**
   * Set edges for attraction
   */
  setEdges(edges) {
    this.edges = edges;
    return this;
  }

  /**
   * Start the simulation
   */
  start() {
    if (this.running) return this;

    this.running = true;
    this.alpha = 1;
    this._tick();
    return this;
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.running = false;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    return this;
  }

  /**
   * Restart with new alpha
   */
  restart() {
    this.alpha = 1;
    if (!this.running) {
      this.start();
    }
    return this;
  }

  /**
   * Run one tick of the simulation
   */
  tick() {
    if (this.nodes.length === 0) return;

    // Build octree for Barnes-Hut
    const octree = this._buildOctree();

    // Calculate forces for each node
    for (const node of this.nodes) {
      if (node.fixed) continue;

      const force = { x: 0, y: 0, z: 0 };

      // 1. Repulsion (via Barnes-Hut)
      octree.calculateForce(node, this.config.theta, force, this.config.repulsion);

      // 2. Centering force
      force.x -= node.position.x * this.config.centering;
      force.y -= node.position.y * this.config.centering;
      force.z -= node.position.z * this.config.centering;

      // 3. Layer force (Y-axis)
      const targetY = this.config.layers[node.type] ?? 0;
      force.y += (targetY - node.position.y) * this.config.layerForce;

      // Apply force to velocity (scaled by alpha)
      node.velocity.x += force.x * this.alpha;
      node.velocity.y += force.y * this.alpha;
      node.velocity.z += force.z * this.alpha;
    }

    // 4. Attraction along edges
    for (const edge of this.edges) {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;
      const dz = targetNode.position.z - sourceNode.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

      // Spring force: F = k * (dist - idealLength)
      const displacement = dist - this.config.edgeLength;
      const strength = this.config.attraction * displacement * this.alpha;

      const fx = (dx / dist) * strength;
      const fy = (dy / dist) * strength;
      const fz = (dz / dist) * strength;

      if (!sourceNode.fixed) {
        sourceNode.velocity.x += fx;
        sourceNode.velocity.y += fy;
        sourceNode.velocity.z += fz;
      }
      if (!targetNode.fixed) {
        targetNode.velocity.x -= fx;
        targetNode.velocity.y -= fy;
        targetNode.velocity.z -= fz;
      }
    }

    // Apply velocities and damping
    for (const node of this.nodes) {
      if (node.fixed) continue;

      // Limit velocity
      const speed = Math.sqrt(
        node.velocity.x ** 2 +
        node.velocity.y ** 2 +
        node.velocity.z ** 2
      );
      if (speed > this.config.maxVelocity) {
        const scale = this.config.maxVelocity / speed;
        node.velocity.x *= scale;
        node.velocity.y *= scale;
        node.velocity.z *= scale;
      }

      // Update position
      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;
      node.position.z += node.velocity.z;

      // Apply damping
      node.velocity.x *= this.config.damping;
      node.velocity.y *= this.config.damping;
      node.velocity.z *= this.config.damping;
    }

    // Decay alpha
    this.alpha = Math.max(this.alpha - this.config.alphaDecay * this.alpha, this.config.alphaMin);

    return this;
  }

  /**
   * Internal tick loop
   */
  _tick() {
    if (!this.running) return;

    this.tick();

    // Emit tick event
    if (this.onTick) {
      this.onTick(this.alpha);
    }

    // Check if simulation has cooled
    if (this.alpha <= this.config.alphaMin) {
      this.running = false;
      if (this.onEnd) {
        this.onEnd();
      }
      return;
    }

    // Schedule next tick
    this._animationFrame = requestAnimationFrame(() => this._tick());
  }

  /**
   * Build octree for Barnes-Hut
   */
  _buildOctree() {
    // Find bounding box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const node of this.nodes) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      minZ = Math.min(minZ, node.position.z);
      maxX = Math.max(maxX, node.position.x);
      maxY = Math.max(maxY, node.position.y);
      maxZ = Math.max(maxZ, node.position.z);
    }

    // Compute size (cube)
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) + 1;

    // Create root
    const root = new OctreeNode(minX - 0.5, minY - 0.5, minZ - 0.5, size + 1);

    // Insert all nodes
    for (const node of this.nodes) {
      root.insert(node, 1);
    }

    return root;
  }

  /**
   * Heat up the simulation (useful when adding nodes)
   */
  heat(amount = 0.3) {
    this.alpha = Math.min(1, this.alpha + amount);
    if (!this.running) {
      this.start();
    }
    return this;
  }

  /**
   * Fix a node in place
   */
  fix(nodeId, x, y, z) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.fixed = true;
      if (x !== undefined) node.position.x = x;
      if (y !== undefined) node.position.y = y;
      if (z !== undefined) node.position.z = z;
    }
    return this;
  }

  /**
   * Unfix a node
   */
  unfix(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.fixed = false;
    }
    return this;
  }

  /**
   * Get current alpha (temperature)
   */
  getAlpha() {
    return this.alpha;
  }

  /**
   * Check if simulation is running
   */
  isRunning() {
    return this.running;
  }
}

// Export singleton for convenience
export const forceSimulation = new ForceSimulation();

// Export to window
window.CYNICForceSimulation = ForceSimulation;
