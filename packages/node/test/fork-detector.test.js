/**
 * ForkDetector Tests
 *
 * PHASE 2: DECENTRALIZE
 *
 * Tests chain fork detection, heaviest branch calculation,
 * resolution flow, and cleanup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForkDetector } from '../src/network/fork-detector.js';

describe('ForkDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new ForkDetector();
  });

  describe('constructor', () => {
    it('starts with no forks detected', () => {
      expect(detector.stats.forksDetected).toBe(0);
      expect(detector.stats.forksResolved).toBe(0);
    });

    it('starts with clean fork state', () => {
      const status = detector.getForkStatus();

      expect(status.detected).toBe(false);
      expect(status.forkSlot).toBeNull();
      expect(status.resolutionInProgress).toBe(false);
      expect(status.branches).toHaveLength(0);
    });
  });

  describe('wire()', () => {
    it('wires all dependencies', () => {
      const deps = {
        getLastFinalizedSlot: () => 100,
        sendTo: vi.fn(),
        getPeerSlots: () => new Map(),
        publicKey: 'node-key-123',
      };

      detector.wire(deps);

      expect(detector._getLastFinalizedSlot()).toBe(100);
      expect(detector._sendTo).toBe(deps.sendTo);
      expect(detector._publicKey).toBe('node-key-123');
    });

    it('ignores undefined values', () => {
      const original = detector._getLastFinalizedSlot;
      detector.wire({});
      expect(detector._getLastFinalizedSlot).toBe(original);
    });
  });

  describe('checkForForks()', () => {
    it('does not detect fork with single hash per slot', () => {
      const events = [];
      detector.on('fork:detected', (e) => events.push(e));

      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaa' }], 50);

      expect(events).toHaveLength(0);
      expect(detector.stats.forksDetected).toBe(0);
    });

    it('detects fork when two peers report different hashes for same slot', () => {
      const events = [];
      detector.on('fork:detected', (e) => events.push(e));

      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaa' }], 50);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbb' }], 60);

      expect(events).toHaveLength(1);
      expect(events[0].slot).toBe(100);
      expect(events[0].branches).toBe(2);
      expect(detector.stats.forksDetected).toBe(1);
    });

    it('does not double-detect on same fork', () => {
      const events = [];
      detector.on('fork:detected', (e) => events.push(e));

      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaa' }], 50);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbb' }], 60);
      // Third peer with yet another hash — fork already detected
      detector.checkForForks('peer-c', [{ slot: 100, hash: 'hash-ccc' }], 70);

      expect(events).toHaveLength(1); // Only first detection fires
    });

    it('accumulates E-Score for same hash from different peers', () => {
      detector.checkForForks('peer-a1', [{ slot: 50, hash: 'hash-aaa' }], 40);
      detector.checkForForks('peer-a2', [{ slot: 50, hash: 'hash-aaa' }], 30);

      const slotForks = detector._forkState.forkHashes.get(50);
      const hashInfo = slotForks.get('hash-aaa');

      expect(hashInfo.peers.size).toBe(2);
      expect(hashInfo.totalEScore).toBe(70);
    });

    it('does not double-count same peer', () => {
      detector.checkForForks('peer-a', [{ slot: 50, hash: 'hash-aaa' }], 40);
      detector.checkForForks('peer-a', [{ slot: 50, hash: 'hash-aaa' }], 40);

      const slotForks = detector._forkState.forkHashes.get(50);
      const hashInfo = slotForks.get('hash-aaa');

      expect(hashInfo.peers.size).toBe(1);
      expect(hashInfo.totalEScore).toBe(40); // Not 80
    });

    it('skips hashes with null/undefined', () => {
      const events = [];
      detector.on('fork:detected', (e) => events.push(e));

      detector.checkForForks('peer-a', [{ slot: 100, hash: null }], 50);
      detector.checkForForks('peer-b', [{ slot: 100, hash: undefined }], 60);

      expect(events).toHaveLength(0);
    });

    it('handles multiple slots in single call', () => {
      detector.checkForForks('peer-a', [
        { slot: 100, hash: 'hash-100-a' },
        { slot: 101, hash: 'hash-101-a' },
      ], 50);

      expect(detector._forkState.forkHashes.has(100)).toBe(true);
      expect(detector._forkState.forkHashes.has(101)).toBe(true);
    });
  });

  describe('heaviest branch calculation', () => {
    it('identifies heaviest branch by total E-Score', () => {
      const events = [];
      detector.on('fork:detected', (e) => events.push(e));

      // Branch A: 50 + 40 = 90 E-Score
      detector.checkForForks('peer-a1', [{ slot: 100, hash: 'hash-aaaa' }], 50);
      detector.checkForForks('peer-a2', [{ slot: 100, hash: 'hash-aaaa' }], 40);

      // Branch B: 60 E-Score
      detector.checkForForks('peer-b1', [{ slot: 100, hash: 'hash-bbbb' }], 60);

      expect(events).toHaveLength(1);
      expect(events[0].heaviestBranch).toBe('hash-aaaa'.slice(0, 16));
    });

    it('recommends STAY when we are on heaviest branch', () => {
      const events = [];
      detector.on('fork:detected', (e) => events.push(e));

      // Record our hash first
      detector.recordBlockHash(100, 'hash-aaaa');

      // Branch A is heavier (our branch)
      detector.checkForForks('peer-a1', [{ slot: 100, hash: 'hash-aaaa' }], 80);
      detector.checkForForks('peer-b1', [{ slot: 100, hash: 'hash-bbbb' }], 30);

      expect(events[0].onHeaviestBranch).toBe(true);
      expect(events[0].recommendation).toBe('STAY');
    });

    it('recommends REORG_NEEDED when we are NOT on heaviest branch', () => {
      const events = [];
      detector.on('fork:detected', (e) => events.push(e));

      // Record our hash as the weaker branch
      detector.recordBlockHash(100, 'hash-bbbb');

      // Branch A is heavier (not ours)
      detector.checkForForks('peer-a1', [{ slot: 100, hash: 'hash-aaaa' }], 80);
      detector.checkForForks('peer-b1', [{ slot: 100, hash: 'hash-bbbb' }], 30);

      expect(events[0].onHeaviestBranch).toBe(false);
      expect(events[0].recommendation).toBe('REORG_NEEDED');
    });
  });

  describe('fork resolution', () => {
    it('sends FORK_RESOLUTION_REQUEST to best peer', async () => {
      const sendTo = vi.fn();
      const peerSlots = new Map([
        ['peer-a', { eScore: 80 }],
        ['peer-b', { eScore: 60 }],
      ]);

      detector.wire({
        sendTo,
        getPeerSlots: () => peerSlots,
        publicKey: 'our-node-key-1234567890abcdef',
      });

      // Record our hash as weaker branch
      detector.recordBlockHash(100, 'hash-bbbb');

      // Trigger fork where we're NOT on heaviest
      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaaa' }], 80);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbbb' }], 30);

      // Wait for async _resolveFork
      await vi.waitFor(() => {
        expect(sendTo).toHaveBeenCalled();
      });

      const [peerId, message] = sendTo.mock.calls[0];
      expect(peerId).toBe('peer-a'); // Highest E-Score peer on target branch
      expect(message.type).toBe('FORK_RESOLUTION_REQUEST');
      expect(message.forkSlot).toBe(100);
      expect(message.targetHash).toBe('hash-aaaa');
    });

    it('does not start resolution when already in progress', async () => {
      const sendTo = vi.fn();
      const peerSlots = new Map([['peer-a', { eScore: 80 }]]);

      detector.wire({
        sendTo,
        getPeerSlots: () => peerSlots,
        publicKey: 'our-key-1234567890abcdef1234567890',
      });

      // Manually set resolution in progress
      detector._forkState.resolutionInProgress = true;

      detector.recordBlockHash(100, 'hash-bbbb');
      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaaa' }], 80);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbbb' }], 30);

      // Should NOT send resolution request
      expect(sendTo).not.toHaveBeenCalled();
    });

    it('handles no peers on target branch', () => {
      const sendTo = vi.fn();

      detector.wire({
        sendTo,
        getPeerSlots: () => new Map(), // No peer info
        publicKey: 'our-key-1234567890abcdef1234567890',
      });

      detector.recordBlockHash(100, 'hash-bbbb');
      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaaa' }], 80);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbbb' }], 30);

      // Resolution should not send (no peer info found)
      // resolutionInProgress should be reset
      expect(detector._forkState.resolutionInProgress).toBe(false);
    });

    it('emits fork:resolution_started on successful send', async () => {
      const sendTo = vi.fn();
      const peerSlots = new Map([['peer-a', { eScore: 80 }]]);
      const events = [];

      detector.wire({
        sendTo,
        getPeerSlots: () => peerSlots,
        publicKey: 'our-key-1234567890abcdef1234567890',
      });
      detector.on('fork:resolution_started', (e) => events.push(e));

      detector.recordBlockHash(100, 'hash-bbbb');
      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaaa' }], 80);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbbb' }], 30);

      await vi.waitFor(() => {
        expect(events.length).toBeGreaterThan(0);
      });

      expect(events[0].forkSlot).toBe(100);
    });
  });

  describe('markForkResolved()', () => {
    it('clears fork state and increments resolved count', () => {
      // Create a fork
      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaa' }], 50);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbb' }], 60);

      expect(detector.stats.forksDetected).toBe(1);

      const events = [];
      detector.on('fork:resolved', (e) => events.push(e));

      detector.markForkResolved();

      expect(detector.stats.forksResolved).toBe(1);
      expect(detector._forkState.detected).toBe(false);
      expect(detector._forkState.forkSlot).toBeNull();
      expect(detector._forkState.resolutionInProgress).toBe(false);
      expect(events[0].forkSlot).toBe(100);
    });

    it('is safe to call when no fork is detected', () => {
      // Should not throw and should not increment resolved
      detector.markForkResolved();

      expect(detector.stats.forksResolved).toBe(0);
    });
  });

  describe('recordBlockHash / getRecentBlockHashes', () => {
    it('records block hash for a slot', () => {
      detector.recordBlockHash(100, 'hash-100');

      expect(detector._slotHashes.get(100)?.hash).toBe('hash-100');
      expect(detector._slotHashes.get(100)?.confirmedAt).toBeDefined();
    });

    it('returns recent block hashes', () => {
      detector.wire({ getLastFinalizedSlot: () => 102 });

      detector.recordBlockHash(100, 'hash-100');
      detector.recordBlockHash(101, 'hash-101');
      detector.recordBlockHash(102, 'hash-102');

      const recent = detector.getRecentBlockHashes(3);

      expect(recent).toHaveLength(3);
      expect(recent[0]).toEqual({ slot: 102, hash: 'hash-102' });
      expect(recent[1]).toEqual({ slot: 101, hash: 'hash-101' });
      expect(recent[2]).toEqual({ slot: 100, hash: 'hash-100' });
    });

    it('returns empty when no hashes recorded', () => {
      detector.wire({ getLastFinalizedSlot: () => 100 });

      const recent = detector.getRecentBlockHashes(5);
      expect(recent).toHaveLength(0);
    });

    it('skips slots without recorded hashes', () => {
      detector.wire({ getLastFinalizedSlot: () => 102 });

      detector.recordBlockHash(100, 'hash-100');
      // slot 101 not recorded
      detector.recordBlockHash(102, 'hash-102');

      const recent = detector.getRecentBlockHashes(3);

      expect(recent).toHaveLength(2);
    });
  });

  describe('_cleanupForkData()', () => {
    it('removes fork data older than 100 slots', () => {
      detector.wire({ getLastFinalizedSlot: () => 150 });

      // Add old data
      for (let i = 0; i < 200; i++) {
        detector._slotHashes.set(i, { hash: `hash-${i}` });
        detector._forkState.forkHashes.set(i, new Map());
      }

      detector._cleanupForkData();

      // Slots < 50 (150 - 100) should be removed
      expect(detector._slotHashes.has(49)).toBe(false);
      expect(detector._slotHashes.has(50)).toBe(true);
      expect(detector._forkState.forkHashes.has(49)).toBe(false);
      expect(detector._forkState.forkHashes.has(50)).toBe(true);
    });

    it('is called automatically during checkForForks', () => {
      detector.wire({ getLastFinalizedSlot: () => 200 });

      // Add old slot hash
      detector._slotHashes.set(50, { hash: 'old' });

      // checkForForks triggers cleanup
      detector.checkForForks('peer', [{ slot: 200, hash: 'new' }], 50);

      expect(detector._slotHashes.has(50)).toBe(false);
    });
  });

  describe('getForkStatus()', () => {
    it('returns complete status with fork details', () => {
      detector.checkForForks('peer-a', [{ slot: 100, hash: 'hash-aaaa1111222233334444555566667777' }], 50);
      detector.checkForForks('peer-b', [{ slot: 100, hash: 'hash-bbbb1111222233334444555566667777' }], 60);

      const status = detector.getForkStatus();

      expect(status.detected).toBe(true);
      expect(status.forkSlot).toBe(100);
      expect(status.branches).toHaveLength(2);
      expect(status.stats.forksDetected).toBe(1);

      // Each branch should have hash, peers, totalEScore
      for (const branch of status.branches) {
        expect(branch.hash).toBeDefined();
        expect(branch.peers).toBeDefined();
        expect(branch.totalEScore).toBeDefined();
      }
    });

    it('returns empty branches when no fork', () => {
      const status = detector.getForkStatus();

      expect(status.detected).toBe(false);
      expect(status.branches).toHaveLength(0);
    });
  });

  describe('stats', () => {
    it('returns a copy of stats', () => {
      const s1 = detector.stats;
      const s2 = detector.stats;

      expect(s1).toEqual(s2);
      expect(s1).not.toBe(s2);
    });
  });
});
