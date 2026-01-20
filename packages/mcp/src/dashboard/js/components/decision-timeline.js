/**
 * CYNIC Dashboard - Decision Timeline Component
 * Phase 2.4.1 - Track all CYNIC decisions, overrides, and consensus outcomes
 *
 * "φ distrusts φ" - κυνικός
 */

import { Utils } from '../lib/utils.js';

// PHI for proportions
const PHI = 1.618033988749895;

// Decision types and colors
const DECISION_TYPES = {
  judgment: { color: '#4ecdc4', icon: '⚖️', label: 'Judgment' },
  override: { color: '#ff6b6b', icon: '🛑', label: 'Override' },
  consensus: { color: '#ffd93d', icon: '🤝', label: 'Consensus' },
  hook: { color: '#667eea', icon: '🪝', label: 'Hook' },
  trigger: { color: '#f093fb', icon: '⚡', label: 'Trigger' },
};

// Verdict colors
const VERDICT_COLORS = {
  HOWL: '#00ff88',
  WAG: '#4ecdc4',
  GROWL: '#ffd93d',
  BARK: '#ff6b6b',
  BLOCKED: '#ff0000',
  ALLOWED: '#00ff88',
};

export class DecisionTimeline {
  constructor(options = {}) {
    this.api = options.api || null;
    this.onDecisionSelect = options.onDecisionSelect || (() => {});
    this.container = null;
    this.decisions = [];
    this.selectedDecisionId = null;
    this.filters = {
      types: Object.keys(DECISION_TYPES),
      search: '',
      dateRange: { start: null, end: null },
    };
    this.sortBy = 'recent';  // 'recent', 'qScore', 'type'
    this.loading = false;
  }

  /**
   * Render decision timeline
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('decision-timeline');

    // Header with filters
    const header = Utils.createElement('div', { className: 'decision-header' }, [
      Utils.createElement('div', { className: 'decision-title' }, [
        Utils.createElement('span', { className: 'title-icon' }, ['🧠']),
        'Decision Timeline',
        Utils.createElement('span', { className: 'decision-count', id: 'decision-count' }, ['0']),
      ]),
      this._createFilters(),
    ]);

    // Stats bar
    const statsBar = Utils.createElement('div', {
      className: 'decision-stats-bar',
      id: 'decision-stats-bar',
    });

    // Timeline
    const timeline = Utils.createElement('div', {
      className: 'decision-timeline-track',
      id: 'decision-timeline-track',
    });

    // Detail panel
    const detailPanel = Utils.createElement('div', {
      className: 'decision-detail-panel',
      id: 'decision-detail-panel',
    });

    container.appendChild(header);
    container.appendChild(statsBar);
    container.appendChild(timeline);
    container.appendChild(detailPanel);

    // Initial load
    this.refresh();
  }

  /**
   * Create filter controls
   */
  _createFilters() {
    const filters = Utils.createElement('div', { className: 'decision-filters' });

    // Type filter buttons
    const typeFilters = Utils.createElement('div', { className: 'type-filters' });
    Object.entries(DECISION_TYPES).forEach(([type, info]) => {
      const btn = Utils.createElement('button', {
        className: `type-filter-btn ${this.filters.types.includes(type) ? 'active' : ''}`,
        dataset: { type },
        style: `--type-color: ${info.color}`,
        onClick: () => this._toggleTypeFilter(type),
      }, [
        Utils.createElement('span', { className: 'type-icon' }, [info.icon]),
        Utils.createElement('span', { className: 'type-label' }, [info.label]),
      ]);
      typeFilters.appendChild(btn);
    });

    // Sort selector
    const sortSelect = Utils.createElement('select', {
      className: 'decision-sort-select',
      onChange: (e) => this._setSort(e.target.value),
    }, [
      Utils.createElement('option', { value: 'recent' }, ['Most recent']),
      Utils.createElement('option', { value: 'qScore' }, ['By Q-Score']),
      Utils.createElement('option', { value: 'type' }, ['By type']),
    ]);

    // Refresh button
    const refreshBtn = Utils.createElement('button', {
      className: 'decision-refresh-btn',
      onClick: () => this.refresh(),
    }, ['↻']);

    filters.appendChild(typeFilters);
    filters.appendChild(sortSelect);
    filters.appendChild(refreshBtn);

    return filters;
  }

  /**
   * Toggle type filter
   */
  _toggleTypeFilter(type) {
    const idx = this.filters.types.indexOf(type);
    if (idx >= 0) {
      this.filters.types.splice(idx, 1);
    } else {
      this.filters.types.push(type);
    }

    // Update button states
    this.container?.querySelectorAll('.type-filter-btn').forEach(btn => {
      btn.classList.toggle('active', this.filters.types.includes(btn.dataset.type));
    });

    this._renderTimeline();
  }

  /**
   * Set sort order
   */
  _setSort(sortBy) {
    this.sortBy = sortBy;
    this._renderTimeline();
  }

  /**
   * Refresh decisions from API
   */
  async refresh() {
    if (!this.api) return;

    this.loading = true;
    this._renderLoading();

    try {
      // Fetch judgments, patterns, and search for hook/trigger events
      const [judgmentsResult, patternsResult, searchResult] = await Promise.all([
        this.api.search('', 'judgment', 50),
        this.api.patterns('all', 20),
        this.api.search('hook OR override OR trigger OR consensus', 'all', 30),
      ]);

      this.decisions = [];

      // Add judgments as decisions
      if (judgmentsResult.success && judgmentsResult.result?.results) {
        judgmentsResult.result.results.forEach(j => {
          this.decisions.push({
            id: j.id || `jdg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'judgment',
            timestamp: j.timestamp || Date.now(),
            verdict: j.verdict,
            qScore: j.Q || j.qScore || 0,
            confidence: j.confidence || 0.618,
            data: j,
          });
        });
      }

      // Add pattern detections as trigger decisions
      if (patternsResult.success && patternsResult.result?.patterns) {
        patternsResult.result.patterns.forEach(p => {
          this.decisions.push({
            id: p.id || `pat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'trigger',
            timestamp: p.lastSeen || p.timestamp || Date.now(),
            category: p.category,
            data: p,
          });
        });
      }

      // Parse search results for hooks/overrides
      if (searchResult.success && searchResult.result?.results) {
        searchResult.result.results.forEach(r => {
          if (r.type === 'judgment') return;  // Already added

          const isOverride = r.content?.includes('override') || r.content?.includes('blocked');
          const isHook = r.content?.includes('hook');
          const isConsensus = r.content?.includes('consensus');

          this.decisions.push({
            id: r.id || `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: isOverride ? 'override' : isHook ? 'hook' : isConsensus ? 'consensus' : 'judgment',
            timestamp: r.timestamp || Date.now(),
            data: r,
          });
        });
      }

    } catch (err) {
      console.error('Failed to fetch decisions:', err);
    }

    this.loading = false;
    this._renderStats();
    this._renderTimeline();
    this._updateCount();
  }

  /**
   * Render loading state
   */
  _renderLoading() {
    const track = document.getElementById('decision-timeline-track');
    if (track) {
      Utils.clearElement(track);
      track.appendChild(
        Utils.createElement('div', { className: 'decision-loading' }, [
          Utils.createElement('span', { className: 'loading-spinner' }),
          'Loading decisions...',
        ])
      );
    }
  }

  /**
   * Render stats bar
   */
  _renderStats() {
    const statsBar = document.getElementById('decision-stats-bar');
    if (!statsBar) return;

    Utils.clearElement(statsBar);

    // Count by type
    const typeCounts = {};
    let totalQScore = 0;
    let qScoreCount = 0;
    let overrideCount = 0;

    this.decisions.forEach(d => {
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
      if (d.qScore !== undefined) {
        totalQScore += d.qScore;
        qScoreCount++;
      }
      if (d.type === 'override') overrideCount++;
    });

    const avgQScore = qScoreCount > 0 ? totalQScore / qScoreCount : 0;

    // Render type breakdown
    Object.entries(DECISION_TYPES).forEach(([type, info]) => {
      const count = typeCounts[type] || 0;
      statsBar.appendChild(
        Utils.createElement('div', {
          className: 'stat-item',
          style: `--stat-color: ${info.color}`,
        }, [
          Utils.createElement('span', { className: 'stat-icon' }, [info.icon]),
          Utils.createElement('span', { className: 'stat-value' }, [String(count)]),
        ])
      );
    });

    // Avg Q-Score
    statsBar.appendChild(
      Utils.createElement('div', { className: 'stat-item stat-qscore' }, [
        Utils.createElement('span', { className: 'stat-label' }, ['Avg Q']),
        Utils.createElement('span', {
          className: 'stat-value',
          style: `color: ${this._qScoreColor(avgQScore)}`,
        }, [avgQScore.toFixed(1)]),
      ])
    );

    // Override rate
    const overrideRate = this.decisions.length > 0
      ? (overrideCount / this.decisions.length * 100).toFixed(1)
      : 0;
    statsBar.appendChild(
      Utils.createElement('div', { className: 'stat-item stat-override' }, [
        Utils.createElement('span', { className: 'stat-label' }, ['Override']),
        Utils.createElement('span', {
          className: 'stat-value',
          style: `color: ${overrideRate > 10 ? '#ff6b6b' : '#4ecdc4'}`,
        }, [`${overrideRate}%`]),
      ])
    );
  }

  /**
   * Render timeline
   */
  _renderTimeline() {
    const track = document.getElementById('decision-timeline-track');
    if (!track) return;

    Utils.clearElement(track);

    // Filter decisions
    let filtered = this.decisions.filter(d => this.filters.types.includes(d.type));

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (this.sortBy) {
        case 'recent':
          return b.timestamp - a.timestamp;
        case 'qScore':
          return (b.qScore || 0) - (a.qScore || 0);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    if (filtered.length === 0) {
      track.appendChild(
        Utils.createElement('div', { className: 'decision-empty' }, [
          Utils.createElement('span', { className: 'empty-icon' }, ['🧠']),
          'No decisions found',
          Utils.createElement('span', { className: 'empty-hint' }, [
            'Decisions will appear as CYNIC makes judgments and processes events',
          ]),
        ])
      );
      return;
    }

    // Group by day
    const grouped = this._groupByDay(filtered);

    Object.entries(grouped).forEach(([day, dayDecisions]) => {
      // Day header
      const dayHeader = Utils.createElement('div', { className: 'day-header' }, [
        Utils.createElement('span', { className: 'day-date' }, [day]),
        Utils.createElement('span', { className: 'day-count' }, [`${dayDecisions.length} decisions`]),
      ]);
      track.appendChild(dayHeader);

      // Day decisions
      const dayTrack = Utils.createElement('div', { className: 'day-track' });
      dayDecisions.forEach(decision => {
        dayTrack.appendChild(this._createDecisionCard(decision));
      });
      track.appendChild(dayTrack);
    });
  }

  /**
   * Group decisions by day
   */
  _groupByDay(decisions) {
    const grouped = {};
    decisions.forEach(d => {
      const date = new Date(d.timestamp);
      const day = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(d);
    });
    return grouped;
  }

  /**
   * Create decision card
   */
  _createDecisionCard(decision) {
    const typeInfo = DECISION_TYPES[decision.type] || DECISION_TYPES.judgment;
    const isSelected = decision.id === this.selectedDecisionId;

    const card = Utils.createElement('div', {
      className: `decision-card ${decision.type} ${isSelected ? 'selected' : ''}`,
      style: `--decision-color: ${typeInfo.color}`,
      onClick: () => this._selectDecision(decision),
    }, [
      // Icon
      Utils.createElement('div', { className: 'decision-icon' }, [typeInfo.icon]),

      // Content
      Utils.createElement('div', { className: 'decision-content' }, [
        // Type and time
        Utils.createElement('div', { className: 'decision-meta' }, [
          Utils.createElement('span', { className: 'decision-type' }, [typeInfo.label]),
          Utils.createElement('span', { className: 'decision-time' }, [
            Utils.formatTime(decision.timestamp),
          ]),
        ]),

        // Summary
        Utils.createElement('div', { className: 'decision-summary' }, [
          this._getDecisionSummary(decision),
        ]),

        // Verdict/Q-Score if available
        decision.verdict || decision.qScore !== undefined ?
          Utils.createElement('div', { className: 'decision-verdict-row' }, [
            decision.verdict ? Utils.createElement('span', {
              className: 'decision-verdict',
              style: `color: ${VERDICT_COLORS[decision.verdict] || '#888'}`,
            }, [decision.verdict]) : null,
            decision.qScore !== undefined ? Utils.createElement('span', {
              className: 'decision-qscore',
              style: `color: ${this._qScoreColor(decision.qScore)}`,
            }, [`Q: ${decision.qScore.toFixed(1)}`]) : null,
          ].filter(Boolean)) : null,
      ].filter(Boolean)),

      // Q-Score bar
      decision.qScore !== undefined ? Utils.createElement('div', { className: 'decision-qbar' }, [
        Utils.createElement('div', {
          className: 'decision-qbar-fill',
          style: `width: ${decision.qScore}%; background: ${this._qScoreColor(decision.qScore)}`,
        }),
      ]) : null,
    ].filter(Boolean));

    return card;
  }

  /**
   * Get decision summary text
   */
  _getDecisionSummary(decision) {
    switch (decision.type) {
      case 'judgment':
        return decision.data?.item?.content?.slice(0, 80) || 'Judgment processed';
      case 'override':
        return decision.data?.reason || 'Decision overridden';
      case 'consensus':
        return `${decision.data?.agents || '?'} agents agreed`;
      case 'hook':
        return decision.data?.hook || 'Hook triggered';
      case 'trigger':
        return `${decision.category || 'Pattern'}: ${decision.data?.description || 'detected'}`;
      default:
        return 'Decision recorded';
    }
  }

  /**
   * Q-Score to color
   */
  _qScoreColor(qScore) {
    if (qScore >= 70) return '#00ff88';
    if (qScore >= 40) return '#ffd93d';
    return '#ff6b6b';
  }

  /**
   * Select decision
   */
  _selectDecision(decision) {
    this.selectedDecisionId = decision.id;
    this._renderTimeline();
    this._renderDetail(decision);
    this.onDecisionSelect(decision);
  }

  /**
   * Render decision detail
   */
  _renderDetail(decision) {
    const panel = document.getElementById('decision-detail-panel');
    if (!panel) return;

    Utils.clearElement(panel);
    panel.classList.add('visible');

    const typeInfo = DECISION_TYPES[decision.type] || DECISION_TYPES.judgment;

    const detail = Utils.createElement('div', { className: 'detail-content' }, [
      // Header
      Utils.createElement('div', { className: 'detail-header' }, [
        Utils.createElement('div', { className: 'detail-type' }, [
          Utils.createElement('span', {
            className: 'detail-icon',
            style: `color: ${typeInfo.color}`,
          }, [typeInfo.icon]),
          Utils.createElement('span', { className: 'detail-label' }, [typeInfo.label]),
        ]),
        Utils.createElement('button', {
          className: 'detail-close',
          onClick: () => this._hideDetail(),
        }, ['✕']),
      ]),

      // Timestamp
      Utils.createElement('div', { className: 'detail-timestamp' }, [
        new Date(decision.timestamp).toLocaleString(),
      ]),

      // Verdict and Q-Score
      decision.verdict || decision.qScore !== undefined ?
        Utils.createElement('div', { className: 'detail-verdict-section' }, [
          decision.verdict ? Utils.createElement('div', {
            className: `detail-verdict verdict-${decision.verdict.toLowerCase()}`,
          }, [decision.verdict]) : null,
          decision.qScore !== undefined ? Utils.createElement('div', { className: 'detail-qscore' }, [
            Utils.createElement('span', { className: 'qscore-label' }, ['Q-Score']),
            Utils.createElement('span', {
              className: 'qscore-value',
              style: `color: ${this._qScoreColor(decision.qScore)}`,
            }, [decision.qScore.toFixed(2)]),
          ]) : null,
        ].filter(Boolean)) : null,

      // Breakdown if available
      decision.data?.breakdown ? this._renderBreakdown(decision.data.breakdown) : null,

      // Raw data
      Utils.createElement('div', { className: 'detail-raw' }, [
        Utils.createElement('div', { className: 'raw-label' }, ['Raw Data']),
        Utils.createElement('pre', { className: 'raw-json' }, [
          JSON.stringify(decision.data, null, 2),
        ]),
      ]),
    ].filter(Boolean));

    panel.appendChild(detail);
  }

  /**
   * Render axiom breakdown
   */
  _renderBreakdown(breakdown) {
    const section = Utils.createElement('div', { className: 'detail-breakdown' }, [
      Utils.createElement('div', { className: 'breakdown-label' }, ['Axiom Breakdown']),
    ]);

    const axiomColors = {
      PHI: '#4ecdc4',
      VERIFY: '#667eea',
      CULTURE: '#f093fb',
      BURN: '#ffd93d',
    };

    Object.entries(breakdown).forEach(([axiom, score]) => {
      const row = Utils.createElement('div', { className: 'breakdown-row' }, [
        Utils.createElement('span', { className: 'breakdown-axiom' }, [axiom]),
        Utils.createElement('div', { className: 'breakdown-bar' }, [
          Utils.createElement('div', {
            className: 'breakdown-fill',
            style: `width: ${(score / 25) * 100}%; background: ${axiomColors[axiom] || '#888'}`,
          }),
        ]),
        Utils.createElement('span', { className: 'breakdown-score' }, [score.toFixed(1)]),
      ]);
      section.appendChild(row);
    });

    return section;
  }

  /**
   * Hide detail panel
   */
  _hideDetail() {
    const panel = document.getElementById('decision-detail-panel');
    if (panel) {
      panel.classList.remove('visible');
    }
    this.selectedDecisionId = null;
    this._renderTimeline();
  }

  /**
   * Update decision count
   */
  _updateCount() {
    const countEl = document.getElementById('decision-count');
    if (countEl) {
      countEl.textContent = String(this.decisions.length);
    }
  }

  /**
   * Add decision (from SSE)
   */
  addDecision(decision) {
    this.decisions.unshift(decision);
    this._renderStats();
    this._renderTimeline();
    this._updateCount();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.container = null;
    this.decisions = [];
  }
}

// Export to window
window.CYNICDecisionTimeline = DecisionTimeline;
