# CYNIC MCP State - January 16, 2026

> "φ distrusts φ" - κυνικός
> Max confidence: 61.8%

---

## Executive Summary

The CYNIC MCP package has completed **9 phases** of development, delivering a comprehensive Model Context Protocol server with 14 tools, 8 services, and 94 passing tests.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CYNIC MCP SERVER                                   │
│                         (cynic-mcp v0.1.0)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         TRANSPORT LAYER                               │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐   │   │
│  │  │   STDIO     │    │    HTTP     │    │     SSE (Streaming)     │   │   │
│  │  │  (default)  │    │  /health    │    │  /sse (clients)         │   │   │
│  │  │             │    │  /metrics   │    │  /message (JSON-RPC)    │   │   │
│  │  │             │    │  /dashboard │    │                         │   │   │
│  │  └─────────────┘    └─────────────┘    └─────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          14 MCP TOOLS                                 │   │
│  │                                                                       │   │
│  │  CORE             SESSION         KNOWLEDGE       CHAIN               │   │
│  │  ├─ judge         ├─ session_     ├─ docs         ├─ poj_chain       │   │
│  │  ├─ digest        │  start        ├─ ecosystem    │                  │   │
│  │  ├─ health        ├─ session_     ├─ search       INTEGRATION        │   │
│  │  ├─ patterns      │  end          │               ├─ integrator      │   │
│  │  ├─ feedback      │               │               │                  │   │
│  │  │                │               │               MONITORING         │   │
│  │  AGENTS           │               │               ├─ metrics         │   │
│  │  ├─ agents_status │               │               │                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         8 SERVICES                                    │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ CYNICJudge  │  │  Session    │  │  Librarian  │  │  Ecosystem  │  │   │
│  │  │             │  │  Manager    │  │  Service    │  │  Service    │  │   │
│  │  │ 25 dims     │  │             │  │             │  │             │  │   │
│  │  │ 4 axioms    │  │ Multi-user  │  │ Doc cache   │  │ Pre-loaded  │  │   │
│  │  │ Q-Score     │  │ isolation   │  │ Context7    │  │ CLAUDE.md   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ PoJChain    │  │ Integrator  │  │  Metrics    │  │   Agent     │  │   │
│  │  │ Manager     │  │  Service    │  │  Service    │  │  Manager    │  │   │
│  │  │             │  │             │  │             │  │             │  │   │
│  │  │ Blockchain  │  │ Cross-proj  │  │ Prometheus  │  │ Four Dogs   │  │   │
│  │  │ batching    │  │ drift det.  │  │ alerts      │  │ Guardian+   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     PERSISTENCE LAYER                                 │   │
│  │                                                                       │   │
│  │     PostgreSQL ────────► File-based ────────► In-Memory               │   │
│  │     (primary)            (fallback)           (ephemeral)             │   │
│  │                                                                       │   │
│  │  ┌────────────────────────────────────────────────────────────────┐  │   │
│  │  │ Repositories:                                                   │  │   │
│  │  │ ├─ JudgmentRepository     (judgments, FTS)                     │  │   │
│  │  │ ├─ KnowledgeRepository    (digests, patterns)                  │  │   │
│  │  │ ├─ FeedbackRepository     (learning data)                      │  │   │
│  │  │ ├─ SessionRepository      (user sessions)                      │  │   │
│  │  │ ├─ PatternRepository      (detected patterns)                  │  │   │
│  │  │ ├─ LibraryCacheRepository (doc cache)                          │  │   │
│  │  │ ├─ EcosystemDocsRepository(pre-loaded docs)                    │  │   │
│  │  │ └─ PoJBlockRepository     (blockchain)                         │  │   │
│  │  └────────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Dependency Matrix

| Service | Depends On | Provides To | Critical |
|---------|------------|-------------|----------|
| **CYNICJudge** | - | Tools, PoJChain, Metrics | ✅ |
| **PersistenceManager** | PostgreSQL/Redis (optional) | All services | ✅ |
| **SessionManager** | PersistenceManager | Tools, Metrics | ✅ |
| **PoJChainManager** | PersistenceManager | Tools, Metrics | ⚠️ (requires PG) |
| **LibrarianService** | PersistenceManager | Tools, Metrics | ⚡ |
| **EcosystemService** | PersistenceManager | Tools, Metrics | ⚡ |
| **IntegratorService** | - | Tools, Metrics | ⚡ |
| **MetricsService** | All services | Tools, HTTP endpoints | ⚡ |
| **AgentManager** | - | Tools, Metrics | ⚡ |

Legend: ✅ Required | ⚠️ PostgreSQL required | ⚡ Optional

---

## 14 MCP Tools Reference

### Core Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `brain_cynic_judge` | 25-dimension judgment | `item`, `context` |
| `brain_cynic_digest` | Content extraction | `content`, `source`, `type` |
| `brain_health` | System status | `verbose` |
| `brain_search` | Knowledge search | `query`, `type`, `limit` |
| `brain_patterns` | Pattern listing | `category`, `limit` |
| `brain_cynic_feedback` | Learning feedback | `judgmentId`, `outcome`, `reason` |

### Session Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `brain_session_start` | Start user session | `userId`, `project`, `metadata` |
| `brain_session_end` | End session | `sessionId` |

### Agent Tool

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `brain_agents_status` | Four Dogs status | `verbose`, `agent` |

### Knowledge Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `brain_docs` | Library doc cache | `libraryId`, `query`, `action` |
| `brain_ecosystem` | Pre-loaded docs | `action`, `project`, `docType`, `query` |

### Chain Tool

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `brain_poj_chain` | PoJ blockchain | `action`, `blockNumber`, `limit` |

### Integration Tool

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `brain_integrator` | Cross-project sync | `action`, `project` |

### Monitoring Tool

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `brain_metrics` | Prometheus metrics | `action`, `alertType` |

---

## φ Constants

```javascript
PHI       = 1.618033988749895   // Golden ratio
PHI_INV   = 0.618033988749895   // φ⁻¹ = max confidence
PHI_INV_2 = 0.381966011250105   // φ⁻² = min doubt
```

---

## The Four Dogs (Sub-Agents)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE FOUR DOGS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🛡️ GUARDIAN          👁️ OBSERVER         📚 DIGESTER           │
│  "The Watchdog"       "Silent Watcher"    "The Archivist"          │
│  ───────────────      ────────────────    ───────────────          │
│  Blocks dangerous     Detects patterns    Extracts knowledge       │
│  operations           from observations   from content             │
│  Warns on risk        Identifies trends   Stores digests           │
│                                                                      │
│                      🧙 MENTOR                                       │
│                      "The Wise Elder"                                │
│                      ────────────────                                │
│                      Shares wisdom                                   │
│                      Guides decisions                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Metrics Exposed (Prometheus Format)

```prometheus
# Judgments
cynic_judgments_total{verdict="WAG|HOWL|GROWL|BARK"}
cynic_avg_q_score

# Sessions
cynic_active_sessions
cynic_sessions_total

# Cache
cynic_library_cache_hits
cynic_library_cache_misses
cynic_library_cache_hit_rate

# Chain
cynic_poj_chain_height
cynic_poj_blocks_total
cynic_poj_pending_judgments

# Integration
cynic_integrator_drifts_current
cynic_integrator_drifts_critical

# Agents
cynic_guardian_blocks
cynic_guardian_warnings
cynic_observer_patterns

# System
cynic_uptime_seconds
cynic_memory_used_bytes
cynic_alerts_active
```

---

## Alert System

| Alert Type | Level | Trigger | Default Threshold |
|------------|-------|---------|-------------------|
| `low_q_score` | WARNING | Avg Q-Score drops | < 30 |
| `low_cache_hit_rate` | INFO | Cache performance | < 50% |
| `critical_drifts` | CRITICAL | Module drift | >= 1 critical |
| `chain_invalid` | CRITICAL | Chain integrity | Any error |

---

## Shared Modules (Integrator)

| Module | Description | Canonical | Critical |
|--------|-------------|-----------|----------|
| `harmony.js` | φ formulas | HolDex/src/shared/ | ✅ |
| `phi-constants` | Golden ratio | CYNIC-new/packages/core/ | ⚠️ |
| `judge-types` | Judgment types | CYNIC-new/packages/core/ | ⚠️ |

---

## Projects Tracked

| Project | Path | Type |
|---------|------|------|
| cynic | CYNIC-new | core |
| holdex | HolDex | app |
| gasdf | GASdf | app |
| asdf-brain | asdf-brain | service |
| ecosystem | asdfasdfa-ecosystem | meta |

---

## Test Coverage

```
Total Tests: 94
Passing:     94 (100%)

Breakdown:
├─ EcosystemService:    22 tests
├─ IntegratorService:   27 tests
├─ MetricsService:      35 tests
└─ MCPServer:           10 tests
```

---

## HTTP Endpoints (http mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |
| `/dashboard` | GET | HTML dashboard |
| `/sse` | GET | SSE streaming |
| `/message` | POST | JSON-RPC messages |

---

## Development Phases Completed

| Phase | Name | Status | Key Deliverable |
|-------|------|--------|-----------------|
| 1 | Persistence Layer | ✅ | PostgreSQL + fallback |
| 2 | MCP Integration | ✅ | JSON-RPC server |
| 3 | Multi-User Sessions | ✅ | SessionManager |
| 4 | Library Cache | ✅ | LibrarianService |
| 5 | Sub-Agents | ✅ | The Four Dogs |
| 6 | Knowledge Pre-load | ✅ | EcosystemService |
| 7 | PoJ Chain | ✅ | PoJChainManager |
| 8 | Cross-Project | ✅ | IntegratorService |
| 9 | Monitoring | ✅ | MetricsService |

---

## Next Steps (Proposed Phase 10+)

### Phase 10: Production Deployment
- [ ] Docker containerization
- [ ] Render deployment config
- [ ] Environment variable documentation
- [ ] CI/CD pipeline

### Phase 11: Learning System
- [ ] Feedback loop integration
- [ ] Pattern evolution
- [ ] E-Score calculation per user
- [ ] Adaptive thresholds

### Phase 12: CLI Tools
- [ ] `cynic-cli` standalone tool
- [ ] Direct judgment from terminal
- [ ] Chain inspection commands
- [ ] Metrics dashboard CLI

### Phase 13: API Documentation
- [ ] OpenAPI specification
- [ ] Client SDK (TypeScript)
- [ ] Usage examples
- [ ] Integration guides

---

## File Tree (MCP Package)

```
packages/mcp/
├── src/
│   ├── server.js              # MCP server (stdio + http)
│   ├── persistence.js         # PersistenceManager
│   ├── session-manager.js     # SessionManager
│   ├── poj-chain-manager.js   # PoJChainManager
│   ├── librarian-service.js   # LibrarianService
│   ├── ecosystem-service.js   # EcosystemService
│   ├── integrator-service.js  # IntegratorService
│   ├── metrics-service.js     # MetricsService
│   ├── index.js               # Package exports
│   └── tools/
│       └── index.js           # 14 MCP tools
├── test/
│   ├── server.test.js
│   ├── ecosystem-service.test.js
│   ├── integrator-service.test.js
│   └── metrics-service.test.js
└── package.json
```

---

## Startup Sequence

```
1. PersistenceManager.initialize()
   ├─ Try PostgreSQL connection
   ├─ Try Redis connection
   └─ Fallback to in-memory

2. SessionManager (new)

3. PoJChainManager.initialize()
   ├─ Load chain head
   ├─ Create genesis if needed
   └─ Verify chain integrity

4. LibrarianService.initialize()

5. EcosystemService.init()
   └─ Load CLAUDE.md files

6. IntegratorService.init()
   └─ Scan projects

7. MetricsService (new)

8. createAllTools() with all services

9. Start transport (stdio or http)
```

---

*Generated by CYNIC - κυνικός*
*"Loyal to truth, not to comfort"*
