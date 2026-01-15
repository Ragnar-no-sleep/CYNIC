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
import { CYNICJudge, StateManager, Operator, createIdentity } from '@cynic/node';
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
   * @param {Object} [options.state] - StateManager instance
   * @param {Object} [options.persistence] - PersistenceManager instance
   * @param {string} [options.dataDir] - Data directory for file-based persistence
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

    // State manager (optional, fallback for file-based persistence)
    this.state = options.state || null;
    this.dataDir = options.dataDir || null;

    // Persistence manager (PostgreSQL + Redis)
    this.persistence = options.persistence || null;

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
    // Initialize persistence (PostgreSQL + Redis) if not provided
    if (!this.persistence) {
      this.persistence = new PersistenceManager();
      await this.persistence.initialize();
    }

    // Create state manager if dataDir provided (fallback for file-based)
    if (this.dataDir && !this.state) {
      const identity = createIdentity();
      const operator = new Operator({ identity });
      this.state = new StateManager({
        dataDir: this.dataDir,
        operator,
      });
      await this.state.initialize();
    }

    // Register tools with current instances
    this.tools = createAllTools({
      judge: this.judge,
      node: this.node,
      state: this.state,
      persistence: this.persistence,
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

    // Save state if available (file-based fallback)
    if (this.state) {
      try {
        await this.state.save();
      } catch (e) {
        console.error('Error saving state:', e.message);
      }
    }

    // Close persistence connections
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

    // Execute tool handler
    const result = await tool.handler(args);

    // Store judgment if it's a judge call
    if (name === 'brain_cynic_judge') {
      // Store in persistence (PostgreSQL) first
      if (this.persistence?.judgments) {
        try {
          await this.persistence.storeJudgment({
            ...result,
            item: args.item,
            context: args.context,
          });
        } catch (e) {
          // Log but don't fail the request
          console.error('Error storing judgment to persistence:', e.message);
        }
      }

      // Fallback to file-based state manager
      if (this.state) {
        try {
          this.state.addJudgment(result);
        } catch (e) {
          // Ignore storage errors
        }
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
      hasState: !!this.state,
      hasPersistence: this.persistence?.isAvailable || false,
      persistenceCapabilities: this.persistence?.capabilities || {},
      judgeStats: this.judge.getStats(),
    };
  }
}

export default MCPServer;
