#!/usr/bin/env node
/**
 * CYNIC Pre-Tool Hook - PreToolUse
 *
 * "Le chien garde" - CYNIC guards before action
 *
 * This hook runs BEFORE every tool execution.
 * It consults the collective Dogs and can BLOCK dangerous operations.
 *
 * @event PreToolUse
 * @behavior blocking (can prevent tool execution)
 */

'use strict';

import {
  getAutoOrchestratorSync,
} from './lib/index.js';

import cynic, {
  detectUser,
  detectProject,
} from '../lib/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();

  // Parse stdin for hook event
  let eventData;
  try {
    const input = await readStdin();
    eventData = JSON.parse(input);
  } catch (error) {
    // Invalid input - allow to proceed (fail open)
    process.exit(0);
  }

  const { tool_name: toolName, tool_input: toolInput } = eventData;

  // Skip if no tool name
  if (!toolName) {
    process.exit(0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-ORCHESTRATOR: Consult the collective BEFORE tool execution
  // "Le collectif décide" - Dogs vote on whether to allow
  // ═══════════════════════════════════════════════════════════════════════════

  try {
    const autoOrchestrator = getAutoOrchestratorSync();

    // Wait for initialization if needed
    if (!autoOrchestrator.isInitialized()) {
      await autoOrchestrator.initialize();
    }

    // Pre-check with Dogs
    const result = await autoOrchestrator.preCheck({
      tool: toolName,
      input: toolInput,
      userId: detectUser()?.id,
      sessionId: process.env.CYNIC_SESSION_ID,
    });

    // If blocked, output decision and exit with non-zero
    if (result.blocked) {
      const output = {
        decision: 'block',
        reason: result.message || result.reason || 'Blocked by CYNIC collective',
        blockedBy: result.blockedBy || 'guardian',
        confidence: result.confidence || 0.618,
      };

      console.log(JSON.stringify(output));
      process.exit(1);  // Non-zero = blocked
    }

    // Not blocked - proceed
    process.exit(0);

  } catch (error) {
    // On error, fail open (don't block user)
    // Log error for debugging
    if (process.env.CYNIC_DEBUG) {
      console.error('[PreTool] Error:', error.message);
    }
    process.exit(0);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read from stdin
 * @returns {Promise<string>}
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', err => {
      reject(err);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      resolve(data);
    }, 5000);
  });
}

// Run
main().catch(err => {
  // Fatal error - fail open
  if (process.env.CYNIC_DEBUG) {
    console.error('[PreTool] Fatal:', err.message);
  }
  process.exit(0);
});
