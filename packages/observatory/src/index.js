/**
 * @cynic/observatory - Real-time Observability & Learning Visualization
 *
 * "Observer pour comprendre, comprendre pour améliorer"
 *
 * Observatory provides:
 * - Q-Learning visualization (is CYNIC learning?)
 * - Pattern tracking (EWC++ Fisher scores)
 * - System health metrics
 * - Learning proof (5 metrics that PROVE learning)
 *
 * @module @cynic/observatory
 */

'use strict';

// Queries
export {
  QLearningQueries,
  PatternsQueries,
  TelemetryQueries,
  LearningProofQueries,
} from './queries/index.js';

// Exporters
export {
  PrometheusExporter,
  JSONStreamExporter,
} from './exporters/index.js';

// Dashboard
export {
  createServer,
  start,
} from './dashboard/index.js';

// Quick start function
export async function startObservatory(options = {}) {
  const { start } = await import('./dashboard/server.js');
  return start(options);
}
