/**
 * Task Descriptor - Intelligent Task Classification
 *
 * Analyzes incoming tasks to extract features for dog routing.
 * Uses pattern matching and keyword analysis to classify tasks.
 *
 * "Know what you're hunting" - κυνικός
 *
 * @module @cynic/node/routing/task-descriptor
 */

'use strict';

// φ constants
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;

/**
 * Task types that dogs can handle
 */
export const TaskType = Object.freeze({
  // Code tasks
  CODE_REVIEW: 'code_review',
  CODE_WRITE: 'code_write',
  CODE_DEBUG: 'code_debug',
  CODE_REFACTOR: 'code_refactor',
  CODE_TEST: 'code_test',

  // Architecture tasks
  DESIGN: 'design',
  ARCHITECTURE: 'architecture',
  PLANNING: 'planning',

  // Security tasks
  SECURITY_AUDIT: 'security_audit',
  SECURITY_FIX: 'security_fix',

  // Research tasks
  RESEARCH: 'research',
  EXPLORATION: 'exploration',
  DOCUMENTATION: 'documentation',

  // Operations tasks
  DEPLOYMENT: 'deployment',
  INFRASTRUCTURE: 'infrastructure',
  MONITORING: 'monitoring',

  // Analysis tasks
  ANALYSIS: 'analysis',
  OPTIMIZATION: 'optimization',
  PROFILING: 'profiling',

  // Cleanup tasks
  CLEANUP: 'cleanup',
  MAINTENANCE: 'maintenance',

  // Navigation tasks
  NAVIGATION: 'navigation',
  SEARCH: 'search',
  MAPPING: 'mapping',

  // General
  QUESTION: 'question',
  UNKNOWN: 'unknown',
});

/**
 * Complexity levels
 */
export const ComplexityLevel = Object.freeze({
  TRIVIAL: 'trivial',     // < 5 minutes, single file
  SIMPLE: 'simple',       // < 30 minutes, few files
  MODERATE: 'moderate',   // < 2 hours, multiple components
  COMPLEX: 'complex',     // > 2 hours, architectural
  CRITICAL: 'critical',   // System-wide impact, dangerous
});

/**
 * Risk levels
 */
export const RiskLevel = Object.freeze({
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

/**
 * Task keywords for classification
 */
const TASK_KEYWORDS = {
  // Code tasks
  [TaskType.CODE_REVIEW]: ['review', 'check', 'look at', 'examine', 'audit code', 'pr review'],
  [TaskType.CODE_WRITE]: ['write', 'create', 'implement', 'add', 'build', 'make', 'code'],
  [TaskType.CODE_DEBUG]: ['debug', 'fix', 'bug', 'error', 'issue', 'broken', 'not working', 'fails'],
  [TaskType.CODE_REFACTOR]: ['refactor', 'clean up', 'improve', 'simplify', 'restructure'],
  [TaskType.CODE_TEST]: ['test', 'spec', 'unit test', 'integration test', 'coverage'],

  // Architecture
  [TaskType.DESIGN]: ['design', 'ui', 'ux', 'interface', 'layout', 'style'],
  [TaskType.ARCHITECTURE]: ['architecture', 'structure', 'pattern', 'system design'],
  [TaskType.PLANNING]: ['plan', 'roadmap', 'strategy', 'approach', 'how should'],

  // Security
  [TaskType.SECURITY_AUDIT]: ['security', 'vulnerability', 'secure', 'auth', 'permission'],
  [TaskType.SECURITY_FIX]: ['security fix', 'patch', 'vulnerability fix', 'secure this'],

  // Research
  [TaskType.RESEARCH]: ['research', 'investigate', 'learn about', 'understand'],
  [TaskType.EXPLORATION]: ['explore', 'find', 'discover', 'where is', 'look for'],
  [TaskType.DOCUMENTATION]: ['document', 'readme', 'docs', 'explain', 'comment'],

  // Operations
  [TaskType.DEPLOYMENT]: ['deploy', 'release', 'publish', 'ship', 'launch'],
  [TaskType.INFRASTRUCTURE]: ['infra', 'docker', 'kubernetes', 'ci/cd', 'pipeline'],
  [TaskType.MONITORING]: ['monitor', 'logs', 'metrics', 'alert', 'observability'],

  // Analysis
  [TaskType.ANALYSIS]: ['analyze', 'analyse', 'breakdown', 'understand how'],
  [TaskType.OPTIMIZATION]: ['optimize', 'performance', 'speed up', 'faster', 'efficient'],
  [TaskType.PROFILING]: ['profile', 'benchmark', 'measure', 'bottleneck'],

  // Cleanup
  [TaskType.CLEANUP]: ['clean', 'remove', 'delete', 'unused', 'dead code'],
  [TaskType.MAINTENANCE]: ['maintain', 'update', 'upgrade', 'dependency'],

  // Navigation
  [TaskType.NAVIGATION]: ['navigate', 'go to', 'open', 'show me'],
  [TaskType.SEARCH]: ['search', 'find', 'grep', 'where', 'locate'],
  [TaskType.MAPPING]: ['map', 'structure', 'overview', 'codebase'],

  // General
  [TaskType.QUESTION]: ['what', 'why', 'how', 'when', 'who', 'explain', '?'],
};

/**
 * Risk keywords
 */
const RISK_KEYWORDS = {
  [RiskLevel.CRITICAL]: ['delete all', 'drop database', 'rm -rf', 'force push', 'production', 'credentials', 'secret'],
  [RiskLevel.HIGH]: ['delete', 'remove', 'modify database', 'migration', 'deploy', 'security'],
  [RiskLevel.MEDIUM]: ['update', 'change', 'refactor', 'restructure'],
  [RiskLevel.LOW]: ['read', 'view', 'list', 'search', 'analyze'],
};

/**
 * Complexity indicators
 */
const COMPLEXITY_INDICATORS = {
  high: ['entire', 'all', 'whole', 'complete', 'system-wide', 'architecture', 'redesign'],
  moderate: ['multiple', 'several', 'few', 'component', 'module'],
  low: ['single', 'one', 'this', 'specific', 'simple'],
};

/**
 * Task Descriptor - Analyzes and classifies tasks
 */
export class TaskDescriptor {
  /**
   * Create a TaskDescriptor
   * @param {string} input - Raw task input (user prompt or tool request)
   * @param {Object} [context] - Additional context
   */
  constructor(input, context = {}) {
    this.raw = input;
    this.context = context;

    // Analyze on construction
    this._analyze();
  }

  /**
   * Analyze the task
   * @private
   */
  _analyze() {
    const lower = this.raw.toLowerCase();

    // Extract features
    this.types = this._classifyTypes(lower);
    this.primaryType = this.types[0] || TaskType.UNKNOWN;
    this.complexity = this._classifyComplexity(lower);
    this.risk = this._classifyRisk(lower);
    this.urgency = this._classifyUrgency(lower);
    this.scope = this._classifyScope(lower);

    // Extract entities
    this.files = this._extractFiles();
    this.tools = this._extractTools();
    this.keywords = this._extractKeywords(lower);

    // Calculate confidence
    this.confidence = this._calculateConfidence();
  }

  /**
   * Classify task types
   * @private
   */
  _classifyTypes(lower) {
    const scores = new Map();

    for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          // Longer keywords get higher scores
          score += keyword.length * 0.1;
        }
      }
      if (score > 0) {
        scores.set(type, score);
      }
    }

    // Sort by score, return top types
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * Classify complexity
   * @private
   */
  _classifyComplexity(lower) {
    // Check for high complexity indicators
    for (const word of COMPLEXITY_INDICATORS.high) {
      if (lower.includes(word)) {
        return ComplexityLevel.COMPLEX;
      }
    }

    // Check for moderate
    for (const word of COMPLEXITY_INDICATORS.moderate) {
      if (lower.includes(word)) {
        return ComplexityLevel.MODERATE;
      }
    }

    // Check for low
    for (const word of COMPLEXITY_INDICATORS.low) {
      if (lower.includes(word)) {
        return ComplexityLevel.SIMPLE;
      }
    }

    // Default based on length
    if (this.raw.length < 50) {
      return ComplexityLevel.TRIVIAL;
    } else if (this.raw.length < 200) {
      return ComplexityLevel.SIMPLE;
    } else {
      return ComplexityLevel.MODERATE;
    }
  }

  /**
   * Classify risk level
   * @private
   */
  _classifyRisk(lower) {
    for (const [level, keywords] of Object.entries(RISK_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return level;
        }
      }
    }
    return RiskLevel.NONE;
  }

  /**
   * Classify urgency
   * @private
   */
  _classifyUrgency(lower) {
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('now') || lower.includes('immediately')) {
      return 'high';
    }
    if (lower.includes('when you can') || lower.includes('eventually') || lower.includes('later')) {
      return 'low';
    }
    return 'normal';
  }

  /**
   * Classify scope
   * @private
   */
  _classifyScope(lower) {
    if (lower.includes('entire') || lower.includes('all') || lower.includes('whole project')) {
      return 'project';
    }
    if (lower.includes('module') || lower.includes('package') || lower.includes('component')) {
      return 'module';
    }
    if (lower.includes('file') || lower.includes('function') || lower.includes('class')) {
      return 'file';
    }
    return 'unknown';
  }

  /**
   * Extract file references
   * @private
   */
  _extractFiles() {
    const filePatterns = [
      /[\w\-\/\\]+\.\w{1,10}/g,  // path/to/file.ext
      /`([^`]+\.\w{1,10})`/g,    // `file.ext` in backticks
    ];

    const files = new Set();
    for (const pattern of filePatterns) {
      const matches = this.raw.match(pattern) || [];
      for (const match of matches) {
        files.add(match.replace(/`/g, ''));
      }
    }
    return [...files];
  }

  /**
   * Extract tool references
   * @private
   */
  _extractTools() {
    const toolKeywords = ['bash', 'git', 'npm', 'docker', 'grep', 'read', 'write', 'edit'];
    const found = [];
    const lower = this.raw.toLowerCase();

    for (const tool of toolKeywords) {
      if (lower.includes(tool)) {
        found.push(tool);
      }
    }
    return found;
  }

  /**
   * Extract important keywords
   * @private
   */
  _extractKeywords(lower) {
    // Remove common words
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at',
      'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until',
      'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you',
      'your', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom']);

    const words = lower.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Calculate classification confidence
   * @private
   */
  _calculateConfidence() {
    let confidence = 0.5; // Base

    // Higher if we found matching types
    if (this.types.length > 0) {
      confidence += 0.2;
    }

    // Higher if we found specific files
    if (this.files.length > 0) {
      confidence += 0.1;
    }

    // Higher if we found tools
    if (this.tools.length > 0) {
      confidence += 0.1;
    }

    // Cap at φ⁻¹
    return Math.min(confidence, PHI_INV);
  }

  /**
   * Get feature vector for ML routing
   * @returns {Object}
   */
  toFeatureVector() {
    return {
      types: this.types,
      primaryType: this.primaryType,
      complexity: this.complexity,
      risk: this.risk,
      urgency: this.urgency,
      scope: this.scope,
      fileCount: this.files.length,
      toolCount: this.tools.length,
      keywordCount: this.keywords.length,
      inputLength: this.raw.length,
      confidence: this.confidence,
    };
  }

  /**
   * Serialize for logging/storage
   * @returns {Object}
   */
  toJSON() {
    return {
      raw: this.raw.slice(0, 200), // Truncate for storage
      types: this.types,
      primaryType: this.primaryType,
      complexity: this.complexity,
      risk: this.risk,
      urgency: this.urgency,
      scope: this.scope,
      files: this.files,
      tools: this.tools,
      keywords: this.keywords,
      confidence: this.confidence,
      timestamp: Date.now(),
    };
  }
}

/**
 * Create a TaskDescriptor
 * @param {string} input - Task input
 * @param {Object} [context] - Context
 * @returns {TaskDescriptor}
 */
export function createTaskDescriptor(input, context = {}) {
  return new TaskDescriptor(input, context);
}

export default TaskDescriptor;
