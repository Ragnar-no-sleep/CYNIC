/**
 * Value Theory (Axiology) - CYNIC Philosophy Integration
 *
 * Implements value hierarchies, intrinsic/instrumental distinction,
 * and value trade-off analysis following Aristotle, Moore, and Scheler.
 *
 * "Not everything that counts can be counted" - Einstein (attributed)
 *
 * @module value-theory
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
  'value-theory'
);
const STATE_FILE = path.join(STORAGE_DIR, 'state.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const MAX_VALUES = 100;
const MAX_HIERARCHY_DEPTH = 7;

/**
 * Value Types (Moore's distinction)
 * Intrinsic values are good in themselves; instrumental are good as means
 */
const VALUE_TYPES = {
  intrinsic: {
    name: 'Intrinsic Value',
    description: 'Good in itself, not merely as means',
    symbol: '◈',
    weight: PHI_INV + PHI_INV_2, // 1.0 - highest
    examples: ['happiness', 'knowledge', 'beauty', 'virtue'],
  },
  instrumental: {
    name: 'Instrumental Value',
    description: 'Good as means to something else',
    symbol: '◇',
    weight: PHI_INV,
    examples: ['money', 'tools', 'skills', 'power'],
  },
  contributory: {
    name: 'Contributory Value',
    description: 'Contributes to a whole\'s value',
    symbol: '◆',
    weight: PHI_INV_2,
    examples: ['ingredients in a meal', 'notes in a chord'],
  },
  inherent: {
    name: 'Inherent Value',
    description: 'Value in experience of objects',
    symbol: '○',
    weight: PHI_INV_2,
    examples: ['aesthetic experience', 'contemplation'],
  },
};

/**
 * Value Domains (Scheler's material value ethics)
 * Hierarchy from lower to higher values
 */
const VALUE_DOMAINS = {
  hedonic: {
    name: 'Hedonic Values',
    description: 'Pleasure and pain, comfort',
    rank: 1,
    weight: PHI_INV_3,
    examples: ['pleasure', 'comfort', 'satiation'],
  },
  vital: {
    name: 'Vital Values',
    description: 'Life, health, strength',
    rank: 2,
    weight: PHI_INV_2,
    examples: ['health', 'vitality', 'courage'],
  },
  spiritual: {
    name: 'Spiritual Values',
    description: 'Truth, beauty, justice',
    rank: 3,
    weight: PHI_INV,
    examples: ['knowledge', 'beauty', 'justice', 'freedom'],
  },
  holy: {
    name: 'Holy/Sacred Values',
    description: 'Ultimate meaning and significance',
    rank: 4,
    weight: PHI_INV + PHI_INV_3,
    examples: ['salvation', 'enlightenment', 'transcendence'],
  },
};

/**
 * Value Relations
 */
const VALUE_RELATIONS = {
  higher_than: {
    name: 'Higher Than',
    description: 'Ranks above in value hierarchy',
    symbol: '>',
  },
  means_to: {
    name: 'Means To',
    description: 'Instrumental relation',
    symbol: '→',
  },
  constitutive_of: {
    name: 'Constitutive Of',
    description: 'Part of the valuable whole',
    symbol: '⊂',
  },
  incompatible_with: {
    name: 'Incompatible With',
    description: 'Cannot both be realized',
    symbol: '⊥',
  },
  enhances: {
    name: 'Enhances',
    description: 'Increases the value of',
    symbol: '+',
  },
};

/**
 * Trade-off Types
 */
const TRADEOFF_TYPES = {
  tragic: {
    name: 'Tragic Choice',
    description: 'Both options involve genuine loss',
    severity: 1.0,
    symbol: '⚡',
  },
  sacrifice: {
    name: 'Sacrifice',
    description: 'Lower value yields to higher',
    severity: PHI_INV,
    symbol: '↓',
  },
  optimization: {
    name: 'Optimization',
    description: 'Maximizing within constraints',
    severity: PHI_INV_2,
    symbol: '⚖',
  },
  lexical: {
    name: 'Lexical Priority',
    description: 'Higher value takes absolute precedence',
    severity: PHI_INV_3,
    symbol: '≫',
  },
};

// State
let state = {
  values: {},           // Registered values
  hierarchies: {},      // Value orderings
  tradeoffs: [],        // Recorded trade-off situations
  judgments: [],        // Value judgments made
  stats: {
    valuesRegistered: 0,
    hierarchiesBuilt: 0,
    tradeoffsAnalyzed: 0,
    judgmentsMade: 0,
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
    console.error('Value theory init error:', err.message);
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
    console.error('Value theory save error:', err.message);
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
 * Register a value
 *
 * @param {string} name - Value name
 * @param {string} type - Value type (intrinsic, instrumental, etc.)
 * @param {object} config - Configuration
 * @returns {object} Registered value
 */
function registerValue(name, type = 'intrinsic', config = {}) {
  if (Object.keys(state.values).length >= MAX_VALUES) {
    return { error: 'Maximum values reached' };
  }

  const valueType = VALUE_TYPES[type] || VALUE_TYPES.intrinsic;
  const domain = VALUE_DOMAINS[config.domain] || VALUE_DOMAINS.spiritual;
  const id = name.toLowerCase().replace(/\s+/g, '_');

  const value = {
    id,
    name,
    type,
    typeInfo: valueType,
    domain: config.domain || 'spiritual',
    domainInfo: domain,
    description: config.description || '',
    // Moore's analysis
    intrinsicGoodness: type === 'intrinsic' ? PHI_INV + PHI_INV_2 : PHI_INV_2,
    // Relations to other values
    meansTo: [],      // What this is instrumental for
    constitutes: [],  // What wholes this contributes to
    enhances: [],     // What this enhances
    incompatibleWith: [],
    // Metadata
    registeredAt: Date.now(),
  };

  state.values[id] = value;
  state.stats.valuesRegistered++;

  logHistory({
    type: 'value_registered',
    id,
    valueType: type,
    domain: config.domain,
  });

  saveState();

  return {
    value,
    message: `${valueType.symbol} Registered ${valueType.name}: ${name}`,
  };
}

/**
 * Add a relation between values
 *
 * @param {string} fromId - Source value
 * @param {string} toId - Target value
 * @param {string} relation - Relation type
 * @returns {object} Result
 */
function addRelation(fromId, toId, relation) {
  const from = state.values[fromId];
  const to = state.values[toId];

  if (!from || !to) {
    return { error: 'Value not found' };
  }

  const relType = VALUE_RELATIONS[relation];
  if (!relType) {
    return { error: 'Unknown relation type' };
  }

  // Store relation
  switch (relation) {
    case 'means_to':
      if (!from.meansTo.includes(toId)) {
        from.meansTo.push(toId);
      }
      break;
    case 'constitutive_of':
      if (!from.constitutes.includes(toId)) {
        from.constitutes.push(toId);
      }
      break;
    case 'enhances':
      if (!from.enhances.includes(toId)) {
        from.enhances.push(toId);
      }
      break;
    case 'incompatible_with':
      if (!from.incompatibleWith.includes(toId)) {
        from.incompatibleWith.push(toId);
      }
      if (!to.incompatibleWith.includes(fromId)) {
        to.incompatibleWith.push(fromId);
      }
      break;
  }

  saveState();

  return {
    from: fromId,
    to: toId,
    relation,
    symbol: relType.symbol,
    message: `${from.name} ${relType.symbol} ${to.name}`,
  };
}

/**
 * Create a value hierarchy
 *
 * @param {string} name - Hierarchy name
 * @param {array} ordering - Values from highest to lowest
 * @returns {object} Created hierarchy
 */
function createHierarchy(name, ordering) {
  if (ordering.length > MAX_HIERARCHY_DEPTH) {
    return { error: 'Hierarchy too deep' };
  }

  const id = name.toLowerCase().replace(/\s+/g, '_');

  // Validate all values exist
  for (const valueId of ordering) {
    if (!state.values[valueId]) {
      return { error: `Value not found: ${valueId}` };
    }
  }

  // Calculate weights based on position
  const ranked = ordering.map((valueId, index) => ({
    valueId,
    rank: index + 1,
    weight: PHI_INV ** index, // Exponential decay
    value: state.values[valueId],
  }));

  const hierarchy = {
    id,
    name,
    ordering,
    ranked,
    depth: ordering.length,
    createdAt: Date.now(),
  };

  state.hierarchies[id] = hierarchy;
  state.stats.hierarchiesBuilt++;

  logHistory({
    type: 'hierarchy_created',
    id,
    depth: ordering.length,
  });

  saveState();

  return {
    hierarchy,
    message: `Created hierarchy "${name}" with ${ordering.length} levels`,
  };
}

/**
 * Compare two values within a hierarchy
 *
 * @param {string} valueA - First value ID
 * @param {string} valueB - Second value ID
 * @param {string} hierarchyId - Hierarchy to use
 * @returns {object} Comparison result
 */
function compareValues(valueA, valueB, hierarchyId = null) {
  const a = state.values[valueA];
  const b = state.values[valueB];

  if (!a || !b) {
    return { error: 'Value not found' };
  }

  // If hierarchy specified, use that ordering
  if (hierarchyId && state.hierarchies[hierarchyId]) {
    const h = state.hierarchies[hierarchyId];
    const rankA = h.ordering.indexOf(valueA);
    const rankB = h.ordering.indexOf(valueB);

    if (rankA === -1 || rankB === -1) {
      return { error: 'Value not in hierarchy' };
    }

    const result = rankA < rankB ? 'higher' : rankA > rankB ? 'lower' : 'equal';

    return {
      comparison: result,
      valueA: { id: valueA, name: a.name, rank: rankA + 1 },
      valueB: { id: valueB, name: b.name, rank: rankB + 1 },
      hierarchy: hierarchyId,
      message: `${a.name} is ${result} than ${b.name} in ${h.name}`,
    };
  }

  // Default: compare by domain rank and type weight
  const scoreA = a.domainInfo.rank * PHI + a.typeInfo.weight;
  const scoreB = b.domainInfo.rank * PHI + b.typeInfo.weight;

  const result = scoreA > scoreB ? 'higher' : scoreA < scoreB ? 'lower' : 'equal';

  return {
    comparison: result,
    valueA: { id: valueA, name: a.name, score: scoreA },
    valueB: { id: valueB, name: b.name, score: scoreB },
    message: `${a.name} is ${result} than ${b.name} (by domain/type)`,
  };
}

/**
 * Analyze a trade-off situation
 *
 * @param {string} valueA - First value ID
 * @param {string} valueB - Second value ID
 * @param {object} context - Situation context
 * @returns {object} Trade-off analysis
 */
function analyzeTradeoff(valueA, valueB, context = {}) {
  const a = state.values[valueA];
  const b = state.values[valueB];

  if (!a || !b) {
    return { error: 'Value not found' };
  }

  // Check for incompatibility
  const areIncompatible = a.incompatibleWith.includes(valueB);

  // Determine trade-off type
  let tradeoffType;

  if (a.domainInfo.rank === b.domainInfo.rank && a.type === b.type) {
    // Same level - tragic choice
    tradeoffType = TRADEOFF_TYPES.tragic;
  } else if (Math.abs(a.domainInfo.rank - b.domainInfo.rank) >= 2) {
    // Large rank difference - lexical priority
    tradeoffType = TRADEOFF_TYPES.lexical;
  } else if (a.domainInfo.rank !== b.domainInfo.rank) {
    // Different ranks - sacrifice
    tradeoffType = TRADEOFF_TYPES.sacrifice;
  } else {
    // Same domain, different types - optimization
    tradeoffType = TRADEOFF_TYPES.optimization;
  }

  // Calculate comparative scores
  const scoreA = a.domainInfo.weight * a.typeInfo.weight;
  const scoreB = b.domainInfo.weight * b.typeInfo.weight;
  const ratio = scoreA / (scoreA + scoreB);

  // Recommendation
  let recommendation;
  if (tradeoffType === TRADEOFF_TYPES.tragic) {
    recommendation = 'No clear resolution - both options involve genuine loss';
  } else if (tradeoffType === TRADEOFF_TYPES.lexical) {
    recommendation = scoreA > scoreB
      ? `Prioritize ${a.name} (lexically prior)`
      : `Prioritize ${b.name} (lexically prior)`;
  } else {
    recommendation = ratio > PHI_INV
      ? `Lean toward ${a.name} (${(ratio * 100).toFixed(0)}% weight)`
      : `Lean toward ${b.name} (${((1 - ratio) * 100).toFixed(0)}% weight)`;
  }

  const tradeoff = {
    id: `trd-${Date.now()}`,
    valueA: { id: valueA, name: a.name, score: scoreA },
    valueB: { id: valueB, name: b.name, score: scoreB },
    type: tradeoffType.name,
    typeInfo: tradeoffType,
    areIncompatible,
    ratio,
    recommendation,
    context,
    analyzedAt: Date.now(),
  };

  state.tradeoffs.push(tradeoff);
  if (state.tradeoffs.length > 50) {
    state.tradeoffs = state.tradeoffs.slice(-40);
  }
  state.stats.tradeoffsAnalyzed++;

  logHistory({
    type: 'tradeoff_analyzed',
    valueA,
    valueB,
    tradeoffType: tradeoffType.name,
  });

  saveState();

  return {
    tradeoff,
    message: `${tradeoffType.symbol} ${tradeoffType.name}: ${a.name} vs ${b.name}`,
  };
}

/**
 * Make a value judgment
 *
 * @param {string} subject - What is being judged
 * @param {array} values - Values being affirmed
 * @param {object} config - Configuration
 * @returns {object} Value judgment
 */
function judge(subject, values, config = {}) {
  // Resolve values
  const resolvedValues = values.map(v => {
    const value = state.values[v];
    return value || { id: v, name: v, virtual: true };
  });

  // Calculate aggregate score
  const totalWeight = resolvedValues.reduce((sum, v) => {
    if (v.virtual) return sum + PHI_INV_3;
    return sum + (v.domainInfo?.weight || PHI_INV_2) * (v.typeInfo?.weight || PHI_INV_2);
  }, 0);

  const avgWeight = totalWeight / resolvedValues.length;

  // Determine judgment strength
  let strength;
  if (avgWeight > PHI_INV) {
    strength = 'strong';
  } else if (avgWeight > PHI_INV_2) {
    strength = 'moderate';
  } else {
    strength = 'weak';
  }

  const judgment = {
    id: `jdg-${Date.now()}`,
    subject,
    values: resolvedValues.map(v => ({ id: v.id, name: v.name })),
    totalWeight,
    avgWeight,
    strength,
    confidence: Math.min(avgWeight, PHI_INV), // φ⁻¹ max
    reason: config.reason || '',
    madeAt: Date.now(),
  };

  state.judgments.push(judgment);
  if (state.judgments.length > 50) {
    state.judgments = state.judgments.slice(-40);
  }
  state.stats.judgmentsMade++;

  logHistory({
    type: 'judgment_made',
    subject,
    valueCount: values.length,
    strength,
  });

  saveState();

  return {
    judgment,
    message: `${strength} value judgment on "${subject}" (${resolvedValues.length} values, φ⁻¹ conf: ${(judgment.confidence * 100).toFixed(0)}%)`,
  };
}

/**
 * Get instrumental chain for a value
 *
 * @param {string} valueId - Value to trace
 * @returns {object} Instrumental chain
 */
function getInstrumentalChain(valueId) {
  const value = state.values[valueId];
  if (!value) return { error: 'Value not found' };

  const chain = [];
  const visited = new Set();

  function trace(id, depth) {
    if (visited.has(id) || depth > MAX_HIERARCHY_DEPTH) return;
    visited.add(id);

    const v = state.values[id];
    if (!v) return;

    for (const targetId of v.meansTo) {
      chain.push({
        from: id,
        to: targetId,
        depth,
      });
      trace(targetId, depth + 1);
    }
  }

  trace(valueId, 0);

  // Find ultimate intrinsic values
  const intrinsicEnds = chain
    .map(c => c.to)
    .filter(id => {
      const v = state.values[id];
      return v && v.type === 'intrinsic';
    });

  return {
    valueId,
    valueName: value.name,
    chain,
    intrinsicEnds: [...new Set(intrinsicEnds)],
    message: chain.length > 0
      ? `${value.name} leads to ${intrinsicEnds.length} intrinsic value(s)`
      : `${value.name} has no traced instrumental relations`,
  };
}

/**
 * Get value by ID
 */
function getValue(valueId) {
  return state.values[valueId] || null;
}

/**
 * Get all values
 */
function getValues() {
  return Object.values(state.values);
}

/**
 * Get hierarchy by ID
 */
function getHierarchy(hierarchyId) {
  return state.hierarchies[hierarchyId] || null;
}

/**
 * Format status for display
 */
function formatStatus() {
  const intrinsicCount = Object.values(state.values)
    .filter(v => v.type === 'intrinsic').length;
  const instrumentalCount = Object.values(state.values)
    .filter(v => v.type === 'instrumental').length;

  return `◈ Value Theory (Axiology)
  Values: ${Object.keys(state.values).length} (${intrinsicCount} intrinsic, ${instrumentalCount} instrumental)
  Hierarchies: ${Object.keys(state.hierarchies).length}
  Trade-offs: ${state.stats.tradeoffsAnalyzed} analyzed
  Judgments: ${state.stats.judgmentsMade} made`;
}

/**
 * Get stats
 */
function getStats() {
  return {
    ...state.stats,
    valueCount: Object.keys(state.values).length,
    hierarchyCount: Object.keys(state.hierarchies).length,
    recentTradeoffs: state.tradeoffs.slice(-5),
    recentJudgments: state.judgments.slice(-5),
  };
}

module.exports = {
  init,
  registerValue,
  addRelation,
  createHierarchy,
  compareValues,
  analyzeTradeoff,
  judge,
  getInstrumentalChain,
  getValue,
  getValues,
  getHierarchy,
  formatStatus,
  getStats,
  VALUE_TYPES,
  VALUE_DOMAINS,
  VALUE_RELATIONS,
  TRADEOFF_TYPES,
};
