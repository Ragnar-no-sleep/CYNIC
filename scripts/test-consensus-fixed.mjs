#!/usr/bin/env node
/**
 * Test Multi-LLM Consensus - Fixed version
 * Uses correct model names and better test prompts
 */

import { OSSLLMAdapter, ConsensusResult, LLMRouter } from '../packages/node/src/orchestration/llm-adapter.js';

const PHI_INV = 0.618033988749895;

// OSS-only router for testing
class OSSOnlyRouter extends LLMRouter {
  async ossConsensus(prompt, options = {}) {
    const timeout = options.timeout || 30000;
    const adapters = this.validators.filter(v => v.enabled);

    if (adapters.length === 0) {
      throw new Error('No OSS validators available');
    }

    if (adapters.length === 1) {
      const response = await adapters[0].complete(prompt, options);
      return new ConsensusResult({
        responses: [response],
        agreement: 1.0,
        verdict: response.content,
        confidence: response.confidence,
      });
    }

    const responses = [];
    for (const adapter of adapters) {
      try {
        const resp = await Promise.race([
          adapter.complete(prompt, options),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
        responses.push(resp);
        console.log(`   ✅ ${adapter.model}: "${resp.content.trim().slice(0, 40)}..."`);
      } catch (err) {
        console.log(`   ❌ ${adapter.model}: ${err.message}`);
      }
    }

    if (responses.length === 0) throw new Error('All validators failed');

    const { agreement, verdict, dissent } = this._calculateAgreement(responses);
    return new ConsensusResult({ responses, agreement, verdict, confidence: agreement * PHI_INV, dissent });
  }
}

async function createOllamaValidator(model) {
  const adapter = new OSSLLMAdapter({
    provider: 'ollama', model,
    endpoint: 'http://localhost:11434',
    apiFormat: 'ollama', timeout: 30000,
  });
  adapter.enabled = true;
  return adapter;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC Consensus Test - Fixed');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Use reliable models: gemma2:2b and mistral:7b-instruct-q4_0
  const gemma = await createOllamaValidator('gemma2:2b');
  const mistral = await createOllamaValidator('mistral:7b-instruct-q4_0');

  const router = new OSSOnlyRouter({ validators: [gemma, mistral] });
  console.log('Validators: gemma2:2b, mistral:7b-instruct-q4_0\n');

  // Test 1: Simple yes/no
  console.log('─── Test 1: Yes/No Question ───');
  const r1 = await router.ossConsensus('Answer with just YES or NO: Is 2+2 equal to 4?', { timeout: 30000 });
  console.log(`\nAgreement: ${(r1.agreement * 100).toFixed(0)}% | Consensus: ${r1.hasConsensus}\n`);

  // Test 2: Number answer
  console.log('─── Test 2: Number Answer ───');
  const r2 = await router.ossConsensus('What is 7+3? Reply with just the number.', { timeout: 30000 });
  console.log(`\nAgreement: ${(r2.agreement * 100).toFixed(0)}% | Consensus: ${r2.hasConsensus}\n`);

  // Test 3: Code verdict
  console.log('─── Test 3: Code Verdict ───');
  const r3 = await router.ossConsensus(`
Is this code secure? Answer SECURE or INSECURE:
eval(userInput)
`.trim(), { timeout: 30000 });
  console.log(`\nAgreement: ${(r3.agreement * 100).toFixed(0)}% | Consensus: ${r3.hasConsensus}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🐕 Done');
}

main().catch(console.error);
