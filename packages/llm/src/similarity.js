/**
 * Semantic Similarity - Lightweight text comparison
 *
 * Provides semantic similarity calculation without external API calls.
 * Uses tokenization, stopword removal, and Jaccard similarity.
 *
 * φ-aligned thresholds:
 * - HIGH: φ⁻¹ ≈ 0.618 (strong semantic match)
 * - MEDIUM: φ⁻² ≈ 0.382 (partial match)
 * - LOW: < φ⁻² (weak match)
 *
 * @module @cynic/llm/similarity
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// Common English stopwords
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
  'the', 'to', 'was', 'were', 'will', 'with', 'would', 'could',
  'should', 'can', 'may', 'might', 'must', 'shall', 'this', 'these',
  'those', 'they', 'them', 'their', 'we', 'our', 'you', 'your',
  'i', 'me', 'my', 'myself', 'him', 'her', 'his', 'hers', 'itself',
  'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'but', 'if', 'then', 'else',
  'do', 'does', 'did', 'done', 'doing', 'have', 'having', 'had',
  'been', 'being', 'get', 'got', 'getting', 'let', 'say', 'said',
]);

/**
 * Tokenize text into words
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)              // Split on whitespace
    .filter(word => word.length > 1);  // Remove single chars
}

/**
 * Remove stopwords from tokens
 *
 * @param {string[]} tokens
 * @returns {string[]}
 */
export function removeStopwords(tokens) {
  return tokens.filter(token => !STOPWORDS.has(token));
}

/**
 * Calculate Jaccard similarity between two sets
 *
 * J(A,B) = |A ∩ B| / |A ∪ B|
 *
 * @param {Set} setA
 * @param {Set} setB
 * @returns {number} Similarity score 0-1
 */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Calculate semantic similarity between two texts
 *
 * Combines multiple similarity metrics:
 * - Jaccard similarity of word sets (primary)
 * - Word order similarity (secondary)
 *
 * @param {string} textA
 * @param {string} textB
 * @returns {number} Similarity score 0-1
 */
export function textSimilarity(textA, textB) {
  // Tokenize and remove stopwords
  const tokensA = removeStopwords(tokenize(textA));
  const tokensB = removeStopwords(tokenize(textB));

  // Edge cases
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  // Jaccard similarity of unique words
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const jaccard = jaccardSimilarity(setA, setB);

  // N-gram overlap for word order (bigrams)
  const bigramsA = getBigrams(tokensA);
  const bigramsB = getBigrams(tokensB);
  const bigramJaccard = jaccardSimilarity(bigramsA, bigramsB);

  // Weighted combination: 70% word overlap, 30% order
  return 0.7 * jaccard + 0.3 * bigramJaccard;
}

/**
 * Get bigrams (pairs of consecutive words)
 *
 * @param {string[]} tokens
 * @returns {Set<string>}
 */
function getBigrams(tokens) {
  const bigrams = new Set();
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.add(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Cluster texts by semantic similarity
 *
 * Groups similar texts together using φ⁻¹ threshold.
 *
 * @param {string[]} texts - Array of texts to cluster
 * @param {number} [threshold=PHI_INV] - Similarity threshold for clustering
 * @returns {Array<{centroid: string, members: number[], similarity: number}>}
 */
export function clusterBySimilarity(texts, threshold = PHI_INV) {
  if (texts.length === 0) return [];
  if (texts.length === 1) {
    return [{ centroid: texts[0], members: [0], similarity: 1.0 }];
  }

  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < texts.length; i++) {
    if (assigned.has(i)) continue;

    // Start new cluster with this text as centroid
    const cluster = {
      centroid: texts[i],
      members: [i],
      similarities: [1.0],
    };
    assigned.add(i);

    // Find similar texts
    for (let j = i + 1; j < texts.length; j++) {
      if (assigned.has(j)) continue;

      const sim = textSimilarity(texts[i], texts[j]);
      if (sim >= threshold) {
        cluster.members.push(j);
        cluster.similarities.push(sim);
        assigned.add(j);
      }
    }

    // Calculate average similarity within cluster
    cluster.similarity = cluster.similarities.reduce((a, b) => a + b, 0) / cluster.similarities.length;
    delete cluster.similarities;

    clusters.push(cluster);
  }

  // Sort by cluster size (largest first)
  clusters.sort((a, b) => b.members.length - a.members.length);

  return clusters;
}

/**
 * Calculate agreement using semantic similarity
 *
 * Unlike exact string matching, this groups semantically similar
 * responses together to calculate true agreement.
 *
 * @param {Array<{content: string}>} responses - LLM responses
 * @param {number} [threshold=PHI_INV] - Similarity threshold
 * @returns {{agreement: number, verdict: string, clusters: Array, dissent: Array}}
 */
export function calculateSemanticAgreement(responses, threshold = PHI_INV) {
  if (responses.length === 0) {
    return { agreement: 0, verdict: null, clusters: [], dissent: [] };
  }

  if (responses.length === 1) {
    return {
      agreement: 1.0,
      verdict: responses[0].content,
      clusters: [{ centroid: responses[0].content, members: [0], similarity: 1.0 }],
      dissent: [],
    };
  }

  // Extract content
  const texts = responses.map(r => r.content || '');

  // Cluster by similarity
  const clusters = clusterBySimilarity(texts, threshold);

  // Largest cluster is the "majority"
  const majorityCluster = clusters[0];
  const agreement = majorityCluster.members.length / responses.length;

  // Dissenting responses (not in majority cluster)
  const majoritySet = new Set(majorityCluster.members);
  const dissent = responses.filter((_, i) => !majoritySet.has(i));

  return {
    agreement,
    verdict: majorityCluster.centroid,
    clusters,
    dissent,
    // Additional metrics
    clusterCount: clusters.length,
    avgClusterSimilarity: majorityCluster.similarity,
  };
}

/**
 * Semantic similarity thresholds (φ-aligned)
 */
export const SimilarityThresholds = Object.freeze({
  /** Strong semantic match */
  HIGH: PHI_INV,      // 0.618
  /** Partial semantic match */
  MEDIUM: PHI_INV_2,  // 0.382
  /** Minimum for consideration */
  LOW: 0.2,
});

export default {
  tokenize,
  removeStopwords,
  jaccardSimilarity,
  textSimilarity,
  clusterBySimilarity,
  calculateSemanticAgreement,
  SimilarityThresholds,
};
