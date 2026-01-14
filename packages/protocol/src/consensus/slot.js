/**
 * Slot Manager
 *
 * Manages time-based slots for φ-BFT consensus
 *
 * Slot timing:
 * - Default slot duration: 400ms (Fibonacci: 0.4s ≈ F(8)/1000)
 * - Epoch = 432 slots (φ * F(13) = 1.618 * 233 ≈ 377, rounded to 432 for divisibility)
 * - Each validator gets proportional slots based on E-Score weight
 *
 * @module @cynic/protocol/consensus/slot
 */

'use strict';

import { PHI, PHI_INV } from '@cynic/core';

/**
 * Default slot duration in milliseconds
 * 400ms allows ~2.5 slots/second for fast finality
 */
export const SLOT_DURATION_MS = 400;

/**
 * Slots per epoch
 * 432 = 16 * 27 (highly divisible, near φ * F(13))
 */
export const SLOTS_PER_EPOCH = 432;

/**
 * Epoch duration in milliseconds
 */
export const EPOCH_DURATION_MS = SLOTS_PER_EPOCH * SLOT_DURATION_MS;

/**
 * Calculate current slot from genesis time
 *
 * @param {number} genesisTime - Genesis timestamp (ms)
 * @param {number} [now] - Current timestamp (ms), defaults to Date.now()
 * @param {number} [slotDuration] - Slot duration (ms)
 * @returns {number} Current slot number
 */
export function getCurrentSlot(genesisTime, now = Date.now(), slotDuration = SLOT_DURATION_MS) {
  if (now < genesisTime) return 0;
  return Math.floor((now - genesisTime) / slotDuration);
}

/**
 * Calculate current epoch from slot
 *
 * @param {number} slot - Slot number
 * @returns {number} Epoch number
 */
export function getEpochForSlot(slot) {
  return Math.floor(slot / SLOTS_PER_EPOCH);
}

/**
 * Get slot's position within its epoch
 *
 * @param {number} slot - Slot number
 * @returns {number} Position within epoch (0 to SLOTS_PER_EPOCH-1)
 */
export function getSlotIndexInEpoch(slot) {
  return slot % SLOTS_PER_EPOCH;
}

/**
 * Calculate time until next slot
 *
 * @param {number} genesisTime - Genesis timestamp (ms)
 * @param {number} [now] - Current timestamp (ms)
 * @param {number} [slotDuration] - Slot duration (ms)
 * @returns {number} Milliseconds until next slot
 */
export function timeUntilNextSlot(genesisTime, now = Date.now(), slotDuration = SLOT_DURATION_MS) {
  if (now < genesisTime) return genesisTime - now;
  const elapsed = (now - genesisTime) % slotDuration;
  return slotDuration - elapsed;
}

/**
 * Get timestamp for start of a slot
 *
 * @param {number} genesisTime - Genesis timestamp (ms)
 * @param {number} slot - Slot number
 * @param {number} [slotDuration] - Slot duration (ms)
 * @returns {number} Timestamp for slot start
 */
export function getSlotTimestamp(genesisTime, slot, slotDuration = SLOT_DURATION_MS) {
  return genesisTime + slot * slotDuration;
}

/**
 * Select leader for a slot using weighted random selection
 *
 * Uses φ-aligned deterministic selection based on:
 * - Slot number (determines randomness seed)
 * - Validator weights (E-Score × stake)
 *
 * @param {number} slot - Slot number
 * @param {Array<{id: string, weight: number}>} validators - Validator set with weights
 * @param {string} [epochSeed] - Optional epoch seed for additional randomness
 * @returns {string|null} Selected leader ID or null if no validators
 */
export function selectLeader(slot, validators, epochSeed = '') {
  if (!validators || validators.length === 0) return null;
  if (validators.length === 1) return validators[0].id;

  // Calculate total weight
  const totalWeight = validators.reduce((sum, v) => sum + (v.weight || 0), 0);
  if (totalWeight <= 0) {
    // Fallback to round-robin if no weights
    return validators[slot % validators.length].id;
  }

  // Generate deterministic pseudo-random number from slot
  // Use φ-based hash for golden ratio distribution
  const seed = slot * PHI + (epochSeed ? hashString(epochSeed) : 0);
  const random = (seed * PHI) % 1; // Fractional part gives 0-1 range

  // Weighted selection
  const target = random * totalWeight;
  let cumulative = 0;

  for (const validator of validators) {
    cumulative += validator.weight || 0;
    if (cumulative >= target) {
      return validator.id;
    }
  }

  // Fallback (shouldn't happen)
  return validators[validators.length - 1].id;
}

/**
 * Simple string hash for deterministic randomness
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Create leader schedule for an epoch
 *
 * @param {number} epoch - Epoch number
 * @param {Array<{id: string, weight: number}>} validators - Validator set
 * @param {string} [epochSeed] - Epoch seed
 * @returns {Array<string>} Array of leader IDs indexed by slot position
 */
export function createEpochSchedule(epoch, validators, epochSeed = '') {
  const schedule = [];
  const baseSlot = epoch * SLOTS_PER_EPOCH;
  const seed = epochSeed || `epoch-${epoch}`;

  for (let i = 0; i < SLOTS_PER_EPOCH; i++) {
    schedule.push(selectLeader(baseSlot + i, validators, seed));
  }

  return schedule;
}

/**
 * Slot Manager class for tracking slot timing
 */
export class SlotManager {
  /**
   * @param {Object} options - Configuration
   * @param {number} options.genesisTime - Genesis timestamp
   * @param {number} [options.slotDuration] - Slot duration in ms
   */
  constructor(options = {}) {
    this.genesisTime = options.genesisTime || Date.now();
    this.slotDuration = options.slotDuration || SLOT_DURATION_MS;
    this.validators = [];
    this.epochSchedules = new Map(); // epoch -> schedule
    this.timer = null;
    this.onSlot = null;
  }

  /**
   * Set validator set
   * @param {Array<{id: string, weight: number}>} validators - Validator set
   */
  setValidators(validators) {
    this.validators = validators;
    this.epochSchedules.clear(); // Invalidate cached schedules
  }

  /**
   * Get current slot
   * @returns {number} Current slot
   */
  getCurrentSlot() {
    return getCurrentSlot(this.genesisTime, Date.now(), this.slotDuration);
  }

  /**
   * Get current epoch
   * @returns {number} Current epoch
   */
  getCurrentEpoch() {
    return getEpochForSlot(this.getCurrentSlot());
  }

  /**
   * Get leader for a slot
   * @param {number} slot - Slot number
   * @returns {string|null} Leader ID
   */
  getLeader(slot) {
    const epoch = getEpochForSlot(slot);
    let schedule = this.epochSchedules.get(epoch);

    if (!schedule) {
      schedule = createEpochSchedule(epoch, this.validators);
      this.epochSchedules.set(epoch, schedule);

      // Prune old epochs (keep last 3)
      const minEpoch = epoch - 2;
      for (const e of this.epochSchedules.keys()) {
        if (e < minEpoch) this.epochSchedules.delete(e);
      }
    }

    return schedule[getSlotIndexInEpoch(slot)];
  }

  /**
   * Check if validator is leader for current slot
   * @param {string} validatorId - Validator ID to check
   * @returns {boolean} True if leader
   */
  isLeader(validatorId) {
    return this.getLeader(this.getCurrentSlot()) === validatorId;
  }

  /**
   * Start slot timer
   * @param {Function} callback - Called at each slot with (slot, isNewEpoch)
   */
  start(callback) {
    this.onSlot = callback;
    this._scheduleNextSlot();
  }

  /**
   * Stop slot timer
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.onSlot = null;
  }

  /**
   * Schedule next slot callback
   * @private
   */
  _scheduleNextSlot() {
    const delay = timeUntilNextSlot(this.genesisTime, Date.now(), this.slotDuration);

    this.timer = setTimeout(() => {
      const slot = this.getCurrentSlot();
      const isNewEpoch = getSlotIndexInEpoch(slot) === 0;

      if (this.onSlot) {
        this.onSlot(slot, isNewEpoch);
      }

      this._scheduleNextSlot();
    }, delay);
  }

  /**
   * Get slot info
   * @param {number} [slot] - Slot number (defaults to current)
   * @returns {Object} Slot information
   */
  getSlotInfo(slot = this.getCurrentSlot()) {
    const epoch = getEpochForSlot(slot);
    const indexInEpoch = getSlotIndexInEpoch(slot);
    const leader = this.getLeader(slot);
    const timestamp = getSlotTimestamp(this.genesisTime, slot, this.slotDuration);

    return {
      slot,
      epoch,
      indexInEpoch,
      leader,
      timestamp,
      isEpochStart: indexInEpoch === 0,
      isEpochEnd: indexInEpoch === SLOTS_PER_EPOCH - 1,
      slotsUntilEpochEnd: SLOTS_PER_EPOCH - indexInEpoch - 1,
    };
  }
}

export default {
  SLOT_DURATION_MS,
  SLOTS_PER_EPOCH,
  EPOCH_DURATION_MS,
  getCurrentSlot,
  getEpochForSlot,
  getSlotIndexInEpoch,
  timeUntilNextSlot,
  getSlotTimestamp,
  selectLeader,
  createEpochSchedule,
  SlotManager,
};
