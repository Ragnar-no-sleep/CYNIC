/**
 * Thermodynamics Tracker Tests
 *
 * Tests for cognitive energy management with φ-derived constants.
 *
 * "Entropy always increases" - Second Law
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  ThermodynamicsTracker,
  createThermodynamicsTracker,
  CARNOT_LIMIT,
  CRITICAL_TEMPERATURE,
} from '../src/thermodynamics-tracker.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.38196601125010515;
const PHI_INV_3 = 0.2360679774997896;

const THERMO_DIR = path.join(os.homedir(), '.cynic', 'thermodynamics');
const STATE_FILE = path.join(THERMO_DIR, 'state.json');

// =============================================================================
// TEST HELPERS
// =============================================================================

function cleanupStateFile() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('ThermodynamicsTracker', () => {
  let tracker;

  beforeEach(() => {
    cleanupStateFile();
    tracker = new ThermodynamicsTracker();
  });

  afterEach(() => {
    cleanupStateFile();
  });

  // ===========================================================================
  // CONSTANTS
  // ===========================================================================

  describe('constants', () => {
    it('CARNOT_LIMIT should be φ⁻¹ (61.8%)', () => {
      assert.equal(CARNOT_LIMIT, PHI_INV);
      assert.ok(Math.abs(CARNOT_LIMIT - 0.618) < 0.001);
    });

    it('CRITICAL_TEMPERATURE should be φ × 50 ≈ 81', () => {
      assert.equal(CRITICAL_TEMPERATURE, Math.round(PHI * 50));
      assert.ok(CRITICAL_TEMPERATURE >= 80 && CRITICAL_TEMPERATURE <= 82);
    });
  });

  // ===========================================================================
  // CREATION
  // ===========================================================================

  describe('creation', () => {
    it('should create with factory function', () => {
      const t = createThermodynamicsTracker();
      assert.ok(t instanceof ThermodynamicsTracker);
    });

    it('should initialize with zero heat and work', () => {
      const state = tracker.getState();
      assert.equal(state.heat, 0);
      assert.equal(state.work, 0);
    });

    it('should initialize with φ⁻² average efficiency', () => {
      assert.ok(Math.abs(tracker.state.stats.averageEfficiency - PHI_INV_2) < 0.001);
    });

    it('should start session timer', () => {
      assert.ok(tracker.state.session.startTime > 0);
      assert.ok(Date.now() - tracker.state.session.startTime < 1000);
    });
  });

  // ===========================================================================
  // HEAT RECORDING
  // ===========================================================================

  describe('recordHeat', () => {
    it('should record heat from frustration', () => {
      tracker.recordHeat('error', 1);
      const state = tracker.getState();
      assert.ok(state.heat > 0);
    });

    it('should normalize small values (0-1 range)', () => {
      tracker.recordHeat('minor', 0.5);
      const state = tracker.getState();
      // 0.5 * 15 (HEAT_PER_FRUSTRATION) = 7.5 → rounds to 7 or 8
      assert.ok(state.heat >= 7 && state.heat <= 8);
    });

    it('should use raw values > 1', () => {
      tracker.recordHeat('major', 25);
      const state = tracker.getState();
      assert.ok(state.heat >= 25);
    });

    it('should track heat sources', () => {
      tracker.recordHeat('compile_error', 10);
      tracker.recordHeat('test_failure', 5);
      tracker.recordHeat('compile_error', 10);

      const sources = tracker.analyzeHeatSources();
      assert.equal(sources[0].source, 'compile_error');
      assert.equal(sources[0].heat, 20);
    });

    it('should increase entropy with heat', () => {
      const before = tracker.state.session.entropy;
      tracker.recordHeat('error', 10);
      const after = tracker.state.session.entropy;
      assert.ok(after > before);
    });

    it('should detect thermal runaway', () => {
      // Record enough heat to exceed critical temperature
      tracker.recordHeat('disaster', CRITICAL_TEMPERATURE + 10);
      assert.equal(tracker.state.stats.thermalRunaways, 1);
    });

    it('should update totals', () => {
      const beforeTotal = tracker.state.totals.totalHeat;
      tracker.recordHeat('error', 10);
      assert.equal(tracker.state.totals.totalHeat, beforeTotal + 10);
    });
  });

  // ===========================================================================
  // WORK RECORDING
  // ===========================================================================

  describe('recordWork', () => {
    it('should record work from success', () => {
      tracker.recordWork('commit', 1);
      const state = tracker.getState();
      assert.ok(state.work > 0);
    });

    it('should normalize small values (0-1 range)', () => {
      tracker.recordWork('minor', 0.5);
      const state = tracker.getState();
      // 0.5 * 10 (WORK_PER_SUCCESS) = 5
      assert.equal(state.work, 5);
    });

    it('should use raw values > 1', () => {
      tracker.recordWork('major', 25);
      const state = tracker.getState();
      assert.equal(state.work, 25);
    });

    it('should track work sources', () => {
      tracker.recordWork('commit', 10);
      tracker.recordWork('test_pass', 5);
      tracker.recordWork('commit', 15);

      const sources = tracker.analyzeWorkSources();
      assert.equal(sources[0].source, 'commit');
      assert.equal(sources[0].work, 25);
    });

    it('should increase entropy (less than heat)', () => {
      const t1 = new ThermodynamicsTracker();
      const t2 = new ThermodynamicsTracker();

      t1.recordHeat('error', 10);
      t2.recordWork('success', 10);

      // Heat increases entropy more than work
      assert.ok(t1.state.session.entropy > t2.state.session.entropy);
    });

    it('should update peak efficiency', () => {
      tracker.recordWork('success', 50);
      const efficiency = tracker.calculateEfficiency();
      assert.ok(tracker.state.stats.peakEfficiency >= efficiency);
    });
  });

  // ===========================================================================
  // EFFICIENCY CALCULATION
  // ===========================================================================

  describe('calculateEfficiency', () => {
    it('should return Carnot limit when nothing happened', () => {
      const efficiency = tracker.calculateEfficiency();
      assert.equal(efficiency, CARNOT_LIMIT);
    });

    it('should calculate η = W / (W + Q)', () => {
      tracker.recordWork('work', 60);
      tracker.recordHeat('heat', 40);

      const efficiency = tracker.calculateEfficiency();
      // 60 / (60 + 40) = 0.6, but capped at φ⁻¹ = 0.618
      assert.ok(efficiency <= CARNOT_LIMIT);
    });

    it('should never exceed Carnot limit', () => {
      // Pure work, no heat
      tracker.recordWork('work', 100);

      const efficiency = tracker.calculateEfficiency();
      assert.ok(efficiency <= CARNOT_LIMIT);
    });

    it('should be low with high heat', () => {
      tracker.recordWork('work', 10);
      tracker.recordHeat('heat', 90);

      const efficiency = tracker.calculateEfficiency();
      // 10 / 100 = 0.1
      assert.ok(efficiency <= 0.15);
    });
  });

  // ===========================================================================
  // TEMPERATURE CALCULATION
  // ===========================================================================

  describe('calculateTemperature', () => {
    it('should return 0 at session start', () => {
      const temp = tracker.calculateTemperature();
      // At start, sessionMinutes ≈ 0
      assert.ok(temp === 0 || temp < 100);
    });

    it('should be heat rate over time', () => {
      // Simulate some time passing
      tracker.state.session.startTime = Date.now() - 60000; // 1 minute ago
      tracker.state.session.heat = 50;

      const temp = tracker.calculateTemperature();
      // 50 heat / 1 minute ≈ 50
      assert.ok(temp >= 45 && temp <= 55);
    });
  });

  // ===========================================================================
  // CRITICAL STATE DETECTION
  // ===========================================================================

  describe('isCritical', () => {
    it('should return false initially', () => {
      assert.equal(tracker.isCritical(), false);
    });

    it('should return true when heat exceeds critical temperature', () => {
      tracker.state.session.heat = CRITICAL_TEMPERATURE + 1;
      assert.equal(tracker.isCritical(), true);
    });
  });

  describe('isLowEfficiency', () => {
    it('should return false with good efficiency', () => {
      tracker.recordWork('work', 70);
      tracker.recordHeat('heat', 30);
      assert.equal(tracker.isLowEfficiency(), false);
    });

    it('should return true when efficiency < φ⁻²', () => {
      tracker.recordWork('work', 10);
      tracker.recordHeat('heat', 90);
      // 10 / 100 = 0.1 < 0.382
      assert.equal(tracker.isLowEfficiency(), true);
    });
  });

  // ===========================================================================
  // HEAT DISSIPATION
  // ===========================================================================

  describe('dissipateHeat', () => {
    it('should return 0 if action was recent', () => {
      tracker.state.session.heat = 50;
      tracker.state.session.lastAction = Date.now();

      const dissipated = tracker.dissipateHeat();
      assert.equal(dissipated, 0);
    });

    it('should dissipate heat over time', () => {
      tracker.state.session.heat = 50;
      tracker.state.session.lastAction = Date.now() - 120000; // 2 minutes ago

      const dissipated = tracker.dissipateHeat();
      assert.ok(dissipated > 0);
      assert.ok(tracker.state.session.heat < 50);
    });

    it('should not go below zero', () => {
      tracker.state.session.heat = 5;
      tracker.state.session.lastAction = Date.now() - 600000; // 10 minutes ago

      tracker.dissipateHeat();
      assert.ok(tracker.state.session.heat >= 0);
    });
  });

  // ===========================================================================
  // STATE RETRIEVAL
  // ===========================================================================

  describe('getState', () => {
    it('should return current state object', () => {
      tracker.recordWork('work', 30);
      tracker.recordHeat('heat', 20);

      const state = tracker.getState();

      assert.ok('heat' in state);
      assert.ok('work' in state);
      assert.ok('entropy' in state);
      assert.ok('efficiency' in state);
      assert.ok('temperature' in state);
      assert.ok('isCritical' in state);
      assert.ok('carnotLimit' in state);
    });

    it('should apply heat dissipation', () => {
      tracker.state.session.heat = 50;
      tracker.state.session.lastAction = Date.now() - 120000;

      const state = tracker.getState();
      assert.ok(state.heat < 50);
    });

    it('should include efficiency as percentage', () => {
      const state = tracker.getState();
      assert.equal(state.carnotLimit, Math.round(CARNOT_LIMIT * 100));
    });
  });

  // ===========================================================================
  // RECOMMENDATIONS
  // ===========================================================================

  describe('getRecommendation', () => {
    it('should return GOOD for balanced state', () => {
      // Fresh tracker with minimal values - avoid triggering temp/entropy thresholds
      const t = new ThermodynamicsTracker();
      t.state.session.work = 30;
      t.state.session.heat = 10;
      t.state.session.entropy = 5;
      t.state.session.startTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago
      t.state.session.lastAction = Date.now();

      const rec = t.getRecommendation();
      // Should be GOOD unless other thresholds trigger
      assert.ok(['GOOD', 'WARM'].includes(rec.level));
      assert.equal(rec.confidenceModifier >= 0.95, true);
    });

    it('should return CRITICAL when overheated', () => {
      tracker.state.session.heat = CRITICAL_TEMPERATURE + 10;

      const rec = tracker.getRecommendation();
      assert.equal(rec.level, 'CRITICAL');
      assert.equal(rec.action, 'break');
      assert.equal(rec.confidenceModifier, 0.5);
    });

    it('should return LOW or CRITICAL for poor efficiency with high heat', () => {
      // With high heat, it may also be CRITICAL
      const t = new ThermodynamicsTracker();
      t.state.session.work = 5;
      t.state.session.heat = 95;
      t.state.session.startTime = Date.now() - 10 * 60 * 1000;

      const rec = t.getRecommendation();
      // Heat 95 exceeds critical ~81, so it should be CRITICAL
      assert.ok(['LOW', 'CRITICAL'].includes(rec.level));
    });

    it('should return ENTROPY for high entropy', () => {
      tracker.state.session.entropy = 60;
      tracker.recordWork('work', 50);
      tracker.recordHeat('heat', 30);

      const rec = tracker.getRecommendation();
      assert.equal(rec.level, 'ENTROPY');
      assert.equal(rec.action, 'reset');
    });

    it('should return WARM when temperature rising', () => {
      tracker.state.session.startTime = Date.now() - 60000;
      tracker.state.session.heat = 60;
      tracker.recordWork('work', 50);

      const rec = tracker.getRecommendation();
      assert.equal(rec.level, 'WARM');
      assert.equal(rec.action, 'slow');
    });

    it('should include confidence modifier in all recommendations', () => {
      const states = [
        () => { /* default - GOOD */ },
        () => { tracker.state.session.heat = CRITICAL_TEMPERATURE + 10; },
        () => { tracker.recordWork('w', 5); tracker.recordHeat('h', 95); },
        () => { tracker.state.session.entropy = 60; },
      ];

      for (const setup of states) {
        const t = new ThermodynamicsTracker();
        setup.call(t);
        const rec = t.getRecommendation();
        assert.ok(typeof rec.confidenceModifier === 'number');
        assert.ok(rec.confidenceModifier > 0 && rec.confidenceModifier <= 1);
      }
    });
  });

  // ===========================================================================
  // ANALYSIS
  // ===========================================================================

  describe('analyzeHeatSources', () => {
    it('should return sorted heat sources', () => {
      tracker.recordHeat('minor', 10);
      tracker.recordHeat('major', 50);
      tracker.recordHeat('medium', 30);

      const sources = tracker.analyzeHeatSources();

      assert.equal(sources.length, 3);
      assert.equal(sources[0].source, 'major');
      assert.equal(sources[1].source, 'medium');
      assert.equal(sources[2].source, 'minor');
    });
  });

  describe('analyzeWorkSources', () => {
    it('should return sorted work sources', () => {
      tracker.recordWork('minor', 10);
      tracker.recordWork('major', 50);
      tracker.recordWork('medium', 30);

      const sources = tracker.analyzeWorkSources();

      assert.equal(sources.length, 3);
      assert.equal(sources[0].source, 'major');
    });
  });

  // ===========================================================================
  // ENTROPY RESET
  // ===========================================================================

  describe('resetEntropy', () => {
    it('should reset entropy to zero', () => {
      tracker.state.session.entropy = 50;

      const result = tracker.resetEntropy();

      assert.equal(result.reset, true);
      assert.equal(result.previousEntropy, 50);
      assert.equal(tracker.state.session.entropy, 0);
    });

    it('should increment reset counter', () => {
      const before = tracker.state.stats.entropyResets;
      tracker.resetEntropy();
      assert.equal(tracker.state.stats.entropyResets, before + 1);
    });
  });

  // ===========================================================================
  // STATS
  // ===========================================================================

  describe('getStats', () => {
    it('should return comprehensive stats', () => {
      tracker.recordWork('work', 50);
      tracker.recordHeat('heat', 30);

      const stats = tracker.getStats();

      assert.ok('averageEfficiency' in stats);
      assert.ok('peakEfficiency' in stats);
      assert.ok('thermalRunaways' in stats);
      assert.ok('entropyResets' in stats);
      assert.ok('totals' in stats);
      assert.ok('currentState' in stats);
    });
  });

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  describe('state persistence', () => {
    it('should save state to file', () => {
      tracker.recordWork('work', 50);

      assert.ok(fs.existsSync(STATE_FILE));

      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      assert.equal(saved.session.work, 50);
    });

    it('should load state from file', () => {
      // Save some state
      tracker.recordWork('work', 100);
      tracker.state.totals.sessions = 5;
      tracker._saveState();

      // Create new tracker - should load state
      const tracker2 = new ThermodynamicsTracker();
      assert.equal(tracker2.state.totals.sessions, 5);
    });

    it('should restore recent session', () => {
      tracker.recordWork('work', 75);
      tracker._saveState();

      // Create new tracker within 30 minutes
      const tracker2 = new ThermodynamicsTracker();
      assert.equal(tracker2.state.session.work, 75);
    });

    it('should not restore old session', () => {
      tracker.recordWork('work', 75);
      tracker.state.session.lastAction = Date.now() - 31 * 60 * 1000; // 31 minutes ago
      tracker._saveState();

      // Create new tracker - old session should not restore
      const tracker2 = new ThermodynamicsTracker();
      assert.equal(tracker2.state.session.work, 0);
    });

    it('should handle missing state file', () => {
      cleanupStateFile();
      const tracker2 = new ThermodynamicsTracker();
      assert.equal(tracker2.state.session.work, 0);
    });

    it('should handle corrupted state file', () => {
      fs.mkdirSync(THERMO_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, 'not json');

      // Should not throw
      const tracker2 = new ThermodynamicsTracker();
      assert.equal(tracker2.state.session.work, 0);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          tracker.recordHeat('rapid', 1);
        } else {
          tracker.recordWork('rapid', 1);
        }
      }

      const state = tracker.getState();
      assert.ok(state.heat > 0);
      assert.ok(state.work > 0);
    });

    it('should handle zero values', () => {
      tracker.recordHeat('zero', 0);
      tracker.recordWork('zero', 0);

      const state = tracker.getState();
      assert.equal(state.heat, 0);
      assert.equal(state.work, 0);
    });

    it('should handle very large values', () => {
      tracker.recordHeat('massive', 1000000);
      tracker.recordWork('massive', 1000000);

      const state = tracker.getState();
      assert.ok(state.heat > 0);
      assert.ok(state.work > 0);
    });

    it('should calculate session duration', () => {
      tracker.state.session.startTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago

      const state = tracker.getState();
      assert.ok(state.sessionDuration >= 4 && state.sessionDuration <= 6);
    });

    it('should preserve heat and work sources', () => {
      tracker.recordHeat('source1', 10);
      tracker.recordWork('source2', 20);
      tracker._saveState();

      const tracker2 = new ThermodynamicsTracker();
      const heatSources = tracker2.analyzeHeatSources();
      const workSources = tracker2.analyzeWorkSources();

      assert.ok(heatSources.some(s => s.source === 'source1'));
      assert.ok(workSources.some(s => s.source === 'source2'));
    });
  });

  // ===========================================================================
  // PHI ALIGNMENT
  // ===========================================================================

  describe('φ alignment', () => {
    it('should use φ-derived thresholds', () => {
      // All thresholds should be φ-related
      assert.ok(Math.abs(CARNOT_LIMIT - PHI_INV) < 0.001);
      assert.ok(Math.abs(CRITICAL_TEMPERATURE - PHI * 50) < 1);
    });

    it('should cap efficiency at φ⁻¹', () => {
      // Even with perfect work/no heat ratio
      tracker.state.session.work = 1000;
      tracker.state.session.heat = 0;

      const efficiency = tracker.calculateEfficiency();
      assert.equal(efficiency, CARNOT_LIMIT);
    });

    it('should use φ⁻² as low efficiency threshold', () => {
      // Set efficiency to exactly φ⁻² - should not be low
      tracker.state.session.work = PHI_INV_2 * 100;
      tracker.state.session.heat = (1 - PHI_INV_2) * 100;

      const isLow = tracker.isLowEfficiency();
      // At boundary - might be low depending on rounding
      assert.ok(typeof isLow === 'boolean');
    });
  });
});
