#!/usr/bin/env node
/**
 * CYNIC Decision Engine - Unified Decision Coordinator
 *
 * "φ distrusts φ" - All decisions flow through here
 *
 * This engine coordinates decision-making across:
 * - Local pattern matching
 * - KETER orchestration
 * - Library evaluations
 * - Trust level checks
 *
 * @module decision-engine
 */

'use strict';

const path = require('path');
const constants = require('./decision-constants.cjs');

// =============================================================================
// DECISION CONTEXT
// =============================================================================

/**
 * @typedef {object} DecisionContext
 * @property {string} event - Event type: 'user_prompt', 'pre_tool', 'post_tool', 'session_start', 'session_end', 'stop'
 * @property {string} action - Specific action being decided
 * @property {object} user - User context { userId, eScore, trustLevel }
 * @property {object} metadata - Event-specific data
 * @property {string} source - Hook/module requesting decision
 * @property {number} timestamp - When decision was requested
 */

/**
 * Create a standard decision context
 * @param {object} params - Context parameters
 * @returns {DecisionContext}
 */
function createContext(params) {
  const { event, action, user = {}, metadata = {}, source = 'unknown' } = params;

  // Ensure user has trust level
  const eScore = user.eScore || 0;
  const trustLevel = user.trustLevel || constants.getTrustLevel(eScore);

  return {
    event,
    action,
    user: {
      userId: user.userId || 'unknown',
      eScore,
      trustLevel,
    },
    metadata,
    source,
    timestamp: Date.now(),
  };
}

// =============================================================================
// DECISION RESULT
// =============================================================================

/**
 * @typedef {object} DecisionResult
 * @property {boolean} allow - Should the action proceed?
 * @property {string} level - Decision level: 'block', 'warn', 'silent', 'allow'
 * @property {number} confidence - How sure are we (0-1, max 0.618)?
 * @property {string} reasoning - Why this decision?
 * @property {string[]} sources - Which systems contributed?
 * @property {number} priority - Output priority (lower = higher priority)
 * @property {object} auditTrail - Full decision trace
 */

/**
 * Create a standard decision result
 * @param {object} params - Result parameters
 * @returns {DecisionResult}
 */
function createResult(params) {
  const {
    allow = true,
    level = 'allow',
    confidence = constants.MAX_CONFIDENCE,
    reasoning = '',
    sources = [],
    priority = 100,
    metadata = {},
  } = params;

  // Enforce max confidence
  const clampedConfidence = Math.min(confidence, constants.MAX_CONFIDENCE);

  return {
    allow,
    level,
    confidence: clampedConfidence,
    reasoning,
    sources,
    priority,
    auditTrail: {
      timestamp: Date.now(),
      rawConfidence: confidence,
      clampedConfidence,
      metadata,
    },
  };
}

// =============================================================================
// DECISION EVALUATORS
// =============================================================================

/**
 * Registry of decision evaluators
 * Each evaluator handles a specific aspect of decision making
 */
const evaluators = new Map();

/**
 * Register a decision evaluator
 * @param {string} name - Evaluator name
 * @param {Function} evaluator - Async function (context) => partial result
 */
function registerEvaluator(name, evaluator) {
  evaluators.set(name, evaluator);
}

/**
 * Default evaluators
 */

// Trust Level Evaluator
registerEvaluator('trust_level', async (context) => {
  const { user } = context;
  const trustLevel = user.trustLevel;

  if (!trustLevel) {
    return { confidence: 0.3, reasoning: 'Unknown trust level' };
  }

  // Higher trust = more permissive
  const confidenceMap = {
    GUARDIAN: 0.618,
    STEWARD: 0.5,
    BUILDER: 0.382,
    CONTRIBUTOR: 0.25,
    OBSERVER: 0.15,
  };

  return {
    confidence: confidenceMap[trustLevel.name] || 0.15,
    reasoning: `Trust level: ${trustLevel.name}`,
    metadata: { trustLevel: trustLevel.name, eScore: user.eScore },
  };
});

// Severity Evaluator
registerEvaluator('severity', async (context) => {
  const { metadata } = context;
  const severity = metadata.severity || metadata.actionRisk || 'low';

  const severityLevels = {
    critical: { allow: false, level: 'block', confidence: 0.618 },
    high: { allow: true, level: 'warn', confidence: 0.5 },
    medium: { allow: true, level: 'silent', confidence: 0.382 },
    low: { allow: true, level: 'allow', confidence: 0.236 },
  };

  const result = severityLevels[severity] || severityLevels.low;
  return {
    ...result,
    reasoning: `Severity: ${severity}`,
  };
});

// Length-based Evaluator (for prompts)
registerEvaluator('length', async (context) => {
  const { metadata, action } = context;
  const length = metadata.promptLength || metadata.length || 0;

  // Check minimum length requirements
  const thresholds = {
    context_injection: constants.LENGTH.MIN_PROMPT,
    elenchus: constants.LENGTH.ELENCHUS_MIN,
    ti_esti: constants.LENGTH.TI_ESTI_MIN,
    definition: constants.LENGTH.DEFINITION_MIN,
    fallacy: constants.LENGTH.FALLACY_MIN,
    role_reversal: constants.LENGTH.ROLE_REVERSAL_MIN,
    hypothesis: constants.LENGTH.HYPOTHESIS_MIN,
  };

  const minLength = thresholds[action] || 0;

  if (length < minLength) {
    return {
      allow: false,
      level: 'silent',
      confidence: 0.618,
      reasoning: `Content too short: ${length} < ${minLength}`,
    };
  }

  return {
    allow: true,
    level: 'allow',
    confidence: 0.382,
    reasoning: `Length OK: ${length} >= ${minLength}`,
  };
});

// Probability Gate Evaluator
registerEvaluator('probability', async (context) => {
  const { action } = context;

  // Probability gates for various features
  const gates = {
    elenchus: constants.PROBABILITY.ELENCHUS,
    chria: constants.PROBABILITY.CHRIA_WISDOM,
    physis: constants.PROBABILITY.PHYSIS_CHALLENGE,
    role_reversal: constants.PROBABILITY.ROLE_REVERSAL,
    deletion_celebrate: constants.PROBABILITY.DELETION_CELEBRATE,
  };

  const probability = gates[action];
  if (probability === undefined) {
    return { allow: true, reasoning: 'No probability gate for action' };
  }

  const roll = Math.random();
  const passed = roll < probability;

  return {
    allow: passed,
    level: passed ? 'allow' : 'silent',
    confidence: constants.MIN_DOUBT,
    reasoning: `Probability gate: ${roll.toFixed(3)} ${passed ? '<' : '>='} ${probability}`,
    metadata: { roll, threshold: probability },
  };
});

// =============================================================================
// ORCHESTRATION INTEGRATION
// =============================================================================

let orchestrationCallback = null;

/**
 * Set the orchestration callback for KETER integration
 * @param {Function} callback - Async function (context) => orchestration result
 */
function setOrchestrationCallback(callback) {
  orchestrationCallback = callback;
}

/**
 * Get orchestration decision from KETER
 * @param {DecisionContext} context
 * @returns {object} Orchestration result or fallback
 */
async function getOrchestration(context) {
  if (!orchestrationCallback) {
    return {
      routing: { sefirah: 'KETER', domain: 'general' },
      intervention: { level: 'silent', actionRisk: 'low' },
    };
  }

  try {
    return await orchestrationCallback(context);
  } catch (error) {
    // Fallback to permissive defaults
    return {
      routing: { sefirah: 'KETER', domain: 'general' },
      intervention: { level: 'silent', actionRisk: 'low' },
      fallback: true,
      error: error.message,
    };
  }
}

// =============================================================================
// MAIN EVALUATION
// =============================================================================

/**
 * Evaluate a decision context through all registered evaluators
 * @param {DecisionContext} context - Decision context
 * @param {object} options - Evaluation options
 * @returns {Promise<DecisionResult>}
 */
async function evaluate(context, options = {}) {
  const { includeOrchestration = true, evaluatorNames = null } = options;

  const results = [];
  const sources = [];

  // Run selected evaluators (or all if not specified)
  const evalNames = evaluatorNames || Array.from(evaluators.keys());

  for (const name of evalNames) {
    const evaluator = evaluators.get(name);
    if (!evaluator) continue;

    try {
      const result = await evaluator(context);
      results.push({ name, ...result });
      sources.push(name);
    } catch (error) {
      results.push({ name, error: error.message, confidence: 0 });
    }
  }

  // Get orchestration if requested
  let orchestration = null;
  if (includeOrchestration) {
    orchestration = await getOrchestration(context);
    sources.push('orchestration');

    // Add orchestration intervention to results
    if (orchestration.intervention) {
      results.push({
        name: 'orchestration',
        allow: orchestration.intervention.level !== 'block',
        level: orchestration.intervention.level,
        confidence: 0.5,
        reasoning: orchestration.intervention.reason || 'KETER decision',
        metadata: orchestration,
      });
    }
  }

  // Aggregate results
  return aggregateResults(results, sources, context);
}

/**
 * Aggregate multiple evaluator results into a single decision
 * @param {object[]} results - Array of evaluator results
 * @param {string[]} sources - Source names
 * @param {DecisionContext} context - Original context
 * @returns {DecisionResult}
 */
function aggregateResults(results, sources, context) {
  // Find any blocking decisions
  const blockingResults = results.filter(r => r.level === 'block' || r.allow === false);

  if (blockingResults.length > 0) {
    // Highest confidence blocking decision wins
    const blocker = blockingResults.reduce((a, b) =>
      (b.confidence || 0) > (a.confidence || 0) ? b : a
    );

    return createResult({
      allow: false,
      level: 'block',
      confidence: blocker.confidence,
      reasoning: blocker.reasoning,
      sources,
      priority: 0,
      metadata: { blocker, allResults: results },
    });
  }

  // Find warning decisions
  const warningResults = results.filter(r => r.level === 'warn');

  if (warningResults.length > 0) {
    const warner = warningResults[0];
    return createResult({
      allow: true,
      level: 'warn',
      confidence: warner.confidence || 0.382,
      reasoning: warner.reasoning,
      sources,
      priority: 10,
      metadata: { warner, allResults: results },
    });
  }

  // Default: allow with aggregated confidence
  const avgConfidence = results.length > 0
    ? results.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / results.length
    : 0.382;

  return createResult({
    allow: true,
    level: 'allow',
    confidence: avgConfidence,
    reasoning: 'All evaluators passed',
    sources,
    priority: 100,
    metadata: { allResults: results },
  });
}

// =============================================================================
// QUICK DECISION HELPERS
// =============================================================================

/**
 * Quick check: should this feature be activated?
 * Combines length check + probability gate + trust level
 * @param {string} feature - Feature name
 * @param {object} params - Check parameters
 * @returns {Promise<boolean>}
 */
async function shouldActivate(feature, params = {}) {
  const context = createContext({
    event: 'feature_check',
    action: feature,
    user: params.user || {},
    metadata: { promptLength: params.length || 0 },
    source: params.source || 'quick_check',
  });

  const result = await evaluate(context, {
    includeOrchestration: false,
    evaluatorNames: ['length', 'probability', 'trust_level'],
  });

  return result.allow;
}

/**
 * Check if user has sufficient trust for an action
 * @param {object} user - User object with eScore
 * @param {string} minTrust - Minimum trust level name
 * @returns {boolean}
 */
function hasSufficientTrust(user, minTrust) {
  const trustLevel = constants.getTrustLevel(user.eScore || 0);
  const levels = ['OBSERVER', 'CONTRIBUTOR', 'BUILDER', 'STEWARD', 'GUARDIAN'];
  const userIdx = levels.indexOf(trustLevel.name);
  const minIdx = levels.indexOf(minTrust);
  return userIdx >= minIdx;
}

/**
 * Get maximum severity from issues array
 * @param {object[]} issues - Array with severity property
 * @returns {string}
 */
function getMaxSeverity(issues) {
  const severities = issues.map(i => i.severity).filter(Boolean);
  return constants.maxSeverity(severities);
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

const auditLog = [];
const MAX_AUDIT_SIZE = 1000;

/**
 * Log a decision for audit purposes
 * @param {DecisionContext} context
 * @param {DecisionResult} result
 */
function logDecision(context, result) {
  const entry = {
    timestamp: Date.now(),
    event: context.event,
    action: context.action,
    userId: context.user?.userId,
    decision: result.level,
    confidence: result.confidence,
    reasoning: result.reasoning,
    sources: result.sources,
  };

  auditLog.push(entry);

  // Trim if too large
  if (auditLog.length > MAX_AUDIT_SIZE) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_SIZE);
  }
}

/**
 * Get recent audit entries
 * @param {number} limit - Max entries to return
 * @returns {object[]}
 */
function getAuditLog(limit = 100) {
  return auditLog.slice(-limit);
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Context/Result creation
  createContext,
  createResult,

  // Main evaluation
  evaluate,

  // Evaluator management
  registerEvaluator,

  // Orchestration
  setOrchestrationCallback,
  getOrchestration,

  // Quick helpers
  shouldActivate,
  hasSufficientTrust,
  getMaxSeverity,

  // Audit
  logDecision,
  getAuditLog,

  // Re-export constants
  constants,
};
