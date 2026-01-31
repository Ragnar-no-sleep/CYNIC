/**
 * CYNIC Swarm Consensus Tests
 *
 * Tests for P2.4: Swarm consensus algorithms
 * - Anti-drift mechanisms
 * - Conflict resolution
 * - Emergent decision making
 * - φ-aligned quorum thresholds
 *
 * "Many dogs, one truth" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  SwarmConsensus,
  ConsensusStrategy,
  DriftType,
  ConflictResolution,
  SWARM_CONFIG,
  DogPosition,
  ConflictRecord,
  EmergentPattern,
  createSwarmConsensus,
  getSwarmConsensus,
} from '../src/agents/swarm-consensus.js';

import { DOG_CONFIG } from '../src/agents/orchestrator.js';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// =============================================================================
// Helper: Create mock votes
// =============================================================================

function createMockVote(dog, score = 60, response = 'allow', options = {}) {
  return {
    dog,
    score,
    verdict: score >= 62 ? 'WAG' : (score >= 38 ? 'GROWL' : 'BARK'),
    response,
    weight: options.weight || 1,
    success: options.success !== false,
    dimensions: options.dimensions || {},
    insights: options.insights || [],
    confidence: options.confidence,
  };
}

function createVoteSet(scores, options = {}) {
  const dogs = Object.keys(DOG_CONFIG);
  return dogs.map((dog, i) => createMockVote(
    dog,
    scores[i % scores.length],
    scores[i % scores.length] >= 50 ? 'allow' : 'block',
    options
  ));
}

// =============================================================================
// Configuration Tests
// =============================================================================

describe('SWARM_CONFIG', () => {
  it('should have φ-aligned thresholds', () => {
    assert.ok(SWARM_CONFIG.driftThreshold === PHI_INV_2);
    assert.ok(SWARM_CONFIG.mediationWeight === PHI_INV);
    assert.ok(SWARM_CONFIG.emergenceConfidence === PHI_INV);
  });

  it('should define quorum levels', () => {
    assert.ok(SWARM_CONFIG.quorum.security === 0.9);
    assert.ok(SWARM_CONFIG.quorum.deployment === 0.8);
    assert.ok(SWARM_CONFIG.quorum.standard === PHI_INV);
    assert.ok(SWARM_CONFIG.quorum.exploratory === 0.5);
  });

  it('should define domain experts', () => {
    assert.ok(SWARM_CONFIG.domainExperts.security.length >= 1);
    assert.ok(SWARM_CONFIG.domainExperts.architecture.length >= 1);
    assert.ok(SWARM_CONFIG.domainExperts.deployment.length >= 1);
  });
});

// =============================================================================
// ConsensusStrategy Tests
// =============================================================================

describe('ConsensusStrategy', () => {
  it('should define all strategies', () => {
    assert.strictEqual(ConsensusStrategy.SIMPLE_MAJORITY, 'simple_majority');
    assert.strictEqual(ConsensusStrategy.PHI_SUPERMAJORITY, 'phi_supermajority');
    assert.strictEqual(ConsensusStrategy.UNANIMOUS, 'unanimous');
    assert.strictEqual(ConsensusStrategy.WEIGHTED_MEDIAN, 'weighted_median');
    assert.strictEqual(ConsensusStrategy.EMERGENT, 'emergent');
  });
});

// =============================================================================
// DogPosition Tests
// =============================================================================

describe('DogPosition', () => {
  let position;

  beforeEach(() => {
    position = new DogPosition('GUARDIAN');
  });

  it('should initialize with correct defaults', () => {
    assert.strictEqual(position.dogId, 'GUARDIAN');
    assert.strictEqual(position.voteCount, 0);
    assert.strictEqual(position.accuracy, 0.5);
    assert.deepStrictEqual(position.scoreHistory, []);
  });

  it('should record votes and update history', () => {
    position.recordVote({ score: 70, response: 'allow' });
    position.recordVote({ score: 80, response: 'allow' });
    position.recordVote({ score: 30, response: 'block' });

    assert.strictEqual(position.voteCount, 3);
    assert.deepStrictEqual(position.scoreHistory, [70, 80, 30]);
    assert.deepStrictEqual(position.positionHistory, [0, 0, 1]); // allow=0, block=1
  });

  it('should calculate mean score', () => {
    position.recordVote({ score: 60, response: 'allow' });
    position.recordVote({ score: 80, response: 'allow' });

    assert.strictEqual(position.getMeanScore(), 70);
  });

  it('should calculate score standard deviation', () => {
    position.recordVote({ score: 60, response: 'allow' });
    position.recordVote({ score: 80, response: 'allow' });

    const stdDev = position.getScoreStdDev();
    assert.ok(stdDev > 0);
    assert.ok(Math.abs(stdDev - 10) < 0.001); // sqrt(200/2) = 10
  });

  it('should calculate block tendency', () => {
    position.recordVote({ score: 70, response: 'allow' });
    position.recordVote({ score: 30, response: 'block' });
    position.recordVote({ score: 70, response: 'allow' });
    position.recordVote({ score: 30, response: 'block' });

    assert.strictEqual(position.getBlockTendency(), 0.5);
  });

  it('should update accuracy on feedback', () => {
    const initialAccuracy = position.accuracy;
    position.updateAccuracy(true);
    assert.ok(position.accuracy > initialAccuracy);

    position.updateAccuracy(false);
    assert.ok(position.accuracy < 1.0);
  });
});

// =============================================================================
// ConflictRecord Tests
// =============================================================================

describe('ConflictRecord', () => {
  let conflict;

  beforeEach(() => {
    conflict = new ConflictRecord('GUARDIAN', 'ANALYST');
  });

  it('should initialize correctly', () => {
    assert.strictEqual(conflict.dogA, 'GUARDIAN');
    assert.strictEqual(conflict.dogB, 'ANALYST');
    assert.strictEqual(conflict.conflicts, 0);
    assert.strictEqual(conflict.agreements, 0);
  });

  it('should record conflicts', () => {
    conflict.recordConflict();
    conflict.recordConflict();
    assert.strictEqual(conflict.conflicts, 2);
    assert.ok(conflict.lastConflict !== null);
  });

  it('should record agreements', () => {
    conflict.recordAgreement();
    conflict.recordAgreement();
    assert.strictEqual(conflict.agreements, 2);
  });

  it('should calculate disagreement ratio', () => {
    conflict.recordConflict();
    conflict.recordConflict();
    conflict.recordAgreement();
    conflict.recordAgreement();

    assert.strictEqual(conflict.getDisagreementRatio(), 0.5);
  });
});

// =============================================================================
// EmergentPattern Tests
// =============================================================================

describe('EmergentPattern', () => {
  it('should initialize with signature', () => {
    const signature = [0.5, 0.6, 0.7];
    const pattern = new EmergentPattern({ signature });

    assert.ok(pattern.id.startsWith('epattern_'));
    assert.deepStrictEqual(pattern.signature, signature);
    assert.strictEqual(pattern.frequency, 1);
  });

  it('should record outcomes and update confidence', () => {
    const pattern = new EmergentPattern({ signature: [0.5] });

    pattern.recordOutcome('success', true);
    pattern.recordOutcome('success', true);
    pattern.recordOutcome('failure', false);

    assert.strictEqual(pattern.outcomes.length, 3);
    assert.ok(pattern.confidence > 0);
    assert.ok(pattern.confidence <= PHI_INV);
  });
});

// =============================================================================
// SwarmConsensus Tests
// =============================================================================

describe('SwarmConsensus', () => {
  let swarm;

  beforeEach(() => {
    swarm = createSwarmConsensus();
  });

  describe('constructor', () => {
    it('should initialize with all dog positions', () => {
      const dogs = Object.keys(DOG_CONFIG);
      for (const dog of dogs) {
        assert.ok(swarm.positions.has(dog));
      }
    });

    it('should start with empty conflicts and patterns', () => {
      assert.strictEqual(swarm.conflicts.size, 0);
      assert.strictEqual(swarm.patterns.length, 0);
    });
  });

  describe('calculateConsensus', () => {
    it('should calculate φ-supermajority consensus', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      const result = swarm.calculateConsensus(votes, {});

      assert.ok(!result.blocked);
      assert.ok(result.ratio > 0);
      assert.ok(result.strategy === ConsensusStrategy.PHI_SUPERMAJORITY);
    });

    it('should detect blocking votes', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      // Make Guardian block
      votes.find(v => v.dog === 'GUARDIAN').response = 'block';

      const result = swarm.calculateConsensus(votes, {});

      assert.ok(result.blocked);
      assert.strictEqual(result.blockedBy, 'GUARDIAN');
    });

    it('should use unanimous strategy for high-security contexts', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      const result = swarm.calculateConsensus(votes, {
        domain: 'security',
        severity: 'high',
      });

      assert.strictEqual(result.strategy, ConsensusStrategy.UNANIMOUS);
    });

    it('should use weighted median for exploration', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      const result = swarm.calculateConsensus(votes, {
        exploratory: true,
      });

      assert.strictEqual(result.strategy, ConsensusStrategy.WEIGHTED_MEDIAN);
    });

    it('should record votes in dog positions', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      swarm.calculateConsensus(votes, {});

      const guardianPos = swarm.positions.get('GUARDIAN');
      assert.ok(guardianPos.voteCount > 0);
      assert.ok(guardianPos.scoreHistory.length > 0);
    });
  });

  describe('drift detection', () => {
    it('should detect score drift when dog deviates from historical', () => {
      // Train the dog on consistent scores
      for (let i = 0; i < 15; i++) {
        const votes = [createMockVote('GUARDIAN', 70)];
        swarm.calculateConsensus(votes, {});
      }

      // Now make a big deviation
      const votes = [createMockVote('GUARDIAN', 20)];
      const result = swarm.calculateConsensus(votes, {});

      // Should have drift alerts
      assert.ok(result.driftAlerts.length > 0);
      assert.ok(result.driftAlerts.some(a => a.type === DriftType.SCORE_DRIFT));
    });
  });

  describe('conflict detection', () => {
    it('should detect position conflicts between dogs', () => {
      // Create votes with opposing positions
      const votes = [
        createMockVote('GUARDIAN', 70, 'allow'),
        createMockVote('ANALYST', 30, 'block'),
      ];

      // Need multiple rounds to trigger conflict
      for (let i = 0; i < 4; i++) {
        swarm.calculateConsensus(votes, {});
      }

      const result = swarm.calculateConsensus(votes, {});
      assert.ok(result.conflicts > 0 || swarm.stats.conflictsDetected > 0);
    });
  });

  describe('conflict resolution', () => {
    it('should use blocking priority for security domains', () => {
      const swarmInstance = createSwarmConsensus();
      const strategy = swarmInstance._selectResolutionStrategy({ domain: 'security' });
      assert.strictEqual(strategy, ConflictResolution.BLOCKING_PRIORITY);
    });

    it('should use domain expert for architecture', () => {
      const swarmInstance = createSwarmConsensus();
      const strategy = swarmInstance._selectResolutionStrategy({ domain: 'architecture' });
      assert.strictEqual(strategy, ConflictResolution.DOMAIN_EXPERT);
    });
  });

  describe('emergent patterns', () => {
    it('should discover patterns from consistent voting', () => {
      // Create consistent voting pattern
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);

      // Need multiple rounds for pattern detection
      for (let i = 0; i < 10; i++) {
        swarm.calculateConsensus(votes, {});
      }

      assert.ok(swarm.patterns.length > 0);
    });
  });

  describe('feedback recording', () => {
    it('should record feedback and update dog accuracy', () => {
      const votes = [createMockVote('GUARDIAN', 70, 'allow')];
      swarm.calculateConsensus(votes, {});

      const initialAccuracy = swarm.positions.get('GUARDIAN').accuracy;
      swarm.recordFeedback('test-decision', true, { votes });

      // Accuracy should increase for correct vote
      assert.ok(swarm.positions.get('GUARDIAN').accuracy >= initialAccuracy);
    });
  });

  describe('state persistence', () => {
    it('should export state', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      swarm.calculateConsensus(votes, {});

      const state = swarm.exportState();

      assert.ok(state.positions.length > 0);
      assert.ok(state.stats);
      assert.ok('totalDecisions' in state.stats);
    });

    it('should import state', () => {
      const state = {
        positions: [
          { dogId: 'GUARDIAN', scoreHistory: [70, 80], positionHistory: [0, 0], accuracy: 0.8, voteCount: 2 },
        ],
        patterns: [],
        stats: { totalDecisions: 5 },
      };

      const newSwarm = createSwarmConsensus();
      newSwarm.importState(state);

      const guardianPos = newSwarm.positions.get('GUARDIAN');
      assert.deepStrictEqual(guardianPos.scoreHistory, [70, 80]);
      assert.strictEqual(guardianPos.accuracy, 0.8);
    });
  });

  describe('statistics', () => {
    it('should track decision statistics', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      swarm.calculateConsensus(votes, {});
      swarm.calculateConsensus(votes, {});

      const stats = swarm.getStats();
      assert.strictEqual(stats.totalDecisions, 2);
      assert.ok(stats.positions.length > 0);
    });

    it('should track strategy usage', () => {
      const votes = createVoteSet([70, 75, 65, 80, 60, 70, 75, 65, 70, 60, 75]);
      swarm.calculateConsensus(votes, {});

      const stats = swarm.getStats();
      assert.ok(Object.keys(stats.strategyUsage).length > 0);
    });
  });
});

// =============================================================================
// Factory Functions Tests
// =============================================================================

describe('Factory functions', () => {
  it('createSwarmConsensus should create new instance', () => {
    const swarm1 = createSwarmConsensus();
    const swarm2 = createSwarmConsensus();

    assert.ok(swarm1 instanceof SwarmConsensus);
    assert.ok(swarm2 instanceof SwarmConsensus);
    assert.notStrictEqual(swarm1, swarm2);
  });

  it('getSwarmConsensus should return singleton', () => {
    const swarm1 = getSwarmConsensus();
    const swarm2 = getSwarmConsensus();

    assert.strictEqual(swarm1, swarm2);
  });
});

// =============================================================================
// Integration with DogOrchestrator Tests
// =============================================================================

describe('SwarmConsensus + DogOrchestrator Integration', async () => {
  // Import DogOrchestrator for integration testing
  const { DogOrchestrator, DogMode } = await import('../src/agents/orchestrator.js');

  it('should create orchestrator with swarm consensus', () => {
    const orchestrator = new DogOrchestrator({
      mode: DogMode.PARALLEL,
      useSwarmConsensus: true,
    });

    assert.ok(orchestrator.swarmConsensus instanceof SwarmConsensus);
  });

  it('should allow disabling swarm consensus', () => {
    const orchestrator = new DogOrchestrator({
      mode: DogMode.PARALLEL,
      useSwarmConsensus: false,
    });

    assert.strictEqual(orchestrator.swarmConsensus, undefined);
  });

  it('should include swarm stats in orchestrator stats', () => {
    const orchestrator = new DogOrchestrator({
      useSwarmConsensus: true,
    });

    const stats = orchestrator.getStats();
    assert.ok(stats.swarmStats !== null);
    assert.ok('totalDecisions' in stats.swarmStats);
  });

  it('should export and import swarm state', () => {
    const orchestrator = new DogOrchestrator({
      useSwarmConsensus: true,
    });

    const state = orchestrator.exportSwarmState();
    assert.ok(state !== null);
    assert.ok(state.positions);

    // Create new orchestrator and import
    const orchestrator2 = new DogOrchestrator({
      useSwarmConsensus: true,
    });
    orchestrator2.importSwarmState(state);
    assert.ok(orchestrator2.swarmConsensus !== null);
  });
});
