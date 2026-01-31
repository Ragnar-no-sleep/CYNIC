/**
 * Strategy Manager - Automatic Strategy Switching When Stuck
 *
 * Detects when a dog is stuck (repeated failures, error loops) and
 * automatically switches to alternative strategies.
 *
 * "Quand le chemin est bloqué, le chien trouve un autre" - κυνικός
 *
 * @module @cynic/node/routing/strategy-manager
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';
import { DogId, DOG_CAPABILITIES } from './dog-capabilities.js';
import { TaskType } from './task-descriptor.js';

/**
 * Stuck detection thresholds
 */
export const STUCK_THRESHOLDS = Object.freeze({
  // Consecutive failures before considering stuck
  CONSECUTIVE_FAILURES: 3,

  // Same error type threshold
  SAME_ERROR_THRESHOLD: 2,

  // Time window for error clustering (ms)
  ERROR_WINDOW_MS: 5 * 60 * 1000, // 5 minutes

  // Minimum confidence to try alternative
  MIN_ALTERNATIVE_CONFIDENCE: PHI_INV_3,

  // Maximum strategy switches per session
  MAX_SWITCHES_PER_SESSION: 10,

  // Cooldown between switches (ms)
  SWITCH_COOLDOWN_MS: 30 * 1000, // 30 seconds
});

/**
 * Stuck indicators
 */
export const StuckIndicator = Object.freeze({
  CONSECUTIVE_FAILURES: 'consecutive_failures',
  SAME_ERROR_LOOP: 'same_error_loop',
  FILE_HOTSPOT: 'file_hotspot',
  TIMEOUT_PATTERN: 'timeout_pattern',
  ESCALATION_LOOP: 'escalation_loop',
  LOW_PROGRESS: 'low_progress',
});

/**
 * Strategy types
 */
export const StrategyType = Object.freeze({
  SWITCH_DOG: 'switch_dog',
  SIMPLIFY_TASK: 'simplify_task',
  ESCALATE: 'escalate',
  DECOMPOSE: 'decompose',
  RETRY_WITH_CONTEXT: 'retry_with_context',
  HUMAN_INTERVENTION: 'human_intervention',
});

/**
 * Alternative strategy suggestion
 */
export class StrategySuggestion {
  /**
   * @param {Object} options
   * @param {string} options.type - Strategy type
   * @param {string} [options.dogId] - Suggested dog for SWITCH_DOG
   * @param {number} options.confidence - Suggestion confidence (0-1)
   * @param {string} options.reason - Human-readable reason
   * @param {Object} [options.metadata] - Additional metadata
   */
  constructor(options) {
    this.type = options.type;
    this.dogId = options.dogId || null;
    this.confidence = Math.min(options.confidence, PHI_INV);
    this.reason = options.reason;
    this.metadata = options.metadata || {};
    this.createdAt = Date.now();
  }

  /**
   * Get dog info if this is a SWITCH_DOG suggestion
   * @returns {Object|null}
   */
  getDogInfo() {
    if (this.type !== StrategyType.SWITCH_DOG || !this.dogId) return null;
    return DOG_CAPABILITIES[this.dogId] || null;
  }

  /**
   * Serialize
   * @returns {Object}
   */
  toJSON() {
    const info = this.getDogInfo();
    return {
      type: this.type,
      dogId: this.dogId,
      dogName: info?.name,
      dogEmoji: info?.emoji,
      confidence: Math.round(this.confidence * 1000) / 1000,
      reason: this.reason,
      metadata: this.metadata,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Failure record for pattern detection
 */
class FailureRecord {
  constructor(options) {
    this.dogId = options.dogId;
    this.taskType = options.taskType;
    this.errorType = options.errorType || 'unknown';
    this.errorMessage = options.errorMessage || '';
    this.file = options.file || null;
    this.timestamp = Date.now();
    this.context = options.context || {};
  }
}

/**
 * Strategy Manager - Detects stuck states and suggests alternatives
 */
export class StrategyManager extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.thresholds] - Custom thresholds
   * @param {Function} [options.getDogAlternatives] - Custom alternative finder
   */
  constructor(options = {}) {
    super();

    this.thresholds = { ...STUCK_THRESHOLDS, ...options.thresholds };
    this.getDogAlternatives = options.getDogAlternatives || this._defaultGetAlternatives.bind(this);

    // Failure tracking
    this._failures = [];
    this._consecutiveFailures = new Map(); // dogId → count
    this._errorTypeCount = new Map(); // errorType → count

    // Switch tracking
    this._switches = [];
    this._lastSwitchTime = 0;
    this._switchCount = 0;

    // Successful strategies (for learning)
    this._successfulStrategies = new Map(); // context hash → strategy

    // Statistics
    this.stats = {
      stuckDetections: 0,
      strategySuggestions: 0,
      switchesApplied: 0,
      successfulSwitches: 0,
      byIndicator: {},
      byStrategy: {},
    };

    // Initialize indicator stats
    for (const indicator of Object.values(StuckIndicator)) {
      this.stats.byIndicator[indicator] = 0;
    }
    for (const strategy of Object.values(StrategyType)) {
      this.stats.byStrategy[strategy] = 0;
    }
  }

  /**
   * Record a failure outcome
   *
   * @param {Object} failure
   * @param {string} failure.dogId - Dog that failed
   * @param {string} failure.taskType - Task type
   * @param {string} [failure.errorType] - Error category
   * @param {string} [failure.errorMessage] - Error message
   * @param {string} [failure.file] - Related file
   * @param {Object} [failure.context] - Additional context
   * @returns {Object|null} Stuck detection result if stuck, null otherwise
   */
  recordFailure(failure) {
    const record = new FailureRecord(failure);
    this._failures.push(record);

    // Update consecutive failures
    const current = this._consecutiveFailures.get(failure.dogId) || 0;
    this._consecutiveFailures.set(failure.dogId, current + 1);

    // Update error type count
    if (failure.errorType) {
      const typeCount = this._errorTypeCount.get(failure.errorType) || 0;
      this._errorTypeCount.set(failure.errorType, typeCount + 1);
    }

    // Prune old failures
    this._pruneOldFailures();

    // Check if stuck
    const stuckResult = this._detectStuck(failure);

    if (stuckResult) {
      this.stats.stuckDetections++;
      this.stats.byIndicator[stuckResult.indicator]++;

      this.emit('stuck:detected', stuckResult);
    }

    return stuckResult;
  }

  /**
   * Record a success (resets consecutive failure count)
   *
   * @param {string} dogId
   * @param {Object} [context] - Success context
   */
  recordSuccess(dogId, context = {}) {
    this._consecutiveFailures.set(dogId, 0);

    // If this was after a switch, record it as successful
    if (this._switches.length > 0) {
      const lastSwitch = this._switches[this._switches.length - 1];
      if (lastSwitch.toDogId === dogId && !lastSwitch.successful) {
        lastSwitch.successful = true;
        this.stats.successfulSwitches++;

        // Learn from successful switch
        const contextHash = this._hashContext(context);
        this._successfulStrategies.set(contextHash, lastSwitch.strategy);

        this.emit('switch:successful', { switch: lastSwitch });
      }
    }
  }

  /**
   * Get strategy suggestions for current stuck state
   *
   * @param {Object} context
   * @param {string} context.dogId - Current dog
   * @param {string} context.taskType - Current task type
   * @param {Array} [context.triedDogs] - Already tried dogs
   * @param {Object} [context.metadata] - Additional context
   * @returns {Array<StrategySuggestion>}
   */
  getSuggestions(context) {
    const suggestions = [];
    const { dogId, taskType, triedDogs = [] } = context;

    // 1. Check for learned successful strategies
    const contextHash = this._hashContext(context);
    const learnedStrategy = this._successfulStrategies.get(contextHash);
    if (learnedStrategy) {
      suggestions.push(new StrategySuggestion({
        type: learnedStrategy.type,
        dogId: learnedStrategy.dogId,
        confidence: PHI_INV,
        reason: 'Previously successful strategy for similar context',
        metadata: { learned: true },
      }));
    }

    // 2. Find alternative dogs
    const alternatives = this.getDogAlternatives(taskType, [...triedDogs, dogId]);
    for (const alt of alternatives.slice(0, 3)) {
      suggestions.push(new StrategySuggestion({
        type: StrategyType.SWITCH_DOG,
        dogId: alt.dogId,
        confidence: alt.score,
        reason: `${DOG_CAPABILITIES[alt.dogId]?.name} has ${Math.round(alt.score * 100)}% affinity for ${taskType}`,
        metadata: { affinity: alt.score },
      }));
    }

    // 3. Escalation to CYNIC if not already
    if (dogId !== DogId.CYNIC && !triedDogs.includes(DogId.CYNIC)) {
      suggestions.push(new StrategySuggestion({
        type: StrategyType.ESCALATE,
        dogId: DogId.CYNIC,
        confidence: PHI_INV_2,
        reason: 'Escalate to CYNIC for synthesis and oversight',
      }));
    }

    // 4. Decompose complex tasks
    const failures = this._getRecentFailures(dogId);
    if (failures.length >= 3) {
      suggestions.push(new StrategySuggestion({
        type: StrategyType.DECOMPOSE,
        confidence: PHI_INV_3,
        reason: 'Break down task into smaller steps',
        metadata: { failureCount: failures.length },
      }));
    }

    // 5. Retry with additional context
    suggestions.push(new StrategySuggestion({
      type: StrategyType.RETRY_WITH_CONTEXT,
      dogId: dogId,
      confidence: PHI_INV_3 * 0.8,
      reason: 'Retry with enriched context from failures',
      metadata: { retryCount: failures.length },
    }));

    // 6. Human intervention (last resort)
    if (this._switchCount >= this.thresholds.MAX_SWITCHES_PER_SESSION * 0.7) {
      suggestions.push(new StrategySuggestion({
        type: StrategyType.HUMAN_INTERVENTION,
        confidence: PHI_INV_3 * 0.5,
        reason: 'Multiple strategies attempted, human guidance recommended',
        metadata: { switchCount: this._switchCount },
      }));
    }

    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    this.stats.strategySuggestions += suggestions.length;

    return suggestions;
  }

  /**
   * Apply a strategy switch
   *
   * @param {StrategySuggestion} suggestion
   * @param {Object} context - Original context
   * @returns {{applied: boolean, reason?: string}}
   */
  applySwitch(suggestion, context) {
    // Check cooldown
    const now = Date.now();
    if (now - this._lastSwitchTime < this.thresholds.SWITCH_COOLDOWN_MS) {
      return {
        applied: false,
        reason: 'Switch cooldown in effect',
        cooldownRemaining: this.thresholds.SWITCH_COOLDOWN_MS - (now - this._lastSwitchTime),
      };
    }

    // Check max switches
    if (this._switchCount >= this.thresholds.MAX_SWITCHES_PER_SESSION) {
      return {
        applied: false,
        reason: 'Maximum switches reached for session',
      };
    }

    // Record switch
    const switchRecord = {
      fromDogId: context.dogId,
      toDogId: suggestion.dogId,
      strategy: suggestion,
      context,
      timestamp: now,
      successful: false,
    };

    this._switches.push(switchRecord);
    this._lastSwitchTime = now;
    this._switchCount++;

    this.stats.switchesApplied++;
    this.stats.byStrategy[suggestion.type]++;

    this.emit('switch:applied', { switch: switchRecord, suggestion });

    return {
      applied: true,
      switch: switchRecord,
    };
  }

  /**
   * Check if currently in stuck state for a dog
   *
   * @param {string} dogId
   * @returns {boolean}
   */
  isStuck(dogId) {
    const consecutive = this._consecutiveFailures.get(dogId) || 0;
    return consecutive >= this.thresholds.CONSECUTIVE_FAILURES;
  }

  /**
   * Get stuck status summary
   *
   * @returns {Object}
   */
  getStuckStatus() {
    const stuckDogs = [];
    for (const [dogId, count] of this._consecutiveFailures) {
      if (count >= this.thresholds.CONSECUTIVE_FAILURES) {
        stuckDogs.push({
          dogId,
          dogName: DOG_CAPABILITIES[dogId]?.name,
          consecutiveFailures: count,
        });
      }
    }

    const topErrors = [...this._errorTypeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      stuckDogs,
      topErrors,
      recentFailures: this._failures.length,
      switchCount: this._switchCount,
      canSwitch: this._switchCount < this.thresholds.MAX_SWITCHES_PER_SESSION,
    };
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const switchSuccessRate = this.stats.switchesApplied > 0
      ? this.stats.successfulSwitches / this.stats.switchesApplied
      : 0;

    return {
      ...this.stats,
      switchSuccessRate: Math.round(switchSuccessRate * 1000) / 1000,
      totalFailures: this._failures.length,
      learnedStrategies: this._successfulStrategies.size,
    };
  }

  /**
   * Reset state (for new session)
   */
  reset() {
    this._failures = [];
    this._consecutiveFailures.clear();
    this._errorTypeCount.clear();
    this._switches = [];
    this._lastSwitchTime = 0;
    this._switchCount = 0;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      stuckDetections: 0,
      strategySuggestions: 0,
      switchesApplied: 0,
      successfulSwitches: 0,
      byIndicator: {},
      byStrategy: {},
    };
    for (const indicator of Object.values(StuckIndicator)) {
      this.stats.byIndicator[indicator] = 0;
    }
    for (const strategy of Object.values(StrategyType)) {
      this.stats.byStrategy[strategy] = 0;
    }
  }

  /**
   * Detect if stuck based on recent failure
   * @private
   */
  _detectStuck(failure) {
    const { dogId, taskType, errorType, file } = failure;

    // 1. Consecutive failures
    const consecutive = this._consecutiveFailures.get(dogId) || 0;
    if (consecutive >= this.thresholds.CONSECUTIVE_FAILURES) {
      return {
        indicator: StuckIndicator.CONSECUTIVE_FAILURES,
        dogId,
        count: consecutive,
        message: `${DOG_CAPABILITIES[dogId]?.name || dogId} has failed ${consecutive} times consecutively`,
      };
    }

    // 2. Same error loop
    if (errorType) {
      const errorCount = this._errorTypeCount.get(errorType) || 0;
      if (errorCount >= this.thresholds.SAME_ERROR_THRESHOLD) {
        return {
          indicator: StuckIndicator.SAME_ERROR_LOOP,
          errorType,
          count: errorCount,
          message: `Same error type "${errorType}" occurring ${errorCount} times`,
        };
      }
    }

    // 3. File hotspot
    if (file) {
      const fileFailures = this._failures.filter(f => f.file === file).length;
      if (fileFailures >= 3) {
        return {
          indicator: StuckIndicator.FILE_HOTSPOT,
          file,
          count: fileFailures,
          message: `File "${file}" causing repeated failures`,
        };
      }
    }

    // 4. Timeout pattern
    if (errorType === 'timeout') {
      const timeouts = this._failures.filter(f => f.errorType === 'timeout').length;
      if (timeouts >= 2) {
        return {
          indicator: StuckIndicator.TIMEOUT_PATTERN,
          count: timeouts,
          message: 'Multiple timeout errors detected',
        };
      }
    }

    // 5. Escalation loop (already escalated but still failing)
    if (dogId === DogId.CYNIC && consecutive >= 2) {
      return {
        indicator: StuckIndicator.ESCALATION_LOOP,
        count: consecutive,
        message: 'Even CYNIC is struggling with this task',
      };
    }

    return null;
  }

  /**
   * Get recent failures for a dog
   * @private
   */
  _getRecentFailures(dogId) {
    const cutoff = Date.now() - this.thresholds.ERROR_WINDOW_MS;
    return this._failures.filter(f => f.dogId === dogId && f.timestamp >= cutoff);
  }

  /**
   * Prune old failures
   * @private
   */
  _pruneOldFailures() {
    const cutoff = Date.now() - this.thresholds.ERROR_WINDOW_MS;
    this._failures = this._failures.filter(f => f.timestamp >= cutoff);
  }

  /**
   * Default alternative dog finder
   * @private
   */
  _defaultGetAlternatives(taskType, excludeDogs) {
    const alternatives = [];
    const excludeSet = new Set(excludeDogs);

    for (const [dogId, cap] of Object.entries(DOG_CAPABILITIES)) {
      if (excludeSet.has(dogId)) continue;

      const affinity = cap.taskAffinities?.[taskType] || 0;
      if (affinity > 0) {
        alternatives.push({
          dogId,
          score: affinity,
          name: cap.name,
        });
      }
    }

    return alternatives.sort((a, b) => b.score - a.score);
  }

  /**
   * Hash context for learning storage
   * @private
   */
  _hashContext(context) {
    const key = `${context.taskType || ''}_${context.errorType || ''}_${context.file || ''}`;
    return key.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Format stuck detection for display
   *
   * @param {Object} stuckResult
   * @returns {string}
   */
  static formatStuck(stuckResult) {
    const emoji = {
      [StuckIndicator.CONSECUTIVE_FAILURES]: '🔄',
      [StuckIndicator.SAME_ERROR_LOOP]: '🔁',
      [StuckIndicator.FILE_HOTSPOT]: '🔥',
      [StuckIndicator.TIMEOUT_PATTERN]: '⏰',
      [StuckIndicator.ESCALATION_LOOP]: '⚠️',
      [StuckIndicator.LOW_PROGRESS]: '🐢',
    };

    return `${emoji[stuckResult.indicator] || '❌'} STUCK: ${stuckResult.message}`;
  }

  /**
   * Format suggestion for display
   *
   * @param {StrategySuggestion} suggestion
   * @returns {string}
   */
  static formatSuggestion(suggestion) {
    const info = suggestion.getDogInfo();
    const confidence = Math.round(suggestion.confidence * 100);

    switch (suggestion.type) {
      case StrategyType.SWITCH_DOG:
        return `💡 Switch to ${info?.emoji || '🐕'} ${info?.name || suggestion.dogId} (${confidence}% confidence)`;
      case StrategyType.ESCALATE:
        return `⬆️ Escalate to CYNIC (${confidence}% confidence)`;
      case StrategyType.DECOMPOSE:
        return `🔨 Decompose task into smaller steps (${confidence}% confidence)`;
      case StrategyType.RETRY_WITH_CONTEXT:
        return `🔄 Retry with enriched context (${confidence}% confidence)`;
      case StrategyType.HUMAN_INTERVENTION:
        return `👤 Human guidance recommended (${confidence}% confidence)`;
      default:
        return `💡 ${suggestion.reason} (${confidence}% confidence)`;
    }
  }
}

/**
 * Create strategy manager
 * @param {Object} [options]
 * @returns {StrategyManager}
 */
export function createStrategyManager(options = {}) {
  return new StrategyManager(options);
}

// Singleton
let _instance = null;

/**
 * Get singleton manager
 * @returns {StrategyManager}
 */
export function getStrategyManager() {
  if (!_instance) {
    _instance = createStrategyManager();
  }
  return _instance;
}

export default StrategyManager;
