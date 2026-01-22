/**
 * Semantics Engine - CYNIC Philosophy Integration
 *
 * Implements meaning theory, reference, and truth conditions
 * following Frege, Tarski, and compositional semantics.
 *
 * "The meaning of a sentence is its truth conditions" - Wittgenstein (Tractatus)
 *
 * @module semantics-engine
 */

const fs = require('fs');
const path = require('path');

// φ-derived constants
const PHI = 1.618033988749895;
const PHI_INV = 0.618033988749895;
const PHI_INV_2 = 0.381966011250105;
const PHI_INV_3 = 0.236067977499790;

// Configuration
const STORAGE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.cynic',
  'semantics'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_TERMS = 200;
const MAX_SENTENCES = 100;

/**
 * Frege's Distinction: Sense (Sinn) vs Reference (Bedeutung)
 *
 * Sense: Mode of presentation, cognitive significance
 * Reference: What the expression picks out in the world
 *
 * "Morning Star" and "Evening Star" have different senses
 * but the same reference (Venus)
 */
const SEMANTIC_COMPONENTS = {
  sense: {
    name: 'Sense (Sinn)',
    description: 'Mode of presentation, how reference is given',
    symbol: 'σ',
    level: 'intensional',
  },
  reference: {
    name: 'Reference (Bedeutung)',
    description: 'What the expression denotes',
    symbol: 'ρ',
    level: 'extensional',
  },
  force: {
    name: 'Force',
    description: 'How content is presented (assertion, question, etc.)',
    symbol: 'F',
    level: 'pragmatic',
  },
};

/**
 * Expression Types
 */
const EXPRESSION_TYPES = {
  singular_term: {
    name: 'Singular Term',
    description: 'Refers to single entity',
    examples: ['names', 'definite descriptions', 'demonstratives'],
    referenceType: 'individual',
  },
  predicate: {
    name: 'Predicate',
    description: 'Expresses property or relation',
    examples: ['is red', 'loves', 'between'],
    referenceType: 'concept/function',
  },
  sentence: {
    name: 'Sentence',
    description: 'Expresses complete thought',
    examples: ['Snow is white', 'The cat sat'],
    referenceType: 'truth-value',
  },
  quantifier: {
    name: 'Quantifier',
    description: 'Expresses quantity',
    examples: ['all', 'some', 'no', 'most'],
    referenceType: 'second-order',
  },
  connective: {
    name: 'Connective',
    description: 'Combines sentences',
    examples: ['and', 'or', 'if...then', 'not'],
    referenceType: 'truth-function',
  },
};

/**
 * Truth Condition Types (Tarski)
 */
const TRUTH_CONDITION_TYPES = {
  atomic: {
    name: 'Atomic',
    description: 'Basic predication',
    form: 'P(a) is true iff a has property P',
  },
  conjunction: {
    name: 'Conjunction',
    description: 'Both conjuncts true',
    form: '(A ∧ B) is true iff A is true and B is true',
  },
  disjunction: {
    name: 'Disjunction',
    description: 'At least one disjunct true',
    form: '(A ∨ B) is true iff A is true or B is true',
  },
  negation: {
    name: 'Negation',
    description: 'Content is false',
    form: '¬A is true iff A is not true',
  },
  conditional: {
    name: 'Conditional',
    description: 'Material implication',
    form: '(A → B) is true iff A is false or B is true',
  },
  universal: {
    name: 'Universal',
    description: 'All instances true',
    form: '∀x.P(x) is true iff P(a) is true for all a',
  },
  existential: {
    name: 'Existential',
    description: 'Some instance true',
    form: '∃x.P(x) is true iff P(a) is true for some a',
  },
};

/**
 * Semantic Relations
 */
const SEMANTIC_RELATIONS = {
  synonymy: {
    name: 'Synonymy',
    description: 'Same sense and reference',
    symbol: '≡',
  },
  coreference: {
    name: 'Coreference',
    description: 'Same reference, different sense',
    symbol: '≈',
    example: 'Morning Star ≈ Evening Star',
  },
  hyponymy: {
    name: 'Hyponymy',
    description: 'Subset relation',
    symbol: '⊂',
    example: 'dog ⊂ animal',
  },
  antonymy: {
    name: 'Antonymy',
    description: 'Opposite meaning',
    symbol: '⊥',
  },
  entailment: {
    name: 'Entailment',
    description: 'Semantic consequence',
    symbol: '⊨',
  },
  presupposition: {
    name: 'Presupposition',
    description: 'Background assumption',
    symbol: '≫',
    example: '"The king of France is bald" ≫ there is a king of France',
  },
};

// State
let state = {
  terms: {},            // Registered terms with sense/reference
  sentences: {},        // Analyzed sentences
  domain: {},           // Domain of discourse
  relations: [],        // Semantic relations
  stats: {
    termsRegistered: 0,
    sentencesAnalyzed: 0,
    truthConditionsSet: 0,
    relationsIdentified: 0,
  },
  lastUpdated: null,
};

/**
 * Initialize module
 */
function init() {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...saved };
    }
  } catch (err) {
    console.error('Semantics engine init error:', err.message);
  }
}

/**
 * Save state
 */
function saveState() {
  try {
    state.lastUpdated = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Semantics engine save error:', err.message);
  }
}

/**
 * Log to history
 */
function logHistory(entry) {
  try {
    const record = {
      ...entry,
      timestamp: Date.now(),
    };
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(record) + '\n');
  } catch (err) {
    // Silent fail for history
  }
}

/**
 * Register a term with its sense and reference (Frege)
 *
 * @param {string} expression - The linguistic expression
 * @param {string} sense - Mode of presentation
 * @param {any} reference - What it denotes
 * @param {object} config - Configuration
 * @returns {object} Registered term
 */
function registerTerm(expression, sense, reference, config = {}) {
  if (Object.keys(state.terms).length >= MAX_TERMS) {
    return { error: 'Maximum terms reached' };
  }

  const expType = EXPRESSION_TYPES[config.type] || EXPRESSION_TYPES.singular_term;
  const id = expression.toLowerCase().replace(/\s+/g, '_');

  const term = {
    id,
    expression,
    // Frege's distinction
    sense,
    reference,
    // Type info
    type: config.type || 'singular_term',
    typeInfo: expType,
    // Additional semantic info
    extension: reference, // For predicates, the set of things it applies to
    intension: sense,     // The property/concept itself
    // Rigidity (Kripke)
    isRigid: config.rigid || false, // Same reference in all possible worlds
    // Empty terms
    hasReference: reference !== null && reference !== undefined,
    registeredAt: Date.now(),
  };

  state.terms[id] = term;
  state.stats.termsRegistered++;

  // Add to domain if reference given
  if (term.hasReference && config.type === 'singular_term') {
    state.domain[id] = reference;
  }

  logHistory({
    type: 'term_registered',
    id,
    expression,
    hasReference: term.hasReference,
  });

  saveState();

  return {
    term,
    message: `${SEMANTIC_COMPONENTS.sense.symbol}/${SEMANTIC_COMPONENTS.reference.symbol} "${expression}": sense="${sense}", ref=${reference !== null ? String(reference).slice(0, 20) : 'empty'}`,
  };
}

/**
 * Analyze a sentence's truth conditions (Tarski-style)
 *
 * @param {string} sentence - The sentence to analyze
 * @param {object} structure - Logical structure
 * @param {object} config - Configuration
 * @returns {object} Truth condition analysis
 */
function analyzeSentence(sentence, structure, config = {}) {
  if (Object.keys(state.sentences).length >= MAX_SENTENCES) {
    // Prune old sentences
    const keys = Object.keys(state.sentences);
    for (let i = 0; i < Math.floor(keys.length * PHI_INV_2); i++) {
      delete state.sentences[keys[i]];
    }
  }

  const id = `sent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Determine truth condition type
  const tcType = determineTruthConditionType(structure);

  const sentenceAnalysis = {
    id,
    sentence,
    // Logical structure
    structure: {
      form: structure.form || 'atomic',
      predicate: structure.predicate || null,
      subject: structure.subject || null,
      arguments: structure.arguments || [],
      connective: structure.connective || null,
      quantifier: structure.quantifier || null,
    },
    // Truth conditions
    truthConditionType: tcType.name,
    truthConditionInfo: tcType,
    truthCondition: generateTruthCondition(sentence, structure),
    // Semantic value (Frege: reference of sentence = truth value)
    truthValue: config.truthValue || null, // true, false, or null (unknown)
    // Presuppositions
    presuppositions: structure.presuppositions || [],
    // Compositionality - built from parts
    isCompositional: true,
    components: structure.components || [],
    analyzedAt: Date.now(),
  };

  state.sentences[id] = sentenceAnalysis;
  state.stats.sentencesAnalyzed++;
  state.stats.truthConditionsSet++;

  logHistory({
    type: 'sentence_analyzed',
    id,
    sentence: sentence.slice(0, 50),
    form: structure.form,
  });

  saveState();

  return {
    analysis: sentenceAnalysis,
    message: `T-schema: "${sentence.slice(0, 30)}..." is true iff ${sentenceAnalysis.truthCondition.slice(0, 40)}...`,
  };
}

/**
 * Determine truth condition type from structure
 */
function determineTruthConditionType(structure) {
  if (structure.connective === 'and') return TRUTH_CONDITION_TYPES.conjunction;
  if (structure.connective === 'or') return TRUTH_CONDITION_TYPES.disjunction;
  if (structure.connective === 'not') return TRUTH_CONDITION_TYPES.negation;
  if (structure.connective === 'if') return TRUTH_CONDITION_TYPES.conditional;
  if (structure.quantifier === 'all') return TRUTH_CONDITION_TYPES.universal;
  if (structure.quantifier === 'some') return TRUTH_CONDITION_TYPES.existential;
  return TRUTH_CONDITION_TYPES.atomic;
}

/**
 * Generate natural language truth condition
 */
function generateTruthCondition(sentence, structure) {
  if (structure.form === 'atomic') {
    const subject = structure.subject || 'the subject';
    const predicate = structure.predicate || 'has the property';
    return `${subject} ${predicate}`;
  }

  if (structure.connective === 'and') {
    return `both ${structure.left} and ${structure.right}`;
  }

  if (structure.connective === 'or') {
    return `either ${structure.left} or ${structure.right} (or both)`;
  }

  if (structure.connective === 'not') {
    return `it is not the case that ${structure.content}`;
  }

  if (structure.quantifier === 'all') {
    return `for every ${structure.variable}, ${structure.scope}`;
  }

  if (structure.quantifier === 'some') {
    return `there exists some ${structure.variable} such that ${structure.scope}`;
  }

  return sentence; // Fallback
}

/**
 * Evaluate truth value of a sentence in current domain
 *
 * @param {string} sentenceId - Sentence to evaluate
 * @returns {object} Evaluation result
 */
function evaluateTruth(sentenceId) {
  const sentence = state.sentences[sentenceId];
  if (!sentence) return { error: 'Sentence not found' };

  // Check if we can evaluate
  if (sentence.truthValue !== null) {
    return {
      sentenceId,
      sentence: sentence.sentence,
      truthValue: sentence.truthValue,
      certainty: PHI_INV,
      message: `"${sentence.sentence.slice(0, 30)}..." is ${sentence.truthValue}`,
    };
  }

  // Try to evaluate based on domain
  const structure = sentence.structure;
  const truthValue = null;
  let certainty = PHI_INV_3;

  if (structure.form === 'atomic' && structure.subject && structure.predicate) {
    // Check domain for subject
    const subjectRef = state.domain[structure.subject.toLowerCase().replace(/\s+/g, '_')];
    if (subjectRef !== undefined) {
      // We have the referent but would need predicate interpretation
      certainty = PHI_INV_2;
    }
  }

  return {
    sentenceId,
    sentence: sentence.sentence,
    truthValue,
    certainty,
    message: truthValue !== null
      ? `"${sentence.sentence.slice(0, 30)}..." is ${truthValue}`
      : `Cannot determine truth value (certainty: ${(certainty * 100).toFixed(0)}%)`,
  };
}

/**
 * Identify semantic relation between expressions
 *
 * @param {string} expr1 - First expression
 * @param {string} expr2 - Second expression
 * @param {string} relationType - Type of relation
 * @returns {object} Relation result
 */
function identifyRelation(expr1, expr2, relationType) {
  const relType = SEMANTIC_RELATIONS[relationType];
  if (!relType) return { error: 'Unknown relation type' };

  const term1 = state.terms[expr1.toLowerCase().replace(/\s+/g, '_')];
  const term2 = state.terms[expr2.toLowerCase().replace(/\s+/g, '_')];

  // Validate relation
  let isValid = false;
  let explanation = '';

  switch (relationType) {
    case 'synonymy':
      // Same sense and reference
      if (term1 && term2) {
        isValid = term1.sense === term2.sense && term1.reference === term2.reference;
        explanation = isValid
          ? 'Same sense and same reference'
          : 'Different sense or reference';
      }
      break;

    case 'coreference':
      // Same reference, different sense
      if (term1 && term2) {
        isValid = term1.reference === term2.reference && term1.sense !== term2.sense;
        explanation = isValid
          ? 'Same reference but different senses (Frege\'s puzzle)'
          : term1.reference === term2.reference
            ? 'Same sense - use synonymy'
            : 'Different references';
      }
      break;

    case 'entailment':
      // Would need full logical analysis
      isValid = true; // Assume declared relations are valid
      explanation = `If "${expr1}" is true, then "${expr2}" must be true`;
      break;

    default:
      isValid = true;
      explanation = `Declared ${relationType} relation`;
  }

  const relation = {
    id: `rel-${Date.now()}`,
    expr1,
    expr2,
    type: relationType,
    typeInfo: relType,
    isValid,
    explanation,
    identifiedAt: Date.now(),
  };

  state.relations.push(relation);
  state.stats.relationsIdentified++;

  logHistory({
    type: 'relation_identified',
    expr1,
    expr2,
    relationType,
    isValid,
  });

  saveState();

  return {
    relation,
    message: `${relType.symbol} ${expr1} ${relType.symbol} ${expr2}: ${isValid ? 'valid' : 'invalid'}`,
  };
}

/**
 * Check compositionality - meaning of whole from parts
 *
 * @param {string} sentenceId - Sentence to check
 * @returns {object} Compositionality analysis
 */
function checkCompositionality(sentenceId) {
  const sentence = state.sentences[sentenceId];
  if (!sentence) return { error: 'Sentence not found' };

  const components = sentence.components || [];
  const resolvedComponents = components.map(comp => {
    const term = state.terms[comp.toLowerCase().replace(/\s+/g, '_')];
    return {
      expression: comp,
      hasMeaning: !!term,
      sense: term?.sense || null,
      reference: term?.reference || null,
    };
  });

  const allResolved = resolvedComponents.every(c => c.hasMeaning);

  return {
    sentenceId,
    sentence: sentence.sentence,
    components: resolvedComponents,
    isFullyCompositional: allResolved,
    principle: 'The meaning of the whole is determined by the meanings of the parts and how they are combined',
    message: allResolved
      ? `✓ Fully compositional: all ${components.length} components have meanings`
      : `○ Partially compositional: ${resolvedComponents.filter(c => c.hasMeaning).length}/${components.length} components resolved`,
  };
}

/**
 * Handle empty terms (Russell vs Frege vs Strawson)
 *
 * @param {string} expression - Expression to analyze
 * @returns {object} Empty term analysis
 */
function analyzeEmptyTerm(expression) {
  const term = state.terms[expression.toLowerCase().replace(/\s+/g, '_')];

  if (term && term.hasReference) {
    return {
      expression,
      isEmpty: false,
      message: `"${expression}" has reference: ${term.reference}`,
    };
  }

  // Analyze as empty term
  return {
    expression,
    isEmpty: true,
    analyses: {
      frege: {
        position: 'Sentences with empty terms have no truth value',
        explanation: 'Reference failure → truth value gap',
      },
      russell: {
        position: 'Definite descriptions are analyzed away',
        explanation: '"The F is G" → "∃x(Fx ∧ ∀y(Fy → y=x) ∧ Gx)"',
      },
      strawson: {
        position: 'Reference is a presupposition, not assertion',
        explanation: 'Presupposition failure → no statement made',
      },
    },
    message: `"${expression}" is an empty term - multiple analyses available`,
  };
}

/**
 * Get term by expression
 */
function getTerm(expression) {
  return state.terms[expression.toLowerCase().replace(/\s+/g, '_')] || null;
}

/**
 * Get sentence by ID
 */
function getSentence(sentenceId) {
  return state.sentences[sentenceId] || null;
}

/**
 * Get all terms
 */
function getTerms() {
  return Object.values(state.terms);
}

/**
 * Get domain
 */
function getDomain() {
  return { ...state.domain };
}

/**
 * Format status for display
 */
function formatStatus() {
  const withRef = Object.values(state.terms).filter(t => t.hasReference).length;
  const empty = Object.values(state.terms).filter(t => !t.hasReference).length;

  return `σ/ρ Semantics Engine (Frege/Tarski)
  Terms: ${state.stats.termsRegistered} (${withRef} with ref, ${empty} empty)
  Sentences: ${state.stats.sentencesAnalyzed}
  Truth conditions: ${state.stats.truthConditionsSet}
  Relations: ${state.stats.relationsIdentified}
  Domain size: ${Object.keys(state.domain).length}`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    termCount: Object.keys(state.terms).length,
    sentenceCount: Object.keys(state.sentences).length,
    domainSize: Object.keys(state.domain).length,
  };
}

module.exports = {
  init,
  registerTerm,
  analyzeSentence,
  evaluateTruth,
  identifyRelation,
  checkCompositionality,
  analyzeEmptyTerm,
  getTerm,
  getSentence,
  getTerms,
  getDomain,
  formatStatus,
  getStats,
  SEMANTIC_COMPONENTS,
  EXPRESSION_TYPES,
  TRUTH_CONDITION_TYPES,
  SEMANTIC_RELATIONS,
};
