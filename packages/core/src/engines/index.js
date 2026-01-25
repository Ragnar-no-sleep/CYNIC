/**
 * CYNIC Engine System
 *
 * Central system for managing philosophical and analytical engines.
 * Enables registration, discovery, and orchestration of domain experts.
 *
 * "The pack, organized" - κυνικός
 *
 * @module @cynic/core/engines
 */

'use strict';

// Engine base class and utilities
export {
  Engine,
  EngineDomain,
  EngineStatus,
  createFunctionalEngine,
} from './engine.js';

// Engine registry
export {
  EngineRegistry,
  globalEngineRegistry,
} from './registry.js';

// Engine orchestrator
export {
  EngineOrchestrator,
  SynthesisStrategy,
  createOrchestrator,
} from './orchestrator.js';
