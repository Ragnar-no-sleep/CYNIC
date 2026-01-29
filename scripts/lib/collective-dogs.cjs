/**
 * CYNIC Collective Dogs (Sefirot)
 *
 * "Le Collectif observe - un Chien répond"
 *
 * The 11 Dogs of the Collective, mapped to Kabbalistic Sefirot.
 * Each Dog has a domain and reacts to specific contexts.
 *
 * @module @cynic/scripts/lib/collective-dogs
 */

'use strict';

/**
 * The 11 Dogs of the Collective, mapped to Kabbalistic Sefirot
 */
const COLLECTIVE_DOGS = {
  CYNIC:        { icon: '🧠', name: 'CYNIC', sefirah: 'Keter', domain: 'orchestration', color: 'white' },
  SCOUT:        { icon: '🔍', name: 'Scout', sefirah: 'Netzach', domain: 'exploration', color: 'green' },
  GUARDIAN:     { icon: '🛡️', name: 'Guardian', sefirah: 'Gevurah', domain: 'protection', color: 'red' },
  DEPLOYER:     { icon: '🚀', name: 'Deployer', sefirah: 'Hod', domain: 'deployment', color: 'orange' },
  ARCHITECT:    { icon: '🏗️', name: 'Architect', sefirah: 'Chesed', domain: 'building', color: 'blue' },
  JANITOR:      { icon: '🧹', name: 'Janitor', sefirah: 'Yesod', domain: 'cleanup', color: 'purple' },
  ORACLE:       { icon: '🔮', name: 'Oracle', sefirah: 'Tiferet', domain: 'insight', color: 'gold' },
  ANALYST:      { icon: '📊', name: 'Analyst', sefirah: 'Binah', domain: 'analysis', color: 'gray' },
  SAGE:         { icon: '🦉', name: 'Sage', sefirah: 'Chochmah', domain: 'wisdom', color: 'silver' },
  SCHOLAR:      { icon: '📚', name: 'Scholar', sefirah: 'Daat', domain: 'knowledge', color: 'brown' },
  CARTOGRAPHER: { icon: '🗺️', name: 'Cartographer', sefirah: 'Malkhut', domain: 'mapping', color: 'earth' },
};

/**
 * Map agent names to their corresponding Sefirot Dog
 */
const AGENT_TO_DOG = {
  // Cynic agents
  'cynic-scout': COLLECTIVE_DOGS.SCOUT,
  'cynic-reviewer': COLLECTIVE_DOGS.GUARDIAN,
  'cynic-guardian': COLLECTIVE_DOGS.GUARDIAN,
  'cynic-deployer': COLLECTIVE_DOGS.DEPLOYER,
  'cynic-architect': COLLECTIVE_DOGS.ARCHITECT,
  'cynic-simplifier': COLLECTIVE_DOGS.JANITOR,
  'cynic-oracle': COLLECTIVE_DOGS.ORACLE,
  'cynic-archivist': COLLECTIVE_DOGS.SCHOLAR,
  'cynic-cartographer': COLLECTIVE_DOGS.CARTOGRAPHER,
  'cynic-doc': COLLECTIVE_DOGS.SCHOLAR,
  'cynic-tester': COLLECTIVE_DOGS.GUARDIAN,
  'cynic-integrator': COLLECTIVE_DOGS.CYNIC,
  'cynic-librarian': COLLECTIVE_DOGS.SCHOLAR,
  'cynic-solana-expert': COLLECTIVE_DOGS.SAGE,

  // Standard agents
  'Explore': COLLECTIVE_DOGS.SCOUT,
  'Plan': COLLECTIVE_DOGS.ARCHITECT,
  'Bash': COLLECTIVE_DOGS.CARTOGRAPHER,
  'general-purpose': COLLECTIVE_DOGS.CYNIC,

  // Feature dev agents
  'feature-dev:code-architect': COLLECTIVE_DOGS.ARCHITECT,
  'feature-dev:code-explorer': COLLECTIVE_DOGS.SCOUT,
  'feature-dev:code-reviewer': COLLECTIVE_DOGS.GUARDIAN,

  // PR review agents
  'pr-review-toolkit:code-reviewer': COLLECTIVE_DOGS.GUARDIAN,
  'pr-review-toolkit:code-simplifier': COLLECTIVE_DOGS.JANITOR,
  'pr-review-toolkit:comment-analyzer': COLLECTIVE_DOGS.ANALYST,
  'pr-review-toolkit:pr-test-analyzer': COLLECTIVE_DOGS.GUARDIAN,
  'pr-review-toolkit:silent-failure-hunter': COLLECTIVE_DOGS.GUARDIAN,
  'pr-review-toolkit:type-design-analyzer': COLLECTIVE_DOGS.ANALYST,

  // Code simplifier
  'code-simplifier:code-simplifier': COLLECTIVE_DOGS.JANITOR,
};

/**
 * Map error types to responsible Dogs
 */
const ERROR_TO_DOG = {
  'file_not_found': COLLECTIVE_DOGS.SCOUT,
  'permission_denied': COLLECTIVE_DOGS.GUARDIAN,
  'connection_refused': COLLECTIVE_DOGS.DEPLOYER,
  'syntax_error': COLLECTIVE_DOGS.ARCHITECT,
  'type_error': COLLECTIVE_DOGS.ANALYST,
  'test_failure': COLLECTIVE_DOGS.GUARDIAN,
  'timeout': COLLECTIVE_DOGS.ORACLE,
  'unknown': COLLECTIVE_DOGS.CYNIC,
};

/**
 * Map tool names to their primary Dog
 */
const TOOL_TO_DOG = {
  'Read': COLLECTIVE_DOGS.SCOUT,
  'Glob': COLLECTIVE_DOGS.SCOUT,
  'Grep': COLLECTIVE_DOGS.SCOUT,
  'LS': COLLECTIVE_DOGS.SCOUT,
  'Write': COLLECTIVE_DOGS.ARCHITECT,
  'Edit': COLLECTIVE_DOGS.ARCHITECT,
  'NotebookEdit': COLLECTIVE_DOGS.ARCHITECT,
  'Task': COLLECTIVE_DOGS.CYNIC,
  'WebFetch': COLLECTIVE_DOGS.SCHOLAR,
  'WebSearch': COLLECTIVE_DOGS.SCHOLAR,
  'Bash': COLLECTIVE_DOGS.CARTOGRAPHER,
  'AskUserQuestion': COLLECTIVE_DOGS.ORACLE,
};

/**
 * Get the Dog for a specific agent
 * @param {string} agentName - Agent name/type
 * @returns {Object} Dog object
 */
function getDogForAgent(agentName) {
  return AGENT_TO_DOG[agentName] || COLLECTIVE_DOGS.CYNIC;
}

/**
 * Get the Dog for a specific error type
 * @param {string} errorType - Error type
 * @returns {Object} Dog object
 */
function getDogForError(errorType) {
  return ERROR_TO_DOG[errorType] || COLLECTIVE_DOGS.GUARDIAN;
}

/**
 * Get the Dog for a specific tool
 * @param {string} toolName - Tool name
 * @returns {Object} Dog object
 */
function getDogForTool(toolName) {
  return TOOL_TO_DOG[toolName] || COLLECTIVE_DOGS.SCOUT;
}

/**
 * Format a Dog's speech
 * @param {Object} dog - Dog object
 * @param {string} message - Message content
 * @param {string} mood - 'neutral', 'alert', 'happy', 'warning'
 * @returns {string} Formatted speech
 */
function formatDogSpeech(dog, message, mood = 'neutral') {
  const moodPrefixes = {
    neutral: '*sniff*',
    alert: '*ears perk*',
    happy: '*tail wag*',
    warning: '*GROWL*',
    thinking: '*head tilt*',
  };

  const prefix = moodPrefixes[mood] || moodPrefixes.neutral;
  return `${dog.icon} ${dog.name}: ${prefix} ${message}`;
}

/**
 * Format a Dog header for output sections
 * @param {Object} dog - Dog object
 * @param {string} title - Section title
 * @returns {string} Formatted header
 */
function formatDogHeader(dog, title = '') {
  const titleText = title ? ` - ${title}` : '';
  return `── ${dog.icon} ${dog.name} (${dog.sefirah})${titleText} ──`;
}

/**
 * Get all Dogs as array
 * @returns {Array} Array of Dog objects
 */
function getAllDogs() {
  return Object.values(COLLECTIVE_DOGS);
}

/**
 * Get Dog by name
 * @param {string} name - Dog name (case-insensitive)
 * @returns {Object|null} Dog object or null
 */
function getDogByName(name) {
  const normalizedName = name.toUpperCase();
  return COLLECTIVE_DOGS[normalizedName] || null;
}

/**
 * Get Dog by sefirah
 * @param {string} sefirah - Sefirah name (case-insensitive)
 * @returns {Object|null} Dog object or null
 */
function getDogBySefirah(sefirah) {
  const normalizedSefirah = sefirah.toLowerCase();
  return Object.values(COLLECTIVE_DOGS).find(
    dog => dog.sefirah.toLowerCase() === normalizedSefirah
  ) || null;
}

/**
 * Render the Sefirot tree (ASCII art)
 * @returns {string} ASCII tree
 */
function renderSefirotTree() {
  return [
    '               🧠 CYNIC (Keter)',
    '          ╱          │          ╲',
    '    📊 Analyst   📚 Scholar   🦉 Sage',
    '          ╲          │          ╱',
    '    🛡️ Guardian  🔮 Oracle   🏗️ Architect',
    '          ╲          │          ╱',
    '    🚀 Deployer  🧹 Janitor  🔍 Scout',
    '               ╲     │     ╱',
    '               🗺️ Cartographer',
  ].join('\n');
}

module.exports = {
  COLLECTIVE_DOGS,
  AGENT_TO_DOG,
  ERROR_TO_DOG,
  TOOL_TO_DOG,
  getDogForAgent,
  getDogForError,
  getDogForTool,
  formatDogSpeech,
  formatDogHeader,
  getAllDogs,
  getDogByName,
  getDogBySefirah,
  renderSefirotTree,
};
