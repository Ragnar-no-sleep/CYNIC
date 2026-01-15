/**
 * @cynic/persistence - Persistence Layer
 *
 * PostgreSQL for durable storage + Redis for sessions/cache
 *
 * "Memory makes wisdom possible" - CYNIC
 *
 * @module @cynic/persistence
 */

'use strict';

// Clients
export { PostgresClient, getPool } from './postgres/client.js';
export { RedisClient, getRedis } from './redis/client.js';

// Repositories
export * from './postgres/repositories/index.js';

// Session Store
export { SessionStore } from './redis/session-store.js';

// Version
export const VERSION = '0.1.0';
