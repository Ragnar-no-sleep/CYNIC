/**
 * Pattern Detector - Emergent Pattern Recognition
 *
 * "Patterns emerge from chaos like stars from the void" - κυνικός
 *
 * Detects patterns across:
 * - Judgments (verdict sequences, score distributions)
 * - Node behavior (timing, quality trends)
 * - Network effects (clustering, propagation)
 *
 * @module @cynic/emergence/patterns
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Pattern types
 */
export const PatternType = {
  SEQUENCE: 'SEQUENCE',       // Repeating sequences
  ANOMALY: 'ANOMALY',         // Unusual deviation
  TREND: 'TREND',             // Directional change
  CLUSTER: 'CLUSTER',         // Grouping
  CORRELATION: 'CORRELATION', // Related changes
  CYCLE: 'CYCLE',             // Periodic behavior
  EMERGENCE: 'EMERGENCE',     // New emergent behavior
};

/**
 * Pattern significance thresholds (φ-aligned)
 */
export const SIGNIFICANCE_THRESHOLDS = {
  TRIVIAL: PHI_INV_3,      // 0.236 - Barely notable
  NOTABLE: PHI_INV_2,      // 0.382 - Worth tracking
  SIGNIFICANT: PHI_INV,    // 0.618 - Important
  CRITICAL: 0.9,           // Near certain
};

/**
 * Detected pattern
 * @typedef {Object} Pattern
 * @property {string} id - Pattern identifier
 * @property {string} type - Pattern type
 * @property {Object} data - Pattern details
 * @property {number} significance - How significant [0, 1]
 * @property {number} confidence - Detection confidence
 * @property {number} firstSeen - First detection timestamp
 * @property {number} lastSeen - Last detection timestamp
 * @property {number} occurrences - How many times detected
 */

/**
 * Pattern Detector
 *
 * Detects and tracks emergent patterns in data streams.
 *
 * @example
 * ```javascript
 * const detector = new PatternDetector();
 *
 * // Feed data points
 * detector.observe({ type: 'JUDGMENT', verdict: 'GROWL', score: 45 });
 * detector.observe({ type: 'JUDGMENT', verdict: 'WAG', score: 78 });
 *
 * // Detect patterns
 * const patterns = detector.detect();
 *
 * // Get specific pattern types
 * const anomalies = detector.getPatterns(PatternType.ANOMALY);
 * ```
 */
export class PatternDetector {
  /**
   * @param {Object} options - Configuration
   * @param {number} [options.windowSize=50] - Analysis window size
   * @param {number} [options.minOccurrences=3] - Minimum occurrences for pattern
   * @param {number} [options.anomalyThreshold=2] - Std deviations for anomaly
   */
  constructor(options = {}) {
    this.windowSize = options.windowSize || 50;
    this.minOccurrences = options.minOccurrences || 3;
    this.anomalyThreshold = options.anomalyThreshold || 2;

    // Data buffer
    this.dataPoints = [];
    this.maxDataPoints = this.windowSize * 10;

    // Detected patterns
    this.patterns = new Map();

    // Statistics for anomaly detection
    this.stats = {
      count: 0,
      mean: 0,
      m2: 0,  // For variance calculation
    };

    // Sequence tracking
    this.sequenceBuffer = [];
    this.maxSequenceLength = 10;

    // Value distribution for clustering
    this.distribution = new Map();
  }

  /**
   * Observe a data point
   *
   * @param {Object} dataPoint - Data point to observe
   * @param {string} [dataPoint.type] - Data type
   * @param {number} [dataPoint.value] - Numeric value (for stats)
   * @returns {Pattern[]} Any immediately detected patterns
   */
  observe(dataPoint) {
    const timestamp = Date.now();
    const point = {
      ...dataPoint,
      timestamp,
    };

    this.dataPoints.push(point);

    // Maintain buffer size
    if (this.dataPoints.length > this.maxDataPoints) {
      this.dataPoints.shift();
    }

    // Update statistics if value present
    if (typeof dataPoint.value === 'number') {
      this._updateStats(dataPoint.value);
      this._updateDistribution(dataPoint.value);
    }

    // Update sequence buffer
    this._updateSequence(point);

    // Check for immediate patterns
    return this._detectImmediate(point);
  }

  /**
   * Run full pattern detection
   *
   * @returns {Pattern[]} All detected patterns
   */
  detect() {
    const detected = [];

    detected.push(...this._detectSequences());
    detected.push(...this._detectAnomalies());
    detected.push(...this._detectTrends());
    detected.push(...this._detectClusters());
    detected.push(...this._detectCycles());

    return detected;
  }

  /**
   * Get patterns of a specific type
   *
   * @param {string} [type] - Pattern type (or all if not specified)
   * @param {number} [minSignificance=0] - Minimum significance
   * @returns {Pattern[]} Matching patterns
   */
  getPatterns(type = null, minSignificance = 0) {
    const patterns = Array.from(this.patterns.values());

    return patterns.filter(p => {
      if (type && p.type !== type) return false;
      if (p.significance < minSignificance) return false;
      return true;
    });
  }

  /**
   * Get most significant patterns
   *
   * @param {number} [limit=10] - Maximum to return
   * @returns {Pattern[]} Top patterns by significance
   */
  getTopPatterns(limit = 10) {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.significance - a.significance)
      .slice(0, limit);
  }

  /**
   * Check if a specific pattern exists
   *
   * @param {string} patternId - Pattern ID
   * @returns {Pattern|null} Pattern if exists
   */
  hasPattern(patternId) {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Update running statistics
   * @private
   */
  _updateStats(value) {
    this.stats.count++;
    const delta = value - this.stats.mean;
    this.stats.mean += delta / this.stats.count;
    const delta2 = value - this.stats.mean;
    this.stats.m2 += delta * delta2;
  }

  /**
   * Get variance
   * @private
   */
  _getVariance() {
    if (this.stats.count < 2) return 0;
    return this.stats.m2 / (this.stats.count - 1);
  }

  /**
   * Get standard deviation
   * @private
   */
  _getStdDev() {
    return Math.sqrt(this._getVariance());
  }

  /**
   * Update value distribution
   * @private
   */
  _updateDistribution(value) {
    // Bucket values into ranges
    const bucket = Math.floor(value / 10) * 10;
    this.distribution.set(bucket, (this.distribution.get(bucket) || 0) + 1);
  }

  /**
   * Update sequence buffer
   * @private
   */
  _updateSequence(point) {
    // Create a sequence key from the point
    const key = this._pointToSequenceKey(point);
    this.sequenceBuffer.push(key);

    if (this.sequenceBuffer.length > this.maxSequenceLength) {
      this.sequenceBuffer.shift();
    }
  }

  /**
   * Convert point to sequence key
   * @private
   */
  _pointToSequenceKey(point) {
    // Create a simple key for sequence matching
    const parts = [];
    if (point.type) parts.push(point.type);
    if (point.verdict) parts.push(point.verdict);
    if (typeof point.value === 'number') {
      parts.push(point.value > this.stats.mean ? 'HIGH' : 'LOW');
    }
    return parts.join(':');
  }

  /**
   * Detect immediate patterns (on each observation)
   * @private
   */
  _detectImmediate(point) {
    const patterns = [];

    // Check for anomaly
    if (typeof point.value === 'number') {
      const stdDev = this._getStdDev();
      if (stdDev > 0) {
        const zScore = Math.abs(point.value - this.stats.mean) / stdDev;
        if (zScore > this.anomalyThreshold) {
          const pattern = this._createPattern(
            PatternType.ANOMALY,
            { value: point.value, zScore, point },
            Math.min(1, zScore / 3),
            PHI_INV
          );
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Detect sequence patterns
   * @private
   */
  _detectSequences() {
    const patterns = [];
    const sequences = new Map();

    // Look for repeating subsequences
    for (let len = 2; len <= Math.min(5, this.sequenceBuffer.length / 2); len++) {
      for (let i = 0; i <= this.sequenceBuffer.length - len; i++) {
        const seq = this.sequenceBuffer.slice(i, i + len).join('|');
        sequences.set(seq, (sequences.get(seq) || 0) + 1);
      }
    }

    // Find significant sequences
    for (const [seq, count] of sequences) {
      if (count >= this.minOccurrences) {
        const significance = Math.min(1, count / 10);
        patterns.push(this._createPattern(
          PatternType.SEQUENCE,
          { sequence: seq.split('|'), occurrences: count },
          significance,
          PHI_INV_2
        ));
      }
    }

    return patterns;
  }

  /**
   * Detect anomalies
   * @private
   */
  _detectAnomalies() {
    const patterns = [];
    const stdDev = this._getStdDev();

    if (stdDev === 0) return patterns;

    for (const point of this.dataPoints.slice(-this.windowSize)) {
      if (typeof point.value !== 'number') continue;

      const zScore = Math.abs(point.value - this.stats.mean) / stdDev;
      if (zScore > this.anomalyThreshold) {
        patterns.push(this._createPattern(
          PatternType.ANOMALY,
          { value: point.value, zScore, expected: this.stats.mean },
          Math.min(1, zScore / 4),
          PHI_INV
        ));
      }
    }

    return patterns;
  }

  /**
   * Detect trends
   * @private
   */
  _detectTrends() {
    const patterns = [];
    const recent = this.dataPoints
      .slice(-this.windowSize)
      .filter(p => typeof p.value === 'number');

    if (recent.length < 10) return patterns;

    // Split into halves and compare
    const midpoint = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, midpoint);
    const secondHalf = recent.slice(midpoint);

    const firstAvg = firstHalf.reduce((s, p) => s + p.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, p) => s + p.value, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changePercent = firstAvg !== 0 ? Math.abs(change / firstAvg) : 0;

    if (changePercent > 0.1) { // 10% change threshold
      const direction = change > 0 ? 'INCREASING' : 'DECREASING';
      patterns.push(this._createPattern(
        PatternType.TREND,
        { direction, change, changePercent, firstAvg, secondAvg },
        Math.min(1, changePercent),
        PHI_INV_2
      ));
    }

    return patterns;
  }

  /**
   * Detect clusters
   * @private
   */
  _detectClusters() {
    const patterns = [];

    // Find dominant buckets in distribution
    const total = this.stats.count;
    if (total < 10) return patterns;

    for (const [bucket, count] of this.distribution) {
      const ratio = count / total;
      if (ratio > PHI_INV_2) { // Significant cluster
        patterns.push(this._createPattern(
          PatternType.CLUSTER,
          { center: bucket + 5, count, ratio },
          ratio,
          PHI_INV
        ));
      }
    }

    return patterns;
  }

  /**
   * Detect cycles (periodic patterns)
   * @private
   */
  _detectCycles() {
    const patterns = [];
    const values = this.dataPoints
      .slice(-this.windowSize)
      .filter(p => typeof p.value === 'number')
      .map(p => p.value);

    if (values.length < 20) return patterns;

    // Simple autocorrelation for period detection
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const normalized = values.map(v => v - mean);

    for (let period = 3; period <= Math.floor(values.length / 3); period++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < values.length - period; i++) {
        correlation += normalized[i] * normalized[i + period];
        count++;
      }

      correlation /= count;

      // Normalize by variance
      const variance = normalized.reduce((s, v) => s + v * v, 0) / normalized.length;
      const normalizedCorr = variance > 0 ? correlation / variance : 0;

      if (normalizedCorr > PHI_INV_2) {
        patterns.push(this._createPattern(
          PatternType.CYCLE,
          { period, correlation: normalizedCorr },
          normalizedCorr,
          PHI_INV_2
        ));
        break; // Take first significant period
      }
    }

    return patterns;
  }

  /**
   * Create a pattern object
   * @private
   */
  _createPattern(type, data, significance, confidence) {
    const id = `${type}_${this._hashData(data)}`;
    const existing = this.patterns.get(id);

    const pattern = {
      id,
      type,
      data,
      significance: Math.min(1, significance),
      confidence: Math.min(PHI_INV, confidence), // Cap at φ⁻¹
      firstSeen: existing?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      occurrences: (existing?.occurrences || 0) + 1,
    };

    // Increase significance with repeated occurrences
    if (existing && pattern.occurrences > 1) {
      pattern.significance = Math.min(1,
        pattern.significance * (1 + Math.log(pattern.occurrences) * 0.1)
      );
    }

    this.patterns.set(id, pattern);
    return pattern;
  }

  /**
   * Hash data for pattern ID
   * @private
   */
  _hashData(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).slice(0, 8);
  }

  /**
   * Get statistics summary
   * @returns {Object}
   */
  getStats() {
    return {
      dataPoints: this.dataPoints.length,
      patterns: this.patterns.size,
      mean: this.stats.mean,
      stdDev: this._getStdDev(),
      distribution: Object.fromEntries(this.distribution),
    };
  }

  /**
   * Export for persistence
   * @returns {Object}
   */
  export() {
    return {
      dataPoints: this.dataPoints.slice(-this.windowSize),
      patterns: Array.from(this.patterns.entries()),
      stats: { ...this.stats },
      sequenceBuffer: [...this.sequenceBuffer],
      distribution: Array.from(this.distribution.entries()),
      exportedAt: Date.now(),
    };
  }

  /**
   * Import from persistence
   * @param {Object} data - Exported data
   */
  import(data) {
    if (data.dataPoints) this.dataPoints = data.dataPoints;
    if (data.patterns) this.patterns = new Map(data.patterns);
    if (data.stats) this.stats = data.stats;
    if (data.sequenceBuffer) this.sequenceBuffer = data.sequenceBuffer;
    if (data.distribution) this.distribution = new Map(data.distribution);
  }

  /**
   * Clear all data
   */
  clear() {
    this.dataPoints = [];
    this.patterns.clear();
    this.stats = { count: 0, mean: 0, m2: 0 };
    this.sequenceBuffer = [];
    this.distribution.clear();
  }
}

/**
 * Create a PatternDetector instance
 * @param {Object} [options] - Configuration
 * @returns {PatternDetector}
 */
export function createPatternDetector(options = {}) {
  return new PatternDetector(options);
}

export default {
  PatternDetector,
  createPatternDetector,
  PatternType,
  SIGNIFICANCE_THRESHOLDS,
};
