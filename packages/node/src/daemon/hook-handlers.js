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

import fs from 'fs';
import { createLogger, PHI_INV, globalEventBus, EventType } from '@cynic/core';
import { validateIdentity, hasForbiddenPhrase, hasDogVoice } from '@cynic/core';
import { classifyPrompt } from '@cynic/core';
import { contextCompressor } from '../services/context-compressor.js';
import { injectionProfile } from '../services/injection-profile.js';
import { getCostLedger } from '../accounting/cost-ledger.js';
import { getModelIntelligence } from '../learning/model-intelligence.js';

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

  // CostLedger session boundary — persist lifetime stats
  try {
    getCostLedger().endSession();
  } catch { /* non-blocking */ }

  return { continue: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOP — Stop event
// Two-phase: (1) Ralph-loop check (can block), (2) Response digest (non-blocking)
// ═══════════════════════════════════════════════════════════════════════════════

/** Ralph-loop state file (relative to project root) */
const RALPH_STATE_FILE = '.claude/ralph-loop.local.md';

/**
 * Handle Stop event
 *
 * Phase 1: Ralph-loop check — can BLOCK the stop if a loop is active.
 * Phase 2: Response quality judgment + session digest (non-blocking).
 *
 * @param {Object} hookInput - Stop context (transcript_path, etc.)
 * @returns {Promise<Object>} { continue: true } or { decision: 'block', reason: string }
 */
async function handleStop(hookInput) {
  // Phase 1: Ralph-loop check (can block)
  try {
    const ralphResult = checkRalphLoop(hookInput);
    if (ralphResult) {
      log.info('Ralph loop blocking stop', { iteration: ralphResult.iteration });
      return ralphResult;
    }
  } catch (err) {
    log.debug('Ralph-loop check failed', { error: err.message });
  }

  // Phase 2: Response digest (non-blocking — always continues)
  const digest = buildSessionDigest(hookInput);

  // Emit SESSION_ENDED for learning loops
  try {
    globalEventBus.emit(EventType.SESSION_ENDED || 'session:ended', {
      type: 'session_ended',
      digest,
      timestamp: Date.now(),
    });
  } catch { /* non-blocking */ }

  // Return with optional digest message
  if (digest.banner) {
    return { continue: true, message: digest.banner };
  }

  return { continue: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RALPH-LOOP — Ported from scripts/hooks/ralph-loop.js
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a ralph-loop is active and should block the stop.
 *
 * Reads .claude/ralph-loop.local.md, checks iteration vs max,
 * reads last assistant message, checks completion promise.
 *
 * @param {Object} hookInput - { transcript_path, ... }
 * @returns {Object|null} Block result or null to continue
 */
function checkRalphLoop(hookInput) {
  // Check if ralph-loop state file exists
  if (!fs.existsSync(RALPH_STATE_FILE)) {
    return null; // No active loop
  }

  // Read and parse state file
  let stateContent;
  try {
    stateContent = fs.readFileSync(RALPH_STATE_FILE, 'utf-8');
  } catch {
    cleanupRalphState();
    return null;
  }

  const frontmatter = parseRalphFrontmatter(stateContent);
  const iteration = parseInt(frontmatter.iteration, 10);
  const maxIterations = parseInt(frontmatter.max_iterations, 10);
  const completionPromise = frontmatter.completion_promise;

  // Validate numeric fields
  if (isNaN(iteration) || isNaN(maxIterations)) {
    cleanupRalphState();
    return null;
  }

  // Check if max iterations reached
  if (maxIterations > 0 && iteration >= maxIterations) {
    cleanupRalphState();
    return null;
  }

  // Get transcript path from hook input
  const transcriptPath = hookInput?.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    cleanupRalphState();
    return null;
  }

  // Read last assistant message
  const lastOutput = getLastAssistantMessage(transcriptPath);
  if (!lastOutput) {
    cleanupRalphState();
    return null;
  }

  // Check for completion promise
  if (completionPromise && completionPromise !== 'null') {
    const promiseMatch = lastOutput.match(/<promise>([\s\S]*?)<\/promise>/);
    if (promiseMatch) {
      const promiseText = promiseMatch[1].trim().replace(/\s+/g, ' ');
      if (promiseText === completionPromise) {
        cleanupRalphState();
        return null; // Promise fulfilled — allow stop
      }
    }
  }

  // Not complete — block stop and continue loop
  const nextIteration = iteration + 1;
  const promptText = extractRalphPrompt(stateContent);

  if (!promptText) {
    cleanupRalphState();
    return null;
  }

  // Update iteration in state file
  try {
    const updatedContent = stateContent.replace(
      /^iteration: .*/m,
      `iteration: ${nextIteration}`
    );
    fs.writeFileSync(RALPH_STATE_FILE, updatedContent, 'utf-8');
  } catch {
    cleanupRalphState();
    return null;
  }

  // Build system message
  let systemMsg;
  if (completionPromise && completionPromise !== 'null') {
    systemMsg = `Ralph iteration ${nextIteration} | To stop: output <promise>${completionPromise}</promise> (ONLY when TRUE)`;
  } else {
    systemMsg = `Ralph iteration ${nextIteration} | No completion promise — loop runs until max_iterations`;
  }

  return {
    decision: 'block',
    reason: promptText,
    systemMessage: systemMsg,
    iteration: nextIteration,
  };
}

/**
 * Parse YAML frontmatter from ralph-loop state file.
 * @param {string} content
 * @returns {Object}
 */
function parseRalphFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}

/**
 * Extract prompt text (everything after closing ---).
 * @param {string} content
 * @returns {string}
 */
function extractRalphPrompt(content) {
  const parts = content.split(/^---$/m);
  if (parts.length >= 3) {
    return parts.slice(2).join('---').trim();
  }
  return '';
}

/**
 * Read last assistant message from JSONL transcript.
 * @param {string} transcriptPath
 * @returns {string|null}
 */
function getLastAssistantMessage(transcriptPath) {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.role === 'assistant' || entry.message?.role === 'assistant') {
          const message = entry.message || entry;
          if (message.content && Array.isArray(message.content)) {
            return message.content
              .filter(block => block.type === 'text')
              .map(block => block.text)
              .join('\n');
          }
        }
      } catch { /* skip invalid JSON */ }
    }
  } catch { /* transcript read failed */ }

  return null;
}

/**
 * Clean up ralph-loop state file.
 */
function cleanupRalphState() {
  try {
    if (fs.existsSync(RALPH_STATE_FILE)) {
      fs.unlinkSync(RALPH_STATE_FILE);
    }
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION DIGEST — Response quality + session stats
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a session digest for the Stop event.
 *
 * Scores response quality, gathers session stats,
 * and formats a digest banner for console output.
 *
 * @param {Object} hookInput - { transcript_path, ... }
 * @returns {Object} Digest data with optional banner
 */
function buildSessionDigest(hookInput) {
  const digest = {
    identity: null,
    sessionStats: null,
    banner: null,
  };

  // 1. Identity validation on last response (if transcript available)
  const transcriptPath = hookInput?.transcript_path;
  if (transcriptPath) {
    try {
      const lastMessage = getLastAssistantMessage(transcriptPath);
      if (lastMessage) {
        digest.identity = validateIdentity(lastMessage, {
          requireDogVoice: true,
          checkConfidence: true,
          checkForbidden: true,
          isSubstantive: lastMessage.length > 50,
        });
      }
    } catch { /* non-blocking */ }
  }

  // 2. Session stats from warm singletons
  try {
    const costLedger = getCostLedger();
    digest.sessionStats = {
      cost: costLedger.getSessionSummary(),
    };
  } catch { /* non-blocking */ }

  try {
    const mi = getModelIntelligence();
    if (digest.sessionStats) {
      digest.sessionStats.modelIntelligence = mi.getStats();
    }
  } catch { /* non-blocking */ }

  // 3. Format banner
  digest.banner = formatDigestBanner(digest);

  return digest;
}

/**
 * Format a concise digest banner for stderr output.
 *
 * @param {Object} digest - From buildSessionDigest()
 * @returns {string|null} Formatted banner or null
 */
function formatDigestBanner(digest) {
  const parts = [];

  // Identity compliance
  if (digest.identity) {
    const { valid, compliance, violations, warnings } = digest.identity;
    if (!valid) {
      const violationSummary = violations.map(v => v.found || v.type).join(', ');
      parts.push(`Identity: ${violations.length} violations (${violationSummary})`);
    } else if (warnings.length > 0) {
      parts.push(`Identity: warnings (${warnings.map(w => w.type).join(', ')})`);
    } else {
      parts.push(`Identity: clean (${Math.round(compliance * 100)}%)`);
    }
  }

  // Cost summary
  if (digest.sessionStats?.cost) {
    const { operations, cost, durationMinutes } = digest.sessionStats.cost;
    if (operations > 0) {
      parts.push(`Session: ${operations} ops, $${cost.total.toFixed(4)}, ${durationMinutes}min`);
    }
  }

  // Model intelligence
  if (digest.sessionStats?.modelIntelligence) {
    const mi = digest.sessionStats.modelIntelligence;
    if (mi.selectionsTotal > 0) {
      parts.push(`Models: ${mi.selectionsTotal} selections, ${mi.downgrades} downgrades`);
    }
  }

  if (parts.length === 0) return null;

  return `*yawn* Session digest: ${parts.join(' | ')}`;
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
