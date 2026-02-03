/**
 * HeartbeatService Tests
 *
 * Tests for continuous health monitoring (AXE 5: OBSERVE)
 *
 * "Le chien surveille tout" - κυνικός
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  HeartbeatService,
  HealthStatus,
  createHeartbeatService,
  createDefaultChecks,
  getHeartbeatService,
} from '../src/services/heartbeat-service.js';
import { PHI_INV, PHI_INV_2 } from '@cynic/core';

// =============================================================================
// CONSTANTS
// =============================================================================

describe('HealthStatus', () => {
  it('should have all status values', () => {
    assert.strictEqual(HealthStatus.HEALTHY, 'healthy');
    assert.strictEqual(HealthStatus.DEGRADED, 'degraded');
    assert.strictEqual(HealthStatus.CRITICAL, 'critical');
    assert.strictEqual(HealthStatus.UNKNOWN, 'unknown');
  });
});

// =============================================================================
// HEARTBEAT SERVICE
// =============================================================================

describe('HeartbeatService', () => {
  let service;

  beforeEach(() => {
    service = createHeartbeatService({
      config: {
        intervalMs: 100, // Fast for testing
        timeoutMs: 50,
        historySize: 10,
      },
    });
  });

  afterEach(() => {
    service.stop();
  });

  describe('Construction', () => {
    it('should create with factory', () => {
      assert.ok(service instanceof HeartbeatService);
    });

    it('should have φ-aligned thresholds', () => {
      assert.ok(Math.abs(service.config.alertThresholds.degraded - PHI_INV) < 0.001);
      assert.ok(Math.abs(service.config.alertThresholds.critical - PHI_INV_2) < 0.001);
    });

    it('should start with empty components', () => {
      assert.strictEqual(Object.keys(service.components).length, 0);
    });
  });

  describe('Component Registration', () => {
    it('should register a component', () => {
      service.register('test', async () => ({ healthy: true }));
      assert.ok('test' in service.components);
    });

    it('should unregister a component', () => {
      service.register('test', async () => ({ healthy: true }));
      service.unregister('test');
      assert.ok(!('test' in service.components));
    });
  });

  describe('Health Checks', () => {
    it('should detect healthy component', async () => {
      service.register('healthy', async () => ({ healthy: true, latencyMs: 5 }));
      service.start();

      // Wait for first check
      await new Promise(r => setTimeout(r, 150));

      const status = service.getStatus();
      assert.strictEqual(status.components.healthy.healthy, true);
    });

    it('should detect unhealthy component', async () => {
      service.register('unhealthy', async () => ({ healthy: false }));
      service.start();

      await new Promise(r => setTimeout(r, 150));

      const status = service.getStatus();
      assert.strictEqual(status.components.unhealthy.healthy, false);
    });

    it('should handle component timeout', async () => {
      service.register('slow', async () => {
        await new Promise(r => setTimeout(r, 200)); // Longer than timeout
        return { healthy: true };
      });
      service.start();

      await new Promise(r => setTimeout(r, 150));

      const status = service.getStatus();
      assert.strictEqual(status.components.slow.healthy, false);
      assert.ok(status.components.slow.error?.includes('timeout'));
    });

    it('should handle component error', async () => {
      service.register('error', async () => {
        throw new Error('Component failed');
      });
      service.start();

      await new Promise(r => setTimeout(r, 150));

      const status = service.getStatus();
      assert.strictEqual(status.components.error.healthy, false);
      assert.strictEqual(status.components.error.error, 'Component failed');
    });
  });

  describe('Uptime Calculation', () => {
    it('should calculate uptime percentage', async () => {
      let healthy = true;
      service.register('toggle', async () => ({ healthy }));
      service.start();

      // 3 healthy checks
      await new Promise(r => setTimeout(r, 350));

      const uptime = service.getUptime('toggle');
      assert.ok(uptime > 0, 'Uptime should be > 0');
    });

    it('should return 0 for unknown component', () => {
      const uptime = service.getUptime('nonexistent');
      assert.strictEqual(uptime, 0);
    });
  });

  describe('Overall Status', () => {
    it('should be HEALTHY when all components healthy', async () => {
      service.register('a', async () => ({ healthy: true }));
      service.register('b', async () => ({ healthy: true }));
      service.start();

      await new Promise(r => setTimeout(r, 150));

      const status = service.getStatus();
      assert.strictEqual(status.overall.status, HealthStatus.HEALTHY);
    });

    it('should be DEGRADED when ratio < φ⁻¹', async () => {
      service.register('a', async () => ({ healthy: true }));
      service.register('b', async () => ({ healthy: false }));
      service.start();

      await new Promise(r => setTimeout(r, 150));

      const status = service.getStatus();
      // 50% < 61.8% = DEGRADED
      assert.strictEqual(status.overall.status, HealthStatus.DEGRADED);
    });

    it('should be CRITICAL when ratio < φ⁻²', async () => {
      service.register('a', async () => ({ healthy: false }));
      service.register('b', async () => ({ healthy: false }));
      service.register('c', async () => ({ healthy: true }));
      service.start();

      await new Promise(r => setTimeout(r, 150));

      const status = service.getStatus();
      // 33% < 38.2% = CRITICAL
      assert.strictEqual(status.overall.status, HealthStatus.CRITICAL);
    });
  });

  describe('Events', () => {
    it('should emit heartbeat event', async () => {
      let received = false;
      service.register('test', async () => ({ healthy: true }));
      service.on('heartbeat', () => { received = true; });
      service.start();

      await new Promise(r => setTimeout(r, 150));
      assert.ok(received);
    });

    it('should emit unhealthy event', async () => {
      let received = null;
      service.register('bad', async () => ({ healthy: false }));
      service.on('unhealthy', (data) => { received = data; });
      service.start();

      await new Promise(r => setTimeout(r, 150));
      assert.ok(received);
      assert.strictEqual(received.component, 'bad');
    });

    it('should emit alert on non-healthy status', async () => {
      let received = null;
      service.register('bad', async () => ({ healthy: false }));
      service.on('alert', (data) => { received = data; });
      service.start();

      await new Promise(r => setTimeout(r, 150));
      assert.ok(received);
      assert.ok(received.status === HealthStatus.CRITICAL || received.status === HealthStatus.DEGRADED);
    });
  });

  describe('Metrics', () => {
    it('should track total pings', async () => {
      service.register('test', async () => ({ healthy: true }));
      service.start();

      await new Promise(r => setTimeout(r, 250));

      const metrics = service.getMetrics();
      assert.ok(metrics.totalPings >= 2);
    });

    it('should track failures', async () => {
      service.register('fail', async () => { throw new Error('fail'); });
      service.start();

      await new Promise(r => setTimeout(r, 150));

      const metrics = service.getMetrics();
      assert.ok(metrics.totalFailures >= 1);
    });
  });

  describe('MTTR/MTBF', () => {
    it('should return 0 MTTR with no failures', () => {
      const mttr = service.getMTTR('test');
      assert.strictEqual(mttr, 0);
    });

    it('should return Infinity MTBF with no failures', async () => {
      service.register('stable', async () => ({ healthy: true }));
      service.start();

      await new Promise(r => setTimeout(r, 250));

      const mtbf = service.getMTBF('stable');
      assert.strictEqual(mtbf, Infinity);
    });
  });

  describe('Start/Stop', () => {
    it('should start and emit started event', () => {
      let started = false;
      service.on('started', () => { started = true; });
      service.start();
      assert.ok(started);
    });

    it('should stop and emit stopped event', () => {
      let stopped = false;
      service.on('stopped', () => { stopped = true; });
      service.start();
      service.stop();
      assert.ok(stopped);
    });

    it('should not double-start', () => {
      service.start();
      service.start(); // Should be no-op
      assert.ok(service._running);
    });
  });
});

// =============================================================================
// DEFAULT CHECKS
// =============================================================================

describe('createDefaultChecks', () => {
  it('should create empty checks with no options', () => {
    const checks = createDefaultChecks({});
    assert.strictEqual(Object.keys(checks).length, 0);
  });

  it('should create postgresql check when pool provided', () => {
    const mockPool = {
      query: async () => ({ rows: [{ '?column?': 1 }] }),
    };
    const checks = createDefaultChecks({ pool: mockPool });
    assert.ok('postgresql' in checks);
  });

  it('should create collectivePack check when provided', () => {
    const mockCollective = {
      getStats: () => ({ initialized: true, dogCount: 11 }),
    };
    const checks = createDefaultChecks({ collectivePack: mockCollective });
    assert.ok('dogs' in checks);
  });
});
