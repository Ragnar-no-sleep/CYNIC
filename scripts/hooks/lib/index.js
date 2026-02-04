/**
 * CYNIC Hooks Library
 *
 * Shared utilities for CYNIC hooks.
 *
 * @module scripts/hooks/lib
 */

'use strict';

// Core hook utilities
export * from './base-hook.js';
export * from './pattern-detector.js';

// Session state management (Phase 22)
export { SessionStateManager, getSessionState } from './session-state.js';

// Temporal Perception (Time awareness for psychology)
export {
  TemporalPerception,
  getTemporalPerception,
  resetTemporalPerception,
  TEMPORAL_THRESHOLDS,
  TemporalState,
  TemporalTrend,
} from './temporal-perception.js';

// Error Perception (Tool failure awareness for psychology)
export {
  ErrorPerception,
  getErrorPerception,
  resetErrorPerception,
  ERROR_THRESHOLDS,
  ErrorSeverity,
  ErrorPattern,
} from './error-perception.js';

// Orchestration client (Phase 22)
export { OrchestrationClient, getOrchestrationClient, initOrchestrationClient } from './orchestration-client.js';

// Feedback collection (Phase 22)
export { FeedbackCollector, getFeedbackCollector, ANTI_PATTERNS } from './feedback-collector.js';

// Suggestion engine (Phase 22)
export { SuggestionEngine, getSuggestionEngine } from './suggestion-engine.js';

// Auto-Orchestrator (Automatic Dog consultation)
export {
  AutoOrchestrator,
  getAutoOrchestrator,
  getAutoOrchestratorSync,
  CONFIG as AUTO_ORCHESTRATOR_CONFIG,
} from './auto-orchestrator.js';

// Rules loader (S1: Skill auto-activation via rules.json)
export {
  loadRulesFile,
  getSkillTriggers,
  getRulesSettings,
  detectSkillTriggersFromRules,
  clearRulesCache,
} from './rules-loader.js';

// Implicit Feedback Detection (Task #72)
export {
  ImplicitFeedbackDetector,
  getImplicitFeedback,
  resetImplicitFeedback,
  FeedbackType,
  FeedbackSentiment,
  IMPLICIT_FEEDBACK_CONFIG,
} from './implicit-feedback.js';

// Harmonic Feedback System (Kabbalistic + Cybernetic + Bayesian synthesis)
export {
  HarmonicFeedbackSystem,
  getHarmonicFeedback,
  resetHarmonicFeedback,
  ThompsonSampler,
  ConfidenceCalibrator,  // Task #71: Confidence calibration
  calculateCoherence,
  calculateResonance,
  calculateEntrainment,
  temporalDecay,
  eligibilityTrace,
  SEFIROT_CHANNELS,
  FeedbackState,
  PROMOTION_CONFIG,      // Task #70: Pattern-to-heuristic promotion
  CALIBRATION_CONFIG,    // Task #71: Confidence calibration config
} from './harmonic-feedback.js';

// ReasoningBank (P1.2: Trajectory learning)
let _reasoningBank = null;

export function getReasoningBank() {
  if (_reasoningBank) return _reasoningBank;

  try {
    const { createReasoningBank } = require('@cynic/node/learning');
    _reasoningBank = createReasoningBank();
    return _reasoningBank;
  } catch (e) {
    // First-time failure is expected if module not available
    // Only record friction if it's a runtime error, not module-not-found
    if (e.code !== 'MODULE_NOT_FOUND') {
      recordFriction('reasoning_bank_error', 'low', { error: e.message });
    }
    return null;
  }
}

// FactExtractor (M2: Auto fact extraction)
let _factExtractor = null;

export function getFactExtractor() {
  if (_factExtractor) return _factExtractor;

  try {
    const { createFactExtractor } = require('@cynic/persistence/services');
    const { getPool } = require('@cynic/persistence');
    const pool = getPool();
    if (pool) {
      _factExtractor = createFactExtractor({ pool });
      return _factExtractor;
    }
    // No pool - expected during startup
    return null;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      recordFriction('fact_extractor_error', 'low', { error: e.message });
    }
    return null;
  }
}

// FactsRepository (M2.1: Cross-session fact retrieval)
let _factsRepository = null;

export function getFactsRepository() {
  if (_factsRepository) return _factsRepository;

  try {
    const { FactsRepository } = require('@cynic/persistence/postgres/repositories/facts');
    const { getPool } = require('@cynic/persistence');
    const pool = getPool();
    if (pool) {
      _factsRepository = new FactsRepository(pool);
      return _factsRepository;
    }
    return null;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      recordFriction('facts_repository_error', 'low', { error: e.message });
    }
    return null;
  }
}

// ArchitecturalDecisionsRepository (Self-Knowledge: Decision awareness)
let _archDecisionsRepository = null;

export function getArchitecturalDecisionsRepository() {
  if (_archDecisionsRepository) return _archDecisionsRepository;

  try {
    const { ArchitecturalDecisionsRepository } = require('@cynic/persistence/postgres/repositories/architectural-decisions');
    const { getPool } = require('@cynic/persistence');
    const pool = getPool();
    if (pool) {
      _archDecisionsRepository = new ArchitecturalDecisionsRepository(pool);
      return _archDecisionsRepository;
    }
    return null;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      recordFriction('arch_decisions_repo_error', 'low', { error: e.message });
    }
    return null;
  }
}

// CodebaseIndexer (Self-Knowledge: Codebase awareness)
// Factory function - always creates fresh instance to allow different options
export function getCodebaseIndexer(options = {}) {
  try {
    const { createCodebaseIndexer } = require('@cynic/persistence/services');
    return createCodebaseIndexer(options);
  } catch (e) {
    recordFriction('codebase_indexer_unavailable', 'low', { error: e.message });
    return null;
  }
}

// BurnAnalyzer (Vision → Compréhension → Burn)
// Factory function - always creates fresh instance to allow different options
export function getBurnAnalyzer(options = {}) {
  try {
    const { createBurnAnalyzer } = require('@cynic/persistence/services/burn-analyzer');
    return createBurnAnalyzer(options);
  } catch (e) {
    recordFriction('burn_analyzer_unavailable', 'low', { error: e.message });
    return null;
  }
}

// SessionRepository (GAP #1 FIX: Direct PostgreSQL session persistence)
let _sessionRepository = null;

export function getSessionRepository() {
  if (_sessionRepository) return _sessionRepository;

  try {
    const { SessionRepository } = require('@cynic/persistence/postgres/repositories/sessions');
    const { getPool } = require('@cynic/persistence');
    const pool = getPool();
    if (pool) {
      _sessionRepository = new SessionRepository(pool);
      return _sessionRepository;
    }
    return null;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      recordFriction('session_repository_error', 'low', { error: e.message });
    }
    return null;
  }
}

// SessionPatternsRepository (Task #66: Cross-session pattern persistence)
let _sessionPatternsRepository = null;

export function getSessionPatternsRepository() {
  if (_sessionPatternsRepository) return _sessionPatternsRepository;

  try {
    const { SessionPatternsRepository } = require('@cynic/persistence/postgres/repositories/session-patterns');
    const { getPool } = require('@cynic/persistence');
    const pool = getPool();
    if (pool) {
      _sessionPatternsRepository = new SessionPatternsRepository(pool);
      return _sessionPatternsRepository;
    }
    return null;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      recordFriction('session_patterns_repo_error', 'low', { error: e.message });
    }
    return null;
  }
}

// TelemetryCollector (Stats, frictions, benchmarking)
// NOTE: This is the telemetry itself, so we can't record friction when it fails
let _telemetry = null;

export function getTelemetryCollector() {
  if (_telemetry) return _telemetry;

  try {
    const { createTelemetryCollector } = require('@cynic/persistence/services');
    const { getPool } = require('@cynic/persistence');
    const pool = getPool();

    // Create with pool for PostgreSQL persistence
    _telemetry = createTelemetryCollector({
      pool,
      persist: !!pool,
      flushInterval: 60000, // Flush every minute
    });

    return _telemetry;
  } catch (e) {
    // Telemetry is the error handler - can't record itself
    // Log to console as fallback
    if (e.code !== 'MODULE_NOT_FOUND') {
      console.warn('[CYNIC] Telemetry unavailable:', e.message);
    }
    return null;
  }
}

// Shorthand telemetry helpers
export function recordMetric(name, value, labels = {}) {
  const t = getTelemetryCollector();
  if (t) t.increment(name, value, labels);
}

export function recordTiming(name, durationMs, labels = {}) {
  const t = getTelemetryCollector();
  if (t) t.timing(name, durationMs, labels);
}

export function recordFriction(name, severity, details = {}) {
  const t = getTelemetryCollector();
  if (t) t.friction(name, severity, details);
}

// QLearningService with PostgreSQL persistence (Task #84: Wire Q-Learning to hooks)
// CRITICAL FIX: Promise-based singleton to prevent race conditions during async init
let _qlearningService = null;
let _qlearningInitPromise = null;
let _dotenvLoaded = false;

/**
 * Get Q-Learning service with PostgreSQL persistence.
 * Uses promise-based singleton to prevent race conditions during async initialization.
 * @returns {Object|null} Q-Learning service or null if unavailable
 */
export function getQLearningServiceWithPersistence() {
  // Fast path: already initialized
  if (_qlearningService?._initialized) return _qlearningService;

  // If init in progress, return the existing (possibly uninitialized) service
  // Callers can use it immediately for recording; persistence will catch up
  if (_qlearningInitPromise && _qlearningService) return _qlearningService;

  try {
    // Load .env if not already loaded (hooks context doesn't have env vars)
    if (!_dotenvLoaded && !process.env.CYNIC_DATABASE_URL) {
      try {
        const path = require('path');
        const fs = require('fs');
        // Try multiple possible paths to find .env
        const possiblePaths = [
          path.resolve(process.cwd(), '.env'),
          path.resolve(__dirname, '../../.env'),
          path.resolve(__dirname, '../../../.env'),
          'C:/Users/zeyxm/Desktop/asdfasdfa/CYNIC/.env',
        ];
        for (const dotenvPath of possiblePaths) {
          if (fs.existsSync(dotenvPath)) {
            require('dotenv').config({ path: dotenvPath });
            _dotenvLoaded = true;
            break;
          }
        }
      } catch (e) {
        recordFriction('dotenv_load_failed', 'low', { error: e.message });
      }
    }

    const { getQLearningService } = require('@cynic/node');
    const { getPool } = require('@cynic/persistence');
    const pool = getPool();

    // Create service with PostgreSQL persistence
    _qlearningService = getQLearningService({
      persistence: pool ? { query: (sql, params) => pool.query(sql, params) } : null,
      serviceId: 'hooks',
    });

    // Initialize async with proper error handling and telemetry
    if (pool && !_qlearningInitPromise) {
      _qlearningInitPromise = _qlearningService.initialize()
        .then(() => {
          _qlearningService._initialized = true;
          recordMetric('qlearning.init.success', 1, { serviceId: 'hooks' });
        })
        .catch((e) => {
          // Record failure but don't crash - service works in-memory
          recordFriction('qlearning_init_failed', 'medium', {
            error: e.message,
            serviceId: 'hooks',
          });
          // Mark as initialized anyway (in-memory mode)
          _qlearningService._initialized = true;
        });
    } else if (!pool) {
      // No pool - mark as initialized (in-memory only)
      _qlearningService._initialized = true;
      recordFriction('qlearning_no_pool', 'low', { serviceId: 'hooks' });
    }

    return _qlearningService;
  } catch (e) {
    recordFriction('qlearning_service_unavailable', 'high', { error: e.message });
    return null;
  }
}

/**
 * Async version that waits for initialization to complete.
 * Use when you need guaranteed persistence before continuing.
 * @returns {Promise<Object|null>} Initialized Q-Learning service or null
 */
export async function getQLearningServiceWithPersistenceAsync() {
  const service = getQLearningServiceWithPersistence();
  if (_qlearningInitPromise) {
    await _qlearningInitPromise;
  }
  return service;
}
