/**
 * CYNIC Worlds Unit Tests
 *
 * Tests for the 4 Worlds module
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  World,
  WorldManager,
  Atzilut,
  Beriah,
  Yetzirah,
  Assiah,
  atzilut,
  beriah,
  yetzirah,
  assiah,
  worldManager,
  WORLDS,
  AXIOM_TO_WORLD,
  HEBREW,
  getWorld,
  evaluateAllWorlds,
  getAllEssences,
  checkAxiomAlignment,
  resetAll,
  getStats,
} from '../src/worlds/index.js';

describe('CYNIC Worlds', () => {
  beforeEach(() => {
    // Reset all worlds before each test
    resetAll();
  });

  describe('Constants', () => {
    it('has 4 worlds', () => {
      assert.strictEqual(WORLDS.length, 4);
    });

    it('maps axioms to worlds', () => {
      assert.strictEqual(AXIOM_TO_WORLD.PHI, 'ATZILUT');
      assert.strictEqual(AXIOM_TO_WORLD.VERIFY, 'BERIAH');
      assert.strictEqual(AXIOM_TO_WORLD.CULTURE, 'YETZIRAH');
      assert.strictEqual(AXIOM_TO_WORLD.BURN, 'ASSIAH');
    });

    it('has Hebrew names', () => {
      assert.strictEqual(HEBREW.ATZILUT, 'אצילות');
      assert.strictEqual(HEBREW.BERIAH, 'בריאה');
      assert.strictEqual(HEBREW.YETZIRAH, 'יצירה');
      assert.strictEqual(HEBREW.ASSIAH, 'עשייה');
    });
  });

  describe('World base class', () => {
    it('can record scores', () => {
      const result = atzilut.recordScore('COHERENCE', 80);
      assert.strictEqual(result, true);
    });

    it('rejects unknown dimensions', () => {
      const result = atzilut.recordScore('UNKNOWN', 80);
      assert.strictEqual(result, false);
    });

    it('returns essence with all properties', () => {
      const essence = atzilut.getEssence();
      assert.strictEqual(essence.name, 'ATZILUT');
      assert.strictEqual(essence.axiom, 'PHI');
      assert.ok(essence.hebrew);
      assert.ok(essence.meaning);
      assert.ok(essence.question);
    });
  });

  describe('Atzilut (PHI world)', () => {
    it('has correct axiom', () => {
      assert.strictEqual(atzilut.axiom, 'PHI');
    });

    it('has PHI dimensions', () => {
      const dims = atzilut.getDimensions();
      assert.ok(dims.includes('COHERENCE'));
      assert.ok(dims.includes('HARMONY'));
    });

    it('checkPhiAlignment returns result', () => {
      atzilut.recordScore('COHERENCE', 80);
      atzilut.recordScore('HARMONY', 80);
      const result = atzilut.checkPhiAlignment();
      assert.ok('aligned' in result);
    });
  });

  describe('Beriah (VERIFY world)', () => {
    it('has correct axiom', () => {
      assert.strictEqual(beriah.axiom, 'VERIFY');
    });

    it('isVerifiable returns result', () => {
      const result = beriah.isVerifiable({ source: 'test', evidence: true });
      assert.ok('verifiable' in result);
    });

    it('verifyClaim requires evidence', () => {
      const result = beriah.verifyClaim('Test claim');
      assert.strictEqual(result.verified, false);
    });
  });

  describe('Yetzirah (CULTURE world)', () => {
    it('has correct axiom', () => {
      assert.strictEqual(yetzirah.axiom, 'CULTURE');
    });

    it('respectsCulture returns result', () => {
      const result = yetzirah.respectsCulture({ authentic: true });
      assert.ok('respects' in result);
    });

    it('can add cultural values', () => {
      yetzirah.addCulturalValue('custom_value');
      const values = yetzirah.getCulturalValues();
      assert.ok(values.includes('custom_value'));
    });
  });

  describe('Assiah (BURN world)', () => {
    it('has correct axiom', () => {
      assert.strictEqual(assiah.axiom, 'BURN');
    });

    it('contributesToBurn returns result', () => {
      const result = assiah.contributesToBurn({ useful: true, burns: true });
      assert.ok('contributes' in result);
    });

    it('calculateBurnRatio works', () => {
      const result = assiah.calculateBurnRatio(100, 50);
      assert.strictEqual(result.ratio, 2);
    });

    it('calculateSingularityDistance works', () => {
      const worldResults = {
        ATZILUT: { coherence: 80 },
        BERIAH: { coherence: 80 },
        YETZIRAH: { coherence: 80 },
        ASSIAH: { coherence: 80 },
      };
      const distance = assiah.calculateSingularityDistance(worldResults);
      assert.strictEqual(distance, 0.2); // 1 - 0.8 = 0.2
    });
  });

  describe('WorldManager', () => {
    it('can get world by name', () => {
      const world = worldManager.getWorld('ATZILUT');
      assert.ok(world);
      assert.strictEqual(world.name, 'ATZILUT');
    });

    it('can get world by axiom', () => {
      const world = worldManager.getWorldByAxiom('PHI');
      assert.strictEqual(world.name, 'ATZILUT');
    });

    it('recordScore delegates to world', () => {
      const result = worldManager.recordScore('COHERENCE', 80, 'ATZILUT');
      assert.strictEqual(result, true);
    });

    it('evaluateAllWorlds returns results', () => {
      const results = worldManager.evaluateAllWorlds();
      assert.ok(results.worlds);
      assert.ok('overallCoherence' in results);
      assert.ok('singularityDistance' in results);
    });

    it('getAllEssences returns 4 essences', () => {
      const essences = worldManager.getAllEssences();
      assert.strictEqual(Object.keys(essences).length, 4);
    });

    it('checkAxiomAlignment evaluates item', () => {
      const result = worldManager.checkAxiomAlignment({
        source: true,
        evidence: true,
        authentic: true,
        useful: true,
        burns: true,
      });
      assert.ok('aligned' in result);
      assert.ok('checks' in result);
    });

    it('getStats returns statistics', () => {
      worldManager.recordScore('COHERENCE', 80, 'ATZILUT');
      const stats = worldManager.getStats();
      assert.ok(stats.totalDimensions > 0);
      assert.ok(stats.worlds.ATZILUT);
    });

    it('export/import preserves state', () => {
      worldManager.recordScore('COHERENCE', 80, 'ATZILUT');
      const exported = worldManager.export();

      worldManager.resetAll();
      assert.strictEqual(Object.keys(atzilut.scores).length, 0);

      worldManager.import(exported);
      assert.strictEqual(atzilut.scores.COHERENCE.score, 80);
    });
  });

  describe('Convenience functions', () => {
    it('getWorld works', () => {
      const world = getWorld('BERIAH');
      assert.strictEqual(world.axiom, 'VERIFY');
    });

    it('evaluateAllWorlds works', () => {
      const results = evaluateAllWorlds();
      assert.ok(results.worlds);
    });

    it('getAllEssences works', () => {
      const essences = getAllEssences();
      assert.ok(essences.ATZILUT);
    });

    it('checkAxiomAlignment works', () => {
      const result = checkAxiomAlignment({});
      assert.ok('aligned' in result);
    });

    it('getStats works', () => {
      const stats = getStats();
      assert.ok(stats.totalDimensions);
    });
  });

  describe('Coherence evaluation', () => {
    it('returns no_data when no scores recorded', () => {
      const result = atzilut.evaluateCoherence();
      assert.strictEqual(result.status, 'no_data');
    });

    it('calculates coherence from scores', () => {
      atzilut.recordScore('COHERENCE', 80);
      atzilut.recordScore('HARMONY', 80);
      const result = atzilut.evaluateCoherence();
      assert.ok(result.coherence > 0);
    });

    it('identifies blocking dimensions', () => {
      atzilut.recordScore('COHERENCE', 80);
      atzilut.recordScore('HARMONY', 30); // Below threshold
      const blocking = atzilut.getBlockingDimensions();
      assert.ok(blocking.some(b => b.dimension === 'HARMONY'));
    });
  });
});
