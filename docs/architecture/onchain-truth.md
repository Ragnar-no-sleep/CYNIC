# Onchain is Truth - Anchor + Burns Architecture

> "φ distrusts φ" - κυνικός

## Overview

CYNIC's memory architecture implements a 4-layer system where the final layer anchors truth on Solana blockchain. This document describes the **Anchor** and **Burns** subsystems that make CYNIC's judgments immutable and verifiable.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    LAYER 4: TRUTH (On-chain)                         │
│                                                                      │
│   Solana Blockchain                                                  │
│   ├── Merkle roots of judgment batches                              │
│   ├── Burn verification records                                      │
│   └── E-Score snapshots                                             │
│                                                                      │
│   "Onchain is truth - immutable, verifiable, eternal"               │
└──────────────────────────────────────────────────────────────────────┘
         ▲
         │ Anchor (periodic batches)
         │
┌──────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: PROOF (Merkle DAG)                       │
│   Merkle trees, cryptographic proofs, judgment chains               │
└──────────────────────────────────────────────────────────────────────┘
         ▲
         │
┌──────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: INDEX (PostgreSQL)                       │
│   Searchable indexes, relationships, metadata                        │
└──────────────────────────────────────────────────────────────────────┘
         ▲
         │
┌──────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: SPEED (Redis)                            │
│   Hot cache, real-time queries, session state                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Packages

### @cynic/anchor

Handles Solana blockchain integration for anchoring merkle roots.

```javascript
import {
  createAnchorer,
  createAnchorQueue,
  loadWalletFromFile,
  SolanaCluster
} from '@cynic/anchor';
```

### @cynic/burns

Verifies burn transactions via the burns API.

```javascript
import { createBurnVerifier, BurnStatus } from '@cynic/burns';
```

## Flow Diagram

```
                                    CYNIC Node
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         judge(item, context)                         │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   │                   │
         ┌──────────────────┐           │                   │
         │  Burns Verifier  │           │                   │
         │                  │           │                   │
         │  context.burnTx  │           │                   │
         │       ▼          │           │                   │
         │  API Verify      │           │                   │
         │  (alonisthe.dev) │           │                   │
         └────────┬─────────┘           │                   │
                  │                     │                   │
           verified?                    │                   │
           ╱      ╲                     │                   │
         YES       NO ────────────────► REJECT              │
          │                             (BURN_REQUIRED      │
          │                              BURN_INVALID)      │
          ▼                                                 │
┌──────────────────┐                                        │
│   CYNIC Judge    │◄───────────────────────────────────────┘
│                  │
│  25 Dimensions   │
│  4 Axioms        │
│  Q-Score         │
│  Verdict         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Anchor Queue   │
│                  │
│  Batch items     │
│  (φ-aligned)     │
│  38 items/batch  │
│  61,803ms timer  │
└────────┬─────────┘
         │
         ▼ (on flush or timer)
┌──────────────────┐
│   Merkle Tree    │
│                  │
│  Compute root    │
│  Generate proofs │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Anchorer      │
│                  │
│  Sign tx         │
│  Send to Solana  │
│  Memo Program    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                      │
│                                                          │
│  Memo: CYNIC:POJ:<merkle_root_hex>                       │
│                                                          │
│  Immutable. Verifiable. Eternal.                         │
└──────────────────────────────────────────────────────────┘
```

## φ-Aligned Constants

All timing and batching constants follow the golden ratio (φ = 1.618...).

| Constant | Value | Description |
|----------|-------|-------------|
| `ANCHOR_BATCH_SIZE` | 38 | Fibonacci number, items per batch |
| `ANCHOR_INTERVAL_MS` | 61,803 | φ × 38,197 ≈ 61,803ms (~1 min) |
| `MIN_BURN_AMOUNT` | 618,000,000 | φ⁻¹ SOL (0.618 SOL) in lamports |

```javascript
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;

// Timing follows φ ratios
const ANCHOR_INTERVAL_MS = 61_803;  // ~1 minute
const ANCHOR_BATCH_SIZE = 38;       // Fibonacci
```

## Usage

### Basic Integration

```javascript
import { CYNICNode, SolanaCluster, loadWalletFromFile } from '@cynic/node';

// Load wallet
const wallet = loadWalletFromFile('./wallet.json');

// Create node with anchor + burns
const node = new CYNICNode({
  name: 'my-node',
  anchor: {
    enabled: true,
    cluster: SolanaCluster.DEVNET,  // or MAINNET
    wallet: wallet,
    autoAnchor: true,  // Auto-batch on timer
  },
  burns: {
    enabled: true,
    minAmount: 618_000_000,  // φ⁻¹ SOL
  },
});

await node.start();

// Judge with burn verification
const result = await node.judge(
  { type: 'token', name: 'MyToken', symbol: 'MTK' },
  { burnTx: '5BURN_TX_SIGNATURE...' }
);

if (result.success) {
  console.log('Judgment:', result.judgment.verdict);
  console.log('Anchored:', result.anchored);
  console.log('Burn verified:', result.burnVerified);
}

await node.stop();  // Flushes pending anchors
```

### Without Burns (Anchoring Only)

```javascript
const node = new CYNICNode({
  anchor: { enabled: true, cluster: SolanaCluster.DEVNET, wallet },
  burns: { enabled: false },  // No burn verification
});

// Judge without burn proof
const result = await node.judge({ type: 'token', name: 'Test' });
```

### Simulation Mode (No Wallet)

```javascript
const node = new CYNICNode({
  anchor: { enabled: true },  // No wallet = simulation mode
  burns: { enabled: false },
});

// Judgments are "anchored" with simulated signatures
// Useful for testing without spending SOL
```

## Merkle Proofs

Each judgment gets a cryptographic proof linking it to the on-chain merkle root.

```javascript
// After anchoring, get proof for a judgment
const proof = node.anchorQueue.getProof(judgment.id);

console.log(proof);
// {
//   itemId: 'jdg_abc123...',
//   merkleRoot: 'cf5f90d8ee68c7b5...',
//   merkleProof: ['hash1', 'hash2', ...],
//   leafIndex: 0,
//   batchId: 'batch_xyz...',
//   signature: '4bAPBAeF5VV8obw...',
//   slot: 435882869,
//   timestamp: 1737161609000
// }
```

### Verifying a Proof

```javascript
import { verifyMerkleProof } from '@cynic/anchor';

const isValid = verifyMerkleProof(
  proof.itemId,
  proof.merkleRoot,
  proof.merkleProof,
  proof.leafIndex
);

// Then verify merkle root exists on Solana
// by checking the transaction at proof.signature
```

## Burns Verification

Burns create economic alignment - operators must burn to participate.

### API Integration

Burns are verified via `https://alonisthe.dev/burns`:

```javascript
const verifier = createBurnVerifier({
  apiUrl: 'https://alonisthe.dev/burns',  // Default
  timeout: 10000,
  cacheEnabled: true,
});

const result = await verifier.verify('5BURN_TX_SIGNATURE...', {
  minAmount: 618_000_000,       // Minimum burn required
  expectedBurner: 'OPERATOR_PUBKEY',  // Optional: verify burner
});

if (result.verified) {
  console.log('Amount burned:', result.amount / 1e9, 'SOL');
  console.log('Burner:', result.burner);
  console.log('Token:', result.token || 'SOL');
}
```

### Burn Status Codes

| Status | Description |
|--------|-------------|
| `BURN_REQUIRED` | Burns enabled but no `burnTx` in context |
| `BURN_INVALID` | Burn tx not found or verification failed |
| `BURN_INSUFFICIENT` | Amount below minimum threshold |
| `BURN_MISMATCH` | Burner doesn't match expected address |

## Solana Memo Format

CYNIC anchors merkle roots using the Solana Memo Program:

```
Program: MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr

Memo Format: CYNIC:POJ:<merkle_root_hex>

Example:
  CYNIC:POJ:cf5f90d8ee68c7b55593054bd48686825a16c52f6cfcadc4f9b5d6161a048ae9

  ├── CYNIC     = Protocol identifier
  ├── POJ       = Proof of Judgment
  └── <hex>     = 32-byte merkle root (64 hex chars)
```

## Wallet Management

### File-based Wallet (Solana CLI format)

```javascript
import { loadWalletFromFile, saveWalletToFile, generateWallet } from '@cynic/anchor';

// Generate new wallet
const wallet = generateWallet();
saveWalletToFile(wallet, './my-wallet.json');

// Load existing wallet
const wallet = loadWalletFromFile('./my-wallet.json');
console.log('Address:', wallet.publicKey);
```

### Environment Variable

```javascript
import { loadWalletFromEnv } from '@cynic/anchor';

// Reads from CYNIC_WALLET_KEY (base58 or JSON)
const wallet = loadWalletFromEnv();
```

## Node Stats

```javascript
const info = node.getInfo();

console.log(info.anchor);
// {
//   enabled: true,
//   cluster: 'https://api.devnet.solana.com',
//   stats: {
//     totalAnchored: 5,
//     totalItems: 47,
//     lastSignature: '4bAPBAeF5VV8...',
//   },
//   queue: {
//     length: 3,
//     stats: { totalQueued: 50, totalBatches: 5 }
//   }
// }

console.log(info.burns);
// {
//   enabled: true,
//   minAmount: 618000000,
//   stats: {
//     totalVerified: 42,
//     totalFailed: 3,
//     cacheSize: 45
//   }
// }
```

## Security Considerations

1. **Wallet Security**: Never commit wallet files. Use `.gitignore` and environment variables.

2. **Burns as Sybil Resistance**: Requiring burns prevents spam and aligns incentives.

3. **Merkle Proofs**: Anyone can verify a judgment's inclusion without trusting CYNIC.

4. **Immutability**: Once anchored, judgments cannot be altered or deleted.

## Costs

| Network | Anchor Cost | Notes |
|---------|-------------|-------|
| Devnet | Free | Use faucet for SOL |
| Mainnet | ~0.000005 SOL | Per transaction (~38 judgments) |

At current prices (~$20/SOL), anchoring 38 judgments costs ~$0.0001.

## Example Transaction

**Devnet Transaction**: [4bAPBAeF5VV8obwWcKS1yfzyEz4rdZH6Ki3EVsNAWg71Cz34E3bavYdUMcaSbAACQruzfbHm8MoyTGumb5xCccVu](https://explorer.solana.com/tx/4bAPBAeF5VV8obwWcKS1yfzyEz4rdZH6Ki3EVsNAWg71Cz34E3bavYdUMcaSbAACQruzfbHm8MoyTGumb5xCccVu?cluster=devnet)

```
Signature:    4bAPBAeF5VV8obwWcKS1yfzy...
Result:       Success
Slot:         435,882,869
Fee:          0.000005 SOL
Memo:         CYNIC:POJ:cf5f90d8ee68c7b55593054bd48686825a16c52f6cfcadc4f9b5d6161a048ae9
```

---

*"Onchain is truth - immutable, verifiable, eternal."* - κυνικός
