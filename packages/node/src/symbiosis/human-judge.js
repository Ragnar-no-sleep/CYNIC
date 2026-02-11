/**
 * CYNIC Human Judge - C5.2 (HUMAN × JUDGE)
 *
 * Factory-generated from human-judge.config.js + create-judge.js.
 * Judges human state: wellbeing, productivity, engagement, burnout risk.
 *
 * "Le chien juge l'état du maître, pas ses intentions" - κυνικός
 *
 * @module @cynic/node/symbiosis/human-judge
 */

'use strict';

import { createJudge } from '../cycle/create-judge.js';
import { humanJudgeConfig, HumanVerdict, JudgmentDomain } from '../cycle/configs/human-judge.config.js';

const { Class: HumanJudge, getInstance, resetInstance } = createJudge(humanJudgeConfig);

export { HumanVerdict, JudgmentDomain, HumanJudge };
export const getHumanJudge = getInstance;
export const resetHumanJudge = resetInstance;

export default { HumanJudge, HumanVerdict, JudgmentDomain, getHumanJudge, resetHumanJudge };
