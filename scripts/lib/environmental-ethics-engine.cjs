#!/usr/bin/env node

/**
 * Environmental Ethics Engine - Phase 36B
 * 
 * Ethics of nature and animals:
 * - Animal ethics (moral status, rights, welfare)
 * - Environmental ethics (nature's value, future generations)
 * - Climate ethics (responsibility, justice)
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
  positions: new Map(),
  issues: new Map(),
  analyses: [],
  stats: {
    positionsRegistered: 0,
    issuesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'environmental-ethics-engine');

/**
 * Initialize environmental ethics engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '36B' };
  }
  
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
  
  registerPositions();
  registerIssues();
  
  state.initialized = true;
  return { status: 'initialized', phase: '36B', engine: 'environmental-ethics' };
}

/**
 * Register meta-ethical positions on nature
 */
function registerPositions() {
  state.positions.set('anthropocentrism', {
    name: 'Anthropocentrism',
    claim: 'Only humans have intrinsic value',
    arguments: [
      'Rationality grounds moral status',
      'Nature valuable only instrumentally for humans',
      'Traditional Western view'
    ],
    implications: {
      nature: 'Protect nature for human benefit',
      animals: 'Animals matter only for human interests'
    },
    criticisms: ['Species bias', 'Ignores sentience', 'Ecological shortsightedness'],
    strength: PHI_INV_2
  });
  
  state.positions.set('sentientism', {
    name: 'Sentientism',
    claim: 'All sentient beings have moral status',
    proponents: ['Peter Singer', 'Jeremy Bentham'],
    arguments: [
      'Suffering is the relevant criterion',
      'Species membership is arbitrary',
      'Equal consideration of interests'
    ],
    implications: {
      nature: 'Non-sentient nature has no intrinsic value',
      animals: 'Animals deserve moral consideration based on sentience'
    },
    criticisms: ['Where to draw sentience line?', 'Ignores ecosystems', 'Individualistic'],
    strength: PHI_INV
  });
  
  state.positions.set('biocentrism', {
    name: 'Biocentrism',
    claim: 'All living things have intrinsic value',
    proponents: ['Paul Taylor', 'Albert Schweitzer'],
    arguments: [
      'Life itself is valuable',
      'All organisms have a good of their own',
      'Reverence for life'
    ],
    implications: {
      nature: 'Plants and ecosystems have value',
      animals: 'All life deserves respect, not just sentient'
    },
    criticisms: ['How to weigh conflicting interests?', 'Impractical', 'Microbes too?'],
    strength: PHI_INV_2
  });
  
  state.positions.set('ecocentrism', {
    name: 'Ecocentrism',
    claim: 'Ecosystems and species have intrinsic value',
    proponents: ['Aldo Leopold', 'Deep ecology'],
    arguments: [
      'Holistic value beyond individuals',
      'Land ethic: good preserves biotic community',
      'Biodiversity has value'
    ],
    landEthic: 'A thing is right when it tends to preserve the integrity, stability, and beauty of the biotic community',
    implications: {
      nature: 'Ecosystems have priority over individuals',
      animals: 'Species matter more than individual animals'
    },
    criticisms: ['Environmental fascism?', 'Sacrifices individuals', 'Vague criteria'],
    strength: PHI_INV_2
  });
  
  state.positions.set('deep-ecology', {
    name: 'Deep Ecology',
    claim: 'Nature has intrinsic value independent of humans',
    proponents: ['Arne Naess', 'George Sessions'],
    principles: [
      'Biocentric equality',
      'Richness and diversity as values',
      'Reduce human population',
      'Significant lifestyle changes needed'
    ],
    contrast: 'Shallow ecology focuses on pollution for human health',
    implications: {
      nature: 'Radical restructuring of human society',
      animals: 'Part of larger biotic community'
    },
    criticisms: ['Misanthropic?', 'Impractical', 'Vague'],
    strength: PHI_INV_3
  });
  
  state.stats.positionsRegistered = state.positions.size;
}

/**
 * Register environmental issues
 */
function registerIssues() {
  // Animal ethics
  state.issues.set('animal-rights', {
    name: 'Animal Rights',
    category: 'animal-ethics',
    question: 'Do animals have rights?',
    positions: {
      regan: {
        name: 'Rights View',
        claim: 'Animals are subjects-of-a-life with inherent value',
        philosopher: 'Tom Regan',
        implication: 'Abolish animal exploitation',
        strength: PHI_INV_2
      },
      singer: {
        name: 'Utilitarian',
        claim: 'Equal consideration of equal interests',
        philosopher: 'Peter Singer',
        implication: 'Minimize suffering; some use may be permissible',
        strength: PHI_INV
      },
      contractarian: {
        name: 'Indirect Duties',
        claim: 'Animals lack moral standing but we have duties regarding them',
        philosopher: 'Kant (indirect)',
        implication: 'Cruelty wrong for what it does to humans',
        strength: PHI_INV_3
      }
    },
    issues: ['Factory farming', 'Animal experimentation', 'Hunting', 'Pets'],
    consensus: 'Growing recognition of animal moral status'
  });
  
  state.issues.set('speciesism', {
    name: 'Speciesism',
    category: 'animal-ethics',
    question: 'Is preference for humans morally justified?',
    definition: 'Prejudice favoring one\'s own species',
    singerArgument: {
      claim: 'Speciesism is like racism and sexism',
      reasoning: 'Species membership is morally arbitrary',
      response: 'Equal consideration, not equal treatment'
    },
    defenses: [
      'Humans have morally relevant properties (rationality)',
      'Special relationships justify preference',
      'Practical necessity'
    ],
    consensus: 'Highly contested; Singer\'s view influential but disputed'
  });
  
  // Environmental issues
  state.issues.set('climate-ethics', {
    name: 'Climate Ethics',
    category: 'environmental',
    question: 'What are our obligations regarding climate change?',
    dimensions: {
      responsibility: {
        question: 'Who is responsible?',
        positions: ['Historical emitters', 'Current emitters', 'Capacity to pay', 'Beneficiaries']
      },
      distribution: {
        question: 'How to distribute burdens?',
        positions: ['Equal per capita', 'Polluter pays', 'Ability to pay']
      },
      futureGenerations: {
        question: 'Obligations to future people?',
        positions: ['Strong obligations', 'Discounting', 'Non-identity problem']
      }
    },
    challenges: [
      'Collective action problem',
      'Intergenerational justice',
      'Global vs local responsibility',
      'Non-identity problem'
    ],
    consensus: 'Strong action needed; distribution contested'
  });
  
  state.issues.set('future-generations', {
    name: 'Future Generations',
    category: 'environmental',
    question: 'Do we have obligations to future people?',
    challenges: {
      nonIdentity: {
        problem: 'Our choices affect who exists',
        philosopher: 'Derek Parfit',
        implication: 'Cannot harm specific future people by making them exist'
      },
      discounting: {
        question: 'Should future interests count less?',
        positions: ['Pure time preference wrong', 'Uncertainty justifies some discounting']
      },
      existence: {
        question: 'Can non-existent people have rights?',
        positions: ['Yes, potential people matter', 'No, rights require existence']
      }
    },
    approaches: [
      'Rights of future generations',
      'Present obligation to preserve options',
      'Chain of obligation through generations'
    ],
    consensus: 'Most accept some obligations; details contested'
  });
  
  state.issues.set('wilderness', {
    name: 'Wilderness Preservation',
    category: 'environmental',
    question: 'Should wilderness be preserved?',
    arguments: {
      instrumental: 'Ecosystem services, recreation, scientific value',
      intrinsic: 'Nature has value independent of use',
      aesthetic: 'Beauty and sublime worth preserving',
      existence: 'Value in knowing wilderness exists'
    },
    critiques: {
      socialJustice: 'Wilderness preservation can displace indigenous peoples',
      construction: 'Wilderness is a human construction',
      accessibility: 'Elitist preservation excludes many'
    },
    consensus: 'General support for preservation; conflicts with development'
  });
  
  state.stats.issuesRegistered = state.issues.size;
}

/**
 * Get a position
 */
function getPosition(positionId) {
  return state.positions.get(positionId) || null;
}

/**
 * Get an issue
 */
function getIssue(issueId) {
  return state.issues.get(issueId) || null;
}

/**
 * List positions
 */
function listPositions() {
  return Array.from(state.positions.entries()).map(([id, p]) => ({ id, ...p }));
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
 * Analyze moral status
 */
function analyzeMoralStatus(entity) {
  state.stats.analysesPerformed++;
  
  const entityLower = entity.toLowerCase();
  
  // Determine which positions grant status
  const statusByPosition = [];
  
  // Anthropocentrism
  if (entityLower.includes('human')) {
    statusByPosition.push({ position: 'anthropocentrism', grants: true, strength: PHI_INV_2 });
  } else {
    statusByPosition.push({ position: 'anthropocentrism', grants: false, reason: 'Only humans have intrinsic value' });
  }
  
  // Sentientism
  const sentientEntities = ['human', 'mammal', 'bird', 'fish', 'animal', 'dog', 'cat', 'pig', 'cow'];
  const isSentient = sentientEntities.some(s => entityLower.includes(s));
  statusByPosition.push({
    position: 'sentientism',
    grants: isSentient,
    reason: isSentient ? 'Entity is sentient' : 'Entity likely not sentient',
    strength: isSentient ? PHI_INV : PHI_INV_3
  });
  
  // Biocentrism
  const livingEntities = [...sentientEntities, 'plant', 'tree', 'flower', 'bacteria', 'organism'];
  const isLiving = livingEntities.some(l => entityLower.includes(l));
  statusByPosition.push({
    position: 'biocentrism',
    grants: isLiving,
    reason: isLiving ? 'Entity is alive' : 'Entity not alive',
    strength: isLiving ? PHI_INV_2 : PHI_INV_3
  });
  
  // Ecocentrism
  const ecoEntities = [...livingEntities, 'ecosystem', 'species', 'forest', 'river', 'ocean'];
  const hasEcoValue = ecoEntities.some(e => entityLower.includes(e));
  statusByPosition.push({
    position: 'ecocentrism',
    grants: hasEcoValue,
    reason: hasEcoValue ? 'Part of biotic community' : 'Outside biotic community',
    strength: hasEcoValue ? PHI_INV_2 : PHI_INV_3
  });
  
  // Calculate consensus
  const grantingPositions = statusByPosition.filter(s => s.grants).length;
  const consensus = grantingPositions >= 3 ? 'Strong moral status' : 
                   grantingPositions >= 2 ? 'Contested moral status' : 
                   'Weak or no moral status';
  
  return {
    entity,
    statusByPosition,
    grantingPositions,
    consensus,
    confidence: PHI_INV_2,
    cynicNote: '*sniff* Moral status depends on which properties you think matter. φ-bounded.'
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  ENVIRONMENTAL ETHICS ENGINE             Phase 36B     │
├─────────────────────────────────────────────────────────┤
│  Positions Registered: ${String(state.stats.positionsRegistered).padStart(3)}                           │
│  Issues Registered: ${String(state.stats.issuesRegistered).padStart(3)}                              │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                      │
├─────────────────────────────────────────────────────────┤
│  Meta-positions:                                        │
│    - Anthropocentrism (human-centered)                  │
│    - Sentientism (suffering matters)                    │
│    - Biocentrism (all life)                             │
│    - Ecocentrism (ecosystems)                           │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *ears perk* Nature's value is contested                │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    positions: state.stats.positionsRegistered,
    issues: state.stats.issuesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getPosition,
  getIssue,
  listPositions,
  listIssues,
  analyzeMoralStatus,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
