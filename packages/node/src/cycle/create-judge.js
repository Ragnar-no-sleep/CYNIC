/**
 * Judge Factory — creates domain-specific Judge classes from config
 *
 * Template code (~60% of each Judge) lives here ONCE.
 * Domain logic (~40%) lives in config objects.
 *
 * Usage:
 *   const { Class, getInstance, resetInstance } = createJudge(cosmosJudgeConfig);
 *
 * "Le chien juge tout, mais une seule fois" — one factory, N domains
 *
 * @module @cynic/node/cycle/create-judge
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, createLogger, globalEventBus } from '@cynic/core';

/**
 * Create a Judge class from a domain config.
 *
 * @param {Object} config - Domain-specific configuration
 * @param {string} config.name - Judge name (e.g. 'CosmosJudge')
 * @param {string} config.cell - Matrix cell (e.g. 'C7.2')
 * @param {string} config.dimension - Domain name (e.g. 'COSMOS')
 * @param {string} config.eventPrefix - Event name prefix (e.g. 'cosmos')
 * @param {Object} config.judgmentTypes - Enum of judgment types
 * @param {Object} config.verdictLevels - Threshold map { HOWL: 80, WAG: 50, GROWL: 38.2 }
 * @param {number} [config.maxHistory=89] - Max history size (Fibonacci)
 * @param {Function} config.score - (type, data, context) → scores object
 * @param {Function} [config.aggregate] - (scores) → number [default: geometric mean]
 * @param {Function} [config.getVerdict] - (score) → verdict string [default: use verdictLevels]
 * @param {Function} [config.enrichResult] - (result, type, data, scores) → void [optional]
 * @param {Function} [config.healthCheck] - (stats) → health object [optional]
 * @param {string[]} [config.extraStatFields=[]] - Additional stat counter fields
 * @param {Object} [config.prototype] - Extra methods to add to the class prototype
 * @returns {{ Class, getInstance, resetInstance }}
 */
export function createJudge(config) {
  const log = createLogger(config.name);
  const maxHistory = config.maxHistory || 89;

  // Default aggregate: geometric mean
  const aggregate = config.aggregate || function defaultAggregate(scores) {
    const values = Object.values(scores);
    if (values.length === 0) return 50;
    const product = values.reduce((p, v) => p * Math.max(0.01, v), 1);
    return Math.pow(product, 1 / values.length);
  };

  // Default verdict from threshold map
  const getVerdict = config.getVerdict || function defaultGetVerdict(score) {
    const levels = config.verdictLevels;
    if (score >= levels.HOWL) return 'HOWL';
    if (score >= levels.WAG) return 'WAG';
    if (score >= levels.GROWL) return 'GROWL';
    return 'BARK';
  };

  class DomainJudge extends EventEmitter {
    constructor(options = {}) {
      super();

      this._history = [];
      this._maxHistory = maxHistory;

      this._stats = {
        totalJudgments: 0,
        byType: {},
        verdicts: { HOWL: 0, WAG: 0, GROWL: 0, BARK: 0 },
        avgScore: 0,
        lastJudgment: null,
      };

      for (const type of Object.values(config.judgmentTypes)) {
        this._stats.byType[type] = 0;
      }

      for (const field of (config.extraStatFields || [])) {
        this._stats[field] = 0;
      }

      if (config.init) config.init(this, options);
    }

    /**
     * Judge a subject.
     *
     * @param {Object} subject - What to judge
     * @param {string} [subject.type] - Judgment type from config.judgmentTypes
     * @param {Object} [subject.data] - Domain data (or subject itself)
     * @param {Object} [context] - Additional context
     * @returns {Object} Judgment result
     */
    judge(subject, context = {}) {
      const firstType = Object.values(config.judgmentTypes)[0];
      const type = subject.type || firstType;
      const data = subject.data || subject;

      const scores = config.score(type, data, context);
      const rawScore = aggregate(scores);
      const score = Math.round(rawScore * 10) / 10;
      const confidence = Math.min(PHI_INV, score / 100);
      const verdict = getVerdict(score);

      const result = {
        type,
        score,
        confidence,
        verdict,
        scores,
        cell: config.cell,
        dimension: config.dimension,
        analysis: 'JUDGE',
        timestamp: Date.now(),
      };

      // Optional enrichment (add extra fields)
      if (config.enrichResult) config.enrichResult(result, type, data, scores);

      // Update stats
      this._stats.totalJudgments++;
      this._stats.byType[type] = (this._stats.byType[type] || 0) + 1;
      this._stats.verdicts[verdict] = (this._stats.verdicts[verdict] || 0) + 1;
      const n = this._stats.totalJudgments;
      this._stats.avgScore = ((n - 1) * this._stats.avgScore + score) / n;
      this._stats.lastJudgment = Date.now();

      // History
      this._history.push(result);
      while (this._history.length > this._maxHistory) this._history.shift();

      // Emit locally
      this.emit('judgment', result);

      // Publish to global bus
      if (typeof globalEventBus.publish === 'function') {
        globalEventBus.publish(`${config.eventPrefix}:judgment`, {
          type,
          judgment: result,
        }, { source: config.name });
      } else {
        globalEventBus.emit(`${config.eventPrefix}:judgment`, { type, judgment: result });
      }

      log.debug(`${config.name} judgment`, { type, score, verdict });

      return result;
    }

    getStats() { return { ...this._stats }; }

    getHistory(limit = 21) {
      return this._history.slice(-limit);
    }

    getHealth() {
      if (config.healthCheck) return config.healthCheck(this._stats);

      const total = this._stats.totalJudgments;
      const barkRate = total > 0 ? this._stats.verdicts.BARK / total : 0;

      return {
        status: barkRate < PHI_INV_2 ? 'healthy' : 'concern',
        score: Math.min(PHI_INV, this._stats.avgScore / 100),
        totalJudgments: total,
        barkRate,
        avgScore: this._stats.avgScore,
      };
    }

    clear() {
      this._history = [];
      this._stats.totalJudgments = 0;
      this._stats.avgScore = 0;
      this._stats.lastJudgment = null;
      for (const k of Object.keys(this._stats.byType)) this._stats.byType[k] = 0;
      for (const k of Object.keys(this._stats.verdicts)) this._stats.verdicts[k] = 0;
    }
  }

  // Attach extra prototype methods from config
  if (config.prototype) {
    for (const [name, fn] of Object.entries(config.prototype)) {
      DomainJudge.prototype[name] = fn;
    }
  }

  // Singleton management
  let _instance = null;

  function getInstance(options = {}) {
    if (!_instance) _instance = new DomainJudge(options);
    return _instance;
  }

  function resetInstance() {
    if (_instance) _instance.removeAllListeners();
    _instance = null;
  }

  return {
    Class: DomainJudge,
    getInstance,
    resetInstance,
  };
}
