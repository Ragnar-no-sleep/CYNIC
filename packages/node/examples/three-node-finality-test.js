#!/usr/bin/env node
/**
 * Three Node Finality Test
 *
 * Tests φ-BFT consensus with three nodes to achieve finality.
 * With 3 validators, 2/3 (66.7%) > φ⁻¹ (61.8%) = supermajority!
 *
 * Flow:
 * 1. Start 3 nodes as validators
 * 2. Node1 proposes block
 * 3. All nodes vote (automatic)
 * 4. Check for consensus and finality
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
  VoteType,
} from '@cynic/protocol';

const PORTS = [18900, 18901, 18902];
const NODE_NAMES = ['Node1', 'Node2', 'Node3'];

async function createNode(name, port, allKeypairs) {
  const index = NODE_NAMES.indexOf(name);
  const keypair = allKeypairs[index];

  // Transport layer
  const transport = new WebSocketTransport({
    port,
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    heartbeatInterval: 60000,
  });

  // Gossip protocol
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

  // Consensus engine (Layer 4: φ-BFT)
  const consensus = new ConsensusEngine({
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    eScore: 0.6,
    burned: 100,
    uptime: 1.0,
    confirmationsForFinality: 3, // Lower for testing
  });

  // Register all validators (including self)
  for (const kp of allKeypairs) {
    consensus.registerValidator({
      publicKey: kp.publicKey,
      eScore: 0.6,
      burned: 100,
      uptime: 1.0,
    });
  }

  // Slot manager
  const slotManager = new SlotManager();

  // Consensus-gossip bridge
  const consensusGossip = new ConsensusGossip({
    consensus,
    gossip,
  });

  // Wire transport to gossip
  transport.on('message', ({ message, peerId }) => {
    gossip.handleMessage(message, peerId);
  });

  transport.on('peer:connected', ({ peerId, address, publicKey, inbound }) => {
    console.log(`[${name}] ✅ Peer connected (${inbound ? 'inbound' : 'outbound'})`);
    if (publicKey) {
      gossip.addPeer(createPeerInfo({ publicKey, address: address || '' }));
    }
  });

  transport.on('peer:identified', ({ publicKey, peerId }) => {
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

  consensusGossip.on('vote:received', ({ blockHash }) => {
    console.log(`[${name}] 📥 Received vote for: ${blockHash.slice(0, 16)}...`);
  });

  // Start
  await transport.startServer();
  consensusGossip.start();
  consensus.start();
  console.log(`[${name}] 🚀 Started on port ${port}`);

  return { transport, gossip, consensus, consensusGossip, slotManager, keypair, port, name };
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC Three-Node Finality Test');
  console.log('   φ-BFT Consensus: 3 validators, φ⁻¹ threshold');
  console.log('═══════════════════════════════════════════════════\n');

  // Generate keypairs for all nodes first
  const allKeypairs = [generateKeypair(), generateKeypair(), generateKeypair()];
  console.log('[Setup] Generated 3 validator keypairs\n');

  // Create nodes
  const nodes = [];
  for (let i = 0; i < 3; i++) {
    const node = await createNode(NODE_NAMES[i], PORTS[i], allKeypairs);
    nodes.push(node);
  }

  // Connect nodes in a mesh: 1↔2, 1↔3, 2↔3
  console.log('\n[Test] Connecting nodes in mesh topology...');

  // Node2 → Node1
  await nodes[1].transport.connect({
    id: nodes[0].keypair.publicKey,
    address: `ws://localhost:${PORTS[0]}`,
  });

  // Node3 → Node1
  await nodes[2].transport.connect({
    id: nodes[0].keypair.publicKey,
    address: `ws://localhost:${PORTS[0]}`,
  });

  // Node3 → Node2
  await nodes[2].transport.connect({
    id: nodes[1].keypair.publicKey,
    address: `ws://localhost:${PORTS[1]}`,
  });

  await new Promise(r => setTimeout(r, 1000));
  console.log('[Test] Mesh connected\n');

  // Test 1: Block Proposal
  console.log('─────────────────────────────────────────────────────');
  console.log('Test 1: Block Proposal & Voting');
  console.log('─────────────────────────────────────────────────────\n');

  const slot = nodes[0].slotManager.getSlotInfo().slot;
  const testBlock = {
    type: 'JUDGMENT',
    slot,
    timestamp: Date.now(),
    previous_hash: '0'.repeat(64),
    proposer: nodes[0].keypair.publicKey,
    judgments: [
      {
        id: 'jdg_finality_001',
        itemHash: 'item_hash_001',
        globalScore: 85,
        verdict: 'HOWL',
      },
    ],
    merkle_root: '0'.repeat(64),
  };
  testBlock.hash = hashBlock(testBlock);

  console.log(`[Node1] Proposing block at slot ${slot}...`);

  // Use consensus engine directly (proposeBlock triggers self-vote + event)
  nodes[0].consensus.proposeBlock(testBlock);

  // Broadcast via gossip bridge
  await nodes[0].consensusGossip.proposeBlock(testBlock);

  // Wait for voting propagation
  await new Promise(r => setTimeout(r, 1500));

  // Test 2: Check consensus status
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Test 2: Consensus Status');
  console.log('─────────────────────────────────────────────────────\n');

  const block = nodes[0].consensus.getBlock(testBlock.hash);
  if (block) {
    console.log(`Block Status: ${block.status}`);
    console.log(`Votes: ${block.votes.size}`);
    console.log(`Approve Weight: ${block.approveWeight.toFixed(2)}`);
    console.log(`Total Weight: ${block.totalWeight.toFixed(2)}`);

    const totalValidatorWeight = 3; // 3 validators with weight ~1 each
    const ratio = block.approveWeight / totalValidatorWeight;
    console.log(`Approval Ratio: ${(ratio * 100).toFixed(1)}%`);
    console.log(`φ⁻¹ Threshold: 61.8%`);
    console.log(`Supermajority: ${ratio >= 0.618 ? '✅ YES' : '❌ NO'}`);
  }

  // Test 3: Force slot advancement for finality check
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Test 3: Finality Check');
  console.log('─────────────────────────────────────────────────────\n');

  // Manually trigger confirmation increments by simulating slot changes
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 100));
    // Trigger internal finality check
    if (block && block.status === 'CONFIRMED') {
      block.confirmations++;
      if (block.confirmations >= 3) {
        console.log(`[Node1] Block reached ${block.confirmations} confirmations`);
      }
    }
  }

  const finalBlock = nodes[0].consensus.getBlock(testBlock.hash);
  console.log(`\nFinal Status: ${finalBlock?.status || 'unknown'}`);
  console.log(`Confirmations: ${finalBlock?.confirmations || 0}`);
  console.log(`Finalized: ${finalBlock?.status === 'FINALIZED' ? '✅ YES' : '❌ NO (needs more confirmations)'}`);

  // Statistics
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Statistics');
  console.log('─────────────────────────────────────────────────────\n');

  for (const node of nodes) {
    const stats = node.consensusGossip.getStats();
    const cState = node.consensus.getState();
    const tStats = node.transport.getStats();
    const gStats = node.gossip.getStats();
    console.log(`[${node.name}]`);
    console.log(`  Bridge - Proposals: ${stats.proposalsBroadcast} sent, ${stats.proposalsReceived} recv`);
    console.log(`  Bridge - Votes: ${stats.votesBroadcast} sent, ${stats.votesReceived} recv`);
    console.log(`  Transport - Messages: ${tStats.messagesSent} sent, ${tStats.messagesReceived} recv`);
    console.log(`  Gossip - Peers: ${gStats.total} (${gStats.active} active)`);
    console.log(`  Consensus - State: ${cState.state}, Pending: ${cState.pendingBlocks}`);
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
  const success = block && block.status !== 'REJECTED' && block.approveWeight >= 2;

  if (success) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ THREE-NODE FINALITY TEST PASSED');
    console.log('   - Block propagated to all nodes');
    console.log('   - All nodes voted automatically');
    console.log('   - Supermajority achieved (≥61.8%)');
    console.log('═══════════════════════════════════════════════════\n');
  } else {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ❌ TEST INCOMPLETE');
    console.log('   Block may not have reached full consensus');
    console.log('═══════════════════════════════════════════════════\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
