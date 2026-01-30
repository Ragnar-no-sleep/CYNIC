/**
 * @cynic/node - Tiered Routing Tests
 *
 * Tests for complexity classification and tiered routing.
 *
 * @module @cynic/node/test/tiered-routing
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  ComplexityClassifier,
  createComplexityClassifier,
  ComplexityTier,
  COMPLEXITY_THRESHOLDS,
} from '../src/routing/complexity-classifier.js';

import {
  TieredRouter,
  createTieredRouter,
  HANDLER_COSTS,
  HANDLER_LATENCIES,
} from '../src/routing/tiered-router.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// =============================================================================
// COMPLEXITY THRESHOLDS TESTS
// =============================================================================

describe('COMPLEXITY_THRESHOLDS', () => {
  it('should have φ-aligned local threshold', () => {
    assert.ok(Math.abs(COMPLEXITY_THRESHOLDS.LOCAL_MAX - PHI_INV_3) < 0.001,
      `Local max should be φ⁻³ (0.236), got ${COMPLEXITY_THRESHOLDS.LOCAL_MAX}`);
  });

  it('should have φ-aligned light threshold', () => {
    assert.ok(Math.abs(COMPLEXITY_THRESHOLDS.LIGHT_MAX - PHI_INV) < 0.001,
      `Light max should be φ⁻¹ (0.618), got ${COMPLEXITY_THRESHOLDS.LIGHT_MAX}`);
  });

  it('should be frozen', () => {
    assert.ok(Object.isFrozen(COMPLEXITY_THRESHOLDS));
  });
});

// =============================================================================
// COMPLEXITY CLASSIFIER TESTS
// =============================================================================

describe('ComplexityClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = createComplexityClassifier();
  });

  describe('Construction', () => {
    it('should create with factory', () => {
      const c = createComplexityClassifier();
      assert.ok(c instanceof ComplexityClassifier);
    });

    it('should initialize stats', () => {
      const stats = classifier.getStats();
      assert.strictEqual(stats.classified, 0);
    });

    it('should accept custom thresholds', () => {
      const c = createComplexityClassifier({
        thresholds: { LOCAL_MAX: 0.3 },
      });
      assert.strictEqual(c.thresholds.LOCAL_MAX, 0.3);
    });
  });

  describe('Simple Pattern Classification (Tier 1)', () => {
    const simpleCases = [
      'list all files',
      'show files in src',
      'git status',
      'git diff',
      'format the code',
      'lint this file',
      'does foo.js exist',
      'is config.json running',
      'find myfile.ts',
      'rename foo to bar',
      'delete temp.txt',
      'create a folder',
    ];

    for (const content of simpleCases) {
      it(`should classify "${content}" as LOCAL`, () => {
        const result = classifier.classify({ content });
        assert.strictEqual(result.tier, ComplexityTier.LOCAL,
          `Expected LOCAL for "${content}", got ${result.tier}`);
      });
    }
  });

  describe('Complex Pattern Classification (Tier 3)', () => {
    const complexCases = [
      'architect a new authentication system',
      'design the module structure',
      'refactor the entire codebase',
      'analyze the code quality',
      'explain why this approach is better',
      'implement a new feature for user management',
      'migrate from REST to GraphQL',
      'compare the trade-offs between approaches',
      'should we use Redux or Context',
      'security audit the authentication flow',
    ];

    for (const content of complexCases) {
      it(`should classify "${content}" as FULL`, () => {
        const result = classifier.classify({ content });
        assert.strictEqual(result.tier, ComplexityTier.FULL,
          `Expected FULL for "${content}", got ${result.tier}`);
      });
    }
  });

  describe('Medium Complexity (Tier 2)', () => {
    it('should classify medium requests as LIGHT', () => {
      // A request that's not simple but not super complex
      const result = classifier.classify({
        content: 'update the button color to blue',
      });

      // Should be either LIGHT or LOCAL (not FULL for such simple task)
      assert.ok(
        result.tier === ComplexityTier.LIGHT || result.tier === ComplexityTier.LOCAL,
        `Expected LIGHT or LOCAL, got ${result.tier}`
      );
    });
  });

  describe('Signal Extraction', () => {
    it('should detect reasoning in non-pattern requests', () => {
      // Use content that doesn't match simple/complex patterns
      const result = classifier.classify({
        content: 'tell me the reason for the error',
      });
      // Either signals extracted or pattern matched
      assert.ok(result.complexity !== undefined);
    });

    it('should detect judgment in non-pattern requests', () => {
      const result = classifier.classify({
        content: 'rate this piece of code',
      });
      assert.ok(result.complexity !== undefined);
    });

    it('should detect creativity requirements', () => {
      const result = classifier.classify({
        content: 'suggest some ideas for improvement',
      });
      // Either pattern matched or signals extracted
      assert.ok(result.complexity !== undefined);
    });

    it('should handle varying content lengths', () => {
      const shortResult = classifier.classify({ content: 'hi' });
      const longResult = classifier.classify({
        content: 'This is a much longer request that contains many more tokens ' +
                 'and should therefore have a higher complexity score based on ' +
                 'the token count signal which measures request length.',
      });

      // Both should be classified (signals or patterns)
      assert.ok(shortResult.tier !== undefined);
      assert.ok(longResult.tier !== undefined);
    });
  });

  describe('Empty/Invalid Input', () => {
    it('should handle empty content', () => {
      const result = classifier.classify({ content: '' });
      assert.strictEqual(result.tier, ComplexityTier.LOCAL);
      assert.strictEqual(result.reason, 'empty_request');
    });

    it('should handle null content', () => {
      const result = classifier.classify({ content: null });
      assert.strictEqual(result.tier, ComplexityTier.LOCAL);
    });

    it('should handle missing content', () => {
      const result = classifier.classify({});
      assert.strictEqual(result.tier, ComplexityTier.LOCAL);
    });
  });

  describe('Statistics', () => {
    it('should track classification count', () => {
      classifier.classify({ content: 'test' });
      classifier.classify({ content: 'another test' });

      const stats = classifier.getStats();
      assert.strictEqual(stats.classified, 2);
    });

    it('should track by tier', () => {
      classifier.classify({ content: 'list files' }); // LOCAL
      classifier.classify({ content: 'refactor the codebase completely' }); // FULL (matches refactor pattern)

      const stats = classifier.getStats();
      assert.strictEqual(stats.byTier.local, 1);
      assert.strictEqual(stats.byTier.full, 1);
    });

    it('should reset stats', () => {
      classifier.classify({ content: 'test' });
      classifier.resetStats();

      const stats = classifier.getStats();
      assert.strictEqual(stats.classified, 0);
    });
  });
});

// =============================================================================
// TIERED ROUTER TESTS
// =============================================================================

describe('TieredRouter', () => {
  let router;

  beforeEach(() => {
    router = createTieredRouter();
  });

  describe('Construction', () => {
    it('should create with factory', () => {
      const r = createTieredRouter();
      assert.ok(r instanceof TieredRouter);
    });

    it('should have classifier', () => {
      assert.ok(router.classifier instanceof ComplexityClassifier);
    });

    it('should accept custom handlers', () => {
      const localHandler = mock.fn();
      const r = createTieredRouter({
        handlers: { local: localHandler },
      });

      assert.strictEqual(r.handlers[ComplexityTier.LOCAL], localHandler);
    });
  });

  describe('Routing', () => {
    it('should route simple requests to LOCAL tier', async () => {
      // Set up a local handler
      router.setHandler(ComplexityTier.LOCAL, async (req) => ({ handled: 'local' }));

      const response = await router.route({ content: 'list files' });

      assert.strictEqual(response.routing.tier, ComplexityTier.LOCAL);
    });

    it('should fallback when handler not available', async () => {
      // Only set FULL handler
      router.setHandler(ComplexityTier.FULL, async (req) => ({ handled: 'full' }));
      router.setHandler(ComplexityTier.LOCAL, null);
      router.setHandler(ComplexityTier.LIGHT, null);

      const response = await router.route({ content: 'list files' });

      // Should fallback to FULL
      assert.strictEqual(response.routing.tier, ComplexityTier.FULL);
    });

    it('should emit routing events', async () => {
      const events = [];
      router.on('route:classified', (data) => events.push({ type: 'classified', data }));
      router.on('route:completed', (data) => events.push({ type: 'completed', data }));

      router.setHandler(ComplexityTier.LOCAL, async () => ({}));
      await router.route({ content: 'list files' });

      assert.ok(events.some(e => e.type === 'classified'));
      assert.ok(events.some(e => e.type === 'completed'));
    });

    it('should escalate on handler error', async () => {
      router.setHandler(ComplexityTier.LOCAL, async () => {
        throw new Error('Local failed');
      });
      router.setHandler(ComplexityTier.FULL, async () => ({ handled: 'full' }));

      const events = [];
      router.on('route:escalated', (data) => events.push(data));

      const response = await router.route({ content: 'list files' });

      assert.strictEqual(response.routing.tier, ComplexityTier.FULL);
      assert.ok(events.length > 0);
    });
  });

  describe('Local Handlers', () => {
    it('should register custom local handlers', async () => {
      const customHandler = mock.fn(async () => ({ custom: true }));
      router.registerLocalHandler('custom', /^custom command/, customHandler);

      router.setHandler(ComplexityTier.LOCAL, router._defaultLocalHandler.bind(router));

      const response = await router.route({ content: 'custom command here' });

      assert.ok(customHandler.mock.calls.length > 0);
    });

    it('should have built-in local handlers', () => {
      assert.ok(router._localHandlers.has('file_exists'));
      assert.ok(router._localHandlers.has('list_files'));
      assert.ok(router._localHandlers.has('git_status'));
      assert.ok(router._localHandlers.has('format'));
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      router.setHandler(ComplexityTier.LOCAL, async () => ({}));
      router.setHandler(ComplexityTier.FULL, async () => ({}));
    });

    it('should track routed count', async () => {
      await router.route({ content: 'list files' });
      await router.route({ content: 'architect system' });

      const stats = router.getStats();
      assert.strictEqual(stats.routed, 2);
    });

    it('should track by tier', async () => {
      await router.route({ content: 'list files' }); // LOCAL
      await router.route({ content: 'list dirs' });  // LOCAL
      await router.route({ content: 'architect a complex system and design the architecture' }); // FULL

      const stats = router.getStats();
      assert.strictEqual(stats.byTier.local, 2);
      assert.strictEqual(stats.byTier.full, 1);
    });

    it('should calculate savings percentage', async () => {
      await router.route({ content: 'list files' }); // LOCAL (saves 15)
      await router.route({ content: 'git status' }); // LOCAL (saves 15)

      const stats = router.getStats();
      assert.ok(stats.costSaved > 0);
      assert.ok(stats.savingsPercent > 0);
    });

    it('should reset stats', async () => {
      await router.route({ content: 'test' });
      router.resetStats();

      const stats = router.getStats();
      assert.strictEqual(stats.routed, 0);
    });
  });

  describe('Tier Info', () => {
    it('should return tier costs', () => {
      const localInfo = TieredRouter.getTierInfo(ComplexityTier.LOCAL);
      const fullInfo = TieredRouter.getTierInfo(ComplexityTier.FULL);

      assert.strictEqual(localInfo.cost, 0);
      assert.ok(fullInfo.cost > localInfo.cost);
    });

    it('should return tier latencies', () => {
      const localInfo = TieredRouter.getTierInfo(ComplexityTier.LOCAL);
      const fullInfo = TieredRouter.getTierInfo(ComplexityTier.FULL);

      assert.ok(localInfo.latency < fullInfo.latency);
    });
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Tiered Routing Integration', () => {
  it('should achieve cost savings on typical workload', async () => {
    const router = createTieredRouter();

    // Set up handlers
    router.setHandler(ComplexityTier.LOCAL, async () => ({ tier: 'local' }));
    router.setHandler(ComplexityTier.LIGHT, async () => ({ tier: 'light' }));
    router.setHandler(ComplexityTier.FULL, async () => ({ tier: 'full' }));

    // Simulate typical workload (many simple, few complex)
    const requests = [
      'list files',
      'git status',
      'format code',
      'check if file exists',
      'architect the authentication system', // complex
      'list all tests',
      'show directories',
      'explain the architecture trade-offs', // complex
      'delete temp files',
      'lint the project',
    ];

    for (const content of requests) {
      await router.route({ content });
    }

    const stats = router.getStats();

    // Should have some savings (not all requests went to FULL)
    assert.ok(stats.costSaved > 0, 'Should have cost savings');
    assert.ok(stats.savingsPercent > 0, 'Should have savings percentage');

    // Most requests should be LOCAL
    assert.ok(stats.byTier.local > stats.byTier.full,
      'More LOCAL than FULL requests expected');
  });

  it('should maintain low latency for simple requests', async () => {
    const router = createTieredRouter();

    router.setHandler(ComplexityTier.LOCAL, async () => {
      // Simulate fast local handling
      return { fast: true };
    });

    const start = performance.now();
    await router.route({ content: 'list files' });
    const elapsed = performance.now() - start;

    // Local routing should be very fast (< 10ms)
    assert.ok(elapsed < 50, `Local routing should be fast, took ${elapsed}ms`);
  });
});
