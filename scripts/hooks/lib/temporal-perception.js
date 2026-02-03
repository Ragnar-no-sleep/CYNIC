/**
 * Temporal Perception - CYNIC's sense of time
 *
 * "Le chien sent le temps passer"
 *
 * This module provides CYNIC with temporal awareness:
 * - Time between prompts (tempo)
 * - Session duration
 * - Temporal patterns (accelerating, steady, decelerating)
 * - φ-derived thresholds for meaningful intervals
 *
 * @module scripts/hooks/lib/temporal-perception
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// φ-DERIVED TEMPORAL CONSTANTS
// "Le temps suit les mêmes harmonies que tout le reste"
// ═══════════════════════════════════════════════════════════════════════════

/** Golden ratio and inverse */
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;    // 61.8%
const PHI_INV_2 = 0.381966011250105;  // 38.2%
const PHI_INV_3 = 0.236067977499790;  // 23.6%

/**
 * Circadian phases (based on typical human rhythms)
 * Hours are in 24h format, local time
 */
const CircadianPhase = Object.freeze({
  DEEP_NIGHT: 'deep_night',     // 00:00 - 05:00 - Low energy, should be sleeping
  EARLY_MORNING: 'early_morning', // 05:00 - 08:00 - Waking up, energy rising
  MORNING: 'morning',           // 08:00 - 12:00 - Peak focus for most people
  MIDDAY: 'midday',             // 12:00 - 14:00 - Post-lunch dip
  AFTERNOON: 'afternoon',       // 14:00 - 18:00 - Second wind, good for creative work
  EVENING: 'evening',           // 18:00 - 21:00 - Winding down
  NIGHT: 'night',               // 21:00 - 00:00 - Should be relaxing
});

/**
 * Day type classification
 */
const DayType = Object.freeze({
  WEEKDAY: 'weekday',
  WEEKEND: 'weekend',
});

/**
 * Circadian hour boundaries
 */
const CIRCADIAN_HOURS = Object.freeze({
  DEEP_NIGHT_START: 0,
  EARLY_MORNING_START: 5,
  MORNING_START: 8,
  MIDDAY_START: 12,
  AFTERNOON_START: 14,
  EVENING_START: 18,
  NIGHT_START: 21,
});

/**
 * Temporal thresholds derived from φ
 * All times in milliseconds
 */
const TEMPORAL_THRESHOLDS = Object.freeze({
  // Prompt interval thresholds (φ-scaled from 1 minute base)
  RAPID_PROMPT_MS: 60000 * PHI_INV_3,      // ~14 seconds - very fast, possibly frustrated
  QUICK_PROMPT_MS: 60000 * PHI_INV_2,      // ~23 seconds - quick response
  NORMAL_PROMPT_MS: 60000 * PHI_INV,       // ~37 seconds - normal thinking time
  THOUGHTFUL_PROMPT_MS: 60000,             // 60 seconds - thinking deeply
  SLOW_PROMPT_MS: 60000 * PHI,             // ~97 seconds - taking time or distracted
  VERY_SLOW_PROMPT_MS: 60000 * PHI * PHI,  // ~157 seconds - possibly stuck or away

  // Session duration thresholds (φ-scaled from 1 hour base)
  SHORT_SESSION_MS: 3600000 * PHI_INV_2,   // ~23 minutes - quick session
  NORMAL_SESSION_MS: 3600000 * PHI_INV,    // ~37 minutes - normal session
  LONG_SESSION_MS: 3600000,                // 60 minutes - long session
  VERY_LONG_SESSION_MS: 3600000 * PHI,     // ~97 minutes - very long, check for fatigue

  // Pattern detection windows (Fibonacci-like)
  PATTERN_WINDOW_SIZE: 5,                  // Prompts to analyze for patterns
  TREND_THRESHOLD: PHI_INV_2,              // 38.2% change to count as trend

  // Tempo classification (prompts per minute)
  HIGH_TEMPO: 3,                           // >3 prompts/min = high tempo
  NORMAL_TEMPO: PHI_INV,                   // ~0.6 prompts/min = normal
  LOW_TEMPO: PHI_INV_2,                    // ~0.4 prompts/min = slow tempo
});

/**
 * Temporal state categories
 */
const TemporalState = Object.freeze({
  RAPID: 'rapid',           // Very fast prompts - frustration or urgency
  QUICK: 'quick',           // Quick prompts - engaged and flowing
  STEADY: 'steady',         // Normal pace - thinking and working
  THOUGHTFUL: 'thoughtful', // Slower pace - deep thought
  SLOW: 'slow',             // Slow - possibly stuck or distracted
  IDLE: 'idle',             // Very slow - away or deeply stuck
});

/**
 * Trend patterns
 */
const TemporalTrend = Object.freeze({
  ACCELERATING: 'accelerating',   // Prompts getting faster
  STEADY: 'steady',               // Consistent pace
  DECELERATING: 'decelerating',   // Prompts getting slower
  ERRATIC: 'erratic',             // No clear pattern
});

// ═══════════════════════════════════════════════════════════════════════════
// TEMPORAL PERCEPTION CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TemporalPerception - Provides temporal awareness for CYNIC
 *
 * Tracks time between prompts, detects patterns, and provides
 * temporal state for psychology inference.
 */
class TemporalPerception {
  constructor() {
    this._sessionStartTime = null;
    this._lastPromptTime = null;
    this._promptTimestamps = [];
    this._intervals = [];
    this._lastSessionEndTime = null;  // For inter-session gap
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize temporal perception for a session
   * @param {number} sessionStartTime - Session start timestamp
   */
  init(sessionStartTime) {
    this._sessionStartTime = sessionStartTime || Date.now();
    this._lastPromptTime = null;
    this._promptTimestamps = [];
    this._intervals = [];
  }

  /**
   * Restore from session state
   * @param {Object} sessionState - Session state from session-state.js
   */
  restoreFromSession(sessionState) {
    if (sessionState.startTime) {
      this._sessionStartTime = sessionState.startTime;
    }

    // Extract timestamps from prompt history
    if (sessionState.promptHistory && sessionState.promptHistory.length > 0) {
      this._promptTimestamps = sessionState.promptHistory
        .map(p => p.timestamp)
        .filter(t => typeof t === 'number');

      // Recalculate intervals
      this._intervals = [];
      for (let i = 1; i < this._promptTimestamps.length; i++) {
        this._intervals.push(this._promptTimestamps[i] - this._promptTimestamps[i - 1]);
      }

      // Set last prompt time
      if (this._promptTimestamps.length > 0) {
        this._lastPromptTime = this._promptTimestamps[this._promptTimestamps.length - 1];
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECORDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record a new prompt timestamp
   * @param {number} [timestamp] - Timestamp (defaults to now)
   * @returns {Object} Temporal event data
   */
  recordPrompt(timestamp = Date.now()) {
    const previousTime = this._lastPromptTime;
    this._lastPromptTime = timestamp;
    this._promptTimestamps.push(timestamp);

    // Calculate interval if we have a previous prompt
    let interval = null;
    if (previousTime !== null) {
      interval = timestamp - previousTime;
      this._intervals.push(interval);
    }

    // Keep only recent timestamps (sliding window)
    const maxHistory = TEMPORAL_THRESHOLDS.PATTERN_WINDOW_SIZE * 3;
    if (this._promptTimestamps.length > maxHistory) {
      this._promptTimestamps = this._promptTimestamps.slice(-maxHistory);
      this._intervals = this._intervals.slice(-(maxHistory - 1));
    }

    return {
      timestamp,
      interval,
      state: this._classifyInterval(interval),
      promptCount: this._promptTimestamps.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPORAL QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get time since last prompt
   * @returns {number|null} Milliseconds since last prompt, or null if no prompts
   */
  getTimeSinceLastPrompt() {
    if (this._lastPromptTime === null) {
      return null;
    }
    return Date.now() - this._lastPromptTime;
  }

  /**
   * Get session duration
   * @returns {number} Session duration in milliseconds
   */
  getSessionDuration() {
    if (this._sessionStartTime === null) {
      return 0;
    }
    return Date.now() - this._sessionStartTime;
  }

  /**
   * Get prompt count in session
   * @returns {number} Number of prompts recorded
   */
  getPromptCount() {
    return this._promptTimestamps.length;
  }

  /**
   * Get average interval between prompts
   * @param {number} [windowSize] - Number of recent intervals to average
   * @returns {number|null} Average interval in milliseconds
   */
  getAverageInterval(windowSize = TEMPORAL_THRESHOLDS.PATTERN_WINDOW_SIZE) {
    if (this._intervals.length === 0) {
      return null;
    }

    const recentIntervals = this._intervals.slice(-windowSize);
    const sum = recentIntervals.reduce((a, b) => a + b, 0);
    return sum / recentIntervals.length;
  }

  /**
   * Get prompts per minute (tempo)
   * @returns {number} Prompts per minute based on recent activity
   */
  getTempo() {
    const avgInterval = this.getAverageInterval();
    if (avgInterval === null || avgInterval === 0) {
      return 0;
    }
    // Convert to prompts per minute
    return 60000 / avgInterval;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Classify a single interval into temporal state
   * @param {number|null} interval - Interval in milliseconds
   * @returns {string} TemporalState value
   * @private
   */
  _classifyInterval(interval) {
    if (interval === null) {
      return TemporalState.STEADY;
    }

    if (interval < TEMPORAL_THRESHOLDS.RAPID_PROMPT_MS) {
      return TemporalState.RAPID;
    } else if (interval < TEMPORAL_THRESHOLDS.QUICK_PROMPT_MS) {
      return TemporalState.QUICK;
    } else if (interval < TEMPORAL_THRESHOLDS.THOUGHTFUL_PROMPT_MS) {
      return TemporalState.STEADY;
    } else if (interval < TEMPORAL_THRESHOLDS.SLOW_PROMPT_MS) {
      return TemporalState.THOUGHTFUL;
    } else if (interval < TEMPORAL_THRESHOLDS.VERY_SLOW_PROMPT_MS) {
      return TemporalState.SLOW;
    } else {
      return TemporalState.IDLE;
    }
  }

  /**
   * Detect temporal trend (accelerating, steady, decelerating)
   * @returns {string} TemporalTrend value
   */
  detectTrend() {
    const windowSize = TEMPORAL_THRESHOLDS.PATTERN_WINDOW_SIZE;

    if (this._intervals.length < windowSize) {
      return TemporalTrend.STEADY;
    }

    const recentIntervals = this._intervals.slice(-windowSize);

    // Split into first half and second half
    const midpoint = Math.floor(windowSize / 2);
    const firstHalf = recentIntervals.slice(0, midpoint);
    const secondHalf = recentIntervals.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // Calculate change ratio
    const changeRatio = (secondAvg - firstAvg) / firstAvg;

    // Check against trend threshold
    if (changeRatio < -TEMPORAL_THRESHOLDS.TREND_THRESHOLD) {
      return TemporalTrend.ACCELERATING; // Intervals getting shorter = faster
    } else if (changeRatio > TEMPORAL_THRESHOLDS.TREND_THRESHOLD) {
      return TemporalTrend.DECELERATING; // Intervals getting longer = slower
    }

    // Check for erratic pattern (high variance)
    const variance = this._calculateVariance(recentIntervals);
    const mean = this.getAverageInterval(windowSize);
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    if (coefficientOfVariation > PHI_INV) {
      return TemporalTrend.ERRATIC;
    }

    return TemporalTrend.STEADY;
  }

  /**
   * Calculate variance of intervals
   * @param {number[]} intervals - Array of intervals
   * @returns {number} Variance
   * @private
   */
  _calculateVariance(intervals) {
    if (intervals.length < 2) return 0;

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const squaredDiffs = intervals.map(i => Math.pow(i - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
  }

  /**
   * Classify session duration
   * @returns {string} Duration category
   */
  classifySessionDuration() {
    const duration = this.getSessionDuration();

    if (duration < TEMPORAL_THRESHOLDS.SHORT_SESSION_MS) {
      return 'short';
    } else if (duration < TEMPORAL_THRESHOLDS.NORMAL_SESSION_MS) {
      return 'normal';
    } else if (duration < TEMPORAL_THRESHOLDS.LONG_SESSION_MS) {
      return 'long';
    } else {
      return 'very_long';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD TIME AWARENESS
  // "Le chien sait quelle heure il est dans le monde"
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current circadian phase based on local time
   * @param {Date} [date] - Date to check (defaults to now)
   * @returns {string} CircadianPhase value
   */
  getCircadianPhase(date = new Date()) {
    const hour = date.getHours();

    if (hour >= CIRCADIAN_HOURS.NIGHT_START || hour < CIRCADIAN_HOURS.EARLY_MORNING_START) {
      return hour >= CIRCADIAN_HOURS.NIGHT_START ? CircadianPhase.NIGHT : CircadianPhase.DEEP_NIGHT;
    } else if (hour < CIRCADIAN_HOURS.MORNING_START) {
      return CircadianPhase.EARLY_MORNING;
    } else if (hour < CIRCADIAN_HOURS.MIDDAY_START) {
      return CircadianPhase.MORNING;
    } else if (hour < CIRCADIAN_HOURS.AFTERNOON_START) {
      return CircadianPhase.MIDDAY;
    } else if (hour < CIRCADIAN_HOURS.EVENING_START) {
      return CircadianPhase.AFTERNOON;
    } else {
      return CircadianPhase.EVENING;
    }
  }

  /**
   * Get day type (weekday vs weekend)
   * @param {Date} [date] - Date to check (defaults to now)
   * @returns {string} DayType value
   */
  getDayType(date = new Date()) {
    const day = date.getDay();
    return (day === 0 || day === 6) ? DayType.WEEKEND : DayType.WEEKDAY;
  }

  /**
   * Get expected energy level based on circadian phase
   * Returns a value between 0 and 1 (φ⁻¹ max)
   * @param {string} [phase] - Circadian phase (defaults to current)
   * @returns {number} Expected energy (0-0.618)
   */
  getCircadianEnergy(phase = this.getCircadianPhase()) {
    const energyMap = {
      [CircadianPhase.DEEP_NIGHT]: PHI_INV_3,      // 23.6% - should be sleeping
      [CircadianPhase.EARLY_MORNING]: PHI_INV_2,  // 38.2% - waking up
      [CircadianPhase.MORNING]: PHI_INV,          // 61.8% - peak focus
      [CircadianPhase.MIDDAY]: PHI_INV_2,         // 38.2% - post-lunch dip
      [CircadianPhase.AFTERNOON]: PHI_INV * 0.9,  // ~55.6% - second wind
      [CircadianPhase.EVENING]: PHI_INV_2,        // 38.2% - winding down
      [CircadianPhase.NIGHT]: PHI_INV_3,          // 23.6% - should be relaxing
    };
    return energyMap[phase] || PHI_INV_2;
  }

  /**
   * Set last session end time (for inter-session gap calculation)
   * @param {number} timestamp - Last session end timestamp
   */
  setLastSessionEndTime(timestamp) {
    this._lastSessionEndTime = timestamp;
  }

  /**
   * Get time since last session ended
   * @returns {number|null} Milliseconds since last session, or null if unknown
   */
  getTimeSinceLastSession() {
    if (!this._lastSessionEndTime || !this._sessionStartTime) {
      return null;
    }
    return this._sessionStartTime - this._lastSessionEndTime;
  }

  /**
   * Classify inter-session gap
   * @returns {string|null} Gap category or null if unknown
   */
  classifyInterSessionGap() {
    const gap = this.getTimeSinceLastSession();
    if (gap === null) return null;

    const hours = gap / (1000 * 60 * 60);
    const days = hours / 24;

    if (hours < 1) {
      return 'quick_return';     // < 1 hour - quick break
    } else if (hours < 4) {
      return 'short_break';      // 1-4 hours - short break
    } else if (hours < 12) {
      return 'half_day';         // 4-12 hours - half day
    } else if (days < 1) {
      return 'same_day';         // 12-24 hours - same day
    } else if (days < 2) {
      return 'next_day';         // 1-2 days - next day
    } else if (days < 7) {
      return 'few_days';         // 2-7 days - few days
    } else if (days < 30) {
      return 'week_plus';        // 1-4 weeks
    } else {
      return 'long_absence';     // > 1 month
    }
  }

  /**
   * Get full world time state
   * @returns {Object} World time awareness data
   */
  getWorldTime() {
    const now = new Date();
    const phase = this.getCircadianPhase(now);
    const dayType = this.getDayType(now);
    const expectedEnergy = this.getCircadianEnergy(phase);
    const interSessionGap = this.classifyInterSessionGap();

    return {
      // Current time
      timestamp: now.getTime(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      dayOfWeek: now.getDay(),
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],

      // Classifications
      circadianPhase: phase,
      dayType,
      interSessionGap,

      // Expected baselines
      expectedEnergy,

      // Anomalies
      isLateNight: phase === CircadianPhase.DEEP_NIGHT || phase === CircadianPhase.NIGHT,
      isWeekendWork: dayType === DayType.WEEKEND,
      isEarlyMorning: phase === CircadianPhase.EARLY_MORNING,

      // Human readable
      humanReadable: {
        time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        phase: this._formatCircadianPhase(phase),
      },
    };
  }

  /**
   * Format circadian phase for display
   * @param {string} phase - CircadianPhase value
   * @returns {string} Human-readable phase name
   * @private
   */
  _formatCircadianPhase(phase) {
    const names = {
      [CircadianPhase.DEEP_NIGHT]: 'nuit profonde',
      [CircadianPhase.EARLY_MORNING]: 'petit matin',
      [CircadianPhase.MORNING]: 'matin',
      [CircadianPhase.MIDDAY]: 'midi',
      [CircadianPhase.AFTERNOON]: 'après-midi',
      [CircadianPhase.EVENING]: 'soir',
      [CircadianPhase.NIGHT]: 'nuit',
    };
    return names[phase] || phase;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL STATE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get complete temporal state for psychology inference
   * @returns {Object} Full temporal state
   */
  getTemporalState() {
    const timeSinceLastPrompt = this.getTimeSinceLastPrompt();
    const sessionDuration = this.getSessionDuration();
    const avgInterval = this.getAverageInterval();
    const tempo = this.getTempo();
    const trend = this.detectTrend();
    const currentState = this._classifyInterval(timeSinceLastPrompt);
    const sessionCategory = this.classifySessionDuration();
    const worldTime = this.getWorldTime();

    return {
      // Raw values
      timeSinceLastPromptMs: timeSinceLastPrompt,
      sessionDurationMs: sessionDuration,
      promptCount: this._promptTimestamps.length,
      averageIntervalMs: avgInterval,

      // Derived values
      tempo,                                    // Prompts per minute
      tempoCategory: this._classifyTempo(tempo),

      // Classifications
      currentState,                             // rapid, quick, steady, thoughtful, slow, idle
      trend,                                    // accelerating, steady, decelerating, erratic
      sessionCategory,                          // short, normal, long, very_long

      // World time awareness
      worldTime,

      // Signals for psychology
      signals: this._generateSignals(timeSinceLastPrompt, trend, sessionDuration, tempo, worldTime),

      // Human-readable
      humanReadable: {
        timeSinceLastPrompt: this._formatDuration(timeSinceLastPrompt),
        sessionDuration: this._formatDuration(sessionDuration),
        averageInterval: this._formatDuration(avgInterval),
        worldTime: worldTime.humanReadable,
      },

      // Confidence in temporal assessment (based on data quantity)
      confidence: Math.min(this._promptTimestamps.length / 10, PHI_INV),
    };
  }

  /**
   * Classify tempo into category
   * @param {number} tempo - Prompts per minute
   * @returns {string} Tempo category
   * @private
   */
  _classifyTempo(tempo) {
    if (tempo > TEMPORAL_THRESHOLDS.HIGH_TEMPO) {
      return 'high';
    } else if (tempo > TEMPORAL_THRESHOLDS.NORMAL_TEMPO) {
      return 'normal';
    } else if (tempo > TEMPORAL_THRESHOLDS.LOW_TEMPO) {
      return 'low';
    } else {
      return 'very_low';
    }
  }

  /**
   * Generate signals for psychology inference
   * @param {number} timeSinceLastPrompt - Time since last prompt
   * @param {string} trend - Temporal trend
   * @param {number} sessionDuration - Session duration
   * @param {number} tempo - Current tempo
   * @param {Object} [worldTime] - World time data
   * @returns {Object} Signals for psychology
   * @private
   */
  _generateSignals(timeSinceLastPrompt, trend, sessionDuration, tempo, worldTime = null) {
    const signals = {
      // Frustration signals
      possibleFrustration: false,
      frustrationConfidence: 0,

      // Fatigue signals
      possibleFatigue: false,
      fatigueConfidence: 0,

      // Flow signals
      possibleFlow: false,
      flowConfidence: 0,

      // Stuck signals
      possibleStuck: false,
      stuckConfidence: 0,

      // World time signals
      lateNightWork: false,
      lateNightConfidence: 0,
      weekendWork: false,
      lowCircadianEnergy: false,
      circadianMismatch: false,
    };

    // Frustration: rapid prompts + accelerating trend
    if (tempo > TEMPORAL_THRESHOLDS.HIGH_TEMPO && trend === TemporalTrend.ACCELERATING) {
      signals.possibleFrustration = true;
      signals.frustrationConfidence = Math.min(tempo / 5, PHI_INV);
    }

    // Fatigue: long session + decelerating trend
    if (sessionDuration > TEMPORAL_THRESHOLDS.VERY_LONG_SESSION_MS && trend === TemporalTrend.DECELERATING) {
      signals.possibleFatigue = true;
      signals.fatigueConfidence = Math.min(sessionDuration / (TEMPORAL_THRESHOLDS.VERY_LONG_SESSION_MS * 2), PHI_INV);
    }

    // Flow: steady trend + normal/quick tempo + reasonable session length
    if (trend === TemporalTrend.STEADY &&
        tempo >= TEMPORAL_THRESHOLDS.NORMAL_TEMPO &&
        tempo <= TEMPORAL_THRESHOLDS.HIGH_TEMPO &&
        sessionDuration > TEMPORAL_THRESHOLDS.SHORT_SESSION_MS) {
      signals.possibleFlow = true;
      signals.flowConfidence = Math.min(0.4 + (this._promptTimestamps.length / 20), PHI_INV);
    }

    // Stuck: long interval + long session
    if (timeSinceLastPrompt && timeSinceLastPrompt > TEMPORAL_THRESHOLDS.VERY_SLOW_PROMPT_MS) {
      signals.possibleStuck = true;
      signals.stuckConfidence = Math.min(timeSinceLastPrompt / (TEMPORAL_THRESHOLDS.VERY_SLOW_PROMPT_MS * 3), PHI_INV);
    }

    // World time signals
    if (worldTime) {
      // Late night work (22:00 - 05:00)
      if (worldTime.isLateNight) {
        signals.lateNightWork = true;
        // Confidence increases with session duration at night
        signals.lateNightConfidence = Math.min(
          PHI_INV_2 + (sessionDuration / (TEMPORAL_THRESHOLDS.NORMAL_SESSION_MS * 2)),
          PHI_INV
        );
        // Late night also increases fatigue likelihood
        if (!signals.possibleFatigue) {
          signals.possibleFatigue = true;
          signals.fatigueConfidence = Math.max(signals.fatigueConfidence, PHI_INV_2);
        }
      }

      // Weekend work
      if (worldTime.isWeekendWork) {
        signals.weekendWork = true;
      }

      // Low circadian energy phase
      if (worldTime.expectedEnergy < PHI_INV_2) {
        signals.lowCircadianEnergy = true;
      }

      // Circadian mismatch: high activity during low energy phases
      if (worldTime.expectedEnergy < PHI_INV_2 && tempo > TEMPORAL_THRESHOLDS.HIGH_TEMPO) {
        signals.circadianMismatch = true;
        // This could indicate urgency, stress, or deadline pressure
        if (!signals.possibleFrustration) {
          signals.possibleFrustration = true;
          signals.frustrationConfidence = Math.max(signals.frustrationConfidence, PHI_INV_2);
        }
      }
    }

    return signals;
  }

  /**
   * Format duration for human readability
   * @param {number|null} ms - Duration in milliseconds
   * @returns {string} Human-readable duration
   * @private
   */
  _formatDuration(ms) {
    if (ms === null || ms === undefined) {
      return 'N/A';
    }

    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else if (ms < 3600000) {
      return `${(ms / 60000).toFixed(1)}m`;
    } else {
      return `${(ms / 3600000).toFixed(1)}h`;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

/**
 * Get singleton TemporalPerception instance
 * @returns {TemporalPerception}
 */
function getTemporalPerception() {
  if (!_instance) {
    _instance = new TemporalPerception();
  }
  return _instance;
}

/**
 * Reset singleton (for testing)
 */
function resetTemporalPerception() {
  _instance = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  TemporalPerception,
  getTemporalPerception,
  resetTemporalPerception,
  TEMPORAL_THRESHOLDS,
  TemporalState,
  TemporalTrend,
  // World time constants
  CircadianPhase,
  DayType,
  CIRCADIAN_HOURS,
  // φ constants for external use
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3,
};

export default TemporalPerception;
