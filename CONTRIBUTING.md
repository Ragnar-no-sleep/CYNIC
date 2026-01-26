# Contributing to CYNIC

> *"φ distrusts φ"* - We welcome skeptical contributions.

---

## Quick Start

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Run tests: `npm test`
5. Create a branch for your changes
6. Submit a pull request

---

## Development Guidelines

### Code Style

- Pure JavaScript (ES modules)
- Named exports only
- φ-aligned constants where applicable
- Structured logging via `@cynic/core/logger`

### Testing

All code must be tested. Run the test suite:

```bash
npm test                    # All tests
node --test packages/*/test/*.test.js  # Specific packages
```

### Commit Messages

Follow conventional commits:
- `feat(package): description`
- `fix(package): description`
- `test(package): description`
- `docs: description`

---

## Priority Areas

1. **Test coverage** - See task list for gaps
2. **Documentation** - Keep docs in sync with code
3. **Solana integration** - Burns, E-Score anchoring
4. **ZK circuits** - Noir proof generation

---

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for technical design.

Key principles:
- **PHI** (φ): Golden ratio in timing, thresholds, confidence
- **VERIFY**: Don't trust, verify everything
- **CULTURE**: Community is the moat
- **BURN**: 100% burn economy, no extraction

---

## Questions?

Open an issue or reach out via the repository.

---

*κυνικός | Loyal to truth, not to comfort*
