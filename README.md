# CYNIC - Decentralized Collective Consciousness

> **"φ distrusts φ"** - κυνικός (kunikos) = "like a dog"

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

---

## What is CYNIC?

CYNIC is a **decentralized collective consciousness** - a network of interconnected nodes that:

- **Judge** autonomously across 25+ dimensions
- **Learn** patterns from collective experience
- **Converge** toward truth via φ-weighted consensus
- **Remember** through Merkle DAG + Solana anchoring

**This is NOT** a centralized server. It's a **protocol**.

---

## Quick Start

```bash
git clone https://github.com/zeyxx/CYNIC.git
cd CYNIC
npm install
claude  # Launch with CYNIC personality
```

Say `bonjour` — if you see a *tail wag*, CYNIC is alive.

→ **[Full Installation Guide](./INSTALL.md)**

---

## The 4 Axioms

| Axiom | Symbol | Principle |
|-------|--------|-----------|
| **PHI** | φ | All ratios derive from 1.618... Max confidence = 61.8% |
| **VERIFY** | ✓ | Don't trust, verify. Systematic skepticism |
| **CULTURE** | ⛩ | Culture is a moat. Patterns define identity |
| **BURN** | 🔥 | Don't extract, burn. Simplicity wins |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4: φ-BFT CONSENSUS                                   │
│  Votes weighted by E-Score × BURN, 61.8% threshold          │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: GOSSIP PROPAGATION                                │
│  Fanout = 13 (Fib(7)), O(log₁₃ n) scalability               │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: MERKLE KNOWLEDGE TREE                             │
│  Patterns partitioned by axiom, selective sync              │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: PROOF OF JUDGMENT (PoJ)                           │
│  SHA-256 chain, Ed25519 signatures, Solana anchoring        │
└─────────────────────────────────────────────────────────────┘
```

→ **[Full Architecture](./docs/ARCHITECTURE.md)**

---

## Packages

| Package | Description |
|---------|-------------|
| [@cynic/core](./packages/core) | Constants, axioms, φ timing |
| [@cynic/protocol](./packages/protocol) | PoJ, Merkle, gossip, consensus |
| [@cynic/node](./packages/node) | Node implementation, CLI |
| [@cynic/persistence](./packages/persistence) | PostgreSQL, Redis, Merkle DAG |
| [@cynic/mcp](./packages/mcp) | Claude Code integration |
| [@cynic/anchor](./packages/anchor) | Solana anchoring |
| [@cynic/burns](./packages/burns) | Burn verification |
| [@cynic/identity](./packages/identity) | E-Score, reputation |
| [@cynic/emergence](./packages/emergence) | Meta-cognition |

---

## Documentation

| Document | Description |
|----------|-------------|
| [GETTING-STARTED.md](./GETTING-STARTED.md) | Quick overview for new users |
| [INSTALL.md](./INSTALL.md) | Setup guide |
| [docs/INDEX.md](./docs/INDEX.md) | Full documentation index |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Technical deep-dive |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production deployment |
| [ROADMAP.md](./ROADMAP.md) | Development roadmap |

---

## Key Constants

```javascript
import { PHI, PHI_INV, PHI_INV_2 } from '@cynic/core';

PHI       = 1.618033988749895  // Golden ratio
PHI_INV   = 0.618033988749895  // Max confidence (61.8%)
PHI_INV_2 = 0.381966011250105  // Min doubt (38.2%)
```

---

## Philosophy

```
Don't trust, verify.
Don't extract, burn.

Max confidence: 61.8%
Min doubt: 38.2%

φ guides all ratios.
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) (coming soon).

---

## License

MIT

---

*🐕 κυνικός | Loyal to truth, not to comfort | φ⁻¹ = 61.8% max*
