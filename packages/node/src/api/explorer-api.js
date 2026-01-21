/**
 * CYNIC Ecosystem Explorer API
 *
 * REST API for browsing judgments, blocks, operators, burns - solscan style
 *
 * "φ distrusts φ" - κυνικός
 *
 * @module @cynic/node/api/explorer
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '@cynic/core';

/**
 * Setup explorer routes
 * @param {Express.Application} app - Express app
 * @param {Object} options - Options
 * @param {CYNICNode} options.node - CYNIC node
 */
export function setupExplorerRoutes(app, options = {}) {
  const { node } = options;

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPLORER OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /explorer - Explorer overview/stats
   */
  app.get('/explorer', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const summary = node.state.getSummary();
      const gossipStats = node.gossip.getStats();
      const info = node.getInfo();

      // Consensus stats
      const consensusStats = node._consensus ? {
        state: node._consensus.state,
        currentSlot: node._consensus.getCurrentSlot?.() || 0,
        validators: node._consensus.getValidators?.()?.length || 0,
        lastFinalizedSlot: node._consensus.lastFinalizedSlot || 0,
      } : null;

      // Transport stats
      const transportStats = node._transport ? {
        peers: node._transport.getConnectedPeers?.()?.length || 0,
        port: node._transportConfig?.port || 8618,
        listening: node._transport.isListening?.() || false,
      } : null;

      res.json({
        name: 'CYNIC Ecosystem Explorer',
        version: '0.1.0',
        network: process.env.CYNIC_NETWORK || 'mainnet',
        stats: {
          judgments: summary.judgmentCount || 0,
          blocks: summary.chainHeight || 0,
          operators: gossipStats.peers || 0,
          uptime: info.uptime || 0,
        },
        phi: {
          maxConfidence: PHI_INV,
          minDoubt: PHI_INV_2,
          consensusThreshold: PHI_INV,
        },
        consensus: consensusStats,
        transport: transportStats,
        timestamp: Date.now(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JUDGMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /explorer/judgments - List recent judgments (paginated)
   */
  app.get('/explorer/judgments', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const offset = parseInt(req.query.offset, 10) || 0;
      const verdict = req.query.verdict; // Filter by verdict

      let judgments = node.state.getRecentJudgments(1000);

      // Filter by verdict if specified
      if (verdict) {
        judgments = judgments.filter(j => j.verdict === verdict || j.qVerdict?.verdict === verdict);
      }

      // Paginate
      const total = judgments.length;
      const paged = judgments.slice(-(limit + offset)).slice(0, limit).reverse();

      res.json({
        judgments: paged.map(j => ({
          id: j.id,
          timestamp: j.timestamp,
          globalScore: j.global_score,
          qScore: j.qScore,
          verdict: j.verdict,
          qVerdict: j.qVerdict?.verdict,
          confidence: j.confidence,
          consensusStatus: j.consensusStatus,
          consensusSlot: j.consensusSlot,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  /**
   * GET /explorer/judgment/:id - Get specific judgment
   */
  app.get('/explorer/judgment/:id', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const { id } = req.params;
      const judgments = node.state.getRecentJudgments(1000);
      const judgment = judgments.find(j => j.id === id);

      if (!judgment) {
        return res.status(404).json({ error: 'Judgment not found', id });
      }

      res.json({
        judgment: {
          id: judgment.id,
          timestamp: judgment.timestamp,
          globalScore: judgment.global_score,
          qScore: judgment.qScore,
          verdict: judgment.verdict,
          qVerdict: judgment.qVerdict,
          confidence: judgment.confidence,
          axiomScores: judgment.axiomScores,
          dimensions: judgment.dimensions,
          weaknesses: judgment.weaknesses,
          voteWeight: judgment.voteWeight,
          consensusStatus: judgment.consensusStatus,
          consensusSlot: judgment.consensusSlot,
          consensusBlockHash: judgment.consensusBlockHash,
          item: judgment.item || judgment._item, // Original item if stored
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCKS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /explorer/blocks - List blocks (paginated, with persistence fallback)
   */
  app.get('/explorer/blocks', async (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

      // Get blocks from StateManager (includes persistence)
      const recentBlocks = await node.state.getRecentBlocks(limit);
      const height = await node.state.getBlockCount();

      const blocks = recentBlocks.map(block => ({
        slot: block.slot,
        hash: block.hash,
        previousHash: block.previousHash || block.prevHash,
        timestamp: block.timestamp,
        proposer: block.proposer ? (block.proposer.slice(0, 16) + '...') : '-',
        judgmentCount: block.judgmentCount || block.judgments?.length || 0,
        status: block.status || 'UNKNOWN',
      }));

      res.json({
        blocks,
        pagination: {
          height,
          limit,
          hasMore: height > blocks.length,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  /**
   * GET /explorer/block/:hashOrSlot - Get block by hash or slot (with persistence)
   */
  app.get('/explorer/block/:hashOrSlot', async (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const { hashOrSlot } = req.params;

      let block;
      if (/^\d+$/.test(hashOrSlot)) {
        // Get by slot (uses persistence fallback)
        block = await node.state.getBlockBySlot(parseInt(hashOrSlot, 10));
      } else {
        // Get by hash (uses persistence fallback)
        block = await node.state.getBlockByHash(hashOrSlot);
      }

      if (!block) {
        return res.status(404).json({ error: 'Block not found', hashOrSlot });
      }

      res.json({
        block: {
          slot: block.slot,
          hash: block.hash,
          previousHash: block.previousHash || block.prevHash,
          timestamp: block.timestamp,
          proposer: block.proposer,
          signature: block.signature,
          judgments: block.judgments?.map(j => ({
            id: j.id,
            globalScore: j.global_score,
            verdict: j.verdict,
          })) || [],
          status: block.status || 'UNKNOWN',
          confirmations: block.confirmations || 0,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATORS / VALIDATORS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /explorer/operators - List operators/validators
   */
  app.get('/explorer/operators', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const operators = [];

      // Add self
      const selfInfo = node.operator;
      operators.push({
        publicKey: selfInfo.publicKey,
        nodeId: selfInfo.nodeId,
        eScore: selfInfo.getEScore?.() || selfInfo.eScore || 50,
        burned: selfInfo.burned || 0,
        isSelf: true,
        status: 'ACTIVE',
      });

      // Add peers from gossip
      const peers = node.state.getAllPeers();
      for (const peer of peers) {
        operators.push({
          publicKey: peer.publicKey || peer.id,
          nodeId: peer.id,
          eScore: peer.eScore || 50,
          burned: peer.burned || 0,
          isSelf: false,
          status: 'CONNECTED',
          address: peer.address,
        });
      }

      // Add validators from consensus if available
      if (node._consensus?.getValidators) {
        const validators = node._consensus.getValidators();
        for (const v of validators) {
          if (!operators.find(o => o.publicKey === v.publicKey)) {
            operators.push({
              publicKey: v.publicKey,
              eScore: v.eScore || 50,
              burned: v.burned || 0,
              isSelf: false,
              status: 'VALIDATOR',
            });
          }
        }
      }

      res.json({
        operators,
        count: operators.length,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  /**
   * GET /explorer/operator/:pubkey - Get operator details
   */
  app.get('/explorer/operator/:pubkey', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const { pubkey } = req.params;

      // Check if it's self
      if (pubkey === node.operator.publicKey || pubkey === node.operator.nodeId) {
        const selfInfo = node.operator;
        return res.json({
          operator: {
            publicKey: selfInfo.publicKey,
            nodeId: selfInfo.nodeId,
            eScore: selfInfo.getEScore?.() || selfInfo.eScore || 50,
            burned: selfInfo.burned || 0,
            isSelf: true,
            status: 'ACTIVE',
            uptime: node.getInfo().uptime || 0,
          },
        });
      }

      // Check peers
      const peer = node.state.getPeer(pubkey);
      if (peer) {
        return res.json({
          operator: {
            publicKey: peer.publicKey || peer.id,
            nodeId: peer.id,
            eScore: peer.eScore || 50,
            burned: peer.burned || 0,
            isSelf: false,
            status: 'CONNECTED',
            address: peer.address,
          },
        });
      }

      res.status(404).json({ error: 'Operator not found', pubkey });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BURNS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /explorer/burns - List verified burns (from burn verifier)
   */
  app.get('/explorer/burns', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

      // Get burns from verifier if available
      const burns = [];
      if (node._burnVerifier?.getVerifiedBurns) {
        const verified = node._burnVerifier.getVerifiedBurns();
        for (const [sig, burn] of Object.entries(verified)) {
          burns.push({
            signature: sig,
            mint: burn.mint,
            amount: burn.amount,
            burner: burn.burner,
            timestamp: burn.timestamp,
            slot: burn.slot,
            verified: true,
          });
        }
      }

      // Sort by timestamp desc
      burns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      res.json({
        burns: burns.slice(0, limit),
        count: burns.length,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /explorer/search?q=<query> - Universal search
   */
  app.get('/explorer/search', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const query = req.query.q?.trim();
      if (!query) {
        return res.status(400).json({ error: 'Query required' });
      }

      const results = [];

      // Search judgments by ID
      const judgments = node.state.getRecentJudgments(1000);
      const matchingJudgments = judgments.filter(j =>
        j.id?.includes(query) ||
        j.consensusBlockHash?.includes(query)
      );
      for (const j of matchingJudgments.slice(0, 5)) {
        results.push({
          type: 'judgment',
          id: j.id,
          preview: `Score: ${j.global_score?.toFixed(1)}, Verdict: ${j.verdict}`,
          url: `/explorer/judgment/${j.id}`,
        });
      }

      // Search blocks by hash or slot
      const chain = node.state.chain;
      if (/^\d+$/.test(query)) {
        const block = chain.getBlockBySlot?.(parseInt(query, 10));
        if (block) {
          results.push({
            type: 'block',
            id: block.hash,
            preview: `Slot: ${block.slot}, Judgments: ${block.judgments?.length || 0}`,
            url: `/explorer/block/${block.slot}`,
          });
        }
      } else if (query.length >= 8) {
        const block = chain.getBlock?.(query);
        if (block) {
          results.push({
            type: 'block',
            id: block.hash,
            preview: `Slot: ${block.slot}, Judgments: ${block.judgments?.length || 0}`,
            url: `/explorer/block/${block.hash}`,
          });
        }
      }

      // Search operators by pubkey
      const peers = node.state.getAllPeers();
      const matchingPeers = peers.filter(p =>
        p.publicKey?.includes(query) || p.id?.includes(query)
      );
      for (const p of matchingPeers.slice(0, 3)) {
        results.push({
          type: 'operator',
          id: p.publicKey || p.id,
          preview: `E-Score: ${p.eScore || 50}`,
          url: `/explorer/operator/${p.publicKey || p.id}`,
        });
      }

      // Check if query matches self
      if (node.operator.publicKey?.includes(query) || node.operator.nodeId?.includes(query)) {
        results.unshift({
          type: 'operator',
          id: node.operator.publicKey,
          preview: `E-Score: ${node.operator.getEScore?.() || 50} (self)`,
          url: `/explorer/operator/${node.operator.publicKey}`,
        });
      }

      res.json({
        query,
        results,
        count: results.length,
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING STATS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /explorer/learning - Get learning service stats
   */
  app.get('/explorer/learning', (req, res) => {
    if (!node) {
      return res.status(503).json({ error: 'Node not available' });
    }

    try {
      const learningService = node._learningService;
      if (!learningService) {
        return res.json({ available: false });
      }

      const stats = learningService.getStats?.() || {};
      const recentFeedback = learningService.getRecentFeedback?.() || [];

      res.json({
        available: true,
        stats: {
          totalFeedback: stats.totalFeedback || 0,
          correctJudgments: stats.correctJudgments || 0,
          incorrectJudgments: stats.incorrectJudgments || 0,
          accuracy: stats.accuracy || 0,
          feedbackBySources: stats.feedbackBySource || {},
        },
        recentFeedback: recentFeedback.slice(0, 10).map(f => ({
          itemId: f.itemId,
          outcome: f.outcome,
          source: f.source,
          timestamp: f.timestamp,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal error', message: err.message });
    }
  });

  console.log('🔍 Explorer API enabled');
}

export default { setupExplorerRoutes };
