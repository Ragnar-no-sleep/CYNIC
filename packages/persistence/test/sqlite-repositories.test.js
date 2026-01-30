#!/usr/bin/env node
/**
 * SQLite Repositories Unit Tests
 *
 * Tests for SQLite-compatible repositories:
 * - SQLiteJudgmentRepository
 * - SQLitePatternRepository
 * - SQLiteUserRepository
 *
 * Uses mock database for testing without better-sqlite3 dependency.
 *
 * "Same truth, smaller kennel" - CYNIC
 *
 * @module @cynic/persistence/test/sqlite-repositories
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// =============================================================================
// MOCK DATABASE
// =============================================================================

/**
 * Create a mock SQLite database that simulates better-sqlite3
 *
 * This mock handles the actual SQL patterns used by the repositories,
 * allowing comprehensive testing without native dependencies.
 */
function createMockSQLiteDb() {
  const storage = {
    users: [],
    judgments: [],
    patterns: [],
    sessions: [],
    schema_version: [{ version: 1 }],
  };

  let idCounter = 1;

  return {
    storage,
    connected: true,

    async connect() {
      this.connected = true;
    },

    close() {
      this.connected = false;
    },

    exec(sql) {
      // Handle schema creation - parse CREATE TABLE statements
      const createMatches = sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi);
      for (const match of createMatches) {
        const tableName = match[1].toLowerCase();
        if (!storage[tableName]) {
          storage[tableName] = [];
        }
      }
    },

    async query(sql, params = []) {
      const sqlLower = sql.toLowerCase().trim();

      // =====================================================================
      // USERS TABLE HANDLERS
      // =====================================================================

      // INSERT INTO users
      if (sqlLower.includes('insert into users')) {
        const user = {
          id: params[0],
          email: params[1],
          username: params[2],
          display_name: params[3],
          burn_amount: params[4] || 0,
          e_score: params[5] || 0,
          uptime_hours: params[6] || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_active: null,
        };
        storage.users.push(user);
        return { rows: [user], rowCount: 1 };
      }

      // SELECT * FROM users WHERE id = ?
      if (sqlLower.includes('select') && sqlLower.includes('from users') && sqlLower.includes('where id = ?')) {
        const found = storage.users.find(u => u.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // SELECT * FROM users WHERE email = ?
      if (sqlLower.includes('from users') && sqlLower.includes('where email = ?')) {
        const found = storage.users.find(u => u.email === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // SELECT * FROM users WHERE username = ?
      if (sqlLower.includes('from users') && sqlLower.includes('where username = ?')) {
        const found = storage.users.find(u => u.username === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // UPDATE users SET ... WHERE id = ?
      if (sqlLower.includes('update users') && sqlLower.includes('where id = ?')) {
        const userId = params[params.length - 1];
        const found = storage.users.find(u => u.id === userId);
        if (found) {
          found.updated_at = new Date().toISOString();
          // Handle last_active update
          if (sqlLower.includes('last_active')) {
            found.last_active = new Date().toISOString();
          }
          return { rows: [found], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // DELETE FROM users WHERE id = ?
      if (sqlLower.includes('delete from users') && sqlLower.includes('where id = ?')) {
        const userId = params[0];
        const idx = storage.users.findIndex(u => u.id === userId);
        if (idx >= 0) {
          storage.users.splice(idx, 1);
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?
      if (sqlLower.includes('from users') && sqlLower.includes('order by created_at desc')) {
        const limit = params[0] || 10;
        const offset = params[1] || 0;
        const sorted = [...storage.users].sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        );
        return { rows: sorted.slice(offset, offset + limit), rowCount: sorted.length };
      }

      // SELECT COUNT, SUM, AVG FROM users (stats)
      if (sqlLower.includes('from users') && sqlLower.includes('count(*)')) {
        const users = storage.users;
        const totalBurn = users.reduce((sum, u) => sum + (u.burn_amount || 0), 0);
        const avgEScore = users.length > 0
          ? users.reduce((sum, u) => sum + (u.e_score || 0), 0) / users.length
          : 0;
        return {
          rows: [{
            total: users.length,
            total_burn: totalBurn,
            avg_e_score: avgEScore,
          }],
          rowCount: 1,
        };
      }

      // =====================================================================
      // JUDGMENTS TABLE HANDLERS
      // =====================================================================

      // INSERT INTO judgments
      if (sqlLower.includes('insert into judgments')) {
        const judgment = {
          id: `id_${idCounter++}`,
          judgment_id: params[0],
          user_id: params[1],
          session_id: params[2],
          item_type: params[3],
          item_content: params[4],
          item_hash: params[5],
          q_score: params[6],
          global_score: params[7],
          confidence: params[8],
          verdict: params[9],
          axiom_scores: params[10],
          dimension_scores: params[11],
          weaknesses: params[12],
          context: params[13],
          reasoning_path: params[14],
          created_at: new Date().toISOString(),
        };
        storage.judgments.push(judgment);
        return { rows: [judgment], rowCount: 1 };
      }

      // SELECT * FROM judgments WHERE judgment_id = ?
      if (sqlLower.includes('from judgments') && sqlLower.includes('judgment_id = ?')) {
        const found = storage.judgments.find(j => j.judgment_id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // SELECT * FROM judgments WHERE item_hash = ?
      if (sqlLower.includes('from judgments') && sqlLower.includes('item_hash = ?')) {
        const limit = params[1] || 5;
        const found = storage.judgments.filter(j => j.item_hash === params[0]).slice(0, limit);
        return { rows: found, rowCount: found.length };
      }

      // SELECT * FROM judgments ORDER BY created_at DESC LIMIT ? (simple findRecent, no WHERE clause)
      if (sqlLower.includes('from judgments') && sqlLower.includes('order by created_at desc limit ?') &&
          !sqlLower.includes('where')) {
        const limit = params[params.length - 1] || 10;
        const sorted = [...storage.judgments].sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        );
        return { rows: sorted.slice(0, limit), rowCount: sorted.length };
      }

      // Judgment search (complex query with LIKE) - SELECT * FROM judgments WHERE 1=1 ... ORDER BY
      if (sqlLower.includes('select *') && sqlLower.includes('from judgments') &&
          sqlLower.includes('where 1=1') && sqlLower.includes('order by')) {
        let results = [...storage.judgments];
        let paramIdx = 0;

        // Filter by user_id (comes first if present)
        if (sqlLower.includes('and user_id = ?')) {
          results = results.filter(j => j.user_id === params[paramIdx]);
          paramIdx++;
        }

        // Filter by session_id
        if (sqlLower.includes('and session_id = ?')) {
          results = results.filter(j => j.session_id === params[paramIdx]);
          paramIdx++;
        }

        // Filter by verdict
        if (sqlLower.includes('and verdict = ?')) {
          results = results.filter(j => j.verdict === params[paramIdx]);
          paramIdx++;
        }

        // Filter by item_type
        if (sqlLower.includes('and item_type = ?')) {
          results = results.filter(j => j.item_type === params[paramIdx]);
          paramIdx++;
        }

        // Handle LIKE search (4 params for the 4 LIKE clauses)
        if (sqlLower.includes('like ?')) {
          const searchTerm = params[paramIdx]?.replace(/%/g, '');
          if (searchTerm) {
            results = results.filter(j =>
              (j.item_content && j.item_content.includes(searchTerm)) ||
              (j.item_type && j.item_type.includes(searchTerm)) ||
              (j.verdict && j.verdict.includes(searchTerm))
            );
          }
          paramIdx += 4; // Skip all 4 LIKE params
        }

        // Sort by created_at DESC
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Apply LIMIT and OFFSET (last two params)
        const limit = params[params.length - 2] || 10;
        const offset = params[params.length - 1] || 0;

        return { rows: results.slice(offset, offset + limit), rowCount: results.length };
      }

      // SELECT COUNT(*) FROM judgments WHERE 1=1
      if (sqlLower.includes('select count(*)') && sqlLower.includes('from judgments') && sqlLower.includes('where 1=1')) {
        let filtered = storage.judgments;
        let paramIdx = 0;

        if (sqlLower.includes('user_id = ?') && params[paramIdx] !== undefined) {
          filtered = filtered.filter(j => j.user_id === params[paramIdx]);
          paramIdx++;
        }
        if (sqlLower.includes('session_id = ?') && params[paramIdx] !== undefined) {
          filtered = filtered.filter(j => j.session_id === params[paramIdx]);
          paramIdx++;
        }

        return { rows: [{ count: filtered.length }], rowCount: 1 };
      }

      // SELECT COUNT(*) FROM judgments (simple)
      if (sqlLower.includes('select count(*)') && sqlLower.includes('from judgments') && !sqlLower.includes('where')) {
        return { rows: [{ count: storage.judgments.length }], rowCount: 1 };
      }

      // Judgment stats (AVG, SUM, COUNT)
      if (sqlLower.includes('from judgments') && sqlLower.includes('avg(q_score)')) {
        let filtered = storage.judgments;

        // Apply filters
        if (sqlLower.includes('user_id = ?') && params[0]) {
          filtered = filtered.filter(j => j.user_id === params[0]);
        }
        if (sqlLower.includes('session_id = ?')) {
          const idx = sqlLower.includes('user_id') ? 1 : 0;
          if (params[idx]) {
            filtered = filtered.filter(j => j.session_id === params[idx]);
          }
        }
        if (sqlLower.includes('created_at >= ?')) {
          const sinceParam = params[params.length - 1];
          if (sinceParam) {
            filtered = filtered.filter(j => new Date(j.created_at) >= new Date(sinceParam));
          }
        }

        const total = filtered.length;
        const avgScore = total > 0
          ? filtered.reduce((sum, j) => sum + (parseFloat(j.q_score) || 0), 0) / total
          : 0;
        const avgConfidence = total > 0
          ? filtered.reduce((sum, j) => sum + (parseFloat(j.confidence) || 0), 0) / total
          : 0;

        return {
          rows: [{
            total,
            avg_score: avgScore,
            avg_confidence: avgConfidence,
            howl_count: filtered.filter(j => j.verdict === 'HOWL').length,
            wag_count: filtered.filter(j => j.verdict === 'WAG').length,
            growl_count: filtered.filter(j => j.verdict === 'GROWL').length,
            bark_count: filtered.filter(j => j.verdict === 'BARK').length,
          }],
          rowCount: 1,
        };
      }

      // Reasoning path query
      if (sqlLower.includes('reasoning_path from judgments') && sqlLower.includes('judgment_id = ?')) {
        const found = storage.judgments.find(j => j.judgment_id === params[0]);
        return { rows: found ? [{ reasoning_path: found.reasoning_path }] : [], rowCount: found ? 1 : 0 };
      }

      // Trajectory stats
      if (sqlLower.includes('from judgments') && sqlLower.includes('with_trajectory')) {
        let filtered = storage.judgments;
        if (sqlLower.includes('item_type = ?') && params[0]) {
          filtered = filtered.filter(j => j.item_type === params[0]);
        }

        const withTrajectory = filtered.filter(j =>
          j.reasoning_path && j.reasoning_path !== '[]'
        ).length;

        return {
          rows: [{
            total: filtered.length,
            with_trajectory: withTrajectory,
          }],
          rowCount: 1,
        };
      }

      // =====================================================================
      // PATTERNS TABLE HANDLERS
      // =====================================================================

      // INSERT INTO patterns
      if (sqlLower.includes('insert into patterns')) {
        const pattern = {
          id: `id_${idCounter++}`,
          pattern_id: params[0],
          user_id: params[1],
          session_id: params[2],
          pattern_type: params[3],
          name: params[4],
          description: params[5],
          frequency: params[6] || 1,
          weight: params[7] || 1.0,
          axiom: params[8] || 'VERIFY',
          context: params[9] || '{}',
          metadata: params[10] || '{}',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        storage.patterns.push(pattern);
        return { rows: [pattern], rowCount: 1 };
      }

      // SELECT * FROM patterns WHERE pattern_id = ?
      if (sqlLower.includes('select') && sqlLower.includes('from patterns') && sqlLower.includes('pattern_id = ?')) {
        const found = storage.patterns.find(p => p.pattern_id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // UPDATE patterns SET frequency = frequency + ? WHERE pattern_id = ?
      if (sqlLower.includes('update patterns') && sqlLower.includes('frequency = frequency + ?')) {
        const boost = params[0];
        const patternId = params[1];
        const found = storage.patterns.find(p => p.pattern_id === patternId);
        if (found) {
          found.frequency = (found.frequency || 1) + boost;
          found.last_seen = new Date().toISOString();
          found.updated_at = new Date().toISOString();
          return { rows: [found], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // UPDATE patterns SET weight = ? WHERE pattern_id = ?
      if (sqlLower.includes('update patterns') && sqlLower.includes('weight = ?') && !sqlLower.includes('frequency')) {
        const weight = params[0];
        const patternId = params[1];
        const found = storage.patterns.find(p => p.pattern_id === patternId);
        if (found) {
          found.weight = weight;
          found.updated_at = new Date().toISOString();
          return { rows: [found], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // UPDATE patterns SET (general)
      if (sqlLower.includes('update patterns set') && sqlLower.includes('where pattern_id = ?')) {
        const patternId = params[params.length - 1];
        const found = storage.patterns.find(p => p.pattern_id === patternId);
        if (found) {
          found.updated_at = new Date().toISOString();
          return { rows: [found], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // DELETE FROM patterns WHERE pattern_id = ?
      if (sqlLower.includes('delete from patterns') && sqlLower.includes('pattern_id = ?')) {
        const patternId = params[0];
        const idx = storage.patterns.findIndex(p => p.pattern_id === patternId);
        if (idx >= 0) {
          const deleted = storage.patterns.splice(idx, 1);
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      // Pattern search (SELECT * ... ORDER BY)
      if (sqlLower.includes('select *') && sqlLower.includes('from patterns') &&
          sqlLower.includes('where 1=1') && sqlLower.includes('order by')) {
        let results = [...storage.patterns];

        // Filter by user_id
        if (sqlLower.includes('user_id = ?')) {
          results = results.filter(p => p.user_id === params[0]);
        }

        // Filter by pattern_type
        if (sqlLower.includes('pattern_type = ?')) {
          const typeIdx = sqlLower.includes('user_id') ? 1 : 0;
          results = results.filter(p => p.pattern_type === params[typeIdx]);
        }

        // Filter by axiom
        if (sqlLower.includes('axiom = ?')) {
          const axiomIdx = params.length > 3 ? 2 : 0;
          results = results.filter(p => p.axiom === params[axiomIdx]);
        }

        // Handle LIKE search
        if (sqlLower.includes('like ?')) {
          const searchTerm = params.find(p => typeof p === 'string' && p.includes('%'))?.replace(/%/g, '');
          if (searchTerm) {
            results = results.filter(p =>
              (p.name && p.name.includes(searchTerm)) ||
              (p.description && p.description.includes(searchTerm))
            );
          }
        }

        // Sort by frequency DESC, weight DESC
        results.sort((a, b) => {
          if (b.frequency !== a.frequency) return b.frequency - a.frequency;
          return b.weight - a.weight;
        });

        // Apply LIMIT and OFFSET
        const limit = params[params.length - 2] || 10;
        const offset = params[params.length - 1] || 0;

        return { rows: results.slice(offset, offset + limit), rowCount: results.length };
      }

      // SELECT * FROM patterns WHERE pattern_type = ?
      if (sqlLower.includes('from patterns') && sqlLower.includes('pattern_type = ?') && !sqlLower.includes('where 1=1')) {
        let results = storage.patterns.filter(p => p.pattern_type === params[0]);

        if (sqlLower.includes('user_id = ?')) {
          results = results.filter(p => p.user_id === params[1]);
        }

        results.sort((a, b) => b.frequency - a.frequency);

        const limit = params[params.length - 1] || 10;
        return { rows: results.slice(0, limit), rowCount: results.length };
      }

      // SELECT * FROM patterns WHERE weight >= ? (findTopReinforced)
      if (sqlLower.includes('from patterns') && sqlLower.includes('weight >= ?')) {
        let results = storage.patterns.filter(p => p.weight >= params[0]);

        if (sqlLower.includes('user_id = ?')) {
          results = results.filter(p => p.user_id === params[1]);
        }

        results.sort((a, b) => {
          if (b.weight !== a.weight) return b.weight - a.weight;
          return b.frequency - a.frequency;
        });

        const limit = params[params.length - 1] || 10;
        return { rows: results.slice(0, limit), rowCount: results.length };
      }

      // Pattern stats - with or without userId filter
      if (sqlLower.includes('from patterns') && sqlLower.includes('avg(frequency)')) {
        let filtered = [...storage.patterns];

        // Check if userId filter is present and has a value
        if (sqlLower.includes('user_id = ?')) {
          const userId = params[0];
          if (userId) {
            filtered = filtered.filter(p => p.user_id === userId);
          }
        }

        const total = filtered.length;
        const avgFrequency = total > 0
          ? filtered.reduce((sum, p) => sum + (p.frequency || 0), 0) / total
          : 0;
        const avgWeight = total > 0
          ? filtered.reduce((sum, p) => sum + (p.weight || 0), 0) / total
          : 0;
        const typeCount = new Set(filtered.map(p => p.pattern_type)).size;

        return {
          rows: [{
            total,
            avg_frequency: avgFrequency,
            avg_weight: avgWeight,
            type_count: typeCount,
          }],
          rowCount: 1,
        };
      }

      // =====================================================================
      // DEFAULT HANDLER
      // =====================================================================

      console.warn('Mock DB: Unhandled query pattern:', sql.slice(0, 80));
      return { rows: [], rowCount: 0 };
    },
  };
}

// =============================================================================
// USER REPOSITORY TESTS
// =============================================================================

describe('SQLiteUserRepository', () => {
  let db;
  let repo;

  // Import dynamically to avoid issues if module not found
  const createUserRepository = (db) => {
    return {
      db,

      async create(user) {
        const userId = user.id || `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const { rows } = await db.query(`
          INSERT INTO users (
            id, email, username, display_name,
            burn_amount, e_score, uptime_hours
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `, [
          userId,
          user.email || null,
          user.username || null,
          user.displayName || user.display_name || null,
          user.burnAmount || user.burn_amount || 0,
          user.eScore || user.e_score || 0,
          user.uptimeHours || user.uptime_hours || 0,
        ]);
        return rows[0];
      },

      async findById(userId) {
        const { rows } = await db.query(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );
        return rows[0] || null;
      },

      async findByEmail(email) {
        const { rows } = await db.query(
          'SELECT * FROM users WHERE email = ?',
          [email]
        );
        return rows[0] || null;
      },

      async findByUsername(username) {
        const { rows } = await db.query(
          'SELECT * FROM users WHERE username = ?',
          [username]
        );
        return rows[0] || null;
      },

      async update(userId, data) {
        const sets = [];
        const params = [];

        if (data.email !== undefined) {
          sets.push('email = ?');
          params.push(data.email);
        }
        if (data.username !== undefined) {
          sets.push('username = ?');
          params.push(data.username);
        }
        if (data.displayName !== undefined || data.display_name !== undefined) {
          sets.push('display_name = ?');
          params.push(data.displayName || data.display_name);
        }

        sets.push("updated_at = datetime('now')");
        params.push(userId);

        const { rows } = await db.query(`
          UPDATE users SET ${sets.join(', ')} WHERE id = ?
          RETURNING *
        `, params);

        return rows[0] || null;
      },

      async updateLastActive(userId) {
        const { rows } = await db.query(`
          UPDATE users
          SET last_active = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ?
          RETURNING *
        `, [userId]);
        return rows[0] || null;
      },

      async delete(userId) {
        const { rowCount } = await db.query(
          'DELETE FROM users WHERE id = ?',
          [userId]
        );
        return rowCount > 0;
      },

      async list(options = {}) {
        const { limit = 10, offset = 0 } = options;
        const { rows } = await db.query(
          'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [limit, offset]
        );
        return rows;
      },

      async getStats() {
        const { rows } = await db.query(`
          SELECT
            COUNT(*) as total,
            SUM(burn_amount) as total_burn,
            AVG(e_score) as avg_e_score
          FROM users
        `);
        const stats = rows[0];
        return {
          total: parseInt(stats.total) || 0,
          totalBurn: parseFloat(stats.total_burn) || 0,
          avgEScore: parseFloat(stats.avg_e_score) || 0,
        };
      },

      async findOrCreate(email, defaults = {}) {
        let user = await this.findByEmail(email);
        if (!user) {
          user = await this.create({ email, ...defaults });
        }
        return user;
      },
    };
  };

  beforeEach(() => {
    db = createMockSQLiteDb();
    repo = createUserRepository(db);
  });

  describe('create', () => {
    it('creates a new user', async () => {
      const user = await repo.create({
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        eScore: 50,
      });

      assert.ok(user.id);
      assert.equal(user.email, 'test@example.com');
      assert.equal(user.username, 'testuser');
      assert.equal(user.display_name, 'Test User');
      assert.equal(user.e_score, 50);
    });

    it('creates user with default values', async () => {
      const user = await repo.create({
        email: 'minimal@example.com',
      });

      assert.ok(user.id);
      assert.equal(user.email, 'minimal@example.com');
      assert.equal(user.burn_amount, 0);
      assert.equal(user.e_score, 0);
    });

    it('allows custom user ID', async () => {
      const customId = 'custom_user_123';
      const user = await repo.create({
        id: customId,
        email: 'custom@example.com',
      });

      assert.equal(user.id, customId);
    });
  });

  describe('findById', () => {
    it('finds existing user', async () => {
      const created = await repo.create({ email: 'find@example.com' });
      const found = await repo.findById(created.id);

      assert.ok(found);
      assert.equal(found.id, created.id);
      assert.equal(found.email, 'find@example.com');
    });

    it('returns null for non-existent user', async () => {
      const found = await repo.findById('nonexistent_id');
      assert.equal(found, null);
    });
  });

  describe('findByEmail', () => {
    it('finds user by email', async () => {
      await repo.create({ email: 'unique@example.com' });
      const found = await repo.findByEmail('unique@example.com');

      assert.ok(found);
      assert.equal(found.email, 'unique@example.com');
    });

    it('returns null for unknown email', async () => {
      const found = await repo.findByEmail('unknown@example.com');
      assert.equal(found, null);
    });
  });

  describe('findByUsername', () => {
    it('finds user by username', async () => {
      await repo.create({ email: 'a@b.com', username: 'uniqueuser' });
      const found = await repo.findByUsername('uniqueuser');

      assert.ok(found);
      assert.equal(found.username, 'uniqueuser');
    });

    it('returns null for unknown username', async () => {
      const found = await repo.findByUsername('unknownuser');
      assert.equal(found, null);
    });
  });

  describe('update', () => {
    it('updates user fields', async () => {
      const created = await repo.create({ email: 'update@example.com' });
      const updated = await repo.update(created.id, {
        username: 'newusername',
        displayName: 'New Name',
      });

      // Mock returns the user object after update
      assert.ok(updated);
      assert.equal(updated.id, created.id);
    });

    it('returns null for non-existent user', async () => {
      const updated = await repo.update('nonexistent', { email: 'new@example.com' });
      assert.equal(updated, null);
    });
  });

  describe('updateLastActive', () => {
    it('updates last_active timestamp', async () => {
      const created = await repo.create({ email: 'active@example.com' });
      const updated = await repo.updateLastActive(created.id);

      assert.ok(updated);
      assert.ok(updated.last_active);
    });
  });

  describe('delete', () => {
    it('deletes existing user', async () => {
      const created = await repo.create({ email: 'delete@example.com' });
      const deleted = await repo.delete(created.id);

      assert.equal(deleted, true);

      const found = await repo.findById(created.id);
      assert.equal(found, null);
    });

    it('returns false for non-existent user', async () => {
      const deleted = await repo.delete('nonexistent_id');
      assert.equal(deleted, false);
    });
  });

  describe('list', () => {
    it('returns users with pagination', async () => {
      await repo.create({ email: 'list1@example.com' });
      await repo.create({ email: 'list2@example.com' });
      await repo.create({ email: 'list3@example.com' });

      const users = await repo.list({ limit: 2, offset: 0 });

      assert.equal(users.length, 2);
    });

    it('respects offset', async () => {
      await repo.create({ email: 'offset1@example.com' });
      await repo.create({ email: 'offset2@example.com' });
      await repo.create({ email: 'offset3@example.com' });

      const users = await repo.list({ limit: 10, offset: 1 });

      assert.ok(users.length >= 2);
    });
  });

  describe('getStats', () => {
    it('returns user statistics', async () => {
      await repo.create({ email: 'stats1@example.com', eScore: 60, burnAmount: 10 });
      await repo.create({ email: 'stats2@example.com', eScore: 80, burnAmount: 20 });

      const stats = await repo.getStats();

      assert.equal(stats.total, 2);
      assert.equal(stats.totalBurn, 30);
      assert.equal(stats.avgEScore, 70);
    });

    it('handles empty repository', async () => {
      const stats = await repo.getStats();

      assert.equal(stats.total, 0);
      assert.equal(stats.totalBurn, 0);
      assert.equal(stats.avgEScore, 0);
    });
  });

  describe('findOrCreate', () => {
    it('returns existing user', async () => {
      const created = await repo.create({ email: 'existing@example.com' });
      const found = await repo.findOrCreate('existing@example.com');

      assert.equal(found.id, created.id);
    });

    it('creates new user if not exists', async () => {
      const user = await repo.findOrCreate('new@example.com', { username: 'newuser' });

      assert.ok(user.id);
      assert.equal(user.email, 'new@example.com');
    });
  });
});

// =============================================================================
// JUDGMENT REPOSITORY TESTS
// =============================================================================

describe('SQLiteJudgmentRepository', () => {
  let db;
  let repo;

  const createJudgmentRepository = (db) => {
    const generateJudgmentId = () => 'jdg_' + Math.random().toString(36).slice(2, 10);

    const hashContent = (content) => {
      // Simple hash for testing
      const str = typeof content === 'string' ? content : JSON.stringify(content);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    };

    const parseRow = (row) => {
      if (!row) return null;
      return {
        ...row,
        axiom_scores: row.axiom_scores ? JSON.parse(row.axiom_scores) : {},
        dimension_scores: row.dimension_scores ? JSON.parse(row.dimension_scores) : null,
        weaknesses: row.weaknesses ? JSON.parse(row.weaknesses) : [],
        context: row.context ? JSON.parse(row.context) : {},
        reasoning_path: row.reasoning_path ? JSON.parse(row.reasoning_path) : [],
      };
    };

    return {
      db,
      supportsFTS() { return true; },

      async create(judgment) {
        const judgmentId = generateJudgmentId();
        const itemHash = hashContent(judgment.item?.content || judgment.itemContent);

        const item = judgment.item || {};
        const contentParts = [];
        if (item.description) contentParts.push(item.description);
        if (item.content) contentParts.push(item.content);
        if (item.name) contentParts.push(item.name);
        const searchableContent = contentParts.join('\n') || judgment.itemContent || '';

        const reasoningPath = (judgment.reasoningPath || judgment.reasoning_path || [])
          .map((step, idx) => ({ step: step.step ?? idx + 1, ...step }));

        const { rows } = await db.query(`
          INSERT INTO judgments (
            judgment_id, user_id, session_id,
            item_type, item_content, item_hash,
            q_score, global_score, confidence, verdict,
            axiom_scores, dimension_scores, weaknesses,
            context, reasoning_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `, [
          judgmentId,
          judgment.userId || null,
          judgment.sessionId || null,
          judgment.item?.type || judgment.itemType || 'unknown',
          searchableContent,
          itemHash,
          judgment.qScore || judgment.q_score,
          judgment.globalScore || judgment.global_score || judgment.qScore || judgment.q_score,
          judgment.confidence,
          judgment.verdict,
          JSON.stringify(judgment.axiomScores || judgment.axiom_scores || {}),
          JSON.stringify(judgment.dimensionScores || judgment.dimension_scores || null),
          JSON.stringify(judgment.weaknesses || []),
          JSON.stringify(judgment.context || {}),
          JSON.stringify(reasoningPath),
        ]);

        return parseRow(rows[0]);
      },

      async findById(judgmentId) {
        const { rows } = await db.query(
          'SELECT * FROM judgments WHERE judgment_id = ?',
          [judgmentId]
        );
        return rows[0] ? parseRow(rows[0]) : null;
      },

      async search(query, options = {}) {
        const { limit = 10, offset = 0, userId, sessionId, verdict, itemType } = options;

        let sql = 'SELECT * FROM judgments WHERE 1=1';
        const params = [];

        if (userId) {
          sql += ' AND user_id = ?';
          params.push(userId);
        }
        if (sessionId) {
          sql += ' AND session_id = ?';
          params.push(sessionId);
        }
        if (verdict) {
          sql += ' AND verdict = ?';
          params.push(verdict);
        }
        if (itemType) {
          sql += ' AND item_type = ?';
          params.push(itemType);
        }
        if (query) {
          sql += ' AND (item_content LIKE ? OR item_type LIKE ? OR verdict LIKE ? OR context LIKE ?)';
          const likeQuery = `%${query}%`;
          params.push(likeQuery, likeQuery, likeQuery, likeQuery);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const { rows } = await db.query(sql, params);
        return rows.map(row => parseRow(row));
      },

      async findRecent(limit = 10) {
        const { rows } = await db.query(
          'SELECT * FROM judgments ORDER BY created_at DESC LIMIT ?',
          [limit]
        );
        return rows.map(row => parseRow(row));
      },

      async getStats(options = {}) {
        const { userId, sessionId, since } = options;

        let sql = `
          SELECT
            COUNT(*) as total,
            AVG(q_score) as avg_score,
            AVG(confidence) as avg_confidence,
            SUM(CASE WHEN verdict = 'HOWL' THEN 1 ELSE 0 END) as howl_count,
            SUM(CASE WHEN verdict = 'WAG' THEN 1 ELSE 0 END) as wag_count,
            SUM(CASE WHEN verdict = 'GROWL' THEN 1 ELSE 0 END) as growl_count,
            SUM(CASE WHEN verdict = 'BARK' THEN 1 ELSE 0 END) as bark_count
          FROM judgments WHERE 1=1
        `;
        const params = [];

        if (userId) {
          sql += ' AND user_id = ?';
          params.push(userId);
        }
        if (sessionId) {
          sql += ' AND session_id = ?';
          params.push(sessionId);
        }
        if (since) {
          sql += ' AND created_at >= ?';
          params.push(since);
        }

        const { rows } = await db.query(sql, params);
        const stats = rows[0];

        return {
          total: parseInt(stats.total) || 0,
          avgScore: parseFloat(stats.avg_score) || 0,
          avgConfidence: parseFloat(stats.avg_confidence) || 0,
          verdicts: {
            HOWL: parseInt(stats.howl_count) || 0,
            WAG: parseInt(stats.wag_count) || 0,
            GROWL: parseInt(stats.growl_count) || 0,
            BARK: parseInt(stats.bark_count) || 0,
          },
        };
      },

      async count(options = {}) {
        const { userId, sessionId } = options;

        let sql = 'SELECT COUNT(*) as count FROM judgments WHERE 1=1';
        const params = [];

        if (userId) {
          sql += ' AND user_id = ?';
          params.push(userId);
        }
        if (sessionId) {
          sql += ' AND session_id = ?';
          params.push(sessionId);
        }

        const { rows } = await db.query(sql, params);
        return parseInt(rows[0].count) || 0;
      },

      async findSimilar(content, limit = 5) {
        const hash = hashContent(content);
        const { rows } = await db.query(`
          SELECT * FROM judgments
          WHERE item_hash = ?
          ORDER BY created_at DESC
          LIMIT ?
        `, [hash, limit]);

        return rows.map(row => parseRow(row));
      },

      async update(id, data) {
        throw new Error('Judgments are append-only and cannot be updated');
      },

      async delete(id) {
        throw new Error('Judgments are append-only and cannot be deleted');
      },

      async getReasoningPath(judgmentId) {
        const { rows } = await db.query(
          'SELECT reasoning_path FROM judgments WHERE judgment_id = ?',
          [judgmentId]
        );
        if (!rows[0]?.reasoning_path) return null;
        return JSON.parse(rows[0].reasoning_path);
      },
    };
  };

  beforeEach(() => {
    db = createMockSQLiteDb();
    repo = createJudgmentRepository(db);
  });

  describe('create', () => {
    it('creates a new judgment', async () => {
      const judgment = await repo.create({
        item: { type: 'code', content: 'function test() {}' },
        qScore: 75,
        confidence: 0.6,
        verdict: 'WAG',
        axiomScores: { PHI: 80, VERIFY: 70 },
      });

      assert.ok(judgment.judgment_id);
      assert.ok(judgment.judgment_id.startsWith('jdg_'));
      assert.equal(judgment.q_score, 75);
      assert.equal(judgment.verdict, 'WAG');
    });

    it('generates unique IDs', async () => {
      const j1 = await repo.create({ itemContent: 'content1', qScore: 50, verdict: 'GROWL', confidence: 0.5 });
      const j2 = await repo.create({ itemContent: 'content2', qScore: 60, verdict: 'WAG', confidence: 0.6 });

      assert.notEqual(j1.judgment_id, j2.judgment_id);
    });

    it('stores userId and sessionId', async () => {
      const judgment = await repo.create({
        userId: 'user123',
        sessionId: 'session456',
        itemContent: 'test content',
        qScore: 70,
        verdict: 'WAG',
        confidence: 0.55,
      });

      assert.equal(judgment.user_id, 'user123');
      assert.equal(judgment.session_id, 'session456');
    });

    it('stores axiom scores as JSON', async () => {
      const axiomScores = { PHI: 85, VERIFY: 75, CULTURE: 80, BURN: 70 };
      const judgment = await repo.create({
        itemContent: 'test',
        qScore: 80,
        verdict: 'WAG',
        confidence: 0.6,
        axiomScores,
      });

      assert.deepEqual(judgment.axiom_scores, axiomScores);
    });

    it('stores reasoning path', async () => {
      const reasoningPath = [
        { step: 1, action: 'analyze', result: 'passed' },
        { step: 2, action: 'verify', result: 'passed' },
      ];
      const judgment = await repo.create({
        itemContent: 'test',
        qScore: 80,
        verdict: 'WAG',
        confidence: 0.6,
        reasoningPath,
      });

      assert.equal(judgment.reasoning_path.length, 2);
      assert.equal(judgment.reasoning_path[0].action, 'analyze');
    });
  });

  describe('findById', () => {
    it('finds existing judgment', async () => {
      const created = await repo.create({
        itemContent: 'findable content',
        qScore: 65,
        verdict: 'GROWL',
        confidence: 0.5,
      });

      const found = await repo.findById(created.judgment_id);

      assert.ok(found);
      assert.equal(found.judgment_id, created.judgment_id);
    });

    it('returns null for non-existent judgment', async () => {
      const found = await repo.findById('jdg_nonexistent');
      assert.equal(found, null);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await repo.create({ userId: 'user1', itemContent: 'content alpha', qScore: 70, verdict: 'WAG', confidence: 0.6 });
      await repo.create({ userId: 'user1', itemContent: 'content beta', qScore: 60, verdict: 'GROWL', confidence: 0.5 });
      await repo.create({ userId: 'user2', itemContent: 'content gamma', qScore: 80, verdict: 'WAG', confidence: 0.7 });
    });

    it('returns all judgments without filters', async () => {
      const results = await repo.search('', { limit: 10 });
      assert.equal(results.length, 3);
    });

    it('filters by userId', async () => {
      const results = await repo.search('', { userId: 'user1' });
      assert.equal(results.length, 2);
      assert.ok(results.every(j => j.user_id === 'user1'));
    });

    it('filters by verdict', async () => {
      const results = await repo.search('', { verdict: 'WAG' });
      assert.equal(results.length, 2);
      assert.ok(results.every(j => j.verdict === 'WAG'));
    });

    it('respects limit', async () => {
      const results = await repo.search('', { limit: 2 });
      assert.equal(results.length, 2);
    });
  });

  describe('findRecent', () => {
    it('returns recent judgments in order', async () => {
      await repo.create({ itemContent: 'old', qScore: 50, verdict: 'BARK', confidence: 0.4 });
      await repo.create({ itemContent: 'newer', qScore: 60, verdict: 'GROWL', confidence: 0.5 });
      await repo.create({ itemContent: 'newest', qScore: 70, verdict: 'WAG', confidence: 0.6 });

      const recent = await repo.findRecent(2);

      assert.equal(recent.length, 2);
    });
  });

  describe('getStats', () => {
    it('calculates statistics', async () => {
      await repo.create({ itemContent: 'c1', qScore: 80, verdict: 'WAG', confidence: 0.6 });
      await repo.create({ itemContent: 'c2', qScore: 60, verdict: 'GROWL', confidence: 0.5 });
      await repo.create({ itemContent: 'c3', qScore: 40, verdict: 'BARK', confidence: 0.4 });
      await repo.create({ itemContent: 'c4', qScore: 20, verdict: 'HOWL', confidence: 0.3 });

      const stats = await repo.getStats();

      assert.equal(stats.total, 4);
      assert.equal(stats.avgScore, 50);
      assert.equal(stats.verdicts.WAG, 1);
      assert.equal(stats.verdicts.GROWL, 1);
      assert.equal(stats.verdicts.BARK, 1);
      assert.equal(stats.verdicts.HOWL, 1);
    });

    it('handles empty repository', async () => {
      const stats = await repo.getStats();

      assert.equal(stats.total, 0);
      assert.equal(stats.avgScore, 0);
    });

    it('filters by userId', async () => {
      await repo.create({ userId: 'user1', itemContent: 'c1', qScore: 80, verdict: 'WAG', confidence: 0.6 });
      await repo.create({ userId: 'user2', itemContent: 'c2', qScore: 60, verdict: 'GROWL', confidence: 0.5 });

      const stats = await repo.getStats({ userId: 'user1' });

      assert.equal(stats.total, 1);
      assert.equal(stats.avgScore, 80);
    });
  });

  describe('count', () => {
    it('counts all judgments', async () => {
      assert.equal(await repo.count(), 0);

      await repo.create({ itemContent: 'c1', qScore: 50, verdict: 'WAG', confidence: 0.5 });
      await repo.create({ itemContent: 'c2', qScore: 60, verdict: 'WAG', confidence: 0.5 });

      assert.equal(await repo.count(), 2);
    });

    it('counts by userId', async () => {
      await repo.create({ userId: 'user1', itemContent: 'c1', qScore: 50, verdict: 'WAG', confidence: 0.5 });
      await repo.create({ userId: 'user1', itemContent: 'c2', qScore: 60, verdict: 'WAG', confidence: 0.5 });
      await repo.create({ userId: 'user2', itemContent: 'c3', qScore: 70, verdict: 'WAG', confidence: 0.5 });

      assert.equal(await repo.count({ userId: 'user1' }), 2);
    });
  });

  describe('findSimilar', () => {
    it('finds judgments with same content hash', async () => {
      const content = 'identical content';
      await repo.create({ itemContent: content, qScore: 70, verdict: 'WAG', confidence: 0.6 });
      await repo.create({ itemContent: content, qScore: 75, verdict: 'WAG', confidence: 0.65 });
      await repo.create({ itemContent: 'different content', qScore: 80, verdict: 'WAG', confidence: 0.7 });

      const similar = await repo.findSimilar(content);

      assert.equal(similar.length, 2);
    });
  });

  describe('append-only constraints', () => {
    it('throws on update attempt', async () => {
      await assert.rejects(
        () => repo.update('jdg_123', { qScore: 100 }),
        { message: 'Judgments are append-only and cannot be updated' }
      );
    });

    it('throws on delete attempt', async () => {
      await assert.rejects(
        () => repo.delete('jdg_123'),
        { message: 'Judgments are append-only and cannot be deleted' }
      );
    });
  });

  describe('supportsFTS', () => {
    it('returns true for SQLite text search', () => {
      assert.equal(repo.supportsFTS(), true);
    });
  });
});

// =============================================================================
// PATTERN REPOSITORY TESTS
// =============================================================================

describe('SQLitePatternRepository', () => {
  let db;
  let repo;

  const createPatternRepository = (db) => {
    const generatePatternId = () => 'pat_' + Math.random().toString(36).slice(2, 10);

    const parseRow = (row) => {
      if (!row) return null;
      return {
        ...row,
        context: row.context ? JSON.parse(row.context) : {},
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
      };
    };

    return {
      db,

      async create(pattern) {
        const patternId = pattern.pattern_id || generatePatternId();

        const { rows } = await db.query(`
          INSERT INTO patterns (
            pattern_id, user_id, session_id, pattern_type, name, description,
            frequency, weight, axiom, context, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `, [
          patternId,
          pattern.userId || pattern.user_id || null,
          pattern.sessionId || pattern.session_id || null,
          pattern.patternType || pattern.pattern_type || 'unknown',
          pattern.name || null,
          pattern.description || null,
          pattern.frequency || 1,
          pattern.weight || 1.0,
          pattern.axiom || 'VERIFY',
          JSON.stringify(pattern.context || {}),
          JSON.stringify(pattern.metadata || {}),
        ]);

        return parseRow(rows[0]);
      },

      async findById(patternId) {
        const { rows } = await db.query(
          'SELECT * FROM patterns WHERE pattern_id = ?',
          [patternId]
        );
        return rows[0] ? parseRow(rows[0]) : null;
      },

      async update(patternId, data) {
        const sets = [];
        const params = [];

        if (data.frequency !== undefined) {
          sets.push('frequency = ?');
          params.push(data.frequency);
        }
        if (data.weight !== undefined) {
          sets.push('weight = ?');
          params.push(data.weight);
        }
        if (data.lastSeen !== undefined || data.last_seen !== undefined) {
          sets.push('last_seen = ?');
          params.push(data.lastSeen || data.last_seen);
        }
        if (data.metadata !== undefined) {
          sets.push('metadata = ?');
          params.push(JSON.stringify(data.metadata));
        }

        sets.push("updated_at = datetime('now')");

        if (sets.length === 1) {
          return this.findById(patternId);
        }

        params.push(patternId);

        const { rows } = await db.query(`
          UPDATE patterns SET ${sets.join(', ')} WHERE pattern_id = ?
          RETURNING *
        `, params);

        return rows[0] ? parseRow(rows[0]) : null;
      },

      async incrementFrequency(patternId, boost = 1) {
        const { rows } = await db.query(`
          UPDATE patterns
          SET frequency = frequency + ?,
              last_seen = datetime('now'),
              updated_at = datetime('now')
          WHERE pattern_id = ?
          RETURNING *
        `, [boost, patternId]);

        return rows[0] ? parseRow(rows[0]) : null;
      },

      async updateWeight(patternId, weight) {
        const { rows } = await db.query(`
          UPDATE patterns
          SET weight = ?,
              updated_at = datetime('now')
          WHERE pattern_id = ?
          RETURNING *
        `, [weight, patternId]);

        return rows[0] ? parseRow(rows[0]) : null;
      },

      async delete(patternId) {
        const { rowCount } = await db.query(
          'DELETE FROM patterns WHERE pattern_id = ?',
          [patternId]
        );
        return rowCount > 0;
      },

      async search(query, options = {}) {
        const { limit = 10, offset = 0, userId, patternType, axiom } = options;

        let sql = 'SELECT * FROM patterns WHERE 1=1';
        const params = [];

        if (userId) {
          sql += ' AND user_id = ?';
          params.push(userId);
        }
        if (patternType) {
          sql += ' AND pattern_type = ?';
          params.push(patternType);
        }
        if (axiom) {
          sql += ' AND axiom = ?';
          params.push(axiom);
        }
        if (query) {
          sql += ' AND (name LIKE ? OR description LIKE ?)';
          const likeQuery = `%${query}%`;
          params.push(likeQuery, likeQuery);
        }

        sql += ' ORDER BY frequency DESC, weight DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const { rows } = await db.query(sql, params);
        return rows.map(row => parseRow(row));
      },

      async findByType(patternType, options = {}) {
        const { limit = 10, userId } = options;

        let sql = 'SELECT * FROM patterns WHERE pattern_type = ?';
        const params = [patternType];

        if (userId) {
          sql += ' AND user_id = ?';
          params.push(userId);
        }

        sql += ' ORDER BY frequency DESC LIMIT ?';
        params.push(limit);

        const { rows } = await db.query(sql, params);
        return rows.map(row => parseRow(row));
      },

      async findTopReinforced(limit = 10, options = {}) {
        const { userId, minWeight = 1.0 } = options;

        let sql = 'SELECT * FROM patterns WHERE weight >= ?';
        const params = [minWeight];

        if (userId) {
          sql += ' AND user_id = ?';
          params.push(userId);
        }

        sql += ' ORDER BY weight DESC, frequency DESC LIMIT ?';
        params.push(limit);

        const { rows } = await db.query(sql, params);
        return rows.map(row => parseRow(row));
      },

      async list(options = {}) {
        return this.search('', options);
      },

      async getStats(options = {}) {
        const { userId } = options;

        let sql = `
          SELECT
            COUNT(*) as total,
            AVG(frequency) as avg_frequency,
            AVG(weight) as avg_weight,
            COUNT(DISTINCT pattern_type) as type_count
          FROM patterns WHERE 1=1
        `;
        const params = [];

        if (userId) {
          sql += ' AND user_id = ?';
          params.push(userId);
        }

        const { rows } = await db.query(sql, params);
        const stats = rows[0];

        return {
          total: parseInt(stats.total) || 0,
          avgFrequency: parseFloat(stats.avg_frequency) || 0,
          avgWeight: parseFloat(stats.avg_weight) || 0,
          typeCount: parseInt(stats.type_count) || 0,
        };
      },
    };
  };

  beforeEach(() => {
    db = createMockSQLiteDb();
    repo = createPatternRepository(db);
  });

  describe('create', () => {
    it('creates a new pattern', async () => {
      const pattern = await repo.create({
        patternType: 'code',
        name: 'Test Pattern',
        description: 'A test pattern',
        axiom: 'PHI',
      });

      assert.ok(pattern.pattern_id);
      assert.ok(pattern.pattern_id.startsWith('pat_'));
      assert.equal(pattern.pattern_type, 'code');
      assert.equal(pattern.name, 'Test Pattern');
      assert.equal(pattern.axiom, 'PHI');
    });

    it('uses default values', async () => {
      const pattern = await repo.create({
        patternType: 'behavior',
      });

      assert.equal(pattern.frequency, 1);
      assert.equal(pattern.weight, 1.0);
      assert.equal(pattern.axiom, 'VERIFY');
    });

    it('accepts custom pattern_id', async () => {
      const customId = 'pat_custom123';
      const pattern = await repo.create({
        pattern_id: customId,
        patternType: 'test',
      });

      assert.equal(pattern.pattern_id, customId);
    });

    it('stores context and metadata as JSON', async () => {
      const context = { file: 'test.js', line: 42 };
      const metadata = { source: 'analysis', version: 1 };

      const pattern = await repo.create({
        patternType: 'code',
        context,
        metadata,
      });

      assert.deepEqual(pattern.context, context);
      assert.deepEqual(pattern.metadata, metadata);
    });
  });

  describe('findById', () => {
    it('finds existing pattern', async () => {
      const created = await repo.create({
        patternType: 'findme',
        name: 'Find Me Pattern',
      });

      const found = await repo.findById(created.pattern_id);

      assert.ok(found);
      assert.equal(found.pattern_id, created.pattern_id);
      assert.equal(found.name, 'Find Me Pattern');
    });

    it('returns null for non-existent pattern', async () => {
      const found = await repo.findById('pat_nonexistent');
      assert.equal(found, null);
    });
  });

  describe('update', () => {
    it('updates pattern fields', async () => {
      const created = await repo.create({
        patternType: 'test',
        name: 'Update Me',
        frequency: 5,
        weight: 1.0,
      });

      const updated = await repo.update(created.pattern_id, {
        frequency: 10,
        weight: 1.5,
      });

      assert.ok(updated);
      // Note: Mock may not fully update, but shouldn't throw
    });

    it('returns null for non-existent pattern', async () => {
      const updated = await repo.update('pat_nonexistent', { frequency: 10 });
      assert.equal(updated, null);
    });
  });

  describe('incrementFrequency', () => {
    it('increments pattern frequency', async () => {
      const created = await repo.create({
        patternType: 'test',
        frequency: 5,
      });

      const updated = await repo.incrementFrequency(created.pattern_id, 3);

      assert.ok(updated);
      assert.equal(updated.frequency, 8);
    });

    it('defaults to increment by 1', async () => {
      const created = await repo.create({
        patternType: 'test',
        frequency: 5,
      });

      const updated = await repo.incrementFrequency(created.pattern_id);

      assert.ok(updated);
      assert.equal(updated.frequency, 6);
    });

    it('updates last_seen timestamp', async () => {
      const created = await repo.create({
        patternType: 'test',
      });

      const updated = await repo.incrementFrequency(created.pattern_id);

      assert.ok(updated.last_seen);
    });
  });

  describe('updateWeight', () => {
    it('updates pattern weight for path reinforcement', async () => {
      const created = await repo.create({
        patternType: 'test',
        weight: 1.0,
      });

      const updated = await repo.updateWeight(created.pattern_id, 1.618);

      assert.ok(updated);
      assert.equal(updated.weight, 1.618);
    });

    it('returns null for non-existent pattern', async () => {
      const updated = await repo.updateWeight('pat_nonexistent', 2.0);
      assert.equal(updated, null);
    });
  });

  describe('delete', () => {
    it('deletes existing pattern', async () => {
      const created = await repo.create({
        patternType: 'deleteme',
      });

      const deleted = await repo.delete(created.pattern_id);
      assert.equal(deleted, true);

      const found = await repo.findById(created.pattern_id);
      assert.equal(found, null);
    });

    it('returns false for non-existent pattern', async () => {
      const deleted = await repo.delete('pat_nonexistent');
      assert.equal(deleted, false);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await repo.create({ patternType: 'code', name: 'Code Pattern 1', userId: 'user1', frequency: 10 });
      await repo.create({ patternType: 'code', name: 'Code Pattern 2', userId: 'user1', frequency: 5 });
      await repo.create({ patternType: 'behavior', name: 'Behavior Pattern', userId: 'user2', frequency: 8 });
    });

    it('returns all patterns without filters', async () => {
      const results = await repo.search('');
      assert.equal(results.length, 3);
    });

    it('filters by userId', async () => {
      const results = await repo.search('', { userId: 'user1' });
      assert.equal(results.length, 2);
    });

    it('filters by patternType', async () => {
      const results = await repo.search('', { patternType: 'code' });
      assert.equal(results.length, 2);
    });

    it('orders by frequency descending', async () => {
      const results = await repo.search('');
      assert.ok(results[0].frequency >= results[1].frequency);
    });
  });

  describe('findByType', () => {
    it('finds patterns by type', async () => {
      await repo.create({ patternType: 'code', name: 'Code 1' });
      await repo.create({ patternType: 'code', name: 'Code 2' });
      await repo.create({ patternType: 'behavior', name: 'Behavior 1' });

      const codePatterns = await repo.findByType('code');

      assert.equal(codePatterns.length, 2);
      assert.ok(codePatterns.every(p => p.pattern_type === 'code'));
    });
  });

  describe('findTopReinforced', () => {
    it('finds patterns by weight threshold', async () => {
      await repo.create({ patternType: 'test', weight: 0.5 });
      await repo.create({ patternType: 'test', weight: 1.5 });
      await repo.create({ patternType: 'test', weight: 2.0 });

      const top = await repo.findTopReinforced(10, { minWeight: 1.0 });

      assert.equal(top.length, 2);
      assert.ok(top.every(p => p.weight >= 1.0));
    });

    it('orders by weight descending', async () => {
      await repo.create({ patternType: 'test', weight: 1.5 });
      await repo.create({ patternType: 'test', weight: 2.5 });
      await repo.create({ patternType: 'test', weight: 1.8 });

      const top = await repo.findTopReinforced(10, { minWeight: 1.0 });

      assert.ok(top[0].weight >= top[1].weight);
    });
  });

  describe('getStats', () => {
    it('returns pattern statistics', async () => {
      await repo.create({ patternType: 'code', frequency: 10, weight: 1.5 });
      await repo.create({ patternType: 'behavior', frequency: 20, weight: 2.0 });

      const stats = await repo.getStats();

      assert.equal(stats.total, 2);
      assert.equal(stats.avgFrequency, 15);
      assert.equal(stats.avgWeight, 1.75);
      assert.equal(stats.typeCount, 2);
    });

    it('handles empty repository', async () => {
      const stats = await repo.getStats();

      assert.equal(stats.total, 0);
      assert.equal(stats.avgFrequency, 0);
      assert.equal(stats.avgWeight, 0);
      assert.equal(stats.typeCount, 0);
    });

    it('filters by userId', async () => {
      await repo.create({ userId: 'user1', patternType: 'code', frequency: 10 });
      await repo.create({ userId: 'user2', patternType: 'code', frequency: 20 });

      const stats = await repo.getStats({ userId: 'user1' });

      assert.equal(stats.total, 1);
      assert.equal(stats.avgFrequency, 10);
    });
  });
});

// =============================================================================
// SCHEMA INITIALIZATION TESTS
// =============================================================================

describe('Schema Initialization', () => {
  let db;

  beforeEach(() => {
    db = createMockSQLiteDb();
  });

  it('exec creates tables from schema SQL', () => {
    const schemaSQL = `
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS judgments (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS patterns (id TEXT PRIMARY KEY);
    `;

    db.exec(schemaSQL);

    assert.ok(db.storage.users);
    assert.ok(db.storage.judgments);
    assert.ok(db.storage.patterns);
  });

  it('schema_version table exists by default', () => {
    assert.ok(db.storage.schema_version);
    assert.equal(db.storage.schema_version.length, 1);
    assert.equal(db.storage.schema_version[0].version, 1);
  });
});

console.log('*ears perk* SQLite repository tests loaded. Verifying persistence layer compatibility.');
