#!/usr/bin/env node

/**
 * Philosophy of Economics Engine - Phase 44B
 *
 * Economic philosophy: value, markets, rationality, justice.
 * From Adam Smith to Amartya Sen.
 *
 * φ-bounded: max 61.8% confidence
 *
 * *sniff* The dismal science with philosophical teeth.
 */

const path = require('path');
const os = require('os');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// Storage
const STORAGE_DIR = path.join(os.homedir(), '.cynic', 'philosophy-of-economics');

// State
const state = {
  initialized: false,
  theories: new Map(),
  thinkers: new Map(),
  concepts: new Map(),
  debates: new Map(),
  methodologies: new Map()
};

/**
 * Initialize the Philosophy of Economics Engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phi: PHI_INV };
  }

  initializeTheories();
  initializeThinkers();
  initializeConcepts();
  initializeDebates();
  initializeMethodologies();

  state.initialized = true;
  return { status: 'initialized', phi: PHI_INV };
}

/**
 * Initialize economic theories
 */
function initializeTheories() {
  // Classical Economics
  state.theories.set('classical', {
    name: 'Classical Economics',
    founders: ['Adam Smith', 'David Ricardo', 'John Stuart Mill'],
    period: '1776-1870s',
    keyIdeas: {
      laborValue: 'Value derives from labor embodied in production',
      invisibleHand: 'Self-interest leads to social good through markets',
      comparativeAdvantage: 'Trade benefits all through specialization',
      sayLaw: 'Supply creates its own demand'
    },
    smithQuote: 'It is not from the benevolence of the butcher... that we expect our dinner',
    strength: PHI_INV
  });

  // Marxian Economics
  state.theories.set('marxian', {
    name: 'Marxian Economics',
    founder: 'Karl Marx',
    period: '1867-present',
    keyIdeas: {
      laborTheory: 'Labor is the source of all value',
      surplusValue: 'Profit comes from unpaid labor time',
      exploitation: 'Capitalists extract surplus from workers',
      contradiction: 'Capitalism contains seeds of own destruction',
      historicalMaterialism: 'Economic base determines superstructure'
    },
    critique: 'Capitalism alienates workers from labor, product, species-being, and each other',
    strength: PHI_INV
  });

  // Marginalist/Neoclassical
  state.theories.set('neoclassical', {
    name: 'Neoclassical Economics',
    founders: ['Jevons', 'Menger', 'Walras', 'Marshall'],
    period: '1870s-present',
    keyIdeas: {
      marginalUtility: 'Value derives from subjective utility at the margin',
      equilibrium: 'Markets tend toward supply-demand balance',
      rationalChoice: 'Agents maximize utility/profit',
      priceTheory: 'Prices signal scarcity and coordinate action'
    },
    mathematization: 'Economics as applied mathematics of choice',
    strength: PHI_INV
  });

  // Austrian Economics
  state.theories.set('austrian', {
    name: 'Austrian Economics',
    founders: ['Menger', 'Mises', 'Hayek'],
    period: '1871-present',
    keyIdeas: {
      subjectivism: 'Value is subjective, not objective',
      praxeology: 'Economics studies purposeful human action',
      spontaneousOrder: 'Complex order emerges without central design',
      calculationProblem: 'Socialism cannot allocate rationally without prices',
      dispersedKnowledge: 'Knowledge is local and cannot be centralized'
    },
    hayekQuote: 'The curious task of economics is to demonstrate to men how little they really know',
    strength: PHI_INV
  });

  // Keynesian Economics
  state.theories.set('keynesian', {
    name: 'Keynesian Economics',
    founder: 'John Maynard Keynes',
    period: '1936-present',
    keyIdeas: {
      aggregateDemand: 'Demand drives output, not supply',
      animalSpirits: 'Psychology affects investment decisions',
      liquidityPreference: 'Desire for money affects interest rates',
      multiplier: 'Spending has cascading effects',
      governmentRole: 'State can stabilize business cycles'
    },
    keynesQuote: 'In the long run we are all dead',
    strength: PHI_INV
  });

  // Institutional Economics
  state.theories.set('institutional', {
    name: 'Institutional Economics',
    founders: ['Veblen', 'Commons', 'North', 'Williamson'],
    period: '1899-present',
    keyIdeas: {
      institutions: 'Rules and norms shape economic behavior',
      transactionCosts: 'Exchange has friction beyond price',
      pathDependence: 'History constrains current options',
      embeddedness: 'Economy embedded in social relations'
    },
    veblenQuote: 'Conspicuous consumption of valuable goods is a means of reputability',
    strength: PHI_INV
  });

  // Behavioral Economics
  state.theories.set('behavioral', {
    name: 'Behavioral Economics',
    founders: ['Simon', 'Kahneman', 'Tversky', 'Thaler'],
    period: '1950s-present',
    keyIdeas: {
      boundedRationality: 'Cognitive limits constrain optimization',
      heuristics: 'Mental shortcuts sometimes mislead',
      prospectTheory: 'Losses loom larger than gains',
      nudge: 'Choice architecture affects decisions',
      anomalies: 'Systematic deviations from rational model'
    },
    simonQuote: 'Human rational behavior is shaped by a scissors whose two blades are... the structure of the task environment and... computational capabilities',
    strength: PHI_INV
  });

  // Capability Approach
  state.theories.set('capability', {
    name: 'Capability Approach',
    founders: ['Amartya Sen', 'Martha Nussbaum'],
    period: '1979-present',
    keyIdeas: {
      capabilities: 'Freedom to achieve valued functionings',
      functionings: 'Beings and doings people can achieve',
      development: 'Development is expanding freedoms, not just income',
      agency: 'People as agents, not passive recipients',
      pluralism: 'Multiple dimensions of wellbeing matter'
    },
    senQuote: 'Development is freedom',
    strength: PHI_INV
  });
}

/**
 * Initialize economic philosophers
 */
function initializeThinkers() {
  state.thinkers.set('smith', {
    name: 'Adam Smith',
    dates: '1723-1790',
    works: ['Theory of Moral Sentiments', 'Wealth of Nations'],
    keyIdeas: {
      invisibleHand: 'Self-interest channeled to public good through markets',
      divisionOfLabor: 'Specialization increases productivity',
      sympathy: 'Moral judgments based on impartial spectator',
      justice: 'Negative virtue: do no harm to others'
    },
    oftenMisread: 'Smith was a moral philosopher, not a free-market ideologue',
    phi: PHI_INV
  });

  state.thinkers.set('marx', {
    name: 'Karl Marx',
    dates: '1818-1883',
    works: ['Capital', 'Grundrisse', 'Communist Manifesto'],
    keyIdeas: {
      exploitation: 'Surplus value extracted from workers',
      alienation: 'Capitalism estranges workers from their humanity',
      commodity: 'Social relations appear as relations between things',
      ideology: 'Ruling ideas are ideas of ruling class'
    },
    dialectical: 'Contradictions drive historical change',
    phi: PHI_INV
  });

  state.thinkers.set('hayek', {
    name: 'Friedrich Hayek',
    dates: '1899-1992',
    works: ['Road to Serfdom', 'Constitution of Liberty', 'Use of Knowledge in Society'],
    keyIdeas: {
      dispersedKnowledge: 'No one can possess all economically relevant knowledge',
      prices: 'Price system communicates dispersed information',
      spontaneousOrder: 'Order without a designer',
      liberalism: 'Limited government preserves freedom'
    },
    againstPlanning: 'Central planning leads to totalitarianism',
    phi: PHI_INV
  });

  state.thinkers.set('keynes', {
    name: 'John Maynard Keynes',
    dates: '1883-1946',
    works: ['General Theory', 'Economic Consequences of the Peace'],
    keyIdeas: {
      uncertainty: 'Future is radically uncertain, not just risky',
      animalSpirits: 'Investment driven by confidence and emotions',
      effectiveDemand: 'Spending determines output and employment',
      liquidity: 'Desire for cash affects interest rates'
    },
    revolution: 'Overturned Say\'s Law and classical equilibrium',
    phi: PHI_INV
  });

  state.thinkers.set('sen', {
    name: 'Amartya Sen',
    dates: '1933-present',
    works: ['Development as Freedom', 'Idea of Justice', 'Collective Choice'],
    keyIdeas: {
      capabilities: 'What people are able to do and be',
      freedom: 'Development expands substantive freedoms',
      famine: 'Famines caused by entitlement failures, not food shortage',
      democracy: 'No famine in functioning democracy'
    },
    pluralism: 'Multiple valid principles of justice',
    phi: PHI_INV
  });

  state.thinkers.set('rawls', {
    name: 'John Rawls',
    dates: '1921-2002',
    works: ['Theory of Justice', 'Political Liberalism'],
    economicIdeas: {
      differenceP: 'Inequalities justified only if they benefit worst-off',
      fairEquality: 'Equal opportunity for positions and offices',
      basicStructure: 'Justice applies to basic social institutions',
      propertyOwning: 'Favored property-owning democracy over welfare state'
    },
    phi: PHI_INV
  });

  state.thinkers.set('nozick', {
    name: 'Robert Nozick',
    dates: '1938-2002',
    works: ['Anarchy, State, and Utopia'],
    economicIdeas: {
      entitlement: 'Holdings just if acquired and transferred justly',
      selfOwnership: 'People own themselves and their labor',
      minimalState: 'Only night-watchman state justified',
      taxation: 'Redistributive taxation is forced labor'
    },
    wilt: 'Wilt Chamberlain argument against patterned principles',
    phi: PHI_INV
  });

  state.thinkers.set('polanyi', {
    name: 'Karl Polanyi',
    dates: '1886-1964',
    works: ['Great Transformation'],
    keyIdeas: {
      embeddedness: 'Economy historically embedded in society',
      doubleMovement: 'Market expansion triggers protective counter-movement',
      commodification: 'Land, labor, money are fictitious commodities',
      disembedding: 'Market society disembeds economy from social relations'
    },
    phi: PHI_INV
  });

  state.thinkers.set('veblen', {
    name: 'Thorstein Veblen',
    dates: '1857-1929',
    works: ['Theory of the Leisure Class', 'Theory of Business Enterprise'],
    keyIdeas: {
      conspicuous: 'Consumption signals status',
      instincts: 'Workmanship vs. predation instincts',
      ceremony: 'Distinction between industrial and ceremonial behavior',
      absentee: 'Owners vs. engineers in modern enterprise'
    },
    phi: PHI_INV
  });

  state.thinkers.set('friedman', {
    name: 'Milton Friedman',
    dates: '1912-2006',
    works: ['Capitalism and Freedom', 'Monetary History'],
    keyIdeas: {
      monetarism: 'Money supply determines inflation',
      freeMarkets: 'Competitive capitalism promotes freedom',
      methodology: 'Theories judged by predictive power, not assumptions',
      negativeIncTax: 'Proposed negative income tax for welfare'
    },
    positivism: 'Economics as positive science',
    phi: PHI_INV
  });
}

/**
 * Initialize economic concepts
 */
function initializeConcepts() {
  state.concepts.set('value', {
    name: 'Economic Value',
    theories: {
      labor: 'Value from labor time embodied (Smith, Ricardo, Marx)',
      subjective: 'Value from subjective preferences (Marginalists)',
      utility: 'Value from satisfaction derived (Neoclassical)',
      exchange: 'Value revealed in exchange (Market)',
      intrinsic: 'Some things have inherent worth (Aristotelian)'
    },
    paradox: 'Water-diamond paradox: Use value vs. exchange value',
    phi: PHI_INV
  });

  state.concepts.set('rationality', {
    name: 'Economic Rationality',
    models: {
      homoEconomicus: 'Utility-maximizing, self-interested agent',
      bounded: 'Satisficing under cognitive limits (Simon)',
      ecological: 'Rationality adapted to environment (Gigerenzer)',
      expressive: 'Voting/action can express values, not just maximize',
      procedural: 'Process of decision-making, not just outcomes'
    },
    critiques: {
      behavioral: 'Systematic biases violate rationality axioms',
      feminist: 'Rational economic man ignores care and emotion',
      cultural: 'Rationality culturally embedded'
    },
    phi: PHI_INV
  });

  state.concepts.set('market', {
    name: 'The Market',
    views: {
      mechanism: 'Price system allocating scarce resources',
      institution: 'Socially constructed rules of exchange',
      ideology: 'Market fundamentalism as neoliberal faith',
      process: 'Entrepreneurial discovery procedure (Austrian)',
      moral: 'Markets can corrupt or express moral norms'
    },
    limits: {
      externalities: 'Third-party effects not priced',
      publicGoods: 'Non-excludable, non-rivalrous goods underprovided',
      information: 'Asymmetric information causes market failure',
      power: 'Unequal bargaining power distorts outcomes'
    },
    phi: PHI_INV
  });

  state.concepts.set('efficiency', {
    name: 'Economic Efficiency',
    types: {
      pareto: 'No one can be made better off without making someone worse off',
      kaldorHicks: 'Gains could potentially compensate losses',
      allocative: 'Resources go to highest-valued uses',
      productive: 'Maximum output from given inputs',
      dynamic: 'Innovation and growth over time'
    },
    critique: 'Pareto efficiency compatible with extreme inequality',
    tradeoffs: 'Efficiency vs. equity tension',
    phi: PHI_INV
  });

  state.concepts.set('justice-economic', {
    name: 'Economic Justice',
    principles: {
      desert: 'People should get what they deserve/earn',
      need: 'Distribution based on human needs',
      equality: 'Equal shares for all',
      difference: 'Maximize position of worst-off (Rawls)',
      entitlement: 'Just holdings from just acquisition/transfer (Nozick)',
      sufficiency: 'Everyone should have enough',
      capability: 'Ensure basic capabilities for all (Sen)'
    },
    tensions: 'Liberty vs. equality, desert vs. need, local vs. global',
    phi: PHI_INV
  });

  state.concepts.set('property', {
    name: 'Property Rights',
    theories: {
      labor: 'Mixing labor creates entitlement (Locke)',
      utilitarian: 'Property promotes efficient use',
      convention: 'Property is social convention (Hume)',
      bundle: 'Property as bundle of rights, not single thing',
      social: 'Property comes with social obligations'
    },
    debates: {
      intellectual: 'Should ideas be owned?',
      commons: 'Should some resources be held in common?',
      land: 'Is land ownership justified?'
    },
    phi: PHI_INV
  });

  state.concepts.set('money', {
    name: 'Money',
    theories: {
      commodity: 'Money is a commodity (gold)',
      chartalist: 'Money is state-created credit (MMT)',
      credit: 'Money arises from debt relations',
      social: 'Money is social technology of account'
    },
    functions: ['Medium of exchange', 'Store of value', 'Unit of account'],
    neutrality: 'Is money neutral or does it affect real economy?',
    phi: PHI_INV
  });

  state.concepts.set('welfare', {
    name: 'Welfare Economics',
    approaches: {
      utilitarian: 'Maximize aggregate utility',
      paretoWelfare: 'Efficiency without interpersonal comparison',
      socialChoice: 'Aggregate preferences into social choice',
      capabilities: 'Expand what people can do and be'
    },
    arrow: 'Arrow impossibility: No perfect aggregation rule',
    interpersonal: 'Can we compare utility across persons?',
    phi: PHI_INV
  });
}

/**
 * Initialize economic debates
 */
function initializeDebates() {
  state.debates.set('socialism-calculation', {
    name: 'Socialist Calculation Debate',
    question: 'Can socialism allocate resources rationally?',
    positions: {
      mises: 'Without prices, no rational economic calculation possible',
      hayek: 'Planners cannot access dispersed knowledge',
      lange: 'Market socialism can simulate price mechanism',
      modern: 'Debate continues in information age'
    },
    resolution: 'Unresolved; computation and AI reopen questions',
    phi: PHI_INV
  });

  state.debates.set('positive-normative', {
    name: 'Positive vs. Normative Economics',
    question: 'Can economics be value-free?',
    positions: {
      positivist: 'Economics describes what is, not what ought to be',
      critic: 'All economic claims embed normative assumptions',
      pragmatist: 'Distinction useful but not absolute'
    },
    examples: {
      efficiency: 'Efficiency seems positive but presupposes values',
      growth: 'GDP growth as goal is normative choice'
    },
    phi: PHI_INV
  });

  state.debates.set('methodological-individualism', {
    name: 'Methodological Individualism',
    question: 'Should economics explain only through individual choices?',
    positions: {
      individualist: 'Only individuals act; macro must reduce to micro',
      holist: 'Social structures have causal powers',
      emergentist: 'Macro properties emerge from but irreducible to micro'
    },
    implications: 'Shapes how we model institutions, classes, cultures',
    phi: PHI_INV
  });

  state.debates.set('markets-morality', {
    name: 'Markets and Morality',
    question: 'Do markets corrupt moral values or express them?',
    positions: {
      corruption: 'Some goods should not be for sale (Sandel)',
      expression: 'Markets can embody and promote virtues',
      neutral: 'Markets are tools; morality is in how we use them',
      constitutive: 'Markets shape what we value'
    },
    cases: ['Organ sales', 'Surrogate motherhood', 'Carbon trading', 'Prediction markets'],
    phi: PHI_INV
  });

  state.debates.set('growth-sustainability', {
    name: 'Growth and Sustainability',
    question: 'Is perpetual economic growth possible and desirable?',
    positions: {
      prGrowth: 'Growth enables human flourishing',
      degrowth: 'Ecological limits require shrinking economies',
      greenGrowth: 'Decouple growth from environmental harm',
      postGrowth: 'Move beyond growth as primary goal'
    },
    tensions: 'Development vs. environment, present vs. future',
    phi: PHI_INV
  });

  state.debates.set('global-justice', {
    name: 'Global Economic Justice',
    question: 'What do rich countries owe poor countries?',
    positions: {
      cosmopolitan: 'Global difference principle (Pogge, Beitz)',
      nationalist: 'Special obligations to co-nationals (Miller)',
      sufficientarian: 'Ensure global minimum for all',
      relational: 'Justice depends on relationships (Blake)'
    },
    issues: ['Trade', 'Aid', 'Migration', 'Climate', 'Debt'],
    phi: PHI_INV
  });
}

/**
 * Initialize methodologies
 */
function initializeMethodologies() {
  state.methodologies.set('positivism', {
    name: 'Economic Positivism',
    thesis: 'Economics as predictive science',
    friedman: 'Assumptions need not be realistic if predictions work',
    critique: 'Unrealistic assumptions lead to unreliable predictions',
    phi: PHI_INV
  });

  state.methodologies.set('critical-realism', {
    name: 'Critical Realism',
    thesis: 'Economics studies real causal mechanisms',
    lawson: 'Social reality is open, structured, changing',
    method: 'Identify generative mechanisms, not covering laws',
    phi: PHI_INV
  });

  state.methodologies.set('hermeneutics', {
    name: 'Hermeneutic Economics',
    thesis: 'Economics requires interpretation of meaning',
    approach: 'Understand agents\' self-understanding',
    lachmann: 'Market is meeting place of divergent expectations',
    phi: PHI_INV
  });

  state.methodologies.set('experimental', {
    name: 'Experimental Economics',
    thesis: 'Test economic theory in controlled settings',
    lab: 'Laboratory experiments on decision-making',
    field: 'Field experiments in natural settings',
    rct: 'Randomized controlled trials for policy',
    phi: PHI_INV
  });

  state.methodologies.set('feminist', {
    name: 'Feminist Economics',
    thesis: 'Gender matters for economic analysis',
    critiques: {
      unpaidLabor: 'Care work ignored in economic accounts',
      homoEconomicus: 'Male-coded assumptions of self-interest',
      household: 'Bargaining within households, not unified utility'
    },
    phi: PHI_INV
  });
}

// ═══════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function getTheory(id) {
  return state.theories.get(id) || { error: 'Theory not found', query: id };
}

function getThinker(id) {
  return state.thinkers.get(id) || { error: 'Thinker not found', query: id };
}

function getConcept(id) {
  return state.concepts.get(id) || { error: 'Concept not found', query: id };
}

function getDebate(id) {
  return state.debates.get(id) || { error: 'Debate not found', query: id };
}

function getMethodology(id) {
  return state.methodologies.get(id) || { error: 'Methodology not found', query: id };
}

function listTheories() {
  return Array.from(state.theories.values()).map(t => ({
    name: t.name,
    period: t.period,
    thesis: t.keyIdeas ? Object.values(t.keyIdeas)[0] : t.thesis
  }));
}

function listThinkers() {
  return Array.from(state.thinkers.values()).map(t => ({
    name: t.name,
    dates: t.dates,
    key: t.keyIdeas ? Object.keys(t.keyIdeas)[0] : Object.keys(t.economicIdeas || {})[0]
  }));
}

// ═══════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Analyze economic topic from multiple perspectives
 */
function analyzeEconomic(topic) {
  const lowerTopic = topic.toLowerCase();

  const perspectives = {};

  // Classical view
  if (lowerTopic.includes('value') || lowerTopic.includes('price')) {
    perspectives.classical = 'Labor theory: value from embodied labor';
    perspectives.neoclassical = 'Subjective utility at the margin determines value';
  }

  // Market views
  if (lowerTopic.includes('market')) {
    perspectives.austrian = 'Discovery procedure for dispersed knowledge';
    perspectives.marxian = 'Arena of exploitation and class struggle';
    perspectives.institutional = 'Socially constructed rules of exchange';
  }

  // Distribution
  if (lowerTopic.includes('inequality') || lowerTopic.includes('distribution')) {
    perspectives.rawlsian = 'Justify only if benefits worst-off';
    perspectives.libertarian = 'Just if from just process';
    perspectives.capability = 'Focus on what people can do and be';
  }

  // State role
  if (lowerTopic.includes('government') || lowerTopic.includes('state')) {
    perspectives.keynesian = 'State can stabilize demand and employment';
    perspectives.austrian = 'Minimal state; markets self-organize';
    perspectives.institutional = 'State shapes market institutions';
  }

  // Default
  if (Object.keys(perspectives).length === 0) {
    perspectives.neoclassical = 'Analyze through utility maximization framework';
    perspectives.behavioral = 'Consider cognitive biases and heuristics';
    perspectives.institutional = 'Examine rules and norms shaping behavior';
    perspectives.critical = 'Question power relations and interests served';
  }

  return {
    topic,
    perspectives,
    methodologies: {
      positive: 'What are the empirical facts?',
      normative: 'What values are at stake?',
      institutional: 'What rules shape outcomes?'
    },
    cynicNote: `*sniff* Economics claims value-neutrality but always serves someone. φ-bounded: ${(PHI_INV * 100).toFixed(1)}% max confidence.`,
    phi: PHI_INV
  };
}

/**
 * Compare economic theories
 */
function compareTheories(theory1Id, theory2Id) {
  const t1 = getTheory(theory1Id);
  const t2 = getTheory(theory2Id);

  if (t1.error || t2.error) {
    return { error: 'Theory not found', theories: [theory1Id, theory2Id] };
  }

  return {
    theories: [t1.name, t2.name],
    comparison: {
      value: {
        [t1.name]: t1.keyIdeas?.laborValue || t1.keyIdeas?.marginalUtility || 'See theory',
        [t2.name]: t2.keyIdeas?.laborValue || t2.keyIdeas?.marginalUtility || 'See theory'
      },
      method: {
        [t1.name]: t1.mathematization || t1.dialectical || 'Varied',
        [t2.name]: t2.mathematization || t2.dialectical || 'Varied'
      }
    },
    cynicNote: '*ears perk* Every economic theory is also a political stance.',
    phi: PHI_INV
  };
}

// ═══════════════════════════════════════════════════════════════════
// STATUS AND STATS
// ═══════════════════════════════════════════════════════════════════

function formatStatus() {
  const lines = [
    '┌─────────────────────────────────────────────────────┐',
    '│     PHILOSOPHY OF ECONOMICS ENGINE                  │',
    '│     *sniff* The dismal science examined             │',
    '├─────────────────────────────────────────────────────┤',
    `│  Theories: ${state.theories.size.toString().padStart(2)}    Methodologies: ${state.methodologies.size.toString().padStart(2)}             │`,
    `│  Thinkers: ${state.thinkers.size.toString().padStart(2)}    Debates: ${state.debates.size.toString().padStart(2)}                    │`,
    `│  Concepts: ${state.concepts.size.toString().padStart(2)}                                  │`,
    '├─────────────────────────────────────────────────────┤',
    `│  φ-bound: ${(PHI_INV * 100).toFixed(1)}% max confidence               │`,
    '│  Markets reflect not truth but interests            │',
    '└─────────────────────────────────────────────────────┘'
  ];
  return lines.join('\n');
}

function getStats() {
  return {
    theories: state.theories.size,
    thinkers: state.thinkers.size,
    concepts: state.concepts.size,
    debates: state.debates.size,
    methodologies: state.methodologies.size,
    phi: PHI_INV
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  init,
  getTheory,
  getThinker,
  getConcept,
  getDebate,
  getMethodology,
  listTheories,
  listThinkers,
  analyzeEconomic,
  compareTheories,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
