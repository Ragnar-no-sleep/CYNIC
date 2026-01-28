/**
 * CYNIC Dashboard - Resilience View
 * Phase 21 - Circuit Breakers health, states, and statistics
 *
 * "φ protects against cascading failures" - κυνικός
 */

import { Utils } from '../lib/utils.js';

/**
 * Circuit breaker states with colors
 */
const CIRCUIT_STATES = {
  CLOSED: { label: 'Closed', color: '#22c55e', icon: '✅', description: 'Operating normally' },
  OPEN: { label: 'Open', color: '#ef4444', icon: '🚫', description: 'Circuit tripped - blocking calls' },
  HALF_OPEN: { label: 'Half-Open', color: '#eab308', icon: '⚠️', description: 'Testing if service recovered' },
};

/**
 * φ-aligned thresholds
 */
const PHI_THRESHOLDS = {
  FAILURE_RATE: 0.618,     // φ⁻¹ = 61.8% failure threshold
  HEALTH_GOOD: 0.382,      // φ⁻² = 38.2% or less failures = good
  SAMPLE_WINDOW: 13,       // Fibonacci number
};

export class ResilienceView {
  constructor(options = {}) {
    this.api = options.api || null;
    this.container = null;
    this.circuits = {};
    this.stats = null;
    this.refreshInterval = null;
  }

  /**
   * Render resilience view
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('resilience-view');

    // Header
    const header = Utils.createElement('div', { className: 'resilience-header' }, [
      Utils.createElement('div', { className: 'resilience-title' }, [
        Utils.createElement('h1', {}, ['⚡ System Resilience']),
        Utils.createElement('span', { className: 'resilience-subtitle' }, [
          'Circuit breakers protecting against cascading failures',
        ]),
      ]),
      Utils.createElement('button', {
        className: 'refresh-btn',
        onClick: () => this.refresh(),
      }, ['🔄 Refresh']),
    ]);

    // Health summary
    const healthSummary = Utils.createElement('div', {
      className: 'health-summary',
      id: 'health-summary',
    });

    // Circuit breakers grid
    const circuitsGrid = Utils.createElement('div', {
      className: 'circuits-grid',
      id: 'circuits-grid',
    });

    // Stats section
    const statsSection = Utils.createElement('div', {
      className: 'resilience-stats',
      id: 'resilience-stats',
    });

    container.appendChild(header);
    container.appendChild(healthSummary);
    container.appendChild(circuitsGrid);
    container.appendChild(statsSection);

    // Load data
    this._loadHealth();

    // Auto-refresh every 10 seconds
    this.refreshInterval = setInterval(() => this._loadHealth(), 10000);
  }

  /**
   * Render health summary
   */
  _renderHealthSummary(data) {
    const container = document.getElementById('health-summary');
    if (!container) return;

    Utils.clearElement(container);

    const healthy = data.healthy !== false;
    const healthIcon = healthy ? '💚' : '💔';
    const healthClass = healthy ? 'health-good' : 'health-bad';

    const circuitCount = Object.keys(data.circuits || {}).length;
    const openCircuits = Object.values(data.circuits || {}).filter(c => c.state === 'OPEN').length;

    const summary = Utils.createElement('div', { className: `health-card ${healthClass}` }, [
      Utils.createElement('div', { className: 'health-icon' }, [healthIcon]),
      Utils.createElement('div', { className: 'health-info' }, [
        Utils.createElement('h2', {}, [healthy ? 'System Healthy' : 'System Degraded']),
        Utils.createElement('p', {}, [data.summary || `${circuitCount} circuits monitored`]),
        openCircuits > 0 && Utils.createElement('p', { className: 'health-warning' }, [
          `⚠️ ${openCircuits} circuit(s) currently open`,
        ]),
      ].filter(Boolean)),
      Utils.createElement('div', { className: 'health-stats' }, [
        this._createHealthStat('Total', circuitCount, '🔌'),
        this._createHealthStat('Open', openCircuits, '🚫'),
        this._createHealthStat('Healthy', circuitCount - openCircuits, '✅'),
      ]),
    ]);

    container.appendChild(summary);
  }

  /**
   * Create health stat element
   */
  _createHealthStat(label, value, icon) {
    return Utils.createElement('div', { className: 'health-stat' }, [
      Utils.createElement('span', { className: 'stat-icon' }, [icon]),
      Utils.createElement('span', { className: 'stat-value' }, [String(value)]),
      Utils.createElement('span', { className: 'stat-label' }, [label]),
    ]);
  }

  /**
   * Render circuits grid
   */
  _renderCircuitsGrid(circuits) {
    const container = document.getElementById('circuits-grid');
    if (!container) return;

    Utils.clearElement(container);

    const header = Utils.createElement('h3', { className: 'section-title' }, ['Circuit Breakers']);
    container.appendChild(header);

    if (!circuits || Object.keys(circuits).length === 0) {
      container.appendChild(
        Utils.createElement('div', { className: 'empty-state' }, [
          Utils.createElement('span', { className: 'empty-icon' }, ['⚡']),
          Utils.createElement('p', {}, ['No circuit breakers registered yet.']),
          Utils.createElement('p', { className: 'empty-hint' }, [
            'Circuit breakers are created as CYNIC processes requests.',
          ]),
        ])
      );
      return;
    }

    const grid = Utils.createElement('div', { className: 'circuits-list' });

    for (const [name, circuit] of Object.entries(circuits)) {
      grid.appendChild(this._renderCircuitCard(name, circuit));
    }

    container.appendChild(grid);
  }

  /**
   * Render a circuit breaker card
   */
  _renderCircuitCard(name, circuit) {
    const state = CIRCUIT_STATES[circuit.state] || CIRCUIT_STATES.CLOSED;
    const failureRate = circuit.failureRate || 0;
    const failurePercent = Math.round(failureRate * 100);

    // Determine health based on φ thresholds
    let healthClass = 'circuit-good';
    if (circuit.state === 'OPEN') {
      healthClass = 'circuit-bad';
    } else if (failureRate > PHI_THRESHOLDS.HEALTH_GOOD) {
      healthClass = 'circuit-warning';
    }

    return Utils.createElement('div', {
      className: `circuit-card ${healthClass}`,
    }, [
      Utils.createElement('div', { className: 'circuit-header' }, [
        Utils.createElement('span', { className: 'circuit-icon' }, [state.icon]),
        Utils.createElement('span', { className: 'circuit-name' }, [this._formatCircuitName(name)]),
        Utils.createElement('span', {
          className: 'circuit-state',
          style: `color: ${state.color}`,
        }, [state.label]),
      ]),
      Utils.createElement('p', { className: 'circuit-description' }, [state.description]),
      Utils.createElement('div', { className: 'circuit-metrics' }, [
        this._createMetric('Successes', circuit.successes || 0, '#22c55e'),
        this._createMetric('Failures', circuit.failures || 0, '#ef4444'),
        this._createMetric('Failure Rate', `${failurePercent}%`, failureRate > PHI_THRESHOLDS.FAILURE_RATE ? '#ef4444' : '#6b7280'),
      ]),
      Utils.createElement('div', { className: 'failure-bar' }, [
        Utils.createElement('div', {
          className: 'failure-fill',
          style: `width: ${failurePercent}%; background: ${failureRate > PHI_THRESHOLDS.FAILURE_RATE ? '#ef4444' : failureRate > PHI_THRESHOLDS.HEALTH_GOOD ? '#eab308' : '#22c55e'}`,
        }),
        Utils.createElement('span', { className: 'threshold-marker', style: `left: ${PHI_THRESHOLDS.FAILURE_RATE * 100}%` }, [
          Utils.createElement('span', { className: 'threshold-label' }, ['φ⁻¹']),
        ]),
      ]),
    ]);
  }

  /**
   * Format circuit name for display
   */
  _formatCircuitName(name) {
    return name
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Create metric element
   */
  _createMetric(label, value, color) {
    return Utils.createElement('div', { className: 'circuit-metric' }, [
      Utils.createElement('span', { className: 'metric-value', style: `color: ${color}` }, [String(value)]),
      Utils.createElement('span', { className: 'metric-label' }, [label]),
    ]);
  }

  /**
   * Render stats section
   */
  _renderStats(stats) {
    const container = document.getElementById('resilience-stats');
    if (!container) return;

    Utils.clearElement(container);

    const header = Utils.createElement('h3', { className: 'section-title' }, ['Statistics']);
    container.appendChild(header);

    if (!stats) {
      container.appendChild(
        Utils.createElement('div', { className: 'empty-state' }, [
          Utils.createElement('p', {}, ['Statistics will appear after processing begins.']),
        ])
      );
      return;
    }

    const statsGrid = Utils.createElement('div', { className: 'stats-grid' }, [
      this._createStatCard('Total Requests', stats.totalRequests || 0, '📊'),
      this._createStatCard('Success Rate', `${Math.round((stats.successRate || 0) * 100)}%`, '✅'),
      this._createStatCard('Circuit Trips', stats.circuitTrips || 0, '⚡'),
      this._createStatCard('Recovery Time', stats.avgRecoveryTime ? `${Math.round(stats.avgRecoveryTime / 1000)}s` : 'N/A', '⏱️'),
    ]);

    container.appendChild(statsGrid);
  }

  /**
   * Create stat card
   */
  _createStatCard(label, value, icon) {
    return Utils.createElement('div', { className: 'stat-card' }, [
      Utils.createElement('span', { className: 'stat-icon' }, [icon]),
      Utils.createElement('div', { className: 'stat-content' }, [
        Utils.createElement('span', { className: 'stat-value' }, [String(value)]),
        Utils.createElement('span', { className: 'stat-label' }, [label]),
      ]),
    ]);
  }

  /**
   * Load health data from API
   */
  async _loadHealth() {
    if (!this.api) {
      this._renderMockData();
      return;
    }

    try {
      const result = await this.api.callTool('brain_circuit_breaker', {});
      if (result) {
        this._renderHealthSummary(result);
        this._renderCircuitsGrid(result.circuits);
      }

      // Load stats
      const statsResult = await this.api.callTool('brain_circuit_breaker', { action: 'stats' });
      if (statsResult) {
        this._renderStats(statsResult.orchestratorStats || statsResult);
      }
    } catch (err) {
      console.warn('Failed to load resilience data:', err);
      this._renderMockData();
    }
  }

  /**
   * Render mock data when API unavailable
   */
  _renderMockData() {
    const mockData = {
      healthy: true,
      summary: 'All circuits operating normally',
      circuits: {
        judgment: { state: 'CLOSED', successes: 42, failures: 2, failureRate: 0.045 },
        synthesis: { state: 'CLOSED', successes: 38, failures: 1, failureRate: 0.026 },
        skill: { state: 'CLOSED', successes: 15, failures: 0, failureRate: 0 },
      },
    };

    this._renderHealthSummary(mockData);
    this._renderCircuitsGrid(mockData.circuits);
    this._renderStats({
      totalRequests: 98,
      successRate: 0.97,
      circuitTrips: 0,
    });
  }

  /**
   * Refresh data
   */
  async refresh() {
    await this._loadHealth();
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
  }
}

// Export to window
window.CYNICResilienceView = ResilienceView;
