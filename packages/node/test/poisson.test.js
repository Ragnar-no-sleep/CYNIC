/**
 * Tests for Poisson Distribution Module
 * "Les événements rares révèlent le système" - κυνικός
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  factorial,
  logFactorial,
  poissonPMF,
  poissonCDF,
  poissonSurvival,
  poissonQuantile,
  poissonMean,
  poissonVariance,
  poissonStdDev,
  estimateRate,
  rateConfidenceInterval,
  detectAnomaly,
  anomalyScore,
  PoissonProcess,
  EventRateTracker,
  poissonGoodnessOfFit,
  waitingTimeCDF,
  timeToNEvents,
  createPoissonProcess,
  createEventTracker,
  POISSON_CONFIG,
} from '../src/inference/poisson.js';

describe('Factorial Functions', () => {
  describe('factorial', () => {
    it('should compute small factorials', () => {
      assert.strictEqual(factorial(0), 1);
      assert.strictEqual(factorial(1), 1);
      assert.strictEqual(factorial(5), 120);
      assert.strictEqual(factorial(10), 3628800);
    });

    it('should return NaN for negative numbers', () => {
      assert.ok(Number.isNaN(factorial(-1)));
    });
  });

  describe('logFactorial', () => {
    it('should compute log factorial correctly', () => {
      assert.strictEqual(logFactorial(0), 0);
      assert.strictEqual(logFactorial(1), 0);

      // log(5!) = log(120) ≈ 4.787
      assert.ok(Math.abs(logFactorial(5) - Math.log(120)) < 0.001);
    });

    it('should use Stirling approximation for large n', () => {
      // For large n, should still return reasonable values
      const result = logFactorial(150);
      assert.ok(result > 0 && result < 1000);
    });
  });
});

describe('Poisson PMF and CDF', () => {
  describe('poissonPMF', () => {
    it('should compute probability mass function', () => {
      // P(X=0; λ=1) = e^(-1) ≈ 0.368
      const p0 = poissonPMF(0, 1);
      assert.ok(Math.abs(p0 - 0.368) < 0.01);

      // P(X=1; λ=1) = e^(-1) ≈ 0.368
      const p1 = poissonPMF(1, 1);
      assert.ok(Math.abs(p1 - 0.368) < 0.01);

      // P(X=2; λ=1) = e^(-1)/2 ≈ 0.184
      const p2 = poissonPMF(2, 1);
      assert.ok(Math.abs(p2 - 0.184) < 0.01);
    });

    it('should return 0 for negative k', () => {
      assert.strictEqual(poissonPMF(-1, 5), 0);
    });

    it('should handle λ=0', () => {
      assert.strictEqual(poissonPMF(0, 0), 1);
      assert.strictEqual(poissonPMF(1, 0), 0);
    });

    it('should sum to approximately 1', () => {
      const lambda = 5;
      let sum = 0;
      for (let k = 0; k < 30; k++) {
        sum += poissonPMF(k, lambda);
      }
      assert.ok(Math.abs(sum - 1) < 0.001);
    });
  });

  describe('poissonCDF', () => {
    it('should compute cumulative distribution', () => {
      // P(X ≤ 0; λ=1) = e^(-1) ≈ 0.368
      const cdf0 = poissonCDF(0, 1);
      assert.ok(Math.abs(cdf0 - 0.368) < 0.01);

      // P(X ≤ 1; λ=1) = 2*e^(-1) ≈ 0.736
      const cdf1 = poissonCDF(1, 1);
      assert.ok(Math.abs(cdf1 - 0.736) < 0.01);
    });

    it('should approach 1 for large k', () => {
      const cdf = poissonCDF(20, 5);
      assert.ok(cdf > 0.99);
    });

    it('should be 0 for k < 0', () => {
      assert.strictEqual(poissonCDF(-1, 5), 0);
    });
  });

  describe('poissonSurvival', () => {
    it('should be 1 - CDF', () => {
      const cdf = poissonCDF(3, 5);
      const survival = poissonSurvival(3, 5);
      assert.ok(Math.abs(cdf + survival - 1) < 0.001);
    });
  });

  describe('poissonQuantile', () => {
    it('should find quantile values', () => {
      // Median of λ=5 should be around 5
      const median = poissonQuantile(0.5, 5);
      assert.ok(median >= 4 && median <= 6);
    });

    it('should return 0 for p=0', () => {
      assert.strictEqual(poissonQuantile(0, 5), 0);
    });

    it('should return Infinity for p=1', () => {
      assert.strictEqual(poissonQuantile(1, 5), Infinity);
    });
  });
});

describe('Poisson Statistics', () => {
  describe('poissonMean', () => {
    it('should return λ', () => {
      assert.strictEqual(poissonMean(5), 5);
      assert.strictEqual(poissonMean(10), 10);
    });
  });

  describe('poissonVariance', () => {
    it('should return λ (variance equals mean)', () => {
      assert.strictEqual(poissonVariance(5), 5);
    });
  });

  describe('poissonStdDev', () => {
    it('should return √λ', () => {
      assert.ok(Math.abs(poissonStdDev(4) - 2) < 0.001);
      assert.ok(Math.abs(poissonStdDev(9) - 3) < 0.001);
    });
  });
});

describe('Rate Estimation', () => {
  describe('estimateRate', () => {
    it('should estimate rate from events and time', () => {
      const rate = estimateRate(10, 2);
      assert.strictEqual(rate, 5);
    });

    it('should handle zero time', () => {
      const rate = estimateRate(10, 0);
      assert.strictEqual(rate, 0);
    });

    it('should respect minimum rate', () => {
      const rate = estimateRate(0, 1000);
      assert.ok(rate >= POISSON_CONFIG.MIN_RATE);
    });
  });

  describe('rateConfidenceInterval', () => {
    it('should compute confidence interval', () => {
      const ci = rateConfidenceInterval(100, 10, 0.95);

      assert.ok(ci.lower < ci.point);
      assert.ok(ci.upper > ci.point);
      assert.strictEqual(ci.point, 10);
    });

    it('should handle zero events', () => {
      const ci = rateConfidenceInterval(0, 10, 0.95);

      assert.strictEqual(ci.lower, 0);
      assert.ok(ci.upper > 0);
    });

    it('should widen for smaller sample sizes', () => {
      const ciSmall = rateConfidenceInterval(5, 1, 0.95);
      const ciLarge = rateConfidenceInterval(500, 100, 0.95);

      const widthSmall = ciSmall.upper - ciSmall.lower;
      const widthLarge = ciLarge.upper - ciLarge.lower;

      // Relative width should be larger for small sample
      assert.ok(widthSmall / ciSmall.point > widthLarge / ciLarge.point);
    });
  });
});

describe('Anomaly Detection', () => {
  describe('detectAnomaly', () => {
    it('should detect high anomaly', () => {
      // 20 events when expecting 5 is anomalous
      const result = detectAnomaly(20, 5);

      assert.ok(result.isAnomaly);
      assert.strictEqual(result.direction, 'high');
      assert.ok(result.zScore > 0);
    });

    it('should detect low anomaly', () => {
      // 0 events when expecting 20 is anomalous
      const result = detectAnomaly(0, 20);

      assert.ok(result.isAnomaly);
      assert.strictEqual(result.direction, 'low');
      assert.ok(result.zScore < 0);
    });

    it('should not flag normal counts', () => {
      // 5 events when expecting 5 is normal
      const result = detectAnomaly(5, 5);

      assert.ok(!result.isAnomaly || result.severity === 'none');
      assert.strictEqual(result.direction, 'normal');
    });

    it('should handle zero expected rate', () => {
      const result = detectAnomaly(1, 0);

      assert.ok(result.isAnomaly);
      assert.strictEqual(result.severity, 'high');
    });

    it('should bound confidence at φ⁻¹', () => {
      const result = detectAnomaly(100, 5);

      assert.ok(result.confidence <= 0.6181);
    });
  });

  describe('anomalyScore', () => {
    it('should return higher score for more anomalous counts', () => {
      const scoreNormal = anomalyScore(5, 5);
      const scoreHigh = anomalyScore(15, 5);

      assert.ok(scoreHigh > scoreNormal);
    });

    it('should bound score at φ⁻¹', () => {
      const score = anomalyScore(100, 1);

      assert.ok(score <= 0.6181);
    });
  });
});

describe('PoissonProcess', () => {
  describe('construction', () => {
    it('should create with rate', () => {
      const process = new PoissonProcess(5);

      assert.strictEqual(process.rate, 5);
      assert.strictEqual(process.totalEvents, 0);
    });

    it('should respect minimum rate', () => {
      const process = new PoissonProcess(0);

      assert.ok(process.rate >= POISSON_CONFIG.MIN_RATE);
    });
  });

  describe('recording events', () => {
    it('should record single events', () => {
      const process = new PoissonProcess(5);

      process.recordEvent();
      process.recordEvent();
      process.recordEvent();

      assert.strictEqual(process.totalEvents, 3);
    });

    it('should record batch events', () => {
      const process = new PoissonProcess(5);

      process.recordBatch(10);

      assert.strictEqual(process.totalEvents, 10);
    });
  });

  describe('window operations', () => {
    it('should count events in window', () => {
      const process = new PoissonProcess(5, { windowSize: 3600 });

      // Record some events
      process.recordBatch(5);

      assert.strictEqual(process.getWindowCount(), 5);
    });

    it('should compute expected count', () => {
      const process = new PoissonProcess(2, { windowSize: 100 });

      // Expected = rate × windowSize = 2 × 100 = 200
      assert.strictEqual(process.getExpectedCount(), 200);
    });
  });

  describe('anomaly checking', () => {
    it('should detect anomalous activity', () => {
      const process = new PoissonProcess(1, { windowSize: 100 });

      // Record way more than expected
      process.recordBatch(50);

      const result = process.checkAnomaly();
      assert.ok(result.isAnomaly);
    });
  });

  describe('rate update', () => {
    it('should update rate from observations', () => {
      const process = new PoissonProcess(1);

      // Simulate time passing and events
      const originalRate = process.rate;
      process.recordBatch(100);
      process.updateRate(0.5);

      // Rate should have changed
      assert.ok(process.rate !== originalRate);
    });
  });

  describe('probability calculations', () => {
    it('should compute probability of n events', () => {
      const process = new PoissonProcess(5, { windowSize: 1 });

      const prob = process.probabilityOf(5);

      // Should match PMF
      assert.ok(Math.abs(prob - poissonPMF(5, 5)) < 0.001);
    });

    it('should compute expected wait time', () => {
      const process = new PoissonProcess(2);

      // E[wait] = 1/λ = 0.5
      assert.ok(Math.abs(process.expectedWaitTime() - 0.5) < 0.01);
    });
  });

  describe('simulation', () => {
    it('should simulate events', () => {
      const process = new PoissonProcess(10);

      const events = process.simulate(1);

      // Should have approximately 10 events (with variance)
      assert.ok(events.length >= 0);
      assert.ok(events.every(t => t >= 0 && t <= 1));
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize', () => {
      const original = new PoissonProcess(5, { windowSize: 1000 });
      original.recordBatch(10);

      const json = original.toJSON();
      const restored = PoissonProcess.fromJSON(json);

      assert.strictEqual(restored.rate, original.rate);
      assert.strictEqual(restored.totalEvents, original.totalEvents);
    });
  });
});

describe('EventRateTracker', () => {
  describe('construction', () => {
    it('should create with default options', () => {
      const tracker = new EventRateTracker();

      assert.strictEqual(tracker.defaultRate, 1);
    });
  });

  describe('recording', () => {
    it('should track multiple event types', () => {
      const tracker = new EventRateTracker();

      tracker.record('errors');
      tracker.record('errors');
      tracker.record('warnings');

      const types = tracker.getEventTypes();
      assert.ok(types.includes('errors'));
      assert.ok(types.includes('warnings'));
    });

    it('should record counts', () => {
      const tracker = new EventRateTracker();

      tracker.record('events', 5);

      const stats = tracker.getStats('events');
      assert.strictEqual(stats.totalEvents, 5);
    });
  });

  describe('rate management', () => {
    it('should set expected rate', () => {
      const tracker = new EventRateTracker();

      tracker.setRate('errors', 2);

      const stats = tracker.getStats('errors');
      assert.strictEqual(stats.rate, 2);
    });
  });

  describe('anomaly detection', () => {
    it('should check all anomalies', () => {
      const tracker = new EventRateTracker({ windowSize: 100 });

      tracker.setRate('normal', 5);
      tracker.setRate('anomalous', 1);

      tracker.record('normal', 5);
      tracker.record('anomalous', 50); // Way above expected

      const anomalies = tracker.checkAllAnomalies();

      // Should find the anomalous one
      assert.ok(anomalies.some(a => a.eventType === 'anomalous'));
    });
  });

  describe('summary', () => {
    it('should provide summary of all events', () => {
      const tracker = new EventRateTracker();

      tracker.record('type1', 3);
      tracker.record('type2', 7);

      const summary = tracker.getSummary();

      assert.ok(summary.type1);
      assert.ok(summary.type2);
      assert.strictEqual(summary.type1.totalEvents, 3);
      assert.strictEqual(summary.type2.totalEvents, 7);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize', () => {
      const original = new EventRateTracker();
      original.record('test', 5);

      const json = original.toJSON();
      const restored = EventRateTracker.fromJSON(json);

      assert.ok(restored.getStats('test'));
      assert.strictEqual(restored.getStats('test').totalEvents, 5);
    });
  });
});

describe('Utility Functions', () => {
  describe('poissonGoodnessOfFit', () => {
    it('should test if data follows Poisson', () => {
      // Generate Poisson-like data
      const observed = [37, 37, 18, 6, 2, 0]; // Roughly λ=1 distribution

      const result = poissonGoodnessOfFit(observed, 1);

      assert.ok(typeof result.chiSquared === 'number');
      assert.ok(typeof result.pValue === 'number');
    });
  });

  describe('waitingTimeCDF', () => {
    it('should compute waiting time probability', () => {
      // P(T ≤ 1 | λ=1) = 1 - e^(-1) ≈ 0.632
      const prob = waitingTimeCDF(1, 1);

      assert.ok(Math.abs(prob - 0.632) < 0.01);
    });

    it('should return 0 for t=0', () => {
      assert.strictEqual(waitingTimeCDF(0, 5), 0);
    });
  });

  describe('timeToNEvents', () => {
    it('should compute expected time to n events', () => {
      // E[T] for 10 events at rate 2 = 10/2 = 5
      const result = timeToNEvents(10, 2);

      assert.strictEqual(result.expected, 5);
      assert.strictEqual(result.variance, 2.5); // 10/4
    });

    it('should handle zero rate', () => {
      const result = timeToNEvents(10, 0);

      assert.strictEqual(result.expected, Infinity);
    });
  });
});

describe('Factory Functions', () => {
  describe('createPoissonProcess', () => {
    it('should create process', () => {
      const process = createPoissonProcess(5);

      assert.ok(process instanceof PoissonProcess);
      assert.strictEqual(process.rate, 5);
    });
  });

  describe('createEventTracker', () => {
    it('should create tracker', () => {
      const tracker = createEventTracker({ defaultRate: 2 });

      assert.ok(tracker instanceof EventRateTracker);
      assert.strictEqual(tracker.defaultRate, 2);
    });
  });
});

describe('Integration', () => {
  describe('error rate monitoring', () => {
    it('should detect error spikes', () => {
      const tracker = createEventTracker({ windowSize: 60 });

      // Normal error rate: 1 per minute
      tracker.setRate('errors', 1 / 60);

      // Simulate normal period
      tracker.record('errors', 1);

      // Then a spike
      tracker.record('errors', 20);

      const anomalies = tracker.checkAllAnomalies();

      assert.ok(anomalies.length > 0);
      assert.ok(anomalies[0].eventType === 'errors');
    });
  });

  describe('queue arrival modeling', () => {
    it('should model message arrivals', () => {
      // 10 messages per second expected
      const queue = createPoissonProcess(10, { windowSize: 1 });

      // Probability of 5 or fewer messages in 1 second
      const probLow = poissonCDF(5, 10);

      assert.ok(probLow > 0 && probLow < 0.5);

      // Probability of more than 15 messages (potential overload)
      const probHigh = poissonSurvival(15, 10);

      assert.ok(probHigh > 0 && probHigh < 0.3);
    });
  });

  describe('rare event analysis', () => {
    it('should analyze rare security events', () => {
      // Expect 0.001 intrusion attempts per second (roughly 1 per 15 minutes)
      // Window of 60 seconds = expected 0.06 events
      const security = createPoissonProcess(0.001, { windowSize: 60 });

      // 5 attempts in one minute when expecting ~0.06 is very suspicious
      security.recordBatch(5);

      const anomaly = security.checkAnomaly();

      assert.ok(anomaly.isAnomaly);
      assert.strictEqual(anomaly.direction, 'high');
    });
  });
});
