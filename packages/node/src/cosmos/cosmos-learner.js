/**
 * Cosmos Learner - C7.5 (COSMOS × LEARN)
 *
 * Factory-generated from cosmos-learner.config.js + create-learner.js.
 * Learns from ecosystem patterns, judgments, and outcomes.
 *
 * "Le chien apprend des étoiles" - κυνικός
 *
 * @module @cynic/node/cosmos/cosmos-learner
 */

'use strict';

import { createLearner } from '../cycle/create-learner.js';
import { cosmosLearnerConfig, CosmosLearningCategory } from '../cycle/configs/cosmos-learner.config.js';

const { Class: CosmosLearner, getInstance, resetInstance } = createLearner(cosmosLearnerConfig);

export { CosmosLearningCategory, CosmosLearner };
export const getCosmosLearner = getInstance;
export const resetCosmosLearner = resetInstance;

export default { CosmosLearner, CosmosLearningCategory, getCosmosLearner, resetCosmosLearner };
