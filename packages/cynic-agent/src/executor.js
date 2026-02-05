/**
 * @cynic/agent - Executor Module
 *
 * Executes decisions via gasdf-relayer for gasless transactions.
 * Uses Jupiter Swap API for optimal routing.
 * "Le chien mord quand il faut" - κυνικός
 *
 * @module @cynic/agent/executor
 */

'use strict';

import { EventEmitter } from 'eventemitter3';
import { PHI_INV, createLogger } from '@cynic/core';

const log = createLogger('Executor');

// ═══════════════════════════════════════════════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

// Token addresses
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  // GASdf Relayer endpoint
  relayerUrl: process.env.GASDF_RELAYER_URL || 'http://localhost:3000',

  // Wallet (for signing)
  walletAddress: process.env.AGENT_WALLET_ADDRESS,

  // Execution settings
  maxSlippageBps: 100,      // 1% max slippage (in basis points)
  quoteTtl: 30000,          // 30s quote validity
  confirmationTimeout: 60000, // 60s confirmation wait
  priorityFee: 'auto',      // 'auto', 'low', 'medium', 'high'

  // Default trade pair (SOL → token)
  baseMint: SOL_MINT,

  // Simulation mode (no real txs)
  dryRun: process.env.DRY_RUN !== 'false', // Default true for safety
};

// ═══════════════════════════════════════════════════════════════════════════════
// Execution Status
// ═══════════════════════════════════════════════════════════════════════════════

export const ExecutionStatus = {
  PENDING: 'pending',
  QUOTED: 'quoted',
  SIGNED: 'signed',
  SUBMITTED: 'submitted',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Executor Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Executor - Executes trades via gasdf-relayer
 */
export class Executor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = { ...DEFAULT_CONFIG, ...options };
    this.isInitialized = false;

    // Active executions
    this.activeExecutions = new Map();

    // Metrics
    this.metrics = {
      executionsAttempted: 0,
      executionsSuccessful: 0,
      executionsFailed: 0,
      totalVolumeSOL: 0,
      totalFeesSOL: 0,
      totalBurnedSOL: 0,
    };

    // Execution history
    this.history = [];
    this.maxHistory = 100;
  }

  /**
   * Initialize executor (connect to relayer, verify wallet)
   */
  async init() {
    if (this.isInitialized) return;

    log.info('Initializing executor...', {
      relayerUrl: this.config.relayerUrl,
      dryRun: this.config.dryRun,
    });

    // Check relayer health
    try {
      const health = await this._checkRelayerHealth();
      log.info('Relayer connected', {
        status: health.status,
        cluster: health.solana?.cluster,
      });
    } catch (err) {
      log.warn('Relayer not available, running in simulation mode', { error: err.message });
      this.config.dryRun = true;
    }

    this.isInitialized = true;
    log.info('Executor initialized', { dryRun: this.config.dryRun });
  }

  /**
   * Check relayer health
   * @private
   */
  async _checkRelayerHealth() {
    const response = await fetch(`${this.config.relayerUrl}/health`);
    if (!response.ok) {
      throw new Error(`Relayer health check failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Execute a decision
   *
   * @param {Object} decision - The decision to execute
   * @returns {Object} Execution result
   */
  async execute(decision) {
    this.metrics.executionsAttempted++;

    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      decisionId: decision.id,
      timestamp: Date.now(),
      action: decision.action,
      token: decision.token,
      mint: decision.mint,
      size: decision.size,
      status: ExecutionStatus.PENDING,
      quote: null,
      jupiterQuote: null,
      signature: null,
      error: null,
    };

    this.activeExecutions.set(execution.id, execution);
    this.emit('execution_started', execution);

    try {
      // Dry run mode - simulate execution
      if (this.config.dryRun) {
        return await this._simulateExecution(execution, decision);
      }

      // 1. Get GASdf relayer quote
      execution.status = ExecutionStatus.QUOTED;
      execution.quote = await this._getRelayerQuote(decision);
      log.debug('Relayer quote received', { quoteId: execution.quote.quoteId });

      // 2. Build transaction (includes Jupiter quote + swap tx)
      execution.status = ExecutionStatus.SIGNED;
      const txData = await this._buildAndSignTx(execution.quote, decision);
      execution.jupiterQuote = txData.jupiterQuote;

      // Log the quote details
      log.info('Swap prepared', {
        inputMint: execution.jupiterQuote.inputMint,
        outputMint: execution.jupiterQuote.outputMint,
        inAmount: execution.jupiterQuote.inAmount,
        outAmount: execution.jupiterQuote.outAmount,
        priceImpact: execution.jupiterQuote.priceImpactPct,
      });

      // 3. Submit to relayer
      execution.status = ExecutionStatus.SUBMITTED;
      const result = await this._submitTransaction(execution.quote.quoteId, txData);

      // 4. Confirmed
      execution.status = ExecutionStatus.CONFIRMED;
      execution.signature = result.signature;
      execution.slot = result.slot;
      execution.burnAmount = result.burnAmount;

      // Update metrics
      this.metrics.executionsSuccessful++;
      this.metrics.totalBurnedSOL += parseFloat(result.burnAmount || 0) / 1e9;
      this.metrics.totalVolumeSOL += parseFloat(execution.jupiterQuote.inAmount || 0) / 1e9;

      this._recordExecution(execution, true);
      this.emit('action_complete', { ...execution, success: true });

      log.info('Execution successful', {
        id: execution.id,
        action: execution.action,
        signature: execution.signature,
        burned: `${(parseFloat(result.burnAmount || 0) / 1e9).toFixed(6)} SOL`,
      });

      return { ...execution, success: true };

    } catch (err) {
      execution.status = ExecutionStatus.FAILED;
      execution.error = err.message;

      this.metrics.executionsFailed++;
      this._recordExecution(execution, false);

      this.emit('action_complete', { ...execution, success: false });

      log.error('Execution failed', {
        id: execution.id,
        error: err.message,
      });

      return { ...execution, success: false };

    } finally {
      this.activeExecutions.delete(execution.id);
    }
  }

  /**
   * Simulate execution (dry run mode)
   * @private
   */
  async _simulateExecution(execution, decision) {
    log.info('Simulating execution (dry run)', {
      action: decision.action,
      token: decision.token,
      size: decision.size,
    });

    // Simulate network delay
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

    // Simulate success rate based on confidence
    const successRate = decision.confidence * 1.2; // 74% success at max confidence
    const success = Math.random() < successRate;

    execution.status = success ? ExecutionStatus.CONFIRMED : ExecutionStatus.FAILED;
    execution.signature = success
      ? `sim_${Math.random().toString(36).slice(2, 10)}`
      : null;
    execution.error = success ? null : 'Simulated failure (dry run)';
    execution.simulated = true;

    // Simulate P&L
    if (success) {
      const pnlPercent = (Math.random() - 0.4) * 0.1; // -4% to +6%
      execution.simulatedPnL = pnlPercent;
      this.metrics.executionsSuccessful++;
    } else {
      this.metrics.executionsFailed++;
    }

    this._recordExecution(execution, success);
    this.emit('action_complete', { ...execution, success });

    return { ...execution, success };
  }

  /**
   * Get swap quote from Jupiter
   * @private
   */
  async _getJupiterQuote(decision) {
    const isBuy = decision.action === 'BUY' || decision.action === 'STRONG_BUY';

    // For BUY: SOL → Token
    // For SELL: Token → SOL
    const inputMint = isBuy ? this.config.baseMint : decision.mint;
    const outputMint = isBuy ? decision.mint : this.config.baseMint;

    // Amount in lamports (1 SOL = 1e9 lamports)
    // Default to 0.1 SOL per trade for safety
    const amount = decision.size || 100_000_000; // 0.1 SOL

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: this.config.maxSlippageBps.toString(),
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false',
    });

    const url = `${JUPITER_QUOTE_API}?${params}`;

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Jupiter quote failed: ${response.status} - ${error}`);
      }

      const quote = await response.json();
      log.debug('Jupiter quote received', {
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpactPct: quote.priceImpactPct,
      });

      return quote;

    } catch (err) {
      log.error('Jupiter quote failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Get fee quote from GASdf relayer
   * @private
   */
  async _getRelayerQuote(decision) {
    const response = await fetch(`${this.config.relayerUrl}/v1/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentToken: SOL_MINT,
        userPubkey: this.config.walletAddress,
        estimatedComputeUnits: 200000,
        eScore: 50, // Default E-Score
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Relayer quote failed: ${error.error}`);
    }

    return response.json();
  }

  /**
   * Build swap transaction using Jupiter
   * @private
   */
  async _buildSwapTransaction(jupiterQuote) {
    const response = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: jupiterQuote,
        userPublicKey: this.config.walletAddress,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: this.config.priorityFee === 'auto'
          ? { autoMultiplier: 2 }
          : { priorityLevelWithMaxLamports: { priorityLevel: this.config.priorityFee } },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter swap build failed: ${response.status} - ${error}`);
    }

    const { swapTransaction } = await response.json();

    log.debug('Jupiter swap transaction built', {
      size: swapTransaction?.length || 0,
    });

    return swapTransaction;
  }

  /**
   * Build and sign transaction (combines Jupiter + GASdf)
   * @private
   */
  async _buildAndSignTx(relayerQuote, decision) {
    // 1. Get Jupiter quote
    const jupiterQuote = await this._getJupiterQuote(decision);

    // 2. Build swap transaction
    const swapTx = await this._buildSwapTransaction(jupiterQuote);

    // 3. In production, would:
    //    - Deserialize the transaction
    //    - Add GASdf payment instructions
    //    - Sign with agent wallet keypair
    //
    // For hackathon demo without real wallet:
    if (!this.config.walletAddress) {
      throw new Error('Wallet address not configured - use dry run mode');
    }

    // Return the unsigned transaction (signing requires keypair)
    return {
      swapTransaction: swapTx,
      jupiterQuote,
      relayerQuote,
      needsSignature: true,
    };
  }

  /**
   * Submit signed transaction to relayer
   * @private
   */
  async _submitTransaction(quoteId, signedTxData) {
    const response = await fetch(`${this.config.relayerUrl}/v1/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId,
        signedTransaction: signedTxData.swapTransaction,
      }),
      signal: AbortSignal.timeout(this.config.confirmationTimeout),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Submit failed: ${error.error}`);
    }

    return response.json();
  }

  /**
   * Record execution to history
   * @private
   */
  _recordExecution(execution, success) {
    this.history.push({
      id: execution.id,
      timestamp: execution.timestamp,
      action: execution.action,
      token: execution.token,
      size: execution.size,
      success,
      signature: execution.signature,
      simulated: execution.simulated || false,
    });

    while (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Get execution history
   */
  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      dryRun: this.config.dryRun,
      relayerUrl: this.config.relayerUrl,
      activeExecutions: this.activeExecutions.size,
      metrics: { ...this.metrics },
      successRate: this.metrics.executionsAttempted > 0
        ? this.metrics.executionsSuccessful / this.metrics.executionsAttempted
        : 0,
    };
  }
}

// Export token mints for convenience
export { SOL_MINT, USDC_MINT };

export default Executor;
