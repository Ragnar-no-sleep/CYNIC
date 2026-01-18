/**
 * CYNIC Dashboard - Dogs Status Component
 * 11 Dogs display with Sefirot
 */

import { Utils } from '../lib/utils.js';
import { Formulas } from '../lib/formulas.js';

export class DogsStatus {
  constructor(options = {}) {
    this.onDogClick = options.onDogClick || (() => {});
    this.container = null;
    this.dogs = Formulas.DOGS;
    this.liveData = {};
  }

  /**
   * Render dogs grid
   */
  render(container, viewMode = 'grid') {
    this.container = container;
    Utils.clearElement(container);

    if (viewMode === 'grid') {
      this._renderGrid();
    } else {
      this._renderList();
    }
  }

  /**
   * Render as grid (for operator view)
   */
  _renderGrid() {
    const grid = Utils.createElement('div', { className: 'dogs-grid' });

    for (const dog of this.dogs) {
      const liveStatus = this.liveData[dog.id];
      const isActive = liveStatus?.active ?? dog.active;

      const card = Utils.createElement('div', {
        className: `dog-card ${isActive ? 'active' : 'inactive'}`,
        dataset: { dogId: dog.id },
        onClick: () => this.onDogClick(dog),
      }, [
        Utils.createElement('div', { className: 'dog-card-icon' }, [this._getDogIcon(dog.id)]),
        Utils.createElement('div', { className: 'dog-card-name' }, [dog.name]),
        Utils.createElement('div', { className: 'dog-card-sefirot' }, [dog.sefirot]),
        Utils.createElement('div', { className: 'dog-card-stats' }, [
          liveStatus?.stats
            ? this._formatStats(liveStatus.stats)
            : dog.role,
        ]),
      ]);

      grid.appendChild(card);
    }

    this.container.appendChild(grid);
  }

  /**
   * Render as list (for sidebar)
   */
  _renderList() {
    const list = Utils.createElement('div', { className: 'dogs-container' });

    for (const dog of this.dogs) {
      const liveStatus = this.liveData[dog.id];
      const isActive = liveStatus?.active ?? dog.active;

      const item = Utils.createElement('div', {
        className: `dog-item ${isActive ? 'active' : ''}`,
        dataset: { sefirot: dog.sefirot.toLowerCase(), dogId: dog.id },
        onClick: () => this.onDogClick(dog),
      }, [
        Utils.createElement('span', {
          className: `dog-status ${isActive ? 'active' : 'inactive'}`,
        }),
        Utils.createElement('span', { className: 'dog-name' }, [dog.name]),
        Utils.createElement('span', { className: 'dog-sefirot' }, [dog.sefirot]),
      ]);

      list.appendChild(item);
    }

    this.container.appendChild(list);
  }

  /**
   * Get icon for dog
   */
  _getDogIcon(dogId) {
    const icons = {
      cynic: '🧠',
      sage: '🦉',
      analyst: '📊',
      scholar: '📚',
      architect: '🏗️',
      guardian: '🛡️',
      oracle: '🔮',
      scout: '🔭',
      deployer: '🚀',
      janitor: '🧹',
      cartographer: '🗺️',
    };
    return icons[dogId] || '🐕';
  }

  /**
   * Format stats for display
   */
  _formatStats(stats) {
    if (!stats) return '';
    const entries = Object.entries(stats).slice(0, 2);
    return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
  }

  /**
   * Update with live data from API
   */
  update(agents) {
    if (!agents) return;

    this.liveData = agents;

    // Update DOM
    for (const [name, data] of Object.entries(agents)) {
      const dogEl = this.container?.querySelector(`[data-dog-id="${name.toLowerCase()}"]`);
      if (dogEl) {
        const isActive = data.active !== false;
        dogEl.classList.toggle('active', isActive);
        dogEl.classList.toggle('inactive', !isActive);

        // Update status indicator
        const statusEl = dogEl.querySelector('.dog-status');
        if (statusEl) {
          statusEl.className = `dog-status ${isActive ? 'active' : 'inactive'}`;
        }

        // Update stats in card mode
        const statsEl = dogEl.querySelector('.dog-card-stats');
        if (statsEl && data.stats) {
          statsEl.textContent = this._formatStats(data.stats);
        }
      }
    }
  }
}

// Export to window
window.CYNICDogsStatus = DogsStatus;
