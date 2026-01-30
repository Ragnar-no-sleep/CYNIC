/**
 * @cynic/node - Shared Memory Tests
 *
 * Tests for the collective intelligence layer with EWC++ integration.
 *
 * @module @cynic/node/test/shared-memory
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { SharedMemory } from '../src/memory/shared-memory.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const PHI_INV = 0.618033988749895;

// =============================================================================
// MOCK HELPERS
// =============================================================================

function createMockStorage(data = {}) {
  return {
    get: mock.fn(async (key) => data[key] || null),
    set: mock.fn(async (key, value) => { data[key] = value; }),
  };
}

// =============================================================================
// SHARED MEMORY TESTS
// =============================================================================

describe('SharedMemory', () => {
  let memory;
  let storage;

  beforeEach(() => {
    storage = createMockStorage();
    memory = new SharedMemory({ storage });
  });

  describe('Construction', () => {
    it('should create with storage', () => {
      assert.ok(memory);
      assert.strictEqual(memory.initialized, false);
    });

    it('should initialize empty maps', () => {
      assert.strictEqual(memory._patterns.size, 0);
    });
  });

  describe('initialize()', () => {
    it('should initialize from storage', async () => {
      await memory.initialize();
      assert.strictEqual(memory.initialized, true);
    });

    it('should load saved patterns', async () => {
      storage = createMockStorage({
        shared_memory: {
          patterns: [
            ['pat_001', { id: 'pat_001', name: 'Test', weight: 1.5 }],
          ],
        },
      });
      memory = new SharedMemory({ storage });

      await memory.initialize();

      assert.strictEqual(memory._patterns.size, 1);
      assert.ok(memory._patterns.has('pat_001'));
    });
  });

  describe('addPattern()', () => {
    beforeEach(async () => {
      await memory.initialize();
    });

    it('should add a pattern with defaults', () => {
      const id = memory.addPattern({ name: 'Test Pattern', tags: ['test'] });

      assert.ok(id);
      assert.ok(id.startsWith('pat_'));

      const pattern = memory._patterns.get(id);
      assert.strictEqual(pattern.name, 'Test Pattern');
      assert.strictEqual(pattern.weight, 1.0);
      assert.strictEqual(pattern.useCount, 0);
    });

    it('should initialize EWC fields', () => {
      const id = memory.addPattern({ name: 'Test' });
      const pattern = memory._patterns.get(id);

      assert.strictEqual(pattern.fisherImportance, 0);
      assert.strictEqual(pattern.consolidationLocked, false);
      assert.strictEqual(pattern.lockedAt, null);
    });

    it('should preserve existing EWC fields', () => {
      const id = memory.addPattern({
        name: 'Locked Pattern',
        fisherImportance: 0.8,
        consolidationLocked: true,
        lockedAt: Date.now(),
      });

      const pattern = memory._patterns.get(id);
      assert.strictEqual(pattern.fisherImportance, 0.8);
      assert.strictEqual(pattern.consolidationLocked, true);
    });
  });

  describe('getRelevantPatterns()', () => {
    beforeEach(async () => {
      await memory.initialize();

      // Add test patterns
      memory.addPattern({
        id: 'pat_token',
        name: 'Token Analysis',
        applicableTo: ['token'],
        tags: ['analysis', 'market'],
        weight: 1.5,
      });
      memory.addPattern({
        id: 'pat_social',
        name: 'Social Pattern',
        applicableTo: ['social'],
        tags: ['twitter', 'sentiment'],
        weight: 1.0,
      });
    });

    it('should find relevant patterns by type', () => {
      const patterns = memory.getRelevantPatterns({ type: 'token' });

      assert.ok(patterns.length > 0);
      assert.ok(patterns.some(p => p.id === 'pat_token'));
    });

    it('should increase useCount on retrieval', () => {
      memory.getRelevantPatterns({ type: 'token' });
      memory.getRelevantPatterns({ type: 'token' });

      const pattern = memory._patterns.get('pat_token');
      assert.ok(pattern.useCount >= 2);
    });

    it('should reinforce weights on use', () => {
      const before = memory._patterns.get('pat_token').weight;
      memory.getRelevantPatterns({ type: 'token' });
      const after = memory._patterns.get('pat_token').weight;

      assert.ok(after > before, 'Weight should increase after use');
    });
  });

  describe('EWC++ Integration', () => {
    beforeEach(async () => {
      await memory.initialize();
    });

    describe('Fisher Importance Boosting', () => {
      it('should boost Fisher importance on pattern use', () => {
        const id = memory.addPattern({
          name: 'Test',
          applicableTo: ['token'],
          fisherImportance: 0.1,
        });

        // Use the pattern
        memory.getRelevantPatterns({ type: 'token' });

        const pattern = memory._patterns.get(id);
        assert.ok(pattern.fisherImportance > 0.1,
          'Fisher importance should increase after use');
      });

      it('should auto-lock pattern when threshold exceeded', () => {
        const id = memory.addPattern({
          name: 'Popular Pattern',
          applicableTo: ['token'],
          fisherImportance: 0.6, // Just below threshold
          useCount: 10, // Above minimum uses
        });

        // Use the pattern multiple times to push Fisher above threshold
        for (let i = 0; i < 10; i++) {
          memory.getRelevantPatterns({ type: 'token' });
        }

        const pattern = memory._patterns.get(id);
        assert.ok(pattern.fisherImportance >= PHI_INV,
          'Fisher should exceed lock threshold');
        assert.strictEqual(pattern.consolidationLocked, true,
          'Pattern should be auto-locked');
      });

      it('should not auto-lock if insufficient uses', () => {
        const id = memory.addPattern({
          name: 'New Pattern',
          applicableTo: ['token'],
          fisherImportance: 0.6,
          useCount: 0, // Below minimum uses
        });

        memory.getRelevantPatterns({ type: 'token' });

        const pattern = memory._patterns.get(id);
        assert.strictEqual(pattern.consolidationLocked, false,
          'Pattern should not lock without enough uses');
      });
    });

    describe('Decay Protection', () => {
      it('should protect locked patterns from decay', () => {
        memory.addPattern({
          id: 'locked_pattern',
          name: 'Locked',
          consolidationLocked: true,
          weight: 1.5,
          lastUsed: Date.now() - 86400000 * 30, // 30 days ago
        });

        memory.addPattern({
          id: 'unlocked_pattern',
          name: 'Unlocked',
          consolidationLocked: false,
          weight: 1.5,
          lastUsed: Date.now() - 86400000 * 30, // 30 days ago
        });

        const result = memory.decayUnusedPatterns();

        const locked = memory._patterns.get('locked_pattern');
        const unlocked = memory._patterns.get('unlocked_pattern');

        assert.strictEqual(locked.weight, 1.5, 'Locked pattern weight should not change');
        assert.ok(unlocked.weight < 1.5, 'Unlocked pattern weight should decay');
        assert.ok(result.protected > 0, 'Should report protected patterns');
      });

      it('should decay Fisher importance for unlocked patterns', () => {
        memory.addPattern({
          id: 'unlocked',
          name: 'Unlocked',
          consolidationLocked: false,
          fisherImportance: 0.5,
          lastUsed: Date.now() - 86400000 * 30,
        });

        memory.decayUnusedPatterns();

        const pattern = memory._patterns.get('unlocked');
        assert.ok(pattern.fisherImportance < 0.5,
          'Fisher importance should decay for unlocked patterns');
      });
    });

    describe('Pruning Protection', () => {
      it('should never prune locked patterns', async () => {
        // Fill memory close to limit
        for (let i = 0; i < 100; i++) {
          memory.addPattern({
            id: `pat_${i}`,
            name: `Pattern ${i}`,
            weight: 0.1,
            useCount: 0,
          });
        }

        // Add a locked pattern with low score
        memory.addPattern({
          id: 'locked_precious',
          name: 'Locked Precious',
          consolidationLocked: true,
          weight: 0.01, // Very low weight
          useCount: 0,
        });

        // Trigger pruning by adding more patterns
        for (let i = 100; i < 200; i++) {
          memory.addPattern({
            id: `pat_${i}`,
            name: `Pattern ${i}`,
            weight: 1.0,
            useCount: 10,
          });
        }

        // The locked pattern should still exist
        assert.ok(memory._patterns.has('locked_precious'),
          'Locked pattern should never be pruned');
      });
    });

    describe('unlockPattern()', () => {
      it('should unlock a locked pattern', () => {
        memory.addPattern({
          id: 'to_unlock',
          name: 'Unlock Me',
          consolidationLocked: true,
          lockedAt: Date.now(),
        });

        const success = memory.unlockPattern('to_unlock');

        assert.strictEqual(success, true);
        const pattern = memory._patterns.get('to_unlock');
        assert.strictEqual(pattern.consolidationLocked, false);
        assert.strictEqual(pattern.lockedAt, null);
      });

      it('should return false for non-locked pattern', () => {
        memory.addPattern({
          id: 'not_locked',
          name: 'Not Locked',
          consolidationLocked: false,
        });

        const success = memory.unlockPattern('not_locked');
        assert.strictEqual(success, false);
      });

      it('should return false for nonexistent pattern', () => {
        const success = memory.unlockPattern('nonexistent');
        assert.strictEqual(success, false);
      });
    });

    describe('getEWCStats()', () => {
      it('should return EWC statistics', () => {
        memory.addPattern({
          id: 'locked1',
          name: 'Locked 1',
          consolidationLocked: true,
          fisherImportance: 0.9,
        });
        memory.addPattern({
          id: 'critical1',
          name: 'Critical 1',
          consolidationLocked: false,
          fisherImportance: 0.7,
        });
        memory.addPattern({
          id: 'normal1',
          name: 'Normal 1',
          consolidationLocked: false,
          fisherImportance: 0.3,
        });

        const stats = memory.getEWCStats();

        assert.strictEqual(stats.totalPatterns, 3);
        assert.strictEqual(stats.lockedPatterns, 1);
        assert.strictEqual(stats.criticalPatterns, 1); // Above threshold but not locked
        assert.ok(stats.avgFisher > 0);
        assert.strictEqual(stats.maxFisher, 0.9);
        assert.ok(stats.retentionRate > 0);
      });

      it('should handle empty memory', () => {
        const stats = memory.getEWCStats();

        assert.strictEqual(stats.totalPatterns, 0);
        assert.strictEqual(stats.lockedPatterns, 0);
        assert.strictEqual(stats.avgFisher, 0);
        assert.strictEqual(stats.retentionRate, 0);
      });
    });
  });

  describe('Path Reinforcement', () => {
    beforeEach(async () => {
      await memory.initialize();
    });

    it('should boost weight on pattern use', () => {
      const id = memory.addPattern({
        name: 'Test',
        applicableTo: ['token'],
        weight: 1.0,
      });

      memory.getRelevantPatterns({ type: 'token' });

      const pattern = memory._patterns.get(id);
      assert.ok(pattern.weight > 1.0, 'Weight should increase');
    });

    it('should cap weight at MAX_WEIGHT', () => {
      const id = memory.addPattern({
        name: 'Test',
        applicableTo: ['token'],
        weight: 2.5, // Close to max (2.618)
      });

      // Use many times
      for (let i = 0; i < 100; i++) {
        memory.getRelevantPatterns({ type: 'token' });
      }

      const pattern = memory._patterns.get(id);
      assert.ok(pattern.weight <= 2.618, 'Weight should not exceed MAX_WEIGHT');
    });

    it('should decay weight over time', () => {
      memory.addPattern({
        id: 'old_pattern',
        name: 'Old',
        weight: 1.5,
        lastUsed: Date.now() - 86400000 * 30, // 30 days ago
        addedAt: Date.now() - 86400000 * 60,
      });

      const before = memory._patterns.get('old_pattern').weight;
      memory.decayUnusedPatterns();
      const after = memory._patterns.get('old_pattern').weight;

      assert.ok(after < before, 'Weight should decay for unused patterns');
    });

    it('should not decay below MIN_WEIGHT', () => {
      memory.addPattern({
        id: 'very_old',
        name: 'Very Old',
        weight: 0.3,
        lastUsed: Date.now() - 86400000 * 365, // 1 year ago
        addedAt: Date.now() - 86400000 * 400,
      });

      // Decay multiple times
      for (let i = 0; i < 100; i++) {
        memory.decayUnusedPatterns();
      }

      const pattern = memory._patterns.get('very_old');
      assert.ok(pattern.weight >= 0.236, 'Weight should not decay below MIN_WEIGHT (φ⁻³)');
    });
  });

  describe('getTopReinforcedPatterns()', () => {
    beforeEach(async () => {
      await memory.initialize();

      memory.addPattern({ id: 'high', name: 'High Weight', weight: 2.0 });
      memory.addPattern({ id: 'medium', name: 'Medium Weight', weight: 1.0 });
      memory.addPattern({ id: 'low', name: 'Low Weight', weight: 0.5 });
    });

    it('should return patterns sorted by weight', () => {
      const top = memory.getTopReinforcedPatterns(3);

      assert.strictEqual(top.length, 3);
      assert.strictEqual(top[0].id, 'high');
      assert.strictEqual(top[1].id, 'medium');
      assert.strictEqual(top[2].id, 'low');
    });

    it('should respect limit', () => {
      const top = memory.getTopReinforcedPatterns(1);
      assert.strictEqual(top.length, 1);
    });
  });
});
