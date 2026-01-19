/**
 * CYNIC Dashboard - Utility Functions
 * Helpers and common functions
 */

export const Utils = {
  /**
   * Format a number with thousands separator
   */
  formatNumber(num, decimals = 0) {
    if (num === null || num === undefined) return '—';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /**
   * Format a percentage
   */
  formatPercent(num, decimals = 1) {
    if (num === null || num === undefined) return '—';
    return `${(num * 100).toFixed(decimals)}%`;
  },

  /**
   * Format a timestamp
   */
  formatTime(timestamp, format = 'relative') {
    const date = new Date(timestamp);

    if (format === 'relative') {
      const now = Date.now();
      const diff = now - date.getTime();

      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return `${Math.floor(diff / 86400000)}d ago`;
    }

    if (format === 'time') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    if (format === 'date') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return date.toISOString();
  },

  /**
   * Format duration in ms
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  },

  /**
   * Truncate hash for display
   */
  truncateHash(hash, chars = 8) {
    if (!hash || hash.length <= chars * 2 + 3) return hash;
    return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
  },

  /**
   * Debounce function
   */
  debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Throttle function
   */
  throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Create element with attributes and children
   */
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value);
      } else {
        el.setAttribute(key, value);
      }
    }

    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }

    return el;
  },

  /**
   * Clear element children
   */
  clearElement(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  },

  /**
   * Get color for verdict
   */
  getVerdictColor(verdict) {
    const colors = {
      HOWL: 'var(--color-howl)',
      WAG: 'var(--color-wag)',
      GROWL: 'var(--color-growl)',
      BARK: 'var(--color-bark)',
    };
    return colors[verdict?.toUpperCase()] || 'var(--text-muted)';
  },

  /**
   * Get color for axiom
   */
  getAxiomColor(axiom) {
    const colors = {
      PHI: 'var(--color-phi)',
      VERIFY: 'var(--color-verify)',
      CULTURE: 'var(--color-culture)',
      BURN: 'var(--color-burn)',
    };
    return colors[axiom?.toUpperCase()] || 'var(--text-muted)';
  },

  /**
   * Get emoji for verdict
   */
  getVerdictEmoji(verdict) {
    const emojis = {
      HOWL: '🐺',
      WAG: '🐕',
      GROWL: '😾',
      BARK: '🚨',
    };
    return emojis[verdict?.toUpperCase()] || '❓';
  },

  /**
   * Parse JSON safely
   */
  safeParseJSON(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Generate unique ID
   */
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  },

  /**
   * Check if object is empty
   */
  isEmpty(obj) {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  /**
   * Local storage helpers with JSON support
   */
  storage: {
    get(key, fallback = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  },

  /**
   * Copy to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  },

  /**
   * Simple event emitter
   */
  createEventEmitter() {
    const listeners = new Map();

    return {
      on(event, callback) {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);
        return () => listeners.get(event)?.delete(callback);
      },

      off(event, callback) {
        listeners.get(event)?.delete(callback);
      },

      emit(event, data) {
        listeners.get(event)?.forEach(cb => cb(data));
      },

      once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
          unsubscribe();
          callback(data);
        });
        return unsubscribe;
      },
    };
  },
};

// Named exports for convenience
export const debounce = Utils.debounce;
export const throttle = Utils.throttle;
export const formatTime = Utils.formatTime;
export const formatTimestamp = Utils.formatTime; // Alias
export const formatNumber = Utils.formatNumber;
export const formatPercent = Utils.formatPercent;
export const formatDuration = Utils.formatDuration;
export const truncateHash = Utils.truncateHash;
export const truncate = (str, maxLen) => {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
};
export const createElement = Utils.createElement;
export const clearElement = Utils.clearElement;
export const generateId = Utils.generateId;

// Export to window for non-module scripts
window.CYNICUtils = Utils;
