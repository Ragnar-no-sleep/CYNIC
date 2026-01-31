-- Migration 022: Session Patterns - Cross-Session Pattern Persistence
--
-- "Patterns detected in a session should survive the session"
--
-- This migration enables CYNIC to remember patterns detected by the
-- Observer and Digester hooks across sessions.

-- =============================================================================
-- SESSION PATTERNS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS session_patterns (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          VARCHAR(64) NOT NULL,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_type        VARCHAR(50) NOT NULL,      -- SEQUENCE, ANOMALY, REPETITION, CYCLE, etc.
    pattern_name        VARCHAR(200),
    confidence          DECIMAL(5,4) DEFAULT 0.618, -- φ⁻¹ max
    occurrences         INTEGER DEFAULT 1,
    context             JSONB DEFAULT '{}',         -- Tool sequence, files, etc.
    detected_at         TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_session_patterns_confidence
        CHECK (confidence >= 0 AND confidence <= 0.618)
);

-- Index for loading recent patterns by user
CREATE INDEX IF NOT EXISTS idx_session_patterns_user_recent
    ON session_patterns(user_id, detected_at DESC);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_session_patterns_session
    ON session_patterns(session_id);

-- Index for pattern type analysis
CREATE INDEX IF NOT EXISTS idx_session_patterns_type
    ON session_patterns(pattern_type, user_id);

-- Partial index for high-confidence patterns (above φ⁻²)
CREATE INDEX IF NOT EXISTS idx_session_patterns_high_confidence
    ON session_patterns(user_id, confidence DESC)
    WHERE confidence >= 0.382;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Save multiple patterns from a session
CREATE OR REPLACE FUNCTION save_session_patterns(
    p_session_id VARCHAR(64),
    p_user_id UUID,
    p_patterns JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    pattern_record JSONB;
    inserted_count INTEGER := 0;
BEGIN
    FOR pattern_record IN SELECT * FROM jsonb_array_elements(p_patterns)
    LOOP
        INSERT INTO session_patterns (
            session_id,
            user_id,
            pattern_type,
            pattern_name,
            confidence,
            occurrences,
            context
        ) VALUES (
            p_session_id,
            p_user_id,
            pattern_record->>'type',
            pattern_record->>'name',
            LEAST(0.618, COALESCE((pattern_record->>'confidence')::DECIMAL, 0.5)),
            COALESCE((pattern_record->>'occurrences')::INTEGER, 1),
            COALESCE(pattern_record->'context', '{}'::JSONB)
        );
        inserted_count := inserted_count + 1;
    END LOOP;

    RETURN inserted_count;
END;
$$;

-- Load recent patterns for a user (for session start)
CREATE OR REPLACE FUNCTION load_recent_patterns(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', pattern_type,
            'name', pattern_name,
            'confidence', confidence,
            'occurrences', occurrences,
            'context', context,
            'detectedAt', detected_at,
            'sessionId', session_id
        ) ORDER BY detected_at DESC
    ), '[]'::JSONB)
    INTO result
    FROM (
        SELECT DISTINCT ON (pattern_type, pattern_name)
            id, pattern_type, pattern_name, confidence,
            occurrences, context, detected_at, session_id
        FROM session_patterns
        WHERE user_id = p_user_id
        ORDER BY pattern_type, pattern_name, detected_at DESC
    ) recent_unique
    LIMIT p_limit;

    RETURN result;
END;
$$;

-- Get pattern statistics for a user
CREATE OR REPLACE FUNCTION get_pattern_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'totalPatterns', COUNT(*),
        'uniquePatterns', COUNT(DISTINCT pattern_name),
        'avgConfidence', ROUND(AVG(confidence)::numeric, 4),
        'byType', (
            SELECT COALESCE(jsonb_object_agg(pattern_type, cnt), '{}'::JSONB)
            FROM (
                SELECT pattern_type, COUNT(*) as cnt
                FROM session_patterns
                WHERE user_id = p_user_id
                GROUP BY pattern_type
            ) type_counts
        ),
        'mostRecent', (
            SELECT pattern_name FROM session_patterns
            WHERE user_id = p_user_id
            ORDER BY detected_at DESC
            LIMIT 1
        ),
        'highConfidence', (
            SELECT COUNT(*) FROM session_patterns
            WHERE user_id = p_user_id AND confidence >= 0.382
        )
    )
    INTO result
    FROM session_patterns
    WHERE user_id = p_user_id;

    RETURN COALESCE(result, jsonb_build_object(
        'totalPatterns', 0,
        'uniquePatterns', 0,
        'avgConfidence', 0,
        'byType', '{}'::JSONB,
        'mostRecent', NULL,
        'highConfidence', 0
    ));
END;
$$;

-- Cleanup old patterns (keep last 30 days per user, max 500 patterns)
CREATE OR REPLACE FUNCTION cleanup_old_patterns()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete patterns older than 30 days
    DELETE FROM session_patterns
    WHERE detected_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Keep only 500 most recent per user
    DELETE FROM session_patterns sp
    WHERE sp.id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY user_id
                ORDER BY detected_at DESC
            ) as rn
            FROM session_patterns
        ) ranked
        WHERE rn <= 500
    );

    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE session_patterns IS
'Session-detected patterns for cross-session persistence. Enables CYNIC to remember what it learned in previous sessions.';

COMMENT ON FUNCTION save_session_patterns IS
'Bulk save patterns from a session. Called by sleep.js hook.';

COMMENT ON FUNCTION load_recent_patterns IS
'Load recent unique patterns for session start. Called by awaken.js hook.';

COMMENT ON FUNCTION get_pattern_stats IS
'Get pattern statistics for a user. Useful for /status skill.';
