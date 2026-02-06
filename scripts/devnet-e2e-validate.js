#!/usr/bin/env node
/**
 * CYNIC Devnet End-to-End Validation
 *
 * Full validation of the Solana anchoring pipeline on devnet:
 * 1. Program state check
 * 2. Real anchor_root transaction
 * 3. On-chain verification via PDA lookup
 * 4. Queue batch anchoring
 * 5. Merkle proof validation
 *
 * Uses the deploy wallet (authority + registered validator).
 *
 * Usage: node scripts/devnet-e2e-validate.js
 *
 * "Onchain is truth" - κυνικός
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const PROGRAM_ID = new PublicKey('G3Yana4ukbevyoVNSWrXgRQtQqHYMnPEMi1xvpp9CqBY');
const RPC_URL = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';

// Colors
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', M = '\x1b[35m';
const B = '\x1b[1m', X = '\x1b[0m';

function log(msg, color = X) { console.log(`${color}${msg}${X}`); }
function pass(name, detail = '') {
  results.passed++;
  log(`  [PASS] ${name}${detail ? ': ' + detail : ''}`, G);
}
function fail(name, err) {
  results.failed++;
  log(`  [FAIL] ${name}: ${err}`, R);
}

const results = { passed: 0, failed: 0 };

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function generateMerkleRoot() {
  return createHash('sha256').update(randomBytes(32)).digest('hex');
}

function getDiscriminator(name) {
  return createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}

async function parseState(connection) {
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('cynic_state')], PROGRAM_ID
  );
  const account = await connection.getAccountInfo(statePda);
  if (!account) return null;

  const data = account.data;
  let offset = 8; // skip discriminator

  const authority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const initializedAt = Number(data.readBigInt64LE(offset));
  offset += 8;
  const rootCount = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const validatorCount = data.readUInt8(offset);
  offset += 1;
  const validators = [];
  for (let i = 0; i < validatorCount; i++) {
    validators.push(new PublicKey(data.slice(offset + i * 32, offset + (i + 1) * 32)).toBase58());
  }
  offset += 21 * 32;
  const lastAnchorSlot = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const bump = data.readUInt8(offset);

  return { authority: authority.toBase58(), initializedAt, rootCount, validatorCount, validators, lastAnchorSlot, bump, statePda: statePda.toBase58() };
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

async function testProgramState(connection, walletPubkey) {
  log('\n--- Test 1: Program State ---', C);

  const state = await parseState(connection);
  if (!state) { fail('Program state', 'Not initialized'); return null; }

  pass('Program initialized', `root_count=${state.rootCount}`);

  if (state.authority === walletPubkey) {
    pass('Authority matches wallet');
  } else {
    fail('Authority mismatch', `expected ${walletPubkey}, got ${state.authority}`);
  }

  if (state.validators.includes(walletPubkey)) {
    pass('Wallet is registered validator', `${state.validatorCount}/21 slots`);
  } else {
    fail('Wallet not a validator', 'Cannot anchor without validator registration');
    return null;
  }

  return state;
}

async function testAnchorRoot(connection, authority) {
  log('\n--- Test 2: Real anchor_root Transaction ---', C);

  const merkleRoot = generateMerkleRoot();
  const rootBytes = Buffer.from(merkleRoot, 'hex');
  log(`  Merkle root: ${merkleRoot.slice(0, 32)}...`, Y);

  // Derive PDAs
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('cynic_state')], PROGRAM_ID
  );
  const [rootPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('root'), rootBytes], PROGRAM_ID
  );

  // Build anchor_root instruction
  const discriminator = getDiscriminator('anchor_root');
  const data = Buffer.alloc(8 + 32 + 4 + 8);
  let offset = 0;
  discriminator.copy(data, offset); offset += 8;
  rootBytes.copy(data, offset); offset += 32;
  data.writeUInt32LE(3, offset); offset += 4;         // item_count = 3
  data.writeBigUInt64LE(BigInt(132), offset);          // block_height = 132 (next after 131)

  const { Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } = await import('@solana/web3.js');

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: statePda, isSigner: false, isWritable: true },
      { pubkey: rootPda, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [authority], {
      commitment: 'confirmed',
    });
    pass('anchor_root TX confirmed', `sig: ${sig.slice(0, 24)}...`);
    log(`  Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`, M);

    return { signature: sig, merkleRoot, rootPda: rootPda.toBase58() };
  } catch (err) {
    fail('anchor_root TX', err.message);
    if (err.logs) err.logs.forEach(l => log(`    ${l}`, R));
    return null;
  }
}

async function testVerifyOnChain(connection, merkleRoot) {
  log('\n--- Test 3: On-Chain Verification (PDA Lookup) ---', C);

  const rootBytes = Buffer.from(merkleRoot, 'hex');
  const [rootPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('root'), rootBytes], PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(rootPda);
  if (!accountInfo) {
    fail('Root PDA not found', rootPda.toBase58());
    return;
  }

  pass('Root PDA exists', `${accountInfo.data.length} bytes`);

  // Parse RootEntry: disc(8) + merkle_root(32) + item_count(4) + block_height(8) + validator(32) + timestamp(8) + slot(8) + index(8)
  const data = accountInfo.data;
  let offset = 8;
  const storedRoot = Buffer.from(data.slice(offset, offset + 32)).toString('hex');
  offset += 32;
  const itemCount = data.readUInt32LE(offset);
  offset += 4;
  const blockHeight = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const validator = new PublicKey(data.slice(offset, offset + 32)).toBase58();
  offset += 32;
  const timestamp = Number(data.readBigInt64LE(offset));
  offset += 8;
  const slot = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const index = Number(data.readBigUInt64LE(offset));

  if (storedRoot === merkleRoot) {
    pass('Merkle root matches on-chain');
  } else {
    fail('Merkle root mismatch', `stored=${storedRoot.slice(0, 16)}...`);
  }

  if (itemCount === 3) {
    pass('Item count correct', `${itemCount}`);
  } else {
    fail('Item count wrong', `expected 3, got ${itemCount}`);
  }

  if (blockHeight === 132) {
    pass('Block height correct', `${blockHeight}`);
  } else {
    fail('Block height wrong', `expected 132, got ${blockHeight}`);
  }

  pass('Root entry parsed', `validator=${validator.slice(0, 16)}..., slot=${slot}, index=${index}`);

  log(`  Timestamp: ${new Date(timestamp * 1000).toISOString()}`, Y);
}

async function testProgramClientFlow(connection, authority) {
  log('\n--- Test 4: ProgramClient Library Flow ---', C);

  // Use the program-client from @cynic/anchor
  let CynicProgramClient;
  try {
    const mod = await import('../packages/anchor/src/program-client.js');
    CynicProgramClient = mod.CynicProgramClient;
  } catch (err) {
    fail('Import @cynic/anchor/program-client', err.message);
    return null;
  }

  const { CynicWallet } = await import('../packages/anchor/src/wallet.js');
  const wallet = new CynicWallet({ secretKey: authority.secretKey });
  const client = new CynicProgramClient({ cluster: RPC_URL, wallet });

  // Get state via client
  const state = await client.getState();
  if (state && state.authority) {
    pass('ProgramClient.getState()', `rootCount=${state.rootCount}, validators=${state.validatorCount}`);
  } else {
    fail('ProgramClient.getState()', 'returned null');
    return null;
  }

  // Anchor via client
  const merkleRoot = generateMerkleRoot();
  try {
    const result = await client.anchorRoot(merkleRoot, 5, state.rootCount + 1);
    pass('ProgramClient.anchorRoot()', `sig=${result.signature.slice(0, 24)}...`);
    log(`  Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`, M);

    // Verify via client
    const verification = await client.verifyRoot(merkleRoot);
    if (verification.verified) {
      pass('ProgramClient.verifyRoot()', `block_height=${verification.entry.blockHeight}`);
    } else {
      fail('ProgramClient.verifyRoot()', verification.error);
    }

    return result;
  } catch (err) {
    fail('ProgramClient.anchorRoot()', err.message);
    if (err.logs) err.logs.forEach(l => log(`    ${l}`, R));
    return null;
  }
}

async function testAnchorerFlow(connection, authority) {
  log('\n--- Test 5: SolanaAnchorer High-Level Flow ---', C);

  let createAnchorer, CynicWallet;
  try {
    const anchorMod = await import('../packages/anchor/src/anchorer.js');
    const walletMod = await import('../packages/anchor/src/wallet.js');
    createAnchorer = anchorMod.createAnchorer;
    CynicWallet = walletMod.CynicWallet;
  } catch (err) {
    fail('Import @cynic/anchor', err.message);
    return;
  }

  const wallet = new CynicWallet({ secretKey: authority.secretKey });
  const anchorer = createAnchorer({
    cluster: RPC_URL,
    wallet,
    useAnchorProgram: true,
  });

  // Anchor via high-level API
  const merkleRoot = generateMerkleRoot();
  const result = await anchorer.anchor(merkleRoot, ['judgment_001', 'judgment_002']);

  if (result.success && !result.simulated) {
    pass('Anchorer.anchor() (real TX)', `sig=${result.signature.slice(0, 24)}...`);
    log(`  Explorer: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`, M);
  } else if (result.success && result.simulated) {
    fail('Anchorer.anchor()', 'fell back to simulation (expected real TX)');
  } else {
    fail('Anchorer.anchor()', result.error);
  }

  // Verify via anchorer
  const verification = await anchorer.verifyAnchor(merkleRoot);
  if (verification.verified) {
    pass('Anchorer.verifyAnchor()', 'root confirmed on-chain');
  } else {
    fail('Anchorer.verifyAnchor()', verification.error);
  }

  // Stats
  const stats = anchorer.getStats();
  if (stats.totalAnchored >= 1 && stats.hasWallet) {
    pass('Anchorer stats', `anchored=${stats.totalAnchored}, items=${stats.totalItems}`);
  } else {
    fail('Anchorer stats', JSON.stringify(stats));
  }
}

async function testQueueBatch(connection, authority) {
  log('\n--- Test 6: Queue Batch Anchoring ---', C);

  let createAnchorer, createAnchorQueue, CynicWallet;
  try {
    const anchorMod = await import('../packages/anchor/src/anchorer.js');
    const queueMod = await import('../packages/anchor/src/queue.js');
    const walletMod = await import('../packages/anchor/src/wallet.js');
    createAnchorer = anchorMod.createAnchorer;
    createAnchorQueue = queueMod.createAnchorQueue;
    CynicWallet = walletMod.CynicWallet;
  } catch (err) {
    fail('Import @cynic/anchor queue', err.message);
    return;
  }

  const wallet = new CynicWallet({ secretKey: authority.secretKey });
  const anchorer = createAnchorer({ cluster: RPC_URL, wallet, useAnchorProgram: true });
  const queue = createAnchorQueue({ anchorer, batchSize: 10, autoStart: false });

  // Enqueue 4 judgments (unique per run to avoid PDA collision)
  const nonce = Date.now();
  const items = [
    { id: `jdg_e2e_${nonce}_001`, content: { verdict: 'WAG', score: 78, nonce } },
    { id: `jdg_e2e_${nonce}_002`, content: { verdict: 'GROWL', score: 35, nonce } },
    { id: `jdg_e2e_${nonce}_003`, content: { verdict: 'HOWL', score: 92, nonce } },
    { id: `jdg_e2e_${nonce}_004`, content: { verdict: 'BARK', score: 55, nonce } },
  ];

  for (const item of items) {
    queue.enqueue(item.id, item.content);
  }

  if (queue.getQueueLength() === 4) {
    pass('Queue enqueue', `${queue.getQueueLength()} items`);
  } else {
    fail('Queue enqueue', `expected 4, got ${queue.getQueueLength()}`);
  }

  // Flush (real TX)
  try {
    const batch = await queue.flush();
    if (!batch) {
      fail('Queue flush', 'No batch returned');
    } else if (batch.status === 'FAILED') {
      fail('Queue flush', `FAILED: ${batch.error}`);
    } else if (batch.signature && !batch.signature.startsWith('sim_')) {
      pass('Queue flush (real TX)', `batch=${batch.batchId}, root=${batch.merkleRoot.slice(0, 16)}...`);
      log(`  Explorer: https://explorer.solana.com/tx/${batch.signature}?cluster=devnet`, M);

      // Verify proofs
      let allProofsValid = true;
      for (const item of items) {
        const proofData = queue.getProof(item.id);
        if (!proofData || !queue.verifyProof(proofData.itemHash, proofData.merkleRoot, proofData.merkleProof)) {
          allProofsValid = false;
          break;
        }
      }
      if (allProofsValid) {
        pass('Merkle proofs valid', `${items.length} items verified`);
      } else {
        fail('Merkle proofs', 'Some proofs invalid');
      }
    } else {
      fail('Queue flush', `unexpected status=${batch.status}, sig=${batch.signature?.slice(0, 20)}`);
    }
  } catch (err) {
    fail('Queue flush', err.message);
  }

  queue.destroy();
}

async function testStateAfter(connection, stateBefore) {
  log('\n--- Test 7: State Validation (After) ---', C);

  const stateAfter = await parseState(connection);
  if (!stateAfter) { fail('State after', 'Could not parse'); return; }

  const newRoots = stateAfter.rootCount - stateBefore.rootCount;
  if (newRoots >= 3) {
    // 3 anchors: raw TX (test 2), ProgramClient (test 4), Anchorer (test 5), Queue (test 6) = 4 expected
    pass('Root count increased', `${stateBefore.rootCount} -> ${stateAfter.rootCount} (+${newRoots})`);
  } else if (newRoots > 0) {
    pass('Root count increased (partial)', `+${newRoots} (some tests may have failed)`);
  } else {
    fail('Root count unchanged', `still ${stateAfter.rootCount}`);
  }

  if (stateAfter.lastAnchorSlot > stateBefore.lastAnchorSlot) {
    pass('Last anchor slot updated', `${stateBefore.lastAnchorSlot} -> ${stateAfter.lastAnchorSlot}`);
  } else {
    fail('Last anchor slot unchanged', `${stateAfter.lastAnchorSlot}`);
  }

  log(`\n  Final state: ${stateAfter.rootCount} roots, slot ${stateAfter.lastAnchorSlot}`, C);
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function main() {
  log(`\n${'='.repeat(66)}`, C);
  log(`${B}  CYNIC Devnet E2E Validation - "Onchain is truth"`, C);
  log(`${'='.repeat(66)}`, C);
  log(`  RPC: ${RPC_URL}`, Y);
  log(`  Time: ${new Date().toISOString()}`, Y);

  // Load deploy wallet
  const walletPath = join(__dirname, '..', 'deploy-wallet.json');
  const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'));
  const authority = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const pubkey = authority.publicKey.toBase58();
  log(`  Wallet: ${pubkey.slice(0, 16)}...${pubkey.slice(-8)}`, Y);

  const connection = new Connection(RPC_URL, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(authority.publicKey);
  log(`  Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`, balance > 0.1 * LAMPORTS_PER_SOL ? G : R);

  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    log('\n  Insufficient SOL. Need at least 0.01 SOL for fees.', R);
    process.exit(1);
  }

  // Run tests
  const stateBefore = await testProgramState(connection, pubkey);
  if (!stateBefore) { log('\n  Cannot proceed - program not ready.', R); process.exit(1); }

  const anchorResult = await testAnchorRoot(connection, authority);
  if (anchorResult) {
    await testVerifyOnChain(connection, anchorResult.merkleRoot);
  }

  await testProgramClientFlow(connection, authority);
  await testAnchorerFlow(connection, authority);
  await testQueueBatch(connection, authority);
  await testStateAfter(connection, stateBefore);

  // Summary
  const total = results.passed + results.failed;
  log(`\n${'='.repeat(66)}`, C);
  log(`  Results: ${results.passed}/${total} passed`, results.failed === 0 ? G : Y);
  if (results.failed > 0) {
    log(`  ${results.failed} failures`, R);
  }
  log(`  Balance spent: ${((balance - (await connection.getBalance(authority.publicKey))) / LAMPORTS_PER_SOL).toFixed(6)} SOL`, Y);
  log(`${'='.repeat(66)}\n`, C);

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  log(`\n  Fatal: ${err.message}`, R);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
