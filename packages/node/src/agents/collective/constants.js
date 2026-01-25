/**
 * @cynic/node - CYNIC Constants and Enums
 *
 * φ-aligned constants for the CYNIC meta-agent.
 * Extracted from cynic.js for modularity.
 *
 * @module @cynic/node/agents/collective/constants
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

/**
 * φ-aligned constants for CYNIC
 */
export const CYNIC_CONSTANTS = {
  /** Max observed events (Fib(16) = 987) */
  MAX_OBSERVED_EVENTS: 987,

  /** Override threshold - only when veto level breached (φ⁻² = 38.2%) */
  OVERRIDE_THRESHOLD: PHI_INV_2,

  /** Decision confidence max (φ⁻¹ = 61.8%) */
  MAX_CONFIDENCE: PHI_INV,

  /** Pattern synthesis threshold (Fib(5) = 5 similar patterns) */
  SYNTHESIS_THRESHOLD: 5,

  /** Introspection interval in ms (Fib(11) = 89 seconds) */
  INTROSPECTION_INTERVAL_MS: 89000,

  /** Max synthesized patterns (Fib(13) = 233) */
  MAX_PATTERNS: 233,

  /** Wisdom distillation threshold (Fib(8) = 21 events) */
  WISDOM_THRESHOLD: 21,

  /** Meta-guidance cooldown in ms (Fib(10) = 55 seconds) */
  GUIDANCE_COOLDOWN_MS: 55000,

  /** Relationship learning rate (φ⁻³ ≈ 0.236) */
  LEARNING_RATE: PHI_INV_2 * PHI_INV,

  /** Relationship decay rate (φ⁻⁴ ≈ 0.146) */
  DECAY_RATE: PHI_INV_2 * PHI_INV_2,

  /** Minimum interaction count before relationship is considered learned (Fib(5) = 5) */
  MIN_INTERACTIONS: 5,

  /** Structure proposal threshold - suggest changes after Fib(8) = 21 learned patterns */
  STRUCTURE_PROPOSAL_THRESHOLD: 21,
};

/**
 * CYNIC decision types
 */
export const CynicDecisionType = {
  CONSENSUS_FINAL: 'consensus_final',     // Final word after collective consensus
  SYNTHESIS: 'synthesis',                  // Pattern synthesis across dogs
  OVERRIDE_APPROVED: 'override_approved',  // Approved an override
  GUIDANCE_ISSUED: 'guidance_issued',      // Issued meta-guidance
  INTROSPECTION_COMPLETE: 'introspection_complete', // Completed introspection
};

/**
 * CYNIC guidance types
 */
export const CynicGuidanceType = {
  BEHAVIORAL: 'behavioral',      // Adjust collective behavior
  STRATEGIC: 'strategic',        // Long-term strategy guidance
  PROTECTIVE: 'protective',      // Security/safety guidance
  HARMONIZING: 'harmonizing',    // Resolve conflicts between dogs
  PHILOSOPHICAL: 'philosophical', // φ-alignment reminders
};

/**
 * Meta-awareness state
 */
export const MetaState = {
  DORMANT: 'dormant',         // Not yet awakened this session
  AWAKENING: 'awakening',     // Currently waking up
  OBSERVING: 'observing',     // Passively observing the collective
  SYNTHESIZING: 'synthesizing', // Actively synthesizing patterns
  DECIDING: 'deciding',       // Making a decision
  GUIDING: 'guiding',         // Providing guidance
};
