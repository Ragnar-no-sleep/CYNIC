#!/usr/bin/env node

/**
 * Cross-Domain Reasoning Engine - Phase 40B
 *
 * Reasoning across all philosophical domains:
 * - Domain connections and mappings
 * - Analogical reasoning between fields
 * - Synthesis of multiple traditions
 * - Resolution of inter-domain tensions
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
  domains: new Map(),
  connections: new Map(),
  analogies: new Map(),
  syntheses: [],
  stats: {
    domainsRegistered: 0,
    connectionsRegistered: 0,
    analogiesRegistered: 0,
    synthesesPerformed: 0
  }
};

const STORAGE_DIR = path.join(process.env.HOME || '/tmp', '.cynic', 'cross-domain-reasoning-engine');

/**
 * Initialize cross-domain reasoning engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phase: '40B' };
  }

  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  registerDomains();
  registerConnections();
  registerAnalogies();

  state.initialized = true;
  return { status: 'initialized', phase: '40B', engine: 'cross-domain-reasoning' };
}

/**
 * Register philosophical domains
 */
function registerDomains() {
  state.domains.set('epistemology', {
    name: 'Epistemology',
    core: 'Knowledge, justification, belief',
    questions: ['What is knowledge?', 'How do we know?', 'What justifies belief?'],
    engines: ['epistemology-engine'],
    phase: 'Early phases'
  });

  state.domains.set('ethics', {
    name: 'Ethics',
    core: 'Right action, good life, moral value',
    questions: ['What should we do?', 'What is good?', 'How should we live?'],
    engines: ['ethics-engine', 'bioethics-engine', 'environmental-ethics-engine', 'tech-ethics-engine'],
    phase: 'Phase 36'
  });

  state.domains.set('metaphysics', {
    name: 'Metaphysics',
    core: 'Being, existence, reality',
    questions: ['What exists?', 'What is the nature of reality?', 'What are things made of?'],
    engines: ['metaphysics-engine', 'identity-engine', 'causation-engine', 'time-engine'],
    phase: 'Phase 33'
  });

  state.domains.set('logic', {
    name: 'Logic',
    core: 'Valid reasoning, inference, proof',
    questions: ['What follows from what?', 'Is this argument valid?', 'What is a proof?'],
    engines: ['modal-logic-engine'],
    phase: 'Phase 39'
  });

  state.domains.set('mind', {
    name: 'Philosophy of Mind',
    core: 'Consciousness, mental states, cognition',
    questions: ['What is consciousness?', 'How do mind and body relate?', 'What is thought?'],
    engines: ['mind-engine'],
    phase: 'Phase 28'
  });

  state.domains.set('language', {
    name: 'Philosophy of Language',
    core: 'Meaning, reference, truth',
    questions: ['What is meaning?', 'How do words refer?', 'What is truth?'],
    engines: ['language-engine'],
    phase: 'Phase 29'
  });

  state.domains.set('action', {
    name: 'Philosophy of Action',
    core: 'Agency, intention, free will',
    questions: ['What is an action?', 'Are we free?', 'What is responsibility?'],
    engines: ['action-engine'],
    phase: 'Phase 30'
  });

  state.domains.set('political', {
    name: 'Political Philosophy',
    core: 'Justice, rights, legitimacy',
    questions: ['What is justice?', 'What legitimizes authority?', 'What rights do we have?'],
    engines: ['political-engine'],
    phase: 'Phase 31'
  });

  state.domains.set('science', {
    name: 'Philosophy of Science',
    core: 'Scientific method, explanation, theory',
    questions: ['What is science?', 'What is explanation?', 'How do theories change?'],
    engines: ['science-engine'],
    phase: 'Phase 32'
  });

  state.domains.set('religion', {
    name: 'Philosophy of Religion',
    core: 'God, faith, religious experience',
    questions: ['Does God exist?', 'What is faith?', 'How do faith and reason relate?'],
    engines: ['theism-engine', 'evil-engine', 'faith-reason-engine'],
    phase: 'Phase 34'
  });

  state.domains.set('aesthetics', {
    name: 'Aesthetics',
    core: 'Beauty, art, taste',
    questions: ['What is beauty?', 'What is art?', 'Can taste be objective?'],
    engines: ['aesthetics-engine'],
    phase: 'Phase 27'
  });

  state.domains.set('decision', {
    name: 'Decision Theory',
    core: 'Rational choice, utility, probability',
    questions: ['What is rational?', 'How should we decide?', 'What is utility?'],
    engines: ['decision-theory-engine', 'game-theory-engine'],
    phase: 'Phase 39'
  });

  state.domains.set('eastern', {
    name: 'Eastern Philosophy',
    core: 'Buddhist, Daoist, Vedanta traditions',
    questions: ['What is self?', 'What is enlightenment?', 'How should we live?'],
    engines: ['buddhist-engine', 'daoist-engine', 'vedanta-engine'],
    phase: 'Phase 37'
  });

  state.domains.set('continental', {
    name: 'Continental Philosophy',
    core: 'Phenomenology, existentialism, critical theory',
    questions: ['What is experience?', 'What is existence?', 'What is ideology?'],
    engines: ['phenomenology-engine', 'existentialism-engine', 'critical-theory-engine'],
    phase: 'Phase 38'
  });

  state.domains.set('mathematics', {
    name: 'Philosophy of Mathematics',
    core: 'Foundations, ontology, practice',
    questions: ['What are numbers?', 'Why does math work?', 'Is math discovered or invented?'],
    engines: ['math-foundations-engine', 'math-ontology-engine', 'math-practice-engine'],
    phase: 'Phase 41'
  });

  state.domains.set('pragmatism', {
    name: 'Pragmatism & Process',
    core: 'Inquiry, experience, process',
    questions: ['What works?', 'What is inquiry?', 'Is reality processual?'],
    engines: ['pragmatism-engine', 'process-philosophy-engine', 'american-philosophy-engine'],
    phase: 'Phase 42'
  });

  state.domains.set('global', {
    name: 'Global Philosophy',
    core: 'African, Islamic, Latin American traditions',
    questions: ['What is ubuntu?', 'How do diverse traditions dialogue?', 'What is liberation?'],
    engines: ['african-philosophy-engine', 'islamic-philosophy-engine', 'latin-american-engine'],
    phase: 'Phase 43'
  });

  state.domains.set('law-economics', {
    name: 'Philosophy of Law & Economics',
    core: 'Jurisprudence, economic philosophy, efficiency',
    questions: ['What is law?', 'What is economic value?', 'How do law and economics interact?'],
    engines: ['philosophy-of-law-engine', 'philosophy-of-economics-engine', 'law-economics-engine'],
    phase: 'Phase 44'
  });

  state.domains.set('cognitive', {
    name: 'Cognitive Philosophy',
    core: 'Embodied cognition, perception, emotion',
    questions: ['Is cognition embodied?', 'What is perception?', 'What are emotions?'],
    engines: ['embodied-cognition-engine', 'philosophy-of-perception-engine', 'philosophy-of-emotion-engine'],
    phase: 'Phase 45'
  });

  state.stats.domainsRegistered = state.domains.size;
}

/**
 * Register cross-domain connections
 */
function registerConnections() {
  state.connections.set('epistemology-ethics', {
    domains: ['epistemology', 'ethics'],
    connections: [
      'Moral epistemology: How do we know moral truths?',
      'Epistemic virtues: Intellectual honesty, open-mindedness',
      'Epistemic injustice: Knowledge and power',
      'Naturalism: Deriving ought from is?'
    ],
    tension: 'Is-ought gap: Can we derive ethics from facts?',
    synthesis: 'Virtue epistemology combines both domains'
  });

  state.connections.set('metaphysics-mind', {
    domains: ['metaphysics', 'mind'],
    connections: [
      'Mind-body problem: Dualism, physicalism, property dualism',
      'Personal identity: What makes you the same person over time?',
      'Mental causation: How do mental states cause physical events?',
      'Consciousness: Hard problem of subjective experience'
    ],
    tension: 'How can subjective experience exist in physical world?',
    synthesis: 'Various positions: eliminativism, functionalism, panpsychism'
  });

  state.connections.set('ethics-action', {
    domains: ['ethics', 'action'],
    connections: [
      'Moral responsibility: Requires free will?',
      'Intention and consequence: Which matters morally?',
      'Akrasia: Weakness of will',
      'Practical reason: How to act rightly'
    ],
    tension: 'If determinism is true, can we be morally responsible?',
    synthesis: 'Compatibilism attempts reconciliation'
  });

  state.connections.set('language-logic', {
    domains: ['language', 'logic'],
    connections: [
      'Formal semantics: Logical analysis of meaning',
      'Validity: Formal vs informal',
      'Paradoxes: Liar, Russell, etc.',
      'Definite descriptions: Russell vs Strawson'
    ],
    tension: 'Natural language vs formal logic',
    synthesis: 'Speech act theory bridges gap'
  });

  state.connections.set('epistemology-science', {
    domains: ['epistemology', 'science'],
    connections: [
      'Scientific method: Source of knowledge',
      'Theory change: Kuhn, Lakatos, Feyerabend',
      'Underdetermination: Evidence and theory',
      'Realism vs anti-realism: Does science describe reality?'
    ],
    tension: 'Problem of induction',
    synthesis: 'Bayesian epistemology unifies'
  });

  state.connections.set('ethics-political', {
    domains: ['ethics', 'political'],
    connections: [
      'Justice: Individual and social',
      'Rights: Natural vs conventional',
      'Liberty: Positive vs negative',
      'Equality: Of what? Of whom?'
    ],
    tension: 'Liberty vs equality',
    synthesis: 'Rawlsian reflective equilibrium'
  });

  state.connections.set('eastern-western', {
    domains: ['eastern', 'ethics'],
    connections: [
      'Self: Atman vs no-self vs Western self',
      'Ethics: Karma vs deontology vs consequentialism',
      'Metaphysics: Maya vs realism',
      'Liberation: Moksha, nirvana vs flourishing'
    ],
    tension: 'Different metaphysical starting points',
    synthesis: 'Comparative philosophy finds common ground'
  });

  state.connections.set('mind-language', {
    domains: ['mind', 'language'],
    connections: [
      'Thought and language: Is thought linguistic?',
      'Intentionality: Aboutness of mental states',
      'Private language: Wittgenstein\'s argument',
      'Meaning and mind: Externalism vs internalism'
    ],
    tension: 'Can there be thought without language?',
    synthesis: 'Various positions on thought-language relation'
  });

  state.connections.set('logic-decision', {
    domains: ['logic', 'decision'],
    connections: [
      'Modal logic: Possibility and necessity in decisions',
      'Probability logic: Degrees of belief',
      'Conditionals: Counterfactuals in decision',
      'Rationality: Logical vs practical'
    ],
    tension: 'Logic is descriptive; decision is normative',
    synthesis: 'Bayesian decision theory unifies'
  });

  // Phase 41-45 connections
  state.connections.set('mathematics-logic', {
    domains: ['mathematics', 'logic'],
    connections: [
      'Foundations: Logic as foundation of math',
      'Proof: Formal proof theory',
      'Set theory: Mathematical logic',
      'Gödel: Incompleteness and limits'
    ],
    tension: 'Can logic ground all of mathematics?',
    synthesis: 'Multiple foundations coexist: logicism, formalism, intuitionism'
  });

  state.connections.set('mathematics-metaphysics', {
    domains: ['mathematics', 'metaphysics'],
    connections: [
      'Ontology: Do numbers exist?',
      'Platonism vs nominalism: Abstract objects',
      'Structure: Structuralism in math and reality',
      'Modality: Mathematical necessity'
    ],
    tension: 'If numbers exist, how do we access them?',
    synthesis: 'Structuralism: math describes structures, not objects'
  });

  state.connections.set('pragmatism-science', {
    domains: ['pragmatism', 'science'],
    connections: [
      'Inquiry: Scientific method as inquiry',
      'Verification: Pragmatic theory of truth',
      'Fallibilism: All beliefs revisable',
      'Instrumentalism: Theories as tools'
    ],
    tension: 'Is truth what works, or does what works reveal truth?',
    synthesis: 'Pragmatic realism: truth emerges through inquiry'
  });

  state.connections.set('pragmatism-action', {
    domains: ['pragmatism', 'action'],
    connections: [
      'Practical reason: Thinking for action',
      'Habits: Peirce on belief as habit',
      'Consequences: Actions judged by results',
      'Growth: Dewey on democratic action'
    ],
    tension: 'How much should consequences guide action?',
    synthesis: 'Intelligent action: inquiry guiding practice'
  });

  state.connections.set('global-political', {
    domains: ['global', 'political'],
    connections: [
      'Ubuntu: I am because we are',
      'Liberation: Freire, Dussel on oppression',
      'Decolonization: Epistemological justice',
      'Communitarianism: African vs Western individual'
    ],
    tension: 'Universal vs culturally-specific political philosophy',
    synthesis: 'Pluralistic universalism respecting difference'
  });

  state.connections.set('global-ethics', {
    domains: ['global', 'ethics'],
    connections: [
      'Ubuntu ethics: Relational morality',
      'Islamic ethics: Divine command, virtue, law',
      'Liberation ethics: Preferential option for oppressed',
      'Indigenous ethics: Land, ancestors, community'
    ],
    tension: 'Can ethics be both universal and culturally grounded?',
    synthesis: 'Overlapping consensus across traditions'
  });

  state.connections.set('law-economics-political', {
    domains: ['law-economics', 'political'],
    connections: [
      'Justice: Efficiency vs fairness',
      'Rights: Property and distribution',
      'Institutions: Rules of the game',
      'Coase: Transaction costs and law'
    ],
    tension: 'Should law maximize efficiency or justice?',
    synthesis: 'Law and economics with equity constraints'
  });

  state.connections.set('law-economics-ethics', {
    domains: ['law-economics', 'ethics'],
    connections: [
      'Value: Economic vs intrinsic',
      'Market limits: What money cant buy',
      'Incentives: Do they corrupt?',
      'Distributive justice: Economic equality'
    ],
    tension: 'Does economic analysis reduce ethics to preferences?',
    synthesis: 'Capabilities approach integrates both'
  });

  state.connections.set('cognitive-mind', {
    domains: ['cognitive', 'mind'],
    connections: [
      'Embodiment: Mind is bodily',
      'Extended mind: Cognition beyond brain',
      '4E cognition: Embodied, embedded, enacted, extended',
      'Consciousness: Phenomenal and access'
    ],
    tension: 'How far does mind extend beyond the brain?',
    synthesis: 'Enactivism: mind emerges in action'
  });

  state.connections.set('cognitive-action', {
    domains: ['cognitive', 'action'],
    connections: [
      'Emotion: Role in practical reason',
      'Perception: Affordances for action',
      'Motor intentionality: Body knows how',
      'Somatic markers: Damasio on decision'
    ],
    tension: 'Is emotion rational or does it distort reason?',
    synthesis: 'Emotions as necessary for practical rationality'
  });

  state.connections.set('cognitive-aesthetics', {
    domains: ['cognitive', 'aesthetics'],
    connections: [
      'Aesthetic experience: Embodied response',
      'Emotion in art: Feeling and meaning',
      'Perception: Seeing beauty',
      'Empathy: Feeling with artwork'
    ],
    tension: 'Is beauty in the object or the perceiver?',
    synthesis: 'Relational aesthetics: beauty in encounter'
  });

  state.connections.set('eastern-cognitive', {
    domains: ['eastern', 'cognitive'],
    connections: [
      'Mindfulness: Attention and awareness',
      'Embodiment: Body in meditation',
      'Non-self: Buddhist cognitive science',
      'Phenomenology: First-person methods'
    ],
    tension: 'Can meditation data inform cognitive science?',
    synthesis: 'Contemplative science bridges traditions'
  });

  state.stats.connectionsRegistered = state.connections.size;
}

/**
 * Register cross-domain analogies
 */
function registerAnalogies() {
  state.analogies.set('evolution-epistemology', {
    source: 'Biological evolution',
    target: 'Epistemology',
    mapping: {
      organisms: 'Theories/beliefs',
      selection: 'Empirical testing',
      fitness: 'Explanatory power',
      mutation: 'Creative hypothesis generation'
    },
    insight: 'Evolutionary epistemology: knowledge evolves through selection',
    limitation: 'Beliefs don\'t reproduce literally'
  });

  state.analogies.set('market-ethics', {
    source: 'Economics/markets',
    target: 'Ethics',
    mapping: {
      prices: 'Moral values',
      equilibrium: 'Social contract',
      efficiency: 'Overall welfare',
      externalities: 'Third-party harms'
    },
    insight: 'Some moral problems have market-like structure',
    limitation: 'Not everything should be commodified'
  });

  state.analogies.set('game-social', {
    source: 'Game theory',
    target: 'Social/political philosophy',
    mapping: {
      players: 'Citizens/groups',
      strategies: 'Policies/behaviors',
      payoffs: 'Social outcomes',
      equilibrium: 'Social stability'
    },
    insight: 'Social dilemmas as multi-player games',
    limitation: 'Real agents aren\'t perfectly rational'
  });

  state.analogies.set('computation-mind', {
    source: 'Computer science',
    target: 'Philosophy of mind',
    mapping: {
      hardware: 'Brain',
      software: 'Mind',
      algorithm: 'Mental process',
      data: 'Mental content'
    },
    insight: 'Computational theory of mind',
    limitation: 'Chinese room, consciousness'
  });

  state.analogies.set('language-games', {
    source: 'Games',
    target: 'Language',
    mapping: {
      rules: 'Grammar/conventions',
      moves: 'Speech acts',
      goals: 'Communicative purposes',
      players: 'Speakers'
    },
    insight: 'Wittgenstein\'s language games',
    limitation: 'Language is more fluid than games'
  });

  // New analogies for phases 41-45
  state.analogies.set('music-mathematics', {
    source: 'Music',
    target: 'Mathematics',
    mapping: {
      harmony: 'Mathematical structure',
      composition: 'Proof construction',
      improvisation: 'Mathematical creativity',
      performance: 'Mathematical practice'
    },
    insight: 'Both reveal deep patterns through practice',
    limitation: 'Math lacks musical temporal unfolding'
  });

  state.analogies.set('ecosystem-society', {
    source: 'Ecology',
    target: 'Global philosophy (ubuntu)',
    mapping: {
      interconnection: 'Ubuntu relationality',
      diversity: 'Cultural plurality',
      sustainability: 'Intergenerational justice',
      niche: 'Role in community'
    },
    insight: 'Ubuntu sees society as living ecosystem',
    limitation: 'Society has intentional agents'
  });

  state.analogies.set('tool-cognition', {
    source: 'Tool use',
    target: 'Embodied cognition',
    mapping: {
      tool: 'Cognitive scaffold',
      extension: 'Extended mind',
      skill: 'Embodied knowledge',
      affordance: 'Action possibility'
    },
    insight: 'Mind extends through tools into world',
    limitation: 'Not all cognition is tool-like'
  });

  state.analogies.set('river-process', {
    source: 'River',
    target: 'Process philosophy',
    mapping: {
      flow: 'Becoming',
      banks: 'Temporary stability',
      source: 'Origin',
      delta: 'Creative advance'
    },
    insight: 'Reality flows; permanence is illusion',
    limitation: 'Some things persist more than rivers suggest'
  });

  state.analogies.set('contract-law', {
    source: 'Contract',
    target: 'Philosophy of law',
    mapping: {
      agreement: 'Social contract',
      terms: 'Legal rules',
      breach: 'Violation',
      enforcement: 'Sanctions'
    },
    insight: 'Law as mutual agreement for cooperation',
    limitation: 'Not all law is contractual'
  });

  state.stats.analogiesRegistered = state.analogies.size;
}

/**
 * Get a domain
 */
function getDomain(domainId) {
  return state.domains.get(domainId) || null;
}

/**
 * Get a connection
 */
function getConnection(connectionId) {
  return state.connections.get(connectionId) || null;
}

/**
 * Get an analogy
 */
function getAnalogy(analogyId) {
  return state.analogies.get(analogyId) || null;
}

/**
 * List all domains
 */
function listDomains() {
  return Array.from(state.domains.entries()).map(([id, d]) => ({ id, ...d }));
}

/**
 * List all connections
 */
function listConnections() {
  return Array.from(state.connections.entries()).map(([id, c]) => ({ id, ...c }));
}

/**
 * Find connections for a domain
 */
function findConnectionsForDomain(domainId) {
  const results = [];
  for (const [id, conn] of state.connections) {
    if (conn.domains.includes(domainId)) {
      results.push({ id, ...conn });
    }
  }
  return results;
}

/**
 * Perform cross-domain synthesis
 */
function synthesize(question, domains = []) {
  state.stats.synthesesPerformed++;

  const synthesis = {
    question,
    requestedDomains: domains,
    timestamp: new Date().toISOString()
  };

  // Gather relevant perspectives
  synthesis.perspectives = {};
  const relevantDomains = domains.length > 0 ? domains : Array.from(state.domains.keys());

  for (const domainId of relevantDomains) {
    const domain = state.domains.get(domainId);
    if (domain) {
      synthesis.perspectives[domainId] = {
        name: domain.name,
        approach: `${domain.name} asks: ${domain.questions[0]}`,
        core: domain.core
      };
    }
  }

  // Find connections between requested domains
  synthesis.connections = [];
  for (const [id, conn] of state.connections) {
    if (relevantDomains.some(d => conn.domains.includes(d))) {
      synthesis.connections.push({
        id,
        domains: conn.domains,
        synthesis: conn.synthesis
      });
    }
  }

  synthesis.method = {
    approach: 'Multi-domain convergence',
    steps: [
      'Analyze question from each domain perspective',
      'Identify tensions between domains',
      'Seek points of convergence',
      'Propose synthesis respecting all perspectives'
    ]
  };

  synthesis.verdict = {
    note: 'Cross-domain synthesis is provisional',
    confidence: PHI_INV_2,
    revisable: true
  };

  synthesis.cynicNote = '*head tilt* Multiple domains, multiple truths. Synthesis seeks unity, respects plurality.';

  state.syntheses.push(synthesis);
  return synthesis;
}

/**
 * Format engine status
 */
function formatStatus() {
  return `
┌─────────────────────────────────────────────────────────┐
│  CROSS-DOMAIN REASONING ENGINE           Phase 40B      │
├─────────────────────────────────────────────────────────┤
│  Domains: ${String(state.stats.domainsRegistered).padStart(3)}                                        │
│  Connections: ${String(state.stats.connectionsRegistered).padStart(3)}                                   │
│  Analogies: ${String(state.stats.analogiesRegistered).padStart(3)}                                     │
│  Syntheses: ${String(state.stats.synthesesPerformed).padStart(3)}                                     │
├─────────────────────────────────────────────────────────┤
│  Domain Coverage:                                       │
│    - Western: epistemology, ethics, metaphysics...      │
│    - Eastern: Buddhist, Daoist, Vedanta                 │
│    - Continental: phenomenology, existentialism...      │
│    - Formal: logic, decision theory, game theory        │
├─────────────────────────────────────────────────────────┤
│  φ-bounded: max ${(PHI_INV * 100).toFixed(1)}% confidence                      │
│  *ears perk* Domains connect. Synthesis emerges.        │
└─────────────────────────────────────────────────────────┘`.trim();
}

/**
 * Get stats
 */
function getStats() {
  return {
    domains: state.stats.domainsRegistered,
    connections: state.stats.connectionsRegistered,
    analogies: state.stats.analogiesRegistered,
    syntheses: state.stats.synthesesPerformed
  };
}

module.exports = {
  init,
  getDomain,
  getConnection,
  getAnalogy,
  listDomains,
  listConnections,
  findConnectionsForDomain,
  synthesize,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
