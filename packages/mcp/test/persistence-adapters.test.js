/**
 * Persistence Adapters Tests
 *
 * Tests for JudgmentAdapter and PatternAdapter.
 *
 * "Don't trust, verify" - κυνικός
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { JudgmentAdapter } from '../src/persistence/JudgmentAdapter.js';
import { PatternAdapter } from '../src/persistence/PatternAdapter.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockRepository(overrides = {}) {
  return {
    create: mock.fn(async (data) => ({ id: 'repo_1', ...data })),
    findById: mock.fn(async (id) => ({ id, content: 'found' })),
    findRecent: mock.fn(async (limit) => [{ id: 'recent_1' }]),
    search: mock.fn(async (query, opts) => [{ id: 'search_1', query }]),
    getStats: mock.fn(async () => ({ total: 10, avgScore: 75 })),
    upsert: mock.fn(async (data) => ({ id: 'upserted', ...data })),
    findByCategory: mock.fn(async (cat, limit) => [{ id: 'cat_1', category: cat }]),
    getTopPatterns: mock.fn(async (limit) => [{ id: 'top_1', frequency: 100 }]),
    ...overrides,
  };
}

function createMockFallback(overrides = {}) {
  return {
    storeJudgment: mock.fn(async (j) => ({ id: 'fallback_1', ...j })),
    getJudgment: mock.fn(async (id) => ({ id, source: 'fallback' })),
    findRecentJudgments: mock.fn(async (limit) => [{ id: 'fb_recent' }]),
    searchJudgments: mock.fn(async (q, opts) => [{ id: 'fb_search' }]),
    getJudgmentStats: mock.fn(async () => ({ total: 5 })),
    upsertPattern: mock.fn(async (p) => ({ id: 'fb_pattern', ...p })),
    getPatterns: mock.fn(async (opts) => [{ id: 'fb_pat_1' }]),
    ...overrides,
  };
}

// =============================================================================
// JUDGMENT ADAPTER TESTS
// =============================================================================

describe('JudgmentAdapter', () => {
  let adapter;
  let repo;
  let fallback;

  beforeEach(() => {
    repo = createMockRepository();
    fallback = createMockFallback();
  });

  // ===========================================================================
  // CONSTRUCTION
  // ===========================================================================

  describe('construction', () => {
    it('should create with repository only', () => {
      adapter = new JudgmentAdapter(repo, null);
      assert.ok(adapter.isAvailable);
    });

    it('should create with fallback only', () => {
      adapter = new JudgmentAdapter(null, fallback);
      assert.ok(adapter.isAvailable);
    });

    it('should create with both', () => {
      adapter = new JudgmentAdapter(repo, fallback);
      assert.ok(adapter.isAvailable);
    });

    it('should report unavailable without either', () => {
      adapter = new JudgmentAdapter(null, null);
      assert.equal(adapter.isAvailable, false);
    });
  });

  // ===========================================================================
  // STORE
  // ===========================================================================

  describe('store', () => {
    it('should store via repository', async () => {
      adapter = new JudgmentAdapter(repo, fallback);
      const judgment = { q_score: 75, verdict: 'WAG' };

      const result = await adapter.store(judgment);

      assert.ok(result.id);
      assert.equal(result.q_score, 75);
      assert.equal(repo.create.mock.calls.length, 1);
    });

    it('should fallback on repository error', async () => {
      repo.create = mock.fn(async () => { throw new Error('DB error'); });
      adapter = new JudgmentAdapter(repo, fallback);

      const result = await adapter.store({ q_score: 50 });

      assert.ok(result.id);
      assert.equal(fallback.storeJudgment.mock.calls.length, 1);
    });

    it('should use fallback when no repository', async () => {
      adapter = new JudgmentAdapter(null, fallback);

      const result = await adapter.store({ q_score: 60 });

      assert.equal(result.id, 'fallback_1');
    });

    it('should return null when both unavailable', async () => {
      adapter = new JudgmentAdapter(null, null);

      const result = await adapter.store({ q_score: 50 });

      assert.equal(result, null);
    });
  });

  // ===========================================================================
  // GET BY ID
  // ===========================================================================

  describe('getById', () => {
    it('should get via repository', async () => {
      adapter = new JudgmentAdapter(repo, fallback);

      const result = await adapter.getById('judgment_123');

      assert.equal(result.id, 'judgment_123');
      assert.equal(repo.findById.mock.calls.length, 1);
    });

    it('should fallback on repository error', async () => {
      repo.findById = mock.fn(async () => { throw new Error('Not found'); });
      adapter = new JudgmentAdapter(repo, fallback);

      const result = await adapter.getById('judgment_123');

      assert.equal(result.source, 'fallback');
    });

    it('should return null when both unavailable', async () => {
      adapter = new JudgmentAdapter(null, null);

      const result = await adapter.getById('any');

      assert.equal(result, null);
    });
  });

  // ===========================================================================
  // SEARCH
  // ===========================================================================

  describe('search', () => {
    it('should search via repository', async () => {
      adapter = new JudgmentAdapter(repo, fallback);

      const results = await adapter.search('test query', { limit: 5 });

      assert.equal(results.length, 1);
      assert.equal(results[0].query, 'test query');
    });

    it('should pass options to repository', async () => {
      adapter = new JudgmentAdapter(repo, fallback);

      await adapter.search('query', { limit: 10, offset: 5 });

      const call = repo.search.mock.calls[0];
      assert.equal(call.arguments[1].limit, 10);
      assert.equal(call.arguments[1].offset, 5);
    });

    it('should fallback on error', async () => {
      repo.search = mock.fn(async () => { throw new Error('Search failed'); });
      adapter = new JudgmentAdapter(repo, fallback);

      const results = await adapter.search('query');

      assert.equal(results[0].id, 'fb_search');
    });

    it('should return empty array when unavailable', async () => {
      adapter = new JudgmentAdapter(null, null);

      const results = await adapter.search('query');

      assert.deepEqual(results, []);
    });
  });

  // ===========================================================================
  // GET RECENT
  // ===========================================================================

  describe('getRecent', () => {
    it('should get recent judgments', async () => {
      adapter = new JudgmentAdapter(repo, fallback);

      const results = await adapter.getRecent(5);

      assert.equal(results.length, 1);
      assert.equal(repo.findRecent.mock.calls[0].arguments[0], 5);
    });

    it('should use default limit of 10', async () => {
      adapter = new JudgmentAdapter(repo, fallback);

      await adapter.getRecent();

      assert.equal(repo.findRecent.mock.calls[0].arguments[0], 10);
    });

    it('should fallback on error', async () => {
      repo.findRecent = mock.fn(async () => { throw new Error('Failed'); });
      adapter = new JudgmentAdapter(repo, fallback);

      const results = await adapter.getRecent();

      assert.equal(results[0].id, 'fb_recent');
    });
  });

  // ===========================================================================
  // GET STATS
  // ===========================================================================

  describe('getStats', () => {
    it('should get stats via repository', async () => {
      adapter = new JudgmentAdapter(repo, fallback);

      const stats = await adapter.getStats();

      assert.equal(stats.total, 10);
      assert.equal(stats.avgScore, 75);
    });

    it('should fallback on error', async () => {
      repo.getStats = mock.fn(async () => { throw new Error('Stats error'); });
      adapter = new JudgmentAdapter(repo, fallback);

      const stats = await adapter.getStats();

      assert.equal(stats.total, 5);
    });

    it('should return default stats when unavailable', async () => {
      adapter = new JudgmentAdapter(null, null);

      const stats = await adapter.getStats();

      assert.equal(stats.total, 0);
      assert.equal(stats.avgScore, 0);
      assert.equal(stats.avgConfidence, 0);
      assert.deepEqual(stats.verdicts, {});
    });
  });
});

// =============================================================================
// PATTERN ADAPTER TESTS
// =============================================================================

describe('PatternAdapter', () => {
  let adapter;
  let repo;
  let fallback;

  beforeEach(() => {
    repo = createMockRepository();
    fallback = createMockFallback();
  });

  // ===========================================================================
  // CONSTRUCTION
  // ===========================================================================

  describe('construction', () => {
    it('should create with repository only', () => {
      adapter = new PatternAdapter(repo, null);
      assert.ok(adapter.isAvailable);
    });

    it('should create with fallback only', () => {
      adapter = new PatternAdapter(null, fallback);
      assert.ok(adapter.isAvailable);
    });

    it('should report unavailable without either', () => {
      adapter = new PatternAdapter(null, null);
      assert.equal(adapter.isAvailable, false);
    });
  });

  // ===========================================================================
  // UPSERT
  // ===========================================================================

  describe('upsert', () => {
    it('should upsert via repository', async () => {
      adapter = new PatternAdapter(repo, fallback);
      const pattern = { name: 'test_pattern', category: 'errors' };

      const result = await adapter.upsert(pattern);

      assert.ok(result.id);
      assert.equal(result.name, 'test_pattern');
      assert.equal(repo.upsert.mock.calls.length, 1);
    });

    it('should provide default category', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.upsert({ name: 'no_category' });

      const call = repo.upsert.mock.calls[0];
      assert.equal(call.arguments[0].category, 'uncategorized');
    });

    it('should provide default name', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.upsert({ category: 'test' });

      const call = repo.upsert.mock.calls[0];
      assert.ok(call.arguments[0].name.startsWith('pattern_'));
    });

    it('should provide default confidence', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.upsert({ name: 'test' });

      const call = repo.upsert.mock.calls[0];
      assert.equal(call.arguments[0].confidence, 0.5);
    });

    it('should fallback on repository error', async () => {
      repo.upsert = mock.fn(async () => { throw new Error('Upsert failed'); });
      adapter = new PatternAdapter(repo, fallback);

      const result = await adapter.upsert({ name: 'test' });

      assert.equal(result.id, 'fb_pattern');
    });

    it('should return null for null pattern', async () => {
      adapter = new PatternAdapter(repo, fallback);

      const result = await adapter.upsert(null);

      assert.equal(result, null);
    });

    it('should return null when both unavailable', async () => {
      adapter = new PatternAdapter(null, null);

      const result = await adapter.upsert({ name: 'test' });

      assert.equal(result, null);
    });
  });

  // ===========================================================================
  // GET
  // ===========================================================================

  describe('get', () => {
    it('should get top patterns by default', async () => {
      adapter = new PatternAdapter(repo, fallback);

      const results = await adapter.get();

      assert.equal(results[0].id, 'top_1');
      assert.equal(repo.getTopPatterns.mock.calls.length, 1);
    });

    it('should filter by category', async () => {
      adapter = new PatternAdapter(repo, fallback);

      const results = await adapter.get({ category: 'errors' });

      assert.equal(results[0].category, 'errors');
      assert.equal(repo.findByCategory.mock.calls.length, 1);
    });

    it('should respect limit option', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.get({ limit: 5 });

      const call = repo.getTopPatterns.mock.calls[0];
      assert.equal(call.arguments[0], 5);
    });

    it('should use default limit of 10', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.get();

      const call = repo.getTopPatterns.mock.calls[0];
      assert.equal(call.arguments[0], 10);
    });

    it('should fallback on error', async () => {
      repo.getTopPatterns = mock.fn(async () => { throw new Error('Failed'); });
      adapter = new PatternAdapter(repo, fallback);

      const results = await adapter.get();

      assert.equal(results[0].id, 'fb_pat_1');
    });

    it('should return empty array when unavailable', async () => {
      adapter = new PatternAdapter(null, null);

      const results = await adapter.get();

      assert.deepEqual(results, []);
    });
  });

  // ===========================================================================
  // GET BY CATEGORY
  // ===========================================================================

  describe('getByCategory', () => {
    it('should get patterns by category', async () => {
      adapter = new PatternAdapter(repo, fallback);

      const results = await adapter.getByCategory('errors', 20);

      assert.equal(results[0].category, 'errors');
    });

    it('should use default limit of 10', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.getByCategory('test');

      const call = repo.findByCategory.mock.calls[0];
      assert.equal(call.arguments[1], 10);
    });
  });

  // ===========================================================================
  // GET TOP
  // ===========================================================================

  describe('getTop', () => {
    it('should get top patterns', async () => {
      adapter = new PatternAdapter(repo, fallback);

      const results = await adapter.getTop(15);

      assert.equal(results[0].id, 'top_1');
      assert.equal(repo.getTopPatterns.mock.calls[0].arguments[0], 15);
    });

    it('should use default limit of 10', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.getTop();

      assert.equal(repo.getTopPatterns.mock.calls[0].arguments[0], 10);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle concurrent operations', async () => {
      adapter = new PatternAdapter(repo, fallback);

      const promises = [
        adapter.upsert({ name: 'p1' }),
        adapter.upsert({ name: 'p2' }),
        adapter.get(),
        adapter.getByCategory('test'),
      ];

      const results = await Promise.all(promises);
      assert.equal(results.length, 4);
    });

    it('should preserve existing confidence when provided', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.upsert({ name: 'test', confidence: 0.9 });

      const call = repo.upsert.mock.calls[0];
      assert.equal(call.arguments[0].confidence, 0.9);
    });

    it('should preserve zero confidence', async () => {
      adapter = new PatternAdapter(repo, fallback);

      await adapter.upsert({ name: 'test', confidence: 0 });

      const call = repo.upsert.mock.calls[0];
      // nullish coalescing should preserve 0
      assert.equal(call.arguments[0].confidence, 0);
    });
  });
});

// =============================================================================
// INTEGRATION-LIKE TESTS
// =============================================================================

describe('Adapter Integration', () => {
  it('should work together for judgment-pattern flow', async () => {
    const judgmentRepo = createMockRepository();
    const patternRepo = createMockRepository();
    const fallback = createMockFallback();

    const judgmentAdapter = new JudgmentAdapter(judgmentRepo, fallback);
    const patternAdapter = new PatternAdapter(patternRepo, fallback);

    // Store a judgment
    const judgment = await judgmentAdapter.store({
      q_score: 80,
      verdict: 'WAG',
      patterns_detected: ['pattern_1'],
    });

    assert.ok(judgment.id);

    // Upsert related pattern
    const pattern = await patternAdapter.upsert({
      name: 'pattern_1',
      category: 'quality',
      confidence: 0.8,
      related_judgments: [judgment.id],
    });

    assert.ok(pattern.id);
    assert.equal(pattern.category, 'quality');
  });

  it('should handle complete unavailability gracefully', async () => {
    const judgmentAdapter = new JudgmentAdapter(null, null);
    const patternAdapter = new PatternAdapter(null, null);

    // All operations should return safe defaults
    assert.equal(await judgmentAdapter.store({}), null);
    assert.equal(await judgmentAdapter.getById('x'), null);
    assert.deepEqual(await judgmentAdapter.search('x'), []);
    assert.deepEqual(await judgmentAdapter.getRecent(), []);

    assert.equal(await patternAdapter.upsert({}), null);
    assert.deepEqual(await patternAdapter.get(), []);
    assert.deepEqual(await patternAdapter.getByCategory('x'), []);
    assert.deepEqual(await patternAdapter.getTop(), []);
  });
});
