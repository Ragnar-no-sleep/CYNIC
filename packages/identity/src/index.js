/**
 * @cynic/identity - CYNIC Identity Layer
 *
 * "Know thyself, then verify" - κυνικός
 *
 * Layer 6 of the 7-layer CYNIC architecture.
 *
 * Provides:
 * - KeyManager: Ed25519 cryptographic identity
 * - E-Score: Node reputation (burns × uptime × quality)
 * - NodeIdentity: Complete node identity
 * - ReputationGraph: Trust relationships between nodes
 *
 * ## Quick Start
 *
 * ```javascript
 * import { NodeIdentity } from '@cynic/identity';
 *
 * const identity = new NodeIdentity({
 *   keyfile: './node-key.json',
 *   datafile: './node-identity.json',
 * });
 *
 * await identity.initialize();
 *
 * console.log(identity.nodeId);  // Unique node ID
 * console.log(identity.eScore);  // Current E-Score
 *
 * // Sign data
 * const sig = identity.sign('hello world');
 *
 * // Record activity
 * identity.heartbeat();
 * identity.recordJudgment('jdg_123', true);
 * identity.recordBurn(1000000, 'tx_signature');
 * ```
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │  IDENTITY LAYER (Layer 6)                               │
 * ├─────────────────────────────────────────────────────────┤
 * │  NodeIdentity                                           │
 * │  ├─ KeyManager (Ed25519 keys)                           │
 * │  ├─ EScoreCalculator (reputation)                       │
 * │  └─ BurnVerifier (optional, from @cynic/burns)          │
 * ├─────────────────────────────────────────────────────────┤
 * │  ReputationGraph                                        │
 * │  ├─ Trust relationships                                 │
 * │  ├─ Transitive trust (BFS)                              │
 * │  └─ φ-decay over time                                   │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * @module @cynic/identity
 */

'use strict';

// Key management
export {
  KeyManager,
  createKeyManager,
  generateKeypair,
  deriveNodeId,
} from './key-manager.js';

// E-Score calculation (3-dimension legacy)
export {
  EScoreCalculator,
  createEScoreCalculator,
  calculateEScore,
  normalizeBurns,
  normalizeUptime,
  normalizeQuality,
  getStatus as getEScoreStatus,
  WEIGHTS as ESCORE_WEIGHTS,
  THRESHOLDS as ESCORE_THRESHOLDS,
} from './e-score.js';

// E-Score 7D (full 7-dimension calculation)
export {
  EScore7DCalculator,
  createEScore7DCalculator,
  calculateEScore7D,
  getTrustLevel,
  toDbFormat as escoreToDbFormat,
  normalizeHold,
  normalizeBuild,
  normalizeJudge,
  normalizeBurn,
  normalizeStake,
  normalizeShare,
  normalizeTrust,
  DIMENSIONS as ESCORE_7D_DIMENSIONS,
  THRESHOLDS as ESCORE_7D_THRESHOLDS,
  TRUST_LEVELS,
  TOTAL_WEIGHT as ESCORE_7D_TOTAL_WEIGHT,
} from './e-score-7d.js';

// Node identity
export {
  NodeIdentity,
  createNodeIdentity,
  IdentityStatus,
} from './node-identity.js';

// Reputation graph
export {
  ReputationGraph,
  createReputationGraph,
  TrustLevel,
  TRUST_DECAY_RATE,
  MAX_PROPAGATION_DEPTH,
} from './reputation-graph.js';
