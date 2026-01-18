/**
 * AuthService Tests
 *
 * "φ distrusts φ" - verify all requests
 *
 * @module @cynic/mcp/test/auth-service
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateApiKey,
  generateSessionToken,
  verifySessionToken,
  AuthService,
} from '../src/auth-service.js';

describe('generateApiKey', () => {
  it('generates key with correct prefix', () => {
    const key = generateApiKey();
    assert.ok(key.startsWith('cynic_sk_'));
  });

  it('generates unique keys', () => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey());
    }
    assert.equal(keys.size, 100);
  });

  it('generates keys of sufficient length', () => {
    const key = generateApiKey();
    // cynic_sk_ (9) + 32 chars base64url from 24 bytes
    assert.ok(key.length >= 40);
  });
});

describe('Session Tokens', () => {
  const secret = 'test-secret-key-for-testing-purposes';

  describe('generateSessionToken', () => {
    it('generates token with two parts', () => {
      const token = generateSessionToken('session123', secret);
      const parts = token.split('.');
      assert.equal(parts.length, 2);
    });

    it('encodes session ID in payload', () => {
      const token = generateSessionToken('my-session-id', secret);
      const [data] = token.split('.');
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
      assert.equal(payload.sid, 'my-session-id');
    });

    it('includes issued-at timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const token = generateSessionToken('session123', secret);
      const after = Math.floor(Date.now() / 1000);

      const [data] = token.split('.');
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString());

      assert.ok(payload.iat >= before);
      assert.ok(payload.iat <= after);
    });

    it('includes expiration timestamp', () => {
      const token = generateSessionToken('session123', secret);
      const [data] = token.split('.');
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString());

      // Default TTL is 24 hours
      const expectedExp = payload.iat + 24 * 60 * 60;
      assert.equal(payload.exp, expectedExp);
    });
  });

  describe('verifySessionToken', () => {
    it('verifies valid token', () => {
      const token = generateSessionToken('session123', secret);
      const result = verifySessionToken(token, secret);

      assert.equal(result.valid, true);
      assert.equal(result.payload.sid, 'session123');
    });

    it('rejects token with wrong secret', () => {
      const token = generateSessionToken('session123', secret);
      const result = verifySessionToken(token, 'wrong-secret');

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid signature');
    });

    it('rejects malformed token', () => {
      const result = verifySessionToken('not-a-valid-token', secret);

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid token format');
    });

    it('rejects empty token', () => {
      const result = verifySessionToken('', secret);

      assert.equal(result.valid, false);
    });

    it('rejects expired token', async () => {
      // Create a token that's already expired
      const payload = {
        sid: 'expired-session',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30 min ago
      };
      const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const crypto = await import('crypto');
      const signature = crypto.default
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64url');
      const token = `${data}.${signature}`;

      const result = verifySessionToken(token, secret);

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Token expired');
    });

    it('rejects tampered payload', () => {
      const token = generateSessionToken('session123', secret);
      const [, signature] = token.split('.');

      // Create different payload
      const tamperedPayload = { sid: 'hacked', iat: 0, exp: 9999999999 };
      const tamperedData = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
      const tamperedToken = `${tamperedData}.${signature}`;

      const result = verifySessionToken(tamperedToken, secret);

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid signature');
    });
  });
});

describe('AuthService', () => {
  let auth;

  beforeEach(() => {
    auth = new AuthService({
      apiKeys: ['test-api-key-1', 'test-api-key-2'],
      secret: 'test-secret',
      required: true,
      rateLimit: 10,
      rateWindow: 1000,
    });
  });

  afterEach(() => {
    auth.close();
  });

  describe('constructor', () => {
    it('initializes with provided API keys', () => {
      assert.equal(auth.apiKeys.size, 2);
      assert.ok(auth.apiKeys.has('test-api-key-1'));
    });

    it('uses provided secret', () => {
      assert.equal(auth.secret, 'test-secret');
    });

    it('sets auth requirement', () => {
      assert.equal(auth.required, true);
    });

    it('sets rate limit configuration', () => {
      assert.equal(auth.rateLimit, 10);
      assert.equal(auth.rateWindow, 1000);
    });

    it('has default public paths', () => {
      assert.ok(auth.publicPaths.has('/'));
      assert.ok(auth.publicPaths.has('/health'));
      assert.ok(auth.publicPaths.has('/metrics'));
    });

    it('generates secret if not provided', () => {
      const authNoSecret = new AuthService({});
      assert.ok(authNoSecret.secret.length >= 32);
      authNoSecret.close();
    });
  });

  describe('isPublicPath', () => {
    it('returns true for public paths', () => {
      assert.equal(auth.isPublicPath('/'), true);
      assert.equal(auth.isPublicPath('/health'), true);
      assert.equal(auth.isPublicPath('/metrics'), true);
    });

    it('returns false for non-public paths', () => {
      assert.equal(auth.isPublicPath('/api/judge'), false);
      assert.equal(auth.isPublicPath('/tools/health'), false);
    });

    it('accepts custom public paths', () => {
      const customAuth = new AuthService({
        publicPaths: ['/custom', '/open'],
      });
      assert.equal(customAuth.isPublicPath('/custom'), true);
      assert.equal(customAuth.isPublicPath('/open'), true);
      customAuth.close();
    });
  });

  describe('validateApiKey', () => {
    it('validates correct API key', () => {
      assert.equal(auth.validateApiKey('test-api-key-1'), true);
      assert.equal(auth.validateApiKey('test-api-key-2'), true);
    });

    it('rejects incorrect API key', () => {
      assert.equal(auth.validateApiKey('wrong-key'), false);
    });

    it('rejects empty API key', () => {
      assert.equal(auth.validateApiKey(''), false);
      assert.equal(auth.validateApiKey(null), false);
      assert.equal(auth.validateApiKey(undefined), false);
    });
  });

  describe('sessions', () => {
    it('creates session', () => {
      const { sessionId, token } = auth.createSession('user123');

      assert.ok(sessionId.startsWith('ses_'));
      assert.ok(token.includes('.'));
    });

    it('stores session metadata', () => {
      const { sessionId } = auth.createSession('user123', { role: 'admin' });
      const session = auth.getSession(sessionId);

      assert.equal(session.userId, 'user123');
      assert.equal(session.metadata.role, 'admin');
    });

    it('validates session token', () => {
      const { token } = auth.createSession('user123');
      const result = auth.validateToken(token);

      assert.equal(result.valid, true);
      assert.ok(result.sessionId.startsWith('ses_'));
    });

    it('updates last access on validation', async () => {
      const { sessionId, token } = auth.createSession('user123');
      const originalAccess = auth.getSession(sessionId).lastAccess;

      // Wait a bit
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      await wait(10);

      auth.validateToken(token);
      const newAccess = auth.getSession(sessionId).lastAccess;

      assert.ok(newAccess >= originalAccess);
    });

    it('ends session', () => {
      const { sessionId } = auth.createSession('user123');

      assert.ok(auth.getSession(sessionId));
      assert.equal(auth.endSession(sessionId), true);
      assert.equal(auth.getSession(sessionId), null);
    });

    it('returns false when ending non-existent session', () => {
      assert.equal(auth.endSession('nonexistent'), false);
    });
  });

  describe('checkRateLimit', () => {
    it('allows requests within limit', () => {
      for (let i = 0; i < 10; i++) {
        const result = auth.checkRateLimit('test-ip');
        assert.equal(result.allowed, true);
      }
    });

    it('blocks requests over limit', () => {
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        auth.checkRateLimit('test-ip');
      }

      const result = auth.checkRateLimit('test-ip');
      assert.equal(result.allowed, false);
      assert.equal(result.remaining, 0);
    });

    it('tracks remaining requests', () => {
      const result1 = auth.checkRateLimit('test-ip');
      assert.equal(result1.remaining, 9);

      const result2 = auth.checkRateLimit('test-ip');
      assert.equal(result2.remaining, 8);
    });

    it('resets after window expires', async () => {
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        auth.checkRateLimit('test-ip');
      }

      // Wait for window to expire
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      await wait(1100);

      const result = auth.checkRateLimit('test-ip');
      assert.equal(result.allowed, true);
    });

    it('tracks different identifiers separately', () => {
      for (let i = 0; i < 10; i++) {
        auth.checkRateLimit('ip-1');
      }

      // ip-1 is exhausted
      assert.equal(auth.checkRateLimit('ip-1').allowed, false);

      // ip-2 should still have quota
      assert.equal(auth.checkRateLimit('ip-2').allowed, true);
    });
  });

  describe('authenticate', () => {
    it('allows public paths without auth', () => {
      const req = { url: '/health', headers: {} };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, true);
      assert.equal(result.method, 'public');
    });

    it('authenticates with valid API key', () => {
      const req = {
        url: '/api/judge',
        headers: { 'x-api-key': 'test-api-key-1' },
      };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, true);
      assert.equal(result.method, 'api_key');
    });

    it('rejects invalid API key', () => {
      const req = {
        url: '/api/judge',
        headers: { 'x-api-key': 'wrong-key' },
      };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, false);
      assert.equal(result.statusCode, 401);
      assert.equal(result.error, 'Invalid API key');
    });

    it('authenticates with valid Bearer token', () => {
      const { token } = auth.createSession('user123');
      const req = {
        url: '/api/judge',
        headers: { authorization: `Bearer ${token}` },
      };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, true);
      assert.equal(result.method, 'bearer');
    });

    it('rejects invalid Bearer token', () => {
      const req = {
        url: '/api/judge',
        headers: { authorization: 'Bearer invalid-token' },
      };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, false);
      assert.equal(result.statusCode, 401);
    });

    it('rejects request without auth when required', () => {
      const req = { url: '/api/judge', headers: {} };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, false);
      assert.equal(result.statusCode, 401);
      assert.ok(result.error.includes('Authentication required'));
    });

    it('allows request without auth when not required', () => {
      const optionalAuth = new AuthService({ required: false });
      const req = { url: '/api/judge', headers: {} };
      const result = optionalAuth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, true);
      assert.equal(result.method, 'none');
      optionalAuth.close();
    });

    it('returns 429 when rate limited', () => {
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        auth.authenticate(
          { url: '/api/judge', headers: { 'x-api-key': 'test-api-key-1' } },
          '127.0.0.1'
        );
      }

      const req = {
        url: '/api/judge',
        headers: { 'x-api-key': 'test-api-key-1' },
      };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, false);
      assert.equal(result.statusCode, 429);
      assert.ok(result.error.includes('Rate limit'));
    });

    it('rate limits by API key when provided', () => {
      // Exhaust rate limit for key-1
      for (let i = 0; i < 10; i++) {
        auth.authenticate(
          { url: '/api/judge', headers: { 'x-api-key': 'test-api-key-1' } },
          '127.0.0.1'
        );
      }

      // key-1 should be rate limited
      const result1 = auth.authenticate(
        { url: '/api/judge', headers: { 'x-api-key': 'test-api-key-1' } },
        '127.0.0.1'
      );
      assert.equal(result1.statusCode, 429);

      // key-2 should still work
      const result2 = auth.authenticate(
        { url: '/api/judge', headers: { 'x-api-key': 'test-api-key-2' } },
        '127.0.0.1'
      );
      assert.equal(result2.authenticated, true);
    });

    it('handles query string in URL', () => {
      const req = { url: '/health?check=true', headers: {} };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, true);
      assert.equal(result.method, 'public');
    });

    it('uses req.path as fallback', () => {
      const req = { path: '/health', headers: {} };
      const result = auth.authenticate(req, '127.0.0.1');

      assert.equal(result.authenticated, true);
    });

    it('updates stats on authenticate', () => {
      const initialStats = auth.getStats();

      auth.authenticate({ url: '/health', headers: {} }, '127.0.0.1');
      auth.authenticate(
        { url: '/api/judge', headers: { 'x-api-key': 'test-api-key-1' } },
        '127.0.0.1'
      );
      auth.authenticate(
        { url: '/api/judge', headers: { 'x-api-key': 'wrong' } },
        '127.0.0.1'
      );

      const stats = auth.getStats();
      assert.equal(stats.totalRequests, initialStats.totalRequests + 3);
      assert.equal(stats.authenticatedRequests, initialStats.authenticatedRequests + 1);
      assert.equal(stats.rejectedRequests, initialStats.rejectedRequests + 1);
    });
  });

  describe('API key management', () => {
    it('adds API key', () => {
      auth.addApiKey('new-key');
      assert.equal(auth.validateApiKey('new-key'), true);
    });

    it('removes API key', () => {
      assert.equal(auth.removeApiKey('test-api-key-1'), true);
      assert.equal(auth.validateApiKey('test-api-key-1'), false);
    });

    it('returns false when removing non-existent key', () => {
      assert.equal(auth.removeApiKey('nonexistent'), false);
    });
  });

  describe('getStats', () => {
    it('returns comprehensive stats', () => {
      auth.authenticate({ url: '/health', headers: {} }, '127.0.0.1');
      auth.createSession('user1');
      auth.createSession('user2');

      const stats = auth.getStats();

      assert.ok(stats.totalRequests >= 1);
      assert.equal(stats.activeSessions, 2);
      assert.equal(stats.apiKeysConfigured, 2);
      assert.equal(stats.authRequired, true);
      assert.equal(stats.rateLimit, 10);
      assert.equal(stats.rateWindow, 1000);
      assert.ok(stats.maxConfidence < 1); // PHI_INV
    });
  });

  describe('middleware', () => {
    it('returns function', () => {
      const mw = auth.middleware();
      assert.equal(typeof mw, 'function');
    });

    it('calls next on successful auth', () => {
      const mw = auth.middleware();
      let nextCalled = false;
      const req = { url: '/health', headers: {}, socket: {} };
      const res = {
        setHeader: () => {},
        writeHead: () => {},
        end: () => {},
      };

      mw(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
    });

    it('attaches auth info to request', () => {
      const mw = auth.middleware();
      const req = {
        url: '/api/judge',
        headers: { 'x-api-key': 'test-api-key-1' },
        socket: {},
      };
      const res = {
        setHeader: () => {},
        writeHead: () => {},
        end: () => {},
      };

      mw(req, res, () => {});

      assert.ok(req.auth);
      assert.equal(req.auth.method, 'api_key');
    });

    it('sets rate limit headers', () => {
      const mw = auth.middleware();
      const headers = {};
      const req = {
        url: '/api/judge',
        headers: { 'x-api-key': 'test-api-key-1' },
        socket: {},
      };
      const res = {
        setHeader: (name, value) => {
          headers[name] = value;
        },
        writeHead: () => {},
        end: () => {},
      };

      mw(req, res, () => {});

      assert.ok('X-RateLimit-Limit' in headers);
      assert.ok('X-RateLimit-Remaining' in headers);
      assert.ok('X-RateLimit-Reset' in headers);
    });

    it('responds with 401 on auth failure', () => {
      const mw = auth.middleware();
      let statusCode = null;
      let responseBody = null;
      const req = { url: '/api/judge', headers: {}, socket: {} };
      const res = {
        _statusCode: 200,
        setHeader: () => {},
        end: (body) => {
          responseBody = body;
        },
        set statusCode(code) {
          statusCode = code;
          this._statusCode = code;
        },
        get statusCode() {
          return this._statusCode;
        },
      };

      mw(req, res, () => {
        throw new Error('Should not call next');
      });

      assert.equal(statusCode, 401);
      assert.ok(JSON.parse(responseBody).error);
    });

    it('responds with 429 on rate limit', () => {
      const mw = auth.middleware();

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        auth.checkRateLimit('test-api-key-1');
      }

      let statusCode = null;
      let retryAfter = null;
      const req = {
        url: '/api/judge',
        headers: { 'x-api-key': 'test-api-key-1' },
        socket: {},
      };
      const res = {
        _statusCode: 200,
        setHeader: (name, value) => {
          if (name === 'Retry-After') retryAfter = value;
        },
        end: () => {},
        set statusCode(code) {
          statusCode = code;
          this._statusCode = code;
        },
        get statusCode() {
          return this._statusCode;
        },
      };

      mw(req, res, () => {});

      assert.equal(statusCode, 429);
      assert.ok(retryAfter >= 0);
    });

    it('extracts IP from x-forwarded-for', () => {
      const mw = auth.middleware();
      const req = {
        url: '/health',
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      const res = {
        setHeader: () => {},
        writeHead: () => {},
        end: () => {},
      };

      mw(req, res, () => {});

      assert.equal(req.auth.identifier, '1.2.3.4');
    });
  });

  describe('close', () => {
    it('clears rate limits', () => {
      auth.checkRateLimit('test');
      assert.equal(auth._rateLimits.size, 1);

      auth.close();

      assert.equal(auth._rateLimits.size, 0);
    });

    it('clears sessions', () => {
      auth.createSession('user1');
      auth.createSession('user2');
      assert.equal(auth._sessions.size, 2);

      auth.close();

      assert.equal(auth._sessions.size, 0);
    });

    it('clears cleanup interval', () => {
      assert.ok(auth._cleanupInterval);

      auth.close();

      assert.equal(auth._cleanupInterval, null);
    });

    it('can be called multiple times safely', () => {
      auth.close();
      auth.close();
      // Should not throw
    });
  });
});

describe('AuthService environment configuration', () => {
  it('reads API keys from CYNIC_API_KEYS env', () => {
    const originalEnv = process.env.CYNIC_API_KEYS;
    process.env.CYNIC_API_KEYS = 'env-key-1,env-key-2';

    const auth = new AuthService({});

    assert.ok(auth.apiKeys.has('env-key-1'));
    assert.ok(auth.apiKeys.has('env-key-2'));

    auth.close();
    if (originalEnv === undefined) {
      delete process.env.CYNIC_API_KEYS;
    } else {
      process.env.CYNIC_API_KEYS = originalEnv;
    }
  });

  it('reads API key from CYNIC_API_KEY env', () => {
    const originalEnv = process.env.CYNIC_API_KEY;
    process.env.CYNIC_API_KEY = 'single-env-key';

    const auth = new AuthService({});

    assert.ok(auth.apiKeys.has('single-env-key'));

    auth.close();
    if (originalEnv === undefined) {
      delete process.env.CYNIC_API_KEY;
    } else {
      process.env.CYNIC_API_KEY = originalEnv;
    }
  });

  it('uses CYNIC_AUTH_SECRET env for secret', () => {
    const originalEnv = process.env.CYNIC_AUTH_SECRET;
    process.env.CYNIC_AUTH_SECRET = 'env-secret';

    const auth = new AuthService({});

    assert.equal(auth.secret, 'env-secret');

    auth.close();
    if (originalEnv === undefined) {
      delete process.env.CYNIC_AUTH_SECRET;
    } else {
      process.env.CYNIC_AUTH_SECRET = originalEnv;
    }
  });
});
