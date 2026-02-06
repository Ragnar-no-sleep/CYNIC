/**
 * ValidatorManager Tests
 *
 * Comprehensive tests for validator set management,
 * E-Score provider integration, and protocol-aligned weight formula.
 *
 * "The pack decides who hunts — by merit, not by claim" - κυνικός
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { ValidatorManager } from '../src/network/validator-manager.js';
import { calculateVoteWeight } from '@cynic/protocol';

const SELF_KEY = 'self-node-public-key-0123456789ab';

describe('ValidatorManager', () => {
  let vm;

  beforeEach(() => {
    vm = new ValidatorManager({ selfPublicKey: SELF_KEY });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Constructor & basics
  // ═══════════════════════════════════════════════════════════════════════════

  describe('constructor', () => {
    it('creates with default config', () => {
      assert.strictEqual(vm.size, 0);
      assert.deepStrictEqual(vm.stats, {
        validatorsAdded: 0,
        validatorsRemoved: 0,
        validatorsPenalized: 0,
      });
    });

    it('accepts custom config overrides', () => {
      const custom = new ValidatorManager({
        selfPublicKey: SELF_KEY,
        config: { minEScore: 30, maxValidators: 10 },
      });
      // Add a validator with eScore 25 (below custom min of 30)
      const added = custom.addValidator({ publicKey: 'val-1', eScore: 25 });
      assert.strictEqual(added, false);
    });

    it('accepts eScoreProvider in constructor', () => {
      const provider = () => 50;
      const vmWithProvider = new ValidatorManager({
        selfPublicKey: SELF_KEY,
        eScoreProvider: provider,
      });
      assert.strictEqual(vmWithProvider._eScoreProvider, provider);
    });

    it('defaults eScoreProvider to null', () => {
      assert.strictEqual(vm._eScoreProvider, null);
    });
  });

  describe('eScoreProvider setter', () => {
    it('sets provider via setter', () => {
      const provider = () => 42;
      vm.eScoreProvider = provider;
      assert.strictEqual(vm._eScoreProvider, provider);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // addValidator
  // ═══════════════════════════════════════════════════════════════════════════

  describe('addValidator', () => {
    it('adds a new validator and returns true', () => {
      const result = vm.addValidator({ publicKey: 'val-1', eScore: 60, burned: 10 });
      assert.strictEqual(result, true);
      assert.strictEqual(vm.size, 1);
      assert.strictEqual(vm.stats.validatorsAdded, 1);
    });

    it('updates existing validator and returns false', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 60 });
      const result = vm.addValidator({ publicKey: 'val-1', eScore: 70 });
      assert.strictEqual(result, false);
      assert.strictEqual(vm.size, 1);
      assert.strictEqual(vm.getValidator('val-1').eScore, 70);
    });

    it('rejects validators below minEScore', () => {
      const result = vm.addValidator({ publicKey: 'val-1', eScore: 5 });
      assert.strictEqual(result, false);
      assert.strictEqual(vm.size, 0);
    });

    it('rejects validators without publicKey', () => {
      const result = vm.addValidator({ eScore: 50 });
      assert.strictEqual(result, false);
    });

    it('defaults eScore to 50 and burned to 0', () => {
      vm.addValidator({ publicKey: 'val-1' });
      const v = vm.getValidator('val-1');
      assert.strictEqual(v.eScore, 50);
      assert.strictEqual(v.burned, 0);
    });

    it('emits validator:added for new validators', () => {
      const events = [];
      vm.on('validator:added', (e) => events.push(e));
      vm.addValidator({ publicKey: 'val-1', eScore: 60 });
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].publicKey, 'val-1');
    });

    it('emits validator:updated for existing validators', () => {
      const events = [];
      vm.on('validator:updated', (e) => events.push(e));
      vm.addValidator({ publicKey: 'val-1', eScore: 60 });
      vm.addValidator({ publicKey: 'val-1', eScore: 70 });
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].eScore, 70);
    });

    it('evicts lowest validator when at capacity', () => {
      const small = new ValidatorManager({
        selfPublicKey: SELF_KEY,
        config: { maxValidators: 3 },
      });

      small.addValidator({ publicKey: SELF_KEY, eScore: 90 });
      small.addValidator({ publicKey: 'val-a', eScore: 30 });
      small.addValidator({ publicKey: 'val-b', eScore: 50 });

      // Full at 3 — adding higher eScore should evict val-a (lowest)
      const result = small.addValidator({ publicKey: 'val-c', eScore: 60 });
      assert.strictEqual(result, true);
      assert.strictEqual(small.size, 3);
      assert.strictEqual(small.getValidator('val-a'), null);
      assert.ok(small.getValidator('val-c'));
    });

    it('does not evict self even if lowest', () => {
      const small = new ValidatorManager({
        selfPublicKey: SELF_KEY,
        config: { maxValidators: 2 },
      });

      small.addValidator({ publicKey: SELF_KEY, eScore: 20 });
      small.addValidator({ publicKey: 'val-a', eScore: 50 });

      // Self is lowest but protected — should not evict self
      // Cannot add because val-a has higher score than incoming
      const result = small.addValidator({ publicKey: 'val-b', eScore: 40 });
      // val-a (50) > val-b (40) — eviction fails because new score isn't higher than lowest non-self
      assert.strictEqual(result, false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // removeValidator
  // ═══════════════════════════════════════════════════════════════════════════

  describe('removeValidator', () => {
    it('removes an existing validator', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      const result = vm.removeValidator('val-1', 'test');
      assert.strictEqual(result, true);
      assert.strictEqual(vm.size, 0);
      assert.strictEqual(vm.stats.validatorsRemoved, 1);
    });

    it('returns false for non-existent validator', () => {
      const result = vm.removeValidator('nonexistent');
      assert.strictEqual(result, false);
    });

    it('emits validator:removed with reason', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      const events = [];
      vm.on('validator:removed', (e) => events.push(e));
      vm.removeValidator('val-1', 'my_reason');
      assert.strictEqual(events[0].reason, 'my_reason');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // penalizeValidator
  // ═══════════════════════════════════════════════════════════════════════════

  describe('penalizeValidator', () => {
    it('applies penalty to validator eScore', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 60 });
      vm.penalizeValidator('val-1', 10, 'test');
      assert.strictEqual(vm.getValidator('val-1').eScore, 50);
      assert.strictEqual(vm.getValidator('val-1').penalties, 10);
    });

    it('accumulates penalties', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 80 });
      vm.penalizeValidator('val-1', 5, 'a');
      vm.penalizeValidator('val-1', 5, 'b');
      assert.strictEqual(vm.getValidator('val-1').penalties, 10);
      assert.strictEqual(vm.getValidator('val-1').eScore, 70);
    });

    it('removes validator when eScore drops below minimum', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 25 });
      vm.penalizeValidator('val-1', 10, 'heavy');
      // eScore = 15 < minEScore (20) → removed
      assert.strictEqual(vm.getValidator('val-1'), null);
    });

    it('returns false for non-existent validator', () => {
      assert.strictEqual(vm.penalizeValidator('nonexistent', 5, 'x'), false);
    });

    it('emits validator:penalized', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 60 });
      const events = [];
      vm.on('validator:penalized', (e) => events.push(e));
      vm.penalizeValidator('val-1', 5, 'test');
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].penalty, 5);
      assert.strictEqual(events[0].newEScore, 55);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // rewardValidator
  // ═══════════════════════════════════════════════════════════════════════════

  describe('rewardValidator', () => {
    it('increments blocksProposed on block_proposed', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.rewardValidator('val-1', 'block_proposed');
      assert.strictEqual(vm.getValidator('val-1').blocksProposed, 1);
    });

    it('increments blocksFinalized and boosts eScore on block_finalized', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.rewardValidator('val-1', 'block_finalized');
      assert.strictEqual(vm.getValidator('val-1').blocksFinalized, 1);
      assert.ok(vm.getValidator('val-1').eScore > 50);
    });

    it('caps eScore at 100', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 99.5 });
      vm.rewardValidator('val-1', 'block_finalized');
      assert.ok(vm.getValidator('val-1').eScore <= 100);
    });

    it('emits validator:rewarded', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      const events = [];
      vm.on('validator:rewarded', (e) => events.push(e));
      vm.rewardValidator('val-1', 'block_proposed');
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].action, 'block_proposed');
    });

    it('does nothing for non-existent validator', () => {
      // Should not throw
      vm.rewardValidator('nonexistent', 'block_proposed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // updateValidatorActivity
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateValidatorActivity', () => {
    it('updates lastSeen and sets status to active', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      const before = vm.getValidator('val-1').lastSeen;

      // Small delay to ensure timestamp differs
      vm.getValidator('val-1').status = 'inactive';
      vm.updateValidatorActivity('val-1');

      assert.strictEqual(vm.getValidator('val-1').status, 'active');
      assert.ok(vm.getValidator('val-1').lastSeen >= before);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // checkInactiveValidators
  // ═══════════════════════════════════════════════════════════════════════════

  describe('checkInactiveValidators', () => {
    it('marks validators inactive after timeout', () => {
      const short = new ValidatorManager({
        selfPublicKey: SELF_KEY,
        config: { inactivityTimeout: 1 }, // 1ms timeout for test
      });
      short.addValidator({ publicKey: 'val-1', eScore: 50 });
      // Force lastSeen to be old
      short.getValidator('val-1').lastSeen = Date.now() - 100;

      short.checkInactiveValidators();
      assert.strictEqual(short.getValidator('val-1').status, 'inactive');
    });

    it('penalizes for extended inactivity (3x timeout)', () => {
      const short = new ValidatorManager({
        selfPublicKey: SELF_KEY,
        config: { inactivityTimeout: 1 },
      });
      short.addValidator({ publicKey: 'val-1', eScore: 50 });
      short.getValidator('val-1').lastSeen = Date.now() - 100; // Well past 3x timeout

      const events = [];
      short.on('validator:penalized', (e) => events.push(e));
      short.checkInactiveValidators();

      assert.ok(events.length > 0);
    });

    it('emits validator:inactive', () => {
      const short = new ValidatorManager({
        selfPublicKey: SELF_KEY,
        config: { inactivityTimeout: 1 },
      });
      short.addValidator({ publicKey: 'val-1', eScore: 50 });
      short.getValidator('val-1').lastSeen = Date.now() - 100;

      const events = [];
      short.on('validator:inactive', (e) => events.push(e));
      short.checkInactiveValidators();
      assert.strictEqual(events.length, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // applyPenaltyDecay
  // ═══════════════════════════════════════════════════════════════════════════

  describe('applyPenaltyDecay', () => {
    it('decays penalties by decay rate', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.penalizeValidator('val-1', 10, 'test');

      vm.applyPenaltyDecay();
      // Default decay = 0.95, so 10 * 0.95 = 9.5
      assert.ok(Math.abs(vm.getValidator('val-1').penalties - 9.5) < 0.01);
    });

    it('zeroes out small penalties', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.getValidator('val-1').penalties = 0.05; // Below 0.1 threshold

      vm.applyPenaltyDecay();
      assert.strictEqual(vm.getValidator('val-1').penalties, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getValidators
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getValidators', () => {
    it('returns all validators sorted by effective score', () => {
      vm.addValidator({ publicKey: 'val-low', eScore: 30 });
      vm.addValidator({ publicKey: 'val-high', eScore: 90 });
      vm.addValidator({ publicKey: 'val-mid', eScore: 60 });

      const validators = vm.getValidators();
      assert.strictEqual(validators.length, 3);
      assert.strictEqual(validators[0].publicKey, 'val-high');
      assert.strictEqual(validators[2].publicKey, 'val-low');
    });

    it('filters by status', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.addValidator({ publicKey: 'val-2', eScore: 60 });
      vm.getValidator('val-1').status = 'inactive';

      const active = vm.getValidators({ status: 'active' });
      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].publicKey, 'val-2');
    });

    it('filters by minEScore', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 30 });
      vm.addValidator({ publicKey: 'val-2', eScore: 60 });

      const filtered = vm.getValidators({ minEScore: 50 });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].publicKey, 'val-2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getValidatorSetStatus
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getValidatorSetStatus', () => {
    it('returns summary stats', () => {
      vm.addValidator({ publicKey: SELF_KEY, eScore: 80 });
      vm.addValidator({ publicKey: 'val-1', eScore: 60 });

      const status = vm.getValidatorSetStatus();
      assert.strictEqual(status.total, 2);
      assert.strictEqual(status.active, 2);
      assert.strictEqual(status.inactive, 0);
      assert.strictEqual(status.selfIncluded, true);
      assert.strictEqual(status.totalEScore, 140);
      assert.strictEqual(status.avgEScore, 70);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getTotalVotingWeight (protocol-aligned)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getTotalVotingWeight', () => {
    it('uses protocol calculateVoteWeight formula', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50, burned: 0 });

      const weight = vm.getTotalVotingWeight();
      const expected = calculateVoteWeight({ eScore: 50, burned: 0, uptime: 1.0 });
      assert.strictEqual(weight, expected);
    });

    it('only includes active validators', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.addValidator({ publicKey: 'val-2', eScore: 50 });
      vm.getValidator('val-2').status = 'inactive';

      const weight = vm.getTotalVotingWeight();
      const singleWeight = calculateVoteWeight({ eScore: 50, burned: 0, uptime: 1.0 });
      assert.strictEqual(weight, singleWeight);
    });

    it('sums weights of multiple active validators', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50, burned: 0 });
      vm.addValidator({ publicKey: 'val-2', eScore: 80, burned: 100 });

      const weight = vm.getTotalVotingWeight();
      const w1 = calculateVoteWeight({ eScore: 50, burned: 0, uptime: 1.0 });
      const w2 = calculateVoteWeight({ eScore: 80, burned: 100, uptime: 1.0 });
      assert.ok(Math.abs(weight - (w1 + w2)) < 0.001);
    });

    it('returns 0 for empty validator set', () => {
      assert.strictEqual(vm.getTotalVotingWeight(), 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getValidatorWeight
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getValidatorWeight', () => {
    it('returns weight for active validator', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 60, burned: 50 });
      const weight = vm.getValidatorWeight('val-1');
      const expected = calculateVoteWeight({ eScore: 60, burned: 50, uptime: 1.0 });
      assert.strictEqual(weight, expected);
    });

    it('returns 0 for non-existent validator', () => {
      assert.strictEqual(vm.getValidatorWeight('nonexistent'), 0);
    });

    it('returns 0 for inactive validator', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.getValidator('val-1').status = 'inactive';
      assert.strictEqual(vm.getValidatorWeight('val-1'), 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // hasSupermajority
  // ═══════════════════════════════════════════════════════════════════════════

  describe('hasSupermajority', () => {
    it('returns true when voting weight >= 61.8% of total', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      const total = vm.getTotalVotingWeight();
      assert.strictEqual(vm.hasSupermajority(total * 0.618), true);
    });

    it('returns false when voting weight < 61.8% of total', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      const total = vm.getTotalVotingWeight();
      assert.strictEqual(vm.hasSupermajority(total * 0.5), false);
    });

    it('returns false when total is 0', () => {
      assert.strictEqual(vm.hasSupermajority(100), false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // wire()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('wire()', () => {
    it('calls syncToConsensus on addValidator', () => {
      const syncFn = mock.fn();
      vm.wire({ syncToConsensus: syncFn, removeFromConsensus: () => {} });

      vm.addValidator({ publicKey: 'val-1', eScore: 60, burned: 10 });
      assert.strictEqual(syncFn.mock.callCount(), 1);
      assert.deepStrictEqual(syncFn.mock.calls[0].arguments[0], {
        publicKey: 'val-1',
        eScore: 60,
        burned: 10,
        uptime: 1.0,
      });
    });

    it('calls syncToConsensus on penalizeValidator (when not removed)', () => {
      const syncFn = mock.fn();
      vm.wire({ syncToConsensus: syncFn, removeFromConsensus: () => {} });

      vm.addValidator({ publicKey: 'val-1', eScore: 60 });
      vm.penalizeValidator('val-1', 5, 'test');

      // Called twice: once on add, once on penalize
      assert.strictEqual(syncFn.mock.callCount(), 2);
    });

    it('calls removeFromConsensus on removeValidator', () => {
      const removeFn = mock.fn();
      vm.wire({ syncToConsensus: () => {}, removeFromConsensus: removeFn });

      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.removeValidator('val-1', 'test');

      assert.strictEqual(removeFn.mock.callCount(), 1);
      assert.strictEqual(removeFn.mock.calls[0].arguments[0], 'val-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // refreshEScores (E-Score provider integration)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('refreshEScores', () => {
    it('returns 0 when no provider is set', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      assert.strictEqual(vm.refreshEScores(), 0);
    });

    it('updates validator eScores from provider', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.addValidator({ publicKey: 'val-2', eScore: 60 });

      vm.eScoreProvider = (pk) => pk === 'val-1' ? 70 : 80;

      const updated = vm.refreshEScores();
      assert.strictEqual(updated, 2);
      assert.strictEqual(vm.getValidator('val-1').eScore, 70);
      assert.strictEqual(vm.getValidator('val-2').eScore, 80);
    });

    it('skips validators with unchanged scores', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.eScoreProvider = () => 50; // Same score

      const updated = vm.refreshEScores();
      assert.strictEqual(updated, 0);
    });

    it('skips inactive validators', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.getValidator('val-1').status = 'inactive';

      vm.eScoreProvider = () => 70;

      const updated = vm.refreshEScores();
      assert.strictEqual(updated, 0);
    });

    it('skips when provider returns null', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.eScoreProvider = () => null;

      const updated = vm.refreshEScores();
      assert.strictEqual(updated, 0);
      assert.strictEqual(vm.getValidator('val-1').eScore, 50);
    });

    it('removes validators whose eScore drops below minimum', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.eScoreProvider = () => 10; // Below minEScore (20)

      const events = [];
      vm.on('validator:removed', (e) => events.push(e));

      const updated = vm.refreshEScores();
      assert.strictEqual(updated, 1);
      assert.strictEqual(vm.getValidator('val-1'), null);
      assert.strictEqual(events[0].reason, 'escore_below_minimum');
    });

    it('emits validator:escore_updated event', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.eScoreProvider = () => 70;

      const events = [];
      vm.on('validator:escore_updated', (e) => events.push(e));

      vm.refreshEScores();
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].publicKey, 'val-1');
      assert.strictEqual(events[0].oldScore, 50);
      assert.strictEqual(events[0].newScore, 70);
    });

    it('calls syncToConsensus for updated validators', () => {
      const syncFn = mock.fn();
      vm.wire({ syncToConsensus: syncFn, removeFromConsensus: () => {} });

      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      const addCalls = syncFn.mock.callCount();

      vm.eScoreProvider = () => 70;
      vm.refreshEScores();

      // One additional sync call from refreshEScores
      assert.strictEqual(syncFn.mock.callCount(), addCalls + 1);
      assert.strictEqual(syncFn.mock.calls[addCalls].arguments[0].eScore, 70);
    });

    it('handles provider errors gracefully per-validator', () => {
      vm.addValidator({ publicKey: 'val-1', eScore: 50 });
      vm.addValidator({ publicKey: 'val-2', eScore: 60 });

      vm.eScoreProvider = (pk) => {
        if (pk === 'val-1') throw new Error('Provider error');
        return 80;
      };

      // Should not throw, and should still update val-2
      const updated = vm.refreshEScores();
      assert.strictEqual(updated, 1);
      assert.strictEqual(vm.getValidator('val-1').eScore, 50); // Unchanged
      assert.strictEqual(vm.getValidator('val-2').eScore, 80); // Updated
    });
  });
});
