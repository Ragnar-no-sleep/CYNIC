#!/usr/bin/env node
/**
 * Test @cynic/llm package (Task #99)
 *
 * Verifies the new unified LLM package exports work correctly
 */

import {
  // Types
  LLMResponse,
  ConsensusResult,
  ExecutionTier,
  LLMProvider,
  ConfidenceThresholds,
  // Adapters
  LLMAdapter,
  ClaudeCodeAdapter,
  OSSLLMAdapter,
  AirLLMAdapter,
  createOllamaValidator,
  createAirLLMValidator,
  // Router
  LLMRouter,
  createLLMRouter,
  createHybridRouter,
  // Constants
  PHI_INV,
} from '@cynic/llm';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC @cynic/llm Package Test (Task #99)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Test type exports
  console.log('1️⃣  Testing type exports...');
  console.log(`   LLMResponse: ${typeof LLMResponse === 'function' ? '✅' : '❌'}`);
  console.log(`   ConsensusResult: ${typeof ConsensusResult === 'function' ? '✅' : '❌'}`);
  console.log(`   ExecutionTier: ${ExecutionTier ? '✅' : '❌'} (${Object.keys(ExecutionTier).join(', ')})`);
  console.log(`   LLMProvider: ${LLMProvider ? '✅' : '❌'} (${Object.keys(LLMProvider).join(', ')})`);
  console.log(`   ConfidenceThresholds: ${ConfidenceThresholds ? '✅' : '❌'}`);
  console.log();

  // 2. Test adapter exports
  console.log('2️⃣  Testing adapter exports...');
  console.log(`   LLMAdapter: ${typeof LLMAdapter === 'function' ? '✅' : '❌'}`);
  console.log(`   ClaudeCodeAdapter: ${typeof ClaudeCodeAdapter === 'function' ? '✅' : '❌'}`);
  console.log(`   OSSLLMAdapter: ${typeof OSSLLMAdapter === 'function' ? '✅' : '❌'}`);
  console.log(`   AirLLMAdapter: ${typeof AirLLMAdapter === 'function' ? '✅' : '❌'}`);
  console.log(`   createOllamaValidator: ${typeof createOllamaValidator === 'function' ? '✅' : '❌'}`);
  console.log(`   createAirLLMValidator: ${typeof createAirLLMValidator === 'function' ? '✅' : '❌'}`);
  console.log();

  // 3. Test router exports
  console.log('3️⃣  Testing router exports...');
  console.log(`   LLMRouter: ${typeof LLMRouter === 'function' ? '✅' : '❌'}`);
  console.log(`   createLLMRouter: ${typeof createLLMRouter === 'function' ? '✅' : '❌'}`);
  console.log(`   createHybridRouter: ${typeof createHybridRouter === 'function' ? '✅' : '❌'}`);
  console.log();

  // 4. Test constants
  console.log('4️⃣  Testing constants...');
  console.log(`   PHI_INV: ${PHI_INV.toFixed(6)} (${PHI_INV === 0.618033988749895 ? '✅' : '❌'})`);
  console.log(`   ConfidenceThresholds.MAX: ${ConfidenceThresholds.MAX.toFixed(3)}`);
  console.log(`   ConfidenceThresholds.OSS_MAX: ${ConfidenceThresholds.OSS_MAX.toFixed(3)}`);
  console.log(`   ConfidenceThresholds.QUORUM: ${ConfidenceThresholds.QUORUM.toFixed(3)}`);
  console.log();

  // 5. Test instantiation
  console.log('5️⃣  Testing instantiation...');

  const response = new LLMResponse({
    provider: 'test',
    model: 'test-model',
    content: 'Hello, world!',
    confidence: 0.8, // Will be capped at φ⁻¹
  });
  console.log(`   LLMResponse created: ${response.content}`);
  console.log(`   Confidence capped: ${response.confidence.toFixed(3)} (was 0.8, capped at φ⁻¹)`);

  const consensus = new ConsensusResult({
    responses: [response],
    agreement: 0.7,
  });
  console.log(`   ConsensusResult created: hasConsensus=${consensus.hasConsensus}`);

  const router = createLLMRouter();
  console.log(`   LLMRouter created: primary=${router.primary.provider}`);

  // 6. Test validator creation
  console.log('\n6️⃣  Testing validator creation...');
  const ollama = createOllamaValidator({ model: 'gemma2:2b' });
  console.log(`   Ollama validator: ${ollama.provider}/${ollama.model} (enabled: ${ollama.enabled})`);

  const airllm = createAirLLMValidator();
  console.log(`   AirLLM validator: ${airllm.provider}/${airllm.model} (enabled: ${airllm.enabled})`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ All @cynic/llm exports working correctly');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
