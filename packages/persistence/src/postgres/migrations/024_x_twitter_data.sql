-- CYNIC X/Twitter Vision Schema
-- φ guides all ratios
--
-- Migration: 024_x_twitter_data
-- Created: 2026-02-01
--
-- X Vision: CYNIC sees what you see on X/Twitter
-- Local proxy captures all traffic, stored for analysis and search

-- =============================================================================
-- X USERS TABLE
-- =============================================================================

-- Twitter/X user profiles
CREATE TABLE IF NOT EXISTS x_users (
  id                BIGSERIAL PRIMARY KEY,
  x_user_id         VARCHAR(64) NOT NULL UNIQUE,    -- Twitter's user ID
  username          VARCHAR(100) NOT NULL,           -- @handle
  display_name      VARCHAR(200),                    -- Display name

  -- Profile data
  bio               TEXT,
  location          VARCHAR(200),
  website           VARCHAR(500),
  profile_image_url VARCHAR(1000),
  banner_url        VARCHAR(1000),

  -- Engagement metrics (snapshot)
  followers_count   INTEGER DEFAULT 0,
  following_count   INTEGER DEFAULT 0,
  tweet_count       INTEGER DEFAULT 0,

  -- Account info
  verified          BOOLEAN DEFAULT FALSE,
  created_on_x      TIMESTAMPTZ,                     -- Account creation date on X

  -- Monitoring flags
  is_monitored      BOOLEAN DEFAULT FALSE,           -- Are we actively tracking this user?
  monitor_priority  INTEGER DEFAULT 50 CHECK (monitor_priority >= 0 AND monitor_priority <= 100),

  -- Timestamps
  first_seen_at     TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- X TWEETS TABLE
-- =============================================================================

-- Captured tweets with engagement and analysis
CREATE TABLE IF NOT EXISTS x_tweets (
  id                BIGSERIAL PRIMARY KEY,
  tweet_id          VARCHAR(64) NOT NULL UNIQUE,     -- Twitter's tweet ID
  x_user_id         VARCHAR(64) NOT NULL,            -- Author's X user ID

  -- Content
  text              TEXT NOT NULL,
  text_html         TEXT,                            -- HTML formatted version
  language          VARCHAR(10),                     -- Detected language (en, es, fr, etc.)

  -- Tweet metadata
  tweet_type        VARCHAR(50) DEFAULT 'tweet' CHECK (tweet_type IN (
    'tweet',         -- Regular tweet
    'reply',         -- Reply to another tweet
    'retweet',       -- Retweet
    'quote',         -- Quote tweet
    'thread'         -- Part of a thread
  )),

  -- Thread/reply chain
  reply_to_tweet_id VARCHAR(64),                     -- If reply, the parent tweet
  reply_to_user_id  VARCHAR(64),                     -- If reply, the parent user
  quote_tweet_id    VARCHAR(64),                     -- If quote, the quoted tweet
  thread_id         VARCHAR(64),                     -- Thread root tweet ID

  -- Media attachments
  media             JSONB DEFAULT '[]',              -- [{type, url, thumbnail, alt_text}]
  urls              JSONB DEFAULT '[]',              -- [{url, expanded_url, display_url}]
  hashtags          TEXT[] DEFAULT '{}',             -- Array of hashtags
  mentions          TEXT[] DEFAULT '{}',             -- Array of mentioned usernames

  -- Engagement metrics (snapshot at capture time)
  likes_count       INTEGER DEFAULT 0,
  retweets_count    INTEGER DEFAULT 0,
  replies_count     INTEGER DEFAULT 0,
  quotes_count      INTEGER DEFAULT 0,
  views_count       BIGINT DEFAULT 0,
  bookmarks_count   INTEGER DEFAULT 0,

  -- CYNIC analysis (filled by brain_x_analyze or background job)
  sentiment         VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  sentiment_score   FLOAT CHECK (sentiment_score >= 0 AND sentiment_score <= 1),
  relevance_score   FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 0.618),  -- Max: φ⁻¹
  topics            TEXT[] DEFAULT '{}',             -- Extracted topics/categories
  q_score           INTEGER CHECK (q_score >= 0 AND q_score <= 100),

  -- Vector embedding for semantic search (1536 dimensions)
  embedding         vector(1536),

  -- Full-text search vector (updated by trigger)
  search_vector     tsvector,

  -- Timestamps
  posted_at         TIMESTAMPTZ NOT NULL,            -- When tweet was posted on X
  captured_at       TIMESTAMPTZ DEFAULT NOW(),       -- When we captured it
  analyzed_at       TIMESTAMPTZ,                     -- When CYNIC analyzed it

  -- Deletion tracking (we never delete, only flag)
  deleted           BOOLEAN DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,

  -- Foreign keys
  FOREIGN KEY (x_user_id) REFERENCES x_users(x_user_id) ON DELETE CASCADE
);

-- =============================================================================
-- X FEEDS TABLE (User-defined feed configurations)
-- =============================================================================

-- Custom feeds for organizing captured tweets
CREATE TABLE IF NOT EXISTS x_feeds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           VARCHAR(255) NOT NULL,           -- CYNIC user who owns this feed

  -- Feed definition
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  feed_type         VARCHAR(50) DEFAULT 'custom' CHECK (feed_type IN (
    'timeline',      -- User's home timeline
    'list',          -- X list mirror
    'search',        -- Search query results
    'user',          -- Specific user's tweets
    'topic',         -- Topic-based curation
    'custom'         -- Custom curation
  )),

  -- Filter criteria (JSONB for flexibility)
  filters           JSONB DEFAULT '{}',              -- {users: [], hashtags: [], keywords: [], sentiment: null}

  -- Feed settings
  is_active         BOOLEAN DEFAULT TRUE,
  auto_refresh      BOOLEAN DEFAULT TRUE,
  priority          INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),

  -- Stats
  tweet_count       INTEGER DEFAULT 0,
  last_tweet_at     TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- X FEED TWEETS (Many-to-many: feeds <-> tweets)
-- =============================================================================

CREATE TABLE IF NOT EXISTS x_feed_tweets (
  feed_id           UUID NOT NULL REFERENCES x_feeds(id) ON DELETE CASCADE,
  tweet_id          VARCHAR(64) NOT NULL,
  added_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Why was this tweet added to this feed?
  match_reason      VARCHAR(100),                    -- filter_match, manual, algorithm

  PRIMARY KEY (feed_id, tweet_id)
);

-- =============================================================================
-- X TRENDS TABLE
-- =============================================================================

-- Trending topics/hashtags observed
CREATE TABLE IF NOT EXISTS x_trends (
  id                BIGSERIAL PRIMARY KEY,

  -- Trend identification
  trend_name        VARCHAR(500) NOT NULL,           -- Hashtag or topic name
  trend_type        VARCHAR(50) DEFAULT 'hashtag' CHECK (trend_type IN (
    'hashtag',       -- #something
    'keyword',       -- Trending keyword
    'topic',         -- Trending topic
    'event'          -- Live event
  )),

  -- Location context
  location          VARCHAR(200),                    -- Country/city if location-specific
  woeid             INTEGER,                         -- Where On Earth ID

  -- Volume metrics
  tweet_volume      INTEGER,                         -- Approximate tweet volume

  -- Ranking
  rank              INTEGER,                         -- Position in trending list

  -- CYNIC analysis
  sentiment         VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  category          VARCHAR(100),                    -- Politics, Sports, Tech, etc.

  -- Timestamps
  observed_at       TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint (same trend can appear multiple times)
  UNIQUE (trend_name, observed_at)
);

-- =============================================================================
-- X SYNC STATUS TABLE
-- =============================================================================

-- Tracks proxy sync state per user/endpoint
CREATE TABLE IF NOT EXISTS x_sync_status (
  id                BIGSERIAL PRIMARY KEY,

  -- What are we syncing?
  sync_type         VARCHAR(100) NOT NULL,           -- timeline, user_tweets, search, etc.
  sync_target       VARCHAR(500),                    -- User ID, search query, etc.

  -- Sync state
  last_sync_at      TIMESTAMPTZ,
  last_tweet_id     VARCHAR(64),                     -- Last captured tweet ID (for pagination)
  tweets_captured   INTEGER DEFAULT 0,
  errors_count      INTEGER DEFAULT 0,
  last_error        TEXT,

  -- Status
  status            VARCHAR(50) DEFAULT 'active' CHECK (status IN (
    'active',        -- Currently syncing
    'paused',        -- Temporarily paused
    'error',         -- In error state
    'disabled'       -- Permanently disabled
  )),

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (sync_type, sync_target)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- x_users indexes
CREATE INDEX IF NOT EXISTS idx_x_users_username ON x_users(username);
CREATE INDEX IF NOT EXISTS idx_x_users_monitored ON x_users(is_monitored) WHERE is_monitored = TRUE;
CREATE INDEX IF NOT EXISTS idx_x_users_last_seen ON x_users(last_seen_at DESC);

-- x_tweets indexes
CREATE INDEX IF NOT EXISTS idx_x_tweets_user ON x_tweets(x_user_id);
CREATE INDEX IF NOT EXISTS idx_x_tweets_posted ON x_tweets(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_x_tweets_captured ON x_tweets(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_x_tweets_type ON x_tweets(tweet_type);
CREATE INDEX IF NOT EXISTS idx_x_tweets_thread ON x_tweets(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_x_tweets_reply_to ON x_tweets(reply_to_tweet_id) WHERE reply_to_tweet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_x_tweets_sentiment ON x_tweets(sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_x_tweets_relevance ON x_tweets(relevance_score DESC) WHERE relevance_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_x_tweets_hashtags ON x_tweets USING gin(hashtags);
CREATE INDEX IF NOT EXISTS idx_x_tweets_mentions ON x_tweets USING gin(mentions);
CREATE INDEX IF NOT EXISTS idx_x_tweets_topics ON x_tweets USING gin(topics);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_x_tweets_fts ON x_tweets USING gin(search_vector);

-- Vector search index (HNSW for better performance)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_x_tweets_vector ON x_tweets
    USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vector index not created - pgvector may not be available';
END $$;

-- x_feeds indexes
CREATE INDEX IF NOT EXISTS idx_x_feeds_user ON x_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_x_feeds_type ON x_feeds(feed_type);
CREATE INDEX IF NOT EXISTS idx_x_feeds_active ON x_feeds(is_active) WHERE is_active = TRUE;

-- x_feed_tweets indexes
CREATE INDEX IF NOT EXISTS idx_x_feed_tweets_tweet ON x_feed_tweets(tweet_id);
CREATE INDEX IF NOT EXISTS idx_x_feed_tweets_added ON x_feed_tweets(added_at DESC);

-- x_trends indexes
CREATE INDEX IF NOT EXISTS idx_x_trends_name ON x_trends(trend_name);
CREATE INDEX IF NOT EXISTS idx_x_trends_observed ON x_trends(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_x_trends_type ON x_trends(trend_type);
CREATE INDEX IF NOT EXISTS idx_x_trends_location ON x_trends(location) WHERE location IS NOT NULL;

-- x_sync_status indexes
CREATE INDEX IF NOT EXISTS idx_x_sync_type ON x_sync_status(sync_type);
CREATE INDEX IF NOT EXISTS idx_x_sync_status ON x_sync_status(status);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Function to update search_vector on x_tweets
CREATE OR REPLACE FUNCTION x_tweets_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.hashtags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search_vector on insert/update
CREATE TRIGGER x_tweets_search_vector_trigger
  BEFORE INSERT OR UPDATE OF text, hashtags ON x_tweets
  FOR EACH ROW EXECUTE FUNCTION x_tweets_search_vector_update();

-- Update updated_at on x_users changes
CREATE TRIGGER x_users_updated_at BEFORE UPDATE ON x_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update updated_at on x_feeds changes
CREATE TRIGGER x_feeds_updated_at BEFORE UPDATE ON x_feeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update updated_at on x_sync_status changes
CREATE TRIGGER x_sync_updated_at BEFORE UPDATE ON x_sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- φ-weighted hybrid search for tweets (FTS + vector)
-- 0.382 FTS + 0.618 vector (golden ratio)
CREATE OR REPLACE FUNCTION search_x_tweets_hybrid(
  p_query TEXT,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_username VARCHAR(100) DEFAULT NULL,
  p_min_engagement INTEGER DEFAULT 0,
  p_sentiment VARCHAR(20) DEFAULT NULL,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_until TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  tweet_id VARCHAR(64),
  x_user_id VARCHAR(64),
  username VARCHAR(100),
  text TEXT,
  posted_at TIMESTAMPTZ,
  likes_count INTEGER,
  retweets_count INTEGER,
  sentiment VARCHAR(20),
  relevance_score FLOAT,
  combined_score FLOAT
) AS $$
DECLARE
  PHI_FTS CONSTANT FLOAT := 0.382;
  PHI_VECTOR CONSTANT FLOAT := 0.618;
BEGIN
  RETURN QUERY
  WITH fts_results AS (
    SELECT
      t.tweet_id,
      ts_rank(t.search_vector, websearch_to_tsquery('english', p_query)) as fts_score
    FROM x_tweets t
    WHERE t.search_vector @@ websearch_to_tsquery('english', p_query)
      AND t.deleted = FALSE
  ),
  vector_results AS (
    SELECT
      t.tweet_id,
      CASE
        WHEN p_query_embedding IS NOT NULL AND t.embedding IS NOT NULL
        THEN 1 - (t.embedding <=> p_query_embedding)
        ELSE 0
      END as vector_score
    FROM x_tweets t
    WHERE t.deleted = FALSE
      AND (p_query_embedding IS NULL OR t.embedding IS NOT NULL)
  )
  SELECT
    t.tweet_id,
    t.x_user_id,
    u.username,
    t.text,
    t.posted_at,
    t.likes_count,
    t.retweets_count,
    t.sentiment,
    t.relevance_score,
    (COALESCE(f.fts_score, 0) * PHI_FTS + COALESCE(v.vector_score, 0) * PHI_VECTOR) as combined_score
  FROM x_tweets t
  JOIN x_users u ON t.x_user_id = u.x_user_id
  LEFT JOIN fts_results f ON t.tweet_id = f.tweet_id
  LEFT JOIN vector_results v ON t.tweet_id = v.tweet_id
  WHERE t.deleted = FALSE
    AND (f.fts_score IS NOT NULL OR v.vector_score > 0)
    AND (p_username IS NULL OR u.username = p_username)
    AND (p_min_engagement = 0 OR (t.likes_count + t.retweets_count) >= p_min_engagement)
    AND (p_sentiment IS NULL OR t.sentiment = p_sentiment)
    AND (p_since IS NULL OR t.posted_at >= p_since)
    AND (p_until IS NULL OR t.posted_at <= p_until)
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get recent tweets for a feed
CREATE OR REPLACE FUNCTION get_feed_tweets(
  p_feed_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  tweet_id VARCHAR(64),
  x_user_id VARCHAR(64),
  username VARCHAR(100),
  display_name VARCHAR(200),
  profile_image_url VARCHAR(1000),
  text TEXT,
  posted_at TIMESTAMPTZ,
  likes_count INTEGER,
  retweets_count INTEGER,
  replies_count INTEGER,
  views_count BIGINT,
  sentiment VARCHAR(20),
  media JSONB,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tweet_id,
    t.x_user_id,
    u.username,
    u.display_name,
    u.profile_image_url,
    t.text,
    t.posted_at,
    t.likes_count,
    t.retweets_count,
    t.replies_count,
    t.views_count,
    t.sentiment,
    t.media,
    ft.added_at
  FROM x_feed_tweets ft
  JOIN x_tweets t ON ft.tweet_id = t.tweet_id
  JOIN x_users u ON t.x_user_id = u.x_user_id
  WHERE ft.feed_id = p_feed_id
    AND t.deleted = FALSE
  ORDER BY t.posted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get thread (conversation) for a tweet
CREATE OR REPLACE FUNCTION get_tweet_thread(
  p_tweet_id VARCHAR(64)
)
RETURNS TABLE (
  tweet_id VARCHAR(64),
  x_user_id VARCHAR(64),
  username VARCHAR(100),
  text TEXT,
  posted_at TIMESTAMPTZ,
  reply_to_tweet_id VARCHAR(64),
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE thread AS (
    -- Start with the requested tweet
    SELECT
      t.tweet_id,
      t.x_user_id,
      t.text,
      t.posted_at,
      t.reply_to_tweet_id,
      t.thread_id,
      0 as depth
    FROM x_tweets t
    WHERE t.tweet_id = p_tweet_id

    UNION ALL

    -- Get parent tweets (going up)
    SELECT
      t.tweet_id,
      t.x_user_id,
      t.text,
      t.posted_at,
      t.reply_to_tweet_id,
      t.thread_id,
      th.depth - 1
    FROM x_tweets t
    JOIN thread th ON t.tweet_id = th.reply_to_tweet_id
    WHERE th.depth > -10  -- Limit recursion

    UNION ALL

    -- Get reply tweets (going down)
    SELECT
      t.tweet_id,
      t.x_user_id,
      t.text,
      t.posted_at,
      t.reply_to_tweet_id,
      t.thread_id,
      th.depth + 1
    FROM x_tweets t
    JOIN thread th ON t.reply_to_tweet_id = th.tweet_id
    WHERE th.depth < 10  -- Limit recursion
  )
  SELECT DISTINCT
    th.tweet_id,
    th.x_user_id,
    u.username,
    th.text,
    th.posted_at,
    th.reply_to_tweet_id,
    th.depth
  FROM thread th
  JOIN x_users u ON th.x_user_id = u.x_user_id
  ORDER BY th.depth, th.posted_at;
END;
$$ LANGUAGE plpgsql;

-- Get X data statistics
CREATE OR REPLACE FUNCTION get_x_stats()
RETURNS TABLE (
  total_users BIGINT,
  monitored_users BIGINT,
  total_tweets BIGINT,
  analyzed_tweets BIGINT,
  total_feeds BIGINT,
  active_feeds BIGINT,
  tweets_today BIGINT,
  tweets_week BIGINT,
  trending_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM x_users)::BIGINT as total_users,
    (SELECT COUNT(*) FROM x_users WHERE is_monitored = TRUE)::BIGINT as monitored_users,
    (SELECT COUNT(*) FROM x_tweets WHERE deleted = FALSE)::BIGINT as total_tweets,
    (SELECT COUNT(*) FROM x_tweets WHERE analyzed_at IS NOT NULL AND deleted = FALSE)::BIGINT as analyzed_tweets,
    (SELECT COUNT(*) FROM x_feeds)::BIGINT as total_feeds,
    (SELECT COUNT(*) FROM x_feeds WHERE is_active = TRUE)::BIGINT as active_feeds,
    (SELECT COUNT(*) FROM x_tweets WHERE captured_at >= NOW() - INTERVAL '1 day' AND deleted = FALSE)::BIGINT as tweets_today,
    (SELECT COUNT(*) FROM x_tweets WHERE captured_at >= NOW() - INTERVAL '7 days' AND deleted = FALSE)::BIGINT as tweets_week,
    (SELECT COUNT(DISTINCT trend_name) FROM x_trends WHERE observed_at >= NOW() - INTERVAL '1 day')::BIGINT as trending_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION TRACKING
-- =============================================================================

INSERT INTO _migrations (name) VALUES ('024_x_twitter_data')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================

-- φ constants used:
-- PHI_INV = 0.618 (vector weight in hybrid search)
-- PHI_INV_2 = 0.382 (FTS weight in hybrid search)
-- Max relevance_score = 0.618 (φ⁻¹, never claim certainty)

-- CYNIC sees what you see. Vision without surveillance.
