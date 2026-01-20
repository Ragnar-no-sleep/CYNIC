/**
 * CYNIC Dashboard - Three.js Scene Manager
 * 3D visualization for Architecture mode
 */

// PHI for proportions
const PHI = 1.618033988749895;

export class ThreeScene {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.objects = [];
    this.labels = [];
    this.connections = [];

    // State
    this.isInitialized = false;
    this.selectedObject = null;

    // Event flow particles
    this.eventParticles = [];
    this.nodePositions = {};  // sefirot name -> position
    this.nodeMeshes = {};     // sefirot name -> mesh
    this.nodeStats = {};      // sefirot name -> { events, patterns, warnings }

    // Event callbacks
    this.onObjectClick = null;
    this.onObjectHover = null;
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

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(5, 3, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x222233, 0x111122);
    this.scene.add(gridHelper);

    // Setup controls
    this._setupControls();

    // Start animation
    this._animate();

    // Handle resize
    window.addEventListener('resize', () => this._onResize());

    this.isInitialized = true;
    return true;
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
      // Raycast for hover
      this._handleHover(e);

      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      // Rotate camera around origin
      const theta = deltaX * 0.01;
      const phi = deltaY * 0.01;

      const pos = this.camera.position;
      const radius = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

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
      this.camera.position.multiplyScalar(factor);
    });

    // Click to select
    this.container.addEventListener('click', (e) => this._handleClick(e));

    // Double-click to navigate
    this.container.addEventListener('dblclick', (e) => this._handleDoubleClick(e));
  }

  /**
   * Handle hover
   */
  _handleHover(event) {
    const intersects = this._raycast(event);

    if (intersects.length > 0) {
      this.container.style.cursor = 'pointer';
      if (this.onObjectHover) {
        this.onObjectHover(intersects[0].object.userData);
      }
    } else {
      this.container.style.cursor = 'grab';
      if (this.onObjectHover) {
        this.onObjectHover(null);
      }
    }
  }

  /**
   * Handle click
   */
  _handleClick(event) {
    const intersects = this._raycast(event);

    if (intersects.length > 0) {
      const selected = intersects[0].object;
      this.selectObject(selected);

      if (this.onObjectClick) {
        this.onObjectClick(selected.userData);
      }
    }
  }

  /**
   * Handle double-click (navigate into)
   */
  _handleDoubleClick(event) {
    const intersects = this._raycast(event);

    if (intersects.length > 0) {
      const selected = intersects[0].object;

      if (this.onNavigateInto) {
        this.onNavigateInto(selected.userData);
      }
    }
  }

  /**
   * Raycast from mouse position
   */
  _raycast(event) {
    const rect = this.container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1,
      -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    return raycaster.intersectObjects(this.objects);
  }

  /**
   * Animation loop
   */
  _animate() {
    requestAnimationFrame(() => this._animate());

    // Rotate objects slowly
    this.objects.forEach(obj => {
      if (obj.userData?.rotate !== false) {
        obj.rotation.x += 0.002;
        obj.rotation.y += 0.003;
      }
    });

    // Animate event particles
    this._updateEventParticles();

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update event flow particles
   */
  _updateEventParticles() {
    const toRemove = [];

    for (let i = 0; i < this.eventParticles.length; i++) {
      const particle = this.eventParticles[i];
      particle.progress += particle.speed;

      if (particle.progress >= 1) {
        // Particle reached destination - trigger arrival effect
        this._onParticleArrived(particle);
        toRemove.push(i);
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
      } else {
        // Update position along path
        const t = particle.progress;
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // Ease in-out quad

        particle.mesh.position.lerpVectors(particle.from, particle.to, eased);

        // Add arc motion (parabola)
        const arcHeight = 0.5 * (1 - Math.pow(2 * t - 1, 2));
        particle.mesh.position.y += arcHeight;

        // Scale pulsing
        const pulse = 1 + 0.2 * Math.sin(t * Math.PI * 4);
        particle.mesh.scale.setScalar(pulse);

        // Fade out near end
        if (t > 0.8) {
          particle.mesh.material.opacity = (1 - t) * 5;
        }
      }
    }

    // Remove completed particles (reverse order)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.eventParticles.splice(toRemove[i], 1);
    }
  }

  /**
   * Particle arrival effect
   */
  _onParticleArrived(particle) {
    const targetMesh = this.nodeMeshes[particle.targetSefirot];
    if (targetMesh && targetMesh.material) {
      // Pulse the target node
      const originalEmissive = targetMesh.material.emissiveIntensity;
      targetMesh.material.emissiveIntensity = 0.8;
      setTimeout(() => {
        targetMesh.material.emissiveIntensity = originalEmissive;
      }, 200);
    }
  }

  /**
   * Trigger event flow between two Sefirot nodes
   * @param {string} fromSefirot - Source Sefirot name
   * @param {string} toSefirot - Target Sefirot name
   * @param {string} type - Event type (judgment, pattern, block, warning)
   */
  triggerEventFlow(fromSefirot, toSefirot, type = 'event') {
    const fromPos = this.nodePositions[fromSefirot];
    const toPos = this.nodePositions[toSefirot];

    if (!fromPos || !toPos) return;

    // Event colors by type
    const colors = {
      judgment: 0x4ecdc4,  // Teal
      pattern: 0xf093fb,   // Pink
      block: 0xffd93d,     // Gold
      warning: 0xff6b6b,   // Red
      event: 0x00ff88,     // Green
    };

    const color = colors[type] || colors.event;

    // Create particle
    const geometry = new THREE.SphereGeometry(0.08, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z));

    this.scene.add(mesh);

    this.eventParticles.push({
      mesh,
      from: new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z),
      to: new THREE.Vector3(toPos.x, toPos.y, toPos.z),
      progress: 0,
      speed: 0.02 + Math.random() * 0.01, // Variable speed
      type,
      targetSefirot: toSefirot,
    });
  }

  /**
   * Update node health state (active/busy/warning)
   * @param {string} sefirot - Sefirot name
   * @param {string} state - 'active', 'busy', 'warning', 'inactive'
   */
  updateNodeState(sefirot, state) {
    const mesh = this.nodeMeshes[sefirot];
    if (!mesh || !mesh.material) return;

    const stateColors = {
      active: mesh.userData.originalColor || 0x4ecdc4,
      busy: 0xffd93d,     // Gold (processing)
      warning: 0xff6b6b,  // Red
      inactive: 0x444444, // Gray
    };

    mesh.material.color.setHex(stateColors[state] || stateColors.active);
    mesh.material.emissive.setHex(stateColors[state] || stateColors.active);
    mesh.material.emissiveIntensity = state === 'busy' ? 0.4 : 0.1;
  }

  /**
   * Update node stats badge
   * @param {string} sefirot - Sefirot name
   * @param {object} stats - { events, patterns, warnings }
   */
  updateNodeStats(sefirot, stats) {
    this.nodeStats[sefirot] = stats;
    // Stats display handled by UI overlay
  }

  /**
   * Get node stats for display
   */
  getNodeStats() {
    return this.nodeStats;
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

  /**
   * Select an object
   */
  selectObject(object) {
    // Reset all
    this.objects.forEach(obj => {
      obj.scale.set(1, 1, 1);
      if (obj.material) {
        obj.material.emissiveIntensity = 0.1;
      }
    });

    // Highlight selected
    if (object) {
      this.selectedObject = object;
      object.scale.set(1.3, 1.3, 1.3);
      if (object.material) {
        object.material.emissiveIntensity = 0.4;
      }
    }
  }

  /**
   * Clear all objects
   */
  clear() {
    // Remove objects
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.objects = [];

    // Remove labels
    this.labels.forEach(label => {
      this.scene.remove(label);
      if (label.material?.map) label.material.map.dispose();
      if (label.material) label.material.dispose();
    });
    this.labels = [];

    // Remove connections
    this.connections.forEach(conn => {
      this.scene.remove(conn);
      if (conn.geometry) conn.geometry.dispose();
      if (conn.material) conn.material.dispose();
    });
    this.connections = [];

    // Remove event particles
    this.eventParticles.forEach(p => {
      this.scene.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
    });
    this.eventParticles = [];
  }

  /**
   * Add a sphere node
   */
  addSphere(position, color, data, size = 0.5) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      emissive: color,
      emissiveIntensity: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData = data;

    this.objects.push(mesh);
    this.scene.add(mesh);

    return mesh;
  }

  /**
   * Add a box node
   */
  addBox(position, color, data, size = 0.4) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData = data;

    this.objects.push(mesh);
    this.scene.add(mesh);

    return mesh;
  }

  /**
   * Add a dodecahedron node
   */
  addDodecahedron(position, color, data, size = 0.35) {
    const geometry = new THREE.DodecahedronGeometry(size, 0);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.85,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData = data;

    this.objects.push(mesh);
    this.scene.add(mesh);

    return mesh;
  }

  /**
   * Add a tetrahedron node
   */
  addTetrahedron(position, color, data, size = 0.25) {
    const geometry = new THREE.TetrahedronGeometry(size, 0);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.85,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData = data;

    this.objects.push(mesh);
    this.scene.add(mesh);

    return mesh;
  }

  /**
   * Add a text label
   */
  addLabel(text, position, color = 0xffffff, scale = 1) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    context.font = '24px JetBrains Mono, monospace';
    context.fillStyle = '#' + (typeof color === 'number' ? color.toString(16).padStart(6, '0') : 'ffffff');
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text.slice(0, 20), canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.position.copy(position);
    sprite.position.y -= 0.5;
    sprite.scale.set(scale * 1.5, scale * 0.4, 1);

    this.labels.push(sprite);
    this.scene.add(sprite);

    return sprite;
  }

  /**
   * Add connection line between two points
   */
  addConnection(from, to, color = 0x2a2a3a) {
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
    });

    const points = [from, to];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);

    this.connections.push(line);
    this.scene.add(line);

    return line;
  }

  /**
   * Animate camera to position
   */
  animateCameraTo(targetPos, lookAt, duration = 500) {
    const startPos = this.camera.position.clone();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic

      this.camera.position.lerpVectors(startPos, new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), eased);
      this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Load Sefirot tree (11 Dogs)
   * @param {Array} dogs - Array of dog data from Formulas.DOGS
   */
  loadSefirotTree(dogs) {
    this.clear();
    this.nodePositions = {};
    this.nodeMeshes = {};
    this.nodeStats = {};

    if (!dogs || dogs.length === 0) return;

    // Sefirot colors
    const colors = {
      Keter: 0x4ecdc4,     // Crown - teal
      Chochmah: 0x667eea,  // Wisdom - purple-blue
      Binah: 0x764ba2,     // Understanding - purple
      Daat: 0xf093fb,      // Knowledge - pink
      Chesed: 0x00d9ff,    // Mercy - cyan
      Gevurah: 0xff6b6b,   // Severity - red
      Tiferet: 0xffd93d,   // Beauty - gold
      Netzach: 0x00ff88,   // Victory - green
      Hod: 0xff8c00,       // Glory - orange
      Yesod: 0x8888ff,     // Foundation - light purple
      Malkhut: 0x88ff88,   // Kingdom - light green
    };

    // Sefirot positions in 3D space (tree structure)
    const positions = {
      Keter: { x: 0, y: 4, z: 0 },       // Top
      Chochmah: { x: -2, y: 3, z: 0 },   // Upper left
      Binah: { x: 2, y: 3, z: 0 },       // Upper right
      Daat: { x: 0, y: 2.5, z: 1 },      // Center (knowledge)
      Chesed: { x: -2, y: 1.5, z: 0 },   // Middle left
      Gevurah: { x: 2, y: 1.5, z: 0 },   // Middle right
      Tiferet: { x: 0, y: 1, z: 0 },     // Center
      Netzach: { x: -2, y: -0.5, z: 0 }, // Lower left
      Hod: { x: 2, y: -0.5, z: 0 },      // Lower right
      Yesod: { x: 0, y: -1.5, z: 0 },    // Foundation
      Malkhut: { x: 0, y: -3, z: 0 },    // Bottom (Kingdom)
    };

    // Store positions for event flow
    this.nodePositions = { ...positions };

    // Create nodes for each dog
    for (const dog of dogs) {
      const pos = positions[dog.sefirot] || { x: 0, y: 0, z: 0 };
      const color = colors[dog.sefirot] || 0xffffff;

      // Add sphere for the dog
      const mesh = this.addSphere(pos, color, {
        name: dog.name,
        type: 'dog',
        sefirot: dog.sefirot,
        role: dog.role,
        originalColor: color,
      }, dog.name === 'CYNIC' ? 0.7 : 0.4);

      // Store mesh reference for state updates
      this.nodeMeshes[dog.sefirot] = mesh;

      // Initialize stats
      this.nodeStats[dog.sefirot] = { events: 0, patterns: 0, warnings: 0 };

      // Add label below
      this.addLabel(dog.name, new THREE.Vector3(pos.x, pos.y - 0.6, pos.z), color);
    }

    // Sefirot tree connections (paths of the Tree of Life)
    const connections = [
      // Upper triad
      ['Keter', 'Chochmah'], ['Keter', 'Binah'],
      ['Chochmah', 'Binah'],
      // Knowledge bridge
      ['Chochmah', 'Daat'], ['Binah', 'Daat'],
      // Middle pillars
      ['Chochmah', 'Chesed'], ['Binah', 'Gevurah'],
      ['Chesed', 'Gevurah'],
      // Central column
      ['Chesed', 'Tiferet'], ['Gevurah', 'Tiferet'],
      ['Daat', 'Tiferet'],
      // Lower connections
      ['Tiferet', 'Netzach'], ['Tiferet', 'Hod'],
      ['Netzach', 'Hod'],
      ['Netzach', 'Yesod'], ['Hod', 'Yesod'],
      // Foundation to Kingdom
      ['Yesod', 'Malkhut'],
    ];

    for (const [from, to] of connections) {
      const fromPos = positions[from];
      const toPos = positions[to];
      if (fromPos && toPos) {
        this.addConnection(
          new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z),
          new THREE.Vector3(toPos.x, toPos.y, toPos.z),
          0x333355
        );
      }
    }

    // Reset camera to see the tree
    this.camera.position.set(6, 2, 8);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Load codebase tree
   * @param {Object} data - Codebase tree data
   */
  loadCodebaseTree(data) {
    this.clear();

    if (!data) return;

    const colors = {
      package: 0x4ecdc4,
      module: 0x667eea,
      class: 0xf093fb,
      function: 0xffd93d,
    };

    // Layout nodes in a grid
    this._layoutCodebaseNode(data, 0, 0, 0);

    // Reset camera
    this.camera.position.set(5, 5, 8);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Layout codebase node recursively
   */
  _layoutCodebaseNode(node, x, y, z, parentPos = null) {
    const colors = {
      package: 0x4ecdc4,
      module: 0x667eea,
      class: 0xf093fb,
      function: 0xffd93d,
    };

    const color = colors[node.type] || 0xaaaaaa;
    const pos = { x, y, z };

    this.addBox(pos, color, {
      name: node.name,
      type: node.type,
      path: node.path,
    }, node.type === 'package' ? 0.5 : 0.3);

    this.addLabel(node.name, new THREE.Vector3(x, y - 0.5, z), color, 0.8);

    // Connect to parent
    if (parentPos) {
      this.addConnection(
        new THREE.Vector3(parentPos.x, parentPos.y, parentPos.z),
        new THREE.Vector3(x, y, z),
        0x333355
      );
    }

    // Layout children
    if (node.children && node.children.length > 0) {
      const spacing = 2;
      const startX = x - ((node.children.length - 1) * spacing) / 2;

      node.children.forEach((child, i) => {
        this._layoutCodebaseNode(child, startX + i * spacing, y - 2, z, pos);
      });
    }
  }

  /**
   * Highlight a node by name
   * @param {string} name - Node name to highlight
   */
  highlightNode(name) {
    this.objects.forEach(obj => {
      if (obj.userData?.name === name) {
        this.selectObject(obj);
      }
    });
  }

  /**
   * Dispose scene
   */
  dispose() {
    this.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.container?.removeChild(this.renderer.domElement);
    }

    this.isInitialized = false;
  }
}

// Export to window
window.CYNICThreeScene = ThreeScene;
