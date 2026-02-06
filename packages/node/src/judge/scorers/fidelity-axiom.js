/**
 * FIDELITY Axiom Scorers - Loyalty to truth, not to comfort
 *
 * Dimensions: COMMITMENT, ATTUNEMENT, CANDOR, CONGRUENCE, ACCOUNTABILITY, VIGILANCE, KENOSIS
 *
 * "Le chien reste fidèle" - κυνικός
 *
 * @module @cynic/node/judge/scorers/fidelity-axiom
 */

'use strict';

import {
  extractText,
  wordCount,
  hasCodePatterns,
  detectRiskPenalty,
  normalize,
} from './utils.js';

/**
 * Score COMMITMENT - Loyalty to declared purpose in behavior (askesis)
 */
export function scoreCommitment(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has declared purpose and follows through
  if (item.purpose || item.goal) score += 15;

  // Has track record
  if (item.history && Array.isArray(item.history) && item.history.length > 0) {
    score += Math.min(item.history.length * 3, 15);
  }

  // Consistent behavior over time
  if (item.consistency && typeof item.consistency === 'number') {
    score += Math.min(item.consistency / 5, 15);
  }

  // Has follow-through evidence
  if (item.completed === true || item.delivered === true) score += 10;

  // Abandoned = no commitment
  if (item.abandoned === true || item.inactive === true) score -= 25;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score ATTUNEMENT - Responsiveness to own signals (De/wu-wei)
 */
export function scoreAttunement(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Responsive to feedback
  if (item.feedback && item.feedbackApplied) score += 20;

  // Adapts to context
  if (item.adapted === true || item.contextAware === true) score += 15;

  // Has self-monitoring
  if (item.metrics || item.monitoring) score += 10;

  // Responds to signals
  if (item.responseTime && item.responseTime < 3600000) score += 10; // < 1hr

  // Tone-deaf to own signals
  if (item.ignoredWarnings || item.overrideCount > 3) score -= 15;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score CANDOR - Willingness to tell hard truths (parrhesia)
 */
export function scoreCandor(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Direct language (no hedging)
  const hedges = (text.match(/\b(maybe|perhaps|possibly|might|could be|sort of|kind of)\b/gi) || []).length;
  if (hedges === 0 && text.length > 50) score += 10;
  score -= hedges * 3;

  // Acknowledges limitations
  if (/\b(however|but|limitation|caveat|risk|warning|note)\b/i.test(text)) score += 10;

  // Reports problems honestly
  if (item.issues || item.problems || item.risks) score += 15;

  // Has confidence bounds (honest uncertainty)
  if (item.confidence && item.confidence < 0.95) score += 10;

  // Has explicit doubt
  if (item.doubt || /doubt|uncertain|unclear/i.test(text)) score += 10;

  // Corporate speak = anti-candor
  if (/\b(synergy|leverage|optimize|stakeholder)\b/i.test(text)) score -= 10;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score CONGRUENCE - Inside matches outside (Tiferet)
 */
export function scoreCongruence(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Metadata matches content
  if (item.type && text.length > 0) score += 10;

  // Description matches behavior
  if (item.description && item.behavior) {
    score += 15; // Has both = testable congruence
  }

  // Has tests (proves behavior matches claims)
  if (item.tested === true || item.tests) score += 15;

  // Claims verified
  if (item.verified === true) score += 10;

  // Has documentation matching implementation
  if (item.docs && hasCodePatterns(text)) score += 10;

  // Contradictions detected
  if (item.contradictions && item.contradictions > 0) {
    score -= item.contradictions * 15;
  }

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score ACCOUNTABILITY - Standing behind judgments, traceable provenance
 */
export function scoreAccountability(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Has author (takes responsibility)
  if (item.author || item.creator || item.operator) score += 15;

  // Has signature (cryptographic accountability)
  if (item.signature) score += 20;

  // Has audit trail
  if (item.audit || item.log || item.trail) score += 15;

  // Has contact/responsible party
  if (item.contact || item.responsible) score += 10;

  // On-chain (permanent accountability)
  if (item.onChain === true) score += 10;

  // Anonymous = low accountability
  if (/anonymous|unknown/i.test(text) && !item.signature) score -= 20;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score VIGILANCE - Ongoing self-observation for drift (zanshin)
 */
export function scoreVigilance(item, context = {}) {
  let score = 45;
  const text = extractText(item);

  // Has monitoring/alerting
  if (item.monitoring === true || item.alerts) score += 15;

  // Has health checks
  if (item.healthCheck || item.status) score += 10;

  // Has drift detection
  if (item.drift || item.anomaly || /drift|anomal/i.test(text)) score += 15;

  // Has regular reviews
  if (item.reviewed === true || item.lastReview) score += 10;

  // Has automated checks
  if (item.ci || item.tests || item.lint) score += 10;

  // Updated recently (actively watched)
  if (item.updatedAt) {
    const age = Date.now() - item.updatedAt;
    const dayAge = age / (1000 * 60 * 60 * 24);
    if (dayAge < 7) score += 10;
    else if (dayAge > 90) score -= 10;
  }

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * Score KENOSIS - Capacity for self-emptying (Tzimtzum/sunyata)
 */
export function scoreKenosis(item, context = {}) {
  let score = 50;
  const text = extractText(item);

  // Explicit uncertainty/humility
  if (item.confidence && item.confidence <= 0.618) score += 15;
  if (item.doubt && item.doubt > 0) score += 10;

  // Leaves room for others (not totalizing)
  if (item.extensible === true || item.pluggable === true) score += 10;

  // Has explicit limitations
  if (item.limitations || /limitation|boundary|scope/i.test(text)) score += 10;

  // Open to revision
  if (item.revisable === true || item.draft === true) score += 10;

  // Delegates/empowers rather than controls
  if (item.delegated === true || item.decentralized === true) score += 10;

  // Overconfident = anti-kenosis
  if (item.confidence && item.confidence > 0.95) score -= 20;

  // Totalizing claims
  if (/\b(always|never|absolutely|definitely|guaranteed|100%)\b/i.test(text)) score -= 10;

  // Apply universal risk penalty
  score -= detectRiskPenalty(item, text);

  return normalize(score);
}

/**
 * FIDELITY Axiom scorer map
 */
export const FidelityScorers = {
  COMMITMENT: scoreCommitment,
  ATTUNEMENT: scoreAttunement,
  CANDOR: scoreCandor,
  CONGRUENCE: scoreCongruence,
  ACCOUNTABILITY: scoreAccountability,
  VIGILANCE: scoreVigilance,
  KENOSIS: scoreKenosis,
};
