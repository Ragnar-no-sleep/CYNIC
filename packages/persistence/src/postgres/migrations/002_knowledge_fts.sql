-- CYNIC Database Schema v2
-- Full-text search for knowledge
--
-- Migration: 002_knowledge_fts
-- Created: 2026-01-15

-- =============================================================================
-- ADD CONTENT COLUMN
-- =============================================================================

-- Add content column for full text storage
ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS content TEXT;

-- =============================================================================
-- FULL-TEXT SEARCH VECTOR
-- =============================================================================

-- Add search vector column
ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_knowledge_search ON knowledge USING gin(search_vector);

-- =============================================================================
-- UPDATE FUNCTION - Auto-update search vector on insert/update
-- =============================================================================

CREATE OR REPLACE FUNCTION knowledge_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.source_ref, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS knowledge_search_vector_trigger ON knowledge;
CREATE TRIGGER knowledge_search_vector_trigger
    BEFORE INSERT OR UPDATE ON knowledge
    FOR EACH ROW EXECUTE FUNCTION knowledge_search_vector_update();

-- =============================================================================
-- BACKFILL EXISTING RECORDS
-- =============================================================================

UPDATE knowledge SET search_vector =
    setweight(to_tsvector('english', COALESCE(summary, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(source_ref, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'D')
WHERE search_vector IS NULL;

-- =============================================================================
-- MIGRATION TRACKING
-- =============================================================================

INSERT INTO _migrations (name) VALUES ('002_knowledge_fts')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================

-- Full-text search ready for knowledge table
