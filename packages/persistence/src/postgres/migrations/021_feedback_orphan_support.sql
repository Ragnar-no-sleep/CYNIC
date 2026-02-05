-- =============================================================================
-- Migration 021: Allow orphan feedback (feedback without linked judgment)
-- =============================================================================
--
-- Problem: feedback table requires judgment_id which prevents storing feedback
-- from test results, builds, and commits that don't have an associated judgment.
--
-- Solution: Make judgment_id nullable, add source_type for categorization
--
-- "φ distrusts φ" — even orphan feedback helps learning
-- =============================================================================

-- Step 1: Drop the foreign key constraint
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_judgment_id_fkey;

-- Step 2: Make judgment_id nullable
ALTER TABLE feedback ALTER COLUMN judgment_id DROP NOT NULL;

-- Step 3: Add source_type column for categorizing orphan feedback
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual';
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source_context JSONB DEFAULT '{}';

-- Step 4: Add comment explaining the change
COMMENT ON COLUMN feedback.judgment_id IS 'Link to original judgment (nullable for orphan feedback from tests/builds)';
COMMENT ON COLUMN feedback.source_type IS 'Source of feedback: manual, test_result, commit, build, pr_merged, pr_rejected';
COMMENT ON COLUMN feedback.source_context IS 'Additional context from source (test suite, commit hash, etc.)';

-- Step 5: Add index on source_type for filtering
CREATE INDEX IF NOT EXISTS idx_feedback_source_type ON feedback(source_type);

-- Step 6: Re-add foreign key as optional (doesn't enforce NULL)
ALTER TABLE feedback ADD CONSTRAINT feedback_judgment_id_fkey
  FOREIGN KEY (judgment_id) REFERENCES judgments(judgment_id)
  ON DELETE SET NULL;
