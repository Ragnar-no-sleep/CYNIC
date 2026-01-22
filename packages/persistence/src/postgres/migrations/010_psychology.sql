-- =============================================================================
-- Migration 010: Psychology System Tables
-- "Comprendre l'humain pour mieux l'aider" - κυνικός
-- =============================================================================

-- User psychology state (dimensions, emotions, calibration)
CREATE TABLE IF NOT EXISTS user_psychology (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Psychological state
    dimensions JSONB NOT NULL DEFAULT '{}',      -- energy, focus, creativity, frustration, confidence, riskAppetite
    emotions JSONB NOT NULL DEFAULT '{}',         -- joy, pride, shame, anxiety, boredom, curiosity
    temporal JSONB NOT NULL DEFAULT '{}',         -- session info, action intervals

    -- Learning calibration
    calibration JSONB NOT NULL DEFAULT '{
        "psychology": {"correct": 0, "total": 0, "accuracy": 0.618},
        "biases": {"correct": 0, "total": 0, "accuracy": 0.618},
        "topology": {"correct": 0, "total": 0, "accuracy": 0.618},
        "interventions": {"correct": 0, "total": 0, "accuracy": 0.618},
        "overall": {"correct": 0, "total": 0, "accuracy": 0.618},
        "confidenceMultiplier": 1.0
    }',

    -- User patterns
    user_patterns JSONB NOT NULL DEFAULT '{
        "productiveHours": [],
        "lowEnergyHours": [],
        "preferredBreakDuration": null,
        "preferredSessionLength": null,
        "responseToNudges": {},
        "strongSkills": [],
        "growingSkills": []
    }',

    -- Intervention stats
    intervention_stats JSONB NOT NULL DEFAULT '{
        "totalInterventions": 0,
        "acknowledged": 0,
        "ignored": 0,
        "effectivenessScore": 0.618
    }',

    -- Metadata
    session_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_psychology UNIQUE (user_id)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_psychology_user
    ON user_psychology(user_id);

-- Psychology interventions log
CREATE TABLE IF NOT EXISTS psychology_interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    intervention_type VARCHAR(100) NOT NULL,      -- burnout, frustration, rabbit_hole, bias_*, etc.
    intensity VARCHAR(20) NOT NULL,               -- silent, hint, nudge, suggest, strong
    message TEXT,                                  -- The intervention message shown
    response VARCHAR(50),                          -- acknowledged, ignored, dismissed
    was_effective BOOLEAN,                         -- Did it help? (may be null if unknown)
    context JSONB NOT NULL DEFAULT '{}',          -- Additional context

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for intervention analysis
CREATE INDEX IF NOT EXISTS idx_psychology_interventions_user
    ON psychology_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_psychology_interventions_type
    ON psychology_interventions(intervention_type);
CREATE INDEX IF NOT EXISTS idx_psychology_interventions_effective
    ON psychology_interventions(was_effective) WHERE was_effective IS NOT NULL;

-- Learning observations log
CREATE TABLE IF NOT EXISTS psychology_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    module VARCHAR(50) NOT NULL,                   -- psychology, biases, topology, interventions
    prediction VARCHAR(255),                       -- What CYNIC predicted
    actual VARCHAR(255),                           -- What actually happened
    correct BOOLEAN NOT NULL,                      -- Was prediction correct?
    context JSONB NOT NULL DEFAULT '{}',          -- Additional context

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for observation analysis
CREATE INDEX IF NOT EXISTS idx_psychology_observations_user
    ON psychology_observations(user_id);
CREATE INDEX IF NOT EXISTS idx_psychology_observations_module
    ON psychology_observations(module);
CREATE INDEX IF NOT EXISTS idx_psychology_observations_correct
    ON psychology_observations(correct);
CREATE INDEX IF NOT EXISTS idx_psychology_observations_recent
    ON psychology_observations(created_at DESC);

-- =============================================================================
-- Helper function: Deep merge JSONB
-- =============================================================================

CREATE OR REPLACE FUNCTION jsonb_deep_merge(target JSONB, source JSONB)
RETURNS JSONB AS $$
DECLARE
    key TEXT;
    result JSONB;
BEGIN
    result := target;

    FOR key IN SELECT jsonb_object_keys(source)
    LOOP
        IF jsonb_typeof(source->key) = 'object' AND jsonb_typeof(target->key) = 'object' THEN
            result := jsonb_set(result, ARRAY[key], jsonb_deep_merge(target->key, source->key));
        ELSE
            result := jsonb_set(result, ARRAY[key], source->key);
        END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- Trigger for auto-updating timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION update_psychology_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_psychology_updated ON user_psychology;
CREATE TRIGGER trigger_psychology_updated
    BEFORE UPDATE ON user_psychology
    FOR EACH ROW
    EXECUTE FUNCTION update_psychology_timestamp();

-- =============================================================================
-- Views for analytics
-- =============================================================================

-- View: Psychology overview by user
CREATE OR REPLACE VIEW v_psychology_overview AS
SELECT
    p.user_id,
    u.username,
    p.session_count,
    (p.dimensions->>'energy')::float as energy,
    (p.dimensions->>'focus')::float as focus,
    (p.dimensions->>'frustration')::float as frustration,
    (p.calibration->'overall'->>'accuracy')::float as accuracy,
    p.intervention_stats->>'effectivenessScore' as intervention_effectiveness,
    p.updated_at
FROM user_psychology p
JOIN users u ON u.id = p.user_id;

-- View: Intervention effectiveness summary
CREATE OR REPLACE VIEW v_intervention_effectiveness AS
SELECT
    intervention_type,
    COUNT(*) as total,
    SUM(CASE WHEN was_effective THEN 1 ELSE 0 END) as effective,
    AVG(CASE WHEN was_effective THEN 1.0 ELSE 0.0 END) as effectiveness_rate,
    COUNT(DISTINCT user_id) as unique_users
FROM psychology_interventions
WHERE was_effective IS NOT NULL
GROUP BY intervention_type;

-- View: Learning accuracy by module
CREATE OR REPLACE VIEW v_learning_accuracy AS
SELECT
    module,
    COUNT(*) as total_observations,
    SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct_count,
    AVG(CASE WHEN correct THEN 1.0 ELSE 0.0 END) as accuracy
FROM psychology_observations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY module;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE user_psychology IS 'Cross-session psychology state for CYNIC human understanding';
COMMENT ON TABLE psychology_interventions IS 'Log of CYNIC interventions and their outcomes';
COMMENT ON TABLE psychology_observations IS 'Learning loop observations for calibration';
COMMENT ON FUNCTION jsonb_deep_merge IS 'Recursively merge two JSONB objects';
