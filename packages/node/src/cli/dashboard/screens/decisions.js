/**
 * CYNIC TUI Dashboard - Decisions Screen
 *
 * Decision timeline and tracing
 * Phase 21: "Every decision is traced, every trace tells a story"
 *
 * @module @cynic/node/cli/dashboard/screens/decisions
 */

'use strict';

import blessed from 'blessed';
import { COLORS, progressBar } from '../theme.js';

/**
 * Decision outcomes with colors
 */
const OUTCOMES = {
  allow: { label: 'ALLOW', color: 'green', icon: '✓' },
  block: { label: 'BLOCK', color: 'red', icon: '✗' },
  warn: { label: 'WARN', color: 'yellow', icon: '!' },
  skip: { label: 'SKIP', color: 'gray', icon: '○' },
};

/**
 * Decision types
 */
const DECISION_TYPES = {
  tool_use: { label: 'Tool Use', icon: '🔧' },
  tool_result: { label: 'Tool Result', icon: '📋' },
  session_start: { label: 'Session Start', icon: '🌅' },
  session_end: { label: 'Session End', icon: '🌙' },
  judgment: { label: 'Judgment', icon: '⚖️' },
  unknown: { label: 'Unknown', icon: '?' },
};

/**
 * Create Decisions Screen
 */
export function createDecisionsScreen(screen, dataFetcher, options = {}) {
  const container = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    tags: true,
    hidden: true,
  });

  // Header
  const header = blessed.box({
    parent: container,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    style: { bg: 'magenta', fg: 'white' },
    content: ' {bold}🎯 DECISIONS - Timeline & Tracing{/}',
    tags: true,
  });

  // Summary bar
  const summaryBar = blessed.box({
    parent: container,
    label: ' Summary ',
    top: 1,
    left: 0,
    width: '100%',
    height: 3,
    border: { type: 'line' },
    style: {
      border: { fg: COLORS.primary },
      label: { fg: COLORS.primary, bold: true },
    },
    tags: true,
  });

  // Decision list
  const decisionList = blessed.list({
    parent: container,
    label: ' Timeline ',
    top: 4,
    left: 0,
    width: '50%',
    height: '80%',
    border: { type: 'line' },
    style: {
      border: { fg: COLORS.success },
      label: { fg: COLORS.success, bold: true },
      selected: { bg: 'magenta', fg: 'white' },
    },
    tags: true,
    scrollable: true,
    keys: true,
    vi: true,
    mouse: true,
  });

  // Decision detail
  const detailPanel = blessed.box({
    parent: container,
    label: ' Decision Detail ',
    top: 4,
    left: '50%',
    width: '50%',
    height: '80%',
    border: { type: 'line' },
    style: {
      border: { fg: COLORS.warning },
      label: { fg: COLORS.warning, bold: true },
    },
    tags: true,
  });

  const detailContent = blessed.box({
    parent: detailPanel,
    top: 0,
    left: 1,
    right: 1,
    bottom: 0,
    tags: true,
    scrollable: true,
  });

  // Footer
  const footer = blessed.box({
    parent: container,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    style: { bg: 'black', fg: 'white' },
    content: ' {bold}[↑↓]{/} Navigate  {bold}[Enter]{/} Details  {bold}[T]{/}race  {bold}[F]{/}ilter  {bold}[B]{/}ack  {bold}[Q]{/}uit',
    tags: true,
  });

  // Cache decisions data
  let decisions = [];
  let summaryStats = { total: 0, allow: 0, block: 0, warn: 0, avgQScore: 0 };
  let currentFilter = 'all';

  /**
   * Fetch decisions
   */
  async function fetchDecisions() {
    const result = await dataFetcher.callTool('brain_decisions', {
      action: 'list',
      limit: 50,
      filter: currentFilter !== 'all' ? { outcome: currentFilter } : undefined,
    });

    if (result.success) {
      decisions = result.result.decisions || [];
      summaryStats = result.result.summary || summaryStats;
      updateSummary();
      updateDecisionList();
    }
  }

  /**
   * Update summary bar
   */
  function updateSummary() {
    const { total, allow, block, warn, avgQScore } = summaryStats;
    const qScoreColor = avgQScore >= 70 ? 'green' : avgQScore >= 50 ? 'yellow' : 'red';

    const line = ` Total: {bold}${total}{/}  |  ` +
      `{green-fg}✓{/} Allow: ${allow}  ` +
      `{red-fg}✗{/} Block: ${block}  ` +
      `{yellow-fg}!{/} Warn: ${warn}  |  ` +
      `Avg Q: {${qScoreColor}-fg}${avgQScore.toFixed(1)}{/}  ` +
      `Filter: {cyan-fg}${currentFilter}{/}`;

    summaryBar.setContent(line);
  }

  /**
   * Update decision list
   */
  function updateDecisionList() {
    const items = decisions.map(d => {
      const outcome = OUTCOMES[d.outcome] || OUTCOMES.skip;
      const type = DECISION_TYPES[d.type] || DECISION_TYPES.unknown;
      const time = new Date(d.timestamp).toLocaleTimeString();
      const qScore = d.qScore ? `Q:${Math.round(d.qScore)}` : '';

      return `{${outcome.color}-fg}${outcome.icon}{/} ${type.icon} ${time} ${d.preview?.slice(0, 25) || d.id?.slice(0, 8)} ${qScore}`;
    });

    if (items.length === 0) {
      items.push('{gray-fg}No decisions found{/}');
    }

    decisionList.setItems(items);
  }

  /**
   * Show decision detail
   */
  function showDetail(index) {
    if (index >= decisions.length) {
      detailContent.setContent('No decision selected');
      return;
    }

    const d = decisions[index];
    const outcome = OUTCOMES[d.outcome] || OUTCOMES.skip;
    const type = DECISION_TYPES[d.type] || DECISION_TYPES.unknown;

    const qScore = d.qScore || 0;
    const qScoreBar = progressBar(qScore, 20);
    const qScoreColor = qScore >= 70 ? 'green' : qScore >= 50 ? 'yellow' : 'red';

    const lines = [
      `{bold}${type.icon} ${type.label}{/}`,
      '',
      `{bold}ID:{/} ${d.id || 'N/A'}`,
      `{bold}Outcome:{/} {${outcome.color}-fg}${outcome.label}{/}`,
      `{bold}Timestamp:{/} ${new Date(d.timestamp).toLocaleString()}`,
      '',
      `{bold}Q-Score:{/} {${qScoreColor}-fg}${qScore.toFixed(1)}{/}`,
      `  ${qScoreBar}`,
      '',
      '{bold}Content:{/}',
      `  ${d.content?.slice(0, 200) || 'No content'}`,
    ];

    if (d.reasoning && d.reasoning.length > 0) {
      lines.push('');
      lines.push('{bold}Reasoning:{/}');
      for (const r of d.reasoning.slice(0, 5)) {
        lines.push(`  • ${r}`);
      }
    }

    if (d.metadata) {
      lines.push('');
      lines.push('{bold}Metadata:{/}');
      for (const [key, value] of Object.entries(d.metadata).slice(0, 5)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    if (d.traceId) {
      lines.push('');
      lines.push(`{bold}Trace ID:{/} ${d.traceId}`);
      lines.push('{cyan-fg}Press [T] to trace full chain{/}');
    }

    detailContent.setContent(lines.join('\n'));
    screen.render();
  }

  // Event handlers
  decisionList.on('select', (item, index) => {
    showDetail(index);
  });

  /**
   * Trace a decision
   */
  async function traceDecision(index) {
    if (index >= decisions.length) return;

    const d = decisions[index];
    if (!d.id && !d.traceId) {
      detailContent.setContent('No trace ID available');
      return;
    }

    detailContent.setContent(`Tracing decision: ${d.id || d.traceId}...`);
    screen.render();

    const result = await dataFetcher.callTool('brain_trace', {
      decisionId: d.id || d.traceId,
    });

    if (result.success) {
      const trace = result.result;
      const lines = [
        '{bold}🔍 Decision Trace{/}',
        '',
        `{bold}Decision ID:{/} ${trace.decisionId}`,
        `{bold}Integrity:{/} ${trace.verified ? '{green-fg}Verified{/}' : '{red-fg}Unverified{/}'}`,
        '',
        '{bold}Chain:{/}',
      ];

      const chain = trace.chain || [];
      for (const step of chain) {
        const stepIcon = step.type === 'judgment' ? '⚖️' : step.type === 'block' ? '🔗' : '📌';
        lines.push(`  ${stepIcon} ${step.type}: ${step.id?.slice(0, 12)}`);
        if (step.timestamp) {
          lines.push(`     ${new Date(step.timestamp).toLocaleString()}`);
        }
      }

      if (trace.blockNumber) {
        lines.push('');
        lines.push(`{bold}Block Number:{/} ${trace.blockNumber}`);
        lines.push(`{bold}Block Hash:{/} ${trace.blockHash?.slice(0, 16)}...`);
      }

      detailContent.setContent(lines.join('\n'));
    } else {
      detailContent.setContent(`Trace failed: ${result.error}`);
    }
    screen.render();
  }

  /**
   * Cycle filter
   */
  function cycleFilter() {
    const filters = ['all', 'allow', 'block', 'warn'];
    const idx = filters.indexOf(currentFilter);
    currentFilter = filters[(idx + 1) % filters.length];
    fetchDecisions();
  }

  /**
   * Update with data
   */
  function update(data) {
    if (data?.decisions) {
      decisions = data.decisions;
      updateSummary();
      updateDecisionList();
    }
  }

  /**
   * Show the screen
   */
  async function show() {
    container.show();
    decisionList.focus();
    await fetchDecisions();
    if (decisions.length > 0) {
      showDetail(0);
    }
    screen.render();
  }

  /**
   * Hide the screen
   */
  function hide() {
    container.hide();
  }

  /**
   * Get selected index
   */
  function getSelectedIndex() {
    return decisionList.selected || 0;
  }

  return {
    container,
    update,
    show,
    hide,
    traceDecision,
    cycleFilter,
    getSelectedIndex,
  };
}

export default createDecisionsScreen;
