/**
 * Error Perception - CYNIC's sense of tool failures
 *
 * "Le chien renifle les erreurs"
 *
 * This module analyzes tool errors from session state:
 * - Error rate (errors / total calls)
 * - Consecutive errors (circuit breaker trigger)
 * - Error patterns (same error repeating)
 * - Generates signals for psychology inference
 *
 * @module scripts/hooks/lib/error-perception
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// φ-DERIVED ERROR THRESHOLDS
// "Les erreurs suivent aussi les ratios dorés"
// ═══════════════════════════════════════════════════════════════════════════

const PHI_INV = 0.618033988749895;    // 61.8%
const PHI_INV_2 = 0.381966011250105;  // 38.2%
const PHI_INV_3 = 0.236067977499790;  // 23.6%

/**
 * Error thresholds derived from φ
 */
const ERROR_THRESHOLDS = Object.freeze({
  // Error rate thresholds
  LOW_ERROR_RATE: PHI_INV_3,           // 23.6% - acceptable noise
  MEDIUM_ERROR_RATE: PHI_INV_2,        // 38.2% - warning
  HIGH_ERROR_RATE: PHI_INV,            // 61.8% - critical

  // Consecutive errors
  CONSECUTIVE_WARNING: 3,              // Start warning
  CONSECUTIVE_CRITICAL: 5,             // Circuit breaker territory

  // Pattern detection
  REPEATED_ERROR_THRESHOLD: 3,         // Same error 3x = pattern
  ERROR_WINDOW_SIZE: 10,               // Analyze last 10 tool calls

  // Time-based (errors per minute)
  RAPID_ERRORS_PER_MIN: 3,             // More than 3 errors/min = frustration
});

/**
 * Error severity levels
 */
const ErrorSeverity = Object.freeze({
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

/**
 * Error pattern types
 */
const ErrorPattern = Object.freeze({
  NONE: 'none',
  SPORADIC: 'sporadic',           // Random errors
  CLUSTERED: 'clustered',         // Errors happening close together
  REPEATED: 'repeated',           // Same error type repeating
  ESCALATING: 'escalating',       // Errors increasing over time
});

// ═══════════════════════════════════════════════════════════════════════════
// ERROR PERCEPTION CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ErrorPerception - Analyzes tool errors for psychology inference
 */
class ErrorPerception {
  constructor() {
    this._sessionState = null;
  }

  /**
   * Set session state reference
   * @param {Object} sessionState - SessionStateManager instance
   */
  setSessionState(sessionState) {
    this._sessionState = sessionState;
  }

  /**
   * Get error rate from session
   * @returns {number} Error rate (0-1)
   */
  getErrorRate() {
    if (!this._sessionState?.isInitialized()) {
      return 0;
    }

    const stats = this._sessionState.getStats();
    const totalCalls = stats.toolCalls || 0;
    const errors = stats.errorsEncountered || 0;

    if (totalCalls === 0) return 0;
    return errors / totalCalls;
  }

  /**
   * Get consecutive error count
   * @returns {number}
   */
  getConsecutiveErrors() {
    if (!this._sessionState?.isInitialized()) {
      return 0;
    }
    return this._sessionState.getConsecutiveErrors();
  }

  /**
   * Get recent errors
   * @param {number} [limit] - Max errors to return
   * @returns {Object[]}
   */
  getRecentErrors(limit = 10) {
    if (!this._sessionState?.isInitialized()) {
      return [];
    }
    return this._sessionState.getRecentErrors(limit);
  }

  /**
   * Detect error patterns
   * @returns {string} ErrorPattern value
   */
  detectErrorPattern() {
    const errors = this.getRecentErrors(ERROR_THRESHOLDS.ERROR_WINDOW_SIZE);

    if (errors.length < 2) {
      return ErrorPattern.NONE;
    }

    // Check for repeated errors (same error type)
    const errorTypes = errors.map(e => e.errorType);
    const typeCounts = {};
    for (const type of errorTypes) {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(typeCounts));
    if (maxCount >= ERROR_THRESHOLDS.REPEATED_ERROR_THRESHOLD) {
      return ErrorPattern.REPEATED;
    }

    // Check for clustered errors (errors close in time)
    if (errors.length >= 3) {
      const timestamps = errors.map(e => e.timestamp).sort((a, b) => a - b);
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // If average interval < 30 seconds, errors are clustered
      if (avgInterval < 30000) {
        return ErrorPattern.CLUSTERED;
      }
    }

    // Check for escalating errors (more errors in second half of session)
    if (!this._sessionState?.isInitialized()) {
      return ErrorPattern.SPORADIC;
    }

    const toolHistory = this._sessionState.getToolHistory(20);
    if (toolHistory.length >= 10) {
      const midpoint = Math.floor(toolHistory.length / 2);
      const firstHalfErrors = toolHistory.slice(0, midpoint).filter(t => t.isError).length;
      const secondHalfErrors = toolHistory.slice(midpoint).filter(t => t.isError).length;

      if (secondHalfErrors > firstHalfErrors * 1.5) {
        return ErrorPattern.ESCALATING;
      }
    }

    return ErrorPattern.SPORADIC;
  }

  /**
   * Classify error severity
   * @returns {string} ErrorSeverity value
   */
  classifyErrorSeverity() {
    const errorRate = this.getErrorRate();
    const consecutive = this.getConsecutiveErrors();

    // Consecutive errors take priority
    if (consecutive >= ERROR_THRESHOLDS.CONSECUTIVE_CRITICAL) {
      return ErrorSeverity.CRITICAL;
    }

    if (consecutive >= ERROR_THRESHOLDS.CONSECUTIVE_WARNING) {
      return ErrorSeverity.HIGH;
    }

    // Then check error rate
    if (errorRate >= ERROR_THRESHOLDS.HIGH_ERROR_RATE) {
      return ErrorSeverity.HIGH;
    }

    if (errorRate >= ERROR_THRESHOLDS.MEDIUM_ERROR_RATE) {
      return ErrorSeverity.MEDIUM;
    }

    if (errorRate >= ERROR_THRESHOLDS.LOW_ERROR_RATE) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.NONE;
  }

  /**
   * Get errors per minute (recent activity)
   * @returns {number}
   */
  getErrorsPerMinute() {
    const errors = this.getRecentErrors(10);
    if (errors.length < 2) return 0;

    const timestamps = errors.map(e => e.timestamp).sort((a, b) => a - b);
    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];

    if (timeSpan === 0) return 0;

    // Errors per minute
    return (errors.length / timeSpan) * 60000;
  }

  /**
   * Get most common error type
   * @returns {string|null}
   */
  getMostCommonError() {
    const errors = this.getRecentErrors(10);
    if (errors.length === 0) return null;

    const typeCounts = {};
    for (const error of errors) {
      const type = error.errorType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    let maxType = null;
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    }

    return maxType;
  }

  /**
   * Generate signals for psychology inference
   * @returns {Object} Error signals
   */
  generateSignals() {
    const errorRate = this.getErrorRate();
    const consecutive = this.getConsecutiveErrors();
    const pattern = this.detectErrorPattern();
    const severity = this.classifyErrorSeverity();
    const errorsPerMin = this.getErrorsPerMinute();

    const signals = {
      // Primary signals
      highErrorRate: false,
      consecutiveErrors: false,
      repeatedError: false,
      escalatingErrors: false,

      // Confidence values
      frustrationFromErrors: 0,
      stuckConfidence: 0,

      // Raw values for context
      errorRate,
      consecutiveCount: consecutive,
      pattern,
      severity,
      errorsPerMinute: errorsPerMin,
    };

    // High error rate signal
    if (errorRate >= ERROR_THRESHOLDS.MEDIUM_ERROR_RATE) {
      signals.highErrorRate = true;
      signals.frustrationFromErrors = Math.min(errorRate, PHI_INV);
    }

    // Consecutive errors signal
    if (consecutive >= ERROR_THRESHOLDS.CONSECUTIVE_WARNING) {
      signals.consecutiveErrors = true;
      signals.stuckConfidence = Math.min(consecutive / 10, PHI_INV);
    }

    // Pattern-based signals
    if (pattern === ErrorPattern.REPEATED) {
      signals.repeatedError = true;
      signals.stuckConfidence = Math.max(signals.stuckConfidence, PHI_INV_2);
    }

    if (pattern === ErrorPattern.ESCALATING) {
      signals.escalatingErrors = true;
      signals.frustrationFromErrors = Math.max(signals.frustrationFromErrors, PHI_INV_2);
    }

    // Rapid errors = frustration
    if (errorsPerMin >= ERROR_THRESHOLDS.RAPID_ERRORS_PER_MIN) {
      signals.frustrationFromErrors = Math.min(
        signals.frustrationFromErrors + PHI_INV_3,
        PHI_INV
      );
    }

    return signals;
  }

  /**
   * Get full error perception state
   * @returns {Object}
   */
  getErrorState() {
    const stats = this._sessionState?.getStats() || {};

    return {
      // Raw counts
      totalCalls: stats.toolCalls || 0,
      totalErrors: stats.errorsEncountered || 0,
      consecutiveErrors: this.getConsecutiveErrors(),

      // Derived values
      errorRate: this.getErrorRate(),
      errorsPerMinute: this.getErrorsPerMinute(),
      mostCommonError: this.getMostCommonError(),

      // Classifications
      pattern: this.detectErrorPattern(),
      severity: this.classifyErrorSeverity(),

      // Signals
      signals: this.generateSignals(),

      // Human readable
      humanReadable: {
        errorRate: `${Math.round(this.getErrorRate() * 100)}%`,
        severity: this.classifyErrorSeverity(),
      },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

/**
 * Get singleton ErrorPerception instance
 * @returns {ErrorPerception}
 */
function getErrorPerception() {
  if (!_instance) {
    _instance = new ErrorPerception();
  }
  return _instance;
}

/**
 * Reset singleton (for testing)
 */
function resetErrorPerception() {
  _instance = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  ErrorPerception,
  getErrorPerception,
  resetErrorPerception,
  ERROR_THRESHOLDS,
  ErrorSeverity,
  ErrorPattern,
};

export default ErrorPerception;
