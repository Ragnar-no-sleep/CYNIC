/**
 * Shared Memory - The collective intelligence layer
 *
 * Implements Layer 2 (Collective) and Layer 3 (Procedural) of the
 * 6-layer hybrid context architecture.
 *
 * Persists across sessions, syncs across swarm.
 *
 * @module @cynic/node/memory/shared-memory
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

// Bayesian inference for pattern relevance
import { updateBelief, likelihoodRatio } from '../inference/bayes.js';
// Gaussian for pattern weight distribution analysis
import { computeStats, zScore, GaussianDistribution } from '../inference/gaussian.js';

/**
 * Fibonacci limits for memory stores
 */
const LIMITS = {
  MAX_PATTERNS: 1597,       // F(17)
  MAX_EMBEDDINGS: 2584,     // F(18)
  MAX_FEEDBACK: 987,        // F(16)
  MAX_PROCEDURES: 233,      // F(13)
};

/**
 * Path reinforcement constants (φ-aligned)
 * Inspired by Claude Flow's GNN path reinforcement
 */
const REINFORCEMENT = {
  BOOST_RATE: PHI_INV * 0.01,     // 0.618% boost per access
  DECAY_RATE: PHI_INV * 0.001,    // 0.0618% decay per hour unused
  MIN_WEIGHT: 0.236,              // φ⁻³ minimum weight
  MAX_WEIGHT: 2.618,              // φ + 1 maximum weight
  DECAY_THRESHOLD_HOURS: 168,     // 7 days before decay starts
  WEIGHT_INFLUENCE: 0.25,         // 25% of relevance from weight
};

/**
 * EWC++ (Elastic Weight Consolidation) constants
 * Prevents catastrophic forgetting of important patterns
 */
const EWC = {
  LOCK_THRESHOLD: PHI_INV,        // 0.618 - Lock patterns above this Fisher score
  UNLOCK_THRESHOLD: 0.236,        // φ⁻³ - Unlock patterns below this
  FISHER_BOOST_PER_USE: 0.01,     // Fisher score boost per successful use
  FISHER_DECAY: 0.999,            // Fisher decay rate (very slow)
  MIN_USES_FOR_LOCK: 5,           // Minimum uses before pattern can be locked
};

/**
 * SharedMemory - Collective knowledge accessible to all dogs
 */
export class SharedMemory {
  /**
   * @param {Object} options
   * @param {Object} options.storage - Storage backend
   * @param {Object} [options.swarm] - Swarm instance for sync
   */
  constructor(options = {}) {
    this.storage = options.storage;
    this.swarm = options.swarm;

    // Layer 2: Collective Memory
    this._patterns = new Map();           // Pattern ID -> Pattern
    this._judgmentIndex = [];             // For similarity search
    this._dimensionWeights = {};          // Learned weights per dimension

    // Layer 3: Procedural Memory
    this._procedures = new Map();         // Item type -> Procedure
    this._scoringRules = new Map();       // Item type -> Rules

    // Feedback log for RLHF
    this._feedbackLog = [];

    // Stats
    this.stats = {
      patternsAdded: 0,
      judgmentsIndexed: 0,
      feedbackReceived: 0,
      weightAdjustments: 0,
    };

    this.initialized = false;
  }

  /**
   * Initialize from storage
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const saved = await this.storage?.get('shared_memory');
      if (saved) {
        this._patterns = new Map(saved.patterns || []);
        this._judgmentIndex = saved.judgmentIndex || [];
        this._dimensionWeights = saved.weights || {};
        this._procedures = new Map(saved.procedures || []);
        this._scoringRules = new Map(saved.scoringRules || []);
        this._feedbackLog = saved.feedback || [];
        this.stats = { ...this.stats, ...saved.stats };
      }
    } catch (err) {
      console.warn('[SharedMemory] Failed to load:', err.message);
    }

    // Initialize default procedures if empty
    if (this._procedures.size === 0) {
      this._initDefaultProcedures();
    }

    this.initialized = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: PATTERN MEMORY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get patterns relevant to an item
   * @param {Object} item - Item to find patterns for
   * @param {number} [limit=5] - Max patterns to return
   * @returns {Object[]} Relevant patterns sorted by relevance
   */
  getRelevantPatterns(item, limit = 5) {
    if (!item) return [];

    const itemType = item.type || 'unknown';
    const itemTags = item.tags || [];

    const scored = Array.from(this._patterns.values())
      .map(pattern => ({
        ...pattern,
        relevance: this._calculatePatternRelevance(pattern, itemType, itemTags),
      }))
      .filter(p => p.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    // Mark as used and reinforce (path reinforcement)
    for (const pattern of scored) {
      const stored = this._patterns.get(pattern.id);
      if (stored) {
        stored.useCount = (stored.useCount || 0) + 1;
        stored.lastUsed = Date.now();
        // φ-weighted path reinforcement: boost frequently-used patterns
        this._reinforcePattern(stored);
      }
    }

    return scored;
  }

  /**
   * Add a new pattern to memory
   * @param {Object} pattern - Pattern to add
   * @returns {string} Pattern ID
   */
  addPattern(pattern) {
    const id = pattern.id || `pat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    this._patterns.set(id, {
      ...pattern,
      id,
      addedAt: pattern.addedAt ?? Date.now(),
      useCount: pattern.useCount ?? 0,  // FIX: Preserve useCount from migration
      weight: pattern.weight ?? 1.0,  // Path reinforcement weight
      verified: pattern.verified || false,
      // EWC++ fields (anti-forgetting)
      fisherImportance: pattern.fisherImportance ?? 0,
      consolidationLocked: pattern.consolidationLocked ?? false,
      lockedAt: pattern.lockedAt ?? null,
    });

    this.stats.patternsAdded++;

    // Prune if over limit
    if (this._patterns.size > LIMITS.MAX_PATTERNS) {
      this._prunePatterns();
    }

    return id;
  }

  /**
   * Verify a pattern (marks it as proven)
   * @param {string} patternId - Pattern ID
   */
  verifyPattern(patternId) {
    const pattern = this._patterns.get(patternId);
    if (pattern) {
      pattern.verified = true;
      pattern.verifiedAt = Date.now();
    }
  }

  _calculatePatternRelevance(pattern, itemType, itemTags) {
    // Calculate feature-based relevance (traditional scoring)
    const featureRelevance = this._calculateFeatureRelevance(pattern, itemType, itemTags);

    // Calculate Bayesian posterior (belief strength)
    const bayesianRelevance = this._calculateBayesianRelevance(pattern);

    // Blend: 60% feature-based + 40% Bayesian
    const blendedRelevance = featureRelevance * 0.6 + bayesianRelevance * 0.4;

    return Math.min(PHI_INV, blendedRelevance);
  }

  /**
   * Traditional feature-based relevance calculation
   * @private
   */
  _calculateFeatureRelevance(pattern, itemType, itemTags) {
    let relevance = 0;

    // Type match (35% weight - reduced to make room for path weight)
    if (pattern.applicableTo?.includes(itemType) || pattern.applicableTo?.includes('*')) {
      relevance += 0.35;
    }

    // Tag overlap (25% weight)
    const patternTags = pattern.tags || [];
    const overlap = itemTags.filter(t => patternTags.includes(t)).length;
    if (overlap > 0) {
      relevance += 0.25 * (overlap / Math.max(itemTags.length, patternTags.length, 1));
    }

    // Recency boost (10% weight)
    const ageHours = (Date.now() - (pattern.lastUsed || pattern.addedAt || 0)) / 3600000;
    if (ageHours < 24) relevance += 0.1;
    else if (ageHours < 168) relevance += 0.05;

    // Verified bonus (5% weight)
    if (pattern.verified) relevance += 0.05;

    // Path reinforcement weight (25% weight) - frequently-used paths get boosted
    // Weight ranges from MIN_WEIGHT (0.236) to MAX_WEIGHT (2.618)
    // Normalize to 0-0.25 range: (weight - min) / (max - min) * 0.25
    const weight = pattern.weight ?? 1.0;
    const normalizedWeight = (weight - REINFORCEMENT.MIN_WEIGHT) /
      (REINFORCEMENT.MAX_WEIGHT - REINFORCEMENT.MIN_WEIGHT);
    relevance += Math.max(0, Math.min(REINFORCEMENT.WEIGHT_INFLUENCE, normalizedWeight * REINFORCEMENT.WEIGHT_INFLUENCE));

    return Math.min(relevance, 1);
  }

  /**
   * Calculate Bayesian relevance based on pattern history
   * P(relevant | evidence) = P(evidence | relevant) * P(relevant) / P(evidence)
   *
   * Evidence:
   * - useCount: how many times pattern was used
   * - successRate: fraction of successful applications
   * - fisherImportance: EWC++ importance score
   *
   * @private
   */
  _calculateBayesianRelevance(pattern) {
    // Prior: base rate of pattern relevance (start skeptical)
    const prior = PHI_INV_2; // 38.2% - skeptical prior

    // Calculate likelihood from evidence
    // More uses = more confident the pattern is useful
    const useCount = pattern.useCount || 0;
    const useLikelihood = Math.min(1, useCount / 10); // Saturates at 10 uses

    // Verified patterns are more likely relevant
    const verifiedLikelihood = pattern.verified ? 0.9 : 0.5;

    // Fisher importance indicates critical patterns (EWC++)
    const fisherImportance = pattern.fisherImportance || 0;
    const fisherLikelihood = Math.min(1, 0.5 + fisherImportance * 0.5);

    // Weight indicates reinforcement history
    const weight = pattern.weight || 1.0;
    const weightLikelihood = Math.min(1, (weight - REINFORCEMENT.MIN_WEIGHT) /
      (REINFORCEMENT.MAX_WEIGHT - REINFORCEMENT.MIN_WEIGHT));

    // Combined likelihood (product rule)
    const combinedLikelihood = (useLikelihood * 0.3 +
                                verifiedLikelihood * 0.2 +
                                fisherLikelihood * 0.3 +
                                weightLikelihood * 0.2);

    // Update belief using Bayes
    const baserate = 0.5; // Base rate of relevant patterns in population
    const posterior = updateBelief(prior, combinedLikelihood, baserate);

    // φ-bound the result
    return Math.min(PHI_INV, posterior);
  }

  _prunePatterns() {
    // Sort by score (weight + recency + usage + verified + EWC lock)
    // EWC-locked patterns are NEVER pruned (infinite score)
    const sorted = Array.from(this._patterns.entries())
      .map(([id, p]) => ({
        id,
        locked: p.consolidationLocked || false,
        score: (p.consolidationLocked ? Infinity : 0) +  // EWC lock = never prune
               (p.verified ? 1000 : 0) +
               (p.weight || 1.0) * 100 +  // Weight now matters more
               (p.useCount || 0) * 10 +
               (p.fisherImportance || 0) * 500 +  // Fisher importance matters
               (Date.now() - (p.addedAt || 0)) / -86400000,
      }))
      .sort((a, b) => a.score - b.score);

    // Remove bottom 10% (but never remove locked patterns)
    const toRemove = Math.floor(sorted.length * 0.1);
    let removed = 0;
    for (let i = 0; i < sorted.length && removed < toRemove; i++) {
      if (!sorted[i].locked) {
        this._patterns.delete(sorted[i].id);
        removed++;
      }
    }
  }

  /**
   * Reinforce a pattern (φ-weighted path reinforcement)
   * Called when a pattern is accessed/used
   * @param {Object} pattern - Pattern to reinforce
   * @private
   */
  _reinforcePattern(pattern) {
    const currentWeight = pattern.weight ?? 1.0;

    // Boost by φ⁻¹ * 1% = 0.618% per access
    const newWeight = Math.min(
      REINFORCEMENT.MAX_WEIGHT,
      currentWeight * (1 + REINFORCEMENT.BOOST_RATE)
    );

    pattern.weight = newWeight;
    pattern.lastReinforced = Date.now();

    // EWC++: Also boost Fisher importance when pattern is used
    this._boostFisherImportance(pattern);
  }

  /**
   * Boost Fisher importance when pattern is used successfully
   * Auto-locks pattern if it exceeds threshold
   * @param {Object} pattern - Pattern to boost
   * @private
   */
  _boostFisherImportance(pattern) {
    // Already locked? Nothing to do
    if (pattern.consolidationLocked) return;

    const currentFisher = pattern.fisherImportance ?? 0;
    const newFisher = Math.min(1.0, currentFisher + EWC.FISHER_BOOST_PER_USE);

    pattern.fisherImportance = newFisher;

    // Auto-lock if exceeds threshold AND has enough uses
    const useCount = pattern.useCount || 0;
    const shouldLock = newFisher >= EWC.LOCK_THRESHOLD && useCount >= EWC.MIN_USES_FOR_LOCK;
    if (shouldLock) {
      this._lockPattern(pattern);
    }

    // FIX P3: Sync Fisher score to PostgreSQL (async, non-blocking)
    // "φ persists" - Knowledge must survive restarts
    if (this.storage?.syncFisherScore) {
      this.storage.syncFisherScore(pattern.id, newFisher, shouldLock).catch(() => {
        // Silent fail - persistence is best-effort
      });
    } else if (this.swarm) {
      // Emit event for external persistence listeners
      this.swarm.emit?.('pattern:fisher_updated', {
        id: pattern.id,
        fisherImportance: newFisher,
        consolidationLocked: shouldLock || pattern.consolidationLocked,
      });
    }
  }

  /**
   * Lock a pattern (EWC++ consolidation)
   * Locked patterns are protected from decay and pruning
   * @param {Object} pattern - Pattern to lock
   * @private
   */
  _lockPattern(pattern) {
    if (pattern.consolidationLocked) return;

    pattern.consolidationLocked = true;
    pattern.lockedAt = Date.now();

    // Emit event for external listeners (e.g., persistence sync)
    if (this.swarm) {
      this.swarm.emit?.('pattern:locked', { id: pattern.id });
    }
  }

  /**
   * Unlock a pattern (manual or threshold-based)
   * @param {string} patternId - Pattern ID to unlock
   * @returns {boolean} Success
   */
  unlockPattern(patternId) {
    const pattern = this._patterns.get(patternId);
    if (!pattern || !pattern.consolidationLocked) return false;

    pattern.consolidationLocked = false;
    pattern.lockedAt = null;

    return true;
  }

  /**
   * Get pattern weight distribution statistics using Gaussian analysis
   * Useful for identifying outlier patterns and normalizing weights
   * @returns {Object} Weight distribution stats with z-scores for extremes
   */
  getWeightDistribution() {
    const patterns = Array.from(this._patterns.values());
    if (patterns.length < 3) {
      return { count: patterns.length, insufficient: true };
    }

    const weights = patterns.map(p => p.weight ?? 1.0);
    const stats = computeStats(weights);

    // Find outliers (|z| > 2)
    const outliers = patterns
      .map(p => ({
        id: p.id,
        weight: p.weight ?? 1.0,
        zScore: zScore(p.weight ?? 1.0, stats.mean, stats.stdDev),
      }))
      .filter(o => Math.abs(o.zScore) > 2)
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    // Create distribution model
    const distribution = new GaussianDistribution(stats.mean, stats.stdDev);

    return {
      count: patterns.length,
      mean: stats.mean,
      stdDev: stats.stdDev,
      min: stats.min,
      max: stats.max,
      // Confidence interval for "normal" weights (φ-bounded at 61.8%)
      normalRange: distribution.confidenceInterval(PHI_INV),
      outlierCount: outliers.length,
      outliers: outliers.slice(0, 10), // Top 10 outliers
    };
  }

  /**
   * Identify patterns that need attention (anomalous weights)
   * Uses Gaussian z-scores to find patterns deviating from norm
   * @param {number} [threshold=1.618] - Z-score threshold (default: φ)
   * @returns {Object[]} Patterns with anomalous weights
   */
  getAnomalousPatterns(threshold = 1.618) {
    const patterns = Array.from(this._patterns.values());
    if (patterns.length < 5) return [];

    const weights = patterns.map(p => p.weight ?? 1.0);
    const stats = computeStats(weights);

    return patterns
      .map(p => {
        const weight = p.weight ?? 1.0;
        const z = zScore(weight, stats.mean, stats.stdDev);
        return {
          ...p,
          zScore: z,
          isHigh: z > threshold,
          isLow: z < -threshold,
        };
      })
      .filter(p => Math.abs(p.zScore) > threshold)
      .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  }

  /**
   * Get EWC statistics
   * @returns {Object} EWC stats
   */
  getEWCStats() {
    let locked = 0;
    let critical = 0;
    let totalFisher = 0;
    let maxFisher = 0;

    for (const pattern of this._patterns.values()) {
      const fisher = pattern.fisherImportance || 0;
      totalFisher += fisher;
      if (fisher > maxFisher) maxFisher = fisher;

      if (pattern.consolidationLocked) locked++;
      else if (fisher >= EWC.LOCK_THRESHOLD) critical++;
    }

    const count = this._patterns.size;
    return {
      totalPatterns: count,
      lockedPatterns: locked,
      criticalPatterns: critical,
      avgFisher: count > 0 ? totalFisher / count : 0,
      maxFisher,
      retentionRate: count > 0 ? locked / count : 0,
    };
  }

  /**
   * Decay unused patterns (call periodically)
   * Patterns not used within DECAY_THRESHOLD_HOURS lose weight
   * @returns {number} Number of patterns decayed
   */
  decayUnusedPatterns() {
    const now = Date.now();
    const thresholdMs = REINFORCEMENT.DECAY_THRESHOLD_HOURS * 3600000;
    let decayedCount = 0;
    let skippedLocked = 0;

    for (const pattern of this._patterns.values()) {
      // EWC++ protection: NEVER decay consolidation-locked patterns
      // "What is truly known cannot be forgotten" - κυνικός
      if (pattern.consolidationLocked) {
        skippedLocked++;
        continue;
      }

      const lastUsed = pattern.lastUsed || pattern.addedAt || now;
      const hoursSinceUse = (now - lastUsed) / 3600000;

      // Only decay if not used within threshold
      if (hoursSinceUse > REINFORCEMENT.DECAY_THRESHOLD_HOURS) {
        const currentWeight = pattern.weight ?? 1.0;

        // Decay by φ⁻¹ * 0.1% per hour past threshold
        const hoursOverThreshold = hoursSinceUse - REINFORCEMENT.DECAY_THRESHOLD_HOURS;
        const decayFactor = Math.pow(1 - REINFORCEMENT.DECAY_RATE, hoursOverThreshold);
        const newWeight = Math.max(
          REINFORCEMENT.MIN_WEIGHT,
          currentWeight * decayFactor
        );

        if (newWeight !== currentWeight) {
          pattern.weight = newWeight;
          pattern.lastDecayed = now;
          decayedCount++;
        }
      }

      // Also decay Fisher importance for unlocked patterns (very slow)
      if (pattern.fisherImportance && pattern.fisherImportance > 0) {
        pattern.fisherImportance = pattern.fisherImportance * EWC.FISHER_DECAY;
      }
    }

    return { decayed: decayedCount, protected: skippedLocked };
  }

  /**
   * Get top patterns by weight (most reinforced)
   * @param {number} [limit=10] - Max patterns to return
   * @returns {Object[]} Top weighted patterns
   */
  getTopReinforcedPatterns(limit = 10) {
    return Array.from(this._patterns.values())
      .sort((a, b) => (b.weight || 1.0) - (a.weight || 1.0))
      .slice(0, limit)
      .map(p => ({
        id: p.id,
        weight: p.weight || 1.0,
        useCount: p.useCount || 0,
        verified: p.verified || false,
        tags: p.tags || [],
        applicableTo: p.applicableTo || [],
      }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: JUDGMENT SIMILARITY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get similar past judgments
   * @param {Object} item - Current item
   * @param {number} [limit=3] - Max results
   * @returns {Object[]} Similar judgments with similarity scores
   */
  getSimilarJudgments(item, limit = 3) {
    if (!item || this._judgmentIndex.length === 0) return [];

    const itemText = this._extractText(item);
    const itemTokens = this._tokenize(itemText);
    const itemType = item.type || 'unknown';

    const scored = this._judgmentIndex
      .map(entry => {
        // Type match bonus
        const typeMatch = entry.type === itemType ? 0.3 : 0;
        // Token similarity
        const tokenSim = this._jaccard(itemTokens, entry.tokens);
        return {
          ...entry.judgment,
          similarity: typeMatch + tokenSim * 0.7,
        };
      })
      .filter(j => j.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  }

  /**
   * Index a judgment for similarity search
   * @param {Object} judgment - Judgment to index
   * @param {Object} item - Original item
   */
  indexJudgment(judgment, item) {
    const text = this._extractText(item);
    const tokens = this._tokenize(text);

    this._judgmentIndex.push({
      judgment: {
        id: judgment.id,
        global_score: judgment.global_score,
        verdict: judgment.verdict,
        timestamp: judgment.timestamp,
        itemType: item.type,
      },
      type: item.type || 'unknown',
      tokens,
      indexedAt: Date.now(),
    });

    this.stats.judgmentsIndexed++;

    // Prune if over limit
    if (this._judgmentIndex.length > LIMITS.MAX_EMBEDDINGS) {
      const toRemove = Math.floor(this._judgmentIndex.length * 0.1);
      this._judgmentIndex.splice(0, toRemove);
    }
  }

  _extractText(item) {
    if (typeof item === 'string') return item;
    return [
      item.content,
      item.name,
      item.description,
      item.identifier,
      ...(item.tags || []),
    ].filter(Boolean).join(' ');
  }

  _tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  _jaccard(tokensA, tokensB) {
    if (!tokensA.length || !tokensB.length) return 0;
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate normalized similarity score using Gaussian z-score
   * Compares raw Jaccard to distribution of all similarities
   * @param {number} rawSimilarity - Raw Jaccard similarity
   * @param {number[]} allSimilarities - Array of all computed similarities
   * @returns {number} Normalized similarity (φ-bounded)
   */
  _normalizedSimilarity(rawSimilarity, allSimilarities) {
    if (!allSimilarities || allSimilarities.length < 3) {
      return Math.min(PHI_INV, rawSimilarity);
    }

    try {
      const stats = computeStats(allSimilarities);
      if (stats.stdDev < 0.001) {
        // All similarities are the same, use raw
        return Math.min(PHI_INV, rawSimilarity);
      }

      // Convert to z-score, then to probability
      const z = zScore(rawSimilarity, stats.mean, stats.stdDev);

      // Map z-score to 0-1 range using sigmoid-like transform
      // z=0 → 0.5, z=2 → ~0.88, z=-2 → ~0.12
      const normalized = 1 / (1 + Math.exp(-z));

      return Math.min(PHI_INV, normalized);
    } catch (e) {
      return Math.min(PHI_INV, rawSimilarity);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2: LEARNED WEIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get learned dimension weights
   * @returns {Object} Dimension -> weight mapping
   */
  getLearnedWeights() {
    return { ...this._dimensionWeights };
  }

  /**
   * Get weight for a specific dimension
   * @param {string} dimension - Dimension name
   * @returns {number} Weight (default 1.0)
   */
  getWeight(dimension) {
    return this._dimensionWeights[dimension] ?? 1.0;
  }

  /**
   * Adjust dimension weight from feedback
   * @param {string} dimension - Dimension name
   * @param {number} delta - Weight adjustment (-1 to +1)
   * @param {string} [source='feedback'] - Feedback source
   */
  adjustWeight(dimension, delta, source = 'feedback') {
    const current = this._dimensionWeights[dimension] ?? 1.0;
    const learningRate = 0.236; // ~= phi^-3

    // Bounded update [0.1, 3.0]
    const newWeight = Math.max(0.1, Math.min(3.0,
      current + delta * learningRate
    ));

    this._dimensionWeights[dimension] = newWeight;
    this.stats.weightAdjustments++;

    // Log feedback
    this._feedbackLog.push({
      type: 'weight_adjustment',
      dimension,
      oldWeight: current,
      newWeight,
      delta,
      source,
      timestamp: Date.now(),
    });

    // Prune feedback log
    if (this._feedbackLog.length > LIMITS.MAX_FEEDBACK) {
      this._feedbackLog.splice(0, this._feedbackLog.length - LIMITS.MAX_FEEDBACK);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 3: PROCEDURAL MEMORY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get procedure for item type
   * @param {string} itemType - Item type
   * @returns {Object|null} Procedure or null
   */
  getForItemType(itemType) {
    return this._procedures.get(itemType) ||
           this._procedures.get('default') ||
           null;
  }

  /**
   * Get scoring rules for item type
   * @param {string} itemType - Item type
   * @returns {Object} Scoring rules
   */
  getScoringRules(itemType) {
    return this._scoringRules.get(itemType) ||
           this._scoringRules.get('default') ||
           {};
  }

  /**
   * Add or update a procedure
   * @param {string} itemType - Item type
   * @param {Object} procedure - Procedure definition
   */
  setProcedure(itemType, procedure) {
    this._procedures.set(itemType, {
      ...procedure,
      type: itemType,
      updatedAt: Date.now(),
    });
  }

  /**
   * Add or update scoring rules
   * @param {string} itemType - Item type
   * @param {Object} rules - Scoring rules
   */
  setScoringRules(itemType, rules) {
    this._scoringRules.set(itemType, {
      ...rules,
      type: itemType,
      updatedAt: Date.now(),
    });
  }

  _initDefaultProcedures() {
    // Default procedure for unknown types
    this.setProcedure('default', {
      steps: [
        'Identify item type and context',
        'Apply relevant dimension scoring',
        'Check for red flags or anomalies',
        'Synthesize overall assessment',
      ],
    });

    // Token procedure
    this.setProcedure('token', {
      steps: [
        'Check holder distribution (top 10 < 30%)',
        'Verify liquidity status',
        'Calculate K-Score if available',
        'Assess social sentiment vs hype',
        'Check burn history and tokenomics',
      ],
    });

    // Code procedure
    this.setProcedure('code', {
      steps: [
        'Check for security vulnerabilities',
        'Assess code quality and readability',
        'Verify test coverage exists',
        'Check for code smells and debt',
        'Review architectural patterns',
      ],
    });

    // Decision procedure
    this.setProcedure('decision', {
      steps: [
        'Identify stakeholders and impact',
        'List pros and cons',
        'Assess reversibility',
        'Check alignment with goals',
        'Consider second-order effects',
      ],
    });

    // Default scoring rules
    this.setScoringRules('default', {
      minScore: 0,
      maxScore: 100,
      verdictThresholds: {
        HOWL: 85,
        WAG: 62,
        GROWL: 38,
        BARK: 0,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE & SYNC
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save to storage
   */
  async save() {
    if (!this.storage) return;

    try {
      await this.storage.set('shared_memory', {
        patterns: Array.from(this._patterns.entries()),
        judgmentIndex: this._judgmentIndex.slice(-500), // Keep recent 500
        weights: this._dimensionWeights,
        procedures: Array.from(this._procedures.entries()),
        scoringRules: Array.from(this._scoringRules.entries()),
        feedback: this._feedbackLog.slice(-100),
        stats: this.stats,
        savedAt: Date.now(),
      });
    } catch (err) {
      console.warn('[SharedMemory] Failed to save:', err.message);
    }
  }

  /**
   * Export for swarm sync (only verified/proven data)
   * @returns {Object} Exportable state
   */
  export() {
    return {
      patterns: Array.from(this._patterns.values())
        .filter(p => p.verified || (p.useCount || 0) >= 3),
      weights: this._dimensionWeights,
      procedures: Array.from(this._procedures.values()),
      timestamp: Date.now(),
    };
  }

  /**
   * Import from swarm sync
   * @param {Object} remote - Remote memory state
   */
  import(remote) {
    // Merge patterns (don't overwrite existing)
    for (const pattern of (remote.patterns || [])) {
      if (!this._patterns.has(pattern.id)) {
        this.addPattern({ ...pattern, importedFrom: 'swarm' });
      }
    }

    // Merge weights (average with local)
    for (const [dim, weight] of Object.entries(remote.weights || {})) {
      const local = this._dimensionWeights[dim] ?? 1.0;
      this._dimensionWeights[dim] = (local + weight) / 2;
    }

    // Merge procedures (prefer newer)
    for (const proc of (remote.procedures || [])) {
      const local = this._procedures.get(proc.type);
      if (!local || (proc.updatedAt || 0) > (local.updatedAt || 0)) {
        this.setProcedure(proc.type, proc);
      }
    }
  }

  /**
   * Get memory stats
   * @returns {Object} Stats summary
   */
  getStats() {
    const patterns = Array.from(this._patterns.values());
    const weights = patterns.map(p => p.weight ?? 1.0);
    const avgWeight = weights.length > 0
      ? weights.reduce((a, b) => a + b, 0) / weights.length
      : 1.0;

    return {
      patternCount: this._patterns.size,
      verifiedPatterns: patterns.filter(p => p.verified).length,
      judgmentIndexSize: this._judgmentIndex.length,
      dimensionsTracked: Object.keys(this._dimensionWeights).length,
      procedureCount: this._procedures.size,
      feedbackCount: this._feedbackLog.length,
      // Path reinforcement stats
      avgPatternWeight: Math.round(avgWeight * 1000) / 1000,
      highWeightPatterns: patterns.filter(p => (p.weight ?? 1.0) > 1.5).length,
      lowWeightPatterns: patterns.filter(p => (p.weight ?? 1.0) < 0.5).length,
      ...this.stats,
      initialized: this.initialized,
    };
  }

  /**
   * Record feedback from user/system
   * @param {Object} feedback - Feedback data
   */
  recordFeedback(feedback) {
    this._feedbackLog.push({
      ...feedback,
      timestamp: Date.now(),
    });
    this.stats.feedbackReceived++;

    if (this._feedbackLog.length > LIMITS.MAX_FEEDBACK) {
      this._feedbackLog.splice(0, this._feedbackLog.length - LIMITS.MAX_FEEDBACK);
    }
  }

  /**
   * Get recent feedback
   * @param {number} [count=10] - Number of entries
   * @returns {Object[]} Recent feedback
   */
  getRecentFeedback(count = 10) {
    return this._feedbackLog.slice(-count);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSTGRESQL SYNC (bidirectional persistence)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save all patterns to PostgreSQL (batch persistence)
   * Closes BLACK HOLE #1: Patterns no longer lost on restart
   *
   * @param {Object} patternRepository - PatternRepository instance
   * @param {Object} [options={}] - Save options
   * @param {boolean} [options.onlyModified=false] - Only save modified patterns
   * @param {number} [options.since=0] - Only save patterns modified since timestamp
   * @returns {Promise<{saved: number, errors: number}>} Save results
   */
  async saveToPostgres(patternRepository, options = {}) {
    if (!patternRepository) {
      console.warn('[SharedMemory] No pattern repository provided for persistence');
      return { saved: 0, errors: 0, skipped: 0 };
    }

    const { onlyModified = false, since = 0 } = options;

    // Get patterns to save
    let patternsToSave;
    if (onlyModified && since > 0) {
      patternsToSave = this.getModifiedPatterns(since);
    } else if (onlyModified) {
      // Save patterns with weight > 1.0 or useCount > 0 or locked
      patternsToSave = Array.from(this._patterns.values())
        .filter(p => (p.weight ?? 1.0) > 1.0 || (p.useCount ?? 0) > 0 || p.consolidationLocked)
        .map(this._toPostgresFormat.bind(this));
    } else {
      patternsToSave = Array.from(this._patterns.values())
        .map(this._toPostgresFormat.bind(this));
    }

    let saved = 0;
    let errors = 0;

    // Batch save with error handling
    for (const pattern of patternsToSave) {
      try {
        await patternRepository.upsert(pattern);
        saved++;
      } catch (err) {
        errors++;
        // Log errors in debug mode (LOUD error mode)
        if (process.env.CYNIC_DEBUG) {
          console.error(`[SharedMemory] Failed to save pattern ${pattern.patternId}:`, err.message);
        }
      }
    }

    // Mark save timestamp
    this._lastSaveTimestamp = Date.now();

    return { saved, errors, total: patternsToSave.length };
  }

  /**
   * Load patterns from PostgreSQL at startup
   * Enables cross-session persistence
   *
   * @param {Object} patternRepository - PatternRepository instance
   * @param {Object} [options={}] - Load options
   * @param {number} [options.limit=500] - Max patterns to load
   * @param {number} [options.minConfidence=0.1] - Min confidence to load
   * @returns {Promise<{loaded: number}>} Load results
   */
  async loadFromPostgres(patternRepository, options = {}) {
    if (!patternRepository) {
      console.warn('[SharedMemory] No pattern repository provided for loading');
      return { loaded: 0 };
    }

    const { limit = 500, minConfidence = 0.1 } = options;

    try {
      // Load patterns ordered by confidence and frequency
      const patterns = await patternRepository.list({ limit });

      let loaded = 0;
      for (const dbPattern of patterns) {
        // Convert from PostgreSQL format to SharedMemory format
        const smPattern = this._fromPostgresFormat(dbPattern);

        // Skip low confidence patterns
        if ((smPattern.fisherImportance ?? smPattern.weight ?? 0) < minConfidence) {
          continue;
        }

        // Don't overwrite existing patterns that might be more recent
        if (!this._patterns.has(smPattern.id)) {
          this._patterns.set(smPattern.id, smPattern);
          loaded++;
        } else {
          // Merge: take higher weight/Fisher importance
          const existing = this._patterns.get(smPattern.id);
          if ((smPattern.fisherImportance ?? 0) > (existing.fisherImportance ?? 0)) {
            this._patterns.set(smPattern.id, { ...existing, ...smPattern });
            loaded++;
          }
        }
      }

      console.log(`[SharedMemory] Loaded ${loaded} patterns from PostgreSQL`);
      return { loaded };
    } catch (err) {
      console.error('[SharedMemory] Failed to load patterns from PostgreSQL:', err.message);
      return { loaded: 0, error: err.message };
    }
  }

  /**
   * Convert PostgreSQL pattern format to SharedMemory format
   *
   * @param {Object} dbPattern - Pattern from PostgreSQL
   * @returns {Object} Pattern in SharedMemory format
   * @private
   */
  _fromPostgresFormat(dbPattern) {
    const data = typeof dbPattern.data === 'string'
      ? JSON.parse(dbPattern.data)
      : (dbPattern.data || {});

    const confidence = parseFloat(dbPattern.confidence) || 0.5;
    const frequency = parseInt(dbPattern.frequency) || 1;

    // Derive φ-weighted values from raw DB fields when not stored in data
    const weight = data.weight ?? Math.min(2.618, 0.5 + Math.log10(frequency + 1) * 0.5);
    const fisherImportance = data.fisherImportance ?? Math.min(1.0, confidence * 1.2);
    const verified = data.verified ?? (confidence >= PHI_INV && frequency >= 3);
    const consolidationLocked = data.consolidationLocked ?? (fisherImportance >= PHI_INV);
    const applicableTo = data.applicableTo || (dbPattern.category ? [dbPattern.category, '*'] : ['*']);

    return {
      id: dbPattern.pattern_id,
      name: dbPattern.name,
      description: dbPattern.description,
      category: dbPattern.category,
      tags: dbPattern.tags || [],
      applicableTo,
      // Weights and importance (φ-derived from confidence × frequency)
      weight,
      fisherImportance,
      consolidationLocked,
      verified,
      // Stats
      useCount: dbPattern.frequency || 0,
      addedAt: dbPattern.created_at ? new Date(dbPattern.created_at).getTime() : Date.now(),
      lastUsed: dbPattern.updated_at ? new Date(dbPattern.updated_at).getTime() : null,
      // Source info
      sourceJudgments: typeof dbPattern.source_judgments === 'string'
        ? JSON.parse(dbPattern.source_judgments)
        : (dbPattern.source_judgments || []),
      sourceCount: dbPattern.source_count || 0,
      // Preserve additional data
      data,
    };
  }

  /**
   * Get EWC-locked patterns for persistence
   * These are high-importance patterns that should be saved to PostgreSQL
   *
   * @returns {Object[]} Locked patterns in PostgreSQL format
   */
  getLockedPatterns() {
    return Array.from(this._patterns.values())
      .filter(p => p.consolidationLocked || p.fisherImportance >= 0.618)
      .map(this._toPostgresFormat.bind(this));
  }

  /**
   * Get modified patterns since last save
   * Useful for incremental sync
   *
   * @param {number} [since=0] - Timestamp to filter from
   * @returns {Object[]} Modified patterns in PostgreSQL format
   */
  getModifiedPatterns(since = 0) {
    return Array.from(this._patterns.values())
      .filter(p => (p.lastReinforced || p.addedAt || 0) > since)
      .map(this._toPostgresFormat.bind(this));
  }

  /**
   * Convert SharedMemory pattern to PostgreSQL format
   *
   * @param {Object} smPattern - Pattern in SharedMemory format
   * @returns {Object} Pattern in PostgreSQL format
   * @private
   */
  _toPostgresFormat(smPattern) {
    return {
      patternId: smPattern.id,
      category: smPattern.category || smPattern.applicableTo?.[0] || 'general',
      name: smPattern.name || smPattern.id,
      description: smPattern.description || '',
      confidence: smPattern.fisherImportance || smPattern.weight || 0.5,
      frequency: smPattern.useCount || 1,
      tags: smPattern.tags || [],
      data: {
        weight: smPattern.weight,
        fisherImportance: smPattern.fisherImportance,
        consolidationLocked: smPattern.consolidationLocked,
        verified: smPattern.verified,
        applicableTo: smPattern.applicableTo,
        ...smPattern.data,
      },
      sourceJudgments: smPattern.sourceJudgments || [],
      sourceCount: smPattern.sourceCount || 0,
    };
  }
}

export default SharedMemory;
