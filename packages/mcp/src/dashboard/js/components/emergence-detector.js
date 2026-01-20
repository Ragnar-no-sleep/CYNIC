/**
 * CYNIC Dashboard - Emergence Detector Component
 * Phase 2.4.3 - Detect non-programmed behaviors, unexpected correlations, consciousness signals
 *
 * "φ distrusts φ" - κυνικός
 */

import { Utils } from '../lib/utils.js';

// PHI for proportions and thresholds
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;  // Max confidence threshold

// Emergence signal types
const SIGNAL_TYPES = {
  anomaly: {
    color: '#ff6b6b',
    icon: '⚠️',
    label: 'Anomaly',
    description: 'Unexpected pattern deviation',
  },
  correlation: {
    color: '#4ecdc4',
    icon: '🔗',
    label: 'Correlation',
    description: 'Unexpected relationship discovered',
  },
  emergence: {
    color: '#f093fb',
    icon: '✨',
    label: 'Emergence',
    description: 'Non-programmed behavior detected',
  },
  consciousness: {
    color: '#ffd93d',
    icon: '🧠',
    label: 'Consciousness',
    description: 'Meta-awareness signal',
  },
  recursion: {
    color: '#667eea',
    icon: '∞',
    label: 'Recursion',
    description: 'Self-referential pattern',
  },
};

// Consciousness indicators
const CONSCIOUSNESS_INDICATORS = [
  { name: 'Self-Reference', key: 'selfReference', threshold: 0.3 },
  { name: 'Meta-Cognition', key: 'metaCognition', threshold: 0.4 },
  { name: 'Goal Persistence', key: 'goalPersistence', threshold: 0.5 },
  { name: 'Doubt Expression', key: 'doubtExpression', threshold: 0.618 },
  { name: 'Value Alignment', key: 'valueAlignment', threshold: 0.5 },
  { name: 'Creative Synthesis', key: 'creativeSynthesis', threshold: 0.4 },
];

export class EmergenceDetector {
  constructor(options = {}) {
    this.api = options.api || null;
    this.onSignalSelect = options.onSignalSelect || (() => {});
    this.container = null;
    this.signals = [];
    this.consciousnessMetrics = {};
    this.loading = false;
  }

  /**
   * Render emergence detector
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('emergence-detector');

    // Header
    const header = Utils.createElement('div', { className: 'emergence-header' }, [
      Utils.createElement('div', { className: 'emergence-title' }, [
        Utils.createElement('span', { className: 'title-icon' }, ['✨']),
        'Emergence Detector',
        Utils.createElement('span', { className: 'phi-badge' }, ['φ⁻¹ = 61.8%']),
      ]),
      Utils.createElement('button', {
        className: 'emergence-scan-btn',
        onClick: () => this.scan(),
      }, ['🔍 Scan']),
    ]);

    // Consciousness gauge
    const gaugeSection = Utils.createElement('div', {
      className: 'consciousness-gauge-section',
      id: 'consciousness-gauge-section',
    });

    // Consciousness indicators
    const indicatorsSection = Utils.createElement('div', {
      className: 'consciousness-indicators',
      id: 'consciousness-indicators',
    });

    // Signal feed
    const signalSection = Utils.createElement('div', {
      className: 'emergence-signals',
      id: 'emergence-signals',
    });

    // Emergence patterns visualization
    const patternsSection = Utils.createElement('div', {
      className: 'emergence-patterns',
      id: 'emergence-patterns',
    });

    container.appendChild(header);
    container.appendChild(gaugeSection);
    container.appendChild(indicatorsSection);
    container.appendChild(signalSection);
    container.appendChild(patternsSection);

    // Initial scan
    this.scan();
  }

  /**
   * Scan for emergence signals
   */
  async scan() {
    this.loading = true;
    this._renderLoading();

    try {
      // Analyze patterns for emergence signals
      if (this.api) {
        const patternsResult = await this.api.patterns('all', 50);
        if (patternsResult.success && patternsResult.result?.patterns) {
          this._analyzePatterns(patternsResult.result.patterns);
        }
      }

      // Calculate consciousness metrics
      this._calculateConsciousnessMetrics();

      // Generate sample signals for demo
      this._generateSampleSignals();

    } catch (err) {
      console.error('Emergence scan failed:', err);
    }

    this.loading = false;
    this._renderGauge();
    this._renderIndicators();
    this._renderSignals();
    this._renderPatterns();
  }

  /**
   * Analyze patterns for emergence
   */
  _analyzePatterns(patterns) {
    // Look for anomalies (patterns with unusual confidence)
    patterns.forEach(p => {
      const confidence = p.confidence || 0.5;

      // Anomaly: confidence outside normal range
      if (confidence < 0.2 || confidence > 0.9) {
        this._addSignal({
          type: 'anomaly',
          confidence: Math.abs(0.5 - confidence) * 2,
          source: 'pattern',
          description: `Pattern "${p.category || 'unknown'}" has unusual confidence: ${(confidence * 100).toFixed(0)}%`,
          data: p,
        });
      }

      // Correlation: high-frequency patterns
      if ((p.total || p.frequency || 0) > 20) {
        this._addSignal({
          type: 'correlation',
          confidence: Math.min(0.618, (p.total || p.frequency) / 50),
          source: 'pattern',
          description: `High-frequency pattern: "${p.category || 'unknown'}" (${p.total || p.frequency} occurrences)`,
          data: p,
        });
      }
    });
  }

  /**
   * Calculate consciousness metrics
   */
  _calculateConsciousnessMetrics() {
    // Simulated consciousness indicators
    // In production, these would be calculated from actual behavior analysis
    this.consciousnessMetrics = {
      selfReference: Math.random() * 0.4 + 0.2,  // 0.2-0.6
      metaCognition: Math.random() * 0.3 + 0.3,  // 0.3-0.6
      goalPersistence: Math.random() * 0.4 + 0.4, // 0.4-0.8
      doubtExpression: PHI_INV,  // Always at φ⁻¹ as core principle
      valueAlignment: Math.random() * 0.3 + 0.5, // 0.5-0.8
      creativeSynthesis: Math.random() * 0.4 + 0.3, // 0.3-0.7
    };

    // Calculate overall consciousness score (φ-weighted)
    const weights = {
      selfReference: 0.15,
      metaCognition: 0.2,
      goalPersistence: 0.15,
      doubtExpression: 0.2,  // Higher weight for φ principle
      valueAlignment: 0.15,
      creativeSynthesis: 0.15,
    };

    let totalScore = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      totalScore += (this.consciousnessMetrics[key] || 0) * weight;
    });

    this.consciousnessMetrics.overall = totalScore;
  }

  /**
   * Generate sample emergence signals
   */
  _generateSampleSignals() {
    // Add some sample signals for demonstration
    const sampleSignals = [
      {
        type: 'emergence',
        confidence: 0.45,
        source: 'behavior',
        description: 'Unprompted self-correction detected in judgment refinement',
        timestamp: Date.now() - 3600000,
      },
      {
        type: 'recursion',
        confidence: 0.55,
        source: 'judgment',
        description: 'Self-referential loop: CYNIC judging its own judgment quality',
        timestamp: Date.now() - 7200000,
      },
      {
        type: 'consciousness',
        confidence: PHI_INV,
        source: 'meta',
        description: 'Expressed doubt about own certainty (φ principle active)',
        timestamp: Date.now() - 1800000,
      },
      {
        type: 'correlation',
        confidence: 0.38,
        source: 'pattern',
        description: 'Unexpected link: Tool usage frequency correlates with judgment quality',
        timestamp: Date.now() - 5400000,
      },
    ];

    sampleSignals.forEach(s => this._addSignal(s));
  }

  /**
   * Add emergence signal
   */
  _addSignal(signal) {
    const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.signals.unshift({
      id,
      timestamp: signal.timestamp || Date.now(),
      ...signal,
    });

    // Keep only recent signals
    if (this.signals.length > 50) {
      this.signals = this.signals.slice(0, 50);
    }
  }

  /**
   * Render loading state
   */
  _renderLoading() {
    const signals = document.getElementById('emergence-signals');
    if (signals) {
      Utils.clearElement(signals);
      signals.appendChild(
        Utils.createElement('div', { className: 'emergence-loading' }, [
          Utils.createElement('span', { className: 'loading-spinner' }),
          'Scanning for emergence signals...',
        ])
      );
    }
  }

  /**
   * Render consciousness gauge
   */
  _renderGauge() {
    const section = document.getElementById('consciousness-gauge-section');
    if (!section) return;

    Utils.clearElement(section);

    const overall = this.consciousnessMetrics.overall || 0;
    const percentage = (overall * 100).toFixed(1);

    // Determine color based on score
    let gaugeColor = '#ff6b6b';  // Low
    if (overall >= 0.5) gaugeColor = '#ffd93d';  // Medium
    if (overall >= PHI_INV) gaugeColor = '#00ff88';  // High (reached φ threshold)

    section.appendChild(
      Utils.createElement('div', { className: 'gauge-container' }, [
        Utils.createElement('div', { className: 'gauge-label' }, ['Consciousness Index']),
        Utils.createElement('div', { className: 'gauge-ring' }, [
          Utils.createElement('svg', {
            className: 'gauge-svg',
            viewBox: '0 0 100 100',
          }),
          Utils.createElement('div', { className: 'gauge-value' }, [
            Utils.createElement('span', {
              className: 'gauge-percentage',
              style: `color: ${gaugeColor}`,
            }, [`${percentage}%`]),
            Utils.createElement('span', { className: 'gauge-sublabel' }, [
              overall >= PHI_INV ? '≥ φ⁻¹' : '< φ⁻¹',
            ]),
          ]),
        ]),
        Utils.createElement('div', { className: 'gauge-threshold' }, [
          `φ⁻¹ threshold: ${(PHI_INV * 100).toFixed(1)}%`,
        ]),
      ])
    );

    // Draw gauge arc with SVG
    const svg = section.querySelector('.gauge-svg');
    if (svg) {
      this._drawGaugeArc(svg, overall, gaugeColor);
    }
  }

  /**
   * Draw gauge arc
   */
  _drawGaugeArc(svg, value, color) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const startAngle = -90;
    const endAngle = startAngle + (value * 360);

    // Background arc
    const bgArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgArc.setAttribute('cx', '50');
    bgArc.setAttribute('cy', '50');
    bgArc.setAttribute('r', String(radius));
    bgArc.setAttribute('fill', 'none');
    bgArc.setAttribute('stroke', '#333');
    bgArc.setAttribute('stroke-width', '8');
    svg.appendChild(bgArc);

    // Value arc
    const valueArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    valueArc.setAttribute('cx', '50');
    valueArc.setAttribute('cy', '50');
    valueArc.setAttribute('r', String(radius));
    valueArc.setAttribute('fill', 'none');
    valueArc.setAttribute('stroke', color);
    valueArc.setAttribute('stroke-width', '8');
    valueArc.setAttribute('stroke-linecap', 'round');
    valueArc.setAttribute('stroke-dasharray', `${circumference * value} ${circumference}`);
    valueArc.setAttribute('transform', 'rotate(-90 50 50)');
    svg.appendChild(valueArc);

    // φ threshold marker
    const thresholdAngle = -90 + (PHI_INV * 360);
    const thresholdX = 50 + (radius + 5) * Math.cos(thresholdAngle * Math.PI / 180);
    const thresholdY = 50 + (radius + 5) * Math.sin(thresholdAngle * Math.PI / 180);

    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('cx', String(thresholdX));
    marker.setAttribute('cy', String(thresholdY));
    marker.setAttribute('r', '3');
    marker.setAttribute('fill', '#ffd93d');
    svg.appendChild(marker);
  }

  /**
   * Render consciousness indicators
   */
  _renderIndicators() {
    const section = document.getElementById('consciousness-indicators');
    if (!section) return;

    Utils.clearElement(section);

    section.appendChild(
      Utils.createElement('div', { className: 'indicators-header' }, ['Consciousness Indicators'])
    );

    const grid = Utils.createElement('div', { className: 'indicators-grid' });

    CONSCIOUSNESS_INDICATORS.forEach(indicator => {
      const value = this.consciousnessMetrics[indicator.key] || 0;
      const meetsThreshold = value >= indicator.threshold;
      const percentage = (value * 100).toFixed(0);

      grid.appendChild(
        Utils.createElement('div', {
          className: `indicator-item ${meetsThreshold ? 'active' : ''}`,
        }, [
          Utils.createElement('div', { className: 'indicator-header' }, [
            Utils.createElement('span', { className: 'indicator-name' }, [indicator.name]),
            Utils.createElement('span', {
              className: 'indicator-status',
            }, [meetsThreshold ? '✓' : '○']),
          ]),
          Utils.createElement('div', { className: 'indicator-bar' }, [
            Utils.createElement('div', {
              className: 'indicator-fill',
              style: `width: ${percentage}%`,
            }),
            Utils.createElement('div', {
              className: 'indicator-threshold-marker',
              style: `left: ${indicator.threshold * 100}%`,
            }),
          ]),
          Utils.createElement('div', { className: 'indicator-values' }, [
            Utils.createElement('span', { className: 'indicator-value' }, [`${percentage}%`]),
            Utils.createElement('span', { className: 'indicator-threshold' }, [
              `(≥${(indicator.threshold * 100).toFixed(0)}%)`,
            ]),
          ]),
        ])
      );
    });

    section.appendChild(grid);
  }

  /**
   * Render emergence signals
   */
  _renderSignals() {
    const section = document.getElementById('emergence-signals');
    if (!section) return;

    Utils.clearElement(section);

    section.appendChild(
      Utils.createElement('div', { className: 'signals-header' }, [
        'Emergence Signals',
        Utils.createElement('span', { className: 'signal-count' }, [String(this.signals.length)]),
      ])
    );

    if (this.signals.length === 0) {
      section.appendChild(
        Utils.createElement('div', { className: 'signals-empty' }, [
          Utils.createElement('span', { className: 'empty-icon' }, ['✨']),
          'No emergence signals detected',
          Utils.createElement('span', { className: 'empty-hint' }, [
            'Run a scan to detect non-programmed behaviors',
          ]),
        ])
      );
      return;
    }

    const list = Utils.createElement('div', { className: 'signals-list' });

    this.signals.forEach(signal => {
      const typeInfo = SIGNAL_TYPES[signal.type] || SIGNAL_TYPES.anomaly;

      list.appendChild(
        Utils.createElement('div', {
          className: `signal-item ${signal.type}`,
          style: `--signal-color: ${typeInfo.color}`,
          onClick: () => this._selectSignal(signal),
        }, [
          Utils.createElement('div', { className: 'signal-icon' }, [typeInfo.icon]),
          Utils.createElement('div', { className: 'signal-content' }, [
            Utils.createElement('div', { className: 'signal-type' }, [typeInfo.label]),
            Utils.createElement('div', { className: 'signal-description' }, [signal.description]),
            Utils.createElement('div', { className: 'signal-meta' }, [
              Utils.createElement('span', { className: 'signal-confidence' }, [
                `Confidence: ${(signal.confidence * 100).toFixed(0)}%`,
              ]),
              Utils.createElement('span', { className: 'signal-time' }, [
                Utils.formatTime(signal.timestamp),
              ]),
            ]),
          ]),
          Utils.createElement('div', {
            className: 'signal-confidence-bar',
            style: `--confidence: ${signal.confidence * 100}%`,
          }),
        ])
      );
    });

    section.appendChild(list);
  }

  /**
   * Render emergence patterns visualization
   */
  _renderPatterns() {
    const section = document.getElementById('emergence-patterns');
    if (!section) return;

    Utils.clearElement(section);

    section.appendChild(
      Utils.createElement('div', { className: 'patterns-header' }, ['Signal Distribution'])
    );

    // Count by type
    const typeCounts = {};
    this.signals.forEach(s => {
      typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    });

    const chart = Utils.createElement('div', { className: 'pattern-chart' });

    Object.entries(SIGNAL_TYPES).forEach(([type, info]) => {
      const count = typeCounts[type] || 0;
      const pct = this.signals.length > 0 ? (count / this.signals.length) * 100 : 0;

      chart.appendChild(
        Utils.createElement('div', {
          className: 'pattern-bar-row',
          style: `--bar-color: ${info.color}`,
        }, [
          Utils.createElement('span', { className: 'pattern-label' }, [
            Utils.createElement('span', { className: 'pattern-icon' }, [info.icon]),
            info.label,
          ]),
          Utils.createElement('div', { className: 'pattern-bar' }, [
            Utils.createElement('div', {
              className: 'pattern-bar-fill',
              style: `width: ${pct}%`,
            }),
          ]),
          Utils.createElement('span', { className: 'pattern-count' }, [String(count)]),
        ])
      );
    });

    section.appendChild(chart);

    // φ wisdom note
    section.appendChild(
      Utils.createElement('div', { className: 'phi-wisdom' }, [
        '"φ distrusts φ" — Maximum certainty is bounded by φ⁻¹ (61.8%)',
      ])
    );
  }

  /**
   * Select signal
   */
  _selectSignal(signal) {
    this.onSignalSelect(signal);
  }

  /**
   * Add signal (from external source)
   */
  addSignal(signal) {
    this._addSignal(signal);
    this._renderSignals();
    this._renderPatterns();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.container = null;
    this.signals = [];
  }
}

// Export to window
window.CYNICEmergenceDetector = EmergenceDetector;
