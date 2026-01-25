/**
 * Service Container - Dependency Injection for CYNIC
 *
 * Enables loose coupling between components.
 * Hooks, Node, MCP can all share the same container pattern.
 *
 * "The spine that connects all organs" - κυνικός
 *
 * @module @cynic/core/container
 */

'use strict';

import { CYNICError, ErrorCode } from './errors.js';

/**
 * Service Container for Dependency Injection
 *
 * Supports:
 * - Singleton services (created once, reused)
 * - Transient services (created fresh each get())
 * - Lazy initialization (factory called on first get())
 * - Named scopes for isolation
 *
 * @example
 * const container = new ServiceContainer();
 * container.register('judge', () => new CYNICJudge(), { singleton: true });
 * container.register('logger', () => new Logger());
 *
 * const judge = container.get('judge'); // same instance
 * const logger = container.get('logger'); // new instance each time
 */
export class ServiceContainer {
  #factories = new Map();
  #singletons = new Map();
  #scopes = new Map();

  /**
   * Register a service factory
   *
   * @param {string} name - Service identifier
   * @param {Function} factory - Factory function that creates the service
   * @param {Object} [options] - Registration options
   * @param {boolean} [options.singleton=false] - If true, same instance returned
   * @param {string[]} [options.tags=[]] - Tags for grouping/filtering services
   * @returns {ServiceContainer} this (for chaining)
   *
   * @example
   * container.register('db', () => new PostgresClient(), { singleton: true });
   */
  register(name, factory, options = {}) {
    if (typeof factory !== 'function') {
      throw new CYNICError(
        `Factory for "${name}" must be a function`,
        ErrorCode.INVALID_INPUT
      );
    }

    this.#factories.set(name, {
      factory,
      singleton: options.singleton ?? false,
      tags: options.tags ?? [],
    });

    // Clear singleton if re-registering
    if (this.#singletons.has(name)) {
      this.#singletons.delete(name);
    }

    return this;
  }

  /**
   * Get a service by name
   *
   * @param {string} name - Service identifier
   * @returns {*} The service instance
   * @throws {CYNICError} If service not registered
   *
   * @example
   * const judge = container.get('judge');
   */
  get(name) {
    if (!this.#factories.has(name)) {
      throw new CYNICError(
        `Service "${name}" not registered`,
        ErrorCode.INVALID_INPUT
      );
    }

    const { factory, singleton } = this.#factories.get(name);

    if (singleton) {
      if (!this.#singletons.has(name)) {
        this.#singletons.set(name, factory(this));
      }
      return this.#singletons.get(name);
    }

    return factory(this);
  }

  /**
   * Check if a service is registered
   *
   * @param {string} name - Service identifier
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.#factories.has(name);
  }

  /**
   * Get all registered service names
   *
   * @returns {string[]} Array of service names
   */
  getNames() {
    return Array.from(this.#factories.keys());
  }

  /**
   * Get services by tag
   *
   * @param {string} tag - Tag to filter by
   * @returns {string[]} Service names with this tag
   *
   * @example
   * container.register('judgments', factory, { tags: ['repository'] });
   * container.register('patterns', factory, { tags: ['repository'] });
   * container.getByTag('repository'); // ['judgments', 'patterns']
   */
  getByTag(tag) {
    const result = [];
    for (const [name, config] of this.#factories) {
      if (config.tags.includes(tag)) {
        result.push(name);
      }
    }
    return result;
  }

  /**
   * Create a child scope
   *
   * Child scopes inherit parent registrations but can override them.
   * Useful for request-scoped services.
   *
   * @param {string} scopeName - Scope identifier
   * @returns {ServiceContainer} Child container
   *
   * @example
   * const requestScope = container.createScope('request');
   * requestScope.register('user', () => getCurrentUser());
   */
  createScope(scopeName) {
    const child = new ServiceContainer();

    // Copy parent factories (not singletons)
    for (const [name, config] of this.#factories) {
      child.#factories.set(name, { ...config });
    }

    // Link parent reference for singleton lookup
    child._parent = this;

    this.#scopes.set(scopeName, child);
    return child;
  }

  /**
   * Get a named scope
   *
   * @param {string} scopeName - Scope identifier
   * @returns {ServiceContainer|undefined} The scope or undefined
   */
  getScope(scopeName) {
    return this.#scopes.get(scopeName);
  }

  /**
   * Dispose of a scope and its singletons
   *
   * @param {string} scopeName - Scope to dispose
   */
  disposeScope(scopeName) {
    const scope = this.#scopes.get(scopeName);
    if (scope) {
      scope.clear();
      this.#scopes.delete(scopeName);
    }
  }

  /**
   * Clear all registrations and singletons
   */
  clear() {
    this.#factories.clear();
    this.#singletons.clear();
    for (const scope of this.#scopes.values()) {
      scope.clear();
    }
    this.#scopes.clear();
  }

  /**
   * Get container statistics
   *
   * @returns {Object} Stats about registered services
   */
  getStats() {
    const stats = {
      totalServices: this.#factories.size,
      singletons: 0,
      transient: 0,
      instantiated: this.#singletons.size,
      scopes: this.#scopes.size,
      tags: new Set(),
    };

    for (const config of this.#factories.values()) {
      if (config.singleton) {
        stats.singletons++;
      } else {
        stats.transient++;
      }
      config.tags.forEach(tag => stats.tags.add(tag));
    }

    stats.tags = Array.from(stats.tags);
    return stats;
  }
}

/**
 * Global container instance
 *
 * Use for application-wide services.
 * For testing, create isolated containers.
 */
export const globalContainer = new ServiceContainer();

/**
 * Create a container with common CYNIC services pre-registered
 *
 * @param {Object} options - Configuration options
 * @param {Object} [options.overrides] - Service overrides (for testing)
 * @returns {ServiceContainer} Configured container
 *
 * @example
 * const container = createCYNICContainer();
 * const judge = container.get('judge');
 */
export function createCYNICContainer(options = {}) {
  const container = new ServiceContainer();
  const overrides = options.overrides ?? {};

  // Register core services with defaults
  // These can be overridden by passing overrides

  // Logger (singleton)
  if (overrides.logger) {
    container.register('logger', () => overrides.logger, { singleton: true });
  }
  // Note: Actual logger registration happens in the caller
  // This just provides the pattern

  return container;
}

/**
 * Decorator pattern for adding DI to classes
 *
 * @param {ServiceContainer} container - Container to use
 * @returns {Function} Decorator function
 *
 * @example
 * const inject = withContainer(container);
 *
 * class MyService {
 *   constructor(deps = inject(['logger', 'db'])) {
 *     this.logger = deps.logger;
 *     this.db = deps.db;
 *   }
 * }
 */
export function withContainer(container) {
  return function inject(serviceNames) {
    const deps = {};
    for (const name of serviceNames) {
      deps[name] = container.get(name);
    }
    return deps;
  };
}

export default ServiceContainer;
