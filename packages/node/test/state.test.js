/**
 * State Management Tests
 *
 * Tests for storage backends and state manager
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';

import {
  MemoryStorage,
  FileStorage,
  StateManager,
  Operator,
} from '../src/index.js';

describe('Memory Storage', () => {
  let storage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('should set and get value', async () => {
    await storage.set('key1', { value: 'test' });
    const result = await storage.get('key1');

    assert.deepStrictEqual(result, { value: 'test' });
  });

  it('should return undefined for missing key', async () => {
    const result = await storage.get('nonexistent');
    assert.strictEqual(result, undefined);
  });

  it('should delete key', async () => {
    await storage.set('key1', 'value1');
    await storage.delete('key1');

    const result = await storage.get('key1');
    assert.strictEqual(result, undefined);
  });

  it('should check if key exists', async () => {
    await storage.set('exists', true);

    assert.strictEqual(await storage.has('exists'), true);
    assert.strictEqual(await storage.has('missing'), false);
  });

  it('should list keys', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.set('c', 3);

    const keys = await storage.keys();
    assert.deepStrictEqual(keys.sort(), ['a', 'b', 'c']);
  });

  it('should clear all data', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();

    const keys = await storage.keys();
    assert.strictEqual(keys.length, 0);
  });

  it('should handle complex values', async () => {
    const complex = {
      array: [1, 2, 3],
      nested: { deep: { value: true } },
      number: 42,
      string: 'hello',
    };

    await storage.set('complex', complex);
    const result = await storage.get('complex');

    assert.deepStrictEqual(result, complex);
  });
});

describe('File Storage', () => {
  let storage;
  let testDir;

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(tmpdir(), `cynic-test-${randomBytes(8).toString('hex')}`);
    await fs.mkdir(testDir, { recursive: true });
    storage = new FileStorage(testDir);
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should set and get value', async () => {
    await storage.set('key1', { value: 'test' });
    const result = await storage.get('key1');

    assert.deepStrictEqual(result, { value: 'test' });
  });

  it('should persist to file', async () => {
    await storage.set('persisted', { data: 'saved' });

    // Read file directly
    const content = await fs.readFile(join(testDir, 'persisted.json'), 'utf-8');
    const parsed = JSON.parse(content);

    assert.deepStrictEqual(parsed, { data: 'saved' });
  });

  it('should return undefined for missing key', async () => {
    const result = await storage.get('nonexistent');
    assert.strictEqual(result, undefined);
  });

  it('should delete key', async () => {
    await storage.set('key1', 'value1');
    await storage.delete('key1');

    const result = await storage.get('key1');
    assert.strictEqual(result, undefined);

    // File should not exist
    try {
      await fs.access(join(testDir, 'key1.json'));
      assert.fail('File should not exist');
    } catch (err) {
      assert.strictEqual(err.code, 'ENOENT');
    }
  });

  it('should check if key exists', async () => {
    await storage.set('exists', true);

    assert.strictEqual(await storage.has('exists'), true);
    assert.strictEqual(await storage.has('missing'), false);
  });

  it('should list keys', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.set('c', 3);

    const keys = await storage.keys();
    assert.deepStrictEqual(keys.sort(), ['a', 'b', 'c']);
  });

  it('should clear all data', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();

    const keys = await storage.keys();
    assert.strictEqual(keys.length, 0);
  });

  it('should use cache', async () => {
    await storage.set('cached', { value: 'cached' });

    // Clear cache manually
    storage.cache.clear();

    // Should read from file
    const result = await storage.get('cached');
    assert.deepStrictEqual(result, { value: 'cached' });

    // Should now be in cache
    assert.strictEqual(storage.cache.has('cached'), true);
  });

  it('should handle nested paths', async () => {
    // Create storage in nested path
    const nestedDir = join(testDir, 'nested', 'deep', 'path');
    const nestedStorage = new FileStorage(nestedDir);

    await nestedStorage.set('key', { nested: true });
    const result = await nestedStorage.get('key');

    assert.deepStrictEqual(result, { nested: true });
  });
});

describe('State Manager', () => {
  let manager;
  let operator;

  beforeEach(async () => {
    operator = new Operator({ name: 'TestOperator' });
    manager = new StateManager({
      operator,
      dataDir: null, // Use memory storage
    });
    await manager.initialize();
  });

  it('should initialize with fresh state', () => {
    assert.strictEqual(manager.initialized, true);
    assert.ok(manager.chain);
    assert.ok(manager.knowledge);
  });

  it('should get chain', () => {
    const chain = manager.chain;
    assert.ok(chain);
    assert.ok(chain.getHeight() >= 1);
  });

  it('should get knowledge tree', () => {
    const knowledge = manager.knowledge;
    assert.ok(knowledge);
    assert.ok(knowledge.getStats);
  });

  it('should add judgment', () => {
    manager.addJudgment({ id: 'jdg_1', verdict: 'WAG' });
    manager.addJudgment({ id: 'jdg_2', verdict: 'HOWL' });

    const recent = manager.getRecentJudgments(10);
    assert.strictEqual(recent.length, 2);
  });

  it('should limit judgment history', () => {
    // Add more than 1000 judgments
    for (let i = 0; i < 1100; i++) {
      manager.addJudgment({ id: `jdg_${i}` });
    }

    const recent = manager.getRecentJudgments(2000);
    assert.strictEqual(recent.length, 1000);
  });

  it('should add peer', () => {
    manager.addPeer({ id: 'peer_1', address: 'localhost:8080' });
    manager.addPeer({ id: 'peer_2', address: 'localhost:8081' });

    const peers = manager.getAllPeers();
    assert.strictEqual(peers.length, 2);
  });

  it('should get peer', () => {
    manager.addPeer({ id: 'peer_1', name: 'Test Peer' });

    const peer = manager.getPeer('peer_1');
    assert.ok(peer);
    assert.strictEqual(peer.name, 'Test Peer');
  });

  it('should remove peer', () => {
    manager.addPeer({ id: 'peer_1' });
    manager.removePeer('peer_1');

    const peer = manager.getPeer('peer_1');
    assert.strictEqual(peer, null);
  });

  it('should return null for missing peer', () => {
    const peer = manager.getPeer('nonexistent');
    assert.strictEqual(peer, null);
  });

  it('should save state', async () => {
    manager.addJudgment({ id: 'jdg_test' });
    manager.addPeer({ id: 'peer_test' });

    await manager.save();

    // Verify state was saved
    const savedState = await manager.storage.get('state');
    assert.ok(savedState);
    assert.ok(savedState.chain);
    assert.ok(savedState.knowledge);
    assert.ok(savedState.judgments);
    assert.ok(savedState.peers);
    assert.ok(savedState.savedAt);
  });

  it('should save operator state', async () => {
    operator.recordBurn(500);
    await manager.save();

    const savedOperator = await manager.storage.get('operator');
    assert.ok(savedOperator);
    assert.strictEqual(savedOperator.burn.totalBurned, 500);
  });

  it('should get state summary', () => {
    manager.addJudgment({ id: 'jdg_1' });
    manager.addPeer({ id: 'peer_1' });

    const summary = manager.getSummary();

    assert.ok(summary.chainHeight >= 1);
    assert.ok(summary.knowledgeStats);
    assert.strictEqual(summary.peerCount, 1);
    assert.strictEqual(summary.judgmentCount, 1);
    assert.strictEqual(summary.initialized, true);
  });

  it('should clear state', async () => {
    manager.addJudgment({ id: 'jdg_1' });
    manager.addPeer({ id: 'peer_1' });

    await manager.clear();

    assert.strictEqual(manager.initialized, false);
    const peers = manager.getAllPeers();
    assert.strictEqual(peers.length, 0);
  });

  it('should throw on uninitialized chain access', () => {
    const uninitManager = new StateManager({ operator });

    assert.throws(() => {
      uninitManager.chain;
    });
  });

  it('should throw on uninitialized knowledge access', () => {
    const uninitManager = new StateManager({ operator });

    assert.throws(() => {
      uninitManager.knowledge;
    });
  });

  it('should load existing state', async () => {
    // Save some state
    manager.addJudgment({ id: 'jdg_saved' });
    manager.addPeer({ id: 'peer_saved', name: 'Saved Peer' });
    await manager.save();

    // Create new manager with same storage
    const newOperator = new Operator({
      identity: {
        publicKey: operator.publicKey,
        privateKey: operator.privateKey,
      },
    });

    const newManager = new StateManager({
      operator: newOperator,
      dataDir: null,
    });

    // Manually set storage to use same instance
    newManager.storage = manager.storage;

    await newManager.initialize();

    // Should have loaded saved state
    const peers = newManager.getAllPeers();
    const judgments = newManager.getRecentJudgments(10);

    assert.strictEqual(peers.length, 1);
    assert.strictEqual(judgments.length, 1);
    assert.strictEqual(peers[0].id, 'peer_saved');
  });
});

describe('State Manager with File Storage', () => {
  let manager;
  let operator;
  let testDir;

  beforeEach(async () => {
    testDir = join(tmpdir(), `cynic-state-${randomBytes(8).toString('hex')}`);
    operator = new Operator({ name: 'FileTestOperator' });
    manager = new StateManager({
      operator,
      dataDir: testDir,
    });
    await manager.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should use file storage', () => {
    assert.ok(manager.storage instanceof FileStorage);
    assert.strictEqual(manager.dataDir, testDir);
  });

  it('should persist and reload state', async () => {
    // Add some state
    manager.addJudgment({ id: 'jdg_persist' });
    manager.addPeer({ id: 'peer_persist', name: 'Persistent Peer' });
    await manager.save();

    // Create completely new manager with same directory
    const newOperator = new Operator({
      identity: {
        publicKey: operator.publicKey,
        privateKey: operator.privateKey,
      },
    });

    const newManager = new StateManager({
      operator: newOperator,
      dataDir: testDir,
    });

    await newManager.initialize();

    const peers = newManager.getAllPeers();
    assert.strictEqual(peers.length, 1);
    assert.strictEqual(peers[0].name, 'Persistent Peer');
  });
});
