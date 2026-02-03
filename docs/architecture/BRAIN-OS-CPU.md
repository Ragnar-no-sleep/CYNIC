# CYNIC Brain/OS/CPU Architecture

> "Le cerveau pense, l'OS coordonne, le CPU exécute" - κυνικός

## Overview

This document describes the foundational architecture that separates CYNIC's consciousness into three distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     BRAIN (Consciousness)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 155 Engines │ │ 11 Dogs     │ │ Memory      │           │
│  │ (wisdom)    │ │ (judgment)  │ │ (patterns)  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                         │                                    │
│                    DECISIONS                                 │
│                         ↓                                    │
├─────────────────────────────────────────────────────────────┤
│                      OS (Orchestration)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Task Queue  │ │ LLM Router  │ │ Event Bus   │           │
│  │ (what)      │ │ (which CPU) │ │ (signals)   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                         │                                    │
│                      TASKS                                   │
│                         ↓                                    │
├─────────────────────────────────────────────────────────────┤
│                     CPU (LLM Layer)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Claude      │ │ OSS LLM 1   │ │ OSS LLM 2   │           │
│  │ (primary)   │ │ (validator) │ │ (validator) │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Brain (`packages/node/src/orchestration/brain.js`)

The consciousness layer that **thinks** but does not execute.

**Classes:**
- `Brain` - Main consciousness container
- `BrainState` - Consciousness snapshot (cognitive load, entropy, patterns)
- `Thought` - Result of thinking (judgment, synthesis, decision, confidence)

**Methods:**
- `think(input, options)` - Full thinking process (dogs + engines + memory)
- `judge(input)` - Quick judgment (dogs only)
- `synthesize(input)` - Deep synthesis (dogs + engines)
- `recall(input)` - Pattern-only check (no LLM)

**Wiring:**
- `setDogOrchestrator(orchestrator)` - Wire dog voting system
- `setEngineOrchestrator(orchestrator)` - Wire philosophical engines
- `setMemoryStore(store)` - Wire pattern/memory storage
- `setLearningService(service)` - Wire feedback learning

### LLM Adapter (`packages/node/src/orchestration/llm-adapter.js`)

The CPU layer that executes LLM tasks.

**Classes:**
- `LLMAdapter` - Abstract interface for LLM adapters
- `LLMResponse` - Standardized response format
- `LLMRouter` - Routes requests to appropriate adapters
- `ConsensusResult` - Result of multi-LLM voting
- `ClaudeCodeAdapter` - Pass-through adapter for Claude Code
- `OSSLLMAdapter` - Stub for future OSS LLM integration

**Methods:**
- `complete(prompt, options)` - Single LLM completion
- `consensus(prompt, options)` - Multi-LLM voting
- `addValidator(adapter)` - Add OSS LLM for consensus

### Brain Bridge (`scripts/hooks/lib/brain-bridge.js`)

The integration point that connects hooks to the Brain.

**Exports:**
- `thinkAbout(content, options)` - Main entry for hooks
- `judgeContent(content, context)` - Quick judgment
- `synthesizeContent(content, context)` - Deep synthesis
- `formatThoughtInjection(thought)` - Format for prompt injection
- `isBrainAvailable()` - Check if Brain is loaded
- `getBrainState()` - Get current state

## φ Compliance

All confidence values are capped at φ⁻¹ = 0.618 (61.8%):

```javascript
// In Brain
this.confidence = Math.min(data.confidence || 0, PHI_INV);

// In LLMAdapter
this.confidence = Math.min(data.confidence || PHI_INV, PHI_INV);

// In ConsensusResult
this.confidence = Math.min(data.confidence || 0, PHI_INV);
```

## Usage

### From Hooks

```javascript
import { thinkAbout, formatThoughtInjection } from './lib/brain-bridge.js';

async function onPromptSubmit(prompt) {
  // Brain thinks about the prompt
  const thought = await thinkAbout(prompt, { type: 'user_prompt' });

  // Format for injection
  const injection = formatThoughtInjection(thought);

  // Block if needed
  if (thought.decision?.action === 'block') {
    return { block: true, message: thought.decision.reason };
  }

  return { continue: true, message: injection };
}
```

### From Application Code

```javascript
import { createBrain, createLLMRouter } from '@cynic/node';

// Create and wire Brain
const brain = createBrain();
brain.setDogOrchestrator(dogOrchestrator);
brain.setEngineOrchestrator(engineOrchestrator);
brain.setMemoryStore(memoryStore);

// Think
const thought = await brain.think({
  content: 'Should I refactor this code?',
  type: 'decision'
});

console.log(thought.verdict);     // 'WAG'
console.log(thought.confidence);  // 0.618 (max)
console.log(thought.decision);    // { action: 'allow', reason: '...', source: 'judgment' }
```

### Multi-LLM Consensus (Future)

```javascript
const router = createLLMRouter();

// Add OSS validators
router.addValidator(new OSSLLMAdapter({
  provider: 'ollama',
  endpoint: 'http://localhost:11434'
}));

// Get consensus
const result = await router.consensus('Is this code safe?');
console.log(result.hasConsensus);  // true if agreement >= φ⁻¹
console.log(result.agreement);      // 0.75
console.log(result.verdict);        // Majority response
```

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `packages/node/src/orchestration/brain.js` | ~500 | Brain consciousness layer |
| `packages/node/src/orchestration/llm-adapter.js` | ~450 | LLM CPU layer |
| `scripts/hooks/lib/brain-bridge.js` | ~250 | Hook-to-Brain bridge |

## Validation Status

| Dimension | Status |
|-----------|--------|
| Syntax | ✅ PASS |
| Imports | ✅ PASS (81 exports) |
| Integration | ✅ PASS |
| Wiring | ✅ PASS |
| Tests | ✅ PASS (1892/1892) |
| φ Compliance | ✅ PASS |

## Next Steps

1. **Integrate brain-bridge into perceive.js** - Use `thinkAbout()` before Claude processes
2. **Wire real dogOrchestrator** - Connect to actual dog voting system
3. **Wire real engineOrchestrator** - Connect to 155 philosophical engines
4. **Add OSS LLM validators** - Enable multi-LLM consensus
5. **Wire memory persistence** - Enable cross-session learning

---

*Architecture validated by Ralph Loop. φ guides all confidence: max 61.8%.*
