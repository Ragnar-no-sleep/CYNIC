/**
 * Engine Base Class
 *
 * Abstract base for all CYNIC engines (philosophical, analytical, etc.)
 * Each engine is a domain expert that can evaluate inputs and provide insights.
 *
 * "Each dog has its specialty" - κυνικός
 *
 * @module @cynic/core/engines/engine
 */

'use strict';

import { PHI_INV } from '../axioms/constants.js';

/**
 * Engine domains - philosophical and analytical categories
 */
export const EngineDomain = {
  // Philosophy
  LOGIC: 'logic',
  EPISTEMOLOGY: 'epistemology',
  METAPHYSICS: 'metaphysics',
  ETHICS: 'ethics',
  AESTHETICS: 'aesthetics',
  MIND: 'mind',
  LANGUAGE: 'language',
  SCIENCE: 'science',

  // Eastern & Regional
  EASTERN: 'eastern',
  AFRICAN: 'african',
  ISLAMIC: 'islamic',
  LATIN_AMERICAN: 'latin-american',

  // Applied
  LAW: 'law',
  ECONOMICS: 'economics',
  POLITICS: 'politics',
  SOCIAL: 'social',

  // Analytical
  MATHEMATICS: 'mathematics',
  PHYSICS: 'physics',
  GAME_THEORY: 'game-theory',
  DECISION: 'decision',

  // Meta
  INTEGRATION: 'integration',
  SYNTHESIS: 'synthesis',
};

/**
 * Engine status
 */
export const EngineStatus = {
  IDLE: 'idle',
  EVALUATING: 'evaluating',
  ERROR: 'error',
  DISABLED: 'disabled',
};

/**
 * Abstract Engine base class
 *
 * All engines should extend this class and implement the evaluate() method.
 *
 * @abstract
 */
export class Engine {
  /**
   * @param {Object} definition - Engine configuration
   * @param {string} definition.id - Unique identifier
   * @param {string} definition.domain - Primary domain
   * @param {string[]} definition.capabilities - What this engine can do
   * @param {string} [definition.name] - Human-readable name
   * @param {string[]} [definition.subdomains] - Additional domains
   * @param {string[]} [definition.dependencies] - Other engines it needs
   * @param {string} [definition.description] - Engine description
   * @param {string} [definition.tradition] - Philosophical tradition
   */
  constructor(definition) {
    if (new.target === Engine) {
      throw new Error('Engine is abstract and cannot be instantiated directly');
    }

    // Required fields
    if (!definition.id) throw new Error('Engine requires id');
    if (!definition.domain) throw new Error('Engine requires domain');
    if (!definition.capabilities || definition.capabilities.length === 0) {
      throw new Error('Engine requires capabilities');
    }

    this.id = definition.id;
    this.name = definition.name || definition.id;
    this.domain = definition.domain;
    this.subdomains = definition.subdomains || [];
    this.capabilities = definition.capabilities;
    this.dependencies = definition.dependencies || [];
    this.description = definition.description || '';
    this.tradition = definition.tradition || null;

    this.status = EngineStatus.IDLE;
    this.lastEvaluation = null;
    this.evaluationCount = 0;
    this.totalConfidence = 0;
  }

  /**
   * Evaluate an input and produce an insight
   *
   * @abstract
   * @param {*} input - The input to evaluate
   * @param {Object} [context] - Additional context
   * @returns {Promise<Object>} The engine's insight
   */
  async evaluate(input, context = {}) {
    throw new Error('evaluate() must be implemented by subclass');
  }

  /**
   * Check if this engine can handle a given capability
   *
   * @param {string} capability - Capability to check
   * @returns {boolean}
   */
  hasCapability(capability) {
    return this.capabilities.includes(capability);
  }

  /**
   * Check if this engine belongs to a domain
   *
   * @param {string} domain - Domain to check
   * @returns {boolean}
   */
  inDomain(domain) {
    return this.domain === domain || this.subdomains.includes(domain);
  }

  /**
   * Create an insight object with standard structure
   *
   * @protected
   * @param {string} insight - The insight text
   * @param {number} confidence - Confidence (0-1, capped at PHI_INV)
   * @param {string[]} [reasoning] - Reasoning chain
   * @param {Object} [metadata] - Additional data
   * @returns {Object} Insight object
   */
  createInsight(insight, confidence, reasoning = [], metadata = {}) {
    // Cap confidence at PHI_INV (61.8%)
    const cappedConfidence = Math.min(confidence, PHI_INV);

    const result = {
      engineId: this.id,
      domain: this.domain,
      perspective: this.tradition || this.name,
      insight,
      confidence: cappedConfidence,
      reasoning,
      metadata: {
        ...metadata,
        evaluatedAt: Date.now(),
        tradition: this.tradition,
      },
    };

    // Update stats
    this.lastEvaluation = result;
    this.evaluationCount++;
    this.totalConfidence += cappedConfidence;

    return result;
  }

  /**
   * Get engine statistics
   *
   * @returns {Object}
   */
  getStats() {
    return {
      id: this.id,
      domain: this.domain,
      status: this.status,
      evaluationCount: this.evaluationCount,
      averageConfidence: this.evaluationCount > 0
        ? this.totalConfidence / this.evaluationCount
        : 0,
      lastEvaluation: this.lastEvaluation?.metadata?.evaluatedAt || null,
    };
  }

  /**
   * Get engine metadata for registration
   *
   * @returns {Object}
   */
  getDefinition() {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      subdomains: this.subdomains,
      capabilities: this.capabilities,
      dependencies: this.dependencies,
      description: this.description,
      tradition: this.tradition,
    };
  }

  /**
   * Reset engine state
   */
  reset() {
    this.status = EngineStatus.IDLE;
    this.lastEvaluation = null;
    this.evaluationCount = 0;
    this.totalConfidence = 0;
  }
}

/**
 * Create an engine from a simple evaluator function
 *
 * For engines that don't need a full class, just a function.
 *
 * @param {Object} config - Engine configuration
 * @param {string} config.id - Unique identifier
 * @param {string} config.domain - Primary domain
 * @param {string[]} config.capabilities - What this engine can do
 * @param {Function} config.evaluator - Async function (input, context) => result
 * @returns {Engine} A functional engine instance
 *
 * @example
 * const stoicEngine = createFunctionalEngine({
 *   id: 'stoic-engine',
 *   domain: 'ethics',
 *   capabilities: ['virtue-ethics'],
 *   evaluator: async (input) => ({
 *     insight: 'Focus on what you can control',
 *     confidence: 0.6,
 *   })
 * });
 */
export function createFunctionalEngine(config) {
  const { evaluator, ...definition } = config;

  if (typeof evaluator !== 'function') {
    throw new Error('createFunctionalEngine requires evaluator function');
  }

  // Create a concrete subclass dynamically
  const engine = Object.create(Engine.prototype);

  // Initialize with definition
  engine.id = definition.id;
  engine.name = definition.name || definition.id;
  engine.domain = definition.domain;
  engine.subdomains = definition.subdomains || [];
  engine.capabilities = definition.capabilities;
  engine.dependencies = definition.dependencies || [];
  engine.description = definition.description || '';
  engine.tradition = definition.tradition || null;
  engine.status = EngineStatus.IDLE;
  engine.lastEvaluation = null;
  engine.evaluationCount = 0;
  engine.totalConfidence = 0;

  // Override evaluate
  engine.evaluate = async function(input, context = {}) {
    this.status = EngineStatus.EVALUATING;
    try {
      const result = await evaluator(input, context);
      this.status = EngineStatus.IDLE;

      return this.createInsight(
        result.insight,
        result.confidence,
        result.reasoning || [],
        result.metadata || {}
      );
    } catch (error) {
      this.status = EngineStatus.ERROR;
      throw error;
    }
  };

  return engine;
}

export default Engine;
