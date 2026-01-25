-- =============================================================================
-- Migration 011: Orchestration - Keter Routing Log
-- =============================================================================
-- Logs orchestration decisions from the brain_keter tool.
-- Tracks sefirah routing, interventions, and risk levels.
--
-- "Le chien observe le flux des decisions."
-- =============================================================================

-- =============================================================================
-- ORCHESTRATION LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS orchestration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event details
    event_type TEXT NOT NULL,
    user_id TEXT,

    -- Routing decision
    sefirah TEXT NOT NULL,
    intervention TEXT,
    risk_level TEXT DEFAULT 'low',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_orchestration_user
ON orchestration_log(user_id);

CREATE INDEX IF NOT EXISTS idx_orchestration_event
ON orchestration_log(event_type);

CREATE INDEX IF NOT EXISTS idx_orchestration_sefirah
ON orchestration_log(sefirah);

CREATE INDEX IF NOT EXISTS idx_orchestration_created
ON orchestration_log(created_at DESC);

-- Partial index for high-risk events
CREATE INDEX IF NOT EXISTS idx_orchestration_high_risk
ON orchestration_log(user_id, created_at)
WHERE risk_level IN ('high', 'critical');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE orchestration_log IS
'Logs orchestration routing decisions from brain_keter - the crown observes all';

COMMENT ON COLUMN orchestration_log.sefirah IS
'Sefirah that handled the event (keter, chokhmah, binah, chesed, gevurah, tiferet, netzach, hod, yesod, malkhut)';

COMMENT ON COLUMN orchestration_log.intervention IS
'Type of intervention applied (none, soft_warning, redirect, block)';

COMMENT ON COLUMN orchestration_log.risk_level IS
'Risk assessment (low, medium, high, critical)';

-- =============================================================================
-- CLEANUP FUNCTION (keep 30 days of logs)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_orchestration_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM orchestration_log
    WHERE created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_orchestration_logs IS
'Removes orchestration logs older than 30 days - called periodically';
