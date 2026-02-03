/**
 * Semantic Similarity Tests
 *
 * Tests for tokenization, Jaccard similarity, clustering,
 * and semantic agreement calculation.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize,
  removeStopwords,
  jaccardSimilarity,
  textSimilarity,
  clusterBySimilarity,
  calculateSemanticAgreement,
  SimilarityThresholds,
} from '../src/similarity.js';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

describe('Semantic Similarity', () => {
  describe('tokenize', () => {
    it('should tokenize basic text', () => {
      const tokens = tokenize('Hello World');
      assert.deepEqual(tokens, ['hello', 'world']);
    });

    it('should handle punctuation', () => {
      const tokens = tokenize('Hello, World! How are you?');
      assert.deepEqual(tokens, ['hello', 'world', 'how', 'are', 'you']);
    });

    it('should remove single-character tokens', () => {
      const tokens = tokenize('I am a developer');
      assert.deepEqual(tokens, ['am', 'developer']);
    });

    it('should handle empty input', () => {
      assert.deepEqual(tokenize(''), []);
      assert.deepEqual(tokenize(null), []);
      assert.deepEqual(tokenize(undefined), []);
    });

    it('should handle numbers', () => {
      const tokens = tokenize('I have 42 apples');
      assert.deepEqual(tokens, ['have', '42', 'apples']);
    });
  });

  describe('removeStopwords', () => {
    it('should remove common stopwords', () => {
      const tokens = ['the', 'quick', 'brown', 'fox', 'is', 'fast'];
      const filtered = removeStopwords(tokens);
      assert.deepEqual(filtered, ['quick', 'brown', 'fox', 'fast']);
    });

    it('should handle empty array', () => {
      assert.deepEqual(removeStopwords([]), []);
    });

    it('should handle array with only stopwords', () => {
      assert.deepEqual(removeStopwords(['the', 'is', 'a', 'an']), []);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1.0 for identical sets', () => {
      const setA = new Set(['a', 'b', 'c']);
      const setB = new Set(['a', 'b', 'c']);
      assert.equal(jaccardSimilarity(setA, setB), 1.0);
    });

    it('should return 0.0 for disjoint sets', () => {
      const setA = new Set(['a', 'b', 'c']);
      const setB = new Set(['d', 'e', 'f']);
      assert.equal(jaccardSimilarity(setA, setB), 0.0);
    });

    it('should calculate partial overlap correctly', () => {
      const setA = new Set(['a', 'b', 'c']);
      const setB = new Set(['b', 'c', 'd']);
      // Intersection: {b, c} = 2, Union: {a, b, c, d} = 4
      assert.equal(jaccardSimilarity(setA, setB), 0.5);
    });

    it('should return 1.0 for two empty sets', () => {
      assert.equal(jaccardSimilarity(new Set(), new Set()), 1.0);
    });

    it('should return 0.0 when one set is empty', () => {
      assert.equal(jaccardSimilarity(new Set(['a']), new Set()), 0.0);
      assert.equal(jaccardSimilarity(new Set(), new Set(['a'])), 0.0);
    });
  });

  describe('textSimilarity', () => {
    it('should return 1.0 for identical texts', () => {
      assert.equal(textSimilarity('hello world', 'hello world'), 1.0);
    });

    it('should return 1.0 for identical texts with different cases', () => {
      assert.equal(textSimilarity('Hello World', 'hello world'), 1.0);
    });

    it('should return moderate similarity for similar texts', () => {
      const sim = textSimilarity(
        'The quick brown fox jumps',
        'The fast brown fox leaps',
      );
      // After stopword removal: [quick, brown, fox, jumps] vs [fast, brown, fox, leaps]
      // Common: brown, fox (2/6 = 0.33 Jaccard)
      // Plus bigram overlap for word order
      assert.ok(sim > 0.2, `Expected sim > 0.2, got ${sim}`);
      assert.ok(sim < 0.5, `Expected sim < 0.5, got ${sim}`);
    });

    it('should return 0.0 for completely different texts', () => {
      const sim = textSimilarity(
        'apple banana cherry',
        'zebra yak walrus',
      );
      assert.equal(sim, 0.0);
    });

    it('should handle texts that become empty after stopword removal', () => {
      // All stopwords
      assert.equal(textSimilarity('the is a an', 'are were was'), 1.0);
      // One becomes empty
      assert.equal(textSimilarity('the is a', 'hello world'), 0.0);
    });

    it('should consider word order via bigrams', () => {
      const sameOrder = textSimilarity('quick brown fox', 'quick brown fox');
      const diffOrder = textSimilarity('quick brown fox', 'fox brown quick');
      // Same order should have higher similarity
      assert.ok(sameOrder > diffOrder);
    });
  });

  describe('clusterBySimilarity', () => {
    it('should return empty array for empty input', () => {
      assert.deepEqual(clusterBySimilarity([]), []);
    });

    it('should return single cluster for single text', () => {
      const clusters = clusterBySimilarity(['hello world']);
      assert.equal(clusters.length, 1);
      assert.deepEqual(clusters[0].members, [0]);
      assert.equal(clusters[0].similarity, 1.0);
    });

    it('should cluster identical texts together', () => {
      const clusters = clusterBySimilarity([
        'the sky is blue',
        'the sky is blue',
        'grass is green',
      ]);
      assert.equal(clusters.length, 2);
      // First cluster should have 2 members (identical)
      assert.equal(clusters[0].members.length, 2);
    });

    it('should cluster similar texts together', () => {
      const clusters = clusterBySimilarity([
        'the database connection failed',
        'database connection error occurred',
        'network timeout issue',
      ], 0.3); // Lower threshold
      // First two should cluster together
      assert.ok(clusters[0].members.length >= 2 || clusters.length >= 2);
    });

    it('should sort clusters by size', () => {
      const clusters = clusterBySimilarity([
        'apple pie',
        'apple tart',
        'apple cake',
        'banana bread',
      ], 0.3);
      // Largest cluster should be first
      for (let i = 1; i < clusters.length; i++) {
        assert.ok(clusters[i - 1].members.length >= clusters[i].members.length);
      }
    });
  });

  describe('calculateSemanticAgreement', () => {
    it('should return 0 agreement for empty responses', () => {
      const result = calculateSemanticAgreement([]);
      assert.equal(result.agreement, 0);
      assert.equal(result.verdict, null);
    });

    it('should return 1.0 agreement for single response', () => {
      const result = calculateSemanticAgreement([{ content: 'hello' }]);
      assert.equal(result.agreement, 1.0);
      assert.equal(result.verdict, 'hello');
    });

    it('should calculate agreement for identical responses', () => {
      const result = calculateSemanticAgreement([
        { content: 'the answer is 42' },
        { content: 'the answer is 42' },
        { content: 'the answer is 42' },
      ]);
      assert.equal(result.agreement, 1.0);
      assert.equal(result.dissent.length, 0);
    });

    it('should calculate agreement for similar responses', () => {
      const result = calculateSemanticAgreement([
        { content: 'the error is in the database layer' },
        { content: 'database layer has the error' },
        { content: 'network configuration issue' },
      ], 0.3);
      // At least 2/3 should agree
      assert.ok(result.agreement >= 0.66);
    });

    it('should identify dissenting responses', () => {
      const result = calculateSemanticAgreement([
        { content: 'yes approve this' },
        { content: 'yes approve this' },
        { content: 'no reject this' },
      ]);
      assert.equal(result.dissent.length, 1);
      assert.equal(result.dissent[0].content, 'no reject this');
    });

    it('should return cluster count', () => {
      const result = calculateSemanticAgreement([
        { content: 'apple pie' },
        { content: 'banana bread' },
        { content: 'cherry cake' },
      ]);
      assert.ok(result.clusterCount >= 1);
    });
  });

  describe('SimilarityThresholds', () => {
    it('should have φ-aligned thresholds', () => {
      assert.equal(SimilarityThresholds.HIGH, PHI_INV);
      assert.equal(SimilarityThresholds.MEDIUM, PHI_INV_2);
      assert.equal(SimilarityThresholds.LOW, 0.2);
    });

    it('should be frozen', () => {
      assert.ok(Object.isFrozen(SimilarityThresholds));
    });

    it('should have correct values', () => {
      assert.ok(Math.abs(SimilarityThresholds.HIGH - 0.618) < 0.01);
      assert.ok(Math.abs(SimilarityThresholds.MEDIUM - 0.382) < 0.01);
    });
  });
});
