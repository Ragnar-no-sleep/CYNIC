/**
 * Test that FK OFF fix allows orphan tweets (proxy scenario)
 */
import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

const db = new Database(join(homedir(), '.cynic', 'x-local.db'));

// Apply the fix
db.pragma('foreign_keys = OFF');
console.log('FK after fix:', db.pragma('foreign_keys'));

// Try inserting a tweet WITHOUT a matching user (proxy scenario)
try {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO x_tweets (
      tweet_id, x_user_id, text, created_at, language,
      like_count, retweet_count, reply_count, quote_count, view_count, bookmark_count,
      hashtags, mentions, urls, media,
      conversation_id, in_reply_to_tweet_id, in_reply_to_user_id,
      is_retweet, is_quote, quoted_tweet_id,
      sentiment_score, sentiment_label, topics,
      source, is_private, is_my_tweet
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  const result = stmt.get(
    'test_fk_fix_orphan',
    'nonexistent_user_12345',
    'Orphan tweet — FK OFF should allow this',
    new Date().toISOString(),
    'en',
    42, 5, 3, 1, 1000, 2,
    '["test"]', '["cynic"]', '[]', '[]',
    null, null, null,
    0, 0, null,
    null, null, '[]',
    'proxy', 0, 0,
  );
  console.log('ORPHAN TWEET OK:', result?.tweet_id, '— FK OFF works!');
} catch (e) {
  console.error('ORPHAN TWEET FAILED:', e.message);
}

// Cleanup
db.prepare('DELETE FROM x_tweets WHERE tweet_id = ?').run('test_fk_fix_orphan');
console.log('Cleaned up');
db.close();
