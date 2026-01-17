/**
 * @cynic/burns - Burn Verification
 *
 * "Onchain is truth - burns must be verified" - κυνικός
 *
 * This package verifies burn transactions via the alonisthe.dev/burns API.
 * Burns are a core part of the CYNIC ecosystem - operators must burn to participate.
 *
 * ## Usage
 *
 * ```javascript
 * import { createBurnVerifier } from '@cynic/burns';
 *
 * const verifier = createBurnVerifier();
 *
 * // Verify a burn
 * const result = await verifier.verify('tx_signature_here');
 * if (result.verified) {
 *   console.log(`Burn verified: ${result.amount} by ${result.burner}`);
 * }
 *
 * // Check cache
 * if (verifier.isVerified('tx_signature')) {
 *   // Already verified
 * }
 * ```
 *
 * @module @cynic/burns
 */

'use strict';

// Verifier
export {
  BurnVerifier,
  createBurnVerifier,
  BurnStatus,
  DEFAULT_CONFIG,
} from './verifier.js';
