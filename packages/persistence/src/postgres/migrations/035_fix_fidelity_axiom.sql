-- =============================================================================
-- Migration 035: Fix FIDELITY axiom in discovered_dimensions CHECK constraint
-- =============================================================================
-- J-GAP-3: Migration 032 used 'META' instead of 'FIDELITY' as the 5th axiom.
-- The 5 axioms are: PHI, VERIFY, CULTURE, BURN, FIDELITY
-- FIDELITY = "Loyal to truth, not to comfort" (5th axiom, Water element)
--
-- Also fixes residual_candidates.suggested_axiom constraint (same issue).
-- =============================================================================

-- Fix discovered_dimensions.axiom CHECK constraint
ALTER TABLE discovered_dimensions
  DROP CONSTRAINT IF EXISTS discovered_dimensions_axiom_check;

ALTER TABLE discovered_dimensions
  ADD CONSTRAINT discovered_dimensions_axiom_check
  CHECK (axiom IN ('PHI', 'VERIFY', 'CULTURE', 'BURN', 'FIDELITY'));

-- Fix residual_candidates.suggested_axiom (was unconstrained, add proper CHECK)
-- This column stores suggested axioms from ResidualDetector which includes FIDELITY
ALTER TABLE residual_candidates
  DROP CONSTRAINT IF EXISTS residual_candidates_suggested_axiom_check;

ALTER TABLE residual_candidates
  ADD CONSTRAINT residual_candidates_suggested_axiom_check
  CHECK (suggested_axiom IS NULL OR suggested_axiom IN ('PHI', 'VERIFY', 'CULTURE', 'BURN', 'FIDELITY'));

-- Fix dimension_governance_log.axiom (was unconstrained, add proper CHECK)
ALTER TABLE dimension_governance_log
  DROP CONSTRAINT IF EXISTS dimension_governance_log_axiom_check;

ALTER TABLE dimension_governance_log
  ADD CONSTRAINT dimension_governance_log_axiom_check
  CHECK (axiom IS NULL OR axiom IN ('PHI', 'VERIFY', 'CULTURE', 'BURN', 'FIDELITY'));

-- Migrate any existing 'META' rows to 'FIDELITY'
UPDATE discovered_dimensions SET axiom = 'FIDELITY' WHERE axiom = 'META';
UPDATE residual_candidates SET suggested_axiom = 'FIDELITY' WHERE suggested_axiom = 'META';
UPDATE dimension_governance_log SET axiom = 'FIDELITY' WHERE axiom = 'META';
