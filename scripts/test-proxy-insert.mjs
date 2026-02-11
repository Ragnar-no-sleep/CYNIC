/**
 * Test script: verify LocalXStore insert with camelCase data from parser
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.cynic', 'x-local.db');
const db = new Database(dbPath);

// Simulate parser output format (camelCase)
const testUser = {
  xUserId: 'test_user_456',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'A test user',
  profileImageUrl: null,
  followersCount: 100,
  followingCount: 50,
  tweetCount: 500,
  verified: false,
  createdOnX: new Date(),
};

const testTweet = {
  tweetId: 'test_proxy_123',
  xUserId: 'test_user_456',
  text: 'Test proxy tweet from parser',
  postedAt: new Date(),
  likesCount: 42,
  retweetsCount: 5,
  repliesCount: 3,
  quotesCount: 1,
  viewsCount: 1000,
  bookmarksCount: 2,
  hashtags: ['test'],
  mentions: ['cynic'],
  urls: [],
  media: [],
  threadId: null,
  replyToTweetId: null,
  replyToUserId: null,
  isRetweet: false,
  isQuote: false,
  quoteTweetId: null,
  source: 'proxy',
  language: 'en',
};

// --- Replicate LocalXStore.upsertUser() logic ---
try {
  const uStmt = db.prepare(`
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

  const user = testUser;
  const u = uStmt.get(
    user.x_user_id || user.xUserId || user.id_str || user.rest_id,
    user.username || user.screen_name,
    user.display_name || user.displayName || user.name,
    user.bio || user.description,
    user.profile_image_url || user.profileImageUrl || user.profile_image_url_https,
    user.followers_count || user.followersCount || 0,
    user.following_count || user.followingCount || user.friends_count || 0,
    user.tweet_count || user.tweetCount || user.statuses_count || 0,
    user.verified ? 1 : 0,
    user.protected ? 1 : 0,
    user.created_at || (user.createdOnX instanceof Date ? user.createdOnX.toISOString() : user.createdOnX),
    user.protected ? 1 : 0,
  );
  console.log('USER OK:', u ? u.x_user_id : 'null');
} catch (e) {
  console.error('USER ERROR:', e.message);
}

// --- Replicate LocalXStore.createTweet() logic ---
try {
  const tStmt = db.prepare(`
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

  const tweet = testTweet;
  const createdAt = tweet.created_at
    || (tweet.postedAt instanceof Date ? tweet.postedAt.toISOString() : tweet.postedAt)
    || new Date().toISOString();

  const t = tStmt.get(
    tweet.tweet_id || tweet.tweetId || tweet.id_str || tweet.rest_id,
    tweet.x_user_id || tweet.xUserId || tweet.user_id_str,
    tweet.text || tweet.full_text,
    createdAt,
    tweet.language || tweet.lang,
    tweet.like_count || tweet.likesCount || tweet.favorite_count || 0,
    tweet.retweet_count || tweet.retweetsCount || 0,
    tweet.reply_count || tweet.repliesCount || 0,
    tweet.quote_count || tweet.quotesCount || 0,
    tweet.view_count || tweet.viewsCount || 0,
    tweet.bookmark_count || tweet.bookmarksCount || 0,
    JSON.stringify(tweet.hashtags || []),
    JSON.stringify(tweet.mentions || []),
    JSON.stringify(tweet.urls || []),
    JSON.stringify(tweet.media || []),
    tweet.conversation_id || tweet.threadId,
    tweet.in_reply_to_tweet_id || tweet.replyToTweetId || tweet.in_reply_to_status_id_str,
    tweet.in_reply_to_user_id || tweet.replyToUserId || tweet.in_reply_to_user_id_str,
    (tweet.is_retweet || tweet.isRetweet) ? 1 : 0,
    (tweet.is_quote || tweet.isQuote) ? 1 : 0,
    tweet.quoted_tweet_id || tweet.quoteTweetId || tweet.quoted_status_id_str,
    tweet.sentiment_score,
    tweet.sentiment_label,
    JSON.stringify(tweet.topics || []),
    tweet.source,
    tweet.is_private ? 1 : 0,
    tweet.is_my_tweet ? 1 : 0,
  );
  console.log('TWEET OK:', t ? t.tweet_id : 'null (duplicate or constraint)');
} catch (e) {
  console.error('TWEET ERROR:', e.message);
}

// Count total
const count = db.prepare('SELECT COUNT(*) as c FROM x_tweets').get();
console.log('Total tweets in DB:', count.c);

// Clean up test data
db.prepare('DELETE FROM x_tweets WHERE tweet_id = ?').run('test_proxy_123');
db.prepare('DELETE FROM x_users WHERE x_user_id = ?').run('test_user_456');
console.log('Test data cleaned up');

db.close();
