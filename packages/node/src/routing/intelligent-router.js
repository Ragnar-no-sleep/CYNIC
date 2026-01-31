/**
 * Intelligent Router - Dog-Based Task Routing
 *
 * Routes tasks to the optimal dog (Sefira) based on:
 * - Task type classification
 * - Dog capability matching
 * - Historical performance
 *
 * "Each dog has its scent" - κυνικός
 *
 * @module @cynic/node/routing/intelligent-router
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';
import { TaskDescriptor, createTaskDescriptor, TaskType, ComplexityLevel, RiskLevel } from './task-descriptor.js';
import { DogCapabilityMatrix, getDogCapabilityMatrix, DogId, DOG_CAPABILITIES } from './dog-capabilities.js';

/**
 * Routing decision with confidence
 */
export class RoutingDecision {
  /**
   * @param {Object} options
   * @param {string} options.dogId - Selected dog ID
   * @param {number} options.confidence - Decision confidence (0-1, max φ⁻¹)
   * @param {TaskDescriptor} options.task - Task descriptor
   * @param {Array} options.candidates - Candidate dogs considered
   * @param {string} options.reason - Human-readable reason
   */
  constructor(options) {
    this.dogId = options.dogId;
    this.confidence = Math.min(options.confidence, PHI_INV);
    this.task = options.task;
    this.candidates = options.candidates || [];
    this.reason = options.reason || '';
    this.timestamp = Date.now();
    this.blocked = false;
    this.escalated = false;
  }

  /**
   * Get dog capability info
   * @returns {Object|null}
   */
  getDogInfo() {
    return DOG_CAPABILITIES[this.dogId] || null;
  }

  /**
   * Check if decision is high confidence
   * @returns {boolean}
   */
  isHighConfidence() {
    return this.confidence >= PHI_INV_2;
  }

  /**
   * Serialize for logging
   * @returns {Object}
   */
  toJSON() {
    const info = this.getDogInfo();
    return {
      dogId: this.dogId,
      dogName: info?.name,
      dogEmoji: info?.emoji,
      confidence: Math.round(this.confidence * 1000) / 1000,
      taskType: this.task.primaryType,
      complexity: this.task.complexity,
      risk: this.task.risk,
      candidateCount: this.candidates.length,
      reason: this.reason,
      blocked: this.blocked,
      escalated: this.escalated,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Intelligent Router - Routes tasks to optimal dogs
 */
export class IntelligentRouter extends EventEmitter {
  /**
   * @param {Object} [options]
   * @param {DogCapabilityMatrix} [options.capabilityMatrix] - Custom matrix
   * @param {Object} [options.handlers] - Dog handlers by ID
   * @param {boolean} [options.learnFromOutcomes=true] - Enable learning
   */
  constructor(options = {}) {
    super();

    this.matrix = options.capabilityMatrix || getDogCapabilityMatrix();
    this.handlers = new Map();
    this.learnFromOutcomes = options.learnFromOutcomes !== false;

    // Register provided handlers
    if (options.handlers) {
      for (const [dogId, handler] of Object.entries(options.handlers)) {
        this.registerHandler(dogId, handler);
      }
    }

    // Statistics
    this.stats = {
      routed: 0,
      byDog: {},
      blocked: 0,
      escalated: 0,
      avgConfidence: 0,
      successRate: 0,
      outcomes: { success: 0, failure: 0 },
    };

    // Initialize dog stats
    for (const dogId of Object.values(DogId)) {
      this.stats.byDog[dogId] = 0;
    }

    // Recent decisions for learning
    this._recentDecisions = [];
    this._maxRecentDecisions = 100;
  }

  /**
   * Route a task to the optimal dog
   *
   * @param {string|TaskDescriptor} input - Task input or descriptor
   * @param {Object} [context] - Additional context
   * @returns {Promise<RoutingDecision>}
   */
  async route(input, context = {}) {
    // Create task descriptor if needed
    const task = input instanceof TaskDescriptor
      ? input
      : createTaskDescriptor(input, context);

    this.emit('route:start', { task: task.toJSON() });

    // Find best dogs
    const candidates = this.matrix.findBestDogs(task, 5);

    if (candidates.length === 0) {
      // Fallback to CYNIC (Keter) for unknown tasks
      return this._createDecision({
        dogId: DogId.CYNIC,
        confidence: PHI_INV_2,
        task,
        candidates: [],
        reason: 'No matching dog, escalating to CYNIC',
        escalated: true,
      });
    }

    // Select best candidate
    let selectedDog = candidates[0];
    let reason = `Best match for ${task.primaryType}`;

    // Check for security escalation
    if (task.risk === RiskLevel.CRITICAL || task.risk === RiskLevel.HIGH) {
      const guardian = candidates.find(c => c.dogId === DogId.GUARDIAN);
      if (guardian) {
        selectedDog = guardian;
        reason = `Security-sensitive task routed to Guardian`;
      } else if (selectedDog.cap.canBlock === false) {
        // Escalate to CYNIC for high-risk without blocking capability
        return this._createDecision({
          dogId: DogId.CYNIC,
          confidence: selectedDog.score * 0.8,
          task,
          candidates,
          reason: 'High-risk task escalated to CYNIC for oversight',
          escalated: true,
        });
      }
    }

    // Check if selected dog has handler
    if (!this.handlers.has(selectedDog.dogId)) {
      // Find first candidate with handler
      const withHandler = candidates.find(c => this.handlers.has(c.dogId));
      if (withHandler) {
        selectedDog = withHandler;
        reason += ' (adjusted for handler availability)';
      }
    }

    return this._createDecision({
      dogId: selectedDog.dogId,
      confidence: selectedDog.score,
      task,
      candidates,
      reason,
    });
  }

  /**
   * Route and execute task
   *
   * @param {string|TaskDescriptor} input - Task input
   * @param {Object} [context] - Context
   * @returns {Promise<Object>} Result with routing info
   */
  async routeAndExecute(input, context = {}) {
    const decision = await this.route(input, context);

    this.emit('route:decided', { decision: decision.toJSON() });

    const handler = this.handlers.get(decision.dogId);
    if (!handler) {
      this.emit('route:no_handler', { dogId: decision.dogId });
      return {
        success: false,
        error: `No handler for dog: ${decision.dogId}`,
        decision,
      };
    }

    const startTime = performance.now();
    let result;
    let success = true;

    try {
      result = await handler(decision.task, context, decision);
    } catch (err) {
      success = false;
      result = { error: err.message };
      this.emit('route:error', { dogId: decision.dogId, error: err });

      // Try escalation to CYNIC
      if (decision.dogId !== DogId.CYNIC && this.handlers.has(DogId.CYNIC)) {
        try {
          result = await this.handlers.get(DogId.CYNIC)(decision.task, context, decision);
          success = true;
          decision.escalated = true;
          this.stats.escalated++;
          this.emit('route:escalated', { from: decision.dogId, to: DogId.CYNIC });
        } catch (escalationErr) {
          result = { error: escalationErr.message, originalError: err.message };
        }
      }
    }

    const elapsed = performance.now() - startTime;

    // Record outcome for learning
    if (this.learnFromOutcomes) {
      this.recordOutcome(decision, success);
    }

    this.emit('route:completed', {
      dogId: decision.dogId,
      success,
      latency: elapsed,
      escalated: decision.escalated,
    });

    return {
      success,
      result,
      decision,
      latency: elapsed,
    };
  }

  /**
   * Register a handler for a dog
   *
   * @param {string} dogId - Dog ID
   * @param {Function} handler - Handler function(task, context, decision)
   */
  registerHandler(dogId, handler) {
    if (!Object.values(DogId).includes(dogId)) {
      throw new Error(`Invalid dog ID: ${dogId}`);
    }
    this.handlers.set(dogId, handler);
    this.emit('handler:registered', { dogId });
  }

  /**
   * Unregister a handler
   *
   * @param {string} dogId - Dog ID
   */
  unregisterHandler(dogId) {
    this.handlers.delete(dogId);
    this.emit('handler:unregistered', { dogId });
  }

  /**
   * Record outcome for learning
   *
   * @param {RoutingDecision} decision - Routing decision
   * @param {boolean} success - Whether task succeeded
   */
  recordOutcome(decision, success) {
    this.matrix.recordOutcome(decision.dogId, decision.task.primaryType, success);

    // Update stats
    if (success) {
      this.stats.outcomes.success++;
    } else {
      this.stats.outcomes.failure++;
    }

    const total = this.stats.outcomes.success + this.stats.outcomes.failure;
    this.stats.successRate = total > 0
      ? this.stats.outcomes.success / total
      : 0;

    // Store recent decision
    this._recentDecisions.push({
      decision: decision.toJSON(),
      success,
      timestamp: Date.now(),
    });

    if (this._recentDecisions.length > this._maxRecentDecisions) {
      this._recentDecisions.shift();
    }

    this.emit('outcome:recorded', {
      dogId: decision.dogId,
      success,
      successRate: this.stats.successRate,
    });
  }

  /**
   * Get recommendation for task type
   *
   * @param {string} taskType - Task type
   * @returns {Array<{dogId: string, affinity: number}>}
   */
  getRecommendation(taskType) {
    return this.matrix.getDogsForTaskType(taskType);
  }

  /**
   * Get router statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      handlersRegistered: this.handlers.size,
      matrixWeights: this.matrix.exportWeights(),
      recentDecisions: this._recentDecisions.slice(-10),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      routed: 0,
      byDog: {},
      blocked: 0,
      escalated: 0,
      avgConfidence: 0,
      successRate: 0,
      outcomes: { success: 0, failure: 0 },
    };

    for (const dogId of Object.values(DogId)) {
      this.stats.byDog[dogId] = 0;
    }

    this._recentDecisions = [];
  }

  /**
   * Export learned weights for persistence
   * @returns {Object}
   */
  exportWeights() {
    return this.matrix.exportWeights();
  }

  /**
   * Import learned weights
   * @param {Object} weights
   */
  importWeights(weights) {
    this.matrix.importWeights(weights);
  }

  /**
   * Create routing decision and update stats
   * @private
   */
  _createDecision(options) {
    const decision = new RoutingDecision(options);

    if (options.escalated) {
      decision.escalated = true;
      this.stats.escalated++;
    }

    if (options.blocked) {
      decision.blocked = true;
      this.stats.blocked++;
    }

    // Update stats
    this.stats.routed++;
    this.stats.byDog[decision.dogId] = (this.stats.byDog[decision.dogId] || 0) + 1;
    this.stats.avgConfidence =
      (this.stats.avgConfidence * (this.stats.routed - 1) + decision.confidence) /
      this.stats.routed;

    return decision;
  }
}

/**
 * Create intelligent router
 *
 * @param {Object} [options]
 * @returns {IntelligentRouter}
 */
export function createIntelligentRouter(options = {}) {
  return new IntelligentRouter(options);
}

// Singleton
let _instance = null;

/**
 * Get singleton router
 * @returns {IntelligentRouter}
 */
export function getIntelligentRouter() {
  if (!_instance) {
    _instance = createIntelligentRouter();
  }
  return _instance;
}

export {
  TaskDescriptor,
  createTaskDescriptor,
  TaskType,
  ComplexityLevel,
  RiskLevel,
  DogCapabilityMatrix,
  getDogCapabilityMatrix,
  DogId,
  DOG_CAPABILITIES,
};

export default IntelligentRouter;
