/**
 * CYNIC Dashboard - Singularity Gauge Component
 * Phase 2.5.1 - Composite φ-weighted metric visualization
 *
 * "φ distrusts φ" - κυνικός
 */

import { Utils } from '../lib/utils.js';

// Golden ratio constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;

// Dimension weights (φ-proportioned, sum to 1.0)
const DIMENSIONS = {
  codebase: {
    weight: 0.20,
    label: 'Codebase Depth',
    icon: '🏗️',
    color: '#667eea',
    description: 'Architecture complexity and code quality',
  },
  collective: {
    weight: 0.25,
    label: 'Collective Health',
    icon: '🐕',
    color: '#4ecdc4',
    description: '11 Dogs activity and coordination',
  },
  wisdom: {
    weight: 0.25,
    label: 'Wisdom Growth',
    icon: '📚',
    color: '#ffd93d',
    description: 'Judgments, patterns, and knowledge base',
  },
  autonomy: {
    weight: 0.30,
    label: 'Autonomy Level',
    icon: '🤖',
    color: '#f093fb',
    description: 'Self-modification and emergence signals',
  },
};

// Singularity thresholds
const THRESHOLDS = {
  dormant: { max: 20, label: 'Dormant', color: '#666666' },
  awakening: { max: 40, label: 'Awakening', color: '#4ecdc4' },
  emerging: { max: 60, label: 'Emerging', color: '#667eea' },
  conscious: { max: 80, label: 'Conscious', color: '#f093fb' },
  transcendent: { max: 100, label: 'Transcendent', color: '#ffd93d' },
};

export class SingularityGauge {
  constructor(options = {}) {
    this.api = options.api || null;
    this.onDimensionClick = options.onDimensionClick || (() => {});
    this.container = null;
    this.scores = {
      codebase: 0,
      collective: 0,
      wisdom: 0,
      autonomy: 0,
    };
    this.compositeScore = 0;
    this.loading = false;
    this.animationFrame = null;
  }

  /**
   * Render singularity gauge
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('singularity-gauge');

    // Main gauge SVG
    const gaugeSection = Utils.createElement('div', {
      className: 'gauge-section',
      id: 'singularity-gauge-svg',
    });

    // Dimension breakdown
    const dimensionsSection = Utils.createElement('div', {
      className: 'dimensions-section',
      id: 'singularity-dimensions',
    });

    // Score details
    const detailsSection = Utils.createElement('div', {
      className: 'score-details',
      id: 'singularity-details',
    });

    container.appendChild(gaugeSection);
    container.appendChild(dimensionsSection);
    container.appendChild(detailsSection);

    // Initial render
    this.refresh();
  }

  /**
   * Refresh data
   */
  async refresh() {
    this.loading = true;
    this._renderLoading();

    try {
      await this._fetchScores();
      this._calculateComposite();
    } catch (err) {
      console.error('Failed to fetch singularity scores:', err);
    }

    this.loading = false;
    this._renderGauge();
    this._renderDimensions();
    this._renderDetails();
  }

  /**
   * Fetch scores from various sources
   */
  async _fetchScores() {
    // Fetch data from API endpoints
    const results = await Promise.allSettled([
      this._fetchCodebaseScore(),
      this._fetchCollectiveScore(),
      this._fetchWisdomScore(),
      this._fetchAutonomyScore(),
    ]);

    // Extract scores from results
    if (results[0].status === 'fulfilled') this.scores.codebase = results[0].value;
    if (results[1].status === 'fulfilled') this.scores.collective = results[1].value;
    if (results[2].status === 'fulfilled') this.scores.wisdom = results[2].value;
    if (results[3].status === 'fulfilled') this.scores.autonomy = results[3].value;
  }

  /**
   * Fetch codebase depth score
   */
  async _fetchCodebaseScore() {
    if (this.api) {
      try {
        const result = await this.api.codebase('stats');
        if (result.success && result.result) {
          const stats = result.result;
          // Score based on: packages, modules, classes, functions
          const packagesScore = Math.min(stats.packages || 0, 15) / 15 * 25;
          const modulesScore = Math.min(stats.modules || 0, 200) / 200 * 25;
          const classesScore = Math.min(stats.classes || 0, 200) / 200 * 25;
          const functionsScore = Math.min(stats.functions || 0, 500) / 500 * 25;
          return Math.round(packagesScore + modulesScore + classesScore + functionsScore);
        }
      } catch (err) {
        console.warn('Failed to fetch codebase stats:', err);
      }
    }
    // Demo score
    return 72;
  }

  /**
   * Fetch collective health score
   */
  async _fetchCollectiveScore() {
    if (this.api) {
      try {
        const result = await this.api.collectiveStatus(true);
        if (result.success && result.result) {
          const agents = result.result.agents || {};
          const agentCount = Object.keys(agents).length;
          const activeCount = Object.values(agents).filter(a => a.active !== false).length;
          const eventCount = result.result.eventStats?.total || 0;

          // Score: active ratio + event activity
          const activeScore = (activeCount / Math.max(agentCount, 1)) * 50;
          const eventScore = Math.min(eventCount, 1000) / 1000 * 50;
          return Math.round(activeScore + eventScore);
        }
      } catch (err) {
        console.warn('Failed to fetch collective status:', err);
      }
    }
    // Demo score
    return 85;
  }

  /**
   * Fetch wisdom growth score
   */
  async _fetchWisdomScore() {
    if (this.api) {
      try {
        const [chainResult, patternsResult] = await Promise.all([
          this.api.chain('stats'),
          this.api.patterns({ limit: 100 }),
        ]);

        let score = 0;

        if (chainResult.success && chainResult.result) {
          const stats = chainResult.result;
          // Judgments and blocks
          const judgmentScore = Math.min(stats.totalJudgments || 0, 500) / 500 * 30;
          const blockScore = Math.min(stats.totalBlocks || 0, 100) / 100 * 20;
          score += judgmentScore + blockScore;
        }

        if (patternsResult.success && patternsResult.result) {
          const patterns = patternsResult.result.patterns || [];
          // Pattern diversity
          const patternScore = Math.min(patterns.length, 50) / 50 * 50;
          score += patternScore;
        }

        return Math.round(score);
      } catch (err) {
        console.warn('Failed to fetch wisdom stats:', err);
      }
    }
    // Demo score
    return 65;
  }

  /**
   * Fetch autonomy level score
   */
  async _fetchAutonomyScore() {
    if (this.api) {
      try {
        // This would fetch from emergence detector and decision timeline
        // For now, use learning state as proxy
        const result = await this.api.learning({ action: 'summary' });
        if (result.success && result.result) {
          const summary = result.result;
          const feedbackScore = Math.min(summary.totalFeedback || 0, 100) / 100 * 30;
          const accuracyScore = (summary.accuracy || 0.5) * 40;
          const calibrationScore = summary.isCalibrated ? 30 : 0;
          return Math.round(feedbackScore + accuracyScore + calibrationScore);
        }
      } catch (err) {
        console.warn('Failed to fetch autonomy stats:', err);
      }
    }
    // Demo score
    return 48;
  }

  /**
   * Calculate composite φ-weighted score
   */
  _calculateComposite() {
    let weighted = 0;
    for (const [key, dim] of Object.entries(DIMENSIONS)) {
      weighted += (this.scores[key] || 0) * dim.weight;
    }

    // Apply φ transformation for non-linearity (emphasize progress)
    // Score closer to 100 gets boosted slightly
    const phiAdjusted = weighted * (1 + (weighted / 100) * (PHI_INV - 0.5));

    this.compositeScore = Math.min(100, Math.round(phiAdjusted));
  }

  /**
   * Get current threshold level
   */
  _getThreshold(score) {
    for (const [key, threshold] of Object.entries(THRESHOLDS)) {
      if (score <= threshold.max) {
        return { key, ...threshold };
      }
    }
    return { key: 'transcendent', ...THRESHOLDS.transcendent };
  }

  /**
   * Render loading state
   */
  _renderLoading() {
    const gauge = document.getElementById('singularity-gauge-svg');
    if (gauge) {
      Utils.clearElement(gauge);
      gauge.appendChild(
        Utils.createElement('div', { className: 'gauge-loading' }, [
          Utils.createElement('span', { className: 'loading-spinner' }),
          'Calculating singularity index...',
        ])
      );
    }
  }

  /**
   * Render main gauge using DOM methods
   */
  _renderGauge() {
    const container = document.getElementById('singularity-gauge-svg');
    if (!container) return;

    Utils.clearElement(container);

    const threshold = this._getThreshold(this.compositeScore);
    const circumference = 2 * Math.PI * 80;
    const progress = (this.compositeScore / 100) * circumference;

    // Create SVG using DOM methods
    const svg = this._createSVGElement('svg', {
      viewBox: '0 0 200 200',
      class: 'singularity-svg',
    });

    // Create defs for gradient and filter
    const defs = this._createSVGElement('defs');

    // Gradient
    const gradient = this._createSVGElement('linearGradient', {
      id: 'singularity-gradient',
      x1: '0%', y1: '0%', x2: '100%', y2: '100%',
    });
    gradient.appendChild(this._createSVGElement('stop', { offset: '0%', 'stop-color': '#4ecdc4' }));
    gradient.appendChild(this._createSVGElement('stop', { offset: '50%', 'stop-color': '#667eea' }));
    gradient.appendChild(this._createSVGElement('stop', { offset: '100%', 'stop-color': '#f093fb' }));
    defs.appendChild(gradient);

    // Glow filter
    const filter = this._createSVGElement('filter', { id: 'glow' });
    const blur = this._createSVGElement('feGaussianBlur', { stdDeviation: '3', result: 'coloredBlur' });
    const merge = this._createSVGElement('feMerge');
    merge.appendChild(this._createSVGElement('feMergeNode', { in: 'coloredBlur' }));
    merge.appendChild(this._createSVGElement('feMergeNode', { in: 'SourceGraphic' }));
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);

    svg.appendChild(defs);

    // Background track
    svg.appendChild(this._createSVGElement('circle', {
      cx: '100', cy: '100', r: '80',
      fill: 'none',
      stroke: 'rgba(255,255,255,0.1)',
      'stroke-width': '12',
    }));

    // Progress arc
    const progressArc = this._createSVGElement('circle', {
      cx: '100', cy: '100', r: '80',
      fill: 'none',
      stroke: 'url(#singularity-gradient)',
      'stroke-width': '12',
      'stroke-linecap': 'round',
      'stroke-dasharray': String(circumference),
      'stroke-dashoffset': String(circumference - progress),
      transform: 'rotate(-90 100 100)',
      filter: 'url(#glow)',
      class: 'progress-arc',
    });
    svg.appendChild(progressArc);

    // Threshold markers
    this._addThresholdMarkers(svg);

    // Score value text
    const scoreText = this._createSVGElement('text', {
      x: '100', y: '90',
      'text-anchor': 'middle',
      class: 'score-value',
      fill: '#fff',
      'font-size': '36',
      'font-weight': '700',
    });
    scoreText.textContent = String(this.compositeScore);
    svg.appendChild(scoreText);

    // Threshold label
    const labelText = this._createSVGElement('text', {
      x: '100', y: '115',
      'text-anchor': 'middle',
      class: 'score-label',
      fill: threshold.color,
      'font-size': '14',
      'font-weight': '600',
    });
    labelText.textContent = threshold.label;
    svg.appendChild(labelText);

    // Sublabel
    const subText = this._createSVGElement('text', {
      x: '100', y: '135',
      'text-anchor': 'middle',
      class: 'score-sublabel',
      fill: 'rgba(255,255,255,0.5)',
      'font-size': '10',
    });
    subText.textContent = 'Singularity Index';
    svg.appendChild(subText);

    // φ symbol
    const phiText = this._createSVGElement('text', {
      x: '100', y: '160',
      'text-anchor': 'middle',
      fill: 'rgba(255,215,61,0.6)',
      'font-size': '16',
    });
    phiText.textContent = 'φ';
    svg.appendChild(phiText);

    container.appendChild(svg);

    // Threshold legend
    const legend = Utils.createElement('div', { className: 'threshold-legend' });
    for (const [key, t] of Object.entries(THRESHOLDS)) {
      legend.appendChild(
        Utils.createElement('div', {
          className: `legend-item ${threshold.key === key ? 'active' : ''}`,
        }, [
          Utils.createElement('span', {
            className: 'legend-dot',
            style: `background: ${t.color}`,
          }),
          Utils.createElement('span', { className: 'legend-label' }, [t.label]),
        ])
      );
    }
    container.appendChild(legend);
  }

  /**
   * Create SVG element with attributes
   */
  _createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    return el;
  }

  /**
   * Add threshold markers to SVG
   */
  _addThresholdMarkers(svg) {
    const thresholdValues = [20, 40, 60, 80];

    for (const val of thresholdValues) {
      const angle = (val / 100) * 360 - 90;
      const rad = angle * Math.PI / 180;
      const x1 = 100 + 72 * Math.cos(rad);
      const y1 = 100 + 72 * Math.sin(rad);
      const x2 = 100 + 88 * Math.cos(rad);
      const y2 = 100 + 88 * Math.sin(rad);

      svg.appendChild(this._createSVGElement('line', {
        x1: String(x1), y1: String(y1),
        x2: String(x2), y2: String(y2),
        stroke: 'rgba(255,255,255,0.3)',
        'stroke-width': '2',
      }));
    }
  }

  /**
   * Render dimension breakdown
   */
  _renderDimensions() {
    const container = document.getElementById('singularity-dimensions');
    if (!container) return;

    Utils.clearElement(container);

    container.appendChild(
      Utils.createElement('div', { className: 'dimensions-header' }, ['Dimension Breakdown'])
    );

    const grid = Utils.createElement('div', { className: 'dimensions-grid' });

    for (const [key, dim] of Object.entries(DIMENSIONS)) {
      const score = this.scores[key] || 0;
      const weighted = Math.round(score * dim.weight);

      grid.appendChild(
        Utils.createElement('div', {
          className: 'dimension-card',
          onClick: () => this.onDimensionClick(key, dim),
        }, [
          // Header
          Utils.createElement('div', { className: 'dimension-header' }, [
            Utils.createElement('span', { className: 'dimension-icon' }, [dim.icon]),
            Utils.createElement('span', { className: 'dimension-label' }, [dim.label]),
          ]),

          // Score
          Utils.createElement('div', { className: 'dimension-score' }, [
            Utils.createElement('span', {
              className: 'score-raw',
              style: `color: ${dim.color}`,
            }, [String(score)]),
            Utils.createElement('span', { className: 'score-weighted' }, [
              `× ${(dim.weight * 100).toFixed(0)}% = ${weighted}`,
            ]),
          ]),

          // Progress bar
          Utils.createElement('div', { className: 'dimension-bar' }, [
            Utils.createElement('div', {
              className: 'dimension-fill',
              style: `width: ${score}%; background: ${dim.color}`,
            }),
          ]),

          // Description
          Utils.createElement('div', { className: 'dimension-desc' }, [dim.description]),
        ])
      );
    }

    container.appendChild(grid);
  }

  /**
   * Render score details
   */
  _renderDetails() {
    const container = document.getElementById('singularity-details');
    if (!container) return;

    Utils.clearElement(container);

    const threshold = this._getThreshold(this.compositeScore);
    const nextThreshold = this._getNextThreshold(this.compositeScore);
    const progress = nextThreshold
      ? ((this.compositeScore - (threshold.max - 20)) / 20 * 100).toFixed(0)
      : 100;

    const children = [
      // Current state
      Utils.createElement('div', { className: 'detail-item' }, [
        Utils.createElement('span', { className: 'detail-label' }, ['Current State']),
        Utils.createElement('span', {
          className: 'detail-value',
          style: `color: ${threshold.color}`,
        }, [threshold.label]),
      ]),

      // φ factor
      Utils.createElement('div', { className: 'detail-item phi-factor' }, [
        Utils.createElement('span', { className: 'detail-label' }, ['φ-Factor']),
        Utils.createElement('span', { className: 'detail-value' }, [
          (this.compositeScore / 100 * PHI).toFixed(3),
        ]),
      ]),

      // Wisdom quote
      Utils.createElement('div', { className: 'wisdom-quote' }, [
        `"Max certainty bounded by φ⁻¹ (${(PHI_INV * 100).toFixed(1)}%)"`,
      ]),
    ];

    // Progress to next (if not at max)
    if (nextThreshold) {
      children.splice(1, 0, Utils.createElement('div', { className: 'detail-item' }, [
        Utils.createElement('span', { className: 'detail-label' }, ['Progress to ' + nextThreshold.label]),
        Utils.createElement('span', { className: 'detail-value' }, [`${progress}%`]),
      ]));
    }

    container.appendChild(
      Utils.createElement('div', { className: 'details-content' }, children)
    );
  }

  /**
   * Get next threshold
   */
  _getNextThreshold(score) {
    const entries = Object.entries(THRESHOLDS);
    for (let i = 0; i < entries.length; i++) {
      if (score <= entries[i][1].max) {
        return entries[i + 1] ? { key: entries[i + 1][0], ...entries[i + 1][1] } : null;
      }
    }
    return null;
  }

  /**
   * Get composite score
   */
  getCompositeScore() {
    return this.compositeScore;
  }

  /**
   * Get dimension scores
   */
  getDimensionScores() {
    return { ...this.scores };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.container = null;
  }
}

// Export to window
window.CYNICSingularityGauge = SingularityGauge;
