/**
 * BlockProducer Tests
 *
 * PHASE 2: DECENTRALIZE
 *
 * Tests slot-based block production from JUDGMENT_CREATED events.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlockProducer } from '../src/network/block-producer.js';
import { globalEventBus, EventType } from '@cynic/core';

const mockPublicKey = 'test-producer-key-0123456789abcdef';

describe('BlockProducer', () => {
  let producer;

  beforeEach(() => {
    producer = null;
  });

  afterEach(() => {
    if (producer) {
      producer.stop();
    }
    globalEventBus.removeAllListeners(EventType.JUDGMENT_CREATED);
  });

  describe('constructor', () => {
    it('creates with default options', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      expect(producer.running).toBe(false);
      expect(producer.pendingCount).toBe(0);
      expect(producer.stats.blocksProduced).toBe(0);
      expect(producer.stats.emptyBlocks).toBe(0);
      expect(producer.stats.judgmentsIncluded).toBe(0);
      expect(producer.stats.slotsAsLeader).toBe(0);
      expect(producer.stats.slotsTotal).toBe(0);
    });

    it('has a SlotManager instance', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      expect(producer.slotManager).toBeDefined();
      expect(typeof producer.slotManager.getCurrentSlot).toBe('function');
    });

    it('accepts custom maxJudgmentsPerBlock', () => {
      producer = new BlockProducer({
        publicKey: mockPublicKey,
        maxJudgmentsPerBlock: 50,
      });

      expect(producer._maxJudgmentsPerBlock).toBe(50);
    });
  });

  describe('wire()', () => {
    it('wires proposeBlock callback', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const mockPropose = vi.fn();

      producer.wire({ proposeBlock: mockPropose });

      expect(producer._proposeBlock).toBe(mockPropose);
    });

    it('wires getValidators callback', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const mockGetValidators = vi.fn(() => []);

      producer.wire({ getValidators: mockGetValidators });

      expect(producer._getValidators).toBe(mockGetValidators);
    });

    it('ignores null values', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      producer.wire({ proposeBlock: null, getValidators: null });

      expect(producer._proposeBlock).toBeNull();
      expect(producer._getValidators).toBeNull();
    });
  });

  describe('start/stop lifecycle', () => {
    it('starts and sets running to true', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const events = [];
      producer.on('started', () => events.push('started'));

      producer.start();

      expect(producer.running).toBe(true);
      expect(events).toContain('started');
    });

    it('stops and sets running to false', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const events = [];
      producer.on('stopped', () => events.push('stopped'));

      producer.start();
      producer.stop();

      expect(producer.running).toBe(false);
      expect(events).toContain('stopped');
    });

    it('start is idempotent', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      let count = 0;
      producer.on('started', () => count++);

      producer.start();
      producer.start(); // Second call should be noop

      expect(count).toBe(1);
    });

    it('stop is idempotent', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      let count = 0;
      producer.on('stopped', () => count++);

      producer.start();
      producer.stop();
      producer.stop(); // Second call should be noop

      expect(count).toBe(1);
    });
  });

  describe('judgment collection', () => {
    it('collects JUDGMENT_CREATED events when running', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.start();

      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'jdg-1',
        payload: { qScore: 75, verdict: 'WAG' },
      });

      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'jdg-2',
        payload: { qScore: 30, verdict: 'GROWL' },
      });

      expect(producer.pendingCount).toBe(2);
    });

    it('does not collect events when stopped', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      // Don't start - emit events
      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'jdg-1',
        payload: { qScore: 50, verdict: 'BARK' },
      });

      expect(producer.pendingCount).toBe(0);
    });

    it('stops collecting events after stop()', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      producer.start();

      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'jdg-1',
        payload: { qScore: 50 },
      });

      expect(producer.pendingCount).toBe(1);

      producer.stop();

      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'jdg-2',
        payload: { qScore: 50 },
      });

      // Should still be 1, not 2
      expect(producer.pendingCount).toBe(1);
    });

    it('caps pending judgments at 3x maxJudgmentsPerBlock', () => {
      producer = new BlockProducer({
        publicKey: mockPublicKey,
        maxJudgmentsPerBlock: 2,
      });
      producer.start();

      // Emit 10 judgments, cap is 2 * 3 = 6
      for (let i = 0; i < 10; i++) {
        globalEventBus.emit(EventType.JUDGMENT_CREATED, {
          id: `jdg-${i}`,
          payload: { qScore: 50 },
        });
      }

      expect(producer.pendingCount).toBe(6);
    });

    it('extracts judgment_id from event.id or payload.id', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.start();

      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'from-event-id',
        payload: { qScore: 50 },
      });

      expect(producer._pendingJudgments[0].judgment_id).toBe('from-event-id');
    });
  });

  describe('block production (_onSlot)', () => {
    it('increments slotsTotal on each slot', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.start();

      // Directly call _onSlot (bypasses SlotManager timing)
      // Mock isLeader to return false
      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(false);

      producer._onSlot(1, false);
      producer._onSlot(2, false);
      producer._onSlot(3, false);

      expect(producer.stats.slotsTotal).toBe(3);
      expect(producer.stats.slotsAsLeader).toBe(0);
    });

    it('produces block when we are leader', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const mockPropose = vi.fn(() => ({ id: 'record-1' }));
      producer.wire({ proposeBlock: mockPropose });
      producer.start();

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);

      producer._onSlot(10, false);

      expect(producer.stats.slotsAsLeader).toBe(1);
      expect(producer.stats.blocksProduced).toBe(1);
      expect(producer.stats.emptyBlocks).toBe(1); // No pending judgments
      expect(mockPropose).toHaveBeenCalledTimes(1);
    });

    it('does not produce block when not leader', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const mockPropose = vi.fn();
      producer.wire({ proposeBlock: mockPropose });
      producer.start();

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(false);

      producer._onSlot(10, false);

      expect(producer.stats.slotsAsLeader).toBe(0);
      expect(producer.stats.blocksProduced).toBe(0);
      expect(mockPropose).not.toHaveBeenCalled();
    });

    it('includes pending judgments in block', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const blocks = [];
      const mockPropose = vi.fn((block) => {
        blocks.push(block);
        return { id: 'record-1' };
      });
      producer.wire({ proposeBlock: mockPropose });
      producer.start();

      // Add judgments
      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'jdg-1',
        payload: { qScore: 80, verdict: 'WAG' },
      });
      globalEventBus.emit(EventType.JUDGMENT_CREATED, {
        id: 'jdg-2',
        payload: { qScore: 40, verdict: 'GROWL' },
      });

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);
      producer._onSlot(10, false);

      expect(blocks.length).toBe(1);
      expect(blocks[0].judgment_count).toBe(2);
      expect(blocks[0].judgment_ids).toContain('jdg-1');
      expect(blocks[0].judgment_ids).toContain('jdg-2');
      expect(producer.stats.judgmentsIncluded).toBe(2);
      expect(producer.stats.emptyBlocks).toBe(0);

      // Pending should be drained
      expect(producer.pendingCount).toBe(0);
    });

    it('drains at most maxJudgmentsPerBlock', () => {
      producer = new BlockProducer({
        publicKey: mockPublicKey,
        maxJudgmentsPerBlock: 2,
      });
      const mockPropose = vi.fn(() => ({ id: 'r' }));
      producer.wire({ proposeBlock: mockPropose });
      producer.start();

      // Add 5 judgments
      for (let i = 0; i < 5; i++) {
        globalEventBus.emit(EventType.JUDGMENT_CREATED, {
          id: `jdg-${i}`,
          payload: { qScore: 50 },
        });
      }

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);
      producer._onSlot(10, false);

      // First block takes 2, 3 remain
      expect(producer.stats.judgmentsIncluded).toBe(2);
      expect(producer.pendingCount).toBe(3);
    });

    it('emits block:produced event', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({ proposeBlock: vi.fn(() => ({ id: 'r' })) });
      producer.start();

      const events = [];
      producer.on('block:produced', (e) => events.push(e));

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);
      producer._onSlot(42, false);

      expect(events.length).toBe(1);
      expect(events[0].slot).toBe(42);
      expect(events[0].hash).toBeDefined();
      expect(events[0].judgmentCount).toBe(0);
    });

    it('updates lastBlockHash after successful production', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const blocks = [];
      producer.wire({
        proposeBlock: vi.fn((block) => {
          blocks.push(block);
          return { id: 'r' };
        }),
      });
      producer.start();

      const initialHash = producer._lastBlockHash;
      expect(initialHash).toBe('0'.repeat(64));

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);
      producer._onSlot(10, false);

      expect(producer._lastBlockHash).not.toBe(initialHash);
      expect(producer._lastBlockHash).toBe(blocks[0].hash);
    });

    it('chains blocks via prev_hash', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const blocks = [];
      producer.wire({
        proposeBlock: vi.fn((block) => {
          blocks.push(block);
          return { id: 'r' };
        }),
      });
      producer.start();

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);

      producer._onSlot(10, false);
      producer._onSlot(11, false);

      expect(blocks.length).toBe(2);
      expect(blocks[1].prev_hash).toBe(blocks[0].hash);
    });

    it('handles proposeBlock failure gracefully', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({
        proposeBlock: vi.fn(() => {
          throw new Error('Consensus offline');
        }),
      });
      producer.start();

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);

      // Should not throw
      expect(() => producer._onSlot(10, false)).not.toThrow();
      expect(producer.stats.blocksProduced).toBe(0);
    });

    it('handles null proposeBlock return gracefully', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({ proposeBlock: vi.fn(() => null) });
      producer.start();

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(true);
      producer._onSlot(10, false);

      // No record returned = block not counted
      expect(producer.stats.blocksProduced).toBe(0);
    });

    it('syncs validators on new epoch', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      const mockGetValidators = vi.fn(() => [
        { publicKey: 'val-1', eScore: 60, burned: 0, uptime: 1.0 },
        { publicKey: 'val-2', eScore: 80, burned: 99, uptime: 0.9 },
      ]);
      producer.wire({ getValidators: mockGetValidators });
      producer.start();

      vi.spyOn(producer._slotManager, 'isLeader').mockReturnValue(false);

      // isNewEpoch = true should trigger _syncValidators
      producer._onSlot(432, true);

      // Called once on start() and once on epoch boundary
      expect(mockGetValidators).toHaveBeenCalledTimes(2);
    });
  });

  describe('_syncValidators (format conversion)', () => {
    it('converts ValidatorManager format to SlotManager {id, weight} format', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({
        getValidators: () => [
          { publicKey: 'val-1', eScore: 60, burned: 0, uptime: 1.0 },
          { publicKey: 'val-2', eScore: 80, burned: 99, uptime: 0.9 },
        ],
      });

      const spy = vi.spyOn(producer._slotManager, 'setValidators');
      producer._syncValidators();

      expect(spy).toHaveBeenCalledTimes(1);
      const validators = spy.mock.calls[0][0];

      // val-1: 60 * sqrt(1) * 1.0 = 60
      expect(validators[0]).toEqual({ id: 'val-1', weight: 60 });
      // val-2: 80 * sqrt(100) * 0.9 = 80 * 10 * 0.9 = 720
      expect(validators[1]).toEqual({ id: 'val-2', weight: 720 });
    });

    it('adds self to validator set if not present', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({
        getValidators: () => [
          { publicKey: 'other-validator', eScore: 50, burned: 0, uptime: 1.0 },
        ],
      });

      const spy = vi.spyOn(producer._slotManager, 'setValidators');
      producer._syncValidators();

      const validators = spy.mock.calls[0][0];
      expect(validators.length).toBe(2);
      expect(validators.find(v => v.id === mockPublicKey)).toBeDefined();
      expect(validators.find(v => v.id === mockPublicKey).weight).toBe(50);
    });

    it('does not duplicate self if already in validator set', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({
        getValidators: () => [
          { publicKey: mockPublicKey, eScore: 75, burned: 0, uptime: 1.0 },
        ],
      });

      const spy = vi.spyOn(producer._slotManager, 'setValidators');
      producer._syncValidators();

      const validators = spy.mock.calls[0][0];
      expect(validators.length).toBe(1);
      expect(validators[0].id).toBe(mockPublicKey);
    });

    it('handles empty validator set (adds self only)', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({ getValidators: () => [] });

      const spy = vi.spyOn(producer._slotManager, 'setValidators');
      producer._syncValidators();

      const validators = spy.mock.calls[0][0];
      expect(validators.length).toBe(1);
      expect(validators[0].id).toBe(mockPublicKey);
    });

    it('handles null getValidators gracefully', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      // No getValidators wired

      const spy = vi.spyOn(producer._slotManager, 'setValidators');
      producer._syncValidators();

      const validators = spy.mock.calls[0][0];
      expect(validators.length).toBe(1); // Just self
    });

    it('defaults missing burned/uptime fields', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });
      producer.wire({
        getValidators: () => [
          { publicKey: 'val-1', eScore: 50 }, // No burned/uptime
        ],
      });

      const spy = vi.spyOn(producer._slotManager, 'setValidators');
      producer._syncValidators();

      const validators = spy.mock.calls[0][0];
      // weight = 50 * sqrt(0+1) * 1.0 = 50
      expect(validators[0].weight).toBe(50);
    });
  });

  describe('_createBlock', () => {
    it('creates block with correct structure', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const judgments = [
        { judgment_id: 'jdg-1', q_score: 80, verdict: 'WAG', timestamp: Date.now() },
      ];

      const block = producer._createBlock(42, judgments);

      expect(block.slot).toBe(42);
      expect(block.proposer).toBe(mockPublicKey);
      expect(block.hash).toBeDefined();
      expect(block.hash.length).toBe(64); // SHA-256 hex
      expect(block.block_hash).toBe(block.hash);
      expect(block.prev_hash).toBe('0'.repeat(64));
      expect(block.merkle_root).toBeDefined();
      expect(block.judgments_root).toBe(block.merkle_root);
      expect(block.judgments).toHaveLength(1);
      expect(block.judgment_count).toBe(1);
      expect(block.judgment_ids).toContain('jdg-1');
      expect(block.timestamp).toBeDefined();
    });

    it('creates different hashes for different slots', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const block1 = producer._createBlock(1, []);
      const block2 = producer._createBlock(2, []);

      expect(block1.hash).not.toBe(block2.hash);
    });
  });

  describe('_computeMerkleRoot', () => {
    it('returns zero hash for empty judgments', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const root = producer._computeMerkleRoot([]);
      expect(root).toBe('0'.repeat(64));
    });

    it('returns SHA-256 hash of judgment IDs', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const root = producer._computeMerkleRoot([
        { judgment_id: 'jdg-1' },
        { judgment_id: 'jdg-2' },
      ]);

      expect(root.length).toBe(64);
      expect(root).not.toBe('0'.repeat(64));
    });

    it('returns different roots for different judgment sets', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const root1 = producer._computeMerkleRoot([{ judgment_id: 'a' }]);
      const root2 = producer._computeMerkleRoot([{ judgment_id: 'b' }]);

      expect(root1).not.toBe(root2);
    });

    it('is deterministic', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const judgments = [{ judgment_id: 'x' }, { judgment_id: 'y' }];
      const root1 = producer._computeMerkleRoot(judgments);
      const root2 = producer._computeMerkleRoot(judgments);

      expect(root1).toBe(root2);
    });
  });

  describe('stats', () => {
    it('returns a copy of stats (not reference)', () => {
      producer = new BlockProducer({ publicKey: mockPublicKey });

      const stats1 = producer.stats;
      const stats2 = producer.stats;

      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2); // Different objects
    });
  });
});
