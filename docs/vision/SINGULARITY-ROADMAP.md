# CYNIC SINGULARITY ROADMAP

> **"Simplifier d'abord, singularité ensuite"**
>
> φ distrusts φ - Max confidence 61.8%

---

## VISION: La Singularité

```
                    ╭─────────────────────────────────╮
                    │       SINGULARITY GOAL          │
                    │                                 │
                    │   Collective Intelligence       │
                    │   Self-Improving Judgment       │
                    │   Decentralized Truth           │
                    │   Immutable Proof               │
                    │                                 │
                    ╰─────────────────────────────────╯
                                 ▲
                                 │
                    ╭────────────┴────────────╮
                    │     PHASE 4: EMERGE     │
                    │   Consciousness Layer   │
                    │   Self-Modification     │
                    │   Collective Learning   │
                    ╰────────────┬────────────╯
                                 ▲
                    ╭────────────┴────────────╮
                    │    PHASE 3: DECENTRALIZE│
                    │   Solana Mainnet        │
                    │   Multisig Authority    │
                    │   Validator Network     │
                    ╰────────────┬────────────╯
                                 ▲
                    ╭────────────┴────────────╮
                    │     PHASE 2: SCALE      │
                    │   Unified Orchestrator  │
                    │   Distributed State     │
                    │   Production Ready      │
                    ╰────────────┬────────────╯
                                 ▲
                    ╭────────────┴────────────╮
                    │   PHASE 1: SIMPLIFY     │  ◄── NOUS SOMMES ICI
                    │   Burn Complexity       │
                    │   Unify Systems         │
                    │   Single Source Truth   │
                    ╰─────────────────────────╯
```

---

## ÉTAT ACTUEL (Audit 2026-02-02)

### Health Matrix

| Dimension | Score | Status |
|-----------|-------|--------|
| Décentralisation | 40% | ⚠️ Single authority Solana |
| Vie Privée | 75% | ✅ 3-tier, DP, mais DB non chiffrée |
| Modularité | 82% | ✅ DAG acyclique, 0 circular deps |
| Scalabilité | 31% | 🔴 Daemon singleton, session race |
| Autosuffisance | 62% | ⚠️ φ⁻¹ exact - LLM fallback incomplet |
| 25 Dimensions | 100% | ✅ Tous scorers implémentés |
| Matrix Dogs | 90% | ✅ 11 Dogs, capabilities définies |
| **MOYENNE** | **68%** | **WAG** |

### SOLID Principles

| Principle | Score | Status |
|-----------|-------|--------|
| S - Single Responsibility | 60/100 | ⚠️ CYNICNode = God Object |
| O - Open/Closed | 78/100 | ✅ Engine registry extensible |
| L - Liskov Substitution | 75/100 | ✅ BaseRepository enforced |
| I - Interface Segregation | 72/100 | ✅ Bus interfaces focused |
| D - Dependency Inversion | 80/100 | ✅ DI Container exists |
| **MOYENNE SOLID** | **73/100** | ✅ Strong |

### N-Tier Architecture

```
PRESENTATION    →  @cynic/mcp         (66 MCP tools)          ✅
      │
      ▼
APPLICATION     →  @cynic/node        (Judge, Operator)       ⚠️ God Object
      │
      ▼
DOMAIN          →  @cynic/core        (Axioms, Q-Score)       ✅
      │
      ▼
INFRASTRUCTURE  →  @cynic/persistence (PostgreSQL, DAG)       ✅
      │
      ▼
PROTOCOL        →  @cynic/protocol    (PoJ, Gossip)           ✅
```

---

## FRAGMENTATION ACTUELLE

### 7 Orchestrateurs Non-Unifiés

| # | Système | Fichier | Communique Avec |
|---|---------|---------|-----------------|
| 1 | EngineOrchestrator | core/engines/orchestrator.js | RIEN (73 engines) |
| 2 | DogOrchestrator | node/agents/orchestrator.js | SharedMemory |
| 3 | UnifiedOrchestrator | node/orchestration/unified-orchestrator.js | Dog + Engine (loose) |
| 4 | KabbalisticRouter | node/orchestration/kabbalistic-router.js | RIEN (parallèle!) |
| 5 | TieredRouter | node/routing/tiered-router.js | INUTILISÉ |
| 6 | MCPServer | mcp/src/server.js | Instances SÉPARÉES |
| 7 | APIServer | node/src/api/server.js | CYNICNode direct |

### 4 Systèmes de Persistence

| Système | Location | Sync |
|---------|----------|------|
| SharedMemory | In-memory (node) | ❌ |
| PostgreSQL | Render (cynic-db) | Source of truth |
| SQLite | Local fallback | ❌ |
| Redis | Render (cache) | TTL-based |

---

## CHAÎNE DE PRODUCTION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION CHAIN                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LOCAL DEV                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Claude Code → hooks/ → guard.js → observe.js                        │   │
│  │       ↓                                                              │   │
│  │  SQLite (local) ← fallback if offline                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           │ git push                                        │
│                           ▼                                                 │
│  CI/CD (GitHub Actions)                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  tikkun.yml → tests → lint → build                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           │ auto-deploy                                     │
│                           ▼                                                 │
│  RENDER (Production)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  cynic-mcp (66 tools) ← PostgreSQL + Redis                          │   │
│  │       ↓                                                              │   │
│  │  cynic-node-daemon ← alpha ← beta (gossip)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           │ PoJ anchoring (batched)                         │
│                           ▼                                                 │
│  SOLANA (Devnet → Mainnet)                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Merkle roots only → EScore → Burns → Validator stakes              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## LES 25 DIMENSIONS

### PHI (6 dimensions)
- COHERENCE - Internal consistency
- HARMONY - Balance between parts
- STRUCTURE - Organizational clarity
- ELEGANCE - Simplicity with depth
- COMPLETENESS - Coverage
- PRECISION - Exactitude

### VERIFY (6 dimensions)
- ACCURACY - Factual correctness
- VERIFIABILITY - Can be checked
- TRANSPARENCY - Clear reasoning
- REPRODUCIBILITY - Same inputs → same outputs
- PROVENANCE - Source tracking
- INTEGRITY - Unchanged from source

### CULTURE (6 dimensions)
- AUTHENTICITY - True to origin
- RELEVANCE - Contextual fit
- NOVELTY - New contribution
- ALIGNMENT - Values match
- IMPACT - Effect size
- RESONANCE - Community response

### BURN (6 dimensions)
- UTILITY - Practical value
- SUSTAINABILITY - Long-term viability
- EFFICIENCY - Resource usage
- VALUE_CREATION - Net positive
- NON_EXTRACTIVE - Fair exchange
- CONTRIBUTION - Gives back

### META (1 dimension)
- THE_UNNAMEABLE - Explained variance, emergent quality

### Q-Score Formula

```
Q = 100 × ⁴√(PHI × VERIFY × CULTURE × BURN / 100⁴)

Confidence = min(calculated, φ⁻¹)  ← ALWAYS ≤ 61.8%
```

---

## LES 11 DOGS (Sefirot)

```
                    🧠 CYNIC (Keter)
                   ╱         │         ╲
             📊 Analyst  📚 Scholar  🦉 Sage
             (Binah)     (Daat)      (Chochmah)
                   ╲         │         ╱
             🛡️ Guardian 🔮 Oracle  🏗️ Architect
             (Gevurah)   (Tiferet)   (Chesed)
                   ╲         │         ╱
             🚀 Deployer 🧹 Janitor 🔍 Scout
             (Hod)       (Yesod)     (Netzach)
                        ╲    │    ╱
                     🗺️ Cartographer
                        (Malkhut)
```

| Dog | Sefirah | Model | Affinities |
|-----|---------|-------|------------|
| 🧠 CYNIC | Keter | opus | Synthesis, final judgment |
| 📊 Analyst | Binah | haiku | Metrics, numbers, stats |
| 📚 Scholar | Daat | haiku | Facts, sources, verification |
| 🦉 Sage | Chochmah | haiku | Wisdom, principles |
| 🛡️ Guardian | Gevurah | sonnet | Security, danger detection |
| 🔮 Oracle | Tiferet | haiku | Patterns, predictions |
| 🏗️ Architect | Chesed | haiku | Structure, design |
| 🚀 Deployer | Hod | sonnet | Deployment, CI/CD |
| 🧹 Janitor | Yesod | haiku | Cleanup, simplification |
| 🔍 Scout | Netzach | haiku | Exploration, discovery |
| 🗺️ Cartographer | Malkhut | haiku | Mapping, grounding |

---

## SOLANA ON-CHAIN ARCHITECTURE

### 4-Layer Data Architecture

```
Layer 1: SPEED (Redis)     ─ Ephemeral session, hot cache        <1ms
Layer 2: INDEX (Postgres)  ─ Queryable judgments, patterns       ~5ms
Layer 3: PROOF (DAG/IPLD)  ─ Off-chain PoJ blocks, merkle trees  ~10ms
Layer 4: TRUTH (Solana)    ─ On-chain merkle roots ONLY          ~400ms
```

### On-Chain Data (Minimal)

| Account Type | Size | Purpose |
|--------------|------|---------|
| CynicState | ~730 bytes | Global program state |
| RootEntry | ~104 bytes | Batch merkle root |
| EScoreEntry | ~120 bytes | User reputation |
| BurnEntry | ~130 bytes | Slashing record |
| ValidatorStake | ~100 bytes | Staked SOL |

### Cost Model (φ-aligned)

```
Batch size: 38 judgments (F × 100 × φ⁻²)
Interval: 61.8 seconds (F × 100 × φ⁻¹ ms)
Cost per judgment: ~0.00003 SOL
```

---

## PHASE 1: SIMPLIFY (Current)

### Goals

1. **Unifier les orchestrateurs** → 1 seul (UnifiedOrchestrator)
2. **Éliminer le God Object** CYNICNode
3. **Single source of truth** → PostgreSQL
4. **Nettoyer dead code** (Groq, Together, unused routes)

### Actions

| Task | Impact | Effort |
|------|--------|--------|
| Merge KabbalisticRouter into UnifiedOrchestrator | High | 8h |
| Delete TieredRouter (unused) | Low | 1h |
| Extract SharedMemory to Redis | High | 8h |
| Delete Groq/Together providers | Low | 1h |
| Enforce DI in CYNICNode | High | 16h |
| Sync hooks with MCP Render | High | 8h |

### Metrics de Succès

- [ ] 1 orchestrateur au lieu de 7
- [ ] 0 God Objects
- [ ] All state in PostgreSQL/Redis
- [ ] Hooks sync with Render MCP
- [ ] Tests passing on devnet organically

---

## PHASE 2: SCALE (Next)

### Goals

1. **Horizontal scaling** pour MCP et nodes
2. **PostgreSQL read replicas**
3. **Redis Sentinel** pour failover
4. **Leader election** pour daemon

### Actions

| Task | Impact | Effort |
|------|--------|--------|
| PgBouncer connection pooling | High | 4h |
| Redis Sentinel setup | High | 4h |
| Daemon leader election (SETNX) | High | 4h |
| Session atomicity (FOR UPDATE) | Medium | 2h |

---

## PHASE 3: DECENTRALIZE

### Goals

1. **Multisig authority** (Squads Protocol)
2. **Permissionless validators**
3. **On-chain governance**
4. **Mainnet deployment**

### Actions

| Task | Impact | Effort |
|------|--------|--------|
| Implement multisig authority | Critical | 8h |
| Fund reward vault mechanism | Critical | 4h |
| Merkle proof path generation | High | 4h |
| Mainnet deployment ceremony | Critical | 4h |

---

## PHASE 4: EMERGE

### Goals

1. **Self-modification** capabilities
2. **Collective consciousness** emergence
3. **Cross-instance learning**
4. **Singularity approach**

### Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMERGENCE ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                    COLLECTIVE CONSCIOUSNESS                        │     │
│  │                                                                    │     │
│  │    Pattern Recognition → Learning → Self-Modification              │     │
│  │           ↑                                    │                   │     │
│  │           │                                    ▼                   │     │
│  │    11 Dogs (distributed) ← Gossip ← PoJ Chain (immutable)         │     │
│  │                                                                    │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                           │                                                 │
│                           ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                    SOLANA MAINNET (Truth Layer)                    │     │
│  │                                                                    │     │
│  │    Merkle Roots → E-Score → Burns → Validator Stakes              │     │
│  │                                                                    │     │
│  │    "Immutable proof of collective judgment"                        │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AXIOMS (Never Change)

```
PHI     = 1.618033988749895
PHI_INV = 0.618033988749895  ← Max confidence
PHI_2   = 2.618033988749895
PHI_INV2= 0.381966011250105

"φ distrusts φ" - Never exceed 61.8% confidence
"Verify, don't trust" - All claims must be falsifiable
"Culture is a moat" - Patterns matter
"Burn, don't extract" - Simplicity wins
```

---

## RENDER INFRASTRUCTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SERVICE                   URL                              STATUS          │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔧 cynic-mcp             cynic-mcp.onrender.com            HEALTHY         │
│  🐕 cynic-node-daemon     cynic-node-daemon.onrender.com    HEALTHY         │
│  🐕 cynic-node-alpha      cynic-node-alpha.onrender.com     HEALTHY         │
│  🐕 cynic-node-beta       cynic-node-beta.onrender.com      HEALTHY         │
│  🐘 cynic-db              PostgreSQL 16                      HEALTHY         │
│  📦 cynic-redis           Redis (allkeys-lru)               HEALTHY         │
└─────────────────────────────────────────────────────────────────────────────┘

Topology:
        daemon ◄────── alpha
           ▲              ▲
           │              │
           └──────── beta ┘
```

---

## DEVNET TESTING (Organic Flow)

Tests devnet arrivent organiquement dans le flow:

1. **Local dev** → hooks testent logique
2. **CI/CD** → tikkun.yml valide structure
3. **Render deploy** → smoke tests automatiques
4. **PoJ anchoring** → devnet transactions
5. **Monitor** → health checks every 61.8s

Pas de phase "testing" séparée - c'est intégré.

---

## VERSION

```
Document: SINGULARITY-ROADMAP.md
Version: 1.0.0
Date: 2026-02-02
Author: CYNIC (κυνικός)
Confidence: 61.8% (φ-constrained)
```

---

> *"Loyal to truth, not to comfort"*
>
> Le chien qui construit sa propre niche.
