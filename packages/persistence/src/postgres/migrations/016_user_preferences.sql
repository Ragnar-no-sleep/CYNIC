-- CYNIC Database Schema - User Preferences
-- φ guides all ratios
--
-- Migration: 016_user_preferences
-- Created: 2026-01-28
-- Purpose: User preferences for judgment, automation, and UI settings

-- =============================================================================
-- USER PREFERENCES TABLE
-- =============================================================================
-- Stores per-user preferences that persist across sessions

CREATE TABLE IF NOT EXISTS user_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             VARCHAR(255) NOT NULL UNIQUE,

    -- Judgment preferences
    judgment_strictness FLOAT DEFAULT 0.5 CHECK (judgment_strictness >= 0 AND judgment_strictness <= 1),
    auto_judge          BOOLEAN DEFAULT TRUE,           -- Auto-judge enabled
    min_confidence      FLOAT DEFAULT 0.382,            -- φ⁻² minimum confidence threshold

    -- Automation preferences
    auto_learn          BOOLEAN DEFAULT TRUE,           -- Auto-learning enabled
    learning_rate       FLOAT DEFAULT 0.236,            -- φ⁻³ learning rate
    auto_notifications  BOOLEAN DEFAULT TRUE,           -- Proactive notifications enabled

    -- UI preferences
    theme               VARCHAR(50) DEFAULT 'dark',
    language            VARCHAR(10) DEFAULT 'en',
    timezone            VARCHAR(50),

    -- Notification preferences
    notification_level  VARCHAR(20) DEFAULT 'normal' CHECK (notification_level IN (
        'silent', 'minimal', 'normal', 'verbose'
    )),
    email_notifications BOOLEAN DEFAULT FALSE,

    -- Feature flags (JSONB for flexibility)
    features            JSONB DEFAULT '{}',

    -- Custom preferences (JSONB for extensibility)
    custom              JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme ON user_preferences(theme);

-- =============================================================================
-- PREFERENCE HISTORY TABLE
-- =============================================================================
-- Tracks preference changes for audit/rollback

CREATE TABLE IF NOT EXISTS user_preference_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             VARCHAR(255) NOT NULL,
    preference_key      VARCHAR(100) NOT NULL,
    old_value           JSONB,
    new_value           JSONB,
    changed_by          VARCHAR(100) DEFAULT 'user',    -- user, system, admin
    change_reason       TEXT,
    changed_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pref_history_user ON user_preference_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pref_history_time ON user_preference_history(changed_at DESC);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get preference with default
CREATE OR REPLACE FUNCTION get_user_preference(
    p_user_id VARCHAR(255),
    p_key VARCHAR(100),
    p_default JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    EXECUTE format(
        'SELECT to_jsonb(%I) FROM user_preferences WHERE user_id = $1',
        p_key
    ) INTO v_value USING p_user_id;

    RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql;

-- Set preference with history tracking
CREATE OR REPLACE FUNCTION set_user_preference(
    p_user_id VARCHAR(255),
    p_key VARCHAR(100),
    p_value JSONB,
    p_changed_by VARCHAR(100) DEFAULT 'user',
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_value JSONB;
BEGIN
    -- Ensure user preferences row exists
    INSERT INTO user_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get old value
    EXECUTE format(
        'SELECT to_jsonb(%I) FROM user_preferences WHERE user_id = $1',
        p_key
    ) INTO v_old_value USING p_user_id;

    -- Update the preference
    EXECUTE format(
        'UPDATE user_preferences SET %I = $1, updated_at = NOW() WHERE user_id = $2',
        p_key
    ) USING p_value, p_user_id;

    -- Record history
    INSERT INTO user_preference_history (
        user_id, preference_key, old_value, new_value, changed_by, change_reason
    ) VALUES (
        p_user_id, p_key, v_old_value, p_value, p_changed_by, p_reason
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get all preferences for a user
CREATE OR REPLACE FUNCTION get_all_user_preferences(p_user_id VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'judgment_strictness', judgment_strictness,
        'auto_judge', auto_judge,
        'min_confidence', min_confidence,
        'auto_learn', auto_learn,
        'learning_rate', learning_rate,
        'auto_notifications', auto_notifications,
        'theme', theme,
        'language', language,
        'timezone', timezone,
        'notification_level', notification_level,
        'email_notifications', email_notifications,
        'features', features,
        'custom', custom
    )
    INTO v_result
    FROM user_preferences
    WHERE user_id = p_user_id;

    -- Return defaults if no row exists
    IF v_result IS NULL THEN
        v_result := jsonb_build_object(
            'judgment_strictness', 0.5,
            'auto_judge', true,
            'min_confidence', 0.382,
            'auto_learn', true,
            'learning_rate', 0.236,
            'auto_notifications', true,
            'theme', 'dark',
            'language', 'en',
            'timezone', null,
            'notification_level', 'normal',
            'email_notifications', false,
            'features', '{}',
            'custom', '{}'
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- DEFAULT PREFERENCES (for system)
-- =============================================================================

INSERT INTO user_preferences (user_id, theme, auto_learn, auto_judge)
VALUES ('system', 'dark', true, true)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- MIGRATION TRACKING
-- =============================================================================

INSERT INTO _migrations (name) VALUES ('016_user_preferences')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================

-- φ⁻¹ = 61.8% max confidence
-- User preferences infrastructure ready
-- Tracks: judgment, automation, UI, notifications
