/**
 * CYNIC Dashboard - Header Component
 * Header + mode switcher
 */

import { Utils } from '../lib/utils.js';
import { Formulas } from '../lib/formulas.js';

export class Header {
  constructor(options = {}) {
    this.onModeChange = options.onModeChange || (() => {});
    this.onConsoleToggle = options.onConsoleToggle || (() => {});
    this.container = null;
    this.connectionStatus = 'disconnected';
    this.consoleActive = false;
  }

  /**
   * Render header
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);

    // Logo section
    const logo = Utils.createElement('div', { className: 'header-logo' }, [
      Utils.createElement('span', { className: 'header-logo-icon' }, ['🐕']),
      Utils.createElement('span', { className: 'header-logo-text' }, ['CYNIC']),
      Utils.createElement('span', { className: 'header-logo-version' }, ['v0.4.0']),
    ]);

    // Mode switcher
    const modeSwitcher = Utils.createElement('div', { className: 'mode-switcher' }, [
      this._createModeBtn('operator', 'Operator', true),
      this._createModeBtn('dev', 'Dev'),
      this._createModeBtn('arch', 'Architecture'),
    ]);

    // Status section
    const status = Utils.createElement('div', { className: 'header-status' }, [
      this._createConnectionStatus(),
      this._createPhiDisplay(),
      this._createConsoleToggle(),
    ]);

    container.appendChild(logo);
    container.appendChild(modeSwitcher);
    container.appendChild(status);
  }

  /**
   * Create mode button
   */
  _createModeBtn(mode, label, active = false) {
    const btn = Utils.createElement('button', {
      className: `mode-btn${active ? ' active' : ''}`,
      dataset: { mode },
      onClick: () => this.onModeChange(mode),
    }, [label]);

    return btn;
  }

  /**
   * Create connection status element
   */
  _createConnectionStatus() {
    const el = Utils.createElement('div', {
      className: `connection-status ${this.connectionStatus}`,
      id: 'connection-status',
    }, [
      Utils.createElement('span', { className: 'status-dot' }),
      Utils.createElement('span', {}, [this.connectionStatus === 'connected' ? 'CONNECTED' : 'OFFLINE']),
    ]);

    return el;
  }

  /**
   * Create PHI display
   */
  _createPhiDisplay() {
    return Utils.createElement('div', { className: 'phi-display' }, [
      Utils.createElement('span', { className: 'phi-symbol' }, ['φ⁻¹']),
      Utils.createElement('span', {}, [`${(Formulas.PHI_INV * 100).toFixed(1)}%`]),
    ]);
  }

  /**
   * Create console toggle
   */
  _createConsoleToggle() {
    const btn = Utils.createElement('button', {
      className: `console-toggle${this.consoleActive ? ' active' : ''}`,
      id: 'console-toggle',
      onClick: () => this.onConsoleToggle(),
    }, ['⌘ Console']);

    return btn;
  }

  /**
   * Update connection status
   */
  setConnectionStatus(status) {
    this.connectionStatus = status;
    const el = document.getElementById('connection-status');
    if (el) {
      el.className = `connection-status ${status}`;
      el.querySelector('span:last-child').textContent = status === 'connected' ? 'CONNECTED' : 'OFFLINE';
    }
  }

  /**
   * Set console active state
   */
  setConsoleActive(active) {
    this.consoleActive = active;
    const btn = document.getElementById('console-toggle');
    if (btn) {
      btn.classList.toggle('active', active);
    }
  }

  /**
   * Set active mode (from external navigation)
   */
  setActiveMode(mode) {
    this.container?.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }
}

// Export to window
window.CYNICHeader = Header;
