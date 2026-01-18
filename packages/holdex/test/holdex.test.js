/**
 * @cynic/holdex - Test Suite
 *
 * Tests for HolDex integration package.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  // Harmony
  PHI_POWERS,
  K_SCORE,
  K_SCORE_TIERS,
  E_SCORE_MULTIPLIERS,
  E_SCORE_TIERS,
  FEE_RATIOS,
  REWARD_SPLITS,
  calculateKScore,
  getKScoreTier,
  isHealthyKScore,
  isExceptionalKScore,
  calculateEScoreDiscount,
  getEScoreTier,
  distributeFee,

  // Client
  HolDexClient,
  createHolDexClient,

  // Integration
  calculateFinalScore,
  validateKScoreComponents,
  generateTokenReport,
} from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Harmony Constants Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('PHI_POWERS', () => {
  it('should have correct φ relationships', () => {
    const PHI = 1.618033988749895;

    // φ² = φ + 1
    assert.ok(Math.abs(PHI_POWERS.PHI_SQ - (PHI + 1)) < 1e-10);

    // φ⁻¹ = φ - 1
    assert.ok(Math.abs(PHI_POWERS.PHI_INV - (PHI - 1)) < 1e-10);

    // φ × φ⁻¹ = 1
    assert.ok(Math.abs(PHI * PHI_POWERS.PHI_INV - 1) < 1e-10);
  });

  it('should be frozen', () => {
    assert.ok(Object.isFrozen(PHI_POWERS));
  });
});

describe('K_SCORE', () => {
  it('should have valid thresholds', () => {
    assert.equal(K_SCORE.MAX, 100);
    assert.equal(K_SCORE.MIN, 0);
    assert.ok(K_SCORE.THRESHOLDS.EXCEPTIONAL > K_SCORE.THRESHOLDS.HEALTHY);
    assert.ok(K_SCORE.THRESHOLDS.HEALTHY > K_SCORE.THRESHOLDS.WARNING);
  });

  it('should have φ-aligned thresholds', () => {
    // EXCEPTIONAL = φ⁻¹ * 100 ≈ 61.8
    assert.ok(Math.abs(K_SCORE.THRESHOLDS.EXCEPTIONAL - 61.8) < 0.1);
    // HEALTHY = φ⁻² * 100 ≈ 38.2
    assert.ok(Math.abs(K_SCORE.THRESHOLDS.HEALTHY - 38.2) < 0.1);
  });
});

describe('K_SCORE_TIERS', () => {
  it('should have tiers in descending order', () => {
    for (let i = 0; i < K_SCORE_TIERS.length - 1; i++) {
      assert.ok(K_SCORE_TIERS[i].minScore > K_SCORE_TIERS[i + 1].minScore);
    }
  });

  it('should map to CYNIC verdicts', () => {
    const verdicts = new Set(K_SCORE_TIERS.map(t => t.verdict));
    assert.ok(verdicts.has('HOWL'));
    assert.ok(verdicts.has('WAG'));
    assert.ok(verdicts.has('GROWL'));
    assert.ok(verdicts.has('BARK'));
  });
});

describe('FEE_RATIOS', () => {
  it('should sum to approximately 1', () => {
    const sum = FEE_RATIOS.BURN + FEE_RATIOS.REWARDS + FEE_RATIOS.TREASURY;
    assert.ok(Math.abs(sum - 1) < 1e-10);
  });
});

describe('REWARD_SPLITS', () => {
  it('should sum to approximately 1', () => {
    const sum = REWARD_SPLITS.NODES + REWARD_SPLITS.USERS + REWARD_SPLITS.DEVS;
    assert.ok(Math.abs(sum - 1) < 1e-10);
  });

  it('should have nodes as largest share', () => {
    assert.ok(REWARD_SPLITS.NODES > REWARD_SPLITS.USERS);
    assert.ok(REWARD_SPLITS.NODES > REWARD_SPLITS.DEVS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// K-Score Function Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateKScore', () => {
  it('should calculate K-Score from components', () => {
    // K = 100 × ∛(D × O × L)
    // D=1, O=1, L=1 → K = 100
    assert.equal(calculateKScore(1, 1, 1), 100);

    // D=0.5, O=0.5, L=0.5 → K = 100 × ∛(0.125) = 50
    assert.equal(calculateKScore(0.5, 0.5, 0.5), 50);
  });

  it('should handle edge cases', () => {
    // All zeros (with epsilon)
    const zeroScore = calculateKScore(0, 0, 0);
    assert.ok(zeroScore < 10);

    // All ones
    assert.equal(calculateKScore(1, 1, 1), 100);
  });

  it('should clamp inputs to 0-1', () => {
    // Negative values
    const negScore = calculateKScore(-0.5, 0.5, 0.5);
    assert.ok(negScore >= 0);

    // Values > 1
    const highScore = calculateKScore(1.5, 1, 1);
    assert.ok(highScore <= 100);
  });
});

describe('getKScoreTier', () => {
  it('should return DIAMOND for score >= 90', () => {
    const tier = getKScoreTier(95);
    assert.equal(tier.name, 'DIAMOND');
    assert.equal(tier.verdict, 'HOWL');
  });

  it('should return PLATINUM for score >= 80', () => {
    const tier = getKScoreTier(85);
    assert.equal(tier.name, 'PLATINUM');
    assert.equal(tier.verdict, 'HOWL');
  });

  it('should return GOLD for score >= 70', () => {
    const tier = getKScoreTier(75);
    assert.equal(tier.name, 'GOLD');
    assert.equal(tier.verdict, 'WAG');
  });

  it('should return STONE for lowest scores', () => {
    const tier = getKScoreTier(10);
    assert.equal(tier.name, 'STONE');
    assert.equal(tier.verdict, 'BARK');
  });
});

describe('isHealthyKScore', () => {
  it('should return true for healthy scores', () => {
    assert.equal(isHealthyKScore(50), true);
    assert.equal(isHealthyKScore(75), true);
  });

  it('should return false for unhealthy scores', () => {
    assert.equal(isHealthyKScore(30), false);
    assert.equal(isHealthyKScore(20), false);
  });
});

describe('isExceptionalKScore', () => {
  it('should return true for exceptional scores', () => {
    assert.equal(isExceptionalKScore(70), true);
    assert.equal(isExceptionalKScore(90), true);
  });

  it('should return false for non-exceptional scores', () => {
    assert.equal(isExceptionalKScore(50), false);
    assert.equal(isExceptionalKScore(30), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E-Score Function Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateEScoreDiscount', () => {
  it('should return 0 for zero E-Score', () => {
    assert.equal(calculateEScoreDiscount(0), 0);
    assert.equal(calculateEScoreDiscount(null), 0);
  });

  it('should increase with E-Score', () => {
    const d25 = calculateEScoreDiscount(25);
    const d50 = calculateEScoreDiscount(50);
    const d75 = calculateEScoreDiscount(75);

    assert.ok(d50 > d25);
    assert.ok(d75 > d50);
  });

  it('should follow φ curve', () => {
    // At E = 25, discount ≈ 38.2%
    const d25 = calculateEScoreDiscount(25);
    assert.ok(Math.abs(d25 - 0.382) < 0.01);

    // At E = 50, discount ≈ 61.8%
    const d50 = calculateEScoreDiscount(50);
    assert.ok(Math.abs(d50 - 0.618) < 0.01);
  });
});

describe('getEScoreTier', () => {
  it('should return Observer for 0', () => {
    const tier = getEScoreTier(0);
    assert.equal(tier.name, 'Observer');
  });

  it('should return Ecosystem for high scores', () => {
    const tier = getEScoreTier(80);
    assert.equal(tier.name, 'Ecosystem');
  });

  it('should progress through tiers', () => {
    assert.equal(getEScoreTier(2).name, 'Sprout');
    assert.equal(getEScoreTier(10).name, 'Sapling');
    assert.equal(getEScoreTier(40).name, 'Grove');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fee Distribution Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('distributeFee', () => {
  it('should distribute fee correctly', () => {
    const result = distributeFee(1000);

    assert.equal(result.total, 1000);
    assert.ok(result.burn > 0);
    assert.ok(result.rewards > 0);
    assert.ok(result.treasury > 0);

    // Sum should equal total
    assert.equal(result.burn + result.rewards + result.treasury, 1000);
  });

  it('should follow φ ratios approximately', () => {
    const result = distributeFee(1000);

    // Burn ≈ 38.2%
    assert.ok(Math.abs(result.burn - 382) < 5);

    // Rewards ≈ 38.2%
    assert.ok(Math.abs(result.rewards - 382) < 5);

    // Treasury ≈ 23.6%
    assert.ok(Math.abs(result.treasury - 236) < 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Client Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('HolDexClient', () => {
  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new HolDexClient();
      assert.ok(client);
      assert.equal(client.stats.requests, 0);
    });

    it('should accept custom config', () => {
      const client = new HolDexClient({
        endpoint: 'https://custom.api',
        timeout: 5000,
      });
      assert.equal(client.config.endpoint, 'https://custom.api');
      assert.equal(client.config.timeout, 5000);
    });
  });

  describe('createHolDexClient', () => {
    it('should create client instance', () => {
      const client = createHolDexClient();
      assert.ok(client instanceof HolDexClient);
    });
  });

  describe('getStats', () => {
    it('should return stats', () => {
      const client = new HolDexClient();
      const stats = client.getStats();

      assert.equal(stats.requests, 0);
      assert.equal(stats.cacheHits, 0);
      assert.equal(stats.cacheSize, 0);
    });
  });

  describe('clearCache', () => {
    it('should clear cache', () => {
      const client = new HolDexClient();
      client.cache.set('test', { data: 'value', timestamp: Date.now() });
      assert.equal(client.cache.size, 1);

      client.clearCache();
      assert.equal(client.cache.size, 0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Integration Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateFinalScore', () => {
  it('should calculate Final from K and Q scores', () => {
    const result = calculateFinalScore(80, 80);

    assert.ok(result.Final > 0);
    assert.ok(result.Final <= 100);
    assert.equal(result.kScore, 80);
    assert.equal(result.qScore, 80);
  });

  it('should determine verdict based on Final', () => {
    const highResult = calculateFinalScore(90, 90);
    assert.equal(highResult.verdict, 'HOWL');

    // K=20, Q=20 → Final ≈ 30 → BARK
    const lowResult = calculateFinalScore(20, 20);
    assert.equal(lowResult.verdict, 'BARK');
  });

  it('should identify limiting factor', () => {
    // K much lower than Q
    const kLimited = calculateFinalScore(40, 80);
    assert.equal(kLimited.limiting, 'kScore');

    // Q much lower than K
    const qLimited = calculateFinalScore(80, 40);
    assert.equal(qLimited.limiting, 'qScore');

    // Balanced
    const balanced = calculateFinalScore(70, 70);
    assert.equal(balanced.limiting, 'balanced');
  });
});

describe('validateKScoreComponents', () => {
  it('should validate correct components', () => {
    const result = validateKScoreComponents({ D: 0.8, O: 0.7, L: 0.9 });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('should reject missing components', () => {
    const result = validateKScoreComponents({ D: 0.8 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('should reject out-of-range values', () => {
    const result = validateKScoreComponents({ D: 1.5, O: -0.1, L: 0.5 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('D')));
    assert.ok(result.errors.some(e => e.includes('O')));
  });

  it('should reject non-object input', () => {
    const result = validateKScoreComponents(null);
    assert.equal(result.valid, false);
  });
});

describe('generateTokenReport', () => {
  it('should generate report for available token', () => {
    const analysis = {
      available: true,
      token: { name: 'Test Token', symbol: 'TEST', holders: 1000 },
      kScore: {
        score: 75,
        components: { D: 0.8, O: 0.7, L: 0.85 },
        tier: 'GOLD',
        verdict: 'WAG',
        healthy: true,
      },
      confidence: 0.618,
    };

    const report = generateTokenReport(analysis);

    assert.ok(report.includes('TEST'));
    assert.ok(report.includes('75'));
    assert.ok(report.includes('GOLD'));
    assert.ok(report.includes('WAG'));
    assert.ok(report.includes('Healthy'));
  });

  it('should handle unavailable token', () => {
    const analysis = {
      mint: 'abc123',
      available: false,
      error: 'Token not found',
    };

    const report = generateTokenReport(analysis);

    assert.ok(report.includes('abc123'));
    assert.ok(report.includes('not available'));
    assert.ok(report.includes('Token not found'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E-Score Multipliers Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('E_SCORE_MULTIPLIERS', () => {
  it('should have BUILD and RUN as highest', () => {
    const maxMultiplier = Math.max(...Object.values(E_SCORE_MULTIPLIERS));
    assert.equal(E_SCORE_MULTIPLIERS.BUILD, maxMultiplier);
    assert.equal(E_SCORE_MULTIPLIERS.RUN, maxMultiplier);
  });

  it('should have BURN and REFER with φ multiplier', () => {
    const PHI = 1.618033988749895;
    assert.ok(Math.abs(E_SCORE_MULTIPLIERS.BURN - PHI) < 0.001);
    assert.ok(Math.abs(E_SCORE_MULTIPLIERS.REFER - PHI) < 0.001);
  });
});
