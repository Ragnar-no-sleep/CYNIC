/**
 * CYNIC Wisdom Query Interface
 *
 * "The dog speaks truth from the well of human thought"
 *
 * Unified interface to query 77+ philosophical/wisdom engines.
 * Routes questions to relevant domains and synthesizes φ-bounded responses.
 *
 * @module cynic/lib/wisdom-query
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load decision constants
const DC = require('./decision-constants.cjs');

// =============================================================================
// DOMAIN REGISTRY - Maps topics to engines
// =============================================================================

/**
 * Domain definitions with keywords and engine mappings
 * Organized by philosophical phase (27-45)
 */
const DOMAINS = {
  // Phase 27: Aesthetics & Value
  aesthetics: {
    phase: 27,
    name: 'Aesthetics & Value',
    keywords: ['beauty', 'art', 'aesthetic', 'taste', 'sublime', 'elegance', 'ugly'],
    engines: ['beauty-engine', 'taste-engine', 'art-ontology'],
    qscoreMapping: ['PHI.HARMONY', 'PHI.ELEGANCE', 'BURN.VALUE_CREATION'],
  },

  // Phase 28: Philosophy of Mind
  mind: {
    phase: 28,
    name: 'Philosophy of Mind',
    keywords: ['consciousness', 'mind', 'mental', 'qualia', 'intentional', 'awareness', 'thought'],
    engines: ['consciousness-engine', 'mental-state-engine', 'intentionality-engine'],
    qscoreMapping: ['PHI.COHERENCE', 'CULTURE.AUTHENTICITY'],
  },

  // Phase 29: Philosophy of Language
  language: {
    phase: 29,
    name: 'Philosophy of Language',
    keywords: ['meaning', 'reference', 'language', 'semantics', 'speech', 'linguistic'],
    engines: ['semantics-engine', 'meaning-engine', 'speech-act-engine'],
    qscoreMapping: ['VERIFY.ACCURACY', 'PHI.PRECISION'],
  },

  // Phase 30: Philosophy of Action
  action: {
    phase: 30,
    name: 'Philosophy of Action',
    keywords: ['action', 'agency', 'intention', 'free will', 'decision', 'choice'],
    engines: ['agency-engine', 'action-theory-engine', 'free-will-engine', 'decision-theory-engine'],
    qscoreMapping: ['BURN.UTILITY', 'VERIFY.INTEGRITY'],
  },

  // Phase 31: Social & Political Philosophy
  political: {
    phase: 31,
    name: 'Social & Political Philosophy',
    keywords: ['justice', 'rights', 'political', 'social', 'democracy', 'authority', 'power'],
    engines: ['justice-engine', 'rights-engine', 'social-contract-engine'],
    qscoreMapping: ['CULTURE.IMPACT', 'VERIFY.TRANSPARENCY'],
  },

  // Phase 32: Philosophy of Science
  science: {
    phase: 32,
    name: 'Philosophy of Science',
    keywords: ['science', 'scientific', 'method', 'theory', 'experiment', 'evidence', 'hypothesis'],
    engines: ['scientific-method-engine', 'evidence-engine', 'theory-change-engine', 'explanation-engine'],
    qscoreMapping: ['VERIFY.VERIFIABILITY', 'VERIFY.REPRODUCIBILITY'],
  },

  // Phase 33: Metaphysics II
  metaphysics: {
    phase: 33,
    name: 'Metaphysics',
    keywords: ['identity', 'causation', 'time', 'existence', 'being', 'substance', 'modal', 'possible'],
    engines: ['identity-engine', 'causation-metaphysics-engine', 'time-engine', 'existence-engine', 'modality-engine'],
    qscoreMapping: ['PHI.COHERENCE', 'PHI.STRUCTURE', 'PHI.COMPLETENESS'],
  },

  // Phase 34: Philosophy of Religion
  religion: {
    phase: 34,
    name: 'Philosophy of Religion',
    keywords: ['god', 'religion', 'faith', 'evil', 'theism', 'atheism', 'divine', 'sacred'],
    engines: ['theism-engine', 'evil-engine', 'faith-reason-engine', 'apophatic-engine'],
    qscoreMapping: ['CULTURE.AUTHENTICITY', 'CULTURE.RESONANCE'],
  },

  // Phase 35: Meta-Philosophy
  metaPhilosophy: {
    phase: 35,
    name: 'Meta-Philosophy',
    keywords: ['philosophy', 'method', 'progress', 'argument', 'reasoning', 'inference'],
    engines: ['argument-analyzer', 'method-engine', 'progress-engine', 'coherence-analyzer', 'inference-engine'],
    qscoreMapping: ['PHI.COHERENCE', 'PHI.COMPLETENESS'],
  },

  // Phase 36: Applied Ethics
  appliedEthics: {
    phase: 36,
    name: 'Applied Ethics',
    keywords: ['bioethics', 'environmental', 'technology', 'medical', 'animal', 'sustainability'],
    engines: ['bioethics-engine', 'environmental-ethics-engine', 'tech-ethics-engine'],
    qscoreMapping: ['BURN.SUSTAINABILITY', 'CULTURE.IMPACT'],
  },

  // Phase 37: Eastern Philosophy
  eastern: {
    phase: 37,
    name: 'Eastern Philosophy',
    keywords: ['buddhist', 'buddhism', 'daoist', 'tao', 'zen', 'karma', 'dharma', 'enlightenment', 'vedanta', 'yoga'],
    engines: ['buddhist-engine', 'daoist-engine', 'vedanta-engine'],
    qscoreMapping: ['CULTURE.AUTHENTICITY', 'PHI.HARMONY'],
  },

  // Phase 38: Continental Philosophy
  continental: {
    phase: 38,
    name: 'Continental Philosophy',
    keywords: ['phenomenology', 'existential', 'hermeneutic', 'authentic', 'dasein', 'being', 'deface', 'levinas'],
    engines: ['phenomenology-engine', 'existentialism-engine', 'critical-theory-engine', 'defacement-engine'],
    qscoreMapping: ['CULTURE.AUTHENTICITY', 'VERIFY.PROVENANCE'],
  },

  // Phase 39: Formal Philosophy
  formal: {
    phase: 39,
    name: 'Formal Philosophy',
    keywords: ['logic', 'modal', 'decision', 'game theory', 'rational', 'probability'],
    engines: ['modality-engine', 'decision-theory-engine', 'game-theory', 'deontic-logic'],
    qscoreMapping: ['PHI.STRUCTURE', 'PHI.PRECISION'],
  },

  // Phase 40: CYNIC Synthesis
  synthesis: {
    phase: 40,
    name: 'CYNIC Synthesis',
    keywords: ['synthesis', 'integration', 'cynic', 'phi', 'golden', 'poj', 'anchor', 'proof', 'judgment'],
    engines: ['phi-complete-engine', 'dialectic-synthesizer', 'cross-domain-reasoning-engine', 'poj-strategy', 'graph-populator', 'integration-engine', 'philosophical-judgment-engine'],
    qscoreMapping: ['PHI', 'VERIFY', 'CULTURE', 'BURN'],
  },

  // Phase 41: Philosophy of Mathematics
  mathematics: {
    phase: 41,
    name: 'Philosophy of Mathematics',
    keywords: ['mathematics', 'number', 'proof', 'axiom', 'set theory', 'infinity'],
    engines: ['math-foundations-engine', 'math-ontology-engine', 'math-practice-engine'],
    qscoreMapping: ['PHI.STRUCTURE', 'PHI.PRECISION', 'PHI.COMPLETENESS'],
  },

  // Phase 42: Pragmatism & Process
  pragmatism: {
    phase: 42,
    name: 'Pragmatism & Process',
    keywords: ['pragmatism', 'process', 'inquiry', 'experience', 'practice', 'practical'],
    engines: ['pragmatism-engine', 'process-philosophy-engine', 'kairos-engine', 'duration-engine'],
    qscoreMapping: ['BURN.UTILITY', 'CULTURE.RELEVANCE'],
  },

  // Phase 43: Global Philosophy
  global: {
    phase: 43,
    name: 'Global Philosophy',
    keywords: ['african', 'ubuntu', 'islamic', 'latin american', 'liberation', 'decolonial', 'american', 'pragmatist'],
    engines: ['african-philosophy-engine', 'islamic-philosophy-engine', 'latin-american-philosophy-engine', 'american-philosophy-engine'],
    qscoreMapping: ['CULTURE.RESONANCE', 'BURN.CONTRIBUTION'],
  },

  // Phase 44: Philosophy of Law & Economics
  lawEconomics: {
    phase: 44,
    name: 'Philosophy of Law & Economics',
    keywords: ['law', 'legal', 'economics', 'property', 'contract', 'welfare'],
    engines: ['philosophy-of-law-engine', 'law-economics-engine', 'value-theory', 'philosophy-of-economics-engine'],
    qscoreMapping: ['BURN.UTILITY', 'BURN.VALUE_CREATION'],
  },

  // Phase 45: Cognitive Philosophy
  cognitive: {
    phase: 45,
    name: 'Cognitive Philosophy',
    keywords: ['cognition', 'embodied', 'perception', 'emotion', 'feeling', 'sensory'],
    engines: ['embodied-cognition-engine', 'philosophy-of-perception-engine', 'philosophy-of-emotion-engine'],
    qscoreMapping: ['CULTURE.AUTHENTICITY', 'PHI.COHERENCE'],
  },

  // Ethics (cross-domain)
  ethics: {
    phase: 31,
    name: 'Ethics',
    keywords: ['ethics', 'moral', 'virtue', 'duty', 'good', 'wrong', 'right'],
    engines: ['practical-reason-engine', 'deontic-logic', 'value-theory', 'moral-reasoning'],
    qscoreMapping: ['CULTURE.ALIGNMENT', 'VERIFY.INTEGRITY'],
  },

  // Epistemology (cross-domain)
  epistemology: {
    phase: 32,
    name: 'Epistemology',
    keywords: ['knowledge', 'belief', 'truth', 'justification', 'epistemic', 'know', 'reliable', 'abduction'],
    engines: ['epistemic-engine', 'truth-engine', 'evidence-engine', 'reliabilist-tracker', 'abduction-tracker'],
    qscoreMapping: ['VERIFY.ACCURACY', 'VERIFY.VERIFIABILITY'],
  },

  // Causal Reasoning (cross-domain)
  causation: {
    phase: 33,
    name: 'Causal Reasoning',
    keywords: ['cause', 'effect', 'causal', 'intervention', 'counterfactual', 'because'],
    engines: ['causation-metaphysics-engine', 'causal-graph', 'counterfactual-engine'],
    qscoreMapping: ['PHI.COHERENCE', 'VERIFY.ACCURACY'],
  },

  // Process Philosophy (extended)
  process: {
    phase: 42,
    name: 'Process Philosophy',
    keywords: ['process', 'becoming', 'concrescence', 'actual', 'potential', 'attractor'],
    engines: ['process-philosophy-engine', 'concrescence-monitor', 'attractor-mapping'],
    qscoreMapping: ['PHI.COHERENCE', 'CULTURE.RESONANCE'],
  },

  // Semiotics & Communication
  semiotics: {
    phase: 29,
    name: 'Semiotics',
    keywords: ['sign', 'symbol', 'semiotic', 'meaning', 'interpretation', 'pragmatic'],
    engines: ['semiotic-decoder', 'pragmatics-tracker', 'speech-act-engine'],
    qscoreMapping: ['VERIFY.ACCURACY', 'PHI.PRECISION'],
  },

  // Collective Agency
  collective: {
    phase: 31,
    name: 'Collective Agency',
    keywords: ['collective', 'group', 'social', 'institution', 'we', 'together'],
    engines: ['collective-reasoning', 'social-ontology', 'social-contract-engine'],
    qscoreMapping: ['CULTURE.ALIGNMENT', 'CULTURE.IMPACT'],
  },

  // Socratic Method
  socratic: {
    phase: 35,
    name: 'Socratic Method',
    keywords: ['socratic', 'maieutic', 'question', 'dialogue', 'elenchus', 'aporia'],
    engines: ['elenchus-engine', 'maieutics-mode', 'ti-esti-engine', 'dialectic-synthesizer'],
    qscoreMapping: ['VERIFY.ACCURACY', 'PHI.COHERENCE'],
  },

  // Philosophy of Science (extended)
  scienceTheory: {
    phase: 32,
    name: 'Theory of Science',
    keywords: ['paradigm', 'falsification', 'theory', 'research', 'scientific', 'kuhn', 'popper'],
    engines: ['theory-evaluation', 'paradigm-tracker', 'scientific-method-engine', 'theory-change-engine'],
    qscoreMapping: ['VERIFY.VERIFIABILITY', 'PHI.COMPLETENESS'],
  },

  // CYNIC Internal Philosophy
  cynicInternal: {
    phase: 40,
    name: 'CYNIC Self-Philosophy',
    keywords: ['cynic', 'trust', 'transparency', 'self', 'parrhesia', 'diogenes'],
    engines: ['self-monitor', 'trust-conservation', 'transparency-log', 'transparent-state'],
    qscoreMapping: ['VERIFY.TRANSPARENCY', 'CULTURE.AUTHENTICITY'],
  },
};

// =============================================================================
// ENGINE LOADER - Lazy loading with caching
// =============================================================================

const loadedEngines = new Map();

/**
 * Load an engine by name (lazy loading)
 */
function loadEngine(engineName) {
  if (loadedEngines.has(engineName)) {
    return loadedEngines.get(engineName);
  }

  const enginePath = path.join(__dirname, `${engineName}.cjs`);

  if (!fs.existsSync(enginePath)) {
    return null;
  }

  try {
    const engine = require(enginePath);
    if (engine.init) {
      engine.init();
    }
    loadedEngines.set(engineName, engine);
    return engine;
  } catch (e) {
    console.error(`[wisdom-query] Failed to load ${engineName}: ${e.message}`);
    return null;
  }
}

/**
 * Get all available engines
 */
function getAvailableEngines() {
  const engines = [];
  const libDir = __dirname;

  try {
    const files = fs.readdirSync(libDir);
    for (const file of files) {
      if (file.endsWith('-engine.cjs') || file.endsWith('-theory.cjs') || file.endsWith('-analyzer.cjs')) {
        engines.push(file.replace('.cjs', ''));
      }
    }
  } catch (e) {
    // Directory read failed
  }

  return engines;
}

// =============================================================================
// QUERY ROUTING - Maps questions to relevant domains
// =============================================================================

/**
 * Find domains relevant to a query
 */
function findRelevantDomains(query, maxDomains = 5) {
  const queryLower = query.toLowerCase();
  const scores = [];

  for (const [domainId, domain] of Object.entries(DOMAINS)) {
    let score = 0;

    // Check keyword matches
    for (const keyword of domain.keywords) {
      if (queryLower.includes(keyword)) {
        score += keyword.length; // Longer matches score higher
      }
    }

    if (score > 0) {
      scores.push({
        domainId,
        domain,
        score,
        engines: domain.engines,
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, maxDomains);
}

/**
 * Get engines for a specific domain
 */
function getEnginesForDomain(domainId) {
  const domain = DOMAINS[domainId];
  if (!domain) return [];

  const engines = [];
  for (const engineName of domain.engines) {
    const engine = loadEngine(engineName);
    if (engine) {
      engines.push({ name: engineName, engine, domain: domainId });
    }
  }

  return engines;
}

// =============================================================================
// WISDOM QUERY - Main query interface
// =============================================================================

/**
 * Query wisdom across all relevant domains
 *
 * @param {string} query - The philosophical question
 * @param {Object} options - Query options
 * @returns {Object} Synthesized wisdom response
 */
function queryWisdom(query, options = {}) {
  const maxDomains = options.maxDomains || 5;
  const maxEnginesPerDomain = options.maxEngines || 3;

  // Find relevant domains
  const relevantDomains = findRelevantDomains(query, maxDomains);

  if (relevantDomains.length === 0) {
    // Fallback to synthesis domain
    relevantDomains.push({
      domainId: 'synthesis',
      domain: DOMAINS.synthesis,
      score: 1,
      engines: DOMAINS.synthesis.engines,
    });
  }

  // Collect responses from engines
  const responses = [];
  const enginesQueried = [];

  for (const { domainId, domain, engines } of relevantDomains) {
    for (const engineName of engines.slice(0, maxEnginesPerDomain)) {
      const engine = loadEngine(engineName);
      if (!engine) continue;

      enginesQueried.push(engineName);

      // Try to get wisdom from engine
      const response = extractWisdomFromEngine(engine, query, domainId);
      if (response) {
        responses.push({
          domain: domainId,
          domainName: domain.name,
          phase: domain.phase,
          engine: engineName,
          wisdom: response,
        });
      }
    }
  }

  // Synthesize responses
  const synthesis = synthesizeWisdom(responses, query);

  return {
    query,
    relevantDomains: relevantDomains.map(d => ({
      id: d.domainId,
      name: d.domain.name,
      phase: d.domain.phase,
      score: d.score,
    })),
    enginesQueried,
    responses,
    synthesis,
    confidence: Math.min(DC.PHI.PHI_INV, synthesis.confidence), // φ-bounded
    timestamp: Date.now(),
  };
}

/**
 * Extract wisdom from an engine based on available methods
 */
function extractWisdomFromEngine(engine, query, domainId) {
  // Try different methods engines might have
  const methods = [
    'query',
    'analyze',
    'evaluate',
    'assess',
    'getWisdom',
    'getInsight',
    'process',
  ];

  for (const method of methods) {
    if (typeof engine[method] === 'function') {
      try {
        const result = engine[method](query);
        if (result) return result;
      } catch (e) {
        // Method failed, try next
      }
    }
  }

  // Fallback: check for static knowledge
  if (engine.getStats) {
    try {
      return engine.getStats();
    } catch (e) {
      // Stats failed
    }
  }

  return null;
}

/**
 * Synthesize wisdom from multiple engine responses
 */
function synthesizeWisdom(responses, query) {
  if (responses.length === 0) {
    return {
      summary: '*sniff* No specific wisdom found for this query. Consider breaking it down.',
      perspectives: [],
      confidence: DC.PHI.PHI_INV_3,
      connections: [],
    };
  }

  // Extract unique perspectives
  const perspectives = [];
  const domainsSeen = new Set();

  for (const response of responses) {
    if (!domainsSeen.has(response.domain)) {
      domainsSeen.add(response.domain);
      perspectives.push({
        domain: response.domainName,
        phase: response.phase,
        insight: formatWisdomInsight(response.wisdom),
      });
    }
  }

  // Find cross-domain connections
  const connections = findConnections(responses);

  // Calculate confidence based on coverage
  const coverage = responses.length / Object.keys(DOMAINS).length;
  const diversity = perspectives.length / responses.length;
  const confidence = Math.min(DC.PHI.PHI_INV, coverage * 0.4 + diversity * 0.6);

  return {
    summary: generateSynthesisSummary(perspectives, query),
    perspectives,
    connections,
    confidence,
    domainsEngaged: perspectives.length,
  };
}

/**
 * Format wisdom insight from engine response
 */
function formatWisdomInsight(wisdom) {
  if (typeof wisdom === 'string') {
    return wisdom.slice(0, 200);
  }

  if (wisdom && typeof wisdom === 'object') {
    // Extract key insight
    for (const key of ['insight', 'summary', 'description', 'meaning', 'core', 'message']) {
      if (wisdom[key]) {
        return String(wisdom[key]).slice(0, 200);
      }
    }

    // Fallback to JSON preview
    return JSON.stringify(wisdom).slice(0, 100) + '...';
  }

  return 'Wisdom available';
}

/**
 * Find cross-domain connections
 */
function findConnections(responses) {
  const connections = [];

  // Predefined cross-domain connections
  const knownConnections = [
    { domains: ['mind', 'language'], connection: 'Intentionality grounds meaning' },
    { domains: ['ethics', 'action'], connection: 'Moral responsibility requires agency' },
    { domains: ['eastern', 'cognitive'], connection: 'Mindfulness meets embodied cognition' },
    { domains: ['pragmatism', 'science'], connection: 'Inquiry as scientific method' },
    { domains: ['global', 'political'], connection: 'Ubuntu challenges Western individualism' },
    { domains: ['aesthetics', 'metaphysics'], connection: 'Beauty as ontological property' },
    { domains: ['epistemology', 'ethics'], connection: 'Epistemic duties and virtues' },
  ];

  const presentDomains = new Set(responses.map(r => r.domain));

  for (const { domains, connection } of knownConnections) {
    if (domains.every(d => presentDomains.has(d))) {
      connections.push(connection);
    }
  }

  return connections;
}

/**
 * Generate synthesis summary
 */
function generateSynthesisSummary(perspectives, query) {
  if (perspectives.length === 0) {
    return '*head tilt* This question spans multiple traditions. More exploration needed.';
  }

  if (perspectives.length === 1) {
    return `*ears perk* From ${perspectives[0].domain}: ${perspectives[0].insight}`;
  }

  const domains = perspectives.map(p => p.domain).join(', ');
  return `*tail wag* Cross-domain synthesis from ${perspectives.length} traditions (${domains}). φ-bounded: ${Math.round(DC.PHI.PHI_INV * 100)}% max confidence.`;
}

// =============================================================================
// DIRECT DOMAIN ACCESS
// =============================================================================

/**
 * Query a specific domain directly
 */
function queryDomain(domainId, query) {
  const domain = DOMAINS[domainId];
  if (!domain) {
    return { error: `Unknown domain: ${domainId}` };
  }

  const engines = getEnginesForDomain(domainId);
  const responses = [];

  for (const { name, engine } of engines) {
    const wisdom = extractWisdomFromEngine(engine, query, domainId);
    if (wisdom) {
      responses.push({
        engine: name,
        wisdom,
      });
    }
  }

  return {
    domain: domainId,
    domainName: domain.name,
    phase: domain.phase,
    engines: engines.map(e => e.name),
    responses,
    confidence: Math.min(DC.PHI.PHI_INV, responses.length * 0.2),
  };
}

/**
 * Get domain info
 */
function getDomainInfo(domainId) {
  return DOMAINS[domainId] || null;
}

/**
 * List all domains
 */
function listDomains() {
  return Object.entries(DOMAINS).map(([id, domain]) => ({
    id,
    name: domain.name,
    phase: domain.phase,
    keywords: domain.keywords.slice(0, 5),
    engineCount: domain.engines.length,
  }));
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get wisdom system stats
 */
function getStats() {
  const availableEngines = getAvailableEngines();

  return {
    domains: Object.keys(DOMAINS).length,
    registeredEngines: Object.values(DOMAINS).reduce((sum, d) => sum + d.engines.length, 0),
    availableEngines: availableEngines.length,
    loadedEngines: loadedEngines.size,
    maxConfidence: DC.PHI.PHI_INV,
    phases: [...new Set(Object.values(DOMAINS).map(d => d.phase))].sort((a, b) => a - b),
  };
}

/**
 * Format status for display
 */
function formatStatus() {
  const stats = getStats();
  const domains = listDomains();

  const lines = [
    '══════════════════════════════════════════════════════════════',
    '  🐕 CYNIC WISDOM SYSTEM',
    '══════════════════════════════════════════════════════════════',
    '',
    `   Domains: ${stats.domains}`,
    `   Registered Engines: ${stats.registeredEngines}`,
    `   Available Engines: ${stats.availableEngines}`,
    `   Loaded Engines: ${stats.loadedEngines}`,
    `   φ-bounded confidence: max ${Math.round(stats.maxConfidence * 100)}%`,
    '',
    '── DOMAINS BY PHASE ───────────────────────────────────────────',
  ];

  // Group by phase
  const byPhase = {};
  for (const d of domains) {
    if (!byPhase[d.phase]) byPhase[d.phase] = [];
    byPhase[d.phase].push(d);
  }

  for (const phase of stats.phases) {
    const phaseDomains = byPhase[phase] || [];
    lines.push(`   Phase ${phase}: ${phaseDomains.map(d => d.name).join(', ')}`);
  }

  lines.push('');
  lines.push('══════════════════════════════════════════════════════════════');
  lines.push('   *sniff* "φ distrusts φ" - All wisdom is provisional.');
  lines.push('══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Main query interface
  queryWisdom,
  queryDomain,

  // Domain access
  findRelevantDomains,
  getDomainInfo,
  listDomains,
  getEnginesForDomain,

  // Engine access
  loadEngine,
  getAvailableEngines,

  // Statistics
  getStats,
  formatStatus,

  // Constants
  DOMAINS,
};
