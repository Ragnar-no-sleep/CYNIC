/**
 * @cynic/core - Self-Refinement Tests
 *
 * Tests refinement system:
 * - Critique generation
 * - Refinement suggestions
 * - Self-refinement loop
 * - Learning extraction
 *
 * "φ distrusts φ" - Testing the self-doubt mechanism
 *
 * @module @cynic/core/test/refinement
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import refinement, {
  critiqueJudgment,
  suggestRefinement,
  selfRefine,
  extractLearning,
} from '../src/refinement/index.js';

// CRITIQUE_TYPES comes from the default export
const { CRITIQUE_TYPES } = refinement;

import { PHI_INV, THRESHOLDS } from '../src/axioms/constants.js';

// =============================================================================
// CRITIQUE TYPES TESTS
// =============================================================================

describe('CRITIQUE_TYPES', () => {
  it('should define all critique types', () => {
    assert.strictEqual(CRITIQUE_TYPES.WEAK_AXIOM, 'weak_axiom');
    assert.strictEqual(CRITIQUE_TYPES.IMBALANCE, 'imbalance');
    assert.strictEqual(CRITIQUE_TYPES.BIAS_DETECTED, 'bias_detected');
    assert.strictEqual(CRITIQUE_TYPES.MISSING_CONTEXT, 'missing_context');
    assert.strictEqual(CRITIQUE_TYPES.OVERCONFIDENCE, 'overconfidence');
    assert.strictEqual(CRITIQUE_TYPES.UNDERCONFIDENCE, 'underconfidence');
    assert.strictEqual(CRITIQUE_TYPES.THRESHOLD_EDGE, 'threshold_edge');
    assert.strictEqual(CRITIQUE_TYPES.DIMENSION_SPARSE, 'dimension_sparse');
  });
});

// =============================================================================
// CRITIQUE JUDGMENT TESTS
// =============================================================================

describe('critiqueJudgment', () => {
  describe('Missing breakdown', () => {
    it('should return missing context critique when no breakdown', () => {
      const judgment = { Q: 70 };
      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.critiques.length, 1);
      assert.strictEqual(critique.critiques[0].type, CRITIQUE_TYPES.MISSING_CONTEXT);
      assert.strictEqual(critique.severity, 'high');
      assert.strictEqual(critique.refinable, false);
    });
  });

  describe('Imbalance detection', () => {
    it('should detect large imbalance between axioms', () => {
      const judgment = {
        Q: 60,
        breakdown: { PHI: 90, VERIFY: 50, CULTURE: 60, BURN: 40 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.IMBALANCE));
    });

    it('should not flag minor imbalance', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 75, VERIFY: 70, CULTURE: 65, BURN: 70 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(!critique.critiques.some(c => c.type === CRITIQUE_TYPES.IMBALANCE));
    });
  });

  describe('Weak axiom detection', () => {
    it('should detect critically low axiom', () => {
      const judgment = {
        Q: 50,
        breakdown: { PHI: 60, VERIFY: 55, CULTURE: 20, BURN: 65 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.WEAK_AXIOM));
      const weakCrit = critique.critiques.find(c => c.type === CRITIQUE_TYPES.WEAK_AXIOM);
      assert.strictEqual(weakCrit.data.axiom, 'CULTURE');
    });

    it('should not flag axiom above GROWL threshold', () => {
      const judgment = {
        Q: 60,
        breakdown: { PHI: 60, VERIFY: 55, CULTURE: 65, BURN: 60 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(!critique.critiques.some(c => c.type === CRITIQUE_TYPES.WEAK_AXIOM));
    });
  });

  describe('Threshold edge detection', () => {
    it('should detect score near HOWL threshold', () => {
      const judgment = {
        Q: THRESHOLDS.HOWL + 1,
        breakdown: { PHI: 80, VERIFY: 80, CULTURE: 80, BURN: 80 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.THRESHOLD_EDGE));
    });

    it('should detect score near WAG threshold', () => {
      const judgment = {
        Q: THRESHOLDS.WAG - 2,
        breakdown: { PHI: 60, VERIFY: 60, CULTURE: 60, BURN: 60 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.THRESHOLD_EDGE));
    });

    it('should detect score near GROWL threshold', () => {
      const judgment = {
        Q: THRESHOLDS.GROWL + 2,
        breakdown: { PHI: 40, VERIFY: 40, CULTURE: 40, BURN: 40 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.THRESHOLD_EDGE));
    });
  });

  describe('Overconfidence detection', () => {
    it('should detect confidence above phi-inverse', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
        confidence: 0.75, // Above PHI_INV (0.618)
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.OVERCONFIDENCE));
    });

    it('should not flag confidence at phi-inverse', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
        confidence: PHI_INV,
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(!critique.critiques.some(c => c.type === CRITIQUE_TYPES.OVERCONFIDENCE));
    });
  });

  describe('Bias detection', () => {
    it('should detect potential bias from self source', () => {
      const judgment = {
        Q: 85,
        breakdown: { PHI: 85, VERIFY: 85, CULTURE: 85, BURN: 85 },
      };

      const critique = critiqueJudgment(judgment, { source: 'self-assessment' });

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.BIAS_DETECTED));
    });

    it('should detect bias from author source', () => {
      const judgment = {
        Q: 90,
        breakdown: { PHI: 90, VERIFY: 90, CULTURE: 90, BURN: 90 },
      };

      const critique = critiqueJudgment(judgment, { source: 'author review' });

      assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.BIAS_DETECTED));
    });

    it('should not flag neutral sources', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
      };

      const critique = critiqueJudgment(judgment, { source: 'independent review' });

      assert.ok(!critique.critiques.some(c => c.type === CRITIQUE_TYPES.BIAS_DETECTED));
    });
  });

  describe('Severity calculation', () => {
    it('should return none severity for no critiques', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.severity, 'none');
    });

    it('should return high severity for overconfidence', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
        confidence: 0.9,
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.severity, 'high');
    });

    it('should return high severity for weak axiom', () => {
      const judgment = {
        Q: 40,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 10, BURN: 40 },
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.severity, 'high');
    });

    it('should return medium severity for imbalance', () => {
      const judgment = {
        Q: 65,
        breakdown: { PHI: 90, VERIFY: 45, CULTURE: 70, BURN: 55 },
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.severity, 'medium');
    });
  });

  describe('Refinability', () => {
    it('should be refinable with weak axiom', () => {
      const judgment = {
        Q: 40,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 10, BURN: 40 },
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.refinable, true);
    });

    it('should be refinable with imbalance', () => {
      const judgment = {
        Q: 65,
        breakdown: { PHI: 95, VERIFY: 40, CULTURE: 70, BURN: 55 },
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.refinable, true);
    });

    it('should be refinable with threshold edge', () => {
      const judgment = {
        Q: THRESHOLDS.WAG + 1,
        breakdown: { PHI: 62, VERIFY: 62, CULTURE: 62, BURN: 62 },
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.refinable, true);
    });

    it('should not be refinable for only overconfidence', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
        confidence: 0.9,
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.refinable, false);
    });
  });

  describe('Meta and output', () => {
    it('should include original Q and verdict', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
        verdict: 'WAG',
      };

      const critique = critiqueJudgment(judgment);

      assert.strictEqual(critique.originalQ, 70);
      assert.strictEqual(critique.originalVerdict, 'WAG');
    });

    it('should include recommendations', () => {
      const judgment = {
        Q: 50,
        breakdown: { PHI: 90, VERIFY: 20, CULTURE: 50, BURN: 40 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.recommendations.length > 0);
    });

    it('should include meta timestamp', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
      };

      const critique = critiqueJudgment(judgment);

      assert.ok(critique.meta.timestamp);
      assert.strictEqual(critique.meta.critiqueCount, 0);
    });
  });
});

// =============================================================================
// SUGGEST REFINEMENT TESTS
// =============================================================================

describe('suggestRefinement', () => {
  describe('Missing breakdown', () => {
    it('should return error when no breakdown', () => {
      const judgment = { Q: 70 };
      const critique = { critiques: [] };

      const result = suggestRefinement(judgment, critique);

      assert.ok(result.error);
    });
  });

  describe('Weak axiom refinement', () => {
    it('should suggest increase for critically low axiom', () => {
      const judgment = {
        Q: 40,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 15, BURN: 35 },
      };

      const critique = {
        critiques: [{
          type: CRITIQUE_TYPES.WEAK_AXIOM,
          data: { axiom: 'CULTURE', score: 15 },
        }],
        originalQ: 40,
        originalVerdict: 'GROWL',
      };

      const result = suggestRefinement(judgment, critique);

      assert.ok(result.adjustments.some(a => a.axiom === 'CULTURE'));
      assert.ok(result.refinedBreakdown.CULTURE > 15);
    });

    it('should cap weak axiom increase at WAG threshold', () => {
      const judgment = {
        Q: 55,
        breakdown: { PHI: 70, VERIFY: 60, CULTURE: 30, BURN: 60 },
      };

      const critique = {
        critiques: [{
          type: CRITIQUE_TYPES.WEAK_AXIOM,
          data: { axiom: 'CULTURE', score: 30 },
        }],
        originalQ: 55,
      };

      const result = suggestRefinement(judgment, critique);

      // Should be 30 + 10 = 40
      assert.strictEqual(result.refinedBreakdown.CULTURE, 40);
    });
  });

  describe('Imbalance refinement', () => {
    it('should suggest reducing very high scores', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 95, VERIFY: 55, CULTURE: 70, BURN: 60 },
      };

      const critique = {
        critiques: [{
          type: CRITIQUE_TYPES.IMBALANCE,
          data: {
            strongestAxiom: 'PHI',
            strongestScore: 95,
            weakestAxiom: 'VERIFY',
            weakestScore: 55,
          },
        }],
        originalQ: 70,
      };

      const result = suggestRefinement(judgment, critique);

      assert.ok(result.adjustments.some(a => a.axiom === 'PHI'));
      assert.strictEqual(result.refinedBreakdown.PHI, 90);
    });

    it('should not reduce scores below 85', () => {
      const judgment = {
        Q: 65,
        breakdown: { PHI: 80, VERIFY: 40, CULTURE: 70, BURN: 70 },
      };

      const critique = {
        critiques: [{
          type: CRITIQUE_TYPES.IMBALANCE,
          data: {
            strongestAxiom: 'PHI',
            strongestScore: 80,
            weakestAxiom: 'VERIFY',
            weakestScore: 40,
          },
        }],
        originalQ: 65,
      };

      const result = suggestRefinement(judgment, critique);

      // PHI at 80 should not be reduced (threshold is 85)
      assert.strictEqual(result.refinedBreakdown.PHI, 80);
    });
  });

  describe('Overconfidence refinement', () => {
    it('should suggest phi-inverse confidence ceiling', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
      };

      const critique = {
        critiques: [{
          type: CRITIQUE_TYPES.OVERCONFIDENCE,
          data: { confidence: 0.85, ceiling: PHI_INV },
        }],
        originalQ: 70,
      };

      const result = suggestRefinement(judgment, critique);

      assert.ok(result.adjustments.some(a => a.field === 'confidence' && a.to === PHI_INV));
    });
  });

  describe('Output structure', () => {
    it('should include original and refined breakdowns', () => {
      const judgment = {
        Q: 50,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 30, BURN: 60 },
      };

      const critique = {
        critiques: [{
          type: CRITIQUE_TYPES.WEAK_AXIOM,
          data: { axiom: 'CULTURE', score: 30 },
        }],
        originalQ: 50,
        originalVerdict: 'BARK',
      };

      const result = suggestRefinement(judgment, critique);

      assert.ok(result.originalBreakdown);
      assert.ok(result.refinedBreakdown);
      assert.ok(result.adjustments);
      assert.strictEqual(result.originalQ, 50);
      assert.ok(result.refinedQ !== undefined);
      assert.ok(result.improvement !== undefined);
    });

    it('should track verdict change', () => {
      const judgment = {
        Q: 39,
        breakdown: { PHI: 50, VERIFY: 40, CULTURE: 28, BURN: 38 },
      };

      const critique = {
        critiques: [{
          type: CRITIQUE_TYPES.WEAK_AXIOM,
          data: { axiom: 'CULTURE', score: 28 },
        }],
        originalQ: 39,
        originalVerdict: 'GROWL',
      };

      const result = suggestRefinement(judgment, critique);

      assert.ok(result.verdictChanged !== undefined);
      assert.ok(result.newVerdict);
    });
  });
});

// =============================================================================
// SELF-REFINE TESTS
// =============================================================================

describe('selfRefine', () => {
  describe('Basic refinement', () => {
    it('should run refinement loop', () => {
      const judgment = {
        Q: 45,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 20, BURN: 50 },
        verdict: 'BARK',
      };

      const result = selfRefine(judgment);

      assert.ok(result.original);
      assert.ok(result.final);
      assert.ok(result.iterations.length > 0);
      assert.ok(result.iterationCount > 0);
    });

    it('should track improvement', () => {
      const judgment = {
        Q: 45,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 20, BURN: 50 },
        verdict: 'BARK',
      };

      const result = selfRefine(judgment);

      if (result.improved) {
        assert.ok(result.totalImprovement > 0);
        assert.ok(result.final.Q > result.original.Q);
      }
    });
  });

  describe('Stable judgments', () => {
    it('should stop early for stable judgments', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
        verdict: 'WAG',
      };

      const result = selfRefine(judgment);

      // Should have at least one iteration that found it stable
      const stableIter = result.iterations.find(i => i.status === 'stable');
      assert.ok(stableIter || result.iterations.length <= 1);
    });
  });

  describe('Max iterations', () => {
    it('should respect max iterations', () => {
      const judgment = {
        Q: 40,
        breakdown: { PHI: 50, VERIFY: 40, CULTURE: 20, BURN: 50 },
      };

      const result = selfRefine(judgment, {}, { maxIterations: 2 });

      assert.ok(result.iterationCount <= 2);
    });

    it('should use default max iterations', () => {
      const judgment = {
        Q: 40,
        breakdown: { PHI: 50, VERIFY: 40, CULTURE: 20, BURN: 50 },
      };

      const result = selfRefine(judgment);

      assert.ok(result.meta.maxIterations === 3);
    });
  });

  describe('Iteration tracking', () => {
    it('should track each iteration', () => {
      const judgment = {
        Q: 45,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 20, BURN: 50 },
      };

      const result = selfRefine(judgment);

      for (const iter of result.iterations) {
        assert.ok(iter.iteration);
        assert.ok(iter.critique);
        assert.ok(iter.status);
      }
    });

    it('should include critique in each iteration', () => {
      const judgment = {
        Q: 45,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 20, BURN: 50 },
      };

      const result = selfRefine(judgment);

      const firstIter = result.iterations[0];
      assert.ok(firstIter.critique.critiques);
      assert.ok(firstIter.critique.severity);
    });
  });

  describe('Context passing', () => {
    it('should pass context to critique', () => {
      const judgment = {
        Q: 85,
        breakdown: { PHI: 85, VERIFY: 85, CULTURE: 85, BURN: 85 },
      };

      const result = selfRefine(judgment, { source: 'self-review' });

      // Should detect bias from context
      const hasBiasCritique = result.iterations.some(
        i => i.critique.critiques.some(c => c.type === CRITIQUE_TYPES.BIAS_DETECTED)
      );
      assert.ok(hasBiasCritique);
    });
  });

  describe('Output structure', () => {
    it('should include original and final states', () => {
      const judgment = {
        Q: 50,
        breakdown: { PHI: 60, VERIFY: 50, CULTURE: 30, BURN: 60 },
        verdict: 'BARK',
      };

      const result = selfRefine(judgment);

      assert.strictEqual(result.original.Q, 50);
      assert.deepStrictEqual(result.original.breakdown, judgment.breakdown);
      assert.ok(result.final.Q);
      assert.ok(result.final.breakdown);
      assert.ok(result.final.verdict);
    });

    it('should include meta information', () => {
      const judgment = {
        Q: 70,
        breakdown: { PHI: 70, VERIFY: 70, CULTURE: 70, BURN: 70 },
      };

      const result = selfRefine(judgment);

      assert.ok(result.meta.maxIterations);
      assert.ok(result.meta.timestamp);
    });
  });
});

// =============================================================================
// EXTRACT LEARNING TESTS
// =============================================================================

describe('extractLearning', () => {
  describe('Axiom adjustments', () => {
    it('should extract axiom adjustment learnings', () => {
      const refinementResult = {
        improved: true,
        totalImprovement: 5,
        iterations: [{
          iteration: 1,
          refinement: {
            adjustments: [{
              axiom: 'CULTURE',
              from: 20,
              to: 30,
              reason: 'Potentially underscored',
            }],
          },
        }],
      };

      const learning = extractLearning(refinementResult);

      assert.ok(learning.learnings.length > 0);
      assert.strictEqual(learning.learnings[0].type, 'axiom_adjustment');
      assert.strictEqual(learning.learnings[0].axiom, 'CULTURE');
      assert.strictEqual(learning.learnings[0].adjustment, 10);
    });
  });

  describe('Confidence calibration', () => {
    it('should extract confidence calibration learning', () => {
      const refinementResult = {
        improved: false,
        totalImprovement: 0,
        iterations: [{
          iteration: 1,
          refinement: {
            adjustments: [{
              field: 'confidence',
              from: 0.85,
              to: PHI_INV,
              reason: 'Apply φ⁻¹ ceiling',
            }],
          },
        }],
      };

      const learning = extractLearning(refinementResult);

      assert.ok(learning.learnings.some(l => l.type === 'confidence_calibration'));
    });
  });

  describe('Empty refinement', () => {
    it('should handle iterations without refinement', () => {
      const refinementResult = {
        improved: false,
        totalImprovement: 0,
        iterations: [{
          iteration: 1,
          refinement: null,
          status: 'stable',
        }],
      };

      const learning = extractLearning(refinementResult);

      assert.deepStrictEqual(learning.learnings, []);
    });
  });

  describe('Output structure', () => {
    it('should include improvement info', () => {
      const refinementResult = {
        improved: true,
        totalImprovement: 5,
        iterations: [],
      };

      const learning = extractLearning(refinementResult);

      assert.strictEqual(learning.improved, true);
      assert.strictEqual(learning.improvementMagnitude, 5);
      assert.ok(learning.timestamp);
    });
  });
});

// =============================================================================
// DEFAULT EXPORT TESTS
// =============================================================================

describe('Default export', () => {
  it('should export all functions', () => {
    assert.strictEqual(refinement.critiqueJudgment, critiqueJudgment);
    assert.strictEqual(refinement.suggestRefinement, suggestRefinement);
    assert.strictEqual(refinement.selfRefine, selfRefine);
    assert.strictEqual(refinement.extractLearning, extractLearning);
  });

  it('should export CRITIQUE_TYPES', () => {
    assert.deepStrictEqual(refinement.CRITIQUE_TYPES, CRITIQUE_TYPES);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Refinement Integration', () => {
  it('should complete full refinement cycle with learning extraction', () => {
    // 1. Start with a poor judgment
    const judgment = {
      Q: 42,
      breakdown: { PHI: 55, VERIFY: 45, CULTURE: 18, BURN: 50 },
      verdict: 'BARK',
      confidence: 0.7,
    };

    // 2. Run self-refinement
    const refined = selfRefine(judgment);

    // 3. Extract learnings
    const learnings = extractLearning(refined);

    // 4. Verify cycle completed
    assert.ok(refined.iterations.length > 0);
    assert.ok(refined.final.Q >= refined.original.Q); // Should improve or stay same
    assert.ok(learnings.timestamp);

    // The weak axiom (CULTURE at 18) should have been addressed
    if (refined.improved) {
      assert.ok(learnings.learnings.length > 0);
    }
  });

  it('should handle already-good judgment gracefully', () => {
    const judgment = {
      Q: 75,
      breakdown: { PHI: 75, VERIFY: 75, CULTURE: 75, BURN: 75 },
      verdict: 'WAG',
    };

    const refined = selfRefine(judgment);
    const learnings = extractLearning(refined);

    // Should recognize it's already good
    assert.strictEqual(refined.improved, false);
    assert.strictEqual(refined.totalImprovement, 0);
    assert.deepStrictEqual(learnings.learnings, []);
  });

  it('should respect phi-inverse confidence through refinement', () => {
    const judgment = {
      Q: 80,
      breakdown: { PHI: 80, VERIFY: 80, CULTURE: 80, BURN: 80 },
      verdict: 'HOWL',
      confidence: 0.95, // Way too high
    };

    const critique = critiqueJudgment(judgment);

    // Should flag overconfidence
    assert.ok(critique.critiques.some(c => c.type === CRITIQUE_TYPES.OVERCONFIDENCE));

    // Refinement should suggest phi-inverse ceiling
    const refinementSuggestion = suggestRefinement(judgment, critique);
    const confAdj = refinementSuggestion.adjustments.find(a => a.field === 'confidence');

    if (confAdj) {
      assert.strictEqual(confAdj.to, PHI_INV);
    }
  });
});
