/**
 * Tests for Diffie-Hellman Secure Dog Channels
 * "Les chiens ont leurs secrets" - κυνικός
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  modPow,
  randomBigInt,
  generateDHKeyPair,
  computeSharedSecret,
  deriveKey,
  encrypt,
  decrypt,
  SecureDogChannel,
  SecureChannelManager,
  DH_PARAMS,
} from '../src/agents/collective/secure-channel.js';

describe('Diffie-Hellman Primitives', () => {
  describe('modPow', () => {
    it('should compute simple modular exponentiation', () => {
      // 2^10 mod 1000 = 1024 mod 1000 = 24
      const result = modPow(2n, 10n, 1000n);
      assert.strictEqual(result, 24n);
    });

    it('should handle large numbers', () => {
      // g^a mod p should be non-zero for random a
      const a = randomBigInt(256);
      const result = modPow(DH_PARAMS.GENERATOR, a, DH_PARAMS.PRIME);
      assert.ok(result > 0n);
      assert.ok(result < DH_PARAMS.PRIME);
    });

    it('should return 0 for mod 1', () => {
      const result = modPow(5n, 3n, 1n);
      assert.strictEqual(result, 0n);
    });
  });

  describe('randomBigInt', () => {
    it('should generate random numbers of specified bit length', () => {
      const bits = 64;
      const num = randomBigInt(bits);

      // Should be positive
      assert.ok(num >= 0n);

      // Should be less than 2^bits
      assert.ok(num < (1n << BigInt(bits)));
    });

    it('should generate different numbers each time', () => {
      const nums = new Set();
      for (let i = 0; i < 10; i++) {
        nums.add(randomBigInt(128).toString());
      }
      // Should have at least 9 unique (extremely unlikely to have collision)
      assert.ok(nums.size >= 9, 'Should generate unique random numbers');
    });
  });

  describe('generateDHKeyPair', () => {
    it('should generate valid key pair', () => {
      const { privateKey, publicKey } = generateDHKeyPair();

      assert.ok(privateKey > 0n, 'Private key should be positive');
      assert.ok(publicKey > 0n, 'Public key should be positive');
      assert.ok(publicKey < DH_PARAMS.PRIME, 'Public key should be less than prime');
    });

    it('should generate different keys each time', () => {
      const kp1 = generateDHKeyPair();
      const kp2 = generateDHKeyPair();

      assert.notStrictEqual(kp1.privateKey, kp2.privateKey);
      assert.notStrictEqual(kp1.publicKey, kp2.publicKey);
    });

    it('should satisfy DH equation: publicKey = g^privateKey mod p', () => {
      const { privateKey, publicKey } = generateDHKeyPair();
      const computed = modPow(DH_PARAMS.GENERATOR, privateKey, DH_PARAMS.PRIME);

      assert.strictEqual(publicKey, computed);
    });
  });

  describe('computeSharedSecret', () => {
    it('should compute same shared secret for both parties', () => {
      // Alice's keys
      const alice = generateDHKeyPair();

      // Bob's keys
      const bob = generateDHKeyPair();

      // Alice computes shared secret using Bob's public key
      const aliceSecret = computeSharedSecret(alice.privateKey, bob.publicKey);

      // Bob computes shared secret using Alice's public key
      const bobSecret = computeSharedSecret(bob.privateKey, alice.publicKey);

      // Both should get the same secret!
      assert.strictEqual(aliceSecret, bobSecret, 'Shared secrets must match');
    });

    it('should produce different secrets for different pairs', () => {
      const alice = generateDHKeyPair();
      const bob = generateDHKeyPair();
      const charlie = generateDHKeyPair();

      const aliceBobSecret = computeSharedSecret(alice.privateKey, bob.publicKey);
      const aliceCharlieSecret = computeSharedSecret(alice.privateKey, charlie.publicKey);

      assert.notStrictEqual(aliceBobSecret, aliceCharlieSecret);
    });
  });

  describe('deriveKey', () => {
    it('should derive 32-byte key', () => {
      const secret = randomBigInt(256);
      const key = deriveKey(secret);

      assert.strictEqual(key.length, 32);
    });

    it('should be deterministic for same input', () => {
      const secret = 12345678901234567890n;

      const key1 = deriveKey(secret, 'context');
      const key2 = deriveKey(secret, 'context');

      assert.deepStrictEqual(key1, key2);
    });

    it('should produce different keys for different contexts', () => {
      const secret = randomBigInt(256);

      const key1 = deriveKey(secret, 'context1');
      const key2 = deriveKey(secret, 'context2');

      assert.notDeepStrictEqual(key1, key2);
    });
  });
});

describe('Encryption/Decryption', () => {
  describe('encrypt and decrypt', () => {
    it('should round-trip string messages', () => {
      const key = deriveKey(randomBigInt(256));
      const message = 'Hello, Dogs!';

      const encrypted = encrypt(message, key);
      const decrypted = decrypt(encrypted, key);

      assert.strictEqual(decrypted, message);
    });

    it('should round-trip object messages', () => {
      const key = deriveKey(randomBigInt(256));
      const message = {
        type: 'VOTE',
        topic: 'consensus',
        vote: 'approve',
        confidence: 0.618,
      };

      const encrypted = encrypt(message, key);
      const decrypted = decrypt(encrypted, key);

      assert.deepStrictEqual(decrypted, message);
    });

    it('should produce different ciphertext for same message (random IV)', () => {
      const key = deriveKey(randomBigInt(256));
      const message = 'Same message';

      const enc1 = encrypt(message, key);
      const enc2 = encrypt(message, key);

      assert.notStrictEqual(enc1.ciphertext, enc2.ciphertext);
      assert.notStrictEqual(enc1.iv, enc2.iv);
    });

    it('should fail decryption with wrong key', () => {
      const key1 = deriveKey(randomBigInt(256));
      const key2 = deriveKey(randomBigInt(256));
      const message = 'Secret message';

      const encrypted = encrypt(message, key1);

      assert.throws(() => {
        decrypt(encrypted, key2);
      }, /Unsupported state|authentication/i);
    });

    it('should detect tampering (GCM auth tag)', () => {
      const key = deriveKey(randomBigInt(256));
      const message = 'Authentic message';

      const encrypted = encrypt(message, key);

      // Tamper with ciphertext
      const tampered = {
        ...encrypted,
        ciphertext: encrypted.ciphertext.slice(0, -4) + 'XXXX',
      };

      assert.throws(() => {
        decrypt(tampered, key);
      });
    });
  });
});

describe('SecureDogChannel', () => {
  describe('key exchange', () => {
    it('should establish channel between two dogs', () => {
      const guardianChannel = new SecureDogChannel('guardian', 'oracle');
      const oracleChannel = new SecureDogChannel('oracle', 'guardian');

      // Exchange public keys
      const guardianPubKey = guardianChannel.getPublicKeyHex();
      const oraclePubKey = oracleChannel.getPublicKeyHex();

      guardianChannel.receivePublicKey(oraclePubKey);
      oracleChannel.receivePublicKey(guardianPubKey);

      assert.ok(guardianChannel.isEstablished);
      assert.ok(oracleChannel.isEstablished);
    });

    it('should allow encrypted communication after key exchange', () => {
      const guardian = new SecureDogChannel('guardian', 'oracle');
      const oracle = new SecureDogChannel('oracle', 'guardian');

      // Key exchange
      oracle.receivePublicKey(guardian.getPublicKeyHex());
      guardian.receivePublicKey(oracle.getPublicKeyHex());

      // Guardian sends to Oracle
      const message = { type: 'JUDGMENT', score: 75, verdict: 'WAG' };
      const envelope = guardian.send(message);

      // Oracle receives
      const received = oracle.receive(envelope);

      assert.deepStrictEqual(received, message);
    });

    it('should track message statistics', () => {
      const dog1 = new SecureDogChannel('dog1', 'dog2');
      const dog2 = new SecureDogChannel('dog2', 'dog1');

      dog1.receivePublicKey(dog2.getPublicKeyHex());
      dog2.receivePublicKey(dog1.getPublicKeyHex());

      // Send some messages
      for (let i = 0; i < 5; i++) {
        dog2.receive(dog1.send({ i }));
      }

      const status = dog1.getStatus();
      assert.strictEqual(status.stats.messagesSent, 5);
    });
  });

  describe('error handling', () => {
    it('should throw if sending before key exchange', () => {
      const channel = new SecureDogChannel('dog1', 'dog2');

      assert.throws(() => {
        channel.send({ test: true });
      }, /not established/i);
    });

    it('should throw if receiving before key exchange', () => {
      const channel = new SecureDogChannel('dog1', 'dog2');

      assert.throws(() => {
        channel.receive({ encrypted: {} });
      }, /not established/i);
    });
  });
});

describe('SecureChannelManager', () => {
  describe('key exchange flow', () => {
    it('should manage key exchange between dogs', () => {
      const guardianMgr = new SecureChannelManager('guardian');
      const oracleMgr = new SecureChannelManager('oracle');

      // Guardian initiates
      const initMsg = guardianMgr.initiateKeyExchange('oracle');
      assert.strictEqual(initMsg.type, 'KEY_EXCHANGE_INIT');
      assert.strictEqual(initMsg.from, 'guardian');
      assert.strictEqual(initMsg.to, 'oracle');

      // Oracle responds
      const responseMsg = oracleMgr.handleKeyExchangeInit(initMsg);
      assert.strictEqual(responseMsg.type, 'KEY_EXCHANGE_RESPONSE');

      // Guardian receives response
      guardianMgr.handleKeyExchangeResponse(responseMsg);

      // Both should have established channels
      assert.strictEqual(guardianMgr.getEstablishedChannels().length, 1);
      assert.strictEqual(oracleMgr.getEstablishedChannels().length, 1);
    });

    it('should allow secure messaging after exchange', () => {
      const mgr1 = new SecureChannelManager('dog1');
      const mgr2 = new SecureChannelManager('dog2');

      // Exchange
      const init = mgr1.initiateKeyExchange('dog2');
      const response = mgr2.handleKeyExchangeInit(init);
      mgr1.handleKeyExchangeResponse(response);

      // Send message
      const message = { vote: 'approve', confidence: 0.55 };
      const envelope = mgr1.sendSecure('dog2', message);

      // Receive
      const received = mgr2.receiveSecure(envelope);
      assert.deepStrictEqual(received, message);
    });

    it('should broadcast to all connected dogs', () => {
      const leader = new SecureChannelManager('leader');
      const dog1 = new SecureChannelManager('dog1');
      const dog2 = new SecureChannelManager('dog2');

      // Establish channels with both
      const init1 = leader.initiateKeyExchange('dog1');
      dog1.handleKeyExchangeInit(init1);
      leader.handleKeyExchangeResponse(dog1.channels.get('leader').getPublicKeyHex()
        ? { from: 'dog1', publicKey: dog1.channels.get('leader').getPublicKeyHex() }
        : init1);

      // Manually complete exchange for dog1
      leader.channels.get('dog1').receivePublicKey(
        dog1.channels.get('leader').getPublicKeyHex()
      );

      const init2 = leader.initiateKeyExchange('dog2');
      dog2.handleKeyExchangeInit(init2);
      leader.channels.get('dog2').receivePublicKey(
        dog2.channels.get('leader').getPublicKeyHex()
      );

      // Broadcast
      const envelopes = leader.broadcastSecure({ type: 'ALERT', message: 'Danger!' });
      assert.strictEqual(envelopes.length, 2);
    });
  });

  describe('status', () => {
    it('should report correct status', () => {
      const mgr = new SecureChannelManager('test-dog');

      const status = mgr.getStatus();
      assert.strictEqual(status.dogId, 'test-dog');
      assert.strictEqual(status.totalChannels, 0);
      assert.strictEqual(status.establishedChannels, 0);
    });
  });
});

describe('Security Properties', () => {
  it('should use strong prime (2048-bit)', () => {
    const primeBitLength = DH_PARAMS.PRIME.toString(2).length;
    assert.ok(primeBitLength >= 2048, `Prime should be at least 2048 bits, got ${primeBitLength}`);
  });

  it('should use authenticated encryption (GCM)', () => {
    assert.strictEqual(DH_PARAMS.CIPHER, 'aes-256-gcm');
  });

  it('should derive keys with multiple iterations', () => {
    assert.ok(DH_PARAMS.KDF_ITERATIONS >= 21, 'Should use sufficient iterations');
  });
});
