#!/usr/bin/env node
/**
 * Run a specific migration file
 * Usage: node scripts/run-migration.mjs <migration-file>
 */

import { readFileSync } from 'fs';
import { config } from 'dotenv';
import pg from 'pg';

// Load .env file
config();

const { Pool } = pg;

const migrationFile = process.argv[2] || 'packages/persistence/src/postgres/migrations/026_qlearning_persistence.sql';

console.log(`Running migration: ${migrationFile}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.CYNIC_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = readFileSync(migrationFile, 'utf8');

async function run() {
  const client = await pool.connect();
  try {
    // Run entire migration as a single transaction
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
