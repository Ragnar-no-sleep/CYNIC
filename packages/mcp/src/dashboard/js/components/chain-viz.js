/**
 * CYNIC Dashboard - Chain Visualization Component
 * PoJ blockchain display
 */

import { Utils } from '../lib/utils.js';

export class ChainViz {
  constructor(options = {}) {
    this.onBlockClick = options.onBlockClick || (() => {});
    this.container = null;
    this.blocks = [];
    this.selectedBlock = null;
    this.stats = { totalBlocks: 0, totalJudgments: 0 };
  }

  /**
   * Render chain visualization
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);

    // Header
    const header = Utils.createElement('div', { className: 'chain-header' }, [
      Utils.createElement('div', { className: 'chain-title' }, ['PoJ Chain']),
      Utils.createElement('div', { className: 'chain-stats', id: 'chain-stats' }, [
        this._createStatSpan('Blocks', this.stats.totalBlocks),
        this._createStatSpan('Judgments', this.stats.totalJudgments),
      ]),
    ]);

    // Chain visualization
    const chainViz = Utils.createElement('div', { className: 'chain-viz', id: 'chain-viz' });
    this._renderBlocks(chainViz);

    // Block detail panel
    const blockDetail = Utils.createElement('div', { className: 'block-detail', id: 'block-detail' });

    container.appendChild(header);
    container.appendChild(chainViz);
    container.appendChild(blockDetail);
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

    this.blocks.forEach((block, i) => {
      // Block element
      const blockEl = Utils.createElement('div', {
        className: `chain-block ${block.pending ? 'pending' : ''} ${this.selectedBlock === block.blockNumber ? 'selected' : ''}`,
        dataset: { blockNumber: block.blockNumber },
        onClick: () => this._selectBlock(block),
      }, [
        Utils.createElement('span', { className: 'number' }, [`B#${block.blockNumber}`]),
        Utils.createElement('span', { className: 'count' }, [`${block.judgmentCount || 0} jdg`]),
      ]);

      container.appendChild(blockEl);

      // Connector (except last)
      if (i < this.blocks.length - 1) {
        const connector = Utils.createElement('span', { className: 'chain-connector' }, ['──']);
        container.appendChild(connector);
      }
    });
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
