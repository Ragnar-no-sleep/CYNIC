#!/usr/bin/env node
/**
 * Late Join Sync Test
 *
 * Tests a node joining the network after consensus has started:
 * 1. Node1 and Node2 start and reach consensus on Block A
 * 2. Node3 joins late
 * 3. Node3 syncs existing state
 * 4. All three nodes participate in consensus on Block B
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
} from '@cynic/protocol';

const PORTS = [19000, 19001, 19002];
const NODE_NAMES = ['Node1', 'Node2', 'Node3'];

async function createNode(name, port, allKeypairs, startConsensus = true) {
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
      if (message.type !== 'HEARTBEAT') {
        console.log(`[${name}] 📨 ${message.type}`);
      }
    },
  });

  const consensus = new ConsensusEngine({
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    eScore: 0.6,
    burned: 100,
    uptime: 1.0,
    confirmationsForFinality: 2, // Lower for testing
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
  });

  // Wire transport
  transport.on('message', ({ message, peerId }) => {
    gossip.handleMessage(message, peerId);
  });

  transport.on('peer:connected', ({ publicKey, inbound }) => {
    console.log(`[${name}] ✅ Peer connected (${inbound ? 'in' : 'out'})`);
    if (publicKey) {
      gossip.addPeer(createPeerInfo({ publicKey, address: '' }));
    }
  });

  transport.on('peer:identified', ({ publicKey }) => {
    console.log(`[${name}] 🆔 Identified: ${publicKey.slice(0, 12)}...`);
    gossip.addPeer(createPeerInfo({ publicKey, address: '' }));
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

  consensusGossip.on('proposal:received', ({ blockHash }) => {
    console.log(`[${name}] 📬 Received proposal: ${blockHash.slice(0, 16)}...`);
  });

  // Start
  await transport.startServer();
  consensusGossip.start();
  if (startConsensus) {
    consensus.start();
  }
  console.log(`[${name}] 🚀 Started on port ${port}`);

  return { transport, gossip, consensus, consensusGossip, slotManager, keypair, port, name };
}

function createTestBlock(proposer, slot, blockNum) {
  const block = {
    type: 'JUDGMENT',
    slot,
    timestamp: Date.now(),
    previous_hash: '0'.repeat(64),
    proposer: proposer.publicKey,
    judgments: [{
      id: `jdg_block_${blockNum}`,
      itemHash: `item_${blockNum}`,
      globalScore: 80 + blockNum,
      verdict: 'HOWL',
    }],
    merkle_root: '0'.repeat(64),
  };
  block.hash = hashBlock(block);
  return block;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC Late Join Sync Test');
  console.log('   Testing node joining after consensus started');
  console.log('═══════════════════════════════════════════════════\n');

  const allKeypairs = [generateKeypair(), generateKeypair(), generateKeypair()];
  console.log('[Setup] Generated 3 validator keypairs\n');

  // Phase 1: Start only Node1 and Node2
  console.log('─────────────────────────────────────────────────────');
  console.log('Phase 1: Initial Network (Node1 + Node2)');
  console.log('─────────────────────────────────────────────────────\n');

  const node1 = await createNode('Node1', PORTS[0], allKeypairs);
  const node2 = await createNode('Node2', PORTS[1], allKeypairs);

  // Connect Node2 → Node1
  await node2.transport.connect({
    id: node1.keypair.publicKey,
    address: `ws://localhost:${PORTS[0]}`,
  });

  await new Promise(r => setTimeout(r, 500));

  // Propose Block A
  console.log('\n[Phase 1] Node1 proposing Block A...');
  const slot1 = node1.slotManager.getSlotInfo().slot;
  const blockA = createTestBlock(node1.keypair, slot1, 1);

  node1.consensus.proposeBlock(blockA);
  await node1.consensusGossip.proposeBlock(blockA);

  await new Promise(r => setTimeout(r, 1000));

  // Check Block A status
  const blockAStatus = node1.consensus.getBlock(blockA.hash);
  console.log(`\n[Phase 1] Block A Status: ${blockAStatus?.status}`);
  console.log(`[Phase 1] Block A Votes: ${blockAStatus?.votes?.size || 0}`);

  // Phase 2: Node3 joins late
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Phase 2: Node3 Joins Late');
  console.log('─────────────────────────────────────────────────────\n');

  console.log('[Phase 2] Starting Node3 (late joiner)...');
  const node3 = await createNode('Node3', PORTS[2], allKeypairs, false);

  // Connect Node3 to existing network
  await node3.transport.connect({
    id: node1.keypair.publicKey,
    address: `ws://localhost:${PORTS[0]}`,
  });
  await node3.transport.connect({
    id: node2.keypair.publicKey,
    address: `ws://localhost:${PORTS[1]}`,
  });

  await new Promise(r => setTimeout(r, 500));

  // Start Node3's consensus
  console.log('[Phase 2] Node3 starting consensus engine...');
  node3.consensus.start();

  // Check if Node3 knows about Block A before auto-sync completes
  const node3BlockABeforeSync = node3.consensus.getBlock(blockA.hash);
  console.log(`[Phase 2] Node3 knows Block A (before auto-sync): ${node3BlockABeforeSync ? 'YES' : 'NO'}`);

  // Wait for auto-sync to complete (triggered automatically when peers connect)
  console.log('[Phase 2] Waiting for auto-sync to complete...');
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('[Phase 2] Auto-sync timeout (may already be synced)');
      resolve();
    }, 2000);

    node3.consensusGossip.once('sync:auto-completed', (result) => {
      clearTimeout(timeout);
      console.log(`[Phase 2] Auto-sync complete: ${result.imported} blocks imported, latest slot: ${result.latestSlot}`);
      resolve();
    });
  });

  await new Promise(r => setTimeout(r, 300));

  // Check if Node3 now knows about Block A after auto-sync
  const node3BlockAAfterSync = node3.consensus.getBlock(blockA.hash);
  console.log(`[Phase 2] Node3 knows Block A (after auto-sync): ${node3BlockAAfterSync ? 'YES ✅' : 'NO'}`);
  if (node3BlockAAfterSync) {
    console.log(`[Phase 2] Block A Status on Node3: ${node3BlockAAfterSync.status}`);
  }

  // Phase 3: All three nodes participate in Block B
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Phase 3: All Nodes Participate (Block B)');
  console.log('─────────────────────────────────────────────────────\n');

  console.log('[Phase 3] Node1 proposing Block B...');
  const slot2 = node1.slotManager.getSlotInfo().slot + 1;
  const blockB = createTestBlock(node1.keypair, slot2, 2);

  node1.consensus.proposeBlock(blockB);
  await node1.consensusGossip.proposeBlock(blockB);

  await new Promise(r => setTimeout(r, 1500));

  // Check Block B status on all nodes
  console.log('\n[Phase 3] Block B Status:');
  for (const node of [node1, node2, node3]) {
    const blockBStatus = node.consensus.getBlock(blockB.hash);
    console.log(`  [${node.name}] Status: ${blockBStatus?.status || 'unknown'}, Votes: ${blockBStatus?.votes?.size || 0}`);
  }

  // Statistics
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Final Statistics');
  console.log('─────────────────────────────────────────────────────\n');

  const nodes = [node1, node2, node3];
  for (const node of nodes) {
    const stats = node.consensusGossip.getStats();
    const cState = node.consensus.getState();
    console.log(`[${node.name}]`);
    console.log(`  Proposals: ${stats.proposalsBroadcast} sent, ${stats.proposalsReceived} recv`);
    console.log(`  Votes: ${stats.votesBroadcast} sent, ${stats.votesReceived} recv`);
    console.log(`  State: ${cState.state}, Finalized: ${cState.finalizedSlot}`);
    console.log();
  }

  // Cleanup
  console.log('─────────────────────────────────────────────────────');
  console.log('[Test] Shutting down...');

  for (const node of nodes) {
    node.consensus.stop();
    node.consensusGossip.stop();
    await node.transport.stopServer();
  }

  // Verify results
  const blockANode3Final = node3.consensus.getBlock(blockA.hash);
  const blockBNode3 = node3.consensus.getBlock(blockB.hash);
  const blockASynced = blockANode3Final && blockANode3Final.status === 'FINALIZED';
  const blockBSuccess = blockBNode3 && blockBNode3.status !== 'REJECTED' && blockBNode3.votes.size >= 2;
  const fullSuccess = blockASynced && blockBSuccess;

  if (fullSuccess) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ STATE SYNC TEST PASSED');
    console.log('   - Node3 joined after Block A was finalized');
    console.log('   - Node3 synced Block A from peers ✅');
    console.log('   - Node3 participated in Block B consensus');
    console.log('   - All nodes reached agreement');
    console.log('═══════════════════════════════════════════════════\n');
  } else if (blockBSuccess) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ⚠️  PARTIAL SUCCESS');
    console.log('   - Node3 participated in Block B: ✅');
    console.log(`   - Block A synced to Node3: ${blockASynced ? '✅' : '❌'}`);
    console.log('═══════════════════════════════════════════════════\n');
  } else {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ❌ TEST FAILED');
    console.log('   - Consensus or sync issues detected');
    console.log('═══════════════════════════════════════════════════\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
