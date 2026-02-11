#!/usr/bin/env node
/**
 * CYNIC Thin Guard Hook — PreToolUse
 *
 * Delegates to daemon via HTTP. Can block execution.
 * "Le chien protège" - CYNIC
 *
 * @event PreToolUse
 * @behavior blocking (can stop execution)
 */
'use strict';

import { callDaemon, readHookInput, safeOutput } from './daemon-client.js';

const input = await readHookInput();
const result = await callDaemon('PreToolUse', input, { timeout: 4000, canBlock: true });
safeOutput(result);

// If daemon says block, exit with code to signal Claude Code
if (result.blocked) {
  process.exit(2);
}
