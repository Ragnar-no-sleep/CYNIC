/**
 * @cynic/anchor - Program Client
 *
 * Client for interacting with the CYNIC Anchor program on Solana.
 *
 * "Onchain is truth" - κυνικός
 *
 * @module @cynic/anchor/program-client
 */

'use strict';

import { CYNIC_PROGRAM, SolanaCluster } from './constants.js';
import BN from 'bn.js';

/**
 * IDL for the CYNIC Anchor program
 * @private
 */
let _idl = null;

/**
 * Load the IDL lazily
 * @returns {Promise<Object>}
 */
async function loadIdl() {
  if (_idl) return _idl;
  try {
    // Try to load from package
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    _idl = require('../idl/cynic_anchor.json');
  } catch {
    // Fallback: minimal IDL for instruction encoding
    _idl = {
      address: CYNIC_PROGRAM.PROGRAM_ID,
      metadata: { name: 'cynic_anchor', version: '0.1.0' },
      instructions: [],
    };
  }
  return _idl;
}

/**
 * CYNIC Anchor Program Client
 *
 * Provides methods to interact with the deployed Anchor program:
 * - Initialize program state
 * - Add/remove validators
 * - Anchor merkle roots
 * - Verify anchored roots
 */
export class CynicProgramClient {
  /**
   * @param {Object} config - Configuration
   * @param {string} [config.cluster] - Solana cluster URL
   * @param {Object} config.wallet - Wallet for signing
   * @param {string} [config.programId] - Program ID (defaults to deployed)
   */
  constructor(config = {}) {
    this.cluster = config.cluster || SolanaCluster.DEVNET;
    this.wallet = config.wallet;
    this.programId = config.programId || CYNIC_PROGRAM.PROGRAM_ID;

    // Lazy-loaded Solana dependencies
    this._connection = null;
    this._program = null;
    this._provider = null;
  }

  /**
   * Initialize Solana connection and Anchor program
   * @private
   */
  async _init() {
    if (this._connection) return;

    // Lazy import dependencies
    const { Connection, PublicKey, Keypair } = await import('@solana/web3.js');
    const anchorPkg = await import('@anchor-lang/core');
    const { AnchorProvider, Program } = anchorPkg.default || anchorPkg;

    this._connection = new Connection(this.cluster, 'confirmed');

    // Create provider
    let keypair;
    if (this.wallet._secretKey) {
      keypair = Keypair.fromSecretKey(this.wallet._secretKey);
    } else if (this.wallet._keypair) {
      keypair = this.wallet._keypair;
    } else if (this.wallet.secretKey) {
      keypair = Keypair.fromSecretKey(this.wallet.secretKey);
    }

    // Create a minimal wallet interface
    const walletAdapter = {
      publicKey: keypair.publicKey,
      signTransaction: async (tx) => {
        tx.sign(keypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        txs.forEach((tx) => tx.sign(keypair));
        return txs;
      },
    };

    this._provider = new AnchorProvider(this._connection, walletAdapter, {
      commitment: 'confirmed',
    });

    // Load IDL and create program
    const idl = await loadIdl();
    this._program = new Program(idl, this._provider);
    this._PublicKey = PublicKey;
  }

  /**
   * Get the state PDA address
   * @returns {Promise<[PublicKey, number]>}
   */
  async getStatePda() {
    await this._init();
    return this._PublicKey.findProgramAddressSync(
      [Buffer.from(CYNIC_PROGRAM.STATE_SEED)],
      new this._PublicKey(this.programId)
    );
  }

  /**
   * Get a root entry PDA address
   * @param {Buffer|Uint8Array} merkleRoot - 32-byte merkle root
   * @returns {Promise<[PublicKey, number]>}
   */
  async getRootPda(merkleRoot) {
    await this._init();
    return this._PublicKey.findProgramAddressSync(
      [Buffer.from(CYNIC_PROGRAM.ROOT_SEED), Buffer.from(merkleRoot)],
      new this._PublicKey(this.programId)
    );
  }

  /**
   * Initialize the program state
   * @returns {Promise<{signature: string}>}
   */
  async initialize() {
    await this._init();

    const [statePda] = await this.getStatePda();

    const signature = await this._program.methods
      .initialize()
      .accounts({})
      .rpc();

    return { signature, state: statePda.toString() };
  }

  /**
   * Add a validator to the registry
   * @param {string} validatorPubkey - Validator's public key
   * @returns {Promise<{signature: string}>}
   */
  async addValidator(validatorPubkey) {
    await this._init();

    const validator = new this._PublicKey(validatorPubkey);

    const signature = await this._program.methods
      .addValidator(validator)
      .accounts({})
      .rpc();

    return { signature };
  }

  /**
   * Remove a validator from the registry
   * @param {string} validatorPubkey - Validator's public key
   * @returns {Promise<{signature: string}>}
   */
  async removeValidator(validatorPubkey) {
    await this._init();

    const validator = new this._PublicKey(validatorPubkey);

    const signature = await this._program.methods
      .removeValidator(validator)
      .accounts({})
      .rpc();

    return { signature };
  }

  /**
   * Anchor a merkle root on-chain
   * @param {string|Buffer} merkleRoot - 32-byte merkle root (hex string or Buffer)
   * @param {number} itemCount - Number of items in the root
   * @param {number} blockHeight - PoJ block height
   * @returns {Promise<{signature: string, slot: number, rootPda: string}>}
   */
  async anchorRoot(merkleRoot, itemCount, blockHeight) {
    await this._init();

    // Convert hex string to bytes if needed
    const rootBytes =
      typeof merkleRoot === 'string'
        ? Buffer.from(merkleRoot, 'hex')
        : Buffer.from(merkleRoot);

    if (rootBytes.length !== 32) {
      throw new Error('Merkle root must be 32 bytes');
    }

    const [rootPda] = await this.getRootPda(rootBytes);

    const signature = await this._program.methods
      .anchorRoot(Array.from(rootBytes), itemCount, new BN(blockHeight))
      .accounts({
        rootEntry: rootPda,
      })
      .rpc();

    // Get transaction info for slot
    const tx = await this._connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    return {
      signature,
      slot: tx?.slot || 0,
      rootPda: rootPda.toString(),
    };
  }

  /**
   * Verify a merkle root exists on-chain
   * @param {string|Buffer} merkleRoot - 32-byte merkle root
   * @returns {Promise<{verified: boolean, entry?: Object, error?: string}>}
   */
  async verifyRoot(merkleRoot) {
    await this._init();

    const rootBytes =
      typeof merkleRoot === 'string'
        ? Buffer.from(merkleRoot, 'hex')
        : Buffer.from(merkleRoot);

    if (rootBytes.length !== 32) {
      return { verified: false, error: 'Merkle root must be 32 bytes' };
    }

    try {
      const [rootPda] = await this.getRootPda(rootBytes);

      // Fetch the root entry account
      const entry = await this._program.account.rootEntry.fetch(rootPda);

      return {
        verified: true,
        entry: {
          merkleRoot: Buffer.from(entry.merkleRoot).toString('hex'),
          itemCount: entry.itemCount,
          blockHeight: Number(entry.blockHeight),
          validator: entry.validator.toString(),
          timestamp: Number(entry.timestamp),
          slot: Number(entry.slot),
          index: Number(entry.index),
        },
      };
    } catch (error) {
      if (error.message.includes('Account does not exist')) {
        return { verified: false, error: 'Root not found on-chain' };
      }
      return { verified: false, error: error.message };
    }
  }

  /**
   * Get the program state
   * @returns {Promise<Object>}
   */
  async getState() {
    await this._init();

    const [statePda] = await this.getStatePda();

    try {
      const state = await this._program.account.cynicState.fetch(statePda);

      return {
        authority: state.authority.toString(),
        initializedAt: Number(state.initializedAt),
        rootCount: Number(state.rootCount),
        validatorCount: state.validatorCount,
        validators: state.validators
          .slice(0, state.validatorCount)
          .map((v) => v.toString()),
        lastAnchorSlot: Number(state.lastAnchorSlot),
      };
    } catch (error) {
      if (error.message.includes('Account does not exist')) {
        return null; // Not initialized
      }
      throw error;
    }
  }

  /**
   * Check if program is initialized
   * @returns {Promise<boolean>}
   */
  async isInitialized() {
    const state = await this.getState();
    return state !== null;
  }

  /**
   * Check if a public key is a validator
   * @param {string} pubkey - Public key to check
   * @returns {Promise<boolean>}
   */
  async isValidator(pubkey) {
    const state = await this.getState();
    if (!state) return false;
    return state.validators.includes(pubkey);
  }

  /**
   * Transfer authority to a new account
   * @param {string} newAuthority - New authority public key
   * @returns {Promise<{signature: string}>}
   */
  async transferAuthority(newAuthority) {
    await this._init();

    const newAuth = new this._PublicKey(newAuthority);

    const signature = await this._program.methods
      .transferAuthority(newAuth)
      .accounts({})
      .rpc();

    return { signature };
  }
}

/**
 * Create a CYNIC program client
 * @param {Object} config - Configuration
 * @returns {CynicProgramClient}
 */
export function createProgramClient(config = {}) {
  return new CynicProgramClient(config);
}
