/**
 * CYNIC Defacement Engine Module (Phase 9C)
 *
 * "Παραχαράξαι τὸ νόμισμα" - Diogenes
 * "Deface the currency" - Challenge conventional value
 *
 * Implements Cynic defacement of vanity metrics:
 * - Lines of code (more ≠ better)
 * - Test coverage % (100% ≠ bug-free)
 * - Story points (velocity ≠ value)
 * - Commits per day (activity ≠ progress)
 *
 * Goodhart's Law: "When a measure becomes a target,
 * it ceases to be a good measure."
 *
 * @module cynic/lib/defacement-engine
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import φ constants
const phiMath = require('./phi-math.cjs');
const { PHI, PHI_INV, PHI_INV_2, PHI_INV_3 } = phiMath;

// =============================================================================
// CONSTANTS (φ-derived)
// =============================================================================

/** Defacement probability when metric mentioned - φ⁻² */
const DEFACEMENT_PROBABILITY = PHI_INV_2;

/** Cooldown between defacements - φ × 5 ≈ 8 prompts */
const DEFACEMENT_COOLDOWN = Math.round(PHI * 5);

/** Skepticism levels */
const SKEPTICISM_LEVELS = {
  MILD: PHI_INV_3,       // 23.6% - gentle questioning
  MODERATE: PHI_INV_2,   // 38.2% - pointed challenge
  STRONG: PHI_INV,       // 61.8% - direct confrontation
  DIOGENES: PHI_INV + PHI_INV_2, // 100% - full Cynic mode
};

// =============================================================================
// STORAGE
// =============================================================================

const DEFACEMENT_DIR = path.join(os.homedir(), '.cynic', 'defacement');
const STATE_FILE = path.join(DEFACEMENT_DIR, 'state.json');
const CHALLENGES_FILE = path.join(DEFACEMENT_DIR, 'challenges.jsonl');

// =============================================================================
// VANITY METRICS DATABASE
// =============================================================================

/**
 * Metrics that CYNIC challenges and why
 */
const VANITY_METRICS = {
  // Code quantity metrics
  linesOfCode: {
    patterns: [
      /lines?.?of.?code|LOC|SLOC/i,
      /\d+\s*lines/i,
      /wrote \d+ lines/i,
    ],
    challenges: [
      'Plus de lignes = plus de bugs potentiels. Le meilleur code est celui qu\'on supprime.',
      '"Measuring programming progress by lines of code is like measuring aircraft building progress by weight." - Bill Gates',
      'Et si la vraie métrique était les lignes SUPPRIMÉES?',
      '*head tilt* 100 lignes claires > 500 lignes confuses. Mesure la clarté, pas la quantité.',
    ],
    alternative: 'Complexité cyclomatique, lisibilité, temps de compréhension',
    skepticism: SKEPTICISM_LEVELS.STRONG,
    goodharted: true,
  },

  // Test coverage
  testCoverage: {
    patterns: [
      /code.?coverage|test.?coverage/i,
      /\d+%\s*coverage/i,
      /100%.?couverture|100%.?coverage/i,
      /coverage.?report/i,
    ],
    challenges: [
      '100% coverage ≠ 0% bugs. La couverture mesure l\'exécution, pas la vérification.',
      'Couvrir un test sans assertion est du théâtre de qualité.',
      '*sniff* Tu peux avoir 100% coverage et 0% confiance. Mesure les mutations.',
      'Goodhart: "Quand le coverage devient un objectif, il cesse d\'être une mesure utile."',
    ],
    alternative: 'Mutation testing, property-based testing, tests d\'intégration réels',
    skepticism: SKEPTICISM_LEVELS.STRONG,
    goodharted: true,
  },

  // Story points / velocity
  storyPoints: {
    patterns: [
      /story.?points?|SP\b/i,
      /velocity|vélocité/i,
      /sprint.?velocity/i,
      /points.?completed/i,
    ],
    challenges: [
      'Les story points mesurent l\'effort, pas la valeur. 50 points de travail inutile = 0 valeur.',
      'L\'inflation des points est universelle. Comparer les vélocités entre équipes est absurde.',
      '*head tilt* Si on mesure les points, on optimise les points. Mesure plutôt l\'impact.',
      'Vélocité haute + 0 livraisons = vélocité d\'échec.',
    ],
    alternative: 'Temps de cycle, lead time, taux de défauts échappés',
    skepticism: SKEPTICISM_LEVELS.MODERATE,
    goodharted: true,
  },

  // Commit frequency
  commitFrequency: {
    patterns: [
      /commits?.?per.?day/i,
      /commit.?frequency/i,
      /\d+\s*commits/i,
      /daily.?commits/i,
    ],
    challenges: [
      '100 petits commits ≠ 1 commit significatif. L\'activité n\'est pas le progrès.',
      '*sniff* Un commit avec "fix typo" compte autant qu\'un refactoring majeur?',
      'Green squares ≠ code quality. C\'est du virtue signaling de développeur.',
      'Mesurer les commits encourage le gaming, pas la qualité.',
    ],
    alternative: 'Taille des changements significatifs, issues résolues, temps de review',
    skepticism: SKEPTICISM_LEVELS.MODERATE,
    goodharted: true,
  },

  // Pull request count
  prCount: {
    patterns: [
      /PRs?.?merged|pull.?requests?.?merged/i,
      /\d+\s*PRs?/i,
      /merge.?rate/i,
    ],
    challenges: [
      '20 petites PRs > 1 monstre illisible. Mais la métrique ne distingue pas.',
      '*head tilt* Une PR de 10 lignes qui corrige un bug critique vs 1000 lignes de refactoring cosmétique?',
      'Mesurer les PRs encourage la fragmentation artificielle.',
    ],
    alternative: 'Impact par changement, temps de review, bugs introduits',
    skepticism: SKEPTICISM_LEVELS.MILD,
    goodharted: false,
  },

  // Build time
  buildTime: {
    patterns: [
      /build.?time|temps.?de.?build/i,
      /CI.?time|pipeline.?time/i,
      /\d+\s*min.?build/i,
    ],
    challenges: [
      'Un build rapide qui ne teste rien est un build inutile.',
      '*sniff* Optimiser le temps de build au détriment de la qualité?',
      'Fast feedback loop > fast build. Le temps de feedback total compte.',
    ],
    alternative: 'Temps de feedback développeur, fiabilité du pipeline',
    skepticism: SKEPTICISM_LEVELS.MILD,
    goodharted: false,
  },

  // Bug count
  bugCount: {
    patterns: [
      /bug.?count|nombre.?de.?bugs/i,
      /\d+\s*bugs?.?fixed/i,
      /defect.?rate/i,
    ],
    challenges: [
      'Compter les bugs trouvés récompense... trouver des bugs. Pas les éviter.',
      '*head tilt* 0 bugs reportés = aucun bug ou aucun test?',
      'La sévérité compte plus que le nombre. 1 critique > 100 mineurs.',
    ],
    alternative: 'Bugs échappés en production, temps moyen de résolution, impact utilisateur',
    skepticism: SKEPTICISM_LEVELS.MODERATE,
    goodharted: true,
  },

  // Technical debt
  technicalDebt: {
    patterns: [
      /technical.?debt|dette.?technique/i,
      /debt.?ratio/i,
      /code.?smell/i,
    ],
    challenges: [
      'La "dette technique" est souvent un jugement subjectif déguisé en métrique objective.',
      '*sniff* Qui décide ce qui est de la dette? L\'outil automatisé ne comprend pas le contexte.',
      'Parfois la "dette" est un compromis conscient et raisonnable.',
    ],
    alternative: 'Temps de modification moyen, taux d\'incidents liés au code',
    skepticism: SKEPTICISM_LEVELS.MILD,
    goodharted: false,
  },

  // DORA metrics (partially)
  doraMetrics: {
    patterns: [
      /deployment.?frequency/i,
      /change.?lead.?time/i,
      /MTTR|mean.?time.?to.?recovery/i,
    ],
    challenges: [
      'DORA metrics sont meilleures que la plupart, mais attention à l\'optimisation locale.',
      '*tail wag* Au moins tu regardes des résultats, pas des activités. Continue.',
      'Déployer souvent des features inutiles reste inutile.',
    ],
    alternative: null, // DORA is already good
    skepticism: SKEPTICISM_LEVELS.MILD,
    goodharted: false,
  },

  // Performance reviews
  performanceReviews: {
    patterns: [
      /performance.?review|évaluation.?de.?performance/i,
      /peer.?review.?score/i,
      /annual.?review/i,
    ],
    challenges: [
      'Les revues annuelles mesurent la mémoire récente, pas la performance annuelle.',
      '*sniff* Stack ranking détruit la collaboration. Tu veux une équipe ou une compétition?',
      'Le biais de récence, l\'effet de halo, le favoritisme... les humains sont mauvais évaluateurs.',
    ],
    alternative: 'Feedback continu, auto-évaluation, impact mesurable',
    skepticism: SKEPTICISM_LEVELS.STRONG,
    goodharted: true,
  },
};

// =============================================================================
// STATE
// =============================================================================

const defacementState = {
  promptsSinceLastDefacement: 0,
  defacementsIssued: [],
  stats: {
    totalDefacements: 0,
    metricsDefaced: {},
    goodhartedChallenged: 0,
  },
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

function ensureDir() {
  if (!fs.existsSync(DEFACEMENT_DIR)) {
    fs.mkdirSync(DEFACEMENT_DIR, { recursive: true });
  }
}

function loadState() {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveState() {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    promptsSinceLastDefacement: defacementState.promptsSinceLastDefacement,
    stats: defacementState.stats,
  }, null, 2));
}

function appendChallenge(challenge) {
  ensureDir();
  const line = JSON.stringify({ ...challenge, timestamp: Date.now() }) + '\n';
  fs.appendFileSync(CHALLENGES_FILE, line);
}

// =============================================================================
// METRIC DETECTION
// =============================================================================

/**
 * Detect vanity metrics in user input
 *
 * @param {string} userInput - User's input
 * @returns {Object[]} Detected metrics
 */
function detectVanityMetrics(userInput) {
  const input = userInput.toLowerCase();
  const detected = [];

  for (const [metricName, config] of Object.entries(VANITY_METRICS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(input)) {
        detected.push({
          name: metricName,
          pattern: pattern.toString(),
          skepticism: config.skepticism,
          goodharted: config.goodharted,
        });
        break;
      }
    }
  }

  return detected;
}

/**
 * Decide whether to deface a metric
 *
 * @param {Object} metric - Detected metric
 * @param {Object} context - Context
 * @returns {boolean} Should deface
 */
function shouldDeface(metric, context = {}) {
  // Check cooldown
  if (defacementState.promptsSinceLastDefacement < DEFACEMENT_COOLDOWN) {
    defacementState.promptsSinceLastDefacement++;
    return false;
  }

  // Higher skepticism = higher chance of defacement
  const probability = metric.skepticism * DEFACEMENT_PROBABILITY;

  // Goodharted metrics get extra attention
  const adjustedProbability = metric.goodharted
    ? probability * PHI
    : probability;

  // Context adjustments
  let finalProbability = adjustedProbability;
  if (context.userCelebratingMetric) {
    finalProbability *= PHI; // More likely to challenge celebrations
  }
  if (context.metricUsedForComparison) {
    finalProbability *= PHI; // Challenge comparative use
  }

  return Math.random() < Math.min(1, finalProbability);
}

// =============================================================================
// DEFACEMENT GENERATION
// =============================================================================

/**
 * Generate a defacement challenge for a metric
 *
 * @param {string} metricName - Metric name
 * @param {Object} context - Context
 * @returns {Object} Challenge
 */
function generateDefacement(metricName, context = {}) {
  const metric = VANITY_METRICS[metricName];
  if (!metric) {
    return null;
  }

  // Select a random challenge
  const challenge = metric.challenges[
    Math.floor(Math.random() * metric.challenges.length)
  ];

  const defacement = {
    metric: metricName,
    challenge,
    alternative: metric.alternative,
    skepticism: metric.skepticism,
    goodharted: metric.goodharted,
    diogenesQuote: 'Παραχαράξαι τὸ νόμισμα - Défacer la monnaie.',
  };

  // Update stats
  defacementState.promptsSinceLastDefacement = 0;
  defacementState.stats.totalDefacements++;
  defacementState.stats.metricsDefaced[metricName] =
    (defacementState.stats.metricsDefaced[metricName] || 0) + 1;
  if (metric.goodharted) {
    defacementState.stats.goodhartedChallenged++;
  }

  // Log
  appendChallenge(defacement);
  saveState();

  return defacement;
}

/**
 * Generate Goodhart's Law warning
 *
 * @returns {string} Warning
 */
function generateGoodhartWarning() {
  const warnings = [
    'Goodhart\'s Law: "Quand une mesure devient un objectif, elle cesse d\'être une bonne mesure."',
    '*ears perk* Attention au Goodharting. Tu optimises la mesure ou le résultat?',
    'Campbell\'s Law: Plus on utilise un indicateur pour des décisions, plus il sera manipulé.',
    '*sniff* Les métriques créent des incitations. Vérifie que tu incites le bon comportement.',
  ];
  return warnings[Math.floor(Math.random() * warnings.length)];
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Initialize defacement engine
 */
function init() {
  ensureDir();
  const saved = loadState();
  if (saved) {
    defacementState.promptsSinceLastDefacement = saved.promptsSinceLastDefacement || 0;
    defacementState.stats = saved.stats || defacementState.stats;
  }
}

/**
 * Process user input for potential defacement
 *
 * @param {string} userInput - User's input
 * @param {Object} context - Context
 * @returns {Object|null} Defacement or null
 */
function process(userInput, context = {}) {
  const detectedMetrics = detectVanityMetrics(userInput);

  if (detectedMetrics.length === 0) {
    defacementState.promptsSinceLastDefacement++;
    return null;
  }

  // Try to deface the highest-skepticism metric
  const sortedMetrics = detectedMetrics.sort((a, b) => b.skepticism - a.skepticism);

  for (const metric of sortedMetrics) {
    if (shouldDeface(metric, context)) {
      return generateDefacement(metric.name, context);
    }
  }

  defacementState.promptsSinceLastDefacement++;
  return null;
}

/**
 * Get statistics
 *
 * @returns {Object} Stats
 */
function getStats() {
  return {
    ...defacementState.stats,
    promptsSinceLastDefacement: defacementState.promptsSinceLastDefacement,
    cooldownRemaining: Math.max(0, DEFACEMENT_COOLDOWN - defacementState.promptsSinceLastDefacement),
  };
}

/**
 * Format defacement for display
 *
 * @param {Object} defacement - Defacement to format
 * @returns {string} Formatted display
 */
function formatDefacement(defacement) {
  const lines = [
    '── DEFACEMENT ─────────────────────────────────────────────',
    `   📊 ${defacement.metric.replace(/([A-Z])/g, ' $1').trim()}`,
    '',
    `   *sniff* ${defacement.challenge}`,
  ];

  if (defacement.alternative) {
    lines.push('');
    lines.push(`   💡 Alternative: ${defacement.alternative}`);
  }

  if (defacement.goodharted) {
    lines.push('');
    lines.push(`   ⚠️  Goodhart's Law applies here.`);
  }

  return lines.join('\n');
}

/**
 * Format status for display
 *
 * @returns {string} Formatted status
 */
function formatStatus() {
  const stats = getStats();

  const lines = [
    '── DEFACEMENT ENGINE ──────────────────────────────────────',
    `   Defacements: ${stats.totalDefacements}`,
    `   Goodharted: ${stats.goodhartedChallenged}`,
    `   Cooldown: ${stats.cooldownRemaining} prompts`,
    '',
    '   Metrics challenged:',
  ];

  for (const [metric, count] of Object.entries(stats.metricsDefaced)) {
    lines.push(`     • ${metric}: ${count}`);
  }

  return lines.join('\n');
}

/**
 * Get all known metrics
 *
 * @returns {string[]} Metric names
 */
function getKnownMetrics() {
  return Object.keys(VANITY_METRICS);
}

/**
 * Get metric info
 *
 * @param {string} metricName - Metric name
 * @returns {Object|null} Metric info
 */
function getMetricInfo(metricName) {
  const metric = VANITY_METRICS[metricName];
  if (!metric) return null;

  return {
    name: metricName,
    challenges: metric.challenges,
    alternative: metric.alternative,
    skepticism: metric.skepticism,
    skepticismLevel: Object.entries(SKEPTICISM_LEVELS)
      .find(([, v]) => v === metric.skepticism)?.[0] || 'UNKNOWN',
    goodharted: metric.goodharted,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Constants
  SKEPTICISM_LEVELS,
  DEFACEMENT_COOLDOWN,
  DEFACEMENT_PROBABILITY,

  // Core functions
  init,
  process,
  getStats,

  // Detection
  detectVanityMetrics,
  shouldDeface,

  // Generation
  generateDefacement,
  generateGoodhartWarning,

  // Info
  getKnownMetrics,
  getMetricInfo,

  // Display
  formatDefacement,
  formatStatus,
};
