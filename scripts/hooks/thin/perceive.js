#!/usr/bin/env node
/**
 * CYNIC Thin Perceive Hook — UserPromptSubmit
 *
 * Delegates to daemon via HTTP. Auto-starts daemon if needed.
 * "Le chien délègue" - CYNIC
 *
 * @event UserPromptSubmit
 */
'use strict';

import { callDaemon, readHookInput, safeOutput } from './daemon-client.js';

const input = await readHookInput();
const result = await callDaemon('UserPromptSubmit', input, { timeout: 8000 });
safeOutput(result);
