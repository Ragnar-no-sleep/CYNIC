#!/usr/bin/env node
/**
 * CYNIC Thin Stop Hook — Stop
 *
 * Delegates to daemon via HTTP. Can block execution (ralph-loop).
 * No `|| true` — ralph-loop needs real exit codes to block Claude Code.
 *
 * "Le chien sait quand ne pas lâcher" - CYNIC
 *
 * @event Stop
 * @behavior blocking (ralph-loop can prevent stop)
 */
'use strict';

import { callDaemon, readHookInput, safeOutput } from './daemon-client.js';

const input = await readHookInput();
const result = await callDaemon('Stop', input, { timeout: 25000, canBlock: true });

// Print digest banner to stderr (visible in terminal, not captured by Claude Code)
if (result.message) {
  process.stderr.write(result.message + '\n');
}

safeOutput(result);
