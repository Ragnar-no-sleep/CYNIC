/**
 * Entropy - Information theory utilities
 *
 * "φ mesure l'incertitude" - κυνικός
 *
 * Shannon entropy, cross-entropy, KL divergence for CYNIC judgments.
 *
 * @module @cynic/node/inference/entropy
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

/**
 * Calculate Shannon entropy of a probability distribution
 * H(X) = -Σ p(x) log₂ p(x)
 *
 * @param {number[]} probs - Probability distribution (must sum to 1)
 * @returns {number} Entropy in bits
 */
export function shannonEntropy(probs) {
  if (!probs || probs.length === 0) return 0;

  let entropy = 0;
  for (const p of probs) {
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Calculate normalized entropy (0 to 1 scale)
 * Normalized = H(X) / log₂(n)
 *
 * @param {number[]} probs - Probability distribution
 * @returns {number} Normalized entropy [0, 1]
 */
export function normalizedEntropy(probs) {
  if (!probs || probs.length <= 1) return 0;

  const maxEntropy = Math.log2(probs.length);
  if (maxEntropy === 0) return 0;

  return shannonEntropy(probs) / maxEntropy;
}

/**
 * Calculate cross-entropy between two distributions
 * H(P, Q) = -Σ p(x) log₂ q(x)
 *
 * @param {number[]} p - True distribution
 * @param {number[]} q - Model distribution
 * @returns {number} Cross-entropy
 */
export function crossEntropy(p, q) {
  if (!p || !q || p.length !== q.length) return Infinity;

  let ce = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) {
      if (q[i] <= 0) return Infinity; // Undefined when q=0 but p>0
      ce -= p[i] * Math.log2(q[i]);
    }
  }

  return ce;
}

/**
 * Calculate KL divergence (relative entropy)
 * D_KL(P || Q) = Σ p(x) log₂(p(x) / q(x))
 *
 * @param {number[]} p - True distribution
 * @param {number[]} q - Model distribution
 * @returns {number} KL divergence (always >= 0)
 */
export function klDivergence(p, q) {
  if (!p || !q || p.length !== q.length) return Infinity;

  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) {
      if (q[i] <= 0) return Infinity;
      kl += p[i] * Math.log2(p[i] / q[i]);
    }
  }

  return kl;
}

/**
 * Calculate Jensen-Shannon divergence (symmetric KL)
 * JSD(P || Q) = 0.5 * D_KL(P || M) + 0.5 * D_KL(Q || M)
 * where M = 0.5 * (P + Q)
 *
 * @param {number[]} p - Distribution P
 * @param {number[]} q - Distribution Q
 * @returns {number} JS divergence [0, 1]
 */
export function jsDivergence(p, q) {
  if (!p || !q || p.length !== q.length) return 1;

  // Compute midpoint distribution M
  const m = p.map((pi, i) => 0.5 * (pi + q[i]));

  // JSD = 0.5 * KL(P||M) + 0.5 * KL(Q||M)
  const klPM = klDivergence(p, m);
  const klQM = klDivergence(q, m);

  if (!isFinite(klPM) || !isFinite(klQM)) return 1;

  return 0.5 * klPM + 0.5 * klQM;
}

/**
 * Convert dimension scores to probability distribution
 * (Softmax normalization)
 *
 * @param {number[]} scores - Raw scores
 * @param {number} [temperature=1.0] - Softmax temperature
 * @returns {number[]} Probability distribution
 */
export function scoresToProbabilities(scores, temperature = 1.0) {
  if (!scores || scores.length === 0) return [];

  // Apply temperature scaling
  const scaled = scores.map(s => s / temperature);

  // Subtract max for numerical stability
  const maxScore = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - maxScore));

  // Normalize
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

/**
 * Calculate entropy-based confidence
 * High entropy = low confidence, Low entropy = high confidence
 * φ-bounded to max 61.8%
 *
 * @param {number[]} scores - Dimension scores
 * @returns {Object} Confidence analysis
 */
export function entropyConfidence(scores) {
  if (!scores || scores.length === 0) {
    return { confidence: 0, entropy: 0, normalized: 0 };
  }

  const probs = scoresToProbabilities(scores);
  const entropy = shannonEntropy(probs);
  const normalized = normalizedEntropy(probs);

  // Confidence = 1 - normalized entropy, capped at φ⁻¹
  const rawConfidence = 1 - normalized;
  const confidence = Math.min(PHI_INV, rawConfidence);

  return {
    confidence,
    entropy,
    normalized,
    maxEntropy: Math.log2(scores.length),
    distribution: probs,
  };
}

/**
 * Entropy class for tracking entropy over time
 */
export class EntropyTracker {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 21; // Fib(8)
    this.history = [];
  }

  /**
   * Record an entropy observation
   * @param {number} entropy - Entropy value
   */
  record(entropy) {
    this.history.push({
      entropy,
      timestamp: Date.now(),
    });

    // Keep window bounded
    while (this.history.length > this.windowSize) {
      this.history.shift();
    }
  }

  /**
   * Get average entropy
   */
  getAverage() {
    if (this.history.length === 0) return 0;
    const sum = this.history.reduce((a, h) => a + h.entropy, 0);
    return sum / this.history.length;
  }

  /**
   * Get entropy trend
   * @returns {string} 'increasing', 'decreasing', or 'stable'
   */
  getTrend() {
    if (this.history.length < 3) return 'stable';

    const recent = this.history.slice(-5);
    const older = this.history.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, h) => a + h.entropy, 0) / recent.length;
    const olderAvg = older.reduce((a, h) => a + h.entropy, 0) / older.length;

    const diff = recentAvg - olderAvg;
    if (diff > 0.1) return 'increasing';
    if (diff < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Get summary
   */
  getSummary() {
    return {
      count: this.history.length,
      average: this.getAverage(),
      trend: this.getTrend(),
      latest: this.history.length > 0 ? this.history[this.history.length - 1].entropy : 0,
    };
  }

  /**
   * Reset tracker
   */
  reset() {
    this.history = [];
  }
}

// Singleton tracker
let trackerInstance = null;

export function getEntropyTracker() {
  if (!trackerInstance) {
    trackerInstance = new EntropyTracker();
  }
  return trackerInstance;
}

export function resetEntropyTracker() {
  trackerInstance = null;
}

export default {
  shannonEntropy,
  normalizedEntropy,
  crossEntropy,
  klDivergence,
  jsDivergence,
  scoresToProbabilities,
  entropyConfidence,
  EntropyTracker,
  getEntropyTracker,
  resetEntropyTracker,
};
