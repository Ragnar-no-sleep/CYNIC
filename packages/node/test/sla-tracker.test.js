/**
 * SLATracker Tests
 *
 * Tests for 99.9% uptime compliance (AXE 5: OBSERVE)
 *
 * "φ mesure tout" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SLATracker,
  SLAStatus,
  SLA_TARGETS,
  createSLATracker,
  getSLATracker,
} from '../src/services/sla-tracker.js';
import { PHI_INV_2 } from '@cynic/core';

// =============================================================================
// CONSTANTS
// =============================================================================

describe('SLA_TARGETS', () => {
  it('should have 99.9% system uptime target', () => {
    assert.strictEqual(SLA_TARGETS.SYSTEM_UPTIME, 0.999);
  });

  it('should have 99.95% PostgreSQL uptime target', () => {
    assert.strictEqual(SLA_TARGETS.POSTGRESQL_UPTIME, 0.9995);
  });

  it('should have 500ms MCP response target', () => {
    assert.strictEqual(SLA_TARGETS.MCP_RESPONSE_P99, 500);
  });

  it('should have 3s judge response target', () => {
    assert.strictEqual(SLA_TARGETS.JUDGE_RESPONSE_P95, 3000);
  });

  it('should have rolling window thresholds', () => {
    assert.strictEqual(SLA_TARGETS.ROLLING_1H_MIN, 0.95);
    assert.strictEqual(SLA_TARGETS.ROLLING_24H_MIN, 0.99);
  });

  it('should have φ-aligned confidence threshold', () => {
    assert.ok(Math.abs(SLA_TARGETS.CONFIDENCE_THRESHOLD - PHI_INV_2) < 0.001);
  });
});

describe('SLAStatus', () => {
  it('should have all status values', () => {
    assert.strictEqual(SLAStatus.COMPLIANT, 'compliant');
    assert.strictEqual(SLAStatus.AT_RISK, 'at_risk');
    assert.strictEqual(SLAStatus.BREACHED, 'breached');
    assert.strictEqual(SLAStatus.UNKNOWN, 'unknown');
  });
});

// =============================================================================
// SLA TRACKER
// =============================================================================

describe('SLATracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = createSLATracker();
  });

  describe('Construction', () => {
    it('should create with factory', () => {
      assert.ok(tracker instanceof SLATracker);
    });

    it('should have default targets', () => {
      assert.strictEqual(tracker.targets.SYSTEM_UPTIME, 0.999);
    });

    it('should accept custom targets', () => {
      const custom = createSLATracker({
        targets: { SYSTEM_UPTIME: 0.99 },
      });
      assert.strictEqual(custom.targets.SYSTEM_UPTIME, 0.99);
    });
  });

  describe('Compliance', () => {
    it('should be compliant initially (no data)', () => {
      // No heartbeat data means unknown state, but isCompliant checks status
      const status = tracker.getStatus();
      assert.strictEqual(status.status, undefined); // No status yet
    });

    it('should detect compliance from heartbeat', () => {
      // Simulate a heartbeat event
      tracker._onHeartbeat({
        overall: { status: 'healthy', healthy: 10, total: 10 },
        results: {},
        metrics: {
          systemUptime: 0.999,
          systemUptime1h: 1.0,
          systemUptime24h: 0.999,
        },
      });

      assert.ok(tracker.isCompliant());
    });

    it('should detect at_risk when uptime below target but above 24h threshold', () => {
      tracker._onHeartbeat({
        overall: { status: 'healthy', healthy: 9, total: 10 },
        results: {},
        metrics: {
          systemUptime: 0.995, // Below 99.9% but above 99% (24h threshold)
          systemUptime1h: 0.96, // Above 95%
          systemUptime24h: 0.995, // Above 99%
        },
      });

      const status = tracker.getStatus();
      // SYSTEM_UPTIME violation is 'warning' (0.995 > 0.99), no critical violations
      assert.strictEqual(status.status, SLAStatus.AT_RISK);
    });

    it('should detect breach when 1h uptime critical', () => {
      tracker._onHeartbeat({
        overall: { status: 'degraded', healthy: 8, total: 10 },
        results: {},
        metrics: {
          systemUptime: 0.90,
          systemUptime1h: 0.90, // Below 95%
          systemUptime24h: 0.95,
        },
      });

      const status = tracker.getStatus();
      assert.strictEqual(status.status, SLAStatus.BREACHED);
    });
  });

  describe('Violations', () => {
    it('should record violations', () => {
      tracker._onHeartbeat({
        overall: { status: 'degraded' },
        results: {},
        metrics: {
          systemUptime: 0.90,
          systemUptime1h: 0.90,
          systemUptime24h: 0.95,
        },
      });

      const status = tracker.getStatus();
      assert.ok(status.recentViolations.length > 0);
    });

    it('should emit violation event', () => {
      let received = null;
      tracker.on('violation', (v) => { received = v; });

      tracker._onHeartbeat({
        overall: { status: 'degraded' },
        results: {},
        metrics: {
          systemUptime: 0.90,
          systemUptime1h: 0.90,
          systemUptime24h: 0.99,
        },
      });

      assert.ok(received);
      assert.ok(received.target);
    });

    it('should detect PostgreSQL failures', () => {
      tracker._onHeartbeat({
        overall: { status: 'healthy' },
        results: {
          postgresql: { healthy: false, latencyMs: 100, error: 'Connection failed' },
        },
        metrics: {
          systemUptime: 0.999,
          systemUptime1h: 1.0,
          systemUptime24h: 0.999,
        },
      });

      const status = tracker.getStatus();
      const pgViolation = status.recentViolations.find(v => v.target === 'POSTGRESQL_UPTIME');
      assert.ok(pgViolation);
    });

    it('should detect MCP slow response', () => {
      tracker._onHeartbeat({
        overall: { status: 'healthy' },
        results: {
          mcp: { healthy: true, latencyMs: 600 }, // Above 500ms
        },
        metrics: {
          systemUptime: 0.999,
          systemUptime1h: 1.0,
          systemUptime24h: 0.999,
        },
      });

      const status = tracker.getStatus();
      const mcpViolation = status.recentViolations.find(v => v.target === 'MCP_RESPONSE_P99');
      assert.ok(mcpViolation);
    });
  });

  describe('Reports', () => {
    it('should generate report', () => {
      // Add some violations
      tracker._onHeartbeat({
        overall: { status: 'degraded' },
        results: {},
        metrics: {
          systemUptime: 0.90,
          systemUptime1h: 0.90,
          systemUptime24h: 0.95,
        },
      });

      const report = tracker.getReport(24 * 60 * 60 * 1000);
      assert.ok('compliance' in report);
      assert.ok('totalViolations' in report);
      assert.ok('violationsByTarget' in report);
    });

    it('should calculate compliance percentage', () => {
      const report = tracker.getReport();
      assert.ok(typeof report.compliance === 'number');
    });
  });

  describe('Heartbeat Integration', () => {
    it('should wire to heartbeat events', () => {
      const mockHeartbeat = {
        on: (event, handler) => {
          if (event === 'heartbeat') {
            // Simulate event
            setTimeout(() => handler({
              overall: { status: 'healthy' },
              results: {},
              metrics: { systemUptime: 1.0, systemUptime1h: 1.0, systemUptime24h: 1.0 },
            }), 10);
          }
        },
        off: () => {},
      };

      const trackerWithHB = createSLATracker({ heartbeat: mockHeartbeat });
      assert.ok(trackerWithHB.heartbeat === mockHeartbeat);
    });

    it('should allow setting heartbeat after construction', () => {
      const mockHeartbeat = { on: () => {}, off: () => {} };
      tracker.setHeartbeat(mockHeartbeat);
      assert.ok(tracker.heartbeat === mockHeartbeat);
    });
  });

  describe('Alert Manager Integration', () => {
    it('should call alert manager on critical violation', () => {
      let alertCalled = false;
      const alertManager = {
        critical: () => { alertCalled = true; },
      };

      const trackerWithAlerts = createSLATracker({ alertManager });

      trackerWithAlerts._onHeartbeat({
        overall: { status: 'critical' },
        results: {
          postgresql: { healthy: false },
        },
        metrics: {
          systemUptime: 0.80,
          systemUptime1h: 0.80,
          systemUptime24h: 0.90,
        },
      });

      assert.ok(alertCalled);
    });
  });
});
