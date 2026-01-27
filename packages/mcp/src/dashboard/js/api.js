/**
 * CYNIC Dashboard - API Client
 * API + SSE connection to MCP server
 *
 * Phase 17: UX & Performance improvements
 * - Infinite SSE reconnection with Fibonacci backoff
 * - Circuit breaker with cooldown
 * - AbortController for request cancellation
 * - 10-second API timeout
 * - Safe JSON parsing for SSE events
 */

// Fibonacci sequence for backoff (in ms): 1s, 2s, 3s, 5s, 8s, 13s, 21s, 34s, 55s max
const FIBONACCI_BACKOFF = [1000, 2000, 3000, 5000, 8000, 13000, 21000, 34000, 55000];
const API_TIMEOUT_MS = 10000; // 10 second timeout for API calls
const CIRCUIT_BREAKER_THRESHOLD = 5; // Failures before circuit opens
const CIRCUIT_BREAKER_COOLDOWN_MS = 60000; // 1 minute cooldown
const MAX_LISTENERS_PER_EVENT = 100; // Prevent listener memory leaks

/**
 * Safe JSON parse with fallback
 * @param {string} str - String to parse
 * @param {*} fallback - Fallback value on error
 * @returns {*} Parsed value or fallback
 */
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    console.warn('Failed to parse JSON:', str?.slice?.(0, 100));
    return fallback;
  }
}

export class API {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || window.location.origin;
    this.connected = false;
    this.sse = null;
    this.listeners = new Map();

    // SSE reconnection state
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;

    // Circuit breaker state
    this.circuitOpen = false;
    this.circuitFailures = 0;
    this.circuitOpenedAt = null;

    // Active requests for cancellation
    this.activeRequests = new Map();
  }

  /**
   * Initialize API and connect SSE
   */
  async init() {
    // Check health first
    const health = await this.getHealth();
    if (health) {
      this.connected = true;
      this.connectSSE();
      return true;
    }
    return false;
  }

  /**
   * Get Fibonacci backoff delay for current attempt
   */
  _getBackoffDelay() {
    const index = Math.min(this.reconnectAttempts, FIBONACCI_BACKOFF.length - 1);
    return FIBONACCI_BACKOFF[index];
  }

  /**
   * Check if circuit breaker allows connection
   */
  _checkCircuitBreaker() {
    if (!this.circuitOpen) return true;

    // Check if cooldown has passed
    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
      console.log('Circuit breaker: cooldown passed, allowing retry');
      this.circuitOpen = false;
      this.circuitFailures = 0;
      return true;
    }

    const remaining = Math.ceil((CIRCUIT_BREAKER_COOLDOWN_MS - elapsed) / 1000);
    console.log(`Circuit breaker: open, retry in ${remaining}s`);
    return false;
  }

  /**
   * Record SSE failure for circuit breaker
   */
  _recordFailure() {
    this.circuitFailures++;
    if (this.circuitFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      console.warn('Circuit breaker: opened after', this.circuitFailures, 'failures');
    }
  }

  /**
   * Connect to SSE endpoint with infinite reconnection
   */
  connectSSE() {
    // Clear any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check circuit breaker
    if (!this._checkCircuitBreaker()) {
      // Schedule retry after cooldown
      this.reconnectTimer = setTimeout(() => this.connectSSE(), CIRCUIT_BREAKER_COOLDOWN_MS);
      return;
    }

    if (this.sse) {
      this.sse.close();
    }

    this.sse = new EventSource(`${this.baseUrl}/sse`);

    this.sse.onopen = () => {
      console.log('SSE connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.circuitFailures = 0; // Reset on successful connection
      this._emit('connection', { status: 'connected', reconnectAttempts: 0 });
    };

    this.sse.onerror = (err) => {
      console.error('SSE error:', err);
      this.connected = false;
      this._recordFailure();

      // Calculate next retry delay
      const delay = this._getBackoffDelay();
      this.reconnectAttempts++;

      this._emit('connection', {
        status: 'disconnected',
        reconnectAttempts: this.reconnectAttempts,
        nextRetryMs: delay,
        circuitOpen: this.circuitOpen,
      });

      // Schedule reconnection (infinite retries with backoff)
      if (!this.circuitOpen) {
        console.log(`SSE reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimer = setTimeout(() => this.connectSSE(), delay);
      } else {
        // Circuit is open, schedule retry after cooldown
        console.log(`SSE circuit open, retry in ${CIRCUIT_BREAKER_COOLDOWN_MS}ms`);
        this.reconnectTimer = setTimeout(() => this.connectSSE(), CIRCUIT_BREAKER_COOLDOWN_MS);
      }
    };

    this.sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._emit('message', data);
      } catch {
        this._emit('message', { raw: event.data });
      }
    };

    // Listen for specific event types with safe JSON parsing
    this.sse.addEventListener('endpoint', (event) => {
      console.log('SSE endpoint:', event.data);
    });

    this.sse.addEventListener('judgment', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('judgment', data);
    });

    this.sse.addEventListener('alert', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('alert', data);
    });

    this.sse.addEventListener('block', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('block', data);
    });

    // Tool execution events (for Live View timeline)
    this.sse.addEventListener('tool_pre', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('tool_pre', data);
    });

    this.sse.addEventListener('tool_post', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('tool_post', data);
    });

    // Dog events (Collective agent activity)
    this.sse.addEventListener('dogStatus', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('dogStatus', data);
    });

    this.sse.addEventListener('dogDecision', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('dogDecision', data);
    });

    this.sse.addEventListener('dogWarning', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('dogWarning', data);
    });

    // Hook events
    this.sse.addEventListener('hook', (event) => {
      const data = safeJsonParse(event.data);
      if (data) this._emit('hook', data);
    });
  }

  /**
   * Disconnect SSE
   */
  disconnect() {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close SSE
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    this.connected = false;

    // Cancel all active requests
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Fetch with timeout and AbortController
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} timeout - Timeout in ms (default: API_TIMEOUT_MS)
   * @returns {Promise<Response>}
   */
  async _fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT_MS) {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn(`Request timeout after ${timeout}ms:`, url);
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Event listener management
   * Includes limit to prevent memory leaks
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event);

    // Warn if approaching listener limit
    if (listeners.size >= MAX_LISTENERS_PER_EVENT) {
      console.warn(`Event '${event}' has ${listeners.size} listeners, may indicate memory leak`);
      // Remove oldest listener (Sets preserve insertion order)
      const first = listeners.values().next().value;
      listeners.delete(first);
    }

    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  _emit(event, data) {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }

  /**
   * GET health status
   */
  async getHealth() {
    try {
      const res = await this._fetchWithTimeout(`${this.baseUrl}/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('Health check timed out');
      } else {
        console.error('Health check failed:', err);
      }
      return null;
    }
  }

  /**
   * GET metrics (Prometheus format)
   */
  async getMetrics() {
    try {
      const res = await this._fetchWithTimeout(`${this.baseUrl}/metrics`);
      if (!res.ok) return null;
      return await res.text();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('Metrics fetch timed out');
      } else {
        console.error('Metrics fetch failed:', err);
      }
      return null;
    }
  }

  /**
   * List available tools
   */
  async listTools() {
    try {
      const res = await this._fetchWithTimeout(`${this.baseUrl}/api/tools`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.tools || [];
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('List tools timed out');
      } else {
        console.error('List tools failed:', err);
      }
      return [];
    }
  }

  /**
   * Call a tool via REST API
   */
  async callTool(toolName, args = {}) {
    try {
      const res = await this._fetchWithTimeout(`${this.baseUrl}/api/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Unknown error' };
      }

      return {
        success: true,
        result: data.result,
        duration: data.duration,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`Tool ${toolName} call timed out`);
        return { success: false, error: 'Request timed out' };
      }
      console.error(`Tool ${toolName} call failed:`, err);
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TOOL HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get system health
   */
  async health(verbose = true) {
    return this.callTool('brain_health', { verbose });
  }

  /**
   * Judge an item
   */
  async judge(item, context = {}) {
    return this.callTool('brain_cynic_judge', { item, context });
  }

  /**
   * Digest content
   */
  async digest(content, source, type = 'document') {
    return this.callTool('brain_cynic_digest', { content, source, type });
  }

  /**
   * Search knowledge
   */
  async search(query, type = 'all', limit = 10) {
    return this.callTool('brain_search', { query, type, limit });
  }

  /**
   * Get patterns
   * Supports both positional args (category, limit) and object form ({category, limit})
   */
  async patterns(categoryOrOptions = 'all', limit = 10) {
    // Handle object form: patterns({ category: 'all', limit: 100 })
    if (typeof categoryOrOptions === 'object' && categoryOrOptions !== null) {
      const { category = 'all', limit: optLimit = 10 } = categoryOrOptions;
      return this.callTool('brain_patterns', { category, limit: optLimit });
    }
    // Handle positional form: patterns('all', 10)
    return this.callTool('brain_patterns', { category: categoryOrOptions, limit });
  }

  /**
   * Learning loop operations
   */
  async learning(options = {}) {
    return this.callTool('brain_learning', options);
  }

  /**
   * Get collective status
   */
  async collectiveStatus(verbose = false) {
    return this.callTool('brain_collective_status', { verbose });
  }

  /**
   * Get agents status (legacy)
   */
  async agentsStatus(verbose = false) {
    return this.callTool('brain_agents_status', { verbose });
  }

  /**
   * PoJ Chain operations
   */
  async chain(action = 'status', options = {}) {
    return this.callTool('brain_poj_chain', { action, ...options });
  }

  /**
   * Get codebase tree
   */
  async codebase(action = 'tree') {
    return this.callTool('brain_codebase', { action });
  }

  /**
   * Search codebase
   */
  async searchCodebase(query) {
    return this.callTool('brain_codebase', { action: 'search', query });
  }

  /**
   * Get ecosystem docs
   */
  async ecosystem(action = 'list', options = {}) {
    return this.callTool('brain_ecosystem', { action, ...options });
  }

  /**
   * Get metrics via tool
   */
  async metricsData(action = 'collect') {
    return this.callTool('brain_metrics', { action });
  }

  /**
   * Meta dashboard analysis
   */
  async meta(action = 'analyze', verbose = false) {
    return this.callTool('brain_meta', { action, verbose });
  }

  /**
   * Provide feedback on judgment
   */
  async feedback(judgmentId, outcome, reason, actualScore) {
    return this.callTool('brain_cynic_feedback', {
      judgmentId,
      outcome,
      reason,
      actualScore,
    });
  }

  /**
   * Start session
   */
  async sessionStart(userId, project, metadata = {}) {
    return this.callTool('brain_session_start', { userId, project, metadata });
  }

  /**
   * End session
   */
  async sessionEnd(sessionId) {
    return this.callTool('brain_session_end', { sessionId });
  }

  /**
   * Query documentation (Context7)
   */
  async queryDocs(libraryId, query) {
    return this.callTool('brain_docs', { action: 'query', libraryId, query });
  }

  /**
   * Trace judgment integrity (judgment → PoJ block → merkle → Solana anchor)
   */
  async trace(judgmentId, includeRaw = false) {
    return this.callTool('brain_trace', { judgmentId, includeRaw });
  }

  // ─────────────────────────────────────────────────────────────────
  // Dashboard Real-Data APIs (Singularity Index components)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Milestone history for singularity index tracking
   */
  async milestoneHistory(action = 'get', options = {}) {
    return this.callTool('brain_milestone_history', { action, ...options });
  }

  /**
   * Self-modification tracking via git history
   */
  async selfMod(action = 'commits', options = {}) {
    return this.callTool('brain_self_mod', { action, ...options });
  }

  /**
   * Emergence and consciousness detection
   */
  async emergence(action = 'scan') {
    return this.callTool('brain_emergence', { action });
  }

  // ─────────────────────────────────────────────────────────────────
  // Phase 16: Total Memory APIs
  // ─────────────────────────────────────────────────────────────────

  /**
   * Search Total Memory (memories, decisions, lessons)
   */
  async memorySearch(query, options = {}) {
    return this.callTool('brain_memory_search', { query, ...options });
  }

  /**
   * Store in Total Memory
   */
  async memoryStore(type, data) {
    return this.callTool('brain_memory_store', { type, ...data });
  }

  /**
   * Get memory statistics
   */
  async memoryStats() {
    return this.callTool('brain_memory_stats', {});
  }

  /**
   * Self-correction check
   */
  async selfCorrection(action) {
    return this.callTool('brain_self_correction', { action });
  }

  /**
   * Goals management
   */
  async goals(action, options = {}) {
    return this.callTool('brain_goals', { action, ...options });
  }

  /**
   * Tasks management
   */
  async tasks(action, options = {}) {
    return this.callTool('brain_tasks', { action, ...options });
  }

  /**
   * Notifications management
   */
  async notifications(action, options = {}) {
    return this.callTool('brain_notifications', { action, ...options });
  }
}

// Create singleton instance
export const api = new API();

// Export to window
window.CYNICAPI = api;
