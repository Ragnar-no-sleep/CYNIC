/**
 * Burns API Unit Tests
 *
 * "Don't extract, burn" - κυνικός
 *
 * @module @cynic/node/test/burns-api
 */

import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { BurnsAPI, setupBurnsRoutes } from '../src/api/burns-api.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mock transaction: SOL transfer to burn address
 */
const mockSolBurnTx = {
  slot: 300000000,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: null },
  transaction: {
    message: {
      instructions: [
        {
          program: 'system',
          parsed: {
            type: 'transfer',
            info: {
              source: 'SourceWallet111111111111111111111111111111',
              destination: '1111111111111111111111111111111111',
              lamports: 1000000000,
            },
          },
        },
      ],
      accountKeys: [],
    },
  },
};

/**
 * Mock transaction: SPL Token burn instruction
 */
const mockTokenBurnTx = {
  slot: 300000001,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: null, innerInstructions: [] },
  transaction: {
    message: {
      instructions: [
        {
          programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          parsed: {
            type: 'burn',
            info: {
              amount: '500000000',
              mint: 'TokenMint111111111111111111111111111111111',
              authority: 'BurnerAuthority11111111111111111111111111',
            },
          },
        },
      ],
      accountKeys: [],
    },
  },
};

/**
 * Mock transaction: SPL Token burnChecked instruction
 */
const mockTokenBurnCheckedTx = {
  slot: 300000002,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: null, innerInstructions: [] },
  transaction: {
    message: {
      instructions: [
        {
          programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          parsed: {
            type: 'burnChecked',
            info: {
              tokenAmount: { amount: '1000000000' },
              mint: 'TokenMint222222222222222222222222222222222',
              authority: 'BurnerAuthority22222222222222222222222222',
            },
          },
        },
      ],
      accountKeys: [],
    },
  },
};

/**
 * Mock transaction: Token transfer to burn address
 */
const mockTokenTransferBurnTx = {
  slot: 300000003,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: null, innerInstructions: [] },
  transaction: {
    message: {
      instructions: [
        {
          programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          parsed: {
            type: 'transfer',
            info: {
              amount: '250000000',
              mint: 'TokenMint333333333333333333333333333333333',
              source: 'SourceAccount3333333333333333333333333333',
              destination: '1nc1nerator11111111111111111111111111111111',
              authority: 'TransferAuth333333333333333333333333333333',
            },
          },
        },
      ],
      accountKeys: [],
    },
  },
};

/**
 * Mock transaction: Account close
 */
const mockAccountCloseTx = {
  slot: 300000004,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: null, innerInstructions: [] },
  transaction: {
    message: {
      instructions: [
        {
          programId: { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          parsed: {
            type: 'closeAccount',
            info: {
              owner: 'AccountOwner44444444444444444444444444444',
              account: 'ClosedAccount4444444444444444444444444444',
              destination: 'RentReceiver444444444444444444444444444444',
            },
          },
        },
      ],
      accountKeys: [],
    },
  },
};

/**
 * Mock transaction: Regular transfer (not a burn)
 */
const mockRegularTransferTx = {
  slot: 300000005,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: null, innerInstructions: [] },
  transaction: {
    message: {
      instructions: [
        {
          program: 'system',
          parsed: {
            type: 'transfer',
            info: {
              source: 'Sender555555555555555555555555555555555555',
              destination: 'Receiver55555555555555555555555555555555',
              lamports: 1000000000,
            },
          },
        },
      ],
      accountKeys: [],
    },
  },
};

/**
 * Mock transaction: Failed transaction
 */
const mockFailedTx = {
  slot: 300000006,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: { InstructionError: [0, 'InsufficientFunds'] } },
  transaction: {
    message: {
      instructions: [],
      accountKeys: [],
    },
  },
};

/**
 * Mock transaction: Token 2022 burn
 */
const mockToken2022BurnTx = {
  slot: 300000007,
  blockTime: Math.floor(Date.now() / 1000),
  meta: { err: null, innerInstructions: [] },
  transaction: {
    message: {
      instructions: [
        {
          programId: { toString: () => 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' },
          parsed: {
            type: 'burn',
            info: {
              amount: '999000000',
              mint: 'Token2022Mint77777777777777777777777777777',
              authority: 'Token2022Auth77777777777777777777777777777',
            },
          },
        },
      ],
      accountKeys: [],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: BurnsAPI Class
// ═══════════════════════════════════════════════════════════════════════════════

describe('BurnsAPI', () => {
  describe('constructor', () => {
    it('should use default options', () => {
      const api = new BurnsAPI();

      assert.ok(api.cluster.includes('mainnet'), 'Default cluster should be mainnet');
      assert.strictEqual(api.commitment, 'confirmed');
      assert.ok(api.connection, 'Should have connection');
      assert.ok(api.cache instanceof Map, 'Should have cache Map');
    });

    it('should accept custom cluster', () => {
      const api = new BurnsAPI({ cluster: 'https://api.devnet.solana.com' });

      assert.strictEqual(api.cluster, 'https://api.devnet.solana.com');
    });

    it('should accept custom commitment', () => {
      const api = new BurnsAPI({ commitment: 'finalized' });

      assert.strictEqual(api.commitment, 'finalized');
    });

    it('should initialize stats to zero', () => {
      const api = new BurnsAPI();

      assert.strictEqual(api.stats.totalVerified, 0);
      assert.strictEqual(api.stats.totalFailed, 0);
      assert.strictEqual(api.stats.totalRequests, 0);
      assert.strictEqual(api.stats.cacheHits, 0);
    });
  });

  describe('_isBurnAddress', () => {
    let api;

    before(() => {
      api = new BurnsAPI();
    });

    it('should recognize system burn address (all 1s)', () => {
      assert.strictEqual(api._isBurnAddress('1111111111111111111111111111111111'), true);
    });

    it('should recognize incinerator address', () => {
      assert.strictEqual(api._isBurnAddress('1nc1nerator11111111111111111111111111111111'), true);
    });

    it('should recognize dead address pattern', () => {
      assert.strictEqual(api._isBurnAddress('DeaDDeaDDeaDDeaDDeaDDeaDDeaDDeaDDeaDDeaDDe'), true);
    });

    it('should recognize addresses starting with many 1s', () => {
      assert.strictEqual(api._isBurnAddress('11111111111111111111SomeAddress'), true);
    });

    it('should recognize addresses containing "burn"', () => {
      assert.strictEqual(api._isBurnAddress('SomeBurnAddress123456789012345678901234'), true);
    });

    it('should recognize addresses containing "dead"', () => {
      assert.strictEqual(api._isBurnAddress('SomeDeadAddress123456789012345678901234'), true);
    });

    it('should recognize addresses containing "null"', () => {
      assert.strictEqual(api._isBurnAddress('SomeNullAddress123456789012345678901234'), true);
    });

    it('should return false for regular addresses', () => {
      assert.strictEqual(api._isBurnAddress('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'), false);
    });

    it('should return false for null', () => {
      assert.strictEqual(api._isBurnAddress(null), false);
    });

    it('should return false for undefined', () => {
      assert.strictEqual(api._isBurnAddress(undefined), false);
    });

    it('should handle PublicKey-like objects', () => {
      const mockPubkey = { toString: () => '1111111111111111111111111111111111' };
      assert.strictEqual(api._isBurnAddress(mockPubkey), true);
    });
  });

  describe('_analyzeBurn', () => {
    let api;

    before(() => {
      api = new BurnsAPI();
    });

    it('should detect SOL burn (transfer to burn address)', () => {
      const result = api._analyzeBurn(mockSolBurnTx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'SOL_BURN');
      assert.strictEqual(result.amount, 1000000000);
      assert.strictEqual(result.burner, 'SourceWallet111111111111111111111111111111');
      assert.strictEqual(result.burnAddress, '1111111111111111111111111111111111');
    });

    it('should detect SPL Token burn instruction', () => {
      const result = api._analyzeBurn(mockTokenBurnTx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_BURN');
      assert.strictEqual(result.amount, 500000000);
      assert.strictEqual(result.token, 'TokenMint111111111111111111111111111111111');
      assert.strictEqual(result.burner, 'BurnerAuthority11111111111111111111111111');
    });

    it('should detect SPL Token burnChecked instruction', () => {
      const result = api._analyzeBurn(mockTokenBurnCheckedTx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_BURN');
      assert.strictEqual(result.amount, 1000000000);
      assert.strictEqual(result.token, 'TokenMint222222222222222222222222222222222');
    });

    it('should detect token transfer to burn address', () => {
      const result = api._analyzeBurn(mockTokenTransferBurnTx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_TRANSFER_BURN');
      assert.strictEqual(result.amount, 250000000);
      assert.strictEqual(result.burnAddress, '1nc1nerator11111111111111111111111111111111');
    });

    it('should detect account close as burn', () => {
      const result = api._analyzeBurn(mockAccountCloseTx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'ACCOUNT_CLOSE');
      assert.strictEqual(result.burner, 'AccountOwner44444444444444444444444444444');
    });

    it('should detect Token 2022 burn', () => {
      const result = api._analyzeBurn(mockToken2022BurnTx);

      assert.strictEqual(result.isBurn, true);
      assert.strictEqual(result.type, 'TOKEN_BURN');
      assert.strictEqual(result.amount, 999000000);
      assert.strictEqual(result.token, 'Token2022Mint77777777777777777777777777777');
    });

    it('should NOT detect regular transfer as burn', () => {
      const result = api._analyzeBurn(mockRegularTransferTx);

      assert.strictEqual(result.isBurn, false);
      assert.ok(result.reason);
    });

    it('should handle transaction with no instructions', () => {
      const emptyTx = {
        transaction: { message: { instructions: [] } },
        meta: { innerInstructions: [] },
      };
      const result = api._analyzeBurn(emptyTx);

      assert.strictEqual(result.isBurn, false);
    });
  });

  describe('caching', () => {
    let api;

    beforeEach(() => {
      api = new BurnsAPI();
    });

    it('should cache results', () => {
      const data = { verified: true, amount: 1000 };
      api._setCached('sig123', data);

      const cached = api._getCached('sig123');
      assert.deepStrictEqual(cached, data);
    });

    it('should return null for non-existent cache entry', () => {
      const cached = api._getCached('nonexistent');
      assert.strictEqual(cached, null);
    });

    it('should expire cache entries after TTL', () => {
      const data = { verified: true, amount: 1000 };
      api._setCached('sig456', data);

      // Manually expire the entry
      const entry = api.cache.get('sig456');
      entry.timestamp = Date.now() - api.cacheTtl - 1000;

      const cached = api._getCached('sig456');
      assert.strictEqual(cached, null);
      assert.strictEqual(api.cache.has('sig456'), false, 'Expired entry should be deleted');
    });

    it('should clear cache', () => {
      api._setCached('sig1', { a: 1 });
      api._setCached('sig2', { b: 2 });

      assert.strictEqual(api.cache.size, 2);

      api.clearCache();

      assert.strictEqual(api.cache.size, 0);
    });
  });

  describe('getStats', () => {
    it('should return stats object', () => {
      const api = new BurnsAPI({ cluster: 'https://api.devnet.solana.com' });
      api.stats.totalVerified = 10;
      api.stats.totalFailed = 2;
      api._setCached('test', {});

      const stats = api.getStats();

      assert.strictEqual(stats.totalVerified, 10);
      assert.strictEqual(stats.totalFailed, 2);
      assert.strictEqual(stats.cacheSize, 1);
      assert.strictEqual(stats.cluster, 'https://api.devnet.solana.com');
    });
  });

  describe('verify', () => {
    it('should return cached result on cache hit', async () => {
      const api = new BurnsAPI();
      const cachedData = {
        verified: true,
        txSignature: 'cachedSig123',
        amount: 999,
        burnType: 'TOKEN_BURN',
      };
      api._setCached('cachedSig123', cachedData);

      const result = await api.verify('cachedSig123');

      assert.strictEqual(result.cached, true);
      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.amount, 999);
      assert.strictEqual(api.stats.cacheHits, 1);
    });

    it('should increment totalRequests on each call', async () => {
      const api = new BurnsAPI();
      api._setCached('sig1', { verified: true });
      api._setCached('sig2', { verified: true });

      await api.verify('sig1');
      await api.verify('sig2');

      assert.strictEqual(api.stats.totalRequests, 2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Express Routes
// ═══════════════════════════════════════════════════════════════════════════════

describe('setupBurnsRoutes', () => {
  let mockApp;
  let registeredRoutes;

  beforeEach(() => {
    registeredRoutes = {};
    mockApp = {
      get: mock.fn((path, handler) => {
        registeredRoutes[`GET ${path}`] = handler;
      }),
      post: mock.fn((path, handler) => {
        registeredRoutes[`POST ${path}`] = handler;
      }),
    };
  });

  it('should register all required routes', () => {
    setupBurnsRoutes(mockApp);

    assert.ok(registeredRoutes['GET /burns/verify/:signature'], 'Should register verify route');
    assert.ok(registeredRoutes['GET /burns/stats'], 'Should register stats route');
    assert.ok(registeredRoutes['POST /burns/verify'], 'Should register batch verify route');
  });

  it('should return BurnsAPI service', () => {
    const service = setupBurnsRoutes(mockApp);

    assert.ok(service instanceof BurnsAPI);
  });

  it('should accept cluster option', () => {
    const service = setupBurnsRoutes(mockApp, { cluster: 'https://api.devnet.solana.com' });

    assert.strictEqual(service.cluster, 'https://api.devnet.solana.com');
  });

  describe('GET /burns/verify/:signature', () => {
    it('should return 400 for invalid signature format', async () => {
      setupBurnsRoutes(mockApp);
      const handler = registeredRoutes['GET /burns/verify/:signature'];

      const mockReq = { params: { signature: 'invalid!' } };
      const mockRes = {
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      };

      await handler(mockReq, mockRes);

      assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
      assert.strictEqual(mockRes.json.mock.calls[0].arguments[0].verified, false);
      assert.ok(mockRes.json.mock.calls[0].arguments[0].error.includes('Invalid signature'));
    });

    it('should accept valid base58 signature format', async () => {
      const service = setupBurnsRoutes(mockApp);
      const handler = registeredRoutes['GET /burns/verify/:signature'];

      // Pre-cache a result to avoid network call
      // Valid base58: no 0, O, I, l characters, length 64-88
      const sig = '5xRp3sMKgShdkzNBgH6mP4Tf9B3yKajLJxqR8pK3LjCHdcVn7qJ2eFzG8UvEJyNw';
      service._setCached(sig, { verified: true, amount: 100 });

      const mockReq = { params: { signature: sig } };
      const mockRes = {
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      };

      await handler(mockReq, mockRes);

      // Should call json directly (200 OK) for verified result
      assert.strictEqual(mockRes.json.mock.calls.length, 1);
      assert.strictEqual(mockRes.json.mock.calls[0].arguments[0].verified, true);
    });
  });

  describe('GET /burns/stats', () => {
    it('should return stats', () => {
      const service = setupBurnsRoutes(mockApp);
      const handler = registeredRoutes['GET /burns/stats'];

      service.stats.totalVerified = 42;
      service.stats.totalFailed = 5;

      const mockReq = {};
      const mockRes = {
        json: mock.fn(),
      };

      handler(mockReq, mockRes);

      const stats = mockRes.json.mock.calls[0].arguments[0];
      assert.strictEqual(stats.totalVerified, 42);
      assert.strictEqual(stats.totalFailed, 5);
    });
  });

  describe('POST /burns/verify', () => {
    it('should return 400 for missing signatures array', async () => {
      setupBurnsRoutes(mockApp);
      const handler = registeredRoutes['POST /burns/verify'];

      const mockReq = { body: {} };
      const mockRes = {
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      };

      await handler(mockReq, mockRes);

      assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
      assert.ok(mockRes.json.mock.calls[0].arguments[0].error.includes('signatures array'));
    });

    it('should return 400 for empty signatures array', async () => {
      setupBurnsRoutes(mockApp);
      const handler = registeredRoutes['POST /burns/verify'];

      const mockReq = { body: { signatures: [] } };
      const mockRes = {
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      };

      await handler(mockReq, mockRes);

      assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
    });

    it('should return 400 for too many signatures', async () => {
      setupBurnsRoutes(mockApp);
      const handler = registeredRoutes['POST /burns/verify'];

      const mockReq = {
        body: { signatures: Array(11).fill('sig') },
      };
      const mockRes = {
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      };

      await handler(mockReq, mockRes);

      assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
      assert.ok(mockRes.json.mock.calls[0].arguments[0].error.includes('Maximum 10'));
    });

    it('should process batch of signatures', async () => {
      const service = setupBurnsRoutes(mockApp);
      const handler = registeredRoutes['POST /burns/verify'];

      // Pre-cache results
      service._setCached('sig1', { verified: true, amount: 100 });
      service._setCached('sig2', { verified: false, error: 'Not a burn' });

      const mockReq = {
        body: { signatures: ['sig1', 'sig2'] },
      };
      const mockRes = {
        json: mock.fn(),
      };

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0].arguments[0];
      assert.ok(response.results);
      assert.strictEqual(response.results.sig1.verified, true);
      assert.strictEqual(response.results.sig2.verified, false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tests: Integration with Mock Connection
// ═══════════════════════════════════════════════════════════════════════════════

describe('BurnsAPI Integration', () => {
  it('should verify SOL burn with mocked connection', async () => {
    const api = new BurnsAPI();

    // Mock the connection's getParsedTransaction method
    api.connection.getParsedTransaction = mock.fn(async () => mockSolBurnTx);

    const result = await api.verify('mockSolBurnSig123456789012345678901234567890123456789012');

    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.burnType, 'SOL_BURN');
    assert.strictEqual(result.amount, 1000000000);
    assert.strictEqual(api.stats.totalVerified, 1);
  });

  it('should verify Token burn with mocked connection', async () => {
    const api = new BurnsAPI();

    api.connection.getParsedTransaction = mock.fn(async () => mockTokenBurnTx);

    const result = await api.verify('mockTokenBurnSig12345678901234567890123456789012345678901');

    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.burnType, 'TOKEN_BURN');
    assert.strictEqual(result.token, 'TokenMint111111111111111111111111111111111');
  });

  it('should reject non-burn transaction', async () => {
    const api = new BurnsAPI();

    api.connection.getParsedTransaction = mock.fn(async () => mockRegularTransferTx);

    const result = await api.verify('mockRegularSig12345678901234567890123456789012345678901234');

    assert.strictEqual(result.verified, false);
    assert.ok(result.error.includes('Not a burn') || result.error.includes('No burn pattern'));
    assert.strictEqual(api.stats.totalFailed, 1);
  });

  it('should handle transaction not found', async () => {
    const api = new BurnsAPI();

    api.connection.getParsedTransaction = mock.fn(async () => null);

    const result = await api.verify('nonexistentSig123456789012345678901234567890123456789012');

    assert.strictEqual(result.verified, false);
    assert.ok(result.error.includes('not found'));
    assert.strictEqual(api.stats.totalFailed, 1);
  });

  it('should handle failed transaction', async () => {
    const api = new BurnsAPI();

    api.connection.getParsedTransaction = mock.fn(async () => mockFailedTx);

    const result = await api.verify('failedTxSig1234567890123456789012345678901234567890123456');

    assert.strictEqual(result.verified, false);
    assert.ok(result.error.includes('failed'));
    assert.strictEqual(api.stats.totalFailed, 1);
  });

  it('should handle connection errors', async () => {
    const api = new BurnsAPI();

    api.connection.getParsedTransaction = mock.fn(async () => {
      throw new Error('Network error');
    });

    const result = await api.verify('errorSig123456789012345678901234567890123456789012345678');

    assert.strictEqual(result.verified, false);
    assert.ok(result.error.includes('Network error'));
    assert.strictEqual(api.stats.totalFailed, 1);
  });

  it('should cache verified burns', async () => {
    const api = new BurnsAPI();

    api.connection.getParsedTransaction = mock.fn(async () => mockTokenBurnTx);

    const sig = 'cacheTestSig123456789012345678901234567890123456789012345678';

    // First call - should hit network
    const result1 = await api.verify(sig);
    assert.strictEqual(result1.verified, true);
    assert.strictEqual(result1.cached, false);
    assert.strictEqual(api.connection.getParsedTransaction.mock.calls.length, 1);

    // Second call - should hit cache
    const result2 = await api.verify(sig);
    assert.strictEqual(result2.verified, true);
    assert.strictEqual(result2.cached, true);
    assert.strictEqual(api.connection.getParsedTransaction.mock.calls.length, 1); // No additional call
    assert.strictEqual(api.stats.cacheHits, 1);
  });
});

console.log('🔥 Burns API tests loaded');
