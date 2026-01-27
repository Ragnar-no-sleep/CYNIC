/**
 * PostgreSQL Client - Connection Pool Manager
 *
 * Uses pg with connection pooling for efficient database access.
 * φ-derived pool sizing: max connections = Fib(8) = 21
 *
 * @module @cynic/persistence/postgres
 */

'use strict';

import { readFileSync } from 'fs';
import pg from 'pg';
import { createLogger } from '@cynic/core';

const { Pool } = pg;
const log = createLogger('PostgresClient');

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
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Failing, reject requests
  HALF_OPEN: 'HALF_OPEN', // Testing if recovered
};

/**
 * Circuit breaker configuration (φ-derived)
 */
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,           // Open after 5 consecutive failures
  resetTimeoutMs: 61800,         // φ⁻¹ × 100000 - time before trying again
  halfOpenMaxRequests: 1,        // Allow 1 test request in half-open
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
        sslConfig.ca = readFileSync(process.env.CYNIC_DB_SSL_CA, 'utf8');
      } catch (err) {
        log.warn('Failed to load SSL CA', { error: err.message });
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

  // Build connection string from parts (credentials from env vars)
  const parts = [
    'postgres',    // protocol
    '://',
    encodeURIComponent(user),
    ':',
    encodeURIComponent(pass),
    '@',
    host,
    ':',
    port,
    '/',
    encodeURIComponent(name),
    '?sslmode=disable',
  ];
  return parts.join('');
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

    // Circuit breaker state
    this._circuitState = CircuitState.CLOSED;
    this._failureCount = 0;
    this._lastFailureTime = 0;
    this._circuitConfig = { ...CIRCUIT_BREAKER_CONFIG, ...config.circuitBreaker };
  }

  /**
   * Get current circuit breaker state
   */
  getCircuitState() {
    return {
      state: this._circuitState,
      failureCount: this._failureCount,
      lastFailureTime: this._lastFailureTime,
    };
  }

  /**
   * Check if circuit allows request
   * @private
   */
  _canExecute() {
    if (this._circuitState === CircuitState.CLOSED) {
      return true;
    }

    if (this._circuitState === CircuitState.OPEN) {
      // Check if enough time has passed to try again
      const now = Date.now();
      if (now - this._lastFailureTime >= this._circuitConfig.resetTimeoutMs) {
        this._circuitState = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow limited requests to test recovery
    return true;
  }

  /**
   * Record successful operation
   * @private
   */
  _recordSuccess() {
    if (this._circuitState === CircuitState.HALF_OPEN) {
      // Successfully recovered - close circuit
      this._circuitState = CircuitState.CLOSED;
      this._failureCount = 0;
      log.info('Circuit breaker: CLOSED (recovered)');
    } else {
      // Reset failure count on success
      this._failureCount = 0;
    }
  }

  /**
   * Record failed operation
   * @private
   */
  _recordFailure() {
    this._failureCount++;
    this._lastFailureTime = Date.now();

    if (this._circuitState === CircuitState.HALF_OPEN) {
      // Failed during recovery test - reopen circuit
      this._circuitState = CircuitState.OPEN;
      log.warn('Circuit breaker: OPEN (recovery failed)');
    } else if (this._failureCount >= this._circuitConfig.failureThreshold) {
      // Too many failures - open circuit
      this._circuitState = CircuitState.OPEN;
      log.warn('Circuit breaker: OPEN', { failures: this._failureCount });
    }
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
      log.info('PostgreSQL connected');
    } finally {
      client.release();
    }

    return this;
  }

  /**
   * Execute a query with circuit breaker protection
   */
  async query(text, params = []) {
    // Check circuit breaker
    if (!this._canExecute()) {
      const err = new Error('Circuit breaker is OPEN - database unavailable');
      err.code = 'CIRCUIT_OPEN';
      err.circuitState = this.getCircuitState();
      throw err;
    }

    if (!this.pool) {
      await this.connect();
    }

    try {
      const result = await this.pool.query(text, params);
      this._recordSuccess();
      return result;
    } catch (error) {
      this._recordFailure();
      throw error;
    }
  }

  /**
   * Get a client from the pool (for transactions)
   * Protected by circuit breaker
   */
  async getClient() {
    // Check circuit breaker
    if (!this._canExecute()) {
      const err = new Error('Circuit breaker is OPEN - database unavailable');
      err.code = 'CIRCUIT_OPEN';
      err.circuitState = this.getCircuitState();
      throw err;
    }

    if (!this.pool) {
      await this.connect();
    }

    try {
      const client = await this.pool.connect();
      this._recordSuccess();
      return client;
    } catch (error) {
      this._recordFailure();
      throw error;
    }
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
      log.info('PostgreSQL disconnected');
    }
  }

  /**
   * Reset circuit breaker (for manual recovery)
   */
  resetCircuitBreaker() {
    this._circuitState = CircuitState.CLOSED;
    this._failureCount = 0;
    this._lastFailureTime = 0;
    log.info('Circuit breaker: manually reset to CLOSED');
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
