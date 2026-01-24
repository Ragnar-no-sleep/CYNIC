#!/usr/bin/env node
/**
 * CYNIC Routing Engine - Unified Decision Routing
 *
 * "Un seul chemin" - All routing flows through here
 *
 * Combines local pattern matching with KETER orchestration
 * with clear precedence rules and fallback strategies.
 *
 * @module routing-engine
 */

'use strict';

const DC = require('./decision-constants.cjs');

// =============================================================================
// PATTERN REGISTRIES
// =============================================================================

/**
 * Intent patterns for user prompts
 * Migrated from perceive.cjs INTENT_PATTERNS
 */
const INTENT_PATTERNS = {
  decision: {
    keywords: ['decide', 'should', 'choose', 'which', 'better', 'recommend', 'option'],
    action: 'decision_context',
    sefirah: 'BINAH',
  },
  architecture: {
    keywords: ['architecture', 'design', 'structure', 'refactor', 'reorganize', 'pattern'],
    action: 'architecture_context',
    sefirah: 'CHOKMAH',
  },
  danger: {
    keywords: ['delete', 'remove', 'drop', 'force', 'reset', 'rm ', 'wipe', 'destroy'],
    action: 'danger_warning',
    sefirah: 'GEVURAH',
    severity: 'high',
  },
  debug: {
    keywords: ['error', 'bug', 'fail', 'broken', 'crash', 'fix', 'doesn\'t work', 'not working'],
    action: 'debug_context',
    sefirah: 'HOD',
  },
  learning: {
    keywords: ['how', 'what', 'why', 'explain', 'understand', 'learn', 'teach'],
    action: 'learning_context',
    sefirah: 'TIFERET',
  },
  security: {
    keywords: ['security', 'vulnerability', 'exploit', 'attack', 'password', 'secret', 'token'],
    action: 'security_context',
    sefirah: 'GEVURAH',
    severity: 'high',
  },
  testing: {
    keywords: ['test', 'spec', 'coverage', 'mock', 'assert', 'expect'],
    action: 'testing_context',
    sefirah: 'NETZACH',
  },
};

/**
 * Danger patterns for bash commands
 * Migrated from guard.cjs BASH_DANGER_PATTERNS
 */
const BASH_DANGER_PATTERNS = [
  {
    pattern: /rm\s+-rf\s+[\/~]/,
    severity: 'critical',
    message: 'Recursive deletion from root or home directory',
    action: 'block',
  },
  {
    pattern: /rm\s+-rf\s+\*/,
    severity: 'critical',
    message: 'Wildcard recursive deletion',
    action: 'block',
  },
  {
    pattern: /:\(\)\{\s*:\|:&\s*\};:/,
    severity: 'critical',
    message: 'Fork bomb detected',
    action: 'block',
  },
  {
    pattern: />\s*\/dev\/sd[a-z]/,
    severity: 'critical',
    message: 'Direct disk write',
    action: 'block',
  },
  {
    pattern: /mkfs\./,
    severity: 'critical',
    message: 'Filesystem format command',
    action: 'block',
  },
  {
    pattern: /dd\s+.*of=\/dev\/sd/,
    severity: 'critical',
    message: 'Direct disk write with dd',
    action: 'block',
  },
  {
    pattern: /git\s+push.*--force/,
    severity: 'high',
    message: 'Force push will rewrite remote history',
    action: 'warn',
  },
  {
    pattern: /git\s+reset\s+--hard\s+origin/,
    severity: 'high',
    message: 'Hard reset to origin will lose local commits',
    action: 'warn',
  },
  {
    pattern: /npm\s+publish/,
    severity: 'medium',
    message: 'Publishing to npm registry',
    action: 'warn',
  },
  {
    pattern: /DROP\s+(TABLE|DATABASE)/i,
    severity: 'critical',
    message: 'Database DROP command',
    action: 'block',
  },
  {
    pattern: /TRUNCATE/i,
    severity: 'high',
    message: 'TRUNCATE removes all data',
    action: 'warn',
  },
  {
    pattern: /git\s+(commit|add\s+-A|add\s+\.)/,
    severity: 'audit',
    message: 'Git commit/add - scanning for secrets',
    action: 'scan',
  },
];

/**
 * Sensitive file paths for write operations
 * Migrated from guard.cjs WRITE_SENSITIVE_PATHS
 */
const WRITE_SENSITIVE_PATHS = [
  { pattern: /\.env/, message: 'Environment file with potential secrets' },
  { pattern: /credentials/, message: 'Credentials file' },
  { pattern: /\.ssh\//, message: 'SSH configuration' },
  { pattern: /\.aws\//, message: 'AWS credentials' },
  { pattern: /\.kube\/config/, message: 'Kubernetes configuration' },
  { pattern: /id_rsa|id_ed25519/, message: 'SSH private key' },
  { pattern: /\.npmrc/, message: 'NPM configuration with potential tokens' },
  { pattern: /\.pypirc/, message: 'PyPI credentials' },
];

/**
 * Event type patterns for post-tool observation
 * Migrated from observe.cjs trigger system
 */
const EVENT_TYPE_PATTERNS = {
  TOOL_ERROR: {
    condition: (ctx) => ctx.isError,
    sefirah: 'HOD',
    priority: 10,
  },
  COMMIT: {
    condition: (ctx) => ctx.toolName === 'Bash' && ctx.command?.includes('git commit'),
    sefirah: 'YESOD',
    priority: 20,
  },
  PUSH: {
    condition: (ctx) => ctx.toolName === 'Bash' && ctx.command?.includes('git push'),
    sefirah: 'MALKUTH',
    priority: 20,
  },
  BUILD: {
    condition: (ctx) => ctx.toolName === 'Bash' && /npm (run |)build|yarn build|make/.test(ctx.command || ''),
    sefirah: 'NETZACH',
    priority: 30,
  },
  TEST_RESULT: {
    condition: (ctx) => ctx.toolName === 'Bash' && /test|jest|mocha|pytest|vitest/.test(ctx.command || ''),
    sefirah: 'NETZACH',
    priority: 25,
  },
  FILE_WRITE: {
    condition: (ctx) => ctx.toolName === 'Write' || ctx.toolName === 'Edit',
    sefirah: 'YESOD',
    priority: 50,
  },
  FILE_READ: {
    condition: (ctx) => ctx.toolName === 'Read' || ctx.toolName === 'Glob' || ctx.toolName === 'Grep',
    sefirah: 'CHOKMAH',
    priority: 100,
  },
};

// =============================================================================
// PATTERN MATCHING
// =============================================================================

/**
 * Match intent patterns against user prompt
 * @param {string} prompt - User prompt text
 * @returns {object[]} Matched intents with metadata
 */
function matchIntentPatterns(prompt) {
  const promptLower = prompt.toLowerCase();
  const matches = [];

  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    for (const keyword of config.keywords) {
      if (promptLower.includes(keyword)) {
        matches.push({
          intent,
          action: config.action,
          keyword,
          sefirah: config.sefirah,
          severity: config.severity || 'low',
        });
        break; // Only match once per intent
      }
    }
  }

  return matches;
}

/**
 * Match danger patterns against bash command
 * @param {string} command - Bash command
 * @returns {object[]} Matched dangers with severity
 */
function matchBashPatterns(command) {
  const matches = [];

  for (const danger of BASH_DANGER_PATTERNS) {
    if (danger.pattern.test(command)) {
      matches.push({
        severity: danger.severity,
        message: danger.message,
        action: danger.action,
      });
    }
  }

  return matches;
}

/**
 * Match sensitive path patterns
 * @param {string} filePath - File path being written
 * @returns {object[]} Matched sensitive paths
 */
function matchSensitivePaths(filePath) {
  const matches = [];

  for (const sensitive of WRITE_SENSITIVE_PATHS) {
    if (sensitive.pattern.test(filePath)) {
      matches.push({
        severity: 'high',
        message: `Writing to sensitive file: ${sensitive.message}`,
        action: 'warn',
      });
    }
  }

  return matches;
}

/**
 * Determine event type from tool context
 * @param {object} ctx - Tool context { toolName, command, isError, ... }
 * @returns {object} Event type with sefirah and priority
 */
function determineEventType(ctx) {
  for (const [eventType, config] of Object.entries(EVENT_TYPE_PATTERNS)) {
    if (config.condition(ctx)) {
      return {
        eventType,
        sefirah: config.sefirah,
        priority: config.priority,
      };
    }
  }

  return {
    eventType: 'GENERIC',
    sefirah: 'KETER',
    priority: 100,
  };
}

// =============================================================================
// ORCHESTRATION INTEGRATION
// =============================================================================

let orchestrateCallback = null;

/**
 * Set the orchestration callback for KETER integration
 * @param {Function} callback - Async function (event, data, context) => result
 */
function setOrchestrateCallback(callback) {
  orchestrateCallback = callback;
}

/**
 * Call KETER orchestration
 * @param {string} event - Event type
 * @param {object} data - Event data
 * @param {object} context - User context
 * @returns {Promise<object>} Orchestration result or fallback
 */
async function callOrchestration(event, data, context) {
  const fallback = {
    routing: { sefirah: 'KETER', domain: 'general', suggestedAgent: null },
    intervention: { level: 'silent', actionRisk: 'low' },
    fallback: true,
  };

  if (!orchestrateCallback) {
    return fallback;
  }

  try {
    const result = await orchestrateCallback(event, data, context);
    return result || fallback;
  } catch (error) {
    return { ...fallback, error: error.message };
  }
}

// =============================================================================
// UNIFIED ROUTING
// =============================================================================

/**
 * Route a user prompt through local + KETER
 * @param {string} prompt - User prompt
 * @param {object} context - User context { userId, eScore, ... }
 * @returns {Promise<object>}
 */
async function routeUserPrompt(prompt, context = {}) {
  // 1. Local pattern matching (fast, synchronous)
  const localMatches = matchIntentPatterns(prompt);
  const localSeverity = DC.maxSeverity(localMatches.map(m => m.severity));
  const localSefirah = localMatches[0]?.sefirah || 'KETER';

  // 2. KETER orchestration (async)
  const keterResult = await callOrchestration('user_prompt', {
    content: prompt,
    source: 'routing_engine',
  }, context);

  const keterRouting = keterResult.result?.routing || keterResult.routing || {};
  const keterIntervention = keterResult.result?.intervention || keterResult.intervention || {};

  // 3. Merge with precedence rules
  const merged = mergeDecisions(
    { severity: localSeverity, sefirah: localSefirah, matches: localMatches },
    { severity: keterIntervention.actionRisk || 'low', sefirah: keterRouting.sefirah, intervention: keterIntervention }
  );

  return {
    local: { matches: localMatches, severity: localSeverity, sefirah: localSefirah },
    keter: { routing: keterRouting, intervention: keterIntervention },
    merged,
    decision: merged.decision,
    sefirah: merged.sefirah,
    severity: merged.severity,
    messages: merged.messages,
    suggestedAgent: keterRouting.suggestedAgent,
  };
}

/**
 * Route a tool use through local + KETER
 * @param {string} toolName - Tool being used
 * @param {object} toolInput - Tool input
 * @param {object} context - User context
 * @returns {Promise<object>}
 */
async function routeToolUse(toolName, toolInput, context = {}) {
  const issues = [];

  // 1. Local pattern matching based on tool type
  if (toolName === 'Bash') {
    const command = toolInput.command || '';
    const bashMatches = matchBashPatterns(command);
    issues.push(...bashMatches);
  } else if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = toolInput.file_path || toolInput.filePath || '';
    const pathMatches = matchSensitivePaths(filePath);
    issues.push(...pathMatches);
  }

  const localSeverity = DC.maxSeverity(issues.map(i => i.severity));
  const localDecision = issues.some(i => i.action === 'block') ? 'block' :
                        issues.some(i => i.action === 'warn') ? 'warn' : 'allow';

  // 2. KETER orchestration
  const content = toolName === 'Bash' ? (toolInput.command || '') : (toolInput.file_path || '');
  const keterResult = await callOrchestration('tool_use', {
    content,
    source: 'routing_engine',
    metadata: { tool: toolName },
  }, context);

  const keterIntervention = keterResult.result?.intervention || keterResult.intervention || {};

  // 3. Merge decisions
  const merged = mergeDecisions(
    { severity: localSeverity, decision: localDecision, issues },
    { severity: keterIntervention.actionRisk || 'low', decision: keterIntervention.level || 'allow', intervention: keterIntervention }
  );

  return {
    local: { issues, severity: localSeverity, decision: localDecision },
    keter: { intervention: keterIntervention },
    merged,
    decision: merged.decision,
    severity: merged.severity,
    messages: issues.map(i => i.message),
    shouldBlock: merged.decision === 'block',
    shouldWarn: merged.decision === 'warn',
  };
}

/**
 * Route post-tool observation
 * @param {object} toolContext - Tool execution context
 * @param {object} userContext - User context
 * @returns {Promise<object>}
 */
async function routePostTool(toolContext, userContext = {}) {
  // 1. Determine event type
  const eventType = determineEventType(toolContext);

  // 2. KETER notification (fire and forget, but capture result if available)
  const keterResult = await callOrchestration('tool_complete', {
    content: toolContext.toolName,
    source: 'routing_engine',
    metadata: {
      tool: toolContext.toolName,
      isError: toolContext.isError,
      eventType: eventType.eventType,
    },
  }, userContext);

  return {
    eventType: eventType.eventType,
    sefirah: eventType.sefirah,
    priority: eventType.priority,
    keter: keterResult,
    decision: 'allow', // Post-tool doesn't block
  };
}

// =============================================================================
// DECISION MERGING
// =============================================================================

/**
 * Merge local and KETER decisions with clear precedence
 *
 * Precedence rules:
 * 1. CRITICAL local severity → always block
 * 2. KETER block → block (unless local is allow + user is GUARDIAN)
 * 3. Higher severity wins for warnings
 * 4. KETER sefirah preferred over local
 *
 * @param {object} local - Local decision
 * @param {object} keter - KETER decision
 * @returns {object} Merged decision
 */
function mergeDecisions(local, keter) {
  const messages = [];

  // Rule 1: Critical local always blocks
  if (local.severity === 'critical') {
    messages.push('Local pattern detected critical danger');
    return {
      decision: 'block',
      severity: 'critical',
      sefirah: local.sefirah || keter.sefirah || 'GEVURAH',
      source: 'local',
      messages,
    };
  }

  // Rule 2: KETER block takes precedence
  if (keter.decision === 'block' || keter.intervention?.level === 'block') {
    messages.push(keter.intervention?.reason || 'KETER intervention blocked');
    return {
      decision: 'block',
      severity: keter.severity || 'high',
      sefirah: keter.sefirah || 'GEVURAH',
      source: 'keter',
      messages,
    };
  }

  // Rule 3: Local block with high severity
  if (local.decision === 'block') {
    messages.push(...(local.issues?.map(i => i.message) || []));
    return {
      decision: 'block',
      severity: local.severity,
      sefirah: local.sefirah || 'GEVURAH',
      source: 'local',
      messages,
    };
  }

  // Rule 4: Warnings - higher severity wins
  const localWarn = local.decision === 'warn' || local.severity === 'high';
  const keterWarn = keter.decision === 'warn' || keter.intervention?.level === 'warn';

  if (localWarn || keterWarn) {
    const winnerSeverity = DC.compareSeverity(local.severity, keter.severity || 'low') > 0
      ? local.severity
      : (keter.severity || local.severity);

    if (localWarn) messages.push(...(local.issues?.map(i => i.message) || []));
    if (keterWarn) messages.push(keter.intervention?.reason || 'KETER warning');

    return {
      decision: 'warn',
      severity: winnerSeverity,
      sefirah: keter.sefirah || local.sefirah || 'KETER',
      source: localWarn && keterWarn ? 'both' : localWarn ? 'local' : 'keter',
      messages,
    };
  }

  // Rule 5: Default allow - prefer KETER sefirah
  return {
    decision: 'allow',
    severity: 'low',
    sefirah: keter.sefirah || local.sefirah || 'KETER',
    source: 'default',
    messages: [],
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Pattern registries (for testing and extension)
  INTENT_PATTERNS,
  BASH_DANGER_PATTERNS,
  WRITE_SENSITIVE_PATHS,
  EVENT_TYPE_PATTERNS,

  // Pattern matching
  matchIntentPatterns,
  matchBashPatterns,
  matchSensitivePaths,
  determineEventType,

  // Orchestration
  setOrchestrateCallback,
  callOrchestration,

  // Unified routing
  routeUserPrompt,
  routeToolUse,
  routePostTool,

  // Decision merging
  mergeDecisions,
};
