# CYNIC Boot Sequence

> "The pack awakens as one" - kunikos

This document describes how CYNIC MCP Server boots, discovers components, and manages their lifecycle.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    bin/mcp.js (Entry)                        │
│  1. validateStartupConfig()                                  │
│  2. logConfigStatus()                                        │
│  3. bootMCP() → bootCYNIC()                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 @cynic/core/boot/index.js                    │
│                                                              │
│  bootMCP(options)                                            │
│    1. registerMCPProviders() ← providers/mcp.js              │
│    2. bootCYNIC({ exclude: ['node', 'transport'] })          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     bootCYNIC(options)                       │
│                                                              │
│  1. registerStandardProviders()                              │
│  2. discoverComponents(context)                              │
│  3. Register to BootManager                                  │
│  4. bootManager.boot() → resolve deps → init → start         │
│  5. Return handle { get, health, shutdown }                  │
└─────────────────────────────────────────────────────────────┘
```

## Boot Phases

### Phase 1: Configuration Validation

**File:** `packages/mcp/bin/mcp.js`

```javascript
validateStartupConfig();  // Fails fast if critical config missing
logConfigStatus();        // Shows what's configured
```

Required environment variables:
- `MCP_MODE` - Transport mode: `stdio` (default) or `http`
- `PORT` - HTTP port (default: 3000, only for http mode)

Optional but recommended:
- `CYNIC_DATABASE_URL` - PostgreSQL connection string
- `CYNIC_REDIS_URL` - Redis connection string
- `CYNIC_VERBOSE` - Enable verbose logging

### Phase 2: Provider Registration

**File:** `packages/core/src/boot/discovery.js`

Standard providers registered:
1. `config` - Environment configuration (no deps)
2. `logger` - Logging system (deps: config)
3. `postgres` - PostgreSQL client (deps: config, logger)
4. `redis` - Redis client (deps: config, logger)
5. `engines` - Philosophy engine registry (deps: config, logger)
6. `judge` - CYNIC Judge (deps: config, postgres, redis, engines)

**File:** `packages/core/src/boot/providers/mcp.js`

MCP-specific providers:
7. `migrations` - Database migrations (deps: config)
8. `mcp-server` - MCP Server instance (deps: config, migrations, engines)

### Phase 3: Component Discovery

**File:** `packages/core/src/boot/discovery.js`

```javascript
discoverComponents(context)
  → For each provider:
    → Resolve dependencies recursively
    → Create component instance
    → Wrap in Lifecycle interface
    → Store in registry
```

Dependency resolution prevents circular deps and ensures correct order.

### Phase 4: Boot Sequence

**File:** `packages/core/src/boot/boot-manager.js`

The BootManager handles:
1. Topological sort of components by dependencies
2. Parallel initialization where possible
3. Sequential start in dependency order
4. Event emission for monitoring

Boot order for MCP mode:
```
config → logger → postgres → redis → engines → migrations → judge → mcp-server
```

### Phase 5: Runtime

After boot completes, the returned handle provides:
- `get(name)` - Get component instance
- `health()` - Check all component health
- `shutdown()` - Graceful shutdown

## Component Lifecycle States

```
┌─────────┐    ┌──────────────┐    ┌─────────┐    ┌─────────┐
│ CREATED │ →  │ INITIALIZING │ →  │ STARTED │ →  │ STOPPED │
└─────────┘    └──────────────┘    └─────────┘    └─────────┘
                     │                   │
                     ▼                   ▼
               ┌──────────┐        ┌──────────┐
               │  FAILED  │        │  FAILED  │
               └──────────┘        └──────────┘
```

Each component implements:
- `initialize()` - Setup (connections, resources)
- `start()` - Begin operation
- `stop()` - Cleanup (close connections)
- `health()` - Return health status

## Graceful Degradation

CYNIC boots with graceful degradation:

| Component | Missing Config | Behavior |
|-----------|----------------|----------|
| postgres | No DATABASE_URL | Uses in-memory fallback |
| redis | No REDIS_URL | Disabled, features limited |
| migrations | DB unavailable | Logs warning, continues |
| engines | Always available | Loads from @cynic/core |

## Shutdown Sequence

```javascript
// Signal handlers in bin/mcp.js
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Shutdown function
const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  await cynic.shutdown();  // Stops components in reverse order
  process.exit(0);
};
```

Shutdown order (reverse of boot):
```
mcp-server → judge → migrations → engines → redis → postgres → logger → config
```

## Health Checks

Health endpoint: `GET /health` (http mode only)

Checks:
- `database` - PostgreSQL connection
- `redis` - Redis connection
- `pojChain` - PoJ chain state
- `judge` - Judge availability
- `anchoring` - Solana anchoring status

Returns 200 if all healthy, 503 if any critical service unhealthy.

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_MODE` | `stdio` | Transport: `stdio` or `http` |
| `PORT` | `3000` | HTTP port (http mode) |
| `CYNIC_DATABASE_URL` | - | PostgreSQL connection string |
| `CYNIC_REDIS_URL` | - | Redis connection string |
| `CYNIC_VERBOSE` | `false` | Verbose logging |
| `CYNIC_ENABLE_ANCHORING` | `false` | Enable Solana anchoring |
| `CYNIC_SOLANA_KEY` | - | Solana wallet key (JSON array) |
| `CYNIC_SOLANA_CLUSTER` | `devnet` | Solana cluster |

## Timing Constants

Boot uses phi-derived constants:
- Migration timeout: `6180ms` (phi^-1 x 10000)
- Health check interval: `61800ms` (phi x 1000)
- Anchor batch interval: `61800ms` (phi x 1000)

---

*Last updated: 2026-01-27*
*Phase 1 Stabilization - Task #4*
