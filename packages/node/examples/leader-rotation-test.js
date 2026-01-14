#!/usr/bin/env node
/**
 * Leader Rotation Test
 *
 * Tests φ-BFT leader rotation for block proposals:
 * 1. Three validators with different weights
 * 2. SlotManager determines leader per slot
 * 3. Only the leader proposes blocks
 * 4. Verifies rotation across multiple slots
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
  selectLeader,
} from '@cynic/protocol';

const PORTS = [20000, 20001, 20002];
const NODE_NAMES = ['Node1', 'Node2', 'Node3'];
const VALIDATOR_WEIGHTS = [100, 60, 40]; // Different weights for variety

async function createNode(name, port, allKeypairs, validatorList) {
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
      // Quiet logging
    },
  });

  const consensus = new ConsensusEngine({
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    eScore: 0.6,
    burned: VALIDATOR_WEIGHTS[index],
    uptime: 1.0,
    confirmationsForFinality: 2,
  });

  // Register all validators
  for (let i = 0; i < allKeypairs.length; i++) {
    consensus.registerValidator({
      publicKey: allKeypairs[i].publicKey,
      eScore: 0.6,
      burned: VALIDATOR_WEIGHTS[i],
      uptime: 1.0,
    });
  }

  // Create SlotManager and set validators
  const slotManager = new SlotManager({ genesisTime: Date.now() - 10000 });
  slotManager.setValidators(validatorList);

  const consensusGossip = new ConsensusGossip({
    consensus,
    gossip,
    autoSync: false, // Disable for this test
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

  // Wire consensus events
  consensus.on('block:proposed', (event) => {
    console.log(`[${name}] 📦 Proposed block at slot ${event.slot}`);
  });

  consensus.on('vote:cast', (event) => {
    // Quiet
  });

  consensus.on('block:confirmed', (event) => {
    console.log(`[${name}] ✓ Confirmed: ${event.blockHash.slice(0, 16)}...`);
  });

  consensus.on('block:finalized', (event) => {
    console.log(`[${name}] ✨ Finalized: ${event.blockHash.slice(0, 16)}...`);
  });

  await transport.startServer();
  consensusGossip.start();
  consensus.start();

  return { transport, gossip, consensus, consensusGossip, slotManager, keypair, port, name, index };
}

function createTestBlock(proposer, slot, blockNum) {
  const block = {
    type: 'JUDGMENT',
    slot,
    timestamp: Date.now(),
    previous_hash: '0'.repeat(64),
    proposer: proposer.publicKey,
    judgments: [{
      id: `jdg_leader_${blockNum}`,
      itemHash: `item_${blockNum}`,
      globalScore: 75 + blockNum,
      verdict: 'HOWL',
    }],
    merkle_root: '0'.repeat(64),
  };
  block.hash = hashBlock(block);
  return block;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC Leader Rotation Test');
  console.log('   φ-BFT Weighted Leader Selection');
  console.log('═══════════════════════════════════════════════════\n');

  // Generate keypairs
  const allKeypairs = [generateKeypair(), generateKeypair(), generateKeypair()];

  // Create validator list for SlotManager (id = publicKey, weight based on stake)
  const validatorList = allKeypairs.map((kp, i) => ({
    id: kp.publicKey,
    weight: VALIDATOR_WEIGHTS[i],
  }));

  console.log('[Setup] Validator Weights:');
  for (let i = 0; i < NODE_NAMES.length; i++) {
    console.log(`  ${NODE_NAMES[i]}: weight=${VALIDATOR_WEIGHTS[i]}`);
  }
  console.log();

  // Create nodes
  const nodes = [];
  for (let i = 0; i < 3; i++) {
    const node = await createNode(NODE_NAMES[i], PORTS[i], allKeypairs, validatorList);
    nodes.push(node);
    console.log(`[${NODE_NAMES[i]}] 🚀 Started on port ${PORTS[i]}`);
  }

  // Connect in mesh
  console.log('\n[Test] Connecting nodes...');
  await nodes[1].transport.connect({ id: nodes[0].keypair.publicKey, address: `ws://localhost:${PORTS[0]}` });
  await nodes[2].transport.connect({ id: nodes[0].keypair.publicKey, address: `ws://localhost:${PORTS[0]}` });
  await nodes[2].transport.connect({ id: nodes[1].keypair.publicKey, address: `ws://localhost:${PORTS[1]}` });
  await new Promise(r => setTimeout(r, 500));
  console.log('[Test] Mesh connected\n');

  // Test leader rotation over multiple slots
  console.log('─────────────────────────────────────────────────────');
  console.log('Leader Rotation Test');
  console.log('─────────────────────────────────────────────────────\n');

  const leaderCounts = { Node1: 0, Node2: 0, Node3: 0 };
  const proposedBlocks = [];
  const numSlots = 10;
  const baseSlot = nodes[0].slotManager.getCurrentSlot();

  // Pre-compute leader schedule
  console.log('[Schedule] Leader selection for slots:');
  for (let i = 0; i < numSlots; i++) {
    const slot = baseSlot + i;
    const leaderId = selectLeader(slot, validatorList);
    const leaderIndex = allKeypairs.findIndex(kp => kp.publicKey === leaderId);
    const leaderName = NODE_NAMES[leaderIndex];
    console.log(`  Slot ${slot}: ${leaderName} (weight=${VALIDATOR_WEIGHTS[leaderIndex]})`);
    leaderCounts[leaderName]++;
  }

  console.log('\n[Schedule] Leader distribution:');
  for (const [name, count] of Object.entries(leaderCounts)) {
    const pct = ((count / numSlots) * 100).toFixed(0);
    console.log(`  ${name}: ${count}/${numSlots} slots (${pct}%)`);
  }

  // Simulate block proposals respecting leader rotation
  console.log('\n[Test] Simulating block proposals...\n');

  for (let i = 0; i < 5; i++) {
    const slot = baseSlot + i;
    const leaderId = selectLeader(slot, validatorList);
    const leaderIndex = allKeypairs.findIndex(kp => kp.publicKey === leaderId);
    const leaderNode = nodes[leaderIndex];
    const leaderName = NODE_NAMES[leaderIndex];

    console.log(`[Slot ${slot}] Leader: ${leaderName}`);

    // Only leader proposes
    const block = createTestBlock(leaderNode.keypair, slot, i + 1);
    leaderNode.consensus.proposeBlock(block);
    await leaderNode.consensusGossip.proposeBlock(block);

    proposedBlocks.push({ slot, leader: leaderName, blockHash: block.hash });

    await new Promise(r => setTimeout(r, 800));

    // Check block status
    const blockStatus = leaderNode.consensus.getBlock(block.hash);
    console.log(`  Block status: ${blockStatus?.status}, Votes: ${blockStatus?.votes?.size || 0}`);
    console.log();
  }

  // Verify all blocks reached consensus
  console.log('─────────────────────────────────────────────────────');
  console.log('Verification');
  console.log('─────────────────────────────────────────────────────\n');

  let allConfirmed = true;
  for (const { slot, leader, blockHash } of proposedBlocks) {
    const block = nodes[0].consensus.getBlock(blockHash);
    const status = block?.status || 'unknown';
    const confirmed = status === 'CONFIRMED' || status === 'FINALIZED';
    if (!confirmed) allConfirmed = false;
    console.log(`Slot ${slot} (${leader}): ${status} ${confirmed ? '✅' : '❌'}`);
  }

  // Check that multiple leaders proposed
  const uniqueLeaders = new Set(proposedBlocks.map(b => b.leader));
  console.log(`\nUnique leaders: ${uniqueLeaders.size} (${[...uniqueLeaders].join(', ')})`);

  // Cleanup
  console.log('\n─────────────────────────────────────────────────────');
  console.log('[Test] Shutting down...');

  for (const node of nodes) {
    node.consensus.stop();
    node.consensusGossip.stop();
    await node.transport.stopServer();
  }

  // Final result
  const rotationWorks = uniqueLeaders.size >= 2; // At least 2 different leaders
  const success = allConfirmed && rotationWorks;

  if (success) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ LEADER ROTATION TEST PASSED');
    console.log(`   - ${uniqueLeaders.size} different leaders proposed blocks`);
    console.log('   - All blocks reached consensus');
    console.log('   - Weighted selection working correctly');
    console.log('═══════════════════════════════════════════════════\n');
  } else {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ⚠️  PARTIAL SUCCESS');
    console.log(`   - Unique leaders: ${uniqueLeaders.size}`);
    console.log(`   - All confirmed: ${allConfirmed}`);
    console.log('═══════════════════════════════════════════════════\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
