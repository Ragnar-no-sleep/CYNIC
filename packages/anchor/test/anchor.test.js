/**
 * @cynic/anchor Tests
 *
 * "Onchain is truth" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  SolanaAnchorer,
  createAnchorer,
  AnchorQueue,
  createAnchorQueue,
  AnchorStatus,
  ANCHOR_CONSTANTS,
} from '../src/index.js';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// ═══════════════════════════════════════════════════════════════════════════
// Anchorer Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - SolanaAnchorer', () => {
  let anchorer;

  beforeEach(() => {
    anchorer = createAnchorer();
  });

  describe('Creation', () => {
    it('should create anchorer with default config', () => {
      assert.ok(anchorer instanceof SolanaAnchorer);
      assert.strictEqual(anchorer.stats.totalAnchored, 0);
    });

    it('should accept custom cluster', () => {
      const custom = createAnchorer({ cluster: 'http://localhost:8899' });
      assert.strictEqual(custom.cluster, 'http://localhost:8899');
    });
  });

  describe('Simulation Mode', () => {
    it('should simulate anchor without wallet', async () => {
      const merkleRoot = 'a'.repeat(64);
      const result = await anchorer.anchor(merkleRoot);

      assert.strictEqual(result.success, true);
      assert.ok(result.signature.startsWith('sim_'));
      assert.strictEqual(result.merkleRoot, merkleRoot);
      assert.ok(result.timestamp);
      assert.strictEqual(result.simulated, true);
    });

    it('should update stats after anchor', async () => {
      await anchorer.anchor('b'.repeat(64));

      const stats = anchorer.getStats();
      assert.strictEqual(stats.totalAnchored, 1);
      assert.ok(stats.lastAnchorTime);
      assert.ok(stats.lastSignature);
    });

    it('should track anchor records', async () => {
      await anchorer.anchor('c'.repeat(64), ['item1', 'item2']);

      const stats = anchorer.getStats();
      assert.strictEqual(stats.totalRecords, 1);
      assert.strictEqual(stats.totalItems, 2);
    });
  });

  describe('Validation', () => {
    it('should reject invalid merkle root format', async () => {
      const result = await anchorer.anchor('not-valid-hex');

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('Invalid merkle root'));
    });

    it('should reject short merkle root', async () => {
      const result = await anchorer.anchor('abc123');

      assert.strictEqual(result.success, false);
    });
  });

  describe('Anchor Retrieval', () => {
    it('should get anchor by ID', async () => {
      const merkleRoot = 'd'.repeat(64);
      await anchorer.anchor(merkleRoot);

      const records = Array.from(anchorer.anchors.values());
      const record = records[0];

      const retrieved = anchorer.getAnchor(record.id);
      assert.strictEqual(retrieved.merkleRoot, merkleRoot);
    });

    it('should get anchor by signature', async () => {
      const result = await anchorer.anchor('e'.repeat(64));

      const record = anchorer.getAnchorBySignature(result.signature);
      assert.ok(record);
      assert.strictEqual(record.signature, result.signature);
    });
  });

  describe('Export/Import', () => {
    it('should export state', async () => {
      await anchorer.anchor('f'.repeat(64));

      const exported = anchorer.export();
      assert.ok(Array.isArray(exported.anchors));
      assert.ok(exported.stats);
    });

    it('should import state', async () => {
      // First verify anchor creates a record (use valid hex: 0-9, a-f)
      const result = await anchorer.anchor('a1b2c3d4e5f6'.repeat(6).slice(0, 64));
      assert.strictEqual(result.success, true, 'Anchor should succeed');
      assert.strictEqual(anchorer.anchors.size, 1, 'Anchors map should have 1 entry');

      const exported = anchorer.export();
      assert.strictEqual(exported.anchors.length, 1, 'Export should have 1 anchor');
      assert.strictEqual(exported.stats.totalAnchored, 1, 'Export stats should show 1 anchored');

      const newAnchorer = createAnchorer();
      newAnchorer.import(exported);

      // Verify anchors were imported
      assert.strictEqual(newAnchorer.anchors.size, 1, 'Imported anchors should have 1 entry');
      assert.strictEqual(newAnchorer.stats.totalAnchored, 1, 'Imported stats should show 1');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Queue Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - AnchorQueue', () => {
  let anchorer;
  let queue;

  beforeEach(() => {
    anchorer = createAnchorer();
    queue = createAnchorQueue({
      anchorer,
      batchSize: 3, // Small batch for testing
    });
  });

  describe('Enqueueing', () => {
    it('should enqueue items', () => {
      const item = queue.enqueue('jdg_123', { score: 75 });

      assert.strictEqual(item.id, 'jdg_123');
      assert.ok(item.hash);
      assert.strictEqual(item.status, AnchorStatus.QUEUED);
    });

    it('should compute hash from content', () => {
      const item1 = queue.enqueue('a', 'hello');
      const item2 = queue.enqueue('b', 'hello');
      const item3 = queue.enqueue('c', 'world');

      assert.strictEqual(item1.hash, item2.hash);
      assert.notStrictEqual(item1.hash, item3.hash);
    });

    it('should track queue length', () => {
      queue.enqueue('1', 'a');
      queue.enqueue('2', 'b');

      assert.strictEqual(queue.getQueueLength(), 2);
    });
  });

  describe('Batching', () => {
    it('should auto-batch when size reached', async () => {
      // Add exactly batchSize items
      queue.enqueue('1', 'a');
      queue.enqueue('2', 'b');
      queue.enqueue('3', 'c');

      // Wait for async processing
      await new Promise((r) => setTimeout(r, 50));

      assert.strictEqual(queue.getQueueLength(), 0);
      assert.strictEqual(queue.stats.totalBatches, 1);
    });

    it('should compute merkle root', () => {
      const items = [
        { id: 'a', hash: '1'.repeat(64) },
        { id: 'b', hash: '2'.repeat(64) },
      ];

      const root = queue.computeMerkleRoot(items);
      assert.ok(root);
      assert.strictEqual(root.length, 64);
    });

    it('should return zero hash for empty', () => {
      const root = queue.computeMerkleRoot([]);
      assert.strictEqual(root, '0'.repeat(64));
    });
  });

  describe('Flush', () => {
    it('should flush queue manually', async () => {
      queue.enqueue('1', 'a');
      queue.enqueue('2', 'b');

      const batch = await queue.flush();

      assert.ok(batch);
      assert.strictEqual(batch.items.length, 2);
      assert.strictEqual(queue.getQueueLength(), 0);
    });

    it('should return null for empty flush', async () => {
      const batch = await queue.flush();
      assert.strictEqual(batch, null);
    });
  });

  describe('Proofs', () => {
    it('should get proof for anchored item', async () => {
      queue.enqueue('jdg_test', { data: 'test' });
      await queue.flush();

      // Wait for anchor
      await new Promise((r) => setTimeout(r, 50));

      const proof = queue.getProof('jdg_test');

      assert.ok(proof);
      assert.strictEqual(proof.itemId, 'jdg_test');
      assert.ok(proof.itemHash);
      assert.ok(proof.merkleRoot);
      assert.ok(Array.isArray(proof.merkleProof));
      assert.ok(proof.signature);
    });

    it('should verify proof', async () => {
      queue.enqueue('verify_me', { x: 1 });
      await queue.flush();
      await new Promise((r) => setTimeout(r, 50));

      const proof = queue.getProof('verify_me');

      const valid = queue.verifyProof(
        proof.itemHash,
        proof.merkleRoot,
        proof.merkleProof
      );

      assert.strictEqual(valid, true);
    });

    it('should fail verification for tampered proof', async () => {
      queue.enqueue('tamper_test', { y: 2 });
      await queue.flush();
      await new Promise((r) => setTimeout(r, 50));

      const proof = queue.getProof('tamper_test');

      // Tamper with hash
      const valid = queue.verifyProof(
        'x'.repeat(64), // Wrong hash
        proof.merkleRoot,
        proof.merkleProof
      );

      assert.strictEqual(valid, false);
    });
  });

  describe('Item Status', () => {
    it('should track item status', async () => {
      queue.enqueue('status_test', 'data');

      // Before flush
      let status = queue.getItemStatus('status_test');
      assert.strictEqual(status, AnchorStatus.QUEUED);

      await queue.flush();
      await new Promise((r) => setTimeout(r, 50));

      // After anchor
      status = queue.getItemStatus('status_test');
      assert.strictEqual(status, AnchorStatus.ANCHORED);
    });

    it('should return null for unknown item', () => {
      const status = queue.getItemStatus('unknown');
      assert.strictEqual(status, null);
    });
  });

  describe('Timer', () => {
    it('should start and stop timer', () => {
      queue.startTimer();
      assert.strictEqual(queue.getStats().timerActive, true);

      queue.stopTimer();
      assert.strictEqual(queue.getStats().timerActive, false);
    });

    it('should destroy cleanup timer', () => {
      queue.startTimer();
      queue.destroy();
      assert.strictEqual(queue.getStats().timerActive, false);
    });
  });

  describe('Export/Import', () => {
    it('should export queue state', async () => {
      queue.enqueue('export_test', 'data');
      await queue.flush();

      const exported = queue.export();

      assert.ok(Array.isArray(exported.queue));
      assert.ok(Array.isArray(exported.batches));
      assert.ok(exported.stats);
    });

    it('should import queue state', async () => {
      queue.enqueue('import_test', 'data');
      await queue.flush();
      const exported = queue.export();

      const newQueue = createAnchorQueue({ anchorer });
      newQueue.import(exported);

      assert.strictEqual(newQueue.stats.totalBatches, 1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Constants Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('@cynic/anchor - Constants', () => {
  it('should have φ-aligned interval', () => {
    // ANCHOR_INTERVAL_MS = round(φ⁻¹ * 100 * 1000) ≈ 61,803ms
    // φ⁻¹ = 0.6180339887... so 0.618... * 100000 = 61803.398...
    const expected = Math.round(PHI_INV * 100 * 1000);
    assert.strictEqual(ANCHOR_CONSTANTS.ANCHOR_INTERVAL_MS, expected);
  });

  it('should have φ-aligned batch size', () => {
    // ANCHOR_BATCH_SIZE = floor(φ⁻² * 100) = 38
    assert.strictEqual(ANCHOR_CONSTANTS.ANCHOR_BATCH_SIZE, 38);
  });

  it('should cap confidence at φ⁻¹', () => {
    assert.ok(Math.abs(ANCHOR_CONSTANTS.ANCHOR_CONFIDENCE_CAP - PHI_INV) < 0.001);
  });

  it('should have correct retry count', () => {
    // round(φ⁻² * 10) = round(3.82) = 4
    assert.strictEqual(ANCHOR_CONSTANTS.MAX_RETRY_ATTEMPTS, 4);
  });
});
