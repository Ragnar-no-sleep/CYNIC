/**
 * EWC++ Knowledge Retention Service
 *
 * Implements Elastic Weight Consolidation++ to prevent catastrophic forgetting.
 * Patterns that prove valuable are "locked" to preserve learned knowledge.
 *
 * Key concepts:
 * - Fisher Information: Measures how important each pattern is
 * - Consolidation Lock: Prevents decay/modification of important patterns
 * - RETRIEVE→JUDGE→DISTILL→CONSOLIDATE cycle
 *
 * Inspired by Claude Flow's EWC++ achieving 95%+ pattern retention.
 *
 * "What is truly known cannot be forgotten" - κυνικός
 *
 * @module @cynic/persistence/services/ewc-consolidation
 */

'use strict';

import { EventEmitter } from 'events';
import { getPool } from '../postgres/client.js';

/**
 * φ-aligned constants for EWC
 */
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;  // φ⁻¹
const PHI_INV_2 = 0.381966011250105; // φ⁻²
const PHI_INV_3 = 0.236067977499790; // φ⁻³

/**
 * EWC Configuration
 */
const EWC_CONFIG = {
  // Thresholds for consolidation (φ-aligned)
  LOCK_THRESHOLD: PHI_INV,        // 0.618 - Lock patterns above this Fisher score
  UNLOCK_THRESHOLD: PHI_INV_3,    // 0.236 - Unlock patterns below this
  CRITICAL_THRESHOLD: PHI_INV_2,  // 0.382 - Warning threshold

  // Timing
  MIN_LOCK_DURATION_DAYS: 30,     // Minimum days before unlock possible
  CONSOLIDATION_INTERVAL_MS: 24 * 60 * 60 * 1000, // Daily consolidation

  // Limits (Fibonacci)
  MAX_LOCKED_PATTERNS: 377,       // F(14) - Don't lock more than this
  MIN_PATTERNS_FOR_CONSOLIDATION: 13, // F(7) - Need at least this many

  // Learning rates
  FISHER_LEARNING_RATE: PHI_INV * 0.1, // How fast Fisher scores update
  GRADIENT_DECAY: 0.99,           // Gradient magnitude decay per update
};

/**
 * EWC++ Consolidation Service
 *
 * Manages pattern consolidation to prevent catastrophic forgetting.
 */
export class EWCConsolidationService extends EventEmitter {
  /**
   * @param {Object} [options] - Service options
   * @param {Object} [options.db] - Database connection
   * @param {Object} [options.config] - Override default config
   */
  constructor(options = {}) {
    super();

    this.db = options.db || getPool();
    this.config = { ...EWC_CONFIG, ...options.config };

    this.stats = {
      consolidationsRun: 0,
      patternsLocked: 0,
      patternsUnlocked: 0,
      lastConsolidation: null,
      currentGeneration: 0,
    };

    this.consolidationTimer = null;
  }

  /**
   * Start automatic consolidation scheduler
   */
  startScheduler() {
    if (this.consolidationTimer) return;

    this.consolidationTimer = setInterval(
      () => this.consolidate('schedule'),
      this.config.CONSOLIDATION_INTERVAL_MS
    );

    this.emit('scheduler:started');
  }

  /**
   * Stop automatic consolidation scheduler
   */
  stopScheduler() {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = null;
      this.emit('scheduler:stopped');
    }
  }

  /**
   * Run the full RETRIEVE→JUDGE→DISTILL→CONSOLIDATE cycle
   *
   * @param {string} [triggeredBy='manual'] - What triggered consolidation
   * @returns {Promise<Object>} Consolidation results
   */
  async consolidate(triggeredBy = 'manual') {
    this.emit('consolidation:started', { triggeredBy });

    try {
      // Step 1: RETRIEVE - Get all patterns with their usage stats
      const patterns = await this._retrievePatterns();

      if (patterns.length < this.config.MIN_PATTERNS_FOR_CONSOLIDATION) {
        this.emit('consolidation:skipped', {
          reason: 'insufficient_patterns',
          count: patterns.length,
          minimum: this.config.MIN_PATTERNS_FOR_CONSOLIDATION,
        });
        return { skipped: true, reason: 'insufficient_patterns' };
      }

      // Step 2: JUDGE - Calculate Fisher importance for each pattern
      const scored = await this._judgePatterns(patterns);

      // Step 3: DISTILL - Extract quality scores
      const distilled = await this._distillKnowledge(scored);

      // Step 4: CONSOLIDATE - Lock important patterns, unlock forgotten ones
      const result = await this._consolidatePatterns(distilled, triggeredBy);

      // Update stats
      this.stats.consolidationsRun++;
      this.stats.patternsLocked += result.patternsLocked;
      this.stats.patternsUnlocked += result.patternsUnlocked;
      this.stats.lastConsolidation = new Date();
      this.stats.currentGeneration = result.generation || this.stats.currentGeneration + 1;

      this.emit('consolidation:completed', result);

      return result;
    } catch (err) {
      this.emit('consolidation:error', { error: err.message });
      throw err;
    }
  }

  /**
   * Step 1: RETRIEVE - Get patterns with usage statistics
   * @private
   */
  async _retrievePatterns() {
    const { rows } = await this.db.query(`
      SELECT
        pattern_id,
        name,
        category,
        confidence,
        frequency,
        fisher_importance,
        consolidation_locked,
        locked_at,
        distillation_score,
        gradient_magnitude,
        data,
        created_at,
        updated_at
      FROM patterns
      ORDER BY frequency DESC, confidence DESC
    `);

    return rows;
  }

  /**
   * Step 2: JUDGE - Calculate Fisher importance scores
   * @private
   */
  async _judgePatterns(patterns) {
    const scored = [];

    for (const pattern of patterns) {
      // Calculate Fisher importance using the database function
      const { rows } = await this.db.query(
        'SELECT calculate_fisher_importance($1) as fisher',
        [pattern.pattern_id]
      );

      const fisherScore = parseFloat(rows[0]?.fisher) || 0;

      // Update pattern's Fisher score in DB
      await this.db.query(`
        UPDATE patterns
        SET fisher_importance = $2,
            gradient_magnitude = gradient_magnitude * $3
        WHERE pattern_id = $1
      `, [
        pattern.pattern_id,
        fisherScore,
        this.config.GRADIENT_DECAY,
      ]);

      scored.push({
        ...pattern,
        fisher_importance: fisherScore,
      });
    }

    return scored;
  }

  /**
   * Step 3: DISTILL - Calculate knowledge quality scores
   * @private
   */
  async _distillKnowledge(patterns) {
    const distilled = [];

    for (const pattern of patterns) {
      // Distillation score = how well does this pattern generalize?
      // Based on: confidence * frequency_factor * age_factor
      const confidence = parseFloat(pattern.confidence) || 0.5;
      const frequency = parseInt(pattern.frequency) || 0;
      const ageMs = Date.now() - new Date(pattern.created_at).getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);

      // Frequency factor: log-scaled, max at 100 uses
      const frequencyFactor = Math.min(1, Math.log10(frequency + 1) / 2);

      // Age factor: patterns that survived > 7 days are more distilled
      const ageFactor = Math.min(1, ageDays / 7);

      // Distillation = φ-weighted combination
      const distillationScore = Math.min(1,
        confidence * PHI_INV +
        frequencyFactor * PHI_INV_2 +
        ageFactor * PHI_INV_3
      );

      // Update distillation score in DB
      await this.db.query(`
        UPDATE patterns
        SET distillation_score = $2
        WHERE pattern_id = $1
      `, [pattern.pattern_id, distillationScore]);

      distilled.push({
        ...pattern,
        distillation_score: distillationScore,
      });
    }

    return distilled;
  }

  /**
   * Step 4: CONSOLIDATE - Lock/unlock patterns based on Fisher scores
   * @private
   */
  async _consolidatePatterns(patterns, triggeredBy) {
    // Use the database consolidation function
    const { rows } = await this.db.query(`
      SELECT * FROM consolidate_patterns($1, $2, $3)
    `, [
      this.config.LOCK_THRESHOLD,
      this.config.UNLOCK_THRESHOLD,
      triggeredBy,
    ]);

    const result = rows[0] || {};

    return {
      consolidationId: result.consolidation_id,
      patternsLocked: parseInt(result.patterns_locked) || 0,
      patternsUnlocked: parseInt(result.patterns_unlocked) || 0,
      retentionRate: parseFloat(result.retention_rate) || 0,
      triggeredBy,
      timestamp: new Date(),
    };
  }

  /**
   * Get a pattern's EWC status
   *
   * @param {string} patternId - Pattern ID
   * @returns {Promise<Object>} EWC status
   */
  async getPatternStatus(patternId) {
    const { rows } = await this.db.query(`
      SELECT * FROM pattern_ewc_status WHERE pattern_id = $1
    `, [patternId]);

    return rows[0] || null;
  }

  /**
   * Get all locked patterns
   *
   * @returns {Promise<Object[]>} Locked patterns
   */
  async getLockedPatterns() {
    const { rows } = await this.db.query(`
      SELECT * FROM pattern_ewc_status
      WHERE consolidation_locked = TRUE
      ORDER BY fisher_importance DESC
    `);

    return rows;
  }

  /**
   * Get critical patterns (high Fisher but not yet locked)
   *
   * @returns {Promise<Object[]>} Critical patterns
   */
  async getCriticalPatterns() {
    const { rows } = await this.db.query(`
      SELECT * FROM pattern_ewc_status
      WHERE ewc_status = 'CRITICAL'
        AND consolidation_locked = FALSE
      ORDER BY fisher_importance DESC
    `);

    return rows;
  }

  /**
   * Force lock a specific pattern
   *
   * @param {string} patternId - Pattern ID
   * @param {string} [reason='manual'] - Reason for lock
   * @returns {Promise<boolean>} Success
   */
  async lockPattern(patternId, reason = 'manual') {
    const { rowCount } = await this.db.query(`
      UPDATE patterns
      SET consolidation_locked = TRUE,
          locked_at = NOW(),
          consolidation_generation = (
            SELECT COALESCE(MAX(generation), 0) + 1
            FROM ewc_consolidation_history
          )
      WHERE pattern_id = $1
        AND consolidation_locked = FALSE
    `, [patternId]);

    if (rowCount > 0) {
      this.emit('pattern:locked', { patternId, reason });
      return true;
    }

    return false;
  }

  /**
   * Force unlock a specific pattern
   *
   * @param {string} patternId - Pattern ID
   * @param {string} [reason='manual'] - Reason for unlock
   * @returns {Promise<boolean>} Success
   */
  async unlockPattern(patternId, reason = 'manual') {
    const { rowCount } = await this.db.query(`
      UPDATE patterns
      SET consolidation_locked = FALSE,
          locked_at = NULL
      WHERE pattern_id = $1
        AND consolidation_locked = TRUE
    `, [patternId]);

    if (rowCount > 0) {
      this.emit('pattern:unlocked', { patternId, reason });
      return true;
    }

    return false;
  }

  /**
   * Check if a pattern can be modified (respects EWC lock)
   *
   * @param {string} patternId - Pattern ID
   * @returns {Promise<boolean>} True if can modify
   */
  async canModifyPattern(patternId) {
    const { rows } = await this.db.query(
      'SELECT can_modify_pattern($1) as can_modify',
      [patternId]
    );

    return rows[0]?.can_modify ?? true;
  }

  /**
   * Update Fisher score after a pattern is used in judgment
   *
   * @param {string} patternId - Pattern ID
   * @param {number} impact - Impact score (0-1) from judgment
   */
  async recordPatternUsage(patternId, impact = 0.5) {
    // Update gradient magnitude (used in Fisher calculation)
    const gradient = impact * this.config.FISHER_LEARNING_RATE;

    await this.db.query(`
      UPDATE patterns
      SET gradient_magnitude = LEAST(1.0, gradient_magnitude + $2),
          frequency = frequency + 1,
          updated_at = NOW()
      WHERE pattern_id = $1
    `, [patternId, gradient]);
  }

  /**
   * Get consolidation history
   *
   * @param {number} [limit=10] - Max records
   * @returns {Promise<Object[]>} History records
   */
  async getConsolidationHistory(limit = 10) {
    const { rows } = await this.db.query(`
      SELECT *
      FROM ewc_consolidation_history
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return rows;
  }

  /**
   * Get EWC statistics
   *
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total_patterns,
        COUNT(*) FILTER (WHERE consolidation_locked = TRUE) as locked_patterns,
        AVG(fisher_importance) as avg_fisher,
        MAX(fisher_importance) as max_fisher,
        AVG(distillation_score) as avg_distillation,
        COUNT(*) FILTER (WHERE fisher_importance >= 0.618) as critical_count,
        COUNT(*) FILTER (WHERE fisher_importance >= 0.382 AND fisher_importance < 0.618) as important_count,
        COUNT(*) FILTER (WHERE fisher_importance < 0.236) as low_count
      FROM patterns
    `);

    const dbStats = rows[0] || {};

    return {
      ...this.stats,
      totalPatterns: parseInt(dbStats.total_patterns) || 0,
      lockedPatterns: parseInt(dbStats.locked_patterns) || 0,
      avgFisher: parseFloat(dbStats.avg_fisher) || 0,
      maxFisher: parseFloat(dbStats.max_fisher) || 0,
      avgDistillation: parseFloat(dbStats.avg_distillation) || 0,
      criticalCount: parseInt(dbStats.critical_count) || 0,
      importantCount: parseInt(dbStats.important_count) || 0,
      lowCount: parseInt(dbStats.low_count) || 0,
      retentionRate: dbStats.total_patterns > 0
        ? dbStats.locked_patterns / dbStats.total_patterns
        : 0,
    };
  }
}

/**
 * Create EWC service instance
 *
 * @param {Object} [options] - Service options
 * @returns {EWCConsolidationService}
 */
export function createEWCService(options = {}) {
  return new EWCConsolidationService(options);
}

// Named export for config
export { EWC_CONFIG };

export default {
  EWCConsolidationService,
  createEWCService,
  EWC_CONFIG,
};
