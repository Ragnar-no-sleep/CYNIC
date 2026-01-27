-- =============================================================================
-- Migration 014: Fix sync_user_profile SQL syntax
-- =============================================================================
-- Migration 012 had invalid SQL: ORDER BY inside UNION ALL.
-- PostgreSQL requires ORDER BY to be outside the UNION.
--
-- "Syntax matters. Details matter." - κυνικός
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTION: Merge JSONB count objects (sum values)
-- =============================================================================

CREATE OR REPLACE FUNCTION merge_jsonb_counts(
    existing JSONB,
    incoming JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB := COALESCE(existing, '{}'::JSONB);
    key TEXT;
    val TEXT;
BEGIN
    FOR key, val IN SELECT * FROM jsonb_each_text(COALESCE(incoming, '{}'::JSONB))
    LOOP
        result := jsonb_set(
            result,
            ARRAY[key],
            to_jsonb(COALESCE((result->>key)::INTEGER, 0) + COALESCE(val::INTEGER, 0))
        );
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIXED PROFILE SYNC FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_user_profile(
    p_user_id UUID,
    p_identity JSONB,
    p_stats JSONB,
    p_patterns JSONB,
    p_preferences JSONB,
    p_memory JSONB
) RETURNS user_learning_profiles AS $$
DECLARE
    result user_learning_profiles;
    delta_sessions INTEGER;
    delta_tool_calls INTEGER;
    delta_errors INTEGER;
    delta_danger_blocked INTEGER;
BEGIN
    -- Extract deltas from incoming stats (session-only increments)
    delta_sessions := COALESCE((p_stats->>'sessions')::INTEGER, 0);
    delta_tool_calls := COALESCE((p_stats->>'toolCalls')::INTEGER, 0);
    delta_errors := COALESCE((p_stats->>'errorsEncountered')::INTEGER, 0);
    delta_danger_blocked := COALESCE((p_stats->>'dangerBlocked')::INTEGER, 0);

    INSERT INTO user_learning_profiles (
        user_id,
        profile_identity,
        profile_stats,
        profile_patterns,
        profile_preferences,
        profile_memory,
        session_count,
        total_tool_calls,
        total_errors,
        total_danger_blocked,
        last_session_at
    ) VALUES (
        p_user_id,
        COALESCE(p_identity, '{}'::JSONB),
        COALESCE(p_stats, '{}'::JSONB),
        COALESCE(p_patterns, '{}'::JSONB),
        COALESCE(p_preferences, '{}'::JSONB),
        COALESCE(p_memory, '{}'::JSONB),
        delta_sessions,
        delta_tool_calls,
        delta_errors,
        delta_danger_blocked,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        -- Identity: merge, keeping earliest firstSeen
        profile_identity = jsonb_build_object(
            'name', COALESCE(p_identity->>'name', user_learning_profiles.profile_identity->>'name'),
            'email', COALESCE(p_identity->>'email', user_learning_profiles.profile_identity->>'email'),
            'firstSeen', COALESCE(
                user_learning_profiles.profile_identity->>'firstSeen',
                p_identity->>'firstSeen'
            ),
            'lastSeen', COALESCE(p_identity->>'lastSeen', NOW()::TEXT)
        ),
        -- Stats: ADD deltas to existing totals
        profile_stats = jsonb_build_object(
            'sessions', COALESCE((user_learning_profiles.profile_stats->>'sessions')::INTEGER, 0) + delta_sessions,
            'toolCalls', COALESCE((user_learning_profiles.profile_stats->>'toolCalls')::INTEGER, 0) + delta_tool_calls,
            'errorsEncountered', COALESCE((user_learning_profiles.profile_stats->>'errorsEncountered')::INTEGER, 0) + delta_errors,
            'dangerBlocked', COALESCE((user_learning_profiles.profile_stats->>'dangerBlocked')::INTEGER, 0) + delta_danger_blocked,
            'commitsWithCynic', COALESCE((user_learning_profiles.profile_stats->>'commitsWithCynic')::INTEGER, 0) +
                                 COALESCE((p_stats->>'commitsWithCynic')::INTEGER, 0),
            'judgmentsMade', COALESCE((user_learning_profiles.profile_stats->>'judgmentsMade')::INTEGER, 0) +
                              COALESCE((p_stats->>'judgmentsMade')::INTEGER, 0),
            'judgmentsCorrect', COALESCE((user_learning_profiles.profile_stats->>'judgmentsCorrect')::INTEGER, 0) +
                                 COALESCE((p_stats->>'judgmentsCorrect')::INTEGER, 0)
        ),
        -- Patterns: deep merge (simplified - just merge counts)
        profile_patterns = jsonb_build_object(
            'preferredLanguages', COALESCE(
                user_learning_profiles.profile_patterns->'preferredLanguages',
                '[]'::JSONB
            ) || COALESCE(p_patterns->'preferredLanguages', '[]'::JSONB),
            'commonTools', merge_jsonb_counts(
                user_learning_profiles.profile_patterns->'commonTools',
                p_patterns->'commonTools'
            ),
            'workingHours', merge_jsonb_counts(
                user_learning_profiles.profile_patterns->'workingHours',
                p_patterns->'workingHours'
            ),
            'projectTypes', COALESCE(
                user_learning_profiles.profile_patterns->'projectTypes',
                '[]'::JSONB
            ) || COALESCE(p_patterns->'projectTypes', '[]'::JSONB)
        ),
        -- Preferences: replace with latest
        profile_preferences = COALESCE(p_preferences, user_learning_profiles.profile_preferences),
        -- Memory: simplified merge (just combine arrays, limit later in app)
        profile_memory = jsonb_build_object(
            'recentProjects', (
                SELECT COALESCE(jsonb_agg(proj), '[]'::JSONB)
                FROM (
                    SELECT DISTINCT proj
                    FROM (
                        SELECT jsonb_array_elements(
                            COALESCE(p_memory->'recentProjects', '[]'::JSONB)
                        ) AS proj
                        UNION
                        SELECT jsonb_array_elements(
                            COALESCE(user_learning_profiles.profile_memory->'recentProjects', '[]'::JSONB)
                        ) AS proj
                    ) all_projects
                    LIMIT 20
                ) limited
            ),
            'ongoingTasks', COALESCE(p_memory->'ongoingTasks', '[]'::JSONB),
            'decisions', (
                SELECT COALESCE(jsonb_agg(dec ORDER BY (dec->>'timestamp')::TIMESTAMPTZ DESC NULLS LAST), '[]'::JSONB)
                FROM (
                    SELECT dec
                    FROM (
                        SELECT jsonb_array_elements(
                            COALESCE(p_memory->'decisions', '[]'::JSONB)
                        ) AS dec
                        UNION ALL
                        SELECT jsonb_array_elements(
                            COALESCE(user_learning_profiles.profile_memory->'decisions', '[]'::JSONB)
                        ) AS dec
                    ) combined
                    LIMIT 100
                ) limited
            )
        ),
        -- Counters: ADD deltas
        session_count = user_learning_profiles.session_count + delta_sessions,
        total_tool_calls = user_learning_profiles.total_tool_calls + delta_tool_calls,
        total_errors = user_learning_profiles.total_errors + delta_errors,
        total_danger_blocked = user_learning_profiles.total_danger_blocked + delta_danger_blocked,
        last_session_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION sync_user_profile IS
'Sync user profile from hooks to database. Stats are ADDED (deltas), not replaced. Fixed ORDER BY syntax.';

-- =============================================================================
-- MIGRATION TRACKING
-- =============================================================================

INSERT INTO _migrations (name) VALUES ('014_fix_sync_function_syntax')
ON CONFLICT (name) DO NOTHING;
