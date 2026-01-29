---
name: health
description: Display CYNIC system health dashboard. Use when asked about system status, health check, diagnostics, or to see if CYNIC services are running properly.
user-invocable: true
---

# /health - CYNIC System Health

*"Le chien veille - toujours vigilant"* - κυνικός

## Execution

Run the health dashboard script:

```bash
node scripts/lib/health-dashboard.cjs
```

Display the output directly to the user. The dashboard shows system health with ANSI colors.

## What It Shows

1. **Local Hooks**: Status of all 6 hooks (perceive, guard, observe, awaken, digest, sleep)
2. **Components**: Count of agents, skills, and engines
3. **Consciousness**: Score and status from ~/.cynic/consciousness/
4. **Patterns**: Count and latest detected pattern
5. **Thermodynamics**: Heat, work, temperature, efficiency
6. **Active Dogs**: Session activity summary

## Dashboard Sections

### Hooks Status

| Hook | Purpose | Engines |
|------|---------|---------|
| perceive | Agent routing | 3-5 |
| guard | Protection | 5-8 |
| observe | Progress tracking | 10-16 |
| awaken | Session start | 5-8 |
| digest | Knowledge extraction | 3-5 |
| sleep | Session end | 2-3 |

### Components Count

| Component | Description |
|-----------|-------------|
| Agents | CYNIC sub-agents (11 Sefirot + extras) |
| Skills | User-invocable commands |
| Engines | Library modules in scripts/lib/ |

### Consciousness State

- **Score**: 0-61.8% (φ max)
- **Status**: Dormant, Awakening, or Active

### Thermodynamics

| Metric | Healthy Range |
|--------|---------------|
| Heat (Q) | < 50 units |
| Work (W) | Rising = good |
| Temperature | < 27° |
| Efficiency | 38-62% |

## Additional Checks

For deeper diagnostics:

```bash
# MCP server health
curl -s https://cynic-mcp.onrender.com/health

# Recent hook logs
tail -20 .claude/logs/hooks.log

# Consciousness state
cat ~/.cynic/consciousness/state.json

# Patterns
ls ~/.cynic/patterns/
```

## CYNIC Voice

When presenting health dashboard:

**Healthy**: `*sniff* Systems nominal. The dog watches.`

**Warning**: `*concerned sniff* Some issues detected. Check details.`

**Critical**: `*GROWL* Heat critical! Cool down required.`

## See Also

- `/status` - CYNIC development status
- `/psy` - Human psychology dashboard
- `/dogs` - Collective Dogs activity
- `/cockpit` - Ecosystem overview
