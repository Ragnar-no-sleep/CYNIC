/**
 * CYNIC Dashboard - Self-Modification Tracker Component
 * Phase 2.4.2 - Track code changes, improvement patterns, evolution metrics
 *
 * "φ distrusts φ" - κυνικός
 */

import { Utils } from '../lib/utils.js';

// PHI for proportions
const PHI = 1.618033988749895;

// Change types and colors
const CHANGE_TYPES = {
  feat: { color: '#00ff88', icon: '✨', label: 'Feature' },
  fix: { color: '#ff6b6b', icon: '🐛', label: 'Fix' },
  refactor: { color: '#667eea', icon: '♻️', label: 'Refactor' },
  docs: { color: '#4ecdc4', icon: '📝', label: 'Docs' },
  test: { color: '#ffd93d', icon: '🧪', label: 'Test' },
  style: { color: '#f093fb', icon: '💅', label: 'Style' },
  chore: { color: '#888888', icon: '🔧', label: 'Chore' },
};

// File type colors
const FILE_TYPES = {
  js: '#ffd93d',
  ts: '#3178c6',
  css: '#264de4',
  json: '#888888',
  md: '#4ecdc4',
  py: '#3776ab',
  other: '#666666',
};

export class SelfModTracker {
  constructor(options = {}) {
    this.api = options.api || null;
    this.onCommitSelect = options.onCommitSelect || (() => {});
    this.container = null;
    this.commits = [];
    this.evolutionMetrics = {
      totalCommits: 0,
      filesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      avgChangesPerDay: 0,
    };
    this.patterns = [];
    this.loading = false;
  }

  /**
   * Render self-modification tracker
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('self-mod-tracker');

    // Header
    const header = Utils.createElement('div', { className: 'selfmod-header' }, [
      Utils.createElement('div', { className: 'selfmod-title' }, [
        Utils.createElement('span', { className: 'title-icon' }, ['🔄']),
        'Self-Modification Tracker',
      ]),
      Utils.createElement('button', {
        className: 'selfmod-refresh-btn',
        onClick: () => this.refresh(),
      }, ['↻']),
    ]);

    // Evolution metrics
    const metricsSection = Utils.createElement('div', {
      className: 'selfmod-metrics',
      id: 'selfmod-metrics',
    });

    // Change pattern chart
    const patternSection = Utils.createElement('div', {
      className: 'selfmod-patterns',
      id: 'selfmod-patterns',
    });

    // Recent commits
    const commitsSection = Utils.createElement('div', {
      className: 'selfmod-commits',
      id: 'selfmod-commits',
    });

    // File heatmap
    const heatmapSection = Utils.createElement('div', {
      className: 'selfmod-heatmap',
      id: 'selfmod-heatmap',
    });

    container.appendChild(header);
    container.appendChild(metricsSection);
    container.appendChild(patternSection);
    container.appendChild(commitsSection);
    container.appendChild(heatmapSection);

    // Initial load
    this.refresh();
  }

  /**
   * Refresh data
   */
  async refresh() {
    this.loading = true;
    this._renderLoading();

    try {
      // Get git log data via shell command (simulated via API)
      // In real implementation, this would fetch from git or a tracking API
      await this._fetchGitData();
      await this._analyzePatterns();
    } catch (err) {
      console.error('Failed to fetch self-modification data:', err);
    }

    this.loading = false;
    this._renderMetrics();
    this._renderPatterns();
    this._renderCommits();
    this._renderHeatmap();
  }

  /**
   * Fetch git data from API or generate sample
   */
  async _fetchGitData() {
    // Track data source for UI indicators
    this.dataSource = 'demo';

    // Try to fetch from real API first
    if (this.api) {
      try {
        // Get commits
        const commitsResult = await this.api.selfMod('commits', { limit: 20 });
        if (commitsResult.success && commitsResult.result?.commits?.length > 0) {
          this.commits = commitsResult.result.commits.map(c => ({
            hash: c.hash,
            type: c.type || 'other',
            message: c.message,
            timestamp: c.timestamp,
            files: c.files || [],
            filesChanged: c.filesChanged || 0,
            additions: c.additions || 0,
            deletions: c.deletions || 0,
            author: c.author || 'CYNIC',
          }));

          // Get stats
          const statsResult = await this.api.selfMod('stats', { days: 30 });
          if (statsResult.success && statsResult.result) {
            const stats = statsResult.result;
            this.evolutionMetrics = {
              totalCommits: stats.totalCommits || this.commits.length,
              filesChanged: stats.filesChanged || new Set(this.commits.flatMap(c => c.files)).size,
              linesAdded: stats.linesAdded || this.commits.reduce((sum, c) => sum + c.additions, 0),
              linesRemoved: stats.linesRemoved || this.commits.reduce((sum, c) => sum + c.deletions, 0),
              avgChangesPerDay: stats.totalCommits / (stats.days || 30),
            };
          } else {
            // Calculate from commits
            this.evolutionMetrics = {
              totalCommits: this.commits.length,
              filesChanged: new Set(this.commits.flatMap(c => c.files)).size,
              linesAdded: this.commits.reduce((sum, c) => sum + c.additions, 0),
              linesRemoved: this.commits.reduce((sum, c) => sum + c.deletions, 0),
              avgChangesPerDay: this.commits.length / 7,
            };
          }

          this.dataSource = 'live';
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch git data from API:', err.message);
      }
    }

    // Fall back to sample commit data
    const sampleCommits = [
      {
        hash: 'abc1234',
        type: 'feat',
        message: 'Add Event Timeline with replay and decision analysis',
        timestamp: Date.now() - 3600000,
        files: ['event-timeline.js', 'live.js', 'live.css'],
        additions: 650,
        deletions: 10,
        author: 'CYNIC + Claude',
      },
      {
        hash: 'def5678',
        type: 'feat',
        message: 'Add PoJ Chain visualization and Pattern Gallery',
        timestamp: Date.now() - 7200000,
        files: ['chain-viz.js', 'pattern-gallery.js', 'operator.js'],
        additions: 1200,
        deletions: 50,
        author: 'CYNIC + Claude',
      },
      {
        hash: 'ghi9012',
        type: 'feat',
        message: 'Add Sefirot live event flow and metrics',
        timestamp: Date.now() - 86400000,
        files: ['collective.js', 'sefirot-tree.js'],
        additions: 800,
        deletions: 20,
        author: 'CYNIC + Claude',
      },
      {
        hash: 'jkl3456',
        type: 'fix',
        message: 'Fix consensus block verification',
        timestamp: Date.now() - 172800000,
        files: ['consensus.ts', 'block-store.ts'],
        additions: 45,
        deletions: 30,
        author: 'CYNIC + Claude',
      },
      {
        hash: 'mno7890',
        type: 'test',
        message: 'Add comprehensive LSP service tests',
        timestamp: Date.now() - 259200000,
        files: ['lsp.test.ts'],
        additions: 500,
        deletions: 0,
        author: 'CYNIC + Claude',
      },
    ];

    this.commits = sampleCommits;

    // Calculate metrics
    this.evolutionMetrics = {
      totalCommits: sampleCommits.length,
      filesChanged: new Set(sampleCommits.flatMap(c => c.files)).size,
      linesAdded: sampleCommits.reduce((sum, c) => sum + c.additions, 0),
      linesRemoved: sampleCommits.reduce((sum, c) => sum + c.deletions, 0),
      avgChangesPerDay: sampleCommits.length / 7,
    };
  }

  /**
   * Analyze improvement patterns
   */
  async _analyzePatterns() {
    // Count by type
    const typeCounts = {};
    this.commits.forEach(c => {
      typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
    });

    // Calculate evolution trend
    const sortedCommits = [...this.commits].sort((a, b) => a.timestamp - b.timestamp);
    const additionsTrend = sortedCommits.map(c => c.additions);

    this.patterns = [
      {
        name: 'Feature Focus',
        value: ((typeCounts.feat || 0) / this.commits.length * 100).toFixed(0),
        trend: 'up',
        color: CHANGE_TYPES.feat.color,
      },
      {
        name: 'Code Quality',
        value: ((typeCounts.refactor || 0 + typeCounts.fix || 0) / this.commits.length * 100).toFixed(0),
        trend: 'stable',
        color: CHANGE_TYPES.refactor.color,
      },
      {
        name: 'Test Coverage',
        value: ((typeCounts.test || 0) / this.commits.length * 100).toFixed(0),
        trend: 'up',
        color: CHANGE_TYPES.test.color,
      },
      {
        name: 'Growth Rate',
        value: `+${this.evolutionMetrics.linesAdded - this.evolutionMetrics.linesRemoved}`,
        trend: 'up',
        color: '#00ff88',
      },
    ];
  }

  /**
   * Render loading state
   */
  _renderLoading() {
    const commits = document.getElementById('selfmod-commits');
    if (commits) {
      Utils.clearElement(commits);
      commits.appendChild(
        Utils.createElement('div', { className: 'selfmod-loading' }, [
          Utils.createElement('span', { className: 'loading-spinner' }),
          'Analyzing self-modifications...',
        ])
      );
    }
  }

  /**
   * Render evolution metrics
   */
  _renderMetrics() {
    const section = document.getElementById('selfmod-metrics');
    if (!section) return;

    Utils.clearElement(section);

    const metrics = [
      { label: 'Commits', value: this.evolutionMetrics.totalCommits, icon: '📦', color: '#4ecdc4' },
      { label: 'Files', value: this.evolutionMetrics.filesChanged, icon: '📄', color: '#667eea' },
      { label: 'Added', value: `+${this.evolutionMetrics.linesAdded}`, icon: '➕', color: '#00ff88' },
      { label: 'Removed', value: `-${this.evolutionMetrics.linesRemoved}`, icon: '➖', color: '#ff6b6b' },
      { label: 'Velocity', value: `${this.evolutionMetrics.avgChangesPerDay.toFixed(1)}/day`, icon: '⚡', color: '#ffd93d' },
    ];

    metrics.forEach(m => {
      section.appendChild(
        Utils.createElement('div', { className: 'metric-card' }, [
          Utils.createElement('span', { className: 'metric-icon' }, [m.icon]),
          Utils.createElement('div', { className: 'metric-content' }, [
            Utils.createElement('span', { className: 'metric-value', style: `color: ${m.color}` }, [String(m.value)]),
            Utils.createElement('span', { className: 'metric-label' }, [m.label]),
          ]),
        ])
      );
    });
  }

  /**
   * Render improvement patterns
   */
  _renderPatterns() {
    const section = document.getElementById('selfmod-patterns');
    if (!section) return;

    Utils.clearElement(section);

    section.appendChild(
      Utils.createElement('div', { className: 'patterns-header' }, ['Improvement Patterns'])
    );

    const grid = Utils.createElement('div', { className: 'patterns-grid' });

    this.patterns.forEach(p => {
      const trendIcon = p.trend === 'up' ? '📈' : p.trend === 'down' ? '📉' : '➡️';

      grid.appendChild(
        Utils.createElement('div', {
          className: 'pattern-item',
          style: `--pattern-color: ${p.color}`,
        }, [
          Utils.createElement('div', { className: 'pattern-name' }, [p.name]),
          Utils.createElement('div', { className: 'pattern-value' }, [
            Utils.createElement('span', { className: 'value-text' }, [String(p.value) + (typeof p.value === 'number' ? '%' : '')]),
            Utils.createElement('span', { className: 'trend-icon' }, [trendIcon]),
          ]),
        ])
      );
    });

    section.appendChild(grid);
  }

  /**
   * Render recent commits
   */
  _renderCommits() {
    const section = document.getElementById('selfmod-commits');
    if (!section) return;

    Utils.clearElement(section);

    // Header with data source badge
    section.appendChild(
      Utils.createElement('div', { className: 'commits-header' }, [
        'Recent Self-Modifications',
        Utils.createElement('span', {
          className: `data-source-badge ${this.dataSource || 'demo'}`,
          title: this.dataSource === 'live' ? 'Real git data' : 'Simulated demo data',
        }, [this.dataSource === 'live' ? 'LIVE' : 'DEMO']),
      ])
    );

    if (this.commits.length === 0) {
      section.appendChild(
        Utils.createElement('div', { className: 'commits-empty' }, [
          'No self-modifications tracked yet',
        ])
      );
      return;
    }

    const list = Utils.createElement('div', { className: 'commits-list' });

    this.commits.forEach(commit => {
      const typeInfo = CHANGE_TYPES[commit.type] || CHANGE_TYPES.chore;

      list.appendChild(
        Utils.createElement('div', {
          className: 'commit-item',
          onClick: () => this.onCommitSelect(commit),
        }, [
          // Type badge
          Utils.createElement('div', {
            className: 'commit-type',
            style: `background: ${typeInfo.color}20; color: ${typeInfo.color}`,
          }, [typeInfo.icon, ` ${typeInfo.label}`]),

          // Message
          Utils.createElement('div', { className: 'commit-message' }, [commit.message]),

          // Stats
          Utils.createElement('div', { className: 'commit-stats' }, [
            Utils.createElement('span', { className: 'commit-files' }, [`📄 ${commit.files.length}`]),
            Utils.createElement('span', { className: 'commit-additions' }, [`+${commit.additions}`]),
            Utils.createElement('span', { className: 'commit-deletions' }, [`-${commit.deletions}`]),
          ]),

          // Time
          Utils.createElement('div', { className: 'commit-time' }, [
            Utils.formatTime(commit.timestamp, 'relative'),
          ]),
        ])
      );
    });

    section.appendChild(list);
  }

  /**
   * Render file heatmap
   */
  _renderHeatmap() {
    const section = document.getElementById('selfmod-heatmap');
    if (!section) return;

    Utils.clearElement(section);

    section.appendChild(
      Utils.createElement('div', { className: 'heatmap-header' }, ['Change Heatmap'])
    );

    // Count changes per file
    const fileCounts = {};
    this.commits.forEach(c => {
      c.files.forEach(f => {
        fileCounts[f] = (fileCounts[f] || 0) + 1;
      });
    });

    // Sort by frequency
    const sortedFiles = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sortedFiles.length === 0) {
      section.appendChild(
        Utils.createElement('div', { className: 'heatmap-empty' }, ['No file changes tracked'])
      );
      return;
    }

    const maxCount = Math.max(...sortedFiles.map(([, count]) => count));

    const heatmap = Utils.createElement('div', { className: 'heatmap-grid' });

    sortedFiles.forEach(([file, count]) => {
      const ext = file.split('.').pop() || 'other';
      const color = FILE_TYPES[ext] || FILE_TYPES.other;
      const intensity = count / maxCount;

      heatmap.appendChild(
        Utils.createElement('div', {
          className: 'heatmap-cell',
          style: `--cell-color: ${color}; --cell-intensity: ${intensity}`,
          title: `${file}: ${count} changes`,
        }, [
          Utils.createElement('span', { className: 'cell-name' }, [file.split('/').pop()]),
          Utils.createElement('span', { className: 'cell-count' }, [String(count)]),
        ])
      );
    });

    section.appendChild(heatmap);
  }

  /**
   * Add commit (from external source)
   */
  addCommit(commit) {
    this.commits.unshift(commit);
    this.evolutionMetrics.totalCommits++;
    this.evolutionMetrics.linesAdded += commit.additions || 0;
    this.evolutionMetrics.linesRemoved += commit.deletions || 0;

    this._renderMetrics();
    this._renderCommits();
    this._renderHeatmap();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.container = null;
    this.commits = [];
  }
}

// Export to window
window.CYNICSelfModTracker = SelfModTracker;
