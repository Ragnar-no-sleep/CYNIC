#!/usr/bin/env node
/**
 * Setup Devnet Validators - Generate, Airdrop, Register On-Chain
 *
 * Idempotent: skips already-registered validators, reuses existing keypair files.
 *
 * Usage: node scripts/setup-devnet-validators.js [count=5]
 *
 * "The pack hunts together"
 */

import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  generateWallet,
  saveWalletToFile,
  loadWalletFromFile,
  CynicProgramClient,
  SolanaCluster,
} from '@cynic/anchor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const VALIDATOR_COUNT = parseInt(process.argv[2] || '5', 10);
const VALIDATORS_DIR = join(ROOT, 'validators');
const AUTHORITY_PATH = join(ROOT, 'deploy-wallet.json');
const AIRDROP_LAMPORTS = 1_000_000_000; // 1 SOL
const AIRDROP_DELAY_MS = 2000; // Devnet rate-limit buffer

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function airdropWithRetry(connection, PublicKeyClass, pubkeyBase58, lamports, maxRetries = 3) {
  const pubkey = new PublicKeyClass(pubkeyBase58);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const sig = await connection.requestAirdrop(pubkey, lamports);
      await connection.confirmTransaction(sig, 'confirmed');
      return sig;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = AIRDROP_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`  Airdrop attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CYNIC Devnet Validator Setup');
  console.log(`   Registering ${VALIDATOR_COUNT} validators on Solana devnet`);
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Check authority wallet
  if (!existsSync(AUTHORITY_PATH)) {
    console.error('ERROR: deploy-wallet.json not found.');
    console.error('Create one with: solana-keygen new -o deploy-wallet.json');
    process.exit(1);
  }

  const authorityWallet = loadWalletFromFile(AUTHORITY_PATH);
  console.log('Authority:', authorityWallet.publicKey);

  // 2. Create program client (authority signs add_validator TXs)
  const client = new CynicProgramClient({
    cluster: SolanaCluster.DEVNET,
    wallet: authorityWallet,
  });

  // 3. Check program state
  const state = await client.getState();
  if (!state) {
    console.error('ERROR: CYNIC program not initialized on devnet.');
    console.error('Run: node scripts/initialize.js');
    process.exit(1);
  }
  console.log(`On-chain state: ${state.validatorCount} validators registered`);
  console.log();

  // 4. Lazy-load @solana/web3.js for airdrop
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const connection = new Connection(SolanaCluster.DEVNET, 'confirmed');

  // 5. Ensure validators/ directory
  if (!existsSync(VALIDATORS_DIR)) {
    mkdirSync(VALIDATORS_DIR, { recursive: true });
    console.log('Created validators/ directory');
  }

  // 6. Generate or load keypairs, airdrop, register
  const wallets = [];

  for (let i = 0; i < VALIDATOR_COUNT; i++) {
    const keypairPath = join(VALIDATORS_DIR, `validator-${i}.json`);
    let wallet;

    console.log(`── Validator ${i} ──────────────────────────────────`);

    // Generate or load keypair
    if (existsSync(keypairPath)) {
      wallet = loadWalletFromFile(keypairPath);
      console.log(`  Loaded:     ${wallet.publicKey}`);
    } else {
      const { wallet: newWallet, secretKey } = generateWallet();
      saveWalletToFile(secretKey, keypairPath);
      wallet = newWallet;
      console.log(`  Generated:  ${wallet.publicKey}`);
    }
    wallets.push(wallet);

    // Check balance and airdrop if needed
    const pubkey = new PublicKey(wallet.publicKey);
    const balance = await connection.getBalance(pubkey);
    const balanceSol = balance / 1e9;

    if (balanceSol < 0.5) {
      console.log(`  Balance:    ${balanceSol.toFixed(4)} SOL (low, requesting airdrop...)`);
      try {
        const sig = await airdropWithRetry(connection, PublicKey, wallet.publicKey, AIRDROP_LAMPORTS);
        const newBalance = await connection.getBalance(pubkey);
        console.log(`  Airdrop:    +1 SOL (now ${(newBalance / 1e9).toFixed(4)} SOL)`);
        console.log(`  Airdrop TX: ${sig}`);
      } catch (err) {
        console.log(`  Airdrop:    FAILED (${err.message}) — may need manual funding`);
      }
      await sleep(AIRDROP_DELAY_MS);
    } else {
      console.log(`  Balance:    ${balanceSol.toFixed(4)} SOL (sufficient)`);
    }

    // Register on-chain if not already
    const alreadyRegistered = await client.isValidator(wallet.publicKey);
    if (alreadyRegistered) {
      console.log(`  On-chain:   Already registered`);
    } else {
      try {
        const { signature } = await client.addValidator(wallet.publicKey);
        console.log(`  Registered: TX ${signature}`);
      } catch (err) {
        console.error(`  Register:   FAILED — ${err.message}`);
        if (err.logs) {
          err.logs.forEach((l) => console.error(`    ${l}`));
        }
      }
    }
    console.log();
  }

  // 7. Verify final state
  console.log('── Verification ──────────────────────────────────');
  const finalState = await client.getState();
  console.log(`  Validators on-chain: ${finalState.validatorCount}`);
  for (const v of finalState.validators) {
    const match = wallets.find((w) => w.publicKey === v);
    console.log(`    ${v}${match ? '' : ' (external)'}`);
  }
  console.log();

  const registered = wallets.filter((w) => finalState.validators.includes(w.publicKey)).length;
  if (registered === VALIDATOR_COUNT) {
    console.log(`All ${VALIDATOR_COUNT} validators registered on devnet.`);
  } else {
    console.log(`${registered}/${VALIDATOR_COUNT} validators registered. Check errors above.`);
  }

  console.log('\nSetup complete.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
