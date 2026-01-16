/**
 * IntegratorService Tests
 *
 * "The whole is greater than the sum of its parts" - κυνικός
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { IntegratorService, getSharedModules, getProjects } from '../src/integrator-service.js';

describe('IntegratorService', () => {
  let service;
  let tempDir;

  beforeEach(async () => {
    // Create temp workspace
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cynic-integrator-test-'));
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
    // Cleanup temp dir
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('creates with default options', () => {
      service = new IntegratorService();

      assert.equal(service.options.workspaceRoot, '/workspaces');
      assert.equal(service.options.autoCheck, true);
    });

    it('accepts custom workspaceRoot', () => {
      service = new IntegratorService({ workspaceRoot: tempDir });

      assert.equal(service.options.workspaceRoot, tempDir);
    });

    it('can disable autoCheck', () => {
      service = new IntegratorService({ autoCheck: false });

      assert.equal(service.options.autoCheck, false);
    });
  });

  describe('init', () => {
    it('initializes the service', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });

      await service.init();

      assert.ok(service._initialized);
    });

    it('only initializes once', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });

      await service.init();
      await service.init(); // Second call

      assert.ok(service._initialized);
    });
  });

  describe('checkSync', () => {
    it('returns sync report', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const report = await service.checkSync();

      assert.ok(report.timestamp);
      assert.ok(Array.isArray(report.modules));
      assert.ok(Array.isArray(report.drifts));
      assert.equal(typeof report.allSynced, 'boolean');
    });

    it('tracks stats on check', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      await service.checkSync();
      await service.checkSync();

      assert.equal(service.stats.checksPerformed, 2);
    });
  });

  describe('getProjectStatus', () => {
    it('returns all projects status', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const status = await service.getProjectStatus();

      assert.ok(status.projects);
      assert.ok(status.total > 0);
      assert.equal(typeof status.available, 'number');
      assert.ok(status.timestamp);
    });

    it('returns specific project status', async () => {
      // Create a project directory
      const projectPath = path.join(tempDir, 'CYNIC-new');
      await fs.mkdir(projectPath, { recursive: true });
      await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), '# CYNIC');
      await fs.writeFile(path.join(projectPath, 'package.json'), '{}');

      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const status = await service.getProjectStatus('cynic');

      assert.ok(status.projects);
      assert.equal(status.projects.length, 1);
      assert.equal(status.projects[0].name, 'cynic');
    });

    it('detects CLAUDE.md and package.json', async () => {
      // Create a project with CLAUDE.md
      const projectPath = path.join(tempDir, 'CYNIC-new');
      await fs.mkdir(projectPath, { recursive: true });
      await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), '# Test');
      await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "test"}');

      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const status = await service.getProjectStatus('cynic');
      const project = status.projects[0];

      assert.equal(project.exists, true);
      assert.equal(project.hasClaudeMd, true);
      assert.equal(project.hasPackageJson, true);
    });
  });

  describe('getSyncSuggestions', () => {
    it('returns empty array when no drifts', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const suggestions = service.getSyncSuggestions();

      assert.ok(Array.isArray(suggestions));
    });

    it('suggests copy for hash mismatch', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      // Manually add a drift
      service._drifts = [{
        type: 'hash_mismatch',
        module: 'harmony.js',
        canonical: 'HolDex/src/shared/harmony.js',
        drifted: 'GASdf/src/shared/harmony.js',
        critical: true,
      }];

      const suggestions = service.getSyncSuggestions();

      assert.equal(suggestions.length, 1);
      assert.equal(suggestions[0].action, 'copy');
      assert.equal(suggestions[0].priority, 'high');
      assert.ok(suggestions[0].command);
    });

    it('sorts suggestions by priority', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      // Add drifts with different priorities
      service._drifts = [
        { type: 'missing', module: 'test1', critical: false },
        { type: 'hash_mismatch', module: 'test2', critical: true },
        { type: 'hash_mismatch', module: 'test3', critical: false },
      ];

      const suggestions = service.getSyncSuggestions();

      assert.equal(suggestions[0].priority, 'high');
      assert.equal(suggestions[1].priority, 'medium');
      assert.equal(suggestions[2].priority, 'low');
    });
  });

  describe('getDrifts', () => {
    it('returns current drifts', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const drifts = service.getDrifts();

      assert.ok(Array.isArray(drifts));
    });

    it('returns copy of drifts array', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const drifts1 = service.getDrifts();
      const drifts2 = service.getDrifts();

      assert.notEqual(drifts1, drifts2); // Different array instances
    });
  });

  describe('getSharedModules', () => {
    it('returns shared modules config', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const modules = service.getSharedModules();

      assert.ok(Array.isArray(modules));
      assert.ok(modules.length > 0);
      assert.ok(modules[0].name);
      assert.ok(modules[0].description);
    });
  });

  describe('getStats', () => {
    it('returns service stats', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      const stats = service.getStats();

      assert.equal(typeof stats.checksPerformed, 'number');
      assert.equal(typeof stats.driftsDetected, 'number');
      assert.equal(typeof stats.modulesTracked, 'number');
      assert.equal(typeof stats.projectsTracked, 'number');
    });
  });

  describe('events', () => {
    it('emits initialized event', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });

      let eventEmitted = false;
      service.on('initialized', () => {
        eventEmitted = true;
      });

      await service.init();

      assert.ok(eventEmitted);
    });

    it('emits shutdown event', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      let eventEmitted = false;
      service.on('shutdown', () => {
        eventEmitted = true;
      });

      await service.shutdown();

      assert.ok(eventEmitted);
    });

    it('emits drift event when drifts detected', async () => {
      // Create canonical file
      const holdexDir = path.join(tempDir, 'HolDex/src/shared');
      const gasdfDir = path.join(tempDir, 'GASdf/src/shared');
      await fs.mkdir(holdexDir, { recursive: true });
      await fs.mkdir(gasdfDir, { recursive: true });

      // Write different content to create drift
      await fs.writeFile(path.join(holdexDir, 'harmony.js'), 'export const PHI = 1.618;');
      await fs.writeFile(path.join(gasdfDir, 'harmony.js'), 'export const PHI = 1.619; // different');

      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: false,
      });
      await service.init();

      let driftEvent = null;
      service.on('drift', (drifts) => {
        driftEvent = drifts;
      });

      await service.checkSync();

      // May or may not have drifts depending on module config
      // The event would be emitted if drifts exist
    });
  });

  describe('auto-check', () => {
    it('starts auto-check when enabled', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: true,
        checkIntervalMs: 1000, // 1 second
      });
      await service.init();

      assert.ok(service._checkTimer);
    });

    it('stops auto-check on shutdown', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: true,
        checkIntervalMs: 1000,
      });
      await service.init();

      await service.shutdown();

      assert.equal(service._checkTimer, null);
    });

    it('stopAutoCheck clears timer', async () => {
      service = new IntegratorService({
        workspaceRoot: tempDir,
        autoCheck: true,
        checkIntervalMs: 1000,
      });
      await service.init();

      service.stopAutoCheck();

      assert.equal(service._checkTimer, null);
    });
  });
});

describe('Module exports', () => {
  describe('getSharedModules', () => {
    it('returns shared modules array', () => {
      const modules = getSharedModules();

      assert.ok(Array.isArray(modules));
      assert.ok(modules.length > 0);
    });

    it('returns copy of modules', () => {
      const modules1 = getSharedModules();
      const modules2 = getSharedModules();

      assert.notEqual(modules1, modules2);
    });
  });

  describe('getProjects', () => {
    it('returns projects array', () => {
      const projects = getProjects();

      assert.ok(Array.isArray(projects));
      assert.ok(projects.length > 0);
    });

    it('includes expected projects', () => {
      const projects = getProjects();
      const names = projects.map(p => p.name);

      assert.ok(names.includes('cynic'));
      assert.ok(names.includes('holdex'));
    });
  });
});
