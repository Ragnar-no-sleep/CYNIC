/**
 * Session Store - Multi-user Session Management
 *
 * Manages isolated user sessions with φ-derived TTLs.
 * Sessions persist across conversation restarts but expire naturally.
 *
 * @module @cynic/persistence/redis/session-store
 */

'use strict';

import { getRedis, TTL, PREFIX } from './client.js';

/**
 * Session data structure
 */
const createSession = (userId, data = {}) => ({
  userId,
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  judgmentCount: 0,
  digestCount: 0,
  feedbackCount: 0,
  context: {},
  ...data,
});

/**
 * Session Store for multi-user management
 */
export class SessionStore {
  constructor(redis = null) {
    this.redis = redis || getRedis();
  }

  /**
   * Ensure Redis is connected
   */
  async _ensureConnected() {
    if (!this.redis.client) {
      await this.redis.connect();
    }
  }

  /**
   * Create or get existing session
   */
  async getOrCreate(sessionId, userId = 'anonymous') {
    await this._ensureConnected();

    let session = await this.redis.getSession(sessionId);

    if (!session) {
      session = createSession(userId);
      await this.redis.setSession(sessionId, session, TTL.SESSION);
      console.log(`🐕 New session: ${sessionId.slice(0, 8)}...`);
    } else {
      // Touch session to extend TTL
      session.lastActiveAt = new Date().toISOString();
      await this.redis.setSession(sessionId, session, TTL.SESSION);
    }

    return session;
  }

  /**
   * Update session data
   */
  async update(sessionId, updates) {
    await this._ensureConnected();

    const session = await this.redis.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = {
      ...session,
      ...updates,
      lastActiveAt: new Date().toISOString(),
    };

    await this.redis.setSession(sessionId, updated, TTL.SESSION);
    return updated;
  }

  /**
   * Increment session counter
   */
  async increment(sessionId, field) {
    await this._ensureConnected();

    const session = await this.redis.getSession(sessionId);
    if (!session) return null;

    if (typeof session[field] === 'number') {
      session[field]++;
      session.lastActiveAt = new Date().toISOString();
      await this.redis.setSession(sessionId, session, TTL.SESSION);
    }

    return session;
  }

  /**
   * Store context for session
   */
  async setContext(sessionId, key, value) {
    await this._ensureConnected();

    const session = await this.redis.getSession(sessionId);
    if (!session) return null;

    session.context = session.context || {};
    session.context[key] = value;
    session.lastActiveAt = new Date().toISOString();

    await this.redis.setSession(sessionId, session, TTL.SESSION);
    return session;
  }

  /**
   * Get context value
   */
  async getContext(sessionId, key) {
    await this._ensureConnected();

    const session = await this.redis.getSession(sessionId);
    return session?.context?.[key] || null;
  }

  /**
   * Delete session
   */
  async delete(sessionId) {
    await this._ensureConnected();
    return this.redis.deleteSession(sessionId);
  }

  /**
   * Get session stats for a user
   */
  async getUserStats(userId) {
    await this._ensureConnected();

    // Scan for user's sessions
    const pattern = `${PREFIX.SESSION}*`;
    const keys = await this.redis.client.keys(pattern);

    let totalJudgments = 0;
    let totalDigests = 0;
    let totalFeedback = 0;
    let sessionCount = 0;

    for (const key of keys) {
      const session = await this.redis.get(key);
      if (session?.userId === userId) {
        sessionCount++;
        totalJudgments += session.judgmentCount || 0;
        totalDigests += session.digestCount || 0;
        totalFeedback += session.feedbackCount || 0;
      }
    }

    return {
      userId,
      sessionCount,
      totalJudgments,
      totalDigests,
      totalFeedback,
    };
  }
}

export default SessionStore;
