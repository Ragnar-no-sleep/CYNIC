#!/usr/bin/env node
/**
 * Test Multi-LLM Consensus with OSS-only validators
 *
 * Task #97: Validate consensus system works correctly
 * Fix: Use only Ollama models, exclude Claude pass-through
 */

import { OSSLLMAdapter, ConsensusResult, LLMRouter } from '../packages/node/src/orchestration/llm-adapter.js';

const PHI_INV = 0.618033988749895;

// Create an OSS-only router for testing
class OSSOnlyRouter extends LLMRouter {
  constructor(options = {}) {
    super(options);
  }

  /**
   * OSS-only consensus - excludes Claude pass-through
   */
  async ossConsensus(prompt, options = {}) {
    const timeout = options.timeout || this.consensusConfig.timeout;

    // Only use validators (OSS LLMs), not primary (Claude)
    const adapters = this.validators.filter(v => v.enabled);

    if (adapters.length < 2) {
      console.log('   ⚠️  Only 1 validator - using single response');
      if (adapters.length === 1) {
        const response = await adapters[0].complete(prompt, options);
        return new ConsensusResult({
          responses: [response],
          agreement: 1.0,
          verdict: response.content,
          confidence: response.confidence,
        });
      }
      throw new Error('No OSS validators available');
    }

    // Request from all validators in parallel
    const responsePromises = adapters.map(adapter =>
      Promise.race([
        adapter.complete(prompt, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ]).catch(err => {
        console.log(`   ⚠️  ${adapter.provider}/${adapter.model} failed: ${err.message}`);
        return null;
      })
    );

    const responses = (await Promise.all(responsePromises)).filter(r => r !== null);

    if (responses.length === 0) {
      throw new Error('All validators failed');
    }

    // Calculate agreement
    const { agreement, verdict, dissent } = this._calculateAgreement(responses);

    return new ConsensusResult({
      responses,
      agreement,
      verdict,
      confidence: agreement * PHI_INV,
      dissent,
    });
  }
}

async function createOllamaValidator(model) {
  const adapter = new OSSLLMAdapter({
    provider: 'ollama',
    model,
    endpoint: 'http://localhost:11434',
    apiFormat: 'ollama',
    timeout: 30000,
  });
  adapter.enabled = true;
  return adapter;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC OSS-Only Multi-LLM Consensus Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Check Ollama availability
  console.log('1️⃣  Checking Ollama...');
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) throw new Error('Ollama not responding');
    const data = await response.json();
    const models = data.models?.map(m => m.name) || [];
    console.log(`   ✅ Ollama running with ${models.length} models`);
    console.log(`   Models: ${models.join(', ')}\n`);
  } catch (err) {
    console.log(`   ❌ Ollama not available: ${err.message}`);
    console.log('   Start with: ollama serve\n');
    process.exit(1);
  }

  // 2. Create validators
  console.log('2️⃣  Creating OSS validators...');
  const gemma = await createOllamaValidator('gemma2:2b');
  const qwen = await createOllamaValidator('qwen2:0.5b');

  console.log('   ✅ gemma2:2b');
  console.log('   ✅ qwen2:0.5b\n');

  // 3. Create OSS-only router
  console.log('3️⃣  Creating OSS-only router...');
  const router = new OSSOnlyRouter({
    validators: [gemma, qwen],
  });
  console.log(`   Validators: ${router.validators.length}\n`);

  // 4. Test simple consensus
  console.log('4️⃣  Testing OSS consensus: "Is 2+2=4? Answer YES or NO only."');
  console.log('   (Both models should answer YES)\n');

  try {
    const result = await router.ossConsensus('Is 2+2=4? Answer YES or NO only.', {
      timeout: 30000,
    });

    console.log('   ═══ CONSENSUS RESULT ═══');
    console.log(`   Responses: ${result.responses.length}`);
    console.log(`   Agreement: ${(result.agreement * 100).toFixed(1)}%`);
    console.log(`   Has Consensus: ${result.hasConsensus} (threshold: ${(PHI_INV * 100).toFixed(1)}%)`);
    console.log(`   Verdict: "${result.verdict?.trim()}"`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);

    // Show individual responses
    console.log('\n   ═══ INDIVIDUAL RESPONSES ═══');
    for (const resp of result.responses) {
      const content = resp.content?.trim().slice(0, 50) || '(empty)';
      console.log(`   [${resp.provider}] ${resp.model}: "${content}"`);
    }

    // Evaluate
    const bothSaidYes = result.responses.every(r =>
      r.content?.toLowerCase().includes('yes')
    );

    if (bothSaidYes) {
      console.log('\n   ✅ Both models answered correctly (YES)');
    } else {
      console.log('\n   ⚠️  Models disagreed or gave wrong answer');
    }

  } catch (err) {
    console.log(`   ❌ Consensus failed: ${err.message}`);
  }

  // 5. Test with 3 validators for better consensus
  console.log('\n5️⃣  Testing with mistral (if available)...');

  try {
    const mistral = await createOllamaValidator('mistral:7b-instruct');
    const available = await mistral.isAvailable();

    if (available) {
      router.validators.push(mistral);
      console.log('   ✅ Added mistral:7b-instruct');

      const result = await router.ossConsensus('What is 5+5? Answer with just the number.', {
        timeout: 45000,
      });

      console.log('\n   ═══ 3-MODEL CONSENSUS ═══');
      console.log(`   Responses: ${result.responses.length}`);
      console.log(`   Agreement: ${(result.agreement * 100).toFixed(1)}%`);
      console.log(`   Has Consensus: ${result.hasConsensus}`);

      for (const resp of result.responses) {
        const content = resp.content?.trim().slice(0, 30) || '(empty)';
        console.log(`   [${resp.model}]: "${content}"`);
      }
    } else {
      console.log('   ⚠️  mistral not available, skipping 3-model test');
    }
  } catch (err) {
    console.log(`   ⚠️  3-model test failed: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🐕 OSS Consensus Test Complete');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
