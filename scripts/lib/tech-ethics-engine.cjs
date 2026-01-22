#!/usr/bin/env node

/**
 * Tech Ethics Engine - Phase 36C
 * 
 * Ethics of technology:
 * - AI ethics (alignment, bias, autonomy)
 * - Privacy and surveillance
 * - Digital autonomy and manipulation
 * - Algorithmic fairness
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

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'tech-ethics-engine');

/**
 * Initialize tech ethics engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '36C' };
  }
  
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  registerPrinciples();
  registerIssues();
  
  state.initialized = true;
  return { status: 'initialized', phase: '36C', engine: 'tech-ethics' };
}

/**
 * Register tech ethics principles
 */
function registerPrinciples() {
  state.principles.set('transparency', {
    name: 'Transparency',
    description: 'Systems should be understandable and explainable',
    applications: ['Algorithmic decisions', 'Data collection', 'AI reasoning'],
    tensions: ['Trade secrets', 'Security', 'Complexity'],
    importance: PHI_INV
  });
  
  state.principles.set('accountability', {
    name: 'Accountability',
    description: 'Clear responsibility for system outcomes',
    applications: ['Autonomous vehicles', 'Medical AI', 'Criminal justice algorithms'],
    tensions: ['Diffused responsibility', 'Black boxes', 'Many-hands problem'],
    importance: PHI_INV
  });
  
  state.principles.set('fairness', {
    name: 'Fairness',
    description: 'Systems should not discriminate unfairly',
    applications: ['Hiring algorithms', 'Loan decisions', 'Predictive policing'],
    tensions: ['Multiple definitions of fairness', 'Historical bias in data', 'Accuracy tradeoffs'],
    importance: PHI_INV
  });
  
  state.principles.set('privacy', {
    name: 'Privacy',
    description: 'Right to control personal information',
    applications: ['Data collection', 'Surveillance', 'Facial recognition'],
    tensions: ['Security needs', 'Business models', 'Social benefits'],
    importance: PHI_INV
  });
  
  state.principles.set('autonomy', {
    name: 'Digital Autonomy',
    description: 'Freedom from manipulation and undue influence',
    applications: ['Recommendation algorithms', 'Dark patterns', 'Targeted advertising'],
    tensions: ['Personalization benefits', 'Free speech', 'Business interests'],
    importance: PHI_INV
  });
  
  state.principles.set('beneficence', {
    name: 'Beneficence',
    description: 'Technology should benefit humanity',
    applications: ['AI development', 'Research priorities', 'Deployment decisions'],
    tensions: ['Whose benefit?', 'Short vs long term', 'Unintended consequences'],
    importance: PHI_INV
  });
  
  state.principles.set('safety', {
    name: 'Safety',
    description: 'Systems should not cause harm',
    applications: ['AI alignment', 'Autonomous systems', 'Cybersecurity'],
    tensions: ['Innovation speed', 'Defining harm', 'Unknown risks'],
    importance: PHI_INV
  });
  
  state.stats.principlesRegistered = state.principles.size;
}

/**
 * Register tech ethics issues
 */
function registerIssues() {
  // AI Ethics
  state.issues.set('ai-alignment', {
    name: 'AI Alignment',
    category: 'ai-ethics',
    question: 'How do we ensure AI systems pursue human values?',
    problems: {
      specification: 'Difficulty specifying human values precisely',
      mesa: 'Systems may develop misaligned sub-goals',
      distributional: 'Whose values? Which humans?',
      corrigibility: 'Keeping AI controllable and correctable'
    },
    approaches: {
      valueAlignment: 'Directly encode human values',
      inverseRL: 'Learn values from human behavior',
      debate: 'Use AI to critique AI',
      constitutionalAI: 'Train with explicit principles'
    },
    risks: ['Existential risk', 'Subtle misalignment', 'Power concentration'],
    consensus: 'Critical problem; no consensus on solution',
    strength: PHI_INV
  });
  
  state.issues.set('ai-consciousness', {
    name: 'AI Consciousness',
    category: 'ai-ethics',
    question: 'Could AI systems be conscious or sentient?',
    implications: {
      ifConscious: 'Moral status, rights, obligations',
      ifNotConscious: 'No intrinsic moral status',
      uncertainty: 'How to act under uncertainty?'
    },
    positions: {
      skeptic: { claim: 'Current AI cannot be conscious', strength: PHI_INV_2 },
      agnostic: { claim: 'We cannot know if AI is conscious', strength: PHI_INV },
      credulous: { claim: 'Advanced AI may be conscious', strength: PHI_INV_3 }
    },
    precautionaryPrinciple: 'Under uncertainty, err toward moral consideration',
    consensus: 'Highly uncertain; mostly skepticism about current systems'
  });
  
  state.issues.set('algorithmic-bias', {
    name: 'Algorithmic Bias',
    category: 'ai-ethics',
    question: 'How should we address bias in algorithms?',
    sources: {
      historicalData: 'Training data reflects past discrimination',
      proxyVariables: 'Neutral features correlate with protected classes',
      designChoices: 'Whose interests are prioritized?',
      feedback: 'Systems can amplify existing inequalities'
    },
    fairnessDefinitions: {
      demographicParity: 'Equal outcomes across groups',
      equalizedOdds: 'Equal error rates across groups',
      individualFairness: 'Similar individuals treated similarly',
      tension: 'These definitions are often mathematically incompatible'
    },
    responses: ['Bias audits', 'Diverse teams', 'Algorithmic accountability', 'Human oversight'],
    consensus: 'Problem widely recognized; solutions contested'
  });
  
  // Privacy
  state.issues.set('surveillance', {
    name: 'Surveillance Ethics',
    category: 'privacy',
    question: 'What surveillance is ethically permissible?',
    types: ['Government', 'Corporate', 'Social', 'Self-surveillance'],
    concerns: {
      chilling: 'Surveillance inhibits free expression',
      power: 'Information asymmetry creates power imbalance',
      dignity: 'Being watched violates human dignity',
      manipulation: 'Surveillance enables manipulation'
    },
    arguments: {
      security: 'Necessary for preventing harm',
      consent: 'Permissible with informed consent',
      transparency: 'Reciprocal transparency can justify',
      necessity: 'Only when strictly necessary'
    },
    consensus: 'Some surveillance permissible; scope contested'
  });
  
  state.issues.set('data-ownership', {
    name: 'Data Ownership',
    category: 'privacy',
    question: 'Who owns personal data?',
    positions: {
      individual: { claim: 'Individuals own their data', implications: 'Right to control, sell, delete' },
      collective: { claim: 'Data is a social resource', implications: 'Data trusts, commons' },
      corporate: { claim: 'Those who collect/process own it', implications: 'Current default' },
      noOwnership: { claim: 'Data should not be owned', implications: 'Focus on use restrictions' }
    },
    frameworks: ['Property rights', 'Privacy rights', 'Labor theory', 'Fiduciary duties'],
    consensus: 'No consensus; different jurisdictions vary'
  });
  
  // Digital autonomy
  state.issues.set('manipulation', {
    name: 'Digital Manipulation',
    category: 'autonomy',
    question: 'When does persuasion become manipulation?',
    techniques: {
      darkPatterns: 'Interface designs that trick users',
      targeting: 'Exploiting individual vulnerabilities',
      addiction: 'Designing for compulsive use',
      filterBubbles: 'Limiting exposure to other views'
    },
    lineDrawing: {
      persuasion: 'Appeals to reason, legitimate',
      manipulation: 'Exploits cognitive weaknesses, problematic',
      coercion: 'Removes choice, clearly wrong'
    },
    autonomyTheories: {
      procedural: 'Manipulation undermines rational deliberation',
      substantive: 'Some choices should be protected regardless',
      relational: 'Autonomy requires supportive social conditions'
    },
    consensus: 'Dark patterns widely condemned; subtler cases contested'
  });
  
  state.issues.set('attention-economy', {
    name: 'Attention Economy Ethics',
    category: 'autonomy',
    question: 'Is it ethical to compete for human attention?',
    concerns: [
      'Mental health impacts',
      'Democratic deliberation quality',
      'Childhood development',
      'Productivity and flourishing'
    ],
    defenses: [
      'User agency and choice',
      'Free market in attention',
      'Beneficial information access'
    ],
    proposals: ['Attention taxes', 'Design regulations', 'Digital literacy', 'Time well spent metrics'],
    consensus: 'Growing concern; little consensus on solutions'
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
 * Analyze a technology
 */
function analyzeTechnology(techDescription) {
  state.stats.analysesPerformed++;
  
  const desc = techDescription.toLowerCase();
  const relevantPrinciples = [];
  const concerns = [];
  
  // Check relevant principles
  if (desc.includes('ai') || desc.includes('algorithm') || desc.includes('machine learning')) {
    relevantPrinciples.push('transparency', 'accountability', 'fairness', 'safety');
    concerns.push('Bias', 'Explainability', 'Alignment');
  }
  
  if (desc.includes('data') || desc.includes('collect') || desc.includes('track')) {
    relevantPrinciples.push('privacy', 'transparency');
    concerns.push('Data protection', 'Consent', 'Purpose limitation');
  }
  
  if (desc.includes('recommend') || desc.includes('feed') || desc.includes('social')) {
    relevantPrinciples.push('autonomy', 'transparency');
    concerns.push('Filter bubbles', 'Manipulation', 'Addiction');
  }
  
  if (desc.includes('autonomous') || desc.includes('robot') || desc.includes('self-driving')) {
    relevantPrinciples.push('safety', 'accountability');
    concerns.push('Liability', 'Safety testing', 'Human oversight');
  }
  
  // Default if nothing matched
  if (relevantPrinciples.length === 0) {
    relevantPrinciples.push('beneficence', 'safety');
    concerns.push('General ethical review needed');
  }
  
  // Deduplicate
  const uniquePrinciples = [...new Set(relevantPrinciples)];
  
  return {
    technology: techDescription,
    relevantPrinciples: uniquePrinciples.map(id => ({ id, ...state.principles.get(id) })),
    concerns: [...new Set(concerns)],
    recommendation: 'Apply relevant principles; consult stakeholders; monitor outcomes',
    confidence: PHI_INV_2,
    cynicNote: '*sniff* Technology moves fast; ethics must keep pace. φ-bounded assessment.'
  };
}

/**
 * Analyze AI ethics scenario
 */
function analyzeAIScenario(scenario) {
  state.stats.analysesPerformed++;
  
  return {
    scenario,
    frameworkApplication: {
      consequentialist: 'Evaluate outcomes for all affected parties',
      deontological: 'Check duties and rights respected',
      virtueEthics: 'What would a virtuous developer/user do?',
      careEthics: 'Consider relationships and dependencies'
    },
    keyQuestions: [
      'Who benefits and who bears risks?',
      'Is there meaningful consent?',
      'Can the system be explained and contested?',
      'What happens when things go wrong?',
      'Are marginalized groups disproportionately affected?'
    ],
    redFlags: [
      'Opacity in high-stakes decisions',
      'No human override',
      'Concentrated benefits, diffused harms',
      'Insufficient testing on diverse populations',
      'Mission creep beyond original purpose'
    ],
    confidence: PHI_INV_2,
    cynicAdvice: '*GROWL* If you can\'t explain it, you can\'t justify it. Transparency first.'
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  TECH ETHICS ENGINE                      Phase 36C     │
├─────────────────────────────────────────────────────────┤
│  Issues Registered: ${String(state.stats.issuesRegistered).padStart(3)}                              │
│  Principles: ${String(state.stats.principlesRegistered).padStart(3)}                                    │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Categories:                                            │
│    - AI Ethics (alignment, bias, consciousness)         │
│    - Privacy (surveillance, data ownership)             │
│    - Autonomy (manipulation, attention)                 │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *GROWL* Tech ethics is urgent and evolving             │
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
  analyzeTechnology,
  analyzeAIScenario,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
