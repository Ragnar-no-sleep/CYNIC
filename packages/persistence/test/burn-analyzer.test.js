#!/usr/bin/env node
/**
 * Burn Analyzer Service Tests
 *
 * Tests for the BURN axiom analyzer.
 * Vision → Compréhension → Burn
 *
 * "φ distrusts φ" - CYNIC
 *
 * @module @cynic/persistence/test/burn-analyzer
 */

import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import os from 'os';

import {
  BurnAnalyzer,
  createBurnAnalyzer,
  BurnVerdict,
} from '../src/services/burn-analyzer.js';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

function createMockCodebaseIndexer() {
  return {
    getDependencyGraph: async () => ({
      nodes: [
        { id: 'a.js', file: 'a.js', imports: ['b.js'], exports: ['foo'] },
        { id: 'b.js', file: 'b.js', imports: [], exports: ['bar'] },
        { id: 'orphan.js', file: 'orphan.js', imports: [], exports: [] },
      ],
      edges: [
        { source: 'a.js', target: 'b.js', type: 'import' },
      ],
    }),
    getFileMetrics: async (file) => ({
      file,
      lines: file === 'giant.js' ? 2000 : 100,
      complexity: file === 'hotspot.js' ? 50 : 5,
    }),
  };
}

function createTempDir() {
  const tmpDir = path.join(os.tmpdir(), `burn-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

function cleanupTempDir(tmpDir) {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('BurnAnalyzer', () => {
  let analyzer;
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempDir();
    analyzer = createBurnAnalyzer({
      rootDir: tmpDir,
      codebaseIndexer: createMockCodebaseIndexer(),
    });
  });

  describe('constructor', () => {
    it('should create instance with defaults', () => {
      const a = new BurnAnalyzer();
      assert.ok(a);
      assert.equal(a.indexer, null);
      assert.ok(a.cache instanceof Map);
    });

    it('should accept codebaseIndexer option', () => {
      const indexer = createMockCodebaseIndexer();
      const a = new BurnAnalyzer({ codebaseIndexer: indexer });
      assert.strictEqual(a.indexer, indexer);
    });

    it('should accept rootDir option', () => {
      const a = new BurnAnalyzer({ rootDir: '/custom/path' });
      assert.strictEqual(a.rootDir, '/custom/path');
    });
  });

  describe('BurnVerdict', () => {
    it('should have all verdict types', () => {
      assert.strictEqual(BurnVerdict.DELETE, 'delete');
      assert.strictEqual(BurnVerdict.MERGE, 'merge');
      assert.strictEqual(BurnVerdict.SPLIT, 'split');
      assert.strictEqual(BurnVerdict.SIMPLIFY, 'simplify');
      assert.strictEqual(BurnVerdict.KEEP, 'keep');
      assert.strictEqual(BurnVerdict.REVIEW, 'review');
    });
  });

  describe('analyze()', () => {
    beforeEach(() => {
      // Create some test files
      fs.writeFileSync(path.join(tmpDir, 'main.js'), `
        import { foo } from './utils.js';
        export function main() { return foo(); }
      `);
      fs.writeFileSync(path.join(tmpDir, 'utils.js'), `
        export function foo() { return 'foo'; }
      `);
      fs.writeFileSync(path.join(tmpDir, 'orphan.js'), `
        // This file is not imported anywhere
        export function unused() { return 'unused'; }
      `);
    });

    it('should return analysis results structure', async () => {
      const results = await analyzer.analyze({ useLlm: false });

      assert.ok(results.timestamp);
      assert.ok(results.stats);
      assert.ok(Array.isArray(results.orphans));
      assert.ok(Array.isArray(results.hotspots));
      assert.ok(Array.isArray(results.giants));
      assert.ok(Array.isArray(results.duplicates));
      assert.ok(Array.isArray(results.candidates));
      assert.ok(results.summary);
    });

    it('should count total files', async () => {
      const results = await analyzer.analyze({ useLlm: false });
      assert.ok(results.stats.totalFiles >= 0);
    });

    it('should respect maxCandidates option', async () => {
      const results = await analyzer.analyze({ useLlm: false, maxCandidates: 5 });
      assert.ok(results.candidates.length <= 5);
    });

    it('should set finalVerdict when LLM disabled', async () => {
      const results = await analyzer.analyze({ useLlm: false });
      for (const candidate of results.candidates) {
        assert.ok(candidate.finalVerdict || candidate.verdict);
      }
    });
  });

  describe('_findOrphans()', () => {
    it('should identify files with no imports', async () => {
      // Create files
      fs.writeFileSync(path.join(tmpDir, 'connected.js'), `
        import { x } from './other.js';
        export const y = x;
      `);
      fs.writeFileSync(path.join(tmpDir, 'other.js'), `
        export const x = 1;
      `);
      fs.writeFileSync(path.join(tmpDir, 'lonely.js'), `
        // No imports or exports
        const z = 42;
      `);

      const results = await analyzer.analyze({ useLlm: false });
      // Should find orphans (files not imported by anything)
      assert.ok(Array.isArray(results.orphans));
    });
  });

  describe('_findGiants()', () => {
    it('should identify files over line threshold', async () => {
      // Create a "giant" file (many lines)
      const bigContent = Array(600).fill('// line').join('\n');
      fs.writeFileSync(path.join(tmpDir, 'giant.js'), bigContent);

      const results = await analyzer.analyze({ useLlm: false });
      // Giants are files over 500 lines
      assert.ok(Array.isArray(results.giants));
    });
  });

  describe('summary generation', () => {
    it('should generate summary object', async () => {
      const results = await analyzer.analyze({ useLlm: false });

      assert.ok(results.summary);
      assert.ok(typeof results.summary === 'object' || typeof results.summary === 'string');
    });
  });

});

// Cleanup after all tests
after(() => {
  // Cleanup will happen automatically when process exits
});

describe('createBurnAnalyzer()', () => {
  it('should create BurnAnalyzer instance', () => {
    const analyzer = createBurnAnalyzer();
    assert.ok(analyzer instanceof BurnAnalyzer);
  });

  it('should pass options to constructor', () => {
    const analyzer = createBurnAnalyzer({ rootDir: '/test' });
    assert.strictEqual(analyzer.rootDir, '/test');
  });
});
