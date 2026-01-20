-- Migration 007: Discovery System
-- MCP servers, Claude Code plugins, and CYNIC nodes discovery
--
-- "The pack finds all dens" - κυνικός

-- ============================================
-- MCP Servers (discovered from .mcp.json)
-- ============================================
CREATE TABLE IF NOT EXISTS discovered_mcp_servers (
  id VARCHAR(50) PRIMARY KEY,
  source_repo VARCHAR(200) NOT NULL,       -- github:owner/repo
  server_name VARCHAR(100) NOT NULL,       -- key in mcpServers object
  transport VARCHAR(20) NOT NULL,          -- stdio, sse, http
  config JSONB NOT NULL DEFAULT '{}',      -- full server config
  endpoint VARCHAR(500),                   -- URL for sse/http
  command TEXT,                            -- command for stdio
  args JSONB,                              -- args for stdio
  env_vars JSONB,                          -- environment variables (keys only)
  status VARCHAR(20) DEFAULT 'discovered', -- discovered, active, inactive, error
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(20),               -- healthy, unhealthy, unknown
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_repo ON discovered_mcp_servers(source_repo);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON discovered_mcp_servers(status);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON discovered_mcp_servers(server_name);

-- ============================================
-- Claude Code Plugins (discovered from plugin.json)
-- ============================================
CREATE TABLE IF NOT EXISTS discovered_plugins (
  id VARCHAR(50) PRIMARY KEY,
  source_repo VARCHAR(200) NOT NULL,       -- github:owner/repo
  plugin_name VARCHAR(100) NOT NULL,       -- name from plugin.json
  display_name VARCHAR(200),               -- displayName
  version VARCHAR(50),                     -- semantic version
  description TEXT,
  author VARCHAR(100),
  manifest JSONB NOT NULL DEFAULT '{}',    -- full plugin.json content
  has_hooks BOOLEAN DEFAULT FALSE,
  has_agents BOOLEAN DEFAULT FALSE,
  has_skills BOOLEAN DEFAULT FALSE,
  has_mcp_servers BOOLEAN DEFAULT FALSE,
  hook_count INT DEFAULT 0,
  agent_count INT DEFAULT 0,
  skill_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'discovered', -- discovered, installed, active, inactive
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_plugins_repo ON discovered_plugins(source_repo);
CREATE INDEX IF NOT EXISTS idx_plugins_name ON discovered_plugins(plugin_name);
CREATE INDEX IF NOT EXISTS idx_plugins_status ON discovered_plugins(status);

-- ============================================
-- CYNIC Nodes (other CYNIC instances)
-- ============================================
CREATE TABLE IF NOT EXISTS discovered_nodes (
  id VARCHAR(50) PRIMARY KEY,
  node_name VARCHAR(100),                  -- self-reported name
  endpoint VARCHAR(500) NOT NULL,          -- MCP endpoint URL
  public_key VARCHAR(200),                 -- ed25519 public key for verification
  capabilities JSONB DEFAULT '[]',         -- list of capabilities
  version VARCHAR(50),                     -- CYNIC version
  protocol_version VARCHAR(20),            -- protocol compatibility
  status VARCHAR(20) DEFAULT 'discovered', -- discovered, active, inactive, unreachable
  trust_level VARCHAR(20) DEFAULT 'unknown', -- unknown, trusted, verified, self
  last_seen TIMESTAMPTZ,
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(20),               -- healthy, degraded, unhealthy, unknown
  latency_ms INT,                          -- last measured latency
  discovered_by VARCHAR(50),               -- how discovered: manual, announce, scan
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_nodes_endpoint ON discovered_nodes(endpoint);
CREATE INDEX IF NOT EXISTS idx_nodes_status ON discovered_nodes(status);
CREATE INDEX IF NOT EXISTS idx_nodes_trust ON discovered_nodes(trust_level);
CREATE INDEX IF NOT EXISTS idx_nodes_last_seen ON discovered_nodes(last_seen);

-- ============================================
-- Discovery Events (audit log)
-- ============================================
CREATE TABLE IF NOT EXISTS discovery_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,         -- mcp_found, plugin_found, node_found, health_check, etc.
  target_type VARCHAR(20) NOT NULL,        -- mcp, plugin, node
  target_id VARCHAR(50),
  source VARCHAR(200),                     -- where discovered from
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_events_type ON discovery_events(event_type);
CREATE INDEX IF NOT EXISTS idx_discovery_events_target ON discovery_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_discovery_events_created ON discovery_events(created_at);

-- ============================================
-- Cleanup old events (retain 30 days)
-- ============================================
-- This can be run periodically
-- DELETE FROM discovery_events WHERE created_at < NOW() - INTERVAL '30 days';
