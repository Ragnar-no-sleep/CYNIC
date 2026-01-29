/**
 * CYNIC Psychology Dashboard
 *
 * "Comprendre l'humain pour mieux l'aider" - κυνικός
 *
 * Generates a visual dashboard of psychological state.
 *
 * @module @cynic/scripts/psy-dashboard
 */

'use strict';

const path = require('path');

// Lazy load modules
let psychology = null;
let thermodynamics = null;
let biases = null;
let learning = null;

function loadModules() {
  try { psychology = require('./human-psychology.cjs'); psychology.init(); } catch {}
  try { thermodynamics = require('./cognitive-thermodynamics.cjs'); thermodynamics.init(); } catch {}
  try { biases = require('./cognitive-biases.cjs'); } catch {}
  try { learning = require('./learning-loop.cjs'); } catch {}
}

// Helpers
const bar = (val, max = 1) => {
  const pct = Math.min(1, val / max);
  return '█'.repeat(Math.round(pct * 10)) + '░'.repeat(10 - Math.round(pct * 10));
};

const trend = (t) => t === 'rising' ? '↑' : t === 'falling' ? '↓' : '→';

const pct = (val) => Math.round(val * 100) + '%';

/**
 * Generate the full psychology dashboard
 */
function generateDashboard() {
  loadModules();

  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('🧠 HUMAN PSYCHOLOGY - "φ observes, φ learns"');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  // === PSYCHOLOGY DIMENSIONS ===
  if (psychology) {
    const summary = psychology.getSummary();
    const state = psychology.getState();

    lines.push('── DIMENSIONS ─────────────────────────────────────────────');
    lines.push(`   Energy:      [${bar(summary.energy.value)}] ${pct(summary.energy.value)} ${trend(summary.energy.trend)}`);
    lines.push(`   Focus:       [${bar(summary.focus.value)}] ${pct(summary.focus.value)} ${trend(summary.focus.trend)}`);
    lines.push(`   Creativity:  [${bar(state.dimensions.creativity?.value || 0.5)}] ${pct(state.dimensions.creativity?.value || 0.5)} ${trend(state.dimensions.creativity?.trend)}`);
    lines.push(`   Frustration: [${bar(summary.frustration.value)}] ${pct(summary.frustration.value)} ${trend(summary.frustration.trend)}`);
    lines.push(`   Confidence:  [${bar(state.dimensions.confidence?.value || 0.5)}] ${pct(state.dimensions.confidence?.value || 0.5)} ${trend(state.dimensions.confidence?.trend)}`);
    lines.push('');

    // === EMOTIONS ===
    if (state.emotions) {
      lines.push('── EMOTIONS ───────────────────────────────────────────────');
      const emotions = state.emotions;
      const emotionList = [
        { name: 'Joy', value: emotions.joy?.value || 0, icon: '😊' },
        { name: 'Curiosity', value: emotions.curiosity?.value || 0, icon: '🔍' },
        { name: 'Anxiety', value: emotions.anxiety?.value || 0, icon: '😰' },
        { name: 'Boredom', value: emotions.boredom?.value || 0, icon: '😴' },
      ];
      const active = emotionList.filter(e => e.value > 0.3).sort((a, b) => b.value - a.value);
      if (active.length > 0) {
        lines.push(`   Active: ${active.map(e => `${e.icon} ${e.name} ${pct(e.value)}`).join('  ')}`);
      } else {
        lines.push('   Neutral state');
      }
      lines.push('');
    }

    // === COMPOSITE STATE ===
    lines.push('── COMPOSITE STATE ────────────────────────────────────────');
    lines.push(`   ${summary.emoji} ${summary.overallState.toUpperCase()}`);

    const composites = summary.composites;
    if (composites.flow) lines.push('   ✨ Flow state - optimal productivity');
    if (composites.burnoutRisk) lines.push('   ⚠️ BURNOUT RISK - Take a break immediately!');
    if (composites.exploration) lines.push('   🔍 Exploration mode - high curiosity');
    if (composites.grind) lines.push('   ⚙️ Grind mode - focused but mechanical');
    if (composites.procrastination) lines.push('   😴 Procrastination pattern detected');
    if (composites.breakthrough) lines.push('   🎉 Breakthrough moment!');
    lines.push('');

    // === SESSION ===
    lines.push('── SESSION ────────────────────────────────────────────────');
    lines.push(`   Duration: ${summary.sessionMinutes} min`);

    // Recommend break if over focus cycle
    const FOCUS_CYCLE = 62; // φ⁻¹ × 100
    if (summary.sessionMinutes > FOCUS_CYCLE) {
      lines.push(`   ⚠️ Over focus cycle (${FOCUS_CYCLE} min recommended)`);
    }
    lines.push('');
  } else {
    lines.push('── PSYCHOLOGY ─────────────────────────────────────────────');
    lines.push('   Module not available');
    lines.push('');
  }

  // === THERMODYNAMICS ===
  if (thermodynamics) {
    const thermo = thermodynamics.getState();
    const rec = thermodynamics.getRecommendation();

    lines.push('── THERMODYNAMICS ─────────────────────────────────────────');
    lines.push(`   Heat (Q):     ${thermo.heat} units ${thermo.isCritical ? '🔥 CRITICAL' : ''}`);
    lines.push(`   Work (W):     ${thermo.work} units`);
    lines.push(`   Temperature:  [${bar(thermo.temperature, 81)}] ${thermo.temperature}°`);
    lines.push(`   Efficiency:   [${bar(thermo.efficiency, 100)}] ${thermo.efficiency}% (φ max: 62%)`);

    if (rec.level !== 'GOOD') {
      lines.push(`   ${rec.message}`);
    }
    lines.push('');
  }

  // === COGNITIVE BIASES ===
  if (biases) {
    try {
      const detected = biases.detectBiases?.() || biases.getDetectedBiases?.() || [];
      if (detected.length > 0) {
        lines.push('── COGNITIVE BIASES ───────────────────────────────────────');
        for (const bias of detected.slice(0, 3)) {
          lines.push(`   ⚠️ ${bias.name}: ${bias.description || bias.pattern}`);
        }
        lines.push('');
      }
    } catch {}
  }

  // === LEARNING CALIBRATION ===
  if (learning) {
    try {
      const calibration = learning.getCalibration?.();
      if (calibration) {
        lines.push('── CALIBRATION ────────────────────────────────────────────');
        lines.push(`   CYNIC accuracy: ${pct(calibration.accuracy || 0.618)}`);
        lines.push(`   Samples: ${calibration.samples || 0}`);
        lines.push('');
      }
    } catch {}
  }

  // === FOOTER ===
  lines.push('═══════════════════════════════════════════════════════════');

  // Choose voice based on state
  let voice = '*sniff* φ observes. φ learns. φ helps.';
  if (psychology) {
    const summary = psychology.getSummary();
    if (summary.composites.burnoutRisk) {
      voice = '*GROWL* Stop. Rest. The pack commands it.';
    } else if (summary.composites.flow) {
      voice = '*silent tail wag* Flow state. The pack protects.';
    } else if (summary.frustration?.value > 0.5) {
      voice = '*concerned sniff* Frustration high. Different approach?';
    }
  }
  lines.push(voice);
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Get quick status (for compact display)
 */
function getQuickStatus() {
  loadModules();

  if (!psychology) return { available: false };

  const summary = psychology.getSummary();
  return {
    available: true,
    state: summary.overallState,
    emoji: summary.emoji,
    energy: Math.round(summary.energy.value * 100),
    focus: Math.round(summary.focus.value * 100),
    frustration: Math.round(summary.frustration.value * 100),
    composites: summary.composites,
    sessionMinutes: summary.sessionMinutes,
  };
}

// CLI execution
if (require.main === module) {
  console.log(generateDashboard());
}

module.exports = {
  generateDashboard,
  getQuickStatus,
};
