/**
 * CYNIC Dashboard - Pattern Gallery Component
 * Visual display of detected patterns with frequency and confidence
 * Phase 2.3.2
 */

import { Utils } from '../lib/utils.js';

// PHI for proportions
const PHI = 1.618033988749895;

// Pattern category colors
const CATEGORY_COLORS = {
  verdict: '#4ecdc4',     // Teal
  dimension: '#f093fb',   // Pink
  anomaly: '#ff6b6b',     // Red
  trend: '#ffd93d',       // Gold
  recurrence: '#667eea',  // Purple
  correlation: '#00ff88', // Green
  default: '#888888',     // Gray
};

// Category icons
const CATEGORY_ICONS = {
  verdict: '⚖️',
  dimension: '📊',
  anomaly: '⚠️',
  trend: '📈',
  recurrence: '🔄',
  correlation: '🔗',
  default: '🔮',
};

export class PatternGallery {
  constructor(options = {}) {
    this.api = options.api || null;
    this.onPatternClick = options.onPatternClick || (() => {});
    this.container = null;
    this.patterns = [];
    this.selectedCategory = 'all';
    this.sortBy = 'frequency';  // 'frequency', 'confidence', 'recent'
    this.loading = false;
  }

  /**
   * Render pattern gallery
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);

    // Header with filters
    const header = Utils.createElement('div', { className: 'pattern-gallery-header' }, [
      Utils.createElement('div', { className: 'pattern-gallery-title' }, ['🔮 Pattern Gallery']),
      Utils.createElement('div', { className: 'pattern-gallery-filters' }, [
        this._createCategoryFilter(),
        this._createSortSelector(),
        Utils.createElement('button', {
          className: 'pattern-refresh-btn',
          onClick: () => this.refresh(),
        }, ['↻']),
      ]),
    ]);

    // Stats bar
    const statsBar = Utils.createElement('div', {
      className: 'pattern-stats-bar',
      id: 'pattern-stats-bar',
    });

    // Gallery grid
    const gallery = Utils.createElement('div', {
      className: 'pattern-gallery-grid',
      id: 'pattern-gallery-grid',
    });

    // Detail panel (collapsible)
    const detail = Utils.createElement('div', {
      className: 'pattern-detail-panel',
      id: 'pattern-detail-panel',
    });

    container.appendChild(header);
    container.appendChild(statsBar);
    container.appendChild(gallery);
    container.appendChild(detail);

    // Initial load
    this.refresh();
  }

  /**
   * Create category filter buttons
   */
  _createCategoryFilter() {
    const categories = ['all', 'verdict', 'dimension', 'anomaly', 'trend'];
    const container = Utils.createElement('div', { className: 'pattern-category-filters' });

    categories.forEach(cat => {
      const btn = Utils.createElement('button', {
        className: `pattern-cat-btn ${this.selectedCategory === cat ? 'active' : ''}`,
        dataset: { category: cat },
        onClick: () => this._setCategory(cat),
      }, [
        cat === 'all' ? '📋' : (CATEGORY_ICONS[cat] || '🔮'),
        ` ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      ]);
      container.appendChild(btn);
    });

    return container;
  }

  /**
   * Create sort selector
   */
  _createSortSelector() {
    const select = Utils.createElement('select', {
      className: 'pattern-sort-select',
      onChange: (e) => this._setSort(e.target.value),
    });

    const options = [
      { value: 'frequency', label: 'Most frequent' },
      { value: 'confidence', label: 'Highest confidence' },
      { value: 'recent', label: 'Most recent' },
    ];

    options.forEach(opt => {
      const option = Utils.createElement('option', {
        value: opt.value,
        selected: this.sortBy === opt.value,
      }, [opt.label]);
      select.appendChild(option);
    });

    return select;
  }

  /**
   * Set category filter
   */
  _setCategory(category) {
    this.selectedCategory = category;
    this.container?.querySelectorAll('.pattern-cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    this._renderPatterns();
  }

  /**
   * Set sort order
   */
  _setSort(sortBy) {
    this.sortBy = sortBy;
    this._renderPatterns();
  }

  /**
   * Refresh patterns from API
   */
  async refresh() {
    if (!this.api) return;

    this.loading = true;
    this._renderLoading();

    try {
      const result = await this.api.patterns('all', 50);
      if (result.success && result.result) {
        this.patterns = result.result.patterns || [];
      }
    } catch (err) {
      console.error('Failed to fetch patterns:', err);
      this.patterns = [];
    }

    this.loading = false;
    this._renderStats();
    this._renderPatterns();
  }

  /**
   * Render loading state
   */
  _renderLoading() {
    const grid = document.getElementById('pattern-gallery-grid');
    if (grid) {
      Utils.clearElement(grid);
      grid.appendChild(
        Utils.createElement('div', { className: 'pattern-loading' }, [
          Utils.createElement('span', { className: 'pattern-spinner' }),
          'Loading patterns...',
        ])
      );
    }
  }

  /**
   * Render stats bar
   */
  _renderStats() {
    const statsBar = document.getElementById('pattern-stats-bar');
    if (!statsBar) return;

    Utils.clearElement(statsBar);

    // Count by category
    const categoryCount = {};
    let totalFrequency = 0;
    let avgConfidence = 0;

    this.patterns.forEach(p => {
      const cat = p.category || 'default';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      totalFrequency += p.total || p.frequency || 1;
      const conf = parseFloat(p.confidence);
      avgConfidence += isNaN(conf) ? 0.5 : conf;
    });

    if (this.patterns.length > 0) {
      avgConfidence = avgConfidence / this.patterns.length;
    }

    // Render stats
    const stats = [
      { label: 'Total', value: this.patterns.length, color: '#888' },
      { label: 'Frequency', value: totalFrequency, color: '#ffd93d' },
      { label: 'Avg Confidence', value: `${Math.round(avgConfidence * 100)}%`, color: '#4ecdc4' },
    ];

    stats.forEach(stat => {
      statsBar.appendChild(
        Utils.createElement('div', { className: 'pattern-stat' }, [
          Utils.createElement('span', { className: 'pattern-stat-label' }, [stat.label]),
          Utils.createElement('span', {
            className: 'pattern-stat-value',
            style: `color: ${stat.color}`,
          }, [String(stat.value)]),
        ])
      );
    });

    // Category breakdown mini-chart
    const chartContainer = Utils.createElement('div', { className: 'pattern-cat-chart' });
    Object.entries(categoryCount).forEach(([cat, count]) => {
      const width = (count / this.patterns.length) * 100;
      const bar = Utils.createElement('div', {
        className: 'pattern-cat-bar',
        style: `width: ${width}%; background: ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.default}`,
        title: `${cat}: ${count}`,
      });
      chartContainer.appendChild(bar);
    });
    statsBar.appendChild(chartContainer);
  }

  /**
   * Render patterns grid
   */
  _renderPatterns() {
    const grid = document.getElementById('pattern-gallery-grid');
    if (!grid) return;

    Utils.clearElement(grid);

    // Filter and sort patterns
    let filtered = this.patterns;
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (this.sortBy) {
        case 'frequency':
          return (b.total || b.frequency || 0) - (a.total || a.frequency || 0);
        case 'confidence':
          return (b.confidence || 0) - (a.confidence || 0);
        case 'recent':
          return (b.lastSeen || 0) - (a.lastSeen || 0);
        default:
          return 0;
      }
    });

    if (filtered.length === 0) {
      grid.appendChild(
        Utils.createElement('div', { className: 'pattern-empty' }, [
          Utils.createElement('span', { className: 'pattern-empty-icon' }, ['🔮']),
          `No ${this.selectedCategory === 'all' ? '' : this.selectedCategory + ' '}patterns yet`,
        ])
      );
      return;
    }

    // Render each pattern as a card
    filtered.forEach((pattern, index) => {
      const card = this._createPatternCard(pattern, index);
      grid.appendChild(card);
    });
  }

  /**
   * Create pattern card
   */
  _createPatternCard(pattern, index) {
    const category = pattern.category || 'default';
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
    const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
    const frequency = pattern.total || pattern.frequency || 1;
    const confidence = pattern.confidence || 0.5;

    // Calculate visual size based on frequency (PHI-based scaling)
    const minSize = 120;
    const maxSize = minSize * PHI;
    const freqScale = Math.min(1, frequency / 50);
    const cardSize = minSize + (maxSize - minSize) * freqScale;

    const card = Utils.createElement('div', {
      className: 'pattern-card',
      style: `
        border-color: ${color}40;
        background: linear-gradient(135deg, ${color}10 0%, ${color}05 100%);
      `,
      onClick: () => this._selectPattern(pattern),
    }, [
      // Header with icon and category
      Utils.createElement('div', { className: 'pattern-card-header' }, [
        Utils.createElement('span', {
          className: 'pattern-card-icon',
          style: `color: ${color}`,
        }, [icon]),
        Utils.createElement('span', { className: 'pattern-card-category' }, [category]),
      ]),

      // Description
      Utils.createElement('div', { className: 'pattern-card-desc' }, [
        pattern.description || pattern.type || 'Unknown pattern',
      ]),

      // Metrics bar
      Utils.createElement('div', { className: 'pattern-card-metrics' }, [
        Utils.createElement('div', { className: 'pattern-metric' }, [
          Utils.createElement('span', { className: 'metric-label' }, ['Freq']),
          Utils.createElement('span', { className: 'metric-value' }, [String(frequency)]),
        ]),
        Utils.createElement('div', { className: 'pattern-metric' }, [
          Utils.createElement('span', { className: 'metric-label' }, ['Conf']),
          Utils.createElement('span', {
            className: 'metric-value',
            style: `color: ${this._confidenceColor(confidence)}`,
          }, [`${Math.round(confidence * 100)}%`]),
        ]),
      ]),

      // Confidence bar
      Utils.createElement('div', { className: 'pattern-confidence-bar' }, [
        Utils.createElement('div', {
          className: 'pattern-confidence-fill',
          style: `width: ${confidence * 100}%; background: ${color}`,
        }),
      ]),
    ]);

    // Add animation delay for staggered entrance
    card.style.animationDelay = `${index * 50}ms`;

    return card;
  }

  /**
   * Get confidence color
   */
  _confidenceColor(confidence) {
    if (confidence >= 0.8) return '#4ecdc4';  // High - teal
    if (confidence >= 0.5) return '#ffd93d';  // Medium - gold
    return '#ff6b6b';  // Low - red
  }

  /**
   * Select pattern and show detail
   */
  _selectPattern(pattern) {
    const detailPanel = document.getElementById('pattern-detail-panel');
    if (!detailPanel) return;

    Utils.clearElement(detailPanel);
    detailPanel.classList.add('visible');

    const category = pattern.category || 'default';
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
    const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

    // Detail content
    const detail = Utils.createElement('div', { className: 'pattern-detail-content' }, [
      // Header
      Utils.createElement('div', { className: 'pattern-detail-header' }, [
        Utils.createElement('div', { className: 'pattern-detail-title' }, [
          Utils.createElement('span', { style: `color: ${color}` }, [icon]),
          ` ${pattern.description || pattern.type || 'Pattern'}`,
        ]),
        Utils.createElement('button', {
          className: 'pattern-detail-close',
          onClick: () => this._hideDetail(),
        }, ['✕']),
      ]),

      // Category badge
      Utils.createElement('div', {
        className: 'pattern-detail-badge',
        style: `background: ${color}20; color: ${color}`,
      }, [category]),

      // Metrics
      Utils.createElement('div', { className: 'pattern-detail-metrics' }, [
        this._createMetricItem('Frequency', pattern.total || pattern.frequency || 1, '#ffd93d'),
        this._createMetricItem('Confidence', `${Math.round((pattern.confidence || 0.5) * 100)}%`, '#4ecdc4'),
        pattern.lastSeen ? this._createMetricItem('Last Seen', Utils.formatTime(pattern.lastSeen, 'relative'), '#888') : null,
      ].filter(Boolean)),

      // Data preview
      Utils.createElement('div', { className: 'pattern-detail-data' }, [
        Utils.createElement('div', { className: 'pattern-data-label' }, ['Raw Data']),
        Utils.createElement('pre', { className: 'pattern-data-json' }, [
          JSON.stringify(pattern, null, 2),
        ]),
      ]),
    ]);

    detailPanel.appendChild(detail);

    // Callback
    this.onPatternClick(pattern);
  }

  /**
   * Create metric item
   */
  _createMetricItem(label, value, color) {
    return Utils.createElement('div', { className: 'pattern-detail-metric' }, [
      Utils.createElement('div', { className: 'detail-metric-label' }, [label]),
      Utils.createElement('div', {
        className: 'detail-metric-value',
        style: `color: ${color}`,
      }, [String(value)]),
    ]);
  }

  /**
   * Hide detail panel
   */
  _hideDetail() {
    const detailPanel = document.getElementById('pattern-detail-panel');
    if (detailPanel) {
      detailPanel.classList.remove('visible');
    }
  }

  /**
   * Update with new data from SSE
   */
  addPattern(pattern) {
    // Check if pattern already exists (update it)
    const existingIndex = this.patterns.findIndex(
      p => p.id === pattern.id || (p.category === pattern.category && p.type === pattern.type)
    );

    if (existingIndex >= 0) {
      this.patterns[existingIndex] = pattern;
    } else {
      this.patterns.unshift(pattern);
    }

    // Re-render
    this._renderStats();
    this._renderPatterns();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.container = null;
    this.patterns = [];
  }
}

// Export to window
window.CYNICPatternGallery = PatternGallery;
