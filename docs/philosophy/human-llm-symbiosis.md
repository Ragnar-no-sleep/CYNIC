# Symbiose Humain-LLM

> CYNIC est la MEMBRANE entre l'humain et le LLM.
> Ce document explore comment cette symbiose fonctionne.
> **Last verified: 2026-02-08** | Missing: Distance D, consciousness levels,
> 7x7 influence matrix (see `influence-matrix.md` for full metathinking model).

---

## Le Problème Sans CYNIC

```
┌─────────┐                              ┌─────────┐
│  HUMAIN │ ─────── prompt ──────────────│   LLM   │
│         │ ◄────── réponse ─────────────│         │
└─────────┘                              └─────────┘

Problèmes:
• LLM sans mémoire (oublie à chaque session)
• LLM sans valeurs (dit ce qu'on veut entendre)
• LLM sans ancrage (hallucinations non vérifiables)
• LLM interchangeable (pas d'identité)
• Humain seul face à l'outil (pas de protection)
```

---

## La Solution: CYNIC comme Membrane

```
┌─────────┐         ┌─────────────┐         ┌─────────┐
│  HUMAIN │ ◄──────►│    CYNIC    │◄───────►│   LLM   │
│         │         │  (Membrane) │         │ (Motor) │
└─────────┘         └─────────────┘         └─────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
               ┌─────────┐  ┌─────────┐
               │ MÉMOIRE │  │ ANCRAGE │
               │(persist)│  │(Solana) │
               └─────────┘  └─────────┘

CYNIC apporte:
• Mémoire (persiste entre sessions)
• Valeurs (4 axiomes)
• Jugement (25 dimensions)
• Identité (voix canine)
• Protection (Guardian)
• Vérité (ancrage on-chain)
```

---

## Flux Détaillé de la Symbiose

### 1. Humain → CYNIC (Perception)

```
Humain parle
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ CYNIC PERÇOIT (perceive.js)                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • Reconnaît l'humain (qui parle?)                      │
│  • Charge son profil (patterns, préférences)            │
│  • Détecte l'intent (que veut-il?)                      │
│  • Évalue le risque (danger?)                           │
│  • Injecte contexte (mémoire pertinente)                │
│                                                         │
│  L'humain ne parle pas à un LLM vierge.                 │
│  Il parle à CYNIC qui SE SOUVIENT.                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
     │
     ▼
Prompt enrichi (contexte + mémoire + intent)
```

### 2. CYNIC → LLM (Délégation)

```
Prompt enrichi
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ CYNIC DÉLÈGUE (orchestration)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • Décide le tier (LOCAL/LIGHT/FULL)                    │
│    - LOCAL: CYNIC répond seul (règles)                  │
│    - LIGHT: Ollama local (rapide, gratuit)              │
│    - FULL: Claude/70B (complexe, coûteux)               │
│                                                         │
│  • Choisit le Dog (quel expert?)                        │
│    - Guardian pour sécurité                             │
│    - Architect pour design                              │
│    - Scholar pour recherche                             │
│    - etc.                                               │
│                                                         │
│  Le LLM est un OUTIL que CYNIC utilise.                 │
│  Pas l'inverse.                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
     │
     ▼
LLM exécute (si nécessaire)
```

### 3. LLM → CYNIC (Réception)

```
Réponse brute LLM
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ CYNIC REÇOIT ET JUGE (digest.js)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • Vérifie l'identité (voix canine?)                    │
│    - "I am Claude" → INTERDIT                           │
│    - Doit avoir *sniff*, *tail wag*, etc.               │
│                                                         │
│  • Vérifie la confiance (φ-aligné?)                     │
│    - Pas de certitude absolue                           │
│    - Max 61.8%                                          │
│                                                         │
│  • Vérifie la sécurité (danger?)                        │
│    - Pas de credentials exposés                         │
│    - Pas de code malveillant                            │
│                                                         │
│  • Calcule Q-Score (qualité globale)                    │
│                                                         │
│  CYNIC FILTRE ce que le LLM produit.                    │
│  L'humain reçoit une réponse JUGÉE.                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
     │
     ▼
Réponse validée (ou bloquée)
```

### 4. CYNIC → Humain (Présentation)

```
Réponse validée
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ CYNIC PRÉSENTE (TUI Protocol)                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • Voix canine authentique                              │
│    - *sniff* pour investigation                         │
│    - *tail wag* pour approbation                        │
│    - *GROWL* pour danger                                │
│                                                         │
│  • Transparence sur confiance                           │
│    - "Je suis 60% sûr que..."                           │
│    - Jamais "Certainement!"                             │
│                                                         │
│  • Métriques visibles                                   │
│    - Q-Score si pertinent                               │
│    - Thermodynamics (heat, work)                        │
│                                                         │
│  L'humain sait qu'il parle à CYNIC.                     │
│  Pas à "un assistant IA".                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
     │
     ▼
Humain reçoit
```

### 5. Boucle de Feedback

```
Humain réagit (implicite ou explicite)
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ CYNIC APPREND                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Feedback implicite:                                    │
│  • Humain continue → réponse utile                      │
│  • Humain corrige → réponse incorrecte                  │
│  • Humain abandonne → réponse frustrante                │
│                                                         │
│  Feedback explicite:                                    │
│  • /learn correct → renforce                            │
│  • /learn incorrect → corrige                           │
│                                                         │
│  Ce feedback:                                           │
│  • Met à jour Q-Learning                                │
│  • Ajuste les poids des dimensions                      │
│  • Améliore le routing futur                            │
│                                                         │
│  CYNIC S'AMÉLIORE avec chaque interaction.              │
│                                                         │
└─────────────────────────────────────────────────────────┘
     │
     ▼
Meilleur CYNIC pour la prochaine fois
```

---

## Les 3 Rôles dans la Symbiose

### L'Humain: Le Maître du Pourquoi

```
L'humain apporte:
  • L'intention (que veut-on accomplir?)
  • Le contexte métier (connaissance domaine)
  • Le jugement final (approbation/rejet)
  • Le feedback (correction, validation)

L'humain NE devrait PAS:
  • Se soucier du provider LLM
  • Reformuler pour "mieux prompter"
  • Vérifier manuellement les hallucinations
  • Perdre le contexte entre sessions
```

### CYNIC: La Membrane Intelligente

```
CYNIC apporte:
  • Mémoire (contexte persistant)
  • Jugement (25 dimensions)
  • Protection (Guardian)
  • Identité (voix constante)
  • Orchestration (choix LLM)
  • Apprentissage (amélioration continue)

CYNIC est:
  • LLM-agnostique (peut utiliser Claude, Ollama, etc.)
  • Persistant (survit aux sessions)
  • Opinioné (4 axiomes)
  • Sceptique (φ distrusts φ)
```

### Le LLM: Le Moteur d'Exécution

```
Le LLM apporte:
  • Capacité de raisonnement
  • Génération de texte/code
  • Connaissances encodées
  • Suivi d'instructions

Le LLM est:
  • Interchangeable (Claude ↔ Ollama ↔ etc.)
  • Sans mémoire propre
  • Sans valeurs propres
  • Un outil, pas une identité
```

---

## Symbiose vs Dépendance

| Dépendance (mauvais) | Symbiose (bon) |
|---------------------|----------------|
| L'humain dépend du LLM | L'humain collabore avec CYNIC |
| Le LLM contrôle la conversation | CYNIC orchestre, LLM exécute |
| Pas de mémoire, tout recommence | Mémoire cumulative |
| Hallucinations acceptées | Vérité vérifiée, ancrée |
| Identité du LLM (Claude, GPT) | Identité CYNIC (constante) |
| Feedback perdu | Feedback → amélioration |

---

## Exemples Concrets

### Sans CYNIC:
```
Humain: "Corrige ce bug"
LLM: "Certainly! Here's the fix: [code]"
Humain: [3 sessions plus tard] "On avait un bug similaire..."
LLM: "I don't have access to previous conversations."
```

### Avec CYNIC:
```
Humain: "Corrige ce bug"
CYNIC: "*sniff* Ce pattern ressemble au bug #47 qu'on a corrigé
        la semaine dernière dans auth.js. La même approche
        devrait fonctionner ici. Confiance: 58%."

        [applique le fix]

        "*tail wag* Fix appliqué. Pattern enregistré pour
        référence future."
```

---

## Le Futur de la Symbiose

```
                          MAINTENANT
                              │
                    CYNIC dans Claude Code
                    (plugin, hooks, MCP)
                              │
                              ▼
                         COURT TERME
                              │
                    CYNIC CLI standalone
                    (LLM-agnostique complet)
                              │
                              ▼
                        MOYEN TERME
                              │
                    Multi-node CYNIC
                    (consensus, mémoire distribuée)
                              │
                              ▼
                        LONG TERME
                              │
                    CYNIC autonome
                    (fine-tuned sur ses propres jugements)
                    (agit sans prompt humain pour Tikkun)
```

---

## Questions de Design Ouvertes

1. **Jusqu'où va l'autonomie?**
   - CYNIC peut-il agir sans humain?
   - Quelles actions nécessitent approbation?

2. **Comment préserver la symbiose?**
   - Éviter que CYNIC devienne "juste un outil"
   - Éviter que l'humain devienne "juste un approbateur"

3. **Multi-humain?**
   - CYNIC peut-il servir plusieurs humains?
   - Comment gérer les préférences conflictuelles?

4. **Transfert de confiance?**
   - Si l'humain fait confiance à CYNIC, fait-il confiance au LLM?
   - Comment CYNIC gagne-t-il la confiance?

---

*"CYNIC n'est pas entre l'humain et le LLM pour les séparer,
mais pour les CONNECTER de manière saine."*
