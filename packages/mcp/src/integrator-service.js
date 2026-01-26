/**
 * Integrator Service
 *
 * Cross-project synchronization and drift detection for the $ASDFASDFA ecosystem.
 * Tracks shared modules and ensures consistency across projects.
 *
 * "The whole is greater than the sum of its parts" - κυνικός
 *
 * @module @cynic/mcp/integrator-service
 */

'use strict';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { createLogger } from '@cynic/core';

const log = createLogger('IntegratorService');

const PHI_INV = 0.618033988749895;

/**
 * Shared module definitions
 * Modules that should stay synchronized across projects
 */
const SHARED_MODULES = [
  {
    name: 'harmony.js',
    description: 'φ formulas and calculations',
    canonical: 'HolDex/src/shared/harmony.js',
    mirrors: [
      'GASdf/src/shared/harmony.js',
      'asdf-brain/src/shared/harmony.js',
    ],
    critical: true,
  },
  {
    name: 'phi-constants',
    description: 'Golden ratio constants',
    canonical: 'CYNIC-new/packages/core/src/constants.js',
    patterns: ['**/constants.js', '**/phi.js'],
    checkExports: ['PHI', 'PHI_INV', 'PHI_INV_2'],
  },
  {
    name: 'judge-types',
    description: 'Judgment result types',
    canonical: 'CYNIC-new/packages/core/src/types.js',
    checkExports: ['Verdict', 'JudgmentResult'],
  },
];

/**
 * Project definitions
 */
const PROJECTS = [
  { name: 'cynic', path: 'CYNIC-new', type: 'core' },
  { name: 'holdex', path: 'HolDex', type: 'app' },
  { name: 'gasdf', path: 'GASdf', type: 'app' },
  { name: 'asdf-brain', path: 'asdf-brain', type: 'service' },
  { name: 'ecosystem', path: 'asdfasdfa-ecosystem', type: 'meta' },
];

/**
 * Hash file content using SHA-256
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extract exports from JavaScript file content
 */
function extractExports(content) {
  const exports = new Set();

  // Match: export { name1, name2 }
  const namedExports = content.match(/export\s*\{([^}]+)\}/g) || [];
  for (const match of namedExports) {
    const names = match.replace(/export\s*\{|\}/g, '').split(',');
    for (const name of names) {
      const clean = name.trim().split(/\s+as\s+/)[0].trim();
      if (clean) exports.add(clean);
    }
  }

  // Match: export const/let/var/function/class name
  const directExports = content.match(/export\s+(const|let|var|function|class)\s+(\w+)/g) || [];
  for (const match of directExports) {
    const name = match.split(/\s+/).pop();
    if (name) exports.add(name);
  }

  // Match: export default
  if (/export\s+default/.test(content)) {
    exports.add('default');
  }

  return [...exports];
}

/**
 * Integrator Service
 *
 * Monitors and synchronizes shared code across projects
 */
export class IntegratorService extends EventEmitter {
  /**
   * @param {Object} [options] - Options
   */
  constructor(options = {}) {
    super();

    this.options = {
      workspaceRoot: options.workspaceRoot || '/workspaces',
      autoCheck: options.autoCheck !== false,
      checkIntervalMs: options.checkIntervalMs || 61800 * 100, // φ × 100 seconds
      ...options,
    };

    this._initialized = false;
    this._checkTimer = null;
    this._lastCheck = null;

    // Cache of file states
    this._fileStates = new Map();

    // Detected drifts
    this._drifts = [];

    // Stats
    this.stats = {
      checksPerformed: 0,
      driftsDetected: 0,
      syncsTriggered: 0,
      lastCheckTime: null,
    };
  }

  /**
   * Initialize the service
   */
  async init() {
    if (this._initialized) return;

    // Scan all projects for initial state
    await this._scanProjects();

    this._initialized = true;
    this.emit('initialized');

    // Start auto-check if enabled
    if (this.options.autoCheck) {
      this._startAutoCheck();
    }
  }

  /**
   * Check synchronization status of all shared modules
   * @returns {Promise<Object>} Sync status report
   */
  async checkSync() {
    await this.init();

    const report = {
      timestamp: Date.now(),
      modules: [],
      drifts: [],
      allSynced: true,
    };

    for (const module of SHARED_MODULES) {
      const moduleStatus = await this._checkModule(module);
      report.modules.push(moduleStatus);

      if (!moduleStatus.synced) {
        report.allSynced = false;
        report.drifts.push(...moduleStatus.drifts);
      }
    }

    this.stats.checksPerformed++;
    this.stats.lastCheckTime = new Date();
    this._lastCheck = report;
    this._drifts = report.drifts;

    if (report.drifts.length > 0) {
      this.stats.driftsDetected += report.drifts.length;
      this.emit('drift', report.drifts);
    }

    return report;
  }

  /**
   * Check a specific module for sync status
   * @private
   */
  async _checkModule(module) {
    const status = {
      name: module.name,
      description: module.description,
      synced: true,
      canonical: null,
      mirrors: [],
      drifts: [],
    };

    // Get canonical file state
    if (module.canonical) {
      const canonicalPath = path.join(this.options.workspaceRoot, module.canonical);
      try {
        const content = await fs.readFile(canonicalPath, 'utf-8');
        const hash = hashContent(content);
        const exports = extractExports(content);

        status.canonical = {
          path: module.canonical,
          hash: hash.slice(0, 16),
          exports: exports.slice(0, 10),
          size: content.length,
        };

        // Check mirrors
        for (const mirrorPath of module.mirrors || []) {
          const fullPath = path.join(this.options.workspaceRoot, mirrorPath);
          try {
            const mirrorContent = await fs.readFile(fullPath, 'utf-8');
            const mirrorHash = hashContent(mirrorContent);

            const mirrorStatus = {
              path: mirrorPath,
              hash: mirrorHash.slice(0, 16),
              synced: hash === mirrorHash,
            };

            status.mirrors.push(mirrorStatus);

            if (!mirrorStatus.synced) {
              status.synced = false;
              status.drifts.push({
                type: 'hash_mismatch',
                module: module.name,
                canonical: module.canonical,
                drifted: mirrorPath,
                canonicalHash: hash.slice(0, 16),
                driftedHash: mirrorHash.slice(0, 16),
                critical: module.critical || false,
              });
            }
          } catch (err) {
            if (err.code === 'ENOENT') {
              status.mirrors.push({
                path: mirrorPath,
                status: 'missing',
                synced: false,
              });
              status.synced = false;
              status.drifts.push({
                type: 'missing',
                module: module.name,
                canonical: module.canonical,
                drifted: mirrorPath,
                critical: module.critical || false,
              });
            }
          }
        }

        // Check required exports
        if (module.checkExports) {
          const missingExports = module.checkExports.filter(e => !exports.includes(e));
          if (missingExports.length > 0) {
            status.drifts.push({
              type: 'missing_exports',
              module: module.name,
              path: module.canonical,
              missing: missingExports,
            });
          }
        }
      } catch (err) {
        if (err.code === 'ENOENT') {
          status.canonical = { path: module.canonical, status: 'missing' };
          status.synced = false;
        }
      }
    }

    return status;
  }

  /**
   * Get project status
   * @param {string} [projectName] - Specific project or all
   * @returns {Promise<Object>} Project status
   */
  async getProjectStatus(projectName) {
    await this.init();

    const projects = projectName
      ? PROJECTS.filter(p => p.name === projectName)
      : PROJECTS;

    const results = [];

    for (const project of projects) {
      const projectPath = path.join(this.options.workspaceRoot, project.path);

      try {
        await fs.access(projectPath);

        // Check for key files
        const hasClaudeMd = await this._fileExists(path.join(projectPath, 'CLAUDE.md'));
        const hasPackageJson = await this._fileExists(path.join(projectPath, 'package.json'));

        // Get git status if available
        let gitStatus = null;
        try {
          const gitDir = path.join(projectPath, '.git');
          await fs.access(gitDir);
          gitStatus = 'available';
        } catch {
          gitStatus = 'not_a_repo';
        }

        results.push({
          name: project.name,
          path: project.path,
          type: project.type,
          exists: true,
          hasClaudeMd,
          hasPackageJson,
          gitStatus,
        });
      } catch {
        results.push({
          name: project.name,
          path: project.path,
          type: project.type,
          exists: false,
        });
      }
    }

    return {
      projects: results,
      total: results.length,
      available: results.filter(p => p.exists).length,
      timestamp: Date.now(),
    };
  }

  /**
   * Suggest sync actions for detected drifts
   * @returns {Object[]} Suggested sync actions
   */
  getSyncSuggestions() {
    const suggestions = [];

    for (const drift of this._drifts) {
      if (drift.type === 'hash_mismatch') {
        suggestions.push({
          action: 'copy',
          priority: drift.critical ? 'high' : 'medium',
          from: drift.canonical,
          to: drift.drifted,
          reason: `${drift.module} has diverged - copy canonical to restore sync`,
          command: `cp "${drift.canonical}" "${drift.drifted}"`,
        });
      } else if (drift.type === 'missing') {
        suggestions.push({
          action: 'copy',
          priority: drift.critical ? 'high' : 'low',
          from: drift.canonical,
          to: drift.drifted,
          reason: `${drift.module} missing in mirror location`,
          command: `cp "${drift.canonical}" "${drift.drifted}"`,
        });
      } else if (drift.type === 'missing_exports') {
        suggestions.push({
          action: 'review',
          priority: 'medium',
          file: drift.path,
          reason: `${drift.module} missing exports: ${drift.missing.join(', ')}`,
          command: null,
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
  }

  /**
   * Get current drifts
   * @returns {Object[]} Current drifts
   */
  getDrifts() {
    return [...this._drifts];
  }

  /**
   * Get shared modules configuration
   * @returns {Object[]} Shared modules
   */
  getSharedModules() {
    return SHARED_MODULES.map(m => ({
      name: m.name,
      description: m.description,
      canonical: m.canonical,
      mirrorsCount: (m.mirrors || []).length,
      critical: m.critical || false,
    }));
  }

  /**
   * Get service statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      ...this.stats,
      currentDrifts: this._drifts.length,
      modulesTracked: SHARED_MODULES.length,
      projectsTracked: PROJECTS.length,
      autoCheck: this.options.autoCheck,
      checkIntervalMs: this.options.checkIntervalMs,
    };
  }

  /**
   * Check if file exists
   * @private
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scan all projects for initial state
   * @private
   */
  async _scanProjects() {
    for (const project of PROJECTS) {
      const projectPath = path.join(this.options.workspaceRoot, project.path);
      try {
        await fs.access(projectPath);
        this._fileStates.set(project.name, { exists: true, scannedAt: Date.now() });
      } catch {
        this._fileStates.set(project.name, { exists: false, scannedAt: Date.now() });
      }
    }
  }

  /**
   * Start auto-check timer
   * @private
   */
  _startAutoCheck() {
    if (this._checkTimer) return;

    this._checkTimer = setInterval(async () => {
      try {
        const report = await this.checkSync();
        if (report.drifts.length > 0) {
          log.warn('Detected drifts', { count: report.drifts.length });
        }
      } catch (err) {
        log.error('Auto-check error', { error: err.message });
      }
    }, this.options.checkIntervalMs);

    this._checkTimer.unref?.();
  }

  /**
   * Stop auto-check
   */
  stopAutoCheck() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    this.stopAutoCheck();
    this._initialized = false;
    this.emit('shutdown');
  }
}

/**
 * Get shared modules configuration
 */
export function getSharedModules() {
  return [...SHARED_MODULES];
}

/**
 * Get project definitions
 */
export function getProjects() {
  return [...PROJECTS];
}

export default IntegratorService;
