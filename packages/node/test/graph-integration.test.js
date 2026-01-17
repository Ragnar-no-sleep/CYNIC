/**
 * Graph-Judgment Integration Tests
 *
 * Tests for the bridge between CYNIC judgments and the relationship graph.
 *
 * "Judgments without relationships are just opinions" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

import { CYNICJudge, JudgmentGraphIntegration } from '../src/index.js';
import { GraphOverlay, createTokenNode, createWalletNode } from '@cynic/persistence/graph';

describe('JudgmentGraphIntegration', () => {
  let judge;
  let graph;
  let integration;

  beforeEach(async () => {
    // Create fresh instances for each test
    judge = new CYNICJudge();
    graph = new GraphOverlay({
      basePath: './test-data/graph',
    });
    await graph.init();

    integration = new JudgmentGraphIntegration({
      judge,
      graph,
      enrichContext: true,
      contextDepth: 2,
    });
  });

  describe('Initialization', () => {
    it('should require judge instance', () => {
      assert.throws(() => {
        new JudgmentGraphIntegration({ graph });
      }, /requires a judge instance/);
    });

    it('should require graph instance', () => {
      assert.throws(() => {
        new JudgmentGraphIntegration({ judge });
      }, /requires a graph instance/);
    });

    it('should initialize successfully', async () => {
      await integration.init();
      assert.strictEqual(integration._initialized, true);
    });

    it('should create CYNIC node in graph', async () => {
      await integration.init();
      assert.ok(integration.cynicNodeId);

      const cynicNode = await graph.getNode(integration.cynicNodeId);
      assert.ok(cynicNode);
      assert.strictEqual(cynicNode.type, 'node');
    });

    it('should emit initialized event', async () => {
      let eventData = null;
      integration.on('initialized', (data) => {
        eventData = data;
      });

      await integration.init();
      assert.ok(eventData);
      assert.ok(eventData.cynicNodeId);
    });
  });

  describe('judgeWithGraph', () => {
    beforeEach(async () => {
      await integration.init();
    });

    it('should perform judgment and return result', async () => {
      const item = {
        type: 'code',
        content: 'function test() { return true; }',
      };

      const result = await integration.judgeWithGraph(item);

      assert.ok(result);
      assert.ok(result.qScore >= 0 && result.qScore <= 100);
      assert.ok(result.verdict);
      assert.ok(result.axiomScores);
    });

    it('should create JUDGED edge in graph', async () => {
      const item = {
        type: 'code',
        content: 'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
      };

      const result = await integration.judgeWithGraph(item);

      assert.ok(result.graphEdge);
      assert.ok(result.graphEdge.edgeId);
      assert.strictEqual(result.graphEdge.sourceId, integration.cynicNodeId);
    });

    it('should emit judgment-completed event', async () => {
      let eventData = null;
      integration.on('judgment-completed', (data) => {
        eventData = data;
      });

      await integration.judgeWithGraph({
        type: 'decision',
        content: 'We decided to use PostgreSQL for persistence.',
      });

      assert.ok(eventData);
      assert.ok(eventData.judgmentId);
      assert.ok(typeof eventData.qScore === 'number');
      assert.ok(eventData.verdict);
      assert.strictEqual(eventData.hasGraphEdge, true);
    });

    it('should track judgment statistics', async () => {
      await integration.judgeWithGraph({ type: 'code', content: 'test 1' });
      await integration.judgeWithGraph({ type: 'code', content: 'test 2' });
      await integration.judgeWithGraph({ type: 'code', content: 'test 3' });

      const stats = integration.getStats();
      assert.strictEqual(stats.judgmentsProcessed, 3);
      assert.strictEqual(stats.edgesCreated, 3);
      assert.strictEqual(stats.errors, 0);
    });
  });

  describe('Context Enrichment', () => {
    beforeEach(async () => {
      await integration.init();

      // Add some entities to the graph for enrichment
      const token = createTokenNode('abc123', 'TEST', { kScore: 75 });
      await graph.addNode(token);

      const wallet = createWalletNode('wallet123', { balance: 1000 });
      await graph.addNode(wallet);

      // Connect them
      await graph.addHolds(wallet.id, token.id, 500);
    });

    it('should enrich context with graph data when entity exists', async () => {
      // First, add a token to judge
      const tokenNode = await graph.getNodeByKey('token', 'abc123');

      let enrichedContext = null;
      integration.on('context-enriched', (data) => {
        enrichedContext = data.relationshipContext;
      });

      await integration.judgeWithGraph(
        {
          type: 'TOKEN',
          content: 'Token quality check',
          entityId: tokenNode.id,
        },
        {}
      );

      assert.ok(enrichedContext);
      assert.strictEqual(enrichedContext.nodeType, 'token');
    });

    it('should track context enrichments in stats', async () => {
      const tokenNode = await graph.getNodeByKey('token', 'abc123');

      await integration.judgeWithGraph({
        type: 'TOKEN',
        content: 'Token check',
        entityId: tokenNode.id,
      });

      const stats = integration.getStats();
      assert.strictEqual(stats.contextEnrichments, 1);
    });
  });

  describe('Judgment History', () => {
    beforeEach(async () => {
      await integration.init();
    });

    it('should retrieve judgment history for entity', async () => {
      // Create entity
      const token = createTokenNode('history-test', 'HIST', {});
      await graph.addNode(token);

      // Judge it multiple times
      await integration.judgeWithGraph({
        type: 'TOKEN',
        content: 'First judgment',
        entityId: token.id,
      });

      await integration.judgeWithGraph({
        type: 'TOKEN',
        content: 'Second judgment',
        entityId: token.id,
      });

      const history = await integration.getJudgmentHistory(token.id);

      assert.strictEqual(history.length, 2);
      assert.ok(history[0].judgmentId);
      assert.ok(history[0].qScore >= 0);
      assert.ok(history[0].verdict);
      assert.ok(history[0].timestamp);
    });

    it('should return history sorted by timestamp descending', async () => {
      const token = createTokenNode('history-sort', 'HSRT', {});
      await graph.addNode(token);

      await integration.judgeWithGraph({
        type: 'TOKEN',
        content: 'Older judgment',
        entityId: token.id,
      });

      // Small delay
      await new Promise((r) => setTimeout(r, 10));

      await integration.judgeWithGraph({
        type: 'TOKEN',
        content: 'Newer judgment',
        entityId: token.id,
      });

      const history = await integration.getJudgmentHistory(token.id);

      assert.strictEqual(history.length, 2);
      assert.ok(history[0].timestamp >= history[1].timestamp);
    });
  });

  describe('Query Judgments', () => {
    beforeEach(async () => {
      await integration.init();
    });

    it('should query all judgments', async () => {
      await integration.judgeWithGraph({ type: 'code', content: 'test 1' });
      await integration.judgeWithGraph({ type: 'code', content: 'test 2' });

      const judgments = await integration.queryJudgments();

      assert.ok(Array.isArray(judgments));
      assert.ok(judgments.length >= 2);
    });

    it('should filter by verdict', async () => {
      // Create judgments with different qualities
      await integration.judgeWithGraph({
        type: 'code',
        content: 'Well-structured, tested, documented code with clear purpose',
      });

      await integration.judgeWithGraph({
        type: 'code',
        content: 'x',
      });

      // Query filtering by HOWL verdict
      const howlJudgments = await integration.queryJudgments({
        verdict: 'HOWL',
      });

      // All returned should be HOWL
      for (const j of howlJudgments) {
        assert.strictEqual(j.attributes.verdict, 'HOWL');
      }
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await integration.judgeWithGraph({ type: 'code', content: `test ${i}` });
      }

      const judgments = await integration.queryJudgments({ limit: 5 });

      assert.ok(judgments.length <= 5);
    });
  });

  describe('Related Judgments', () => {
    beforeEach(async () => {
      await integration.init();
    });

    it('should find related judgments via graph connections', async () => {
      // Create a network of related entities
      const project = await graph.addProject('TestProject', {});
      const token = await graph.addToken('proj-token', 'PROJ', {});
      const repo = await graph.addRepo('https://github.com/test/proj', {});

      // Connect them
      await graph.addOwns(project.id, token.id);
      await graph.addDevelops(project.id, repo.id);

      // Judge the token
      await integration.judgeWithGraph({
        type: 'TOKEN',
        content: 'Token for test project',
        entityId: token.id,
      });

      // Judge the repo
      await integration.judgeWithGraph({
        type: 'REPO',
        content: 'Repository with good tests',
        entityId: repo.id,
      });

      // Find related from project
      const related = await integration.findRelatedJudgments(project.id, 2);

      assert.ok(Array.isArray(related));
      // Should find judgments for token and repo
      assert.ok(related.length >= 2);
    });

    it('should include distance in related judgments', async () => {
      const project = await graph.addProject('DistTest', {});
      const token = await graph.addToken('dist-token', 'DIST', {});

      await graph.addOwns(project.id, token.id);

      await integration.judgeWithGraph({
        type: 'TOKEN',
        content: 'Token judgment',
        entityId: token.id,
      });

      const related = await integration.findRelatedJudgments(project.id, 2);

      const tokenJudgment = related.find((r) => r.entityType === 'token');
      assert.ok(tokenJudgment);
      assert.strictEqual(tokenJudgment.distance, 1); // 1 hop from project
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await integration.init();

      const health = await integration.healthCheck();

      assert.strictEqual(health.healthy, true);
      assert.ok(health.stats);
      assert.ok(health.graphStats);
      assert.strictEqual(health.cynicNodeExists, true);
    });

    it('should return unhealthy if not initialized', async () => {
      // Create integration without graph
      const badIntegration = new JudgmentGraphIntegration({
        judge,
        graph: {
          init: () => {
            throw new Error('Graph failed');
          },
        },
      });

      const health = await badIntegration.healthCheck();

      assert.strictEqual(health.healthy, false);
      assert.ok(health.error);
    });
  });
});
