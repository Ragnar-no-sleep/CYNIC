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

## 11. Observability Pattern (DevOps Essentials)

**Pattern**: Build observability in from Phase 1. Logs → Metrics → Dashboards → Alerts. Not reactive monitoring, but proactive visibility.

**When to use**:
- Phase 1 Tier 1 work (production-bound)
- Any service handling critical data
- Multi-tenant or distributed systems
- When "it broke in production" is unacceptable

**How it works**:
```
LAYER 1: STRUCTURED LOGGING (Phase 1 Étape 1)
- Winston (or equivalent) with JSON format
- Fields: timestamp, level, service, trace_id, user_id, error, stack
- Log levels: DEBUG, INFO, WARN, ERROR
- Drain to: stdout (dev) + file (prod) + aggregator (ELK/datadog)

LAYER 2: METRICS (Phase 1 Étape 2)
- Prometheus/StatsD format:
  - Request latency (p50, p95, p99)
  - Error rates by endpoint
  - Queue depth (if async)
  - Cache hit ratio
  - Database query time

LAYER 3: DASHBOARDS (Phase 2)
- Real-time view of health:
  - Request rate (req/s)
  - Error rate (%)
  - Latency (ms)
  - Resource usage (CPU, memory, disk)

LAYER 4: ALERTS (Phase 2)
- Trigger on threshold:
  - Error rate > 5% for 5min
  - Latency p95 > 1000ms
  - Memory > 85%
  - Disk > 90%
```

**Why it matters**:
- **Detection** — Find problems before users report them
- **Context** — Logs + metrics together = faster diagnosis
- **Accountability** — Data-driven decisions, not guessing
- **SLA proof** — Can show "99.9% uptime" with evidence
- **Cost control** — Optimize based on real usage patterns

**Example (TokenVotingUtil)**:
```
WRONG:
  const result = calculateVotingTally(votes);
  console.log("Tally done");

RIGHT:
  logger.info("calculating tally", {
    trace_id: req.id,
    vote_count: votes.length,
    pool_size: tokenPool.size
  });
  const startTime = Date.now();
  const result = calculateVotingTally(votes);
  metrics.histogram('voting.tally_time', Date.now() - startTime);
  logger.info("tally complete", {
    trace_id: req.id,
    result_id: result.id,
    duration_ms: Date.now() - startTime
  });
```

**Anti-pattern**: "We'll add monitoring later" (later = too late when prod burns)

---

## 12. Incident Response Pattern

**Pattern**: Expect Phase 6 to fail sometimes. Build **incident playbooks** for critical scenarios before they happen.

**When to use**:
- Tier 1 work (blocking production)
- High-stakes governance systems
- Data-critical operations
- Any service with SLA

**How it works**:
```
STEP 1: IDENTIFY SCENARIOS (During Phase 5 DOCUMENT)
- What could go wrong?
  - Database connection lost
  - External API timeout (Helius, Streamflow)
  - Wallet signature validation fails
  - Voting logic bug revealed mid-election
  - Rate limiter misconfigured

STEP 2: CREATE PLAYBOOK (One per scenario)
Format:
  - **Symptom**: How will we detect this?
  - **Impact**: What breaks? Users affected?
  - **Diagnosis**: How to verify the root cause?
  - **Recovery**: Step-by-step fix
  - **Prevention**: How to avoid next time?
  - **Runbook**: Exact commands to execute

STEP 3: TEST PLAYBOOKS (Phase 6 acceptance test)
- Chaos engineering: intentionally break things
- Verify recovery procedure works
- Measure MTTR (Mean Time To Recovery)

STEP 4: PUBLISH & TRAIN (Phase 6 completion)
- Ops team reads and approves
- On-call engineer can execute without author present
```

**Example Playbook (TokenVotingUtil)**:
```
## INCIDENT: Helius RPC Timeout During Vote

**Symptom**:
- Logs: "helius.getVotingPower timeout"
- Metrics: RPC latency > 10000ms
- Users: Vote submission hangs > 30sec

**Impact**:
- Can't vote for up to 5 minutes
- Governance can't proceed
- SLA: 99% availability violated

**Diagnosis**:
1. curl -v https://api.helius-rpc.com/health
2. Check rate limit headers: X-RateLimit-Remaining
3. Verify network connectivity: ping api.helius-rpc.com
4. Check Helius status page: status.helius.io

**Recovery**:
1. Activate fallback RPC: FALLBACK_RPC_URL env var (pre-configured)
2. Verify votes use fallback: grep "fallback_rpc" logs
3. Wait 5min for Helius to recover
4. Switch back: (manual after 5min OR automatic after 10min)

**Prevention**:
- Add circuit breaker (fail fast after 3 timeouts)
- Add health check endpoint: GET /health/helius
- Add monitoring: alert on RPC latency > 5000ms
- Document: acceptable degradation (slower but works)

**Runbook**:
```bash
# Execute if INCIDENT: Helius RPC Timeout
export FALLBACK_RPC="https://api.mainnet-beta.solana.com"
docker restart voting-service  # Picks up env var
curl http://voting-service:3000/health/helius
# Expect: { "status": "ok", "rpc": "fallback" }
```
```

**Why it matters**:
- **Readiness** — No panic when crisis hits
- **Speed** — MTTR from 30min → 5min with playbook
- **Knowledge** — Doesn't die when author leaves
- **Confidence** — SLA becomes achievable, not hopeful

**Anti-pattern**: "Hope it doesn't break" or "oncall engineer figures it out"

---

## 13. Tech Debt Management Pattern

**Pattern**: Don't deny tech debt. Classify it, budget it, pay it down systematically in Phase 2/3.

**When to use**:
- After Phase 1 ships (you know what you built)
- Before Phase 2 starts (before interest compounds)
- When Phase 2 needs speed (can't afford debt)
- Any multi-phase project

**How it works**:
```
STEP 1: INVENTORY (End of Phase 1)
Scan codebase for debt markers:
- console.log (should use logger)
- // TODO, // FIXME
- Test coverage < 80%
- Function length > 200 lines
- Comments explaining "why", not "what"
- Copy-paste code (DRY violations)
- No error handling (try/catch missing)
- Hardcoded values (should be env vars)

Create DEBT.md:
| Item | Type | Impact | Effort | Phase |
|------|------|--------|--------|-------|
| API error handling incomplete | Code | Phase 2 will need it | 4h | 2 |
| Rate limiter tests missing | Test | 5% coverage | 2h | 2 |
| Winston logger not used in db.js | Tech | Ops can't debug | 1h | 2 |
| Voting result cached forever | Bug | Stale results possible | 3h | 2 |

STEP 2: CLASSIFY DEBT
- **CRITICAL**: Breaks Phase 2 or violates SLA
- **HIGH**: Slows Phase 2 work significantly
- **MEDIUM**: Nice to have in Phase 2
- **LOW**: Can defer to Phase 3

STEP 3: BUDGET PHASE 2
```
Phase 2 Effort = Feature Work + Debt Paydown
Feature Work: 60% of Phase 2 (new capabilities)
Debt Paydown: 40% of Phase 2 (paid interest)
```

STEP 4: TRACK REPAYMENT
- Each Phase 2 commit: [debt] tag if paying down debt
- Dashboard: $ of debt remaining
- Celebrate when CRITICAL → zero

**Example (TokenVotingUtil)**:
```
DEBT INVENTORY after Phase 1:
- console.log in 8 files (should use logger) — 2h
- No error handling in vote routes — 3h
- Hardcoded thresholds in HTML — 1h
- Test coverage 34% (should be 70%) — 5h

Phase 2 Plan (2 weeks):
- 1 week: Feature work (voting backend)
- 1 week: Debt paydown (logging, tests, env vars)
- Result: Coverage 70%, zero console.log, full error handling
```

**Why it matters**:
- **Honesty** — Don't pretend Phase 1 is "perfect"
- **Planning** — Phase 2 has realistic scope (feature + cleanup)
- **Ownership** — Debt is explicit, not hidden in refactor PRs
- **Momentum** — Paying down debt feels like progress

**Anti-pattern**: "We'll refactor later" (later never comes) or hiding debt in feature PRs

---

## 14. Knowledge Transfer Pattern

**Pattern**: Phase 1 code is useless if only YOU understand it. Build transfer mechanisms into Phase 1.

**When to use**:
- Volunteer maintainer (not on your team)
- Multi-person teams
- Code that will outlive you
- Security-critical systems

**How it works**:
```
TRANSFER MECHANISM 1: ARCHITECTURE.md
- What each module does (sentence per file)
- How they talk to each other (dataflow diagram)
- Key decisions and why
- Known limitations

TRANSFER MECHANISM 2: DEPLOYMENT.md
- Local setup (npm install, then what?)
- Env vars (what goes where?)
- Troubleshooting (common errors + fixes)
- Ops runbooks (how to monitor, scale, debug)

TRANSFER MECHANISM 3: CODE COMMENTS
- NOT: "this variable is x" (that's obvious)
- YES: "wallet format validated here because X amount" (why)
- NOT: Comment every line
- YES: Comment the "why", especially for non-obvious code

TRANSFER MECHANISM 4: INTEGRATION TESTS
- Tests are executable documentation
- "This test shows how voting works end-to-end"
- New dev reads tests → understands system

TRANSFER MECHANISM 5: LIVE WALKTHROUGH (optional)
- If volunteer maintainer: 1h video/call
- Walk through Phase 1 code + decisions
- Record it (future dev can watch)
- Q&A on decisions

TRANSFER MECHANISM 6: DECISION LOG
- Why did we choose Redis over in-memory?
- Why did we use Jest instead of Mocha?
- Why is this threshold 5% not 10%?
- Future dev reads .claude/decisions.md → understands
```

**Example (TokenVotingUtil)**:
```
✅ GOOD TRANSFER:
// Voting threshold must be > (not >=) to prevent tie scenarios
// When margin == threshold, vote is ambiguous per governance spec
// See GAP-ANALYSIS.md BUG-002 for detailed analysis
if (margin > threshold) { ... }

❌ BAD TRANSFER:
if (margin > threshold) { ... }  // No explanation

✅ GOOD ARCHITECTURE.md:
## streamflow.js (82 lines)
Integrates with Solana Streamflow to verify voting wallets.
- getVotingPower(wallet) → amount (async)
- Caches results 5min (see rate-limiter.js)
- Fails safe: if Helius RPC down, uses fallback (see DEPLOYMENT.md)

❌ BAD:
"This file talks to Streamflow"
```

**Why it matters**:
- **Scalability** — Code works even if author quits
- **Maintenance** — Next dev doesn't reverse-engineer
- **Trust** — Maintainer feels comfortable with codebase
- **Speed** — Onboarding new contributor = hours, not weeks

**Anti-pattern**: "It's self-documenting" or "I'll explain later" (later = never)

---

## 15. Security Audit Pattern

**Pattern**: Beyond "use CYNIC Judge". Define an actual security audit checklist for Tier 1 work.

**When to use**:
- Tier 1 work touching auth, tokens, or user data
- Anything blockchain-adjacent (wallet keys, signatures)
- Before Phase 6 ships to production

**How it works**:
```
AUDIT CHECKLIST (create in Phase 5 DOCUMENT):

AUTHENTICATION & SECRETS:
☐ No secrets in code (passwords, keys, tokens)
☐ All secrets from env vars (VAULT or .env.local)
☐ Secrets not logged (grep -r password logs/)
☐ API keys rotated (if leaked)
☐ Admin endpoints require auth (not guest-accessible)

WALLET & BLOCKCHAIN:
☐ Wallet addresses validated (checksummed, not just string)
☐ Wallet format correct (Solana: 44 chars base58)
☐ Signatures verified before accepting votes
☐ Nonce/replay-protection on sensitive ops
☐ No wallet impersonation (can't vote as other wallet)

DATA INTEGRITY:
☐ User input validated (no SQL injection, XSS)
☐ Vote counts can't be forged (server authoritative)
☐ Results tamper-evident (hash chain, signed)
☐ Deletion safe (no dangling references)
☐ Race conditions covered (concurrent votes handled)

API SECURITY:
☐ CORS locked down (not "*")
☐ CSRF protection (if session-based)
☐ Rate limiting enforced
☐ No sensitive data in URLs (use POST body)
☐ Error messages don't leak info ("invalid token" vs "user not found")

INFRASTRUCTURE:
☐ Database credentials in env vars
☐ Redis password set (not default)
☐ Logs don't contain secrets (verify in test)
☐ HTTPS enforced (never HTTP for prod)
☐ Certificate pinning (if blockchain RPC critical)

TESTING:
☐ Security tests in test suite (not separate)
☐ Attack scenarios documented (SQL inject attempt, etc.)
☐ Replay attack test (duplicate vote fails)
☐ Wallet impersonation test (fails)
```

**Example (TokenVotingUtil)**:
```
BEFORE Phase 6 merge, verify:
☐ Vote route validates wallet signature
☐ No console.log of votes (PII)
☐ Redis credentials from env var (not hardcoded)
☐ CORS only allows sollama58 domain
☐ Rate limiter blocks wallet submission > 1/min
☐ Tests include: "invalid signature rejected", "vote duplicated fails", etc.
```

**Why it matters**:
- **Governance safety** — Can't steal votes or forge results
- **Compliance** — Audit trail for regulatory needs
- **Confidence** — Can ship with 99% vs 50% confidence
- **Repeatable** — Same checklist for Phase 2, 3

**Anti-pattern**: Security review = "looks OK" or no checklist

---

## 16. Rollback & Recovery Pattern

**Pattern**: Phase 6 assumes code works. It won't always. Build reversible deployments from Phase 1.

**When to use**:
- Tier 1 production work
- Multi-step deployments (can't all-or-nothing)
- Services with 99.9% SLA requirement

**How it works**:
```
PRINCIPLE 1: DATABASE MIGRATIONS ARE REVERSIBLE
❌ WRONG:
ALTER TABLE votes DROP COLUMN wallet_signature;
(Can't undo if backfill fails)

✅ RIGHT:
-- Phase 1: Backward-compatible migration
ALTER TABLE votes ADD COLUMN wallet_signature VARCHAR(88);
-- Phase 2: Backfill existing votes
UPDATE votes SET wallet_signature = derive_from_tx(...);
-- Phase 3: Make column NOT NULL, drop old column
-- (Each step can be reversed)

PRINCIPLE 2: FEATURE FLAGS FOR MAJOR CHANGES
```
const VOTING_BACKEND_ENABLED = process.env.VOTING_BACKEND === "true";
if (VOTING_BACKEND_ENABLED) {
  // New backend tally logic
} else {
  // Old frontend tally (fallback)
}
```
Roll out: 1% traffic → 10% → 50% → 100%
If breaks: flip flag = instant rollback

PRINCIPLE 3: DEPLOYMENT STRATEGY
```
Canary Deploy (safer than bang-bang):
1. Deploy v2 to 1 canary server
2. Monitor for 5min (error rate, latency)
3. If OK: 10% of traffic → v2, 90% → v1
4. If good for 10min: 50% → v2
5. If good for 10min: 100% → v2
6. Keep v1 running for 30min (instant rollback if needed)
```

PRINCIPLE 4: ROLLBACK RUNBOOK
```
## EMERGENCY ROLLBACK (if Phase 6 breaks prod)

If error rate > 10% for 5min:
1. Check incident dashboard: is it v2 fault?
2. Execute rollback: ./scripts/rollback.sh v1
3. Verify: curl https://voting/health → expect v1
4. Document: incident report (why it broke?)
5. Root cause analysis before Phase 2

Rollback should take < 5min total.
```

PRINCIPLE 5: AUTOMATED HEALTH CHECKS
```
After deploy, run:
- /health → status 200
- /health/db → database reachable
- /health/helius → blockchain RPC responsive
- Load test: 1000 req/s for 30sec (can handle?)
If any fail: auto-rollback
```

**Example (TokenVotingUtil)**:
```
Phase 6 Deploy (secure):
1. Create backup: pg_dump > backup.sql
2. Deploy v2 code (feature flags = disabled)
3. Run migrations (reversible: add columns, not drop)
4. Enable feature flag: 10% traffic
5. Monitor 5min: error_rate, latency_p99, db_connections
6. If good: 100%
7. Keep v1 code running for 30min (instant rollback available)
8. After 30min with 0 errors: mark v1 as safe to delete

If breaks:
1. ./scripts/rollback.sh v1 (< 30sec)
2. Verify health checks
3. Resume 10% traffic on v1
4. Investigate why v2 failed
```

**Why it matters**:
- **Safety** — Can ship without fear
- **Speed** — MTTR (Mean Time To Recovery) is minutes, not hours
- **Confidence** — Can undo mistakes
- **Business** — Zero downtime deploy possible

**Anti-pattern**: "Just restart the service" or "hope it doesn't break"

---

## 17. Performance Tuning Pattern

**Pattern**: Phase 6 "tests pass" doesn't mean "meets SLA". Build performance budgets and tuning into execution.

**When to use**:
- Latency-sensitive operations (voting, blockchain queries)
- High-throughput scenarios (scaling beyond 100 users)
- Before Phase 2 (performance regressions compound)

**How it works**:
```
STEP 1: DEFINE PERFORMANCE BUDGET (Phase 5 DOCUMENT)
For each critical path:
- Vote submission: < 500ms (p95)
- Voting tally: < 2sec (p95)
- User page load: < 1sec (p95)
- Database query: < 100ms (median)

STEP 2: MEASURE BASELINE (Phase 6 load test)
```bash
# Load test: 100 concurrent users, 10 votes each
npx artillery quick -d 60 -r 100 http://localhost:3000/vote

Expect output:
- Throughput: 50-100 req/s
- Latency p50: 50ms
- Latency p95: 300ms
- Latency p99: 800ms
- Error rate: < 0.1%
```

STEP 3: IDENTIFY BOTTLENECKS
```bash
# Use profiler to find hotspots
node --prof server.js
# Generate human-readable report
node --prof-process isolate-*.log > report.txt
```

STEP 4: TUNE & RETEST
Common bottlenecks:
- Database: Add indexes, cache query results
- Blockchain: Batch RPC calls, cache voting power
- Rate limiter: Use Redis (fast) vs in-memory (slow)
- Logging: Async writes (don't block request)

STEP 5: AUTOMATE REGRESSION DETECTION
```
# CI/CD: run perf tests on every PR
if latency_p95 > 500ms:
  fail_pr("Performance regression detected")
```

**Example (TokenVotingUtil)**:
```
BASELINE (Phase 6):
- Vote submission (no tally): 200ms p95
- Vote + tally: 800ms p95 (too slow!)

INVESTIGATION:
- Found: tally recalculates all votes every time (O(n²))
- Found: blockchain RPC not cached (50 queries = 50 RPC calls)

TUNING:
- Cache voting power for 5min
- Optimize tally to O(n) using accumulator

RETEST:
- Vote submission: 200ms p95 ✓
- Vote + tally: 250ms p95 ✓
- Meets budget!

CI TEST:
- Added: performance_test.js (load 100 concurrent votes)
- Fails PR if p95 > 300ms
```

**Why it matters**:
- **UX** — Users don't wait 10 seconds to vote
- **Scalability** — Can handle 10x users without rewrite
- **Budget** — Don't oversize infrastructure (waste $)
- **Predictability** — SLA is achievable, not hopeful

**Anti-pattern**: "Optimize later" or "tests pass = performance is fine"

---

## Summary: Complete Pattern Hierarchy (17 Patterns)

```
LEVEL 1: Meta (How we decide)
  └─ Async-First Decision Making
  └─ Governance Before Code
  └─ Reset When Misaligned

LEVEL 2: Process (How we organize work)
  └─ 6-Phase Workflow (EXPLORE → AUDIT → DESIGN → RESET → DOCUMENT → EXECUTE)
  └─ Tier Classification for Roadmaps
  └─ Atomic Commits, Atomic PRs
  └─ Tech Debt Management
  └─ Knowledge Transfer

LEVEL 3: Execution (How we code + document)
  └─ Empirical Before Prescriptive
  └─ No Surprises (Transparency)
  └─ Atomic Documentation Updates
  └─ Decision Logging (Audit Trail)
  └─ Security Audit Pattern
  └─ Observability Pattern (DevOps)
  └─ Performance Tuning Pattern
  └─ Rollback & Recovery Pattern
  └─ Incident Response Pattern

LEVEL 4: Mindset (How we think)
  └─ Confidence Bounding (φ-Limit)
```

**Pattern Distribution:**
- **Development-focused**: 10 patterns (decision making, documentation, code)
- **Operations-focused**: 5 patterns (observability, incidents, rollback, performance, security)
- **Organizational**: 2 patterns (knowledge transfer, tech debt)

Use patterns at all levels. They reinforce each other. A complete Phase 1 uses patterns from all 4 levels.

---

## Pattern Selection by Project Type

**Simple bug fix (one-shot)**:
- Use Pattern #1 (Empirical Before Prescriptive) + Pattern #7 (No Surprises)
- Skip: Tech Debt, Observability, Incident Response

**Internal feature (team of 3)**:
- Use: Patterns 1-5, 7-9, 14-15 (development + knowledge transfer)
- Add: Patterns 11, 16 if production-critical
- Skip: Incident Response if non-critical

**Open-source contribution (volunteer maintainer)**:
- Use: ALL 17 patterns (full-stack: dev + ops + knowledge)
- Emphasis: Patterns 2, 3, 7, 8, 14 (governance, transparency, transfer)

**Production platform (scaling)**:
- Use: Patterns 1-17, especially 11-17 (operations-heavy)
- Phase 1: patterns 1-10, 14
- Phase 2: patterns 11-17 (observability, incidents, perf, rollback)

---

## Phase-Pattern Mapping

```
Phase 1: EXPLORE
  └─ Pattern #1 (Empirical) — Gather without prescribing

Phase 2: AUDIT
  └─ Pattern #1 (Empirical) — Analyze systematically

Phase 3: DESIGN
  └─ Pattern #2 (Async-First) — Propose options
  └─ Pattern #3 (Governance) — Create frameworks

Phase 4: RESET
  └─ Pattern #8 (Reset When Misaligned) — Adapt approach

Phase 5: DOCUMENT
  └─ Pattern #3 (Governance Before Code)
  └─ Pattern #6 (Decision Logging)
  └─ Pattern #7 (No Surprises)
  └─ Pattern #9 (Atomic Docs)
  └─ Pattern #13 (Tech Debt Inventory)
  └─ Pattern #14 (Knowledge Transfer)
  └─ Pattern #15 (Security Audit)

Phase 6: EXECUTE
  └─ Pattern #4 (Atomic Commits)
  └─ Pattern #5 (Tier Classification)
  └─ Pattern #10 (φ-Bounding)
  └─ Pattern #11 (Observability)
  └─ Pattern #15 (Security Audit)
  └─ Pattern #16 (Rollback & Recovery)
  └─ Pattern #17 (Performance Tuning)

After Phase 1 (Phase 2+):
  └─ Pattern #12 (Incident Response)
  └─ Pattern #13 (Tech Debt Paydown)
```

---

## How to Apply Patterns to New Projects

1. **Assess project scope**: Multi-phase or one-shot? Volunteer or team? Critical for SLA?
2. **Select patterns**: Use the "Pattern Selection by Project Type" guide above.
3. **Adapt, don't copy**: Each project is different. Vary implementation (timeframe, tools, detail level).
4. **Document your choices**: Why you chose pattern A over pattern B → feeds future learning.
5. **Learn**: After project, review what worked/didn't. Update PATTERNS.md.
6. **Share**: Which patterns helped most? Share with team via .claude/decisions.md.

---

## Continuous Learning

These patterns are **living**. Every project teaches new lessons.

After each major collaboration:
1. Which patterns worked best? Add detail/examples.
2. Which patterns felt forced? Mark as "context-dependent."
3. New patterns emerged? Add them.
4. Did a pattern fail? Document why (anti-pattern).
5. Keep PATTERNS.md updated.

Over time, patterns compound. You'll have a **complete playbook** for:
- Any team size
- Any project scope
- Any risk level
- Any deadline

---

## Anti-Patterns Summary

**What NOT to do:**
- Prescriptive design before understanding (Pattern #1)
- Assuming urgency without async-first (Pattern #2)
- Jumping to code without governance (Pattern #3)
- Large commits that mix changes (Pattern #4)
- No tier classification (Pattern #5)
- Decisions hidden in code (Pattern #6)
- Surprises in PR review (Pattern #7)
- Defending wrong direction instead of resetting (Pattern #8)
- One massive "updated docs" commit (Pattern #9)
- False certainty (Pattern #10)
- "We'll add monitoring later" (Pattern #11)
- "Hope it doesn't break" (Pattern #12)
- "We'll refactor later" (Pattern #13)
- "It's self-documenting" (Pattern #14)
- "Security review = looks OK" (Pattern #15)
- "Just restart the service" (Pattern #16)
- "Tests pass = performance is fine" (Pattern #17)

---

## See Also

- `WORKFLOW.md` — The 6-phase process these patterns fit into
- `WORKFLOW.md#Phase-Pattern-Mapping` — Where patterns apply in workflow
- `.claude/decisions.md` (TokenVotingUtil) — How patterns were applied in practice
- `TokenVotingUtil/COLLABORATION.md` — Patterns in action (async-first, governance, transparency)
- `TokenVotingUtil/GAP-ANALYSIS.md` — How Pattern #13 (Tech Debt) is documented
- `TokenVotingUtil/DEPLOYMENT.md` — Patterns #11, #14, #16 in practice
