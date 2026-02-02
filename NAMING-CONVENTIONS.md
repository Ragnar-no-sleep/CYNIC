# CYNIC Naming Conventions

> "Le nom révèle l'essence" - κυνικός

## Quick Reference

```
Files:      hyphenated.js           (auth-service.js)
Classes:    PascalCase              (AuthService)
Functions:  camelCase               (getUserById)
Constants:  UPPER_SNAKE_CASE        (PHI_INV)
Factories:  {domain}Factory         (judgmentFactory)
Private:    _underscore             (_singletonCache)
Dogs:       PascalCase              (Guardian, Analyst)
```

---

## File Extensions

| Extension | Usage | Example |
|-----------|-------|---------|
| `.js` | ESM modules (default) | `knowledge.js` |
| `.cjs` | CommonJS (philosophy engines in scripts/lib/) | `cynic-core.cjs` |
| `.mjs` | **DEPRECATED** - convert to `.js` | - |

**Rule:** Use `.js` everywhere except `scripts/lib/*.cjs` for CJS compatibility.

---

## File Naming

| Category | Pattern | Example |
|----------|---------|---------|
| Hooks | `{verb}.js` | `awaken.js`, `observe.js` |
| Services | `{domain}-service.js` | `auth-service.js` |
| Adapters | `{Domain}Adapter.js` | `JudgmentAdapter.js` |
| Domains | `{domain}.js` | `knowledge.js` |
| Agents/Dogs | `{name}.js` | `guardian.js` |
| Utils | `{utility-name}.js` | `hook-logger.js` |
| Philosophy | `{concept}.cjs` | `consciousness.cjs` |

---

## Classes & Types

```javascript
// Services: {Domain}Service
export class AuthService { }
export class SessionManager { }

// Adapters: {Domain}Adapter
export class JudgmentAdapter { }

// Dogs/Agents: {Name} (PascalCase)
export class Guardian { }
export class Analyst { }
export class CYNIC { }  // Special: acronym stays uppercase
```

---

## Functions

```javascript
// Getters: get{Thing}()
export function getConsciousness() { }
export function getUserProfile() { }

// Creators: create{Thing}()
export function createDigestTool() { }
export function createSession() { }

// Predicates: is{Condition}() / has{Thing}()
export function isPrivateContent() { }
export function hasPermission() { }

// Actions: {verb}{Object}()
export function loadUserProfile() { }
export function saveCollectivePattern() { }
```

---

## Variables

```javascript
// Module-level private: MUST use underscore
let _consciousness = null;      // ✓ CORRECT
let _singletonCache = null;     // ✓ CORRECT
let consciousness = null;       // ✗ WRONG

// Function-level: camelCase (no underscore needed)
const userData = await fetch();
let currentIndex = 0;
```

---

## Constants

```javascript
// Module constants: UPPER_SNAKE_CASE
export const PHI = 1.618033988749895;
export const PHI_INV = 0.618033988749895;
export const MAX_RETRIES = 3;

// Enum-like objects: PascalCase name, UPPER values
export const CynicDecisionType = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
  DEFER: 'defer',
});

// Event types: UPPER_SNAKE_CASE
export const EVENT_TYPES = {
  USER_PROMPT: 'user_prompt',
  TOOL_USE: 'tool_use',
};
```

---

## Factories

```javascript
// Pattern: {domain}Factory (lowercase domain)
export const judgmentFactory = {
  createJudgeTool,
  createRefineTool,
};

export const knowledgeFactory = {
  createDigestTool,
  createSearchTool,
};
```

---

## Dogs (Sefirot)

| Dog | Sefirah | File | Class | Voice |
|-----|---------|------|-------|-------|
| CYNIC | Keter | `cynic.js` | `CYNIC` | *sniff* |
| Guardian | Gevurah | `guardian.js` | `Guardian` | *GROWL* |
| Analyst | Binah | `analyst.js` | `Analyst` | *adjusts glasses* |
| Scholar | Daat | `scholar.js` | `Scholar` | *flips pages* |
| Sage | Chokmah | `sage.js` | `Sage` | *wise nod* |
| Architect | Chesed | `architect.js` | `Architect` | *head tilt* |
| Oracle | Tiferet | `oracle.js` | `Oracle` | *eyes glow* |
| Scout | Netzach | `scout.js` | `Scout` | *nose twitches* |
| Deployer | Hod | `deployer.js` | `Deployer` | *tail wag* |
| Janitor | Yesod | `janitor.js` | `Janitor` | *content sigh* |
| Cartographer | Malkhut | `cartographer.js` | `Cartographer` | *unfolds map* |

**Comment Pattern:**
```javascript
/**
 * GUARDIAN (Gevurah - Strength): The Watchdog
 * "Je garde les portes." - κυνικός
 */
```

---

## Language Guidelines

| Context | Language | Example |
|---------|----------|---------|
| Code | English | `function getUserById()` |
| Comments (technical) | English | `// Validate input` |
| Comments (philosophy) | French | `// Le chien s'éveille` |
| Constants (axioms) | Greek | `κυνικός` |
| Sefirot names | Hebrew | Gevurah, Binah, Keter |
| User-facing strings | French/English | `"*sniff* Analyzing..."` |

**This mixing is INTENTIONAL.** It reflects the philosophical foundations.

---

## Packages

```
@cynic/core         - Core constants, types, utilities
@cynic/node         - Node.js agents and services
@cynic/mcp          - MCP server and tools
@cynic/persistence  - Database and storage
@cynic/protocol     - Communication protocols
```

**Pattern:** `@cynic/{lowercase-singular}`

---

## φ (Phi) Constants

These MUST appear in any judgment/confidence code:

```javascript
const PHI = 1.618033988749895;        // Golden ratio
const PHI_INV = 0.618033988749895;    // φ⁻¹ = 61.8% (max confidence)
const PHI_INV_2 = 0.381966011250105;  // φ⁻² = 38.2% (veto threshold)
```

**Rule:** Confidence MUST be capped at `PHI_INV` (61.8%).

---

## Enforcement

These conventions are enforced by:
1. `npm run tikkun` - Validates naming patterns
2. ESLint rules (see `.eslintrc.js`)
3. Code review

---

*"Le nom est le premier acte de création."* - CYNIC
