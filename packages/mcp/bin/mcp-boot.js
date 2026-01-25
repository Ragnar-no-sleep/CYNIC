#!/usr/bin/env node

/**
 * CYNIC MCP Server - Boot System Entry Point
 *
 * Uses unified bootCYNIC() for lifecycle management.
 *
 * Run: node bin/mcp-boot.js
 *
 * Environment variables:
 *   MCP_MODE           - Transport mode: 'stdio' (default) or 'http'
 *   PORT               - HTTP port (default: 3000, for http mode)
 *   CYNIC_DATABASE_URL - PostgreSQL connection string
 *   CYNIC_REDIS_URL    - Redis connection string
 *
 * "The pack awakens as one" - κυνικός
 */

'use strict';

import { BootManager, BootEvent } from '@cynic/core/boot';
import {
  createConfigProvider,
  createMigrationsProvider,
  createMCPProvider,
  createEnginesProvider,
} from '@cynic/core/boot/providers';
import { logConfigStatus, validateStartupConfig } from '@cynic/core';

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

try {
  validateStartupConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

logConfigStatus();

// ============================================================================
// BOOT SEQUENCE
// ============================================================================

console.log('🐕 CYNIC MCP Server starting via boot system...');
console.log('');

// Create boot manager with signal handling
const boot = new BootManager({ handleSignals: true });

// Register providers in dependency order
boot.register(createConfigProvider());
boot.register(createMigrationsProvider());
boot.register(createEnginesProvider({ silent: true }));
boot.register(createMCPProvider());

// Log boot events
boot.on(BootEvent.COMPONENT_INITIALIZING, ({ name }) => {
  console.log(`  [INIT] ${name}...`);
});

boot.on(BootEvent.COMPONENT_STARTED, ({ name }) => {
  console.log(`  [OK] ${name}`);
});

boot.on(BootEvent.COMPONENT_FAILED, ({ name, error, phase }) => {
  console.error(`  [FAIL] ${name} (${phase}): ${error.message}`);
});

boot.on(BootEvent.BOOT_COMPLETED, ({ duration, components }) => {
  console.log('');
  console.log(`✅ CYNIC MCP Server ready (${duration}ms)`);
  console.log(`   Components: ${components.join(' → ')}`);
  console.log('');
});

boot.on(BootEvent.SHUTDOWN_STARTED, () => {
  console.log('');
  console.log('🛑 Shutting down...');
});

boot.on(BootEvent.SHUTDOWN_COMPLETED, ({ stopped }) => {
  console.log(`   Stopped: ${stopped.join(' → ')}`);
});

// Boot!
try {
  const result = await boot.boot();

  if (!result.success) {
    console.error('Boot failed');
    process.exit(1);
  }

  // Get MCP server reference for health endpoint
  const mcpProvider = boot.get('mcp-server');

  // Log health periodically in verbose mode
  if (process.env.CYNIC_VERBOSE === 'true') {
    setInterval(async () => {
      const health = await boot.health();
      console.log('[HEALTH]', health.status, health.summary);
    }, 60000);
  }

} catch (error) {
  console.error('');
  console.error('❌ Boot failed:', error.message);
  console.error('');
  process.exit(1);
}
