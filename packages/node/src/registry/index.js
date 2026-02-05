/**
 * Registry module exports
 *
 * Auto-discovery and auto-wiring for CYNIC components
 *
 * @module @cynic/node/registry
 */

'use strict';

export {
  ComponentRegistry,
  ComponentCategory,
  ComponentMetadata,
  getRegistry,
  createComponentMarker,
} from './component-registry.js';

export { AutoWirer, initAutoWiring } from './auto-wirer.js';
