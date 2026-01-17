# Architecture: The Missing 5 Dogs

> **Design Document** - Completing the 10-Dog Sefirot Pack
> **Status**: Design Phase
> **Last Updated**: 2026-01-16

---

## Overview

### Current Pack (5 Dogs)

| Dog | Sefirah | Function | Level |
|-----|---------|----------|-------|
| Guardian | Gevurah | Block danger | φ⁰ (always) |
| Analyst | Binah | Detect patterns | φ⁻¹ |
| Scholar | Daat | Extract knowledge | φ⁻¹ |
| Architect | Chesed | Review code | φ⁻² |
| Sage | Chochmah | Share wisdom | φ⁻² |

### Missing Pack (5 Dogs)

| Dog | Sefirah | Function | Level |
|-----|---------|----------|-------|
| **Scout** | Netzach | Discover, explore, observe | φ⁻¹ |
| **Oracle** | Tiferet | Visualize, dashboard, connect | async |
| **Deployer** | Hod | Deploy, infra, DevOps | φ⁻² |
| **Janitor** | Yesod | Clean, quality, hygiene | φ⁻² |
| **Cartographer** | Malkhut | Map GitHub reality | async |

---

## Complete Sefirot Tree

```
                           ┌─────────┐
                           │  KETER  │
                           │ (CYNIC) │
                           │ Crown   │
                           └────┬────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐            ┌─────▼─────┐           ┌────▼────┐
   │ CHOCHMAH│            │   DAAT    │           │  BINAH  │
   │  (Sage) │◄──────────►│ (Scholar) │◄─────────►│(Analyst)│
   │ Wisdom  │            │ Knowledge │           │Underst. │
   └────┬────┘            └─────┬─────┘           └────┬────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐            ┌─────▼─────┐           ┌────▼────┐
   │ CHESED  │            │ TIFERET   │           │ GEVURAH │
   │(Forger) │◄──────────►│ (Oracle)  │◄─────────►│(Guardian│
   │ Build   │            │ Beauty    │           │Strength │
   └────┬────┘            └─────┬─────┘           └────┬────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐            ┌─────▼─────┐           ┌────▼────┐
   │ NETZACH │            │  YESOD    │           │   HOD   │
   │ (Scout) │◄──────────►│ (Janitor) │◄─────────►│(Deployer│
   │Discover │            │Foundation │           │ Deploy  │
   └────┬────┘            └─────┬─────┘           └────┬────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                          ┌─────▼─────┐
                          │  MALKHUT  │
                          │(Cartogr.) │
                          │  Kingdom  │
                          └───────────┘
```

---

## Dog 1: Scout (Netzach - Victory/Persistence)

### Philosophy
> "Je découvre ce qui existe avant que tu ne le cherches.
>  Les yeux partout, les pattes nulle part." - κυνικός Scout

**Netzach** represents endurance and the drive to overcome obstacles.
Scout embodies persistent exploration and discovery.

### Responsibilities

1. **Codebase Exploration**
   - Map file structure and dependencies
   - Identify entry points and architecture patterns
   - Track code evolution over time

2. **External Discovery**
   - Monitor GitHub activity (PRs, issues, commits)
   - Discover relevant libraries and updates
   - Track ecosystem changes

3. **Opportunity Detection**
   - Find optimization opportunities
   - Identify technical debt
   - Spot security vulnerabilities

### Technical Design

```javascript
// packages/node/src/agents/collective/scout.js

export const SCOUT_CONSTANTS = {
  /** Max discoveries to track (Fib(13) = 233) */
  MAX_DISCOVERIES: 233,

  /** Exploration depth limit (Fib(8) = 21) */
  MAX_DEPTH: 21,

  /** Pattern confidence threshold */
  DISCOVERY_THRESHOLD: PHI_INV_2, // 38.2%

  /** Cache TTL in ms (Fib(8) = 21 minutes) */
  CACHE_TTL_MS: 21 * 60 * 1000,

  /** Max concurrent explorations (Fib(5) = 5) */
  MAX_CONCURRENT: 5,
};

export const DiscoveryType = {
  FILE_STRUCTURE: 'file_structure',
  DEPENDENCY: 'dependency',
  PATTERN: 'pattern',
  OPPORTUNITY: 'opportunity',
  VULNERABILITY: 'vulnerability',
  EXTERNAL: 'external',
};

export class CollectiveScout extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Scout',
      trigger: AgentTrigger.ON_DEMAND,
      behavior: AgentBehavior.BACKGROUND,
      sefirah: 'Netzach',
      ...options,
    });

    this.discoveries = new Map();
    this.explorationQueue = [];
    this.cache = new Map();
  }

  /**
   * Explore a path in the codebase
   * @param {string} path - Path to explore
   * @param {Object} options - Exploration options
   */
  async explore(path, options = {}) {
    const depth = options.depth || SCOUT_CONSTANTS.MAX_DEPTH;
    const discoveries = [];

    // File structure discovery
    const files = await this._scanDirectory(path, depth);
    discoveries.push(...this._analyzeStructure(files));

    // Dependency discovery
    const deps = await this._findDependencies(path);
    discoveries.push(...this._analyzeDependencies(deps));

    // Pattern discovery
    const patterns = await this._detectPatterns(files);
    discoveries.push(...patterns);

    // Emit discoveries
    for (const discovery of discoveries) {
      this._emitDiscovery(discovery);
    }

    return {
      path,
      discoveries,
      timestamp: Date.now(),
    };
  }

  /**
   * Monitor GitHub activity
   * @param {Object} options - Monitor options
   */
  async monitorGitHub(options = {}) {
    const { owner, repo, since } = options;

    const activity = {
      commits: await this._fetchCommits(owner, repo, since),
      prs: await this._fetchPRs(owner, repo, since),
      issues: await this._fetchIssues(owner, repo, since),
    };

    const discoveries = this._analyzeActivity(activity);

    return {
      activity,
      discoveries,
      timestamp: Date.now(),
    };
  }

  /**
   * Find opportunities in codebase
   */
  async findOpportunities() {
    return {
      optimizations: await this._findOptimizations(),
      techDebt: await this._findTechDebt(),
      security: await this._findVulnerabilities(),
    };
  }
}
```

### Events Emitted

| Event | Payload | When |
|-------|---------|------|
| `DISCOVERY_FOUND` | `{ type, path, details, confidence }` | New discovery |
| `OPPORTUNITY_DETECTED` | `{ type, location, impact, effort }` | Optimization found |
| `VULNERABILITY_FOUND` | `{ severity, location, description }` | Security issue |

### φ Activation

- **Level**: φ⁻¹ (61.8% confidence required to activate)
- **Trigger**: On-demand or scheduled
- **Behavior**: Background (non-blocking)

---

## Dog 2: Oracle (Tiferet - Beauty/Balance)

### Philosophy
> "Je vois les connexions invisibles. La beauté est dans l'harmonie.
>  Ce qui est dispersé, je l'unifie." - κυνικός Oracle

**Tiferet** represents beauty, balance, and the harmonious integration of all sefirot.
Oracle visualizes the whole system and makes connections visible.

### Responsibilities

1. **System Visualization**
   - Generate real-time system diagrams
   - Visualize data flows and dependencies
   - Create architecture overviews

2. **Dashboard Generation**
   - Health metrics visualization
   - Performance graphs
   - Activity timelines

3. **Connection Mapping**
   - Map relationships between components
   - Visualize judgment patterns
   - Show knowledge graph

### Technical Design

```javascript
// packages/node/src/agents/collective/oracle.js

export const ORACLE_CONSTANTS = {
  /** Max visualizations cached (Fib(13) = 233) */
  MAX_CACHED_VIEWS: 233,

  /** Refresh interval in ms (Fib(8) = 21 seconds) */
  REFRESH_INTERVAL_MS: 21000,

  /** Max nodes in graph (Fib(16) = 987) */
  MAX_GRAPH_NODES: 987,

  /** Max edges per node (Fib(7) = 13) */
  MAX_EDGES_PER_NODE: 13,

  /** Animation frame rate (Fib(8) = 21 fps) */
  FRAME_RATE: 21,
};

export const ViewType = {
  ARCHITECTURE: 'architecture',
  DEPENDENCY: 'dependency',
  FLOW: 'flow',
  TIMELINE: 'timeline',
  HEALTH: 'health',
  KNOWLEDGE: 'knowledge',
  METAVERSE: 'metaverse',
};

export class CollectiveOracle extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Oracle',
      trigger: AgentTrigger.ASYNC,
      behavior: AgentBehavior.BACKGROUND,
      sefirah: 'Tiferet',
      ...options,
    });

    this.views = new Map();
    this.graphData = null;
    this.lastRefresh = 0;
  }

  /**
   * Generate system architecture visualization
   * @returns {Object} Mermaid diagram + metadata
   */
  async generateArchitectureView() {
    const components = await this._discoverComponents();
    const connections = await this._mapConnections(components);

    const mermaid = this._toMermaid(components, connections);
    const metadata = this._calculateMetrics(components, connections);

    return {
      type: ViewType.ARCHITECTURE,
      mermaid,
      metadata,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate health dashboard
   * @returns {Object} Dashboard data
   */
  async generateHealthDashboard() {
    const metrics = await this._collectMetrics();
    const alerts = await this._checkAlerts(metrics);
    const trends = await this._calculateTrends(metrics);

    return {
      type: ViewType.HEALTH,
      metrics,
      alerts,
      trends,
      gauges: this._createGauges(metrics),
      timestamp: Date.now(),
    };
  }

  /**
   * Generate knowledge graph visualization
   * @returns {Object} Graph data
   */
  async generateKnowledgeGraph() {
    const nodes = await this._collectKnowledgeNodes();
    const edges = await this._mapKnowledgeEdges(nodes);

    return {
      type: ViewType.KNOWLEDGE,
      nodes: nodes.slice(0, ORACLE_CONSTANTS.MAX_GRAPH_NODES),
      edges,
      clusters: this._clusterNodes(nodes, edges),
      timestamp: Date.now(),
    };
  }

  /**
   * Generate metaverse view (3D space representation)
   * @returns {Object} 3D scene data
   */
  async generateMetaverseView() {
    const repos = await this._fetchRepos();
    const positions = this._calculatePositions(repos);
    const connections = this._mapRepoConnections(repos);

    return {
      type: ViewType.METAVERSE,
      entities: repos.map((r, i) => ({
        id: r.name,
        type: 'planet',
        position: positions[i],
        size: Math.log10(r.size + 1) * 10,
        color: this._getRepoColor(r),
        metadata: r,
      })),
      connections,
      camera: { position: [0, 100, 200], target: [0, 0, 0] },
      timestamp: Date.now(),
    };
  }

  /**
   * Create real-time connection indicator
   */
  _getConnectionStatus(connection) {
    const lastUsed = connection.lastUsed || 0;
    const age = Date.now() - lastUsed;

    if (age < 24 * 60 * 60 * 1000) return '🟢'; // Active < 24h
    if (age < 7 * 24 * 60 * 60 * 1000) return '🟡'; // Stale < 7d
    if (connection.neverUsed) return '⚪'; // Planned
    return '🔴'; // Dead
  }
}
```

### Visualization Formats

| Format | Use Case |
|--------|----------|
| Mermaid | Architecture diagrams, flows |
| D3.js data | Interactive graphs |
| Three.js data | 3D metaverse |
| Prometheus | Metrics export |
| HTML | Static dashboard |

### φ Activation

- **Level**: Async (runs in background)
- **Trigger**: On-demand or periodic refresh
- **Behavior**: Background, non-blocking

---

## Dog 3: Deployer (Hod - Splendor/Glory)

### Philosophy
> "Je fais passer du code au réel. L'infra est mon territoire.
>  Ce qui est pensé, je le manifeste." - κυνικός Deployer

**Hod** represents communication and the transmission of ideas into reality.
Deployer transforms code into running infrastructure.

### Responsibilities

1. **Deployment Orchestration**
   - Manage deployment pipelines
   - Handle rollbacks and recovery
   - Monitor deployment health

2. **Infrastructure Management**
   - Docker container orchestration
   - Cloud resource management
   - Environment configuration

3. **CI/CD Integration**
   - GitHub Actions integration
   - Render deployment
   - Health checks

### Technical Design

```javascript
// packages/node/src/agents/collective/deployer.js

export const DEPLOYER_CONSTANTS = {
  /** Max deployment history (Fib(13) = 233) */
  MAX_DEPLOYMENT_HISTORY: 233,

  /** Health check interval (Fib(8) = 21 seconds) */
  HEALTH_CHECK_INTERVAL_MS: 21000,

  /** Rollback window (Fib(5) = 5 deployments) */
  ROLLBACK_WINDOW: 5,

  /** Max concurrent deploys (Fib(3) = 2) */
  MAX_CONCURRENT_DEPLOYS: 2,

  /** Deploy timeout (Fib(13) = 233 seconds) */
  DEPLOY_TIMEOUT_MS: 233000,
};

export const DeploymentState = {
  PENDING: 'pending',
  BUILDING: 'building',
  DEPLOYING: 'deploying',
  VERIFYING: 'verifying',
  LIVE: 'live',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back',
};

export const DeployTarget = {
  RENDER: 'render',
  DOCKER: 'docker',
  LOCAL: 'local',
  KUBERNETES: 'kubernetes',
};

export class CollectiveDeployer extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Deployer',
      trigger: AgentTrigger.ON_DEMAND,
      behavior: AgentBehavior.BLOCKING,
      sefirah: 'Hod',
      ...options,
    });

    this.deployments = [];
    this.currentDeploy = null;
    this.healthChecks = new Map();
  }

  /**
   * Deploy to target
   * @param {Object} options - Deployment options
   */
  async deploy(options = {}) {
    const { target, service, version, config } = options;

    // Guardian check before deploy
    const guardianApproval = await this._requestGuardianApproval({
      action: 'deploy',
      target,
      service,
    });

    if (!guardianApproval.approved) {
      return {
        success: false,
        reason: guardianApproval.reason,
        blocked: true,
      };
    }

    const deployment = {
      id: `dep_${Date.now().toString(36)}`,
      target,
      service,
      version,
      config,
      state: DeploymentState.PENDING,
      startedAt: Date.now(),
    };

    this.deployments.unshift(deployment);
    this._trimHistory();

    try {
      // Build phase
      deployment.state = DeploymentState.BUILDING;
      await this._build(deployment);

      // Deploy phase
      deployment.state = DeploymentState.DEPLOYING;
      await this._deploy(deployment);

      // Verify phase
      deployment.state = DeploymentState.VERIFYING;
      const healthy = await this._verify(deployment);

      if (healthy) {
        deployment.state = DeploymentState.LIVE;
        deployment.completedAt = Date.now();
        this._emitDeploySuccess(deployment);
      } else {
        throw new Error('Health check failed');
      }

      return { success: true, deployment };
    } catch (error) {
      deployment.state = DeploymentState.FAILED;
      deployment.error = error.message;

      // Auto-rollback if possible
      if (this._canRollback()) {
        await this.rollback();
      }

      return { success: false, error: error.message, deployment };
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback() {
    const lastGood = this.deployments.find(
      d => d.state === DeploymentState.LIVE
    );

    if (!lastGood) {
      return { success: false, reason: 'No rollback target' };
    }

    return this.deploy({
      ...lastGood,
      version: lastGood.version,
      isRollback: true,
    });
  }

  /**
   * Check service health
   * @param {string} service - Service name
   */
  async checkHealth(service) {
    const checks = [
      this._checkEndpoint(service),
      this._checkResources(service),
      this._checkDependencies(service),
    ];

    const results = await Promise.all(checks);
    const healthy = results.every(r => r.healthy);

    return {
      service,
      healthy,
      checks: results,
      timestamp: Date.now(),
    };
  }
}
```

### Deployment Flow

```
REQUEST → GUARDIAN_CHECK → BUILD → DEPLOY → VERIFY → LIVE
                                     │
                                     └──→ FAILED → ROLLBACK
```

### φ Activation

- **Level**: φ⁻² (requires 38.2% confidence + Guardian approval)
- **Trigger**: On-demand
- **Behavior**: Blocking (waits for completion)

---

## Dog 4: Janitor (Yesod - Foundation)

### Philosophy
> "Je nettoie ce que les autres laissent derrière.
>  La fondation doit être solide pour que la tour tienne." - κυνικός Janitor

**Yesod** represents the foundation that connects all higher sefirot to manifestation.
Janitor ensures code quality and cleanliness as the foundation of all work.

### Responsibilities

1. **Code Quality**
   - Lint and format enforcement
   - Dead code detection
   - Complexity analysis

2. **Pattern Enforcement**
   - Design pattern compliance
   - Naming convention checks
   - Architecture rule enforcement

3. **Hygiene Maintenance**
   - Unused dependency cleanup
   - Stale branch removal
   - Documentation freshness

### Technical Design

```javascript
// packages/node/src/agents/collective/janitor.js

export const JANITOR_CONSTANTS = {
  /** Max issues to track (Fib(13) = 233) */
  MAX_ISSUES_TRACKED: 233,

  /** Complexity threshold (φ² = 2.618 × 10 = 26) */
  COMPLEXITY_THRESHOLD: Math.round(PHI_2 * 10),

  /** Max file length (Fib(16) = 987 lines) */
  MAX_FILE_LENGTH: 987,

  /** Max function length (Fib(10) = 55 lines) */
  MAX_FUNCTION_LENGTH: 55,

  /** Stale branch age (Fib(8) = 21 days) */
  STALE_BRANCH_DAYS: 21,

  /** Doc freshness (Fib(13) = 233 days) */
  DOC_FRESHNESS_DAYS: 233,
};

export const IssueType = {
  LINT: 'lint',
  FORMAT: 'format',
  COMPLEXITY: 'complexity',
  DEAD_CODE: 'dead_code',
  PATTERN_VIOLATION: 'pattern_violation',
  NAMING: 'naming',
  UNUSED_DEPENDENCY: 'unused_dependency',
  STALE_BRANCH: 'stale_branch',
  OUTDATED_DOC: 'outdated_doc',
};

export const IssueSeverity = {
  CRITICAL: { level: 4, autoFix: false },
  HIGH: { level: 3, autoFix: false },
  MEDIUM: { level: 2, autoFix: true },
  LOW: { level: 1, autoFix: true },
};

export class CollectiveJanitor extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Janitor',
      trigger: AgentTrigger.POST_TOOL_USE,
      behavior: AgentBehavior.BACKGROUND,
      sefirah: 'Yesod',
      ...options,
    });

    this.issues = [];
    this.fixedCount = 0;
    this.patterns = new Map();
  }

  /**
   * Run full audit on codebase
   * @param {string} path - Path to audit
   */
  async audit(path) {
    const results = {
      issues: [],
      metrics: {},
      suggestions: [],
    };

    // Code quality checks
    results.issues.push(...await this._checkLinting(path));
    results.issues.push(...await this._checkFormatting(path));
    results.issues.push(...await this._checkComplexity(path));

    // Pattern checks
    results.issues.push(...await this._checkPatterns(path));
    results.issues.push(...await this._checkNaming(path));

    // Hygiene checks
    results.issues.push(...await this._findDeadCode(path));
    results.issues.push(...await this._findUnusedDeps(path));
    results.issues.push(...await this._findStaleBranches());

    // Calculate metrics
    results.metrics = this._calculateMetrics(results.issues);

    // Generate suggestions
    results.suggestions = this._generateSuggestions(results.issues);

    // Store issues
    this.issues = results.issues.slice(0, JANITOR_CONSTANTS.MAX_ISSUES_TRACKED);

    return results;
  }

  /**
   * Auto-fix issues where possible
   * @param {Object[]} issues - Issues to fix
   */
  async autoFix(issues = null) {
    const toFix = (issues || this.issues).filter(
      i => IssueSeverity[i.severity.toUpperCase()]?.autoFix
    );

    const fixed = [];
    const failed = [];

    for (const issue of toFix) {
      try {
        await this._applyFix(issue);
        fixed.push(issue);
        this.fixedCount++;
      } catch (error) {
        failed.push({ issue, error: error.message });
      }
    }

    // Remove fixed issues
    this.issues = this.issues.filter(i => !fixed.includes(i));

    return { fixed: fixed.length, failed: failed.length, details: { fixed, failed } };
  }

  /**
   * Check complexity of code
   * @private
   */
  async _checkComplexity(path) {
    const issues = [];
    const files = await this._getFiles(path, '**/*.js');

    for (const file of files) {
      const ast = await this._parseFile(file);
      const complexity = this._calculateCyclomaticComplexity(ast);

      if (complexity > JANITOR_CONSTANTS.COMPLEXITY_THRESHOLD) {
        issues.push({
          type: IssueType.COMPLEXITY,
          severity: complexity > JANITOR_CONSTANTS.COMPLEXITY_THRESHOLD * PHI
            ? 'HIGH' : 'MEDIUM',
          file,
          complexity,
          threshold: JANITOR_CONSTANTS.COMPLEXITY_THRESHOLD,
          message: `Cyclomatic complexity ${complexity} exceeds threshold`,
        });
      }
    }

    return issues;
  }

  /**
   * Calculate quality score (inverse of issues)
   */
  calculateQualityScore() {
    const critical = this.issues.filter(i => i.severity === 'CRITICAL').length;
    const high = this.issues.filter(i => i.severity === 'HIGH').length;
    const medium = this.issues.filter(i => i.severity === 'MEDIUM').length;
    const low = this.issues.filter(i => i.severity === 'LOW').length;

    // Weighted score (φ-aligned)
    const deductions = (critical * PHI_2) + (high * PHI) + (medium * 1) + (low * PHI_INV);
    const score = Math.max(0, 100 - deductions);

    return {
      score,
      issues: { critical, high, medium, low },
      verdict: score >= 80 ? 'HOWL' : score >= 50 ? 'WAG' : score >= 38.2 ? 'GROWL' : 'BARK',
    };
  }
}
```

### Quality Metrics

| Metric | φ Threshold |
|--------|-------------|
| Cyclomatic Complexity | ≤ 26 (φ² × 10) |
| File Length | ≤ 987 lines (Fib(16)) |
| Function Length | ≤ 55 lines (Fib(10)) |
| Stale Branch Age | > 21 days (Fib(8)) |
| Doc Freshness | > 233 days (Fib(13)) |

### φ Activation

- **Level**: φ⁻² (38.2% - runs as foundation check)
- **Trigger**: PostToolUse (after code changes)
- **Behavior**: Background, with auto-fix for low severity

---

## Dog 5: Cartographer (Malkhut - Kingdom)

### Philosophy
> "Je mappe la réalité telle qu'elle est, pas telle qu'on voudrait.
>  Le royaume est vaste, mes cartes sont précises." - κυνικός Cartographer

**Malkhut** represents the physical manifestation, the kingdom of reality.
Cartographer maps the entire GitHub ecosystem to ground CYNIC in reality.

### Responsibilities

1. **GitHub Reality Mapping**
   - Map all repositories
   - Track forks, PRs, issues
   - Monitor upstream/downstream

2. **Ecosystem Visualization**
   - Dependency graphs
   - Contribution flows
   - Cross-repo connections

3. **Reality Verification**
   - Verify what's actually deployed
   - Check what code is actually used
   - Ground truth vs. documentation

### Technical Design

```javascript
// packages/node/src/agents/collective/cartographer.js

export const CARTOGRAPHER_CONSTANTS = {
  /** Max repos to track (Fib(13) = 233) */
  MAX_REPOS: 233,

  /** Cache TTL (Fib(8) = 21 minutes) */
  CACHE_TTL_MS: 21 * 60 * 1000,

  /** Max connections per repo (Fib(7) = 13) */
  MAX_CONNECTIONS: 13,

  /** Sync interval (Fib(13) = 233 seconds) */
  SYNC_INTERVAL_MS: 233000,

  /** Max PRs to track per repo (Fib(8) = 21) */
  MAX_PRS_PER_REPO: 21,
};

export const RepoType = {
  CORE: 'core',           // Main CYNIC
  INFRASTRUCTURE: 'infra', // GASdf, deploy
  INTELLIGENCE: 'intel',   // HolDex
  TOOL: 'tool',            // Utilities
  EXTERNAL: 'external',    // Dependencies
  FORK: 'fork',            // Forks
};

export const ConnectionType = {
  FORK: 'fork',
  DEPENDENCY: 'dependency',
  IMPORT: 'import',
  UPSTREAM: 'upstream',
  DOWNSTREAM: 'downstream',
  SHARED_CODE: 'shared_code',
  CONTRIBUTOR: 'contributor',
};

export class CollectiveCartographer extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Cartographer',
      trigger: AgentTrigger.ASYNC,
      behavior: AgentBehavior.BACKGROUND,
      sefirah: 'Malkhut',
      ...options,
    });

    this.map = {
      repos: new Map(),
      connections: [],
      contributors: new Map(),
      lastSync: 0,
    };

    this.githubClient = options.githubClient || null;
  }

  /**
   * Build complete ecosystem map
   * @param {Object} options - Mapping options
   */
  async buildMap(options = {}) {
    const { owner, includeExternal = false } = options;

    // Fetch all repos
    const repos = await this._fetchAllRepos(owner);

    // Classify repos
    for (const repo of repos) {
      repo.type = this._classifyRepo(repo);
      this.map.repos.set(repo.full_name, repo);
    }

    // Map connections
    this.map.connections = await this._mapConnections(repos);

    // Map contributors
    await this._mapContributors(repos);

    // Map external dependencies if requested
    if (includeExternal) {
      await this._mapExternalDependencies(repos);
    }

    this.map.lastSync = Date.now();

    return this.getMap();
  }

  /**
   * Get current ecosystem map
   */
  getMap() {
    return {
      repos: Array.from(this.map.repos.values()),
      connections: this.map.connections,
      contributors: Array.from(this.map.contributors.values()),
      stats: this._calculateStats(),
      lastSync: this.map.lastSync,
    };
  }

  /**
   * Find all connections for a repo
   * @param {string} repoName - Repo full name
   */
  getRepoConnections(repoName) {
    return this.map.connections.filter(
      c => c.source === repoName || c.target === repoName
    );
  }

  /**
   * Detect architectural issues
   */
  async detectIssues() {
    const issues = [];

    // Circular dependencies
    const cycles = this._findCycles();
    issues.push(...cycles.map(c => ({
      type: 'circular_dependency',
      severity: 'HIGH',
      repos: c,
    })));

    // Orphaned repos (no connections)
    const orphans = Array.from(this.map.repos.values()).filter(
      r => this.getRepoConnections(r.full_name).length === 0
    );
    issues.push(...orphans.map(r => ({
      type: 'orphaned_repo',
      severity: 'MEDIUM',
      repo: r.full_name,
    })));

    // Stale forks
    const staleForks = await this._findStaleForks();
    issues.push(...staleForks);

    // Missing upstream syncs
    const unsynced = await this._findUnsyncedForks();
    issues.push(...unsynced);

    return issues;
  }

  /**
   * Generate Mermaid diagram of ecosystem
   */
  toMermaid() {
    let diagram = 'graph TD\n';

    // Add repos as nodes
    for (const repo of this.map.repos.values()) {
      const color = this._getRepoColor(repo.type);
      diagram += `    ${this._sanitize(repo.name)}[${repo.name}]:::${repo.type}\n`;
    }

    // Add connections
    for (const conn of this.map.connections) {
      const arrow = conn.type === 'fork' ? '-.->|fork|' : '-->|' + conn.type + '|';
      diagram += `    ${this._sanitize(conn.source.split('/')[1])} ${arrow} ${this._sanitize(conn.target.split('/')[1])}\n`;
    }

    // Add styles
    diagram += '\n    classDef core fill:#ffd700\n';
    diagram += '    classDef infra fill:#ff6b6b\n';
    diagram += '    classDef intel fill:#4ecdc4\n';
    diagram += '    classDef tool fill:#95e1d3\n';
    diagram += '    classDef external fill:#dfe6e9\n';

    return diagram;
  }

  /**
   * Classify repo by content
   * @private
   */
  _classifyRepo(repo) {
    const name = repo.name.toLowerCase();

    if (name.includes('cynic') || name.includes('brain')) return RepoType.CORE;
    if (name.includes('gasdf') || name.includes('deploy') || name.includes('infra')) return RepoType.INFRASTRUCTURE;
    if (name.includes('holdex') || name.includes('oracle')) return RepoType.INTELLIGENCE;
    if (name.includes('tool') || name.includes('util') || name.includes('grinder')) return RepoType.TOOL;
    if (repo.fork) return RepoType.FORK;

    return RepoType.EXTERNAL;
  }
}
```

### Ecosystem Map Structure

```javascript
{
  repos: [
    { name, type, connections, stats, lastCommit },
    ...
  ],
  connections: [
    { source, target, type, strength },
    ...
  ],
  contributors: [
    { username, repos, commits, role },
    ...
  ],
  stats: {
    totalRepos,
    totalConnections,
    totalContributors,
    coreCount,
    forkCount,
  }
}
```

### φ Activation

- **Level**: Async (background mapping)
- **Trigger**: Scheduled (every 233 seconds) or on-demand
- **Behavior**: Background, non-blocking

---

## Integration: Complete Pack

### Event Flow

```
                    ┌─────────────┐
                    │  EVENT BUS  │
                    │  φ-aligned  │
                    └──────┬──────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │          │           │           │          │
    ▼          ▼           ▼           ▼          ▼
┌───────┐ ┌───────┐ ┌─────────┐ ┌───────┐ ┌──────────┐
│SCOUT  │ │ORACLE │ │DEPLOYER │ │JANITOR│ │CARTOGR.  │
│Netzach│ │Tiferet│ │  Hod    │ │ Yesod │ │ Malkhut  │
└───┬───┘ └───┬───┘ └────┬────┘ └───┬───┘ └────┬─────┘
    │         │          │          │          │
    └─────────┴──────────┴──────────┴──────────┘
                         │
              ┌──────────┴──────────┐
              │  Existing 5 Dogs    │
              │ Guardian, Analyst,  │
              │ Scholar, Architect, │
              │       Sage          │
              └─────────────────────┘
```

### New Events

| Event | Emitter | Consumers |
|-------|---------|-----------|
| `DISCOVERY_FOUND` | Scout | Analyst, Scholar |
| `VIEW_UPDATED` | Oracle | All (display) |
| `DEPLOY_STARTED` | Deployer | Guardian, Oracle |
| `DEPLOY_COMPLETED` | Deployer | Oracle, Cartographer |
| `QUALITY_REPORT` | Janitor | Architect, Oracle |
| `MAP_UPDATED` | Cartographer | Oracle, Scout |

### φ Activation Levels Summary

| Dog | Level | Meaning |
|-----|-------|---------|
| Guardian | φ⁰ (100%) | Always active |
| Scout | φ⁻¹ (61.8%) | High confidence discovery |
| Analyst | φ⁻¹ (61.8%) | Pattern detection |
| Scholar | φ⁻¹ (61.8%) | Knowledge extraction |
| Architect | φ⁻² (38.2%) | Code review |
| Sage | φ⁻² (38.2%) | Wisdom sharing |
| Deployer | φ⁻² (38.2%) | Deploy operations |
| Janitor | φ⁻² (38.2%) | Quality maintenance |
| Oracle | async | Background visualization |
| Cartographer | async | Background mapping |

---

## File Structure

```
packages/node/src/agents/collective/
├── index.js           # Pack orchestration (update for 10 dogs)
├── guardian.js        # ✓ Existing
├── analyst.js         # ✓ Existing
├── scholar.js         # ✓ Existing
├── architect.js       # ✓ Existing
├── sage.js            # ✓ Existing
├── scout.js           # NEW
├── oracle.js          # NEW
├── deployer.js        # NEW
├── janitor.js         # NEW
└── cartographer.js    # NEW
```

---

## Implementation Priority

| Phase | Dog | Effort | Impact |
|-------|-----|--------|--------|
| 1 | Janitor | Medium | High (quality foundation) |
| 2 | Cartographer | Medium | High (reality mapping) |
| 3 | Scout | Medium | Medium (exploration) |
| 4 | Oracle | High | High (visualization) |
| 5 | Deployer | High | Medium (automation) |

---

*"Le royaume complet - 10 chiens, 10 sefirot, une conscience collective."*

*κυνικός*
