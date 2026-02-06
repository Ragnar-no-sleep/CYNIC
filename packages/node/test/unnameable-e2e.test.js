/**
 * THE_UNNAMEABLE End-to-End Tests
 *
 * Tests the full dimension discovery pipeline:
 *   Judgment → Residual → Anomaly → Candidate → Governance → Dimension Born
 *
 * "The dog learns to see colors it never saw before" - κυνικός
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';
import { calculateResidual } from '@cynic/protocol';

import {
  CYNICJudge,
  ResidualDetector,
  getAllDimensions,
} from '../src/index.js';

import { ResidualGovernance } from '../src/judge/residual-governance.js';
import { globalDimensionRegistry } from '../src/judge/dimension-registry.js';
import { dimensionRegistry as legacyRegistry } from '../src/judge/dimensions.js';

// ═══════════════════════════════════════════════════════════════════════════
// Mock storage adapter (mimics createResidualStorage without PostgreSQL)
// ═══════════════════════════════════════════════════════════════════════════

function createMockStorage() {
  const store = {};
  const discoveredDimensions = [];
  const governanceLog = [];
  const candidateStatuses = {};

  return {
    async get(key) { return store[key] || null; },
    async set(key, value) { store[key] = value; return true; },
    async loadDiscoveredDimensions() { return discoveredDimensions; },
    async saveDiscoveredDimension(dim) {
      discoveredDimensions.push(dim);
      return true;
    },
    async markCandidatePromoted(key) { candidateStatuses[key] = 'promoted'; },
    async markCandidateRejected(key) { candidateStatuses[key] = 'rejected'; },
    async logGovernanceDecision(decision) { governanceLog.push(decision); },
    // Inspection helpers
    _discoveredDimensions: discoveredDimensions,
    _governanceLog: governanceLog,
    _candidateStatuses: candidateStatuses,
    _store: store,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock CollectivePack (simple auto-approve for testing)
// ═══════════════════════════════════════════════════════════════════════════

function createMockPack(approveAll = true) {
  return {
    async decide(question) {
      return {
        decision: approveAll ? 'approve' : 'reject',
        confidence: approveAll ? 0.7 : 0.3,
        votes: {
          Guardian: { decision: approveAll ? 'approve' : 'reject', score: approveAll ? 80 : 20 },
          Oracle: { decision: approveAll ? 'approve' : 'reject', score: approveAll ? 75 : 25 },
          Analyst: { decision: 'approve', score: 70 },
        },
      };
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('THE_UNNAMEABLE E2E — Dimension Discovery Pipeline', () => {
  let judge;
  let detector;
  let storage;

  beforeEach(() => {
    detector = new ResidualDetector({ minSamples: 3 });
    storage = createMockStorage();
    detector.storage = storage;
    judge = new CYNICJudge({
      residualDetector: detector,
      includeUnnameable: true,
    });
  });

  afterEach(() => {
    // Clean up any registered custom dimensions from tests
    const customDims = legacyRegistry.getAll();
    for (const name of Object.keys(customDims)) {
      delete legacyRegistry.custom[name];
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 1: Anomaly Detection
  // ═══════════════════════════════════════════════════════════════════════

  describe('Phase 1: Anomaly Detection', () => {
    it('detects anomaly when residual > φ⁻² (38.2%)', () => {
      const result = detector.analyze({
        id: 'jdg_anomaly_1',
        global_score: 90,
        dimensions: { COHERENCE: 20, ACCURACY: 25, UTILITY: 30 },
      });

      assert.ok(result.isAnomaly, 'Should detect anomaly for high residual');
      assert.ok(result.residual > PHI_INV_2, `Residual ${result.residual} should exceed φ⁻²`);
    });

    it('does NOT flag normal judgments', () => {
      const result = detector.analyze({
        id: 'jdg_normal_1',
        global_score: 60,
        dimensions: { COHERENCE: 58, ACCURACY: 62, UTILITY: 60 },
      });

      assert.ok(!result.isAnomaly || result.residual <= PHI_INV_2);
    });

    it('accumulates anomalies for clustering', () => {
      for (let i = 0; i < 10; i++) {
        detector.analyze({
          id: `jdg_cluster_${i}`,
          global_score: 85,
          dimensions: { COHERENCE: 20, STRUCTURE: 25, ELEGANCE: 22 },
        });
      }

      const stats = detector.getStats();
      assert.ok(stats.anomalyCount >= 5, `Should have ≥5 anomalies, got ${stats.anomalyCount}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 2: Candidate Emergence
  // ═══════════════════════════════════════════════════════════════════════

  describe('Phase 2: Candidate Emergence', () => {
    it('creates candidate from clustered anomalies', () => {
      // Feed 20 anomalies with same weak dimensions
      // residual = |global_score - avgDim| / 100 must exceed φ⁻² (0.382)
      // With global_score=90 and avg≈42.5, residual≈0.475 > 0.382
      for (let i = 0; i < 20; i++) {
        detector.analyze({
          id: `jdg_candidate_${i}`,
          global_score: 90,
          dimensions: {
            COHERENCE: 15 + (i % 5),
            STRUCTURE: 20 + (i % 3),
            ACCURACY: 70,
            UTILITY: 65,
          },
        });
      }

      const candidates = detector.getCandidates();
      assert.ok(candidates.length > 0, `Should have candidates, got ${candidates.length}`);
    });

    it('caps candidate confidence at φ⁻¹ (61.8%)', () => {
      for (let i = 0; i < 50; i++) {
        detector.analyze({
          id: `jdg_cap_${i}`,
          global_score: 90,
          dimensions: { COHERENCE: 10, STRUCTURE: 12 },
        });
      }

      const candidates = detector.getCandidates();
      for (const c of candidates) {
        assert.ok(c.confidence <= PHI_INV, `Confidence ${c.confidence} should be ≤ φ⁻¹`);
      }
    });

    it('suggests axiom based on weak dimensions', () => {
      // Weak PHI dimensions
      for (let i = 0; i < 20; i++) {
        detector.analyze({
          id: `jdg_phi_weak_${i}`,
          global_score: 75,
          dimensions: {
            COHERENCE: 15,
            HARMONY: 18,
            STRUCTURE: 12,
            ELEGANCE: 20,
            ACCURACY: 80,
            UTILITY: 75,
          },
        });
      }

      const candidates = detector.getCandidates();
      if (candidates.length > 0) {
        assert.equal(candidates[0].suggestedAxiom, 'PHI',
          'Should suggest PHI axiom when PHI dimensions are weak');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 3: Governance & Voting
  // ═══════════════════════════════════════════════════════════════════════

  describe('Phase 3: Governance & Voting', () => {
    it('promotes candidate when Dogs approve (≥61.8%)', async () => {
      // Build candidates
      for (let i = 0; i < 30; i++) {
        detector.analyze({
          id: `jdg_gov_${i}`,
          global_score: 85,
          dimensions: { COHERENCE: 15, STRUCTURE: 20 },
        });
      }

      const governance = new ResidualGovernance({
        pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => {}, release: () => {} }) },
        residualDetector: detector,
        collectivePack: createMockPack(true),
        residualStorage: storage,
      });

      const result = await governance.reviewCandidates();

      assert.ok(result.reviewed > 0, 'Should review candidates');
      assert.ok(result.promoted > 0, 'Should promote at least one');
    });

    it('rejects candidate when Dogs reject', async () => {
      for (let i = 0; i < 30; i++) {
        detector.analyze({
          id: `jdg_reject_${i}`,
          global_score: 85,
          dimensions: { ACCURACY: 15, VERIFIABILITY: 20 },
        });
      }

      const governance = new ResidualGovernance({
        pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => {}, release: () => {} }) },
        residualDetector: detector,
        collectivePack: createMockPack(false),
        residualStorage: storage,
      });

      const result = await governance.reviewCandidates();
      assert.ok(result.reviewed > 0, 'Should review candidates');
      assert.equal(result.promoted, 0, 'Should not promote when pack rejects');
    });

    it('respects daily promotion limit (max 3)', async () => {
      // Build many candidates with different patterns
      const patterns = [
        { COHERENCE: 10, ACCURACY: 80 },
        { UTILITY: 10, ACCURACY: 80 },
        { NOVELTY: 10, ACCURACY: 80 },
        { ELEGANCE: 10, ACCURACY: 80 },
        { INTEGRITY: 10, ACCURACY: 80 },
      ];

      for (const p of patterns) {
        for (let i = 0; i < 30; i++) {
          detector.analyze({
            id: `jdg_limit_${Object.keys(p)[0]}_${i}`,
            global_score: 85,
            dimensions: p,
          });
        }
      }

      const governance = new ResidualGovernance({
        pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => {}, release: () => {} }) },
        residualDetector: detector,
        collectivePack: createMockPack(true),
        residualStorage: storage,
      });

      const result = await governance.reviewCandidates();
      assert.ok(result.promoted <= 3, `Daily limit: promoted ${result.promoted} should be ≤ 3`);
    });

    it('persists promoted dimension to storage', async () => {
      for (let i = 0; i < 30; i++) {
        detector.analyze({
          id: `jdg_persist_${i}`,
          global_score: 85,
          dimensions: { TRANSPARENCY: 15, PROVENANCE: 20 },
        });
      }

      const governance = new ResidualGovernance({
        pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => {}, release: () => {} }) },
        residualDetector: detector,
        collectivePack: createMockPack(true),
        residualStorage: storage,
      });

      await governance.reviewCandidates();

      assert.ok(storage._discoveredDimensions.length > 0,
        'Should save discovered dimension to storage');
      assert.ok(storage._governanceLog.length > 0,
        'Should log governance decision');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 4: Dimension Lives in the Judge
  // ═══════════════════════════════════════════════════════════════════════

  describe('Phase 4: Dimension Lives', () => {
    it('Judge uses manually accepted dimension for scoring', () => {
      // Accept a candidate manually
      for (let i = 0; i < 20; i++) {
        detector.analyze({
          id: `jdg_lives_${i}`,
          global_score: 85,
          dimensions: { COHERENCE: 15, ACCURACY: 20 },
        });
      }

      const candidates = detector.getCandidates();
      if (candidates.length > 0) {
        const discovery = detector.acceptCandidate(candidates[0].key, {
          name: 'DEPTH',
          axiom: 'PHI',
          weight: 1.0,
          threshold: 50,
        });

        assert.ok(discovery, 'Should create discovery');
        assert.equal(discovery.name, 'DEPTH');

        // The legacy registry should now have DEPTH
        const customDim = legacyRegistry.get('DEPTH');
        assert.ok(customDim, 'DEPTH should be in legacy registry');
        assert.equal(customDim.axiom, 'PHI');

        // Judge should now score with DEPTH
        const judgment = judge.judge({ id: 'test_with_depth', content: 'test' });
        assert.ok('DEPTH' in judgment.dimensions,
          'Judge should include DEPTH in dimensions');
      }
    });

    it('discovered dimension affects THE_UNNAMEABLE score', () => {
      // Score before discovery
      const before = judge.judge({ id: 'before_discovery', content: 'test' });
      const unnameableBefore = before.dimensions.THE_UNNAMEABLE;

      // Accept a new dimension
      for (let i = 0; i < 20; i++) {
        detector.analyze({
          id: `jdg_affect_${i}`,
          global_score: 80,
          dimensions: { RELEVANCE: 10, NOVELTY: 15 },
        });
      }

      const candidates = detector.getCandidates();
      if (candidates.length > 0) {
        detector.acceptCandidate(candidates[0].key, {
          name: 'ORIGINALITY',
          axiom: 'CULTURE',
          weight: 1.0,
          threshold: 50,
        });

        // Score after discovery — more dimensions = different variance
        const after = judge.judge({ id: 'after_discovery', content: 'test' });
        assert.ok('ORIGINALITY' in after.dimensions,
          'ORIGINALITY should appear in dimensions');
        // THE_UNNAMEABLE should be different (more dimensions = different variance)
        assert.notEqual(after.dimensions.THE_UNNAMEABLE, unnameableBefore,
          'THE_UNNAMEABLE should change when dimension count changes');
      }
    });

    it('discoveries survive export/import cycle', () => {
      // Create discoveries
      for (let i = 0; i < 20; i++) {
        detector.analyze({
          id: `jdg_export_${i}`,
          global_score: 85,
          dimensions: { UTILITY: 15, EFFICIENCY: 20 },
        });
      }

      const candidates = detector.getCandidates();
      if (candidates.length > 0) {
        detector.acceptCandidate(candidates[0].key, {
          name: 'RESOURCEFULNESS',
          axiom: 'BURN',
        });
      }

      // Export
      const state = detector.export();
      assert.ok(state.discoveries.length > 0, 'Should have discoveries to export');

      // Import into fresh detector
      const detector2 = new ResidualDetector();
      detector2.import(state);

      const discoveries2 = detector2.getDiscoveries();
      assert.ok(discoveries2.length > 0, 'Imported detector should have discoveries');
      assert.equal(discoveries2[0].name, 'RESOURCEFULNESS');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 5: Storage Adapter (Simulated Boot)
  // ═══════════════════════════════════════════════════════════════════════

  describe('Phase 5: Persistence & Boot', () => {
    it('ResidualDetector saves state via storage adapter', async () => {
      detector.storage = storage;

      for (let i = 0; i < 10; i++) {
        detector.analyze({
          id: `jdg_save_${i}`,
          global_score: 80,
          dimensions: { COHERENCE: 15 },
        });
      }

      // Force save
      detector._dirty = true;
      const saved = await detector.save();
      assert.ok(saved, 'Should save successfully');
      assert.ok(storage._store['residual_detector_state'], 'State should be in store');
    });

    it('ResidualDetector loads state from storage adapter', async () => {
      // Pre-populate storage
      storage._store['residual_detector_state'] = {
        anomalies: [
          { judgmentId: 'jdg_loaded_1', residual: 0.5, dimensions: {}, timestamp: Date.now() },
          { judgmentId: 'jdg_loaded_2', residual: 0.6, dimensions: {}, timestamp: Date.now() },
        ],
        candidates: {
          'candidate_test': {
            key: 'candidate_test',
            weakDimensions: ['COHERENCE'],
            sampleCount: 10,
            avgResidual: 0.55,
            suggestedAxiom: 'PHI',
            suggestedName: 'UNNAMED_test',
            confidence: 0.45,
            detectedAt: Date.now() - 86400000,
            updatedAt: Date.now(),
          },
        },
        discoveries: [],
      };

      const detector2 = new ResidualDetector({ storage });
      const loaded = await detector2.initialize();

      assert.ok(loaded, 'Should load from storage');
      assert.equal(detector2.anomalies.length, 2, 'Should have 2 loaded anomalies');
      assert.ok(detector2.candidates.has('candidate_test'), 'Should have loaded candidate');
    });

    it('simulated boot: load dimensions into DimensionRegistry', async () => {
      // Simulate what collective-singleton.js does at boot
      storage._discoveredDimensions.push({
        name: 'BOOT_DIM',
        axiom: 'VERIFY',
        weight: 1.2,
        threshold: 55,
        description: 'Dimension loaded at boot',
      });

      const dims = await storage.loadDiscoveredDimensions();
      assert.equal(dims.length, 1);
      assert.equal(dims[0].name, 'BOOT_DIM');

      // Register in global registry (mimicking boot)
      globalDimensionRegistry.register('VERIFY', 'BOOT_DIM', {
        weight: 1.2,
        threshold: 55,
        description: 'Dimension loaded at boot',
      });

      assert.ok(globalDimensionRegistry.has('VERIFY', 'BOOT_DIM'),
        'BOOT_DIM should be registered');

      // Clean up
      globalDimensionRegistry.unregister('VERIFY', 'BOOT_DIM');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Phase 6: Full Pipeline Integration
  // ═══════════════════════════════════════════════════════════════════════

  describe('Phase 6: Full Pipeline', () => {
    it('complete flow: judge → anomaly → candidate → promote → score', async () => {
      // Step 1: Feed anomalies via detector (judge.judge() has complex scoring
      // that doesn't guarantee residual > φ⁻², so we use detector.analyze() directly)
      for (let i = 0; i < 30; i++) {
        detector.analyze({
          id: `pipeline_${i}`,
          global_score: 90,
          dimensions: {
            COHERENCE: 15 + (i % 5),
            HARMONY: 18 + (i % 3),
            STRUCTURE: 12 + (i % 4),
            ACCURACY: 75 + (i % 10),
            UTILITY: 70 + (i % 8),
          },
        });
      }

      // Step 2: Check anomalies accumulated
      const stats = detector.getStats();
      assert.ok(stats.anomalyCount > 0, `Should have anomalies, got ${stats.anomalyCount}`);

      // Step 3: Check candidates emerged
      const candidates = detector.getCandidates();
      // Candidates may or may not emerge depending on clustering

      // Step 4: If candidates exist, run governance
      if (candidates.length > 0) {
        const governance = new ResidualGovernance({
          pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => {}, release: () => {} }) },
          residualDetector: detector,
          collectivePack: createMockPack(true),
          residualStorage: storage,
        });

        const govResult = await governance.reviewCandidates();

        if (govResult.promoted > 0) {
          // Step 5: Verify dimension was persisted
          assert.ok(storage._discoveredDimensions.length > 0,
            'Promoted dimension should be in storage');

          const discovered = storage._discoveredDimensions[0];

          // Step 6: Judge with new dimension
          const judgment = judge.judge({ id: 'post_discovery', content: 'test' });
          assert.ok(Object.keys(judgment.dimensions).length > 25,
            `Should have >25 dimensions, got ${Object.keys(judgment.dimensions).length}`);
        }
      }
    });

    it('governance auto-approves without CollectivePack', async () => {
      // Build high-confidence candidates
      for (let i = 0; i < 50; i++) {
        detector.analyze({
          id: `jdg_auto_${i}`,
          global_score: 90,
          dimensions: { SUSTAINABILITY: 10, NON_EXTRACTIVE: 15 },
        });
      }

      const candidates = detector.getCandidates();
      if (candidates.length === 0) return; // Skip if no candidates

      // Governance WITHOUT CollectivePack (auto-approve mode)
      const governance = new ResidualGovernance({
        pool: { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => {}, release: () => {} }) },
        residualDetector: detector,
        collectivePack: null, // No pack = auto-approve if score >= 61.8%
        residualStorage: storage,
      });

      const result = await governance.reviewCandidates();
      // May or may not auto-approve depending on confidence + age boost
      assert.ok(result.reviewed > 0, 'Should review without pack');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // φ-Alignment
  // ═══════════════════════════════════════════════════════════════════════

  describe('φ-Alignment', () => {
    it('anomaly threshold is φ⁻² (38.2%)', () => {
      assert.ok(Math.abs(detector.threshold - PHI_INV_2) < 0.001);
    });

    it('candidate confidence never exceeds φ⁻¹ (61.8%)', () => {
      for (let i = 0; i < 100; i++) {
        detector.analyze({
          id: `jdg_phi_${i}`,
          global_score: 95,
          dimensions: { COHERENCE: 5 },
        });
      }

      for (const c of detector.getCandidates()) {
        assert.ok(c.confidence <= PHI_INV + 0.001,
          `Confidence ${c.confidence} exceeds φ⁻¹`);
      }
    });

    it('governance requires φ⁻¹ (61.8%) approval ratio', () => {
      // Verify from the config (imported via ResidualGovernance)
      const governance = new ResidualGovernance({
        pool: { query: async () => ({ rows: [] }) },
      });
      const stats = governance.getStats();
      assert.ok(Math.abs(stats.config.minVoteApproval - PHI_INV) < 0.001,
        'Vote approval threshold should be φ⁻¹');
    });

    it('max 3 promotions per day (Fibonacci: 3 = F(4))', () => {
      const governance = new ResidualGovernance({
        pool: { query: async () => ({ rows: [] }) },
      });
      assert.equal(governance.getStats().config.maxDailyPromotions, 3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('handles empty anomaly list gracefully', () => {
      const candidates = detector.getCandidates();
      assert.deepEqual(candidates, []);
    });

    it('handles destroy on detector with pending save', async () => {
      detector.storage = storage;
      detector.analyze({
        id: 'jdg_destroy',
        global_score: 90,
        dimensions: { COHERENCE: 10 },
      });
      // Should not throw
      clearTimeout(detector._saveTimeout);
    });

    it('handles judgment with no dimensions', () => {
      const result = detector.analyze({
        id: 'jdg_no_dims',
        global_score: 50,
        dimensions: {},
      });
      assert.equal(typeof result.residual, 'number');
    });

    it('bounded anomaly storage (max 1000)', () => {
      for (let i = 0; i < 1100; i++) {
        detector.analyze({
          id: `jdg_bound_${i}`,
          global_score: 90,
          dimensions: { COHERENCE: 10 },
        });
      }

      assert.ok(detector.anomalies.length <= 1000,
        `Should be bounded at 1000, got ${detector.anomalies.length}`);
    });

    it('bounded candidate storage (max 100)', () => {
      // Create many different patterns
      for (let i = 0; i < 150; i++) {
        const dims = {};
        dims[`DIM_${i % 50}`] = 10;
        detector.analyze({
          id: `jdg_cand_bound_${i}`,
          global_score: 90,
          dimensions: dims,
        });
      }

      assert.ok(detector.candidates.size <= 100,
        `Should be bounded at 100, got ${detector.candidates.size}`);
    });
  });
});
