# CYNIC Integration Map

> Cross-package and external integration points

---

## Package Dependencies

```
                          ┌─────────────────┐
                          │   @cynic/mcp    │
                          │   (MCP Server)  │
                          └────────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │  @cynic/node    │  │  @cynic/core    │  │ @cynic/persist  │
    │                 │  │                 │  │   (planned)     │
    │  - CYNICJudge   │  │  - PHI/PHI_INV  │  │                 │
    │  - AgentManager │  │  - IDENTITY     │  │  - Repositories │
    │  - StateManager │  │  - Verdict      │  │  - Migrations   │
    └─────────────────┘  │  - Types        │  └─────────────────┘
                         └─────────────────┘
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │  MCP Client  │
                         │ (Claude Code)│
                         └──────┬───────┘
                                │
                         JSON-RPC 2.0
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MCP Server                                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Request Handler                                 │ │
│  │                                                                         │ │
│  │  tools/call ──────────────────────────────────────────────────────────┐│ │
│  │       │                                                                ││ │
│  │       ▼                                                                ││ │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               ││ │
│  │  │ brain_judge │───►│ CYNICJudge  │───►│ Persistence │               ││ │
│  │  └─────────────┘    └──────┬──────┘    └──────┬──────┘               ││ │
│  │                            │                   │                      ││ │
│  │                            ▼                   ▼                      ││ │
│  │                    ┌─────────────┐    ┌─────────────┐                ││ │
│  │                    │ PoJChain    │    │ PostgreSQL  │                ││ │
│  │                    │ (batching)  │    │ (or memory) │                ││ │
│  │                    └─────────────┘    └─────────────┘                ││ │
│  │                                                                       ││ │
│  └───────────────────────────────────────────────────────────────────────┘│ │
└─────────────────────────────────────────────────────────────────────────────┘


                         Judgment Flow
                         ─────────────

  Item ──► Judge ──► Q-Score ──► Verdict ──► Persistence ──► PoJ Block
              │
              └──► Metrics ──► Alerts (if threshold crossed)
```

---

## External Integrations

### 1. PostgreSQL (Primary Storage)

```
┌─────────────────────────────────────────────────────────┐
│                     PostgreSQL                           │
│                                                          │
│  Tables:                                                 │
│  ├─ cynic_judgments      (Q-Score, verdict, item)       │
│  ├─ cynic_knowledge      (digests, patterns, FTS)       │
│  ├─ cynic_feedback       (learning data)                │
│  ├─ cynic_sessions       (user sessions)                │
│  ├─ cynic_patterns       (detected patterns)            │
│  ├─ cynic_library_cache  (doc cache)                    │
│  ├─ cynic_ecosystem_docs (pre-loaded docs)              │
│  └─ cynic_poj_blocks     (blockchain)                   │
│                                                          │
│  Connection: CYNIC_DATABASE_URL                          │
│  Render: oregon-postgres.render.com                      │
└─────────────────────────────────────────────────────────┘
```

### 2. Redis (Session Cache)

```
┌─────────────────────────────────────────────────────────┐
│                       Redis                              │
│                                                          │
│  Keys:                                                   │
│  ├─ cynic:session:{id}     (session data)               │
│  ├─ cynic:user:{id}        (user sessions)              │
│  ├─ cynic:cache:{key}      (general cache)              │
│  └─ cynic:lock:{resource}  (distributed locks)          │
│                                                          │
│  Connection: CYNIC_REDIS_URL                             │
└─────────────────────────────────────────────────────────┘
```

### 3. Context7 (Documentation Source)

```
┌─────────────────────────────────────────────────────────┐
│                      Context7                            │
│                                                          │
│  Integration via:                                        │
│  ├─ MCP tool: context7.resolve-library-id               │
│  └─ MCP tool: context7.query-docs                       │
│                                                          │
│  CYNIC caches results in:                                │
│  ├─ LibrarianService (cynic_library_cache)              │
│  └─ Memory cache (fallback)                             │
│                                                          │
│  Libraries tracked:                                      │
│  ├─ /solana-labs/solana-web3.js                         │
│  ├─ /vercel/next.js                                     │
│  ├─ /project-serum/anchor                               │
│  └─ ... ecosystem libraries                              │
└─────────────────────────────────────────────────────────┘
```

### 4. Prometheus/Grafana (Monitoring)

```
┌─────────────────────────────────────────────────────────┐
│                   Prometheus                             │
│                                                          │
│  Scrape endpoint: GET /metrics                           │
│                                                          │
│  Metrics exposed:                                        │
│  ├─ cynic_judgments_total{verdict}                      │
│  ├─ cynic_avg_q_score                                   │
│  ├─ cynic_active_sessions                               │
│  ├─ cynic_library_cache_hit_rate                        │
│  ├─ cynic_poj_chain_height                              │
│  ├─ cynic_integrator_drifts_critical                    │
│  └─ cynic_uptime_seconds                                │
│                                                          │
│  Dashboard: GET /dashboard (built-in HTML)               │
└─────────────────────────────────────────────────────────┘
```

---

## Cross-Project Integration (Integrator)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ECOSYSTEM PROJECTS                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  /workspaces/
  │
  ├── CYNIC-new/          ◄─── CANONICAL (core)
  │   ├── packages/
  │   │   ├── core/       ◄─── PHI constants, types
  │   │   ├── mcp/        ◄─── MCP server (this package)
  │   │   ├── node/       ◄─── CYNICJudge, AgentManager
  │   │   └── persistence/◄─── Repositories
  │   └── CLAUDE.md
  │
  ├── HolDex/             ◄─── CANONICAL for harmony.js
  │   ├── src/shared/
  │   │   └── harmony.js  ◄─── φ formulas (TRACKED)
  │   └── CLAUDE.md
  │
  ├── GASdf/              ◄─── MIRROR
  │   ├── src/shared/
  │   │   └── harmony.js  ◄─── Should match HolDex (TRACKED)
  │   └── CLAUDE.md
  │
  ├── asdf-brain/         ◄─── MIRROR
  │   ├── src/shared/
  │   │   └── harmony.js  ◄─── Should match HolDex (TRACKED)
  │   └── CLAUDE.md
  │
  └── asdfasdfa-ecosystem/◄─── META
      └── CLAUDE.md


  ┌─────────────────────────────────────────────────────────┐
  │              IntegratorService Tracking                  │
  │                                                          │
  │  Shared Module: harmony.js                               │
  │  ────────────────────────                                │
  │  Canonical: HolDex/src/shared/harmony.js                 │
  │  Mirrors:                                                │
  │    - GASdf/src/shared/harmony.js                         │
  │    - asdf-brain/src/shared/harmony.js                    │
  │                                                          │
  │  Drift Detection:                                        │
  │    - Hash comparison (SHA-256)                           │
  │    - Export verification                                 │
  │    - Missing file detection                              │
  │                                                          │
  │  Sync Suggestions:                                       │
  │    - cp "{canonical}" "{mirror}"                         │
  │    - Priority: high/medium/low                           │
  └─────────────────────────────────────────────────────────┘
```

---

## MCP Client Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Claude Code                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ JSON-RPC 2.0 over stdio
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CYNIC MCP Server                                      │
│                                                                              │
│  Available as brain_* tools:                                                 │
│                                                                              │
│  Claude: "Let me judge this code quality"                                    │
│       └──► brain_cynic_judge({ item: { type: "code", content: "..." } })    │
│                                                                              │
│  Claude: "Show me the metrics"                                               │
│       └──► brain_metrics({ action: "prometheus" })                          │
│                                                                              │
│  Claude: "Check for module drift"                                            │
│       └──► brain_integrator({ action: "check" })                            │
│                                                                              │
│  Claude: "What's the PoJ chain height?"                                      │
│       └──► brain_poj_chain({ action: "head" })                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CYNIC_DATABASE_URL` | PostgreSQL connection string | No (fallback to memory) |
| `CYNIC_REDIS_URL` | Redis connection string | No (fallback to memory) |
| `CYNIC_DATA_DIR` | File-based fallback directory | No |
| `CYNIC_MCP_MODE` | Transport: "stdio" or "http" | No (default: stdio) |
| `CYNIC_MCP_PORT` | HTTP port (http mode only) | No (default: 3000) |
| `CYNIC_LOG_LEVEL` | Logging verbosity | No (default: info) |

---

## Event System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVENTS                                               │
└─────────────────────────────────────────────────────────────────────────────┘

  IntegratorService
  ├─ 'initialized'     → Service ready
  ├─ 'drift'           → Drifts detected (array of drifts)
  └─ 'shutdown'        → Service stopping

  MetricsService
  ├─ 'alert'           → New alert triggered
  └─ 'alert_cleared'   → Alert acknowledged

  PoJChainManager
  └─ (implicit)        → Block created (logged to stderr)

  EcosystemService
  ├─ 'initialized'     → Docs loaded
  └─ 'refresh'         → Docs refreshed
```

---

## Security Considerations

1. **Session Isolation**: Each user's data is isolated by `user_id` and `session_id`
2. **No Secrets in Items**: Items judged should not contain API keys or passwords
3. **Guardian Agent**: Blocks dangerous operations (file deletion, etc.)
4. **Chain Integrity**: PoJ blocks are hash-linked and verified at startup
5. **Rate Limiting**: Not implemented yet (Phase 10+ consideration)

---

*Generated by CYNIC - κυνικός*
