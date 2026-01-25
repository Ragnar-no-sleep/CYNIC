/**
 * Engine Registry
 *
 * Central registry for discovering and managing CYNIC engines.
 * Enables dynamic discovery, capability-based queries, and dependency resolution.
 *
 * "The kennel knows all its dogs" - κυνικός
 *
 * @module @cynic/core/engines/registry
 */

'use strict';

import { Engine, EngineStatus } from './engine.js';

/**
 * Engine Registry
 *
 * Central registry for all CYNIC engines with discovery and query capabilities.
 *
 * @example
 * const registry = new EngineRegistry();
 * registry.register(stoicEngine);
 * registry.register(kantianEngine);
 *
 * const ethicsEngines = registry.getByDomain('ethics');
 * const virtueExperts = registry.getByCapability('virtue-ethics');
 */
export class EngineRegistry {
  #engines = new Map();
  #byDomain = new Map();
  #byCapability = new Map();
  #dependencyGraph = new Map();

  /**
   * Register an engine
   *
   * @param {Engine} engine - Engine instance to register
   * @returns {EngineRegistry} this (for chaining)
   * @throws {Error} If engine with same ID already registered
   *
   * @example
   * registry.register(new StoicEngine());
   */
  register(engine) {
    if (!(engine instanceof Object) || !engine.id || !engine.evaluate) {
      throw new Error('Invalid engine: must have id and evaluate method');
    }

    if (this.#engines.has(engine.id)) {
      throw new Error(`Engine "${engine.id}" already registered`);
    }

    // Store engine
    this.#engines.set(engine.id, engine);

    // Index by domain
    const domain = engine.domain;
    if (!this.#byDomain.has(domain)) {
      this.#byDomain.set(domain, new Set());
    }
    this.#byDomain.get(domain).add(engine.id);

    // Also index by subdomains
    for (const subdomain of engine.subdomains || []) {
      if (!this.#byDomain.has(subdomain)) {
        this.#byDomain.set(subdomain, new Set());
      }
      this.#byDomain.get(subdomain).add(engine.id);
    }

    // Index by capabilities
    for (const capability of engine.capabilities || []) {
      if (!this.#byCapability.has(capability)) {
        this.#byCapability.set(capability, new Set());
      }
      this.#byCapability.get(capability).add(engine.id);
    }

    // Track dependencies
    this.#dependencyGraph.set(engine.id, engine.dependencies || []);

    return this;
  }

  /**
   * Unregister an engine
   *
   * @param {string} id - Engine ID to remove
   * @returns {boolean} True if removed
   */
  unregister(id) {
    const engine = this.#engines.get(id);
    if (!engine) return false;

    // Remove from domain index
    const domainSet = this.#byDomain.get(engine.domain);
    if (domainSet) domainSet.delete(id);

    for (const subdomain of engine.subdomains || []) {
      const subSet = this.#byDomain.get(subdomain);
      if (subSet) subSet.delete(id);
    }

    // Remove from capability index
    for (const capability of engine.capabilities || []) {
      const capSet = this.#byCapability.get(capability);
      if (capSet) capSet.delete(id);
    }

    // Remove from dependency graph
    this.#dependencyGraph.delete(id);

    // Remove engine
    this.#engines.delete(id);

    return true;
  }

  /**
   * Get an engine by ID
   *
   * @param {string} id - Engine ID
   * @returns {Engine|undefined}
   */
  get(id) {
    return this.#engines.get(id);
  }

  /**
   * Check if an engine is registered
   *
   * @param {string} id - Engine ID
   * @returns {boolean}
   */
  has(id) {
    return this.#engines.has(id);
  }

  /**
   * Get all engines in a domain
   *
   * @param {string} domain - Domain to query
   * @returns {Engine[]} Engines in this domain
   *
   * @example
   * const ethicsEngines = registry.getByDomain('ethics');
   */
  getByDomain(domain) {
    const ids = this.#byDomain.get(domain);
    if (!ids) return [];
    return Array.from(ids).map(id => this.#engines.get(id));
  }

  /**
   * Get all engines with a capability
   *
   * @param {string} capability - Capability to query
   * @returns {Engine[]} Engines with this capability
   *
   * @example
   * const virtueExperts = registry.getByCapability('virtue-ethics');
   */
  getByCapability(capability) {
    const ids = this.#byCapability.get(capability);
    if (!ids) return [];
    return Array.from(ids).map(id => this.#engines.get(id));
  }

  /**
   * Get all engines matching multiple criteria
   *
   * @param {Object} query - Query criteria
   * @param {string} [query.domain] - Required domain
   * @param {string[]} [query.capabilities] - Required capabilities (AND)
   * @param {string} [query.tradition] - Philosophical tradition
   * @returns {Engine[]} Matching engines
   *
   * @example
   * const engines = registry.query({
   *   domain: 'ethics',
   *   capabilities: ['virtue-ethics'],
   *   tradition: 'stoic'
   * });
   */
  query(criteria = {}) {
    let candidates = Array.from(this.#engines.values());

    // Filter by domain
    if (criteria.domain) {
      candidates = candidates.filter(e => e.inDomain(criteria.domain));
    }

    // Filter by capabilities (AND - must have all)
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      candidates = candidates.filter(e =>
        criteria.capabilities.every(cap => e.hasCapability(cap))
      );
    }

    // Filter by tradition
    if (criteria.tradition) {
      candidates = candidates.filter(e => e.tradition === criteria.tradition);
    }

    // Filter by status
    if (criteria.status) {
      candidates = candidates.filter(e => e.status === criteria.status);
    }

    return candidates;
  }

  /**
   * Get all registered engine IDs
   *
   * @returns {string[]}
   */
  getIds() {
    return Array.from(this.#engines.keys());
  }

  /**
   * Get all registered engines
   *
   * @returns {Engine[]}
   */
  getAll() {
    return Array.from(this.#engines.values());
  }

  /**
   * Get all known domains
   *
   * @returns {string[]}
   */
  getDomains() {
    return Array.from(this.#byDomain.keys());
  }

  /**
   * Get all known capabilities
   *
   * @returns {string[]}
   */
  getCapabilities() {
    return Array.from(this.#byCapability.keys());
  }

  /**
   * Resolve dependencies for an engine (topological sort)
   *
   * @param {string} id - Engine ID
   * @returns {string[]} Ordered list of engine IDs to load
   * @throws {Error} If circular dependency detected
   */
  resolveDependencies(id) {
    const resolved = [];
    const visiting = new Set();
    const visited = new Set();

    const visit = (engineId) => {
      if (visited.has(engineId)) return;
      if (visiting.has(engineId)) {
        throw new Error(`Circular dependency detected: ${engineId}`);
      }

      visiting.add(engineId);

      const deps = this.#dependencyGraph.get(engineId) || [];
      for (const dep of deps) {
        if (!this.#engines.has(dep)) {
          throw new Error(`Missing dependency: ${engineId} requires ${dep}`);
        }
        visit(dep);
      }

      visiting.delete(engineId);
      visited.add(engineId);
      resolved.push(engineId);
    };

    visit(id);
    return resolved;
  }

  /**
   * Get engines that depend on a given engine
   *
   * @param {string} id - Engine ID
   * @returns {string[]} IDs of dependent engines
   */
  getDependents(id) {
    const dependents = [];
    for (const [engineId, deps] of this.#dependencyGraph) {
      if (deps.includes(id)) {
        dependents.push(engineId);
      }
    }
    return dependents;
  }

  /**
   * Get registry statistics
   *
   * @returns {Object}
   */
  getStats() {
    const byStatus = {};
    for (const engine of this.#engines.values()) {
      byStatus[engine.status] = (byStatus[engine.status] || 0) + 1;
    }

    const byDomain = {};
    for (const [domain, ids] of this.#byDomain) {
      byDomain[domain] = ids.size;
    }

    return {
      totalEngines: this.#engines.size,
      domains: this.#byDomain.size,
      capabilities: this.#byCapability.size,
      byStatus,
      byDomain,
    };
  }

  /**
   * Clear all registered engines
   */
  clear() {
    this.#engines.clear();
    this.#byDomain.clear();
    this.#byCapability.clear();
    this.#dependencyGraph.clear();
  }

  /**
   * Export registry as JSON (for persistence/debugging)
   *
   * @returns {Object}
   */
  toJSON() {
    const engines = [];
    for (const engine of this.#engines.values()) {
      engines.push(engine.getDefinition());
    }
    return {
      engines,
      stats: this.getStats(),
    };
  }
}

/**
 * Global engine registry instance
 *
 * Use for application-wide engine registration.
 */
export const globalEngineRegistry = new EngineRegistry();

export default EngineRegistry;
