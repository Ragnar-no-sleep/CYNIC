/**
 * @cynic/gasdf - GASdf Integration for CYNIC
 *
 * Integrates GASdf gasless transaction service with CYNIC.
 *
 * ## Features
 *
 * - **Gasless Transactions**: Submit Solana transactions without SOL
 * - **φ-Aligned Fees**: Treasury/burn ratios based on golden ratio
 * - **E-Score Discounts**: Holder tier discounts up to 95%
 * - **Burn Tracking**: Track all burns through CYNIC
 *
 * ## Usage
 *
 * ```javascript
 * import { createGASdfClient, prepareGaslessTransaction } from '@cynic/gasdf';
 *
 * // Create client
 * const client = createGASdfClient();
 *
 * // Get quote for gasless transaction
 * const quote = await client.getQuote({
 *   paymentToken: 'So11111111111111111111111111111111111111112',
 *   userPubkey: 'user...',
 *   estimatedComputeUnits: 200000,
 * });
 *
 * // Submit signed transaction
 * const result = await client.submitTransaction({
 *   quoteId: quote.quoteId,
 *   signedTransaction: 'base64...',
 * });
 * ```
 *
 * ## Fee Structure
 *
 * ```
 * Fee Split (φ-aligned):
 *   Burn:     76.4% (1 - φ⁻³)
 *   Treasury: 23.6% (φ⁻³)
 *
 * Holder Discounts:
 *   Based on E-Score, up to 95% off
 * ```
 *
 * "Don't Extract, Burn" - κυνικός
 *
 * @module @cynic/gasdf
 */

'use strict';

// Client exports
export {
  GASdfClient,
  createGASdfClient,
  FEE_CONSTANTS,
} from './client.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Gasless Transaction Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { createGASdfClient, FEE_CONSTANTS } from './client.js';

// Import harmony from holdex for E-Score calculations
let calculateEScoreDiscount;
try {
  const holdex = await import('@cynic/holdex');
  calculateEScoreDiscount = holdex.calculateEScoreDiscount;
} catch {
  // Fallback if holdex not available
  calculateEScoreDiscount = (eScore) => {
    if (!eScore || eScore <= 0) return 0;
    const PHI_INV = 0.618033988749895;
    const normalized = Math.min(1, eScore / 100);
    return Math.min(0.95, PHI_INV * (1 - Math.pow(1 - normalized, 2)));
  };
}

/**
 * Prepare a gasless transaction through GASdf
 *
 * Gets a quote and returns everything needed to sign and submit.
 *
 * @param {Object} options - Transaction options
 * @param {string} options.paymentToken - Token mint to pay fees with
 * @param {string} options.userPubkey - User's wallet public key
 * @param {number} [options.estimatedComputeUnits] - Estimated CU
 * @param {GASdfClient} [options.client] - Pre-configured client
 * @returns {Promise<Object>} Prepared transaction data
 */
export async function prepareGaslessTransaction(options) {
  const { paymentToken, userPubkey, estimatedComputeUnits = 200000, client: providedClient } = options;
  const client = providedClient || createGASdfClient();

  const quote = await client.getQuote({
    paymentToken,
    userPubkey,
    estimatedComputeUnits,
  });

  return {
    quoteId: quote.quoteId,
    feePayer: quote.feePayer,
    feeAmount: quote.feeAmount,
    feeToken: quote.feeToken,
    discount: quote.discount,
    tier: quote.tier,
    expiresAt: quote.expiresAt,
    // Breakdown
    burnAmount: quote.burnAmount,
    treasuryAmount: quote.treasuryAmount,
    // For signing
    instructions: {
      transferFee: {
        amount: quote.feeAmount,
        token: quote.feeToken,
        destination: quote.feePayer,
      },
    },
    // Client for submission
    _client: client,
  };
}

/**
 * Submit a prepared gasless transaction
 *
 * @param {Object} prepared - From prepareGaslessTransaction
 * @param {string} signedTransaction - Base64 encoded signed transaction
 * @returns {Promise<Object>} Submission result
 */
export async function submitGaslessTransaction(prepared, signedTransaction) {
  const client = prepared._client || createGASdfClient();

  const result = await client.submitTransaction({
    quoteId: prepared.quoteId,
    signedTransaction,
  });

  return {
    success: result.success,
    signature: result.signature,
    slot: result.slot,
    // Burn proof for CYNIC
    burn: {
      amount: result.burnAmount,
      signature: result.burnSignature,
      verified: !!result.burnSignature,
    },
    confirmations: result.confirmations,
  };
}

/**
 * Calculate fee with E-Score discount
 *
 * @param {number} baseFee - Base fee amount
 * @param {number} eScore - User's E-Score (0-100)
 * @returns {Object} Fee breakdown
 */
export function calculateFeeWithDiscount(baseFee, eScore = 0) {
  const discount = calculateEScoreDiscount(eScore);
  const discountedFee = Math.floor(baseFee * (1 - discount));

  // Split according to φ ratios
  const burnAmount = Math.floor(discountedFee * FEE_CONSTANTS.BURN_RATE);
  const treasuryAmount = discountedFee - burnAmount;

  return {
    baseFee,
    discount: Math.round(discount * 10000) / 100, // percentage
    discountedFee,
    burn: burnAmount,
    treasury: treasuryAmount,
    savings: baseFee - discountedFee,
  };
}

/**
 * Validate fee distribution
 *
 * Ensures fees are split according to φ ratios.
 *
 * @param {number} total - Total fee
 * @param {number} burn - Burn amount
 * @param {number} treasury - Treasury amount
 * @returns {Object} { valid, errors, ratios }
 */
export function validateFeeDistribution(total, burn, treasury) {
  const errors = [];

  // Check sum
  if (burn + treasury !== total) {
    errors.push(`Sum mismatch: ${burn} + ${treasury} !== ${total}`);
  }

  // Check ratios (allow small rounding error)
  const actualBurnRate = burn / total;
  const actualTreasuryRate = treasury / total;

  if (Math.abs(actualBurnRate - FEE_CONSTANTS.BURN_RATE) > 0.01) {
    errors.push(`Burn rate ${actualBurnRate.toFixed(3)} deviates from ${FEE_CONSTANTS.BURN_RATE.toFixed(3)}`);
  }

  if (Math.abs(actualTreasuryRate - FEE_CONSTANTS.TREASURY_RATE) > 0.01) {
    errors.push(`Treasury rate ${actualTreasuryRate.toFixed(3)} deviates from ${FEE_CONSTANTS.TREASURY_RATE.toFixed(3)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    ratios: {
      burn: actualBurnRate,
      treasury: actualTreasuryRate,
      expected: {
        burn: FEE_CONSTANTS.BURN_RATE,
        treasury: FEE_CONSTANTS.TREASURY_RATE,
      },
    },
  };
}

/**
 * Track burn for CYNIC judgment
 *
 * Creates a burn record for the POJ chain.
 *
 * @param {Object} burnData - Burn information
 * @param {string} burnData.signature - Transaction signature
 * @param {string|number} burnData.amount - Amount burned
 * @param {string} burnData.token - Token mint
 * @param {string} [burnData.user] - User public key
 * @returns {Object} Burn record for POJ
 */
export function createBurnRecord(burnData) {
  const { signature, amount, token, user } = burnData;

  return {
    type: 'burn',
    source: 'gasdf',
    timestamp: Date.now(),
    data: {
      signature,
      amount: amount.toString(),
      token,
      user,
    },
    // For POJ chain
    hash: `burn:${signature}:${amount}`,
    verified: false, // Must be verified on-chain
  };
}

/**
 * Get accepted tokens with CYNIC context
 *
 * @param {GASdfClient} [client] - Pre-configured client
 * @returns {Promise<Array>} Tokens with CYNIC metadata
 */
export async function getAcceptedTokensWithContext(client) {
  const gasdfClient = client || createGASdfClient();
  const tokens = await gasdfClient.getAcceptedTokens();

  return tokens.map(token => ({
    ...token,
    cynic: {
      source: 'gasdf',
      trusted: true, // GASdf-accepted tokens are vetted
      feeCapable: true,
    },
  }));
}

/**
 * Generate gasless transaction report
 *
 * @param {Object} result - From submitGaslessTransaction
 * @param {Object} [prepared] - From prepareGaslessTransaction
 * @returns {string} Human-readable report
 */
export function generateTransactionReport(result, prepared = {}) {
  if (!result.success) {
    return `
❌ Gasless Transaction Failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: ${result.error || 'Unknown error'}
`.trim();
  }

  return `
✅ Gasless Transaction Successful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Transaction**:
- Signature: ${result.signature}
- Slot: ${result.slot}
- Confirmations: ${result.confirmations || 'pending'}

**Fee Breakdown**:
- Total Fee: ${prepared.feeAmount || 'N/A'}
- Discount: ${prepared.discount ? (prepared.discount * 100).toFixed(1) + '%' : 'N/A'}
- Tier: ${prepared.tier || 'N/A'}

**Burn Proof**:
- Amount: ${result.burn?.amount || 'N/A'}
- Burn Tx: ${result.burn?.signature || 'N/A'}
- Verified: ${result.burn?.verified ? '✅' : '⏳ Pending'}

*"Don't Extract, Burn" - φ guides all ratios*
`.trim();
}

// Re-import for default export
import * as clientModule from './client.js';

export default {
  // Client
  GASdfClient: clientModule.GASdfClient,
  createGASdfClient: clientModule.createGASdfClient,
  FEE_CONSTANTS: clientModule.FEE_CONSTANTS,

  // Integration
  prepareGaslessTransaction,
  submitGaslessTransaction,
  calculateFeeWithDiscount,
  validateFeeDistribution,
  createBurnRecord,
  getAcceptedTokensWithContext,
  generateTransactionReport,
};
