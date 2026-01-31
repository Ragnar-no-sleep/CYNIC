#!/usr/bin/env node
/**
 * CYNIC Spawn Hook - SubagentStart/SubagentStop
 *
 * "Le chien coordonne le collectif" - CYNIC coordinates the pack
 *
 * This hook runs when Task tool spawns or stops subagents.
 * It enables collective coordination between dogs.
 *
 * @event SubagentStart, SubagentStop
 * @behavior non-blocking (tracks and coordinates)
 */

'use strict';

// ESM imports from the lib bridge
import cynic, {
  DC,
  detectUser,
  detectProject,
  loadUserProfile,
  saveCollectivePattern,
  orchestrateFull,
  sendHookToCollectiveSync,
  callBrainTool,
  getConsciousness,
} from '../lib/index.js';

// Phase 22: Session state
import { getSessionState } from './lib/index.js';

// Load optional modules
const consciousness = getConsciousness();

// =============================================================================
// CONSTANTS
// =============================================================================

/** Map subagent_type to Sefirot dog */
const SUBAGENT_TO_DOG = {
  // Official Claude Code agents
  'Explore': { dog: 'SCOUT', sefirah: 'Netzach', icon: '🔍' },
  'Plan': { dog: 'ARCHITECT', sefirah: 'Chesed', icon: '🏗️' },
  'Bash': { dog: 'CARTOGRAPHER', sefirah: 'Malkhut', icon: '🗺️' },
  'general-purpose': { dog: 'CYNIC', sefirah: 'Keter', icon: '🧠' },

  // CYNIC custom agents
  'cynic-guardian': { dog: 'GUARDIAN', sefirah: 'Gevurah', icon: '🛡️' },
  'cynic-architect': { dog: 'ARCHITECT', sefirah: 'Chesed', icon: '🏗️' },
  'cynic-analyst': { dog: 'ANALYST', sefirah: 'Binah', icon: '📊' },
  'cynic-scout': { dog: 'SCOUT', sefirah: 'Netzach', icon: '🔍' },
  'cynic-sage': { dog: 'SAGE', sefirah: 'Chochmah', icon: '🦉' },
  'cynic-scholar': { dog: 'SCHOLAR', sefirah: 'Daat', icon: '📚' },
  'cynic-oracle': { dog: 'ORACLE', sefirah: 'Tiferet', icon: '🔮' },
  'cynic-deployer': { dog: 'DEPLOYER', sefirah: 'Hod', icon: '🚀' },
  'cynic-janitor': { dog: 'JANITOR', sefirah: 'Yesod', icon: '🧹' },
  'cynic-cartographer': { dog: 'CARTOGRAPHER', sefirah: 'Malkhut', icon: '🗺️' },
  'cynic-reviewer': { dog: 'ANALYST', sefirah: 'Binah', icon: '📊' },
  'cynic-tester': { dog: 'GUARDIAN', sefirah: 'Gevurah', icon: '🛡️' },
  'cynic-simplifier': { dog: 'JANITOR', sefirah: 'Yesod', icon: '🧹' },
  'cynic-integrator': { dog: 'CARTOGRAPHER', sefirah: 'Malkhut', icon: '🗺️' },
  'cynic-doc': { dog: 'SCHOLAR', sefirah: 'Daat', icon: '📚' },
  'cynic-librarian': { dog: 'SCHOLAR', sefirah: 'Daat', icon: '📚' },
  'cynic-solana-expert': { dog: 'SAGE', sefirah: 'Chochmah', icon: '🦉' },
  'cynic-archivist': { dog: 'SCHOLAR', sefirah: 'Daat', icon: '📚' },
};

/** Active subagents tracking */
const activeSubagents = new Map();

// =============================================================================
// SAFE OUTPUT - Handle EPIPE errors gracefully
// =============================================================================

function safeOutput(data) {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    process.stdout.write(str + '\n');
  } catch (e) {
    if (e.code === 'EPIPE') process.exit(0);
  }
}

// =============================================================================
// SUBAGENT HANDLERS
// =============================================================================

/**
 * Handle SubagentStart event
 */
async function handleSubagentStart(hookContext, sessionState, user) {
  const agentId = hookContext.agent_id || hookContext.agentId || `agent_${Date.now()}`;
  const subagentType = hookContext.subagent_type || hookContext.subagentType || 'general-purpose';
  const prompt = hookContext.prompt || '';
  const model = hookContext.model || 'default';

  // Map to Sefirot dog
  const dogMapping = SUBAGENT_TO_DOG[subagentType] || { dog: 'CYNIC', sefirah: 'Keter', icon: '🧠' };

  // Track active subagent
  const agentInfo = {
    id: agentId,
    type: subagentType,
    dog: dogMapping.dog,
    sefirah: dogMapping.sefirah,
    icon: dogMapping.icon,
    model,
    startTime: Date.now(),
    promptLength: prompt.length,
  };
  activeSubagents.set(agentId, agentInfo);

  // Record pattern for collective learning
  const pattern = {
    type: 'subagent_spawn',
    signature: `spawn_${dogMapping.dog.toLowerCase()}`,
    description: `Spawned ${dogMapping.dog} (${subagentType})`,
    context: {
      dog: dogMapping.dog,
      sefirah: dogMapping.sefirah,
      model,
      promptLength: prompt.length,
    },
  };
  saveCollectivePattern(pattern);

  // Record in session state
  if (sessionState.isInitialized()) {
    sessionState.recordPattern(pattern);
  }

  // Record in consciousness
  if (consciousness) {
    try {
      consciousness.recordInsight({
        type: 'subagent_spawn',
        title: `${dogMapping.icon} ${dogMapping.dog} awakens`,
        message: `Subagent ${subagentType} spawned for: ${prompt.slice(0, 100)}...`,
        data: { agentId, type: subagentType, dog: dogMapping.dog },
        priority: 'low',
      });
    } catch (e) { /* ignore */ }
  }

  // Send to MCP server for collective tracking
  sendHookToCollectiveSync('SubagentStart', {
    agentId,
    subagentType,
    dog: dogMapping.dog,
    sefirah: dogMapping.sefirah,
    model,
    promptLength: prompt.length,
    userId: user.userId,
    timestamp: Date.now(),
  });

  // Notify brain of spawn
  callBrainTool('brain_patterns', {
    action: 'record',
    pattern: {
      type: 'subagent_spawn',
      dog: dogMapping.dog,
      subagentType,
      timestamp: Date.now(),
    },
  }).catch(() => { /* ignore */ });

  return {
    continue: true,
    agentInfo,
    message: `${dogMapping.icon} ${dogMapping.dog} (${dogMapping.sefirah}) dispatched`,
  };
}

/**
 * Handle SubagentStop event
 */
async function handleSubagentStop(hookContext, sessionState, user) {
  const agentId = hookContext.agent_id || hookContext.agentId;
  const success = hookContext.success !== false;
  const result = hookContext.result || {};
  const durationMs = hookContext.duration_ms || hookContext.durationMs || 0;

  // Get tracked agent info
  const agentInfo = activeSubagents.get(agentId) || {
    dog: 'UNKNOWN',
    sefirah: 'Unknown',
    icon: '🐕',
    type: 'unknown',
    startTime: Date.now() - durationMs,
  };

  // Calculate actual duration if we have start time
  const actualDuration = durationMs || (Date.now() - agentInfo.startTime);

  // Record pattern for collective learning
  const pattern = {
    type: 'subagent_complete',
    signature: `complete_${agentInfo.dog.toLowerCase()}_${success ? 'success' : 'fail'}`,
    description: `${agentInfo.dog} ${success ? 'completed' : 'failed'} (${actualDuration}ms)`,
    context: {
      dog: agentInfo.dog,
      sefirah: agentInfo.sefirah,
      success,
      durationMs: actualDuration,
    },
  };
  saveCollectivePattern(pattern);

  // Record in session state
  if (sessionState.isInitialized()) {
    sessionState.recordPattern(pattern);
  }

  // Record in consciousness
  if (consciousness) {
    try {
      consciousness.recordInsight({
        type: 'subagent_complete',
        title: `${agentInfo.icon} ${agentInfo.dog} ${success ? 'returns' : 'failed'}`,
        message: `Completed in ${Math.round(actualDuration / 1000)}s`,
        data: { agentId, dog: agentInfo.dog, success, durationMs: actualDuration },
        priority: success ? 'low' : 'medium',
      });
    } catch (e) { /* ignore */ }
  }

  // Send to MCP server for collective tracking
  sendHookToCollectiveSync('SubagentStop', {
    agentId,
    subagentType: agentInfo.type,
    dog: agentInfo.dog,
    sefirah: agentInfo.sefirah,
    success,
    durationMs: actualDuration,
    userId: user.userId,
    timestamp: Date.now(),
  });

  // Record trajectory for learning (success = positive feedback, failure = negative)
  if (success) {
    callBrainTool('brain_cynic_feedback', {
      decisionId: agentId,
      feedback: 'correct',
      context: `${agentInfo.dog} completed task successfully`,
    }).catch(() => { /* ignore */ });
  }

  // Remove from active tracking
  activeSubagents.delete(agentId);

  return {
    continue: true,
    agentInfo,
    message: success
      ? `${agentInfo.icon} ${agentInfo.dog} returns`
      : `${agentInfo.icon} ${agentInfo.dog} encountered issues`,
  };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

async function main() {
  const output = {
    type: 'Subagent',
    timestamp: new Date().toISOString(),
    continue: true,
    event: null,
    agentInfo: null,
    message: null,
  };

  try {
    // Read stdin
    const fs = await import('fs');
    let input = '';

    try {
      input = fs.readFileSync(0, 'utf8');
    } catch (syncErr) {
      input = await new Promise((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => { data += chunk; });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', () => resolve(''));
        process.stdin.resume();
        setTimeout(() => resolve(data), 3000);
      });
    }

    if (!input || input.trim().length === 0) {
      safeOutput(output);
      return;
    }

    const hookContext = JSON.parse(input);
    const eventType = hookContext.event_type || hookContext.eventType || '';
    output.event = eventType;

    // Get user and session state
    const user = detectUser();
    const sessionState = getSessionState();

    // Route to appropriate handler
    if (eventType === 'SubagentStart' || eventType === 'subagent_start') {
      const result = await handleSubagentStart(hookContext, sessionState, user);
      output.agentInfo = result.agentInfo;
      output.message = result.message;
    } else if (eventType === 'SubagentStop' || eventType === 'subagent_stop') {
      const result = await handleSubagentStop(hookContext, sessionState, user);
      output.agentInfo = result.agentInfo;
      output.message = result.message;
    } else {
      output.message = `Unknown subagent event: ${eventType}`;
    }

    safeOutput(output);

  } catch (error) {
    output.error = error.message;
    safeOutput(output);
  }
}

main();
