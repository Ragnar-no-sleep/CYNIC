/**
 * Cosmos Judge - C7.2 (COSMOS × JUDGE)
 *
 * Factory-generated from cosmos-judge.config.js + create-judge.js.
 * Evaluates ecosystem-level health and patterns using φ-bounded scoring.
 *
 * "Le chien juge les étoiles" - κυνικός
 *
 * @module @cynic/node/cosmos/cosmos-judge
 */

'use strict';

import { createJudge } from '../cycle/create-judge.js';
import { cosmosJudgeConfig, CosmosJudgmentType } from '../cycle/configs/cosmos-judge.config.js';

const { Class: CosmosJudge, getInstance, resetInstance } = createJudge(cosmosJudgeConfig);

export { CosmosJudgmentType, CosmosJudge };
export const getCosmosJudge = getInstance;
export const resetCosmosJudge = resetInstance;

export default { CosmosJudge, CosmosJudgmentType, getCosmosJudge, resetCosmosJudge };
