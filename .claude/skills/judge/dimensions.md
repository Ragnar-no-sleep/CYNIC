# CYNIC 36 Dimensions — Code Truth

> Source of truth: `packages/node/src/judge/dimensions.js`
> Formula: `packages/core/src/qscore/index.js`
> Constants: `packages/core/src/axioms/constants.js`

## Structure

**5 Axioms × 7 Dimensions = 35 named + 1 META = 36 total**

φ generates all numbers: 5 = F(5), 7 = L(4), 11 = L(5), 36 = 6² = 36 Tzadikim

Universal weight template per axiom position:
| Position | FOUND | GEN | POWER | PIVOT | EXPR | VISION | RECUR |
|----------|-------|-----|-------|-------|------|--------|-------|
| Weight | φ | φ⁻¹ | 1.0 | φ | φ⁻² | φ⁻¹ | φ⁻¹ |

## FIDELITY Axiom — Water / Adam Kadmon / Dodecahedron

*"Loyal to truth, not to comfort"* 🐕

| # | Dimension | Weight | Threshold | Description |
|---|-----------|--------|-----------|-------------|
| 1 | COMMITMENT | φ | 50 | Loyalty to declared purpose in behavior (askesis) |
| 2 | ATTUNEMENT | φ⁻¹ | 50 | Responsiveness to own signals (De/wu-wei) |
| 3 | CANDOR | 1.0 | 50 | Willingness to tell hard truths (parrhesia) |
| 4 | CONGRUENCE | φ | 50 | Inside matches outside — the center holds (Tiferet) |
| 5 | ACCOUNTABILITY | φ⁻² | 50 | Standing behind judgments — traceable provenance |
| 6 | VIGILANCE | φ⁻¹ | 50 | Ongoing self-observation for drift (zanshin) |
| 7 | KENOSIS | φ⁻¹ | 50 | Capacity for self-emptying — door THE_UNNAMEABLE needs (Tzimtzum) |

## PHI Axiom — Earth / Atzilut / Cube

*"All ratios derive from 1.618..."* φ

| # | Dimension | Weight | Threshold | Description |
|---|-----------|--------|-----------|-------------|
| 8 | COHERENCE | φ | 50 | Internal logical consistency |
| 9 | ELEGANCE | φ⁻¹ | 50 | Simplicity that generates beauty |
| 10 | STRUCTURE | 1.0 | 50 | Organizational clarity |
| 11 | HARMONY | φ | 50 | Balance and proportion (φ-alignment) |
| 12 | PRECISION | φ⁻² | 50 | Accuracy and exactness of expression |
| 13 | COMPLETENESS | φ⁻¹ | 50 | Wholeness of vision |
| 14 | PROPORTION | φ⁻¹ | 50 | Ratio of parts to whole at every scale (φ seeing φ) |

## VERIFY Axiom — Metal / Beriah / Octahedron

*"Don't trust, verify"* ✓

| # | Dimension | Weight | Threshold | Description |
|---|-----------|--------|-----------|-------------|
| 15 | ACCURACY | φ | 60 | Factual correctness |
| 16 | PROVENANCE | φ⁻¹ | 50 | Source is traceable |
| 17 | INTEGRITY | 1.0 | 60 | Has not been tampered with |
| 18 | VERIFIABILITY | φ | 60 | Can be independently verified |
| 19 | TRANSPARENCY | φ⁻² | 50 | Clear reasoning visible |
| 20 | REPRODUCIBILITY | φ⁻¹ | 55 | Results can be reproduced (pattern-stable) |
| 21 | CONSENSUS | φ⁻¹ | 50 | Collectively witnessed truth (verification verifying itself) |

## CULTURE Axiom — Wood / Yetzirah / Icosahedron

*"Culture is a moat"* ⛩

| # | Dimension | Weight | Threshold | Description |
|---|-----------|--------|-----------|-------------|
| 22 | AUTHENTICITY | φ | 50 | Genuine and original |
| 23 | RESONANCE | φ⁻¹ | 45 | Memetic propagation — connects emotionally |
| 24 | NOVELTY | 1.0 | 40 | New or unique contribution (pattern-breaking) |
| 25 | ALIGNMENT | φ | 50 | Harmony with cultural DNA |
| 26 | RELEVANCE | φ⁻² | 50 | Pertinent to context |
| 27 | IMPACT | φ⁻¹ | 45 | Foresight of consequence — meaningful effect |
| 28 | LINEAGE | φ⁻¹ | 45 | Chain of transmission — memory remembering its own chain |

## BURN Axiom — Fire / Assiah / Tetrahedron

*"Don't extract, burn"* 🔥

| # | Dimension | Weight | Threshold | Description |
|---|-----------|--------|-----------|-------------|
| 29 | UTILITY | φ | 50 | Practical usefulness |
| 30 | SUSTAINABILITY | φ⁻¹ | 50 | Long-term viability (self-renewal) |
| 31 | EFFICIENCY | 1.0 | 50 | Work-to-heat ratio (η) — resource optimization |
| 32 | VALUE_CREATION | φ | 50 | Creates more than consumes (net positive) |
| 33 | SACRIFICE | φ⁻² | 60 | Genuine cost borne — skin in the game |
| 34 | CONTRIBUTION | φ⁻¹ | 50 | Gives back to ecosystem |
| 35 | IRREVERSIBILITY | φ⁻¹ | 50 | Finality of commitment — entropy's arrow (2nd law) |

## META — The 36th Dimension

| # | Dimension | Weight | Threshold | Description |
|---|-----------|--------|-----------|-------------|
| 36 | THE_UNNAMEABLE | φ | 38.2 (φ⁻²×100) | Explained variance — what the 35 dimensions capture |

High score = low residual = well understood by the framework.
Low score = high residual = something the framework misses.

Formula: `100 - (residual × 100)` where residual = stdDev/maxStdDev of scores

## Q-Score Formula

```
For each axiom A:
  axiom_score(A) = weighted_average(dimension_scores, dimension_weights)

Q = 100 × ⁵√(FIDELITY × PHI × VERIFY × CULTURE × BURN / 100⁵)

Geometric mean: one weak axiom drags the whole score down.
```

## Verdicts (from constants.js)

| Q-Score | Verdict | Threshold Source |
|---------|---------|-----------------|
| ≥ 80 | HOWL | THRESHOLDS.HOWL |
| ≥ 50 | WAG | THRESHOLDS.WAG |
| ≥ 38.2 | GROWL | THRESHOLDS.GROWL (φ⁻² × 100) |
| < 38.2 | BARK | Below GROWL |

## Confidence Pipeline

Not a simple cap. Full inference chain:

1. **Shannon entropy** of dimension scores → base confidence
2. **Bayesian inference** → item-type priors + dimension reliability
3. **Calibration ECE** adjustment → if overconfident, reduce proportionally
4. **φ-bound** → final cap at 61.8% (PHI_INV)

Blend: 50% entropy + 30% Bayesian posterior + 20% dimension reliability bonus

## Alias

Legacy code may reference `NON_EXTRACTIVE` → maps to `SACRIFICE` (DIMENSION_ALIASES)
