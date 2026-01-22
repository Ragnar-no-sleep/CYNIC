/**
 * Epistemic Engine - Justified True Belief & Knowledge
 *
 * Philosophy: Classical epistemology defines knowledge as
 * Justified True Belief (JTB), but Gettier showed this is
 * insufficient - luck can yield JTB without knowledge.
 *
 * Key concepts:
 * - Belief: Holding a proposition to be true
 * - Truth: Correspondence with reality
 * - Justification: Reasons/evidence for belief
 * - Gettier cases: JTB fails due to epistemic luck
 * - Defeaters: Evidence that undercuts justification
 *
 * In CYNIC: Track beliefs about code, their justifications,
 * verify truth conditions, and detect Gettier-like situations.
 *
 * @module epistemic-engine
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;
const PHI_INV_2 = 0.3819660112501051;
const PHI_INV_3 = 0.2360679774997897;

// Storage
const CYNIC_DIR = path.join(process.env.HOME || '/tmp', '.cynic');
const EPISTEMIC_DIR = path.join(CYNIC_DIR, 'epistemic');
const STATE_FILE = path.join(EPISTEMIC_DIR, 'state.json');
const HISTORY_FILE = path.join(EPISTEMIC_DIR, 'history.jsonl');

// Constants
const MAX_BELIEFS = Math.round(PHI * 60);        // ~97
const JUSTIFICATION_THRESHOLD = PHI_INV;         // 0.618
const KNOWLEDGE_THRESHOLD = PHI_INV + PHI_INV_3; // ~0.854

/**
 * Belief states
 */
const BELIEF_STATES = {
  hypothesis: {
    name: 'Hypothesis',
    description: 'Tentative, under investigation',
    symbol: '?',
    confidence: [0, PHI_INV_3],
  },
  opinion: {
    name: 'Opinion',
    description: 'Held belief, limited justification',
    symbol: '◔',
    confidence: [PHI_INV_3, PHI_INV_2],
  },
  belief: {
    name: 'Belief',
    description: 'Confident, justified',
    symbol: '◑',
    confidence: [PHI_INV_2, PHI_INV],
  },
  knowledge: {
    name: 'Knowledge',
    description: 'Justified true belief (verified)',
    symbol: '●',
    confidence: [PHI_INV, 1],
  },
};

/**
 * Justification types
 */
const JUSTIFICATION_TYPES = {
  empirical: {
    name: 'Empirical',
    description: 'Based on observation/testing',
    strength: PHI_INV,
    symbol: '👁️',
  },
  testimonial: {
    name: 'Testimonial',
    description: 'Based on trusted sources',
    strength: PHI_INV_2,
    symbol: '👤',
  },
  inferential: {
    name: 'Inferential',
    description: 'Based on reasoning from other beliefs',
    strength: PHI_INV_2,
    symbol: '→',
  },
  a_priori: {
    name: 'A Priori',
    description: 'Based on logic/definition',
    strength: PHI_INV + PHI_INV_3,
    symbol: '∴',
  },
  memorial: {
    name: 'Memorial',
    description: 'Based on memory',
    strength: PHI_INV_3,
    symbol: '📝',
  },
};

/**
 * Defeater types
 */
const DEFEATER_TYPES = {
  rebutting: {
    name: 'Rebutting',
    description: 'Evidence that P is false',
    severity: 1.0,
  },
  undercutting: {
    name: 'Undercutting',
    description: 'Evidence that justification is flawed',
    severity: PHI_INV,
  },
  overriding: {
    name: 'Overriding',
    description: 'Stronger counter-evidence',
    severity: PHI_INV + PHI_INV_3,
  },
};

// In-memory state
let state = {
  beliefs: {},           // Tracked beliefs
  justifications: [],    // Justification records
  verifications: [],     // Truth verification records
  defeaters: [],         // Recorded defeaters
  gettierCases: [],      // Detected Gettier-like situations
  stats: {
    beliefsRecorded: 0,
    justificationsProvided: 0,
    verificationsPerformed: 0,
    knowledgeAchieved: 0,
    gettierDetected: 0,
  },
};

/**
 * Initialize the epistemic engine
 */
function init() {
  if (!fs.existsSync(EPISTEMIC_DIR)) {
    fs.mkdirSync(EPISTEMIC_DIR, { recursive: true });
  }

  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      // Start fresh
    }
  }
}

/**
 * Save state to disk
 */
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Log to history
 */
function logHistory(event) {
  const entry = { timestamp: Date.now(), ...event };
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');
}

/**
 * Record a belief
 *
 * @param {string} proposition - What is believed
 * @param {object} config - Belief configuration
 * @returns {object} Recorded belief
 */
function believe(proposition, config = {}) {
  // Prune if needed
  if (Object.keys(state.beliefs).length >= MAX_BELIEFS) {
    pruneOldBeliefs();
  }

  const id = `bel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const belief = {
    id,
    proposition,
    domain: config.domain || 'general',
    // JTB components
    believed: true,
    truth: {
      status: 'unknown',  // unknown, true, false
      verifiedAt: null,
      verificationMethod: null,
    },
    justification: {
      score: config.initialJustification || 0,
      sources: [],
    },
    // Epistemic state
    state: 'hypothesis',
    stateInfo: BELIEF_STATES.hypothesis,
    confidence: config.initialConfidence || PHI_INV_3,
    // Tracking
    defeaters: [],
    isKnowledge: false,
    isGettier: false,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };

  state.beliefs[id] = belief;
  state.stats.beliefsRecorded++;

  updateBeliefState(belief);

  logHistory({
    type: 'belief_recorded',
    id,
    proposition,
  });

  saveState();

  return belief;
}

/**
 * Prune old beliefs
 */
function pruneOldBeliefs() {
  const sorted = Object.entries(state.beliefs)
    .filter(([, b]) => !b.isKnowledge)  // Keep knowledge
    .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

  const toRemove = sorted.slice(0, Math.round(MAX_BELIEFS * PHI_INV_3));
  for (const [id] of toRemove) {
    delete state.beliefs[id];
  }
}

/**
 * Add justification for a belief
 *
 * @param {string} beliefId - Belief ID
 * @param {object} justification - Justification details
 * @returns {object} Updated belief
 */
function justify(beliefId, justification) {
  const belief = state.beliefs[beliefId];
  if (!belief) return { error: 'Belief not found' };

  const justType = JUSTIFICATION_TYPES[justification.type] || JUSTIFICATION_TYPES.empirical;

  const justRecord = {
    id: `jst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: justification.type || 'empirical',
    typeInfo: justType,
    content: justification.content || '',
    source: justification.source || '',
    strength: Math.min(justification.strength || justType.strength, PHI_INV),
    addedAt: Date.now(),
  };

  belief.justification.sources.push(justRecord);
  state.justifications.push({ ...justRecord, beliefId });

  // Calculate overall justification score
  const totalStrength = belief.justification.sources.reduce(
    (sum, j) => sum + j.strength, 0
  );
  // Diminishing returns via φ
  belief.justification.score = Math.min(
    1,
    totalStrength * Math.pow(PHI_INV, Math.max(0, belief.justification.sources.length - 3))
  );

  belief.lastUpdated = Date.now();
  state.stats.justificationsProvided++;

  updateBeliefState(belief);

  logHistory({
    type: 'justification_added',
    beliefId,
    justificationType: justification.type,
    newScore: belief.justification.score,
  });

  saveState();

  return {
    belief,
    justification: justRecord,
    totalJustification: Math.round(belief.justification.score * 100),
    meetsThreshold: belief.justification.score >= JUSTIFICATION_THRESHOLD,
  };
}

/**
 * Verify truth of a belief
 *
 * @param {string} beliefId - Belief ID
 * @param {object} verification - Verification result
 * @returns {object} Updated belief
 */
function verify(beliefId, verification) {
  const belief = state.beliefs[beliefId];
  if (!belief) return { error: 'Belief not found' };

  belief.truth.status = verification.isTrue ? 'true' : 'false';
  belief.truth.verifiedAt = Date.now();
  belief.truth.verificationMethod = verification.method || 'observation';
  belief.truth.evidence = verification.evidence || '';

  belief.lastUpdated = Date.now();
  state.stats.verificationsPerformed++;

  state.verifications.push({
    beliefId,
    result: verification.isTrue,
    method: verification.method,
    timestamp: Date.now(),
  });

  // Check for knowledge
  updateBeliefState(belief);
  checkForKnowledge(belief);

  // Keep verifications bounded
  if (state.verifications.length > Math.round(PHI * 100)) {
    state.verifications = state.verifications.slice(-Math.round(PHI * 80));
  }

  logHistory({
    type: 'belief_verified',
    beliefId,
    isTrue: verification.isTrue,
    method: verification.method,
  });

  saveState();

  return {
    belief,
    verified: true,
    isTrue: verification.isTrue,
    isKnowledge: belief.isKnowledge,
    state: belief.state,
  };
}

/**
 * Record a defeater for a belief
 *
 * @param {string} beliefId - Belief ID
 * @param {object} defeater - Defeater details
 * @returns {object} Updated belief
 */
function defeat(beliefId, defeater) {
  const belief = state.beliefs[beliefId];
  if (!belief) return { error: 'Belief not found' };

  const defType = DEFEATER_TYPES[defeater.type] || DEFEATER_TYPES.undercutting;

  const defRecord = {
    id: `def-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: defeater.type || 'undercutting',
    typeInfo: defType,
    content: defeater.content || '',
    severity: defeater.severity || defType.severity,
    addedAt: Date.now(),
  };

  belief.defeaters.push(defRecord);
  state.defeaters.push({ ...defRecord, beliefId });

  // Defeaters reduce justification
  const totalSeverity = belief.defeaters.reduce((sum, d) => sum + d.severity, 0);
  const defeatFactor = Math.pow(PHI_INV, totalSeverity);
  belief.justification.score = belief.justification.score * defeatFactor;
  belief.confidence = belief.confidence * defeatFactor;

  // Rebutting defeater may change truth status
  if (defeater.type === 'rebutting' && defeater.severity >= PHI_INV) {
    belief.truth.status = 'false';
  }

  belief.lastUpdated = Date.now();

  // Re-evaluate state
  updateBeliefState(belief);

  // If was knowledge, check if still is
  if (belief.isKnowledge) {
    checkForKnowledge(belief);
  }

  logHistory({
    type: 'defeater_recorded',
    beliefId,
    defeaterType: defeater.type,
    severity: defRecord.severity,
  });

  saveState();

  return {
    belief,
    defeater: defRecord,
    newJustification: Math.round(belief.justification.score * 100),
    newState: belief.state,
    stillKnowledge: belief.isKnowledge,
  };
}

/**
 * Update belief state based on confidence
 */
function updateBeliefState(belief) {
  // Confidence combines justification and (if verified) truth
  let confidence = belief.justification.score;

  if (belief.truth.status === 'true') {
    confidence = (confidence + 1) / 2;  // Boost for truth
  } else if (belief.truth.status === 'false') {
    confidence = confidence * PHI_INV_2;  // Penalty for falsity
  }

  belief.confidence = confidence;

  // Determine state
  for (const [name, config] of Object.entries(BELIEF_STATES)) {
    if (confidence >= config.confidence[0] && confidence < config.confidence[1]) {
      belief.state = name;
      belief.stateInfo = config;
      break;
    }
  }

  // Knowledge requires truth + high confidence
  if (belief.truth.status === 'true' && confidence >= KNOWLEDGE_THRESHOLD) {
    belief.state = 'knowledge';
    belief.stateInfo = BELIEF_STATES.knowledge;
  }
}

/**
 * Check if belief qualifies as knowledge
 */
function checkForKnowledge(belief) {
  const wasKnowledge = belief.isKnowledge;

  // JTB: Justified + True + Believed
  const isJustified = belief.justification.score >= JUSTIFICATION_THRESHOLD;
  const isTrue = belief.truth.status === 'true';
  const isBelieved = belief.believed;

  const meetsJTB = isJustified && isTrue && isBelieved;

  // Check for Gettier case (JTB but accidentally true)
  const isGettier = checkForGettier(belief);

  if (meetsJTB && !isGettier) {
    belief.isKnowledge = true;
    belief.isGettier = false;
    if (!wasKnowledge) {
      state.stats.knowledgeAchieved++;
    }
  } else if (meetsJTB && isGettier) {
    belief.isKnowledge = false;
    belief.isGettier = true;
    if (!wasKnowledge) {
      state.stats.gettierDetected++;
      state.gettierCases.push({
        beliefId: belief.id,
        proposition: belief.proposition,
        reason: 'Justification and truth accidentally aligned',
        detectedAt: Date.now(),
      });
    }
  } else {
    belief.isKnowledge = false;
    belief.isGettier = false;
  }

  return belief.isKnowledge;
}

/**
 * Check for Gettier-like situation
 * (JTB where truth is lucky, not because of justification)
 */
function checkForGettier(belief) {
  // Heuristics for Gettier detection:
  // 1. Justification based on false intermediate belief
  // 2. Truth verified but verification disconnected from justification
  // 3. High number of defeaters that were later defeated

  // Simple heuristic: if defeaters existed but were overcome,
  // and truth was verified independently, might be Gettier
  const hadDefeaters = belief.defeaters.length > 0;
  const hasIndependentVerification = belief.truth.verificationMethod &&
    !belief.justification.sources.some(j =>
      j.content && belief.truth.evidence &&
      j.content.toLowerCase().includes(belief.truth.evidence.toLowerCase().slice(0, 20))
    );

  // Weak Gettier indicator
  const gettierScore = (hadDefeaters ? PHI_INV_2 : 0) +
                       (hasIndependentVerification ? PHI_INV_2 : 0);

  return gettierScore >= PHI_INV;
}

/**
 * Get belief by ID
 */
function getBelief(beliefId) {
  return state.beliefs[beliefId] || null;
}

/**
 * Query beliefs by domain or state
 */
function queryBeliefs(filter = {}) {
  let beliefs = Object.values(state.beliefs);

  if (filter.domain) {
    beliefs = beliefs.filter(b => b.domain === filter.domain);
  }
  if (filter.state) {
    beliefs = beliefs.filter(b => b.state === filter.state);
  }
  if (filter.isKnowledge !== undefined) {
    beliefs = beliefs.filter(b => b.isKnowledge === filter.isKnowledge);
  }

  return beliefs;
}

/**
 * Get statistics
 */
function getStats() {
  const allBeliefs = Object.values(state.beliefs);
  const knowledgeCount = allBeliefs.filter(b => b.isKnowledge).length;

  return {
    ...state.stats,
    totalBeliefs: allBeliefs.length,
    currentKnowledge: knowledgeCount,
    knowledgeRatio: allBeliefs.length > 0
      ? (knowledgeCount / allBeliefs.length).toFixed(2)
      : 0,
    gettierCases: state.gettierCases.length,
    avgJustification: allBeliefs.length > 0
      ? (allBeliefs.reduce((sum, b) => sum + b.justification.score, 0) / allBeliefs.length).toFixed(2)
      : 0,
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `● Epistemic Engine\n`;
  status += `  Beliefs: ${stats.totalBeliefs}\n`;
  status += `  Knowledge: ${stats.currentKnowledge} (${Math.round(stats.knowledgeRatio * 100)}%)\n`;
  status += `  Gettier cases: ${stats.gettierCases}\n`;
  status += `  Avg justification: ${Math.round(stats.avgJustification * 100)}%\n`;

  // Show by state
  const byState = {};
  for (const belief of Object.values(state.beliefs)) {
    byState[belief.state] = (byState[belief.state] || 0) + 1;
  }

  if (Object.keys(byState).length > 0) {
    status += `  By state:\n`;
    for (const [s, count] of Object.entries(byState)) {
      const info = BELIEF_STATES[s];
      status += `    ${info?.symbol || '?'} ${s}: ${count}\n`;
    }
  }

  return status;
}

module.exports = {
  init,
  believe,
  justify,
  verify,
  defeat,
  getBelief,
  queryBeliefs,
  getStats,
  formatStatus,
  BELIEF_STATES,
  JUSTIFICATION_TYPES,
  DEFEATER_TYPES,
};
