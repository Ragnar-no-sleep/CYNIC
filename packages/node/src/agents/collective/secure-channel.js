/**
 * CYNIC Secure Dog Communication
 *
 * Diffie-Hellman key exchange for inter-dog secure channels.
 * "Les chiens ont leurs secrets" - κυνικός
 *
 * Protocol:
 * 1. Dogs agree on public parameters (p, g)
 * 2. Each Dog generates private key
 * 3. Dogs exchange public keys: A = g^a mod p
 * 4. Shared secret: s = g^(ab) mod p
 * 5. Derive encryption key from shared secret
 *
 * @module @cynic/node/agents/collective/secure-channel
 */

'use strict';

import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { PHI_INV, PHI_INV_2, createLogger } from '@cynic/core';

const log = createLogger('SecureChannel');

// ═══════════════════════════════════════════════════════════════════════════
// DIFFIE-HELLMAN PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * φ-aligned DH parameters
 *
 * Using RFC 3526 MODP Group 14 (2048-bit) for security
 * Key size: 256 bits (Fib(13) × 20 ≈ 256)
 */
export const DH_PARAMS = {
  // RFC 3526 MODP Group 14 prime (2048-bit)
  // This is a well-known safe prime for DH
  PRIME: BigInt(
    '0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
    '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
    'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
    'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
    'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
    'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
    '83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
    '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
    'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
    'DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
    '15728E5A8AACAA68FFFFFFFFFFFFFFFF'
  ),

  // Generator (primitive root)
  GENERATOR: 2n,

  // Key derivation iterations (Fib(8) = 21)
  KDF_ITERATIONS: 21,

  // Encryption algorithm
  CIPHER: 'aes-256-gcm',

  // IV size in bytes
  IV_SIZE: 12,

  // Auth tag size
  AUTH_TAG_SIZE: 16,
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR EXPONENTIATION (for big integers)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fast modular exponentiation: base^exp mod mod
 * Uses square-and-multiply algorithm
 *
 * @param {bigint} base - Base
 * @param {bigint} exp - Exponent
 * @param {bigint} mod - Modulus
 * @returns {bigint} Result
 */
export function modPow(base, exp, mod) {
  if (mod === 1n) return 0n;

  let result = 1n;
  base = base % mod;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp >> 1n; // exp = exp / 2
    base = (base * base) % mod;
  }

  return result;
}

/**
 * Generate cryptographically secure random bigint
 *
 * @param {number} bits - Number of bits
 * @returns {bigint} Random bigint
 */
export function randomBigInt(bits) {
  const bytes = Math.ceil(bits / 8);
  const buf = randomBytes(bytes);

  // Convert to bigint
  let result = 0n;
  for (let i = 0; i < buf.length; i++) {
    result = (result << 8n) | BigInt(buf[i]);
  }

  // Mask to exact bit length
  const mask = (1n << BigInt(bits)) - 1n;
  return result & mask;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIFFIE-HELLMAN KEY PAIR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a Diffie-Hellman key pair
 *
 * @returns {{privateKey: bigint, publicKey: bigint}} Key pair
 */
export function generateDHKeyPair() {
  // Private key: random 256-bit number
  const privateKey = randomBigInt(256);

  // Public key: g^privateKey mod p
  const publicKey = modPow(DH_PARAMS.GENERATOR, privateKey, DH_PARAMS.PRIME);

  return { privateKey, publicKey };
}

/**
 * Compute shared secret from own private key and other's public key
 *
 * sharedSecret = otherPublicKey^myPrivateKey mod p
 *
 * @param {bigint} myPrivateKey - Own private key
 * @param {bigint} otherPublicKey - Other party's public key
 * @returns {bigint} Shared secret
 */
export function computeSharedSecret(myPrivateKey, otherPublicKey) {
  return modPow(otherPublicKey, myPrivateKey, DH_PARAMS.PRIME);
}

/**
 * Derive encryption key from shared secret using HKDF-like approach
 *
 * @param {bigint} sharedSecret - DH shared secret
 * @param {string} [context='cynic-dog-channel'] - Context string
 * @returns {Buffer} 32-byte encryption key
 */
export function deriveKey(sharedSecret, context = 'cynic-dog-channel') {
  // Convert bigint to bytes
  const secretHex = sharedSecret.toString(16).padStart(512, '0');
  const secretBuf = Buffer.from(secretHex, 'hex');

  // HKDF-like key derivation
  let key = createHash('sha256')
    .update(secretBuf)
    .update(context)
    .digest();

  // Multiple iterations for key strengthening
  for (let i = 0; i < DH_PARAMS.KDF_ITERATIONS; i++) {
    key = createHash('sha256')
      .update(key)
      .update(Buffer.from([i]))
      .digest();
  }

  return key;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENCRYPTED COMMUNICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encrypt a message using the shared key
 *
 * @param {string|Buffer|Object} message - Message to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @returns {{iv: string, ciphertext: string, tag: string}} Encrypted data
 */
export function encrypt(message, key) {
  // Serialize message if needed
  const plaintext = typeof message === 'object'
    ? JSON.stringify(message)
    : String(message);

  // Generate random IV
  const iv = randomBytes(DH_PARAMS.IV_SIZE);

  // Encrypt
  const cipher = createCipheriv(DH_PARAMS.CIPHER, key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  // Get auth tag
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    ciphertext,
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypt a message using the shared key
 *
 * @param {{iv: string, ciphertext: string, tag: string}} encrypted - Encrypted data
 * @param {Buffer} key - 32-byte encryption key
 * @returns {string|Object} Decrypted message (parsed as JSON if valid)
 */
export function decrypt(encrypted, key) {
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');

  const decipher = createDecipheriv(DH_PARAMS.CIPHER, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  // Try to parse as JSON
  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURE DOG CHANNEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SecureDogChannel - Encrypted communication between two Dogs
 *
 * Establishes a Diffie-Hellman key exchange and provides
 * encrypted send/receive methods.
 */
export class SecureDogChannel {
  /**
   * @param {string} myDogId - This dog's ID
   * @param {string} otherDogId - Other dog's ID
   */
  constructor(myDogId, otherDogId) {
    this.myDogId = myDogId;
    this.otherDogId = otherDogId;

    // Generate our key pair
    const { privateKey, publicKey } = generateDHKeyPair();
    this.privateKey = privateKey;
    this.publicKey = publicKey;

    // Will be set after key exchange
    this.otherPublicKey = null;
    this.sharedSecret = null;
    this.encryptionKey = null;

    // Channel state
    this.isEstablished = false;
    this.messageCount = 0;

    // Stats
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesEncrypted: 0,
      bytesDecrypted: 0,
      establishedAt: null,
    };
  }

  /**
   * Get our public key for exchange
   *
   * @returns {string} Public key as hex string
   */
  getPublicKeyHex() {
    return this.publicKey.toString(16);
  }

  /**
   * Receive other dog's public key and establish channel
   *
   * @param {string} otherPublicKeyHex - Other dog's public key (hex)
   */
  receivePublicKey(otherPublicKeyHex) {
    this.otherPublicKey = BigInt('0x' + otherPublicKeyHex);

    // Compute shared secret
    this.sharedSecret = computeSharedSecret(this.privateKey, this.otherPublicKey);

    // Derive encryption key with channel-specific context
    const context = `cynic-${[this.myDogId, this.otherDogId].sort().join('-')}`;
    this.encryptionKey = deriveKey(this.sharedSecret, context);

    this.isEstablished = true;
    this.stats.establishedAt = Date.now();

    log.info('Secure channel established', {
      from: this.myDogId,
      to: this.otherDogId,
    });
  }

  /**
   * Send an encrypted message
   *
   * @param {Object} message - Message to send
   * @returns {{from: string, to: string, encrypted: Object, seq: number}} Encrypted envelope
   */
  send(message) {
    if (!this.isEstablished) {
      throw new Error('Channel not established. Exchange public keys first.');
    }

    const encrypted = encrypt(message, this.encryptionKey);

    this.messageCount++;
    this.stats.messagesSent++;
    this.stats.bytesEncrypted += encrypted.ciphertext.length;

    return {
      from: this.myDogId,
      to: this.otherDogId,
      encrypted,
      seq: this.messageCount,
      timestamp: Date.now(),
    };
  }

  /**
   * Receive and decrypt a message
   *
   * @param {{encrypted: Object}} envelope - Encrypted envelope
   * @returns {Object} Decrypted message
   */
  receive(envelope) {
    if (!this.isEstablished) {
      throw new Error('Channel not established. Exchange public keys first.');
    }

    const message = decrypt(envelope.encrypted, this.encryptionKey);

    this.stats.messagesReceived++;
    this.stats.bytesDecrypted += envelope.encrypted.ciphertext.length;

    return message;
  }

  /**
   * Get channel status
   */
  getStatus() {
    return {
      myDogId: this.myDogId,
      otherDogId: this.otherDogId,
      isEstablished: this.isEstablished,
      messageCount: this.messageCount,
      stats: { ...this.stats },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURE CHANNEL MANAGER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SecureChannelManager - Manages secure channels between all Dogs
 *
 * Each Dog gets a manager that handles key exchange and channel creation
 * with other Dogs in the collective.
 */
export class SecureChannelManager {
  /**
   * @param {string} dogId - This dog's ID
   */
  constructor(dogId) {
    this.dogId = dogId;

    // Channels: Map<otherDogId, SecureDogChannel>
    this.channels = new Map();

    // Pending key exchanges: Map<otherDogId, {myPublicKey, timestamp}>
    this.pendingExchanges = new Map();
  }

  /**
   * Initiate key exchange with another Dog
   *
   * @param {string} otherDogId - Target dog ID
   * @returns {{type: 'KEY_EXCHANGE_INIT', from: string, to: string, publicKey: string}}
   */
  initiateKeyExchange(otherDogId) {
    if (this.channels.has(otherDogId)) {
      log.debug('Channel already exists', { with: otherDogId });
      return null;
    }

    const channel = new SecureDogChannel(this.dogId, otherDogId);
    this.channels.set(otherDogId, channel);

    this.pendingExchanges.set(otherDogId, {
      myPublicKey: channel.getPublicKeyHex(),
      timestamp: Date.now(),
    });

    return {
      type: 'KEY_EXCHANGE_INIT',
      from: this.dogId,
      to: otherDogId,
      publicKey: channel.getPublicKeyHex(),
    };
  }

  /**
   * Handle incoming key exchange initiation
   *
   * @param {{from: string, publicKey: string}} message - Key exchange init
   * @returns {{type: 'KEY_EXCHANGE_RESPONSE', from: string, to: string, publicKey: string}}
   */
  handleKeyExchangeInit(message) {
    const { from, publicKey } = message;

    // Create channel if not exists
    if (!this.channels.has(from)) {
      const channel = new SecureDogChannel(this.dogId, from);
      this.channels.set(from, channel);
    }

    const channel = this.channels.get(from);

    // Receive their public key
    channel.receivePublicKey(publicKey);

    // Send our public key back
    return {
      type: 'KEY_EXCHANGE_RESPONSE',
      from: this.dogId,
      to: from,
      publicKey: channel.getPublicKeyHex(),
    };
  }

  /**
   * Handle key exchange response
   *
   * @param {{from: string, publicKey: string}} message - Key exchange response
   */
  handleKeyExchangeResponse(message) {
    const { from, publicKey } = message;

    const channel = this.channels.get(from);
    if (!channel) {
      log.warn('No pending exchange for dog', { from });
      return;
    }

    channel.receivePublicKey(publicKey);
    this.pendingExchanges.delete(from);

    log.info('Key exchange complete', { with: from });
  }

  /**
   * Send encrypted message to another Dog
   *
   * @param {string} toDogId - Target dog ID
   * @param {Object} message - Message to send
   * @returns {Object|null} Encrypted envelope or null if no channel
   */
  sendSecure(toDogId, message) {
    const channel = this.channels.get(toDogId);
    if (!channel || !channel.isEstablished) {
      log.warn('No established channel', { to: toDogId });
      return null;
    }

    return channel.send(message);
  }

  /**
   * Receive and decrypt message from another Dog
   *
   * @param {{from: string, encrypted: Object}} envelope - Encrypted envelope
   * @returns {Object|null} Decrypted message or null if failed
   */
  receiveSecure(envelope) {
    const channel = this.channels.get(envelope.from);
    if (!channel || !channel.isEstablished) {
      log.warn('No established channel', { from: envelope.from });
      return null;
    }

    try {
      return channel.receive(envelope);
    } catch (err) {
      log.error('Decryption failed', { from: envelope.from, error: err.message });
      return null;
    }
  }

  /**
   * Broadcast encrypted message to all connected Dogs
   *
   * @param {Object} message - Message to broadcast
   * @returns {Object[]} Array of encrypted envelopes
   */
  broadcastSecure(message) {
    const envelopes = [];

    for (const [dogId, channel] of this.channels) {
      if (channel.isEstablished) {
        envelopes.push(channel.send(message));
      }
    }

    return envelopes;
  }

  /**
   * Get all established channels
   */
  getEstablishedChannels() {
    const channels = [];
    for (const [dogId, channel] of this.channels) {
      if (channel.isEstablished) {
        channels.push(channel.getStatus());
      }
    }
    return channels;
  }

  /**
   * Get manager status
   */
  getStatus() {
    return {
      dogId: this.dogId,
      totalChannels: this.channels.size,
      establishedChannels: this.getEstablishedChannels().length,
      pendingExchanges: this.pendingExchanges.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a SecureChannelManager for a Dog
 *
 * @param {string} dogId - Dog identifier
 * @returns {SecureChannelManager}
 */
export function createSecureChannelManager(dogId) {
  return new SecureChannelManager(dogId);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // DH primitives
  modPow,
  randomBigInt,
  generateDHKeyPair,
  computeSharedSecret,
  deriveKey,

  // Encryption
  encrypt,
  decrypt,

  // Channel classes
  SecureDogChannel,
  SecureChannelManager,
  createSecureChannelManager,

  // Config
  DH_PARAMS,
};
