/**
 * CYNIC Solana Judge - C2.2 (SOLANA × JUDGE)
 *
 * Factory-generated from solana-judge.config.js + create-judge.js.
 * Judges Solana blockchain data using dimension-weighted scoring.
 *
 * "On-chain truth, φ-capped confidence" - κυνικός
 *
 * @module @cynic/node/solana/solana-judge
 */

'use strict';

import { createJudge } from '../cycle/create-judge.js';
import { solanaJudgeConfig, SolanaJudgmentType } from '../cycle/configs/solana-judge.config.js';

const { Class: SolanaJudge, getInstance, resetInstance } = createJudge(solanaJudgeConfig);

export { SolanaJudgmentType, SolanaJudge };
export const getSolanaJudge = getInstance;
export const resetSolanaJudge = resetInstance;

export default { SolanaJudge, SolanaJudgmentType, getSolanaJudge, resetSolanaJudge };
