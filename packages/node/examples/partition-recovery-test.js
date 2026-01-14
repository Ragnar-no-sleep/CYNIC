#!/usr/bin/env node
/**
 * Network Partition Recovery Test
 *
 * Tests φ-BFT consensus behavior during network partitions:
 * 1. Three nodes establish consensus on Block A
 * 2. Node3 gets partitioned (disconnected)
 * 3. Node1+Node2 continue consensus (66.7% > 61.8%)
 * 4. Node3 operates in isolation (cannot reach consensus alone)
 * 5. Network heals - Node3 reconnects
 * 6. Node3 syncs missed blocks and rejoins consensus
 */

import { WebSocketTransport } from '../src/transport/index.js';
import {
  GossipProtocol,
  generateKeypair,
  createPeerInfo,
  ConsensusEngine,
  ConsensusGossip,
  SlotManager,
  hashBlock,
  phiSaltedHash,
} from '@cynic/protocol';

const PORTS = [22000, 22001, 22002];
const NODE_NAMES = ['Node1', 'Node2', 'Node3'];

async function createNode(name, port, allKeypairs) {
  const index = NODE_NAMES.indexOf(name);
  const keypair = allKeypairs[index];

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
      // Quiet
    },
  });

  const consensus = new ConsensusEngine({
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    eScore: 0.6,
    burned: 100,
    uptime: 1.0,
    confirmationsForFinality: 2,
  });

  // Register all validators
  for (const kp of allKeypairs) {
    consensus.registerValidator({
      publicKey: kp.publicKey,
      eScore: 0.6,
      burned: 100,
      uptime: 1.0,
    });
  }

  const slotManager = new SlotManager();

  const consensusGossip = new ConsensusGossip({
    consensus,
    gossip,
    autoSync: true,
    syncDelayMs: 300,
  });

  // Wire transport
  transport.on('message', ({ message, peerId }) => {
    gossip.handleMessage(message, peerId);
  });

  transport.on('peer:connected', ({ publicKey }) => {
    if (publicKey) {
      gossip.addPeer(createPeerInfo({ publicKey, address: '' }));
    }
  });

  transport.on('peer:identified', ({ publicKey }) => {
    gossip.addPeer(createPeerInfo({ publicKey, address: '' }));
  });

  transport.on('peer:disconnected', ({ publicKey }) => {
    if (publicKey) {
      gossip.peerManager.removePeer(publicKey);
    }
  });

  // Wire consensus events
  consensus.on('block:proposed', (event) => {
    console.log(`[${name}] 📦 Proposed: ${event.blockHash.slice(0, 16)}...`);
  });

  consensus.on('vote:cast', (event) => {
    console.log(`[${name}] 🗳️  Voted ${event.decision} on ${event.blockHash.slice(0, 16)}...`);
  });

  consensus.on('block:confirmed', (event) => {
    console.log(`[${name}] ✓ CONFIRMED: ${event.blockHash.slice(0, 16)}... (${(event.ratio * 100).toFixed(1)}%)`);
  });

  consensus.on('block:finalized', (event) => {
    console.log(`[${name}] ✨ FINALIZED: ${event.blockHash.slice(0, 16)}...`);
  });

  consensusGossip.on('sync:auto-completed', (result) => {
    console.log(`[${name}] 🔄 Auto-synced: ${result.imported} blocks, slot ${result.latestSlot}`);
  });

  await transport.startServer();
  consensusGossip.start();
  consensus.start();

  return { transport, gossip, consensus, consensusGossip, slotManager, keypair, port, name };
}

function createTestBlock(proposer, slot, blockNum, prevHash = '0'.repeat(64)) {
  const block = {
    type: 'JUDGMENT',
    slot,
    timestamp: Date.now(),
    previous_hash: prevHash,
    proposer: proposer.publicKey,
    judgments: [{
      id: `jdg_partition_${blockNum}`,
      itemHash: `item_${blockNum}`,
      globalScore: 70 + blockNum,
      verdict: 'HOWL',
    }],
    merkle_root: '0'.repeat(64),
  };
  block.hash = hashBlock(block);
  return block;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC Network Partition Recovery Test');
  console.log('   φ-BFT Resilience During Network Splits');
  console.log('═══════════════════════════════════════════════════\n');

  const allKeypairs = [generateKeypair(), generateKeypair(), generateKeypair()];

  // Create all nodes
  const node1 = await createNode('Node1', PORTS[0], allKeypairs);
  const node2 = await createNode('Node2', PORTS[1], allKeypairs);
  const node3 = await createNode('Node3', PORTS[2], allKeypairs);
  const nodes = [node1, node2, node3];

  console.log('[Node1] 🚀 Started on port 22000');
  console.log('[Node2] 🚀 Started on port 22001');
  console.log('[Node3] 🚀 Started on port 22002\n');

  // Connect mesh
  await node2.transport.connect({ id: node1.keypair.publicKey, address: `ws://localhost:${PORTS[0]}` });
  await node3.transport.connect({ id: node1.keypair.publicKey, address: `ws://localhost:${PORTS[0]}` });
  await node3.transport.connect({ id: node2.keypair.publicKey, address: `ws://localhost:${PORTS[1]}` });
  await new Promise(r => setTimeout(r, 500));
  console.log('[Setup] Mesh connected\n');

  const testResults = {
    prePartitionConsensus: false,
    majorityConsensus: false,
    minorityStalled: false,
    postHealSync: false,
    postHealConsensus: false,
  };

  // ═══════════════════════════════════════════════════════════════
  // Phase 1: Pre-partition consensus
  // ═══════════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────────');
  console.log('Phase 1: Pre-Partition Consensus (All Connected)');
  console.log('─────────────────────────────────────────────────────\n');

  const slot1 = node1.slotManager.getSlotInfo().slot;
  const blockA = createTestBlock(node1.keypair, slot1, 1);

  console.log('[Phase 1] Node1 proposing Block A...');
  node1.consensus.proposeBlock(blockA);
  await node1.consensusGossip.proposeBlock(blockA);

  await new Promise(r => setTimeout(r, 1000));

  // Check all nodes have Block A
  const blockAStatus = nodes.map(n => ({
    name: n.name,
    status: n.consensus.getBlock(blockA.hash)?.status,
    votes: n.consensus.getBlock(blockA.hash)?.votes?.size || 0,
  }));

  console.log('\n[Phase 1] Block A Status:');
  for (const s of blockAStatus) {
    console.log(`  [${s.name}] ${s.status}, votes: ${s.votes}`);
  }

  testResults.prePartitionConsensus = blockAStatus.every(s =>
    s.status === 'CONFIRMED' || s.status === 'FINALIZED'
  );
  console.log(`\n[Result] Pre-partition consensus: ${testResults.prePartitionConsensus ? '✅' : '❌'}`);

  // ═══════════════════════════════════════════════════════════════
  // Phase 2: Network Partition (Node3 isolated)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Phase 2: Network Partition (Node3 Isolated)');
  console.log('─────────────────────────────────────────────────────\n');

  console.log('[Partition] Disconnecting Node3 from network...');

  // Get correct peer IDs (phiSaltedHash of publicKey)
  const node1PeerId = phiSaltedHash(node1.keypair.publicKey);
  const node2PeerId = phiSaltedHash(node2.keypair.publicKey);
  const node3PeerId = phiSaltedHash(node3.keypair.publicKey);

  // Disconnect Node3 from both Node1 and Node2 at transport layer
  node3.transport.disconnect(node1.keypair.publicKey);
  node3.transport.disconnect(node2.keypair.publicKey);

  // Also remove from gossip peer managers using correct peer IDs
  node3.gossip.peerManager.removePeer(node1PeerId);
  node3.gossip.peerManager.removePeer(node2PeerId);
  node1.gossip.peerManager.removePeer(node3PeerId);
  node2.gossip.peerManager.removePeer(node3PeerId);

  await new Promise(r => setTimeout(r, 300));

  const node1Peers = node1.gossip.peerManager.getActivePeers().length;
  const node2Peers = node2.gossip.peerManager.getActivePeers().length;
  const node3Peers = node3.gossip.peerManager.getActivePeers().length;

  console.log(`[Partition] Node1 peers: ${node1Peers}, Node2 peers: ${node2Peers}, Node3 peers: ${node3Peers}`);
  console.log('[Partition] Node3 is now isolated\n');

  // ═══════════════════════════════════════════════════════════════
  // Phase 3: Majority partition consensus (Node1 + Node2)
  // ═══════════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────────');
  console.log('Phase 3: Majority Partition Consensus (Node1 + Node2)');
  console.log('─────────────────────────────────────────────────────\n');

  const slot2 = node1.slotManager.getSlotInfo().slot + 1;
  const blockB = createTestBlock(node1.keypair, slot2, 2, blockA.hash);

  console.log('[Phase 3] Node1 proposing Block B (during partition)...');
  node1.consensus.proposeBlock(blockB);
  await node1.consensusGossip.proposeBlock(blockB);

  await new Promise(r => setTimeout(r, 1000));

  // Check majority partition status
  const n1BlockB = node1.consensus.getBlock(blockB.hash);
  const n2BlockB = node2.consensus.getBlock(blockB.hash);
  const n3BlockB = node3.consensus.getBlock(blockB.hash);

  console.log('\n[Phase 3] Block B Status:');
  console.log(`  [Node1] ${n1BlockB?.status || 'unknown'}, votes: ${n1BlockB?.votes?.size || 0}`);
  console.log(`  [Node2] ${n2BlockB?.status || 'unknown'}, votes: ${n2BlockB?.votes?.size || 0}`);
  console.log(`  [Node3] ${n3BlockB ? n3BlockB.status : 'NOT RECEIVED'}`);

  // With 2/3 validators (66.7%), majority should reach consensus
  testResults.majorityConsensus =
    (n1BlockB?.status === 'CONFIRMED' || n1BlockB?.status === 'FINALIZED') &&
    (n2BlockB?.status === 'CONFIRMED' || n2BlockB?.status === 'FINALIZED');

  // Node3 should not have received Block B
  testResults.minorityStalled = !n3BlockB;

  console.log(`\n[Result] Majority consensus: ${testResults.majorityConsensus ? '✅' : '❌'}`);
  console.log(`[Result] Minority stalled: ${testResults.minorityStalled ? '✅' : '❌'}`);

  // ═══════════════════════════════════════════════════════════════
  // Phase 4: Network Heal (Reconnect Node3)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Phase 4: Network Heal (Reconnect Node3)');
  console.log('─────────────────────────────────────────────────────\n');

  console.log('[Heal] Reconnecting Node3 to network...');

  // Reset Node3's synced state to allow re-sync
  node3.consensusGossip.synced = false;

  // Reconnect Node3
  await node3.transport.connect({ id: node1.keypair.publicKey, address: `ws://localhost:${PORTS[0]}` });
  await node3.transport.connect({ id: node2.keypair.publicKey, address: `ws://localhost:${PORTS[1]}` });

  await new Promise(r => setTimeout(r, 500));

  const node3PeersAfter = node3.gossip.peerManager.getActivePeers().length;
  console.log(`[Heal] Node3 peers after reconnect: ${node3PeersAfter}`);

  // Wait for auto-sync
  console.log('[Heal] Waiting for Node3 to sync...');
  await new Promise(r => setTimeout(r, 1500));

  // Check if Node3 synced Block B
  const n3BlockBAfter = node3.consensus.getBlock(blockB.hash);
  console.log(`\n[Phase 4] Node3 Block B status after heal: ${n3BlockBAfter?.status || 'NOT FOUND'}`);

  testResults.postHealSync = n3BlockBAfter &&
    (n3BlockBAfter.status === 'CONFIRMED' || n3BlockBAfter.status === 'FINALIZED');

  console.log(`[Result] Post-heal sync: ${testResults.postHealSync ? '✅' : '❌'}`);

  // ═══════════════════════════════════════════════════════════════
  // Phase 5: Post-heal consensus (All nodes)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Phase 5: Post-Heal Consensus (All Nodes)');
  console.log('─────────────────────────────────────────────────────\n');

  const slot3 = node1.slotManager.getSlotInfo().slot + 2;
  const blockC = createTestBlock(node1.keypair, slot3, 3, blockB.hash);

  console.log('[Phase 5] Node1 proposing Block C (all reconnected)...');
  node1.consensus.proposeBlock(blockC);
  await node1.consensusGossip.proposeBlock(blockC);

  await new Promise(r => setTimeout(r, 1000));

  // Check all nodes
  const blockCStatus = nodes.map(n => ({
    name: n.name,
    status: n.consensus.getBlock(blockC.hash)?.status,
    votes: n.consensus.getBlock(blockC.hash)?.votes?.size || 0,
  }));

  console.log('\n[Phase 5] Block C Status:');
  for (const s of blockCStatus) {
    console.log(`  [${s.name}] ${s.status}, votes: ${s.votes}`);
  }

  testResults.postHealConsensus = blockCStatus.every(s =>
    s.status === 'CONFIRMED' || s.status === 'FINALIZED'
  );

  console.log(`\n[Result] Post-heal consensus: ${testResults.postHealConsensus ? '✅' : '❌'}`);

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Partition Recovery Summary');
  console.log('─────────────────────────────────────────────────────\n');

  console.log(`Pre-partition consensus:   ${testResults.prePartitionConsensus ? '✅' : '❌'}`);
  console.log(`Majority during partition: ${testResults.majorityConsensus ? '✅' : '❌'}`);
  console.log(`Minority stalled:          ${testResults.minorityStalled ? '✅' : '❌'}`);
  console.log(`Post-heal sync:            ${testResults.postHealSync ? '✅' : '❌'}`);
  console.log(`Post-heal consensus:       ${testResults.postHealConsensus ? '✅' : '❌'}`);

  // Cleanup
  console.log('\n─────────────────────────────────────────────────────');
  console.log('[Test] Shutting down...');

  for (const node of nodes) {
    node.consensus.stop();
    node.consensusGossip.stop();
    await node.transport.stopServer();
  }

  // Final result
  const allPassed = Object.values(testResults).every(v => v);

  if (allPassed) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ PARTITION RECOVERY TEST PASSED');
    console.log('   - Pre-partition: all nodes reach consensus');
    console.log('   - During partition: majority continues (φ⁻¹)');
    console.log('   - During partition: minority stalls correctly');
    console.log('   - Post-heal: isolated node syncs missed blocks');
    console.log('   - Post-heal: all nodes reach consensus again');
    console.log('═══════════════════════════════════════════════════\n');
  } else {
    const passed = Object.values(testResults).filter(v => v).length;
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`   ⚠️  PARTIAL SUCCESS (${passed}/5 tests passed)`);
    console.log('   Network partition handling may need improvements');
    console.log('═══════════════════════════════════════════════════\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
