/**
 * Tests for Orchestration Domain (KETER)
 *
 * "φ distrusts φ" - Testing the central consciousness
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EVENT_TYPES,
  INTERVENTION_LEVELS,
  SEFIROT_ROUTING,
  TRUST_THRESHOLDS,
  routeToSefirah,
  determineIntervention,
  detectActionRisk,
  createOrchestrateTool,
} from '../../src/tools/domains/orchestration.js';
import { PHI_INV } from '@cynic/core';

describe('Orchestration Domain', () => {
  describe('Constants', () => {
    it('should export all event types', () => {
      expect(EVENT_TYPES.USER_PROMPT).toBe('user_prompt');
      expect(EVENT_TYPES.TOOL_USE).toBe('tool_use');
      expect(EVENT_TYPES.SESSION_START).toBe('session_start');
      expect(EVENT_TYPES.SESSION_END).toBe('session_end');
      expect(EVENT_TYPES.FILE_CHANGE).toBe('file_change');
      expect(EVENT_TYPES.ERROR).toBe('error');
      expect(EVENT_TYPES.JUDGMENT_REQUEST).toBe('judgment_request');
    });

    it('should export all intervention levels', () => {
      expect(INTERVENTION_LEVELS.SILENT).toBe('silent');
      expect(INTERVENTION_LEVELS.NOTIFY).toBe('notify');
      expect(INTERVENTION_LEVELS.ASK).toBe('ask');
      expect(INTERVENTION_LEVELS.BLOCK).toBe('block');
    });

    it('should have trust thresholds based on φ', () => {
      expect(TRUST_THRESHOLDS.GUARDIAN).toBeCloseTo(PHI_INV * 100, 1);
      expect(TRUST_THRESHOLDS.STEWARD).toBeCloseTo(PHI_INV ** 2 * 100, 1);
      expect(TRUST_THRESHOLDS.BUILDER).toBe(30);
      expect(TRUST_THRESHOLDS.CONTRIBUTOR).toBe(15);
      expect(TRUST_THRESHOLDS.OBSERVER).toBe(0);
    });

    it('should have all 10 Sefirot routings (excluding Keter)', () => {
      expect(Object.keys(SEFIROT_ROUTING)).toHaveLength(10);
      expect(SEFIROT_ROUTING.wisdom.sefirah).toBe('Chochmah');
      expect(SEFIROT_ROUTING.design.sefirah).toBe('Binah');
      expect(SEFIROT_ROUTING.memory.sefirah).toBe('Daat');
      expect(SEFIROT_ROUTING.analysis.sefirah).toBe('Chesed');
      expect(SEFIROT_ROUTING.protection.sefirah).toBe('Gevurah');
      expect(SEFIROT_ROUTING.visualization.sefirah).toBe('Tiferet');
      expect(SEFIROT_ROUTING.exploration.sefirah).toBe('Netzach');
      expect(SEFIROT_ROUTING.cleanup.sefirah).toBe('Yesod');
      expect(SEFIROT_ROUTING.deployment.sefirah).toBe('Hod');
      expect(SEFIROT_ROUTING.mapping.sefirah).toBe('Malkhut');
    });
  });

  describe('routeToSefirah', () => {
    it('should route wisdom queries to Chochmah (Sage)', () => {
      const result = routeToSefirah('What is the meaning of this code?', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Chochmah');
      expect(result.agent).toBe('cynic-sage');
    });

    it('should route design queries to Binah (Architect)', () => {
      const result = routeToSefirah('Design a new API structure', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Binah');
      expect(result.agent).toBe('cynic-architect');
    });

    it('should route memory queries to Daat (Archivist)', () => {
      const result = routeToSefirah('Remember the decision we made yesterday', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Daat');
      expect(result.agent).toBe('cynic-archivist');
    });

    it('should route analysis queries to Chesed (Analyst)', () => {
      const result = routeToSefirah('Analyze the pattern in these commits', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Chesed');
      expect(result.agent).toBe('cynic-analyst');
    });

    it('should route dangerous actions to Gevurah (Guardian)', () => {
      const result = routeToSefirah('Delete all test files', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Gevurah');
      expect(result.agent).toBe('cynic-guardian');
    });

    it('should route visualization to Tiferet (Oracle)', () => {
      const result = routeToSefirah('Show me the dashboard', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Tiferet');
      expect(result.agent).toBe('cynic-oracle');
    });

    it('should route exploration to Netzach (Scout)', () => {
      const result = routeToSefirah('Find all authentication files', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Netzach');
      expect(result.agent).toBe('cynic-scout');
    });

    it('should route cleanup to Yesod (Janitor)', () => {
      const result = routeToSefirah('Simplify this function', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Yesod');
      expect(result.agent).toBe('cynic-simplifier');
    });

    it('should route deployment to Hod (Deployer)', () => {
      const result = routeToSefirah('Deploy to production', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Hod');
      expect(result.agent).toBe('cynic-deployer');
    });

    it('should route mapping to Malkhut (Cartographer)', () => {
      const result = routeToSefirah('Give me a codebase overview', EVENT_TYPES.USER_PROMPT);
      expect(result.sefirah).toBe('Malkhut');
      expect(result.agent).toBe('cynic-cartographer');
    });

    it('should route judgment requests to Guardian', () => {
      const result = routeToSefirah('Evaluate this token', EVENT_TYPES.JUDGMENT_REQUEST);
      expect(result.sefirah).toBe('Gevurah');
    });

    it('should route errors to Analyst', () => {
      const result = routeToSefirah('Something failed', EVENT_TYPES.ERROR);
      expect(result.sefirah).toBe('Chesed');
    });

    it('should return null for unroutable generic prompts', () => {
      const result = routeToSefirah('Hello there', EVENT_TYPES.USER_PROMPT);
      expect(result).toBeNull();
    });
  });

  describe('detectActionRisk', () => {
    it('should detect critical risk for destructive commands', () => {
      expect(detectActionRisk('rm -rf /')).toBe('critical');
      expect(detectActionRisk('DROP DATABASE users')).toBe('critical');
      expect(detectActionRisk('git reset --hard origin/main')).toBe('critical');
      expect(detectActionRisk('force push to main')).toBe('critical');
    });

    it('should detect high risk for significant changes', () => {
      expect(detectActionRisk('delete the user table')).toBe('high');
      expect(detectActionRisk('deploy to production')).toBe('high');
      expect(detectActionRisk('update the API key')).toBe('high');
      expect(detectActionRisk('push to master branch')).toBe('high');
    });

    it('should detect medium risk for modifications', () => {
      expect(detectActionRisk('modify the config')).toBe('medium');
      expect(detectActionRisk('refactor this function')).toBe('medium');
      expect(detectActionRisk('install new dependencies')).toBe('medium');
    });

    it('should detect low risk for safe operations', () => {
      expect(detectActionRisk('show me the code')).toBe('low');
      expect(detectActionRisk('explain this function')).toBe('low');
      expect(detectActionRisk('run the tests')).toBe('low');
    });
  });

  describe('determineIntervention', () => {
    it('should block critical actions for low trust users', () => {
      expect(determineIntervention(10, 'critical')).toBe(INTERVENTION_LEVELS.BLOCK);
      expect(determineIntervention(20, 'critical')).toBe(INTERVENTION_LEVELS.BLOCK);
    });

    it('should ask for critical actions even for high trust users', () => {
      expect(determineIntervention(70, 'critical')).toBe(INTERVENTION_LEVELS.ASK);
      expect(determineIntervention(50, 'critical')).toBe(INTERVENTION_LEVELS.ASK);
    });

    it('should be silent for low risk actions by high trust users', () => {
      expect(determineIntervention(70, 'low')).toBe(INTERVENTION_LEVELS.SILENT);
      expect(determineIntervention(50, 'low')).toBe(INTERVENTION_LEVELS.SILENT);
    });

    it('should notify for medium risk actions by stewards', () => {
      expect(determineIntervention(40, 'medium')).toBe(INTERVENTION_LEVELS.NOTIFY);
    });

    it('should adapt based on E-Score thresholds', () => {
      // Guardian (62%) - most permissive
      expect(determineIntervention(65, 'high')).toBe(INTERVENTION_LEVELS.NOTIFY);

      // Steward (39%) - more cautious
      expect(determineIntervention(40, 'high')).toBe(INTERVENTION_LEVELS.ASK);

      // Builder (30%) - asks often
      expect(determineIntervention(32, 'high')).toBe(INTERVENTION_LEVELS.ASK);

      // Observer (0-15%) - most restrictive
      expect(determineIntervention(10, 'high')).toBe(INTERVENTION_LEVELS.BLOCK);
    });
  });

  describe('createOrchestrateTool', () => {
    let orchestrateTool;

    beforeEach(() => {
      orchestrateTool = createOrchestrateTool({});
    });

    it('should create tool with correct name and description', () => {
      expect(orchestrateTool.name).toBe('brain_orchestrate');
      expect(orchestrateTool.description).toContain('KETER');
      expect(orchestrateTool.description).toContain('orchestration');
    });

    it('should have proper input schema', () => {
      expect(orchestrateTool.inputSchema.type).toBe('object');
      expect(orchestrateTool.inputSchema.properties.event).toBeDefined();
      expect(orchestrateTool.inputSchema.properties.data).toBeDefined();
      expect(orchestrateTool.inputSchema.properties.context).toBeDefined();
      expect(orchestrateTool.inputSchema.required).toContain('event');
      expect(orchestrateTool.inputSchema.required).toContain('data');
    });

    it('should handle user_prompt events', async () => {
      const result = await orchestrateTool.handler({
        event: EVENT_TYPES.USER_PROMPT,
        data: { content: 'Design a new feature' },
        context: { user: 'test-user' },
      });

      expect(result.routing.sefirah).toBe('Binah');
      expect(result.routing.suggestedAgent).toBe('cynic-architect');
      expect(result.intervention).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.confidence).toBeCloseTo(PHI_INV, 4);
    });

    it('should detect dangerous actions and suggest Guardian', async () => {
      const result = await orchestrateTool.handler({
        event: EVENT_TYPES.USER_PROMPT,
        data: { content: 'rm -rf /tmp/test' },
        context: {},
      });

      expect(result.intervention.actionRisk).toBe('critical');
      expect(result.actions.some(a => a.tool === 'brain_cynic_judge')).toBe(true);
    });

    it('should suggest awakening on session start', async () => {
      const result = await orchestrateTool.handler({
        event: EVENT_TYPES.SESSION_START,
        data: { content: 'Starting session' },
        context: {},
      });

      expect(result.actions.some(a => a.tool === 'brain_session_awaken')).toBe(true);
    });

    it('should return Keter for unroutable events', async () => {
      const result = await orchestrateTool.handler({
        event: EVENT_TYPES.USER_PROMPT,
        data: { content: 'Hello there' },
        context: {},
      });

      expect(result.routing.sefirah).toBe('Keter');
      expect(result.routing.domain).toBe('general');
    });

    it('should include max φ⁻¹ confidence', async () => {
      const result = await orchestrateTool.handler({
        event: EVENT_TYPES.USER_PROMPT,
        data: { content: 'test' },
        context: {},
      });

      expect(result.confidence).toBeCloseTo(PHI_INV, 4);
    });
  });
});
