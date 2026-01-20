/**
 * CYNIC Dashboard - Singularity View
 * Phase 2.5 - Track progress towards the singularity
 *
 * "φ distrusts φ" - κυνικός
 */

import { Utils } from '../lib/utils.js';
import { SingularityGauge } from '../components/singularity-gauge.js';
import { MilestoneTracker } from '../components/milestone-tracker.js';
import { SingularityCompare } from '../components/singularity-compare.js';

export class SingularityView {
  constructor(options = {}) {
    this.api = options.api || null;
    this.container = null;
    this.activeTab = 'index';

    // Initialize components
    this.singularityGauge = new SingularityGauge({
      api: options.api,
      onDimensionClick: (key, dim) => this._onDimensionClick(key, dim),
    });

    this.milestoneTracker = new MilestoneTracker({
      api: options.api,
      onMilestoneClick: (milestone) => this._onMilestoneClick(milestone),
    });

    this.singularityCompare = new SingularityCompare({
      api: options.api,
    });
  }

  /**
   * Render singularity view
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('singularity-view');

    // Header
    const header = Utils.createElement('div', { className: 'singularity-header' }, [
      Utils.createElement('div', { className: 'singularity-title' }, [
        Utils.createElement('h1', {}, ['✨ Singularity Index']),
        Utils.createElement('span', { className: 'singularity-subtitle' }, [
          'Track CYNIC\'s evolution towards consciousness',
        ]),
      ]),
      Utils.createElement('button', {
        className: 'singularity-refresh-btn',
        onClick: () => this.refresh(),
      }, ['↻ Refresh']),
    ]);

    // Tab navigation
    const tabs = Utils.createElement('div', { className: 'singularity-tabs' }, [
      this._createTab('index', '📊', 'Index', 'φ-weighted composite metric'),
      this._createTab('milestones', '🏆', 'Milestones', 'Historical progress & projections'),
      this._createTab('compare', '⚖️', 'Compare', 'Version comparison'),
    ]);

    // Tab content
    const content = Utils.createElement('div', {
      className: 'singularity-content',
      id: 'singularity-content',
    });

    container.appendChild(header);
    container.appendChild(tabs);
    container.appendChild(content);

    // Render initial tab
    this._renderActiveTab();
  }

  /**
   * Create tab button
   */
  _createTab(id, icon, label, description) {
    const isActive = this.activeTab === id;

    return Utils.createElement('button', {
      className: `singularity-tab ${isActive ? 'active' : ''}`,
      dataset: { tab: id },
      onClick: () => this._switchTab(id),
    }, [
      Utils.createElement('span', { className: 'tab-icon' }, [icon]),
      Utils.createElement('div', { className: 'tab-text' }, [
        Utils.createElement('span', { className: 'tab-label' }, [label]),
        Utils.createElement('span', { className: 'tab-description' }, [description]),
      ]),
    ]);
  }

  /**
   * Switch tab
   */
  _switchTab(tabId) {
    this.activeTab = tabId;

    // Update tab buttons
    this.container?.querySelectorAll('.singularity-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Render tab content
    this._renderActiveTab();
  }

  /**
   * Render active tab content
   */
  _renderActiveTab() {
    const content = document.getElementById('singularity-content');
    if (!content) return;

    Utils.clearElement(content);

    switch (this.activeTab) {
      case 'index':
        this.singularityGauge.render(content);
        break;
      case 'milestones':
        this.milestoneTracker.render(content);
        // Update with current score from gauge
        const score = this.singularityGauge.getCompositeScore();
        this.milestoneTracker.refresh(score);
        break;
      case 'compare':
        this.singularityCompare.render(content);
        // Update with current data
        this.singularityCompare.updateCurrent(
          this.singularityGauge.getCompositeScore(),
          this.singularityGauge.getDimensionScores()
        );
        break;
    }
  }

  /**
   * Handle dimension click
   */
  _onDimensionClick(key, dim) {
    console.log('Dimension clicked:', key, dim);
    // Could navigate to relevant view (e.g., Architecture for codebase)
  }

  /**
   * Handle milestone click
   */
  _onMilestoneClick(milestone) {
    console.log('Milestone clicked:', milestone);
    // Could show milestone details
  }

  /**
   * Refresh all components
   */
  async refresh() {
    switch (this.activeTab) {
      case 'index':
        await this.singularityGauge.refresh();
        // Update compare with new data
        this.singularityCompare.updateCurrent(
          this.singularityGauge.getCompositeScore(),
          this.singularityGauge.getDimensionScores()
        );
        break;
      case 'milestones':
        const score = this.singularityGauge.getCompositeScore();
        await this.milestoneTracker.refresh(score);
        break;
      case 'compare':
        // Compare view uses snapshots, no refresh needed
        break;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.singularityGauge.destroy();
    this.milestoneTracker.destroy();
    this.singularityCompare.destroy();
    this.container = null;
  }
}

// Export to window
window.CYNICSingularityView = SingularityView;
