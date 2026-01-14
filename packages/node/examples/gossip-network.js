#!/usr/bin/env node
/**
 * CYNIC Gossip Network Example
 *
 * Demonstrates peer-to-peer gossip communication using WebSocket transport
 *
 * Usage:
 *   node examples/gossip-network.js server 8618
 *   node examples/gossip-network.js client ws://localhost:8618
 *
 * @example
 * // Terminal 1 - Start first node
 * node examples/gossip-network.js server 8618
 *
 * // Terminal 2 - Start second node and connect
 * node examples/gossip-network.js client ws://localhost:8618
 */

import { WebSocketTransport } from '../src/transport/index.js';
import { GossipProtocol, generateKeypair, createPeerInfo } from '@cynic/protocol';

const [,, mode, arg] = process.argv;

async function main() {
  // Generate identity
  const keypair = generateKeypair();
  console.log(`🔑 Node ID: ${keypair.publicKey.slice(0, 16)}...`);

  // Determine port
  const port = mode === 'server' ? parseInt(arg) || 8618 : 8619 + Math.floor(Math.random() * 1000);

  // Create transport
  const transport = new WebSocketTransport({
    port,
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    heartbeatInterval: 10000, // 10s for demo
  });

  // Create gossip protocol
  const gossip = new GossipProtocol({
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    address: `localhost:${port}`,
    sendFn: transport.getSendFn(),
    onMessage: (message) => {
      console.log(`📨 Received ${message.type}:`, JSON.stringify(message.payload).slice(0, 100));
    },
  });

  // Wire transport to gossip
  transport.on('message', ({ message, peerId }) => {
    gossip.handleMessage(message, peerId);
  });

  transport.on('peer:connected', ({ peerId, address }) => {
    console.log(`✅ Peer connected: ${peerId?.slice(0, 16)}... from ${address}`);
    gossip.addPeer(createPeerInfo({
      publicKey: peerId,
      address,
    }));
  });

  transport.on('peer:disconnected', ({ peerId }) => {
    console.log(`❌ Peer disconnected: ${peerId?.slice(0, 16)}...`);
    gossip.removePeer(peerId);
  });

  transport.on('peer:identified', ({ peerId, publicKey }) => {
    console.log(`🆔 Peer identified: ${publicKey.slice(0, 16)}...`);
  });

  // Start server
  await transport.startServer();
  console.log(`🚀 CYNIC node listening on port ${port}`);

  // Connect to peer if client mode
  if (mode === 'client' && arg) {
    console.log(`📡 Connecting to ${arg}...`);

    const peer = {
      id: 'remote_peer', // Will be replaced after identity exchange
      address: arg,
    };

    try {
      await transport.connect(peer);
      console.log('✅ Connected to peer');
    } catch (err) {
      console.error('❌ Connection failed:', err.message);
    }
  }

  // Demo: Broadcast a judgment periodically
  setInterval(async () => {
    const judgment = {
      id: `jdg_${Date.now()}`,
      item: { type: 'demo', data: 'test' },
      globalScore: Math.round(Math.random() * 100),
      verdict: 'WAG',
      timestamp: Date.now(),
    };

    const sent = await gossip.broadcastJudgment(judgment);
    if (sent > 0) {
      console.log(`📤 Broadcast judgment to ${sent} peers (score: ${judgment.globalScore})`);
    }
  }, 5000);

  // Stats every 30s
  setInterval(() => {
    const stats = transport.getStats();
    const gossipStats = gossip.getStats();
    console.log('📊 Stats:', {
      connections: stats.connections.connected,
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      peers: gossipStats.total,
    });
  }, 30000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await transport.stopServer();
    process.exit(0);
  });

  console.log('\n💡 Commands:');
  console.log('   - Press Ctrl+C to exit');
  console.log('   - Judgments broadcast every 5 seconds');
  console.log('   - Stats shown every 30 seconds\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
