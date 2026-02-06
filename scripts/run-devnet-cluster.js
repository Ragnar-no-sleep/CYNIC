#!/usr/bin/env node
/**
 * Run Devnet Cluster - Spawn N in-process CYNICNetworkNode instances
 *
 * Starts N validator nodes on consecutive ports, connects them in a mesh,
 * and emits synthetic judgments to drive block production + Solana anchoring.
 *
 * Usage: node scripts/run-devnet-cluster.js [count=5]
 *
 * Prerequisites: node scripts/setup-devnet-validators.js
 *
 * "The pack hunts together"
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globalEventBus, EventType } from '@cynic/core';
import { generateKeypair } from '@cynic/protocol';
import { CYNICNetworkNode } from '@cynic/node';
import { loadWalletFromFile, SolanaCluster } from '@cynic/anchor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const NODE_COUNT = parseInt(process.argv[2] || '5', 10);
const BASE_PORT = 19618; // Avoids conflict with production (8618) and test (18900)
const VALIDATORS_DIR = join(ROOT, 'validators');
const JUDGMENT_INTERVAL_MS = 5000; // Emit synthetic judgment every 5s

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC Devnet Cluster');
  console.log(`   ${NODE_COUNT} validators, real Solana anchoring`);
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Load Solana wallets from validators/ directory
  const solanaWallets = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const path = join(VALIDATORS_DIR, `validator-${i}.json`);
    if (!existsSync(path)) {
      console.error(`ERROR: ${path} not found.`);
      console.error('Run: node scripts/setup-devnet-validators.js');
      process.exit(1);
    }
    solanaWallets.push(loadWalletFromFile(path));
  }
  console.log(`Loaded ${solanaWallets.length} Solana wallets\n`);

  // 2. Generate fresh P2P keypairs (ephemeral per run)
  const p2pKeypairs = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    p2pKeypairs.push(generateKeypair());
  }
  console.log(`Generated ${p2pKeypairs.length} P2P keypairs\n`);

  // 3. Create nodes
  const nodes = [];
  const seedAddress = `ws://localhost:${BASE_PORT}`;

  for (let i = 0; i < NODE_COUNT; i++) {
    const port = BASE_PORT + i;
    const kp = p2pKeypairs[i];
    const wallet = solanaWallets[i];

    const node = new CYNICNetworkNode({
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      port,
      eScore: 50,
      seedNodes: i === 0 ? [] : [seedAddress], // Node 0 is seed
      anchoringEnabled: true,
      wallet,
      dryRun: false,
      anchorInterval: 1, // Anchor every finalized block (for testing)
      solanaCluster: SolanaCluster.DEVNET,
    });

    // Pre-register ALL validators for correct leader rotation
    for (let j = 0; j < NODE_COUNT; j++) {
      node.addValidator({
        publicKey: p2pKeypairs[j].publicKey,
        eScore: 50,
      });
    }

    nodes.push({ node, port, kp, wallet, name: `Node${i}` });
    console.log(`[Node${i}] Created on port ${port} | P2P: ${kp.publicKey.slice(0, 16)}... | SOL: ${wallet.publicKey.slice(0, 12)}...`);
  }

  // 4. Wire event listeners for visibility
  for (const { node, name } of nodes) {
    node.on('started', () => console.log(`[${name}] Started`));
    node.on('peer:connected', ({ publicKey }) =>
      console.log(`[${name}] Peer connected: ${(publicKey || '?').slice(0, 16)}...`));
    node.on('block:produced', ({ slot, hash, judgmentCount }) =>
      console.log(`[${name}] Block produced: slot=${slot} hash=${hash.slice(0, 16)}... judgments=${judgmentCount}`));
    node.on('block:finalized', ({ blockHash }) =>
      console.log(`[${name}] Block FINALIZED: ${blockHash.slice(0, 16)}...`));
    node.on('block:anchored', (data) =>
      console.log(`[${name}] Block ANCHORED to Solana: ${data.signature || data.txHash || 'OK'}`));
    node.on('anchor:failed', (data) =>
      console.log(`[${name}] Anchor FAILED: ${data.error || 'unknown'}`));
    node.on('consensus:started', () =>
      console.log(`[${name}] Consensus active`));
  }

  // 5. Start nodes sequentially with delay
  console.log('\n── Starting nodes ──────────────────────────────────');
  for (const { node, name } of nodes) {
    try {
      await node.start();
    } catch (err) {
      console.error(`[${name}] Start FAILED: ${err.message}`);
    }
    await sleep(500);
  }

  // Give peers time to discover and connect
  console.log('\nWaiting for peer discovery (3s)...');
  await sleep(3000);
  console.log('Cluster online.\n');

  // 6. Start synthetic judgment loop
  let judgmentCounter = 0;
  let running = true;

  console.log('── Emitting synthetic judgments ─────────────────────');
  console.log(`   Interval: ${JUDGMENT_INTERVAL_MS}ms`);
  console.log('   Press Ctrl+C to stop\n');

  const judgmentLoop = setInterval(() => {
    if (!running) return;

    judgmentCounter++;
    const jid = `jdg_devnet_${Date.now().toString(36)}_${judgmentCounter}`;

    globalEventBus.publish(EventType.JUDGMENT_CREATED, {
      id: jid,
      payload: {
        id: jid,
        qScore: 50 + Math.floor(Math.random() * 40),
        verdict: ['HOWL', 'WAG', 'GROWL', 'BARK'][Math.floor(Math.random() * 4)],
        score: 50 + Math.floor(Math.random() * 40),
        itemType: 'synthetic',
      },
      timestamp: Date.now(),
    });

    console.log(`[Judgment #${judgmentCounter}] ${jid}`);
  }, JUDGMENT_INTERVAL_MS);

  // 7. Graceful shutdown
  const shutdown = async () => {
    if (!running) return;
    running = false;
    clearInterval(judgmentLoop);

    console.log('\n── Shutting down cluster ────────────────────────────');
    for (let i = nodes.length - 1; i >= 0; i--) {
      const { node, name } = nodes[i];
      try {
        await node.stop();
        console.log(`[${name}] Stopped`);
      } catch (err) {
        console.error(`[${name}] Stop error: ${err.message}`);
      }
    }

    console.log(`\nCluster shut down. ${judgmentCounter} judgments emitted.`);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep alive
  await new Promise(() => {}); // Never resolves — kept alive by setInterval
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
