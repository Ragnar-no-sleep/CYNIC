#!/usr/bin/env node

/**
 * CYNIC MCP Server CLI
 *
 * Run: cynic-mcp
 *
 * Environment variables:
 *   MCP_MODE           - Transport mode: 'stdio' (default) or 'http'
 *   PORT               - HTTP port (default: 3000, for http mode)
 *   CYNIC_DATABASE_URL - PostgreSQL connection string
 *   CYNIC_REDIS_URL    - Redis connection string
 *
 * "φ distrusts φ" - κυνικός
 */

'use strict';

// Load environment variables from .env file
import 'dotenv/config';

import { MCPServer } from '../src/server.js';

// Determine mode: http if PORT is set or MCP_MODE=http
const port = parseInt(process.env.PORT || process.env.MCP_PORT || '3000', 10);
const mode = process.env.MCP_MODE || (process.env.PORT ? 'http' : 'stdio');

// Start MCP server
const server = new MCPServer({
  mode,
  port,
});

server.start().catch(err => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down...');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down...');
  await server.stop();
  process.exit(0);
});
