/**
 * Feedback Repository
 *
 * Learning from user corrections.
 * Feedback burns CYNIC's ego - every correction makes it smarter.
 *
 * @module @cynic/persistence/repositories/feedback
 */

'use strict';

import { getPool } from '../client.js';

export class FeedbackRepository {
  constructor(db = null) {
    this.db = db || getPool();
  }

  /**
   * Create feedback for a judgment
   */
  async create(feedback) {
    const { rows } = await this.db.query(`
      INSERT INTO feedback (judgment_id, user_id, outcome, actual_score, reason)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      feedback.judgmentId,
      feedback.userId || null,
      feedback.outcome,
      feedback.actualScore || null,
      feedback.reason || null,
    ]);
    return rows[0];
  }

  /**
   * Find feedback by judgment ID
   */
  async findByJudgment(judgmentId) {
    const { rows } = await this.db.query(
      'SELECT * FROM feedback WHERE judgment_id = $1 ORDER BY created_at DESC',
      [judgmentId]
    );
    return rows;
  }

  /**
   * Get unapplied feedback
   */
  async findUnapplied(limit = 100) {
    const { rows } = await this.db.query(`
      SELECT f.*, j.q_score, j.verdict, j.item_type
      FROM feedback f
      JOIN judgments j ON f.judgment_id = j.judgment_id
      WHERE f.applied = FALSE
      ORDER BY f.created_at ASC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Mark feedback as applied
   */
  async markApplied(feedbackId) {
    const { rows } = await this.db.query(`
      UPDATE feedback SET
        applied = TRUE,
        applied_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [feedbackId]);
    return rows[0];
  }

  /**
   * Get feedback statistics
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'correct') as correct,
        COUNT(*) FILTER (WHERE outcome = 'incorrect') as incorrect,
        COUNT(*) FILTER (WHERE outcome = 'partial') as partial,
        COUNT(*) FILTER (WHERE applied = TRUE) as applied,
        AVG(ABS(actual_score - (
          SELECT q_score FROM judgments WHERE judgment_id = feedback.judgment_id
        ))) FILTER (WHERE actual_score IS NOT NULL) as avg_score_diff
      FROM feedback
    `);

    const stats = rows[0];
    const total = parseInt(stats.total);
    const correct = parseInt(stats.correct);

    return {
      total,
      correct,
      incorrect: parseInt(stats.incorrect),
      partial: parseInt(stats.partial),
      applied: parseInt(stats.applied),
      accuracy: total > 0 ? (correct / total) : 0,
      avgScoreDiff: parseFloat(stats.avg_score_diff) || 0,
    };
  }

  /**
   * Get learning insights from feedback
   */
  async getLearningInsights() {
    const { rows } = await this.db.query(`
      SELECT
        j.item_type,
        COUNT(*) as feedback_count,
        COUNT(*) FILTER (WHERE f.outcome = 'incorrect') as incorrect_count,
        AVG(j.q_score) as avg_original_score,
        AVG(f.actual_score) FILTER (WHERE f.actual_score IS NOT NULL) as avg_actual_score
      FROM feedback f
      JOIN judgments j ON f.judgment_id = j.judgment_id
      GROUP BY j.item_type
      HAVING COUNT(*) >= 3
      ORDER BY incorrect_count DESC
    `);
    return rows;
  }
}

export default FeedbackRepository;
