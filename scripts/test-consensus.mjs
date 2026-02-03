#!/usr/bin/env node
/**
 * Test Multi-LLM Consensus with gemma2:2b
 *
 * Task #97: Validate consensus system works correctly
 */

import { createOllamaValidator, createLLMRouter } from '../packages/node/src/orchestration/llm-adapter.js';

const PHI_INV = 0.618033988749895;

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC Multi-LLM Consensus Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Create validators
  console.log('1️⃣  Creating validators...');

  const gemma = createOllamaValidator({ model: 'gemma2:2b' });
  console.log(`   ✅ gemma2:2b validator created`);

  // Check if available
  const available = await gemma.isAvailable();
  console.log(`   📡 Ollama available: ${available}\n`);

  if (!available) {
    console.log('❌ Ollama not running. Start with: ollama serve');
    process.exit(1);
  }

  // 2. Create router with multiple gemma instances for test
  // (In real usage, would use different models)
  console.log('2️⃣  Creating router with validators...');
  const router = createLLMRouter({
    validators: [gemma],  // Add gemma as validator
  });
  console.log(`   Primary: ${router.primary.provider}`);
  console.log(`   Validators: ${router.validators.length}\n`);

  // 3. Test simple consensus
  console.log('3️⃣  Testing consensus with simple question...');
  console.log('   Question: "Is 2+2=4? Answer YES or NO only."\n');

  try {
    const result = await router.consensus('Is 2+2=4? Answer YES or NO only.', {
      timeout: 30000,
    });

    console.log('   ═══ CONSENSUS RESULT ═══');
    console.log(`   Responses: ${result.responses.length}`);
    console.log(`   Agreement: ${(result.agreement * 100).toFixed(1)}%`);
    console.log(`   Has Consensus: ${result.hasConsensus} (threshold: ${(PHI_INV * 100).toFixed(1)}%)`);
    console.log(`   Is Strong: ${result.isStrong}`);
    console.log(`   Verdict: "${result.verdict}"`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);

    if (result.dissent.length > 0) {
      console.log(`   Dissent: ${result.dissent.length} responses`);
    }

    // Show individual responses
    console.log('\n   ═══ INDIVIDUAL RESPONSES ═══');
    for (const resp of result.responses) {
      const content = resp.content?.slice(0, 100) || '(empty)';
      console.log(`   [${resp.provider}] ${resp.model}: "${content}"`);
    }

  } catch (err) {
    console.log(`   ❌ Consensus failed: ${err.message}`);
  }

  // 4. Test with code judgment
  console.log('\n4️⃣  Testing code judgment consensus...');
  console.log('   Code: function add(a, b) { return a + b; }');

  try {
    const codeResult = await router.consensus(`
Rate this code from 0-100 and give a one-word verdict (GOOD/BAD/OK):

function add(a, b) { return a + b; }

Respond in format: "SCORE: X, VERDICT: WORD"
    `.trim(), { timeout: 30000 });

    console.log('\n   ═══ CODE JUDGMENT RESULT ═══');
    console.log(`   Agreement: ${(codeResult.agreement * 100).toFixed(1)}%`);
    console.log(`   Has Consensus: ${codeResult.hasConsensus}`);
    console.log(`   Verdict: "${codeResult.verdict?.slice(0, 100)}..."`);

  } catch (err) {
    console.log(`   ❌ Code judgment failed: ${err.message}`);
  }

  // 5. Show router stats
  console.log('\n5️⃣  Router Statistics:');
  const stats = router.getStatus();
  console.log(`   Single requests: ${stats.stats.singleRequests}`);
  console.log(`   Consensus requests: ${stats.stats.consensusRequests}`);
  console.log(`   Consensus reached: ${stats.stats.consensusReached}`);
  console.log(`   Consensus failed: ${stats.stats.consensusFailed}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🐕 Test complete');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
