#!/usr/bin/env node
/**
 * Test AirLLM Integration (Task #98)
 *
 * Verifies AirLLM adapter is correctly integrated into Da'at architecture
 */

import {
  AirLLMAdapter,
  createAirLLMValidator,
  checkAirLLMAvailability,
  createHybridRouter,
} from '../packages/node/src/orchestration/llm-adapter.js';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC AirLLM Integration Test (Task #98)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Check class exports
  console.log('1️⃣  Checking exports...');
  console.log(`   AirLLMAdapter: ${typeof AirLLMAdapter === 'function' ? '✅' : '❌'}`);
  console.log(`   createAirLLMValidator: ${typeof createAirLLMValidator === 'function' ? '✅' : '❌'}`);
  console.log(`   checkAirLLMAvailability: ${typeof checkAirLLMAvailability === 'function' ? '✅' : '❌'}`);
  console.log(`   createHybridRouter: ${typeof createHybridRouter === 'function' ? '✅' : '❌'}\n`);

  // 2. Check availability without CYNIC_AIRLLM env
  console.log('2️⃣  Checking availability (CYNIC_AIRLLM not set)...');
  const availWithout = await checkAirLLMAvailability();
  console.log(`   Available: ${availWithout.available}`);
  console.log(`   Reason: ${availWithout.reason}\n`);

  // 3. Create adapter directly
  console.log('3️⃣  Creating AirLLM adapter directly...');
  const adapter = createAirLLMValidator({
    model: 'mistral:7b-instruct-q4_0',
  });
  console.log(`   Provider: ${adapter.provider}`);
  console.log(`   Model: ${adapter.model}`);
  console.log(`   Timeout: ${adapter.timeout}ms`);
  console.log(`   Deep Analysis: ${adapter.deepAnalysis}`);
  console.log(`   Enabled: ${adapter.enabled}\n`);

  // 4. Check model availability
  console.log('4️⃣  Checking model availability...');
  const modelAvail = await adapter.checkAvailability();
  console.log(`   Available: ${modelAvail.available}`);
  if (modelAvail.reason) console.log(`   Reason: ${modelAvail.reason}`);
  if (modelAvail.availableModels) {
    console.log(`   Available models: ${modelAvail.availableModels.join(', ')}`);
  }
  console.log();

  // 5. Test deep analysis completion (if model available)
  if (modelAvail.available) {
    console.log('5️⃣  Testing deep analysis completion...');
    console.log('   Prompt: "What is 2+2? Answer with just the number."\n');

    try {
      const response = await adapter.complete('What is 2+2? Answer with just the number.');
      console.log(`   ✅ Response: "${response.content.trim()}"`);
      console.log(`   Model: ${response.model}`);
      console.log(`   Duration: ${response.duration}ms`);
      console.log(`   Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      console.log(`   Deep Analysis: ${response.metadata.deepAnalysis}`);
      console.log(`   Type: ${response.metadata.type}\n`);
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}\n`);
    }
  } else {
    console.log('5️⃣  Skipping completion test (model not available)\n');
  }

  // 6. Create hybrid router
  console.log('6️⃣  Creating hybrid router...');
  const router = createHybridRouter({
    fastModels: ['gemma2:2b'],
  });
  console.log(`   Validators: ${router.validators.length}`);
  for (const v of router.validators) {
    console.log(`   - ${v.provider}/${v.model} (enabled: ${v.enabled})`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🐕 AirLLM Integration Test Complete');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
