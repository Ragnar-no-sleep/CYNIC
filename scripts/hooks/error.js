#!/usr/bin/env node
/**
 * CYNIC Error Hook - PostToolUseFailure
 *
 * "Le chien apprend de ses erreurs" - CYNIC learns from mistakes
 *
 * This hook runs when tool execution fails.
 * It detects error patterns, tracks consecutive errors, and adjusts escalation.
 *
 * @event PostToolUseFailure
 * @behavior non-blocking (tracks and learns)
 */

'use strict';

// ESM imports from the lib bridge
import cynic, {
  DC,
  detectUser,
  detectProject,
  loadUserProfile,
  updateUserProfile,
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
// ERROR PATTERNS
// =============================================================================

/** Known error patterns for classification */
const ERROR_PATTERNS = [
  // File system errors
  { pattern: /ENOENT|no such file|file not found/i, type: 'file_not_found', severity: 'medium', recoverable: true },
  { pattern: /EACCES|permission denied|access denied/i, type: 'permission_denied', severity: 'high', recoverable: false },
  { pattern: /EEXIST|already exists/i, type: 'file_exists', severity: 'low', recoverable: true },
  { pattern: /ENOSPC|no space left/i, type: 'disk_full', severity: 'critical', recoverable: false },
  { pattern: /EISDIR|is a directory/i, type: 'is_directory', severity: 'medium', recoverable: true },
  { pattern: /ENOTDIR|not a directory/i, type: 'not_directory', severity: 'medium', recoverable: true },

  // Network errors
  { pattern: /ECONNREFUSED|connection refused/i, type: 'connection_refused', severity: 'high', recoverable: true },
  { pattern: /ETIMEDOUT|timed out|timeout/i, type: 'timeout', severity: 'medium', recoverable: true },
  { pattern: /ENOTFOUND|DNS|getaddrinfo/i, type: 'dns_error', severity: 'high', recoverable: true },
  { pattern: /ECONNRESET|connection reset/i, type: 'connection_reset', severity: 'medium', recoverable: true },
  { pattern: /socket hang up/i, type: 'socket_hangup', severity: 'medium', recoverable: true },

  // Syntax/Parse errors
  { pattern: /SyntaxError|Unexpected token/i, type: 'syntax_error', severity: 'high', recoverable: false },
  { pattern: /JSON\.parse|invalid JSON|unexpected end of JSON/i, type: 'json_parse_error', severity: 'medium', recoverable: false },
  { pattern: /TypeError/i, type: 'type_error', severity: 'high', recoverable: false },
  { pattern: /ReferenceError|is not defined/i, type: 'reference_error', severity: 'high', recoverable: false },

  // Git errors
  { pattern: /fatal:|error: pathspec/i, type: 'git_error', severity: 'medium', recoverable: true },
  { pattern: /merge conflict|CONFLICT/i, type: 'merge_conflict', severity: 'high', recoverable: false },
  { pattern: /not a git repository/i, type: 'not_git_repo', severity: 'medium', recoverable: false },

  // Command errors
  { pattern: /command not found|not recognized/i, type: 'command_not_found', severity: 'medium', recoverable: false },
  { pattern: /npm ERR!|yarn error/i, type: 'package_manager_error', severity: 'medium', recoverable: true },
  { pattern: /exit code [1-9]|exited with code/i, type: 'exit_code_error', severity: 'medium', recoverable: true },

  // Authentication errors
  { pattern: /401|unauthorized|authentication/i, type: 'auth_error', severity: 'high', recoverable: true },
  { pattern: /403|forbidden/i, type: 'forbidden', severity: 'high', recoverable: false },
  { pattern: /404|not found/i, type: 'not_found', severity: 'medium', recoverable: true },
  { pattern: /429|rate limit|too many requests/i, type: 'rate_limit', severity: 'high', recoverable: true },
  { pattern: /500|internal server error/i, type: 'server_error', severity: 'high', recoverable: true },

  // Memory/Resource errors
  { pattern: /heap out of memory|ENOMEM/i, type: 'out_of_memory', severity: 'critical', recoverable: false },
  { pattern: /EMFILE|too many open files/i, type: 'too_many_files', severity: 'high', recoverable: true },
];

/** Error frequency tracking for pattern detection */
const errorHistory = [];
const MAX_ERROR_HISTORY = 50;

// =============================================================================
// ERROR ANALYSIS
// =============================================================================

/**
 * Classify an error message
 */
function classifyError(errorMessage) {
  for (const { pattern, type, severity, recoverable } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return { type, severity, recoverable };
    }
  }
  return { type: 'unknown', severity: 'medium', recoverable: true };
}

/**
 * Extract useful context from error
 */
function extractErrorContext(error, toolInput) {
  const context = {
    errorType: null,
    file: null,
    line: null,
    command: null,
    suggestion: null,
  };

  // Extract file paths
  const fileMatch = error.match(/(?:at |in |file |path[: ]*)([^\s:]+\.[a-z]+)/i);
  if (fileMatch) context.file = fileMatch[1];

  // Extract line numbers
  const lineMatch = error.match(/:(\d+)(?::(\d+))?/);
  if (lineMatch) context.line = parseInt(lineMatch[1], 10);

  // Extract command if Bash
  if (toolInput?.command) {
    context.command = toolInput.command.slice(0, 100);
  }

  // Generate suggestions based on error type
  const classification = classifyError(error);
  context.errorType = classification.type;

  switch (classification.type) {
    case 'file_not_found':
      context.suggestion = 'Check file path spelling and existence. Use Glob to find the file.';
      break;
    case 'permission_denied':
      context.suggestion = 'Check file permissions. May need elevated access.';
      break;
    case 'syntax_error':
      context.suggestion = 'Review the code for syntax issues. Check for missing brackets or quotes.';
      break;
    case 'timeout':
      context.suggestion = 'Operation timed out. Consider increasing timeout or checking network.';
      break;
    case 'rate_limit':
      context.suggestion = 'Rate limited. Wait before retrying or reduce request frequency.';
      break;
    case 'merge_conflict':
      context.suggestion = 'Resolve merge conflicts manually before continuing.';
      break;
    case 'command_not_found':
      context.suggestion = 'Command not installed. Install the required package or check PATH.';
      break;
    default:
      context.suggestion = 'Review the error message and adjust approach.';
  }

  return context;
}

/**
 * Detect repeated error patterns
 */
function detectErrorPatterns(currentError) {
  const patterns = [];

  // Add to history
  errorHistory.push({
    error: currentError,
    timestamp: Date.now(),
    classification: classifyError(currentError.message),
  });

  // Trim history
  if (errorHistory.length > MAX_ERROR_HISTORY) {
    errorHistory.shift();
  }

  // Check for repeated same error (loop detection)
  const recentErrors = errorHistory.slice(-5);
  const sameErrorCount = recentErrors.filter(e =>
    e.classification.type === currentError.classification?.type
  ).length;

  if (sameErrorCount >= 3) {
    patterns.push({
      type: 'repeated_error',
      signature: `repeated_${currentError.classification?.type || 'unknown'}`,
      description: `Same error type repeated ${sameErrorCount} times`,
      severity: 'high',
      suggestion: 'Breaking loop: try a different approach',
    });
  }

  // Check for escalating errors
  const recentSeverities = errorHistory.slice(-10).map(e => e.classification.severity);
  const criticalCount = recentSeverities.filter(s => s === 'critical' || s === 'high').length;
  if (criticalCount >= 5) {
    patterns.push({
      type: 'escalating_errors',
      signature: 'escalating_severity',
      description: 'Multiple high-severity errors in succession',
      severity: 'critical',
      suggestion: 'Consider pausing and reviewing the approach',
    });
  }

  return patterns;
}

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
// MAIN HANDLER
// =============================================================================

async function main() {
  const output = {
    type: 'PostToolUseFailure',
    timestamp: new Date().toISOString(),
    continue: true,
    tool: null,
    error: null,
    classification: null,
    context: null,
    patterns: [],
    escalation: null,
    consecutiveErrors: 0,
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
    const toolName = hookContext.tool_name || hookContext.toolName || '';
    const toolInput = hookContext.tool_input || hookContext.toolInput || {};
    const errorMessage = hookContext.error || hookContext.error_message || hookContext.errorMessage || '';

    output.tool = { name: toolName };
    output.error = errorMessage.slice(0, 500); // Truncate long errors

    // Classify the error
    const classification = classifyError(errorMessage);
    output.classification = classification;

    // Extract context
    const context = extractErrorContext(errorMessage, toolInput);
    output.context = context;

    // Get session state
    const sessionState = getSessionState();
    const user = detectUser();

    // Record error in session state
    if (sessionState.isInitialized()) {
      sessionState.recordError({
        tool: toolName,
        type: classification.type,
        severity: classification.severity,
        message: errorMessage.slice(0, 200),
      });
      output.consecutiveErrors = sessionState.getConsecutiveErrors();

      // Update escalation level based on consecutive errors
      if (output.consecutiveErrors >= 5) {
        sessionState.setEscalationLevel('strict');
        output.escalation = 'strict';
      } else if (output.consecutiveErrors >= 3) {
        sessionState.setEscalationLevel('cautious');
        output.escalation = 'cautious';
      }
    }

    // Detect error patterns
    const patterns = detectErrorPatterns({
      message: errorMessage,
      tool: toolName,
      classification,
    });
    output.patterns = patterns;

    // Record pattern for collective learning
    const pattern = {
      type: 'tool_error',
      signature: `error_${classification.type}_${toolName.toLowerCase()}`,
      description: `${toolName} failed: ${classification.type}`,
      context: {
        tool: toolName,
        errorType: classification.type,
        severity: classification.severity,
        recoverable: classification.recoverable,
        consecutiveErrors: output.consecutiveErrors,
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
          type: 'tool_error',
          title: `${toolName} failed: ${classification.type}`,
          message: context.suggestion,
          data: {
            tool: toolName,
            errorType: classification.type,
            severity: classification.severity,
            consecutiveErrors: output.consecutiveErrors,
          },
          priority: classification.severity === 'critical' ? 'high' : 'medium',
        });
      } catch (e) { /* ignore */ }
    }

    // Send to MCP server for collective tracking
    sendHookToCollectiveSync('PostToolUseFailure', {
      toolName,
      errorType: classification.type,
      severity: classification.severity,
      recoverable: classification.recoverable,
      consecutiveErrors: output.consecutiveErrors,
      patterns: patterns.map(p => p.signature),
      userId: user.userId,
      timestamp: Date.now(),
    });

    // Record negative feedback for learning if we have a recent judgment
    if (patterns.some(p => p.type === 'repeated_error')) {
      callBrainTool('brain_cynic_feedback', {
        feedback: 'incorrect',
        context: `Repeated ${classification.type} errors - approach not working`,
      }).catch(() => { /* ignore */ });
    }

    // Update user profile stats
    const profile = loadUserProfile(user.userId);
    updateUserProfile(profile, {
      stats: {
        errorsEncountered: (profile.stats?.errorsEncountered || 0) + 1,
        [`errorType_${classification.type}`]: (profile.stats?.[`errorType_${classification.type}`] || 0) + 1,
      },
    });

    safeOutput(output);

  } catch (error) {
    output.internalError = error.message;
    safeOutput(output);
  }
}

main();
