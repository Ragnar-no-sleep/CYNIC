/**
 * State Manager
 *
 * Manages all node state: chain, knowledge, peers, operator
 *
 * @module @cynic/node/state/manager
 */

'use strict';

import { PoJChain, KnowledgeTree } from '@cynic/protocol';
import { MemoryStorage, FileStorage } from './storage.js';

/**
 * State Manager - Orchestrates all node state
 */
export class StateManager {
  /**
   * @param {Object} options - Manager options
   * @param {string} [options.dataDir] - Data directory (null for memory only)
   * @param {Object} options.operator - Operator instance
   */
  constructor(options = {}) {
    this.dataDir = options.dataDir;
    this.operator = options.operator;

    // Initialize storage
    this.storage = this.dataDir
      ? new FileStorage(this.dataDir)
      : new MemoryStorage();

    // State components (lazy initialized)
    this._chain = null;
    this._knowledge = null;
    this._peers = new Map();
    this._judgments = [];

    this.initialized = false;
  }

  /**
   * Initialize state manager
   * Loads existing state or creates fresh state
   */
  async initialize() {
    if (this.initialized) return;

    // Try to load existing state
    const savedState = await this.storage.get('state');

    if (savedState) {
      await this._loadState(savedState);
    } else {
      await this._initFreshState();
    }

    this.initialized = true;
  }

  /**
   * Load state from storage
   * @private
   */
  async _loadState(savedState) {
    // Restore chain
    if (savedState.chain) {
      this._chain = PoJChain.import(savedState.chain, this.operator.privateKey);
    } else {
      await this._initChain();
    }

    // Restore knowledge tree
    if (savedState.knowledge) {
      this._knowledge = KnowledgeTree.import(savedState.knowledge);
    } else {
      this._knowledge = new KnowledgeTree();
    }

    // Restore peers
    if (savedState.peers) {
      this._peers = new Map(Object.entries(savedState.peers));
    }

    // Restore judgments (recent only)
    if (savedState.judgments) {
      this._judgments = savedState.judgments;
    }
  }

  /**
   * Initialize fresh state
   * @private
   */
  async _initFreshState() {
    await this._initChain();
    this._knowledge = new KnowledgeTree();
    this._peers = new Map();
    this._judgments = [];
  }

  /**
   * Initialize chain
   * @private
   */
  async _initChain() {
    this._chain = new PoJChain({
      operatorPublicKey: this.operator.publicKey,
      operatorPrivateKey: this.operator.privateKey,
    });
  }

  /**
   * Get chain
   * @returns {PoJChain} Chain instance
   */
  get chain() {
    if (!this._chain) {
      throw new Error('State not initialized');
    }
    return this._chain;
  }

  /**
   * Get knowledge tree
   * @returns {KnowledgeTree} Knowledge tree instance
   */
  get knowledge() {
    if (!this._knowledge) {
      throw new Error('State not initialized');
    }
    return this._knowledge;
  }

  /**
   * Add judgment to state
   * @param {Object} judgment - Judgment to add
   */
  addJudgment(judgment) {
    this._judgments.push(judgment);

    // Keep bounded (last 1000)
    if (this._judgments.length > 1000) {
      this._judgments.shift();
    }
  }

  /**
   * Get recent judgments
   * @param {number} [count=100] - Number to return
   * @returns {Object[]} Recent judgments
   */
  getRecentJudgments(count = 100) {
    return this._judgments.slice(-count);
  }

  /**
   * Add peer
   * @param {Object} peer - Peer info
   */
  addPeer(peer) {
    this._peers.set(peer.id, peer);
  }

  /**
   * Remove peer
   * @param {string} peerId - Peer ID
   */
  removePeer(peerId) {
    this._peers.delete(peerId);
  }

  /**
   * Get peer
   * @param {string} peerId - Peer ID
   * @returns {Object|null} Peer info
   */
  getPeer(peerId) {
    return this._peers.get(peerId) || null;
  }

  /**
   * Get all peers
   * @returns {Object[]} All peers
   */
  getAllPeers() {
    return Array.from(this._peers.values());
  }

  /**
   * Save state to storage
   */
  async save() {
    const state = {
      chain: this._chain.export(),
      knowledge: this._knowledge.export(),
      peers: Object.fromEntries(this._peers),
      judgments: this._judgments.slice(-100), // Save last 100
      savedAt: Date.now(),
    };

    await this.storage.set('state', state);

    // Also save operator state
    if (this.operator) {
      await this.storage.set('operator', this.operator.export());
    }
  }

  /**
   * Get state summary
   * @returns {Object} State summary
   */
  getSummary() {
    return {
      chainHeight: this._chain?.getHeight() || 0,
      knowledgeStats: this._knowledge?.getStats() || {},
      peerCount: this._peers.size,
      judgmentCount: this._judgments.length,
      initialized: this.initialized,
    };
  }

  /**
   * Clear all state (use with caution!)
   */
  async clear() {
    await this.storage.clear();
    this._chain = null;
    this._knowledge = null;
    this._peers.clear();
    this._judgments = [];
    this.initialized = false;
  }
}

export default { StateManager };
