#!/usr/bin/env node
/**
 * CYNIC Core Benchmark Suite
 *
 * Automated benchmarks for CYNIC's core systems:
 * - Embedding latency (Ollama)
 * - Memory retrieval accuracy
 * - Q-Learning convergence
 * - Orchestration throughput
 * - Consciousness state transitions
 *
 * "φ measures all" - κυνικός
 *
 * @module benchmarks/cynic-core
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// Benchmark configuration
const CONFIG = {
  // Number of iterations per benchmark
  iterations: 100,
  // Warmup iterations (not counted)
  warmup: 10,
  // φ-aligned targets
  targets: {
    embeddingLatencyMs: 100,      // Target: <100ms per embedding
    memoryRetrievalMs: 50,        // Target: <50ms per retrieval
    qLearningConvergence: 0.618,  // Target: φ⁻¹ convergence
    orchestrationThroughput: 100, // Target: 100 ops/sec
  },
};

/**
 * Benchmark result structure
 */
class BenchmarkResult {
  constructor(name) {
    this.name = name;
    this.samples = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = process.hrtime.bigint();
  }

  end() {
    this.endTime = process.hrtime.bigint();
    const durationNs = Number(this.endTime - this.startTime);
    this.samples.push(durationNs / 1_000_000); // Convert to ms
  }

  addSample(durationMs) {
    this.samples.push(durationMs);
  }

  addError(error) {
    this.errors.push(error.message || error);
  }

  getStats() {
    if (this.samples.length === 0) {
      return { mean: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0, stdDev: 0 };
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;
    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sorted.length;

    return {
      count: sorted.length,
      mean: Math.round(mean * 100) / 100,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      errors: this.errors.length,
    };
  }
}

/**
 * Benchmark: Embedding Latency
 */
async function benchmarkEmbeddingLatency() {
  const result = new BenchmarkResult('Embedding Latency');

  try {
    const { createEmbedder, OllamaEmbedder } = await import('@cynic/persistence');

    // Check if Ollama is available
    const ollama = new OllamaEmbedder({ model: 'nomic-embed-text' });
    if (!await ollama.isAvailable()) {
      result.addError('Ollama not available');
      return result;
    }

    const testTexts = [
      'CYNIC is a loyal dog that speaks truth',
      'The quick brown fox jumps over the lazy dog',
      'Machine learning and artificial intelligence',
      'Distributed systems and consensus algorithms',
      'φ distrusts φ - maximum confidence 61.8%',
    ];

    // Warmup
    for (let i = 0; i < CONFIG.warmup; i++) {
      await ollama.embed(testTexts[i % testTexts.length]);
    }

    // Benchmark
    for (let i = 0; i < CONFIG.iterations; i++) {
      const text = testTexts[i % testTexts.length];
      result.start();
      await ollama.embed(text);
      result.end();
    }
  } catch (e) {
    result.addError(e);
  }

  return result;
}

/**
 * Benchmark: Memory Retrieval (VectorStore)
 */
async function benchmarkMemoryRetrieval() {
  const result = new BenchmarkResult('Memory Retrieval');

  try {
    const { createVectorStore } = await import('@cynic/persistence');

    // Create store with mock embedder for pure retrieval test
    const store = createVectorStore({ embedder: 'mock', dimensions: 384 });

    // Pre-populate with test data
    for (let i = 0; i < 1000; i++) {
      await store.store(`doc-${i}`, `Document ${i} about ${['code', 'design', 'testing', 'deployment'][i % 4]}`, {
        type: ['code', 'design', 'testing', 'deployment'][i % 4],
        importance: Math.random(),
      });
    }

    const queries = [
      'code quality and best practices',
      'system design patterns',
      'unit testing strategies',
      'deployment automation',
    ];

    // Warmup
    for (let i = 0; i < CONFIG.warmup; i++) {
      await store.search(queries[i % queries.length], 10);
    }

    // Benchmark
    for (let i = 0; i < CONFIG.iterations; i++) {
      const query = queries[i % queries.length];
      result.start();
      await store.search(query, 10);
      result.end();
    }
  } catch (e) {
    result.addError(e);
  }

  return result;
}

/**
 * Benchmark: Q-Learning Convergence
 */
async function benchmarkQLearningConvergence() {
  const result = new BenchmarkResult('Q-Learning Convergence');

  try {
    const { QLearningQTable, LEARNING_CONFIG } = await import('@cynic/node');

    // Create fresh Q-Table
    const qTable = new QLearningQTable({
      learningRate: LEARNING_CONFIG.learningRate,
      discountFactor: LEARNING_CONFIG.discountFactor,
    });

    // Simulate learning episodes
    const actions = ['route_simple', 'route_complex', 'delegate', 'cache'];
    const states = [
      { complexity: 'low', cached: false },
      { complexity: 'medium', cached: false },
      { complexity: 'high', cached: false },
      { complexity: 'low', cached: true },
    ];

    // Optimal actions for each state (ground truth)
    const optimalActions = {
      'low-false': 'route_simple',
      'medium-false': 'route_complex',
      'high-false': 'delegate',
      'low-true': 'cache',
    };

    let correctPredictions = 0;
    const episodes = CONFIG.iterations * 10; // More episodes for convergence test

    for (let episode = 0; episode < episodes; episode++) {
      const state = states[episode % states.length];
      const stateKey = `${state.complexity}-${state.cached}`;
      const optimalAction = optimalActions[stateKey];

      // Get Q-Table's predicted action
      const predicted = qTable.getBestAction(state);

      // Reward based on optimal choice
      const action = Math.random() < 0.3 ? actions[Math.floor(Math.random() * actions.length)] : optimalAction;
      const reward = action === optimalAction ? 1.0 : -0.5;

      // Update Q-Table
      qTable.update(state, action, reward, state);

      // Track accuracy at intervals
      if (episode > 0 && episode % 100 === 0) {
        if (predicted === optimalAction) {
          correctPredictions++;
        }
        result.addSample(correctPredictions / (episode / 100));
      }
    }

    // Final convergence score
    const finalAccuracy = correctPredictions / (episodes / 100);
    result.addSample(finalAccuracy);

  } catch (e) {
    result.addError(e);
  }

  return result;
}

/**
 * Benchmark: Orchestration Throughput
 */
async function benchmarkOrchestrationThroughput() {
  const result = new BenchmarkResult('Orchestration Throughput');

  try {
    const { createEventBus, EventType } = await import('@cynic/node');

    const eventBus = createEventBus();
    let receivedCount = 0;

    // Subscribe to events
    eventBus.subscribe(EventType.TASK_CREATED, () => receivedCount++);
    eventBus.subscribe(EventType.PATTERN_DETECTED, () => receivedCount++);

    const events = CONFIG.iterations * 10;
    const startTime = process.hrtime.bigint();

    // Publish events as fast as possible
    for (let i = 0; i < events; i++) {
      eventBus.publish(i % 2 === 0 ? EventType.TASK_CREATED : EventType.PATTERN_DETECTED, {
        id: i,
        data: { test: true },
      });
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    const throughput = events / (durationMs / 1000);

    result.addSample(throughput);

  } catch (e) {
    result.addError(e);
  }

  return result;
}

/**
 * Benchmark: Consciousness State Transitions
 */
async function benchmarkConsciousnessTransitions() {
  const result = new BenchmarkResult('Consciousness Transitions');

  try {
    const { createEmergenceLayer, ConsciousnessState } = await import('@cynic/node');

    const emergence = createEmergenceLayer();

    // Simulate observations and measure transition time
    const observations = [
      { type: 'SYSTEM_HEALTH', data: { status: 'healthy' }, confidence: 0.8 },
      { type: 'PATTERN_DETECTED', data: { pattern: 'test' }, confidence: 0.7 },
      { type: 'DANGER_DETECTED', data: { threat: 'high' }, confidence: 0.9 },
      { type: 'RECOVERY', data: { from: 'critical' }, confidence: 0.6 },
    ];

    // Warmup
    for (let i = 0; i < CONFIG.warmup; i++) {
      const obs = observations[i % observations.length];
      emergence.observe(obs.type, obs.data, obs.confidence, 'benchmark');
    }

    // Benchmark
    for (let i = 0; i < CONFIG.iterations; i++) {
      const obs = observations[i % observations.length];
      result.start();
      emergence.observe(obs.type, obs.data, obs.confidence, 'benchmark');
      const state = emergence.getState();
      result.end();
    }

  } catch (e) {
    result.addError(e);
  }

  return result;
}

/**
 * Format benchmark report
 */
function formatReport(results) {
  const lines = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('🐕 CYNIC BENCHMARK REPORT');
  lines.push('═══════════════════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  lines.push(`Iterations: ${CONFIG.iterations}`);
  lines.push(`φ-aligned targets: efficiency max ${(PHI_INV * 100).toFixed(1)}%`);
  lines.push('');

  for (const result of results) {
    const stats = result.getStats();
    const target = CONFIG.targets[result.name.toLowerCase().replace(/\s+/g, '')] || 'N/A';

    lines.push(`── ${result.name} ──────────────────────────────────────────────────────────`);

    if (result.name.includes('Latency') || result.name.includes('Retrieval') || result.name.includes('Transitions')) {
      lines.push(`   Mean:    ${stats.mean.toFixed(2)} ms`);
      lines.push(`   P50:     ${stats.p50?.toFixed(2) || 'N/A'} ms`);
      lines.push(`   P95:     ${stats.p95?.toFixed(2) || 'N/A'} ms`);
      lines.push(`   P99:     ${stats.p99?.toFixed(2) || 'N/A'} ms`);
      lines.push(`   StdDev:  ${stats.stdDev.toFixed(2)} ms`);
      lines.push(`   Target:  <${target} ms`);

      const passed = stats.p95 <= target;
      lines.push(`   Status:  ${passed ? '✅ PASS' : '⚠️ FAIL'}`);
    } else if (result.name.includes('Convergence')) {
      const convergence = stats.mean;
      lines.push(`   Convergence: ${(convergence * 100).toFixed(1)}%`);
      lines.push(`   Target:      >${(target * 100).toFixed(1)}%`);

      const passed = convergence >= target;
      lines.push(`   Status:      ${passed ? '✅ PASS' : '⚠️ FAIL'}`);
    } else if (result.name.includes('Throughput')) {
      const throughput = stats.mean;
      lines.push(`   Throughput: ${Math.round(throughput)} ops/sec`);
      lines.push(`   Target:     >${target} ops/sec`);

      const passed = throughput >= target;
      lines.push(`   Status:     ${passed ? '✅ PASS' : '⚠️ FAIL'}`);
    }

    if (stats.errors > 0) {
      lines.push(`   Errors:  ${stats.errors}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('🐕 CYNIC Benchmark Suite starting...');
  console.log('');

  const results = [];

  // Run each benchmark
  console.log('Running: Embedding Latency...');
  results.push(await benchmarkEmbeddingLatency());

  console.log('Running: Memory Retrieval...');
  results.push(await benchmarkMemoryRetrieval());

  console.log('Running: Q-Learning Convergence...');
  results.push(await benchmarkQLearningConvergence());

  console.log('Running: Orchestration Throughput...');
  results.push(await benchmarkOrchestrationThroughput());

  console.log('Running: Consciousness Transitions...');
  results.push(await benchmarkConsciousnessTransitions());

  // Print report
  console.log(formatReport(results));

  // Return results for programmatic use
  return results;
}

// Export for programmatic use
export {
  runBenchmarks,
  benchmarkEmbeddingLatency,
  benchmarkMemoryRetrieval,
  benchmarkQLearningConvergence,
  benchmarkOrchestrationThroughput,
  benchmarkConsciousnessTransitions,
  CONFIG,
  BenchmarkResult,
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks()
    .then(() => process.exit(0))
    .catch(e => {
      console.error('Benchmark failed:', e);
      process.exit(1);
    });
}
