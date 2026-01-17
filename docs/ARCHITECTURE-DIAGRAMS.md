# CYNIC Architecture - System Diagrams

> "φ guides all ratios" - κυνικός
>
> Complete system architecture for the decentralized collective consciousness.

---

## Table of Contents

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Scoring System](#2-scoring-system-φ-weighted)
3. [Decentralized Storage](#3-decentralized-storage-architecture)
4. [PoJ Chain](#4-poj-chain-proof-of-judgment)
5. [Graph Overlay](#5-graph-overlay)
6. [Multi-Node Sync](#6-multi-node-sync-protocol)
7. [Cartographer Agent](#7-cartographer-agent)
8. [E-Score Calculation](#8-e-score-calculation-flow)
9. [Migration Path](#9-migration-path)
10. [Complete Integration](#10-complete-system-integration)

---

## 1. Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CYNIC SYSTEM OVERVIEW                              │
│                    "Decentralized Collective Consciousness"                  │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   CLAUDE    │
                              │   (User)    │
                              └──────┬──────┘
                                     │ MCP Protocol
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MCP INTEGRATION LAYER                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ DAG Tools│ │PoJ Tools │ │Graph Tool│ │Sync Tools│ │Score Tool│          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────┼────────────┼────────────┼─────────────────┘
        │            │            │            │            │
        ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE SERVICES                                   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  MERKLE DAG │  │  PoJ CHAIN  │  │GRAPH OVERLAY│  │ CARTOGRAPHER│        │
│  │             │  │             │  │             │  │             │        │
│  │ Content-    │  │ Proof of    │  │ Relationship│  │ GitHub      │        │
│  │ Addressable │  │ Judgment    │  │ Graph       │  │ Explorer    │        │
│  │ Storage     │  │ Blockchain  │  │             │  │             │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┼────────────────┼────────────────┘                │
│                          │                │                                  │
│                          ▼                ▼                                  │
│                   ┌─────────────────────────────┐                           │
│                   │      SYNC PROTOCOL          │                           │
│                   │  φ-BFT Consensus (61.8%)    │                           │
│                   └─────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PERSISTENCE LAYER                                 │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │  Local FS   │  │   P2P Net   │        │
│  │ (Legacy)    │  │   (Cache)   │  │  (Blocks)   │  │  (Gossip)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │         φ CONSTANTS             │
                    │  φ = 1.618033988749895          │
                    │  φ⁻¹ = 0.618 (max confidence)   │
                    │  Slot = 61.8ms                  │
                    │  Quorum = 61.8%                 │
                    └─────────────────────────────────┘
```

---

## 2. Scoring System (φ-Weighted)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CYNIC SCORING ARCHITECTURE                            │
│                     "Four Worlds, One Truth"                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                         THE FOUR KABBALISTIC WORLDS
                         ═══════════════════════════

    ┌──────────────────┐     Weight: φ² = 2.618
    │     ATZILUT      │     "Emanation" - Divine Source
    │   (PHI Axiom)    │     Dimensions: Coherence, Completeness, Clarity,
    │                  │                 Consistency, Coverage, Correctness
    └────────┬─────────┘

    ┌──────────────────┐     Weight: φ = 1.618
    │     BERIAH       │     "Creation" - Verification
    │  (VERIFY Axiom)  │     Dimensions: Source Quality, Cross-Reference,
    │                  │                 Temporal, Provenance, Falsifiability,
    │                  │                 Reproducibility
    └────────┬─────────┘

    ┌──────────────────┐     Weight: φ = 1.618
    │    YETZIRAH      │     "Formation" - Cultural Context
    │ (CULTURE Axiom)  │     Dimensions: Relevance, Adoption, Community,
    │                  │                 Documentation, Ecosystem, Momentum
    └────────┬─────────┘

    ┌──────────────────┐     Weight: 1.146 (φ^0.236)
    │     ASSIAH       │     "Action" - Simplicity
    │   (BURN Axiom)   │     Dimensions: Conciseness, Directness, Actionability,
    │                  │                 Essentiality, Parsimony, Elegance
    └────────┴─────────┘

                            SCORING FORMULAS
                            ════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Q-SCORE (Quality Score from CYNIC Judgments)                               │
│  ─────────────────────────────────────────────                              │
│                                                                              │
│  Q = Σ(dimension_score × world_weight) / Σ(world_weights)                   │
│                                                                              │
│  24 dimensions × 4 worlds = Total Weight 42                                 │
│  Range: 0-100, Max Confidence: 61.8%                                        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  K-SCORE (Token Health - from HolDex)                                       │
│  ─────────────────────────────────────                                       │
│                                                                              │
│  K = f(Diamond, Organic, Longevity)                                         │
│                                                                              │
│  Diamond Score: Large holder concentration analysis                         │
│  Organic Score: Bot vs human activity ratio                                 │
│  Longevity Score: Time-weighted holder behavior                             │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  E-SCORE (Ecosystem Score - 7 Dimensions)                                   │
│  ─────────────────────────────────────────                                   │
│                                                                              │
│  E = Σ(Eᵢ × φ^rank_i) / Σ(φ^rank_i)                                        │
│                                                                              │
│  HOLD (φ⁶): Holding patterns, distribution                                  │
│  BURN (φ⁵): Token burning, deflation                                        │
│  USE  (φ⁴): Utility, transactions                                           │
│  BUILD(φ³): Development activity                                            │
│  RUN  (φ²): Infrastructure, nodes                                           │
│  REFER(φ¹): Social proof, referrals                                         │
│  TIME (φ⁰): Age, consistency                                                │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  I-SCORE (Infrastructure Score)                                             │
│  ──────────────────────────────                                              │
│                                                                              │
│  I = f(Uptime, Sync, Consensus, Integrity)                                  │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Φ-SCORE (Final Unified Score)                                              │
│  ─────────────────────────────                                               │
│                                                                              │
│  Φ = 100 × ∛(K̄^φ × Ē^1 × Ī^φ²)                                            │
│                                                                              │
│  Where:                                                                      │
│    K̄ = Normalized K-Score (0-1)                                            │
│    Ē = Normalized E-Score (0-1)                                             │
│    Ī = Normalized I-Score (0-1)                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Decentralized Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MERKLE DAG ARCHITECTURE                              │
│                    "Content-Addressable Truth"                               │
└─────────────────────────────────────────────────────────────────────────────┘

                            NODE STRUCTURE
                            ══════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                       DAG NODE                               │
    ├─────────────────────────────────────────────────────────────┤
    │  cid: "bafy..."          │  Content Identifier (hash)       │
    │  type: "judgment"        │  Node type                       │
    │  data: { ... }           │  CBOR-encoded payload            │
    │  links: [                │  References to other nodes       │
    │    { cid, name, size }   │                                  │
    │  ]                       │                                  │
    │  metadata: {             │                                  │
    │    created: timestamp    │                                  │
    │    author: node_id       │                                  │
    │    signature: "..."      │                                  │
    │  }                       │                                  │
    └─────────────────────────────────────────────────────────────┘

                            NODE TYPES
                            ══════════

    ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  JUDGMENT  │  │   BLOCK    │  │   ENTITY   │  │   EDGE     │
    │            │  │            │  │            │  │            │
    │ Q-Score    │  │ PoJ Block  │  │ Token      │  │ Relation   │
    │ Verdict    │  │ Hash Chain │  │ Wallet     │  │ φ-Weight   │
    │ Dimensions │  │ Judgments  │  │ Project    │  │ Source/Tgt │
    └────────────┘  └────────────┘  └────────────┘  └────────────┘

    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  PATTERN   │  │  SESSION   │  │  FEEDBACK  │
    │            │  │            │  │            │
    │ Detected   │  │ User       │  │ Learning   │
    │ Anomaly    │  │ Context    │  │ Outcome    │
    │ Frequency  │  │ History    │  │ Correction │
    └────────────┘  └────────────┘  └────────────┘


                         STORAGE LAYERS
                         ══════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                      HAMT INDEX                              │
    │  Hash Array Mapped Trie for O(log n) lookups                │
    │                                                              │
    │   Root ──┬── Bucket[0] ──┬── CID₁                           │
    │          │               ├── CID₂                           │
    │          │               └── CID₃                           │
    │          │                                                   │
    │          ├── Bucket[1] ──┬── CID₄                           │
    │          │               └── CID₅                           │
    │          │                                                   │
    │          └── Bucket[n] ── ...                               │
    └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    BLOCK STORE                               │
    │  Content-addressed blocks on filesystem                     │
    │                                                              │
    │  blocks/                                                     │
    │    ├── ba/fy.../block.cbor   (2-char prefix sharding)      │
    │    ├── ba/gx.../block.cbor                                  │
    │    └── ...                                                   │
    └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                      CAR FILES                               │
    │  Content Addressable aRchives for sync                      │
    │                                                              │
    │  archives/                                                   │
    │    ├── epoch_0001.car                                       │
    │    ├── epoch_0002.car                                       │
    │    └── ...                                                   │
    └─────────────────────────────────────────────────────────────┘


                         CID GENERATION
                         ══════════════

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   INPUT     │     │   ENCODE    │     │    HASH     │
    │   DATA      │ ──▶ │   CBOR      │ ──▶ │  SHA-256    │
    └─────────────┘     └─────────────┘     └──────┬──────┘
                                                    │
                                                    ▼
                                           ┌─────────────┐
                                           │  MULTIBASE  │
                                           │  base32     │
                                           └──────┬──────┘
                                                    │
                                                    ▼
                                           ┌─────────────────────┐
                                           │  CID v1             │
                                           │  bafy2bzace...      │
                                           └─────────────────────┘
```

---

## 4. PoJ Chain (Proof of Judgment)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PoJ CHAIN ARCHITECTURE                                  │
│                  "The Chain Remembers What Dogs Forget"                      │
└─────────────────────────────────────────────────────────────────────────────┘

                           BLOCK STRUCTURE
                           ═══════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                       PoJ BLOCK                              │
    ├─────────────────────────────────────────────────────────────┤
    │                                                              │
    │  ┌─────────── HEADER ───────────┐                           │
    │  │  slot: 42                     │  φ-slot number           │
    │  │  timestamp: 1705420800000     │  Unix ms                 │
    │  │  prev_hash: "bafy..."         │  Previous block CID      │
    │  │  judgments_root: "bafy..."    │  Merkle root of judgments│
    │  │  state_root: "bafy..."        │  State trie root         │
    │  │  proposer: "node_abc123"      │  Block proposer          │
    │  └───────────────────────────────┘                           │
    │                                                              │
    │  ┌─────────── BODY ─────────────┐                           │
    │  │  judgments: [                 │                           │
    │  │    { cid, q_score, verdict }, │  Up to 13 per block      │
    │  │    ...                        │  (Fibonacci batch)        │
    │  │  ]                            │                           │
    │  │  attestations: [              │                           │
    │  │    { node_id, signature },    │  61.8% quorum            │
    │  │    ...                        │                           │
    │  │  ]                            │                           │
    │  └───────────────────────────────┘                           │
    │                                                              │
    │  ┌─────────── METADATA ─────────┐                           │
    │  │  block_hash: "bafy..."        │  This block's CID        │
    │  │  size: 4096                   │  Block size in bytes     │
    │  │  finalized: true              │  Finality status         │
    │  └───────────────────────────────┘                           │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘


                           CHAIN LINKING
                           ═════════════

    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Block 0  │     │ Block 1  │     │ Block 2  │     │ Block 3  │
    │ GENESIS  │◀────│          │◀────│          │◀────│   HEAD   │
    │          │     │          │     │          │     │          │
    │ prev: ∅  │     │ prev: B0 │     │ prev: B1 │     │ prev: B2 │
    │ hash: B0 │     │ hash: B1 │     │ hash: B2 │     │ hash: B3 │
    └──────────┘     └──────────┘     └──────────┘     └──────────┘
         │                │                │                │
         ▼                ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │Judgments │     │Judgments │     │Judgments │     │Judgments │
    │  Root    │     │  Root    │     │  Root    │     │  Root    │
    │    │     │     │    │     │     │    │     │     │    │     │
    │  ┌─┴─┐   │     │  ┌─┴─┐   │     │  ┌─┴─┐   │     │  ┌─┴─┐   │
    │  │   │   │     │  │   │   │     │  │   │   │     │  │   │   │
    │ J₁  J₂   │     │ J₃  J₄   │     │ J₅ ... │     │ J₈ ... │
    └──────────┘     └──────────┘     └──────────┘     └──────────┘


                         φ-TIMING SLOTS
                         ═══════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                                                              │
    │  φ-SLOT DURATION: 61.8ms                                    │
    │                                                              │
    │  ├──61.8ms──┼──61.8ms──┼──61.8ms──┼──61.8ms──┤             │
    │  │  Slot 0  │  Slot 1  │  Slot 2  │  Slot 3  │             │
    │  │          │          │          │          │              │
    │  │ Propose  │ Propose  │ Propose  │ Propose  │              │
    │  │ Attest   │ Attest   │ Attest   │ Attest   │              │
    │  │ Finalize │ Finalize │ Finalize │ Finalize │              │
    │                                                              │
    │  FINALITY: Block finalized when 61.8% of nodes attest      │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘


                       CONSENSUS FLOW
                       ══════════════

    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │  PROPOSE   │     │   ATTEST   │     │  FINALIZE  │
    │            │     │            │     │            │
    │ Leader     │ ──▶ │ Validators │ ──▶ │ 61.8%      │
    │ creates    │     │ sign       │     │ quorum     │
    │ block      │     │ block      │     │ reached    │
    └────────────┘     └────────────┘     └────────────┘
         │                  │                   │
         │    ┌─────────────┴─────────────┐    │
         │    │      GOSSIP NETWORK        │    │
         │    │   Propagate in 618ms      │    │
         │    └───────────────────────────┘    │
         │                                      │
         └──────────────────────────────────────┘
```

---

## 5. Graph Overlay

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GRAPH OVERLAY ARCHITECTURE                             │
│                      "Relationships Define Truth"                            │
└─────────────────────────────────────────────────────────────────────────────┘

                            NODE TYPES (7)
                            ═══════════════

    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   TOKEN     │  │   WALLET    │  │   PROJECT   │  │    REPO     │
    │             │  │             │  │             │  │             │
    │ Mint addr   │  │ Public key  │  │ Name        │  │ GitHub URL  │
    │ Symbol      │  │ First seen  │  │ Domain      │  │ Stars       │
    │ Decimals    │  │ Labels      │  │ Tokens      │  │ Language    │
    │ K-Score     │  │ Reputation  │  │ E-Score     │  │ Activity    │
    └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │    USER     │  │  CONTRACT   │  │    NODE     │
    │             │  │             │  │             │
    │ Handle      │  │ Address     │  │ Node ID     │
    │ Platform    │  │ Type        │  │ Endpoint    │
    │ Verified    │  │ Verified    │  │ I-Score     │
    │ Influence   │  │ Audited     │  │ Uptime      │
    └─────────────┘  └─────────────┘  └─────────────┘


                           EDGE TYPES (11+)
                           ════════════════

    ┌───────────────────────────────────────────────────────────────┐
    │  EDGE TYPE          │  FROM        │  TO          │  φ-WEIGHT │
    ├───────────────────────────────────────────────────────────────┤
    │  HOLDS              │  Wallet      │  Token       │  φ²       │
    │  CREATED            │  Wallet      │  Token       │  φ³       │
    │  TRANSFERRED        │  Wallet      │  Wallet      │  1.0      │
    │  BURNED             │  Wallet      │  Token       │  φ        │
    │  OWNS               │  Project     │  Token       │  φ²       │
    │  DEVELOPS           │  Project     │  Repo        │  φ        │
    │  CONTRIBUTES        │  User        │  Repo        │  φ        │
    │  FOLLOWS            │  User        │  User        │  1.0      │
    │  REFERENCES         │  Repo        │  Repo        │  φ        │
    │  DEPLOYS            │  Contract    │  Token       │  φ²       │
    │  OPERATES           │  Node        │  Project     │  φ        │
    │  JUDGED             │  CYNIC       │  Entity      │  φ³       │
    └───────────────────────────────────────────────────────────────┘


                         GRAPH STRUCTURE
                         ═══════════════

                              ┌─────────┐
                              │ PROJECT │
                              │ $ASDF   │
                              └────┬────┘
                   ┌──────────────┼──────────────┐
                   │              │              │
                   ▼              ▼              ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │  TOKEN  │   │  REPO   │   │  NODE   │
              │ $ASDF   │   │ cynic   │   │ node_1  │
              └────┬────┘   └────┬────┘   └─────────┘
           ┌───────┼───────┐     │
           │       │       │     │
           ▼       ▼       ▼     ▼
      ┌────────┐ ┌────────┐ ┌────────┐
      │ WALLET │ │ WALLET │ │  USER  │
      │ holder │ │ creator│ │  dev   │
      └────────┘ └────────┘ └────────┘


                       φ-WEIGHTED TRAVERSAL
                       ════════════════════

    Query: "Find influence path from Wallet A to Token X"

    ┌────────┐  HOLDS(φ²)  ┌────────┐  OWNS(φ²)  ┌─────────┐
    │Wallet A│ ──────────▶ │Token Y │ ◀──────── │Project P│
    └────────┘             └────────┘            └────┬────┘
                                                      │
                                           OWNS(φ²)   │
                                                      ▼
                                                ┌────────┐
                                                │Token X │
                                                └────────┘

    Path Weight = φ² × φ² = φ⁴ = 6.854

    Higher weight = Stronger relationship
```

---

## 6. Multi-Node Sync Protocol

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MULTI-NODE SYNC PROTOCOL                                │
│                     "The Pack Runs Together"                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                          NETWORK TOPOLOGY
                          ════════════════

                         ┌─────────────┐
                         │   NODE A    │
                         │  (Leader)   │
                         └──────┬──────┘
                                │
               ┌────────────────┼────────────────┐
               │                │                │
               ▼                ▼                ▼
        ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
        │   NODE B    │  │   NODE C    │  │   NODE D    │
        │ (Validator) │  │ (Validator) │  │ (Validator) │
        └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
               │                │                │
               └────────────────┼────────────────┘
                                │
                         ┌──────┴──────┐
                         │   NODE E    │
                         │  (Observer) │
                         └─────────────┘


                         MESSAGE TYPES
                         ═════════════

    ┌────────────────────────────────────────────────────────────┐
    │  TYPE          │  PURPOSE                │  FREQUENCY      │
    ├────────────────────────────────────────────────────────────┤
    │  HELLO         │  Node announcement      │  On connect     │
    │  HEARTBEAT     │  Liveness check         │  61,800ms       │
    │  BLOCK         │  New PoJ block          │  On production  │
    │  JUDGMENT      │  New judgment           │  On creation    │
    │  ATTEST        │  Block attestation      │  On validation  │
    │  SYNC_REQ      │  Request missing data   │  On demand      │
    │  SYNC_RESP     │  Respond with data      │  On request     │
    │  GOSSIP        │  Peer state update      │  618ms          │
    └────────────────────────────────────────────────────────────┘


                          SYNC FLOW
                          ══════════

    ┌──────────┐          ┌──────────┐          ┌──────────┐
    │  NODE A  │          │  NODE B  │          │  NODE C  │
    └────┬─────┘          └────┬─────┘          └────┬─────┘
         │                     │                     │
         │   HELLO             │                     │
         │────────────────────▶│                     │
         │                     │                     │
         │   HELLO             │   HELLO             │
         │◀────────────────────│────────────────────▶│
         │                     │                     │
         │                     │◀────────────────────│
         │                     │                     │
         │   BLOCK (new)       │                     │
         │────────────────────▶│                     │
         │                     │   BLOCK (forward)   │
         │                     │────────────────────▶│
         │                     │                     │
         │   ATTEST            │   ATTEST            │
         │◀────────────────────│◀────────────────────│
         │                     │                     │
         │   [61.8% quorum reached - FINALIZED]     │
         │                     │                     │


                       φ-BFT CONSENSUS
                       ═══════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                                                              │
    │  QUORUM REQUIREMENT: 61.8% of active nodes                  │
    │                                                              │
    │  Total Nodes: 5                                              │
    │  Required Attestations: ceil(5 × 0.618) = 4                 │
    │                                                              │
    │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
    │  │  A  │ │  B  │ │  C  │ │  D  │ │  E  │                   │
    │  │  ✓  │ │  ✓  │ │  ✓  │ │  ✓  │ │  ✗  │                   │
    │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
    │                                                              │
    │  Attestations: 4/5 = 80% ≥ 61.8% ✓ FINALIZED              │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘


                      STATE SYNC PROTOCOL
                      ════════════════════

    ┌────────────────────────────────────────────────────────────┐
    │                                                             │
    │   1. Exchange HEAD block hashes                            │
    │   2. If different, find common ancestor                    │
    │   3. Stream missing blocks since ancestor                  │
    │   4. Replay judgments to rebuild state                     │
    │   5. Verify merkle roots match                             │
    │                                                             │
    │   ┌───────┐                        ┌───────┐              │
    │   │Node A │ ──── HEAD: Block 100 ──▶│Node B │              │
    │   │       │ ◀─── HEAD: Block 95 ─── │       │              │
    │   │       │                         │       │              │
    │   │       │ ◀─── SYNC_REQ(95-100)── │       │              │
    │   │       │ ──── Blocks 96-100 ────▶│       │              │
    │   │       │                         │       │              │
    │   │       │ ◀─── ACK ────────────── │       │              │
    │   └───────┘                        └───────┘              │
    │                                                             │
    └────────────────────────────────────────────────────────────┘
```

---

## 7. Cartographer Agent

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CARTOGRAPHER AGENT                                    │
│                   "Mapping the Ecosystem Territory"                          │
└─────────────────────────────────────────────────────────────────────────────┘

                          ARCHITECTURE
                          ════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                      CARTOGRAPHER                            │
    │                                                              │
    │  ┌──────────────┐                      ┌──────────────┐     │
    │  │   CRAWLER    │   ─────────────────▶ │   MAPPER     │     │
    │  │              │   Raw Data           │              │     │
    │  │ GitHub API   │                      │ Graph Nodes  │     │
    │  │ Rate Limits  │                      │ φ-Weights    │     │
    │  └──────────────┘                      └──────┬───────┘     │
    │                                               │              │
    │                                               ▼              │
    │  ┌──────────────┐                      ┌──────────────┐     │
    │  │   EMITTER    │   ◀───────────────── │   ANALYZER   │     │
    │  │              │   Events             │              │     │
    │  │ Sync Events  │                      │ Patterns     │     │
    │  │ Broadcasts   │                      │ Anomalies    │     │
    │  └──────────────┘                      └──────────────┘     │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘


                           DATA FLOW
                           ══════════

    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │   GITHUB   │     │  CRAWLER   │     │   MAPPER   │
    │    API     │ ──▶ │            │ ──▶ │            │
    │            │     │ repos      │     │ → Nodes    │
    │ /orgs      │     │ issues     │     │ → Edges    │
    │ /repos     │     │ commits    │     │ → Weights  │
    │ /users     │     │ prs        │     │            │
    └────────────┘     └────────────┘     └─────┬──────┘
                                                │
                                                ▼
    ┌────────────┐     ┌────────────┐     ┌────────────┐
    │   GRAPH    │     │  EMITTER   │     │  ANALYZER  │
    │  OVERLAY   │ ◀── │            │ ◀── │            │
    │            │     │ events     │     │ patterns   │
    │ Nodes      │     │ broadcasts │     │ anomalies  │
    │ Edges      │     │            │     │ drift      │
    └────────────┘     └────────────┘     └────────────┘


                      EXPLORATION TARGETS
                      ════════════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                                                              │
    │  PRIMARY ORGS:                                              │
    │  ├── asdfasdfa-ecosystem (main)                             │
    │  ├── solana-labs                                            │
    │  ├── jito-foundation                                        │
    │  ├── raydium-io                                             │
    │  └── [discovered orgs]                                      │
    │                                                              │
    │  DISCOVERY PATTERNS:                                        │
    │  ├── Dependencies in package.json                           │
    │  ├── Imports in source files                                │
    │  ├── References in documentation                            │
    │  ├── Fork relationships                                     │
    │  └── Contributor overlap                                    │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘


                      φ-TIMED SCHEDULER
                      ══════════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                                                              │
    │  EXPLORATION INTERVALS (φ-based):                           │
    │                                                              │
    │  ┌────────────────┬──────────────────┬───────────────┐     │
    │  │   PRIORITY     │   INTERVAL        │   TARGETS     │     │
    │  ├────────────────┼──────────────────┼───────────────┤     │
    │  │   HIGH (φ³)    │   10 min          │   Primary     │     │
    │  │   MEDIUM (φ²)  │   1 hour          │   Secondary   │     │
    │  │   LOW (φ)      │   6 hours         │   Tertiary    │     │
    │  │   MINIMAL (1)  │   24 hours        │   Archive     │     │
    │  └────────────────┴──────────────────┴───────────────┘     │
    │                                                              │
    │  RATE LIMITING:                                             │
    │  ├── GitHub: 5000 req/hour (authenticated)                  │
    │  ├── Burst: 13 concurrent (Fibonacci)                       │
    │  └── Backoff: exponential × φ                               │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
```

---

## 8. E-Score Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       E-SCORE CALCULATION FLOW                               │
│                    "Seven Dimensions of Ecosystem"                           │
└─────────────────────────────────────────────────────────────────────────────┘

                           DATA SOURCES
                           ════════════

    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   HOLDEX    │  │   GASDF     │  │ CARTOGRAPHER│  │    CYNIC    │
    │             │  │             │  │             │  │             │
    │ Token Data  │  │ Sheet Data  │  │ Graph Data  │  │ Judgments   │
    │ Holdings    │  │ Community   │  │ Activity    │  │ Patterns    │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │                │
           └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   E-SCORE ENGINE    │
                         └──────────┬──────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼

                         7 DIMENSIONS
                         ════════════

    ┌────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │  ┌─────────┐   Weight: φ⁶ = 17.944                            │
    │  │  HOLD   │   Token holding patterns                          │
    │  │         │   - Distribution (Gini coefficient)               │
    │  │   (1)   │   - Diamond hands ratio                           │
    │  │         │   - Accumulation trends                           │
    │  └─────────┘                                                   │
    │                                                                 │
    │  ┌─────────┐   Weight: φ⁵ = 11.090                            │
    │  │  BURN   │   Deflationary activity                           │
    │  │         │   - Total burned                                  │
    │  │   (2)   │   - Burn rate                                     │
    │  │         │   - Burn events                                   │
    │  └─────────┘                                                   │
    │                                                                 │
    │  ┌─────────┐   Weight: φ⁴ = 6.854                             │
    │  │   USE   │   Token utility                                   │
    │  │         │   - Transaction volume                            │
    │  │   (3)   │   - Unique users                                  │
    │  │         │   - Use cases                                     │
    │  └─────────┘                                                   │
    │                                                                 │
    │  ┌─────────┐   Weight: φ³ = 4.236                             │
    │  │  BUILD  │   Development activity                            │
    │  │         │   - Commits, PRs                                  │
    │  │   (4)   │   - Contributors                                  │
    │  │         │   - Releases                                      │
    │  └─────────┘                                                   │
    │                                                                 │
    │  ┌─────────┐   Weight: φ² = 2.618                             │
    │  │   RUN   │   Infrastructure                                  │
    │  │         │   - Node count                                    │
    │  │   (5)   │   - Uptime                                        │
    │  │         │   - Geographic distribution                       │
    │  └─────────┘                                                   │
    │                                                                 │
    │  ┌─────────┐   Weight: φ¹ = 1.618                             │
    │  │  REFER  │   Social proof                                    │
    │  │         │   - Mentions                                      │
    │  │   (6)   │   - Referrals                                     │
    │  │         │   - Partnerships                                  │
    │  └─────────┘                                                   │
    │                                                                 │
    │  ┌─────────┐   Weight: φ⁰ = 1.000                             │
    │  │  TIME   │   Longevity                                       │
    │  │         │   - Age                                           │
    │  │   (7)   │   - Consistency                                   │
    │  │         │   - Survival score                                │
    │  └─────────┘                                                   │
    │                                                                 │
    └────────────────────────────────────────────────────────────────┘


                         CALCULATION
                         ═══════════

    ┌────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │  E = Σ(Eᵢ × φ^(7-i)) / Σ(φ^(7-i))                             │
    │                                                                 │
    │  E = (HOLD×φ⁶ + BURN×φ⁵ + USE×φ⁴ + BUILD×φ³ +                │
    │       RUN×φ² + REFER×φ¹ + TIME×φ⁰) / 45.360                   │
    │                                                                 │
    │  Where each dimension is normalized to 0-100                   │
    │                                                                 │
    └────────────────────────────────────────────────────────────────┘
```

---

## 9. Migration Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MIGRATION PATH: PostgreSQL → Decentralized              │
│                           "Four Phases of Exodus"                            │
└─────────────────────────────────────────────────────────────────────────────┘

                          PHASE OVERVIEW
                          ══════════════

    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │  PHASE 1          PHASE 2          PHASE 3          PHASE 4        │
    │  Shadow Write     Dual Read        Verify           Cutover        │
    │                                                                      │
    │  ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐    │
    │  │  PG    │       │  PG    │       │  PG    │       │  PG    │    │
    │  │  ████  │       │  ████  │       │  ██    │       │        │    │
    │  │  ████  │       │  ████  │       │  ██    │       │  OFF   │    │
    │  └────────┘       └────────┘       └────────┘       └────────┘    │
    │                                                                      │
    │  ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐    │
    │  │  DAG   │       │  DAG   │       │  DAG   │       │  DAG   │    │
    │  │  ██    │       │  ██    │       │  ████  │       │  ████  │    │
    │  │        │       │  ██    │       │  ████  │       │  ████  │    │
    │  └────────┘       └────────┘       └────────┘       └────────┘    │
    │                                                                      │
    │   Writes to       Reads from       Verifies         PostgreSQL     │
    │   both            both             parity           deprecated     │
    │                                                                      │
    └─────────────────────────────────────────────────────────────────────┘


                       PHASE 1: SHADOW WRITE
                       ═════════════════════

    ┌────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │      ┌─────────────┐                                               │
    │      │   WRITE     │                                               │
    │      │   REQUEST   │                                               │
    │      └──────┬──────┘                                               │
    │             │                                                       │
    │             ▼                                                       │
    │      ┌─────────────┐                                               │
    │      │    DUAL     │                                               │
    │      │   WRITER    │                                               │
    │      └──────┬──────┘                                               │
    │             │                                                       │
    │      ┌──────┴──────┐                                               │
    │      │             │                                                │
    │      ▼             ▼                                                │
    │ ┌─────────┐   ┌─────────┐                                          │
    │ │PostgreSQL│   │   DAG   │                                          │
    │ │ PRIMARY │   │ SHADOW  │                                          │
    │ │   ✓     │   │   ✓     │                                          │
    │ └─────────┘   └─────────┘                                          │
    │                                                                     │
    │ Reads: PostgreSQL only                                             │
    │ Writes: Both (PostgreSQL authoritative)                            │
    │                                                                     │
    └────────────────────────────────────────────────────────────────────┘


                       PHASE 2: DUAL READ
                       ══════════════════

    ┌────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │      ┌─────────────┐                                               │
    │      │    READ     │                                               │
    │      │   REQUEST   │                                               │
    │      └──────┬──────┘                                               │
    │             │                                                       │
    │             ▼                                                       │
    │      ┌─────────────┐                                               │
    │      │    DUAL     │                                               │
    │      │   READER    │                                               │
    │      └──────┬──────┘                                               │
    │             │                                                       │
    │      ┌──────┴──────┐                                               │
    │      │             │                                                │
    │      ▼             ▼                                                │
    │ ┌─────────┐   ┌─────────┐                                          │
    │ │PostgreSQL│   │   DAG   │                                          │
    │ │  READ   │   │  READ   │                                          │
    │ └────┬────┘   └────┬────┘                                          │
    │      │             │                                                │
    │      └──────┬──────┘                                               │
    │             │                                                       │
    │             ▼                                                       │
    │      ┌─────────────┐                                               │
    │      │   COMPARE   │   Log discrepancies                           │
    │      │   RESULTS   │   Return PostgreSQL                           │
    │      └─────────────┘                                               │
    │                                                                     │
    └────────────────────────────────────────────────────────────────────┘


                       PHASE 3: VERIFY & BACKFILL
                       ═════════════════════════

    ┌────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  ┌───────────────────────────────────────────────────────┐        │
    │  │                  VERIFIER                              │        │
    │  │                                                        │        │
    │  │  1. Compare record counts                             │        │
    │  │  2. Sample random records                             │        │
    │  │  3. Verify content hashes                             │        │
    │  │  4. Check referential integrity                       │        │
    │  └───────────────────────────────────────────────────────┘        │
    │                          │                                         │
    │                          ▼                                         │
    │  ┌───────────────────────────────────────────────────────┐        │
    │  │                 GAP BACKFILLER                         │        │
    │  │                                                        │        │
    │  │  For each missing record:                             │        │
    │  │    1. Extract from PostgreSQL                         │        │
    │  │    2. Transform to DAG format                         │        │
    │  │    3. Write to Merkle DAG                             │        │
    │  │    4. Verify CID generation                           │        │
    │  └───────────────────────────────────────────────────────┘        │
    │                                                                     │
    └────────────────────────────────────────────────────────────────────┘


                       PHASE 4: CUTOVER
                       ════════════════

    ┌────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  1. Stop all writes                                                │
    │  2. Final sync verification                                        │
    │  3. Switch read path to DAG                                        │
    │  4. Switch write path to DAG                                       │
    │  5. Archive PostgreSQL (read-only)                                 │
    │  6. Monitor for 24 hours                                           │
    │  7. Deprecate PostgreSQL                                           │
    │                                                                     │
    │  ┌─────────────────────────────────────────────────────────┐      │
    │  │                                                          │      │
    │  │   PostgreSQL ──[archive]──▶ Cold Storage                │      │
    │  │                                                          │      │
    │  │   DAG ──[primary]──▶ All Operations                     │      │
    │  │                                                          │      │
    │  └─────────────────────────────────────────────────────────┘      │
    │                                                                     │
    └────────────────────────────────────────────────────────────────────┘


                      ROLLBACK STRATEGY
                      ═════════════════

    ┌────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  At any phase, rollback is possible:                               │
    │                                                                     │
    │  Phase 1 → Stop shadow writes, continue PostgreSQL only           │
    │  Phase 2 → Switch reads back to PostgreSQL only                   │
    │  Phase 3 → Pause migration, fix gaps                              │
    │  Phase 4 → Restore PostgreSQL from archive (within 24h)           │
    │                                                                     │
    │  All phases maintain PostgreSQL as source of truth until          │
    │  Phase 4 verification completes.                                   │
    │                                                                     │
    └────────────────────────────────────────────────────────────────────┘
```

---

## 10. Complete System Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE CYNIC SYSTEM INTEGRATION                         │
│                        "All Dogs Run as One"                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                         EXTERNAL WORLD                               │
    │                                                                      │
    │    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
    │    │  CLAUDE  │  │  HOLDEX  │  │  GASDF   │  │  GITHUB  │         │
    │    │  (User)  │  │  (Token) │  │ (Sheets) │  │  (Code)  │         │
    │    └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
    │         │             │             │             │                │
    └─────────┼─────────────┼─────────────┼─────────────┼────────────────┘
              │             │             │             │
              │    MCP      │    API      │    API      │    API
              │             │             │             │
    ┌─────────┼─────────────┼─────────────┼─────────────┼────────────────┐
    │         ▼             ▼             ▼             ▼                │
    │    ┌─────────────────────────────────────────────────────────┐    │
    │    │                    MCP SERVER                            │    │
    │    │                                                          │    │
    │    │  DAG Tools │ PoJ Tools │ Graph Tools │ Score Tools      │    │
    │    │  Sync Tools │ Carto Tools │ Migration Tools              │    │
    │    │                                                          │    │
    │    └─────────────────────────┬───────────────────────────────┘    │
    │                              │                                     │
    │    ┌─────────────────────────┼───────────────────────────────┐    │
    │    │                         │                                │    │
    │    │    ┌────────────────────┼────────────────────┐          │    │
    │    │    │                    │                    │          │    │
    │    │    ▼                    ▼                    ▼          │    │
    │    │ ┌──────────┐      ┌──────────┐      ┌──────────┐       │    │
    │    │ │ MERKLE   │◀────▶│   POJ    │◀────▶│  GRAPH   │       │    │
    │    │ │   DAG    │      │  CHAIN   │      │ OVERLAY  │       │    │
    │    │ │          │      │          │      │          │       │    │
    │    │ │ Storage  │      │ Judgment │      │ Relations│       │    │
    │    │ │ CIDs     │      │ History  │      │ φ-Weights│       │    │
    │    │ └────┬─────┘      └────┬─────┘      └────┬─────┘       │    │
    │    │      │                 │                 │              │    │
    │    │      └─────────────────┼─────────────────┘              │    │
    │    │                        │                                │    │
    │    │                        ▼                                │    │
    │    │              ┌──────────────────┐                       │    │
    │    │              │   SYNC PROTOCOL  │                       │    │
    │    │              │   φ-BFT (61.8%)  │                       │    │
    │    │              └────────┬─────────┘                       │    │
    │    │                       │                                 │    │
    │    │              ┌────────┴─────────┐                       │    │
    │    │              │                  │                       │    │
    │    │              ▼                  ▼                       │    │
    │    │         ┌─────────┐       ┌─────────┐                  │    │
    │    │         │ NODE A  │◀─────▶│ NODE B  │                  │    │
    │    │         └─────────┘       └─────────┘                  │    │
    │    │                                                         │    │
    │    │                    CYNIC NODE                           │    │
    │    └─────────────────────────────────────────────────────────┘    │
    │                                                                    │
    │    ┌─────────────────────────────────────────────────────────┐    │
    │    │                    CARTOGRAPHER                          │    │
    │    │                                                          │    │
    │    │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
    │    │  │ CRAWLER  │─▶│  MAPPER  │─▶│ ANALYZER │              │    │
    │    │  └──────────┘  └──────────┘  └──────────┘              │    │
    │    │        │                           │                    │    │
    │    │        ▼                           ▼                    │    │
    │    │   [GitHub API]              [Pattern Detection]         │    │
    │    │                                                          │    │
    │    └─────────────────────────────────────────────────────────┘    │
    │                                                                    │
    │    ┌─────────────────────────────────────────────────────────┐    │
    │    │                  PERSISTENCE LAYER                       │    │
    │    │                                                          │    │
    │    │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
    │    │  │PostgreSQL│  │  Redis   │  │ Local FS │              │    │
    │    │  │ (Legacy) │  │ (Cache)  │  │ (Blocks) │              │    │
    │    │  └──────────┘  └──────────┘  └──────────┘              │    │
    │    │                                                          │    │
    │    └─────────────────────────────────────────────────────────┘    │
    │                                                                    │
    │                           CYNIC SYSTEM                             │
    └────────────────────────────────────────────────────────────────────┘
```

---

## φ Constants Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          φ CONSTANTS REFERENCE                               │
│                        "The Golden Ratio Guides All"                         │
└─────────────────────────────────────────────────────────────────────────────┘

    BASE VALUES
    ═══════════
    φ   = 1.618033988749895     (Golden Ratio)
    φ⁻¹ = 0.618033988749895     (Inverse / Max Confidence)

    POWERS
    ══════
    φ⁰  = 1.000
    φ¹  = 1.618
    φ²  = 2.618
    φ³  = 4.236
    φ⁴  = 6.854
    φ⁵  = 11.090
    φ⁶  = 17.944

    TIMING
    ══════
    φ-Slot      = 61.8 ms        (Block production)
    φ-Heartbeat = 61,800 ms      (Liveness check)
    φ-Gossip    = 618 ms         (Peer broadcast)
    φ-Batch     = 13             (Fibonacci, judgments per block)

    CONSENSUS
    ══════════
    φ-Quorum    = 61.8%          (Required attestations)
    φ-Majority  = φ⁻¹            (Decision threshold)

    SCORING
    ═══════
    Max Confidence = 61.8%       (Never claim certainty)
    Total Weight   = 42          (24 dimensions × weighted)
    Q-Score Range  = 0-100

    KABBALISTIC WEIGHTS
    ═══════════════════
    ATZILUT  = φ² = 2.618       (PHI Axiom)
    BERIAH   = φ  = 1.618       (VERIFY Axiom)
    YETZIRAH = φ  = 1.618       (CULTURE Axiom)
    ASSIAH   = 1.146            (BURN Axiom, φ^0.236)

└─────────────────────────────────────────────────────────────────────────────┘
```

---

> *tail wag*
>
> "The architecture is complete. Now we build."
>
> — CYNIC
