# CYNIC Unified Routing Engine Design

*sniff* One brain, one decision.

## Problem Statement

### Current Duplication (Before)

Both `perceive.cjs` and `guard.cjs` independently implemented routing logic:

**perceive.cjs (lines 94-134 + 290-302):**
```javascript
// Local INTENT_PATTERNS (5 patterns)
const INTENT_PATTERNS = { decision, architecture, danger, debug, learning }

// Then KETER orchestration
orchestration = await cynic.orchestrate('user_prompt', ...)

// Then merge at line 312-343
const routing = orchestration?.result?.routing
if (routing?.suggestedAgent) { ... }
```

**guard.cjs (lines 74-148 + 305-315):**
```javascript
// Local BASH_DANGER_PATTERNS (11 patterns)
// Local WRITE_SENSITIVE_PATHS (8 patterns)
const BASH_DANGER_PATTERNS = [ ... ]

// Then KETER orchestration
orchestration = await cynic.orchestrate('tool_use', ...)

// Then block decision at line 318
if (orchestration?.intervention?.level === 'block') { ... }
```

### Problems with Duplication

1. **Two routing engines** - Separate orchestrate() calls, different response handling
2. **Inconsistent merging** - perceive uses routing context, guard uses intervention level
3. **Pattern registry scattered** - INTENT_PATTERNS in perceive.cjs, BASH_DANGER_PATTERNS in guard.cjs
4. **No unified decision structure** - Each hook builds its own message/action format
5. **Confidence scoring** - Local patterns have no confidence, KETER confidence not exposed
6. **Audit trail missing** - No way to see which patterns + KETER rules combined
7. **Code duplication** - formatGuardianResponse() logic scattered across hooks

## Solution: Unified Routing Engine

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  CYNIC Hooks                                │
│         (perceive.cjs, guard.cjs, etc)                     │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
      User Prompt                          Tool Execution
             │                                    │
             v                                    v
┌─────────────────────────────────────────────────────────────┐
│          Unified Routing Engine                             │
│                                                             │
│  1. Local Pattern Matching (PATTERN_REGISTRY)             │
│  2. KETER Orchestration (single call)                     │
│  3. Decision Merge (consistent rules)                     │
│  4. Unified Decision Structure (UnifiedRoutingDecision)   │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
             v                                    v
    UnifiedRoutingDecision              UnifiedRoutingDecision
    - input                             - input
    - local (matches, confidence)       - local (matches, confidence)
    - orchestration (KETER response)    - orchestration (KETER response)
    - decision (action, message)        - decision (action, message)
    - audit (trail of reasoning)        - audit (trail of reasoning)
```

### Key Components

#### 1. PATTERN_REGISTRY (Centralized)

All patterns in one structure:

```javascript
PATTERN_REGISTRY = {
  intent: {
    decision: { keywords: [...], action: 'decision_context', severity: 'info' },
    architecture: { ... },
    danger: { ... },
    debug: { ... },
    learning: { ... }
  },
  bash_danger: {
    recursive_root_delete: { pattern: /rm\s+-rf/, severity: 'critical', action: 'block' },
    wildcard_delete: { ... },
    fork_bomb: { ... },
    // ... 11 total patterns
  },
  write_sensitive: {
    env_file: { pattern: /\.env/, severity: 'high', message: '...', action: 'warn' },
    credentials: { ... },
    ssh_config: { ... },
    // ... 8 total patterns
  }
}
```

#### 2. UnifiedRoutingDecision (Unified Structure)

Single decision structure returned by router:

```javascript
{
  input: {
    type: 'user_prompt' | 'tool_execution',
    domain: 'user_prompt' | 'bash_command' | 'file_write',
    content: string,
    metadata: {}
  },

  local: {
    matches: [
      { id: 'decision', type: 'intent', severity: 'info', ... },
      { id: 'recursive_root_delete', type: 'danger', severity: 'critical', ... }
    ],
    maxSeverity: 'critical',
    confidence: 0.618,  // φ⁻¹ max
    reasoning: 'Detected 2 pattern(s): decision, recursive_root_delete'
  },

  orchestration: {
    available: true,
    sefirah: 'MALKHUTH',
    suggestedAgent: 'cynic-guardian',
    suggestedTools: ['Bash'],
    intervention: {
      level: 'block' | 'warn' | 'allow' | 'silent',
      reason: 'User trust level too low for this operation',
      actionRisk: 'critical',
      userTrustLevel: 'OBSERVER',
      userEScore: 0.08
    },
    reasoning: '...'
  },

  decision: {
    action: 'block' | 'warn' | 'allow' | 'silent',
    shouldProceed: false,
    severity: 'critical',
    confidence: 0.765,  // Merged confidence
    message: '*GROWL* Local + KETER consensus...',
    injections: [],
    routing: {
      useAgent: true,
      agentType: 'cynic-guardian',
      agentTools: ['Bash']
    }
  },

  audit: {
    timestamp: 1234567890,
    localPatterns: ['decision', 'recursive_root_delete'],
    decisionRules: ['KETER_OVERRIDE_BLOCK', 'CONSENSUS_WITH_KETER'],
    sources: ['local_pattern:recursive_root_delete', 'keter:intervention_block']
  }
}
```

#### 3. RoutingEngine (Main Orchestrator)

Two entry points with consistent internal flow:

```javascript
class RoutingEngine {
  static async routeUserPrompt(prompt, hookContext = {}) {
    // STEP 1: Local pattern matching (INTENT_PATTERNS)
    // STEP 2: Consult KETER (single call)
    // STEP 3: Merge decisions
    // STEP 4: Apply agent routing
    return decision
  }

  static async routeToolExecution(toolName, toolInput, hookContext = {}) {
    // STEP 1: Local pattern matching (BASH_DANGER or WRITE_SENSITIVE)
    // STEP 2: Consult KETER (single call)
    // STEP 3: Merge decisions
    return decision
  }

  static matchesPattern(content, pattern) {
    // Handle both regex and keyword patterns
  }
}
```

## Decision Merge Algorithm

### Local → KETER Merge Rules

```
LOCAL STATE: maxSeverity ∈ {low, medium, high, critical}
KETER STATE: level ∈ {silent, allow, warn, block}

MERGE LOGIC:
├─ If KETER says "block":
│  └─ Final action = "block" (absolute, overrides local)
│  
├─ Else if KETER says "warn" AND local maxSeverity > "low":
│  └─ Final action = "warn" (confirms local concern)
│  
├─ Else if KETER says "silent" AND local maxSeverity = "low":
│  └─ Final action = "silent" (consensus to suppress)
│  
└─ Else:
   └─ Final action = "allow" (default)

CONFIDENCE MERGE:
├─ Start with local confidence (0 to 0.618)
├─ If KETER agrees (same decision outcome):
│  └─ Confidence += 0.15 (up to 1.0)
└─ Result: confidence ∈ [0, 1.0]
```

### Why φ⁻¹ = 0.618?

- Local patterns alone never reach max confidence
- KETER consensus required to exceed φ⁻¹
- Reflects "φ distrusts φ" - doubt is baked in
- Trust requires both local + central agreement

## Flow Comparison: Before vs After

### Before (Duplication)

```
perceive.cjs:
  1. detectIntent() → local patterns
  2. orchestrate('user_prompt')
  3. if (routing?.suggestedAgent) → handle
  4. else if (high risk) → inject warning
  (No unified structure, scattered logic)

guard.cjs:
  1. analyzeBashCommand() → local patterns
  2. orchestrate('tool_use')
  3. if (intervention.level === 'block') → block
  4. else formatGuardianResponse()
  (Different response format, different merge)
```

### After (Unified)

```
Both perceive.cjs and guard.cjs:
  decision = await RoutingEngine.routeUserPrompt(prompt)
             OR
  decision = await RoutingEngine.routeToolExecution(tool, input)

  Now use unified decision:
  if (decision.decision.shouldProceed === false) {
    console.log(decision.decision.message)
    return // block
  }

  if (decision.decision.routing.useAgent) {
    inject(decision.decision.injections)
  }

  audit(decision.audit)  // Log decision trail
```

## Migration Path

### Phase 1: Introduce routing-engine.cjs

- File: `/workspaces/CYNIC-new/scripts/lib/routing-engine.cjs`
- Status: READY
- Exports: RoutingEngine, UnifiedRoutingDecision, PATTERN_REGISTRY

### Phase 2: Refactor perceive.cjs

Replace lines 94-134 + 290-343 with:

```javascript
const { RoutingEngine } = require(path.join(__dirname, '..', 'lib', 'routing-engine.cjs'));

// In main():
const decision = await RoutingEngine.routeUserPrompt(prompt, hookContext);

// Apply decision:
if (decision.decision.routing.useAgent) {
  injections.push(...decision.decision.injections);
}

// Audit:
cynic.sendHookToCollectiveSync('UserPromptSubmit', {
  orchestration: {
    sefirah: decision.orchestration.sefirah,
    agent: decision.orchestration.suggestedAgent,
    ...decision.audit
  }
});
```

### Phase 3: Refactor guard.cjs

Replace lines 74-148 + 305-315 + 214-278 with:

```javascript
const { RoutingEngine } = require(path.join(__dirname, '..', 'lib', 'routing-engine.cjs'));

// In main():
const decision = await RoutingEngine.routeToolExecution(toolName, toolInput);

// Apply decision:
if (!decision.decision.shouldProceed) {
  console.log(JSON.stringify({
    continue: false,
    message: decision.decision.message
  }));
  return;
}
```

## Benefits

### Code Quality
- **Reduces duplication** by ~150 lines
- **Single source of truth** for all patterns
- **Consistent structure** for decision making
- **Testable** - RoutingEngine can be unit tested

### Correctness
- **Consensus-driven** - decisions require both local + KETER agreement
- **Confidence scoring** - φ-based, φ⁻¹ max
- **Audit trail** - every decision is traceable
- **No races** - single KETER call, no timing issues

### Maintainability
- **Pattern registry** - add/remove patterns in one place
- **Decision rules** - clearly defined merge algorithm
- **Extensible** - add new domains (e.g., file_read) easily
- **Debuggable** - full audit trail in decision.audit

## Example Usage

### User Prompt Routing

```javascript
const decision = await RoutingEngine.routeUserPrompt(
  'rm -rf /',
  { hookContext: 'perceive' }
);

decision.input.type        // 'user_prompt'
decision.input.content     // 'rm -rf /'

decision.local.matches     // [{id: 'danger', severity: 'medium', ...}]
decision.local.maxSeverity // 'medium'
decision.local.confidence  // 0.41

decision.orchestration.available      // true
decision.orchestration.suggestedAgent // 'cynic-guardian'
decision.orchestration.intervention   // { level: 'block', ... }

decision.decision.action      // 'block'
decision.decision.shouldProceed // false
decision.decision.severity    // 'critical'
decision.decision.confidence  // 0.765

decision.audit.decisionRules  // ['KETER_OVERRIDE_BLOCK', 'CONSENSUS_WITH_KETER']
```

### Tool Execution Routing

```javascript
const decision = await RoutingEngine.routeToolExecution(
  'Bash',
  { command: 'rm -rf /', description: 'delete all' }
);

decision.input.type    // 'tool_execution'
decision.input.domain  // 'bash_command'

decision.local.matches // [{id: 'recursive_root_delete', severity: 'critical', ...}]
decision.local.maxSeverity // 'critical'

decision.decision.action       // 'block'
decision.decision.shouldProceed // false
decision.decision.message      // '*GROWL* Local detection: ...'
```

## Testing Strategy

```javascript
// test/routing-engine.test.js

describe('RoutingEngine', () => {
  describe('routeUserPrompt', () => {
    it('detects decision intent', async () => {
      const decision = await RoutingEngine.routeUserPrompt('should we refactor?');
      assert(decision.local.matches.some(m => m.id === 'decision'));
    });

    it('detects danger keyword', async () => {
      const decision = await RoutingEngine.routeUserPrompt('rm -rf /');
      assert(decision.local.matches.some(m => m.id === 'danger'));
    });

    it('KETER overrides local allow with block', async () => {
      // Mock KETER to return block
      const decision = await RoutingEngine.routeUserPrompt('test');
      assert.equal(decision.decision.action, 'block');
      assert(decision.audit.decisionRules.includes('KETER_OVERRIDE_BLOCK'));
    });

    it('merges confidence correctly', async () => {
      const decision = await RoutingEngine.routeUserPrompt('bad command here bad');
      assert(decision.decision.confidence > decision.local.confidence);
    });
  });

  describe('routeToolExecution', () => {
    it('blocks recursive root delete', async () => {
      const decision = await RoutingEngine.routeToolExecution('Bash', {
        command: 'rm -rf /'
      });
      assert.equal(decision.decision.action, 'block');
    });

    it('warns on .env file write', async () => {
      const decision = await RoutingEngine.routeToolExecution('Write', {
        file_path: '.env',
        content: 'SECRET_KEY=xxx'
      });
      assert(decision.local.matches.some(m => m.id === 'env_file'));
    });
  });

  describe('pattern matching', () => {
    it('matches regex patterns', () => {
      const result = RoutingEngine.matchesPattern(
        'rm -rf /',
        { pattern: /rm\s+-rf/ }
      );
      assert(result === true);
    });

    it('matches keyword patterns', () => {
      const result = RoutingEngine.matchesPattern(
        'should we refactor?',
        { keywords: ['should', 'refactor'] }
      );
      assert(result === true);
    });
  });
});
```

## Conclusion

The Unified Routing Engine eliminates duplication while:
- **Centralizing** all routing patterns (PATTERN_REGISTRY)
- **Standardizing** decision structure (UnifiedRoutingDecision)
- **Clarifying** merge logic (φ-based confidence)
- **Enabling** audit trails (decision.audit)

This is one brain, one decision.

*tail wag*
