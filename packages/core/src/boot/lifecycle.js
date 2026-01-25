/**
 * CYNIC Lifecycle Interface
 *
 * Base interface for all CYNIC components that participate in the boot sequence.
 * Every major component (MCP, Node, PostgreSQL, Redis, etc.) should implement this.
 *
 * "From chaos to order" - κυνικός
 *
 * @module @cynic/core/boot/lifecycle
 */

'use strict';

import { CYNICError, ErrorCode } from '../errors.js';

/**
 * Lifecycle states
 */
export const LifecycleState = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  INITIALIZED: 'initialized',
  STARTING: 'starting',
  RUNNING: 'running',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
  FAILED: 'failed',
};

/**
 * Health status
 */
export const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown',
};

/**
 * Lifecycle interface for CYNIC components
 *
 * All major components should extend this class or implement its interface.
 */
export class Lifecycle {
  /**
   * Component name for logging and discovery
   * @type {string}
   */
  name = 'unnamed';

  /**
   * Current lifecycle state
   * @type {string}
   */
  #state = LifecycleState.UNINITIALIZED;

  /**
   * Dependencies that must be initialized before this component
   * @type {string[]}
   */
  dependencies = [];

  /**
   * Timestamp of last state change
   * @type {number|null}
   */
  #stateChangedAt = null;

  /**
   * Error that caused FAILED state
   * @type {Error|null}
   */
  #failureError = null;

  constructor(name, options = {}) {
    this.name = name;
    this.dependencies = options.dependencies || [];
    this.#stateChangedAt = Date.now();
  }

  /**
   * Get current state
   */
  get state() {
    return this.#state;
  }

  /**
   * Get state metadata
   */
  getStateInfo() {
    return {
      state: this.#state,
      stateChangedAt: this.#stateChangedAt,
      uptime: this.#state === LifecycleState.RUNNING
        ? Date.now() - this.#stateChangedAt
        : 0,
      error: this.#failureError?.message || null,
    };
  }

  /**
   * Initialize the component
   * Connect to resources, validate config, prepare for startup
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#state !== LifecycleState.UNINITIALIZED) {
      throw new CYNICError(
        `Cannot initialize ${this.name}: already ${this.#state}`,
        ErrorCode.INVALID_STATE
      );
    }

    this.#setState(LifecycleState.INITIALIZING);

    try {
      await this.onInitialize();
      this.#setState(LifecycleState.INITIALIZED);
    } catch (error) {
      this.#setFailed(error);
      throw error;
    }
  }

  /**
   * Start the component
   * Begin processing requests, start listening, etc.
   *
   * @returns {Promise<void>}
   */
  async start() {
    if (this.#state !== LifecycleState.INITIALIZED) {
      throw new CYNICError(
        `Cannot start ${this.name}: must be initialized first (current: ${this.#state})`,
        ErrorCode.INVALID_STATE
      );
    }

    this.#setState(LifecycleState.STARTING);

    try {
      await this.onStart();
      this.#setState(LifecycleState.RUNNING);
    } catch (error) {
      this.#setFailed(error);
      throw error;
    }
  }

  /**
   * Stop the component
   * Gracefully shutdown, release resources
   *
   * @returns {Promise<void>}
   */
  async stop() {
    if (this.#state !== LifecycleState.RUNNING &&
        this.#state !== LifecycleState.INITIALIZED) {
      // Already stopped or never started
      return;
    }

    this.#setState(LifecycleState.STOPPING);

    try {
      await this.onStop();
      this.#setState(LifecycleState.STOPPED);
    } catch (error) {
      // Log but don't throw - we're shutting down anyway
      console.error(`Error stopping ${this.name}:`, error.message);
      this.#setState(LifecycleState.STOPPED);
    }
  }

  /**
   * Check component health
   *
   * @returns {Promise<Object>} Health check result
   */
  async health() {
    if (this.#state === LifecycleState.FAILED) {
      return {
        status: HealthStatus.UNHEALTHY,
        name: this.name,
        state: this.#state,
        error: this.#failureError?.message,
      };
    }

    if (this.#state !== LifecycleState.RUNNING) {
      return {
        status: HealthStatus.UNKNOWN,
        name: this.name,
        state: this.#state,
      };
    }

    try {
      const health = await this.checkHealth();
      return {
        ...health,
        name: this.name,
        state: this.#state,
        uptime: Date.now() - this.#stateChangedAt,
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        name: this.name,
        state: this.#state,
        error: error.message,
      };
    }
  }

  /**
   * Override in subclass: initialization logic
   * @abstract
   */
  async onInitialize() {
    // Override in subclass
  }

  /**
   * Override in subclass: startup logic
   * @abstract
   */
  async onStart() {
    // Override in subclass
  }

  /**
   * Override in subclass: shutdown logic
   * @abstract
   */
  async onStop() {
    // Override in subclass
  }

  /**
   * Override in subclass: health check logic
   * @abstract
   * @returns {Promise<Object>}
   */
  async checkHealth() {
    return { status: HealthStatus.HEALTHY };
  }

  /**
   * Update state
   * @private
   */
  #setState(newState) {
    this.#state = newState;
    this.#stateChangedAt = Date.now();
    this.#failureError = null;
  }

  /**
   * Set failed state
   * @private
   */
  #setFailed(error) {
    this.#state = LifecycleState.FAILED;
    this.#stateChangedAt = Date.now();
    this.#failureError = error;
  }
}

/**
 * Create a simple lifecycle wrapper for plain objects/functions
 *
 * @param {Object} config - Configuration object
 * @param {string} config.name - Component name
 * @param {string[]} [config.dependencies] - Dependency names
 * @param {Function} [config.initialize] - Initialize callback
 * @param {Function} [config.start] - Start callback
 * @param {Function} [config.stop] - Stop callback
 * @param {Function} [config.health] - Health check callback
 * @returns {Lifecycle}
 */
export function createLifecycle(config) {
  const wrapper = new Lifecycle(config.name, {
    dependencies: config.dependencies,
  });

  // Override methods with provided callbacks
  if (config.initialize) {
    wrapper.onInitialize = config.initialize;
  }
  if (config.start) {
    wrapper.onStart = config.start;
  }
  if (config.stop) {
    wrapper.onStop = config.stop;
  }
  if (config.health) {
    wrapper.checkHealth = config.health;
  }

  return wrapper;
}
