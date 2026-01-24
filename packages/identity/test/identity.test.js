/**
 * @cynic/identity Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  // Key management
  KeyManager,
  createKeyManager,
  generateKeypair,
  deriveNodeId,

  // E-Score (3D legacy)
  EScoreCalculator,
  createEScoreCalculator,
  calculateEScore,
  normalizeBurns,
  normalizeUptime,
  normalizeQuality,
  ESCORE_WEIGHTS,
  ESCORE_THRESHOLDS,

  // E-Score 7D
  EScore7DCalculator,
  createEScore7DCalculator,
  calculateEScore7D,
  getTrustLevel,
  escoreToDbFormat,
  normalizeHold,
  normalizeBuild,
  normalizeJudge,
  normalizeBurn,
  normalizeStake,
  normalizeShare,
  normalizeTrust,
  ESCORE_7D_DIMENSIONS,
  ESCORE_7D_THRESHOLDS,
  TRUST_LEVELS,
  ESCORE_7D_TOTAL_WEIGHT,

  // Node identity
  NodeIdentity,
  createNodeIdentity,
  IdentityStatus,

  // Reputation
  ReputationGraph,
  createReputationGraph,
  TrustLevel,
} from '../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// KEY MANAGER TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('KeyManager', () => {
  test('generateKeypair creates valid keypair', () => {
    const keypair = generateKeypair();

    assert.ok(keypair.publicKey, 'should have publicKey');
    assert.ok(keypair.privateKey, 'should have privateKey');
    assert.ok(keypair.publicKey.length > 0, 'publicKey should not be empty');
    assert.ok(keypair.privateKey.length > 0, 'privateKey should not be empty');
  });

  test('deriveNodeId creates consistent IDs', () => {
    const keypair = generateKeypair();
    const id1 = deriveNodeId(keypair.publicKey);
    const id2 = deriveNodeId(keypair.publicKey);

    assert.strictEqual(id1, id2, 'should be consistent');
    assert.strictEqual(id1.length, 32, 'should be 32 hex chars');
  });

  test('KeyManager can generate and sign', async () => {
    const km = createKeyManager();
    await km.generate(false); // Don't save

    assert.ok(km.hasKeys, 'should have keys');
    assert.ok(km.nodeId, 'should have nodeId');
    assert.ok(km.publicKey, 'should have publicKey');

    const signature = km.sign('hello world');
    assert.ok(signature, 'should create signature');

    const valid = km.verify('hello world', signature);
    assert.strictEqual(valid, true, 'signature should be valid');

    const invalid = km.verify('hello world!', signature);
    assert.strictEqual(invalid, false, 'modified data should fail');
  });

  test('KeyManager can save and load', async () => {
    const tmpDir = os.tmpdir();
    const keyfile = path.join(tmpDir, `cynic-test-${Date.now()}.json`);

    try {
      // Generate and save
      const km1 = createKeyManager({ keyfile });
      await km1.generate(true);
      const nodeId1 = km1.nodeId;

      // Load
      const km2 = createKeyManager({ keyfile });
      const loaded = await km2.load();

      assert.strictEqual(loaded, true, 'should load successfully');
      assert.strictEqual(km2.nodeId, nodeId1, 'should have same nodeId');
    } finally {
      // Cleanup
      if (fs.existsSync(keyfile)) {
        fs.unlinkSync(keyfile);
      }
    }
  });

  test('KeyManager signObject and verifyObject', async () => {
    const km = createKeyManager();
    await km.generate(false);

    const obj = { foo: 'bar', num: 42 };
    const sig = km.signObject(obj);

    assert.ok(km.verifyObject(obj, sig), 'should verify same object');
    assert.ok(!km.verifyObject({ foo: 'baz', num: 42 }, sig), 'should fail on modified object');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E-SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('E-Score', () => {
  test('ESCORE_WEIGHTS are φ-aligned', () => {
    assert.ok(Math.abs(ESCORE_WEIGHTS.BURNS - 0.618) < 0.001, 'BURNS should be ~0.618');
    assert.ok(Math.abs(ESCORE_WEIGHTS.UPTIME - 0.382) < 0.001, 'UPTIME should be ~0.382');
    assert.ok(Math.abs(ESCORE_WEIGHTS.QUALITY - 0.236) < 0.001, 'QUALITY should be ~0.236');
  });

  test('ESCORE_THRESHOLDS are φ-aligned', () => {
    assert.ok(Math.abs(ESCORE_THRESHOLDS.TRUSTED - 61.8) < 0.1, 'TRUSTED should be ~61.8');
    assert.ok(Math.abs(ESCORE_THRESHOLDS.VERIFIED - 38.2) < 0.1, 'VERIFIED should be ~38.2');
    assert.ok(Math.abs(ESCORE_THRESHOLDS.NEWCOMER - 23.6) < 0.1, 'NEWCOMER should be ~23.6');
  });

  test('normalizeBurns returns [0, 1]', () => {
    assert.strictEqual(normalizeBurns(0), 0, 'zero burns should be 0');
    assert.ok(normalizeBurns(1e6) > 0, 'some burns should be > 0');
    assert.ok(normalizeBurns(1e6) < 1, 'moderate burns should be < 1');
    assert.ok(normalizeBurns(1e12) <= 1, 'huge burns should be <= 1');
  });

  test('normalizeUptime returns [0, 1]', () => {
    assert.strictEqual(normalizeUptime(0, 100), 0, 'zero uptime should be 0');
    assert.strictEqual(normalizeUptime(100, 100), 1, 'full uptime should be 1');
    assert.strictEqual(normalizeUptime(50, 100), 0.5, '50% uptime should be 0.5');
    assert.strictEqual(normalizeUptime(200, 100), 1, 'over 100% should cap at 1');
  });

  test('normalizeQuality handles minimum judgments', () => {
    assert.ok(normalizeQuality(0, 0) < 0.5, 'no judgments should be < 0.5');
    assert.ok(normalizeQuality(5, 5, 10) < 0.5, 'below min should be reduced');
    assert.strictEqual(normalizeQuality(10, 10, 10), 1, 'perfect at min should be 1');
    assert.strictEqual(normalizeQuality(8, 10, 10), 0.8, '80% should be 0.8');
  });

  test('calculateEScore returns valid result', () => {
    const result = calculateEScore({
      burns: 1e6,
      uptimeSeconds: 3600,
      expectedUptimeSeconds: 3600,
      agreementCount: 8,
      totalJudgments: 10,
    });

    assert.ok(result.score >= 0, 'score should be >= 0');
    assert.ok(result.score <= 100, 'score should be <= 100');
    assert.ok(result.status, 'should have status');
    assert.ok(result.components, 'should have components');
    assert.ok(result.components.burns, 'should have burns component');
    assert.ok(result.components.uptime, 'should have uptime component');
    assert.ok(result.components.quality, 'should have quality component');
  });

  test('EScoreCalculator tracks state', () => {
    const calc = createEScoreCalculator();

    // Initial score (low due to no burns, no data)
    const initial = calc.calculate();
    assert.ok(initial.score < 20, 'initial score should be low');

    // Record activity
    calc.recordBurn(1e6);
    calc.heartbeat();
    calc.recordJudgment('j1', true);
    calc.recordJudgment('j2', true);
    calc.recordJudgment('j3', false);

    const updated = calc.calculate(true); // skip cache
    assert.ok(updated.score > initial.score, 'score should increase with activity');

    // Stats
    const stats = calc.getStats();
    assert.strictEqual(stats.burns.total, 1e6, 'should track burns');
    assert.strictEqual(stats.judgments.total, 3, 'should track judgments');
    assert.strictEqual(stats.judgments.agreements, 2, 'should track agreements');
  });

  test('EScoreCalculator export/import', () => {
    const calc1 = createEScoreCalculator();
    calc1.recordBurn(5e6);
    calc1.recordJudgment('j1', true);

    const exported = calc1.export();
    assert.ok(exported.totalBurns, 'should export burns');

    const calc2 = createEScoreCalculator();
    calc2.import(exported);

    assert.strictEqual(calc2.totalBurns, 5e6, 'should import burns');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NODE IDENTITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('NodeIdentity', () => {
  test('NodeIdentity initializes correctly', async () => {
    const identity = createNodeIdentity();
    await identity.initialize();

    assert.ok(identity.isInitialized, 'should be initialized');
    assert.ok(identity.nodeId, 'should have nodeId');
    assert.ok(identity.publicKey, 'should have publicKey');
    assert.strictEqual(identity.status, IdentityStatus.EPHEMERAL, 'should be ephemeral');
  });

  test('NodeIdentity can sign and verify', async () => {
    const identity = createNodeIdentity();
    await identity.initialize();

    const sig = identity.sign('test data');
    assert.ok(sig, 'should create signature');

    const valid = identity.verify('test data', sig);
    assert.strictEqual(valid, true, 'should verify');
  });

  test('NodeIdentity tracks E-Score', async () => {
    const identity = createNodeIdentity();
    await identity.initialize();

    const initial = identity.eScore;

    identity.heartbeat();
    identity.recordJudgment('j1', true);
    await identity.recordBurn(1e6);

    // E-Score should update
    const details = identity.getEScoreDetails();
    assert.ok(details.score >= 0, 'should have valid score');
    assert.ok(details.components.burns.raw === 1e6, 'should track burns');
  });

  test('NodeIdentity creates attestations', async () => {
    const identity = createNodeIdentity();
    await identity.initialize();

    const attestation = identity.createAttestation(60000);

    assert.ok(attestation.signature, 'should have signature');
    assert.strictEqual(attestation.nodeId, identity.nodeId, 'should have nodeId');

    // Verify attestation
    const valid = NodeIdentity.verifyAttestation(attestation);
    assert.strictEqual(valid, true, 'attestation should be valid');

    // Tampered attestation should fail
    const tampered = { ...attestation, eScore: 999 };
    const invalidTampered = NodeIdentity.verifyAttestation(tampered);
    assert.strictEqual(invalidTampered, false, 'tampered should be invalid');
  });

  test('NodeIdentity exportPublic is safe', async () => {
    const identity = createNodeIdentity();
    await identity.initialize();

    const pub = identity.exportPublic();

    assert.ok(pub.nodeId, 'should have nodeId');
    assert.ok(pub.publicKey, 'should have publicKey');
    assert.ok(!pub.privateKey, 'should NOT have privateKey');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REPUTATION GRAPH TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('ReputationGraph', () => {
  test('TrustLevel values are correct', () => {
    assert.strictEqual(TrustLevel.DISTRUST, -1);
    assert.strictEqual(TrustLevel.UNKNOWN, 0);
    assert.ok(TrustLevel.WEAK > 0 && TrustLevel.WEAK < 1);
    assert.ok(TrustLevel.MODERATE > TrustLevel.WEAK);
    assert.strictEqual(TrustLevel.STRONG, 1);
  });

  test('ReputationGraph sets and gets direct trust', () => {
    const graph = createReputationGraph();

    graph.setTrust('node_a', 'node_b', TrustLevel.STRONG);

    const trust = graph.getDirectTrust('node_a', 'node_b');
    assert.ok(trust > 0.9, 'direct trust should be ~1.0');

    const noTrust = graph.getDirectTrust('node_b', 'node_a');
    assert.strictEqual(noTrust, TrustLevel.UNKNOWN, 'reverse should be unknown');
  });

  test('ReputationGraph calculates transitive trust', () => {
    const graph = createReputationGraph();

    // A trusts B, B trusts C
    graph.setTrust('A', 'B', TrustLevel.STRONG);
    graph.setTrust('B', 'C', TrustLevel.STRONG);

    // A should have transitive trust in C (decayed by φ⁻¹)
    const trust = graph.getTrust('A', 'C');
    assert.ok(trust > 0, 'transitive trust should exist');
    assert.ok(trust < 1, 'transitive trust should be decayed');
  });

  test('ReputationGraph finds trust paths', () => {
    const graph = createReputationGraph();

    graph.setTrust('A', 'B', TrustLevel.STRONG);
    graph.setTrust('B', 'C', TrustLevel.MODERATE);
    graph.setTrust('C', 'D', TrustLevel.WEAK);

    const path = graph.findTrustPath('A', 'D');
    assert.deepStrictEqual(path, ['A', 'B', 'C', 'D'], 'should find path');

    const noPath = graph.findTrustPath('D', 'A');
    assert.strictEqual(noPath, null, 'reverse path should not exist');
  });

  test('ReputationGraph respects distrust', () => {
    const graph = createReputationGraph();

    graph.setTrust('A', 'B', TrustLevel.DISTRUST);
    graph.setTrust('B', 'C', TrustLevel.STRONG);

    // Distrust should block propagation
    const trust = graph.getTrust('A', 'C');
    assert.strictEqual(trust, TrustLevel.UNKNOWN, 'distrust should block propagation');
  });

  test('ReputationGraph getTrustedBy and getTrusters', () => {
    const graph = createReputationGraph();

    graph.setTrust('A', 'B', TrustLevel.STRONG);
    graph.setTrust('A', 'C', TrustLevel.MODERATE);
    graph.setTrust('D', 'B', TrustLevel.WEAK);

    const trustedByA = graph.getTrustedBy('A');
    assert.strictEqual(trustedByA.length, 2, 'A trusts 2 nodes');

    const trustersOfB = graph.getTrusters('B');
    assert.strictEqual(trustersOfB.length, 2, 'B is trusted by 2 nodes');
  });

  test('ReputationGraph export/import', () => {
    const graph1 = createReputationGraph();
    graph1.setTrust('A', 'B', TrustLevel.STRONG, 'test reason');

    const exported = graph1.export();
    assert.ok(exported.relations.length > 0, 'should export relations');

    const graph2 = createReputationGraph();
    graph2.import(exported);

    const trust = graph2.getDirectTrust('A', 'B');
    assert.ok(trust > 0.9, 'should import trust');
  });

  test('ReputationGraph stats', () => {
    const graph = createReputationGraph();

    graph.setTrust('A', 'B', TrustLevel.STRONG);
    graph.setTrust('A', 'C', TrustLevel.DISTRUST);

    const stats = graph.getStats();
    assert.strictEqual(stats.totalRelations, 2);
    assert.strictEqual(stats.trustRelations, 1);
    assert.strictEqual(stats.distrustRelations, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Integration', () => {
  test('NodeIdentity + ReputationGraph', async () => {
    // Create two identities
    const identity1 = createNodeIdentity();
    const identity2 = createNodeIdentity();
    await identity1.initialize();
    await identity2.initialize();

    // Create reputation graph
    const graph = createReputationGraph({
      getEScore: (nodeId) => {
        if (nodeId === identity1.nodeId) return identity1.eScore;
        if (nodeId === identity2.nodeId) return identity2.eScore;
        return 50;
      },
    });

    // Node 1 trusts Node 2
    graph.setTrust(identity1.nodeId, identity2.nodeId, TrustLevel.STRONG);

    // Get reputation
    const rep = graph.getReputation(identity2.nodeId, identity1.nodeId);
    assert.ok(rep.trust > 0, 'should have trust');
    assert.ok(rep.score >= 0, 'should have score');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// E-SCORE 7D TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('E-Score 7D Constants', () => {
  test('has 7 dimensions', () => {
    const dims = Object.keys(ESCORE_7D_DIMENSIONS);
    assert.strictEqual(dims.length, 7);
    assert.ok(dims.includes('HOLD'));
    assert.ok(dims.includes('BUILD'));
    assert.ok(dims.includes('JUDGE'));
    assert.ok(dims.includes('BURN'));
    assert.ok(dims.includes('STAKE'));
    assert.ok(dims.includes('SHARE'));
    assert.ok(dims.includes('TRUST'));
  });

  test('weights are φ-aligned', () => {
    const PHI = 1.618033988749895;
    const holdWeight = ESCORE_7D_DIMENSIONS.HOLD.weight;
    const trustWeight = ESCORE_7D_DIMENSIONS.TRUST.weight;

    // HOLD = φ⁶, TRUST = φ⁰ = 1
    assert.ok(Math.abs(holdWeight - Math.pow(PHI, 6)) < 0.001);
    assert.strictEqual(trustWeight, 1);
  });

  test('total weight is sum of φ powers', () => {
    // φ⁶ + φ⁵ + φ⁴ + φ³ + φ² + φ¹ + φ⁰ ≈ 45.36
    assert.ok(ESCORE_7D_TOTAL_WEIGHT > 45 && ESCORE_7D_TOTAL_WEIGHT < 46);
  });

  test('thresholds are φ-aligned', () => {
    const PHI_INV = 0.618033988749895;
    assert.ok(Math.abs(ESCORE_7D_THRESHOLDS.GUARDIAN - PHI_INV * 100) < 0.1);
    assert.ok(Math.abs(ESCORE_7D_THRESHOLDS.STEWARD - PHI_INV * PHI_INV * 100) < 0.1);
  });
});

describe('E-Score 7D Normalization', () => {
  test('normalizeHold returns 0 for no holdings', () => {
    const score = normalizeHold({ holdings: 0 });
    assert.strictEqual(score, 0);
  });

  test('normalizeHold scales with holdings', () => {
    const low = normalizeHold({ holdings: 1000 });
    const high = normalizeHold({ holdings: 1000000 });
    assert.ok(high > low);
    assert.ok(low >= 0 && low <= 1);
    assert.ok(high >= 0 && high <= 1);
  });

  test('normalizeBuild counts contributions', () => {
    const none = normalizeBuild({});
    const some = normalizeBuild({ commits: 10, prs: 5, issues: 3 });
    assert.strictEqual(none, 0);
    assert.ok(some > 0 && some <= 1);
  });

  test('normalizeJudge returns accuracy', () => {
    const perfect = normalizeJudge({ agreementCount: 10, totalJudgments: 10 });
    const half = normalizeJudge({ agreementCount: 5, totalJudgments: 10 });
    assert.ok(perfect > half);
    assert.ok(Math.abs(half - 0.5) < 0.01);
  });

  test('normalizeBurn scales logarithmically', () => {
    const low = normalizeBurn({ totalBurned: 1e6 });
    const high = normalizeBurn({ totalBurned: 1e9 });
    assert.ok(high > low);
    assert.ok(low >= 0 && low <= 1);
  });

  test('normalizeStake returns uptime ratio', () => {
    const full = normalizeStake({ uptimeSeconds: 3600, expectedUptimeSeconds: 3600 });
    const half = normalizeStake({ uptimeSeconds: 1800, expectedUptimeSeconds: 3600 });
    assert.ok(full > half);
    assert.ok(Math.abs(full - 0.7) < 0.01); // 70% weight on uptime
  });

  test('normalizeShare counts knowledge sharing', () => {
    const none = normalizeShare({});
    const some = normalizeShare({ docsWritten: 5, tutorialsCreated: 2, referrals: 10 });
    assert.strictEqual(none, 0);
    assert.ok(some > 0 && some <= 1);
  });

  test('normalizeTrust combines factors', () => {
    const none = normalizeTrust({});
    const some = normalizeTrust({ vouches: 5, daysInEcosystem: 365, reputationScore: 0.8 });
    assert.ok(some > none);
    assert.ok(some >= 0 && some <= 1);
  });
});

describe('E-Score 7D Calculation', () => {
  test('calculateEScore7D returns valid structure', () => {
    const result = calculateEScore7D({});

    assert.ok(typeof result.score === 'number');
    assert.ok(typeof result.trustLevel === 'string');
    assert.ok(typeof result.trustLevelValue === 'number');
    assert.ok(result.dimensions);
    assert.ok(result.breakdown);
    assert.ok(result.timestamp);
  });

  test('score is between 0 and 100', () => {
    const empty = calculateEScore7D({});
    const full = calculateEScore7D({
      hold: { holdings: 1e9 },
      build: { commits: 1000, prs: 100 },
      judge: { agreementCount: 100, totalJudgments: 100 },
      burn: { totalBurned: 1e9 },
      stake: { uptimeSeconds: 86400, expectedUptimeSeconds: 86400 },
      share: { docsWritten: 100, tutorialsCreated: 50 },
      trust: { vouches: 100, daysInEcosystem: 730, reputationScore: 1 },
    });

    assert.ok(empty.score >= 0 && empty.score <= 100);
    assert.ok(full.score >= 0 && full.score <= 100);
    assert.ok(full.score > empty.score);
  });

  test('getTrustLevel returns correct levels', () => {
    assert.strictEqual(getTrustLevel(70), 'GUARDIAN');
    assert.strictEqual(getTrustLevel(50), 'STEWARD');
    assert.strictEqual(getTrustLevel(30), 'BUILDER');
    assert.strictEqual(getTrustLevel(20), 'CONTRIBUTOR');
    assert.strictEqual(getTrustLevel(5), 'OBSERVER');
  });

  test('toDbFormat maps dimensions correctly', () => {
    const breakdown = { hold: 80, build: 70, judge: 60, burn: 50, stake: 40, share: 30, trust: 20 };
    const db = escoreToDbFormat(breakdown);

    assert.strictEqual(db.hold, 80);
    assert.strictEqual(db.build, 70);
    assert.strictEqual(db.use, 60);   // JUDGE → use
    assert.strictEqual(db.burn, 50);
    assert.strictEqual(db.run, 40);   // STAKE → run
    assert.strictEqual(db.refer, 30); // SHARE → refer
    assert.strictEqual(db.time, 20);  // TRUST → time
  });
});

describe('EScore7DCalculator', () => {
  test('creates calculator', () => {
    const calc = createEScore7DCalculator();
    assert.ok(calc instanceof EScore7DCalculator);
  });

  test('records and calculates', () => {
    const calc = new EScore7DCalculator();

    calc.recordHoldings(1e9, 1e12); // 0.1% of supply
    calc.recordCommit();
    calc.recordCommit();
    calc.recordPR();
    calc.recordJudgment(true);
    calc.recordJudgment(true);
    calc.recordJudgment(false);
    calc.recordBurn(1e8); // Significant burn
    calc.heartbeat();
    calc.recordDoc();
    calc.recordVouch();

    const result = calc.calculate();

    assert.ok(result.score > 0, 'should have positive score');
    assert.ok(result.breakdown.hold > 0, 'should have hold score');
    assert.ok(result.breakdown.build > 0, 'should have build score');
    assert.ok(result.breakdown.burn > 0, 'should have burn score');
  });

  test('export and import state', () => {
    const calc1 = new EScore7DCalculator();
    calc1.recordBurn(1e9);
    calc1.recordJudgment(true);

    const state = calc1.export();
    const calc2 = new EScore7DCalculator();
    calc2.import(state);

    assert.strictEqual(calc2.totalBurned, 1e9);
    assert.strictEqual(calc2.agreementCount, 1);
  });

  test('getStats returns full info', () => {
    const calc = new EScore7DCalculator();
    calc.recordBurn(1e6);

    const stats = calc.getStats();
    assert.ok(stats.score);
    assert.ok(stats.state);
    assert.strictEqual(stats.state.totalBurned, 1e6);
  });
});
