/**
 * Social Judge - C4.2 (SOCIAL × JUDGE)
 *
 * Factory-generated from social-judge.config.js + create-judge.js.
 * Judges social interactions: engagement, sentiment, reach, community health.
 *
 * Extracted from inline code in event-listeners.js.
 *
 * "Le chien renifle le vent social" - κυνικός
 *
 * @module @cynic/node/social/social-judge
 */

'use strict';

import { createJudge } from '../cycle/create-judge.js';
import { socialJudgeConfig, SocialJudgmentType } from '../cycle/configs/social-judge.config.js';

const { Class: SocialJudge, getInstance, resetInstance } = createJudge(socialJudgeConfig);

export { SocialJudgmentType, SocialJudge };
export const getSocialJudge = getInstance;
export const resetSocialJudge = resetInstance;

export default { SocialJudge, SocialJudgmentType, getSocialJudge, resetSocialJudge };
