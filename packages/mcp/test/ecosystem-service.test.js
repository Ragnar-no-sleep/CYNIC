/**
 * EcosystemService Tests
 *
 * "The pack knows all territories" - κυνικός
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EcosystemService, getEcosystemDocs } from '../src/ecosystem-service.js';

describe('EcosystemService', () => {
  let service;

  beforeEach(() => {
    // Create service in memory-only mode (no persistence)
    service = new EcosystemService(null, {
      workspaceRoot: '/workspaces',
      autoRefresh: false,
    });
  });

  describe('initialization', () => {
    it('initializes in memory-only mode without persistence', async () => {
      await service.init();
      assert.ok(service._initialized);
      assert.ok(service._memoryCache instanceof Map);
    });

    it('only initializes once', async () => {
      await service.init();
      await service.init();
      assert.ok(service._initialized);
    });
  });

  describe('getEcosystemDocs', () => {
    it('returns document specifications', () => {
      const docs = getEcosystemDocs();
      assert.ok(Array.isArray(docs));
      assert.ok(docs.length > 0);

      // Check structure
      const doc = docs[0];
      assert.ok(doc.project);
      assert.ok(doc.docType);
      assert.ok(doc.path);
      assert.ok(typeof doc.priority === 'number');
    });

    it('includes CLAUDE.md files for all projects', () => {
      const docs = getEcosystemDocs();
      const claudeMdDocs = docs.filter(d => d.docType === 'claude_md');
      assert.ok(claudeMdDocs.length >= 5); // At least 5 projects

      const projects = claudeMdDocs.map(d => d.project);
      assert.ok(projects.includes('cynic'));
      assert.ok(projects.includes('holdex'));
      assert.ok(projects.includes('gasdf'));
    });
  });

  describe('memory-only mode operations', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('get returns null for non-existent doc', async () => {
      const doc = await service.get('nonexistent', 'test');
      assert.equal(doc, null);
    });

    it('list returns empty array initially', async () => {
      const docs = await service.list();
      assert.ok(Array.isArray(docs));
      assert.equal(docs.length, 0);
    });

    it('search returns empty results initially', async () => {
      const results = await service.search('test');
      assert.ok(Array.isArray(results));
      assert.equal(results.length, 0);
    });
  });

  describe('getContextFor', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('returns empty context when no docs loaded', async () => {
      const context = await service.getContextFor('test cynic');
      assert.ok(context.documents);
      assert.equal(context.documents.length, 0);
      assert.equal(context.count, 0);
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await service.init();
    });

    it('tracks initial stats', async () => {
      const stats = await service.getStats();
      assert.ok(stats);
      assert.equal(stats.loadCount, 0);
      assert.equal(stats.refreshCount, 0);
      assert.equal(stats.memoryOnly, true);
    });

    it('increments hit count on get', async () => {
      await service.get('test', 'test');
      const stats = await service.getStats();
      assert.equal(stats.hitCount, 1);
    });

    it('increments search count on search', async () => {
      await service.search('test');
      const stats = await service.getStats();
      assert.equal(stats.searchCount, 1);
    });
  });

  describe('auto-refresh', () => {
    it('does not start auto-refresh when disabled', async () => {
      await service.init();
      assert.equal(service._refreshTimer, null);
    });

    it('starts auto-refresh when enabled with persistence', async () => {
      const mockPersistence = {
        ecosystemDocs: {
          get: async () => null,
          getAll: async () => [],
          hasChanged: async () => false,
        },
      };
      const serviceWithRefresh = new EcosystemService(mockPersistence, {
        autoRefresh: true,
        refreshIntervalMs: 1000,
      });

      await serviceWithRefresh.init();
      assert.ok(serviceWithRefresh._refreshTimer !== null);

      // Cleanup
      serviceWithRefresh.stopAutoRefresh();
      assert.equal(serviceWithRefresh._refreshTimer, null);
    });
  });

  describe('shutdown', () => {
    it('cleans up on shutdown', async () => {
      await service.init();
      await service.shutdown();
      assert.equal(service._initialized, false);
      assert.equal(service._refreshTimer, null);
    });
  });
});

describe('EcosystemService with mock persistence', () => {
  let service;
  let mockDocs;
  let mockPersistence;

  beforeEach(() => {
    mockDocs = [
      {
        project: 'cynic',
        doc_type: 'claude_md',
        file_path: 'CYNIC-new/CLAUDE.md',
        content: '# CYNIC Instructions\n\nTest content about CYNIC project.',
        digest: 'Test digest',
        metadata: { priority: 1 },
      },
      {
        project: 'holdex',
        doc_type: 'claude_md',
        file_path: 'HolDex/CLAUDE.md',
        content: '# HolDex Instructions\n\nTest content about HolDex and K-Score.',
        digest: null,
        metadata: { priority: 1 },
      },
    ];

    mockPersistence = {
      ecosystemDocs: {
        get: async (project, docType) => mockDocs.find(d => d.project === project && d.doc_type === docType) || null,
        getByProject: async (project) => mockDocs.filter(d => d.project === project),
        getAll: async () => mockDocs,
        search: async (query, options = {}) => {
          const results = mockDocs
            .filter(d => d.content.toLowerCase().includes(query.toLowerCase()))
            .map(d => ({
              project: d.project,
              docType: d.doc_type,
              snippet: d.content.slice(0, 100),
            }));
          return results.slice(0, options.limit || 10);
        },
        hasChanged: async () => true,
        upsert: async (doc) => doc,
        getStats: async () => ({ total_docs: mockDocs.length }),
      },
    };

    service = new EcosystemService(mockPersistence, {
      autoRefresh: false,
    });
  });

  describe('get', () => {
    it('retrieves document by project and docType', async () => {
      const doc = await service.get('cynic', 'claude_md');
      assert.ok(doc);
      assert.equal(doc.project, 'cynic');
      assert.equal(doc.doc_type, 'claude_md');
      assert.ok(doc.content.includes('CYNIC'));
    });

    it('returns null for non-existent document', async () => {
      const doc = await service.get('nonexistent', 'test');
      assert.equal(doc, null);
    });
  });

  describe('getByProject', () => {
    it('retrieves all documents for a project', async () => {
      const docs = await service.getByProject('cynic');
      assert.ok(Array.isArray(docs));
      assert.equal(docs.length, 1);
      assert.equal(docs[0].project, 'cynic');
    });
  });

  describe('search', () => {
    it('finds documents matching query', async () => {
      const results = await service.search('CYNIC');
      assert.ok(results.length > 0);
      assert.ok(results.some(r => r.project === 'cynic'));
    });

    it('finds documents with K-Score mention', async () => {
      const results = await service.search('K-Score');
      assert.ok(results.length > 0);
      assert.ok(results.some(r => r.project === 'holdex'));
    });

    it('returns empty for no matches', async () => {
      const results = await service.search('nonexistent-term-xyz');
      assert.equal(results.length, 0);
    });
  });

  describe('list', () => {
    it('returns all documents', async () => {
      const docs = await service.list();
      assert.equal(docs.length, 2);
    });
  });

  describe('getContextFor', () => {
    it('returns relevant documents for context', async () => {
      const context = await service.getContextFor('cynic project');
      assert.ok(context.documents);
      assert.ok(context.count >= 0);
      assert.ok(typeof context.totalLength === 'number');
    });
  });

  describe('statistics', () => {
    it('includes persistence stats', async () => {
      const stats = await service.getStats();
      assert.ok(stats);
      assert.equal(stats.total_docs, 2);
      assert.equal(stats.memoryOnly, false);
    });
  });
});
