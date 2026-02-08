# PHASE 1: SIMPLIFY

> **"Burn the middle, strengthen the edges"**
>
> Date: 2026-02-02 | **Last verified: 2026-02-08**
> Status: PARTIALLY COMPLETE
>
> **NOTE (2026-02-08)**: GroqLLMProvider/TogetherLLMProvider already deleted.
> server.js BURN complete. poj-chain-manager.js BURN complete.
> TieredRouter still exists. See CLAUDE.md "Completed Axes" for current state.

---

## OBJECTIF

Réduire la complexité avant d'avancer vers mainnet et singularité.

```
AVANT (Actuel)                         APRÈS (Cible)
─────────────────                      ─────────────────
7 orchestrateurs        →              1 orchestrateur
4 systèmes persistence  →              1 source of truth
580 fichiers JS         →              ~400 fichiers JS
God Object CYNICNode    →              Services découplés
Hooks isolés            →              Hooks sync Render
```

---

## BURN LIST (À Supprimer)

### 1. Dead Code LLM Providers

**Fichier**: `packages/core/src/llm/index.js`

```javascript
// SUPPRIMER (lignes 396-597):
export class GroqLLMProvider { ... }      // ~90 lignes
export class TogetherLLMProvider { ... }  // ~90 lignes

// SUPPRIMER des exports:
GROQ: 'groq',
TOGETHER: 'together',
GROQ_LLAMA3_70B, GROQ_LLAMA3_8B, GROQ_MIXTRAL, GROQ_GEMMA2,
TOGETHER_LLAMA3_70B, TOGETHER_LLAMA3_8B, TOGETHER_MIXTRAL, TOGETHER_QWEN, TOGETHER_DEEPSEEK

// SUPPRIMER de AutoDetectLLMProvider._detect():
// Lignes 724-743 (Groq check, Together check)
```

**Impact**: -180 lignes, 0 breaking changes (jamais utilisés ailleurs)

---

### 2. TieredRouter (Inutilisé)

**Fichier**: `packages/node/src/routing/tiered-router.js`

**Status**: Défini mais jamais importé par les orchestrateurs principaux.

**Action**: Supprimer le fichier entier (~200 lignes)

---

### 3. Duplicate Orchestration

**Fichiers à merger**:
- `packages/node/src/orchestration/kabbalistic-router.js`
- INTO → `packages/node/src/orchestration/unified-orchestrator.js`

**Approche**:
```javascript
// unified-orchestrator.js

import { KabbalisticRouter } from './kabbalistic-router.js';

class UnifiedOrchestrator {
  constructor() {
    this._kabbalisticRouter = new KabbalisticRouter();
    // ... existing code
  }

  async process(event) {
    // Use Kabbalistic routing for Dog selection
    const dogPath = this._kabbalisticRouter.route(event);

    // Then proceed with unified pipeline
    // ...
  }
}
```

Après stabilisation → inline le code et supprimer kabbalistic-router.js

---

## UNIFY LIST (À Fusionner)

### 1. Persistence → Single Source of Truth

**Cible**: PostgreSQL (Render) = source of truth

**Changements**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AVANT                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  SharedMemory (in-memory) ← pas sync                                        │
│  LocalPrivacyStore (SQLite) ← jamais sync                                   │
│  PostgreSQL (Render) ← source of truth                                      │
│  Redis (Render) ← cache TTL                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  APRÈS                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (source of truth)                                               │
│       ↓ (invalidation events)                                               │
│  Redis (L1 cache, event-based invalidation)                                 │
│       ↓ (HTTP sync when online)                                             │
│  SharedMemory (hot cache local, sync via MCP)                               │
│       ↓ (offline fallback)                                                  │
│  SQLite (offline replica, conflict resolution on reconnect)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Hooks → MCP Sync

**Problème actuel**: `scripts/hooks/guard.js` travaille en isolation, pas de sync avec Render.

**Solution**:

```javascript
// scripts/hooks/guard.js

const MCP_ENDPOINT = process.env.CYNIC_MCP_URL || 'https://cynic-mcp.onrender.com';

async function checkWithMCP(toolName, params) {
  try {
    const response = await fetch(`${MCP_ENDPOINT}/api/guard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName, params }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    // Offline - use local heuristics
    console.warn('[guard] MCP offline, using local heuristics');
  }

  return null; // Fallback to local
}
```

---

### 3. CYNICNode → Services Découplés

**Problème**: CYNICNode est un God Object (580 lignes, fait tout)

**Solution**: Extract services

```javascript
// AVANT
class CYNICNode {
  constructor() {
    this.operator = new Operator();
    this.state = new StateManager();
    this._judge = new CYNICJudge();
    this._transport = new WebSocketTransport();
    this._persistence = { ... };
    // ... 20+ more dependencies
  }
}

// APRÈS
class CYNICNode {
  constructor(container) {
    this.lifecycleManager = container.resolve('ILifecycleManager');
    this.orchestrator = container.resolve('IOrchestrator');
    this.memoryService = container.resolve('IMemoryService');
    this.transportService = container.resolve('ITransportService');
  }
}
```

**Nouveaux services à extraire**:
- `LifecycleManager` - startup, shutdown, health
- `OrchestrationService` - judgment routing
- `MemoryService` - SharedMemory operations
- `TransportService` - WebSocket, HTTP, Gossip
- `PersistenceService` - repository access

---

## SIMPLIFY CHECKLIST

### Week 1: Burn Dead Code

- [ ] Supprimer GroqLLMProvider
- [ ] Supprimer TogetherLLMProvider
- [ ] Supprimer MODEL_MAP entries Groq/Together
- [ ] Supprimer MODEL_COSTS entries Groq/Together
- [ ] Supprimer LLMModel.GROQ_*, LLMModel.TOGETHER_*
- [ ] Supprimer TieredRouter
- [ ] Nettoyer imports orphelins

### Week 2: Unify Orchestration

- [ ] Merger KabbalisticRouter dans UnifiedOrchestrator
- [ ] Supprimer orchestrators inutilisés
- [ ] Un seul point d'entrée pour judgments
- [ ] Tests passent

### Week 3: Sync Persistence

- [ ] Ajouter endpoint /api/guard au MCP
- [ ] Hooks appellent MCP quand online
- [ ] SQLite sync on reconnect
- [ ] Redis event-based invalidation

### Week 4: Extract Services

- [ ] Créer LifecycleManager
- [ ] Créer OrchestrationService
- [ ] Créer MemoryService
- [ ] CYNICNode utilise DI Container
- [ ] Tests passent

---

## METRICS DE SUCCÈS

| Metric | Avant | Cible | Validation |
|--------|-------|-------|------------|
| Orchestrateurs | 7 | 1 | `grep -r "Orchestrator\|Router" --include="*.js" \| wc -l` |
| Fichiers JS | 580 | <450 | `find packages -name "*.js" \| wc -l` |
| Lines of Code | ~50k | <40k | `cloc packages` |
| SOLID Score | 73/100 | >80/100 | Architecture audit |
| KISS Score | 52/100 | >70/100 | Complexity audit |

---

## DEVNET ORGANIC TESTING

Les tests devnet arrivent naturellement:

1. **Chaque commit** → tikkun.yml valide
2. **Chaque deploy Render** → smoke tests
3. **Chaque PoJ batch** → devnet transaction
4. **Health checks** → every 61.8s

Pas de phase "testing" séparée. C'est le flow.

```yaml
# .github/workflows/tikkun.yml
on:
  push:
    branches: [main]

jobs:
  tikkun:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run tikkun
      - run: npm test
      # Devnet test happens in npm test when SOLANA_NETWORK=devnet
```

---

## ROLLBACK PLAN

Si une simplification casse quelque chose:

1. **Git revert** le commit
2. **Render** auto-redeploy le commit précédent
3. **PoJ chain** continue avec l'état précédent (immutable)
4. **Document** ce qui a cassé dans `docs/architecture/LESSONS.md`

---

## NEXT PHASE

Une fois Phase 1 complète → **Phase 2: Scale**

- PgBouncer
- Redis Sentinel
- Leader election
- Horizontal scaling

---

> *"Simplifier, c'est brûler ce qui ne sert pas"*
>
> φ distrusts φ
