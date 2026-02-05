/**
 * Event Listeners - Closing Data Loops (AXE 2: PERSIST)
 *
 * "Le chien n'oublie jamais" - CYNIC persists everything.
 *
 * This module subscribes to key events and persists data to PostgreSQL.
 * It closes the "black holes" where data was emitted but never stored.
 *
 * BLACK HOLES CLOSED:
 * - JUDGMENT_CREATED: Now persisted to judgments table
 * - feedback:processed: Now creates feedback record + increments session counter
 * - SESSION_ENDED: Now consolidates SharedMemory
 * - DOG_EVENT: Now persisted to dog_events table (AXE 2+)
 * - CONSENSUS_COMPLETED: Now persisted to consensus_votes table (AXE 2+)
 * - DogSignal.*: Now persisted to dog_signals table (AXE 2+)
 * - CYNIC_STATE: Now sampled to collective_snapshots table (AXE 2+)
 *
 * @module @cynic/node/services/event-listeners
 */

'use strict';

import { createLogger, globalEventBus, EventType } from '@cynic/core';
import { DogSignal } from '../agents/collective/ambient-consensus.js';

const log = createLogger('EventListeners');

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

/** @type {Function[]} Unsubscribe functions */
let _unsubscribers = [];

/** @type {boolean} Are listeners started? */
let _started = false;

/** @type {Object} Retry configuration */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 2000,
  backoffMultiplier: 2,
};

/** @type {Object} Statistics */
const _stats = {
  judgmentsPersisted: 0,
  judgmentsFailed: 0,
  feedbackPersisted: 0,
  feedbackFailed: 0,
  sessionCountersIncremented: 0,
  sessionEndConsolidations: 0,
  dogEventsPersisted: 0,
  dogEventsFailed: 0,
  consensusPersisted: 0,
  consensusFailed: 0,
  dogSignalsPersisted: 0,
  dogSignalsFailed: 0,
  snapshotsPersisted: 0,
  snapshotsFailed: 0,
  startedAt: null,
};

/** @type {number} Counter for sampling CYNIC_STATE emissions */
let _cynicStateCounter = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Retry an async operation with exponential backoff
 * "φ persists" - we don't give up easily
 *
 * @param {Function} operation - Async function to retry
 * @param {string} operationName - Name for logging
 * @param {Object} [options] - Retry options
 * @returns {Promise<any>} Operation result
 * @throws {Error} If all retries exhausted
 */
async function withRetry(operation, operationName, options = {}) {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    initialDelayMs = RETRY_CONFIG.initialDelayMs,
    maxDelayMs = RETRY_CONFIG.maxDelayMs,
    backoffMultiplier = RETRY_CONFIG.backoffMultiplier,
  } = options;

  let lastError;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      log.warn(`${operationName} failed (attempt ${attempt}/${maxRetries})`, {
        error: err.message,
        nextRetryMs: attempt < maxRetries ? delay : null,
      });

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      }
    }
  }

  // All retries exhausted - throw loudly (FAIL LOUDLY principle)
  log.error(`${operationName} FAILED after ${maxRetries} retries`, {
    error: lastError.message,
  });
  throw lastError;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JUDGMENT PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle JUDGMENT_CREATED event
 * Persists judgment to PostgreSQL judgments table
 *
 * @param {Object} event - CYNIC Event
 * @param {Object} repositories - Persistence repositories
 * @param {Object} context - Listener context (sessionId, userId)
 */
async function handleJudgmentCreated(event, repositories, context) {
  if (!repositories?.judgments) {
    log.debug('No judgments repository - skipping persistence');
    return;
  }

  const { id, payload, source, timestamp } = event;
  const {
    qScore,
    verdict,
    dimensions,
    dimensionScores,
    axiomScores,
    itemType,
    confidence,
    globalScore,
    weaknesses,
    item,
    context: judgmentContext,
    reasoningPath,
  } = payload || {};

  // Don't persist if no meaningful data
  if (qScore === undefined && !verdict) {
    log.debug('Judgment event has no score/verdict - skipping', { eventId: id });
    return;
  }

  try {
    await withRetry(async () => {
      const saved = await repositories.judgments.create({
        id: id, // Preserve event ID for PoJ traceability
        judgmentId: id,
        qScore,
        q_score: qScore,
        globalScore: globalScore || qScore,
        global_score: globalScore || qScore,
        verdict,
        dimensions: dimensionScores || dimensions,
        dimensionScores: dimensionScores || dimensions,
        axiomScores,
        axiom_scores: axiomScores,
        weaknesses: weaknesses || [],
        itemType,
        item: item || { type: itemType },
        confidence,
        sessionId: context.sessionId,
        userId: context.userId,
        context: judgmentContext || {
          source: source || 'event-listener',
          timestamp: timestamp || Date.now(),
        },
        reasoningPath: reasoningPath || [],
        reasoning_path: reasoningPath || [],
      });
      log.debug('Judgment persisted', {
        judgmentId: saved.judgment_id,
        qScore,
        verdict,
      });
      return saved;
    }, `Persist judgment ${id}`);

    _stats.judgmentsPersisted++;

    // Also increment session judgment counter
    if (context.sessionId && repositories.sessions) {
      try {
        await repositories.sessions.increment(context.sessionId, 'judgment_count');
        _stats.sessionCountersIncremented++;
      } catch (err) {
        // Non-fatal - session might not exist
        log.debug('Session counter increment failed', { error: err.message });
      }
    }
  } catch (err) {
    _stats.judgmentsFailed++;
    // Already logged by withRetry - emit error event for observability
    globalEventBus.publish(EventType.COMPONENT_ERROR, {
      component: 'EventListeners',
      operation: 'handleJudgmentCreated',
      error: err.message,
      eventId: id,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle feedback:processed event from FeedbackProcessor
 * Persists feedback to PostgreSQL and increments session counter
 *
 * @param {Object} data - Feedback processing result
 * @param {Object} repositories - Persistence repositories
 * @param {Object} context - Listener context (sessionId, userId)
 * @param {Object} [feedbackData] - Original feedback data (if available)
 */
async function handleFeedbackProcessed(data, repositories, context, feedbackData = {}) {
  if (!repositories?.feedback) {
    log.debug('No feedback repository - skipping persistence');
    return;
  }

  const { scoreDelta, queueSize, immediateAdjustments } = data || {};

  try {
    await withRetry(async () => {
      const saved = await repositories.feedback.create({
        judgmentId: feedbackData.judgmentId || null, // Supports orphan feedback
        userId: context.userId,
        outcome: feedbackData.outcome || 'partial',
        actualScore: feedbackData.actualScore,
        reason: feedbackData.reason || `Score delta: ${scoreDelta}`,
        sourceType: feedbackData.source || 'system',
        sourceContext: {
          scoreDelta,
          queueSize,
          immediateAdjustments,
          ...feedbackData.sourceContext,
        },
      });
      log.debug('Feedback persisted', {
        feedbackId: saved.id,
        outcome: saved.outcome,
        judgmentId: saved.judgment_id,
      });
      return saved;
    }, 'Persist feedback');

    _stats.feedbackPersisted++;

    // Increment session feedback counter
    if (context.sessionId && repositories.sessions) {
      try {
        await repositories.sessions.increment(context.sessionId, 'feedback_count');
        _stats.sessionCountersIncremented++;
      } catch (err) {
        log.debug('Session feedback counter increment failed', { error: err.message });
      }
    }
  } catch (err) {
    _stats.feedbackFailed++;
    globalEventBus.publish(EventType.COMPONENT_ERROR, {
      component: 'EventListeners',
      operation: 'handleFeedbackProcessed',
      error: err.message,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION END CONSOLIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle SESSION_ENDED event
 * Consolidates SharedMemory patterns and saves state
 *
 * @param {Object} event - CYNIC Event
 * @param {Object} dependencies - Dependencies
 * @param {Object} dependencies.sharedMemory - SharedMemory instance
 * @param {Object} dependencies.persistence - Persistence manager
 * @param {Function} [dependencies.saveState] - saveState function from collective-singleton
 */
async function handleSessionEnded(event, dependencies) {
  const { sharedMemory, persistence, saveState } = dependencies;

  log.info('Session ended - consolidating memory', {
    sessionId: event.payload?.sessionId,
    duration: event.payload?.duration,
  });

  try {
    // 1. Save SharedMemory state
    if (sharedMemory?.save) {
      await withRetry(
        () => sharedMemory.save(),
        'SharedMemory save'
      );
      log.debug('SharedMemory saved');
    }

    // 2. Call saveState if provided (saves patterns, Q-Learning, etc.)
    if (saveState && persistence) {
      await withRetry(
        () => saveState(persistence),
        'Collective state save'
      );
      log.debug('Collective state saved');
    }

    // 3. Run memory consolidation if available
    if (sharedMemory?.consolidate) {
      const consolidated = await sharedMemory.consolidate();
      log.debug('Memory consolidated', { consolidated });
    }

    _stats.sessionEndConsolidations++;
    log.info('Session end consolidation complete');
  } catch (err) {
    log.error('Session end consolidation failed', { error: err.message });
    globalEventBus.publish(EventType.COMPONENT_ERROR, {
      component: 'EventListeners',
      operation: 'handleSessionEnded',
      error: err.message,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOG EVENT PERSISTENCE (AXE 2+)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle DOG_EVENT - individual dog invocations, blocks, warnings
 * Persists to dog_events table
 */
async function handleDogEvent(event, persistence, context) {
  const { dog, eventType, stats, health, details } = event.payload || {};
  if (!dog || !eventType) return;

  try {
    await withRetry(async () => {
      await persistence.query(
        `INSERT INTO dog_events (dog_name, event_type, stats, health, details, session_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [dog, eventType, JSON.stringify(stats || {}), health, JSON.stringify(details || {}), context.sessionId]
      );
    }, `Persist dog event ${dog}:${eventType}`);
    _stats.dogEventsPersisted++;
  } catch (err) {
    _stats.dogEventsFailed++;
    globalEventBus.publish(EventType.COMPONENT_ERROR, {
      component: 'EventListeners',
      operation: 'handleDogEvent',
      error: err.message,
    });
  }
}

/**
 * Handle CONSENSUS_COMPLETED - consensus results with vote breakdown
 * Persists to consensus_votes table
 */
async function handleConsensusCompleted(event, persistence, context) {
  const { consensusId, topic, approved, agreement, guardianVeto, votes, stats: voteStats, reason } = event.payload || {};
  if (!consensusId) return;

  try {
    await withRetry(async () => {
      await persistence.query(
        `INSERT INTO consensus_votes (consensus_id, topic, approved, agreement, guardian_veto, votes, stats, reason, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [consensusId, topic, approved, agreement, guardianVeto || false, JSON.stringify(votes || {}), JSON.stringify(voteStats || {}), reason, context.sessionId]
      );
    }, `Persist consensus ${consensusId}`);
    _stats.consensusPersisted++;
  } catch (err) {
    _stats.consensusFailed++;
    globalEventBus.publish(EventType.COMPONENT_ERROR, {
      component: 'EventListeners',
      operation: 'handleConsensusCompleted',
      error: err.message,
    });
  }
}

/**
 * Handle DogSignal events - inter-dog communication
 * Persists to dog_signals table
 */
async function handleDogSignal(event, persistence, context) {
  const signalType = event.type;
  const { source, ...payload } = event.payload || {};

  try {
    await withRetry(async () => {
      await persistence.query(
        `INSERT INTO dog_signals (signal_type, source_dog, payload, session_id)
         VALUES ($1, $2, $3, $4)`,
        [signalType, source || null, JSON.stringify(payload), context.sessionId]
      );
    }, `Persist dog signal ${signalType}`);
    _stats.dogSignalsPersisted++;
  } catch (err) {
    _stats.dogSignalsFailed++;
    // Non-critical, don't emit error event for high-frequency signals
    log.debug('Dog signal persistence failed', { signalType, error: err.message });
  }
}

/**
 * Handle CYNIC_STATE - periodic collective health snapshots
 * Sampled: only persists every 5th emission to avoid table bloat
 */
async function handleCynicState(event, persistence, context) {
  _cynicStateCounter++;
  if (_cynicStateCounter % 5 !== 0) return; // Sample every 5th

  const { collective, memory } = event.payload || {};
  if (!collective) return;

  try {
    await withRetry(async () => {
      await persistence.query(
        `INSERT INTO collective_snapshots (active_dogs, dog_count, average_health, health_rating, pattern_count, memory_load, memory_freshness, snapshot_data, session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          collective.activeDogs, collective.dogCount, collective.averageHealth,
          collective.healthRating, memory?.patternCount || 0, memory?.load || 0,
          memory?.freshness || 0, JSON.stringify(event.payload), context.sessionId,
        ]
      );
    }, 'Persist collective snapshot');
    _stats.snapshotsPersisted++;
  } catch (err) {
    _stats.snapshotsFailed++;
    log.debug('Snapshot persistence failed', { error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start event listeners
 *
 * Subscribes to:
 * - JUDGMENT_CREATED (globalEventBus)
 * - SESSION_ENDED (globalEventBus)
 *
 * Also returns a function to wire FeedbackProcessor events.
 *
 * @param {Object} options - Configuration
 * @param {Object} options.persistence - PersistenceManager instance
 * @param {Object} options.repositories - Pre-created repositories (or will be created from persistence)
 * @param {Object} [options.sharedMemory] - SharedMemory instance
 * @param {Function} [options.saveState] - saveState function from collective-singleton
 * @param {string} [options.sessionId] - Current session ID
 * @param {string} [options.userId] - Current user ID
 * @returns {Object} Control object with wireFeedbackProcessor and stop functions
 */
export function startEventListeners(options = {}) {
  if (_started) {
    log.debug('Event listeners already started');
    return {
      wireFeedbackProcessor: () => {},
      stop: stopEventListeners,
      getStats: () => ({ ..._stats }),
    };
  }

  const {
    persistence,
    repositories: providedRepos,
    sharedMemory,
    saveState,
    sessionId,
    userId,
  } = options;

  // Get or create repositories
  let repositories = providedRepos;
  if (!repositories && persistence) {
    try {
      // Try to get repositories from persistence factory
      if (typeof persistence.getRepository === 'function') {
        repositories = {
          judgments: persistence.getRepository('judgments'),
          feedback: persistence.getRepository('feedback'),
          sessions: persistence.getRepository('sessions'),
        };
      } else if (persistence.repositories) {
        repositories = persistence.repositories;
      }
    } catch (err) {
      log.warn('Could not get repositories from persistence', { error: err.message });
    }
  }

  if (!repositories) {
    log.warn('No repositories available - event listeners will be no-ops');
    repositories = {};
  }

  const context = { sessionId, userId };

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscribe to JUDGMENT_CREATED
  // ─────────────────────────────────────────────────────────────────────────────
  const unsubJudgment = globalEventBus.subscribe(
    EventType.JUDGMENT_CREATED,
    (event) => {
      // Non-blocking - fire and forget with error handling
      handleJudgmentCreated(event, repositories, context).catch((err) => {
        log.error('Judgment handler threw unexpectedly', { error: err.message });
      });
    }
  );
  _unsubscribers.push(unsubJudgment);

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscribe to SESSION_ENDED
  // ─────────────────────────────────────────────────────────────────────────────
  const unsubSession = globalEventBus.subscribe(
    EventType.SESSION_ENDED,
    (event) => {
      handleSessionEnded(event, { sharedMemory, persistence, saveState }).catch((err) => {
        log.error('Session end handler threw unexpectedly', { error: err.message });
      });
    }
  );
  _unsubscribers.push(unsubSession);

  // ─────────────────────────────────────────────────────────────────────────────
  // Wire USER_FEEDBACK events (from hook feedback)
  // ─────────────────────────────────────────────────────────────────────────────
  const unsubUserFeedback = globalEventBus.subscribe(
    EventType.USER_FEEDBACK,
    (event) => {
      const feedbackData = event.payload || {};
      handleFeedbackProcessed(
        { scoreDelta: feedbackData.scoreDelta || 0 },
        repositories,
        context,
        feedbackData
      ).catch((err) => {
        log.error('User feedback handler threw unexpectedly', { error: err.message });
      });
    }
  );
  _unsubscribers.push(unsubUserFeedback);

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscribe to DOG_EVENT (AXE 2+)
  // ─────────────────────────────────────────────────────────────────────────────
  if (persistence?.query) {
    const unsubDogEvent = globalEventBus.subscribe(
      EventType.DOG_EVENT,
      (event) => {
        handleDogEvent(event, persistence, context).catch((err) => {
          log.error('Dog event handler threw unexpectedly', { error: err.message });
        });
      }
    );
    _unsubscribers.push(unsubDogEvent);

    // ─────────────────────────────────────────────────────────────────────────────
    // Subscribe to CONSENSUS_COMPLETED (AXE 2+)
    // ─────────────────────────────────────────────────────────────────────────────
    const unsubConsensus = globalEventBus.subscribe(
      EventType.CONSENSUS_COMPLETED,
      (event) => {
        handleConsensusCompleted(event, persistence, context).catch((err) => {
          log.error('Consensus handler threw unexpectedly', { error: err.message });
        });
      }
    );
    _unsubscribers.push(unsubConsensus);

    // ─────────────────────────────────────────────────────────────────────────────
    // Subscribe to DogSignal events (AXE 2+)
    // ─────────────────────────────────────────────────────────────────────────────
    for (const signalType of Object.values(DogSignal)) {
      const unsubSignal = globalEventBus.subscribe(
        signalType,
        (event) => {
          handleDogSignal(event, persistence, context).catch((err) => {
            log.debug('Dog signal handler error', { error: err.message });
          });
        }
      );
      _unsubscribers.push(unsubSignal);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Subscribe to CYNIC_STATE (AXE 2+ - sampled every 5th)
    // ─────────────────────────────────────────────────────────────────────────────
    const unsubCynicState = globalEventBus.subscribe(
      EventType.CYNIC_STATE,
      (event) => {
        handleCynicState(event, persistence, context).catch((err) => {
          log.debug('CYNIC state handler error', { error: err.message });
        });
      }
    );
    _unsubscribers.push(unsubCynicState);

    log.info('Dog collective event listeners wired (AXE 2+)');
  }

  _started = true;
  _stats.startedAt = Date.now();

  log.info('Event listeners started', {
    hasJudgmentsRepo: !!repositories.judgments,
    hasFeedbackRepo: !!repositories.feedback,
    hasSessionsRepo: !!repositories.sessions,
    hasSharedMemory: !!sharedMemory,
    hasPersistence: !!persistence?.query,
  });

  /**
   * Wire a FeedbackProcessor instance to persist its events
   *
   * @param {FeedbackProcessor} feedbackProcessor - FeedbackProcessor instance
   * @param {Object} [feedbackContext] - Additional context
   */
  function wireFeedbackProcessor(feedbackProcessor, feedbackContext = {}) {
    if (!feedbackProcessor) return;

    const mergedContext = { ...context, ...feedbackContext };

    // Listen to feedback-processed event
    const handler = (result) => {
      handleFeedbackProcessed(result, repositories, mergedContext, feedbackContext).catch(
        (err) => {
          log.error('FeedbackProcessor handler threw unexpectedly', { error: err.message });
        }
      );
    };

    feedbackProcessor.on('feedback-processed', handler);

    // Track for cleanup
    _unsubscribers.push(() => {
      feedbackProcessor.off('feedback-processed', handler);
    });

    log.debug('FeedbackProcessor wired for persistence');
  }

  return {
    wireFeedbackProcessor,
    stop: stopEventListeners,
    getStats: () => ({ ..._stats }),
    updateContext: (updates) => {
      Object.assign(context, updates);
    },
  };
}

/**
 * Stop all event listeners
 */
export function stopEventListeners() {
  for (const unsub of _unsubscribers) {
    try {
      if (typeof unsub === 'function') {
        unsub();
      }
    } catch (err) {
      log.debug('Unsubscribe error', { error: err.message });
    }
  }

  _unsubscribers = [];
  _started = false;

  log.info('Event listeners stopped', { stats: _stats });
}

/**
 * Check if listeners are running
 * @returns {boolean}
 */
export function isRunning() {
  return _started;
}

/**
 * Get listener statistics
 * @returns {Object}
 */
export function getListenerStats() {
  return { ..._stats, running: _started };
}

export default {
  startEventListeners,
  stopEventListeners,
  isRunning,
  getListenerStats,
};
