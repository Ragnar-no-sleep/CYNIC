/**
 * MCP Persistence Integration
 *
 * Initializes and manages PostgreSQL + Redis connections
 * for the MCP server.
 *
 * @module @cynic/mcp/persistence
 */

'use strict';

import {
  PostgresClient,
  RedisClient,
  JudgmentRepository,
  PatternRepository,
  FeedbackRepository,
  KnowledgeRepository,
  SessionStore,
} from '@cynic/persistence';

/**
 * Persistence manager for MCP server
 */
export class PersistenceManager {
  constructor() {
    this.postgres = null;
    this.redis = null;
    this.sessionStore = null;

    // Repositories
    this.judgments = null;
    this.patterns = null;
    this.feedback = null;
    this.knowledge = null;

    this._initialized = false;
  }

  /**
   * Initialize all persistence connections
   * @returns {Promise<PersistenceManager>}
   */
  async initialize() {
    if (this._initialized) return this;

    const hasPostgres = !!process.env.CYNIC_DATABASE_URL;
    const hasRedis = !!process.env.CYNIC_REDIS_URL;

    // Initialize PostgreSQL
    if (hasPostgres) {
      try {
        this.postgres = new PostgresClient();
        await this.postgres.connect();

        // Initialize repositories
        this.judgments = new JudgmentRepository(this.postgres);
        this.patterns = new PatternRepository(this.postgres);
        this.feedback = new FeedbackRepository(this.postgres);
        this.knowledge = new KnowledgeRepository(this.postgres);

        console.error('   PostgreSQL: connected');
      } catch (err) {
        console.error(`   PostgreSQL: ${err.message}`);
      }
    } else {
      console.error('   PostgreSQL: not configured (CYNIC_DATABASE_URL not set)');
    }

    // Initialize Redis
    if (hasRedis) {
      try {
        this.redis = new RedisClient();
        await this.redis.connect();

        // Initialize session store
        this.sessionStore = new SessionStore(this.redis);

        console.error('   Redis: connected');
      } catch (err) {
        console.error(`   Redis: ${err.message}`);
      }
    } else {
      console.error('   Redis: not configured (CYNIC_REDIS_URL not set)');
    }

    this._initialized = true;
    return this;
  }

  /**
   * Store a judgment
   */
  async storeJudgment(judgment) {
    if (!this.judgments) return null;
    try {
      return await this.judgments.create(judgment);
    } catch (err) {
      console.error('Error storing judgment:', err.message);
      return null;
    }
  }

  /**
   * Search judgments
   */
  async searchJudgments(query, options = {}) {
    if (!this.judgments) return [];
    try {
      return await this.judgments.search(query, options);
    } catch (err) {
      console.error('Error searching judgments:', err.message);
      return [];
    }
  }

  /**
   * Get recent judgments
   */
  async getRecentJudgments(limit = 10) {
    if (!this.judgments) return [];
    try {
      return await this.judgments.findRecent(limit);
    } catch (err) {
      console.error('Error getting recent judgments:', err.message);
      return [];
    }
  }

  /**
   * Get judgment statistics
   */
  async getJudgmentStats(options = {}) {
    if (!this.judgments) {
      return { total: 0, avgScore: 0, avgConfidence: 0, verdicts: {} };
    }
    try {
      return await this.judgments.getStats(options);
    } catch (err) {
      console.error('Error getting judgment stats:', err.message);
      return { total: 0, avgScore: 0, avgConfidence: 0, verdicts: {} };
    }
  }

  /**
   * Store feedback
   */
  async storeFeedback(feedback) {
    if (!this.feedback) return null;
    try {
      return await this.feedback.create(feedback);
    } catch (err) {
      console.error('Error storing feedback:', err.message);
      return null;
    }
  }

  /**
   * Store knowledge
   */
  async storeKnowledge(knowledge) {
    if (!this.knowledge) return null;
    try {
      return await this.knowledge.create(knowledge);
    } catch (err) {
      console.error('Error storing knowledge:', err.message);
      return null;
    }
  }

  /**
   * Search knowledge
   */
  async searchKnowledge(query, options = {}) {
    if (!this.knowledge) return [];
    try {
      return await this.knowledge.search(query, options);
    } catch (err) {
      console.error('Error searching knowledge:', err.message);
      return [];
    }
  }

  /**
   * Upsert pattern
   */
  async upsertPattern(pattern) {
    if (!this.patterns) return null;
    try {
      return await this.patterns.upsert(pattern);
    } catch (err) {
      console.error('Error upserting pattern:', err.message);
      return null;
    }
  }

  /**
   * Get patterns
   */
  async getPatterns(options = {}) {
    if (!this.patterns) return [];
    const { category, limit = 10 } = options;
    try {
      if (category) {
        return await this.patterns.findByCategory(category, limit);
      }
      return await this.patterns.getTopPatterns(limit);
    } catch (err) {
      console.error('Error getting patterns:', err.message);
      return [];
    }
  }

  /**
   * Get health status
   */
  async health() {
    const status = {
      postgres: { status: 'not_configured' },
      redis: { status: 'not_configured' },
    };

    if (this.postgres) {
      try {
        const health = await this.postgres.health();
        status.postgres = health;
      } catch (err) {
        status.postgres = { status: 'unhealthy', error: err.message };
      }
    }

    if (this.redis) {
      try {
        const health = await this.redis.health();
        status.redis = health;
      } catch (err) {
        status.redis = { status: 'unhealthy', error: err.message };
      }
    }

    return status;
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.postgres) {
      try {
        await this.postgres.close();
      } catch (err) {
        console.error('Error closing PostgreSQL:', err.message);
      }
    }

    if (this.redis) {
      try {
        await this.redis.close();
      } catch (err) {
        console.error('Error closing Redis:', err.message);
      }
    }

    this._initialized = false;
  }

  /**
   * Check if persistence is available
   */
  get isAvailable() {
    return this._initialized && (this.postgres || this.redis);
  }

  /**
   * Check if specific features are available
   */
  get capabilities() {
    return {
      judgments: !!this.judgments,
      patterns: !!this.patterns,
      feedback: !!this.feedback,
      knowledge: !!this.knowledge,
      sessions: !!this.sessionStore,
      cache: !!this.redis,
    };
  }
}

export default PersistenceManager;
