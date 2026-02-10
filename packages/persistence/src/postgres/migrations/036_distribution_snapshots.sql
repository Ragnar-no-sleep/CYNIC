-- =============================================================================
-- Migration 036: Distribution snapshots table
-- =============================================================================
-- Persists ecosystem health snapshots from AutomationExecutor check #11.
-- Data flow: EcosystemMonitor → AutomationExecutor → AUTOMATION_TICK → event-listeners → here
-- Fibonacci retention: 21-day window (F8), cleanup via existing cron.
-- =============================================================================

CREATE TABLE IF NOT EXISTS distribution_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_report jsonb NOT NULL DEFAULT '{}',
  e_score numeric DEFAULT 0,
  total_sources integer DEFAULT 0,
  fetched_sources integer DEFAULT 0,
  stale_sources integer DEFAULT 0,
  error_sources integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_snapshots_time
  ON distribution_snapshots(created_at);
