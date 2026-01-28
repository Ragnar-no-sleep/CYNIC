/**
 * CYNIC Dashboard - Decisions View
 * Phase 21 - Decision timeline, traces, and outcomes
 *
 * "Every decision is traced, every trace tells a story" - κυνικός
 */

import { Utils } from '../lib/utils.js';

/**
 * Decision outcomes with colors
 */
const DECISION_OUTCOMES = {
  allow: { label: 'Allow', color: '#22c55e', icon: '✅' },
  block: { label: 'Block', color: '#ef4444', icon: '🚫' },
  warn: { label: 'Warn', color: '#eab308', icon: '⚠️' },
  pending: { label: 'Pending', color: '#6b7280', icon: '⏳' },
};

/**
 * Event types
 */
const EVENT_TYPES = {
  user_prompt: { label: 'User Prompt', icon: '💬' },
  tool_use: { label: 'Tool Use', icon: '🔧' },
  tool_result: { label: 'Tool Result', icon: '📋' },
  session_start: { label: 'Session Start', icon: '🌅' },
  session_end: { label: 'Session End', icon: '🌙' },
  judgment_request: { label: 'Judgment', icon: '⚖️' },
};

export class DecisionsView {
  constructor(options = {}) {
    this.api = options.api || null;
    this.container = null;
    this.decisions = [];
    this.selectedDecision = null;
    this.filters = {
      outcome: 'all',
      eventType: 'all',
    };
    this.refreshInterval = null;
  }

  /**
   * Render decisions view
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('decisions-view');

    // Header
    const header = Utils.createElement('div', { className: 'decisions-header' }, [
      Utils.createElement('div', { className: 'decisions-title' }, [
        Utils.createElement('h1', {}, ['🧠 Decision Tracing']),
        Utils.createElement('span', { className: 'decisions-subtitle' }, [
          'Every orchestration decision recorded and traceable',
        ]),
      ]),
      Utils.createElement('button', {
        className: 'refresh-btn',
        onClick: () => this.refresh(),
      }, ['🔄 Refresh']),
    ]);

    // Summary stats
    const summarySection = Utils.createElement('div', {
      className: 'decisions-summary',
      id: 'decisions-summary',
    });

    // Filters
    const filtersSection = Utils.createElement('div', { className: 'decisions-filters' }, [
      this._createFilterGroup('Outcome', 'outcome', [
        { value: 'all', label: 'All' },
        { value: 'allow', label: '✅ Allow' },
        { value: 'block', label: '🚫 Block' },
        { value: 'warn', label: '⚠️ Warn' },
      ]),
      this._createFilterGroup('Event Type', 'eventType', [
        { value: 'all', label: 'All' },
        { value: 'tool_use', label: '🔧 Tool Use' },
        { value: 'user_prompt', label: '💬 Prompt' },
        { value: 'session_end', label: '🌙 Session End' },
      ]),
    ]);

    // Main content area
    const contentArea = Utils.createElement('div', { className: 'decisions-content' }, [
      // Timeline
      Utils.createElement('div', {
        className: 'decisions-timeline',
        id: 'decisions-timeline',
      }),
      // Detail panel
      Utils.createElement('div', {
        className: 'decision-detail',
        id: 'decision-detail',
      }),
    ]);

    container.appendChild(header);
    container.appendChild(summarySection);
    container.appendChild(filtersSection);
    container.appendChild(contentArea);

    // Load data
    this._loadDecisions();

    // Auto-refresh every 15 seconds
    this.refreshInterval = setInterval(() => this._loadDecisions(), 15000);
  }

  /**
   * Create filter group
   */
  _createFilterGroup(label, filterKey, options) {
    const group = Utils.createElement('div', { className: 'filter-group' }, [
      Utils.createElement('label', {}, [label]),
      Utils.createElement('select', {
        className: 'filter-select',
        onChange: (e) => {
          this.filters[filterKey] = e.target.value;
          this._renderTimeline();
        },
      }, options.map(opt =>
        Utils.createElement('option', { value: opt.value }, [opt.label])
      )),
    ]);
    return group;
  }

  /**
   * Render summary stats
   */
  _renderSummary(summary) {
    const container = document.getElementById('decisions-summary');
    if (!container) return;

    Utils.clearElement(container);

    const stats = summary || this._calculateStats();

    const summaryEl = Utils.createElement('div', { className: 'summary-cards' }, [
      this._createSummaryCard('Total Decisions', stats.total || 0, '📊'),
      this._createSummaryCard('Allowed', stats.allowed || 0, '✅'),
      this._createSummaryCard('Blocked', stats.blocked || 0, '🚫'),
      this._createSummaryCard('Warnings', stats.warned || 0, '⚠️'),
      this._createSummaryCard('Avg Q-Score', stats.avgQScore ? Math.round(stats.avgQScore) : 'N/A', '⭐'),
    ]);

    container.appendChild(summaryEl);
  }

  /**
   * Calculate stats from decisions
   */
  _calculateStats() {
    const stats = {
      total: this.decisions.length,
      allowed: 0,
      blocked: 0,
      warned: 0,
      totalQScore: 0,
      qScoreCount: 0,
    };

    for (const d of this.decisions) {
      if (d.outcome === 'allow') stats.allowed++;
      else if (d.outcome === 'block') stats.blocked++;
      else if (d.outcome === 'warn') stats.warned++;

      if (d.qScore !== undefined) {
        stats.totalQScore += d.qScore;
        stats.qScoreCount++;
      }
    }

    stats.avgQScore = stats.qScoreCount > 0 ? stats.totalQScore / stats.qScoreCount : null;
    return stats;
  }

  /**
   * Create summary card
   */
  _createSummaryCard(label, value, icon) {
    return Utils.createElement('div', { className: 'summary-card' }, [
      Utils.createElement('span', { className: 'summary-icon' }, [icon]),
      Utils.createElement('div', { className: 'summary-content' }, [
        Utils.createElement('span', { className: 'summary-value' }, [String(value)]),
        Utils.createElement('span', { className: 'summary-label' }, [label]),
      ]),
    ]);
  }

  /**
   * Render timeline
   */
  _renderTimeline() {
    const container = document.getElementById('decisions-timeline');
    if (!container) return;

    Utils.clearElement(container);

    const header = Utils.createElement('h3', { className: 'section-title' }, ['Decision Timeline']);
    container.appendChild(header);

    // Filter decisions
    let filtered = this.decisions;
    if (this.filters.outcome !== 'all') {
      filtered = filtered.filter(d => d.outcome === this.filters.outcome);
    }
    if (this.filters.eventType !== 'all') {
      filtered = filtered.filter(d => d.eventType === this.filters.eventType);
    }

    if (filtered.length === 0) {
      container.appendChild(
        Utils.createElement('div', { className: 'empty-state' }, [
          Utils.createElement('span', { className: 'empty-icon' }, ['🧠']),
          Utils.createElement('p', {}, ['No decisions recorded yet.']),
          Utils.createElement('p', { className: 'empty-hint' }, [
            'Decisions are traced as CYNIC processes requests.',
          ]),
        ])
      );
      return;
    }

    const timeline = Utils.createElement('div', { className: 'timeline-list' });

    for (const decision of filtered.slice(0, 50)) {
      timeline.appendChild(this._renderDecisionItem(decision));
    }

    container.appendChild(timeline);
  }

  /**
   * Render decision item
   */
  _renderDecisionItem(decision) {
    const outcome = DECISION_OUTCOMES[decision.outcome] || DECISION_OUTCOMES.pending;
    const eventType = EVENT_TYPES[decision.eventType] || { label: decision.eventType, icon: '📋' };
    const isSelected = this.selectedDecision?.id === decision.id;

    const item = Utils.createElement('div', {
      className: `timeline-item ${isSelected ? 'selected' : ''} outcome-${decision.outcome}`,
      onClick: () => this._selectDecision(decision),
    }, [
      Utils.createElement('div', { className: 'timeline-marker', style: `background: ${outcome.color}` }),
      Utils.createElement('div', { className: 'timeline-content' }, [
        Utils.createElement('div', { className: 'timeline-header' }, [
          Utils.createElement('span', { className: 'timeline-icon' }, [eventType.icon]),
          Utils.createElement('span', { className: 'timeline-type' }, [eventType.label]),
          Utils.createElement('span', {
            className: 'timeline-outcome',
            style: `color: ${outcome.color}`,
          }, [outcome.icon, ' ', outcome.label]),
        ]),
        Utils.createElement('div', { className: 'timeline-preview' }, [
          decision.content?.slice(0, 80) || 'No content',
          decision.content?.length > 80 ? '...' : '',
        ]),
        Utils.createElement('div', { className: 'timeline-meta' }, [
          Utils.createElement('span', { className: 'timeline-id' }, [
            decision.id?.slice(0, 8) || 'N/A',
          ]),
          decision.qScore !== undefined && Utils.createElement('span', { className: 'timeline-qscore' }, [
            `Q: ${Math.round(decision.qScore)}`,
          ]),
          Utils.createElement('span', { className: 'timeline-time' }, [
            Utils.formatTime(decision.timestamp),
          ]),
        ].filter(Boolean)),
      ]),
    ]);

    return item;
  }

  /**
   * Select a decision to show details
   */
  _selectDecision(decision) {
    this.selectedDecision = decision;
    this._renderTimeline();
    this._renderDetail(decision);
  }

  /**
   * Render decision detail panel
   */
  _renderDetail(decision) {
    const container = document.getElementById('decision-detail');
    if (!container) return;

    Utils.clearElement(container);

    if (!decision) {
      container.appendChild(
        Utils.createElement('div', { className: 'detail-placeholder' }, [
          Utils.createElement('p', {}, ['Select a decision to view details']),
        ])
      );
      return;
    }

    const outcome = DECISION_OUTCOMES[decision.outcome] || DECISION_OUTCOMES.pending;
    const eventType = EVENT_TYPES[decision.eventType] || { label: decision.eventType, icon: '📋' };

    const detail = Utils.createElement('div', { className: 'detail-content' }, [
      // Header
      Utils.createElement('div', { className: 'detail-header' }, [
        Utils.createElement('h3', {}, ['Decision Details']),
        Utils.createElement('span', {
          className: 'detail-outcome',
          style: `background: ${outcome.color}`,
        }, [outcome.icon, ' ', outcome.label]),
      ]),

      // ID and timestamp
      Utils.createElement('div', { className: 'detail-section' }, [
        Utils.createElement('label', {}, ['Decision ID']),
        Utils.createElement('code', { className: 'detail-id' }, [decision.id || 'N/A']),
      ]),

      // Event type
      Utils.createElement('div', { className: 'detail-section' }, [
        Utils.createElement('label', {}, ['Event Type']),
        Utils.createElement('span', {}, [eventType.icon, ' ', eventType.label]),
      ]),

      // Content
      Utils.createElement('div', { className: 'detail-section' }, [
        Utils.createElement('label', {}, ['Content']),
        Utils.createElement('pre', { className: 'detail-content-text' }, [
          decision.content || 'No content',
        ]),
      ]),

      // Q-Score
      decision.qScore !== undefined && Utils.createElement('div', { className: 'detail-section' }, [
        Utils.createElement('label', {}, ['Q-Score']),
        Utils.createElement('div', { className: 'qscore-display' }, [
          Utils.createElement('div', { className: 'qscore-bar' }, [
            Utils.createElement('div', {
              className: 'qscore-fill',
              style: `width: ${decision.qScore}%; background: ${decision.qScore >= 70 ? '#22c55e' : decision.qScore >= 50 ? '#eab308' : '#ef4444'}`,
            }),
          ]),
          Utils.createElement('span', { className: 'qscore-value' }, [`${Math.round(decision.qScore)}/100`]),
        ]),
      ]),

      // Reasoning
      decision.reasoning && Utils.createElement('div', { className: 'detail-section' }, [
        Utils.createElement('label', {}, ['Reasoning']),
        Utils.createElement('ul', { className: 'reasoning-list' },
          (Array.isArray(decision.reasoning) ? decision.reasoning : [decision.reasoning])
            .map(r => Utils.createElement('li', {}, [r]))
        ),
      ]),

      // Domain/Sefirah
      decision.domain && Utils.createElement('div', { className: 'detail-section' }, [
        Utils.createElement('label', {}, ['Domain']),
        Utils.createElement('span', {}, [decision.domain]),
      ]),

      // Timestamp
      Utils.createElement('div', { className: 'detail-section' }, [
        Utils.createElement('label', {}, ['Timestamp']),
        Utils.createElement('span', {}, [new Date(decision.timestamp).toLocaleString()]),
      ]),

      // Trace button
      Utils.createElement('button', {
        className: 'trace-btn',
        onClick: () => this._loadTrace(decision.id),
      }, ['🔍 Load Full Trace']),
    ].filter(Boolean));

    container.appendChild(detail);
  }

  /**
   * Load full trace for a decision
   */
  async _loadTrace(decisionId) {
    if (!this.api || !decisionId) return;

    try {
      const result = await this.api.callTool('brain_decisions', {
        query: 'trace',
        decisionId,
      });

      if (result?.trace) {
        this._showTraceModal(result.trace);
      }
    } catch (err) {
      console.warn('Failed to load trace:', err);
    }
  }

  /**
   * Show trace in modal (simplified)
   */
  _showTraceModal(trace) {
    console.log('Full trace:', trace);
    alert(`Trace loaded: ${JSON.stringify(trace, null, 2).slice(0, 500)}...`);
  }

  /**
   * Load decisions from API
   */
  async _loadDecisions() {
    if (!this.api) {
      this._renderMockData();
      return;
    }

    try {
      const result = await this.api.callTool('brain_decisions', {
        limit: 100,
      });

      if (result?.decisions) {
        this.decisions = result.decisions;
        this._renderSummary();
        this._renderTimeline();
      }

      // Load summary stats
      const summaryResult = await this.api.callTool('brain_decisions', {
        query: 'summary',
      });

      if (summaryResult?.memory) {
        this._renderSummary(summaryResult.memory);
      }
    } catch (err) {
      console.warn('Failed to load decisions:', err);
      this._renderMockData();
    }
  }

  /**
   * Render mock data when API unavailable
   */
  _renderMockData() {
    const now = Date.now();
    this.decisions = [
      { id: 'dec-001', eventType: 'tool_use', content: 'Bash: rm -rf /tmp/test', outcome: 'block', qScore: 25, reasoning: ['Dangerous command detected'], timestamp: now - 60000 },
      { id: 'dec-002', eventType: 'tool_use', content: 'Bash: echo test', outcome: 'allow', qScore: 85, timestamp: now - 120000 },
      { id: 'dec-003', eventType: 'user_prompt', content: 'Design a new API structure', outcome: 'allow', qScore: 72, domain: 'Binah', timestamp: now - 180000 },
      { id: 'dec-004', eventType: 'tool_result', content: 'Write: SUCCESS', outcome: 'allow', qScore: 90, timestamp: now - 240000 },
      { id: 'dec-005', eventType: 'session_end', content: 'Session ended: 42 tools, 2 errors', outcome: 'warn', qScore: 65, reasoning: ['Session had errors'], timestamp: now - 300000 },
    ];

    this._renderSummary();
    this._renderTimeline();
  }

  /**
   * Refresh data
   */
  async refresh() {
    await this._loadDecisions();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.container = null;
    this.selectedDecision = null;
  }
}

// Export to window
window.CYNICDecisionsView = DecisionsView;
