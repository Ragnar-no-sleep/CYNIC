/**
 * Social Learner - C4.5 (SOCIAL × LEARN)
 *
 * Factory-generated from social-learner.config.js + create-learner.js.
 * Closes the social feedback loop: action outcomes → learning → predictions.
 *
 * "Le chien apprend du vent social" - κυνικός
 *
 * @module @cynic/node/social/social-learner
 */

'use strict';

import { createLearner } from '../cycle/create-learner.js';
import { socialLearnerConfig, SocialLearningCategory } from '../cycle/configs/social-learner.config.js';

const { Class: SocialLearner, getInstance, resetInstance } = createLearner(socialLearnerConfig);

export { SocialLearningCategory, SocialLearner };
export const getSocialLearner = getInstance;
export const resetSocialLearner = resetInstance;

export default { SocialLearner, SocialLearningCategory, getSocialLearner, resetSocialLearner };
