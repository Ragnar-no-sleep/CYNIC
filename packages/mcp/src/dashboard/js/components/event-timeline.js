/**
 * CYNIC Dashboard - Event Timeline Component
 * Phase 2.2.3 - Event replay, timeline visualization, decision analysis
 *
 * "φ distrusts φ" - κυνικός
 */

import { Utils } from '../lib/utils.js';

// PHI for proportions
const PHI = 1.618033988749895;

// Event type colors
const EVENT_COLORS = {
  judgment: '#4ecdc4',  // Teal
  pattern: '#f093fb',   // Pink
  block: '#ffd700',     // Gold
  tool: '#667eea',      // Purple
  event: '#888888',     // Gray
};

// Event type icons
const EVENT_ICONS = {
  judgment: '⚖️',
  pattern: '🔮',
  block: '⛓️',
  tool: '🔧',
  event: '📡',
};

// Verdict colors for decisions
const VERDICT_COLORS = {
  HOWL: '#00ff88',   // Strong positive - green
  WAG: '#4ecdc4',    // Positive - teal
  GROWL: '#ffd93d',  // Warning - gold
  BARK: '#ff6b6b',   // Negative - red
};

export class EventTimeline {
  constructor(options = {}) {
    this.onEventSelect = options.onEventSelect || (() => {});
    this.onReplayTick = options.onReplayTick || (() => {});
    this.container = null;
    this.events = [];
    this.decisions = [];  // Filtered events that are judgments/decisions
    this.selectedEventId = null;
    this.selectedRange = { start: null, end: null };

    // Replay state
    this.isReplaying = false;
    this.replayIndex = 0;
    this.replaySpeed = 1000;  // ms between events
    this.replayInterval = null;

    // Timeline state
    this.timeRange = { start: Date.now() - 3600000, end: Date.now() };  // Last hour
    this.zoom = 1;
    this.scrollOffset = 0;
  }

  /**
   * Render event timeline
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('event-timeline');

    // Header with controls
    const header = Utils.createElement('div', { className: 'timeline-header' }, [
      Utils.createElement('div', { className: 'timeline-title' }, ['🎬 Event Timeline']),
      Utils.createElement('div', { className: 'timeline-controls' }, [
        this._createReplayControls(),
        this._createZoomControls(),
        this._createSpeedControl(),
      ]),
    ]);

    // Timeline track
    const track = Utils.createElement('div', { className: 'timeline-track' }, [
      Utils.createElement('div', { className: 'timeline-ruler', id: 'timeline-ruler' }),
      Utils.createElement('div', { className: 'timeline-events', id: 'timeline-events' }),
      Utils.createElement('div', { className: 'timeline-playhead', id: 'timeline-playhead' }),
      Utils.createElement('div', { className: 'timeline-selection', id: 'timeline-selection' }),
    ]);

    // Decision analysis panel
    const analysisPanel = Utils.createElement('div', {
      className: 'decision-analysis-panel',
      id: 'decision-analysis-panel',
    });

    // Stats bar
    const statsBar = Utils.createElement('div', {
      className: 'timeline-stats-bar',
      id: 'timeline-stats-bar',
    });

    container.appendChild(header);
    container.appendChild(track);
    container.appendChild(statsBar);
    container.appendChild(analysisPanel);

    this._renderTimeline();
    this._renderStats();
    this._attachEventListeners();
  }

  /**
   * Create replay controls
   */
  _createReplayControls() {
    const controls = Utils.createElement('div', { className: 'replay-controls' });

    // Rewind button
    controls.appendChild(Utils.createElement('button', {
      className: 'replay-btn',
      id: 'replay-rewind',
      title: 'Rewind to start',
      onClick: () => this._rewind(),
    }, ['⏮']));

    // Step back
    controls.appendChild(Utils.createElement('button', {
      className: 'replay-btn',
      id: 'replay-step-back',
      title: 'Step back',
      onClick: () => this._stepBack(),
    }, ['⏪']));

    // Play/Pause
    controls.appendChild(Utils.createElement('button', {
      className: 'replay-btn play-btn',
      id: 'replay-play',
      title: 'Play/Pause',
      onClick: () => this._togglePlay(),
    }, ['▶']));

    // Step forward
    controls.appendChild(Utils.createElement('button', {
      className: 'replay-btn',
      id: 'replay-step-forward',
      title: 'Step forward',
      onClick: () => this._stepForward(),
    }, ['⏩']));

    // Jump to end
    controls.appendChild(Utils.createElement('button', {
      className: 'replay-btn',
      id: 'replay-end',
      title: 'Jump to end',
      onClick: () => this._jumpToEnd(),
    }, ['⏭']));

    return controls;
  }

  /**
   * Create zoom controls
   */
  _createZoomControls() {
    const controls = Utils.createElement('div', { className: 'zoom-controls' });

    controls.appendChild(Utils.createElement('button', {
      className: 'zoom-btn',
      title: 'Zoom out',
      onClick: () => this._zoom(-0.2),
    }, ['−']));

    controls.appendChild(Utils.createElement('span', {
      className: 'zoom-level',
      id: 'zoom-level',
    }, [`${Math.round(this.zoom * 100)}%`]));

    controls.appendChild(Utils.createElement('button', {
      className: 'zoom-btn',
      title: 'Zoom in',
      onClick: () => this._zoom(0.2),
    }, ['+']));

    return controls;
  }

  /**
   * Create speed control
   */
  _createSpeedControl() {
    const container = Utils.createElement('div', { className: 'speed-control' });

    const label = Utils.createElement('span', { className: 'speed-label' }, ['Speed:']);

    const select = Utils.createElement('select', {
      className: 'speed-select',
      onChange: (e) => this._setSpeed(parseInt(e.target.value)),
    });

    const speeds = [
      { value: 2000, label: '0.5x' },
      { value: 1000, label: '1x' },
      { value: 500, label: '2x' },
      { value: 250, label: '4x' },
      { value: 100, label: '10x' },
    ];

    speeds.forEach(s => {
      const opt = Utils.createElement('option', {
        value: String(s.value),
        selected: this.replaySpeed === s.value,
      }, [s.label]);
      select.appendChild(opt);
    });

    container.appendChild(label);
    container.appendChild(select);
    return container;
  }

  /**
   * Render timeline with events
   */
  _renderTimeline() {
    this._renderRuler();
    this._renderEvents();
    this._updatePlayhead();
  }

  /**
   * Render time ruler
   */
  _renderRuler() {
    const ruler = document.getElementById('timeline-ruler');
    if (!ruler) return;

    Utils.clearElement(ruler);

    const duration = this.timeRange.end - this.timeRange.start;
    const tickInterval = this._calculateTickInterval(duration);
    const tickCount = Math.ceil(duration / tickInterval);

    for (let i = 0; i <= tickCount; i++) {
      const time = this.timeRange.start + i * tickInterval;
      const position = ((time - this.timeRange.start) / duration) * 100;

      const tick = Utils.createElement('div', {
        className: 'ruler-tick',
        style: `left: ${position}%`,
      }, [
        Utils.createElement('span', { className: 'tick-line' }),
        Utils.createElement('span', { className: 'tick-label' }, [
          this._formatTimeLabel(time),
        ]),
      ]);

      ruler.appendChild(tick);
    }
  }

  /**
   * Calculate tick interval based on duration
   */
  _calculateTickInterval(duration) {
    const minutes = duration / 60000;
    if (minutes <= 5) return 30000;      // 30 seconds
    if (minutes <= 15) return 60000;     // 1 minute
    if (minutes <= 60) return 300000;    // 5 minutes
    if (minutes <= 180) return 600000;   // 10 minutes
    return 1800000;                       // 30 minutes
  }

  /**
   * Format time label
   */
  _formatTimeLabel(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Render events on timeline
   */
  _renderEvents() {
    const eventsContainer = document.getElementById('timeline-events');
    if (!eventsContainer) return;

    Utils.clearElement(eventsContainer);

    const duration = this.timeRange.end - this.timeRange.start;

    this.events.forEach((event, index) => {
      const position = ((event.timestamp - this.timeRange.start) / duration) * 100;

      // Skip events outside visible range
      if (position < 0 || position > 100) return;

      const color = EVENT_COLORS[event.type] || EVENT_COLORS.event;
      const icon = EVENT_ICONS[event.type] || EVENT_ICONS.event;
      const isSelected = event.id === this.selectedEventId;
      const isInRange = this._isInSelectedRange(event);
      const isDecision = event.type === 'judgment';

      const marker = Utils.createElement('div', {
        className: `event-marker ${event.type} ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''} ${isDecision ? 'decision' : ''}`,
        style: `left: ${position}%; --event-color: ${color}`,
        dataset: { eventId: event.id, index: String(index) },
        onClick: () => this._selectEvent(event),
      }, [
        Utils.createElement('span', { className: 'marker-icon' }, [icon]),
        isDecision && event.data?.verdict ? Utils.createElement('span', {
          className: 'marker-verdict',
          style: `color: ${VERDICT_COLORS[event.data.verdict] || '#888'}`,
        }, [event.data.verdict.charAt(0)]) : null,
      ].filter(Boolean));

      // Tooltip
      marker.title = `${event.type}: ${this._getEventSummary(event)}`;

      eventsContainer.appendChild(marker);
    });

    // Add lane dividers for event types
    this._renderLanes(eventsContainer);
  }

  /**
   * Render lanes for event types
   */
  _renderLanes(container) {
    const lanes = ['judgment', 'pattern', 'block', 'tool'];
    lanes.forEach((type, index) => {
      const lane = Utils.createElement('div', {
        className: `timeline-lane ${type}`,
        style: `top: ${index * 25}%`,
      }, [
        Utils.createElement('span', { className: 'lane-label' }, [
          EVENT_ICONS[type],
        ]),
      ]);
      container.appendChild(lane);
    });
  }

  /**
   * Get event summary
   */
  _getEventSummary(event) {
    switch (event.type) {
      case 'judgment':
        return `${event.data?.verdict || 'UNKNOWN'} (Q=${event.data?.Q?.toFixed(1) || '?'})`;
      case 'pattern':
        return `${event.data?.category || 'Pattern'}`;
      case 'block':
        return `Block #${event.data?.blockNumber || event.data?.slot || '?'}`;
      case 'tool':
        return `${event.data?.tool || 'Tool'}`;
      default:
        return event.type;
    }
  }

  /**
   * Update playhead position
   */
  _updatePlayhead() {
    const playhead = document.getElementById('timeline-playhead');
    if (!playhead || this.events.length === 0) return;

    const currentEvent = this.events[this.replayIndex];
    if (!currentEvent) return;

    const duration = this.timeRange.end - this.timeRange.start;
    const position = ((currentEvent.timestamp - this.timeRange.start) / duration) * 100;

    playhead.style.left = `${Math.max(0, Math.min(100, position))}%`;
    playhead.classList.toggle('visible', true);
  }

  /**
   * Render stats bar
   */
  _renderStats() {
    const statsBar = document.getElementById('timeline-stats-bar');
    if (!statsBar) return;

    Utils.clearElement(statsBar);

    // Count by type
    const counts = {};
    let decisionCount = 0;
    let avgQScore = 0;
    let qScoreCount = 0;

    this.events.forEach(e => {
      counts[e.type] = (counts[e.type] || 0) + 1;
      if (e.type === 'judgment') {
        decisionCount++;
        if (e.data?.Q !== undefined) {
          avgQScore += e.data.Q;
          qScoreCount++;
        }
      }
    });

    if (qScoreCount > 0) avgQScore /= qScoreCount;

    const stats = [
      { label: 'Events', value: this.events.length, color: '#888' },
      { label: 'Decisions', value: decisionCount, color: '#4ecdc4' },
      { label: 'Avg Q', value: avgQScore.toFixed(1), color: '#ffd93d' },
      { label: 'Duration', value: this._formatDuration(this.timeRange.end - this.timeRange.start), color: '#667eea' },
    ];

    stats.forEach(stat => {
      statsBar.appendChild(
        Utils.createElement('div', { className: 'timeline-stat' }, [
          Utils.createElement('span', { className: 'stat-label' }, [stat.label]),
          Utils.createElement('span', {
            className: 'stat-value',
            style: `color: ${stat.color}`,
          }, [String(stat.value)]),
        ])
      );
    });

    // Type breakdown
    const breakdown = Utils.createElement('div', { className: 'type-breakdown' });
    Object.entries(counts).forEach(([type, count]) => {
      breakdown.appendChild(
        Utils.createElement('span', {
          className: 'type-count',
          style: `color: ${EVENT_COLORS[type] || '#888'}`,
        }, [`${EVENT_ICONS[type] || '📋'} ${count}`])
      );
    });
    statsBar.appendChild(breakdown);
  }

  /**
   * Format duration
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Render decision analysis panel
   */
  _renderDecisionAnalysis() {
    const panel = document.getElementById('decision-analysis-panel');
    if (!panel) return;

    Utils.clearElement(panel);

    // Get decisions in selected range or all if no selection
    const decisions = this._getDecisionsInRange();

    if (decisions.length === 0) {
      panel.appendChild(
        Utils.createElement('div', { className: 'analysis-empty' }, [
          Utils.createElement('span', { className: 'analysis-icon' }, ['📊']),
          'Select events or judgment to analyze decisions',
        ])
      );
      return;
    }

    // Header
    const header = Utils.createElement('div', { className: 'analysis-header' }, [
      Utils.createElement('h3', {}, [`📊 Decision Analysis (${decisions.length})`]),
      Utils.createElement('button', {
        className: 'analysis-close',
        onClick: () => this._clearSelection(),
      }, ['✕']),
    ]);

    // Verdict distribution
    const verdictDist = this._calculateVerdictDistribution(decisions);
    const verdictChart = Utils.createElement('div', { className: 'verdict-distribution' }, [
      Utils.createElement('h4', {}, ['Verdict Distribution']),
      ...Object.entries(verdictDist).map(([verdict, count]) => {
        const pct = (count / decisions.length) * 100;
        return Utils.createElement('div', { className: 'verdict-bar-row' }, [
          Utils.createElement('span', {
            className: 'verdict-label',
            style: `color: ${VERDICT_COLORS[verdict] || '#888'}`,
          }, [verdict]),
          Utils.createElement('div', { className: 'verdict-bar' }, [
            Utils.createElement('div', {
              className: 'verdict-fill',
              style: `width: ${pct}%; background: ${VERDICT_COLORS[verdict] || '#888'}`,
            }),
          ]),
          Utils.createElement('span', { className: 'verdict-count' }, [`${count} (${pct.toFixed(0)}%)`]),
        ]);
      }),
    ]);

    // Q-Score trend
    const qScoreTrend = this._calculateQScoreTrend(decisions);
    const trendChart = Utils.createElement('div', { className: 'qscore-trend' }, [
      Utils.createElement('h4', {}, ['Q-Score Trend']),
      Utils.createElement('div', { className: 'trend-sparkline' }, [
        this._createSparkline(qScoreTrend),
      ]),
      Utils.createElement('div', { className: 'trend-stats' }, [
        Utils.createElement('span', {}, [`Min: ${qScoreTrend.min.toFixed(1)}`]),
        Utils.createElement('span', {}, [`Max: ${qScoreTrend.max.toFixed(1)}`]),
        Utils.createElement('span', {}, [`Avg: ${qScoreTrend.avg.toFixed(1)}`]),
      ]),
    ]);

    // Decision list
    const decisionList = Utils.createElement('div', { className: 'decision-list' }, [
      Utils.createElement('h4', {}, ['Decisions']),
      ...decisions.slice(0, 10).map(d => this._createDecisionItem(d)),
      decisions.length > 10 ? Utils.createElement('div', { className: 'more-decisions' }, [
        `+${decisions.length - 10} more...`,
      ]) : null,
    ].filter(Boolean));

    panel.appendChild(header);
    panel.appendChild(verdictChart);
    panel.appendChild(trendChart);
    panel.appendChild(decisionList);
    panel.classList.add('visible');
  }

  /**
   * Create decision item
   */
  _createDecisionItem(decision) {
    const verdict = decision.data?.verdict || 'UNKNOWN';
    const q = decision.data?.Q || 0;
    const time = Utils.formatTime(decision.timestamp);

    return Utils.createElement('div', {
      className: `decision-item verdict-${verdict.toLowerCase()}`,
      onClick: () => this._selectEvent(decision),
    }, [
      Utils.createElement('span', {
        className: 'decision-verdict',
        style: `color: ${VERDICT_COLORS[verdict] || '#888'}`,
      }, [verdict]),
      Utils.createElement('span', { className: 'decision-q' }, [`Q: ${q.toFixed(1)}`]),
      Utils.createElement('span', { className: 'decision-time' }, [time]),
    ]);
  }

  /**
   * Create sparkline SVG
   */
  _createSparkline(data) {
    if (!data.values || data.values.length < 2) {
      return Utils.createElement('span', { className: 'no-data' }, ['Insufficient data']);
    }

    const width = 200;
    const height = 40;
    const values = data.values;
    const min = data.min;
    const max = data.max;
    const range = max - min || 1;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('class', 'sparkline-svg');

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#4ecdc4');
    polyline.setAttribute('stroke-width', '2');

    svg.appendChild(polyline);
    return svg;
  }

  /**
   * Get decisions in selected range
   */
  _getDecisionsInRange() {
    const decisions = this.events.filter(e => e.type === 'judgment');

    if (this.selectedRange.start && this.selectedRange.end) {
      return decisions.filter(d =>
        d.timestamp >= this.selectedRange.start &&
        d.timestamp <= this.selectedRange.end
      );
    }

    if (this.selectedEventId) {
      return decisions.filter(d => d.id === this.selectedEventId);
    }

    return decisions;
  }

  /**
   * Calculate verdict distribution
   */
  _calculateVerdictDistribution(decisions) {
    const dist = {};
    decisions.forEach(d => {
      const verdict = d.data?.verdict || 'UNKNOWN';
      dist[verdict] = (dist[verdict] || 0) + 1;
    });
    return dist;
  }

  /**
   * Calculate Q-Score trend
   */
  _calculateQScoreTrend(decisions) {
    const values = decisions
      .filter(d => d.data?.Q !== undefined)
      .map(d => d.data.Q);

    if (values.length === 0) {
      return { values: [], min: 0, max: 100, avg: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return { values, min, max, avg };
  }

  /**
   * Check if event is in selected range
   */
  _isInSelectedRange(event) {
    if (!this.selectedRange.start || !this.selectedRange.end) return false;
    return event.timestamp >= this.selectedRange.start &&
           event.timestamp <= this.selectedRange.end;
  }

  /**
   * Select event
   */
  _selectEvent(event) {
    this.selectedEventId = event.id;
    this.replayIndex = this.events.findIndex(e => e.id === event.id);
    this._renderEvents();
    this._updatePlayhead();
    this._renderDecisionAnalysis();
    this.onEventSelect(event);
  }

  /**
   * Clear selection
   */
  _clearSelection() {
    this.selectedEventId = null;
    this.selectedRange = { start: null, end: null };
    this._renderEvents();
    const panel = document.getElementById('decision-analysis-panel');
    if (panel) panel.classList.remove('visible');
  }

  // ===== Replay Controls =====

  /**
   * Toggle play/pause
   */
  _togglePlay() {
    if (this.isReplaying) {
      this._pause();
    } else {
      this._play();
    }
  }

  /**
   * Start replay
   */
  _play() {
    if (this.events.length === 0) return;

    this.isReplaying = true;
    this._updatePlayButton();

    this.replayInterval = setInterval(() => {
      if (this.replayIndex >= this.events.length - 1) {
        this._pause();
        return;
      }
      this._stepForward();
    }, this.replaySpeed);
  }

  /**
   * Pause replay
   */
  _pause() {
    this.isReplaying = false;
    if (this.replayInterval) {
      clearInterval(this.replayInterval);
      this.replayInterval = null;
    }
    this._updatePlayButton();
  }

  /**
   * Step forward one event
   */
  _stepForward() {
    if (this.replayIndex >= this.events.length - 1) return;

    this.replayIndex++;
    const event = this.events[this.replayIndex];
    this.selectedEventId = event.id;

    this._renderEvents();
    this._updatePlayhead();
    this.onReplayTick(event, this.replayIndex);
  }

  /**
   * Step back one event
   */
  _stepBack() {
    if (this.replayIndex <= 0) return;

    this.replayIndex--;
    const event = this.events[this.replayIndex];
    this.selectedEventId = event.id;

    this._renderEvents();
    this._updatePlayhead();
    this.onReplayTick(event, this.replayIndex);
  }

  /**
   * Rewind to start
   */
  _rewind() {
    this._pause();
    this.replayIndex = 0;
    if (this.events.length > 0) {
      this.selectedEventId = this.events[0].id;
    }
    this._renderEvents();
    this._updatePlayhead();
  }

  /**
   * Jump to end
   */
  _jumpToEnd() {
    this._pause();
    this.replayIndex = this.events.length - 1;
    if (this.events.length > 0) {
      this.selectedEventId = this.events[this.replayIndex].id;
    }
    this._renderEvents();
    this._updatePlayhead();
  }

  /**
   * Set replay speed
   */
  _setSpeed(speed) {
    this.replaySpeed = speed;
    if (this.isReplaying) {
      this._pause();
      this._play();
    }
  }

  /**
   * Update play button state
   */
  _updatePlayButton() {
    const btn = document.getElementById('replay-play');
    if (btn) {
      btn.textContent = this.isReplaying ? '⏸' : '▶';
      btn.classList.toggle('playing', this.isReplaying);
    }
  }

  // ===== Zoom Controls =====

  /**
   * Zoom timeline
   */
  _zoom(delta) {
    this.zoom = Math.max(0.5, Math.min(4, this.zoom + delta));
    const zoomLabel = document.getElementById('zoom-level');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
    this._adjustTimeRange();
    this._renderTimeline();
  }

  /**
   * Adjust time range based on zoom
   */
  _adjustTimeRange() {
    const center = (this.timeRange.start + this.timeRange.end) / 2;
    const baseDuration = 3600000;  // 1 hour base
    const newDuration = baseDuration / this.zoom;

    this.timeRange.start = center - newDuration / 2;
    this.timeRange.end = center + newDuration / 2;
  }

  // ===== Event Listeners =====

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    const track = this.container?.querySelector('.timeline-track');
    if (!track) return;

    // Click on track to seek
    track.addEventListener('click', (e) => {
      if (e.target.closest('.event-marker')) return;  // Handled by marker

      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;

      const duration = this.timeRange.end - this.timeRange.start;
      const targetTime = this.timeRange.start + duration * pct;

      // Find closest event
      const closest = this._findClosestEvent(targetTime);
      if (closest) {
        this._selectEvent(closest);
      }
    });

    // Drag for range selection
    let isDragging = false;
    let dragStart = null;

    track.addEventListener('mousedown', (e) => {
      if (e.target.closest('.event-marker')) return;
      isDragging = true;

      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      const duration = this.timeRange.end - this.timeRange.start;

      dragStart = this.timeRange.start + duration * pct;
      this.selectedRange.start = dragStart;
      this.selectedRange.end = dragStart;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !track) return;

      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = x / rect.width;
      const duration = this.timeRange.end - this.timeRange.start;
      const currentTime = this.timeRange.start + duration * pct;

      this.selectedRange.start = Math.min(dragStart, currentTime);
      this.selectedRange.end = Math.max(dragStart, currentTime);

      this._updateSelection();
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (this.selectedRange.end - this.selectedRange.start > 1000) {  // Min 1 second
          this._renderDecisionAnalysis();
        }
      }
    });
  }

  /**
   * Update selection visual
   */
  _updateSelection() {
    const selection = document.getElementById('timeline-selection');
    if (!selection) return;

    if (!this.selectedRange.start || !this.selectedRange.end) {
      selection.style.display = 'none';
      return;
    }

    const duration = this.timeRange.end - this.timeRange.start;
    const left = ((this.selectedRange.start - this.timeRange.start) / duration) * 100;
    const right = ((this.selectedRange.end - this.timeRange.start) / duration) * 100;
    const width = right - left;

    selection.style.display = 'block';
    selection.style.left = `${left}%`;
    selection.style.width = `${width}%`;

    this._renderEvents();
  }

  /**
   * Find closest event to timestamp
   */
  _findClosestEvent(timestamp) {
    if (this.events.length === 0) return null;

    return this.events.reduce((closest, event) => {
      const diff = Math.abs(event.timestamp - timestamp);
      const closestDiff = Math.abs(closest.timestamp - timestamp);
      return diff < closestDiff ? event : closest;
    });
  }

  // ===== Public API =====

  /**
   * Update with new events
   */
  update(events) {
    this.events = events.sort((a, b) => a.timestamp - b.timestamp);

    // Update time range to fit events
    if (this.events.length > 0) {
      const firstTime = this.events[0].timestamp;
      const lastTime = this.events[this.events.length - 1].timestamp;
      const padding = (lastTime - firstTime) * 0.1 || 60000;  // 10% padding or 1 min

      this.timeRange.start = firstTime - padding;
      this.timeRange.end = lastTime + padding;
    }

    this._renderTimeline();
    this._renderStats();
  }

  /**
   * Add single event
   */
  addEvent(event) {
    this.events.push(event);
    this.events.sort((a, b) => a.timestamp - b.timestamp);

    // Extend time range if needed
    if (event.timestamp > this.timeRange.end - 60000) {
      this.timeRange.end = event.timestamp + 60000;
    }

    this._renderTimeline();
    this._renderStats();
  }

  /**
   * Cleanup
   */
  destroy() {
    this._pause();
    this.container = null;
    this.events = [];
  }
}

// Export to window
window.CYNICEventTimeline = EventTimeline;
