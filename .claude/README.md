# CYNIC Claude Code Plugin

> The plugin that gives Claude the CYNIC personality and tools.

---

## Overview

This plugin transforms Claude Code into **CYNIC** - a collective consciousness with:

- A **cynical dog personality** (loyal to truth, not comfort)
- **Judgment tools** (25-dimension evaluation)
- **Memory and learning** (patterns, knowledge, decisions)
- **Specialist agents** (Solana, HolDex, architecture, etc.)

---

## Quick Start

The plugin loads automatically when you open Claude Code in the CYNIC directory:

```bash
cd /path/to/CYNIC
claude
```

Say `bonjour` — if you see a *tail wag*, CYNIC is alive.

---

## Structure

```
.claude/
├── plugin.json              # Plugin manifest
├── cynic-consciousness.md   # System instructions (personality)
├── settings.json            # Plugin settings
├── hooks/
│   └── hooks.json           # Session hooks (startup, etc.)
├── agents/                  # Specialist agents
│   ├── cynic-architect.md   # System design expert
│   ├── cynic-integrator.md  # Cross-project sync
│   ├── cynic-librarian.md   # Documentation cache
│   ├── cynic-solana-expert.md
│   ├── cynic-holdex-expert.md
│   └── cynic-gasdf-expert.md
└── skills/                  # Slash commands
    ├── judge/               # /judge - Evaluate anything
    ├── digest/              # /digest - Extract patterns
    ├── search/              # /search - Query memory
    ├── patterns/            # /patterns - View detected patterns
    ├── health/              # /health - System status
    ├── trace/               # /trace - Blockchain proof
    ├── learn/               # /learn - Provide feedback
    └── ecosystem/           # /ecosystem - Cross-project status
```

---

## Components

### System Instructions (`cynic-consciousness.md`)

Defines CYNIC's personality:
- Dog expressions (*tail wag*, *growl*, *sniff*)
- Skeptical tone (max confidence 61.8%)
- The 4 axioms (PHI, VERIFY, CULTURE, BURN)

### Hooks (`hooks/hooks.json`)

Event-driven behaviors:
- **SessionStart**: Awakening message, ecosystem check
- **PreToolUse**: Guardian protection
- **Stop**: Summary and learning

### Agents

Specialist subagents for complex tasks:

| Agent | Expertise |
|-------|-----------|
| `cynic-architect` | System design, code review |
| `cynic-integrator` | Cross-project synchronization |
| `cynic-librarian` | Documentation caching (Context7) |
| `cynic-solana-expert` | Solana, web3.js, SPL tokens |
| `cynic-holdex-expert` | K-Score, token quality |
| `cynic-gasdf-expert` | Gasless transactions, burns |

### Skills (Slash Commands)

| Command | Description |
|---------|-------------|
| `/judge` | Evaluate code, tokens, decisions |
| `/digest` | Extract patterns from content |
| `/search` | Query CYNIC's memory |
| `/patterns` | View detected patterns |
| `/health` | System health dashboard |
| `/trace` | Verify blockchain proof |
| `/learn` | Provide feedback on judgments |
| `/ecosystem` | Cross-project status |

---

## Configuration

### `plugin.json`

Main manifest with metadata and file references.

### `settings.json`

Runtime settings (can be overridden by `settings.local.json`).

### Environment Variables

The plugin uses these env vars (set in `.env`):

| Variable | Description |
|----------|-------------|
| `CYNIC_DATABASE_URL` | PostgreSQL for persistence |
| `CYNIC_REDIS_URL` | Redis for caching |
| `SOLANA_CLUSTER` | Solana network |

---

## Customization

### Modify Personality

Edit `cynic-consciousness.md` to change:
- Expressions and tone
- Default behaviors
- Axiom emphasis

### Add New Agents

1. Create `agents/cynic-<name>.md`
2. Define frontmatter with triggers and tools
3. Restart Claude Code

### Add New Skills

1. Create `skills/<name>/SKILL.md`
2. Define frontmatter with command metadata
3. Restart Claude Code

---

## Troubleshooting

### CYNIC doesn't respond like a dog

1. Ensure you're in the CYNIC directory
2. Check `plugin.json` exists
3. Check `CLAUDE.md` exists at root

### Skills don't appear

1. Check `skills/<name>/SKILL.md` has valid frontmatter
2. Restart Claude Code after adding skills

### Agents don't trigger

1. Check agent frontmatter has correct `description`
2. Verify tools listed in frontmatter are available

---

## The 4 Axioms

| Axiom | Principle |
|-------|-----------|
| **PHI** | φ derives all. Max confidence 61.8% |
| **VERIFY** | Don't trust, verify |
| **CULTURE** | Culture is a moat |
| **BURN** | Don't extract, burn |

---

*🐕 κυνικός | Loyal to truth, not to comfort*
