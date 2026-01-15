-- CYNIC Database Schema v1
-- φ guides all ratios
--
-- Migration: 001_initial
-- Created: 2026-01-15

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address  VARCHAR(64) UNIQUE,
    username        VARCHAR(100),
    e_score         DECIMAL(5,2) DEFAULT 0,
    e_score_data    JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_e_score ON users(e_score DESC);

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      VARCHAR(64) UNIQUE NOT NULL,
    user_id         UUID REFERENCES users(id),
    judgment_count  INTEGER DEFAULT 0,
    digest_count    INTEGER DEFAULT 0,
    feedback_count  INTEGER DEFAULT 0,
    context         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '17 hours'  -- φ⁻¹ × 100000 seconds
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- =============================================================================
-- JUDGMENTS TABLE (append-only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS judgments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judgment_id     VARCHAR(32) UNIQUE NOT NULL,  -- jdg_xxxxx
    user_id         UUID REFERENCES users(id),
    session_id      VARCHAR(64),

    -- Item being judged
    item_type       VARCHAR(50) NOT NULL,
    item_content    TEXT NOT NULL,
    item_hash       VARCHAR(64) NOT NULL,

    -- Scores
    q_score         DECIMAL(5,2) NOT NULL,
    global_score    DECIMAL(5,2) NOT NULL,
    confidence      DECIMAL(5,4) NOT NULL,
    verdict         VARCHAR(10) NOT NULL CHECK (verdict IN ('HOWL', 'WAG', 'GROWL', 'BARK')),

    -- Detailed scores
    axiom_scores    JSONB NOT NULL,       -- {PHI, VERIFY, CULTURE, BURN}
    dimension_scores JSONB,               -- All 25 dimensions
    weaknesses      JSONB,                -- Identified weaknesses

    -- Context
    context         JSONB DEFAULT '{}',

    -- PoJ Chain fields
    prev_hash       VARCHAR(64),
    block_hash      VARCHAR(64),
    block_number    BIGINT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_judgments_user ON judgments(user_id);
CREATE INDEX idx_judgments_session ON judgments(session_id);
CREATE INDEX idx_judgments_type ON judgments(item_type);
CREATE INDEX idx_judgments_verdict ON judgments(verdict);
CREATE INDEX idx_judgments_qscore ON judgments(q_score DESC);
CREATE INDEX idx_judgments_created ON judgments(created_at DESC);
CREATE INDEX idx_judgments_hash ON judgments(item_hash);

-- =============================================================================
-- PATTERNS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS patterns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id      VARCHAR(32) UNIQUE NOT NULL,  -- pat_xxxxx

    -- Pattern data
    category        VARCHAR(50) NOT NULL,  -- anomaly, verdict, dimension, etc.
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    confidence      DECIMAL(5,4) NOT NULL,
    frequency       INTEGER DEFAULT 1,

    -- Source judgments
    source_judgments JSONB DEFAULT '[]',  -- Array of judgment_ids
    source_count    INTEGER DEFAULT 0,

    -- Metadata
    tags            TEXT[] DEFAULT '{}',
    data            JSONB DEFAULT '{}',

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_confidence ON patterns(confidence DESC);
CREATE INDEX idx_patterns_frequency ON patterns(frequency DESC);
CREATE INDEX idx_patterns_tags ON patterns USING gin(tags);

-- =============================================================================
-- FEEDBACK TABLE (for learning)
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judgment_id     VARCHAR(32) NOT NULL REFERENCES judgments(judgment_id),
    user_id         UUID REFERENCES users(id),

    outcome         VARCHAR(20) NOT NULL CHECK (outcome IN ('correct', 'incorrect', 'partial')),
    actual_score    DECIMAL(5,2),
    reason          TEXT,

    -- Impact tracking
    applied         BOOLEAN DEFAULT FALSE,
    applied_at      TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_judgment ON feedback(judgment_id);
CREATE INDEX idx_feedback_outcome ON feedback(outcome);
CREATE INDEX idx_feedback_applied ON feedback(applied);

-- =============================================================================
-- KNOWLEDGE TABLE (digested knowledge)
-- =============================================================================

CREATE TABLE IF NOT EXISTS knowledge (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id    VARCHAR(32) UNIQUE NOT NULL,  -- kno_xxxxx

    -- Source
    source_type     VARCHAR(50) NOT NULL,  -- code, conversation, document, decision
    source_ref      TEXT,

    -- Content
    summary         TEXT NOT NULL,
    insights        JSONB DEFAULT '[]',
    patterns        JSONB DEFAULT '[]',

    -- Categorization
    category        VARCHAR(50),
    tags            TEXT[] DEFAULT '{}',

    -- Quality
    q_score         DECIMAL(5,2),
    confidence      DECIMAL(5,4),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_type ON knowledge(source_type);
CREATE INDEX idx_knowledge_category ON knowledge(category);
CREATE INDEX idx_knowledge_tags ON knowledge USING gin(tags);

-- =============================================================================
-- LIBRARY CACHE TABLE (Context7 docs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS library_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id      VARCHAR(100) NOT NULL,
    query_hash      VARCHAR(64) NOT NULL,

    -- Cached content
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',

    -- TTL management
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    hit_count       INTEGER DEFAULT 0,
    last_hit_at     TIMESTAMPTZ,

    UNIQUE(library_id, query_hash)
);

CREATE INDEX idx_library_cache_library ON library_cache(library_id);
CREATE INDEX idx_library_cache_expires ON library_cache(expires_at);

-- =============================================================================
-- POJ BLOCKS TABLE (Proof of Judgment blockchain)
-- =============================================================================

CREATE TABLE IF NOT EXISTS poj_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_number    BIGINT UNIQUE NOT NULL,

    -- Block data
    block_hash      VARCHAR(64) UNIQUE NOT NULL,
    prev_hash       VARCHAR(64) NOT NULL,
    merkle_root     VARCHAR(64) NOT NULL,

    -- Content
    judgment_count  INTEGER NOT NULL,
    judgment_ids    TEXT[] NOT NULL,

    -- Metadata
    timestamp       TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poj_blocks_number ON poj_blocks(block_number DESC);
CREATE INDEX idx_poj_blocks_hash ON poj_blocks(block_hash);

-- =============================================================================
-- ANOMALIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS anomalies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_id      VARCHAR(32) UNIQUE NOT NULL,  -- ano_xxxxx

    -- Detection
    source_type     VARCHAR(50) NOT NULL,  -- judgment, pattern, session
    source_id       VARCHAR(64),

    -- Details
    severity        VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description     TEXT NOT NULL,
    residual        DECIMAL(5,4),

    -- Status
    acknowledged    BOOLEAN DEFAULT FALSE,
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalies_severity ON anomalies(severity);
CREATE INDEX idx_anomalies_resolved ON anomalies(resolved);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER patterns_updated_at BEFORE UPDATE ON patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- CLEANUP FUNCTION (for expired sessions)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS _migrations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL,
    applied_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO _migrations (name) VALUES ('001_initial')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================

-- φ⁻¹ = 61.8% max confidence
-- CYNIC Database Schema v1 - Ready
