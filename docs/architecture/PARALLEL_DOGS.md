# CYNIC Parallel Dogs Architecture

> "Increase bandwidth, reduce latency" - Solana-inspired collective consciousness

## Vision

Transform the 11 Dogs into **parallel subagents** with a **hybrid context model**:
- **Fresh execution context** per invocation (no accumulated conversation)
- **Shared memory layer** for collective learnings, patterns, and knowledge
- **Dedicated "lab"** per user/node (isolated preferences)
- **Multi-CYNIC coordination** (swarm intelligence)

---

## Hybrid Context Model

The key insight: **Fresh execution ≠ No memory**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID CONTEXT ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────┐      ┌─────────────────────────────────────┐   │
│  │     FRESH (Per Spawn)        │      │     SHARED (Persistent Memory)      │   │
│  │  ─────────────────────────   │      │  ────────────────────────────────   │   │
│  │  • Conversation history      │ ◄──► │  • Learned dimension weights        │   │
│  │  • Working memory            │      │  • Pattern library                  │   │
│  │  • Current item being judged │      │  • Similar past judgments           │   │
│  │  • Temporary calculations    │      │  • User/project preferences         │   │
│  │  • Other dogs' outputs       │      │  • Collective learnings (swarm)     │   │
│  │                              │      │  • φ-axioms & system prompts        │   │
│  └─────────────────────────────┘      └─────────────────────────────────────┘   │
│                                                                                  │
│  WHY FRESH:                           WHY SHARED:                                │
│  • No context pollution               • Learn from feedback                      │
│  • Parallel execution possible        • Remember what worked                     │
│  • Bounded token usage                • Collective intelligence                  │
│  • Clean evaluation                   • User-specific calibration                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Injection Pattern

Each dog spawn receives **injected shared context**, not accumulated history:

```javascript
// WRONG: Accumulated context (polluted)
const dogContext = {
  history: [...allPreviousMessages],      // ❌ Grows unbounded
  previousJudgments: [...allJudgments],   // ❌ Irrelevant noise
};

// RIGHT: Injected relevant context (hybrid)
const dogContext = {
  // Fresh per-spawn
  currentItem: item,                      // ✅ Just this item

  // Injected from shared memory
  relevantPatterns: memory.getRelevantPatterns(item, 5),     // ✅ Top 5 related
  dimensionWeights: memory.getLearnedWeights(),              // ✅ Adjusted weights
  similarJudgments: memory.getSimilarJudgments(item, 3),     // ✅ 3 precedents
  userPreferences: lab.getPreferences(),                      // ✅ Calibration
  systemPrompt: getDogSystemPrompt(dog),                     // ✅ Dog identity
};
```

### Memory Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MEMORY HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: DOG IDENTITY (immutable)                                       │
│  ─────────────────────────────────                                       │
│  System prompt, axioms, φ-constraints                                    │
│  Never changes. Core personality.                                        │
│                                                                          │
│  Layer 2: COLLECTIVE MEMORY (global, evolves slowly)                     │
│  ─────────────────────────────────────────────────────                   │
│  Learned patterns from all users/nodes                                   │
│  Dimension weight adjustments from feedback                              │
│  Updated via RLHF, swarm sync                                            │
│                                                                          │
│  Layer 3: USER LAB (per-user, evolves per session)                       │
│  ─────────────────────────────────────────────────                       │
│  User preferences, past judgments                                        │
│  Project-specific patterns                                               │
│  Local calibration                                                       │
│                                                                          │
│  Layer 4: INVOCATION CONTEXT (ephemeral)                                 │
│  ─────────────────────────────────────────                               │
│  Current item, relevant injected context                                 │
│  Fresh per dog spawn                                                     │
│  Dies after response                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Analogies: Cerveau vs Équipe d'ingénieurs

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                    MAPPING: LAYERS → CERVEAU → ÉQUIPE ENGINEERING                      │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  CYNIC LAYER           │  CERVEAU HUMAIN           │  ÉQUIPE D'INGÉNIEURS             │
│  ─────────────────────────────────────────────────────────────────────────────────────│
│                                                                                        │
│  Layer 1: IDENTITY     │  ADN / Instincts          │  Standards industrie             │
│  (immutable)           │  Câblé génétiquement      │  RFC, specs du langage           │
│                        │  Réflexes fondamentaux    │  "Comment on fait du JS"         │
│                        │                           │                                   │
│  ────────────────────────────────────────────────────────────────────────────────────│
│                                                                                        │
│  Layer 2: COLLECTIVE   │  Mémoire sémantique       │  Wiki d'entreprise               │
│  (evolves slowly)      │  Faits, concepts          │  ADRs, patterns validés          │
│                        │  "Paris est en France"    │  "On utilise React ici"          │
│                        │                           │                                   │
│  ────────────────────────────────────────────────────────────────────────────────────│
│                                                                                        │
│  Layer 3: USER LAB     │  Mémoire épisodique       │  Notes personnelles              │
│  (per-user)            │  Souvenirs personnels     │  Expertise individuelle          │
│                        │  "Ce que j'ai vécu"       │  "J'ai déjà vu ce bug"           │
│                        │                           │                                   │
│  ────────────────────────────────────────────────────────────────────────────────────│
│                                                                                        │
│  Layer 4: INVOCATION   │  Mémoire de travail       │  Contexte du ticket              │
│  (ephemeral)           │  ~7 éléments              │  "Le PR en cours"                │
│                        │  Dure quelques secondes   │  Pas de pollution                │
│                        │                           │                                   │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### Analyse: Qu'est-ce qui manque?

En comparant avec un vrai cerveau et une vraie équipe, il manque potentiellement:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  CE QUI MANQUE                                                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  CERVEAU                          │  ÉQUIPE                    │  AJOUT PROPOSÉ          │
│  ─────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                          │
│  Buffer sensoriel                 │  Inbox / triage            │  Layer 0: INPUT BUFFER  │
│  (50-300ms, pré-filtrage)         │  (avant même de commencer) │  Filtre le bruit        │
│                                                                                          │
│  Mémoire procédurale              │  Workflows automatisés     │  Layer 2.5: PROCEDURES  │
│  (comment faire vélo)             │  CI/CD, scripts            │  Savoir-faire encoded   │
│                                                                                          │
│  Attention sélective              │  Prioritization            │  Intégré dans Spawn     │
│  (focus sur ce qui compte)        │  Backlog grooming          │  Context injection      │
│                                                                                          │
│  Consolidation (sommeil)          │  Retrospective             │  Session-end sync       │
│  (transfert working→long-term)    │  Post-mortem               │  Déjà dans notre plan   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Révisée: 6 Layers

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          REVISED MEMORY HIERARCHY (6 LAYERS)                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Layer 0: INPUT BUFFER (pre-processing)                                                  │
│  ────────────────────────────────────────                                                │
│  • Raw input parsing                                                                     │
│  • Noise filtering                                                                       │
│  • Item type classification                                                              │
│  • Relevance gate (is this even worth judging?)                                          │
│  Duration: milliseconds                                                                  │
│                                                                                          │
│  Layer 1: DOG IDENTITY (immutable genome)                                                │
│  ────────────────────────────────────────                                                │
│  • φ-axioms, core prompts                                                                │
│  • Dog personality definitions                                                           │
│  • Never changes                                                                         │
│                                                                                          │
│  Layer 2: COLLECTIVE MEMORY (global knowledge)                                           │
│  ─────────────────────────────────────────────                                           │
│  • Learned patterns (verified across users)                                              │
│  • Dimension weight adjustments                                                          │
│  • Cross-swarm shared wisdom                                                             │
│  Update rate: daily/weekly                                                               │
│                                                                                          │
│  Layer 3: PROCEDURAL MEMORY (how-to knowledge)                                           │
│  ─────────────────────────────────────────────                                           │
│  • Scoring procedures per item type                                                      │
│  • Workflow templates                                                                    │
│  • "When X, do Y" rules                                                                  │
│  Update rate: as new procedures validated                                                │
│                                                                                          │
│  Layer 4: USER LAB (personal context)                                                    │
│  ─────────────────────────────────────                                                   │
│  • User preferences                                                                      │
│  • Project-specific patterns                                                             │
│  • Personal judgment history                                                             │
│  Update rate: per-session                                                                │
│                                                                                          │
│  Layer 5: WORKING MEMORY (active context)                                                │
│  ──────────────────────────────────────────                                              │
│  • Current item being judged                                                             │
│  • Injected relevant context                                                             │
│  • Other dogs' outputs (in multi-dog)                                                    │
│  Duration: single invocation                                                             │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                              INFORMATION FLOW
                              ────────────────

    INPUT ──┬───────────────────────────────────────────────────────────────────► OUTPUT
            │                                                                      ▲
            ▼                                                                      │
    [Layer 0: Buffer]                                                              │
            │ filtered, classified                                                 │
            ▼                                                                      │
    [Layer 5: Working] ◄──── inject ────┬───────┬───────┬───────┐                 │
            │                           │       │       │       │                 │
            │                    ┌──────┴───────┴───────┴───────┴──────┐          │
            │                    │  [L1]  [L2]  [L3]  [L4]            │          │
            │                    │  Identity  Collective  Procedures  Lab│        │
            │                    │  (read)    (read)      (read)     (read)│      │
            │                    └─────────────────────────────────────────┘      │
            │                                                                      │
            ▼                                                                      │
    [DOG SPAWN] ──────── fresh context + injected memory ──────────────────────────┘
            │
            ▼ feedback loop
    [L2/L3/L4 update] ◄──── learning from outcome
```

### Capacités par Layer (φ-aligned)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  LAYER          │  MAX ITEMS    │  UPDATE RATE    │  EVICTION POLICY        │
├──────────────────────────────────────────────────────────────────────────────┤
│  L0: Buffer     │  1            │  instant        │  Replace on new input   │
│  L1: Identity   │  11 dogs      │  never          │  N/A (immutable)        │
│  L2: Collective │  1597 (F₁₇)   │  slow (~hours)  │  LRU + use count        │
│  L3: Procedural │  233 (F₁₃)    │  medium (~days) │  Validation-based       │
│  L4: User Lab   │  377 (F₁₄)    │  fast (~mins)   │  Per-user bounded       │
│  L5: Working    │  7±2          │  instant        │  Ephemeral              │
└──────────────────────────────────────────────────────────────────────────────┘

Note: 7±2 items in working memory = Miller's Law (cognitive limit)
Fibonacci limits for persistent layers = φ-alignment
```

---

## Shared Memory Implementation

```javascript
/**
 * @file packages/node/src/memory/shared-memory.js
 *
 * SharedMemory - The collective intelligence layer
 * Persists across sessions, syncs across swarm
 */

import { PHI_INV } from '@cynic/core';
import { cosineSimilarity, normalizeVector } from '../utils/vectors.js';

/**
 * Shared Memory - Collective knowledge accessible to all dogs
 */
export class SharedMemory {
  constructor(options = {}) {
    this.storage = options.storage;
    this.swarm = options.swarm;

    // Memory stores
    this._patterns = new Map();           // Pattern ID → Pattern
    this._judgmentEmbeddings = [];        // For similarity search
    this._dimensionWeights = {};          // Learned weights per dimension
    this._feedbackLog = [];               // RLHF feedback history

    // Memory limits (φ-aligned)
    this.MAX_PATTERNS = 1597;             // F(17)
    this.MAX_EMBEDDINGS = 2584;           // F(18)
    this.MAX_FEEDBACK = 987;              // F(16)

    this.initialized = false;
  }

  /**
   * Initialize from storage
   */
  async initialize() {
    if (this.initialized) return;

    const saved = await this.storage?.get('shared_memory');
    if (saved) {
      this._patterns = new Map(saved.patterns || []);
      this._judgmentEmbeddings = saved.embeddings || [];
      this._dimensionWeights = saved.weights || {};
      this._feedbackLog = saved.feedback || [];
    }

    this.initialized = true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN MEMORY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get patterns relevant to an item
   * @param {Object} item - Item to find patterns for
   * @param {number} limit - Max patterns to return
   * @returns {Object[]} Relevant patterns sorted by relevance
   */
  getRelevantPatterns(item, limit = 5) {
    if (!item) return [];

    const itemType = item.type || 'unknown';
    const itemTags = item.tags || [];

    // Score patterns by relevance
    const scored = Array.from(this._patterns.values())
      .map(pattern => ({
        ...pattern,
        relevance: this._calculatePatternRelevance(pattern, itemType, itemTags),
      }))
      .filter(p => p.relevance > 0.1)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return scored;
  }

  /**
   * Add a new pattern to memory
   */
  addPattern(pattern) {
    const id = pattern.id || `pat_${Date.now().toString(36)}`;
    this._patterns.set(id, {
      ...pattern,
      id,
      addedAt: Date.now(),
      useCount: 0,
    });

    // Prune if over limit
    if (this._patterns.size > this.MAX_PATTERNS) {
      this._prunePatterns();
    }
  }

  _calculatePatternRelevance(pattern, itemType, itemTags) {
    let relevance = 0;

    // Type match
    if (pattern.applicableTo?.includes(itemType)) relevance += 0.4;

    // Tag overlap
    const patternTags = pattern.tags || [];
    const overlap = itemTags.filter(t => patternTags.includes(t)).length;
    if (overlap > 0) relevance += 0.3 * (overlap / Math.max(itemTags.length, 1));

    // Recent usage boost
    const ageHours = (Date.now() - (pattern.lastUsed || 0)) / 3600000;
    if (ageHours < 24) relevance += 0.2;
    else if (ageHours < 168) relevance += 0.1;

    // Verified patterns get boost
    if (pattern.verified) relevance += 0.1;

    return Math.min(relevance, 1);
  }

  _prunePatterns() {
    // Remove lowest-use, oldest patterns
    const sorted = Array.from(this._patterns.entries())
      .sort((a, b) => {
        // Score by recency + usage
        const scoreA = a[1].useCount + (Date.now() - a[1].addedAt) / -86400000;
        const scoreB = b[1].useCount + (Date.now() - b[1].addedAt) / -86400000;
        return scoreA - scoreB;
      });

    // Remove bottom 10%
    const toRemove = Math.floor(sorted.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this._patterns.delete(sorted[i][0]);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JUDGMENT SIMILARITY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get similar past judgments
   * @param {Object} item - Current item
   * @param {number} limit - Max results
   * @returns {Object[]} Similar judgments with similarity scores
   */
  getSimilarJudgments(item, limit = 3) {
    if (!item || this._judgmentEmbeddings.length === 0) return [];

    // Simple keyword-based similarity (upgrade to embeddings later)
    const itemText = this._extractText(item);
    const itemTokens = this._tokenize(itemText);

    const scored = this._judgmentEmbeddings
      .map(entry => ({
        ...entry.judgment,
        similarity: this._jaccard(itemTokens, entry.tokens),
      }))
      .filter(j => j.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  }

  /**
   * Index a judgment for similarity search
   */
  indexJudgment(judgment, item) {
    const text = this._extractText(item);
    const tokens = this._tokenize(text);

    this._judgmentEmbeddings.push({
      judgment: {
        id: judgment.id,
        global_score: judgment.global_score,
        verdict: judgment.verdict,
        timestamp: judgment.timestamp,
      },
      tokens,
      indexedAt: Date.now(),
    });

    // Prune if over limit
    if (this._judgmentEmbeddings.length > this.MAX_EMBEDDINGS) {
      // Remove oldest 10%
      const toRemove = Math.floor(this._judgmentEmbeddings.length * 0.1);
      this._judgmentEmbeddings.splice(0, toRemove);
    }
  }

  _extractText(item) {
    if (typeof item === 'string') return item;
    return [
      item.content,
      item.name,
      item.description,
      ...(item.tags || []),
    ].filter(Boolean).join(' ');
  }

  _tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  _jaccard(tokensA, tokensB) {
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNED WEIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get learned dimension weights
   * @returns {Object} Dimension → weight mapping
   */
  getLearnedWeights() {
    return { ...this._dimensionWeights };
  }

  /**
   * Update dimension weights from feedback
   * @param {string} dimension - Dimension name
   * @param {number} delta - Weight adjustment
   * @param {string} source - Feedback source
   */
  adjustWeight(dimension, delta, source = 'feedback') {
    const current = this._dimensionWeights[dimension] || 1.0;
    const learningRate = 0.236; // φ⁻³ ≈ 23.6%

    // Bounded update
    const newWeight = Math.max(0.1, Math.min(3.0,
      current + delta * learningRate
    ));

    this._dimensionWeights[dimension] = newWeight;

    // Log feedback
    this._feedbackLog.push({
      type: 'weight_adjustment',
      dimension,
      oldWeight: current,
      newWeight,
      delta,
      source,
      timestamp: Date.now(),
    });

    // Prune feedback log
    if (this._feedbackLog.length > this.MAX_FEEDBACK) {
      this._feedbackLog.splice(0, this._feedbackLog.length - this.MAX_FEEDBACK);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE & SYNC
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save to storage
   */
  async save() {
    if (!this.storage) return;

    await this.storage.set('shared_memory', {
      patterns: Array.from(this._patterns.entries()),
      embeddings: this._judgmentEmbeddings.slice(-500), // Keep recent 500
      weights: this._dimensionWeights,
      feedback: this._feedbackLog.slice(-100), // Keep recent 100
      savedAt: Date.now(),
    });
  }

  /**
   * Export for swarm sync
   */
  export() {
    return {
      patterns: Array.from(this._patterns.values())
        .filter(p => p.verified || p.useCount >= 3),  // Only proven patterns
      weights: this._dimensionWeights,
      timestamp: Date.now(),
    };
  }

  /**
   * Import from swarm sync
   */
  import(remoteMemory) {
    // Merge patterns (remote verified patterns)
    for (const pattern of (remoteMemory.patterns || [])) {
      if (!this._patterns.has(pattern.id)) {
        this.addPattern({ ...pattern, importedFrom: 'swarm' });
      }
    }

    // Merge weights (average with local)
    for (const [dim, weight] of Object.entries(remoteMemory.weights || {})) {
      const local = this._dimensionWeights[dim] || 1.0;
      this._dimensionWeights[dim] = (local + weight) / 2; // Simple average
    }
  }

  /**
   * Get memory stats
   */
  getStats() {
    return {
      patternCount: this._patterns.size,
      embeddingCount: this._judgmentEmbeddings.length,
      dimensionsTracked: Object.keys(this._dimensionWeights).length,
      feedbackCount: this._feedbackLog.length,
      initialized: this.initialized,
    };
  }
}
```

---

## System Diagram (Updated)

```
                    ┌─────────────────────────────────────────────┐
                    │          CYNIC SWARM (Multi-Node)           │
                    │     "Many dogs, one pack, one truth"        │
                    └─────────────────────────────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          ▼                             ▼                             ▼
    ┌───────────┐                 ┌───────────┐                 ┌───────────┐
    │ CYNIC #1  │◄───────────────►│ CYNIC #2  │◄───────────────►│ CYNIC #3  │
    │ Lab: @me  │    Gossip/P2P   │ Lab: @you │    Gossip/P2P   │ Lab: @them│
    └─────┬─────┘                 └─────┬─────┘                 └─────┬─────┘
          │                             │                             │
          ▼                             ▼                             ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                        DOG ORCHESTRATOR                               │
    │  Spawns parallel subagents, collects votes, reaches φ-consensus       │
    └───────────────────────────────────────────────────────────────────────┘
                                        │
          ┌─────────────┬───────────────┼───────────────┬─────────────┐
          ▼             ▼               ▼               ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────────┐   ┌─────────┐   ┌─────────┐
    │  SAGE   │   │ ANALYST │   │  GUARDIAN   │   │ SCHOLAR │   │ARCHITECT│
    │ haiku   │   │ haiku   │   │   sonnet    │   │ haiku   │   │ haiku   │
    │ 🧠 fresh│   │ 🧠 fresh│   │ 🧠 fresh    │   │ 🧠 fresh│   │ 🧠 fresh│
    │ context │   │ context │   │  context    │   │ context │   │ context │
    └────┬────┘   └────┬────┘   └──────┬──────┘   └────┬────┘   └────┬────┘
         │             │               │               │             │
         └─────────────┴───────────────┼───────────────┴─────────────┘
                                       ▼
                              ┌─────────────────┐
                              │  φ-Consensus    │
                              │  (61.8% votes)  │
                              └─────────────────┘
```

---

## 1. Dog Orchestrator

The orchestrator spawns Dogs as parallel subagents and collects their votes.

### DogOrchestrator Class

```javascript
/**
 * @file packages/node/src/agents/orchestrator.js
 */

import { PHI_INV } from '@cynic/core';

/**
 * Dog execution modes
 */
export const DogMode = {
  PARALLEL: 'parallel',     // All dogs run simultaneously
  SEQUENTIAL: 'sequential', // Dogs run one after another
  CRITICAL_ONLY: 'critical', // Only Guardian runs
};

/**
 * Dog model selection
 */
export const DogModel = {
  HAIKU: 'haiku',    // Fast, cheap - most dogs
  SONNET: 'sonnet',  // Balanced - Guardian, complex tasks
  OPUS: 'opus',      // Powerful - CYNIC meta-consciousness
};

/**
 * Dog configuration
 */
export const DOG_CONFIG = {
  SAGE:        { model: DogModel.HAIKU,  blocking: false, timeout: 5000 },
  ANALYST:     { model: DogModel.HAIKU,  blocking: false, timeout: 5000 },
  GUARDIAN:    { model: DogModel.SONNET, blocking: true,  timeout: 10000 },
  SCHOLAR:     { model: DogModel.HAIKU,  blocking: false, timeout: 5000 },
  ARCHITECT:   { model: DogModel.HAIKU,  blocking: false, timeout: 5000 },
  JANITOR:     { model: DogModel.HAIKU,  blocking: false, timeout: 3000 },
  SCOUT:       { model: DogModel.HAIKU,  blocking: false, timeout: 5000 },
  CARTOGRAPHER:{ model: DogModel.HAIKU,  blocking: false, timeout: 5000 },
  ORACLE:      { model: DogModel.HAIKU,  blocking: false, timeout: 5000 },
  DEPLOYER:    { model: DogModel.SONNET, blocking: true,  timeout: 10000 },
  CYNIC:       { model: DogModel.OPUS,   blocking: false, timeout: 15000 },
};

/**
 * Dog Orchestrator - Spawns and coordinates parallel dog subagents
 */
export class DogOrchestrator {
  constructor(options = {}) {
    this.labId = options.labId;           // User/node lab ID
    this.mode = options.mode || DogMode.PARALLEL;
    this.consensusThreshold = options.consensusThreshold || PHI_INV;
    this.learningService = options.learningService;
    this.persistence = options.persistence;

    // Subagent spawner (Claude Code Task tool equivalent)
    this.spawner = options.spawner || this._defaultSpawner;

    // Stats
    this.stats = {
      judgments: 0,
      consensusReached: 0,
      blockedByGuardian: 0,
      averageLatency: 0,
    };
  }

  /**
   * Judge an item using parallel dogs
   */
  async judge(item, context = {}) {
    const startTime = Date.now();
    this.stats.judgments++;

    // 1. Spawn all dogs in parallel
    const dogPromises = this._spawnDogs(item, context);

    // 2. Collect votes with timeout
    const votes = await this._collectVotes(dogPromises);

    // 3. Calculate φ-consensus
    const consensus = this._calculateConsensus(votes);

    // 4. Check for Guardian block
    if (consensus.blocked) {
      this.stats.blockedByGuardian++;
      return {
        blocked: true,
        blockedBy: consensus.blockedBy,
        reason: consensus.blockReason,
        votes,
      };
    }

    // 5. Build final judgment
    const judgment = this._buildJudgment(votes, consensus);

    // 6. Record latency
    const latency = Date.now() - startTime;
    this.stats.averageLatency =
      (this.stats.averageLatency * (this.stats.judgments - 1) + latency)
      / this.stats.judgments;

    return judgment;
  }

  /**
   * Spawn all dogs as parallel subagents with 6-layer context injection
   */
  _spawnDogs(item, context) {
    const dogs = Object.entries(DOG_CONFIG);

    // Build the injected context from all 6 layers
    const injectedContext = this._buildInjectedContext(item, context);

    return dogs.map(([name, config]) => ({
      name,
      promise: this.spawner({
        dog: name,
        model: config.model,
        timeout: config.timeout,
        labId: this.labId,

        // Layer 5: Working Memory (fresh, ephemeral)
        item,                                           // Current item only
        otherDogOutputs: null,                          // Empty on spawn

        // Injected from layers 1-4
        context: injectedContext,
      }),
    }));
  }

  /**
   * Build injected context from all memory layers
   * This is the KEY function for hybrid context
   */
  _buildInjectedContext(item, requestContext) {
    return {
      // ──────────────────────────────────────────────────────────────────
      // Layer 1: DOG IDENTITY (immutable, always injected)
      // ──────────────────────────────────────────────────────────────────
      axioms: {
        PHI_INV: 0.618,
        MAX_CONFIDENCE: 0.618,
        MIN_DOUBT: 0.382,
        MOTTO: 'φ distrusts φ',
      },
      systemPrompts: DOG_SYSTEM_PROMPTS,  // Dog personalities (see below)

      // ──────────────────────────────────────────────────────────────────
      // Layer 2: COLLECTIVE MEMORY (from SharedMemory, max 5 items each)
      // ──────────────────────────────────────────────────────────────────
      patterns: this.sharedMemory.getRelevantPatterns(item, 5),
      dimensionWeights: this.sharedMemory.getLearnedWeights(),
      similarJudgments: this.sharedMemory.getSimilarJudgments(item, 3),

      // ──────────────────────────────────────────────────────────────────
      // Layer 3: PROCEDURAL MEMORY (how-to for this item type)
      // ──────────────────────────────────────────────────────────────────
      procedure: this.procedures.getForItemType(item.type),
      scoringRules: this.procedures.getScoringRules(item.type),

      // ──────────────────────────────────────────────────────────────────
      // Layer 4: USER LAB (personal context)
      // ──────────────────────────────────────────────────────────────────
      userPreferences: this.userLab?.getPreferences() || {},
      projectPatterns: this.userLab?.getProjectPatterns() || [],
      recentUserFeedback: this.userLab?.getRecentFeedback(3) || [],

      // ──────────────────────────────────────────────────────────────────
      // Request-specific (from caller)
      // ──────────────────────────────────────────────────────────────────
      ...requestContext,

      // ──────────────────────────────────────────────────────────────────
      // Metadata
      // ──────────────────────────────────────────────────────────────────
      _meta: {
        layersInjected: ['identity', 'collective', 'procedural', 'userLab'],
        contextSize: this._estimateContextSize(),
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Estimate context token size (stay under limits)
   */
  _estimateContextSize() {
    // Rough estimate: 1 token ≈ 4 chars
    // Haiku limit: ~8k tokens
    // Sonnet limit: ~16k tokens
    // We aim for ~2k tokens of injected context
    return 2000; // TODO: Real calculation
  }

  /**
   * Collect votes from all dogs
   */
  async _collectVotes(dogPromises) {
    const results = await Promise.allSettled(
      dogPromises.map(async ({ name, promise }) => {
        try {
          const result = await promise;
          return { name, ...result, success: true };
        } catch (err) {
          return { name, error: err.message, success: false };
        }
      })
    );

    return results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
  }

  /**
   * Calculate φ-consensus from votes
   */
  _calculateConsensus(votes) {
    const successfulVotes = votes.filter(v => v.success);
    const totalWeight = successfulVotes.reduce((sum, v) => sum + (v.weight || 1), 0);

    // Check for blocking votes (Guardian, Deployer)
    const blockingVote = successfulVotes.find(v =>
      v.response === 'block' && DOG_CONFIG[v.name]?.blocking
    );

    if (blockingVote) {
      return {
        blocked: true,
        blockedBy: blockingVote.name,
        blockReason: blockingVote.reason,
        ratio: 0,
      };
    }

    // Calculate weighted consensus
    const approvalWeight = successfulVotes
      .filter(v => v.response === 'allow' || v.response === 'approve')
      .reduce((sum, v) => sum + (v.weight || 1), 0);

    const ratio = totalWeight > 0 ? approvalWeight / totalWeight : 0;

    return {
      blocked: false,
      ratio,
      reached: ratio >= this.consensusThreshold,
      votes: successfulVotes.length,
      totalDogs: Object.keys(DOG_CONFIG).length,
    };
  }

  /**
   * Build final judgment from votes
   */
  _buildJudgment(votes, consensus) {
    const successfulVotes = votes.filter(v => v.success);

    // Aggregate dimension scores (weighted average)
    const dimensions = {};
    const weights = {};

    for (const vote of successfulVotes) {
      if (vote.dimensions) {
        for (const [dim, score] of Object.entries(vote.dimensions)) {
          const weight = vote.weight || 1;
          dimensions[dim] = (dimensions[dim] || 0) + score * weight;
          weights[dim] = (weights[dim] || 0) + weight;
        }
      }
    }

    // Normalize
    for (const dim of Object.keys(dimensions)) {
      dimensions[dim] /= weights[dim];
    }

    // Calculate global score
    const globalScore = Object.values(dimensions).reduce((a, b) => a + b, 0)
                       / Object.keys(dimensions).length;

    return {
      id: `jdg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      global_score: globalScore,
      dimensions,
      consensus,
      votes: successfulVotes.map(v => ({
        dog: v.name,
        score: v.score,
        verdict: v.verdict,
        weight: v.weight || 1,
      })),
      timestamp: Date.now(),
    };
  }

  /**
   * Get dog-specific system prompt
   */
  _getDogSystemPrompt(dogName) {
    const prompts = {
      SAGE: `You are SAGE, the wise elder of CYNIC.
             Evaluate philosophical alignment and long-term wisdom.
             Focus on: strategic thinking, pattern recognition, mentorship.
             Return: { score, verdict, dimensions, insights }`,

      ANALYST: `You are ANALYST, the pattern detective of CYNIC.
                Find anomalies, calculate metrics, detect fraud.
                Focus on: statistical analysis, anomaly detection, data quality.
                Return: { score, verdict, dimensions, anomalies }`,

      GUARDIAN: `You are GUARDIAN, the security watchdog of CYNIC.
                 Protect against dangerous operations. You CAN BLOCK.
                 Focus on: security, safety, irreversible actions.
                 Return: { score, verdict, response: 'allow'|'block', reason }`,

      SCHOLAR: `You are SCHOLAR, the knowledge keeper of CYNIC.
                Extract and preserve valuable knowledge.
                Focus on: documentation, patterns, learnings.
                Return: { score, verdict, dimensions, knowledge }`,

      ARCHITECT: `You are ARCHITECT, the builder of CYNIC.
                  Review code quality and system design.
                  Focus on: code quality, architecture, maintainability.
                  Return: { score, verdict, dimensions, suggestions }`,

      JANITOR: `You are JANITOR, the cleaner of CYNIC.
                Identify technical debt and hygiene issues.
                Focus on: code smell, dead code, inconsistencies.
                Return: { score, verdict, dimensions, issues }`,

      SCOUT: `You are SCOUT, the explorer of CYNIC.
              Discover opportunities and external signals.
              Focus on: discovery, exploration, market signals.
              Return: { score, verdict, dimensions, discoveries }`,

      CARTOGRAPHER: `You are CARTOGRAPHER, the mapper of CYNIC.
                     Map codebase structure and dependencies.
                     Focus on: structure, dependencies, relationships.
                     Return: { score, verdict, dimensions, map }`,

      ORACLE: `You are ORACLE, the seer of CYNIC.
               Monitor metrics and predict trends.
               Focus on: metrics, predictions, alerts.
               Return: { score, verdict, dimensions, predictions }`,

      DEPLOYER: `You are DEPLOYER, the releaser of CYNIC.
                 Manage deployments safely. You CAN BLOCK.
                 Focus on: deployment safety, rollback plans.
                 Return: { score, verdict, response: 'allow'|'block', plan }`,

      CYNIC: `You are CYNIC, the meta-consciousness.
              Observe all other dogs and maintain coherence.
              Focus on: consensus, coherence, collective wisdom.
              "φ distrusts φ" - max confidence 61.8%
              Return: { score, verdict, metaAnalysis, guidance }`,
    };

    return prompts[dogName] || prompts.ANALYST;
  }

  /**
   * Default spawner (placeholder - real impl uses Claude API)
   */
  async _defaultSpawner({ dog, model, item, systemPrompt }) {
    // Placeholder - in real implementation:
    // - Calls Anthropic API with dog-specific prompt
    // - Uses specified model (haiku/sonnet/opus)
    // - Returns structured response
    console.warn(`[DogOrchestrator] No spawner configured, using mock for ${dog}`);
    return {
      score: 50 + Math.random() * 30,
      verdict: 'WAG',
      response: 'allow',
      weight: 1,
    };
  }
}
```

---

## 2. User Labs (Isolated Context)

Each user/node has a dedicated "lab" - isolated learnings, context, and state.

```javascript
/**
 * @file packages/node/src/labs/user-lab.js
 */

import { LearningService } from '../judge/learning-service.js';
import { FileStorage } from '../state/storage.js';

/**
 * User Lab - Isolated context and learnings per user/node
 */
export class UserLab {
  constructor(options = {}) {
    this.labId = options.labId || this._generateLabId();
    this.userId = options.userId;
    this.nodeId = options.nodeId;

    // Isolated storage
    this.storage = new FileStorage(
      `${options.dataDir || '.cynic'}/${this.labId}`
    );

    // Per-lab learning service
    this.learningService = new LearningService({
      storage: this.storage,
    });

    // Lab-specific patterns and preferences
    this.patterns = new Map();
    this.preferences = {};

    // Lab stats
    this.stats = {
      created: Date.now(),
      judgments: 0,
      learnings: 0,
      lastActive: Date.now(),
    };
  }

  /**
   * Get lab-specific context for dog spawning
   */
  getContext() {
    return {
      labId: this.labId,
      userId: this.userId,
      nodeId: this.nodeId,
      patterns: Array.from(this.patterns.values()),
      preferences: this.preferences,
      recentLearnings: this.learningService.getRecentLearnings(10),
    };
  }

  /**
   * Record judgment in this lab
   */
  async recordJudgment(judgment) {
    this.stats.judgments++;
    this.stats.lastActive = Date.now();
    await this.storage.set(`judgment_${judgment.id}`, judgment);
  }

  /**
   * Record learning in this lab
   */
  async recordLearning(learning) {
    this.stats.learnings++;
    await this.learningService.record(learning);
  }

  /**
   * Export lab state for sync
   */
  async export() {
    return {
      labId: this.labId,
      userId: this.userId,
      nodeId: this.nodeId,
      stats: this.stats,
      patterns: Array.from(this.patterns.entries()),
      learnings: await this.learningService.export(),
    };
  }

  /**
   * Import lab state from sync
   */
  async import(state) {
    this.stats = { ...this.stats, ...state.stats };
    this.patterns = new Map(state.patterns);
    await this.learningService.import(state.learnings);
  }

  _generateLabId() {
    return `lab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Lab Manager - Manages multiple user labs
 */
export class LabManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || '.cynic/labs';
    this.labs = new Map();
    this.defaultLab = null;
  }

  /**
   * Get or create lab for user
   */
  async getLabForUser(userId) {
    if (this.labs.has(userId)) {
      return this.labs.get(userId);
    }

    const lab = new UserLab({
      userId,
      dataDir: this.dataDir,
    });

    // Try to load existing lab
    try {
      const saved = await lab.storage.get('lab_meta');
      if (saved) {
        await lab.import(saved);
      }
    } catch {
      // New lab
    }

    this.labs.set(userId, lab);
    return lab;
  }

  /**
   * Sync lab learnings to other nodes
   */
  async syncToNetwork(labId, gossip) {
    const lab = this.labs.get(labId);
    if (!lab) return;

    const exportedState = await lab.export();

    // Broadcast via gossip protocol
    await gossip.broadcast({
      type: 'LAB_SYNC',
      labId,
      state: exportedState,
      timestamp: Date.now(),
    });
  }
}
```

---

## 3. Multi-CYNIC Coordination

Multiple CYNIC nodes coordinate via enhanced gossip protocol.

```javascript
/**
 * Enhanced gossip messages for multi-CYNIC coordination
 */
export const SwarmMessageType = {
  // Existing
  ...MessageType,

  // New: Lab synchronization
  LAB_SYNC: 'LAB_SYNC',
  LAB_SYNC_REQUEST: 'LAB_SYNC_REQUEST',

  // New: Collective learning
  LEARNING_BROADCAST: 'LEARNING_BROADCAST',
  PATTERN_DISCOVERED: 'PATTERN_DISCOVERED',

  // New: Judgment coordination
  JUDGMENT_REQUEST: 'JUDGMENT_REQUEST',
  JUDGMENT_VOTE: 'JUDGMENT_VOTE',
  JUDGMENT_CONSENSUS: 'JUDGMENT_CONSENSUS',

  // New: Dog coordination
  DOG_HEARTBEAT: 'DOG_HEARTBEAT',
  DOG_SPECIALIZATION: 'DOG_SPECIALIZATION',
};

/**
 * CYNIC Swarm - Multi-node coordination layer
 */
export class CYNICSwarm {
  constructor(options = {}) {
    this.nodeId = options.nodeId;
    this.gossip = options.gossip;
    this.labManager = options.labManager;

    // Track other CYNIC nodes
    this.nodes = new Map();

    // Collective state
    this.collectiveLearnings = [];
    this.collectivePatterns = [];

    // Setup handlers
    this._setupHandlers();
  }

  /**
   * Setup gossip message handlers
   */
  _setupHandlers() {
    this.gossip.on('message', async (msg) => {
      switch (msg.type) {
        case SwarmMessageType.LAB_SYNC:
          await this._handleLabSync(msg);
          break;
        case SwarmMessageType.LEARNING_BROADCAST:
          await this._handleLearningBroadcast(msg);
          break;
        case SwarmMessageType.PATTERN_DISCOVERED:
          await this._handlePatternDiscovered(msg);
          break;
        case SwarmMessageType.JUDGMENT_REQUEST:
          await this._handleJudgmentRequest(msg);
          break;
        case SwarmMessageType.DOG_HEARTBEAT:
          await this._handleDogHeartbeat(msg);
          break;
      }
    });
  }

  /**
   * Request distributed judgment from swarm
   */
  async requestDistributedJudgment(item, options = {}) {
    const requestId = `djdg_${Date.now().toString(36)}`;

    // Broadcast request to all nodes
    await this.gossip.broadcast({
      type: SwarmMessageType.JUDGMENT_REQUEST,
      requestId,
      item,
      options,
      requester: this.nodeId,
      timestamp: Date.now(),
    });

    // Wait for votes (with timeout)
    const votes = await this._collectSwarmVotes(requestId, options.timeout || 10000);

    // Calculate swarm consensus
    return this._calculateSwarmConsensus(votes);
  }

  /**
   * Broadcast learning to swarm
   */
  async broadcastLearning(learning) {
    await this.gossip.broadcast({
      type: SwarmMessageType.LEARNING_BROADCAST,
      learning: {
        ...learning,
        sourceNode: this.nodeId,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast discovered pattern to swarm
   */
  async broadcastPattern(pattern) {
    await this.gossip.broadcast({
      type: SwarmMessageType.PATTERN_DISCOVERED,
      pattern: {
        ...pattern,
        discoveredBy: this.nodeId,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle incoming lab sync
   */
  async _handleLabSync(msg) {
    // Merge remote lab learnings with local collective
    const remoteLearnings = msg.state?.learnings || [];

    for (const learning of remoteLearnings) {
      // Check if we already have this learning
      const exists = this.collectiveLearnings.find(
        l => l.id === learning.id || l.hash === learning.hash
      );

      if (!exists) {
        this.collectiveLearnings.push({
          ...learning,
          receivedFrom: msg.sender,
          receivedAt: Date.now(),
        });
      }
    }
  }

  /**
   * Handle incoming learning broadcast
   */
  async _handleLearningBroadcast(msg) {
    const { learning } = msg;

    // Validate learning (basic)
    if (!learning || learning.sourceNode === this.nodeId) return;

    // Add to collective learnings
    this.collectiveLearnings.push({
      ...learning,
      receivedAt: Date.now(),
    });

    // Apply to local learning service if relevant
    if (this.labManager) {
      // TODO: Apply to appropriate lab based on context
    }
  }

  /**
   * Handle incoming pattern discovery
   */
  async _handlePatternDiscovered(msg) {
    const { pattern } = msg;

    if (!pattern || pattern.discoveredBy === this.nodeId) return;

    // Add to collective patterns
    this.collectivePatterns.push({
      ...pattern,
      receivedAt: Date.now(),
    });
  }

  /**
   * Handle distributed judgment request
   */
  async _handleJudgmentRequest(msg) {
    const { requestId, item, options, requester } = msg;

    // Don't vote on our own requests
    if (requester === this.nodeId) return;

    // Get local judgment
    const orchestrator = new DogOrchestrator({
      labId: `swarm_${requester}`,
      mode: DogMode.CRITICAL_ONLY, // Only run critical dogs for swarm votes
    });

    const localJudgment = await orchestrator.judge(item, options);

    // Send vote back
    await this.gossip.send(requester, {
      type: SwarmMessageType.JUDGMENT_VOTE,
      requestId,
      vote: {
        nodeId: this.nodeId,
        score: localJudgment.global_score,
        verdict: localJudgment.verdict,
        eScore: this.eScore, // Node's E-Score as vote weight
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Get swarm stats
   */
  getStats() {
    return {
      nodeCount: this.nodes.size + 1, // +1 for self
      collectiveLearnings: this.collectiveLearnings.length,
      collectivePatterns: this.collectivePatterns.length,
      nodes: Array.from(this.nodes.values()).map(n => ({
        id: n.id,
        lastSeen: n.lastSeen,
        eScore: n.eScore,
      })),
    };
  }
}
```

---

## 4. Integration with CYNICNode

Wire everything into the main node.

```javascript
// In packages/node/src/node.js

import { DogOrchestrator, DogMode, DOG_CONFIG } from './agents/orchestrator.js';
import { UserLab, LabManager } from './labs/user-lab.js';
import { CYNICSwarm, SwarmMessageType } from './swarm/swarm.js';

export class CYNICNode {
  constructor(options = {}) {
    // ... existing code ...

    // Lab manager for user isolation
    this._labManager = new LabManager({
      dataDir: `${options.dataDir}/labs`,
    });

    // Dog orchestrator for parallel execution
    this._dogOrchestrator = new DogOrchestrator({
      labId: this.operator.nodeId,
      mode: options.dogMode || DogMode.PARALLEL,
      learningService: this._learningService,
      persistence: this.state,
      spawner: options.spawner || this._createSpawner(),
    });

    // Swarm coordination
    this._swarm = new CYNICSwarm({
      nodeId: this.operator.nodeId,
      gossip: this.gossip,
      labManager: this._labManager,
    });
  }

  /**
   * Judge with parallel dogs
   */
  async judge(item, options = {}) {
    // Get or create lab for this user
    const lab = options.userId
      ? await this._labManager.getLabForUser(options.userId)
      : this._labManager.defaultLab;

    // Get lab context
    const labContext = lab?.getContext() || {};

    // Run parallel dog judgment
    const judgment = await this._dogOrchestrator.judge(item, {
      ...options,
      labContext,
    });

    // Record in lab
    if (lab) {
      await lab.recordJudgment(judgment);
    }

    // ... rest of judgment processing (consensus, anchoring, etc.)

    return judgment;
  }

  /**
   * Request distributed judgment from swarm
   */
  async judgeDistributed(item, options = {}) {
    return this._swarm.requestDistributedJudgment(item, options);
  }

  /**
   * Create Claude API spawner for dogs
   */
  _createSpawner() {
    return async ({ dog, model, item, systemPrompt, labId }) => {
      // This would use the Anthropic SDK to spawn a subagent
      // For now, use the existing CollectivePack dogs
      const agent = this._collectivePack?.getAgent(dog);
      if (agent) {
        return agent.process({ type: 'judgment', item }, { labId });
      }

      // Fallback mock
      return {
        score: 50,
        verdict: 'WAG',
        response: 'allow',
        weight: 1,
      };
    };
  }
}
```

---

## 5. API Endpoints

New API endpoints for labs and swarm.

```javascript
// In explorer-api.js or new labs-api.js

/**
 * GET /labs - List user labs
 */
app.get('/labs', async (req, res) => {
  const labs = Array.from(node._labManager.labs.values());
  res.json({
    labs: labs.map(lab => ({
      labId: lab.labId,
      userId: lab.userId,
      stats: lab.stats,
    })),
  });
});

/**
 * GET /labs/:labId - Get lab details
 */
app.get('/labs/:labId', async (req, res) => {
  const lab = node._labManager.labs.get(req.params.labId);
  if (!lab) return res.status(404).json({ error: 'Lab not found' });
  res.json(await lab.export());
});

/**
 * GET /swarm - Swarm stats
 */
app.get('/swarm', (req, res) => {
  res.json(node._swarm.getStats());
});

/**
 * POST /swarm/judge - Distributed judgment
 */
app.post('/swarm/judge', async (req, res) => {
  const { item } = req.body;
  const result = await node.judgeDistributed(item);
  res.json(result);
});
```

---

## 6. Implementation Phases

### Phase 1: Dog Orchestrator (1-2 days)
- [ ] Create `packages/node/src/agents/orchestrator.js`
- [ ] Implement parallel dog spawning with timeouts
- [ ] Implement φ-consensus calculation
- [ ] Wire to existing `CYNICJudge`

### Phase 2: User Labs (1 day)
- [ ] Create `packages/node/src/labs/user-lab.js`
- [ ] Implement lab isolation and storage
- [ ] Add lab context to dog spawning
- [ ] Add lab API endpoints

### Phase 3: Swarm Coordination (2 days)
- [ ] Create `packages/node/src/swarm/swarm.js`
- [ ] Add new gossip message types
- [ ] Implement distributed judgment
- [ ] Add learning/pattern broadcast

### Phase 4: Real Subagent Spawning (optional)
- [ ] Integrate Anthropic SDK for real Claude calls
- [ ] Implement model selection per dog
- [ ] Add cost tracking and limits

---

## Benefits

| Feature | Current | With Hybrid Architecture |
|---------|---------|--------------------------|
| Context | Shared, accumulates | **Hybrid**: fresh execution + injected memory |
| Memory | None | **6 layers**: identity → working |
| Latency | Sequential | Parallel spawning |
| User isolation | None | Per-lab with shared collective |
| Learning | Lost between sessions | **Persists in L2/L3/L4** |
| Multi-node | Basic gossip | Coordinated swarm + memory sync |
| Scalability | Single process | Multi-process, multi-node |
| Cost efficiency | One model | Right-sized models per dog |

---

## φ-Alignment

- **Consensus threshold**: 61.8% of dogs must approve
- **Max confidence**: No dog reports > 61.8% confidence
- **Min doubt**: 38.2% uncertainty always present
- **Dog count**: 11 (Fibonacci-adjacent)
- **Timeouts**: φ-scaled (5s, 10s, 15s)
- **Memory limits**: Fibonacci numbers (F₁₃ to F₁₈)

---

## Concrete Example: Token Judgment

Here's exactly what a dog receives when judging a token:

```javascript
// User requests: judge("$BONK token")

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: INPUT BUFFER (Layer 0)
// ═══════════════════════════════════════════════════════════════════════════
const processedInput = {
  type: 'token',
  identifier: '$BONK',
  chain: 'solana',
  category: 'memecoin',
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: BUILD INJECTED CONTEXT (Layers 1-4)
// ═══════════════════════════════════════════════════════════════════════════

const injectedContext = {
  // Layer 1: IDENTITY (always same)
  axioms: {
    PHI_INV: 0.618,
    MAX_CONFIDENCE: 0.618,
    MOTTO: 'φ distrusts φ',
  },
  systemPrompt: `You are ANALYST, the pattern detective...`,

  // Layer 2: COLLECTIVE MEMORY (relevant items only)
  patterns: [
    { id: 'pat_memecoin_pump', rule: 'Memecoins often pump 100x then rug', confidence: 0.78 },
    { id: 'pat_solana_fee', rule: 'Solana tokens have low burn cost', confidence: 0.92 },
  ],
  dimensionWeights: {
    'holder_distribution': 1.3,    // Learned: this matters more
    'burn_rate': 0.8,              // Learned: less predictive
    'social_sentiment': 1.1,
  },
  similarJudgments: [
    { item: '$WIF', score: 72, verdict: 'WAG', timestamp: '2024-01-15' },
    { item: '$MYRO', score: 45, verdict: 'GROWL', timestamp: '2024-01-10' },
  ],

  // Layer 3: PROCEDURAL (how to judge tokens)
  procedure: {
    type: 'token',
    steps: [
      'Check holder distribution (top 10 < 30%)',
      'Verify liquidity locked',
      'Calculate K-Score if available',
      'Assess social sentiment vs hype',
    ],
  },
  scoringRules: {
    'holder_concentration_penalty': { threshold: 0.5, penalty: -20 },
    'liquidity_lock_bonus': { locked: true, bonus: +10 },
  },

  // Layer 4: USER LAB (this user's context)
  userPreferences: {
    riskTolerance: 'high',
    focusAreas: ['memecoins', 'defi'],
    previousTokensJudged: 47,
  },
  projectPatterns: [
    { pattern: 'User prefers detailed K-Score analysis', weight: 1.2 },
  ],
  recentUserFeedback: [
    { judgmentId: 'jdg_abc', feedback: 'correct', item: '$WIF' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: SPAWN DOG WITH FRESH WORKING MEMORY (Layer 5)
// ═══════════════════════════════════════════════════════════════════════════

const dogSpawnPayload = {
  // Fresh per invocation
  item: processedInput,
  otherDogOutputs: null,  // Empty at start

  // Injected from layers 1-4
  context: injectedContext,

  // Dog config
  dog: 'ANALYST',
  model: 'haiku',
  timeout: 5000,
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: DOG EXECUTES (fresh context, no accumulated history)
// ═══════════════════════════════════════════════════════════════════════════

// ANALYST receives ONLY:
// - The item ($BONK)
// - Injected patterns, rules, history (~2k tokens)
// - Its identity prompt
// - NO previous conversation
// - NO other items judged this session

const analystResponse = {
  score: 58,
  verdict: 'WAG',
  dimensions: {
    holder_distribution: 62,
    liquidity: 75,
    social_sentiment: 48,
    burn_history: 55,
  },
  insights: [
    'Top 10 holders own 28% - acceptable',
    'Liquidity locked for 6 months',
    'High social volume but mostly hype',
  ],
  weight: 1,  // ANALYST weight
  response: 'allow',
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: FEEDBACK LOOP (updates layers 2-4)
// ═══════════════════════════════════════════════════════════════════════════

// If user later says "that judgment was wrong":
// → Layer 2: adjustWeight('social_sentiment', -0.1, 'user_feedback')
// → Layer 4: recordFeedback({ judgmentId, feedback: 'incorrect' })

// If pattern emerges (e.g., "memecoins with locked liquidity perform better"):
// → Layer 2: addPattern({ rule: '...', confidence: 0.7 })
// → Layer 3: updateProcedure('token', { add: 'Check liquidity lock duration' })
```

### What Dogs DON'T Receive

```
❌ Previous conversation turns
❌ Other items judged this session
❌ Internal reasoning from previous judgments
❌ Full pattern library (only top 5 relevant)
❌ Full judgment history (only top 3 similar)
❌ Other users' preferences
❌ Unverified patterns (only proven ones)
```

This is the **hybrid model**: fresh execution with surgically injected relevant memory.

---

## Summary: Hybrid Context Flow

```
                                    USER REQUEST
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │   LAYER 0: BUFFER      │
                            │   Parse, classify      │
                            └────────────────────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                     ┌─────────┐   ┌─────────┐   ┌─────────┐
                     │  L1     │   │  L2     │   │  L3     │
                     │Identity │   │Collective│   │Proced. │
                     │ (read)  │   │ (read)  │   │ (read)  │
                     └────┬────┘   └────┬────┘   └────┬────┘
                          │              │              │
                          └──────────────┼──────────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │  LAYER 4: USER LAB     │
                            │  User preferences      │
                            └────────────────────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │  BUILD INJECTED        │
                            │  CONTEXT (~2k tokens)  │
                            └────────────────────────┘
                                         │
            ┌───────────┬───────────┬────┴────┬───────────┬───────────┐
            ▼           ▼           ▼         ▼           ▼           ▼
       ┌────────┐  ┌────────┐  ┌────────┐ ┌────────┐ ┌────────┐  ┌────────┐
       │  SAGE  │  │ANALYST │  │GUARDIAN│ │SCHOLAR │ │  ...   │  │ CYNIC  │
       │ fresh  │  │ fresh  │  │ fresh  │ │ fresh  │ │ fresh  │  │ fresh  │
       │+inject │  │+inject │  │+inject │ │+inject │ │+inject │  │+inject │
       └───┬────┘  └───┬────┘  └───┬────┘ └───┬────┘ └───┬────┘  └───┬────┘
           │           │           │          │          │           │
           └───────────┴───────────┴──────────┴──────────┴───────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │    φ-CONSENSUS         │
                            │    (61.8% agree)       │
                            └────────────────────────┘
                                         │
                            ┌────────────┴────────────┐
                            ▼                         ▼
                       JUDGMENT                  FEEDBACK
                       returned                  to L2/L3/L4
```

---

> "Fresh execution, collective wisdom" - The Hybrid Way
>
> "Many dogs, one pack, one truth" - κυνικός
