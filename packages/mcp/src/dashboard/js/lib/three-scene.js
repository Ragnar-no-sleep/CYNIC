/**
 * CYNIC Dashboard - Three.js Scene Manager
 * 3D visualization for Architecture mode
 */

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
