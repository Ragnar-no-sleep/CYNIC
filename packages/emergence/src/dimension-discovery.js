/**
 * Dimension Discovery - Emergent Judgment Dimensions
 *
 * "New eyes see new truths" - κυνικός
 *
 * Discovers and proposes new judgment dimensions by:
 * - Analyzing patterns in judgments
 * - Identifying gaps in current dimensions
 * - Proposing new dimensions for network validation
 *
 * Current axioms and dimensions (from @cynic/core):
 * - PHI: COHERENCE, HARMONY, STRUCTURE, ELEGANCE, COMPLETENESS, PRECISION
 * - VERIFY: ACCURACY, VERIFIABILITY, TRANSPARENCY, REPRODUCIBILITY, PROVENANCE, INTEGRITY
 * - CULTURE: AUTHENTICITY, RELEVANCE, NOVELTY, ALIGNMENT, IMPACT, RESONANCE
 * - BURN: UTILITY, SUSTAINABILITY, EFFICIENCY, VALUE_CREATION, NON_EXTRACTIVE, CONTRIBUTION
 *
 * @module @cynic/emergence/dimensions
 */

'use strict';

import { PHI_INV, PHI_INV_2, PHI_INV_3 } from '@cynic/core';

/**
 * Known axioms with their current dimensions
 */
export const KNOWN_AXIOMS = {
  PHI: ['COHERENCE', 'HARMONY', 'STRUCTURE', 'ELEGANCE', 'COMPLETENESS', 'PRECISION'],
  VERIFY: ['ACCURACY', 'VERIFIABILITY', 'TRANSPARENCY', 'REPRODUCIBILITY', 'PROVENANCE', 'INTEGRITY'],
  CULTURE: ['AUTHENTICITY', 'RELEVANCE', 'NOVELTY', 'ALIGNMENT', 'IMPACT', 'RESONANCE'],
  BURN: ['UTILITY', 'SUSTAINABILITY', 'EFFICIENCY', 'VALUE_CREATION', 'NON_EXTRACTIVE', 'CONTRIBUTION'],
};

/**
 * Dimension proposal status
 */
export const ProposalStatus = {
  DRAFT: 'DRAFT',           // Just proposed
  UNDER_REVIEW: 'UNDER_REVIEW', // Being evaluated
  VOTING: 'VOTING',         // Network voting
  ACCEPTED: 'ACCEPTED',     // Accepted into system
  REJECTED: 'REJECTED',     // Rejected
  DEPRECATED: 'DEPRECATED', // Was accepted, now deprecated
};

/**
 * Minimum votes for dimension proposal acceptance (φ-aligned)
 */
export const ACCEPTANCE_THRESHOLDS = {
  MIN_VOTES: 7,              // 7 nodes must vote (like 7 Sefirot)
  APPROVAL_RATIO: PHI_INV,   // 61.8% approval required
  MIN_EVIDENCE: 10,          // 10 patterns must support
};

/**
 * Dimension Proposal
 * @typedef {Object} DimensionProposal
 * @property {string} id - Proposal ID
 * @property {string} name - Proposed dimension name
 * @property {string} axiom - Target axiom
 * @property {string} description - What the dimension measures
 * @property {string} rationale - Why it's needed
 * @property {Object[]} evidence - Supporting patterns
 * @property {string} status - Proposal status
 * @property {number} proposedAt - When proposed
 * @property {Object} votes - { for: [], against: [] }
 * @property {string} proposer - Node ID who proposed
 */

/**
 * Dimension Discovery
 *
 * Analyzes judgment patterns to discover and propose new dimensions.
 *
 * @example
 * ```javascript
 * const discovery = new DimensionDiscovery();
 *
 * // Feed judgment patterns
 * discovery.analyzeJudgment({
 *   verdict: 'GROWL',
 *   scores: { PHI: 45, VERIFY: 72, CULTURE: 38, BURN: 60 },
 *   rawAssessment: 'Lacks transparency in methodology...',
 * });
 *
 * // Check for potential new dimensions
 * const candidates = discovery.getCandidates();
 *
 * // Propose a new dimension
 * const proposal = discovery.propose('METHODOLOGY', 'VERIFY',
 *   'Measures clarity of process/approach',
 *   'Recurring pattern of methodology critiques'
 * );
 *
 * // Vote on proposals
 * discovery.vote(proposal.id, 'node123', true, 'Makes sense');
 * ```
 */
export class DimensionDiscovery {
  /**
   * @param {Object} options - Configuration
   * @param {Object} [options.axioms] - Override known axioms
   * @param {string} [options.nodeId] - Local node ID
   */
  constructor(options = {}) {
    this.axioms = options.axioms || KNOWN_AXIOMS;
    this.nodeId = options.nodeId || 'anonymous';

    // Judgment analysis data
    this.judgmentPatterns = [];
    this.maxPatterns = 1000;

    // Term frequency tracking (for discovering new concepts)
    this.termFrequency = new Map();

    // Dimension gap tracking (axioms with low scores)
    this.axiomGaps = new Map();

    // Candidate dimensions (detected but not proposed)
    this.candidates = new Map();

    // Formal proposals
    this.proposals = new Map();

    // Adopted dimensions (accepted proposals)
    this.adopted = new Map();
  }

  /**
   * Analyze a judgment for potential new dimensions
   *
   * @param {Object} judgment - Judgment to analyze
   * @param {Object} judgment.scores - Axiom scores
   * @param {string} [judgment.rawAssessment] - Text assessment
   * @param {Object} [judgment.dimensionScores] - Individual dimension scores
   * @returns {Object[]} Detected candidates
   */
  analyzeJudgment(judgment) {
    const detected = [];

    // Store pattern
    this.judgmentPatterns.push({
      ...judgment,
      analyzedAt: Date.now(),
    });

    if (this.judgmentPatterns.length > this.maxPatterns) {
      this.judgmentPatterns.shift();
    }

    // Analyze axiom gaps
    if (judgment.scores) {
      for (const [axiom, score] of Object.entries(judgment.scores)) {
        if (score < 50) {
          this._trackGap(axiom, score, judgment);
        }
      }
    }

    // Extract terms from raw assessment
    if (judgment.rawAssessment) {
      const terms = this._extractTerms(judgment.rawAssessment);
      for (const term of terms) {
        this._trackTerm(term, judgment);
      }
    }

    // Check for dimension score anomalies
    if (judgment.dimensionScores) {
      detected.push(...this._analyzeDimensionScores(judgment.dimensionScores));
    }

    // Update candidates
    this._updateCandidates();

    return detected;
  }

  /**
   * Get candidate dimensions (potential proposals)
   *
   * @param {string} [axiom] - Filter by axiom
   * @returns {Object[]} Candidates
   */
  getCandidates(axiom = null) {
    const candidates = Array.from(this.candidates.values());

    if (axiom) {
      return candidates.filter(c => c.axiom === axiom);
    }

    return candidates.sort((a, b) => b.evidence - a.evidence);
  }

  /**
   * Propose a new dimension
   *
   * @param {string} name - Dimension name (UPPERCASE_SNAKE)
   * @param {string} axiom - Target axiom
   * @param {string} description - What it measures
   * @param {string} rationale - Why it's needed
   * @returns {DimensionProposal} The proposal
   */
  propose(name, axiom, description, rationale) {
    // Validate name format
    const normalizedName = name.toUpperCase().replace(/\s+/g, '_');

    // Check if dimension already exists
    if (this.axioms[axiom]?.includes(normalizedName)) {
      throw new Error(`Dimension ${normalizedName} already exists in ${axiom}`);
    }

    // Check if already proposed
    const existingId = `${axiom}:${normalizedName}`;
    if (this.proposals.has(existingId)) {
      throw new Error(`Dimension ${normalizedName} already proposed`);
    }

    // Gather evidence from candidates
    const candidate = this.candidates.get(existingId);
    const evidence = candidate?.patterns || [];

    const proposal = {
      id: existingId,
      name: normalizedName,
      axiom,
      description,
      rationale,
      evidence,
      status: ProposalStatus.DRAFT,
      proposedAt: Date.now(),
      votes: { for: [], against: [] },
      proposer: this.nodeId,
    };

    this.proposals.set(existingId, proposal);
    return proposal;
  }

  /**
   * Submit proposal for review
   *
   * @param {string} proposalId - Proposal ID
   * @returns {DimensionProposal} Updated proposal
   */
  submitForReview(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new Error(`Proposal must be in DRAFT status`);
    }

    proposal.status = ProposalStatus.UNDER_REVIEW;
    proposal.submittedAt = Date.now();

    return proposal;
  }

  /**
   * Open proposal for voting
   *
   * @param {string} proposalId - Proposal ID
   * @returns {DimensionProposal} Updated proposal
   */
  openVoting(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    if (proposal.status !== ProposalStatus.UNDER_REVIEW) {
      throw new Error(`Proposal must be UNDER_REVIEW`);
    }

    proposal.status = ProposalStatus.VOTING;
    proposal.votingOpenedAt = Date.now();

    return proposal;
  }

  /**
   * Vote on a proposal
   *
   * @param {string} proposalId - Proposal ID
   * @param {string} nodeId - Voting node ID
   * @param {boolean} approve - Approve or reject
   * @param {string} [reason] - Optional reason
   * @returns {Object} Vote result
   */
  vote(proposalId, nodeId, approve, reason = null) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    if (proposal.status !== ProposalStatus.VOTING) {
      throw new Error(`Proposal is not in VOTING status`);
    }

    // Check if already voted
    const allVoters = [
      ...proposal.votes.for.map(v => v.nodeId),
      ...proposal.votes.against.map(v => v.nodeId),
    ];

    if (allVoters.includes(nodeId)) {
      throw new Error(`Node ${nodeId} already voted`);
    }

    const vote = {
      nodeId,
      approve,
      reason,
      timestamp: Date.now(),
    };

    if (approve) {
      proposal.votes.for.push(vote);
    } else {
      proposal.votes.against.push(vote);
    }

    // Check if voting should conclude
    const result = this._checkVotingResult(proposal);

    return {
      proposal,
      vote,
      result,
    };
  }

  /**
   * Get all proposals
   *
   * @param {string} [status] - Filter by status
   * @returns {DimensionProposal[]}
   */
  getProposals(status = null) {
    const proposals = Array.from(this.proposals.values());

    if (status) {
      return proposals.filter(p => p.status === status);
    }

    return proposals;
  }

  /**
   * Get adopted (accepted) dimensions
   *
   * @returns {Object[]}
   */
  getAdopted() {
    return Array.from(this.adopted.values());
  }

  /**
   * Get all dimensions including adopted
   *
   * @param {string} axiom - Axiom name
   * @returns {string[]}
   */
  getDimensionsForAxiom(axiom) {
    const base = this.axioms[axiom] || [];
    const adopted = this.getAdopted()
      .filter(d => d.axiom === axiom)
      .map(d => d.name);

    return [...base, ...adopted];
  }

  /**
   * Track an axiom gap
   * @private
   */
  _trackGap(axiom, score, judgment) {
    if (!this.axiomGaps.has(axiom)) {
      this.axiomGaps.set(axiom, []);
    }

    this.axiomGaps.get(axiom).push({
      score,
      judgment,
      timestamp: Date.now(),
    });

    // Trim old entries
    const gaps = this.axiomGaps.get(axiom);
    if (gaps.length > 100) {
      this.axiomGaps.set(axiom, gaps.slice(-100));
    }
  }

  /**
   * Extract meaningful terms from text
   * @private
   */
  _extractTerms(text) {
    // Simple term extraction (could be enhanced with NLP)
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
      'this', 'that', 'these', 'those', 'it', 'its',
      'not', 'no', 'very', 'too', 'also', 'just', 'only', 'more', 'most',
    ]);

    // Extract words, filter stop words, normalize
    const words = text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    // Look for potential dimension-like concepts (abstract nouns)
    const dimensionSuffixes = ['ity', 'ness', 'ment', 'tion', 'ance', 'ence', 'ism'];
    const potentialDimensions = words.filter(w =>
      dimensionSuffixes.some(s => w.endsWith(s))
    );

    return [...new Set(potentialDimensions)];
  }

  /**
   * Track a term occurrence
   * @private
   */
  _trackTerm(term, judgment) {
    if (!this.termFrequency.has(term)) {
      this.termFrequency.set(term, {
        term,
        count: 0,
        judgments: [],
        firstSeen: Date.now(),
      });
    }

    const entry = this.termFrequency.get(term);
    entry.count++;
    entry.judgments.push({
      scores: judgment.scores,
      timestamp: Date.now(),
    });

    // Trim old judgments
    if (entry.judgments.length > 20) {
      entry.judgments = entry.judgments.slice(-20);
    }
  }

  /**
   * Analyze dimension scores for anomalies
   * @private
   */
  _analyzeDimensionScores(scores) {
    const detected = [];

    // Look for consistently low dimensions
    for (const [dim, score] of Object.entries(scores)) {
      if (score < 30) {
        // This dimension is struggling - might need subdivision
        detected.push({
          type: 'LOW_DIMENSION',
          dimension: dim,
          score,
          suggestion: `Consider subdividing ${dim}`,
        });
      }
    }

    return detected;
  }

  /**
   * Update candidates from collected data
   * @private
   */
  _updateCandidates() {
    // Convert high-frequency terms to candidates
    for (const [term, data] of this.termFrequency) {
      if (data.count >= ACCEPTANCE_THRESHOLDS.MIN_EVIDENCE) {
        // Determine best axiom based on judgment patterns
        const axiom = this._inferAxiom(data.judgments);

        if (axiom) {
          const candidateId = `${axiom}:${term.toUpperCase()}`;

          if (!this.candidates.has(candidateId)) {
            this.candidates.set(candidateId, {
              id: candidateId,
              term: term.toUpperCase(),
              axiom,
              evidence: data.count,
              patterns: data.judgments.slice(-10),
              firstSeen: data.firstSeen,
              lastSeen: Date.now(),
            });
          } else {
            const candidate = this.candidates.get(candidateId);
            candidate.evidence = data.count;
            candidate.lastSeen = Date.now();
          }
        }
      }
    }
  }

  /**
   * Infer best axiom for a term based on judgment patterns
   * @private
   */
  _inferAxiom(judgments) {
    if (judgments.length === 0) return null;

    // Find which axiom has lowest average score when this term appears
    const axiomScores = { PHI: 0, VERIFY: 0, CULTURE: 0, BURN: 0 };
    let count = 0;

    for (const j of judgments) {
      if (j.scores) {
        for (const axiom of Object.keys(axiomScores)) {
          if (j.scores[axiom] !== undefined) {
            axiomScores[axiom] += j.scores[axiom];
          }
        }
        count++;
      }
    }

    if (count === 0) return 'VERIFY'; // Default

    // Lowest average = most relevant axiom
    let lowestAxiom = 'VERIFY';
    let lowestScore = Infinity;

    for (const [axiom, total] of Object.entries(axiomScores)) {
      const avg = total / count;
      if (avg < lowestScore) {
        lowestScore = avg;
        lowestAxiom = axiom;
      }
    }

    return lowestAxiom;
  }

  /**
   * Check if voting should conclude
   * @private
   */
  _checkVotingResult(proposal) {
    const totalVotes = proposal.votes.for.length + proposal.votes.against.length;

    if (totalVotes < ACCEPTANCE_THRESHOLDS.MIN_VOTES) {
      return { concluded: false, reason: 'INSUFFICIENT_VOTES' };
    }

    const approvalRatio = proposal.votes.for.length / totalVotes;

    if (approvalRatio >= ACCEPTANCE_THRESHOLDS.APPROVAL_RATIO) {
      // ACCEPTED
      proposal.status = ProposalStatus.ACCEPTED;
      proposal.acceptedAt = Date.now();

      // Add to adopted dimensions
      this.adopted.set(proposal.id, {
        name: proposal.name,
        axiom: proposal.axiom,
        description: proposal.description,
        adoptedAt: Date.now(),
        proposal,
      });

      return { concluded: true, status: 'ACCEPTED', approvalRatio };
    } else if (totalVotes >= ACCEPTANCE_THRESHOLDS.MIN_VOTES * 2) {
      // Enough votes and not accepted = rejected
      proposal.status = ProposalStatus.REJECTED;
      proposal.rejectedAt = Date.now();

      return { concluded: true, status: 'REJECTED', approvalRatio };
    }

    return { concluded: false, approvalRatio };
  }

  /**
   * Export state
   * @returns {Object}
   */
  export() {
    return {
      termFrequency: Array.from(this.termFrequency.entries()),
      axiomGaps: Array.from(this.axiomGaps.entries()),
      candidates: Array.from(this.candidates.entries()),
      proposals: Array.from(this.proposals.entries()),
      adopted: Array.from(this.adopted.entries()),
      exportedAt: Date.now(),
    };
  }

  /**
   * Import state
   * @param {Object} data
   */
  import(data) {
    if (data.termFrequency) this.termFrequency = new Map(data.termFrequency);
    if (data.axiomGaps) this.axiomGaps = new Map(data.axiomGaps);
    if (data.candidates) this.candidates = new Map(data.candidates);
    if (data.proposals) this.proposals = new Map(data.proposals);
    if (data.adopted) this.adopted = new Map(data.adopted);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      termsTracked: this.termFrequency.size,
      candidates: this.candidates.size,
      proposals: {
        total: this.proposals.size,
        draft: this.getProposals(ProposalStatus.DRAFT).length,
        voting: this.getProposals(ProposalStatus.VOTING).length,
        accepted: this.getProposals(ProposalStatus.ACCEPTED).length,
        rejected: this.getProposals(ProposalStatus.REJECTED).length,
      },
      adopted: this.adopted.size,
      axiomGaps: Object.fromEntries(
        Array.from(this.axiomGaps.entries()).map(([k, v]) => [k, v.length])
      ),
    };
  }
}

/**
 * Create a DimensionDiscovery instance
 * @param {Object} [options] - Configuration
 * @returns {DimensionDiscovery}
 */
export function createDimensionDiscovery(options = {}) {
  return new DimensionDiscovery(options);
}

/** @deprecated Use named exports instead. Will be removed in v2.0. */
export default {
  DimensionDiscovery,
  createDimensionDiscovery,
  KNOWN_AXIOMS,
  ProposalStatus,
  ACCEPTANCE_THRESHOLDS,
};
