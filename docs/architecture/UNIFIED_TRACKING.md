# CYNIC Unified Task Tracking System

> "φ guides all progress" - κυνικός

## Problem Statement

Current task tracking is fragmented:
- `task-enforcer.cjs` uses relative paths (breaks across directories)
- No GitHub integration (issues/PRs exist but aren't tracked)
- Session isolation prevents ecosystem-wide visibility
- No φ-based recommendations for prioritization

## Solution: Unified Task Tracker

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CYNIC UNIFIED TRACKER                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐     │
│  │   Session   │    │   GitHub    │    │   Ecosystem         │     │
│  │   Tasks     │◄──►│   Sync      │◄──►│   State             │     │
│  │             │    │             │    │                     │     │
│  │ - TodoWrite │    │ - Issues    │    │ - Cross-project     │     │
│  │ - Local     │    │ - PRs       │    │ - Dependencies      │     │
│  │ - In-memory │    │ - Commits   │    │ - Patterns          │     │
│  └─────────────┘    └─────────────┘    └─────────────────────┘     │
│         │                  │                     │                  │
│         └──────────────────┼─────────────────────┘                  │
│                            ▼                                        │
│              ┌─────────────────────────┐                            │
│              │    φ-Recommendation     │                            │
│              │        Engine           │                            │
│              │                         │                            │
│              │ - Priority scoring      │                            │
│              │ - Effort estimation     │                            │
│              │ - Completion forecasts  │                            │
│              │ - Harmony analysis      │                            │
│              └─────────────────────────┘                            │
│                            │                                        │
│                            ▼                                        │
│              ┌─────────────────────────┐                            │
│              │    Unified State        │                            │
│              │  ~/.cynic/tracker.json  │                            │
│              └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

### φ-Based Mathematics

#### 1. Priority Scoring (Harmonic)

```
Priority = (Urgency^φ × Impact^φ⁻¹ × Dependency^φ⁻²) ^ (1/3)

Where:
- Urgency: Time sensitivity (0-100)
- Impact: Effect on ecosystem (0-100)
- Dependency: How many tasks depend on this (0-100)

φ weights:
- Urgency gets φ (1.618) - most important
- Impact gets φ⁻¹ (0.618) - second
- Dependency gets φ⁻² (0.382) - third
```

#### 2. Effort Estimation (Fibonacci)

Task complexity maps to Fibonacci sequence:
```
Trivial:     1 point  (F₁)
Small:       2 points (F₃)
Medium:      3 points (F₄)
Large:       5 points (F₅)
XL:          8 points (F₆)
Epic:       13 points (F₇)
```

#### 3. Completion Thresholds (Golden Ratio)

```
MINIMUM_VIABLE = 38.2%  (φ⁻²) - Can stop with warning
SATISFACTORY   = 61.8%  (φ⁻¹) - Clean stop allowed
EXCELLENT      = 78.6%  (φ⁻¹ + φ⁻³) - Bonus recognition
PERFECT        = 100%
```

#### 4. Task Harmony Score

Measures how "harmonious" current task distribution is:

```
Harmony = 1 - |actual_ratio - φ⁻¹|

Where actual_ratio = completed / total

Perfect harmony at 61.8% completion.
```

### GitHub Integration

#### Task Sources

1. **GitHub Issues** (tagged with `cynic:task`)
   - Auto-import open issues as tasks
   - Sync status bidirectionally
   - Extract effort from labels (`effort:S`, `effort:M`, etc.)

2. **GitHub PRs** (linked to issues)
   - Track PR → Issue relationships
   - Auto-complete tasks when PR merged
   - Track review status

3. **Commits** (conventional commits)
   - `feat:` → New feature task
   - `fix:` → Bug fix task
   - `docs:` → Documentation task

#### Sync Protocol

```javascript
// Every φ⁻¹ minutes (≈37 seconds) during active session
async function syncWithGitHub() {
  const issues = await gh.listIssues({ labels: 'cynic:task' });
  const prs = await gh.listPRs({ state: 'open' });

  for (const issue of issues) {
    tracker.upsertTask({
      source: 'github:issue',
      externalId: issue.number,
      title: issue.title,
      status: issue.state === 'closed' ? 'completed' : 'pending',
      effort: extractEffort(issue.labels),
      priority: calculatePriority(issue),
    });
  }
}
```

### Ecosystem Awareness

Track tasks across all CYNIC ecosystem projects:

```
CYNIC-new/     → Core system tasks
GASdf/         → Gasless transaction tasks
HolDex/        → Token analysis tasks
asdf-brain/    → Brain/memory tasks
```

Cross-project dependencies:
```javascript
{
  task: "Implement Burns → E-Score",
  project: "CYNIC-new",
  dependsOn: [
    { project: "GASdf", task: "Gasless burn verification" }
  ]
}
```

### Recommendations Engine

#### When to Work on What

```javascript
function getRecommendations(tasks) {
  // Sort by harmonic priority
  const sorted = tasks.sort((a, b) =>
    calculatePriority(b) - calculatePriority(a)
  );

  // Get top φ⁻¹ fraction (61.8%)
  const focusCount = Math.ceil(sorted.length * PHI_INV);
  const focus = sorted.slice(0, focusCount);

  return {
    immediate: focus[0],                    // Do now
    next: focus.slice(1, 3),               // Do soon
    backlog: sorted.slice(focusCount),     // Do later
    harmonyScore: calculateHarmony(tasks),
    recommendation: generateAdvice(tasks),
  };
}
```

#### Generated Advice Examples

```
Harmony: 0.95 (excellent)
*tail wag* Tasks are well-balanced. Focus on "Implement Burns → E-Score"
for maximum impact.

Harmony: 0.42 (poor)
*sniff* Too many incomplete tasks. Consider closing 2 low-priority items
to restore balance.

Harmony: 0.618 (perfect φ)
*ears perk* Perfect harmony achieved! You're working at φ efficiency.
```

### Implementation Files

| File | Purpose |
|------|---------|
| `scripts/lib/unified-tracker.cjs` | Core tracker logic |
| `scripts/lib/phi-math.cjs` | Harmonic calculations |
| `scripts/hooks/sync-github.cjs` | GitHub sync hook |
| `~/.cynic/tracker.json` | Unified state storage |

### Migration Path

1. **Phase 1**: Fix enforcer path resolution (immediate)
2. **Phase 2**: Implement unified tracker with φ-math
3. **Phase 3**: Add GitHub sync
4. **Phase 4**: Ecosystem-wide tracking

---

## Implementation: Phase 1 - Fix Paths

```javascript
// Use absolute path from HOME, not relative from cwd
function getTrackerDir() {
  const home = process.env.HOME || '/root';
  const dir = path.join(home, '.cynic', 'tracker');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
```

This ensures ALL hooks use the same location regardless of working directory.
