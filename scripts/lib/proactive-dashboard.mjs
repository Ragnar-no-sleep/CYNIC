#!/usr/bin/env node
/**
 * Proactive Dashboard - TriggerEngine State Display
 *
 * *"Le chien anticipe"* - Shows the state of CYNIC's proactive suggestion system
 *
 * @module scripts/lib/proactive-dashboard
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightCyan: '\x1b[96m',
};

const c = (color, text) => `${color}${text}${ANSI.reset}`;

// φ constants
const PHI_INV = 0.618033988749895;
const PHI_INV_SQ = 0.381966011250105;

// Trigger definitions (copy from trigger-engine.js for display)
const TRIGGER_TYPES = {
  ERROR_PATTERN: {
    name: 'ERROR_PATTERN',
    description: 'Same error type 3+ times → suggest fix',
    action: 'suggest_fix',
    urgency: 'ACTIVE',
    cooldown: 5 * 60 * 1000,
    threshold: 3,
  },
  CONTEXT_DRIFT: {
    name: 'CONTEXT_DRIFT',
    description: 'User strays from active goal → remind',
    action: 'remind_goal',
    urgency: 'SUBTLE',
    cooldown: 10 * 60 * 1000,
    threshold: 0.5,
  },
  BURNOUT_RISK: {
    name: 'BURNOUT_RISK',
    description: 'Energy < 38.2% (φ⁻²) → suggest break',
    action: 'suggest_break',
    urgency: 'ACTIVE',
    cooldown: 30 * 60 * 1000,
    threshold: PHI_INV_SQ,
  },
  PATTERN_MATCH: {
    name: 'PATTERN_MATCH',
    description: 'Similar past success found → suggest reuse',
    action: 'suggest_reuse',
    urgency: 'SUBTLE',
    cooldown: 2 * 60 * 1000,
    threshold: PHI_INV,
  },
  DEADLINE_NEAR: {
    name: 'DEADLINE_NEAR',
    description: 'Goal deadline approaching → prioritize',
    action: 'prioritize_goal',
    urgency: 'ACTIVE',
    cooldown: 15 * 60 * 1000,
    threshold: 24 * 60 * 60 * 1000,
  },
  LEARNING_OPP: {
    name: 'LEARNING_OPP',
    description: 'New pattern emerges → highlight for learning',
    action: 'highlight_pattern',
    urgency: 'SUBTLE',
    cooldown: 5 * 60 * 1000,
    threshold: 3,
  },
};

async function main() {
  console.log(c(ANSI.cyan, '═══════════════════════════════════════════════════════════'));
  console.log(c(ANSI.cyan, '💡 CYNIC TRIGGER ENGINE - Proactive Suggestions Dashboard'));
  console.log(c(ANSI.cyan, '═══════════════════════════════════════════════════════════'));
  console.log();

  // Try to import the trigger engine
  let engine = null;
  let engineState = null;

  try {
    // Windows-compatible path to file URL conversion
    const triggerPath = join(__dirname, '../hooks/lib/trigger-engine.js').replace(/\\/g, '/');
    const triggerUrl = triggerPath.startsWith('/') ? `file://${triggerPath}` : `file:///${triggerPath}`;
    const triggerModule = await import(triggerUrl);
    const getTriggerEngine = triggerModule.getTriggerEngine || triggerModule.default?.getTriggerEngine;

    if (getTriggerEngine) {
      engine = getTriggerEngine();
      engineState = engine.getState();
    }
  } catch (err) {
    console.log(c(ANSI.yellow, `*sniff* Could not import TriggerEngine: ${err.message}`));
    console.log(c(ANSI.dim, 'Showing static trigger definitions instead.'));
    console.log();
  }

  // Engine Status
  console.log(c(ANSI.bold, '── ENGINE STATUS ──────────────────────────────────────────'));
  if (engineState) {
    const statusColor = engineState.enabled ? ANSI.green : ANSI.red;
    console.log(`   Status: ${c(statusColor, engineState.enabled ? '✅ ENABLED' : '❌ DISABLED')}`);
    console.log(`   Voting Threshold: ${(engineState.votingThreshold * 100).toFixed(1)}% (φ⁻¹)`);
    console.log(`   Pending Suggestions: ${engineState.pendingSuggestions}`);
    console.log(`   Outcomes Recorded: ${engineState.outcomesRecorded}`);
  } else {
    console.log(`   Status: ${c(ANSI.yellow, '⚠️ Engine not running')}`);
    console.log(`   ${c(ANSI.dim, '(Engine runs in observe.js hook during Claude Code sessions)')}`);
  }
  console.log();

  // Context (if available)
  if (engineState?.context) {
    console.log(c(ANSI.bold, '── CURRENT CONTEXT ────────────────────────────────────────'));
    const ctx = engineState.context;

    const energyPct = Math.round((ctx.userEnergy || 1) * 100);
    const energyColor = energyPct < PHI_INV_SQ * 100 ? ANSI.red :
                       energyPct < PHI_INV * 100 ? ANSI.yellow : ANSI.green;
    console.log(`   User Energy: ${c(energyColor, `${energyPct}%`)} ${energyPct < PHI_INV_SQ * 100 ? '⚠️ BURNOUT RISK' : ''}`);

    const focusPct = Math.round((ctx.userFocus || 1) * 100);
    console.log(`   User Focus: ${c(ANSI.cyan, `${focusPct}%`)}`);

    if (ctx.activeGoal) {
      console.log(`   Active Goal: ${c(ANSI.magenta, ctx.activeGoal.title || 'Unknown')}`);
    }
    if (ctx.currentFocus) {
      console.log(`   Current Focus: ${c(ANSI.dim, ctx.currentFocus)}`);
    }
    console.log();
  }

  // Triggers
  console.log(c(ANSI.bold, '── TRIGGERS ───────────────────────────────────────────────'));
  console.log();

  const triggers = engineState?.triggers || Object.entries(TRIGGER_TYPES).map(([name, def]) => ({
    name,
    action: def.action,
    urgency: def.urgency,
    cooldownMs: def.cooldown,
    threshold: def.threshold,
  }));

  for (const trigger of triggers) {
    const urgencyColor = trigger.urgency === 'URGENT' ? ANSI.brightRed :
                        trigger.urgency === 'ACTIVE' ? ANSI.yellow :
                        ANSI.cyan;

    // Check cooldown status if available
    let cooldownStatus = '';
    if (engineState?.cooldowns?.[trigger.name]) {
      const cd = engineState.cooldowns[trigger.name];
      if (cd.canFire) {
        cooldownStatus = c(ANSI.green, ' [READY]');
      } else {
        const remainingMin = Math.ceil(cd.remainingMs / 60000);
        cooldownStatus = c(ANSI.yellow, ` [CD: ${remainingMin}m]`);
      }
    }

    console.log(`   ${c(urgencyColor, trigger.name)}${cooldownStatus}`);
    console.log(`   ${c(ANSI.dim, TRIGGER_TYPES[trigger.name]?.description || trigger.action)}`);
    // Format threshold based on trigger type
    let thresholdStr;
    if (trigger.name === 'DEADLINE_NEAR') {
      thresholdStr = `${Math.round(trigger.threshold / 3600000)}h`;
    } else if (trigger.threshold >= 1) {
      thresholdStr = trigger.threshold.toString();
    } else {
      thresholdStr = (trigger.threshold * 100).toFixed(1) + '%';
    }
    console.log(`   Cooldown: ${Math.round(trigger.cooldownMs / 60000)}m | Threshold: ${thresholdStr}`);
    console.log();
  }

  // Stats (if available)
  if (engine) {
    console.log(c(ANSI.bold, '── ACCEPTANCE RATES ───────────────────────────────────────'));
    const overallRate = engine.getAcceptanceRate();
    console.log(`   Overall: ${c(ANSI.cyan, (overallRate * 100).toFixed(1) + '%')}`);

    for (const triggerName of Object.keys(TRIGGER_TYPES)) {
      const rate = engine.getAcceptanceRate(triggerName);
      if (rate > 0) {
        console.log(`   ${triggerName}: ${(rate * 100).toFixed(1)}%`);
      }
    }
    console.log();
  }

  // Footer
  console.log(c(ANSI.dim, '───────────────────────────────────────────────────────────'));
  console.log(c(ANSI.dim, '*sniff* The dog that anticipates. φ guides the thresholds.'));
  console.log();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
