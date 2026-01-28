/**
 * CYNIC TUI Dashboard - Screens Index
 *
 * @module @cynic/node/cli/dashboard/screens
 */

'use strict';

import { createMainScreen } from './main.js';
import { createChainScreen } from './chain.js';
import { createPatternsScreen } from './patterns.js';
import { createAgentsScreen } from './agents.js';
import { createResilienceScreen } from './resilience.js';
import { createDecisionsScreen } from './decisions.js';

export {
  createMainScreen,
  createChainScreen,
  createPatternsScreen,
  createAgentsScreen,
  createResilienceScreen,
  createDecisionsScreen,
};

export default {
  createMainScreen,
  createChainScreen,
  createPatternsScreen,
  createAgentsScreen,
  createResilienceScreen,
  createDecisionsScreen,
};
