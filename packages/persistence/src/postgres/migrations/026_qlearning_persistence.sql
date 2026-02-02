-- =============================================================================
-- Migration 026: Q-Learning Persistence
-- =============================================================================
-- Persists Q-Table and episode history for QLearningService.
-- Ensures learning survives restarts.
--
-- "Le chien se souvient qui appeler."
-- =============================================================================

-- =============================================================================
-- Q-LEARNING STATE TABLE
-- =============================================================================
-- Stores the Q-Table, exploration rate, and learning stats.
-- Uses singleton pattern with service_id = 'default'.

CREATE TABLE IF NOT EXISTS qlearning_state (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id      VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',

    -- Q-Table data (serialized)
    q_table         JSONB NOT NULL DEFAULT '{"table": {}, "visits": {}, "stats": {"updates": 0, "states": 0}}',

    -- Learning parameters
    exploration_rate DECIMAL(5,4) DEFAULT 0.1,

    -- Stats
    stats           JSONB DEFAULT '{"episodes": 0, "updates": 0, "correctPredictions": 0, "totalFeedback": 0}',

    -- Metadata
    version         INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Create default entry
INSERT INTO qlearning_state (service_id)
VALUES ('default')
ON CONFLICT (service_id) DO NOTHING;

-- =============================================================================
-- Q-LEARNING EPISODES TABLE
-- =============================================================================
-- Stores episode history for analysis and debugging.
-- φ-aligned retention: keep last 1000 episodes.

CREATE TABLE IF NOT EXISTS qlearning_episodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id      VARCHAR(50) UNIQUE NOT NULL,
    service_id      VARCHAR(50) DEFAULT 'default',

    -- Episode features (stored as array and as searchable key)
    features        TEXT[] NOT NULL DEFAULT '{}',

    -- Context
    task_type       VARCHAR(50),
    tool            VARCHAR(50),

    -- Actions taken
    actions         JSONB NOT NULL DEFAULT '[]',

    -- Outcome
    outcome         JSONB DEFAULT '{}',
    reward          DECIMAL(5,4),

    -- Timing
    duration_ms     INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Q-Learning State
CREATE INDEX IF NOT EXISTS idx_qlearning_state_updated
ON qlearning_state(updated_at DESC);

-- Episodes
CREATE INDEX IF NOT EXISTS idx_qlearning_episodes_service
ON qlearning_episodes(service_id);

CREATE INDEX IF NOT EXISTS idx_qlearning_episodes_features
ON qlearning_episodes USING GIN(features);

CREATE INDEX IF NOT EXISTS idx_qlearning_episodes_task
ON qlearning_episodes(task_type);

CREATE INDEX IF NOT EXISTS idx_qlearning_episodes_created
ON qlearning_episodes(created_at DESC);

-- Recent episodes for analysis
CREATE INDEX IF NOT EXISTS idx_qlearning_episodes_recent
ON qlearning_episodes(service_id, created_at DESC);

-- =============================================================================
-- SHARED MEMORY PATTERNS TABLE
-- =============================================================================
-- Persists SharedMemory patterns that would otherwise be lost on restart.

CREATE TABLE IF NOT EXISTS shared_memory_patterns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id       VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',

    -- Pattern data
    patterns        JSONB NOT NULL DEFAULT '[]',
    weights         JSONB NOT NULL DEFAULT '{}',

    -- Stats
    pattern_count   INTEGER DEFAULT 0,
    last_activity   TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Create default entry
INSERT INTO shared_memory_patterns (memory_id)
VALUES ('default')
ON CONFLICT (memory_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_shared_memory_updated
ON shared_memory_patterns(updated_at DESC);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to cleanup old episodes (keep last 1000 per service)
CREATE OR REPLACE FUNCTION cleanup_qlearning_episodes(
    p_service_id VARCHAR DEFAULT 'default',
    p_keep_count INTEGER DEFAULT 1000
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH to_delete AS (
        SELECT id FROM qlearning_episodes
        WHERE service_id = p_service_id
        ORDER BY created_at DESC
        OFFSET p_keep_count
    )
    DELETE FROM qlearning_episodes
    WHERE id IN (SELECT id FROM to_delete);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get learning stats summary
CREATE OR REPLACE FUNCTION get_qlearning_summary(
    p_service_id VARCHAR DEFAULT 'default'
)
RETURNS TABLE (
    total_episodes BIGINT,
    recent_episodes BIGINT,
    avg_reward DECIMAL,
    top_features TEXT[],
    exploration_rate DECIMAL,
    q_states INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM qlearning_episodes WHERE service_id = p_service_id),
        (SELECT COUNT(*) FROM qlearning_episodes WHERE service_id = p_service_id AND created_at > NOW() - INTERVAL '24 hours'),
        (SELECT AVG(e.reward) FROM qlearning_episodes e WHERE e.service_id = p_service_id AND e.reward IS NOT NULL),
        (SELECT ARRAY_AGG(DISTINCT unnest_features) FROM (
            SELECT unnest(features) as unnest_features
            FROM qlearning_episodes
            WHERE service_id = p_service_id
            ORDER BY unnest_features
            LIMIT 10
        ) sub),
        (SELECT s.exploration_rate FROM qlearning_state s WHERE s.service_id = p_service_id),
        (SELECT (s.q_table->'stats'->>'states')::INTEGER FROM qlearning_state s WHERE s.service_id = p_service_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_qlearning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qlearning_state_updated_at ON qlearning_state;
CREATE TRIGGER qlearning_state_updated_at
    BEFORE UPDATE ON qlearning_state
    FOR EACH ROW
    EXECUTE FUNCTION update_qlearning_updated_at();

DROP TRIGGER IF EXISTS shared_memory_patterns_updated_at ON shared_memory_patterns;
CREATE TRIGGER shared_memory_patterns_updated_at
    BEFORE UPDATE ON shared_memory_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_qlearning_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE qlearning_state IS
'Persists Q-Table state for QLearningService - learning survives restarts';

COMMENT ON TABLE qlearning_episodes IS
'Episode history for Q-learning analysis and debugging';

COMMENT ON TABLE shared_memory_patterns IS
'Persists SharedMemory patterns that guide dog routing';

COMMENT ON COLUMN qlearning_state.q_table IS
'Serialized Q-Table: {table: {stateKey: {action: qValue}}, visits: {key: count}, stats: {...}}';

COMMENT ON FUNCTION cleanup_qlearning_episodes IS
'Removes old episodes keeping only the most recent p_keep_count per service';

COMMENT ON FUNCTION get_qlearning_summary IS
'Returns summary statistics for Q-learning service';

-- =============================================================================
-- MIGRATION TRACKING
-- =============================================================================

INSERT INTO _migrations (name) VALUES ('026_qlearning_persistence')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- φ guides learning. Memory persists.
-- =============================================================================
