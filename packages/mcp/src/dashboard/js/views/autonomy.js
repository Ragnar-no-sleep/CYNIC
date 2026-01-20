/**
 * CYNIC Dashboard - Autonomy View
 * Phase 2.4 - Track autonomous behavior, self-modification, and emergence
 *
 * "φ distrusts φ" - κυνικός
 */

import { Utils } from '../lib/utils.js';
import { DecisionTimeline } from '../components/decision-timeline.js';
import { SelfModTracker } from '../components/self-mod-tracker.js';
import { EmergenceDetector } from '../components/emergence-detector.js';

export class AutonomyView {
  constructor(options = {}) {
    this.api = options.api || null;
    this.container = null;
    this.activeTab = 'decisions';

    // Initialize components
    this.decisionTimeline = new DecisionTimeline({
      api: options.api,
      onDecisionSelect: (decision) => this._onDecisionSelect(decision),
    });

    this.selfModTracker = new SelfModTracker({
      api: options.api,
      onCommitSelect: (commit) => this._onCommitSelect(commit),
    });

    this.emergenceDetector = new EmergenceDetector({
      api: options.api,
      onSignalSelect: (signal) => this._onSignalSelect(signal),
    });
  }

  /**
   * Render autonomy view
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('autonomy-view');

    // Header
    const header = Utils.createElement('div', { className: 'autonomy-header' }, [
      Utils.createElement('div', { className: 'autonomy-title' }, [
        Utils.createElement('h1', {}, ['🤖 Autonomy & Emergence']),
        Utils.createElement('span', { className: 'autonomy-subtitle' }, [
          'Track CYNIC\'s autonomous behavior and consciousness signals',
        ]),
      ]),
    ]);

    // Tab navigation
    const tabs = Utils.createElement('div', { className: 'autonomy-tabs' }, [
      this._createTab('decisions', '🧠', 'Decisions', 'All CYNIC decisions and overrides'),
      this._createTab('selfmod', '🔄', 'Self-Modification', 'Code changes and evolution'),
      this._createTab('emergence', '✨', 'Emergence', 'Non-programmed behaviors'),
    ]);

    // Tab content
    const content = Utils.createElement('div', {
      className: 'autonomy-content',
      id: 'autonomy-content',
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
      className: `autonomy-tab ${isActive ? 'active' : ''}`,
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
    this.container?.querySelectorAll('.autonomy-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Render tab content
    this._renderActiveTab();
  }

  /**
   * Render active tab content
   */
  _renderActiveTab() {
    const content = document.getElementById('autonomy-content');
    if (!content) return;

    Utils.clearElement(content);

    switch (this.activeTab) {
      case 'decisions':
        this.decisionTimeline.render(content);
        break;
      case 'selfmod':
        this.selfModTracker.render(content);
        break;
      case 'emergence':
        this.emergenceDetector.render(content);
        break;
    }
  }

  /**
   * Handle decision selection
   */
  _onDecisionSelect(decision) {
    console.log('Decision selected:', decision);
  }

  /**
   * Handle commit selection
   */
  _onCommitSelect(commit) {
    console.log('Commit selected:', commit);
  }

  /**
   * Handle signal selection
   */
  _onSignalSelect(signal) {
    console.log('Signal selected:', signal);
  }

  /**
   * Refresh all components
   */
  async refresh() {
    switch (this.activeTab) {
      case 'decisions':
        await this.decisionTimeline.refresh();
        break;
      case 'selfmod':
        await this.selfModTracker.refresh();
        break;
      case 'emergence':
        await this.emergenceDetector.scan();
        break;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.decisionTimeline.destroy();
    this.selfModTracker.destroy();
    this.emergenceDetector.destroy();
    this.container = null;
  }
}

// Export to window
window.CYNICAutonomyView = AutonomyView;
