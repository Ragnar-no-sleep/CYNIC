/**
 * Strategy Manager Tests
 *
 * Tests automatic strategy switching when stuck.
 *
 * @module @cynic/node/test/strategy-manager
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  StrategyManager,
  StrategySuggestion,
  STUCK_THRESHOLDS,
  StuckIndicator,
  StrategyType,
  createStrategyManager,
  DogId,
  TaskType,
  DOG_CAPABILITIES,
} from '../src/routing/index.js';

// φ constants
const PHI_INV = 0.618033988749895;

describe('StrategySuggestion', () => {
  it('should create suggestion with basic properties', () => {
    const suggestion = new StrategySuggestion({
      type: StrategyType.SWITCH_DOG,
      dogId: DogId.ANALYST,
      confidence: 0.5,
      reason: 'Test reason',
    });

    assert.strictEqual(suggestion.type, StrategyType.SWITCH_DOG);
    assert.strictEqual(suggestion.dogId, DogId.ANALYST);
    assert.strictEqual(suggestion.confidence, 0.5);
    assert.strictEqual(suggestion.reason, 'Test reason');
  });

  it('should cap confidence at φ⁻¹', () => {
    const suggestion = new StrategySuggestion({
      type: StrategyType.ESCALATE,
      confidence: 0.9,
      reason: 'High confidence',
    });

    assert.ok(suggestion.confidence <= PHI_INV);
  });

  it('should get dog info for SWITCH_DOG type', () => {
    const suggestion = new StrategySuggestion({
      type: StrategyType.SWITCH_DOG,
      dogId: DogId.SCOUT,
      confidence: 0.5,
      reason: 'Switch to Scout',
    });

    const info = suggestion.getDogInfo();
    assert.ok(info);
    assert.strictEqual(info.name, 'Scout');
  });

  it('should serialize to JSON', () => {
    const suggestion = new StrategySuggestion({
      type: StrategyType.SWITCH_DOG,
      dogId: DogId.GUARDIAN,
      confidence: 0.5,
      reason: 'Security',
    });

    const json = suggestion.toJSON();

    assert.strictEqual(json.type, StrategyType.SWITCH_DOG);
    assert.strictEqual(json.dogId, DogId.GUARDIAN);
    assert.strictEqual(json.dogName, 'Guardian');
    assert.ok(json.dogEmoji);
  });
});

describe('StrategyManager', () => {
  let manager;

  beforeEach(() => {
    manager = createStrategyManager();
  });

  describe('failure recording', () => {
    it('should record failures', () => {
      manager.recordFailure({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
        errorType: 'not_found',
      });

      const status = manager.getStuckStatus();
      assert.strictEqual(status.recentFailures, 1);
    });

    it('should track consecutive failures', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      assert.ok(!manager.isStuck(DogId.SCOUT)); // Not stuck yet (< 3)

      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      assert.ok(manager.isStuck(DogId.SCOUT)); // Now stuck (>= 3)
    });

    it('should track error types', () => {
      manager.recordFailure({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
        errorType: 'timeout',
      });
      manager.recordFailure({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
        errorType: 'timeout',
      });

      const status = manager.getStuckStatus();
      assert.ok(status.topErrors.some(e => e.type === 'timeout' && e.count === 2));
    });
  });

  describe('success recording', () => {
    it('should reset consecutive failures on success', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      manager.recordSuccess(DogId.SCOUT);

      assert.ok(!manager.isStuck(DogId.SCOUT));
    });
  });

  describe('stuck detection', () => {
    it('should detect consecutive failures stuck', () => {
      let stuckResult = null;

      manager.on('stuck:detected', (result) => {
        stuckResult = result;
      });

      manager.recordFailure({ dogId: DogId.ANALYST, taskType: TaskType.ANALYSIS });
      manager.recordFailure({ dogId: DogId.ANALYST, taskType: TaskType.ANALYSIS });
      manager.recordFailure({ dogId: DogId.ANALYST, taskType: TaskType.ANALYSIS });

      assert.ok(stuckResult);
      assert.strictEqual(stuckResult.indicator, StuckIndicator.CONSECUTIVE_FAILURES);
      assert.strictEqual(stuckResult.dogId, DogId.ANALYST);
    });

    it('should detect same error loop', () => {
      let stuckResult = null;

      manager.on('stuck:detected', (result) => {
        stuckResult = result;
      });

      manager.recordFailure({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
        errorType: 'permission_denied',
      });
      manager.recordFailure({
        dogId: DogId.ANALYST,
        taskType: TaskType.ANALYSIS,
        errorType: 'permission_denied',
      });

      assert.ok(stuckResult);
      assert.strictEqual(stuckResult.indicator, StuckIndicator.SAME_ERROR_LOOP);
      assert.strictEqual(stuckResult.errorType, 'permission_denied');
    });

    it('should detect file hotspot', () => {
      const file = 'src/problematic.js';

      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION, file });
      manager.recordFailure({ dogId: DogId.ANALYST, taskType: TaskType.ANALYSIS, file });

      const result = manager.recordFailure({
        dogId: DogId.ARCHITECT,
        taskType: TaskType.ARCHITECTURE,
        file,
      });

      assert.ok(result);
      assert.strictEqual(result.indicator, StuckIndicator.FILE_HOTSPOT);
      assert.strictEqual(result.file, file);
    });
  });

  describe('strategy suggestions', () => {
    it('should suggest alternative dogs', () => {
      const suggestions = manager.getSuggestions({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
      });

      assert.ok(suggestions.length > 0);
      assert.ok(suggestions.some(s => s.type === StrategyType.SWITCH_DOG));
    });

    it('should exclude tried dogs from suggestions', () => {
      const suggestions = manager.getSuggestions({
        dogId: DogId.SCOUT,
        taskType: TaskType.SECURITY_AUDIT,
        triedDogs: [DogId.GUARDIAN],
      });

      const switchSuggestions = suggestions.filter(s => s.type === StrategyType.SWITCH_DOG);
      assert.ok(!switchSuggestions.some(s => s.dogId === DogId.GUARDIAN));
      assert.ok(!switchSuggestions.some(s => s.dogId === DogId.SCOUT));
    });

    it('should suggest escalation to CYNIC', () => {
      const suggestions = manager.getSuggestions({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
      });

      assert.ok(suggestions.some(s =>
        s.type === StrategyType.ESCALATE && s.dogId === DogId.CYNIC
      ));
    });

    it('should suggest decomposition after multiple failures', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      const suggestions = manager.getSuggestions({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
      });

      assert.ok(suggestions.some(s => s.type === StrategyType.DECOMPOSE));
    });

    it('should sort suggestions by confidence', () => {
      const suggestions = manager.getSuggestions({
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
      });

      for (let i = 1; i < suggestions.length; i++) {
        assert.ok(suggestions[i - 1].confidence >= suggestions[i].confidence);
      }
    });
  });

  describe('switch application', () => {
    it('should apply switch', () => {
      const suggestion = new StrategySuggestion({
        type: StrategyType.SWITCH_DOG,
        dogId: DogId.ANALYST,
        confidence: 0.5,
        reason: 'Test',
      });

      const result = manager.applySwitch(suggestion, {
        dogId: DogId.SCOUT,
        taskType: TaskType.EXPLORATION,
      });

      assert.ok(result.applied);
      assert.ok(result.switch);
    });

    it('should enforce cooldown', () => {
      const suggestion = new StrategySuggestion({
        type: StrategyType.SWITCH_DOG,
        dogId: DogId.ANALYST,
        confidence: 0.5,
        reason: 'Test',
      });

      manager.applySwitch(suggestion, { dogId: DogId.SCOUT });

      const result2 = manager.applySwitch(suggestion, { dogId: DogId.SCOUT });

      assert.ok(!result2.applied);
      assert.ok(result2.reason.includes('cooldown'));
    });

    it('should enforce max switches', () => {
      // Use a manager with low max switches for testing
      const testManager = createStrategyManager({
        thresholds: {
          MAX_SWITCHES_PER_SESSION: 2,
          SWITCH_COOLDOWN_MS: 0, // Disable cooldown for test
        },
      });

      const suggestion = new StrategySuggestion({
        type: StrategyType.SWITCH_DOG,
        dogId: DogId.ANALYST,
        confidence: 0.5,
        reason: 'Test',
      });

      testManager.applySwitch(suggestion, { dogId: DogId.SCOUT });
      testManager.applySwitch(suggestion, { dogId: DogId.SCOUT });

      const result3 = testManager.applySwitch(suggestion, { dogId: DogId.SCOUT });

      assert.ok(!result3.applied);
      assert.ok(result3.reason.includes('Maximum'));
    });
  });

  describe('learning from successful switches', () => {
    it('should record successful switch', () => {
      const suggestion = new StrategySuggestion({
        type: StrategyType.SWITCH_DOG,
        dogId: DogId.ANALYST,
        confidence: 0.5,
        reason: 'Test',
      });

      manager.applySwitch(suggestion, { dogId: DogId.SCOUT, taskType: TaskType.ANALYSIS });

      // Record success
      manager.recordSuccess(DogId.ANALYST, { taskType: TaskType.ANALYSIS });

      const stats = manager.getStats();
      assert.strictEqual(stats.successfulSwitches, 1);
    });
  });

  describe('stuck status', () => {
    it('should report stuck dogs', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      const status = manager.getStuckStatus();

      assert.ok(status.stuckDogs.some(d => d.dogId === DogId.SCOUT));
      assert.ok(status.stuckDogs[0].consecutiveFailures >= 3);
    });

    it('should report top errors', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION, errorType: 'a' });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION, errorType: 'a' });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION, errorType: 'b' });

      const status = manager.getStuckStatus();

      assert.ok(status.topErrors.length > 0);
      assert.strictEqual(status.topErrors[0].type, 'a');
      assert.strictEqual(status.topErrors[0].count, 2);
    });
  });

  describe('statistics', () => {
    it('should track stuck detections', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      const stats = manager.getStats();
      assert.strictEqual(stats.stuckDetections, 1);
    });

    it('should track by indicator', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      const stats = manager.getStats();
      assert.ok(stats.byIndicator[StuckIndicator.CONSECUTIVE_FAILURES] >= 1);
    });

    it('should reset stats', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.resetStats();

      const stats = manager.getStats();
      assert.strictEqual(stats.stuckDetections, 0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      manager.reset();

      assert.ok(!manager.isStuck(DogId.SCOUT));
      assert.strictEqual(manager.getStuckStatus().recentFailures, 0);
    });
  });

  describe('formatting', () => {
    it('should format stuck detection', () => {
      const stuckResult = {
        indicator: StuckIndicator.CONSECUTIVE_FAILURES,
        message: 'Scout has failed 3 times',
      };

      const formatted = StrategyManager.formatStuck(stuckResult);

      assert.ok(formatted.includes('STUCK'));
      assert.ok(formatted.includes('Scout'));
    });

    it('should format suggestion', () => {
      const suggestion = new StrategySuggestion({
        type: StrategyType.SWITCH_DOG,
        dogId: DogId.ANALYST,
        confidence: 0.5,
        reason: 'Better match',
      });

      const formatted = StrategyManager.formatSuggestion(suggestion);

      assert.ok(formatted.includes('Switch'));
      assert.ok(formatted.includes('Analyst'));
      assert.ok(formatted.includes('50%'));
    });
  });

  describe('events', () => {
    it('should emit stuck:detected event', async () => {
      let detected = false;

      manager.on('stuck:detected', () => {
        detected = true;
      });

      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });
      manager.recordFailure({ dogId: DogId.SCOUT, taskType: TaskType.EXPLORATION });

      assert.ok(detected);
    });

    it('should emit switch:applied event', () => {
      let applied = false;

      manager.on('switch:applied', () => {
        applied = true;
      });

      const suggestion = new StrategySuggestion({
        type: StrategyType.SWITCH_DOG,
        dogId: DogId.ANALYST,
        confidence: 0.5,
        reason: 'Test',
      });

      manager.applySwitch(suggestion, { dogId: DogId.SCOUT });

      assert.ok(applied);
    });
  });
});

describe('STUCK_THRESHOLDS', () => {
  it('should have defined thresholds', () => {
    assert.ok(STUCK_THRESHOLDS.CONSECUTIVE_FAILURES > 0);
    assert.ok(STUCK_THRESHOLDS.SAME_ERROR_THRESHOLD > 0);
    assert.ok(STUCK_THRESHOLDS.ERROR_WINDOW_MS > 0);
    assert.ok(STUCK_THRESHOLDS.MAX_SWITCHES_PER_SESSION > 0);
  });
});

describe('StuckIndicator', () => {
  it('should have all indicators', () => {
    assert.ok(StuckIndicator.CONSECUTIVE_FAILURES);
    assert.ok(StuckIndicator.SAME_ERROR_LOOP);
    assert.ok(StuckIndicator.FILE_HOTSPOT);
    assert.ok(StuckIndicator.TIMEOUT_PATTERN);
    assert.ok(StuckIndicator.ESCALATION_LOOP);
  });
});

describe('StrategyType', () => {
  it('should have all strategy types', () => {
    assert.ok(StrategyType.SWITCH_DOG);
    assert.ok(StrategyType.SIMPLIFY_TASK);
    assert.ok(StrategyType.ESCALATE);
    assert.ok(StrategyType.DECOMPOSE);
    assert.ok(StrategyType.RETRY_WITH_CONTEXT);
    assert.ok(StrategyType.HUMAN_INTERVENTION);
  });
});
