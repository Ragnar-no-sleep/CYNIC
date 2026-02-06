/**
 * StateSyncManager Tests
 *
 * PHASE 2: DECENTRALIZE
 *
 * Tests state synchronization between nodes:
 * peer tracking, sync detection, message handling,
 * fork resolution, and chain integrity validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateSyncManager } from '../src/network/state-sync-manager.js';

describe('StateSyncManager', () => {
  let sync;

  beforeEach(() => {
    sync = new StateSyncManager();
  });

  describe('constructor', () => {
    it('starts with clean sync state', () => {
      expect(sync.syncState.lastSyncSlot).toBe(0);
      expect(sync.syncState.syncing).toBe(false);
      expect(sync.syncState.behindBy).toBe(0);
      expect(sync.syncState.syncInProgress).toBe(false);
    });

    it('starts with empty peer slots', () => {
      expect(sync.peerSlots.size).toBe(0);
    });
  });

  describe('wire()', () => {
    it('wires all dependencies', () => {
      const mockGetBlocks = vi.fn(async () => []);
      const mockStoreBlock = vi.fn(async () => ({}));
      const mockSendTo = vi.fn();

      sync.wire({
        getLastFinalizedSlot: () => 50,
        getCurrentSlot: () => 55,
        sendTo: mockSendTo,
        publicKey: 'node-key',
        getBlocks: mockGetBlocks,
        storeBlock: mockStoreBlock,
      });

      expect(sync._getLastFinalizedSlot()).toBe(50);
      expect(sync._getCurrentSlot()).toBe(55);
      expect(sync._sendTo).toBe(mockSendTo);
      expect(sync._publicKey).toBe('node-key');
      expect(sync._getBlocks).toBe(mockGetBlocks);
      expect(sync._storeBlock).toBe(mockStoreBlock);
    });
  });

  describe('updatePeer()', () => {
    it('stores peer info from heartbeat', () => {
      sync.updatePeer('peer-1', {
        finalizedSlot: 100,
        finalizedHash: 'hash-100',
        slot: 105,
        state: 'PARTICIPATING',
        eScore: 75,
      });

      const peer = sync.peerSlots.get('peer-1');
      expect(peer.finalizedSlot).toBe(100);
      expect(peer.finalizedHash).toBe('hash-100');
      expect(peer.slot).toBe(105);
      expect(peer.state).toBe('PARTICIPATING');
      expect(peer.eScore).toBe(75);
      expect(peer.lastSeen).toBeDefined();
    });

    it('updates existing peer', () => {
      sync.updatePeer('peer-1', { finalizedSlot: 50, eScore: 60 });
      sync.updatePeer('peer-1', { finalizedSlot: 100, eScore: 70 });

      const peer = sync.peerSlots.get('peer-1');
      expect(peer.finalizedSlot).toBe(100);
      expect(peer.eScore).toBe(70);
    });

    it('defaults missing fields', () => {
      sync.updatePeer('peer-1', {});

      const peer = sync.peerSlots.get('peer-1');
      expect(peer.finalizedSlot).toBe(0);
      expect(peer.finalizedHash).toBeNull();
      expect(peer.slot).toBe(0);
      expect(peer.state).toBe('UNKNOWN');
      expect(peer.eScore).toBe(50);
    });
  });

  describe('checkStateSync()', () => {
    it('returns needsSync=false when not behind', () => {
      sync.wire({ getLastFinalizedSlot: () => 100 });
      sync.updatePeer('peer-1', { finalizedSlot: 105 }); // Only 5 behind (< 10)

      const result = sync.checkStateSync();

      expect(result.needsSync).toBe(false);
      expect(result.behindBy).toBe(5);
    });

    it('returns needsSync=true when >10 slots behind', () => {
      const sendTo = vi.fn();
      sync.wire({
        getLastFinalizedSlot: () => 0,
        sendTo,
        publicKey: 'our-key-1234567890abcdef1234567890',
      });
      sync.updatePeer('peer-1', { finalizedSlot: 100 });

      const events = [];
      sync.on('sync:needed', (e) => events.push(e));

      const result = sync.checkStateSync();

      expect(result.needsSync).toBe(true);
      expect(result.behindBy).toBe(100);
      expect(result.bestPeer).toBe('peer-1');
      expect(events).toHaveLength(1);
    });

    it('picks peer with highest finalized slot', () => {
      const sendTo = vi.fn();
      sync.wire({
        getLastFinalizedSlot: () => 0,
        sendTo,
        publicKey: 'our-key-1234567890abcdef1234567890',
      });

      sync.updatePeer('peer-a', { finalizedSlot: 50 });
      sync.updatePeer('peer-b', { finalizedSlot: 200 });
      sync.updatePeer('peer-c', { finalizedSlot: 150 });

      const result = sync.checkStateSync();

      expect(result.bestPeer).toBe('peer-b');
      expect(result.behindBy).toBe(200);
    });

    it('ignores stale peers (>60s old)', () => {
      sync.wire({ getLastFinalizedSlot: () => 0 });

      sync.updatePeer('peer-1', { finalizedSlot: 200 });

      // Make peer stale
      const peer = sync.peerSlots.get('peer-1');
      peer.lastSeen = Date.now() - 70000; // 70 seconds ago

      const result = sync.checkStateSync();

      expect(result.needsSync).toBe(false);
      expect(result.behindBy).toBe(0);
    });

    it('sends STATE_REQUEST to best peer', async () => {
      const sendTo = vi.fn();
      sync.wire({
        getLastFinalizedSlot: () => 0,
        sendTo,
        publicKey: 'our-key-1234567890abcdef1234567890',
      });
      sync.updatePeer('peer-1', { finalizedSlot: 100 });

      sync.checkStateSync();

      // Wait for async request
      await vi.waitFor(() => {
        expect(sendTo).toHaveBeenCalled();
      });

      const [peerId, message] = sendTo.mock.calls[0];
      expect(peerId).toBe('peer-1');
      expect(message.type).toBe('STATE_REQUEST');
      expect(message.fromSlot).toBe(0);
    });

    it('detects sync completion when caught up', () => {
      sync.wire({ getLastFinalizedSlot: () => 100 });
      sync.updatePeer('peer-1', { finalizedSlot: 105 });

      // Simulate sync was in progress
      sync._syncState.syncInProgress = true;

      const events = [];
      sync.on('sync:complete', (e) => events.push(e));

      const result = sync.checkStateSync();

      expect(result.needsSync).toBe(false);
      expect(result.justCompleted).toBe(true);
      expect(events).toHaveLength(1);
    });

    it('throttles sync requests (5s cooldown)', async () => {
      const sendTo = vi.fn();
      sync.wire({
        getLastFinalizedSlot: () => 0,
        sendTo,
        publicKey: 'our-key-1234567890abcdef1234567890',
      });
      sync.updatePeer('peer-1', { finalizedSlot: 100 });

      // First call
      sync.checkStateSync();

      // Reset syncInProgress so second call triggers
      sync._syncState.syncInProgress = false;

      // Second call (within 5s) should be throttled
      sync.checkStateSync();

      await vi.waitFor(() => {
        // Only 1 STATE_REQUEST sent (throttled)
        expect(sendTo).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('handleStateRequest()', () => {
    it('responds with blocks from store', async () => {
      const sendTo = vi.fn();
      const mockBlocks = [
        { slot: 10, hash: 'hash-10' },
        { slot: 11, hash: 'hash-11' },
      ];

      sync.wire({
        getLastFinalizedSlot: () => 20,
        getCurrentSlot: () => 25,
        sendTo,
        getBlocks: vi.fn(async () => mockBlocks),
      });

      await sync.handleStateRequest({ fromSlot: 10 }, 'peer-1');

      expect(sendTo).toHaveBeenCalledWith('peer-1', expect.objectContaining({
        type: 'STATE_RESPONSE',
        fromSlot: 10,
        finalizedSlot: 20,
        currentSlot: 25,
        blocks: mockBlocks,
      }));
    });
  });

  describe('handleStateResponse()', () => {
    it('stores received blocks', async () => {
      const storeBlock = vi.fn(async () => ({}));
      sync.wire({
        getLastFinalizedSlot: () => 5,
        storeBlock,
      });

      const events = [];
      sync.on('sync:blocks_received', (e) => events.push(e));

      await sync.handleStateResponse({
        finalizedSlot: 10,
        blocks: [
          { slot: 6, hash: 'h6' },
          { slot: 7, hash: 'h7' },
          { slot: 8, hash: 'h8' },
        ],
      }, 'peer-1');

      expect(storeBlock).toHaveBeenCalledTimes(3);
      expect(events).toHaveLength(1);
      expect(events[0].blocksReceived).toBe(3);
      expect(events[0].blocksProcessed).toBe(3);
    });

    it('skips blocks at or below our slot', async () => {
      const storeBlock = vi.fn(async () => ({}));
      sync.wire({
        getLastFinalizedSlot: () => 5,
        storeBlock,
      });

      await sync.handleStateResponse({
        finalizedSlot: 10,
        blocks: [
          { slot: 3, hash: 'old' },
          { slot: 5, hash: 'current' },
          { slot: 6, hash: 'new' },
        ],
      }, 'peer-1');

      // Only slot 6 should be stored (> ourSlot of 5)
      expect(storeBlock).toHaveBeenCalledTimes(1);
      expect(storeBlock).toHaveBeenCalledWith({ slot: 6, hash: 'new' });
    });

    it('sends BLOCK_REQUEST when peer is ahead but no blocks', async () => {
      const sendTo = vi.fn();
      sync.wire({
        getLastFinalizedSlot: () => 5,
        sendTo,
        publicKey: 'our-key-1234567890abcdef1234567890',
      });

      await sync.handleStateResponse({
        finalizedSlot: 100,
        blocks: null, // No blocks in response
      }, 'peer-1');

      expect(sendTo).toHaveBeenCalledWith('peer-1', expect.objectContaining({
        type: 'BLOCK_REQUEST',
        fromSlot: 6,
        toSlot: 100,
      }));
    });

    it('does nothing when we are caught up', async () => {
      const storeBlock = vi.fn();
      const sendTo = vi.fn();
      sync.wire({
        getLastFinalizedSlot: () => 100,
        storeBlock,
        sendTo,
      });

      await sync.handleStateResponse({
        finalizedSlot: 90, // They're behind us
        blocks: [],
      }, 'peer-1');

      expect(storeBlock).not.toHaveBeenCalled();
      expect(sendTo).not.toHaveBeenCalled();
    });

    it('clears syncInProgress on response', async () => {
      sync.wire({ getLastFinalizedSlot: () => 100 });
      sync._syncState.syncInProgress = true;

      await sync.handleStateResponse({ finalizedSlot: 90 }, 'peer-1');

      expect(sync._syncState.syncInProgress).toBe(false);
    });

    it('handles storeBlock failures gracefully', async () => {
      const storeBlock = vi.fn(async () => { throw new Error('DB down'); });
      sync.wire({
        getLastFinalizedSlot: () => 5,
        storeBlock,
      });

      // Should not throw
      await expect(
        sync.handleStateResponse({
          finalizedSlot: 10,
          blocks: [{ slot: 6, hash: 'h6' }, { slot: 7, hash: 'h7' }],
        }, 'peer-1')
      ).resolves.not.toThrow();
    });
  });

  describe('handleBlockRequest()', () => {
    it('responds with blocks for requested range', async () => {
      const sendTo = vi.fn();
      const mockBlocks = [{ slot: 10 }, { slot: 11 }];

      sync.wire({
        getLastFinalizedSlot: () => 20,
        sendTo,
        getBlocks: vi.fn(async () => mockBlocks),
      });

      const events = [];
      sync.on('sync:blocks_sent', (e) => events.push(e));

      await sync.handleBlockRequest({ fromSlot: 10, toSlot: 15 }, 'peer-1');

      expect(sendTo).toHaveBeenCalledWith('peer-1', expect.objectContaining({
        type: 'STATE_RESPONSE',
        fromSlot: 10,
        finalizedSlot: 20,
        blocks: mockBlocks,
      }));

      expect(events).toHaveLength(1);
      expect(events[0].fromSlot).toBe(10);
      expect(events[0].toSlot).toBe(15);
      expect(events[0].blocksSent).toBe(2);
    });
  });

  describe('handleForkResolutionRequest()', () => {
    it('responds with blocks when we have target branch', async () => {
      const sendTo = vi.fn();
      const mockBlocks = [{ slot: 100 }, { slot: 101 }];

      sync.wire({
        getLastFinalizedSlot: () => 110,
        sendTo,
        getBlocks: vi.fn(async () => mockBlocks),
      });

      const events = [];
      sync.on('fork:resolution_provided', (e) => events.push(e));

      const getSlotHash = (slot) => slot === 100 ? 'target-hash' : null;

      await sync.handleForkResolutionRequest(
        { forkSlot: 100, targetHash: 'target-hash' },
        'peer-1',
        getSlotHash,
      );

      expect(sendTo).toHaveBeenCalledWith('peer-1', expect.objectContaining({
        type: 'FORK_RESOLUTION_RESPONSE',
        forkSlot: 100,
        success: true,
        blocks: mockBlocks,
      }));

      expect(events).toHaveLength(1);
      expect(events[0].blocksProvided).toBe(2);
    });

    it('responds with failure when we do NOT have target branch', async () => {
      const sendTo = vi.fn();
      sync.wire({ sendTo });

      const getSlotHash = () => 'different-hash';

      await sync.handleForkResolutionRequest(
        { forkSlot: 100, targetHash: 'target-hash' },
        'peer-1',
        getSlotHash,
      );

      expect(sendTo).toHaveBeenCalledWith('peer-1', expect.objectContaining({
        type: 'FORK_RESOLUTION_RESPONSE',
        forkSlot: 100,
        success: false,
        reason: 'BRANCH_NOT_AVAILABLE',
      }));
    });
  });

  describe('handleForkResolutionResponse()', () => {
    it('stores validated blocks and marks fork resolved', async () => {
      const storeBlock = vi.fn(async () => ({}));
      const markForkResolved = vi.fn();
      sync.wire({ storeBlock });

      const events = [];
      sync.on('fork:reorg_complete', (e) => events.push(e));

      await sync.handleForkResolutionResponse(
        {
          forkSlot: 100,
          success: true,
          blocks: [
            { slot: 100, hash: 'hash-100', prev_hash: 'hash-99' },
            { slot: 101, hash: 'hash-101', prev_hash: 'hash-100' },
          ],
        },
        'peer-1',
        markForkResolved,
      );

      expect(storeBlock).toHaveBeenCalledTimes(2);
      expect(markForkResolved).toHaveBeenCalled();
      expect(events).toHaveLength(1);
      expect(events[0].blocksApplied).toBe(2);
    });

    it('handles failed resolution (success=false)', async () => {
      const events = [];
      sync.on('fork:resolution_failed', (e) => events.push(e));

      await sync.handleForkResolutionResponse(
        { forkSlot: 100, success: false, reason: 'BRANCH_NOT_AVAILABLE' },
        'peer-1',
        vi.fn(),
      );

      expect(events).toHaveLength(1);
      expect(events[0].reason).toBe('BRANCH_NOT_AVAILABLE');
    });

    it('rejects blocks with broken chain integrity', async () => {
      const storeBlock = vi.fn(async () => ({}));
      const markForkResolved = vi.fn();
      sync.wire({ storeBlock });

      const events = [];
      sync.on('fork:resolution_failed', (e) => events.push(e));

      await sync.handleForkResolutionResponse(
        {
          forkSlot: 100,
          success: true,
          blocks: [
            { slot: 100, hash: 'hash-100', prev_hash: 'hash-99' },
            { slot: 101, hash: 'hash-101', prev_hash: 'WRONG-HASH' }, // Broken chain!
          ],
        },
        'peer-1',
        markForkResolved,
      );

      expect(storeBlock).not.toHaveBeenCalled();
      expect(markForkResolved).not.toHaveBeenCalled();
      expect(events).toHaveLength(1);
      expect(events[0].reason).toBe('INVALID_CHAIN');
    });

    it('accepts single block (no chain to validate)', async () => {
      const storeBlock = vi.fn(async () => ({}));
      const markForkResolved = vi.fn();
      sync.wire({ storeBlock });

      await sync.handleForkResolutionResponse(
        {
          forkSlot: 100,
          success: true,
          blocks: [{ slot: 100, hash: 'hash-100', prev_hash: 'hash-99' }],
        },
        'peer-1',
        markForkResolved,
      );

      expect(storeBlock).toHaveBeenCalledTimes(1);
      expect(markForkResolved).toHaveBeenCalled();
    });

    it('handles empty blocks array', async () => {
      const markForkResolved = vi.fn();

      await sync.handleForkResolutionResponse(
        { forkSlot: 100, success: true, blocks: [] },
        'peer-1',
        markForkResolved,
      );

      expect(markForkResolved).toHaveBeenCalled();
    });

    it('handles null blocks', async () => {
      const markForkResolved = vi.fn();

      await sync.handleForkResolutionResponse(
        { forkSlot: 100, success: true, blocks: null },
        'peer-1',
        markForkResolved,
      );

      expect(markForkResolved).toHaveBeenCalled();
    });
  });

  describe('handleValidatorUpdate()', () => {
    it('calls registerValidator on ADD action', async () => {
      const registerValidator = vi.fn();
      const removeValidator = vi.fn();

      await sync.handleValidatorUpdate(
        { validator: { publicKey: 'val-1', eScore: 50 }, action: 'ADD' },
        registerValidator,
        removeValidator,
      );

      expect(registerValidator).toHaveBeenCalledWith({ publicKey: 'val-1', eScore: 50 });
      expect(removeValidator).not.toHaveBeenCalled();
    });

    it('calls removeValidator on REMOVE action', async () => {
      const registerValidator = vi.fn();
      const removeValidator = vi.fn();

      await sync.handleValidatorUpdate(
        { validator: { publicKey: 'val-1' }, action: 'REMOVE' },
        registerValidator,
        removeValidator,
      );

      expect(registerValidator).not.toHaveBeenCalled();
      expect(removeValidator).toHaveBeenCalledWith('val-1');
    });

    it('ignores unknown actions', async () => {
      const registerValidator = vi.fn();
      const removeValidator = vi.fn();

      await sync.handleValidatorUpdate(
        { validator: { publicKey: 'val-1' }, action: 'UNKNOWN' },
        registerValidator,
        removeValidator,
      );

      expect(registerValidator).not.toHaveBeenCalled();
      expect(removeValidator).not.toHaveBeenCalled();
    });
  });
});
