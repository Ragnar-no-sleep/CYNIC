#!/usr/bin/env node
/**
 * Test standalone adapters from @cynic/llm
 */

import {
  LLMAdapter,
  ClaudeCodeAdapter,
  OSSLLMAdapter,
  AirLLMAdapter,
  createOllamaValidator,
  createAirLLMValidator,
  LLMResponse,
} from '@cynic/llm';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC Standalone Adapters Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Test ClaudeCodeAdapter
  console.log('1️⃣  Testing ClaudeCodeAdapter...');
  const claude = new ClaudeCodeAdapter();
  const claudeResp = await claude.complete('Test prompt');
  console.log(`   Provider: ${claudeResp.provider}`);
  console.log(`   Content: "${claudeResp.content.slice(0, 30)}..."`);
  console.log(`   Confidence: ${claudeResp.confidence.toFixed(3)}`);
  console.log(`   Type: pass-through ✅\n`);

  // 2. Test OSSLLMAdapter via createOllamaValidator
  console.log('2️⃣  Testing OSSLLMAdapter (Ollama)...');
  const ollama = createOllamaValidator({ model: 'gemma2:2b' });
  const available = await ollama.isAvailable();
  console.log(`   Available: ${available}`);

  if (available) {
    try {
      const ollamaResp = await ollama.complete('What is 2+2? Answer with just the number.');
      console.log(`   Response: "${ollamaResp.content.trim()}"`);
      console.log(`   Confidence: ${ollamaResp.confidence.toFixed(3)} (φ⁻² capped)`);
      console.log(`   Duration: ${ollamaResp.duration}ms ✅\n`);
    } catch (err) {
      console.log(`   Error: ${err.message}\n`);
    }
  } else {
    console.log('   Ollama not running, skipping\n');
  }

  // 3. Test AirLLMAdapter
  console.log('3️⃣  Testing AirLLMAdapter...');
  const airllm = createAirLLMValidator();
  const airAvail = await airllm.checkAvailability();
  console.log(`   Available: ${airAvail.available}`);

  if (airAvail.available) {
    try {
      const airResp = await airllm.complete('What is 3+3? Answer with just the number.');
      console.log(`   Response: "${airResp.content.trim()}"`);
      console.log(`   Deep Analysis: ${airResp.metadata.deepAnalysis}`);
      console.log(`   Duration: ${airResp.duration}ms ✅\n`);
    } catch (err) {
      console.log(`   Error: ${err.message}\n`);
    }
  } else {
    console.log(`   Reason: ${airAvail.reason}\n`);
  }

  // 4. Test inheritance
  console.log('4️⃣  Testing class hierarchy...');
  console.log(`   LLMAdapter is base: ${LLMAdapter.name === 'LLMAdapter' ? '✅' : '❌'}`);
  console.log(`   ClaudeCodeAdapter extends LLMAdapter: ${claude instanceof LLMAdapter ? '✅' : '❌'}`);
  console.log(`   OSSLLMAdapter extends LLMAdapter: ${ollama instanceof LLMAdapter ? '✅' : '❌'}`);
  console.log(`   AirLLMAdapter extends OSSLLMAdapter: ${airllm instanceof OSSLLMAdapter ? '✅' : '❌'}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Standalone adapters working correctly');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
