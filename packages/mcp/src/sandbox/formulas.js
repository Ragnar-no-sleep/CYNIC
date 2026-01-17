/**
 * CYNIC Formulas - PHI calculations, Q-Score, E-Score, matrices
 */

const CYNICFormulas = {
  // Golden Ratio constants
  PHI: (1 + Math.sqrt(5)) / 2,  // 1.618033988749895
  PHI_INV: 2 / (1 + Math.sqrt(5)),  // 0.618033988749895 (max confidence)
  PHI_INV_SQ: Math.pow(2 / (1 + Math.sqrt(5)), 2),  // 0.381966... (min doubt)

  // The 4 Axioms with their weights
  AXIOMS: {
    PHI: { name: 'PHI', weight: 0.382, description: 'Golden ratio guides all proportions' },
    VERIFY: { name: 'VERIFY', weight: 0.236, description: 'Don\'t trust, verify' },
    CULTURE: { name: 'CULTURE', weight: 0.236, description: 'Culture is a moat' },
    BURN: { name: 'BURN', weight: 0.146, description: 'Don\'t extract, burn' }
  },

  // The 25 dimensions grouped by axiom
  DIMENSIONS: {
    PHI: [
      { id: 'symmetry', name: 'Symmetry', description: 'Balance in structure' },
      { id: 'proportion', name: 'Proportion', description: 'Golden ratio adherence' },
      { id: 'coherence', name: 'Coherence', description: 'Internal consistency' },
      { id: 'resonance', name: 'Resonance', description: 'Harmonic alignment' },
      { id: 'elegance', name: 'Elegance', description: 'Simplicity in complexity' },
      { id: 'balance', name: 'Balance', description: 'Equilibrium of forces' }
    ],
    VERIFY: [
      { id: 'source_quality', name: 'Source Quality', description: 'Reliability of origin' },
      { id: 'data_integrity', name: 'Data Integrity', description: 'Accuracy of information' },
      { id: 'cross_reference', name: 'Cross Reference', description: 'Corroboration level' },
      { id: 'temporal_validity', name: 'Temporal Validity', description: 'Freshness of data' },
      { id: 'methodology', name: 'Methodology', description: 'Soundness of approach' },
      { id: 'transparency', name: 'Transparency', description: 'Openness of process' },
      { id: 'reproducibility', name: 'Reproducibility', description: 'Can be verified again' }
    ],
    CULTURE: [
      { id: 'community_alignment', name: 'Community Alignment', description: 'Fits ecosystem values' },
      { id: 'historical_pattern', name: 'Historical Pattern', description: 'Past behavior indicator' },
      { id: 'network_position', name: 'Network Position', description: 'Social graph location' },
      { id: 'contribution_history', name: 'Contribution History', description: 'Past contributions' },
      { id: 'reputation_signals', name: 'Reputation Signals', description: 'External indicators' },
      { id: 'cultural_fit', name: 'Cultural Fit', description: 'Values alignment' }
    ],
    BURN: [
      { id: 'resource_efficiency', name: 'Resource Efficiency', description: 'Minimal waste' },
      { id: 'value_distribution', name: 'Value Distribution', description: 'Fair allocation' },
      { id: 'extraction_resistance', name: 'Extraction Resistance', description: 'Anti-rent-seeking' },
      { id: 'sustainability', name: 'Sustainability', description: 'Long-term viability' },
      { id: 'burn_commitment', name: 'Burn Commitment', description: '100% burn adherence' },
      { id: 'simplicity', name: 'Simplicity', description: 'Occam\'s razor' }
    ]
  },

  // E-Score components
  E_SCORE_COMPONENTS: {
    HOLD: { weight: 0.20, description: 'Token holding duration and amount' },
    BURN: { weight: 0.20, description: 'Tokens burned for ecosystem' },
    USE: { weight: 0.15, description: 'Active usage of tools' },
    BUILD: { weight: 0.15, description: 'Code contributions' },
    RUN: { weight: 0.10, description: 'Node operation' },
    REFER: { weight: 0.10, description: 'Quality referrals' },
    TIME: { weight: 0.10, description: 'Time in ecosystem' }
  },

  /**
   * Calculate Q-Score from dimension scores
   * Q = Σ(axiom_weight × Σ(dimension_score)) / φ
   */
  calculateQScore(dimensionScores) {
    let totalScore = 0;

    for (const [axiom, dimensions] of Object.entries(this.DIMENSIONS)) {
      const axiomWeight = this.AXIOMS[axiom].weight;
      let axiomSum = 0;
      let count = 0;

      for (const dim of dimensions) {
        const score = dimensionScores[dim.id] ?? 0.5;
        axiomSum += score;
        count++;
      }

      const axiomAvg = count > 0 ? axiomSum / count : 0;
      totalScore += axiomWeight * axiomAvg;
    }

    // Normalize to 0-100 and apply PHI constraint
    const rawScore = totalScore * 100;
    const constrainedScore = Math.min(rawScore, 100 * this.PHI_INV);

    return {
      raw: rawScore,
      constrained: constrainedScore,
      confidence: Math.min(constrainedScore / 100, this.PHI_INV)
    };
  },

  /**
   * Calculate E-Score from component scores
   * E = Σ(component_weight × component_score)
   */
  calculateEScore(componentScores) {
    let totalScore = 0;

    for (const [component, config] of Object.entries(this.E_SCORE_COMPONENTS)) {
      const score = componentScores[component] ?? 0;
      totalScore += config.weight * score;
    }

    return {
      raw: totalScore * 100,
      components: componentScores
    };
  },

  /**
   * Calculate Final Score
   * Final = min(K-Score, Q-Score)
   */
  calculateFinalScore(kScore, qScore) {
    return Math.min(kScore, qScore);
  },

  /**
   * Determine verdict based on Q-Score
   */
  getVerdict(qScore) {
    if (qScore >= 75) return { verdict: 'HOWL', emoji: '🐺', description: 'Exceptional quality' };
    if (qScore >= 50) return { verdict: 'WAG', emoji: '🐕', description: 'Good quality' };
    if (qScore >= 25) return { verdict: 'GROWL', emoji: '😾', description: 'Questionable' };
    return { verdict: 'BARK', emoji: '🚨', description: 'Warning - low quality' };
  },

  /**
   * Get all formulas as LaTeX for KaTeX rendering
   */
  getFormulasLatex() {
    return [
      {
        name: 'Golden Ratio',
        latex: '\\varphi = \\frac{1 + \\sqrt{5}}{2} \\approx 1.618'
      },
      {
        name: 'Max Confidence',
        latex: '\\varphi^{-1} = \\frac{2}{1 + \\sqrt{5}} \\approx 0.618'
      },
      {
        name: 'Q-Score',
        latex: 'Q = \\sum_{i} (a_i \\cdot w_i) \\cdot \\varphi^{-1}'
      },
      {
        name: 'E-Score',
        latex: 'E = \\sum_{j} (c_j \\cdot w_j)'
      },
      {
        name: 'Final Score',
        latex: 'F = \\min(K, Q)'
      },
      {
        name: 'Axiom Weights',
        latex: 'w_{PHI} = 0.382, w_{VERIFY} = 0.236, w_{CULTURE} = 0.236, w_{BURN} = 0.146'
      }
    ];
  },

  /**
   * Render a formula with KaTeX
   */
  renderFormula(latex, element) {
    if (typeof katex !== 'undefined') {
      katex.render(latex, element, {
        throwOnError: false,
        displayMode: false
      });
    } else {
      element.textContent = latex;
    }
  },

  /**
   * Create matrix visualization data
   */
  getMatrixData(dimensionScores = {}) {
    const matrixData = [];

    for (const [axiom, dimensions] of Object.entries(this.DIMENSIONS)) {
      for (const dim of dimensions) {
        matrixData.push({
          axiom,
          dimension: dim.id,
          name: dim.name,
          description: dim.description,
          score: dimensionScores[dim.id] ?? Math.random() * 0.8 + 0.2,
          weight: this.AXIOMS[axiom].weight / dimensions.length
        });
      }
    }

    return matrixData;
  },

  /**
   * Simulate a judgment with random scores (for demo)
   */
  simulateJudgment() {
    const dimensionScores = {};

    for (const dimensions of Object.values(this.DIMENSIONS)) {
      for (const dim of dimensions) {
        // Generate score with PHI-based distribution
        const base = Math.random();
        dimensionScores[dim.id] = base * this.PHI_INV + (1 - this.PHI_INV) * Math.random();
      }
    }

    const qResult = this.calculateQScore(dimensionScores);
    const verdict = this.getVerdict(qResult.constrained);

    return {
      dimensions: dimensionScores,
      qScore: qResult,
      verdict,
      timestamp: new Date().toISOString()
    };
  }
};

// Export for use in other modules
window.CYNICFormulas = CYNICFormulas;
