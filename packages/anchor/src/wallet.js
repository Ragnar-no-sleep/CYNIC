/**
 * @cynic/anchor - Wallet Management
 *
 * Keypair generation, loading, and management for Solana anchoring.
 *
 * "Onchain is truth - keys unlock truth" - κυνικός
 *
 * @module @cynic/anchor/wallet
 */

'use strict';

import { createHash, randomBytes, generateKeyPairSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Wallet types
 */
export const WalletType = {
  /** Keypair from raw bytes */
  KEYPAIR: 'KEYPAIR',
  /** Keypair from file */
  FILE: 'FILE',
  /** Keypair from environment variable */
  ENV: 'ENV',
  /** External wallet adapter (Phantom, etc.) */
  ADAPTER: 'ADAPTER',
};

/**
 * Wallet wrapper for Solana operations
 *
 * Supports multiple wallet sources:
 * - Direct keypair bytes
 * - JSON keypair file (Solana CLI format)
 * - Environment variable (base58 or JSON)
 * - External adapter (for browser/wallet extensions)
 */
export class CynicWallet {
  /**
   * @param {Object} config
   * @param {Uint8Array} [config.secretKey] - 64-byte secret key
   * @param {Object} [config.keypair] - Solana Keypair object
   * @param {Object} [config.adapter] - External wallet adapter
   * @param {string} [config.type] - Wallet type
   */
  constructor(config = {}) {
    this.type = config.type || WalletType.KEYPAIR;
    this._keypair = null;
    this._adapter = null;
    this._publicKey = null;

    if (config.secretKey) {
      this._initFromSecretKey(config.secretKey);
    } else if (config.keypair) {
      this._keypair = config.keypair;
      this._publicKey = config.keypair.publicKey;
    } else if (config.adapter) {
      this._adapter = config.adapter;
      this._publicKey = config.adapter.publicKey;
      this.type = WalletType.ADAPTER;
    }
  }

  /**
   * Initialize from 64-byte secret key
   * @param {Uint8Array} secretKey
   * @private
   */
  _initFromSecretKey(secretKey) {
    if (secretKey.length !== 64) {
      throw new Error('Secret key must be 64 bytes');
    }
    // Store for lazy Keypair creation (when web3.js is available)
    this._secretKey = secretKey;
    // Extract public key (last 32 bytes of secret key)
    this._publicKey = secretKey.slice(32);
  }

  /**
   * Get public key as base58 string
   * @returns {string}
   */
  get publicKey() {
    if (this._keypair) {
      return this._keypair.publicKey.toBase58();
    }
    if (this._adapter) {
      return this._adapter.publicKey.toBase58();
    }
    if (this._publicKey) {
      // Convert to base58 manually
      return base58Encode(this._publicKey);
    }
    return null;
  }

  /**
   * Get public key bytes
   * @returns {Uint8Array}
   */
  get publicKeyBytes() {
    if (this._keypair) {
      return this._keypair.publicKey.toBytes();
    }
    if (this._adapter) {
      return this._adapter.publicKey.toBytes();
    }
    return this._publicKey;
  }

  /**
   * Sign a message
   * @param {Uint8Array} message - Message to sign
   * @returns {Promise<Uint8Array>} Signature
   */
  async sign(message) {
    if (this._keypair) {
      // Use nacl or tweetnacl for signing
      const { sign } = await import('@noble/ed25519');
      return sign(message, this._secretKey.slice(0, 32));
    }
    if (this._adapter && this._adapter.signMessage) {
      return this._adapter.signMessage(message);
    }
    if (this._secretKey) {
      const { sign } = await import('@noble/ed25519');
      return sign(message, this._secretKey.slice(0, 32));
    }
    throw new Error('No signing capability available');
  }

  /**
   * Sign a transaction
   * @param {Object} transaction - Solana transaction
   * @returns {Promise<Object>} Signed transaction
   */
  async signTransaction(transaction) {
    if (this._keypair) {
      transaction.sign(this._keypair);
      return transaction;
    }
    if (this._adapter && this._adapter.signTransaction) {
      return this._adapter.signTransaction(transaction);
    }
    throw new Error('No transaction signing capability');
  }

  /**
   * Sign multiple transactions
   * @param {Object[]} transactions - Array of transactions
   * @returns {Promise<Object[]>} Signed transactions
   */
  async signAllTransactions(transactions) {
    if (this._adapter && this._adapter.signAllTransactions) {
      return this._adapter.signAllTransactions(transactions);
    }
    return Promise.all(transactions.map((tx) => this.signTransaction(tx)));
  }

  /**
   * Check if wallet is connected/ready
   * @returns {boolean}
   */
  get connected() {
    if (this._adapter) {
      return this._adapter.connected ?? true;
    }
    return !!(this._keypair || this._secretKey);
  }

  /**
   * Export wallet info (NOT secret key!)
   * @returns {Object}
   */
  export() {
    return {
      type: this.type,
      publicKey: this.publicKey,
      connected: this.connected,
    };
  }
}

/**
 * Load wallet from JSON file (Solana CLI format)
 *
 * @param {string} filePath - Path to keypair JSON file
 * @returns {CynicWallet}
 */
export function loadWalletFromFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Keypair file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Solana CLI format: array of 64 numbers
  if (!Array.isArray(data) || data.length !== 64) {
    throw new Error('Invalid keypair file format (expected 64-byte array)');
  }

  const secretKey = new Uint8Array(data);

  return new CynicWallet({
    secretKey,
    type: WalletType.FILE,
  });
}

/**
 * Load wallet from environment variable
 *
 * Supports:
 * - JSON array format: [1,2,3,...,64]
 * - Base58 encoded secret key
 *
 * @param {string} [envVar='CYNIC_SOLANA_KEY'] - Environment variable name
 * @returns {CynicWallet|null}
 */
export function loadWalletFromEnv(envVar = 'CYNIC_SOLANA_KEY') {
  const value = process.env[envVar];
  if (!value) {
    return null;
  }

  let secretKey;

  // Try JSON array first
  if (value.startsWith('[')) {
    try {
      const data = JSON.parse(value);
      if (Array.isArray(data) && data.length === 64) {
        secretKey = new Uint8Array(data);
      }
    } catch {
      // Not JSON, try base58
    }
  }

  // Try base58
  if (!secretKey) {
    try {
      secretKey = base58Decode(value);
      if (secretKey.length !== 64) {
        throw new Error('Invalid secret key length');
      }
    } catch {
      throw new Error(
        `Invalid ${envVar} format (expected JSON array or base58)`
      );
    }
  }

  return new CynicWallet({
    secretKey,
    type: WalletType.ENV,
  });
}

/**
 * Generate a new random keypair
 *
 * WARNING: Store the secret key securely!
 *
 * @returns {{ wallet: CynicWallet, secretKey: Uint8Array }}
 */
export function generateWallet() {
  // Generate ed25519 keypair using Node.js native crypto
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  // Extract raw 32-byte keys from DER encoding
  // ed25519 public key is last 32 bytes of SPKI DER
  // ed25519 private key is at offset 16 in PKCS8 DER (32 bytes)
  const rawPublicKey = publicKey.subarray(-32);
  const rawPrivateKey = privateKey.subarray(16, 48);

  // Combine into 64-byte secret key (Solana format: private + public)
  const secretKey = new Uint8Array(64);
  secretKey.set(rawPrivateKey, 0);
  secretKey.set(rawPublicKey, 32);

  return {
    wallet: new CynicWallet({
      secretKey,
      type: WalletType.KEYPAIR,
    }),
    secretKey,
  };
}

/**
 * Save wallet to file (Solana CLI format)
 *
 * WARNING: This stores the secret key!
 *
 * @param {Uint8Array} secretKey - 64-byte secret key
 * @param {string} filePath - Output file path
 */
export function saveWalletToFile(secretKey, filePath) {
  const data = JSON.stringify(Array.from(secretKey));
  writeFileSync(filePath, data, { mode: 0o600 }); // Restrictive permissions
}

/**
 * Get default wallet path
 * @returns {string}
 */
export function getDefaultWalletPath() {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return join(home, '.config', 'solana', 'cynic-anchor.json');
}

// ═══════════════════════════════════════════════════════════════════════════
// Base58 utilities (minimal implementation)
// ═══════════════════════════════════════════════════════════════════════════

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes to base58
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base58Encode(bytes) {
  if (bytes.length === 0) return '';

  // Count leading zeros
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  // Convert to big integer
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * BigInt(256) + BigInt(byte);
  }

  // Convert to base58
  let result = '';
  while (num > 0n) {
    const remainder = Number(num % BigInt(58));
    result = BASE58_ALPHABET[remainder] + result;
    num = num / BigInt(58);
  }

  // Add leading '1's for each leading zero byte
  return '1'.repeat(zeros) + result;
}

/**
 * Decode base58 to bytes
 * @param {string} str
 * @returns {Uint8Array}
 */
export function base58Decode(str) {
  if (str.length === 0) return new Uint8Array(0);

  // Count leading '1's
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') {
    zeros++;
  }

  // Convert from base58 to big integer
  let num = BigInt(0);
  for (const char of str) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    num = num * BigInt(58) + BigInt(index);
  }

  // Convert to bytes
  const bytes = [];
  while (num > 0n) {
    bytes.unshift(Number(num % BigInt(256)));
    num = num / BigInt(256);
  }

  // Add leading zeros
  const result = new Uint8Array(zeros + bytes.length);
  result.set(bytes, zeros);

  return result;
}

export default {
  WalletType,
  CynicWallet,
  loadWalletFromFile,
  loadWalletFromEnv,
  generateWallet,
  saveWalletToFile,
  getDefaultWalletPath,
  base58Encode,
  base58Decode,
};
