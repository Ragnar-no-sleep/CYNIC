#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Run: npm run migrate
 *
 * @module @cynic/persistence/postgres/migrate
 */

'use strict';

import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PostgresClient } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function migrate() {
  console.log('🐕 CYNIC Database Migration');
  console.log('============================\n');

  const db = new PostgresClient();

  try {
    await db.connect();

    // Ensure migrations table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get applied migrations
    const { rows: applied } = await db.query('SELECT name FROM _migrations');
    const appliedSet = new Set(applied.map(r => r.name));

    // Get migration files
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration(s)\n`);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const name = file.replace('.sql', '');

      if (appliedSet.has(name)) {
        console.log(`⏭️  ${name} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`▶️  Applying ${name}...`);

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

      await db.transaction(async (client) => {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
          [name]
        );
      });

      console.log(`✅ ${name} applied`);
      appliedCount++;
    }

    console.log(`\n============================`);
    console.log(`✅ Applied: ${appliedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log('🐕 Migration complete\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if called directly
migrate().catch(console.error);
