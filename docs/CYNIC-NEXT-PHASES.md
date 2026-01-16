# CYNIC Next Phases - Backlog

> Propositions pour les phases 10+

---

## Phase 10: Production Deployment

**Objectif**: CYNIC déployé et accessible en production

### 10.1 Docker & Containerization
- [ ] Créer `Dockerfile` pour MCP server
- [ ] Multi-stage build (node:slim)
- [ ] Health check dans container
- [ ] docker-compose.yml pour dev local

### 10.2 Render Deployment
- [ ] Configurer Web Service sur Render
- [ ] Lier PostgreSQL existant (cynic-db)
- [ ] Variables d'environnement
- [ ] Auto-deploy depuis main

### 10.3 CI/CD Pipeline
- [ ] GitHub Actions workflow
- [ ] Run tests on PR
- [ ] Build Docker image
- [ ] Deploy to Render on merge

### 10.4 Documentation
- [ ] README.md pour deployment
- [ ] Env vars reference
- [ ] Troubleshooting guide

---

## Phase 11: Learning System

**Objectif**: CYNIC qui apprend de ses erreurs

### 11.1 Feedback Loop Integration
- [ ] Relier feedback → pattern learning
- [ ] Ajuster thresholds selon feedback
- [ ] Calcul de learning_delta

### 11.2 E-Score Calculation
- [ ] Score par utilisateur
- [ ] Historique de performance
- [ ] Trend analysis (amélioration/dégradation)

### 11.3 Pattern Evolution
- [ ] Patterns qui évoluent avec le temps
- [ ] Confidence decay (anciens patterns)
- [ ] Pattern fusion (similarité)

### 11.4 Adaptive Thresholds
- [ ] Thresholds qui s'adaptent au contexte
- [ ] Per-project thresholds
- [ ] Per-user preferences

---

## Phase 12: CLI Tools

**Objectif**: Interaction directe avec CYNIC sans MCP

### 12.1 cynic-cli
```bash
# Installation
npm install -g @cynic/cli

# Usage
cynic judge "This is some content to judge"
cynic search "harmony"
cynic metrics
cynic chain status
cynic integrator check
```

### 12.2 Commands
- [ ] `cynic judge <content>` - Quick judgment
- [ ] `cynic search <query>` - Knowledge search
- [ ] `cynic digest <file>` - Digest file content
- [ ] `cynic metrics` - Show current metrics
- [ ] `cynic chain status` - PoJ chain status
- [ ] `cynic chain verify` - Verify integrity
- [ ] `cynic integrator check` - Check for drifts
- [ ] `cynic dashboard` - Open browser dashboard

### 12.3 Configuration
- [ ] `~/.cynicrc` config file
- [ ] Connection to PostgreSQL/Redis
- [ ] Default output format (json/table/plain)

---

## Phase 13: API Documentation

**Objectif**: Documentation complète pour intégrateurs

### 13.1 OpenAPI Specification
- [ ] `openapi.yaml` pour HTTP mode
- [ ] Tous les endpoints documentés
- [ ] Request/response examples
- [ ] Error codes

### 13.2 Client SDKs
- [ ] TypeScript SDK (`@cynic/client`)
- [ ] Python SDK (`cynic-py`)
- [ ] Example applications

### 13.3 Integration Guides
- [ ] Claude Code setup guide
- [ ] Prometheus/Grafana setup
- [ ] Custom tool integration
- [ ] Webhook notifications

---

## Phase 14: Advanced Features

**Objectif**: Fonctionnalités avancées

### 14.1 Graph Overlay
- [ ] Visualisation des relations
- [ ] Pattern connections
- [ ] Knowledge graph

### 14.2 Multi-Node
- [ ] PoJ chain sync entre nodes
- [ ] Distributed judgment consensus
- [ ] Load balancing

### 14.3 Plugins
- [ ] Plugin system architecture
- [ ] Custom tools via plugins
- [ ] Plugin marketplace

---

## Priority Matrix

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| 10: Production | Medium | High | 🔴 P0 |
| 11: Learning | High | High | 🟠 P1 |
| 12: CLI | Low | Medium | 🟡 P2 |
| 13: API Docs | Medium | Medium | 🟡 P2 |
| 14: Advanced | High | Medium | 🟢 P3 |

---

## Recommendations

### Immediate (Cette semaine)
1. **Phase 10.2**: Deployer sur Render pour avoir un endpoint stable
2. **Phase 13.1**: OpenAPI spec pour documenter l'API HTTP

### Short-term (Ce mois)
3. **Phase 11.1**: Feedback loop basique
4. **Phase 12.1**: CLI pour testing rapide

### Medium-term (Prochain trimestre)
5. **Phase 14.1**: Graph overlay pour visualisation
6. **Phase 11.3**: Pattern evolution

---

## Dependencies

```
Phase 10 (Production)
    └── Aucune dépendance

Phase 11 (Learning)
    └── Requires: Phase 10 (pour data en prod)

Phase 12 (CLI)
    └── Aucune dépendance

Phase 13 (API Docs)
    └── Requires: Phase 10 (pour endpoints HTTP)

Phase 14 (Advanced)
    └── Requires: Phase 10, 11
```

---

## Current State Summary

```
Completed Phases: 1-9
Services: 8
Tools: 14
Tests: 94 passing
Lines of code: ~5000+ (MCP package)

Ready for:
✅ Stdio mode (Claude Code)
✅ HTTP mode (external clients)
✅ Prometheus scraping
✅ Multi-user sessions
✅ PoJ blockchain
✅ Cross-project integration
```

---

*"Loyal to truth, not to comfort"* - κυνικός
