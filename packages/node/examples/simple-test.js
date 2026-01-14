#!/usr/bin/env node
/**
 * Simple P2P Test - Minimal version
 */

import { WebSocketTransport } from '../src/transport/index.js';
import { generateKeypair } from '@cynic/protocol';

async function main() {
  console.log('=== Simple P2P Test ===\n');

  const key1 = generateKeypair();
  const key2 = generateKeypair();

  // Node 1 - Server only, no auto-reconnect
  const transport1 = new WebSocketTransport({
    port: 19700,
    publicKey: key1.publicKey,
    privateKey: key1.privateKey,
    heartbeatInterval: 300000, // 5 min - effectively disabled
  });

  // Node 2 - Client only
  const transport2 = new WebSocketTransport({
    port: 19701,
    publicKey: key2.publicKey,
    privateKey: key2.privateKey,
    heartbeatInterval: 300000,
  });

  // Set up message handlers
  transport1.on('message', ({ message }) => {
    console.log('[Node1] Got message:', message.type);
  });
  transport2.on('message', ({ message }) => {
    console.log('[Node2] Got message:', message.type);
  });

  transport1.on('peer:connected', () => console.log('[Node1] Peer connected'));
  transport2.on('peer:connected', () => console.log('[Node2] Peer connected'));
  transport1.on('peer:identified', ({ publicKey }) => console.log('[Node1] Peer identified:', publicKey.slice(0,12)));
  transport2.on('peer:identified', ({ publicKey }) => console.log('[Node2] Peer identified:', publicKey.slice(0,12)));
  transport1.on('peer:disconnected', () => console.log('[Node1] Peer disconnected'));
  transport2.on('peer:disconnected', () => console.log('[Node2] Peer disconnected'));
  transport1.on('peer:reconnecting', () => console.log('[Node1] Reconnecting...'));
  transport2.on('peer:reconnecting', () => console.log('[Node2] Reconnecting...'));

  // Start server on Node1 only
  await transport1.startServer();
  console.log('[Node1] Server started on 19700');

  // Connect Node2 to Node1
  console.log('[Node2] Connecting to Node1...');
  await transport2.connect({
    id: 'node1',
    address: 'ws://localhost:19700',
  });
  console.log('[Node2] Connected!');

  // Wait a bit
  await new Promise(r => setTimeout(r, 500));

  // Send message from Node2 to Node1
  console.log('\n[Test] Sending message from Node2...');
  await transport2.send({ id: 'node1', address: 'ws://localhost:19700' }, {
    type: 'TEST',
    payload: { hello: 'world' },
    timestamp: Date.now(),
  });

  await new Promise(r => setTimeout(r, 300));

  // Stats
  console.log('\n=== Stats ===');
  console.log('[Node1]', transport1.getStats().connections);
  console.log('[Node2]', transport2.getStats().connections);

  // Cleanup
  console.log('\n[Test] Cleaning up...');
  await transport1.stopServer();
  await transport2.stopServer();
  console.log('[Test] Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
