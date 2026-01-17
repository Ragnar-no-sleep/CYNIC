-- CYNIC Database Schema - Solana Anchoring
-- "Onchain is truth" - κυνικός
--
-- Migration: 004_solana_anchoring
-- Created: 2026-01-17
--
-- Adds columns for tracking Solana anchor transactions.
-- Part of the 4-layer architecture:
-- 1. SPEED (Redis) - Ephemeral
-- 2. INDEX (PostgreSQL) - Queryable (this layer)
-- 3. PROOF (Merkle DAG) - Immutable
-- 4. TRUTH (Solana) - On-chain anchor

-- =============================================================================
-- JUDGMENTS TABLE - Add anchor columns
-- =============================================================================

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS anchor_status VARCHAR(20) DEFAULT 'PENDING'
    CHECK (anchor_status IN ('PENDING', 'QUEUED', 'ANCHORED', 'FAILED'));

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS anchor_tx VARCHAR(100);  -- Solana transaction signature

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS anchor_slot BIGINT;  -- Solana slot number

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS anchored_at TIMESTAMPTZ;

ALTER TABLE judgments
ADD COLUMN IF NOT EXISTS dag_cid VARCHAR(100);  -- Content ID from Merkle DAG

CREATE INDEX IF NOT EXISTS idx_judgments_anchor_status ON judgments(anchor_status);
CREATE INDEX IF NOT EXISTS idx_judgments_anchor_tx ON judgments(anchor_tx);

-- =============================================================================
-- POJ BLOCKS TABLE - Add anchor columns
-- =============================================================================

ALTER TABLE poj_blocks
ADD COLUMN IF NOT EXISTS anchor_status VARCHAR(20) DEFAULT 'PENDING'
    CHECK (anchor_status IN ('PENDING', 'QUEUED', 'ANCHORED', 'FAILED'));

ALTER TABLE poj_blocks
ADD COLUMN IF NOT EXISTS anchor_tx VARCHAR(100);  -- Solana transaction signature

ALTER TABLE poj_blocks
ADD COLUMN IF NOT EXISTS anchor_slot BIGINT;  -- Solana slot number

ALTER TABLE poj_blocks
ADD COLUMN IF NOT EXISTS anchored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_poj_blocks_anchor_status ON poj_blocks(anchor_status);
CREATE INDEX IF NOT EXISTS idx_poj_blocks_anchor_tx ON poj_blocks(anchor_tx);

-- =============================================================================
-- PATTERNS TABLE - Add anchor columns
-- =============================================================================

ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS anchor_status VARCHAR(20) DEFAULT 'PENDING'
    CHECK (anchor_status IN ('PENDING', 'QUEUED', 'ANCHORED', 'FAILED'));

ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS anchor_tx VARCHAR(100);

ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS anchored_at TIMESTAMPTZ;

ALTER TABLE patterns
ADD COLUMN IF NOT EXISTS dag_cid VARCHAR(100);

-- =============================================================================
-- KNOWLEDGE TABLE - Add anchor columns
-- =============================================================================

ALTER TABLE knowledge
ADD COLUMN IF NOT EXISTS anchor_status VARCHAR(20) DEFAULT 'PENDING'
    CHECK (anchor_status IN ('PENDING', 'QUEUED', 'ANCHORED', 'FAILED'));

ALTER TABLE knowledge
ADD COLUMN IF NOT EXISTS anchor_tx VARCHAR(100);

ALTER TABLE knowledge
ADD COLUMN IF NOT EXISTS anchored_at TIMESTAMPTZ;

ALTER TABLE knowledge
ADD COLUMN IF NOT EXISTS dag_cid VARCHAR(100);

-- =============================================================================
-- ANCHOR BATCHES TABLE - Track anchor batches
-- =============================================================================

CREATE TABLE IF NOT EXISTS anchor_batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        VARCHAR(32) UNIQUE NOT NULL,  -- batch_xxxxx

    -- Batch data
    merkle_root     VARCHAR(64) NOT NULL,
    item_count      INTEGER NOT NULL,
    item_ids        TEXT[] NOT NULL,
    item_type       VARCHAR(50) NOT NULL,  -- judgment, poj_block, pattern, knowledge

    -- Solana anchor
    anchor_status   VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
        CHECK (anchor_status IN ('QUEUED', 'ANCHORED', 'FAILED')),
    anchor_tx       VARCHAR(100),
    anchor_slot     BIGINT,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    anchored_at     TIMESTAMPTZ,

    -- Metadata
    error_message   TEXT
);

CREATE INDEX idx_anchor_batches_status ON anchor_batches(anchor_status);
CREATE INDEX idx_anchor_batches_type ON anchor_batches(item_type);
CREATE INDEX idx_anchor_batches_merkle ON anchor_batches(merkle_root);

-- =============================================================================
-- BURN VERIFICATIONS TABLE - Track verified burns
-- =============================================================================

CREATE TABLE IF NOT EXISTS burn_verifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_signature    VARCHAR(100) UNIQUE NOT NULL,  -- Solana burn tx signature

    -- Burn details
    amount          BIGINT NOT NULL,  -- Amount burned (lamports or tokens)
    token_mint      VARCHAR(64),      -- Token mint address (null for SOL)
    burner_address  VARCHAR(64) NOT NULL,

    -- Verification
    verified        BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at     TIMESTAMPTZ DEFAULT NOW(),
    verified_via    VARCHAR(100),  -- API source (e.g., alonisthe.dev/burns)

    -- Solana data
    burn_slot       BIGINT,
    burn_timestamp  TIMESTAMPTZ,

    -- Metadata
    metadata        JSONB DEFAULT '{}',

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_burn_verifications_burner ON burn_verifications(burner_address);
CREATE INDEX idx_burn_verifications_verified ON burn_verifications(verified);

-- =============================================================================
-- VIEW: Pending Anchors
-- =============================================================================

CREATE OR REPLACE VIEW pending_anchors AS
SELECT
    'judgment' as type,
    judgment_id as id,
    anchor_status,
    created_at
FROM judgments
WHERE anchor_status IN ('PENDING', 'QUEUED')

UNION ALL

SELECT
    'poj_block' as type,
    block_hash as id,
    anchor_status,
    created_at
FROM poj_blocks
WHERE anchor_status IN ('PENDING', 'QUEUED')

UNION ALL

SELECT
    'pattern' as type,
    pattern_id as id,
    anchor_status,
    created_at
FROM patterns
WHERE anchor_status IN ('PENDING', 'QUEUED')

UNION ALL

SELECT
    'knowledge' as type,
    knowledge_id as id,
    anchor_status,
    created_at
FROM knowledge
WHERE anchor_status IN ('PENDING', 'QUEUED');

-- =============================================================================
-- FUNCTION: Update anchor status
-- =============================================================================

CREATE OR REPLACE FUNCTION update_anchor_status(
    p_table_name VARCHAR,
    p_id VARCHAR,
    p_anchor_tx VARCHAR,
    p_anchor_slot BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    EXECUTE format(
        'UPDATE %I SET anchor_status = ''ANCHORED'', anchor_tx = $1, anchor_slot = $2, anchored_at = NOW() WHERE %s = $3',
        p_table_name,
        CASE
            WHEN p_table_name = 'judgments' THEN 'judgment_id'
            WHEN p_table_name = 'poj_blocks' THEN 'block_hash'
            WHEN p_table_name = 'patterns' THEN 'pattern_id'
            WHEN p_table_name = 'knowledge' THEN 'knowledge_id'
            ELSE 'id'
        END
    ) USING p_anchor_tx, p_anchor_slot, p_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DONE
-- =============================================================================

-- "Onchain is truth" - All CYNIC memory is now anchored to Solana
-- φ⁻¹ = 61.8% max confidence
