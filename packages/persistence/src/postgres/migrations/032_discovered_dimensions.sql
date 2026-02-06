-- =============================================================================
-- Migration 032: Discovered Dimensions (THE_UNNAMEABLE)
-- =============================================================================
-- Persists dimensions discovered by ResidualDetector + ResidualGovernance.
-- Without this, discovered dimensions die on restart.
-- With this, CYNIC remembers what it learned to see.
--
-- "THE UNNAMEABLE becomes named through collective wisdom" - κυνικός
-- =============================================================================

-- =============================================================================
-- DISCOVERED DIMENSIONS TABLE
-- =============================================================================
-- When ResidualGovernance promotes a candidate, it becomes a real dimension.
-- This table stores it so the Judge can reload on boot.

CREATE TABLE IF NOT EXISTS discovered_dimensions (
  id              BIGSERIAL PRIMARY KEY,
  dimension_name  VARCHAR(64) NOT NULL UNIQUE,
  axiom           VARCHAR(16) NOT NULL CHECK (axiom IN ('PHI', 'VERIFY', 'CULTURE', 'BURN', 'META')),
  weight          REAL NOT NULL DEFAULT 1.0 CHECK (weight >= 0.1 AND weight <= 2.0),
  threshold       INTEGER NOT NULL DEFAULT 50 CHECK (threshold >= 0 AND threshold <= 100),
  description     TEXT NOT NULL DEFAULT '',
  status          VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  promoted_by     VARCHAR(16) NOT NULL DEFAULT 'governance' CHECK (promoted_by IN ('human', 'governance', 'auto')),
  from_candidate  VARCHAR(128),
  evidence_count  INTEGER NOT NULL DEFAULT 0,
  avg_residual    REAL,
  weak_dimensions TEXT[],
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_discovered_dims_status ON discovered_dimensions (status);
CREATE INDEX IF NOT EXISTS idx_discovered_dims_axiom ON discovered_dimensions (axiom);
CREATE INDEX IF NOT EXISTS idx_discovered_dims_discovered ON discovered_dimensions (discovered_at);

-- =============================================================================
-- RESIDUAL CANDIDATES TABLE
-- =============================================================================
-- Stores candidate dimensions that haven't been promoted yet.
-- Survives restarts so pattern detection is cumulative.

CREATE TABLE IF NOT EXISTS residual_candidates (
  id              BIGSERIAL PRIMARY KEY,
  candidate_key   VARCHAR(128) NOT NULL UNIQUE,
  weak_dimensions TEXT[],
  sample_count    INTEGER NOT NULL DEFAULT 0,
  avg_residual    REAL NOT NULL DEFAULT 0,
  suggested_axiom VARCHAR(16),
  suggested_name  VARCHAR(64),
  confidence      REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'promoted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_residual_candidates_status ON residual_candidates (status);
CREATE INDEX IF NOT EXISTS idx_residual_candidates_confidence ON residual_candidates (confidence DESC);

-- =============================================================================
-- RESIDUAL ANOMALIES TABLE (bounded, recent only)
-- =============================================================================
-- Stores recent anomalies for pattern clustering.
-- Auto-cleaned: only last 1000 kept (Fibonacci-aligned cleanup).

CREATE TABLE IF NOT EXISTS residual_anomalies (
  id              BIGSERIAL PRIMARY KEY,
  judgment_id     VARCHAR(128),
  residual        REAL NOT NULL,
  global_score    REAL,
  dimensions      JSONB DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_residual_anomalies_created ON residual_anomalies (created_at);
CREATE INDEX IF NOT EXISTS idx_residual_anomalies_residual ON residual_anomalies (residual DESC);

-- =============================================================================
-- DIMENSION GOVERNANCE LOG
-- =============================================================================
-- Audit trail of all governance decisions (promotions and rejections).

CREATE TABLE IF NOT EXISTS dimension_governance_log (
  id              BIGSERIAL PRIMARY KEY,
  candidate_key   VARCHAR(128) NOT NULL,
  decision        VARCHAR(16) NOT NULL CHECK (decision IN ('promoted', 'rejected', 'skipped')),
  dimension_name  VARCHAR(64),
  axiom           VARCHAR(16),
  confidence      REAL,
  vote_approval   REAL,
  vote_count      INTEGER,
  reason          TEXT,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_log_decided ON dimension_governance_log (decided_at);

-- =============================================================================
-- CLEANUP FUNCTION (Fibonacci-aligned: 13 day retention for anomalies)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_residual_data() RETURNS void AS $$
BEGIN
  -- Keep only last 1000 anomalies (F(16)=987, round to 1000)
  DELETE FROM residual_anomalies
  WHERE id NOT IN (
    SELECT id FROM residual_anomalies ORDER BY created_at DESC LIMIT 1000
  );

  -- Archive rejected candidates older than 13 days (F(7))
  DELETE FROM residual_candidates
  WHERE status = 'rejected' AND updated_at < NOW() - INTERVAL '13 days';

  -- Archive governance log older than 89 days (F(11))
  DELETE FROM dimension_governance_log
  WHERE decided_at < NOW() - INTERVAL '89 days';
END;
$$ LANGUAGE plpgsql;
