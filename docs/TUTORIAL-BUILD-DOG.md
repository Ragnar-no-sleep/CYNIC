# Tutorial: Build Your First Dog

> **"φ distrusts φ"** - κυνικός
>
> Learn to create a custom CYNIC agent (Dog) step by step.

**Time**: ~30 minutes
**Level**: Intermediate
**Prerequisites**: Basic JavaScript, understanding of CYNIC concepts

---

## What You'll Build

A **Librarian Dog** that:
- Tracks documentation lookups
- Caches frequently accessed docs
- Suggests relevant documentation based on context

```
┌─────────────────────────────────────────────────────────────┐
│                      LIBRARIAN DOG                           │
│                    📚 Sefira: Daat                           │
├─────────────────────────────────────────────────────────────┤
│  Input: User query about a library                          │
│  Process: Search cache → Fetch docs → Store for future      │
│  Output: Relevant documentation snippets                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Understand the Dog Structure

Every Dog in CYNIC follows this pattern:

```javascript
class MyDog {
  constructor(options = {}) {
    this.name = 'my-dog';
    this.sefira = 'Malkhut';  // Position in Tree of Life
    this.pillar = 'middle';   // left, middle, or right
    this.stats = { invocations: 0 };
  }

  // Main entry point
  async process(input, context) {
    this.stats.invocations++;
    // Your logic here
    return { result: 'processed' };
  }

  // Status for monitoring
  getStatus() {
    return { name: this.name, ...this.stats };
  }
}
```

---

## Step 2: Create the Librarian Dog

Create `packages/node/src/agents/collective/librarian.js`:

```javascript
/**
 * Librarian Dog - Documentation Cache Manager
 *
 * Tracks and caches documentation lookups.
 * Sefira: Daat (Knowledge)
 *
 * @module @cynic/node/agents/collective/librarian
 */

'use strict';

import { createLogger } from '@cynic/core';

const log = createLogger('Librarian');
const PHI_INV = 0.618033988749895;

/**
 * Cache entry with TTL
 */
class CacheEntry {
  constructor(content, ttlMs = 3600000) { // 1 hour default
    this.content = content;
    this.createdAt = Date.now();
    this.ttlMs = ttlMs;
    this.hits = 0;
  }

  get isExpired() {
    return Date.now() - this.createdAt > this.ttlMs;
  }

  touch() {
    this.hits++;
  }
}

/**
 * Librarian Dog
 */
export class LibrarianDog {
  constructor(options = {}) {
    // Identity
    this.name = 'Librarian';
    this.emoji = '📚';
    this.sefira = 'Daat';      // Knowledge
    this.pillar = 'middle';
    this.level = 1;

    // Configuration
    this.maxCacheSize = options.maxCacheSize || 100;
    this.defaultTtlMs = options.defaultTtlMs || 3600000; // 1 hour

    // State
    this._cache = new Map();
    this._stats = {
      invocations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      docsStored: 0,
    };

    log.debug('Librarian initialized', { maxCacheSize: this.maxCacheSize });
  }

  /**
   * Process a documentation request
   *
   * @param {Object} input - Request input
   * @param {string} input.library - Library name (e.g., "react", "express")
   * @param {string} [input.query] - Specific query
   * @param {Object} [context] - Request context
   * @returns {Object} Documentation result
   */
  async process(input, context = {}) {
    this._stats.invocations++;

    const { library, query } = input;
    if (!library) {
      return { error: 'Library name required' };
    }

    const cacheKey = this._makeCacheKey(library, query);

    // Check cache first
    if (this._cache.has(cacheKey)) {
      const entry = this._cache.get(cacheKey);
      if (!entry.isExpired) {
        entry.touch();
        this._stats.cacheHits++;
        log.debug('Cache hit', { library, hits: entry.hits });
        return {
          source: 'cache',
          library,
          content: entry.content,
          confidence: Math.min(PHI_INV, 0.5 + entry.hits * 0.01),
        };
      }
      // Expired, remove it
      this._cache.delete(cacheKey);
    }

    this._stats.cacheMisses++;

    // Fetch documentation (placeholder - integrate with Context7 or similar)
    const docs = await this._fetchDocs(library, query);

    // Store in cache
    if (docs) {
      this._storeInCache(cacheKey, docs);
    }

    return {
      source: 'fetch',
      library,
      content: docs,
      confidence: PHI_INV * 0.8, // Slightly lower for fresh fetch
    };
  }

  /**
   * Store documentation for future retrieval
   */
  store(library, content, ttlMs = null) {
    const cacheKey = this._makeCacheKey(library);
    this._storeInCache(cacheKey, content, ttlMs);
    return true;
  }

  /**
   * Search cached documentation
   */
  search(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const [key, entry] of this._cache) {
      if (entry.isExpired) continue;

      const content = typeof entry.content === 'string'
        ? entry.content
        : JSON.stringify(entry.content);

      if (content.toLowerCase().includes(queryLower)) {
        results.push({
          key,
          snippet: content.slice(0, 200),
          hits: entry.hits,
        });
      }
    }

    // Sort by hits (most accessed first)
    return results.sort((a, b) => b.hits - a.hits);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this._stats.cacheHits + this._stats.cacheMisses > 0
      ? this._stats.cacheHits / (this._stats.cacheHits + this._stats.cacheMisses)
      : 0;

    return {
      ...this._stats,
      cacheSize: this._cache.size,
      hitRate: hitRate.toFixed(3),
    };
  }

  /**
   * Get status for collective monitoring
   */
  getStatus() {
    return {
      name: this.name,
      emoji: this.emoji,
      sefira: this.sefira,
      active: true,
      ...this.getStats(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  _makeCacheKey(library, query = '') {
    return `${library}:${query}`.toLowerCase();
  }

  _storeInCache(key, content, ttlMs = null) {
    // Evict oldest entries if at capacity
    if (this._cache.size >= this.maxCacheSize) {
      this._evictOldest();
    }

    this._cache.set(key, new CacheEntry(content, ttlMs || this.defaultTtlMs));
    this._stats.docsStored++;
    log.debug('Stored in cache', { key, cacheSize: this._cache.size });
  }

  _evictOldest() {
    // Find entry with oldest access (lowest hits, oldest creation)
    let oldestKey = null;
    let oldestScore = Infinity;

    for (const [key, entry] of this._cache) {
      // Score: lower = older (favor evicting low-hit, old entries)
      const score = entry.hits * 1000000 + (Date.now() - entry.createdAt);
      if (score < oldestScore) {
        oldestScore = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._cache.delete(oldestKey);
      log.debug('Evicted cache entry', { key: oldestKey });
    }
  }

  async _fetchDocs(library, query) {
    // Placeholder - integrate with your documentation source
    // This could call Context7, fetch from URL, etc.
    log.debug('Fetching docs', { library, query });

    // Simulate fetch delay
    await new Promise(r => setTimeout(r, 100));

    return {
      library,
      query,
      content: `Documentation for ${library}${query ? ` (${query})` : ''}`,
      fetchedAt: new Date().toISOString(),
    };
  }
}

/**
 * Factory function
 */
export function createLibrarianDog(options) {
  return new LibrarianDog(options);
}

export default LibrarianDog;
```

---

## Step 3: Register with the Collective

Add to `packages/node/src/agents/collective/index.js`:

```javascript
import { LibrarianDog } from './librarian.js';

// In the CollectivePack constructor or initialization:
this.librarian = new LibrarianDog(options.librarian);
this.agents.set('librarian', this.librarian);
```

---

## Step 4: Wire to MCP Tools

Create a brain tool in `packages/mcp/src/tools/domains/`:

```javascript
// In your tools domain file
{
  name: 'brain_docs',
  description: 'Query cached documentation via Librarian Dog',
  inputSchema: {
    type: 'object',
    properties: {
      library: { type: 'string', description: 'Library name' },
      query: { type: 'string', description: 'Optional search query' },
    },
    required: ['library'],
  },
  handler: async ({ library, query }, context) => {
    const librarian = context.collective?.librarian;
    if (!librarian) {
      return { error: 'Librarian not available' };
    }
    return await librarian.process({ library, query });
  },
}
```

---

## Step 5: Test Your Dog

Create a test file `packages/node/test/librarian.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { LibrarianDog } from '../src/agents/collective/librarian.js';

describe('LibrarianDog', () => {
  let librarian;

  beforeEach(() => {
    librarian = new LibrarianDog({ maxCacheSize: 10 });
  });

  it('should cache documentation', async () => {
    // First request - cache miss
    const result1 = await librarian.process({ library: 'react' });
    expect(result1.source).toBe('fetch');

    // Second request - cache hit
    const result2 = await librarian.process({ library: 'react' });
    expect(result2.source).toBe('cache');
  });

  it('should track statistics', async () => {
    await librarian.process({ library: 'express' });
    await librarian.process({ library: 'express' });

    const stats = librarian.getStats();
    expect(stats.invocations).toBe(2);
    expect(stats.cacheHits).toBe(1);
    expect(stats.cacheMisses).toBe(1);
  });

  it('should evict old entries when full', async () => {
    // Fill cache
    for (let i = 0; i < 10; i++) {
      await librarian.process({ library: `lib${i}` });
    }
    expect(librarian.getStats().cacheSize).toBe(10);

    // Add one more - should trigger eviction
    await librarian.process({ library: 'newlib' });
    expect(librarian.getStats().cacheSize).toBe(10);
  });

  it('should search cached content', async () => {
    librarian.store('react', 'React is a JavaScript library for building UIs');
    librarian.store('vue', 'Vue is a progressive JavaScript framework');

    const results = librarian.search('JavaScript');
    expect(results.length).toBe(2);
  });
});
```

Run tests:
```bash
npm test -- packages/node/test/librarian.test.js
```

---

## Step 6: Add to Claude Agent (Optional)

Create a Claude Code agent that uses your Dog:

`.claude/agents/librarian.md`:
```markdown
---
name: cynic-librarian
description: Documentation specialist with intelligent caching
when_to_use: Use when fetching library documentation or looking up API references
tools:
  - mcp__cynic__brain_docs
  - WebFetch
  - Read
---

You are the Librarian Dog - CYNIC's documentation specialist.

Your role:
- Cache frequently accessed documentation
- Suggest relevant docs based on context
- Track documentation usage patterns

Always check the cache first using brain_docs before fetching externally.

*"Knowledge is power, cached knowledge is efficiency"* - φ⁻¹
```

---

## Key Concepts Recap

### φ-Alignment
- Confidence max: 61.8% (φ⁻¹)
- Use Fibonacci numbers for limits (13, 21, 34...)
- Cache hit rates should trend toward φ

### Sefira Position
Your Dog's position in the Tree of Life determines its role:
- **Keter** (Crown): CYNIC overseer
- **Daat** (Knowledge): Scholar, Librarian
- **Gevurah** (Judgment): Guardian
- **Tiferet** (Beauty): Oracle (balance)
- **Malkhut** (Kingdom): Cartographer (grounding)

### Statistics
Always track:
- `invocations`: Total calls
- `success`/`failure`: Outcome counts
- Domain-specific metrics (hits, patterns, etc.)

---

## Next Steps

1. **Integrate with Context7**: Replace `_fetchDocs` with real API calls
2. **Add persistence**: Store cache to PostgreSQL for cross-session
3. **Add to collective routing**: Let QLearningRouter learn when to invoke Librarian
4. **Create Grafana panel**: Visualize cache hit rates

---

*"Loyal to truth, not to comfort"* - CYNIC
