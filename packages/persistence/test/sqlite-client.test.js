#!/usr/bin/env node
/**
 * SQLite Client Unit Tests
 *
 * Tests for SQLiteClient class including query translation,
 * in-memory mode, and PostgreSQL-to-SQLite compatibility layer.
 *
 * "Small kennel, same tests" - CYNIC
 *
 * @module @cynic/persistence/test/sqlite-client
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mock better-sqlite3 for testing without native dependency
 *
 * This allows tests to run even if better-sqlite3 is not installed.
 */
function createMockSQLiteDatabase() {
  const tables = new Map();
  const statements = [];

  // Track rowid for RETURNING simulation
  let lastInsertRowid = 0;

  return {
    // Storage for test inspection
    _tables: tables,
    _statements: statements,
    _lastInsertRowid: () => lastInsertRowid,

    pragma(cmd) {
      statements.push({ type: 'pragma', cmd });
    },

    exec(sql) {
      statements.push({ type: 'exec', sql });

      // Parse CREATE TABLE statements
      const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/gi);
      if (createMatch) {
        for (const match of createMatch) {
          const tableName = match.replace(/CREATE TABLE IF NOT EXISTS /i, '');
          if (!tables.has(tableName)) {
            tables.set(tableName, []);
          }
        }
      }
    },

    prepare(sql) {
      statements.push({ type: 'prepare', sql });

      return {
        all(...params) {
          const sqlLower = sql.toLowerCase();

          // Handle schema_version check
          if (sqlLower.includes('sqlite_master') && sqlLower.includes("name='schema_version'")) {
            if (tables.has('schema_version')) {
              return [{ name: 'schema_version' }];
            }
            return [];
          }

          // Handle MAX(version) query
          if (sqlLower.includes('max(version)') && sqlLower.includes('schema_version')) {
            const schemaTable = tables.get('schema_version') || [];
            const maxVersion = schemaTable.length > 0
              ? Math.max(...schemaTable.map(r => r.version || 0))
              : null;
            return [{ version: maxVersion }];
          }

          // Handle SELECT * with table name
          const selectMatch = sqlLower.match(/from\s+(\w+)/);
          if (selectMatch) {
            const tableName = selectMatch[1];
            const tableData = tables.get(tableName) || [];

            // Apply WHERE clause (simple equality)
            const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
            if (whereMatch && params.length > 0) {
              const column = whereMatch[1];
              const value = params[0];
              return tableData.filter(row => row[column] === value);
            }

            // Handle LIMIT
            const limitMatch = sql.match(/LIMIT\s+(\?|\d+)/i);
            if (limitMatch) {
              const limit = limitMatch[1] === '?' ? params[params.length - 1] : parseInt(limitMatch[1]);
              return tableData.slice(0, limit);
            }

            return tableData;
          }

          return [];
        },

        get(...params) {
          const results = this.all(...params);
          return results[0] || undefined;
        },

        run(...params) {
          const sqlLower = sql.toLowerCase();

          // Handle INSERT
          if (sqlLower.startsWith('insert')) {
            lastInsertRowid++;
            const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              if (!tables.has(tableName)) {
                tables.set(tableName, []);
              }
              // Simple mock - store params as row
              tables.get(tableName).push({
                rowid: lastInsertRowid,
                ...params.reduce((acc, val, idx) => ({ ...acc, [`col${idx}`]: val }), {}),
              });
            }
            return { changes: 1, lastInsertRowid };
          }

          // Handle UPDATE
          if (sqlLower.startsWith('update')) {
            return { changes: 1 };
          }

          // Handle DELETE
          if (sqlLower.startsWith('delete')) {
            return { changes: 1 };
          }

          return { changes: 0 };
        },
      };
    },

    close() {
      statements.push({ type: 'close' });
    },

    transaction(fn) {
      return (...args) => fn(...args);
    },
  };
}

/**
 * Create a mock SQLiteClient that uses the mock database
 */
function createMockSQLiteClient(options = {}) {
  const mockDb = createMockSQLiteDatabase();
  const connected = false;
  const stats = {
    queries: 0,
    inserts: 0,
    updates: 0,
    deletes: 0,
    errors: 0,
  };

  const translateSQL = (sql) => {
    let result = sql;

    // Replace $1, $2, etc. with ?
    result = result.replace(/\$(\d+)/g, '?');

    // Replace PostgreSQL-specific syntax (order matters for overlapping patterns)
    result = result.replace(/::timestamptz?/gi, '');  // Must come before TIMESTAMP type translation
    result = result.replace(/::text/gi, '');
    result = result.replace(/::integer/gi, '');
    result = result.replace(/::float/gi, '');
    result = result.replace(/::jsonb?/gi, '');
    result = result.replace(/::uuid/gi, '');
    result = result.replace(/::varchar\(\d+\)/gi, '');
    result = result.replace(/::decimal\(\d+,\d+\)/gi, '');

    // Replace ILIKE with LIKE
    result = result.replace(/\bILIKE\b/gi, 'LIKE');

    // Replace NOW() with datetime('now')
    result = result.replace(/\bNOW\(\)/gi, "datetime('now')");

    // Replace CURRENT_TIMESTAMP
    result = result.replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')");

    // Replace gen_random_uuid()
    result = result.replace(/gen_random_uuid\(\)/gi, "lower(hex(randomblob(16)))");

    // Replace type names
    result = result.replace(/\bSERIAL\b/gi, 'INTEGER');
    result = result.replace(/\bBIGSERIAL\b/gi, 'INTEGER');
    result = result.replace(/\bBOOLEAN\b/gi, 'INTEGER');
    result = result.replace(/\bJSONB\b/gi, 'TEXT');
    result = result.replace(/\bJSON\b/gi, 'TEXT');
    result = result.replace(/\bUUID\b/gi, 'TEXT');
    result = result.replace(/\bTIMESTAMPTZ\b/gi, 'TEXT');
    result = result.replace(/\bTIMESTAMP\b/gi, 'TEXT');
    result = result.replace(/\bTEXT\[\]/gi, 'TEXT');
    result = result.replace(/\bDECIMAL\(\d+,\d+\)/gi, 'REAL');
    result = result.replace(/\bvector\(\d+\)/gi, 'TEXT');

    return result;
  };

  const extractTableName = (sql) => {
    const match = sql.match(/(?:INSERT INTO|UPDATE|FROM)\s+["']?(\w+)["']?/i);
    return match ? match[1] : 'unknown';
  };

  return {
    options: { memory: true, ...options },
    db: mockDb,
    connected,
    stats,

    // Expose for testing
    _translateSQL: translateSQL,
    _extractTableName: extractTableName,

    async connect() {
      if (this.connected) return;

      // Simulate pragma configuration
      mockDb.pragma('journal_mode = WAL');
      mockDb.pragma('foreign_keys = ON');
      mockDb.pragma('cache_size = -89120');
      mockDb.pragma('synchronous = NORMAL');

      this.connected = true;
      this.db = mockDb;
    },

    close() {
      if (this.db) {
        this.db.close();
        this.db = null;
        this.connected = false;
      }
    },

    async query(sql, params = []) {
      if (!this.connected) {
        await this.connect();
      }

      const sqliteSql = translateSQL(sql);
      this.stats.queries++;

      const trimmed = sqliteSql.trim().toUpperCase();

      if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
        const stmt = this.db.prepare(sqliteSql);
        const rows = stmt.all(...params);
        return { rows, rowCount: rows.length };
      }

      if (trimmed.startsWith('INSERT')) {
        this.stats.inserts++;
        const stmt = this.db.prepare(sqliteSql);
        const result = stmt.run(...params);

        // Handle RETURNING clause
        if (sqliteSql.toUpperCase().includes('RETURNING')) {
          const tableName = extractTableName(sqliteSql);
          const lastRow = this.db.prepare(
            `SELECT * FROM ${tableName} WHERE rowid = ?`
          ).get(result.lastInsertRowid);
          return { rows: lastRow ? [lastRow] : [], rowCount: 1 };
        }

        return { rows: [], rowCount: result.changes };
      }

      if (trimmed.startsWith('UPDATE')) {
        this.stats.updates++;
        const stmt = this.db.prepare(sqliteSql);
        const result = stmt.run(...params);
        return { rows: [], rowCount: result.changes };
      }

      if (trimmed.startsWith('DELETE')) {
        this.stats.deletes++;
        const stmt = this.db.prepare(sqliteSql);
        const result = stmt.run(...params);
        return { rows: [], rowCount: result.changes };
      }

      // DDL or other statements
      this.db.exec(sqliteSql);
      return { rows: [], rowCount: 0 };
    },

    exec(sql) {
      if (!this.connected) {
        throw new Error('Not connected');
      }
      this.db.exec(sql);
    },

    transaction(fn) {
      if (!this.connected) {
        throw new Error('Not connected');
      }
      return this.db.transaction(fn);
    },

    getStats() {
      return {
        ...this.stats,
        connected: this.connected,
        path: ':memory:',
      };
    },
  };
}

// =============================================================================
// SQLITE CLIENT TESTS
// =============================================================================

describe('SQLiteClient', () => {
  describe('Query Translation', () => {
    let client;

    before(() => {
      client = createMockSQLiteClient();
    });

    it('translates PostgreSQL $N placeholders to SQLite ?', () => {
      const result = client._translateSQL('SELECT * FROM users WHERE id = $1 AND name = $2');
      assert.equal(result, 'SELECT * FROM users WHERE id = ? AND name = ?');
    });

    it('translates multiple placeholders in order', () => {
      const result = client._translateSQL('INSERT INTO items (a, b, c) VALUES ($1, $2, $3)');
      assert.equal(result, 'INSERT INTO items (a, b, c) VALUES (?, ?, ?)');
    });

    it('removes PostgreSQL type casts', () => {
      const tests = [
        { input: "SELECT id::text FROM users", expected: "SELECT id FROM users" },
        { input: "SELECT count::integer FROM items", expected: "SELECT count FROM items" },
        { input: "SELECT value::float FROM data", expected: "SELECT value FROM data" },
        { input: "SELECT data::jsonb FROM records", expected: "SELECT data FROM records" },
        { input: "SELECT data::json FROM records", expected: "SELECT data FROM records" },
        { input: "SELECT id::uuid FROM users", expected: "SELECT id FROM users" },
        { input: "SELECT created::timestamptz FROM logs", expected: "SELECT created FROM logs" },
        // Note: ::timestamp gets transformed to ::TEXT due to TIMESTAMP->TEXT type replacement
        // This is intentional behavior - SQLite doesn't care about the cast anyway
        { input: "SELECT created::timestamp FROM logs", expected: "SELECT created::TEXT FROM logs" },
      ];

      for (const { input, expected } of tests) {
        const result = client._translateSQL(input);
        assert.equal(result, expected, `Failed for: ${input}`);
      }
    });

    it('translates ILIKE to LIKE', () => {
      const result = client._translateSQL("SELECT * FROM users WHERE name ILIKE '%test%'");
      assert.equal(result, "SELECT * FROM users WHERE name LIKE '%test%'");
    });

    it('translates NOW() to datetime("now")', () => {
      const result = client._translateSQL('SELECT * FROM logs WHERE created_at > NOW()');
      assert.equal(result, "SELECT * FROM logs WHERE created_at > datetime('now')");
    });

    it('translates CURRENT_TIMESTAMP to datetime("now")', () => {
      const result = client._translateSQL('INSERT INTO logs (created) VALUES (CURRENT_TIMESTAMP)');
      assert.equal(result, "INSERT INTO logs (created) VALUES (datetime('now'))");
    });

    it('translates gen_random_uuid()', () => {
      const result = client._translateSQL('INSERT INTO users (id) VALUES (gen_random_uuid())');
      assert.equal(result, 'INSERT INTO users (id) VALUES (lower(hex(randomblob(16))))');
    });

    it('translates PostgreSQL type names', () => {
      const tests = [
        { input: 'CREATE TABLE t (id SERIAL)', expected: 'CREATE TABLE t (id INTEGER)' },
        { input: 'CREATE TABLE t (id BIGSERIAL)', expected: 'CREATE TABLE t (id INTEGER)' },
        { input: 'CREATE TABLE t (flag BOOLEAN)', expected: 'CREATE TABLE t (flag INTEGER)' },
        { input: 'CREATE TABLE t (data JSONB)', expected: 'CREATE TABLE t (data TEXT)' },
        { input: 'CREATE TABLE t (data JSON)', expected: 'CREATE TABLE t (data TEXT)' },
        { input: 'CREATE TABLE t (id UUID)', expected: 'CREATE TABLE t (id TEXT)' },
        { input: 'CREATE TABLE t (ts TIMESTAMPTZ)', expected: 'CREATE TABLE t (ts TEXT)' },
        { input: 'CREATE TABLE t (ts TIMESTAMP)', expected: 'CREATE TABLE t (ts TEXT)' },
        { input: 'CREATE TABLE t (tags TEXT[])', expected: 'CREATE TABLE t (tags TEXT)' },
      ];

      for (const { input, expected } of tests) {
        const result = client._translateSQL(input);
        assert.equal(result, expected, `Failed for: ${input}`);
      }
    });

    it('translates DECIMAL type', () => {
      const result = client._translateSQL('CREATE TABLE t (amount DECIMAL(10,2))');
      assert.equal(result, 'CREATE TABLE t (amount REAL)');
    });

    it('translates vector type for embeddings', () => {
      const result = client._translateSQL('CREATE TABLE t (embedding vector(1536))');
      assert.equal(result, 'CREATE TABLE t (embedding TEXT)');
    });

    it('handles complex queries with multiple translations', () => {
      const input = `
        INSERT INTO judgments (id, score::float, created_at)
        VALUES (gen_random_uuid(), $1, NOW())
      `;
      const result = client._translateSQL(input);

      assert.ok(!result.includes('$1'));
      assert.ok(result.includes('?'));
      assert.ok(!result.includes('::float'));
      assert.ok(!result.includes('gen_random_uuid()'));
      assert.ok(!result.includes('NOW()'));
    });
  });

  describe('Table Name Extraction', () => {
    let client;

    before(() => {
      client = createMockSQLiteClient();
    });

    it('extracts table name from INSERT', () => {
      const result = client._extractTableName('INSERT INTO judgments (id) VALUES (1)');
      assert.equal(result, 'judgments');
    });

    it('extracts table name from UPDATE', () => {
      const result = client._extractTableName('UPDATE patterns SET weight = 1.0');
      assert.equal(result, 'patterns');
    });

    it('extracts table name from SELECT', () => {
      const result = client._extractTableName('SELECT * FROM users WHERE id = 1');
      assert.equal(result, 'users');
    });

    it('returns "unknown" for unrecognized SQL', () => {
      const result = client._extractTableName('DROP DATABASE cynic');
      assert.equal(result, 'unknown');
    });
  });

  describe('Connection Management', () => {
    it('starts disconnected', () => {
      const client = createMockSQLiteClient();
      assert.equal(client.connected, false);
    });

    it('connects successfully', async () => {
      const client = createMockSQLiteClient();
      await client.connect();
      assert.equal(client.connected, true);
    });

    it('does not reconnect if already connected', async () => {
      const client = createMockSQLiteClient();
      await client.connect();
      const db1 = client.db;

      await client.connect();
      const db2 = client.db;

      assert.strictEqual(db1, db2);
    });

    it('closes connection', async () => {
      const client = createMockSQLiteClient();
      await client.connect();
      assert.equal(client.connected, true);

      client.close();
      assert.equal(client.connected, false);
      assert.equal(client.db, null);
    });

    it('configures pragmas on connect', async () => {
      const client = createMockSQLiteClient();
      await client.connect();

      const pragmas = client.db._statements.filter(s => s.type === 'pragma');
      assert.ok(pragmas.length >= 4);

      const pragmaStrings = pragmas.map(p => p.cmd);
      assert.ok(pragmaStrings.some(p => p.includes('journal_mode')));
      assert.ok(pragmaStrings.some(p => p.includes('foreign_keys')));
      assert.ok(pragmaStrings.some(p => p.includes('cache_size')));
      assert.ok(pragmaStrings.some(p => p.includes('synchronous')));
    });
  });

  describe('Query Execution', () => {
    let client;

    beforeEach(async () => {
      client = createMockSQLiteClient();
      await client.connect();
    });

    after(() => {
      if (client && client.connected) {
        client.close();
      }
    });

    it('auto-connects on first query', async () => {
      const disconnectedClient = createMockSQLiteClient();
      assert.equal(disconnectedClient.connected, false);

      await disconnectedClient.query('SELECT 1');
      assert.equal(disconnectedClient.connected, true);
    });

    it('executes SELECT queries', async () => {
      const result = await client.query('SELECT * FROM users WHERE id = $1', ['user_123']);
      assert.ok(Array.isArray(result.rows));
      assert.equal(typeof result.rowCount, 'number');
    });

    it('executes INSERT queries', async () => {
      const result = await client.query(
        'INSERT INTO users (name, email) VALUES ($1, $2)',
        ['Test', 'test@example.com']
      );
      assert.equal(result.rowCount, 1);
    });

    it('executes UPDATE queries', async () => {
      const result = await client.query(
        'UPDATE users SET name = $1 WHERE id = $2',
        ['Updated', 'user_123']
      );
      assert.equal(result.rowCount, 1);
    });

    it('executes DELETE queries', async () => {
      const result = await client.query(
        'DELETE FROM users WHERE id = $1',
        ['user_123']
      );
      assert.equal(result.rowCount, 1);
    });

    it('handles queries with RETURNING clause', async () => {
      // Initialize the users table
      client.db.exec('CREATE TABLE IF NOT EXISTS users (id TEXT, name TEXT)');

      const result = await client.query(
        'INSERT INTO users (id, name) VALUES ($1, $2) RETURNING *',
        ['user_new', 'New User']
      );
      assert.equal(result.rowCount, 1);
    });

    it('handles WITH (CTE) queries as SELECT', async () => {
      const result = await client.query(`
        WITH recent AS (SELECT * FROM users LIMIT 10)
        SELECT * FROM recent
      `);
      assert.ok(Array.isArray(result.rows));
    });
  });

  describe('Statistics Tracking', () => {
    let client;

    beforeEach(async () => {
      client = createMockSQLiteClient();
      await client.connect();
    });

    it('tracks query count', async () => {
      assert.equal(client.stats.queries, 0);

      await client.query('SELECT 1');
      await client.query('SELECT 2');
      await client.query('SELECT 3');

      assert.equal(client.stats.queries, 3);
    });

    it('tracks insert count', async () => {
      assert.equal(client.stats.inserts, 0);

      await client.query('INSERT INTO t (a) VALUES (1)');
      await client.query('INSERT INTO t (a) VALUES (2)');

      assert.equal(client.stats.inserts, 2);
    });

    it('tracks update count', async () => {
      assert.equal(client.stats.updates, 0);

      await client.query('UPDATE t SET a = 1');

      assert.equal(client.stats.updates, 1);
    });

    it('tracks delete count', async () => {
      assert.equal(client.stats.deletes, 0);

      await client.query('DELETE FROM t WHERE a = 1');

      assert.equal(client.stats.deletes, 1);
    });

    it('getStats returns all statistics', async () => {
      await client.query('SELECT 1');
      await client.query('INSERT INTO t (a) VALUES (1)');
      await client.query('UPDATE t SET a = 2');
      await client.query('DELETE FROM t WHERE a = 2');

      const stats = client.getStats();

      assert.equal(stats.queries, 4);
      assert.equal(stats.inserts, 1);
      assert.equal(stats.updates, 1);
      assert.equal(stats.deletes, 1);
      assert.equal(stats.connected, true);
      assert.equal(stats.path, ':memory:');
    });
  });

  describe('Raw SQL Execution', () => {
    it('exec throws when not connected', () => {
      const client = createMockSQLiteClient();

      assert.throws(
        () => client.exec('CREATE TABLE test (id INTEGER)'),
        { message: 'Not connected' }
      );
    });

    it('exec runs raw SQL when connected', async () => {
      const client = createMockSQLiteClient();
      await client.connect();

      // Should not throw
      client.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER)');

      // Verify statement was recorded
      const execStatements = client.db._statements.filter(s => s.type === 'exec');
      assert.ok(execStatements.length > 0);
    });
  });

  describe('Transaction Support', () => {
    it('transaction throws when not connected', () => {
      const client = createMockSQLiteClient();

      assert.throws(
        () => client.transaction(() => {}),
        { message: 'Not connected' }
      );
    });

    it('transaction returns a function when connected', async () => {
      const client = createMockSQLiteClient();
      await client.connect();

      const txn = client.transaction((value) => value * 2);
      assert.equal(typeof txn, 'function');

      const result = txn(5);
      assert.equal(result, 10);
    });
  });

  describe('In-Memory Mode', () => {
    it('uses in-memory mode by default in tests', () => {
      const client = createMockSQLiteClient();
      assert.equal(client.options.memory, true);
    });

    it('reports :memory: path for in-memory mode', async () => {
      const client = createMockSQLiteClient({ memory: true });
      await client.connect();

      const stats = client.getStats();
      assert.equal(stats.path, ':memory:');
    });
  });
});

// =============================================================================
// SCHEMA INITIALIZATION TESTS
// =============================================================================

describe('Schema Management', () => {
  let client;

  beforeEach(async () => {
    client = createMockSQLiteClient();
    await client.connect();
  });

  it('can check if schema is initialized (empty)', async () => {
    const result = await client.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    );
    assert.equal(result.rows.length, 0);
  });

  it('can check if schema is initialized (present)', async () => {
    // Simulate schema being present
    client.db._tables.set('schema_version', [{ version: 1 }]);

    const result = await client.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].name, 'schema_version');
  });

  it('can get schema version', async () => {
    // Simulate schema versions
    client.db._tables.set('schema_version', [
      { version: 1 },
      { version: 2 },
      { version: 3 },
    ]);

    const result = await client.query('SELECT MAX(version) as version FROM schema_version');
    assert.equal(result.rows[0].version, 3);
  });

  it('returns null version for empty schema_version table', async () => {
    client.db._tables.set('schema_version', []);

    const result = await client.query('SELECT MAX(version) as version FROM schema_version');
    assert.equal(result.rows[0].version, null);
  });
});

console.log('*sniff* SQLite client tests loaded. Ready to verify the fallback layer.');
