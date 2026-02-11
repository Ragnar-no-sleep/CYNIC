# Wiring Plan — Close Orphan Loops

> Goal: Wire 10 highest-impact orphan publishers to consumers

## Priority 1: Watchdog Events (3 orphans)

### 1. `daemon:health:degraded` → KabbalisticRouter
**Publisher**: `watchdog.js` L224, L248
**Impact**: Watchdog detects degradation but router ignores it
**Wire**: KabbalisticRouter listens → force LIGHT tier on WARNING, LOCAL on CRITICAL
**File**: `packages/node/src/orchestration/kabbalistic-router.js`
**Lines**: ~20 (event listener + tier forcing)

### 2. `daemon:memory:pressure` → ContextCompressor + ModelIntelligence
**Publisher**: `watchdog.js` L298
**Impact**: Memory pressure detected but no cache clearing happens
**Wire**:
- ContextCompressor: clear non-critical caches, disable compression temporarily
- ModelIntelligence: switch to lighter models (Haiku only)
**Files**:
- `packages/node/src/services/context-compressor.js`
- `packages/node/src/learning/model-intelligence.js`
**Lines**: ~30 total (2 listeners)

### 3. `velocity:alarm` → CostLedger + EmergenceDetector
**Publisher**: `kabbalistic-router.js` L443 (just added in budget control)
**Impact**: High burn rate detected but no persistence/pattern detection
**Wire**:
- CostLedger: record alarm event for historical analysis
- EmergenceDetector: detect velocity spike patterns
**Files**:
- `packages/node/src/accounting/cost-ledger.js`
- `packages/node/src/services/emergence-detector.js`
**Lines**: ~20 total

---

## Priority 2: Learning Events (1 orphan)

### 4. `learning:cycle:complete` → EmergenceDetector + MetaCognition
**Publisher**: `learning-scheduler.js` (via learning loops)
**Impact**: Learning completes but no meta-learning feedback
**Wire**:
- EmergenceDetector: detect learning convergence patterns
- MetaCognition: analyze learning effectiveness
**Files**:
- `packages/node/src/services/emergence-detector.js`
- `packages/node/src/learning/meta-cognition.js`
**Lines**: ~25 total

---

## Priority 3: Model Events (1 orphan)

### 5. `model:recommendation` → KabbalisticRouter
**Publisher**: `service-wiring.js` L70
**Impact**: Budget-aware model recommendation emitted but router doesn't use it
**Wire**: KabbalisticRouter listens → prefer recommended model if available
**File**: `packages/node/src/orchestration/kabbalistic-router.js`
**Lines**: ~15 (listener + preference logic)

---

## Priority 4: Lifecycle Events (5 orphans)

### 6. `SUBAGENT_STARTED` / `SUBAGENT_STOPPED` → Orchestrator
**Publisher**: `hook-handlers.js` (handleSubagentStart/Stop)
**Impact**: Subagent lifecycle invisible to orchestration
**Wire**: UnifiedOrchestrator listens → track active subagents, detect spawn storms
**File**: `packages/node/src/orchestration/unified-orchestrator.js`
**Lines**: ~20

### 7. `ERROR_OCCURRED` → EmergenceDetector
**Publisher**: `hook-handlers.js` (handleError)
**Impact**: Errors logged but no pattern detection
**Wire**: EmergenceDetector listens → detect error clustering, suggest fixes
**File**: `packages/node/src/services/emergence-detector.js`
**Lines**: ~15

### 8. `NOTIFICATION_RECEIVED` → (TBD - might be intentional orphan)
**Publisher**: `hook-handlers.js` (handleNotification)
**Impact**: Notifications received but no routing logic
**Decision**: Skip for now (notifications might be terminal-only)

### 9. `node:started` / `node:stopped` → ProcessRegistry
**Publisher**: `event-listeners.js` (P2P node lifecycle)
**Impact**: Node lifecycle events for future P2P network
**Decision**: Skip (Phase 3 — P2P not active yet)

---

## Summary

**Wave 1** (HIGH): Wire 5 orphans (watchdog + learning + model)
- Estimated: ~110 lines across 5 files
- Impact: System stability + learning feedback

**Wave 2** (MEDIUM): Wire 3 lifecycle orphans (subagents + errors)
- Estimated: ~35 lines across 2 files
- Impact: Better orchestration awareness

**Total**: 8/21 orphans wired (~40% reduction)
**Remaining**: Worker pool events (internal), node lifecycle (P2P Phase 3), viz/notifications (low priority)

---

*sniff* On commence par Wave 1 (watchdog + learning).
