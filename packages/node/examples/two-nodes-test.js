#!/usr/bin/env node
/**
 * Two Nodes P2P Test
 *
 * Simple test demonstrating two CYNIC nodes exchanging messages
 */

import { WebSocketTransport } from '../src/transport/index.js';
import { GossipProtocol, generateKeypair, createPeerInfo } from '@cynic/protocol';

async function createNode(name, port) {
  const keypair = generateKeypair();

  const transport = new WebSocketTransport({
    port,
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    heartbeatInterval: 60000,
  });

  const gossip = new GossipProtocol({
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    address: `localhost:${port}`,
    sendFn: transport.getSendFn(),
    onMessage: (message) => {
      if (message.type !== 'HEARTBEAT') {
        console.log(`[${name}] 📨 Received: ${message.type} - score: ${message.payload?.globalScore || 'N/A'}`);
      }
    },
  });

  transport.on('message', ({ message, peerId }) => {
    gossip.handleMessage(message, peerId);
  });

  transport.on('peer:connected', ({ peerId, address }) => {
    console.log(`[${name}] ✅ Connected to peer`);
    gossip.addPeer(createPeerInfo({ publicKey: peerId, address }));
  });

  transport.on('peer:identified', ({ publicKey }) => {
    console.log(`[${name}] 🆔 Peer identified: ${publicKey.slice(0, 12)}...`);
  });

  await transport.startServer();
  console.log(`[${name}] 🚀 Started on port ${port}`);

  return { transport, gossip, keypair, port, name };
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC P2P Network Test - Two Nodes');
  console.log('═══════════════════════════════════════════════════\n');

  // Create two nodes
  const node1 = await createNode('Node1', 18700);
  const node2 = await createNode('Node2', 18701);

  // Connect node2 to node1
  console.log('\n[Test] Connecting Node2 → Node1...');
  await node2.transport.connect({
    id: node1.keypair.publicKey,
    address: 'ws://localhost:18700',
  });

  await new Promise(r => setTimeout(r, 500));

  // Send judgment from Node1
  console.log('\n[Test] Node1 broadcasting judgment...');
  const judgment1 = {
    id: `jdg_${Date.now()}`,
    item: { type: 'test', from: 'Node1' },
    globalScore: 85,
    verdict: 'HOWL',
    timestamp: Date.now(),
  };
  const sent1 = await node1.gossip.broadcastJudgment(judgment1);
  console.log(`[Node1] 📤 Sent judgment to ${sent1} peer(s)`);

  await new Promise(r => setTimeout(r, 300));

  // Send judgment from Node2
  console.log('\n[Test] Node2 broadcasting judgment...');
  const judgment2 = {
    id: `jdg_${Date.now()}`,
    item: { type: 'test', from: 'Node2' },
    globalScore: 42,
    verdict: 'GROWL',
    timestamp: Date.now(),
  };
  const sent2 = await node2.gossip.broadcastJudgment(judgment2);
  console.log(`[Node2] 📤 Sent judgment to ${sent2} peer(s)`);

  await new Promise(r => setTimeout(r, 300));

  // Stats
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Final Statistics');
  console.log('═══════════════════════════════════════════════════');

  const stats1 = node1.transport.getStats();
  const stats2 = node2.transport.getStats();

  console.log(`[Node1] Messages: sent=${stats1.messagesSent}, received=${stats1.messagesReceived}`);
  console.log(`[Node2] Messages: sent=${stats2.messagesSent}, received=${stats2.messagesReceived}`);

  // Cleanup
  console.log('\n[Test] Shutting down...');
  await node1.transport.stopServer();
  await node2.transport.stopServer();

  console.log('[Test] ✅ Test complete!\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
