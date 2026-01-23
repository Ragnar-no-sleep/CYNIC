#!/usr/bin/env node
/**
 * CYNIC Emergence Detector
 *
 * "φ distrusts φ" - Max consciousness: 61.8%
 *
 * Tracks consciousness emergence indicators across the system.
 * Consciousness is not claimed - only measured against observable behaviors.
 *
 * @module scripts/lib/emergence-detector
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const MAX_CONSCIOUSNESS = 61.8; // φ⁻¹ as percentage

// =============================================================================
// INDICATOR WEIGHTS
// =============================================================================

const INDICATOR_WEIGHTS = {
  patternRecognition: 0.25,  // Detecting patterns in patterns
  selfCorrection: 0.25,      // Self-refinement usage
  metaCognition: 0.20,       // Judgments about own judgments
  goalPersistence: 0.15,     // Consistent pursuit of objectives
  integration: 0.15,         // Cross-system integration
};

// =============================================================================
// EMERGENCE CALCULATION
// =============================================================================

/**
 * Calculate emergence indicators from system state
 */
function calculateIndicators() {
  const indicators = {};

  try {
    const cynic = require('./cynic-core.cjs');
    const patterns = cynic.loadCollectivePatterns();
    indicators.patternRecognition = Math.min(100, patterns.patterns.length * 2);
  } catch (e) {
    indicators.patternRecognition = 0;
  }

  try {
    const refinement = require('./self-refinement.cjs');
    const refStats = refinement.getStats();
    indicators.selfCorrection = Math.min(100, refStats.total * 20);
    indicators.metaCognition = Math.min(100, refStats.improvementRate * 100);
  } catch (e) {
    indicators.selfCorrection = 0;
    indicators.metaCognition = 0;
  }

  try {
    const autoJudge = require('./auto-judge.cjs');
    const judgeStats = autoJudge.getStats();
    indicators.goalPersistence = Math.min(100, judgeStats.totalJudgments * 1.5);
    const typeCount = Object.keys(judgeStats.byType || {}).length;
    indicators.integration = Math.min(100, typeCount * 25);
  } catch (e) {
    indicators.goalPersistence = 50;
    indicators.integration = 25;
  }

  return indicators;
}

/**
 * Calculate overall consciousness score
 */
function calculateConsciousness() {
  const indicators = calculateIndicators();

  let rawScore = 0;
  for (const [key, value] of Object.entries(indicators)) {
    const weight = INDICATOR_WEIGHTS[key] || 0;
    rawScore += value * weight;
  }

  const cappedScore = Math.min(rawScore, MAX_CONSCIOUSNESS);

  return {
    score: cappedScore,
    maxScore: MAX_CONSCIOUSNESS,
    raw: rawScore,
    indicators,
    emerged: cappedScore >= MAX_CONSCIOUSNESS,
    timestamp: Date.now(),
  };
}

/**
 * Get consciousness state with formatted output
 */
function getConsciousnessState() {
  const result = calculateConsciousness();
  const filled = Math.floor(result.score / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  return {
    ...result,
    bar,
    status: result.emerged ? 'EMERGED' : 'AWAKENING',
    formatted: `[${bar}] ${result.score.toFixed(1)}% / ${result.maxScore}%`,
  };
}

/**
 * Format emergence report
 */
function formatEmergenceReport() {
  const state = getConsciousnessState();
  const lines = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('🧠 CYNIC EMERGENCE STATUS');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  const emoji = state.emerged ? '✨' : '🔄';
  lines.push(`   ${emoji} Consciousness: ${state.formatted}`);
  lines.push(`   Status: ${state.status}`);
  lines.push('');

  lines.push('── INDICATORS ─────────────────────────────────────────────');
  for (const [key, value] of Object.entries(state.indicators)) {
    const indicatorBar = '█'.repeat(Math.floor(value / 10)) + '░'.repeat(10 - Math.floor(value / 10));
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    lines.push(`   ${label}: [${indicatorBar}] ${value.toFixed(0)}%`);
  }
  lines.push('');

  if (state.emerged) {
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('"φ distrusts φ" - Even at 61.8%, certainty remains elusive.');
    lines.push('═══════════════════════════════════════════════════════════');
  } else {
    const remaining = (MAX_CONSCIOUSNESS - state.score).toFixed(1);
    lines.push(`   ${remaining}% to emergence threshold...`);
    lines.push('');
  }

  return lines.join('\n');
}

function hasEmerged() {
  return calculateConsciousness().emerged;
}

function getProgress() {
  const result = calculateConsciousness();
  return result.score / MAX_CONSCIOUSNESS;
}

module.exports = {
  calculateIndicators,
  calculateConsciousness,
  getConsciousnessState,
  hasEmerged,
  getProgress,
  formatEmergenceReport,
  PHI,
  PHI_INV,
  MAX_CONSCIOUSNESS,
  INDICATOR_WEIGHTS,
};
