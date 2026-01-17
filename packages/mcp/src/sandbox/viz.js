/**
 * CYNIC Visualizations - Three.js 3D + D3.js graphs
 */

const CYNICViz = {
  // Three.js components
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  packages: {},
  dogs: {},
  connections: [],

  // D3 components
  graphSvg: null,
  graphSimulation: null,

  // Architecture data
  ARCHITECTURE: {
    packages: [
      { id: 'core', name: 'Core', position: { x: 0, y: 0, z: 0 }, color: 0x00d4aa, status: 'active' },
      { id: 'protocol', name: 'Protocol', position: { x: -2, y: 1, z: 0 }, color: 0xd4aa00, status: 'active' },
      { id: 'persistence', name: 'Persistence', position: { x: -2, y: -1, z: 0 }, color: 0x00aad4, status: 'active' },
      { id: 'node', name: 'Node', position: { x: 2, y: 1, z: 0 }, color: 0xaa00d4, status: 'active' },
      { id: 'mcp', name: 'MCP', position: { x: 0, y: 0, z: 2 }, color: 0xd400aa, status: 'active' },
      { id: 'client', name: 'Client', position: { x: 2, y: -1, z: 0 }, color: 0xaad400, status: 'planned' }
    ],
    connections: [
      { from: 'core', to: 'protocol' },
      { from: 'core', to: 'persistence' },
      { from: 'core', to: 'node' },
      { from: 'core', to: 'mcp' },
      { from: 'protocol', to: 'node' },
      { from: 'persistence', to: 'node' },
      { from: 'mcp', to: 'node' },
      { from: 'node', to: 'client' }
    ],
    dogs: [
      { id: 'observer', name: 'Observer', active: true, position: { x: -3, y: 2, z: 1 } },
      { id: 'digester', name: 'Digester', active: true, position: { x: -1, y: 2, z: 1 } },
      { id: 'guardian', name: 'Guardian', active: true, position: { x: 1, y: 2, z: 1 } },
      { id: 'mentor', name: 'Mentor', active: true, position: { x: 3, y: 2, z: 1 } },
      { id: 'tracker', name: 'Tracker', active: false, position: { x: -3, y: -2, z: 1 } },
      { id: 'auditor', name: 'Auditor', active: false, position: { x: -1, y: -2, z: 1 } },
      { id: 'librarian', name: 'Librarian', active: false, position: { x: 1, y: -2, z: 1 } },
      { id: 'economist', name: 'Economist', active: false, position: { x: 3, y: -2, z: 1 } },
      { id: 'diplomat', name: 'Diplomat', active: false, position: { x: 0, y: -3, z: 1 } },
      { id: 'archivist', name: 'Archivist', active: false, position: { x: 0, y: 3, z: 1 } }
    ]
  },

  /**
   * Initialize 3D visualization
   */
  init3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(5, 3, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x222233, 0x111122);
    this.scene.add(gridHelper);

    // Create architecture
    this.createPackages();
    this.createDogs();
    this.createConnections();

    // Mouse controls
    this.setupControls(container);

    // Animation loop
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.onResize(container));
  },

  /**
   * Create package nodes as icosahedrons
   */
  createPackages() {
    const geometry = new THREE.IcosahedronGeometry(0.4, 0);

    for (const pkg of this.ARCHITECTURE.packages) {
      const material = new THREE.MeshPhongMaterial({
        color: pkg.color,
        transparent: true,
        opacity: pkg.status === 'active' ? 0.9 : 0.4,
        wireframe: pkg.status !== 'active'
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pkg.position.x, pkg.position.y, pkg.position.z);
      mesh.userData = { type: 'package', data: pkg };

      this.packages[pkg.id] = mesh;
      this.scene.add(mesh);

      // Label
      this.addLabel(pkg.name, mesh.position, pkg.color);
    }
  },

  /**
   * Create dog agents as tetrahedrons
   */
  createDogs() {
    const geometry = new THREE.TetrahedronGeometry(0.25, 0);

    for (const dog of this.ARCHITECTURE.dogs) {
      const color = dog.active ? 0x00d4aa : 0xff4444;
      const material = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: dog.active ? 0.9 : 0.3,
        wireframe: !dog.active
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(dog.position.x, dog.position.y, dog.position.z);
      mesh.userData = { type: 'dog', data: dog };

      this.dogs[dog.id] = mesh;
      this.scene.add(mesh);
    }
  },

  /**
   * Create connection lines between packages
   */
  createConnections() {
    const material = new THREE.LineBasicMaterial({
      color: 0x2a2a3a,
      transparent: true,
      opacity: 0.5
    });

    for (const conn of this.ARCHITECTURE.connections) {
      const from = this.packages[conn.from];
      const to = this.packages[conn.to];

      if (from && to) {
        const points = [from.position.clone(), to.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);

        this.connections.push(line);
        this.scene.add(line);
      }
    }
  },

  /**
   * Add text label (using sprite)
   */
  addLabel(text, position, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 32;

    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = '14px JetBrains Mono, monospace';
    context.fillStyle = '#' + color.toString(16).padStart(6, '0');
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 5);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.position.copy(position);
    sprite.position.y -= 0.6;
    sprite.scale.set(1, 0.25, 1);

    this.scene.add(sprite);
  },

  /**
   * Setup mouse controls for rotation/zoom
   */
  setupControls(container) {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    container.addEventListener('mousemove', (e) => {
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

    container.addEventListener('mouseup', () => isDragging = false);
    container.addEventListener('mouseleave', () => isDragging = false);

    // Zoom with wheel
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      this.camera.position.multiplyScalar(factor);
    });

    // Click to select
    container.addEventListener('click', (e) => this.onObjectClick(e, container));
  },

  /**
   * Handle object click
   */
  onObjectClick(event, container) {
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / container.clientWidth) * 2 - 1,
      -((event.clientY - rect.top) / container.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const objects = [...Object.values(this.packages), ...Object.values(this.dogs)];
    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {
      const selected = intersects[0].object;
      const data = selected.userData;

      // Dispatch custom event
      container.dispatchEvent(new CustomEvent('objectSelected', {
        detail: data
      }));

      // Visual feedback
      this.highlightObject(selected);
    }
  },

  /**
   * Highlight selected object
   */
  highlightObject(object) {
    // Reset all
    Object.values(this.packages).forEach(p => p.scale.set(1, 1, 1));
    Object.values(this.dogs).forEach(d => d.scale.set(1, 1, 1));

    // Scale up selected
    object.scale.set(1.3, 1.3, 1.3);
  },

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());

    // Rotate packages slowly
    Object.values(this.packages).forEach(pkg => {
      pkg.rotation.x += 0.002;
      pkg.rotation.y += 0.003;
    });

    // Rotate dogs
    Object.values(this.dogs).forEach(dog => {
      if (dog.userData.data.active) {
        dog.rotation.y += 0.01;
      }
    });

    this.renderer.render(this.scene, this.camera);
  },

  /**
   * Handle window resize
   */
  onResize(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  /**
   * Initialize Knowledge Graph with D3
   */
  initGraph(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Sample graph data
    const nodes = [
      { id: 'user-1', type: 'user', label: 'User A' },
      { id: 'judgment-1', type: 'judgment', label: 'Judgment X' },
      { id: 'token-1', type: 'token', label: 'Token Y' },
      { id: 'pattern-1', type: 'pattern', label: 'Pattern Z' }
    ];

    const links = [
      { source: 'user-1', target: 'judgment-1', weight: 0.8 },
      { source: 'judgment-1', target: 'token-1', weight: 0.9 },
      { source: 'token-1', target: 'pattern-1', weight: 0.7 },
      { source: 'user-1', target: 'token-1', weight: 0.6 }
    ];

    // Create SVG
    this.graphSvg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create simulation
    this.graphSimulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = this.graphSvg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#2a2a3a')
      .attr('stroke-width', d => d.weight * 3);

    // Draw link labels
    const linkLabel = this.graphSvg.append('g')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text(d => d.weight.toFixed(2));

    // Draw nodes
    const node = this.graphSvg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 12)
      .attr('fill', d => this.getNodeColor(d.type))
      .call(d3.drag()
        .on('start', (event, d) => this.dragStarted(event, d))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragEnded(event, d)));

    // Draw node labels
    const nodeLabel = this.graphSvg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .attr('font-size', '11px')
      .attr('fill', '#e0e0e0')
      .attr('text-anchor', 'middle')
      .attr('dy', 25)
      .text(d => d.label);

    // Update positions on tick
    this.graphSimulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      nodeLabel
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });
  },

  getNodeColor(type) {
    const colors = {
      user: '#00d4aa',
      judgment: '#d4aa00',
      token: '#aa00d4',
      pattern: '#00aad4'
    };
    return colors[type] || '#888';
  },

  dragStarted(event, d) {
    if (!event.active) this.graphSimulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  },

  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  },

  dragEnded(event, d) {
    if (!event.active) this.graphSimulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  },

  /**
   * Update graph with new data
   */
  updateGraph(nodes, links) {
    // TODO: Implement dynamic graph updates
  },

  /**
   * Render PoJ Chain visualization (safe DOM methods)
   */
  renderChain(containerId, blocks) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear container safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    blocks.forEach((block, i) => {
      // Block element
      const blockEl = document.createElement('div');
      blockEl.className = 'chain-block' + (block.pending ? ' pending' : '');

      const numberSpan = document.createElement('span');
      numberSpan.className = 'number';
      numberSpan.textContent = 'B#' + String(block.number);

      const countSpan = document.createElement('span');
      countSpan.className = 'count';
      countSpan.textContent = String(block.judgments) + ' jdg';

      blockEl.appendChild(numberSpan);
      blockEl.appendChild(countSpan);
      blockEl.onclick = () => this.onBlockClick(block);
      container.appendChild(blockEl);

      // Connector (except last)
      if (i < blocks.length - 1) {
        const connector = document.createElement('span');
        connector.className = 'chain-connector';
        connector.textContent = '──';
        container.appendChild(connector);
      }
    });
  },

  onBlockClick(block) {
    console.log('Block clicked:', block);
    // Dispatch event for console to handle
    document.dispatchEvent(new CustomEvent('blockSelected', { detail: block }));
  },

  /**
   * Render matrix visualization (safe DOM methods)
   */
  renderMatrix(containerId, scores) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear container safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const axioms = ['PHI', 'VERIFY', 'CULTURE', 'BURN'];

    for (const axiom of axioms) {
      const bar = document.createElement('div');
      bar.className = 'matrix-bar';

      const avgScore = this.getAxiomAverage(axiom, scores);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'label';
      labelSpan.textContent = axiom;

      const barDiv = document.createElement('div');
      barDiv.className = 'bar';

      const fillDiv = document.createElement('div');
      fillDiv.className = 'fill';
      fillDiv.style.width = (avgScore * 100) + '%';
      fillDiv.style.background = this.getAxiomColor(axiom);

      barDiv.appendChild(fillDiv);
      bar.appendChild(labelSpan);
      bar.appendChild(barDiv);
      container.appendChild(bar);
    }
  },

  getAxiomAverage(axiom, scores) {
    const dims = CYNICFormulas.DIMENSIONS[axiom] || [];
    if (dims.length === 0) return 0;

    let sum = 0;
    for (const dim of dims) {
      sum += scores[dim.id] ?? 0.5;
    }
    return sum / dims.length;
  },

  getAxiomColor(axiom) {
    const colors = {
      PHI: '#d4aa00',
      VERIFY: '#00d4aa',
      CULTURE: '#aa00d4',
      BURN: '#d44400'
    };
    return colors[axiom] || '#888';
  }
};

// Export
window.CYNICViz = CYNICViz;
