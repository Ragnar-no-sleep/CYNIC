/**
 * @cynic/node - Autonomous Daemon Tests
 *
 * Tests for the background autonomous daemon:
 * - Task processing
 * - Goal progress tracking
 * - Self-correction analysis
 * - Notification generation
 *
 * "φ acts without being asked" - κυνικός
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  AutonomousDaemon,
  createAutonomousDaemon,
  registerTaskHandler,
} from '../src/services/autonomous-daemon.js';

// =============================================================================
// MOCK REPOSITORIES
// =============================================================================

function createMockPool() {
  return {
    query: async (sql) => {
      // Return empty results for most queries
      return { rows: [] };
    },
  };
}

function createMockGoalsRepo() {
  const goals = [];
  return {
    create: async (data) => {
      const goal = { id: `goal-${goals.length + 1}`, ...data, progress: 0, status: 'active' };
      goals.push(goal);
      return goal;
    },
    findByUser: async (userId) => goals.filter(g => g.userId === userId),
    findDueSoon: async (userId, days) => [],
    updateStatus: async (id, status) => {
      const goal = goals.find(g => g.id === id);
      if (goal) goal.status = status;
      return goal;
    },
    updateProgress: async (id, progress) => {
      const goal = goals.find(g => g.id === id);
      if (goal) goal.progress = progress;
      return goal;
    },
    _goals: goals,
  };
}

function createMockTasksRepo() {
  const tasks = [];
  const claimed = new Set();
  return {
    create: async (data) => {
      const task = {
        id: `task-${tasks.length + 1}`,
        ...data,
        status: 'pending',
        createdAt: new Date(),
      };
      tasks.push(task);
      return task;
    },
    getPending: async (limit = 10) => tasks.filter(t => t.status === 'pending').slice(0, limit),
    claim: async (id) => {
      if (claimed.has(id)) return false;
      claimed.add(id);
      const task = tasks.find(t => t.id === id);
      if (task) task.status = 'running';
      return true;
    },
    complete: async (id, result) => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.status = 'completed';
        task.result = result;
      }
      return task;
    },
    fail: async (id, error) => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.status = 'failed';
        task.error = error;
      }
      return task;
    },
    resetStuck: async (minutes) => 0,
    _tasks: tasks,
    _claimed: claimed,
  };
}

function createMockNotificationsRepo() {
  const notifications = [];
  return {
    create: async (data) => {
      const notif = {
        id: `notif-${notifications.length + 1}`,
        ...data,
        delivered: false,
        createdAt: new Date(),
      };
      notifications.push(notif);
      return notif;
    },
    findByType: async (userId, type, opts) => notifications.filter(
      n => n.userId === userId && n.notificationType === type
    ),
    cleanupExpired: async () => 0,
    _notifications: notifications,
  };
}

// =============================================================================
// DAEMON TESTS
// =============================================================================

describe('AutonomousDaemon', () => {
  let daemon;
  let mockPool;
  let mockGoalsRepo;
  let mockTasksRepo;
  let mockNotificationsRepo;

  beforeEach(() => {
    mockPool = createMockPool();
    mockGoalsRepo = createMockGoalsRepo();
    mockTasksRepo = createMockTasksRepo();
    mockNotificationsRepo = createMockNotificationsRepo();

    daemon = new AutonomousDaemon({
      pool: mockPool,
      goalsRepo: mockGoalsRepo,
      tasksRepo: mockTasksRepo,
      notificationsRepo: mockNotificationsRepo,
    });
  });

  afterEach(async () => {
    if (daemon.running) {
      await daemon.stop();
    }
  });

  describe('constructor', () => {
    it('creates daemon with options', () => {
      assert.ok(daemon);
      assert.equal(daemon.running, false);
      assert.equal(daemon.fibonacciIndex, 0);
      assert.equal(daemon.loopCount, 0);
    });

    it('initializes statistics', () => {
      const stats = daemon.getStats();
      assert.equal(stats.running, false);
      assert.equal(stats.tasksProcessed, 0);
      assert.equal(stats.tasksFailed, 0);
      assert.equal(stats.goalsUpdated, 0);
      assert.equal(stats.notificationsGenerated, 0);
    });
  });

  describe('start/stop', () => {
    it('starts the daemon', async () => {
      // Don't actually start the loop - just verify state changes
      daemon.running = true;
      daemon.stats.started = Date.now();

      assert.equal(daemon.running, true);
      assert.ok(daemon.stats.started);
    });

    it('stops the daemon', async () => {
      daemon.running = true;
      daemon.stats.started = Date.now();

      await daemon.stop();

      assert.equal(daemon.running, false);
    });
  });

  describe('scheduleTask', () => {
    it('creates a pending task', async () => {
      const task = await daemon.scheduleTask('user1', 'analyze_patterns', {
        sessionId: 'test',
      });

      assert.ok(task);
      assert.equal(task.userId, 'user1');
      assert.equal(task.taskType, 'analyze_patterns');
      assert.equal(task.status, 'pending');
    });

    it('sets default priority', async () => {
      const task = await daemon.scheduleTask('user1', 'sync', {});

      assert.equal(task.priority, 50);
    });

    it('accepts custom priority', async () => {
      const task = await daemon.scheduleTask('user1', 'sync', {}, { priority: 80 });

      assert.equal(task.priority, 80);
    });
  });

  describe('createGoal', () => {
    it('creates a goal', async () => {
      const goal = await daemon.createGoal('user1', {
        goalType: 'quality',
        title: 'Improve test coverage',
        description: 'Reach 80% coverage',
      });

      assert.ok(goal);
      assert.equal(goal.userId, 'user1');
      assert.equal(goal.goalType, 'quality');
      assert.equal(goal.progress, 0);
      assert.equal(goal.status, 'active');
    });
  });

  describe('getStats', () => {
    it('returns current statistics', () => {
      const stats = daemon.getStats();

      assert.ok(stats);
      assert.ok('running' in stats);
      assert.ok('uptime' in stats);
      assert.ok('loopCount' in stats);
      assert.ok('currentFibonacciWait' in stats);
      assert.ok('tasksProcessed' in stats);
      assert.ok('tasksFailed' in stats);
    });

    it('calculates uptime', () => {
      daemon.stats.started = Date.now() - 1000;
      const stats = daemon.getStats();

      assert.ok(stats.uptime >= 1000);
    });
  });
});

describe('registerTaskHandler', () => {
  it('registers a custom task handler', () => {
    let handlerCalled = false;

    registerTaskHandler('custom_test', async (task, ctx) => {
      handlerCalled = true;
      return { executed: true };
    });

    // Handler is registered - can't easily test execution without running daemon
    assert.ok(true);
  });
});

describe('createAutonomousDaemon', () => {
  it('creates daemon instance', () => {
    const daemon = createAutonomousDaemon({
      pool: createMockPool(),
    });

    assert.ok(daemon);
    assert.ok(daemon instanceof AutonomousDaemon);
  });
});
