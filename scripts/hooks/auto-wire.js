#!/usr/bin/env node
/**
 * Auto-Wire Hook - PostToolUse
 *
 * Triggers auto-discovery and wiring suggestions when new components are added.
 *
 * "Le chien connecte automatiquement" - κυνικός
 *
 * Trigger: PostToolUse on Write/Edit tools
 * Behavior: Non-blocking (suggestions only)
 */

'use strict';

import {
  analyzeForWiring,
  formatWiringNotification,
  debugLog,
  debugError,
  recordMetric,
} from './lib/index.js';

/**
 * Hook entry point
 */
async function main() {
  const input = JSON.parse(await readStdin());

  const { tool_name, tool_input, tool_result } = input;

  // Only trigger on Write/Edit
  if (!['Write', 'Edit'].includes(tool_name)) {
    return output({ continue: true });
  }

  // Check if tool succeeded
  if (tool_result?.error) {
    return output({ continue: true });
  }

  try {
    // Analyze for auto-wiring
    const analysis = analyzeForWiring(tool_input, tool_result);

    if (analysis && analysis.shouldWire) {
      debugLog('AUTO-WIRE', `New ${analysis.category} component detected`, {
        file: analysis.filePath,
        imports: analysis.imports.length,
        injectInto: analysis.injectInto,
      });

      // Record metric
      recordMetric('auto_wire.detected', 1, {
        category: analysis.category,
      });

      // Format notification
      const notification = formatWiringNotification(analysis);

      if (notification) {
        // Output as system message for Claude to see
        return output({
          continue: true,
          message: notification,
        });
      }
    }
  } catch (e) {
    debugError('AUTO-WIRE', 'Analysis failed', e, 'warning');
  }

  return output({ continue: true });
}

/**
 * Read stdin
 */
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

/**
 * Output result
 */
function output(result) {
  console.log(JSON.stringify(result));
}

// Run
main().catch((e) => {
  console.error('[AUTO-WIRE] Fatal:', e.message);
  output({ continue: true }); // Don't block on error
});
