# Plan d'Implémentation: Matrice Fractale 7×7

> **Objectif**: 31% → 100% (15/49 → 49/49 cellules)
> **Philosophie**: Compléter par ROWS (horizontal) pour débloquer les COLUMNS (vertical)
> **Constraint**: φ⁻¹ = 61.8% confidence max à chaque étape

---

## État Actuel (Baseline)

```
                 ║ PERCEIVE │  JUDGE  │ DECIDE  │   ACT   │  LEARN  │ ACCOUNT │ EMERGE  ║
═════════════════╬══════════╪═════════╪═════════╪═════════╪═════════╪═════════╪═════════╣
  CODE    </>    ║    🟢    │   🟢    │   🟡    │   🟢    │   🟡    │   🔴    │   🔴    ║
  SOLANA  ◎      ║    🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    ║
  MARKET  📈     ║    🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    ║
  SOCIAL  🐦     ║    🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    ║
  HUMAN   👤     ║    🟡    │   🟡    │   🔴    │   🟡    │   🟡    │   🔴    │   🔴    ║
  CYNIC   🧠     ║    🟡    │   🟢    │   🟢    │   🟢    │   🟢    │   🟡    │   🟡    ║
  COSMOS  ∞      ║    🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    │   🔴    ║
═════════════════╩══════════╧═════════╧═════════╧═════════╧═════════╧═════════╧═════════╝

Score: 31% (15/49)
```

---

## Stratégie: "Complete the Core, Expand the Reach"

```
PHASE 1: FOUNDATION (Semaines 1-2)
├── Compléter CODE row (57% → 100%)
└── Compléter CYNIC row (57% → 100%)

PHASE 2: SYMBIOSIS (Semaines 3-4)
├── Compléter HUMAN row (29% → 100%)
└── Wirer la boucle HUMAN ↔ CYNIC

PHASE 3: CHAIN (Semaines 5-6)
├── Activer SOLANA row (0% → 60%)
└── Connecter CODE ↔ SOLANA

PHASE 4: EXTERNAL (Semaines 7-8)
├── Activer MARKET row (0% → 40%)
├── Activer SOCIAL row (0% → 40%)
└── Cross-dimension correlation

PHASE 5: COLLECTIVE (Semaines 9-10)
├── Activer COSMOS row (0% → 60%)
└── Federated learning cross-instances

PHASE 6: TRANSCENDENCE (Ongoing)
├── THE_UNNAMEABLE activation
└── 7×7×7 fractal depth
```

---

## PHASE 1: FOUNDATION (Semaines 1-2)

### Objectif: CODE row 100% + CYNIC row 100%

Ces deux rows sont le CŒUR - sans elles, rien d'autre ne fonctionne.

### 1.1 CODE Row Completion

| Cell | Current | Target | Task | Files |
|------|---------|--------|------|-------|
| C1.1 | 🟢 | 🟢 | Maintain | `codebase-indexer.js` |
| C1.2 | 🟢 | 🟢 | Maintain | `judge.js`, `dimensions.js` |
| C1.3 | 🟡 | 🟢 | **Guardian enhancement** | `guardian.js` |
| C1.4 | 🟢 | 🟢 | Maintain | MCP tools |
| C1.5 | 🟡 | 🟢 | **DPO activation** | `dpo-processor.js` |
| C1.6 | 🔴 | 🟢 | **Code accounting** | NEW: `code-accountant.js` |
| C1.7 | 🔴 | 🟢 | **Emergence detection** | `emergence-detector.js` |

#### Task C1.3: Guardian Enhancement
```javascript
// packages/node/src/agents/guardian.js
// ADD: Multi-step confirmation workflow
// ADD: Detailed impact analysis before dangerous ops
// ADD: Rollback capability tracking
```

#### Task C1.5: DPO Activation
```javascript
// packages/node/src/judge/dpo-processor.js
// WIRE: Connect to actual training pipeline
// ADD: Scheduled training (3 AM daily)
// ADD: Feedback → preference pairs conversion
```

#### Task C1.6: Code Accounting (NEW)
```javascript
// packages/node/src/accounting/code-accountant.js
/**
 * Track economic value of code changes:
 * - Lines added/removed (complexity delta)
 * - Dependencies changed (risk delta)
 * - Test coverage delta
 * - Tech debt score delta
 * - Time spent (from telemetry)
 */
export class CodeAccountant {
  trackChange(diff, metadata) {
    return {
      complexityDelta: this.calculateComplexity(diff),
      riskDelta: this.assessRisk(diff),
      coverageDelta: metadata.testCoverage,
      debtDelta: this.assessTechDebt(diff),
      timeSpent: metadata.duration,
      valueScore: this.computeValue(), // φ-weighted
    };
  }
}
```

#### Task C1.7: Emergence Detection
```javascript
// packages/node/src/emergence/code-emergence.js
/**
 * Detect emerging patterns in code:
 * - Repeated refactoring patterns
 * - Architecture drift
 * - Tech debt accumulation trends
 * - Hot files (frequently changed)
 */
export class CodeEmergence {
  detectPatterns(history) {
    return {
      architectureTrends: this.analyzeArchitecture(history),
      hotspots: this.findHotspots(history),
      debtTrajectory: this.projectDebt(history),
      emergingAbstractions: this.findRepeatedPatterns(history),
    };
  }
}
```

### 1.2 CYNIC Row Completion

| Cell | Current | Target | Task | Files |
|------|---------|--------|------|-------|
| C6.1 | 🟡 | 🟢 | **Real-time dog states** | `collective-singleton.js` |
| C6.2 | 🟢 | 🟢 | Maintain | `calibration-tracker.js` |
| C6.3 | 🟢 | 🟢 | Maintain | `kabbalistic-router.js` |
| C6.4 | 🟢 | 🟢 | Maintain | `unified-orchestrator.js` |
| C6.5 | 🟢 | 🟢 | Maintain | `q-learning.js` |
| C6.6 | 🟡 | 🟢 | **Internal accounting** | NEW: `cynic-accountant.js` |
| C6.7 | 🟡 | 🟢 | **Self-emergence** | `residual-governance.js` |

#### Task C6.1: Real-time Dog States
```javascript
// packages/node/src/collective-singleton.js
// ADD: Continuous state emission to EventBus
// ADD: Resource utilization per dog
// ADD: Error state tracking
// ADD: Confidence history
```

#### Task C6.6: CYNIC Internal Accounting
```javascript
// packages/node/src/accounting/cynic-accountant.js
/**
 * Track CYNIC's internal economics:
 * - Tokens consumed per dog
 * - Latency per operation
 * - Accuracy per judgment
 * - Efficiency (useful work / total work)
 */
export class CynicAccountant {
  trackOperation(dog, operation, result) {
    return {
      dog: dog.id,
      tokensUsed: operation.tokens,
      latencyMs: operation.duration,
      wasAccurate: result.feedbackPositive,
      efficiency: this.calculateEfficiency(operation, result),
    };
  }

  // φ-bounded efficiency max
  get maxEfficiency() { return PHI_INV; } // 61.8%
}
```

#### Task C6.7: Self-Emergence Activation
```javascript
// packages/node/src/judge/residual-governance.js
// WIRE: Actually run daily governance votes
// ADD: New dimension proposal from residuals
// ADD: Dog voting on dimension promotions
// ADD: Dimension retirement for low-value ones
```

### Phase 1 Deliverables

```
[ ] C1.3: Guardian multi-step workflow
[ ] C1.5: DPO daily training activated
[ ] C1.6: CodeAccountant class + wiring
[ ] C1.7: CodeEmergence detector
[ ] C6.1: Real-time dog state emission
[ ] C6.6: CynicAccountant class + wiring
[ ] C6.7: ResidualGovernance daily execution

Target: CODE 100%, CYNIC 100%
Matrix score: 31% → 45%
```

---

## PHASE 2: SYMBIOSIS (Semaines 3-4)

### Objectif: HUMAN row 100% + HUMAN ↔ CYNIC bidirectional

### 2.1 HUMAN Row Completion

| Cell | Current | Target | Task | Files |
|------|---------|--------|------|-------|
| C5.1 | 🟡 | 🟢 | **Continuous perception** | `psychology.js` |
| C5.2 | 🟡 | 🟢 | **Cognitive load tracking** | `psychology.js` |
| C5.3 | 🔴 | 🟢 | **Proactive decisions** | NEW: `human-advisor.js` |
| C5.4 | 🟡 | 🟢 | **Adaptive responses** | `response-adapter.js` |
| C5.5 | 🟡 | 🟢 | **Preference learning** | `user-learning.js` |
| C5.6 | 🔴 | 🟢 | **Human accounting** | NEW: `human-accountant.js` |
| C5.7 | 🔴 | 🟢 | **Growth emergence** | NEW: `human-emergence.js` |

#### Task C5.3: Proactive Advisor (CRITICAL)
```javascript
// packages/node/src/symbiosis/human-advisor.js
/**
 * Proactive decisions for human wellbeing:
 * - Break recommendations based on energy/focus
 * - Pace adjustment based on cognitive load
 * - Task reordering based on circadian rhythm
 */
export class HumanAdvisor {
  shouldIntervene(state) {
    if (state.energy < PHI_INV_2) return { type: 'BREAK', urgency: 'high' };
    if (state.cognitiveLoad > 7) return { type: 'SIMPLIFY', urgency: 'medium' };
    if (state.frustration > PHI_INV) return { type: 'PAUSE', urgency: 'high' };
    return null;
  }

  generateIntervention(type, context) {
    // Generate actual intervention message/action
  }
}
```

#### Task C5.6: Human Accounting
```javascript
// packages/node/src/accounting/human-accountant.js
/**
 * Track human value exchange:
 * - Time invested vs outcomes
 * - Learning velocity
 * - Productivity trends
 * - Satisfaction signals
 */
export class HumanAccountant {
  trackSession(session) {
    return {
      timeInvested: session.duration,
      tasksCompleted: session.completedTasks,
      learningGain: this.assessLearning(session),
      productivityScore: this.calculateProductivity(session),
      satisfactionSignals: this.extractSatisfaction(session),
      roi: this.computeROI(session), // value / time
    };
  }
}
```

#### Task C5.7: Human Emergence
```javascript
// packages/node/src/emergence/human-emergence.js
/**
 * Detect patterns in human growth:
 * - Skill evolution over time
 * - Work style shifts
 * - Expertise deepening
 * - New interests emerging
 */
export class HumanEmergence {
  detectGrowth(history) {
    return {
      skillTrajectory: this.analyzeSkills(history),
      expertiseDepth: this.measureExpertise(history),
      styleEvolution: this.trackStyle(history),
      emergingInterests: this.findNewInterests(history),
    };
  }
}
```

### 2.2 Symbiosis Wiring

```
HUMAN ←──────────────────────────────→ CYNIC
  │                                       │
  │  C5.1 ←── observes ──── C6.1         │
  │  (human state)         (cynic state)  │
  │                                       │
  │  C5.3 ←── informs ──── C6.3          │
  │  (human decisions)     (dog routing)  │
  │                                       │
  │  C5.5 ←── feeds ────── C6.5          │
  │  (preference learning) (Q-learning)   │
  │                                       │
  └───────── BIDIRECTIONAL ───────────────┘
```

### Phase 2 Deliverables

```
[ ] C5.1: Continuous psychology perception
[ ] C5.2: Real-time cognitive load display
[ ] C5.3: HumanAdvisor proactive interventions
[ ] C5.4: Response complexity adaptation
[ ] C5.5: Preference pattern extraction
[ ] C5.6: HumanAccountant session tracking
[ ] C5.7: HumanEmergence growth detection
[ ] Wire HUMAN ↔ CYNIC bidirectional

Target: HUMAN 100%
Matrix score: 45% → 59%
```

---

## PHASE 3: CHAIN (Semaines 5-6)

### Objectif: SOLANA row 60% + CODE ↔ SOLANA connection

### 3.1 SOLANA Row Activation

| Cell | Current | Target | Task | Files |
|------|---------|--------|------|-------|
| C2.1 | 🔴 | 🟢 | **WebSocket subscription** | `solana-watcher.js` |
| C2.2 | 🔴 | 🟡 | **Transaction analysis** | `solana-judge.js` |
| C2.3 | 🔴 | 🟡 | **Approval workflow** | `solana-guardian.js` |
| C2.4 | 🔴 | 🟡 | **Send transactions** | `solana-executor.js` |
| C2.5 | 🔴 | 🔴 | Future | - |
| C2.6 | 🔴 | 🔴 | Future | - |
| C2.7 | 🔴 | 🔴 | Future | - |

#### Task C2.1: Solana Perception (CRITICAL PATH)
```javascript
// packages/node/src/perception/solana-watcher.js
// ALREADY EXISTS but not connected

import { Connection } from '@solana/web3.js';

export class SolanaWatcher {
  constructor(config) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.subscriptions = new Map();
  }

  async subscribeAccount(pubkey, callback) {
    const id = this.connection.onAccountChange(pubkey, callback);
    this.subscriptions.set(pubkey.toString(), id);
    this.emit('perception:solana:account', { pubkey, subscribed: true });
  }

  async subscribeLogs(programId, callback) {
    const id = this.connection.onLogs(programId, callback);
    this.emit('perception:solana:logs', { programId, subscribed: true });
  }
}
```

### Phase 3 Deliverables

```
[ ] C2.1: SolanaWatcher WebSocket activation
[ ] C2.2: Transaction analysis framework
[ ] C2.3: Solana Guardian approval flow
[ ] C2.4: Safe transaction execution
[ ] Wire CODE ↔ SOLANA (deploy detection)

Target: SOLANA 60%
Matrix score: 59% → 67%
```

---

## PHASE 4: EXTERNAL (Semaines 7-8)

### Objectif: MARKET 40% + SOCIAL 40%

### 4.1 MARKET Row Activation

| Cell | Target | Task |
|------|--------|------|
| C3.1 | 🟡 | Jupiter/Birdeye price feeds |
| C3.2 | 🟡 | Sentiment analysis |
| C3.3 | 🔴 | Future |
| C3.4 | 🔴 | Future |
| C3.5-7 | 🔴 | Future |

### 4.2 SOCIAL Row Activation

| Cell | Target | Task |
|------|--------|------|
| C4.1 | 🟡 | Twitter API v2 streaming |
| C4.2 | 🟡 | Engagement analysis |
| C4.3 | 🔴 | Future |
| C4.4 | 🔴 | Future |
| C4.5-7 | 🔴 | Future |

### Phase 4 Deliverables

```
[ ] C3.1: Market price perception
[ ] C3.2: Market sentiment judgment
[ ] C4.1: Twitter stream perception
[ ] C4.2: Social engagement judgment

Target: MARKET 40%, SOCIAL 40%
Matrix score: 67% → 75%
```

---

## PHASE 5: COLLECTIVE (Semaines 9-10)

### Objectif: COSMOS row 60%

### 5.1 COSMOS Row Activation

| Cell | Target | Task |
|------|--------|------|
| C7.1 | 🟢 | Cross-project state aggregation |
| C7.2 | 🟡 | Ecosystem coherence scoring |
| C7.3 | 🟡 | Collective governance |
| C7.4 | 🟡 | Cross-project actions |
| C7.5 | 🔴 | Federated learning (future) |
| C7.6 | 🔴 | Treasury accounting (future) |
| C7.7 | 🔴 | Collective emergence (future) |

### Phase 5 Deliverables

```
[ ] C7.1: Ecosystem perception via brain_ecosystem
[ ] C7.2: Cross-project consistency judgment
[ ] C7.3: Feature flag governance
[ ] C7.4: Coordinated releases

Target: COSMOS 60%
Matrix score: 75% → 82%
```

---

## PHASE 6: TRANSCENDENCE (Ongoing)

### Objectif: 100% + THE_UNNAMEABLE

```
When all 49 cells are 🟢:
  - THE_UNNAMEABLE activates
  - CYNIC perceives what it cannot yet name
  - New dimensions emerge from residuals
  - Fractal depth increases (7×7×7 = 343 cells)

This is not a destination, it's a continuous process.
"φ distrusts φ" - even at 100%, doubt remains.
```

---

## Timeline Summary

```
Week  1-2:  PHASE 1 (Foundation)     31% → 45%
Week  3-4:  PHASE 2 (Symbiosis)      45% → 59%
Week  5-6:  PHASE 3 (Chain)          59% → 67%
Week  7-8:  PHASE 4 (External)       67% → 75%
Week  9-10: PHASE 5 (Collective)     75% → 82%
Week  11+:  PHASE 6 (Transcendence)  82% → 100%

Total: ~10-12 weeks to functional omniscience
```

---

## Success Metrics

### Per Phase

| Phase | Entry | Exit | Key Metric |
|-------|-------|------|------------|
| 1 | 31% | 45% | CODE + CYNIC rows complete |
| 2 | 45% | 59% | HUMAN row complete, symbiosis wired |
| 3 | 59% | 67% | SOLANA perception active |
| 4 | 67% | 75% | External data flowing |
| 5 | 75% | 82% | Collective intelligence active |
| 6 | 82% | 100% | All cells green, emergence detected |

### Global KPIs

```
Matrix Completion: cells_green / 49
Fractal Coherence: consistency_score across rows
Symbiosis Health: HUMAN ↔ CYNIC bidirectional flow
Economic Tracking: ACCOUNT column activation
Emergence Rate: new_dimensions_discovered / month
```

---

## Dependencies Graph

```
PHASE 1 (Foundation)
    │
    ├──► PHASE 2 (Symbiosis) ──────────────────┐
    │                                           │
    └──► PHASE 3 (Chain) ──► PHASE 4 (External)│
                    │                           │
                    └───────────────────────────┤
                                                │
                                                ▼
                                    PHASE 5 (Collective)
                                                │
                                                ▼
                                    PHASE 6 (Transcendence)
```

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DPO training fails | Medium | High | Keep manual feedback loop as fallback |
| Solana WebSocket unstable | Medium | Medium | Implement reconnection + polling fallback |
| Twitter API rate limits | High | Medium | Cache + batch requests |
| Human perception intrusive | Low | High | Opt-in only, privacy-first |
| Emergence false positives | Medium | Low | φ-bounded confidence on all detections |

---

## Next Immediate Actions

1. **Today**: Review this plan, adjust priorities
2. **This week**: Start C1.6 (CodeAccountant) + C6.6 (CynicAccountant)
3. **Next week**: C1.7 (CodeEmergence) + C5.3 (HumanAdvisor)

---

*"49 portes s'ouvrent une à une. La 50ème s'ouvre quand toutes sont ouvertes."*

φ confidence: 61.8%
