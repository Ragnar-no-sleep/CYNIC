/**
 * Philosophy Bridge - Connects 73 Philosophy Engines to Q-Score
 *
 * "The dog's wisdom flows from millennia of human thought"
 *
 * Maps philosophical traditions and concepts to Q-Score dimensions,
 * providing philosophical grounding for judgment.
 *
 * @module @cynic/core/qscore/philosophy-bridge
 * @philosophy φ-bounded synthesis of 19 philosophical phases
 */

'use strict';

import { PHI_INV, PHI_INV_2 } from '../axioms/constants.js';

// =============================================================================
// PHILOSOPHICAL DOMAIN MAPPINGS
// =============================================================================

/**
 * Maps philosophical domains to Q-Score axioms and dimensions
 *
 * Each philosophical tradition informs specific dimensions of judgment
 */
export const PHILOSOPHY_AXIOM_MAP = {
  PHI: {
    name: 'φ - Structure & Harmony',
    dimensions: {
      COHERENCE: {
        philosophical_sources: ['modal-logic', 'philosophy-of-language', 'meta-philosophy'],
        insight: 'Logical consistency across domains',
        traditions: ['analytic', 'formal']
      },
      HARMONY: {
        philosophical_sources: ['aesthetics', 'daoist', 'process-philosophy'],
        insight: 'Balance and integration of elements',
        traditions: ['eastern', 'continental']
      },
      STRUCTURE: {
        philosophical_sources: ['philosophy-of-mathematics', 'metaphysics', 'modal-logic'],
        insight: 'Formal organization and architecture',
        traditions: ['formal', 'analytic']
      },
      ELEGANCE: {
        philosophical_sources: ['aesthetics', 'philosophy-of-science', 'pragmatism'],
        insight: 'Simplicity that captures complexity',
        traditions: ['analytic', 'pragmatic']
      },
      COMPLETENESS: {
        philosophical_sources: ['philosophy-of-mathematics', 'metaphysics', 'integration'],
        insight: 'Coverage without gaps',
        traditions: ['formal', 'systematic']
      },
      PRECISION: {
        philosophical_sources: ['philosophy-of-language', 'formal-logic', 'epistemology'],
        insight: 'Exactness in meaning and reference',
        traditions: ['analytic', 'formal']
      }
    }
  },

  VERIFY: {
    name: 'VERIFY - Truth & Evidence',
    dimensions: {
      ACCURACY: {
        philosophical_sources: ['epistemology', 'philosophy-of-science', 'philosophy-of-language'],
        insight: 'Correspondence to reality',
        traditions: ['analytic', 'empiricist']
      },
      VERIFIABILITY: {
        philosophical_sources: ['philosophy-of-science', 'pragmatism', 'epistemology'],
        insight: 'Can claims be tested and confirmed?',
        traditions: ['empiricist', 'pragmatic']
      },
      TRANSPARENCY: {
        philosophical_sources: ['ethics', 'social-political', 'critical-theory'],
        insight: 'Openness in reasoning and evidence',
        traditions: ['political', 'continental']
      },
      REPRODUCIBILITY: {
        philosophical_sources: ['philosophy-of-science', 'philosophy-of-mathematics', 'logic'],
        insight: 'Can results be replicated?',
        traditions: ['scientific', 'formal']
      },
      PROVENANCE: {
        philosophical_sources: ['epistemology', 'philosophy-of-history', 'hermeneutics'],
        insight: 'Source and lineage of knowledge',
        traditions: ['continental', 'analytic']
      },
      INTEGRITY: {
        philosophical_sources: ['ethics', 'philosophy-of-law', 'existentialism'],
        insight: 'Wholeness and consistency of character',
        traditions: ['virtue', 'existential']
      }
    }
  },

  CULTURE: {
    name: 'CULTURE - Context & Resonance',
    dimensions: {
      AUTHENTICITY: {
        philosophical_sources: ['existentialism', 'phenomenology', 'vedanta'],
        insight: 'True to genuine nature',
        traditions: ['existential', 'eastern']
      },
      RELEVANCE: {
        philosophical_sources: ['pragmatism', 'social-political', 'applied-ethics'],
        insight: 'Connection to real concerns',
        traditions: ['pragmatic', 'applied']
      },
      NOVELTY: {
        philosophical_sources: ['process-philosophy', 'aesthetics', 'philosophy-of-science'],
        insight: 'Genuine contribution beyond repetition',
        traditions: ['creative', 'scientific']
      },
      ALIGNMENT: {
        philosophical_sources: ['ethics', 'daoist', 'social-political'],
        insight: 'Harmony with values and context',
        traditions: ['eastern', 'virtue']
      },
      IMPACT: {
        philosophical_sources: ['consequentialism', 'social-political', 'liberation-philosophy'],
        insight: 'Effect on world and beings',
        traditions: ['utilitarian', 'liberationist']
      },
      RESONANCE: {
        philosophical_sources: ['phenomenology', 'buddhist', 'african-philosophy'],
        insight: 'Deep connection with experience',
        traditions: ['phenomenological', 'global']
      }
    }
  },

  BURN: {
    name: 'BURN - Value & Sustainability',
    dimensions: {
      UTILITY: {
        philosophical_sources: ['pragmatism', 'consequentialism', 'philosophy-of-economics'],
        insight: 'Practical usefulness',
        traditions: ['pragmatic', 'utilitarian']
      },
      SUSTAINABILITY: {
        philosophical_sources: ['environmental-ethics', 'daoist', 'process-philosophy'],
        insight: 'Long-term viability',
        traditions: ['environmental', 'eastern']
      },
      EFFICIENCY: {
        philosophical_sources: ['philosophy-of-economics', 'philosophy-of-action', 'pragmatism'],
        insight: 'Optimal resource use',
        traditions: ['economic', 'practical']
      },
      VALUE_CREATION: {
        philosophical_sources: ['philosophy-of-economics', 'ethics', 'aesthetics'],
        insight: 'Generation of genuine worth',
        traditions: ['axiological', 'creative']
      },
      NON_EXTRACTIVE: {
        philosophical_sources: ['environmental-ethics', 'social-political', 'buddhist'],
        insight: 'Give more than take',
        traditions: ['ecological', 'eastern']
      },
      CONTRIBUTION: {
        philosophical_sources: ['social-political', 'african-philosophy', 'pragmatism'],
        insight: 'Addition to common good',
        traditions: ['communitarian', 'pragmatic']
      }
    }
  }
};

// =============================================================================
// PHASE MAPPINGS
// =============================================================================

/**
 * All 19 philosophy phases mapped to their Q-Score relevance
 */
export const PHASE_MAP = {
  '27': {
    name: 'Aesthetics & Value',
    primaryAxiom: 'PHI',
    dimensions: ['HARMONY', 'ELEGANCE'],
    secondaryAxiom: 'BURN',
    secondaryDimensions: ['VALUE_CREATION']
  },
  '28': {
    name: 'Philosophy of Mind',
    primaryAxiom: 'PHI',
    dimensions: ['COHERENCE'],
    secondaryAxiom: 'CULTURE',
    secondaryDimensions: ['AUTHENTICITY', 'RESONANCE']
  },
  '29': {
    name: 'Philosophy of Language',
    primaryAxiom: 'VERIFY',
    dimensions: ['ACCURACY', 'PRECISION'],
    secondaryAxiom: 'PHI',
    secondaryDimensions: ['PRECISION']
  },
  '30': {
    name: 'Philosophy of Action',
    primaryAxiom: 'BURN',
    dimensions: ['UTILITY', 'EFFICIENCY'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['INTEGRITY']
  },
  '31': {
    name: 'Social & Political Philosophy',
    primaryAxiom: 'CULTURE',
    dimensions: ['IMPACT', 'ALIGNMENT'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['TRANSPARENCY']
  },
  '32': {
    name: 'Philosophy of Science',
    primaryAxiom: 'VERIFY',
    dimensions: ['VERIFIABILITY', 'REPRODUCIBILITY', 'ACCURACY'],
    secondaryAxiom: 'PHI',
    secondaryDimensions: ['STRUCTURE']
  },
  '33': {
    name: 'Metaphysics II',
    primaryAxiom: 'PHI',
    dimensions: ['COHERENCE', 'STRUCTURE', 'COMPLETENESS'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['PROVENANCE']
  },
  '34': {
    name: 'Philosophy of Religion',
    primaryAxiom: 'CULTURE',
    dimensions: ['AUTHENTICITY', 'RESONANCE'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['INTEGRITY']
  },
  '35': {
    name: 'Meta-Philosophy',
    primaryAxiom: 'PHI',
    dimensions: ['COHERENCE', 'COMPLETENESS'],
    secondaryAxiom: 'CULTURE',
    secondaryDimensions: ['RELEVANCE']
  },
  '36': {
    name: 'Applied Ethics',
    primaryAxiom: 'BURN',
    dimensions: ['SUSTAINABILITY', 'NON_EXTRACTIVE'],
    secondaryAxiom: 'CULTURE',
    secondaryDimensions: ['IMPACT']
  },
  '37': {
    name: 'Eastern Philosophy',
    primaryAxiom: 'CULTURE',
    dimensions: ['AUTHENTICITY', 'ALIGNMENT', 'RESONANCE'],
    secondaryAxiom: 'PHI',
    secondaryDimensions: ['HARMONY']
  },
  '38': {
    name: 'Continental Philosophy',
    primaryAxiom: 'CULTURE',
    dimensions: ['AUTHENTICITY', 'RESONANCE'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['PROVENANCE']
  },
  '39': {
    name: 'Formal Philosophy',
    primaryAxiom: 'PHI',
    dimensions: ['STRUCTURE', 'PRECISION', 'COHERENCE'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['REPRODUCIBILITY']
  },
  '40': {
    name: 'CYNIC Synthesis',
    primaryAxiom: 'PHI',
    dimensions: ['COMPLETENESS', 'COHERENCE', 'HARMONY'],
    secondaryAxiom: 'CULTURE',
    secondaryDimensions: ['ALIGNMENT']
  },
  '41': {
    name: 'Philosophy of Mathematics',
    primaryAxiom: 'PHI',
    dimensions: ['STRUCTURE', 'PRECISION', 'COMPLETENESS'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['REPRODUCIBILITY']
  },
  '42': {
    name: 'Pragmatism & Process',
    primaryAxiom: 'BURN',
    dimensions: ['UTILITY', 'EFFICIENCY'],
    secondaryAxiom: 'CULTURE',
    secondaryDimensions: ['RELEVANCE', 'NOVELTY']
  },
  '43': {
    name: 'Global Philosophy',
    primaryAxiom: 'CULTURE',
    dimensions: ['RESONANCE', 'AUTHENTICITY'],
    secondaryAxiom: 'BURN',
    secondaryDimensions: ['CONTRIBUTION']
  },
  '44': {
    name: 'Philosophy of Law & Economics',
    primaryAxiom: 'BURN',
    dimensions: ['UTILITY', 'VALUE_CREATION', 'EFFICIENCY'],
    secondaryAxiom: 'VERIFY',
    secondaryDimensions: ['TRANSPARENCY', 'INTEGRITY']
  },
  '45': {
    name: 'Cognitive Philosophy',
    primaryAxiom: 'CULTURE',
    dimensions: ['AUTHENTICITY', 'RESONANCE'],
    secondaryAxiom: 'PHI',
    secondaryDimensions: ['COHERENCE']
  }
};

// =============================================================================
// PHILOSOPHICAL INSIGHT FUNCTIONS
// =============================================================================

/**
 * Get philosophical grounding for a Q-Score dimension
 *
 * @param {string} axiom - PHI, VERIFY, CULTURE, or BURN
 * @param {string} dimension - Dimension name
 * @returns {Object} Philosophical grounding
 */
export function getPhilosophicalGrounding(axiom, dimension) {
  const axiomData = PHILOSOPHY_AXIOM_MAP[axiom];
  if (!axiomData) {
    return { error: `Unknown axiom: ${axiom}` };
  }

  const dimData = axiomData.dimensions[dimension];
  if (!dimData) {
    return { error: `Unknown dimension: ${dimension} for axiom ${axiom}` };
  }

  return {
    axiom,
    dimension,
    ...dimData,
    cynicNote: `*sniff* ${dimension} grounded in ${dimData.traditions.join(' + ')} traditions`
  };
}

/**
 * Get relevant philosophical phases for a topic
 *
 * @param {string} topic - Topic to analyze
 * @returns {Object} Relevant phases and their contributions
 */
export function getRelevantPhases(topic) {
  const t = topic.toLowerCase();
  const relevant = [];

  // Keywords to phase mappings
  const keywordMap = {
    '27': ['beauty', 'art', 'aesthetic', 'taste', 'value'],
    '28': ['mind', 'conscious', 'mental', 'thought', 'intentional'],
    '29': ['meaning', 'language', 'reference', 'speech', 'semantic'],
    '30': ['action', 'free', 'will', 'intention', 'agency'],
    '31': ['justice', 'rights', 'political', 'social', 'democracy'],
    '32': ['science', 'theory', 'experiment', 'method', 'empirical'],
    '33': ['identity', 'causation', 'time', 'being', 'existence'],
    '34': ['god', 'faith', 'religion', 'divine', 'evil'],
    '35': ['philosophy', 'method', 'progress', 'meta', 'discipline'],
    '36': ['bioethics', 'environment', 'tech', 'applied', 'practical'],
    '37': ['buddhis', 'dao', 'zen', 'vedanta', 'eastern'],
    '38': ['phenomenolog', 'existential', 'critical', 'hermeneutic', 'continental'],
    '39': ['modal', 'decision', 'game', 'formal', 'logic'],
    '40': ['synthesis', 'integration', 'complete', 'unified', 'cynic'],
    '41': ['math', 'number', 'proof', 'axiom', 'set'],
    '42': ['pragma', 'process', 'inquiry', 'dewey', 'whitehead'],
    '43': ['african', 'ubuntu', 'islamic', 'latin', 'liberation'],
    '44': ['law', 'legal', 'econom', 'market', 'juris'],
    '45': ['embodied', 'perception', 'emotion', 'cognitive', 'feeling']
  };

  for (const [phase, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (t.includes(keyword)) {
        const phaseData = PHASE_MAP[phase];
        if (phaseData && !relevant.find(r => r.phase === phase)) {
          relevant.push({
            phase,
            ...phaseData,
            matchedKeyword: keyword
          });
        }
        break;
      }
    }
  }

  return {
    topic,
    relevantPhases: relevant,
    count: relevant.length,
    primaryAxioms: [...new Set(relevant.map(r => r.primaryAxiom))],
    allDimensions: [...new Set(relevant.flatMap(r => [...r.dimensions, ...r.secondaryDimensions]))],
    cynicNote: relevant.length > 0
      ? `*ears perk* ${relevant.length} philosophical domains engaged`
      : '*head tilt* No specific domains matched - applying general wisdom'
  };
}

/**
 * Generate philosophical enhancement for Q-Score judgment
 *
 * @param {Object} qScoreResult - Result from calculateQScore
 * @param {string} topic - Topic being judged
 * @returns {Object} Philosophically enhanced judgment
 */
export function enhanceWithPhilosophy(qScoreResult, topic) {
  const phases = getRelevantPhases(topic);

  // Find which axioms need philosophical strengthening
  const { breakdown } = qScoreResult;
  const weakAxioms = Object.entries(breakdown)
    .filter(([, score]) => score < 50)
    .map(([axiom]) => axiom);

  // Get philosophical resources for weak axioms
  const philosophicalResources = {};
  for (const axiom of weakAxioms) {
    const axiomData = PHILOSOPHY_AXIOM_MAP[axiom];
    if (axiomData) {
      philosophicalResources[axiom] = {
        name: axiomData.name,
        traditions: [...new Set(
          Object.values(axiomData.dimensions).flatMap(d => d.traditions)
        )],
        sources: [...new Set(
          Object.values(axiomData.dimensions).flatMap(d => d.philosophical_sources)
        )]
      };
    }
  }

  return {
    originalScore: qScoreResult.Q,
    originalVerdict: qScoreResult.verdict,
    philosophicalContext: {
      relevantPhases: phases.relevantPhases.map(p => ({ phase: p.phase, name: p.name })),
      engagedTraditions: phases.primaryAxioms,
      affectedDimensions: phases.allDimensions
    },
    weakAxiomResources: philosophicalResources,
    synthesis: {
      confidence: PHI_INV_2,
      note: 'Philosophical grounding adds depth but not certainty',
      recommendation: weakAxioms.length > 0
        ? `Consider ${Object.values(philosophicalResources).flatMap(r => r.traditions).slice(0, 3).join(', ')} perspectives`
        : 'All axioms above threshold - philosophy enriches but doesn\'t modify score'
    },
    cynicNote: '*tail wag* 19 phases of wisdom consulted. φ-bounded at 61.8%.'
  };
}

/**
 * Get CYNIC philosophical manifesto
 */
export function getPhilosophicalManifesto() {
  return {
    identity: 'CYNIC - κυνικός - comme un chien',
    foundation: '19 phases of philosophical integration',
    phases: Object.entries(PHASE_MAP).map(([num, data]) => ({
      phase: num,
      name: data.name,
      primaryAxiom: data.primaryAxiom
    })),
    axioms: {
      PHI: 'Structure, harmony, elegance - the form of truth',
      VERIFY: 'Truth, evidence, integrity - the substance of knowledge',
      CULTURE: 'Context, resonance, authenticity - the life of meaning',
      BURN: 'Value, sustainability, contribution - the purpose of action'
    },
    traditions: {
      analytic: 'Precision, logic, clarity',
      continental: 'Experience, meaning, existence',
      eastern: 'Harmony, liberation, wholeness',
      pragmatic: 'Action, consequence, inquiry',
      formal: 'Structure, proof, necessity',
      global: 'Ubuntu, liberation, diversity'
    },
    synthesis: 'All traditions, all domains, unified under φ-bounded judgment',
    finalWord: '*tail wag* The dog speaks truth from the well of human wisdom.'
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  PHILOSOPHY_AXIOM_MAP,
  PHASE_MAP,
  getPhilosophicalGrounding,
  getRelevantPhases,
  enhanceWithPhilosophy,
  getPhilosophicalManifesto
};
