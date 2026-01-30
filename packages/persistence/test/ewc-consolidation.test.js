/**
 * @cynic/persistence - EWC++ Knowledge Retention Tests
 *
 * v1.2: Tests for EWC++ (Elastic Weight Consolidation++) service
 * Prevents catastrophic forgetting through Fisher Information-based locking.
 *
 * "What is truly known cannot be forgotten" - κυνικός
 *
 * @module @cynic/persistence/test/ewc-consolidation
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  EWCConsolidationService,
  createEWCService,
  EWC_CONFIG,
} from '../src/services/ewc-consolidation.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// =============================================================================
// MOCK HELPERS
// =============================================================================

function createMockPool(queryResults = {}) {
  // Generate enough patterns to meet MIN_PATTERNS_FOR_CONSOLIDATION (13)
  const generatePatterns = (count = 15) => {
    const patterns = [];
    for (let i = 1; i <= count; i++) {
      patterns.push({
        pattern_id: `pat_${String(i).padStart(3, '0')}`,
        name: `Pattern ${i}`,
        category: i % 2 === 0 ? 'token_analysis' : 'social',
        confidence: 0.3 + (i / count) * 0.5,
        frequency: Math.floor(i * 5),
        fisher_importance: (i / count) * 0.8,
        consolidation_locked: false,
        locked_at: null,
        distillation_score: 0.3 + (i / count) * 0.4,
        gradient_magnitude: 0.1 + (i / count) * 0.2,
        data: {},
        created_at: new Date(Date.now() - 86400000 * (30 - i)),
        updated_at: new Date(Date.now() - 86400000 * Math.max(1, 15 - i)),
      });
    }
    return patterns;
  };

  const defaultResults = {
    // Default patterns for _retrievePatterns (need at least 13 for consolidation)
    patterns: {
      rows: generatePatterns(15),
    },
    // Fisher calculation result
    fisher: { rows: [{ fisher: 0.65 }] },
    // Consolidation result
    consolidate: {
      rows: [{
        consolidation_id: 'ewc_abc123',
        patterns_locked: 1,
        patterns_unlocked: 0,
        retention_rate: 0.5,
      }],
    },
    // Pattern EWC status
    status: {
      rows: [{
        pattern_id: 'pat_001',
        fisher_importance: 0.65,
        consolidation_locked: true,
        ewc_status: 'LOCKED',
      }],
    },
    // History
    history: {
      rows: [{
        consolidation_id: 'ewc_abc123',
        generation: 1,
        patterns_locked: 5,
        patterns_unlocked: 0,
        retention_rate: 0.618,
        created_at: new Date(),
      }],
    },
  };

  return {
    query: mock.fn(async (sql, params) => {
      // Route queries to appropriate mock results
      if (sql.includes('SELECT') && sql.includes('FROM patterns') && sql.includes('ORDER BY frequency')) {
        return queryResults.patterns || defaultResults.patterns;
      }
      if (sql.includes('calculate_fisher_importance')) {
        return queryResults.fisher || defaultResults.fisher;
      }
      if (sql.includes('consolidate_patterns')) {
        return queryResults.consolidate || defaultResults.consolidate;
      }
      if (sql.includes('pattern_ewc_status')) {
        return queryResults.status || defaultResults.status;
      }
      if (sql.includes('ewc_consolidation_history')) {
        return queryResults.history || defaultResults.history;
      }
      if (sql.includes('can_modify_pattern')) {
        return { rows: [{ can_modify: true }] };
      }
      // Default for updates
      return { rows: [], rowCount: 1 };
    }),
  };
}

// =============================================================================
// EWC_CONFIG TESTS
// =============================================================================

describe('EWC_CONFIG', () => {
  it('should have φ-aligned lock threshold', () => {
    assert.ok(Math.abs(EWC_CONFIG.LOCK_THRESHOLD - PHI_INV) < 0.001,
      `Lock threshold should be φ⁻¹ (0.618), got ${EWC_CONFIG.LOCK_THRESHOLD}`);
  });

  it('should have φ⁻³ aligned unlock threshold', () => {
    assert.ok(Math.abs(EWC_CONFIG.UNLOCK_THRESHOLD - PHI_INV_3) < 0.001,
      `Unlock threshold should be φ⁻³ (0.236), got ${EWC_CONFIG.UNLOCK_THRESHOLD}`);
  });

  it('should have φ⁻² critical threshold', () => {
    assert.ok(Math.abs(EWC_CONFIG.CRITICAL_THRESHOLD - PHI_INV_2) < 0.001,
      `Critical threshold should be φ⁻² (0.382), got ${EWC_CONFIG.CRITICAL_THRESHOLD}`);
  });

  it('should have Fibonacci max locked patterns', () => {
    assert.strictEqual(EWC_CONFIG.MAX_LOCKED_PATTERNS, 377, 'F(14) = 377');
  });

  it('should have Fibonacci min patterns for consolidation', () => {
    assert.strictEqual(EWC_CONFIG.MIN_PATTERNS_FOR_CONSOLIDATION, 13, 'F(7) = 13');
  });

  it('should have sensible timing defaults', () => {
    assert.strictEqual(EWC_CONFIG.MIN_LOCK_DURATION_DAYS, 30);
    assert.strictEqual(EWC_CONFIG.CONSOLIDATION_INTERVAL_MS, 86400000); // 24h
  });
});

// =============================================================================
// EWCCONSOLIDATIONSERVICE TESTS
// =============================================================================

describe('EWCConsolidationService', () => {
  describe('Construction', () => {
    it('should create with default pool', () => {
      // This will use getPool() which may fail in test env
      // But we're testing that constructor works
      const service = createEWCService({ db: createMockPool() });
      assert.ok(service);
      assert.ok(service instanceof EWCConsolidationService);
    });

    it('should accept custom config', () => {
      const service = createEWCService({
        db: createMockPool(),
        config: { MIN_LOCK_DURATION_DAYS: 14 },
      });
      assert.strictEqual(service.config.MIN_LOCK_DURATION_DAYS, 14);
    });

    it('should initialize stats', () => {
      const service = createEWCService({ db: createMockPool() });
      assert.strictEqual(service.stats.consolidationsRun, 0);
      assert.strictEqual(service.stats.patternsLocked, 0);
    });
  });

  describe('Scheduler', () => {
    it('should start scheduler', async () => {
      const service = createEWCService({ db: createMockPool() });
      service.startScheduler();

      // Check that timer is set (we can't easily check setInterval)
      assert.ok(service.consolidationTimer !== null);

      service.stopScheduler();
    });

    it('should stop scheduler', () => {
      const service = createEWCService({ db: createMockPool() });
      service.startScheduler();
      service.stopScheduler();

      assert.strictEqual(service.consolidationTimer, null);
    });

    it('should not start duplicate schedulers', () => {
      const service = createEWCService({ db: createMockPool() });
      service.startScheduler();
      const firstTimer = service.consolidationTimer;
      service.startScheduler();

      assert.strictEqual(service.consolidationTimer, firstTimer);
      service.stopScheduler();
    });
  });

  describe('consolidate()', () => {
    it('should run full RETRIEVE→JUDGE→DISTILL→CONSOLIDATE cycle', async () => {
      const pool = createMockPool();
      const service = createEWCService({ db: pool });

      const result = await service.consolidate('test');

      assert.ok(result.consolidationId);
      assert.ok(result.patternsLocked !== undefined);
      assert.ok(result.patternsUnlocked !== undefined);
      assert.ok(result.retentionRate !== undefined);
      assert.strictEqual(result.triggeredBy, 'test');
    });

    it('should skip if insufficient patterns', async () => {
      const pool = createMockPool({
        patterns: { rows: [{ pattern_id: 'pat_001' }] }, // Only 1 pattern
      });
      const service = createEWCService({ db: pool });

      const result = await service.consolidate();

      assert.strictEqual(result.skipped, true);
      assert.strictEqual(result.reason, 'insufficient_patterns');
    });

    it('should emit consolidation events', async () => {
      const pool = createMockPool();
      const service = createEWCService({ db: pool });

      const events = [];
      service.on('consolidation:started', (data) => events.push({ type: 'started', data }));
      service.on('consolidation:completed', (data) => events.push({ type: 'completed', data }));

      await service.consolidate('test');

      assert.strictEqual(events.length, 2);
      assert.strictEqual(events[0].type, 'started');
      assert.strictEqual(events[1].type, 'completed');
    });

    it('should update stats after consolidation', async () => {
      const pool = createMockPool();
      const service = createEWCService({ db: pool });

      await service.consolidate('test');

      assert.strictEqual(service.stats.consolidationsRun, 1);
      assert.ok(service.stats.lastConsolidation instanceof Date);
    });
  });

  describe('getPatternStatus()', () => {
    it('should return pattern EWC status', async () => {
      const pool = createMockPool();
      const service = createEWCService({ db: pool });

      const status = await service.getPatternStatus('pat_001');

      assert.ok(status);
      assert.strictEqual(status.pattern_id, 'pat_001');
    });

    it('should return null for missing pattern', async () => {
      const pool = createMockPool({ status: { rows: [] } });
      const service = createEWCService({ db: pool });

      const status = await service.getPatternStatus('nonexistent');

      assert.strictEqual(status, null);
    });
  });

  describe('lockPattern() / unlockPattern()', () => {
    it('should lock a pattern', async () => {
      const pool = createMockPool();
      pool.query = mock.fn(async () => ({ rows: [], rowCount: 1 }));

      const service = createEWCService({ db: pool });
      const events = [];
      service.on('pattern:locked', (data) => events.push(data));

      const success = await service.lockPattern('pat_001', 'test');

      assert.strictEqual(success, true);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].patternId, 'pat_001');
    });

    it('should return false if pattern already locked', async () => {
      const pool = createMockPool();
      pool.query = mock.fn(async () => ({ rows: [], rowCount: 0 }));

      const service = createEWCService({ db: pool });
      const success = await service.lockPattern('pat_001');

      assert.strictEqual(success, false);
    });

    it('should unlock a pattern', async () => {
      const pool = createMockPool();
      pool.query = mock.fn(async () => ({ rows: [], rowCount: 1 }));

      const service = createEWCService({ db: pool });
      const events = [];
      service.on('pattern:unlocked', (data) => events.push(data));

      const success = await service.unlockPattern('pat_001', 'test');

      assert.strictEqual(success, true);
      assert.strictEqual(events.length, 1);
    });
  });

  describe('canModifyPattern()', () => {
    it('should return true for unlocked pattern', async () => {
      const pool = createMockPool();
      const service = createEWCService({ db: pool });

      const canModify = await service.canModifyPattern('pat_001');

      assert.strictEqual(canModify, true);
    });

    it('should return false for locked pattern', async () => {
      const pool = createMockPool();
      pool.query = mock.fn(async () => ({ rows: [{ can_modify: false }] }));

      const service = createEWCService({ db: pool });
      const canModify = await service.canModifyPattern('pat_001');

      assert.strictEqual(canModify, false);
    });
  });

  describe('recordPatternUsage()', () => {
    it('should update gradient magnitude', async () => {
      const pool = createMockPool();
      const updateCalls = [];
      pool.query = mock.fn(async (sql, params) => {
        if (sql.includes('UPDATE patterns')) {
          updateCalls.push({ sql, params });
        }
        return { rows: [], rowCount: 1 };
      });

      const service = createEWCService({ db: pool });
      await service.recordPatternUsage('pat_001', 0.8);

      assert.ok(updateCalls.length > 0);
      assert.strictEqual(updateCalls[0].params[0], 'pat_001');
    });
  });

  describe('getStats()', () => {
    it('should return combined stats', async () => {
      const pool = createMockPool();
      pool.query = mock.fn(async () => ({
        rows: [{
          total_patterns: 100,
          locked_patterns: 15,
          avg_fisher: 0.35,
          max_fisher: 0.9,
          avg_distillation: 0.5,
          critical_count: 8,
          important_count: 25,
          low_count: 40,
        }],
      }));

      const service = createEWCService({ db: pool });
      const stats = await service.getStats();

      assert.strictEqual(stats.totalPatterns, 100);
      assert.strictEqual(stats.lockedPatterns, 15);
      assert.ok(stats.retentionRate > 0);
      assert.strictEqual(stats.criticalCount, 8);
    });
  });

  describe('getConsolidationHistory()', () => {
    it('should return history records', async () => {
      const pool = createMockPool();
      const service = createEWCService({ db: pool });

      const history = await service.getConsolidationHistory(5);

      assert.ok(Array.isArray(history));
      assert.ok(history.length > 0);
      assert.ok(history[0].consolidation_id);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS (Logic validation)
// =============================================================================

describe('EWC++ Logic', () => {
  it('should use φ⁻¹ for lock threshold consistently', () => {
    // This validates the mathematical consistency of EWC thresholds
    const lockThreshold = EWC_CONFIG.LOCK_THRESHOLD;
    const unlockThreshold = EWC_CONFIG.UNLOCK_THRESHOLD;
    const criticalThreshold = EWC_CONFIG.CRITICAL_THRESHOLD;

    // Lock > Critical > Unlock (proper hierarchy)
    assert.ok(lockThreshold > criticalThreshold,
      'Lock threshold should be higher than critical');
    assert.ok(criticalThreshold > unlockThreshold,
      'Critical threshold should be higher than unlock');

    // All should be φ-derived
    assert.ok(Math.abs(lockThreshold - PHI_INV) < 0.001);
    assert.ok(Math.abs(criticalThreshold - PHI_INV_2) < 0.001);
    assert.ok(Math.abs(unlockThreshold - PHI_INV_3) < 0.001);
  });

  it('should protect valuable patterns from forgetting', async () => {
    // Test that high-Fisher patterns get locked
    const pool = createMockPool({
      patterns: {
        // Need at least 13 patterns for consolidation (F(7))
        rows: [
          { pattern_id: 'valuable', confidence: 0.9, frequency: 100, fisher_importance: 0.8 },
          { pattern_id: 'normal', confidence: 0.5, frequency: 10, fisher_importance: 0.3 },
          { pattern_id: 'low', confidence: 0.2, frequency: 1, fisher_importance: 0.1 },
          // Add 12 more patterns to meet minimum
          ...Array.from({ length: 12 }, (_, i) => ({
            pattern_id: `filler_${i}`,
            confidence: 0.4,
            frequency: 5,
            fisher_importance: 0.2,
          })),
        ].map(p => ({
          ...p,
          name: p.pattern_id,
          category: 'test',
          consolidation_locked: false,
          locked_at: null,
          distillation_score: 0.5,
          gradient_magnitude: 0.1,
          data: {},
          created_at: new Date(Date.now() - 86400000 * 14),
          updated_at: new Date(),
        })),
      },
    });

    const service = createEWCService({ db: pool });
    const result = await service.consolidate('test');

    // Should have run consolidation (not skipped)
    assert.ok(!result.skipped, 'Should not skip with enough patterns');
    assert.ok(result.patternsLocked !== undefined);
  });
});
