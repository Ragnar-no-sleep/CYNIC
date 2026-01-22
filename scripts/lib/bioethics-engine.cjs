#!/usr/bin/env node

/**
 * Bioethics Engine - Phase 36A
 * 
 * Ethical issues in medicine and life sciences:
 * - Beginning of life (abortion, embryo research)
 * - End of life (euthanasia, death criteria)
 * - Enhancement (genetic, cognitive, physical)
 * - Research ethics (consent, risk)
 * 
 * φ-bounded: max 61.8% confidence
 */

const fs = require('fs');
const path = require('path');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// State
const state = {
  initialized: false,
  issues: new Map(),
  principles: new Map(),
  analyses: [],
  stats: {
    issuesRegistered: 0,
    principlesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'bioethics-engine');

/**
 * Initialize bioethics engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '36A' };
  }
  
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  registerPrinciples();
  registerIssues();
  
  state.initialized = true;
  return { status: 'initialized', phase: '36A', engine: 'bioethics' };
}

/**
 * Register bioethical principles
 */
function registerPrinciples() {
  state.principles.set('autonomy', {
    name: 'Respect for Autonomy',
    description: 'Respect individuals\' right to make their own decisions',
    source: 'Beauchamp & Childress',
    applications: ['Informed consent', 'Advance directives', 'Refusal of treatment'],
    tensions: ['Paternalism', 'Third-party harm', 'Diminished capacity']
  });
  
  state.principles.set('beneficence', {
    name: 'Beneficence',
    description: 'Act in the patient\'s best interest',
    source: 'Beauchamp & Childress',
    applications: ['Treatment decisions', 'Resource allocation', 'Research design'],
    tensions: ['Patient autonomy', 'Cost constraints', 'Uncertainty']
  });
  
  state.principles.set('nonmaleficence', {
    name: 'Non-maleficence',
    description: 'Do no harm (primum non nocere)',
    source: 'Hippocratic tradition',
    applications: ['Risk-benefit analysis', 'Side effects', 'Treatment withdrawal'],
    tensions: ['Aggressive treatment', 'Letting die vs killing', 'Double effect']
  });
  
  state.principles.set('justice', {
    name: 'Justice',
    description: 'Fair distribution of benefits and burdens',
    source: 'Beauchamp & Childress',
    applications: ['Resource allocation', 'Access to care', 'Research subject selection'],
    tensions: ['Scarcity', 'Competing claims', 'Individual vs population']
  });
  
  state.principles.set('sanctity-of-life', {
    name: 'Sanctity of Life',
    description: 'Human life has intrinsic value',
    source: 'Religious and secular traditions',
    applications: ['Abortion', 'Euthanasia', 'Capital punishment'],
    tensions: ['Quality of life', 'Autonomy', 'Suffering']
  });
  
  state.principles.set('quality-of-life', {
    name: 'Quality of Life',
    description: 'Life value depends on its quality',
    source: 'Utilitarian tradition',
    applications: ['End-of-life decisions', 'Disability', 'Enhancement'],
    tensions: ['Sanctity of life', 'Who judges quality?', 'Disability rights']
  });
  
  state.stats.principlesRegistered = state.principles.size;
}

/**
 * Register bioethical issues
 */
function registerIssues() {
  // Beginning of life
  state.issues.set('abortion', {
    name: 'Abortion',
    category: 'beginning-of-life',
    question: 'Is abortion morally permissible?',
    positions: {
      proLife: {
        claim: 'Abortion is morally wrong',
        arguments: ['Fetus is a person', 'Right to life from conception', 'Potential personhood'],
        strength: PHI_INV_2
      },
      proChoice: {
        claim: 'Abortion is morally permissible',
        arguments: ['Bodily autonomy', 'Personhood develops gradually', 'Thomson\'s violinist'],
        strength: PHI_INV_2
      },
      graduated: {
        claim: 'Moral status increases with development',
        arguments: ['Viability threshold', 'Sentience criterion', 'Developmental stages'],
        strength: PHI_INV
      }
    },
    keyArguments: {
      thomson: 'Even if fetus is a person, bodily autonomy permits abortion (violinist)',
      marquis: 'Abortion deprives fetus of valuable future',
      warren: 'Personhood requires cognitive criteria fetus lacks'
    },
    consensus: 'No philosophical consensus; deeply contested'
  });
  
  state.issues.set('embryo-research', {
    name: 'Embryo Research',
    category: 'beginning-of-life',
    question: 'Is research on human embryos permissible?',
    positions: {
      permissive: {
        claim: 'Embryo research is permissible with limits',
        arguments: ['Benefits outweigh harms', 'Early embryos lack moral status', '14-day rule'],
        strength: PHI_INV
      },
      restrictive: {
        claim: 'Embryo research is impermissible',
        arguments: ['Embryos have full moral status', 'Instrumentalization', 'Slippery slope'],
        strength: PHI_INV_2
      }
    },
    regulations: {
      fourteenDayRule: 'Research permitted until primitive streak (14 days)',
      rationale: 'Before individuation, twinning possible'
    },
    consensus: 'Most jurisdictions allow with restrictions'
  });
  
  // End of life
  state.issues.set('euthanasia', {
    name: 'Euthanasia',
    category: 'end-of-life',
    question: 'Is euthanasia morally permissible?',
    distinctions: {
      active: 'Directly causing death',
      passive: 'Withdrawing treatment',
      voluntary: 'At patient\'s request',
      nonVoluntary: 'Without patient\'s consent (incompetent)',
      involuntary: 'Against patient\'s wishes'
    },
    positions: {
      permissive: {
        claim: 'Voluntary euthanasia can be permissible',
        arguments: ['Autonomy', 'Mercy', 'No morally relevant difference from letting die'],
        strength: PHI_INV
      },
      restrictive: {
        claim: 'Euthanasia is impermissible',
        arguments: ['Sanctity of life', 'Slippery slope', 'Role of medicine', 'Palliative alternatives'],
        strength: PHI_INV_2
      }
    },
    doctrineDoubleEffect: {
      claim: 'Foreseeing death differs from intending it',
      application: 'Pain relief that hastens death may be permissible'
    },
    consensus: 'Increasing acceptance of voluntary euthanasia in some jurisdictions'
  });
  
  state.issues.set('death-criteria', {
    name: 'Death Criteria',
    category: 'end-of-life',
    question: 'When is a person dead?',
    criteria: {
      cardiopulmonary: 'Irreversible cessation of heart and lungs',
      wholeBrain: 'Irreversible cessation of all brain functions',
      higherBrain: 'Irreversible loss of consciousness',
      biological: 'Loss of integrated organismic functioning'
    },
    debate: {
      issue: 'Is brain death really death?',
      challenge: 'Brain-dead bodies maintain many biological functions',
      implication: 'Affects organ transplantation ethics'
    },
    consensus: 'Whole-brain death legally accepted, philosophically debated'
  });
  
  // Enhancement
  state.issues.set('genetic-enhancement', {
    name: 'Genetic Enhancement',
    category: 'enhancement',
    question: 'Is genetic enhancement permissible?',
    distinction: {
      therapy: 'Treating disease or disability',
      enhancement: 'Improving beyond normal function'
    },
    positions: {
      transhumanist: {
        claim: 'Enhancement should be pursued',
        arguments: ['Morphological freedom', 'Benefits outweigh risks', 'Already enhance in other ways'],
        strength: PHI_INV_2
      },
      bioconservative: {
        claim: 'Enhancement threatens human nature',
        arguments: ['Playing God', 'Inequality', 'Unknown risks', 'Authentic humanity'],
        strength: PHI_INV_2
      },
      moderate: {
        claim: 'Some enhancements permissible with limits',
        arguments: ['Case-by-case', 'Justice constraints', 'Therapy-enhancement unclear'],
        strength: PHI_INV
      }
    },
    sandel: 'Enhancement reflects problematic desire for mastery',
    savulescu: 'We have obligation to enhance (procreative beneficence)',
    consensus: 'Deeply contested; therapy-enhancement line blurry'
  });
  
  state.issues.set('cognitive-enhancement', {
    name: 'Cognitive Enhancement',
    category: 'enhancement',
    question: 'Is cognitive enhancement permissible?',
    methods: ['Pharmaceuticals', 'Neurostimulation', 'Genetic modification', 'Brain-computer interfaces'],
    concerns: {
      authenticity: 'Is enhanced performance really "yours"?',
      fairness: 'Creates unfair advantages',
      coercion: 'Pressure to enhance',
      identity: 'Changes who you are'
    },
    positions: {
      permissive: { claim: 'Like caffeine and education, enhancement is fine', strength: PHI_INV_2 },
      restrictive: { claim: 'Risks to authenticity and equality', strength: PHI_INV_2 }
    },
    consensus: 'Growing acceptance of mild enhancement, concern about radical enhancement'
  });
  
  state.stats.issuesRegistered = state.issues.size;
}

/**
 * Get a principle
 */
function getPrinciple(principleId) {
  return state.principles.get(principleId) || null;
}

/**
 * Get an issue
 */
function getIssue(issueId) {
  return state.issues.get(issueId) || null;
}

/**
 * List principles
 */
function listPrinciples() {
  return Array.from(state.principles.entries()).map(([id, p]) => ({ id, ...p }));
}

/**
 * List issues
 */
function listIssues(category = null) {
  const issues = Array.from(state.issues.entries()).map(([id, i]) => ({ id, ...i }));
  if (category) return issues.filter(i => i.category === category);
  return issues;
}

/**
 * Analyze a bioethical case
 */
function analyzeCase(caseDescription) {
  state.stats.analysesPerformed++;
  
  const relevantPrinciples = [];
  const tensions = [];
  
  // Check which principles apply
  const desc = caseDescription.toLowerCase();
  
  if (desc.includes('consent') || desc.includes('choice') || desc.includes('decision')) {
    relevantPrinciples.push('autonomy');
  }
  if (desc.includes('benefit') || desc.includes('help') || desc.includes('treatment')) {
    relevantPrinciples.push('beneficence');
  }
  if (desc.includes('harm') || desc.includes('risk') || desc.includes('side effect')) {
    relevantPrinciples.push('nonmaleficence');
  }
  if (desc.includes('fair') || desc.includes('resource') || desc.includes('access')) {
    relevantPrinciples.push('justice');
  }
  if (desc.includes('life') || desc.includes('death') || desc.includes('kill')) {
    relevantPrinciples.push('sanctity-of-life');
    relevantPrinciples.push('quality-of-life');
  }
  
  // Check for tensions
  if (relevantPrinciples.includes('autonomy') && relevantPrinciples.includes('beneficence')) {
    tensions.push({ between: ['autonomy', 'beneficence'], issue: 'Patient choice vs best interest' });
  }
  if (relevantPrinciples.includes('sanctity-of-life') && relevantPrinciples.includes('quality-of-life')) {
    tensions.push({ between: ['sanctity-of-life', 'quality-of-life'], issue: 'Preserving life vs quality considerations' });
  }
  
  return {
    case: caseDescription,
    relevantPrinciples: relevantPrinciples.map(id => ({ id, ...state.principles.get(id) })),
    tensions,
    recommendation: tensions.length > 0 
      ? 'Principle balancing required; no algorithm resolves tensions'
      : 'Apply relevant principles; monitor for emerging tensions',
    confidence: PHI_INV_2,
    cynicNote: '*head tilt* Bioethics rarely yields clean answers. Principles guide, not dictate.'
  };
}

/**
 * Compare positions on an issue
 */
function comparePositions(issueId) {
  const issue = state.issues.get(issueId);
  if (!issue) return { error: 'Issue not found' };
  
  const positions = Object.entries(issue.positions || {}).map(([key, pos]) => ({
    name: key,
    claim: pos.claim,
    arguments: pos.arguments,
    strength: pos.strength
  }));
  
  return {
    issue: issue.name,
    question: issue.question,
    positions,
    consensus: issue.consensus,
    cynicVerdict: '*sniff* Reasonable people disagree. φ-bounded confidence applies.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  BIOETHICS ENGINE                        Phase 36A     │
├─────────────────────────────────────────────────────────┤
│  Issues Registered: ${String(state.stats.issuesRegistered).padStart(3)}                              │
│  Principles: ${String(state.stats.principlesRegistered).padStart(3)}                                    │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Categories:                                            │
│    - Beginning of life (abortion, embryo)               │
│    - End of life (euthanasia, death)                    │
│    - Enhancement (genetic, cognitive)                   │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *sniff* Life and death require humility                │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    issues: state.stats.issuesRegistered,
    principles: state.stats.principlesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getPrinciple,
  getIssue,
  listPrinciples,
  listIssues,
  analyzeCase,
  comparePositions,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
