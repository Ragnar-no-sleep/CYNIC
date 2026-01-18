/**
 * @cynic/gasdf - Test Suite
 *
 * Tests for GASdf integration package.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  // Client
  GASdfClient,
  createGASdfClient,
  FEE_CONSTANTS,

  // Integration
  calculateFeeWithDiscount,
  validateFeeDistribution,
  createBurnRecord,
  generateTransactionReport,
} from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Fee Constants Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('FEE_CONSTANTS', () => {
  it('should have φ-aligned burn rate (1 - φ⁻³ ≈ 76.4%)', () => {
    assert.ok(Math.abs(FEE_CONSTANTS.BURN_RATE - 0.764) < 0.001);
  });

  it('should have φ-aligned treasury rate (φ⁻³ ≈ 23.6%)', () => {
    assert.ok(Math.abs(FEE_CONSTANTS.TREASURY_RATE - 0.236) < 0.001);
  });

  it('should have rates that sum to 1', () => {
    const sum = FEE_CONSTANTS.BURN_RATE + FEE_CONSTANTS.TREASURY_RATE;
    assert.ok(Math.abs(sum - 1) < 1e-10);
  });

  it('should have max discount of 95%', () => {
    assert.equal(FEE_CONSTANTS.MAX_DISCOUNT, 0.95);
  });

  it('should have max ecosystem burn at φ⁻² ≈ 38.2%', () => {
    assert.ok(Math.abs(FEE_CONSTANTS.MAX_ECOSYSTEM_BURN - 0.382) < 0.001);
  });

  it('should be frozen', () => {
    assert.ok(Object.isFrozen(FEE_CONSTANTS));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Client Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('GASdfClient', () => {
  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new GASdfClient();
      assert.ok(client);
      assert.equal(client.stats.quotes, 0);
      assert.equal(client.stats.submissions, 0);
      assert.equal(client.stats.errors, 0);
    });

    it('should accept custom config', () => {
      const client = new GASdfClient({
        endpoint: 'https://custom.gasdf.api',
        timeout: 5000,
      });
      assert.equal(client.config.endpoint, 'https://custom.gasdf.api');
      assert.equal(client.config.timeout, 5000);
    });

    it('should have default timeout of 30000ms', () => {
      const client = new GASdfClient();
      assert.equal(client.config.timeout, 30000);
    });

    it('should have default retries of 3', () => {
      const client = new GASdfClient();
      assert.equal(client.config.retries, 3);
    });
  });

  describe('createGASdfClient', () => {
    it('should create client instance', () => {
      const client = createGASdfClient();
      assert.ok(client instanceof GASdfClient);
    });

    it('should pass options to constructor', () => {
      const client = createGASdfClient({ timeout: 10000 });
      assert.equal(client.config.timeout, 10000);
    });
  });

  describe('getClientStats', () => {
    it('should return stats', () => {
      const client = new GASdfClient();
      const stats = client.getClientStats();

      assert.equal(stats.quotes, 0);
      assert.equal(stats.submissions, 0);
      assert.equal(stats.errors, 0);
      assert.equal(stats.totalBurned, '0');
      assert.equal(stats.successRate, 1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fee Calculation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateFeeWithDiscount', () => {
  it('should return full fee with no E-Score', () => {
    const result = calculateFeeWithDiscount(1000, 0);
    assert.equal(result.baseFee, 1000);
    assert.equal(result.discount, 0);
    assert.equal(result.discountedFee, 1000);
  });

  it('should apply discount for positive E-Score', () => {
    const result = calculateFeeWithDiscount(1000, 50);
    assert.equal(result.baseFee, 1000);
    assert.ok(result.discount > 0);
    assert.ok(result.discountedFee < 1000);
  });

  it('should split fee into burn and treasury', () => {
    const result = calculateFeeWithDiscount(1000, 0);
    assert.equal(result.burn + result.treasury, result.discountedFee);
  });

  it('should follow φ ratios for split', () => {
    const result = calculateFeeWithDiscount(1000, 0);
    const burnRatio = result.burn / result.discountedFee;
    const treasuryRatio = result.treasury / result.discountedFee;

    // Allow for rounding
    assert.ok(Math.abs(burnRatio - FEE_CONSTANTS.BURN_RATE) < 0.01);
    assert.ok(Math.abs(treasuryRatio - FEE_CONSTANTS.TREASURY_RATE) < 0.01);
  });

  it('should calculate savings correctly', () => {
    const result = calculateFeeWithDiscount(1000, 50);
    assert.equal(result.savings, result.baseFee - result.discountedFee);
  });

  it('should handle null E-Score as 0', () => {
    const result = calculateFeeWithDiscount(1000, null);
    assert.equal(result.discount, 0);
  });

  it('should increase discount with higher E-Score', () => {
    const low = calculateFeeWithDiscount(1000, 25);
    const high = calculateFeeWithDiscount(1000, 75);
    assert.ok(high.discount > low.discount);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fee Validation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateFeeDistribution', () => {
  it('should validate correct distribution', () => {
    // 764 + 236 = 1000, matching φ ratios
    const result = validateFeeDistribution(1000, 764, 236);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('should reject mismatched sum', () => {
    const result = validateFeeDistribution(1000, 700, 200);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Sum mismatch')));
  });

  it('should reject wrong burn ratio', () => {
    // 50/50 split instead of φ
    const result = validateFeeDistribution(1000, 500, 500);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Burn rate')));
  });

  it('should return actual ratios', () => {
    const result = validateFeeDistribution(1000, 764, 236);
    assert.ok(result.ratios.burn > 0);
    assert.ok(result.ratios.treasury > 0);
    assert.equal(result.ratios.expected.burn, FEE_CONSTANTS.BURN_RATE);
    assert.equal(result.ratios.expected.treasury, FEE_CONSTANTS.TREASURY_RATE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Burn Record Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('createBurnRecord', () => {
  it('should create burn record with required fields', () => {
    const record = createBurnRecord({
      signature: 'abc123',
      amount: 1000,
      token: 'mint123',
    });

    assert.equal(record.type, 'burn');
    assert.equal(record.source, 'gasdf');
    assert.ok(record.timestamp > 0);
    assert.equal(record.data.signature, 'abc123');
    assert.equal(record.data.amount, '1000');
    assert.equal(record.data.token, 'mint123');
  });

  it('should include user if provided', () => {
    const record = createBurnRecord({
      signature: 'abc123',
      amount: 1000,
      token: 'mint123',
      user: 'user456',
    });

    assert.equal(record.data.user, 'user456');
  });

  it('should generate hash for POJ', () => {
    const record = createBurnRecord({
      signature: 'abc123',
      amount: 1000,
      token: 'mint123',
    });

    assert.ok(record.hash.includes('burn:'));
    assert.ok(record.hash.includes('abc123'));
    assert.ok(record.hash.includes('1000'));
  });

  it('should start unverified', () => {
    const record = createBurnRecord({
      signature: 'abc123',
      amount: 1000,
      token: 'mint123',
    });

    assert.equal(record.verified, false);
  });

  it('should convert BigInt amount to string', () => {
    const record = createBurnRecord({
      signature: 'abc123',
      amount: BigInt(1000000000),
      token: 'mint123',
    });

    assert.equal(record.data.amount, '1000000000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Report Generation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateTransactionReport', () => {
  it('should generate success report', () => {
    const result = {
      success: true,
      signature: 'sig123',
      slot: 12345,
      confirmations: 32,
      burn: {
        amount: '1000',
        signature: 'burn456',
        verified: true,
      },
    };

    const prepared = {
      feeAmount: 500,
      discount: 0.382,
      tier: 'GOLD',
    };

    const report = generateTransactionReport(result, prepared);

    assert.ok(report.includes('✅'));
    assert.ok(report.includes('sig123'));
    assert.ok(report.includes('12345'));
    assert.ok(report.includes('1000'));
    assert.ok(report.includes('burn456'));
    assert.ok(report.includes('GOLD'));
  });

  it('should generate failure report', () => {
    const result = {
      success: false,
      error: 'Insufficient funds',
    };

    const report = generateTransactionReport(result);

    assert.ok(report.includes('❌'));
    assert.ok(report.includes('Failed'));
    assert.ok(report.includes('Insufficient funds'));
  });

  it('should handle missing optional fields', () => {
    const result = {
      success: true,
      signature: 'sig123',
      slot: 12345,
      burn: {},
    };

    const report = generateTransactionReport(result);

    assert.ok(report.includes('N/A'));
    assert.ok(report.includes('sig123'));
  });

  it('should include φ wisdom', () => {
    const result = {
      success: true,
      signature: 'sig123',
      slot: 12345,
      burn: { verified: true },
    };

    const report = generateTransactionReport(result);
    assert.ok(report.includes('φ'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// φ Relationship Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('φ Relationships', () => {
  const PHI = 1.618033988749895;
  const PHI_INV = 0.618033988749895;

  it('should have burn rate = 1 - φ⁻³', () => {
    const PHI_INV_CUBED = Math.pow(PHI_INV, 3);
    const expected = 1 - PHI_INV_CUBED;
    assert.ok(Math.abs(FEE_CONSTANTS.BURN_RATE - expected) < 1e-10);
  });

  it('should have treasury rate = φ⁻³', () => {
    const PHI_INV_CUBED = Math.pow(PHI_INV, 3);
    assert.ok(Math.abs(FEE_CONSTANTS.TREASURY_RATE - PHI_INV_CUBED) < 1e-10);
  });

  it('should have max ecosystem burn = φ⁻²', () => {
    const PHI_INV_SQ = Math.pow(PHI_INV, 2);
    assert.ok(Math.abs(FEE_CONSTANTS.MAX_ECOSYSTEM_BURN - PHI_INV_SQ) < 1e-10);
  });
});
