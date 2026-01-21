#!/usr/bin/env node
/**
 * Test script for CYNIC Anchor Program
 *
 * Tests the end-to-end flow:
 * 1. Initialize program state
 * 2. Add validator
 * 3. Anchor merkle root
 * 4. Verify anchored root
 *
 * "Onchain is truth" - κυνικός
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import anchorPkg from '@anchor-lang/core';
const { AnchorProvider, Program, setProvider, BN } = anchorPkg;

// Program constants
const PROGRAM_ID = 'D2vprzEbzha6pRDs3EfFToGUvPocFoZTQG1uFkf2boRn';
const CLUSTER = 'https://api.devnet.solana.com';

// Load IDL
const idlPath = join(process.cwd(), 'packages/anchor/idl/cynic_anchor.json');
const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

// Load wallet
const walletPath = join(homedir(), '.config/solana/id.json');
const secretKey = Uint8Array.from(JSON.parse(readFileSync(walletPath, 'utf-8')));
const wallet = Keypair.fromSecretKey(secretKey);

console.log('═══════════════════════════════════════════════════════════');
console.log('🐕 CYNIC Anchor Program Test');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Program ID: ${PROGRAM_ID}`);
console.log(`Wallet:     ${wallet.publicKey.toString()}`);
console.log(`Cluster:    ${CLUSTER}`);
console.log('');

async function main() {
  // Setup connection and provider
  const connection = new Connection(CLUSTER, 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance:    ${balance / 1e9} SOL`);
  console.log('');

  // Create wallet adapter for Anchor
  const walletAdapter = {
    publicKey: wallet.publicKey,
    signTransaction: async (tx) => {
      tx.sign(wallet);
      return tx;
    },
    signAllTransactions: async (txs) => {
      txs.forEach((tx) => tx.sign(wallet));
      return txs;
    },
  };

  const provider = new AnchorProvider(connection, walletAdapter, {
    commitment: 'confirmed',
  });
  setProvider(provider);

  const program = new Program(idl, provider);
  const programId = new PublicKey(PROGRAM_ID);

  // Calculate PDAs
  const [statePda, stateBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('cynic_state')],
    programId
  );
  console.log(`State PDA:  ${statePda.toString()}`);

  // Step 1: Check if initialized
  console.log('\n── Step 1: Check Initialization ──');
  let state;
  try {
    state = await program.account.cynicState.fetch(statePda);
    console.log('✓ Program already initialized');
    console.log(`  Authority:    ${state.authority.toString()}`);
    console.log(`  Root Count:   ${state.rootCount.toString()}`);
    console.log(`  Validators:   ${state.validatorCount}`);
  } catch (e) {
    if (e.message.includes('Account does not exist')) {
      console.log('Program not initialized. Initializing...');

      try {
        const sig = await program.methods.initialize().accounts({}).rpc();
        console.log(`✓ Initialized! Signature: ${sig}`);

        // Wait and fetch state
        await new Promise((r) => setTimeout(r, 2000));
        state = await program.account.cynicState.fetch(statePda);
        console.log(`  Authority:  ${state.authority.toString()}`);
      } catch (initErr) {
        console.error('✗ Failed to initialize:', initErr.message);
        process.exit(1);
      }
    } else {
      console.error('✗ Error:', e.message);
      process.exit(1);
    }
  }

  // Step 2: Add validator (our wallet) if not already
  console.log('\n── Step 2: Check/Add Validator ──');
  const isValidator = state.validators
    .slice(0, state.validatorCount)
    .some((v) => v.toString() === wallet.publicKey.toString());

  if (isValidator) {
    console.log('✓ Wallet is already a validator');
  } else {
    console.log('Adding wallet as validator...');
    try {
      const sig = await program.methods
        .addValidator(wallet.publicKey)
        .accounts({})
        .rpc();
      console.log(`✓ Validator added! Signature: ${sig}`);

      // Refresh state
      await new Promise((r) => setTimeout(r, 2000));
      state = await program.account.cynicState.fetch(statePda);
      console.log(`  Total validators: ${state.validatorCount}`);
    } catch (addErr) {
      console.error('✗ Failed to add validator:', addErr.message);
      // Continue anyway - might already be a validator
    }
  }

  // Step 3: Anchor a test merkle root
  console.log('\n── Step 3: Anchor Test Root ──');
  const testData = `CYNIC test ${Date.now()}`;
  const merkleRoot = createHash('sha256').update(testData).digest();
  const merkleRootHex = merkleRoot.toString('hex');
  console.log(`Merkle Root: ${merkleRootHex}`);

  const [rootPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('root'), merkleRoot],
    programId
  );
  console.log(`Root PDA:    ${rootPda.toString()}`);

  try {
    // Use BN for u64 types
    const blockHeight = new BN(Math.floor(Date.now() / 1000));
    const itemCount = 1;

    const sig = await program.methods
      .anchorRoot(Array.from(merkleRoot), itemCount, blockHeight)
      .accounts({
        rootEntry: rootPda,
      })
      .rpc();

    console.log(`✓ Root anchored! Signature: ${sig}`);

    // Wait for confirmation
    await new Promise((r) => setTimeout(r, 2000));

    // Get transaction details
    const tx = await connection.getTransaction(sig, { commitment: 'confirmed' });
    console.log(`  Slot: ${tx?.slot}`);
    console.log(`  Fee:  ${(tx?.meta?.fee || 0) / 1e9} SOL`);
  } catch (anchorErr) {
    if (anchorErr.message.includes('already in use')) {
      console.log('✓ Root already anchored (PDA exists)');
    } else {
      console.error('✗ Failed to anchor:', anchorErr.message);
    }
  }

  // Step 4: Verify the root
  console.log('\n── Step 4: Verify Anchored Root ──');
  try {
    const rootEntry = await program.account.rootEntry.fetch(rootPda);
    console.log('✓ Root verified on-chain!');
    console.log(`  Merkle Root: ${Buffer.from(rootEntry.merkleRoot).toString('hex')}`);
    console.log(`  Item Count:  ${rootEntry.itemCount}`);
    console.log(`  Block Height: ${rootEntry.blockHeight.toString()}`);
    console.log(`  Validator:   ${rootEntry.validator.toString()}`);
    console.log(`  Timestamp:   ${new Date(Number(rootEntry.timestamp) * 1000).toISOString()}`);
    console.log(`  Slot:        ${rootEntry.slot.toString()}`);
    console.log(`  Index:       ${rootEntry.index.toString()}`);
  } catch (verifyErr) {
    console.error('✗ Failed to verify:', verifyErr.message);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🐕 Test Complete!');
  console.log('═══════════════════════════════════════════════════════════');

  // Final state
  state = await program.account.cynicState.fetch(statePda);
  console.log(`Total Roots Anchored: ${state.rootCount.toString()}`);
  console.log(`Total Validators:     ${state.validatorCount}`);
  console.log('');
  console.log('*tail wag* Onchain is truth.');
}

main().catch(console.error);
