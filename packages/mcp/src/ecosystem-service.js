/**
 * Ecosystem Service
 *
 * Manages pre-loaded ecosystem documentation for CYNIC.
 *
 * "The pack knows all territories" - κυνικός
 *
 * @module @cynic/mcp/ecosystem-service
 */

'use strict';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';

const PHI_INV = 0.618033988749895;

/**
 * Document specification for ecosystem docs
 */
const ECOSYSTEM_DOCS = [
  // CLAUDE.md files (core project instructions)
  { project: 'holdex', docType: 'claude_md', path: 'HolDex/CLAUDE.md', priority: 1 },
  { project: 'gasdf', docType: 'claude_md', path: 'GASdf/CLAUDE.md', priority: 1 },
  { project: 'asdf-brain', docType: 'claude_md', path: 'asdf-brain/CLAUDE.md', priority: 1 },
  { project: 'ecosystem', docType: 'claude_md', path: 'asdfasdfa-ecosystem/CLAUDE.md', priority: 1 },
  { project: 'cynic', docType: 'claude_md', path: 'CYNIC-new/CLAUDE.md', priority: 1 },

  // Harmony (shared φ utilities)
  { project: 'holdex', docType: 'harmony', path: 'HolDex/src/shared/harmony.js', priority: 2 },

  // API docs
  { project: 'holdex', docType: 'api_readme', path: 'HolDex/README.md', priority: 2 },
  { project: 'gasdf', docType: 'api_readme', path: 'GASdf/README.md', priority: 2 },

  // Architecture docs
  { project: 'cynic', docType: 'architecture', path: 'CYNIC-new/docs/ARCHITECTURE.md', priority: 2 },
  { project: 'cynic', docType: 'architecture_diagrams', path: 'CYNIC-new/docs/ARCHITECTURE-DIAGRAMS.md', priority: 3 },
  { project: 'cynic', docType: 'consciousness', path: 'CYNIC-new/docs/CONSCIOUSNESS.md', priority: 2 },
  { project: 'cynic', docType: 'roadmap', path: 'CYNIC-new/docs/ROADMAP-CYNIC-ECOSYSTEM.md', priority: 2 },
];

/**
 * Hash content using SHA-256
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Ecosystem Service - manages ecosystem documentation
 */
export class EcosystemService extends EventEmitter {
  /**
   * @param {Object} persistence - Persistence manager
   * @param {Object} [options] - Options
   */
  constructor(persistence, options = {}) {
    super();

    this.persistence = persistence;
    this.options = {
      workspaceRoot: options.workspaceRoot || '/workspaces',
      autoRefresh: options.autoRefresh !== false,
      refreshIntervalMs: options.refreshIntervalMs || 61800 * 10, // φ × 10 seconds
      digestGenerator: options.digestGenerator || null,
      ...options,
    };

    this._initialized = false;
    this._refreshTimer = null;
    this._lastRefresh = null;

    // Stats
    this.stats = {
      loadCount: 0,
      refreshCount: 0,
      searchCount: 0,
      hitCount: 0,
      digestsGenerated: 0,
    };
  }

  /**
   * Initialize the service
   */
  async init() {
    if (this._initialized) return;

    // Check if persistence supports ecosystem docs
    if (!this.persistence?.ecosystemDocs) {
      console.warn('[EcosystemService] No ecosystem docs repository - running in memory-only mode');
      this._memoryCache = new Map();
    }

    this._initialized = true;
    this.emit('initialized');

    // Start auto-refresh if enabled
    if (this.options.autoRefresh && this.persistence?.ecosystemDocs) {
      this._startAutoRefresh();
    }
  }

  /**
   * Load all ecosystem documents
   * @param {Object} [options] - Load options
   * @returns {Promise<Object>} Load results
   */
  async loadAll(options = {}) {
    await this.init();

    const { force = false, generateDigests = false } = options;
    const results = {
      loaded: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (const docSpec of ECOSYSTEM_DOCS) {
      try {
        const result = await this.loadDocument(docSpec, { force, generateDigests });

        if (result.status === 'loaded') {
          results.loaded++;
        } else if (result.status === 'skipped') {
          results.skipped++;
        } else {
          results.failed++;
          results.errors.push({ doc: docSpec, error: result.error });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ doc: docSpec, error: err.message });
      }
    }

    this.stats.loadCount++;
    this._lastRefresh = Date.now();
    this.emit('loaded', results);

    return results;
  }

  /**
   * Load a single document
   * @param {Object} docSpec - Document specification
   * @param {Object} [options] - Options
   * @returns {Promise<Object>} Load result
   */
  async loadDocument(docSpec, options = {}) {
    const { force = false, generateDigests = false } = options;
    const fullPath = path.join(this.options.workspaceRoot, docSpec.path);

    // Read file
    let content;
    try {
      content = await fs.readFile(fullPath, 'utf-8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { status: 'failed', error: 'File not found' };
      }
      return { status: 'failed', error: err.message };
    }

    // Check if changed (unless force)
    if (!force && this.persistence?.ecosystemDocs) {
      const changed = await this.persistence.ecosystemDocs.hasChanged(
        docSpec.project,
        docSpec.docType,
        content
      );

      if (!changed) {
        return { status: 'skipped', reason: 'unchanged' };
      }
    }

    // Generate digest if requested and generator available
    let digest = null;
    if (generateDigests && this.options.digestGenerator) {
      try {
        digest = await this.options.digestGenerator(content, docSpec);
        this.stats.digestsGenerated++;
      } catch (err) {
        console.warn(`[EcosystemService] Failed to generate digest for ${docSpec.project}/${docSpec.docType}:`, err.message);
      }
    }

    // Store document
    if (this.persistence?.ecosystemDocs) {
      await this.persistence.ecosystemDocs.upsert({
        project: docSpec.project,
        docType: docSpec.docType,
        filePath: docSpec.path,
        content,
        digest,
        metadata: { priority: docSpec.priority, preloaded: true },
      });
    } else {
      // Memory-only mode
      const key = `${docSpec.project}:${docSpec.docType}`;
      this._memoryCache.set(key, {
        ...docSpec,
        content,
        digest,
        contentHash: hashContent(content),
        loadedAt: Date.now(),
      });
    }

    return { status: 'loaded', size: content.length };
  }

  /**
   * Get a document
   * @param {string} project - Project name
   * @param {string} docType - Document type
   * @returns {Promise<Object|null>} Document or null
   */
  async get(project, docType) {
    await this.init();
    this.stats.hitCount++;

    if (this.persistence?.ecosystemDocs) {
      return this.persistence.ecosystemDocs.get(project, docType);
    }

    // Memory-only mode
    const key = `${project}:${docType}`;
    return this._memoryCache?.get(key) || null;
  }

  /**
   * Get all documents for a project
   * @param {string} project - Project name
   * @returns {Promise<Object[]>} Documents
   */
  async getByProject(project) {
    await this.init();

    if (this.persistence?.ecosystemDocs) {
      return this.persistence.ecosystemDocs.getByProject(project);
    }

    // Memory-only mode
    const results = [];
    for (const [key, doc] of this._memoryCache || []) {
      if (doc.project === project) {
        results.push(doc);
      }
    }
    return results;
  }

  /**
   * Search documents
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Object[]>} Matching documents
   */
  async search(query, options = {}) {
    await this.init();
    this.stats.searchCount++;

    if (this.persistence?.ecosystemDocs) {
      return this.persistence.ecosystemDocs.search(query, options);
    }

    // Simple memory search
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [, doc] of this._memoryCache || []) {
      if (doc.content?.toLowerCase().includes(lowerQuery)) {
        results.push({
          project: doc.project,
          docType: doc.docType,
          snippet: this._extractSnippet(doc.content, query),
        });
      }
    }

    return results.slice(0, options.limit || 10);
  }

  /**
   * Get document list (without content)
   * @returns {Promise<Object[]>} Document list
   */
  async list() {
    await this.init();

    if (this.persistence?.ecosystemDocs) {
      return this.persistence.ecosystemDocs.getAll();
    }

    // Memory-only mode
    const results = [];
    for (const [, doc] of this._memoryCache || []) {
      results.push({
        project: doc.project,
        docType: doc.docType,
        filePath: doc.path,
        contentLength: doc.content?.length || 0,
        hasDigest: !!doc.digest,
      });
    }
    return results;
  }

  /**
   * Get statistics
   * @returns {Promise<Object>} Stats
   */
  async getStats() {
    await this.init();

    const dbStats = this.persistence?.ecosystemDocs
      ? await this.persistence.ecosystemDocs.getStats()
      : { total_docs: this._memoryCache?.size || 0 };

    return {
      ...this.stats,
      ...dbStats,
      lastRefresh: this._lastRefresh,
      autoRefresh: this.options.autoRefresh,
      memoryOnly: !this.persistence?.ecosystemDocs,
    };
  }

  /**
   * Refresh changed documents
   * @returns {Promise<Object>} Refresh results
   */
  async refresh() {
    this.stats.refreshCount++;
    return this.loadAll({ force: false });
  }

  /**
   * Get essential context for a task
   * Returns relevant docs based on task context
   * @param {string} context - Task context description
   * @param {Object} [options] - Options
   * @returns {Promise<Object>} Relevant documents
   */
  async getContextFor(context, options = {}) {
    await this.init();

    const { maxDocs = 3, maxLength = 10000 } = options;
    const results = [];
    let totalLength = 0;

    // Keywords for matching
    const keywords = context.toLowerCase().split(/\s+/);

    // Score documents by relevance
    const scored = [];
    const docs = this.persistence?.ecosystemDocs
      ? await this.persistence.ecosystemDocs.getAll()
      : [...(this._memoryCache?.values() || [])];

    for (const doc of docs) {
      let score = 0;

      // Check project match
      for (const kw of keywords) {
        if (doc.project?.includes(kw)) score += 2;
        if (doc.doc_type?.includes(kw) || doc.docType?.includes(kw)) score += 1;
      }

      // Priority bonus
      const priority = doc.metadata?.priority || doc.priority || 3;
      score += (4 - priority) * PHI_INV;

      if (score > 0) {
        scored.push({ doc, score });
      }
    }

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Collect top documents
    for (const { doc } of scored.slice(0, maxDocs)) {
      const fullDoc = await this.get(doc.project, doc.doc_type || doc.docType);
      if (fullDoc && totalLength + (fullDoc.content?.length || 0) <= maxLength) {
        results.push({
          project: fullDoc.project,
          docType: fullDoc.doc_type || fullDoc.docType,
          content: fullDoc.content,
          digest: fullDoc.digest,
        });
        totalLength += fullDoc.content?.length || 0;
      }
    }

    return {
      documents: results,
      totalLength,
      count: results.length,
    };
  }

  /**
   * Extract snippet around query match
   */
  _extractSnippet(content, query, contextChars = 100) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return content.slice(0, contextChars * 2);

    const start = Math.max(0, index - contextChars);
    const end = Math.min(content.length, index + query.length + contextChars);

    return (start > 0 ? '...' : '') +
      content.slice(start, end) +
      (end < content.length ? '...' : '');
  }

  /**
   * Start auto-refresh timer
   */
  _startAutoRefresh() {
    if (this._refreshTimer) return;

    this._refreshTimer = setInterval(async () => {
      try {
        const results = await this.refresh();
        if (results.loaded > 0) {
          this.emit('refreshed', results);
        }
      } catch (err) {
        console.error('[EcosystemService] Auto-refresh error:', err.message);
      }
    }, this.options.refreshIntervalMs);

    // Don't prevent process exit
    this._refreshTimer.unref?.();
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    this.stopAutoRefresh();
    this._initialized = false;
    this.emit('shutdown');
  }
}

/**
 * Get ecosystem document specifications
 */
export function getEcosystemDocs() {
  return [...ECOSYSTEM_DOCS];
}

export default EcosystemService;
