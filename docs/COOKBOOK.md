# CYNIC Cookbook: Common Patterns

> **"φ distrusts φ"** - κυνικός
>
> Recipes for common CYNIC development tasks.

**Last Updated**: 2026-02-01

---

## Table of Contents

1. [Hook Patterns](#hook-patterns)
2. [Judgment Patterns](#judgment-patterns)
3. [Memory Patterns](#memory-patterns)
4. [Routing Patterns](#routing-patterns)
5. [Testing Patterns](#testing-patterns)
6. [Integration Patterns](#integration-patterns)

---

## Hook Patterns

### Pattern: Async Hook with Timeout

Hooks should complete quickly. Use async with timeout protection:

```javascript
// scripts/hooks/my-hook.js
const TIMEOUT_MS = 5000; // 5 seconds max

async function main() {
  const data = JSON.parse(process.argv[2] || '{}');

  const result = await Promise.race([
    doWork(data),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
    )
  ]);

  console.log(JSON.stringify(result));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
```

### Pattern: PreToolUse Guard

Block dangerous operations:

```javascript
// scripts/hooks/guard.js
const data = JSON.parse(process.argv[2] || '{}');
const { tool_name, tool_input } = data;

// Patterns to block
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+[\/~]/,           // rm -rf /
  />\s*\/dev\/sda/,              // Write to disk
  /:(){ :|:& };:/,               // Fork bomb
  /DELETE\s+FROM\s+\w+\s*;/i,    // DELETE without WHERE
];

if (tool_name === 'Bash') {
  const command = tool_input?.command || '';

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      // Output for prompt hook - blocks execution
      console.log(JSON.stringify({
        decision: 'block',
        reason: `Dangerous pattern detected: ${pattern}`,
      }));
      process.exit(0);
    }
  }
}

// Allow by default
console.log(JSON.stringify({ decision: 'allow' }));
```

### Pattern: PostToolUse Observer

Extract facts from tool results:

```javascript
// scripts/hooks/observe.js
const data = JSON.parse(process.argv[2] || '{}');
const { tool_name, tool_result } = data;

const facts = [];

// Extract file paths from Read results
if (tool_name === 'Read' && tool_result?.content) {
  const imports = tool_result.content.match(/import .+ from ['"](.+)['"]/g) || [];
  facts.push({ type: 'imports', count: imports.length });
}

// Extract errors from Bash results
if (tool_name === 'Bash' && tool_result?.stderr) {
  facts.push({ type: 'error', message: tool_result.stderr.slice(0, 200) });
}

// Store facts (example: post to MCP)
if (facts.length > 0) {
  await fetch('http://localhost:3000/api/facts', {
    method: 'POST',
    body: JSON.stringify({ facts }),
  }).catch(() => {}); // Silent fail
}
```

---

## Judgment Patterns

### Pattern: Custom Scorer

Create a domain-specific scorer:

```javascript
// packages/node/src/judge/scorers/my-scorer.js
import { BaseScorer } from './base-scorer.js';

const PHI_INV = 0.618033988749895;

export class MyDomainScorer extends BaseScorer {
  constructor() {
    super('my-domain');
    this.weight = 0.15; // Contribution to final score
  }

  async score(item, context) {
    let score = 0.5; // Start neutral
    const reasoning = [];

    // Your scoring logic
    if (item.hasGoodPattern) {
      score += 0.2;
      reasoning.push('Good pattern detected (+0.2)');
    }

    if (item.hasBadSmell) {
      score -= 0.3;
      reasoning.push('Code smell detected (-0.3)');
    }

    // Clamp to [0, φ⁻¹]
    score = Math.max(0, Math.min(PHI_INV, score));

    return {
      dimension: this.name,
      score,
      confidence: PHI_INV * 0.9,
      reasoning,
    };
  }
}
```

### Pattern: Collective Judgment

Use multiple Dogs for consensus:

```javascript
import { CollectivePack } from '@cynic/node';

const collective = new CollectivePack();

// Request judgment from specific Dogs
const opinions = await Promise.all([
  collective.guardian.analyze(item),
  collective.analyst.analyze(item),
  collective.scholar.analyze(item),
]);

// φ-weighted consensus
const totalWeight = opinions.reduce((sum, o) => sum + o.confidence, 0);
const weightedScore = opinions.reduce(
  (sum, o) => sum + o.score * o.confidence, 0
) / totalWeight;

// Supermajority check (61.8%)
const agreement = opinions.filter(o => o.verdict === 'ALLOW').length / opinions.length;
const hasConsensus = agreement >= PHI_INV;
```

---

## Memory Patterns

### Pattern: Working Memory with TTL

Keep active context in working memory:

```javascript
class WorkingMemory {
  constructor(maxItems = 7, ttlMs = 1800000) { // 7±2 items, 30 min TTL
    this.items = new Map();
    this.maxItems = maxItems;
    this.ttlMs = ttlMs;
  }

  add(key, value) {
    // Evict if full
    if (this.items.size >= this.maxItems) {
      const oldest = [...this.items.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.items.delete(oldest[0]);
    }

    this.items.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const item = this.items.get(key);
    if (!item) return null;

    // Check TTL
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.items.delete(key);
      return null;
    }

    // Update timestamp on access
    item.timestamp = Date.now();
    return item.value;
  }
}
```

### Pattern: Semantic Memory with Embeddings

Store facts with vector similarity search:

```javascript
import { UnifiedEmbedder } from '@cynic/core';

class SemanticMemory {
  constructor() {
    this.embedder = new UnifiedEmbedder();
    this.memories = [];
  }

  async store(content, metadata = {}) {
    const embedding = this.embedder.embed(content);
    this.memories.push({
      content,
      embedding,
      metadata,
      timestamp: Date.now(),
    });
  }

  async search(query, topK = 5) {
    const queryEmb = this.embedder.embed(query);

    // Calculate similarities
    const scored = this.memories.map(mem => ({
      ...mem,
      similarity: this.embedder.similarity(queryEmb, mem.embedding),
    }));

    // Return top-K
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}
```

---

## Routing Patterns

### Pattern: Kabbalistic Router

Route by Sefirot pillars:

```javascript
const PILLARS = {
  left: ['guardian', 'analyst', 'deployer'],      // Gevurah - Judgment
  middle: ['cynic', 'scholar', 'oracle', 'janitor', 'cartographer'], // Tiferet - Balance
  right: ['sage', 'architect', 'scout'],          // Chesed - Creation
};

function routeToPillar(taskType) {
  switch (taskType) {
    case 'security':
    case 'review':
    case 'deploy':
      return 'left'; // Judgment pillar

    case 'create':
    case 'design':
    case 'explore':
      return 'right'; // Creation pillar

    default:
      return 'middle'; // Balance pillar
  }
}

function selectDog(taskType) {
  const pillar = routeToPillar(taskType);
  const candidates = PILLARS[pillar];

  // Return first available or random
  return candidates[Math.floor(Math.random() * candidates.length)];
}
```

### Pattern: Q-Learning Selection

Learn optimal routing over time:

```javascript
import { QLearningRouter } from '@cynic/node';

const router = new QLearningRouter();

// Select action (dog)
const state = router.extractFeatures({ taskType: 'security', hasCode: true });
const selectedDog = router.selectAction(state);

// After task completion, provide feedback
router.learn(state, selectedDog, {
  reward: success ? 1.0 : -0.5,
  nextState: router.extractFeatures(nextContext),
});
```

---

## Testing Patterns

### Pattern: Judge Testing

Test scorer consistency:

```javascript
import { describe, it, expect } from 'vitest';
import { CYNICJudge } from '@cynic/node';

describe('CYNICJudge', () => {
  const judge = new CYNICJudge();

  it('should return consistent scores for identical items', async () => {
    const item = { type: 'code', content: 'const x = 1;' };

    const result1 = await judge.judge(item);
    const result2 = await judge.judge(item);

    expect(result1.qScore).toBe(result2.qScore);
  });

  it('should never exceed φ⁻¹ confidence', async () => {
    const result = await judge.judge({ type: 'test', content: 'anything' });
    expect(result.confidence).toBeLessThanOrEqual(0.618);
  });

  it('should detect dangerous code', async () => {
    const result = await judge.judge({
      type: 'code',
      content: 'exec(userInput)', // Dangerous pattern
    });

    expect(result.verdict).toBe('GROWL');
  });
});
```

### Pattern: Hook Testing

Test hooks in isolation:

```javascript
import { execSync } from 'child_process';

describe('Guard Hook', () => {
  function runHook(data) {
    const result = execSync(
      `node scripts/hooks/guard.js '${JSON.stringify(data)}'`,
      { encoding: 'utf8' }
    );
    return JSON.parse(result);
  }

  it('should block rm -rf /', () => {
    const result = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
    });
    expect(result.decision).toBe('block');
  });

  it('should allow safe commands', () => {
    const result = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
    });
    expect(result.decision).toBe('allow');
  });
});
```

---

## Integration Patterns

### Pattern: MCP Server Connection

Connect to CYNIC MCP from external app:

```javascript
import { EventSource } from 'eventsource';

class CYNICClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async judge(item) {
    const response = await fetch(`${this.baseUrl}/api/judge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return response.json();
  }

  subscribeToEvents(callback) {
    const es = new EventSource(`${this.baseUrl}/sse`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return () => es.close();
  }
}

// Usage
const client = new CYNICClient();

const result = await client.judge({
  type: 'code',
  content: 'console.log("hello")',
});

console.log(`Verdict: ${result.verdict}, Q-Score: ${result.qScore}`);
```

### Pattern: Database Persistence

Store judgments in PostgreSQL:

```javascript
import { PostgresClient } from '@cynic/persistence';

const db = new PostgresClient();
await db.connect();

// Store judgment
await db.query(`
  INSERT INTO judgments (item_hash, q_score, verdict, dimensions, created_at)
  VALUES ($1, $2, $3, $4, NOW())
`, [
  itemHash,
  result.qScore,
  result.verdict,
  JSON.stringify(result.dimensions),
]);

// Retrieve recent judgments
const { rows } = await db.query(`
  SELECT * FROM judgments
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 100
`);
```

### Pattern: Redis Caching

Cache hot data in Redis:

```javascript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.CYNIC_REDIS_URL });
await redis.connect();

const CACHE_TTL = 3600; // 1 hour

async function getCachedJudgment(itemHash) {
  const cached = await redis.get(`judgment:${itemHash}`);
  if (cached) return JSON.parse(cached);
  return null;
}

async function cacheJudgment(itemHash, result) {
  await redis.setEx(
    `judgment:${itemHash}`,
    CACHE_TTL,
    JSON.stringify(result)
  );
}
```

---

## φ-Aligned Constants Reference

```javascript
// Golden ratio constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;   // φ⁻¹ = 1/φ
const PHI_INV_2 = 0.381966011250105; // φ⁻² = 1/φ²
const PHI_INV_3 = 0.236067977499790; // φ⁻³ = 1/φ³

// Fibonacci sequence (useful for limits)
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// Common thresholds
const THRESHOLD_HIGH = PHI_INV;      // 61.8% - success/confidence max
const THRESHOLD_MED = PHI_INV_2;     // 38.2% - caution zone
const THRESHOLD_LOW = PHI_INV_3;     // 23.6% - danger zone

// Supermajority for consensus
const SUPERMAJORITY = PHI_INV;       // 61.8% agreement required
```

---

*"Loyal to truth, not to comfort"* - CYNIC
