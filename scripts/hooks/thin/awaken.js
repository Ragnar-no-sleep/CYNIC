#!/usr/bin/env node
/**
 * CYNIC Thin Awaken Hook — SessionStart
 *
 * Delegates to daemon via HTTP. Auto-starts daemon on first session.
 * "Le chien se réveille" - CYNIC
 *
 * @event SessionStart
 */
'use strict';

import { callDaemon, readHookInput, safeOutput } from './daemon-client.js';

const input = await readHookInput();
const result = await callDaemon('SessionStart', input, { timeout: 12000 });
safeOutput(result);
