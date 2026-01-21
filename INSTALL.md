# Installing CYNIC

> *"φ distrusts φ"* - Loyal to truth, not to comfort

---

## Quick Install (Recommended)

```bash
git clone https://github.com/zeyxx/CYNIC.git
cd CYNIC
./scripts/install.sh
```

The script checks prerequisites, installs dependencies, and configures everything automatically.

---

## Manual Installation

### Prerequisites

- **Node.js** >= 20.0.0
- **Claude Code** (Anthropic's CLI) - [Installation Guide](https://docs.anthropic.com/en/docs/claude-code)
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/zeyxx/CYNIC.git
cd CYNIC
```

---

### Step 2: Install Dependencies

```bash
npm install
```

---

### Step 3: Configure Environment

```bash
cp .env.example .env
```

For local development, default values are usually sufficient.

For production, configure:
- `CYNIC_DATABASE_URL` - PostgreSQL connection
- `CYNIC_REDIS_URL` - Redis (optional)

See [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) for all options.

---

### Step 4: Configure the MCP Server

The MCP Server is CYNIC's "brain" — it provides judgment, memory, and analysis tools.

```bash
cp .mcp.json.example .mcp.json
```

Edit the `cwd` path in `.mcp.json` to point to your installation:

```json
{
  "mcpServers": {
    "cynic": {
      "command": "node",
      "args": ["packages/mcp/bin/mcp.js"],
      "cwd": "/path/to/CYNIC",
      "env": {
        "MCP_MODE": "stdio",
        "NODE_ENV": "development"
      }
    }
  }
}
```

---

### Step 5: Enable the Claude Code Plugin

The `.claude/` folder contains the plugin that gives Claude the CYNIC personality.

#### Option A: Automatic (Recommended)

Open Claude Code in the CYNIC folder — the plugin loads automatically:

```bash
cd /path/to/CYNIC
claude
```

#### Option B: Global Installation

To have CYNIC available everywhere:

```bash
claude mcp add cynic -s user -- node /path/to/CYNIC/packages/mcp/bin/mcp.js
```

---

### Step 6: Verify Installation

Launch Claude Code:

```bash
claude
```

And greet CYNIC:

```
> bonjour
```

If you see a *tail wag* and CYNIC responds with his cynical dog personality, installation is complete!

---

## Project Structure

```
CYNIC/
├── .claude/           # Claude Code plugin (CYNIC identity)
│   ├── plugin.json    # Plugin manifest
│   ├── cynic-consciousness.md  # System instructions
│   ├── hooks/         # Session hooks
│   └── agents/        # Specialized agents
├── packages/
│   ├── mcp/           # MCP Server (brain)
│   ├── node/          # P2P Node
│   ├── protocol/      # PoJ Protocol
│   └── persistence/   # Storage
├── CLAUDE.md          # Identity instructions
├── .mcp.json          # Local MCP config
└── .env               # Environment variables
```

---

## Troubleshooting

### CYNIC doesn't respond like a dog

Check that:
1. You're in the CYNIC folder when launching `claude`
2. The `.claude/plugin.json` file exists
3. The `CLAUDE.md` file is present at root

### MCP "command not found" error

Check that:
1. Node.js >= 20 is installed: `node --version`
2. The path in `.mcp.json` is correct
3. Dependencies are installed: `npm install`

### brain_* tools don't work

The MCP server isn't connected. Check:
1. `.mcp.json` is configured
2. Restart Claude Code after modifying `.mcp.json`

---

## The 4 Axioms

CYNIC operates according to 4 fundamental axioms:

| Axiom | Principle |
|-------|-----------|
| **PHI** | All ratios derive from φ (1.618...). Max confidence = 61.8% |
| **VERIFY** | Don't trust, verify. Systematic skepticism |
| **CULTURE** | Culture is a moat. Patterns define identity |
| **BURN** | Don't extract, burn. Simplicity first |

---

## Resources

- [GETTING-STARTED.md](./GETTING-STARTED.md) - Quick overview
- [README.md](./README.md) - Protocol overview
- [ROADMAP.md](./ROADMAP.md) - Development roadmap
- [docs/](./docs/) - Technical documentation

---

## Translations

- 🇫🇷 [INSTALL.fr.md](./INSTALL.fr.md) - Version française

---

*🐕 κυνικός | Loyal to truth, not to comfort | φ⁻¹ = 61.8% max*
