/**
 * E-Score Provider Deep Tests
 *
 * Tests the bridge between globalEventBus events and EScore7DCalculator.
 *
 * "Trust the score, but verify the calculation" - κυνικός
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { globalEventBus, EventType } from '@cynic/core';
import { createEScoreProvider } from '../src/network/escore-provider.js';

const SELF_KEY = 'abc123selfpublickey';
const OTHER_KEY = 'xyz789otherpublickey';

describe('EScore Provider', () => {
  let esp;

  beforeEach(() => {
    esp = createEScoreProvider({ selfPublicKey: SELF_KEY });
  });

  afterEach(() => {
    esp?.destroy();
    esp = null;
  });

  // ═══════════════════════════════════════════════════════════
  // Construction & Shape
  // ═══════════════════════════════════════════════════════════

  describe('Construction', () => {
    it('returns provider, calculator, destroy', () => {
      assert.equal(typeof esp.provider, 'function');
      assert.ok(esp.calculator);
      assert.equal(typeof esp.destroy, 'function');
    });

    it('calculator is an EScore7DCalculator instance', () => {
      assert.equal(typeof esp.calculator.calculate, 'function');
      assert.equal(typeof esp.calculator.recordJudgment, 'function');
      assert.equal(typeof esp.calculator.recordBlock, 'function');
      assert.equal(typeof esp.calculator.recordBurn, 'function');
      assert.equal(typeof esp.calculator.heartbeat, 'function');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Provider Function
  // ═══════════════════════════════════════════════════════════

  describe('Provider function', () => {
    it('returns score for self public key', () => {
      const score = esp.provider(SELF_KEY);
      assert.equal(typeof score, 'number');
      assert.ok(score >= 0 && score <= 100, `Score should be 0-100, got ${score}`);
    });

    it('returns null for other public keys', () => {
      const score = esp.provider(OTHER_KEY);
      assert.equal(score, null);
    });

    it('returns null for empty string', () => {
      assert.equal(esp.provider(''), null);
    });

    it('score changes after feeding events', () => {
      const before = esp.provider(SELF_KEY);

      // Feed judgments directly (bypass event bus for determinism)
      for (let i = 0; i < 50; i++) {
        esp.calculator.recordJudgment(true);
      }
      esp.calculator._invalidateCache();

      const after = esp.provider(SELF_KEY);
      assert.ok(after >= before, `Score should increase after judgments: ${before} -> ${after}`);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Event Bus → Calculator Wiring
  // ═══════════════════════════════════════════════════════════

  describe('JUDGMENT_CREATED wiring', () => {
    it('recordJudgment called on judgment:created', () => {
      const beforeJudgments = esp.calculator.totalJudgments;

      globalEventBus.publish(EventType.JUDGMENT_CREATED, {
        matchedConsensus: true,
      });

      assert.equal(esp.calculator.totalJudgments, beforeJudgments + 1);
      assert.equal(esp.calculator.agreementCount, 1);
    });

    it('disagreement tracked correctly', () => {
      globalEventBus.publish(EventType.JUDGMENT_CREATED, {
        matchedConsensus: false,
      });

      assert.equal(esp.calculator.totalJudgments, 1);
      assert.equal(esp.calculator.agreementCount, 0);
    });

    it('handles missing matchedConsensus field', () => {
      globalEventBus.publish(EventType.JUDGMENT_CREATED, {});

      assert.equal(esp.calculator.totalJudgments, 1);
      // Should default to false
      assert.equal(esp.calculator.agreementCount, 0);
    });

    it('fallback to consensus field', () => {
      globalEventBus.publish(EventType.JUDGMENT_CREATED, {
        consensus: true,
      });

      assert.equal(esp.calculator.totalJudgments, 1);
      assert.equal(esp.calculator.agreementCount, 1);
    });
  });

  describe('BLOCK_FINALIZED wiring', () => {
    it('recordBlock called on block:finalized', () => {
      const beforeBlocks = esp.calculator.blocksProcessed;

      globalEventBus.publish(EventType.BLOCK_FINALIZED, {
        slot: 42,
        hash: 'abc',
      });

      assert.equal(esp.calculator.blocksProcessed, beforeBlocks + 1);
    });

    it('heartbeat triggered on block:finalized', () => {
      const beforeHeartbeat = esp.calculator.lastHeartbeat;

      // Small delay to ensure timestamp difference
      const start = Date.now();
      globalEventBus.publish(EventType.BLOCK_FINALIZED, {});

      assert.ok(esp.calculator.lastHeartbeat >= start);
    });
  });

  describe('BLOCK_PROPOSED wiring', () => {
    it('heartbeat triggered on block:proposed', () => {
      const start = Date.now();
      globalEventBus.publish(EventType.BLOCK_PROPOSED, {});
      assert.ok(esp.calculator.lastHeartbeat >= start);
    });
  });

  describe('METRICS_REPORTED wiring', () => {
    it('heartbeat triggered on metrics:reported', () => {
      const start = Date.now();
      globalEventBus.publish(EventType.METRICS_REPORTED, {});
      assert.ok(esp.calculator.lastHeartbeat >= start);
    });
  });

  describe('DOG_EVENT wiring', () => {
    it('burn recorded from dog event', () => {
      const beforeBurned = esp.calculator.totalBurned;

      globalEventBus.publish(EventType.DOG_EVENT, {
        dog: 'Janitor',
        action: 'burn',
        data: { amount: 1000, txSignature: 'tx123' },
      });

      assert.equal(esp.calculator.totalBurned, beforeBurned + 1000);
    });

    it('architect deploy tracked as commit', () => {
      const beforeCommits = esp.calculator.commits;

      globalEventBus.publish(EventType.DOG_EVENT, {
        dog: 'Architect',
        action: 'deploy',
      });

      assert.equal(esp.calculator.commits, beforeCommits + 1);
    });

    it('deployer build tracked as commit', () => {
      const beforeCommits = esp.calculator.commits;

      globalEventBus.publish(EventType.DOG_EVENT, {
        dog: 'Deployer',
        action: 'build',
      });

      assert.equal(esp.calculator.commits, beforeCommits + 1);
    });

    it('non-burn dog event does not burn', () => {
      const beforeBurned = esp.calculator.totalBurned;

      globalEventBus.publish(EventType.DOG_EVENT, {
        dog: 'Scout',
        action: 'scan',
        data: { result: 'ok' },
      });

      assert.equal(esp.calculator.totalBurned, beforeBurned);
    });
  });

  describe('TOOL_COMPLETED wiring', () => {
    it('commit tool tracked as build', () => {
      const beforeCommits = esp.calculator.commits;

      globalEventBus.publish(EventType.TOOL_COMPLETED, {
        tool: 'Bash',
        result: 'git commit -m "test"',
      });

      assert.equal(esp.calculator.commits, beforeCommits + 1);
    });

    it('non-commit bash not tracked', () => {
      const beforeCommits = esp.calculator.commits;

      globalEventBus.publish(EventType.TOOL_COMPLETED, {
        tool: 'Bash',
        result: 'ls -la',
      });

      assert.equal(esp.calculator.commits, beforeCommits);
    });

    it('non-bash tool not tracked', () => {
      const beforeCommits = esp.calculator.commits;

      globalEventBus.publish(EventType.TOOL_COMPLETED, {
        tool: 'Read',
        result: 'commit message found',
      });

      assert.equal(esp.calculator.commits, beforeCommits);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Stubbed Dimensions (Phase 3)
  // ═══════════════════════════════════════════════════════════

  describe('Phase 3 stubs', () => {
    it('social score starts at 0', () => {
      assert.equal(esp.calculator.socialQualityScore, 0);
      assert.equal(esp.calculator.socialContentCount, 0);
    });

    it('graph position starts at default', () => {
      assert.equal(esp.calculator.trustReceived, 0);
      assert.equal(esp.calculator.transitiveScore, 0);
    });

    it('holdings start at 0', () => {
      assert.equal(esp.calculator.holdings, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Destroy / Cleanup
  // ═══════════════════════════════════════════════════════════

  describe('Destroy', () => {
    it('destroy unsubscribes all events', () => {
      esp.destroy();

      // After destroy, events should NOT reach the calculator
      const beforeJudgments = esp.calculator.totalJudgments;

      globalEventBus.publish(EventType.JUDGMENT_CREATED, {
        matchedConsensus: true,
      });

      assert.equal(esp.calculator.totalJudgments, beforeJudgments,
        'Should not receive events after destroy');
    });

    it('destroy is safe to call twice', () => {
      esp.destroy();
      esp.destroy(); // Should not throw
    });
  });

  // ═══════════════════════════════════════════════════════════
  // φ-Alignment
  // ═══════════════════════════════════════════════════════════

  describe('φ-Alignment', () => {
    it('score never exceeds 100', () => {
      // Pump massive data
      for (let i = 0; i < 1000; i++) {
        esp.calculator.recordJudgment(true);
        esp.calculator.recordBlock();
        esp.calculator.recordBurn(1e9);
        esp.calculator.recordCommit();
      }
      esp.calculator._invalidateCache();

      const score = esp.provider(SELF_KEY);
      assert.ok(score <= 100, `Score should be <= 100, got ${score}`);
    });

    it('initial score is low (no activity)', () => {
      const score = esp.provider(SELF_KEY);
      // Fresh calculator, only RUN/uptime contributes
      assert.ok(score < 50, `Initial score should be < 50, got ${score}`);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Integration
  // ═══════════════════════════════════════════════════════════

  describe('Integration', () => {
    it('multiple event types aggregate correctly', () => {
      // Simulate realistic activity
      for (let i = 0; i < 10; i++) {
        globalEventBus.publish(EventType.JUDGMENT_CREATED, { matchedConsensus: true });
      }
      for (let i = 0; i < 5; i++) {
        globalEventBus.publish(EventType.BLOCK_FINALIZED, { slot: i });
      }
      globalEventBus.publish(EventType.DOG_EVENT, {
        dog: 'Janitor',
        action: 'burn',
        data: { amount: 500 },
      });
      globalEventBus.publish(EventType.TOOL_COMPLETED, {
        tool: 'Bash',
        result: 'git commit -m "feat: test"',
      });

      assert.equal(esp.calculator.totalJudgments, 10);
      assert.equal(esp.calculator.agreementCount, 10);
      assert.equal(esp.calculator.blocksProcessed, 5);
      assert.equal(esp.calculator.totalBurned, 500);
      assert.equal(esp.calculator.commits, 1);

      const score = esp.provider(SELF_KEY);
      assert.equal(typeof score, 'number');
      assert.ok(score > 0, 'Should have positive score after activity');
    });

    it('calculator export contains all dimensions', () => {
      const state = esp.calculator.export();
      assert.ok('totalBurned' in state, 'BURN dimension');
      assert.ok('commits' in state, 'BUILD dimension');
      assert.ok('totalJudgments' in state, 'JUDGE dimension');
      assert.ok('blocksProcessed' in state, 'RUN dimension');
      assert.ok('socialQualityScore' in state, 'SOCIAL dimension (stub)');
      assert.ok('trustReceived' in state, 'GRAPH dimension (stub)');
      assert.ok('holdings' in state, 'HOLD dimension (stub)');
    });
  });
});
