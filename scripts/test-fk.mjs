import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

const db = new Database(join(homedir(), '.cynic', 'x-local.db'));
console.log('FK status:', db.pragma('foreign_keys'));

// Parser-format user (camelCase)
const user = {
  xUserId: '999999999',
  username: 'test_fk_check',
  displayName: 'Test FK',
  bio: 'test',
  profileImageUrl: null,
  followersCount: 10,
  followingCount: 5,
  tweetCount: 100,
  verified: false,
  createdOnX: new Date(),
};

try {
  const stmt = db.prepare(`
    INSERT INTO x_users (
      x_user_id, username, display_name, bio, profile_image_url,
      followers_count, following_count, tweet_count,
      verified, protected, created_at, is_private
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(x_user_id) DO UPDATE SET
      username = excluded.username,
      display_name = excluded.display_name,
      updated_at = datetime('now')
    RETURNING *
  `);

  const result = stmt.get(
    user.x_user_id || user.xUserId,
    user.username,
    user.display_name || user.displayName,
    user.bio,
    user.profile_image_url || user.profileImageUrl,
    user.followers_count || user.followersCount || 0,
    user.following_count || user.followingCount || 0,
    user.tweet_count || user.tweetCount || 0,
    user.verified ? 1 : 0,
    user.protected ? 1 : 0,
    user.created_at || (user.createdOnX instanceof Date ? user.createdOnX.toISOString() : user.createdOnX),
    user.protected ? 1 : 0,
  );
  console.log('USER INSERT OK:', result?.x_user_id);
} catch (e) {
  console.error('USER INSERT ERROR:', e.message);
}

// Now test tweet with that user
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
    'test_tweet_fk_999',
    '999999999',
    'Test tweet for FK check',
    new Date().toISOString(),
    'en',
    0, 0, 0, 0, 0, 0,
    '[]', '[]', '[]', '[]',
    null, null, null,
    0, 0, null,
    null, null, '[]',
    'test', 0, 0,
  );
  console.log('TWEET INSERT OK:', result?.tweet_id);
} catch (e) {
  console.error('TWEET INSERT ERROR:', e.message);
}

// Test tweet with NON-EXISTENT user (FK violation)
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
    'test_tweet_fk_orphan',
    'nonexistent_user_id',
    'This should fail FK',
    new Date().toISOString(),
    'en',
    0, 0, 0, 0, 0, 0,
    '[]', '[]', '[]', '[]',
    null, null, null,
    0, 0, null,
    null, null, '[]',
    'test', 0, 0,
  );
  console.log('ORPHAN TWEET:', result?.tweet_id || 'null (ignored)');
} catch (e) {
  console.error('ORPHAN TWEET ERROR:', e.message);
}

// Cleanup
db.prepare('DELETE FROM x_tweets WHERE tweet_id LIKE ?').run('test_tweet_fk%');
db.prepare('DELETE FROM x_users WHERE x_user_id = ?').run('999999999');
console.log('Cleaned up');
db.close();
