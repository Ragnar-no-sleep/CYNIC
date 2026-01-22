#!/usr/bin/env node

/**
 * Law-Economics Integration Engine - Phase 44C
 *
 * Where legal philosophy meets economic analysis:
 * Property, contracts, torts, regulation, constitutional economics.
 *
 * φ-bounded: max 61.8% confidence
 *
 * *sniff* Where law meets money, cui bono matters most.
 */

const path = require('path');
const os = require('os');

// φ constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// Storage
const STORAGE_DIR = path.join(os.homedir(), '.cynic', 'law-economics');

// State
const state = {
  initialized: false,
  movements: new Map(),
  thinkers: new Map(),
  concepts: new Map(),
  domains: new Map(),
  critiques: new Map()
};

/**
 * Initialize the Law-Economics Engine
 */
function init() {
  if (state.initialized) {
    return { status: 'already initialized', phi: PHI_INV };
  }

  initializeMovements();
  initializeThinkers();
  initializeConcepts();
  initializeDomains();
  initializeCritiques();

  state.initialized = true;
  return { status: 'initialized', phi: PHI_INV };
}

/**
 * Initialize law & economics movements
 */
function initializeMovements() {
  state.movements.set('chicago-school', {
    name: 'Chicago School Law & Economics',
    period: '1960s-present',
    center: 'University of Chicago',
    founders: ['Ronald Coase', 'Richard Posner', 'Gary Becker'],
    thesis: 'Legal rules should maximize wealth/efficiency',
    methodology: {
      assumption: 'People respond rationally to legal incentives',
      goal: 'Design rules that minimize transaction costs',
      criterion: 'Wealth maximization as legal criterion'
    },
    keyIdeas: {
      coaseTheorem: 'With no transaction costs, law is irrelevant to efficiency',
      wealthMax: 'Law should maximize aggregate wealth',
      efficiency: 'Common law evolves toward efficient rules'
    },
    strength: PHI_INV
  });

  state.movements.set('new-haven', {
    name: 'New Haven School',
    period: '1970s-present',
    center: 'Yale Law School',
    founders: ['Guido Calabresi', 'Bruce Ackerman'],
    thesis: 'Law & economics must include distributional concerns',
    methodology: {
      broader: 'Beyond efficiency to justice and distribution',
      mixed: 'Combine economic analysis with moral reasoning'
    },
    keyIdeas: {
      cheapestCostAvoider: 'Assign liability to party who can prevent harm cheaply',
      tragicChoices: 'Some allocations involve incommensurable values',
      distributive: 'Efficiency analysis cannot ignore distribution'
    },
    strength: PHI_INV
  });

  state.movements.set('constitutional-economics', {
    name: 'Constitutional Political Economy',
    period: '1962-present',
    founders: ['James Buchanan', 'Gordon Tullock'],
    thesis: 'Constitutional rules as social contract for collective action',
    methodology: {
      contractarian: 'What rules would rational parties agree to?',
      publicChoice: 'Apply economic logic to political behavior'
    },
    keyIdeas: {
      unanimity: 'Constitutional rules require (near) unanimous consent',
      rentseeking: 'Groups use politics to capture economic rents',
      constraints: 'Constitutions constrain Leviathan government'
    },
    buchanansQuote: 'Politics without romance',
    strength: PHI_INV
  });

  state.movements.set('behavioral-law', {
    name: 'Behavioral Law & Economics',
    period: '1990s-present',
    founders: ['Cass Sunstein', 'Christine Jolls', 'Russell Korobkin'],
    thesis: 'Law must account for cognitive biases and bounded rationality',
    methodology: {
      realistic: 'Use empirically grounded psychology',
      paternalism: 'Libertarian paternalism: nudge, don\'t mandate'
    },
    keyIdeas: {
      defaultRules: 'Defaults powerfully shape choices',
      debiasing: 'Law can correct cognitive biases',
      nudge: 'Choice architecture preserves freedom while improving outcomes'
    },
    strength: PHI_INV
  });

  state.movements.set('critical-law-econ', {
    name: 'Critical Law & Economics',
    period: '1980s-present',
    thesis: 'Standard law & economics masks power and distributive choices',
    critiques: {
      efficiency: 'Wealth maximization favors status quo distributions',
      assumptions: 'Rational actor model is ideological, not scientific',
      values: 'Law & economics pretends to be value-neutral but isn\'t'
    },
    alternatives: {
      progressive: 'Center justice and equality, not just efficiency',
      feminist: 'Analyze how law & econ affects gender',
      racial: 'Examine racial dimensions of legal-economic rules'
    },
    strength: PHI_INV
  });
}

/**
 * Initialize thinkers
 */
function initializeThinkers() {
  state.thinkers.set('coase', {
    name: 'Ronald Coase',
    dates: '1910-2013',
    works: ['Problem of Social Cost', 'Nature of the Firm'],
    contributions: {
      coaseTheorem: 'Initial entitlement irrelevant to efficiency if no transaction costs',
      transactionCosts: 'Firms exist to reduce transaction costs',
      realWorld: 'Positive transaction costs are ubiquitous'
    },
    method: 'Study how the economy actually works, not blackboard economics',
    influence: 'Founded law & economics movement',
    phi: PHI_INV
  });

  state.thinkers.set('posner', {
    name: 'Richard Posner',
    dates: '1939-present',
    works: ['Economic Analysis of Law', 'Problems of Jurisprudence'],
    contributions: {
      wealthMax: 'Wealth maximization as criterion for legal rules',
      commonLaw: 'Common law evolves toward efficiency',
      judicial: 'Judges should consider economic consequences'
    },
    controversial: 'Argued for market in babies, efficiency over rights',
    evolution: 'Later moved toward pragmatism',
    phi: PHI_INV
  });

  state.thinkers.set('calabresi', {
    name: 'Guido Calabresi',
    dates: '1932-present',
    works: ['Costs of Accidents', 'Tragic Choices'],
    contributions: {
      cheapestCost: 'Assign accident costs to cheapest cost avoider',
      tragic: 'Some choices involve incommensurable values',
      distributive: 'Efficiency analysis must consider distribution'
    },
    humane: 'More concerned with justice than Chicago school',
    phi: PHI_INV
  });

  state.thinkers.set('buchanan', {
    name: 'James Buchanan',
    dates: '1919-2013',
    works: ['Calculus of Consent', 'Limits of Liberty'],
    contributions: {
      publicChoice: 'Apply economic analysis to political decisions',
      constitutional: 'Focus on rules, not outcomes within rules',
      contractarian: 'Legitimacy from hypothetical agreement'
    },
    quote: 'Politicians and bureaucrats are no different from the rest of us',
    phi: PHI_INV
  });

  state.thinkers.set('sunstein', {
    name: 'Cass Sunstein',
    dates: '1954-present',
    works: ['Nudge', 'Laws of Fear', 'Cost-Benefit State'],
    contributions: {
      nudge: 'Choice architecture can improve decisions',
      costBenefit: 'Regulatory analysis essential',
      behavioral: 'Integrate psychology into legal analysis'
    },
    phi: PHI_INV
  });

  state.thinkers.set('williamson', {
    name: 'Oliver Williamson',
    dates: '1932-2020',
    works: ['Markets and Hierarchies', 'Economic Institutions of Capitalism'],
    contributions: {
      governance: 'Match transaction characteristics to governance structures',
      opportunism: 'Self-interest seeking with guile',
      assetSpecificity: 'Specialized investments create hold-up problems'
    },
    phi: PHI_INV
  });

  state.thinkers.set('demsetz', {
    name: 'Harold Demsetz',
    dates: '1930-2019',
    works: ['Toward a Theory of Property Rights'],
    contributions: {
      propertyRights: 'Property rights emerge to internalize externalities',
      nirvana: 'Nirvana fallacy: don\'t compare real to ideal',
      competition: 'Competition for monopoly is also competitive'
    },
    phi: PHI_INV
  });
}

/**
 * Initialize concepts
 */
function initializeConcepts() {
  state.concepts.set('coase-theorem', {
    name: 'Coase Theorem',
    statement: 'If transaction costs are zero, initial allocation of legal entitlements is irrelevant to efficiency',
    versions: {
      strong: 'Parties will bargain to efficient outcome regardless of initial rights',
      weak: 'In zero-TC world, efficiency achieved; in positive-TC world, assign rights to minimize TC'
    },
    implications: {
      forLaw: 'When transaction costs high, law must mimic what parties would have agreed to',
      practical: 'Transaction costs are never zero—so initial entitlements matter'
    },
    critiques: {
      distributive: 'Ignores who gets the surplus from bargaining',
      behavioral: 'Assumes rational bargainers; real people have biases',
      power: 'Ignores bargaining power differences'
    },
    phi: PHI_INV
  });

  state.concepts.set('transaction-costs', {
    name: 'Transaction Costs',
    definition: 'Costs of market exchange beyond production costs',
    types: {
      search: 'Finding trading partners',
      bargaining: 'Negotiating terms',
      enforcement: 'Ensuring compliance',
      measurement: 'Assessing quality'
    },
    implications: {
      firms: 'Firms exist to economize on transaction costs',
      contracts: 'Contract law fills gaps parties couldn\'t anticipate',
      property: 'Clear property rights reduce transaction costs'
    },
    phi: PHI_INV
  });

  state.concepts.set('property-rules-liability', {
    name: 'Property Rules vs. Liability Rules',
    source: 'Calabresi & Melamed (1972)',
    propertyRule: {
      definition: 'Entitlement can only be taken with holder\'s consent',
      protection: 'Injunction available',
      when: 'Low transaction costs; parties can bargain'
    },
    liabilityRule: {
      definition: 'Entitlement can be taken if objectively determined value paid',
      protection: 'Damages available',
      when: 'High transaction costs; bargaining impractical'
    },
    inalienability: {
      definition: 'Entitlement cannot be transferred at all',
      when: 'Paternalism or externalities justify'
    },
    phi: PHI_INV
  });

  state.concepts.set('efficient-breach', {
    name: 'Efficient Breach',
    thesis: 'Breach of contract should occur when breaching party gains more than promisee loses',
    remedy: 'Expectation damages make breach efficient when it should be',
    debate: {
      pro: 'Promotes efficient reallocation of resources',
      con: 'Undermines trust and promise-keeping values'
    },
    phi: PHI_INV
  });

  state.concepts.set('cheapest-cost-avoider', {
    name: 'Cheapest Cost Avoider',
    source: 'Calabresi',
    principle: 'Assign accident liability to party who can most cheaply prevent harm',
    application: {
      torts: 'Strict liability when one party clearly cheaper avoider',
      negligence: 'When either party could prevent, negligence rule appropriate'
    },
    informational: 'Also consider who best knows the risks',
    phi: PHI_INV
  });

  state.concepts.set('rent-seeking', {
    name: 'Rent-Seeking',
    definition: 'Seeking economic gain through political manipulation rather than production',
    examples: ['Lobbying for tariffs', 'Occupational licensing', 'Regulatory capture'],
    costs: {
      direct: 'Resources spent on lobbying',
      indirect: 'Inefficient policies adopted',
      deadweight: 'Lost surplus from distorted rules'
    },
    buchanan: 'Democracy as competition for rents',
    phi: PHI_INV
  });

  state.concepts.set('externalities', {
    name: 'Externalities',
    definition: 'Costs or benefits that affect parties not involved in transaction',
    types: {
      negative: 'Pollution, noise, congestion',
      positive: 'Education spillovers, vaccination',
      pecuniary: 'Price effects (not real externalities)'
    },
    solutions: {
      pigouvian: 'Tax negative, subsidize positive',
      coasean: 'Define property rights and let parties bargain',
      regulatory: 'Command and control rules'
    },
    phi: PHI_INV
  });

  state.concepts.set('regulatory-takings', {
    name: 'Regulatory Takings',
    question: 'When must government compensate for regulations that reduce property value?',
    positions: {
      broad: 'Any significant value reduction requires compensation',
      narrow: 'Only physical occupation or total wipeout',
      nuisance: 'No compensation for preventing nuisances'
    },
    economic: {
      pro: 'Compensation forces government to internalize costs',
      con: 'Compensation requirement paralyzes beneficial regulation'
    },
    phi: PHI_INV
  });

  state.concepts.set('hand-formula', {
    name: 'Hand Formula',
    source: 'Judge Learned Hand, US v. Carroll Towing (1947)',
    formula: 'Negligent if B < P × L',
    variables: {
      B: 'Burden of precaution',
      P: 'Probability of harm',
      L: 'Magnitude of loss'
    },
    meaning: 'Take precautions when cost of precaution less than expected harm',
    economicBasis: 'Minimizes total social costs of accidents',
    phi: PHI_INV
  });
}

/**
 * Initialize legal-economic domains
 */
function initializeDomains() {
  state.domains.set('property', {
    name: 'Property Law & Economics',
    questions: [
      'How should property rights be defined and assigned?',
      'When should takings require compensation?',
      'How to balance private rights and public goods?'
    ],
    insights: {
      tragedy: 'Commons problems when no clear ownership',
      anticommons: 'Too many owners can block efficient use',
      bundle: 'Property as bundle of rights; can be unbundled',
      evolution: 'Property rights evolve with scarcity (Demsetz)'
    },
    applications: ['Land use', 'Intellectual property', 'Spectrum', 'Water'],
    phi: PHI_INV
  });

  state.domains.set('contracts', {
    name: 'Contract Law & Economics',
    questions: [
      'What terms would parties have agreed to?',
      'When should contracts be unenforceable?',
      'What remedies promote efficient behavior?'
    ],
    insights: {
      gapFilling: 'Default rules mimic what parties would have wanted',
      signaling: 'Contract formalities signal seriousness',
      penalties: 'Punitive damages may over-deter breach',
      relational: 'Long-term contracts require flexibility'
    },
    applications: ['Employment', 'Consumer', 'Commercial', 'Marriage'],
    phi: PHI_INV
  });

  state.domains.set('torts', {
    name: 'Tort Law & Economics',
    questions: [
      'Who should bear accident costs?',
      'What standard of care is efficient?',
      'Should damages be compensatory or punitive?'
    ],
    insights: {
      deterrence: 'Tort law creates incentives for care',
      insurance: 'Tort system as social insurance',
      bilateral: 'Both injurer and victim can prevent harm',
      activity: 'Not just care level but activity level matters'
    },
    applications: ['Products liability', 'Medical malpractice', 'Environmental'],
    phi: PHI_INV
  });

  state.domains.set('criminal', {
    name: 'Criminal Law & Economics',
    questions: [
      'What is optimal level of enforcement?',
      'How to set punishment efficiently?',
      'When to use fines vs. imprisonment?'
    ],
    insights: {
      becker: 'Criminals as rational actors responding to incentives',
      optimal: 'Balance deterrence against enforcement costs',
      fines: 'Prefer fines (cheaper) unless judgment-proof',
      probability: 'Certainty of punishment more effective than severity'
    },
    applications: ['White-collar', 'Drug policy', 'Corporate crime'],
    phi: PHI_INV
  });

  state.domains.set('regulation', {
    name: 'Regulatory Economics',
    questions: [
      'When does market failure justify regulation?',
      'How to design efficient regulations?',
      'How to prevent regulatory capture?'
    ],
    insights: {
      capture: 'Regulated industries may capture regulators',
      costBenefit: 'Regulations should pass cost-benefit test',
      alternatives: 'Consider taxes, subsidies, information as alternatives',
      dynamic: 'Regulation can stifle innovation'
    },
    applications: ['Environmental', 'Financial', 'Health & safety', 'Antitrust'],
    phi: PHI_INV
  });

  state.domains.set('litigation', {
    name: 'Law of Civil Procedure & Economics',
    questions: [
      'What procedures minimize total costs?',
      'How to encourage settlement?',
      'What fee arrangements are efficient?'
    ],
    insights: {
      settlement: 'Most cases settle; litigation is costly',
      discovery: 'Balance information benefits against costs',
      feeShifting: 'Different rules (American vs. English) affect behavior',
      class: 'Class actions solve collective action problems'
    },
    phi: PHI_INV
  });
}

/**
 * Initialize critiques
 */
function initializeCritiques() {
  state.critiques.set('distributive', {
    name: 'Distributive Critique',
    claim: 'Law & economics ignores or sidelines distribution',
    arguments: {
      efficiency: 'Kaldor-Hicks efficiency doesn\'t require actual compensation',
      baseline: 'Efficiency analysis assumes current distribution is legitimate',
      who: 'Wealth maximization serves those with wealth'
    },
    response: 'Address distribution separately through taxes and transfers',
    counterResponse: 'Separation thesis fails; efficiency and distribution intertwined',
    phi: PHI_INV
  });

  state.critiques.set('commodification', {
    name: 'Commodification Critique',
    claim: 'Law & economics treats everything as commodity',
    arguments: {
      values: 'Some goods shouldn\'t be for sale',
      incommensurable: 'Not all values reducible to money',
      degrading: 'Pricing can degrade what is priced'
    },
    examples: ['Organ markets', 'Surrogacy', 'Pollution permits'],
    phi: PHI_INV
  });

  state.critiques.set('behavioral', {
    name: 'Behavioral Critique',
    claim: 'Rational actor model is empirically false',
    evidence: {
      biases: 'Systematic cognitive biases affect decisions',
      framing: 'Choices depend on how options presented',
      bounded: 'Rationality is limited by cognitive capacity'
    },
    implications: 'Predictions from rational model may be wrong',
    defense: 'Markets may discipline irrational actors; aggregation may cancel biases',
    phi: PHI_INV
  });

  state.critiques.set('rights-based', {
    name: 'Rights-Based Critique',
    claim: 'Some rights are not subject to cost-benefit analysis',
    arguments: {
      trumps: 'Rights trump utility calculations (Dworkin)',
      dignity: 'Human dignity not tradeable',
      inviolability: 'Some prohibitions are absolute'
    },
    tension: 'Efficiency analysis vs. deontological constraints',
    phi: PHI_INV
  });

  state.critiques.set('feminist', {
    name: 'Feminist Critique',
    claim: 'Law & economics embeds masculine assumptions',
    arguments: {
      homoEconomicus: 'Rational actor ignores care and connection',
      unpaidLabor: 'Ignores household production and care work',
      bargaining: 'Ignores intra-household power dynamics',
      markets: 'Market norms inappropriate for intimate relations'
    },
    phi: PHI_INV
  });
}

// ═══════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function getMovement(id) {
  return state.movements.get(id) || { error: 'Movement not found', query: id };
}

function getThinker(id) {
  return state.thinkers.get(id) || { error: 'Thinker not found', query: id };
}

function getConcept(id) {
  return state.concepts.get(id) || { error: 'Concept not found', query: id };
}

function getDomain(id) {
  return state.domains.get(id) || { error: 'Domain not found', query: id };
}

function getCritique(id) {
  return state.critiques.get(id) || { error: 'Critique not found', query: id };
}

function listMovements() {
  return Array.from(state.movements.values()).map(m => ({
    name: m.name,
    period: m.period,
    thesis: m.thesis
  }));
}

function listDomains() {
  return Array.from(state.domains.values()).map(d => ({
    name: d.name,
    questions: d.questions[0]
  }));
}

// ═══════════════════════════════════════════════════════════════════
// ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Analyze legal-economic problem
 */
function analyzeLegalEconomic(problem) {
  const lower = problem.toLowerCase();

  const analysis = {
    problem,
    approaches: {}
  };

  // Property issues
  if (lower.includes('property') || lower.includes('ownership') || lower.includes('taking')) {
    analysis.approaches.coasean = 'Define clear property rights; let parties bargain';
    analysis.approaches.demsetz = 'Property rights emerge to internalize externalities';
    analysis.approaches.distributive = 'Initial allocation affects final distribution';
  }

  // Contract issues
  if (lower.includes('contract') || lower.includes('agreement') || lower.includes('breach')) {
    analysis.approaches.gapFilling = 'What would parties have agreed to ex ante?';
    analysis.approaches.efficientBreach = 'Allow breach when gains exceed losses';
    analysis.approaches.relational = 'Consider ongoing relationships, not just spot transactions';
  }

  // Tort/accident issues
  if (lower.includes('tort') || lower.includes('accident') || lower.includes('liability')) {
    analysis.approaches.cheapestCost = 'Who can most cheaply prevent the harm?';
    analysis.approaches.deterrence = 'What rule creates optimal incentives for care?';
    analysis.approaches.insurance = 'Who can best bear or spread the risk?';
  }

  // Regulation issues
  if (lower.includes('regulat') || lower.includes('government') || lower.includes('policy')) {
    analysis.approaches.costBenefit = 'Do benefits justify costs?';
    analysis.approaches.capture = 'Beware regulatory capture by industry';
    analysis.approaches.alternatives = 'Consider market-based alternatives';
  }

  // Default analysis
  if (Object.keys(analysis.approaches).length === 0) {
    analysis.approaches.efficiency = 'Which rule minimizes total social costs?';
    analysis.approaches.distribution = 'Who gains and who loses?';
    analysis.approaches.transaction = 'What are the transaction costs involved?';
    analysis.approaches.behavioral = 'How do real people (not rational actors) behave?';
  }

  analysis.cynicNote = `*sniff* Cui bono? Who benefits from this rule? φ-bounded: ${(PHI_INV * 100).toFixed(1)}% max confidence.`;
  analysis.phi = PHI_INV;

  return analysis;
}

/**
 * Apply Coase theorem analysis
 */
function coaseAnalysis(situation) {
  return {
    situation,
    coaseTheorem: {
      question: 'Can the affected parties bargain?',
      zeroTC: 'If transaction costs are zero, parties will reach efficient outcome regardless of initial rights',
      positiveTC: 'In real world with positive TC, initial assignment matters'
    },
    analysis: {
      transactionCosts: 'What are the costs of bargaining here?',
      parties: 'How many parties are affected?',
      information: 'Do parties know each other\'s valuations?',
      enforcement: 'Can agreements be enforced?'
    },
    recommendation: 'If TC high, assign rights to party who values them most or can prevent harm cheapest',
    cynicNote: '*ears perk* Coase taught us that in a frictionless world, law doesn\'t matter. But we live in a world full of friction.',
    phi: PHI_INV
  };
}

// ═══════════════════════════════════════════════════════════════════
// STATUS AND STATS
// ═══════════════════════════════════════════════════════════════════

function formatStatus() {
  const lines = [
    '┌─────────────────────────────────────────────────────┐',
    '│     LAW-ECONOMICS INTEGRATION ENGINE                │',
    '│     *sniff* Where law meets markets                 │',
    '├─────────────────────────────────────────────────────┤',
    `│  Movements: ${state.movements.size.toString().padStart(2)}    Domains: ${state.domains.size.toString().padStart(2)}                  │`,
    `│  Thinkers: ${state.thinkers.size.toString().padStart(2)}     Critiques: ${state.critiques.size.toString().padStart(2)}               │`,
    `│  Concepts: ${state.concepts.size.toString().padStart(2)}                                  │`,
    '├─────────────────────────────────────────────────────┤',
    `│  φ-bound: ${(PHI_INV * 100).toFixed(1)}% max confidence               │`,
    '│  Efficiency masks distribution. Cui bono?          │',
    '└─────────────────────────────────────────────────────┘'
  ];
  return lines.join('\n');
}

function getStats() {
  return {
    movements: state.movements.size,
    thinkers: state.thinkers.size,
    concepts: state.concepts.size,
    domains: state.domains.size,
    critiques: state.critiques.size,
    phi: PHI_INV
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  init,
  getMovement,
  getThinker,
  getConcept,
  getDomain,
  getCritique,
  listMovements,
  listDomains,
  analyzeLegalEconomic,
  coaseAnalysis,
  formatStatus,
  getStats,
  PHI,
  PHI_INV,
  PHI_INV_2,
  PHI_INV_3
};
