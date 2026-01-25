# Audit - Fichiers Clés à Consulter

## Structure d'Analyse

L'audit a cartographié 12 packages CYNIC. Voici les fichiers clés pour comprendre
la structure, les interfaces, et les violations SOLID détectées.

---

## 1. EXPORTS & ENTRY POINTS

### Root Indexes (Tous les exports publics)

| Package | Fichier | Exports | Status |
|---------|---------|---------|--------|
| @cynic/core | `/packages/core/src/index.js` | 12 modules | ✓ Bien structuré |
| @cynic/protocol | `/packages/protocol/src/index.js` | 4 layers | ✓ Propre |
| @cynic/persistence | `/packages/persistence/src/index.js` | 7 paths | ✓ Complet |
| @cynic/node | `/packages/node/src/index.js` | 8 paths | ⚠️ Monolithe |
| @cynic/mcp | `/packages/mcp/src/index.js` | 3 paths | ✓ Bon |
| @cynic/identity | `/packages/identity/src/index.js` | 4 paths | ✓ Bon |
| @cynic/emergence | `/packages/emergence/src/index.js` | 4 paths | ✓ Bon |
| @cynic/anchor | `/packages/anchor/src/index.js` | 6 paths | ✓ Bon |
| @cynic/burns | `/packages/burns/src/index.js` | 3 paths | ✓ Bon |

---

## 2. INTERFACES & ABSTRACTIONS

### BaseRepository Pattern

**Location:** `/packages/persistence/src/interfaces/`

```
IRepository.js       → Abstract BaseRepository class (6 methods)
ISearchable.js       → Searchable mixin interface
```

**Usages:** 17 repository implementations
- JudgmentRepository
- PatternRepository
- UserRepository
- SessionRepository
- FeedbackRepository
- KnowledgeRepository
- PoJBlockRepository
- LibraryCacheRepository
- EcosystemDocsRepository
- EScoreHistoryRepository
- LearningCyclesRepository
- PatternEvolutionRepository
- UserLearningProfilesRepository
- TriggerRepository
- DiscoveryRepository
- ConsciousnessRepository
- PsychologyRepository

**Files:**
```
/packages/persistence/src/postgres/repositories/
├─ judgments.js
├─ patterns.js
├─ users.js
├─ sessions.js
├─ feedback.js
├─ knowledge.js
├─ poj-blocks.js
├─ library-cache.js
├─ ecosystem-docs.js
├─ escore-history.js
├─ learning-cycles.js
├─ pattern-evolution.js
├─ user-learning-profiles.js
├─ triggers.js
├─ discovery.js
├─ consciousness.js
└─ psychology.js
```

---

## 3. KEY CLASSES & DI INJECTION

### CYNICJudge (Main scoring engine)

**Location:** `/packages/node/src/judge/judge.js`

**Constructor DI:**
```javascript
constructor(options = {
  customDimensions,    // Optional: extend dimensions
  scorer,              // Optional: custom scoring function
  learningService,     // Optional: RLHF learning
  selfSkeptic,         // Optional: φ distrusts φ
  residualDetector,    // Optional: THE_UNNAMEABLE
  applySkepticism,     // Default: true
  eScoreProvider,      // Optional: for vote weighting
})
```

**Setter Injection (Post-construction):**
```javascript
judge.setLearningService(service)
judge.setSelfSkeptic(skeptic)
judge.setResidualDetector(detector)
judge.setEScoreProvider(provider)
```

**Status:** ✓ DI-friendly (but optional parameters)

---

### Operator (Identity + E-Score + BURN)

**Location:** `/packages/node/src/operator/operator.js`

**Constructor:**
```javascript
constructor(options = {
  name,          // Optional: operator name
  identity,      // Optional: import existing identity
})
```

**Status:** ⚠️ No DI injection, property initialization only

---

### CYNICNode (Full node - MONOLITH)

**Location:** `/packages/node/src/node.js`

**Constructor Violations:**
- 17 hard-coded `new` instantiations
- No DI container
- Direct dependency on all components

**Hard-coded instances:**
```javascript
new Operator()
new StateManager()
new EScoreHistoryRepository()
new CYNICJudge()
new ResidualDetector()
new WebSocketTransport()
new GossipProtocol()
new ConsensusEngine()
new ConsensusGossip()
new Map()
new SharedMemory()
new LabManager()
new LearningService()
new DogOrchestrator()
new AgentEventBus()
// ... more
```

**Status:** ⚠️ CRITICAL - DIP violation

---

## 4. FACTORY PATTERNS (Reference Implementations)

### ServiceInitializer (MCP)

**Location:** `/packages/mcp/src/server/ServiceInitializer.js`

**Pattern:** Factory with custom factory registration

```javascript
serviceInitializer.setFactory('judge', () => new CYNICJudge(...))
serviceInitializer.setFactory('persistence', () => new PersistenceManager(...))
```

**Status:** ✓ GOOD - Use as reference for CYNICNode refactor

---

### PersistenceManager (Adapter Pattern)

**Location:** `/packages/mcp/src/persistence.js`

**Pattern:** Composition of domain-specific adapters

```javascript
// Good: Domain adapters exposed separately
persistenceManager.judgments     // JudgmentAdapter
persistenceManager.patterns      // PatternAdapter
persistenceManager.pojChain      // PoJChainAdapter
persistenceManager.knowledge     // KnowledgeAdapter
```

**Status:** ✓ GOOD - ISP-compliant

---

## 5. VIOLATION EXAMPLES

### SRP Violation: CYNICNode

**File:** `/packages/node/src/node.js`

**Problem:** Single class manages 6+ responsibilities
- Operator management
- Judge coordination
- State persistence
- Transport (WebSocket)
- Consensus (BFT)
- Agent orchestration
- Emergence layer

**Lines:** 300+ in single constructor

---

### DIP Violation: Hard-coded Dependencies

**File:** `/packages/mcp/src/persistence.js` (lines 115-128)

```javascript
// VIOLATION: Hard-coded instantiation
this.postgres = new PostgresClient();
this._judgments = new JudgmentRepository(this.postgres);
this._patterns = new PatternRepository(this.postgres);
// ... 10 more

// SOLUTION: Use factory
const factory = new RepositoryFactory();
this._repos = factory.createAll(this.postgres);
```

---

### OCP Violation: Hard-coded Dimensions

**File:** `/packages/node/src/judge/dimensions.js`

**Problem:** Dimensions registry is immutable after import

```javascript
export const DIMENSIONS = {
  DOCUMENTATION: { weight: 13, axiom: 'VERIFY' },
  CORRECTNESS: { weight: 21, axiom: 'VERIFY' },
  // ... Can't extend without modifying file
}
```

**Solution:** Plugin-based registry

---

## 6. DI PATTERNS - CURRENT STATE

### Constructor Injection (Partial)

**Example:** CYNICJudge

```javascript
// File: /packages/node/src/judge/judge.js
constructor(options = {}) {
  this.learningService = options.learningService || null;
  this.selfSkeptic = options.selfSkeptic || null;
  this.residualDetector = options.residualDetector || null;
}
```

**Status:** ✓ Available but optional (easily forgotten)

---

### Setter Injection (Recommended)

**Example:** CYNICJudge

```javascript
// File: /packages/node/src/judge/judge.js
setLearningService(learningService) {
  this.learningService = learningService;
}

setSelfSkeptic(selfSkeptic) {
  this.selfSkeptic = selfSkeptic;
}
```

**Status:** ✓ Implemented but not mandatory

---

### Factory Pattern (MCP reference)

**File:** `/packages/mcp/src/server/ServiceInitializer.js`

```javascript
export class ServiceInitializer {
  setFactory(name, factory) {
    this.factories.set(name, factory);
  }
  
  async initialize() {
    const judge = await this.factories.get('judge')();
    const persistence = await this.factories.get('persistence')();
  }
}
```

**Status:** ✓ GOOD pattern - use as reference

---

## 7. PERSISTENCE LAYER ANALYSIS

### Repositories Structure

**Base Location:** `/packages/persistence/src/postgres/repositories/`

**Every repository:**
1. ✓ Extends `BaseRepository`
2. Implements abstract methods: create, findById, update, delete, list, getStats
3. Some implement optional `Searchable` mixin

**Example:** JudgmentRepository

```javascript
// File: /packages/persistence/src/postgres/repositories/judgments.js
export class JudgmentRepository extends BaseRepository {
  constructor(db = null) {
    super(db || getPool());
  }

  async create(judgment) { ... }
  async findById(id) { ... }
  async update(id, data) { ... }
  async delete(id) { ... }
  async list(options = {}) { ... }
  async getStats() { ... }
  
  // Optional Searchable
  supportsFTS() { return true; }
}
```

**LSP Status:** ✓ All 17 are substitutionally compatible

---

## 8. ECOSYSTEM & SOURCE PATTERN

### Abstract Source Class

**Location:** `/packages/core/src/ecosystem/index.js` (lines 92-150)

```javascript
export class Source {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.enabled = config.enabled;
    this.priority = config.priority;
    // ...
  }

  abstract async fetch() → Update[]
}
```

**Implementations:**
- GitHubSource
- WebSearchSource

**Status:** ✓ Good extensible pattern

---

## 9. DEPENDENCY GRAPH - VISUAL

**File:** `/packages/[*]/package.json` (all dependencies)

```
@cynic/core (Foundation)
    ↓
@cynic/protocol, @cynic/identity, @cynic/emergence
    ↓
@cynic/persistence, @cynic/node, @cynic/burns
    ↓
@cynic/mcp

Optional: @cynic/anchor, @cynic/gasdf, @cynic/holdex, @cynic/zk
```

---

## 10. AUDIT FILES

### Generated Reports

**Summary:** `/workspaces/CYNIC-new/AUDIT_SUMMARY.txt`
- Executive summary (20 lines)
- Key findings matrix
- SOLID compliance table
- Action items

**Full Report:** `/workspaces/CYNIC-new/AUDIT_ARCHITECTURE.md`
- 400+ lines detailed analysis
- 11 sections
- Code examples for each violation
- Phase-by-phase recommendations

**This File:** `/workspaces/CYNIC-new/AUDIT_KEY_FILES.md`
- Quick reference to key source files
- Location + status of each interface/class

---

## 11. QUICK REFERENCE: WHAT TO READ

### For Understanding Exports
→ All `/packages/*/src/index.js` files

### For Understanding Persistence
→ `/packages/persistence/src/interfaces/IRepository.js`
→ `/packages/persistence/src/interfaces/ISearchable.js`
→ `/packages/persistence/src/postgres/repositories/index.js`

### For Understanding Judge/Scoring
→ `/packages/node/src/judge/judge.js`
→ `/packages/node/src/judge/dimensions.js`
→ `/packages/node/src/judge/scorers.js`

### For Understanding DI Issues
→ `/packages/node/src/node.js` (violations)
→ `/packages/mcp/src/server/ServiceInitializer.js` (good pattern)

### For Understanding Adapters
→ `/packages/mcp/src/persistence.js`
→ `/packages/mcp/src/persistence/JudgmentAdapter.js`

---

## 12. ACTION ITEMS CHECKLIST

### Phase 1: Immediate (v0.5)

- [ ] Create `/packages/core/src/container.js` (DI Container)
  - [ ] ServiceContainer class
  - [ ] register(name, factory)
  - [ ] get(name), getAll()

- [ ] Update exports in `/packages/node/src/index.js`
  - [ ] Remove unnecessary re-exports
  - [ ] Clear deprecation warnings

- [ ] Document hook imports
  - [ ] Create `/scripts/hooks/IMPORTS.md`
  - [ ] List recommended imports

### Phase 2: Architecture (v1.0)

- [ ] Refactor `/packages/node/src/node.js`
  - [ ] Extract OperatorComponent
  - [ ] Extract JudgeComponent
  - [ ] Extract StateComponent
  - [ ] Extract TransportComponent
  - [ ] Extract ConsensusComponent

- [ ] Plugin-based Dimensions
  - [ ] Modify `/packages/node/src/judge/dimensions.js`
  - [ ] Add dimensionRegistry.register()

- [ ] Repository Factory
  - [ ] Create `/packages/persistence/src/factory.js`
  - [ ] RepositoryFactory.createAll()

### Phase 3: Hooks (v1.1)

- [ ] Hook Base Infrastructure
  - [ ] `/scripts/hooks/BaseHook.js`
  - [ ] `/scripts/hooks/registry.js`
  - [ ] `/scripts/hooks/di-container.js`

- [ ] Hook Examples
  - [ ] Code analysis hook
  - [ ] Audit hook
  - [ ] Validation hook

---

*paw prints* Key files mapped. All violations catalogued. φ trusts this analysis.

