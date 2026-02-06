/**
 * Claude Flow Service Factories
 *
 * Creates services for Claude Flow integration (Phase 21):
 * - ComplexityClassifier
 * - TieredRouter
 * - AgentBooster
 * - TokenOptimizer
 * - HyperbolicSpace
 * - SONA
 *
 * @module @cynic/mcp/server/service-initializer/claude-flow-factories
 */

'use strict';

import {
  createSONA, createTieredRouter, createAgentBooster,
  createTokenOptimizer, createHyperbolicSpace, createComplexityClassifier,
} from '@cynic/node';
import { createLogger } from '@cynic/core';

const log = createLogger('ClaudeFlowFactories');

/**
 * Create Complexity Classifier
 * Classifies requests into LOCAL/LIGHT/FULL tiers
 */
export function createComplexityClassifierFactory() {
  const classifier = createComplexityClassifier();
  log.debug('ComplexityClassifier ready');
  return classifier;
}

/**
 * Create Tiered Router
 * Routes requests to appropriate handlers based on complexity
 */
export function createTieredRouterFactory(services) {
  const router = createTieredRouter({
    classifier: services.complexityClassifier,
  });
  log.debug('TieredRouter ready');
  return router;
}

/**
 * Create Agent Booster
 * Fast code transforms without LLM (< 1ms, $0)
 */
export function createAgentBoosterFactory() {
  const booster = createAgentBooster();
  log.debug('AgentBooster ready', { transforms: 12 });
  return booster;
}

/**
 * Create Token Optimizer
 * Compression and caching for token efficiency
 */
export function createTokenOptimizerFactory() {
  const optimizer = createTokenOptimizer();
  log.debug('TokenOptimizer ready', { strategies: 4 });
  return optimizer;
}

/**
 * Create Hyperbolic Space
 * Poincaré ball model for hierarchical embeddings
 */
export function createHyperbolicSpaceFactory() {
  const space = createHyperbolicSpace({ dim: 8 });
  log.debug('HyperbolicSpace ready', { dim: 8 });
  return space;
}

/**
 * Create SONA (Self-Optimizing Neural Adaptation)
 * Correlates patterns to dimensions for adaptive learning
 */
export function createSONAFactory(services) {
  const sona = createSONA({
    learningService: services.learningService,
  });
  log.debug('SONA ready', { adaptationRate: 0.236 });
  return sona;
}
