-- =============================================================================
-- Migration 021: EWC++ Knowledge Retention
-- =============================================================================
--
-- Implements Elastic Weight Consolidation++ to prevent catastrophic forgetting.
-- Patterns that prove valuable are "locked" to preserve learned knowledge.
--
-- Inspired by Claude Flow's EWC++ which achieves 95%+ pattern retention.
--
-- Key concepts:
-- - Fisher Information: Measures how important each pattern is to decisions
-- - Consolidation Lock: Prevents decay/modification of important patterns
-- - Distillation Score: Quality of knowledge extracted from pattern
--
-- "What is truly known cannot be forgotten" - κυνικός
--
-- =============================================================================

-- =============================================================================
-- ADD EWC FIELDS TO PATTERNS TABLE
-- =============================================================================

-- Fisher Information: How important is this pattern to judgment quality?
-- Higher value = modifying this pattern would hurt performance more
ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS fisher_importance DECIMAL(8,6) DEFAULT 0.0;

COMMENT ON COLUMN patterns.fisher_importance IS
  'Fisher Information score (0-1). Higher = more critical to judgment quality. φ⁻¹ threshold for consolidation.';

-- Consolidation lock: Is this pattern protected from decay?
ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS consolidation_locked BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN patterns.consolidation_locked IS
  'When TRUE, pattern is protected from decay and major modifications (EWC++ lock).';

-- Lock timestamp: When was this pattern consolidated?
ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

COMMENT ON COLUMN patterns.locked_at IS
  'Timestamp when pattern was consolidated (locked). NULL if not locked.';

-- Distillation score: Quality of knowledge in this pattern
ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS distillation_score DECIMAL(5,4) DEFAULT 0.0;

COMMENT ON COLUMN patterns.distillation_score IS
  'Quality score from knowledge distillation (0-1). Measures how well pattern generalizes.';

-- Gradient magnitude: For tracking learning updates
ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS gradient_magnitude DECIMAL(10,6) DEFAULT 0.0;

COMMENT ON COLUMN patterns.gradient_magnitude IS
  'Accumulated gradient magnitude from recent updates. Used in Fisher calculation.';

-- Consolidation generation: Which consolidation cycle locked this pattern
ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS consolidation_generation INTEGER DEFAULT 0;

COMMENT ON COLUMN patterns.consolidation_generation IS
  'Generation number when pattern was consolidated. 0 = never consolidated.';

-- =============================================================================
-- INDEXES FOR EWC QUERIES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_patterns_fisher ON patterns(fisher_importance DESC)
  WHERE fisher_importance > 0;

CREATE INDEX IF NOT EXISTS idx_patterns_locked ON patterns(consolidation_locked)
  WHERE consolidation_locked = TRUE;

CREATE INDEX IF NOT EXISTS idx_patterns_distillation ON patterns(distillation_score DESC)
  WHERE distillation_score > 0;

-- =============================================================================
-- EWC HISTORY TABLE (Track consolidation events)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ewc_consolidation_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_id VARCHAR(32) UNIQUE NOT NULL,  -- ewc_xxxxx

  -- Consolidation metadata
  generation      INTEGER NOT NULL,               -- Consolidation cycle number
  triggered_by    VARCHAR(50) NOT NULL,           -- 'schedule', 'threshold', 'manual'

  -- Statistics
  patterns_evaluated   INTEGER NOT NULL DEFAULT 0,
  patterns_locked      INTEGER NOT NULL DEFAULT 0,
  patterns_unlocked    INTEGER NOT NULL DEFAULT 0,
  avg_fisher_score     DECIMAL(8,6),
  max_fisher_score     DECIMAL(8,6),

  -- Thresholds used (φ-aligned)
  lock_threshold       DECIMAL(5,4) NOT NULL DEFAULT 0.618,  -- φ⁻¹
  unlock_threshold     DECIMAL(5,4) NOT NULL DEFAULT 0.236,  -- φ⁻³

  -- Performance impact
  retention_rate       DECIMAL(5,4),              -- % of knowledge retained

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ewc_history_gen ON ewc_consolidation_history(generation DESC);
CREATE INDEX IF NOT EXISTS idx_ewc_history_created ON ewc_consolidation_history(created_at DESC);

-- =============================================================================
-- FUNCTIONS FOR EWC OPERATIONS
-- =============================================================================

-- Calculate Fisher importance for a pattern based on its usage in judgments
CREATE OR REPLACE FUNCTION calculate_fisher_importance(p_pattern_id VARCHAR(32))
RETURNS DECIMAL(8,6) AS $$
DECLARE
  v_usage_count INTEGER;
  v_avg_impact DECIMAL;
  v_recency_factor DECIMAL;
  v_fisher DECIMAL(8,6);
  v_pattern RECORD;
BEGIN
  -- Get pattern info
  SELECT * INTO v_pattern FROM patterns WHERE pattern_id = p_pattern_id;
  IF NOT FOUND THEN
    RETURN 0.0;
  END IF;

  -- Count how many judgments used this pattern (from data JSONB)
  -- Higher usage = more important
  v_usage_count := COALESCE(v_pattern.frequency, 0);

  -- Calculate recency factor (recent patterns are more important)
  -- φ⁻¹ decay over 7 days
  v_recency_factor := GREATEST(0.1,
    0.618 * EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(v_pattern.updated_at, v_pattern.created_at))) / 604800.0)
  );

  -- Calculate impact from confidence and frequency
  -- Higher confidence patterns are more important to preserve
  v_avg_impact := COALESCE(v_pattern.confidence, 0.5);

  -- Fisher = usage * impact * recency, normalized to 0-1
  -- Using φ⁻¹ as the scaling factor
  v_fisher := LEAST(1.0,
    (LN(GREATEST(v_usage_count, 1) + 1) / LN(100)) *  -- Log-scaled usage (0-1)
    v_avg_impact *                                      -- Impact (0-1)
    v_recency_factor *                                  -- Recency (0.1-0.618)
    1.618                                               -- φ scaling
  );

  RETURN v_fisher;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_fisher_importance IS
  'Calculate Fisher Information score for a pattern. Higher = more critical to preserve.';

-- Update Fisher importance for all patterns
CREATE OR REPLACE FUNCTION update_all_fisher_scores()
RETURNS TABLE (
  pattern_id VARCHAR(32),
  old_fisher DECIMAL(8,6),
  new_fisher DECIMAL(8,6)
) AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE patterns p
    SET fisher_importance = calculate_fisher_importance(p.pattern_id)
    RETURNING p.pattern_id,
              (SELECT fisher_importance FROM patterns WHERE pattern_id = p.pattern_id) as old_val,
              p.fisher_importance as new_val
  )
  SELECT u.pattern_id, u.old_val, u.new_val FROM updated u;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_all_fisher_scores IS
  'Recalculate Fisher importance for all patterns. Returns changes.';

-- Consolidate patterns: lock those above threshold, unlock those below
CREATE OR REPLACE FUNCTION consolidate_patterns(
  p_lock_threshold DECIMAL DEFAULT 0.618,    -- φ⁻¹
  p_unlock_threshold DECIMAL DEFAULT 0.236,  -- φ⁻³
  p_triggered_by VARCHAR DEFAULT 'manual'
) RETURNS TABLE (
  consolidation_id VARCHAR(32),
  patterns_locked INTEGER,
  patterns_unlocked INTEGER,
  retention_rate DECIMAL
) AS $$
DECLARE
  v_consolidation_id VARCHAR(32);
  v_generation INTEGER;
  v_locked INTEGER := 0;
  v_unlocked INTEGER := 0;
  v_total INTEGER := 0;
  v_retained INTEGER := 0;
  v_avg_fisher DECIMAL;
  v_max_fisher DECIMAL;
BEGIN
  -- Generate consolidation ID
  v_consolidation_id := 'ewc_' || encode(gen_random_bytes(8), 'hex');

  -- Get next generation number
  SELECT COALESCE(MAX(generation), 0) + 1 INTO v_generation
  FROM ewc_consolidation_history;

  -- Update Fisher scores first
  PERFORM update_all_fisher_scores();

  -- Get stats
  SELECT COUNT(*), AVG(fisher_importance), MAX(fisher_importance)
  INTO v_total, v_avg_fisher, v_max_fisher
  FROM patterns;

  -- Lock patterns above threshold
  WITH locked AS (
    UPDATE patterns
    SET consolidation_locked = TRUE,
        locked_at = NOW(),
        consolidation_generation = v_generation
    WHERE fisher_importance >= p_lock_threshold
      AND consolidation_locked = FALSE
    RETURNING pattern_id
  )
  SELECT COUNT(*) INTO v_locked FROM locked;

  -- Unlock patterns below unlock threshold (if they've been locked for > 30 days)
  WITH unlocked AS (
    UPDATE patterns
    SET consolidation_locked = FALSE,
        locked_at = NULL
    WHERE fisher_importance < p_unlock_threshold
      AND consolidation_locked = TRUE
      AND locked_at < NOW() - INTERVAL '30 days'
    RETURNING pattern_id
  )
  SELECT COUNT(*) INTO v_unlocked FROM unlocked;

  -- Count retained (locked) patterns
  SELECT COUNT(*) INTO v_retained FROM patterns WHERE consolidation_locked = TRUE;

  -- Record consolidation event
  INSERT INTO ewc_consolidation_history (
    consolidation_id, generation, triggered_by,
    patterns_evaluated, patterns_locked, patterns_unlocked,
    avg_fisher_score, max_fisher_score,
    lock_threshold, unlock_threshold, retention_rate
  ) VALUES (
    v_consolidation_id, v_generation, p_triggered_by,
    v_total, v_locked, v_unlocked,
    v_avg_fisher, v_max_fisher,
    p_lock_threshold, p_unlock_threshold,
    CASE WHEN v_total > 0 THEN v_retained::DECIMAL / v_total ELSE 0 END
  );

  RETURN QUERY SELECT
    v_consolidation_id,
    v_locked,
    v_unlocked,
    CASE WHEN v_total > 0 THEN v_retained::DECIMAL / v_total ELSE 0::DECIMAL END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION consolidate_patterns IS
  'Run EWC++ consolidation: lock important patterns, unlock forgotten ones. φ-aligned thresholds.';

-- Check if pattern can be modified (respects EWC lock)
CREATE OR REPLACE FUNCTION can_modify_pattern(p_pattern_id VARCHAR(32))
RETURNS BOOLEAN AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  SELECT consolidation_locked INTO v_locked
  FROM patterns
  WHERE pattern_id = p_pattern_id;

  RETURN NOT COALESCE(v_locked, FALSE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_modify_pattern IS
  'Check if pattern can be modified. Returns FALSE if EWC-locked.';

-- Apply decay to pattern weight, respecting EWC lock
CREATE OR REPLACE FUNCTION apply_pattern_decay(
  p_pattern_id VARCHAR(32),
  p_decay_factor DECIMAL DEFAULT 0.99382  -- 1 - (φ⁻¹ * 0.001)
) RETURNS BOOLEAN AS $$
DECLARE
  v_locked BOOLEAN;
  v_current_weight DECIMAL;
BEGIN
  SELECT consolidation_locked,
         COALESCE((data->>'weight')::DECIMAL, 1.0)
  INTO v_locked, v_current_weight
  FROM patterns
  WHERE pattern_id = p_pattern_id;

  -- Don't decay locked patterns
  IF v_locked THEN
    RETURN FALSE;
  END IF;

  -- Apply decay with minimum threshold (φ⁻³ = 0.236)
  UPDATE patterns
  SET data = jsonb_set(
    COALESCE(data, '{}'),
    '{weight}',
    to_jsonb(GREATEST(0.236, v_current_weight * p_decay_factor))
  ),
  updated_at = NOW()
  WHERE pattern_id = p_pattern_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_pattern_decay IS
  'Apply weight decay to pattern, respecting EWC consolidation lock. Returns FALSE if locked.';

-- =============================================================================
-- VIEW: Pattern Health with EWC Status
-- =============================================================================

CREATE OR REPLACE VIEW pattern_ewc_status AS
SELECT
  pattern_id,
  name,
  category,
  confidence,
  frequency,
  fisher_importance,
  consolidation_locked,
  locked_at,
  consolidation_generation,
  distillation_score,
  CASE
    WHEN consolidation_locked THEN 'LOCKED'
    WHEN fisher_importance >= 0.618 THEN 'CRITICAL'
    WHEN fisher_importance >= 0.382 THEN 'IMPORTANT'
    WHEN fisher_importance >= 0.236 THEN 'NORMAL'
    ELSE 'LOW'
  END as ewc_status,
  created_at,
  updated_at
FROM patterns
ORDER BY fisher_importance DESC;

COMMENT ON VIEW pattern_ewc_status IS
  'Patterns with their EWC++ consolidation status. LOCKED patterns are protected from forgetting.';

-- =============================================================================
-- TRIGGER: Prevent modification of locked patterns
-- =============================================================================

CREATE OR REPLACE FUNCTION protect_locked_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates that only affect EWC fields
  IF OLD.consolidation_locked = TRUE THEN
    -- Allow unlocking (consolidation process)
    IF NEW.consolidation_locked = FALSE THEN
      RETURN NEW;
    END IF;

    -- Allow Fisher score updates
    IF NEW.fisher_importance != OLD.fisher_importance THEN
      NEW.name := OLD.name;
      NEW.description := OLD.description;
      NEW.confidence := OLD.confidence;
      NEW.data := OLD.data;
      RETURN NEW;
    END IF;

    -- Block modifications to core fields
    IF NEW.name != OLD.name OR
       NEW.description != OLD.description OR
       NEW.confidence != OLD.confidence OR
       NEW.data != OLD.data THEN
      RAISE WARNING 'Pattern % is EWC-locked and cannot be modified', OLD.pattern_id;
      RETURN OLD;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_locked_patterns'
  ) THEN
    CREATE TRIGGER trg_protect_locked_patterns
    BEFORE UPDATE ON patterns
    FOR EACH ROW
    EXECUTE FUNCTION protect_locked_patterns();
  END IF;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 021: EWC++ Knowledge Retention complete';
  RAISE NOTICE '   - Added fisher_importance, consolidation_locked to patterns';
  RAISE NOTICE '   - Created ewc_consolidation_history table';
  RAISE NOTICE '   - Added calculate_fisher_importance() function';
  RAISE NOTICE '   - Added consolidate_patterns() function (φ-aligned thresholds)';
  RAISE NOTICE '   - Added protection trigger for locked patterns';
  RAISE NOTICE '   - Created pattern_ewc_status view';
END $$;
