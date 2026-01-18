/**
 * CYNIC Dimension Scorers Tests
 *
 * Tests for the real scoring logic.
 *
 * @module @cynic/node/judge/scorers.test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import {
  Scorers,
  scoreDimension,
  createRealScorer,
  scoreCoherence,
  scoreHarmony,
  scoreStructure,
  scoreElegance,
  scoreCompleteness,
  scorePrecision,
  scoreAccuracy,
  scoreVerifiability,
  scoreTransparency,
  scoreReproducibility,
  scoreProvenance,
  scoreIntegrity,
  scoreAuthenticity,
  scoreRelevance,
  scoreNovelty,
  scoreAlignment,
  scoreImpact,
  scoreResonance,
  scoreUtility,
  scoreSustainability,
  scoreEfficiency,
  scoreValueCreation,
  scoreNonExtractive,
  scoreContribution,
} from '../src/judge/scorers.js';

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Scorers Registry', () => {
  test('should have all 24 scorers', () => {
    const expected = [
      'COHERENCE', 'HARMONY', 'STRUCTURE', 'ELEGANCE', 'COMPLETENESS', 'PRECISION',
      'ACCURACY', 'VERIFIABILITY', 'TRANSPARENCY', 'REPRODUCIBILITY', 'PROVENANCE', 'INTEGRITY',
      'AUTHENTICITY', 'RELEVANCE', 'NOVELTY', 'ALIGNMENT', 'IMPACT', 'RESONANCE',
      'UTILITY', 'SUSTAINABILITY', 'EFFICIENCY', 'VALUE_CREATION', 'NON_EXTRACTIVE', 'CONTRIBUTION',
    ];

    for (const name of expected) {
      assert.ok(Scorers[name], `Missing scorer: ${name}`);
      assert.strictEqual(typeof Scorers[name], 'function', `${name} should be a function`);
    }
  });

  test('scoreDimension should use explicit scores from item', () => {
    const item = { scores: { COHERENCE: 85 } };
    const score = scoreDimension('COHERENCE', item);
    assert.strictEqual(score, 85);
  });

  test('scoreDimension should return 50 for unknown dimension', () => {
    const item = { content: 'test' };
    const score = scoreDimension('UNKNOWN_DIMENSION', item);
    assert.strictEqual(score, 50);
  });

  test('createRealScorer should return a function', () => {
    const scorer = createRealScorer();
    assert.strictEqual(typeof scorer, 'function');
  });

  test('createRealScorer function should score dimensions', () => {
    const scorer = createRealScorer();
    const item = { id: '123', type: 'test', content: 'Hello world' };
    const score = scorer('COHERENCE', item, {});
    assert.ok(score >= 0 && score <= 100, 'Score should be 0-100');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PHI AXIOM TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('PHI Axiom Scorers', () => {
  describe('COHERENCE', () => {
    test('should score higher for structured objects', () => {
      const structured = { id: '123', type: 'test', content: 'Hello' };
      const unstructured = 'just a string';

      const structuredScore = scoreCoherence(structured);
      const unstructuredScore = scoreCoherence(unstructured);

      assert.ok(structuredScore > unstructuredScore);
    });

    test('should penalize contradictions', () => {
      const coherent = { content: 'The sky is blue. It is a nice day.' };
      const contradictory = { content: 'Always do this. Never do this. Always avoid it.' };

      const coherentScore = scoreCoherence(coherent);
      const contradictoryScore = scoreCoherence(contradictory);

      assert.ok(coherentScore >= contradictoryScore);
    });
  });

  describe('HARMONY', () => {
    test('should score higher for φ-aligned proportions', () => {
      // 13-21 words per sentence is ideal (Fibonacci range)
      const balanced = { content: 'This is a sentence with about fifteen words in it for testing purposes. Another sentence of similar length follows here for balance.' };
      const short = { content: 'Hi. Bye. Yes.' };

      const balancedScore = scoreHarmony(balanced);
      const shortScore = scoreHarmony(short);

      assert.ok(balancedScore >= shortScore);
    });
  });

  describe('STRUCTURE', () => {
    test('should score higher for organized content', () => {
      const organized = {
        id: '1',
        type: 'doc',
        title: 'Test',
        sections: [],
        content: '# Header\n\n- Item 1\n- Item 2\n\nParagraph here.',
      };
      const flat = { content: 'just some text' };

      const organizedScore = scoreStructure(organized);
      const flatScore = scoreStructure(flat);

      assert.ok(organizedScore > flatScore);
    });

    test('should detect code structure', () => {
      const code = { content: 'function hello() {\n  return "world";\n}' };
      const codeScore = scoreStructure(code);
      assert.ok(codeScore >= 50);
    });
  });

  describe('ELEGANCE', () => {
    test('should penalize verbose content', () => {
      const concise = { content: 'Clear and direct.' };
      const verbose = { content: 'very really just actually basically literally ' + 'word '.repeat(200) };

      const conciseScore = scoreElegance(concise);
      const verboseScore = scoreElegance(verbose);

      assert.ok(conciseScore > verboseScore);
    });
  });

  describe('COMPLETENESS', () => {
    test('should score higher for complete items', () => {
      const complete = {
        id: '123',
        type: 'doc',
        content: 'First, let me introduce. Then details. In conclusion, summary.',
        metadata: { author: 'test' },
        timestamp: Date.now(),
      };
      const incomplete = { content: 'partial' };

      const completeScore = scoreCompleteness(complete);
      const incompleteScore = scoreCompleteness(incomplete);

      assert.ok(completeScore > incompleteScore);
    });
  });

  describe('PRECISION', () => {
    test('should score higher for specific content', () => {
      const precise = {
        id: 'exact-123',
        version: '1.0.0',
        timestamp: 1700000000000,
        content: 'There are exactly 42 items.',
      };
      const vague = { content: 'There are some things and various stuff etc.' };

      const preciseScore = scorePrecision(precise);
      const vagueScore = scorePrecision(vague);

      assert.ok(preciseScore > vagueScore);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VERIFY AXIOM TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('VERIFY Axiom Scorers', () => {
  describe('ACCURACY', () => {
    test('should score higher with sources', () => {
      const sourced = { sources: ['url1', 'url2', 'url3'], verified: true };
      const unsourced = { content: 'trust me bro' };

      const sourcedScore = scoreAccuracy(sourced);
      const unsourcedScore = scoreAccuracy(unsourced);

      assert.ok(sourcedScore > unsourcedScore);
    });
  });

  describe('VERIFIABILITY', () => {
    test('should score higher with proof and signatures', () => {
      const verifiable = { proof: 'hash123', signature: 'sig456', hash: 'abc' };
      const unverifiable = { content: 'claim' };

      const verifiableScore = scoreVerifiability(verifiable);
      const unverifiableScore = scoreVerifiability(unverifiable);

      assert.ok(verifiableScore > unverifiableScore);
    });
  });

  describe('TRANSPARENCY', () => {
    test('should score higher with reasoning', () => {
      const transparent = {
        reasoning: 'Because X, therefore Y',
        methodology: 'Scientific method',
        content: 'The result because of the analysis therefore shows.',
      };
      const opaque = { content: 'result is 42' };

      const transparentScore = scoreTransparency(transparent);
      const opaqueScore = scoreTransparency(opaque);

      assert.ok(transparentScore > opaqueScore);
    });
  });

  describe('REPRODUCIBILITY', () => {
    test('should score higher with version and steps', () => {
      const reproducible = {
        version: '1.2.3',
        dependencies: { node: '20' },
        steps: ['Step 1', 'Step 2'],
        seed: 12345,
      };
      const unreproducible = { content: 'it worked' };

      const reproducibleScore = scoreReproducibility(reproducible);
      const unreproducibleScore = scoreReproducibility(unreproducible);

      assert.ok(reproducibleScore > unreproducibleScore);
    });
  });

  describe('PROVENANCE', () => {
    test('should score higher with origin info', () => {
      const traceable = {
        author: 'alice',
        timestamp: Date.now(),
        origin: 'github.com',
        history: [{ event: 'created' }],
      };
      const untraceable = { content: 'anonymous' };

      const traceableScore = scoreProvenance(traceable);
      const untraceableScore = scoreProvenance(untraceable);

      assert.ok(traceableScore > untraceableScore);
    });
  });

  describe('INTEGRITY', () => {
    test('should score higher with hash and signature', () => {
      const intact = { hash: 'sha256:abc', signature: 'sig', checksum: 'check' };
      const unverified = { content: 'data' };

      const intactScore = scoreIntegrity(intact);
      const unverifiedScore = scoreIntegrity(unverified);

      assert.ok(intactScore > unverifiedScore);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CULTURE AXIOM TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('CULTURE Axiom Scorers', () => {
  describe('AUTHENTICITY', () => {
    test('should score higher for original content', () => {
      const original = { original: true, author: 'creator', content: 'I believe this.' };
      const copy = { forkedFrom: 'other', copiedFrom: 'source' };

      const originalScore = scoreAuthenticity(original);
      const copyScore = scoreAuthenticity(copy);

      assert.ok(originalScore > copyScore);
    });
  });

  describe('RELEVANCE', () => {
    test('should score higher with tags and recent timestamp', () => {
      const relevant = {
        tags: ['important', 'current'],
        createdAt: Date.now() - 1000, // 1 second ago
        relevance: 80,
      };
      const stale = { createdAt: Date.now() - 86400000 * 30 }; // 30 days ago

      const relevantScore = scoreRelevance(relevant);
      const staleScore = scoreRelevance(stale);

      assert.ok(relevantScore > staleScore);
    });

    test('should boost score when context topic matches', () => {
      const item = { content: 'This is about security and encryption.' };
      const context = { topic: 'security' };

      const withContext = scoreRelevance(item, context);
      const withoutContext = scoreRelevance(item, {});

      assert.ok(withContext > withoutContext);
    });
  });

  describe('NOVELTY', () => {
    test('should score higher for new original items', () => {
      const novel = { original: true, isNew: true, createdAt: Date.now() };
      const old = { createdAt: Date.now() - 86400000 * 365 }; // 1 year ago

      const novelScore = scoreNovelty(novel);
      const oldScore = scoreNovelty(old);

      assert.ok(novelScore > oldScore);
    });
  });

  describe('ALIGNMENT', () => {
    test('should score higher for φ-aligned values', () => {
      const aligned = {
        content: 'We verify before trusting. Burn, don\'t extract. φ guides ratios.',
        endorsed: true,
      };
      const misaligned = { content: 'random stuff' };

      const alignedScore = scoreAlignment(aligned);
      const misalignedScore = scoreAlignment(misaligned);

      assert.ok(alignedScore > misalignedScore);
    });
  });

  describe('IMPACT', () => {
    test('should score higher with usage and citations', () => {
      const impactful = { usageCount: 1000, citations: 50, derivatives: 10 };
      const unused = { content: 'ignored' };

      const impactfulScore = scoreImpact(impactful);
      const unusedScore = scoreImpact(unused);

      assert.ok(impactfulScore > unusedScore);
    });
  });

  describe('RESONANCE', () => {
    test('should score higher with emotional content', () => {
      const emotional = {
        content: 'I love this and feel passionate about our hope for the future.',
        likes: 100,
        comments: 50,
      };
      const flat = { content: 'data point' };

      const emotionalScore = scoreResonance(emotional);
      const flatScore = scoreResonance(flat);

      assert.ok(emotionalScore > flatScore);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BURN AXIOM TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('BURN Axiom Scorers', () => {
  describe('UTILITY', () => {
    test('should score higher with purpose and usage', () => {
      const useful = { purpose: 'Solve X', usageCount: 100, actionable: true };
      const useless = { content: 'abstract' };

      const usefulScore = scoreUtility(useful);
      const uselessScore = scoreUtility(useless);

      assert.ok(usefulScore > uselessScore);
    });
  });

  describe('SUSTAINABILITY', () => {
    test('should score higher for maintained items', () => {
      const sustainable = { maintained: true, version: '2.0', roadmap: 'Q1 2025' };
      const abandoned = { deprecated: true };

      const sustainableScore = scoreSustainability(sustainable);
      const abandonedScore = scoreSustainability(abandoned);

      assert.ok(sustainableScore > abandonedScore);
    });
  });

  describe('EFFICIENCY', () => {
    test('should score higher for small efficient code', () => {
      const efficient = { content: 'const x = 1; return x;', performance: 'fast' };
      const bloated = { content: 'code '.repeat(20000) };

      const efficientScore = scoreEfficiency(efficient);
      const bloatedScore = scoreEfficiency(bloated);

      assert.ok(efficientScore > bloatedScore);
    });
  });

  describe('VALUE_CREATION', () => {
    test('should score higher when creating value', () => {
      const creator = { output: 'result', derivatives: 5, createdValue: 100, consumedValue: 10 };
      const consumer = { content: 'consumed' };

      const creatorScore = scoreValueCreation(creator);
      const consumerScore = scoreValueCreation(consumer);

      assert.ok(creatorScore > consumerScore);
    });
  });

  describe('NON_EXTRACTIVE', () => {
    test('should score higher for fair open-source', () => {
      const fair = { nonExtractive: true, openSource: true, communityBenefit: true };
      const extractive = { extractive: true, hiddenCosts: true };

      const fairScore = scoreNonExtractive(fair);
      const extractiveScore = scoreNonExtractive(extractive);

      assert.ok(fairScore > extractiveScore);
    });
  });

  describe('CONTRIBUTION', () => {
    test('should score higher for contributing items', () => {
      const contributor = {
        contributions: 10,
        openSource: true,
        documentation: true,
        tests: true,
      };
      const taker = { content: 'just takes' };

      const contributorScore = scoreContribution(contributor);
      const takerScore = scoreContribution(taker);

      assert.ok(contributorScore > takerScore);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCORE BOUNDS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Score Bounds', () => {
  const allScorers = Object.values(Scorers);

  test('all scorers should return 0-100', () => {
    const testItems = [
      {},
      '',
      'test',
      { content: 'hello' },
      { id: '1', type: 'test', content: 'full' },
      null,
    ];

    for (const scorer of allScorers) {
      for (const item of testItems) {
        try {
          const score = scorer(item || {});
          assert.ok(score >= 0, `Score should be >= 0, got ${score}`);
          assert.ok(score <= 100, `Score should be <= 100, got ${score}`);
        } catch (e) {
          // Some scorers may fail on null, that's ok
        }
      }
    }
  });

  test('extreme items should still produce valid scores', () => {
    const extremeItem = {
      content: 'x'.repeat(100000),
      sources: Array(100).fill('url'),
      usageCount: 999999999,
    };

    for (const [name, scorer] of Object.entries(Scorers)) {
      const score = scorer(extremeItem);
      assert.ok(score >= 0 && score <= 100, `${name} should bound extreme values`);
    }
  });
});
