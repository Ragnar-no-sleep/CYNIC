/**
 * Node Emergence Integration
 *
 * Exports the EmergenceLayer for CYNICNode integration.
 * Includes CodeEmergence for C1.7 (CODE × EMERGE) pattern detection.
 *
 * @module @cynic/node/emergence
 */

'use strict';

export {
  EmergenceLayer,
  createEmergenceLayer,
} from './layer.js';

// C1.7: CODE × EMERGE
export {
  CodeEmergence,
  CodePatternType,
  getCodeEmergence,
  resetCodeEmergence,
} from './code-emergence.js';

// Re-export types from @cynic/emergence
export {
  ConsciousnessState,
  PatternType,
  CollectivePhase,
} from '@cynic/emergence';

// Re-export from @cynic/emergence for convenience
export {
  AWARENESS_THRESHOLDS,
  MAX_CONFIDENCE,
  SIGNIFICANCE_THRESHOLDS,
  PHASE_THRESHOLDS,
  QUORUM,
} from '@cynic/emergence';
