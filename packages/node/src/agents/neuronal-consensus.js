/**
 * Neuronal Consensus - Action Potential Model
 *
 * Bio-inspired consensus mechanism based on neuronal action potentials.
 * Instead of discrete votes, Dogs emit "charges" that accumulate with
 * temporal decay. When the membrane potential crosses threshold, the
 * neuron "fires" - producing a consensus decision.
 *
 * Key properties:
 * - Temporal summation: rapid agreement amplifies, slow disagreement decays
 * - Spatial summation: multiple simultaneous inputs combine
 * - Refractory period: can't fire again immediately (natural debouncing)
 * - Inhibition dominance: REJECT is stronger than APPROVE (conservative bias)
 *
 * Inspired by K⁺/Na⁺ action potential dynamics.
 *
 * "Le seuil atteint, la décision jaillit" - κυνικός
 *
 * @module @cynic/node/agents/neuronal-consensus
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

/**
 * Neuronal constants - φ-aligned where possible
 */
export const NEURONAL_CONSTANTS = Object.freeze({
  // ═══════════════════════════════════════════════════════════════════════════
  // MEMBRANE POTENTIALS (arbitrary units, normalized scale)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Resting potential - baseline when no input */
  RESTING_POTENTIAL: -70,

  /** Threshold - crossing this triggers action potential */
  THRESHOLD: -55,

  /** Peak potential during action potential */
  PEAK_POTENTIAL: +40,

  /** Hyperpolarization floor (can't go below this) */
  FLOOR_POTENTIAL: -90,

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMING CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Membrane time constant τ (ms) - decay half-life ≈ τ × ln(2) ≈ 6.9s */
  MEMBRANE_TAU: 10_000,

  /** Absolute refractory period (ms) - cannot fire at all */
  REFRACTORY_ABSOLUTE: 3_000,

  /** Relative refractory period (ms) - can fire but threshold elevated */
  REFRACTORY_RELATIVE: 5_000,

  /** Integration window (ms) - charges older than this are forgotten */
  INTEGRATION_WINDOW: 30_000,

  /** Minimum time between charge inputs from same source (ms) */
  INPUT_DEBOUNCE: 500,

  // ═══════════════════════════════════════════════════════════════════════════
  // CHARGE VALUES (input from Dogs)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Depolarizing charge for APPROVE (positive, raises potential) */
  CHARGE_APPROVE: +15,

  /** Hyperpolarizing charge for REJECT (negative, lowers potential) */
  CHARGE_REJECT: -20,  // Asymmetric: inhibition > excitation

  /** No charge for ABSTAIN */
  CHARGE_ABSTAIN: 0,

  /** Maximum charge from high-confidence input */
  CHARGE_MAX: +25,

  /** Minimum charge (floor for low-confidence) */
  CHARGE_MIN: +5,

  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTATION (long-term plasticity)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Threshold elevation after fire (habituation) */
  THRESHOLD_ELEVATION: 2,

  /** Threshold recovery rate per second */
  THRESHOLD_RECOVERY: 0.5,

  /** Maximum threshold elevation */
  THRESHOLD_MAX_ELEVATION: 10,

  // ═══════════════════════════════════════════════════════════════════════════
  // φ-ALIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Threshold ratio: (threshold - rest) / (peak - rest) ≈ φ⁻²
   * -55 - (-70) / 40 - (-70) = 15/110 ≈ 0.136
   * Actually closer to φ⁻³ ≈ 0.236
   */
  PHI_THRESHOLD_RATIO: PHI_INV_2,
});

/**
 * Charge record from a Dog input
 */
class Charge {
  /**
   * @param {string} source - Dog ID
   * @param {number} amount - Charge amount (positive or negative)
   * @param {number} [timestamp] - When charge was received
   * @param {Object} [metadata] - Additional info
   */
  constructor(source, amount, timestamp = Date.now(), metadata = {}) {
    this.source = source;
    this.amount = amount;
    this.timestamp = timestamp;
    this.metadata = metadata;
  }

  /**
   * Calculate decayed charge at given time
   * @param {number} atTime - Time to calculate decay at
   * @param {number} tau - Time constant
   * @returns {number} Decayed charge amount
   */
  getDecayedAmount(atTime, tau = NEURONAL_CONSTANTS.MEMBRANE_TAU) {
    const age = atTime - this.timestamp;
    if (age < 0) return this.amount; // Future charge (shouldn't happen)
    const decayFactor = Math.exp(-age / tau);
    return this.amount * decayFactor;
  }
}

/**
 * Action potential event (fire event)
 */
class ActionPotential {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    this.timestamp = options.timestamp || Date.now();
    this.peakPotential = options.peakPotential || NEURONAL_CONSTANTS.PEAK_POTENTIAL;
    this.contributors = options.contributors || [];
    this.triggeringCharge = options.triggeringCharge || null;
    this.preFirePotential = options.preFirePotential || NEURONAL_CONSTANTS.THRESHOLD;
    this.totalCharges = options.totalCharges || 0;
  }

  /**
   * Get summary of this action potential
   */
  getSummary() {
    return {
      fired: true,
      timestamp: this.timestamp,
      contributors: this.contributors,
      trigger: this.triggeringCharge?.source || 'unknown',
      strength: this.preFirePotential - NEURONAL_CONSTANTS.RESTING_POTENTIAL,
    };
  }
}

/**
 * Neuronal Consensus Engine
 *
 * Simulates a biological neuron for collective decision-making.
 */
export class NeuronalConsensus {
  /**
   * @param {Object} options
   * @param {Object} [options.constants] - Override default constants
   * @param {boolean} [options.adaptive] - Enable adaptive threshold
   */
  constructor(options = {}) {
    this.constants = { ...NEURONAL_CONSTANTS, ...options.constants };
    this.adaptive = options.adaptive !== false;

    // Current membrane potential
    this.potential = this.constants.RESTING_POTENTIAL;

    // Charge history (for decay calculation)
    this.charges = [];

    // Last inputs by source (for debouncing)
    this.lastInputBySource = new Map();

    // Fire history
    this.actionPotentials = [];
    this.lastFireTime = 0;

    // Adaptive threshold
    this.thresholdElevation = 0;
    this.lastThresholdUpdate = Date.now();

    // Statistics
    this.stats = {
      totalCharges: 0,
      totalFires: 0,
      refractoryBlocks: 0,
      debounceBlocks: 0,
      chargesBySource: new Map(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Receive a charge from a Dog
   *
   * @param {string} dogId - Source Dog ID
   * @param {string} voteType - 'APPROVE', 'REJECT', or 'ABSTAIN'
   * @param {Object} [options]
   * @param {number} [options.confidence] - Confidence 0-1 (modulates charge)
   * @param {number} [options.weight] - Dog weight multiplier
   * @returns {Object} Result of charge processing
   */
  receiveCharge(dogId, voteType, options = {}) {
    const now = Date.now();
    const { confidence = 0.5, weight = 1 } = options;

    // Update adaptive threshold
    this._updateAdaptiveThreshold(now);

    // Check refractory period
    const refractoryState = this._checkRefractory(now);
    if (refractoryState.blocked) {
      this.stats.refractoryBlocks++;
      return {
        status: 'refractory',
        type: refractoryState.type,
        potential: this.potential,
        timeRemaining: refractoryState.remaining,
      };
    }

    // Check debounce for this source
    const lastInput = this.lastInputBySource.get(dogId);
    if (lastInput && (now - lastInput) < this.constants.INPUT_DEBOUNCE) {
      this.stats.debounceBlocks++;
      return {
        status: 'debounced',
        potential: this.potential,
        timeRemaining: this.constants.INPUT_DEBOUNCE - (now - lastInput),
      };
    }

    // Calculate charge amount
    const baseCharge = this.constants[`CHARGE_${voteType}`] || 0;
    if (baseCharge === 0) {
      return {
        status: 'abstain',
        potential: this.potential,
      };
    }

    // Modulate by confidence (higher confidence = stronger charge)
    const confidenceModulator = 0.5 + confidence * 0.5; // Range: 0.5-1.0
    const modulatedCharge = baseCharge * confidenceModulator * weight;

    // Clamp to valid range
    const finalCharge = Math.max(
      -Math.abs(this.constants.CHARGE_MAX),
      Math.min(Math.abs(this.constants.CHARGE_MAX), modulatedCharge)
    );

    // Create and store charge
    const charge = new Charge(dogId, finalCharge, now, {
      voteType,
      confidence,
      weight,
      originalCharge: baseCharge,
    });

    this.charges.push(charge);
    this.lastInputBySource.set(dogId, now);
    this.stats.totalCharges++;

    // Update source stats
    const sourceStats = this.stats.chargesBySource.get(dogId) || { count: 0, total: 0 };
    sourceStats.count++;
    sourceStats.total += finalCharge;
    this.stats.chargesBySource.set(dogId, sourceStats);

    // Recalculate membrane potential
    this._updatePotential(now);

    // Check for threshold crossing
    const effectiveThreshold = this._getEffectiveThreshold();
    if (this.potential >= effectiveThreshold) {
      return this._fire(now, charge);
    }

    return {
      status: 'integrating',
      potential: this.potential,
      threshold: effectiveThreshold,
      distanceToThreshold: effectiveThreshold - this.potential,
      chargeAccepted: finalCharge,
      totalActiveCharges: this.charges.length,
    };
  }

  /**
   * Get current state without adding charge
   *
   * @returns {Object} Current neuron state
   */
  getState() {
    const now = Date.now();
    const refractoryState = this._checkRefractory(now);

    // Don't recalculate potential during refractory - preserve fire state
    if (!refractoryState.blocked || refractoryState.type !== 'absolute') {
      this._updatePotential(now);
    }
    this._updateAdaptiveThreshold(now);

    const effectiveThreshold = this._getEffectiveThreshold();

    return {
      potential: this.potential,
      restingPotential: this.constants.RESTING_POTENTIAL,
      threshold: effectiveThreshold,
      baseThreshold: this.constants.THRESHOLD,
      thresholdElevation: this.thresholdElevation,
      distanceToThreshold: effectiveThreshold - this.potential,
      activeCharges: this.charges.length,
      refractory: refractoryState.blocked,
      refractoryType: refractoryState.type,
      refractoryRemaining: refractoryState.remaining,
      lastFire: this.lastFireTime,
      totalFires: this.stats.totalFires,
    };
  }

  /**
   * Force a state check and potential fire (for timeout-based decisions)
   *
   * @returns {Object|null} Action potential if fired, null otherwise
   */
  tick() {
    const now = Date.now();
    this._updatePotential(now);
    this._updateAdaptiveThreshold(now);

    const effectiveThreshold = this._getEffectiveThreshold();
    const refractoryState = this._checkRefractory(now);

    if (!refractoryState.blocked && this.potential >= effectiveThreshold) {
      return this._fire(now, null);
    }

    return null;
  }

  /**
   * Reset neuron to resting state
   */
  reset() {
    this.potential = this.constants.RESTING_POTENTIAL;
    this.charges = [];
    this.lastInputBySource.clear();
    this.thresholdElevation = 0;
    // Don't reset stats or action potential history
  }

  /**
   * Full reset including history
   */
  fullReset() {
    this.reset();
    this.actionPotentials = [];
    this.lastFireTime = 0;
    this.stats = {
      totalCharges: 0,
      totalFires: 0,
      refractoryBlocks: 0,
      debounceBlocks: 0,
      chargesBySource: new Map(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update membrane potential based on active charges
   * @private
   */
  _updatePotential(now) {
    const tau = this.constants.MEMBRANE_TAU;
    const rest = this.constants.RESTING_POTENTIAL;
    const window = this.constants.INTEGRATION_WINDOW;
    const floor = this.constants.FLOOR_POTENTIAL;

    // Remove old charges
    this.charges = this.charges.filter(c => (now - c.timestamp) < window);

    // Sum decayed charges
    let chargeSum = 0;
    for (const charge of this.charges) {
      chargeSum += charge.getDecayedAmount(now, tau);
    }

    // Potential = resting + sum of decayed charges
    this.potential = Math.max(floor, rest + chargeSum);
  }

  /**
   * Check refractory period state
   * @private
   */
  _checkRefractory(now) {
    if (this.lastFireTime === 0) {
      return { blocked: false, type: null, remaining: 0 };
    }

    const timeSinceFire = now - this.lastFireTime;
    const absoluteEnd = this.constants.REFRACTORY_ABSOLUTE;
    const relativeEnd = absoluteEnd + this.constants.REFRACTORY_RELATIVE;

    if (timeSinceFire < absoluteEnd) {
      return {
        blocked: true,
        type: 'absolute',
        remaining: absoluteEnd - timeSinceFire,
      };
    }

    if (timeSinceFire < relativeEnd) {
      return {
        blocked: false, // Can fire, but threshold elevated
        type: 'relative',
        remaining: relativeEnd - timeSinceFire,
        thresholdMultiplier: 1 + (relativeEnd - timeSinceFire) / this.constants.REFRACTORY_RELATIVE,
      };
    }

    return { blocked: false, type: null, remaining: 0 };
  }

  /**
   * Get effective threshold (with adaptations)
   * @private
   */
  _getEffectiveThreshold() {
    const now = Date.now();
    let threshold = this.constants.THRESHOLD;

    // Add adaptive elevation
    if (this.adaptive) {
      threshold += this.thresholdElevation;
    }

    // Add relative refractory elevation
    const refractoryState = this._checkRefractory(now);
    if (refractoryState.type === 'relative') {
      threshold *= refractoryState.thresholdMultiplier;
    }

    return threshold;
  }

  /**
   * Update adaptive threshold (decay toward baseline)
   * @private
   */
  _updateAdaptiveThreshold(now) {
    if (!this.adaptive) return;

    const elapsed = (now - this.lastThresholdUpdate) / 1000; // seconds
    const recovery = this.constants.THRESHOLD_RECOVERY * elapsed;

    this.thresholdElevation = Math.max(0, this.thresholdElevation - recovery);
    this.lastThresholdUpdate = now;
  }

  /**
   * Fire action potential
   * @private
   */
  _fire(now, triggeringCharge) {
    // Create action potential record
    const contributors = [...new Set(this.charges.map(c => c.source))];

    const ap = new ActionPotential({
      timestamp: now,
      peakPotential: this.constants.PEAK_POTENTIAL,
      contributors,
      triggeringCharge,
      preFirePotential: this.potential,
      totalCharges: this.charges.length,
    });

    this.actionPotentials.push(ap);
    this.stats.totalFires++;

    // Set potential to peak
    this.potential = this.constants.PEAK_POTENTIAL;
    this.lastFireTime = now;

    // Clear charges (neuron resets after fire)
    this.charges = [];

    // Elevate threshold (habituation)
    if (this.adaptive) {
      this.thresholdElevation = Math.min(
        this.constants.THRESHOLD_MAX_ELEVATION,
        this.thresholdElevation + this.constants.THRESHOLD_ELEVATION
      );
    }

    return {
      status: 'FIRED',
      actionPotential: ap.getSummary(),
      potential: this.potential,
      contributors,
      nextAvailable: now + this.constants.REFRACTORY_ABSOLUTE,
      thresholdElevation: this.thresholdElevation,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLECTIVE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Process votes from multiple Dogs at once
   *
   * @param {Array<Object>} votes - Array of { dogId, vote, confidence, weight }
   * @returns {Object} Consensus result
   */
  processVotes(votes) {
    const results = [];

    for (const { dogId, vote, confidence, weight } of votes) {
      const voteType = this._normalizeVote(vote);
      const result = this.receiveCharge(dogId, voteType, { confidence, weight });
      results.push({ dogId, result });

      // If we fired, stop processing
      if (result.status === 'FIRED') {
        return {
          consensus: true,
          decision: 'APPROVE', // Fire = approval
          ...result,
          votesProcessed: results.length,
          totalVotes: votes.length,
        };
      }
    }

    // No fire - check final state
    const state = this.getState();

    return {
      consensus: false,
      decision: null,
      potential: state.potential,
      threshold: state.threshold,
      distanceToThreshold: state.distanceToThreshold,
      votesProcessed: results.length,
      results,
    };
  }

  /**
   * Normalize vote string to standard format
   * @private
   */
  _normalizeVote(vote) {
    const normalized = String(vote).toUpperCase();
    if (normalized === 'ALLOW' || normalized === 'APPROVE' || normalized === 'YES') {
      return 'APPROVE';
    }
    if (normalized === 'BLOCK' || normalized === 'REJECT' || normalized === 'NO') {
      return 'REJECT';
    }
    return 'ABSTAIN';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS & EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get statistics summary
   */
  getStats() {
    return {
      ...this.stats,
      chargesBySource: Object.fromEntries(this.stats.chargesBySource),
      recentFires: this.actionPotentials.slice(-10).map(ap => ap.getSummary()),
      avgFireInterval: this._calculateAvgFireInterval(),
    };
  }

  /**
   * Calculate average interval between fires
   * @private
   */
  _calculateAvgFireInterval() {
    if (this.actionPotentials.length < 2) return null;

    let totalInterval = 0;
    for (let i = 1; i < this.actionPotentials.length; i++) {
      totalInterval += this.actionPotentials[i].timestamp - this.actionPotentials[i - 1].timestamp;
    }

    return totalInterval / (this.actionPotentials.length - 1);
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return {
      potential: this.potential,
      thresholdElevation: this.thresholdElevation,
      lastFireTime: this.lastFireTime,
      charges: this.charges.map(c => ({
        source: c.source,
        amount: c.amount,
        timestamp: c.timestamp,
        metadata: c.metadata,
      })),
      actionPotentials: this.actionPotentials.map(ap => ap.getSummary()),
      stats: this.getStats(),
    };
  }

  /**
   * Import state from persistence
   */
  importState(state) {
    if (state.potential !== undefined) this.potential = state.potential;
    if (state.thresholdElevation !== undefined) this.thresholdElevation = state.thresholdElevation;
    if (state.lastFireTime !== undefined) this.lastFireTime = state.lastFireTime;

    if (state.charges) {
      this.charges = state.charges.map(c =>
        new Charge(c.source, c.amount, c.timestamp, c.metadata)
      );
    }

    // Rebuild lastInputBySource from charges
    this.lastInputBySource.clear();
    for (const charge of this.charges) {
      const existing = this.lastInputBySource.get(charge.source) || 0;
      if (charge.timestamp > existing) {
        this.lastInputBySource.set(charge.source, charge.timestamp);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a neuronal consensus instance
 *
 * @param {Object} [options]
 * @returns {NeuronalConsensus}
 */
export function createNeuronalConsensus(options = {}) {
  return new NeuronalConsensus(options);
}

/**
 * Create a fast-firing neuron (lower threshold, shorter refractory)
 */
export function createFastNeuron() {
  return new NeuronalConsensus({
    constants: {
      THRESHOLD: -60,  // Easier to fire
      REFRACTORY_ABSOLUTE: 1000,
      REFRACTORY_RELATIVE: 2000,
      MEMBRANE_TAU: 5000,  // Faster decay
    },
  });
}

/**
 * Create a conservative neuron (higher threshold, longer refractory)
 */
export function createConservativeNeuron() {
  return new NeuronalConsensus({
    constants: {
      THRESHOLD: -45,  // Harder to fire
      CHARGE_REJECT: -30,  // Stronger inhibition
      REFRACTORY_ABSOLUTE: 5000,
      REFRACTORY_RELATIVE: 10000,
      MEMBRANE_TAU: 15000,  // Slower decay
    },
  });
}

/**
 * Create a security-focused neuron (strong inhibition, requires strong consensus)
 */
export function createSecurityNeuron() {
  return new NeuronalConsensus({
    constants: {
      THRESHOLD: -40,  // Very hard to fire
      CHARGE_APPROVE: +10,  // Weaker excitation
      CHARGE_REJECT: -40,   // Very strong inhibition
      REFRACTORY_ABSOLUTE: 10000,
      REFRACTORY_RELATIVE: 15000,
    },
    adaptive: true,
  });
}

// Singleton for default consensus
let _defaultNeuron = null;

/**
 * Get or create default neuronal consensus
 */
export function getDefaultNeuron() {
  if (!_defaultNeuron) {
    _defaultNeuron = createNeuronalConsensus();
  }
  return _defaultNeuron;
}

export default NeuronalConsensus;
