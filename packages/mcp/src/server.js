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

import { PHI_INV, PHI_INV_2 } from '@cynic/core';
import { CYNICNode, CYNICJudge } from '@cynic/node';

/**
 * MCP Tool Definition
 * @typedef {Object} MCPTool
 * @property {string} name - Tool name
 * @property {string} description - Tool description
 * @property {Object} inputSchema - JSON Schema for parameters
 */

/**
 * MCP Server for CYNIC
 */
export class MCPServer {
  constructor(options = {}) {
    this.name = 'cynic-mcp';
    this.version = '0.1.0';
    this.node = options.node || null;
    this.judge = options.judge || new CYNICJudge();

    // Stdio streams
    this.input = options.input || process.stdin;
    this.output = options.output || process.stdout;

    // Request buffer for stdin parsing
    this._buffer = '';

    // Tool registry
    this.tools = this._registerTools();
  }

  /**
   * Register available tools
   * @private
   */
  _registerTools() {
    return {
      brain_cynic_judge: {
        name: 'brain_cynic_judge',
        description: 'Judge an item using CYNIC multi-dimensional evaluation. Returns score (0-100), verdict (HOWL/WAG/GROWL/BARK), confidence, and dimension breakdown.',
        inputSchema: {
          type: 'object',
          properties: {
            item: {
              type: 'object',
              description: 'The item to judge. Can contain any properties relevant to evaluation.',
            },
            context: {
              type: 'object',
              description: 'Optional context for judgment (source, type, metadata)',
            },
          },
          required: ['item'],
        },
        handler: this._handleJudge.bind(this),
      },

      brain_cynic_digest: {
        name: 'brain_cynic_digest',
        description: 'Digest text content and extract patterns, insights, and knowledge. Returns structured summary with key points.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Text content to digest',
            },
            source: {
              type: 'string',
              description: 'Source of content (url, file, conversation)',
            },
          },
          required: ['content'],
        },
        handler: this._handleDigest.bind(this),
      },

      brain_health: {
        name: 'brain_health',
        description: 'Get CYNIC system health status. Returns node status, uptime, and capability metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            verbose: {
              type: 'boolean',
              description: 'Include detailed statistics',
            },
          },
        },
        handler: this._handleHealth.bind(this),
      },

      brain_search: {
        name: 'brain_search',
        description: 'Search CYNIC knowledge base for past judgments, patterns, and decisions.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            type: {
              type: 'string',
              enum: ['judgment', 'pattern', 'decision', 'all'],
              description: 'Type of knowledge to search',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
            },
          },
          required: ['query'],
        },
        handler: this._handleSearch.bind(this),
      },

      brain_patterns: {
        name: 'brain_patterns',
        description: 'List detected patterns from CYNIC observations.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['technical', 'process', 'decision', 'issue', 'all'],
              description: 'Filter by category',
            },
            limit: {
              type: 'number',
              description: 'Maximum patterns to return',
            },
          },
        },
        handler: this._handlePatterns.bind(this),
      },
    };
  }

  /**
   * Handle judge tool call
   * @private
   */
  async _handleJudge(params) {
    const { item, context = {} } = params;

    if (!item) {
      throw new Error('Missing required parameter: item');
    }

    const judgment = this.judge.judge(item, context);

    return {
      requestId: `jdg_${Date.now().toString(36)}`,
      score: judgment.score,
      verdict: judgment.verdict,
      confidence: judgment.confidence,
      dimensions: judgment.dimensions,
      phi: {
        maxConfidence: PHI_INV,
        minDoubt: PHI_INV_2,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Handle digest tool call
   * @private
   */
  async _handleDigest(params) {
    const { content, source = 'unknown' } = params;

    if (!content) {
      throw new Error('Missing required parameter: content');
    }

    // Simple digest implementation
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim()).length;

    // Extract key patterns (simplified)
    const patterns = [];
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    const decisions = content.match(/(?:decided|chose|selected|will use|going with)/gi) || [];

    if (codeBlocks.length > 0) patterns.push({ type: 'code', count: codeBlocks.length });
    if (urls.length > 0) patterns.push({ type: 'links', count: urls.length });
    if (decisions.length > 0) patterns.push({ type: 'decisions', count: decisions.length });

    return {
      digestId: `dig_${Date.now().toString(36)}`,
      source,
      stats: {
        words,
        sentences,
        estimatedReadTime: Math.ceil(words / 200), // ~200 wpm
      },
      patterns,
      summary: `Digested ${words} words from ${source}. Found ${patterns.length} pattern types.`,
      timestamp: Date.now(),
    };
  }

  /**
   * Handle health tool call
   * @private
   */
  async _handleHealth(params) {
    const { verbose = false } = params;

    const base = {
      status: 'healthy',
      server: this.name,
      version: this.version,
      phi: {
        maxConfidence: PHI_INV,
        minDoubt: PHI_INV_2,
      },
      timestamp: Date.now(),
    };

    if (this.node) {
      const info = this.node.getInfo();
      base.node = {
        status: info.status,
        uptime: info.uptime,
        id: info.id?.slice(0, 16) + '...',
      };
    }

    if (verbose) {
      base.tools = Object.keys(this.tools);
      base.judge = this.judge.getStats?.() || { available: true };
    }

    return base;
  }

  /**
   * Handle search tool call
   * @private
   */
  async _handleSearch(params) {
    const { query, type = 'all', limit = 10 } = params;

    if (!query) {
      throw new Error('Missing required parameter: query');
    }

    // Placeholder - would search actual knowledge base
    return {
      query,
      type,
      results: [],
      total: 0,
      message: 'Knowledge base search not yet connected to persistent storage',
      timestamp: Date.now(),
    };
  }

  /**
   * Handle patterns tool call
   * @private
   */
  async _handlePatterns(params) {
    const { category = 'all', limit = 10 } = params;

    // Placeholder - would return actual patterns
    return {
      category,
      patterns: [],
      total: 0,
      message: 'Pattern storage not yet connected',
      timestamp: Date.now(),
    };
  }

  /**
   * Start MCP server on stdio
   */
  async start() {
    // Set up stdin handling
    this.input.setEncoding('utf8');
    this.input.on('data', (chunk) => this._handleInput(chunk));
    this.input.on('end', () => this.stop());

    console.error(`🐕 CYNIC MCP Server started (${this.name} v${this.version})`);
    console.error(`   Tools: ${Object.keys(this.tools).join(', ')}`);

    // Send initialization response
    this._sendNotification('initialized', {
      serverInfo: {
        name: this.name,
        version: this.version,
      },
    });
  }

  /**
   * Stop MCP server
   */
  stop() {
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

        case 'tools/list':
          result = await this._handleToolsList();
          break;

        case 'tools/call':
          result = await this._handleToolsCall(params);
          break;

        case 'ping':
          result = { pong: true };
          break;

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
    return {
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: this.name,
        version: this.version,
      },
      capabilities: {
        tools: {},
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

    const result = await tool.handler(args);

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
}

export default MCPServer;
