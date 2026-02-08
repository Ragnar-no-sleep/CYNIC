# Pipeline Unifie CYNIC

> Les 12 pipelines sont UN seul flux de conscience.
> Ce document mappe la vision fractale a l'execution concrete.
> **Last verified: 2026-02-08** | Note: Now 5 axioms (+ FIDELITY), 36 dimensions (5x7+1).
> See `harmonized-structure.md` for the updated axiom/dimension spec.

---

## Vue d'Ensemble

```
                              ┌─────────┐
                              │ TIKKUN  │
                              │(Mission)│
                              └────┬────┘
                                   │
    ═══════════════════════════════╧═══════════════════════════════
                         PIPELINE UNIFIÉ CYNIC
    ═══════════════════════════════════════════════════════════════
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
    ┌─────────┐              ┌─────────┐              ┌─────────┐
    │PERCEVOIR│              │ PENSER  │              │  AGIR   │
    │ (Input) │──────────────│(Process)│──────────────│(Output) │
    └────┬────┘              └────┬────┘              └────┬────┘
         │                        │                        │
         ▼                        ▼                        ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                        APPRENDRE                             │
    │              (Feedback loop - Q-Learning)                    │
    └─────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                         ANCRER                               │
    │        (Solana, PostgreSQL, GitHub - Monde réel)             │
    └─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: PERCEVOIR (Input Pipeline)

**Mode dominant: CULTURE (se souvenir)**

```
Humain
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ HOOK: UserPromptSubmit (perceive.js)                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Détecter l'utilisateur (detectUser)                          │
│  2. Charger le profil et patterns (loadUserProfile)              │
│  3. Injecter contexte mémoire (facts, history)                   │
│  4. Détecter intents (intent detection)                          │
│  5. Décider tier LLM (CostOptimizer → LOCAL/LIGHT/FULL)          │
│  6. Router vers Dog approprié (KabbalisticRouter)                │
│                                                                  │
│  Fractal check:                                                  │
│    φ → Prompt pas trop long/complexe?                            │
│    verify → User authentifié?                                    │
│    culture → Contexte injecté?                                   │
│    burn → Injection minimale mais suffisante?                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
   │
   ▼
Prompt enrichi → LLM
```

**Fichiers clés:**
- `scripts/hooks/perceive.js`
- `scripts/hooks/awaken.js`
- `packages/node/src/routing/cost-optimizer.js`
- `packages/node/src/routing/llm-router.js`

---

## Phase 2: PENSER (Processing Pipeline)

**Mode dominant: PHI (raisonner)**

```
Prompt enrichi
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ ORCHESTRATION (KabbalisticRouter + Dogs)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Classification complexité (ComplexityClassifier)             │
│  2. Sélection tier (LOCAL → LIGHT → FULL)                        │
│  3. Routing Sefirot (quel Dog?)                                  │
│                                                                  │
│       🧠 CYNIC (Keter) - Coordination                            │
│            │                                                     │
│       ┌────┼────┐                                                │
│       │    │    │                                                │
│       ▼    ▼    ▼                                                │
│      📊   📚   🦉  (Analyst, Scholar, Sage)                      │
│       │    │    │                                                │
│       ▼    ▼    ▼                                                │
│      🛡️   🔮   🏗️  (Guardian, Oracle, Architect)                 │
│       │    │    │                                                │
│       ▼    ▼    ▼                                                │
│      🚀   🧹   🔍  (Deployer, Janitor, Scout)                    │
│            │                                                     │
│            ▼                                                     │
│         🗺️ Cartographer (Malkhut)                                │
│                                                                  │
│  4. Consultation LLM si nécessaire (LLMRouter)                   │
│     - LOCAL: règles, pas de LLM                                  │
│     - LIGHT: Ollama (mistral, qwen)                              │
│     - FULL: Claude Code ou Ollama 70B                            │
│                                                                  │
│  Fractal check:                                                  │
│    φ → Confiance du Dog ≤61.8%?                                  │
│    verify → Décision traçable?                                   │
│    culture → Patterns consultés?                                 │
│    burn → Route la plus simple choisie?                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
   │
   ▼
Décision + Réponse brute
```

**Fichiers clés:**
- `packages/node/src/orchestration/kabbalistic-router.js`
- `packages/node/src/orchestration/unified-orchestrator.js`
- `packages/node/src/agents/collective/`
- `packages/node/src/routing/llm-router.js`

---

## Phase 3: AGIR (Output Pipeline)

**Mode dominant: BURN (transformer)**

```
Décision + Réponse brute
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ EXÉCUTION (Tools, Code, Actions)                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PreToolUse guard (guard.js)                                  │
│     - Guardian vérifie danger                                    │
│     - Peut BLOQUER si risque                                     │
│                                                                  │
│  2. Exécution tool (via Claude Code ou direct)                   │
│                                                                  │
│  3. PostToolUse observe (observe.js)                             │
│     - Enregistre résultat                                        │
│     - Détecte patterns                                           │
│     - Met à jour métriques                                       │
│                                                                  │
│  Fractal check:                                                  │
│    φ → Action proportionnée au besoin?                           │
│    verify → Résultat vérifiable?                                 │
│    culture → Pattern enregistré?                                 │
│    burn → Minimum nécessaire fait?                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
   │
   ▼
Résultat → Humain
```

**Fichiers clés:**
- `scripts/hooks/guard.js` (PreToolUse)
- `scripts/hooks/observe.js` (PostToolUse)
- `.claude/hooks/hooks.json`

---

## Phase 4: JUGER (Stop Pipeline)

**Mode dominant: VERIFY (vérifier)**

```
Fin de réponse
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ HOOK: Stop (digest.js)                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Lire dernière réponse assistant (transcript)                 │
│                                                                  │
│  2. JUGER la réponse (judgeResponse)                             │
│     - Voix canine présente? (*sniff*, *tail wag*)                │
│     - Phrases interdites? ("I am Claude")                        │
│     - Confiance excessive? (>61.8%)                              │
│     - Contenu dangereux? (credentials)                           │
│                                                                  │
│  3. Calculer Q-Score                                             │
│     - Score 0-100                                                │
│     - Verdict: WAG/BARK/GROWL/HOWL                               │
│                                                                  │
│  4. Persister feedback (Q-Learning)                              │
│                                                                  │
│  5. Extraire insights (patterns, erreurs)                        │
│                                                                  │
│  6. Stocker en mémoire (PostgreSQL, TotalMemory)                 │
│                                                                  │
│  Fractal check:                                                  │
│    φ → Jugement harmonieux?                                      │
│    verify → Q-Score vérifié sur 36 dimensions?                   │
│    culture → Insights stockés pour futur?                        │
│    burn → Digest concis?                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
   │
   ▼
Session mémorisée
```

**Fichiers clés:**
- `scripts/hooks/digest.js`
- `scripts/hooks/ralph-loop.js`
- `packages/node/src/judge/`

---

## Phase 5: APPRENDRE (Learning Pipeline)

**Mode: Tous les 4 en synergie**

```
Feedback accumulé
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ APPRENTISSAGE CONTINU                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  A. Q-LEARNING (policy improvement)                              │
│     - Chaque décision → reward                                   │
│     - Q-Table mise à jour                                        │
│     - Meilleure routing au fil du temps                          │
│     File: packages/node/src/orchestration/q-learning-service.js  │
│                                                                  │
│  B. PATTERN EMERGENCE (ResidualDetector)                         │
│     - Analyser ce que 24 dimensions n'expliquent pas             │
│     - Proposer nouvelles dimensions                              │
│     - Valider et intégrer                                        │
│     File: packages/node/src/judge/residual.js                    │
│                                                                  │
│  C. EMERGENCE DETECTION (cross-session)                          │
│     - Patterns qui se répètent                                   │
│     - Anomalies significatives                                   │
│     - Insights collectifs                                        │
│     File: packages/node/src/services/emergence-detector.js       │
│                                                                  │
│  D. FINE-TUNING (futur)                                          │
│     - Dataset: tous les jugements CYNIC                          │
│     - LoRA sur modèle Ollama                                     │
│     - CYNIC améliore CYNIC                                       │
│                                                                  │
│  Fractal check:                                                  │
│    φ → Apprentissage équilibré?                                  │
│    verify → Améliorations mesurables?                            │
│    culture → Patterns préservés?                                 │
│    burn → Pas d'over-fitting?                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
   │
   ▼
Système amélioré → Prochaine itération
```

---

## Phase 6: ANCRER (World Pipeline)

**Mode dominant: VERIFY (prouver)**

```
Vérités à ancrer
   │
   ▼
┌──────────────────────────────────────────────────────────────────┐
│ ANCRAGE MONDE RÉEL                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  A. SOLANA (vérité on-chain)                                     │
│     - PoJ blocks (Proof of Judgment)                             │
│     - Immuable, vérifiable                                       │
│     File: packages/anchor/                                       │
│                                                                  │
│  B. POSTGRESQL (mémoire persistante)                             │
│     - Facts, embeddings, patterns                                │
│     - Survit aux sessions                                        │
│     File: packages/persistence/                                  │
│                                                                  │
│  C. GITHUB (histoire vérifiable)                                 │
│     - Commits signés                                             │
│     - PRs tracées                                                │
│     - Code = vérité                                              │
│                                                                  │
│  D. RENDER (déploiement vivant)                                  │
│     - MCP server en production                                   │
│     - Daemon qui respire                                         │
│     - Healthchecks continus                                      │
│                                                                  │
│  Fractal check:                                                  │
│    φ → Ancrage proportionné à l'importance?                      │
│    verify → Preuve cryptographique?                              │
│    culture → Histoire préservée?                                 │
│    burn → Coût d'ancrage justifié?                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Mapping: 12 Pipelines → Pipeline Unifié

| Pipeline Original | Phase Unifiée | Mode Dominant |
|------------------|---------------|---------------|
| Input Pipeline | PERCEVOIR | CULTURE |
| Orchestration Pipeline | PENSER | PHI |
| LLM Pipeline | PENSER | PHI |
| Memory Pipeline | PERCEVOIR + ANCRER | CULTURE |
| Learning Pipeline | APPRENDRE | ALL |
| Emergence Pipeline | APPRENDRE | PHI + CULTURE |
| Benchmark Pipeline | JUGER | VERIFY |
| Fine-tuning Pipeline | APPRENDRE | BURN |
| Security Pipeline | AGIR (guard) | VERIFY |
| Observability Pipeline | AGIR (observe) | CULTURE |
| Deployment Pipeline | ANCRER | BURN |
| Consensus Pipeline | ANCRER | VERIFY |

---

## Cycle Complet

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
              PERCEVOIR                                   │
              (culture)                                   │
                    │                                     │
                    ▼                                     │
               PENSER                                     │
                (φ)                                       │
                    │                                     │
                    ▼                                     │
                AGIR                                      │
               (burn)                                     │
                    │                                     │
                    ▼                                     │
               JUGER                                      │
              (verify)                                    │
                    │                                     │
                    ▼                                     │
             APPRENDRE ───────────────────────────────────┤
             (all modes)                                  │
                    │                                     │
                    ▼                                     │
              ANCRER                                      │
              (verify)                                    │
                    │                                     │
                    └─────────────────────────────────────┘

                         LE CYCLE CONTINUE
                         CYNIC VIT
```

---

*"Le pipeline est UN. Les phases sont les battements de coeur."*
