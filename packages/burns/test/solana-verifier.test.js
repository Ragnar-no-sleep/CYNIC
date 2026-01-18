/**
 * Solana On-Chain Burn Verifier Tests
 *
 * Tests for direct Solana blockchain verification.
 *
 * @module @cynic/burns/test/solana-verifier
 */

import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  SolanaBurnVerifier,
  createSolanaBurnVerifier,
  SolanaCluster,
  BURN_ADDRESSES,
} from '../src/solana-verifier.js';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('SolanaBurnVerifier - Unit Tests', () => {
  describe('Constructor', () => {
    test('should use default cluster (mainnet)', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier.cluster, SolanaCluster.MAINNET);
    });

    test('should accept custom cluster', () => {
      const verifier = new SolanaBurnVerifier({
        cluster: SolanaCluster.DEVNET,
      });
      assert.strictEqual(verifier.cluster, SolanaCluster.DEVNET);
    });

    test('should use confirmed commitment by default', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier.commitment, 'confirmed');
    });

    test('should accept custom commitment', () => {
      const verifier = new SolanaBurnVerifier({
        commitment: 'finalized',
      });
      assert.strictEqual(verifier.commitment, 'finalized');
    });

    test('should initialize cache', () => {
      const verifier = new SolanaBurnVerifier();
      assert.ok(verifier.cache instanceof Map);
      assert.strictEqual(verifier.cache.size, 0);
    });

    test('should initialize stats', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier.stats.totalVerified, 0);
      assert.strictEqual(verifier.stats.totalFailed, 0);
      assert.strictEqual(verifier.stats.totalRequests, 0);
      assert.strictEqual(verifier.stats.cacheHits, 0);
    });
  });

  describe('BURN_ADDRESSES', () => {
    test('should have SYSTEM address', () => {
      assert.ok(BURN_ADDRESSES.SYSTEM);
      assert.ok(BURN_ADDRESSES.SYSTEM.startsWith('1111'));
    });

    test('should have COMMON (incinerator) address', () => {
      assert.ok(BURN_ADDRESSES.COMMON);
      assert.ok(BURN_ADDRESSES.COMMON.includes('1nc1nerator'));
    });

    test('should have DEAD address', () => {
      assert.ok(BURN_ADDRESSES.DEAD);
      assert.ok(BURN_ADDRESSES.DEAD.toLowerCase().includes('dead'));
    });
  });

  describe('SolanaCluster', () => {
    test('should have MAINNET URL', () => {
      assert.strictEqual(SolanaCluster.MAINNET, 'https://api.mainnet-beta.solana.com');
    });

    test('should have DEVNET URL', () => {
      assert.strictEqual(SolanaCluster.DEVNET, 'https://api.devnet.solana.com');
    });

    test('should have TESTNET URL', () => {
      assert.strictEqual(SolanaCluster.TESTNET, 'https://api.testnet.solana.com');
    });
  });

  describe('_isBurnAddress', () => {
    test('should recognize SYSTEM burn address', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress(BURN_ADDRESSES.SYSTEM), true);
    });

    test('should recognize COMMON burn address', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress(BURN_ADDRESSES.COMMON), true);
    });

    test('should recognize DEAD burn address', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress(BURN_ADDRESSES.DEAD), true);
    });

    test('should recognize all-ones pattern', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress('11111111111111111111111111111111'), true);
      assert.strictEqual(verifier._isBurnAddress('1111111111111111111111111111111111111111111'), true);
    });

    test('should recognize addresses with burn in name', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress('burnXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'), true);
    });

    test('should recognize addresses with dead in name', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress('DEADBEEFDEADBEEFDEADBEEFDEADBEEF'), true);
    });

    test('should reject normal addresses', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress('So11111111111111111111111111111111111111112'), false);
      assert.strictEqual(verifier._isBurnAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), false);
    });

    test('should handle null/undefined', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._isBurnAddress(null), false);
      assert.strictEqual(verifier._isBurnAddress(undefined), false);
      assert.strictEqual(verifier._isBurnAddress(''), false);
    });
  });

  describe('Cache', () => {
    test('should cache verification results', () => {
      const verifier = new SolanaBurnVerifier();
      const mockResult = {
        verified: true,
        txSignature: 'test123',
        amount: 1000,
      };

      verifier._setCached('test123', mockResult);
      const cached = verifier._getCached('test123');

      assert.deepStrictEqual(cached, mockResult);
    });

    test('should return null for missing entries', () => {
      const verifier = new SolanaBurnVerifier();
      assert.strictEqual(verifier._getCached('nonexistent'), null);
    });

    test('should clear cache', () => {
      const verifier = new SolanaBurnVerifier();
      verifier._setCached('test1', { verified: true });
      verifier._setCached('test2', { verified: true });

      assert.strictEqual(verifier.cache.size, 2);
      verifier.clearCache();
      assert.strictEqual(verifier.cache.size, 0);
    });
  });

  describe('Stats', () => {
    test('should return stats', () => {
      const verifier = new SolanaBurnVerifier();
      const stats = verifier.getStats();

      assert.strictEqual(stats.totalVerified, 0);
      assert.strictEqual(stats.totalFailed, 0);
      assert.strictEqual(stats.totalRequests, 0);
      assert.strictEqual(stats.cacheHits, 0);
      assert.strictEqual(stats.cacheSize, 0);
      assert.strictEqual(stats.cluster, SolanaCluster.MAINNET);
    });
  });

  describe('Export/Import', () => {
    test('should export state', () => {
      const verifier = new SolanaBurnVerifier();
      verifier._setCached('test', { verified: true });
      verifier.stats.totalVerified = 5;

      const exported = verifier.export();

      assert.ok(Array.isArray(exported.cache));
      assert.strictEqual(exported.cache.length, 1);
      assert.strictEqual(exported.stats.totalVerified, 5);
    });

    test('should import state', () => {
      const verifier1 = new SolanaBurnVerifier();
      verifier1._setCached('test', { verified: true });
      verifier1.stats.totalVerified = 10;
      const exported = verifier1.export();

      const verifier2 = new SolanaBurnVerifier();
      verifier2.import(exported);

      assert.strictEqual(verifier2.cache.size, 1);
      assert.strictEqual(verifier2.stats.totalVerified, 10);
    });
  });

  describe('createSolanaBurnVerifier', () => {
    test('should create verifier instance', () => {
      const verifier = createSolanaBurnVerifier();
      assert.ok(verifier instanceof SolanaBurnVerifier);
    });

    test('should pass options', () => {
      const verifier = createSolanaBurnVerifier({
        cluster: SolanaCluster.DEVNET,
      });
      assert.strictEqual(verifier.cluster, SolanaCluster.DEVNET);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BURN ANALYSIS TESTS (with mocked transactions)
// ═══════════════════════════════════════════════════════════════════════════════

describe('SolanaBurnVerifier - Burn Analysis', () => {
  let verifier;

  beforeEach(() => {
    verifier = new SolanaBurnVerifier({ cluster: SolanaCluster.DEVNET });
  });

  describe('_analyzeBurn - SOL Burns', () => {
    test('should detect SOL transfer to burn address', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [
              {
                program: 'system',
                parsed: {
                  type: 'transfer',
                  info: {
                    source: 'Sender111111111111111111111111111111111111',
                    destination: BURN_ADDRESSES.SYSTEM,
                    lamports: 1_000_000_000, // 1 SOL
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'SOL_BURN');
      assert.strictEqual(result.amount, 1_000_000_000);
      assert.strictEqual(result.burnAddress, BURN_ADDRESSES.SYSTEM);
    });

    test('should detect SOL burn from balance changes', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [],
            accountKeys: [
              { pubkey: { toString: () => 'Sender111' } },
              { pubkey: { toString: () => BURN_ADDRESSES.SYSTEM } },
            ],
          },
        },
        meta: {
          innerInstructions: [],
          preBalances: [2_000_000_000, 0],
          postBalances: [1_000_000_000, 1_000_000_000],
        },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'SOL_BURN_INFERRED');
      assert.strictEqual(result.amount, 1_000_000_000);
    });
  });

  describe('_analyzeBurn - SPL Token Burns', () => {
    test('should detect direct token burn instruction', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                parsed: {
                  type: 'burn',
                  info: {
                    amount: '1000000',
                    mint: 'TokenMint111111111111111111111111111111111',
                    authority: 'BurnerAuthority111111111111111111111111111',
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_BURN');
      assert.strictEqual(result.amount, 1000000);
      assert.strictEqual(result.token, 'TokenMint111111111111111111111111111111111');
    });

    test('should detect burnChecked instruction', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                parsed: {
                  type: 'burnChecked',
                  info: {
                    tokenAmount: { amount: '500000' },
                    mint: 'CheckedMint11111111111111111111111111111111',
                    authority: 'Authority1111111111111111111111111111111111',
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_BURN');
      assert.strictEqual(result.amount, 500000);
    });

    test('should detect token transfer to burn address', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                parsed: {
                  type: 'transfer',
                  info: {
                    amount: '750000',
                    destination: BURN_ADDRESSES.COMMON,
                    authority: 'Sender1111111111111111111111111111111111111',
                    mint: 'TransferMint11111111111111111111111111111',
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_TRANSFER_BURN');
    });

    test('should detect Token 2022 burns', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' },
                parsed: {
                  type: 'burn',
                  info: {
                    amount: '2000000',
                    mint: 'Token2022Mint111111111111111111111111111',
                    authority: 'Owner111111111111111111111111111111111111',
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_BURN');
    });
  });

  describe('_analyzeBurn - Account Close', () => {
    test('should detect account close as burn', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [
              {
                programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                parsed: {
                  type: 'closeAccount',
                  info: {
                    owner: 'AccountOwner11111111111111111111111111111',
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'ACCOUNT_CLOSE');
    });
  });

  describe('_analyzeBurn - Non-Burns', () => {
    test('should reject regular transfers', () => {
      const tx = {
        transaction: {
          message: {
            instructions: [
              {
                program: 'system',
                parsed: {
                  type: 'transfer',
                  info: {
                    source: 'Sender111111111111111111111111111111111111',
                    destination: 'NormalReceiver111111111111111111111111111',
                    lamports: 1_000_000_000,
                  },
                },
              },
            ],
          },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, false);
      assert.ok(result.reason);
    });

    test('should reject empty transactions', () => {
      const tx = {
        transaction: {
          message: { instructions: [] },
        },
        meta: { innerInstructions: [] },
      };

      const result = verifier._analyzeBurn(tx);

      assert.strictEqual(result.isBurn, false);
    });
  });
});
