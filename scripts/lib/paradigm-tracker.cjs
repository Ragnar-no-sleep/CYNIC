/**
 * CYNIC Paradigm Tracker
 *
 * "Scientific revolutions and research programmes"
 *
 * Philosophical foundations:
 * - Kuhn: Paradigms, normal science, revolutions
 * - Lakatos: Research programmes, hard core, protective belt
 * - Feyerabend: Methodological anarchism
 * - Laudan: Problem-solving traditions
 *
 * φ guides all ratios: 61.8% confidence max
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─────────────────────────────────────────────────────────────
// φ CONSTANTS
// ─────────────────────────────────────────────────────────────

const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;      // 61.8% - max confidence
const PHI_INV_2 = 0.381966011250105;    // 38.2% - uncertainty threshold
const PHI_INV_3 = 0.236067977499790;    // 23.6% - minimum threshold

// ─────────────────────────────────────────────────────────────
// KUHNIAN PHASES
// ─────────────────────────────────────────────────────────────

const SCIENCE_PHASES = {
  pre_paradigm: {
    name: 'Pre-Paradigm',
    description: 'No dominant framework, competing schools',
    characteristics: ['Disagreement on fundamentals', 'No consensus methods', 'Foundational debates'],
    stability: 'low'
  },
  normal_science: {
    name: 'Normal Science',
    description: 'Puzzle-solving within accepted paradigm',
    characteristics: ['Paradigm accepted', 'Puzzle-solving', 'Articulation of paradigm'],
    stability: 'high'
  },
  crisis: {
    name: 'Crisis',
    description: 'Accumulating anomalies threaten paradigm',
    characteristics: ['Proliferating anomalies', 'Loosening of rules', 'Philosophical debates'],
    stability: 'medium'
  },
  revolution: {
    name: 'Scientific Revolution',
    description: 'Paradigm shift in progress',
    characteristics: ['Competing paradigms', 'Incommensurability', 'Gestalt shift'],
    stability: 'low'
  },
  post_revolution: {
    name: 'Post-Revolution',
    description: 'New paradigm consolidating',
    characteristics: ['New textbooks', 'History rewritten', 'New normal science'],
    stability: 'medium'
  }
};

// ─────────────────────────────────────────────────────────────
// PARADIGM COMPONENTS (Kuhn)
// ─────────────────────────────────────────────────────────────

const PARADIGM_COMPONENTS = {
  symbolic_generalizations: {
    name: 'Symbolic Generalizations',
    description: 'Formal/mathematical expressions',
    weight: PHI_INV
  },
  metaphysical_models: {
    name: 'Metaphysical Models',
    description: 'Ontological commitments about what exists',
    weight: PHI_INV_2
  },
  values: {
    name: 'Values',
    description: 'Accuracy, simplicity, scope, fruitfulness',
    weight: PHI_INV_2
  },
  exemplars: {
    name: 'Exemplars',
    description: 'Concrete problem-solutions that serve as models',
    weight: PHI_INV
  }
};

// ─────────────────────────────────────────────────────────────
// LAKATOS: RESEARCH PROGRAMME COMPONENTS
// ─────────────────────────────────────────────────────────────

const PROGRAMME_COMPONENTS = {
  hard_core: {
    name: 'Hard Core',
    description: 'Irrefutable central assumptions',
    mutable: false,
    weight: PHI_INV + PHI_INV_3
  },
  protective_belt: {
    name: 'Protective Belt',
    description: 'Auxiliary hypotheses that absorb anomalies',
    mutable: true,
    weight: PHI_INV_2
  },
  positive_heuristic: {
    name: 'Positive Heuristic',
    description: 'Guides research direction',
    mutable: true,
    weight: PHI_INV_2
  },
  negative_heuristic: {
    name: 'Negative Heuristic',
    description: 'Prohibits questioning hard core',
    mutable: false,
    weight: PHI_INV_3
  }
};

// ─────────────────────────────────────────────────────────────
// PROGRAMME STATUS (Lakatos)
// ─────────────────────────────────────────────────────────────

const PROGRAMME_STATUS = {
  progressive: {
    name: 'Theoretically Progressive',
    description: 'Predicting novel facts',
    symbol: '↑↑',
    score: PHI_INV
  },
  empirically_progressive: {
    name: 'Empirically Progressive',
    description: 'Novel predictions confirmed',
    symbol: '↑',
    score: PHI_INV
  },
  stagnant: {
    name: 'Stagnant',
    description: 'No new predictions',
    symbol: '→',
    score: PHI_INV_2
  },
  degenerating: {
    name: 'Degenerating',
    description: 'Only explaining past anomalies ad hoc',
    symbol: '↓',
    score: PHI_INV_3
  }
};

// ─────────────────────────────────────────────────────────────
// INCOMMENSURABILITY TYPES
// ─────────────────────────────────────────────────────────────

const INCOMMENSURABILITY_TYPES = {
  semantic: {
    name: 'Semantic Incommensurability',
    description: 'Terms change meaning across paradigms',
    severity: PHI_INV
  },
  methodological: {
    name: 'Methodological Incommensurability',
    description: 'Different standards of evaluation',
    severity: PHI_INV_2
  },
  observational: {
    name: 'Observational Incommensurability',
    description: 'Different observations/data recognized',
    severity: PHI_INV_2
  },
  problem: {
    name: 'Problem Incommensurability',
    description: 'Different problems considered important',
    severity: PHI_INV_3
  }
};

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────

const state = {
  paradigms: new Map(),           // Active paradigms
  programmes: new Map(),          // Research programmes
  domains: new Map(),             // Scientific domains
  shifts: [],                     // Paradigm shifts
  crises: [],                     // Crisis events
  puzzles: [],                    // Normal science puzzles
  stats: {
    paradigmsRegistered: 0,
    programmesRegistered: 0,
    shiftsRecorded: 0,
    crisesIdentified: 0,
    puzzlesSolved: 0
  }
};

// Storage
const STORAGE_DIR = path.join(os.homedir(), '.cynic', 'paradigm-tracker');
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

// ─────────────────────────────────────────────────────────────
// PARADIGM FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Register a paradigm
 */
function registerParadigm(id, spec) {
  const paradigm = {
    id,
    name: spec.name || id,
    domain: spec.domain || 'general',

    // Kuhnian components
    symbolicGeneralizations: spec.symbolicGeneralizations || [],
    metaphysicalModels: spec.metaphysicalModels || [],
    values: spec.values || Object.keys(PARADIGM_COMPONENTS.values),
    exemplars: spec.exemplars || [],

    // Status
    phase: spec.phase || 'normal_science',
    phaseInfo: SCIENCE_PHASES[spec.phase || 'normal_science'],

    // Anomalies
    anomalies: [],
    anomalyThreshold: spec.anomalyThreshold || 5, // Triggers crisis

    // Puzzles
    puzzlesSolved: 0,
    puzzlesUnsolved: [],

    // Community
    practitioners: spec.practitioners || 0,
    dominance: Math.min(spec.dominance || PHI_INV_2, PHI_INV),

    created: Date.now()
  };

  state.paradigms.set(id, paradigm);
  state.stats.paradigmsRegistered++;

  // Register domain if not exists
  if (!state.domains.has(paradigm.domain)) {
    state.domains.set(paradigm.domain, {
      name: paradigm.domain,
      currentParadigm: id,
      history: [id],
      phase: paradigm.phase
    });
  }

  appendHistory({
    type: 'paradigm_registered',
    paradigmId: id,
    domain: paradigm.domain,
    timestamp: Date.now()
  });

  return paradigm;
}

/**
 * Record puzzle-solving (normal science)
 */
function solvePuzzle(paradigmId, puzzleSpec) {
  const paradigm = state.paradigms.get(paradigmId);
  if (!paradigm) return null;

  const puzzle = {
    id: `puz_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    paradigmId,
    description: puzzleSpec.description,

    // Was it solved within paradigm?
    solved: puzzleSpec.solved !== false,
    solution: puzzleSpec.solution,

    // Impact
    articulatesParadigm: puzzleSpec.articulatesParadigm || false,
    extendsScope: puzzleSpec.extendsScope || false,

    timestamp: Date.now()
  };

  if (puzzle.solved) {
    paradigm.puzzlesSolved++;
    state.stats.puzzlesSolved++;

    // Remove from unsolved if present
    const idx = paradigm.puzzlesUnsolved.findIndex(
      p => p.description === puzzle.description
    );
    if (idx !== -1) {
      paradigm.puzzlesUnsolved.splice(idx, 1);
    }
  } else {
    paradigm.puzzlesUnsolved.push(puzzle);
  }

  state.puzzles.push(puzzle);

  return puzzle;
}

/**
 * Record an anomaly
 */
function recordAnomaly(paradigmId, anomalySpec) {
  const paradigm = state.paradigms.get(paradigmId);
  if (!paradigm) return null;

  const anomaly = {
    id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    paradigmId,
    description: anomalySpec.description,
    severity: Math.min(anomalySpec.severity || PHI_INV_2, PHI_INV),

    // Status
    resolved: false,
    resolution: null,

    // Kuhnian assessment
    threatLevel: anomalySpec.severity >= PHI_INV
      ? 'crisis-inducing'
      : anomalySpec.severity >= PHI_INV_2
        ? 'persistent'
        : 'minor',

    timestamp: Date.now()
  };

  paradigm.anomalies.push(anomaly);

  // Check for crisis
  const unresolvedSevere = paradigm.anomalies.filter(
    a => !a.resolved && a.severity >= PHI_INV_2
  ).length;

  if (unresolvedSevere >= paradigm.anomalyThreshold) {
    triggerCrisis(paradigmId, {
      reason: 'Anomaly accumulation',
      anomalyCount: unresolvedSevere
    });
  }

  appendHistory({
    type: 'anomaly_recorded',
    paradigmId,
    anomaly,
    timestamp: Date.now()
  });

  return anomaly;
}

/**
 * Trigger a crisis
 */
function triggerCrisis(paradigmId, reason) {
  const paradigm = state.paradigms.get(paradigmId);
  if (!paradigm) return null;

  const crisis = {
    id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    paradigmId,
    reason,

    startedAt: Date.now(),
    resolved: false,
    resolution: null,

    // What's happening
    symptoms: [
      'Proliferating ad hoc modifications',
      'Philosophical debates about foundations',
      'Exploration of alternatives',
      'Loosening of methodological rules'
    ],

    competingParadigms: []
  };

  paradigm.phase = 'crisis';
  paradigm.phaseInfo = SCIENCE_PHASES.crisis;

  state.crises.push(crisis);
  state.stats.crisesIdentified++;

  // Update domain phase
  const domain = state.domains.get(paradigm.domain);
  if (domain) {
    domain.phase = 'crisis';
  }

  appendHistory({
    type: 'crisis_triggered',
    paradigmId,
    crisis,
    timestamp: Date.now()
  });

  return crisis;
}

/**
 * Record a paradigm shift (scientific revolution)
 */
function recordParadigmShift(oldParadigmId, newParadigmId, shiftSpec) {
  const oldParadigm = state.paradigms.get(oldParadigmId);
  const newParadigm = state.paradigms.get(newParadigmId);

  if (!oldParadigm || !newParadigm) return null;

  const shift = {
    id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    oldParadigm: oldParadigmId,
    newParadigm: newParadigmId,
    domain: oldParadigm.domain,

    // Kuhnian analysis
    incommensurabilities: shiftSpec.incommensurabilities || [],
    gestaltShift: shiftSpec.gestaltShift || 'Not specified',

    // What changes
    conceptsChanged: shiftSpec.conceptsChanged || [],
    problemsRedefined: shiftSpec.problemsRedefined || [],
    methodsChanged: shiftSpec.methodsChanged || [],

    // Historical
    revolutionaryPeriod: {
      start: shiftSpec.startDate || Date.now(),
      end: shiftSpec.endDate || null
    },

    timestamp: Date.now()
  };

  // Update phases
  oldParadigm.phase = 'superseded';
  newParadigm.phase = 'post_revolution';
  newParadigm.phaseInfo = SCIENCE_PHASES.post_revolution;

  // Update domain
  const domain = state.domains.get(oldParadigm.domain);
  if (domain) {
    domain.currentParadigm = newParadigmId;
    domain.history.push(newParadigmId);
    domain.phase = 'post_revolution';
  }

  state.shifts.push(shift);
  state.stats.shiftsRecorded++;

  appendHistory({
    type: 'paradigm_shift',
    shift,
    timestamp: Date.now()
  });

  return shift;
}

/**
 * Assess incommensurability between paradigms
 */
function assessIncommensurability(paradigm1Id, paradigm2Id) {
  const p1 = state.paradigms.get(paradigm1Id);
  const p2 = state.paradigms.get(paradigm2Id);

  if (!p1 || !p2) return null;

  const assessment = {
    paradigms: [paradigm1Id, paradigm2Id],
    incommensurabilities: [],
    overallSeverity: 0,
    canCompare: true
  };

  // Check semantic
  const sharedTerms = p1.symbolicGeneralizations.filter(
    t => p2.symbolicGeneralizations.includes(t)
  );
  if (sharedTerms.length < p1.symbolicGeneralizations.length * PHI_INV_2) {
    assessment.incommensurabilities.push({
      type: 'semantic',
      typeInfo: INCOMMENSURABILITY_TYPES.semantic,
      description: 'Significant terminological differences'
    });
    assessment.overallSeverity += INCOMMENSURABILITY_TYPES.semantic.severity;
  }

  // Check methodological
  const sharedValues = p1.values.filter(v => p2.values.includes(v));
  if (sharedValues.length < p1.values.length * PHI_INV_2) {
    assessment.incommensurabilities.push({
      type: 'methodological',
      typeInfo: INCOMMENSURABILITY_TYPES.methodological,
      description: 'Different evaluative standards'
    });
    assessment.overallSeverity += INCOMMENSURABILITY_TYPES.methodological.severity;
  }

  // Check exemplars
  const sharedExemplars = p1.exemplars.filter(e => p2.exemplars.includes(e));
  if (sharedExemplars.length === 0 && p1.exemplars.length > 0 && p2.exemplars.length > 0) {
    assessment.incommensurabilities.push({
      type: 'problem',
      typeInfo: INCOMMENSURABILITY_TYPES.problem,
      description: 'No shared exemplar problems'
    });
    assessment.overallSeverity += INCOMMENSURABILITY_TYPES.problem.severity;
  }

  // Normalize severity
  assessment.overallSeverity = Math.min(assessment.overallSeverity, PHI_INV);

  // Can we compare at all?
  assessment.canCompare = assessment.overallSeverity < PHI_INV;
  assessment.kuhnianVerdict = assessment.canCompare
    ? 'Partial commensurability allows comparison'
    : 'Strong incommensurability - no neutral comparison possible';

  return assessment;
}

// ─────────────────────────────────────────────────────────────
// RESEARCH PROGRAMME FUNCTIONS (Lakatos)
// ─────────────────────────────────────────────────────────────

/**
 * Register a research programme
 */
function registerProgramme(id, spec) {
  const programme = {
    id,
    name: spec.name || id,
    domain: spec.domain || 'general',

    // Lakatosian components
    hardCore: spec.hardCore || [],
    protectiveBelt: spec.protectiveBelt || [],
    positiveHeuristic: spec.positiveHeuristic || [],
    negativeHeuristic: spec.negativeHeuristic || [],

    // Status
    status: 'progressive',
    statusInfo: PROGRAMME_STATUS.progressive,

    // Tracking
    novelPredictions: [],
    confirmedNovelPredictions: [],
    adHocModifications: [],

    // History
    beltModifications: [],

    created: Date.now()
  };

  state.programmes.set(id, programme);
  state.stats.programmesRegistered++;

  appendHistory({
    type: 'programme_registered',
    programmeId: id,
    timestamp: Date.now()
  });

  return programme;
}

/**
 * Make a novel prediction
 */
function makeNovelPrediction(programmeId, prediction) {
  const programme = state.programmes.get(programmeId);
  if (!programme) return null;

  const pred = {
    id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    content: prediction.content,
    novel: true, // Must be novel by definition
    confirmed: null,
    timestamp: Date.now()
  };

  programme.novelPredictions.push(pred);

  return pred;
}

/**
 * Confirm or refute a prediction
 */
function confirmPrediction(programmeId, predictionId, confirmed) {
  const programme = state.programmes.get(programmeId);
  if (!programme) return null;

  const pred = programme.novelPredictions.find(p => p.id === predictionId);
  if (!pred) return null;

  pred.confirmed = confirmed;
  pred.confirmedAt = Date.now();

  if (confirmed) {
    programme.confirmedNovelPredictions.push(pred);
  }

  // Reassess status
  assessProgrammeStatus(programmeId);

  return pred;
}

/**
 * Modify protective belt
 */
function modifyProtectiveBelt(programmeId, modification) {
  const programme = state.programmes.get(programmeId);
  if (!programme) return null;

  const mod = {
    id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: modification.type, // 'add', 'remove', 'modify'
    hypothesis: modification.hypothesis,
    reason: modification.reason,
    adHoc: modification.adHoc || false,
    timestamp: Date.now()
  };

  programme.beltModifications.push(mod);

  if (modification.type === 'add') {
    programme.protectiveBelt.push(modification.hypothesis);
  } else if (modification.type === 'remove') {
    const idx = programme.protectiveBelt.indexOf(modification.hypothesis);
    if (idx !== -1) programme.protectiveBelt.splice(idx, 1);
  }

  if (mod.adHoc) {
    programme.adHocModifications.push(mod);
  }

  // Reassess status
  assessProgrammeStatus(programmeId);

  return mod;
}

/**
 * Assess programme status (progressive vs degenerating)
 */
function assessProgrammeStatus(programmeId) {
  const programme = state.programmes.get(programmeId);
  if (!programme) return null;

  const novelCount = programme.novelPredictions.length;
  const confirmedCount = programme.confirmedNovelPredictions.length;
  const adHocCount = programme.adHocModifications.length;

  let status = 'stagnant';

  // Progressive if making and confirming novel predictions
  if (novelCount > 0 && confirmedCount / novelCount >= PHI_INV_2) {
    status = 'empirically_progressive';
  } else if (novelCount > adHocCount) {
    status = 'progressive';
  }

  // Degenerating if mostly ad hoc
  if (adHocCount > novelCount && adHocCount >= 3) {
    status = 'degenerating';
  }

  programme.status = status;
  programme.statusInfo = PROGRAMME_STATUS[status];

  return {
    programmeId,
    status,
    statusInfo: programme.statusInfo,
    metrics: {
      novelPredictions: novelCount,
      confirmedPredictions: confirmedCount,
      adHocModifications: adHocCount
    },
    lakatosVerdict: status === 'degenerating'
      ? 'Programme is degenerating - consider alternatives'
      : status === 'empirically_progressive'
        ? 'Programme is empirically progressive - pursue it'
        : 'Programme status is neutral',
    confidence: PHI_INV
  };
}

/**
 * Compare two research programmes
 */
function compareProgrammes(prog1Id, prog2Id) {
  const p1 = state.programmes.get(prog1Id);
  const p2 = state.programmes.get(prog2Id);

  if (!p1 || !p2) return null;

  const status1 = assessProgrammeStatus(prog1Id);
  const status2 = assessProgrammeStatus(prog2Id);

  const comparison = {
    programmes: [prog1Id, prog2Id],
    statuses: {
      [prog1Id]: status1,
      [prog2Id]: status2
    },

    // Progressiveness comparison
    progressivenessRatio: null,
    winner: null,

    // Lakatos's advice
    advice: null,

    confidence: PHI_INV_2
  };

  // Calculate progressiveness scores
  const score1 = status1.metrics.confirmedPredictions - status1.metrics.adHocModifications * 0.5;
  const score2 = status2.metrics.confirmedPredictions - status2.metrics.adHocModifications * 0.5;

  comparison.progressivenessRatio = score2 !== 0 ? score1 / score2 : score1 > 0 ? Infinity : 0;

  if (score1 > score2 + 1) {
    comparison.winner = prog1Id;
    comparison.advice = `${prog1Id} is more progressive - rational to pursue`;
  } else if (score2 > score1 + 1) {
    comparison.winner = prog2Id;
    comparison.advice = `${prog2Id} is more progressive - rational to pursue`;
  } else {
    comparison.winner = 'undetermined';
    comparison.advice = 'Programmes are roughly equal - methodological tolerance advised';
  }

  return comparison;
}

// ─────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function saveState() {
  ensureStorageDir();

  const serializable = {
    paradigms: Array.from(state.paradigms.entries()),
    programmes: Array.from(state.programmes.entries()),
    domains: Array.from(state.domains.entries()),
    shifts: state.shifts.slice(-20),
    crises: state.crises.slice(-20),
    puzzles: state.puzzles.slice(-50),
    stats: state.stats
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(serializable, null, 2));
}

function loadState() {
  ensureStorageDir();

  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state.paradigms = new Map(data.paradigms || []);
      state.programmes = new Map(data.programmes || []);
      state.domains = new Map(data.domains || []);
      state.shifts = data.shifts || [];
      state.crises = data.crises || [];
      state.puzzles = data.puzzles || [];
      state.stats = data.stats || state.stats;
    } catch (e) {
      console.error('Failed to load paradigm tracker state:', e.message);
    }
  }
}

function appendHistory(entry) {
  ensureStorageDir();
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');
}

// ─────────────────────────────────────────────────────────────
// FORMATTING
// ─────────────────────────────────────────────────────────────

function formatStatus() {
  const lines = [
    '── PARADIGM TRACKER ───────────────────────────────────────',
    ''
  ];

  lines.push(`   Paradigms: ${state.paradigms.size} | Programmes: ${state.programmes.size}`);
  lines.push(`   Shifts: ${state.stats.shiftsRecorded} | Crises: ${state.stats.crisesIdentified}`);
  lines.push(`   Puzzles solved: ${state.stats.puzzlesSolved}`);
  lines.push('');

  // Current domains
  if (state.domains.size > 0) {
    lines.push('   Domains:');
    for (const [name, domain] of state.domains) {
      const phase = SCIENCE_PHASES[domain.phase]?.name || domain.phase;
      lines.push(`   └─ ${name}: ${domain.currentParadigm} (${phase})`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function getStats() {
  return {
    ...state.stats,
    paradigmCount: state.paradigms.size,
    programmeCount: state.programmes.size,
    domainCount: state.domains.size,
    activeCrises: state.crises.filter(c => !c.resolved).length
  };
}

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

function init() {
  loadState();

  // Auto-save periodically
  setInterval(() => saveState(), 60000);

  return {
    initialized: true,
    paradigms: state.paradigms.size,
    programmes: state.programmes.size
  };
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3,

  // Type definitions
  SCIENCE_PHASES,
  PARADIGM_COMPONENTS,
  PROGRAMME_COMPONENTS,
  PROGRAMME_STATUS,
  INCOMMENSURABILITY_TYPES,

  // Paradigm functions
  registerParadigm,
  solvePuzzle,
  recordAnomaly,
  triggerCrisis,
  recordParadigmShift,
  assessIncommensurability,

  // Programme functions (Lakatos)
  registerProgramme,
  makeNovelPrediction,
  confirmPrediction,
  modifyProtectiveBelt,
  assessProgrammeStatus,
  compareProgrammes,

  // State access
  getParadigm: (id) => state.paradigms.get(id),
  getProgramme: (id) => state.programmes.get(id),
  getDomain: (name) => state.domains.get(name),
  getShifts: () => [...state.shifts],
  getCrises: () => [...state.crises],

  // Persistence
  saveState,
  loadState,

  // Formatting
  formatStatus,
  getStats,
  init
};
