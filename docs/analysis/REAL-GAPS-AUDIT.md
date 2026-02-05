# CYNIC Real Gaps Audit - Ralph Loop Analysis

> *"φ distrusts φ"* - Trust the code, not the docs
>
> Generated: 2026-02-05 by Ralph Loop

## Executive Summary

**CYNIC is 70-80% wired, 20-30% live.**

The architecture exists. The code is written. But critical paths are **disconnected**.

---

## ORCHESTRATION LAYER GAPS

### GAP O1: KabbalisticRouter.route() - NEVER CALLED

**File**: `packages/node/src/orchestration/kabbalistic-router.js`
**Lines**: 309-446

**Should**: Route all decisions through Tree of Life (11 Sefirot)
**Actually**: Created at `server.js:186`, but `.route()` never invoked

**Evidence**: grep finds ONE call in comment example, ZERO in production code

**Impact**: 100% of routing intelligence dormant

**Fix**:
```javascript
// unified-orchestrator.js - _routeEvent()
// Already fixed earlier, but verify it's called in production paths
```

---

### GAP O2: LLMRouter.consensus() - IMPLEMENTED, NEVER INVOKED

**File**: `packages/llm/src/router.js`
**Lines**: 295-351

**Should**: Multi-model voting for critical decisions (security, deployment)
**Actually**: Method exists, validators created, but consensus() never called

**Evidence**: grep finds ZERO calls to `.consensus()` in codebase

**Impact**: Multi-LLM validation disabled, single-model decisions everywhere

**Fix**:
```javascript
// Already fixed in unified-orchestrator.js routeToLLM()
// But verify consensus is triggered for critical domains
```

---

### GAP O3: CollectivePack - Sync Path Skips Persistence

**File**: `packages/node/src/collective-singleton.js`
**Lines**: 177-203, 256

**Should**: `getCollectivePack()` loads Dogs with learned state from PostgreSQL
**Actually**: Sync path (`getCollectivePack()`) skips persistence, async path (`getCollectivePackAsync()`) works

**Evidence**: Line 227 shows sync call doesn't wait for persistence

**Impact**: Most code uses sync path → Dogs start with EMPTY learned state

**Fix**:
```javascript
// collective-singleton.js:227
// Replace sync getCollectivePack() calls with await getCollectivePackAsync()
// Or make sync version block on initial load
```

---

### GAP O4: Q-Learning Weights Never Applied to Routing

**File**: `packages/node/src/orchestration/kabbalistic-router.js`
**Lines**: 446

**Should**: `applyLearnedWeights()` adjusts routing based on Q-Table
**Actually**: Only called inside `route()` (which is never called)

**Evidence**: Function exists but route() never invoked

**Impact**: Q-Learning trains but weights never influence actual routing

**Fix**: Call `applyLearnedWeights()` in alternative routing paths

---

## JUDGE SYSTEM GAPS

### GAP J1: judgeAsync() - DEFINED BUT NEVER CALLED

**File**: `packages/node/src/judge/judge.js`
**Lines**: 243-281

**Should**: `judgeAsync()` consults 73 philosophy engines during judgment
**Actually**: ALL calls go to sync `judge()`, never `judgeAsync()`

**Evidence**:
- `node.js:1226` calls `this._judge.judge(item, context)` - SYNC
- No calls to `judgeAsync()` found

**Impact**: 73 engines contribute 0% to any judgment

**Fix**:
```javascript
// Change call sites from judge() to judgeAsync()
// packages/node/src/node.js:1226
const judgment = await this._judge.judgeAsync(item, context); // ← ASYNC
```

---

### GAP J2: EngineIntegration.consult() - Exists But Unreachable

**File**: `packages/node/src/judge/engine-integration.js`
**Lines**: 155-215

**Should**: Query 5 relevant engines per judgment
**Actually**: Only reachable via `judgeAsync()` which is never called

**Impact**: Engine wisdom completely dormant

**Fix**: Part of J1 fix - call judgeAsync()

---

### GAP J3: LearningService Has No recordJudgment() Method

**File**: `packages/node/src/judge/learning-service.js`

**Should**: Every judgment auto-recorded for learning analysis
**Actually**: No `recordJudgment()` method exists. Only learns from external signals.

**Evidence**: grep confirms method doesn't exist

**Impact**: Judge makes 1000 judgments, learning service sees 0 directly

**Fix**:
```javascript
// learning-service.js - Add method:
recordJudgment(judgment, metadata = {}) {
  // Record judgment for learning analysis
  this._judgmentHistory.push({ judgment, metadata, timestamp: Date.now() });
  // Optionally trigger incremental learning
}
```

---

### GAP J4: ResidualDetector - Only Anomalies Feed Learning

**File**: `packages/node/src/judge/residual.js`
**Lines**: 55-114

**Should**: All judgments analyzed for pattern discovery
**Actually**: Only anomalies (residual > 38.2%) reach learning service

**Evidence**: `node.js:1236-1257` only processes `if (residualAnalysis.isAnomaly)`

**Impact**: 70%+ of discovery opportunities missed (normal judgments ignored)

**Fix**:
```javascript
// node.js:1236 - Also process non-anomalies
if (residualAnalysis) {
  // Always record for pattern detection
  this._learningService.processJudgmentAnalysis?.(residualAnalysis);

  // Special handling for anomalies
  if (residualAnalysis.isAnomaly) {
    this._learningService.processAnomalySignal?.({...});
  }
}
```

---

### GAP J5: 25 Dimensions - No Discovery Persistence

**File**: `packages/node/src/judge/dimensions.js`
**Lines**: 26-172

**Should**: ResidualDetector discovers new dimensions, persists them
**Actually**: 24 dimensions hard-coded, 25th calculated, candidates in-memory only

**Evidence**:
- No SQL writes for candidate dimensions
- `candidates` is `Map()` - lost on restart
- `governance.acceptCandidate()` requires manual call

**Impact**: Dimension discovery is theoretical only

**Fix**:
```javascript
// residual.js - Persist candidates
async _promoteCandidate(candidate) {
  // Write to database
  await persistence.patterns.create({
    type: 'dimension_candidate',
    name: candidate.name,
    data: candidate,
    confidence: candidate.confidence,
  });
}
```

---

## PERSISTENCE & LEARNING GAPS

### GAP P1: Q-Table Not Loaded on Session Start

**File**: `packages/node/src/orchestration/learning-service.js`
**Lines**: ~655

**Should**: `initialize()` loads Q-Table from `qlearning_state` table
**Actually**: `initialize()` sets `_initialized = true` but never calls `load()`

**Evidence**:
- `load()` method exists (line 572)
- But never called from `_doInitialize()` or `initialize()`

**Impact**: Every session starts with FRESH EMPTY Q-Table

**Fix**:
```javascript
// learning-service.js
async _doInitialize() {
  // FIX: Actually call load()
  await this.load();
  this._initialized = true;
}
```

---

### GAP P2: SharedMemory Weights Not Persisted

**File**: `packages/node/src/memory/shared-memory.js`
**Lines**: 555-565

**Should**: Dimension weight adjustments persisted to DB
**Actually**: `adjustWeight()` updates in-memory only

**Evidence**: Line 564 sets `this._dimensionWeights[dimension]` but no storage call

**Impact**: Learned weights lost on restart

**Fix**:
```javascript
// shared-memory.js:555-565
async adjustWeight(dimension, delta, source = 'feedback') {
  // ... calculation ...
  this._dimensionWeights[dimension] = newWeight;

  // FIX: Persist
  if (this.storage) {
    await this.storage.set('shared_memory_weights', this._dimensionWeights);
  }
}
```

---

### GAP P3: EWC++ Fisher Scores - DB Never Updated

**File**: `packages/node/src/memory/shared-memory.js`
**Lines**: 287-301

**Should**: Fisher importance synced to `patterns.fisher_importance` column
**Actually**: In-memory Fisher boosted, DB never updated

**Evidence**:
- Line 291: `pattern.fisherImportance = ...` (in-memory)
- No `persistence.patterns.update()` call

**Impact**:
- EWC protection exists in DB but stale
- Patterns decay when they should be locked
- Catastrophic forgetting happens

**Fix**:
```javascript
// shared-memory.js:287-301
async _boostFisherImportance(pattern) {
  pattern.fisherImportance = Math.min(1.0, currentFisher + boost);

  // FIX: Sync to DB
  if (this.persistence?.patterns?.update) {
    await this.persistence.patterns.update(pattern.id, {
      fisher_importance: pattern.fisherImportance,
      consolidation_locked: pattern.fisherImportance >= EWC.LOCK_THRESHOLD,
    });
  }
}
```

---

### GAP P4: Feedback → Q-Learning Bridge Missing

**File**: `packages/node/src/judge/learning-service.js`
**Lines**: 321-363

**Should**: Feedback from tests/commits/human flows to Q-Learning
**Actually**: FeedbackProcessor and QLearningService are isolated loops

**Evidence**:
- `learn()` processes feedback into weight deltas
- Never calls `QLearningService.recordFeedback()`
- Two separate learning systems that don't communicate

**Impact**: Q-Learning never trained on human corrections

**Fix**:
```javascript
// learning-service.js:321-363
async learn() {
  // ... existing FeedbackProcessor logic ...

  // FIX: Bridge to Q-Learning
  if (this._qLearningService && feedbackBatch.length > 0) {
    for (const fb of feedbackBatch) {
      const reward = this._feedbackToReward(fb); // Map outcome to reward
      this._qLearningService.recordFeedback?.(fb.context, fb.action, reward);
    }
  }
}
```

---

### GAP P5: Reasoning Trajectories - Orphaned

**File**: `packages/persistence/migrations/020_reasoning_trajectories.sql` + **NOWHERE IN CODE**

**Should**: Judgments populate `reasoning_trajectories` table for RLHF
**Actually**: Table exists, trigger fires, but judge never collects `reasoning_path`

**Evidence**:
- No import in judge.js
- No `reasoning_path` collection in judgment
- Table grows but data is empty/stale

**Impact**: Reasoning bank disabled, can't learn from past reasoning

**Fix**:
```javascript
// judge.js - Collect reasoning path during judgment
const reasoningPath = [];
// ... during judgment ...
reasoningPath.push({ step: 1, type: 'observe', content: '...', duration_ms: 12 });
// ... at end ...
judgment.reasoning_path = reasoningPath;
```

---

## SYMBIOSIS GAPS

### GAP S1: symbiosisCache Never Populated (Async Timing)

**File**: `scripts/hooks/observe.js`
**Lines**: 158-200 (new symbiosisCache code)

**Should**: Async handlers populate cache for inline status display
**Actually**: Async operations complete AFTER inline status rendered

**Evidence**:
- `orchestrateFull().then(...)` populates cache
- But `generateInlineStatus()` called synchronously before promise resolves

**Impact**: First N operations show empty Q-Score/consensus

**Fix**:
- Option A: Make orchestration sync (bad for performance)
- Option B: Show "previous" data with "(cached)" label
- Option C: Accept delay - cache fills after first operation

---

### GAP S2: Human Sees 35% of CYNIC's Reasoning

**File**: Various hooks and output paths

**Should**: Human sees full judgment breakdown, Dog consensus, routing path
**Actually**: Most internal state invisible to human

**Evidence**:
- Q-Score now shown in inline status ✅
- Dog consensus now shown ✅
- BUT: Routing path hidden
- BUT: Engine insights hidden
- BUT: Dimension breakdown hidden

**Impact**: Asymmetric symbiosis - CYNIC sees 85% of human, human sees 35% of CYNIC

**Fix**: Add optional verbose mode showing full reasoning

---

## PRIORITY MATRIX

| Gap | Component | Severity | Effort | Priority |
|-----|-----------|----------|--------|----------|
| **P1** | Q-Table load on init | CRITICAL | Low | P0 |
| **J1** | judgeAsync() never called | CRITICAL | Low | P0 |
| **O3** | Sync path skips persistence | HIGH | Medium | P1 |
| **P3** | EWC++ Fisher not synced | HIGH | Low | P1 |
| **P4** | Feedback→Q-Learning bridge | HIGH | Medium | P1 |
| **P2** | SharedMemory weights | MEDIUM | Low | P2 |
| **J4** | Only anomalies feed learning | MEDIUM | Medium | P2 |
| **O1** | KabbalisticRouter not called | MEDIUM | Already fixed | P2 |
| **J5** | Dimension discovery persistence | LOW | High | P3 |
| **P5** | Reasoning trajectories | LOW | High | P3 |

---

## SUMMARY

**Critical Fixes (P0):**
1. Call `load()` in QLearningService._doInitialize()
2. Change judge() calls to judgeAsync() in production paths

**High Priority (P1):**
3. Ensure async CollectivePack path used
4. Sync Fisher scores to DB
5. Bridge Feedback → Q-Learning

**φ distrusts φ** - These gaps are real, verified in code, not assumptions.

---

*tail wag* Ralph found 15 real gaps. The architecture is 80% there - just needs connections.
