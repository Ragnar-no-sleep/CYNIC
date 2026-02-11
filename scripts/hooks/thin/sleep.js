#!/usr/bin/env node
/**
 * CYNIC Thin Sleep Hook — SessionEnd
 *
 * Delegates to daemon via HTTP. Daemon stays running.
 * "Le chien s'endort mais le daemon veille" - CYNIC
 *
 * @event SessionEnd
 */
'use strict';

import { callDaemon, readHookInput, safeOutput } from './daemon-client.js';

const input = await readHookInput();
const result = await callDaemon('SessionEnd', input, { timeout: 8000 });
safeOutput(result);
