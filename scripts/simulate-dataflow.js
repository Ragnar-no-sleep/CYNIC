#!/usr/bin/env node
/**
 * CYNIC Dataflow Simulation
 *
 * Traces complete flow from user input → judgment → learning
 *
 * "φ distrusts φ" - κυνικός
 */

import { CYNICNode } from '../packages/node/src/node.js';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SIMULATION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║           CYNIC DATAFLOW SIMULATION - Complete Conversation               ║
║                     "φ distrusts φ" - κυνικός                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  // Track events
  const events = [];
  const log = (phase, msg, data = null) => {
    const entry = { phase, msg, data, ts: Date.now() };
    events.push(entry);
    const icon = {
      'INPUT': '📥',
      'JUDGE': '⚖️',
      'COLLECTIVE': '🐕',
      'ANOMALY': '🔍',
      'LEARNING': '🧠',
      'FEEDBACK': '↩️',
      'OUTPUT': '📤',
      'INIT': '🚀',
    }[phase] || '•';
    console.log(`${icon} [${phase}] ${msg}`);
    if (data) {
      console.log(`   └─ ${JSON.stringify(data).slice(0, 100)}...`);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // CREATE AND START NODE
  // ─────────────────────────────────────────────────────────────────

  log('INIT', 'Creating CYNIC node...');

  const node = new CYNICNode({
    operatorId: 'sim_operator_01',
    enableAPI: false,
  });

  log('INIT', 'Starting node (initializing state)...');

  try {
    await node.start();
    log('INIT', 'Node started successfully');
  } catch (err) {
    log('INIT', `Node start partial: ${err.message} (continuing anyway)`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WIRE EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Listen to EventBus
  if (node._eventBus) {
    node._eventBus.on('judgment:created', (e) => {
      log('COLLECTIVE', `Judgment published to EventBus`, { id: e.judgmentId, verdict: e.verdict });
    });

    node._eventBus.on('consensus:reached', (e) => {
      log('COLLECTIVE', `Consensus reached: ${e.vote}`, { confidence: e.confidence, voters: e.voters?.length });
    });

    node._eventBus.on('insight:shared', (e) => {
      log('COLLECTIVE', `Insight from ${e.agentId}`, { priority: e.priority });
    });
  }

  // Listen to LearningService
  if (node._learningService) {
    node._learningService.on('feedback-processed', (e) => {
      log('LEARNING', `Feedback processed`, { type: e.feedbackType, source: e.source });
    });

    node._learningService.on('anomaly-processed', (e) => {
      log('LEARNING', `Anomaly ingested`, { residual: e.residual?.toFixed(3) });
    });

    node._learningService.on('dimension-anomaly', (e) => {
      log('LEARNING', `Dimension needs recalibration: ${e.dimension}`, { count: e.anomalyCount });
    });

    node._learningService.on('weights-adjusted', (e) => {
      log('LEARNING', `Weights adjusted`, { dimension: e.dimension, delta: e.delta?.toFixed(4) });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATE CONVERSATION
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('PHASE 1: User submits item for judgment');
  console.log('─────────────────────────────────────────────────────────────────\n');

  // Simulate user input
  const userItem = {
    type: 'code',
    content: `
      function validateToken(token) {
        // No input validation - potential security issue
        const decoded = jwt.decode(token);
        return decoded.userId;
      }
    `,
    context: {
      language: 'javascript',
      purpose: 'authentication',
    },
  };

  log('INPUT', 'User submits code for review', { type: userItem.type, size: userItem.content.length });

  // ─────────────────────────────────────────────────────────────────
  // JUDGMENT
  // ─────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('PHASE 2: CYNIC judges the item');
  console.log('─────────────────────────────────────────────────────────────────\n');

  let judgment;
  try {
    judgment = await node.judge(userItem, {
      requestId: 'sim_req_001',
      source: 'simulation',
    });

    log('JUDGE', `Judgment created`, {
      id: judgment.id,
      verdict: judgment.verdict,
      qScore: judgment.q_score || judgment.global_score,
      confidence: judgment.confidence,
    });

    // Show dimension breakdown
    if (judgment.dimensions) {
      console.log('\n   Dimension Scores:');
      const dims = Object.entries(judgment.dimensions).slice(0, 5);
      for (const [dim, score] of dims) {
        const bar = '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10));
        console.log(`   • ${dim.padEnd(15)} ${bar} ${score.toFixed(1)}`);
      }
      if (Object.keys(judgment.dimensions).length > 5) {
        console.log(`   ... and ${Object.keys(judgment.dimensions).length - 5} more dimensions`);
      }
    }
  } catch (err) {
    log('JUDGE', `Error: ${err.message}`);
    // Create mock judgment for simulation continuation
    judgment = {
      id: 'mock_jdg_001',
      verdict: 'GROWL',
      q_score: 42,
      confidence: 0.55,
      dimensions: { security: 25, maintainability: 60, clarity: 50 },
    };
    log('JUDGE', 'Using mock judgment for simulation', judgment);
  }

  // ─────────────────────────────────────────────────────────────────
  // COLLECTIVE REVIEW (async, may have already fired)
  // ─────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('PHASE 3: Collective Pack reviews (11 dogs)');
  console.log('─────────────────────────────────────────────────────────────────\n');

  // Give collective time to process
  await new Promise(r => setTimeout(r, 100));

  if (node._collectivePack) {
    const packStatus = {
      analyst: node._collectivePack.analyst ? '✓' : '✗',
      sage: node._collectivePack.sage ? '✓' : '✗',
      cynic: node._collectivePack.cynic ? '✓' : '✗',
      guardian: node._collectivePack.guardian ? '✓' : '✗',
      mentor: node._collectivePack.mentor ? '✓' : '✗',
    };
    log('COLLECTIVE', 'Pack status', packStatus);
  } else {
    log('COLLECTIVE', 'Pack not initialized (events may still fire)');
  }

  // ─────────────────────────────────────────────────────────────────
  // ANOMALY DETECTION
  // ─────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('PHASE 4: Residual Detector checks for anomalies');
  console.log('─────────────────────────────────────────────────────────────────\n');

  if (node.residualDetector) {
    const threshold = node.residualDetector.threshold;
    log('ANOMALY', `Threshold: ${(threshold * 100).toFixed(1)}% (φ⁻² = ${(PHI_INV_2 * 100).toFixed(1)}%)`);

    // Check if judgment had anomaly flag
    if (judgment.anomaly) {
      log('ANOMALY', `⚠️ ANOMALY DETECTED`, judgment.anomaly);
    } else {
      log('ANOMALY', 'No anomaly detected (residual within bounds)');
    }
  } else {
    log('ANOMALY', 'ResidualDetector not available');
  }

  // ─────────────────────────────────────────────────────────────────
  // EXTERNAL FEEDBACK
  // ─────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('PHASE 5: External feedback (simulating API/user/CI)');
  console.log('─────────────────────────────────────────────────────────────────\n');

  // Simulate user feedback
  log('FEEDBACK', 'User provides feedback: "This judgment missed a critical security flaw"');

  if (node._learningService) {
    node._learningService.processFeedback({
      judgmentId: judgment.id,
      feedbackType: 'negative',
      source: 'user',
      confidence: 0.8,
      details: {
        comment: 'Missed critical security flaw in JWT validation',
        suggestedScore: 25,
      },
    });
  }

  // Simulate CI test result
  await new Promise(r => setTimeout(r, 50));
  log('FEEDBACK', 'CI reports: Security scan FAILED');

  if (node._learningService) {
    node._learningService.processFeedback({
      judgmentId: judgment.id,
      feedbackType: 'incorrect',
      source: 'ci',
      confidence: 0.95,
      details: {
        testName: 'security-scan',
        result: 'FAIL',
        vulnerabilities: ['JWT_NO_VERIFY', 'NO_INPUT_VALIDATION'],
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // LEARNING LOOP
  // ─────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('PHASE 6: Learning Service processes feedback');
  console.log('─────────────────────────────────────────────────────────────────\n');

  if (node._learningService) {
    const patterns = node._learningService.getPatterns?.() || {};

    log('LEARNING', 'Current learning state', {
      totalFeedback: patterns.overall?.feedbackCount || 0,
      positiveRatio: patterns.overall?.positiveRatio?.toFixed(3) || 0,
      anomalyCount: patterns.overall?.anomalyCount || 0,
    });

    // Show dimension-specific patterns
    if (patterns.byDimension?.size > 0) {
      console.log('\n   Dimension Patterns:');
      for (const [dim, data] of patterns.byDimension) {
        console.log(`   • ${dim}: feedback=${data.feedbackCount || 0}, anomalies=${data.anomalyCount || 0}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // OUTPUT
  // ─────────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('PHASE 7: Final output to user');
  console.log('─────────────────────────────────────────────────────────────────\n');

  log('OUTPUT', 'Judgment delivered to user', {
    verdict: judgment.verdict,
    score: judgment.q_score || judgment.global_score,
    weaknesses: judgment.weaknesses?.slice(0, 2),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                         DATAFLOW SUMMARY                                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

  Total Events: ${events.length}

  Flow:

    USER INPUT
         │
         ▼
    ┌─────────┐     ┌──────────────┐
    │  JUDGE  │────▶│  EventBus    │
    │  (25D)  │     │  (publish)   │
    └────┬────┘     └──────┬───────┘
         │                 │
         │                 ▼
         │          ┌──────────────┐
         │          │  Collective  │
         │          │  (11 dogs)   │
         │          └──────┬───────┘
         │                 │ consensus
         ▼                 ▼
    ┌─────────────────────────────┐
    │      LEARNING SERVICE       │◀──── External Feedback
    │  • Anomalies from Residual  │      (API, User, CI)
    │  • Consensus from Collective│
    │  • Feedback from External   │
    └─────────────┬───────────────┘
                  │
                  ▼
           Weight Adjustments
           (dimension recalibration)

  φ Thresholds:
    • Max Confidence: ${(PHI_INV * 100).toFixed(1)}% (φ⁻¹)
    • Anomaly Threshold: ${(PHI_INV_2 * 100).toFixed(1)}% (φ⁻²)
    • Consensus Required: ${(PHI_INV * 100).toFixed(1)}%

  *tail wag* Dataflow simulation complete.
`);

  // Cleanup
  try {
    await node.stop?.();
  } catch (err) {
    // Ignore stop errors
  }

  process.exit(0);
}

// Run simulation
main().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
