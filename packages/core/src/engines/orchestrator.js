/**
 * Engine Orchestrator
 *
 * Coordinates multiple engines for complex queries requiring multiple perspectives.
 * Synthesizes insights from different domains into coherent conclusions.
 *
 * "The pack hunts together" - κυνικός
 *
 * @module @cynic/core/engines/orchestrator
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '../axioms/constants.js';
import { EngineRegistry, globalEngineRegistry } from './registry.js';
import { EngineStatus } from './engine.js';

/**
 * Synthesis strategy - how to combine insights
 */
export const SynthesisStrategy = {
  // Average all insights weighted by confidence
  WEIGHTED_AVERAGE: 'weighted-average',

  // Take the highest confidence insight
  HIGHEST_CONFIDENCE: 'highest-confidence',

  // Require consensus among engines
  CONSENSUS: 'consensus',

  // Keep all perspectives without synthesis
  MULTI_PERSPECTIVE: 'multi-perspective',

  // Dialectic synthesis (thesis + antithesis → synthesis)
  DIALECTIC: 'dialectic',
};

/**
 * Consultation result structure
 * @typedef {Object} ConsultationResult
 * @property {string} question - Original question
 * @property {Object[]} insights - Individual engine insights
 * @property {Object} synthesis - Combined insight
 * @property {string[]} enginesConsulted - Which engines participated
 * @property {number} overallConfidence - Combined confidence
 * @property {Object} metadata - Additional context
 */

/**
 * Engine Orchestrator
 *
 * Coordinates queries across multiple engines and synthesizes results.
 *
 * @example
 * const orchestrator = new EngineOrchestrator(registry);
 *
 * const result = await orchestrator.consult(
 *   "Is this action ethical?",
 *   { domains: ['ethics', 'logic'] }
 * );
 */
export class EngineOrchestrator {
  #registry;
  #defaultStrategy;
  #timeout;

  /**
   * @param {EngineRegistry} [registry] - Engine registry (defaults to global)
   * @param {Object} [options] - Orchestrator options
   * @param {string} [options.defaultStrategy] - Default synthesis strategy
   * @param {number} [options.timeout] - Default timeout per engine (ms)
   */
  constructor(registry = null, options = {}) {
    this.#registry = registry || globalEngineRegistry;
    this.#defaultStrategy = options.defaultStrategy || SynthesisStrategy.WEIGHTED_AVERAGE;
    this.#timeout = options.timeout || 5000;
  }

  /**
   * Consult engines for a question
   *
   * @param {string|Object} input - Question or input data
   * @param {Object} [options] - Consultation options
   * @param {string[]} [options.domains] - Domains to consult
   * @param {string[]} [options.capabilities] - Required capabilities
   * @param {string[]} [options.engines] - Specific engine IDs
   * @param {string} [options.strategy] - Synthesis strategy
   * @param {number} [options.maxEngines] - Maximum engines to consult
   * @param {number} [options.timeout] - Timeout per engine (ms)
   * @returns {Promise<ConsultationResult>}
   *
   * @example
   * const result = await orchestrator.consult("Is lying ever justified?", {
   *   domains: ['ethics'],
   *   strategy: 'multi-perspective'
   * });
   */
  async consult(input, options = {}) {
    const {
      domains,
      capabilities,
      engines: engineIds,
      strategy = this.#defaultStrategy,
      maxEngines = 10,
      timeout = this.#timeout,
    } = options;

    // Select engines
    let engines = [];

    if (engineIds && engineIds.length > 0) {
      // Specific engines requested
      engines = engineIds
        .map(id => this.#registry.get(id))
        .filter(e => e !== undefined);
    } else if (domains || capabilities) {
      // Query by criteria
      engines = this.#registry.query({ domain: domains?.[0], capabilities });

      // If multiple domains, add engines from each
      if (domains && domains.length > 1) {
        for (const domain of domains.slice(1)) {
          const domainEngines = this.#registry.getByDomain(domain);
          for (const e of domainEngines) {
            if (!engines.find(existing => existing.id === e.id)) {
              engines.push(e);
            }
          }
        }
      }
    } else {
      // Consult all available engines (limited)
      engines = this.#registry.getAll();
    }

    // Limit number of engines
    if (engines.length > maxEngines) {
      engines = engines.slice(0, maxEngines);
    }

    // Filter out disabled engines
    engines = engines.filter(e => e.status !== EngineStatus.DISABLED);

    if (engines.length === 0) {
      return {
        question: typeof input === 'string' ? input : JSON.stringify(input),
        insights: [],
        synthesis: null,
        enginesConsulted: [],
        overallConfidence: 0,
        metadata: { error: 'No engines available for this query' },
      };
    }

    // Consult each engine with timeout
    const context = { orchestrator: this, query: options };
    const insightPromises = engines.map(engine =>
      this.#evaluateWithTimeout(engine, input, context, timeout)
    );

    const results = await Promise.allSettled(insightPromises);

    // Collect successful insights
    const insights = [];
    const enginesConsulted = [];

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value) {
        insights.push(results[i].value);
        enginesConsulted.push(engines[i].id);
      }
    }

    // Synthesize insights
    const synthesis = this.#synthesize(insights, strategy);

    return {
      question: typeof input === 'string' ? input : JSON.stringify(input),
      insights,
      synthesis,
      enginesConsulted,
      overallConfidence: synthesis?.confidence || 0,
      metadata: {
        strategy,
        totalEngines: engines.length,
        successfulEngines: insights.length,
        evaluatedAt: Date.now(),
      },
    };
  }

  /**
   * Deliberate on a dilemma using opposing perspectives
   *
   * Specifically designed for ethical/philosophical dilemmas
   * where multiple valid positions exist.
   *
   * @param {string} dilemma - The dilemma to deliberate
   * @param {Object} [options] - Options
   * @param {string[]} [options.traditions] - Philosophical traditions to include
   * @returns {Promise<Object>} Deliberation result
   */
  async deliberate(dilemma, options = {}) {
    const { traditions } = options;

    // Get engines, optionally filtered by tradition
    let engines = this.#registry.getByDomain('ethics');

    if (traditions && traditions.length > 0) {
      engines = engines.filter(e => traditions.includes(e.tradition));
    }

    if (engines.length === 0) {
      return {
        dilemma,
        positions: [],
        tensions: [],
        recommendation: null,
        confidence: 0,
      };
    }

    // Get each engine's position
    const context = { mode: 'deliberation', dilemma };
    const positionPromises = engines.map(async (engine) => {
      try {
        const insight = await engine.evaluate(dilemma, context);
        return {
          engine: engine.id,
          tradition: engine.tradition,
          position: insight.insight,
          confidence: insight.confidence,
          reasoning: insight.reasoning,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(positionPromises);
    const positions = results.filter(p => p !== null);

    // Identify tensions between positions
    const tensions = this.#identifyTensions(positions);

    // Attempt synthesis
    const recommendation = this.#dialecticSynthesis(positions, tensions);

    return {
      dilemma,
      positions,
      tensions,
      recommendation,
      confidence: recommendation?.confidence || PHI_INV_2,
      metadata: {
        enginesConsulted: positions.map(p => p.engine),
        tensionCount: tensions.length,
        evaluatedAt: Date.now(),
      },
    };
  }

  /**
   * Evaluate with a single engine (convenience method)
   *
   * @param {string} engineId - Engine to use
   * @param {*} input - Input to evaluate
   * @returns {Promise<Object>} Insight
   */
  async evaluateWith(engineId, input) {
    const engine = this.#registry.get(engineId);
    if (!engine) {
      throw new Error(`Engine not found: ${engineId}`);
    }
    return engine.evaluate(input, {});
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      registry: this.#registry.getStats(),
      defaultStrategy: this.#defaultStrategy,
      timeout: this.#timeout,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────

  /**
   * Evaluate an engine with timeout
   * @private
   */
  async #evaluateWithTimeout(engine, input, context, timeout) {
    return Promise.race([
      engine.evaluate(input, context),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]).catch(() => null);
  }

  /**
   * Synthesize multiple insights
   * @private
   */
  #synthesize(insights, strategy) {
    if (insights.length === 0) return null;
    if (insights.length === 1) return insights[0];

    switch (strategy) {
      case SynthesisStrategy.HIGHEST_CONFIDENCE:
        return this.#highestConfidence(insights);

      case SynthesisStrategy.CONSENSUS:
        return this.#findConsensus(insights);

      case SynthesisStrategy.MULTI_PERSPECTIVE:
        return this.#multiPerspective(insights);

      case SynthesisStrategy.DIALECTIC:
        return this.#dialecticSynthesis(
          insights.map(i => ({ position: i.insight, confidence: i.confidence, reasoning: i.reasoning })),
          []
        );

      case SynthesisStrategy.WEIGHTED_AVERAGE:
      default:
        return this.#weightedAverage(insights);
    }
  }

  /**
   * Weighted average synthesis
   * @private
   */
  #weightedAverage(insights) {
    const totalWeight = insights.reduce((sum, i) => sum + i.confidence, 0);

    // Combine reasoning
    const combinedReasoning = [];
    for (const insight of insights) {
      combinedReasoning.push(`[${insight.perspective}] ${insight.insight}`);
    }

    // Weight-average confidence
    const avgConfidence = totalWeight / insights.length;

    return {
      engineId: 'orchestrator',
      domain: 'synthesis',
      perspective: 'weighted-average',
      insight: `Synthesized from ${insights.length} perspectives: ${combinedReasoning.join('; ')}`,
      confidence: Math.min(avgConfidence, PHI_INV),
      reasoning: combinedReasoning,
      metadata: {
        strategy: 'weighted-average',
        sourceCount: insights.length,
      },
    };
  }

  /**
   * Highest confidence synthesis
   * @private
   */
  #highestConfidence(insights) {
    let best = insights[0];
    for (const insight of insights) {
      if (insight.confidence > best.confidence) {
        best = insight;
      }
    }
    return {
      ...best,
      metadata: {
        ...best.metadata,
        strategy: 'highest-confidence',
        otherPerspectives: insights.length - 1,
      },
    };
  }

  /**
   * Find consensus among insights
   * @private
   */
  #findConsensus(insights) {
    // Simple consensus: if majority agree (similar insights)
    // This is a simplified implementation - real consensus would be more sophisticated

    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;

    // If all confidences are similar (within 0.1), we have consensus
    const confidenceVariance = insights.reduce(
      (sum, i) => sum + Math.pow(i.confidence - avgConfidence, 2),
      0
    ) / insights.length;

    const hasConsensus = confidenceVariance < 0.01;

    if (hasConsensus) {
      return {
        engineId: 'orchestrator',
        domain: 'synthesis',
        perspective: 'consensus',
        insight: `Consensus reached among ${insights.length} engines`,
        confidence: Math.min(avgConfidence * 1.1, PHI_INV), // Slight boost for consensus
        reasoning: insights.map(i => i.insight),
        metadata: {
          strategy: 'consensus',
          consensusStrength: 1 - confidenceVariance,
        },
      };
    }

    // No consensus - return multi-perspective
    return this.#multiPerspective(insights);
  }

  /**
   * Multi-perspective synthesis (no reduction)
   * @private
   */
  #multiPerspective(insights) {
    return {
      engineId: 'orchestrator',
      domain: 'synthesis',
      perspective: 'multi-perspective',
      insight: `${insights.length} distinct perspectives available`,
      confidence: PHI_INV_2, // Lower confidence due to disagreement
      reasoning: insights.map(i => `[${i.perspective}] ${i.insight}`),
      perspectives: insights,
      metadata: {
        strategy: 'multi-perspective',
        perspectiveCount: insights.length,
      },
    };
  }

  /**
   * Identify tensions between positions
   * @private
   */
  #identifyTensions(positions) {
    const tensions = [];

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        // Simple tension detection: different traditions often have tensions
        if (positions[i].tradition !== positions[j].tradition) {
          tensions.push({
            between: [positions[i].engine, positions[j].engine],
            traditions: [positions[i].tradition, positions[j].tradition],
            description: `${positions[i].tradition} vs ${positions[j].tradition}`,
          });
        }
      }
    }

    return tensions;
  }

  /**
   * Dialectic synthesis (thesis + antithesis → synthesis)
   * @private
   */
  #dialecticSynthesis(positions, tensions) {
    if (positions.length === 0) return null;
    if (positions.length === 1) {
      return {
        insight: positions[0].position,
        confidence: positions[0].confidence,
        reasoning: positions[0].reasoning || [],
      };
    }

    // Find strongest opposing positions
    const sorted = [...positions].sort((a, b) => b.confidence - a.confidence);
    const thesis = sorted[0];
    const antithesis = sorted.find(p => p.tradition !== thesis.tradition) || sorted[1];

    // Synthesize
    const synthesisConfidence = Math.min(
      (thesis.confidence + antithesis.confidence) / 2,
      PHI_INV
    );

    return {
      insight: `Synthesis: Balancing ${thesis.tradition || 'primary'} (${thesis.position}) with ${antithesis.tradition || 'secondary'} perspective`,
      confidence: synthesisConfidence,
      thesis: thesis.position,
      antithesis: antithesis.position,
      reasoning: [
        `Thesis [${thesis.tradition}]: ${thesis.position}`,
        `Antithesis [${antithesis.tradition}]: ${antithesis.position}`,
        'Synthesis: Integration of both perspectives',
      ],
      metadata: {
        strategy: 'dialectic',
        tensionCount: tensions.length,
      },
    };
  }
}

/**
 * Create an orchestrator with the global registry
 *
 * @param {Object} [options] - Orchestrator options
 * @returns {EngineOrchestrator}
 */
export function createOrchestrator(options = {}) {
  return new EngineOrchestrator(globalEngineRegistry, options);
}

export default EngineOrchestrator;
