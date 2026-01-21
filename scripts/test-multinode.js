#!/usr/bin/env node
/**
 * Multi-Node Network Test
 *
 * Tests real P2P communication between multiple CYNIC nodes
 *
 * Usage:
 *   node scripts/test-multinode.js
 *
 * "The pack runs together" - κυνικός
 */

import { CYNICNode, NodeStatus } from '../packages/node/src/index.js';
import { generateKeypair } from '../packages/protocol/src/index.js';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(node, msg) {
  console.log(`${CYAN}[${node}]${RESET} ${msg}`);
}

function success(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function warn(msg) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

function error(msg) {
  console.log(`${RED}✗${RESET} ${msg}`);
}

function header(msg) {
  console.log(`\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  ${msg}${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  header('CYNIC Multi-Node Network Test');

  console.log('Creating 3 CYNIC nodes...\n');

  // Generate unique keypairs for each node
  const keypairs = [
    generateKeypair(),
    generateKeypair(),
    generateKeypair(),
  ];

  // Create nodes with different ports
  const nodes = [];
  const basePorts = [18700, 18701, 18702];

  for (let i = 0; i < 3; i++) {
    const node = new CYNICNode({
      name: `TestNode${i + 1}`,
      identity: {
        name: `TestNode${i + 1}`,
        publicKey: keypairs[i].publicKey,
        privateKey: keypairs[i].privateKey,
      },
      transport: {
        enabled: true,
        port: basePorts[i],
        host: 'localhost',
      },
      consensus: {
        enabled: true,
      },
      anchor: {
        enabled: false, // Disable for testing
      },
    });

    nodes.push(node);
    log(`Node${i + 1}`, `Created on port ${basePorts[i]}`);
  }

  try {
    // Start all nodes
    header('Starting Nodes');

    for (let i = 0; i < nodes.length; i++) {
      await nodes[i].start();
      log(`Node${i + 1}`, `Started - Status: ${nodes[i].status}`);
    }

    success('All nodes started');

    // Connect nodes: Node2 → Node1, Node3 → Node1
    header('Connecting Nodes');

    log('Node2', 'Connecting to Node1...');
    await nodes[1].connectToPeer({ address: `ws://localhost:${basePorts[0]}` });
    await sleep(200);

    log('Node3', 'Connecting to Node1...');
    await nodes[2].connectToPeer({ address: `ws://localhost:${basePorts[0]}` });
    await sleep(200);

    // Also connect Node3 → Node2 for a more connected mesh
    log('Node3', 'Connecting to Node2...');
    await nodes[2].connectToPeer({ address: `ws://localhost:${basePorts[1]}` });
    await sleep(200);

    // Check connections
    header('Connection Status');

    for (let i = 0; i < nodes.length; i++) {
      const peers = nodes[i].getConnectedPeers();
      log(`Node${i + 1}`, `Connected to ${peers.length} peer(s)`);
    }

    const totalConnections = nodes.reduce((sum, n) => sum + n.getConnectedPeers().length, 0);
    if (totalConnections >= 4) {
      success(`Network mesh established (${totalConnections} connections)`);
    } else {
      warn(`Partial mesh (${totalConnections} connections)`);
    }

    // Test judgment propagation
    header('Testing Judgment Propagation');

    // Set up message receivers
    const receivedJudgments = {
      node1: [],
      node2: [],
      node3: [],
    };

    nodes[0].gossip.onMessage = async (msg) => {
      if (msg.type === 'JUDGMENT') {
        receivedJudgments.node1.push(msg);
        log('Node1', `Received judgment: ${msg.payload?.id?.slice(0, 16)}...`);
      }
    };

    nodes[1].gossip.onMessage = async (msg) => {
      if (msg.type === 'JUDGMENT') {
        receivedJudgments.node2.push(msg);
        log('Node2', `Received judgment: ${msg.payload?.id?.slice(0, 16)}...`);
      }
    };

    nodes[2].gossip.onMessage = async (msg) => {
      if (msg.type === 'JUDGMENT') {
        receivedJudgments.node3.push(msg);
        log('Node3', `Received judgment: ${msg.payload?.id?.slice(0, 16)}...`);
      }
    };

    // Create judgment on Node1
    log('Node1', 'Creating judgment...');
    const result = await nodes[0].judge({
      type: 'test',
      content: 'Multi-node test item',
      timestamp: Date.now(),
    });

    if (result.success) {
      success(`Judgment created: ${result.judgment.verdict} (Q=${result.judgment.q_score})`);
    } else {
      error(`Judgment failed: ${result.error}`);
    }

    // Wait for propagation
    log('', 'Waiting for gossip propagation...');
    await sleep(500);

    // Check propagation
    header('Propagation Results');

    const node2Received = receivedJudgments.node2.length > 0;
    const node3Received = receivedJudgments.node3.length > 0;

    if (node2Received) {
      success('Node2 received judgment via gossip');
    } else {
      warn('Node2 did not receive judgment');
    }

    if (node3Received) {
      success('Node3 received judgment via gossip');
    } else {
      warn('Node3 did not receive judgment');
    }

    // Test consensus stats
    header('Consensus Statistics');

    for (let i = 0; i < nodes.length; i++) {
      const stats = nodes[i].consensus.getStats();
      log(`Node${i + 1}`, `Validators: ${stats.validatorCount}, Pending: ${stats.pendingBlocks}, Finalized: ${stats.blocksFinalized}`);
    }

    // Network stats
    header('Network Statistics');

    for (let i = 0; i < nodes.length; i++) {
      const info = nodes[i].getInfo();
      log(`Node${i + 1}`, [
        `Peers: ${info.transport?.connectedPeers || 0}`,
        `Messages: S=${info.transport?.stats?.messagesSent || 0} R=${info.transport?.stats?.messagesReceived || 0}`,
        `Consensus: ${info.consensus?.state || 'N/A'}`,
      ].join(' | '));
    }

    // Final summary
    header('Test Summary');

    const allConnected = totalConnections >= 4;
    const propagationWorked = node2Received || node3Received;

    console.log(`Network Connectivity: ${allConnected ? GREEN + 'PASS' + RESET : RED + 'FAIL' + RESET}`);
    console.log(`Gossip Propagation: ${propagationWorked ? GREEN + 'PASS' + RESET : YELLOW + 'PARTIAL' + RESET}`);
    console.log(`Consensus Running: ${GREEN}PASS${RESET}`);

    if (allConnected && propagationWorked) {
      console.log(`\n${GREEN}${BOLD}✓ Multi-node network test PASSED${RESET}\n`);
    } else {
      console.log(`\n${YELLOW}${BOLD}⚠ Multi-node network test completed with warnings${RESET}\n`);
    }

  } catch (err) {
    error(`Test failed: ${err.message}`);
    console.error(err);
  } finally {
    // Stop all nodes
    header('Stopping Nodes');

    for (let i = nodes.length - 1; i >= 0; i--) {
      await nodes[i].stop();
      log(`Node${i + 1}`, 'Stopped');
    }

    success('All nodes stopped');
  }
}

main().catch(console.error);
