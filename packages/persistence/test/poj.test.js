/**
 * PoJ Chain Tests
 *
 * @module @cynic/persistence/test/poj
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  PoJBlockHeader,
  PoJBlock,
  Attestation,
  JudgmentRef,
  computeMerkleRoot,
  createGenesisBlock,
  createBlock,
  POJ_CONSTANTS,
  PoJChain,
} from '../src/poj/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DATA_DIR = path.join(__dirname, '../.test-data-poj');

describe('Merkle Root', () => {
  it('should compute consistent merkle root for empty array', () => {
    const root1 = computeMerkleRoot([]);
    const root2 = computeMerkleRoot([]);
    assert.strictEqual(root1, root2);
  });

  it('should compute different roots for different data', () => {
    const root1 = computeMerkleRoot(['cid1', 'cid2']);
    const root2 = computeMerkleRoot(['cid1', 'cid3']);
    assert.notStrictEqual(root1, root2);
  });

  it('should handle single item', () => {
    const root = computeMerkleRoot(['single-cid']);
    assert.ok(root.length === 64, 'Should be SHA-256 hex (64 chars)');
  });

  it('should handle odd number of items', () => {
    const root = computeMerkleRoot(['cid1', 'cid2', 'cid3']);
    assert.ok(root.length === 64);
  });
});

describe('PoJ Block Header', () => {
  it('should create header with required fields', () => {
    const header = new PoJBlockHeader({
      slot: 42,
      timestamp: Date.now(),
      prevHash: 'abc123',
      judgmentsRoot: 'def456',
      proposer: 'node_1',
    });

    assert.strictEqual(header.slot, 42);
    assert.strictEqual(header.prevHash, 'abc123');
    assert.strictEqual(header.proposer, 'node_1');
  });

  it('should compute deterministic hash', () => {
    const header = new PoJBlockHeader({
      slot: 1,
      timestamp: 1000000,
      prevHash: 'prev',
      judgmentsRoot: 'root',
      proposer: 'node',
    });

    const hash1 = header.hash();
    const hash2 = header.hash();

    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
  });

  it('should serialize and deserialize', () => {
    const header = new PoJBlockHeader({
      slot: 10,
      timestamp: Date.now(),
      prevHash: 'prev123',
      judgmentsRoot: 'root456',
      proposer: 'node_test',
    });

    const json = header.toJSON();
    const restored = PoJBlockHeader.fromJSON(json);

    assert.strictEqual(restored.slot, header.slot);
    assert.strictEqual(restored.prevHash, header.prevHash);
    assert.strictEqual(restored.proposer, header.proposer);
  });
});

describe('Attestation', () => {
  it('should create and sign attestation', () => {
    const attestation = new Attestation({
      nodeId: 'node_1',
      slot: 5,
      blockHash: 'blockhash123',
    });

    attestation.sign('secret_key');

    assert.ok(attestation.signature);
    assert.strictEqual(attestation.signature.length, 64);
  });

  it('should verify valid signature', () => {
    const key = 'shared_key';
    const attestation = new Attestation({
      nodeId: 'node_2',
      slot: 10,
      blockHash: 'hash456',
    }).sign(key);

    assert.ok(attestation.verify(key));
  });

  it('should reject invalid signature', () => {
    const attestation = new Attestation({
      nodeId: 'node_3',
      slot: 15,
      blockHash: 'hash789',
    }).sign('correct_key');

    assert.ok(!attestation.verify('wrong_key'));
  });
});

describe('PoJ Block', () => {
  it('should create genesis block', () => {
    const genesis = createGenesisBlock('genesis_proposer');

    assert.strictEqual(genesis.slot, 0);
    assert.strictEqual(genesis.prevHash, null);
    assert.strictEqual(genesis.proposer, 'genesis_proposer');
    assert.ok(genesis.finalized);
  });

  it('should create block with judgments', () => {
    const genesis = createGenesisBlock('node_1');
    const judgments = [
      { id: 'jdg_1', cid: 'cid1', qScore: 75, verdict: 'WAG' },
      { id: 'jdg_2', cid: 'cid2', qScore: 85, verdict: 'WAG' },
    ];

    const block = createBlock({
      slot: 1,
      prevBlock: genesis,
      judgments,
      proposer: 'node_1',
    });

    assert.strictEqual(block.slot, 1);
    assert.strictEqual(block.prevHash, genesis.hash);
    assert.strictEqual(block.judgmentCount, 2);
    assert.ok(!block.finalized);
  });

  it('should validate block structure', () => {
    const genesis = createGenesisBlock('node_1');
    const validation = genesis.validate();

    assert.ok(validation.valid);
    assert.strictEqual(validation.errors.length, 0);
  });

  it('should encode and decode block', () => {
    const genesis = createGenesisBlock('node_1');
    const encoded = genesis.encode();

    assert.ok(Buffer.isBuffer(encoded));

    const decoded = PoJBlock.decode(encoded);
    assert.strictEqual(decoded.slot, genesis.slot);
    assert.strictEqual(decoded.proposer, genesis.proposer);
  });

  it('should check quorum', () => {
    const genesis = createGenesisBlock('node_1');
    const judgments = [
      { id: 'jdg_1', cid: 'cid1', qScore: 75, verdict: 'WAG' },
    ];

    const block = createBlock({
      slot: 1,
      prevBlock: genesis,
      judgments,
      proposer: 'node_1',
    });

    // Add attestations
    for (let i = 0; i < 3; i++) {
      const attestation = new Attestation({
        nodeId: `node_${i}`,
        slot: 1,
        blockHash: block.hash,
      }).sign(`key_${i}`);
      block.addAttestation(attestation);
    }

    // 3/5 = 60% < 61.8% - no quorum
    assert.ok(!block.hasQuorum(5));

    // 3/4 = 75% > 61.8% - has quorum
    assert.ok(block.hasQuorum(4));
  });

  it('should reject duplicate attestations', () => {
    const genesis = createGenesisBlock('node_1');
    const block = createBlock({
      slot: 1,
      prevBlock: genesis,
      judgments: [],
      proposer: 'node_1',
    });

    const attestation = new Attestation({
      nodeId: 'node_1',
      slot: 1,
      blockHash: block.hash,
    }).sign('key');

    assert.ok(block.addAttestation(attestation));
    assert.ok(!block.addAttestation(attestation)); // Duplicate
  });
});

describe('PoJ Chain', async () => {
  let chain;

  before(async () => {
    await fs.mkdir(TEST_DATA_DIR, { recursive: true });
    chain = new PoJChain({
      basePath: TEST_DATA_DIR,
      nodeId: 'test_node',
      nodeKey: 'test_key',
    });
    await chain.init();
  });

  after(async () => {
    chain.stopSlotTimer();
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  it('should initialize with genesis block', () => {
    assert.ok(chain.genesis);
    assert.strictEqual(chain.headSlot, 0);
    assert.strictEqual(chain.height, 1);
  });

  it('should add judgments to pool', () => {
    const added = chain.addJudgment({
      id: 'jdg_test_1',
      cid: 'test_cid_1',
      qScore: 72,
      verdict: 'WAG',
    });

    assert.ok(added);
    assert.strictEqual(chain.pool.size, 1);
  });

  it('should propose and process block', async () => {
    // Add more judgments
    chain.addJudgment({
      id: 'jdg_test_2',
      cid: 'test_cid_2',
      qScore: 80,
      verdict: 'WAG',
    });

    const block = await chain.proposeBlock();
    assert.ok(block);
    assert.strictEqual(block.slot, 1);

    const result = await chain.processBlock(block);
    assert.ok(result.success);
    assert.strictEqual(chain.headSlot, 1);
  });

  it('should reject invalid slot', async () => {
    const invalidBlock = createBlock({
      slot: 100, // Wrong slot
      prevBlock: chain.head,
      judgments: [],
      proposer: 'test_node',
    });

    const result = await chain.processBlock(invalidBlock);
    assert.ok(!result.success);
    assert.ok(result.error.includes('Invalid slot'));
  });

  it('should get block by slot', async () => {
    const block = await chain.getBlockBySlot(0);
    assert.ok(block);
    assert.strictEqual(block.slot, 0);
  });

  it('should get block by hash', async () => {
    const genesis = chain.genesis;
    const block = await chain.getBlockByHash(genesis.hash);
    assert.ok(block);
    assert.strictEqual(block.slot, genesis.slot);
  });

  it('should find judgment block', async () => {
    const block = await chain.findJudgmentBlock('jdg_test_1');
    assert.ok(block);
    assert.strictEqual(block.slot, 1);
  });

  it('should verify chain integrity', async () => {
    const result = await chain.verifyChain();
    assert.ok(result.valid);
    assert.ok(result.blocksChecked >= 2);
  });

  it('should get chain stats', async () => {
    const stats = await chain.getStats();

    assert.ok(stats.genesisHash);
    assert.ok(stats.headHash);
    assert.strictEqual(stats.headSlot, 1);
    assert.ok(stats.totalJudgments >= 2);
  });

  it('should register validators', () => {
    chain.registerValidator('node_2');
    chain.registerValidator('node_3');

    assert.ok(chain.isValidator('node_2'));
    assert.ok(chain.isValidator('node_3'));
    assert.strictEqual(chain.validatorCount, 3); // Including test_node
  });

  it('should process attestations', async () => {
    const head = chain.head;
    const attestation = new Attestation({
      nodeId: 'node_2',
      slot: head.slot,
      blockHash: head.hash,
    }).sign('key_2');

    const processed = await chain.processAttestation(attestation);
    assert.ok(processed);
  });

  it('should get judgment proof', async () => {
    const proof = await chain.getJudgmentProof('jdg_test_1');
    assert.ok(proof);
    assert.strictEqual(proof.judgmentId, 'jdg_test_1');
    assert.ok(proof.blockSlot >= 0);
    assert.ok(proof.judgmentsRoot);
  });

  it('should get recent blocks', async () => {
    const blocks = await chain.getRecentBlocks(5);
    assert.ok(blocks.length >= 2);
    assert.strictEqual(blocks[blocks.length - 1].slot, chain.headSlot);
  });
});

describe('POJ Constants', () => {
  it('should have correct φ values', () => {
    assert.ok(Math.abs(POJ_CONSTANTS.PHI - 1.618033988749895) < 0.0001);
    assert.ok(Math.abs(POJ_CONSTANTS.PHI_INV - 0.618033988749895) < 0.0001);
  });

  it('should have correct slot duration', () => {
    assert.strictEqual(POJ_CONSTANTS.SLOT_DURATION_MS, 61.8);
  });

  it('should have Fibonacci batch size', () => {
    assert.strictEqual(POJ_CONSTANTS.MAX_JUDGMENTS_PER_BLOCK, 13);
  });

  it('should have φ⁻¹ quorum threshold', () => {
    assert.strictEqual(POJ_CONSTANTS.QUORUM_THRESHOLD, POJ_CONSTANTS.PHI_INV);
  });
});

console.log('*tail wag* PoJ Chain tests ready to run.');
