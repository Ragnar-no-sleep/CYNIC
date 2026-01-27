-- =============================================================================
-- Migration 012: Fix Profile Sync - ADD deltas instead of REPLACE
-- =============================================================================
-- The original sync_user_profile function replaced stats with incoming values.
-- This caused data loss when local profiles contained session deltas.
--
-- Now: local stats are ADDED to existing totals (they're session deltas).
--
-- "Addition preserves. Replacement destroys." - κυνικός
-- =============================================================================

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
        p_identity,
        p_stats,
        p_patterns,
        p_preferences,
        p_memory,
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
        -- Patterns: deep merge (union arrays, sum counts)
        profile_patterns = jsonb_build_object(
            'preferredLanguages', (
                SELECT jsonb_agg(DISTINCT lang)
                FROM (
                    SELECT jsonb_array_elements_text(
                        COALESCE(user_learning_profiles.profile_patterns->'preferredLanguages', '[]'::JSONB)
                    ) AS lang
                    UNION
                    SELECT jsonb_array_elements_text(
                        COALESCE(p_patterns->'preferredLanguages', '[]'::JSONB)
                    ) AS lang
                ) combined
            ),
            'commonTools', merge_jsonb_counts(
                COALESCE(user_learning_profiles.profile_patterns->'commonTools', '{}'::JSONB),
                COALESCE(p_patterns->'commonTools', '{}'::JSONB)
            ),
            'workingHours', merge_jsonb_counts(
                COALESCE(user_learning_profiles.profile_patterns->'workingHours', '{}'::JSONB),
                COALESCE(p_patterns->'workingHours', '{}'::JSONB)
            ),
            'projectTypes', (
                SELECT jsonb_agg(DISTINCT pt)
                FROM (
                    SELECT jsonb_array_elements_text(
                        COALESCE(user_learning_profiles.profile_patterns->'projectTypes', '[]'::JSONB)
                    ) AS pt
                    UNION
                    SELECT jsonb_array_elements_text(
                        COALESCE(p_patterns->'projectTypes', '[]'::JSONB)
                    ) AS pt
                ) combined
            )
        ),
        -- Preferences: replace with latest
        profile_preferences = COALESCE(p_preferences, user_learning_profiles.profile_preferences),
        -- Memory: merge carefully
        profile_memory = jsonb_build_object(
            'recentProjects', (
                SELECT jsonb_agg(proj)
                FROM (
                    SELECT DISTINCT ON (proj) proj
                    FROM (
                        SELECT jsonb_array_elements(
                            COALESCE(p_memory->'recentProjects', '[]'::JSONB)
                        ) AS proj
                        UNION ALL
                        SELECT jsonb_array_elements(
                            COALESCE(user_learning_profiles.profile_memory->'recentProjects', '[]'::JSONB)
                        ) AS proj
                    ) all_projects
                    LIMIT 20
                ) limited
            ),
            'ongoingTasks', COALESCE(p_memory->'ongoingTasks', '[]'::JSONB),
            'decisions', (
                SELECT jsonb_agg(dec)
                FROM (
                    SELECT jsonb_array_elements(
                        COALESCE(p_memory->'decisions', '[]'::JSONB)
                    ) AS dec
                    UNION ALL
                    SELECT jsonb_array_elements(
                        COALESCE(user_learning_profiles.profile_memory->'decisions', '[]'::JSONB)
                    ) AS dec
                    ORDER BY (dec->>'timestamp')::TIMESTAMPTZ DESC NULLS LAST
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
-- HELPER FUNCTION: Merge JSONB count objects (sum values)
-- =============================================================================

CREATE OR REPLACE FUNCTION merge_jsonb_counts(
    existing JSONB,
    incoming JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB := existing;
    key TEXT;
    val INTEGER;
BEGIN
    FOR key, val IN SELECT * FROM jsonb_each_text(incoming)
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
-- COMMENT
-- =============================================================================

COMMENT ON FUNCTION sync_user_profile IS
'Sync user profile from hooks to database. Stats are ADDED (deltas), not replaced.';

COMMENT ON FUNCTION merge_jsonb_counts IS
'Merge two JSONB objects with integer values by summing them.';
