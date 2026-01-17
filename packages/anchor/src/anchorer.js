/**
 * @cynic/anchor - Solana Anchorer
 *
 * Anchors merkle roots to Solana for immutable truth.
 *
 * "Onchain is truth" - κυνικός
 *
 * @module @cynic/anchor/anchorer
 */

'use strict';

import { createHash } from 'crypto';
import {
  AnchorStatus,
  ANCHOR_CONSTANTS,
  SolanaCluster,
  DEFAULT_CONFIG,
} from './constants.js';

/**
 * Result of an anchor operation
 * @typedef {Object} AnchorResult
 * @property {boolean} success - Whether anchor succeeded
 * @property {string} [signature] - Solana transaction signature
 * @property {string} [slot] - Solana slot number
 * @property {string} merkleRoot - The anchored merkle root
 * @property {number} timestamp - Unix timestamp
 * @property {string} [error] - Error message if failed
 */

/**
 * Anchor record for tracking
 * @typedef {Object} AnchorRecord
 * @property {string} id - Unique anchor ID
 * @property {string} merkleRoot - 32-byte hex merkle root
 * @property {AnchorStatus} status - Current status
 * @property {string} [signature] - Solana tx signature
 * @property {number} [slot] - Solana slot
 * @property {number} createdAt - Creation timestamp
 * @property {number} [anchoredAt] - Anchor timestamp
 * @property {number} retryCount - Number of retries
 * @property {string[]} itemIds - IDs of items in this anchor
 */

/**
 * Solana Anchorer
 *
 * Handles anchoring merkle roots to Solana blockchain.
 * Uses memo program for storing roots with minimal cost.
 */
export class SolanaAnchorer {
  /**
   * @param {Object} config - Configuration
   * @param {string} [config.cluster] - Solana cluster URL
   * @param {Object} [config.wallet] - Wallet for signing (keypair or adapter)
   * @param {Function} [config.onAnchor] - Callback when anchor completes
   * @param {Function} [config.onError] - Callback on anchor error
   */
  constructor(config = {}) {
    this.cluster = config.cluster || DEFAULT_CONFIG.cluster;
    this.wallet = config.wallet;
    this.onAnchor = config.onAnchor;
    this.onError = config.onError;

    // Track anchors
    this.anchors = new Map();
    this.pendingCount = 0;

    // Stats
    this.stats = {
      totalAnchored: 0,
      totalFailed: 0,
      totalItems: 0,
      lastAnchorTime: null,
      lastSignature: null,
    };
  }

  /**
   * Generate anchor ID
   * @param {string} merkleRoot - Merkle root to anchor
   * @returns {string} Unique anchor ID
   */
  generateAnchorId(merkleRoot) {
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${merkleRoot}:${timestamp}`)
      .digest('hex')
      .slice(0, 16);
    return `anc_${hash}`;
  }

  /**
   * Create anchor record
   * @param {string} merkleRoot - 32-byte hex merkle root
   * @param {string[]} itemIds - IDs of items included
   * @returns {AnchorRecord}
   */
  createAnchorRecord(merkleRoot, itemIds = []) {
    const id = this.generateAnchorId(merkleRoot);
    const record = {
      id,
      merkleRoot,
      status: AnchorStatus.QUEUED,
      signature: null,
      slot: null,
      createdAt: Date.now(),
      anchoredAt: null,
      retryCount: 0,
      itemIds,
    };

    this.anchors.set(id, record);
    this.pendingCount++;

    return record;
  }

  /**
   * Anchor a merkle root to Solana
   *
   * Uses the Memo program to store the root on-chain.
   * This is the most cost-effective way to anchor data.
   *
   * @param {string} merkleRoot - 32-byte hex merkle root
   * @param {string[]} [itemIds] - Optional IDs of items included
   * @returns {Promise<AnchorResult>}
   */
  async anchor(merkleRoot, itemIds = []) {
    // Validate merkle root format
    if (!/^[a-f0-9]{64}$/i.test(merkleRoot)) {
      return {
        success: false,
        merkleRoot,
        timestamp: Date.now(),
        error: 'Invalid merkle root format (expected 64 hex chars)',
      };
    }

    // Create record
    const record = this.createAnchorRecord(merkleRoot, itemIds);

    // Check wallet
    if (!this.wallet) {
      // No wallet - simulate for testing/development
      return this._simulateAnchor(record);
    }

    try {
      // Real Solana anchoring
      const result = await this._sendAnchorTransaction(record);

      // Update record
      record.status = AnchorStatus.ANCHORED;
      record.signature = result.signature;
      record.slot = result.slot;
      record.anchoredAt = Date.now();

      // Update stats
      this.stats.totalAnchored++;
      this.stats.totalItems += itemIds.length;
      this.stats.lastAnchorTime = record.anchoredAt;
      this.stats.lastSignature = result.signature;
      this.pendingCount--;

      // Callback
      if (this.onAnchor) {
        this.onAnchor(record);
      }

      return {
        success: true,
        signature: result.signature,
        slot: result.slot,
        merkleRoot,
        timestamp: record.anchoredAt,
      };
    } catch (error) {
      // Handle failure
      record.status = AnchorStatus.FAILED;
      record.retryCount++;
      this.stats.totalFailed++;
      this.pendingCount--;

      if (this.onError) {
        this.onError(record, error);
      }

      return {
        success: false,
        merkleRoot,
        timestamp: Date.now(),
        error: error.message,
      };
    }
  }

  /**
   * Send anchor transaction to Solana
   * @param {AnchorRecord} record - Anchor record
   * @returns {Promise<{signature: string, slot: number}>}
   * @private
   */
  async _sendAnchorTransaction(record) {
    // Build memo data
    const memo = `${ANCHOR_CONSTANTS.MEMO_PREFIX}${record.merkleRoot}`;

    // This is where we'd use @solana/web3.js
    // For now, we throw to indicate wallet integration needed
    throw new Error(
      'Solana wallet integration required. ' +
        'Set wallet in config or use simulation mode.'
    );

    // Real implementation would:
    // 1. Create memo instruction
    // 2. Build transaction
    // 3. Sign with wallet
    // 4. Send and confirm
    // 5. Return signature and slot
  }

  /**
   * Simulate anchor for testing/development
   * @param {AnchorRecord} record - Anchor record
   * @returns {AnchorResult}
   * @private
   */
  _simulateAnchor(record) {
    // Generate fake signature (base58-like)
    const fakeSignature = createHash('sha256')
      .update(`sim:${record.merkleRoot}:${Date.now()}`)
      .digest('base64')
      .replace(/[+/=]/g, '')
      .slice(0, 88);

    const fakeSlot = Math.floor(Date.now() / 400); // ~Solana slot rate

    // Update record
    record.status = AnchorStatus.ANCHORED;
    record.signature = `sim_${fakeSignature}`;
    record.slot = fakeSlot;
    record.anchoredAt = Date.now();

    // Update stats
    this.stats.totalAnchored++;
    this.stats.totalItems += record.itemIds.length;
    this.stats.lastAnchorTime = record.anchoredAt;
    this.stats.lastSignature = record.signature;
    this.pendingCount--;

    // Callback
    if (this.onAnchor) {
      this.onAnchor(record);
    }

    return {
      success: true,
      signature: record.signature,
      slot: record.slot,
      merkleRoot: record.merkleRoot,
      timestamp: record.anchoredAt,
      simulated: true,
    };
  }

  /**
   * Retry a failed anchor
   * @param {string} anchorId - Anchor ID to retry
   * @returns {Promise<AnchorResult>}
   */
  async retry(anchorId) {
    const record = this.anchors.get(anchorId);
    if (!record) {
      throw new Error(`Anchor not found: ${anchorId}`);
    }

    if (record.status !== AnchorStatus.FAILED) {
      throw new Error(`Cannot retry anchor in status: ${record.status}`);
    }

    if (record.retryCount >= ANCHOR_CONSTANTS.MAX_RETRY_ATTEMPTS) {
      throw new Error(
        `Max retries (${ANCHOR_CONSTANTS.MAX_RETRY_ATTEMPTS}) exceeded`
      );
    }

    // Reset and retry
    record.status = AnchorStatus.QUEUED;
    this.pendingCount++;

    return this.anchor(record.merkleRoot, record.itemIds);
  }

  /**
   * Get anchor by ID
   * @param {string} anchorId - Anchor ID
   * @returns {AnchorRecord|undefined}
   */
  getAnchor(anchorId) {
    return this.anchors.get(anchorId);
  }

  /**
   * Get anchor by signature
   * @param {string} signature - Solana tx signature
   * @returns {AnchorRecord|undefined}
   */
  getAnchorBySignature(signature) {
    for (const record of this.anchors.values()) {
      if (record.signature === signature) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * Get all pending anchors
   * @returns {AnchorRecord[]}
   */
  getPendingAnchors() {
    return Array.from(this.anchors.values()).filter(
      (r) => r.status === AnchorStatus.QUEUED
    );
  }

  /**
   * Get all failed anchors
   * @returns {AnchorRecord[]}
   */
  getFailedAnchors() {
    return Array.from(this.anchors.values()).filter(
      (r) => r.status === AnchorStatus.FAILED
    );
  }

  /**
   * Get anchorer statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      pendingCount: this.pendingCount,
      totalRecords: this.anchors.size,
      cluster: this.cluster,
      hasWallet: !!this.wallet,
    };
  }

  /**
   * Verify an anchor exists on Solana
   * @param {string} signature - Solana tx signature
   * @returns {Promise<boolean>}
   */
  async verifyAnchor(signature) {
    // Skip simulation signatures
    if (signature.startsWith('sim_')) {
      return true; // Simulated anchors are "verified"
    }

    // Would query Solana to verify transaction exists
    // For now, return false to indicate verification not implemented
    throw new Error(
      'Solana verification requires @solana/web3.js connection'
    );
  }

  /**
   * Export anchorer state
   * @returns {Object}
   */
  export() {
    return {
      anchors: Array.from(this.anchors.entries()),
      stats: { ...this.stats },
      cluster: this.cluster,
    };
  }

  /**
   * Import anchorer state
   * @param {Object} state - Exported state
   */
  import(state) {
    if (state.anchors) {
      this.anchors = new Map(state.anchors);
      this.pendingCount = Array.from(this.anchors.values()).filter(
        (r) => r.status === AnchorStatus.QUEUED
      ).length;
    }
    if (state.stats) {
      this.stats = { ...this.stats, ...state.stats };
    }
    if (state.cluster) {
      this.cluster = state.cluster;
    }
  }
}

/**
 * Create a Solana anchorer instance
 * @param {Object} [config] - Configuration
 * @returns {SolanaAnchorer}
 */
export function createAnchorer(config = {}) {
  return new SolanaAnchorer(config);
}
