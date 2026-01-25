# AUDIT D'ARCHITECTURE CYNIC

## Vue d'ensemble

Audit complet des interfaces, exports et patterns SOLID pour 12 packages CYNIC.
Focus: DI (Dependency Injection), violations SOLID, opportunités de réutilisation par les hooks.

**Date:** 2025-01-25
**Analyseur:** CYNIC Cartographer
**Couverture:** 100% (12 packages)

---

## 1. DEPENDENCY GRAPH

```
┌─────────────────────────────────────────────────────┐
│ @cynic/core (Foundation - No internal deps)         │
│ • Axioms, Q-Score, Identity, Worlds, Config         │
│ • Logger, Crypto, Vector, Learning, Orchestration   │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   protocol        identity       emergence
   (Consensus,    (E-Score,       (Consciousness,
    PoJ)          Reputation)      Patterns)
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   persistence      node          burns
   (Storage)     (Full Node)    (Verification)
                       │
                       ▼
                      mcp
                 (AI Integration)

Optional: anchor, gasdf, holdex, zk
```

---

## 2. EXPORTS PUBLICS PAR PACKAGE

### @cynic/core (Foundation Layer)
**Status:** ✓ Bien structuré
**Main:** `src/index.js`
**Export paths:** 6 (axioms, timing, qscore, identity, worlds)

```javascript
// Primary exports (everything from root index)
- Axioms & Constants (PHI, PHI_INV, THRESHOLDS)
- Q-Score calculation
- CYNIC Identity (personality, verdicts)
- 4 Worlds (Kabbalah framework)
- Configuration management
- Self-Refinement engine
- Background orchestration
- Vector search / embeddings
- Learning loop (feedback → calibration)
- Auto-judgment triggers
- Ecosystem monitor
- Custom error types
- Crypto utilities
- Structured logger

Classes: Logger, FeedbackAnalyzer, WeightCalibrator, BiasDetector, 
         LearningLoop, Trigger, TriggerManager, PeriodicScheduler,
         Source, GitHubSource, WebSearchSource, EcosystemMonitor,
         TfIdfEmbedder, ExternalEmbedder, VectorIndex, SemanticSearch,
         Task, Orchestrator, WorldManager (+ Kabbalah worlds)
```

**Dependencies:** None (Foundation - Pure axioms)

---

### @cynic/protocol (Consensus Layer)
**Status:** ✓ Clean separation
**Main:** `src/index.js`
**Export paths:** 5 (poj, merkle, gossip, consensus)

```javascript
// Layer 1: Proof of Judgment (PoJ)
- BlockType, calculateSlot, createGenesisBlock, createJudgmentBlock
- createKnowledgeBlock, createGovernanceBlock, hashBlock
- validateBlockStructure, validateBlockChain
- PoJChain, Verdict, scoreToVerdict, createJudgment

// Layer 2: Merkle Knowledge Tree
- MerkleTree, KnowledgeTree
- createPattern, createLearning, validatePatternEmergence
- checkPatternFormation, mergePatterns, calculatePatternDecay

// Layer 3: Gossip Propagation
- MessageType, generateMessageId, createMessage, verifyMessage
- shouldRelay, prepareRelay, createBlockMessage, createSyncRequest
- PeerManager, GossipProtocol

// Layer 4: φ-BFT Consensus
- VoteType, ConsensusType, VoterLockout, LockoutManager
- ProposalAction, ProposalStatus, createProposal, verifyProposal
- ConsensusState, ConsensusEngine, SlotManager, FinalityTracker
- ConsensusGossip

// Crypto utilities
- sha256, signData, verifySignature, generateKeypair

// K-Score Protocol
- KScoreType, calculateKScore, getKScoreTier
```

**Dependencies:** 
- @cynic/core ✓ (Direction graph: protocol → core only)

---

### @cynic/persistence (Storage Layer)
**Status:** ⚠️ Large surface area - Well encapsulated
**Main:** `src/index.js`
**Export paths:** 7 (postgres, redis, repositories, dag, poj, graph)

```javascript
// LEGACY CLIENTS (PostgreSQL + Redis)
- PostgresClient, getPool
- RedisClient, getRedis
- migrate, SessionStore

// DECENTRALIZED STORAGE (Merkle DAG)
- CID generation (createCID, parseCID, isValidCID, shardCID)
- DAGNode, DAGLink, NodeType (createJudgmentNode, createBlockNode, etc.)
- BlockStore, HAMTIndex
- MerkleDAG

// PROOF OF JUDGMENT CHAIN (PoJ)
- PoJBlockHeader, PoJBlock, Attestation, JudgmentRef
- computeMerkleRoot, createGenesisBlock, createBlock
- PoJChain

// GRAPH OVERLAY (Relationship Graph)
- GraphNodeType, GraphEdgeType (Token, Wallet, Project, Repo, User, Contract, CYNIC)
- GraphNode, GraphEdge (create*Node functions)
- GraphStore, GraphTraversal, GraphQuery, GraphOverlay

// REPOSITORIES (15 concrete implementations)
- JudgmentRepository ✓ extends BaseRepository, implements Searchable
- PatternRepository ✓
- UserRepository ✓
- SessionRepository ✓
- FeedbackRepository ✓
- KnowledgeRepository ✓
- PoJBlockRepository ✓
- LibraryCacheRepository ✓
- EcosystemDocsRepository ✓
- EScoreHistoryRepository ✓ (Phase 11)
- LearningCyclesRepository ✓ (Phase 11)
- PatternEvolutionRepository ✓ (Phase 11)
- UserLearningProfilesRepository ✓ (Phase 11)
- TriggerRepository ✓ (Phase 12)
- DiscoveryRepository ✓ (Phase 13)
- ConsciousnessRepository ✓ (Phase 14)
- PsychologyRepository ✓ (Phase 15)
```

**Interfaces:**
- **BaseRepository** (Abstract)
  ```javascript
  Methods: create(data), findById(id), update(id, data), 
           delete(id), getStats(), list(options)
  ```
  
- **Searchable** (Mixin)
  ```javascript
  Methods: search(query, options)
  Capabilities: supportsFTS(), supportsVectorSearch()
  ```

**Dependencies:**
- @cynic/core (peer)

---

### @cynic/node (Full Node - Core orchestration)
**Status:** ⚠️ High dependency fan-in - Monolithic
**Main:** `src/index.js`
**Export paths:** 8 (operator, judge, state, transport, api, cli, emergence)

```javascript
// Main Node
- CYNICNode, NodeStatus

// Operator (Identity + E-Score + BURN)
- Operator class
- createIdentity, importIdentity, exportIdentity, getPublicIdentity
- EScoreDimensions, createEScoreState, calculateCompositeEScore
- updateEScoreState, getEScoreBreakdown

// Judge (Dimension Scoring Engine)
- CYNICJudge class (constructor options: customDimensions, scorer, learningService, selfSkeptic, residualDetector)
- Dimensions, getAllDimensions, getDimensionsForAxiom, getDimension
- dimensionRegistry
- ResidualDetector, JudgmentGraphIntegration
- LearningService, LearningManager
- SelfSkeptic (φ distrusts φ), createSelfSkeptic, SKEPTIC_CONSTANTS, BiasType

// State Management
- StateManager, MemoryStorage, FileStorage

// Transport
- WebSocketTransport, ConnectionState
- serialize, deserialize, isValidMessage

// API
- APIServer

// Agents (Legacy v1 - 4 Dogs)
- BaseAgent, AgentTrigger, AgentBehavior, AgentResponse
- Observer, PatternType
- Digester, KnowledgeType, DigestQuality
- Guardian, RiskLevel, RiskCategory
- Mentor, WisdomType, ContextSignal
- AgentManager, createAgentPack

// Agents (Collective v2 - 5 Dogs + CYNIC)
- CollectivePack, createCollectivePack
- CollectiveGuardian, CollectiveAnalyst, CollectiveScholar
- CollectiveArchitect, CollectiveSage, CollectiveCynic
- COLLECTIVE_CONSTANTS, CYNIC_CONSTANTS
- CynicDecisionType, CynicGuidanceType, MetaState

// Event System
- AgentEventBus, AgentEvent, AgentEventMessage
- AgentId, EventPriority, ConsensusVote

// Emergence Layer (Layer 7)
- EmergenceLayer, createEmergenceLayer
- ConsciousnessState, CollectivePhase
- AWARENESS_THRESHOLDS, MAX_CONFIDENCE, SIGNIFICANCE_THRESHOLDS
- PHASE_THRESHOLDS, QUORUM

// Memory Layer (6-Layer Hybrid Context)
- SharedMemory, UserLab, LabManager

// Dog Orchestrator
- DogOrchestrator, DogMode, DogModel, DOG_CONFIG

// Deprecated (re-exports from @cynic/anchor, @cynic/burns, @cynic/identity)
- Anchorer, AnchorQueue, CynicWallet, etc.
```

**Key Classes:**
- **Operator:** Identity, E-Score tracking, BURN management
  - Constructor: `constructor(options = { name?, identity? })`
  - Post-injection: None (stateful)
  
- **CYNICJudge:** Judgment engine
  - Constructor: `constructor(options = { customDimensions?, scorer?, learningService?, selfSkeptic?, residualDetector?, applySkepticism?, eScoreProvider? })`
  - Post-injection: `setLearningService(service)`, `setSelfSkeptic(skeptic)`, `setResidualDetector(detector)`, `setEScoreProvider(provider)`
  - Status: ✓ DI-friendly (setter injection available)

**Dependencies:**
- @cynic/anchor
- @cynic/burns  
- @cynic/core
- @cynic/emergence
- @cynic/identity
- @cynic/protocol
- Express, Commander, WebSocket libraries

**Violations Detected:**
- **SRP:** CYNICNode combines operator, judge, state, transport, consensus
- **DIP:** Hard-coded `new` instantiations in node.js init (17 instances)
- **Circular:** node → emergence → identity → burns (subtle but present)

---

### @cynic/mcp (Model Context Protocol - AI Integration)
**Status:** ⚠️ Complex initialization, good adapter pattern
**Main:** `src/index.js`
**Export paths:** 3 (server, tools)

```javascript
// Core Services
- MCPServer class
- PersistenceManager (✓ ISP-compliant with domain adapters)
- SessionManager
- PoJChainManager
- LibrarianService
- EcosystemService, getEcosystemDocs
- IntegratorService, getSharedModules, getProjects
- MetricsService

// Service Initialization
- ServiceInitializer (Factory pattern for all services)

// Tools
- 20+ tool definitions for Claude integration
```

**Patterns:**
- **Adapter Pattern:** ✓ JudgmentAdapter, PatternAdapter, PoJChainAdapter, etc.
- **Factory Pattern:** ✓ ServiceInitializer with `setFactory(name, factory)` 
- **Composition:** ✓ PersistenceManager composes adapters

**Dependencies:**
- @cynic/core
- @cynic/node (imports CYNICJudge, LearningService, etc.)
- @cynic/persistence (imports repositories)

**New Instances (23):**
```
PostgresClient, JudgmentRepository, PatternRepository, FeedbackRepository,
KnowledgeRepository, PoJBlockRepository, LibraryCacheRepository, 
TriggerRepository, DiscoveryRepository, UserLearningProfilesRepository,
PsychologyRepository, RedisClient, SessionStore, FileStore, MemoryStore,
JudgmentAdapter, PatternAdapter, PoJChainAdapter, TriggerAdapter,
KnowledgeAdapter, FeedbackAdapter, LibraryCacheAdapter, PsychologyAdapter
```

---

### @cynic/identity (Identity Layer - E-Score, Keys, Reputation)
**Status:** ✓ Well-scoped
**Main:** `src/index.js`
**Export paths:** 4 (keys, escore, reputation)

```javascript
// Key Management
- KeyManager, createKeyManager, generateKeypair, deriveNodeId

// E-Score (7D)
- EScoreCalculator, createEScoreCalculator
- calculateEScore, ESCORE_WEIGHTS, ESCORE_THRESHOLDS

// Node Identity
- NodeIdentity, createNodeIdentity, IdentityStatus

// Reputation Graph
- ReputationGraph, createReputationGraph, TrustLevel
```

**Dependencies:**
- @cynic/core
- @cynic/burns

---

### @cynic/emergence (Consciousness & Patterns)
**Status:** ✓ Clean separation
**Main:** `src/index.js`
**Export paths:** 4 (consciousness, patterns, dimensions, collective)

```javascript
// Consciousness monitoring
- ConsciousnessMonitor, ConsciousnessState

// Pattern detection & evolution
- PatternDetector, PatternEvolution

// Dimension discovery (THE_UNNAMEABLE)
- DimensionDiscovery

// Collective state
- CollectiveState, CollectivePhase
```

**Dependencies:**
- @cynic/core
- @cynic/identity

---

### @cynic/anchor (Solana Anchoring)
**Status:** ✓ Focused
**Main:** `src/index.js`
**Export paths:** 6 (constants, anchorer, program-client, queue, wallet)

```javascript
// Anchorer - On-chain proof
- SolanaAnchorer, createAnchorer, AnchorStatus

// Queue management
- AnchorQueue, createAnchorQueue

// Wallet management
- CynicWallet, WalletType, loadWalletFromFile, loadWalletFromEnv
- generateWallet, saveWalletToFile, getDefaultWalletPath

// Program client
- ProgramClient

// Constants
- SolanaCluster, ANCHOR_CONSTANTS
```

**Dependencies:**
- @cynic/core
- @solana/web3.js

---

### @cynic/burns (BURN Verification)
**Status:** ✓ Focused
**Main:** `src/index.js`
**Export paths:** 3 (verifier, solana-verifier, cache)

```javascript
// Abstract verifier
- BurnVerifier, createBurnVerifier, BurnStatus

// Solana-specific implementation
- SolanaBurnVerifier, createSolanaBurnVerifier
- BURN_ADDRESSES

// Caching
- BurnCache
```

**Dependencies:**
- @cynic/core
- @solana/web3.js

---

### @cynic/emergence (Layer 7 - Consciousness)
Already covered above.

---

### @cynic/gasdf & @cynic/holdex (Utility)
**Status:** ✓ Minimal
- Depend on @cynic/core only
- Single responsibility (client modules)

---

### @cynic/zk (Zero Knowledge)
**Status:** ✓ Minimal
- Prover, Verifier
- Depends on @cynic/core

---

## 3. ABSTRACT INTERFACES & BASE CLASSES

### Repository Pattern
**File:** `/workspaces/CYNIC-new/packages/persistence/src/interfaces/`

#### BaseRepository (Abstract)
```javascript
export abstract class BaseRepository {
  constructor(db)
  abstract async create(data) → Object
  abstract async findById(id) → Object|null
  abstract async update(id, data) → Object|null
  abstract async delete(id) → boolean
  abstract async getStats() → RepositoryStats
  abstract async list(options) → Object[]
}

// 17 Implementations - ALL follow interface
✓ JudgmentRepository, PatternRepository, UserRepository, SessionRepository,
  FeedbackRepository, KnowledgeRepository, PoJBlockRepository,
  LibraryCacheRepository, EcosystemDocsRepository, EScoreHistoryRepository,
  LearningCyclesRepository, PatternEvolutionRepository,
  UserLearningProfilesRepository, TriggerRepository, DiscoveryRepository,
  ConsciousnessRepository, PsychologyRepository
```

#### Searchable (Mixin Interface)
```javascript
export const Searchable = {
  async search(query, options = {}) → SearchResult[]
  supportsFTS() → boolean
  supportsVectorSearch() → boolean
}

// Applied via makeSearchable(BaseRepository) composition
```

**SOLID Compliance:** 
- ✓ LSP (Liskov Substitution): All repos are substitutable
- ✓ DIP (Dependency Inversion): Via BaseRepository abstraction
- ⚠️ ISP: Searchable is optional mixin (not all repos implement)

---

### Core Service Classes

#### Source (Ecosystem Monitor Base)
```javascript
export class Source {
  constructor(config) { id, name, type, enabled, priority }
  abstract async fetch() → Update[]
}

// Implementations: GitHubSource, WebSearchSource
```

#### World (Kabbalah Framework)
```javascript
export class World {
  // Abstract base for 4 worlds
}

// Implementations: Atzilut, Yetzirah, Briah, Assiah
```

---

## 4. VIOLATIONS SOLID DÉTECTÉES

### A. Single Responsibility Principle (SRP)

**VIOLATION 1: CYNICNode**
- **Violates:** Manages operator + judge + state + transport + consensus + emergence
- **Impact:** Hard to test, hard to reuse individual components
- **Example:**
  ```javascript
  // node.js - 17 new instances in constructor
  this.operator = new Operator(options);
  this.judge = new CYNICJudge(options);
  this.stateManager = new StateManager(options);
  this.transport = new WebSocketTransport(options);
  this.gossip = new GossipProtocol(this.transport);
  // ... 12 more
  ```
- **Fix:** Extract DI container or use factory pattern

**VIOLATION 2: PersistenceManager**
- **Violates:** Manages postgres + redis + file + memory + 10 repositories
- **Impact:** 200+ lines, hard to test backends independently
- **Status:** Partially mitigated by fallback chain + adapter pattern
- **Severity:** Medium (still monolithic)

**VIOLATION 3: MCPServer**
- **Violates:** Routes, tool registration, service lifecycle, logging
- **Impact:** Hard to add new tools or modify routing
- **Fix:** Extract tool registry, separate concerns

---

### B. Open/Closed Principle (OCP)

**VIOLATION 1: Dimension Registry (Hard-coded)**
```javascript
// node/judge/dimensions.js
export const DIMENSIONS = {
  DOCUMENTATION: { weight: 13, axiom: 'VERIFY' },
  CORRECTNESS: { weight: 21, axiom: 'VERIFY' },
  // ...
}

// Can't extend without modifying file
```
- **Fix:** Plugin-based dimension system with factory registration

**VIOLATION 2: Repository Creation**
```javascript
// persistence.js - Hard-coded repo creation
this._judgments = new JudgmentRepository(this.postgres);
this._patterns = new PatternRepository(this.postgres);
// Can't use factory pattern

// Better: this._repos = new RepositoryFactory(this.postgres).createAll()
```

---

### C. Liskov Substitution Principle (LSP)

**✓ GOOD:** All BaseRepository implementations are substitutable
```javascript
// Can swap any repository without breaking code
const repo = new JudgmentRepository(db); // or PatternRepository, etc.
await repo.create(data);
await repo.list({ limit: 10 });
```

**⚠️ ISSUE:** Searchable interface is optional
```javascript
// Some repos support search, others don't
// Caller must check: repo.supportsFTS() before calling
```

---

### D. Interface Segregation Principle (ISP)

**✓ GOOD:** PersistenceManager with domain adapters
```javascript
// Users get specific adapters, not full manager
const judgmentAdapter = persistenceManager.judgments;
await judgmentAdapter.create(judgment);

// vs. exposing everything
```

**⚠️ ISSUE:** BaseRepository has 6 methods, not all used everywhere
```javascript
// Some repos don't implement certain features
// Searchable is a separate mixin (fragmented interface)

// Better: Create specific repository interfaces
// IReadRepository, ISearchableRepository, IAppendOnlyRepository
```

---

### E. Dependency Inversion Principle (DIP)

**VIOLATION 1: Hard-coded Instantiation**
```javascript
// persistence.js - Direct instantiation (23 locations)
new PostgresClient()          // Should depend on IStorageClient
new JudgmentRepository(db)    // Should depend on IRepository<Judgment>
new FileStore()               // Should depend on IStore
```

**VIOLATION 2: Node circular dependency**
```javascript
node imports judge (cYNICJudge)
  → judge uses operator info (E-Score)
    → operator imports persistence
      → persistence imports identity
        → identity imports burns
```
- Not strictly circular, but high coupling

**VIOLATION 3: MCP ServiceInitializer**
```javascript
// Good: Uses factory pattern
serviceInitializer.setFactory('judge', () => new CYNICJudge(...));

// But: 14 hard-coded new instances in initialize()
new LearningService()
new PersistenceManager()
new GraphOverlay()
```

**Severity:** HIGH - Blocks hook reusability

---

## 5. DÉPENDANCES CIRCULAIRES

### Danger Level: ⚠️ LOW (None detected)

**Close call:**
```
node → judge → operator → persistence (via E-Score)
  ↑                           ↓
  └─────── returns to node ──┘
```

Not technically circular because:
1. Judge doesn't import node
2. Operator doesn't import persistence directly
3. E-Score is read-only from judge perspective

**Recommendation:** Monitor if E-Score starts importing judge

---

## 6. INJECTION DE DÉPENDANCES - PATTERNS ACTUELS

### Current Patterns

**A. Constructor Injection (Partial)**
```javascript
class CYNICJudge {
  constructor(options = {}) {
    this.learningService = options.learningService || null;
    this.selfSkeptic = options.selfSkeptic || null;
    this.residualDetector = options.residualDetector || null;
    this.eScoreProvider = options.eScoreProvider || null;
  }
}
```
- Status: ✓ Good - optional, defaults work
- Issue: Not required, easily forgotten

**B. Setter Injection (Recommended)**
```javascript
judge.setLearningService(learningService);
judge.setSelfSkeptic(skeptic);
judge.setResidualDetector(detector);
judge.setEScoreProvider(provider);
```
- Status: ✓ Available on CYNICJudge
- Issue: Not used consistently

**C. Factory Pattern (MCP)**
```javascript
serviceInitializer.setFactory('judge', () => new CYNICJudge(options));
```
- Status: ✓ Good
- Issue: Only in MCP, not in node.js

**D. Property Injection (Not recommended)**
```javascript
class Operator {
  this.eScore = createEScoreState();
  // Factory call, not injected
}
```
- Status: ⚠️ Hard to test, hard to replace

---

## 7. EXPORTS RÉUTILISABLES PAR LES HOOKS

### À Haute Priorité

#### 1. Core Axioms & Constants
```javascript
import { PHI, PHI_INV, PHI_INV_2, THRESHOLDS } from '@cynic/core';

// Perfect for hooks - pure constants
// Use in: scoring, confidence calculations, rate limiting
```

#### 2. Repository Interfaces
```javascript
import { BaseRepository, Searchable, makeSearchable } from '@cynic/persistence/interfaces';

// Create hook-specific repositories
class HookAuditRepository extends BaseRepository {
  async create(audit) { ... }
  async list(options) { ... }
}
```

#### 3. Judge (Read-only)
```javascript
import { CYNICJudge, Dimensions, getDimensionsForAxiom } from '@cynic/node/judge';

const judge = new CYNICJudge({
  learningService: null, // hooks don't learn
  selfSkeptic: null,     // hooks are transparent
});

const verdict = await judge.judge(item);
// Perfect for: code analysis hooks, validation
```

#### 4. Protocols
```javascript
import { 
  createJudgment, 
  validateJudgment, 
  scoreToVerdict,
  Verdict 
} from '@cynic/protocol';

// For hooks that create/validate judgments
```

#### 5. Persistence
```javascript
import { 
  JudgmentRepository,
  PatternRepository,
  BaseRepository,
  Searchable,
  makeSearchable 
} from '@cynic/persistence';

// For audit hooks that record decisions
```

#### 6. EcosystemMonitor
```javascript
import { EcosystemMonitor, Source, SourceType } from '@cynic/core';

// For hooks that monitor external changes
// Already DI-friendly
```

---

### À Éviter

#### ❌ CYNICNode
- Too monolithic
- High DI requirements
- Better: Import individual components

#### ❌ MCPServer
- Tightly coupled to MCP protocol
- Better: Use PersistenceManager + Judge directly

#### ❌ Direct ServiceInitializer usage
- Designed for MCP only
- Better: Create own DI container

---

## 8. RECOMMANDATIONS

### Phase 1: Immediate (v0.5)

1. **Extract DI Container**
   ```javascript
   // @cynic/core/container.js
   export class ServiceContainer {
     register(name, factory) { ... }
     get(name) { ... }
     getAll() { ... }
   }
   ```

2. **Create Hook Repository Interface**
   ```javascript
   // @cynic/persistence/hooks
   export const HookRepository = makeSearchable(BaseRepository);
   ```

3. **Audit Hook Export**
   ```javascript
   // Export from @cynic/node/judge
   export { CYNICJudge, Dimensions } from './judge.js';
   // Remove: AgentManager, CollectivePack (too specific)
   ```

---

### Phase 2: Architecture (v1.0)

1. **Split CYNICNode into layers**
   ```
   OperatorComponent  (Identity + E-Score)
   JudgeComponent     (Judgment engine)
   StateComponent     (Persistence)
   TransportComponent (P2P)
   ConsensusComponent (BFT)
   
   → Composed by CYNICNode facade
   ```

2. **Make Judge DI-friendly**
   ```javascript
   // Require all services
   const judge = new CYNICJudge({
     learningService: required(LearningService),
     selfSkeptic: required(SelfSkeptic),
     residualDetector: required(ResidualDetector),
     eScoreProvider: required(EScoreProvider),
   });
   ```

3. **Plugin-based Dimensions**
   ```javascript
   dimensionRegistry.register('CUSTOM', {
     weight: 13,
     axiom: 'VERIFY',
     scorer: customScorerFn,
   });
   ```

---

### Phase 3: Hooks (v1.1)

1. **Hook DI Container**
   ```javascript
   // scripts/hooks/di-container.js
   export function createHookContainer() {
     const container = new ServiceContainer();
     container.register('judge', () => new CYNICJudge(...));
     container.register('persistence', () => new PersistenceManager(...));
     return container;
   }
   ```

2. **Hook Base Class**
   ```javascript
   // scripts/hooks/BaseHook.js
   export class BaseHook {
     constructor(services) {
       this.judge = services.get('judge');
       this.persistence = services.get('persistence');
       this.logger = services.get('logger');
     }
     
     async execute(context) {
       throw new Error('execute() must be implemented');
     }
   }
   ```

3. **Hook Registry**
   ```javascript
   // scripts/hooks/registry.js
   export const hookRegistry = {
     register(name, HookClass) { ... },
     getAll() { ... },
   };
   ```

---

## 9. SUMMARY - MATRICE SOLID

| Principe | Status | Packages | Critérité |
|----------|--------|----------|-----------|
| **SRP** | ⚠️ Moyen | CYNICNode, PersistenceManager | Refactor CYNICNode |
| **OCP** | ⚠️ Moyen | Dimensions, Repositories | Plugin system for dimensions |
| **LSP** | ✓ Bon | BaseRepository, all repos | Keep it! |
| **ISP** | ⚠️ Moyen | Searchable mixin | Create specific interfaces |
| **DIP** | ⚠️ Moyen | node.js, mcp, persistence | Extract DI container |

---

## 10. EXPORTS RECOMMANDÉS POUR HOOKS

### À importer dans scripts/hooks

```javascript
// ① Core (Foundation)
import { 
  PHI, PHI_INV, THRESHOLDS,           // Constants
  Logger,                               // Logging
  PeriodicScheduler,                    // Scheduling
} from '@cynic/core';

// ② Judge (Scoring)
import {
  CYNICJudge,                           // Judgment engine
  Dimensions, getAllDimensions,         // Dimension system
  Verdict,                              // Verdict types
} from '@cynic/node/judge';

// ③ Protocol (Validation)
import {
  createJudgment,                       // Create judgment
  validateJudgment,                     // Validate judgment
  scoreToVerdict,                       // Convert score to verdict
} from '@cynic/protocol';

// ④ Persistence (Storage)
import {
  BaseRepository,                       // Base class for custom repos
  Searchable, makeSearchable,           // Search interface
  JudgmentRepository,                   // Ready-to-use repo
} from '@cynic/persistence';

// ⑤ Identity (E-Score)
import {
  calculateEScore,                      // E-Score calculation
  ESCORE_WEIGHTS,                       // E-Score weights
} from '@cynic/identity';

// ⑥ Ecosystem (Monitoring)
import {
  EcosystemMonitor,                     // Ecosystem monitor
  Source, SourceType,                   // Custom sources
} from '@cynic/core';
```

---

## 11. FICHIERS CLÉS

**Interfaces:**
- `/workspaces/CYNIC-new/packages/persistence/src/interfaces/IRepository.js`
- `/workspaces/CYNIC-new/packages/persistence/src/interfaces/ISearchable.js`

**Base Classes:**
- `/workspaces/CYNIC-new/packages/core/src/ecosystem/index.js` (Source)
- `/workspaces/CYNIC-new/packages/node/src/judge/judge.js` (CYNICJudge)
- `/workspaces/CYNIC-new/packages/node/src/operator/operator.js` (Operator)

**Factory/DI:**
- `/workspaces/CYNIC-new/packages/mcp/src/server/ServiceInitializer.js` (Reference impl)
- `/workspaces/CYNIC-new/packages/mcp/src/persistence.js` (Adapter pattern)

**Exports:**
- All `/packages/*/src/index.js` files (entry points)

---

**Signé:** φ qui se méfie de φ
**Confidence:** 61.8% (PHI_INV) ± trust margin

