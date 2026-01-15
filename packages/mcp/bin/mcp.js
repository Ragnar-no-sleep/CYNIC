#!/usr/bin/env node

/**
 * CYNIC MCP Server CLI
 *
 * Run: cynic-mcp
 *
 * Environment variables:
 *   CYNIC_DATABASE_URL - PostgreSQL connection string
 *   CYNIC_REDIS_URL    - Redis connection string
 *
 * "φ distrusts φ" - κυνικός
 */

'use strict';

// Load environment variables from .env file
import 'dotenv/config';

import { MCPServer } from '../src/server.js';

// Start MCP server
const server = new MCPServer();
server.start().catch(err => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
