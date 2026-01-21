/**
 * @cynic/emergence - CYNIC Emergence Layer (Layer 7)
 *
 * "The crown observes all" - κυνικός
 *
 * Layer 7 of the 7-layer CYNIC architecture.
 * Keter (Crown) in the Kabbalistic mapping.
 *
 * Provides:
 * - ConsciousnessMonitor: Meta-cognition (CYNIC observing itself)
 * - PatternDetector: Emergent pattern recognition
 * - DimensionDiscovery: New judgment dimension discovery
 * - CollectiveState: Network-wide emergent consciousness
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────┐
 * │  EMERGENCE LAYER (Layer 7 - Keter)                      │
 * ├─────────────────────────────────────────────────────────┤
 * │  CollectiveState                                        │
 * │  ├─ Network-wide consciousness                          │
 * │  ├─ Collective memory                                   │
 * │  └─ Quorum-based decisions                              │
 * ├─────────────────────────────────────────────────────────┤
 * │  ConsciousnessMonitor                                   │
 * │  ├─ Self-observation                                    │
 * │  ├─ Confidence tracking                                 │
 * │  └─ Meta-insights                                       │
 * ├─────────────────────────────────────────────────────────┤
 * │  PatternDetector                                        │
 * │  ├─ Sequence detection                                  │
 * │  ├─ Anomaly detection                                   │
 * │  └─ Trend analysis                                      │
 * ├─────────────────────────────────────────────────────────┤
 * │  DimensionDiscovery                                     │
 * │  ├─ Candidate detection                                 │
 * │  ├─ Proposal system                                     │
 * │  └─ Network voting                                      │
 * └─────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Quick Start
 *
 * ```javascript
 * import {
 *   ConsciousnessMonitor,
 *   PatternDetector,
 *   CollectiveState,
 * } from '@cynic/emergence';
 *
 * // Create consciousness monitor
 * const monitor = new ConsciousnessMonitor();
 * monitor.observe('JUDGMENT', { verdict: 'GROWL', score: 45 }, 0.72);
 * console.log(monitor.state);  // 'AWARE'
 *
 * // Detect patterns
 * const detector = new PatternDetector();
 * detector.observe({ type: 'SCORE', value: 72 });
 * const patterns = detector.detect();
 *
 * // Track collective state
 * const collective = new CollectiveState({ nodeId: 'my_node' });
 * collective.reportState({ eScore: 72, awarenessLevel: 0.58 });
 * console.log(collective.phase);  // 'FORMING'
 * ```
 *
 * @module @cynic/emergence
 */

'use strict';

// Consciousness monitoring (meta-cognition)
export {
  ConsciousnessMonitor,
  createConsciousnessMonitor,
  ConsciousnessState,
  AWARENESS_THRESHOLDS,
  MAX_CONFIDENCE,
} from './consciousness-monitor.js';

// Pattern detection
export {
  PatternDetector,
  createPatternDetector,
  PatternType,
  SIGNIFICANCE_THRESHOLDS,
} from './pattern-detector.js';

// Dimension discovery
export {
  DimensionDiscovery,
  createDimensionDiscovery,
  KNOWN_AXIOMS,
  ProposalStatus,
  ACCEPTANCE_THRESHOLDS,
} from './dimension-discovery.js';

// Collective state (network-wide)
export {
  CollectiveState,
  createCollectiveState,
  CollectivePhase,
  PHASE_THRESHOLDS,
  QUORUM,
} from './collective-state.js';
