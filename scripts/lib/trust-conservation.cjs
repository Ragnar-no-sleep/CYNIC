/**
 * CYNIC Trust Conservation Module (Phase 8A)
 *
 * "La confiance ne se crée ni se détruit, elle se transforme" - κυνικός
 *
 * Applies conservation laws to trust in the ecosystem:
 * - Total ecosystem trust is constant (conservation)
 * - Trust transfers between entities (transformation)
 * - Trust cannot be created from nothing
 * - Trust decays slowly over time (entropy)
 *
 * Inspired by thermodynamics and conservation of energy.
 *
 * @module cynic/lib/trust-conservation
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI, PHI_INV, PHI_INV_2, PHI_INV_3 } = phiMath;

// =============================================================================
// CONSTANTS (φ-derived)
// =============================================================================

/** Initial ecosystem trust budget - φ × 1000 */
const INITIAL_TRUST_BUDGET = Math.round(PHI * 1000);

/** Minimum trust per entity - φ⁻³ × 100 */
const MINIMUM_TRUST = Math.round(PHI_INV_3 * 100);

/** Maximum trust per entity - φ × 100 */
const MAXIMUM_TRUST = Math.round(PHI * 100);

/** Trust decay rate per day - φ⁻³ */
const TRUST_DECAY_RATE = PHI_INV_3;

/** Trust transfer efficiency - φ⁻¹ (some is "lost" to entropy) */
const TRANSFER_EFFICIENCY = PHI_INV;

/** Trust regeneration rate per positive action - φ⁻² */
const REGENERATION_RATE = PHI_INV_2;

// =============================================================================
// STORAGE
// =============================================================================

const TRUST_DIR = path.join(os.homedir(), '.cynic', 'trust');
const STATE_FILE = path.join(TRUST_DIR, 'state.json');
const LEDGER_FILE = path.join(TRUST_DIR, 'ledger.jsonl');

// =============================================================================
// STATE
// =============================================================================

const trustState = {
  budget: INITIAL_TRUST_BUDGET,  // Total ecosystem trust
  entities: {},                   // Trust per entity
  entropy: 0,                     // Trust lost to entropy
  lastDecay: Date.now(),
  stats: {
    totalTransfers: 0,
    totalGenerated: 0,
    totalDecayed: 0,
    conservationViolations: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(TRUST_DIR)) {
    fs.mkdirSync(TRUST_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveState() {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    budget: trustState.budget,
    entities: trustState.entities,
    entropy: trustState.entropy,
    lastDecay: trustState.lastDecay,
    stats: trustState.stats,
  }, null, 2));
}

function appendToLedger(entry) {
  ensureDir();
  const line = JSON.stringify({ ...entry, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(LEDGER_FILE, line);
}

// =============================================================================
// TRUST OPERATIONS
// =============================================================================

/**
 * Get trust for an entity, initializing if needed
 * @param {string} entityId - Entity identifier
 * @returns {number} Current trust
 */
function getEntityTrust(entityId) {
  if (!trustState.entities[entityId]) {
    // New entity gets trust from the pool
    const initialTrust = Math.round(PHI_INV * 100); // ~62
    trustState.entities[entityId] = {
      trust: initialTrust,
      created: Date.now(),
      lastAction: Date.now(),
    };
    // This trust comes from the budget
    trustState.budget -= initialTrust;
  }
  return trustState.entities[entityId].trust;
}

/**
 * Transfer trust between entities
 * Conservation law: amount transferred = amount received × efficiency
 * The "lost" trust goes to entropy
 *
 * @param {string} fromId - Source entity
 * @param {string} toId - Target entity
 * @param {number} amount - Amount to transfer
 * @returns {Object} Transfer result
 */
function transferTrust(fromId, toId, amount) {
  const fromTrust = getEntityTrust(fromId);
  const toTrust = getEntityTrust(toId);

  // Can't transfer more than you have
  const actualAmount = Math.min(amount, fromTrust - MINIMUM_TRUST);
  if (actualAmount <= 0) {
    return {
      success: false,
      reason: 'Insufficient trust to transfer',
      fromTrust,
      toTrust,
    };
  }

  // Conservation: received = sent × efficiency
  const received = Math.round(actualAmount * TRANSFER_EFFICIENCY);
  const lostToEntropy = actualAmount - received;

  // Apply transfer
  trustState.entities[fromId].trust -= actualAmount;
  trustState.entities[toId].trust = Math.min(
    MAXIMUM_TRUST,
    trustState.entities[toId].trust + received
  );

  // Track entropy
  trustState.entropy += lostToEntropy;

  // Update timestamps
  trustState.entities[fromId].lastAction = Date.now();
  trustState.entities[toId].lastAction = Date.now();

  // Stats
  trustState.stats.totalTransfers++;

  // Log to ledger
  appendToLedger({
    type: 'transfer',
    from: fromId,
    to: toId,
    sent: actualAmount,
    received,
    entropy: lostToEntropy,
  });

  // Verify conservation
  verifyConservation();

  saveState();

  return {
    success: true,
    sent: actualAmount,
    received,
    lostToEntropy,
    fromTrust: trustState.entities[fromId].trust,
    toTrust: trustState.entities[toId].trust,
  };
}

/**
 * Generate trust from positive action
 * Trust is not created from nothing - it comes from the ecosystem budget
 *
 * @param {string} entityId - Entity performing action
 * @param {string} action - Action description
 * @returns {Object} Generation result
 */
function generateTrust(entityId, action) {
  const currentTrust = getEntityTrust(entityId);

  // Trust generation is limited by budget
  const potential = Math.round(REGENERATION_RATE * 100);
  const available = Math.min(potential, trustState.budget);

  if (available <= 0) {
    return {
      success: false,
      reason: 'Ecosystem trust budget exhausted',
      currentTrust,
      budget: trustState.budget,
    };
  }

  // Cap at maximum
  const canReceive = MAXIMUM_TRUST - currentTrust;
  const actual = Math.min(available, canReceive);

  // Apply generation
  trustState.entities[entityId].trust += actual;
  trustState.budget -= actual;
  trustState.entities[entityId].lastAction = Date.now();

  // Stats
  trustState.stats.totalGenerated += actual;

  // Log to ledger
  appendToLedger({
    type: 'generate',
    entity: entityId,
    action,
    amount: actual,
    remaining_budget: trustState.budget,
  });

  saveState();

  return {
    success: true,
    generated: actual,
    currentTrust: trustState.entities[entityId].trust,
    budgetRemaining: trustState.budget,
  };
}

/**
 * Apply trust decay (entropy)
 * Trust naturally decays over time if not maintained
 */
function applyDecay() {
  const now = Date.now();
  const daysSinceLastDecay = (now - trustState.lastDecay) / (24 * 60 * 60 * 1000);

  if (daysSinceLastDecay < 1) {
    return { decayed: 0 };
  }

  let totalDecayed = 0;

  for (const [entityId, entity] of Object.entries(trustState.entities)) {
    // Decay rate is proportional to time since last action
    const daysSinceAction = (now - entity.lastAction) / (24 * 60 * 60 * 1000);
    const decayMultiplier = Math.min(1, daysSinceAction / 7); // Full decay after 7 days inactive

    const decay = Math.round(entity.trust * TRUST_DECAY_RATE * decayMultiplier);

    if (decay > 0 && entity.trust > MINIMUM_TRUST) {
      const actualDecay = Math.min(decay, entity.trust - MINIMUM_TRUST);
      trustState.entities[entityId].trust -= actualDecay;
      trustState.entropy += actualDecay;
      totalDecayed += actualDecay;
    }
  }

  trustState.lastDecay = now;
  trustState.stats.totalDecayed += totalDecayed;

  if (totalDecayed > 0) {
    appendToLedger({
      type: 'decay',
      amount: totalDecayed,
      entities_affected: Object.keys(trustState.entities).length,
    });
    saveState();
  }

  return { decayed: totalDecayed };
}

/**
 * Verify conservation law
 * Total trust = budget + sum(entity trusts) + entropy
 */
function verifyConservation() {
  const entityTotal = Object.values(trustState.entities)
    .reduce((sum, e) => sum + e.trust, 0);

  const total = trustState.budget + entityTotal + trustState.entropy;
  const expected = INITIAL_TRUST_BUDGET;

  // Allow small rounding errors
  const error = Math.abs(total - expected);
  if (error > 1) {
    trustState.stats.conservationViolations++;
    appendToLedger({
      type: 'conservation_violation',
      expected,
      actual: total,
      error,
    });
    return false;
  }

  return true;
}

/**
 * Burn trust (permanently remove from ecosystem)
 * This is a "black hole" - trust that cannot be recovered
 *
 * @param {string} entityId - Entity burning trust
 * @param {number} amount - Amount to burn
 * @param {string} reason - Reason for burn
 * @returns {Object} Burn result
 */
function burnTrust(entityId, amount, reason) {
  const currentTrust = getEntityTrust(entityId);

  const actualBurn = Math.min(amount, currentTrust - MINIMUM_TRUST);
  if (actualBurn <= 0) {
    return {
      success: false,
      reason: 'Insufficient trust to burn',
    };
  }

  // Burn goes to entropy (permanent)
  trustState.entities[entityId].trust -= actualBurn;
  trustState.entropy += actualBurn;

  appendToLedger({
    type: 'burn',
    entity: entityId,
    amount: actualBurn,
    reason,
  });

  saveState();

  return {
    success: true,
    burned: actualBurn,
    remainingTrust: trustState.entities[entityId].trust,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize trust conservation
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    trustState.budget = saved.budget ?? INITIAL_TRUST_BUDGET;
    trustState.entities = saved.entities || {};
    trustState.entropy = saved.entropy || 0;
    trustState.lastDecay = saved.lastDecay || Date.now();
    trustState.stats = saved.stats || trustState.stats;
  }

  // Apply any pending decay
  applyDecay();
}

/**
 * Get ecosystem status
 * @returns {Object} Status
 */
function getStatus() {
  const entityTotal = Object.values(trustState.entities)
    .reduce((sum, e) => sum + e.trust, 0);

  return {
    budget: trustState.budget,
    entityTotal,
    entropy: trustState.entropy,
    total: trustState.budget + entityTotal + trustState.entropy,
    expected: INITIAL_TRUST_BUDGET,
    conserved: verifyConservation(),
    entityCount: Object.keys(trustState.entities).length,
    stats: trustState.stats,
  };
}

/**
 * Get trust leaderboard
 * @param {number} limit - Max entries
 * @returns {Object[]} Top entities by trust
 */
function getLeaderboard(limit = 10) {
  return Object.entries(trustState.entities)
    .map(([id, e]) => ({ id, trust: e.trust, lastAction: e.lastAction }))
    .sort((a, b) => b.trust - a.trust)
    .slice(0, limit);
}

/**
 * Format status for display
 * @returns {string} Formatted status
 */
function formatStatus() {
  const status = getStatus();
  const conservedEmoji = status.conserved ? '✅' : '⚠️';

  const lines = [
    '── TRUST CONSERVATION ─────────────────────────────────────',
    `   Budget:  ${status.budget} (pool disponible)`,
    `   Active:  ${status.entityTotal} (${status.entityCount} entités)`,
    `   Entropy: ${status.entropy} (perdu)`,
    `   Total:   ${status.total}/${status.expected} ${conservedEmoji}`,
    '',
    `   Transfers: ${status.stats.totalTransfers}`,
    `   Generated: ${status.stats.totalGenerated}`,
    `   Decayed:   ${status.stats.totalDecayed}`,
  ];

  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  INITIAL_TRUST_BUDGET,
  MINIMUM_TRUST,
  MAXIMUM_TRUST,
  TRANSFER_EFFICIENCY,

  // Core functions
  init,
  getStatus,
  getLeaderboard,

  // Trust operations
  getEntityTrust,
  transferTrust,
  generateTrust,
  burnTrust,
  applyDecay,

  // Conservation
  verifyConservation,

  // Display
  formatStatus,
};
