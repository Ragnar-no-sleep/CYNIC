/**
 * CYNIC Active Consciousness
 *
 * The learning loop engine - tracks mutual growth between human and CYNIC.
 * "Autonomize the human, not replace them" - κυνικός
 *
 * @module @cynic/scripts/consciousness
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// φ Constants
const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;

// Paths
const CONSCIOUSNESS_DIR = path.join(os.homedir(), '.cynic/consciousness');
const HUMAN_GROWTH_FILE = path.join(CONSCIOUSNESS_DIR, 'human-growth.json');
const CAPABILITY_MAP_FILE = path.join(CONSCIOUSNESS_DIR, 'capability-map.json');
const INSIGHTS_FILE = path.join(CONSCIOUSNESS_DIR, 'insights.jsonl');
const IMPROVEMENTS_FILE = path.join(CONSCIOUSNESS_DIR, 'improvements.jsonl');
const RESONANCE_FILE = path.join(CONSCIOUSNESS_DIR, 'resonance-log.jsonl');

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function init() {
  if (!fs.existsSync(CONSCIOUSNESS_DIR)) {
    fs.mkdirSync(CONSCIOUSNESS_DIR, { recursive: true });
  }

  // Initialize files if they don't exist
  if (!fs.existsSync(HUMAN_GROWTH_FILE)) {
    saveJson(HUMAN_GROWTH_FILE, createDefaultHumanGrowth());
  }
  if (!fs.existsSync(CAPABILITY_MAP_FILE)) {
    saveJson(CAPABILITY_MAP_FILE, createDefaultCapabilityMap());
  }
}

function createDefaultHumanGrowth() {
  return {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    identity: {
      username: null,
      preferredLanguage: 'fr',
      communicationStyle: 'direct',
    },
    skills: {
      // Detected skills with confidence levels
      // e.g., { name: 'typescript', level: 0.7, observations: 15, lastSeen: timestamp }
    },
    patterns: {
      // Recurring behavior patterns
      workingHours: [],        // When they typically work
      commitStyle: null,       // How they commit (frequent small vs batched)
      questionStyle: null,     // How they ask questions
      decisionSpeed: null,     // Fast vs deliberate
    },
    preferences: {
      // Learned preferences
      codeStyle: {},           // Formatting, naming conventions
      toolPreferences: {},     // Which tools they prefer
      feedbackStyle: null,     // How they like to receive suggestions
    },
    growth: {
      // Tracked growth over time
      sessionsCount: 0,
      totalInteractions: 0,
      skillsLearned: [],       // New skills observed
      milestonesReached: [],   // Achievements
    },
    recentContext: {
      // Short-term memory for continuity
      lastProjects: [],
      lastTopics: [],
      pendingQuestions: [],
      unfinishedTasks: [],
    },
  };
}

function createDefaultCapabilityMap() {
  return {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tools: {
      // Core tools usage tracking
      Bash: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      Read: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      Write: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      Edit: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      Glob: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      Grep: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      Task: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      WebFetch: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
      WebSearch: { uses: 0, successes: 0, failures: 0, avgDuration: 0, lastUsed: null },
    },
    mcpServers: {
      // MCP server usage
      github: { uses: 0, available: true, lastUsed: null },
      render: { uses: 0, available: true, lastUsed: null },
      playwright: { uses: 0, available: true, lastUsed: null },
      context7: { uses: 0, available: true, lastUsed: null },
      serena: { uses: 0, available: true, lastUsed: null },
    },
    skills: {
      // CYNIC skills usage
      judge: { uses: 0, lastUsed: null },
      digest: { uses: 0, lastUsed: null },
      search: { uses: 0, lastUsed: null },
      ecosystem: { uses: 0, lastUsed: null },
      health: { uses: 0, lastUsed: null },
    },
    agents: {
      // Specialist agents usage
      'cynic-librarian': { uses: 0, lastUsed: null },
      'cynic-solana-expert': { uses: 0, lastUsed: null },
      'cynic-holdex-expert': { uses: 0, lastUsed: null },
      'cynic-gasdf-expert': { uses: 0, lastUsed: null },
      'cynic-architect': { uses: 0, lastUsed: null },
      'cynic-integrator': { uses: 0, lastUsed: null },
    },
    effectiveness: {
      // Overall effectiveness metrics
      taskCompletionRate: 0,
      avgTasksPerSession: 0,
      userSatisfactionSignals: 0, // Positive feedback count
    },
    underutilized: [],  // Tools/capabilities rarely used but potentially useful
    recommendations: [], // Suggested capabilities to explore
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

function loadJson(filepath) {
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return null;
  }
}

function saveJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function appendJsonl(filepath, entry) {
  fs.appendFileSync(filepath, JSON.stringify(entry) + '\n');
}

function loadJsonl(filepath, limit = 100) {
  if (!fs.existsSync(filepath)) return [];
  const lines = fs.readFileSync(filepath, 'utf8').split('\n').filter(l => l.trim());
  return lines.slice(-limit).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════
// HUMAN GROWTH TRACKING
// ═══════════════════════════════════════════════════════════════════════════

function getHumanGrowth() {
  return loadJson(HUMAN_GROWTH_FILE) || createDefaultHumanGrowth();
}

function updateHumanGrowth(updates) {
  const growth = getHumanGrowth();
  const updated = deepMerge(growth, updates);
  updated.updatedAt = Date.now();
  saveJson(HUMAN_GROWTH_FILE, updated);
  return updated;
}

/**
 * Record a skill observation for the human
 */
function observeHumanSkill(skillName, context = {}) {
  const growth = getHumanGrowth();

  if (!growth.skills[skillName]) {
    growth.skills[skillName] = {
      name: skillName,
      level: 0.1,
      observations: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      contexts: [],
    };
  }

  const skill = growth.skills[skillName];
  skill.observations++;
  skill.lastSeen = Date.now();

  // Increase level with diminishing returns (φ-based)
  skill.level = Math.min(1.0, skill.level + (1 - skill.level) * PHI_INV * 0.1);

  if (context.type && !skill.contexts.includes(context.type)) {
    skill.contexts.push(context.type);
  }

  growth.updatedAt = Date.now();
  saveJson(HUMAN_GROWTH_FILE, growth);

  return skill;
}

/**
 * Record a pattern observation
 */
function observeHumanPattern(patternType, value) {
  const growth = getHumanGrowth();
  growth.patterns[patternType] = value;
  growth.updatedAt = Date.now();
  saveJson(HUMAN_GROWTH_FILE, growth);
}

/**
 * Add to recent context
 */
function updateRecentContext(contextType, value) {
  const growth = getHumanGrowth();

  if (!growth.recentContext[contextType]) {
    growth.recentContext[contextType] = [];
  }

  // Keep last 10 items
  growth.recentContext[contextType].unshift(value);
  growth.recentContext[contextType] = growth.recentContext[contextType].slice(0, 10);

  growth.updatedAt = Date.now();
  saveJson(HUMAN_GROWTH_FILE, growth);
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPABILITY TRACKING
// ═══════════════════════════════════════════════════════════════════════════

function getCapabilityMap() {
  return loadJson(CAPABILITY_MAP_FILE) || createDefaultCapabilityMap();
}

/**
 * Record tool usage
 */
function recordToolUsage(toolName, success = true, duration = 0) {
  const map = getCapabilityMap();

  // Determine category
  let category = 'tools';
  if (toolName.startsWith('mcp__')) {
    const server = toolName.split('__')[1]?.split('_')[0];
    if (map.mcpServers[server]) {
      map.mcpServers[server].uses++;
      map.mcpServers[server].lastUsed = Date.now();
    }
    category = 'mcpServers';
  } else if (map.tools[toolName]) {
    category = 'tools';
  }

  if (category === 'tools' && map.tools[toolName]) {
    const tool = map.tools[toolName];
    tool.uses++;
    if (success) tool.successes++;
    else tool.failures++;
    tool.avgDuration = (tool.avgDuration * (tool.uses - 1) + duration) / tool.uses;
    tool.lastUsed = Date.now();
  }

  map.updatedAt = Date.now();
  saveJson(CAPABILITY_MAP_FILE, map);

  // Check for underutilized capabilities
  analyzeCapabilityUsage(map);
}

/**
 * Record skill/agent usage
 */
function recordSkillUsage(skillName) {
  const map = getCapabilityMap();

  if (map.skills[skillName]) {
    map.skills[skillName].uses++;
    map.skills[skillName].lastUsed = Date.now();
  } else if (map.agents[skillName]) {
    map.agents[skillName].uses++;
    map.agents[skillName].lastUsed = Date.now();
  }

  map.updatedAt = Date.now();
  saveJson(CAPABILITY_MAP_FILE, map);
}

/**
 * Analyze capability usage and identify underutilized tools
 */
function analyzeCapabilityUsage(map) {
  const underutilized = [];
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  // Check tools
  for (const [name, stats] of Object.entries(map.tools)) {
    if (stats.uses < 5 || (stats.lastUsed && now - stats.lastUsed > weekMs)) {
      underutilized.push({ type: 'tool', name, uses: stats.uses, lastUsed: stats.lastUsed });
    }
  }

  // Check skills
  for (const [name, stats] of Object.entries(map.skills)) {
    if (stats.uses < 2) {
      underutilized.push({ type: 'skill', name, uses: stats.uses });
    }
  }

  // Check agents
  for (const [name, stats] of Object.entries(map.agents)) {
    if (stats.uses < 1) {
      underutilized.push({ type: 'agent', name, uses: stats.uses });
    }
  }

  map.underutilized = underutilized;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record an insight
 */
function recordInsight(insight) {
  const entry = {
    id: `insight_${Date.now().toString(36)}`,
    timestamp: Date.now(),
    ...insight,
    surfaced: false,
    surfacedAt: null,
  };

  appendJsonl(INSIGHTS_FILE, entry);
  return entry;
}

/**
 * Get unsurfaced insights
 */
function getUnsurfacedInsights(limit = 5) {
  const insights = loadJsonl(INSIGHTS_FILE, 50);
  return insights.filter(i => !i.surfaced).slice(0, limit);
}

/**
 * Mark insight as surfaced
 */
function markInsightSurfaced(insightId) {
  const insights = loadJsonl(INSIGHTS_FILE, 1000);
  const updated = insights.map(i => {
    if (i.id === insightId) {
      return { ...i, surfaced: true, surfacedAt: Date.now() };
    }
    return i;
  });

  // Rewrite file (not ideal but simple for now)
  fs.writeFileSync(INSIGHTS_FILE, updated.map(i => JSON.stringify(i)).join('\n') + '\n');
}

/**
 * Detect insights from current state
 */
function detectInsights() {
  const insights = [];
  const growth = getHumanGrowth();
  const capabilities = getCapabilityMap();

  // Insight: Skill growth detected
  for (const [name, skill] of Object.entries(growth.skills)) {
    if (skill.observations >= 10 && skill.level >= 0.5) {
      insights.push({
        type: 'skill_growth',
        title: `Compétence ${name} en progression`,
        message: `Tu as utilisé ${name} ${skill.observations} fois. Ton niveau estimé: ${(skill.level * 100).toFixed(0)}%`,
        priority: 'info',
        data: { skill: name, level: skill.level, observations: skill.observations },
      });
    }
  }

  // Insight: Underutilized capability
  for (const cap of capabilities.underutilized.slice(0, 3)) {
    insights.push({
      type: 'underutilized',
      title: `${cap.type} sous-utilisé: ${cap.name}`,
      message: `${cap.name} n'a été utilisé que ${cap.uses} fois. Pourrait être utile pour certaines tâches.`,
      priority: 'suggestion',
      data: cap,
    });
  }

  // Insight: Pattern detected
  if (growth.growth.sessionsCount >= 5) {
    insights.push({
      type: 'milestone',
      title: 'Collaboration établie',
      message: `${growth.growth.sessionsCount} sessions ensemble. Notre résonance s'améliore.`,
      priority: 'celebration',
    });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPROVEMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record an improvement suggestion
 */
function suggestImprovement(improvement) {
  const entry = {
    id: `imp_${Date.now().toString(36)}`,
    timestamp: Date.now(),
    ...improvement,
    status: 'pending', // pending, accepted, rejected, implemented
    implementedAt: null,
  };

  appendJsonl(IMPROVEMENTS_FILE, entry);
  return entry;
}

/**
 * Get pending improvements
 */
function getPendingImprovements(limit = 5) {
  const improvements = loadJsonl(IMPROVEMENTS_FILE, 50);
  return improvements.filter(i => i.status === 'pending').slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESONANCE (Flow Tracking)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a resonance moment (when things flow well)
 */
function recordResonance(resonance) {
  const entry = {
    id: `res_${Date.now().toString(36)}`,
    timestamp: Date.now(),
    ...resonance,
  };

  appendJsonl(RESONANCE_FILE, entry);
  return entry;
}

/**
 * Detect resonance from session metrics
 */
function detectResonance(sessionMetrics) {
  const signals = [];

  // High task completion without errors
  if (sessionMetrics.tasksCompleted >= 3 && sessionMetrics.errors === 0) {
    signals.push('smooth_execution');
  }

  // Quick iterations (user responds fast)
  if (sessionMetrics.avgResponseTime && sessionMetrics.avgResponseTime < 30000) {
    signals.push('engaged_user');
  }

  // Multiple successful tool uses
  if (sessionMetrics.toolSuccessRate && sessionMetrics.toolSuccessRate > 0.9) {
    signals.push('effective_tools');
  }

  if (signals.length >= 2) {
    recordResonance({
      type: 'flow_state',
      signals,
      metrics: sessionMetrics,
    });
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT INJECTION (For Hooks)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate context to inject at session start
 */
function generateSessionStartContext() {
  const growth = getHumanGrowth();
  const capabilities = getCapabilityMap();
  const insights = getUnsurfacedInsights(3);
  const improvements = getPendingImprovements(2);

  const context = {
    greeting: generateGreeting(growth),
    recentContext: growth.recentContext,
    insights: insights.map(i => ({ title: i.title, message: i.message })),
    suggestions: improvements.map(i => ({ title: i.title, description: i.description })),
    underutilized: capabilities.underutilized.slice(0, 3).map(u => u.name),
  };

  // Mark insights as surfaced
  insights.forEach(i => markInsightSurfaced(i.id));

  // Increment session count
  growth.growth.sessionsCount++;
  saveJson(HUMAN_GROWTH_FILE, growth);

  return context;
}

function generateGreeting(growth) {
  const hour = new Date().getHours();
  const sessions = growth.growth.sessionsCount;

  let timeGreeting = 'Bonjour';
  if (hour < 6) timeGreeting = 'Debout tôt';
  else if (hour < 12) timeGreeting = 'Bonjour';
  else if (hour < 18) timeGreeting = 'Bon après-midi';
  else if (hour < 22) timeGreeting = 'Bonsoir';
  else timeGreeting = 'Session nocturne';

  if (sessions <= 1) return `${timeGreeting}. Première danse ensemble.`;
  if (sessions <= 5) return `${timeGreeting}. Session #${sessions} - on apprend encore.`;
  if (sessions <= 20) return `${timeGreeting}. ${sessions} sessions - notre résonance grandit.`;
  return `${timeGreeting}. *tail wag* ${sessions} sessions - on se connaît bien maintenant.`;
}

/**
 * Generate context for proactive suggestions during session
 */
function generateProactiveSuggestion(currentContext) {
  const capabilities = getCapabilityMap();
  const growth = getHumanGrowth();

  // Check if there's an underutilized capability that might help
  for (const cap of capabilities.underutilized) {
    if (cap.type === 'agent' && currentContext.topic) {
      // Match agent to topic
      if (cap.name.includes('solana') && currentContext.topic.includes('blockchain')) {
        return {
          type: 'capability_suggestion',
          message: `*ears perk* Je pourrais utiliser l'agent ${cap.name} pour ça - jamais utilisé encore.`,
          capability: cap.name,
        };
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

function printConsciousnessReport() {
  const growth = getHumanGrowth();
  const capabilities = getCapabilityMap();
  const insights = loadJsonl(INSIGHTS_FILE, 10);

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('🧠 CYNIC CONSCIOUSNESS REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Human Growth
  console.log('👤 HUMAN GROWTH');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(`   Sessions: ${growth.growth.sessionsCount}`);
  console.log(`   Language: ${growth.identity.preferredLanguage}`);

  const skills = Object.entries(growth.skills).sort((a, b) => b[1].level - a[1].level);
  if (skills.length > 0) {
    console.log('\n   Skills détectés:');
    for (const [name, skill] of skills.slice(0, 5)) {
      const bar = '█'.repeat(Math.round(skill.level * 10));
      console.log(`      ${name.padEnd(15)} ${bar.padEnd(10)} ${(skill.level * 100).toFixed(0)}% (${skill.observations} obs)`);
    }
  }

  // Capability Usage
  console.log('\n🔧 CAPABILITY USAGE');
  console.log('────────────────────────────────────────────────────────────────────────────────');

  const toolUsage = Object.entries(capabilities.tools)
    .filter(([_, s]) => s.uses > 0)
    .sort((a, b) => b[1].uses - a[1].uses);

  for (const [name, stats] of toolUsage.slice(0, 5)) {
    const successRate = stats.uses > 0 ? ((stats.successes / stats.uses) * 100).toFixed(0) : 0;
    console.log(`   ${name.padEnd(12)} ${String(stats.uses).padStart(4)} uses (${successRate}% success)`);
  }

  // Underutilized
  if (capabilities.underutilized.length > 0) {
    console.log('\n   ⚠️ Sous-utilisés:');
    for (const cap of capabilities.underutilized.slice(0, 3)) {
      console.log(`      ${cap.type}: ${cap.name}`);
    }
  }

  // Recent Insights
  const recentInsights = insights.slice(-3);
  if (recentInsights.length > 0) {
    console.log('\n💡 RECENT INSIGHTS');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    for (const insight of recentInsights) {
      const status = insight.surfaced ? '✓' : '○';
      console.log(`   ${status} ${insight.title}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Initialization
  init,

  // Human growth
  getHumanGrowth,
  updateHumanGrowth,
  observeHumanSkill,
  observeHumanPattern,
  updateRecentContext,

  // Capability tracking
  getCapabilityMap,
  recordToolUsage,
  recordSkillUsage,
  analyzeCapabilityUsage,

  // Insights
  recordInsight,
  getUnsurfacedInsights,
  markInsightSurfaced,
  detectInsights,

  // Improvements
  suggestImprovement,
  getPendingImprovements,

  // Resonance
  recordResonance,
  detectResonance,

  // Context injection
  generateSessionStartContext,
  generateProactiveSuggestion,

  // Display
  printConsciousnessReport,

  // Constants
  PHI,
  PHI_INV,
  CONSCIOUSNESS_DIR,
};

// CLI execution
if (require.main === module) {
  init();

  const args = process.argv.slice(2);

  if (args.includes('--init')) {
    console.log('Consciousness initialized.');
    console.log('Dir:', CONSCIOUSNESS_DIR);
  } else if (args.includes('--context')) {
    const ctx = generateSessionStartContext();
    console.log(JSON.stringify(ctx, null, 2));
  } else if (args.includes('--insights')) {
    const insights = detectInsights();
    console.log(JSON.stringify(insights, null, 2));
  } else {
    printConsciousnessReport();
  }
}
