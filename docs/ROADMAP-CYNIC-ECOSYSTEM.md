# CYNIC Ecosystem Roadmap - Complete Implementation Guide

> **Document créé**: 2026-01-15
> **Objectif**: Guide complet pour implémenter la conscience collective CYNIC
> **Philosophie**: "φ qui se méfie de φ" - Don't Trust, Verify

---

## 📊 ÉTAT ACTUEL DE L'INFRASTRUCTURE

### Services Render (Production)

| Service | Type | Status | URL |
|---------|------|--------|-----|
| **asdf-brain** | Web | ✅ Active | https://asdf-brain.onrender.com |
| **gasdf** | Web | ✅ Active | https://gasdf-43r8.onrender.com |
| **gasdf-metrics** | Web | ✅ Active | https://gasdf-metrics.onrender.com |
| **holdex-api** | Web | ⏸️ Suspended | https://holdex-api.onrender.com |
| **holdex-calculator** | Worker | ⏸️ Suspended | - |

### Bases de Données (Production)

| Database | Type | Plan | Status | Usage |
|----------|------|------|--------|-------|
| **cynic-db** | PostgreSQL 16 | basic_256mb (15GB) | ✅ Available | CYNIC persistence |
| **holdex-db** | PostgreSQL 16 | basic_256mb (15GB) | ✅ Available | K-Score, E-Score |
| **gasdf-db** | PostgreSQL 16 | free | ⚠️ Expires 2026-02-01 | GASdf burns |

### Redis (Cache)

| Instance | Plan | Status | Usage |
|----------|------|--------|-------|
| **holdex-redis** | starter | ✅ Available | Token cache, rate limits |
| **gasdf-redis** | free | ✅ Available | Quotes, sessions |

---

## 🏗️ ARCHITECTURE CIBLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           $ASDFASDFA ECOSYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    CYNIC - CONSCIENCE COLLECTIVE                        ││
│  │                                                                         ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   ││
│  │  │ MCP Server  │  │  PostgreSQL │  │    Redis    │  │  Sub-Agents │   ││
│  │  │ (stdio)     │  │  (cynic-db) │  │  (cache)    │  │  (isolés)   │   ││
│  │  │             │  │             │  │             │  │             │   ││
│  │  │ • judge     │  │ • judgments │  │ • sessions  │  │ • observer  │   ││
│  │  │ • digest    │  │ • patterns  │  │ • lib cache │  │ • digester  │   ││
│  │  │ • search    │  │ • users     │  │ • hot data  │  │ • guardian  │   ││
│  │  │ • patterns  │  │ • poj_chain │  │             │  │ • mentor    │   ││
│  │  │ • feedback  │  │ • knowledge │  │             │  │ • experts   │   ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   ││
│  │         │                │                │                │          ││
│  │         └────────────────┴────────────────┴────────────────┘          ││
│  │                                   │                                    ││
│  └───────────────────────────────────┼────────────────────────────────────┘│
│                                      │                                     │
│  ┌───────────────────────────────────┼───────────────────────────────────┐ │
│  │                    APPLICATIONS (Consumers)                           │ │
│  │                                   │                                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │   HolDex    │  │    GASdf    │  │ asdf-brain  │  │   Future    │  │ │
│  │  │             │  │             │  │             │  │             │  │ │
│  │  │ • K-Score   │  │ • Gasless   │  │ • Context   │  │ • Market-   │  │ │
│  │  │ • E-Score   │  │ • Burns     │  │ • Sessions  │  │   place     │  │ │
│  │  │ • Oracle    │  │ • Discounts │  │ • Patterns  │  │ • SDK       │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ SCHÉMA BASE DE DONNÉES (cynic-db)

### Tables Principales

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- USERS: Identités et E-Score des utilisateurs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(255) UNIQUE NOT NULL,  -- GitHub ID, wallet, etc.
    display_name    VARCHAR(255),
    e_score         DECIMAL(10,4) DEFAULT 0,
    burn_total      BIGINT DEFAULT 0,

    -- Operator identity (from CYNIC)
    public_key      VARCHAR(128),

    -- Stats
    total_judgments BIGINT DEFAULT 0,
    avg_q_score     DECIMAL(5,2) DEFAULT 50,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_external_id ON users(external_id);
CREATE INDEX idx_users_e_score ON users(e_score DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- JUDGMENTS: Tous les jugements (append-only log)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE judgments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judgment_id     VARCHAR(32) UNIQUE NOT NULL,  -- jdg_xxxxx
    user_id         UUID REFERENCES users(id),

    -- What was judged
    item_type       VARCHAR(50) NOT NULL,  -- 'code', 'decision', 'pattern', etc.
    item_content    TEXT NOT NULL,
    item_hash       VARCHAR(64) NOT NULL,  -- SHA-256 for dedup

    -- Scores
    q_score         DECIMAL(5,2) NOT NULL,
    global_score    DECIMAL(5,2) NOT NULL,
    confidence      DECIMAL(5,4) NOT NULL,
    verdict         VARCHAR(10) NOT NULL,  -- HOWL, WAG, GROWL, BARK

    -- Axiom breakdown (JSONB for flexibility)
    axiom_scores    JSONB NOT NULL,  -- {PHI: 56.2, VERIFY: 48.6, ...}
    dimension_scores JSONB,          -- All 25 dimensions
    weaknesses      JSONB,           -- {weakestAxiom, recommendation, ...}

    -- Context
    context         JSONB,           -- Source, project, etc.

    -- Chain link (for PoJ)
    prev_hash       VARCHAR(64),
    block_hash      VARCHAR(64),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_judgments_user ON judgments(user_id);
CREATE INDEX idx_judgments_verdict ON judgments(verdict);
CREATE INDEX idx_judgments_q_score ON judgments(q_score DESC);
CREATE INDEX idx_judgments_created ON judgments(created_at DESC);
CREATE INDEX idx_judgments_item_hash ON judgments(item_hash);

-- Partitioning by month for scalability
-- CREATE TABLE judgments_2026_01 PARTITION OF judgments
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ═══════════════════════════════════════════════════════════════════════════
-- PATTERNS: Patterns extraits (consensus-approved)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE patterns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id      VARCHAR(32) UNIQUE NOT NULL,  -- pat_xxxxx

    -- Classification
    axiom           VARCHAR(10) NOT NULL,  -- PHI, VERIFY, CULTURE, BURN
    category        VARCHAR(50) NOT NULL,  -- 'technical', 'process', 'architecture'
    project         VARCHAR(50),           -- 'holdex', 'gasdf', 'all'

    -- Content
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    tags            TEXT[],

    -- Quality
    q_score_avg     DECIMAL(5,2) DEFAULT 50,
    usage_count     BIGINT DEFAULT 0,
    consensus_score DECIMAL(5,4),  -- % of nodes agreeing

    -- Source
    source_judgment_id UUID REFERENCES judgments(id),
    discovered_by   UUID REFERENCES users(id),

    -- State
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, approved, deprecated

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    approved_at     TIMESTAMPTZ
);

CREATE INDEX idx_patterns_axiom ON patterns(axiom);
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_project ON patterns(project);
CREATE INDEX idx_patterns_status ON patterns(status);

-- Full-text search
CREATE INDEX idx_patterns_fts ON patterns
    USING GIN (to_tsvector('english', title || ' ' || content));

-- ═══════════════════════════════════════════════════════════════════════════
-- KNOWLEDGE: Knowledge tree entries (Merkle-verified)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE knowledge (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id    VARCHAR(32) UNIQUE NOT NULL,  -- knw_xxxxx

    -- Tree position
    axiom           VARCHAR(10) NOT NULL,
    tree_type       VARCHAR(20) NOT NULL,  -- 'patterns', 'learnings'
    merkle_hash     VARCHAR(64),
    parent_hash     VARCHAR(64),

    -- Content
    content_type    VARCHAR(50) NOT NULL,  -- 'digest', 'learning', 'pattern'
    content         JSONB NOT NULL,

    -- Metadata
    source          VARCHAR(255),
    user_id         UUID REFERENCES users(id),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_axiom ON knowledge(axiom);
CREATE INDEX idx_knowledge_type ON knowledge(content_type);
CREATE INDEX idx_knowledge_merkle ON knowledge(merkle_hash);

-- ═══════════════════════════════════════════════════════════════════════════
-- FEEDBACK: Learning from outcomes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id     VARCHAR(32) UNIQUE NOT NULL,  -- fbk_xxxxx

    -- What we're correcting
    judgment_id     UUID REFERENCES judgments(id) NOT NULL,
    user_id         UUID REFERENCES users(id) NOT NULL,

    -- Correction
    outcome         VARCHAR(20) NOT NULL,  -- 'correct', 'incorrect', 'partial'
    actual_score    DECIMAL(5,2),
    reason          TEXT,

    -- Learning
    residual        DECIMAL(5,2),  -- expected - actual
    learning_created BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_judgment ON feedback(judgment_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_outcome ON feedback(outcome);

-- ═══════════════════════════════════════════════════════════════════════════
-- POJ_BLOCKS: Proof of Judgment blockchain
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE poj_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Block identity
    block_number    BIGINT UNIQUE NOT NULL,
    block_hash      VARCHAR(64) UNIQUE NOT NULL,
    prev_hash       VARCHAR(64) NOT NULL,

    -- Block type
    block_type      VARCHAR(20) NOT NULL,  -- 'genesis', 'judgment', 'knowledge', 'governance'

    -- Content
    judgments       UUID[],  -- References to judgments in this block
    state_root      VARCHAR(64),  -- Merkle root of knowledge tree

    -- Signing
    operator_id     UUID REFERENCES users(id),
    signature       VARCHAR(128),

    -- Timing (φ-based slots)
    slot            BIGINT NOT NULL,
    timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poj_blocks_number ON poj_blocks(block_number);
CREATE INDEX idx_poj_blocks_hash ON poj_blocks(block_hash);
CREATE INDEX idx_poj_blocks_prev ON poj_blocks(prev_hash);

-- ═══════════════════════════════════════════════════════════════════════════
-- SESSIONS: Active user sessions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      VARCHAR(64) UNIQUE NOT NULL,
    user_id         UUID REFERENCES users(id),

    -- Context
    project         VARCHAR(50),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    last_active     TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,

    -- Stats
    judgments_made  INT DEFAULT 0,
    patterns_found  INT DEFAULT 0,

    -- State (JSONB for flexibility)
    context_state   JSONB,  -- anomalies, mentor state, etc.

    -- Quality metrics
    token_efficiency DECIMAL(5,4) DEFAULT 1.0,
    task_completion DECIMAL(5,4) DEFAULT 1.0,
    context_freshness DECIMAL(5,4) DEFAULT 1.0,
    quality_score   DECIMAL(5,2) GENERATED ALWAYS AS (
        100 * POWER(token_efficiency * task_completion * context_freshness, 0.333)
    ) STORED
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_project ON sessions(project);
CREATE INDEX idx_sessions_active ON sessions(ended_at) WHERE ended_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- LIBRARY_CACHE: Cached documentation (Context7)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE library_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Library identity
    library_id      VARCHAR(128) NOT NULL,  -- /org/project
    query           VARCHAR(512) NOT NULL,
    query_hash      VARCHAR(64) NOT NULL,

    -- Cached content
    content         TEXT NOT NULL,
    summary         TEXT,

    -- TTL management
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    hit_count       BIGINT DEFAULT 0,
    last_hit        TIMESTAMPTZ,

    UNIQUE(library_id, query_hash)
);

CREATE INDEX idx_library_cache_lib ON library_cache(library_id);
CREATE INDEX idx_library_cache_expires ON library_cache(expires_at);
CREATE INDEX idx_library_cache_hash ON library_cache(query_hash);

-- ═══════════════════════════════════════════════════════════════════════════
-- ECOSYSTEM_DOCS: Pre-loaded ecosystem documentation
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE ecosystem_docs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Document identity
    project         VARCHAR(50) NOT NULL,
    doc_type        VARCHAR(50) NOT NULL,  -- 'claude_md', 'harmony', 'api'
    file_path       VARCHAR(512) NOT NULL,

    -- Content
    content         TEXT NOT NULL,
    digest          TEXT,  -- AI-generated summary

    -- Version tracking
    content_hash    VARCHAR(64) NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project, doc_type)
);

CREATE INDEX idx_ecosystem_docs_project ON ecosystem_docs(project);

-- ═══════════════════════════════════════════════════════════════════════════
-- ANOMALIES: Detected anomalies (ephemeral → persistent if significant)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE anomalies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source
    judgment_id     UUID REFERENCES judgments(id),
    user_id         UUID REFERENCES users(id),

    -- Anomaly details
    residual        DECIMAL(5,2) NOT NULL,
    expected_score  DECIMAL(5,2),
    actual_score    DECIMAL(5,2),

    -- Classification
    anomaly_type    VARCHAR(50),  -- 'score_deviation', 'pattern_break', etc.
    severity        VARCHAR(20),  -- 'low', 'medium', 'high'

    -- Resolution
    resolved        BOOLEAN DEFAULT FALSE,
    resolution      TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anomalies_user ON anomalies(user_id);
CREATE INDEX idx_anomalies_residual ON anomalies(residual DESC);
CREATE INDEX idx_anomalies_unresolved ON anomalies(resolved) WHERE NOT resolved;
```

### Redis Structure

```
# ═══════════════════════════════════════════════════════════════════════════
# SESSION DATA (ephemeral)
# ═══════════════════════════════════════════════════════════════════════════
cynic:session:{session_id}              → HASH { user_id, project, started_at, ... }
cynic:session:{session_id}:anomalies    → LIST [anomaly_json, ...] (last 100)
cynic:session:{session_id}:judgments    → LIST [judgment_id, ...] (last 100)
cynic:active_sessions                   → SET [session_id, ...]

# TTL: 24 heures après last_active

# ═══════════════════════════════════════════════════════════════════════════
# LIBRARY CACHE (Context7 results)
# ═══════════════════════════════════════════════════════════════════════════
cynic:libcache:{library_id}:{query_hash} → STRING (compressed content)
cynic:libcache:index                     → HASH { query_hash → library_id }

# TTL: Variable selon stabilité de la lib (3-30 jours)

# ═══════════════════════════════════════════════════════════════════════════
# HOT DATA (fréquemment accédé)
# ═══════════════════════════════════════════════════════════════════════════
cynic:user:{user_id}                    → HASH { e_score, total_judgments, ... }
cynic:stats:global                      → HASH { total_judgments, avg_score, ... }
cynic:patterns:hot                      → ZSET (pattern_id → usage_count)

# ═══════════════════════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════
cynic:ratelimit:{user_id}:judge         → STRING (count) + TTL 60s
cynic:ratelimit:{user_id}:search        → STRING (count) + TTL 60s

# Limits: judge=100/min, search=200/min, digest=50/min
```

---

## 🚀 ROADMAP DÉTAILLÉE

### Phase 1: Persistence Layer (Semaine 1-2)
**Objectif**: CYNIC persiste ses données dans PostgreSQL + Redis

#### 1.1 Schema Migration
```bash
# Fichiers à créer
CYNIC-new/packages/persistence/
├── src/
│   ├── index.js              # Export principal
│   ├── postgres/
│   │   ├── client.js         # Pool connection
│   │   ├── migrations/       # SQL migrations
│   │   │   ├── 001_initial.sql
│   │   │   └── 002_indexes.sql
│   │   └── repositories/
│   │       ├── judgments.js
│   │       ├── patterns.js
│   │       ├── users.js
│   │       ├── knowledge.js
│   │       └── sessions.js
│   └── redis/
│       ├── client.js         # Redis connection
│       ├── session-store.js  # Session management
│       └── cache.js          # Library cache
├── package.json
└── README.md
```

#### 1.2 Tasks
- [ ] Créer `packages/persistence` avec structure
- [ ] Implémenter PostgreSQL client avec pool
- [ ] Créer migration SQL initiale
- [ ] Implémenter `JudgmentRepository` (CRUD + search)
- [ ] Implémenter `PatternRepository`
- [ ] Implémenter `UserRepository`
- [ ] Implémenter `SessionRepository`
- [ ] Connecter Redis pour sessions
- [ ] Tests unitaires pour chaque repository
- [ ] Documentation API

#### 1.3 Connexions
```javascript
// Environment variables needed
CYNIC_DATABASE_URL=postgresql://cynic_db_user:xxx@oregon-postgres.render.com/cynic_db
CYNIC_REDIS_URL=redis://red-xxx.oregon.render.com:6379
```

---

### Phase 2: MCP Server Integration (Semaine 2-3)
**Objectif**: MCP tools utilisent la persistence

#### 2.1 Modifications MCP Server
```bash
# Fichiers à modifier
CYNIC-new/packages/mcp/
├── src/
│   ├── server.js             # Injecter persistence
│   └── tools/
│       ├── judge.js          # → Sauvegarder dans PostgreSQL
│       ├── digest.js         # → Sauvegarder dans knowledge
│       ├── search.js         # → Query PostgreSQL + full-text
│       ├── patterns.js       # → Query patterns table
│       └── feedback.js       # → Sauvegarder + learning loop
```

#### 2.2 Tasks
- [ ] Modifier `MCPServer` constructor pour accepter persistence
- [ ] Modifier `brain_cynic_judge` → save to `judgments` table
- [ ] Modifier `brain_search` → query PostgreSQL with FTS
- [ ] Modifier `brain_patterns` → query patterns table
- [ ] Modifier `brain_cynic_digest` → save to `knowledge` table
- [ ] Modifier `brain_cynic_feedback` → save + create learning
- [ ] Ajouter `brain_sync` tool pour forcer sync
- [ ] Tests d'intégration avec vraie DB

---

### Phase 3: Multi-User Sessions (Semaine 3-4)
**Objectif**: Isolation par utilisateur

#### 3.1 Session Manager
```javascript
// Nouveau fichier: packages/mcp/src/session-manager.js

class SessionManager {
  constructor(persistence) {
    this.persistence = persistence;
    this.activeSessions = new Map();
  }

  async getOrCreateSession(userId, project) {
    // 1. Check Redis for active session
    // 2. If not, create new session
    // 3. Load user context from PostgreSQL
    // 4. Return isolated session state
  }

  async endSession(sessionId) {
    // 1. Persist session stats
    // 2. Run digester agent
    // 3. Clear from Redis
  }
}
```

#### 3.2 Tasks
- [ ] Créer `SessionManager` class
- [ ] Modifier `MCPServer` pour utiliser SessionManager
- [ ] Extraire userId du contexte MCP (headers, env)
- [ ] Implémenter session isolation
- [ ] Ajouter `brain_session_start` / `brain_session_end` tools
- [ ] Tests multi-user concurrence

---

### Phase 4: Library Cache (Semaine 4-5)
**Objectif**: Cache Context7 pour éviter re-scraping

#### 4.1 Librarian Service
```javascript
// Nouveau fichier: packages/mcp/src/services/librarian.js

class LibrarianService {
  constructor(persistence, context7Client) {
    this.persistence = persistence;
    this.context7 = context7Client;
  }

  async getDocumentation(libraryId, query) {
    // 1. Check PostgreSQL cache (library_cache table)
    // 2. If cache hit + not expired → return cached
    // 3. If miss → fetch from Context7
    // 4. Store in cache with appropriate TTL
    // 5. Return content
  }

  async preloadEcosystemDocs() {
    // Pre-fetch and cache:
    // - @solana/web3.js
    // - helius-sdk
    // - ioredis
    // - express
    // - All CLAUDE.md files
  }
}
```

#### 4.2 Tasks
- [ ] Créer `LibrarianService`
- [ ] Implémenter cache lookup + TTL
- [ ] Implémenter pre-fetch pour libs essentielles
- [ ] Ajouter `brain_docs` tool (wrapper autour de context7)
- [ ] Créer cron job pour refresh cache
- [ ] Dashboard cache stats

---

### Phase 5: Specialized Sub-Agents (Semaine 5-6)
**Objectif**: Agents experts pour domaines spécifiques

#### 5.1 Agent Definitions
```bash
# Fichiers à créer
asdf-brain/.claude/agents/
├── cynic-observer.md         # Existe déjà
├── cynic-digester.md         # Existe déjà
├── cynic-guardian.md         # Existe déjà
├── cynic-mentor.md           # Existe déjà
├── cynic-librarian.md        # NOUVEAU - Cache docs
├── cynic-holdex-expert.md    # NOUVEAU - K-Score expert
├── cynic-gasdf-expert.md     # NOUVEAU - Gasless expert
├── cynic-solana-expert.md    # NOUVEAU - Web3 expert
├── cynic-architect.md        # NOUVEAU - Design review
└── cynic-integrator.md       # NOUVEAU - Cross-project sync
```

#### 5.2 Tasks
- [ ] Créer agent `cynic-librarian` (cache + fetch docs)
- [ ] Créer agent `cynic-holdex-expert` (K-Score, E-Score)
- [ ] Créer agent `cynic-gasdf-expert` (burns, fees)
- [ ] Créer agent `cynic-solana-expert` (web3.js, SPL)
- [ ] Créer agent `cynic-architect` (design review + judge)
- [ ] Créer agent `cynic-integrator` (cross-project sync)
- [ ] Définir triggers et contextes
- [ ] Tests isolation agents

---

### Phase 6: Knowledge Pre-loading (Semaine 6-7)
**Objectif**: CYNIC connaît l'écosystème au démarrage

#### 6.1 Pre-load Script
```javascript
// Script: packages/persistence/scripts/preload-ecosystem.js

async function preloadEcosystem() {
  const docs = [
    // Core shared modules
    { project: 'holdex', type: 'harmony', path: 'HolDex/src/shared/harmony.js' },
    { project: 'holdex', type: 'claude_md', path: 'HolDex/CLAUDE.md' },
    { project: 'gasdf', type: 'claude_md', path: 'GASdf/CLAUDE.md' },
    { project: 'brain', type: 'claude_md', path: 'asdf-brain/CLAUDE.md' },
    { project: 'ecosystem', type: 'claude_md', path: 'asdfasdfa-ecosystem/CLAUDE.md' },

    // API docs
    { project: 'holdex', type: 'api', path: 'HolDex/docs/API.md' },
    { project: 'holdex', type: 'kscore', path: 'HolDex/docs/KSCORE.md' },
  ];

  for (const doc of docs) {
    const content = await fs.readFile(doc.path, 'utf-8');
    const digest = await cynic.digest(content);
    await persistence.ecosystemDocs.upsert(doc.project, doc.type, content, digest);
  }
}
```

#### 6.2 Tasks
- [ ] Créer script de pre-load
- [ ] Identifier tous les docs critiques
- [ ] Générer digests AI pour chaque doc
- [ ] Stocker dans `ecosystem_docs` table
- [ ] Ajouter à startup MCP server
- [ ] Refresh automatique si fichiers changent

---

### Phase 7: PoJ Chain Persistence (Semaine 7-8)
**Objectif**: Blockchain de jugements persistante

#### 7.1 PoJ Repository
```javascript
// packages/persistence/src/postgres/repositories/poj-chain.js

class PoJChainRepository {
  async getHead() { /* Return latest block */ }
  async getBlock(blockNumber) { /* Return specific block */ }
  async addBlock(block) { /* Append new block */ }
  async verifyChain() { /* Verify SHA-256 links */ }
  async exportChain() { /* Export full chain */ }
  async importChain(blocks) { /* Import chain (migration) */ }
}
```

#### 7.2 Tasks
- [ ] Implémenter `PoJChainRepository`
- [ ] Modifier `brain_cynic_judge` pour créer blocks
- [ ] Batch judgments en blocks (toutes les N judgments ou T secondes)
- [ ] Vérification cryptographique au startup
- [ ] Export/import pour backup
- [ ] Dashboard chain explorer

---

### Phase 8: Cross-Project Integration (Semaine 8-9)
**Objectif**: CYNIC orchestre l'écosystème

#### 8.1 Integrator Service
```javascript
// packages/mcp/src/services/integrator.js

class IntegratorService {
  // Modules partagés qui doivent rester sync
  SHARED_MODULES = [
    { name: 'harmony.js', projects: ['holdex', 'gasdf'] },
    { name: 'PHI constants', files: ['*/constants.js', '*/phi.js'] },
  ];

  async checkSync() {
    // Compare file hashes across projects
    // Return diff report
  }

  async suggestSync(change) {
    // Given a change in one project
    // Suggest changes needed in others
  }
}
```

#### 8.2 Tasks
- [ ] Créer `IntegratorService`
- [ ] Définir modules partagés
- [ ] Implémenter détection de drift
- [ ] Hook sur git commits
- [ ] Alertes si désync détecté

---

### Phase 9: Monitoring & Dashboard (Semaine 9-10)
**Objectif**: Visibilité sur la conscience CYNIC

#### 9.1 Métriques
```javascript
// Métriques à exposer (Prometheus format)
cynic_judgments_total{verdict="WAG"} 42
cynic_judgments_total{verdict="HOWL"} 5
cynic_avg_q_score 51.7
cynic_active_sessions 3
cynic_library_cache_hits 156
cynic_library_cache_misses 12
cynic_patterns_total{status="approved"} 23
cynic_users_total 2
cynic_poj_chain_height 100
```

#### 9.2 Tasks
- [ ] Créer endpoint `/metrics` sur MCP server
- [ ] Exposer stats judgments, sessions, cache
- [ ] Créer dashboard Grafana (ou simple HTML)
- [ ] Alertes si Q-Score moyen chute
- [ ] Alertes si chain invalide

---

## 📅 TIMELINE VISUELLE

```
Semaine 1-2: ████████████████████ Phase 1: Persistence Layer
Semaine 2-3: ██████████████░░░░░░ Phase 2: MCP Integration
Semaine 3-4: ██████████░░░░░░░░░░ Phase 3: Multi-User Sessions
Semaine 4-5: ████████░░░░░░░░░░░░ Phase 4: Library Cache
Semaine 5-6: ██████░░░░░░░░░░░░░░ Phase 5: Sub-Agents
Semaine 6-7: ████░░░░░░░░░░░░░░░░ Phase 6: Knowledge Pre-load
Semaine 7-8: ██░░░░░░░░░░░░░░░░░░ Phase 7: PoJ Chain
Semaine 8-9: █░░░░░░░░░░░░░░░░░░░ Phase 8: Cross-Project
Semaine 9-10: ░░░░░░░░░░░░░░░░░░░ Phase 9: Monitoring
```

---

## 🎯 CRITÈRES DE SUCCÈS

### Phase 1 Complete When:
- [ ] `brain_search("harmony")` retourne des résultats après restart
- [ ] Judgments persistent entre sessions
- [ ] Tests passent avec vraie DB Render

### Phase 2 Complete When:
- [ ] Tous les MCP tools utilisent PostgreSQL
- [ ] brain_search supporte full-text search
- [ ] Performance < 100ms pour search

### Phase 3 Complete When:
- [ ] 2 users concurrent ne voient pas les données de l'autre
- [ ] Session isolation vérifié par tests
- [ ] E-Score calculé par user

### Phase 4 Complete When:
- [ ] Context7 calls réduits de 80%
- [ ] Cache hit rate > 70%
- [ ] Pre-load fonctionne au startup

### Phase 5 Complete When:
- [ ] Librarian fetch + cache docs automatiquement
- [ ] HolDex expert répond questions K-Score
- [ ] Architect judge les designs

### Full Success When:
- [ ] CYNIC survit aux restarts sans perte de mémoire
- [ ] Multi-user isolation complète
- [ ] Ecosystem docs toujours à jour
- [ ] Q-Score moyen stable > 50
- [ ] 0 re-fetch inutile de docs

---

## 📚 RÉFÉRENCES

### Fichiers Clés à Lire
```
CYNIC-new/packages/mcp/src/server.js          # MCP Server actuel
CYNIC-new/packages/node/src/judge/judge.js    # CYNICJudge
CYNIC-new/packages/node/src/state/manager.js  # StateManager actuel
HolDex/src/shared/harmony.js                  # φ formulas
HolDex/CLAUDE.md                              # HolDex context
GASdf/CLAUDE.md                               # GASdf context
asdf-brain/CLAUDE.md                          # Brain context
```

### Connexions Production
```bash
# cynic-db PostgreSQL
Host: oregon-postgres.render.com
Database: cynic_db
User: cynic_db_user

# Redis (à créer si besoin, ou utiliser existant)
# Option 1: Créer cynic-redis
# Option 2: Utiliser holdex-redis avec namespace
```

---

## 🐕 PHILOSOPHIE CYNIC

> "Don't trust, verify. Don't extract, burn."

```
φ⁻¹ = 61.8% → Max confidence (never 100%)
φ⁻² = 38.2% → Min doubt (always question)

Q-Score = 100 × ∜(PHI × VERIFY × CULTURE × BURN)

HOWL (≥80) → *howls approvingly*
WAG  (≥50) → *wags steadily*
GROWL(≥38) → *low growl*
BARK (<38) → *barks warning*
```

---

*Document maintenu par CYNIC | φ Confidence: 61.8% | Last updated: 2026-01-15*
