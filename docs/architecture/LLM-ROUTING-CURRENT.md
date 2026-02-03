# CYNIC LLM Routing Architecture - Current State

> **Status**: Phase 1 unification complete (v1.5.1)
> **Date**: 2026-02-03
> **Purpose**: Document state and migration path

## Update: @cynic/llm Package Created

The `@cynic/llm` package has been created as the unified entry point:

```javascript
import {
  LLMResponse,
  ConsensusResult,
  ExecutionTier,
  LLMProvider,
  ConfidenceThresholds,
  createOllamaValidator,
  createAirLLMValidator,
  createHybridRouter,
} from '@cynic/llm';
```

**Phase 1**: Re-exports from `@cynic/node/orchestration` for backward compatibility
**Phase 2**: Standalone implementations (pending)
**Phase 3**: Deprecate old routing modules (pending)

---

---

## Executive Summary

CYNIC currently has **THREE distinct LLM routing systems** that evolved separately:

| System | Location | Purpose | Status |
|--------|----------|---------|--------|
| **llm-adapter.js** | `packages/node/src/orchestration/` | Consensus voting | PRIMARY |
| **llm-router.js** | `packages/node/src/routing/` | Cost-optimized tiers | ORPHANED |
| **llm-judgment-bridge.cjs** | `scripts/lib/` | Hook-based judgment | SCRIPT-ONLY |

**Problem**: Duplicated logic, inconsistent APIs, AirLLM isolated from main architecture.

---

## System 1: llm-adapter.js (PRIMARY)

**Location**: `packages/node/src/orchestration/llm-adapter.js` (847 lines)

### Classes

```
LLMResponse          - Standardized response format
ConsensusResult      - Multi-LLM voting result
LLMAdapter           - Abstract base class
ClaudeCodeAdapter    - Pass-through for Claude Code
OSSLLMAdapter        - Ollama/OpenAI-compatible
LLMRouter            - Routes requests + consensus
```

### Key Features

1. **Multi-LLM Consensus** (line 539):
   ```javascript
   async consensus(prompt, options = {}) {
     const quorum = options.quorum || this.consensusConfig.quorum; // φ⁻¹
     // ... parallel requests to all adapters
   }
   ```

2. **φ-Constraints**:
   - `PHI_INV` (61.8%) max confidence for all responses
   - `PHI_INV_2` (38.2%) max confidence for OSS LLMs
   - Quorum threshold: φ⁻¹ = 61.8% agreement

3. **Factory Functions**:
   ```javascript
   createOllamaValidator()
   createLMStudioValidator()
   createOpenAIValidator()
   createValidatorsFromEnv()
   getRouterWithValidators()
   ```

### Integration Points

- Used by: `LLMOrchestrator` (Da'at Bridge)
- Exports: In `packages/node/src/orchestration/index.js`
- Singleton: `getLLMRouter()` / `_resetLLMRouterForTesting()`

---

## System 2: llm-router.js (PARTIALLY ORPHANED)

**Location**: `packages/node/src/routing/llm-router.js` (520 lines)

### Purpose

Cost-optimized tier routing with `CostOptimizer` integration.

### Tiers

```javascript
ComplexityTier.LOCAL  // No LLM (rule-based)
ComplexityTier.LIGHT  // Ollama small models (qwen, mistral)
ComplexityTier.FULL   // Ollama 70B or Claude subagent
```

### Model Mapping

```javascript
TIER_MODEL_MAP = {
  LOCAL: null,
  LIGHT: { primary: QWEN, fallback: MISTRAL, provider: OLLAMA },
  FULL:  { primary: LLAMA3_70B, fallback: DEEPSEEK, claudeAvailable: true },
}
```

### Key Method

```javascript
async route(request) {
  // 1. Determine tier via CostOptimizer
  // 2. Handle LOCAL (no LLM)
  // 3. Get provider for tier
  // 4. Execute LLM call with fallback
}
```

### Status: ORPHANED

- Not integrated with `LLMOrchestrator`
- Not connected to Da'at Bridge
- Has its own `getLLMRouter()` singleton (NAME CONFLICT!)
- Depends on `@cynic/core/llm` which may not export expected classes

---

## System 3: llm-judgment-bridge.cjs (SCRIPT-ONLY)

**Location**: `scripts/lib/llm-judgment-bridge.cjs` (805 lines)

### Purpose

Hook-based LLM judgment for autonomous CYNIC operations.

### Features

1. **Single-Model Judgment**:
   ```javascript
   llmJudge(item, context)      // Quick judgment
   llmRefine(judgment, context) // Refine existing
   llmAnalyzePattern(pattern)   // Pattern learning
   ```

2. **Multi-Model Consensus**:
   ```javascript
   llmConsensusJudge(item, context) {
     // CONSENSUS_MODELS: ['gemma2:2b', 'qwen2:0.5b']
     // CONSENSUS_THRESHOLD: PHI_INV (61.8%)
   }
   ```

3. **AirLLM Integration** (lines 553-704):
   ```javascript
   AIRLLM_ENABLED = process.env.CYNIC_AIRLLM === 'true'
   AIRLLM_MODEL = 'mistral:7b-instruct-q4_0'

   checkAirLLM()   // Check availability
   airllmJudge()   // Deep analysis with large model
   hybridJudge()   // Consensus → AirLLM fallback
   ```

4. **Calibration System**:
   ```javascript
   recordFeedback(judgmentId, wasCorrect, correction)
   getStats()  // Accuracy tracking
   ```

### Status: ISOLATED

- CommonJS (`.cjs`) - not ESM
- Own state file: `~/.cynic/llm-bridge.json`
- Not connected to main orchestration
- Contains AirLLM logic that should be in core

---

## Duplication Analysis

### Consensus Logic

| Feature | llm-adapter.js | llm-judgment-bridge.cjs |
|---------|----------------|-------------------------|
| Quorum | `PHI_INV` | `CONSENSUS_THRESHOLD = PHI_INV` |
| Method | `LLMRouter.consensus()` | `llmConsensusJudge()` |
| Parallel calls | Yes | Yes |
| Dissent tracking | Yes | Yes |

**Verdict**: 90% duplicated logic.

### Ollama Integration

| Feature | llm-adapter.js | llm-router.js | llm-judgment-bridge.cjs |
|---------|----------------|---------------|-------------------------|
| Health check | `isAvailable()` | `_checkOllamaAvailability()` | `checkOllama()` |
| API format | Both Ollama & OpenAI | Ollama only | Ollama only |
| Timeout | 30s default | 30s/120s by tier | 30s default |
| Caching | None | 1 minute | 5 minutes |

**Verdict**: THREE implementations of Ollama connectivity.

### Tier System

| llm-adapter.js | llm-router.js | llm-orchestrator.js |
|----------------|---------------|---------------------|
| N/A (no tiers) | LOCAL/LIGHT/FULL | LOCAL/LIGHT/FULL |
| Consensus focus | Cost optimization | Brain integration |

**Verdict**: Two tier systems, not connected.

---

## Missing Connections

### AirLLM → Da'at Bridge

```
Current:
  llm-judgment-bridge.cjs → hybridJudge() → AirLLM
  (isolated in scripts, no Brain connection)

Target:
  Brain.think() → LLMOrchestrator → LLMRouter → AirLLM validator
```

### Cost Optimizer → LLMRouter (adapter)

```
Current:
  llm-router.js ──uses──→ CostOptimizer
  llm-adapter.js         (no cost awareness)

Target:
  LLMRouter (unified) ──uses──→ CostOptimizer
```

### Calibration → Thompson Sampling

```
Current:
  llm-judgment-bridge.cjs ──has──→ recordFeedback() (EMA)
  learning-service.js ──has──→ Thompson Sampling

Target:
  Unified learning with Thompson Sampling for all LLM selection
```

---

## φ-Alignment Assessment

| Axiom | Score | Reason |
|-------|-------|--------|
| PHI | 68% | Consistent φ⁻¹ constraints across all systems |
| VERIFY | 72% | Good consensus mechanisms |
| CULTURE | 45% | Inconsistent naming and patterns |
| BURN | 35% | Significant duplication |

**Overall**: 55/100 - Below threshold for production.

---

## Recommended Unification

### Target Architecture

```
packages/
  llm/                         # NEW: @cynic/llm package
    src/
      index.js                 # Exports
      unified-router.js        # UnifiedLLMRouter
      adapters/
        claude-code.js
        ollama.js
        openai.js
        airllm.js              # Moved from scripts
      consensus.js             # Extracted consensus logic
      cost-optimizer.js        # Moved from routing
      learning.js              # Thompson Sampling + EMA
      types.js                 # LLMResponse, ConsensusResult
```

### UnifiedLLMRouter API

```javascript
class UnifiedLLMRouter {
  // Single-model completion
  async complete(prompt, options)

  // Multi-model consensus (φ⁻¹ quorum)
  async consensus(prompt, options)

  // Cost-optimized routing
  async route(request)

  // Hybrid: consensus → deep analysis
  async hybrid(prompt, options)

  // Learning feedback
  recordFeedback(responseId, wasCorrect, correction)
}
```

### Migration Path

1. Create `@cynic/llm` package
2. Consolidate types (LLMResponse, ConsensusResult)
3. Merge adapter implementations
4. Integrate AirLLM as validator
5. Connect cost optimizer
6. Unify learning (Thompson + EMA)
7. Update LLMOrchestrator to use unified router
8. Deprecate old modules

---

## Appendix: Environment Variables

### llm-adapter.js
```bash
CYNIC_VALIDATORS=ollama,lm-studio
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.2
LM_STUDIO_ENDPOINT=http://localhost:1234
LM_STUDIO_MODEL=local-model
```

### llm-judgment-bridge.cjs
```bash
CYNIC_LLM_MODEL=gemma2:2b
OLLAMA_HOST=http://localhost:11434
CYNIC_CONSENSUS_MODELS=gemma2:2b,qwen2:0.5b
CYNIC_AIRLLM=true
CYNIC_AIRLLM_MODEL=mistral:7b-instruct-q4_0
```

### Unified (recommended)
```bash
CYNIC_LLM_ENDPOINT=http://localhost:11434
CYNIC_LLM_MODEL=gemma2:2b
CYNIC_LLM_VALIDATORS=gemma2:2b,qwen2:0.5b
CYNIC_LLM_AIRLLM_ENABLED=true
CYNIC_LLM_AIRLLM_MODEL=mistral:7b-instruct-q4_0
```

---

*"Le chien voit le chaos, le chien documente avant de simplifier"* - κυνικός
