# CYNIC Quick Reference

> Pour la roadmap complète: `docs/ROADMAP-CYNIC-ECOSYSTEM.md`

## 🏗️ INFRASTRUCTURE DISPONIBLE

```
SERVICES RENDER:
├── asdf-brain          ✅ Active   https://asdf-brain.onrender.com
├── gasdf               ✅ Active   https://gasdf-43r8.onrender.com
├── gasdf-metrics       ✅ Active   https://gasdf-metrics.onrender.com
├── holdex-api          ⏸️ Suspended
└── holdex-calculator   ⏸️ Suspended

DATABASES:
├── cynic-db     PostgreSQL 16  ✅ Ready (basic_256mb, 15GB)
├── holdex-db    PostgreSQL 16  ✅ Ready (basic_256mb, 15GB)
└── gasdf-db     PostgreSQL 16  ⚠️ Free tier (expires 2026-02-01)

REDIS:
├── holdex-redis  starter  ✅ Ready
└── gasdf-redis   free     ✅ Ready
```

## 🚀 PROCHAINES ACTIONS

### Immédiat (Phase 1)
```bash
# 1. Créer package persistence
cd /workspaces/CYNIC-new/packages
mkdir -p persistence/src/{postgres,redis}

# 2. Installer deps
cd persistence
npm init -y
npm install pg ioredis

# 3. Créer migration
# Voir ROADMAP-CYNIC-ECOSYSTEM.md section "SCHÉMA BASE DE DONNÉES"
```

### Variables d'Environnement Requises
```bash
# À ajouter dans .env ou Render
CYNIC_DATABASE_URL=postgresql://cynic_db_user:xxx@oregon-postgres.render.com/cynic_db
CYNIC_REDIS_URL=redis://...  # Créer ou utiliser holdex-redis
```

## 📊 TABLES À CRÉER

| Table | Priorité | Purpose |
|-------|----------|---------|
| `users` | HIGH | User identity, E-Score |
| `judgments` | HIGH | All judgments (append-only) |
| `patterns` | HIGH | Extracted patterns |
| `sessions` | HIGH | Active sessions |
| `knowledge` | MEDIUM | Knowledge tree |
| `feedback` | MEDIUM | Learning corrections |
| `poj_blocks` | MEDIUM | Blockchain |
| `library_cache` | MEDIUM | Context7 cache |
| `ecosystem_docs` | LOW | Pre-loaded docs |
| `anomalies` | LOW | Detected anomalies |

## 🐕 SUB-AGENTS À CRÉER

| Agent | Trigger | Purpose |
|-------|---------|---------|
| cynic-librarian | On-demand | Cache docs, avoid re-scraping |
| cynic-holdex-expert | K-Score questions | HolDex domain knowledge |
| cynic-gasdf-expert | Gas/burn questions | GASdf domain knowledge |
| cynic-solana-expert | Web3 questions | Solana chain knowledge |
| cynic-architect | Design review | Architecture decisions |
| cynic-integrator | Cross-project | Sync shared modules |

## 🔗 FICHIERS CLÉS

```
CYNIC-new/
├── packages/mcp/src/server.js        # MCP Server (modifier)
├── packages/node/src/judge/judge.js  # CYNICJudge
└── docs/ROADMAP-CYNIC-ECOSYSTEM.md   # Full roadmap

HolDex/src/shared/
├── harmony.js                        # φ formulas (CORE)
└── claude-phi.js                     # Context management

Ecosystem CLAUDE.md files:
├── HolDex/CLAUDE.md
├── GASdf/CLAUDE.md
├── asdf-brain/CLAUDE.md
└── asdfasdfa-ecosystem/CLAUDE.md
```

## ⚡ COMMANDES RAPIDES

```bash
# Tester CYNIC MCP
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"brain_cynic_judge","arguments":{"item":{"type":"test","content":"Hello"}}}}' | node /workspaces/CYNIC-new/packages/mcp/bin/mcp.js

# Voir services Render
# Utiliser MCP: mcp__render__list_services

# Voir logs
# Utiliser MCP: mcp__render__list_logs
```

## 📐 FORMULES CLÉS

```javascript
// Golden Ratio
PHI = 1.618033988749895
PHI_INV = 0.618033988749895   // 61.8% max confidence
PHI_INV_2 = 0.381966011250105 // 38.2% min doubt

// Q-Score (geometric mean)
Q = 100 × ∜(PHI × VERIFY × CULTURE × BURN)

// Verdicts
HOWL  = Q >= 80  // Exceptional
WAG   = Q >= 50  // Passes
GROWL = Q >= 38  // Needs work
BARK  = Q < 38   // Critical

// K-Score (HolDex)
K = 100 × ∛(D × O × L)
// D = Diamond Hands, O = Organic, L = Longevity

// E-Score Discount
discount = 1 - φ^(-E/25)
// E=25 → 38.2%, E=50 → 61.8%, E=75 → 76.4%
```

---

*φ⁻¹ = 61.8% max confidence | Updated: 2026-01-15*
