/**
 * Anchoring Pipeline Integration Tests
 *
 * Tests the end-to-end pipeline:
 *   BLOCK_FINALIZED → persist block → anchor → persist anchor → retry failures
 *
 * All tests use mock PostgreSQL pool — no real DB needed.
 *
 * "Onchain is truth" - κυνικός
 *
 * @module @cynic/node/test/anchoring-pipeline
 */

'use strict';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { globalEventBus, EventType } from '@cynic/core';
import { BlockStore } from '../src/network/block-store.js';
import { SolanaAnchoringManager } from '../src/network/solana-anchoring.js';
import {
  startEventListeners,
  stopEventListeners,
} from '../src/services/event-listeners.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock PostgreSQL pool
// ═══════════════════════════════════════════════════════════════════════════════

function createMockPool() {
  const queries = [];
  return {
    queries,
    query: async (sql, params) => {
      queries.push({ sql, params });
      // Return sensible defaults based on the query
      if (sql.includes('SELECT') && sql.includes('block_anchors') && sql.includes('failed')) {
        return { rows: [] }; // getFailedAnchors: empty by default
      }
      if (sql.includes('SELECT') && sql.includes('block_anchors')) {
        return { rows: [] }; // getAnchor: not found by default
      }
      if (sql.includes('SELECT') && sql.includes('blocks')) {
        return { rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BlockStore Anchor Methods
// ═══════════════════════════════════════════════════════════════════════════════

describe('BlockStore — Anchor Methods', () => {
  let pool;
  let store;

  beforeEach(() => {
    pool = createMockPool();
    store = new BlockStore({ pool });
  });

  it('storeAnchor() generates correct UPSERT SQL', async () => {
    await store.storeAnchor({
      slot: 100,
      txSignature: 'sig_abc123',
      status: 'confirmed',
      merkleRoot: 'abcd1234'.repeat(8),
      cluster: 'devnet',
    });

    assert.equal(pool.queries.length, 1, 'should execute one query');
    const q = pool.queries[0];
    assert.ok(q.sql.includes('INSERT INTO block_anchors'), 'should INSERT into block_anchors');
    assert.ok(q.sql.includes('ON CONFLICT'), 'should UPSERT');
    assert.equal(q.params[0], 100, 'slot should be 100');
    assert.equal(q.params[1], 'sig_abc123', 'signature should be passed');
    assert.equal(q.params[2], 'anchored', 'confirmed should map to anchored in DB');
  });

  it('storeAnchor() maps failed status correctly', async () => {
    await store.storeAnchor({
      slot: 200,
      txSignature: null,
      status: 'failed',
    });

    const q = pool.queries[0];
    assert.equal(q.params[2], 'failed', 'failed status should stay as failed');
    assert.equal(q.params[1], null, 'txSignature should be null');
  });

  it('getFailedAnchors() returns failed anchors with JOIN', async () => {
    // Override pool to return mock data
    const mockPool = {
      query: async (sql, params) => {
        if (sql.includes('failed')) {
          return {
            rows: [
              { slot: '300', hash: 'hash300', merkle_root: 'mr300', cluster: 'devnet', solana_tx_signature: null, created_at: new Date() },
              { slot: '400', hash: 'hash400', merkle_root: 'mr400', cluster: 'devnet', solana_tx_signature: null, created_at: new Date() },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const failStore = new BlockStore({ pool: mockPool });
    const failed = await failStore.getFailedAnchors(10);

    assert.equal(failed.length, 2, 'should return 2 failed anchors');
    assert.equal(failed[0].slot, 300, 'slot should be numeric');
    assert.equal(failed[0].hash, 'hash300', 'hash should be returned');
  });

  it('getAnchor() returns single anchor', async () => {
    const mockPool = {
      query: async (sql, params) => {
        if (params[0] === 500) {
          return {
            rows: [{
              slot: '500',
              solana_tx_signature: 'sig_500',
              anchor_status: 'anchored',
              merkle_root: 'mr500',
              cluster: 'devnet',
              created_at: new Date(),
              anchored_at: new Date(),
            }],
          };
        }
        return { rows: [] };
      },
    };

    const anchorStore = new BlockStore({ pool: mockPool });
    const anchor = await anchorStore.getAnchor(500);

    assert.ok(anchor, 'anchor should exist');
    assert.equal(anchor.slot, 500, 'slot should be 500');
    assert.equal(anchor.txSignature, 'sig_500');
    assert.equal(anchor.status, 'anchored');
  });

  it('callbacks() includes anchor methods', () => {
    const cb = store.callbacks();
    assert.ok(cb.storeAnchor, 'should have storeAnchor');
    assert.ok(cb.getFailedAnchors, 'should have getFailedAnchors');
    assert.ok(cb.getAnchor, 'should have getAnchor');
    assert.ok(cb.storeBlock, 'should still have storeBlock');
    assert.ok(cb.getBlocks, 'should still have getBlocks');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SolanaAnchoringManager Retry & Events
// ═══════════════════════════════════════════════════════════════════════════════

describe('SolanaAnchoringManager — Retry & Events', () => {
  let manager;

  beforeEach(() => {
    manager = new SolanaAnchoringManager({
      enabled: true,
      dryRun: true,
      anchorInterval: 1, // anchor every block for testing
    });
  });

  afterEach(() => {
    manager.cleanup();
  });

  it('publishes anchor:failed to globalEventBus on failure', async () => {
    // Override _createAnchorTransaction to force a real failure (bypass simulation fallback)
    manager._wallet = { publicKey: 'fake' };
    manager._createAnchorTransaction = async () => {
      return { success: false, error: 'Solana down' };
    };

    let receivedEvent = null;
    const unsub = globalEventBus.subscribe('anchor:failed', (event) => {
      receivedEvent = event;
    });

    const merkle = 'a'.repeat(64);
    await manager.anchorBlock({ slot: 42, hash: 'h42', merkleRoot: merkle });

    unsub();

    assert.ok(receivedEvent, 'should have received anchor:failed event');
    const payload = receivedEvent.payload || receivedEvent;
    assert.equal(payload.slot, 42);
    assert.ok(payload.error.includes('Solana down'), 'error message should propagate');
  });

  it('preserves retryCount across attempts', async () => {
    manager._wallet = { publicKey: 'fake' };
    manager._createAnchorTransaction = async () => {
      return { success: false, error: 'persistent failure' };
    };
    const merkle = 'b'.repeat(64);

    // First attempt fails
    await manager.anchorBlock({ slot: 99, hash: 'h99', merkleRoot: merkle });

    const status1 = manager.getAnchorStatus('h99');
    assert.equal(status1.retryCount, 1, 'retryCount should be 1 after first failure');

    // Second attempt (passing retryCount from first)
    await manager.anchorBlock({ slot: 99, hash: 'h99', merkleRoot: merkle }, 1);

    const status2 = manager.getAnchorStatus('h99');
    assert.equal(status2.retryCount, 2, 'retryCount should be 2 after second failure');
  });

  it('has Fibonacci delay constants', () => {
    assert.ok(Array.isArray(SolanaAnchoringManager.FIBONACCI_DELAYS), 'should have FIBONACCI_DELAYS');
    assert.equal(SolanaAnchoringManager.FIBONACCI_DELAYS.length, 5, 'should have 5 delays');
    assert.equal(SolanaAnchoringManager.FIBONACCI_DELAYS[0], 8000, 'first delay should be 8s (F6)');
    assert.equal(SolanaAnchoringManager.FIBONACCI_DELAYS[2], 21000, 'third delay should be 21s (F8)');
  });

  it('cleanup() stops retry timer', () => {
    // Enable to start the timer
    manager._startRetryTimer();
    assert.ok(manager._retryInterval, 'retry timer should be running');

    manager.cleanup();
    assert.equal(manager._retryInterval, null, 'retry timer should be cleared');
  });

  it('setBlockStore() wires the store for retries', () => {
    const mockStore = { getFailedAnchors: async () => [] };
    manager.setBlockStore(mockStore);
    assert.equal(manager._blockStore, mockStore, 'blockStore should be set');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Event Listener Integration
// ═══════════════════════════════════════════════════════════════════════════════

describe('EventListeners — Block Anchoring', () => {
  let mockBlockStore;
  let storedBlocks;
  let storedAnchors;

  beforeEach(() => {
    storedBlocks = [];
    storedAnchors = [];
    mockBlockStore = {
      storeBlock: async (block) => {
        storedBlocks.push(block);
      },
      storeAnchor: async (anchor) => {
        storedAnchors.push(anchor);
      },
      getFailedAnchors: async () => [],
      getAnchor: async () => null,
    };
    stopEventListeners(); // Clean slate
  });

  afterEach(() => {
    stopEventListeners();
  });

  it('handles BLOCK_FINALIZED and stores block', async () => {
    startEventListeners({
      repositories: {},
      blockStore: mockBlockStore,
      sessionId: 'test',
      userId: 'test',
    });

    globalEventBus.publish(EventType.BLOCK_FINALIZED, {
      blockHash: 'hash_600',
      slot: 600,
      block: {
        proposer: 'node_abc',
        merkleRoot: 'mr600',
        judgments: [],
        parentHash: 'hash_599',
      },
    });

    // Wait for async handler
    await new Promise(r => setTimeout(r, 150));

    assert.equal(storedBlocks.length, 1, 'should store one block');
    assert.equal(storedBlocks[0].slot, 600);
    assert.equal(storedBlocks[0].hash, 'hash_600');
    assert.equal(storedBlocks[0].proposer, 'node_abc');
  });

  it('handles BLOCK_ANCHORED and stores anchor', async () => {
    startEventListeners({
      repositories: {},
      blockStore: mockBlockStore,
      sessionId: 'test',
      userId: 'test',
    });

    globalEventBus.publish(EventType.BLOCK_ANCHORED, {
      slot: 700,
      signature: 'sig_700',
      merkleRoot: 'mr700',
      cluster: 'devnet',
    });

    await new Promise(r => setTimeout(r, 150));

    assert.equal(storedAnchors.length, 1, 'should store one anchor');
    assert.equal(storedAnchors[0].slot, 700);
    assert.equal(storedAnchors[0].txSignature, 'sig_700');
    assert.equal(storedAnchors[0].status, 'confirmed');
  });
});
