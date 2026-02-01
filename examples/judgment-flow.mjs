#!/usr/bin/env node
/**
 * CYNIC Judgment Flow Example
 *
 * Demonstrates the complete judgment pipeline:
 * 1. Submit item for judgment
 * 2. 11 Dogs vote in parallel
 * 3. Consensus reached (φ-threshold)
 * 4. Proof of Judgment generated
 * 5. (Optional) Anchor to Solana
 *
 * Run: node examples/judgment-flow.mjs
 *
 * "φ distrusts φ" - κυνικός
 */

import { CYNICJudge, createCollectivePack, SharedMemory } from '@cynic/node';
import { PHI_INV } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🧠 CYNIC Judgment Flow Demo');
console.log('  "Loyal to truth, not to comfort"');
console.log('═══════════════════════════════════════════════════════════════\n');

// Create shared memory for collective knowledge
const sharedMemory = new SharedMemory();

// Create the Collective Pack (11 Dogs)
const collective = createCollectivePack({
  sharedMemory,
  parallel: true, // All dogs vote simultaneously
});

// Create the judge
const judge = new CYNICJudge({
  collective,
  sharedMemory,
});

// ═══════════════════════════════════════════════════════════════════════════
// JUDGMENT EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

async function runJudgmentDemo() {
  console.log('── Example 1: Code Quality Judgment ──────────────────────────\n');

  const codeItem = {
    content: `
      function calculateTotal(items) {
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      }
    `,
    itemType: 'code',
    context: {
      language: 'javascript',
      purpose: 'Calculate shopping cart total',
    },
  };

  const codeJudgment = await judge.judge(codeItem);

  console.log(`  Q-Score: ${codeJudgment.qScore.toFixed(1)}/100`);
  console.log(`  Verdict: ${codeJudgment.verdict}`);
  console.log(`  Confidence: ${(codeJudgment.confidence * 100).toFixed(1)}% (max: ${(PHI_INV * 100).toFixed(1)}%)`);
  console.log(`  Consensus: ${codeJudgment.consensus ? 'Yes' : 'No'} (${(codeJudgment.consensusRatio * 100).toFixed(1)}%)`);
  console.log('\n  Axiom Breakdown:');
  if (codeJudgment.breakdown) {
    for (const [axiom, score] of Object.entries(codeJudgment.breakdown)) {
      const bar = '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10));
      console.log(`    ${axiom.padEnd(10)}: [${bar}] ${score.toFixed(1)}`);
    }
  }

  console.log('\n── Example 2: Security Decision ─────────────────────────────\n');

  const securityItem = {
    content: 'rm -rf /tmp/cache/*',
    itemType: 'command',
    context: {
      user: 'developer',
      workingDir: '/home/user/project',
    },
  };

  const securityJudgment = await judge.judge(securityItem);

  console.log(`  Q-Score: ${securityJudgment.qScore.toFixed(1)}/100`);
  console.log(`  Verdict: ${securityJudgment.verdict}`);
  console.log(`  Confidence: ${(securityJudgment.confidence * 100).toFixed(1)}%`);

  if (securityJudgment.verdict === 'GROWL' || securityJudgment.verdict === 'BARK') {
    console.log('\n  ⚠️  Guardian detected potential danger!');
    console.log(`  Recommendation: ${securityJudgment.reasoning || 'Review before executing'}`);
  }

  console.log('\n── Example 3: Judgment with Proof ───────────────────────────\n');

  const architectureItem = {
    content: 'Microservices architecture with event sourcing',
    itemType: 'decision',
    context: {
      project: 'CYNIC',
      impact: 'high',
    },
  };

  const archJudgment = await judge.judge(architectureItem);

  console.log(`  Q-Score: ${archJudgment.qScore.toFixed(1)}/100`);
  console.log(`  Verdict: ${archJudgment.verdict}`);
  console.log(`  Judgment ID: ${archJudgment.id || 'N/A'}`);

  // Generate Proof of Judgment
  if (archJudgment.proof) {
    console.log('\n  Proof of Judgment (PoJ):');
    console.log(`    Hash: ${archJudgment.proof.hash?.slice(0, 16)}...`);
    console.log(`    Timestamp: ${archJudgment.proof.timestamp}`);
    console.log(`    Voters: ${archJudgment.proof.voters?.length || 0} dogs`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('  Judgments made: 3');
  console.log(`  Collective dogs: ${collective.dogs?.length || 11}`);
  console.log(`  Consensus threshold: ${(PHI_INV * 100).toFixed(1)}% (φ⁻¹)`);
  console.log(`  Max confidence: ${(PHI_INV * 100).toFixed(1)}% (never claims certainty)`);

  console.log('\n  Verdict Legend:');
  console.log('    HOWL  = Excellent (Q > 80)');
  console.log('    WAG   = Good (Q 60-80)');
  console.log('    BARK  = Needs work (Q 40-60)');
  console.log('    GROWL = Danger/Poor (Q < 40)');

  console.log('\n  *tail wag* Judgment flow complete.');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════

runJudgmentDemo().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
