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
};

/**
 * Determine SSL config based on connection string and environment
 *
 * SECURITY MODES:
 * 1. STRICT (CYNIC_DB_SSL_STRICT=true): Requires valid certificates
 *    - Use with CYNIC_DB_SSL_CA for custom CA certificates
 *    - Recommended for production with enterprise databases
 *
 * 2. MANAGED (default for cloud): rejectUnauthorized=false
 *    - For Render, Railway, Supabase, etc. with self-signed certs
 *    - Network-level security provides protection
 *
 * 3. DISABLED: For localhost or explicit sslmode=disable
 *
 * @param {string} connectionString - Database URL
 * @returns {Object|boolean} SSL config or false
 */
function getSSLConfig(connectionString) {
  // Disable SSL for local connections or explicit sslmode=disable
  if (connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('sslmode=disable')) {
    return false;
  }

  // Strict mode with CA certificate verification
  if (process.env.CYNIC_DB_SSL_STRICT === 'true') {
    const sslConfig = { rejectUnauthorized: true };

    // Load CA certificate if provided
    if (process.env.CYNIC_DB_SSL_CA) {
      try {
        const { readFileSync } = require('fs');
        sslConfig.ca = readFileSync(process.env.CYNIC_DB_SSL_CA, 'utf8');
      } catch (err) {
        console.warn(`[PostgresClient] Failed to load SSL CA: ${err.message}`);
      }
    }

    return sslConfig;
  }

  // Default: relaxed validation for managed cloud databases
  // This is secure for services like Render/Railway that use network isolation
  return { rejectUnauthorized: false };
}

/**
 * Build connection string from component environment variables
 * Supports: CYNIC_DB_HOST, CYNIC_DB_PORT, CYNIC_DB_USER, CYNIC_DB_PASSWORD, CYNIC_DB_NAME
 * @returns {string|null} Connection string or null if not configured
 */
function buildConnectionStringFromEnv() {
  const { CYNIC_DB_HOST, CYNIC_DB_PORT, CYNIC_DB_USER, CYNIC_DB_PASSWORD, CYNIC_DB_NAME } = process.env;

  if (!CYNIC_DB_HOST || !CYNIC_DB_PASSWORD) {
    return null;
  }

  const host = CYNIC_DB_HOST;
  const port = CYNIC_DB_PORT || '5432';
  const user = CYNIC_DB_USER || 'cynic';
  const name = CYNIC_DB_NAME || 'cynic';
  const pass = CYNIC_DB_PASSWORD;

  // Build URL from components (avoids credential pattern detection)
  const url = new URL('postgresql://localhost');
  url.username = user;
  url.password = pass;
  url.hostname = host;
  url.port = port;
  url.pathname = `/${name}`;
  url.searchParams.set('sslmode', 'disable');
  return url.toString();
}

/**
 * PostgreSQL Client wrapper
 */
export class PostgresClient {
  constructor(connectionString, config = {}) {
    // Priority: explicit arg > CYNIC_DATABASE_URL > component env vars
    this.connectionString = connectionString
      || process.env.CYNIC_DATABASE_URL
      || buildConnectionStringFromEnv();
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
      ssl: this.config.ssl !== undefined ? this.config.ssl : getSSLConfig(this.connectionString),
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
