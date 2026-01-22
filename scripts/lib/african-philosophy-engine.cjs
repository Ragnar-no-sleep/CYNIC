#!/usr/bin/env node

/**
 * African Philosophy Engine - Phase 43A
 *
 * African philosophical traditions:
 * - Ubuntu (communal philosophy)
 * - Sage philosophy (Odera Oruka)
 * - Négritude (Senghor, Césaire)
 * - Ethnophilosophy debates
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
  traditions: new Map(),
  thinkers: new Map(),
  concepts: new Map(),
  debates: new Map(),
  analyses: [],
  stats: {
    traditionsRegistered: 0,
    thinkersRegistered: 0,
    conceptsRegistered: 0,
    debatesRegistered: 0,
    analysesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'african-philosophy-engine');

/**
 * Initialize African philosophy engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '43A' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerTraditions();
  registerThinkers();
  registerConcepts();
  registerDebates();

  state.initialized = true;
  return { status: 'initialized', phase: '43A', engine: 'african-philosophy' };
}

/**
 * Register African philosophical traditions
 */
function registerTraditions() {
  state.traditions.set('ubuntu', {
    name: 'Ubuntu Philosophy',
    meaning: '"I am because we are" (Umuntu ngumuntu ngabantu)',
    region: 'Southern Africa (Nguni peoples)',
    core: 'Personhood through community; interconnectedness',
    principles: [
      'Humanity toward others',
      'Communal identity',
      'Mutual responsibility',
      'Compassion and forgiveness',
      'Shared humanity'
    ],
    applications: {
      ethics: 'Moral obligation to community',
      politics: 'Restorative justice, reconciliation',
      epistemology: 'Knowledge is communal'
    },
    tutu: 'Desmond Tutu applied Ubuntu to Truth and Reconciliation',
    contemporary: 'Influences African political philosophy and global ethics',
    strength: PHI_INV
  });

  state.traditions.set('sage-philosophy', {
    name: 'Sage Philosophy',
    founder: 'Henry Odera Oruka',
    definition: 'Philosophy found in thoughts of traditional African sages',
    method: {
      interviews: 'Recorded dialogues with wise elders',
      distinction: 'Folk sage vs. philosophic sage',
      criteria: 'Critical, reflective thinking, not just received wisdom'
    },
    examples: ['Oruka\'s Sage Philosophy (1990)', 'Kenyan sage Ogotemmêli'],
    significance: 'Challenges view that Africa had no philosophy',
    debate: 'Is this genuine philosophy or anthropology?',
    strength: PHI_INV
  });

  state.traditions.set('negritude', {
    name: 'Négritude',
    period: '1930s-1960s',
    founders: ['Léopold Sédar Senghor', 'Aimé Césaire', 'Léon-Gontran Damas'],
    thesis: 'Affirmation of African cultural values and identity',
    characteristics: [
      'Rejection of colonial assimilation',
      'Celebration of African aesthetics',
      'Emotional over rational (Senghor)',
      'African humanism'
    ],
    senghor: {
      emotion: '"Emotion is African as reason is Greek"',
      rhythm: 'African thought characterized by rhythm and intuition'
    },
    critique: 'Wole Soyinka: "A tiger does not proclaim his tigritude"',
    legacy: 'Influenced decolonization movements',
    strength: PHI_INV
  });

  state.traditions.set('ethnophilosophy', {
    name: 'Ethnophilosophy',
    definition: 'Reconstructing philosophy from traditional beliefs and practices',
    example: 'Placide Tempels - Bantu Philosophy (1945)',
    tempels: {
      thesis: 'Bantu people have coherent metaphysics based on vital force',
      method: 'Systematic reconstruction from beliefs',
      influence: 'Pioneered study of African thought systems'
    },
    critique: {
      hountondji: 'Ethnophilosophy is not true philosophy',
      wiredu: 'Conflates cultural beliefs with critical philosophy',
      defense: 'Every philosophy emerges from cultural context'
    },
    strength: PHI_INV
  });

  state.traditions.set('professional', {
    name: 'Professional African Philosophy',
    advocates: ['Paulin Hountondji', 'Kwasi Wiredu', 'Kwame Gyekye'],
    thesis: 'African philosophy should meet universal standards',
    characteristics: [
      'Critical, analytic approach',
      'Individual authorship',
      'Written tradition',
      'Engagement with global philosophy'
    ],
    hountondji: 'Philosophy is critical discourse, not collective worldview',
    wiredu: 'Conceptual decolonization through analysis',
    tension: 'Balance African distinctiveness with philosophical rigor',
    strength: PHI_INV
  });

  state.stats.traditionsRegistered = state.traditions.size;
}

/**
 * Register African philosophers
 */
function registerThinkers() {
  state.thinkers.set('tempels', {
    name: 'Placide Tempels',
    dates: '1906-1977',
    origin: 'Belgian missionary in Congo',
    keyWork: 'Bantu Philosophy (1945)',
    contribution: {
      thesis: 'Bantu metaphysics centers on vital force (ntu)',
      method: 'Systematic reconstruction of Bantu thought',
      impact: 'Pioneered academic study of African philosophy'
    },
    critique: 'Outsider perspective; may project Western categories',
    significance: 'Started the ethnophilosophy tradition',
    strength: PHI_INV
  });

  state.thinkers.set('senghor', {
    name: 'Leopold Sedar Senghor',
    dates: '1906-2001',
    roles: ['Poet', 'Philosopher', 'President of Senegal'],
    movement: 'Negritude',
    keyIdeas: {
      africanReason: 'Emotion is African, intuitive rather than analytical',
      rhythm: 'African thought characterized by rhythm',
      humanism: 'African humanism as alternative to Western individualism'
    },
    critique: 'Essentializes African identity; inverts colonial stereotypes',
    legacy: 'Francophone African thought, African socialism',
    strength: PHI_INV
  });

  state.thinkers.set('hountondji', {
    name: 'Paulin Hountondji',
    dates: '1942-present',
    origin: 'Benin',
    keyWork: 'African Philosophy: Myth and Reality (1976)',
    position: {
      critique: 'Ethnophilosophy is not true philosophy',
      thesis: 'Philosophy requires individual critical thought',
      science: 'Africa needs scientific tradition, not return to tradition'
    },
    method: 'Analytic, critical approach to African thought',
    influence: 'Shaped debate on nature of African philosophy',
    strength: PHI_INV
  });

  state.thinkers.set('wiredu', {
    name: 'Kwasi Wiredu',
    dates: '1931-2022',
    origin: 'Ghana',
    keyWorks: ['Philosophy and an African Culture', 'Cultural Universals and Particulars'],
    keyIdeas: {
      decolonization: 'Conceptual decolonization of African thought',
      universals: 'Some philosophical truths are universal',
      akan: 'Analysis of Akan concepts (sunsum, okra)'
    },
    method: 'Analytic philosophy applied to African concepts',
    project: 'Retrieve African insights while maintaining rigor',
    strength: PHI_INV
  });

  state.thinkers.set('gyekye', {
    name: 'Kwame Gyekye',
    dates: '1939-2019',
    origin: 'Ghana',
    keyWorks: ['An Essay on African Philosophical Thought', 'Tradition and Modernity'],
    position: {
      moderateCommunalism: 'Balance individual and community',
      tradition: 'Tradition can be rationally evaluated and reformed'
    },
    contribution: 'Systematic study of Akan philosophy',
    debate: 'With Menkiti on nature of African communitarianism',
    strength: PHI_INV_2
  });

  state.thinkers.set('mbiti', {
    name: 'John Mbiti',
    dates: '1931-2019',
    origin: 'Kenya',
    keyWork: 'African Religions and Philosophy (1969)',
    keyIdeas: {
      time: 'African concept of time (Sasa and Zamani)',
      religion: 'Africans are notoriously religious',
      community: 'I am because we are'
    },
    contribution: 'Widely read introduction to African thought',
    critique: 'Overgeneralization across diverse cultures',
    strength: PHI_INV_2
  });

  state.thinkers.set('oruka', {
    name: 'Henry Odera Oruka',
    dates: '1944-1995',
    origin: 'Kenya',
    contribution: 'Sage philosophy project',
    method: {
      interviews: 'Documented thoughts of traditional Kenyan sages',
      distinction: 'Folk wisdom vs. philosophic sagacity'
    },
    fourTrends: [
      'Ethnophilosophy',
      'Philosophic sagacity',
      'Nationalist-ideological philosophy',
      'Professional philosophy'
    ],
    significance: 'Showed philosophy exists in oral traditions',
    strength: PHI_INV
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Register African philosophical concepts
 */
function registerConcepts() {
  state.concepts.set('ubuntu-concept', {
    name: 'Ubuntu',
    translation: '"Humanity" or "I am because we are"',
    formula: 'Umuntu ngumuntu ngabantu (A person is a person through other persons)',
    dimensions: {
      ontological: 'Being is relational, not individual',
      ethical: 'Moral obligation to community',
      epistemological: 'Knowledge is communal achievement'
    },
    contrast: {
      western: 'Cogito: I think therefore I am (individual)',
      ubuntu: 'I am because we are (communal)'
    },
    applications: ['Restorative justice', 'Reconciliation', 'Community development'],
    strength: PHI_INV
  });

  state.concepts.set('vital-force', {
    name: 'Vital Force (Ntu)',
    source: 'Tempels\' Bantu Philosophy',
    thesis: 'Being is dynamic force, not static substance',
    hierarchy: [
      'God (supreme force)',
      'Ancestors (powerful spirits)',
      'Living humans',
      'Animals, plants, minerals'
    ],
    interaction: 'Forces can strengthen or weaken each other',
    ethics: 'Good = what increases vital force; evil = what diminishes it',
    critique: 'May impose Western metaphysical categories',
    strength: PHI_INV
  });

  state.concepts.set('communalism', {
    name: 'African Communitarianism',
    thesis: 'Community takes priority over individual',
    versions: {
      radical: 'Menkiti: personhood achieved through community',
      moderate: 'Gyekye: balance individual rights and community'
    },
    implications: {
      personhood: 'One becomes a person through social relationships',
      rights: 'Rights exist within communal context',
      ethics: 'Moral duties flow from communal membership'
    },
    contrast: 'Western liberal individualism',
    strength: PHI_INV
  });

  state.concepts.set('ancestors', {
    name: 'Ancestors (Living Dead)',
    role: 'Continued presence of deceased in community',
    mbiti: 'Sasa (living memory) vs. Zamani (deep past)',
    functions: [
      'Moral guardians',
      'Source of wisdom',
      'Link between living and divine',
      'Foundation of identity'
    ],
    philosophical: 'Extended concept of personhood beyond death',
    ethics: 'Duties to ancestors; they enforce moral order',
    strength: PHI_INV_2
  });

  state.concepts.set('time-african', {
    name: 'African Concept of Time',
    source: 'John Mbiti',
    thesis: 'Traditional African time is event-based, not linear',
    dimensions: {
      sasa: 'Lived present; includes recent past',
      zamani: 'Deep past; mythic time',
      future: 'Minimal; only immediate future is real'
    },
    contrast: {
      western: 'Linear, progressive time',
      african: 'Cyclical, event-oriented time'
    },
    critique: 'Overgeneralized; many African cultures have different views',
    strength: PHI_INV_2
  });

  state.concepts.set('decolonization', {
    name: 'Conceptual Decolonization',
    author: 'Kwasi Wiredu',
    thesis: 'African philosophy must purge colonial conceptual frameworks',
    method: [
      'Identify colonial concepts',
      'Examine African language alternatives',
      'Develop authentic African categories',
      'Engage critically with both traditions'
    ],
    example: 'Akan "sunsum" vs. Western "mind"',
    goal: 'Authentic African philosophical voice',
    strength: PHI_INV
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register debates in African philosophy
 */
function registerDebates() {
  state.debates.set('existence', {
    name: 'Does African Philosophy Exist?',
    question: 'Is there a distinctively African philosophy?',
    positions: {
      yes: 'Unique African thought systems exist',
      no: 'Philosophy is universal; no ethnic philosophy',
      both: 'Universal standards, African contributions'
    },
    hountondji: 'Must meet universal standards to be philosophy',
    wiredu: 'African insights into universal problems',
    oruka: 'Sage philosophy proves individual African thinkers exist',
    strength: PHI_INV
  });

  state.debates.set('ethnophilosophy-critique', {
    name: 'Ethnophilosophy Debate',
    question: 'Is reconstruction of traditional beliefs philosophy?',
    forEthnophilosophy: {
      tempels: 'Systematic worldviews deserve study',
      culture: 'All philosophy emerges from cultural context'
    },
    againstEthnophilosophy: {
      hountondji: 'Conflates culture with critical thought',
      wiredu: 'Philosophy requires individual authorship'
    },
    middleGround: 'Traditional wisdom as starting point for critical reflection',
    strength: PHI_INV
  });

  state.debates.set('communalism-individualism', {
    name: 'Communalism vs. Individualism',
    question: 'How should individual and community relate?',
    radicalCommunalism: {
      menkiti: 'Community constitutes the individual',
      priority: 'Community ontologically prior'
    },
    moderateCommunalism: {
      gyekye: 'Individual has inherent worth',
      balance: 'Rights and duties both matter'
    },
    implications: 'Human rights in African context',
    strength: PHI_INV
  });

  state.debates.set('tradition-modernity', {
    name: 'Tradition and Modernity',
    question: 'What is the role of traditional thought today?',
    positions: {
      traditionalist: 'Preserve and revive traditional wisdom',
      modernist: 'Embrace universal science and philosophy',
      synthesizer: 'Critical engagement with both'
    },
    wiredu: 'Rational evaluation of tradition; keep what is valid',
    gyekye: 'Tradition can be reformed through reason',
    strength: PHI_INV_2
  });

  state.stats.debatesRegistered = state.debates.size;
}

/**
 * Get a tradition
 */
function getTradition(traditionId) {
  return state.traditions.get(traditionId) || null;
}

/**
 * Get a thinker
 */
function getThinker(thinkerId) {
  return state.thinkers.get(thinkerId) || null;
}

/**
 * Get a concept
 */
function getConcept(conceptId) {
  return state.concepts.get(conceptId) || null;
}

/**
 * Get a debate
 */
function getDebate(debateId) {
  return state.debates.get(debateId) || null;
}

/**
 * List all traditions
 */
function listTraditions() {
  return Array.from(state.traditions.entries()).map(([id, t]) => ({ id, ...t }));
}

/**
 * List all concepts
 */
function listConcepts() {
  return Array.from(state.concepts.entries()).map(([id, c]) => ({ id, ...c }));
}

/**
 * Analyze from African philosophical perspective
 */
function analyzeAfrican(topic) {
  state.stats.analysesPerformed++;

  return {
    topic,
    perspectives: {
      ubuntu: 'How does this relate to communal wellbeing?',
      sage: 'What would traditional wisdom say?',
      professional: 'How does this meet universal standards?',
      decolonial: 'Are colonial concepts distorting our view?'
    },
    ubuntuAnalysis: {
      community: 'What are the communal implications?',
      personhood: 'How does this affect human flourishing?',
      relations: 'What relationships are involved?'
    },
    integration: {
      tradition: 'What traditional insights are relevant?',
      modernity: 'How does this engage modern thought?',
      synthesis: 'What creative synthesis is possible?'
    },
    cynicNote: '*ears perk* I am because we are. Ubuntu: communal wisdom. φ-relational.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  AFRICAN PHILOSOPHY ENGINE               Phase 43A      │
├─────────────────────────────────────────────────────────┤
│  Traditions: ${String(state.stats.traditionsRegistered).padStart(3)}                                     │
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                       │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                       │
│  Debates: ${String(state.stats.debatesRegistered).padStart(3)}                                        │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Key Traditions:                                        │
│    - Ubuntu (communal philosophy)                       │
│    - Sage Philosophy (Oruka)                            │
│    - Negritude (Senghor, Cesaire)                       │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *tail wag* I am because we are. Ubuntu.                │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    traditions: state.stats.traditionsRegistered,
    thinkers: state.stats.thinkersRegistered,
    concepts: state.stats.conceptsRegistered,
    debates: state.stats.debatesRegistered,
    analyses: state.stats.analysesPerformed
  };
}

module.exports = {
  init,
  getTradition,
  getThinker,
  getConcept,
  getDebate,
  listTraditions,
  listConcepts,
  analyzeAfrican,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
