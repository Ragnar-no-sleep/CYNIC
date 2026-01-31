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

// Orchestration client (Phase 22)
export { OrchestrationClient, getOrchestrationClient, initOrchestrationClient } from './orchestration-client.js';

// Feedback collection (Phase 22)
export { FeedbackCollector, getFeedbackCollector, ANTI_PATTERNS } from './feedback-collector.js';

// Suggestion engine (Phase 22)
export { SuggestionEngine, getSuggestionEngine } from './suggestion-engine.js';

// ReasoningBank (P1.2: Trajectory learning)
let _reasoningBank = null;

export function getReasoningBank() {
  if (_reasoningBank) return _reasoningBank;

  try {
    // Dynamic import to avoid circular dependencies
    const { createReasoningBank } = require('@cynic/node/learning');
    _reasoningBank = createReasoningBank();
    return _reasoningBank;
  } catch (e) {
    // ReasoningBank not available - return null
    return null;
  }
}
