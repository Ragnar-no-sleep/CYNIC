/**
 * Local Privacy Store (SQLite)
 *
 * Unified local-first storage for ALL privacy-sensitive data:
 * - E-Score & Burns (personal contribution metrics)
 * - Learning Profiles (calibration, feedback history)
 * - Psychology State (energy, focus, interventions)
 * - Personal Patterns (behaviors, anomalies)
 * - Session History (what you worked on)
 *
 * Privacy by Design:
 * - All data stays local by default
 * - User explicitly chooses what to sync
 * - "never" status = truly private forever
 *
 * "Your mind, your data, your choice" - κυνικός
 *
 * @module @cynic/persistence/sqlite/LocalPrivacyStore
 */

'use strict';

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';

// Default location: ~/.cynic/privacy.db
const DEFAULT_DB_PATH = join(homedir(), '.cynic', 'privacy.db');

/**
 * Sync status enum
 */
export const SyncStatus = {
  LOCAL: 'local',      // Default - stays local
  PENDING: 'pending',  // Marked for sync
  SYNCED: 'synced',    // Already synced
  NEVER: 'never',      // Never sync (truly private)
};

/**
 * Local SQLite store for privacy-sensitive data
 */
export class LocalPrivacyStore {
  /**
   * @param {Object} [options] - Store options
   * @param {string} [options.dbPath] - Path to SQLite database
   * @param {string} [options.userId] - Current user ID
   * @param {boolean} [options.verbose] - Enable verbose logging
   */
  constructor(options = {}) {
    this.dbPath = options.dbPath || process.env.CYNIC_PRIVACY_DB || DEFAULT_DB_PATH;
    this.userId = options.userId || process.env.CYNIC_USER_ID || 'default';
    this.verbose = options.verbose || false;
    this.db = null;
  }

  /**
   * Initialize the database
   */
  async initialize() {
    // Ensure directory exists
    const dir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/') || this.dbPath.lastIndexOf('\\'));
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.dbPath, {
      verbose: this.verbose ? console.error : null,
    });

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Create all tables
    this._createTables();

    if (this.verbose) {
      console.error(`[LocalPrivacyStore] Initialized at ${this.dbPath}`);
    }

    return this;
  }

  /**
   * Create database tables
   * @private
   */
  _createTables() {
    // ═══════════════════════════════════════════════════════════════════════
    // E-SCORE & BURNS (Personal contribution metrics)
    // ═══════════════════════════════════════════════════════════════════════
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS escore_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        score REAL NOT NULL,
        components TEXT, -- JSON: { burns, uptime, quality, reputation }
        calculated_at TEXT DEFAULT (datetime('now')),
        -- Privacy
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced', 'never'))
      );

      CREATE INDEX IF NOT EXISTS idx_escore_user ON escore_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_escore_time ON escore_history(calculated_at DESC);

      CREATE TABLE IF NOT EXISTS burns_local (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        token TEXT DEFAULT 'SOL',
        tx_signature TEXT,
        purpose TEXT, -- 'judgment', 'vote', 'stake', 'fee'
        burned_at TEXT DEFAULT (datetime('now')),
        -- On-chain verification
        verified INTEGER DEFAULT 0,
        verified_at TEXT,
        -- Privacy
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced', 'never'))
      );

      CREATE INDEX IF NOT EXISTS idx_burns_user ON burns_local(user_id);
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // LEARNING PROFILES (Calibration & feedback history)
    // ═══════════════════════════════════════════════════════════════════════
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS learning_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        -- Dimension weights (learned from feedback)
        dimension_weights TEXT, -- JSON: { technical: 1.2, community: 0.8, ... }
        -- Calibration
        calibration_score REAL DEFAULT 0.5,
        total_predictions INTEGER DEFAULT 0,
        correct_predictions INTEGER DEFAULT 0,
        -- Learning stats
        total_feedback INTEGER DEFAULT 0,
        positive_feedback INTEGER DEFAULT 0,
        negative_feedback INTEGER DEFAULT 0,
        -- Preferences
        preferred_domains TEXT, -- JSON array
        avoided_domains TEXT, -- JSON array
        -- Timestamps
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        -- Privacy
        sync_status TEXT DEFAULT 'never' CHECK (sync_status IN ('local', 'pending', 'synced', 'never'))
      );

      CREATE TABLE IF NOT EXISTS feedback_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        judgment_id TEXT,
        feedback_type TEXT, -- 'correct', 'incorrect', 'partial', 'skip'
        expected_score REAL,
        actual_score REAL,
        dimension_feedback TEXT, -- JSON: { technical: +1, community: -1 }
        context TEXT, -- What was being judged
        created_at TEXT DEFAULT (datetime('now')),
        -- Privacy (feedback is always local)
        sync_status TEXT DEFAULT 'never' CHECK (sync_status IN ('local', 'pending', 'synced', 'never'))
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_judgment ON feedback_history(judgment_id);
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // PSYCHOLOGY STATE (Energy, focus, mental state)
    // ═══════════════════════════════════════════════════════════════════════
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS psychology_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        session_id TEXT,
        -- Core metrics
        energy INTEGER DEFAULT 100,
        focus INTEGER DEFAULT 100,
        state TEXT, -- 'FLOW', 'GRIND', 'EXPLORE', 'REST', 'BURNOUT'
        -- Trends
        energy_trend TEXT, -- 'rising', 'stable', 'falling'
        focus_trend TEXT,
        -- Composites
        in_flow INTEGER DEFAULT 0,
        burnout_risk INTEGER DEFAULT 0,
        -- Emotional state
        emotions TEXT, -- JSON array: ['focused', 'frustrated', 'curious']
        -- Cognitive biases detected
        biases TEXT, -- JSON array: ['confirmation_bias', 'sunk_cost']
        -- Timestamp
        captured_at TEXT DEFAULT (datetime('now')),
        -- Privacy (psychology is ALWAYS local)
        sync_status TEXT DEFAULT 'never' CHECK (sync_status IN ('local', 'pending', 'synced', 'never'))
      );

      CREATE INDEX IF NOT EXISTS idx_psy_user ON psychology_snapshots(user_id);
      CREATE INDEX IF NOT EXISTS idx_psy_session ON psychology_snapshots(session_id);

      CREATE TABLE IF NOT EXISTS interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        intervention_type TEXT, -- 'break_suggestion', 'focus_reminder', 'bias_warning'
        message TEXT,
        context TEXT, -- What triggered it
        accepted INTEGER DEFAULT 0, -- Did user follow suggestion?
        effectiveness REAL, -- Measured effectiveness
        created_at TEXT DEFAULT (datetime('now')),
        -- Privacy
        sync_status TEXT DEFAULT 'never'
      );
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // PERSONAL PATTERNS (Behaviors, anomalies, habits)
    // ═══════════════════════════════════════════════════════════════════════
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS personal_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        pattern_type TEXT, -- 'work_habit', 'error_pattern', 'learning_style', 'preference'
        name TEXT NOT NULL,
        description TEXT,
        confidence REAL DEFAULT 0.5,
        occurrences INTEGER DEFAULT 1,
        last_seen TEXT DEFAULT (datetime('now')),
        first_seen TEXT DEFAULT (datetime('now')),
        -- Pattern data
        data TEXT, -- JSON: pattern-specific data
        triggers TEXT, -- JSON: what triggers this pattern
        -- Is this a positive or negative pattern?
        valence TEXT DEFAULT 'neutral', -- 'positive', 'negative', 'neutral'
        -- Privacy
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced', 'never'))
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_user ON personal_patterns(user_id);
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON personal_patterns(pattern_type);

      CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        anomaly_type TEXT, -- 'unusual_hours', 'error_spike', 'mood_shift', 'performance_change'
        severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
        description TEXT,
        context TEXT, -- JSON: surrounding data
        detected_at TEXT DEFAULT (datetime('now')),
        addressed INTEGER DEFAULT 0,
        -- Privacy
        sync_status TEXT DEFAULT 'never'
      );
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // SESSION HISTORY (What you worked on)
    // ═══════════════════════════════════════════════════════════════════════
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        session_id TEXT UNIQUE NOT NULL,
        project_path TEXT,
        project_name TEXT,
        branch TEXT,
        -- Stats
        started_at TEXT DEFAULT (datetime('now')),
        ended_at TEXT,
        duration_seconds INTEGER,
        tool_calls INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        judgments INTEGER DEFAULT 0,
        -- Thermodynamics
        heat_generated REAL DEFAULT 0,
        work_done REAL DEFAULT 0,
        efficiency REAL,
        -- Summary
        summary TEXT, -- AI-generated summary
        key_decisions TEXT, -- JSON array
        files_modified TEXT, -- JSON array
        -- Privacy
        sync_status TEXT DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced', 'never'))
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user ON session_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON session_history(project_name);
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // SYNC LOG (Track all sync operations)
    // ═══════════════════════════════════════════════════════════════════════
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS privacy_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL, -- 'sync', 'unsync', 'mark_never'
        synced_at TEXT DEFAULT (datetime('now')),
        details TEXT -- JSON
      );

      CREATE INDEX IF NOT EXISTS idx_sync_log ON privacy_sync_log(table_name, entity_id);
    `);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // E-SCORE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record E-Score snapshot
   * @param {Object} escore
   */
  recordEScore(escore) {
    const stmt = this.db.prepare(`
      INSERT INTO escore_history (user_id, score, components)
      VALUES (?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      escore.userId || this.userId,
      escore.score,
      JSON.stringify(escore.components || {}),
    );
  }

  /**
   * Get E-Score history
   * @param {Object} options
   */
  getEScoreHistory(options = {}) {
    const userId = options.userId || this.userId;
    const limit = options.limit || 100;
    const stmt = this.db.prepare(`
      SELECT * FROM escore_history
      WHERE user_id = ?
      ORDER BY calculated_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit).map(r => ({
      ...r,
      components: JSON.parse(r.components || '{}'),
    }));
  }

  /**
   * Record a burn
   * @param {Object} burn
   */
  recordBurn(burn) {
    const stmt = this.db.prepare(`
      INSERT INTO burns_local (user_id, amount, token, tx_signature, purpose)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      burn.userId || this.userId,
      burn.amount,
      burn.token || 'SOL',
      burn.txSignature,
      burn.purpose,
    );
  }

  /**
   * Get total burns
   * @param {string} userId
   */
  getTotalBurns(userId) {
    const stmt = this.db.prepare(`
      SELECT SUM(amount) as total, token
      FROM burns_local
      WHERE user_id = ?
      GROUP BY token
    `);
    return stmt.all(userId || this.userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING PROFILE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get or create learning profile
   * @param {string} userId
   */
  getLearningProfile(userId) {
    userId = userId || this.userId;

    let profile = this.db.prepare('SELECT * FROM learning_profile WHERE user_id = ?').get(userId);

    if (!profile) {
      const stmt = this.db.prepare(`
        INSERT INTO learning_profile (user_id, dimension_weights, preferred_domains, avoided_domains)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `);
      profile = stmt.get(userId, '{}', '[]', '[]');
    }

    return {
      ...profile,
      dimensionWeights: JSON.parse(profile.dimension_weights || '{}'),
      preferredDomains: JSON.parse(profile.preferred_domains || '[]'),
      avoidedDomains: JSON.parse(profile.avoided_domains || '[]'),
    };
  }

  /**
   * Update learning profile
   * @param {string} userId
   * @param {Object} updates
   */
  updateLearningProfile(userId, updates) {
    const current = this.getLearningProfile(userId);
    const stmt = this.db.prepare(`
      UPDATE learning_profile SET
        dimension_weights = ?,
        calibration_score = ?,
        total_predictions = ?,
        correct_predictions = ?,
        total_feedback = ?,
        positive_feedback = ?,
        negative_feedback = ?,
        preferred_domains = ?,
        avoided_domains = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
    `);

    return stmt.run(
      JSON.stringify(updates.dimensionWeights || current.dimensionWeights),
      updates.calibrationScore ?? current.calibration_score,
      updates.totalPredictions ?? current.total_predictions,
      updates.correctPredictions ?? current.correct_predictions,
      updates.totalFeedback ?? current.total_feedback,
      updates.positiveFeedback ?? current.positive_feedback,
      updates.negativeFeedback ?? current.negative_feedback,
      JSON.stringify(updates.preferredDomains || current.preferredDomains),
      JSON.stringify(updates.avoidedDomains || current.avoidedDomains),
      userId || this.userId,
    );
  }

  /**
   * Record feedback
   * @param {Object} feedback
   */
  recordFeedback(feedback) {
    const stmt = this.db.prepare(`
      INSERT INTO feedback_history (
        user_id, judgment_id, feedback_type,
        expected_score, actual_score, dimension_feedback, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      feedback.userId || this.userId,
      feedback.judgmentId,
      feedback.feedbackType,
      feedback.expectedScore,
      feedback.actualScore,
      JSON.stringify(feedback.dimensionFeedback || {}),
      feedback.context,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PSYCHOLOGY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record psychology snapshot
   * @param {Object} snapshot
   */
  recordPsychologySnapshot(snapshot) {
    const stmt = this.db.prepare(`
      INSERT INTO psychology_snapshots (
        user_id, session_id, energy, focus, state,
        energy_trend, focus_trend, in_flow, burnout_risk,
        emotions, biases
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      snapshot.userId || this.userId,
      snapshot.sessionId,
      snapshot.energy ?? 100,
      snapshot.focus ?? 100,
      snapshot.state || 'FLOW',
      snapshot.energyTrend || 'stable',
      snapshot.focusTrend || 'stable',
      snapshot.inFlow ? 1 : 0,
      snapshot.burnoutRisk ? 1 : 0,
      JSON.stringify(snapshot.emotions || []),
      JSON.stringify(snapshot.biases || []),
    );
  }

  /**
   * Get latest psychology state
   * @param {string} userId
   */
  getLatestPsychology(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM psychology_snapshots
      WHERE user_id = ?
      ORDER BY captured_at DESC
      LIMIT 1
    `);
    const row = stmt.get(userId || this.userId);
    if (!row) return null;

    return {
      ...row,
      emotions: JSON.parse(row.emotions || '[]'),
      biases: JSON.parse(row.biases || '[]'),
      inFlow: !!row.in_flow,
      burnoutRisk: !!row.burnout_risk,
    };
  }

  /**
   * Record intervention
   * @param {Object} intervention
   */
  recordIntervention(intervention) {
    const stmt = this.db.prepare(`
      INSERT INTO interventions (
        user_id, intervention_type, message, context, accepted
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      intervention.userId || this.userId,
      intervention.type,
      intervention.message,
      intervention.context,
      intervention.accepted ? 1 : 0,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERNS OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upsert personal pattern
   * @param {Object} pattern
   */
  upsertPattern(pattern) {
    const stmt = this.db.prepare(`
      INSERT INTO personal_patterns (
        user_id, pattern_type, name, description,
        confidence, occurrences, data, triggers, valence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        confidence = excluded.confidence,
        occurrences = occurrences + 1,
        last_seen = datetime('now'),
        data = excluded.data
      RETURNING *
    `);
    return stmt.get(
      pattern.userId || this.userId,
      pattern.type,
      pattern.name,
      pattern.description,
      pattern.confidence || 0.5,
      pattern.occurrences || 1,
      JSON.stringify(pattern.data || {}),
      JSON.stringify(pattern.triggers || []),
      pattern.valence || 'neutral',
    );
  }

  /**
   * Get patterns by type
   * @param {string} type
   * @param {Object} options
   */
  getPatterns(type, options = {}) {
    const userId = options.userId || this.userId;
    let sql = 'SELECT * FROM personal_patterns WHERE user_id = ?';
    const params = [userId];

    if (type) {
      sql += ' AND pattern_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY occurrences DESC, last_seen DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(...params).map(p => ({
      ...p,
      data: JSON.parse(p.data || '{}'),
      triggers: JSON.parse(p.triggers || '[]'),
    }));
  }

  /**
   * Record anomaly
   * @param {Object} anomaly
   */
  recordAnomaly(anomaly) {
    const stmt = this.db.prepare(`
      INSERT INTO anomalies (
        user_id, anomaly_type, severity, description, context
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      anomaly.userId || this.userId,
      anomaly.type,
      anomaly.severity || 'low',
      anomaly.description,
      JSON.stringify(anomaly.context || {}),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start a new session
   * @param {Object} session
   */
  startSession(session) {
    const stmt = this.db.prepare(`
      INSERT INTO session_history (
        user_id, session_id, project_path, project_name, branch
      ) VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      session.userId || this.userId,
      session.sessionId,
      session.projectPath,
      session.projectName,
      session.branch,
    );
  }

  /**
   * End a session
   * @param {string} sessionId
   * @param {Object} stats
   */
  endSession(sessionId, stats = {}) {
    const stmt = this.db.prepare(`
      UPDATE session_history SET
        ended_at = datetime('now'),
        duration_seconds = CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER),
        tool_calls = ?,
        errors = ?,
        judgments = ?,
        heat_generated = ?,
        work_done = ?,
        efficiency = ?,
        summary = ?,
        key_decisions = ?,
        files_modified = ?
      WHERE session_id = ?
      RETURNING *
    `);
    return stmt.get(
      stats.toolCalls || 0,
      stats.errors || 0,
      stats.judgments || 0,
      stats.heat || 0,
      stats.work || 0,
      stats.efficiency,
      stats.summary,
      JSON.stringify(stats.keyDecisions || []),
      JSON.stringify(stats.filesModified || []),
      sessionId,
    );
  }

  /**
   * Get recent sessions
   * @param {Object} options
   */
  getRecentSessions(options = {}) {
    const userId = options.userId || this.userId;
    const limit = options.limit || 10;

    const stmt = this.db.prepare(`
      SELECT * FROM session_history
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `);

    return stmt.all(userId, limit).map(s => ({
      ...s,
      keyDecisions: JSON.parse(s.key_decisions || '[]'),
      filesModified: JSON.parse(s.files_modified || '[]'),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Mark items for sync
   * @param {string} tableName
   * @param {Array<number>} ids
   * @param {string} status
   */
  markForSync(tableName, ids, status = 'pending') {
    const stmt = this.db.prepare(`
      UPDATE ${tableName}
      SET sync_status = ?
      WHERE id IN (${ids.map(() => '?').join(',')})
    `);
    return stmt.run(status, ...ids);
  }

  /**
   * Get items pending sync
   * @param {string} tableName
   */
  getPendingSync(tableName) {
    const stmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE sync_status = 'pending'`);
    return stmt.all();
  }

  /**
   * Mark synced
   * @param {string} tableName
   * @param {Array<number>} ids
   */
  markSynced(tableName, ids) {
    return this.markForSync(tableName, ids, 'synced');
  }

  /**
   * Mark as never sync
   * @param {string} tableName
   * @param {Array<number>} ids
   */
  markNeverSync(tableName, ids) {
    return this.markForSync(tableName, ids, 'never');
  }

  /**
   * Log sync action
   * @param {string} tableName
   * @param {string} entityId
   * @param {string} action
   * @param {Object} details
   */
  logSync(tableName, entityId, action, details = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO privacy_sync_log (table_name, entity_id, action, details)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(tableName, entityId, action, JSON.stringify(details));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS & EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get store statistics
   */
  getStats() {
    const tables = [
      'escore_history', 'burns_local', 'learning_profile', 'feedback_history',
      'psychology_snapshots', 'interventions', 'personal_patterns', 'anomalies',
      'session_history',
    ];

    const stats = { userId: this.userId, dbPath: this.dbPath, tables: {} };

    for (const table of tables) {
      try {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        const syncStats = this.db.prepare(`
          SELECT sync_status, COUNT(*) as count
          FROM ${table}
          GROUP BY sync_status
        `).all();

        stats.tables[table] = {
          total: count.count,
          byStatus: Object.fromEntries(syncStats.map(s => [s.sync_status, s.count])),
        };
      } catch (e) {
        stats.tables[table] = { error: e.message };
      }
    }

    return stats;
  }

  /**
   * Export all local data for a user (for backup/portability)
   * @param {string} userId
   */
  exportUserData(userId) {
    userId = userId || this.userId;

    return {
      userId,
      exportedAt: new Date().toISOString(),
      escore: this.getEScoreHistory({ userId, limit: 1000 }),
      burns: this.getTotalBurns(userId),
      learning: this.getLearningProfile(userId),
      psychology: this.db.prepare('SELECT * FROM psychology_snapshots WHERE user_id = ?').all(userId),
      patterns: this.getPatterns(null, { userId }),
      sessions: this.getRecentSessions({ userId, limit: 100 }),
    };
  }

  /**
   * Close the database
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default LocalPrivacyStore;
