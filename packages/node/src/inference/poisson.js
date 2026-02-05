/**
 * Poisson Distribution for Rare Events
 *
 * "Les événements rares révèlent le système" - κυνικός
 *
 * P(k; λ) = (λ^k × e^(-λ)) / k!
 *
 * Uses Poisson distribution for:
 * - Rare event modeling (errors, anomalies, attacks)
 * - Queue arrival rates (messages, tasks)
 * - Anomaly detection (unexpected spikes)
 * - Rate estimation from observations
 *
 * φ-aligned: Confidence intervals bounded at 61.8%
 *
 * @module @cynic/node/inference/poisson
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * φ-aligned Poisson configuration
 */
export const POISSON_CONFIG = {
  // Rate bounds
  MIN_RATE: 0.001,             // Minimum λ to avoid numerical issues
  MAX_RATE: 1000,              // Maximum λ for practical computation

  // Anomaly detection thresholds (φ-aligned)
  ANOMALY_SIGMA: 3,            // Standard deviations for anomaly
  WARNING_SIGMA: 2,            // Standard deviations for warning
  PHI_SIGMA: 1 / PHI_INV,      // ≈ 1.618 - φ-aligned threshold

  // Confidence levels
  CONFIDENCE_95: 0.95,
  CONFIDENCE_PHI: PHI_INV,     // 61.8% confidence

  // Time windows (in seconds)
  WINDOW_MINUTE: 60,
  WINDOW_HOUR: 3600,
  WINDOW_DAY: 86400,

  // Maximum k for PMF computation
  MAX_K: 200,

  // Numerical stability
  EPSILON: 1e-15,
  LOG_EPSILON: -34.5,          // log(1e-15)
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE POISSON FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute factorial (with memoization)
 * @param {number} n - Non-negative integer
 * @returns {number} n!
 */
const factorialCache = [1, 1];
export function factorial(n) {
  if (n < 0) return NaN;
  if (n < factorialCache.length) return factorialCache[n];

  let result = factorialCache[factorialCache.length - 1];
  for (let i = factorialCache.length; i <= n; i++) {
    result *= i;
    factorialCache[i] = result;
  }
  return result;
}

/**
 * Compute log factorial (for numerical stability with large k)
 * Uses Stirling's approximation for large n
 *
 * @param {number} n - Non-negative integer
 * @returns {number} log(n!)
 */
const logFactorialCache = [0, 0];
export function logFactorial(n) {
  if (n < 0) return NaN;
  if (n < 2) return 0;
  if (n < logFactorialCache.length) return logFactorialCache[n];

  // Stirling's approximation for large n
  if (n > 100) {
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
  }

  // Compute and cache
  let result = logFactorialCache[logFactorialCache.length - 1] || 0;
  for (let i = logFactorialCache.length; i <= n; i++) {
    result += Math.log(i);
    logFactorialCache[i] = result;
  }
  return result;
}

/**
 * Poisson Probability Mass Function (PMF)
 * P(X = k) = (λ^k × e^(-λ)) / k!
 *
 * @param {number} k - Number of events (non-negative integer)
 * @param {number} lambda - Rate parameter (λ > 0)
 * @returns {number} Probability of exactly k events
 */
export function poissonPMF(k, lambda) {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda <= 0) return k === 0 ? 1 : 0;

  // Use log for numerical stability
  const logProb = k * Math.log(lambda) - lambda - logFactorial(k);

  if (logProb < POISSON_CONFIG.LOG_EPSILON) return 0;
  return Math.exp(logProb);
}

/**
 * Poisson Cumulative Distribution Function (CDF)
 * P(X ≤ k) = Σ(i=0 to k) P(X = i)
 *
 * @param {number} k - Number of events
 * @param {number} lambda - Rate parameter
 * @returns {number} Probability of at most k events
 */
export function poissonCDF(k, lambda) {
  if (k < 0) return 0;
  if (lambda <= 0) return 1;

  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) {
    sum += poissonPMF(i, lambda);
    if (sum >= 1 - POISSON_CONFIG.EPSILON) return 1;
  }
  return sum;
}

/**
 * Poisson Survival Function (1 - CDF)
 * P(X > k) = 1 - P(X ≤ k)
 *
 * @param {number} k - Number of events
 * @param {number} lambda - Rate parameter
 * @returns {number} Probability of more than k events
 */
export function poissonSurvival(k, lambda) {
  return 1 - poissonCDF(k, lambda);
}

/**
 * Poisson quantile function (inverse CDF)
 * Find k such that P(X ≤ k) ≥ p
 *
 * @param {number} p - Probability (0 to 1)
 * @param {number} lambda - Rate parameter
 * @returns {number} Quantile value
 */
export function poissonQuantile(p, lambda) {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  if (lambda <= 0) return 0;

  let k = 0;
  let cumulative = poissonPMF(0, lambda);

  while (cumulative < p && k < POISSON_CONFIG.MAX_K) {
    k++;
    cumulative += poissonPMF(k, lambda);
  }

  return k;
}

/**
 * Expected value (mean) of Poisson distribution
 * E[X] = λ
 *
 * @param {number} lambda - Rate parameter
 * @returns {number} Expected value
 */
export function poissonMean(lambda) {
  return Math.max(0, lambda);
}

/**
 * Variance of Poisson distribution
 * Var[X] = λ
 *
 * @param {number} lambda - Rate parameter
 * @returns {number} Variance
 */
export function poissonVariance(lambda) {
  return Math.max(0, lambda);
}

/**
 * Standard deviation of Poisson distribution
 * σ = √λ
 *
 * @param {number} lambda - Rate parameter
 * @returns {number} Standard deviation
 */
export function poissonStdDev(lambda) {
  return Math.sqrt(Math.max(0, lambda));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimate rate (λ) from observed events
 * MLE: λ̂ = Σ events / time
 *
 * @param {number} events - Total observed events
 * @param {number} time - Total observation time
 * @returns {number} Estimated rate
 */
export function estimateRate(events, time) {
  if (time <= 0) return 0;
  return Math.max(POISSON_CONFIG.MIN_RATE, events / time);
}

/**
 * Confidence interval for rate using exact method
 * Based on relationship between Poisson and Chi-squared
 *
 * @param {number} events - Observed events
 * @param {number} time - Observation time
 * @param {number} [confidence=0.95] - Confidence level
 * @returns {Object} {lower, upper, point}
 */
export function rateConfidenceInterval(events, time, confidence = POISSON_CONFIG.CONFIDENCE_95) {
  if (time <= 0) return { lower: 0, upper: 0, point: 0 };

  const alpha = 1 - confidence;
  const point = events / time;

  // Use normal approximation for large counts
  if (events >= 20) {
    const se = Math.sqrt(events) / time;
    const z = normalQuantile(1 - alpha / 2);
    return {
      lower: Math.max(0, point - z * se),
      upper: point + z * se,
      point,
    };
  }

  // Exact method using Poisson quantiles for small counts
  // Lower bound: λ such that P(X ≥ events) = α/2
  // Upper bound: λ such that P(X ≤ events) = α/2
  const lower = events === 0 ? 0 : findRateLowerBound(events, alpha / 2) / time;
  const upper = findRateUpperBound(events, alpha / 2) / time;

  return { lower, upper, point };
}

/**
 * Find lower bound rate using bisection
 * @private
 */
function findRateLowerBound(k, alpha) {
  if (k === 0) return 0;

  let low = 0;
  let high = k;

  // Find initial bracket
  while (poissonSurvival(k - 1, high) > alpha) {
    high *= 2;
  }

  // Bisection
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (poissonSurvival(k - 1, mid) > alpha) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Find upper bound rate using bisection
 * @private
 */
function findRateUpperBound(k, alpha) {
  let low = k;
  let high = k + 10;

  // Find initial bracket
  while (poissonCDF(k, high) > alpha) {
    high *= 2;
    if (high > 10000) break;
  }

  // Bisection
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (poissonCDF(k, mid) > alpha) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

/**
 * Normal distribution quantile (for CI approximation)
 * Using Abramowitz and Stegun approximation
 * @private
 */
function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.383577518672690e2,
    -3.066479806614716e1,
    2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838e0,
    -2.549732539343734e0,
    4.374664141464968e0,
    2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996e0,
    3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect if an event count is anomalous given expected rate
 *
 * @param {number} observed - Observed event count
 * @param {number} expected - Expected rate (λ)
 * @param {Object} [options={}]
 * @param {number} [options.sigma=3] - Sigma threshold for anomaly
 * @returns {Object} {isAnomaly, severity, pValue, zScore, direction}
 */
export function detectAnomaly(observed, expected, options = {}) {
  const sigma = options.sigma ?? POISSON_CONFIG.ANOMALY_SIGMA;

  if (expected <= 0) {
    return {
      isAnomaly: observed > 0,
      severity: observed > 0 ? 'high' : 'none',
      pValue: observed > 0 ? 0 : 1,
      zScore: observed > 0 ? Infinity : 0,
      direction: observed > 0 ? 'high' : 'normal',
    };
  }

  // Z-score using normal approximation
  const stdDev = Math.sqrt(expected);
  const zScore = (observed - expected) / stdDev;

  // P-value (two-tailed)
  let pValue;
  if (observed > expected) {
    pValue = 2 * poissonSurvival(observed - 1, expected);
  } else {
    pValue = 2 * poissonCDF(observed, expected);
  }
  pValue = Math.min(1, pValue);

  // Determine severity
  let severity;
  if (Math.abs(zScore) >= sigma) {
    severity = 'high';
  } else if (Math.abs(zScore) >= POISSON_CONFIG.WARNING_SIGMA) {
    severity = 'medium';
  } else if (Math.abs(zScore) >= POISSON_CONFIG.PHI_SIGMA) {
    severity = 'low';
  } else {
    severity = 'none';
  }

  // Direction
  let direction;
  if (zScore > POISSON_CONFIG.PHI_SIGMA) {
    direction = 'high';
  } else if (zScore < -POISSON_CONFIG.PHI_SIGMA) {
    direction = 'low';
  } else {
    direction = 'normal';
  }

  return {
    isAnomaly: severity !== 'none',
    severity,
    pValue,
    zScore,
    direction,
    // φ-bounded confidence
    confidence: Math.min(PHI_INV, 1 - pValue),
  };
}

/**
 * Compute anomaly score (0 to 1)
 * Higher = more anomalous
 *
 * @param {number} observed - Observed count
 * @param {number} expected - Expected rate
 * @returns {number} Anomaly score [0, 1]
 */
export function anomalyScore(observed, expected) {
  if (expected <= 0) return observed > 0 ? 1 : 0;

  // Use survival function for score
  const pValue = poissonSurvival(observed - 1, expected);

  // Convert to score (low p-value = high anomaly)
  const score = 1 - pValue;

  // φ-bound
  return Math.min(PHI_INV, score);
}

// ═══════════════════════════════════════════════════════════════════════════════
// POISSON PROCESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Poisson Process - models event arrivals over time
 */
export class PoissonProcess {
  /**
   * @param {number} rate - Events per unit time (λ)
   * @param {Object} [options={}]
   * @param {number} [options.windowSize=3600] - Time window in seconds
   * @param {number} [options.maxHistory=1000] - Max events to track
   */
  constructor(rate, options = {}) {
    this.rate = Math.max(POISSON_CONFIG.MIN_RATE, rate);
    this.windowSize = options.windowSize ?? POISSON_CONFIG.WINDOW_HOUR;
    this.maxHistory = options.maxHistory ?? 1000;

    this.events = [];        // Timestamps of events
    this.totalEvents = 0;    // Total events ever
    this.startTime = Date.now() / 1000;
  }

  /**
   * Record an event
   * @param {number} [timestamp] - Event timestamp (seconds), defaults to now
   */
  recordEvent(timestamp) {
    const ts = timestamp ?? Date.now() / 1000;
    this.events.push(ts);
    this.totalEvents++;

    // Prune old events
    this._pruneOldEvents();
  }

  /**
   * Record multiple events
   * @param {number} count - Number of events
   * @param {number} [timestamp] - Timestamp for all events
   */
  recordBatch(count, timestamp) {
    const ts = timestamp ?? Date.now() / 1000;
    for (let i = 0; i < count; i++) {
      this.events.push(ts);
    }
    this.totalEvents += count;
    this._pruneOldEvents();
  }

  /**
   * Get events in current window
   * @returns {number} Event count
   */
  getWindowCount() {
    const now = Date.now() / 1000;
    const windowStart = now - this.windowSize;
    return this.events.filter(t => t >= windowStart).length;
  }

  /**
   * Get current observed rate
   * @returns {number} Events per unit time
   */
  getObservedRate() {
    const elapsed = Math.max(1, Date.now() / 1000 - this.startTime);
    return this.totalEvents / elapsed;
  }

  /**
   * Get expected count for current window
   * @returns {number} Expected events
   */
  getExpectedCount() {
    return this.rate * this.windowSize;
  }

  /**
   * Check if current window is anomalous
   * @param {Object} [options={}]
   * @returns {Object} Anomaly detection result
   */
  checkAnomaly(options = {}) {
    const observed = this.getWindowCount();
    const expected = this.getExpectedCount();
    return detectAnomaly(observed, expected, options);
  }

  /**
   * Update rate estimate from observations
   * Uses exponential moving average
   *
   * @param {number} [alpha=0.1] - Smoothing factor
   */
  updateRate(alpha = 0.1) {
    const observed = this.getObservedRate();
    this.rate = this.rate * (1 - alpha) + observed * alpha;
    this.rate = Math.max(POISSON_CONFIG.MIN_RATE, this.rate);
  }

  /**
   * Probability of n events in next time period
   * @param {number} n - Number of events
   * @param {number} [duration] - Time duration (defaults to windowSize)
   * @returns {number} Probability
   */
  probabilityOf(n, duration) {
    const t = duration ?? this.windowSize;
    const lambda = this.rate * t;
    return poissonPMF(n, lambda);
  }

  /**
   * Expected time until next event
   * Exponential distribution with rate λ
   *
   * @returns {number} Expected seconds until next event
   */
  expectedWaitTime() {
    return 1 / this.rate;
  }

  /**
   * Simulate events for a duration
   * @param {number} duration - Time duration
   * @returns {number[]} Array of event timestamps (relative)
   */
  simulate(duration) {
    const events = [];
    let t = 0;

    while (t < duration) {
      // Inter-arrival time is exponentially distributed
      const waitTime = -Math.log(Math.random()) / this.rate;
      t += waitTime;
      if (t < duration) {
        events.push(t);
      }
    }

    return events;
  }

  /**
   * Get process statistics
   * @returns {Object}
   */
  getStats() {
    const windowCount = this.getWindowCount();
    const expected = this.getExpectedCount();
    const ci = rateConfidenceInterval(this.totalEvents, Date.now() / 1000 - this.startTime);

    return {
      rate: this.rate,
      observedRate: this.getObservedRate(),
      windowCount,
      expectedCount: expected,
      totalEvents: this.totalEvents,
      windowSize: this.windowSize,
      rateCI: ci,
      anomaly: this.checkAnomaly(),
    };
  }

  /**
   * Prune events outside the window
   * @private
   */
  _pruneOldEvents() {
    const now = Date.now() / 1000;
    const cutoff = now - this.windowSize * 2; // Keep 2x window for rate estimation

    this.events = this.events.filter(t => t >= cutoff);

    // Also limit total size
    if (this.events.length > this.maxHistory) {
      this.events = this.events.slice(-this.maxHistory);
    }
  }

  /**
   * Serialize to plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      rate: this.rate,
      windowSize: this.windowSize,
      totalEvents: this.totalEvents,
      startTime: this.startTime,
      recentEvents: this.events.slice(-100),
      stats: this.getStats(),
    };
  }

  /**
   * Create from serialized data
   * @param {Object} data
   * @returns {PoissonProcess}
   */
  static fromJSON(data) {
    const process = new PoissonProcess(data.rate, {
      windowSize: data.windowSize,
    });
    process.totalEvents = data.totalEvents;
    process.startTime = data.startTime;
    process.events = data.recentEvents || [];
    return process;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT RATE TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Track multiple event types with Poisson modeling
 */
export class EventRateTracker {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.defaultRate=1] - Default expected rate
   * @param {number} [options.windowSize=3600] - Default window size
   */
  constructor(options = {}) {
    this.defaultRate = options.defaultRate ?? 1;
    this.windowSize = options.windowSize ?? POISSON_CONFIG.WINDOW_HOUR;
    this.processes = new Map(); // eventType -> PoissonProcess
  }

  /**
   * Record an event
   * @param {string} eventType - Type of event
   * @param {number} [count=1] - Number of events
   */
  record(eventType, count = 1) {
    if (!this.processes.has(eventType)) {
      this.processes.set(eventType, new PoissonProcess(this.defaultRate, {
        windowSize: this.windowSize,
      }));
    }

    const process = this.processes.get(eventType);
    if (count === 1) {
      process.recordEvent();
    } else {
      process.recordBatch(count);
    }
  }

  /**
   * Set expected rate for an event type
   * @param {string} eventType - Type of event
   * @param {number} rate - Expected rate
   */
  setRate(eventType, rate) {
    if (!this.processes.has(eventType)) {
      this.processes.set(eventType, new PoissonProcess(rate, {
        windowSize: this.windowSize,
      }));
    } else {
      this.processes.get(eventType).rate = rate;
    }
  }

  /**
   * Check for anomalies in all event types
   * @returns {Object[]} Array of anomalies
   */
  checkAllAnomalies() {
    const anomalies = [];

    for (const [eventType, process] of this.processes) {
      const result = process.checkAnomaly();
      if (result.isAnomaly) {
        anomalies.push({
          eventType,
          ...result,
          observed: process.getWindowCount(),
          expected: process.getExpectedCount(),
        });
      }
    }

    return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }

  /**
   * Get summary of all tracked events
   * @returns {Object}
   */
  getSummary() {
    const summary = {};

    for (const [eventType, process] of this.processes) {
      summary[eventType] = {
        rate: process.rate,
        windowCount: process.getWindowCount(),
        expected: process.getExpectedCount(),
        totalEvents: process.totalEvents,
        anomaly: process.checkAnomaly(),
      };
    }

    return summary;
  }

  /**
   * Get stats for a specific event type
   * @param {string} eventType - Type of event
   * @returns {Object|null}
   */
  getStats(eventType) {
    const process = this.processes.get(eventType);
    return process ? process.getStats() : null;
  }

  /**
   * Update all rates from observations
   * @param {number} [alpha=0.1] - Smoothing factor
   */
  updateAllRates(alpha = 0.1) {
    for (const process of this.processes.values()) {
      process.updateRate(alpha);
    }
  }

  /**
   * Get all tracked event types
   * @returns {string[]}
   */
  getEventTypes() {
    return Array.from(this.processes.keys());
  }

  /**
   * Serialize to plain object
   * @returns {Object}
   */
  toJSON() {
    const processes = {};
    for (const [type, process] of this.processes) {
      processes[type] = process.toJSON();
    }
    return {
      defaultRate: this.defaultRate,
      windowSize: this.windowSize,
      processes,
    };
  }

  /**
   * Create from serialized data
   * @param {Object} data
   * @returns {EventRateTracker}
   */
  static fromJSON(data) {
    const tracker = new EventRateTracker({
      defaultRate: data.defaultRate,
      windowSize: data.windowSize,
    });

    for (const [type, processData] of Object.entries(data.processes || {})) {
      tracker.processes.set(type, PoissonProcess.fromJSON(processData));
    }

    return tracker;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test goodness of fit for Poisson distribution
 * Using Chi-squared test
 *
 * @param {number[]} observed - Observed counts per bin
 * @param {number} lambda - Expected rate
 * @returns {Object} {chiSquared, pValue, isPoisson}
 */
export function poissonGoodnessOfFit(observed, lambda) {
  const n = observed.length;
  let chiSquared = 0;

  for (let k = 0; k < n; k++) {
    const expected = poissonPMF(k, lambda) * observed.reduce((a, b) => a + b, 0);
    if (expected > 0) {
      chiSquared += Math.pow(observed[k] - expected, 2) / expected;
    }
  }

  // Degrees of freedom = n - 1 - 1 (estimated lambda)
  const df = Math.max(1, n - 2);

  // Approximate p-value using chi-squared CDF
  // For simplicity, use a rough approximation
  const pValue = 1 - chiSquaredCDF(chiSquared, df);

  return {
    chiSquared,
    degreesOfFreedom: df,
    pValue,
    isPoisson: pValue > 0.05, // 5% significance level
  };
}

/**
 * Approximate chi-squared CDF
 * @private
 */
function chiSquaredCDF(x, df) {
  if (x <= 0) return 0;
  // Use normal approximation for large df
  if (df > 100) {
    const z = Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
    z /= Math.sqrt(2 / (9 * df));
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
  }

  // Gamma function based calculation for small df
  return gammainc(df / 2, x / 2);
}

/**
 * Error function approximation
 * @private
 */
function erf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Regularized incomplete gamma function
 * @private
 */
function gammainc(a, x) {
  if (x === 0) return 0;
  if (x < 0) return 0;

  // Series expansion for small x
  if (x < a + 1) {
    let sum = 1 / a;
    let term = 1 / a;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaln(a));
  }

  // Continued fraction for large x
  return 1 - gammainc_cf(a, x);
}

/**
 * Continued fraction for incomplete gamma
 * @private
 */
function gammainc_cf(a, x) {
  let f = 1e-30;
  let c = 1e-30;
  let d = 0;

  for (let n = 1; n < 100; n++) {
    const an = n % 2 === 1 ? (n + 1) / 2 : -((n / 2) - a);
    const bn = n % 2 === 1 ? x : 1;

    d = bn + an * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = bn + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;

    d = 1 / d;
    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1) < 1e-10) break;
  }

  return Math.exp(-x + a * Math.log(x) - gammaln(a)) * f;
}

/**
 * Log gamma function (Stirling approximation)
 * @private
 */
function gammaln(x) {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5,
  ];

  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);

  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y;
  }

  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Compute waiting time probability
 * P(T ≤ t) for exponential inter-arrival times
 *
 * @param {number} t - Time duration
 * @param {number} rate - Event rate (λ)
 * @returns {number} Probability
 */
export function waitingTimeCDF(t, rate) {
  if (t <= 0 || rate <= 0) return 0;
  return 1 - Math.exp(-rate * t);
}

/**
 * Compute time to see n events
 * Gamma distribution: E[T] = n/λ
 *
 * @param {number} n - Number of events
 * @param {number} rate - Event rate
 * @returns {Object} {expected, variance, stdDev}
 */
export function timeToNEvents(n, rate) {
  if (rate <= 0) return { expected: Infinity, variance: Infinity, stdDev: Infinity };

  return {
    expected: n / rate,
    variance: n / (rate * rate),
    stdDev: Math.sqrt(n) / rate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a Poisson process for tracking events
 * @param {number} rate - Expected rate
 * @param {Object} [options={}]
 * @returns {PoissonProcess}
 */
export function createPoissonProcess(rate, options = {}) {
  return new PoissonProcess(rate, options);
}

/**
 * Create an event rate tracker
 * @param {Object} [options={}]
 * @returns {EventRateTracker}
 */
export function createEventTracker(options = {}) {
  return new EventRateTracker(options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Core functions
  factorial,
  logFactorial,
  poissonPMF,
  poissonCDF,
  poissonSurvival,
  poissonQuantile,
  poissonMean,
  poissonVariance,
  poissonStdDev,

  // Rate estimation
  estimateRate,
  rateConfidenceInterval,

  // Anomaly detection
  detectAnomaly,
  anomalyScore,

  // Process classes
  PoissonProcess,
  EventRateTracker,

  // Utilities
  poissonGoodnessOfFit,
  waitingTimeCDF,
  timeToNEvents,

  // Factories
  createPoissonProcess,
  createEventTracker,

  // Config
  POISSON_CONFIG,
};
