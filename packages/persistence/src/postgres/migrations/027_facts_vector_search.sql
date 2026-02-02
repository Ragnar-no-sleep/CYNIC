-- Migration 027: Facts Vector Search
-- Creates facts table with embedding support for semantic search
-- Uses JSONB for embeddings (compatible with nomic-embed-text 768D)

-- Create facts table if not exists
CREATE TABLE IF NOT EXISTS facts (
  id SERIAL PRIMARY KEY,
  fact_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  session_id TEXT,
  fact_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  source_tool TEXT,
  source_file TEXT,
  confidence REAL DEFAULT 0.5,
  relevance REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  search_vector TSVECTOR,
  -- Vector embedding support
  embedding JSONB DEFAULT NULL,
  embedding_model VARCHAR(50) DEFAULT NULL,
  embedding_dim INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for facts table
CREATE INDEX IF NOT EXISTS idx_facts_user_id ON facts(user_id);
CREATE INDEX IF NOT EXISTS idx_facts_session_id ON facts(session_id);
CREATE INDEX IF NOT EXISTS idx_facts_fact_type ON facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_facts_source_tool ON facts(source_tool);
CREATE INDEX IF NOT EXISTS idx_facts_search_vector ON facts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_facts_tags ON facts USING GIN(tags);

-- Create GIN index for efficient JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_facts_embedding_exists
  ON facts ((embedding IS NOT NULL))
  WHERE embedding IS NOT NULL;

-- Create a composite index for hybrid search (FTS + embedding presence)
CREATE INDEX IF NOT EXISTS idx_facts_hybrid_search
  ON facts (user_id, fact_type, confidence DESC)
  WHERE search_vector IS NOT NULL OR embedding IS NOT NULL;

-- Create trigger for auto-updating search_vector
CREATE OR REPLACE FUNCTION facts_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS facts_search_update ON facts;
CREATE TRIGGER facts_search_update BEFORE INSERT OR UPDATE
  ON facts FOR EACH ROW EXECUTE FUNCTION facts_search_trigger();

-- Add comments for documentation
COMMENT ON COLUMN facts.embedding IS 'Vector embedding as JSONB array (768D nomic-embed-text or 384D all-minilm)';
COMMENT ON COLUMN facts.embedding_model IS 'Name of the embedding model used (nomic-embed-text, all-minilm, etc.)';
COMMENT ON COLUMN facts.embedding_dim IS 'Dimensionality of the embedding vector';
