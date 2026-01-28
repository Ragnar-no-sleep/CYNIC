/**
 * User Preferences Repository
 *
 * Manages user preferences for judgment, automation, and UI settings.
 * Preferences persist across sessions and support history tracking.
 *
 * φ-aligned defaults:
 * - judgment_strictness: 0.5 (balanced)
 * - min_confidence: 0.382 (φ⁻²)
 * - learning_rate: 0.236 (φ⁻³)
 *
 * @module @cynic/persistence/repositories/user-preferences
 */

'use strict';

import { getPool } from '../client.js';
import { BaseRepository } from '../../interfaces/IRepository.js';

// φ-aligned defaults
const PHI_INV = 0.618;
const PHI_INV_2 = 0.382;
const PHI_INV_3 = 0.236;

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES = {
  judgment_strictness: 0.5,
  auto_judge: true,
  min_confidence: PHI_INV_2,
  auto_learn: true,
  learning_rate: PHI_INV_3,
  auto_notifications: true,
  theme: 'dark',
  language: 'en',
  timezone: null,
  notification_level: 'normal',
  email_notifications: false,
  features: {},
  custom: {},
};

/**
 * User Preferences Repository
 *
 * @extends BaseRepository
 */
export class UserPreferencesRepository extends BaseRepository {
  constructor(db = null) {
    super(db || getPool());
  }

  /**
   * Get preferences for a user
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences (with defaults)
   */
  async get(userId) {
    const { rows } = await this.db.query(`
      SELECT * FROM user_preferences WHERE user_id = $1
    `, [userId]);

    if (rows.length === 0) {
      return { ...DEFAULT_PREFERENCES, userId };
    }

    return this._rowToPreferences(rows[0]);
  }

  /**
   * Get or create preferences for a user
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getOrCreate(userId) {
    let prefs = await this.get(userId);

    if (!prefs.id) {
      prefs = await this.create(userId);
    }

    return prefs;
  }

  /**
   * Create default preferences for a user
   *
   * @param {string} userId - User ID
   * @param {Object} [initial={}] - Initial preference values
   * @returns {Promise<Object>} Created preferences
   */
  async create(userId, initial = {}) {
    const { rows } = await this.db.query(`
      INSERT INTO user_preferences (
        user_id,
        judgment_strictness,
        auto_judge,
        min_confidence,
        auto_learn,
        learning_rate,
        auto_notifications,
        theme,
        language,
        timezone,
        notification_level,
        email_notifications,
        features,
        custom
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `, [
      userId,
      initial.judgment_strictness ?? DEFAULT_PREFERENCES.judgment_strictness,
      initial.auto_judge ?? DEFAULT_PREFERENCES.auto_judge,
      initial.min_confidence ?? DEFAULT_PREFERENCES.min_confidence,
      initial.auto_learn ?? DEFAULT_PREFERENCES.auto_learn,
      initial.learning_rate ?? DEFAULT_PREFERENCES.learning_rate,
      initial.auto_notifications ?? DEFAULT_PREFERENCES.auto_notifications,
      initial.theme ?? DEFAULT_PREFERENCES.theme,
      initial.language ?? DEFAULT_PREFERENCES.language,
      initial.timezone ?? DEFAULT_PREFERENCES.timezone,
      initial.notification_level ?? DEFAULT_PREFERENCES.notification_level,
      initial.email_notifications ?? DEFAULT_PREFERENCES.email_notifications,
      JSON.stringify(initial.features ?? DEFAULT_PREFERENCES.features),
      JSON.stringify(initial.custom ?? DEFAULT_PREFERENCES.custom),
    ]);

    return this._rowToPreferences(rows[0]);
  }

  /**
   * Update a single preference
   *
   * @param {string} userId - User ID
   * @param {string} key - Preference key
   * @param {*} value - New value
   * @param {Object} [options={}] - Options
   * @param {string} [options.changedBy='user'] - Who made the change
   * @param {string} [options.reason] - Reason for change
   * @returns {Promise<Object>} Updated preferences
   */
  async set(userId, key, value, options = {}) {
    const { changedBy = 'user', reason = null } = options;

    // Validate key is a valid preference column
    const validKeys = [
      'judgment_strictness', 'auto_judge', 'min_confidence',
      'auto_learn', 'learning_rate', 'auto_notifications',
      'theme', 'language', 'timezone',
      'notification_level', 'email_notifications',
      'features', 'custom',
    ];

    if (!validKeys.includes(key)) {
      throw new Error(`Invalid preference key: ${key}`);
    }

    // Ensure user exists
    await this.getOrCreate(userId);

    // Get old value for history
    const oldPrefs = await this.get(userId);
    const oldValue = oldPrefs[key];

    // Handle JSONB fields
    const isJsonField = key === 'features' || key === 'custom';
    const dbValue = isJsonField ? JSON.stringify(value) : value;

    // Update preference
    await this.db.query(`
      UPDATE user_preferences
      SET ${key} = $2, updated_at = NOW()
      WHERE user_id = $1
    `, [userId, dbValue]);

    // Record history
    await this._recordHistory(userId, key, oldValue, value, changedBy, reason);

    return this.get(userId);
  }

  /**
   * Update multiple preferences at once
   *
   * @param {string} userId - User ID
   * @param {Object} updates - Key-value pairs to update
   * @param {Object} [options={}] - Options
   * @returns {Promise<Object>} Updated preferences
   */
  async update(userId, updates, options = {}) {
    const { changedBy = 'user', reason = null } = options;

    // Ensure user exists
    await this.getOrCreate(userId);

    for (const [key, value] of Object.entries(updates)) {
      await this.set(userId, key, value, { changedBy, reason });
    }

    return this.get(userId);
  }

  /**
   * Set a custom preference (in the custom JSONB field)
   *
   * @param {string} userId - User ID
   * @param {string} key - Custom key
   * @param {*} value - Value
   * @returns {Promise<Object>} Updated preferences
   */
  async setCustom(userId, key, value) {
    await this.getOrCreate(userId);

    await this.db.query(`
      UPDATE user_preferences
      SET custom = jsonb_set(COALESCE(custom, '{}'), $2, $3::jsonb),
          updated_at = NOW()
      WHERE user_id = $1
    `, [userId, `{${key}}`, JSON.stringify(value)]);

    return this.get(userId);
  }

  /**
   * Get a custom preference
   *
   * @param {string} userId - User ID
   * @param {string} key - Custom key
   * @param {*} [defaultValue=null] - Default if not found
   * @returns {Promise<*>} Value
   */
  async getCustom(userId, key, defaultValue = null) {
    const prefs = await this.get(userId);
    return prefs.custom?.[key] ?? defaultValue;
  }

  /**
   * Set a feature flag
   *
   * @param {string} userId - User ID
   * @param {string} feature - Feature name
   * @param {boolean} enabled - Enabled state
   * @returns {Promise<Object>} Updated preferences
   */
  async setFeature(userId, feature, enabled) {
    await this.getOrCreate(userId);

    await this.db.query(`
      UPDATE user_preferences
      SET features = jsonb_set(COALESCE(features, '{}'), $2, $3::jsonb),
          updated_at = NOW()
      WHERE user_id = $1
    `, [userId, `{${feature}}`, JSON.stringify(enabled)]);

    return this.get(userId);
  }

  /**
   * Check if a feature is enabled
   *
   * @param {string} userId - User ID
   * @param {string} feature - Feature name
   * @param {boolean} [defaultValue=false] - Default if not set
   * @returns {Promise<boolean>} Enabled state
   */
  async isFeatureEnabled(userId, feature, defaultValue = false) {
    const prefs = await this.get(userId);
    return prefs.features?.[feature] ?? defaultValue;
  }

  /**
   * Get preference history for a user
   *
   * @param {string} userId - User ID
   * @param {Object} [options={}] - Options
   * @param {number} [options.limit=50] - Max entries
   * @param {string} [options.key] - Filter by key
   * @returns {Promise<Object[]>} History entries
   */
  async getHistory(userId, options = {}) {
    const { limit = 50, key = null } = options;

    let query = `
      SELECT * FROM user_preference_history
      WHERE user_id = $1
    `;
    const params = [userId];

    if (key) {
      query += ` AND preference_key = $2`;
      params.push(key);
    }

    query += ` ORDER BY changed_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows } = await this.db.query(query, params);

    return rows.map((row) => ({
      key: row.preference_key,
      oldValue: row.old_value,
      newValue: row.new_value,
      changedBy: row.changed_by,
      reason: row.change_reason,
      changedAt: row.changed_at,
    }));
  }

  /**
   * Reset preferences to defaults
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reset preferences
   */
  async reset(userId) {
    await this.db.query(`
      DELETE FROM user_preferences WHERE user_id = $1
    `, [userId]);

    // Record reset in history
    await this._recordHistory(userId, '*', null, DEFAULT_PREFERENCES, 'user', 'Reset to defaults');

    return this.create(userId);
  }

  /**
   * Delete preferences for a user
   *
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success
   */
  async delete(userId) {
    const { rowCount } = await this.db.query(`
      DELETE FROM user_preferences WHERE user_id = $1
    `, [userId]);
    return rowCount > 0;
  }

  /**
   * Find user by ID (BaseRepository interface)
   *
   * @param {string} id - User ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    return this.get(id);
  }

  /**
   * List users with preferences
   *
   * @param {Object} [options={}] - Options
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const { limit = 50, offset = 0 } = options;

    const { rows } = await this.db.query(`
      SELECT * FROM user_preferences
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return rows.map(this._rowToPreferences);
  }

  /**
   * Get statistics
   *
   * @returns {Promise<Object>}
   */
  async getStats() {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE auto_learn = true) as auto_learn_enabled,
        COUNT(*) FILTER (WHERE auto_judge = true) as auto_judge_enabled,
        AVG(judgment_strictness) as avg_strictness,
        COUNT(DISTINCT theme) as unique_themes
      FROM user_preferences
    `);

    const stats = rows[0];
    return {
      total: parseInt(stats.total) || 0,
      autoLearnEnabled: parseInt(stats.auto_learn_enabled) || 0,
      autoJudgeEnabled: parseInt(stats.auto_judge_enabled) || 0,
      avgStrictness: parseFloat(stats.avg_strictness) || 0.5,
      uniqueThemes: parseInt(stats.unique_themes) || 0,
    };
  }

  /**
   * Record preference change in history
   * @private
   */
  async _recordHistory(userId, key, oldValue, newValue, changedBy, reason) {
    try {
      await this.db.query(`
        INSERT INTO user_preference_history (
          user_id, preference_key, old_value, new_value, changed_by, change_reason
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        key,
        JSON.stringify(oldValue),
        JSON.stringify(newValue),
        changedBy,
        reason,
      ]);
    } catch (err) {
      // History is optional, don't fail the main operation
    }
  }

  /**
   * Convert database row to preferences object
   * @private
   */
  _rowToPreferences(row) {
    return {
      id: row.id,
      userId: row.user_id,
      judgmentStrictness: parseFloat(row.judgment_strictness),
      autoJudge: row.auto_judge,
      minConfidence: parseFloat(row.min_confidence),
      autoLearn: row.auto_learn,
      learningRate: parseFloat(row.learning_rate),
      autoNotifications: row.auto_notifications,
      theme: row.theme,
      language: row.language,
      timezone: row.timezone,
      notificationLevel: row.notification_level,
      emailNotifications: row.email_notifications,
      features: row.features || {},
      custom: row.custom || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default UserPreferencesRepository;
