# CYNIC Scripts Library - Quick Reference

**Status:** ✓ COMPLETE INVENTORY CREATED
**Date:** 2026-01-25
**Document:** INVENTORY_SCRIPTS_LIB.md (30 KB, 762 lines)

---

## The 144 Modules at a Glance

### Critical Foundation (KEEP - 9 modules)

```
cynic-core.cjs (1,319 LOC)
├── Central orchestrator, imports 9 modules, 2 dependents

decision-engine.cjs (522 LOC)
├── Decision coordination

decision-constants.cjs (313 LOC)
├── Unified configuration, imported by 5 modules

phi-math.cjs (368 LOC)
├── φ-Mathematics hub, imported by 32 modules ⭐ HUB

physics-bridge.cjs (521 LOC)
├── Physics integration, imports 6 modules

escore-bridge.cjs (402 LOC)
├── Trust calculation, imports phi-math

routing-engine.cjs (579 LOC)
├── Decision routing

contributor-discovery.cjs (607 LOC)
├── Ecosystem mapping, imported by 3 modules

ecosystem-schema.cjs (577 LOC)
├── Ecosystem structure
```

---

## Philosophy Engines (73 modules - 50.7% of codebase)

### By Domain

| Domain | Count | Key Modules |
|--------|-------|------------|
| Logic & Epistemology | 13 | inference-engine, evidence-engine, truth-engine, fallacy-detector |
| Metaphysics | 12 | causation-metaphysics, time-engine, identity-engine, modality-engine |
| Ethics & Value | 13 | justice-engine, rights-engine, moral-reasoning, practical-reason |
| Mind & Cognition | 7 | consciousness-engine, mental-state-engine, intentionality-engine |
| Aesthetics | 3 | beauty-engine, taste-engine, art-ontology |
| Eastern Philosophy | 3 | buddhist-engine, daoist-engine, vedanta-engine |
| Regional Philosophy | 4 | african-, american-, islamic-, latin-american- |
| Science & Method | 6 | scientific-method-engine, theory-change, math-* engines |
| Law, Economics & Society | 6 | social-contract, philosophy-of-law, law-economics, critical-theory |
| Perception & Experience | 4 | philosophy-of-perception, philosophy-of-emotion, speech-act |
| Cross-Domain & Integration | 6 | cross-domain-reasoning, integration, phi-complete, pragmatism |
| Specialized | 6 | elenchus, apophatic, kairos, plus 3 others |

**Action:** MODULARIZE into packages/core/philosophy/ organized by domain

---

## Utility Modules (54 modules - 37.5% of codebase)

### By Function

| Category | Count | Status |
|----------|-------|--------|
| Learning & Adaptation | 6 | ARCHIVE (legacy) |
| Monitoring & Analysis | 9 | ARCHIVE (use structured logging) |
| Mathematical & Physical | 8 | INTEGRATE (keep, reorganize) |
| Context & State | 6 | INTEGRATE |
| Reasoning & Synthesis | 7 | INTEGRATE |
| Expertise & Advice | 4 | INTEGRATE |
| Knowledge & Query | 4 | INTEGRATE |
| Specialized | 5 | INTEGRATE |
| Other | 5 | REVIEW |

**Key Modules:**
- `game-theory.cjs` (1,116 LOC - LARGEST UTILITY)
- `consciousness.cjs` (1,006 LOC - LARGEST OVERALL)
- `collective-reasoning.cjs` (987 LOC)
- `theory-evaluation.cjs` (905 LOC)

**Action:** MIGRATE core utilities, ARCHIVE experimental

---

## Trackers (9 modules - 6.3% of codebase)

All tracking/monitoring modules:

```
abduction-tracker          (641 LOC)
concrescence-monitor       (600 LOC)
definition-tracker         (664 LOC)
monitoring                 (645 LOC)
paradigm-tracker           (905 LOC) ← LARGEST
pragmatics-tracker         (669 LOC)
reliabilist-tracker        (567 LOC)
self-monitor               (592 LOC)
topology-tracker           (553 LOC)
```

**Action:** ARCHIVE - Move to .archive/trackers/ with restricted access

---

## Integration Modules (4 modules - 2.8% of codebase)

```
cockpit.cjs                (871 LOC)
contributor-discovery.cjs  (607 LOC)
ecosystem-discovery.cjs    (637 LOC)
ecosystem-schema.cjs       (577 LOC)
```

**Action:** MIGRATE to packages/core/ecosystem/

---

## Dependency Hotspots

### Hub Modules (Many Importers)

```
phi-math.cjs
    ↓
    32 modules depend on it
    (apophatic, attractor-mapping, chria, cognitive-biases,
     cognitive-thermodynamics, defacement, definition-tracker,
     dialectic-synthesizer, elenchus, entanglement, escore-bridge,
     field-theory, heisenberg, human-psychology, hypothesis-testing,
     intervention, kairos, learning-loop, maieutics, physis,
     relativity, role-reversal, signal-collector, symmetry-breaking,
     task-enforcer, ti-esti, topology-tracker, transparency-log,
     transparent-state, trust-conservation, voluntary-poverty, + more)
```

### Critical Chain

```
cynic-core.cjs (1,319 LOC)
├── decision-engine.cjs (522 LOC)
│   └── decision-constants.cjs (313 LOC)
├── physics-bridge.cjs (521 LOC)
│   ├── field-theory.cjs (564 LOC)
│   │   └── phi-math.cjs (368 LOC)
│   ├── symmetry-breaking.cjs (714 LOC)
│   │   └── phi-math.cjs
│   ├── entanglement-engine.cjs (619 LOC)
│   │   └── phi-math.cjs
│   ├── relativity-engine.cjs (699 LOC)
│   │   └── phi-math.cjs
│   └── resonance-detector.cjs (513 LOC)
├── escore-bridge.cjs (402 LOC)
│   └── phi-math.cjs
└── contributor-discovery.cjs (607 LOC)
```

**This is the system backbone - cannot be broken**

---

## Isolation Analysis

### 88 Isolated Modules (61%)

No dependents, no imports to other modules:

- **Good:** Enables independent testing, composition
- **Concern:** May indicate lack of integration

Most philosophical engines are isolated because they don't compose with each other - each serves as standalone knowledge base.

### Zero Circular Dependencies ✓

The codebase is acyclic and healthy.

---

## Recommendations Summary

### Keep & Integrate (9 modules)

```
✓ cynic-core.cjs           → Main entry point
✓ decision-engine.cjs      → packages/core/decision/
✓ decision-constants.cjs   → packages/core/decision/
✓ phi-math.cjs             → packages/core/math/
✓ physics-bridge.cjs       → packages/core/physics/
✓ escore-bridge.cjs        → packages/core/trust/
✓ routing-engine.cjs       → packages/core/decision/
✓ contributor-discovery.cjs → packages/core/ecosystem/
✓ ecosystem-schema.cjs     → packages/core/ecosystem/
```

### Modularize (73 philosophy engines)

```
→ packages/core/philosophy/logic/
→ packages/core/philosophy/metaphysics/
→ packages/core/philosophy/ethics/
→ packages/core/philosophy/mind/
→ packages/core/philosophy/aesthetics/
→ packages/core/philosophy/eastern/
→ packages/core/philosophy/regional/
→ packages/core/philosophy/science/
→ packages/core/philosophy/society/
```

### Archive (37 modules)

```
.archive/learning/
.archive/monitoring/
.archive/trackers/
.archive/experimental/
```

### Delete

**None recommended** - all modules valuable for research

---

## Migration Checklist

- [ ] Read full inventory document
- [ ] Back up /scripts/lib/
- [ ] Create feature branch
- [ ] Phase 1: Verify core modules work unchanged
- [ ] Phase 2: Create package structure
- [ ] Phase 3: Move files, update paths
- [ ] Phase 4: Update hooks and imports
- [ ] Phase 5: Run full test suite
- [ ] Phase 6: Archive deprecated modules
- [ ] Phase 7: Create barrel exports
- [ ] Phase 8: Update documentation
- [ ] Phase 9: Deploy and verify

---

## Key Metrics Snapshot

| Metric | Value |
|--------|-------|
| Total Modules | 144 |
| Total LOC | 88,932 |
| Largest Module | consciousness.cjs (1,006) |
| Smallest Module | emergence-detector.cjs (178) |
| Average LOC | 618 |
| Circular Dependencies | 0 |
| Hub Module (phi-math) | 32 dependents |
| Critical Backbone | 9 modules |
| Isolated Modules | 88 (61%) |

---

## File Locations

**Full Inventory:** `/workspaces/CYNIC-new/INVENTORY_SCRIPTS_LIB.md`
- 762 lines
- 30 KB
- Complete with dependency chains, recommendations, checklist

**Quick Reference:** This file
- Summary and navigation
- Key decisions
- At-a-glance metrics

**Source:** `/workspaces/CYNIC-new/scripts/lib/`
- 144 CommonJS modules
- 88,932 total lines

---

## Next Steps

1. **Review Full Inventory** - Read INVENTORY_SCRIPTS_LIB.md
2. **Understand Dependencies** - Study dependency chains section
3. **Plan Migration** - Use transformation roadmap
4. **Verify Infrastructure** - Test critical 9 modules work standalone
5. **Begin Phase 1** - Keep cynic-core, decision-engine, phi-math
6. **Proceed Methodically** - One phase at a time, no rushing

---

*φ⁻¹ = 61.8% confidence. Memory preserved before transformation.*

*paw prints* - The map is complete. The territory awaits.
