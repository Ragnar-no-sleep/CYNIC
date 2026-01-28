/**
 * @cynic/core - Crypto Utils Tests
 *
 * Tests secure random generation:
 * - Random number generation
 * - Hex/Base36 encoding
 * - IDs, nonces, tokens
 *
 * "Trust no entropy" - κυνικός
 *
 * @module @cynic/core/test/crypto-utils
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  secureRandom,
  secureRandomHex,
  secureRandomBase36,
  secureId,
  secureNonce,
  secureToken,
} from '../src/crypto-utils.js';

// =============================================================================
// SECURE RANDOM TESTS
// =============================================================================

describe('secureRandom', () => {
  it('should return number between 0 and 1', () => {
    const value = secureRandom();

    assert.strictEqual(typeof value, 'number');
    assert.ok(value >= 0, 'Should be >= 0');
    assert.ok(value < 1, 'Should be < 1');
  });

  it('should return different values each call', () => {
    const values = new Set();
    for (let i = 0; i < 100; i++) {
      values.add(secureRandom());
    }
    // Should have at least 90 unique values (allowing some extremely rare collisions)
    assert.ok(values.size > 90);
  });

  it('should produce uniform distribution', () => {
    // Generate many values and check distribution
    const buckets = new Array(10).fill(0);

    for (let i = 0; i < 1000; i++) {
      const value = secureRandom();
      const bucket = Math.floor(value * 10);
      buckets[bucket]++;
    }

    // Each bucket should have roughly 100 values (allow 50% variance)
    const min = buckets.reduce((a, b) => Math.min(a, b));
    const max = buckets.reduce((a, b) => Math.max(a, b));

    assert.ok(min > 50, `Minimum bucket ${min} too low`);
    assert.ok(max < 150, `Maximum bucket ${max} too high`);
  });
});

// =============================================================================
// SECURE RANDOM HEX TESTS
// =============================================================================

describe('secureRandomHex', () => {
  it('should return hex string', () => {
    const hex = secureRandomHex(16);

    assert.strictEqual(typeof hex, 'string');
    assert.match(hex, /^[0-9a-f]+$/);
  });

  it('should return string of correct length', () => {
    // 16 bytes = 32 hex chars
    const hex = secureRandomHex(16);
    assert.strictEqual(hex.length, 32);
  });

  it('should return different values each call', () => {
    const a = secureRandomHex(16);
    const b = secureRandomHex(16);

    assert.notStrictEqual(a, b);
  });

  it('should use default length of 16', () => {
    const hex = secureRandomHex();
    assert.strictEqual(hex.length, 32); // 16 bytes = 32 hex
  });

  it('should handle various sizes', () => {
    assert.strictEqual(secureRandomHex(1).length, 2);
    assert.strictEqual(secureRandomHex(8).length, 16);
    assert.strictEqual(secureRandomHex(32).length, 64);
  });
});

// =============================================================================
// SECURE RANDOM BASE36 TESTS
// =============================================================================

describe('secureRandomBase36', () => {
  it('should return alphanumeric string', () => {
    const base36 = secureRandomBase36(16);

    assert.strictEqual(typeof base36, 'string');
    assert.match(base36, /^[0-9a-z]+$/);
  });

  it('should return string of requested length', () => {
    const str = secureRandomBase36(10);
    assert.strictEqual(str.length, 10);
  });

  it('should use default length of 8', () => {
    const str = secureRandomBase36();
    assert.strictEqual(str.length, 8);
  });

  it('should return different values each call', () => {
    const a = secureRandomBase36(20);
    const b = secureRandomBase36(20);

    assert.notStrictEqual(a, b);
  });

  it('should handle various lengths', () => {
    assert.strictEqual(secureRandomBase36(1).length, 1);
    assert.strictEqual(secureRandomBase36(50).length, 50);
    assert.strictEqual(secureRandomBase36(100).length, 100);
  });
});

// =============================================================================
// SECURE ID TESTS
// =============================================================================

describe('secureId', () => {
  it('should return prefixed ID', () => {
    const id = secureId('usr');

    assert.ok(id.startsWith('usr_'));
  });

  it('should include timestamp component', () => {
    const id = secureId('test');
    const parts = id.split('_');

    // Format: prefix_timestamp_random
    assert.strictEqual(parts.length, 3);
  });

  it('should return unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(secureId('test'));
    }
    assert.strictEqual(ids.size, 100);
  });

  it('should use default prefix "id" if none provided', () => {
    const id = secureId();

    assert.ok(id.startsWith('id_'));
  });

  it('should accept custom random length', () => {
    const shortId = secureId('x', 4);
    const longId = secureId('x', 20);

    // Both should be valid but different lengths
    assert.ok(shortId.length < longId.length);
  });
});

// =============================================================================
// SECURE NONCE TESTS
// =============================================================================

describe('secureNonce', () => {
  it('should return hex string', () => {
    const nonce = secureNonce();

    assert.strictEqual(typeof nonce, 'string');
    assert.match(nonce, /^[0-9a-f]+$/);
  });

  it('should use default length of 16 bytes (32 hex chars)', () => {
    const nonce = secureNonce();
    assert.strictEqual(nonce.length, 32);
  });

  it('should return different values each call', () => {
    const a = secureNonce();
    const b = secureNonce();

    assert.notStrictEqual(a, b);
  });

  it('should accept custom length', () => {
    const nonce8 = secureNonce(8);
    const nonce32 = secureNonce(32);

    assert.strictEqual(nonce8.length, 16);  // 8 bytes = 16 hex
    assert.strictEqual(nonce32.length, 64); // 32 bytes = 64 hex
  });
});

// =============================================================================
// SECURE TOKEN TESTS
// =============================================================================

describe('secureToken', () => {
  it('should return token string', () => {
    const token = secureToken();

    assert.strictEqual(typeof token, 'string');
  });

  it('should include timestamp', () => {
    const before = Date.now();
    const token = secureToken();
    const after = Date.now();

    // Token format: timestamp-randomhex
    const parts = token.split('-');
    assert.strictEqual(parts.length, 2);

    const timestamp = parseInt(parts[0], 10);
    assert.ok(timestamp >= before);
    assert.ok(timestamp <= after);
  });

  it('should return different tokens each call', () => {
    const a = secureToken();
    const b = secureToken();

    assert.notStrictEqual(a, b);
  });

  it('should have sufficient entropy', () => {
    const token = secureToken();
    // Format: timestamp-32hexchars
    const [, randomPart] = token.split('-');

    assert.strictEqual(randomPart.length, 32); // 16 bytes = 32 hex
  });
});

// =============================================================================
// ENTROPY QUALITY TESTS
// =============================================================================

describe('Entropy Quality', () => {
  it('should produce uniform hex distribution', () => {
    // Count occurrences of each hex digit
    const counts = {};
    for (let i = 0; i < 16; i++) {
      counts[i.toString(16)] = 0;
    }

    for (let i = 0; i < 100; i++) {
      const hex = secureRandomHex(32);
      for (const char of hex) {
        counts[char]++;
      }
    }

    // 100 * 64 = 6400 total chars, expect ~400 per digit
    const values = Object.values(counts);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Allow 50% variance
    assert.ok(min > 200, `Minimum count ${min} too low`);
    assert.ok(max < 600, `Maximum count ${max} too high`);
  });

  it('should not repeat nonces in reasonable sample', () => {
    const samples = new Set();

    for (let i = 0; i < 10000; i++) {
      samples.add(secureNonce(8)); // 64 bits
    }

    // With 64 bits of entropy, collisions should be very rare
    assert.strictEqual(samples.size, 10000);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('should handle single character base36', () => {
    const str = secureRandomBase36(1);
    assert.strictEqual(str.length, 1);
    assert.match(str, /^[0-9a-z]$/);
  });

  it('should handle large hex requests', () => {
    const hex = secureRandomHex(1024);
    assert.strictEqual(hex.length, 2048);
  });

  it('should work with empty prefix in secureId', () => {
    const id = secureId('');
    // Should still have timestamp and random parts
    assert.ok(id.startsWith('_'));
  });

  it('should handle special prefix characters', () => {
    const id = secureId('user-profile');
    assert.ok(id.startsWith('user-profile_'));
  });
});
