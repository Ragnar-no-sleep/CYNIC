/**
 * Code Emergence Detector - C1.7 (CODE × EMERGE)
 *
 * Detects emerging patterns in code changes for the 7×7 Fractal Matrix.
 * Part of the EMERGE column activation.
 *
 * "Le chien voit les patterns que l'humain ne voit pas"
 *
 * @module @cynic/node/emergence/code-emergence
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Pattern types detected in code
 */
export const CodePatternType = {
  // Structural patterns
  ARCHITECTURE_DRIFT: 'architecture_drift',
  DEPENDENCY_GROWTH: 'dependency_growth',
  COMPLEXITY_CREEP: 'complexity_creep',

  // Behavioral patterns
  HOTSPOT: 'hotspot',
  CHURN: 'churn',
  COUPLING: 'coupling',

  // Quality patterns
  TECH_DEBT_ACCUMULATION: 'tech_debt_accumulation',
  TEST_COVERAGE_DECLINE: 'test_coverage_decline',
  DUPLICATION_GROWTH: 'duplication_growth',

  // Positive patterns
  REFACTORING_WAVE: 'refactoring_wave',
  SIMPLIFICATION_TREND: 'simplification_trend',
  MODULARIZATION: 'modularization',

  // Meta patterns
  EMERGING_ABSTRACTION: 'emerging_abstraction',
  CONVENTION_DRIFT: 'convention_drift',
};

/**
 * Significance levels for patterns
 */
export const SignificanceLevel = {
  LOW: 'low',           // Interesting but not actionable
  MEDIUM: 'medium',     // Worth noting
  HIGH: 'high',         // Should be addressed
  CRITICAL: 'critical', // Requires immediate attention
};

/**
 * Default thresholds (φ-aligned)
 */
const DEFAULT_THRESHOLDS = {
  hotspotChanges: 5,           // 5+ changes = hotspot
  churnWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
  couplingThreshold: PHI_INV,  // 61.8% shared changes = coupled
  complexityGrowthRate: 0.1,   // 10% growth rate triggers alert
  minPatternsForEmergence: 3,  // Need 3+ occurrences for pattern
  abstractionSimilarity: PHI_INV_2, // 38.2% similarity = potential abstraction
};

/**
 * CodeEmergence - Detect emerging patterns in code
 */
export class CodeEmergence extends EventEmitter {
  constructor(options = {}) {
    super();

    this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
    this.codeAccountant = options.codeAccountant || null;
    this.factsRepo = options.factsRepo || null;

    // Change history for pattern detection
    this._changeHistory = [];
    this._maxHistory = 10000;

    // Detected patterns
    this._patterns = new Map();
    this._patternHistory = [];

    // File relationship tracking
    this._fileCoChanges = new Map(); // files changed together
    this._fileDependencies = new Map(); // import/export relationships

    // Complexity tracking over time
    this._complexityTimeline = [];

    // Session metrics
    this._sessionMetrics = {
      patternsDetected: 0,
      hotspots: new Set(),
      emergingAbstractions: [],
      startTime: Date.now(),
    };
  }

  /**
   * Record a code change for pattern analysis
   *
   * @param {Object} change - Change data
   * @param {string} change.filePath - Path to changed file
   * @param {number} change.linesAdded - Lines added
   * @param {number} change.linesRemoved - Lines removed
   * @param {string[]} [change.imports] - Files imported by this file
   * @param {string[]} [change.exports] - Symbols exported
   * @param {Object} [metadata] - Additional metadata
   */
  recordChange(change, metadata = {}) {
    const timestamp = Date.now();
    const record = {
      ...change,
      timestamp,
      sessionId: metadata.sessionId,
      userId: metadata.userId,
    };

    // Add to history
    this._changeHistory.push(record);
    if (this._changeHistory.length > this._maxHistory) {
      this._changeHistory.shift();
    }

    // Update file relationships
    this._updateFileRelationships(change);

    // Update complexity timeline
    if (change.complexityDelta !== undefined) {
      this._complexityTimeline.push({
        timestamp,
        filePath: change.filePath,
        delta: change.complexityDelta,
      });
    }

    // Run pattern detection
    const detectedPatterns = this._detectPatterns(record);

    // Emit if patterns found
    if (detectedPatterns.length > 0) {
      for (const pattern of detectedPatterns) {
        this._registerPattern(pattern);
        this.emit('pattern_detected', pattern);
      }
    }

    return detectedPatterns;
  }

  /**
   * Update file relationship tracking
   * @private
   */
  _updateFileRelationships(change) {
    const { filePath, imports = [] } = change;

    // Track dependencies
    if (imports.length > 0) {
      this._fileDependencies.set(filePath, new Set(imports));
    }

    // Track co-changes (files changed in same session)
    const recentChanges = this._changeHistory
      .filter(c => Date.now() - c.timestamp < 60000) // Last minute
      .map(c => c.filePath);

    for (const otherFile of recentChanges) {
      if (otherFile !== filePath) {
        const key = [filePath, otherFile].sort().join('::');
        const count = (this._fileCoChanges.get(key) || 0) + 1;
        this._fileCoChanges.set(key, count);
      }
    }
  }

  /**
   * Detect patterns from a change
   * @private
   */
  _detectPatterns(record) {
    const patterns = [];

    // 1. Hotspot detection
    const hotspot = this._detectHotspot(record.filePath);
    if (hotspot) patterns.push(hotspot);

    // 2. Complexity creep
    const complexityPattern = this._detectComplexityCreep();
    if (complexityPattern) patterns.push(complexityPattern);

    // 3. Coupling detection
    const couplingPatterns = this._detectCoupling();
    patterns.push(...couplingPatterns);

    // 4. Refactoring wave (positive)
    const refactoringPattern = this._detectRefactoringWave();
    if (refactoringPattern) patterns.push(refactoringPattern);

    // 5. Emerging abstractions
    const abstractionPattern = this._detectEmergingAbstraction();
    if (abstractionPattern) patterns.push(abstractionPattern);

    // 6. Architecture drift
    const driftPattern = this._detectArchitectureDrift();
    if (driftPattern) patterns.push(driftPattern);

    return patterns;
  }

  /**
   * Detect hotspot (frequently changed file)
   * @private
   */
  _detectHotspot(filePath) {
    const recentWindow = Date.now() - this.thresholds.churnWindow;
    const recentChanges = this._changeHistory.filter(
      c => c.filePath === filePath && c.timestamp > recentWindow
    );

    if (recentChanges.length >= this.thresholds.hotspotChanges) {
      // Already tracked?
      if (this._sessionMetrics.hotspots.has(filePath)) {
        return null; // Don't re-report
      }

      this._sessionMetrics.hotspots.add(filePath);

      return {
        type: CodePatternType.HOTSPOT,
        significance: recentChanges.length >= this.thresholds.hotspotChanges * 2
          ? SignificanceLevel.HIGH
          : SignificanceLevel.MEDIUM,
        filePath,
        data: {
          changeCount: recentChanges.length,
          windowDays: Math.round(this.thresholds.churnWindow / (24 * 60 * 60 * 1000)),
          totalLinesChanged: recentChanges.reduce(
            (sum, c) => sum + (c.linesAdded || 0) + (c.linesRemoved || 0), 0
          ),
        },
        confidence: Math.min(recentChanges.length / 10, PHI_INV),
        message: `Hotspot detected: ${filePath} changed ${recentChanges.length} times recently`,
        recommendation: 'Consider refactoring or splitting this file',
      };
    }

    return null;
  }

  /**
   * Detect complexity creep over time
   * @private
   */
  _detectComplexityCreep() {
    if (this._complexityTimeline.length < 10) return null;

    const recent = this._complexityTimeline.slice(-20);
    const totalDelta = recent.reduce((sum, r) => sum + r.delta, 0);
    const avgDelta = totalDelta / recent.length;

    if (avgDelta > this.thresholds.complexityGrowthRate) {
      return {
        type: CodePatternType.COMPLEXITY_CREEP,
        significance: avgDelta > this.thresholds.complexityGrowthRate * 2
          ? SignificanceLevel.HIGH
          : SignificanceLevel.MEDIUM,
        data: {
          averageDelta: avgDelta,
          totalDelta,
          sampleSize: recent.length,
          trend: 'increasing',
        },
        confidence: PHI_INV_2,
        message: `Complexity creep detected: avg +${(avgDelta * 100).toFixed(1)}% per change`,
        recommendation: 'Schedule refactoring to reduce complexity',
      };
    }

    // Check for positive simplification trend
    if (avgDelta < -this.thresholds.complexityGrowthRate) {
      return {
        type: CodePatternType.SIMPLIFICATION_TREND,
        significance: SignificanceLevel.LOW, // Positive, informational
        data: {
          averageDelta: avgDelta,
          totalDelta,
          trend: 'decreasing',
        },
        confidence: PHI_INV_2,
        message: `Simplification trend: avg ${(avgDelta * 100).toFixed(1)}% per change`,
        recommendation: 'Keep up the good work!',
      };
    }

    return null;
  }

  /**
   * Detect tightly coupled files
   * @private
   */
  _detectCoupling() {
    const patterns = [];
    const totalChanges = this._changeHistory.length;

    if (totalChanges < 20) return patterns;

    for (const [key, coChangeCount] of this._fileCoChanges) {
      const [fileA, fileB] = key.split('::');

      // Calculate coupling ratio
      const fileAChanges = this._changeHistory.filter(c => c.filePath === fileA).length;
      const fileBChanges = this._changeHistory.filter(c => c.filePath === fileB).length;
      const minChanges = Math.min(fileAChanges, fileBChanges);

      if (minChanges > 0) {
        const couplingRatio = coChangeCount / minChanges;

        if (couplingRatio >= this.thresholds.couplingThreshold && coChangeCount >= 3) {
          patterns.push({
            type: CodePatternType.COUPLING,
            significance: couplingRatio > 0.8
              ? SignificanceLevel.HIGH
              : SignificanceLevel.MEDIUM,
            data: {
              files: [fileA, fileB],
              coChangeCount,
              couplingRatio,
            },
            confidence: Math.min(couplingRatio, PHI_INV),
            message: `Coupling detected: ${fileA} and ${fileB} change together ${(couplingRatio * 100).toFixed(0)}% of the time`,
            recommendation: 'Consider merging or creating shared abstraction',
          });
        }
      }
    }

    return patterns.slice(0, 3); // Limit to top 3
  }

  /**
   * Detect refactoring wave (many files simplified)
   * @private
   */
  _detectRefactoringWave() {
    const recentWindow = 60 * 60 * 1000; // Last hour
    const recentChanges = this._changeHistory.filter(
      c => Date.now() - c.timestamp < recentWindow
    );

    if (recentChanges.length < 5) return null;

    const simplifications = recentChanges.filter(
      c => (c.linesRemoved || 0) > (c.linesAdded || 0)
    );

    if (simplifications.length >= recentChanges.length * PHI_INV) {
      return {
        type: CodePatternType.REFACTORING_WAVE,
        significance: SignificanceLevel.LOW, // Positive pattern
        data: {
          totalChanges: recentChanges.length,
          simplifications: simplifications.length,
          ratio: simplifications.length / recentChanges.length,
        },
        confidence: PHI_INV_2,
        message: `Refactoring wave in progress: ${simplifications.length}/${recentChanges.length} changes are simplifications`,
        recommendation: 'Great progress on technical debt!',
      };
    }

    return null;
  }

  /**
   * Detect emerging abstractions (repeated similar patterns)
   * @private
   */
  _detectEmergingAbstraction() {
    // Look for files with similar change patterns
    const fileChangePatterns = new Map();

    for (const change of this._changeHistory.slice(-100)) {
      const pattern = this._extractChangePattern(change);
      if (!fileChangePatterns.has(pattern)) {
        fileChangePatterns.set(pattern, []);
      }
      fileChangePatterns.get(pattern).push(change.filePath);
    }

    // Find patterns appearing in multiple files
    for (const [pattern, files] of fileChangePatterns) {
      const uniqueFiles = [...new Set(files)];
      if (uniqueFiles.length >= this.thresholds.minPatternsForEmergence) {
        // Check if we already reported this
        const patternKey = `abstraction:${pattern}`;
        if (this._patterns.has(patternKey)) continue;

        return {
          type: CodePatternType.EMERGING_ABSTRACTION,
          significance: SignificanceLevel.MEDIUM,
          data: {
            pattern,
            files: uniqueFiles.slice(0, 5),
            occurrences: files.length,
          },
          confidence: PHI_INV_3,
          message: `Emerging abstraction: similar changes in ${uniqueFiles.length} files`,
          recommendation: 'Consider extracting shared logic to a common module',
        };
      }
    }

    return null;
  }

  /**
   * Extract a normalized change pattern
   * @private
   */
  _extractChangePattern(change) {
    // Normalize to a pattern string
    const netChange = (change.linesAdded || 0) - (change.linesRemoved || 0);
    const magnitude = Math.abs(netChange) < 10 ? 'small' :
                     Math.abs(netChange) < 50 ? 'medium' : 'large';
    const direction = netChange > 0 ? 'add' : netChange < 0 ? 'remove' : 'modify';
    const fileType = change.filePath?.split('.').pop() || 'unknown';

    return `${fileType}:${direction}:${magnitude}`;
  }

  /**
   * Detect architecture drift (changes outside expected boundaries)
   * @private
   */
  _detectArchitectureDrift() {
    // Detect cross-layer imports (e.g., UI importing from data layer)
    const layerViolations = [];

    for (const [file, imports] of this._fileDependencies) {
      const fileLayer = this._inferLayer(file);
      for (const imp of imports) {
        const impLayer = this._inferLayer(imp);
        if (this._isLayerViolation(fileLayer, impLayer)) {
          layerViolations.push({ file, import: imp, from: fileLayer, to: impLayer });
        }
      }
    }

    if (layerViolations.length >= 3) {
      return {
        type: CodePatternType.ARCHITECTURE_DRIFT,
        significance: SignificanceLevel.HIGH,
        data: {
          violations: layerViolations.slice(0, 5),
          count: layerViolations.length,
        },
        confidence: PHI_INV_2,
        message: `Architecture drift: ${layerViolations.length} cross-layer dependencies detected`,
        recommendation: 'Review architecture boundaries and dependency direction',
      };
    }

    return null;
  }

  /**
   * Infer architectural layer from file path
   * @private
   */
  _inferLayer(filePath) {
    const path = filePath.toLowerCase();
    if (path.includes('/ui/') || path.includes('/components/') || path.includes('/views/')) {
      return 'presentation';
    }
    if (path.includes('/api/') || path.includes('/routes/') || path.includes('/handlers/')) {
      return 'api';
    }
    if (path.includes('/services/') || path.includes('/domain/') || path.includes('/business/')) {
      return 'business';
    }
    if (path.includes('/data/') || path.includes('/repositories/') || path.includes('/persistence/')) {
      return 'data';
    }
    if (path.includes('/core/') || path.includes('/utils/') || path.includes('/shared/')) {
      return 'core';
    }
    return 'unknown';
  }

  /**
   * Check if import direction violates layer architecture
   * @private
   */
  _isLayerViolation(fromLayer, toLayer) {
    // Allowed: presentation → api → business → data → core
    // Violation: data → presentation, business → api, etc.
    const layerOrder = ['presentation', 'api', 'business', 'data', 'core'];
    const fromIndex = layerOrder.indexOf(fromLayer);
    const toIndex = layerOrder.indexOf(toLayer);

    if (fromIndex === -1 || toIndex === -1) return false;

    // Violation if importing from a higher layer (lower index)
    return toIndex < fromIndex;
  }

  /**
   * Register a detected pattern
   * @private
   */
  _registerPattern(pattern) {
    const key = `${pattern.type}:${pattern.filePath || 'global'}`;
    this._patterns.set(key, {
      ...pattern,
      firstSeen: this._patterns.get(key)?.firstSeen || Date.now(),
      lastSeen: Date.now(),
      occurrences: (this._patterns.get(key)?.occurrences || 0) + 1,
    });

    this._patternHistory.push({
      ...pattern,
      timestamp: Date.now(),
    });

    this._sessionMetrics.patternsDetected++;

    // Store as fact if repo available
    if (this.factsRepo) {
      this._storeFact(pattern).catch(() => {});
    }
  }

  /**
   * Store pattern as fact
   * @private
   */
  async _storeFact(pattern) {
    if (!this.factsRepo) return;

    await this.factsRepo.create({
      userId: 'system',
      factType: 'code_emergence_pattern',
      subject: pattern.type,
      content: pattern.message,
      confidence: pattern.confidence,
      source: 'code-emergence',
      context: pattern.data,
    });
  }

  /**
   * Get all detected patterns
   */
  getPatterns() {
    return Array.from(this._patterns.values());
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type) {
    return this.getPatterns().filter(p => p.type === type);
  }

  /**
   * Get patterns by significance
   */
  getPatternsBySignificance(minSignificance = SignificanceLevel.MEDIUM) {
    const order = [SignificanceLevel.LOW, SignificanceLevel.MEDIUM, SignificanceLevel.HIGH, SignificanceLevel.CRITICAL];
    const minIndex = order.indexOf(minSignificance);

    return this.getPatterns().filter(p => order.indexOf(p.significance) >= minIndex);
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this._sessionMetrics.startTime;

    return {
      duration,
      changesAnalyzed: this._changeHistory.length,
      patternsDetected: this._sessionMetrics.patternsDetected,
      hotspots: [...this._sessionMetrics.hotspots],
      patternsByType: this._groupPatternsByType(),
      patternsBySignificance: this._groupPatternsBySignificance(),
      topPatterns: this.getPatternsBySignificance(SignificanceLevel.MEDIUM).slice(0, 5),
      codeHealth: this._assessCodeHealth(),
    };
  }

  /**
   * Group patterns by type
   * @private
   */
  _groupPatternsByType() {
    const groups = {};
    for (const pattern of this.getPatterns()) {
      groups[pattern.type] = (groups[pattern.type] || 0) + 1;
    }
    return groups;
  }

  /**
   * Group patterns by significance
   * @private
   */
  _groupPatternsBySignificance() {
    const groups = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const pattern of this.getPatterns()) {
      groups[pattern.significance]++;
    }
    return groups;
  }

  /**
   * Assess overall code health based on patterns
   * @private
   */
  _assessCodeHealth() {
    const patterns = this.getPatterns();
    if (patterns.length === 0) {
      return { score: PHI_INV, rating: 'unknown', factors: [] };
    }

    let score = 1.0;
    const factors = [];

    // Negative patterns reduce score
    const negativeTypes = [
      CodePatternType.COMPLEXITY_CREEP,
      CodePatternType.TECH_DEBT_ACCUMULATION,
      CodePatternType.ARCHITECTURE_DRIFT,
      CodePatternType.COUPLING,
    ];

    for (const pattern of patterns) {
      if (negativeTypes.includes(pattern.type)) {
        const penalty = pattern.significance === SignificanceLevel.CRITICAL ? 0.2 :
                       pattern.significance === SignificanceLevel.HIGH ? 0.1 :
                       pattern.significance === SignificanceLevel.MEDIUM ? 0.05 : 0.02;
        score -= penalty;
        factors.push({ type: pattern.type, impact: -penalty });
      }
    }

    // Positive patterns increase score (slightly)
    const positiveTypes = [
      CodePatternType.REFACTORING_WAVE,
      CodePatternType.SIMPLIFICATION_TREND,
      CodePatternType.MODULARIZATION,
    ];

    for (const pattern of patterns) {
      if (positiveTypes.includes(pattern.type)) {
        score += 0.05;
        factors.push({ type: pattern.type, impact: 0.05 });
      }
    }

    // φ-bounded
    score = Math.max(0, Math.min(score, PHI_INV));

    const rating = score >= PHI_INV_2 ? 'healthy' :
                  score >= PHI_INV_3 ? 'concerning' : 'unhealthy';

    return { score, rating, factors };
  }

  /**
   * Reset session
   */
  resetSession() {
    this._changeHistory = [];
    this._patterns.clear();
    this._patternHistory = [];
    this._fileCoChanges.clear();
    this._complexityTimeline = [];
    this._sessionMetrics = {
      patternsDetected: 0,
      hotspots: new Set(),
      emergingAbstractions: [],
      startTime: Date.now(),
    };
    this.emit('session_reset');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

/**
 * Get or create the CodeEmergence singleton
 */
export function getCodeEmergence(options = {}) {
  if (!_instance) {
    _instance = new CodeEmergence(options);
  }
  return _instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetCodeEmergence() {
  if (_instance) {
    _instance.removeAllListeners();
  }
  _instance = null;
}

export default {
  CodeEmergence,
  CodePatternType,
  SignificanceLevel,
  getCodeEmergence,
  resetCodeEmergence,
};
