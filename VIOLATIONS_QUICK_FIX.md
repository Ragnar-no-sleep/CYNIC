# SOLID Violations - Quick Fix Guide

## Overview

3 CRITICAL violations blocking hook reusability.
2 MEDIUM violations affecting testability.

---

## CRITICAL: DIP Violation (Dependency Inversion)

### Location
`/packages/node/src/node.js` - CYNICNode constructor

### Problem
```javascript
// ❌ BAD: 17 hard-coded instantiations
this.operator = new Operator(options);
this.judge = new CYNICJudge(options);
this.stateManager = new StateManager(options);
this.transport = new WebSocketTransport(options);
this.gossip = new GossipProtocol(this.transport);
this.consensus = new ConsensusEngine(options);
// ... 11 more
```

### Impact
- Cannot replace components with mocks
- Cannot test components in isolation
- Hook system cannot inject dependencies
- Tight coupling to implementations

### Fix: DI Container Pattern

**Step 1:** Create container

```javascript
// /packages/core/src/container.js
export class ServiceContainer {
  #factories = new Map();
  #singletons = new Map();

  register(name, factory, options = {}) {
    this.#factories.set(name, { factory, singleton: options.singleton });
  }

  get(name) {
    if (!this.#factories.has(name)) {
      throw new Error(`Service "${name}" not registered`);
    }
    
    const { factory, singleton } = this.#factories.get(name);
    
    if (singleton) {
      if (!this.#singletons.has(name)) {
        this.#singletons.set(name, factory());
      }
      return this.#singletons.get(name);
    }
    
    return factory();
  }

  getAll() {
    return Array.from(this.#factories.keys());
  }
}
```

**Step 2:** Use in CYNICNode

```javascript
// /packages/node/src/node.js
export class CYNICNode {
  constructor(options = {}) {
    this.container = options.container || this.#createDefaultContainer();
    
    // DI: Get dependencies from container
    this.operator = this.container.get('operator');
    this.judge = this.container.get('judge');
    this.stateManager = this.container.get('stateManager');
    // ...
  }

  #createDefaultContainer() {
    const container = new ServiceContainer();
    
    // Register factories
    container.register('operator', 
      () => new Operator({ name: this.options.name }),
      { singleton: true }
    );
    
    container.register('judge',
      () => new CYNICJudge(this.options),
      { singleton: true }
    );
    
    // ... all components
    
    return container;
  }
}
```

### Testing Example
```javascript
// Now testable!
const mockJudge = { judge: async () => ({ score: 50 }) };
const container = new ServiceContainer();
container.register('judge', () => mockJudge);

const node = new CYNICNode({ container });
assert(node.judge === mockJudge); // ✓
```

---

## CRITICAL: SRP Violation (Single Responsibility)

### Location
`/packages/node/src/node.js` - CYNICNode class

### Problem
```javascript
// One class, 6+ responsibilities:
class CYNICNode {
  // 1. Operator (identity + E-Score)
  this.operator = new Operator(...);
  
  // 2. Judge (scoring)
  this.judge = new CYNICJudge(...);
  
  // 3. State (persistence)
  this.stateManager = new StateManager(...);
  
  // 4. Transport (WebSocket)
  this.transport = new WebSocketTransport(...);
  
  // 5. Consensus (BFT)
  this.consensus = new ConsensusEngine(...);
  
  // 6. Emergence (consciousness)
  this.emergence = new EmergenceLayer(...);
}
```

### Impact
- 400+ lines in one class
- Hard to test individual components
- Hard to reason about lifecycle
- Hard to extend functionality

### Fix: Component-Based Composition

**Step 1:** Extract components

```javascript
// /packages/node/src/components/OperatorComponent.js
export class OperatorComponent {
  constructor(options = {}) {
    this.operator = new Operator(options);
  }
  
  async initialize() { /* ... */ }
  async start() { /* ... */ }
  async stop() { /* ... */ }
}

// /packages/node/src/components/JudgeComponent.js
export class JudgeComponent {
  constructor(options = {}) {
    this.judge = new CYNICJudge(options);
  }
  
  async initialize() { /* ... */ }
  async start() { /* ... */ }
  async stop() { /* ... */ }
}

// ... StateComponent, TransportComponent, ConsensusComponent, EmergenceComponent
```

**Step 2:** Compose in CYNICNode

```javascript
// /packages/node/src/node.js
export class CYNICNode {
  constructor(options = {}) {
    this.operatorComponent = new OperatorComponent(options);
    this.judgeComponent = new JudgeComponent(options);
    this.stateComponent = new StateComponent(options);
    this.transportComponent = new TransportComponent(options);
    this.consensusComponent = new ConsensusComponent(options);
    this.emergenceComponent = new EmergenceComponent(options);
  }

  // Facade methods
  get operator() { return this.operatorComponent.operator; }
  get judge() { return this.judgeComponent.judge; }
  get stateManager() { return this.stateComponent.stateManager; }
  get transport() { return this.transportComponent.transport; }
  get consensus() { return this.consensusComponent.consensus; }
  get emergence() { return this.emergenceComponent.emergence; }
}
```

**Benefits:**
- Each component is independently testable
- Each component has clear responsibility
- Easy to mock individual components
- Easy to add new components

---

## CRITICAL: OCP Violation (Open/Closed)

### Location
`/packages/node/src/judge/dimensions.js`

### Problem
```javascript
// ❌ BAD: Hard-coded dimensions, can't extend
export const DIMENSIONS = {
  DOCUMENTATION: { weight: 13, axiom: 'VERIFY' },
  CORRECTNESS: { weight: 21, axiom: 'VERIFY' },
  ARCHITECTURE: { weight: 13, axiom: 'CULTURE' },
  // ... Can't add new ones without modifying file
}
```

### Impact
- Cannot extend dimensions without code changes
- No plugin system for custom dimensions
- Dimensions can't be registered at runtime

### Fix: Plugin Registry

**Step 1:** Create registry

```javascript
// /packages/node/src/judge/dimension-registry.js
export class DimensionRegistry {
  #dimensions = new Map();

  register(name, definition) {
    if (this.#dimensions.has(name)) {
      console.warn(`Dimension "${name}" already registered, overwriting`);
    }
    this.#dimensions.set(name, definition);
  }

  get(name) {
    return this.#dimensions.get(name);
  }

  getAll() {
    return new Map(this.#dimensions);
  }

  has(name) {
    return this.#dimensions.has(name);
  }
}

export const globalDimensionRegistry = new DimensionRegistry();
```

**Step 2:** Register defaults

```javascript
// /packages/node/src/judge/dimensions.js
globalDimensionRegistry.register('DOCUMENTATION', 
  { weight: 13, axiom: 'VERIFY' }
);
globalDimensionRegistry.register('CORRECTNESS',
  { weight: 21, axiom: 'VERIFY' }
);
// ...
```

**Step 3:** Use in CYNICJudge

```javascript
// /packages/node/src/judge/judge.js
export class CYNICJudge {
  constructor(options = {}) {
    this.dimensionRegistry = options.dimensionRegistry || globalDimensionRegistry;
    this.dimensions = this.dimensionRegistry.getAll();
  }
}
```

**Step 4:** Extend at runtime

```javascript
// In hooks or other code:
import { globalDimensionRegistry } from '@cynic/node/judge';

globalDimensionRegistry.register('CUSTOM_DIMENSION', {
  weight: 8,
  axiom: 'VERIFY',
  scorer: customScorerFn,
});
```

---

## MEDIUM: ISP Violation (Interface Segregation)

### Location
`/packages/persistence/src/interfaces/ISearchable.js`

### Problem
```javascript
// Searchable is optional mixin, not enforced
export const Searchable = {
  async search(query, options) { },
  supportsFTS() { },
  supportsVectorSearch() { }
}

// Some repos have it, some don't
// Caller must check: if (repo.supportsFTS()) ...
```

### Impact
- Not clear which repos support search
- Easy to call search on non-searchable repo
- Fragmented interface

### Fix: Specific Interfaces

```javascript
// /packages/persistence/src/interfaces/IReadable.js
export class ReadableRepository {
  async findById(id) { throw new Error('abstract'); }
  async list(options) { throw new Error('abstract'); }
  async getStats() { throw new Error('abstract'); }
}

// /packages/persistence/src/interfaces/IWritable.js
export class WritableRepository {
  async create(data) { throw new Error('abstract'); }
  async update(id, data) { throw new Error('abstract'); }
  async delete(id) { throw new Error('abstract'); }
}

// /packages/persistence/src/interfaces/ISearchable.js
export class SearchableRepository {
  async search(query, options) { throw new Error('abstract'); }
  supportsFTS() { return false; }
  supportsVectorSearch() { return false; }
}

// Compose them:
export class FullRepository 
  extends ReadableRepository, WritableRepository, SearchableRepository {
}

// Now clear what each repo supports
class JudgmentRepository extends FullRepository { }
class SessionRepository extends ReadableRepository { } // Read-only
```

---

## MEDIUM: DIP Violation (Persistence Layer)

### Location
`/packages/mcp/src/persistence.js` - Lines 115-128

### Problem
```javascript
// ❌ BAD: Hard-coded repository creation
this.postgres = new PostgresClient();
this._judgments = new JudgmentRepository(this.postgres);
this._patterns = new PatternRepository(this.postgres);
// ... 10 more hard-coded
```

### Impact
- Can't test without database
- Can't switch backend without modifying code
- Can't use mocks in testing

### Fix: Repository Factory

```javascript
// /packages/persistence/src/repository-factory.js
export class RepositoryFactory {
  constructor(backend) {
    this.backend = backend;
  }

  create(RepositoryClass) {
    return new RepositoryClass(this.backend);
  }

  createAll() {
    return {
      judgments: this.create(JudgmentRepository),
      patterns: this.create(PatternRepository),
      users: this.create(UserRepository),
      sessions: this.create(SessionRepository),
      feedback: this.create(FeedbackRepository),
      knowledge: this.create(KnowledgeRepository),
      pojBlocks: this.create(PoJBlockRepository),
      libraryCache: this.create(LibraryCacheRepository),
      triggers: this.create(TriggerRepository),
      discovery: this.create(DiscoveryRepository),
      userLearningProfiles: this.create(UserLearningProfilesRepository),
      psychology: this.create(PsychologyRepository),
    };
  }
}
```

Use in PersistenceManager:
```javascript
// /packages/mcp/src/persistence.js
async initialize() {
  const factory = new RepositoryFactory(this.postgres);
  const repos = factory.createAll();
  
  this._judgments = repos.judgments;
  this._patterns = repos.patterns;
  // ...
}
```

Test with mock:
```javascript
// In tests:
const mockDb = { query: async () => ({ rows: [] }) };
const factory = new RepositoryFactory(mockDb);
const repos = factory.createAll(); // All mocked
```

---

## Implementation Priority

### Week 1: DI Container
- [ ] Create `/packages/core/src/container.js`
- [ ] Update CYNICNode to use container
- [ ] Update tests to use container

### Week 2: Components
- [ ] Extract OperatorComponent
- [ ] Extract JudgeComponent
- [ ] Extract StateComponent
- [ ] Extract TransportComponent
- [ ] Extract ConsensusComponent
- [ ] Extract EmergenceComponent

### Week 3: Plugin Registry
- [ ] Create DimensionRegistry
- [ ] Register default dimensions
- [ ] Update CYNICJudge
- [ ] Test registration at runtime

### Week 4: Repository Factory
- [ ] Create RepositoryFactory
- [ ] Update PersistenceManager
- [ ] Update tests

### Week 5: ISP Interfaces
- [ ] Create ReadableRepository, WritableRepository, SearchableRepository
- [ ] Update all repository implementations
- [ ] Update type hints

---

## Verification Checklist

After fixes:

- [ ] No hard-coded `new` in constructors (except factories)
- [ ] All dependencies come from container/options
- [ ] Each class has single responsibility
- [ ] Components are independently testable
- [ ] Dimensions can be registered at runtime
- [ ] Repositories can be mocked in tests
- [ ] Repository interfaces are clear (Read/Write/Search)
- [ ] Hooks can import Judge, Persistence, Protocol without CYNICNode

---

*paw prints* Violations mapped. Fixes clear. Build it right.

