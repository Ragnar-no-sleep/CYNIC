/**
 * PostgreSQL Client - Connection Pool Manager
 *
 * Uses pg with connection pooling for efficient database access.
 * φ-derived pool sizing: max connections = Fib(8) = 21
 *
 * @module @cynic/persistence/postgres
 */

'use strict';

import pg from 'pg';
const { Pool } = pg;

// Singleton pool instance
let pool = null;

/**
 * Default pool configuration (φ-derived)
 */
const DEFAULT_CONFIG = {
  max: 21,                    // Fib(8) - max connections
  idleTimeoutMillis: 61800,   // φ⁻¹ × 100000 - idle timeout
  connectionTimeoutMillis: 3820, // φ⁻² × 10000 - connection timeout
  allowExitOnIdle: true,
  ssl: {
    rejectUnauthorized: false,  // Render uses self-signed certs
  },
};

/**
 * PostgreSQL Client wrapper
 */
export class PostgresClient {
  constructor(connectionString, config = {}) {
    this.connectionString = connectionString || process.env.CYNIC_DATABASE_URL;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pool = null;
  }

  /**
   * Initialize connection pool
   */
  async connect() {
    if (this.pool) return this;

    if (!this.connectionString) {
      throw new Error('CYNIC_DATABASE_URL not set');
    }

    this.pool = new Pool({
      connectionString: this.connectionString,
      ...this.config,
    });

    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('🐕 PostgreSQL connected');
    } finally {
      client.release();
    }

    return this;
  }

  /**
   * Execute a query
   */
  async query(text, params = []) {
    if (!this.pool) {
      await this.connect();
    }
    return this.pool.query(text, params);
  }

  /**
   * Get a client from the pool (for transactions)
   */
  async getClient() {
    if (!this.pool) {
      await this.connect();
    }
    return this.pool.connect();
  }

  /**
   * Execute within a transaction
   */
  async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('🐕 PostgreSQL disconnected');
    }
  }

  /**
   * Health check
   */
  async health() {
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
        pool: {
          total: this.pool?.totalCount || 0,
          idle: this.pool?.idleCount || 0,
          waiting: this.pool?.waitingCount || 0,
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}

/**
 * Get shared pool instance (singleton)
 */
export function getPool(connectionString) {
  if (!pool) {
    pool = new PostgresClient(connectionString);
  }
  return pool;
}

export default PostgresClient;
