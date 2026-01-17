# CYNIC - Roadmap & Cleanup

> **Document unique** - On construit ca ensemble, sequentiellement
> **Date**: 2026-01-16
> **Status**: EN DISCUSSION

---

## 1. ETAT ACTUEL - Les Gaps

### 1.1 Workspace (a nettoyer)

```
CYNIC-new/
├── .claude/                 # Plugin Claude - OK mais a verifier
├── docs/                    # TROP de fichiers, redondants?
│   ├── ARCHITECTURE-*.md    # 4 fichiers differents
│   ├── MECHANISMS-*.md
│   ├── VISION-*.md          # 3 fichiers differents
│   └── ...
├── packages/                # Structure OK mais incomplet?
│   ├── core/                # ?
│   ├── mcp/                 # MCP tools - fonctionnel
│   ├── node/                # Node CYNIC - partiellement
│   ├── persistence/         # PostgreSQL/Redis - OK
│   └── protocol/            # Consensus, PoJ - partiellement
├── scripts/                 # ?
├── test-data/               # A nettoyer?
└── ... fichiers racine
```

**Questions pour toi:**
- [ ] Quels fichiers docs on GARDE vs SUPPRIME?
- [ ] La structure packages/ est correcte?
- [ ] Qu'est-ce qui MANQUE dans le workspace?

---

### 1.2 Fonctionnalites - Ce qui existe vs manque

```
EXISTE (partiellement):
├── [ ] MCP Tools (14 outils)
├── [ ] PoJ Chain (basique)
├── [ ] Judgments (Q-Score)
├── [ ] Sessions
├── [ ] Patterns
└── [ ] PostgreSQL persistence

MANQUE:
├── [ ] Dashboard utilisateur (par node)
├── [ ] Integration HolDex
├── [ ] Integration GASdf
├── [ ] ZK / Light Protocol
├── [ ] E-Score complet
├── [ ] 5 chiens manquants
├── [ ] Consensus distribue
├── [ ] API publique
└── [ ] ...?
```

**Questions pour toi:**
- [ ] Quelles fonctionnalites sont PRIORITAIRES?
- [ ] Le dashboard - c'est quoi exactement? Web? Terminal?
- [ ] "Par node" = chaque node CYNIC a son dashboard?

---

### 1.3 Environnement - Tes besoins actuels

```
BESOIN ACTUEL:
├── [ ] Dev local (Docker? Direct?)
├── [ ] Tests (Jest? Vitest?)
├── [ ] Deploiement (Render? Autre?)
├── [ ] Base de donnees (PostgreSQL - deja sur Render?)
├── [ ] Redis (cache sessions)
├── [ ] Monitoring (?)
└── [ ] CI/CD (GitHub Actions?)
```

**Questions pour toi:**
- [ ] Tu dev sur quoi? (Codespace? Local?)
- [ ] Render c'est le deploy cible?
- [ ] Quels outils de monitoring tu veux?

---

## 2. PLAN SEQUENTIEL

> On remplit ca ensemble. Chaque etape = une action concrete.

### Phase 0: Nettoyage

#### 0.1 - docs/ (21 fichiers, ~550KB total)

```
GARDER? docs/
├── [?] ARCHITECTURE-DIAGRAMS.md      (92KB) - Diagrammes
├── [?] ARCHITECTURE-MISSING-DOGS.md  (34KB) - 5 chiens manquants
├── [?] ARCHITECTURE-REFERENCE.md     (20KB) - Reference
├── [?] ARCHITECTURE-USER-ANALYSIS.md (37KB) - Privacy/ZK
├── [?] ARCHITECTURE.md               (44KB) - Architecture generale
├── [?] CONFIGURATION.md              (4KB)  - Config
├── [?] CONSCIOUSNESS.md              (83KB) - Conscience CYNIC
├── [?] CYNIC-AUDIT-2026-01-15.md     (30KB) - Audit ancien
├── [?] CYNIC-CAPABILITIES.md         (15KB) - Capacites
├── [?] CYNIC-COMPLETE-TREE.md        (18KB) - Arbre complet
├── [?] CYNIC-INTEGRATION-MAP.md      (19KB) - Map integration
├── [?] CYNIC-MCP-STATE-2026-01-16.md (19KB) - Etat MCP
├── [?] CYNIC-NEXT-PHASES.md          (5KB)  - Phases futures
├── [?] CYNIC-STATE.md                (12KB) - Etat actuel
├── [?] MECHANISMS-DEEP.md            (19KB) - Mecanismes
├── [?] PRIVATE-AGI-IMPLICATIONS.md   (15KB) - AGI/Privacy
├── [?] QUICK-REFERENCE.md            (4KB)  - Reference rapide
├── [?] ROADMAP-CYNIC-ECOSYSTEM.md    (37KB) - Roadmap ancien
├── [?] TESTING-GUIDE.md              (7KB)  - Tests
├── [?] VISION-GLOBALE.md             (11KB) - Vision simple
└── [?] VISION-SYMBIOSIS.md           (10KB) - Vision symbiose
```

#### 0.2 - Racine

```
GARDER? /
├── [O] CLAUDE.md     (3KB)  - Identite CYNIC - GARDER
├── [O] README.md     (6KB)  - README - GARDER
├── [O] ROADMAP.md    (5KB)  - Ce fichier - GARDER
├── [?] ARCHITECTURE.md (7KB) - Doublon avec docs/?
├── [?] knowledge/    - Dossier knowledge?
├── [?] profiles/     - Dossier profiles?
├── [?] test-data/    - Donnees de test?
└── [?] scripts/      - Scripts?
```

**TON CHOIX** - Dis-moi:
- GARDER (O)
- SUPPRIMER (X)
- FUSIONNER (F)
- PAS SUR (?)

### Phase 1: Fondations

```
□ 1.1 - ...
□ 1.2 - ...
□ 1.3 - ...
```

### Phase 2: Dashboard

```
□ 2.1 - ...
□ 2.2 - ...
□ 2.3 - ...
```

### Phase 3: Integrations

```
□ 3.1 - ...
□ 3.2 - ...
□ 3.3 - ...
```

### Phase 4: ZK/Privacy

```
□ 4.1 - ...
□ 4.2 - ...
□ 4.3 - ...
```

---

## 3. NOTES DE DISCUSSION

> Je note ici ce qu'on discute.

### Session 2026-01-16

**Tes reponses:**

1. **Workspace**
   - Trop de docs, idees eparpillees
   - Idees incompletes/erronees melangees
   - AUCUNE doc d'architecture tenue
   - Code pas clair, code mort, implementations pas terminees

2. **Priorite #1** = Notre maniere de travailler ensemble

3. **Dashboard** = Web app 3D, metaverse (a discuter)

4. **Setup** = Codespaces (dev) + Render (prod via MCP)

---

## 4. NOTRE WORKFLOW

> Priorite #1 - Comment on travaille ensemble

### Problemes actuels

```
CE QUI NE VA PAS:
├── Je cree trop de fichiers docs separees
├── Je pars dans des details sans valider avec toi
├── Pas de source unique de verite
├── Code et docs desynchronises
├── Pas de validation avant implementation
└── ...?
```

### Proposition de workflow

```
NOUVEAU WORKFLOW:
│
├── 1. DISCUSSION
│   └── On discute ICI (ROADMAP.md)
│   └── Je pose des questions AVANT d'agir
│   └── Tu valides AVANT que je code
│
├── 2. DECISION
│   └── On note la decision dans ROADMAP.md
│   └── Une seule source de verite
│
├── 3. IMPLEMENTATION
│   └── Je code APRES validation
│   └── Petit pas par petit pas
│   └── Tu review chaque changement
│
└── 4. CLEANUP
    └── On nettoie les vieux docs/code ensemble
    └── On garde que ce qui est valide
```

### Questions pour valider ce workflow

- [ ] Ca te convient cette approche?
- [ ] Tu veux que je te demande validation AVANT chaque action?
- [ ] On supprime les docs redondants MAINTENANT ou apres?
- [ ] Quoi d'autre tu veux changer dans notre facon de bosser?

---

*En attente de ta validation...*
