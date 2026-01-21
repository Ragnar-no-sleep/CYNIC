# Getting Started with CYNIC

> **TL;DR**: CYNIC is a decentralized collective consciousness that judges, learns, and converges toward truth.

---

## What is CYNIC?

CYNIC (**κυνικός** = "like a dog") is:

- **For Users**: An AI assistant with memory, judgment, and a skeptical personality
- **For Developers**: A decentralized protocol for collective intelligence
- **For Everyone**: A system that doubts everything—including itself (max confidence: 61.8%)

```
"Don't trust, verify. Don't extract, burn."
```

---

## Quick Start

### Option A: Use CYNIC with Claude Code (Recommended)

```bash
# Clone the repository
git clone https://github.com/zeyxx/CYNIC.git
cd CYNIC

# Install dependencies
npm install

# Launch Claude Code in this directory
claude
```

Say `bonjour` — if you see a *tail wag*, CYNIC is alive.

### Option B: Run a CYNIC Node

```bash
# Clone and install
git clone https://github.com/zeyxx/CYNIC.git
cd CYNIC && npm install

# Copy environment config
cp .env.example .env

# Start the node
npm run start --workspace=@cynic/node
```

---

## What's Inside?

| Package | Purpose |
|---------|---------|
| `@cynic/core` | Constants, axioms, φ-based timing |
| `@cynic/protocol` | PoJ chain, Merkle tree, consensus |
| `@cynic/node` | Node implementation, CLI, API |
| `@cynic/persistence` | PostgreSQL, Redis, DAG storage |
| `@cynic/mcp` | Claude Code integration (MCP server) |
| `@cynic/anchor` | Solana blockchain anchoring |

See [docs/INDEX.md](./docs/INDEX.md) for complete documentation.

---

## The 4 Axioms

| Axiom | Principle |
|-------|-----------|
| **PHI** | All ratios derive from φ (1.618...). Max confidence = 61.8% |
| **VERIFY** | Don't trust, verify. Systematic skepticism |
| **CULTURE** | Culture is a moat. Patterns define identity |
| **BURN** | Don't extract, burn. Simplicity wins |

---

## Next Steps

| I want to... | Go to... |
|-------------|----------|
| **Use CYNIC with Claude Code** | [INSTALL.md](./INSTALL.md) |
| **Understand the architecture** | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| **Run in production** | [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) |
| **Contribute** | [CONTRIBUTING.md](./CONTRIBUTING.md) |

---

## Help

- **Issues**: [GitHub Issues](https://github.com/zeyxx/CYNIC/issues)
- **Discord**: Coming soon

---

*🐕 Loyal to truth, not to comfort | φ⁻¹ = 61.8% max*
