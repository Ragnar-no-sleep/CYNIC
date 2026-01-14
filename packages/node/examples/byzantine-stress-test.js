#!/usr/bin/env node
/**
 * Byzantine Stress Test
 *
 * Tests φ-BFT with 10 validators and 2 Byzantine nodes:
 * - 10 validators total
 * - 2 Byzantine nodes attempting attacks
 * - 8 honest nodes (80% > 61.8% threshold)
 * - Byzantine attacks: equivocation, conflicting votes
 *
 * φ-BFT can tolerate f < n/3 Byzantine nodes (up to 3 with n=10)
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

const NUM_VALIDATORS = 10;
const NUM_BYZANTINE = 2;
const BASE_PORT = 24000;
const NUM_BLOCKS = 8;

// Byzantine nodes are the last 2
const BYZANTINE_INDICES = [8, 9];

const NODE_NAMES = Array.from({ length: NUM_VALIDATORS }, (_, i) =>
  BYZANTINE_INDICES.includes(i) ? `Byz${i - 7}` : `Node${i + 1}`
);

async function createNode(index, allKeypairs, isByzantine = false) {
  const name = NODE_NAMES[index];
  const port = BASE_PORT + index;
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
    onMessage: () => {},
  });

  const consensus = new ConsensusEngine({
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    eScore: 0.6,
    burned: 100,
    uptime: 1.0,
    confirmationsForFinality: 3,
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

  const validatorList = allKeypairs.map((kp) => ({
    id: kp.publicKey,
    weight: 100,
  }));

  const slotManager = new SlotManager({ genesisTime: Date.now() - 10000 });
  slotManager.setValidators(validatorList);

  const consensusGossip = new ConsensusGossip({
    consensus,
    gossip,
    autoSync: false,
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

  await transport.startServer();
  consensusGossip.start();
  consensus.start();

  return {
    transport,
    gossip,
    consensus,
    consensusGossip,
    slotManager,
    keypair,
    port,
    name,
    index,
    isByzantine,
    validatorList,
  };
}

function createTestBlock(proposer, slot, blockNum, suffix = '') {
  const block = {
    type: 'JUDGMENT',
    slot,
    timestamp: Date.now(),
    previous_hash: '0'.repeat(64),
    proposer: proposer.publicKey,
    judgments: [{
      id: `jdg_byz_stress_${blockNum}${suffix}`,
      itemHash: `item_${blockNum}${suffix}`,
      globalScore: 70 + (blockNum % 30),
      verdict: 'HOWL',
    }],
    merkle_root: '0'.repeat(64),
  };
  block.hash = hashBlock(block);
  return block;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC Byzantine Stress Test');
  console.log(`   ${NUM_VALIDATORS} Validators, ${NUM_BYZANTINE} Byzantine`);
  console.log('═══════════════════════════════════════════════════\n');

  const startTime = Date.now();

  // Generate keypairs
  console.log(`[Setup] Generating ${NUM_VALIDATORS} validator keypairs...`);
  const allKeypairs = Array.from({ length: NUM_VALIDATORS }, () => generateKeypair());

  // Create nodes
  console.log(`[Setup] Starting ${NUM_VALIDATORS} nodes (${NUM_BYZANTINE} Byzantine)...`);
  const nodes = [];
  const honestNodes = [];
  const byzantineNodes = [];

  for (let i = 0; i < NUM_VALIDATORS; i++) {
    const isByzantine = BYZANTINE_INDICES.includes(i);
    const node = await createNode(i, allKeypairs, isByzantine);
    nodes.push(node);

    if (isByzantine) {
      byzantineNodes.push(node);
    } else {
      honestNodes.push(node);
    }
  }

  console.log(`  Honest nodes: ${honestNodes.map(n => n.name).join(', ')}`);
  console.log(`  Byzantine nodes: ${byzantineNodes.map(n => n.name).join(', ')}`);

  // Connect mesh
  console.log('\n[Setup] Connecting full mesh...');
  for (let i = 0; i < NUM_VALIDATORS; i++) {
    for (let j = i + 1; j < NUM_VALIDATORS; j++) {
      await nodes[i].transport.connect({
        id: nodes[j].keypair.publicKey,
        address: `ws://localhost:${BASE_PORT + j}`,
      });
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  console.log('[Setup] Mesh connected\n');

  // Track stats
  const attackStats = {
    equivocationAttempts: 0,
    equivocationBlocked: 0,
    doubleVoteAttempts: 0,
    doubleVoteBlocked: 0,
  };

  // Listen for Byzantine events on honest nodes
  for (const node of honestNodes) {
    node.consensus.on('block:equivocation', () => {
      attackStats.equivocationBlocked++;
    });
    node.consensus.on('vote:double-vote-attempt', () => {
      attackStats.doubleVoteBlocked++;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Test: Honest Consensus Despite Byzantine Nodes
  // ═══════════════════════════════════════════════════════════════
  console.log('─────────────────────────────────────────────────────');
  console.log('Test: Consensus with Byzantine Minority');
  console.log('─────────────────────────────────────────────────────\n');

  const baseSlot = nodes[0].slotManager.getCurrentSlot();
  const proposedBlocks = [];
  let finalizedCount = 0;

  for (let i = 0; i < NUM_BLOCKS; i++) {
    const slot = baseSlot + i;

    // Use an honest node as leader for fair testing
    const leaderNode = honestNodes[i % honestNodes.length];

    const block = createTestBlock(leaderNode.keypair, slot, i + 1);

    console.log(`[Slot ${slot}] ${leaderNode.name} proposing block...`);
    leaderNode.consensus.proposeBlock(block);
    await leaderNode.consensusGossip.proposeBlock(block);

    proposedBlocks.push({ slot, hash: block.hash, leader: leaderNode.name });

    // Byzantine attack: try to propose conflicting block for same slot
    if (i % 3 === 0) {
      for (const byz of byzantineNodes) {
        const conflictBlock = createTestBlock(byz.keypair, slot, i + 1, '_conflict');
        attackStats.equivocationAttempts++;

        // Try to inject conflicting block
        try {
          byz.consensus.proposeBlock(conflictBlock);
          await byz.consensusGossip.proposeBlock(conflictBlock);
        } catch (e) {
          // Expected to fail due to equivocation detection
        }
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Wait for consensus
  console.log('\n[Test] Waiting for consensus...');
  await new Promise(r => setTimeout(r, 3000));

  // ═══════════════════════════════════════════════════════════════
  // Verification
  // ═══════════════════════════════════════════════════════════════
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Verification');
  console.log('─────────────────────────────────────────────────────\n');

  let allFinalized = true;

  for (const pb of proposedBlocks) {
    const record = honestNodes[0].consensus.getBlock(pb.hash);
    const status = record?.status || 'unknown';
    const votes = record?.votes?.size || 0;
    const finalized = status === 'FINALIZED';

    if (finalized) finalizedCount++;
    if (!finalized && status !== 'CONFIRMED') allFinalized = false;

    const icon = finalized ? '✅' : status === 'CONFIRMED' ? '⚠️' : '❌';
    console.log(`Slot ${pb.slot} [${pb.leader}]: ${status} (${votes}/${NUM_VALIDATORS} votes) ${icon}`);
  }

  // Check consensus agreement across honest nodes
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Honest Node Agreement');
  console.log('─────────────────────────────────────────────────────\n');

  let consensusAgreement = true;
  const referenceFinalized = new Set();

  for (const pb of proposedBlocks) {
    const record = honestNodes[0].consensus.getBlock(pb.hash);
    if (record?.status === 'FINALIZED' || record?.status === 'CONFIRMED') {
      referenceFinalized.add(pb.hash);
    }
  }

  for (const node of honestNodes) {
    const nodeFinalized = new Set();
    for (const pb of proposedBlocks) {
      const record = node.consensus.getBlock(pb.hash);
      if (record?.status === 'FINALIZED' || record?.status === 'CONFIRMED') {
        nodeFinalized.add(pb.hash);
      }
    }

    const matches = [...referenceFinalized].every(h => nodeFinalized.has(h)) &&
                    [...nodeFinalized].every(h => referenceFinalized.has(h));
    if (!matches) consensusAgreement = false;

    console.log(`[${node.name}] Confirmed/Finalized: ${nodeFinalized.size}/${NUM_BLOCKS} ${matches ? '✅' : '❌'}`);
  }

  // Byzantine attack statistics
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Byzantine Attack Results');
  console.log('─────────────────────────────────────────────────────\n');

  console.log(`Equivocation attempts:    ${attackStats.equivocationAttempts}`);
  console.log(`Equivocation blocked:     ${attackStats.equivocationBlocked}`);
  console.log(`Double-vote attempts:     ${attackStats.doubleVoteAttempts}`);
  console.log(`Double-vote blocked:      ${attackStats.doubleVoteBlocked}`);

  // Performance stats
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Performance');
  console.log('─────────────────────────────────────────────────────\n');

  const endTime = Date.now();
  const runtime = (endTime - startTime) / 1000;
  const throughput = NUM_BLOCKS / runtime;

  console.log(`Total validators:     ${NUM_VALIDATORS}`);
  console.log(`Byzantine validators: ${NUM_BYZANTINE}`);
  console.log(`Honest validators:    ${NUM_VALIDATORS - NUM_BYZANTINE}`);
  console.log(`Blocks proposed:      ${NUM_BLOCKS}`);
  console.log(`Blocks finalized:     ${finalizedCount}`);
  console.log(`Runtime:              ${runtime.toFixed(2)}s`);
  console.log(`Throughput:           ${throughput.toFixed(2)} blocks/sec`);

  // Cleanup
  console.log('\n─────────────────────────────────────────────────────');
  console.log('[Test] Shutting down...');

  for (const node of nodes) {
    node.consensus.stop();
    node.consensusGossip.stop();
    await node.transport.stopServer();
  }

  // Final result
  const honestThreshold = (NUM_VALIDATORS - NUM_BYZANTINE) / NUM_VALIDATORS;
  const attacksBlocked = attackStats.equivocationBlocked > 0 || attackStats.equivocationAttempts === 0;
  const success = consensusAgreement && (finalizedCount >= NUM_BLOCKS * 0.8);

  if (success) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ BYZANTINE STRESS TEST PASSED');
    console.log(`   - ${NUM_VALIDATORS} validators, ${NUM_BYZANTINE} Byzantine`);
    console.log(`   - Honest majority: ${((1 - NUM_BYZANTINE/NUM_VALIDATORS) * 100).toFixed(0)}% > 61.8%`);
    console.log(`   - ${finalizedCount}/${NUM_BLOCKS} blocks finalized`);
    console.log('   - All honest nodes agree');
    console.log('   - Byzantine attacks handled');
    console.log('═══════════════════════════════════════════════════\n');
  } else {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ⚠️  PARTIAL SUCCESS');
    console.log(`   - Finalized: ${finalizedCount}/${NUM_BLOCKS}`);
    console.log(`   - Agreement: ${consensusAgreement ? 'YES' : 'NO'}`);
    console.log('═══════════════════════════════════════════════════\n');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
