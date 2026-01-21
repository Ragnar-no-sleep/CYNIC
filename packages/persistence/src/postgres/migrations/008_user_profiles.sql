-- =============================================================================
-- Migration 008: User Profiles - Cross-Session Memory
-- =============================================================================
-- Extends user_learning_profiles with full profile data from hooks.
-- Enables persistent memory across Claude Code sessions.
--
-- "φ remembers. The dog never forgets its master."
-- =============================================================================

-- Add profile columns to user_learning_profiles
ALTER TABLE user_learning_profiles
ADD COLUMN IF NOT EXISTS profile_identity JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_stats JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_patterns JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_memory JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_tool_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_errors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_danger_blocked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_session
ON user_learning_profiles(last_session_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_profiles_session_count
ON user_learning_profiles(session_count DESC);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN user_learning_profiles.profile_identity IS
'User identity info: name, email, firstSeen, lastSeen';

COMMENT ON COLUMN user_learning_profiles.profile_stats IS
'Aggregated session stats: sessions, toolCalls, errors, dangerBlocked';

COMMENT ON COLUMN user_learning_profiles.profile_patterns IS
'Detected patterns: preferredLanguages, commonTools, workingHours, projectTypes';

COMMENT ON COLUMN user_learning_profiles.profile_preferences IS
'User preferences: communicationStyle, interventionLevel, riskTolerance';

COMMENT ON COLUMN user_learning_profiles.profile_memory IS
'User memory: recentProjects, ongoingTasks, decisions';

-- =============================================================================
-- PROFILE SYNC FUNCTION
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
BEGIN
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
        COALESCE((p_stats->>'sessions')::INTEGER, 1),
        COALESCE((p_stats->>'toolCalls')::INTEGER, 0),
        COALESCE((p_stats->>'errorsEncountered')::INTEGER, 0),
        COALESCE((p_stats->>'dangerBlocked')::INTEGER, 0),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        profile_identity = COALESCE(p_identity, user_learning_profiles.profile_identity),
        profile_stats = COALESCE(p_stats, user_learning_profiles.profile_stats),
        profile_patterns = user_learning_profiles.profile_patterns || COALESCE(p_patterns, '{}'),
        profile_preferences = COALESCE(p_preferences, user_learning_profiles.profile_preferences),
        profile_memory = COALESCE(p_memory, user_learning_profiles.profile_memory),
        session_count = COALESCE((p_stats->>'sessions')::INTEGER, user_learning_profiles.session_count),
        total_tool_calls = COALESCE((p_stats->>'toolCalls')::INTEGER, user_learning_profiles.total_tool_calls),
        total_errors = COALESCE((p_stats->>'errorsEncountered')::INTEGER, user_learning_profiles.total_errors),
        total_danger_blocked = COALESCE((p_stats->>'dangerBlocked')::INTEGER, user_learning_profiles.total_danger_blocked),
        last_session_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PROFILE LOAD FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION load_user_profile(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_row user_learning_profiles;
BEGIN
    SELECT * INTO profile_row
    FROM user_learning_profiles
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'userId', profile_row.user_id,
        'identity', COALESCE(profile_row.profile_identity, '{}'),
        'stats', COALESCE(profile_row.profile_stats, '{}'),
        'patterns', COALESCE(profile_row.profile_patterns, '{}'),
        'preferences', COALESCE(profile_row.profile_preferences, '{}'),
        'memory', COALESCE(profile_row.profile_memory, '{}'),
        'learning', jsonb_build_object(
            'learningRate', profile_row.learning_rate,
            'totalFeedback', profile_row.total_feedback,
            'accuracy', profile_row.accuracy,
            'activityTimes', COALESCE(profile_row.activity_times, '{}')
        ),
        'meta', jsonb_build_object(
            'sessionCount', profile_row.session_count,
            'firstSeen', profile_row.first_seen_at,
            'lastSession', profile_row.last_session_at
        )
    );
END;
$$ LANGUAGE plpgsql;
