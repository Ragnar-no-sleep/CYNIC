-- =============================================================================
-- Migration 034: Unified Signals Table
-- =============================================================================
-- The ONE TYPE that unifies all learning signals:
-- RLHF Feedback, DPO Pairs, Q-Learning Episodes, Telemetry Events
--
-- "Une seule verite, un seul type" - CYNIC
--
-- UnifiedSignalStore._persist() (unified-signal.js:534) writes here.
-- Without this table, the unified learning vision is broken.
-- =============================================================================

CREATE TABLE IF NOT EXISTS unified_signals (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,                    -- tool_execution, judgment, user_feedback, etc.
  session_id TEXT,
  input JSONB NOT NULL DEFAULT '{}',       -- { itemType, taskType, tool, dog, features }
  judgment JSONB NOT NULL DEFAULT '{}',    -- { judgmentId, qScore, verdict, confidence }
  outcome JSONB NOT NULL DEFAULT '{}',     -- { status, actualScore, reason }
  telemetry JSONB NOT NULL DEFAULT '{}',   -- { latencyMs, tokensUsed, model }
  learning JSONB NOT NULL DEFAULT '{}',    -- { reward, scoreDelta, feedbackType, canPair }
  metadata JSONB NOT NULL DEFAULT '{}'     -- { arbitrary context }
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_unified_signals_timestamp ON unified_signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_unified_signals_session ON unified_signals(session_id);
CREATE INDEX IF NOT EXISTS idx_unified_signals_source ON unified_signals(source);

-- JSONB indexes for common queries
CREATE INDEX IF NOT EXISTS idx_unified_signals_qscore ON unified_signals((judgment->>'qScore'));
CREATE INDEX IF NOT EXISTS idx_unified_signals_outcome ON unified_signals((outcome->>'status'));
CREATE INDEX IF NOT EXISTS idx_unified_signals_canpair ON unified_signals((learning->>'canPair'));

-- Cleanup function (30-day retention)
CREATE OR REPLACE FUNCTION cleanup_unified_signals(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM unified_signals
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql;
