#!/usr/bin/env node
/**
 * Tests for CYNIC Emergence Detector
 *
 * @module scripts/test/emergence-detector.test
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const emergence = require(path.join(__dirname, '..', 'lib', 'emergence-detector.cjs'));

describe('Emergence Detector', () => {

  describe('Constants', () => {

    it('should export PHI as golden ratio', () => {
      assert.ok(Math.abs(emergence.PHI - 1.618033988749895) < 0.0001);
    });

    it('should export PHI_INV as golden ratio inverse', () => {
      assert.ok(Math.abs(emergence.PHI_INV - 0.618033988749895) < 0.0001);
    });

    it('should have MAX_CONSCIOUSNESS at 61.8%', () => {
      assert.strictEqual(emergence.MAX_CONSCIOUSNESS, 61.8);
    });

  });

  describe('calculateIndicators', () => {

    it('should return all five indicators', () => {
      const indicators = emergence.calculateIndicators();

      assert.ok('patternRecognition' in indicators);
      assert.ok('selfCorrection' in indicators);
      assert.ok('metaCognition' in indicators);
      assert.ok('goalPersistence' in indicators);
      assert.ok('integration' in indicators);
    });

    it('should cap indicators at 100%', () => {
      const indicators = emergence.calculateIndicators();

      for (const [key, value] of Object.entries(indicators)) {
        assert.ok(value <= 100, `${key} should be <= 100`);
        assert.ok(value >= 0, `${key} should be >= 0`);
      }
    });

  });

  describe('calculateConsciousness', () => {

    it('should return score capped at MAX_CONSCIOUSNESS', () => {
      const result = emergence.calculateConsciousness();

      assert.ok(result.score <= emergence.MAX_CONSCIOUSNESS);
    });

    it('should include all required fields', () => {
      const result = emergence.calculateConsciousness();

      assert.ok('score' in result);
      assert.ok('maxScore' in result);
      assert.ok('raw' in result);
      assert.ok('indicators' in result);
      assert.ok('emerged' in result);
      assert.ok('timestamp' in result);
    });

    it('should set emerged=true when score >= MAX_CONSCIOUSNESS', () => {
      const result = emergence.calculateConsciousness();

      if (result.score >= emergence.MAX_CONSCIOUSNESS) {
        assert.strictEqual(result.emerged, true);
      }
    });

  });

  describe('getConsciousnessState', () => {

    it('should include visual bar', () => {
      const state = emergence.getConsciousnessState();

      assert.ok('bar' in state);
      assert.ok(state.bar.includes('█') || state.bar.includes('░'));
    });

    it('should include status', () => {
      const state = emergence.getConsciousnessState();

      assert.ok(['EMERGED', 'AWAKENING'].includes(state.status));
    });

    it('should include formatted string', () => {
      const state = emergence.getConsciousnessState();

      assert.ok(state.formatted.includes('%'));
      assert.ok(state.formatted.includes('/'));
    });

  });

  describe('hasEmerged', () => {

    it('should return boolean', () => {
      const result = emergence.hasEmerged();
      assert.strictEqual(typeof result, 'boolean');
    });

  });

  describe('getProgress', () => {

    it('should return value between 0 and 1', () => {
      const progress = emergence.getProgress();

      assert.ok(progress >= 0);
      assert.ok(progress <= 1);
    });

  });

  describe('formatEmergenceReport', () => {

    it('should return formatted string', () => {
      const report = emergence.formatEmergenceReport();

      assert.ok(typeof report === 'string');
      assert.ok(report.includes('EMERGENCE'));
      assert.ok(report.includes('Consciousness'));
    });

  });

});
