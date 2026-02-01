/**
 * X/Twitter Data Repository
 *
 * Storage for captured X/Twitter data from local proxy.
 * Supports users, tweets, feeds, trends, and sync status.
 *
 * "CYNIC sees what you see" - κυνικός
 *
 * @module @cynic/persistence/repositories/x-data
 */

'use strict';

import crypto from 'crypto';
import { getPool } from '../client.js';
import { BaseRepository } from '../../interfaces/IRepository.js';

// φ constants for hybrid search
const PHI_FTS = 0.382;
const PHI_VECTOR = 0.618;

/**
 * Generate feed ID
 */
function generateFeedId() {
  return crypto.randomUUID();
}

/**
 * X/Twitter Data Repository
 *
 * @extends BaseRepository
 */
export class XDataRepository extends BaseRepository {
  constructor(db = null) {
    super(db || getPool());
  }

  /**
   * Supports full-text search
   */
  supportsFTS() {
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upsert X user (insert or update)
   * @param {Object} user - User data
   * @returns {Promise<Object>} Created/updated user
   */
  async upsertUser(user) {
    const { rows } = await this.db.query(`
      INSERT INTO x_users (
        x_user_id, username, display_name, bio, location, website,
        profile_image_url, banner_url, followers_count, following_count,
        tweet_count, verified, created_on_x, is_monitored, monitor_priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (x_user_id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio,
        location = EXCLUDED.location,
        website = EXCLUDED.website,
        profile_image_url = EXCLUDED.profile_image_url,
        banner_url = EXCLUDED.banner_url,
        followers_count = EXCLUDED.followers_count,
        following_count = EXCLUDED.following_count,
        tweet_count = EXCLUDED.tweet_count,
        verified = EXCLUDED.verified,
        last_seen_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [
      user.xUserId,
      user.username,
      user.displayName || null,
      user.bio || null,
      user.location || null,
      user.website || null,
      user.profileImageUrl || null,
      user.bannerUrl || null,
      user.followersCount || 0,
      user.followingCount || 0,
      user.tweetCount || 0,
      user.verified || false,
      user.createdOnX || null,
      user.isMonitored || false,
      user.monitorPriority || 50,
    ]);
    return rows[0];
  }

  /**
   * Find user by username
   * @param {string} username - Twitter username (without @)
   * @returns {Promise<Object|null>}
   */
  async findUserByUsername(username) {
    const { rows } = await this.db.query(
      'SELECT * FROM x_users WHERE username = $1',
      [username]
    );
    return rows[0] || null;
  }

  /**
   * Find user by X user ID
   * @param {string} xUserId - Twitter user ID
   * @returns {Promise<Object|null>}
   */
  async findUserById(xUserId) {
    const { rows } = await this.db.query(
      'SELECT * FROM x_users WHERE x_user_id = $1',
      [xUserId]
    );
    return rows[0] || null;
  }

  /**
   * Get monitored users
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async getMonitoredUsers(options = {}) {
    const { limit = 100 } = options;

    const { rows } = await this.db.query(`
      SELECT * FROM x_users
      WHERE is_monitored = TRUE
      ORDER BY monitor_priority DESC, last_seen_at DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Set user monitoring status
   * @param {string} xUserId - X user ID
   * @param {boolean} isMonitored - Monitoring status
   * @param {number} [priority=50] - Monitor priority
   */
  async setUserMonitoring(xUserId, isMonitored, priority = 50) {
    const { rows } = await this.db.query(`
      UPDATE x_users
      SET is_monitored = $2, monitor_priority = $3, updated_at = NOW()
      WHERE x_user_id = $1
      RETURNING *
    `, [xUserId, isMonitored, priority]);
    return rows[0] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TWEETS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create tweet (insert only, no upsert for immutability)
   * @param {Object} tweet - Tweet data
   * @returns {Promise<Object>} Created tweet
   */
  async createTweet(tweet) {
    const { rows } = await this.db.query(`
      INSERT INTO x_tweets (
        tweet_id, x_user_id, text, text_html, language, tweet_type,
        reply_to_tweet_id, reply_to_user_id, quote_tweet_id, thread_id,
        media, urls, hashtags, mentions,
        likes_count, retweets_count, replies_count, quotes_count,
        views_count, bookmarks_count, posted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT (tweet_id) DO UPDATE SET
        likes_count = EXCLUDED.likes_count,
        retweets_count = EXCLUDED.retweets_count,
        replies_count = EXCLUDED.replies_count,
        quotes_count = EXCLUDED.quotes_count,
        views_count = EXCLUDED.views_count,
        bookmarks_count = EXCLUDED.bookmarks_count
      RETURNING *
    `, [
      tweet.tweetId,
      tweet.xUserId,
      tweet.text,
      tweet.textHtml || null,
      tweet.language || null,
      tweet.tweetType || 'tweet',
      tweet.replyToTweetId || null,
      tweet.replyToUserId || null,
      tweet.quoteTweetId || null,
      tweet.threadId || null,
      JSON.stringify(tweet.media || []),
      JSON.stringify(tweet.urls || []),
      tweet.hashtags || [],
      tweet.mentions || [],
      tweet.likesCount || 0,
      tweet.retweetsCount || 0,
      tweet.repliesCount || 0,
      tweet.quotesCount || 0,
      tweet.viewsCount || 0,
      tweet.bookmarksCount || 0,
      tweet.postedAt,
    ]);
    return rows[0];
  }

  /**
   * Find tweet by ID
   * @param {string} tweetId - Tweet ID
   * @returns {Promise<Object|null>}
   */
  async findTweetById(tweetId) {
    const { rows } = await this.db.query(`
      SELECT t.*, u.username, u.display_name, u.profile_image_url
      FROM x_tweets t
      JOIN x_users u ON t.x_user_id = u.x_user_id
      WHERE t.tweet_id = $1 AND t.deleted = FALSE
    `, [tweetId]);
    return rows[0] || null;
  }

  /**
   * Search tweets with φ-weighted hybrid search (FTS + vector)
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object[]>}
   */
  async searchTweets(query, options = {}) {
    const {
      username = null,
      minEngagement = 0,
      sentiment = null,
      since = null,
      until = null,
      queryEmbedding = null,
      limit = 20,
    } = options;

    // Use the database function for hybrid search
    const { rows } = await this.db.query(`
      SELECT * FROM search_x_tweets_hybrid($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      query,
      queryEmbedding,
      username,
      minEngagement,
      sentiment,
      since,
      until,
      limit,
    ]);
    return rows;
  }

  /**
   * Get recent tweets
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async getRecentTweets(options = {}) {
    const { limit = 50, offset = 0 } = options;

    const { rows } = await this.db.query(`
      SELECT t.*, u.username, u.display_name, u.profile_image_url
      FROM x_tweets t
      JOIN x_users u ON t.x_user_id = u.x_user_id
      WHERE t.deleted = FALSE
      ORDER BY t.posted_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return rows;
  }

  /**
   * Get tweets by user
   * @param {string} xUserId - X user ID
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async getTweetsByUser(xUserId, options = {}) {
    const { limit = 50, offset = 0, includeReplies = true } = options;

    let sql = `
      SELECT t.*, u.username, u.display_name, u.profile_image_url
      FROM x_tweets t
      JOIN x_users u ON t.x_user_id = u.x_user_id
      WHERE t.x_user_id = $1 AND t.deleted = FALSE
    `;

    if (!includeReplies) {
      sql += ` AND t.tweet_type != 'reply'`;
    }

    sql += ` ORDER BY t.posted_at DESC LIMIT $2 OFFSET $3`;

    const { rows } = await this.db.query(sql, [xUserId, limit, offset]);
    return rows;
  }

  /**
   * Get tweet thread (conversation)
   * @param {string} tweetId - Tweet ID
   * @returns {Promise<Object[]>}
   */
  async getTweetThread(tweetId) {
    const { rows } = await this.db.query(
      'SELECT * FROM get_tweet_thread($1)',
      [tweetId]
    );
    return rows;
  }

  /**
   * Update tweet analysis (sentiment, relevance, topics)
   * @param {string} tweetId - Tweet ID
   * @param {Object} analysis - Analysis data
   * @returns {Promise<Object|null>}
   */
  async updateTweetAnalysis(tweetId, analysis) {
    const { rows } = await this.db.query(`
      UPDATE x_tweets
      SET
        sentiment = $2,
        sentiment_score = $3,
        relevance_score = LEAST($4, 0.618),  -- Max: φ⁻¹
        topics = $5,
        q_score = $6,
        embedding = $7,
        analyzed_at = NOW()
      WHERE tweet_id = $1
      RETURNING *
    `, [
      tweetId,
      analysis.sentiment || null,
      analysis.sentimentScore || null,
      analysis.relevanceScore || null,
      analysis.topics || [],
      analysis.qScore || null,
      analysis.embedding || null,
    ]);
    return rows[0] || null;
  }

  /**
   * Mark tweet as deleted (soft delete)
   * @param {string} tweetId - Tweet ID
   */
  async markTweetDeleted(tweetId) {
    const { rows } = await this.db.query(`
      UPDATE x_tweets
      SET deleted = TRUE, deleted_at = NOW()
      WHERE tweet_id = $1
      RETURNING *
    `, [tweetId]);
    return rows[0] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a feed
   * @param {Object} feed - Feed data
   * @returns {Promise<Object>}
   */
  async createFeed(feed) {
    const feedId = generateFeedId();

    const { rows } = await this.db.query(`
      INSERT INTO x_feeds (
        id, user_id, name, description, feed_type,
        filters, is_active, auto_refresh, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      feedId,
      feed.userId,
      feed.name,
      feed.description || null,
      feed.feedType || 'custom',
      JSON.stringify(feed.filters || {}),
      feed.isActive !== false,
      feed.autoRefresh !== false,
      feed.priority || 50,
    ]);
    return rows[0];
  }

  /**
   * Get feed by ID
   * @param {string} feedId - Feed ID
   * @returns {Promise<Object|null>}
   */
  async getFeedById(feedId) {
    const { rows } = await this.db.query(
      'SELECT * FROM x_feeds WHERE id = $1',
      [feedId]
    );
    return rows[0] || null;
  }

  /**
   * Get feeds for a user
   * @param {string} userId - CYNIC user ID
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async getFeedsByUser(userId, options = {}) {
    const { activeOnly = false, limit = 100 } = options;

    let sql = 'SELECT * FROM x_feeds WHERE user_id = $1';
    if (activeOnly) {
      sql += ' AND is_active = TRUE';
    }
    sql += ' ORDER BY priority DESC, created_at DESC LIMIT $2';

    const { rows } = await this.db.query(sql, [userId, limit]);
    return rows;
  }

  /**
   * Get tweets for a feed
   * @param {string} feedId - Feed ID
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async getFeedTweets(feedId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const { rows } = await this.db.query(
      'SELECT * FROM get_feed_tweets($1, $2, $3)',
      [feedId, limit, offset]
    );
    return rows;
  }

  /**
   * Add tweet to feed
   * @param {string} feedId - Feed ID
   * @param {string} tweetId - Tweet ID
   * @param {string} [matchReason='manual'] - Why the tweet was added
   */
  async addTweetToFeed(feedId, tweetId, matchReason = 'manual') {
    await this.db.query(`
      INSERT INTO x_feed_tweets (feed_id, tweet_id, match_reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (feed_id, tweet_id) DO NOTHING
    `, [feedId, tweetId, matchReason]);

    // Update feed stats
    await this.db.query(`
      UPDATE x_feeds
      SET tweet_count = tweet_count + 1, last_tweet_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [feedId]);
  }

  /**
   * Update feed
   * @param {string} feedId - Feed ID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>}
   */
  async updateFeed(feedId, data) {
    const updates = [];
    const params = [feedId];
    let paramIndex = 2;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.filters !== undefined) {
      updates.push(`filters = $${paramIndex++}`);
      params.push(JSON.stringify(data.filters));
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(data.priority);
    }

    if (updates.length === 0) {
      return this.getFeedById(feedId);
    }

    const { rows } = await this.db.query(`
      UPDATE x_feeds
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, params);

    return rows[0] || null;
  }

  /**
   * Delete feed
   * @param {string} feedId - Feed ID
   * @returns {Promise<boolean>}
   */
  async deleteFeed(feedId) {
    const { rowCount } = await this.db.query(
      'DELETE FROM x_feeds WHERE id = $1',
      [feedId]
    );
    return rowCount > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRENDS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upsert trend
   * @param {Object} trend - Trend data
   * @returns {Promise<Object>}
   */
  async upsertTrend(trend) {
    const { rows } = await this.db.query(`
      INSERT INTO x_trends (
        trend_name, trend_type, location, woeid,
        tweet_volume, rank, sentiment, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (trend_name, observed_at) DO NOTHING
      RETURNING *
    `, [
      trend.trendName,
      trend.trendType || 'hashtag',
      trend.location || null,
      trend.woeid || null,
      trend.tweetVolume || null,
      trend.rank || null,
      trend.sentiment || null,
      trend.category || null,
    ]);
    return rows[0];
  }

  /**
   * Get trending topics
   * @param {Object} options - Query options
   * @returns {Promise<Object[]>}
   */
  async getTrendingTopics(options = {}) {
    const { limit = 20, location = null, since = null } = options;

    let sql = `
      SELECT DISTINCT ON (trend_name)
        trend_name, trend_type, location, tweet_volume, rank, sentiment, category, observed_at
      FROM x_trends
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (location) {
      sql += ` AND location = $${paramIndex++}`;
      params.push(location);
    }

    if (since) {
      sql += ` AND observed_at >= $${paramIndex++}`;
      params.push(since);
    } else {
      sql += ` AND observed_at >= NOW() - INTERVAL '24 hours'`;
    }

    sql += ` ORDER BY trend_name, observed_at DESC`;

    // Wrap to get most recent per trend and order by rank
    sql = `
      SELECT * FROM (${sql}) t
      ORDER BY rank ASC NULLS LAST, tweet_volume DESC NULLS LAST
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const { rows } = await this.db.query(sql, params);
    return rows;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get sync status for a type/target
   * @param {string} syncType - Sync type (timeline, user_tweets, etc.)
   * @param {string} [syncTarget] - Sync target (user ID, search query, etc.)
   * @returns {Promise<Object|null>}
   */
  async getSyncStatus(syncType, syncTarget = null) {
    const { rows } = await this.db.query(`
      SELECT * FROM x_sync_status
      WHERE sync_type = $1 AND ($2::varchar IS NULL OR sync_target = $2)
    `, [syncType, syncTarget]);
    return rows[0] || null;
  }

  /**
   * Update sync status
   * @param {string} syncType - Sync type
   * @param {string|null} syncTarget - Sync target
   * @param {Object} status - Status update
   * @returns {Promise<Object>}
   */
  async updateSyncStatus(syncType, syncTarget, status) {
    const { rows } = await this.db.query(`
      INSERT INTO x_sync_status (
        sync_type, sync_target, last_sync_at, last_tweet_id,
        tweets_captured, errors_count, last_error, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (sync_type, sync_target) DO UPDATE SET
        last_sync_at = COALESCE(EXCLUDED.last_sync_at, x_sync_status.last_sync_at),
        last_tweet_id = COALESCE(EXCLUDED.last_tweet_id, x_sync_status.last_tweet_id),
        tweets_captured = x_sync_status.tweets_captured + COALESCE(EXCLUDED.tweets_captured, 0),
        errors_count = CASE
          WHEN EXCLUDED.last_error IS NOT NULL THEN x_sync_status.errors_count + 1
          ELSE x_sync_status.errors_count
        END,
        last_error = COALESCE(EXCLUDED.last_error, x_sync_status.last_error),
        status = COALESCE(EXCLUDED.status, x_sync_status.status),
        updated_at = NOW()
      RETURNING *
    `, [
      syncType,
      syncTarget,
      status.lastSyncAt || new Date(),
      status.lastTweetId || null,
      status.tweetsCaptured || 0,
      0, // errors_count handled in DO UPDATE
      status.lastError || null,
      status.status || 'active',
    ]);
    return rows[0];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get X data statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const { rows } = await this.db.query('SELECT * FROM get_x_stats()');
    const stats = rows[0] || {};

    return {
      totalUsers: parseInt(stats.total_users) || 0,
      monitoredUsers: parseInt(stats.monitored_users) || 0,
      totalTweets: parseInt(stats.total_tweets) || 0,
      analyzedTweets: parseInt(stats.analyzed_tweets) || 0,
      totalFeeds: parseInt(stats.total_feeds) || 0,
      activeFeeds: parseInt(stats.active_feeds) || 0,
      tweetsToday: parseInt(stats.tweets_today) || 0,
      tweetsWeek: parseInt(stats.tweets_week) || 0,
      trendingCount: parseInt(stats.trending_count) || 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BaseRepository Interface Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find by ID (tweets)
   */
  async findById(id) {
    return this.findTweetById(id);
  }

  /**
   * List tweets with pagination
   */
  async list(options = {}) {
    return this.getRecentTweets(options);
  }

  /**
   * Search (alias for searchTweets)
   */
  async search(query, options = {}) {
    return this.searchTweets(query, options);
  }

  /**
   * Create (alias for createTweet)
   */
  async create(data) {
    return this.createTweet(data);
  }

  /**
   * Update (for tweets, only analysis can be updated)
   */
  async update(id, data) {
    return this.updateTweetAnalysis(id, data);
  }

  /**
   * Delete (soft delete for tweets)
   */
  async delete(id) {
    const result = await this.markTweetDeleted(id);
    return !!result;
  }
}

export default XDataRepository;
