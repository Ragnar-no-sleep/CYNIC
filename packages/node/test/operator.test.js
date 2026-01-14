/**
 * Operator Tests
 *
 * Tests for identity, E-Score, and Operator class
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  createIdentity,
  importIdentity,
  exportIdentity,
  getPublicIdentity,
  EScoreDimensions,
  createEScoreState,
  calculateCompositeEScore,
  updateEScoreState,
  getEScoreBreakdown,
  Operator,
} from '../src/index.js';

import { PHI, PHI_INV, PHI_INV_2 } from '@cynic/core';

describe('Identity Management', () => {
  it('should create new identity', () => {
    const identity = createIdentity();

    assert.ok(identity.id);
    assert.ok(identity.publicKey);
    assert.ok(identity.privateKey);
    assert.ok(identity.publicKeyFormatted.startsWith('ed25519:'));
    assert.ok(identity.name.startsWith('node_'));
    assert.ok(identity.createdAt);
  });

  it('should create identity with custom name', () => {
    const identity = createIdentity({ name: 'MyNode' });
    assert.strictEqual(identity.name, 'MyNode');
  });

  it('should import identity from existing keypair', () => {
    const original = createIdentity();
    const imported = importIdentity({
      publicKey: original.publicKey,
      privateKey: original.privateKey,
      name: 'ImportedNode',
    });

    assert.strictEqual(imported.id, original.id);
    assert.strictEqual(imported.publicKey, original.publicKey);
    assert.strictEqual(imported.privateKey, original.privateKey);
    assert.strictEqual(imported.name, 'ImportedNode');
  });

  it('should export identity without private key', () => {
    const identity = createIdentity();
    const exported = exportIdentity(identity);

    assert.ok(exported.id);
    assert.ok(exported.publicKey);
    assert.strictEqual(exported.privateKey, undefined);
    assert.ok(exported.name);
  });

  it('should export identity with private key', () => {
    const identity = createIdentity();
    const exported = exportIdentity(identity, true);

    assert.ok(exported.id);
    assert.ok(exported.publicKey);
    assert.ok(exported.privateKey);
  });

  it('should get public identity', () => {
    const identity = createIdentity();
    const pub = getPublicIdentity(identity);

    assert.ok(pub.id);
    assert.ok(pub.publicKey.startsWith('ed25519:'));
    assert.ok(pub.name);
    assert.strictEqual(pub.privateKey, undefined);
  });
});

describe('E-Score Dimensions', () => {
  it('should have all 7 dimensions', () => {
    const dims = Object.keys(EScoreDimensions);
    assert.strictEqual(dims.length, 7);
    assert.ok(dims.includes('HOLD'));
    assert.ok(dims.includes('BURN'));
    assert.ok(dims.includes('USE'));
    assert.ok(dims.includes('BUILD'));
    assert.ok(dims.includes('RUN'));
    assert.ok(dims.includes('REFER'));
    assert.ok(dims.includes('TIME'));
  });

  it('should have φ-derived weights', () => {
    // BURN and BUILD weighted highest (φ)
    assert.strictEqual(EScoreDimensions.BURN.weight, PHI);
    assert.strictEqual(EScoreDimensions.BUILD.weight, PHI);

    // HOLD and RUN at φ⁻¹
    assert.strictEqual(EScoreDimensions.HOLD.weight, PHI_INV);
    assert.strictEqual(EScoreDimensions.RUN.weight, PHI_INV);

    // REFER and TIME at φ⁻²
    assert.strictEqual(EScoreDimensions.REFER.weight, PHI_INV_2);
    assert.strictEqual(EScoreDimensions.TIME.weight, PHI_INV_2);

    // USE at neutral
    assert.strictEqual(EScoreDimensions.USE.weight, 1.0);
  });
});

describe('E-Score Calculation', () => {
  it('should create empty E-Score state', () => {
    const state = createEScoreState();

    assert.deepStrictEqual(state.scores, {
      HOLD: 0,
      BURN: 0,
      USE: 0,
      BUILD: 0,
      RUN: 0,
      REFER: 0,
      TIME: 0,
    });
    assert.strictEqual(state.composite, 0);
    assert.ok(state.lastUpdated);
  });

  it('should calculate composite E-Score', () => {
    const scores = {
      HOLD: 50,
      BURN: 80,
      USE: 60,
      BUILD: 70,
      RUN: 50,
      REFER: 40,
      TIME: 30,
    };

    const composite = calculateCompositeEScore(scores);
    assert.ok(composite > 0);
    assert.ok(composite <= 100);
  });

  it('should weight BURN higher than REFER', () => {
    // Same scores but different dimensions
    const burnHeavy = { BURN: 100, REFER: 0, HOLD: 0, USE: 0, BUILD: 0, RUN: 0, TIME: 0 };
    const referHeavy = { BURN: 0, REFER: 100, HOLD: 0, USE: 0, BUILD: 0, RUN: 0, TIME: 0 };

    const burnScore = calculateCompositeEScore(burnHeavy);
    const referScore = calculateCompositeEScore(referHeavy);

    // BURN has weight φ, REFER has weight φ⁻²
    assert.ok(burnScore > referScore);
  });

  it('should update E-Score state', async () => {
    const state = createEScoreState();
    // Wait 1ms to ensure timestamps differ
    await new Promise(resolve => setTimeout(resolve, 1));
    const updated = updateEScoreState(state, {
      burnedTotal: 1000,
      contributions: 10,
      usageCount: 100,
    });

    assert.ok(updated.scores.BURN > 0);
    assert.ok(updated.scores.BUILD > 0);
    assert.ok(updated.scores.USE > 0);
    assert.ok(updated.composite > 0);
    assert.ok(updated.lastUpdated >= state.lastUpdated);
  });

  it('should get E-Score breakdown', () => {
    const state = createEScoreState();
    const updated = updateEScoreState(state, { burnedTotal: 500 });
    const breakdown = getEScoreBreakdown(updated);

    assert.ok(Array.isArray(breakdown.dimensions));
    assert.strictEqual(breakdown.dimensions.length, 7);
    assert.ok(breakdown.totalWeight > 0);
    assert.strictEqual(breakdown.composite, updated.composite);

    // Check dimension structure
    const burnDim = breakdown.dimensions.find((d) => d.dimension === 'BURN');
    assert.ok(burnDim);
    assert.ok(burnDim.score >= 0);
    assert.strictEqual(burnDim.weight, PHI);
    assert.ok(burnDim.weightedScore >= 0);
    assert.ok(burnDim.description);
  });
});

describe('Operator Class', () => {
  let operator;

  beforeEach(() => {
    operator = new Operator({ name: 'TestOperator' });
  });

  it('should create operator with identity', () => {
    assert.ok(operator.id);
    assert.ok(operator.publicKey);
    assert.ok(operator.privateKey);
    assert.ok(operator.publicKeyFormatted.startsWith('ed25519:'));
  });

  it('should have initial E-Score of 0', () => {
    assert.strictEqual(operator.getEScore(), 0);
  });

  it('should record burn', () => {
    const record = operator.recordBurn(100, 'test');

    assert.strictEqual(record.amount, 100);
    assert.strictEqual(record.reason, 'test');
    assert.ok(record.timestamp);
    assert.strictEqual(operator.burn.totalBurned, 100);
    assert.strictEqual(operator.burn.burnHistory.length, 1);
  });

  it('should accumulate burns', () => {
    operator.recordBurn(100);
    operator.recordBurn(200);
    operator.recordBurn(300);

    assert.strictEqual(operator.burn.totalBurned, 600);
    assert.strictEqual(operator.burn.burnHistory.length, 3);
  });

  it('should increase E-Score after burning', () => {
    const initialScore = operator.getEScore();
    operator.recordBurn(10000);
    const newScore = operator.getEScore();

    assert.ok(newScore > initialScore);
  });

  it('should record block production', () => {
    operator.recordBlockProduced();
    operator.recordBlockProduced();

    assert.strictEqual(operator.stats.blocksProduced, 2);
  });

  it('should record judgments', () => {
    operator.recordJudgment();
    operator.recordJudgment();
    operator.recordJudgment();

    assert.strictEqual(operator.stats.judgmentsMade, 3);
  });

  it('should record pattern contributions', () => {
    operator.recordPatternContribution();

    assert.strictEqual(operator.stats.patternsContributed, 1);
  });

  it('should update uptime', () => {
    operator.updateUptime(60000);

    assert.strictEqual(operator.stats.uptime, 60000);
  });

  it('should calculate vote weight', () => {
    // Fresh operator has weight 0 (eScore=0, uptime=0)
    const weight1 = operator.getVoteWeight();
    assert.strictEqual(weight1, 0);

    // After burn and uptime, weight should be > 0
    operator.recordBurn(1000);
    operator.updateUptime(3600000); // 1 hour

    const eScore = operator.getEScore();
    const uptime = operator.getUptime();
    const weight2 = operator.getVoteWeight();

    // Debug assertions
    assert.ok(eScore > 0, `E-Score should be > 0, got ${eScore}`);
    assert.ok(uptime > 0, `Uptime should be > 0, got ${uptime}`);
    assert.ok(weight2 > 0, `Expected weight > 0, got ${weight2} (eScore=${eScore}, uptime=${uptime})`);
  });

  it('should get E-Score breakdown', () => {
    operator.recordBurn(500);
    const breakdown = operator.getEScoreBreakdown();

    assert.ok(breakdown.dimensions);
    assert.ok(breakdown.totalWeight);
    assert.strictEqual(breakdown.composite, operator.getEScore());
  });

  it('should get public info', () => {
    operator.recordBurn(100);
    const info = operator.getPublicInfo();

    assert.ok(info.id);
    assert.ok(info.publicKey);
    assert.ok(info.name);
    assert.ok(info.eScore >= 0);
    assert.strictEqual(info.burned, 100);
    assert.ok(info.uptime >= 0);
    assert.ok(info.voteWeight >= 0);
    assert.ok(info.stats);
    assert.strictEqual(info.privateKey, undefined);
  });

  it('should export and import state', () => {
    operator.recordBurn(500);
    operator.recordJudgment();
    operator.recordBlockProduced();

    const exported = operator.export();
    assert.ok(exported.identity);
    assert.ok(exported.eScore);
    assert.ok(exported.burn);
    assert.ok(exported.stats);

    const restored = Operator.import(exported);
    assert.strictEqual(restored.id, operator.id);
    assert.strictEqual(restored.burn.totalBurned, 500);
    assert.strictEqual(restored.stats.judgmentsMade, 1);
    assert.strictEqual(restored.stats.blocksProduced, 1);
  });

  it('should create operator from existing identity', () => {
    const identity = {
      publicKey: operator.publicKey,
      privateKey: operator.privateKey,
      name: 'RestoredOperator',
    };

    const restored = new Operator({ identity });
    assert.strictEqual(restored.id, operator.id);
    assert.strictEqual(restored.publicKey, operator.publicKey);
    assert.strictEqual(restored.identity.name, 'RestoredOperator');
  });
});
