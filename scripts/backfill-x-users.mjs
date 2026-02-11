#!/usr/bin/env node
/**
 * Backfill x_users from oEmbed API.
 * Each tweet → oEmbed → author_name + author_url → x_users INSERT.
 *
 * Usage:
 *   node scripts/backfill-x-users.mjs          # one-shot
 *   node scripts/backfill-x-users.mjs --watch   # loop every 30s
 */
import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

const WATCH_MODE = process.argv.includes('--watch');
const INTERVAL_MS = 30_000;
const BATCH_SIZE = 5;
const DB_PATH = join(homedir(), '.cynic', 'x-local.db');

async function fetchUser(insertUser, row) {
  const url = `https://publish.twitter.com/oembed?url=https://x.com/i/status/${row.tweet_id}&omit_script=true`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const match = data.author_url?.match(/(?:twitter|x)\.com\/([^/?]+)/);
    const username = match?.[1];
    const displayName = data.author_name;

    if (username) {
      insertUser.run(row.x_user_id, username, displayName);
      return { username, displayName };
    }
    return null;
  } catch {
    return null;
  }
}

async function runBackfill() {
  const db = new Database(DB_PATH);

  const usersToFill = db.prepare(`
    SELECT x_user_id, MIN(tweet_id) as tweet_id
    FROM x_tweets
    WHERE x_user_id NOT IN (SELECT x_user_id FROM x_users)
    GROUP BY x_user_id
  `).all();

  if (usersToFill.length === 0) {
    db.close();
    return 0;
  }

  console.log(`[backfill] ${usersToFill.length} new users to fetch`);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO x_users (x_user_id, username, display_name, captured_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < usersToFill.length; i += BATCH_SIZE) {
    const batch = usersToFill.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(r => fetchUser(insertUser, r)));
    success += results.filter(Boolean).length;
    failed += results.filter(r => !r).length;
    process.stdout.write(`\r[backfill] ${success}/${usersToFill.length} users (${failed} failed)`);
    if (i + BATCH_SIZE < usersToFill.length) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM x_users').get();
  console.log(`\n[backfill] Done: +${success} users (total: ${count.c})`);
  db.close();
  return success;
}

if (WATCH_MODE) {
  console.log(`[backfill] Watch mode — every ${INTERVAL_MS / 1000}s. Ctrl+C to stop.`);
  const tick = async () => {
    try { await runBackfill(); } catch (e) { console.error('[backfill]', e.message); }
  };
  await tick();
  setInterval(tick, INTERVAL_MS);
} else {
  await runBackfill();
}
