# @cynic/core

> Core constants, axioms, and foundational modules for CYNIC.

**Last Updated**: 2026-01-21

---

## Overview

This package is the **source of truth** for all CYNIC constants and foundational abstractions.

```
"φ derives all" - Max confidence: 61.8%
```

---

## Installation

```bash
npm install @cynic/core
```

---

## Exports

| Module | Description |
|--------|-------------|
| `axioms` | PHI, PHI_INV, axiom definitions |
| `timing` | φ-hierarchical timing constants |
| `qscore` | Q-Score calculation (judgment quality) |
| `identity` | CYNIC personality, verdicts |
| `worlds` | 4 Kabbalah worlds framework |
| `config` | Secure configuration management |
| `refinement` | Self-critique and improvement |
| `orchestration` | Multi-agent coordination, consultation matrix, circuit breaker |
| `vector` | Semantic search/embeddings |
| `learning` | Feedback → calibration loop |
| `triggers` | Auto-judgment event handlers |
| `ecosystem` | External source monitoring |
| `context` | C-Score, token counting, budget management, context assembly |

---

## Usage

```javascript
import { PHI, PHI_INV, AXIOMS, calculateQScore } from '@cynic/core';

// Golden ratio constants
console.log(PHI);       // 1.618033988749895
console.log(PHI_INV);   // 0.618033988749895 (max confidence)

// Calculate judgment quality
const qScore = calculateQScore({
  dimensions: [...],
  weights: {...}
});
```

### Context Intelligence (NEW)

```javascript
import {
  calculateCScore,
  BudgetManager,
  assembleContext,
  BUDGET_THRESHOLDS
} from '@cynic/core';

// Calculate C-Score for content
const score = calculateCScore(
  { text: 'function login() {}', type: 'code' },
  { query: 'authentication', taskType: 'code' },
  { turnsSinceAdded: 2 }
);
console.log(score.C);  // 0-100

// Manage context budget (φ-aligned)
const budget = new BudgetManager({ maxTokens: 200000 });
console.log(budget.targetLimit);  // 47200 (23.6%)
console.log(budget.softLimit);    // 76400 (38.2%)
console.log(budget.hardLimit);    // 123600 (61.8%)

// Assemble context with "ends-matter" strategy
const result = assembleContext(items, context, { maxTokens: 50000 });
```

### Pack Coordination (NEW)

```javascript
import {
  ConsultationCircuitBreaker,
  getConsultants,
  shouldConsult,
  calculatePackEffectiveness
} from '@cynic/core';

// Get who to consult
const consultants = getConsultants('architect', 'design');
// ['reviewer', 'simplifier']

// Circuit breaker prevents infinite loops
const breaker = new ConsultationCircuitBreaker();
if (breaker.canConsult('architect', 'reviewer').allowed) {
  breaker.enterConsultation('architect', 'reviewer');
  // ... do consultation ...
  breaker.exitConsultation('architect', 'reviewer', { tokensUsed: 500 });
}

// Pack effectiveness metric
const E = calculatePackEffectiveness({
  avgQScore: 70,
  avgResponseTime: 8000,
  consensusRate: 0.8,
  consultationSuccess: 0.9
});
console.log(E.E);  // 0-100
```

---

## The 4 Axioms

| Axiom | Value | Principle |
|-------|-------|-----------|
| PHI | φ | All ratios derive from 1.618... |
| VERIFY | ✓ | Don't trust, verify |
| CULTURE | ⛩ | Culture is a moat |
| BURN | 🔥 | Don't extract, burn |

---

## License

MIT
