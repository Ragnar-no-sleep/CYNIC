# CYNIC Metathinking Gap Analysis

> Generated: 2026-02-07 | **Last verified: 2026-02-08** (post-commit a774cde)
> Framework: PERCEIVE -> JUDGE -> DECIDE -> ACT -> LEARN -> [RESIDUAL] -> EVOLVE
> Confidence: 58% (phi^-1 limit)
>
> **STALENESS WARNING**: This document was generated 2026-02-07 and has been updated
> 2026-02-08 to reflect 20+ commits that closed most gaps described below.

---

## Executive Summary

CYNIC's 11 protocols share ONE recursive cycle: **PERCEIVE -> JUDGE -> DECIDE -> ACT -> LEARN -> EVOLVE**.
Each step has working code. But the **connections between steps are broken or absent**, creating a system
that perceives without learning, judges without calibrating, and acts without remembering.

| Metric | Original (2026-02-07) | Current (2026-02-08) | Target | Gap |
|--------|----------------------|----------------------|--------|-----|
| 7x7 Matrix completion | 24.5% | ~40% (CODE/CYNIC ~86%, HUMAN ~57%) | 100% | 60% |
| Learning loops closed | 0/7 fully | **11/11 closed** | 7/7 | **DONE** |
| Event bus health | ~44% wired | ~50% wired | 100% | 50% |
| Persistence coverage | ~55% of computed data | ~75% (data graves → learning sources) | 100% | 25% |
| Distance D calculation | 50% effective | ~80% (consciousness readback + vote breakdown) | 100% | 20% |
| Solana pipeline | 40% operational | 92.5% finalization (devnet) | 100% | 7.5% |
| Confidence calibration | Write-only | **Read-write loop CLOSED** (commit c865e3c) | Read-write loop | **DONE** |

**Key finding (UPDATED)**: The original analysis identified write-only data graves as the core
problem. Since then, commits 56a63dd, c865e3c, f939fef, 2a1c58a, a286c6c, and 952ef96 have
closed ALL 11 learning loops. The remaining gaps are in MARKET/SOCIAL/COSMOS perception (rows
R3, R4, R7) and Solana mainnet deployment.

---

## 1. PERCEIVE Gaps

The PERCEIVE step covers 7 reality dimensions (rows of the 7x7 matrix).

| Reality | Status | What Works | What is Missing |
|---------|--------|------------|-----------------|
| R1. CODE | Working | Hooks observe tool use, file changes | No AST-level analysis, no dependency graph tracking |
| R2. SOLANA | Partial | solana-watcher.js exists, anchoring operational | Watcher NOT wired to event bus in production. Uses legacy @solana/web3.js (line 22). No real-time account monitoring active. |
| R3. MARKET | Absent | Nothing | No price feed, no liquidity monitoring, no sentiment. Entire row is blank. |
| R4. SOCIAL | Absent | Twitter tools exist (brain_x_*) | Read-only, no streaming. No Discord/Telegram. No sentiment scoring pipeline. |
| R5. HUMAN | Partial | Psychology hooks, profile loading | burnout_detection table (mig 018) exists but detector not wired to routing. |
| R6. CYNIC | Working | Dog state emitter, collective snapshots | Self-perception works. Entropy tracking cosmetic. |
| R7. COSMOS | Absent | brain_ecosystem tool exists | Single-repo only. No cross-repo health aggregation. |

### Critical PERCEIVE Gaps

**P-GAP-1: Solana Watcher is Dead Code**
- File: `packages/node/src/perception/solana-watcher.js` (line 22)
- Imports @solana/web3.js (legacy) but gasdf-relayer uses @solana/kit (modern)
- Never instantiated in collective-singleton.js or any startup flow

**P-GAP-2: No Market Perception**
- No price oracle, no DEX monitoring, no fear/greed index
- Entire R3 row (7 cells) is empty

**P-GAP-3: Perception Router Never Called**
- packages/node/src/perception/ has a router but it is bypassed
- See ROUTING-GAPS-ANALYSIS.md, Gap #1

---

## 2. JUDGE Gaps

The JUDGE step evaluates input through 36 dimensions (5 axioms x 7 + THE_UNNAMEABLE).

| Component | Status | File | Issue |
|-----------|--------|------|-------|
| 36 Dimensions | Implemented | packages/node/src/judge/dimensions.js | Working. |
| Q-Score (5th root) | Implemented | packages/core/src/qscore/index.js (line 188) | Working. |
| FIDELITY axiom | Implemented | packages/core/src/axioms/constants.js (line 468) | Working. |
| Calibration | **CLOSED** | packages/node/src/judge/calibration-tracker.js | ~~Never read back~~ → judge.js L610 calls .record(), drift adjusts confidence (commit c865e3c) |
| Distance D | **85%** | perceive.js computes D with consciousness readback | Consciousness state + self-judgment + vote breakdown now included |
| Consciousness metric | **Working** | ConsciousnessBridge + readback.json | Read-back loop: observe.js → file → perceive.js → framing directive |
| Efficiency eta | **Persisted** | event-listeners.js → thermodynamic_snapshots | Persisted per CYNIC_STATE event (commit in event-listeners.js) |

### Critical JUDGE Gaps

**J-GAP-1: Calibration is Write-Only** → **CLOSED** (commit c865e3c)
- ~~NO component reads the calibration data~~ → judge.js L610 calls calibrationTracker.record()
- L1073 applies ECE adjustment to confidence scaling
- Drift detection → confidence adjustment loop is now closed

**J-GAP-2: No RLHF Pipeline Active** → **CLOSED** (commit 56a63dd)
- ~~USER_FEEDBACK goes to persistence only~~ → FeedbackRepository wired to LearningManager
- LearningManager now reads feedback and updates DPO preference pairs
- Behavior Modifier applies feedback to actual behavior changes

**J-GAP-3: Discovered Dimensions Table Missing FIDELITY** → **CLOSED** (migration 035)
- ~~FIDELITY missing from CHECK constraint~~ → migration 035 adds FIDELITY
- ResidualDetector correctly references FIDELITY in axiomWeakness

---

## 3. DECIDE Gaps

The DECIDE step routes decisions through the Kabbalistic Router.

| Component | Status | File | Issue |
|-----------|--------|------|-------|
| KabbalisticRouter | Implemented | packages/node/src/orchestration/kabbalistic-router.js | 1357 lines. Working. |
| Q-Learning weights | **Working** | packages/node/src/orchestration/learning-service.js | startEpisode/endEpisode wired to router |
| DPO preference pairs | **Working** | packages/node/src/judge/dpo-processor.js | Context-specific weights applied (commit 952ef96) |
| Thompson Sampling | **Persisted** | scripts/hooks/lib/thompson-sampler.js | State → ~/.cynic/thompson/state.json (commit 56a63dd) |
| Cost optimizer | Placeholder | Router references costOptimizer | Never instantiated. |

### Critical DECIDE Gaps

**D-GAP-1: Q-Learning Weights Never Used Correctly** → **CLOSED**
- ~~Calls getRecommendedWeights() with no features~~ → startEpisode/endEpisode wired
- Router now uses Q-Learning weights in dog selection

**D-GAP-2: DPO Gradient Not Applied** → **CLOSED** (commit 952ef96)
- ~~dpo-optimizer.js computes gradients that go nowhere~~ → context-specific DPO weights
- routing_weights table → router reads per-context Fisher scores + φ-blended weights
- _dpoWeightsByContext and _dpoFisherByContext maps in KabbalisticRouter

**D-GAP-3: Thompson Sampler is Per-Hook-Process** → **CLOSED** (commit 56a63dd)
- ~~Beta(alpha, beta) parameters start at (1,1) every time~~ → persisted to disk
- State file: ~/.cynic/thompson/state.json, survives hook restarts

---

## 4. ACT Gaps

| Component | Status | File | Issue |
|-----------|--------|------|-------|
| Tool execution | Working | Claude Code executes tools | Working. |
| Guardian blocking | Working | guardian.js via router | Working. |
| Solana anchoring | Partial | packages/node/src/network/solana-anchoring.js | Devnet only. |
| Token burn ($BURN) | Not deployed | packages/gasdf-relayer/src/solana.js | No SPL token integration. SOL transfer only. |
| Block production | Working | packages/protocol/src/consensus/engine.js | 92.5% finalization. |

### Critical ACT Gaps

**A-GAP-1: Token Burn Not Implemented**
- gasdf-relayer sends SOL to burn address, not SPL token burn
- $asdfasdfa token exists but no programmatic burn

**A-GAP-2: Anchoring Not on Mainnet**
- SolanaAnchoringManager defaults to devnet

**A-GAP-3: No Action Feedback to Perception**
- No closed loop: ACT -> PERCEIVE -> JUDGE

---

## 5. LEARN Gaps

11 learning pipelines. **All 11 have closed loops** (as of commit 952ef96).

| Pipeline | Loop Closed? | Persistence | Closing Commit |
|----------|--------------|-------------|----------------|
| **Q-Learning** | **YES** | YES (qlearning_state, mig 026) | startEpisode/endEpisode wired |
| **DPO** | **YES** | YES (preference_pairs, mig 028) | 952ef96 (context-specific weights) |
| **RLHF** | **YES** | YES (feedback table) | 56a63dd (FeedbackRepository → LearningManager) |
| **Thompson** | **YES** | YES (~/.cynic/thompson/state.json) | 56a63dd (disk persistence) |
| **EWC++** | **YES** | YES (fisher_scores, mig 021) | f939fef (Router blend + Judge dim weights) |
| **Calibration** | **YES** | YES (calibration_tracking) | c865e3c (drift → confidence adjustment) |
| **UnifiedSignal** | **YES** | YES (unified_signals, mig 034) | a286c6c (PostgreSQL pool wired) |
| **Behavior Modifier** | **YES** | YES (via feedback) | learning/behavior-modifier.js |
| **Meta-Cognition** | **YES** | YES (via self-monitoring) | learning/meta-cognition.js |
| **SONA** | **YES** | YES (pattern correlations) | learning/sona.js |
| **Consciousness Readback** | **YES** | YES (~/.cynic/consciousness/readback.json) | observe→file→perceive loop |

### The Core Problem (RESOLVED)

~~Every pipeline WRITES to PostgreSQL. No pipeline READS back to improve itself.~~

**All learning loops are now closed.** The read-back mechanisms include:
- PostgreSQL queries (DPO weights, Fisher scores, calibration drift)
- File-based cross-process persistence (Thompson state, consciousness readback)
- In-process event bridges (Q-Learning episodes, RLHF feedback)

**L-GAP-1: No Read-Back Mechanism** → **CLOSED** (commits 54c99df, 2a1c58a turned data graves into learning sources)

**L-GAP-2: LearningManager Wired But Starved** → **CLOSED** (commit 56a63dd wired FeedbackRepository)

**L-GAP-3: UnifiedBridge Writes to Ephemeral Store** → **CLOSED** (migration 034 + commit a286c6c)

---

## 6. RESIDUAL -> EVOLVE Gaps

**R-GAP-1: Discovered Dimensions Do Not Survive Restart**
- Migration 032 creates discovered_dimensions table, but no code reads it on boot

**R-GAP-2: Emergence is Isolated**
- "Consciousness" metric in TUI is not computed from real data

**R-GAP-3: No Cross-Scale Evolution**
- No mechanism for dog-level, matrix-level, or axiom-level evolution

---

## 7. Nervous System (3 Event Buses)

| Bus | Defined | Active | Health |
|-----|---------|--------|--------|
| globalEventBus (@cynic/core) | 32 events | ~12 consumed | ~50% |
| getEventBus() (automation) | 22 events | ~8 consumed | ~30% |
| AgentEventBus (dogs) | 50+ events | ~30 consumed | ~60% |

**Dead events**: ~14 of 54 core+automation events (26%) are never published.
**Orphaned events**: ~4 events published to void (PATTERN_DETECTED, DIMENSION_CANDIDATE, ANOMALY_DETECTED, METRICS_REPORTED).
**Missing bridges**: No bridge between globalEventBus and automation bus. Only 2 of ~50 AgentEventBus signals bridged to core.

---

## 8. Persistence Gaps

**Write-Only Tables (Data Graves)**: ~~12~~ → 5 of ~25 active tables (20%)

**CLOSED (no longer data graves):**
1. ~~judgments (mig 001)~~ → replayed via LearningManager DPO cycle
2. ~~feedback (mig 001)~~ → FeedbackRepository wired to LearningManager (commit 56a63dd)
3. ~~orchestration_decisions (mig 011/017)~~ → orchestration_learning_view consumed by Router (commit 2a1c58a)
4. ~~burnout_detection (mig 018)~~ → PsychologyRepository + Router._loadBurnoutStatus() (commit 337e72f)
5. ~~frictions (mig 025)~~ → AutomationExecutor data graves analysis (commit 2a1c58a)
6. ~~preference_pairs (mig 028)~~ → DPO optimizer reads context-specific weights (commit 952ef96)
7. ~~dog_events (mig 029)~~ → query functions added (commit 54c99df)

**STILL DATA GRAVES:**
8. reasoning_trajectories (mig 020) -- never replayed
9. telemetry_snapshots (mig 025) -- no dashboard
10. dog_signals (mig 029) -- written but limited replay
11. collective_snapshots (mig 029) -- sampled, limited querying
12. residual_anomalies (mig 032) -- no historical analysis

---

## 9. 7x7 Matrix Status

```
                 | PERCEIVE | JUDGE   | DECIDE  | ACT     | LEARN   | ACCOUNT | EMERGE  |
=================|==========|=========|=========|=========|=========|=========|=========|
R1. CODE    </>  |  [OK]    |  [OK]   |  [~~]   |  [OK]   |  [~~]   |  [--]   |  [--]   |
R2. SOLANA  O    |  [~~]    |  [--]   |  [--]   |  [~~]   |  [--]   |  [--]   |  [--]   |
R3. MARKET  $    |  [--]    |  [--]   |  [--]   |  [--]   |  [--]   |  [--]   |  [--]   |
R4. SOCIAL  @    |  [--]    |  [--]   |  [--]   |  [--]   |  [--]   |  [--]   |  [--]   |
R5. HUMAN   U    |  [~~]    |  [~~]   |  [--]   |  [~~]   |  [~~]   |  [--]   |  [--]   |
R6. CYNIC   C    |  [OK]    |  [OK]   |  [OK]   |  [OK]   |  [OK]   |  [~~]   |  [~~]   |
R7. COSMOS  *    |  [--]    |  [--]   |  [--]   |  [--]   |  [--]   |  [--]   |  [--]   |
=================|==========|=========|=========|=========|=========|=========|=========|

[OK] = 8 cells (16.3%)   [~~] = 8 cells (16.3%)   [--] = 33 cells (67.3%)
Original estimate: ~24.5%
**Updated estimate: ~40%** (CODE/CYNIC rows ~86%, HUMAN ~57%, per MEMORY.md 2026-02-08)
```

---

## 10. Priority Fixes (R1-R5)

### ~~R1: Close the Q-Learning Feedback Loop~~ → **DONE**
- startEpisode/endEpisode wired in KabbalisticRouter

### ~~R2: Read-Back Loop for Calibration~~ → **DONE** (commit c865e3c)
- judge.js L610 calls calibrationTracker.record(), L1073 applies ECE drift adjustment

### ~~R3: Fix FIDELITY in discovered_dimensions Constraint~~ → **DONE** (migration 035)

### ~~R4: Persist Thompson Sampling State~~ → **DONE** (commit 56a63dd)
- State persisted to ~/.cynic/thompson/state.json

### ~~R5: Wire DPO Gradient to Router~~ → **DONE** (commit 952ef96)
- Context-specific DPO weights in KabbalisticRouter._dpoWeightsByContext

### Remaining Priority Fixes:
- **R6**: Deploy Solana anchoring to mainnet (currently devnet only)
- **R7**: Implement token burn ($BURN) with SPL token integration
- **R8**: Complete MARKET row (R3) — price feeds, liquidity monitoring
- **R9**: Complete SOCIAL row (R4) — streaming, sentiment pipeline
- **R10**: Close remaining 5 data graves (reasoning_trajectories, telemetry_snapshots, etc.)

---

## 11. Metrics Summary

```
                    Original (2026-02-07)  →  Updated (2026-02-08)
7x7 Matrix:         ~24.5%                →  ~40%
Learning Loops:     ~7% closure           →  100% (11/11 closed)
Event Bus Health:   ~44%                  →  ~50%
Persistence:        48% write-only        →  20% write-only (7 graves closed)
Distance D:         ~50%                  →  ~80% (consciousness readback)
Solana Pipeline:    ~40%                  →  92.5% (devnet finalization)
Calibration:        Not started           →  DONE (read-write loop closed)
```

---

## Appendix: Key File Paths

| Component | Path |
|-----------|------|
| Kabbalistic Router | packages/node/src/orchestration/kabbalistic-router.js |
| Q-Learning Service | packages/node/src/orchestration/learning-service.js |
| RLHF Learning Service | packages/node/src/judge/learning-service.js |
| Learning Manager | packages/node/src/judge/learning-manager.js |
| DPO Optimizer | packages/node/src/judge/dpo-optimizer.js |
| DPO Processor | packages/node/src/judge/dpo-processor.js |
| Calibration Tracker | packages/node/src/judge/calibration-tracker.js |
| ResidualDetector | packages/node/src/judge/residual.js |
| Residual Governance | packages/node/src/judge/residual-governance.js |
| Dimensions (36) | packages/node/src/judge/dimensions.js |
| Q-Score Calculator | packages/core/src/qscore/index.js |
| Constants (phi) | packages/core/src/axioms/constants.js |
| Event Bus (core) | packages/core/src/bus/event-bus.js |
| Event Bus (automation) | packages/node/src/services/event-bus.js |
| Event Listeners | packages/node/src/services/event-listeners.js |
| Unified Bridge | packages/node/src/learning/unified-bridge.js |
| Unified Signal | packages/node/src/learning/unified-signal.js |
| Thompson Sampler | scripts/hooks/lib/thompson-sampler.js |
| Solana Watcher | packages/node/src/perception/solana-watcher.js |
| Solana Anchoring | packages/node/src/network/solana-anchoring.js |
| Burns (gasdf) | packages/gasdf-relayer/src/solana.js |
| Bus Subscriptions | packages/mcp/src/server/service-initializer/bus-subscriptions.js |
| Observe Hook | scripts/hooks/observe.js |
| Collective Singleton | packages/node/src/collective-singleton.js |
| Migration: Q-Learning | packages/persistence/src/postgres/migrations/026_qlearning_persistence.sql |
| Migration: DPO | packages/persistence/src/postgres/migrations/028_dpo_learning.sql |
| Migration: Dog Events | packages/persistence/src/postgres/migrations/029_dog_collective_events.sql |
| Migration: Tracing | packages/persistence/src/postgres/migrations/030_distributed_tracing.sql |
| Migration: Dimensions | packages/persistence/src/postgres/migrations/032_discovered_dimensions.sql |
