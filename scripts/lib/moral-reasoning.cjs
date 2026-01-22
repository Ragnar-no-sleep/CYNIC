/**
 * Moral Reasoning Engine - CYNIC Philosophy Integration
 *
 * Implements ethical frameworks, dilemma analysis, and reflective
 * equilibrium following Rawls, Scanlon, and classical traditions.
 *
 * "Act only according to that maxim whereby you can at the same time
 *  will that it should become a universal law." - Kant
 *
 * @module moral-reasoning
 */

const fs = require('fs');
const path = require('path');

// φ-derived constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// Configuration
const STORAGE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.cynic',
  'moral-reasoning'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_CASES = 100;
const MAX_PRINCIPLES = 50;

/**
 * Ethical Frameworks
 * Major traditions in normative ethics
 */
const ETHICAL_FRAMEWORKS = {
  deontological: {
    name: 'Deontological Ethics',
    description: 'Duty-based: actions are right/wrong in themselves',
    philosopher: 'Kant',
    symbol: '⚖',
    weight: PHI_INV,
    keyTests: ['universalizability', 'humanity_as_end'],
    question: 'Can I will this as a universal law?',
  },
  consequentialist: {
    name: 'Consequentialist Ethics',
    description: 'Outcomes matter: maximize good consequences',
    philosopher: 'Mill/Bentham',
    symbol: '⟿',
    weight: PHI_INV,
    keyTests: ['utility_maximization', 'impartiality'],
    question: 'Does this produce the greatest good for the greatest number?',
  },
  virtue: {
    name: 'Virtue Ethics',
    description: 'Character-based: cultivate excellent traits',
    philosopher: 'Aristotle',
    symbol: '☆',
    weight: PHI_INV,
    keyTests: ['virtue_expression', 'eudaimonia'],
    question: 'What would a person of good character do?',
  },
  care: {
    name: 'Ethics of Care',
    description: 'Relationship-based: respond to particular needs',
    philosopher: 'Gilligan/Noddings',
    symbol: '♡',
    weight: PHI_INV_2,
    keyTests: ['responsiveness', 'relationship_maintenance'],
    question: 'How do I best care for those affected?',
  },
  contractualist: {
    name: 'Contractualism',
    description: 'Agreement-based: principles no one could reasonably reject',
    philosopher: 'Scanlon/Rawls',
    symbol: '☰',
    weight: PHI_INV,
    keyTests: ['reasonable_rejection', 'veil_of_ignorance'],
    question: 'Could this principle be reasonably rejected?',
  },
};

/**
 * Moral Virtues (Aristotelian)
 */
const VIRTUES = {
  courage: {
    name: 'Courage',
    description: 'Mean between cowardice and recklessness',
    domain: 'fear and confidence',
    deficiency: 'cowardice',
    excess: 'recklessness',
  },
  temperance: {
    name: 'Temperance',
    description: 'Mean in bodily pleasures',
    domain: 'pleasure',
    deficiency: 'insensibility',
    excess: 'self-indulgence',
  },
  justice: {
    name: 'Justice',
    description: 'Giving what is due',
    domain: 'distribution and exchange',
    deficiency: 'unfairness',
    excess: 'excessive punishment',
  },
  prudence: {
    name: 'Prudence',
    description: 'Practical wisdom',
    domain: 'deliberation',
    deficiency: 'thoughtlessness',
    excess: 'over-calculation',
  },
  honesty: {
    name: 'Honesty',
    description: 'Mean between deception and brutal candor',
    domain: 'truth-telling',
    deficiency: 'deception',
    excess: 'tactlessness',
  },
  generosity: {
    name: 'Generosity',
    description: 'Mean in giving and taking',
    domain: 'material goods',
    deficiency: 'stinginess',
    excess: 'prodigality',
  },
};

/**
 * Dilemma Types
 */
const DILEMMA_TYPES = {
  tragic: {
    name: 'Tragic Dilemma',
    description: 'All options involve moral wrongdoing',
    severity: 1.0,
    symbol: '⚡',
  },
  obligation_conflict: {
    name: 'Obligation Conflict',
    description: 'Two duties cannot both be fulfilled',
    severity: PHI_INV + PHI_INV_2,
    symbol: '⊕',
  },
  value_conflict: {
    name: 'Value Conflict',
    description: 'Important values in tension',
    severity: PHI_INV,
    symbol: '⚔',
  },
  framework_conflict: {
    name: 'Framework Conflict',
    description: 'Different ethical theories recommend different actions',
    severity: PHI_INV_2,
    symbol: '⟷',
  },
};

/**
 * Judgment Quality Markers
 */
const JUDGMENT_MARKERS = {
  considered: {
    name: 'Considered Judgment',
    description: 'Stable, reflective, not distorted by bias',
    weight: PHI_INV + PHI_INV_2,
  },
  intuitive: {
    name: 'Moral Intuition',
    description: 'Pre-theoretical moral response',
    weight: PHI_INV,
  },
  theoretical: {
    name: 'Theory-Derived',
    description: 'Derived from ethical principles',
    weight: PHI_INV,
  },
  revisable: {
    name: 'Revisable',
    description: 'Open to revision in light of reflection',
    weight: PHI_INV_2,
  },
};

// State
let state = {
  principles: {},       // Registered moral principles
  cases: [],            // Moral cases analyzed
  dilemmas: [],         // Identified dilemmas
  equilibria: [],       // Reflective equilibrium attempts
  stats: {
    principlesRegistered: 0,
    casesAnalyzed: 0,
    dilemmasIdentified: 0,
    equilibriaAttempted: 0,
  },
  lastUpdated: null,
};

/**
 * Initialize module
 */
function init() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...saved };
    }
  } catch (err) {
    console.error('Moral reasoning init error:', err.message);
  }
}

/**
 * Save state
 */
function saveState() {
  try {
    state.lastUpdated = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Moral reasoning save error:', err.message);
  }
}

/**
 * Log to history
 */
function logHistory(entry) {
  try {
    const record = {
      ...entry,
      timestamp: Date.now(),
    };
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(record) + '\n');
  } catch (err) {
    // Silent fail for history
  }
}

/**
 * Register a moral principle
 *
 * @param {string} content - The principle statement
 * @param {string} framework - Ethical framework
 * @param {object} config - Configuration
 * @returns {object} Registered principle
 */
function registerPrinciple(content, framework = 'deontological', config = {}) {
  if (Object.keys(state.principles).length >= MAX_PRINCIPLES) {
    return { error: 'Maximum principles reached' };
  }

  const fw = ETHICAL_FRAMEWORKS[framework] || ETHICAL_FRAMEWORKS.deontological;
  const id = `prin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const principle = {
    id,
    content,
    framework,
    frameworkInfo: fw,
    // Scope
    domain: config.domain || 'general',
    scope: config.scope || 'universal', // universal, local, prima_facie
    // Strength
    weight: fw.weight * (config.weight || 1.0),
    priority: config.priority || 0,
    // Status
    status: 'active',
    revisable: config.revisable !== false,
    // Source
    source: config.source || 'declared',
    registeredAt: Date.now(),
  };

  state.principles[id] = principle;
  state.stats.principlesRegistered++;

  logHistory({
    type: 'principle_registered',
    id,
    framework,
    content: content.slice(0, 50),
  });

  saveState();

  return {
    principle,
    message: `${fw.symbol} Principle registered: "${content.slice(0, 40)}..."`,
  };
}

/**
 * Analyze a moral case using multiple frameworks
 *
 * @param {string} description - Case description
 * @param {array} options - Available actions
 * @param {object} context - Contextual factors
 * @returns {object} Multi-framework analysis
 */
function analyzeCase(description, options, context = {}) {
  if (state.cases.length >= MAX_CASES) {
    state.cases = state.cases.slice(-80);
  }

  const id = `case-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Analyze under each framework
  const frameworkAnalyses = {};

  for (const [fwKey, fw] of Object.entries(ETHICAL_FRAMEWORKS)) {
    const analysis = analyzeUnderFramework(options, context, fwKey, fw);
    frameworkAnalyses[fwKey] = analysis;
  }

  // Check for framework conflict
  const recommendations = Object.values(frameworkAnalyses)
    .map(a => a.recommendation)
    .filter(Boolean);

  const uniqueRecs = [...new Set(recommendations)];
  const hasConflict = uniqueRecs.length > 1;

  // Find consensus recommendation if any
  const recCounts = {};
  for (const rec of recommendations) {
    recCounts[rec] = (recCounts[rec] || 0) + 1;
  }
  const consensusRec = Object.entries(recCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const moralCase = {
    id,
    description,
    options,
    context,
    frameworkAnalyses,
    hasConflict,
    consensusRecommendation: consensusRec ? consensusRec[0] : null,
    consensusStrength: consensusRec ? consensusRec[1] / recommendations.length : 0,
    analyzedAt: Date.now(),
  };

  state.cases.push(moralCase);
  state.stats.casesAnalyzed++;

  logHistory({
    type: 'case_analyzed',
    id,
    hasConflict,
    optionCount: options.length,
  });

  saveState();

  return {
    case: moralCase,
    hasConflict,
    message: hasConflict
      ? `⟷ Frameworks disagree - ${uniqueRecs.length} different recommendations`
      : `${ETHICAL_FRAMEWORKS[Object.keys(frameworkAnalyses)[0]].symbol} Frameworks agree: ${consensusRec[0]}`,
  };
}

/**
 * Analyze options under a specific framework
 */
function analyzeUnderFramework(options, context, fwKey, fw) {
  const scores = options.map(option => {
    let score = 0;
    const reasons = [];

    switch (fwKey) {
      case 'deontological':
        // Universalizability test
        if (context.universalizable?.[option]) {
          score += PHI_INV;
          reasons.push('Can be universalized');
        }
        // Humanity as end test
        if (context.respectsPersonhood?.[option]) {
          score += PHI_INV;
          reasons.push('Respects persons as ends');
        }
        if (context.usesMerely?.[option]) {
          score -= PHI_INV;
          reasons.push('Uses persons merely as means');
        }
        break;

      case 'consequentialist': {
        // Utility calculation
        const benefit = context.expectedBenefit?.[option] || 0;
        const harm = context.expectedHarm?.[option] || 0;
        score += (benefit - harm) * PHI_INV;
        if (benefit > harm) reasons.push(`Net positive utility: ${benefit - harm}`);
        else reasons.push(`Net negative utility: ${benefit - harm}`);
        break;
      }

      case 'virtue': {
        // Virtue expression
        const virtuesExpressed = context.virtuesExpressed?.[option] || [];
        const vicesExpressed = context.vicesExpressed?.[option] || [];
        score += virtuesExpressed.length * PHI_INV_2;
        score -= vicesExpressed.length * PHI_INV_2;
        if (virtuesExpressed.length > 0) {
          reasons.push(`Expresses: ${virtuesExpressed.join(', ')}`);
        }
        break;
      }

      case 'care':
        // Responsiveness to needs
        if (context.respondsToNeeds?.[option]) {
          score += PHI_INV;
          reasons.push('Responds to particular needs');
        }
        if (context.maintainsRelationships?.[option]) {
          score += PHI_INV_2;
          reasons.push('Maintains relationships');
        }
        break;

      case 'contractualist':
        // Reasonable rejection test
        if (context.couldBeRejected?.[option]) {
          score -= PHI_INV;
          reasons.push('Could be reasonably rejected');
        } else {
          score += PHI_INV;
          reasons.push('Could not be reasonably rejected');
        }
        break;
    }

    return { option, score, reasons };
  });

  // Find best option
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  return {
    framework: fwKey,
    frameworkInfo: fw,
    scores,
    recommendation: best.score > 0 ? best.option : null,
    confidence: Math.min(Math.abs(best.score), PHI_INV), // φ⁻¹ max
    reasoning: best.reasons,
  };
}

/**
 * Identify a moral dilemma
 *
 * @param {string} description - Dilemma description
 * @param {array} options - Options, each with moral costs
 * @returns {object} Dilemma analysis
 */
function identifyDilemma(description, options) {
  const id = `dil-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Analyze each option
  const analyzedOptions = options.map(opt => ({
    ...opt,
    moralCost: opt.moralCost || PHI_INV_2,
    violates: opt.violates || [],
    supports: opt.supports || [],
  }));

  // Determine dilemma type
  let dilemmaType;

  const allHaveCosts = analyzedOptions.every(o => o.moralCost > PHI_INV_3);
  const obligationsConflict = analyzedOptions.some(o =>
    o.violates.some(v => analyzedOptions.some(other =>
      other !== o && other.supports.includes(v)
    ))
  );

  if (allHaveCosts && analyzedOptions.every(o => o.moralCost > PHI_INV)) {
    dilemmaType = DILEMMA_TYPES.tragic;
  } else if (obligationsConflict) {
    dilemmaType = DILEMMA_TYPES.obligation_conflict;
  } else if (allHaveCosts) {
    dilemmaType = DILEMMA_TYPES.value_conflict;
  } else {
    dilemmaType = DILEMMA_TYPES.framework_conflict;
  }

  // Calculate residue (moral remainder)
  const minCost = Math.min(...analyzedOptions.map(o => o.moralCost));
  const hasResidue = minCost > PHI_INV_3;

  const dilemma = {
    id,
    description,
    options: analyzedOptions,
    type: dilemmaType.name,
    typeInfo: dilemmaType,
    isTragic: dilemmaType === DILEMMA_TYPES.tragic,
    hasResidue,
    residueNote: hasResidue
      ? 'Even the best choice leaves moral residue - feelings of regret are appropriate'
      : null,
    identifiedAt: Date.now(),
  };

  state.dilemmas.push(dilemma);
  if (state.dilemmas.length > 50) {
    state.dilemmas = state.dilemmas.slice(-40);
  }
  state.stats.dilemmasIdentified++;

  logHistory({
    type: 'dilemma_identified',
    id,
    dilemmaType: dilemmaType.name,
    optionCount: options.length,
  });

  saveState();

  return {
    dilemma,
    message: `${dilemmaType.symbol} ${dilemmaType.name}: ${description.slice(0, 40)}...`,
  };
}

/**
 * Attempt reflective equilibrium (Rawls)
 *
 * @param {array} judgments - Considered moral judgments
 * @param {array} principles - Moral principles to test
 * @returns {object} Equilibrium analysis
 */
function seekEquilibrium(judgments, principles) {
  const id = `eq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Check each judgment against each principle
  const coherenceMatrix = [];
  let totalCoherence = 0;
  let comparisons = 0;

  for (const judgment of judgments) {
    const row = {
      judgment: judgment.content,
      principleScores: {},
    };

    for (const principle of principles) {
      // Determine if judgment and principle cohere
      const coheres = judgment.supports?.includes(principle.id) ||
        principle.implies?.includes(judgment.content);
      const conflicts = judgment.conflicts?.includes(principle.id) ||
        principle.excludes?.includes(judgment.content);

      let score;
      if (coheres && !conflicts) {
        score = PHI_INV;
      } else if (conflicts && !coheres) {
        score = -PHI_INV;
      } else if (coheres && conflicts) {
        score = 0; // Tension
      } else {
        score = PHI_INV_3; // Neutral/independent
      }

      row.principleScores[principle.id || principle.content] = score;
      totalCoherence += score;
      comparisons++;
    }

    coherenceMatrix.push(row);
  }

  const avgCoherence = comparisons > 0 ? totalCoherence / comparisons : 0;

  // Identify tensions
  const tensions = [];
  for (const row of coherenceMatrix) {
    for (const [prinId, score] of Object.entries(row.principleScores)) {
      if (score < 0) {
        tensions.push({
          judgment: row.judgment,
          principle: prinId,
          severity: Math.abs(score),
        });
      }
    }
  }

  // Equilibrium status
  let status;
  if (avgCoherence > PHI_INV_2 && tensions.length === 0) {
    status = 'equilibrium';
  } else if (avgCoherence > 0 && tensions.length <= 2) {
    status = 'near_equilibrium';
  } else {
    status = 'disequilibrium';
  }

  const equilibrium = {
    id,
    judgmentCount: judgments.length,
    principleCount: principles.length,
    coherenceMatrix,
    avgCoherence,
    tensions,
    status,
    recommendations: tensions.map(t => ({
      option1: `Revise judgment: "${t.judgment.slice(0, 30)}..."`,
      option2: `Revise principle: "${t.principle}"`,
    })),
    attemptedAt: Date.now(),
  };

  state.equilibria.push(equilibrium);
  if (state.equilibria.length > 20) {
    state.equilibria = state.equilibria.slice(-15);
  }
  state.stats.equilibriaAttempted++;

  logHistory({
    type: 'equilibrium_attempted',
    id,
    status,
    coherence: avgCoherence,
  });

  saveState();

  const statusSymbol = status === 'equilibrium' ? '⚖' : status === 'near_equilibrium' ? '~' : '⚡';

  return {
    equilibrium,
    message: `${statusSymbol} ${status}: coherence ${(avgCoherence * 100).toFixed(0)}%, ${tensions.length} tensions`,
  };
}

/**
 * Apply virtue ethics analysis
 *
 * @param {string} action - Action to evaluate
 * @param {object} context - Context for evaluation
 * @returns {object} Virtue analysis
 */
function analyzeVirtue(action, context = {}) {
  const virtuesExpressed = [];
  const vicesExpressed = [];

  // Check each virtue
  for (const [virtueKey, virtue] of Object.entries(VIRTUES)) {
    // If context indicates this virtue is relevant
    if (context.domain === virtue.domain || context.virtues?.includes(virtueKey)) {
      // Determine if action expresses virtue, deficiency, or excess
      if (context.isDeficient?.[virtueKey]) {
        vicesExpressed.push({ type: 'deficiency', virtue: virtueKey, name: virtue.deficiency });
      } else if (context.isExcessive?.[virtueKey]) {
        vicesExpressed.push({ type: 'excess', virtue: virtueKey, name: virtue.excess });
      } else if (context.expresses?.[virtueKey]) {
        virtuesExpressed.push({ virtue: virtueKey, name: virtue.name });
      }
    }
  }

  // Calculate character score
  const characterScore = (virtuesExpressed.length * PHI_INV) - (vicesExpressed.length * PHI_INV);
  const normalized = Math.max(-1, Math.min(1, characterScore));

  return {
    action,
    virtuesExpressed,
    vicesExpressed,
    characterScore: normalized,
    assessment: normalized > PHI_INV_2 ? 'virtuous'
      : normalized < -PHI_INV_2 ? 'vicious'
        : 'morally neutral',
    message: `☆ ${action}: ${virtuesExpressed.length} virtues, ${vicesExpressed.length} vices`,
  };
}

/**
 * Get principle by ID
 */
function getPrinciple(principleId) {
  return state.principles[principleId] || null;
}

/**
 * Get all principles
 */
function getPrinciples() {
  return Object.values(state.principles);
}

/**
 * Get recent cases
 */
function getCases(limit = 10) {
  return state.cases.slice(-limit);
}

/**
 * Get dilemmas
 */
function getDilemmas() {
  return state.dilemmas;
}

/**
 * Format status for display
 */
function formatStatus() {
  const byFramework = {};
  for (const p of Object.values(state.principles)) {
    byFramework[p.framework] = (byFramework[p.framework] || 0) + 1;
  }
  const fwSummary = Object.entries(byFramework)
    .map(([k, v]) => `${ETHICAL_FRAMEWORKS[k]?.symbol || '?'}${v}`)
    .join(' ');

  const tragicCount = state.dilemmas.filter(d => d.isTragic).length;

  return `☆ Moral Reasoning (Rawls/Scanlon)
  Principles: ${Object.keys(state.principles).length} ${fwSummary ? `(${fwSummary})` : ''}
  Cases analyzed: ${state.stats.casesAnalyzed}
  Dilemmas: ${state.stats.dilemmasIdentified} (${tragicCount} tragic)
  Equilibria: ${state.stats.equilibriaAttempted} attempted`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    principleCount: Object.keys(state.principles).length,
    recentCases: state.cases.slice(-3),
    recentDilemmas: state.dilemmas.slice(-3),
  };
}

module.exports = {
  init,
  registerPrinciple,
  analyzeCase,
  identifyDilemma,
  seekEquilibrium,
  analyzeVirtue,
  getPrinciple,
  getPrinciples,
  getCases,
  getDilemmas,
  formatStatus,
  getStats,
  ETHICAL_FRAMEWORKS,
  VIRTUES,
  DILEMMA_TYPES,
  JUDGMENT_MARKERS,
};
