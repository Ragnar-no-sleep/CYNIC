#!/usr/bin/env node
/**
 * CYNIC Decision Engine - End-to-End Tests
 *
 * "φ distrusts φ" - Tests validate the foundation
 *
 * Run: node --test scripts/test/decision-engine.test.cjs
 */

'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Load modules under test
const DC = require(path.join(__dirname, '..', 'lib', 'decision-constants.cjs'));
const DE = require(path.join(__dirname, '..', 'lib', 'decision-engine.cjs'));

// =============================================================================
// 1. CONSTANTS VALIDATION (6 tests)
// =============================================================================

describe('Constants Validation', () => {
  it('PHI ratios are mathematically correct', () => {
    // PHI ≈ 1.618
    assert.ok(Math.abs(DC.PHI.PHI - 1.618033988749895) < 1e-10);

    // PHI_INV = 1/φ ≈ 0.618
    assert.ok(Math.abs(DC.PHI.PHI_INV - 0.6180339887498949) < 1e-10);

    // PHI * PHI_INV ≈ 1
    assert.ok(Math.abs(DC.PHI.PHI * DC.PHI.PHI_INV - 1) < 1e-10);

    // PHI_INV_2 = 1/φ² ≈ 0.382
    assert.ok(Math.abs(DC.PHI.PHI_INV_2 - 0.3819660112501051) < 1e-10);

    // PHI_INV_3 = 1/φ³ ≈ 0.236
    assert.ok(Math.abs(DC.PHI.PHI_INV_3 - 0.2360679774997897) < 1e-10);
  });

  it('Trust level boundaries have no gaps', () => {
    const levels = DC.TRUST_LEVELS;

    // GUARDIAN: [0.618, 1.0]
    assert.strictEqual(levels.GUARDIAN.min, DC.PHI.PHI_INV);
    assert.strictEqual(levels.GUARDIAN.max, 1.0);

    // STEWARD: [0.382, 0.618)
    assert.strictEqual(levels.STEWARD.min, DC.PHI.PHI_INV_2);
    assert.strictEqual(levels.STEWARD.max, DC.PHI.PHI_INV);

    // Boundaries touch (no gaps)
    assert.strictEqual(levels.STEWARD.max, levels.GUARDIAN.min);
    assert.strictEqual(levels.BUILDER.max, levels.STEWARD.min);
  });

  it('Severity weights are ordered correctly', () => {
    const weights = DC.SEVERITY.WEIGHTS;
    assert.ok(weights.low < weights.medium);
    assert.ok(weights.medium < weights.high);
    assert.ok(weights.high < weights.critical);
  });

  it('E-Score 7D weights sum to approximately 10.708', () => {
    const e = DC.E_SCORE_7D;
    const total = e.BURN + e.BUILD + e.JUDGE + e.RUN + e.SOCIAL + e.GRAPH + e.HOLD;
    // 3√5 + 4 ≈ 10.708
    assert.ok(Math.abs(total - 10.708) < 0.01);
  });

  it('LENGTH thresholds have reasonable minimums', () => {
    assert.strictEqual(DC.LENGTH.MIN_PROMPT, 10);
    assert.strictEqual(DC.LENGTH.ELENCHUS_MIN, 30);
    assert.strictEqual(DC.LENGTH.FALLACY_MIN, 50);
    assert.ok(DC.LENGTH.OVER_ENGINEERING > 100);
  });

  it('MAX_CONFIDENCE is φ⁻¹', () => {
    assert.strictEqual(DC.MAX_CONFIDENCE, DC.PHI.PHI_INV);
    assert.ok(DC.MAX_CONFIDENCE < 0.62);
    assert.ok(DC.MAX_CONFIDENCE > 0.61);
  });
});

// =============================================================================
// 2. TRUST LEVEL CALCULATION (7 tests)
// =============================================================================

describe('getTrustLevel', () => {
  it('returns GUARDIAN for eScore >= PHI_INV', () => {
    const level = DC.getTrustLevel(DC.PHI.PHI_INV);
    assert.strictEqual(level.name, 'GUARDIAN');
    assert.ok(level.capabilities.includes('suggest_agents'));
  });

  it('returns STEWARD for eScore in [0.382, 0.618)', () => {
    const level = DC.getTrustLevel(0.5);
    assert.strictEqual(level.name, 'STEWARD');
    assert.ok(level.capabilities.includes('tool_access'));
  });

  it('returns BUILDER for eScore in [0.30, 0.382)', () => {
    const level = DC.getTrustLevel(0.35);
    assert.strictEqual(level.name, 'BUILDER');
    assert.ok(level.capabilities.includes('basic_access'));
  });

  it('returns CONTRIBUTOR for eScore in [0.15, 0.30)', () => {
    const level = DC.getTrustLevel(0.20);
    assert.strictEqual(level.name, 'CONTRIBUTOR');
  });

  it('returns OBSERVER for eScore < 0.15', () => {
    const level = DC.getTrustLevel(0.05);
    assert.strictEqual(level.name, 'OBSERVER');
    assert.ok(level.capabilities.includes('read_only'));
  });

  it('handles exact boundary cases', () => {
    // Exact boundaries using constants
    assert.strictEqual(DC.getTrustLevel(DC.PHI.PHI_INV).name, 'GUARDIAN');
    assert.strictEqual(DC.getTrustLevel(DC.PHI.PHI_INV - 0.0001).name, 'STEWARD');
    assert.strictEqual(DC.getTrustLevel(DC.PHI.PHI_INV_2).name, 'STEWARD');
    assert.strictEqual(DC.getTrustLevel(DC.PHI.PHI_INV_2 - 0.0001).name, 'BUILDER');
  });

  it('handles zero and one', () => {
    assert.strictEqual(DC.getTrustLevel(0).name, 'OBSERVER');
    assert.strictEqual(DC.getTrustLevel(1.0).name, 'GUARDIAN');
  });
});

// =============================================================================
// 3. SEVERITY FUNCTIONS (5 tests)
// =============================================================================

describe('Severity Functions', () => {
  it('compareSeverity returns correct ordering', () => {
    assert.strictEqual(DC.compareSeverity('low', 'low'), 0);
    assert.ok(DC.compareSeverity('high', 'low') > 0);
    assert.ok(DC.compareSeverity('low', 'high') < 0);
    assert.ok(DC.compareSeverity('critical', 'low') > 0);
  });

  it('maxSeverity finds highest severity', () => {
    assert.strictEqual(DC.maxSeverity(['low']), 'low');
    assert.strictEqual(DC.maxSeverity(['low', 'medium']), 'medium');
    assert.strictEqual(DC.maxSeverity(['low', 'critical', 'medium']), 'critical');
    assert.strictEqual(DC.maxSeverity(['medium', 'low', 'high']), 'high');
  });

  it('maxSeverity defaults to low on empty', () => {
    assert.strictEqual(DC.maxSeverity([]), 'low');
  });

  it('maxSeverity ignores unknown values', () => {
    assert.strictEqual(DC.maxSeverity(['unknown', 'low', 'high']), 'high');
  });

  it('maxSeverity handles all four levels', () => {
    const all = ['low', 'medium', 'high', 'critical'];
    assert.strictEqual(DC.maxSeverity(all), 'critical');
  });
});

// =============================================================================
// 4. DECISION CONTEXT CREATION (4 tests)
// =============================================================================

describe('createContext', () => {
  it('creates valid context with all parameters', () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'elenchus',
      user: { userId: 'node_123', eScore: 0.7 },
      metadata: { length: 50 },
      source: 'perceive.cjs',
    });

    assert.strictEqual(context.event, 'user_prompt');
    assert.strictEqual(context.action, 'elenchus');
    assert.strictEqual(context.user.userId, 'node_123');
    assert.strictEqual(context.user.eScore, 0.7);
    assert.strictEqual(context.source, 'perceive.cjs');
    assert.ok(Number.isInteger(context.timestamp));
  });

  it('fills in default trust level from eScore', () => {
    const context = DE.createContext({
      event: 'pre_tool',
      action: 'execute',
      user: { eScore: 0.5 },
    });

    assert.ok(context.user.trustLevel);
    assert.strictEqual(context.user.trustLevel.name, 'STEWARD');
  });

  it('handles missing user object', () => {
    const context = DE.createContext({
      event: 'session_start',
      action: 'initialize',
    });

    assert.ok(context.user);
    assert.strictEqual(context.user.userId, 'unknown');
    assert.strictEqual(context.user.eScore, 0);
    assert.strictEqual(context.user.trustLevel.name, 'OBSERVER');
  });

  it('defaults source to unknown', () => {
    const context = DE.createContext({
      event: 'stop',
      action: 'shutdown',
    });

    assert.strictEqual(context.source, 'unknown');
  });
});

// =============================================================================
// 5. DECISION RESULT CREATION (3 tests)
// =============================================================================

describe('createResult', () => {
  it('creates valid result structure', () => {
    const result = DE.createResult({
      allow: true,
      level: 'warn',
      confidence: 0.5,
      reasoning: 'Test warning',
      sources: ['evaluator1'],
      priority: 50,
    });

    assert.strictEqual(result.allow, true);
    assert.strictEqual(result.level, 'warn');
    assert.strictEqual(result.confidence, 0.5);
    assert.strictEqual(result.reasoning, 'Test warning');
    assert.deepStrictEqual(result.sources, ['evaluator1']);
    assert.ok(result.auditTrail);
  });

  it('clamps confidence to MAX_CONFIDENCE (0.618)', () => {
    const result = DE.createResult({ confidence: 0.9 });
    assert.strictEqual(result.confidence, DC.MAX_CONFIDENCE);
    assert.strictEqual(result.auditTrail.rawConfidence, 0.9);
  });

  it('stores raw vs clamped confidence in audit trail', () => {
    const result = DE.createResult({ confidence: 0.8 });
    assert.strictEqual(result.auditTrail.rawConfidence, 0.8);
    assert.ok(result.auditTrail.clampedConfidence <= DC.MAX_CONFIDENCE);
  });
});

// =============================================================================
// 6. EVALUATOR REGISTRY (3 tests)
// =============================================================================

describe('Evaluator Registry', () => {
  it('registers and uses custom evaluator', async () => {
    let called = false;
    DE.registerEvaluator('test_custom', async (context) => {
      called = true;
      return { allow: true, confidence: 0.5 };
    });

    const context = DE.createContext({ event: 'test', action: 'test' });
    await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['test_custom'],
    });

    assert.strictEqual(called, true);
  });

  it('built-in evaluators exist', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'test',
      user: { eScore: 0.5 },
      metadata: { severity: 'low', promptLength: 50 },
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['trust_level', 'severity', 'length'],
    });

    assert.ok(result.sources.includes('trust_level'));
    assert.ok(result.sources.includes('severity'));
    assert.ok(result.sources.includes('length'));
  });

  it('registerEvaluator overwrites existing', async () => {
    DE.registerEvaluator('overwrite_test', async (c) => ({ allow: true }));
    DE.registerEvaluator('overwrite_test', async (c) => ({ allow: false, level: 'block' }));

    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['overwrite_test'],
    });

    assert.strictEqual(result.allow, false);
  });
});

// =============================================================================
// 7. INDIVIDUAL EVALUATORS (4 tests)
// =============================================================================

describe('trust_level Evaluator', () => {
  it('returns high confidence for GUARDIAN', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'test',
      user: { eScore: 0.7, trustLevel: DC.getTrustLevel(0.7) },
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['trust_level'],
    });

    assert.ok(result.confidence >= 0.5);
  });

  it('returns low confidence for OBSERVER', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'test',
      user: { eScore: 0.05, trustLevel: DC.getTrustLevel(0.05) },
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['trust_level'],
    });

    assert.ok(result.confidence <= 0.2);
  });
});

describe('severity Evaluator', () => {
  it('blocks on critical severity', async () => {
    const context = DE.createContext({
      event: 'pre_tool',
      action: 'delete',
      metadata: { severity: 'critical' },
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['severity'],
    });

    assert.strictEqual(result.allow, false);
    assert.strictEqual(result.level, 'block');
  });

  it('allows low severity', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'read',
      metadata: { severity: 'low' },
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['severity'],
    });

    assert.strictEqual(result.allow, true);
  });
});

describe('length Evaluator', () => {
  it('blocks prompts shorter than MIN_PROMPT', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'context_injection',
      metadata: { promptLength: 5 },
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['length'],
    });

    assert.strictEqual(result.allow, false);
  });

  it('allows prompts >= MIN_PROMPT', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'context_injection',
      metadata: { promptLength: 50 },
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['length'],
    });

    assert.strictEqual(result.allow, true);
  });
});

describe('probability Evaluator', () => {
  it('allows actions without probability gates', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'unknown_feature',
    });

    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['probability'],
    });

    assert.strictEqual(result.allow, true);
  });
});

// =============================================================================
// 8. RESULT AGGREGATION (4 tests)
// =============================================================================

describe('Result Aggregation', () => {
  it('blocking result wins over everything', async () => {
    // Register evaluators with different results
    DE.registerEvaluator('agg_allow', async () => ({ level: 'allow', confidence: 0.9 }));
    DE.registerEvaluator('agg_block', async () => ({ allow: false, level: 'block', confidence: 0.6 }));
    DE.registerEvaluator('agg_warn', async () => ({ level: 'warn', confidence: 0.5 }));

    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['agg_allow', 'agg_block', 'agg_warn'],
    });

    assert.strictEqual(result.allow, false);
    assert.strictEqual(result.level, 'block');
  });

  it('warning wins when no block', async () => {
    DE.registerEvaluator('agg_allow2', async () => ({ level: 'allow', confidence: 0.9 }));
    DE.registerEvaluator('agg_warn2', async () => ({ level: 'warn', confidence: 0.5 }));

    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['agg_allow2', 'agg_warn2'],
    });

    assert.strictEqual(result.level, 'warn');
    assert.strictEqual(result.allow, true);
  });

  it('allow as default when no blocks or warnings', async () => {
    DE.registerEvaluator('agg_allow3', async () => ({ level: 'allow', confidence: 0.5 }));
    DE.registerEvaluator('agg_allow4', async () => ({ level: 'allow', confidence: 0.6 }));

    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['agg_allow3', 'agg_allow4'],
    });

    assert.strictEqual(result.level, 'allow');
    assert.strictEqual(result.allow, true);
  });

  it('handles empty evaluator list', async () => {
    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: [],
    });

    assert.strictEqual(result.allow, true);
    assert.strictEqual(result.level, 'allow');
  });
});

// =============================================================================
// 9. ORCHESTRATION INTEGRATION (3 tests)
// =============================================================================

describe('Orchestration Callback', () => {
  afterEach(() => {
    DE.setOrchestrationCallback(null);
  });

  it('getOrchestration calls callback if set', async () => {
    let called = false;
    DE.setOrchestrationCallback(async (ctx) => {
      called = true;
      return { routing: { sefirah: 'KETER' }, intervention: { level: 'allow' } };
    });

    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.getOrchestration(context);

    assert.strictEqual(called, true);
    assert.strictEqual(result.routing.sefirah, 'KETER');
  });

  it('getOrchestration returns fallback if no callback', async () => {
    DE.setOrchestrationCallback(null);

    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.getOrchestration(context);

    assert.ok(result.routing);
    assert.strictEqual(result.routing.sefirah, 'KETER');
    assert.strictEqual(result.intervention.level, 'silent');
  });

  it('getOrchestration catches callback errors', async () => {
    DE.setOrchestrationCallback(async (ctx) => {
      throw new Error('Orchestration failed');
    });

    const context = DE.createContext({ event: 'test', action: 'test' });
    const result = await DE.getOrchestration(context);

    assert.ok(result.fallback);
    assert.ok(result.error);
    assert.strictEqual(result.intervention.level, 'silent');
  });
});

// =============================================================================
// 10. QUICK DECISION HELPERS (3 tests)
// =============================================================================

describe('Quick Decision Helpers', () => {
  it('shouldActivate returns boolean', async () => {
    const activated = await DE.shouldActivate('elenchus', {
      length: 50,
      user: { eScore: 0.5 },
    });

    assert.strictEqual(typeof activated, 'boolean');
  });

  it('hasSufficientTrust returns true for equal or higher', () => {
    const guardian = { eScore: 0.7 };
    assert.strictEqual(DE.hasSufficientTrust(guardian, 'GUARDIAN'), true);
    assert.strictEqual(DE.hasSufficientTrust(guardian, 'STEWARD'), true);
    assert.strictEqual(DE.hasSufficientTrust(guardian, 'OBSERVER'), true);
  });

  it('hasSufficientTrust returns false for insufficient', () => {
    const observer = { eScore: 0.05 };
    assert.strictEqual(DE.hasSufficientTrust(observer, 'GUARDIAN'), false);
    assert.strictEqual(DE.hasSufficientTrust(observer, 'STEWARD'), false);
    assert.strictEqual(DE.hasSufficientTrust(observer, 'OBSERVER'), true);
  });

  it('getMaxSeverity finds max from issues', () => {
    const issues = [
      { id: 1, severity: 'low' },
      { id: 2, severity: 'high' },
      { id: 3, severity: 'medium' },
    ];

    const max = DE.getMaxSeverity(issues);
    assert.strictEqual(max, 'high');
  });
});

// =============================================================================
// 11. AUDIT LOGGING (2 tests)
// =============================================================================

describe('Audit Logging', () => {
  it('logDecision records entry', () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'test',
      user: { userId: 'node_123' },
    });

    const result = DE.createResult({
      allow: true,
      level: 'allow',
      confidence: 0.5,
      reasoning: 'Test logging',
      sources: ['test_eval'],
    });

    DE.logDecision(context, result);

    const log = DE.getAuditLog(1);
    assert.strictEqual(log.length, 1);
    assert.strictEqual(log[0].event, 'user_prompt');
    assert.strictEqual(log[0].decision, 'allow');
  });

  it('getAuditLog respects limit', () => {
    // Log multiple entries
    for (let i = 0; i < 10; i++) {
      const ctx = DE.createContext({ event: `event_${i}`, action: 'test' });
      const res = DE.createResult({ allow: true, level: 'allow' });
      DE.logDecision(ctx, res);
    }

    const log5 = DE.getAuditLog(5);
    assert.ok(log5.length <= 5);
  });
});

// =============================================================================
// 12. INTEGRATION TESTS (3 tests)
// =============================================================================

describe('Full Evaluation Flow', () => {
  it('evaluates with multiple evaluators', async () => {
    const context = DE.createContext({
      event: 'user_prompt',
      action: 'elenchus',
      user: { userId: 'node_456', eScore: 0.5 },
      metadata: { promptLength: 50, severity: 'medium' },
      source: 'perceive.cjs',
    });

    const result = await DE.evaluate(context, { includeOrchestration: false });

    assert.ok(result.allow !== undefined);
    assert.ok(result.level);
    assert.ok(result.confidence);
    assert.ok(result.sources.length > 0);
    assert.ok(result.auditTrail);
  });

  it('blocking decision overrides high-confidence allow', async () => {
    const context = DE.createContext({
      event: 'pre_tool',
      action: 'delete',
      user: { eScore: 0.9 },
      metadata: { severity: 'critical' },
    });

    const result = await DE.evaluate(context, { includeOrchestration: false });

    assert.strictEqual(result.allow, false);
    assert.strictEqual(result.level, 'block');
  });

  it('handles evaluator exceptions gracefully', async () => {
    DE.registerEvaluator('error_eval', async (ctx) => {
      throw new Error('Evaluator crashed');
    });

    const context = DE.createContext({ event: 'test', action: 'test' });

    // Should not throw
    const result = await DE.evaluate(context, {
      includeOrchestration: false,
      evaluatorNames: ['trust_level', 'error_eval'],
    });

    assert.ok(result);
    assert.ok(result.sources.includes('trust_level'));
  });
});

console.log('*tail wag* Decision Engine Tests Ready');
