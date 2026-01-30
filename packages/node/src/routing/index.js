/**
 * Routing Module
 *
 * Intelligent request routing with complexity-based tiering.
 *
 * @module @cynic/node/routing
 */

'use strict';

export {
  ComplexityClassifier,
  createComplexityClassifier,
  ComplexityTier,
  COMPLEXITY_THRESHOLDS,
} from './complexity-classifier.js';

export {
  TieredRouter,
  createTieredRouter,
  HANDLER_COSTS,
  HANDLER_LATENCIES,
} from './tiered-router.js';

// Re-export for convenience
import { ComplexityClassifier, createComplexityClassifier, ComplexityTier, COMPLEXITY_THRESHOLDS } from './complexity-classifier.js';
import { TieredRouter, createTieredRouter, HANDLER_COSTS, HANDLER_LATENCIES } from './tiered-router.js';

export default {
  ComplexityClassifier,
  createComplexityClassifier,
  ComplexityTier,
  COMPLEXITY_THRESHOLDS,
  TieredRouter,
  createTieredRouter,
  HANDLER_COSTS,
  HANDLER_LATENCIES,
};
