/**
 * CYNIC Dashboard - Station Map
 *
 * Maps brain_ tools to visual stations (Vibecraft pattern)
 * Each station has an icon, color, and category
 *
 * "phi distrusts phi" - kunikos
 */

/**
 * Station definitions for CYNIC tools
 * @type {Object.<string, {station: string, icon: string, color: string, category: string}>}
 */
export const CYNIC_STATION_MAP = {
  // === Judgment & Analysis (Gold/Yellow) ===
  brain_cynic_judge: {
    station: 'judgment-throne',
    icon: '⚖️',
    color: '#FFD700',
    category: 'judgment',
  },
  brain_cynic_refine: {
    station: 'judgment-throne',
    icon: '🔄',
    color: '#FFD700',
    category: 'judgment',
  },
  brain_cynic_feedback: {
    station: 'judgment-throne',
    icon: '📝',
    color: '#FFD700',
    category: 'judgment',
  },
  brain_cynic_digest: {
    station: 'digestion-pit',
    icon: '🧠',
    color: '#9B59B6',
    category: 'analysis',
  },

  // === Search & Knowledge (Blue) ===
  brain_search: {
    station: 'archive-tower',
    icon: '🔍',
    color: '#3498DB',
    category: 'search',
  },
  brain_search_index: {
    station: 'archive-tower',
    icon: '📇',
    color: '#3498DB',
    category: 'search',
  },
  brain_timeline: {
    station: 'archive-tower',
    icon: '📅',
    color: '#3498DB',
    category: 'search',
  },
  brain_get_observations: {
    station: 'archive-tower',
    icon: '👁️',
    color: '#3498DB',
    category: 'search',
  },
  brain_patterns: {
    station: 'pattern-web',
    icon: '🔮',
    color: '#E74C3C',
    category: 'analysis',
  },
  brain_vector_search: {
    station: 'constellation',
    icon: '✨',
    color: '#3498DB',
    category: 'search',
  },

  // === Chain & Persistence (Orange) ===
  brain_poj_chain: {
    station: 'chain-forge',
    icon: '⛓️',
    color: '#F39C12',
    category: 'chain',
  },

  // === Ecosystem (Green) ===
  brain_ecosystem: {
    station: 'watchtower',
    icon: '🌍',
    color: '#27AE60',
    category: 'ecosystem',
  },
  brain_ecosystem_monitor: {
    station: 'watchtower',
    icon: '📡',
    color: '#27AE60',
    category: 'ecosystem',
  },
  brain_docs: {
    station: 'library',
    icon: '📚',
    color: '#8E44AD',
    category: 'ecosystem',
  },
  brain_integrator: {
    station: 'watchtower',
    icon: '🔗',
    color: '#27AE60',
    category: 'ecosystem',
  },

  // === Collective & Agents (Orange/Brown) ===
  brain_collective_status: {
    station: 'kennel',
    icon: '🐕',
    color: '#E67E22',
    category: 'collective',
  },
  brain_agents_status: {
    station: 'kennel',
    icon: '🐾',
    color: '#E67E22',
    category: 'collective',
  },
  brain_agent_diagnostic: {
    station: 'kennel',
    icon: '🩺',
    color: '#E67E22',
    category: 'collective',
  },

  // === System & Health (Teal) ===
  brain_health: {
    station: 'control-room',
    icon: '💓',
    color: '#1ABC9C',
    category: 'system',
  },
  brain_metrics: {
    station: 'control-room',
    icon: '📊',
    color: '#1ABC9C',
    category: 'system',
  },
  brain_meta: {
    station: 'mirror',
    icon: '🪞',
    color: '#95A5A6',
    category: 'system',
  },
  brain_codebase: {
    station: 'control-room',
    icon: '🏗️',
    color: '#1ABC9C',
    category: 'system',
  },

  // === Learning & Orchestration (Green/Purple) ===
  brain_learning: {
    station: 'training-yard',
    icon: '📈',
    color: '#2ECC71',
    category: 'learning',
  },
  brain_triggers: {
    station: 'tripwire-field',
    icon: '⚡',
    color: '#E74C3C',
    category: 'learning',
  },
  brain_orchestrate: {
    station: 'conductor-podium',
    icon: '🎭',
    color: '#9B59B6',
    category: 'orchestration',
  },

  // === Sessions ===
  brain_session_start: {
    station: 'portal',
    icon: '🚪',
    color: '#9B59B6',
    category: 'session',
  },
  brain_session_end: {
    station: 'portal',
    icon: '👋',
    color: '#9B59B6',
    category: 'session',
  },

  // === LSP Tools ===
  brain_lsp_symbols: {
    station: 'code-forge',
    icon: '🔣',
    color: '#3498DB',
    category: 'lsp',
  },
  brain_lsp_references: {
    station: 'code-forge',
    icon: '🔗',
    color: '#3498DB',
    category: 'lsp',
  },
  brain_lsp_callgraph: {
    station: 'code-forge',
    icon: '📞',
    color: '#3498DB',
    category: 'lsp',
  },
  brain_lsp_rename: {
    station: 'code-forge',
    icon: '✏️',
    color: '#3498DB',
    category: 'lsp',
  },
  brain_lsp_outline: {
    station: 'code-forge',
    icon: '📋',
    color: '#3498DB',
    category: 'lsp',
  },
  brain_lsp_imports: {
    station: 'code-forge',
    icon: '📦',
    color: '#3498DB',
    category: 'lsp',
  },
  brain_lsp_stats: {
    station: 'code-forge',
    icon: '📈',
    color: '#3498DB',
    category: 'lsp',
  },

  // === Render (Deployment) ===
  brain_render: {
    station: 'launch-pad',
    icon: '🚀',
    color: '#E74C3C',
    category: 'deploy',
  },
};

/**
 * Get station info for a tool
 * @param {string} toolName - Tool name (e.g., 'brain_cynic_judge')
 * @returns {{station: string, icon: string, color: string, category: string}}
 */
export function getStationInfo(toolName) {
  return CYNIC_STATION_MAP[toolName] || {
    station: 'unknown',
    icon: '📋',
    color: '#95A5A6',
    category: 'other',
  };
}

/**
 * Get icon for a tool
 * @param {string} toolName - Tool name
 * @returns {string} Emoji icon
 */
export function getToolIcon(toolName) {
  return getStationInfo(toolName).icon;
}

/**
 * Get color for a tool
 * @param {string} toolName - Tool name
 * @returns {string} Hex color
 */
export function getToolColor(toolName) {
  return getStationInfo(toolName).color;
}

/**
 * Get all tools in a category
 * @param {string} category - Category name
 * @returns {string[]} Array of tool names
 */
export function getToolsByCategory(category) {
  return Object.entries(CYNIC_STATION_MAP)
    .filter(([, info]) => info.category === category)
    .map(([name]) => name);
}

/**
 * Get all unique stations
 * @returns {string[]} Array of station names
 */
export function getAllStations() {
  return [...new Set(Object.values(CYNIC_STATION_MAP).map(info => info.station))];
}

/**
 * Get all unique categories
 * @returns {string[]} Array of category names
 */
export function getAllCategories() {
  return [...new Set(Object.values(CYNIC_STATION_MAP).map(info => info.category))];
}

// Export to window for non-module scripts
if (typeof window !== 'undefined') {
  window.CYNICStationMap = {
    CYNIC_STATION_MAP,
    getStationInfo,
    getToolIcon,
    getToolColor,
    getToolsByCategory,
    getAllStations,
    getAllCategories,
  };
}
