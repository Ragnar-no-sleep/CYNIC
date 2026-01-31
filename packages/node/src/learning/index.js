/**
 * Learning Module
 *
 * Exports SONA, ReasoningBank, and related learning components.
 *
 * @module @cynic/node/learning
 */

'use strict';

export {
  SONA,
  createSONA,
  SONA_CONFIG,
} from './sona.js';

export {
  ReasoningBank,
  Trajectory,
  TrajectoryState,
  TrajectoryAction,
  TrajectoryOutcome,
  TrajectoryType,
  OutcomeType,
  REASONING_BANK_CONFIG,
  createReasoningBank,
} from './reasoning-bank.js';

export default {
  SONA,
  createSONA,
  SONA_CONFIG,
  ReasoningBank,
  Trajectory,
  TrajectoryState,
  TrajectoryAction,
  TrajectoryOutcome,
  TrajectoryType,
  OutcomeType,
  REASONING_BANK_CONFIG,
  createReasoningBank,
};

// Re-export from sona for convenience
import { SONA, createSONA, SONA_CONFIG } from './sona.js';
import {
  ReasoningBank,
  Trajectory,
  TrajectoryState,
  TrajectoryAction,
  TrajectoryOutcome,
  TrajectoryType,
  OutcomeType,
  REASONING_BANK_CONFIG,
  createReasoningBank,
} from './reasoning-bank.js';
