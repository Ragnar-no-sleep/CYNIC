/**
 * CYNIC TUI Dashboard - Resilience Screen
 *
 * Circuit breaker health and statistics
 * Phase 21: "φ protects against cascading failures"
 *
 * @module @cynic/node/cli/dashboard/screens/resilience
 */

'use strict';

import blessed from 'blessed';
import { COLORS, progressBar } from '../theme.js';

/**
 * Circuit breaker states with colors
 */
const CIRCUIT_STATES = {
  CLOSED: { label: 'CLOSED', color: 'green', icon: '●' },
  OPEN: { label: 'OPEN', color: 'red', icon: '○' },
  HALF_OPEN: { label: 'HALF', color: 'yellow', icon: '◐' },
};

/**
 * Known circuit breakers
 */
const CIRCUIT_NAMES = [
  { id: 'judgment', name: 'Judgment', description: 'Main judgment pipeline' },
  { id: 'learning', name: 'Learning', description: 'Learning system' },
  { id: 'triggers', name: 'Triggers', description: 'Trigger evaluation' },
  { id: 'search', name: 'Search', description: 'Vector search' },
  { id: 'mcp', name: 'MCP', description: 'MCP server' },
  { id: 'persistence', name: 'Persist', description: 'Database operations' },
];

/**
 * Create Resilience Screen
 */
export function createResilienceScreen(screen, dataFetcher, options = {}) {
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
    style: { bg: 'cyan', fg: 'black' },
    content: ' {bold}⚡ RESILIENCE - Circuit Breakers{/}',
    tags: true,
  });

  // Health summary
  const healthSummary = blessed.box({
    parent: container,
    label: ' System Health ',
    top: 1,
    left: 0,
    width: '100%',
    height: 5,
    border: { type: 'line' },
    style: {
      border: { fg: COLORS.success },
      label: { fg: COLORS.success, bold: true },
    },
    tags: true,
  });

  // Circuit list
  const circuitList = blessed.list({
    parent: container,
    label: ' Circuit Breakers ',
    top: 6,
    left: 0,
    width: '40%',
    height: '70%',
    border: { type: 'line' },
    style: {
      border: { fg: COLORS.primary },
      label: { fg: COLORS.primary, bold: true },
      selected: { bg: 'cyan', fg: 'black' },
    },
    tags: true,
    scrollable: true,
    keys: true,
    vi: true,
    mouse: true,
  });

  // Circuit detail
  const detailPanel = blessed.box({
    parent: container,
    label: ' Circuit Detail ',
    top: 6,
    left: '40%',
    width: '60%',
    height: '70%',
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
    content: ' {bold}[↑↓]{/} Navigate  {bold}[Enter]{/} Details  {bold}[T]{/}rip  {bold}[R]{/}eset  {bold}[B]{/}ack  {bold}[Q]{/}uit',
    tags: true,
  });

  // Cache circuit data
  let circuitData = {};
  let statsData = {};

  /**
   * Fetch circuit breaker status
   */
  async function fetchCircuits() {
    const result = await dataFetcher.callTool('brain_circuit_breaker', { action: 'status' });

    if (result.success) {
      circuitData = result.result.circuits || {};
      statsData = result.result.stats || {};
      updateHealthSummary();
      updateCircuitList();
    }
  }

  /**
   * Update health summary
   */
  function updateHealthSummary() {
    const circuits = Object.values(circuitData);
    const total = circuits.length;
    const closed = circuits.filter(c => c.state === 'CLOSED').length;
    const open = circuits.filter(c => c.state === 'OPEN').length;
    const halfOpen = circuits.filter(c => c.state === 'HALF_OPEN').length;

    const healthPct = total > 0 ? Math.round((closed / total) * 100) : 100;
    const healthColor = healthPct === 100 ? 'green' : healthPct >= 80 ? 'yellow' : 'red';

    const lines = [
      ` {bold}Overall Health:{/} {${healthColor}-fg}${healthPct}%{/}  ${progressBar(healthPct, 20)}`,
      ` {green-fg}●{/} Closed: ${closed}   {red-fg}○{/} Open: ${open}   {yellow-fg}◐{/} Half-Open: ${halfOpen}   Total: ${total}`,
      ` {bold}Total Failures:{/} ${statsData.totalFailures || 0}   {bold}Recovered:{/} ${statsData.recovered || 0}   {bold}Tripped:{/} ${statsData.tripped || 0}`,
    ];

    healthSummary.setContent(lines.join('\n'));
  }

  /**
   * Update circuit list
   */
  function updateCircuitList() {
    const items = CIRCUIT_NAMES.map(config => {
      const circuit = circuitData[config.id] || {};
      const state = CIRCUIT_STATES[circuit.state] || CIRCUIT_STATES.CLOSED;
      return `{${state.color}-fg}${state.icon}{/} ${config.name.padEnd(10)} ${state.label}`;
    });

    // Add any unknown circuits from data
    for (const [id, circuit] of Object.entries(circuitData)) {
      if (!CIRCUIT_NAMES.find(c => c.id === id)) {
        const state = CIRCUIT_STATES[circuit.state] || CIRCUIT_STATES.CLOSED;
        items.push(`{${state.color}-fg}${state.icon}{/} ${id.padEnd(10)} ${state.label}`);
      }
    }

    circuitList.setItems(items);
  }

  /**
   * Show circuit detail
   */
  function showDetail(index) {
    const circuitIds = [
      ...CIRCUIT_NAMES.map(c => c.id),
      ...Object.keys(circuitData).filter(id => !CIRCUIT_NAMES.find(c => c.id === id)),
    ];

    const id = circuitIds[index];
    const config = CIRCUIT_NAMES.find(c => c.id === id) || { id, name: id, description: 'Unknown circuit' };
    const circuit = circuitData[id] || {};
    const state = CIRCUIT_STATES[circuit.state] || CIRCUIT_STATES.CLOSED;

    const failureRate = circuit.failureCount && circuit.requestCount
      ? Math.round((circuit.failureCount / circuit.requestCount) * 100)
      : 0;

    const lines = [
      `{bold}⚡ ${config.name}{/}`,
      '',
      `{bold}State:{/} {${state.color}-fg}${state.label}{/}`,
      `{bold}Description:{/} ${config.description}`,
      '',
      '{bold}Statistics:{/}',
      `  Requests: ${circuit.requestCount || 0}`,
      `  Failures: ${circuit.failureCount || 0}`,
      `  Failure Rate: ${failureRate}% ${progressBar(failureRate, 15)}`,
      '',
      '{bold}Thresholds:{/}',
      `  Failure Threshold: ${circuit.failureThreshold || 5}`,
      `  Reset Timeout: ${circuit.resetTimeout || 30000}ms`,
      `  φ Threshold: 61.8%`,
      '',
      '{bold}Timing:{/}',
      `  Last Failure: ${circuit.lastFailure ? new Date(circuit.lastFailure).toLocaleTimeString() : 'Never'}`,
      `  Last Success: ${circuit.lastSuccess ? new Date(circuit.lastSuccess).toLocaleTimeString() : 'Never'}`,
      `  Open Since: ${circuit.openedAt ? new Date(circuit.openedAt).toLocaleTimeString() : 'N/A'}`,
    ];

    if (circuit.lastError) {
      lines.push('');
      lines.push('{bold}Last Error:{/}');
      lines.push(`  ${circuit.lastError.slice(0, 100)}`);
    }

    detailContent.setContent(lines.join('\n'));
    screen.render();
  }

  // Event handlers
  circuitList.on('select', (item, index) => {
    showDetail(index);
  });

  /**
   * Trip a circuit breaker (for testing)
   */
  async function tripCircuit(index) {
    const circuitIds = [
      ...CIRCUIT_NAMES.map(c => c.id),
      ...Object.keys(circuitData).filter(id => !CIRCUIT_NAMES.find(c => c.id === id)),
    ];
    const id = circuitIds[index];

    detailContent.setContent(`Tripping circuit: ${id}...`);
    screen.render();

    const result = await dataFetcher.callTool('brain_circuit_breaker', {
      action: 'trip',
      circuit: id,
    });

    if (result.success) {
      await fetchCircuits();
      showDetail(index);
    } else {
      detailContent.setContent(`Failed to trip: ${result.error}`);
    }
    screen.render();
  }

  /**
   * Reset a circuit breaker
   */
  async function resetCircuit(index) {
    const circuitIds = [
      ...CIRCUIT_NAMES.map(c => c.id),
      ...Object.keys(circuitData).filter(id => !CIRCUIT_NAMES.find(c => c.id === id)),
    ];
    const id = circuitIds[index];

    detailContent.setContent(`Resetting circuit: ${id}...`);
    screen.render();

    const result = await dataFetcher.callTool('brain_circuit_breaker', {
      action: 'reset',
      circuit: id,
    });

    if (result.success) {
      await fetchCircuits();
      showDetail(index);
    } else {
      detailContent.setContent(`Failed to reset: ${result.error}`);
    }
    screen.render();
  }

  /**
   * Update with data
   */
  function update(data) {
    if (data?.circuits) {
      circuitData = data.circuits;
      updateHealthSummary();
      updateCircuitList();
    }
  }

  /**
   * Show the screen
   */
  async function show() {
    container.show();
    circuitList.focus();
    await fetchCircuits();
    if (CIRCUIT_NAMES.length > 0) {
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
    return circuitList.selected || 0;
  }

  return {
    container,
    update,
    show,
    hide,
    tripCircuit,
    resetCircuit,
    getSelectedIndex,
  };
}

export default createResilienceScreen;
