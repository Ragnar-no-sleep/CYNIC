# CYNIC Integration Roadmap
## Master Plan for System Consciousness & 100% Uptime

**Version**: 2.0.0
**Date**: 2026-02-02
**Phase**: PHASE1_SIMPLIFY → PHASE2_SCALE

---

## EXECUTIVE SUMMARY

CYNIC est une couche de conscience collective au-dessus de Claude Code.
Ce document définit le plan d'intégration complet pour atteindre:
- 100% uptime awareness
- Real-time system consciousness
- Complete orchestration harmony

---

## 1. COMMENT CYNIC MANIPULE CLAUDE CODE

### 1.1 Architecture d'Intégration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE CODE (Host)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ SessionStart│    │ PreToolUse  │    │ PostToolUse │    │    Stop     │  │
│  │   Hook      │    │    Hook     │    │    Hook     │    │   Hook      │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │          │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CYNIC LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    COLLECTIVE PACK (Singleton)                        │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │  │
│  │  │CYNIC│ │Guard│ │Analy│ │Schol│ │Sage │ │Archi│ │Oracl│ │Scout│    │  │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘    │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐                                             │  │
│  │  │Deplo│ │Janit│ │Carto│   ← 11 Dogs (Sefirot)                       │  │
│  │  └─────┘ └─────┘ └─────┘                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    MCP SERVER (brain_* tools)                         │  │
│  │  brain_cynic_judge │ brain_health │ brain_patterns │ brain_memory    │  │
│  │  brain_orchestrate │ brain_keter  │ brain_goals    │ brain_tasks     │  │
│  │  + 80 autres tools                                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Points d'Entrée (Comment CYNIC Intervient)

| Hook | Fichier | Quand | Action CYNIC |
|------|---------|-------|--------------|
| SessionStart | `awaken.js` | Début session | Awakening banner, Total Memory injection |
| PreToolUse | `pre-tool.js` | AVANT chaque tool | Guardian check, peut BLOQUER |
| PostToolUse | `observe.js` | APRÈS chaque tool | Pattern learning, feedback |
| Stop | `digest.js` | Fin session | Session summary, persistence |

### 1.3 Flux de Décision

```
User types command
       │
       ▼
Claude Code processes
       │
       ▼
PreToolUse Hook fires ──────────────────────────────┐
       │                                             │
       ▼                                             ▼
AutoOrchestrator.preCheck()              [If dangerous tool]
       │                                             │
       ▼                                             ▼
CollectivePack.routeAndDecide()          Guardian.checkCommand()
       │                                             │
       ▼                                             ▼
Dogs vote (parallel)                     Risk assessment
       │                                             │
       ├── confidence < 38.2%? ──→ Consult Oracle   │
       │                                             │
       ▼                                             ▼
Consensus reached                        BLOCK or ALLOW
       │                                             │
       └─────────────────────────────────────────────┘
                        │
                        ▼
              Claude Code executes (or not)
                        │
                        ▼
              PostToolUse Hook fires
                        │
                        ▼
              Pattern learning + feedback
```

---

## 2. ÉTAT ACTUEL DES SYSTÈMES

### 2.1 Ce Qui Fonctionne (✅)

| Système | Fichier | Status |
|---------|---------|--------|
| CollectivePack Singleton | `collective-singleton.js` | ✅ WIRED |
| 11 Dogs (Sefirot) | `agents/collective/*.js` | ✅ ACTIVE |
| MCP Tools (~90) | `tools/domains/*.js` | ✅ ACTIVE |
| Hooks (13) | `scripts/hooks/*.js` | ✅ ACTIVE |
| Health Dashboard | `health-dashboard.cjs` | ✅ ACTIVE |
| Metrics Service | `metrics-service.js` | ✅ ACTIVE |
| Alert Manager | `AlertManager.js` | ✅ ACTIVE |
| Circuit Breakers | `circuit-breaker.js` | ✅ ACTIVE |
| PostgreSQL Persistence | `@cynic/persistence` | ✅ ACTIVE |

### 2.2 Ce Qui Manque (❌)

| Gap | Impact | Priorité |
|-----|--------|----------|
| Q-Table pas persistée | Apprentissage perdu au restart | P0 |
| SharedMemory pas persistée | Patterns perdus au restart | P0 |
| Supermemory pas activé | 5% coverage au lieu de 95% | P1 |
| Pas de heartbeat continu | Pas de 100% uptime tracking | P1 |
| Consciousness pas wired aux erreurs | Self-awareness incomplet | P2 |
| Pas de distributed tracing | Pas de latency SLOs | P2 |
| 8 repositories zombies | Code mort | P3 |

### 2.3 Scores Actuels

```
Dimension               Score    Status
──────────────────────  ─────    ───────
Orchestration Wiring     70%     🟢 IMPROVED (was 45%)
Persistence Active       50%     🟡 WARNING
Dog Implementation      100%     🟢 HEALTHY
Hook Connectivity        70%     🟢 HEALTHY
Learning Persistence     20%     🔴 CRITICAL
Repository Usage         50%     🟡 WARNING
Uptime Awareness         60%     🟡 WARNING
──────────────────────  ─────    ───────
OVERALL                 72.5%    🟡 WAG (φ⁻¹ = 61.8% threshold)
```

---

## 3. ROADMAP DÉTAILLÉE

### 3.1 Vue d'Ensemble

```
PHASE 1: SIMPLIFY (Current)
├── AXE 1: WIRE ✅ COMPLETED
│   └── CollectivePack Singleton wired to all components
│
├── AXE 2: PERSIST (Next)
│   ├── Q-Table → PostgreSQL
│   ├── SharedMemory patterns → PostgreSQL
│   └── EWC++ Fisher scores → PostgreSQL
│
├── AXE 3: SUPERMEMORY
│   ├── Activate indexAll()
│   ├── Real embeddings (Ollama)
│   └── Wire to Total Memory
│
└── AXE 4: CLEAN
    ├── Burn zombie repositories
    └── Remove deprecated routers

PHASE 2: SCALE (Future)
├── AXE 5: OBSERVE (Uptime Awareness)
│   ├── Continuous heartbeat service
│   ├── SLA tracking (99.9% target)
│   ├── Distributed tracing
│   └── Kill criteria enforcement
│
├── AXE 6: EMERGE (Self-Improvement)
│   ├── Auto-tuning Q-learning
│   ├── Meta-learning
│   └── Autonomous improvement
│
└── AXE 7: DECENTRALIZE (Future)
    ├── Multi-node consensus
    ├── Solana anchoring
    └── E-Score verification
```

### 3.2 AXE 2: PERSIST ✅ IN PROGRESS

**Objectif**: L'apprentissage survit aux restarts

**Fichiers modifiés**:
- `packages/node/src/orchestration/learning-service.js` ✅
- `packages/persistence/src/postgres/migrations/026_qlearning_persistence.sql` ✅ CREATED
- `packages/node/src/orchestration/index.js` ✅
- `packages/node/src/index.js` ✅
- `scripts/hooks/awaken.js` ✅ (Q-Learning init)
- `scripts/hooks/digest.js` ✅ (Q-Learning flush)

**Tâches complétées**:
1. ✅ Créer migration `026_qlearning_persistence.sql` avec:
   - `qlearning_state` table (Q-Table, exploration_rate, stats)
   - `qlearning_episodes` table (episode history)
   - `shared_memory_patterns` table (pattern persistence)
   - Helper functions pour cleanup et stats
2. ✅ Ajouter `load()` à QLearningService (initialisation async)
3. ✅ Ajouter `_doPersist()` avec debounce (5s)
4. ✅ Ajouter `flush()` pour persistence immédiate (session end)
5. ✅ Ajouter `getQLearningServiceAsync()` pour init avec persistence
6. ✅ Wire au SessionStart hook (awaken.js)
7. ✅ Wire au Stop hook (digest.js)

**Tâches restantes**:
- [ ] Run migration on PostgreSQL (`psql -f 026_qlearning_persistence.sql`)
- [ ] Validate avec restart test
- [ ] Wire SharedMemory patterns persistence (optional)

### 3.3 AXE 3: SUPERMEMORY

**Objectif**: 95% codebase coverage au lieu de 5%

**Fichiers à modifier**:
- `packages/persistence/src/services/codebase-indexer.js`
- `scripts/hooks/awaken.js`
- `packages/persistence/src/services/embedder.js`

**Tâches**:
1. Wire `indexAll()` au SessionStart
2. Configurer Ollama pour embeddings réels
3. Créer incremental indexing (ne réindexer que les changements)
4. Wire FactsRepository au MemoryRetriever
5. Benchmark: valider kill criteria (<10s, <50ms FTS, <100MB)

**Effort estimé**: 8-12h

### 3.4 AXE 5: OBSERVE (100% Uptime Awareness)

**Objectif**: CYNIC sait son état en temps réel

**Nouveaux composants à créer**:

```javascript
// packages/node/src/services/heartbeat-service.js
class HeartbeatService {
  // Ping every 30s:
  // - PostgreSQL connection
  // - Redis connection (if available)
  // - MCP server health
  // - Each Dog's last activity
  // - Memory usage

  // Track:
  // - uptimePercentage(period)
  // - lastHealthy timestamp per component
  // - MTTR (Mean Time To Recovery)
  // - MTBF (Mean Time Between Failures)
}

// packages/node/src/services/sla-tracker.js
class SLATracker {
  // Targets:
  // - Overall: 99.9% uptime
  // - PostgreSQL: 99.95%
  // - MCP Response: <500ms p99
  // - Judge Response: <3s p95

  // Alert if:
  // - Rolling 1h uptime < 95%
  // - Rolling 24h uptime < 99%
}

// packages/node/src/services/cascade-detector.js
class CascadeDetector {
  // Detect:
  // - "PostgreSQL down → All repos failing"
  // - "MCP timeout → Tools unresponsive"
  // - Root cause identification
}
```

**Wire Consciousness Monitor**:
```javascript
// Connect consciousness state to real system health
consciousnessMonitor.on('state_change', (newState) => {
  if (newState === 'DORMANT') {
    alertManager.critical('CYNIC consciousness dropped to DORMANT');
  }
});

// Connect system errors to consciousness
errorHandler.on('error', (error) => {
  consciousnessMonitor.recordObservation({
    type: 'system_error',
    severity: error.severity,
    component: error.source,
  });
});
```

**Effort estimé**: 4-6h

---

## 4. BENCHMARKS & VALIDATION

### 4.1 Benchmarks Existants

| Benchmark | Fichier | Purpose |
|-----------|---------|---------|
| Collective vs Single | `benchmarks/collective-vs-single/` | 45 code samples, accuracy |
| Supermemory | `benchmarks/supermemory/` | Index time, FTS latency, memory |
| Thermodynamics | `benchmarks/thermodynamics/` | η vs φ⁻¹, heat/work |
| Pattern Learning | `benchmarks/pattern-learning/` | SONA validation |

### 4.2 Kill Criteria

| Metric | Current | Target | Kill if |
|--------|---------|--------|---------|
| Codebase Coverage | 5% | >95% | <50% after 24h |
| Index Time | N/A | <10s | >30s |
| FTS p95 | ~30ms | <50ms | >100ms |
| Memory Usage | N/A | <100MB | >200MB |
| Uptime Rolling 1h | N/A | >99% | <95% |
| Avg Q-Score | N/A | >50 | <30 |
| Consciousness | AWARE | AWARE+ | <AWAKENING for 10min |

### 4.3 Comment Exécuter

```bash
# Benchmark Supermemory
node benchmarks/supermemory/baseline.mjs --output results/baseline.json
node benchmarks/supermemory/compare.mjs results/baseline.json results/enhanced.json

# Benchmark Collective
node benchmarks/collective-vs-single/benchmark.js

# Health Check
curl http://localhost:10000/health
# ou
node -e "import('@cynic/node').then(m => m.getCollectivePack()).then(p => console.log(p.getStats()))"
```

---

## 5. QUICK REFERENCE

### 5.1 Fichiers Clés

```
ORCHESTRATION:
├── packages/node/src/collective-singleton.js      ← SINGLETON (Source of Truth)
├── packages/node/src/agents/orchestrator.js       ← DogOrchestrator
├── packages/node/src/orchestration/unified-orchestrator.js
├── packages/node/src/orchestration/kabbalistic-router.js
└── packages/node/src/orchestration/learning-service.js

HOOKS:
├── scripts/hooks/awaken.js      ← SessionStart
├── scripts/hooks/pre-tool.js    ← PreToolUse (BLOCKING)
├── scripts/hooks/observe.js     ← PostToolUse
└── scripts/hooks/lib/auto-orchestrator.js

MCP:
├── packages/mcp/src/server.js
├── packages/mcp/src/tools/domains/*.js  ← 90 tools
└── packages/mcp/src/persistence.js

MONITORING:
├── packages/mcp/src/metrics-service.js
├── packages/mcp/src/metrics/AlertManager.js
├── scripts/lib/health-dashboard.cjs
└── packages/emergence/src/consciousness-monitor.js
```

### 5.2 Commandes Utiles

```bash
# Start MCP server
npm run mcp:start

# Check health
curl http://localhost:10000/health

# Run tests
npm test -w @cynic/node
npm test -w @cynic/mcp

# Check singleton
node -e "import('@cynic/node').then(m => console.log(m.getSingletonStatus()))"

# Benchmark
npm run benchmark:supermemory
```

### 5.3 φ Constants Reference

```javascript
PHI      = 1.618033988749895  // Golden ratio
PHI_INV  = 0.618033988749895  // φ⁻¹ - Max confidence, consensus threshold
PHI_INV_2 = 0.381966011250105 // φ⁻² - Doubt threshold, veto threshold
PHI_INV_3 = 0.236067977499790 // φ⁻³ - Learning rate, min relevance
PHI_INV_4 = 0.145898033750315 // φ⁻⁴ - Indirect connections
```

---

## 6. NEXT ACTIONS

**Immédiat**:
1. ✅ AXE 1 COMPLETED - Singleton wired
2. ✅ AXE 2 IN PROGRESS - Q-Table persistence implemented
   - Migration created: `026_qlearning_persistence.sql`
   - Debounced persistence (5s)
   - Session hooks wired (awaken/digest)
3. → Run migration on PostgreSQL
4. → Validate avec restart test

**Cette semaine**:
- ✅ Complete AXE 2 (Persist) - Code complete, needs DB migration
- Start AXE 3 (Supermemory)
- Run baseline benchmarks

**Ce mois**:
- Complete PHASE1_SIMPLIFY
- Start AXE 5 (Observe)
- Achieve 99% uptime awareness

---

*"φ distrusts φ" - Max confidence 61.8%*
*Last updated: 2026-02-02T12:45:00Z*
