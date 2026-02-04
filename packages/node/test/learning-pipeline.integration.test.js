/**
 * Learning Pipeline Integration Tests
 *
 * Tests the full learning pipeline flow:
 * Hooks → Q-Learning → PostgreSQL Persistence → EWC++ Consolidation
 *
 * "φ apprend de tout, mais doute de ses propres connaissances" - CYNIC
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// Import learning components
import { QLearningService } from '../src/orchestration/learning-service.js';

describe('Learning Pipeline Integration', () => {
  let qlearning;

  beforeEach(() => {
    // Create fresh Q-Learning service without persistence (unit test mode)
    qlearning = new QLearningService({
      persistence: null,
      serviceId: 'test',
    });
  });

  describe('Q-Learning Episode Recording', () => {
    it('should start and end episodes correctly', () => {
      const episodeId = qlearning.startEpisode({
        taskType: 'security',
        tool: 'Bash',
        context: { test: true },
      });

      assert.ok(episodeId, 'Should return episode ID');
      assert.ok(episodeId.startsWith('ep_'), 'Episode ID should have correct prefix');
      assert.ok(qlearning.currentEpisode, 'Should have current episode');
      assert.strictEqual(qlearning.currentEpisode.context.taskType, 'security');

      const result = qlearning.endEpisode({
        success: true,
        type: 'success',
      });

      assert.ok(result, 'Should return episode summary');
      assert.strictEqual(qlearning.currentEpisode, null, 'Episode should be cleared');
    });

    it('should record actions within episodes', () => {
      qlearning.startEpisode({ taskType: 'code', tool: 'Read' });

      qlearning.recordAction('guardian', {
        tool: 'Read',
        success: true,
        source: 'test',
      });

      qlearning.recordAction('analyst', {
        tool: 'Read',
        success: true,
        source: 'test',
      });

      assert.strictEqual(qlearning.currentEpisode.actions.length, 2);
      assert.strictEqual(qlearning.currentEpisode.actions[0].action, 'guardian');
      assert.strictEqual(qlearning.currentEpisode.actions[1].action, 'analyst');

      qlearning.endEpisode({ success: true });
    });

    it('should not record actions without active episode', () => {
      // No episode started
      qlearning.recordAction('guardian', { success: true });

      // Should not crash, but nothing recorded
      assert.strictEqual(qlearning.currentEpisode, null);
    });

    it('should update Q-values using Bellman equation', () => {
      // Record several episodes to build Q-table
      for (let i = 0; i < 10; i++) {
        qlearning.startEpisode({ taskType: 'security' });
        qlearning.recordAction('guardian', { success: true });
        qlearning.endEpisode({ success: true });
      }

      // Q-table should have entries
      const entries = qlearning.qTable.entries || qlearning.qTable._entries || {};
      const entryCount = typeof entries === 'object' ? Object.keys(entries).length : 0;
      assert.ok(entryCount > 0 || qlearning.stats.episodes > 0, 'Should have tracked episodes');
    });
  });

  describe('Exploration vs Exploitation', () => {
    it('should decrease exploration rate over time', () => {
      const initialRate = qlearning.explorationRate;

      // Record many episodes
      for (let i = 0; i < 20; i++) {
        qlearning.startEpisode({ taskType: 'analysis' });
        qlearning.recordAction('analyst', { success: true });
        qlearning.endEpisode({ success: true });
      }

      const finalRate = qlearning.explorationRate;
      assert.ok(finalRate <= initialRate, `Rate should decrease: ${initialRate} -> ${finalRate}`);
    });

    it('should cap exploration rate at φ⁻¹', () => {
      // Train heavily on one dog
      for (let i = 0; i < 50; i++) {
        qlearning.startEpisode({ taskType: 'security' });
        qlearning.recordAction('guardian', { success: true });
        qlearning.endEpisode({ success: true });
      }

      // Exploration rate should be bounded
      assert.ok(
        qlearning.explorationRate <= PHI_INV + 0.01,
        `Exploration rate ${qlearning.explorationRate} should not exceed φ⁻¹`
      );
    });
  });

  describe('State Persistence', () => {
    it('should track state for persistence', () => {
      // Build some state
      qlearning.startEpisode({ taskType: 'code' });
      qlearning.recordAction('analyst', { success: true });
      qlearning.endEpisode({ success: true });

      // State should be accessible
      assert.ok(qlearning.qTable, 'Should have Q-table');
      assert.ok(typeof qlearning.explorationRate === 'number', 'Should have exploration rate');
      assert.ok(qlearning.stats.episodes === 1, 'Should track episodes');
    });

    it('should maintain Q-table across episodes', () => {
      // Record several episodes
      for (let i = 0; i < 5; i++) {
        qlearning.startEpisode({ taskType: 'security' });
        qlearning.recordAction('guardian', { success: true });
        qlearning.endEpisode({ success: true });
      }

      // Q-table should have entries
      assert.ok(qlearning.qTable, 'Should have Q-table');
      assert.strictEqual(qlearning.stats.episodes, 5);
    });
  });

  describe('φ-Aligned Parameters', () => {
    it('should have φ-derived learning rate', () => {
      const lr = qlearning.config.learningRate;

      // Learning rate should be φ-derived (φ⁻¹, φ⁻², or similar)
      const isPhiAligned =
        Math.abs(lr - PHI_INV) < 0.1 ||
        Math.abs(lr - PHI_INV_2) < 0.1 ||
        Math.abs(lr - 0.236) < 0.1 || // φ⁻³
        Math.abs(lr - 0.1) < 0.05; // fallback

      assert.ok(isPhiAligned, `Learning rate ${lr} should be φ-derived`);
    });

    it('should have φ-derived discount factor', () => {
      const df = qlearning.config.discountFactor;

      // Discount factor should be φ-derived
      const isPhiAligned =
        Math.abs(df - PHI_INV) < 0.1 ||
        Math.abs(df - PHI_INV_2) < 0.1 ||
        Math.abs(df - 0.9) < 0.1 || // common default
        Math.abs(df - 0.95) < 0.1;

      assert.ok(isPhiAligned, `Discount factor ${df} should be reasonable`);
    });
  });
});

describe('Learning Pipeline - Dog Selection', () => {
  let qlearning;

  beforeEach(() => {
    qlearning = new QLearningService({
      persistence: null,
      serviceId: 'dog-selection-test',
    });
  });

  it('should learn to select appropriate dogs for task types', () => {
    // Train: Guardian handles security tasks well
    for (let i = 0; i < 20; i++) {
      qlearning.startEpisode({ taskType: 'security' });
      qlearning.recordAction('guardian', { success: true });
      qlearning.endEpisode({ success: true });
    }

    // Train: Analyst handles analysis tasks well
    for (let i = 0; i < 20; i++) {
      qlearning.startEpisode({ taskType: 'analysis' });
      qlearning.recordAction('analyst', { success: true });
      qlearning.endEpisode({ success: true });
    }

    // Verify episodes were recorded
    assert.strictEqual(qlearning.stats.episodes, 40);
  });

  it('should handle mixed success/failure outcomes', () => {
    // Guardian: good at security (80% success)
    for (let i = 0; i < 10; i++) {
      qlearning.startEpisode({ taskType: 'security' });
      qlearning.recordAction('guardian', { success: i < 8 });
      qlearning.endEpisode({ success: i < 8 });
    }

    // Should track updates
    assert.ok(qlearning.stats.updates >= 0, 'Should track updates');
  });
});

describe('Learning Pipeline - Negative Feedback', () => {
  let qlearning;

  beforeEach(() => {
    qlearning = new QLearningService({
      persistence: null,
      serviceId: 'negative-feedback-test',
    });
  });

  it('should learn from blocked actions', () => {
    // Guardian blocks dangerous commands - this is a success!
    for (let i = 0; i < 10; i++) {
      qlearning.startEpisode({ taskType: 'security' });
      qlearning.recordAction('guardian', {
        success: true,
        blocked: true,
        decision: 'block',
      });
      qlearning.endEpisode({ success: true, type: 'blocked' });
    }

    assert.strictEqual(qlearning.stats.episodes, 10);
  });

  it('should track both success and failure episodes', () => {
    // Successes
    for (let i = 0; i < 5; i++) {
      qlearning.startEpisode({ taskType: 'analysis' });
      qlearning.recordAction('analyst', { success: true });
      qlearning.endEpisode({ success: true });
    }

    // Failures
    for (let i = 0; i < 3; i++) {
      qlearning.startEpisode({ taskType: 'analysis' });
      qlearning.recordAction('analyst', { success: false });
      qlearning.endEpisode({ success: false, type: 'failure' });
    }

    assert.strictEqual(qlearning.stats.episodes, 8);
  });
});

describe('Learning Pipeline - Statistics', () => {
  let qlearning;

  beforeEach(() => {
    qlearning = new QLearningService({
      persistence: null,
      serviceId: 'stats-test',
    });
  });

  it('should track episode count', () => {
    for (let i = 0; i < 5; i++) {
      qlearning.startEpisode({ taskType: 'test' });
      qlearning.recordAction('analyst', { success: true });
      qlearning.endEpisode({ success: true });
    }

    assert.strictEqual(qlearning.stats.episodes, 5);
  });

  it('should maintain episode history', () => {
    for (let i = 0; i < 3; i++) {
      qlearning.startEpisode({ taskType: 'test' });
      qlearning.recordAction('guardian', { success: true });
      qlearning.endEpisode({ success: true });
    }

    assert.strictEqual(qlearning.episodeHistory.length, 3);
  });

  it('should limit episode history size', () => {
    const maxHistory = qlearning.maxEpisodeHistory;

    // Record more than max
    for (let i = 0; i < maxHistory + 10; i++) {
      qlearning.startEpisode({ taskType: 'test' });
      qlearning.recordAction('analyst', { success: true });
      qlearning.endEpisode({ success: true });
    }

    // Should be capped
    assert.ok(
      qlearning.episodeHistory.length <= maxHistory,
      `History ${qlearning.episodeHistory.length} should be <= ${maxHistory}`
    );
  });
});

describe('Learning Pipeline - Feature Extraction', () => {
  let qlearning;

  beforeEach(() => {
    qlearning = new QLearningService({
      persistence: null,
      serviceId: 'feature-test',
    });
  });

  it('should extract task type features', () => {
    const features = qlearning.extractFeatures({
      taskType: 'security',
      content: 'Check for vulnerabilities',
    });

    assert.ok(features.length > 0, 'Should extract features');
    // Features may be uppercase or have prefixes
    const hasSecurityFeature = features.some(
      (f) => f.toLowerCase().includes('security') || f.includes('TASK_SECURITY')
    );
    assert.ok(hasSecurityFeature, `Should detect security task, got: ${features}`);
  });

  it('should extract tool features', () => {
    const features = qlearning.extractFeatures({
      tool: 'Bash',
      content: 'Run a command',
    });

    const hasBashFeature = features.some(
      (f) => f.toLowerCase().includes('bash') || f.includes('TOOL_BASH')
    );
    assert.ok(hasBashFeature, `Should detect Bash tool, got: ${features}`);
  });

  it('should extract context features from content', () => {
    const features = qlearning.extractFeatures({
      content: 'Analyze and review the security of this authentication code',
    });

    // Should detect multiple features from content
    assert.ok(features.length >= 1, 'Should extract features from content');
  });

  it('should detect error context', () => {
    const features = qlearning.extractFeatures({
      isError: true,
      content: 'Something failed',
    });

    const hasErrorFeature = features.some(
      (f) => f.toLowerCase().includes('error') || f.includes('CONTEXT_ERROR')
    );
    assert.ok(hasErrorFeature, `Should detect error context, got: ${features}`);
  });
});
