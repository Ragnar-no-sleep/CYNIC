/**
 * K-Score Protocol Tests
 *
 * "φ distrusts φ" - κυνικός
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateKScore,
  getKScoreTier,
  createKScoreRequest,
  createKScoreResult,
  validateKScoreRequest,
  isHealthyKScore,
  isExceptionalKScore,
  calculateKScoreConsensus,
  getKScoreConfidence,
  KScoreType,
  KScoreTier,
} from '../src/kscore/index.js';

describe('K-Score Protocol', () => {
  describe('calculateKScore', () => {
    it('should calculate K = 100 × ∛(D × O × L)', () => {
      // Perfect components
      const perfect = calculateKScore({ D: 1, O: 1, L: 1 });
      assert.strictEqual(perfect, 100);

      // All zeros
      const zero = calculateKScore({ D: 0, O: 0, L: 0 });
      assert.strictEqual(zero, 0);

      // 50% each
      const half = calculateKScore({ D: 0.5, O: 0.5, L: 0.5 });
      assert.ok(Math.abs(half - 50) < 0.1); // ~50

      // φ-based components
      const phi = calculateKScore({ D: 0.618, O: 0.618, L: 0.618 });
      assert.ok(phi > 61 && phi < 62);
    });

    it('should reject invalid component ranges', () => {
      assert.throws(() => calculateKScore({ D: -0.1, O: 0.5, L: 0.5 }));
      assert.throws(() => calculateKScore({ D: 1.1, O: 0.5, L: 0.5 }));
      assert.throws(() => calculateKScore({ D: 0.5, O: 2, L: 0.5 }));
    });

    it('should handle edge cases', () => {
      // Single component zero makes score 0
      assert.strictEqual(calculateKScore({ D: 0, O: 1, L: 1 }), 0);
      assert.strictEqual(calculateKScore({ D: 1, O: 0, L: 1 }), 0);
      assert.strictEqual(calculateKScore({ D: 1, O: 1, L: 0 }), 0);
    });
  });

  describe('getKScoreTier', () => {
    it('should return correct tiers', () => {
      assert.strictEqual(getKScoreTier(95).key, 'DIAMOND');
      assert.strictEqual(getKScoreTier(85).key, 'PLATINUM');
      assert.strictEqual(getKScoreTier(75).key, 'GOLD');
      assert.strictEqual(getKScoreTier(65).key, 'SILVER');
      assert.strictEqual(getKScoreTier(55).key, 'BRONZE');
      assert.strictEqual(getKScoreTier(40).key, 'IRON');
      assert.strictEqual(getKScoreTier(30).key, 'STONE');
    });

    it('should return correct verdicts', () => {
      assert.strictEqual(getKScoreTier(90).verdict, 'HOWL');
      assert.strictEqual(getKScoreTier(60).verdict, 'WAG');
      assert.strictEqual(getKScoreTier(40).verdict, 'GROWL');
      assert.strictEqual(getKScoreTier(20).verdict, 'BARK');
    });
  });

  describe('createKScoreRequest', () => {
    it('should create valid request', () => {
      const request = createKScoreRequest({
        mint: 'So11111111111111111111111111111111111111112',
        components: { D: 0.85, O: 0.72, L: 0.91 },
        requestor: 'holdex-worker-1',
      });

      assert.strictEqual(request.type, KScoreType.REQUEST);
      assert.ok(request.requestId.startsWith('ks_'));
      assert.strictEqual(request.mint, 'So11111111111111111111111111111111111111112');
      assert.ok(request.calculatedScore > 0);
      assert.ok(request.timestamp > 0);
    });

    it('should reject invalid inputs', () => {
      assert.throws(() => createKScoreRequest({ components: { D: 1, O: 1, L: 1 }, requestor: 'test' }));
      assert.throws(() => createKScoreRequest({ mint: 'test', requestor: 'test' }));
      assert.throws(() => createKScoreRequest({ mint: 'test', components: { D: 1, O: 1, L: 1 } }));
    });
  });

  describe('validateKScoreRequest', () => {
    it('should validate correct request', () => {
      const request = createKScoreRequest({
        mint: 'test-mint',
        components: { D: 0.5, O: 0.5, L: 0.5 },
        requestor: 'test',
      });

      const result = validateKScoreRequest(request);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject invalid request', () => {
      const result = validateKScoreRequest({
        type: 'WRONG_TYPE',
        mint: 'test',
        components: { D: 2, O: -1, L: 0.5 }, // Invalid ranges
        requestor: 'test',
      });

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('createKScoreResult', () => {
    it('should create valid result', () => {
      const request = createKScoreRequest({
        mint: 'test-mint',
        components: { D: 0.85, O: 0.72, L: 0.91 },
        requestor: 'test',
      });

      const result = createKScoreResult(request, {
        consensusScore: 82.5,
        validatorCount: 5,
        height: 42,
        merkleProof: 'proof_hash',
      });

      assert.strictEqual(result.type, KScoreType.RESULT);
      assert.strictEqual(result.requestId, request.requestId);
      assert.strictEqual(result.consensusScore, 82.5);
      assert.strictEqual(result.tier, 'PLATINUM');
      assert.strictEqual(result.consensus.reached, true);
    });
  });

  describe('isHealthyKScore / isExceptionalKScore', () => {
    it('should correctly categorize scores', () => {
      // φ⁻² × 100 ≈ 38.197 is the health threshold
      assert.strictEqual(isHealthyKScore(40), true);
      assert.strictEqual(isHealthyKScore(39), true);
      assert.strictEqual(isHealthyKScore(38), false); // Just below ~38.197

      // φ⁻¹ × 100 ≈ 61.803 is exceptional
      assert.strictEqual(isExceptionalKScore(65), true);
      assert.strictEqual(isExceptionalKScore(62), true);
      assert.strictEqual(isExceptionalKScore(61), false); // Just below ~61.803
    });
  });

  describe('calculateKScoreConsensus', () => {
    it('should calculate consensus from validator scores', () => {
      // Perfect agreement
      const perfect = calculateKScoreConsensus([80, 80, 80, 80, 80]);
      assert.strictEqual(perfect.mean, 80);
      assert.strictEqual(perfect.deviation, 0);
      assert.strictEqual(perfect.consensus, true);

      // Good agreement - deviation < mean * φ⁻²
      const good = calculateKScoreConsensus([78, 80, 82, 79, 81]);
      assert.ok(Math.abs(good.mean - 80) < 0.5);
      assert.ok(good.deviation < 2);
      assert.strictEqual(good.consensus, true);

      // Moderate agreement - still within φ⁻² threshold
      // Mean=70, threshold=70*0.382=26.74, deviation≈14.14 < 26.74
      const moderate = calculateKScoreConsensus([50, 60, 70, 80, 90]);
      assert.strictEqual(moderate.mean, 70);
      assert.ok(moderate.deviation > 10 && moderate.deviation < 20);
      assert.strictEqual(moderate.consensus, true); // Still passes φ⁻² threshold

      // Poor agreement - deviation > mean * φ⁻² (38.2%)
      // Mean=70, need deviation > 26.74
      // Use [20, 50, 70, 90, 120]: deviation ≈ 34 > 26.74
      const poor = calculateKScoreConsensus([20, 50, 70, 90, 120]);
      assert.strictEqual(poor.mean, 70);
      assert.ok(poor.deviation > 30);
      assert.strictEqual(poor.consensus, false);
    });

    it('should handle empty array', () => {
      const empty = calculateKScoreConsensus([]);
      assert.strictEqual(empty.mean, 0);
      assert.strictEqual(empty.consensus, false);
    });
  });

  describe('getKScoreConfidence', () => {
    it('should cap confidence at φ⁻¹', () => {
      // Perfect agreement should still be capped
      assert.ok(getKScoreConfidence(1.0) <= 0.618033988749895);
      assert.ok(getKScoreConfidence(0.95) <= 0.618033988749895);

      // Low agreement passes through
      assert.ok(getKScoreConfidence(0.5) < 0.618);
    });
  });

  describe('K-Score Tiers', () => {
    it('should have correct tier definitions', () => {
      assert.strictEqual(KScoreTier.DIAMOND.min, 90);
      assert.strictEqual(KScoreTier.PLATINUM.min, 80);
      assert.strictEqual(KScoreTier.GOLD.min, 70);
      assert.strictEqual(KScoreTier.SILVER.min, 60);
      assert.strictEqual(KScoreTier.BRONZE.min, 50);
      assert.strictEqual(KScoreTier.IRON.min, 38.2);
      assert.strictEqual(KScoreTier.STONE.min, 0);
    });
  });
});
