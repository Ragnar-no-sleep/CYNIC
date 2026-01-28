/**
 * CYNIC Automation Executor
 *
 * Scheduled execution of automated tasks:
 * - Learning cycles (every 5 minutes - Fibonacci)
 * - Trigger evaluation (every 1 minute)
 * - Cleanup tasks (every 13 minutes - Fibonacci)
 *
 * Integrates:
 * - LearningManager for RLHF cycles
 * - TriggerManager for condition evaluation
 * - EventBus for event-driven automation
 *
 * "φ automates, φ learns" - κυνικός
 *
 * @module @cynic/node/services/automation-executor
 */

'use strict';

import { createLogger, PHI_INV } from '@cynic/core';
import { EventBus, EventType, getEventBus } from './event-bus.js';

const log = createLogger('AutomationExecutor');

/**
 * Fibonacci-aligned intervals (in milliseconds)
 */
const INTERVALS = {
  LEARNING: 5 * 60 * 1000,     // 5 minutes (Fibonacci)
  TRIGGERS: 1 * 60 * 1000,     // 1 minute
  CLEANUP: 13 * 60 * 1000,     // 13 minutes (Fibonacci)
  HEARTBEAT: 30 * 1000,        // 30 seconds
};

/**
 * Minimum feedback samples before auto-learning
 */
const MIN_FEEDBACK_SAMPLES = 5;

/**
 * Automation Executor
 *
 * Background service that runs scheduled automation tasks.
 */
export class AutomationExecutor {
  /**
   * Create the executor
   *
   * @param {Object} options - Options
   * @param {Object} [options.learningManager] - LearningManager instance
   * @param {Object} [options.triggerManager] - TriggerManager instance
   * @param {Object} [options.pool] - PostgreSQL connection pool
   * @param {EventBus} [options.eventBus] - Event bus (defaults to global)
   * @param {Object} [options.intervals] - Custom intervals
   */
  constructor(options = {}) {
    this.learningManager = options.learningManager;
    this.triggerManager = options.triggerManager;
    this.pool = options.pool;
    this.eventBus = options.eventBus || getEventBus();

    // Custom intervals
    this.intervals = {
      ...INTERVALS,
      ...options.intervals,
    };

    // State
    this.running = false;
    this._intervalHandles = new Map();
    this._pendingFeedback = [];
    this._unsubscribers = [];

    // Statistics
    this.stats = {
      startedAt: null,
      learningCycles: 0,
      triggersEvaluated: 0,
      cleanupRuns: 0,
      errors: 0,
      lastLearningCycle: null,
      lastTriggerEval: null,
      lastCleanup: null,
    };

    log.debug('Automation executor created');
  }

  /**
   * Start the automation executor
   */
  async start() {
    if (this.running) {
      log.warn('Executor already running');
      return;
    }

    this.running = true;
    this.stats.startedAt = Date.now();

    log.info('Automation executor starting');

    // Subscribe to events
    this._setupEventSubscriptions();

    // Start scheduled intervals
    this._startIntervals();

    // Emit start event
    this.eventBus.publish(EventType.AUTOMATION_START, {
      intervals: this.intervals,
    }, { source: 'AutomationExecutor' });

    log.info('Automation executor started', {
      learningInterval: `${this.intervals.LEARNING / 60000}min`,
      triggerInterval: `${this.intervals.TRIGGERS / 60000}min`,
      cleanupInterval: `${this.intervals.CLEANUP / 60000}min`,
    });
  }

  /**
   * Stop the automation executor
   */
  async stop() {
    if (!this.running) return;

    this.running = false;

    // Clear all intervals
    for (const [name, handle] of this._intervalHandles) {
      clearInterval(handle);
      log.debug(`Stopped interval: ${name}`);
    }
    this._intervalHandles.clear();

    // Unsubscribe from events
    for (const unsubscribe of this._unsubscribers) {
      unsubscribe();
    }
    this._unsubscribers = [];

    // Emit stop event
    this.eventBus.publish(EventType.AUTOMATION_STOP, {
      uptime: Date.now() - this.stats.startedAt,
      stats: this.stats,
    }, { source: 'AutomationExecutor' });

    log.info('Automation executor stopped', {
      uptime: Date.now() - this.stats.startedAt,
      ...this.stats,
    });
  }

  /**
   * Set up event subscriptions
   * @private
   */
  _setupEventSubscriptions() {
    // Subscribe to feedback events
    const feedbackUnsub = this.eventBus.subscribe(EventType.FEEDBACK_RECEIVED, async (event) => {
      await this._handleFeedbackReceived(event.data);
    });
    this._unsubscribers.push(feedbackUnsub);

    // Subscribe to judgment events for trigger evaluation
    const judgmentUnsub = this.eventBus.subscribe(EventType.JUDGMENT_CREATED, async (event) => {
      await this._handleJudgmentCreated(event.data);
    });
    this._unsubscribers.push(judgmentUnsub);

    // Subscribe to session events
    const sessionStartUnsub = this.eventBus.subscribe(EventType.SESSION_START, async (event) => {
      log.debug('Session started', { userId: event.data.userId });
    });
    this._unsubscribers.push(sessionStartUnsub);

    const sessionEndUnsub = this.eventBus.subscribe(EventType.SESSION_END, async (event) => {
      // Process any pending feedback when session ends
      if (this._pendingFeedback.length > 0) {
        await this._runLearningCycle('session_end');
      }
    });
    this._unsubscribers.push(sessionEndUnsub);

    log.debug('Event subscriptions set up');
  }

  /**
   * Start scheduled intervals
   * @private
   */
  _startIntervals() {
    // Learning cycle interval
    const learningHandle = setInterval(() => {
      this._runLearningCycle('scheduled').catch((err) => {
        this.stats.errors++;
        log.error('Scheduled learning cycle failed', { error: err.message });
      });
    }, this.intervals.LEARNING);
    this._intervalHandles.set('learning', learningHandle);

    // Trigger evaluation interval
    const triggerHandle = setInterval(() => {
      this._evaluateTriggers().catch((err) => {
        this.stats.errors++;
        log.error('Trigger evaluation failed', { error: err.message });
      });
    }, this.intervals.TRIGGERS);
    this._intervalHandles.set('triggers', triggerHandle);

    // Cleanup interval
    const cleanupHandle = setInterval(() => {
      this._runCleanup().catch((err) => {
        this.stats.errors++;
        log.error('Cleanup failed', { error: err.message });
      });
    }, this.intervals.CLEANUP);
    this._intervalHandles.set('cleanup', cleanupHandle);

    // Heartbeat interval
    const heartbeatHandle = setInterval(() => {
      this.eventBus.publish(EventType.AUTOMATION_TICK, {
        uptime: Date.now() - this.stats.startedAt,
        pendingFeedback: this._pendingFeedback.length,
        stats: this.stats,
      }, { source: 'AutomationExecutor' });
    }, this.intervals.HEARTBEAT);
    this._intervalHandles.set('heartbeat', heartbeatHandle);

    log.debug('Intervals started');
  }

  /**
   * Handle feedback received event
   * @private
   */
  async _handleFeedbackReceived(feedback) {
    this._pendingFeedback.push({
      ...feedback,
      receivedAt: Date.now(),
    });

    log.debug('Feedback received', {
      pending: this._pendingFeedback.length,
      minSamples: MIN_FEEDBACK_SAMPLES,
    });

    // Auto-trigger learning if threshold reached
    if (this._pendingFeedback.length >= MIN_FEEDBACK_SAMPLES) {
      await this._runLearningCycle('threshold');
    }
  }

  /**
   * Handle judgment created event
   * @private
   */
  async _handleJudgmentCreated(judgment) {
    // Could trigger immediate evaluation for certain judgment types
    log.debug('Judgment created', { judgmentId: judgment.judgmentId });
  }

  /**
   * Run a learning cycle
   * @private
   */
  async _runLearningCycle(trigger = 'manual') {
    if (!this.learningManager) {
      log.debug('No learning manager configured, skipping cycle');
      return null;
    }

    this.eventBus.publish(EventType.LEARNING_CYCLE_START, {
      trigger,
      pendingFeedback: this._pendingFeedback.length,
    }, { source: 'AutomationExecutor' });

    try {
      const result = await this.learningManager.runLearningCycle();

      this.stats.learningCycles++;
      this.stats.lastLearningCycle = Date.now();

      // Clear processed feedback
      this._pendingFeedback = [];

      this.eventBus.publish(EventType.LEARNING_CYCLE_COMPLETE, {
        trigger,
        result,
        cycleNumber: this.stats.learningCycles,
      }, { source: 'AutomationExecutor' });

      log.info('Learning cycle completed', {
        trigger,
        cycleNumber: this.stats.learningCycles,
        feedbackProcessed: result.feedback?.processed || 0,
        patternsUpdated: result.patterns?.updated || 0,
      });

      return result;
    } catch (err) {
      this.stats.errors++;
      log.error('Learning cycle failed', { trigger, error: err.message });
      throw err;
    }
  }

  /**
   * Evaluate triggers
   * @private
   */
  async _evaluateTriggers() {
    if (!this.triggerManager) {
      log.trace('No trigger manager configured, skipping evaluation');
      return [];
    }

    this.eventBus.publish(EventType.TRIGGER_EVALUATED, {
      timestamp: Date.now(),
    }, { source: 'AutomationExecutor' });

    try {
      // Get enabled triggers
      const triggers = await this.triggerManager.getEnabled();
      const results = [];

      for (const trigger of triggers) {
        try {
          const shouldFire = await this._evaluateTriggerCondition(trigger);

          if (shouldFire) {
            const result = await this._executeTriggerAction(trigger);
            results.push({ triggerId: trigger.triggerId, result });

            this.eventBus.publish(EventType.TRIGGER_FIRED, {
              triggerId: trigger.triggerId,
              name: trigger.name,
              action: trigger.action,
              result,
            }, { source: 'AutomationExecutor' });
          }
        } catch (err) {
          log.warn('Trigger evaluation failed', {
            triggerId: trigger.triggerId,
            error: err.message,
          });
        }
      }

      this.stats.triggersEvaluated++;
      this.stats.lastTriggerEval = Date.now();

      return results;
    } catch (err) {
      this.stats.errors++;
      log.error('Trigger evaluation failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Evaluate a trigger's condition
   * @private
   */
  async _evaluateTriggerCondition(trigger) {
    const condition = trigger.condition || {};

    switch (trigger.triggerType) {
      case 'periodic': {
        const interval = condition.interval || 3600000;
        const lastActivated = trigger.lastActivatedAt
          ? new Date(trigger.lastActivatedAt).getTime()
          : 0;
        return Date.now() - lastActivated >= interval;
      }

      case 'threshold': {
        // Would need to query metrics - simplified for now
        return false;
      }

      case 'event': {
        // Events are handled via event bus subscriptions
        return false;
      }

      case 'pattern': {
        // Pattern matching on recent events
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * Execute a trigger's action
   * @private
   */
  async _executeTriggerAction(trigger) {
    const config = trigger.actionConfig || {};

    switch (trigger.action) {
      case 'log':
        log.info(config.message || 'Trigger fired', { triggerId: trigger.triggerId });
        return { logged: true };

      case 'judge':
        // Would call judge with itemType from config
        return { judged: false, reason: 'Not implemented' };

      case 'alert':
        log.warn(`ALERT: ${config.message}`, {
          severity: config.severity,
          triggerId: trigger.triggerId,
        });
        return { alerted: true };

      case 'notify':
        // Would send notification via configured channel
        return { notified: false, reason: 'Not implemented' };

      default:
        return { action: trigger.action, executed: false };
    }
  }

  /**
   * Run cleanup tasks
   * @private
   */
  async _runCleanup() {
    if (!this.pool) {
      log.trace('No pool configured, skipping cleanup');
      return;
    }

    try {
      // Cleanup expired trigger events
      const eventResult = await this.pool.query(
        'SELECT cleanup_expired_trigger_events()'
      );
      const eventsDeleted = eventResult.rows[0]?.cleanup_expired_trigger_events || 0;

      // Cleanup total memory (if function exists)
      try {
        await this.pool.query('SELECT cleanup_total_memory()');
      } catch (e) {
        // Function may not exist
      }

      this.stats.cleanupRuns++;
      this.stats.lastCleanup = Date.now();

      if (eventsDeleted > 0) {
        log.debug('Cleanup completed', { eventsDeleted });
      }
    } catch (err) {
      this.stats.errors++;
      log.warn('Cleanup failed', { error: err.message });
    }
  }

  /**
   * Manually trigger a learning cycle
   * @returns {Promise<Object>} Cycle result
   */
  async triggerLearningCycle() {
    return this._runLearningCycle('manual');
  }

  /**
   * Get executor statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      running: this.running,
      uptime: this.stats.startedAt ? Date.now() - this.stats.startedAt : 0,
      pendingFeedback: this._pendingFeedback.length,
      intervals: this.intervals,
      ...this.stats,
    };
  }

  /**
   * Add feedback directly (for testing or manual submission)
   * @param {Object} feedback - Feedback data
   */
  addFeedback(feedback) {
    this._handleFeedbackReceived(feedback);
  }
}

/**
 * Create an AutomationExecutor instance
 *
 * @param {Object} options - Options
 * @returns {AutomationExecutor}
 */
export function createAutomationExecutor(options) {
  return new AutomationExecutor(options);
}

export default AutomationExecutor;
