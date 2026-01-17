/**
 * PoJ Chain Module
 *
 * Proof of Judgment blockchain for verifiable judgment history.
 *
 * "The chain remembers what dogs forget" - κυνικός
 *
 * @module @cynic/persistence/poj
 */

'use strict';

// Block structures
export {
  PoJBlockHeader,
  PoJBlock,
  Attestation,
  JudgmentRef,
  computeMerkleRoot,
  createGenesisBlock,
  createBlock,
  POJ_CONSTANTS,
} from './block.js';

// Chain manager
export { PoJChain } from './chain.js';

// Default export
export { default } from './chain.js';
