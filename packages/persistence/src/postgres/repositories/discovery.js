/**
 * Discovery Repository
 *
 * Manages discovered MCP servers, plugins, and CYNIC nodes.
 *
 * "The pack finds all dens" - κυνικός
 *
 * @module @cynic/persistence/repositories/discovery
 */

'use strict';

import crypto from 'crypto';

/**
 * Generate discovery ID
 * @param {string} type - Type prefix (mcp, plugin, node)
 * @param {string} identifier - Unique identifier
 * @returns {string} Generated ID
 */
function generateId(type, identifier) {
  const hash = crypto.createHash('sha256')
    .update(identifier)
    .digest('hex')
    .slice(0, 12);
  return `${type}_${hash}`;
}

/**
 * Discovery Repository
 */
export class DiscoveryRepository {
  /**
   * @param {import('pg').Pool} pool - PostgreSQL pool
   */
  constructor(pool) {
    this.pool = pool;
  }

  // ============================================
  // MCP SERVERS
  // ============================================

  /**
   * Upsert an MCP server
   * @param {Object} server - Server data
   * @returns {Promise<Object>} Stored server
   */
  async upsertMcpServer(server) {
    const {
      sourceRepo,
      serverName,
      transport,
      config = {},
      endpoint = null,
      command = null,
      args = null,
      envVars = null,
      status = 'discovered',
      metadata = {},
    } = server;

    const id = generateId('mcp', `${sourceRepo}:${serverName}`);

    const result = await this.pool.query(
      `INSERT INTO discovered_mcp_servers
       (id, source_repo, server_name, transport, config, endpoint, command, args, env_vars, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         transport = EXCLUDED.transport,
         config = EXCLUDED.config,
         endpoint = EXCLUDED.endpoint,
         command = EXCLUDED.command,
         args = EXCLUDED.args,
         env_vars = EXCLUDED.env_vars,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [id, sourceRepo, serverName, transport, config, endpoint, command, args, envVars, status, metadata]
    );

    return result.rows[0];
  }

  /**
   * Get MCP server by ID
   * @param {string} id - Server ID
   * @returns {Promise<Object|null>} Server or null
   */
  async getMcpServer(id) {
    const result = await this.pool.query(
      `SELECT * FROM discovered_mcp_servers WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all MCP servers
   * @param {Object} [options] - Filter options
   * @returns {Promise<Object[]>} Servers
   */
  async getMcpServers(options = {}) {
    const { status, sourceRepo, limit = 100 } = options;
    let sql = 'SELECT * FROM discovered_mcp_servers WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (sourceRepo) {
      params.push(sourceRepo);
      sql += ` AND source_repo = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY discovered_at DESC LIMIT $${params.length}`;

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Update MCP server health
   * @param {string} id - Server ID
   * @param {string} healthStatus - Health status
   * @returns {Promise<boolean>} Success
   */
  async updateMcpHealth(id, healthStatus) {
    const result = await this.pool.query(
      `UPDATE discovered_mcp_servers
       SET health_status = $2, last_health_check = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id, healthStatus]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete MCP server
   * @param {string} id - Server ID
   * @returns {Promise<boolean>} Success
   */
  async deleteMcpServer(id) {
    const result = await this.pool.query(
      `DELETE FROM discovered_mcp_servers WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  // ============================================
  // PLUGINS
  // ============================================

  /**
   * Upsert a plugin
   * @param {Object} plugin - Plugin data
   * @returns {Promise<Object>} Stored plugin
   */
  async upsertPlugin(plugin) {
    const {
      sourceRepo,
      pluginName,
      displayName = null,
      version = null,
      description = null,
      author = null,
      manifest = {},
      hasHooks = false,
      hasAgents = false,
      hasSkills = false,
      hasMcpServers = false,
      hookCount = 0,
      agentCount = 0,
      skillCount = 0,
      status = 'discovered',
      metadata = {},
    } = plugin;

    const id = generateId('plugin', `${sourceRepo}:${pluginName}`);

    const result = await this.pool.query(
      `INSERT INTO discovered_plugins
       (id, source_repo, plugin_name, display_name, version, description, author, manifest,
        has_hooks, has_agents, has_skills, has_mcp_servers,
        hook_count, agent_count, skill_count, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         version = EXCLUDED.version,
         description = EXCLUDED.description,
         author = EXCLUDED.author,
         manifest = EXCLUDED.manifest,
         has_hooks = EXCLUDED.has_hooks,
         has_agents = EXCLUDED.has_agents,
         has_skills = EXCLUDED.has_skills,
         has_mcp_servers = EXCLUDED.has_mcp_servers,
         hook_count = EXCLUDED.hook_count,
         agent_count = EXCLUDED.agent_count,
         skill_count = EXCLUDED.skill_count,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [id, sourceRepo, pluginName, displayName, version, description, author, manifest,
       hasHooks, hasAgents, hasSkills, hasMcpServers,
       hookCount, agentCount, skillCount, status, metadata]
    );

    return result.rows[0];
  }

  /**
   * Get plugin by ID
   * @param {string} id - Plugin ID
   * @returns {Promise<Object|null>} Plugin or null
   */
  async getPlugin(id) {
    const result = await this.pool.query(
      `SELECT * FROM discovered_plugins WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all plugins
   * @param {Object} [options] - Filter options
   * @returns {Promise<Object[]>} Plugins
   */
  async getPlugins(options = {}) {
    const { status, sourceRepo, hasHooks, hasAgents, limit = 100 } = options;
    let sql = 'SELECT * FROM discovered_plugins WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (sourceRepo) {
      params.push(sourceRepo);
      sql += ` AND source_repo = $${params.length}`;
    }
    if (hasHooks !== undefined) {
      params.push(hasHooks);
      sql += ` AND has_hooks = $${params.length}`;
    }
    if (hasAgents !== undefined) {
      params.push(hasAgents);
      sql += ` AND has_agents = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY discovered_at DESC LIMIT $${params.length}`;

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Delete plugin
   * @param {string} id - Plugin ID
   * @returns {Promise<boolean>} Success
   */
  async deletePlugin(id) {
    const result = await this.pool.query(
      `DELETE FROM discovered_plugins WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  // ============================================
  // NODES
  // ============================================

  /**
   * Upsert a CYNIC node
   * @param {Object} node - Node data
   * @returns {Promise<Object>} Stored node
   */
  async upsertNode(node) {
    const {
      endpoint,
      nodeName = null,
      publicKey = null,
      capabilities = [],
      version = null,
      protocolVersion = null,
      status = 'discovered',
      trustLevel = 'unknown',
      discoveredBy = 'manual',
      metadata = {},
    } = node;

    const id = generateId('node', endpoint);

    const result = await this.pool.query(
      `INSERT INTO discovered_nodes
       (id, endpoint, node_name, public_key, capabilities, version, protocol_version,
        status, trust_level, discovered_by, last_seen, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
       ON CONFLICT (id) DO UPDATE SET
         node_name = COALESCE(EXCLUDED.node_name, discovered_nodes.node_name),
         public_key = COALESCE(EXCLUDED.public_key, discovered_nodes.public_key),
         capabilities = EXCLUDED.capabilities,
         version = EXCLUDED.version,
         protocol_version = EXCLUDED.protocol_version,
         status = EXCLUDED.status,
         trust_level = CASE
           WHEN discovered_nodes.trust_level = 'verified' THEN 'verified'
           ELSE EXCLUDED.trust_level
         END,
         last_seen = NOW(),
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [id, endpoint, nodeName, publicKey, JSON.stringify(capabilities), version, protocolVersion,
       status, trustLevel, discoveredBy, metadata]
    );

    return result.rows[0];
  }

  /**
   * Get node by ID
   * @param {string} id - Node ID
   * @returns {Promise<Object|null>} Node or null
   */
  async getNode(id) {
    const result = await this.pool.query(
      `SELECT * FROM discovered_nodes WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get node by endpoint
   * @param {string} endpoint - Node endpoint URL
   * @returns {Promise<Object|null>} Node or null
   */
  async getNodeByEndpoint(endpoint) {
    const result = await this.pool.query(
      `SELECT * FROM discovered_nodes WHERE endpoint = $1`,
      [endpoint]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all nodes
   * @param {Object} [options] - Filter options
   * @returns {Promise<Object[]>} Nodes
   */
  async getNodes(options = {}) {
    const { status, trustLevel, limit = 100 } = options;
    let sql = 'SELECT * FROM discovered_nodes WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (trustLevel) {
      params.push(trustLevel);
      sql += ` AND trust_level = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY last_seen DESC NULLS LAST LIMIT $${params.length}`;

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Update node health
   * @param {string} id - Node ID
   * @param {Object} health - Health data
   * @returns {Promise<boolean>} Success
   */
  async updateNodeHealth(id, health) {
    const { status, healthStatus, latencyMs } = health;

    const result = await this.pool.query(
      `UPDATE discovered_nodes
       SET status = COALESCE($2, status),
           health_status = $3,
           latency_ms = $4,
           last_health_check = NOW(),
           last_seen = CASE WHEN $3 = 'healthy' THEN NOW() ELSE last_seen END,
           updated_at = NOW()
       WHERE id = $1`,
      [id, status, healthStatus, latencyMs]
    );
    return result.rowCount > 0;
  }

  /**
   * Update node trust level
   * @param {string} id - Node ID
   * @param {string} trustLevel - Trust level
   * @returns {Promise<boolean>} Success
   */
  async updateNodeTrust(id, trustLevel) {
    const result = await this.pool.query(
      `UPDATE discovered_nodes
       SET trust_level = $2, updated_at = NOW()
       WHERE id = $1`,
      [id, trustLevel]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete node
   * @param {string} id - Node ID
   * @returns {Promise<boolean>} Success
   */
  async deleteNode(id) {
    const result = await this.pool.query(
      `DELETE FROM discovered_nodes WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  // ============================================
  // EVENTS
  // ============================================

  /**
   * Log discovery event
   * @param {Object} event - Event data
   * @returns {Promise<Object>} Logged event
   */
  async logEvent(event) {
    const { eventType, targetType, targetId = null, source = null, details = {} } = event;

    const result = await this.pool.query(
      `INSERT INTO discovery_events (event_type, target_type, target_id, source, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [eventType, targetType, targetId, source, details]
    );

    return result.rows[0];
  }

  /**
   * Get recent events
   * @param {Object} [options] - Filter options
   * @returns {Promise<Object[]>} Events
   */
  async getEvents(options = {}) {
    const { eventType, targetType, limit = 50 } = options;
    let sql = 'SELECT * FROM discovery_events WHERE 1=1';
    const params = [];

    if (eventType) {
      params.push(eventType);
      sql += ` AND event_type = $${params.length}`;
    }
    if (targetType) {
      params.push(targetType);
      sql += ` AND target_type = $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  // ============================================
  // STATS
  // ============================================

  /**
   * Get discovery statistics
   * @returns {Promise<Object>} Stats
   */
  async getStats() {
    const result = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM discovered_mcp_servers) as mcp_servers,
        (SELECT COUNT(*) FROM discovered_mcp_servers WHERE status = 'active') as active_mcp_servers,
        (SELECT COUNT(*) FROM discovered_plugins) as plugins,
        (SELECT COUNT(*) FROM discovered_plugins WHERE status = 'active') as active_plugins,
        (SELECT COUNT(*) FROM discovered_nodes) as nodes,
        (SELECT COUNT(*) FROM discovered_nodes WHERE status = 'active') as active_nodes,
        (SELECT COUNT(*) FROM discovered_nodes WHERE trust_level = 'verified') as verified_nodes,
        (SELECT COUNT(*) FROM discovery_events WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h
    `);

    return result.rows[0];
  }
}

export default DiscoveryRepository;
