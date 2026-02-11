/**
 * CYNIC Daemon Hook Handlers
 *
 * Pure functions that handle hook events using in-memory singletons.
 * No imports, no file I/O for state, no MCP calls — all state is in RAM.
 *
 * "Le chien pense vite quand il vit déjà" - CYNIC
 *
 * @module @cynic/node/daemon/hook-handlers
 */

'use strict';

import { createLogger, PHI_INV, globalEventBus, EventType } from '@cynic/core';
import { classifyPrompt } from '@cynic/core';
import { contextCompressor } from '../services/context-compressor.js';
import { injectionProfile } from '../services/injection-profile.js';

const log = createLogger('DaemonHandlers');

// ═══════════════════════════════════════════════════════════════════════════════
// DANGER PATTERNS (extracted from guard.js)
// ═══════════════════════════════════════════════════════════════════════════════

const BASH_DANGER_PATTERNS = [
  { pattern: /rm\s+-rf\s+[/~]/, severity: 'critical', message: 'Recursive deletion from root or home directory', action: 'block' },
  { pattern: /rm\s+-rf\s+\*/, severity: 'critical', message: 'Wildcard recursive deletion', action: 'block' },
  { pattern: /rm\s+-rf\s+\.$/, severity: 'critical', message: 'Recursive deletion of current directory', action: 'block' },
  { pattern: /:\(\)\{\s*:\|:&\s*\};:/, severity: 'critical', message: 'Fork bomb detected', action: 'block' },
  { pattern: />\s*\/dev\/sd[a-z]/, severity: 'critical', message: 'Direct disk write', action: 'block' },
  { pattern: /mkfs\./, severity: 'critical', message: 'Filesystem format command', action: 'block' },
  { pattern: /dd\s+.*of=\/dev\/sd/, severity: 'critical', message: 'Direct disk write with dd', action: 'block' },
  { pattern: /git\s+push.*--force/, severity: 'high', message: 'Force push will rewrite remote history', action: 'warn' },
  { pattern: /git\s+push.*-f\s/, severity: 'high', message: 'Force push will rewrite remote history', action: 'warn' },
  { pattern: /git\s+reset\s+--hard/, severity: 'high', message: 'Hard reset will discard uncommitted changes', action: 'warn' },
  { pattern: /npm\s+publish/, severity: 'medium', message: 'Publishing to npm registry', action: 'warn' },
  { pattern: /DROP\s+(TABLE|DATABASE)/i, severity: 'critical', message: 'Database DROP command', action: 'block' },
  { pattern: /TRUNCATE/i, severity: 'high', message: 'TRUNCATE removes all data', action: 'warn' },
];

const WRITE_SENSITIVE_PATTERNS = [
  { pattern: /\.env/, message: 'Environment file with potential secrets' },
  { pattern: /credentials/, message: 'Credentials file' },
  { pattern: /\.pem$|\.key$/, message: 'Key/certificate file' },
  { pattern: /secret/i, message: 'File with "secret" in path' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT ROUTER — dispatches hook events to handlers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Route a hook event to the appropriate handler
 *
 * @param {string} event - Hook event name (UserPromptSubmit, PreToolUse, etc.)
 * @param {Object} hookInput - Parsed JSON from hook stdin
 * @returns {Promise<Object>} Hook output JSON
 */
export async function handleHookEvent(event, hookInput) {
  const startTime = Date.now();

  try {
    let result;

    switch (event) {
      case 'UserPromptSubmit':
        result = await handlePerceive(hookInput);
        break;
      case 'PreToolUse':
        result = await handleGuard(hookInput);
        break;
      case 'PostToolUse':
        result = await handleObserve(hookInput);
        break;
      case 'SessionStart':
        result = await handleAwaken(hookInput);
        break;
      case 'SessionEnd':
        result = await handleSleep(hookInput);
        break;
      case 'Stop':
        result = await handleStop(hookInput);
        break;
      default:
        result = { continue: true };
        break;
    }

    const duration = Date.now() - startTime;
    log.debug(`Hook ${event} handled`, { duration });

    return result;
  } catch (err) {
    log.error(`Hook ${event} failed`, { error: err.message });
    return { continue: true, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERCEIVE — UserPromptSubmit
// Classifies prompt, injects context, detects dangers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle UserPromptSubmit — classify and inject context
 *
 * @param {Object} hookInput - { prompt, ... }
 * @returns {Promise<Object>} { continue: true, message?: string }
 */
async function handlePerceive(hookInput) {
  const prompt = hookInput?.prompt || '';
  if (!prompt.trim()) return { continue: true };

  const sections = [];

  // 1. Classify prompt
  let classification;
  try {
    classification = classifyPrompt(prompt, {
      sessionHistory: [],
      hasActivePlan: false,
    });
  } catch {
    classification = { intent: 'build', domain: 'general', complexity: 'medium' };
  }

  // 2. Danger detection
  const dangerWarning = detectDanger(prompt);
  if (dangerWarning) {
    sections.push(dangerWarning);
  }

  // 3. Context compression — inject less as CYNIC learns
  let compressionActive = false;
  try {
    contextCompressor.start();
    compressionActive = true;
  } catch { /* non-blocking */ }

  // 4. Injection profile — learned activation rates
  try {
    injectionProfile.start();
  } catch { /* non-blocking */ }

  // 5. Emit perception event for learning loops
  try {
    globalEventBus.emit(EventType.USER_FEEDBACK, {
      type: 'prompt_perceived',
      prompt: prompt.substring(0, 200),
      classification,
      timestamp: Date.now(),
    });
  } catch { /* non-blocking */ }

  // 6. Build system-reminder message
  if (sections.length > 0) {
    return {
      continue: true,
      message: sections.join('\n\n'),
    };
  }

  return { continue: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARD — PreToolUse
// Blocks dangerous operations, warns on risky ones
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle PreToolUse — guard against danger
 *
 * @param {Object} hookInput - { tool_name, tool_input, ... }
 * @returns {Promise<Object>} { continue, blocked?, blockReason?, issues[] }
 */
async function handleGuard(hookInput) {
  const toolName = hookInput?.tool_name || '';
  const toolInput = hookInput?.tool_input || {};
  const output = {
    continue: true,
    blocked: false,
    blockReason: null,
    issues: [],
  };

  // Check Bash commands for danger patterns
  if (toolName === 'Bash' && toolInput.command) {
    const command = toolInput.command;

    for (const { pattern, severity, message, action } of BASH_DANGER_PATTERNS) {
      if (pattern.test(command)) {
        output.issues.push({ severity, message, action });

        if (action === 'block') {
          output.blocked = true;
          output.continue = false;
          output.blockReason = `*GROWL* BLOCKED: ${message}`;
          output.decision = 'block';
          output.reason = message;
          log.warn('Dangerous command blocked', { command: command.substring(0, 100), message });
          return output;
        }
      }
    }
  }

  // Check Write/Edit for sensitive paths
  if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
    for (const { pattern, message } of WRITE_SENSITIVE_PATTERNS) {
      if (pattern.test(toolInput.file_path)) {
        output.issues.push({ severity: 'medium', message, action: 'warn' });
      }
    }
  }

  return output;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVE — PostToolUse
// Silently learns from tool outcomes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle PostToolUse — observe and learn
 *
 * @param {Object} hookInput - { tool_name, tool_input, tool_output, ... }
 * @returns {Promise<Object>} { continue: true }
 */
async function handleObserve(hookInput) {
  const toolName = hookInput?.tool_name || '';
  const toolInput = hookInput?.tool_input || {};

  // Emit tool observation for learning loops
  try {
    globalEventBus.emit(EventType.TOOL_CALLED || 'tool:called', {
      tool: toolName,
      input: typeof toolInput === 'object' ? toolInput : {},
      timestamp: Date.now(),
    });
  } catch { /* non-blocking */ }

  return { continue: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AWAKEN — SessionStart
// Boots daemon-side services, prepares injection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle SessionStart — wake up
 *
 * @param {Object} hookInput - Session context
 * @returns {Promise<Object>} { continue: true, message?: string }
 */
async function handleAwaken(hookInput) {
  log.info('Session starting — daemon already warm');

  // Context compression: start tracking this session
  try { contextCompressor.start(); } catch { /* non-blocking */ }
  try { injectionProfile.start(); } catch { /* non-blocking */ }

  return {
    continue: true,
    message: '*sniff* CYNIC daemon is awake. Singletons warm. Ready.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLEEP — SessionEnd
// Persists session state, flushes buffers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle SessionEnd — go to sleep (but daemon stays running)
 *
 * @param {Object} hookInput - Session end context
 * @returns {Promise<Object>} { continue: true }
 */
async function handleSleep(hookInput) {
  log.info('Session ending — daemon stays warm');

  // Record session quality for context compression outcome verification
  try {
    contextCompressor.recordSessionEnd();
  } catch { /* non-blocking */ }

  return { continue: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOP — Stop event
// Handles digest/ralph-loop equivalent
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle Stop event
 *
 * @param {Object} hookInput - Stop context
 * @returns {Promise<Object>} { continue: true }
 */
async function handleStop(hookInput) {
  return { continue: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect danger in a prompt
 * @param {string} prompt
 * @returns {string|null} Danger warning or null
 */
function detectDanger(prompt) {
  const dangerPatterns = [
    { pattern: /rm\s+-rf\s+[/~]/, level: 'critical', message: 'Recursive deletion from root/home — EXTREMELY dangerous' },
    { pattern: /rm\s+-rf\s+\*/, level: 'critical', message: 'Wildcard deletion — verify scope first' },
    { pattern: /drop\s+(table|database)/i, level: 'critical', message: 'Database deletion is irreversible' },
    { pattern: /delete\s+from\s+\w+\s*;/i, level: 'high', message: 'DELETE without WHERE — affects ALL rows' },
    { pattern: /git\s+push.*--force/, level: 'high', message: 'Force push rewrites remote history' },
    { pattern: /git\s+reset\s+--hard/, level: 'medium', message: 'Hard reset loses uncommitted changes' },
    { pattern: /truncate/i, level: 'high', message: 'TRUNCATE removes all data instantly' },
  ];

  for (const { pattern, level, message } of dangerPatterns) {
    if (pattern.test(prompt)) {
      const prefix = level === 'critical' ? '*GROWL* DANGER' :
                     level === 'high' ? '*growl* Warning' :
                     '*sniff* Caution';
      return `${prefix}: ${message}. Verify before proceeding.`;
    }
  }

  return null;
}
