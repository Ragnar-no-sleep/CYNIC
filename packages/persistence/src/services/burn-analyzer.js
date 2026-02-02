/**
 * Burn Analyzer Service
 *
 * Vision → Compréhension → Burn
 *
 * Combines:
 * - SUPERMEMORY (dependency graph data)
 * - Static analysis (metrics, orphans, hotspots)
 * - LLM comprehension (intent, meaning, judgment)
 *
 * "φ distrusts φ" - Question everything, including this code.
 *
 * @module @cynic/persistence/services/burn-analyzer
 */

'use strict';

import fs from 'fs';
import path from 'path';

// φ constants
const PHI_INV = 0.618033988749895;
const FIB_13 = 13;  // Max healthy dependencies
const FIB_21 = 21;  // Warning threshold
const FIB_89 = 89;  // Batch size

// Ollama config
const OLLAMA_BASE_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.BURN_MODEL || 'qwen2:0.5b';

/**
 * Burn verdicts
 */
export const BurnVerdict = {
  DELETE: 'delete',       // Can be removed
  MERGE: 'merge',         // Should be consolidated with others
  SPLIT: 'split',         // Too big, should be broken up
  SIMPLIFY: 'simplify',   // Overly complex, needs refactor
  KEEP: 'keep',           // Necessary, leave alone
  REVIEW: 'review',       // Needs human judgment
};

/**
 * Burn Analyzer
 *
 * Analyzes codebase for simplification opportunities.
 */
export class BurnAnalyzer {
  /**
   * @param {Object} options
   * @param {Object} options.codebaseIndexer - CodebaseIndexer instance
   * @param {Object} options.llmService - LLM service for comprehension (optional)
   * @param {string} options.rootDir - Root directory
   * @param {string} options.ollamaUrl - Ollama base URL
   * @param {string} options.model - LLM model to use
   */
  constructor(options = {}) {
    this.indexer = options.codebaseIndexer || null;
    this.llm = options.llmService || null;
    this.rootDir = options.rootDir || process.cwd();
    this.cache = new Map();
    this.ollamaUrl = options.ollamaUrl || OLLAMA_BASE_URL;
    this.model = options.model || OLLAMA_MODEL;
    this.ollamaAvailable = null; // Cached availability check
  }

  /**
   * Run full burn analysis
   *
   * @param {Object} options
   * @param {boolean} options.useLlm - Use LLM for deep analysis
   * @param {number} options.maxCandidates - Max candidates to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyze(options = {}) {
    const { useLlm = true, maxCandidates = FIB_21 } = options;

    const results = {
      timestamp: new Date().toISOString(),
      stats: {},
      orphans: [],
      hotspots: [],
      giants: [],
      duplicates: [],
      candidates: [],
      summary: null,
    };

    // Phase 1: Collect data via SUPERMEMORY
    console.log('   [1/4] Collecting data...');
    const files = await this._collectFiles();
    results.stats.totalFiles = files.length;
    results.stats.totalLines = files.reduce((sum, f) => sum + (f.lines || 0), 0);

    // Phase 2: Static analysis
    console.log('   [2/4] Static analysis...');
    results.orphans = this._findOrphans(files);
    results.hotspots = this._findHotspots(files);
    results.giants = this._findGiants(files);
    results.duplicates = await this._findDuplicates(files);

    // Phase 3: Build candidate list
    console.log('   [3/4] Building candidates...');
    const allCandidates = [
      ...results.orphans.map(f => ({ ...f, reason: 'orphan', suggestedVerdict: BurnVerdict.DELETE })),
      ...results.hotspots.map(f => ({ ...f, reason: 'hotspot', suggestedVerdict: BurnVerdict.SIMPLIFY })),
      ...results.giants.map(f => ({ ...f, reason: 'giant', suggestedVerdict: BurnVerdict.SPLIT })),
      ...results.duplicates.map(f => ({ ...f, reason: 'duplicate', suggestedVerdict: BurnVerdict.MERGE })),
    ];

    // Sort by confidence and take top candidates
    const sortedCandidates = allCandidates
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, maxCandidates);

    // Phase 4: LLM comprehension (if available)
    if (useLlm && sortedCandidates.length > 0) {
      // Check if LLM is available (external service OR Ollama)
      const llmAvailable = this.llm || await this._isOllamaAvailable();
      if (llmAvailable) {
        console.log('   [4/4] LLM comprehension...');
        results.candidates = await this._llmAnalyzeCandidates(sortedCandidates);
      } else {
        console.log('   [4/4] Skipping LLM (not available)');
        // Set finalVerdict from suggestedVerdict for static-only analysis
        results.candidates = sortedCandidates.map(c => ({
          ...c,
          verdict: c.suggestedVerdict,
          finalVerdict: c.suggestedVerdict,
        }));
      }
    } else {
      console.log('   [4/4] Skipping LLM (disabled)');
      // Set finalVerdict from suggestedVerdict for static-only analysis
      results.candidates = sortedCandidates.map(c => ({
        ...c,
        verdict: c.suggestedVerdict,
        finalVerdict: c.suggestedVerdict,
      }));
    }

    // Generate summary
    results.summary = this._generateSummary(results);

    return results;
  }

  /**
   * Collect all files with metadata
   * @private
   */
  async _collectFiles() {
    const files = [];

    const walk = (dir, depth = 0) => {
      if (depth > 8) return;

      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules' || item === 'dist') continue;

          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (item.endsWith('.js') || item.endsWith('.mjs')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(this.rootDir, fullPath);

            files.push({
              path: relativePath,
              fullPath,
              lines: content.split('\n').length,
              size: stat.size,
              imports: this._extractImports(content),
              exports: this._extractExports(content),
              content: content.substring(0, 1000), // First 1K for LLM
            });
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    };

    walk(this.rootDir);
    return files;
  }

  /**
   * Extract imports from content
   * @private
   */
  _extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      if (!imports.includes(match[1])) imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract exports from content
   * @private
   */
  _extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    if (/export\s+default/.test(content)) {
      exports.push('default');
    }

    return exports;
  }

  /**
   * Find orphan files (no importers)
   * @private
   */
  _findOrphans(files) {
    const importedPaths = new Set();

    // Collect all imported paths
    for (const file of files) {
      for (const imp of file.imports) {
        if (imp.startsWith('.')) {
          // Resolve relative import
          const dir = path.dirname(file.fullPath);
          let resolved = path.resolve(dir, imp);
          if (!resolved.endsWith('.js')) resolved += '.js';
          importedPaths.add(resolved);
          // Also try index.js
          importedPaths.add(path.resolve(dir, imp, 'index.js'));
        }
      }
    }

    // Find files never imported
    const orphans = [];
    for (const file of files) {
      // Skip entry points and tests
      if (file.path.includes('index.js') ||
          file.path.includes('server.js') ||
          file.path.includes('cli') ||
          file.path.includes('test') ||
          file.path.includes('benchmark') ||
          file.path.includes('hooks/')) {
        continue;
      }

      if (!importedPaths.has(file.fullPath)) {
        orphans.push({
          ...file,
          confidence: 0.5, // Medium confidence - might be dynamic import
        });
      }
    }

    return orphans.slice(0, FIB_21);
  }

  /**
   * Find hotspot files (too many dependencies)
   * @private
   */
  _findHotspots(files) {
    return files
      .filter(f => f.imports.length > FIB_13)
      .map(f => ({
        ...f,
        importCount: f.imports.length,
        confidence: Math.min(PHI_INV, (f.imports.length - FIB_13) / FIB_21),
      }))
      .sort((a, b) => b.importCount - a.importCount)
      .slice(0, FIB_13);
  }

  /**
   * Find giant files (>500 lines)
   * @private
   */
  _findGiants(files) {
    const GIANT_THRESHOLD = 500;

    return files
      .filter(f => f.lines > GIANT_THRESHOLD)
      .map(f => ({
        ...f,
        confidence: Math.min(PHI_INV, (f.lines - GIANT_THRESHOLD) / 1000),
      }))
      .sort((a, b) => b.lines - a.lines)
      .slice(0, FIB_13);
  }

  /**
   * Find potential duplicates (similar structure)
   * @private
   */
  async _findDuplicates(files) {
    const duplicates = [];
    const seen = new Map();

    for (const file of files) {
      // Create a signature based on exports and structure
      const signature = file.exports.sort().join(',');

      if (signature && signature.length > 3) {
        if (seen.has(signature)) {
          duplicates.push({
            ...file,
            similarTo: seen.get(signature),
            confidence: 0.4, // Low confidence - needs LLM verification
          });
        } else {
          seen.set(signature, file.path);
        }
      }
    }

    return duplicates.slice(0, FIB_13);
  }

  /**
   * Use LLM to analyze candidates deeply
   * @private
   */
  async _llmAnalyzeCandidates(candidates) {
    const analyzed = [];

    for (const candidate of candidates) {
      try {
        const llmResult = await this._llmAnalyzeFile(candidate);
        analyzed.push({
          ...candidate,
          llmVerdict: llmResult.verdict,
          llmReason: llmResult.reason,
          llmConfidence: llmResult.confidence,
          finalVerdict: this._reconcileVerdicts(candidate.suggestedVerdict, llmResult.verdict),
        });
      } catch (e) {
        // LLM failed, keep static analysis
        analyzed.push({
          ...candidate,
          llmError: e.message,
          finalVerdict: candidate.suggestedVerdict,
        });
      }
    }

    return analyzed;
  }

  /**
   * Check if Ollama is available AND can run the model
   * @private
   */
  async _isOllamaAvailable() {
    if (this.ollamaAvailable !== null) return this.ollamaAvailable;

    try {
      // First check if Ollama is running
      const tagsResponse = await fetch(`${this.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!tagsResponse.ok) {
        this.ollamaAvailable = false;
        return false;
      }

      // Check if model is available and can run (quick test)
      const testResponse = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: 'Hi',
          stream: false,
          options: { num_predict: 1 },
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await testResponse.json();
      if (data.error) {
        console.log(`   ⚠️ Ollama model unavailable: ${data.error.substring(0, 50)}...`);
        this.ollamaAvailable = false;
        return false;
      }

      this.ollamaAvailable = true;
      return true;
    } catch (e) {
      this.ollamaAvailable = false;
      return false;
    }
  }

  /**
   * Call Ollama API
   * @private
   */
  async _callOllama(prompt) {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 300,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();

    // Handle Ollama errors (memory, model not found, etc.)
    if (data.error) {
      throw new Error(`Ollama: ${data.error}`);
    }

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    return data.response || '';
  }

  /**
   * Analyze single file with LLM
   * @private
   */
  async _llmAnalyzeFile(file) {
    // Check if we have external LLM service
    if (this.llm && typeof this.llm.generate === 'function') {
      return this._llmAnalyzeWithService(file);
    }

    // Use built-in Ollama
    if (!await this._isOllamaAvailable()) {
      return { verdict: BurnVerdict.REVIEW, reason: 'No LLM available', confidence: 0 };
    }

    const prompt = `Analyze this JavaScript file for codebase cleanup.

File: ${file.path}
Lines: ${file.lines}
Imports: ${file.imports.length}
Exports: ${file.exports.join(', ') || 'none'}
Static analysis: ${file.reason} (suggested: ${file.suggestedVerdict})

Code preview:
${file.content?.substring(0, 400) || 'N/A'}

Question: Should this file be DELETE, MERGE, SPLIT, SIMPLIFY, or KEEP?

Answer in JSON format only:
{"verdict": "DELETE|MERGE|SPLIT|SIMPLIFY|KEEP", "reason": "brief explanation", "confidence": 0.5}`;

    try {
      const response = await this._callOllama(prompt);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { verdict: BurnVerdict.REVIEW, reason: 'Could not parse LLM response', confidence: 0.3 };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        verdict: (parsed.verdict || 'REVIEW').toLowerCase(),
        reason: parsed.reason || 'LLM analysis',
        confidence: Math.min(parsed.confidence || 0.5, PHI_INV),
      };
    } catch (e) {
      return { verdict: BurnVerdict.REVIEW, reason: `LLM error: ${e.message}`, confidence: 0.2 };
    }
  }

  /**
   * Analyze with external LLM service
   * @private
   */
  async _llmAnalyzeWithService(file) {
    const prompt = `Analyze file "${file.path}" (${file.lines} lines, ${file.imports.length} imports).
Static says: ${file.reason}. Should it be DELETE, MERGE, SPLIT, SIMPLIFY, or KEEP?
JSON only: {"verdict":"...","reason":"...","confidence":0.5}`;

    try {
      const response = await this.llm.generate(prompt);
      const parsed = JSON.parse(response);
      return {
        verdict: parsed.verdict || BurnVerdict.REVIEW,
        reason: parsed.reason || 'LLM analysis',
        confidence: Math.min(parsed.confidence || 0.5, PHI_INV),
      };
    } catch (e) {
      return { verdict: BurnVerdict.REVIEW, reason: `LLM error: ${e.message}`, confidence: 0.2 };
    }
  }

  /**
   * Reconcile static and LLM verdicts
   * @private
   */
  _reconcileVerdicts(staticVerdict, llmVerdict) {
    // If they agree, use that
    if (staticVerdict === llmVerdict) return staticVerdict;

    // If LLM says KEEP, trust it (might know about dynamic usage)
    if (llmVerdict === BurnVerdict.KEEP) return BurnVerdict.KEEP;

    // If LLM says REVIEW, use static
    if (llmVerdict === BurnVerdict.REVIEW) return staticVerdict;

    // Otherwise, flag for human review
    return BurnVerdict.REVIEW;
  }

  /**
   * Generate human-readable summary
   * @private
   */
  _generateSummary(results) {
    const { stats, orphans, hotspots, giants, duplicates, candidates } = results;

    const actionable = candidates.filter(c =>
      c.finalVerdict && c.finalVerdict !== BurnVerdict.KEEP && c.finalVerdict !== BurnVerdict.REVIEW
    );

    return {
      totalFiles: stats.totalFiles,
      totalLines: stats.totalLines,
      issuesFound: {
        orphans: orphans.length,
        hotspots: hotspots.length,
        giants: giants.length,
        duplicates: duplicates.length,
      },
      actionableCandidates: actionable.length,
      potentialLinesRemovable: actionable
        .filter(c => c.finalVerdict === BurnVerdict.DELETE)
        .reduce((sum, c) => sum + (c.lines || 0), 0),
      topPriority: actionable.slice(0, 3).map(c => ({
        path: c.path,
        verdict: c.finalVerdict,
        reason: c.llmReason || c.reason,
      })),
    };
  }

  /**
   * Get quick analysis (static only, no LLM)
   */
  async quickAnalysis() {
    return this.analyze({ useLlm: false, maxCandidates: FIB_13 });
  }

  /**
   * Get deep analysis (with LLM)
   */
  async deepAnalysis() {
    return this.analyze({ useLlm: true, maxCandidates: FIB_21 });
  }
}

/**
 * Create BurnAnalyzer instance
 */
export function createBurnAnalyzer(options = {}) {
  return new BurnAnalyzer(options);
}

export default BurnAnalyzer;
