/**
 * CYNIC MCP Server
 *
 * Model Context Protocol server for AI tool integration
 *
 * Protocol: JSON-RPC 2.0 over stdio
 *
 * "φ distrusts φ" - κυνικός
 *
 * @module @cynic/mcp
 */

'use strict';

import { PHI_INV, PHI_INV_2, IDENTITY } from '@cynic/core';
import { CYNICJudge, AgentManager } from '@cynic/node';
import { createAllTools } from './tools/index.js';
import { PersistenceManager } from './persistence.js';

/**
 * MCP Server for CYNIC
 *
 * Provides brain_cynic_* tools for Claude Code integration:
 * - brain_cynic_judge: Multi-dimensional judgment
 * - brain_cynic_digest: Content extraction
 * - brain_health: System health
 * - brain_search: Knowledge search
 * - brain_patterns: Pattern detection
 * - brain_cynic_feedback: Learning from outcomes
 */
export class MCPServer {
  /**
   * Create MCP server
   * @param {Object} [options] - Server options
   * @param {Object} [options.node] - CYNICNode instance
   * @param {Object} [options.judge] - CYNICJudge instance
   * @param {Object} [options.persistence] - PersistenceManager instance
   * @param {Object} [options.agents] - AgentManager instance (The Four Dogs)
   * @param {string} [options.dataDir] - Data directory for file-based persistence fallback
   * @param {NodeJS.ReadableStream} [options.input] - Input stream (default: stdin)
   * @param {NodeJS.WritableStream} [options.output] - Output stream (default: stdout)
   */
  constructor(options = {}) {
    this.name = 'cynic-mcp';
    this.version = '0.1.0';

    // Node instance (optional)
    this.node = options.node || null;

    // Judge instance (required)
    this.judge = options.judge || new CYNICJudge();

    // Data directory for file-based fallback
    this.dataDir = options.dataDir || null;

    // Persistence manager (PostgreSQL + Redis with automatic fallback)
    this.persistence = options.persistence || null;

    // Agent manager - The Four Dogs (Guardian, Observer, Digester, Mentor)
    this.agents = options.agents || new AgentManager();

    // Stdio streams
    this.input = options.input || process.stdin;
    this.output = options.output || process.stdout;

    // Request buffer for stdin parsing
    this._buffer = '';

    // Running flag
    this._running = false;

    // Tool registry (populated on start)
    this.tools = {};
  }

  /**
   * Initialize components
   * @private
   */
  async _initialize() {
    // Initialize persistence with automatic fallback chain:
    // PostgreSQL → File-based → In-memory
    if (!this.persistence) {
      this.persistence = new PersistenceManager({
        dataDir: this.dataDir, // Pass for file-based fallback
      });
      await this.persistence.initialize();
    }

    // Register tools with current instances
    this.tools = createAllTools({
      judge: this.judge,
      node: this.node,
      persistence: this.persistence,
      agents: this.agents,
    });
  }

  /**
   * Start MCP server on stdio
   */
  async start() {
    if (this._running) return;

    // Initialize components
    await this._initialize();

    this._running = true;

    // Set up stdin handling
    this.input.setEncoding('utf8');
    this.input.on('data', (chunk) => this._handleInput(chunk));
    this.input.on('end', () => this.stop());

    // Log startup to stderr (not interfering with JSON-RPC)
    console.error(`🐕 ${IDENTITY.name} MCP Server started (${this.name} v${this.version})`);
    console.error(`   κυνικός - "${IDENTITY.philosophy.maxConfidence * 100}% max confidence"`);
    console.error(`   Tools: ${Object.keys(this.tools).join(', ')}`);
  }

  /**
   * Stop MCP server
   */
  async stop() {
    if (!this._running) return;

    this._running = false;

    // Close persistence connections (handles file-based save automatically)
    if (this.persistence) {
      try {
        await this.persistence.close();
      } catch (e) {
        console.error('Error closing persistence:', e.message);
      }
    }

    console.error('🐕 CYNIC MCP Server stopped');
    process.exit(0);
  }

  /**
   * Handle incoming stdio data
   * @private
   */
  _handleInput(chunk) {
    this._buffer += chunk;

    // Process complete JSON-RPC messages (newline-delimited)
    let newlineIndex;
    while ((newlineIndex = this._buffer.indexOf('\n')) !== -1) {
      const line = this._buffer.slice(0, newlineIndex).trim();
      this._buffer = this._buffer.slice(newlineIndex + 1);

      if (line) {
        this._processMessage(line);
      }
    }
  }

  /**
   * Process a JSON-RPC message
   * @private
   */
  async _processMessage(line) {
    try {
      const message = JSON.parse(line);

      if (!message.jsonrpc || message.jsonrpc !== '2.0') {
        this._sendError(message.id, -32600, 'Invalid JSON-RPC version');
        return;
      }

      // Handle different message types
      if (message.method) {
        await this._handleRequest(message);
      }
    } catch (err) {
      this._sendError(null, -32700, `Parse error: ${err.message}`);
    }
  }

  /**
   * Handle JSON-RPC request
   * @private
   */
  async _handleRequest(request) {
    const { id, method, params = {} } = request;

    try {
      let result;

      switch (method) {
        case 'initialize':
          result = await this._handleInitialize(params);
          break;

        case 'initialized':
          // Client acknowledgment - no response needed
          return;

        case 'notifications/initialized':
          // Client notification - no response needed
          return;

        case 'tools/list':
          result = await this._handleToolsList();
          break;

        case 'tools/call':
          result = await this._handleToolsCall(params);
          break;

        case 'resources/list':
          result = { resources: [] };
          break;

        case 'prompts/list':
          result = { prompts: [] };
          break;

        case 'ping':
          result = { pong: true, timestamp: Date.now() };
          break;

        case 'shutdown':
          await this.stop();
          return;

        default:
          this._sendError(id, -32601, `Method not found: ${method}`);
          return;
      }

      this._sendResponse(id, result);
    } catch (err) {
      this._sendError(id, -32000, err.message);
    }
  }

  /**
   * Handle initialize request
   * @private
   */
  async _handleInitialize(params) {
    const { protocolVersion, clientInfo } = params;

    // Log client info
    if (clientInfo) {
      console.error(`   Client: ${clientInfo.name} v${clientInfo.version || '?'}`);
    }

    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: this.name,
        version: this.version,
      },
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    };
  }

  /**
   * Handle tools/list request
   * @private
   */
  async _handleToolsList() {
    return {
      tools: Object.values(this.tools).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  }

  /**
   * Handle tools/call request
   * @private
   */
  async _handleToolsCall(params) {
    const { name, arguments: args = {} } = params;

    const tool = this.tools[name];
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // 🐕 Guardian: PreToolUse check (blocking)
    // Guardian barks BEFORE the damage - one confirmation saves hours of recovery
    const guardianResult = await this.agents.process({
      type: 'PreToolUse',
      tool: name,
      input: args,
      timestamp: Date.now(),
    });

    if (guardianResult._blocked) {
      const blockedBy = guardianResult._blockedBy || 'guardian';
      const message = guardianResult[blockedBy]?.message || 'Operation blocked by Guardian';
      console.error(`🐕 [BLOCKED] Tool "${name}" blocked by ${blockedBy}: ${message}`);
      throw new Error(`[BLOCKED] ${message}`);
    }

    // Log warning if Guardian raised one
    if (guardianResult.guardian?.response === 'warn') {
      console.error(`🐕 [WARNING] Tool "${name}": ${guardianResult.guardian.message}`);
    }

    // Execute tool handler
    const startTime = Date.now();
    const result = await tool.handler(args);
    const duration = Date.now() - startTime;

    // 🐕 Observer: PostToolUse logging (non-blocking, silent)
    // Observer watches the meta - repeated failures, unusual sequences, emerging patterns
    this.agents.process({
      type: 'PostToolUse',
      tool: name,
      input: args,
      output: result,
      duration,
      success: true,
      timestamp: Date.now(),
    }).catch(err => {
      // Observer is non-blocking - log but don't fail the request
      console.error(`🐕 Observer error: ${err.message}`);
    });

    // Store judgment if it's a judge call
    // PersistenceManager handles fallback automatically (PostgreSQL → File → Memory)
    if (name === 'brain_cynic_judge' && this.persistence) {
      try {
        await this.persistence.storeJudgment({
          ...result,
          item: args.item,
          context: args.context,
        });
      } catch (e) {
        // Log but don't fail the request
        console.error('Error storing judgment:', e.message);
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  /**
   * Send JSON-RPC response
   * @private
   */
  _sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result,
    };
    this.output.write(JSON.stringify(response) + '\n');
  }

  /**
   * Send JSON-RPC error
   * @private
   */
  _sendError(id, code, message) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
    this.output.write(JSON.stringify(response) + '\n');
  }

  /**
   * Send JSON-RPC notification
   * @private
   */
  _sendNotification(method, params) {
    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.output.write(JSON.stringify(notification) + '\n');
  }

  /**
   * Get server info
   * @returns {Object} Server information
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      running: this._running,
      tools: Object.keys(this.tools),
      hasNode: !!this.node,
      // Unified persistence (PostgreSQL → File → Memory fallback)
      persistenceBackend: this.persistence?._backend || 'none',
      persistenceCapabilities: this.persistence?.capabilities || {},
      judgeStats: this.judge.getStats(),
      // 🐕 The Four Dogs status
      agents: this.agents.getSummary(),
    };
  }
}

export default MCPServer;
