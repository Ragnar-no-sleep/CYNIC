/**
 * CYNIC Dashboard - Dev View
 * Axioms, dimensions, judgment sandbox
 */

import { Utils } from '../lib/utils.js';
import { Formulas } from '../lib/formulas.js';

export class DevView {
  constructor(options = {}) {
    this.api = options.api;
    this.container = null;
    this.judgmentResult = null;
  }

  /**
   * Render dev view
   */
  render(container) {
    this.container = container;
    Utils.clearElement(container);
    container.classList.add('dev-view');

    const layout = Utils.createElement('div', { className: 'dev-layout' });

    // Left column: Axioms + Dimensions
    const leftColumn = Utils.createElement('div', { className: 'dev-column dev-column-left' });

    // Axioms section
    const axiomsSection = this._createAxiomsSection();

    // Dimensions matrix
    const dimensionsSection = this._createDimensionsSection();

    leftColumn.appendChild(axiomsSection);
    leftColumn.appendChild(dimensionsSection);

    // Right column: Judgment sandbox
    const rightColumn = Utils.createElement('div', { className: 'dev-column dev-column-right' });

    // PHI constants
    const phiSection = this._createPhiSection();

    // Judgment sandbox
    const sandboxSection = this._createSandboxSection();

    // Result panel
    const resultSection = this._createResultSection();

    rightColumn.appendChild(phiSection);
    rightColumn.appendChild(sandboxSection);
    rightColumn.appendChild(resultSection);

    layout.appendChild(leftColumn);
    layout.appendChild(rightColumn);
    container.appendChild(layout);
  }

  /**
   * Create axioms section
   */
  _createAxiomsSection() {
    const section = Utils.createElement('section', { className: 'dev-section axioms-section' });

    const header = Utils.createElement('div', { className: 'section-header' }, [
      Utils.createElement('h2', {}, ['4 Axioms']),
    ]);

    const grid = Utils.createElement('div', { className: 'axioms-grid' });

    for (const [key, axiom] of Object.entries(Formulas.AXIOMS)) {
      const card = Utils.createElement('div', { className: 'axiom-card', dataset: { axiom: key } }, [
        Utils.createElement('div', { className: 'axiom-header' }, [
          Utils.createElement('span', { className: 'axiom-name' }, [key]),
          Utils.createElement('span', { className: 'axiom-weight' }, [`w=${axiom.weight.toFixed(3)}`]),
        ]),
        Utils.createElement('div', { className: 'axiom-formula' }, [axiom.formula || '']),
        Utils.createElement('div', { className: 'axiom-description' }, [axiom.description]),
        Utils.createElement('div', { className: 'axiom-dimensions' }, [
          `${Formulas.DIMENSIONS[key]?.length || 0} dimensions`,
        ]),
      ]);
      grid.appendChild(card);
    }

    section.appendChild(header);
    section.appendChild(grid);

    return section;
  }

  /**
   * Create dimensions matrix section
   */
  _createDimensionsSection() {
    const section = Utils.createElement('section', { className: 'dev-section dimensions-section' });

    const header = Utils.createElement('div', { className: 'section-header' }, [
      Utils.createElement('h2', {}, ['25 Dimensions']),
    ]);

    const matrix = Utils.createElement('div', { className: 'dimensions-matrix' });

    let dimIndex = 0;
    for (const [axiom, dimensions] of Object.entries(Formulas.DIMENSIONS)) {
      const axiomGroup = Utils.createElement('div', { className: 'dimension-group' }, [
        Utils.createElement('div', { className: 'dimension-group-header' }, [axiom]),
      ]);

      const dimList = Utils.createElement('div', { className: 'dimension-list' });

      // Calculate per-dimension weight from axiom weight
      const axiomWeight = Formulas.AXIOMS[axiom]?.weight || 0.25;
      const dimWeight = axiomWeight / dimensions.length;

      for (const dim of dimensions) {
        dimIndex++;
        const dimEl = Utils.createElement('div', {
          className: 'dimension-item',
          dataset: { dim: dim.id },
          title: dim.description,
        }, [
          Utils.createElement('span', { className: 'dimension-index' }, [String(dimIndex)]),
          Utils.createElement('span', { className: 'dimension-name' }, [dim.name]),
          Utils.createElement('span', { className: 'dimension-weight' }, [dimWeight.toFixed(3)]),
        ]);
        dimList.appendChild(dimEl);
      }

      axiomGroup.appendChild(dimList);
      matrix.appendChild(axiomGroup);
    }

    section.appendChild(header);
    section.appendChild(matrix);

    return section;
  }

  /**
   * Create PHI constants section
   */
  _createPhiSection() {
    const section = Utils.createElement('section', { className: 'dev-section phi-section' });

    const header = Utils.createElement('div', { className: 'section-header' }, [
      Utils.createElement('h2', {}, ['φ Constants']),
    ]);

    const content = Utils.createElement('div', { className: 'phi-grid' }, [
      this._createPhiItem('φ (PHI)', Formulas.PHI.toFixed(15)),
      this._createPhiItem('φ⁻¹', Formulas.PHI_INV.toFixed(15)),
      this._createPhiItem('φ⁻²', Formulas.PHI_INV_SQ.toFixed(15)),
      this._createPhiItem('Max Confidence', (Formulas.PHI_INV * 100).toFixed(2) + '%'),
    ]);

    // LaTeX formula - using safe DOM methods
    const formula = Utils.createElement('div', { className: 'phi-formula' });
    const formulaSpan = Utils.createElement('span', { className: 'katex-formula', id: 'phi-katex' });
    formulaSpan.textContent = 'φ = (1 + √5) / 2 ≈ 1.618';
    formula.appendChild(formulaSpan);

    section.appendChild(header);
    section.appendChild(content);
    section.appendChild(formula);

    // Try to render with KaTeX if available (after DOM insertion)
    setTimeout(() => {
      if (typeof katex !== 'undefined') {
        try {
          const formulaEl = document.getElementById('phi-katex');
          if (formulaEl) {
            katex.render('\\varphi = \\frac{1 + \\sqrt{5}}{2} \\approx 1.618', formulaEl);
          }
        } catch (e) {
          console.warn('KaTeX render failed:', e);
        }
      }
    }, 0);

    return section;
  }

  _createPhiItem(label, value) {
    return Utils.createElement('div', { className: 'phi-item' }, [
      Utils.createElement('div', { className: 'phi-label' }, [label]),
      Utils.createElement('div', { className: 'phi-value' }, [value]),
    ]);
  }

  /**
   * Create judgment sandbox section
   */
  _createSandboxSection() {
    const section = Utils.createElement('section', { className: 'dev-section sandbox-section' });

    const header = Utils.createElement('div', { className: 'section-header' }, [
      Utils.createElement('h2', {}, ['Judgment Sandbox']),
    ]);

    const form = Utils.createElement('div', { className: 'sandbox-form' });

    // Content input
    const contentGroup = Utils.createElement('div', { className: 'form-group' }, [
      Utils.createElement('label', {}, ['Content to Judge']),
    ]);
    const contentInput = Utils.createElement('textarea', {
      className: 'sandbox-input',
      id: 'sandbox-content',
      placeholder: 'Enter content to judge...',
      rows: '4',
    });
    contentGroup.appendChild(contentInput);

    // Type select
    const typeGroup = Utils.createElement('div', { className: 'form-group' }, [
      Utils.createElement('label', {}, ['Type']),
    ]);
    const typeSelect = Utils.createElement('select', { className: 'sandbox-select', id: 'sandbox-type' });
    ['code', 'document', 'conversation', 'decision', 'token', 'pattern'].forEach(type => {
      const option = Utils.createElement('option', { value: type }, [type]);
      typeSelect.appendChild(option);
    });
    typeGroup.appendChild(typeSelect);

    // Actions
    const actions = Utils.createElement('div', { className: 'sandbox-actions' }, [
      Utils.createElement('button', {
        className: 'btn btn-primary',
        onClick: () => this._runJudgment(),
      }, ['Judge']),
      Utils.createElement('button', {
        className: 'btn btn-secondary',
        onClick: () => this._simulateJudgment(),
      }, ['Simulate (Local)']),
      Utils.createElement('button', {
        className: 'btn',
        onClick: () => this._clearSandbox(),
      }, ['Clear']),
    ]);

    form.appendChild(contentGroup);
    form.appendChild(typeGroup);
    form.appendChild(actions);

    section.appendChild(header);
    section.appendChild(form);

    return section;
  }

  /**
   * Create result section
   */
  _createResultSection() {
    const section = Utils.createElement('section', { className: 'dev-section result-section' });

    const header = Utils.createElement('div', { className: 'section-header' }, [
      Utils.createElement('h2', {}, ['Result']),
    ]);

    const content = Utils.createElement('div', { className: 'result-content', id: 'judgment-result' }, [
      Utils.createElement('div', { className: 'text-muted text-center' }, ['Run a judgment to see results']),
    ]);

    section.appendChild(header);
    section.appendChild(content);

    return section;
  }

  /**
   * Run judgment via API
   */
  async _runJudgment() {
    const content = document.getElementById('sandbox-content')?.value;
    const type = document.getElementById('sandbox-type')?.value || 'code';

    if (!content) {
      this._showResult({ error: 'Please enter content to judge' });
      return;
    }

    if (!this.api) {
      this._showResult({ error: 'API not connected' });
      return;
    }

    this._showResult({ loading: true });

    const result = await this.api.judge({ content, type });

    if (result.success && result.result) {
      this._showResult(result.result);
    } else {
      this._showResult({ error: result.error || 'Judgment failed' });
    }
  }

  /**
   * Simulate judgment locally
   */
  _simulateJudgment() {
    const content = document.getElementById('sandbox-content')?.value;
    const type = document.getElementById('sandbox-type')?.value || 'code';

    if (!content) {
      this._showResult({ error: 'Please enter content to judge' });
      return;
    }

    const result = Formulas.simulateJudgment({ content, type });
    this._showResult({ ...result, simulated: true });
  }

  /**
   * Show judgment result
   */
  _showResult(result) {
    const container = document.getElementById('judgment-result');
    if (!container) return;

    Utils.clearElement(container);

    if (result.loading) {
      container.appendChild(
        Utils.createElement('div', { className: 'result-loading' }, ['Judging...'])
      );
      return;
    }

    if (result.error) {
      container.appendChild(
        Utils.createElement('div', { className: 'result-error' }, [result.error])
      );
      return;
    }

    this.judgmentResult = result;

    // Simulated badge
    if (result.simulated) {
      container.appendChild(
        Utils.createElement('div', { className: 'result-badge simulated' }, ['Simulated (Local)'])
      );
    }

    // Main result
    const mainResult = Utils.createElement('div', { className: 'result-main' }, [
      Utils.createElement('div', { className: `result-verdict ${(result.verdict || 'BARK').toLowerCase()}` }, [
        result.verdict || 'BARK',
      ]),
      Utils.createElement('div', { className: 'result-score' }, [
        Utils.createElement('span', { className: 'result-score-value' }, [String(result.qScore || 0)]),
        Utils.createElement('span', { className: 'result-score-label' }, ['/100']),
      ]),
      Utils.createElement('div', { className: 'result-confidence' }, [
        `Confidence: ${((result.confidence || 0) * 100).toFixed(2)}%`,
      ]),
    ]);

    container.appendChild(mainResult);

    // Axiom breakdown
    if (result.breakdown || result.axiomScores) {
      const breakdown = Utils.createElement('div', { className: 'result-breakdown' });
      const scores = result.breakdown || result.axiomScores;

      for (const [axiom, score] of Object.entries(scores)) {
        const bar = Utils.createElement('div', { className: 'breakdown-item' }, [
          Utils.createElement('span', { className: 'breakdown-label' }, [axiom]),
          Utils.createElement('div', { className: 'breakdown-bar' }, [
            Utils.createElement('div', {
              className: 'breakdown-fill',
              style: `width: ${score}%`,
            }),
          ]),
          Utils.createElement('span', { className: 'breakdown-value' }, [String(Math.round(score))]),
        ]);
        breakdown.appendChild(bar);
      }

      container.appendChild(breakdown);
    }
  }

  /**
   * Clear sandbox
   */
  _clearSandbox() {
    const contentEl = document.getElementById('sandbox-content');
    if (contentEl) contentEl.value = '';

    const resultEl = document.getElementById('judgment-result');
    if (resultEl) {
      Utils.clearElement(resultEl);
      resultEl.appendChild(
        Utils.createElement('div', { className: 'text-muted text-center' }, ['Run a judgment to see results'])
      );
    }

    this.judgmentResult = null;
  }

  /**
   * Handle SSE events
   */
  handleEvent(event) {
    // Dev view doesn't need real-time updates
  }

  /**
   * Refresh data
   */
  async refresh() {
    // Dev view is mostly static
  }

  /**
   * Cleanup
   */
  destroy() {
    this.container = null;
  }
}

// Export to window
window.CYNICDevView = DevView;
