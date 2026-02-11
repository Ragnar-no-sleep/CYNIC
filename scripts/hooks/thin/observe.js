#!/usr/bin/env node
/**
 * CYNIC Thin Observe Hook — PostToolUse
 *
 * Delegates to daemon via HTTP. Non-blocking observation.
 * "Le chien observe" - CYNIC
 *
 * @event PostToolUse
 */
'use strict';

import { callDaemon, readHookInput, safeOutput } from './daemon-client.js';

const input = await readHookInput();
const result = await callDaemon('PostToolUse', input, { timeout: 3000 });
safeOutput(result);
