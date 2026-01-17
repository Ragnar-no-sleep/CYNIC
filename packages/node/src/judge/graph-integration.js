/**
 * Graph-Judgment Integration
 *
 * Connects the judgment engine to the relationship graph.
 * Every judgment creates a JUDGED edge, forming the corpus callosum.
 *
 * "Judgments without relationships are just opinions" - κυνικός
 *
 * @module @cynic/node/judge/graph-integration
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV } from '@cynic/core';

/**
 * Graph-Judgment Integration Service
 *
 * Bidirectional connection:
 * 1. Judge → Graph: Creates JUDGED edges after each judgment
 * 2. Graph → Judge: Enriches context with relationship data before judgment
 */
export class JudgmentGraphIntegration extends EventEmitter {
  /**
   * @param {Object} options - Integration options
   * @param {import('./judge.js').CYNICJudge} options.judge - The CYNIC judge
   * @param {import('@cynic/persistence').GraphOverlay} options.graph - The relationship graph
   * @param {string} [options.cynicNodeId] - CYNIC's node ID in the graph (auto-created if not provided)
   * @param {boolean} [options.enrichContext=true] - Whether to enrich context before judgment
   * @param {number} [options.contextDepth=2] - Depth of graph context to fetch
   */
  constructor(options = {}) {
    super();

    if (!options.judge) {
      throw new Error('JudgmentGraphIntegration requires a judge instance');
    }
    if (!options.graph) {
      throw new Error('JudgmentGraphIntegration requires a graph instance');
    }

    this.judge = options.judge;
    this.graph = options.graph;
    this.cynicNodeId = options.cynicNodeId || null;
    this.enrichContext = options.enrichContext !== false;
    this.contextDepth = options.contextDepth || 2;

    this._initialized = false;
    this._stats = {
      judgmentsProcessed: 0,
      edgesCreated: 0,
      contextEnrichments: 0,
      errors: 0,
    };
  }

  /**
   * Initialize the integration
   */
  async init() {
    if (this._initialized) return;

    // Ensure graph is initialized
    await this.graph.init();

    // Create or find CYNIC node
    if (!this.cynicNodeId) {
      this.cynicNodeId = await this._ensureCynicNode();
    }

    this._initialized = true;
    this.emit('initialized', { cynicNodeId: this.cynicNodeId });
  }

  /**
   * Ensure CYNIC node exists in graph
   * @private
   */
  async _ensureCynicNode() {
    const CYNIC_IDENTIFIER = 'cynic-meta-consciousness';

    // Try to find existing
    let cynicNode = await this.graph.getNodeByKey('NODE', CYNIC_IDENTIFIER);

    if (!cynicNode) {
      // Create CYNIC node using the graph's types
      const { createCynicNode } = await import('@cynic/persistence/graph');
      cynicNode = createCynicNode(CYNIC_IDENTIFIER, {
        name: 'CYNIC',
        role: 'meta-consciousness',
        sefirah: 'Keter',
        createdAt: Date.now(),
      });
      await this.graph.addNode(cynicNode);
      this.emit('cynic-node-created', cynicNode);
    }

    return cynicNode.id;
  }

  /**
   * Judge with graph integration
   *
   * This is the main entry point - wraps judge.judge() with graph operations:
   * 1. Enriches context with graph relationships (if enabled)
   * 2. Calls judge.judge()
   * 3. Creates JUDGED edge in graph
   *
   * @param {Object} item - Item to judge
   * @param {Object} [context] - Judgment context
   * @returns {Promise<Object>} Judgment result with graph metadata
   */
  async judgeWithGraph(item, context = {}) {
    await this.init();

    // Step 1: Enrich context with graph data
    let enrichedContext = context;
    if (this.enrichContext && item.entityId) {
      enrichedContext = await this._enrichContext(item, context);
    }

    // Step 2: Perform judgment
    const judgment = this.judge.judge(item, enrichedContext);
    this._stats.judgmentsProcessed++;

    // Step 3: Create graph edge
    try {
      const edgeData = await this._createJudgmentEdge(item, judgment);
      judgment.graphEdge = edgeData;
      this._stats.edgesCreated++;
    } catch (error) {
      this._stats.errors++;
      this.emit('error', {
        type: 'edge-creation-failed',
        judgmentId: judgment.id,
        error: error.message,
      });
    }

    this.emit('judgment-completed', {
      judgmentId: judgment.id,
      qScore: judgment.qScore,
      verdict: judgment.verdict,
      hasGraphEdge: !!judgment.graphEdge,
    });

    return judgment;
  }

  /**
   * Enrich context with graph relationships
   * @private
   */
  async _enrichContext(item, context) {
    const entityId = item.entityId;
    if (!entityId) return context;

    try {
      // Get entity node
      const entityNode = await this.graph.getNode(entityId);
      if (!entityNode) return context;

      // Get neighbors within depth
      const neighbors = await this.graph.getNeighbors(entityId, {
        direction: 'both',
      });

      // Get existing JUDGED edges for this entity
      const existingJudgments = await this._getExistingJudgments(entityId);

      // Calculate relationship scores
      const relationshipContext = {
        nodeType: entityNode.type,
        nodeAttributes: entityNode.attributes,
        neighborCount: neighbors.length,
        neighborTypes: this._countByType(neighbors),
        previousJudgments: existingJudgments,
        averagePreviousScore: this._calculateAverageScore(existingJudgments),
        graphInfluence: await this._calculateInfluence(entityId),
      };

      this._stats.contextEnrichments++;
      this.emit('context-enriched', { entityId, relationshipContext });

      return {
        ...context,
        graphContext: relationshipContext,
      };
    } catch (error) {
      this.emit('error', {
        type: 'context-enrichment-failed',
        entityId,
        error: error.message,
      });
      return context;
    }
  }

  /**
   * Get existing judgments for entity
   * @private
   */
  async _getExistingJudgments(entityId) {
    const edges = await this.graph.getEdges(entityId, 'judged');
    return edges.map((edge) => ({
      judgmentId: edge.attributes.judgmentId,
      qScore: edge.attributes.qScore,
      verdict: edge.attributes.verdict,
      timestamp: edge.attributes.timestamp,
    }));
  }

  /**
   * Count neighbors by type
   * @private
   */
  _countByType(neighbors) {
    const counts = {};
    for (const neighbor of neighbors) {
      counts[neighbor.type] = (counts[neighbor.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Calculate average score from previous judgments
   * @private
   */
  _calculateAverageScore(judgments) {
    if (judgments.length === 0) return null;
    const sum = judgments.reduce((acc, j) => acc + j.qScore, 0);
    return sum / judgments.length;
  }

  /**
   * Calculate entity influence in graph
   * @private
   */
  async _calculateInfluence(entityId) {
    try {
      // Get degree as simple influence measure
      const inDegree = await this.graph.getDegree(entityId, 'in');
      const outDegree = await this.graph.getDegree(entityId, 'out');

      // Normalize with φ
      const rawInfluence = (inDegree + outDegree) / 10; // 10 connections = 1.0
      return Math.min(rawInfluence, PHI_INV); // Cap at 61.8%
    } catch {
      return 0;
    }
  }

  /**
   * Create JUDGED edge in graph
   * @private
   */
  async _createJudgmentEdge(item, judgment) {
    // Determine target node
    let targetNodeId = item.entityId;

    // If no entity ID, try to create a node from item
    if (!targetNodeId) {
      targetNodeId = await this._createItemNode(item);
    }

    if (!targetNodeId) {
      throw new Error('Cannot create judgment edge: no target node');
    }

    // Create JUDGED edge using the existing method
    const edge = await this.graph.addJudged(this.cynicNodeId, targetNodeId, {
      judgmentId: judgment.id,
      qScore: judgment.qScore,
      verdict: judgment.verdict,
      timestamp: Date.now(),
      axiomScores: judgment.axiomScores,
      weaknesses: judgment.weaknesses, // Weakness analysis object
    });

    return {
      edgeId: edge.id,
      sourceId: this.cynicNodeId,
      targetId: targetNodeId,
    };
  }

  /**
   * Create node for item if it doesn't exist
   * @private
   */
  async _createItemNode(item) {
    const itemType = item.type?.toUpperCase();

    // Map item type to graph node type
    const nodeCreators = {
      TOKEN: () => this.graph.addToken(item.mintAddress || item.id, item.symbol || 'UNKNOWN', item),
      WALLET: () => this.graph.addWallet(item.address || item.id, item),
      PROJECT: () => this.graph.addProject(item.name || item.id, item),
      REPO: () => this.graph.addRepo(item.url || item.id, item),
      USER: () => this.graph.addUser(item.handle || item.id, item.platform || 'unknown', item),
      CODE: () => this._createCodeNode(item),
      DECISION: () => this._createDecisionNode(item),
      CONVERSATION: () => this._createConversationNode(item),
      DOCUMENT: () => this._createDocumentNode(item),
    };

    const creator = nodeCreators[itemType];
    if (creator) {
      const node = await creator();
      return node.id;
    }

    // Default: create generic node
    return this._createGenericNode(item);
  }

  /**
   * Create code node
   * @private
   */
  async _createCodeNode(item) {
    // Use repo node type for code
    const node = await this.graph.addRepo(item.path || item.id || `code-${Date.now()}`, {
      type: 'code',
      language: item.language,
      content: item.content?.substring(0, 500), // Truncate
    });
    return node;
  }

  /**
   * Create decision node
   * @private
   */
  async _createDecisionNode(item) {
    const node = await this.graph.addProject(`decision-${item.id || Date.now()}`, {
      type: 'decision',
      content: item.content?.substring(0, 500),
    });
    return node;
  }

  /**
   * Create conversation node
   * @private
   */
  async _createConversationNode(item) {
    const node = await this.graph.addProject(`conversation-${item.id || Date.now()}`, {
      type: 'conversation',
      content: item.content?.substring(0, 500),
    });
    return node;
  }

  /**
   * Create document node
   * @private
   */
  async _createDocumentNode(item) {
    const node = await this.graph.addRepo(item.source || `doc-${item.id || Date.now()}`, {
      type: 'document',
      content: item.content?.substring(0, 500),
    });
    return node;
  }

  /**
   * Create generic node for unknown types
   * @private
   */
  async _createGenericNode(item) {
    const node = await this.graph.addProject(`item-${item.id || Date.now()}`, {
      type: item.type || 'unknown',
      content: typeof item.content === 'string' ? item.content.substring(0, 500) : JSON.stringify(item).substring(0, 500),
    });
    return node.id;
  }

  /**
   * Query judgments via graph
   *
   * @param {Object} options - Query options
   * @param {string} [options.entityId] - Filter by entity
   * @param {string} [options.verdict] - Filter by verdict
   * @param {number} [options.minScore] - Minimum Q-Score
   * @param {number} [options.limit] - Max results
   * @returns {Promise<Object[]>} Judgment edges
   */
  async queryJudgments(options = {}) {
    await this.init();

    let query = this.graph.query().from(this.cynicNodeId).edgeType('judged').direction('out');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const edges = await query.edges();

    // Filter in memory (graph query doesn't support attribute filters yet)
    return edges.filter((edge) => {
      if (options.entityId && edge.targetId !== options.entityId) return false;
      if (options.verdict && edge.attributes.verdict !== options.verdict) return false;
      if (options.minScore && edge.attributes.qScore < options.minScore) return false;
      return true;
    });
  }

  /**
   * Get judgment history for an entity
   *
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object[]>} Judgment history
   */
  async getJudgmentHistory(entityId) {
    await this.init();

    const edges = await this.graph.getEdges(entityId, 'judged');

    return edges
      .map((edge) => ({
        judgmentId: edge.attributes.judgmentId,
        qScore: edge.attributes.qScore,
        verdict: edge.attributes.verdict,
        timestamp: edge.attributes.timestamp,
        axiomScores: edge.attributes.axiomScores,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Find related judgments (entities connected in graph)
   *
   * @param {string} entityId - Entity ID
   * @param {number} [hops=2] - Hops to search
   * @returns {Promise<Object[]>} Related judgments
   */
  async findRelatedJudgments(entityId, hops = 2) {
    await this.init();

    const relatedJudgments = [];
    const seen = new Set();

    // BFS through graph
    for await (const { node, depth } of this.graph.bfs(entityId, { maxDepth: hops })) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);

      // Get JUDGED edges for this node
      const judgments = await this._getExistingJudgments(node.id);
      for (const judgment of judgments) {
        relatedJudgments.push({
          ...judgment,
          entityId: node.id,
          entityType: node.type,
          distance: depth,
        });
      }
    }

    return relatedJudgments.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get integration statistics
   */
  getStats() {
    return {
      ...this._stats,
      cynicNodeId: this.cynicNodeId,
      initialized: this._initialized,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.init();

      const graphStats = await this.graph.getStats();
      const cynicNode = await this.graph.getNode(this.cynicNodeId);

      return {
        healthy: true,
        stats: this._stats,
        graphStats,
        cynicNodeExists: !!cynicNode,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}

export default JudgmentGraphIntegration;
