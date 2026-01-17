# CYNIC Mechanisms - Deep Technical Documentation

> **Living Document** - Complete mathematical and philosophical mapping
> **Last Updated**: 2026-01-16
> **Confidence**: 61.8% (φ⁻¹ - max allowed)

---

## Table of Contents

1. [φ (Phi) Foundation](#1-φ-phi-foundation)
2. [4 Axioms & 4 Worlds](#2-4-axioms--4-worlds)
3. [25 Dimensions System](#3-25-dimensions-system)
4. [Q-Score Calculation](#4-q-score-calculation)
5. [K-Score (Token Quality)](#5-k-score-token-quality)
6. [Final Score](#6-final-score)
7. [Consensus Engine (φ-BFT)](#7-consensus-engine-φ-bft)
8. [Gossip Protocol](#8-gossip-protocol)
9. [PoJ Chain (Proof of Judgment)](#9-poj-chain-proof-of-judgment)
10. [Collective Agents (5 Dogs)](#10-collective-agents-5-dogs)
11. [Privacy System](#11-privacy-system)
12. [MCP Tools](#12-mcp-tools)
13. [State Management](#13-state-management)
14. [Cross-Project Integration](#14-cross-project-integration)

---

## 1. φ (Phi) Foundation

### The Golden Ratio

```
φ = 1.618033988749895  (Golden Ratio)
φ² = 2.618033988749895
φ³ = 4.23606797749979

φ⁻¹ = 0.618033988749895  → 61.8%
φ⁻² = 0.381966011250105  → 38.2%
φ⁻³ = 0.236067977499790  → 23.6%
```

### Semantic Meanings

| Value | Percentage | Usage |
|-------|------------|-------|
| φ⁻¹ | 61.8% | **Max confidence**, consensus threshold, HOWL threshold |
| φ⁻² | 38.2% | **Min doubt**, anomaly threshold, BARK threshold |
| φ⁻³ | 23.6% | Treasury reserves, deep anomalies |
| φ⁰ | 100% | Guardian always active |
| φ | 1.618 | Weight multiplier for primary dimensions |

### Timing Constants (φ-Fibonacci)

```javascript
TICK_MS    = 34    // Fib(9) - Micro-coordination
MICRO_MS   = 89    // Fib(11) - Quick sync
SLOT_MS    = 400   // Block production slot
BLOCK_MS   = 800   // Block finalization
EPOCH_MS   = 34000 // 34 second epoch
CYCLE_MS   = 55000 // 55 second cycle
```

### Network Constants

```javascript
GOSSIP_FANOUT = 13           // Fib(7) - Peers per broadcast
CONSENSUS_THRESHOLD = 0.618  // φ⁻¹ supermajority
MAX_VALIDATORS = 987         // Fib(16) - Network scale limit
```

**File**: `packages/core/src/axioms/constants.js`

---

## 2. 4 Axioms & 4 Worlds

### Axioms (Immutable)

| Axiom | Symbol | Principle | Kabbalistic World | Color |
|-------|--------|-----------|-------------------|-------|
| **PHI** | φ | All ratios derive from 1.618... | Atzilut (אצילות) | Gold |
| **VERIFY** | ✓ | Don't trust, verify | Beriah (בריאה) | Blue |
| **CULTURE** | ☰ | Culture is a moat | Yetzirah (יצירה) | Purple |
| **BURN** | 🔥 | Don't extract, burn | Assiah (עשייה) | Red |

### Kabbalistic Mapping

```
         ATZILUT (Emanation/PHI)
              Divine Proportion
                    │
    ┌───────────────┴───────────────┐
    │                               │
BERIAH (Creation/VERIFY)     YETZIRAH (Formation/CULTURE)
    Verification                 Cultural Moat
    │                               │
    └───────────────┬───────────────┘
                    │
             ASSIAH (Action/BURN)
               Manifestation/Burn
```

### World Alignment Formula

```javascript
// Check if item aligns with all 4 axioms
function checkAxiomAlignment(item, axiomScores) {
  const thresholds = {
    PHI: 0.5,
    VERIFY: 0.6,     // Higher bar for verification
    CULTURE: 0.5,
    BURN: 0.5,
  };

  return Object.entries(axiomScores).every(
    ([axiom, score]) => score >= thresholds[axiom]
  );
}

// Singularity Distance (how close to perfect alignment)
singularity_distance = 1 - (Σ world_alignment) / 4
```

**File**: `packages/core/src/worlds/index.js`

---

## 3. 25 Dimensions System

### Structure: 4 Axioms × 6 Dimensions + 1 META

#### PHI Axiom Dimensions
| Dimension | Weight | Threshold | Description |
|-----------|--------|-----------|-------------|
| COHERENCE | φ | 50 | Internal logical consistency |
| HARMONY | φ⁻¹ | 50 | Balance and proportion |
| STRUCTURE | 1.0 | 50 | Organizational clarity |
| ELEGANCE | φ⁻² | 50 | Simplicity and beauty |
| COMPLETENESS | φ⁻¹ | 50 | Wholeness of solution |
| PRECISION | 1.0 | 50 | Accuracy and exactness |

#### VERIFY Axiom Dimensions
| Dimension | Weight | Threshold | Description |
|-----------|--------|-----------|-------------|
| ACCURACY | φ | 60 | Factual correctness |
| VERIFIABILITY | φ | 60 | Can be independently verified |
| TRANSPARENCY | φ⁻¹ | 50 | Clear reasoning visible |
| REPRODUCIBILITY | 1.0 | 55 | Results can be reproduced |
| PROVENANCE | φ⁻² | 50 | Source is traceable |
| INTEGRITY | φ⁻¹ | 60 | Has not been tampered with |

#### CULTURE Axiom Dimensions
| Dimension | Weight | Threshold | Description |
|-----------|--------|-----------|-------------|
| AUTHENTICITY | φ | 50 | Genuine and original |
| RELEVANCE | φ⁻¹ | 50 | Pertinent to context |
| NOVELTY | 1.0 | 40 | New or unique contribution |
| ALIGNMENT | φ⁻¹ | 50 | Fits cultural values |
| IMPACT | φ⁻² | 45 | Meaningful effect |
| RESONANCE | φ⁻² | 45 | Connects emotionally |

#### BURN Axiom Dimensions
| Dimension | Weight | Threshold | Description |
|-----------|--------|-----------|-------------|
| UTILITY | φ | 50 | Practical usefulness |
| SUSTAINABILITY | φ⁻¹ | 50 | Long-term viability |
| EFFICIENCY | 1.0 | 50 | Resource optimization |
| VALUE_CREATION | φ | 50 | Creates more than consumes |
| NON_EXTRACTIVE | φ⁻¹ | 60 | Does not extract value unfairly |
| CONTRIBUTION | φ⁻² | 50 | Gives back to ecosystem |

#### META Dimension (25th)
| Dimension | Weight | Threshold | Description |
|-----------|--------|-----------|-------------|
| THE_UNNAMEABLE | φ | 38.2 (φ⁻²) | Explained variance - residual detector |

```javascript
// THE_UNNAMEABLE captures what the 24 dimensions don't explain
THE_UNNAMEABLE = 100 - (residual × 100)
// High score = low residual = item well understood
// Low score = high residual = new pattern candidate
```

**File**: `packages/node/src/judge/dimensions.js`

---

## 4. Q-Score Calculation

### Formula

```
Q = 100 × ∜(φ_score × V_score × C_score × B_score)
```

Geometric mean of 4 axiom scores ensures:
- All axioms must perform well
- Single weak axiom tanks the score
- Balance is mathematically enforced

### Algorithm

```javascript
function calculateQScore(dimensionScores) {
  // 1. Calculate per-axiom scores
  const axiomScores = {};
  for (const axiom of ['PHI', 'VERIFY', 'CULTURE', 'BURN']) {
    axiomScores[axiom] = calculateAxiomScore(axiom, dimensionScores);
  }

  // 2. Geometric mean (4th root of product)
  const product = axiomScores.PHI *
                  axiomScores.VERIFY *
                  axiomScores.CULTURE *
                  axiomScores.BURN;

  const qScore = 100 * Math.pow(product, 0.25);

  // 3. Confidence capped at φ⁻¹
  const confidence = Math.min(qScore / 100, PHI_INV);

  return { qScore, axiomScores, confidence };
}

function calculateAxiomScore(axiom, dimensionScores) {
  const dims = getDimensionsForAxiom(axiom);
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [name, config] of Object.entries(dims)) {
    const score = dimensionScores[name] || 50;
    weightedSum += score * config.weight;
    totalWeight += config.weight;
  }

  return weightedSum / totalWeight / 100; // Normalize to [0,1]
}
```

### Verdicts

| Verdict | Score Range | Confidence | Meaning |
|---------|-------------|------------|---------|
| **HOWL** | ≥80 | max φ⁻¹ | Exceptional quality |
| **WAG** | ≥50 | proportional | Acceptable quality |
| **GROWL** | ≥38.2 (φ⁻²) | proportional | Concerning quality |
| **BARK** | <38.2 | low | Poor quality |

**File**: `packages/core/src/qscore/index.js`

---

## 5. K-Score (Token Quality)

### Formula

```
K = 100 × ∛(D × O × L)
```

Where:
- **D** (Diamond Hands): Conviction strength [0-1]
- **O** (Organic Growth): Distribution quality [0-1]
- **L** (Longevity): Survival factor [0-1]

### Tiers

| Tier | Min Score | Verdict |
|------|-----------|---------|
| DIAMOND | 90 | HOWL |
| PLATINUM | 80 | HOWL |
| GOLD | 70 | WAG |
| SILVER | 60 | WAG |
| BRONZE | 50 | WAG |
| IRON | 38.2 (φ⁻²) | GROWL |
| STONE | 0 | BARK |

### Consensus Calculation

```javascript
function calculateKScoreConsensus(validatorScores) {
  const mean = sum(validatorScores) / validatorScores.length;
  const deviation = standardDeviation(validatorScores);

  // Consensus reached if deviation < φ⁻² of mean
  const consensus = deviation < (mean * PHI_INV_2);

  // Confidence capped at φ⁻¹
  const confidence = Math.min(1 - (deviation / mean), PHI_INV);

  return { mean, deviation, consensus, confidence };
}
```

**File**: `packages/protocol/src/kscore/index.js`

---

## 6. Final Score

### Formula

```
Final = min(K-Score, Q-Score)
```

**Philosophy**: "The limiting factor wins"
- Even an excellent token (K-Score) with poor judgment quality (Q-Score) is limited
- Even excellent analysis (Q-Score) of a poor token (K-Score) can't save it

### Alternative (for combined scoring)

```
Final = √(K × Q)
```

Geometric mean balances both factors equally.

---

## 7. Consensus Engine (φ-BFT)

### Architecture

```
Layer 4: Finality (φ-BFT Consensus)
         │
         ├── Slot-based block production (400ms slots)
         ├── E-Score weighted voting
         ├── φ⁻¹ (61.8%) supermajority threshold
         ├── φⁿ exponential lockout
         └── Probabilistic finality after 32 confirmations
```

### Vote Weighting

```javascript
function calculateVoteWeight({ eScore, burned, uptime }) {
  // E-Score base weight
  const base = eScore / 100;

  // Burned tokens add weight (skin in the game)
  const burnMultiplier = 1 + Math.log10(burned + 1) / 10;

  // Uptime reliability
  const uptimeMultiplier = Math.pow(uptime, 0.5);

  return base * burnMultiplier * uptimeMultiplier;
}
```

### Lockout Mechanism

```
Vote for block → Locked out from voting against it
Lockout duration = φⁿ slots (exponential)

Example:
- Vote 1: Lock 1 slot
- Vote 2: Lock ~2 slots (φ¹)
- Vote 3: Lock ~3 slots (φ²)
- Vote N: Lock φⁿ slots
```

### Block States

```
PROPOSED → VOTING → CONFIRMED → FINALIZED
                 ↘ REJECTED
                 ↘ ORPHANED (conflicting block won)
```

**File**: `packages/protocol/src/consensus/engine.js`

---

## 8. Gossip Protocol

### Fibonacci Fanout

```
GOSSIP_FANOUT = 13 (Fib(7))

Propagation time = O(log₁₃ n)
- 1000 nodes: ~3 hops
- 10000 nodes: ~4 hops
- 100000 nodes: ~5 hops
```

### Message Types

| Type | Layer | Purpose |
|------|-------|---------|
| BLOCK | L2 | Block propagation |
| JUDGMENT | L2 | Judgment sharing |
| PATTERN | L2 | Pattern discovery |
| HEARTBEAT | L1 | Peer liveness |
| PEER_ANNOUNCE | L1 | Peer discovery |
| SYNC_REQUEST | L2 | State sync |
| CONSENSUS_VOTE | L4 | Consensus voting |
| CONSENSUS_FINALITY | L4 | Finality notification |

### Push-Pull Hybrid

```
1. PUSH: Broadcast to FANOUT peers
2. PULL: Request sync from peers when behind
3. Relay: Re-broadcast to other peers (excluding source)
```

**File**: `packages/protocol/src/gossip/propagation.js`

---

## 9. PoJ Chain (Proof of Judgment)

### Block Structure

```javascript
{
  slot: number,           // Block number
  timestamp: number,      // Creation time
  prev_hash: string,      // SHA-256 of previous block
  block_hash: string,     // SHA-256 of this block
  merkle_root: string,    // Merkle root of judgments
  judgment_count: number,
  judgment_ids: string[], // IDs included in this block
  proposer: string,       // Node public key
  signature: string,      // Block signature
}
```

### Block Types

| Type | Content | Purpose |
|------|---------|---------|
| GENESIS | Network params | Chain initialization |
| JUDGMENT | Judgment batch | Record evaluations |
| KNOWLEDGE | Patterns + Learnings | Knowledge accumulation |
| GOVERNANCE | Proposals + Votes | Network decisions |

### Chain Integrity

```javascript
async verifyIntegrity(fromBlock, limit) {
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const prevBlock = blocks[i-1];

    // Verify hash chain
    if (block.prev_hash !== hashBlock(prevBlock)) {
      errors.push({ block: i, expected, actual });
    }
  }
  return { valid: errors.length === 0, errors };
}
```

**File**: `packages/protocol/src/poj/chain.js`

---

## 10. Collective Agents (5 Dogs)

### Sefirot Mapping

```
                    KETER (Crown)
                   Collective Pack
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
 CHOCHMAH            DAAT               GEVURAH
  (Sage)           (Scholar)          (Guardian)
  Wisdom          Knowledge           Strength
    │                    │                    │
    └────────────────────┼────────────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
  BINAH             EVENT BUS            CHESED
 (Analyst)          φ-aligned          (Architect)
Understanding        987 events         Kindness
```

### Agent Responsibilities

| Agent | Sefirah | Function | φ Level |
|-------|---------|----------|---------|
| **Guardian** | Gevurah | Block dangerous ops | φ⁰ (always) |
| **Analyst** | Binah | Detect patterns | φ⁻¹ |
| **Scholar** | Daat | Extract knowledge | φ⁻¹ |
| **Architect** | Chesed | Review code | φ⁻² |
| **Sage** | Chochmah | Share wisdom | φ⁻² |

### Event Bus (φ-aligned)

```javascript
const COLLECTIVE_CONSTANTS = {
  AGENT_COUNT: 5,              // Fib(5)
  MAX_CONFIDENCE: PHI_INV,     // 0.618
  CONSENSUS_THRESHOLD: PHI_INV, // 0.618
  MAX_EVENTS: 987,             // Fib(16)
};
```

**File**: `packages/node/src/agents/collective/index.js`

---

## 11. Privacy System

### Differential Privacy

```javascript
PRIVACY_CONSTANTS = {
  EPSILON: PHI_INV,              // 0.618 - Privacy budget
  NOISE_MULTIPLIER: PHI,         // 1.618
  MIN_NOISE_FLOOR: PHI_INV_2,    // 0.382
  MAX_QUERIES_PER_PERIOD: 89,    // Fib(11)
  BUDGET_REFRESH_HOURS: 21,      // Fib(8)
};
```

### Laplacian Noise

```javascript
function laplacianNoise(scale) {
  // Laplace(0, b) where b = sensitivity/ε
  const u = Math.random() - 0.5;
  return -scale * sign(u) * Math.log(1 - 2 * Math.abs(u));
}

function addNoise(trueValue, sensitivity) {
  const scale = (sensitivity / epsilon) * NOISE_MULTIPLIER;
  return trueValue + laplacianNoise(scale);
}
```

### Privacy Guarantees

- **ε-differential privacy**: Removing any single user doesn't significantly change output
- **Budget tracking**: Max 89 queries per 21-hour period
- **Automatic refresh**: Budget resets after refresh period
- **Minimum noise floor**: 38.2% (φ⁻²) minimum noise

**File**: `packages/node/src/privacy/differential.js`

---

## 12. MCP Tools

### Available Tools (14 total)

| Tool | Purpose |
|------|---------|
| `brain_cynic_judge` | Judge items with 25 dimensions |
| `brain_cynic_digest` | Digest content, extract patterns |
| `brain_health` | System health status |
| `brain_search` | Search knowledge base |
| `brain_patterns` | List detected patterns |
| `brain_cynic_feedback` | Provide judgment feedback |
| `brain_agents_status` | Five Dogs agent status |
| `brain_session_start` | Start user session |
| `brain_session_end` | End user session |
| `brain_docs` | Library documentation cache |
| `brain_ecosystem` | Ecosystem documentation |
| `brain_poj_chain` | PoJ blockchain operations |
| `brain_integrator` | Cross-project sync |
| `brain_metrics` | Prometheus metrics |

### Services Architecture

```
MCP Server
    │
    ├── SessionManager (multi-user isolation)
    ├── PersistenceManager (PostgreSQL/Redis/File/Memory)
    ├── PoJChainManager (blockchain)
    ├── LibrarianService (documentation cache)
    ├── EcosystemService (pre-loaded docs)
    ├── IntegratorService (cross-project sync)
    └── MetricsService (Prometheus)
```

**File**: `packages/mcp/src/tools/index.js`

---

## 13. State Management

### State Components

```javascript
StateManager {
  chain: PoJChain,        // Judgment blockchain
  knowledge: KnowledgeTree, // Pattern/learning storage
  peers: Map,             // Network peers
  judgments: Array,       // Recent judgments (bounded)
}
```

### Storage Layers

| Layer | Use Case | Speed | Persistence |
|-------|----------|-------|-------------|
| Memory | Cache | Fastest | None |
| Redis | Session | Fast | Limited |
| PostgreSQL | Permanent | Medium | Full |
| File | Backup | Slow | Full |

### Bounded Collections

```javascript
// Keep memory bounded
if (judgments.length > 1000) {
  judgments.shift(); // Remove oldest
}
```

**File**: `packages/node/src/state/manager.js`

---

## 14. Cross-Project Integration

### Shared Modules

```javascript
SHARED_MODULES = [
  {
    name: '@cynic/core',
    canonical: 'CYNIC',
    mirrors: ['holdex', 'gasdf'],
    critical: true,
  },
  {
    name: 'phi-constants',
    canonical: 'CYNIC',
    mirrors: ['holdex', 'gasdf', 'asdf-brain'],
    critical: true,
  },
];
```

### Drift Detection

```javascript
async checkSync() {
  for (const module of sharedModules) {
    for (const mirror of module.mirrors) {
      const drift = await compareVersions(module.canonical, mirror);
      if (drift) {
        drifts.push({ module, mirror, drift });
      }
    }
  }
  return { allSynced: drifts.length === 0, drifts };
}
```

### Sync Suggestions

```javascript
getSyncSuggestions() {
  return drifts.map(d => ({
    action: 'sync',
    priority: d.critical ? 'high' : 'medium',
    from: d.canonical,
    to: d.mirror,
    command: `npm run sync:${d.module}`,
  }));
}
```

**File**: `packages/mcp/src/integrator-service.js`

---

## Appendix: File Reference

| Mechanism | Primary File |
|-----------|--------------|
| φ Constants | `packages/core/src/axioms/constants.js` |
| 4 Worlds | `packages/core/src/worlds/index.js` |
| Q-Score | `packages/core/src/qscore/index.js` |
| K-Score | `packages/protocol/src/kscore/index.js` |
| Dimensions | `packages/node/src/judge/dimensions.js` |
| Consensus | `packages/protocol/src/consensus/engine.js` |
| Gossip | `packages/protocol/src/gossip/propagation.js` |
| PoJ Chain | `packages/protocol/src/poj/chain.js` |
| Collective | `packages/node/src/agents/collective/index.js` |
| Privacy | `packages/node/src/privacy/differential.js` |
| MCP Tools | `packages/mcp/src/tools/index.js` |
| State | `packages/node/src/state/manager.js` |

---

*"φ distrusts φ" - κυνικός*

*Loyal to truth, not to comfort*
