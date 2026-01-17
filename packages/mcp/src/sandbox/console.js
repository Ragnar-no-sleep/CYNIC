/**
 * CYNIC Console - Interactive REPL for sandbox
 */

const CYNICConsole = {
  outputEl: null,
  inputEl: null,
  history: [],
  historyIndex: -1,
  engine: null,

  // Built-in commands
  commands: {
    help: {
      description: 'Show available commands',
      execute: () => CYNICConsole.showHelp()
    },
    clear: {
      description: 'Clear console output',
      execute: () => CYNICConsole.clear()
    },
    judge: {
      description: 'Judge a token - judge("address")',
      execute: (args) => CYNICConsole.judge(args)
    },
    simulate: {
      description: 'Simulate scores - simulate({q: 80, k: 65})',
      execute: (args) => CYNICConsole.simulate(args)
    },
    phi: {
      description: 'Show PHI constants',
      execute: () => CYNICConsole.showPhi()
    },
    chain: {
      description: 'PoJ Chain commands - chain.head(), chain.block(n)',
      execute: (args) => CYNICConsole.chain(args)
    },
    dog: {
      description: 'Dog commands - dog.observer.stats()',
      execute: (args) => CYNICConsole.dog(args)
    },
    patterns: {
      description: 'Pattern commands - patterns.recent(n)',
      execute: (args) => CYNICConsole.patterns(args)
    },
    health: {
      description: 'System health check',
      execute: () => CYNICConsole.health()
    },
    axioms: {
      description: 'Show CYNIC axioms',
      execute: () => CYNICConsole.showAxioms()
    },
    dimensions: {
      description: 'Show 25 dimensions',
      execute: () => CYNICConsole.showDimensions()
    }
  },

  // Expression evaluator context (whitelisted values only)
  evalContext: {
    PHI: null,
    PHI_INV: null,
    sqrt: Math.sqrt,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round
  },

  /**
   * Initialize console
   */
  init(outputId, inputId) {
    this.outputEl = document.getElementById(outputId);
    this.inputEl = document.getElementById(inputId);

    // Set eval context values
    this.evalContext.PHI = CYNICFormulas.PHI;
    this.evalContext.PHI_INV = CYNICFormulas.PHI_INV;

    if (!this.inputEl) return;

    // Input handlers
    this.inputEl.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Welcome message
    this.log('CYNIC Console v1.0', 'system');
    this.log('Type "help" for commands', 'system');
    this.log('─'.repeat(40), 'system');

    // Listen for external events
    document.addEventListener('blockSelected', (e) => {
      this.log('Block selected: #' + e.detail.number, 'info');
    });

    document.addEventListener('objectSelected', (e) => {
      const { type, data } = e.detail;
      this.log(type + ' selected: ' + data.name, 'info');
    });
  },

  /**
   * Handle keyboard input
   */
  handleKeyDown(e) {
    if (e.key === 'Enter') {
      const input = this.inputEl.value.trim();
      if (input) {
        this.execute(input);
        this.history.push(input);
        this.historyIndex = this.history.length;
      }
      this.inputEl.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputEl.value = this.history[this.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.inputEl.value = this.history[this.historyIndex];
      } else {
        this.historyIndex = this.history.length;
        this.inputEl.value = '';
      }
    }
  },

  /**
   * Execute command
   */
  execute(input) {
    this.log('> ' + input, 'input');

    try {
      // Parse command
      const match = input.match(/^(\w+)(?:\.(\w+))?(?:\((.*)\))?$/);

      if (!match) {
        // Try as simple math expression
        const result = this.evalSimpleMath(input);
        if (result !== null) {
          this.log(String(result), 'output');
        } else {
          this.log('Invalid expression. Type "help" for commands.', 'error');
        }
        return;
      }

      const [, cmd, subCmd, argsStr] = match;
      let args = null;

      if (argsStr) {
        // Try to parse as number or simple value
        args = this.parseArgs(argsStr);
      }

      // Execute command
      if (this.commands[cmd]) {
        const result = this.commands[cmd].execute(args, subCmd);
        if (result !== undefined) {
          if (typeof result === 'object') {
            this.log(JSON.stringify(result, null, 2), 'output');
          } else {
            this.log(String(result), 'output');
          }
        }
      } else {
        this.log('Unknown command: ' + cmd, 'error');
        this.log('Type "help" for available commands', 'system');
      }
    } catch (err) {
      this.log('Error: ' + err.message, 'error');
    }
  },

  /**
   * Parse command arguments safely
   */
  parseArgs(argsStr) {
    // Try number
    const num = parseFloat(argsStr);
    if (!isNaN(num)) return num;

    // Try JSON object
    try {
      return JSON.parse(argsStr.replace(/'/g, '"'));
    } catch {
      // Return as string
      return argsStr.replace(/['"]/g, '');
    }
  },

  /**
   * Safe math expression evaluator (no eval/Function)
   */
  evalSimpleMath(expr) {
    // Replace constants
    let sanitized = expr
      .replace(/PHI_INV/g, String(this.evalContext.PHI_INV))
      .replace(/PHI/g, String(this.evalContext.PHI));

    // Only allow numbers, operators, parentheses, and whitelisted functions
    const allowed = /^[\d\s\+\-\*\/\(\)\.\,]+$/;
    const funcPattern = /^(sqrt|pow|min|max|abs|floor|ceil|round)\([\d\s\+\-\*\/\(\)\.\,]+\)$/;

    if (allowed.test(sanitized)) {
      // Simple arithmetic - parse manually
      try {
        // Use a simple recursive descent parser for safety
        return this.parseExpression(sanitized);
      } catch {
        return null;
      }
    }

    // Check for function calls
    for (const func of ['sqrt', 'pow', 'min', 'max', 'abs', 'floor', 'ceil', 'round']) {
      if (sanitized.startsWith(func + '(')) {
        const argsMatch = sanitized.match(/^\w+\(([\d\s\+\-\*\/\(\)\.\,]+)\)$/);
        if (argsMatch) {
          const args = argsMatch[1].split(',').map(a => this.parseExpression(a.trim()));
          return this.evalContext[func](...args);
        }
      }
    }

    return null;
  },

  /**
   * Simple expression parser for arithmetic
   */
  parseExpression(expr) {
    expr = expr.trim();

    // Handle parentheses first
    while (expr.includes('(')) {
      expr = expr.replace(/\(([^()]+)\)/g, (_, inner) => {
        return String(this.parseExpression(inner));
      });
    }

    // Addition and subtraction (left to right)
    const addMatch = expr.match(/^(.+?)([+-])([^+-]+)$/);
    if (addMatch) {
      const left = this.parseExpression(addMatch[1]);
      const right = this.parseExpression(addMatch[3]);
      return addMatch[2] === '+' ? left + right : left - right;
    }

    // Multiplication and division (left to right)
    const mulMatch = expr.match(/^(.+?)([*/])([^*/]+)$/);
    if (mulMatch) {
      const left = this.parseExpression(mulMatch[1]);
      const right = this.parseExpression(mulMatch[3]);
      return mulMatch[2] === '*' ? left * right : left / right;
    }

    // Just a number
    return parseFloat(expr);
  },

  /**
   * Log to console output
   */
  log(message, type = 'output') {
    if (!this.outputEl) return;

    const line = document.createElement('div');
    line.className = 'console-line ' + type;
    line.textContent = message;

    this.outputEl.appendChild(line);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  },

  /**
   * Clear console
   */
  clear() {
    if (this.outputEl) {
      while (this.outputEl.firstChild) {
        this.outputEl.removeChild(this.outputEl.firstChild);
      }
    }
    this.log('Console cleared', 'system');
  },

  /**
   * Show help
   */
  showHelp() {
    this.log('─── CYNIC Console Commands ───', 'system');
    for (const [name, cmd] of Object.entries(this.commands)) {
      this.log('  ' + name + ' - ' + cmd.description, 'system');
    }
    this.log('─'.repeat(30), 'system');
    this.log('Math expressions:', 'system');
    this.log('  PHI, PHI_INV, sqrt(5), 1+2*3', 'system');
  },

  /**
   * Show PHI constants
   */
  showPhi() {
    this.log('─── PHI Constants ───', 'system');
    this.log('  φ (PHI)     = ' + CYNICFormulas.PHI.toFixed(15), 'output');
    this.log('  φ⁻¹         = ' + CYNICFormulas.PHI_INV.toFixed(15), 'output');
    this.log('  φ⁻²         = ' + CYNICFormulas.PHI_INV_SQ.toFixed(15), 'output');
    this.log('', 'system');
    this.log('  Max confidence: ' + (CYNICFormulas.PHI_INV * 100).toFixed(2) + '%', 'output');
    this.log('  Min doubt:      ' + (CYNICFormulas.PHI_INV_SQ * 100).toFixed(2) + '%', 'output');
  },

  /**
   * Show axioms
   */
  showAxioms() {
    this.log('─── CYNIC Axioms ───', 'system');
    for (const [name, axiom] of Object.entries(CYNICFormulas.AXIOMS)) {
      this.log('  ' + name + ' (w=' + axiom.weight.toFixed(3) + ')', 'output');
      this.log('    ' + axiom.description, 'system');
    }
  },

  /**
   * Show dimensions
   */
  showDimensions() {
    this.log('─── 25 Dimensions ───', 'system');
    let count = 0;
    for (const [axiom, dims] of Object.entries(CYNICFormulas.DIMENSIONS)) {
      this.log('', 'system');
      this.log('[' + axiom + ']', 'output');
      for (const dim of dims) {
        count++;
        this.log('  ' + count + '. ' + dim.name, 'system');
      }
    }
    this.log('', 'system');
    this.log('Total: ' + count + ' dimensions', 'output');
  },

  /**
   * Judge command
   */
  judge(args) {
    this.log('Simulating judgment...', 'system');

    const result = CYNICFormulas.simulateJudgment();

    this.log('', 'system');
    this.log('─── Judgment Result ───', 'system');
    this.log('  Q-Score:    ' + result.qScore.constrained.toFixed(2) + '/100', 'output');
    this.log('  Confidence: ' + (result.qScore.confidence * 100).toFixed(2) + '%', 'output');
    this.log('  Verdict:    ' + result.verdict.emoji + ' ' + result.verdict.verdict, 'output');
    this.log('', 'system');

    // Update matrix visualization
    if (window.CYNICViz) {
      CYNICViz.renderMatrix('matrixView', result.dimensions);
    }

    // Update Q-Score display
    const qScoreEl = document.getElementById('qScoreValue');
    if (qScoreEl) {
      qScoreEl.textContent = result.qScore.constrained.toFixed(0) + '/100';
    }

    return result;
  },

  /**
   * Simulate scores
   */
  simulate(args) {
    const q = args?.q ?? 70;
    const k = args?.k ?? 80;
    const final = Math.min(q, k);

    this.log('─── Score Simulation ───', 'system');
    this.log('  Q-Score: ' + q, 'output');
    this.log('  K-Score: ' + k, 'output');
    this.log('  Final:   ' + final + ' (min of Q, K)', 'output');
    this.log('', 'system');

    const verdict = CYNICFormulas.getVerdict(final);
    this.log('  Verdict: ' + verdict.emoji + ' ' + verdict.verdict, 'output');

    return { q, k, final, verdict };
  },

  /**
   * Chain commands
   */
  chain(args, subCmd) {
    // Mock chain data (would come from engine in real impl)
    const mockChain = {
      head: { number: 130, judgments: 4, hash: '0x7f83b1...', timestamp: new Date().toISOString() },
      blocks: [
        { number: 127, judgments: 3, pending: false },
        { number: 128, judgments: 5, pending: false },
        { number: 129, judgments: 2, pending: false },
        { number: 130, judgments: 4, pending: false },
        { number: 131, judgments: 0, pending: true }
      ],
      total: 847
    };

    if (subCmd === 'head' || !subCmd) {
      this.log('─── PoJ Chain Head ───', 'system');
      this.log('  Block:      #' + mockChain.head.number, 'output');
      this.log('  Judgments:  ' + mockChain.head.judgments, 'output');
      this.log('  Hash:       ' + mockChain.head.hash, 'output');

      // Update chain viz
      if (window.CYNICViz) {
        CYNICViz.renderChain('chainViz', mockChain.blocks);
      }

      return mockChain.head;
    }

    if (subCmd === 'block') {
      const blockNum = args || mockChain.head.number;
      const block = mockChain.blocks.find(b => b.number === blockNum);
      if (block) {
        return block;
      } else {
        this.log('Block #' + blockNum + ' not found', 'error');
      }
    }

    if (subCmd === 'stats') {
      return { total: mockChain.total, head: mockChain.head.number };
    }
  },

  /**
   * Dog commands
   */
  dog(args, subCmd) {
    const mockDogs = {
      observer: { active: true, events: 127, patterns: 23 },
      digester: { active: true, digests: 89, extractions: 156 },
      guardian: { active: true, blocks: 12, warnings: 45 },
      mentor: { active: true, wisdom: 34, guidance: 78 }
    };

    if (!subCmd || subCmd === 'status') {
      this.log('─── Dogs Status ───', 'system');
      for (const [name, data] of Object.entries(mockDogs)) {
        const status = data.active ? '🟢' : '🔴';
        this.log('  ' + status + ' ' + name, 'output');
      }
      return mockDogs;
    }

    const dogData = mockDogs[subCmd];
    if (dogData) {
      return dogData;
    }

    this.log('Unknown dog: ' + subCmd, 'error');
  },

  /**
   * Patterns commands
   */
  patterns(args) {
    const count = args || 5;

    const mockPatterns = [
      { type: 'anomaly', description: 'Unusual judgment clustering', confidence: 0.72 },
      { type: 'verdict', description: 'GROWL streak detected', confidence: 0.65 },
      { type: 'dimension', description: 'PHI scores trending up', confidence: 0.58 },
      { type: 'anomaly', description: 'Low VERIFY in batch', confidence: 0.81 },
      { type: 'verdict', description: 'WAG consistency high', confidence: 0.69 }
    ];

    this.log('─── Recent Patterns (' + count + ') ───', 'system');
    mockPatterns.slice(0, count).forEach((p, i) => {
      this.log('  ' + (i + 1) + '. [' + p.type.toUpperCase() + '] ' + p.description, 'output');
      this.log('     Confidence: ' + (p.confidence * 100).toFixed(1) + '%', 'output');
    });

    return mockPatterns.slice(0, count);
  },

  /**
   * Health check
   */
  health() {
    const health = {
      status: 'healthy',
      uptime: '2h 34m',
      memory: '45MB',
      connections: {
        mcp: this.engine?.connected ?? false,
        postgres: true,
        redis: true
      },
      dogs: {
        active: 4,
        total: 10
      }
    };

    this.log('─── System Health ───', 'system');
    this.log('  Status:  ' + health.status, 'output');
    this.log('  Uptime:  ' + health.uptime, 'output');
    this.log('  Memory:  ' + health.memory, 'output');
    this.log('  MCP:     ' + (health.connections.mcp ? '🟢' : '🔴'), 'output');
    this.log('  Dogs:    ' + health.dogs.active + '/' + health.dogs.total + ' active', 'output');

    return health;
  },

  /**
   * Set engine reference for live connections
   */
  setEngine(engine) {
    this.engine = engine;
  }
};

// Export
window.CYNICConsole = CYNICConsole;
