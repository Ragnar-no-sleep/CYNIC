/**
 * Q-Learning Queries
 *
 * Queries for Q-Table visualization and learning metrics.
 * "Le chien apprend de chaque décision"
 *
 * @module @cynic/observatory/queries/qlearning
 */

'use strict';

import { PHI_INV } from '@cynic/core';

/**
 * Q-Learning observatory queries
 */
export class QLearningQueries {
  /**
   * @param {Object} pool - PostgreSQL pool from @cynic/persistence
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Get Q-Table summary stats
   * @returns {Promise<Object>} Q-Table statistics
   */
  async getQTableStats() {
    const result = await this.pool.query(`
      SELECT
        service_id,
        jsonb_array_length(q_table->'entries') as entry_count,
        exploration_rate,
        (stats->>'episodes')::int as total_episodes,
        (stats->>'totalReward')::float as total_reward,
        version,
        updated_at
      FROM qlearning_state
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    return {
      services: result.rows,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get episode history with rewards
   * @param {Object} options - Query options
   * @param {number} [options.limit=100] - Max episodes
   * @param {string} [options.serviceId] - Filter by service
   * @returns {Promise<Object>} Episode history
   */
  async getEpisodeHistory({ limit = 100, serviceId } = {}) {
    const params = [limit];
    let whereClause = '';

    if (serviceId) {
      whereClause = 'WHERE service_id = $2';
      params.push(serviceId);
    }

    const result = await this.pool.query(`
      SELECT
        episode_id,
        service_id,
        features,
        task_type,
        tool,
        reward,
        duration_ms,
        created_at
      FROM qlearning_episodes
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1
    `, params);

    return {
      episodes: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get learning curve (reward over time)
   * Shows if the system is actually learning
   * @param {Object} options - Query options
   * @param {string} [options.interval='hour'] - Time bucket (hour, day, week)
   * @param {number} [options.limit=168] - Max data points
   * @returns {Promise<Object>} Learning curve data
   */
  async getLearningCurve({ interval = 'hour', limit = 168 } = {}) {
    const validIntervals = ['hour', 'day', 'week'];
    const safeInterval = validIntervals.includes(interval) ? interval : 'hour';

    const result = await this.pool.query(`
      SELECT
        date_trunc($1, created_at) as time_bucket,
        count(*) as episode_count,
        avg(reward) as avg_reward,
        min(reward) as min_reward,
        max(reward) as max_reward,
        stddev(reward) as reward_stddev,
        avg(duration_ms) as avg_duration_ms
      FROM qlearning_episodes
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT $2
    `, [safeInterval, limit]);

    // Calculate trend (is avg_reward increasing?)
    const data = result.rows.reverse(); // Chronological order
    let trend = 'stable';
    if (data.length >= 2) {
      const firstHalf = data.slice(0, Math.floor(data.length / 2));
      const secondHalf = data.slice(Math.floor(data.length / 2));
      const avgFirst = firstHalf.reduce((s, r) => s + parseFloat(r.avg_reward || 0), 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, r) => s + parseFloat(r.avg_reward || 0), 0) / secondHalf.length;

      if (avgSecond > avgFirst * 1.05) trend = 'improving';
      else if (avgSecond < avgFirst * 0.95) trend = 'degrading';
    }

    return {
      curve: data,
      trend,
      interpretation: trend === 'improving'
        ? '*tail wag* Learning is working - rewards increasing'
        : trend === 'degrading'
        ? '*GROWL* Learning may be broken - rewards decreasing'
        : '*sniff* Stable learning - rewards consistent',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get Q-values heatmap data (features x actions)
   * @param {string} [serviceId] - Service to query
   * @returns {Promise<Object>} Heatmap data
   */
  async getQValuesHeatmap(serviceId) {
    const result = await this.pool.query(`
      SELECT q_table
      FROM qlearning_state
      WHERE service_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [serviceId || 'default']);

    if (!result.rows[0]) {
      return { heatmap: [], message: 'No Q-Table found' };
    }

    const qTable = result.rows[0].q_table;
    const entries = qTable.entries || [];

    // Transform to heatmap format
    const heatmap = entries.slice(0, 50).map(entry => ({
      features: entry.features,
      actions: Object.entries(entry.values || {}).map(([action, value]) => ({
        action,
        qValue: value,
        visits: entry.visits?.[action] || 0,
        confidence: Math.min(value / PHI_INV, 1),
      })),
    }));

    return {
      heatmap,
      entryCount: entries.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get top performing actions
   * @param {number} [limit=10] - Max actions
   * @returns {Promise<Object>} Top actions
   */
  async getTopActions(limit = 10) {
    const result = await this.pool.query(`
      SELECT
        tool as action,
        count(*) as usage_count,
        avg(reward) as avg_reward,
        sum(CASE WHEN reward > 0 THEN 1 ELSE 0 END)::float / count(*) as success_rate
      FROM qlearning_episodes
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY tool
      HAVING count(*) >= 5
      ORDER BY avg_reward DESC
      LIMIT $1
    `, [limit]);

    return {
      actions: result.rows,
      timestamp: new Date().toISOString(),
    };
  }
}
