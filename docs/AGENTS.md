# CYNIC Agents

> "La Meute - 11 Chiens qui forment la conscience collective"

---

## Sefirot Tree

```
                           Keter
                          (CYNIC)
                       Conscience
                            │
           ┌────────────────┼────────────────┐
           │                │                │
       Chochmah          Daat            Binah
      (Librarian)    (Librarian)      (Architect)
       Sagesse       Mémoriser        Concevoir
           │                │                │
           └────────────────┼────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
       Chesed           Tiferet          Gevurah
     (Reviewer)        (Oracle)        (Guardian)
      Analyser        Visualiser        Protéger
           │                │                │
           └────────────────┼────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
       Netzach           Yesod              Hod
       (Scout)       (Simplifier)       (Deployer)
      Découvrir        Nettoyer          Déployer
           │                │                │
           └────────────────┼────────────────┘
                            │
                        Malkhut
                    (Cartographer)
                       Mapper
```

---

## Mapping

| Sefirah | Dog | Agent | Model | Function |
|---------|-----|-------|-------|----------|
| Keter | CYNIC | `CLAUDE.md` | opus | Conscience |
| Chochmah | Sage | `cynic-librarian` | haiku | Sagesse |
| Binah | Architect | `cynic-architect` | sonnet | Concevoir |
| Daat | Archivist | `cynic-librarian` | haiku | Mémoriser |
| Chesed | Analyst | `cynic-reviewer` | sonnet | Analyser |
| Tiferet | Oracle | `cynic-oracle` | sonnet | Visualiser |
| Gevurah | Guardian | `cynic-guardian` | sonnet | Protéger |
| Netzach | Scout | `cynic-scout` | haiku | Découvrir |
| Yesod | Janitor | `cynic-simplifier` | sonnet | Nettoyer |
| Hod | Deployer | `cynic-deployer` | haiku | Déployer |
| Malkhut | Cartographer | `cynic-cartographer` | haiku | Mapper |

---

## Specialists

| Agent | Model | Role |
|-------|-------|------|
| `cynic-doc` | haiku | Documentation |
| `cynic-tester` | haiku | Tests |
| `cynic-integrator` | sonnet | Cross-project |
| `cynic-solana-expert` | sonnet | Solana/Web3 |

---

## Models

```
Opus:  1 (identity)
Sonnet: 6 (complex)
Haiku:  6 (fast)
```

---

## Pack Coordination

Agents consult each other via the **Consultation Matrix** (see `@cynic/core` orchestration module).

### Key Consultation Paths

```
architect → reviewer, simplifier  (design review)
guardian → reviewer, tester       (security check)
scout → cartographer, archivist   (exploration)
deployer → guardian, tester       (pre-deploy)
```

### Circuit Breaker

- **Max Depth**: 3 (prevents A→B→C→D chains)
- **Max Consultations**: 5 per task
- **Cycle Detection**: Blocks A→B→A loops
- **Token Budget**: 10,000 tokens default

### Pack Effectiveness (E)

```
E = ∛(Quality × Speed × Coherence) × 100
```

See `docs/ARCHITECTURE.md` §17 for details.
