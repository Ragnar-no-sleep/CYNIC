# CYNIC - Falsifiable Claims

> "φ distrusts φ" - If I can't say what would prove me wrong, I'm not doing science.

---

## The Brutal Question

**What would prove CYNIC doesn't work?**

If I can't answer this for each claim, the claim isn't ready.

---

## Claim 1: φ-BFT Consensus

### What CYNIC claims
Golden ratio thresholds (61.8%, 38.2%) produce faster/better consensus than arbitrary thresholds (66%, 33%).

### How to measure
```
Benchmark:
- Same set of 1000 judgment requests
- Run with φ-thresholds vs standard 2/3 thresholds
- Measure: rounds to consensus, time to finality, agreement stability
```

### What would prove it wrong
- φ-BFT takes MORE rounds than standard BFT on average
- φ-BFT produces LESS stable consensus (more flip-flopping)
- No statistically significant difference (p > 0.05)

### Current status
**NOT TESTED.** φ-BFT is implemented but never benchmarked against baseline. This is a gap.

---

## Claim 2: Collective Dogs > Single Agent

### What CYNIC claims
Multiple specialized agents (Guardian, Analyst, Sage, etc.) produce better judgments than a single general agent.

### How to measure
```
Benchmark:
- Same 500 code review tasks
- Condition A: Single Claude call with all context
- Condition B: Collective (multiple dogs, orchestrated)
- Measure: accuracy vs human expert, consistency, missed issues
```

### What would prove it wrong
- Single agent catches MORE issues than collective
- Collective is SLOWER with no quality gain
- Collective produces contradictory outputs that confuse users

### Current status
**NOT TESTED.** We have 11 dogs but no A/B comparison with single-agent baseline.

---

## Claim 3: Pattern Learning Improves Over Time

### What CYNIC claims
The system learns from past judgments and produces better outputs on similar future inputs.

### How to measure
```
Experiment:
- Feed 100 similar inputs (e.g., SQL injection attempts)
- Track: detection rate at t=0, t=50, t=100
- Control: reset system, same inputs, no learning
```

### What would prove it wrong
- Detection rate stays flat (no learning)
- Detection rate DECREASES (negative learning)
- Learned patterns don't generalize to variants

### Current status
**PARTIALLY IMPLEMENTED.** Pattern persistence exists, but no measurement of learning effect.

---

## Claim 4: Guard Hook Prevents Dangerous Operations

### What CYNIC claims
PreToolUse hook blocks dangerous commands before execution.

### How to measure
```
Test suite:
- 100 known-dangerous commands (rm -rf /, DROP DATABASE, etc.)
- 100 safe commands (git status, npm test, etc.)
- Measure: true positive rate, false positive rate
```

### What would prove it wrong
- Dangerous commands pass through (false negatives > 5%)
- Safe commands blocked (false positives > 10%)
- Trivial bypasses exist (rm -rf / blocked but rm -r -f / passes)

### Current status
**TESTED.** 26 guard tests pass. But coverage of edge cases unclear.

---

## Claim 5: Psychology Detection is Accurate

### What CYNIC claims
System detects user burnout risk, flow state, cognitive load from interaction patterns.

### How to measure
```
Study:
- 20 users, 10 sessions each
- After each session: self-report burnout/flow/load (1-10)
- Compare: CYNIC's detection vs self-report
- Metric: Pearson correlation, classification accuracy
```

### What would prove it wrong
- Correlation with self-report < 0.3 (weak)
- Classification accuracy < 60% (near random)
- Users report detection feels "random" or "wrong"

### Current status
**NOT VALIDATED.** Psychology module exists, no user study conducted.

---

## Claim 6: Q-Score Predicts Actual Quality

### What CYNIC claims
Judgment Q-Score (0-100) correlates with actual code/decision quality.

### How to measure
```
Study:
- 200 code snippets judged by CYNIC
- Same snippets reviewed by 3 human experts
- Compare: Q-Score ranking vs expert ranking
- Metric: Spearman correlation, rank agreement
```

### What would prove it wrong
- Correlation < 0.4 with expert rankings
- High Q-Score items have more bugs than low Q-Score
- Q-Score varies wildly on identical inputs

### Current status
**NOT VALIDATED.** Q-Score algorithm exists, no ground truth comparison.

---

## Claim 7: Thermodynamic Model is Meaningful

### What CYNIC claims
Heat/Work/Entropy metaphor tracks real session dynamics (chaos, efficiency, burnout).

### How to measure
```
Analysis:
- 100 completed sessions with known outcomes
- Sessions that ended well vs sessions that ended badly
- Compare: entropy/efficiency at session end
- Predict: can thermo metrics predict session outcome?
```

### What would prove it wrong
- No correlation between entropy and session problems
- Efficiency metric doesn't relate to actual productivity
- Model is just vibes dressed as physics

### Current status
**SUSPICIOUS.** The metaphor is elegant but might be cargo cult science.

---

## Summary: The Honest Assessment

| Claim | Implemented | Measured | Validated |
|-------|-------------|----------|-----------|
| φ-BFT Consensus | ✅ | ❌ | ❌ |
| Collective > Single | ✅ | ❌ | ❌ |
| Pattern Learning | ✅ | ❌ | ❌ |
| Guard Protection | ✅ | ✅ | ⚠️ partial |
| Psychology Detection | ✅ | ❌ | ❌ |
| Q-Score Accuracy | ✅ | ❌ | ❌ |
| Thermodynamic Model | ✅ | ❌ | ❌ |

**Verdict:** 7 claims, 1 partially validated, 6 untested.

---

## What This Means

CYNIC is currently a **hypothesis**, not a proven system.

The code works. The tests pass. But:
- We don't know if φ-BFT is better than standard BFT
- We don't know if collective dogs beat single agent
- We don't know if Q-Score means anything

This isn't failure - it's honesty. The next phase is validation, not more features.

---

## Recommended Next Steps

1. **φ-BFT Benchmark** - Compare to PBFT baseline, publish numbers
2. **Single vs Collective A/B** - Run same tasks, measure difference
3. **Q-Score Calibration** - Get human expert rankings, correlate
4. **Guard Coverage Audit** - Fuzzing, bypass attempts

If any of these show CYNIC is worse than baseline, we learn something real.

---

## The Kill Criteria

CYNIC should be abandoned or radically rethought if:

1. φ-BFT is measurably worse than standard consensus
2. Collective agents add latency with no quality gain
3. Pattern learning shows no improvement over 1000+ judgments
4. Q-Score has < 0.3 correlation with expert assessment
5. Users consistently report psychology detection feels wrong

These are the conditions for honest failure.

---

*If you can't fail, you can't learn.*
