#!/usr/bin/env node

/**
 * Islamic Philosophy Engine - Phase 43B
 *
 * Islamic philosophical traditions:
 * - Kalam (Islamic theology)
 * - Falsafa (Peripatetic philosophy)
 * - Illuminationism (Ishraq)
 * - Mystical philosophy (Sufism)
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

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'islamic-philosophy-engine');

/**
 * Initialize Islamic philosophy engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '43B' };
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
  return { status: 'initialized', phase: '43B', engine: 'islamic-philosophy' };
}

/**
 * Register Islamic philosophical traditions
 */
function registerTraditions() {
  state.traditions.set('kalam', {
    name: 'Kalam (Islamic Theology)',
    meaning: 'Word/Speech - rational discourse about theological matters',
    period: '8th century onwards',
    schools: {
      mutazila: {
        name: 'Mutazilites',
        period: '8th-10th century',
        principles: ['Divine unity', 'Divine justice', 'Promise and threat', 'Intermediate position', 'Commanding good'],
        rationalist: 'Reason can determine good and evil'
      },
      ashari: {
        name: 'Asharites',
        founder: 'Abu al-Hasan al-Ashari',
        thesis: 'Reason serves revelation; divine will supreme',
        occasionalism: 'God is direct cause of all events'
      },
      maturidi: {
        name: 'Maturidites',
        founder: 'Abu Mansur al-Maturidi',
        position: 'Middle ground between Mutazila and Ashari'
      }
    },
    topics: ['Divine attributes', 'Free will', 'Faith and works', 'Atomism'],
    strength: PHI_INV
  });

  state.traditions.set('falsafa', {
    name: 'Falsafa (Islamic Peripatetic Philosophy)',
    meaning: 'Philosophy - from Greek philosophia',
    period: '9th-12th century (golden age)',
    characteristics: [
      'Engagement with Greek philosophy',
      'Aristotelian and Neoplatonic synthesis',
      'Rational inquiry into reality',
      'Integration with Islamic revelation'
    ],
    keyFigures: ['Al-Kindi', 'Al-Farabi', 'Ibn Sina (Avicenna)', 'Ibn Rushd (Averroes)'],
    transmission: 'Preserved and developed Greek philosophy for Europe',
    tension: 'Relation between philosophy and revelation',
    strength: PHI_INV
  });

  state.traditions.set('ishraq', {
    name: 'Ishraqi Philosophy (Illuminationism)',
    founder: 'Suhrawardi (1154-1191)',
    meaning: 'Ishraq = illumination, sunrise',
    thesis: 'Knowledge through illumination, not just reasoning',
    characteristics: [
      'Light metaphysics',
      'Intuitive knowledge',
      'Synthesis of Peripatetic and mystical',
      'Persian wisdom tradition'
    ],
    lightHierarchy: 'Reality as degrees of light from Light of Lights',
    influence: 'Mulla Sadra, Persian philosophy',
    strength: PHI_INV
  });

  state.traditions.set('sufi', {
    name: 'Sufi Philosophy',
    definition: 'Mystical dimension of Islam',
    characteristics: [
      'Direct experience of divine',
      'Path (tariqa) to God',
      'Love as central',
      'Unity of being (wahdat al-wujud)'
    ],
    keyFigures: ['Ibn Arabi', 'Al-Ghazali', 'Rumi', 'Al-Hallaj'],
    ibnArabi: {
      unity: 'Wahdat al-wujud - unity of existence',
      imagination: 'Creative imagination (barzakh)',
      perfectHuman: 'Al-insan al-kamil'
    },
    strength: PHI_INV
  });

  state.traditions.set('transcendent-theosophy', {
    name: 'Transcendent Theosophy (Hikmat al-Mutaaliya)',
    founder: 'Mulla Sadra (1571-1640)',
    synthesis: 'Peripatetic, Illuminationist, mystical, Shiite',
    keyDoctrines: {
      substantialMotion: 'Existence itself undergoes motion',
      primacyOfExistence: 'Existence (wujud) is primary, essence secondary',
      gradationOfBeing: 'Being admits of degrees of intensity'
    },
    influence: 'Dominant in later Islamic philosophy, especially Shiite',
    strength: PHI_INV
  });

  state.stats.traditionsRegistered = state.traditions.size;
}

/**
 * Register Islamic philosophers
 */
function registerThinkers() {
  state.thinkers.set('al-kindi', {
    name: 'Al-Kindi',
    dates: 'c. 801-873',
    title: 'Philosopher of the Arabs',
    role: 'First major Islamic philosopher',
    contribution: {
      translation: 'Supervised translation of Greek texts',
      synthesis: 'Integrated Greek philosophy with Islam',
      theology: 'Rational arguments for creation'
    },
    position: 'Philosophy and revelation compatible',
    strength: PHI_INV_2
  });

  state.thinkers.set('al-farabi', {
    name: 'Al-Farabi',
    dates: 'c. 872-950',
    title: 'Second Teacher (after Aristotle)',
    keyWorks: ['The Virtuous City', 'The Attainment of Happiness'],
    contribution: {
      political: 'Ideal city ruled by philosopher-prophet',
      logic: 'Major commentaries on Aristotle',
      emanation: 'Neoplatonic cosmology of emanation'
    },
    prophetsAndPhilosophers: 'Prophet receives truth through imagination; philosopher through intellect',
    influence: 'Shaped Islamic political philosophy',
    strength: PHI_INV
  });

  state.thinkers.set('ibn-sina', {
    name: 'Ibn Sina (Avicenna)',
    dates: '980-1037',
    title: 'The Preeminent Master',
    keyWorks: ['The Book of Healing', 'The Canon of Medicine'],
    philosophy: {
      necessaryBeing: 'Proof of necessary existence (wajib al-wujud)',
      essenceExistence: 'Distinction between essence and existence',
      emanation: 'Ten intellects emanating from the One',
      soul: 'Flying man argument for soul\'s self-awareness'
    },
    medicine: 'Canon was standard medical text for centuries',
    influence: 'Major influence on both Islamic and Western philosophy',
    strength: PHI_INV
  });

  state.thinkers.set('al-ghazali', {
    name: 'Al-Ghazali',
    dates: '1058-1111',
    title: 'Proof of Islam (Hujjat al-Islam)',
    keyWorks: ['The Incoherence of the Philosophers', 'Revival of Religious Sciences'],
    position: {
      critique: 'Attacked philosophers on eternity of world, divine knowledge, resurrection',
      occasionalism: 'Denied necessary causation; God causes all directly',
      sufism: 'Embraced mysticism as path to truth'
    },
    impact: 'Shifted Islamic thought toward theology and mysticism',
    strength: PHI_INV
  });

  state.thinkers.set('ibn-rushd', {
    name: 'Ibn Rushd (Averroes)',
    dates: '1126-1198',
    title: 'The Commentator',
    location: 'Cordoba, Al-Andalus (Spain)',
    keyWorks: ['The Incoherence of the Incoherence', 'Decisive Treatise'],
    philosophy: {
      response: 'Defended philosophy against al-Ghazali',
      doubletruth: 'Accused of: philosophy and religion have different truths',
      harmony: 'Actually argued philosophy and revelation harmonize'
    },
    influence: 'Major influence on Latin Scholasticism (Averroism)',
    strength: PHI_INV
  });

  state.thinkers.set('suhrawardi', {
    name: 'Suhrawardi',
    dates: '1154-1191',
    title: 'Master of Illumination',
    death: 'Executed for his ideas',
    philosophy: {
      illumination: 'Knowledge through divine light',
      lightMetaphysics: 'Reality is hierarchy of lights',
      presenceKnowledge: 'Knowledge by presence vs. knowledge by representation'
    },
    sources: 'Persian Zoroastrian wisdom + Neoplatonism + Islam',
    influence: 'Founded Illuminationist school',
    strength: PHI_INV
  });

  state.thinkers.set('ibn-arabi', {
    name: 'Ibn Arabi',
    dates: '1165-1240',
    title: 'Greatest Master (al-Shaykh al-Akbar)',
    origin: 'Murcia, Al-Andalus',
    keyWorks: ['Meccan Revelations', 'Bezels of Wisdom'],
    philosophy: {
      wahdatAlWujud: 'Unity of existence - all being is one',
      perfectHuman: 'Complete human as microcosm',
      imagination: 'Mundus imaginalis - realm between material and spiritual'
    },
    influence: 'Shaped Islamic mystical philosophy',
    strength: PHI_INV
  });

  state.thinkers.set('mulla-sadra', {
    name: 'Mulla Sadra',
    dates: '1571-1640',
    title: 'Sadr al-Din Shirazi',
    location: 'Safavid Persia',
    keyWork: 'The Four Journeys',
    philosophy: {
      primacyOfExistence: 'Wujud (existence) is fundamental; essence is mental',
      substantialMotion: 'Existence itself is in motion',
      gradation: 'Being has degrees of intensity',
      synthesis: 'United Peripatetic, Illuminationist, Sufi, Shiite'
    },
    influence: 'Dominant philosopher in later Islamic tradition',
    strength: PHI_INV
  });

  state.stats.thinkersRegistered = state.thinkers.size;
}

/**
 * Register Islamic philosophical concepts
 */
function registerConcepts() {
  state.concepts.set('wujud', {
    name: 'Wujud (Existence/Being)',
    centrality: 'Central concept in Islamic metaphysics',
    ibnSina: {
      distinction: 'Essence (mahiya) vs. existence (wujud)',
      necessary: 'Necessary being = existence is identical with essence'
    },
    mullaSadra: {
      primacy: 'Existence is fundamental; essence is abstraction',
      gradation: 'Existence admits of degrees (tashkik)',
      unity: 'All existence is one reality with different grades'
    },
    strength: PHI_INV
  });

  state.concepts.set('necessary-being', {
    name: 'Wajib al-Wujud (Necessary Existence)',
    author: 'Ibn Sina',
    argument: {
      premise1: 'Everything is either necessary or possible',
      premise2: 'Possible beings require a cause',
      premise3: 'Chain of causes cannot be infinite',
      conclusion: 'There must be a necessary being (God)'
    },
    influence: 'Influenced Aquinas\'s Five Ways',
    distinction: 'Necessary in itself vs. necessary through another',
    strength: PHI_INV
  });

  state.concepts.set('emanation', {
    name: 'Emanation (Fayd/Sudur)',
    source: 'Neoplatonism adapted by Islamic philosophers',
    schema: {
      one: 'God (al-Wahid) is absolutely one',
      intellects: 'Ten intellects emanate successively',
      spheres: 'Each intellect governs celestial sphere',
      activeIntellect: 'Tenth intellect illuminates human minds'
    },
    purpose: 'Explains how multiplicity comes from unity',
    tension: 'Eternal emanation vs. temporal creation',
    strength: PHI_INV
  });

  state.concepts.set('active-intellect', {
    name: 'Active Intellect (Aql Faal)',
    source: 'Aristotle via Islamic Neoplatonism',
    role: [
      'Illuminates human potential intellect',
      'Source of universal knowledge',
      'Identified with Angel Gabriel',
      'Makes knowledge possible'
    ],
    prophecy: 'Prophet receives revelation through active intellect',
    conjunction: 'Goal: union (ittisal) with active intellect',
    strength: PHI_INV
  });

  state.concepts.set('occasionalism', {
    name: 'Occasionalism',
    advocates: 'Asharite theologians, Al-Ghazali',
    thesis: 'God is the only true cause; no natural causation',
    argument: {
      atomism: 'World consists of momentary atoms',
      recreation: 'God recreates world each moment',
      habit: 'Regularity is God\'s habit, not natural necessity'
    },
    example: 'Fire does not burn cotton; God creates burning',
    critique: 'Ibn Rushd: undermines science and morality',
    strength: PHI_INV
  });

  state.concepts.set('wahdat-al-wujud', {
    name: 'Wahdat al-Wujud (Unity of Existence)',
    author: 'Ibn Arabi',
    thesis: 'All existence is one divine reality',
    interpretation: {
      monist: 'Everything is God (controversial)',
      orthodox: 'Everything depends on God for existence',
      distinction: 'Unity of existence, not unity of existents'
    },
    implications: {
      ontology: 'Multiplicity is appearance; unity is reality',
      epistemology: 'To know anything is to know God',
      ethics: 'See divine in all beings'
    },
    debate: 'vs. wahdat al-shuhud (unity of witness)',
    strength: PHI_INV
  });

  state.concepts.set('ishraqi-knowledge', {
    name: 'Knowledge by Presence (Ilm Huduri)',
    author: 'Suhrawardi',
    thesis: 'Direct, non-representational knowledge',
    contrast: {
      representational: 'Knowledge through mental forms (acquired)',
      presential: 'Immediate self-luminous awareness (innate)'
    },
    examples: [
      'Self-knowledge (I know myself directly)',
      'Mystical knowledge of God',
      'Intuitive illumination'
    ],
    significance: 'Alternative to Peripatetic epistemology',
    strength: PHI_INV
  });

  state.stats.conceptsRegistered = state.concepts.size;
}

/**
 * Register debates in Islamic philosophy
 */
function registerDebates() {
  state.debates.set('eternity-creation', {
    name: 'Eternity vs. Creation of the World',
    question: 'Is the world eternal or created in time?',
    positions: {
      philosophers: 'World is eternal (following Aristotle)',
      theologians: 'World created ex nihilo in time',
      ghazali: 'Listed as philosophical heresy',
      ibnRushd: 'Eternal creation compatible with religion'
    },
    ibnSina: 'World necessarily emanates from God eternally',
    significance: 'Central dispute between falsafa and kalam',
    strength: PHI_INV
  });

  state.debates.set('divine-knowledge', {
    name: 'Divine Knowledge of Particulars',
    question: 'Does God know particular things?',
    positions: {
      philosophers: 'God knows only universals (to preserve simplicity)',
      theologians: 'God knows all particulars (omniscience)',
      ibnSina: 'God knows particulars in a universal way',
      ghazali: 'Denial of particular knowledge is heresy'
    },
    implication: 'Providence and prayer depend on divine knowledge',
    strength: PHI_INV
  });

  state.debates.set('causation', {
    name: 'Causation Debate',
    question: 'Is there real causation in nature?',
    positions: {
      naturalists: 'Natural causes produce effects necessarily',
      occasionalists: 'God is sole cause; nature is occasion',
      moderates: 'Secondary causes operate under divine will'
    },
    ghazali: 'Habit, not necessity; miracles are possible',
    ibnRushd: 'Denial of causation undermines knowledge',
    strength: PHI_INV
  });

  state.debates.set('philosophy-revelation', {
    name: 'Philosophy and Revelation',
    question: 'What is the relationship between reason and faith?',
    positions: {
      harmony: 'Al-Farabi, Ibn Rushd: truth is one, methods differ',
      subordination: 'Al-Ghazali: reason serves revelation',
      integration: 'Mulla Sadra: philosophical insight illuminates revelation'
    },
    ibnRushd: {
      decisiveTreatise: 'Philosophy is obligatory for capable',
      interpretation: 'Scripture should be interpreted philosophically'
    },
    strength: PHI_INV
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
 * Analyze from Islamic philosophical perspective
 */
function analyzeIslamic(topic) {
  state.stats.analysesPerformed++;

  return {
    topic,
    perspectives: {
      kalam: 'What does rational theology say?',
      falsafa: 'What does Aristotelian philosophy say?',
      ishraq: 'What does illuminative insight reveal?',
      sufi: 'What does mystical experience show?'
    },
    metaphysical: {
      wujud: 'How does this relate to being/existence?',
      causation: 'What is the causal structure?',
      necessity: 'Is this necessary or contingent?'
    },
    integration: {
      reason: 'What does rational inquiry show?',
      revelation: 'What does scripture indicate?',
      harmony: 'How can these be integrated?'
    },
    cynicNote: '*head tilt* Falsafa, Ishraq, Sufi: many paths to truth. φ-illumination.',
    confidence: PHI_INV_2
  };
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  ISLAMIC PHILOSOPHY ENGINE               Phase 43B      │
├─────────────────────────────────────────────────────────┤
│  Traditions: ${String(state.stats.traditionsRegistered).padStart(3)}                                     │
│  Thinkers: ${String(state.stats.thinkersRegistered).padStart(3)}                                       │
│  Concepts: ${String(state.stats.conceptsRegistered).padStart(3)}                                       │
│  Debates: ${String(state.stats.debatesRegistered).padStart(3)}                                        │
│  Analyses: ${String(state.stats.analysesPerformed).padStart(3)}                                       │
├─────────────────────────────────────────────────────────┤
│  Key Traditions:                                        │
│    - Kalam (theology)                                   │
│    - Falsafa (Peripatetic)                              │
│    - Ishraq (Illumination)                              │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *sniff* Reason and revelation: truth is one.           │
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
  analyzeIslamic,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
