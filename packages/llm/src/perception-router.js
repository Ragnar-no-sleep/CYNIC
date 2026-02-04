/**
 * CYNIC Perception Router
 *
 * Routes information requests to the optimal perception layer:
 *   Layer 1: APIs (structured, fast — DexScreener, Helius, Gemini API)
 *   Layer 2: MCP Tools (standardized — brain_*, GitHub, Render)
 *   Layer 3: Browser (universal — Playwright MCP, any web page)
 *   Layer 4: Filesystem (local — project files, exports, screenshots)
 *
 * The router selects the best layer based on:
 * - URL/target pattern matching
 * - Available API keys and MCP servers
 * - Desired data structure (structured vs raw)
 * - Latency requirements
 *
 * @module @cynic/llm/perception-router
 */

'use strict';

import { createLogger, PHI_INV } from '@cynic/core';

const log = createLogger('PerceptionRouter');

// ═══════════════════════════════════════════════════════════════════════════
// PERCEPTION LAYERS
// ═══════════════════════════════════════════════════════════════════════════

export const PerceptionLayer = Object.freeze({
  API: 'api',
  MCP: 'mcp',
  BROWSER: 'browser',
  FILESYSTEM: 'filesystem',
});

// ═══════════════════════════════════════════════════════════════════════════
// KNOWN API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Known API endpoints that can be accessed directly.
 * Each entry maps a URL pattern to an API integration.
 */
const API_ROUTES = [
  {
    pattern: /dexscreener\.com/i,
    api: 'dexscreener',
    envKey: null, // Public API
    mcpTool: null,
    description: 'DexScreener token/pair data',
  },
  {
    pattern: /helius\.dev|solana|mainnet.*solana/i,
    api: 'helius',
    envKey: 'HELIUS_API_KEY',
    mcpTool: 'mcp__solana-dev__getAccountInfo',
    description: 'Solana RPC via Helius',
  },
  {
    pattern: /generativelanguage\.googleapis\.com|gemini/i,
    api: 'gemini',
    envKey: 'GEMINI_API_KEY',
    mcpTool: null,
    description: 'Google Gemini API',
  },
  {
    pattern: /api\.github\.com|github\.com/i,
    api: 'github',
    envKey: 'GITHUB_TOKEN',
    mcpTool: 'mcp__github__get_file_contents',
    description: 'GitHub API',
  },
  {
    pattern: /render\.com/i,
    api: 'render',
    envKey: 'RENDER_API_KEY',
    mcpTool: 'mcp__render__list_services',
    description: 'Render deployment API',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// KNOWN MCP TOOL ROUTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Known MCP tool patterns for Layer 2 routing.
 */
const MCP_ROUTES = [
  // ─── BLOCKCHAIN ─────────────────────────────────────────────────────────
  {
    pattern: /solana|spl.*token|phantom|jupiter|wallet.*balance/i,
    tools: ['mcp__solana-dev__getAccountInfo', 'mcp__solana-dev__getBalance', 'mcp__solana-dev__getTransaction'],
    description: 'Solana blockchain data',
  },
  // ─── GITHUB ─────────────────────────────────────────────────────────────
  {
    pattern: /github\.com.*(?:pull|issue|repo)|pull.*request|pr\s*#|issue\s*#/i,
    tools: [
      'mcp__github__get_pull_request', 'mcp__github__list_pull_requests',
      'mcp__github__get_issue', 'mcp__github__list_issues',
      'mcp__github__get_file_contents', 'mcp__github__search_code',
      'mcp__github__get_pull_request_files', 'mcp__github__get_pull_request_status',
    ],
    description: 'GitHub repositories, PRs, and issues',
  },
  // ─── INFRASTRUCTURE ─────────────────────────────────────────────────────
  {
    pattern: /render\.com.*(?:service|deploy)|deploy.*status|infra.*health|service.*log/i,
    tools: [
      'mcp__render__list_services', 'mcp__render__get_service',
      'mcp__render__list_deploys', 'mcp__render__get_deploy',
      'mcp__render__list_logs', 'mcp__render__get_metrics',
    ],
    description: 'Render deployment and infrastructure',
  },
  // ─── DOCUMENTATION ──────────────────────────────────────────────────────
  {
    pattern: /docs?|documentation|library.*ref|api\s*ref|reference.*for/i,
    tools: [
      'mcp__plugin_context7_context7__resolve-library-id',
      'mcp__plugin_context7_context7__query-docs',
    ],
    description: 'Library documentation via Context7',
  },
  // ─── ORACLE (Token Scoring) ─────────────────────────────────────────────
  {
    pattern: /token.*scor|oracle.*score|mint.*judge|verdict.*token|q.?score/i,
    tools: ['brain_oracle_score', 'brain_oracle_watchlist', 'brain_oracle_stats'],
    description: 'Oracle 17-dim token scoring',
  },
  // ─── SOCIAL / X ─────────────────────────────────────────────────────────
  {
    pattern: /tweet|twitter|x\.com|social.*media|trending|feed/i,
    tools: ['brain_x_feed', 'brain_x_search', 'brain_x_analyze', 'brain_x_trends'],
    description: 'X/Twitter social intelligence',
  },
  // ─── CYNIC MEMORY ───────────────────────────────────────────────────────
  {
    pattern: /remember|recall|past.*session|history|memory.*search|what.*learn/i,
    tools: ['brain_memory_search', 'brain_search', 'brain_patterns'],
    description: 'CYNIC collective memory and patterns',
  },
  // ─── CYNIC JUDGMENT ─────────────────────────────────────────────────────
  {
    pattern: /judge|evaluat|assess|score|verdict|review.*quality/i,
    tools: ['brain_cynic_judge', 'brain_cynic_refine', 'brain_consensus'],
    description: 'CYNIC 25-dimension judgment',
  },
  // ─── ECOSYSTEM ──────────────────────────────────────────────────────────
  {
    pattern: /ecosystem|repo.*status|project.*health|cross.*project/i,
    tools: ['brain_ecosystem', 'brain_ecosystem_monitor', 'brain_integrator'],
    description: 'CYNIC ecosystem monitoring',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FILESYSTEM PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const FILESYSTEM_PATTERNS = [
  /^[A-Za-z]:\\/, // Windows absolute path
  /^\/(?:home|tmp|var|usr|etc|mnt|opt)/, // Unix absolute path
  /^\.\.?\//, // Relative path
  /\.(js|ts|json|md|html|css|py|rs|toml|yaml|yml)$/i, // File extensions
];

// ═══════════════════════════════════════════════════════════════════════════
// PERCEPTION ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export class PerceptionRouter {
  /**
   * @param {Object} options
   * @param {Object} [options.env] - Environment variables (defaults to process.env)
   * @param {Set<string>} [options.availableMcpTools] - Set of available MCP tool names
   */
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.availableMcpTools = options.availableMcpTools || new Set();
    this.stats = {
      routes: 0,
      byLayer: {
        [PerceptionLayer.API]: 0,
        [PerceptionLayer.MCP]: 0,
        [PerceptionLayer.BROWSER]: 0,
        [PerceptionLayer.FILESYSTEM]: 0,
      },
    };
  }

  /**
   * Route a perception request to the optimal layer.
   *
   * @param {Object} request
   * @param {string} request.target - URL, path, or description of what to perceive
   * @param {string} [request.intent] - What the caller wants (e.g., 'read', 'analyze', 'screenshot')
   * @param {boolean} [request.preferStructured] - Prefer structured data over raw HTML
   * @param {boolean} [request.preferFast] - Prefer speed over completeness
   * @returns {Object} Routing decision with layer, tools, and execution plan
   */
  route(request) {
    const { target, intent = 'read', preferStructured = true, preferFast = false } = request;
    this.stats.routes++;

    // Layer 4: Filesystem — check first (local is always fastest)
    if (this._isFilesystemTarget(target)) {
      return this._routeFilesystem(target, intent);
    }

    // Layer 1: API — check if a direct API is available
    const apiRoute = this._findApiRoute(target);
    if (apiRoute && this._isApiAvailable(apiRoute)) {
      return this._routeApi(apiRoute, target, intent);
    }

    // Layer 2: MCP — check if an MCP tool covers this
    const mcpRoute = this._findMcpRoute(target);
    if (mcpRoute && this._hasMcpTools(mcpRoute)) {
      return this._routeMcp(mcpRoute, target, intent);
    }

    // Layer 2 fallback: API route has an MCP tool alternative
    if (apiRoute && apiRoute.mcpTool && this.availableMcpTools.has(apiRoute.mcpTool)) {
      return this._routeMcp(
        { tools: [apiRoute.mcpTool], description: apiRoute.description },
        target,
        intent
      );
    }

    // Layer 3: Browser — universal fallback for web content
    if (this._isWebTarget(target)) {
      return this._routeBrowser(target, intent);
    }

    // Unknown target — return best guess
    return this._routeUnknown(target, intent);
  }

  // ─── LAYER ROUTING ──────────────────────────────────────────────────────

  /** @private */
  _routeFilesystem(target, intent) {
    this.stats.byLayer[PerceptionLayer.FILESYSTEM]++;
    return {
      layer: PerceptionLayer.FILESYSTEM,
      confidence: PHI_INV,
      target,
      intent,
      plan: {
        description: `Read local file: ${target}`,
        steps: [
          { action: 'read_file', path: target },
        ],
      },
      note: 'Use Read tool directly for local files.',
    };
  }

  /** @private */
  _routeApi(apiRoute, target, intent) {
    this.stats.byLayer[PerceptionLayer.API]++;
    return {
      layer: PerceptionLayer.API,
      confidence: PHI_INV,
      target,
      intent,
      api: apiRoute.api,
      plan: {
        description: `${apiRoute.description} via direct API`,
        steps: [
          { action: 'api_call', api: apiRoute.api, target },
        ],
      },
      note: `Layer 1 (fastest). Use ${apiRoute.api} API directly.`,
    };
  }

  /** @private */
  _routeMcp(mcpRoute, target, intent) {
    this.stats.byLayer[PerceptionLayer.MCP]++;
    return {
      layer: PerceptionLayer.MCP,
      confidence: PHI_INV,
      target,
      intent,
      tools: mcpRoute.tools,
      plan: {
        description: `${mcpRoute.description} via MCP tools`,
        steps: mcpRoute.tools.map(tool => ({
          action: 'mcp_call',
          tool,
          target,
        })),
      },
      note: `Layer 2 (standardized). Use MCP tool: ${mcpRoute.tools[0]}`,
    };
  }

  /** @private */
  _routeBrowser(target, intent) {
    this.stats.byLayer[PerceptionLayer.BROWSER]++;

    const steps = [
      {
        action: 'browser_navigate',
        tool: 'mcp__playwright__browser_navigate',
        params: { url: target },
      },
      {
        action: 'browser_snapshot',
        tool: 'mcp__playwright__browser_snapshot',
        params: {},
      },
    ];

    if (intent === 'screenshot' || intent === 'visual') {
      steps.push({
        action: 'browser_screenshot',
        tool: 'mcp__playwright__browser_take_screenshot',
        params: {},
      });
    }

    return {
      layer: PerceptionLayer.BROWSER,
      confidence: PHI_INV * 0.8, // Slightly lower — browser is less reliable
      target,
      intent,
      plan: {
        description: `Browser access to ${target}`,
        steps,
      },
      note: 'Layer 3 (universal). Execute via Playwright MCP tools sequentially.',
    };
  }

  /** @private */
  _routeUnknown(target, intent) {
    // Default to browser if it looks like it could be a URL
    if (target && (target.includes('.') || target.includes('/'))) {
      return this._routeBrowser(target, intent);
    }

    return {
      layer: null,
      confidence: 0.2,
      target,
      intent,
      plan: null,
      note: 'Could not determine perception layer. Provide a URL or file path.',
    };
  }

  // ─── DETECTION HELPERS ──────────────────────────────────────────────────

  /** @private */
  _isFilesystemTarget(target) {
    if (!target) return false;
    return FILESYSTEM_PATTERNS.some(p => p.test(target));
  }

  /** @private */
  _isWebTarget(target) {
    if (!target) return false;
    return /^https?:\/\//i.test(target) ||
           /^www\./i.test(target) ||
           /\.(com|org|net|io|dev|app|xyz|ai)\b/i.test(target);
  }

  /** @private */
  _findApiRoute(target) {
    if (!target) return null;
    return API_ROUTES.find(r => r.pattern.test(target)) || null;
  }

  /** @private */
  _isApiAvailable(apiRoute) {
    // Public APIs (no key needed) are always available
    if (!apiRoute.envKey) return true;
    return !!this.env[apiRoute.envKey];
  }

  /** @private */
  _findMcpRoute(target) {
    if (!target) return null;
    return MCP_ROUTES.find(r => r.pattern.test(target)) || null;
  }

  /** @private */
  _hasMcpTools(mcpRoute) {
    return mcpRoute.tools.some(t => this.availableMcpTools.has(t));
  }

  // ─── PUBLIC API ─────────────────────────────────────────────────────────

  /**
   * Register available MCP tools (call this on server init).
   * @param {string[]} toolNames - Array of tool names
   */
  registerMcpTools(toolNames) {
    toolNames.forEach(t => this.availableMcpTools.add(t));
    log.debug(`Registered ${toolNames.length} MCP tools for perception routing`);
  }

  /**
   * Add a custom API route.
   * @param {Object} route - { pattern: RegExp, api: string, envKey: string|null, mcpTool: string|null, description: string }
   */
  addApiRoute(route) {
    API_ROUTES.push(route);
  }

  /**
   * Add a custom MCP route at runtime.
   * @param {Object} route - { pattern: RegExp, tools: string[], description: string }
   */
  addMcpRoute(route) {
    MCP_ROUTES.push(route);
  }

  /**
   * Record routing outcome for adaptive learning.
   * Tracks success/failure/latency per tool to inform future routing.
   *
   * @param {string} layer - api|mcp|browser|filesystem
   * @param {string} tool - Tool name used
   * @param {boolean} success - Did the route succeed?
   * @param {number} [latency=0] - Execution time in ms
   */
  recordOutcome(layer, tool, success, latency = 0) {
    if (!this._outcomes) this._outcomes = [];
    this._outcomes.push({ layer, tool, success, latency, ts: Date.now() });

    // Keep last 200 outcomes (rolling window)
    if (this._outcomes.length > 200) this._outcomes.shift();

    // Update per-tool stats
    if (!this.stats.byTool) this.stats.byTool = {};
    if (!this.stats.byTool[tool]) {
      this.stats.byTool[tool] = { success: 0, failure: 0, avgLatency: 0, total: 0 };
    }
    const s = this.stats.byTool[tool];
    s.total++;
    if (success) s.success++; else s.failure++;
    s.avgLatency = Math.round((s.avgLatency * (s.total - 1) + latency) / s.total);
  }

  /**
   * Get tool reliability score (success rate).
   * @param {string} tool - Tool name
   * @returns {number} Success rate 0-1, or PHI_INV if unknown
   */
  getToolReliability(tool) {
    const s = this.stats.byTool?.[tool];
    if (!s || s.total === 0) return PHI_INV; // Default: assume 61.8% reliable
    return s.success / s.total;
  }

  /**
   * Get routing stats.
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

/**
 * Get or create the PerceptionRouter singleton.
 * @param {Object} [options]
 * @returns {PerceptionRouter}
 */
export function getPerceptionRouter(options = {}) {
  if (!_instance) {
    _instance = new PerceptionRouter(options);
  }
  return _instance;
}

/**
 * Reset singleton (testing).
 */
export function _resetPerceptionRouterForTesting() {
  _instance = null;
}

export default PerceptionRouter;
