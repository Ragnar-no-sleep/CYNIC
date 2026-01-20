/**
 * CYNIC Dashboard - Chain Visualization Component
 * PoJ blockchain display with Q-Score gradients
 */

import { Utils } from '../lib/utils.js';

// PHI for proportions
const PHI = 1.618033988749895;

// Q-Score to color gradient (green -> yellow -> red)
function qScoreToColor(qScore) {
  const q = Math.max(0, Math.min(100, qScore || 50));
  if (q >= 70) {
    // Good: green to cyan
    const t = (q - 70) / 30;
    return `hsl(${160 + t * 20}, 80%, ${45 + t * 10}%)`;
  } else if (q >= 40) {
    // Medium: yellow to green
    const t = (q - 40) / 30;
    return `hsl(${60 + t * 100}, 80%, 50%)`;
  } else {
    // Low: red to yellow
    const t = q / 40;
    return `hsl(${t * 60}, 80%, 50%)`;
  }
}

// Verdict to emoji
function verdictEmoji(verdict) {
  const emojis = {
    HOWL: '🟢',
    WAG: '🟡',
    GROWL: '🟠',
    BARK: '🔴',
  };
  return emojis[verdict] || '⚪';
}

export class ChainViz {
  constructor(options = {}) {
    this.api = options.api || null;  // API client for fetching judgments
    this.onBlockClick = options.onBlockClick || (() => {});
    this.onJudgmentClick = options.onJudgmentClick || (() => {});
    this.container = null;
    this.blocks = [];
    this.selectedBlock = null;
    this.stats = { totalBlocks: 0, totalJudgments: 0, avgQScore: 0 };
    this.expandedBlocks = new Set();  // Blocks showing judgments
    this.viewMode = 'compact';  // 'compact' or 'detailed'
    this.loadingBlocks = new Set();  // Blocks currently loading judgments
  }

  /**
   * Render chain visualization
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);

    // Header with view toggle
    const header = Utils.createElement('div', { className: 'chain-header' }, [
      Utils.createElement('div', { className: 'chain-title' }, ['⛓️ PoJ Chain']),
      Utils.createElement('div', { className: 'chain-stats', id: 'chain-stats' }, [
        this._createStatSpan('Blocks', this.stats.totalBlocks),
        this._createStatSpan('Judgments', this.stats.totalJudgments),
        this.stats.avgQScore > 0
          ? this._createStatSpan('Avg Q', Math.round(this.stats.avgQScore))
          : null,
      ].filter(Boolean)),
      Utils.createElement('div', { className: 'chain-view-toggle' }, [
        Utils.createElement('button', {
          className: `chain-view-btn ${this.viewMode === 'compact' ? 'active' : ''}`,
          onClick: () => this._setViewMode('compact'),
        }, ['Compact']),
        Utils.createElement('button', {
          className: `chain-view-btn ${this.viewMode === 'detailed' ? 'active' : ''}`,
          onClick: () => this._setViewMode('detailed'),
        }, ['Detailed']),
      ]),
    ]);

    // Chain visualization
    const chainViz = Utils.createElement('div', {
      className: `chain-viz chain-viz-${this.viewMode}`,
      id: 'chain-viz',
    });
    this._renderBlocks(chainViz);

    // Block detail panel
    const blockDetail = Utils.createElement('div', { className: 'block-detail', id: 'block-detail' });

    container.appendChild(header);
    container.appendChild(chainViz);
    container.appendChild(blockDetail);
  }

  /**
   * Set view mode
   */
  _setViewMode(mode) {
    this.viewMode = mode;
    this.container?.querySelectorAll('.chain-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent === (mode === 'compact' ? 'Compact' : 'Detailed'));
    });
    const vizEl = document.getElementById('chain-viz');
    if (vizEl) {
      vizEl.className = `chain-viz chain-viz-${mode}`;
      this._renderBlocks(vizEl);
    }
  }

  /**
   * Create stat span
   */
  _createStatSpan(label, value) {
    return Utils.createElement('div', { className: 'chain-stat' }, [
      Utils.createElement('span', {}, [label + ': ']),
      Utils.createElement('span', { className: 'chain-stat-value' }, [Utils.formatNumber(value)]),
    ]);
  }

  /**
   * Render blocks
   */
  _renderBlocks(container) {
    Utils.clearElement(container);

    if (this.blocks.length === 0) {
      container.appendChild(
        Utils.createElement('div', { className: 'text-muted' }, ['No blocks yet'])
      );
      return;
    }

    if (this.viewMode === 'detailed') {
      this._renderBlocksDetailed(container);
    } else {
      this._renderBlocksCompact(container);
    }
  }

  /**
   * Render blocks in compact mode (horizontal chain)
   */
  _renderBlocksCompact(container) {
    this.blocks.forEach((block, i) => {
      const avgQ = block.avgQScore || 50;
      const qColor = qScoreToColor(avgQ);

      // Block element with Q-Score gradient border
      const blockEl = Utils.createElement('div', {
        className: `chain-block ${block.pending ? 'pending' : ''} ${this.selectedBlock === block.blockNumber ? 'selected' : ''}`,
        dataset: { blockNumber: block.blockNumber },
        onClick: () => this._selectBlock(block),
        style: `border-color: ${qColor}; box-shadow: 0 0 8px ${qColor}40;`,
      }, [
        Utils.createElement('span', { className: 'number' }, [`B#${block.blockNumber}`]),
        Utils.createElement('span', { className: 'count' }, [`${block.judgmentCount || 0} jdg`]),
        avgQ > 0 ? Utils.createElement('span', {
          className: 'q-badge',
          style: `background: ${qColor};`,
        }, [`Q${Math.round(avgQ)}`]) : null,
      ].filter(Boolean));

      container.appendChild(blockEl);

      // Connector with proof link (except last)
      if (i < this.blocks.length - 1) {
        const nextBlock = this.blocks[i + 1];
        const hasProof = !block.pending && nextBlock && !nextBlock.pending;
        const connector = Utils.createElement('div', {
          className: `chain-connector ${hasProof ? 'proven' : ''}`,
        }, [
          Utils.createElement('span', { className: 'connector-line' }, ['──']),
          hasProof ? Utils.createElement('span', { className: 'connector-proof' }, ['✓']) : null,
        ].filter(Boolean));
        container.appendChild(connector);
      }
    });
  }

  /**
   * Render blocks in detailed mode (vertical with judgments)
   */
  _renderBlocksDetailed(container) {
    // Reverse to show newest first
    const blocksReversed = [...this.blocks].reverse();

    blocksReversed.forEach((block) => {
      const avgQ = block.avgQScore || 50;
      const qColor = qScoreToColor(avgQ);
      const isExpanded = this.expandedBlocks.has(block.blockNumber);

      // Block card
      const blockCard = Utils.createElement('div', {
        className: `chain-block-card ${block.pending ? 'pending' : ''} ${this.selectedBlock === block.blockNumber ? 'selected' : ''}`,
        style: `border-left: 4px solid ${qColor};`,
      });

      // Header row
      const header = Utils.createElement('div', {
        className: 'block-card-header',
        onClick: () => this._toggleBlockExpand(block.blockNumber),
      }, [
        Utils.createElement('div', { className: 'block-card-title' }, [
          Utils.createElement('span', { className: 'block-number' }, [`Block #${block.blockNumber}`]),
          block.pending
            ? Utils.createElement('span', { className: 'block-status pending' }, ['⏳ Pending'])
            : Utils.createElement('span', { className: 'block-status confirmed' }, ['✓ Confirmed']),
        ]),
        Utils.createElement('div', { className: 'block-card-meta' }, [
          Utils.createElement('span', { className: 'block-time' }, [Utils.formatTime(block.timestamp, 'relative')]),
          Utils.createElement('span', {
            className: 'block-q',
            style: `color: ${qColor};`,
          }, [`Q: ${Math.round(avgQ)}`]),
          Utils.createElement('span', { className: 'block-jdg-count' }, [`${block.judgmentCount || 0} judgments`]),
          Utils.createElement('span', { className: 'block-expand-icon' }, [isExpanded ? '▼' : '▶']),
        ]),
      ]);

      blockCard.appendChild(header);

      // Show loading indicator if fetching judgments
      const isLoading = this.loadingBlocks.has(block.blockNumber);

      if (isExpanded && isLoading) {
        blockCard.appendChild(
          Utils.createElement('div', { className: 'block-judgments-loading' }, [
            Utils.createElement('span', { className: 'loading-spinner' }),
            'Loading judgments...',
          ])
        );
      } else if (isExpanded && block.judgments && block.judgments.length > 0) {
        // Judgments list (if expanded and has judgments)
        const judgmentsList = Utils.createElement('div', { className: 'block-judgments' });

        block.judgments.forEach(jdg => {
          const jdgQ = jdg.Q || jdg.qScore || 50;
          const jdgColor = qScoreToColor(jdgQ);
          const verdict = jdg.verdict || 'UNKNOWN';

          const jdgEl = Utils.createElement('div', {
            className: 'block-judgment',
            onClick: (e) => {
              e.stopPropagation();
              this.onJudgmentClick(jdg);
            },
          }, [
            Utils.createElement('span', { className: 'jdg-verdict' }, [verdictEmoji(verdict)]),
            Utils.createElement('span', { className: 'jdg-id' }, [jdg.id?.slice(0, 12) || 'unknown']),
            Utils.createElement('span', {
              className: 'jdg-q',
              style: `color: ${jdgColor};`,
            }, [`Q${Math.round(jdgQ)}`]),
            Utils.createElement('span', { className: 'jdg-type' }, [jdg.type || 'judgment']),
          ]);

          judgmentsList.appendChild(jdgEl);
        });

        blockCard.appendChild(judgmentsList);
      } else if (isExpanded && (!block.judgments || block.judgments.length === 0)) {
        blockCard.appendChild(
          Utils.createElement('div', { className: 'block-judgments-empty' }, ['No judgments in this block'])
        );
      }

      // Hash (if available)
      if (block.hash && !block.pending) {
        const hashEl = Utils.createElement('div', { className: 'block-hash' }, [
          Utils.createElement('span', { className: 'hash-label' }, ['Hash: ']),
          Utils.createElement('span', { className: 'hash-value' }, [block.hash.slice(0, 16) + '...']),
        ]);
        blockCard.appendChild(hashEl);
      }

      container.appendChild(blockCard);

      // Proof link to previous block
      if (blocksReversed.indexOf(block) < blocksReversed.length - 1) {
        const proofLink = Utils.createElement('div', { className: 'block-proof-link' }, [
          Utils.createElement('span', { className: 'proof-line' }),
          !block.pending ? Utils.createElement('span', { className: 'proof-icon' }, ['⬇']) : null,
        ].filter(Boolean));
        container.appendChild(proofLink);
      }
    });
  }

  /**
   * Toggle block expansion in detailed view
   */
  async _toggleBlockExpand(blockNumber) {
    if (this.expandedBlocks.has(blockNumber)) {
      this.expandedBlocks.delete(blockNumber);
      this._rerender();
      return;
    }

    // Find the block
    const block = this.blocks.find(b => b.blockNumber === blockNumber);
    if (!block) return;

    // If block doesn't have judgments loaded and API is available, fetch them
    if (!block.judgments && this.api && !this.loadingBlocks.has(blockNumber)) {
      this.loadingBlocks.add(blockNumber);
      this.expandedBlocks.add(blockNumber);
      this._rerender();

      try {
        const result = await this.api.chain('block', { blockNumber });
        if (result.success && result.result) {
          block.judgments = result.result.judgments || [];
          block.avgQScore = result.result.avgQScore || this._calculateAvgQScore(block.judgments);
        }
      } catch (err) {
        console.error('Failed to load block judgments:', err);
        block.judgments = [];
      }

      this.loadingBlocks.delete(blockNumber);
    } else {
      this.expandedBlocks.add(blockNumber);
    }

    this._rerender();
  }

  /**
   * Calculate average Q-Score from judgments
   */
  _calculateAvgQScore(judgments) {
    if (!judgments || judgments.length === 0) return 50;
    const total = judgments.reduce((sum, j) => sum + (j.Q || j.qScore || 50), 0);
    return total / judgments.length;
  }

  /**
   * Re-render blocks
   */
  _rerender() {
    const vizEl = document.getElementById('chain-viz');
    if (vizEl) {
      this._renderBlocks(vizEl);
    }
  }

  /**
   * Select a block
   */
  _selectBlock(block) {
    this.selectedBlock = block.blockNumber;

    // Update selected state
    this.container?.querySelectorAll('.chain-block').forEach(el => {
      el.classList.toggle('selected', el.dataset.blockNumber === String(block.blockNumber));
    });

    // Show detail panel
    this._showBlockDetail(block);

    // Callback
    this.onBlockClick(block);
  }

  /**
   * Show block detail panel
   */
  _showBlockDetail(block) {
    const detailEl = document.getElementById('block-detail');
    if (!detailEl) return;

    Utils.clearElement(detailEl);
    detailEl.classList.add('visible');

    detailEl.appendChild(
      Utils.createElement('div', { className: 'block-detail-header' }, [
        Utils.createElement('span', { className: 'block-detail-title' }, [`Block #${block.blockNumber}`]),
        Utils.createElement('button', {
          onClick: () => this._hideBlockDetail(),
        }, ['✕']),
      ])
    );

    const grid = Utils.createElement('div', { className: 'block-detail-grid' }, [
      this._createDetailItem('Judgments', block.judgmentCount || 0),
      this._createDetailItem('Timestamp', Utils.formatTime(block.timestamp, 'time')),
      this._createDetailItem('Date', Utils.formatTime(block.timestamp, 'date')),
      this._createDetailItem('Status', block.pending ? 'Pending' : 'Confirmed'),
    ]);

    detailEl.appendChild(grid);

    if (block.hash) {
      detailEl.appendChild(
        Utils.createElement('div', { className: 'block-detail-hash' }, [
          Utils.createElement('div', { className: 'block-detail-label' }, ['Hash']),
          Utils.createElement('div', {}, [block.hash]),
        ])
      );
    }
  }

  /**
   * Create detail item
   */
  _createDetailItem(label, value) {
    return Utils.createElement('div', { className: 'block-detail-item' }, [
      Utils.createElement('div', { className: 'block-detail-label' }, [label]),
      Utils.createElement('div', { className: 'block-detail-value' }, [String(value)]),
    ]);
  }

  /**
   * Hide block detail
   */
  _hideBlockDetail() {
    const detailEl = document.getElementById('block-detail');
    if (detailEl) {
      detailEl.classList.remove('visible');
    }
    this.selectedBlock = null;

    // Clear selection
    this.container?.querySelectorAll('.chain-block').forEach(el => {
      el.classList.remove('selected');
    });
  }

  /**
   * Update with data from API
   */
  update(data) {
    if (!data) return;

    // Update stats
    if (data.stats) {
      this.stats = data.stats;
      const statsEl = document.getElementById('chain-stats');
      if (statsEl) {
        Utils.clearElement(statsEl);
        statsEl.appendChild(this._createStatSpan('Blocks', this.stats.totalBlocks));
        statsEl.appendChild(this._createStatSpan('Judgments', this.stats.totalJudgments));
      }
    }

    // Update blocks (show recent)
    if (data.recentBlocks) {
      this.blocks = data.recentBlocks;
    } else if (data.head) {
      // Create blocks array from head info
      this.blocks = this._generateBlocksFromHead(data.head, 10);
    }

    // Re-render blocks
    const vizEl = document.getElementById('chain-viz');
    if (vizEl) {
      this._renderBlocks(vizEl);
    }
  }

  /**
   * Generate mock blocks from head
   */
  _generateBlocksFromHead(head, count) {
    const blocks = [];
    const headNum = head.blockNumber || 0;

    for (let i = Math.max(0, headNum - count + 1); i <= headNum; i++) {
      blocks.push({
        blockNumber: i,
        judgmentCount: i === headNum ? (head.judgmentCount || 0) : Math.floor(Math.random() * 5) + 1,
        timestamp: Date.now() - (headNum - i) * 60000,
        pending: i === headNum && head.pending,
        hash: i === headNum ? head.hash : null,
      });
    }

    // Add pending block
    if (!head.pending) {
      blocks.push({
        blockNumber: headNum + 1,
        judgmentCount: 0,
        timestamp: Date.now(),
        pending: true,
      });
    }

    return blocks;
  }

  /**
   * Add new block (from SSE)
   */
  addBlock(block) {
    // Remove pending placeholder
    this.blocks = this.blocks.filter(b => !b.pending);

    // Add new block
    this.blocks.push({
      ...block,
      pending: false,
    });

    // Add new pending
    this.blocks.push({
      blockNumber: block.blockNumber + 1,
      judgmentCount: 0,
      timestamp: Date.now(),
      pending: true,
    });

    // Keep only recent blocks
    if (this.blocks.length > 12) {
      this.blocks = this.blocks.slice(-12);
    }

    // Update stats
    this.stats.totalBlocks++;
    this.stats.totalJudgments += block.judgmentCount || 0;

    // Re-render
    const vizEl = document.getElementById('chain-viz');
    if (vizEl) {
      this._renderBlocks(vizEl);
    }

    const statsEl = document.getElementById('chain-stats');
    if (statsEl) {
      Utils.clearElement(statsEl);
      statsEl.appendChild(this._createStatSpan('Blocks', this.stats.totalBlocks));
      statsEl.appendChild(this._createStatSpan('Judgments', this.stats.totalJudgments));
    }
  }
}

// Export to window
window.CYNICChainViz = ChainViz;
