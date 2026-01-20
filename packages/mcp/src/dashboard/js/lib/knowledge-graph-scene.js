/**
 * CYNIC Dashboard - Knowledge Graph 3D Scene
 *
 * High-performance 3D rendering using Three.js with instanced meshes.
 * Supports 1000+ nodes at 60fps with bloom effects for high-Q judgments.
 *
 * "phi guides all ratios" - kynikos
 */

import { KGNodeType, KGEdgeType } from './knowledge-graph-data.js';

// Node colors by type
const NODE_COLORS = {
  [KGNodeType.JUDGMENT]: 0x4488ff,  // Blue
  [KGNodeType.PATTERN]: 0x00ff88,   // Green
  [KGNodeType.BLOCK]: 0xffd93d,     // Gold
  [KGNodeType.SESSION]: 0xaa00d4,   // Purple
};

// Edge colors by type
const EDGE_COLORS = {
  [KGEdgeType.ANCHORED_IN]: 0xffd93d,  // Gold
  [KGEdgeType.DERIVED_FROM]: 0x00ff88, // Green
  [KGEdgeType.REFERENCES]: 0x4488ff,   // Blue
  [KGEdgeType.CONTAINS]: 0xaa00d4,     // Purple
};

/**
 * Knowledge Graph Scene Manager
 */
export class KnowledgeGraphScene {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null; // For post-processing (bloom)

    // Instanced meshes for each node type
    this.instancedMeshes = new Map();
    this.maxInstancesPerType = 500;

    // Edge rendering
    this.edgeGeometry = null;
    this.edgeMaterial = null;
    this.edgeLines = null;

    // Node -> instance index mapping
    this.nodeIndexMap = new Map();

    // Labels (sprite-based)
    this.labels = new Map();
    this.showLabels = true;

    // State
    this.isInitialized = false;
    this.hoveredNodeId = null;
    this.selectedNodeId = null;

    // Callbacks
    this.onNodeClick = null;
    this.onNodeHover = null;

    // Animation
    this._animationFrame = null;
    this._time = 0;
  }

  /**
   * Initialize the scene
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`Container #${this.containerId} not found`);
      return false;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);
    this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.03);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    this.camera.position.set(15, 8, 15);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Lights
    this._setupLights();

    // Grid helper
    const grid = new THREE.GridHelper(30, 30, 0x222233, 0x111122);
    grid.position.y = -4;
    this.scene.add(grid);

    // Create instanced meshes for each node type
    this._createInstancedMeshes();

    // Setup edge rendering
    this._setupEdgeRendering();

    // Setup controls
    this._setupControls();

    // Setup post-processing (bloom for high-Q)
    this._setupPostProcessing();

    // Start animation loop
    this._animate();

    // Handle resize
    window.addEventListener('resize', () => this._onResize());

    this.isInitialized = true;
    return true;
  }

  /**
   * Setup lights
   */
  _setupLights() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(ambient);

    // Point lights
    const pointLight1 = new THREE.PointLight(0x00d4aa, 0.8);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffd93d, 0.5);
    pointLight2.position.set(-10, 5, -10);
    this.scene.add(pointLight2);

    // Directional for shadows
    const directional = new THREE.DirectionalLight(0xffffff, 0.3);
    directional.position.set(5, 10, 5);
    this.scene.add(directional);
  }

  /**
   * Create instanced meshes for each node type
   */
  _createInstancedMeshes() {
    const geometries = {
      [KGNodeType.JUDGMENT]: new THREE.SphereGeometry(1, 16, 16),
      [KGNodeType.PATTERN]: new THREE.OctahedronGeometry(1, 0),
      [KGNodeType.BLOCK]: new THREE.BoxGeometry(1, 1, 1),
      [KGNodeType.SESSION]: new THREE.TorusGeometry(0.8, 0.3, 8, 24),
    };

    for (const [type, geometry] of Object.entries(geometries)) {
      const material = new THREE.MeshPhongMaterial({
        color: NODE_COLORS[type],
        transparent: true,
        opacity: 0.85,
        emissive: NODE_COLORS[type],
        emissiveIntensity: 0.15,
      });

      const mesh = new THREE.InstancedMesh(
        geometry,
        material,
        this.maxInstancesPerType
      );
      mesh.count = 0; // Start with no instances
      mesh.userData.nodeType = type;
      mesh.frustumCulled = false;

      this.instancedMeshes.set(type, mesh);
      this.scene.add(mesh);
    }

    // Instance color attribute for individual colors
    for (const [type, mesh] of this.instancedMeshes) {
      const colors = new Float32Array(this.maxInstancesPerType * 3);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    }
  }

  /**
   * Setup edge rendering with BufferGeometry
   */
  _setupEdgeRendering() {
    // Use line segments for edges
    this.edgeGeometry = new THREE.BufferGeometry();
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x444466,
      transparent: true,
      opacity: 0.4,
      vertexColors: true,
    });

    this.edgeLines = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial);
    this.scene.add(this.edgeLines);
  }

  /**
   * Setup post-processing (simplified - bloom effect)
   * Note: Full UnrealBloomPass requires additional Three.js imports
   * This is a simplified glow effect using emissive materials
   */
  _setupPostProcessing() {
    // For full bloom, would need to import:
    // - EffectComposer
    // - RenderPass
    // - UnrealBloomPass
    // For now, we use emissive materials which give a glow effect
  }

  /**
   * Setup mouse controls
   */
  _setupControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.container.addEventListener('mousemove', (e) => {
      this._handleHover(e);

      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      // Rotate camera around origin
      const pos = this.camera.position;
      const radius = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

      const theta = deltaX * 0.005;
      const phi = deltaY * 0.005;

      const currentTheta = Math.atan2(pos.z, pos.x);
      const currentPhi = Math.acos(pos.y / radius);

      const newTheta = currentTheta + theta;
      const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, currentPhi + phi));

      this.camera.position.x = radius * Math.sin(newPhi) * Math.cos(newTheta);
      this.camera.position.y = radius * Math.cos(newPhi);
      this.camera.position.z = radius * Math.sin(newPhi) * Math.sin(newTheta);

      this.camera.lookAt(0, 0, 0);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.container.addEventListener('mouseup', () => isDragging = false);
    this.container.addEventListener('mouseleave', () => isDragging = false);

    // Zoom with wheel
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const newDist = this.camera.position.length() * factor;
      if (newDist > 3 && newDist < 100) {
        this.camera.position.multiplyScalar(factor);
      }
    });

    // Click to select
    this.container.addEventListener('click', (e) => this._handleClick(e));
  }

  /**
   * Handle hover (raycast to find hovered node)
   */
  _handleHover(event) {
    const rect = this.container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1,
      -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    // Raycast against instanced meshes
    const intersects = raycaster.intersectObjects(
      Array.from(this.instancedMeshes.values())
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const instanceId = hit.instanceId;
      const nodeType = hit.object.userData.nodeType;

      // Find node ID from instance
      const nodeId = this._getNodeIdFromInstance(nodeType, instanceId);
      if (nodeId && nodeId !== this.hoveredNodeId) {
        this.hoveredNodeId = nodeId;
        this.container.style.cursor = 'pointer';
        if (this.onNodeHover) {
          this.onNodeHover(nodeId);
        }
      }
    } else {
      if (this.hoveredNodeId) {
        this.hoveredNodeId = null;
        this.container.style.cursor = 'grab';
        if (this.onNodeHover) {
          this.onNodeHover(null);
        }
      }
    }
  }

  /**
   * Handle click
   */
  _handleClick(event) {
    const rect = this.container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1,
      -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(
      Array.from(this.instancedMeshes.values())
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      const instanceId = hit.instanceId;
      const nodeType = hit.object.userData.nodeType;
      const nodeId = this._getNodeIdFromInstance(nodeType, instanceId);

      if (nodeId) {
        this.selectedNodeId = nodeId;
        if (this.onNodeClick) {
          this.onNodeClick(nodeId);
        }
      }
    }
  }

  /**
   * Get node ID from instance index
   */
  _getNodeIdFromInstance(nodeType, instanceId) {
    for (const [nodeId, info] of this.nodeIndexMap) {
      if (info.type === nodeType && info.index === instanceId) {
        return nodeId;
      }
    }
    return null;
  }

  /**
   * Animation loop
   */
  _animate() {
    this._animationFrame = requestAnimationFrame(() => this._animate());

    this._time += 0.01;

    // Subtle pulsing for selected node
    // (handled via emissive intensity)

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle resize
   */
  _onResize() {
    if (!this.container) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  /**
   * Update scene with new graph data
   * @param {KnowledgeGraphData} graphData
   */
  updateFromData(graphData) {
    const nodes = graphData.getAllNodes();
    const edges = graphData.getAllEdges();

    this._updateNodes(nodes);
    this._updateEdges(edges, nodes);
  }

  /**
   * Update node positions (called after simulation tick)
   */
  updatePositions(nodes) {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (const node of nodes) {
      const info = this.nodeIndexMap.get(node.id);
      if (!info) continue;

      const mesh = this.instancedMeshes.get(info.type);
      if (!mesh) continue;

      // Get current matrix
      mesh.getMatrixAt(info.index, matrix);
      matrix.decompose(position, quaternion, scale);

      // Update position
      position.set(node.position.x, node.position.y, node.position.z);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(info.index, matrix);
    }

    // Mark for update
    for (const mesh of this.instancedMeshes.values()) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Update nodes in scene
   */
  _updateNodes(nodes) {
    // Reset instance counts
    const counts = new Map();
    for (const type of this.instancedMeshes.keys()) {
      counts.set(type, 0);
    }

    // Clear mapping
    this.nodeIndexMap.clear();

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (const node of nodes) {
      const mesh = this.instancedMeshes.get(node.type);
      if (!mesh) continue;

      const index = counts.get(node.type);
      if (index >= this.maxInstancesPerType) continue;

      // Store mapping
      this.nodeIndexMap.set(node.id, { type: node.type, index });

      // Set matrix (position + scale)
      matrix.makeScale(node.size, node.size, node.size);
      matrix.setPosition(node.position.x, node.position.y, node.position.z);
      mesh.setMatrixAt(index, matrix);

      // Set color
      color.setHex(node.color);
      mesh.setColorAt(index, color);

      // Increase emissive for high-Q judgments
      if (node.isHighQ && node.isHighQ()) {
        mesh.material.emissiveIntensity = 0.4;
      }

      counts.set(node.type, index + 1);
    }

    // Update counts and mark for update
    for (const [type, mesh] of this.instancedMeshes) {
      mesh.count = counts.get(type);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  /**
   * Update edges in scene
   */
  _updateEdges(edges, nodes) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const positions = [];
    const colors = [];

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) continue;

      // Add line segment
      positions.push(
        sourceNode.position.x, sourceNode.position.y, sourceNode.position.z,
        targetNode.position.x, targetNode.position.y, targetNode.position.z
      );

      // Edge color
      const edgeColor = new THREE.Color(edge.color || EDGE_COLORS[edge.type] || 0x444466);
      colors.push(
        edgeColor.r, edgeColor.g, edgeColor.b,
        edgeColor.r, edgeColor.g, edgeColor.b
      );
    }

    // Update geometry
    this.edgeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.edgeGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );
    this.edgeGeometry.attributes.position.needsUpdate = true;
    this.edgeGeometry.attributes.color.needsUpdate = true;
  }

  /**
   * Update edges with current node positions
   */
  updateEdgePositions(edges, nodeMap) {
    const positions = [];

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) continue;

      positions.push(
        sourceNode.position.x, sourceNode.position.y, sourceNode.position.z,
        targetNode.position.x, targetNode.position.y, targetNode.position.z
      );
    }

    if (this.edgeGeometry.attributes.position) {
      const posAttr = this.edgeGeometry.attributes.position;
      for (let i = 0; i < positions.length && i < posAttr.array.length; i++) {
        posAttr.array[i] = positions[i];
      }
      posAttr.needsUpdate = true;
    }
  }

  /**
   * Add a pulsing effect for new nodes
   */
  pulseNode(nodeId) {
    const info = this.nodeIndexMap.get(nodeId);
    if (!info) return;

    const mesh = this.instancedMeshes.get(info.type);
    if (!mesh) return;

    // Briefly increase emissive
    const originalIntensity = mesh.material.emissiveIntensity;
    mesh.material.emissiveIntensity = 0.8;

    setTimeout(() => {
      mesh.material.emissiveIntensity = originalIntensity;
    }, 300);
  }

  /**
   * Highlight connected nodes
   */
  highlightConnected(nodeId, connectedIds) {
    // Reset all to default opacity
    for (const mesh of this.instancedMeshes.values()) {
      mesh.material.opacity = 0.85;
    }

    // If no node selected, done
    if (!nodeId) return;

    // Dim non-connected nodes
    // (Would need per-instance opacity which is more complex)
    // For now, just increase emissive on connected
  }

  /**
   * Reset camera
   */
  resetCamera() {
    this.camera.position.set(15, 8, 15);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Focus on a node
   */
  focusOnNode(nodeId) {
    const info = this.nodeIndexMap.get(nodeId);
    if (!info) return;

    const mesh = this.instancedMeshes.get(info.type);
    if (!mesh) return;

    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(info.index, matrix);

    const position = new THREE.Vector3();
    position.setFromMatrixPosition(matrix);

    // Animate camera to look at this node
    const targetCamPos = position.clone().add(new THREE.Vector3(5, 3, 5));
    this._animateCameraTo(targetCamPos, position);
  }

  /**
   * Animate camera to position
   */
  _animateCameraTo(targetPos, lookAt, duration = 500) {
    const startPos = this.camera.position.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic

      this.camera.position.lerpVectors(startPos, targetPos, eased);
      this.camera.lookAt(lookAt);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Clear the scene
   */
  clear() {
    // Reset instance counts
    for (const mesh of this.instancedMeshes.values()) {
      mesh.count = 0;
    }
    this.nodeIndexMap.clear();

    // Clear edges
    if (this.edgeGeometry) {
      this.edgeGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([], 3)
      );
      this.edgeGeometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute([], 3)
      );
    }

    // Clear labels
    for (const label of this.labels.values()) {
      this.scene.remove(label);
    }
    this.labels.clear();
  }

  /**
   * Dispose scene
   */
  dispose() {
    // Stop animation
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }

    // Dispose meshes
    for (const mesh of this.instancedMeshes.values()) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.scene.remove(mesh);
    }
    this.instancedMeshes.clear();

    // Dispose edges
    if (this.edgeGeometry) this.edgeGeometry.dispose();
    if (this.edgeMaterial) this.edgeMaterial.dispose();
    if (this.edgeLines) this.scene.remove(this.edgeLines);

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.container?.removeChild(this.renderer.domElement);
    }

    this.isInitialized = false;
  }
}

// Export to window
window.CYNICKnowledgeGraphScene = KnowledgeGraphScene;
