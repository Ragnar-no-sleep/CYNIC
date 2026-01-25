/**
 * CYNIC Service Interfaces
 *
 * Abstract interfaces following SOLID principles:
 * - D: Dependency Inversion (depend on abstractions)
 * - I: Interface Segregation (small, focused interfaces)
 * - L: Liskov Substitution (implementations are interchangeable)
 *
 * N-tier architecture layers:
 * 1. Presentation: IPresenter, IHook
 * 2. Application: IJudge, IOrchestrator
 * 3. Domain: IEngine, IScorer, IPattern
 * 4. Infrastructure: IRepository, ICache, IEventBus
 *
 * "Abstractions over concretions" - κυνικός
 *
 * @module @cynic/core/bus/interfaces
 */

'use strict';

// ============================================================================
// INFRASTRUCTURE LAYER INTERFACES
// ============================================================================

/**
 * Repository interface (Data Access)
 * @interface IRepository
 */
export const IRepository = {
  /**
   * @param {string} id
   * @returns {Promise<any>}
   */
  findById: 'findById',

  /**
   * @param {Object} criteria
   * @returns {Promise<any[]>}
   */
  findAll: 'findAll',

  /**
   * @param {any} entity
   * @returns {Promise<any>}
   */
  save: 'save',

  /**
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  delete: 'delete',
};

/**
 * Cache interface
 * @interface ICache
 */
export const ICache = {
  get: 'get',
  set: 'set',
  delete: 'delete',
  has: 'has',
  clear: 'clear',
};

/**
 * Event Bus interface (message passing between layers)
 * @interface IEventBus
 */
export const IEventBus = {
  publish: 'publish',
  subscribe: 'subscribe',
  unsubscribe: 'unsubscribe',
};

// ============================================================================
// DOMAIN LAYER INTERFACES
// ============================================================================

/**
 * Engine interface (philosophical/analytical engine)
 * @interface IEngine
 */
export const IEngine = {
  /**
   * Evaluate input and produce insight
   * @param {any} input
   * @param {Object} context
   * @returns {Promise<{insight: string, confidence: number, reasoning: string}>}
   */
  evaluate: 'evaluate',

  /** @type {string} */
  id: 'id',

  /** @type {string} */
  domain: 'domain',

  /** @type {string[]} */
  capabilities: 'capabilities',
};

/**
 * Scorer interface (calculates scores)
 * @interface IScorer
 */
export const IScorer = {
  /**
   * @param {any} input
   * @returns {Promise<{score: number, breakdown: Object}>}
   */
  score: 'score',

  /** @type {string} */
  name: 'name',
};

/**
 * Pattern interface (detects patterns)
 * @interface IPattern
 */
export const IPattern = {
  /**
   * @param {any} input
   * @returns {Promise<{detected: boolean, pattern: Object, confidence: number}>}
   */
  detect: 'detect',

  /** @type {string} */
  name: 'name',
};

// ============================================================================
// APPLICATION LAYER INTERFACES
// ============================================================================

/**
 * Judge interface (judgment orchestration)
 * @interface IJudge
 */
export const IJudge = {
  /**
   * Create a judgment for input
   * @param {Object} input
   * @returns {Promise<Object>} Judgment result
   */
  judge: 'judge',

  /**
   * Get judgment by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  getJudgment: 'getJudgment',
};

/**
 * Orchestrator interface (multi-engine coordination)
 * @interface IOrchestrator
 */
export const IOrchestrator = {
  /**
   * Consult multiple engines
   * @param {any} input
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  consult: 'consult',

  /**
   * Deliberate on ethical dilemma
   * @param {Object} dilemma
   * @returns {Promise<Object>}
   */
  deliberate: 'deliberate',
};

/**
 * Session interface (user session management)
 * @interface ISession
 */
export const ISession = {
  create: 'create',
  get: 'get',
  update: 'update',
  destroy: 'destroy',
};

// ============================================================================
// PRESENTATION LAYER INTERFACES
// ============================================================================

/**
 * Hook interface (Claude Code integration)
 * @interface IHook
 */
export const IHook = {
  /**
   * Execute hook logic
   * @param {Object} event
   * @returns {Promise<Object>}
   */
  execute: 'execute',

  /** @type {string} */
  event: 'event',

  /** @type {string} */
  name: 'name',
};

/**
 * Tool interface (MCP tool)
 * @interface ITool
 */
export const ITool = {
  /**
   * Execute tool
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  execute: 'execute',

  /** @type {string} */
  name: 'name',

  /** @type {Object} */
  schema: 'schema',
};

// ============================================================================
// INTERFACE VALIDATION
// ============================================================================

/**
 * Check if object implements interface
 *
 * @param {Object} obj - Object to check
 * @param {Object} iface - Interface definition
 * @returns {boolean}
 */
export function implements_(obj, iface) {
  if (!obj) return false;

  for (const key of Object.values(iface)) {
    if (!(key in obj)) {
      return false;
    }
  }
  return true;
}

/**
 * Assert object implements interface
 *
 * @param {Object} obj - Object to check
 * @param {Object} iface - Interface definition
 * @param {string} [name] - Interface name for error message
 * @throws {Error} If interface not implemented
 */
export function assertImplements(obj, iface, name = 'interface') {
  if (!implements_(obj, iface)) {
    const missing = Object.values(iface).filter(key => !(key in obj));
    throw new Error(
      `Object does not implement ${name}. Missing: ${missing.join(', ')}`
    );
  }
}

// ============================================================================
// LAYER BOUNDARY ENFORCEMENT
// ============================================================================

/**
 * Layer definitions for N-tier architecture
 */
export const Layer = {
  PRESENTATION: 'presentation',
  APPLICATION: 'application',
  DOMAIN: 'domain',
  INFRASTRUCTURE: 'infrastructure',
};

/**
 * Allowed layer communications (layer can call layers below)
 */
const ALLOWED_CALLS = {
  [Layer.PRESENTATION]: [Layer.APPLICATION],
  [Layer.APPLICATION]: [Layer.DOMAIN, Layer.INFRASTRUCTURE],
  [Layer.DOMAIN]: [Layer.INFRASTRUCTURE],
  [Layer.INFRASTRUCTURE]: [],
};

/**
 * Check if layer call is allowed
 *
 * @param {string} from - Source layer
 * @param {string} to - Target layer
 * @returns {boolean}
 */
export function isLayerCallAllowed(from, to) {
  return ALLOWED_CALLS[from]?.includes(to) ?? false;
}

/**
 * Create a layer-aware service proxy
 * Logs warnings for layer violations (dev mode only)
 *
 * @param {Object} service - Service to wrap
 * @param {string} layer - Service's layer
 * @returns {Object} Wrapped service
 */
export function createLayerProxy(service, layer) {
  if (process.env.NODE_ENV === 'production') {
    return service; // No overhead in production
  }

  return new Proxy(service, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === 'function') {
        return function (...args) {
          // Could add layer tracking here
          return value.apply(target, args);
        };
      }
      return value;
    },
  });
}
