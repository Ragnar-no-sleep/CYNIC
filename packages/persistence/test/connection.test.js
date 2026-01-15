#!/usr/bin/env node
/**
 * Connection Test - Verify PostgreSQL and Redis connections
 *
 * Run: node test/connection.test.js
 * (Loads .env automatically)
 *
 * @module @cynic/persistence/test/connection
 */

import 'dotenv/config';
import { PostgresClient } from '../src/postgres/client.js';
import { RedisClient } from '../src/redis/client.js';

console.log('🐕 CYNIC Persistence Connection Test');
console.log('=====================================\n');

async function testPostgres() {
  console.log('📊 Testing PostgreSQL...');

  if (!process.env.CYNIC_DATABASE_URL) {
    console.log('⚠️  CYNIC_DATABASE_URL not set - skipping');
    return false;
  }

  const db = new PostgresClient();

  try {
    await db.connect();

    // Test query
    const { rows } = await db.query('SELECT NOW() as time, current_database() as db');
    console.log(`✅ PostgreSQL connected`);
    console.log(`   Database: ${rows[0].db}`);
    console.log(`   Time: ${rows[0].time}`);

    // Check health
    const health = await db.health();
    console.log(`   Pool: ${health.pool.total} total, ${health.pool.idle} idle`);
    console.log(`   Latency: ${health.latency}ms`);

    await db.close();
    return true;
  } catch (error) {
    console.log(`❌ PostgreSQL failed: ${error.message}`);
    return false;
  }
}

async function testRedis() {
  console.log('\n🔴 Testing Redis...');

  if (!process.env.CYNIC_REDIS_URL) {
    console.log('⚠️  CYNIC_REDIS_URL not set - skipping');
    return false;
  }

  const redis = new RedisClient();

  try {
    await redis.connect();

    // Test set/get
    const testKey = 'cynic:test:' + Date.now();
    await redis.set(testKey, { test: true, timestamp: Date.now() }, 60);
    const value = await redis.get(testKey);

    if (value && value.test === true) {
      console.log('✅ Redis connected');
      console.log(`   Set/Get: Working`);
    }

    // Cleanup
    await redis.del(testKey);

    // Check health
    const health = await redis.health();
    console.log(`   Memory: ${health.memory}`);
    console.log(`   Latency: ${health.latency}ms`);

    await redis.close();
    return true;
  } catch (error) {
    console.log(`❌ Redis failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const pgOk = await testPostgres();
  const redisOk = await testRedis();

  console.log('\n=====================================');
  console.log('📋 Summary:');
  console.log(`   PostgreSQL: ${pgOk ? '✅ OK' : '❌ Failed'}`);
  console.log(`   Redis: ${redisOk ? '✅ OK' : '❌ Failed'}`);

  if (pgOk && redisOk) {
    console.log('\n🎉 All connections working!');
    console.log('   Ready to run migrations: npm run migrate\n');
  } else if (!process.env.CYNIC_DATABASE_URL && !process.env.CYNIC_REDIS_URL) {
    console.log('\n⚠️  No connection strings provided.');
    console.log('   Set environment variables:');
    console.log('   - CYNIC_DATABASE_URL=postgresql://...');
    console.log('   - CYNIC_REDIS_URL=redis://...\n');
  }

  process.exit(pgOk && redisOk ? 0 : 1);
}

main().catch(console.error);
