/**
 * Learner Factory — creates domain-specific Learner classes from config
 *
 * Template code (~50% of each Learner) lives here ONCE.
 * Domain logic (~50%) lives in config objects.
 *
 * Usage:
 *   const { Class, getInstance, resetInstance } = createLearner(cosmosLearnerConfig);
 *
 * "Le chien apprend une seule fois pour tous" — one factory, N domains
 *
 * @module @cynic/node/cycle/create-learner
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, createLogger, globalEventBus } from '@cynic/core';

/**
 * Create a Learner class from a domain config.
 *
 * @param {Object} config - Domain-specific configuration
 * @param {string} config.name - Learner name (e.g. 'CosmosLearner')
 * @param {string} config.cell - Matrix cell (e.g. 'C7.5')
 * @param {string} config.dimension - Domain name (e.g. 'COSMOS')
 * @param {string} config.eventPrefix - Event name prefix (e.g. 'cosmos')
 * @param {Object} config.categories - Enum of learning categories
 * @param {Function} config.initModels - () → initial models object
 * @param {Function} config.learn - (category, data, models, histories) → void
 * @param {Object} [config.predictions] - Map of name → function(models, stats) to add to prototype
 * @param {Function} [config.healthCheck] - (stats, models) → health object
 * @param {number} [config.minObservations=5] - Min data before predictions
 * @param {number} [config.learningRate=PHI_INV_2] - Learning rate (default 38.2%)
 * @param {number} [config.maxHistory=500] - Max history per category
 * @param {string[]} [config.extraStatFields=[]] - Additional stat fields
 * @returns {{ Class, getInstance, resetInstance }}
 */
export function createLearner(config) {
  const log = createLogger(config.name);
  const minObservations = config.minObservations ?? 5;
  const learningRate = config.learningRate ?? PHI_INV_2;
  const maxHistory = config.maxHistory || 500;
  const categoryValues = Object.values(config.categories);

  class DomainLearner extends EventEmitter {
    constructor(options = {}) {
      super();

      // Per-category rolling histories
      this._histories = {};
      for (const cat of categoryValues) {
        this._histories[cat] = [];
      }

      this._maxHistory = maxHistory;
      this._models = config.initModels();

      this._stats = {
        totalOutcomes: 0,
        byCategory: {},
        predictionsAttempted: 0,
        predictionsCorrect: 0,
        lastLearning: null,
      };

      for (const cat of categoryValues) {
        this._stats.byCategory[cat] = 0;
      }

      for (const field of (config.extraStatFields || [])) {
        this._stats[field] = 0;
      }

      if (config.init) config.init(this, options);
    }

    /**
     * Record an outcome to learn from.
     *
     * @param {Object} outcome - Learning data
     * @param {string} outcome.category - Category from config.categories
     * @param {Object} outcome.data - Category-specific data
     * @returns {Object} Learning result
     */
    recordOutcome(outcome) {
      const category = outcome.category || categoryValues[0];
      const data = outcome.data || outcome;

      // Delegate to domain learning logic
      config.learn(category, data, this._models, this._histories, {
        learningRate,
        maxHistory: this._maxHistory,
        minObservations,
      });

      // Trim history
      if (this._histories[category] && this._histories[category].length > this._maxHistory) {
        this._histories[category] = this._histories[category].slice(-this._maxHistory);
      }

      // Update stats
      this._stats.totalOutcomes++;
      this._stats.byCategory[category] = (this._stats.byCategory[category] || 0) + 1;
      this._stats.lastLearning = Date.now();

      const result = {
        category,
        modelsUpdated: true,
        totalSamples: this._getTotalSamples(),
        cell: config.cell,
        dimension: config.dimension,
        analysis: 'LEARN',
        timestamp: Date.now(),
      };

      this.emit('learned', result);

      return result;
    }

    /**
     * Record whether a prediction was correct.
     */
    recordPredictionOutcome(wasCorrect) {
      this._stats.predictionsAttempted++;
      if (wasCorrect) this._stats.predictionsCorrect++;
    }

    _getTotalSamples() {
      let total = 0;
      for (const cat of categoryValues) {
        total += (this._histories[cat]?.length || 0);
      }
      return total;
    }

    getStats() {
      return { ...this._stats, models: { ...this._models } };
    }

    getHistory(category, limit = 21) {
      if (category && this._histories[category]) {
        return this._histories[category].slice(-limit);
      }
      // Return all histories concatenated
      const all = [];
      for (const cat of categoryValues) {
        all.push(...(this._histories[cat] || []));
      }
      return all.slice(-limit);
    }

    getHealth() {
      if (config.healthCheck) return config.healthCheck(this._stats, this._models);

      const total = this._stats.totalOutcomes;
      const accuracy = this._stats.predictionsAttempted > 0
        ? this._stats.predictionsCorrect / this._stats.predictionsAttempted
        : 0;

      return {
        status: total >= minObservations ? 'learning' : 'warming_up',
        score: Math.min(PHI_INV, accuracy || 0.3),
        totalOutcomes: total,
        predictionAccuracy: accuracy,
      };
    }

    clear() {
      for (const cat of categoryValues) {
        this._histories[cat] = [];
      }
      this._models = config.initModels();
      this._stats.totalOutcomes = 0;
      this._stats.predictionsAttempted = 0;
      this._stats.predictionsCorrect = 0;
      this._stats.lastLearning = null;
      for (const k of Object.keys(this._stats.byCategory)) this._stats.byCategory[k] = 0;
    }
  }

  // Attach prediction methods from config
  if (config.predictions) {
    for (const [name, fn] of Object.entries(config.predictions)) {
      DomainLearner.prototype[name] = function (...args) {
        return fn(this._models, this._stats, ...args);
      };
    }
  }

  // Singleton management
  let _instance = null;

  function getInstance(options = {}) {
    if (!_instance) _instance = new DomainLearner(options);
    return _instance;
  }

  function resetInstance() {
    if (_instance) _instance.removeAllListeners();
    _instance = null;
  }

  return {
    Class: DomainLearner,
    getInstance,
    resetInstance,
  };
}
