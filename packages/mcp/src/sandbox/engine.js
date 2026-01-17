/**
 * CYNIC Engine - Main orchestrator for sandbox
 * Connects to MCP tools and wires up all components
 */

const CYNICEngine = {
  connected: false,
  wsConnection: null,
  mcpEndpoint: null,
  state: {
    packages: [],
    dogs: [],
    chain: null,
    patterns: [],
    sessions: null
  },

  /**
   * Initialize the sandbox engine
   */
  async init() {
    console.log('CYNIC Engine initializing...');

    // Initialize all components
    this.initUI();
    this.initViz();
    this.initConsole();
    this.initFormulas();
    this.initEventHandlers();

    // Try to connect to MCP
    await this.connectMCP();

    // Load initial data
    await this.loadInitialData();

    console.log('CYNIC Engine ready');
  },

  /**
   * Initialize UI components
   */
  initUI() {
    // Explorer tree
    this.renderExplorerTree();

    // Dogs list
    this.renderDogsList();

    // Tool buttons
    this.renderToolButtons();

    // View controls
    this.initViewControls();

    // Export buttons
    this.initExportButtons();
  },

  /**
   * Render explorer tree
   */
  renderExplorerTree() {
    const tree = document.getElementById('explorerTree');
    if (!tree) return;

    const structure = {
      packages: ['core', 'protocol', 'persistence', 'node', 'mcp', 'client'],
      docs: ['ARCHITECTURE', 'ROADMAP', 'VISION'],
      scripts: ['hooks', 'tools']
    };

    for (const [folder, items] of Object.entries(structure)) {
      const folderEl = document.createElement('div');

      const folderItem = document.createElement('div');
      folderItem.className = 'tree-item folder';
      folderItem.textContent = folder + '/';
      folderItem.onclick = () => folderItem.classList.toggle('open');

      const children = document.createElement('div');
      children.className = 'tree-children';

      for (const item of items) {
        const itemEl = document.createElement('div');
        itemEl.className = 'tree-item';
        itemEl.textContent = item;
        itemEl.onclick = () => this.onExplorerSelect(folder, item);
        children.appendChild(itemEl);
      }

      folderEl.appendChild(folderItem);
      folderEl.appendChild(children);
      tree.appendChild(folderEl);
    }
  },

  /**
   * Render dogs list
   */
  renderDogsList() {
    const list = document.getElementById('dogList');
    if (!list) return;

    const dogs = CYNICViz.ARCHITECTURE.dogs;

    for (const dog of dogs) {
      const item = document.createElement('div');
      item.className = 'dog-item';
      item.onclick = () => this.onDogToggle(dog.id);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'name';

      const indicator = document.createElement('span');
      indicator.className = 'indicator' + (dog.active ? ' active' : '');

      const nameSpan = document.createElement('span');
      nameSpan.textContent = dog.name;

      nameDiv.appendChild(indicator);
      nameDiv.appendChild(nameSpan);

      const status = document.createElement('span');
      status.className = 'status ' + (dog.active ? 'on' : 'off');
      status.textContent = dog.active ? 'ON' : 'OFF';

      item.appendChild(nameDiv);
      item.appendChild(status);
      list.appendChild(item);
    }
  },

  /**
   * Render tool buttons
   */
  renderToolButtons() {
    const container = document.getElementById('toolButtons');
    if (!container) return;

    const tools = [
      { id: 'judge', label: 'Judge', icon: '⚖️' },
      { id: 'digest', label: 'Digest', icon: '📝' },
      { id: 'search', label: 'Search', icon: '🔍' },
      { id: 'chain', label: 'Chain', icon: '⛓️' },
      { id: 'patterns', label: 'Patterns', icon: '🔮' },
      { id: 'metrics', label: 'Metrics', icon: '📊' }
    ];

    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.textContent = tool.icon + ' ' + tool.label;
      btn.onclick = () => this.onToolClick(tool.id);
      container.appendChild(btn);
    }
  },

  /**
   * Initialize view controls
   */
  initViewControls() {
    const buttons = document.querySelectorAll('.view-controls button');
    buttons.forEach(btn => {
      btn.onclick = () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.onViewChange(btn.dataset.view);
      };
    });
  },

  /**
   * Initialize export buttons
   */
  initExportButtons() {
    const buttons = document.querySelectorAll('.export-bar button');
    buttons.forEach(btn => {
      btn.onclick = () => this.onExport(btn.dataset.export);
    });
  },

  /**
   * Initialize 3D and graph visualizations
   */
  initViz() {
    // 3D scene
    CYNICViz.init3D('viz3d');

    // D3 knowledge graph
    setTimeout(() => {
      CYNICViz.initGraph('knowledgeGraph');
    }, 100);

    // Listen for object selection
    const viz3d = document.getElementById('viz3d');
    if (viz3d) {
      viz3d.addEventListener('objectSelected', (e) => {
        this.onObjectSelected(e.detail);
      });
    }
  },

  /**
   * Initialize console
   */
  initConsole() {
    CYNICConsole.init('consoleOutput', 'consoleInput');
    CYNICConsole.setEngine(this);
  },

  /**
   * Initialize formula display
   */
  initFormulas() {
    const formulaList = document.getElementById('formulaList');
    const sliders = document.getElementById('formulaSliders');

    if (formulaList) {
      const formulas = CYNICFormulas.getFormulasLatex();
      formulas.slice(0, 4).forEach(f => {
        const item = document.createElement('div');
        item.className = 'formula-item';
        CYNICFormulas.renderFormula(f.latex, item);
        formulaList.appendChild(item);
      });
    }

    if (sliders) {
      const axioms = ['PHI', 'VERIFY', 'CULTURE', 'BURN'];
      axioms.forEach(axiom => {
        const row = document.createElement('div');
        row.className = 'slider-row';

        const label = document.createElement('label');
        label.textContent = axiom;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '100';
        input.value = String(CYNICFormulas.AXIOMS[axiom].weight * 100 * 2.618);
        input.oninput = () => this.onSliderChange(axiom, input.value);

        const value = document.createElement('span');
        value.className = 'value';
        value.textContent = (parseInt(input.value) / 100).toFixed(2);

        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(value);
        sliders.appendChild(row);
      });
    }
  },

  /**
   * Initialize event handlers
   */
  initEventHandlers() {
    // Expand graph button
    const expandBtn = document.getElementById('expandGraph');
    if (expandBtn) {
      expandBtn.onclick = () => this.onExpandGraph();
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'j' && e.ctrlKey) {
        e.preventDefault();
        CYNICConsole.execute('judge()');
      }
    });
  },

  /**
   * Connect to MCP server
   */
  async connectMCP() {
    const statusEl = document.getElementById('liveStatus');

    try {
      // In browser, we can't directly connect to MCP
      // This would need a WebSocket bridge or HTTP API
      // For now, we simulate with mock data

      // Check if we have an MCP endpoint configured
      this.mcpEndpoint = window.CYNIC_MCP_ENDPOINT || null;

      if (this.mcpEndpoint) {
        // Try to connect
        const response = await fetch(this.mcpEndpoint + '/health');
        if (response.ok) {
          this.connected = true;
          if (statusEl) {
            statusEl.textContent = '● LIVE';
            statusEl.classList.add('connected');
          }
          console.log('Connected to MCP at', this.mcpEndpoint);
        }
      } else {
        // Offline mode
        if (statusEl) {
          statusEl.textContent = '● OFFLINE';
        }
        console.log('Running in offline mode (no MCP endpoint)');
      }
    } catch (err) {
      console.warn('MCP connection failed:', err.message);
      if (statusEl) {
        statusEl.textContent = '● OFFLINE';
      }
    }
  },

  /**
   * Load initial data
   */
  async loadInitialData() {
    // Load mock chain data
    const mockBlocks = [
      { number: 127, judgments: 3, pending: false },
      { number: 128, judgments: 5, pending: false },
      { number: 129, judgments: 2, pending: false },
      { number: 130, judgments: 4, pending: false },
      { number: 131, judgments: 0, pending: true }
    ];

    CYNICViz.renderChain('chainViz', mockBlocks);

    // Load mock matrix
    const mockScores = {};
    for (const dims of Object.values(CYNICFormulas.DIMENSIONS)) {
      for (const dim of dims) {
        mockScores[dim.id] = Math.random() * 0.5 + 0.3;
      }
    }
    CYNICViz.renderMatrix('matrixView', mockScores);

    // Update Q-Score
    const qResult = CYNICFormulas.calculateQScore(mockScores);
    const qScoreEl = document.getElementById('qScoreValue');
    if (qScoreEl) {
      qScoreEl.textContent = qResult.constrained.toFixed(0) + '/100';
    }

    // Update chain status
    const chainStatus = document.getElementById('chainStatus');
    if (chainStatus) {
      chainStatus.textContent = 'Block #130 | 847 total judgments';
    }
  },

  /**
   * Event handlers
   */
  onExplorerSelect(folder, item) {
    console.log('Explorer select:', folder, item);
    CYNICConsole.log('Selected: ' + folder + '/' + item, 'info');
  },

  onDogToggle(dogId) {
    console.log('Dog toggle:', dogId);
    CYNICConsole.log('Toggle dog: ' + dogId, 'info');
  },

  onToolClick(toolId) {
    console.log('Tool click:', toolId);
    CYNICConsole.execute(toolId + '()');
  },

  onViewChange(view) {
    console.log('View change:', view);
    // Could animate camera to different positions
  },

  onObjectSelected(detail) {
    console.log('Object selected:', detail);
    const { type, data } = detail;
    CYNICConsole.log(type + ' selected: ' + data.name, 'info');
  },

  onSliderChange(axiom, value) {
    const row = event.target.parentElement;
    const valueEl = row.querySelector('.value');
    if (valueEl) {
      valueEl.textContent = (parseInt(value) / 100).toFixed(2);
    }
    // Recalculate Q-Score with new weights
    console.log('Axiom weight changed:', axiom, value);
  },

  onExpandGraph() {
    console.log('Expand graph');
    // Could open fullscreen modal with larger graph
  },

  onExport(format) {
    console.log('Export:', format);

    switch (format) {
      case 'png':
        this.exportPNG();
        break;
      case 'svg':
        this.exportSVG();
        break;
      case 'json':
        this.exportJSON();
        break;
      case 'mermaid':
        this.exportMermaid();
        break;
    }
  },

  /**
   * Export functions
   */
  exportPNG() {
    if (CYNICViz.renderer) {
      const dataUrl = CYNICViz.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'cynic-architecture.png';
      link.href = dataUrl;
      link.click();
    }
  },

  exportSVG() {
    const svg = document.querySelector('#knowledgeGraph svg');
    if (svg) {
      const data = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([data], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'cynic-graph.svg';
      link.href = url;
      link.click();
    }
  },

  exportJSON() {
    const data = {
      architecture: CYNICViz.ARCHITECTURE,
      formulas: {
        PHI: CYNICFormulas.PHI,
        axioms: CYNICFormulas.AXIOMS,
        dimensions: CYNICFormulas.DIMENSIONS
      },
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'cynic-export.json';
    link.href = url;
    link.click();
  },

  exportMermaid() {
    let mermaid = 'graph TD\n';

    // Packages
    for (const pkg of CYNICViz.ARCHITECTURE.packages) {
      mermaid += '    ' + pkg.id + '[' + pkg.name + ']\n';
    }

    // Connections
    for (const conn of CYNICViz.ARCHITECTURE.connections) {
      mermaid += '    ' + conn.from + ' --> ' + conn.to + '\n';
    }

    // Copy to clipboard
    navigator.clipboard.writeText(mermaid).then(() => {
      CYNICConsole.log('Mermaid diagram copied to clipboard', 'system');
    });
  },

  /**
   * API methods for MCP integration
   */
  async callMCP(tool, params) {
    if (!this.connected || !this.mcpEndpoint) {
      return { error: 'Not connected to MCP' };
    }

    try {
      const response = await fetch(this.mcpEndpoint + '/tools/' + tool, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      return await response.json();
    } catch (err) {
      return { error: err.message };
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CYNICEngine.init();
});

// Export
window.CYNICEngine = CYNICEngine;
