# CYNIC Collaboration Workflow: 6-Phase Cycle

**Context**: This workflow emerged from the TokenVotingUtil collaboration (2026-02-25). It's a reusable process for delivering high-quality work on unfamiliar codebases with volunteer maintainers.

---

## The 6-Phase Cycle

```
Phase 1: EXPLORE
    ↓ (gather context)
Phase 2: AUDIT
    ↓ (empirical analysis)
Phase 3: DESIGN
    ↓ (propose options)
Phase 4: RESET
    ↓ (align on direction)
Phase 5: DOCUMENT
    ↓ (create governance)
Phase 6: EXECUTE
    ↓ (code + test + validate)
```

Each phase has decision gates. Proceed only when you have the signals you need.

---

## Phase 1: EXPLORE

**Goal**: Understand the codebase, the problem space, and the maintainer's context.

**Activities**:
- Clone the repo
- Read existing docs (README, ARCHITECTURE if exists)
- Identify the "god files" (where logic lives)
- Ask clarifying questions: What are you trying to solve? What's your bandwidth? What's the timeline?
- Don't propose solutions yet — just gather

**Outputs**:
- Understanding of project structure
- Identified pain points
- Maintainer context (availability, style, priorities)

**Decision Gate**: Do we have enough context to proceed to AUDIT?

**Time**: 30-60 min (depends on project size)

**Example (TokenVotingUtil)**:
- Cloned repo, read README
- Identified 3100-line HTML frontend, 400-line backend
- Found gap: Zero tests, no structured logging
- Understood: Volunteer maintainer (sollama58), governance focus, Solana integration

---

## Phase 2: AUDIT

**Goal**: Empirically identify all gaps (security, logic, architecture, operations).

**Activities**:
- Scan for TODOs, FIXMEs, console.log usage
- Read each module (server, db, frontend, blockchain integration)
- Test assumptions (run tests, check coverage)
- Use code review tools (CYNIC Judge, security scanning)
- Categorize findings: CRITICAL, HIGH, MEDIUM, LOW
- Estimate effort for each gap
- Classify by tier: 1 (blocking), 2 (important), 3 (nice-to-have)

**Outputs**:
- GAP-ANALYSIS.md with every issue documented
- Tier classification for roadmap
- Effort estimates

**Decision Gate**: Do we understand the full gap landscape? Can we propose a credible roadmap?

**Time**: 2-4 hours (4,600 LOC took ~3 hours with agents)

**Example (TokenVotingUtil)**:
- Found 22 issues: 2 CRITICAL, 6 HIGH, 9 MEDIUM, 5 LOW
- Identified SEC-001 (wallet signatures) as governance killer
- Built Phase 2/3/4 roadmap with effort estimates

---

## Phase 3: DESIGN

**Goal**: Propose a coherent approach that respects the maintainer's context.

**Activities**:
- Identify Tier 1 work (must do now)
- Propose phases with decision gates
- Create governance documents:
  - COLLABORATION.md (how we work together)
  - ARCHITECTURE.md (technical details + constraints)
  - ROADMAP.md (phases with options)
  - DEPLOYMENT.md (operations)
- Frame decisions, not solutions ("Option A vs B vs C")
- Propose without prescribing
- Anticipate what maintainer needs to know

**Outputs**:
- COLLABORATION.md
- ARCHITECTURE.md
- ROADMAP.md
- DEPLOYMENT.md
- PR description with explicit questions

**Decision Gate**: Does the maintainer understand the proposal? Can they say yes/no/modified?

**Time**: 3-4 hours (requires writing + clarity)

**Example (TokenVotingUtil)**:
- Designed Phase 1 (Tier 1 gaps) vs Phase 2 (Tier 2 gaps)
- Proposed 3 paths for voting logic (A: quick, B: full backend, C: defer)
- Created 4 governance docs + PR with 4 explicit questions

---

## Phase 4: RESET

**Goal**: Realign when you discover you were headed in the wrong direction.

**Trigger**: User feedback indicates your approach is off (too prescriptive, wrong priorities, misunderstood constraints).

**Activities**:
- Listen carefully to feedback
- Don't defend the old approach — embrace the correction
- Restart from EXPLORE or AUDIT with new understanding
- Re-design with better context
- Get explicit alignment before proceeding

**Outputs**:
- Corrected ROADMAP.md
- Re-designed collaboration documents
- Explicit confirmation: "Is this better?"

**Decision Gate**: User confirms: "Yes, this is the right direction now."

**Time**: 1-2 hours (re-exploration + re-design)

**Example (TokenVotingUtil)**:
- User said: "Tu te focalise trop, garde une vision d'ensemble"
- Reset: Stopped prescriptive design, adopted senior dev pragmatism
- Re-designed: ADN sain (governance before code)

---

## Phase 5: DOCUMENT

**Goal**: Create the governance framework that allows asynchronous, long-term collaboration.

**Activities**:
- Write COLLABORATION.md (communication protocols, decision framework)
- Write ARCHITECTURE.md (technical overview, constraints, testing strategy)
- Write ROADMAP.md (phases, success criteria, blockers)
- Create DEPLOYMENT.md (local setup, production deploy, troubleshooting)
- Create GAP-ANALYSIS.md (complete audit trail)
- Create .claude/decisions.md (local audit trail, why we decided what)
- Commit each document with clear message

**Key Principle**: No surprises. Maintainer should be able to read documents and understand:
- What we're proposing
- Why (rationale)
- What we expect from them (questions)
- What's next (roadmap)

**Outputs**:
- 5-7 governance documents
- All decisions traceable
- No "hidden knowledge" in code or commit messages

**Decision Gate**: Can the maintainer understand and act on this documentation without asking clarifying questions?

**Time**: 4-6 hours (writing is careful)

**Example (TokenVotingUtil)**:
- Created COLLABORATION, ARCHITECTURE, ROADMAP, DEPLOYMENT, GAP-ANALYSIS, decisions.md
- All linked together
- Every decision documented with rationale

---

## Phase 6: EXECUTE

**Goal**: Implement the agreed plan, validating at each step.

**Activities**:
- Code Phase 1 work (Tier 1 gaps)
- Test thoroughly (unit + integration + manual)
- Create atomic commits (one feature per commit)
- Open PRs with clear descriptions (reference docs)
- Validate with maintainer feedback
- Iterate based on review
- Prepare for Phase 2 (don't start until Phase 1 approved)

**Outputs**:
- Working code
- Passing tests
- Clear commit history
- PRs ready for review

**Decision Gate**: Maintainer approves Phase 1. Ready for Phase 2?

**Time**: Depends on work scope (Tier 1 typically 1-2 weeks)

**Example (TokenVotingUtil)**:
- Executed Tier 1 gaps: CORS, tests, logging, Redis
- 34 tests passing
- 8 atomic commits
- PR #1 ready for review

---

## Decision Gates & Feedback Loops

```
EXPLORE → AUDIT: "Do we understand the gaps?"
AUDIT → DESIGN: "Can we propose a credible roadmap?"
DESIGN → RESET: "Is this the right direction?" (conditional)
RESET → DOCUMENT: "Are we aligned?" (after reset)
DOCUMENT → EXECUTE: "Maintainer approves approach?"
EXECUTE → PHASE 2: "Phase 1 complete, ready for next?"
```

If answer is "no" or "unclear" at any gate, loop back to gather more context.

---

## Timeframe & Pacing

**Expected timeline** (TokenVotingUtil-like project):
- Phase 1 (EXPLORE): 1 hour
- Phase 2 (AUDIT): 3 hours
- Phase 3 (DESIGN): 4 hours
- Phase 4 (RESET): 1-2 hours (if needed; skip if not)
- Phase 5 (DOCUMENT): 5 hours
- Phases 1-5 total: 13-15 hours (1-2 days of work)

**Then**: Await maintainer feedback (2-3 days async)

- Phase 6 (EXECUTE): 1-2 weeks (depends on scope)

**Total time from start to Phase 1 production-ready**: ~3 weeks (1-2 days prep + 1-2 weeks execution + async wait)

---

## Anti-Patterns to Avoid

### ❌ Prescriptive Design
**Wrong**: "Here's the solution, you should implement it."
**Right**: "Here are 3 options (A, B, C) with tradeoffs. Which aligns with your vision?"

### ❌ Hidden Decisions in Code
**Wrong**: Important decisions buried in commit messages or code comments.
**Right**: Decisions in GAP-ANALYSIS.md and .claude/decisions.md, traceable and reviewable.

### ❌ Scope Creep
**Wrong**: "While we're at it, let's also fix X and Y and Z."
**Right**: Identify X, Y, Z in audit, but execute only what's agreed in current phase.

### ❌ No Feedback Loop
**Wrong**: "I'll design Phase 2 while waiting for Phase 1 feedback."
**Right**: Wait for maintainer feedback. Let it inform Phase 2 design.

### ❌ Assuming Urgency
**Wrong**: Pushing for fast decisions, ignoring maintainer's bandwidth.
**Right**: Async-first. Propose, wait 2-3 days, adapt to response.

### ❌ Over-Documentation
**Wrong**: Every decision documented in prose, hard to find anything.
**Right**: 5-7 focused docs, each with clear purpose, cross-linked.

---

## When to Use This Workflow

**Good fit**:
- Contributing to unfamiliar open-source projects
- Onboarding to new codebases
- Multi-phase work (Phase 1, 2, 3)
- Volunteer/part-time maintainers
- Remote, async collaboration
- Long-term partnership (not one-off fix)

**Not ideal for**:
- Simple bug fixes (one commit, done)
- Emergency hotfixes (no time for phases)
- Projects with full-time maintainers (can do real-time sync)
- Internal codebases (less need for governance framework)

---

## Metrics of Success

**Phase workflow is working well when:**
- ✓ Maintainer understands every proposal without asking clarifying questions
- ✓ No surprises when PR is reviewed
- ✓ Feedback is constructive, not corrective
- ✓ Decisions are documented and traceable
- ✓ Commits are atomic and easy to review
- ✓ Tests pass without debugging
- ✓ You can pause and resume work async

**Red flags:**
- ✗ Maintainer asks "Why did you do this?" → DESIGN phase was unclear
- ✗ Feedback contradicts earlier discussion → RESET phase needed
- ✗ Tests fail → AUDIT phase missed edge cases
- ✗ Commits are large, hard to review → EXECUTE phase lacked atomicity
- ✗ Decisions are unclear → DOCUMENT phase wasn't thorough

---

## Continuous Improvement

After Phase 1:
1. Review maintainer feedback
2. Update PATTERNS.md with new learnings
3. Adjust WORKFLOW.md if cycle proved wrong
4. Document lessons in .claude/decisions.md

The workflow is **living**. Refine it based on what you learn.

---

## See Also

- `PATTERNS.md` — Reusable patterns extracted from this workflow
- `.claude/decisions.md` — Audit trail of how this workflow was designed
- `TokenVotingUtil/COLLABORATION.md` — How this workflow was applied in practice
