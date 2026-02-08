/**
 * WorkerPool - Background Worker Management (O4.2)
 *
 * Auto-dispatches workers for long-running tasks with:
 * - Fibonacci-based concurrency limits
 * - Progress tracking with EventBus integration
 * - Durable task storage via AutonomousTasksRepository
 * - φ-aligned thresholds for auto-dispatch
 *
 * "Let the pack work while you rest" - κυνικός
 *
 * @module @cynic/node/workers/worker-pool
 */

'use strict';

import { EventEmitter } from 'events';
import { createLogger, PHI_INV } from '@cynic/core';
import { getEventBus, EventType } from '../services/event-bus.js';

const log = createLogger('WorkerPool');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS (φ-aligned)
// ═══════════════════════════════════════════════════════════════════════════

/** Fibonacci sequence for concurrency and timing */
const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

/** Default configuration */
export const WORKER_CONFIG = {
  /** Max concurrent workers (F7 = 13) */
  maxConcurrent: 13,

  /** Task timeout in ms (5 minutes) */
  taskTimeoutMs: 5 * 60 * 1000,

  /** Long task threshold in ms (φ⁻¹ × 10s = 6.18s) */
  longTaskThresholdMs: Math.round(PHI_INV * 10000),

  /** Progress update interval in ms (F5 = 5 seconds) */
  progressIntervalMs: 5000,

  /** Queue poll interval in ms (F3 = 3 seconds) */
  pollIntervalMs: 3000,

  /** Max queue size (F10 = 55) */
  maxQueueSize: 55,

  /** Auto-start on creation */
  autoStart: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// WORKER TASK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Task status enum
 */
export const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
};

/**
 * WorkerTask - Represents a task being executed by a worker
 */
export class WorkerTask {
  constructor(options) {
    this.id = options.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.type = options.type || 'generic';
    this.payload = options.payload || {};
    this.priority = options.priority ?? 50;
    this.status = TaskStatus.PENDING;
    this.progress = 0;
    this.progressMessage = '';
    this.result = null;
    this.error = null;
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
    this.timeoutMs = options.timeoutMs ?? WORKER_CONFIG.taskTimeoutMs;
    this.metadata = options.metadata || {};

    // Execution context
    this._handler = null;
    this._timeoutId = null;
    this._progressIntervalId = null;
    this._abortController = new AbortController();
  }

  /**
   * Update task progress
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} [message] - Progress message
   */
  updateProgress(progress, message = '') {
    this.progress = Math.min(100, Math.max(0, progress));
    this.progressMessage = message;
  }

  /**
   * Check if task can be cancelled
   * @returns {boolean}
   */
  canCancel() {
    return this.status === TaskStatus.PENDING || this.status === TaskStatus.RUNNING;
  }

  /**
   * Get abort signal for cooperative cancellation
   * @returns {AbortSignal}
   */
  get signal() {
    return this._abortController.signal;
  }

  /**
   * Request cancellation
   */
  requestCancel() {
    this._abortController.abort();
  }

  /**
   * Serialize for storage/transmission
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      priority: this.priority,
      status: this.status,
      progress: this.progress,
      progressMessage: this.progressMessage,
      result: this.result,
      error: this.error,
      createdAt: this.createdAt.toISOString(),
      startedAt: this.startedAt?.toISOString() || null,
      completedAt: this.completedAt?.toISOString() || null,
      metadata: this.metadata,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKER POOL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * WorkerPool - Manages background workers for long-running tasks
 */
export class WorkerPool extends EventEmitter {
  /**
   * Create a worker pool
   *
   * @param {Object} options - Configuration
   * @param {number} [options.maxConcurrent] - Max concurrent workers
   * @param {number} [options.taskTimeoutMs] - Default task timeout
   * @param {number} [options.longTaskThresholdMs] - Threshold for auto-dispatch
   * @param {Object} [options.tasksRepository] - AutonomousTasksRepository for durability
   * @param {Object} [options.eventBus] - EventBus for progress events
   * @param {boolean} [options.autoStart] - Start processing immediately
   */
  constructor(options = {}) {
    super();

    this.config = { ...WORKER_CONFIG, ...options };
    this.tasksRepository = options.tasksRepository || null;
    this.eventBus = options.eventBus || getEventBus();

    // Task queue (in-memory, synced with repository if available)
    this._queue = [];

    // Active workers (task ID → WorkerTask)
    this._active = new Map();

    // Registered handlers (task type → handler function)
    this._handlers = new Map();

    // Pool state
    this._running = false;
    this._pollIntervalId = null;

    // Statistics
    this.stats = {
      tasksQueued: 0,
      tasksStarted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksCancelled: 0,
      tasksTimedOut: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
    };

    // Auto-start if configured
    if (this.config.autoStart) {
      this.start();
    }

    log.debug('WorkerPool created', { maxConcurrent: this.config.maxConcurrent });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start the worker pool
   */
  start() {
    if (this._running) return;

    this._running = true;
    this._pollIntervalId = setInterval(
      () => this._processQueue(),
      this.config.pollIntervalMs
    );
    this._pollIntervalId.unref();

    // Process immediately
    this._processQueue();

    this.emit('start');
    this.eventBus.publish('worker_pool:start', { maxConcurrent: this.config.maxConcurrent });
    log.info('WorkerPool started');
  }

  /**
   * Stop the worker pool (waits for active tasks to complete)
   * @param {boolean} [force=false] - Force stop without waiting
   */
  async stop(force = false) {
    if (!this._running) return;

    this._running = false;

    if (this._pollIntervalId) {
      clearInterval(this._pollIntervalId);
      this._pollIntervalId = null;
    }

    if (force) {
      // Cancel all active tasks
      for (const task of this._active.values()) {
        task.requestCancel();
        this._cleanupTask(task);
      }
      this._active.clear();
    } else {
      // Wait for active tasks to complete
      while (this._active.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.emit('stop');
    this.eventBus.publish('worker_pool:stop', { stats: this.stats });
    log.info('WorkerPool stopped');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLER REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a task handler
   *
   * @param {string} taskType - Task type identifier
   * @param {Function} handler - Async handler function (task, context) => result
   */
  registerHandler(taskType, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for ${taskType} must be a function`);
    }

    this._handlers.set(taskType, handler);
    log.debug('Handler registered', { taskType });
  }

  /**
   * Check if handler exists for task type
   * @param {string} taskType
   * @returns {boolean}
   */
  hasHandler(taskType) {
    return this._handlers.has(taskType);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK SUBMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Submit a task to the pool
   *
   * @param {Object} options - Task options
   * @param {string} options.type - Task type (must have registered handler)
   * @param {Object} [options.payload] - Task payload
   * @param {number} [options.priority] - Priority (0-100, higher = sooner)
   * @param {number} [options.timeoutMs] - Task timeout
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {WorkerTask} The created task
   */
  submit(options) {
    if (!this._handlers.has(options.type)) {
      throw new Error(`No handler registered for task type: ${options.type}`);
    }

    if (this._queue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue full (max: ${this.config.maxQueueSize})`);
    }

    const task = new WorkerTask(options);

    // Insert by priority (higher priority first)
    const insertIndex = this._queue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this._queue.push(task);
    } else {
      this._queue.splice(insertIndex, 0, task);
    }

    this.stats.tasksQueued++;

    // Persist if repository available
    this._persistTask(task);

    this.emit('task:queued', task);
    this.eventBus.publish('worker_pool:task_queued', task.toJSON());
    log.debug('Task queued', { taskId: task.id, type: task.type, priority: task.priority });

    // Trigger immediate processing if running
    if (this._running) {
      this._processQueue();
    }

    return task;
  }

  /**
   * Auto-dispatch for potentially long-running operations
   *
   * Wraps an async function and automatically dispatches to worker pool
   * if it exceeds the long task threshold.
   *
   * @param {string} taskType - Task type
   * @param {Function} fn - Function to wrap
   * @param {Object} [options] - Additional options
   * @returns {Function} Wrapped function
   */
  autoDispatch(taskType, fn, options = {}) {
    const pool = this;

    return async function autoDispatchedFn(...args) {
      const startTime = Date.now();

      // Race between direct execution and threshold timeout
      const directExecution = fn.apply(this, args);
      const thresholdTimeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('LONG_TASK'));
        }, pool.config.longTaskThresholdMs);
      });

      try {
        // Try direct execution with threshold timeout
        return await Promise.race([directExecution, thresholdTimeout]);
      } catch (err) {
        if (err.message === 'LONG_TASK') {
          // Exceeded threshold - dispatch to worker pool
          log.info('Auto-dispatching long task to worker pool', { taskType });

          const task = pool.submit({
            type: taskType,
            payload: { args, options },
            priority: options.priority ?? 50,
            metadata: {
              autoDispatched: true,
              directStartTime: startTime,
            },
          });

          // Wait for task completion
          return pool.waitFor(task.id);
        }
        throw err;
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get task by ID
   * @param {string} taskId
   * @returns {WorkerTask|null}
   */
  getTask(taskId) {
    // Check active first
    if (this._active.has(taskId)) {
      return this._active.get(taskId);
    }

    // Check queue
    return this._queue.find(t => t.id === taskId) || null;
  }

  /**
   * Cancel a task
   * @param {string} taskId
   * @returns {boolean} Whether cancellation was successful
   */
  cancel(taskId) {
    const task = this.getTask(taskId);
    if (!task || !task.canCancel()) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    task.completedAt = new Date();
    task.requestCancel();

    // Remove from queue if pending
    const queueIndex = this._queue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this._queue.splice(queueIndex, 1);
    }

    // Cleanup if active
    if (this._active.has(taskId)) {
      this._cleanupTask(task);
      this._active.delete(taskId);
    }

    this.stats.tasksCancelled++;
    this._persistTask(task);

    this.emit('task:cancelled', task);
    this.eventBus.publish('worker_pool:task_cancelled', task.toJSON());
    log.info('Task cancelled', { taskId });

    return true;
  }

  /**
   * Wait for a task to complete
   * @param {string} taskId
   * @param {number} [timeoutMs] - Timeout in ms
   * @returns {Promise<any>} Task result
   */
  async waitFor(taskId, timeoutMs = this.config.taskTimeoutMs) {
    return new Promise((resolve, reject) => {
      const checkTask = () => {
        const task = this.getTask(taskId);
        if (!task) {
          reject(new Error(`Task not found: ${taskId}`));
          return true;
        }

        if (task.status === TaskStatus.COMPLETED) {
          resolve(task.result);
          return true;
        }

        if (task.status === TaskStatus.FAILED || task.status === TaskStatus.TIMEOUT) {
          reject(new Error(task.error || 'Task failed'));
          return true;
        }

        if (task.status === TaskStatus.CANCELLED) {
          reject(new Error('Task cancelled'));
          return true;
        }

        return false;
      };

      // Check immediately
      if (checkTask()) return;

      // Set up listeners
      const onComplete = (t) => {
        if (t.id === taskId) {
          cleanup();
          resolve(t.result);
        }
      };

      const onFailed = (t) => {
        if (t.id === taskId) {
          cleanup();
          reject(new Error(t.error || 'Task failed'));
        }
      };

      const cleanup = () => {
        this.off('task:completed', onComplete);
        this.off('task:failed', onFailed);
        this.off('task:timeout', onFailed);
        this.off('task:cancelled', onFailed);
        clearTimeout(timeoutId);
      };

      this.on('task:completed', onComplete);
      this.on('task:failed', onFailed);
      this.on('task:timeout', onFailed);
      this.on('task:cancelled', onFailed);

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`waitFor timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUEUE PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process pending tasks in the queue
   * @private
   */
  async _processQueue() {
    if (!this._running) return;

    // Check available worker slots
    const availableSlots = this.config.maxConcurrent - this._active.size;
    if (availableSlots <= 0 || this._queue.length === 0) return;

    // Get tasks to process (up to available slots)
    const tasksToProcess = this._queue.splice(0, availableSlots);

    // Execute each task
    for (const task of tasksToProcess) {
      this._executeTask(task);
    }
  }

  /**
   * Execute a single task
   * @private
   * @param {WorkerTask} task
   */
  async _executeTask(task) {
    const handler = this._handlers.get(task.type);
    if (!handler) {
      task.status = TaskStatus.FAILED;
      task.error = `No handler for task type: ${task.type}`;
      task.completedAt = new Date();
      this.stats.tasksFailed++;
      this.emit('task:failed', task);
      return;
    }

    // Mark as running
    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    this._active.set(task.id, task);
    this.stats.tasksStarted++;

    this.emit('task:started', task);
    this.eventBus.publish('worker_pool:task_started', task.toJSON());
    log.debug('Task started', { taskId: task.id, type: task.type });

    // Set up timeout
    task._timeoutId = setTimeout(() => {
      this._handleTimeout(task);
    }, task.timeoutMs);
    task._timeoutId.unref();

    // Set up progress interval
    task._progressIntervalId = setInterval(() => {
      this.emit('task:progress', task);
      this.eventBus.publish('worker_pool:task_progress', {
        taskId: task.id,
        progress: task.progress,
        message: task.progressMessage,
      });
    }, this.config.progressIntervalMs);
    task._progressIntervalId.unref();

    // Execute handler
    try {
      const context = {
        updateProgress: (p, msg) => task.updateProgress(p, msg),
        signal: task.signal,
        eventBus: this.eventBus,
        metadata: task.metadata,
      };

      const result = await handler(task.payload, context);

      // Check if cancelled during execution
      if (task.status === TaskStatus.CANCELLED) return;

      // Success
      task.status = TaskStatus.COMPLETED;
      task.result = result;
      task.progress = 100;
      task.completedAt = new Date();

      const durationMs = task.completedAt - task.startedAt;
      this.stats.tasksCompleted++;
      this.stats.totalDurationMs += durationMs;
      this.stats.avgDurationMs = Math.round(
        this.stats.totalDurationMs / this.stats.tasksCompleted
      );

      this._cleanupTask(task);
      this._active.delete(task.id);
      this._persistTask(task);

      this.emit('task:completed', task);
      this.eventBus.publish('worker_pool:task_completed', {
        ...task.toJSON(),
        durationMs,
      });
      log.info('Task completed', { taskId: task.id, durationMs });

    } catch (err) {
      // Check if cancelled
      if (task.signal.aborted || task.status === TaskStatus.CANCELLED) return;

      // Failure
      task.status = TaskStatus.FAILED;
      task.error = err.message;
      task.completedAt = new Date();
      this.stats.tasksFailed++;

      this._cleanupTask(task);
      this._active.delete(task.id);
      this._persistTask(task);

      this.emit('task:failed', task);
      this.eventBus.publish('worker_pool:task_failed', {
        ...task.toJSON(),
        error: err.message,
      });
      log.error('Task failed', { taskId: task.id, error: err.message });
    }

    // Process more tasks
    this._processQueue();
  }

  /**
   * Handle task timeout
   * @private
   * @param {WorkerTask} task
   */
  _handleTimeout(task) {
    if (task.status !== TaskStatus.RUNNING) return;

    task.status = TaskStatus.TIMEOUT;
    task.error = `Task timed out after ${task.timeoutMs}ms`;
    task.completedAt = new Date();
    task.requestCancel();

    this.stats.tasksTimedOut++;

    this._cleanupTask(task);
    this._active.delete(task.id);
    this._persistTask(task);

    this.emit('task:timeout', task);
    this.eventBus.publish('worker_pool:task_timeout', task.toJSON());
    log.warn('Task timed out', { taskId: task.id, timeoutMs: task.timeoutMs });

    // Process more tasks
    this._processQueue();
  }

  /**
   * Cleanup task timers
   * @private
   * @param {WorkerTask} task
   */
  _cleanupTask(task) {
    if (task._timeoutId) {
      clearTimeout(task._timeoutId);
      task._timeoutId = null;
    }

    if (task._progressIntervalId) {
      clearInterval(task._progressIntervalId);
      task._progressIntervalId = null;
    }
  }

  /**
   * Persist task to repository
   * @private
   * @param {WorkerTask} task
   */
  async _persistTask(task) {
    if (!this.tasksRepository) return;

    try {
      // Map to repository format
      await this.tasksRepository.upsert({
        id: task.id,
        userId: task.metadata.userId || 'system',
        type: task.type,
        status: task.status,
        payload: task.payload,
        result: task.result,
        errorMessage: task.error,
        priority: task.priority,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
      });
    } catch (err) {
      log.warn('Failed to persist task', { taskId: task.id, error: err.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS & STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get pool status
   * @returns {Object}
   */
  getStatus() {
    return {
      running: this._running,
      activeWorkers: this._active.size,
      maxConcurrent: this.config.maxConcurrent,
      queuedTasks: this._queue.length,
      maxQueueSize: this.config.maxQueueSize,
      registeredHandlers: Array.from(this._handlers.keys()),
      stats: { ...this.stats },
    };
  }

  /**
   * Get all active tasks
   * @returns {WorkerTask[]}
   */
  getActiveTasks() {
    return Array.from(this._active.values());
  }

  /**
   * Get all queued tasks
   * @returns {WorkerTask[]}
   */
  getQueuedTasks() {
    return [...this._queue];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new worker pool
 * @param {Object} options
 * @returns {WorkerPool}
 */
export function createWorkerPool(options = {}) {
  return new WorkerPool(options);
}

/** Singleton instance */
let _poolInstance = null;

/**
 * Get the global worker pool singleton
 * @param {Object} [options] - Options for first initialization
 * @returns {WorkerPool}
 */
export function getWorkerPool(options = {}) {
  if (!_poolInstance) {
    _poolInstance = createWorkerPool(options);
  }
  return _poolInstance;
}

/**
 * Reset the global worker pool (for testing)
 */
export function resetWorkerPool() {
  if (_poolInstance) {
    _poolInstance.stop(true);
    _poolInstance = null;
  }
}

export default WorkerPool;
