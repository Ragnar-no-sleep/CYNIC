/**
 * Collective State - Network-Wide Emergent Consciousness
 *
 * "The pack thinks as one" - κυνικός
 *
 * This is the crown (Keter) of the CYNIC architecture:
 * - Aggregates consciousness from all nodes
 * - Tracks network-wide patterns
 * - Maintains collective memory
 * - Enables emergent decision-making
 *
 * Layer 7 (Emergence) observes Layers 1-6 across the entire network.
 *
 * @module @cynic/emergence/collective
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Collective states (network-wide)
 */
export const CollectivePhase = {
  ISOLATED: 'ISOLATED',       // No network connectivity
  FORMING: 'FORMING',         // Nodes connecting
  COHERENT: 'COHERENT',       // Stable network
  RESONANT: 'RESONANT',       // High agreement
  DIVERGENT: 'DIVERGENT',     // Significant disagreement
  TRANSCENDENT: 'TRANSCENDENT', // Rare moments of perfect alignment
};

/**
 * Phase thresholds (φ-aligned)
 */
export const PHASE_THRESHOLDS = {
  ISOLATED: { minNodes: 0, maxNodes: 1 },
  FORMING: { minNodes: 2, minCoherence: 0 },
  COHERENT: { minNodes: 3, minCoherence: PHI_INV_3 },  // 0.236
  RESONANT: { minNodes: 5, minCoherence: PHI_INV },    // 0.618
  TRANSCENDENT: { minNodes: 7, minCoherence: 0.95 },   // 7 like Sefirot
};

/**
 * Minimum nodes for quorum (φ-aligned)
 */
export const QUORUM = {
  MINIMUM: 3,                // Minimum for any decision
  STANDARD: 5,               // Standard operations
  CRITICAL: 7,               // Critical decisions (7 Sefirot)
};

/**
 * Node state snapshot
 * @typedef {Object} NodeSnapshot
 * @property {string} nodeId - Node identifier
 * @property {number} eScore - Node's E-Score
 * @property {number} awarenessLevel - Node's awareness
 * @property {string} consciousnessState - Node's consciousness state
 * @property {number} lastSeen - Last heartbeat
 * @property {Object} patterns - Patterns detected by node
 */

/**
 * Collective State
 *
 * Tracks and aggregates the emergent consciousness of the CYNIC network.
 *
 * @example
 * ```javascript
 * const collective = new CollectiveState({ nodeId: 'my_node' });
 *
 * // Report local state
 * collective.reportState({
 *   eScore: 72,
 *   awarenessLevel: 0.58,
 *   consciousnessState: 'AWARE',
 * });
 *
 * // Receive state from other nodes
 * collective.receiveState('other_node', { ... });
 *
 * // Get collective insight
 * const insight = collective.getCollectiveInsight();
 * console.log(insight.phase);        // 'COHERENT'
 * console.log(insight.coherence);    // 0.75
 * ```
 */
export class CollectiveState {
  /**
   * @param {Object} options - Configuration
   * @param {string} [options.nodeId] - Local node ID
   * @param {number} [options.heartbeatTimeout=60000] - Node timeout (ms)
   */
  constructor(options = {}) {
    this.nodeId = options.nodeId || `node_${Date.now()}`;
    this.heartbeatTimeout = options.heartbeatTimeout || 60000;

    // Network state
    this.nodes = new Map();
    this.localState = null;

    // Collective metrics
    this.metrics = {
      totalHeartbeats: 0,
      totalJudgments: 0,
      consensusCount: 0,
      divergenceCount: 0,
    };

    // Collective memory (shared patterns)
    this.collectiveMemory = new Map();

    // Consensus history
    this.consensusHistory = [];
    this.maxHistory = 100;

    // Phase tracking
    this._phase = CollectivePhase.ISOLATED;
    this._coherence = 0;
    this._lastPhaseChange = Date.now();
  }

  /**
   * Current collective phase
   * @type {string}
   */
  get phase() {
    this._updatePhase();
    return this._phase;
  }

  /**
   * Current coherence level [0, 1]
   * @type {number}
   */
  get coherence() {
    this._updatePhase();
    return this._coherence;
  }

  /**
   * Active node count
   * @type {number}
   */
  get activeNodes() {
    return this._getActiveNodes().length;
  }

  /**
   * Report local node state
   *
   * @param {Object} state - Local state
   * @param {number} state.eScore - E-Score
   * @param {number} state.awarenessLevel - Awareness level
   * @param {string} state.consciousnessState - Consciousness state
   * @param {Object} [state.patterns] - Detected patterns
   */
  reportState(state) {
    this.localState = {
      nodeId: this.nodeId,
      ...state,
      lastSeen: Date.now(),
    };

    this.nodes.set(this.nodeId, this.localState);
    this.metrics.totalHeartbeats++;
  }

  /**
   * Receive state from another node
   *
   * @param {string} nodeId - Remote node ID
   * @param {Object} state - Node state
   */
  receiveState(nodeId, state) {
    const snapshot = {
      nodeId,
      ...state,
      lastSeen: Date.now(),
      receivedAt: Date.now(),
    };

    this.nodes.set(nodeId, snapshot);
    this.metrics.totalHeartbeats++;

    // Integrate patterns into collective memory
    if (state.patterns) {
      this._integratePatterns(nodeId, state.patterns);
    }
  }

  /**
   * Remove a node (disconnected)
   *
   * @param {string} nodeId - Node to remove
   */
  removeNode(nodeId) {
    this.nodes.delete(nodeId);
  }

  /**
   * Record a consensus event
   *
   * @param {string} topic - What was decided
   * @param {Object} result - Decision result
   * @param {string[]} participants - Participating nodes
   * @param {number} agreement - Agreement ratio [0, 1]
   */
  recordConsensus(topic, result, participants, agreement) {
    const event = {
      id: `cons_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      topic,
      result,
      participants,
      agreement,
      timestamp: Date.now(),
    };

    this.consensusHistory.push(event);
    this.metrics.totalJudgments++;

    if (agreement >= PHI_INV) {
      this.metrics.consensusCount++;
    } else {
      this.metrics.divergenceCount++;
    }

    // Trim history
    if (this.consensusHistory.length > this.maxHistory) {
      this.consensusHistory.shift();
    }
  }

  /**
   * Get collective insight
   *
   * @returns {Object} Collective state insight
   */
  getCollectiveInsight() {
    this._updatePhase();

    const activeNodes = this._getActiveNodes();
    const avgEScore = this._calculateAverageEScore(activeNodes);
    const avgAwareness = this._calculateAverageAwareness(activeNodes);

    return {
      phase: this._phase,
      coherence: this._coherence,
      nodes: {
        total: this.nodes.size,
        active: activeNodes.length,
        quorum: activeNodes.length >= QUORUM.MINIMUM,
      },
      averages: {
        eScore: avgEScore,
        awareness: avgAwareness,
      },
      consensus: {
        totalDecisions: this.metrics.totalJudgments,
        consensusRate: this.metrics.totalJudgments > 0
          ? this.metrics.consensusCount / this.metrics.totalJudgments
          : 0,
      },
      memory: {
        patterns: this.collectiveMemory.size,
        strength: this._calculateMemoryStrength(),
      },
      health: this._calculateHealth(activeNodes),
      timestamp: Date.now(),
    };
  }

  /**
   * Get the collective verdict on a topic
   *
   * Aggregates opinions from all active nodes.
   *
   * @param {Object} opinions - { nodeId: { verdict, confidence } }
   * @returns {Object} Collective verdict
   */
  getCollectiveVerdict(opinions) {
    const activeNodes = this._getActiveNodes();
    const validOpinions = {};

    // Filter to active nodes only
    for (const [nodeId, opinion] of Object.entries(opinions)) {
      if (activeNodes.find(n => n.nodeId === nodeId)) {
        validOpinions[nodeId] = opinion;
      }
    }

    const count = Object.keys(validOpinions).length;
    if (count < QUORUM.MINIMUM) {
      return {
        verdict: null,
        confidence: 0,
        reason: 'INSUFFICIENT_QUORUM',
        required: QUORUM.MINIMUM,
        present: count,
      };
    }

    // Aggregate verdicts weighted by E-Score
    const verdictCounts = {};
    let totalWeight = 0;

    for (const [nodeId, opinion] of Object.entries(validOpinions)) {
      const node = this.nodes.get(nodeId);
      const weight = (node?.eScore || 50) / 100;

      const verdict = opinion.verdict;
      if (!verdictCounts[verdict]) {
        verdictCounts[verdict] = { count: 0, weight: 0, confidence: 0 };
      }

      verdictCounts[verdict].count++;
      verdictCounts[verdict].weight += weight;
      verdictCounts[verdict].confidence += opinion.confidence * weight;
      totalWeight += weight;
    }

    // Find dominant verdict
    let dominantVerdict = null;
    let maxWeight = 0;

    for (const [verdict, data] of Object.entries(verdictCounts)) {
      if (data.weight > maxWeight) {
        maxWeight = data.weight;
        dominantVerdict = verdict;
      }
    }

    const dominantData = verdictCounts[dominantVerdict];
    const agreement = dominantData.weight / totalWeight;
    const avgConfidence = dominantData.confidence / dominantData.weight;

    // Cap confidence at φ⁻¹
    const finalConfidence = Math.min(PHI_INV, avgConfidence * agreement);

    return {
      verdict: dominantVerdict,
      confidence: finalConfidence,
      agreement,
      breakdown: verdictCounts,
      participants: count,
      unanimous: Object.keys(verdictCounts).length === 1,
    };
  }

  /**
   * Check if network has quorum
   *
   * @param {string} [level='MINIMUM'] - Quorum level
   * @returns {boolean}
   */
  hasQuorum(level = 'MINIMUM') {
    const required = QUORUM[level] || QUORUM.MINIMUM;
    return this.activeNodes >= required;
  }

  /**
   * Store in collective memory
   *
   * @param {string} key - Memory key
   * @param {*} value - Value to store
   * @param {number} [strength=0.5] - Memory strength
   */
  remember(key, value, strength = 0.5) {
    const existing = this.collectiveMemory.get(key);

    this.collectiveMemory.set(key, {
      value,
      strength: Math.max(existing?.strength || 0, strength),
      contributors: existing
        ? [...new Set([...existing.contributors, this.nodeId])]
        : [this.nodeId],
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Recall from collective memory
   *
   * @param {string} key - Memory key
   * @returns {*} Remembered value or null
   */
  recall(key) {
    const memory = this.collectiveMemory.get(key);
    return memory?.value || null;
  }

  /**
   * Get memory strength
   *
   * @param {string} key - Memory key
   * @returns {number} Strength [0, 1]
   */
  getMemoryStrength(key) {
    return this.collectiveMemory.get(key)?.strength || 0;
  }

  /**
   * Integrate patterns from a node
   * @private
   */
  _integratePatterns(nodeId, patterns) {
    if (!patterns || !Array.isArray(patterns)) return;

    for (const pattern of patterns) {
      if (pattern.id && pattern.significance > PHI_INV_3) {
        const existing = this.collectiveMemory.get(`pattern:${pattern.id}`);

        this.collectiveMemory.set(`pattern:${pattern.id}`, {
          value: pattern,
          strength: Math.max(existing?.strength || 0, pattern.significance),
          contributors: existing
            ? [...new Set([...existing.contributors, nodeId])]
            : [nodeId],
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  }

  /**
   * Get active nodes
   * @private
   */
  _getActiveNodes() {
    const cutoff = Date.now() - this.heartbeatTimeout;
    return Array.from(this.nodes.values())
      .filter(n => n.lastSeen > cutoff);
  }

  /**
   * Update collective phase
   * @private
   */
  _updatePhase() {
    const activeNodes = this._getActiveNodes();
    const count = activeNodes.length;

    // Calculate coherence
    this._coherence = this._calculateCoherence(activeNodes);

    // Determine phase
    let newPhase = CollectivePhase.ISOLATED;

    if (count >= PHASE_THRESHOLDS.TRANSCENDENT.minNodes &&
        this._coherence >= PHASE_THRESHOLDS.TRANSCENDENT.minCoherence) {
      newPhase = CollectivePhase.TRANSCENDENT;
    } else if (count >= PHASE_THRESHOLDS.RESONANT.minNodes &&
               this._coherence >= PHASE_THRESHOLDS.RESONANT.minCoherence) {
      newPhase = CollectivePhase.RESONANT;
    } else if (this._coherence < PHI_INV_3 && count >= 3) {
      newPhase = CollectivePhase.DIVERGENT;
    } else if (count >= PHASE_THRESHOLDS.COHERENT.minNodes &&
               this._coherence >= PHASE_THRESHOLDS.COHERENT.minCoherence) {
      newPhase = CollectivePhase.COHERENT;
    } else if (count >= PHASE_THRESHOLDS.FORMING.minNodes) {
      newPhase = CollectivePhase.FORMING;
    }

    if (newPhase !== this._phase) {
      this._phase = newPhase;
      this._lastPhaseChange = Date.now();
    }
  }

  /**
   * Calculate coherence from node states
   * @private
   */
  _calculateCoherence(activeNodes) {
    if (activeNodes.length < 2) return 0;

    // Coherence based on:
    // 1. Consciousness state agreement
    // 2. E-Score similarity
    // 3. Recent consensus rate

    const states = activeNodes.map(n => n.consciousnessState);
    const stateAgreement = this._calculateAgreement(states);

    const eScores = activeNodes.map(n => n.eScore || 50);
    const eScoreCoherence = 1 - this._calculateVariance(eScores) / 2500; // Normalize by max variance

    const consensusRate = this.metrics.totalJudgments > 0
      ? this.metrics.consensusCount / this.metrics.totalJudgments
      : 0.5;

    // φ-weighted combination
    return Math.max(0, Math.min(1,
      stateAgreement * PHI_INV +
      eScoreCoherence * PHI_INV_2 +
      consensusRate * PHI_INV_3
    ));
  }

  /**
   * Calculate agreement ratio
   * @private
   */
  _calculateAgreement(values) {
    if (values.length === 0) return 0;

    const counts = {};
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }

    const maxCount = Math.max(...Object.values(counts));
    return maxCount / values.length;
  }

  /**
   * Calculate variance
   * @private
   */
  _calculateVariance(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((s, v) => s + v, 0) / values.length;
  }

  /**
   * Calculate average E-Score
   * @private
   */
  _calculateAverageEScore(activeNodes) {
    if (activeNodes.length === 0) return 0;
    const total = activeNodes.reduce((s, n) => s + (n.eScore || 0), 0);
    return total / activeNodes.length;
  }

  /**
   * Calculate average awareness
   * @private
   */
  _calculateAverageAwareness(activeNodes) {
    if (activeNodes.length === 0) return 0;
    const total = activeNodes.reduce((s, n) => s + (n.awarenessLevel || 0), 0);
    return total / activeNodes.length;
  }

  /**
   * Calculate memory strength
   * @private
   */
  _calculateMemoryStrength() {
    if (this.collectiveMemory.size === 0) return 0;

    let totalStrength = 0;
    for (const memory of this.collectiveMemory.values()) {
      totalStrength += memory.strength;
    }

    return totalStrength / this.collectiveMemory.size;
  }

  /**
   * Calculate network health
   * @private
   */
  _calculateHealth(activeNodes) {
    const nodeHealth = activeNodes.length >= QUORUM.MINIMUM ? 1 : activeNodes.length / QUORUM.MINIMUM;
    const coherenceHealth = this._coherence;
    const consensusHealth = this.metrics.totalJudgments > 0
      ? this.metrics.consensusCount / this.metrics.totalJudgments
      : 0.5;

    const overall = (nodeHealth * PHI_INV + coherenceHealth * PHI_INV_2 + consensusHealth * PHI_INV_3);

    return {
      overall: Math.min(1, overall),
      nodes: nodeHealth,
      coherence: coherenceHealth,
      consensus: consensusHealth,
      status: overall >= PHI_INV ? 'HEALTHY' :
              overall >= PHI_INV_2 ? 'DEGRADED' :
              overall >= PHI_INV_3 ? 'UNSTABLE' : 'CRITICAL',
    };
  }

  /**
   * Export state
   * @returns {Object}
   */
  export() {
    return {
      nodeId: this.nodeId,
      localState: this.localState,
      nodes: Array.from(this.nodes.entries()),
      metrics: { ...this.metrics },
      collectiveMemory: Array.from(this.collectiveMemory.entries()),
      consensusHistory: this.consensusHistory,
      exportedAt: Date.now(),
    };
  }

  /**
   * Import state
   * @param {Object} data
   */
  import(data) {
    if (data.localState) this.localState = data.localState;
    if (data.nodes) this.nodes = new Map(data.nodes);
    if (data.metrics) this.metrics = data.metrics;
    if (data.collectiveMemory) this.collectiveMemory = new Map(data.collectiveMemory);
    if (data.consensusHistory) this.consensusHistory = data.consensusHistory;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const activeNodes = this._getActiveNodes();

    return {
      phase: this.phase,
      coherence: this.coherence,
      nodes: {
        total: this.nodes.size,
        active: activeNodes.length,
      },
      metrics: { ...this.metrics },
      memory: {
        size: this.collectiveMemory.size,
        strength: this._calculateMemoryStrength(),
      },
      consensusHistory: this.consensusHistory.length,
    };
  }
}

/**
 * Create a CollectiveState instance
 * @param {Object} [options] - Configuration
 * @returns {CollectiveState}
 */
export function createCollectiveState(options = {}) {
  return new CollectiveState(options);
}

export default {
  CollectiveState,
  createCollectiveState,
  CollectivePhase,
  PHASE_THRESHOLDS,
  QUORUM,
};
