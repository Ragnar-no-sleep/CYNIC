/**
 * @cynic/burns Tests
 *
 * "Onchain is truth - burns must be verified" - κυνικός
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

import {
  BurnVerifier,
  createBurnVerifier,
  BurnStatus,
  DEFAULT_CONFIG,
} from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════

// Valid base58 signature for testing
const VALID_SIG = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d5HZPF9pY8eKXGQz5uJQVKJVR6DQi';
const INVALID_SIG = 'not-valid-base58!@#$';

// Mock API response
const mockBurnResponse = {
  verified: true,
  amount: 1000000000, // 1 token in lamports
  token: 'TokenMint123',
  burner: 'BurnerAddress123',
  timestamp: Date.now(),
  slot: 123456789,
};

// ═══════════════════════════════════════════════════════════════════════════
// BurnVerifier Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/burns - BurnVerifier', () => {
  let verifier;
  let originalFetch;

  beforeEach(() => {
    verifier = createBurnVerifier({
      cacheEnabled: true,
      cacheTtl: 60000, // 1 minute for tests
    });

    // Store original fetch
    originalFetch = globalThis.fetch;

    // Mock fetch
    globalThis.fetch = mock.fn(async (url) => {
      // Simulate API delay
      await new Promise((r) => setTimeout(r, 10));

      // Check if it's a 404 case (signature ends with 'notfound')
      if (url.includes('notfound')) {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        };
      }

      // Check if it's an error case
      if (url.includes('error')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        };
      }

      return {
        ok: true,
        json: async () => mockBurnResponse,
      };
    });
  });

  // Restore fetch after tests
  // Note: In real tests, use afterEach, but keeping simple for now

  describe('Creation', () => {
    it('should create verifier with default config', () => {
      assert.ok(verifier instanceof BurnVerifier);
      assert.strictEqual(verifier.apiUrl, DEFAULT_CONFIG.apiUrl);
    });

    it('should accept custom API URL', () => {
      const custom = createBurnVerifier({ apiUrl: 'http://localhost:3000' });
      assert.strictEqual(custom.apiUrl, 'http://localhost:3000');
    });

    it('should have caching enabled by default', () => {
      const v = createBurnVerifier();
      assert.strictEqual(v.cacheEnabled, true);
    });
  });

  describe('Signature Validation', () => {
    it('should reject invalid signature format', async () => {
      const result = await verifier.verify(INVALID_SIG);

      assert.strictEqual(result.verified, false);
      assert.ok(result.error.includes('Invalid'));
    });

    it('should reject empty signature', async () => {
      const result = await verifier.verify('');

      assert.strictEqual(result.verified, false);
    });

    it('should accept valid base58 signature', async () => {
      const result = await verifier.verify(VALID_SIG);

      // Should call API (mock returns success)
      assert.strictEqual(result.verified, true);
    });
  });

  describe('API Verification', () => {
    it('should verify burn via API', async () => {
      const result = await verifier.verify(VALID_SIG);

      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.amount, mockBurnResponse.amount);
      assert.strictEqual(result.burner, mockBurnResponse.burner);
      assert.strictEqual(result.token, mockBurnResponse.token);
      assert.strictEqual(result.cached, false);
    });

    it('should handle 404 (burn not found)', async () => {
      // Use a signature that triggers the 404 mock (must contain 'not_found' and be valid base58)
      const notFoundSig = 'notfound' + VALID_SIG.slice(8);
      const result = await verifier.verify(notFoundSig);

      assert.strictEqual(result.verified, false);
      assert.ok(result.error && result.error.toLowerCase().includes('not found'), `Expected 'not found' in error: ${result.error}`);
    });

    it('should update stats after verification', async () => {
      await verifier.verify(VALID_SIG);

      const stats = verifier.getStats();
      assert.strictEqual(stats.totalVerified, 1);
      assert.strictEqual(stats.totalApiCalls, 1);
    });
  });

  describe('Caching', () => {
    it('should cache verified burns', async () => {
      // First call - API
      await verifier.verify(VALID_SIG);

      // Second call - should be cached
      const result = await verifier.verify(VALID_SIG);

      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.cached, true);
    });

    it('should increment cache hits', async () => {
      await verifier.verify(VALID_SIG);
      await verifier.verify(VALID_SIG);

      const stats = verifier.getStats();
      assert.strictEqual(stats.totalCacheHits, 1);
      assert.strictEqual(stats.totalApiCalls, 1);
    });

    it('should allow skipping cache', async () => {
      await verifier.verify(VALID_SIG);
      await verifier.verify(VALID_SIG, { skipCache: true });

      const stats = verifier.getStats();
      assert.strictEqual(stats.totalApiCalls, 2);
    });

    it('should check if verified via cache', async () => {
      await verifier.verify(VALID_SIG);

      assert.strictEqual(verifier.isVerified(VALID_SIG), true);
      assert.strictEqual(verifier.isVerified('unknown'), false);
    });

    it('should invalidate cache entry', async () => {
      await verifier.verify(VALID_SIG);
      verifier.invalidate(VALID_SIG);

      assert.strictEqual(verifier.isVerified(VALID_SIG), false);
    });

    it('should clear entire cache', async () => {
      await verifier.verify(VALID_SIG);
      verifier.clearCache();

      assert.strictEqual(verifier.getStats().cacheSize, 0);
    });
  });

  describe('Validation Options', () => {
    it('should validate expected burner', async () => {
      const result = await verifier.verify(VALID_SIG, {
        expectedBurner: 'WrongAddress',
        skipCache: true,
      });

      assert.strictEqual(result.verified, false);
      assert.ok(result.error.includes('mismatch'));
    });

    it('should validate minimum amount', async () => {
      const result = await verifier.verify(VALID_SIG, {
        minAmount: mockBurnResponse.amount + 1,
        skipCache: true,
      });

      assert.strictEqual(result.verified, false);
      assert.ok(result.error.includes('below minimum'));
    });

    it('should pass when expectations met', async () => {
      const result = await verifier.verify(VALID_SIG, {
        expectedBurner: mockBurnResponse.burner,
        minAmount: mockBurnResponse.amount,
        skipCache: true,
      });

      assert.strictEqual(result.verified, true);
    });
  });

  describe('Batch Verification', () => {
    it('should verify multiple burns', async () => {
      const signatures = [VALID_SIG, VALID_SIG + 'a', VALID_SIG + 'b'];
      const results = await verifier.verifyBatch(signatures);

      assert.strictEqual(results.size, 3);
      assert.strictEqual(results.get(VALID_SIG).verified, true);
    });
  });

  describe('Export/Import', () => {
    it('should export state', async () => {
      await verifier.verify(VALID_SIG);

      const exported = verifier.export();

      assert.ok(Array.isArray(exported.cache));
      assert.ok(exported.stats);
    });

    it('should import state', async () => {
      await verifier.verify(VALID_SIG);
      const exported = verifier.export();

      const newVerifier = createBurnVerifier();
      newVerifier.import(exported);

      assert.strictEqual(newVerifier.isVerified(VALID_SIG), true);
    });
  });

  describe('Stats', () => {
    it('should track statistics', async () => {
      await verifier.verify(VALID_SIG);
      await verifier.verify(VALID_SIG); // Cache hit
      await verifier.verify(INVALID_SIG); // Fails validation

      const stats = verifier.getStats();

      assert.strictEqual(stats.totalVerified, 1);
      assert.strictEqual(stats.totalCacheHits, 1);
      assert.strictEqual(stats.totalApiCalls, 1);
    });
  });

  // Cleanup
  describe('Cleanup', () => {
    it('should restore fetch', () => {
      globalThis.fetch = originalFetch;
      assert.ok(true);
    });
  });
});
