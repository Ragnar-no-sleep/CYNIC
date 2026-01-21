/**
 * Dog Orchestrator
 *
 * Spawns 11 dogs as parallel subagents with hybrid context injection.
 * Implements the 6-layer memory architecture for fresh execution + shared memory.
 *
 * @module @cynic/node/agents/orchestrator
 */

'use strict';

import { PHI_INV } from '@cynic/core';
import { AgentId } from './events.js';

/**
 * Dog execution modes
 */
export const DogMode = {
  PARALLEL: 'parallel',       // All dogs run simultaneously
  SEQUENTIAL: 'sequential',   // Dogs run one after another
  CRITICAL_ONLY: 'critical',  // Only Guardian + CYNIC run
  FAST: 'fast',               // Only haiku models run
};

/**
 * Dog model selection
 */
export const DogModel = {
  HAIKU: 'haiku',     // Fast, cheap - most dogs
  SONNET: 'sonnet',   // Balanced - Guardian, complex tasks
  OPUS: 'opus',       // Powerful - CYNIC meta-consciousness
};

/**
 * Dog configuration with model and capabilities
 */
export const DOG_CONFIG = {
  SAGE:         { model: DogModel.HAIKU,  blocking: false, timeout: 5000,  agentId: AgentId.SAGE },
  ANALYST:      { model: DogModel.HAIKU,  blocking: false, timeout: 5000,  agentId: AgentId.ANALYST },
  GUARDIAN:     { model: DogModel.SONNET, blocking: true,  timeout: 10000, agentId: AgentId.GUARDIAN },
  SCHOLAR:      { model: DogModel.HAIKU,  blocking: false, timeout: 5000,  agentId: AgentId.SCHOLAR },
  ARCHITECT:    { model: DogModel.HAIKU,  blocking: false, timeout: 5000,  agentId: AgentId.ARCHITECT },
  JANITOR:      { model: DogModel.HAIKU,  blocking: false, timeout: 3000,  agentId: AgentId.JANITOR },
  SCOUT:        { model: DogModel.HAIKU,  blocking: false, timeout: 5000,  agentId: AgentId.SCOUT },
  CARTOGRAPHER: { model: DogModel.HAIKU,  blocking: false, timeout: 5000,  agentId: AgentId.CARTOGRAPHER },
  ORACLE:       { model: DogModel.HAIKU,  blocking: false, timeout: 5000,  agentId: AgentId.ORACLE },
  DEPLOYER:     { model: DogModel.SONNET, blocking: true,  timeout: 10000, agentId: AgentId.DEPLOYER },
  CYNIC:        { model: DogModel.OPUS,   blocking: false, timeout: 15000, agentId: AgentId.CYNIC },
};

/**
 * φ-aligned axioms injected into every dog
 */
const PHI_AXIOMS = {
  PHI_INV: 0.618,
  MAX_CONFIDENCE: 0.618,
  MIN_DOUBT: 0.382,
  CONSENSUS_THRESHOLD: 0.618,
  MOTTO: 'φ distrusts φ',
};

/**
 * Dog Orchestrator - Spawns and coordinates parallel dog subagents
 */
export class DogOrchestrator {
  /**
   * @param {Object} options
   * @param {Object} options.collectivePack - Existing CollectivePack instance
   * @param {Object} options.sharedMemory - SharedMemory instance
   * @param {Object} [options.userLab] - UserLab instance (optional)
   * @param {string} [options.mode] - Execution mode
   * @param {number} [options.consensusThreshold] - Custom threshold (default: φ⁻¹)
   */
  constructor(options = {}) {
    this.collectivePack = options.collectivePack;
    this.sharedMemory = options.sharedMemory;
    this.userLab = options.userLab;
    this.mode = options.mode || DogMode.PARALLEL;
    this.consensusThreshold = options.consensusThreshold || PHI_INV;

    // Custom spawner (for future Claude API integration)
    this.spawner = options.spawner || null;

    // Stats
    this.stats = {
      judgments: 0,
      consensusReached: 0,
      blockedByGuardian: 0,
      blockedByDeployer: 0,
      averageLatency: 0,
      dogVotes: {},
    };

    // Initialize dog vote stats
    for (const dog of Object.keys(DOG_CONFIG)) {
      this.stats.dogVotes[dog] = { total: 0, allow: 0, block: 0, errors: 0 };
    }
  }

  /**
   * Judge an item using parallel dogs with hybrid context
   * @param {Object} item - Item to judge
   * @param {Object} [context] - Additional context
   * @returns {Promise<Object>} Judgment result
   */
  async judge(item, context = {}) {
    const startTime = Date.now();
    this.stats.judgments++;

    // Build injected context from all memory layers
    const injectedContext = await this._buildInjectedContext(item, context);

    // Determine which dogs to run based on mode
    const dogsToRun = this._selectDogs();

    // Spawn dogs and collect votes
    let votes;
    if (this.mode === DogMode.SEQUENTIAL) {
      votes = await this._runSequential(item, dogsToRun, injectedContext);
    } else {
      votes = await this._runParallel(item, dogsToRun, injectedContext);
    }

    // Calculate φ-consensus
    const consensus = this._calculateConsensus(votes);

    // Check for blocking votes
    if (consensus.blocked) {
      if (consensus.blockedBy === 'GUARDIAN') this.stats.blockedByGuardian++;
      if (consensus.blockedBy === 'DEPLOYER') this.stats.blockedByDeployer++;

      return {
        blocked: true,
        blockedBy: consensus.blockedBy,
        reason: consensus.blockReason,
        votes,
        latency: Date.now() - startTime,
      };
    }

    // Build final judgment
    const judgment = this._buildJudgment(item, votes, consensus);

    // Record latency
    const latency = Date.now() - startTime;
    this.stats.averageLatency =
      (this.stats.averageLatency * (this.stats.judgments - 1) + latency)
      / this.stats.judgments;

    // Index judgment for future similarity searches
    if (this.sharedMemory) {
      this.sharedMemory.indexJudgment(judgment, item);
    }

    return {
      ...judgment,
      latency,
    };
  }

  /**
   * Build injected context from all 6 memory layers
   * @private
   */
  async _buildInjectedContext(item, requestContext) {
    await this.sharedMemory?.initialize();

    return {
      // ════════════════════════════════════════════════════════════════════
      // Layer 1: DOG IDENTITY (immutable, always injected)
      // ════════════════════════════════════════════════════════════════════
      axioms: PHI_AXIOMS,

      // ════════════════════════════════════════════════════════════════════
      // Layer 2: COLLECTIVE MEMORY (from SharedMemory)
      // ════════════════════════════════════════════════════════════════════
      patterns: this.sharedMemory?.getRelevantPatterns(item, 5) || [],
      dimensionWeights: this.sharedMemory?.getLearnedWeights() || {},
      similarJudgments: this.sharedMemory?.getSimilarJudgments(item, 3) || [],

      // ════════════════════════════════════════════════════════════════════
      // Layer 3: PROCEDURAL MEMORY (how-to for this item type)
      // ════════════════════════════════════════════════════════════════════
      procedure: this.sharedMemory?.getForItemType(item?.type) || null,
      scoringRules: this.sharedMemory?.getScoringRules(item?.type) || {},

      // ════════════════════════════════════════════════════════════════════
      // Layer 4: USER LAB (personal context)
      // ════════════════════════════════════════════════════════════════════
      userPreferences: this.userLab?.getPreferences?.() || {},
      projectPatterns: this.userLab?.getProjectPatterns?.() || [],
      recentUserFeedback: this.userLab?.getRecentFeedback?.(3) || [],

      // ════════════════════════════════════════════════════════════════════
      // Request-specific context
      // ════════════════════════════════════════════════════════════════════
      ...requestContext,

      // ════════════════════════════════════════════════════════════════════
      // Metadata
      // ════════════════════════════════════════════════════════════════════
      _meta: {
        timestamp: Date.now(),
        mode: this.mode,
        itemType: item?.type || 'unknown',
      },
    };
  }

  /**
   * Select dogs based on execution mode
   * @private
   */
  _selectDogs() {
    const allDogs = Object.keys(DOG_CONFIG);

    switch (this.mode) {
      case DogMode.CRITICAL_ONLY:
        return ['GUARDIAN', 'CYNIC'];

      case DogMode.FAST:
        return allDogs.filter(dog => DOG_CONFIG[dog].model === DogModel.HAIKU);

      default:
        return allDogs;
    }
  }

  /**
   * Run dogs in parallel
   * @private
   */
  async _runParallel(item, dogs, injectedContext) {
    const promises = dogs.map(dog =>
      this._invokeDog(dog, item, injectedContext)
        .then(result => ({ dog, ...result, success: true }))
        .catch(err => ({ dog, error: err.message, success: false }))
    );

    const results = await Promise.allSettled(promises);

    return results.map(r => {
      const vote = r.status === 'fulfilled' ? r.value : { dog: 'unknown', error: r.reason?.message, success: false };
      this._recordVote(vote);
      return vote;
    });
  }

  /**
   * Run dogs sequentially (with early exit on block)
   * @private
   */
  async _runSequential(item, dogs, injectedContext) {
    const votes = [];

    for (const dog of dogs) {
      try {
        const result = await this._invokeDog(dog, item, injectedContext);
        const vote = { dog, ...result, success: true };
        this._recordVote(vote);
        votes.push(vote);

        // Early exit on block
        if (vote.response === 'block' && DOG_CONFIG[dog]?.blocking) {
          break;
        }
      } catch (err) {
        const vote = { dog, error: err.message, success: false };
        this._recordVote(vote);
        votes.push(vote);
      }
    }

    return votes;
  }

  /**
   * Invoke a single dog
   * @private
   */
  async _invokeDog(dogName, item, injectedContext) {
    const config = DOG_CONFIG[dogName];
    if (!config) {
      throw new Error(`Unknown dog: ${dogName}`);
    }

    // If we have a custom spawner (Claude API), use it
    if (this.spawner) {
      return this.spawner({
        dog: dogName,
        model: config.model,
        timeout: config.timeout,
        item,
        context: injectedContext,
      });
    }

    // Otherwise, use the existing CollectivePack
    if (this.collectivePack) {
      const agent = this._getAgentFromPack(dogName);
      if (agent) {
        // Call the agent's process method with injected context
        const result = await Promise.race([
          this._processWithAgent(agent, dogName, item, injectedContext),
          this._timeout(config.timeout),
        ]);
        return result;
      }
    }

    // Fallback mock response
    return this._mockDogResponse(dogName, item);
  }

  /**
   * Get agent from CollectivePack by name
   * @private
   */
  _getAgentFromPack(dogName) {
    const nameToAgent = {
      SAGE: this.collectivePack?.sage,
      ANALYST: this.collectivePack?.analyst,
      GUARDIAN: this.collectivePack?.guardian,
      SCHOLAR: this.collectivePack?.scholar,
      ARCHITECT: this.collectivePack?.architect,
      JANITOR: this.collectivePack?.janitor,
      SCOUT: this.collectivePack?.scout,
      CARTOGRAPHER: this.collectivePack?.cartographer,
      ORACLE: this.collectivePack?.oracle,
      DEPLOYER: this.collectivePack?.deployer,
      CYNIC: this.collectivePack?.cynic,
    };
    return nameToAgent[dogName];
  }

  /**
   * Process item with an agent
   * @private
   */
  async _processWithAgent(agent, dogName, item, injectedContext) {
    // Prepare event-like input for the agent
    const event = {
      type: 'orchestrator:judge_request',
      dog: dogName,
      item,
      context: injectedContext,
      timestamp: Date.now(),
    };

    // Different agents have different methods
    // Try common patterns
    if (agent.analyze && dogName === 'ANALYST') {
      const result = await agent.analyze(item);
      return this._normalizeAgentResult(result, dogName);
    }

    if (agent.evaluate && (dogName === 'GUARDIAN' || dogName === 'DEPLOYER')) {
      const result = await agent.evaluate(item);
      return this._normalizeAgentResult(result, dogName);
    }

    if (agent.advise && dogName === 'SAGE') {
      const result = await agent.advise(item);
      return this._normalizeAgentResult(result, dogName);
    }

    if (agent.review && dogName === 'ARCHITECT') {
      const result = await agent.review(item);
      return this._normalizeAgentResult(result, dogName);
    }

    if (agent.extract && dogName === 'SCHOLAR') {
      const result = await agent.extract(item);
      return this._normalizeAgentResult(result, dogName);
    }

    // Generic process method fallback
    if (agent.process) {
      const result = await agent.process(event);
      return this._normalizeAgentResult(result, dogName);
    }

    // If no method found, return mock
    return this._mockDogResponse(dogName, item);
  }

  /**
   * Normalize agent result to standard vote format
   * @private
   */
  _normalizeAgentResult(result, dogName) {
    if (!result) {
      return this._mockDogResponse(dogName, null);
    }

    // Handle different result formats
    const score = result.score ?? result.riskScore ?? result.qualityScore ?? 50;
    const verdict = result.verdict ?? this._scoreToVerdict(score);
    const blocked = result.blocked ?? result.shouldBlock ?? false;

    return {
      score,
      verdict,
      response: blocked ? 'block' : 'allow',
      reason: result.reason || result.summary || null,
      dimensions: result.dimensions || result.scores || {},
      weight: DOG_CONFIG[dogName]?.blocking ? 1.5 : 1,
      insights: result.insights || result.recommendations || [],
    };
  }

  /**
   * Convert score to verdict
   * @private
   */
  _scoreToVerdict(score) {
    if (score >= 85) return 'HOWL';
    if (score >= 62) return 'WAG';
    if (score >= 38) return 'GROWL';
    return 'BARK';
  }

  /**
   * Mock response for dogs without real implementation
   * @private
   */
  _mockDogResponse(dogName, item) {
    const baseScore = 50 + Math.random() * 30;
    return {
      score: baseScore,
      verdict: this._scoreToVerdict(baseScore),
      response: 'allow',
      weight: 1,
      dimensions: {},
      insights: [`[${dogName}] Mock evaluation`],
    };
  }

  /**
   * Timeout promise
   * @private
   */
  _timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
  }

  /**
   * Record vote in stats
   * @private
   */
  _recordVote(vote) {
    const dogStats = this.stats.dogVotes[vote.dog];
    if (!dogStats) return;

    dogStats.total++;
    if (!vote.success) {
      dogStats.errors++;
    } else if (vote.response === 'block') {
      dogStats.block++;
    } else {
      dogStats.allow++;
    }
  }

  /**
   * Calculate φ-consensus from votes
   * @private
   */
  _calculateConsensus(votes) {
    const successfulVotes = votes.filter(v => v.success);
    const totalWeight = successfulVotes.reduce((sum, v) => sum + (v.weight || 1), 0);

    // Check for blocking votes
    const blockingVote = successfulVotes.find(v =>
      v.response === 'block' && DOG_CONFIG[v.dog]?.blocking
    );

    if (blockingVote) {
      return {
        blocked: true,
        blockedBy: blockingVote.dog,
        blockReason: blockingVote.reason,
        ratio: 0,
      };
    }

    // Calculate weighted approval ratio
    const approvalWeight = successfulVotes
      .filter(v => v.response === 'allow' || v.response === 'approve')
      .reduce((sum, v) => sum + (v.weight || 1), 0);

    const ratio = totalWeight > 0 ? approvalWeight / totalWeight : 0;

    // Track consensus reached
    if (ratio >= this.consensusThreshold) {
      this.stats.consensusReached++;
    }

    return {
      blocked: false,
      ratio,
      reached: ratio >= this.consensusThreshold,
      votes: successfulVotes.length,
      totalDogs: Object.keys(DOG_CONFIG).length,
      threshold: this.consensusThreshold,
    };
  }

  /**
   * Build final judgment from votes
   * @private
   */
  _buildJudgment(item, votes, consensus) {
    const successfulVotes = votes.filter(v => v.success);

    // Aggregate dimension scores (weighted average)
    const dimensions = {};
    const weights = {};

    for (const vote of successfulVotes) {
      if (vote.dimensions) {
        for (const [dim, score] of Object.entries(vote.dimensions)) {
          const weight = vote.weight || 1;
          dimensions[dim] = (dimensions[dim] || 0) + score * weight;
          weights[dim] = (weights[dim] || 0) + weight;
        }
      }
    }

    // Normalize dimensions
    for (const dim of Object.keys(dimensions)) {
      dimensions[dim] = dimensions[dim] / weights[dim];
    }

    // Calculate global score
    const scores = successfulVotes.map(v => v.score).filter(s => typeof s === 'number');
    const globalScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 50;

    // Determine verdict
    const verdict = this._scoreToVerdict(globalScore);

    // Collect all insights
    const allInsights = successfulVotes
      .flatMap(v => v.insights || [])
      .filter(Boolean);

    return {
      id: `jdg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      global_score: globalScore,
      verdict,
      dimensions,
      consensus: {
        ratio: consensus.ratio,
        reached: consensus.reached,
        threshold: consensus.threshold,
        votingDogs: successfulVotes.length,
      },
      votes: successfulVotes.map(v => ({
        dog: v.dog,
        score: v.score,
        verdict: v.verdict,
        weight: v.weight || 1,
      })),
      insights: allInsights.slice(0, 10), // Top 10 insights
      timestamp: Date.now(),
      itemType: item?.type,
    };
  }

  /**
   * Process feedback and update SharedMemory
   * @param {string} judgmentId - Judgment ID
   * @param {string} outcome - 'correct' | 'incorrect'
   * @param {Object} [details] - Additional feedback details
   */
  async processFeedback(judgmentId, outcome, details = {}) {
    if (!this.sharedMemory) return;

    // Record feedback
    this.sharedMemory.recordFeedback({
      judgmentId,
      outcome,
      ...details,
    });

    // Adjust weights based on feedback
    if (details.dimensions) {
      const delta = outcome === 'correct' ? 0.1 : -0.1;
      for (const dim of Object.keys(details.dimensions)) {
        this.sharedMemory.adjustWeight(dim, delta, 'user_feedback');
      }
    }

    // Save updated memory
    await this.sharedMemory.save();
  }

  /**
   * Get orchestrator stats
   * @returns {Object} Stats
   */
  getStats() {
    return {
      ...this.stats,
      mode: this.mode,
      consensusThreshold: this.consensusThreshold,
      memoryStats: this.sharedMemory?.getStats() || null,
    };
  }
}

export default DogOrchestrator;
