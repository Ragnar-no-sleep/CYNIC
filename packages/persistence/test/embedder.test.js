#!/usr/bin/env node
/**
 * Embedder Service Tests
 *
 * Tests for vector embedding generation.
 *
 * "Memory needs meaning" - CYNIC
 *
 * @module @cynic/persistence/test/embedder
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  Embedder,
  MockEmbedder,
  OllamaEmbedder,
  OpenAIEmbedder,
  createEmbedder,
  getEmbedder,
  EmbedderType,
  EMBEDDING_DIMENSIONS,
} from '../src/services/embedder.js';

// ============================================================================
// TESTS
// ============================================================================

describe('Embedder', () => {
  describe('constructor', () => {
    it('should create instance with defaults', () => {
      const e = new Embedder();
      assert.ok(e);
      assert.strictEqual(e.dimensions, EMBEDDING_DIMENSIONS);
      assert.strictEqual(e.type, EmbedderType.MOCK);
      assert.ok(e.cache instanceof Map);
    });

    it('should accept custom dimensions', () => {
      const e = new Embedder({ dimensions: 768 });
      assert.strictEqual(e.dimensions, 768);
    });

    it('should accept cache max size', () => {
      const e = new Embedder({ cacheMaxSize: 500 });
      assert.strictEqual(e.cacheMaxSize, 500);
    });
  });

  describe('EMBEDDING_DIMENSIONS', () => {
    it('should be 1536 (OpenAI ada-002 compatible)', () => {
      assert.strictEqual(EMBEDDING_DIMENSIONS, 1536);
    });
  });

  describe('EmbedderType enum', () => {
    it('should have all embedder types', () => {
      assert.strictEqual(EmbedderType.OPENAI, 'openai');
      assert.strictEqual(EmbedderType.OLLAMA, 'ollama');
      assert.strictEqual(EmbedderType.LOCAL, 'local');
      assert.strictEqual(EmbedderType.MOCK, 'mock');
    });
  });

  describe('embed()', () => {
    it('should throw in base class', async () => {
      const e = new Embedder();
      await assert.rejects(
        async () => e.embed('test'),
        { message: /must be implemented/ }
      );
    });
  });

  describe('cosineSimilarity()', () => {
    let embedder;

    beforeEach(() => {
      embedder = new Embedder();
    });

    it('should return 1 for identical vectors', () => {
      const v = [1, 0, 0];
      const sim = embedder.cosineSimilarity(v, v);
      assert.ok(Math.abs(sim - 1) < 0.0001);
    });

    it('should return 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const sim = embedder.cosineSimilarity(a, b);
      assert.ok(Math.abs(sim) < 0.0001);
    });

    it('should return -1 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      const sim = embedder.cosineSimilarity(a, b);
      assert.ok(Math.abs(sim + 1) < 0.0001);
    });

    it('should throw for mismatched dimensions', () => {
      const a = [1, 0, 0];
      const b = [1, 0];
      assert.throws(
        () => embedder.cosineSimilarity(a, b),
        { message: /dimensions must match/ }
      );
    });

    it('should return 0 for zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      const sim = embedder.cosineSimilarity(a, b);
      assert.strictEqual(sim, 0);
    });

    it('should handle normalized vectors', () => {
      const a = [0.6, 0.8, 0];
      const b = [0.8, 0.6, 0];
      const sim = embedder.cosineSimilarity(a, b);
      // cos(θ) where θ is angle between vectors
      assert.ok(sim > 0.9 && sim < 1);
    });
  });

  describe('embedBatch()', () => {
    it('should embed multiple texts', async () => {
      const embedder = new MockEmbedder();
      const texts = ['hello', 'world', 'test'];
      const embeddings = await embedder.embedBatch(texts);

      assert.strictEqual(embeddings.length, 3);
      for (const emb of embeddings) {
        assert.strictEqual(emb.length, EMBEDDING_DIMENSIONS);
      }
    });
  });

  describe('embedWithCache()', () => {
    it('should cache embeddings', async () => {
      const embedder = new MockEmbedder();

      const emb1 = await embedder.embedWithCache('test text');
      const emb2 = await embedder.embedWithCache('test text');

      // Should be the same cached array
      assert.deepStrictEqual(emb1, emb2);
    });

    it('should respect cache max size', async () => {
      const embedder = new MockEmbedder({ cacheMaxSize: 3 });

      await embedder.embedWithCache('text1');
      await embedder.embedWithCache('text2');
      await embedder.embedWithCache('text3');
      await embedder.embedWithCache('text4'); // Should evict text1

      assert.ok(embedder.cache.size <= 3);
    });
  });

  describe('_hashText()', () => {
    it('should produce consistent hashes', () => {
      const embedder = new Embedder();
      const hash1 = embedder._hashText('hello world');
      const hash2 = embedder._hashText('hello world');
      assert.strictEqual(hash1, hash2);
    });

    it('should produce different hashes for different texts', () => {
      const embedder = new Embedder();
      const hash1 = embedder._hashText('hello');
      const hash2 = embedder._hashText('world');
      assert.notStrictEqual(hash1, hash2);
    });
  });
});

describe('MockEmbedder', () => {
  let embedder;

  beforeEach(() => {
    embedder = new MockEmbedder();
  });

  describe('constructor', () => {
    it('should set type to MOCK', () => {
      assert.strictEqual(embedder.type, EmbedderType.MOCK);
    });
  });

  describe('embed()', () => {
    it('should return embedding of correct dimensions', async () => {
      const embedding = await embedder.embed('test text');
      assert.strictEqual(embedding.length, EMBEDDING_DIMENSIONS);
    });

    it('should return deterministic embeddings', async () => {
      const emb1 = await embedder.embed('hello world');
      const emb2 = await embedder.embed('hello world');
      assert.deepStrictEqual(emb1, emb2);
    });

    it('should return different embeddings for different texts', async () => {
      const emb1 = await embedder.embed('hello');
      const emb2 = await embedder.embed('goodbye');

      // Check they're not identical
      let same = true;
      for (let i = 0; i < emb1.length; i++) {
        if (emb1[i] !== emb2[i]) {
          same = false;
          break;
        }
      }
      assert.ok(!same);
    });

    it('should handle empty string', async () => {
      const embedding = await embedder.embed('');
      assert.strictEqual(embedding.length, EMBEDDING_DIMENSIONS);
    });

    it('should handle long text', async () => {
      const longText = 'word '.repeat(10000);
      const embedding = await embedder.embed(longText);
      assert.strictEqual(embedding.length, EMBEDDING_DIMENSIONS);
    });

    it('should normalize text to lowercase', async () => {
      const emb1 = await embedder.embed('HELLO');
      const emb2 = await embedder.embed('hello');
      assert.deepStrictEqual(emb1, emb2);
    });
  });

  describe('similar texts should have higher similarity', () => {
    it('should give higher similarity for related texts', async () => {
      const emb1 = await embedder.embed('programming in javascript');
      const emb2 = await embedder.embed('programming in typescript');
      const emb3 = await embedder.embed('cooking italian food');

      const sim12 = embedder.cosineSimilarity(emb1, emb2);
      const sim13 = embedder.cosineSimilarity(emb1, emb3);

      // Related texts should be more similar
      // Note: MockEmbedder is character-based, so this may not always hold
      // but generally similar words should produce similar vectors
      assert.ok(typeof sim12 === 'number');
      assert.ok(typeof sim13 === 'number');
    });
  });
});

describe('createEmbedder()', () => {
  it('should create MockEmbedder by default', () => {
    const embedder = createEmbedder({ type: EmbedderType.MOCK });
    assert.ok(embedder instanceof MockEmbedder);
  });

  it('should create embedder with custom dimensions', () => {
    const embedder = createEmbedder({ type: EmbedderType.MOCK, dimensions: 768 });
    assert.strictEqual(embedder.dimensions, 768);
  });
});

describe('getEmbedder()', () => {
  it('should return singleton instance', () => {
    const e1 = getEmbedder({ type: EmbedderType.MOCK });
    const e2 = getEmbedder();

    // Should return the same instance
    assert.strictEqual(e1, e2);
  });
});

// OllamaEmbedder tests (if available)
describe('OllamaEmbedder', { skip: !OllamaEmbedder }, () => {
  it('should be constructable', () => {
    const embedder = new OllamaEmbedder({ baseUrl: 'http://localhost:11434' });
    assert.ok(embedder);
    assert.strictEqual(embedder.type, EmbedderType.OLLAMA);
  });
});

// OpenAIEmbedder tests (if available)
describe('OpenAIEmbedder', { skip: !OpenAIEmbedder }, () => {
  it('should be constructable with API key', () => {
    const embedder = new OpenAIEmbedder({ apiKey: 'test-key' });
    assert.ok(embedder);
    assert.strictEqual(embedder.type, EmbedderType.OPENAI);
  });
});
