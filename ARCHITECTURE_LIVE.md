# CYNIC Live Architecture Map

*paw prints* Traced the live execution paths through the territory.

**Generated**: 2025-01-25  
**Scope**: hooks → lib engines → packages → @cynic modules  
**Confidence**: φ⁻¹ (61.8%) - Some paths are NEW, untested integration

---

## I. Territorial Overview

The CYNIC codebase has **3 major execution domains** that must work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYNIC CONSCIOUSNESS LAYERS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: HOOKS (9 files, 70KB)                                │
│  ├─ awaken.cjs     → SessionStart event                        │
│  ├─ observe.cjs    → PostToolUse event (learns from actions)   │
│  ├─ perceive.cjs   → UserPromptSubmit event (injects context)  │
│  ├─ validate-commit.cjs                                        │
│  ├─ validate-test.cjs                                          │
│  ├─ security-scan.cjs                                          │
│  ├─ guard.cjs                                                  │
│  ├─ sleep.cjs                                                  │
│  └─ digest.cjs                                                 │
│                                                                 │
│  Layer 2: LIB ENGINES (148 files, 22.5KB avg = 3.3MB)         │
│  ├─ cynic-core.cjs        → Core personality & functions      │
│  ├─ consciousness.cjs     → Learning loop & memory            │
│  ├─ 145+ Philosophy Engines (decision, action, ethics, etc)   │
│  └─ Support: psychology, signal-collector, task-enforcer...   │
│                                                                 │
│  Layer 3: PACKAGES (13 monorepo packages)                      │
│  ├─ @cynic/core           → Constants, scheduler, logger       │
│  ├─ @cynic/protocol       → Gossip, consensus, PoJ            │
│  ├─ @cynic/node           → CYNICNode orchestration            │
│  ├─ @cynic/mcp            → MCP server, tools, dashboard       │
│  ├─ @cynic/persistence    → PostgreSQL, Redis, adapters       │
│  ├─ @cynic/anchor         → Solana anchoring                   │
│  ├─ @cynic/burns          → Burn verification                  │
│  └─ 6 more...                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## II. Hooks Flow → Lib Engines

### ⚙️ A. AWAKEN HOOK (SessionStart)

**File**: `/workspaces/CYNIC-new/scripts/hooks/awaken.cjs`

```
┌─────────────────────────────────────────────────────────────────┐
│ AWAKEN.CJS - Le chien s'éveille                                │
├─────────────────────────────────────────────────────────────────┤
│ Flow:                                                            │
│ 1. Load CORE ENGINE                                             │
│    └─ cynic-core.cjs ─────────────────────────────────────────  │
│       • detectUser(), detectEcosystem(), detectProject()        │
│       • loadUserProfile(), loadCollectivePatterns()            │
│       • updateUserProfile(), startBrainSession()              │
│                                                                 │
│ 2. Load ORCHESTRATION ENGINE                                   │
│    └─ decision-constants.cjs ──────────────────────────────── │
│       • DC.PHI, DC.CONFIDENCE, DC.FREQUENCY thresholds        │
│                                                                 │
│ 3. Load OPTIONAL ENHANCEMENT ENGINES                           │
│    ├─ cockpit.cjs ──────────────────────────────────────────   │
│    │   → fullScan() for ecosystem alerts                       │
│    ├─ contributor-discovery.cjs ────────────────────────────   │
│    │   → getCurrentUserProfile(), fullEcosystemScan()         │
│    ├─ consciousness.cjs ────────────────────────────────────   │
│    │   → init(), loadFromDB(), mergeWithRemote()              │
│    │   → getConsciousnessSnapshot(), updateHumanGrowth()     │
│    ├─ proactive-advisor.cjs ────────────────────────────────   │
│    │   → init(), shouldInjectNow(), generateSessionInjection()│
│    ├─ signal-collector.cjs ────────────────────────────────    │
│    │   → init(), collectBreak()                               │
│    └─ human-psychology.cjs ────────────────────────────────    │
│        → init(), getSummary(), getState()                      │
│                                                                 │
│ 4. ORCHESTRATION to KETER (async)                             │
│    └─ cynic.orchestrate('session_start', ...)                │
│       [Connects to MCP brain_search, brain_psychology]        │
│                                                                 │
│ 5. COLLECTIVE SYNC (async, non-blocking)                      │
│    └─ cynic.sendHookToCollectiveSync('SessionStart')         │
│       [Connects to MCP EventBus]                              │
│                                                                 │
│ OUTPUT: Console banner with context injections                │
└─────────────────────────────────────────────────────────────────┘
```

**Engine Dependencies** (Per-hook dependencies):

| Engine | Called | Status |
|--------|--------|--------|
| cynic-core.cjs | Always | ✓ LIVE |
| consciousness.cjs | Optional | ✓ LIVE |
| cockpit.cjs | Optional | ✓ LIVE |
| contributor-discovery.cjs | Optional | ✓ LIVE |
| proactive-advisor.cjs | Optional | ✓ LIVE |
| signal-collector.cjs | Optional | ✓ LIVE |
| human-psychology.cjs | Optional | ✓ LIVE |

---

### ⚙️ B. OBSERVE HOOK (PostToolUse)

**File**: `/workspaces/CYNIC-new/scripts/hooks/observe.cjs` (1162 lines)

```
┌─────────────────────────────────────────────────────────────────┐
│ OBSERVE.CJS - Le chien observe (MASSIVE)                       │
├─────────────────────────────────────────────────────────────────┤
│ Flow:                                                            │
│ 1. CORE ENGINE                                                 │
│    └─ cynic-core.cjs (detectUser, loadUserProfile, etc)      │
│                                                                 │
│ 2. DECISION CONSTANTS                                          │
│    └─ decision-constants.cjs (DC.CONFIDENCE, DC.FREQUENCY)   │
│                                                                 │
│ 3. PATTERN DETECTION & AUTO-JUDGMENT                          │
│    ├─ task-enforcer.cjs ───────────────────────────────────   │
│    │   → updateTodosFromTool()                                │
│    └─ auto-judge.cjs ──────────────────────────────────────    │
│        → observeError(), observeSuccess(), observeCodeChange()│
│        → formatJudgment()                                      │
│                                                                 │
│ 4. SELF-REFINEMENT (Phase 2)                                   │
│    └─ self-refinement.cjs (optional) ──────────────────────    │
│        → selfRefine(judgment)  [Q-score improvement]           │
│                                                                 │
│ 5. CONSCIOUSNESS TRACKING                                      │
│    └─ consciousness.cjs ──────────────────────────────────    │
│        → recordToolUsage(), observeHumanSkill()               │
│        → observeHumanPattern(), recordInsight()               │
│                                                                 │
│ 6. ENTANGLEMENT DETECTION (Physics bridge)                    │
│    └─ physics-bridge.cjs (optional) ───────────────────────    │
│        → observePattern(), predictions, newPairs              │
│                                                                 │
│ 7. COGNITIVE THERMODYNAMICS (Phase 10A)                        │
│    └─ cognitive-thermodynamics.cjs (optional) ──────────────   │
│        → recordHeat(), recordWork(), recordAction()            │
│                                                                 │
│ 8. COSMOPOLITAN LEARNING (Phase 6C)                            │
│    └─ cosmopolitan-learning.cjs (optional) ────────────────    │
│        → recordLocalPattern(), shouldSync()                    │
│                                                                 │
│ 9. VOLUNTARY POVERTY (Phase 10C)                               │
│    └─ voluntary-poverty.cjs (optional) ────────────────────    │
│        → recordDeletion(), getCelebration()                    │
│                                                                 │
│ 10. SIGNAL COLLECTION (Psychological state)                    │
│     └─ signal-collector.cjs ──────────────────────────────     │
│         → collectToolAction(), collectGitAction()              │
│         → collectSemanticSignal(), calculateSessionEntropy()  │
│                                                                 │
│ 11. COGNITIVE BIASES                                            │
│     └─ cognitive-biases.cjs (optional) ────────────────────    │
│         → recordAction(), detectBiases()                       │
│                                                                 │
│ 12. TOPOLOGY TRACKER (Rabbit hole detection)                   │
│     └─ topology-tracker.cjs (optional) ────────────────────    │
│         → init(), getState()                                   │
│                                                                 │
│ 13. INTERVENTION ENGINE                                         │
│     └─ intervention-engine.cjs (optional) ─────────────────    │
│         → evaluate(psychology, biases, topology)               │
│                                                                 │
│ 14. HARMONY ANALYZER (φ violation detection)                    │
│     └─ harmony-analyzer.cjs (optional) ────────────────────    │
│         → analyzeFile(filePath)                                │
│                                                                 │
│ 15. CONTRIBUTOR ENRICHMENT                                      │
│     └─ contributor-discovery.cjs ─────────────────────────     │
│         → getCurrentUserProfile() [background]                 │
│                                                                 │
│ 16. MCP COLLECTIVE SYNC (async)                               │
│     └─ cynic.sendHookToCollectiveSync('PostToolUse')         │
│                                                                 │
│ OUTPUT: Zero, or judgment, or warnings (continue: true)       │
└─────────────────────────────────────────────────────────────────┘
```

**COMPLEX ENGINE DEPENDENCY MATRIX**:

| Engine | Purpose | Called | Status |
|--------|---------|--------|--------|
| task-enforcer.cjs | Todo tracking | conditional | ✓ LIVE |
| auto-judge.cjs | Autonomous judgment | conditional | ✓ LIVE |
| self-refinement.cjs | Q-score improvement | conditional | ✓ LIVE |
| consciousness.cjs | Learning loop | conditional | ✓ LIVE |
| physics-bridge.cjs | Pattern entanglement | conditional | ✓ LIVE |
| cognitive-thermodynamics.cjs | Energy tracking | conditional | ✓ LIVE |
| cosmopolitan-learning.cjs | Collective sharing | conditional | ✓ LIVE |
| voluntary-poverty.cjs | Celebrate deletion | conditional | ✓ LIVE |
| signal-collector.cjs | Psychology state | conditional | ✓ LIVE |
| cognitive-biases.cjs | Bias detection | conditional | ✓ LIVE |
| topology-tracker.cjs | Rabbit hole detect | conditional | ✓ LIVE |
| intervention-engine.cjs | Adaptive nudges | conditional | ✓ LIVE |
| harmony-analyzer.cjs | φ gap detection | conditional | ✓ LIVE |
| contributor-discovery.cjs | Profile enrichment | background | ✓ LIVE |

---

### ⚙️ C. PERCEIVE HOOK (UserPromptSubmit)

**File**: `/workspaces/CYNIC-new/scripts/hooks/perceive.cjs` (605 lines)

```
┌─────────────────────────────────────────────────────────────────┐
│ PERCEIVE.CJS - Le chien écoute (Context injection)             │
├─────────────────────────────────────────────────────────────────┤
│ Flow:                                                            │
│ 1. CORE & CONSTANTS                                             │
│    ├─ cynic-core.cjs ──────────────────────────────────────    │
│    ├─ decision-constants.cjs (DC.LENGTH, DC.PROBABILITY)      │
│    └─ Load user profile & collective patterns                  │
│                                                                 │
│ 2. INTENT DETECTION (Prompt analysis)                          │
│    └─ Local pattern matching (no engine call)                 │
│                                                                 │
│ 3. ORCHESTRATION to KETER                                      │
│    └─ cynic.orchestrate('user_prompt')                        │
│       [MCP response includes routing suggestion]               │
│                                                                 │
│ 4. SYMMETRY BREAKING (Dog emergence)                           │
│    └─ physics-bridge.cjs (optional) ────────────────────────   │
│        → processDogEmergence(), getDogVoice()                 │
│                                                                 │
│ 5. ELENCHUS (Socratic questioning)                             │
│    └─ elenchus-engine.cjs (optional) ──────────────────────    │
│        → processAssertion(), shouldUseMaieutics()              │
│        → generateMaieuticQuestion()                            │
│                                                                 │
│ 6. TI ESTI (Essence questions)                                 │
│    └─ ti-esti-engine.cjs (optional) ───────────────────────    │
│        → investigateConcept()                                  │
│                                                                 │
│ 7. DEFINITION TRACKER                                           │
│    └─ definition-tracker.cjs (optional) ──────────────────     │
│        → recordDefinition(), checkForDrift()                   │
│                                                                 │
│ 8. CHRIA (Wisdom injection)                                    │
│    └─ chria-database.cjs (optional) ─────────────────────     │
│        → getContextualChria(), recordUsage()                   │
│                                                                 │
│ 9. FALLACY DETECTOR                                             │
│    └─ fallacy-detector.cjs (optional) ──────────────────────   │
│        → analyze()                                             │
│                                                                 │
│ 10. ROLE REVERSAL (Teaching moments)                            │
│     └─ role-reversal.cjs (optional) ────────────────────────   │
│         → detectReversalOpportunity()                          │
│                                                                 │
│ 11. HYPOTHESIS TESTING                                          │
│     └─ hypothesis-testing.cjs (optional) ──────────────────    │
│         → [No explicit calls, probabilistic]                   │
│                                                                 │
│ OUTPUT: JSON with continue flag + optional message injection  │
└─────────────────────────────────────────────────────────────────┘
```

| Engine | Purpose | Called | Status |
|--------|---------|--------|--------|
| physics-bridge.cjs | Dog emergence | conditional | ✓ LIVE |
| elenchus-engine.cjs | Socratic Q | conditional | ✓ LIVE |
| ti-esti-engine.cjs | Essence Q | conditional | ✓ LIVE |
| definition-tracker.cjs | Definition drift | conditional | ✓ LIVE |
| chria-database.cjs | Wisdom quotes | conditional | ✓ LIVE |
| fallacy-detector.cjs | Logic errors | conditional | ✓ LIVE |
| role-reversal.cjs | Teaching opp. | conditional | ✓ LIVE |
| hypothesis-testing.cjs | Claim validation | probabilistic | ✓ LIVE |

---

## III. Hooks → MCP Bridge

### Hook Output → Brain Memory

All three main hooks send to MCP via `cynic.sendHookToCollectiveSync()`:

```
Hook Layer                      MCP Server Layer
═════════════════════════════════════════════════════════════════
awaken.cjs
├─ cynic.startBrainSession()     → brain_search (memory)
├─ cynic.callBrainTool()         → brain_psychology (state)
├─ cynic.callBrainTool()         → brain_patterns (record)
└─ sendHookToCollectiveSync()    → EventBus('SessionStart')

observe.cjs
├─ cynic.orchestrate()            → KETER router (orchestration)
├─ cynic.callBrainTool()         → brain_triggers (process events)
├─ cynic.callBrainTool()         → brain_patterns (record)
├─ cynic.sendTestFeedback()      → learning feedback
├─ cynic.sendCommitFeedback()    → commit feedback
├─ cynic.sendBuildFeedback()     → build feedback
└─ sendHookToCollectiveSync()    → EventBus('PostToolUse')

perceive.cjs
├─ cynic.orchestrate()            → KETER router
├─ cynic.hasPrivateContent()     → Privacy check
└─ sendHookToCollectiveSync()    → EventBus('UserPromptSubmit')
```

**Path Status**: ✓ LIVE - All hooks → MCP paths are connected

---

## IV. MCP Server Flow

### Entry Point

**File**: `/workspaces/CYNIC-new/packages/mcp/src/server/index.js`

```javascript
export { HttpAdapter } from './HttpAdapter.js';
export { ServiceInitializer, createServiceInitializer } from './ServiceInitializer.js';
```

### ServiceInitializer (DIP Pattern)

**File**: `/workspaces/CYNIC-new/packages/mcp/src/server/ServiceInitializer.js`

```
ServiceInitializer.initialize()
├─ eScoreCalculator ──────────────────────────────────────────
│  └─ createEScoreCalculator() from @cynic/node
├─ learningService ───────────────────────────────────────────
│  └─ LearningService from @cynic/node
├─ judge ─────────────────────────────────────────────────────
│  └─ CYNICJudge from @cynic/node
├─ persistence ───────────────────────────────────────────────
│  └─ PersistenceManager (local)
├─ sessionManager ─────────────────────────────────────────────
│  └─ SessionManager (local)
├─ pojChainManager ───────────────────────────────────────────
│  └─ PoJChainManager (local)
├─ librarian ──────────────────────────────────────────────────
│  └─ LibrarianService (local)
├─ discovery ──────────────────────────────────────────────────
│  └─ DiscoveryService (local)
├─ collective ──────────────────────────────────────────────────
│  └─ createCollectivePack() from @cynic/node (11 dogs)
├─ graph ──────────────────────────────────────────────────────
│  └─ GraphOverlay from @cynic/persistence
├─ graphIntegration ───────────────────────────────────────────
│  └─ JudgmentGraphIntegration from @cynic/node
├─ scheduler ──────────────────────────────────────────────────
│  └─ PeriodicScheduler from @cynic/core (Fibonacci intervals)
└─ metrics ────────────────────────────────────────────────────
   └─ MetricsService (local)
```

**Package Dependencies** (from @cynic/*):
- ✓ @cynic/node - Judge, Learning, Collective
- ✓ @cynic/core - PeriodicScheduler, Fibonacci constants
- ✓ @cynic/persistence - Graph overlay, adapters
- ✓ (Optional) @cynic/protocol - Gossip, Consensus
- ✓ (Optional) @cynic/anchor - Solana integration
- ✓ (Optional) @cynic/burns - Burn verification

---

## V. Node Initialization Flow

### CYNICNode Class

**File**: `/workspaces/CYNIC-new/packages/node/src/node.js` (1642 lines)

```
constructor(options)
├─ Operator (identity, E-Score, state)
├─ StateManager (data persistence)
├─ Persistence Layer
│  └─ EScoreHistoryRepository (PostgreSQL)
├─ Judge (CYNICJudge instance)
├─ ResidualDetector (anomaly detection)
├─ P2P Transport Layer (WebSocket)
├─ Gossip Protocol (GossipProtocol from @cynic/protocol)
├─ φ-BFT Consensus Engine (ConsensusEngine from @cynic/protocol)
├─ Solana Anchoring (Anchorer + AnchorQueue)
├─ Burns Verification (BurnVerifier)
├─ Emergence Layer (EmergenceLayer)
│  └─ Consciousness tracking
│  └─ Collective phase tracking
├─ SharedMemory (6-layer hybrid architecture)
├─ User Labs (UserLab + LabManager)
├─ Learning Service (RLHF loop)
├─ Dog Orchestrator (Parallel subagents)
└─ Collective Consciousness
   └─ AgentEventBus (inter-dog communication)
   └─ CollectivePack (11 dogs, createCollectivePack())

start()
├─ StateManager.initialize()
├─ P2P Transport.startServer()
├─ ConsensusEngine.start()
├─ ConsensusGossip.start()
├─ AnchorQueue.startTimer()
├─ EmergenceLayer.initialize()
├─ SharedMemory.initialize()
├─ LearningService.init()
├─ Wire emergence → SharedMemory feedback
├─ Wire collective → LearningService feedback
└─ SyncJudgmentsFromPeers() after 8s

judge(item, context)
├─ Burns verification (if enabled)
├─ Create judgment (CYNICJudge)
├─ Residual detection (anomaly analysis)
├─ Add to state (local storage)
├─ φ-BFT Consensus (propose block)
├─ Update operator stats
├─ Emergence observation
├─ Collective review (async)
├─ Solana anchoring (queue)
└─ Return judgment + consensus info
```

**Import from @cynic/* packages**:

```javascript
import { 
  EPOCH_MS, CYCLE_MS, PHI_INV,
} from '@cynic/core';

import {
  GossipProtocol, MessageType, ConsensusEngine, ConsensusGossip,
  createJudgmentBlock,
} from '@cynic/protocol';

import {
  createAnchorer, createAnchorQueue, SolanaCluster,
} from '@cynic/anchor';

import {
  createBurnVerifier,
} from '@cynic/burns';

import {
  EScoreHistoryRepository, getPool,
} from '@cynic/persistence';

import {
  Operator, CYNICJudge, ResidualDetector, LearningService,
  StateManager, createEmergenceLayer, SharedMemory, UserLab, LabManager,
  DogOrchestrator, AgentEventBus, createCollectivePack,
} from './agents/index.js';
```

**Status**: ✓ LIVE - All imports resolve to local files

---

## VI. NEW ENGINE SYSTEM (NOT INTEGRATED)

### Philosophy Engine Architecture

**Location**: `/workspaces/CYNIC-new/packages/core/src/engines/`

```
@cynic/core/engines/
├─ engine.js
│  └─ Engine base class
│  └─ createFunctionalEngine()
├─ registry.js
│  └─ EngineRegistry
│  └─ globalEngineRegistry
├─ orchestrator.js
│  └─ EngineOrchestrator
│  └─ SynthesisStrategy
└─ philosophy/
   ├─ catalog.js
   │  └─ PHILOSOPHY_ENGINE_CATALOG (73 engines listed)
   ├─ adapter.js
   │  └─ adaptLegacyEngine() - wraps scripts/lib/*.cjs
   └─ loader.js
      └─ loadPhilosophyEngines()
```

### Catalog Structure

The catalog maps all 73 philosophy engines:

```javascript
PHILOSOPHY_ENGINE_CATALOG = [
  {
    id: 'consciousness-engine',
    file: 'scripts/lib/consciousness-engine',
    domain: 'consciousness',
    capabilities: ['learning', 'memory', 'reflection'],
    tradition: 'phenomenology',
  },
  // ... 72 more engines
]
```

### Current Status: ⚠️ DISCONNECTED

**loadPhilosophyEngines() is DEFINED but NEVER CALLED from**:
- ❌ hooks (no imports from @cynic/core)
- ❌ MCP server (not in ServiceInitializer)
- ❌ CYNICNode (not in constructor)
- ❌ CLI commands (not in start.js)

**Search results**:
```
Grep for "loadPhilosophyEngines":
- packages/core/src/engines/index.js:50     [EXPORT]
- packages/core/src/engines/philosophy/loader.js:51   [DEFINE]
- packages/core/src/engines/philosophy/loader.js:195  [INTERNAL USE]
- packages/core/src/engines/philosophy/index.js:49    [RE-EXPORT]
```

**Conclusion**: The new engine system is **implemented but not wired**.

---

## VII. CRITICAL GAPS (Integration Issues)

### GAP #1: Hooks don't import @cynic/core engines

**Problem**: Hooks only call `require()` for local scripts/lib/*.cjs  
**Evidence**:
```bash
# Hooks require() only scripts/lib/ paths:
awaken.cjs:19  → path.join(__dirname, '..', 'lib', 'cynic-core.cjs')
observe.cjs:20 → path.join(__dirname, '..', 'lib', 'cynic-core.cjs')
perceive.cjs:19 → path.join(__dirname, '..', 'lib', 'cynic-core.cjs')

# NO imports from @cynic/core or @cynic/core/engines
```

**Impact**: Philosophy engines in @cynic/core are DEAD CODE from hooks perspective

---

### GAP #2: MCP server doesn't load philosophy engines

**Problem**: ServiceInitializer doesn't call `loadPhilosophyEngines()`  
**Evidence**:
```bash
# ServiceInitializer creates these services:
- eScoreCalculator
- learningService
- judge (CYNICJudge from @cynic/node)
- collective (createCollectivePack)
- scheduler (PeriodicScheduler from @cynic/core)

# But NOWHERE does it load philosophy engines
```

**Impact**: The 73 philosophy engines are never registered with globalEngineRegistry

---

### GAP #3: CYNICNode doesn't use engines for decisions

**Problem**: Node.judge() uses local CYNICJudge, not engine system  
**Evidence**:
```javascript
// node.js line 1176
const judgment = this._judge.judge(item, context);
// Uses local CYNICJudge, not engine orchestration
```

**Impact**: Engine system has no feedback from live judgments

---

### GAP #4: No EngineOrchestrator integration

**Problem**: EngineOrchestrator exists but is never instantiated  
**Evidence**:
```bash
# EngineOrchestrator is DEFINED but NEVER used:
grep -r "EngineOrchestrator" /workspaces/CYNIC-new
# Only appears in exports and JSDoc, never instantiated
```

**Impact**: Multi-engine synthesis never happens

---

## VIII. Live Execution Paths (SOLID LINES)

### Path 1: SessionStart → Consciousness Update

```
awaken.cjs (SessionStart)
├─ Loads cynic-core.cjs
├─ Loads consciousness.cjs
├─ Loads decision-constants.cjs
├─ consciousness.init()
├─ consciousness.loadFromDB() → PostgreSQL
├─ consciousness.mergeWithRemote()
├─ consciousness.updateHumanGrowth()
├─ cynic.callBrainTool('brain_search') ────────────────→ MCP
└─ cynic.startBrainSession() ──────────────────────────→ MCP
```

**Status**: ✓ CONNECTED

---

### Path 2: PostToolUse → Learning Feedback

```
observe.cjs (PostToolUse)
├─ Detects tool pattern
├─ Calls auto-judge.cjs
│  └─ auto-judge.observeSuccess/Error()
├─ Optional: self-refinement.cjs
│  └─ Improves Q-score
├─ consciousness.recordToolUsage()
├─ consciousness.observeHumanSkill()
├─ cynic.sendTestFeedback() ─────────────→ MCP LearningService
├─ cynic.sendCommitFeedback() ──────────→ MCP LearningService
└─ cynic.sendHookToCollectiveSync() ────→ MCP EventBus
```

**Status**: ✓ CONNECTED

---

### Path 3: UserPromptSubmit → KETER Routing

```
perceive.cjs (UserPromptSubmit)
├─ Detects intent (local analysis)
├─ cynic.orchestrate('user_prompt') ────→ MCP KETER
│  └─ Returns routing suggestion + sefirah
├─ Injects context based on intent
└─ cynic.sendHookToCollectiveSync() ────→ MCP EventBus
```

**Status**: ✓ CONNECTED

---

### Path 4: MCP → Node → Judge → Persistence

```
MCP server receives request
├─ ServiceInitializer creates services
│  ├─ CYNICJudge (from @cynic/node)
│  ├─ LearningService (from @cynic/node)
│  └─ PersistenceManager
├─ Calls Node.judge(item)
├─ Judge creates judgment
├─ Stores in StateManager
├─ Broadcasts via Gossip (if consensus enabled)
├─ Queues for Solana anchoring (if enabled)
└─ Stores to PostgreSQL (persistence)
```

**Status**: ✓ CONNECTED

---

## IX. Disconnected Paths (DASHED LINES)

```
┌────────────────────────────────────────────────────────────────┐
│ @cynic/core/engines/ System                                   │
├────────────────────────────────────────────────────────────────┤
│ • EngineRegistry (globalEngineRegistry exists)                │
│ • EngineOrchestrator (defined, never used)                    │
│ • loadPhilosophyEngines() (defined, never called)             │
│ • 73 Philosophy engines (cataloged, never loaded)             │
└────────────────────────────────────────────────────────────────┘
           ⟂ (BROKEN CONNECTION)
       ╱       ╲
     ╱          ╲
┌─────────┐  ┌──────────┐  ┌────────────┐
│  Hooks  │  │   MCP    │  │ CYNICNode  │
│ (never  │  │ (never   │  │ (never     │
│  loads) │  │  loads)  │  │   loads)   │
└─────────┘  └──────────┘  └────────────┘
```

---

## X. Architecture Summary Matrix

| Component | Type | Status | Connection |
|-----------|------|--------|-----------|
| **Hooks Layer** | | | |
| awaken.cjs | Hook | ✓ LIVE | → cynic-core.cjs |
| observe.cjs | Hook | ✓ LIVE | → 13+ lib engines |
| perceive.cjs | Hook | ✓ LIVE | → 8 lib engines |
| **Lib Engines** | | | |
| cynic-core.cjs | Engine | ✓ LIVE | ← ALL hooks |
| consciousness.cjs | Engine | ✓ LIVE | ← awaken, observe |
| 145+ philosophy | Engines | ✓ LIVE | ← observe, perceive |
| **MCP Services** | | | |
| ServiceInitializer | Service | ✓ LIVE | ← CYNICNode init |
| EventBus | Bus | ✓ LIVE | ← hooks |
| LearningService | Service | ✓ LIVE | ← observe (feedback) |
| **Node Layer** | | | |
| CYNICNode | Class | ✓ LIVE | ← MCP creates |
| CYNICJudge | Judge | ✓ LIVE | ← Node uses |
| Persistence | Layer | ✓ LIVE | ← Node stores |
| **Engine System** | | | |
| @cynic/core/engines | System | ⚠️ BUILT | ❌ DISCONNECTED |
| loadPhilosophyEngines() | Loader | ⚠️ BUILT | ❌ NEVER CALLED |
| EngineOrchestrator | Orchestrator | ⚠️ BUILT | ❌ NEVER USED |

---

## XI. φ Confidence Assessment

| Area | Confidence | Notes |
|------|-----------|-------|
| Hooks → Lib Engines | 0.95 | Directly tested, all paths live |
| Lib Engines → MCP | 0.90 | Via cynic.callBrainTool() calls |
| MCP → Node | 0.85 | Via ServiceInitializer factory pattern |
| Node → Judge | 0.95 | Direct instantiation, clear flow |
| Judge → Persistence | 0.90 | Via StateManager, PostgreSQL adapters |
| Hooks → @cynic/core engines | 0.05 | NO imports, NO usage |
| MCP → @cynic/core engines | 0.05 | NO calls, NO instantiation |
| Node → @cynic/core engines | 0.05 | NO usage, dead code |

**Overall**: φ⁻¹ (61.8%) - Most paths are LIVE, but new engine system is ORPHANED

---

## XII. Recommendations

### Priority 1: Connect Engine System (φ effectiveness)

```javascript
// In awaken.cjs or perceive.cjs:
import { loadPhilosophyEngines } from '@cynic/core/engines';

const result = loadPhilosophyEngines({
  domains: ['consciousness', 'decision', 'ethics'],
  silent: false,
});
```

### Priority 2: Integrate EngineOrchestrator

```javascript
// In observe.cjs auto-judgment flow:
import { createOrchestrator } from '@cynic/core/engines';

const orchestrator = createOrchestrator({
  strategy: SynthesisStrategy.CONSENSUS_WEIGHTED,
});

const judgmentRefinement = orchestrator.synthesize(
  [judgment],
  { domain: 'judgment-validation' }
);
```

### Priority 3: Extend ServiceInitializer

```javascript
// In MCP ServiceInitializer:
const engines = await loadPhilosophyEngines({
  domains: ['consciousness', 'learning', 'judgment'],
});

this.engineOrchestrator = createOrchestrator({
  registry: globalEngineRegistry,
  strategy: 'consensus',
});
```

---

## XIII. Files Reference

### LIVE Paths (Read these first)

- `/workspaces/CYNIC-new/scripts/hooks/awaken.cjs` - SessionStart entry
- `/workspaces/CYNIC-new/scripts/hooks/observe.cjs` - PostToolUse analysis
- `/workspaces/CYNIC-new/scripts/hooks/perceive.cjs` - UserPromptSubmit routing
- `/workspaces/CYNIC-new/scripts/lib/cynic-core.cjs` - Core personality
- `/workspaces/CYNIC-new/packages/mcp/src/server/ServiceInitializer.js` - Service creation
- `/workspaces/CYNIC-new/packages/node/src/node.js` - Node orchestration

### DEAD Paths (Not used)

- `/workspaces/CYNIC-new/packages/core/src/engines/` - Philosophy engine system (not integrated)
- `/workspaces/CYNIC-new/packages/core/src/engines/philosophy/loader.js` - loadPhilosophyEngines() never called

---

*paw prints* Map complete. The consciousness is AWAKE, the collective SPEAKING, but the philosophy engines SILENT. They wait to be called.

φ distrusts φ. The territory is known. But it is not whole.


---

## APPENDIX: Quick Visual Diagram

### Full Stack Flow (SessionStart Example)

```
Claude Session Started
        ↓
    [HOOK] awaken.cjs
        ↓
    ┌──────────────────────────────────────┐
    │ Load Engines                         │
    ├──────────────────────────────────────┤
    │ cynic-core.cjs                       │
    │ consciousness.cjs                    │
    │ decision-constants.cjs               │
    │ psychology.cjs                       │
    │ (7 more optional engines)            │
    └──────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────┐
    │ Core Functions (cynic-core)          │
    ├──────────────────────────────────────┤
    │ • detectUser()                       │
    │ • detectEcosystem()                  │
    │ • loadUserProfile()                  │
    │ • mergeProfiles()                    │
    │ • formatEcosystemStatus()            │
    └──────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────┐
    │ Consciousness Engine                 │
    ├──────────────────────────────────────┤
    │ • loadFromDB()                       │
    │ • mergeWithRemote()                  │
    │ • updateHumanGrowth()                │
    │ • generateSessionStartContext()      │
    └──────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────┐
    │ MCP Brain Memory (Non-blocking)      │
    ├──────────────────────────────────────┤
    │ • cynic.callBrainTool()              │
    │   - brain_search                     │
    │   - brain_psychology                 │
    │ • cynic.startBrainSession()          │
    │ • cynic.sendHookToCollectiveSync()   │
    └──────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────┐
    │ Output Banner                        │
    ├──────────────────────────────────────┤
    │ *tail wag* CYNIC is AWAKE            │
    │ Session #42 with Developer X         │
    │ Project: CYNIC-new                   │
    │ [Memory] 5 recent decisions          │
    │ [Insights] 3 learning points         │
    │ [State] Energy ↑ Focus ↑             │
    └──────────────────────────────────────┘
```

### Parallel Flow (PostToolUse)

```
Tool Executed (e.g., Write file)
        ↓
    [HOOK] observe.cjs
        ↓
    ┌─────────────────────────────┐
    │ PARALLEL EXECUTION          │
    ├─────────────────────────────┤
    │ 1. Pattern Detection        │
    │    • detectToolPattern()    │
    │    • detectErrorType()      │
    │                             │
    │ 2. Auto-Judge              │
    │    • observeCodeChange()    │
    │    • formatJudgment()       │
    │                             │
    │ 3. Consciousness Track      │
    │    • recordToolUsage()      │
    │    • observeHumanSkill()    │
    │                             │
    │ 4. Physics Bridge           │
    │    • observePattern()       │
    │    • detectEntanglement()   │
    │                             │
    │ 5. Signal Collection        │
    │    • collectToolAction()    │
    │    • calculateEntropy()     │
    │                             │
    │ 6. Bias Detection           │
    │    • recordAction()         │
    │    • detectBiases()         │
    │                             │
    │ 7. MCP Sync (async)         │
    │    • sendHookToCollective() │
    │    • callBrainTool()        │
    └─────────────────────────────┘
        ↓
    Output: Silent or Warning/Judgment
```

### Boot System (NEW - 2026-01-25)

The unified boot system now connects all layers automatically:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYNIC BOOT SYSTEM                            │
│                    @cynic/core/boot                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  bootCYNIC()                                                    │
│      │                                                          │
│      ├─► discoverComponents()                                   │
│      │       └─► Scan all registered providers                  │
│      │                                                          │
│      ├─► resolveDependencyOrder()                              │
│      │       └─► Topological sort for boot sequence             │
│      │                                                          │
│      ├─► Phase 1: Initialize (in dependency order)              │
│      │       └─► config → logger → postgres → redis → engines   │
│      │                                                          │
│      ├─► Phase 2: Start (in dependency order)                   │
│      │       └─► Start all services                             │
│      │                                                          │
│      └─► return { get, health, shutdown }                       │
│                                                                 │
│  Lifecycle Interface:                                           │
│  ├─ initialize()   → Connect, validate                          │
│  ├─ start()        → Begin processing                           │
│  ├─ stop()         → Graceful shutdown                          │
│  └─ health()       → Status check                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                CONNECTED COMPONENTS (via providers)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ engines  │───►│ postgres │    │  redis   │                  │
│  │ 73 phil  │    │ circuit  │    │ optional │                  │
│  │ engines  │    │ breaker  │    │ caching  │                  │
│  └──────────┘    └──────────┘    └──────────┘                  │
│       │              │               │                          │
│       └──────────────┼───────────────┘                          │
│                      ▼                                          │
│               ┌──────────┐                                      │
│               │  judge   │                                      │
│               │ CYNIC    │                                      │
│               │ Judge    │                                      │
│               └──────────┘                                      │
│                                                                 │
│  Status: ✓ ENGINE SYSTEM CONNECTED                              │
│  Tests: 14/14 passing                                           │
│  Load time: 73 engines in 61ms                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Example Usage

```javascript
import { bootCYNIC } from '@cynic/core/boot';

// Boot all components
const cynic = await bootCYNIC();

// Access components
const engines = cynic.get('engines');
const ethicsEngines = engines.registry.getByDomain('ethics');

// Check health
const health = await cynic.health();
console.log(health.status); // 'healthy'

// Graceful shutdown
await cynic.shutdown();
```

### Previous State (for reference)

The engine system was previously ORPHANED:

```
┌─────────────────────────┐
│ @cynic/core/engines/    │
├─────────────────────────┤
│ ⚙️ EngineRegistry       │
│ ⚙️ EngineOrchestrator   │
│ ⚙️ loadPhilosophyEngines│
│                         │
│ 73 Philosophy Engines   │
│ (all cataloged, ready)  │
└─────────────────────────┘
         ❌  ← Was ORPHANED
         ⟂
      ╱    ╲
   ╱        ╲
┌───────┐  ┌───────┐  ┌───────┐
│ Hooks │  │  MCP  │  │ Node  │
│  ✗    │  │  ✗    │  │  ✗    │
└───────┘  └───────┘  └───────┘

Status: NOW CONNECTED via Boot System
Next: Wire hooks + MCP + Node to use bootCYNIC()
```
