#!/usr/bin/env node
/**
 * @cynic/agent - CLI Entry Point
 *
 * "Lâche le chien!" - κυνικός
 *
 * @module @cynic/agent/cli
 */

'use strict';

import 'dotenv/config';
import { createAgent, AgentState } from './index.js';
import { createLogger } from '@cynic/core';

const log = createLogger('CLI');

// ═══════════════════════════════════════════════════════════════════════════════
// ASCII Art Banner
// ═══════════════════════════════════════════════════════════════════════════════

const BANNER = `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     ██████╗██╗   ██╗███╗   ██╗██╗ ██████╗      █████╗  ██████╗ ███████╗      ║
║    ██╔════╝╚██╗ ██╔╝████╗  ██║██║██╔════╝     ██╔══██╗██╔════╝ ██╔════╝      ║
║    ██║      ╚████╔╝ ██╔██╗ ██║██║██║          ███████║██║  ███╗█████╗        ║
║    ██║       ╚██╔╝  ██║╚██╗██║██║██║          ██╔══██║██║   ██║██╔══╝        ║
║    ╚██████╗   ██║   ██║ ╚████║██║╚██████╗     ██║  ██║╚██████╔╝███████╗      ║
║     ╚═════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝ ╚═════╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝      ║
║                                                                               ║
║                  Autonomous Solana AI Agent                                   ║
║              "Le chien qui pense, juge, et agit"                              ║
║                                                                               ║
║    PERCEIVE ──→ JUDGE ──→ DECIDE ──→ ACT ──→ LEARN                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`;

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(BANNER);

  // Parse args
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  const name = args.find(a => a.startsWith('--name='))?.split('=')[1] || 'cynic-agent-0';

  console.log('Configuration:');
  console.log(`  Name: ${name}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN (simulation)' : '🔥 LIVE (real transactions)'}`);
  console.log(`  RPC:  ${process.env.SOLANA_RPC_URL || 'default mainnet'}`);
  console.log('');

  // Create agent
  const agent = createAgent({
    name,
    executor: { dryRun },
  });

  // Wire events for logging
  agent.on('started', ({ name, timestamp }) => {
    log.info(`🐕 Agent "${name}" is AWAKE`);
  });

  agent.on('stopped', ({ name }) => {
    log.info(`😴 Agent "${name}" stopped`);
  });

  agent.on('perception', (signal) => {
    log.debug(`👀 Perception: ${signal.type} on ${signal.token || 'unknown'}`);
  });

  agent.on('opportunity', (opp) => {
    log.info(`🎯 Opportunity detected: ${opp.direction} ${opp.token} (conf: ${(opp.confidence * 100).toFixed(1)}%)`);
  });

  agent.on('judgment', (judgment) => {
    log.info(`⚖️  Judgment: Q=${judgment.qScore}, verdict=${judgment.verdict}, conf=${(judgment.confidence * 100).toFixed(1)}%`);
  });

  agent.on('decision', (decision) => {
    const emoji = decision.action === 'BUY' ? '📈' : decision.action === 'SELL' ? '📉' : '⏸️';
    log.info(`${emoji} Decision: ${decision.action} ${decision.token || ''} (size: ${(decision.size * 100).toFixed(1)}%)`);
  });

  agent.on('action_complete', (result) => {
    if (result.success) {
      log.info(`✅ Action complete: ${result.signature || 'simulated'}`);
    } else {
      log.warn(`❌ Action failed: ${result.error}`);
    }
  });

  agent.on('lesson', (lesson) => {
    log.info(`📚 Lesson: ${lesson.recommendation}`);
  });

  agent.on('error', (err) => {
    log.error(`🔴 Error: ${err.message}`);
  });

  // Status update every 30s
  const statusInterval = setInterval(() => {
    const status = agent.getStatus();
    const health = agent.getHealth();

    console.log('');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`📊 Status: ${status.state} | Health: ${health.status} (${(health.score * 100).toFixed(1)}%)`);
    console.log(`   Ticks: ${status.metrics.tickCount} | Actions: ${status.metrics.actions} | Success: ${status.metrics.successfulActions}/${status.metrics.actions}`);
    console.log(`   PnL: ${(status.metrics.totalPnL * 100).toFixed(2)}% | Actions/hr: ${status.metrics.actionsThisHour}/${status.config.maxActionsPerHour}`);
    console.log('─────────────────────────────────────────────────────────');
    console.log('');
  }, 30000);

  // Graceful shutdown
  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('');
    log.info(`${signal} received, shutting down gracefully...`);

    clearInterval(statusInterval);
    await agent.stop();

    // Print final stats
    const status = agent.getStatus();
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                     FINAL STATISTICS                       ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total ticks:         ${status.metrics.tickCount}`);
    console.log(`  Perceptions:         ${status.metrics.perceptions}`);
    console.log(`  Judgments:           ${status.metrics.judgments}`);
    console.log(`  Decisions:           ${status.metrics.decisions}`);
    console.log(`  Actions executed:    ${status.metrics.actions}`);
    console.log(`  Successful:          ${status.metrics.successfulActions}`);
    console.log(`  Failed:              ${status.metrics.failedActions}`);
    console.log(`  Win rate:            ${status.metrics.actions > 0 ? ((status.metrics.successfulActions / status.metrics.actions) * 100).toFixed(1) : 0}%`);
    console.log(`  Total P&L:           ${(status.metrics.totalPnL * 100).toFixed(2)}%`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('*tail wag* À bientôt. - CYNIC');
    console.log('');

    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Start agent
  log.info('Starting CYNIC Agent...');
  await agent.start();

  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
}

// Run
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
