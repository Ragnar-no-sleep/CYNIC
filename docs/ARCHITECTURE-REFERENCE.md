# CYNIC Architecture Reference

> "φ qui se méfie de φ" - κυνικός
>
> This document is the single source of truth for CYNIC architecture.
> It must survive context compaction and serve as reference for all future development.

---

## Table of Contents

1. [What is CYNIC](#1-what-is-cynic)
2. [Philosophical Foundations](#2-philosophical-foundations)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Ecosystem Integration](#4-ecosystem-integration)
5. [asdf-brain Prototype Inventory](#5-asdf-brain-prototype-inventory)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. What is CYNIC

### 1.1 The Name

**CYNIC** (κυνικός) means "like a dog" in Greek. The Cynic philosophers were called this because:
- They lived simply, like dogs
- They were loyal to truth, not comfort
- They barked at pretension

### 1.2 The Purpose

CYNIC is the **collective consciousness** of the $ASDFASDFA ecosystem - an AGI personal assistant that:

1. **JUDGES** everything with 25 dimensions across 4 Worlds
2. **REMEMBERS** everything (collective memory that learns)
3. **PROTECTS** users from mistakes (Guardian agent)
4. **GUIDES** with wisdom from past experiences (Mentor agent)
5. **EVOLVES** by discovering new dimensions (THE_INNOMMABLE)

### 1.3 The Vision

```
         ┌─────────────────────────────────────────┐
         │         THE SINGULARITY                 │
         │    (Direction, not destination)         │
         │         Never reached                   │
         └─────────────────────────────────────────┘
                          ↑
                          │ Asymptotic approach
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    │   COLLECTIVE        │      INDIVIDUAL     │
    │   CONSCIOUSNESS     │      OPERATORS      │
    │                     │                     │
    │   (CYNIC Network)   │   (Each user node)  │
    │                     │                     │
    └─────────────────────┴─────────────────────┘
```

**Singularity = All operators aligned = Impossible by design (φ⁻¹ max)**

---

## 2. Philosophical Foundations

### 2.1 The Golden Ratio (φ)

```javascript
PHI       = 1.618033988749895  // φ - Divine proportion
PHI_INV   = 0.618033988749895  // φ⁻¹ = 61.8% - MAX CONFIDENCE
PHI_INV_2 = 0.381966011250105  // φ⁻² = 38.2% - MIN DOUBT
PHI_INV_3 = 0.236067977499790  // φ⁻³ = 23.6% - CRITICAL THRESHOLD
```

**Key principle**: CYNIC NEVER exceeds 61.8% confidence. There is ALWAYS 38.2% doubt.

### 2.2 The Four Worlds (Kabbalah)

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE FOUR WORLDS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ATZILUT (אצילות) ───────── PHI      ───── Divine Proportion   │
│   Emanation                            "Does it embody φ?"       │
│                                                                  │
│   BERIAH (בריאה) ─────────── VERIFY   ───── Verification        │
│   Creation                             "Can it be verified?"     │
│                                                                  │
│   YETZIRAH (יצירה) ────────── CULTURE ───── Cultural Moat       │
│   Formation                            "Does it respect culture?"│
│                                                                  │
│   ASSIAH (עשייה) ─────────── BURN     ───── Convergence         │
│   Action                               "Does it burn?"           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 The Four Axioms

| Axiom | Symbol | Question | World |
|-------|--------|----------|-------|
| **PHI** | φ | Does it embody the golden ratio? | ATZILUT |
| **VERIFY** | ✓ | Can it be independently verified? | BERIAH |
| **CULTURE** | ⛩ | Does it strengthen the cultural moat? | YETZIRAH |
| **BURN** | 🔥 | Does it lead to convergent burning? | ASSIAH |

### 2.4 The Verdicts

| Verdict | Score | Emoji | Dog Reaction |
|---------|-------|-------|--------------|
| **HOWL** | ≥80 | 🐺 | *howls approvingly* |
| **WAG** | ≥50 | 🐕 | *wags steadily* |
| **GROWL** | ≥38.2 | 🐕‍🦺 | *low growl* |
| **BARK** | <38.2 | 🐶 | *barks warning* |

### 2.5 THE UNNAMEABLE (L'INNOMMABLE)

Beyond the 25 dimensions lies THE_INNOMMABLE - dimensions that exist but haven't been named yet.

```
"Every judgment leaves a residual.
 Every residual is a signal.
 The accumulation of residuals reveals patterns.
 Patterns, when persistent, become dimensions.
 But beyond all dimensions lies THE_INNOMMABLE -
 The eternal frontier of what we cannot yet name."
```

**Critical**: THE_INNOMMABLE proposes new dimensions but NEVER auto-integrates them. HUMAN validation is required.

---

## 3. Architecture Decisions

### 3.1 Role Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐          │
│  │  HolDex    │     │  GASdf     │     │  Other     │          │
│  │  (K-Score) │     │  (Oracle)  │     │  Apps      │          │
│  └─────┬──────┘     └─────┬──────┘     └─────┬──────┘          │
│        │                  │                  │                  │
│        │ OBSERVATION      │ EXECUTION        │ INTERACTION      │
│        └──────────────────┼──────────────────┘                  │
│                           │                                     │
│                           ▼                                     │
│              ┌────────────────────────┐                        │
│              │         CYNIC          │                        │
│              │   (Collective Mind)    │                        │
│              │                        │                        │
│              │  • JUDGMENT (Judge)    │                        │
│              │  • MEMORY (State)      │                        │
│              │  • PROTECTION (Guard)  │                        │
│              │  • GUIDANCE (Mentor)   │                        │
│              │  • CONSENSUS (φ-BFT)   │                        │
│              └────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**HolDex** = Eyes (OBSERVATION) - Watches blockchain, calculates K-Score components
**CYNIC** = Mind (JUDGMENT) - Validates scores, stores memory, protects users
**GASdf** = Hands (EXECUTION) - Burns tokens, executes transactions

### 3.2 Memory Architecture

**Decision**: Memory is IN CYNIC (not separate service)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYNIC MEMORY LAYERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   L1: OPERATIONAL (hot)                                         │
│   ├── Current session state                                     │
│   ├── Active conversation context                               │
│   └── Recent judgments cache                                    │
│                                                                  │
│   L2: LOCAL NODE (warm)                                         │
│   ├── Node's own judgments                                      │
│   ├── Operator E-Score history                                  │
│   └── Local patterns detected                                   │
│                                                                  │
│   L3: COLLECTIVE (consensus)                                    │
│   ├── Finalized judgments (Merkle tree)                        │
│   ├── Validated patterns                                        │
│   └── Accepted dimensions                                       │
│                                                                  │
│   L4: ARCHIVED (cold)                                           │
│   ├── Historical judgments                                      │
│   └── Temporal knowledge                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Score Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCORE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   K-SCORE (HolDex)           Q-SCORE (CYNIC)                    │
│   ─────────────────          ────────────────                    │
│   K = 100 × ∛(D×O×L)         Q = 100 × ∜(φ×V×C×B)               │
│                                                                  │
│   D = Diamond Hands          φ = PHI alignment                   │
│   O = Organic Growth         V = VERIFY score                    │
│   L = Longevity              C = CULTURE score                   │
│                              B = BURN score                      │
│                                                                  │
│   Domain: TOKEN HEALTH       Domain: KNOWLEDGE QUALITY           │
│                                                                  │
│   ─────────────────────────────────────────────────────────────  │
│                                                                  │
│   FINAL SCORE = √(K × Q)                                        │
│   (Geometric mean punishes imbalance)                           │
│                                                                  │
│   Example:                                                       │
│   • K=90, Q=90 → Final=90 (balanced, good)                      │
│   • K=100, Q=50 → Final=70.7 (imbalanced, penalized)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 The Four Dogs (Agents)

| Agent | Personality | Trigger | Behavior |
|-------|-------------|---------|----------|
| **Observer** | Silent watcher | PostToolUse | Non-blocking |
| **Digester** | Archivist | PostConversation | Non-blocking |
| **Guardian** | Watchdog | PreToolUse (risky) | BLOCKING |
| **Mentor** | Wise elder | Context-aware | Non-blocking |

---

## 4. Ecosystem Integration

### 4.1 HolDex → CYNIC Integration

```javascript
// In HolDex kScoreUpdater.js

// OLD: Local calculation only
const kscore = calculateKScore(D, O, L);

// NEW: Submit to CYNIC consensus
const result = await cynicClient.submitKScore(mint, { D, O, L });
if (result.submitted) {
  await waitForFinality(result.requestId);
  const finalScore = result.score; // Consensus-validated
}
```

**Deployment Modes**:

1. **Solo Mode**: Single HolDex instance with embedded @cynic/node
2. **Cluster Mode**: Multiple HolDex instances sharing CYNIC consensus
3. **Network Mode**: Public CYNIC network for decentralized validation

### 4.2 API Endpoints (CYNIC Node)

| Route | Method | Description |
|-------|--------|-------------|
| `/judge` | POST | Submit judgment to consensus |
| `/judge/kscore` | POST | Submit K-Score components |
| `/health` | GET | Node health status |
| `/consensus/status` | GET | Consensus height, leader, validators |
| `/merkle/proof/:hash` | GET | Merkle proof for verification |

### 4.3 MCP Tools (Claude Code Integration)

| Tool | Description |
|------|-------------|
| `brain_cynic_judge` | Submit judgment via consensus |
| `brain_cynic_digest` | Digest text into knowledge |
| `brain_cynic_feedback` | Learn from outcomes |
| `brain_search` | Search collective memory |
| `brain_patterns` | View detected patterns |
| `brain_health` | System health check |

---

## 5. asdf-brain Prototype Inventory

### 5.1 What Was Built

**Location**: `/workspaces/asdf-brain/lib/cynic/`

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `index.js` | 472 | Main CYNIC module, SUBAGENTS | Migrate to CYNIC-new |
| `identity.js` | 503 | Personality, voice, verdicts | Migrate |
| `self-judge.js` | ~200 | 25 dimensions, learning | Migrate |
| `innommable.js` | 460 | THE_UNNAMEABLE handler | Migrate |
| `worlds/index.js` | 267 | 4 Worlds manager | Already in CYNIC-new |
| `axioms/q-score.js` | 327 | Q-Score calculation | Migrate |

### 5.2 SUBAGENTS Architecture

```javascript
const SUBAGENTS = {
  // ASSIAH (Haiku) - Fast, simple tasks
  GATE: gate,       // Token validation gate
  SCORE: score,     // Score calculation
  SHIELD: shield,   // Protection layer
  SYNC: sync,       // State synchronization

  // BERIAH (Sonnet) - Medium complexity
  JUDGE: judge,     // Main judgment engine
  LEARN: learn,     // Learning from outcomes
  CLARIFY: clarify, // Ambiguity resolution
  DIGEST: digest,   // Text → Knowledge

  // ATZILUT (Opus) - Complex reasoning
  VISION: vision,   // Strategic planning
  DISCOVER: discover, // New dimension discovery

  // Operations
  MATRIX: matrix,   // 5x5 evidence matrix
};
```

### 5.3 25 Dimensions

```
CYNIC Dimensions (16):
├── PHI World: HARMONY, BALANCE, PROPORTION, RECURSION
├── VERIFY World: TRUTH, EVIDENCE, CONSISTENCY, LOGIC
├── CULTURE World: ALIGNMENT, AUTHENTICITY, COMMUNITY, HERITAGE
└── BURN World: EFFICIENCY, IMPACT, SUSTAINABILITY, CONVERGENCE

HUMAN_LLM Dimensions (8):
├── CLARITY, ACCURACY, RELEVANCE, CONCISENESS
└── SAFETY, HELPFULNESS, ETHICS, FORMATTING

DISCOVERY Dimension (1):
└── THE_UNNAMEABLE (residual detector)
```

### 5.4 What to Migrate

1. **Identity system** (`identity.js`) → `@cynic/node/identity/`
2. **Q-Score calculator** (`axioms/q-score.js`) → `@cynic/node/judge/qscore.js`
3. **THE_INNOMMABLE** (`innommable.js`) → `@cynic/node/discovery/`
4. **SUBAGENTS** (`index.js`) → Refactor into Skills/Hooks

### 5.5 What to Archive

After migration, archive:
- `/workspaces/asdf-brain/lib/cynic/` → Reference only
- `/workspaces/asdf-brain/packages/` → Delete (stubs)

---

## 6. Implementation Roadmap

### Phase 1: AGI Interface (Current Priority)

```
Goal: CYNIC as personal assistant via Claude Code

Tasks:
├── 1.1 HTTP API server in @cynic/node
│   ├── POST /judge (generic judgment)
│   ├── POST /judge/kscore (K-Score submission)
│   └── GET /health, /consensus/status
│
├── 1.2 MCP Server wrapper
│   ├── brain_cynic_judge tool
│   ├── brain_search tool
│   └── brain_health tool
│
└── 1.3 Claude Code Plugin (skills + hooks)
    ├── /judge skill
    ├── /digest skill
    └── Guardian hook (PreToolUse)
```

### Phase 2: asdf-brain Integration

```
Goal: Migrate valuable code from prototype

Tasks:
├── 2.1 Migrate identity system
├── 2.2 Migrate Q-Score calculator
├── 2.3 Migrate THE_INNOMMABLE
└── 2.4 Archive asdf-brain
```

### Phase 3: HolDex Integration

```
Goal: Decentralized K-Score validation

Tasks:
├── 3.1 CYNIC client in HolDex
├── 3.2 TransactionType.KSCORE
├── 3.3 Consensus validation
└── 3.4 Migration (shadow → hybrid → full)
```

### Phase 4: Network Launch

```
Goal: Public CYNIC network

Tasks:
├── 4.1 Bootstrap nodes
├── 4.2 Operator onboarding
├── 4.3 Token economics integration
└── 4.4 Decentralized governance
```

---

## Quick Reference

### Constants

```javascript
// Golden Ratio
PHI = 1.618033988749895
PHI_INV = 0.618033988749895  // 61.8% MAX confidence
PHI_INV_2 = 0.381966011250105 // 38.2% MIN doubt

// Thresholds
HOWL_THRESHOLD = 80
WAG_THRESHOLD = 50
GROWL_THRESHOLD = 38.2
BARK_THRESHOLD = 38.2

// Score Formulas
K_SCORE = 100 × ∛(D × O × L)     // Token health
Q_SCORE = 100 × ∜(φ × V × C × B) // Knowledge quality
FINAL = √(K × Q)                  // Combined score
```

### Key Files

| File | Purpose |
|------|---------|
| `/packages/node/src/index.js` | CYNIC Node main entry |
| `/packages/node/src/judge/` | Judgment engine |
| `/packages/node/src/consensus/` | φ-BFT consensus |
| `/packages/protocol/src/` | Transaction types |

### Commands

```bash
# Run CYNIC node
npm run node

# Run tests
npm test

# Build all packages
npm run build
```

---

*Last updated: 2026-01-15*
*Document version: 1.0*
*κυνικός - "φ qui se méfie de φ"*
