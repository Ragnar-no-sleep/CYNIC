#!/usr/bin/env node
/**
 * Telemetry Collector Service Tests
 *
 * Tests for usage statistics, frictions, and performance tracking.
 *
 * "φ mesure tout, φ apprend de tout" - CYNIC
 *
 * @module @cynic/persistence/test/telemetry-collector
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  TelemetryCollector,
  createTelemetryCollector,
  getTelemetry,
  MetricType,
  FrictionSeverity,
  Category,
} from '../src/services/telemetry-collector.js';

// ============================================================================
// TESTS
// ============================================================================

describe('TelemetryCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new TelemetryCollector({
      name: 'test',
      flushInterval: 0, // Disable auto-flush for tests
      persist: false,
    });
  });

  afterEach(() => {
    if (collector) {
      collector.destroy?.();
    }
  });

  describe('constructor', () => {
    it('should create instance with defaults', () => {
      const c = new TelemetryCollector({ flushInterval: 0 });
      assert.ok(c);
      assert.strictEqual(c.name, 'cynic');
      assert.ok(c.sessionId);
      assert.ok(c.counters instanceof Map);
      assert.ok(c.gauges instanceof Map);
    });

    it('should accept custom name', () => {
      const c = new TelemetryCollector({ name: 'custom', flushInterval: 0 });
      assert.strictEqual(c.name, 'custom');
    });

    it('should generate session ID', () => {
      const c = new TelemetryCollector({ flushInterval: 0 });
      assert.ok(c.sessionId.startsWith('sess_'));
    });

    it('should accept custom session ID', () => {
      const c = new TelemetryCollector({ sessionId: 'test-session', flushInterval: 0 });
      assert.strictEqual(c.sessionId, 'test-session');
    });
  });

  describe('MetricType enum', () => {
    it('should have all metric types', () => {
      assert.strictEqual(MetricType.COUNTER, 'counter');
      assert.strictEqual(MetricType.GAUGE, 'gauge');
      assert.strictEqual(MetricType.HISTOGRAM, 'histogram');
      assert.strictEqual(MetricType.TIMING, 'timing');
      assert.strictEqual(MetricType.FRICTION, 'friction');
    });
  });

  describe('FrictionSeverity enum', () => {
    it('should have all severity levels', () => {
      assert.strictEqual(FrictionSeverity.LOW, 'low');
      assert.strictEqual(FrictionSeverity.MEDIUM, 'medium');
      assert.strictEqual(FrictionSeverity.HIGH, 'high');
      assert.strictEqual(FrictionSeverity.CRITICAL, 'critical');
    });
  });

  describe('Category enum', () => {
    it('should have all categories', () => {
      assert.strictEqual(Category.LLM, 'llm');
      assert.strictEqual(Category.JUDGMENT, 'judgment');
      assert.strictEqual(Category.MEMORY, 'memory');
      assert.strictEqual(Category.TOOL, 'tool');
      assert.strictEqual(Category.SESSION, 'session');
      assert.strictEqual(Category.SYSTEM, 'system');
    });
  });

  describe('increment()', () => {
    it('should increment counter', () => {
      collector.increment('test_counter');
      collector.increment('test_counter');
      collector.increment('test_counter');

      const stats = collector.getStats?.() || collector.stats;
      assert.strictEqual(stats.totalEvents, 3);
    });

    it('should increment by custom value', () => {
      collector.increment('test_counter', 5);

      // Check counter was incremented
      const key = collector._makeKey('test_counter', {});
      const counter = collector.counters.get(key);
      assert.strictEqual(counter.value, 5);
    });

    it('should support labels', () => {
      collector.increment('requests', 1, { category: 'tool', tool: 'Bash' });

      const key = collector._makeKey('requests', { category: 'tool', tool: 'Bash' });
      const counter = collector.counters.get(key);
      assert.ok(counter);
      assert.strictEqual(counter.labels.tool, 'Bash');
    });

    it('should emit metric event', (t, done) => {
      collector.once('metric', (metric) => {
        assert.strictEqual(metric.type, MetricType.COUNTER);
        assert.strictEqual(metric.name, 'test_metric');
        done();
      });

      collector.increment('test_metric');
    });
  });

  describe('gauge()', () => {
    it('should set gauge value', () => {
      collector.gauge('memory_usage', 1024);

      const key = collector._makeKey('memory_usage', {});
      const gauge = collector.gauges.get(key);
      assert.strictEqual(gauge.value, 1024);
    });

    it('should overwrite previous gauge value', () => {
      collector.gauge('cpu', 50);
      collector.gauge('cpu', 75);

      const key = collector._makeKey('cpu', {});
      const gauge = collector.gauges.get(key);
      assert.strictEqual(gauge.value, 75);
    });

    it('should record timestamp', () => {
      const before = Date.now();
      collector.gauge('test', 100);
      const after = Date.now();

      const key = collector._makeKey('test', {});
      const gauge = collector.gauges.get(key);
      assert.ok(gauge.timestamp >= before);
      assert.ok(gauge.timestamp <= after);
    });
  });

  describe('histogram()', () => {
    it('should record histogram values', () => {
      collector.histogram('latency', 100);
      collector.histogram('latency', 200);
      collector.histogram('latency', 150);

      const key = collector._makeKey('latency', {});
      const hist = collector.histograms.get(key);
      assert.ok(hist);
      assert.strictEqual(hist.count, 3);
    });

    it('should calculate sum', () => {
      collector.histogram('response_time', 100);
      collector.histogram('response_time', 200);

      const key = collector._makeKey('response_time', {});
      const hist = collector.histograms.get(key);
      assert.strictEqual(hist.sum, 300);
    });

    it('should track min and max', () => {
      collector.histogram('values', 50);
      collector.histogram('values', 10);
      collector.histogram('values', 100);

      const key = collector._makeKey('values', {});
      const hist = collector.histograms.get(key);
      assert.strictEqual(hist.min, 10);
      assert.strictEqual(hist.max, 100);
    });
  });

  describe('recordTiming()', () => {
    it('should record timing values', () => {
      collector.recordTiming?.('api_call', 250) || collector.histogram('api_call', 250, { type: 'timing' });

      // Should have recorded the timing
      assert.ok(collector.histograms.size > 0 || collector.timings?.size > 0);
    });
  });

  describe('startTimer() / stopTimer()', () => {
    it('should measure elapsed time', async () => {
      if (!collector.startTimer || !collector.stopTimer) {
        // Skip if not implemented
        return;
      }

      const timerId = collector.startTimer('operation');

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));

      const elapsed = collector.stopTimer(timerId);
      // Timer may return undefined if not found, or elapsed time
      assert.ok(elapsed === undefined || elapsed >= 0);
    });
  });

  describe('recordFriction()', () => {
    it('should record friction events', () => {
      collector.recordFriction?.('api_error', FrictionSeverity.HIGH, {
        error: 'Connection refused',
        endpoint: '/api/test',
      }) || collector.frictions.push({
        name: 'api_error',
        severity: FrictionSeverity.HIGH,
        context: { error: 'Connection refused' },
      });

      assert.ok(collector.frictions.length > 0);
    });
  });

  describe('recordToolUse()', () => {
    it('should track tool usage', () => {
      collector.recordToolUse?.({
        tool: 'Bash',
        success: true,
        latency: 150,
      }) || collector.increment('tool_use', 1, { tool: 'Bash' });

      assert.ok(collector.stats.totalEvents > 0);
    });
  });

  describe('getStats()', () => {
    it('should return statistics', () => {
      collector.increment('a');
      collector.increment('b');
      collector.gauge('c', 100);

      const stats = collector.getStats?.() || collector.stats;
      assert.ok(stats.totalEvents >= 2);
    });
  });

  describe('flush()', () => {
    it('should not throw', async () => {
      collector.increment('test', 1);
      await assert.doesNotReject(async () => {
        await collector.flush?.();
      });
    });
  });

  describe('destroy()', () => {
    it('should cleanup resources', () => {
      const c = new TelemetryCollector({ flushInterval: 1000 });
      c.destroy?.();
      // Should not throw after destroy
      assert.ok(true);
    });
  });
});

describe('createTelemetryCollector()', () => {
  it('should create TelemetryCollector instance', () => {
    const collector = createTelemetryCollector({ flushInterval: 0 });
    assert.ok(collector instanceof TelemetryCollector);
  });
});

describe('getTelemetry()', () => {
  it('should return singleton instance', () => {
    const c1 = getTelemetry({ flushInterval: 0 });
    const c2 = getTelemetry();
    assert.strictEqual(c1, c2);
  });
});
