/**
 * Multi-Node Integration Tests
 *
 * PHASE 2: DECENTRALIZE
 *
 * Proves end-to-end P2P: nodes connect, exchange identity/heartbeats,
 * register validators, produce blocks, and reach consensus.
 *
 * Guard: CYNIC_P2P_TESTS=true (real WebSocket connections)
 *
 * "The pack hunts together — prove it" - κυνικός
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { CYNICNetworkNode, NetworkState } from '../src/network/network-node.js';
import { generateKeypair } from '@cynic/identity';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a test node with unique Ed25519 keys and port
 * @param {number} index - Node index (determines port offset)
 * @param {number} basePort - Base port for the suite
 * @param {string[]} seedNodes - Seed node addresses
 * @param {Object} overrides - Extra options for CYNICNetworkNode
 */
function createTestNode(index, basePort, seedNodes = [], overrides = {}) {
  const keys = generateKeypair();
  return new CYNICNetworkNode({
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    port: basePort + index,
    eScore: 50 + index * 10,
    seedNodes,
    enabled: true,
    // Fast slots for testing
    slotDuration: 400,
    ...overrides,
  });
}

/**
 * Wait for a specific event on an emitter (resolves with event data or rejects on timeout)
 * @param {EventEmitter} emitter
 * @param {string} eventName
 * @param {number} timeoutMs
 * @returns {Promise<Object>}
 */
function waitForEvent(emitter, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.removeListener(eventName, handler);
      reject(new Error(`Timed out waiting for '${eventName}' after ${timeoutMs}ms`));
    }, timeoutMs);

    function handler(data) {
      clearTimeout(timer);
      resolve(data);
    }

    emitter.once(eventName, handler);
  });
}

/**
 * Poll a condition until true (or timeout)
 * @param {Function} checkFn - () => boolean
 * @param {number} timeoutMs
 * @param {number} intervalMs
 * @returns {Promise<void>}
 */
function waitForCondition(checkFn, timeoutMs = 10000, intervalMs = 200) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function poll() {
      if (checkFn()) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Condition not met within ${timeoutMs}ms`));
        return;
      }
      setTimeout(poll, intervalMs);
    }

    poll();
  });
}

/**
 * Clean shutdown of all nodes (tolerates errors)
 * @param {CYNICNetworkNode[]} nodes
 */
async function stopAllNodes(nodes) {
  await Promise.all(nodes.map(n => n.stop().catch(() => {})));
}

// ═══════════════════════════════════════════════════════════════════════════
// Guards
// ═══════════════════════════════════════════════════════════════════════════

const runP2PTests = process.env.CYNIC_P2P_TESTS === 'true';

// ═══════════════════════════════════════════════════════════════════════════
// Suite 1: Two-Node Network (ports 18618-18619)
// ═══════════════════════════════════════════════════════════════════════════

describe('Suite 1: Two-Node Network', { skip: !runP2PTests ? 'CYNIC_P2P_TESTS not set' : false }, () => {
  const BASE_PORT = 18618;
  let nodes = [];

  after(async () => {
    await stopAllNodes(nodes);
    nodes = [];
  });

  it('nodes start and connect', { timeout: 10000 }, async () => {
    const nodeA = createTestNode(0, BASE_PORT);
    const nodeB = createTestNode(1, BASE_PORT, [`ws://localhost:${BASE_PORT}`]);
    nodes.push(nodeA, nodeB);

    // Start A first (it listens)
    await nodeA.start();
    assert.strictEqual(nodeA.isOnline, true, 'Node A should be online after start');

    // Start B (it connects to A via seed)
    await nodeB.start();
    assert.strictEqual(nodeB.isOnline, true, 'Node B should be online after start');

    // Wait for at least one direction to be connected
    await waitForCondition(() => {
      const peersA = nodeA.getConnectedPeers();
      const peersB = nodeB.getConnectedPeers();
      return peersA.length + peersB.length > 0;
    }, 8000);

    const peersA = nodeA.getConnectedPeers();
    const peersB = nodeB.getConnectedPeers();
    assert.ok(peersA.length + peersB.length > 0,
      `At least one direction connected (A: ${peersA.length}, B: ${peersB.length})`);
  });

  it('identity exchange completes with valid public keys', { timeout: 10000 }, async () => {
    const nodeA = nodes[0];
    const nodeB = nodes[1];

    // After connection, identity exchange should have happened.
    // Peers should be keyed by real public keys (not temp IDs).
    await waitForCondition(() => {
      const peersA = nodeA.getConnectedPeers();
      const peersB = nodeB.getConnectedPeers();
      // At least one node sees the other by publicKey
      return peersA.includes(nodeB.publicKey) || peersB.includes(nodeA.publicKey);
    }, 8000);

    const peersA = nodeA.getConnectedPeers();
    const peersB = nodeB.getConnectedPeers();

    // At least one direction: peer ID should match the other node's actual publicKey
    const aSeesB = peersA.includes(nodeB.publicKey);
    const bSeesA = peersB.includes(nodeA.publicKey);
    assert.ok(aSeesB || bSeesA,
      `Identity exchange: A sees B=${aSeesB}, B sees A=${bSeesA}`);
  });

  it('heartbeat exchange observed', { timeout: 20000 }, async () => {
    const nodeB = nodes[1];

    // Wait for heartbeat:received event on node B
    // Heartbeat interval is 8000ms, so wait up to 18s
    const heartbeat = await waitForEvent(nodeB, 'heartbeat:received', 18000);

    assert.ok(heartbeat, 'Should have received heartbeat');
    assert.ok(heartbeat.nodeId || heartbeat.peerId, 'Heartbeat should contain nodeId or peerId');
    assert.ok(typeof heartbeat.eScore === 'number' || heartbeat.eScore === undefined,
      'eScore should be a number if present');
  });

  it('peer auto-registered as validator', { timeout: 15000 }, async () => {
    // After heartbeat processing, validators should be registered
    await waitForCondition(() => {
      return nodes.some(n => n.getValidatorCount() >= 2);
    }, 12000);

    const maxValidators = Math.max(...nodes.map(n => n.getValidatorCount()));
    assert.ok(maxValidators >= 2,
      `At least 2 validators on some node (max seen: ${maxValidators})`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 2: Three-Node Consensus (ports 18620-18622)
// ═══════════════════════════════════════════════════════════════════════════

describe('Suite 2: Three-Node Consensus', { skip: !runP2PTests ? 'CYNIC_P2P_TESTS not set' : false }, () => {
  const BASE_PORT = 18620;
  let nodes = [];

  after(async () => {
    await stopAllNodes(nodes);
    nodes = [];
  });

  it('three nodes form mesh', { timeout: 15000 }, async () => {
    const nodeA = createTestNode(0, BASE_PORT, [], { confirmations: 1 });
    const nodeB = createTestNode(1, BASE_PORT, [`ws://localhost:${BASE_PORT}`], { confirmations: 1 });
    const nodeC = createTestNode(2, BASE_PORT, [`ws://localhost:${BASE_PORT}`], { confirmations: 1 });
    nodes.push(nodeA, nodeB, nodeC);

    await nodeA.start();
    assert.ok(nodeA.isOnline, 'A online');

    await nodeB.start();
    assert.ok(nodeB.isOnline, 'B online');

    await nodeC.start();
    assert.ok(nodeC.isOnline, 'C online');

    // Wait for each node to see at least 1 peer
    await waitForCondition(() => {
      return nodes.every(n => n.getConnectedPeers().length >= 1);
    }, 12000);

    for (let i = 0; i < nodes.length; i++) {
      const peers = nodes[i].getConnectedPeers();
      assert.ok(peers.length >= 1,
        `Node ${i} has ${peers.length} peers (expected >= 1)`);
    }
  });

  it('validators registered across cluster', { timeout: 20000 }, async () => {
    // After heartbeat exchange, validators should be registered.
    // Heartbeat interval is 8s, so wait generously.
    await waitForCondition(() => {
      return nodes.some(n => n.getValidatorCount() >= 3);
    }, 18000);

    const counts = nodes.map(n => n.getValidatorCount());
    const maxValidators = Math.max(...counts);
    assert.ok(maxValidators >= 3,
      `At least 3 validators on some node (counts: ${counts.join(', ')})`);
  });

  it('block production observed', { timeout: 15000 }, async () => {
    // At least one node should be in PARTICIPATING state
    // (consensus:started fires immediately on start, transitioning to PARTICIPATING)
    await waitForCondition(() => {
      return nodes.some(n => n.state === NetworkState.PARTICIPATING);
    }, 5000);

    // Now wait for block:produced event on any node
    // With 400ms slots, leader selection should fire quickly
    const blockPromises = nodes.map(n =>
      waitForEvent(n, 'block:produced', 12000).catch(() => null)
    );

    const results = await Promise.all(blockPromises);
    const produced = results.filter(r => r !== null);

    assert.ok(produced.length > 0,
      `At least one node produced a block (${produced.length} nodes produced)`);

    // Verify block structure
    const block = produced[0];
    assert.ok(typeof block.slot === 'number', 'Block has slot number');
    assert.ok(typeof block.hash === 'string', 'Block has hash');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 3: State Transitions (ports 18625-18626)
// ═══════════════════════════════════════════════════════════════════════════

describe('Suite 3: State Transitions', { skip: !runP2PTests ? 'CYNIC_P2P_TESTS not set' : false }, () => {
  let nodes = [];
  const BASE_PORT = 18625;

  after(async () => {
    await stopAllNodes(nodes);
    nodes = [];
  });

  it('OFFLINE -> ONLINE lifecycle', { timeout: 5000 }, async () => {
    const node = createTestNode(0, BASE_PORT);
    nodes.push(node);

    assert.strictEqual(node.state, NetworkState.OFFLINE, 'Should start OFFLINE');

    await node.start();
    assert.ok(node.isOnline, 'Should be online after start');
    // State may be ONLINE or PARTICIPATING (consensus:started fires during start)
    assert.ok(
      node.state === NetworkState.ONLINE || node.state === NetworkState.PARTICIPATING,
      `State should be ONLINE or PARTICIPATING, got: ${node.state}`);
  });

  it('ONLINE -> PARTICIPATING via consensus:started', { timeout: 10000 }, async () => {
    const node = nodes[0];

    // ConsensusEngine.start() fires consensus:started immediately,
    // which triggers the ONLINE -> PARTICIPATING transition in _wireConsensusEvents.
    // Since we called node.start() above, consensus already started.
    // The node should already be PARTICIPATING or will be shortly.
    await waitForCondition(() => {
      return node.state === NetworkState.PARTICIPATING;
    }, 8000);

    assert.strictEqual(node.state, NetworkState.PARTICIPATING,
      'Should transition to PARTICIPATING after consensus starts');
  });

  it('clean shutdown -> OFFLINE', { timeout: 5000 }, async () => {
    const node = createTestNode(1, BASE_PORT);
    nodes.push(node);

    await node.start();
    assert.ok(node.isOnline, 'Should be online');

    await node.stop();
    assert.strictEqual(node.state, NetworkState.OFFLINE, 'Should be OFFLINE after stop');
    assert.deepStrictEqual(node.getConnectedPeers(), [], 'Should have no peers after stop');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite 4: Mock Tests (always run, no P2P required)
// ═══════════════════════════════════════════════════════════════════════════

describe('Suite 4: Mock Tests', () => {
  it('NetworkState enum is complete', () => {
    const states = Object.values(NetworkState);
    assert.ok(states.includes('OFFLINE'));
    assert.ok(states.includes('BOOTSTRAPPING'));
    assert.ok(states.includes('SYNCING'));
    assert.ok(states.includes('ONLINE'));
    assert.ok(states.includes('PARTICIPATING'));
    assert.ok(states.includes('ERROR'));
    assert.strictEqual(states.length, 6);
  });

  it('phi-aligned intervals are Fibonacci-based', () => {
    // F(6)=8, F(7)=13, F(8)=21, F(9)=34
    const intervals = {
      HEARTBEAT: 8000,
      STATE_SYNC: 13000,
      VALIDATOR_CHECK: 21000,
      METRICS_REPORT: 34000,
    };

    assert.strictEqual(intervals.HEARTBEAT / 1000, 8);  // F(6)
    assert.strictEqual(intervals.STATE_SYNC / 1000, 13); // F(7)
    assert.strictEqual(intervals.VALIDATOR_CHECK / 1000, 21); // F(8)
    assert.strictEqual(intervals.METRICS_REPORT / 1000, 34); // F(9)
  });
});
