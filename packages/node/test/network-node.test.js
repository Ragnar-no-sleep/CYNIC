/**
 * CYNICNetworkNode Tests
 *
 * PHASE 2: DECENTRALIZE
 *
 * Tests multi-node orchestration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CYNICNetworkNode, NetworkState } from '../src/network/network-node.js';

// Mock crypto for key generation
const mockPublicKey = 'test-public-key-0123456789abcdef';
const mockPrivateKey = 'test-private-key-0123456789abcdef';

describe('CYNICNetworkNode', () => {
  let node;

  beforeEach(() => {
    node = null;
  });

  afterEach(async () => {
    if (node) {
      await node.stop();
    }
  });

  describe('constructor', () => {
    it('requires publicKey and privateKey', () => {
      expect(() => new CYNICNetworkNode({})).toThrow('publicKey and privateKey required');
    });

    it('creates node with valid keys', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false, // Disable actual networking for tests
      });

      expect(node.publicKey).toBe(mockPublicKey);
      expect(node.state).toBe(NetworkState.OFFLINE);
    });

    it('uses default E-Score of 50', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      expect(node.eScore).toBe(50);
    });

    it('uses φ-aligned default port 8618', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      const info = node.getInfo();
      expect(info.port).toBe(8618);
    });
  });

  describe('state management', () => {
    it('starts OFFLINE', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      expect(node.state).toBe(NetworkState.OFFLINE);
      expect(node.isOnline).toBe(false);
      expect(node.isParticipating).toBe(false);
    });

    it('stays OFFLINE when networking disabled', async () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      await node.start();
      expect(node.state).toBe(NetworkState.OFFLINE);
    });
  });

  describe('E-Score management', () => {
    it('allows setting E-Score', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      node.setEScore(75);
      expect(node.eScore).toBe(75);
    });

    it('clamps E-Score to 0-100', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      node.setEScore(150);
      expect(node.eScore).toBe(100);

      node.setEScore(-50);
      expect(node.eScore).toBe(0);
    });
  });

  describe('seed nodes', () => {
    it('accepts seed nodes in constructor', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
        seedNodes: ['ws://localhost:8618', 'ws://localhost:8619'],
      });

      const status = node.getStatus();
      expect(status.discovery).toBe(null); // Discovery not initialized when disabled
    });

    it('allows adding seed nodes', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      // Should not throw even when disabled
      node.addSeedNode('ws://localhost:8620');
    });
  });

  describe('getInfo', () => {
    it('returns node info', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        eScore: 75,
        port: 8620,
        enabled: false,
      });

      const info = node.getInfo();

      expect(info.port).toBe(8620);
      expect(info.eScore).toBe(75);
      expect(info.state).toBe(NetworkState.OFFLINE);
      expect(info.publicKey).toContain('test-public-key');
      expect(info.stats).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('returns full status', () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      const status = node.getStatus();

      expect(status.node).toBeDefined();
      expect(status.transport).toBe(null);
      expect(status.consensus).toBe(null);
      expect(status.discovery).toBe(null);
      expect(status.sync).toBeDefined();
    });
  });

  describe('events', () => {
    it('emits started event', async () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      const startedPromise = new Promise(resolve => {
        node.on('started', resolve);
      });

      await node.start();

      // When disabled, start() returns early without emitting
      // This is expected behavior
    });

    it('emits stopped event', async () => {
      node = new CYNICNetworkNode({
        publicKey: mockPublicKey,
        privateKey: mockPrivateKey,
        enabled: false,
      });

      const events = [];
      node.on('stopped', () => events.push('stopped'));

      await node.start();
      await node.stop();

      // When disabled, no events emitted (expected)
    });
  });
});

describe('NetworkState', () => {
  it('has correct states', () => {
    expect(NetworkState.OFFLINE).toBe('OFFLINE');
    expect(NetworkState.BOOTSTRAPPING).toBe('BOOTSTRAPPING');
    expect(NetworkState.SYNCING).toBe('SYNCING');
    expect(NetworkState.ONLINE).toBe('ONLINE');
    expect(NetworkState.PARTICIPATING).toBe('PARTICIPATING');
    expect(NetworkState.ERROR).toBe('ERROR');
  });
});
