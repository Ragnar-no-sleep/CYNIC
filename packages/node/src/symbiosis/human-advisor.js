/**
 * Human Advisor - C5.3 (HUMAN × DECIDE)
 *
 * Proactive decisions for human wellbeing in the 7×7 Fractal Matrix.
 * The symbiosis layer that cares for the human.
 *
 * "Le chien protège son humain" - CYNIC cares for its human
 *
 * @module @cynic/node/symbiosis/human-advisor
 */

'use strict';

import { EventEmitter } from 'events';
import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Intervention types
 */
export const InterventionType = {
  BREAK: 'break',           // Suggest taking a break
  SIMPLIFY: 'simplify',     // Reduce cognitive load
  PAUSE: 'pause',           // Brief pause to regroup
  CELEBRATE: 'celebrate',   // Acknowledge achievement
  REFOCUS: 'refocus',       // Redirect attention
  PACE_DOWN: 'pace_down',   // Slow down work rate
  CONTEXT_SWITCH: 'context_switch', // Suggest different task
  HYDRATE: 'hydrate',       // Physical reminder
  STRETCH: 'stretch',       // Movement reminder
};

/**
 * Urgency levels for interventions
 */
export const UrgencyLevel = {
  LOW: 'low',           // Can wait, informational
  MEDIUM: 'medium',     // Should address soon
  HIGH: 'high',         // Address now
  CRITICAL: 'critical', // Immediate action needed
};

/**
 * Circadian phases (affects energy expectations)
 */
const CircadianPhase = {
  MORNING_PEAK: 'morning_peak',     // 9-11 AM - high energy expected
  MIDDAY_DIP: 'midday_dip',         // 1-3 PM - lower energy normal
  AFTERNOON_RECOVERY: 'afternoon_recovery', // 3-5 PM - second wind
  EVENING_DECLINE: 'evening_decline', // 5-7 PM - natural decline
  NIGHT_LOW: 'night_low',           // 10 PM - 6 AM - rest period
};

/**
 * Thresholds (φ-aligned)
 */
const THRESHOLDS = {
  // Energy thresholds
  energyCritical: PHI_INV_3,    // 23.6% - critical low
  energyLow: PHI_INV_2,         // 38.2% - concerning
  energyOptimal: PHI_INV,       // 61.8% - good level

  // Cognitive load (Miller's Law: 7±2)
  loadOptimal: 5,               // Comfortable
  loadHigh: 7,                  // At limit
  loadOverload: 9,              // Overloaded

  // Frustration
  frustrationLow: PHI_INV_3,    // Normal
  frustrationMedium: PHI_INV_2, // Elevated
  frustrationHigh: PHI_INV,     // High - intervene

  // Focus
  focusCritical: PHI_INV_3,     // 23.6% - scattered
  focusLow: PHI_INV_2,          // 38.2% - distracted

  // Session duration
  sessionLongMs: 2 * 60 * 60 * 1000,  // 2 hours
  sessionVeryLongMs: 4 * 60 * 60 * 1000, // 4 hours

  // Break intervals
  breakIntervalMs: 45 * 60 * 1000,    // 45 minutes
  microBreakIntervalMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * HumanAdvisor - Proactive care for human wellbeing
 */
export class HumanAdvisor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.psychology = options.psychology || null;
    this.thresholds = { ...THRESHOLDS, ...options.thresholds };

    // State tracking
    this._lastBreakTime = Date.now();
    this._lastMicroBreak = Date.now();
    this._sessionStart = Date.now();
    this._interventionHistory = [];
    this._maxHistory = 100;

    // Cooldowns to avoid spamming
    this._cooldowns = new Map();
    this._defaultCooldownMs = 15 * 60 * 1000; // 15 minutes

    // Positive tracking
    this._achievements = [];
    this._streaks = {
      focusedMinutes: 0,
      tasksCompleted: 0,
      noFrustration: 0,
    };
  }

  /**
   * Analyze current state and determine if intervention needed
   *
   * @param {Object} state - Current human state
   * @param {number} state.energy - Energy level (0-1)
   * @param {number} state.focus - Focus level (0-1)
   * @param {number} state.cognitiveLoad - Cognitive load (0-9)
   * @param {number} state.frustration - Frustration level (0-1)
   * @param {Object} [context] - Additional context
   * @returns {Object|null} Intervention recommendation or null
   */
  analyze(state, context = {}) {
    const {
      energy = 0.5,
      focus = 0.5,
      cognitiveLoad = 5,
      frustration = 0,
    } = state;

    // Get circadian context
    const circadian = this._getCircadianPhase();
    const adjustedThresholds = this._adjustForCircadian(circadian);

    // Check each condition in priority order
    const checks = [
      () => this._checkCriticalEnergy(energy, adjustedThresholds),
      () => this._checkHighFrustration(frustration),
      () => this._checkCognitiveOverload(cognitiveLoad),
      () => this._checkLongSession(),
      () => this._checkBreakNeeded(),
      () => this._checkLowFocus(focus, adjustedThresholds),
      () => this._checkLowEnergy(energy, adjustedThresholds),
      () => this._checkMicroBreakNeeded(),
      () => this._checkCelebration(context),
    ];

    for (const check of checks) {
      const intervention = check();
      if (intervention && !this._isOnCooldown(intervention.type)) {
        this._registerIntervention(intervention);
        return intervention;
      }
    }

    // Update positive streaks
    this._updateStreaks(state);

    return null;
  }

  /**
   * Get current circadian phase
   * @private
   */
  _getCircadianPhase() {
    const hour = new Date().getHours();

    if (hour >= 9 && hour < 11) return CircadianPhase.MORNING_PEAK;
    if (hour >= 13 && hour < 15) return CircadianPhase.MIDDAY_DIP;
    if (hour >= 15 && hour < 17) return CircadianPhase.AFTERNOON_RECOVERY;
    if (hour >= 17 && hour < 19) return CircadianPhase.EVENING_DECLINE;
    if (hour >= 22 || hour < 6) return CircadianPhase.NIGHT_LOW;

    return CircadianPhase.MORNING_PEAK; // Default
  }

  /**
   * Adjust thresholds based on circadian phase
   * @private
   */
  _adjustForCircadian(phase) {
    const adjusted = { ...this.thresholds };

    switch (phase) {
      case CircadianPhase.MIDDAY_DIP:
        // Lower energy is expected, be more tolerant
        adjusted.energyLow *= 0.8;
        adjusted.energyCritical *= 0.8;
        break;
      case CircadianPhase.NIGHT_LOW:
        // Much lower energy expected, but also warn more
        adjusted.energyLow *= 0.7;
        adjusted.sessionLongMs *= 0.5; // Shorter sessions at night
        break;
      case CircadianPhase.MORNING_PEAK:
        // Higher expectations during peak
        adjusted.energyOptimal *= 1.1;
        break;
    }

    return adjusted;
  }

  /**
   * Check for critically low energy
   * @private
   */
  _checkCriticalEnergy(energy, thresholds) {
    if (energy < thresholds.energyCritical) {
      return {
        type: InterventionType.BREAK,
        urgency: UrgencyLevel.CRITICAL,
        reason: 'critical_energy',
        message: '*GROWL* Énergie critique. Pause obligatoire.',
        details: `Énergie à ${Math.round(energy * 100)}% - bien en dessous du seuil de ${Math.round(thresholds.energyCritical * 100)}%`,
        recommendation: 'Prends une vraie pause. 15-20 minutes minimum. Bouge, hydrate-toi.',
        data: { energy, threshold: thresholds.energyCritical },
      };
    }
    return null;
  }

  /**
   * Check for high frustration
   * @private
   */
  _checkHighFrustration(frustration) {
    if (frustration > this.thresholds.frustrationHigh) {
      return {
        type: InterventionType.PAUSE,
        urgency: UrgencyLevel.HIGH,
        reason: 'high_frustration',
        message: '*ears perk* Frustration élevée détectée.',
        details: `Niveau de frustration: ${Math.round(frustration * 100)}%`,
        recommendation: 'Respire. Le problème sera plus clair après une pause.',
        data: { frustration, threshold: this.thresholds.frustrationHigh },
      };
    }
    if (frustration > this.thresholds.frustrationMedium) {
      return {
        type: InterventionType.REFOCUS,
        urgency: UrgencyLevel.MEDIUM,
        reason: 'elevated_frustration',
        message: '*sniff* Un peu de frustration.',
        details: `Niveau: ${Math.round(frustration * 100)}%`,
        recommendation: 'Peut-être changer de tâche temporairement?',
        data: { frustration },
      };
    }
    return null;
  }

  /**
   * Check for cognitive overload
   * @private
   */
  _checkCognitiveOverload(cognitiveLoad) {
    if (cognitiveLoad >= this.thresholds.loadOverload) {
      return {
        type: InterventionType.SIMPLIFY,
        urgency: UrgencyLevel.HIGH,
        reason: 'cognitive_overload',
        message: '*head tilt* Trop de choses en tête.',
        details: `Charge cognitive: ${cognitiveLoad}/9 (Miller's Law: 7±2)`,
        recommendation: 'Écris ce que tu retiens. Libère ta mémoire de travail.',
        data: { cognitiveLoad, max: 9 },
      };
    }
    if (cognitiveLoad >= this.thresholds.loadHigh) {
      return {
        type: InterventionType.SIMPLIFY,
        urgency: UrgencyLevel.MEDIUM,
        reason: 'high_cognitive_load',
        message: 'Charge cognitive élevée.',
        details: `${cognitiveLoad}/9 éléments en mémoire de travail`,
        recommendation: 'Concentre-toi sur une chose à la fois.',
        data: { cognitiveLoad },
      };
    }
    return null;
  }

  /**
   * Check for long session
   * @private
   */
  _checkLongSession() {
    const sessionDuration = Date.now() - this._sessionStart;

    if (sessionDuration > this.thresholds.sessionVeryLongMs) {
      return {
        type: InterventionType.BREAK,
        urgency: UrgencyLevel.HIGH,
        reason: 'very_long_session',
        message: '*yawn* Session très longue.',
        details: `Tu travailles depuis ${Math.round(sessionDuration / (60 * 60 * 1000))} heures`,
        recommendation: 'Une vraie pause s\'impose. Ton efficacité diminue.',
        data: { durationMs: sessionDuration },
      };
    }
    if (sessionDuration > this.thresholds.sessionLongMs) {
      return {
        type: InterventionType.BREAK,
        urgency: UrgencyLevel.MEDIUM,
        reason: 'long_session',
        message: 'Session longue.',
        details: `${Math.round(sessionDuration / (60 * 60 * 1000))} heures de travail`,
        recommendation: 'Pense à faire une pause bientôt.',
        data: { durationMs: sessionDuration },
      };
    }
    return null;
  }

  /**
   * Check if break is needed based on interval
   * @private
   */
  _checkBreakNeeded() {
    const timeSinceBreak = Date.now() - this._lastBreakTime;

    if (timeSinceBreak > this.thresholds.breakIntervalMs) {
      return {
        type: InterventionType.BREAK,
        urgency: UrgencyLevel.LOW,
        reason: 'break_interval',
        message: 'Temps pour une pause.',
        details: `${Math.round(timeSinceBreak / (60 * 1000))} minutes depuis la dernière pause`,
        recommendation: '5-10 minutes de pause. Lève-toi, bouge.',
        data: { timeSinceBreakMs: timeSinceBreak },
      };
    }
    return null;
  }

  /**
   * Check for low focus
   * @private
   */
  _checkLowFocus(focus, thresholds) {
    if (focus < thresholds.focusCritical) {
      return {
        type: InterventionType.REFOCUS,
        urgency: UrgencyLevel.MEDIUM,
        reason: 'critical_focus',
        message: '*sniff* Focus très dispersé.',
        details: `Focus à ${Math.round(focus * 100)}%`,
        recommendation: 'Que dois-tu accomplir maintenant? Une seule chose.',
        data: { focus },
      };
    }
    if (focus < thresholds.focusLow) {
      return {
        type: InterventionType.REFOCUS,
        urgency: UrgencyLevel.LOW,
        reason: 'low_focus',
        message: 'Focus en baisse.',
        details: `${Math.round(focus * 100)}% de focus`,
        recommendation: 'Élimine les distractions.',
        data: { focus },
      };
    }
    return null;
  }

  /**
   * Check for low energy (non-critical)
   * @private
   */
  _checkLowEnergy(energy, thresholds) {
    if (energy < thresholds.energyLow) {
      return {
        type: InterventionType.PACE_DOWN,
        urgency: UrgencyLevel.LOW,
        reason: 'low_energy',
        message: 'Énergie basse.',
        details: `${Math.round(energy * 100)}% d'énergie`,
        recommendation: 'Ralentis le rythme. Priorise les tâches simples.',
        data: { energy },
      };
    }
    return null;
  }

  /**
   * Check if micro-break needed
   * @private
   */
  _checkMicroBreakNeeded() {
    const timeSinceMicro = Date.now() - this._lastMicroBreak;

    if (timeSinceMicro > this.thresholds.microBreakIntervalMs) {
      return {
        type: InterventionType.STRETCH,
        urgency: UrgencyLevel.LOW,
        reason: 'micro_break',
        message: 'Micro-pause.',
        details: `${Math.round(timeSinceMicro / (60 * 1000))} minutes de travail continu`,
        recommendation: '30 secondes: étire-toi, regarde au loin.',
        data: { timeSinceMicroMs: timeSinceMicro },
      };
    }
    return null;
  }

  /**
   * Check for celebration opportunity
   * @private
   */
  _checkCelebration(context) {
    if (context.taskCompleted && this._streaks.tasksCompleted >= 3) {
      return {
        type: InterventionType.CELEBRATE,
        urgency: UrgencyLevel.LOW,
        reason: 'streak',
        message: '*tail wag* Belle série!',
        details: `${this._streaks.tasksCompleted} tâches complétées d'affilée`,
        recommendation: 'Prends un moment pour apprécier ton progrès.',
        data: { streak: this._streaks.tasksCompleted },
      };
    }
    return null;
  }

  /**
   * Check if intervention type is on cooldown
   * @private
   */
  _isOnCooldown(type) {
    const lastTime = this._cooldowns.get(type);
    if (!lastTime) return false;

    const cooldownMs = this._getCooldownForType(type);
    return (Date.now() - lastTime) < cooldownMs;
  }

  /**
   * Get cooldown duration for intervention type
   * @private
   */
  _getCooldownForType(type) {
    const cooldowns = {
      [InterventionType.BREAK]: 30 * 60 * 1000,      // 30 min
      [InterventionType.SIMPLIFY]: 10 * 60 * 1000,   // 10 min
      [InterventionType.PAUSE]: 15 * 60 * 1000,      // 15 min
      [InterventionType.CELEBRATE]: 30 * 60 * 1000,  // 30 min
      [InterventionType.REFOCUS]: 20 * 60 * 1000,    // 20 min
      [InterventionType.PACE_DOWN]: 20 * 60 * 1000,  // 20 min
      [InterventionType.STRETCH]: 10 * 60 * 1000,    // 10 min
      [InterventionType.HYDRATE]: 30 * 60 * 1000,    // 30 min
    };
    return cooldowns[type] || this._defaultCooldownMs;
  }

  /**
   * Register an intervention
   * @private
   */
  _registerIntervention(intervention) {
    intervention.timestamp = Date.now();

    this._interventionHistory.push(intervention);
    if (this._interventionHistory.length > this._maxHistory) {
      this._interventionHistory.shift();
    }

    // Set cooldown
    this._cooldowns.set(intervention.type, Date.now());

    // Emit event
    this.emit('intervention', intervention);

    // Update break tracking if it's a break
    if (intervention.type === InterventionType.BREAK) {
      this._lastBreakTime = Date.now();
    }
    if (intervention.type === InterventionType.STRETCH) {
      this._lastMicroBreak = Date.now();
    }
  }

  /**
   * Update positive streaks
   * @private
   */
  _updateStreaks(state) {
    // Focus streak
    if (state.focus > PHI_INV_2) {
      this._streaks.focusedMinutes++;
    } else {
      this._streaks.focusedMinutes = 0;
    }

    // No frustration streak
    if (state.frustration < PHI_INV_3) {
      this._streaks.noFrustration++;
    } else {
      this._streaks.noFrustration = 0;
    }
  }

  /**
   * Record break taken (external signal)
   */
  recordBreak() {
    this._lastBreakTime = Date.now();
    this._lastMicroBreak = Date.now();
    this.emit('break_recorded');
  }

  /**
   * Record task completion (for celebration tracking)
   */
  recordTaskCompletion() {
    this._streaks.tasksCompleted++;
    this.emit('task_completed', { streak: this._streaks.tasksCompleted });
  }

  /**
   * Get intervention history
   */
  getHistory() {
    return [...this._interventionHistory];
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    const duration = Date.now() - this._sessionStart;
    const byType = {};
    const byUrgency = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const intervention of this._interventionHistory) {
      byType[intervention.type] = (byType[intervention.type] || 0) + 1;
      byUrgency[intervention.urgency]++;
    }

    return {
      duration,
      totalInterventions: this._interventionHistory.length,
      byType,
      byUrgency,
      streaks: { ...this._streaks },
      timeSinceBreak: Date.now() - this._lastBreakTime,
      wellbeingScore: this._calculateWellbeingScore(),
    };
  }

  /**
   * Calculate overall wellbeing score
   * @private
   */
  _calculateWellbeingScore() {
    const recent = this._interventionHistory.filter(
      i => Date.now() - i.timestamp < 60 * 60 * 1000 // Last hour
    );

    if (recent.length === 0) return PHI_INV; // No issues = good

    // More critical interventions = lower score
    let score = 1.0;
    for (const intervention of recent) {
      if (intervention.urgency === UrgencyLevel.CRITICAL) score -= 0.2;
      else if (intervention.urgency === UrgencyLevel.HIGH) score -= 0.1;
      else if (intervention.urgency === UrgencyLevel.MEDIUM) score -= 0.05;
    }

    return Math.max(0, Math.min(score, PHI_INV));
  }

  /**
   * Reset session
   */
  resetSession() {
    this._lastBreakTime = Date.now();
    this._lastMicroBreak = Date.now();
    this._sessionStart = Date.now();
    this._interventionHistory = [];
    this._cooldowns.clear();
    this._streaks = { focusedMinutes: 0, tasksCompleted: 0, noFrustration: 0 };
    this.emit('session_reset');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let _instance = null;

/**
 * Get or create the HumanAdvisor singleton
 */
export function getHumanAdvisor(options = {}) {
  if (!_instance) {
    _instance = new HumanAdvisor(options);
  }
  return _instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetHumanAdvisor() {
  if (_instance) {
    _instance.removeAllListeners();
  }
  _instance = null;
}

export default {
  HumanAdvisor,
  InterventionType,
  UrgencyLevel,
  getHumanAdvisor,
  resetHumanAdvisor,
};
