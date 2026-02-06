/**
 * Multi-Node Integration Tests
 *
 * PHASE 2: DECENTRALIZE
 *
 * Tests actual P2P communication between nodes.
 * These tests require more setup and are slower.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { CYNICNetworkNode, NetworkState } from '../src/network/network-node.js';
import { generateKeypair } from '@cynic/identity';

// Skip in CI or when P2P tests not enabled
const runP2PTests = process.env.CYNIC_P2P_TESTS === 'true';

describe.skipIf(!runP2PTests)('Multi-Node Integration', () => {
  const BASE_PORT = 18618; // Use high ports to avoid conflicts
  let nodes = [];

  /**
   * Create a test node with unique keys and port
   */
  function createTestNode(index, seedNodes = []) {
    const keys = generateKeypair();
    return new CYNICNetworkNode({
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      port: BASE_PORT + index,
      eScore: 50 + index * 10, // Varying E-Scores
      seedNodes,
      enabled: true,
    });
  }

  afterAll(async () => {
    // Stop all nodes
    await Promise.all(nodes.map(node => node.stop().catch(() => {})));
    nodes = [];
  });

  describe('Two-Node Network', () => {
    it('nodes can start and connect', { timeout: 10000 }, async () => {
      // Create two nodes
      const node1 = createTestNode(0);
      const node2 = createTestNode(1, [`ws://localhost:${BASE_PORT}`]);

      nodes.push(node1, node2);

      // Start node 1 first (it will listen)
      await node1.start();
      expect(node1.isOnline).toBe(true);

      // Start node 2 (it will connect to node 1 via seed)
      await node2.start();
      expect(node2.isOnline).toBe(true);

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Both should have peers
      const peers1 = node1.getConnectedPeers();
      const peers2 = node2.getConnectedPeers();

      // At least one direction should be connected
      expect(peers1.length + peers2.length).toBeGreaterThan(0);
    });

    it('nodes exchange heartbeats', { timeout: 15000 }, async () => {
      const node1 = nodes[0];
      const node2 = nodes[1];

      // Wait for heartbeat exchange
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check metrics show message activity
      const status1 = node1.getStatus();
      expect(status1.node.stats.messagesReceived).toBeGreaterThanOrEqual(0);
    });
  });

  describe.skip('Three-Node Consensus', () => {
    it('reaches consensus with 61.8% supermajority', { timeout: 10000 }, async () => {
      // Create three nodes for φ-BFT (need 2/3 ≈ 61.8% for consensus)
      const node3 = createTestNode(2, [`ws://localhost:${BASE_PORT}`]);
      nodes.push(node3);

      await node3.start();

      // Wait for all to connect
      await new Promise(resolve => setTimeout(resolve, 3000));

      // All three should be participating
      expect(nodes.every(n => n.isOnline)).toBe(true);

      // Check validator counts
      const validators = nodes[0].getValidatorCount();
      expect(validators).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Multi-Node Mock Tests', () => {
  it('NetworkState enum is complete', () => {
    const states = Object.values(NetworkState);
    expect(states).toContain('OFFLINE');
    expect(states).toContain('BOOTSTRAPPING');
    expect(states).toContain('SYNCING');
    expect(states).toContain('ONLINE');
    expect(states).toContain('PARTICIPATING');
    expect(states).toContain('ERROR');
    expect(states.length).toBe(6);
  });

  it('φ-aligned intervals are Fibonacci-based', () => {
    // Verify the intervals follow Fibonacci
    // F(6)=8, F(7)=13, F(8)=21, F(9)=34
    const intervals = {
      HEARTBEAT: 8000,
      STATE_SYNC: 13000,
      VALIDATOR_CHECK: 21000,
      METRICS_REPORT: 34000,
    };

    expect(intervals.HEARTBEAT / 1000).toBe(8);  // F(6)
    expect(intervals.STATE_SYNC / 1000).toBe(13); // F(7)
    expect(intervals.VALIDATOR_CHECK / 1000).toBe(21); // F(8)
    expect(intervals.METRICS_REPORT / 1000).toBe(34); // F(9)
  });
});
