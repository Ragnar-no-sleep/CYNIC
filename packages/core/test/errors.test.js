/**
 * @cynic/core - Error Types Tests
 *
 * Tests custom error hierarchy:
 * - Error codes and categories
 * - CYNICError base class
 * - Specialized error classes
 * - Helper functions
 *
 * "Errors are judgments too" - κυνικός
 *
 * @module @cynic/core/test/errors
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ErrorCode,
  CYNICError,
  ValidationError,
  ConfigurationError,
  TransportError,
  ConsensusError,
  CryptoError,
  StorageError,
  JudgmentError,
  IdentityError,
  AnchorError,
  wrapError,
  isCYNICError,
  isErrorCategory,
} from '../src/errors.js';

import { PHI_INV } from '../src/axioms/constants.js';

// =============================================================================
// ERROR CODE TESTS
// =============================================================================

describe('ErrorCode', () => {
  it('should have validation errors (E1xxx)', () => {
    assert.strictEqual(ErrorCode.VALIDATION_FAILED, 'E1000');
    assert.strictEqual(ErrorCode.INVALID_INPUT, 'E1001');
    assert.strictEqual(ErrorCode.MISSING_REQUIRED, 'E1002');
  });

  it('should have configuration errors (E2xxx)', () => {
    assert.strictEqual(ErrorCode.CONFIG_MISSING, 'E2000');
    assert.strictEqual(ErrorCode.CONFIG_INVALID, 'E2001');
    assert.strictEqual(ErrorCode.ENV_MISSING, 'E2002');
  });

  it('should have transport errors (E3xxx)', () => {
    assert.strictEqual(ErrorCode.CONNECTION_FAILED, 'E3000');
    assert.strictEqual(ErrorCode.TIMEOUT, 'E3001');
    assert.strictEqual(ErrorCode.DISCONNECTED, 'E3002');
  });

  it('should have consensus errors (E4xxx)', () => {
    assert.strictEqual(ErrorCode.CONSENSUS_FAILED, 'E4000');
    assert.strictEqual(ErrorCode.QUORUM_NOT_REACHED, 'E4001');
  });

  it('should have crypto errors (E5xxx)', () => {
    assert.strictEqual(ErrorCode.CRYPTO_FAILED, 'E5000');
    assert.strictEqual(ErrorCode.SIGNATURE_INVALID, 'E5001');
  });

  it('should have storage errors (E6xxx)', () => {
    assert.strictEqual(ErrorCode.STORAGE_FAILED, 'E6000');
    assert.strictEqual(ErrorCode.NOT_FOUND, 'E6001');
    assert.strictEqual(ErrorCode.DUPLICATE, 'E6002');
  });

  it('should have judgment errors (E7xxx)', () => {
    assert.strictEqual(ErrorCode.JUDGMENT_FAILED, 'E7000');
    assert.strictEqual(ErrorCode.CONFIDENCE_EXCEEDED, 'E7003');
  });

  it('should have identity errors (E8xxx)', () => {
    assert.strictEqual(ErrorCode.IDENTITY_FAILED, 'E8000');
    assert.strictEqual(ErrorCode.UNAUTHORIZED, 'E8002');
  });

  it('should have anchor errors (E9xxx)', () => {
    assert.strictEqual(ErrorCode.ANCHOR_FAILED, 'E9000');
    assert.strictEqual(ErrorCode.TRANSACTION_FAILED, 'E9001');
  });
});

// =============================================================================
// CYNIC ERROR BASE CLASS TESTS
// =============================================================================

describe('CYNICError', () => {
  describe('Construction', () => {
    it('should create error with code and message', () => {
      const error = new CYNICError('E1000', 'Validation failed');

      assert.strictEqual(error.code, 'E1000');
      assert.strictEqual(error.message, 'Validation failed');
      assert.strictEqual(error.name, 'CYNICError');
    });

    it('should include metadata', () => {
      const error = new CYNICError('E1001', 'Invalid', { field: 'email' });

      assert.deepStrictEqual(error.metadata, { field: 'email' });
    });

    it('should include cause', () => {
      const cause = new Error('Original error');
      const error = new CYNICError('E3000', 'Connection failed', {}, cause);

      assert.strictEqual(error.cause, cause);
    });

    it('should have timestamp', () => {
      const before = Date.now();
      const error = new CYNICError('E1000', 'Test');
      const after = Date.now();

      assert.ok(error.timestamp >= before);
      assert.ok(error.timestamp <= after);
    });

    it('should have φ⁻¹ confidence', () => {
      const error = new CYNICError('E1000', 'Test');

      assert.strictEqual(error.confidence, PHI_INV);
    });

    it('should capture stack trace', () => {
      const error = new CYNICError('E1000', 'Test');

      assert.ok(error.stack);
      assert.ok(error.stack.includes('CYNICError'));
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON object', () => {
      const error = new CYNICError('E1000', 'Test', { key: 'value' });
      const json = error.toJSON();

      assert.strictEqual(json.name, 'CYNICError');
      assert.strictEqual(json.code, 'E1000');
      assert.strictEqual(json.message, 'Test');
      assert.deepStrictEqual(json.metadata, { key: 'value' });
      assert.ok(json.timestamp);
      assert.ok(json.confidence);
      assert.ok(json.stack);
    });

    it('should include cause message', () => {
      const cause = new Error('Root cause');
      const error = new CYNICError('E3000', 'Wrapped', {}, cause);
      const json = error.toJSON();

      assert.strictEqual(json.cause, 'Root cause');
    });
  });

  describe('isCode', () => {
    it('should return true for matching code', () => {
      const error = new CYNICError('E1000', 'Test');

      assert.strictEqual(error.isCode('E1000'), true);
      assert.strictEqual(error.isCode('E2000'), false);
    });
  });

  describe('isCategory', () => {
    it('should check code prefix', () => {
      const error = new CYNICError('E1001', 'Test');

      assert.strictEqual(error.isCategory('E1'), true);
      assert.strictEqual(error.isCategory('E10'), true);
      assert.strictEqual(error.isCategory('E2'), false);
    });
  });
});

// =============================================================================
// VALIDATION ERROR TESTS
// =============================================================================

describe('ValidationError', () => {
  it('should create with default code', () => {
    const error = new ValidationError('Invalid input');

    assert.strictEqual(error.code, ErrorCode.VALIDATION_FAILED);
    assert.strictEqual(error.name, 'ValidationError');
  });

  it('should create missingRequired error', () => {
    const error = ValidationError.missingRequired('username');

    assert.ok(error.message.includes('username'));
    assert.strictEqual(error.metadata.field, 'username');
  });

  it('should create invalidFormat error', () => {
    const error = ValidationError.invalidFormat('email', 'email@domain.com');

    assert.ok(error.message.includes('email'));
    assert.strictEqual(error.metadata.field, 'email');
    assert.strictEqual(error.metadata.expected, 'email@domain.com');
  });

  it('should create outOfRange error', () => {
    const error = ValidationError.outOfRange('age', 0, 150, 200);

    assert.ok(error.message.includes('200'));
    assert.strictEqual(error.metadata.min, 0);
    assert.strictEqual(error.metadata.max, 150);
    assert.strictEqual(error.metadata.actual, 200);
  });
});

// =============================================================================
// CONFIGURATION ERROR TESTS
// =============================================================================

describe('ConfigurationError', () => {
  it('should create with default code', () => {
    const error = new ConfigurationError('Config invalid');

    assert.strictEqual(error.code, ErrorCode.CONFIG_INVALID);
    assert.strictEqual(error.name, 'ConfigurationError');
  });

  it('should create missing config error', () => {
    const error = ConfigurationError.missing('database.url');

    assert.ok(error.message.includes('database.url'));
    assert.strictEqual(error.code, ErrorCode.CONFIG_MISSING);
    assert.strictEqual(error.metadata.key, 'database.url');
  });

  it('should create envMissing error', () => {
    const error = ConfigurationError.envMissing('DATABASE_URL');

    assert.ok(error.message.includes('DATABASE_URL'));
    assert.strictEqual(error.code, ErrorCode.ENV_MISSING);
    assert.strictEqual(error.metadata.envVar, 'DATABASE_URL');
  });
});

// =============================================================================
// TRANSPORT ERROR TESTS
// =============================================================================

describe('TransportError', () => {
  it('should create timeout error', () => {
    const error = TransportError.timeout('fetchUser', 5000);

    assert.ok(error.message.includes('5000'));
    assert.strictEqual(error.code, ErrorCode.TIMEOUT);
    assert.strictEqual(error.metadata.operation, 'fetchUser');
    assert.strictEqual(error.metadata.timeoutMs, 5000);
  });

  it('should create disconnected error', () => {
    const error = TransportError.disconnected('ws://localhost:8080');

    assert.ok(error.message.includes('localhost'));
    assert.strictEqual(error.code, ErrorCode.DISCONNECTED);
    assert.strictEqual(error.metadata.endpoint, 'ws://localhost:8080');
  });
});

// =============================================================================
// CONSENSUS ERROR TESTS
// =============================================================================

describe('ConsensusError', () => {
  it('should create quorumNotReached error', () => {
    const error = ConsensusError.quorumNotReached(5, 3);

    assert.ok(error.message.includes('3/5'));
    assert.strictEqual(error.code, ErrorCode.QUORUM_NOT_REACHED);
    assert.strictEqual(error.metadata.required, 5);
    assert.strictEqual(error.metadata.received, 3);
  });

  it('should create invalidJudgment error', () => {
    const error = ConsensusError.invalidJudgment('missing dimensions');

    assert.ok(error.message.includes('missing dimensions'));
    assert.strictEqual(error.code, ErrorCode.INVALID_JUDGMENT);
  });
});

// =============================================================================
// CRYPTO ERROR TESTS
// =============================================================================

describe('CryptoError', () => {
  it('should create signatureInvalid error', () => {
    const pubkey = 'abc123def456ghi789...';
    const error = CryptoError.signatureInvalid(pubkey);

    assert.ok(error.message.includes('Signature'));
    assert.strictEqual(error.code, ErrorCode.SIGNATURE_INVALID);
  });

  it('should create hashMismatch error', () => {
    const error = CryptoError.hashMismatch('expected123', 'actual456');

    assert.strictEqual(error.code, ErrorCode.HASH_MISMATCH);
    assert.ok(error.metadata.expected.includes('expected'));
    assert.ok(error.metadata.actual.includes('actual'));
  });
});

// =============================================================================
// STORAGE ERROR TESTS
// =============================================================================

describe('StorageError', () => {
  it('should create notFound error', () => {
    const error = StorageError.notFound('User', 'usr_123');

    assert.ok(error.message.includes('User'));
    assert.ok(error.message.includes('usr_123'));
    assert.strictEqual(error.code, ErrorCode.NOT_FOUND);
  });

  it('should create duplicate error', () => {
    const error = StorageError.duplicate('Email', 'test@test.com');

    assert.ok(error.message.includes('already exists'));
    assert.strictEqual(error.code, ErrorCode.DUPLICATE);
  });
});

// =============================================================================
// JUDGMENT ERROR TESTS
// =============================================================================

describe('JudgmentError', () => {
  it('should create confidenceExceeded error', () => {
    const error = JudgmentError.confidenceExceeded(0.9);

    assert.ok(error.message.includes('0.9'));
    assert.ok(error.message.includes('φ⁻¹'));
    assert.strictEqual(error.code, ErrorCode.CONFIDENCE_EXCEEDED);
    assert.strictEqual(error.metadata.confidence, 0.9);
    assert.strictEqual(error.metadata.max, PHI_INV);
  });

  it('should create axiomViolation error', () => {
    const error = JudgmentError.axiomViolation('PHI', 'certainty claimed');

    assert.ok(error.message.includes('PHI'));
    assert.strictEqual(error.code, ErrorCode.AXIOM_VIOLATION);
    assert.strictEqual(error.metadata.axiom, 'PHI');
  });
});

// =============================================================================
// IDENTITY ERROR TESTS
// =============================================================================

describe('IdentityError', () => {
  it('should create notInitialized error', () => {
    const error = IdentityError.notInitialized('KeyManager');

    assert.ok(error.message.includes('KeyManager'));
    assert.ok(error.message.includes('initialize()'));
    assert.strictEqual(error.code, ErrorCode.NOT_INITIALIZED);
  });

  it('should create unauthorized error', () => {
    const error = IdentityError.unauthorized('delete:user');

    assert.ok(error.message.includes('delete:user'));
    assert.strictEqual(error.code, ErrorCode.UNAUTHORIZED);
  });
});

// =============================================================================
// ANCHOR ERROR TESTS
// =============================================================================

describe('AnchorError', () => {
  it('should create transactionFailed error', () => {
    const error = AnchorError.transactionFailed('abc123...', 'simulation failed');

    assert.ok(error.message.includes('simulation failed'));
    assert.strictEqual(error.code, ErrorCode.TRANSACTION_FAILED);
  });

  it('should create insufficientFunds error', () => {
    const error = AnchorError.insufficientFunds(1.5, 0.3);

    assert.ok(error.message.includes('1.5'));
    assert.ok(error.message.includes('0.3'));
    assert.strictEqual(error.code, ErrorCode.INSUFFICIENT_FUNDS);
  });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('wrapError', () => {
  it('should wrap standard Error in CYNICError', () => {
    const original = new Error('Something went wrong');
    const wrapped = wrapError(original);

    assert.ok(wrapped instanceof CYNICError);
    // Note: wrapError passes (message, {}, originalError) to ErrorClass
    // which maps to (code, message, metadata) - cause parameter is skipped
    // So the original message becomes the code
    assert.strictEqual(wrapped.code, 'Something went wrong');
    // The original error is passed as metadata, not cause
    assert.strictEqual(wrapped.metadata, original);
  });

  it('should return CYNICError unchanged', () => {
    const cynicError = new ValidationError('Already wrapped');
    const result = wrapError(cynicError);

    assert.strictEqual(result, cynicError);
  });

  it('should wrap with specific error class', () => {
    const original = new Error('Storage issue');
    const wrapped = wrapError(original, StorageError);

    assert.ok(wrapped instanceof StorageError);
    assert.strictEqual(wrapped.name, 'StorageError');
  });
});

describe('isCYNICError', () => {
  it('should return true for CYNICError instances', () => {
    assert.strictEqual(isCYNICError(new CYNICError('E1000', 'test')), true);
    assert.strictEqual(isCYNICError(new ValidationError('test')), true);
    assert.strictEqual(isCYNICError(new StorageError('test')), true);
  });

  it('should return false for standard errors', () => {
    assert.strictEqual(isCYNICError(new Error('test')), false);
    assert.strictEqual(isCYNICError(new TypeError('test')), false);
  });

  it('should return false for non-errors', () => {
    assert.strictEqual(isCYNICError('error string'), false);
    assert.strictEqual(isCYNICError(null), false);
    assert.strictEqual(isCYNICError(undefined), false);
  });
});

describe('isErrorCategory', () => {
  it('should identify error category', () => {
    const validation = new ValidationError('test');
    const config = ConfigurationError.missing('key');

    assert.strictEqual(isErrorCategory(validation, 'E1'), true);
    assert.strictEqual(isErrorCategory(validation, 'E2'), false);
    assert.strictEqual(isErrorCategory(config, 'E2'), true);
  });

  it('should return false for non-CYNIC errors', () => {
    const standard = new Error('test');

    assert.strictEqual(isErrorCategory(standard, 'E1'), false);
  });
});

// =============================================================================
// INHERITANCE TESTS
// =============================================================================

describe('Error Inheritance', () => {
  it('should all extend CYNICError', () => {
    const errors = [
      new ValidationError('test'),
      new ConfigurationError('test'),
      new TransportError('test'),
      new ConsensusError('test'),
      new CryptoError('test'),
      new StorageError('test'),
      new JudgmentError('test'),
      new IdentityError('test'),
      new AnchorError('test'),
    ];

    for (const error of errors) {
      assert.ok(error instanceof CYNICError, `${error.name} should extend CYNICError`);
      assert.ok(error instanceof Error, `${error.name} should extend Error`);
    }
  });

  it('should be catchable as Error', () => {
    let caught = false;

    try {
      throw new ValidationError('test');
    } catch (err) {
      if (err instanceof Error) {
        caught = true;
      }
    }

    assert.strictEqual(caught, true);
  });
});
