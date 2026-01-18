/**
 * CYNIC Dashboard - Metrics Cards Component
 * Reusable metric cards for operator view
 */

import { Utils } from '../lib/utils.js';

export class MetricsCards {
  constructor(options = {}) {
    this.container = null;
    this.cards = [];
  }

  /**
   * Render metrics grid
   */
  render(container, cards = []) {
    this.container = container;
    this.cards = cards;
    Utils.clearElement(container);

    const grid = Utils.createElement('div', { className: 'metrics-grid' });

    for (const card of cards) {
      grid.appendChild(this._createCard(card));
    }

    container.appendChild(grid);
  }

  /**
   * Create a single metric card
   */
  _createCard(card) {
    const cardEl = Utils.createElement('div', {
      className: `metric-card ${card.highlight ? 'highlight' : ''}`,
      dataset: { metricId: card.id },
    });

    // Header
    const header = Utils.createElement('div', { className: 'metric-header' }, [
      Utils.createElement('span', { className: 'metric-label' }, [card.label]),
      Utils.createElement('span', { className: 'metric-icon' }, [card.icon || '📊']),
    ]);

    // Value
    const value = Utils.createElement('div', {
      className: `metric-value ${card.loading ? 'loading' : ''}`,
      id: `metric-${card.id}`,
    }, [this._formatValue(card.value, card.format)]);

    // Change indicator
    let change = null;
    if (card.change !== undefined) {
      change = this._createChangeIndicator(card.change);
    }

    // Footer
    let footer = null;
    if (card.footer) {
      footer = Utils.createElement('div', { className: 'metric-footer' }, [
        Utils.createElement('span', {}, [card.footer]),
      ]);
    }

    cardEl.appendChild(header);
    cardEl.appendChild(value);
    if (change) cardEl.appendChild(change);
    if (footer) cardEl.appendChild(footer);

    return cardEl;
  }

  /**
   * Create change indicator element
   */
  _createChangeIndicator(changeValue) {
    const changeClass = changeValue > 0 ? 'positive' : changeValue < 0 ? 'negative' : 'neutral';
    const changeIcon = changeValue > 0 ? '↑' : changeValue < 0 ? '↓' : '→';

    return Utils.createElement('div', { className: `metric-change ${changeClass}` }, [
      Utils.createElement('span', {}, [changeIcon]),
      Utils.createElement('span', {}, [Math.abs(changeValue) + '%']),
    ]);
  }

  /**
   * Format value based on type
   */
  _formatValue(value, format) {
    if (value === null || value === undefined) return '—';

    switch (format) {
      case 'number':
        return Utils.formatNumber(value);
      case 'percent':
        return Utils.formatPercent(value);
      case 'duration':
        return Utils.formatDuration(value);
      case 'score':
        return `${value}/100`;
      default:
        return String(value);
    }
  }

  /**
   * Update a single card value
   */
  updateCard(id, value, change) {
    const cardEl = this.container?.querySelector(`[data-metric-id="${id}"]`);
    if (!cardEl) return;

    const valueEl = cardEl.querySelector('.metric-value');
    if (valueEl) {
      const card = this.cards.find(c => c.id === id);
      valueEl.textContent = this._formatValue(value, card?.format);
      valueEl.classList.remove('loading');
    }

    // Update change if provided
    if (change !== undefined) {
      const changeEl = cardEl.querySelector('.metric-change');

      if (changeEl) {
        // Replace the existing change indicator
        const newChangeEl = this._createChangeIndicator(change);
        changeEl.replaceWith(newChangeEl);
      }
    }
  }

  /**
   * Update all cards
   */
  updateAll(updates) {
    for (const [id, data] of Object.entries(updates)) {
      this.updateCard(id, data.value, data.change);
    }
  }

  /**
   * Set card loading state
   */
  setLoading(id, loading = true) {
    const cardEl = this.container?.querySelector(`[data-metric-id="${id}"]`);
    if (cardEl) {
      const valueEl = cardEl.querySelector('.metric-value');
      valueEl?.classList.toggle('loading', loading);
    }
  }

  /**
   * Create default cards for operator view
   */
  static getDefaultCards() {
    return [
      {
        id: 'judgments',
        label: 'Total Judgments',
        icon: '⚖️',
        value: null,
        format: 'number',
        loading: true,
      },
      {
        id: 'qScore',
        label: 'Avg Q-Score',
        icon: '📈',
        value: null,
        format: 'score',
        highlight: true,
        loading: true,
      },
      {
        id: 'blocks',
        label: 'PoJ Blocks',
        icon: '🧱',
        value: null,
        format: 'number',
        loading: true,
      },
      {
        id: 'patterns',
        label: 'Patterns',
        icon: '🔍',
        value: null,
        format: 'number',
        loading: true,
      },
    ];
  }
}

// Export to window
window.CYNICMetricsCards = MetricsCards;
