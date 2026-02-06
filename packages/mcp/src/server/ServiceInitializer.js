/**
 * Service Initializer - Re-export for backwards compatibility
 *
 * The implementation has been extracted to service-initializer/ directory:
 *   - service-initializer/core-factories.js    - EScore, Learning, Judge, etc.
 *   - service-initializer/chain-factories.js   - PoJ Chain, Anchor
 *   - service-initializer/ecosystem-factories.js - Librarian, Discovery, Collective
 *   - service-initializer/claude-flow-factories.js - TieredRouter, SONA, etc.
 *   - service-initializer/bus-subscriptions.js - Event bus wiring
 *   - service-initializer/index.js             - Thin orchestrator
 *
 * @module @cynic/mcp/server/ServiceInitializer
 * @deprecated Use './service-initializer/index.js' instead
 */

'use strict';

// Re-export everything from new location
export { ServiceInitializer, createServiceInitializer } from './service-initializer/index.js';
export { default } from './service-initializer/index.js';
