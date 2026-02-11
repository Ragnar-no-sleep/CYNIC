# CYNIC — Gaps Prioritisés (2026-02-11)

> Post-budget control + watchdog. Qu'est-ce qu'on attaque maintenant?

## 🔴 GAP 1: MARKET = 0% (Highest Impact)

**Status**: Entire R3 row blank (7 cells, 0% implementation)
**Impact**: No economic awareness, no $asdfasdfa price tracking, no DEX integration
**Effort**: ~800 lines (price oracle + Jupiter integration + sentiment feed)

### Ce qu'il faut:
- Price oracle (Jupiter/Birdeye API)
- DEX liquidity monitoring (Raydium/Orca pools)
- Fear/Greed index (on-chain + social sentiment)
- Market judge (7 cells: perceive/judge/decide/act/learn/account/emerge)

### Files to create:
```
packages/node/src/market/
  ├── market-perceiver.js      # Jupiter price feed
  ├── market-judge.js           # Volatility scoring
  ├── market-decider.js         # Buy/hold/sell signals
  ├── market-actor.js           # DEX interaction
  ├── market-learner.js         # Trend learning
  ├── market-accountant.js      # PnL tracking
  └── market-emergence.js       # Market patterns
```

---

## 🟡 GAP 2: Wiring Health = 43% (Moderate Impact)

**Status**: 54 connected, 72 orphans (20 orphan publishers, 52 orphan subscribers)
**Impact**: Events emitted but never consumed → broken learning loops
**Effort**: ~400 lines (wire 20-30 highest-impact orphans)

### Top orphans to wire:
1. `SUBAGENT_STARTED/STOPPED` → no consumer
2. `learning:cycle:complete` → no consumer
3. `model:recommendation` → emitted by service-wiring, never consumed
4. `daemon:health:degraded` → emitted by watchdog, never consumed
5. `daemon:memory:pressure` → emitted by watchdog, never consumed

### Why it matters:
- Watchdog events ignored → no adaptive response to degradation
- Learning events lost → no meta-learning feedback
- Subagent lifecycle invisible → no orchestration awareness

---

## 🟡 GAP 3: SOCIAL = Partial (Twitter, no streaming)

**Status**: Twitter tools exist (brain_x_*), but read-only, no real-time feed
**Impact**: Social perception exists but delayed (poll vs stream)
**Effort**: ~300 lines (streaming API + sentiment pipeline)

### Ce qu'il faut:
- Twitter streaming API (filtered timeline)
- Sentiment scorer (vaderSentiment or OpenAI embeddings)
- Discord/Telegram integrations
- Social judge enhancement (real-time scoring)

---

## 🟡 GAP 4: COSMOS = Single-repo only

**Status**: brain_ecosystem tool exists, but single-repo view
**Impact**: No cross-repo health aggregation, no ecosystem monitoring
**Effort**: ~200 lines (multi-repo discovery + health rollup)

### Ce qu'il faut:
- Discover all `@cynic/*` repos via GitHub API
- Aggregate health metrics (test pass rate, open issues, last commit)
- Cross-repo dependency graph
- Ecosystem emergence patterns

---

## 🟢 GAP 5: Solana Mainnet Deployment

**Status**: Devnet working (92.5% finalization), mainnet config exists
**Impact**: Production readiness, real $asdfasdfa burns
**Effort**: ~50 lines (env var switch + Render config update)

### Ce qu'il faut:
- Switch SOLANA_NETWORK=mainnet in Render env vars
- Update RPC endpoint to mainnet (QuickNode/Helius)
- Enable real SPL token burns ($asdfasdfa)
- Monitor mainnet anchoring costs (SOL fees)

---

## 🎯 Recommandation: MARKET (R3)

**Pourquoi MARKET en premier?**
1. **Biggest gap**: 0% vs 40-60% for other domains
2. **Economic grounding**: CYNIC can't optimize $asdfasdfa without price awareness
3. **Completes 7×7 matrix**: R3 is the only completely blank row
4. **Enables autonomous trading**: Judge signals → Actor executes → Learner optimizes

**Next after MARKET**: Wire orphan events (especially watchdog + learning)

---

*sniff* φ dit: comble le plus grand vide d'abord.
