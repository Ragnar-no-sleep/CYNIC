/**
 * Residual Storage Adapter
 *
 * Bridges ResidualDetector to PostgreSQL for persistence.
 * Candidates and discoveries survive restarts.
 *
 * "THE_UNNAMEABLE persists across sessions" - κυνικός
 *
 * @module @cynic/persistence/services/residual-storage
 */

'use strict';

/**
 * Create a storage adapter for ResidualDetector.
 *
 * Implements the { get, set } interface that ResidualDetector expects,
 * backed by PostgreSQL tables from migration 032.
 *
 * @param {Object} options
 * @param {Object} options.pool - PostgreSQL pool
 * @returns {{ get: Function, set: Function, loadDiscoveredDimensions: Function, saveDiscoveredDimension: Function, logGovernanceDecision: Function }}
 */
export function createResidualStorage({ pool }) {
  if (!pool) throw new Error('PostgreSQL pool required');

  /**
   * Get ResidualDetector state from DB
   * @param {string} key - State key (only 'residual_detector_state' expected)
   * @returns {Promise<Object|null>}
   */
  async function get(key) {
    if (key !== 'residual_detector_state') return null;

    try {
      // Load candidates
      const candidateRows = await pool.query(
        `SELECT candidate_key, weak_dimensions, sample_count, avg_residual,
                suggested_axiom, suggested_name, confidence,
                detected_at, updated_at
         FROM residual_candidates
         WHERE status = 'pending'
         ORDER BY confidence DESC`
      );

      const candidates = {};
      for (const row of candidateRows.rows) {
        candidates[row.candidate_key] = {
          key: row.candidate_key,
          weakDimensions: row.weak_dimensions || [],
          sampleCount: row.sample_count,
          avgResidual: row.avg_residual,
          suggestedAxiom: row.suggested_axiom,
          suggestedName: row.suggested_name,
          confidence: row.confidence,
          detectedAt: new Date(row.detected_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
        };
      }

      // Load recent anomalies (last 100 for in-memory clustering)
      const anomalyRows = await pool.query(
        `SELECT judgment_id, residual, global_score, dimensions, metadata, created_at
         FROM residual_anomalies
         ORDER BY created_at DESC
         LIMIT 100`
      );

      const anomalies = anomalyRows.rows.map(row => ({
        judgmentId: row.judgment_id,
        residual: row.residual,
        globalScore: row.global_score,
        dimensions: row.dimensions || {},
        metadata: row.metadata || {},
        timestamp: new Date(row.created_at).getTime(),
      }));

      // Load discoveries
      const discoveryRows = await pool.query(
        `SELECT dimension_name, axiom, weight, threshold, description,
                from_candidate, discovered_at
         FROM discovered_dimensions
         WHERE status = 'active'
         ORDER BY discovered_at`
      );

      const discoveries = discoveryRows.rows.map(row => ({
        name: row.dimension_name,
        axiom: row.axiom,
        weight: row.weight,
        threshold: row.threshold,
        fromCandidate: row.from_candidate,
        discoveredAt: new Date(row.discovered_at).getTime(),
      }));

      return { anomalies, candidates, discoveries };
    } catch (err) {
      // Table might not exist yet (pre-migration)
      if (err.code === '42P01') return null; // undefined_table
      throw err;
    }
  }

  /**
   * Save ResidualDetector state to DB
   * @param {string} key - State key
   * @param {Object} state - { anomalies, candidates, discoveries }
   * @returns {Promise<boolean>}
   */
  async function set(key, state) {
    if (key !== 'residual_detector_state') return false;
    if (!state) return false;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert candidates
      if (state.candidates) {
        const entries = Object.entries(state.candidates);
        for (const [candidateKey, c] of entries) {
          await client.query(
            `INSERT INTO residual_candidates
               (candidate_key, weak_dimensions, sample_count, avg_residual,
                suggested_axiom, suggested_name, confidence, detected_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8::double precision / 1000), NOW())
             ON CONFLICT (candidate_key) DO UPDATE SET
               sample_count = EXCLUDED.sample_count,
               avg_residual = EXCLUDED.avg_residual,
               suggested_axiom = EXCLUDED.suggested_axiom,
               confidence = EXCLUDED.confidence,
               updated_at = NOW()`,
            [
              candidateKey,
              c.weakDimensions || [],
              c.sampleCount || 0,
              c.avgResidual || 0,
              c.suggestedAxiom || 'VERIFY',
              c.suggestedName || 'UNNAMED',
              c.confidence || 0,
              c.detectedAt || Date.now(),
            ]
          );
        }
      }

      // Insert new anomalies (batch, skip duplicates by judgment_id)
      if (state.anomalies && state.anomalies.length > 0) {
        // Only insert the most recent batch (last 20)
        const recent = state.anomalies.slice(-20);
        for (const a of recent) {
          await client.query(
            `INSERT INTO residual_anomalies
               (judgment_id, residual, global_score, dimensions, metadata)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [
              a.judgmentId,
              a.residual,
              a.globalScore || 0,
              JSON.stringify(a.dimensions || {}),
              JSON.stringify(a.metadata || {}),
            ]
          );
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '42P01') return false; // undefined_table
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Load all active discovered dimensions from DB.
   * Called at boot to populate DimensionRegistry.
   *
   * @returns {Promise<Array<{name: string, axiom: string, weight: number, threshold: number, description: string}>>}
   */
  async function loadDiscoveredDimensions() {
    try {
      const result = await pool.query(
        `SELECT dimension_name, axiom, weight, threshold, description
         FROM discovered_dimensions
         WHERE status = 'active'
         ORDER BY discovered_at`
      );
      return result.rows.map(row => ({
        name: row.dimension_name,
        axiom: row.axiom,
        weight: row.weight,
        threshold: row.threshold,
        description: row.description,
      }));
    } catch (err) {
      if (err.code === '42P01') return []; // undefined_table
      throw err;
    }
  }

  /**
   * Save a newly discovered dimension to DB.
   * Called by ResidualGovernance when a candidate is promoted.
   *
   * @param {Object} dimension
   * @param {string} dimension.name
   * @param {string} dimension.axiom
   * @param {number} [dimension.weight=1.0]
   * @param {number} [dimension.threshold=50]
   * @param {string} [dimension.description]
   * @param {string} [dimension.promotedBy='governance']
   * @param {string} [dimension.fromCandidate]
   * @param {number} [dimension.evidenceCount]
   * @param {number} [dimension.avgResidual]
   * @param {string[]} [dimension.weakDimensions]
   * @returns {Promise<boolean>}
   */
  async function saveDiscoveredDimension(dimension) {
    try {
      await pool.query(
        `INSERT INTO discovered_dimensions
           (dimension_name, axiom, weight, threshold, description,
            promoted_by, from_candidate, evidence_count, avg_residual, weak_dimensions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (dimension_name) DO UPDATE SET
           status = 'active',
           weight = EXCLUDED.weight,
           threshold = EXCLUDED.threshold,
           deprecated_at = NULL`,
        [
          dimension.name,
          dimension.axiom,
          dimension.weight || 1.0,
          dimension.threshold || 50,
          dimension.description || `Discovered dimension: ${dimension.name}`,
          dimension.promotedBy || 'governance',
          dimension.fromCandidate || null,
          dimension.evidenceCount || 0,
          dimension.avgResidual || null,
          dimension.weakDimensions || [],
        ]
      );
      return true;
    } catch (err) {
      if (err.code === '42P01') return false;
      throw err;
    }
  }

  /**
   * Mark candidate as promoted in DB.
   * @param {string} candidateKey
   * @returns {Promise<void>}
   */
  async function markCandidatePromoted(candidateKey) {
    try {
      await pool.query(
        `UPDATE residual_candidates SET status = 'promoted', updated_at = NOW()
         WHERE candidate_key = $1`,
        [candidateKey]
      );
    } catch {
      // non-fatal
    }
  }

  /**
   * Mark candidate as rejected in DB.
   * @param {string} candidateKey
   * @returns {Promise<void>}
   */
  async function markCandidateRejected(candidateKey) {
    try {
      await pool.query(
        `UPDATE residual_candidates SET status = 'rejected', updated_at = NOW()
         WHERE candidate_key = $1`,
        [candidateKey]
      );
    } catch {
      // non-fatal
    }
  }

  /**
   * Log a governance decision for audit trail.
   *
   * @param {Object} decision
   * @returns {Promise<void>}
   */
  async function logGovernanceDecision(decision) {
    try {
      await pool.query(
        `INSERT INTO dimension_governance_log
           (candidate_key, decision, dimension_name, axiom,
            confidence, vote_approval, vote_count, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          decision.candidateKey,
          decision.approved ? 'promoted' : 'rejected',
          decision.promotedAs?.name || null,
          decision.promotedAs?.axiom || decision.suggestedAxiom || null,
          decision.confidence || 0,
          decision.voteResult?.approval || null,
          decision.voteResult?.totalVotes || null,
          decision.reason || null,
        ]
      );
    } catch {
      // non-fatal
    }
  }

  return {
    get,
    set,
    loadDiscoveredDimensions,
    saveDiscoveredDimension,
    markCandidatePromoted,
    markCandidateRejected,
    logGovernanceDecision,
  };
}
