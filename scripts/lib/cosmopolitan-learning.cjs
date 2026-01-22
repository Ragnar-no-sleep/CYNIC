/**
 * CYNIC Cosmopolitan Learning Module (Phase 6C)
 *
 * "Κοσμοπολίτης - citoyen du monde" - κυνικός
 *
 * Implements cosmopolitan learning from the Cynic philosophy:
 * - Patterns are universal, not just personal
 * - Learning from collective wisdom (anonymized)
 * - Privacy-first: opt-in only
 * - φ-aligned anonymization (61.8% data stripped)
 *
 * @module cynic/lib/cosmopolitan-learning
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI_INV, PHI_INV_2, PHI_INV_3 } = phiMath;

// =============================================================================
// CONSTANTS (φ-derived)
// =============================================================================

/** Anonymization ratio - keep only φ⁻¹ (38.2%) of identifying data */
const ANONYMIZATION_RATIO = PHI_INV_2;

/** Minimum observations before pattern is shared - φ × 10 ≈ 16 */
const MIN_OBSERVATIONS_TO_SHARE = Math.round(phiMath.PHI * 10);

/** Pattern confidence threshold for sharing - φ⁻¹ */
const SHARE_CONFIDENCE_THRESHOLD = PHI_INV;

/** Maximum patterns to receive per sync - φ × 20 ≈ 32 */
const MAX_PATTERNS_PER_SYNC = Math.round(phiMath.PHI * 20);

/** Sync interval in hours - φ⁻¹ × 10 ≈ 6.18 */
const SYNC_INTERVAL_HOURS = PHI_INV * 10;

// =============================================================================
// STORAGE
// =============================================================================

const COSMO_DIR = path.join(os.homedir(), '.cynic', 'cosmopolitan');
const CONFIG_FILE = path.join(COSMO_DIR, 'config.json');
const LOCAL_PATTERNS_FILE = path.join(COSMO_DIR, 'local-patterns.json');
const RECEIVED_PATTERNS_FILE = path.join(COSMO_DIR, 'received-patterns.json');
const CONTRIBUTIONS_FILE = path.join(COSMO_DIR, 'contributions.json');

// =============================================================================
// STATE
// =============================================================================

const cosmoState = {
  config: {
    optedIn: false,           // User must explicitly opt-in
    shareLevel: 'patterns',   // 'patterns' | 'insights' | 'full'
    receiveLevel: 'patterns', // What to receive from collective
    lastSync: null,
    contributorId: null,      // Anonymized contributor ID
  },
  localPatterns: [],          // Patterns collected locally
  receivedPatterns: [],       // Patterns received from collective
  contributions: {
    shared: 0,
    received: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(COSMO_DIR)) {
    fs.mkdirSync(COSMO_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig() {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cosmoState.config, null, 2));
}

function loadLocalPatterns() {
  ensureDir();
  if (!fs.existsSync(LOCAL_PATTERNS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATTERNS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLocalPatterns() {
  ensureDir();
  fs.writeFileSync(LOCAL_PATTERNS_FILE, JSON.stringify(cosmoState.localPatterns, null, 2));
}

function loadReceivedPatterns() {
  ensureDir();
  if (!fs.existsSync(RECEIVED_PATTERNS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(RECEIVED_PATTERNS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveReceivedPatterns() {
  ensureDir();
  fs.writeFileSync(RECEIVED_PATTERNS_FILE, JSON.stringify(cosmoState.receivedPatterns, null, 2));
}

function loadContributions() {
  ensureDir();
  if (!fs.existsSync(CONTRIBUTIONS_FILE)) {
    return { shared: 0, received: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(CONTRIBUTIONS_FILE, 'utf8'));
  } catch {
    return { shared: 0, received: 0 };
  }
}

function saveContributions() {
  ensureDir();
  fs.writeFileSync(CONTRIBUTIONS_FILE, JSON.stringify(cosmoState.contributions, null, 2));
}

// =============================================================================
// ANONYMIZATION (φ-aligned)
// =============================================================================

/**
 * Generate anonymous contributor ID
 * Uses hash of user info + random salt
 * @returns {string} Anonymous ID
 */
function generateContributorId() {
  const userInfo = os.userInfo();
  const salt = crypto.randomBytes(16).toString('hex');
  const raw = `${userInfo.username}:${os.hostname()}:${salt}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/**
 * Anonymize a pattern for sharing
 * Strips identifying information, keeps only universal aspects
 * @param {Object} pattern - Raw pattern
 * @returns {Object} Anonymized pattern
 */
function anonymizePattern(pattern) {
  const anonymized = {
    // Keep: universal pattern info
    type: pattern.type,
    category: pattern.category,
    confidence: Math.round(pattern.confidence * 100) / 100,
    observations: pattern.observations,

    // Generalize: replace specific values with ranges/categories
    context: generalizeContext(pattern.context),

    // Hash: any identifiers
    contributorHash: cosmoState.config.contributorId,

    // Timestamp: generalize to day
    timestamp: Math.floor(Date.now() / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000),
  };

  // Remove φ⁻¹ (61.8%) of fields randomly for extra anonymization
  const fields = Object.keys(anonymized);
  const toRemove = Math.floor(fields.length * (1 - ANONYMIZATION_RATIO));
  const nonEssential = fields.filter(f => !['type', 'confidence', 'observations'].includes(f));

  for (let i = 0; i < toRemove && nonEssential.length > 0; i++) {
    const idx = Math.floor(Math.random() * nonEssential.length);
    const field = nonEssential.splice(idx, 1)[0];
    delete anonymized[field];
  }

  return anonymized;
}

/**
 * Generalize context to remove identifying details
 * @param {Object} context - Original context
 * @returns {Object} Generalized context
 */
function generalizeContext(context) {
  if (!context) return null;

  const generalized = {};

  // File paths → language/type only
  if (context.filePath) {
    const ext = path.extname(context.filePath);
    generalized.fileType = ext || 'unknown';
  }

  // Tool names → category
  if (context.tool) {
    const toolCategories = {
      Read: 'read',
      Write: 'write',
      Edit: 'edit',
      Bash: 'exec',
      Glob: 'search',
      Grep: 'search',
      Task: 'task',
    };
    generalized.toolCategory = toolCategories[context.tool] || 'other';
  }

  // Project names → hashed
  if (context.project) {
    generalized.projectHash = crypto
      .createHash('sha256')
      .update(context.project)
      .digest('hex')
      .slice(0, 8);
  }

  // Time → generalized to period
  if (context.timestamp) {
    const hour = new Date(context.timestamp).getHours();
    generalized.period = hour < 6 ? 'night' :
                         hour < 12 ? 'morning' :
                         hour < 18 ? 'afternoon' : 'evening';
  }

  return Object.keys(generalized).length > 0 ? generalized : null;
}

// =============================================================================
// PATTERN COLLECTION
// =============================================================================

/**
 * Record a local pattern observation
 * @param {Object} pattern - Pattern to record
 */
function recordPattern(pattern) {
  // Find existing pattern or create new
  const existing = cosmoState.localPatterns.find(p =>
    p.type === pattern.type && p.category === pattern.category
  );

  if (existing) {
    existing.observations++;
    existing.confidence = Math.min(PHI_INV, existing.confidence + 0.01);
    existing.lastSeen = Date.now();
  } else {
    cosmoState.localPatterns.push({
      type: pattern.type,
      category: pattern.category,
      context: pattern.context,
      confidence: PHI_INV_3, // Start with low confidence
      observations: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    });
  }

  saveLocalPatterns();
}

/**
 * Get patterns eligible for sharing
 * Must have enough observations and high enough confidence
 * @returns {Object[]} Shareable patterns
 */
function getShareablePatterns() {
  if (!cosmoState.config.optedIn) {
    return [];
  }

  return cosmoState.localPatterns.filter(p =>
    p.observations >= MIN_OBSERVATIONS_TO_SHARE &&
    p.confidence >= SHARE_CONFIDENCE_THRESHOLD
  );
}

// =============================================================================
// COLLECTIVE SYNC
// =============================================================================

/**
 * Prepare patterns for collective sharing
 * @returns {Object} Anonymized patterns ready to share
 */
function prepareForSharing() {
  const shareable = getShareablePatterns();

  return {
    contributorId: cosmoState.config.contributorId,
    patterns: shareable.map(anonymizePattern),
    shareLevel: cosmoState.config.shareLevel,
    timestamp: Date.now(),
  };
}

/**
 * Receive patterns from collective
 * @param {Object[]} patterns - Patterns from collective
 */
function receiveFromCollective(patterns) {
  if (!cosmoState.config.optedIn) {
    return { received: 0 };
  }

  // Filter to relevant patterns based on receive level
  const filtered = patterns
    .filter(p => p.confidence >= PHI_INV_3) // Minimum confidence
    .slice(0, MAX_PATTERNS_PER_SYNC);

  // Merge with existing received patterns
  for (const pattern of filtered) {
    const existing = cosmoState.receivedPatterns.find(p =>
      p.type === pattern.type && p.category === pattern.category
    );

    if (existing) {
      // Increase confidence based on multiple sources
      existing.sources = (existing.sources || 1) + 1;
      existing.confidence = Math.min(PHI_INV, existing.confidence + 0.05);
    } else {
      cosmoState.receivedPatterns.push({
        ...pattern,
        receivedAt: Date.now(),
        sources: 1,
      });
    }
  }

  // Keep only MAX_PATTERNS_PER_SYNC most confident patterns
  cosmoState.receivedPatterns.sort((a, b) => b.confidence - a.confidence);
  cosmoState.receivedPatterns = cosmoState.receivedPatterns.slice(0, MAX_PATTERNS_PER_SYNC);

  cosmoState.contributions.received += filtered.length;
  cosmoState.config.lastSync = Date.now();

  saveReceivedPatterns();
  saveContributions();
  saveConfig();

  return { received: filtered.length };
}

/**
 * Get universal wisdom applicable to current context
 * @param {Object} context - Current context
 * @returns {Object[]} Relevant patterns from collective
 */
function getUniversalWisdom(context = {}) {
  if (!cosmoState.config.optedIn || cosmoState.receivedPatterns.length === 0) {
    return [];
  }

  // Filter patterns relevant to context
  let relevant = cosmoState.receivedPatterns;

  if (context.toolCategory) {
    relevant = relevant.filter(p =>
      !p.context?.toolCategory || p.context.toolCategory === context.toolCategory
    );
  }

  if (context.fileType) {
    relevant = relevant.filter(p =>
      !p.context?.fileType || p.context.fileType === context.fileType
    );
  }

  // Return top patterns by confidence
  return relevant
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

// =============================================================================
// OPT-IN MANAGEMENT
// =============================================================================

/**
 * Opt in to cosmopolitan learning
 * @param {Object} options - Opt-in options
 */
function optIn(options = {}) {
  cosmoState.config.optedIn = true;
  cosmoState.config.shareLevel = options.shareLevel || 'patterns';
  cosmoState.config.receiveLevel = options.receiveLevel || 'patterns';

  // Generate contributor ID if not exists
  if (!cosmoState.config.contributorId) {
    cosmoState.config.contributorId = generateContributorId();
  }

  saveConfig();

  return {
    success: true,
    contributorId: cosmoState.config.contributorId,
    message: 'Bienvenue dans la communauté cosmopolite. φ guide notre sagesse collective.',
  };
}

/**
 * Opt out of cosmopolitan learning
 * Removes all shared patterns and received patterns
 */
function optOut() {
  cosmoState.config.optedIn = false;

  // Clear received patterns (user keeps their local patterns)
  cosmoState.receivedPatterns = [];

  saveConfig();
  saveReceivedPatterns();

  return {
    success: true,
    message: 'Opt-out complet. Vos patterns locaux sont conservés.',
  };
}

/**
 * Get opt-in status
 * @returns {Object} Status
 */
function getStatus() {
  return {
    optedIn: cosmoState.config.optedIn,
    shareLevel: cosmoState.config.shareLevel,
    receiveLevel: cosmoState.config.receiveLevel,
    contributorId: cosmoState.config.contributorId?.slice(0, 8) + '...',
    lastSync: cosmoState.config.lastSync,
    localPatterns: cosmoState.localPatterns.length,
    receivedPatterns: cosmoState.receivedPatterns.length,
    shareablePatterns: getShareablePatterns().length,
    contributions: cosmoState.contributions,
  };
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize cosmopolitan learning
 */
function init() {
  ensureDir();

  const config = loadConfig();
  if (config) {
    cosmoState.config = { ...cosmoState.config, ...config };
  }

  cosmoState.localPatterns = loadLocalPatterns();
  cosmoState.receivedPatterns = loadReceivedPatterns();
  cosmoState.contributions = loadContributions();
}

/**
 * Format universal wisdom for display
 * @param {Object[]} patterns - Patterns to format
 * @returns {string} Formatted wisdom
 */
function formatWisdom(patterns) {
  if (!patterns || patterns.length === 0) {
    return '';
  }

  const lines = ['── SAGESSE UNIVERSELLE ────────────────────────────────────'];

  for (const p of patterns.slice(0, 3)) {
    const confidence = Math.round(p.confidence * 100);
    const sources = p.sources || 1;
    lines.push(`   🌍 ${p.type}: ${p.category}`);
    lines.push(`      (${confidence}% confiance, ${sources} sources)`);
  }

  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  MIN_OBSERVATIONS_TO_SHARE,
  SHARE_CONFIDENCE_THRESHOLD,
  MAX_PATTERNS_PER_SYNC,
  SYNC_INTERVAL_HOURS,

  // Core functions
  init,
  getStatus,

  // Opt-in management
  optIn,
  optOut,

  // Pattern collection
  recordPattern,
  getShareablePatterns,

  // Collective sync
  prepareForSharing,
  receiveFromCollective,
  getUniversalWisdom,

  // Anonymization
  anonymizePattern,
  generalizeContext,

  // Display
  formatWisdom,
};
