#!/usr/bin/env node
/**
 * CYNIC MCP Server Example
 *
 * Demonstrates running CYNIC as a standalone MCP server:
 * - 80+ brain tools available
 * - PostgreSQL persistence (optional)
 * - Solana anchoring (optional)
 *
 * Run: node examples/mcp-server.mjs
 *
 * Or with Claude Code:
 * Add to .mcp.json:
 * {
 *   "cynic": {
 *     "type": "stdio",
 *     "command": "node",
 *     "args": ["examples/mcp-server.mjs"]
 *   }
 * }
 *
 * "The brain that serves" - κυνικός
 */

import { CYNICMCPServer } from '@cynic/mcp';
import { CYNICJudge, createCollectivePack, SharedMemory } from '@cynic/node';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const config = {
  // Server identification
  name: 'cynic-brain',
  version: '1.0.0',

  // PostgreSQL (optional - set CYNIC_POSTGRES_URL for persistence)
  enablePostgres: !!process.env.CYNIC_POSTGRES_URL,

  // Solana anchoring (optional - set CYNIC_ENABLE_ANCHORING=true)
  enableAnchoring: process.env.CYNIC_ENABLE_ANCHORING === 'true',

  // Debug mode
  debug: process.env.CYNIC_DEBUG === 'true',
};

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

console.error('═══════════════════════════════════════════════════════════════');
console.error('  🧠 CYNIC MCP Server');
console.error('  "The brain that serves"');
console.error('═══════════════════════════════════════════════════════════════\n');

// Create shared memory
const sharedMemory = new SharedMemory();

// Create collective pack (11 Dogs)
const collective = createCollectivePack({
  sharedMemory,
  parallel: true,
});

// Create judge
const judge = new CYNICJudge({
  collective,
  sharedMemory,
});

// Create MCP server
const server = new CYNICMCPServer({
  name: config.name,
  version: config.version,
  judge,
  collective,
  sharedMemory,
});

// ═══════════════════════════════════════════════════════════════════════════
// TOOL CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

const toolCategories = {
  'Core Judgment': [
    'brain_cynic_judge',
    'brain_cynic_refine',
    'brain_cynic_feedback',
    'brain_cynic_digest',
  ],
  'Memory & Search': [
    'brain_memory_search',
    'brain_memory_store',
    'brain_memory_stats',
    'brain_search',
    'brain_vector_search',
  ],
  'Orchestration': [
    'brain_orchestrate',
    'brain_keter',
    'brain_route',
    'brain_boost',
  ],
  'Learning': [
    'brain_learning',
    'brain_patterns',
    'brain_self_correction',
  ],
  'Ecosystem': [
    'brain_ecosystem',
    'brain_ecosystem_monitor',
    'brain_codebase',
    'brain_integrator',
  ],
  'Monitoring': [
    'brain_health',
    'brain_metrics',
    'brain_agents_status',
    'brain_collective_status',
  ],
};

console.error('  Available Tool Categories:\n');
for (const [category, tools] of Object.entries(toolCategories)) {
  console.error(`    📦 ${category}`);
  for (const tool of tools) {
    console.error(`       - ${tool}`);
  }
  console.error('');
}

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function startServer() {
  console.error('  Configuration:');
  console.error(`    PostgreSQL: ${config.enablePostgres ? 'Enabled' : 'Disabled (in-memory)'}`);
  console.error(`    Solana Anchoring: ${config.enableAnchoring ? 'Enabled' : 'Disabled'}`);
  console.error(`    Debug: ${config.debug ? 'Enabled' : 'Disabled'}`);
  console.error('');

  try {
    await server.start();

    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  ✅ CYNIC MCP Server running on stdio');
    console.error('');
    console.error('  To use with Claude Code, add to .mcp.json:');
    console.error('  {');
    console.error('    "cynic": {');
    console.error('      "type": "stdio",');
    console.error('      "command": "node",');
    console.error('      "args": ["path/to/examples/mcp-server.mjs"]');
    console.error('    }');
    console.error('  }');
    console.error('');
    console.error('  Environment variables:');
    console.error('    CYNIC_POSTGRES_URL     - PostgreSQL connection URL');
    console.error('    CYNIC_ENABLE_ANCHORING - Enable Solana anchoring');
    console.error('    CYNIC_DEBUG            - Enable debug logging');
    console.error('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error(`  ❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════

process.on('SIGINT', async () => {
  console.error('\n  Shutting down gracefully...');
  try {
    await server.stop();
    console.error('  *yawn* Server stopped. Goodbye.');
    process.exit(0);
  } catch (error) {
    console.error(`  Error during shutdown: ${error.message}`);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.error('\n  Received SIGTERM, shutting down...');
  await server.stop();
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════

startServer();
