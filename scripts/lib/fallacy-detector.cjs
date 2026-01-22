/**
 * Fallacy Detector - Logical Fallacies & Reasoning Errors
 *
 * Philosophy: From Aristotle's Sophistical Refutations to Hamblin's
 * modern fallacy theory, identifying reasoning errors is essential
 * for critical thinking. Fallacies are arguments that seem valid
 * but contain hidden flaws.
 *
 * Key concepts:
 * - Formal fallacies: Invalid logical structure
 * - Informal fallacies: Content/context errors
 * - Relevance fallacies: Premises don't support conclusion
 * - Ambiguity fallacies: Language confusion
 * - Presumption fallacies: Unwarranted assumptions
 *
 * In CYNIC: Detect reasoning errors, flag suspicious arguments,
 * categorize fallacy types, suggest corrections.
 *
 * @module fallacy-detector
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
const FALLACY_DIR = path.join(CYNIC_DIR, 'fallacy');
const STATE_FILE = path.join(FALLACY_DIR, 'state.json');
const HISTORY_FILE = path.join(FALLACY_DIR, 'history.jsonl');

// Constants
const MAX_DETECTIONS = Math.round(PHI * 150);     // ~243
const SUSPICION_THRESHOLD = PHI_INV_2;            // 0.382

/**
 * Fallacy categories
 */
const FALLACY_CATEGORIES = {
  formal: {
    name: 'Formal',
    description: 'Invalid logical structure',
    severity: 1.0,  // Most severe - argument is invalid
    symbol: '⊗',
  },
  relevance: {
    name: 'Relevance',
    description: 'Premises don\'t support conclusion',
    severity: PHI_INV,
    symbol: '↯',
  },
  ambiguity: {
    name: 'Ambiguity',
    description: 'Language or meaning confusion',
    severity: PHI_INV_2,
    symbol: '≋',
  },
  presumption: {
    name: 'Presumption',
    description: 'Unwarranted assumptions',
    severity: PHI_INV,
    symbol: '⊃',
  },
  induction: {
    name: 'Inductive',
    description: 'Weak inductive reasoning',
    severity: PHI_INV_2,
    symbol: '~',
  },
};

/**
 * Formal fallacies (invalid logical structure)
 */
const FORMAL_FALLACIES = {
  affirming_consequent: {
    name: 'Affirming the Consequent',
    description: 'P → Q, Q ∴ P (invalid)',
    example: 'If it rains, streets are wet. Streets are wet. Therefore it rained.',
    pattern: 'conclusion_from_consequent',
    severity: 1.0,
    correction: 'Q being true doesn\'t prove P caused it - other causes possible',
  },
  denying_antecedent: {
    name: 'Denying the Antecedent',
    description: 'P → Q, ¬P ∴ ¬Q (invalid)',
    example: 'If it rains, streets are wet. It didn\'t rain. Therefore streets aren\'t wet.',
    pattern: 'conclusion_from_negated_antecedent',
    severity: 1.0,
    correction: 'Other causes could make Q true even when P is false',
  },
  undistributed_middle: {
    name: 'Undistributed Middle',
    description: 'All A are B, All C are B ∴ All A are C (invalid)',
    example: 'All dogs are animals. All cats are animals. Therefore all dogs are cats.',
    pattern: 'middle_term_undistributed',
    severity: 1.0,
    correction: 'Sharing a property doesn\'t establish identity or subset relation',
  },
  illicit_major: {
    name: 'Illicit Major',
    description: 'Major term distributed in conclusion but not premise',
    example: 'All cats are mammals. No dogs are cats. Therefore no dogs are mammals.',
    pattern: 'illicit_distribution_major',
    severity: 1.0,
    correction: 'Can\'t conclude about all of major term from undistributed premise',
  },
  four_terms: {
    name: 'Four Terms (Quaternio Terminorum)',
    description: 'Syllogism with four terms instead of three',
    example: 'Using "bank" in two senses (river bank, financial bank)',
    pattern: 'equivocation_in_syllogism',
    severity: 1.0,
    correction: 'Ensure middle term has same meaning in both premises',
  },
};

/**
 * Informal fallacies - Relevance
 */
const RELEVANCE_FALLACIES = {
  ad_hominem: {
    name: 'Ad Hominem',
    description: 'Attacking the person instead of the argument',
    example: 'You can\'t trust his climate research - he drives an SUV.',
    indicators: ['person', 'character', 'hypocrite', 'biased'],
    severity: PHI_INV,
    correction: 'Address the argument, not the arguer\'s character',
  },
  straw_man: {
    name: 'Straw Man',
    description: 'Misrepresenting opponent\'s argument to attack easier target',
    example: '"We should have stricter gun laws" → "They want to ban all guns"',
    indicators: ['extreme', 'exaggerate', 'misrepresent'],
    severity: PHI_INV,
    correction: 'Address the actual argument, not a distortion of it',
  },
  appeal_to_authority: {
    name: 'Appeal to Authority',
    description: 'Claiming truth because authority says so (when irrelevant)',
    example: 'Einstein believed in God, so God must exist.',
    indicators: ['expert', 'authority', 'said', 'believes'],
    severity: PHI_INV_2,
    correction: 'Authority must be relevant to the domain in question',
  },
  appeal_to_emotion: {
    name: 'Appeal to Emotion',
    description: 'Using emotion instead of logic',
    example: 'Think of the children! (when not relevant to argument)',
    indicators: ['feel', 'emotion', 'scary', 'outrage'],
    severity: PHI_INV_2,
    correction: 'Emotions can inform but shouldn\'t replace logical support',
  },
  tu_quoque: {
    name: 'Tu Quoque (You Too)',
    description: 'Deflecting criticism by pointing to opponent\'s same flaw',
    example: '"You smoke too, so you can\'t criticize my smoking"',
    indicators: ['you also', 'yourself', 'hypocrite'],
    severity: PHI_INV_2,
    correction: 'Critic\'s behavior doesn\'t invalidate the criticism',
  },
  red_herring: {
    name: 'Red Herring',
    description: 'Introducing irrelevant topic to divert attention',
    example: 'Why worry about climate when there\'s poverty?',
    indicators: ['but what about', 'more important', 'instead'],
    severity: PHI_INV,
    correction: 'Stay focused on the original argument',
  },
};

/**
 * Informal fallacies - Presumption
 */
const PRESUMPTION_FALLACIES = {
  begging_question: {
    name: 'Begging the Question',
    description: 'Conclusion assumed in premise (circular reasoning)',
    example: 'The Bible is true because it\'s the word of God, which we know because the Bible says so.',
    indicators: ['because', 'obviously', 'clearly', 'self-evident'],
    severity: PHI_INV,
    correction: 'Premises must be independent of conclusion',
  },
  false_dilemma: {
    name: 'False Dilemma',
    description: 'Presenting only two options when more exist',
    example: 'You\'re either with us or against us.',
    indicators: ['either', 'or', 'only two', 'must choose'],
    severity: PHI_INV,
    correction: 'Consider whether other options exist',
  },
  slippery_slope: {
    name: 'Slippery Slope',
    description: 'Claiming one event will inevitably lead to extreme outcome',
    example: 'If we allow X, soon we\'ll have to allow Y, then Z, then catastrophe.',
    indicators: ['will lead to', 'next thing', 'eventually', 'slippery'],
    severity: PHI_INV_2,
    correction: 'Each step in the chain needs its own justification',
  },
  loaded_question: {
    name: 'Loaded Question',
    description: 'Question presupposes unproven assumption',
    example: 'Have you stopped cheating on tests?',
    indicators: ['when did you', 'why do you', 'still'],
    severity: PHI_INV_2,
    correction: 'Challenge the hidden assumption in the question',
  },
  no_true_scotsman: {
    name: 'No True Scotsman',
    description: 'Protecting claim from counterexample by arbitrary redefinition',
    example: 'No true programmer uses spaces... well, those who do aren\'t true programmers.',
    indicators: ['true', 'real', 'proper', 'not really'],
    severity: PHI_INV_2,
    correction: 'Accept counterexamples or justify the definition independently',
  },
  hasty_generalization: {
    name: 'Hasty Generalization',
    description: 'Drawing broad conclusion from insufficient evidence',
    example: 'I met two rude people from X, so everyone from X is rude.',
    indicators: ['all', 'every', 'always', 'never'],
    severity: PHI_INV_2,
    correction: 'Ensure sample size and representativeness are adequate',
  },
};

/**
 * Informal fallacies - Ambiguity
 */
const AMBIGUITY_FALLACIES = {
  equivocation: {
    name: 'Equivocation',
    description: 'Using word with multiple meanings inconsistently',
    example: 'The sign says "fine for parking here" so it must be fine to park.',
    indicators: ['same word', 'different meaning'],
    severity: PHI_INV_2,
    correction: 'Ensure consistent meaning throughout argument',
  },
  amphiboly: {
    name: 'Amphiboly',
    description: 'Ambiguous grammatical structure',
    example: 'I saw the man with the telescope (who had the telescope?)',
    indicators: ['ambiguous', 'could mean'],
    severity: PHI_INV_3,
    correction: 'Clarify grammatical structure',
  },
  composition: {
    name: 'Composition',
    description: 'Assuming whole has properties of parts',
    example: 'Each brick is light, so the wall is light.',
    indicators: ['each', 'every', 'all', 'therefore the whole'],
    severity: PHI_INV_2,
    correction: 'Properties of parts don\'t always transfer to whole',
  },
  division: {
    name: 'Division',
    description: 'Assuming parts have properties of whole',
    example: 'The team is excellent, so each player must be excellent.',
    indicators: ['the whole', 'therefore each', 'therefore part'],
    severity: PHI_INV_2,
    correction: 'Properties of whole don\'t always transfer to parts',
  },
};

// In-memory state
let state = {
  detections: [],      // Detected fallacies
  arguments: {},       // Arguments analyzed
  patterns: {},        // Detection pattern stats
  stats: {
    argumentsAnalyzed: 0,
    fallaciesDetected: 0,
    formalFallacies: 0,
    informalFallacies: 0,
    falsePositives: 0,
    confirmedFallacies: 0,
  },
};

/**
 * Initialize the fallacy detector
 */
function init() {
  if (!fs.existsSync(FALLACY_DIR)) {
    fs.mkdirSync(FALLACY_DIR, { recursive: true });
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
 * Analyze an argument for fallacies
 *
 * @param {object} argument - Argument to analyze
 * @returns {object} Analysis result
 */
function analyze(argument) {
  const id = `ana-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const analysis = {
    id,
    argument: {
      premises: argument.premises || [],
      conclusion: argument.conclusion || '',
      text: argument.text || '',
    },
    detectedFallacies: [],
    suspicionLevel: 0,
    analyzedAt: Date.now(),
  };

  // Check formal fallacies (structure-based)
  const formalResults = checkFormalFallacies(argument);
  analysis.detectedFallacies.push(...formalResults);

  // Check informal fallacies (content-based)
  const text = (argument.text || '') +
               (argument.premises || []).join(' ') +
               (argument.conclusion || '');

  const relevanceResults = checkRelevanceFallacies(text);
  analysis.detectedFallacies.push(...relevanceResults);

  const presumptionResults = checkPresumptionFallacies(text);
  analysis.detectedFallacies.push(...presumptionResults);

  const ambiguityResults = checkAmbiguityFallacies(text);
  analysis.detectedFallacies.push(...ambiguityResults);

  // Calculate suspicion level
  if (analysis.detectedFallacies.length > 0) {
    const maxSeverity = Math.max(...analysis.detectedFallacies.map(f => f.severity));
    const avgSeverity = analysis.detectedFallacies.reduce((sum, f) => sum + f.severity, 0) /
                       analysis.detectedFallacies.length;
    analysis.suspicionLevel = (maxSeverity + avgSeverity) / 2;
  }

  // Update stats
  state.stats.argumentsAnalyzed++;
  state.stats.fallaciesDetected += analysis.detectedFallacies.length;
  state.stats.formalFallacies += analysis.detectedFallacies.filter(
    f => f.category === 'formal'
  ).length;
  state.stats.informalFallacies += analysis.detectedFallacies.filter(
    f => f.category !== 'formal'
  ).length;

  // Store detection
  state.detections.push(analysis);
  if (state.detections.length > MAX_DETECTIONS) {
    state.detections = state.detections.slice(-Math.round(MAX_DETECTIONS * PHI_INV));
  }

  logHistory({
    type: 'argument_analyzed',
    id,
    fallaciesFound: analysis.detectedFallacies.length,
    suspicionLevel: analysis.suspicionLevel,
  });

  saveState();

  return {
    analysis,
    hasFallacy: analysis.detectedFallacies.length > 0,
    fallacyCount: analysis.detectedFallacies.length,
    suspicionLevel: Math.round(analysis.suspicionLevel * 100),
    isSuspicious: analysis.suspicionLevel >= SUSPICION_THRESHOLD,
    fallacies: analysis.detectedFallacies.map(f => ({
      name: f.name,
      category: f.category,
      severity: Math.round(f.severity * 100),
      correction: f.correction,
    })),
  };
}

/**
 * Check for formal fallacies
 */
function checkFormalFallacies(argument) {
  const detected = [];

  // This would require proper logical parsing
  // For now, flag common patterns based on structure hints

  if (argument.pattern === 'affirming_consequent' ||
      (argument.structure && argument.structure.includes('Q therefore P'))) {
    detected.push({
      ...FORMAL_FALLACIES.affirming_consequent,
      category: 'formal',
      confidence: PHI_INV,
    });
  }

  if (argument.pattern === 'denying_antecedent' ||
      (argument.structure && argument.structure.includes('not P therefore not Q'))) {
    detected.push({
      ...FORMAL_FALLACIES.denying_antecedent,
      category: 'formal',
      confidence: PHI_INV,
    });
  }

  return detected;
}

/**
 * Check for relevance fallacies (text-based)
 */
function checkRelevanceFallacies(text) {
  const detected = [];
  const lowerText = text.toLowerCase();

  for (const [key, fallacy] of Object.entries(RELEVANCE_FALLACIES)) {
    const indicatorMatches = fallacy.indicators.filter(i => lowerText.includes(i)).length;
    const confidence = indicatorMatches / fallacy.indicators.length;

    if (confidence >= PHI_INV_3) {
      detected.push({
        ...fallacy,
        key,
        category: 'relevance',
        confidence,
        matchedIndicators: fallacy.indicators.filter(i => lowerText.includes(i)),
      });
    }
  }

  return detected;
}

/**
 * Check for presumption fallacies (text-based)
 */
function checkPresumptionFallacies(text) {
  const detected = [];
  const lowerText = text.toLowerCase();

  for (const [key, fallacy] of Object.entries(PRESUMPTION_FALLACIES)) {
    const indicatorMatches = fallacy.indicators.filter(i => lowerText.includes(i)).length;
    const confidence = indicatorMatches / fallacy.indicators.length;

    if (confidence >= PHI_INV_3) {
      detected.push({
        ...fallacy,
        key,
        category: 'presumption',
        confidence,
        matchedIndicators: fallacy.indicators.filter(i => lowerText.includes(i)),
      });
    }
  }

  return detected;
}

/**
 * Check for ambiguity fallacies (text-based)
 */
function checkAmbiguityFallacies(text) {
  const detected = [];
  const lowerText = text.toLowerCase();

  for (const [key, fallacy] of Object.entries(AMBIGUITY_FALLACIES)) {
    const indicatorMatches = fallacy.indicators.filter(i => lowerText.includes(i)).length;
    const confidence = indicatorMatches / fallacy.indicators.length;

    if (confidence >= PHI_INV_2) {  // Higher threshold for ambiguity
      detected.push({
        ...fallacy,
        key,
        category: 'ambiguity',
        confidence,
        matchedIndicators: fallacy.indicators.filter(i => lowerText.includes(i)),
      });
    }
  }

  return detected;
}

/**
 * Detect a specific fallacy manually
 *
 * @param {string} fallacyKey - Fallacy key
 * @param {string} context - Context where detected
 * @returns {object} Detection record
 */
function detect(fallacyKey, context) {
  // Find fallacy in all categories
  const fallacy = FORMAL_FALLACIES[fallacyKey] ||
                RELEVANCE_FALLACIES[fallacyKey] ||
                PRESUMPTION_FALLACIES[fallacyKey] ||
                AMBIGUITY_FALLACIES[fallacyKey];

  if (!fallacy) {
    return { error: `Unknown fallacy: ${fallacyKey}` };
  }

  let category = 'formal';
  if (RELEVANCE_FALLACIES[fallacyKey]) category = 'relevance';
  if (PRESUMPTION_FALLACIES[fallacyKey]) category = 'presumption';
  if (AMBIGUITY_FALLACIES[fallacyKey]) category = 'ambiguity';

  const detection = {
    id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fallacy: fallacyKey,
    fallacyInfo: fallacy,
    category,
    categoryInfo: FALLACY_CATEGORIES[category],
    context,
    detectedAt: Date.now(),
    confirmed: false,
  };

  state.detections.push({ ...detection, detectedFallacies: [detection] });
  state.stats.fallaciesDetected++;
  if (category === 'formal') {
    state.stats.formalFallacies++;
  } else {
    state.stats.informalFallacies++;
  }

  // Track pattern
  if (!state.patterns[fallacyKey]) {
    state.patterns[fallacyKey] = 0;
  }
  state.patterns[fallacyKey]++;

  logHistory({
    type: 'fallacy_detected',
    fallacy: fallacyKey,
    category,
    context: context.slice(0, 100),
  });

  saveState();

  return {
    detection,
    name: fallacy.name,
    category,
    severity: Math.round(fallacy.severity * 100),
    correction: fallacy.correction,
    message: `*sniff* ${FALLACY_CATEGORIES[category].symbol} ${fallacy.name} detected`,
  };
}

/**
 * Confirm or reject a detection
 *
 * @param {string} detectionId - Detection ID
 * @param {boolean} confirmed - Whether fallacy was confirmed
 * @returns {object} Update result
 */
function confirmDetection(detectionId, confirmed) {
  const detection = state.detections.find(d => d.id === detectionId);
  if (!detection) {
    return { error: 'Detection not found' };
  }

  detection.confirmed = confirmed;
  detection.confirmedAt = Date.now();

  if (confirmed) {
    state.stats.confirmedFallacies++;
  } else {
    state.stats.falsePositives++;
  }

  saveState();

  return {
    detection,
    confirmed,
    message: confirmed
      ? '*nod* Fallacy confirmed'
      : '*head tilt* Detection marked as false positive',
  };
}

/**
 * Get fallacy statistics
 */
function getFallacyStats() {
  return Object.entries(state.patterns)
    .map(([key, count]) => {
      const fallacy = FORMAL_FALLACIES[key] ||
                      RELEVANCE_FALLACIES[key] ||
                      PRESUMPTION_FALLACIES[key] ||
                      AMBIGUITY_FALLACIES[key];
      return {
        key,
        name: fallacy?.name || key,
        count,
        severity: fallacy?.severity || 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * Get statistics
 */
function getStats() {
  const accuracy = state.stats.fallaciesDetected > 0
    ? state.stats.confirmedFallacies /
      (state.stats.confirmedFallacies + state.stats.falsePositives) || 0
    : 0;

  return {
    ...state.stats,
    totalDetections: state.detections.length,
    detectionAccuracy: Math.round(accuracy * 100),
    topFallacies: getFallacyStats().slice(0, 5),
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();

  let status = `↯ Fallacy Detector (Hamblin)\n`;
  status += `  Arguments analyzed: ${stats.argumentsAnalyzed}\n`;
  status += `  Fallacies detected: ${stats.fallaciesDetected}\n`;
  status += `  Formal/Informal: ${stats.formalFallacies}/${stats.informalFallacies}\n`;
  status += `  Detection accuracy: ${stats.detectionAccuracy}%\n`;

  if (stats.topFallacies.length > 0) {
    status += `  Common fallacies:\n`;
    for (const f of stats.topFallacies.slice(0, 3)) {
      status += `    ${f.name}: ${f.count}x\n`;
    }
  }

  return status;
}

module.exports = {
  init,
  analyze,
  detect,
  confirmDetection,
  getFallacyStats,
  getStats,
  formatStatus,
  FALLACY_CATEGORIES,
  FORMAL_FALLACIES,
  RELEVANCE_FALLACIES,
  PRESUMPTION_FALLACIES,
  AMBIGUITY_FALLACIES,
};
