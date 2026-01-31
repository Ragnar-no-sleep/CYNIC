/**
 * Routing Module
 *
 * Intelligent request routing with:
 * - Complexity-based tiering (TieredRouter)
 * - Dog-based task routing (IntelligentRouter)
 *
 * @module @cynic/node/routing
 */

'use strict';

// Complexity-based routing
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

export {
  AgentBooster,
  createAgentBooster,
  TransformIntent,
  TransformStatus,
} from './agent-booster.js';

// Task classification
export {
  TaskDescriptor,
  createTaskDescriptor,
  TaskType,
  ComplexityLevel,
  RiskLevel,
} from './task-descriptor.js';

// Dog capability matching
export {
  DogCapabilityMatrix,
  createDogCapabilityMatrix,
  getDogCapabilityMatrix,
  DogId,
  DOG_CAPABILITIES,
} from './dog-capabilities.js';

// Intelligent dog-based routing
export {
  IntelligentRouter,
  createIntelligentRouter,
  getIntelligentRouter,
  RoutingDecision,
} from './intelligent-router.js';

// Dog performance tracking
export {
  DogPerformanceTracker,
  DogMetrics,
  createDogPerformanceTracker,
  getDogPerformanceTracker,
} from './dog-performance.js';

// Dog pipeline (stream chaining)
export {
  DogPipeline,
  StreamContext,
  PipelineStage,
  PipelineTemplates,
  createDogPipeline,
  getDogPipeline,
} from './dog-pipeline.js';

// Re-export for convenience
import { ComplexityClassifier, createComplexityClassifier, ComplexityTier, COMPLEXITY_THRESHOLDS } from './complexity-classifier.js';
import { TieredRouter, createTieredRouter, HANDLER_COSTS, HANDLER_LATENCIES } from './tiered-router.js';
import { AgentBooster, createAgentBooster, TransformIntent, TransformStatus } from './agent-booster.js';
import { TaskDescriptor, createTaskDescriptor, TaskType, ComplexityLevel, RiskLevel } from './task-descriptor.js';
import { DogCapabilityMatrix, createDogCapabilityMatrix, getDogCapabilityMatrix, DogId, DOG_CAPABILITIES } from './dog-capabilities.js';
import { IntelligentRouter, createIntelligentRouter, getIntelligentRouter, RoutingDecision } from './intelligent-router.js';
import { DogPerformanceTracker, DogMetrics, createDogPerformanceTracker, getDogPerformanceTracker } from './dog-performance.js';
import { DogPipeline, StreamContext, PipelineStage, PipelineTemplates, createDogPipeline, getDogPipeline } from './dog-pipeline.js';

export default {
  // Complexity routing
  ComplexityClassifier,
  createComplexityClassifier,
  ComplexityTier,
  COMPLEXITY_THRESHOLDS,
  TieredRouter,
  createTieredRouter,
  HANDLER_COSTS,
  HANDLER_LATENCIES,
  AgentBooster,
  createAgentBooster,
  TransformIntent,
  TransformStatus,
  // Task classification
  TaskDescriptor,
  createTaskDescriptor,
  TaskType,
  ComplexityLevel,
  RiskLevel,
  // Dog capabilities
  DogCapabilityMatrix,
  createDogCapabilityMatrix,
  getDogCapabilityMatrix,
  DogId,
  DOG_CAPABILITIES,
  // Intelligent routing
  IntelligentRouter,
  createIntelligentRouter,
  getIntelligentRouter,
  RoutingDecision,
  // Performance tracking
  DogPerformanceTracker,
  DogMetrics,
  createDogPerformanceTracker,
  getDogPerformanceTracker,
  // Pipeline (stream chaining)
  DogPipeline,
  StreamContext,
  PipelineStage,
  PipelineTemplates,
  createDogPipeline,
  getDogPipeline,
};
