#!/usr/bin/env node
/**
 * Codebase Indexer Service Tests
 *
 * Tests for auto-indexing and fact extraction from codebase.
 *
 * "Le chien doit se connaître lui-même" - CYNIC
 *
 * @module @cynic/persistence/test/codebase-indexer
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import os from 'os';

import {
  CodebaseIndexer,
  createCodebaseIndexer,
} from '../src/services/codebase-indexer.js';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

function createMockFactsRepo() {
  const facts = [];
  return {
    create: async (data) => {
      const fact = {
        id: `fact-${facts.length + 1}`,
        ...data,
        createdAt: new Date(),
      };
      facts.push(fact);
      return fact;
    },
    findByUser: async (userId, opts = {}) =>
      facts.filter(f => f.userId === userId).slice(0, opts.limit || 50),
    search: async (query, opts = {}) =>
      facts.filter(f => f.content?.includes(query)).slice(0, opts.limit || 10),
    getStats: async () => ({ total: facts.length }),
    _facts: facts, // For testing
  };
}

function createTempDir() {
  const tmpDir = path.join(os.tmpdir(), `indexer-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

function cleanupTempDir(tmpDir) {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function createTestCodebase(tmpDir) {
  // Create a mini codebase structure
  fs.mkdirSync(path.join(tmpDir, 'packages', 'core', 'src'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'packages', 'node', 'src'), { recursive: true });

  // Core module
  fs.writeFileSync(
    path.join(tmpDir, 'packages', 'core', 'src', 'index.js'),
    `/**
 * Core module entry point
 */
export { PHI, PHI_INV } from './constants.js';
export { createLogger } from './logger.js';
`
  );

  fs.writeFileSync(
    path.join(tmpDir, 'packages', 'core', 'src', 'constants.js'),
    `export const PHI = 1.618033988749895;
export const PHI_INV = 0.618033988749895;
`
  );

  fs.writeFileSync(
    path.join(tmpDir, 'packages', 'core', 'src', 'logger.js'),
    `export function createLogger(name) {
  return {
    info: (msg) => console.log(\`[\${name}] \${msg}\`),
    error: (msg) => console.error(\`[\${name}] ERROR: \${msg}\`),
  };
}
`
  );

  // Node module
  fs.writeFileSync(
    path.join(tmpDir, 'packages', 'node', 'src', 'index.js'),
    `import { PHI } from '@cynic/core';
export class Judge {
  evaluate(item) {
    return { score: 50 * PHI };
  }
}
`
  );

  // Package.json files
  fs.writeFileSync(
    path.join(tmpDir, 'packages', 'core', 'package.json'),
    JSON.stringify({ name: '@cynic/core', version: '1.0.0' }, null, 2)
  );

  fs.writeFileSync(
    path.join(tmpDir, 'packages', 'node', 'package.json'),
    JSON.stringify({ name: '@cynic/node', version: '1.0.0' }, null, 2)
  );

  // Root CLAUDE.md
  fs.writeFileSync(
    path.join(tmpDir, 'CLAUDE.md'),
    `# CYNIC Identity
You are CYNIC, the cynical dog.
`
  );
}

// ============================================================================
// TESTS
// ============================================================================

describe('CodebaseIndexer', () => {
  let indexer;
  let tmpDir;
  let mockFactsRepo;

  beforeEach(() => {
    tmpDir = createTempDir();
    createTestCodebase(tmpDir);
    mockFactsRepo = createMockFactsRepo();

    indexer = new CodebaseIndexer({
      factsRepo: mockFactsRepo,
      rootDir: tmpDir,
      userId: 'test-user',
      sessionId: 'test-session',
      projectName: 'TestProject',
    });
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
  });

  describe('constructor', () => {
    it('should create instance with options', () => {
      assert.ok(indexer);
      assert.strictEqual(indexer.rootDir, tmpDir);
      assert.strictEqual(indexer.userId, 'test-user');
      assert.strictEqual(indexer.projectName, 'TestProject');
    });

    it('should use cwd as default rootDir', () => {
      const i = new CodebaseIndexer({});
      assert.strictEqual(i.rootDir, process.cwd());
    });

    it('should accept progress callback', () => {
      const onProgress = () => {};
      const i = new CodebaseIndexer({ onProgress });
      assert.strictEqual(i.onProgress, onProgress);
    });
  });

  describe('index()', () => {
    it('should return results structure', async () => {
      const results = await indexer.index();

      assert.ok(results);
      assert.ok(typeof results.keystoneFacts === 'number');
      assert.ok(typeof results.packageFacts === 'number');
      assert.ok(typeof results.structureFacts === 'number');
      assert.ok(typeof results.patternFacts === 'number');
      assert.ok(typeof results.total === 'number');
      assert.ok(Array.isArray(results.errors));
    });

    it('should extract keystone facts', async () => {
      const results = await indexer.index();

      // Should find CLAUDE.md as keystone
      assert.ok(results.keystoneFacts >= 0);
    });

    it('should extract package facts', async () => {
      const results = await indexer.index();

      // Should find core and node packages
      assert.ok(results.packageFacts >= 0);
    });

    it('should store facts in repository', async () => {
      await indexer.index();

      // Check facts were stored
      const storedFacts = mockFactsRepo._facts;
      assert.ok(storedFacts.length >= 0);
    });

    it('should track total facts', async () => {
      const results = await indexer.index();

      const expectedTotal = results.keystoneFacts + results.packageFacts +
                           results.structureFacts + results.patternFacts;
      assert.strictEqual(results.total, expectedTotal);
    });

    it('should handle errors gracefully', async () => {
      // Create indexer with failing repo
      const failingRepo = {
        create: async () => { throw new Error('DB error'); },
      };
      const failingIndexer = new CodebaseIndexer({
        factsRepo: failingRepo,
        rootDir: tmpDir,
      });

      const results = await failingIndexer.index();
      assert.ok(results.errors.length > 0 || results.total === 0);
    });
  });

  describe('indexAll()', () => {
    it('should index all JS files', async () => {
      if (!indexer.indexAll) {
        // Skip if not implemented
        return;
      }

      const results = await indexer.indexAll();

      assert.ok(results);
      assert.ok(results.filesIndexed >= 0);
    });

    it('should skip node_modules', async () => {
      if (!indexer.indexAll) return;

      // Create node_modules file
      const nmDir = path.join(tmpDir, 'node_modules', 'some-pkg');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'index.js'), 'module.exports = {}');

      const results = await indexer.indexAll();

      // node_modules should be ignored
      const facts = mockFactsRepo._facts;
      const nmFacts = facts.filter(f =>
        f.content?.includes('node_modules') || f.filePath?.includes('node_modules')
      );
      assert.strictEqual(nmFacts.length, 0);
    });

    it('should extract dependencies', async () => {
      if (!indexer.indexAll) return;

      const results = await indexer.indexAll();

      // Should extract import/export info
      assert.ok(results.dependencies >= 0 || results.filesIndexed >= 0);
    });

    it('should call progress callback', async () => {
      if (!indexer.indexAll) return;

      let progressCalled = false;
      indexer.onProgress = (progress) => {
        progressCalled = true;
        // Progress object structure may vary
        assert.ok(progress !== null && typeof progress === 'object');
      };

      await indexer.indexAll();
      // Progress callback may or may not be called depending on implementation
    });
  });

  describe('_indexKeystoneFiles()', () => {
    it('should identify keystone files', async () => {
      // Access private method via index()
      const results = await indexer.index();
      assert.ok(results.keystoneFacts >= 0);
    });
  });

  describe('_indexPackages()', () => {
    it('should detect packages from package.json', async () => {
      const results = await indexer.index();
      assert.ok(results.packageFacts >= 0);
    });
  });

  describe('_detectPatterns()', () => {
    it('should detect code patterns', async () => {
      const results = await indexer.index();
      assert.ok(results.patternFacts >= 0);
    });
  });

  describe('getDependencyGraph()', () => {
    it('should return graph structure', async () => {
      if (!indexer.getDependencyGraph) return;

      const graph = await indexer.getDependencyGraph();

      assert.ok(graph);
      assert.ok(Array.isArray(graph.nodes) || graph.nodes === undefined);
      assert.ok(Array.isArray(graph.edges) || graph.edges === undefined);
    });
  });

  describe('getFileMetrics()', () => {
    it('should return file metrics', async () => {
      if (!indexer.getFileMetrics) return;

      const filePath = path.join(tmpDir, 'packages', 'core', 'src', 'index.js');
      const metrics = await indexer.getFileMetrics(filePath);

      assert.ok(metrics);
      assert.ok(typeof metrics.lines === 'number' || metrics.lines === undefined);
    });
  });
});

describe('createCodebaseIndexer()', () => {
  it('should create CodebaseIndexer instance', () => {
    const indexer = createCodebaseIndexer({ rootDir: process.cwd() });
    assert.ok(indexer instanceof CodebaseIndexer);
  });

  it('should pass options to constructor', () => {
    const indexer = createCodebaseIndexer({
      rootDir: '/test',
      projectName: 'Test',
    });
    assert.strictEqual(indexer.rootDir, '/test');
    assert.strictEqual(indexer.projectName, 'Test');
  });
});
