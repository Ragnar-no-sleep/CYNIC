-- =============================================================================
-- Migration 009: Consciousness - Cross-Session Learning Loop
-- =============================================================================
-- Stores consciousness.cjs data for true cross-machine memory.
-- humanGrowth, capabilityMap, insights, resonance all persist.
--
-- "Le chien apprend. Entre les machines, l'apprentissage persiste."
-- =============================================================================

-- =============================================================================
-- USER CONSCIOUSNESS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_consciousness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Human growth tracking
    human_growth JSONB DEFAULT '{}'::jsonb,

    -- Capability map (tool usage)
    capability_map JSONB DEFAULT '{}'::jsonb,

    -- Recent insights (most recent 50)
    insights JSONB DEFAULT '[]'::jsonb,

    -- Resonance patterns (flow states)
    resonance_patterns JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    version INTEGER DEFAULT 1,
    insights_count INTEGER DEFAULT 0,
    total_observations INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_user_consciousness UNIQUE(user_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_consciousness_user
ON user_consciousness(user_id);

CREATE INDEX IF NOT EXISTS idx_consciousness_updated
ON user_consciousness(updated_at DESC);

-- Partial index for users with significant learning
CREATE INDEX IF NOT EXISTS idx_consciousness_active
ON user_consciousness(user_id, updated_at)
WHERE total_observations > 100;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE user_consciousness IS
'Cross-session consciousness data from consciousness.cjs - the learning loop persists';

COMMENT ON COLUMN user_consciousness.human_growth IS
'Human skill tracking: skills detected, patterns observed, preferences learned';

COMMENT ON COLUMN user_consciousness.capability_map IS
'CYNIC capability tracking: tool usage, success rates, timing patterns';

COMMENT ON COLUMN user_consciousness.insights IS
'Array of insights generated (most recent 50), with surfaced flag';

COMMENT ON COLUMN user_consciousness.resonance_patterns IS
'Flow state patterns: when human-CYNIC collaboration is in harmony';

-- =============================================================================
-- SYNC CONSCIOUSNESS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_consciousness(
    p_user_id UUID,
    p_human_growth JSONB,
    p_capability_map JSONB,
    p_insights JSONB,
    p_resonance_patterns JSONB,
    p_observations INTEGER DEFAULT 0
) RETURNS user_consciousness AS $$
DECLARE
    result user_consciousness;
    existing_insights JSONB;
    merged_insights JSONB;
BEGIN
    -- Get existing insights to merge
    SELECT insights INTO existing_insights
    FROM user_consciousness
    WHERE user_id = p_user_id;

    -- Merge insights (keep most recent 50)
    IF existing_insights IS NOT NULL AND p_insights IS NOT NULL THEN
        merged_insights := (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT DISTINCT ON (elem->>'id') elem
                FROM (
                    SELECT jsonb_array_elements(p_insights) AS elem
                    UNION ALL
                    SELECT jsonb_array_elements(existing_insights)
                ) combined
                ORDER BY elem->>'id', elem->>'timestamp' DESC
                LIMIT 50
            ) unique_insights
        );
    ELSE
        merged_insights := COALESCE(p_insights, existing_insights, '[]'::jsonb);
    END IF;

    INSERT INTO user_consciousness (
        user_id,
        human_growth,
        capability_map,
        insights,
        resonance_patterns,
        total_observations,
        insights_count
    ) VALUES (
        p_user_id,
        p_human_growth,
        p_capability_map,
        merged_insights,
        p_resonance_patterns,
        p_observations,
        jsonb_array_length(COALESCE(merged_insights, '[]'::jsonb))
    )
    ON CONFLICT (user_id) DO UPDATE SET
        -- Merge human_growth (deep merge skills, sum observations)
        human_growth = merge_consciousness_growth(
            user_consciousness.human_growth,
            p_human_growth
        ),
        -- Merge capability_map (sum uses, update success rates)
        capability_map = merge_capability_map(
            user_consciousness.capability_map,
            p_capability_map
        ),
        -- Keep merged insights
        insights = merged_insights,
        -- Merge resonance patterns
        resonance_patterns = user_consciousness.resonance_patterns || COALESCE(p_resonance_patterns, '{}'),
        -- Update counts
        total_observations = user_consciousness.total_observations + COALESCE(p_observations, 0),
        insights_count = jsonb_array_length(COALESCE(merged_insights, '[]'::jsonb)),
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MERGE HELPERS
-- =============================================================================

-- Merge human growth data (skills, patterns, preferences)
CREATE OR REPLACE FUNCTION merge_consciousness_growth(
    existing JSONB,
    incoming JSONB
) RETURNS JSONB AS $$
DECLARE
    merged JSONB;
    skill_key TEXT;
    existing_skill JSONB;
    incoming_skill JSONB;
BEGIN
    IF existing IS NULL THEN RETURN incoming; END IF;
    IF incoming IS NULL THEN RETURN existing; END IF;

    merged := existing;

    -- Merge skills (take higher observations, update lastSeen)
    IF incoming->'skills' IS NOT NULL THEN
        FOR skill_key IN SELECT jsonb_object_keys(incoming->'skills') LOOP
            existing_skill := merged->'skills'->skill_key;
            incoming_skill := incoming->'skills'->skill_key;

            IF existing_skill IS NULL THEN
                merged := jsonb_set(merged, ARRAY['skills', skill_key], incoming_skill);
            ELSE
                -- Keep the one with more observations
                IF (incoming_skill->>'observations')::int > (existing_skill->>'observations')::int THEN
                    merged := jsonb_set(merged, ARRAY['skills', skill_key], incoming_skill);
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Merge growth stats (max of each)
    IF incoming->'growth' IS NOT NULL THEN
        merged := jsonb_set(merged, '{growth,sessionsCount}',
            to_jsonb(GREATEST(
                COALESCE((merged->'growth'->>'sessionsCount')::int, 0),
                COALESCE((incoming->'growth'->>'sessionsCount')::int, 0)
            ))
        );
        merged := jsonb_set(merged, '{growth,totalInteractions}',
            to_jsonb(GREATEST(
                COALESCE((merged->'growth'->>'totalInteractions')::int, 0),
                COALESCE((incoming->'growth'->>'totalInteractions')::int, 0)
            ))
        );
    END IF;

    -- Merge recentContext (union arrays, keep recent)
    IF incoming->'recentContext' IS NOT NULL THEN
        merged := jsonb_set(merged, '{recentContext}',
            incoming->'recentContext' || COALESCE(merged->'recentContext', '{}'::jsonb)
        );
    END IF;

    RETURN merged;
END;
$$ LANGUAGE plpgsql;

-- Merge capability map (tool usage stats)
CREATE OR REPLACE FUNCTION merge_capability_map(
    existing JSONB,
    incoming JSONB
) RETURNS JSONB AS $$
DECLARE
    merged JSONB;
    tool_key TEXT;
    existing_tool JSONB;
    incoming_tool JSONB;
    total_uses INT;
    total_successes INT;
BEGIN
    IF existing IS NULL THEN RETURN incoming; END IF;
    IF incoming IS NULL THEN RETURN existing; END IF;

    merged := existing;

    -- Merge tool stats
    IF incoming->'tools' IS NOT NULL THEN
        FOR tool_key IN SELECT jsonb_object_keys(incoming->'tools') LOOP
            existing_tool := merged->'tools'->tool_key;
            incoming_tool := incoming->'tools'->tool_key;

            IF existing_tool IS NULL THEN
                merged := jsonb_set(merged, ARRAY['tools', tool_key], incoming_tool);
            ELSE
                -- Sum uses, successes, failures
                total_uses := COALESCE((existing_tool->>'uses')::int, 0) +
                              COALESCE((incoming_tool->>'uses')::int, 0);
                total_successes := COALESCE((existing_tool->>'successes')::int, 0) +
                                   COALESCE((incoming_tool->>'successes')::int, 0);

                merged := jsonb_set(merged, ARRAY['tools', tool_key], jsonb_build_object(
                    'uses', total_uses,
                    'successes', total_successes,
                    'failures', COALESCE((existing_tool->>'failures')::int, 0) +
                               COALESCE((incoming_tool->>'failures')::int, 0),
                    'avgDuration', (
                        COALESCE((existing_tool->>'avgDuration')::numeric, 0) +
                        COALESCE((incoming_tool->>'avgDuration')::numeric, 0)
                    ) / 2,
                    'lastUsed', GREATEST(
                        existing_tool->>'lastUsed',
                        incoming_tool->>'lastUsed'
                    )
                ));
            END IF;
        END LOOP;
    END IF;

    -- Merge skills stats
    IF incoming->'skills' IS NOT NULL THEN
        FOR tool_key IN SELECT jsonb_object_keys(incoming->'skills') LOOP
            existing_tool := merged->'skills'->tool_key;
            incoming_tool := incoming->'skills'->tool_key;

            IF existing_tool IS NULL THEN
                merged := jsonb_set(merged, ARRAY['skills', tool_key], incoming_tool);
            ELSE
                merged := jsonb_set(merged, ARRAY['skills', tool_key], jsonb_build_object(
                    'uses', COALESCE((existing_tool->>'uses')::int, 0) +
                           COALESCE((incoming_tool->>'uses')::int, 0),
                    'lastUsed', GREATEST(
                        existing_tool->>'lastUsed',
                        incoming_tool->>'lastUsed'
                    )
                ));
            END IF;
        END LOOP;
    END IF;

    -- Update metadata
    merged := jsonb_set(merged, '{updatedAt}', to_jsonb(extract(epoch from now()) * 1000));

    RETURN merged;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- LOAD CONSCIOUSNESS FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION load_consciousness(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    row user_consciousness;
BEGIN
    SELECT * INTO row
    FROM user_consciousness
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'humanGrowth', COALESCE(row.human_growth, '{}'),
        'capabilityMap', COALESCE(row.capability_map, '{}'),
        'insights', COALESCE(row.insights, '[]'),
        'resonancePatterns', COALESCE(row.resonance_patterns, '{}'),
        'meta', jsonb_build_object(
            'version', row.version,
            'insightsCount', row.insights_count,
            'totalObservations', row.total_observations,
            'lastUpdated', row.updated_at
        )
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RECORD OBSERVATION FUNCTION (for real-time tracking)
-- =============================================================================

CREATE OR REPLACE FUNCTION record_consciousness_observation(
    p_user_id UUID,
    p_tool_name TEXT,
    p_success BOOLEAN,
    p_duration INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    -- Update capability map tool stats
    UPDATE user_consciousness SET
        capability_map = jsonb_set(
            capability_map,
            ARRAY['tools', p_tool_name],
            jsonb_build_object(
                'uses', COALESCE((capability_map->'tools'->p_tool_name->>'uses')::int, 0) + 1,
                'successes', COALESCE((capability_map->'tools'->p_tool_name->>'successes')::int, 0) +
                            CASE WHEN p_success THEN 1 ELSE 0 END,
                'failures', COALESCE((capability_map->'tools'->p_tool_name->>'failures')::int, 0) +
                           CASE WHEN NOT p_success THEN 1 ELSE 0 END,
                'avgDuration', (
                    COALESCE((capability_map->'tools'->p_tool_name->>'avgDuration')::numeric, 0) + p_duration
                ) / 2,
                'lastUsed', extract(epoch from now()) * 1000
            )
        ),
        total_observations = total_observations + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Create record if not exists
    IF NOT FOUND THEN
        INSERT INTO user_consciousness (user_id, total_observations, capability_map)
        VALUES (p_user_id, 1, jsonb_build_object(
            'tools', jsonb_build_object(
                p_tool_name, jsonb_build_object(
                    'uses', 1,
                    'successes', CASE WHEN p_success THEN 1 ELSE 0 END,
                    'failures', CASE WHEN NOT p_success THEN 1 ELSE 0 END,
                    'avgDuration', p_duration,
                    'lastUsed', extract(epoch from now()) * 1000
                )
            )
        ));
    END IF;
END;
$$ LANGUAGE plpgsql;
