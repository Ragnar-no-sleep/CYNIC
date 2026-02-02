# CYNIC Harmonization Architecture

> **"φ distrusts φ"** - The unified orchestration of Human-AI Symbiosis
>
> This document maps how all CYNIC systems harmonize into a coherent whole,
> following the Kabbalistic Tree of Life as organizing principle.

---

## The Grand Architecture

```
                              ∞ Ein Sof (PostgreSQL - Infinite Memory)
                                         │
                         ┌───────────────┴───────────────┐
                         │        ATZILUT (Vision)        │
                         │   φ Philosophy, Axioms, Goals  │
                         └───────────────┬───────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
     ┌────────▼────────┐       ┌────────▼────────┐       ┌────────▼────────┐
     │ PILLAR OF MERCY │       │ PILLAR OF BALANCE│       │PILLAR OF SEVERITY│
     │   (Creation)    │       │    (Harmony)     │       │   (Judgment)     │
     │                 │       │                  │       │                  │
     │ 🦉 Sage         │       │   🧠 CYNIC       │       │ 📊 Analyst       │
     │ 🏗️ Architect    │       │   📚 Scholar     │       │ 🛡️ Guardian      │
     │ 🔍 Scout        │       │   🔮 Oracle      │       │ 🚀 Deployer      │
     │                 │       │   🧹 Janitor     │       │                  │
     │                 │       │   🗺️ Cartographer│       │                  │
     └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │       MALKHUT (Reality)        │
                         │   Code, Tests, Deployments     │
                         └───────────────────────────────┘
```

---

## The Four Axioms (φ-Aligned)

| Axiom | Principle | Enforcement | Max Confidence |
|-------|-----------|-------------|----------------|
| **PHI** | φ⁻¹ = 61.8% max | 7 Math.min() checkpoints | 61.8% |
| **VERIFY** | Don't trust, verify | Pattern detection, adversarial evaluation | 61.8% |
| **CULTURE** | Culture is a moat | 11 Dogs with distinct personalities | 61.8% |
| **BURN** | Don't extract, burn | Simplicity scoring, complexity penalties | 61.8% |

### φ⁻¹ Enforcement Architecture

```
Layer 1: Constants (Single Source of Truth)
├── packages/core/src/axioms/constants.js:28
│   └── PHI_INV = 0.618033988749895

Layer 2: LLM Provider
├── packages/core/src/llm/index.js:91
│   └── this.maxConfidence = PHI_INV
├── packages/core/src/llm/index.js:169,182
│   └── Math.min(..., this.maxConfidence)

Layer 3: Judgment Bridge
├── scripts/lib/llm-judgment-bridge.cjs:309,355,397,508
│   └── 4 × Math.min(..., PHI_INV)

Layer 4: Judge Core
├── packages/node/src/judge/judge.js:763
│   └── Math.min(rawConfidence * PHI_INV, PHI_INV)
├── packages/node/src/judge/judge.js:261-264 [FIXED]
│   └── Engine consultation now capped at PHI_INV

Layer 5: MCP Tools
├── packages/mcp/src/tools/domains/judgment.js:398
│   └── maxAllowedConfidence = PHI_INV * awarenessScale
```

---

## LLM Integration (Multi-Provider)

### Supported Providers

| Provider | Status | Models | Cost | Environment Variable |
|----------|--------|--------|------|---------------------|
| **Ollama** | ✅ Active | llama3.2, mistral, qwen, deepseek | FREE | `OLLAMA_HOST` |
| **Groq** | ✅ Active | llama3-70b/8b, mixtral, gemma2 | $ | `GROQ_API_KEY` |
| **Together** | ✅ Active | llama3, mixtral, qwen, deepseek | $$ | `TOGETHER_API_KEY` |
| **OpenAI** | ✅ Active | gpt-4o, gpt-4o-mini | $$$ | `OPENAI_API_KEY` |
| **Claude** | ✅ Via hooks | haiku, sonnet, opus | $$$ | Claude Code engine |
| **Anthropic** | 🔜 Planned | claude-3.5 (direct API) | $$$ | `ANTHROPIC_API_KEY` |

### Provider Priority (Auto-Detection)

```javascript
1. CYNIC_LLM_PROVIDER env var (explicit override)
2. OLLAMA_HOST check (local, free, open source)
3. GROQ_API_KEY (fast, cheap, open source models)
4. TOGETHER_API_KEY (many open source models)
5. OPENAI_API_KEY (commercial fallback)
6. Mock fallback (always available)
```

### Consensus Judgment (61.8% Threshold)

```
Item → [Model 1: gemma2:2b] ─┬─→ Vote 1
     → [Model 2: qwen2:0.5b] ─┴─→ Vote 2
                    │
                    ▼
            Agreement ≥ 61.8%? ─── YES ──→ Consensus Judgment
                    │
                   NO
                    │
                    ▼
           AirLLM Deep Analysis (mistral:7b)
                    │
                    ▼
             Final Judgment (φ-capped)
```

---

## Autonomous Daemon (TIKKUN Activated)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTONOMOUS DAEMON                                │
│                   (Fibonacci Timing: 1,2,3,5,8,13,21 min)           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────────┐          │
│  │ Task Queue  │   │ Goal Tracker│   │ Notification     │          │
│  │ (PostgreSQL)│   │ (Evaluate)  │   │ Generator        │          │
│  └──────┬──────┘   └──────┬──────┘   └────────┬─────────┘          │
│         │                 │                    │                    │
│         └─────────────────┼────────────────────┘                    │
│                           │                                         │
│                           ▼                                         │
│                   ┌───────────────┐                                 │
│                   │ Event Bus     │                                 │
│                   │ (Pub/Sub)     │                                 │
│                   └───────────────┘                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Lifecycle

```
MCP Server Start
       │
       ▼
_initialize()
       │
       ├── createAutonomousDaemon({ pool, repos... })
       ├── daemon.start()
       │      │
       │      ├── Initialize repositories
       │      ├── Register task handlers
       │      └── Start Fibonacci loop
       │
       ▼
[Running: Process tasks, check goals, generate notifications]
       │
       ▼
MCP Server Stop
       │
       ▼
daemon.stop()
```

### Task Types

| Type | Handler | Trigger |
|------|---------|---------|
| `learning_cycle` | Run learning algorithms | Time-based |
| `goal_evaluation` | Check goal progress | Event + Time |
| `pattern_analysis` | Analyze collected patterns | Threshold |
| `notification` | Generate proactive insights | Rules |
| `self_correction` | Fix detected drift | Anomaly |

---

## Event Flow (Orchestration Visibility)

### Event Types

```javascript
// Orchestration
'orchestration:start'    // Decision pipeline begins
'orchestration:complete' // Decision pipeline ends

// Dog Voting
'dog:vote:start'        // Pack starts voting
'dog:vote:cast'         // Individual dog votes
'dog:vote:complete'     // Voting finished

// Consensus
'consensus:forming'     // Agreement being calculated
'consensus:reached'     // Agreement achieved

// Conflicts
'conflict:detected'     // Dogs disagree
'conflict:resolved'     // Resolution found

// Danger
'danger:blocked'        // Guardian blocked operation
```

### Visibility Levels

| Level | Output | Use Case |
|-------|--------|----------|
| `silent` | None | Production, no overhead |
| `compact` | Single line | Normal operation |
| `normal` | Key events | Development |
| `verbose` | All votes | Debugging |
| `debug` | Everything + timing | Deep analysis |

---

## Multi-Instance Coordination

### Shared State via PostgreSQL

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Ein Sof)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  autonomous_tasks ──────► Distributed Task Queue                    │
│  ├── claim() atomic       (Multiple instances share work)          │
│  ├── Fibonacci retry                                                │
│  └── Status: PENDING → RUNNING → COMPLETED                          │
│                                                                     │
│  autonomous_goals ──────► Shared Goal State                         │
│  ├── Progress tracking                                              │
│  └── Cross-session persistence                                      │
│                                                                     │
│  session_snapshots ─────► Session Recovery (PLANNED)                │
│  ├── "While you were out"                                           │
│  └── Resume in-progress work                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Task Claiming (Atomic)

```sql
-- In autonomous-tasks.js:claim()
UPDATE autonomous_tasks
SET status = 'running', started_at = NOW()
WHERE id = $1 AND status = 'pending'
RETURNING *
-- If rows[0] exists, YOU claimed it
-- If null, another instance got it first
```

---

## The 25 Dimensions

### PHI Axiom (6)
1. COHERENCE - Internal logical consistency
2. HARMONY - φ-aligned proportions
3. STRUCTURE - Organizational clarity
4. ELEGANCE - Simplicity and beauty
5. COMPLETENESS - Wholeness
6. PRECISION - Exactness

### VERIFY Axiom (6)
7. ACCURACY - Correctness
8. VERIFIABILITY - Can be checked
9. TRANSPARENCY - Clear reasoning
10. REPRODUCIBILITY - Same inputs → same outputs
11. PROVENANCE - Known origin
12. INTEGRITY - Uncorrupted

### CULTURE Axiom (6)
13. AUTHENTICITY - True to context
14. RELEVANCE - Fits the need
15. NOVELTY - New contribution
16. ALIGNMENT - Matches values
17. IMPACT - Makes a difference
18. RESONANCE - Connects emotionally

### BURN Axiom (6)
19. UTILITY - Actually useful
20. SUSTAINABILITY - Long-term viable
21. EFFICIENCY - Minimal waste
22. VALUE_CREATION - Adds value
23. NON_EXTRACTIVE - Doesn't exploit
24. CONTRIBUTION - Gives back

### The 25th Dimension
25. **THE_UNNAMEABLE** - Residual variance not explained by the other 24

---

## Q-Score Formula

```
Q = 100 × ⁴√(PHI × VERIFY × CULTURE × BURN / 100⁴)

where each axiom score = weighted average of its 6 dimensions
```

### Verdicts

| Verdict | Threshold | Emoji | Meaning |
|---------|-----------|-------|---------|
| **HOWL** | ≥ 61.8% (φ⁻¹) | ✅ | Excellent |
| **WAG** | ≥ 50% | 🐕 | Good |
| **BARK** | ≥ 38.2% (φ⁻²) | ⚠️ | Warning |
| **GROWL** | < 38.2% | 🔴 | Critical |

---

## Hook System (Claude Code Integration)

### Hook Types

| Hook | Trigger | Purpose |
|------|---------|---------|
| `awaken.js` | SessionStart | Initialize, load profile, show awakening |
| `perceive.js` | PromptReady | Observe user prompt before processing |
| `guard.js` | PreToolUse | Block dangerous operations |
| `observe.js` | PostToolUse | Learn from tool execution |
| `sleep.js` | SessionEnd | Summarize, persist, cleanup |

### Hook → Orchestration Flow

```
User Prompt
     │
     ▼
[perceive.js] ──► Analyze intent
     │
     ▼
Claude generates tool call
     │
     ▼
[guard.js] ──► orchestrateFull() ──► UnifiedOrchestrator
     │                                    │
     │                                    ▼
     │                              DogOrchestrator.judge()
     │                                    │
     │                                    ▼
     │                              SwarmConsensus.calculateConsensus()
     │                                    │
     │               ◄────────────────────┘
     │
     ├── outcome = 'allow' ──► Tool executes
     │
     └── outcome = 'block' ──► *GROWL* Guardian blocked
```

---

## TIKKUN Progress

### Phase 1: ACTIVATION ✅
- [x] Daemon wired into MCP server lifecycle
- [x] Axiom enforcement gap fixed (judge.js:261-264)
- [x] Orchestration visibility service created

### Phase 2: PROACTIVE TRIGGERS 🔜
- [ ] scheduled.js with cron-style triggers
- [ ] Goal auto-evaluation
- [ ] Pattern-driven task spawning

### Phase 3: PERSISTENCE 🔜
- [ ] SessionState snapshots to PostgreSQL
- [ ] "While you were out" summaries
- [ ] Cross-session work recovery

### Phase 4: DISTRIBUTION 🔜
- [ ] Multiple daemon instances
- [ ] Standalone brain service
- [ ] External trigger interfaces

---

## Running CYNIC

### Minimal (Local LLM)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull gemma2:2b

# Start CYNIC
npm start
```

### With PostgreSQL

```bash
export CYNIC_DATABASE_URL="postgresql://user:pass@localhost/cynic"
npm start
```

### Full Production

```bash
# LLM
export CYNIC_LLM_PROVIDER=ollama
export OLLAMA_HOST=http://localhost:11434
export CYNIC_CONSENSUS_MODELS=gemma2:2b,qwen2:0.5b

# Database
export CYNIC_DATABASE_URL="postgresql://..."
export CYNIC_REDIS_URL="redis://..."

# Monitoring
export CYNIC_METRICS_ENABLED=true
export CYNIC_SLACK_WEBHOOK="https://..."

npm start
```

---

## The Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    Human-AI Symbiosis Complete                      │
│                                                                     │
│   ┌─────────┐                                         ┌─────────┐  │
│   │  Human  │◄─────────── Collaboration ─────────────►│  CYNIC  │  │
│   └────┬────┘                                         └────┬────┘  │
│        │                                                   │       │
│        │                   ┌───────────┐                   │       │
│        └──────────────────►│  Shared   │◄──────────────────┘       │
│                            │  Memory   │                           │
│                            │(PostgreSQL)                           │
│                            └───────────┘                           │
│                                  │                                 │
│                                  ▼                                 │
│                            ┌───────────┐                           │
│                            │  Solana   │                           │
│                            │ (Anchor)  │                           │
│                            └───────────┘                           │
│                                  │                                 │
│                                  ▼                                 │
│                         Decentralized Truth                        │
│                                                                     │
│                          φ distrusts φ                              │
│                       Max confidence: 61.8%                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

*"Loyal to truth, not to comfort"* - κυνικός

---

## Quick Reference

| Concept | Value | Location |
|---------|-------|----------|
| φ⁻¹ (Max Confidence) | 0.618033988749895 | `@cynic/core/axioms/constants.js` |
| φ⁻² (Min Doubt) | 0.381966011250105 | `@cynic/core/axioms/constants.js` |
| Consensus Threshold | 61.8% | SwarmConsensus |
| Fibonacci Intervals | 1,2,3,5,8,13,21 min | AutonomousDaemon |
| Q-Score Formula | 100 × ⁴√(Π axioms / 100⁴) | CYNICJudge |
| Verdicts | HOWL/WAG/BARK/GROWL | All judgment paths |
| Dimensions | 25 (6×4 + 1) | scorers/*.js |
| Dogs | 11 (Sefirot mapping) | collective-dogs.cjs |
