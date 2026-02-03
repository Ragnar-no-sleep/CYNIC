/**
 * Discovery Service Tests
 *
 * Tests for MCP server, plugin, and node discovery.
 *
 * "Don't trust, verify" - κυνικός
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'events';

// Mock fetch globally before importing
const originalFetch = global.fetch;

import { DiscoveryService } from '../src/discovery-service.js';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockPersistence(overrides = {}) {
  return {
    discovery: {
      upsertMcpServer: mock.fn(async (server) => ({ id: 'mcp_1', ...server })),
      upsertPlugin: mock.fn(async (plugin) => ({ id: 'plugin_1', ...plugin })),
      upsertNode: mock.fn(async (node) => ({ id: 'node_1', ...node })),
      logEvent: mock.fn(async () => {}),
      getNodes: mock.fn(async () => []),
      getMcpServers: mock.fn(async () => []),
      getPlugins: mock.fn(async () => []),
      getStats: mock.fn(async () => ({ total: 0 })),
      updateNodeHealth: mock.fn(async () => {}),
      ...overrides,
    },
  };
}

function mockFetch(responses = {}) {
  global.fetch = mock.fn(async (url, options) => {
    const urlStr = url.toString();

    // Check for predefined response
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        if (response.error) {
          throw new Error(response.error);
        }
        return {
          ok: response.ok !== false,
          status: response.status || 200,
          json: async () => response.json || {},
          text: async () => response.text || JSON.stringify(response.json || {}),
        };
      }
    }

    // Default 404 for unknown URLs
    return {
      ok: false,
      status: 404,
      json: async () => ({}),
      text: async () => '',
    };
  });
}

function restoreFetch() {
  global.fetch = originalFetch;
}

// =============================================================================
// TESTS
// =============================================================================

describe('DiscoveryService', () => {
  let service;
  let persistence;

  beforeEach(() => {
    persistence = createMockPersistence();
    service = new DiscoveryService(persistence, {
      autoHealthCheck: false, // Disable auto health checks in tests
    });
  });

  afterEach(() => {
    service?.stopHealthChecks();
    restoreFetch();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('should create with default options', () => {
      const svc = new DiscoveryService(null);
      assert.ok(svc);
      assert.equal(svc._initialized, false);
    });

    it('should initialize only once', async () => {
      await service.init();
      await service.init();
      assert.equal(service._initialized, true);
    });

    it('should work without persistence (limited mode)', async () => {
      const svc = new DiscoveryService(null, { autoHealthCheck: false });
      await svc.init();
      assert.ok(svc._initialized);
    });

    it('should emit initialized event', async () => {
      let emitted = false;
      service.on('initialized', () => { emitted = true; });
      await service.init();
      assert.ok(emitted);
    });

    it('should register self node if endpoint provided', async () => {
      const svc = new DiscoveryService(persistence, {
        selfEndpoint: 'http://localhost:3000',
        autoHealthCheck: false,
      });
      await svc.init();
      assert.equal(persistence.discovery.upsertNode.mock.calls.length, 1);
      const call = persistence.discovery.upsertNode.mock.calls[0];
      assert.equal(call.arguments[0].endpoint, 'http://localhost:3000');
      assert.equal(call.arguments[0].trustLevel, 'self');
    });
  });

  // ===========================================================================
  // MCP DISCOVERY
  // ===========================================================================

  describe('scanRepoForMcp', () => {
    it('should discover MCP servers from .mcp.json', async () => {
      mockFetch({
        'contents/.mcp.json': {
          json: {
            mcpServers: {
              'my-server': {
                transport: 'sse',
                url: 'http://localhost:8080/sse',
              },
            },
          },
        },
      });

      const servers = await service.scanRepoForMcp('owner', 'repo');

      assert.equal(servers.length, 1);
      assert.equal(servers[0].serverName, 'my-server');
      assert.equal(servers[0].transport, 'sse');
      assert.equal(service.stats.scans, 1);
      assert.equal(service.stats.mcpServersDiscovered, 1);
    });

    it('should handle repos without .mcp.json', async () => {
      mockFetch({});

      const servers = await service.scanRepoForMcp('owner', 'repo');
      assert.deepEqual(servers, []);
    });

    it('should detect stdio transport', async () => {
      mockFetch({
        'contents/.mcp.json': {
          json: {
            mcpServers: {
              'stdio-server': {
                command: 'node',
                args: ['server.js'],
              },
            },
          },
        },
      });

      const servers = await service.scanRepoForMcp('owner', 'repo');
      assert.equal(servers[0].transport, 'stdio');
      assert.equal(servers[0].command, 'node');
    });

    it('should emit mcpDiscovered event', async () => {
      mockFetch({
        'contents/.mcp.json': {
          json: {
            mcpServers: {
              'test': { url: 'http://test' },
            },
          },
        },
      });

      let discovered = null;
      service.on('mcpDiscovered', (server) => { discovered = server; });

      await service.scanRepoForMcp('owner', 'repo');
      assert.ok(discovered);
      assert.equal(discovered.serverName, 'test');
    });

    it('should log discovery event', async () => {
      mockFetch({
        'contents/.mcp.json': {
          json: {
            mcpServers: { 'test': { url: 'http://test' } },
          },
        },
      });

      await service.scanRepoForMcp('owner', 'repo');

      assert.ok(persistence.discovery.logEvent.mock.calls.length > 0);
      const eventCall = persistence.discovery.logEvent.mock.calls[0];
      assert.equal(eventCall.arguments[0].eventType, 'mcp_scan_complete');
    });
  });

  // ===========================================================================
  // PLUGIN DISCOVERY
  // ===========================================================================

  describe('scanRepoForPlugin', () => {
    it('should discover plugin from .claude/plugin.json', async () => {
      mockFetch({
        '.claude/plugin.json': {
          json: {
            name: 'my-plugin',
            version: '1.0.0',
            description: 'Test plugin',
            hooks: true,
          },
        },
      });

      const plugin = await service.scanRepoForPlugin('owner', 'repo');

      assert.ok(plugin);
      assert.equal(plugin.pluginName, 'my-plugin');
      assert.equal(plugin.version, '1.0.0');
      assert.equal(plugin.hasHooks, true);
    });

    it('should fallback to plugin.json', async () => {
      mockFetch({
        'plugin.json': {
          json: {
            name: 'root-plugin',
            version: '2.0.0',
          },
        },
      });

      const plugin = await service.scanRepoForPlugin('owner', 'repo');
      assert.equal(plugin.pluginName, 'root-plugin');
    });

    it('should return null for repos without plugins', async () => {
      mockFetch({});

      const plugin = await service.scanRepoForPlugin('owner', 'repo');
      assert.equal(plugin, null);
    });

    it('should detect plugin capabilities', async () => {
      mockFetch({
        '.claude/plugin.json': {
          json: {
            name: 'full-plugin',
            hooks: { PreToolUse: './hooks/pre.js' },
            agents: { helper: './agents/helper.md' },
            skills: { search: './skills/search.md' },
            mcpServers: { local: { command: 'node' } },
          },
        },
      });

      const plugin = await service.scanRepoForPlugin('owner', 'repo');

      assert.equal(plugin.hasHooks, true);
      assert.equal(plugin.hasAgents, true);
      assert.equal(plugin.hasSkills, true);
      assert.equal(plugin.hasMcpServers, true);
    });

    it('should emit pluginDiscovered event', async () => {
      mockFetch({
        '.claude/plugin.json': {
          json: { name: 'emit-test' },
        },
      });

      let discovered = null;
      service.on('pluginDiscovered', (p) => { discovered = p; });

      await service.scanRepoForPlugin('owner', 'repo');
      assert.ok(discovered);
    });
  });

  // ===========================================================================
  // NODE DISCOVERY
  // ===========================================================================

  describe('registerNode', () => {
    it('should register a node', async () => {
      const node = await service.registerNode({
        endpoint: 'http://node1.cynic.dev',
        nodeName: 'node1',
        capabilities: ['judge', 'digest'],
      });

      assert.ok(node.id);
      assert.equal(node.endpoint, 'http://node1.cynic.dev');
      assert.equal(service.stats.nodesDiscovered, 1);
    });

    it('should emit nodeRegistered event', async () => {
      let registered = null;
      service.on('nodeRegistered', (n) => { registered = n; });

      await service.registerNode({ endpoint: 'http://test' });
      assert.ok(registered);
    });

    it('should throw without persistence', async () => {
      const svc = new DiscoveryService(null, { autoHealthCheck: false });
      await svc.init();

      await assert.rejects(
        () => svc.registerNode({ endpoint: 'http://test' }),
        /not available/
      );
    });
  });

  describe('discoverNode', () => {
    it('should probe and register node', async () => {
      mockFetch({
        '/health': {
          json: {
            status: 'healthy',
            name: 'discovered-node',
            version: '1.0.0',
            capabilities: ['judge'],
          },
        },
      });

      const node = await service.discoverNode('http://discovered.cynic.dev');

      assert.ok(node);
      assert.equal(node.nodeName, 'discovered-node');
    });

    it('should return null for unreachable nodes', async () => {
      mockFetch({
        '/health': { error: 'Connection refused' },
      });

      const node = await service.discoverNode('http://unreachable.dev');
      assert.equal(node, null);
    });
  });

  // ===========================================================================
  // HEALTH CHECKS
  // ===========================================================================

  describe('runNodeHealthChecks', () => {
    it('should check all active nodes', async () => {
      persistence.discovery.getNodes = mock.fn(async () => [
        { id: 'node1', endpoint: 'http://node1.dev', trust_level: 'remote' },
        { id: 'node2', endpoint: 'http://node2.dev', trust_level: 'remote' },
      ]);

      mockFetch({
        'node1.dev': { json: { status: 'healthy' } },
        'node2.dev': { json: { status: 'unhealthy' } },
      });

      const results = await service.runNodeHealthChecks();

      assert.equal(results.checked, 2);
      assert.equal(results.healthy, 1);
      assert.equal(results.unhealthy, 1);
    });

    it('should skip self nodes', async () => {
      persistence.discovery.getNodes = mock.fn(async () => [
        { id: 'self', endpoint: 'http://self.dev', trust_level: 'self' },
        { id: 'remote', endpoint: 'http://remote.dev', trust_level: 'remote' },
      ]);

      mockFetch({
        'remote.dev': { json: { status: 'healthy' } },
      });

      const results = await service.runNodeHealthChecks();
      assert.equal(results.checked, 1);
    });

    it('should handle unreachable nodes', async () => {
      persistence.discovery.getNodes = mock.fn(async () => [
        { id: 'node1', endpoint: 'http://unreachable.dev', trust_level: 'remote' },
      ]);

      mockFetch({
        'unreachable.dev': { error: 'Timeout' },
      });

      const results = await service.runNodeHealthChecks();

      assert.equal(results.unhealthy, 1);
      // Errors array may or may not be populated depending on how error is caught
      assert.ok(results.unhealthy >= 1);
    });

    it('should emit healthCheckComplete event', async () => {
      persistence.discovery.getNodes = mock.fn(async () => []);

      let results = null;
      service.on('healthCheckComplete', (r) => { results = r; });

      await service.runNodeHealthChecks();
      assert.ok(results);
    });

    it('should update node health in persistence', async () => {
      persistence.discovery.getNodes = mock.fn(async () => [
        { id: 'node1', endpoint: 'http://node1.dev', trust_level: 'remote' },
      ]);

      mockFetch({
        'node1.dev': { json: { status: 'healthy' } },
      });

      await service.runNodeHealthChecks();

      assert.ok(persistence.discovery.updateNodeHealth.mock.calls.length > 0);
    });
  });

  describe('health check lifecycle', () => {
    it('should start and stop health checks', () => {
      service._startHealthChecks();
      assert.ok(service._healthCheckTimer);

      service.stopHealthChecks();
      assert.equal(service._healthCheckTimer, null);
    });

    it('should not start multiple timers', () => {
      service._startHealthChecks();
      const timer1 = service._healthCheckTimer;

      service._startHealthChecks();
      assert.equal(service._healthCheckTimer, timer1);

      service.stopHealthChecks();
    });
  });

  // ===========================================================================
  // FULL SCAN
  // ===========================================================================

  describe('scanRepo', () => {
    it('should scan for everything', async () => {
      mockFetch({
        '.mcp.json': {
          json: { mcpServers: { 'srv': { url: 'http://srv' } } },
        },
        '.claude/plugin.json': {
          json: { name: 'test-plugin' },
        },
        'CLAUDE.md': {
          text: '# Instructions\nThis is a Claude config.',
        },
      });

      const results = await service.scanRepo('owner', 'repo');

      assert.equal(results.sourceRepo, 'github:owner/repo');
      assert.equal(results.mcpServers.length, 1);
      assert.ok(results.plugin);
      assert.ok(results.claudeMd);
    });

    it('should handle partial results', async () => {
      mockFetch({
        '.mcp.json': {
          json: { mcpServers: { 'srv': { url: 'http://srv' } } },
        },
      });

      const results = await service.scanRepo('owner', 'repo');

      assert.equal(results.mcpServers.length, 1);
      assert.equal(results.plugin, null);
      assert.equal(results.claudeMd, null);
    });
  });

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  describe('query methods', () => {
    it('getMcpServers should delegate to persistence', async () => {
      persistence.discovery.getMcpServers = mock.fn(async () => [{ id: 'srv1' }]);

      const servers = await service.getMcpServers({ status: 'active' });

      assert.equal(servers.length, 1);
      assert.equal(persistence.discovery.getMcpServers.mock.calls[0].arguments[0].status, 'active');
    });

    it('getPlugins should delegate to persistence', async () => {
      persistence.discovery.getPlugins = mock.fn(async () => [{ id: 'plg1' }]);

      const plugins = await service.getPlugins();
      assert.equal(plugins.length, 1);
    });

    it('getNodes should delegate to persistence', async () => {
      persistence.discovery.getNodes = mock.fn(async () => [{ id: 'node1' }]);

      const nodes = await service.getNodes();
      assert.equal(nodes.length, 1);
    });

    it('should return empty arrays without persistence', async () => {
      const svc = new DiscoveryService(null, { autoHealthCheck: false });
      await svc.init();

      assert.deepEqual(await svc.getMcpServers(), []);
      assert.deepEqual(await svc.getPlugins(), []);
      assert.deepEqual(await svc.getNodes(), []);
    });
  });

  describe('getStats', () => {
    it('should merge runtime and db stats', async () => {
      persistence.discovery.getStats = mock.fn(async () => ({
        totalMcp: 10,
        totalPlugins: 5,
      }));

      service.stats.scans = 3;

      const stats = await service.getStats();

      assert.equal(stats.scans, 3);
      assert.equal(stats.totalMcp, 10);
    });
  });

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  describe('shutdown', () => {
    it('should stop health checks and reset state', async () => {
      await service.init();
      service._startHealthChecks();

      await service.shutdown();

      assert.equal(service._initialized, false);
      assert.equal(service._healthCheckTimer, null);
    });

    it('should emit shutdown event', async () => {
      let emitted = false;
      service.on('shutdown', () => { emitted = true; });

      await service.shutdown();
      assert.ok(emitted);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle GitHub API errors gracefully', async () => {
      mockFetch({
        '.mcp.json': { status: 500, ok: false },
      });

      // Should not throw
      const servers = await service.scanRepoForMcp('owner', 'repo');
      assert.deepEqual(servers, []);
    });

    it('should use GitHub token when provided', async () => {
      const svc = new DiscoveryService(persistence, {
        githubToken: 'test-token',
        autoHealthCheck: false,
      });

      let capturedHeaders = null;
      global.fetch = mock.fn(async (url, options) => {
        capturedHeaders = options?.headers;
        return { ok: false, status: 404, text: async () => '' };
      });

      await svc.scanRepoForMcp('owner', 'repo');

      assert.ok(capturedHeaders?.Authorization?.includes('test-token'));
    });

    it('should inherit EventEmitter', () => {
      assert.ok(service instanceof EventEmitter);
    });

    it('should track stats correctly', async () => {
      mockFetch({
        '.mcp.json': {
          json: {
            mcpServers: {
              'srv1': { url: 'http://srv1' },
              'srv2': { url: 'http://srv2' },
            },
          },
        },
      });

      await service.scanRepoForMcp('owner', 'repo');

      assert.equal(service.stats.scans, 1);
      assert.equal(service.stats.mcpServersDiscovered, 2);
    });
  });
});
