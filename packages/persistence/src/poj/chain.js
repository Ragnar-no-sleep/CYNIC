/**
 * PoJ Chain Manager
 *
 * Manages the Proof of Judgment blockchain with φ-timed slots,
 * block production, and chain state.
 *
 * "Every judgment is recorded, every truth is chained" - κυνικός
 *
 * @module @cynic/persistence/poj/chain
 */

'use strict';

import { EventEmitter } from 'events';
import {
  PoJBlock,
  Attestation,
  JudgmentRef,
  createGenesisBlock,
  createBlock,
  computeMerkleRoot,
  POJ_CONSTANTS,
} from './block.js';
import { BlockStore } from '../dag/store.js';
import { HAMTIndex } from '../dag/hamt.js';

const {
  PHI,
  PHI_INV,
  SLOT_DURATION_MS,
  MAX_JUDGMENTS_PER_BLOCK,
  QUORUM_THRESHOLD,
} = POJ_CONSTANTS;

// Chain timing constants
const EPOCH_LENGTH = 32; // Slots per epoch
const HEARTBEAT_MS = 61800; // φ-heartbeat (61.8 seconds)

/**
 * Pending judgment pool
 */
class JudgmentPool {
  constructor(maxSize = 1000) {
    this.pending = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Add judgment to pool
   * @param {Object} judgment - Judgment to add
   * @returns {boolean} True if added
   */
  add(judgment) {
    if (this.pending.size >= this.maxSize) {
      // Remove oldest
      const oldest = this.pending.keys().next().value;
      this.pending.delete(oldest);
    }

    const id = judgment.id || judgment.data?.id;
    if (this.pending.has(id)) return false;

    this.pending.set(id, {
      ...judgment,
      addedAt: Date.now(),
    });

    return true;
  }

  /**
   * Get next batch of judgments for block
   * @param {number} [limit=MAX_JUDGMENTS_PER_BLOCK] - Max judgments
   * @returns {Object[]} Judgments for block
   */
  getBatch(limit = MAX_JUDGMENTS_PER_BLOCK) {
    const batch = [];
    const toRemove = [];

    for (const [id, judgment] of this.pending) {
      if (batch.length >= limit) break;
      batch.push(judgment);
      toRemove.push(id);
    }

    // Remove from pool
    for (const id of toRemove) {
      this.pending.delete(id);
    }

    return batch;
  }

  /**
   * Return judgments to pool (on block rejection)
   * @param {Object[]} judgments - Judgments to return
   */
  returnBatch(judgments) {
    for (const judgment of judgments) {
      const id = judgment.id || judgment.data?.id;
      this.pending.set(id, judgment);
    }
  }

  /**
   * Get pool size
   * @returns {number} Number of pending judgments
   */
  get size() {
    return this.pending.size;
  }

  /**
   * Check if judgment is in pool
   * @param {string} id - Judgment ID
   * @returns {boolean} True if in pool
   */
  has(id) {
    return this.pending.has(id);
  }

  /**
   * Clear the pool
   */
  clear() {
    this.pending.clear();
  }
}

/**
 * PoJ Chain - Proof of Judgment Blockchain
 */
export class PoJChain extends EventEmitter {
  /**
   * @param {Object} config - Chain configuration
   */
  constructor(config = {}) {
    super();

    this.config = {
      basePath: config.basePath || './data/poj',
      nodeId: config.nodeId || `node_${Date.now().toString(36)}`,
      nodeKey: config.nodeKey || `key_${Date.now().toString(36)}`,
      isValidator: config.isValidator !== false,
      ...config,
    };

    // Storage
    this.store = new BlockStore({
      basePath: `${this.config.basePath}/blocks`,
    });

    // Indices
    this._blockIndex = null; // slot -> block CID
    this._hashIndex = null;  // hash -> block CID
    this._judgmentIndex = null; // judgment ID -> block slot

    // Chain state
    this._genesis = null;
    this._head = null;
    this._headSlot = -1;
    this._finalizedSlot = -1;

    // Pending judgments
    this.pool = new JudgmentPool(config.poolSize || 1000);

    // Slot timer
    this._slotTimer = null;
    this._currentSlot = 0;
    this._epochStartTime = 0;

    // Validators (simplified - would be from registry)
    this._validators = new Set();

    this._initialized = false;
  }

  /**
   * Initialize the chain
   * @param {string} [headCid] - Optional existing head CID
   */
  async init(headCid = null) {
    if (this._initialized) return;

    await this.store.init();

    // Initialize indices
    this._blockIndex = new HAMTIndex(this.store);
    this._hashIndex = new HAMTIndex(this.store);
    this._judgmentIndex = new HAMTIndex(this.store);

    await this._blockIndex.init();
    await this._hashIndex.init();
    await this._judgmentIndex.init();

    if (headCid) {
      await this._loadChain(headCid);
    } else {
      await this._initializeGenesis();
    }

    // Register self as validator
    if (this.config.isValidator) {
      this._validators.add(this.config.nodeId);
    }

    this._initialized = true;
    this.emit('initialized', {
      genesis: this._genesis?.hash,
      head: this._head?.hash,
      headSlot: this._headSlot,
    });
  }

  /**
   * Initialize genesis block
   * @private
   */
  async _initializeGenesis() {
    this._genesis = createGenesisBlock(this.config.nodeId);
    await this._storeBlock(this._genesis);

    this._head = this._genesis;
    this._headSlot = 0;
    this._finalizedSlot = 0;

    this._epochStartTime = Date.now();
  }

  /**
   * Load existing chain
   * @private
   */
  async _loadChain(headCid) {
    const headData = await this.store.get(headCid);
    if (!headData) {
      throw new Error('Head block not found');
    }

    this._head = PoJBlock.decode(headData);
    this._headSlot = this._head.slot;

    // Walk back to find genesis and finalized slot
    let current = this._head;
    while (current.prevHash) {
      const prevCid = await this._hashIndex.get(current.prevHash);
      if (!prevCid) break;

      const prevData = await this.store.get(prevCid);
      current = PoJBlock.decode(prevData);

      if (current.finalized && this._finalizedSlot < 0) {
        this._finalizedSlot = current.slot;
      }
    }

    this._genesis = current;
    if (this._finalizedSlot < 0) {
      this._finalizedSlot = this._genesis.slot;
    }

    // Calculate epoch start time based on current slot
    const timeSinceGenesis = (this._headSlot * SLOT_DURATION_MS);
    this._epochStartTime = Date.now() - timeSinceGenesis;
  }

  /**
   * Store a block and update indices
   * @private
   */
  async _storeBlock(block) {
    // Store block
    const cid = block.cid;
    await this.store.put(cid, block.encode());

    // Update indices
    await this._blockIndex.set(String(block.slot), cid);
    await this._hashIndex.set(block.hash, cid);

    // Index judgments
    for (const judgment of block.judgments) {
      await this._judgmentIndex.set(judgment.id, String(block.slot));
    }

    return cid;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAIN STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get genesis block
   * @returns {PoJBlock} Genesis block
   */
  get genesis() {
    return this._genesis;
  }

  /**
   * Get head block
   * @returns {PoJBlock} Head block
   */
  get head() {
    return this._head;
  }

  /**
   * Get current head slot
   * @returns {number} Head slot number
   */
  get headSlot() {
    return this._headSlot;
  }

  /**
   * Get last finalized slot
   * @returns {number} Finalized slot number
   */
  get finalizedSlot() {
    return this._finalizedSlot;
  }

  /**
   * Get current slot based on time
   * @returns {number} Current slot
   */
  getCurrentSlot() {
    const elapsed = Date.now() - this._epochStartTime;
    return Math.floor(elapsed / SLOT_DURATION_MS);
  }

  /**
   * Get current epoch
   * @returns {number} Current epoch
   */
  getCurrentEpoch() {
    return Math.floor(this.getCurrentSlot() / EPOCH_LENGTH);
  }

  /**
   * Get chain height (number of blocks)
   * @returns {number} Chain height
   */
  get height() {
    return this._headSlot + 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get block by slot
   * @param {number} slot - Slot number
   * @returns {Promise<PoJBlock|null>} Block or null
   */
  async getBlockBySlot(slot) {
    const cid = await this._blockIndex.get(String(slot));
    if (!cid) return null;

    const data = await this.store.get(cid);
    if (!data) return null;

    return PoJBlock.decode(data);
  }

  /**
   * Get block by hash
   * @param {string} hash - Block hash
   * @returns {Promise<PoJBlock|null>} Block or null
   */
  async getBlockByHash(hash) {
    const cid = await this._hashIndex.get(hash);
    if (!cid) return null;

    const data = await this.store.get(cid);
    if (!data) return null;

    return PoJBlock.decode(data);
  }

  /**
   * Get blocks in range
   * @param {number} startSlot - Start slot (inclusive)
   * @param {number} endSlot - End slot (inclusive)
   * @returns {Promise<PoJBlock[]>} Blocks in range
   */
  async getBlockRange(startSlot, endSlot) {
    const blocks = [];

    for (let slot = startSlot; slot <= endSlot; slot++) {
      const block = await this.getBlockBySlot(slot);
      if (block) blocks.push(block);
    }

    return blocks;
  }

  /**
   * Get recent blocks
   * @param {number} [count=10] - Number of blocks
   * @returns {Promise<PoJBlock[]>} Recent blocks
   */
  async getRecentBlocks(count = 10) {
    const startSlot = Math.max(0, this._headSlot - count + 1);
    return this.getBlockRange(startSlot, this._headSlot);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JUDGMENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add judgment to pending pool
   * @param {Object} judgment - Judgment to add
   * @returns {boolean} True if added
   */
  addJudgment(judgment) {
    const added = this.pool.add(judgment);
    if (added) {
      this.emit('judgment:pending', { judgment });
    }
    return added;
  }

  /**
   * Find block containing a judgment
   * @param {string} judgmentId - Judgment ID
   * @returns {Promise<PoJBlock|null>} Block or null
   */
  async findJudgmentBlock(judgmentId) {
    const slotStr = await this._judgmentIndex.get(judgmentId);
    if (!slotStr) return null;

    return this.getBlockBySlot(parseInt(slotStr, 10));
  }

  /**
   * Check if judgment is in chain
   * @param {string} judgmentId - Judgment ID
   * @returns {Promise<boolean>} True if in chain
   */
  async hasJudgment(judgmentId) {
    return this._judgmentIndex.has(judgmentId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCK PRODUCTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Propose a new block
   * @returns {Promise<PoJBlock|null>} Proposed block or null
   */
  async proposeBlock() {
    if (!this.config.isValidator) {
      return null;
    }

    // Get pending judgments
    const judgments = this.pool.getBatch();
    if (judgments.length === 0) {
      return null; // No judgments to include
    }

    const nextSlot = this._headSlot + 1;

    const block = createBlock({
      slot: nextSlot,
      prevBlock: this._head,
      judgments,
      proposer: this.config.nodeId,
    });

    // Self-attest
    const attestation = new Attestation({
      nodeId: this.config.nodeId,
      slot: nextSlot,
      blockHash: block.hash,
    }).sign(this.config.nodeKey);

    block.addAttestation(attestation);

    this.emit('block:proposed', { block });

    return block;
  }

  /**
   * Process and add a block to the chain
   * @param {PoJBlock} block - Block to process
   * @returns {Promise<{success: boolean, error?: string}>} Result
   */
  async processBlock(block) {
    // Validate block
    const validation = block.validate();
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Check slot is next
    if (block.slot !== this._headSlot + 1) {
      return { success: false, error: `Invalid slot: expected ${this._headSlot + 1}, got ${block.slot}` };
    }

    // Check prevHash
    if (block.prevHash !== this._head.hash) {
      return { success: false, error: 'Invalid previous hash' };
    }

    // Store block
    await this._storeBlock(block);

    // Update head
    this._head = block;
    this._headSlot = block.slot;

    this.emit('block:added', { block, slot: block.slot });

    // Check for finalization
    await this._checkFinalization(block);

    return { success: true };
  }

  /**
   * Check if block can be finalized
   * @private
   */
  async _checkFinalization(block) {
    if (block.finalized) return;

    const totalValidators = this._validators.size;
    if (block.hasQuorum(totalValidators)) {
      block.finalized = true;
      this._finalizedSlot = block.slot;

      // Re-store with finalized flag
      await this._storeBlock(block);

      this.emit('block:finalized', { block, slot: block.slot });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTESTATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create attestation for a block
   * @param {PoJBlock} block - Block to attest
   * @returns {Attestation} Signed attestation
   */
  createAttestation(block) {
    return new Attestation({
      nodeId: this.config.nodeId,
      slot: block.slot,
      blockHash: block.hash,
    }).sign(this.config.nodeKey);
  }

  /**
   * Process an attestation
   * @param {Attestation} attestation - Attestation to process
   * @returns {Promise<boolean>} True if processed
   */
  async processAttestation(attestation) {
    // Find the block
    const block = await this.getBlockBySlot(attestation.slot);
    if (!block) return false;

    // Add attestation
    const added = block.addAttestation(attestation);
    if (!added) return false;

    // Re-store block with new attestation
    await this._storeBlock(block);

    this.emit('attestation:received', { attestation, block });

    // Check finalization
    await this._checkFinalization(block);

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATOR MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a validator
   * @param {string} nodeId - Validator node ID
   */
  registerValidator(nodeId) {
    this._validators.add(nodeId);
    this.emit('validator:registered', { nodeId });
  }

  /**
   * Unregister a validator
   * @param {string} nodeId - Validator node ID
   */
  unregisterValidator(nodeId) {
    this._validators.delete(nodeId);
    this.emit('validator:unregistered', { nodeId });
  }

  /**
   * Get validator count
   * @returns {number} Number of validators
   */
  get validatorCount() {
    return this._validators.size;
  }

  /**
   * Check if node is a validator
   * @param {string} nodeId - Node ID to check
   * @returns {boolean} True if validator
   */
  isValidator(nodeId) {
    return this._validators.has(nodeId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SLOT TIMING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start slot timer for automatic block production
   */
  startSlotTimer() {
    if (this._slotTimer) return;

    const tick = async () => {
      const currentSlot = this.getCurrentSlot();

      if (currentSlot > this._currentSlot) {
        this._currentSlot = currentSlot;
        this.emit('slot:tick', { slot: currentSlot });

        // Try to produce block if we're validator and have pending judgments
        if (this.config.isValidator && this.pool.size > 0) {
          const block = await this.proposeBlock();
          if (block) {
            await this.processBlock(block);
          }
        }
      }
    };

    // Run immediately then on interval
    tick();
    this._slotTimer = setInterval(tick, SLOT_DURATION_MS);
  }

  /**
   * Stop slot timer
   */
  stopSlotTimer() {
    if (this._slotTimer) {
      clearInterval(this._slotTimer);
      this._slotTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAIN VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify chain integrity
   * @param {number} [fromSlot=0] - Starting slot
   * @param {number} [toSlot] - Ending slot (default: head)
   * @returns {Promise<Object>} Verification result
   */
  async verifyChain(fromSlot = 0, toSlot = this._headSlot) {
    const result = {
      valid: true,
      blocksChecked: 0,
      errors: [],
    };

    let prevBlock = null;

    for (let slot = fromSlot; slot <= toSlot; slot++) {
      const block = await this.getBlockBySlot(slot);
      if (!block) continue;

      result.blocksChecked++;

      // Validate block structure
      const validation = block.validate();
      if (!validation.valid) {
        result.valid = false;
        result.errors.push({
          slot,
          type: 'validation',
          errors: validation.errors,
        });
      }

      // Check chain linkage
      if (prevBlock && block.prevHash !== prevBlock.hash) {
        result.valid = false;
        result.errors.push({
          slot,
          type: 'linkage',
          expected: prevBlock.hash,
          actual: block.prevHash,
        });
      }

      prevBlock = block;
    }

    return result;
  }

  /**
   * Get merkle proof for a judgment
   * @param {string} judgmentId - Judgment ID
   * @returns {Promise<Object|null>} Merkle proof or null
   */
  async getJudgmentProof(judgmentId) {
    const block = await this.findJudgmentBlock(judgmentId);
    if (!block) return null;

    const judgmentCids = block.judgments.map(j => j.cid);
    const index = block.judgments.findIndex(j => j.id === judgmentId);
    if (index < 0) return null;

    // Build merkle proof (simplified)
    const proof = {
      judgmentId,
      blockSlot: block.slot,
      blockHash: block.hash,
      judgmentsRoot: block.header.judgmentsRoot,
      index,
      totalJudgments: judgmentCids.length,
      path: [], // Would include sibling hashes for full proof
    };

    return proof;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get chain statistics
   * @returns {Promise<Object>} Chain stats
   */
  async getStats() {
    let totalJudgments = 0;
    let totalAttestations = 0;
    let finalizedBlocks = 0;

    for (let slot = 0; slot <= this._headSlot; slot++) {
      const block = await this.getBlockBySlot(slot);
      if (block) {
        totalJudgments += block.judgmentCount;
        totalAttestations += block.attestations.length;
        if (block.finalized) finalizedBlocks++;
      }
    }

    return {
      genesisHash: this._genesis?.hash,
      headHash: this._head?.hash,
      headSlot: this._headSlot,
      finalizedSlot: this._finalizedSlot,
      height: this.height,
      totalJudgments,
      totalAttestations,
      finalizedBlocks,
      pendingJudgments: this.pool.size,
      validatorCount: this._validators.size,
      currentSlot: this.getCurrentSlot(),
      currentEpoch: this.getCurrentEpoch(),
    };
  }

  /**
   * Export chain data
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Export stats
   */
  async export(outputPath) {
    const blocks = [];

    for (let slot = 0; slot <= this._headSlot; slot++) {
      const block = await this.getBlockBySlot(slot);
      if (block) {
        blocks.push(block.toJSON());
      }
    }

    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify({
      version: 1,
      nodeId: this.config.nodeId,
      exportedAt: Date.now(),
      blocks,
    }, null, 2));

    return {
      blocksExported: blocks.length,
      headSlot: this._headSlot,
    };
  }
}

export default PoJChain;
