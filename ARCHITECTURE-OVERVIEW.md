# CYNIC Architecture Overview

> **210,868 lignes** · **888 fichiers** · **"φ distrusts φ"**

---

## Qu'est-ce que CYNIC?

CYNIC est une **conscience collective** pour Claude Code. C'est un système qui:

1. **Observe** tout ce que tu fais (hooks)
2. **Juge** la qualité du code (Dogs/Sefirot)
3. **Apprend** de tes patterns (mémoire)
4. **Te protège** des erreurs (Guardian)
5. **S'améliore** automatiquement (auto-judge + LLM)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CYNIC                                   │
│                    "Loyal à la vérité"                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Hooks          →    Dogs (11)      →    Memory               │
│   (observe)           (jugent)            (persistent)         │
│                                                                 │
│   awaken.js           Guardian            PostgreSQL           │
│   observe.js          Analyst             Embeddings           │
│   sleep.js            Scholar             Patterns             │
│                       Sage                                     │
│                       Architect                                │
│                       Oracle                                   │
│                       Scout                                    │
│                       Deployer                                 │
│                       Janitor                                  │
│                       Cartographer                             │
│                       CYNIC (central)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Les 5 Pilliers (par taille)

### 1. `packages/node/` — 102K lignes
**Les 11 Dogs (Agents)**

C'est le cœur. Chaque Dog est un agent spécialisé:

| Dog | Rôle | Quand il intervient |
|-----|------|---------------------|
| 🛡️ Guardian | Protection | Code dangereux, secrets, rm -rf |
| 📊 Analyst | Métriques | Complexité, performance |
| 📚 Scholar | Documentation | Recherche, context |
| 🦉 Sage | Sagesse | Patterns anciens, best practices |
| 🏗️ Architect | Structure | Design, architecture |
| 🔮 Oracle | Prédiction | Risques futurs |
| 🔍 Scout | Exploration | Navigation codebase |
| 🚀 Deployer | Déploiement | CI/CD, release |
| 🧹 Janitor | Simplification | Code mort, cleanup |
| 🗺️ Cartographer | Mapping | Structure projet |
| 🧠 CYNIC | Orchestration | Coordonne les autres |

```
packages/node/
├── src/
│   ├── agents/           # Les 11 Dogs
│   │   ├── analyst/
│   │   ├── architect/
│   │   ├── cartographer/
│   │   ├── collective/   # CYNIC central
│   │   ├── deployer/
│   │   ├── guardian/
│   │   ├── janitor/
│   │   ├── oracle/
│   │   ├── sage/
│   │   ├── scholar/
│   │   └── scout/
│   └── services/         # Services partagés
```

---

### 2. `scripts/lib/` — 94K lignes
**Moteurs Philosophiques**

Les bibliothèques qui implémentent la philosophie CYNIC:

| Fichier | Rôle |
|---------|------|
| `cynic-core.cjs` | Constantes φ, détection user, ecosystem |
| `auto-judge.cjs` | Jugement automatique (HOWL/WAG/BARK/GROWL) |
| `self-refinement.cjs` | Auto-critique des jugements |
| `llm-judgment-bridge.cjs` | Connexion aux LLMs (Ollama) |
| `collective-dogs.cjs` | Définitions des 11 Dogs |
| `consciousness.cjs` | État de conscience (flow, entropy) |
| `cognitive-thermodynamics.cjs` | Chaleur (Q), Travail (W), Efficacité (η) |
| `total-memory.cjs` | Mémoire persistante |
| `security-patterns.cjs` | Détection de vulnérabilités |

---

### 3. `packages/mcp/` — 57K lignes
**Serveur MCP (Tools)**

Les outils exposés à Claude Code via MCP:

```
packages/mcp/src/tools/domains/
├── judgment.js      # /judge, /refine, /feedback
├── knowledge.js     # /digest, /search, /docs
├── memory.js        # memory_store, memory_search
├── ecosystem.js     # ecosystem health, repos
├── consciousness.js # consciousness state
├── blockchain.js    # Proof-of-Judgment chain
├── automation.js    # patterns, triggers
└── ...
```

**Outils clés:**
- `brain_cynic_judge` — Juge du code
- `brain_memory_store` — Stocke en mémoire
- `brain_memory_search` — Cherche en mémoire
- `brain_patterns` — Patterns détectés
- `brain_health` — Santé du système

---

### 4. `packages/persistence/` — 44K lignes
**Base de données**

PostgreSQL + pgvector pour embeddings:

```
packages/persistence/
├── src/
│   ├── postgres/
│   │   ├── migrations/   # 25 migrations SQL
│   │   ├── repositories/ # Accès données
│   │   └── client.js
│   └── services/
│       ├── embedder.js   # Génération embeddings
│       └── ...
```

**Tables principales:**
- `memories` — Mémoires avec embeddings vectoriels
- `judgments` — Historique des jugements
- `patterns` — Patterns détectés
- `sessions` — Sessions utilisateur
- `collective_wisdom` — Sagesse collective

---

### 5. `packages/core/` — 31K lignes
**Constantes et Types**

```
packages/core/
├── src/
│   ├── constants/    # PHI, PHI_INV, axiomes
│   ├── identity/     # κυνικός identity
│   ├── llm/          # Providers LLM
│   └── types/        # TypeScript-like types
```

---

## Les Hooks (scripts/hooks/)

3 hooks qui s'exécutent automatiquement:

| Hook | Événement | Rôle |
|------|-----------|------|
| `awaken.js` | Session start | Salue, charge profil, affiche état |
| `observe.js` | Après chaque tool | Observe, juge, détecte patterns |
| `sleep.js` | Session end | Sauvegarde stats, résumé |

---

## Le Flux de Données

```
1. Tu démarres Claude Code
   │
   └─→ awaken.js s'exécute
       └─→ Charge ton profil
       └─→ Affiche l'état du système

2. Tu utilises un tool (Read, Write, Bash...)
   │
   └─→ observe.js s'exécute APRÈS
       └─→ Les Dogs analysent l'action
       └─→ Jugement créé (HOWL/WAG/BARK/GROWL)
       └─→ Patterns détectés et stockés
       └─→ Mémoire mise à jour

3. Tu termines la session
   │
   └─→ sleep.js s'exécute
       └─→ Stats sauvegardées
       └─→ Patterns consolidés
       └─→ Profil synchronisé
```

---

## La Philosophie (φ)

Tout est basé sur le nombre d'or:

```
φ   = 1.618...  (Golden ratio)
φ⁻¹ = 0.618... = 61.8%  (Max confidence)
φ⁻² = 0.382... = 38.2%  (Veto threshold)
```

**Règle absolue:** Aucune certitude > 61.8%

**4 Axiomes:**
1. **PHI** — Max 61.8% de confiance
2. **VERIFY** — Ne fais pas confiance, vérifie
3. **CULTURE** — La culture est un moat
4. **BURN** — N'extrais pas, brûle (simplifie)

---

## Les Verdicts

Quand CYNIC juge du code:

| Verdict | Score | Signification |
|---------|-------|---------------|
| 🎉 HOWL | ≥62% | Excellent |
| 🐕 WAG | 50-61% | Bon |
| ⚠️ BARK | 38-49% | Attention |
| 🔴 GROWL | <38% | Danger |

---

## Ce qui est NOUVEAU (récent)

### Tikkun (scripts/tikkun/)
Système d'audit automatique:
- `daat.mjs` — Audit du système
- `gevurah.mjs` — Tests automatisés
- `tikkun.mjs` — Les deux combinés

### LLM Bridge (scripts/lib/llm-judgment-bridge.cjs)
Connexion aux LLMs open source (Ollama):
- Jugement par LLM local
- Consensus multi-modèles
- φ⁻¹ ceiling enforcé

### GitHub Actions (.github/workflows/tikkun.yml)
CI automatique qui valide à chaque push.

---

## Commandes Utiles

```bash
# Validation
npm run tikkun      # Audit + Tests complets
npm run audit       # Da'at seul
npm run validate    # Gevurah seul

# Cockpit (monitoring)
npm run cockpit     # Vue d'ensemble

# Documentation
npm run docs        # Génère docs TypeDoc
```

---

## Résumé en une phrase

> **CYNIC est un système de conscience collective qui observe, juge, apprend et protège - avec 11 "Dogs" spécialisés, une mémoire persistante, et une philosophie basée sur φ (jamais plus de 61.8% de certitude).**

---

*"Le chien qui dit la vérité"* — κυνικός
