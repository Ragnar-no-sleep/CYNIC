/**
 * Layer 4: φ-BFT Consensus Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  // Voting
  VoteType,
  ConsensusType,
  calculateVoteWeight,
  generateVoteId,
  createVote,
  verifyVote,
  calculateConsensus,
  checkSoftConsensus,
  aggregateVoteRounds,
  // Lockout
  VoterLockout,
  LockoutManager,
  calculateTotalLockout,
  confirmationsForLockout,
  // Proposal
  ProposalAction,
  ProposalStatus,
  generateProposalId,
  createProposal,
  verifyProposal,
  validateProposal,
  addVoteToProposal,
  finalizeProposal,
  createAddDimensionProposal,
  createParameterChangeProposal,
  generateKeypair,
  // Slot management
  SLOT_DURATION_MS,
  SLOTS_PER_EPOCH,
  getCurrentSlot,
  getEpochForSlot,
  getSlotIndexInEpoch,
  timeUntilNextSlot,
  getSlotTimestamp,
  selectLeader,
  createEpochSchedule,
  SlotManager,
  // Finality
  FinalityStatus,
  calculateFinalityProbability,
  estimateTimeToFinality,
  checkForkPossibility,
  FinalityTracker,
  // Messages
  ConsensusMessageType,
  createBlockProposal,
  createVoteMessage,
  createVoteAggregate,
  createFinalityNotification,
  createSlotStatus,
  validateMessage,
  isConsensusMessage,
  // Engine
  ConsensusEngine,
} from '../src/index.js';

import { PHI, PHI_INV, CONSENSUS_THRESHOLD, GOVERNANCE_QUORUM } from '@cynic/core';

describe('Vote Weight Calculation', () => {
  it('should calculate base vote weight', () => {
    const weight = calculateVoteWeight({
      eScore: 100,
      burned: 0,
      uptime: 1,
    });

    assert.strictEqual(weight, 100); // No burn multiplier
  });

  it('should apply burn multiplier', () => {
    const withoutBurn = calculateVoteWeight({
      eScore: 100,
      burned: 0,
      uptime: 1,
    });

    const withBurn = calculateVoteWeight({
      eScore: 100,
      burned: 100,
      uptime: 1,
    });

    assert.ok(withBurn > withoutBurn);
  });

  it('should apply uptime factor', () => {
    const fullUptime = calculateVoteWeight({
      eScore: 100,
      burned: 10,
      uptime: 1,
    });

    const halfUptime = calculateVoteWeight({
      eScore: 100,
      burned: 10,
      uptime: 0.5,
    });

    assert.ok(fullUptime > halfUptime);
    assert.ok(Math.abs(halfUptime - fullUptime * 0.5) < 0.01);
  });

  it('should handle zero eScore', () => {
    const weight = calculateVoteWeight({
      eScore: 0,
      burned: 100,
      uptime: 1,
    });

    assert.strictEqual(weight, 0);
  });
});

describe('Vote Creation', () => {
  let voterKeypair;

  beforeEach(() => {
    voterKeypair = generateKeypair();
  });

  it('should generate unique vote IDs', () => {
    const id1 = generateVoteId();
    const id2 = generateVoteId();
    assert.ok(id1.startsWith('vote_'));
    assert.notStrictEqual(id1, id2);
  });

  it('should create vote with signature', () => {
    const vote = createVote({
      proposalId: 'prop_123',
      vote: VoteType.APPROVE,
      voterPublicKey: voterKeypair.publicKey,
      voterPrivateKey: voterKeypair.privateKey,
      eScore: 80,
      burned: 50,
      uptime: 0.95,
    });

    assert.ok(vote.id.startsWith('vote_'));
    assert.strictEqual(vote.proposal_id, 'prop_123');
    assert.strictEqual(vote.vote, VoteType.APPROVE);
    assert.strictEqual(vote.e_score, 80);
    assert.ok(vote.weight > 0);
    assert.ok(vote.signature);
  });

  it('should verify vote signature', () => {
    const vote = createVote({
      proposalId: 'prop_123',
      vote: VoteType.REJECT,
      voterPublicKey: voterKeypair.publicKey,
      voterPrivateKey: voterKeypair.privateKey,
      eScore: 75,
    });

    const valid = verifyVote(vote);
    assert.strictEqual(valid, true);
  });

  it('should reject tampered vote', () => {
    const vote = createVote({
      proposalId: 'prop_123',
      vote: VoteType.APPROVE,
      voterPublicKey: voterKeypair.publicKey,
      voterPrivateKey: voterKeypair.privateKey,
      eScore: 75,
    });

    // Tamper with vote
    vote.vote = VoteType.REJECT;

    const valid = verifyVote(vote);
    assert.strictEqual(valid, false);
  });

  it('should reject vote without signature', () => {
    const vote = {
      id: 'vote_123',
      proposal_id: 'prop_123',
      vote: VoteType.APPROVE,
      voter: 'ed25519:abc',
    };

    const valid = verifyVote(vote);
    assert.strictEqual(valid, false);
  });
});

describe('Consensus Calculation', () => {
  let keypairs;

  beforeEach(() => {
    keypairs = Array.from({ length: 10 }, () => generateKeypair());
  });

  it('should calculate hard consensus (φ⁻¹ threshold)', () => {
    // Create votes where 70% approve (above 61.8% threshold)
    const votes = keypairs.map((kp, i) =>
      createVote({
        proposalId: 'prop_123',
        vote: i < 7 ? VoteType.APPROVE : VoteType.REJECT,
        voterPublicKey: kp.publicKey,
        voterPrivateKey: kp.privateKey,
        eScore: 75,
      })
    );

    const result = calculateConsensus(votes, ConsensusType.HARD);
    assert.strictEqual(result.reached, true);
    assert.strictEqual(result.result, VoteType.APPROVE);
    assert.ok(result.ratio >= CONSENSUS_THRESHOLD);
  });

  it('should reject below threshold', () => {
    // Create votes where 50% approve (below 61.8% threshold)
    const votes = keypairs.map((kp, i) =>
      createVote({
        proposalId: 'prop_123',
        vote: i < 5 ? VoteType.APPROVE : VoteType.REJECT,
        voterPublicKey: kp.publicKey,
        voterPrivateKey: kp.privateKey,
        eScore: 75,
      })
    );

    const result = calculateConsensus(votes, ConsensusType.HARD);
    assert.strictEqual(result.reached, false);
    assert.strictEqual(result.result, VoteType.REJECT);
  });

  it('should use simple majority for soft consensus', () => {
    // 60% approve (below 61.8% but above 50%)
    const votes = keypairs.slice(0, 5).map((kp, i) =>
      createVote({
        proposalId: 'prop_123',
        vote: i < 3 ? VoteType.APPROVE : VoteType.REJECT,
        voterPublicKey: kp.publicKey,
        voterPrivateKey: kp.privateKey,
        eScore: 75,
      })
    );

    const result = calculateConsensus(votes, ConsensusType.SOFT);
    assert.strictEqual(result.reached, true);
    assert.strictEqual(result.threshold, 0.5);
  });

  it('should weight votes by E-Score and burn', () => {
    // Two voters: one high-weight, one low-weight
    const highWeight = createVote({
      proposalId: 'prop_123',
      vote: VoteType.APPROVE,
      voterPublicKey: keypairs[0].publicKey,
      voterPrivateKey: keypairs[0].privateKey,
      eScore: 100,
      burned: 1000,
    });

    const lowWeight = createVote({
      proposalId: 'prop_123',
      vote: VoteType.REJECT,
      voterPublicKey: keypairs[1].publicKey,
      voterPrivateKey: keypairs[1].privateKey,
      eScore: 10,
      burned: 0,
    });

    const result = calculateConsensus([highWeight, lowWeight]);
    assert.ok(result.approveWeight > result.rejectWeight);
  });

  it('should ignore abstain votes', () => {
    const votes = [
      createVote({
        proposalId: 'prop_123',
        vote: VoteType.APPROVE,
        voterPublicKey: keypairs[0].publicKey,
        voterPrivateKey: keypairs[0].privateKey,
        eScore: 75,
      }),
      createVote({
        proposalId: 'prop_123',
        vote: VoteType.ABSTAIN,
        voterPublicKey: keypairs[1].publicKey,
        voterPrivateKey: keypairs[1].privateKey,
        eScore: 75,
      }),
    ];

    const result = calculateConsensus(votes);
    assert.strictEqual(result.voterCount, 1);
  });

  it('should handle empty votes', () => {
    const result = calculateConsensus([]);
    assert.strictEqual(result.reached, false);
    assert.strictEqual(result.totalWeight, 0);
  });

  it('should check quorum for hard consensus', () => {
    // Less than quorum
    const votes = keypairs.slice(0, 2).map((kp) =>
      createVote({
        proposalId: 'prop_123',
        vote: VoteType.APPROVE,
        voterPublicKey: kp.publicKey,
        voterPrivateKey: kp.privateKey,
        eScore: 75,
      })
    );

    const result = calculateConsensus(votes, ConsensusType.HARD);
    if (GOVERNANCE_QUORUM > 2) {
      assert.strictEqual(result.hasQuorum, false);
      assert.strictEqual(result.reached, false);
    }
  });
});

describe('Soft Consensus', () => {
  it('should require minimum independent sources', () => {
    const observations = [
      { source: 'node1', value: 'x' },
      { source: 'node2', value: 'x' },
      { source: 'node3', value: 'x' },
    ];

    const result = checkSoftConsensus(observations, 3);
    assert.strictEqual(result.reached, true);
    assert.strictEqual(result.sources, 3);
  });

  it('should count unique sources only', () => {
    const observations = [
      { source: 'node1', value: 'x' },
      { source: 'node1', value: 'y' }, // Same source
      { source: 'node2', value: 'x' },
    ];

    const result = checkSoftConsensus(observations, 3);
    assert.strictEqual(result.reached, false);
    assert.strictEqual(result.sources, 2);
  });

  it('should use operator as source fallback', () => {
    const observations = [
      { operator: 'op1' },
      { operator: 'op2' },
      { operator: 'op3' },
    ];

    const result = checkSoftConsensus(observations);
    assert.strictEqual(result.sources, 3);
  });
});

describe('Vote Aggregation', () => {
  let keypairs;

  beforeEach(() => {
    keypairs = Array.from({ length: 5 }, () => generateKeypair());
  });

  it('should aggregate multiple voting rounds', () => {
    const round1 = [
      createVote({
        proposalId: 'prop_123',
        vote: VoteType.APPROVE,
        voterPublicKey: keypairs[0].publicKey,
        voterPrivateKey: keypairs[0].privateKey,
        eScore: 75,
      }),
    ];

    const round2 = [
      createVote({
        proposalId: 'prop_123',
        vote: VoteType.APPROVE,
        voterPublicKey: keypairs[1].publicKey,
        voterPrivateKey: keypairs[1].privateKey,
        eScore: 75,
      }),
    ];

    const result = aggregateVoteRounds([round1, round2]);
    assert.strictEqual(result.voterCount, 2);
  });

  it('should keep latest vote per voter', async () => {
    // First vote: REJECT
    const vote1 = createVote({
      proposalId: 'prop_123',
      vote: VoteType.REJECT,
      voterPublicKey: keypairs[0].publicKey,
      voterPrivateKey: keypairs[0].privateKey,
      eScore: 75,
    });

    // Wait a bit for different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second vote: APPROVE (same voter)
    const vote2 = createVote({
      proposalId: 'prop_123',
      vote: VoteType.APPROVE,
      voterPublicKey: keypairs[0].publicKey,
      voterPrivateKey: keypairs[0].privateKey,
      eScore: 75,
    });

    const result = aggregateVoteRounds([[vote1], [vote2]]);
    assert.strictEqual(result.voterCount, 1);
    assert.strictEqual(result.result, VoteType.APPROVE); // Latest vote wins
  });
});

describe('Voter Lockout', () => {
  let lockout;

  beforeEach(() => {
    lockout = new VoterLockout('voter123');
  });

  it('should record votes', () => {
    const record = lockout.recordVote('block_abc', 100);

    assert.strictEqual(record.blockHash, 'block_abc');
    assert.strictEqual(record.initialSlot, 100);
    assert.strictEqual(record.confirmations, 1);
  });

  it('should increment confirmations on re-vote', () => {
    lockout.recordVote('block_abc', 100);
    lockout.recordVote('block_abc', 101);
    lockout.recordVote('block_abc', 102);

    const votes = lockout.getActiveVotes();
    const record = votes.find((v) => v.blockHash === 'block_abc');

    assert.strictEqual(record.confirmations, 3);
  });

  it('should calculate φⁿ lockout', () => {
    lockout.recordVote('block_abc', 100);
    const slots1 = lockout.getLockoutSlots('block_abc');
    assert.ok(Math.abs(slots1 - PHI) < 0.01);

    lockout.recordVote('block_abc', 101);
    const slots2 = lockout.getLockoutSlots('block_abc');
    assert.ok(Math.abs(slots2 - PHI * PHI) < 0.01);
  });

  it('should check lockout status', () => {
    lockout.recordVote('block_abc', 100);

    // Immediately after vote
    assert.strictEqual(lockout.isLockedOut('block_abc', 100), true);
    assert.strictEqual(lockout.isLockedOut('block_abc', 101), true);

    // After lockout expires (φ¹ ≈ 1.618 slots)
    assert.strictEqual(lockout.isLockedOut('block_abc', 103), false);
  });

  it('should check switch eligibility', () => {
    lockout.recordVote('block_abc', 100);

    const status1 = lockout.canSwitchVote(100);
    assert.strictEqual(status1.canSwitch, false);
    assert.strictEqual(status1.locked.length, 1);

    const status2 = lockout.canSwitchVote(200);
    assert.strictEqual(status2.canSwitch, true);
    assert.strictEqual(status2.unlocked.length, 1);
  });

  it('should prune old votes', () => {
    lockout.recordVote('block_abc', 100);
    lockout.recordVote('block_def', 500);

    lockout.pruneOldVotes(1200, 1000);

    const votes = lockout.getActiveVotes();
    assert.strictEqual(votes.length, 1);
    assert.strictEqual(votes[0].blockHash, 'block_def');
  });
});

describe('Lockout Manager', () => {
  let manager;

  beforeEach(() => {
    manager = new LockoutManager();
  });

  it('should track multiple voters', () => {
    manager.recordVote('voter1', 'block_abc', 100);
    manager.recordVote('voter2', 'block_abc', 100);
    manager.recordVote('voter3', 'block_def', 100);

    const stats = manager.getStats(100);
    assert.strictEqual(stats.totalVoters, 3);
  });

  it('should check lockout across voters', () => {
    manager.recordVote('voter1', 'block_abc', 100);

    assert.strictEqual(manager.isLockedOut('voter1', 'block_abc', 100), true);
    assert.strictEqual(manager.isLockedOut('voter2', 'block_abc', 100), false);
  });

  it('should check switch eligibility', () => {
    manager.recordVote('voter1', 'block_abc', 100);

    const status = manager.canSwitchVote('voter1', 100);
    assert.strictEqual(status.canSwitch, false);

    const status2 = manager.canSwitchVote('voter2', 100);
    assert.strictEqual(status2.canSwitch, true);
  });

  it('should prune all voters', () => {
    manager.recordVote('voter1', 'block_abc', 100);
    manager.recordVote('voter2', 'block_def', 200);

    manager.prune(1500);

    const voter1 = manager.getVoter('voter1');
    assert.strictEqual(voter1.getActiveVotes().length, 0);
  });
});

describe('Lockout Calculations', () => {
  it('should calculate total lockout', () => {
    // Sum of φ¹ + φ² + φ³
    const total = calculateTotalLockout(3);
    const expected = PHI + PHI * PHI + PHI * PHI * PHI;
    assert.ok(Math.abs(total - expected) < 0.01);
  });

  it('should estimate confirmations for lockout', () => {
    const confs = confirmationsForLockout(100);
    const actual = calculateTotalLockout(confs);
    assert.ok(actual >= 100);
  });
});

describe('Proposal Management', () => {
  let keypair;

  beforeEach(() => {
    keypair = generateKeypair();
  });

  it('should generate unique proposal IDs', () => {
    const id1 = generateProposalId();
    const id2 = generateProposalId();
    assert.ok(id1.startsWith('prop_'));
    assert.notStrictEqual(id1, id2);
  });

  it('should create proposal with signature', () => {
    const proposal = createProposal({
      action: ProposalAction.ADD_DIMENSION,
      params: { name: 'INTEGRITY', axiom: 'VERIFY', threshold: 50 },
      description: 'Add INTEGRITY dimension',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    assert.ok(proposal.id.startsWith('prop_'));
    assert.strictEqual(proposal.action, ProposalAction.ADD_DIMENSION);
    assert.strictEqual(proposal.status, ProposalStatus.VOTING);
    assert.ok(proposal.signature);
  });

  it('should verify proposal signature', () => {
    const proposal = createProposal({
      action: ProposalAction.BAN_PEER,
      params: { peerId: 'peer123' },
      description: 'Ban malicious peer',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    const valid = verifyProposal(proposal);
    assert.strictEqual(valid, true);
  });

  it('should reject tampered proposal', () => {
    const proposal = createProposal({
      action: ProposalAction.BAN_PEER,
      params: { peerId: 'peer123' },
      description: 'Ban malicious peer',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    // Tamper
    proposal.params.peerId = 'peer456';

    const valid = verifyProposal(proposal);
    assert.strictEqual(valid, false);
  });

  it('should reject invalid action', () => {
    assert.throws(() => {
      createProposal({
        action: 'INVALID_ACTION',
        params: {},
        description: 'Invalid',
        proposerPublicKey: keypair.publicKey,
        proposerPrivateKey: keypair.privateKey,
      });
    });
  });

  it('should validate ADD_DIMENSION proposal', () => {
    const valid = createProposal({
      action: ProposalAction.ADD_DIMENSION,
      params: { name: 'TEST', axiom: 'PHI', threshold: 50 },
      description: 'Add test dimension',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    const result = validateProposal(valid);
    assert.strictEqual(result.valid, true);

    const invalid = createProposal({
      action: ProposalAction.ADD_DIMENSION,
      params: { axiom: 'INVALID' }, // Missing name, invalid axiom
      description: 'Invalid',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    const result2 = validateProposal(invalid);
    assert.strictEqual(result2.valid, false);
    assert.ok(result2.errors.length > 0);
  });

  it('should validate MODIFY_THRESHOLD proposal', () => {
    const valid = createProposal({
      action: ProposalAction.MODIFY_THRESHOLD,
      params: { threshold: 75 },
      description: 'Modify threshold',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    const result = validateProposal(valid);
    assert.strictEqual(result.valid, true);

    const invalid = createProposal({
      action: ProposalAction.MODIFY_THRESHOLD,
      params: { threshold: 150 }, // Out of range
      description: 'Invalid',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    const result2 = validateProposal(invalid);
    assert.strictEqual(result2.valid, false);
  });

  it('should add votes to proposal', () => {
    const proposal = createProposal({
      action: ProposalAction.PARAMETER_CHANGE,
      params: { parameter: 'X', oldValue: 1, newValue: 2 },
      description: 'Change X',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    const voterKeypair = generateKeypair();
    const vote = createVote({
      proposalId: proposal.id,
      vote: VoteType.APPROVE,
      voterPublicKey: voterKeypair.publicKey,
      voterPrivateKey: voterKeypair.privateKey,
      eScore: 75,
    });

    addVoteToProposal(proposal, vote);
    assert.strictEqual(proposal.votes.length, 1);
  });

  it('should update existing vote', () => {
    const proposal = createProposal({
      action: ProposalAction.PARAMETER_CHANGE,
      params: { parameter: 'X', oldValue: 1, newValue: 2 },
      description: 'Change X',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    const voterKeypair = generateKeypair();

    const vote1 = createVote({
      proposalId: proposal.id,
      vote: VoteType.APPROVE,
      voterPublicKey: voterKeypair.publicKey,
      voterPrivateKey: voterKeypair.privateKey,
      eScore: 75,
    });

    const vote2 = createVote({
      proposalId: proposal.id,
      vote: VoteType.REJECT,
      voterPublicKey: voterKeypair.publicKey,
      voterPrivateKey: voterKeypair.privateKey,
      eScore: 75,
    });

    addVoteToProposal(proposal, vote1);
    addVoteToProposal(proposal, vote2);

    assert.strictEqual(proposal.votes.length, 1);
    assert.strictEqual(proposal.votes[0].vote, VoteType.REJECT);
  });

  it('should finalize passed proposal', () => {
    const proposal = createProposal({
      action: ProposalAction.ADD_PATTERN,
      params: { patternId: 'pat_123' },
      description: 'Force add pattern',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
      votingDurationMs: 1, // Expire immediately
    });

    // Add enough votes to pass
    for (let i = 0; i < GOVERNANCE_QUORUM + 1; i++) {
      const vKp = generateKeypair();
      const vote = createVote({
        proposalId: proposal.id,
        vote: VoteType.APPROVE,
        voterPublicKey: vKp.publicKey,
        voterPrivateKey: vKp.privateKey,
        eScore: 75,
      });
      proposal.votes.push(vote);
    }

    // Wait for voting to end
    setTimeout(() => {
      finalizeProposal(proposal);
      assert.strictEqual(proposal.status, ProposalStatus.PASSED);
    }, 10);
  });

  it('should expire proposal without quorum', () => {
    const proposal = createProposal({
      action: ProposalAction.ADD_PATTERN,
      params: { patternId: 'pat_123' },
      description: 'Force add pattern',
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
      votingDurationMs: 1, // Expire immediately
    });

    // Only 1 vote (below quorum)
    const vKp = generateKeypair();
    const vote = createVote({
      proposalId: proposal.id,
      vote: VoteType.APPROVE,
      voterPublicKey: vKp.publicKey,
      voterPrivateKey: vKp.privateKey,
      eScore: 75,
    });
    proposal.votes.push(vote);

    setTimeout(() => {
      finalizeProposal(proposal);
      if (GOVERNANCE_QUORUM > 1) {
        assert.strictEqual(proposal.status, ProposalStatus.EXPIRED);
        assert.strictEqual(proposal.result.reason, 'quorum_not_met');
      }
    }, 10);
  });

  it('should create ADD_DIMENSION helper', () => {
    const proposal = createAddDimensionProposal({
      name: 'CLARITY',
      axiom: 'VERIFY',
      threshold: 60,
      weight: 0.618,
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    assert.strictEqual(proposal.action, ProposalAction.ADD_DIMENSION);
    assert.strictEqual(proposal.params.name, 'CLARITY');
    assert.strictEqual(proposal.params.axiom, 'VERIFY');
  });

  it('should create PARAMETER_CHANGE helper', () => {
    const proposal = createParameterChangeProposal({
      parameter: 'CONSENSUS_THRESHOLD',
      oldValue: 0.618,
      newValue: 0.7,
      proposerPublicKey: keypair.publicKey,
      proposerPrivateKey: keypair.privateKey,
    });

    assert.strictEqual(proposal.action, ProposalAction.PARAMETER_CHANGE);
    assert.strictEqual(proposal.params.parameter, 'CONSENSUS_THRESHOLD');
  });
});

// ============================================
// New φ-BFT Consensus Tests
// ============================================

describe('Slot Management', () => {
  const genesisTime = 1700000000000; // Fixed genesis for tests

  it('should calculate current slot', () => {
    const now = genesisTime + 800; // 800ms after genesis
    const slot = getCurrentSlot(genesisTime, now);
    assert.strictEqual(slot, 2); // 800/400 = 2
  });

  it('should return 0 for time before genesis', () => {
    const slot = getCurrentSlot(genesisTime, genesisTime - 1000);
    assert.strictEqual(slot, 0);
  });

  it('should calculate epoch from slot', () => {
    assert.strictEqual(getEpochForSlot(0), 0);
    assert.strictEqual(getEpochForSlot(431), 0);
    assert.strictEqual(getEpochForSlot(432), 1);
    assert.strictEqual(getEpochForSlot(864), 2);
  });

  it('should get slot index within epoch', () => {
    assert.strictEqual(getSlotIndexInEpoch(0), 0);
    assert.strictEqual(getSlotIndexInEpoch(100), 100);
    assert.strictEqual(getSlotIndexInEpoch(432), 0);
    assert.strictEqual(getSlotIndexInEpoch(500), 68);
  });

  it('should calculate time until next slot', () => {
    const now = genesisTime + 100; // 100ms into slot 0
    const remaining = timeUntilNextSlot(genesisTime, now);
    assert.strictEqual(remaining, 300); // 400 - 100
  });

  it('should get slot timestamp', () => {
    const ts = getSlotTimestamp(genesisTime, 5);
    assert.strictEqual(ts, genesisTime + 5 * SLOT_DURATION_MS);
  });

  it('should select leader deterministically', () => {
    const validators = [
      { id: 'v1', weight: 100 },
      { id: 'v2', weight: 100 },
      { id: 'v3', weight: 100 },
    ];

    const leader1 = selectLeader(100, validators);
    const leader2 = selectLeader(100, validators);
    assert.strictEqual(leader1, leader2); // Same slot = same leader
  });

  it('should weight leader selection', () => {
    const validators = [
      { id: 'heavy', weight: 1000 },
      { id: 'light', weight: 1 },
    ];

    // Run many times, heavy should be selected more often
    let heavyCount = 0;
    for (let slot = 0; slot < 100; slot++) {
      if (selectLeader(slot, validators) === 'heavy') heavyCount++;
    }
    assert.ok(heavyCount > 80); // Heavy should win most
  });

  it('should create epoch schedule', () => {
    const validators = [
      { id: 'v1', weight: 50 },
      { id: 'v2', weight: 50 },
    ];

    const schedule = createEpochSchedule(0, validators);
    assert.strictEqual(schedule.length, SLOTS_PER_EPOCH);
    assert.ok(schedule.every((id) => id === 'v1' || id === 'v2'));
  });

  it('should handle empty validator set', () => {
    assert.strictEqual(selectLeader(0, []), null);
    assert.strictEqual(selectLeader(0, null), null);
  });
});

describe('SlotManager', () => {
  it('should track current slot', () => {
    const manager = new SlotManager({ genesisTime: Date.now() - 1000 });
    const slot = manager.getCurrentSlot();
    assert.ok(slot >= 2); // At least 2 slots (1000/400)
  });

  it('should get leader for slot', () => {
    const manager = new SlotManager({ genesisTime: Date.now() });
    manager.setValidators([
      { id: 'v1', weight: 100 },
      { id: 'v2', weight: 100 },
    ]);

    const leader = manager.getLeader(0);
    assert.ok(leader === 'v1' || leader === 'v2');
  });

  it('should check if validator is leader', () => {
    const manager = new SlotManager({ genesisTime: Date.now() });
    manager.setValidators([{ id: 'only', weight: 100 }]);

    assert.strictEqual(manager.isLeader('only'), true);
    assert.strictEqual(manager.isLeader('other'), false);
  });

  it('should provide slot info', () => {
    const manager = new SlotManager({ genesisTime: Date.now() - 500 });
    manager.setValidators([{ id: 'v1', weight: 100 }]);

    const info = manager.getSlotInfo(0);
    assert.strictEqual(info.slot, 0);
    assert.strictEqual(info.epoch, 0);
    assert.strictEqual(info.indexInEpoch, 0);
    assert.strictEqual(info.isEpochStart, true);
  });
});

describe('Finality Probability', () => {
  it('should calculate high probability for supermajority', () => {
    const result = calculateFinalityProbability({
      approveRatio: 0.65, // 65% approval (just above threshold)
      confirmations: 1, // Low confirmations
      totalValidators: 100,
      votedValidators: 100,
    });

    assert.ok(result.probability > 0.9);
    assert.strictEqual(result.status, FinalityStatus.OPTIMISTIC);
  });

  it('should return PENDING below threshold', () => {
    const result = calculateFinalityProbability({
      approveRatio: 0.5, // Below 61.8%
      confirmations: 5,
      totalValidators: 100,
      votedValidators: 100,
    });

    assert.strictEqual(result.status, FinalityStatus.PENDING);
  });

  it('should reach DETERMINISTIC with high confirmations', () => {
    const result = calculateFinalityProbability({
      approveRatio: 1.0, // Full approval
      confirmations: 32,
      totalValidators: 100,
      votedValidators: 100,
    });

    assert.strictEqual(result.status, FinalityStatus.DETERMINISTIC);
  });

  it('should penalize low participation', () => {
    const full = calculateFinalityProbability({
      approveRatio: 0.7,
      confirmations: 5,
      totalValidators: 100,
      votedValidators: 100,
    });

    const partial = calculateFinalityProbability({
      approveRatio: 0.7,
      confirmations: 5,
      totalValidators: 100,
      votedValidators: 50, // Only 50% voted
    });

    assert.ok(partial.probability < full.probability);
  });

  it('should include lockout slots', () => {
    const result = calculateFinalityProbability({
      approveRatio: 0.7,
      confirmations: 5,
      totalValidators: 100,
      votedValidators: 100,
    });

    assert.ok(result.lockoutSlots > 0);
  });
});

describe('Time to Finality Estimation', () => {
  it('should estimate confirmations needed', () => {
    const result = estimateTimeToFinality({
      currentConfirmations: 5,
      targetProbability: 0.99,
    });

    assert.strictEqual(result.targetConfirmations, 13);
    assert.strictEqual(result.remainingConfirmations, 8);
  });

  it('should estimate milliseconds', () => {
    const result = estimateTimeToFinality({
      currentConfirmations: 0,
      targetProbability: 0.99,
      slotDurationMs: 400,
    });

    assert.strictEqual(result.estimatedMs, 13 * 400);
  });

  it('should return 0 remaining when already final', () => {
    const result = estimateTimeToFinality({
      currentConfirmations: 32,
      targetProbability: 0.99,
    });

    assert.strictEqual(result.remainingConfirmations, 0);
  });
});

describe('Fork Possibility', () => {
  it('should detect fork is possible', () => {
    const result = checkForkPossibility({
      lockedWeight: 30,
      totalWeight: 100,
      currentSlot: 10,
      blockSlot: 5,
      confirmations: 3,
    });

    // Available = 70, need 61.8 for supermajority
    assert.strictEqual(result.forkPossible, true);
    assert.strictEqual(result.availableWeight, 70);
  });

  it('should detect fork is impossible', () => {
    const result = checkForkPossibility({
      lockedWeight: 50,
      totalWeight: 100,
      currentSlot: 100,
      blockSlot: 5,
      confirmations: 20,
    });

    // Available = 50, need 61.8 - not enough
    assert.strictEqual(result.forkPossible, false);
  });
});

describe('FinalityTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new FinalityTracker();
  });

  it('should track block finality', () => {
    tracker.update('block_abc', {
      approveRatio: 0.7,
      confirmations: 5,
      totalValidators: 100,
      votedValidators: 100,
    });

    const status = tracker.get('block_abc');
    assert.ok(status);
    assert.ok(status.probability > 0);
  });

  it('should track finalized blocks', () => {
    tracker.update('block_xyz', {
      approveRatio: 1.0,
      confirmations: 32,
      totalValidators: 100,
      votedValidators: 100,
    });

    assert.strictEqual(tracker.isFinal('block_xyz'), true);
    assert.strictEqual(tracker.isFinal('block_unknown'), false);
  });

  it('should provide statistics', () => {
    tracker.update('b1', {
      approveRatio: 0.5,
      confirmations: 1,
      totalValidators: 100,
      votedValidators: 100,
    });
    tracker.update('b2', {
      approveRatio: 0.7,
      confirmations: 5,
      totalValidators: 100,
      votedValidators: 100,
    });

    const stats = tracker.getStats();
    assert.strictEqual(stats.total, 2);
    assert.ok(stats.avgProbability > 0);
  });
});

describe('Consensus Messages', () => {
  it('should create block proposal', () => {
    const msg = createBlockProposal({
      blockHash: 'hash_123',
      block: { data: 'test' },
      slot: 100,
      proposer: 'pk_abc',
      signature: 'sig_xyz',
    });

    assert.strictEqual(msg.type, ConsensusMessageType.BLOCK_PROPOSAL);
    assert.strictEqual(msg.blockHash, 'hash_123');
    assert.ok(msg.timestamp);
  });

  it('should create vote message', () => {
    const msg = createVoteMessage({
      blockHash: 'hash_123',
      slot: 100,
      decision: 'approve',
      voter: 'pk_voter',
      weight: 50,
      signature: 'sig_vote',
    });

    assert.strictEqual(msg.type, ConsensusMessageType.VOTE);
    assert.strictEqual(msg.decision, 'approve');
  });

  it('should create vote aggregate', () => {
    const msg = createVoteAggregate({
      blockHash: 'hash_123',
      slot: 100,
      approveWeight: 70,
      rejectWeight: 30,
      totalWeight: 100,
      voteCount: 10,
    });

    assert.strictEqual(msg.type, ConsensusMessageType.VOTE_AGGREGATE);
    assert.strictEqual(msg.approveRatio, 0.7);
  });

  it('should create finality notification', () => {
    const msg = createFinalityNotification({
      blockHash: 'hash_123',
      slot: 100,
      height: 50,
      status: FinalityStatus.DETERMINISTIC,
      probability: 0.9999,
      confirmations: 32,
    });

    assert.strictEqual(msg.type, ConsensusMessageType.FINALITY_NOTIFICATION);
    assert.strictEqual(msg.status, FinalityStatus.DETERMINISTIC);
  });

  it('should validate messages', () => {
    const valid = createBlockProposal({
      blockHash: 'hash',
      block: {},
      slot: 0,
      proposer: 'pk',
      signature: 'sig',
    });

    assert.strictEqual(validateMessage(valid).valid, true);

    const invalid = { type: ConsensusMessageType.VOTE };
    const result = validateMessage(invalid);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('should identify consensus messages', () => {
    assert.strictEqual(isConsensusMessage('consensus:vote'), true);
    assert.strictEqual(isConsensusMessage('gossip:message'), false);
    assert.strictEqual(isConsensusMessage(null), false);
  });
});

describe('ConsensusEngine', () => {
  let engine;
  let keypair;

  beforeEach(() => {
    keypair = generateKeypair();
    engine = new ConsensusEngine({
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
      slotDuration: 400,
    });
  });

  afterEach(() => {
    if (engine && engine.state !== 'STOPPED') {
      engine.stop();
    }
  });

  it('should initialize with validator identity', () => {
    assert.strictEqual(engine.publicKey, keypair.publicKey);
    assert.strictEqual(engine.state, 'INITIALIZING');
  });

  it('should register validators', () => {
    engine.registerValidator({ publicKey: 'v1', eScore: 100 });
    engine.registerValidator({ publicKey: 'v2', eScore: 50 });

    const validators = engine.validators;
    assert.strictEqual(validators.size, 2);
  });

  it('should start and stop', () => {
    engine.start();
    assert.strictEqual(engine.state, 'PARTICIPATING');

    engine.stop();
    assert.strictEqual(engine.state, 'STOPPED');
  });

  it('should propose block when started', () => {
    engine.start();
    engine.registerValidator({ publicKey: keypair.publicKey, eScore: 100 });

    const block = { hash: 'test_block', data: 'content' };
    const record = engine.proposeBlock(block);

    assert.ok(record);
    assert.strictEqual(record.hash, 'test_block');
    engine.stop();
  });

  it('should receive and track votes', () => {
    engine.start();

    const block = { hash: 'vote_test', data: 'x' };
    engine.proposeBlock(block);

    const vote = {
      blockHash: 'vote_test',
      decision: 'approve',
      voter: 'other_validator',
      weight: 50,
      slot: 0,
      signature: 'sig',
    };

    engine.receiveVote(vote, 'peer1');

    const record = engine.getBlock('vote_test');
    assert.ok(record.votes.size >= 1);
    engine.stop();
  });

  it('should emit events', (t, done) => {
    engine.start();
    engine.once('block:proposed', (data) => {
      assert.ok(data.blockHash);
      engine.stop();
      done();
    });

    engine.proposeBlock({ hash: 'event_test', data: 'x' });
  });

  it('should track statistics', () => {
    engine.start();
    engine.registerValidator({ publicKey: 'v1', eScore: 100 });
    engine.proposeBlock({ hash: 'stat_test', data: 'x' });

    const stats = engine.getStats();
    assert.ok(stats.blocksProposed > 0 || engine.blocks.size > 0);
    assert.strictEqual(engine.validators.size, 1);
    engine.stop();
  });

  it('should throw when proposing without starting', () => {
    assert.throws(() => {
      engine.proposeBlock({ hash: 'fail', data: 'x' });
    }, /Not participating/);
  });
});

describe('Block Structure Validation', () => {
  let engine;
  let keypair;

  beforeEach(() => {
    keypair = generateKeypair();
    engine = new ConsensusEngine({
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
      slotDuration: 400,
    });
    engine.start();
  });

  afterEach(() => {
    if (engine && engine.state !== 'STOPPED') {
      engine.stop();
    }
  });

  it('should reject block with missing proposer', () => {
    const noProposerBlock = {
      action: 'BLOCK',
      params: { data: 'test' },
      // No proposer!
      created_at: Date.now(),
      slot: 1,
      hash: 'no_proposer_block',
    };

    let invalidEvent = null;
    engine.once('block:invalid', (event) => {
      invalidEvent = event;
    });

    engine.receiveBlock(noProposerBlock, 'malicious_peer');

    assert.ok(invalidEvent, 'block:invalid should be emitted');
    assert.strictEqual(invalidEvent.reason, 'invalid_structure');
    assert.strictEqual(invalidEvent.blockHash, 'no_proposer_block');
  });

  it('should reject block with missing slot', () => {
    const noSlotBlock = {
      action: 'BLOCK',
      params: { data: 'test' },
      proposer: keypair.publicKey,
      created_at: Date.now(),
      // No slot!
      hash: 'no_slot_block',
    };

    let invalidEvent = null;
    engine.once('block:invalid', (event) => {
      invalidEvent = event;
    });

    engine.receiveBlock(noSlotBlock, 'malicious_peer');

    assert.ok(invalidEvent, 'block:invalid should be emitted');
    assert.strictEqual(invalidEvent.reason, 'invalid_structure');
  });

  it('should reject block with invalid slot type', () => {
    const badSlotBlock = {
      action: 'BLOCK',
      params: { data: 'test' },
      proposer: keypair.publicKey,
      created_at: Date.now(),
      slot: 'not_a_number',
      hash: 'bad_slot_block',
    };

    let invalidEvent = null;
    engine.once('block:invalid', (event) => {
      invalidEvent = event;
    });

    engine.receiveBlock(badSlotBlock, 'malicious_peer');

    assert.ok(invalidEvent, 'block:invalid should be emitted');
    assert.strictEqual(invalidEvent.reason, 'invalid_structure');
  });

  it('should accept block with valid structure', () => {
    const validBlock = {
      action: 'BLOCK',
      params: { data: 'valid data' },
      proposer: keypair.publicKey,
      created_at: Date.now(),
      slot: 1,
      hash: 'valid_block',
    };

    let invalidEmitted = false;
    engine.once('block:invalid', () => {
      invalidEmitted = true;
    });

    engine.receiveBlock(validBlock, 'honest_peer');

    assert.strictEqual(invalidEmitted, false);
    assert.ok(engine.blocks.has('valid_block'));
  });

  it('should include fromPeer in block:invalid event', () => {
    const invalidBlock = {
      action: 'BLOCK',
      params: { data: 'test' },
      // No proposer - will fail validation
      created_at: Date.now(),
      slot: 1,
      hash: 'tracking_peer_block',
    };

    let invalidEvent = null;
    engine.once('block:invalid', (event) => {
      invalidEvent = event;
    });

    engine.receiveBlock(invalidBlock, 'suspicious_peer_123');

    assert.ok(invalidEvent, 'block:invalid should be emitted');
    assert.strictEqual(invalidEvent.fromPeer, 'suspicious_peer_123');
  });
});
