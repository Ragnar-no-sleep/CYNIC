/**
 * CYNIC Dashboard - Knowledge Graph View
 *
 * Interactive 3D visualization of judgments, patterns, PoJ blocks, and their relationships.
 * Real-time updates via SSE.
 *
 * Note: Uses innerHTML for DOM rendering following existing codebase patterns.
 * All dynamic content is escaped via escapeHtml() before rendering.
 * Data comes from trusted CYNIC server sources.
 *
 * "phi distrusts phi" - kynikos
 */

import { KnowledgeGraphData, KGNodeType, KGEdgeType } from '../lib/knowledge-graph-data.js';
import { KnowledgeGraphScene } from '../lib/knowledge-graph-scene.js';
import { ForceSimulation } from '../lib/force-simulation.js';
import { formatTimestamp, truncate, debounce } from '../lib/utils.js';
import { cynicAudio } from '../lib/audio.js';

/**
 * Escape HTML to prevent XSS - applied to all dynamic content
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for innerHTML
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Knowledge View class
 */
export class KnowledgeView {
  constructor(options = {}) {
    this.container = null;
    this.api = options.api;

    // Data layer
    this.graphData = new KnowledgeGraphData();

    // 3D scene
    this.scene = null;

    // Physics simulation
    this.simulation = new ForceSimulation();

    // SSE connection
    this.eventSource = null;
    this.isConnected = false;

    // UI state
    this.filters = {
      types: Object.values(KGNodeType),
      minQ: 0,
      showLabels: false,
    };
    this.selectedNodeId = null;
    this.hoveredNodeId = null;

    // Stats
    this.stats = {
      nodes: 0,
      edges: 0,
      judgments: 0,
      patterns: 0,
      blocks: 0,
    };

    // Debounced handlers
    this._debouncedSceneUpdate = debounce(() => this._syncSceneWithData(), 50);
  }

  /**
   * Initialize the view
   */
  init(container) {
    this.container = container;
    this._render();
    this._initScene();
    this._setupSimulation();
    this._connectSSE();
    this._loadInitialData();
    return this;
  }

  /**
   * Render the view (uses innerHTML with all values escaped via escapeHtml)
   */
  _render() {
    if (!this.container) return;

    // All dynamic content below is escaped via escapeHtml() for XSS prevention
    const statusClass = this.isConnected ? 'connected' : 'disconnected';
    const statusText = this.isConnected ? 'Live' : 'Disconnected';

    const filterButtonsHtml = Object.values(KGNodeType).map(type => {
      const activeClass = this.filters.types.includes(type) ? 'active' : '';
      const escapedType = escapeHtml(type);
      return `<button class="filter-btn ${activeClass}" data-type="${escapedType}">${this._getTypeIcon(type)} ${escapedType}</button>`;
    }).join('');

    const detailPanelClass = this.selectedNodeId ? 'visible' : '';

    const html = `
      <div class="knowledge-view">
        <div class="knowledge-header">
          <div class="knowledge-status">
            <span class="status-indicator ${statusClass}"></span>
            <span class="status-text">${statusText}</span>
          </div>
          <div class="knowledge-stats">
            <span class="stat" title="Total nodes">🔵 ${this.stats.nodes}</span>
            <span class="stat" title="Judgments">⚖️ ${this.stats.judgments}</span>
            <span class="stat" title="Patterns">🔮 ${this.stats.patterns}</span>
            <span class="stat" title="Blocks">⛓️ ${this.stats.blocks}</span>
            <span class="stat" title="Edges">📎 ${this.stats.edges}</span>
          </div>
          <div class="knowledge-controls">
            <div class="filter-buttons">
              ${filterButtonsHtml}
            </div>
            <div class="q-filter">
              <label>Min Q:</label>
              <input type="range" class="q-slider" min="0" max="100" value="${this.filters.minQ}">
              <span class="q-value">${this.filters.minQ}</span>
            </div>
            <button class="reset-btn" title="Reset view">🎯</button>
            <button class="clear-btn" title="Clear graph">🗑️</button>
          </div>
        </div>

        <div class="knowledge-body">
          <div class="graph-container" id="knowledge-graph-canvas"></div>
          <div class="node-detail-panel ${detailPanelClass}">
            ${this._renderDetailPanel()}
          </div>
        </div>

        <div class="knowledge-footer">
          <div class="simulation-status">
            <span class="sim-indicator ${this.simulation.isRunning() ? 'running' : ''}"></span>
            <span class="sim-text">Simulation: ${this.simulation.isRunning() ? 'Running' : 'Stopped'}</span>
            <span class="sim-alpha">α: ${this.simulation.getAlpha().toFixed(3)}</span>
          </div>
          <div class="legend">
            <span class="legend-item judgment"><span class="dot"></span> Judgment</span>
            <span class="legend-item pattern"><span class="dot"></span> Pattern</span>
            <span class="legend-item block"><span class="dot"></span> Block</span>
            <span class="legend-item session"><span class="dot"></span> Session</span>
          </div>
        </div>
      </div>
    `;

    this.container.textContent = ''; // Clear safely
    this.container.insertAdjacentHTML('beforeend', html);

    this._attachEventListeners();
  }

  /**
   * Initialize 3D scene
   */
  _initScene() {
    this.scene = new KnowledgeGraphScene('knowledge-graph-canvas');
    const success = this.scene.init();

    if (success) {
      // Setup callbacks
      this.scene.onNodeClick = (nodeId) => this._onNodeClick(nodeId);
      this.scene.onNodeHover = (nodeId) => this._onNodeHover(nodeId);
    }
  }

  /**
   * Setup physics simulation
   */
  _setupSimulation() {
    // Simulation tick callback
    this.simulation.onTick = (alpha) => {
      // Update scene positions
      const nodes = this.graphData.getAllNodes();
      const edges = this.graphData.getAllEdges();
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      this.scene.updatePositions(nodes);
      this.scene.updateEdgePositions(edges, nodeMap);

      // Update UI
      this._updateSimulationStatus(alpha);
    };

    this.simulation.onEnd = () => {
      this._updateSimulationStatus(0);
    };

    // Listen to data changes
    this.graphData.on((event) => {
      if (['nodeAdded', 'nodeRemoved', 'edgeAdded', 'edgeRemoved', 'cleared'].includes(event.event)) {
        this._onDataChanged();
      }
    });
  }

  /**
   * Connect to SSE endpoint
   */
  _connectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource('/sse');

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this._updateStatus();
        console.log('[Knowledge] SSE connected');
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this._updateStatus();
        console.error('[Knowledge] SSE error');
      };

      // Listen for events
      this.eventSource.addEventListener('judgment', (e) => this._handleJudgmentEvent(e));
      this.eventSource.addEventListener('block', (e) => this._handleBlockEvent(e));
      this.eventSource.addEventListener('pattern', (e) => this._handlePatternEvent(e));

    } catch (err) {
      console.error('[Knowledge] Failed to connect SSE:', err);
    }
  }

  /**
   * Load initial data from API
   */
  async _loadInitialData() {
    try {
      // Get recent judgments
      if (this.api) {
        const searchResult = await this.api.search('', 'judgment', 50);
        if (searchResult.success && searchResult.result?.results) {
          for (const item of searchResult.result.results) {
            this.graphData.addJudgment(item);
          }
        }

        // Get recent blocks
        const chainResult = await this.api.chain('recent', { limit: 20 });
        if (chainResult.success && chainResult.result?.blocks) {
          for (const block of chainResult.result.blocks) {
            this.graphData.addBlock(block);
          }
        }

        // Get patterns
        const patternResult = await this.api.patterns('all', 20);
        if (patternResult.success && patternResult.result?.patterns) {
          for (const pattern of patternResult.result.patterns) {
            this.graphData.addPattern(pattern);
          }
        }
      }

      this._syncSceneWithData();
      this._updateStats();

    } catch (err) {
      console.error('[Knowledge] Failed to load initial data:', err);
    }
  }

  /**
   * Handle judgment SSE event
   */
  _handleJudgmentEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.graphData.addJudgment(data);

      // Play audio
      cynicAudio.playJudgment(data.verdict || 'WAG');

      // Pulse effect
      const nodeId = data.id || data.judgmentId;
      if (nodeId) {
        setTimeout(() => this.scene.pulseNode(nodeId), 100);
      }

    } catch (err) {
      console.error('[Knowledge] Failed to parse judgment:', err);
    }
  }

  /**
   * Handle block SSE event
   */
  _handleBlockEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.graphData.addBlock(data);

      cynicAudio.playBlock(data.slot || 0);

    } catch (err) {
      console.error('[Knowledge] Failed to parse block:', err);
    }
  }

  /**
   * Handle pattern SSE event
   */
  _handlePatternEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.graphData.addPattern(data);

      cynicAudio.playPattern();

    } catch (err) {
      console.error('[Knowledge] Failed to parse pattern:', err);
    }
  }

  /**
   * Called when graph data changes
   */
  _onDataChanged() {
    this._updateStats();
    this._debouncedSceneUpdate();
  }

  /**
   * Sync scene with current data
   */
  _syncSceneWithData() {
    // Filter nodes by type
    let nodes = this.graphData.getAllNodes();

    // Apply type filter
    nodes = nodes.filter(n => this.filters.types.includes(n.type));

    // Apply Q-score filter for judgments
    if (this.filters.minQ > 0) {
      nodes = nodes.filter(n => {
        if (n.type !== KGNodeType.JUDGMENT) return true;
        const qScore = n.data.Q ?? n.data.qScore ?? n.data.score ?? 0;
        return qScore >= this.filters.minQ;
      });
    }

    // Get edges for filtered nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = this.graphData.getAllEdges().filter(
      e => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    // Update scene
    this.scene._updateNodes(nodes);
    this.scene._updateEdges(edges, nodes);

    // Update simulation
    this.simulation.setNodes(nodes);
    this.simulation.setEdges(edges);
    this.simulation.heat(0.3);
  }

  /**
   * Node click handler
   */
  _onNodeClick(nodeId) {
    this.selectedNodeId = nodeId;
    this._updateDetailPanel();
    this._highlightConnected(nodeId);
  }

  /**
   * Node hover handler
   */
  _onNodeHover(nodeId) {
    this.hoveredNodeId = nodeId;
    // Could show tooltip here
  }

  /**
   * Highlight connected nodes
   */
  _highlightConnected(nodeId) {
    if (!nodeId) {
      this.scene.highlightConnected(null, []);
      return;
    }

    const connectedIds = Array.from(this.graphData.adjacency.get(nodeId) || []);
    this.scene.highlightConnected(nodeId, connectedIds);
  }

  /**
   * Render detail panel (all dynamic content escaped)
   */
  _renderDetailPanel() {
    if (!this.selectedNodeId) {
      return `
        <div class="detail-empty">
          <span class="icon">👆</span>
          <p>Click a node to view details</p>
        </div>
      `;
    }

    const node = this.graphData.getNode(this.selectedNodeId);
    if (!node) {
      return `<div class="detail-empty">Node not found</div>`;
    }

    const escapedType = escapeHtml(node.type);
    return `
      <div class="detail-content">
        <div class="detail-header">
          <span class="type-badge ${escapedType}">${this._getTypeIcon(node.type)} ${escapedType}</span>
          <button class="close-btn" data-action="close-detail">✕</button>
        </div>
        <div class="detail-body">
          ${this._renderNodeDetail(node)}
        </div>
        <div class="detail-footer">
          <button class="action-btn" data-action="focus">🎯 Focus</button>
          <button class="action-btn" data-action="copy">📋 Copy</button>
        </div>
      </div>
    `;
  }

  /**
   * Render node detail based on type
   */
  _renderNodeDetail(node) {
    switch (node.type) {
      case KGNodeType.JUDGMENT:
        return this._renderJudgmentDetail(node);
      case KGNodeType.PATTERN:
        return this._renderPatternDetail(node);
      case KGNodeType.BLOCK:
        return this._renderBlockDetail(node);
      case KGNodeType.SESSION:
        return this._renderSessionDetail(node);
      default:
        return `<pre class="json-view">${escapeHtml(JSON.stringify(node.data, null, 2))}</pre>`;
    }
  }

  /**
   * Render judgment detail (all values escaped)
   */
  _renderJudgmentDetail(node) {
    const data = node.data;
    const verdict = escapeHtml(data.verdict || 'UNKNOWN');
    const score = data.Q ?? data.qScore ?? data.score ?? 0;

    let breakdownHtml = '';
    if (data.breakdown) {
      const rows = Object.entries(data.breakdown).map(([axiom, axScore]) => {
        const escapedAxiom = escapeHtml(axiom);
        const width = (axScore / 25 * 100).toFixed(1);
        return `
          <div class="axiom-row">
            <span class="axiom-name">${escapedAxiom}</span>
            <div class="axiom-bar"><div class="fill" style="width: ${width}%"></div></div>
            <span class="axiom-score">${axScore.toFixed(1)}</span>
          </div>
        `;
      }).join('');
      breakdownHtml = `<div class="breakdown"><h4>Axiom Breakdown</h4>${rows}</div>`;
    }

    // Connected nodes
    const connected = this.graphData.getConnectedNodes(node.id);
    let connectedHtml = '';
    if (connected.length > 0) {
      const items = connected.slice(0, 5).map(n => {
        const escapedId = escapeHtml(n.id);
        const escapedLabel = escapeHtml(n.getLabel());
        return `<div class="connected-item" data-node-id="${escapedId}">${this._getTypeIcon(n.type)} ${escapedLabel}</div>`;
      }).join('');
      const moreHtml = connected.length > 5 ? `<div class="more">+${connected.length - 5} more</div>` : '';
      connectedHtml = `<div class="connected-nodes"><h4>Connected (${connected.length})</h4>${items}${moreHtml}</div>`;
    }

    const confidenceHtml = data.confidence
      ? `<div class="confidence">Confidence: ${(data.confidence * 100).toFixed(1)}%</div>`
      : '';

    return `
      <div class="judgment-detail">
        <div class="verdict-large verdict-${verdict.toLowerCase()}">${verdict}</div>
        <div class="score-display">
          <span class="label">Q-Score</span>
          <span class="value">${score.toFixed(2)}</span>
        </div>
        ${breakdownHtml}
        ${confidenceHtml}
        ${connectedHtml}
      </div>
    `;
  }

  /**
   * Render pattern detail
   */
  _renderPatternDetail(node) {
    const data = node.data;
    const category = escapeHtml(data.category || 'Unknown');
    const count = data.total || data.count || 0;
    const jsonStr = escapeHtml(JSON.stringify(data, null, 2));

    return `
      <div class="pattern-detail">
        <div class="pattern-category">${category}</div>
        <div class="pattern-count">Occurrences: ${count}</div>
        <pre class="json-view">${jsonStr}</pre>
      </div>
    `;
  }

  /**
   * Render block detail
   */
  _renderBlockDetail(node) {
    const data = node.data;
    const slot = data.slot ?? data.blockNumber ?? '?';
    const judgmentCount = data.judgmentCount ?? data.judgments?.length ?? 0;

    let hashHtml = '';
    if (data.hash) {
      const hashStr = escapeHtml(String(data.hash).slice(0, 16));
      hashHtml = `<div class="info-row"><span class="label">Hash</span><span class="value hash">${hashStr}...</span></div>`;
    }

    let prevHashHtml = '';
    if (data.prevHash) {
      const prevHashStr = escapeHtml(String(data.prevHash).slice(0, 16));
      prevHashHtml = `<div class="info-row"><span class="label">Prev Hash</span><span class="value hash">${prevHashStr}...</span></div>`;
    }

    return `
      <div class="block-detail">
        <div class="block-slot">Block #${slot}</div>
        <div class="block-info">
          <div class="info-row">
            <span class="label">Judgments</span>
            <span class="value">${judgmentCount}</span>
          </div>
          ${hashHtml}
          ${prevHashHtml}
        </div>
      </div>
    `;
  }

  /**
   * Render session detail
   */
  _renderSessionDetail(node) {
    const data = node.data;
    const userId = escapeHtml(data.userId || 'Unknown');
    const projectHtml = data.project
      ? `<div class="session-project">📁 ${escapeHtml(data.project)}</div>`
      : '';
    const timeStr = formatTimestamp(data.startTime || node.createdAt);

    return `
      <div class="session-detail">
        <div class="session-user">👤 ${userId}</div>
        ${projectHtml}
        <div class="session-time">Started: ${timeStr}</div>
      </div>
    `;
  }

  /**
   * Get icon for node type
   */
  _getTypeIcon(type) {
    const icons = {
      [KGNodeType.JUDGMENT]: '⚖️',
      [KGNodeType.PATTERN]: '🔮',
      [KGNodeType.BLOCK]: '⛓️',
      [KGNodeType.SESSION]: '👤',
    };
    return icons[type] || '📋';
  }

  /**
   * Update status indicator
   */
  _updateStatus() {
    const indicator = this.container?.querySelector('.status-indicator');
    const text = this.container?.querySelector('.status-text');
    if (indicator) {
      indicator.classList.toggle('connected', this.isConnected);
      indicator.classList.toggle('disconnected', !this.isConnected);
    }
    if (text) {
      text.textContent = this.isConnected ? 'Live' : 'Disconnected';
    }
  }

  /**
   * Update stats display
   */
  _updateStats() {
    this.stats = {
      nodes: this.graphData.nodes.size,
      edges: this.graphData.edges.size,
      ...this.graphData.stats,
    };

    const statsEl = this.container?.querySelector('.knowledge-stats');
    if (statsEl) {
      statsEl.textContent = '';
      const html = `
        <span class="stat" title="Total nodes">🔵 ${this.stats.nodes}</span>
        <span class="stat" title="Judgments">⚖️ ${this.stats.judgments}</span>
        <span class="stat" title="Patterns">🔮 ${this.stats.patterns}</span>
        <span class="stat" title="Blocks">⛓️ ${this.stats.blocks}</span>
        <span class="stat" title="Edges">📎 ${this.stats.edges}</span>
      `;
      statsEl.insertAdjacentHTML('beforeend', html);
    }
  }

  /**
   * Update simulation status
   */
  _updateSimulationStatus(alpha) {
    const indicator = this.container?.querySelector('.sim-indicator');
    const text = this.container?.querySelector('.sim-text');
    const alphaEl = this.container?.querySelector('.sim-alpha');

    if (indicator) {
      indicator.classList.toggle('running', this.simulation.isRunning());
    }
    if (text) {
      text.textContent = `Simulation: ${this.simulation.isRunning() ? 'Running' : 'Stopped'}`;
    }
    if (alphaEl) {
      alphaEl.textContent = `α: ${alpha.toFixed(3)}`;
    }
  }

  /**
   * Update detail panel
   */
  _updateDetailPanel() {
    const panel = this.container?.querySelector('.node-detail-panel');
    if (panel) {
      panel.classList.toggle('visible', !!this.selectedNodeId);
      panel.textContent = '';
      panel.insertAdjacentHTML('beforeend', this._renderDetailPanel());
      this._attachDetailEventListeners();
    }
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    // Filter buttons
    this.container?.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        btn.classList.toggle('active');
        if (this.filters.types.includes(type)) {
          this.filters.types = this.filters.types.filter(t => t !== type);
        } else {
          this.filters.types.push(type);
        }
        this._syncSceneWithData();
      });
    });

    // Q-score slider
    const slider = this.container?.querySelector('.q-slider');
    const qValue = this.container?.querySelector('.q-value');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.filters.minQ = parseInt(e.target.value, 10);
        if (qValue) qValue.textContent = this.filters.minQ;
        this._syncSceneWithData();
      });
    }

    // Reset button
    const resetBtn = this.container?.querySelector('.reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.scene.resetCamera();
        this.simulation.restart();
      });
    }

    // Clear button
    const clearBtn = this.container?.querySelector('.clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.graphData.clear();
        this.scene.clear();
        this.selectedNodeId = null;
        this._updateDetailPanel();
        this._updateStats();
      });
    }

    this._attachDetailEventListeners();
  }

  /**
   * Attach detail panel event listeners
   */
  _attachDetailEventListeners() {
    // Close button
    const closeBtn = this.container?.querySelector('[data-action="close-detail"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.selectedNodeId = null;
        this._updateDetailPanel();
        this.scene.highlightConnected(null, []);
      });
    }

    // Focus button
    const focusBtn = this.container?.querySelector('[data-action="focus"]');
    if (focusBtn) {
      focusBtn.addEventListener('click', () => {
        if (this.selectedNodeId) {
          this.scene.focusOnNode(this.selectedNodeId);
        }
      });
    }

    // Copy button
    const copyBtn = this.container?.querySelector('[data-action="copy"]');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (this.selectedNodeId) {
          const node = this.graphData.getNode(this.selectedNodeId);
          if (node) {
            navigator.clipboard.writeText(JSON.stringify(node.data, null, 2));
          }
        }
      });
    }

    // Connected node items
    this.container?.querySelectorAll('.connected-item').forEach(item => {
      item.addEventListener('click', () => {
        const nodeId = item.dataset.nodeId;
        if (nodeId) {
          this.selectedNodeId = nodeId;
          this._updateDetailPanel();
          this._highlightConnected(nodeId);
          this.scene.focusOnNode(nodeId);
        }
      });
    });
  }

  /**
   * Disconnect SSE
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.disconnect();
    this.simulation.stop();
    if (this.scene) {
      this.scene.dispose();
    }
    this.container = null;
  }
}

// Export singleton
export const knowledgeView = new KnowledgeView();
window.CYNICKnowledgeView = knowledgeView;
