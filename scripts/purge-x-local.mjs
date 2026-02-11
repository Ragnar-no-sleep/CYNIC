/**
 * Purge all local X/Twitter data from SQLite
 * Run: node scripts/purge-x-local.mjs
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.cynic', 'x-local.db');
console.log(`Opening: ${dbPath}`);

const db = new Database(dbPath);

const before = {
  tweets: db.prepare('SELECT COUNT(*) as c FROM x_tweets').get().c,
  users: db.prepare('SELECT COUNT(*) as c FROM x_users').get().c,
  trends: db.prepare('SELECT COUNT(*) as c FROM x_trends').get().c,
};
console.log('Before:', before);

db.exec('DELETE FROM x_feed_tweets');
db.exec('DELETE FROM x_tweets');
db.exec('DELETE FROM x_users');
db.exec('DELETE FROM x_sync_log');
db.exec('DELETE FROM x_trends');
db.exec('DELETE FROM x_feeds');
db.exec('VACUUM');

console.log('After: tweets=0 users=0 trends=0');
console.log('PURGE COMPLETE - clean slate');
db.close();
