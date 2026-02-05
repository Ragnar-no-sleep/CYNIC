/**
 * TemporalPatternAnalyzer - Fourier analysis of user behavior
 *
 * Detects cyclical patterns using Discrete Fourier Transform.
 * Extracted from harmonic-feedback.js for reuse.
 *
 * "Le chien détecte les rythmes cachés" - κυνικός
 *
 * @module scripts/hooks/lib/temporal-pattern-analyzer
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// φ CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PHI_INV_2 = 0.381966011250105;   // φ⁻² = 38.2%

// ═══════════════════════════════════════════════════════════════════════════
// KNOWN COGNITIVE CYCLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Known human cognitive cycles (in milliseconds)
 * These are the frequencies we look for in user behavior
 */
const COGNITIVE_CYCLES = Object.freeze({
  // Ultradian rhythms (within-day cycles)
  FOCUS_CYCLE: {
    name: 'Focus/Break Cycle',
    periodMs: 90 * 60 * 1000,      // 90 minutes (BRAC cycle)
    description: 'Basic Rest-Activity Cycle - natural focus/recovery rhythm',
  },
  POMODORO: {
    name: 'Pomodoro-like',
    periodMs: 25 * 60 * 1000,      // 25 minutes
    description: 'Short focus bursts common in developers',
  },
  HOURLY: {
    name: 'Hourly Check-in',
    periodMs: 60 * 60 * 1000,      // 1 hour
    description: 'Hourly rhythm - often meetings/standup driven',
  },

  // Circadian rhythms (daily cycles)
  CIRCADIAN: {
    name: 'Circadian',
    periodMs: 24 * 60 * 60 * 1000, // 24 hours
    description: 'Daily rhythm - energy peaks/troughs',
  },

  // Infradian rhythms (longer than a day)
  WEEKLY: {
    name: 'Weekly',
    periodMs: 7 * 24 * 60 * 60 * 1000, // 1 week
    description: 'Weekly patterns - Monday blues, Friday rushes',
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TEMPORAL PATTERN ANALYZER
// ═══════════════════════════════════════════════════════════════════════════

class TemporalPatternAnalyzer {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 256;  // Number of samples for FFT
    this.sampleIntervalMs = options.sampleIntervalMs || 5 * 60 * 1000;  // 5 min default
    this.minSignificance = options.minSignificance || PHI_INV_2;  // 38.2% threshold

    // Time series storage (circular buffer)
    this.timeSeries = {
      activity: [],       // Overall activity level
      coherence: [],      // Coherence scores
      resonance: [],      // Resonance scores
      errors: [],         // Error frequency
    };

    // Detected patterns
    this.detectedCycles = new Map();
    this.lastAnalysis = null;
    this.analysisCount = 0;
  }

  /**
   * Record a data point in the time series
   * @param {string} series - Which series to record to
   * @param {number} value - Value to record (0-1 normalized)
   * @param {number} [timestamp] - Optional timestamp (default: now)
   */
  record(series, value, timestamp = Date.now()) {
    if (!this.timeSeries[series]) {
      this.timeSeries[series] = [];
    }

    this.timeSeries[series].push({ value, timestamp });

    // Keep bounded to window size
    if (this.timeSeries[series].length > this.windowSize) {
      this.timeSeries[series].shift();
    }
  }

  /**
   * Discrete Fourier Transform (DFT)
   * For small datasets, this is simpler than FFT and sufficient
   *
   * @param {number[]} signal - Real-valued time series
   * @returns {Object[]} Array of { frequency, magnitude, phase }
   */
  dft(signal) {
    const N = signal.length;
    const spectrum = [];

    for (let k = 0; k < N / 2; k++) {  // Only need half (Nyquist)
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += signal[n] * Math.cos(angle);
        imag -= signal[n] * Math.sin(angle);
      }

      const magnitude = Math.sqrt(real * real + imag * imag) / N;
      const phase = Math.atan2(imag, real);

      spectrum.push({
        k,                                      // Frequency bin index
        frequency: k / N,                       // Normalized frequency (cycles per sample)
        magnitude,
        phase,
        periodSamples: k > 0 ? N / k : Infinity, // Period in number of samples
      });
    }

    return spectrum;
  }

  /**
   * Analyze a time series for dominant frequencies
   * @param {string} seriesName - Name of the series to analyze
   * @returns {Object} Analysis results
   */
  analyzeTimeSeries(seriesName) {
    const series = this.timeSeries[seriesName];
    if (!series || series.length < 16) {  // Need at least 16 samples
      return { error: 'Insufficient data', samples: series?.length || 0 };
    }

    // Extract values and normalize (remove DC component / mean)
    const values = series.map(s => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const normalized = values.map(v => v - mean);

    // Compute DFT
    const spectrum = this.dft(normalized);

    // Find dominant frequencies (excluding DC component at k=0)
    const significant = spectrum
      .filter(s => s.k > 0 && s.magnitude > this.minSignificance * Math.max(...spectrum.map(x => x.magnitude)))
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 5);  // Top 5 frequencies

    // Calculate time span of data
    const timeSpanMs = series[series.length - 1].timestamp - series[0].timestamp;
    const avgIntervalMs = timeSpanMs / (series.length - 1);

    // Convert to real-world periods
    const cycles = significant.map(s => {
      const periodMs = s.periodSamples * avgIntervalMs;
      const matchedCycle = this._matchKnownCycle(periodMs);

      return {
        periodMs,
        periodHuman: this._formatPeriod(periodMs),
        magnitude: Math.round(s.magnitude * 1000) / 1000,
        relativeStrength: s.magnitude / Math.max(...spectrum.map(x => x.magnitude)),
        matchedCycle: matchedCycle?.name || null,
        description: matchedCycle?.description || 'Unknown pattern',
      };
    });

    return {
      series: seriesName,
      samples: series.length,
      timeSpanMs,
      avgIntervalMs,
      dominantCycles: cycles,
      analysisTimestamp: Date.now(),
    };
  }

  /**
   * Match detected period to known cognitive cycles
   * @param {number} periodMs - Detected period in milliseconds
   * @returns {Object|null} Matched cycle or null
   */
  _matchKnownCycle(periodMs) {
    // Allow 20% tolerance
    const tolerance = 0.2;

    for (const [key, cycle] of Object.entries(COGNITIVE_CYCLES)) {
      const ratio = periodMs / cycle.periodMs;
      if (ratio > (1 - tolerance) && ratio < (1 + tolerance)) {
        return cycle;
      }
    }
    return null;
  }

  /**
   * Format period in human-readable form
   * @param {number} periodMs - Period in milliseconds
   * @returns {string} Human readable string
   */
  _formatPeriod(periodMs) {
    const minutes = periodMs / (60 * 1000);
    const hours = periodMs / (60 * 60 * 1000);
    const days = periodMs / (24 * 60 * 60 * 1000);

    if (days >= 1) return `${Math.round(days * 10) / 10} days`;
    if (hours >= 1) return `${Math.round(hours * 10) / 10} hours`;
    return `${Math.round(minutes)} minutes`;
  }

  /**
   * Run full analysis on all time series
   * @returns {Object} Complete analysis report
   */
  analyzeAll() {
    const results = {};

    for (const seriesName of Object.keys(this.timeSeries)) {
      results[seriesName] = this.analyzeTimeSeries(seriesName);
    }

    this.lastAnalysis = {
      timestamp: Date.now(),
      results,
      recommendation: this._generateRecommendation(results),
    };

    this.analysisCount++;
    return this.lastAnalysis;
  }

  /**
   * Generate recommendations based on detected patterns
   * @param {Object} results - Analysis results
   * @returns {Object} Recommendations
   */
  _generateRecommendation(results) {
    const recommendations = [];

    // Check activity patterns
    if (results.activity?.dominantCycles?.length > 0) {
      const topCycle = results.activity.dominantCycles[0];

      if (topCycle.matchedCycle === 'Focus/Break Cycle') {
        recommendations.push({
          type: 'rhythm_detected',
          message: `*sniff* Ton cycle focus/repos est de ~${topCycle.periodHuman}. CYNIC va s'adapter.`,
          action: 'adjust_timing',
          periodMs: topCycle.periodMs,
        });
      }

      if (topCycle.matchedCycle === 'Circadian') {
        recommendations.push({
          type: 'circadian_detected',
          message: '*ears perk* Cycle circadien détecté. Pic d\'énergie prévisible.',
          action: 'predict_energy',
        });
      }
    }

    // Check error patterns
    if (results.errors?.dominantCycles?.length > 0) {
      const errorCycle = results.errors.dominantCycles[0];
      recommendations.push({
        type: 'error_pattern',
        message: `*GROWL* Les erreurs suivent un pattern de ${errorCycle.periodHuman}. Fatigue cyclique?`,
        action: 'warn_fatigue',
        periodMs: errorCycle.periodMs,
      });
    }

    // Coherence trends
    if (results.coherence?.dominantCycles?.length > 0) {
      recommendations.push({
        type: 'coherence_cycle',
        message: 'Fluctuations de cohérence détectées - flow state cyclique.',
        action: 'optimize_sessions',
      });
    }

    return {
      count: recommendations.length,
      recommendations,
      summary: recommendations.length > 0
        ? `${recommendations.length} pattern(s) temporel(s) détecté(s)`
        : 'Pas assez de données pour détecter des patterns',
    };
  }

  /**
   * Get timing recommendation for next action
   * Based on detected cycles, when is the best time?
   * @returns {Object} Timing recommendation
   */
  getOptimalTiming() {
    if (!this.lastAnalysis) {
      return { recommendation: 'analyze_first', message: 'Pas d\'analyse disponible' };
    }

    const activityCycles = this.lastAnalysis.results.activity?.dominantCycles || [];
    if (activityCycles.length === 0) {
      return { recommendation: 'no_pattern', message: 'Pas de cycle détecté' };
    }

    // Use the strongest detected cycle
    const mainCycle = activityCycles[0];
    const now = Date.now();
    const phaseInCycle = (now % mainCycle.periodMs) / mainCycle.periodMs;

    // Activity typically peaks at phase 0.25 (quarter into cycle)
    // and troughs at phase 0.75 (three quarters in)
    const peakPhase = 0.25;
    const distanceFromPeak = Math.abs(phaseInCycle - peakPhase);

    return {
      currentPhase: Math.round(phaseInCycle * 100) + '%',
      cyclePeriod: mainCycle.periodHuman,
      energyLevel: distanceFromPeak < 0.25 ? 'HIGH' : distanceFromPeak > 0.5 ? 'LOW' : 'MEDIUM',
      recommendation: distanceFromPeak < 0.25
        ? 'optimal'
        : distanceFromPeak > 0.5
          ? 'rest_recommended'
          : 'normal',
      message: distanceFromPeak < 0.25
        ? '*tail wag* Période optimale pour les tâches complexes!'
        : distanceFromPeak > 0.5
          ? '*yawn* Énergie basse - tâches simples recommandées'
          : 'Période normale - continuer comme prévu',
    };
  }

  /**
   * Export analysis state for persistence
   */
  export() {
    return {
      timeSeries: this.timeSeries,
      detectedCycles: Object.fromEntries(this.detectedCycles),
      lastAnalysis: this.lastAnalysis,
      analysisCount: this.analysisCount,
    };
  }

  /**
   * Import from persisted state
   */
  import(state) {
    if (state.timeSeries) this.timeSeries = state.timeSeries;
    if (state.detectedCycles) this.detectedCycles = new Map(Object.entries(state.detectedCycles));
    if (state.lastAnalysis) this.lastAnalysis = state.lastAnalysis;
    if (state.analysisCount) this.analysisCount = state.analysisCount;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _temporalAnalyzer = null;

/**
 * Get temporal pattern analyzer singleton
 */
function getTemporalPatternAnalyzer() {
  if (!_temporalAnalyzer) {
    _temporalAnalyzer = new TemporalPatternAnalyzer();
  }
  return _temporalAnalyzer;
}

export {
  TemporalPatternAnalyzer,
  getTemporalPatternAnalyzer,
  COGNITIVE_CYCLES,
};

export default TemporalPatternAnalyzer;
