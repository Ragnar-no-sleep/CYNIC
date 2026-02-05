/**
 * Inference Module
 *
 * Probabilistic reasoning and belief updating for CYNIC.
 *
 * @module @cynic/node/inference
 */

'use strict';

// Bayesian Inference
export {
  // Core Bayes
  bayesTheorem,
  computeMarginal,
  updateBelief,
  batchUpdateBelief,

  // Multi-hypothesis
  Hypothesis,
  HypothesisSet,
  createHypothesisSet,

  // Beta-Binomial
  BetaDistribution,
  createBetaTracker,

  // Naive Bayes
  NaiveBayesClassifier,
  createClassifier,

  // Belief Networks
  BeliefNode,
  BeliefNetwork,
  createBeliefNetwork,

  // Utilities
  likelihoodRatio,
  probabilityToOdds,
  oddsToProbability,
  logOdds,
  sigmoid,
  updateOdds,

  // Config
  BAYES_CONFIG,
} from './bayes.js';

// Poisson Distribution for Rare Events
export {
  // Core functions
  factorial,
  logFactorial,
  poissonPMF,
  poissonCDF,
  poissonSurvival,
  poissonQuantile,
  poissonMean,
  poissonVariance,
  poissonStdDev,

  // Rate estimation
  estimateRate,
  rateConfidenceInterval,

  // Anomaly detection
  detectAnomaly,
  anomalyScore,

  // Process classes
  PoissonProcess,
  EventRateTracker,

  // Utilities
  poissonGoodnessOfFit,
  waitingTimeCDF,
  timeToNEvents,

  // Factories
  createPoissonProcess,
  createEventTracker,

  // Config
  POISSON_CONFIG,
} from './poisson.js';
