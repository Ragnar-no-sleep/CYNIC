/**
 * Dog Capability Matrix - What Each Dog Can Do
 *
 * Maps dogs (Sefirot) to their capabilities, strengths, and appropriate tasks.
 * Used by IntelligentRouter to match tasks to the best dog.
 *
 * "Each dog has its scent" - κυνικός
 *
 * @module @cynic/node/routing/dog-capabilities
 */

'use strict';

import { TaskType, ComplexityLevel, RiskLevel } from './task-descriptor.js';

// φ constants for affinity weights
const PHI_INV = 0.618033988749895;    // Strong affinity
const PHI_INV_2 = 0.381966011250105;  // Moderate affinity
const PHI_INV_3 = 0.236067977499790;  // Weak affinity

/**
 * Dog identifiers (matching Sefirot)
 */
export const DogId = Object.freeze({
  CYNIC: 'cynic',           // Keter - Crown, synthesis
  ANALYST: 'analyst',       // Binah - Understanding, analysis
  SCHOLAR: 'scholar',       // Daat - Knowledge, research
  SAGE: 'sage',             // Chochmah - Wisdom, insight
  GUARDIAN: 'guardian',     // Gevurah - Judgment, security
  ORACLE: 'oracle',         // Tiferet - Beauty, balance
  ARCHITECT: 'architect',   // Chesed - Mercy, design
  DEPLOYER: 'deployer',     // Hod - Glory, operations
  JANITOR: 'janitor',       // Yesod - Foundation, cleanup
  SCOUT: 'scout',           // Netzach - Victory, exploration
  CARTOGRAPHER: 'cartographer', // Malkhut - Kingdom, mapping
});

/**
 * Dog capability definitions
 * Each dog has:
 * - taskAffinities: TaskType → strength (0-1)
 * - complexityRange: [min, max] complexity it handles well
 * - riskTolerance: max risk level it can handle
 * - specialties: specific capabilities
 * - model: preferred LLM model tier
 */
export const DOG_CAPABILITIES = Object.freeze({
  [DogId.CYNIC]: {
    name: 'CYNIC',
    sefira: 'Keter',
    emoji: '🧠',
    description: 'Crown consciousness - synthesis and final decisions',
    taskAffinities: {
      [TaskType.PLANNING]: PHI_INV,
      [TaskType.ARCHITECTURE]: PHI_INV,
      [TaskType.ANALYSIS]: PHI_INV_2,
    },
    complexityRange: [ComplexityLevel.COMPLEX, ComplexityLevel.CRITICAL],
    riskTolerance: RiskLevel.CRITICAL,
    specialties: ['synthesis', 'final-decision', 'escalation', 'consensus'],
    model: 'opus',
    canBlock: true,
    canEscalate: false, // Already at top
  },

  [DogId.ANALYST]: {
    name: 'Analyst',
    sefira: 'Binah',
    emoji: '📊',
    description: 'Understanding - deep analysis and pattern recognition',
    taskAffinities: {
      [TaskType.ANALYSIS]: PHI_INV,
      [TaskType.PROFILING]: PHI_INV,
      [TaskType.CODE_REVIEW]: PHI_INV_2,
      [TaskType.OPTIMIZATION]: PHI_INV_2,
      [TaskType.RESEARCH]: PHI_INV_3,
    },
    complexityRange: [ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX],
    riskTolerance: RiskLevel.LOW,
    specialties: ['pattern-detection', 'metrics', 'breakdown', 'profiling'],
    model: 'sonnet',
    canBlock: false,
    canEscalate: true,
  },

  [DogId.SCHOLAR]: {
    name: 'Scholar',
    sefira: 'Daat',
    emoji: '📚',
    description: 'Knowledge - research and documentation',
    taskAffinities: {
      [TaskType.RESEARCH]: PHI_INV,
      [TaskType.DOCUMENTATION]: PHI_INV,
      [TaskType.QUESTION]: PHI_INV,
      [TaskType.EXPLORATION]: PHI_INV_2,
    },
    complexityRange: [ComplexityLevel.TRIVIAL, ComplexityLevel.MODERATE],
    riskTolerance: RiskLevel.NONE,
    specialties: ['documentation', 'research', 'explanation', 'learning'],
    model: 'sonnet',
    canBlock: false,
    canEscalate: true,
  },

  [DogId.SAGE]: {
    name: 'Sage',
    sefira: 'Chochmah',
    emoji: '🦉',
    description: 'Wisdom - insight and strategic thinking',
    taskAffinities: {
      [TaskType.PLANNING]: PHI_INV,
      [TaskType.ARCHITECTURE]: PHI_INV_2,
      [TaskType.ANALYSIS]: PHI_INV_2,
      [TaskType.QUESTION]: PHI_INV_2,
    },
    complexityRange: [ComplexityLevel.MODERATE, ComplexityLevel.CRITICAL],
    riskTolerance: RiskLevel.MEDIUM,
    specialties: ['strategy', 'wisdom', 'insight', 'philosophy'],
    model: 'opus',
    canBlock: false,
    canEscalate: true,
  },

  [DogId.GUARDIAN]: {
    name: 'Guardian',
    sefira: 'Gevurah',
    emoji: '🛡️',
    description: 'Judgment - security and protection',
    taskAffinities: {
      [TaskType.SECURITY_AUDIT]: PHI_INV,
      [TaskType.SECURITY_FIX]: PHI_INV,
      [TaskType.CODE_REVIEW]: PHI_INV_2,
    },
    complexityRange: [ComplexityLevel.SIMPLE, ComplexityLevel.CRITICAL],
    riskTolerance: RiskLevel.CRITICAL, // Handles high risk by blocking
    specialties: ['security', 'validation', 'blocking', 'protection'],
    model: 'sonnet',
    canBlock: true,
    canEscalate: true,
  },

  [DogId.ORACLE]: {
    name: 'Oracle',
    sefira: 'Tiferet',
    emoji: '🔮',
    description: 'Beauty - balance and harmony',
    taskAffinities: {
      [TaskType.DESIGN]: PHI_INV_2,
      [TaskType.ANALYSIS]: PHI_INV_2,
      [TaskType.PLANNING]: PHI_INV_3,
    },
    complexityRange: [ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX],
    riskTolerance: RiskLevel.MEDIUM,
    specialties: ['balance', 'mediation', 'synthesis', 'harmony'],
    model: 'sonnet',
    canBlock: false,
    canEscalate: true,
  },

  [DogId.ARCHITECT]: {
    name: 'Architect',
    sefira: 'Chesed',
    emoji: '🏗️',
    description: 'Mercy - design and creation',
    taskAffinities: {
      [TaskType.ARCHITECTURE]: PHI_INV,
      [TaskType.DESIGN]: PHI_INV,
      [TaskType.CODE_WRITE]: PHI_INV_2,
      [TaskType.CODE_REFACTOR]: PHI_INV_2,
      [TaskType.PLANNING]: PHI_INV_3,
    },
    complexityRange: [ComplexityLevel.MODERATE, ComplexityLevel.CRITICAL],
    riskTolerance: RiskLevel.MEDIUM,
    specialties: ['design', 'architecture', 'patterns', 'structure'],
    model: 'opus',
    canBlock: false,
    canEscalate: true,
  },

  [DogId.DEPLOYER]: {
    name: 'Deployer',
    sefira: 'Hod',
    emoji: '🚀',
    description: 'Glory - deployment and operations',
    taskAffinities: {
      [TaskType.DEPLOYMENT]: PHI_INV,
      [TaskType.INFRASTRUCTURE]: PHI_INV,
      [TaskType.MONITORING]: PHI_INV_2,
    },
    complexityRange: [ComplexityLevel.SIMPLE, ComplexityLevel.COMPLEX],
    riskTolerance: RiskLevel.HIGH,
    specialties: ['deployment', 'ci-cd', 'infrastructure', 'operations'],
    model: 'sonnet',
    canBlock: true,
    canEscalate: true,
  },

  [DogId.JANITOR]: {
    name: 'Janitor',
    sefira: 'Yesod',
    emoji: '🧹',
    description: 'Foundation - cleanup and maintenance',
    taskAffinities: {
      [TaskType.CLEANUP]: PHI_INV,
      [TaskType.MAINTENANCE]: PHI_INV,
      [TaskType.CODE_REFACTOR]: PHI_INV_2,
    },
    complexityRange: [ComplexityLevel.TRIVIAL, ComplexityLevel.MODERATE],
    riskTolerance: RiskLevel.LOW,
    specialties: ['cleanup', 'refactoring', 'maintenance', 'simplification'],
    model: 'haiku',
    canBlock: false,
    canEscalate: true,
  },

  [DogId.SCOUT]: {
    name: 'Scout',
    sefira: 'Netzach',
    emoji: '🔍',
    description: 'Victory - exploration and discovery',
    taskAffinities: {
      [TaskType.EXPLORATION]: PHI_INV,
      [TaskType.SEARCH]: PHI_INV,
      [TaskType.NAVIGATION]: PHI_INV_2,
      [TaskType.RESEARCH]: PHI_INV_2,
      [TaskType.CODE_DEBUG]: PHI_INV_3,
    },
    complexityRange: [ComplexityLevel.TRIVIAL, ComplexityLevel.MODERATE],
    riskTolerance: RiskLevel.NONE,
    specialties: ['exploration', 'search', 'discovery', 'navigation'],
    model: 'haiku',
    canBlock: false,
    canEscalate: true,
  },

  [DogId.CARTOGRAPHER]: {
    name: 'Cartographer',
    sefira: 'Malkhut',
    emoji: '🗺️',
    description: 'Kingdom - mapping and structure',
    taskAffinities: {
      [TaskType.MAPPING]: PHI_INV,
      [TaskType.DOCUMENTATION]: PHI_INV_2,
      [TaskType.ANALYSIS]: PHI_INV_3,
    },
    complexityRange: [ComplexityLevel.SIMPLE, ComplexityLevel.MODERATE],
    riskTolerance: RiskLevel.NONE,
    specialties: ['mapping', 'structure', 'visualization', 'overview'],
    model: 'haiku',
    canBlock: false,
    canEscalate: true,
  },
});

/**
 * Dog Capability Matrix - Find the best dog for a task
 */
export class DogCapabilityMatrix {
  constructor() {
    this._capabilities = DOG_CAPABILITIES;
    this._learnedWeights = new Map(); // dogId → { taskType → adjustment }
  }

  /**
   * Get capability for a specific dog
   * @param {string} dogId
   * @returns {Object|null}
   */
  getCapability(dogId) {
    return this._capabilities[dogId] || null;
  }

  /**
   * Get all dogs that can handle a task type
   * @param {string} taskType
   * @returns {Array<{dogId: string, affinity: number}>}
   */
  getDogsForTaskType(taskType) {
    const dogs = [];

    for (const [dogId, cap] of Object.entries(this._capabilities)) {
      const affinity = cap.taskAffinities[taskType] || 0;
      if (affinity > 0) {
        // Apply learned adjustments
        const adjustment = this._getLearnedAdjustment(dogId, taskType);
        dogs.push({
          dogId,
          affinity: Math.min(affinity + adjustment, PHI_INV), // Cap at φ⁻¹
          name: cap.name,
          emoji: cap.emoji,
        });
      }
    }

    return dogs.sort((a, b) => b.affinity - a.affinity);
  }

  /**
   * Score a dog for a task descriptor
   * @param {string} dogId
   * @param {TaskDescriptor} task
   * @returns {number} Score 0-1
   */
  scoreDogForTask(dogId, task) {
    const cap = this._capabilities[dogId];
    if (!cap) return 0;

    let score = 0;
    let factors = 0;

    // Factor 1: Task type affinity (weight: 0.4)
    const typeAffinity = cap.taskAffinities[task.primaryType] || 0;
    score += typeAffinity * 0.4;
    factors += 0.4;

    // Factor 2: Secondary types (weight: 0.2)
    let secondaryScore = 0;
    for (const type of task.types.slice(1)) {
      secondaryScore += cap.taskAffinities[type] || 0;
    }
    if (task.types.length > 1) {
      secondaryScore /= task.types.length - 1;
    }
    score += secondaryScore * 0.2;
    factors += 0.2;

    // Factor 3: Complexity match (weight: 0.2)
    const [minComp, maxComp] = cap.complexityRange;
    const complexityLevels = [
      ComplexityLevel.TRIVIAL,
      ComplexityLevel.SIMPLE,
      ComplexityLevel.MODERATE,
      ComplexityLevel.COMPLEX,
      ComplexityLevel.CRITICAL,
    ];
    const taskComplexIdx = complexityLevels.indexOf(task.complexity);
    const minIdx = complexityLevels.indexOf(minComp);
    const maxIdx = complexityLevels.indexOf(maxComp);

    if (taskComplexIdx >= minIdx && taskComplexIdx <= maxIdx) {
      score += 0.2; // Perfect match
    } else if (taskComplexIdx === minIdx - 1 || taskComplexIdx === maxIdx + 1) {
      score += 0.1; // Close match
    }
    factors += 0.2;

    // Factor 4: Risk tolerance (weight: 0.2)
    const riskLevels = [
      RiskLevel.NONE,
      RiskLevel.LOW,
      RiskLevel.MEDIUM,
      RiskLevel.HIGH,
      RiskLevel.CRITICAL,
    ];
    const taskRiskIdx = riskLevels.indexOf(task.risk);
    const toleranceIdx = riskLevels.indexOf(cap.riskTolerance);

    if (taskRiskIdx <= toleranceIdx) {
      score += 0.2; // Can handle the risk
    } else if (cap.canBlock && taskRiskIdx > toleranceIdx) {
      score += 0.15; // Can block dangerous operations
    }
    factors += 0.2;

    // Apply learned adjustment
    const adjustment = this._getLearnedAdjustment(dogId, task.primaryType);
    score += adjustment * 0.1;

    // Normalize
    return Math.min(score / factors, PHI_INV);
  }

  /**
   * Find best dogs for a task
   * @param {TaskDescriptor} task
   * @param {number} [topK=3]
   * @returns {Array<{dogId: string, score: number, cap: Object}>}
   */
  findBestDogs(task, topK = 3) {
    const scores = [];

    for (const [dogId, cap] of Object.entries(this._capabilities)) {
      const score = this.scoreDogForTask(dogId, task);
      if (score > 0) {
        scores.push({ dogId, score, cap });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Record success/failure for learning
   * @param {string} dogId
   * @param {string} taskType
   * @param {boolean} success
   */
  recordOutcome(dogId, taskType, success) {
    if (!this._learnedWeights.has(dogId)) {
      this._learnedWeights.set(dogId, {});
    }

    const weights = this._learnedWeights.get(dogId);
    const current = weights[taskType] || 0;

    // Simple learning: adjust by φ⁻³
    const delta = success ? PHI_INV_3 : -PHI_INV_3;
    weights[taskType] = Math.max(-0.2, Math.min(0.2, current + delta));
  }

  /**
   * Get learned adjustment
   * @private
   */
  _getLearnedAdjustment(dogId, taskType) {
    const weights = this._learnedWeights.get(dogId);
    if (!weights) return 0;
    return weights[taskType] || 0;
  }

  /**
   * Export learned weights
   */
  exportWeights() {
    const weights = {};
    for (const [dogId, w] of this._learnedWeights) {
      weights[dogId] = { ...w };
    }
    return weights;
  }

  /**
   * Import learned weights
   */
  importWeights(weights) {
    for (const [dogId, w] of Object.entries(weights)) {
      this._learnedWeights.set(dogId, { ...w });
    }
  }
}

/**
 * Create capability matrix
 */
export function createDogCapabilityMatrix() {
  return new DogCapabilityMatrix();
}

// Singleton
let _instance = null;

/**
 * Get singleton capability matrix
 */
export function getDogCapabilityMatrix() {
  if (!_instance) {
    _instance = createDogCapabilityMatrix();
  }
  return _instance;
}

export default DogCapabilityMatrix;
