# Reusable Collaboration Patterns

**Source**: TokenVotingUtil collaboration (2026-02-25)
**Context**: Emergent patterns from 6-phase workflow with volunteer maintainers
**Applicability**: Open-source contributions, multi-phase work, async collaboration

These are **observed patterns**, not prescribed. Use when they fit your situation.

---

## 1. Empirical Before Prescriptive

**Pattern**: Analyze the codebase first. Propose solutions second. Never code before understanding.

**When to use**:
- Unfamiliar codebase
- Complex problem space
- Uncertain requirements
- Long-term partnership

**How it works**:
```
1. Read all source files (categorize by size, complexity)
2. Scan for TODOs, console.logs, error handling gaps
3. Use code review tools (CYNIC Judge, security scanning)
4. Categorize findings (CRITICAL, HIGH, MEDIUM, LOW)
5. Estimate effort + blockers
6. THEN propose solutions (options, not mandates)
```

**Why it matters**:
- Prevents wasted work (don't code solutions maintainer doesn't want)
- Builds trust (shows you understand the codebase)
- Enables better decisions (you have full context)
- Reduces re-work (options are informed, not guessed)

**Example**:
- **Wrong**: "I'll add signature verification to fix SEC-001"
- **Right**: "SEC-001 requires signatures. This is a 2h fix. Here's the design. Approved?"

**Anti-pattern**: Prescriptive design before understanding (leads to reset/rework)

---

## 2. Async-First Decision Making

**Pattern**: Propose options, wait for maintainer feedback. Never assume or default. Frame as choices, not mandates.

**When to use**:
- Volunteer maintainers (non-constant availability)
- Remote collaboration
- Non-blocking decisions
- Multiple valid approaches

**How it works**:
```
1. Identify decision point
2. Outline 2-3 options with tradeoffs
   - Option A: faster, less robust
   - Option B: slower, more robust
   - Option C: defer to later
3. Explain rationale for each
4. Ask explicitly: "Which path aligns with your vision?"
5. Wait 2-3 days for response
6. Proceed based on answer
```

**Why it matters**:
- Respects maintainer's bandwidth (no pressure for fast sync)
- Gets buy-in (they chose, not you imposed)
- Documents decision (choice is traceable)
- Enables scaling (works with any maintainer pace)

**Example**:
```
Option A: Quick Fixes (1-2 days)
- Fix margin >= bug
- Add tie detection
- Low risk, fast

Option B: Full Backend Tally (1 week)
- Move tally to backend
- Server authoritative
- Bigger refactor, more robust

Option C: Defer (future)
- Don't fix now
- Revisit later

Which path? A / B / C?
```

**Anti-pattern**: Assuming maintainer wants speed, or waiting forever without offering options

---

## 3. Governance Before Code

**Pattern**: Build decision framework + documentation before writing code. Set up collaboration infrastructure first.

**When to use**:
- Multi-phase projects (Phase 1, 2, 3)
- Long-term partnership
- Unfamiliar maintainers
- Complex problem space

**How it works**:
```
1. Create COLLABORATION.md (how we communicate)
2. Create ARCHITECTURE.md (technical overview)
3. Create ROADMAP.md (phases with decision gates)
4. Create GAP-ANALYSIS.md (what needs fixing)
5. Create DEPLOYMENT.md (ops documentation)
6. THEN write code
```

**Why it matters**:
- Prevents miscommunication (expectations explicit)
- Enables async work (no real-time sync needed)
- Documents decisions (traceable, reviewable)
- Scales to Phase 2, 3 (structure repeats)
- Builds trust (shows professionalism)

**Example**:
- **Wrong**: "Here's a PR with 8 commits fixing stuff, review pls"
- **Right**: "Here's COLLABORATION.md explaining how we work. PR #1 fixes Tier 1 gaps. GAP-ANALYSIS.md shows what comes next."

**Anti-pattern**: Jumping straight to code without governance framework

---

## 4. Atomic Commits, Atomic PRs

**Pattern**: One feature per commit. One feature per PR. Each should be reviewable independently.

**When to use**:
- Multi-feature work
- Code review with maintainers
- Long-term codebase maintenance

**How it works**:
```
Commit 1: fix(security): CORS allowlist
Commit 2: feat(testing): Jest test suite
Commit 3: feat(logging): Winston logger
Commit 4: feat(infra): Redis rate limiter
Commit 5: docs: deployment guide + integration tests

Each commit:
- Stands alone (can be reverted without breaking other commits)
- Has clear message (why, not what)
- Is testable (tests pass)
- Is reviewable (not too large)
```

**Why it matters**:
- Easy to review (focused scope)
- Easy to revert (if one is wrong, don't revert others)
- Clear history (git log tells the story)
- Enables partial acceptance (maintainer can take some, skip others)

**Example**:
- **Wrong**: 1 commit with "Fix everything" (400 line diff)
- **Right**: 5 commits, each 50-100 lines, focused

**Anti-pattern**: Large commits that mix unrelated changes

---

## 5. Tier Classification for Roadmaps

**Pattern**: Classify work into 3 tiers. Tier 1 = blocking, Tier 2 = important, Tier 3 = nice-to-have. This creates natural phases.

**When to use**:
- Multi-phase projects
- Large gap analysis
- Resource-constrained teams
- Prioritization needed

**How it works**:
```
Tier 1: CRITICAL
- Blocks production
- Must fix now
- 5-10 issues typically
- Effort: 1-2 weeks

Tier 2: IMPORTANT
- Should fix before scaling
- Can defer if time-constrained
- 10-20 issues typically
- Effort: 2-4 weeks

Tier 3: NICE-TO-HAVE
- Future enhancement
- Can defer indefinitely
- 5-10 issues typically
- Effort: 4-8 weeks
```

**Why it matters**:
- Provides roadmap (clear phases)
- Enables prioritization (what's urgent vs important)
- Prevents scope creep (defer Tier 3 naturally)
- Communicates timeline (each tier has effort estimate)

**Example**:
```
Phase 1 (Tier 1): Security + Infrastructure (1-2 weeks)
- SEC-001: Wallet signatures
- SEC-002: Admin token auth
- BUG-001: Margin threshold

Phase 2 (Tier 2): Production Excellence (2-3 weeks)
- OPS: Health check depth
- ARCH: Transactions on delete
- FEAT: Audit logging

Phase 3+ (Tier 3): Scalability (future)
- Migrations system
- Pagination
- Result persistence
```

**Anti-pattern**: No tier classification (everything feels urgent)

---

## 6. Decision Logging (Local Audit Trail)

**Pattern**: Keep a `.claude/decisions.md` file. Log every major decision with context, options considered, choice made, and rationale.

**When to use**:
- Complex projects
- Phases spanning weeks/months
- Learning from mistakes
- Future context (you'll forget why you chose something)

**How it works**:
```
### 2026-02-25: Collaborative Governance Framework

**Question**: How do we collaborate with volunteer maintainer?

**Options**:
A) Prescriptive (we decide, present solutions)
B) Collaborative (we propose, get feedback)
C) Hands-off (minimal involvement)

**Decision**: B (Collaborative)

**Rationale**:
- Respects maintainer's bandwidth
- Builds buy-in (they choose direction)
- Enables async work
- Scales to multi-phase work

**Outcome**:
- Created COLLABORATION.md
- Proposed Phase 1/2/3 with options
- Asked 4 explicit questions in PR

**Blockers**: None

**Next Decision**: Await maintainer feedback on Phase 1 Étape 2 (voting bugs path A/B/C)
```

**Why it matters**:
- Traceable (know why you decided what)
- Learning (can review what worked/didn't)
- Context preservation (future you remembers)
- Risk mitigation (can defend decisions if challenged)

**Anti-pattern**: Decisions buried in code comments or commit messages only

---

## 7. No Surprises (Transparency)

**Pattern**: Document everything **before** code is written. Maintainer should read docs and understand what you're proposing without asking questions.

**When to use**:
- Unfamiliar maintainers
- Async collaboration
- Complex changes
- Building trust

**How it works**:
```
Before writing code:
1. ✓ COLLABORATION.md (how we work)
2. ✓ ARCHITECTURE.md (what we found)
3. ✓ ROADMAP.md (what we propose)
4. ✓ GAP-ANALYSIS.md (all gaps documented)
5. ✓ PR description (clear summary + questions)

Maintainer reads all this. Can say:
- "Yes, approved"
- "No, change approach"
- "Maybe, here's feedback"

Zero surprises.
```

**Why it matters**:
- Builds trust (shows professionalism)
- Prevents re-work (feedback comes early)
- Enables fast review (maintainer knows what to expect)
- Scales (works with any size project)

**Example**:
- **Wrong**: Push PR with 8 commits, maintainer reads for first time in review
- **Right**: Share docs first, get alignment, THEN push PR

**Anti-pattern**: "You'll understand once you see the code"

---

## 8. Reset When Misaligned

**Pattern**: If you realize you're headed wrong direction (based on feedback or deeper understanding), **stop and restart**. Don't patch the wrong direction.

**When to use**:
- User feedback contradicts your approach
- Deeper analysis reveals different priority
- Constraint discovered late
- Maintainer's bandwidth/vision clearer than expected

**How it works**:
```
1. Listen to feedback carefully
2. Don't defend the old approach
3. Acknowledge the misalignment
4. Return to EXPLORE or AUDIT phase
5. Re-design with new understanding
6. Get explicit alignment: "Better now?"
```

**Why it matters**:
- Prevents wasted work (don't build in wrong direction)
- Shows adaptability (not stubborn)
- Builds trust (responsive to feedback)
- Saves time overall (fix direction early, not late)

**Example**:
- **Wrong approach**: Prescriptive design (here's what you should do)
- **User feedback**: "Keep vision of ensemble, don't micro-focus"
- **Reset**: Abandon prescriptive design, adopt senior dev pragmatism
- **Re-design**: ADN sain (governance before code), options not mandates
- **Result**: Better alignment, less re-work

**Anti-pattern**: Defending the wrong approach, or patching it instead of resetting

---

## 9. Atomic Documentation Updates

**Pattern**: When docs become outdated, update them atomically. One doc change per commit, with clear message.

**When to use**:
- After major decisions
- After feedback from maintainers
- Keeping docs in sync with code

**How it works**:
```
Commit 1: docs: add COLLABORATION.md (governance framework)
Commit 2: docs: add ARCHITECTURE.md (technical overview)
Commit 3: docs: add ROADMAP.md (phases 1-3)
Commit 4: docs: fix README.md (out-of-sync CSP docs)
Commit 5: docs: add DEPLOYMENT.md (ops guide)
Commit 6: audit: add GAP-ANALYSIS.md (22 issues identified)
```

**Why it matters**:
- Easy to track doc changes (git log is clear)
- Easy to review (one doc per commit)
- Maintainer can cherry-pick (take some docs, skip others)
- Searchable (git history shows what changed when)

**Anti-pattern**: "Updated docs" in one massive commit

---

## 10. Confidence Bounding (φ-Limit)

**Pattern**: Never claim certainty beyond 61.8% (φ⁻¹). Always acknowledge doubt, especially on important decisions.

**When to use**:
- Presenting analyses (CYNIC Judge scores)
- Giving recommendations
- Claiming severity of bugs
- Predicting outcomes

**How it works**:
```
❌ "This is definitely the right approach" (100% confidence)
✓ "This seems like the right approach (62% confidence).
   Other valid paths exist, but this aligns with your constraints."

❌ "This bug is critical" (100%)
✓ "This bug appears critical (68% confidence).
   It blocks governance if real, but I haven't run the attack scenario."

❌ "Phase 2 will take 2 weeks" (100%)
✓ "Phase 2 should take 1-2 weeks (55% confidence).
   Depends on complexity discovered during Phase 1."
```

**Why it matters**:
- Honest (acknowledges uncertainty)
- Defensible (can explain the doubt)
- Builds credibility (not over-promising)
- Adapts (ready to change if new info arrives)

**Anti-pattern**: False certainty, or no confidence bound at all

---

## Summary: Pattern Hierarchy

```
LEVEL 1: Meta (How we decide)
  └─ Async-First Decision Making
  └─ Governance Before Code
  └─ Reset When Misaligned

LEVEL 2: Process (How we organize work)
  └─ 6-Phase Workflow (EXPLORE → AUDIT → DESIGN → RESET → DOCUMENT → EXECUTE)
  └─ Tier Classification for Roadmaps
  └─ Atomic Commits, Atomic PRs

LEVEL 3: Execution (How we code + document)
  └─ Empirical Before Prescriptive
  └─ No Surprises (Transparency)
  └─ Atomic Documentation Updates
  └─ Decision Logging (Audit Trail)

LEVEL 4: Mindset (How we think)
  └─ Confidence Bounding (φ-Limit)
```

Use patterns at all levels. They reinforce each other.

---

## How to Apply Patterns to New Projects

1. **Assess project scope**: Multi-phase or one-shot? Known maintainer or unfamiliar?
2. **Select patterns**: Which 3-5 patterns fit your situation?
3. **Adapt, don't copy**: Each project is different. Vary implementation.
4. **Document your choices**: Why you chose pattern A over pattern B.
5. **Learn**: After project, review what worked/didn't. Update PATTERNS.md.

---

## Continuous Learning

These patterns are **living**. Every project teaches new lessons.

After each major collaboration:
1. Which patterns worked? Add detail.
2. Which patterns failed? Mark as "limited applicability."
3. New patterns emerged? Add them.
4. Keep PATTERNS.md updated.

Over time, patterns compound. You'll have a playbook for complex collaborations.

---

## See Also

- `WORKFLOW.md` — The 6-phase process these patterns fit into
- `.claude/decisions.md` (TokenVotingUtil) — How patterns were applied in practice
- `TokenVotingUtil/COLLABORATION.md` — Patterns in action (async-first, governance before code, no surprises)
