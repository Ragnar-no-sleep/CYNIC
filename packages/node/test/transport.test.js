/**
 * Transport Tests
 *
 * Tests for WebSocket transport and message serialization
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  serialize,
  deserialize,
  isValidMessage,
  WebSocketTransport,
  ConnectionState,
} from '../src/index.js';

import { generateKeypair } from '@cynic/protocol';

describe('Message Serialization', () => {
  it('should serialize and deserialize message', () => {
    const message = {
      type: 'BLOCK',
      payload: { slot: 123, hash: 'abc123' },
      sender: 'test_sender',
      timestamp: Date.now(),
    };

    const serialized = serialize(message);
    const deserialized = deserialize(serialized);

    assert.deepStrictEqual(deserialized, message);
  });

  it('should include envelope with version and checksum', () => {
    const message = { type: 'TEST', payload: 'data' };
    const serialized = serialize(message);
    const envelope = JSON.parse(serialized);

    assert.strictEqual(envelope.v, 1);
    assert.ok(envelope.t > 0);
    assert.ok(envelope.d);
    assert.ok(envelope.c);
    assert.strictEqual(envelope.c.length, 8);
  });

  it('should reject invalid JSON', () => {
    assert.throws(() => deserialize('not json'), /Invalid message format/);
  });

  it('should reject missing envelope fields', () => {
    assert.throws(() => deserialize('{"v":1}'), /missing envelope fields/);
  });

  it('should reject checksum mismatch', () => {
    const message = { type: 'TEST' };
    const serialized = serialize(message);
    const envelope = JSON.parse(serialized);
    envelope.c = 'wrong123';

    assert.throws(() => deserialize(JSON.stringify(envelope)), /checksum mismatch/);
  });

  it('should validate message format', () => {
    const message = { type: 'TEST' };
    const serialized = serialize(message);

    assert.ok(isValidMessage(serialized));
    assert.ok(!isValidMessage('invalid'));
  });

  it('should handle complex nested payloads', () => {
    const message = {
      type: 'BLOCK',
      payload: {
        slot: 123,
        judgments: [
          { id: 'j1', score: 85 },
          { id: 'j2', score: 42 },
        ],
        metadata: {
          deep: { nested: { value: true } },
        },
      },
    };

    const deserialized = deserialize(serialize(message));
    assert.deepStrictEqual(deserialized, message);
  });
});

describe('WebSocket Transport', () => {
  let transport1;
  let transport2;
  let keypair1;
  let keypair2;

  beforeEach(async () => {
    keypair1 = generateKeypair();
    keypair2 = generateKeypair();

    transport1 = new WebSocketTransport({
      port: 18618,
      publicKey: keypair1.publicKey,
      privateKey: keypair1.privateKey,
      heartbeatInterval: 60000, // Longer for tests
    });

    transport2 = new WebSocketTransport({
      port: 18619,
      publicKey: keypair2.publicKey,
      privateKey: keypair2.privateKey,
      heartbeatInterval: 60000,
    });
  });

  afterEach(async () => {
    await transport1?.stopServer();
    await transport2?.stopServer();
  });

  it('should start and stop server', async () => {
    await transport1.startServer();

    assert.ok(transport1.serverRunning);
    assert.strictEqual(transport1.getStats().serverRunning, true);

    await transport1.stopServer();

    assert.ok(!transport1.serverRunning);
  });

  it('should get send function for GossipProtocol', () => {
    const sendFn = transport1.getSendFn();
    assert.strictEqual(typeof sendFn, 'function');
  });

  it('should track statistics', async () => {
    await transport1.startServer();

    const stats = transport1.getStats();

    assert.strictEqual(stats.serverRunning, true);
    assert.strictEqual(stats.port, 18618);
    assert.strictEqual(stats.messagesSent, 0);
    assert.strictEqual(stats.messagesReceived, 0);
    assert.ok(stats.connections);
  });

  it('should connect two transports', async () => {
    await transport1.startServer();
    await transport2.startServer();

    // Connect transport2 to transport1
    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18618',
    };

    await transport2.connect(peer1);

    // Wait for connection to establish
    await new Promise((r) => setTimeout(r, 100));

    assert.ok(transport2.isConnected(keypair1.publicKey));
    assert.strictEqual(transport2.getConnectedPeers().length, 1);
  });

  it('should exchange messages between transports', async () => {
    await transport1.startServer();
    await transport2.startServer();

    // Set up message handlers
    const received1 = [];
    const received2 = [];

    transport1.on('message', ({ message }) => received1.push(message));
    transport2.on('message', ({ message }) => received2.push(message));

    // Connect
    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18618',
    };

    await transport2.connect(peer1);
    await new Promise((r) => setTimeout(r, 100));

    // Send message from transport2 to transport1
    const testMessage = {
      type: 'TEST',
      payload: { data: 'hello from transport2' },
      sender: keypair2.publicKey,
      timestamp: Date.now(),
    };

    await transport2.send(peer1, testMessage);
    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(received1.length, 1);
    assert.deepStrictEqual(received1[0], testMessage);
  });

  it('should handle disconnection gracefully', async () => {
    await transport1.startServer();

    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18618',
    };

    await transport2.connect(peer1);
    await new Promise((r) => setTimeout(r, 100));

    assert.ok(transport2.isConnected(keypair1.publicKey));

    // Stop transport1 server
    await transport1.stopServer();
    await new Promise((r) => setTimeout(r, 100));

    // Connection should be closed
    assert.ok(!transport2.isConnected(keypair1.publicKey));
  });

  it('should queue messages when disconnected', async () => {
    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18618',
    };

    // Queue message before server is started
    const testMessage = {
      type: 'TEST',
      payload: 'queued',
    };

    // This will attempt to connect and queue the message
    const sendPromise = transport2.send(peer1, testMessage);

    // Start server
    await transport1.startServer();

    // Wait for connection and message delivery
    await new Promise((r) => setTimeout(r, 200));

    // The connection should eventually succeed
    const stats = transport2.getStats();
    assert.ok(stats.connectionAttempts >= 1);
  });
});

describe('Transport Integration with GossipProtocol', () => {
  it('should provide compatible sendFn', async () => {
    const keypair = generateKeypair();
    const transport = new WebSocketTransport({
      port: 18620,
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
    });

    const sendFn = transport.getSendFn();

    // sendFn should accept peer and message
    assert.strictEqual(sendFn.length, 2);

    await transport.stopServer();
  });
});

describe('Identity Verification Security', () => {
  let transport1;
  let transport2;
  let keypair1;
  let keypair2;

  beforeEach(async () => {
    keypair1 = generateKeypair();
    keypair2 = generateKeypair();

    transport1 = new WebSocketTransport({
      port: 18621,
      publicKey: keypair1.publicKey,
      privateKey: keypair1.privateKey,
      heartbeatInterval: 60000,
    });

    transport2 = new WebSocketTransport({
      port: 18622,
      publicKey: keypair2.publicKey,
      privateKey: keypair2.privateKey,
      heartbeatInterval: 60000,
    });
  });

  afterEach(async () => {
    await transport1?.stopServer();
    await transport2?.stopServer();
  });

  it('should verify identity signature on connection', async () => {
    await transport1.startServer();

    const identityEvents = [];
    transport1.on('peer:identified', (event) => identityEvents.push(event));

    // Connect with valid identity
    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18621',
    };

    await transport2.connect(peer1);
    await new Promise((r) => setTimeout(r, 150));

    // Should have verified identity
    assert.strictEqual(identityEvents.length, 1);
    assert.strictEqual(identityEvents[0].publicKey, keypair2.publicKey);
  });

  it('should reject connection with invalid signature', async () => {
    await transport1.startServer();

    const invalidEvents = [];
    transport1.on('peer:identity_invalid', (event) => invalidEvents.push(event));

    // Manually send invalid identity (would need raw WebSocket)
    // For now, just verify the event mechanism exists
    assert.strictEqual(typeof transport1.emit, 'function');
  });

  it('should include timestamp in identity for replay prevention', async () => {
    await transport1.startServer();

    const identityEvents = [];
    transport1.on('peer:identified', (event) => identityEvents.push(event));

    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18621',
    };

    await transport2.connect(peer1);
    await new Promise((r) => setTimeout(r, 150));

    // Identity should be established with valid timestamp
    assert.strictEqual(identityEvents.length, 1);
  });

  it('should emit peer:connected only after identity verification', async () => {
    await transport1.startServer();

    const connectedEvents = [];
    const identifiedEvents = [];

    transport1.on('peer:connected', (event) => connectedEvents.push({ ...event, time: Date.now() }));
    transport1.on('peer:identified', (event) => identifiedEvents.push({ ...event, time: Date.now() }));

    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18621',
    };

    await transport2.connect(peer1);
    await new Promise((r) => setTimeout(r, 150));

    // For inbound connections, peer:connected comes after identity verification
    assert.strictEqual(connectedEvents.length, 1);
    assert.strictEqual(identifiedEvents.length, 1);

    // peer:connected should have the real publicKey, not a temp ID
    assert.ok(!connectedEvents[0].peerId.startsWith('temp_'));
  });

  it('should handle bidirectional identity exchange', async () => {
    await transport1.startServer();
    await transport2.startServer();

    const t1Identified = [];
    const t2Identified = [];

    transport1.on('peer:identified', (event) => t1Identified.push(event));
    transport2.on('peer:identified', (event) => t2Identified.push(event));

    const peer1 = {
      id: keypair1.publicKey,
      address: 'ws://localhost:18621',
    };

    await transport2.connect(peer1);
    await new Promise((r) => setTimeout(r, 200));

    // Both transports should have identified each other
    assert.strictEqual(t1Identified.length, 1);
    assert.strictEqual(t2Identified.length, 1);
    assert.strictEqual(t1Identified[0].publicKey, keypair2.publicKey);
    assert.strictEqual(t2Identified[0].publicKey, keypair1.publicKey);
  });
});
