/**
 * Ambient Consensus - Automatic Dog Voting
 *
 * "Le pack décide ensemble" - CYNIC
 *
 * Triggers consensus automatically when:
 * - Confidence < φ⁻¹ (61.8%)
 * - Dangerous operations detected
 * - Significant decisions needed
 *
 * @module @cynic/node/agents/collective/ambient-consensus
 */

'use strict';

import { createLogger, PHI_INV, PHI_INV_2 } from '@cynic/core';
import { EventType, getEventBus } from '../../services/event-bus.js';

const log = createLogger('AmbientConsensus');

// ═══════════════════════════════════════════════════════════════════════════
// φ-ALIGNED THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

export const CONSENSUS_THRESHOLDS = {
  LOW_CONFIDENCE: PHI_INV,        // 61.8% - trigger consensus
  CRITICAL_CONFIDENCE: PHI_INV_2, // 38.2% - always trigger
  AGREEMENT_THRESHOLD: PHI_INV,   // 61.8% - needed to pass
  VOTE_TIMEOUT_MS: 5000,          // 5 seconds timeout
  MIN_VOTERS: 3,                  // Fib(4) = 3 minimum voters
};

// ═══════════════════════════════════════════════════════════════════════════
// INTER-DOG SIGNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const DogSignal = {
  DANGER_DETECTED: 'dog:danger_detected',      // Guardian → All
  PATTERN_FOUND: 'dog:pattern_found',          // Analyst → Scout, Sage
  RECOMMENDATION: 'dog:recommendation',         // Sage → All
  ANALYSIS_COMPLETE: 'dog:analysis_complete',  // Analyst → Scholar
  CONSENSUS_NEEDED: 'dog:consensus_needed',    // Any → All
  WISDOM_SHARED: 'dog:wisdom_shared',          // Sage → All
  EXPLORATION_RESULT: 'dog:exploration_result', // Scout → Cartographer
};

// ═══════════════════════════════════════════════════════════════════════════
// AMBIENT CONSENSUS CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AmbientConsensus - Automatic Dog consensus triggering
 *
 * Listens to events and triggers consensus when needed.
 */
export class AmbientConsensus {
  constructor({ collectivePack, eventBus = null }) {
    this.pack = collectivePack;
    this.eventBus = eventBus || getEventBus();
    this._running = false;
    this._consensusCount = 0;
    this._lastConsensus = null;

    // Bind methods
    this._onPreToolUse = this._onPreToolUse.bind(this);
    this._onPostToolUse = this._onPostToolUse.bind(this);
    this._onDogSignal = this._onDogSignal.bind(this);
  }

  /**
   * Start ambient consensus monitoring
   */
  start() {
    if (this._running) return;

    // Subscribe to hook events
    this.eventBus.subscribe(EventType.HOOK_PRE_TOOL, 'AmbientConsensus', this._onPreToolUse);
    this.eventBus.subscribe(EventType.HOOK_POST_TOOL, 'AmbientConsensus', this._onPostToolUse);

    // Subscribe to dog signals
    Object.values(DogSignal).forEach(signal => {
      this.eventBus.subscribe(signal, 'AmbientConsensus', this._onDogSignal);
    });

    this._running = true;
    log.info('Ambient consensus started', { thresholds: CONSENSUS_THRESHOLDS });
  }

  /**
   * Stop ambient consensus monitoring
   */
  stop() {
    if (!this._running) return;

    this.eventBus.unsubscribe(EventType.HOOK_PRE_TOOL, 'AmbientConsensus');
    this.eventBus.unsubscribe(EventType.HOOK_POST_TOOL, 'AmbientConsensus');

    Object.values(DogSignal).forEach(signal => {
      this.eventBus.unsubscribe(signal, 'AmbientConsensus');
    });

    this._running = false;
    log.info('Ambient consensus stopped');
  }

  /**
   * Handle PreToolUse events
   * - Guardian checks safety
   * - If dangerous or low confidence → trigger consensus
   */
  async _onPreToolUse(event) {
    const { tool, input, confidence = 1.0 } = event.payload || {};

    try {
      // 1. Guardian safety check (always)
      if (this.pack.guardian?.checkCommand) {
        const guardianResult = await this.pack.guardian.checkCommand({
          command: tool,
          args: input,
        });

        if (guardianResult?.blocked) {
          // Guardian veto - emit signal
          this.eventBus.publish(DogSignal.DANGER_DETECTED, {
            source: 'guardian',
            tool,
            reason: guardianResult.reason,
          });

          log.warn('Guardian blocked operation', { tool, reason: guardianResult.reason });
          return { blocked: true, reason: guardianResult.reason };
        }
      }

      // 2. Check if consensus needed (low confidence)
      if (confidence < CONSENSUS_THRESHOLDS.LOW_CONFIDENCE) {
        log.debug('Low confidence detected, triggering consensus', { tool, confidence });

        const consensusResult = await this.triggerConsensus({
          topic: `pre_tool:${tool}`,
          context: { tool, input, confidence },
          reason: `Confidence ${(confidence * 100).toFixed(1)}% < ${(CONSENSUS_THRESHOLDS.LOW_CONFIDENCE * 100).toFixed(1)}%`,
        });

        if (!consensusResult.approved) {
          return { blocked: true, reason: 'Consensus rejected', votes: consensusResult.votes };
        }
      }

      return { blocked: false };
    } catch (e) {
      log.error('PreToolUse consensus error', { tool, error: e.message });
      return { blocked: false }; // Fail open
    }
  }

  /**
   * Handle PostToolUse events
   * - Analyst analyzes result
   * - If patterns found → notify other Dogs
   * - Sage shares wisdom if relevant
   */
  async _onPostToolUse(event) {
    const { tool, result, success, error } = event.payload || {};

    try {
      // 1. Analyst analysis (always)
      if (this.pack.analyst?.analyze) {
        const analysis = await Promise.race([
          this.pack.analyst.analyze({ tool, result, success, error }),
          new Promise(resolve => setTimeout(() => resolve(null), 2000)), // 2s timeout
        ]);

        if (analysis?.patterns?.length > 0) {
          // Emit pattern found signal
          this.eventBus.publish(DogSignal.PATTERN_FOUND, {
            source: 'analyst',
            patterns: analysis.patterns,
            tool,
          });

          // Scout explores if new patterns
          if (this.pack.scout?.explore && analysis.patterns.some(p => p.isNew)) {
            this.pack.scout.explore({ patterns: analysis.patterns }).catch(() => {});
          }
        }

        if (analysis?.anomalies?.length > 0) {
          // Trigger consensus on anomalies
          await this.triggerConsensus({
            topic: `anomaly:${tool}`,
            context: { tool, anomalies: analysis.anomalies },
            reason: `${analysis.anomalies.length} anomalies detected`,
          });
        }
      }

      // 2. Scholar extracts knowledge (if relevant)
      if (this.pack.scholar?.extractKnowledge && success) {
        this.pack.scholar.extractKnowledge({ tool, result }).catch(() => {});
      }

      // 3. Sage shares wisdom on errors
      if (this.pack.sage?.shareWisdom && error) {
        const wisdom = await this.pack.sage.shareWisdom({
          topic: 'error_recovery',
          context: { tool, error },
        });

        if (wisdom) {
          this.eventBus.publish(DogSignal.WISDOM_SHARED, {
            source: 'sage',
            wisdom,
            tool,
          });
        }
      }
    } catch (e) {
      log.error('PostToolUse analysis error', { tool, error: e.message });
    }
  }

  /**
   * Handle inter-dog signals
   */
  async _onDogSignal(event) {
    const { source, ...data } = event.payload || {};

    log.trace('Dog signal received', { type: event.type, source });

    // React to specific signals
    switch (event.type) {
      case DogSignal.DANGER_DETECTED:
        // All dogs should be aware
        if (this.pack.cynic?.alert) {
          this.pack.cynic.alert(data);
        }
        break;

      case DogSignal.PATTERN_FOUND:
        // Cartographer updates map
        if (this.pack.cartographer?.updateMap) {
          this.pack.cartographer.updateMap(data.patterns);
        }
        break;

      case DogSignal.CONSENSUS_NEEDED:
        // Trigger consensus
        await this.triggerConsensus(data);
        break;
    }
  }

  /**
   * Trigger consensus vote across all Dogs
   *
   * @param {Object} options - Consensus options
   * @param {string} options.topic - What we're voting on
   * @param {Object} options.context - Context for voting
   * @param {string} [options.reason] - Why consensus is needed
   * @returns {Promise<Object>} Consensus result
   */
  async triggerConsensus({ topic, context, reason }) {
    this._consensusCount++;
    const consensusId = `consensus_${this._consensusCount}_${Date.now()}`;

    log.info('Triggering consensus', { consensusId, topic, reason });

    // Collect votes from all Dogs with voteOnConsensus method
    const voters = [];
    const votePromises = [];

    const dogsToConsult = [
      'guardian', 'analyst', 'sage', 'scout', 'architect',
      'scholar', 'janitor', 'deployer', 'oracle', 'cartographer', 'cynic',
    ];

    for (const dogName of dogsToConsult) {
      const dog = this.pack[dogName];
      if (dog?.voteOnConsensus) {
        voters.push(dogName);
        votePromises.push(
          Promise.race([
            dog.voteOnConsensus(topic, context),
            new Promise(resolve => setTimeout(() => resolve({
              vote: 'abstain',
              reason: 'timeout',
            }), CONSENSUS_THRESHOLDS.VOTE_TIMEOUT_MS)),
          ]).catch(e => ({
            vote: 'abstain',
            reason: `error: ${e.message}`,
          }))
        );
      }
    }

    // Wait for all votes
    const voteResults = await Promise.all(votePromises);

    // Tally votes
    const votes = {};
    let approveCount = 0;
    let rejectCount = 0;
    let abstainCount = 0;
    let guardianVeto = false;

    for (let i = 0; i < voters.length; i++) {
      const dogName = voters[i];
      const voteResult = voteResults[i];

      votes[dogName] = voteResult;

      if (voteResult.vote === 'approve') approveCount++;
      else if (voteResult.vote === 'reject') rejectCount++;
      else abstainCount++;

      // Guardian veto on safety topics
      if (dogName === 'guardian' && voteResult.vote === 'reject' && topic.includes('safety')) {
        guardianVeto = true;
      }
    }

    // Calculate agreement
    const totalVoters = voters.length - abstainCount;
    const agreement = totalVoters > 0 ? approveCount / totalVoters : 0;

    // Determine approval
    const approved = !guardianVeto &&
      totalVoters >= CONSENSUS_THRESHOLDS.MIN_VOTERS &&
      agreement >= CONSENSUS_THRESHOLDS.AGREEMENT_THRESHOLD;

    const result = {
      consensusId,
      topic,
      approved,
      agreement,
      guardianVeto,
      votes,
      stats: {
        approve: approveCount,
        reject: rejectCount,
        abstain: abstainCount,
        total: voters.length,
      },
      reason: approved ? 'consensus_reached' :
        guardianVeto ? 'guardian_veto' :
        totalVoters < CONSENSUS_THRESHOLDS.MIN_VOTERS ? 'insufficient_voters' :
        'consensus_not_reached',
    };

    this._lastConsensus = result;

    log.info('Consensus result', {
      consensusId,
      topic,
      approved,
      agreement: `${(agreement * 100).toFixed(1)}%`,
      stats: result.stats,
    });

    // Emit consensus result
    this.eventBus.publish('consensus:completed', result);

    return result;
  }

  /**
   * Get consensus statistics
   */
  getStats() {
    return {
      running: this._running,
      consensusCount: this._consensusCount,
      lastConsensus: this._lastConsensus,
      thresholds: CONSENSUS_THRESHOLDS,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wire ambient consensus to a CollectivePack
 *
 * @param {Object} pack - CollectivePack instance
 * @param {Object} [options] - Options
 * @returns {AmbientConsensus} Wired consensus instance
 */
export function wireAmbientConsensus(pack, options = {}) {
  const consensus = new AmbientConsensus({
    collectivePack: pack,
    eventBus: options.eventBus,
  });

  consensus.start();

  log.info('Ambient consensus wired to pack');

  return consensus;
}

export default {
  AmbientConsensus,
  wireAmbientConsensus,
  CONSENSUS_THRESHOLDS,
  DogSignal,
};
