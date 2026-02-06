/**
 * Block Store
 *
 * Persistent block storage backed by PostgreSQL.
 * Provides getBlocks/storeBlock callbacks for StateSyncManager.
 *
 * Wire into NetworkNode via:
 *   node.wireBlockStore(blockStore.callbacks());
 *
 * "Chaque bloc est une vérité gravée" - κυνικός
 *
 * @module @cynic/node/network/block-store
 */

'use strict';

import { EventEmitter } from 'events';
import { createLogger } from '@cynic/core';

const log = createLogger('BlockStore');

export class BlockStore extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.pool] - PostgreSQL connection pool
   */
  constructor(options = {}) {
    super();
    this._pool = options.pool || null;
    this._memoryStore = new Map(); // slot -> block (fallback when no pool)
    this._stats = {
      blocksStored: 0,
      blocksRetrieved: 0,
      errors: 0,
    };
  }

  /**
   * Store a block. Uses PostgreSQL if available, memory otherwise.
   *
   * @param {Object} block
   * @param {number} block.slot
   * @param {string} block.hash
   * @param {string} block.proposer
   * @param {string} [block.merkle_root]
   * @param {Array} [block.judgments]
   * @param {number} [block.judgment_count]
   * @param {string} [block.prev_hash]
   * @param {number} [block.timestamp]
   */
  async storeBlock(block) {
    if (!block || block.slot === undefined) return;

    if (this._pool) {
      try {
        await this._pool.query(
          `INSERT INTO blocks (slot, hash, proposer, merkle_root, judgments, judgment_count, parent_hash, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (slot) DO UPDATE SET
             hash = EXCLUDED.hash,
             proposer = EXCLUDED.proposer,
             merkle_root = EXCLUDED.merkle_root,
             judgments = EXCLUDED.judgments,
             judgment_count = EXCLUDED.judgment_count,
             parent_hash = EXCLUDED.parent_hash`,
          [
            block.slot,
            block.hash || block.block_hash,
            block.proposer,
            block.merkle_root || block.judgments_root || null,
            JSON.stringify(block.judgments || []),
            block.judgment_count || (block.judgments?.length || 0),
            block.prev_hash || block.parent_hash || null,
            block.timestamp || Date.now(),
          ]
        );
      } catch (err) {
        this._stats.errors++;
        log.error('storeBlock failed', { slot: block.slot, error: err.message });
        // Fallback to memory
        this._memoryStore.set(block.slot, block);
        return;
      }
    } else {
      this._memoryStore.set(block.slot, block);
    }

    this._stats.blocksStored++;
    this.emit('block:stored', { slot: block.slot, hash: block.hash || block.block_hash });
  }

  /**
   * Get a block by slot.
   *
   * @param {number} slot
   * @returns {Promise<Object|null>}
   */
  async getBlock(slot) {
    if (this._pool) {
      try {
        const { rows: [row] } = await this._pool.query(
          'SELECT * FROM blocks WHERE slot = $1',
          [slot]
        );
        if (row) {
          this._stats.blocksRetrieved++;
          return this._normalizeRow(row);
        }
        return null;
      } catch (err) {
        this._stats.errors++;
        log.error('getBlock failed', { slot, error: err.message });
      }
    }

    const block = this._memoryStore.get(slot);
    if (block) this._stats.blocksRetrieved++;
    return block || null;
  }

  /**
   * Get blocks in a range (inclusive).
   * Used by StateSyncManager for state sync.
   *
   * @param {number} fromSlot
   * @param {number} toSlot
   * @returns {Promise<Object[]>}
   */
  async getBlocks(fromSlot, toSlot) {
    if (this._pool) {
      try {
        const { rows } = await this._pool.query(
          'SELECT * FROM blocks WHERE slot >= $1 AND slot <= $2 ORDER BY slot ASC',
          [fromSlot, toSlot]
        );
        this._stats.blocksRetrieved += rows.length;
        return rows.map(r => this._normalizeRow(r));
      } catch (err) {
        this._stats.errors++;
        log.error('getBlocks failed', { fromSlot, toSlot, error: err.message });
      }
    }

    // Memory fallback
    const blocks = [];
    for (let slot = fromSlot; slot <= toSlot; slot++) {
      const block = this._memoryStore.get(slot);
      if (block) blocks.push(block);
    }
    this._stats.blocksRetrieved += blocks.length;
    return blocks;
  }

  /**
   * Get the latest block.
   *
   * @returns {Promise<Object|null>}
   */
  async getLatestBlock() {
    if (this._pool) {
      try {
        const { rows: [row] } = await this._pool.query(
          'SELECT * FROM blocks ORDER BY slot DESC LIMIT 1'
        );
        return row ? this._normalizeRow(row) : null;
      } catch (err) {
        this._stats.errors++;
      }
    }

    // Memory fallback
    let maxSlot = -1;
    let latest = null;
    for (const [slot, block] of this._memoryStore) {
      if (slot > maxSlot) { maxSlot = slot; latest = block; }
    }
    return latest;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Anchor storage (migration 031: block_anchors table)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Store or update an anchor record (UPSERT).
   *
   * @param {Object} anchor
   * @param {number} anchor.slot
   * @param {string} [anchor.txSignature] - Solana transaction signature
   * @param {string} [anchor.status] - 'pending' | 'anchored' | 'confirmed' | 'failed'
   * @param {string} [anchor.merkleRoot]
   * @param {string} [anchor.cluster]
   * @param {number} [anchor.retryCount]
   */
  async storeAnchor(anchor) {
    if (!anchor || anchor.slot === undefined) return;

    // Normalize status: 'confirmed' maps to 'anchored' in DB
    const dbStatus = anchor.status === 'confirmed' ? 'anchored' : (anchor.status || 'pending');

    if (this._pool) {
      try {
        await this._pool.query(
          `INSERT INTO block_anchors (slot, solana_tx_signature, anchor_status, merkle_root, cluster, anchored_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (slot) DO UPDATE SET
             solana_tx_signature = COALESCE(EXCLUDED.solana_tx_signature, block_anchors.solana_tx_signature),
             anchor_status = EXCLUDED.anchor_status,
             merkle_root = COALESCE(EXCLUDED.merkle_root, block_anchors.merkle_root),
             cluster = COALESCE(EXCLUDED.cluster, block_anchors.cluster),
             anchored_at = CASE WHEN EXCLUDED.anchor_status = 'anchored' THEN NOW() ELSE block_anchors.anchored_at END`,
          [
            anchor.slot,
            anchor.txSignature || null,
            dbStatus,
            anchor.merkleRoot || null,
            anchor.cluster || 'devnet',
            dbStatus === 'anchored' ? new Date() : null,
          ]
        );
        this.emit('anchor:stored', { slot: anchor.slot, status: dbStatus });
      } catch (err) {
        this._stats.errors++;
        log.error('storeAnchor failed', { slot: anchor.slot, error: err.message });
      }
    }
  }

  /**
   * Get failed anchors for retry sweeps.
   *
   * @param {number} [limit=10]
   * @returns {Promise<Object[]>}
   */
  async getFailedAnchors(limit = 10) {
    if (!this._pool) return [];

    try {
      const { rows } = await this._pool.query(
        `SELECT ba.slot, ba.solana_tx_signature, ba.anchor_status, ba.merkle_root, ba.cluster, ba.created_at,
                b.hash
         FROM block_anchors ba
         JOIN blocks b ON b.slot = ba.slot
         WHERE ba.anchor_status = 'failed'
         ORDER BY ba.created_at ASC
         LIMIT $1`,
        [limit]
      );
      return rows.map(r => ({
        slot: Number(r.slot),
        hash: r.hash,
        merkleRoot: r.merkle_root,
        cluster: r.cluster,
        txSignature: r.solana_tx_signature,
        createdAt: r.created_at,
      }));
    } catch (err) {
      this._stats.errors++;
      log.error('getFailedAnchors failed', { error: err.message });
      return [];
    }
  }

  /**
   * Get a single anchor by slot.
   *
   * @param {number} slot
   * @returns {Promise<Object|null>}
   */
  async getAnchor(slot) {
    if (!this._pool) return null;

    try {
      const { rows: [row] } = await this._pool.query(
        'SELECT * FROM block_anchors WHERE slot = $1',
        [slot]
      );
      if (!row) return null;
      return {
        slot: Number(row.slot),
        txSignature: row.solana_tx_signature,
        status: row.anchor_status,
        merkleRoot: row.merkle_root,
        cluster: row.cluster,
        createdAt: row.created_at,
        anchoredAt: row.anchored_at,
      };
    } catch (err) {
      this._stats.errors++;
      log.error('getAnchor failed', { slot, error: err.message });
      return null;
    }
  }

  /**
   * Return callbacks for NetworkNode.wireBlockStore()
   *
   * @returns {{ getBlocks: Function, storeBlock: Function, storeAnchor: Function, getFailedAnchors: Function, getAnchor: Function }}
   */
  callbacks() {
    return {
      getBlocks: this.getBlocks.bind(this),
      storeBlock: this.storeBlock.bind(this),
      storeAnchor: this.storeAnchor.bind(this),
      getFailedAnchors: this.getFailedAnchors.bind(this),
      getAnchor: this.getAnchor.bind(this),
    };
  }

  /**
   * Normalize a PostgreSQL row to a block object.
   * @private
   */
  _normalizeRow(row) {
    return {
      slot: Number(row.slot),
      hash: row.hash,
      proposer: row.proposer,
      merkle_root: row.merkle_root,
      judgments: row.judgments || [],
      judgment_count: row.judgment_count || 0,
      prev_hash: row.parent_hash,
      parent_hash: row.parent_hash,
      timestamp: Number(row.timestamp),
    };
  }

  /** @returns {Object} */
  get stats() {
    return {
      ...this._stats,
      memorySize: this._memoryStore.size,
    };
  }
}
