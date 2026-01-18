/**
 * @cynic/anchor - Wallet Tests
 *
 * "Onchain is truth - keys unlock truth" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  WalletType,
  CynicWallet,
  loadWalletFromFile,
  loadWalletFromEnv,
  generateWallet,
  saveWalletToFile,
  base58Encode,
  base58Decode,
} from '../src/wallet.js';

// ═══════════════════════════════════════════════════════════════════════════
// Base58 Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - Base58 Encoding', () => {
  it('should encode empty bytes', () => {
    const encoded = base58Encode(new Uint8Array(0));
    assert.strictEqual(encoded, '');
  });

  it('should encode single byte', () => {
    const encoded = base58Encode(new Uint8Array([0]));
    assert.strictEqual(encoded, '1');
  });

  it('should encode leading zeros', () => {
    const encoded = base58Encode(new Uint8Array([0, 0, 1]));
    assert.ok(encoded.startsWith('11'));
  });

  it('should roundtrip encode/decode', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 100, 200, 255]);
    const encoded = base58Encode(original);
    const decoded = base58Decode(encoded);

    assert.deepStrictEqual(Array.from(decoded), Array.from(original));
  });

  it('should decode empty string', () => {
    const decoded = base58Decode('');
    assert.strictEqual(decoded.length, 0);
  });

  it('should throw on invalid characters', () => {
    assert.throws(() => base58Decode('0OIl'), /Invalid base58/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CynicWallet Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - CynicWallet', () => {
  describe('Creation', () => {
    it('should create empty wallet', () => {
      const wallet = new CynicWallet();
      assert.strictEqual(wallet.type, WalletType.KEYPAIR);
      assert.strictEqual(wallet.connected, false);
    });

    it('should create wallet from secret key', () => {
      const secretKey = new Uint8Array(64);
      secretKey.fill(1, 0, 32); // Private key part
      secretKey.fill(2, 32, 64); // Public key part

      const wallet = new CynicWallet({ secretKey });

      assert.strictEqual(wallet.connected, true);
      assert.ok(wallet.publicKey);
    });

    it('should reject invalid secret key length', () => {
      assert.throws(
        () => new CynicWallet({ secretKey: new Uint8Array(32) }),
        /64 bytes/
      );
    });
  });

  describe('Public Key', () => {
    it('should return public key as base58', () => {
      const secretKey = new Uint8Array(64);
      for (let i = 0; i < 64; i++) secretKey[i] = i;

      const wallet = new CynicWallet({ secretKey });

      assert.ok(wallet.publicKey);
      assert.ok(typeof wallet.publicKey === 'string');
      assert.ok(wallet.publicKey.length > 0);
    });

    it('should return public key bytes', () => {
      const secretKey = new Uint8Array(64);
      for (let i = 0; i < 64; i++) secretKey[i] = i;

      const wallet = new CynicWallet({ secretKey });

      assert.ok(wallet.publicKeyBytes);
      assert.strictEqual(wallet.publicKeyBytes.length, 32);
    });
  });

  describe('Export', () => {
    it('should export wallet info without secret', () => {
      const secretKey = new Uint8Array(64);
      for (let i = 0; i < 64; i++) secretKey[i] = i;

      const wallet = new CynicWallet({ secretKey });
      const exported = wallet.export();

      assert.strictEqual(exported.type, WalletType.KEYPAIR);
      assert.ok(exported.publicKey);
      assert.strictEqual(exported.connected, true);
      assert.strictEqual(exported.secretKey, undefined);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Wallet Generation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - Wallet Generation', () => {
  it('should generate new wallet', () => {
    const { wallet, secretKey } = generateWallet();

    assert.ok(wallet instanceof CynicWallet);
    assert.strictEqual(secretKey.length, 64);
    assert.strictEqual(wallet.connected, true);
  });

  it('should generate unique wallets', () => {
    const { wallet: w1 } = generateWallet();
    const { wallet: w2 } = generateWallet();

    assert.notStrictEqual(w1.publicKey, w2.publicKey);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// File Loading Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - File Loading', () => {
  const tempFile = join(tmpdir(), 'cynic-test-keypair.json');

  it('should load wallet from Solana CLI format file', () => {
    // Create test keypair file (Solana CLI format: array of 64 numbers)
    const secretKey = Array.from({ length: 64 }, (_, i) => i);
    writeFileSync(tempFile, JSON.stringify(secretKey));

    try {
      const wallet = loadWalletFromFile(tempFile);

      assert.ok(wallet instanceof CynicWallet);
      assert.strictEqual(wallet.type, WalletType.FILE);
      assert.strictEqual(wallet.connected, true);
    } finally {
      if (existsSync(tempFile)) unlinkSync(tempFile);
    }
  });

  it('should throw on missing file', () => {
    assert.throws(
      () => loadWalletFromFile('/nonexistent/path.json'),
      /not found/
    );
  });

  it('should throw on invalid format', () => {
    writeFileSync(tempFile, JSON.stringify([1, 2, 3])); // Wrong length

    try {
      assert.throws(() => loadWalletFromFile(tempFile), /Invalid keypair/);
    } finally {
      if (existsSync(tempFile)) unlinkSync(tempFile);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// File Saving Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - File Saving', () => {
  const tempFile = join(tmpdir(), 'cynic-test-save-keypair.json');

  it('should save and reload wallet', () => {
    const { secretKey } = generateWallet();

    saveWalletToFile(secretKey, tempFile);

    try {
      const loaded = loadWalletFromFile(tempFile);
      assert.strictEqual(loaded.connected, true);
    } finally {
      if (existsSync(tempFile)) unlinkSync(tempFile);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Environment Variable Loading Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - Environment Loading', () => {
  const ENV_VAR = 'CYNIC_TEST_SOLANA_KEY';

  it('should return null when env var not set', () => {
    delete process.env[ENV_VAR];
    const wallet = loadWalletFromEnv(ENV_VAR);
    assert.strictEqual(wallet, null);
  });

  it('should load from JSON array env var', () => {
    const secretKey = Array.from({ length: 64 }, (_, i) => i);
    process.env[ENV_VAR] = JSON.stringify(secretKey);

    try {
      const wallet = loadWalletFromEnv(ENV_VAR);

      assert.ok(wallet instanceof CynicWallet);
      assert.strictEqual(wallet.type, WalletType.ENV);
      assert.strictEqual(wallet.connected, true);
    } finally {
      delete process.env[ENV_VAR];
    }
  });

  it('should load from base58 env var', () => {
    // Create a valid 64-byte key and encode it
    const secretKey = new Uint8Array(64);
    for (let i = 0; i < 64; i++) secretKey[i] = i + 1;
    process.env[ENV_VAR] = base58Encode(secretKey);

    try {
      const wallet = loadWalletFromEnv(ENV_VAR);

      assert.ok(wallet instanceof CynicWallet);
      assert.strictEqual(wallet.type, WalletType.ENV);
    } finally {
      delete process.env[ENV_VAR];
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Wallet Types Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - WalletType', () => {
  it('should have all expected types', () => {
    assert.strictEqual(WalletType.KEYPAIR, 'KEYPAIR');
    assert.strictEqual(WalletType.FILE, 'FILE');
    assert.strictEqual(WalletType.ENV, 'ENV');
    assert.strictEqual(WalletType.ADAPTER, 'ADAPTER');
  });
});
